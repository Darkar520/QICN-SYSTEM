// claim_scope: internal_runtime_engineering
// evidence_scope: internal_support_only
// interpretation_boundary: Dedicated Web Worker for Level 3 autonomous supervisor anti-throttling execution when browser tab is minimized. Uses a serialized recursive setTimeout loop with an inFlight guard and propagates governorState, activeGate2Watch, and nodeCount so the live 1500-node network is never overwritten by a lightweight sandbox worker.

/* global __QICN_WORKBENCH_BUILD__ */
import { QICNConfig } from '../../services/config.js';
import { createHeadlessRuntimeSession } from '../runtime/HeadlessRuntimeSession.js';
import { captureDynamicState, applyDynamicState } from '../persistence/dynamicState.js';
import { NODAL_TOWER_COUPLING_MODES } from '../simulation/NodalTowerCouplingBridge.js';
import {
  LEVEL3_DEFAULT_POLICY,
  Level3SupervisorController,
  getQuotaSnapshot,
  readLevel3LiveTelemetry,
  synchronizeLevel3WorkerStateIntoTarget
} from '../simulation/Level3AutonomousSupervisor.js';
import {
  createEmptyKnowledgeBelt,
  createEmptyLevel3AuditLedger
} from '../simulation/Level3KnowledgeBelt.js';

export { synchronizeLevel3WorkerStateIntoTarget };

export const LEVEL3_WORKER_BUILD =
  typeof __QICN_WORKBENCH_BUILD__ === 'undefined'
    ? Object.freeze({ version: '2.1.0-REINFORCED', signature: 'QICN-SIG-LOCAL' })
    : Object.freeze(__QICN_WORKBENCH_BUILD__);

const workerRuntime = {
  session: null,
  controller: null,
  timerId: null,
  runningLoop: false,
  inFlight: false,
  activeStepPromise: null,
  intervalMs: 500,
  nodeCount: 48
};

function serializeGate2Watch(watch) {
  if (!watch) return null;
  return {
    cycleId: watch.cycleId,
    observedTicks: watch.observedTicks,
    watchWindowTicks: watch.watchWindowTicks,
    prePromotionDigest: watch.prePromotionDigest,
    promotedAtTick: watch.promotedAtTick
  };
}

function ensureWorkerSession({
  config = null,
  seed = 17,
  nodes = 48,
  dynamicState = null,
  policy = null,
  knowledgeBelt = null,
  auditLedger = null,
  governorState = null
} = {}) {
  const sessionRecreated = !workerRuntime.session || Boolean(config || dynamicState);
  if (sessionRecreated) {
    const requestedNodes = Math.max(16, Number(nodes) || 48);
    const effectiveConfig = {
      ...QICNConfig,
      KAIZEN_ADJUSTMENT_MODE: 'learned',
      SENSOR_OBSERVER_DYNAMICS_ENABLED: true,
      NODAL_TOWER_COUPLING_MODE: NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL,
      STRUCTURAL_PLASTICITY_LEVEL2_ENABLED: true,
      AUTONOMOUS_SUPERVISOR_LEVEL3_ENABLED: true,
      ...(config || {})
    };
    workerRuntime.session = createHeadlessRuntimeSession({
      config: effectiveConfig,
      seed,
      nodes: requestedNodes,
      profile: 'paired_intervention'
    });
    workerRuntime.session.initialize();
    if (dynamicState && typeof dynamicState === 'object') {
      applyDynamicState(workerRuntime.session.bag, dynamicState, {
        config: workerRuntime.session.environment.config
      });
    }
    workerRuntime.nodeCount =
      workerRuntime.session.bag.nodalLayer.current?.nodes?.length || requestedNodes;
  }
  if (!workerRuntime.controller) {
    workerRuntime.controller = new Level3SupervisorController({
      policy: { ...LEVEL3_DEFAULT_POLICY, ...(policy || {}) },
      knowledgeBelt: knowledgeBelt ? structuredClone(knowledgeBelt) : createEmptyKnowledgeBelt(),
      auditLedger: auditLedger ? structuredClone(auditLedger) : createEmptyLevel3AuditLedger(),
      governorState: governorState ? structuredClone(governorState) : undefined,
      cycleIdPrefix: 'l3-worker',
      buildInfo: LEVEL3_WORKER_BUILD
    });
  } else {
    workerRuntime.controller.cycleIdPrefix = 'l3-worker';
    if (sessionRecreated) {
      workerRuntime.controller.activeGate2Watch = null;
      workerRuntime.controller.lastLevel2Telemetry = null;
    }
    if (policy) {
      workerRuntime.controller.policy = { ...workerRuntime.controller.policy, ...policy };
    }
    if (knowledgeBelt) {
      workerRuntime.controller.knowledgeBelt = structuredClone(knowledgeBelt);
    }
    if (auditLedger) {
      workerRuntime.controller.auditLedger = structuredClone(auditLedger);
      workerRuntime.controller.cycleSequence = Math.max(
        Number(workerRuntime.controller.cycleSequence) || 0,
        workerRuntime.controller.auditLedger.entries.length
      );
    }
    if (governorState) {
      workerRuntime.controller.governorState = {
        ...workerRuntime.controller.governorState,
        ...structuredClone(governorState),
        inFlight: false
      };
    }
  }
  return workerRuntime;
}

export async function handleLevel3WorkerRequest(request = {}) {
  if (!request || typeof request !== 'object' || typeof request.type !== 'string') {
    throw new Error('invalid_level3_worker_request');
  }
  const id = request.id || 'level3-req';

  if (request.type === 'level3_init_or_sync') {
    const rt = ensureWorkerSession(request);
    const tel = readLevel3LiveTelemetry(rt.session);
    return {
      id,
      type: 'level3_sync_ack',
      workerBuild: LEVEL3_WORKER_BUILD,
      workerMode: 'parallel_lightweight_sandbox',
      reasonerSource: 'deterministic_local_worker',
      external_llm_assisted: false,
      nodeCount: rt.nodeCount,
      tick: rt.session.completedTick,
      telemetry: tel,
      auditLedger: rt.controller.auditLedger,
      knowledgeBelt: rt.controller.knowledgeBelt,
      governorState: structuredClone(rt.controller.governorState),
      activeGate2Watch: serializeGate2Watch(rt.controller.activeGate2Watch),
      quota: getQuotaSnapshot(rt.controller.governorState, rt.controller.policy, Date.now(), rt.session.completedTick)
    };
  }

  if (request.type === 'level3_step_ticks') {
    if (workerRuntime.inFlight) {
      return {
        id,
        type: 'level3_step_busy',
        busy: true,
        reason: 'worker_step_in_flight'
      };
    }
    workerRuntime.inFlight = true;
    const stepPromise = (async () => {
      const rt = ensureWorkerSession(request);
      const steps = Math.max(1, Math.min(50, Number(request.ticks) || 1));
      const forceManual = Boolean(request.forceManual);
      const simulateDelayMs = Math.max(0, Number(request.simulateDelayMs) || 0);
      let lastCycleResult = null;

      if (simulateDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, simulateDelayMs));
      }

      for (let i = 0; i < steps; i += 1) {
        const nextTick = (Number(rt.session.completedTick) || 0) + 1;
        rt.session.step(nextTick, { evaluationOffset: nextTick });
        const isLast = i === steps - 1;
        lastCycleResult = await rt.controller.runCycle(rt.session, {
          tick: nextTick,
          nowMs: Date.now() + i * 10,
          forceManual: isLast && forceManual
        });
      }

      const tel = readLevel3LiveTelemetry(rt.session);
      const includeDynamicState = Boolean(request.includeDynamicState);
      const dynamicState = includeDynamicState
        ? {
            ...captureDynamicState(rt.session.bag, {
              runtime: rt.session.bag.simulationRuntimeRef.current,
              config: rt.session.environment.config,
              build: LEVEL3_WORKER_BUILD,
              now: Date.now()
            }),
            nodeCount: rt.nodeCount
          }
        : null;

      return {
        id,
        type: 'level3_step_result',
        workerBuild: LEVEL3_WORKER_BUILD,
        workerMode: 'parallel_lightweight_sandbox',
        reasonerSource: 'deterministic_local_worker',
        external_llm_assisted: Boolean(rt.controller.auditLedger.external_llm_assisted),
        nodeCount: rt.nodeCount,
        dynamicStateNodeCount: rt.nodeCount,
        tick: rt.session.completedTick,
        telemetry: tel,
        cycleResult: lastCycleResult,
        auditLedger: rt.controller.auditLedger,
        knowledgeBelt: rt.controller.knowledgeBelt,
        governorState: structuredClone(rt.controller.governorState),
        activeGate2Watch: serializeGate2Watch(rt.controller.activeGate2Watch),
        quota: getQuotaSnapshot(rt.controller.governorState, rt.controller.policy, Date.now(), rt.session.completedTick),
        dynamicState
      };
    })();
    workerRuntime.activeStepPromise = stepPromise;
    try {
      return await stepPromise;
    } finally {
      if (workerRuntime.activeStepPromise === stepPromise) {
        workerRuntime.activeStepPromise = null;
      }
      workerRuntime.inFlight = false;
    }
  }

  if (request.type === 'level3_stop_loop') {
    workerRuntime.runningLoop = false;
    if (workerRuntime.timerId) {
      clearTimeout(workerRuntime.timerId);
      workerRuntime.timerId = null;
    }
    if (workerRuntime.activeStepPromise) {
      await workerRuntime.activeStepPromise.catch(() => {});
    }
    const exported = await handleLevel3WorkerRequest({
      id,
      type: 'level3_export_state'
    });
    return {
      ...exported,
      type: 'level3_loop_stopped',
      inFlight: workerRuntime.inFlight
    };
  }

  if (request.type === 'level3_export_state') {
    const rt = ensureWorkerSession(request);
    const dynamicState = {
      ...captureDynamicState(rt.session.bag, {
        runtime: rt.session.bag.simulationRuntimeRef.current,
        config: rt.session.environment.config,
        build: LEVEL3_WORKER_BUILD,
        now: Date.now()
      }),
      nodeCount: rt.nodeCount
    };
    return {
      id,
      type: 'level3_exported_state',
      workerBuild: LEVEL3_WORKER_BUILD,
      workerMode: 'parallel_lightweight_sandbox',
      reasonerSource: 'deterministic_local_worker',
      external_llm_assisted: Boolean(rt.controller.auditLedger.external_llm_assisted),
      nodeCount: rt.nodeCount,
      dynamicStateNodeCount: rt.nodeCount,
      tick: rt.session.completedTick,
      dynamicState,
      auditLedger: rt.controller.auditLedger,
      knowledgeBelt: rt.controller.knowledgeBelt,
      governorState: structuredClone(rt.controller.governorState),
      activeGate2Watch: serializeGate2Watch(rt.controller.activeGate2Watch),
      quota: getQuotaSnapshot(rt.controller.governorState, rt.controller.policy, Date.now(), rt.session.completedTick)
    };
  }

  throw new Error(`unknown_level3_worker_request:${request.type}`);
}

function scheduleNextLoopTick(loopId) {
  if (!workerRuntime.runningLoop) return;
  workerRuntime.timerId = setTimeout(async () => {
    if (!workerRuntime.runningLoop) return;
    try {
      const res = await handleLevel3WorkerRequest({
        id: loopId,
        type: 'level3_step_ticks',
        ticks: 1
      });
      if (workerRuntime.runningLoop && res.type !== 'level3_step_busy') {
        self.postMessage({ ...res, type: 'level3_loop_tick' });
      }
    } catch (err) {
      self.postMessage({
        id: loopId,
        type: 'level3_worker_error',
        error: String(err?.message || err)
      });
    } finally {
      if (workerRuntime.runningLoop) {
        scheduleNextLoopTick(loopId);
      }
    }
  }, workerRuntime.intervalMs);
}

if (typeof self !== 'undefined' && typeof self.postMessage === 'function' && typeof document === 'undefined') {
  self.onmessage = async ({ data }) => {
    try {
      if (data?.type === 'level3_start_loop') {
        ensureWorkerSession(data);
        if (workerRuntime.timerId) {
          clearTimeout(workerRuntime.timerId);
          workerRuntime.timerId = null;
        }
        workerRuntime.runningLoop = true;
        workerRuntime.intervalMs = Math.max(150, Number(data.intervalMs) || 500);
        const loopId = data.id || 'loop';
        scheduleNextLoopTick(loopId);
        self.postMessage({
          id: loopId,
          type: 'level3_loop_started',
          intervalMs: workerRuntime.intervalMs,
          workerMode: 'parallel_lightweight_sandbox',
          reasonerSource: 'deterministic_local_worker',
          nodeCount: workerRuntime.nodeCount
        });
        return;
      }
      if (data?.type === 'level3_stop_loop') {
        const stopped = await handleLevel3WorkerRequest({
          id: data.id || 'stop',
          type: 'level3_stop_loop'
        });
        self.postMessage(stopped);
        return;
      }
      const reply = await handleLevel3WorkerRequest(data);
      self.postMessage(reply);
    } catch (error) {
      self.postMessage({
        id: data?.id || null,
        type: 'level3_worker_error',
        error: String(error?.message || error)
      });
    }
  };
}

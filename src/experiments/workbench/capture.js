import { captureDynamicState, sealDynamicState, encodeForDiff } from '../../persistence/dynamicState.js';
import { sealData, WORKBENCH_BOUNDARY, PROFILES } from './contracts.js';

export const EXECUTION_REFS = Object.freeze([
  'quantumEntropyBridgeRef', 'interventionSchedulerRef', 'interventionSchedulerMetaRef',
  'interventionScheduleAbortRef', 'lastSaveTimestampRef', 'apiCallLog', 'canvasTelemetryRef'
]);

/** Capture is synchronous through graph copying, then seals only detached data. */
export async function captureWorkbench({ refs, runtime, config, build, execution, now, sourceCommit = null, ledgerHeadHash = null }) {
  if (!execution || !Number.isFinite(now) || !Number.isInteger(runtime?.simulationStep) || runtime.simulationStep < 0) throw new Error('explicit_capture_context_required');
  if (!PROFILES.includes(execution.profile) || !Number.isInteger(execution.seed) || !['capture_only','react_commit'].includes(execution.setterPolicy) || !execution.runtimePolicy || !execution.schedule || !execution.environmentState || !execution.sensorState) throw new Error('incomplete_execution_context');
  if (sourceCommit !== null && !/^[a-f0-9]{40}$/.test(sourceCommit)) throw new Error('invalid_source_commit');
  if (ledgerHeadHash !== null && !/^[a-f0-9]{64}$/.test(ledgerHeadHash)) throw new Error('invalid_ledger_head_hash');
  if (refs.quantumEntropyBridgeRef?.current?.config?.enabled || refs.quantumEntropyBridgeRef?.current?._pollTimer || refs.quantumEntropyBridgeRef?.current?._scheduledRefillTimer) {
    throw new Error('external_entropy_requires_explicit_replay_capture');
  }
  const body = captureDynamicState(refs, { runtime, config, build, now });
  const context = structuredClone(execution);
  const extraComponents = {};
  for (const name of EXECUTION_REFS) if (refs[name]) extraComponents[name] = encodeForDiff(refs[name].current);
  const runtimeInputs = encodeForDiff(runtime);
  const configuration = structuredClone(config);
  const record = await sealDynamicState(body, () => 0);
  return sealData({
    schema: 'qicn.workbench_capture.v1', ...WORKBENCH_BOUNDARY,
    sourceCommit, ledgerHeadHash, sourceTick: body.tick, nodeCount: body.nodeCount,
    sourceBuild: body.build,
    dynamicRecord: { text: record.text, digest: record.digest },
    configuration, execution: context, runtimeInputs, extraComponents,
    externalStatePolicy: 'no_network_no_live_sensors_no_live_callbacks; disabled entropy execution context only'
  });
}

export function captureSession(session, { build = { version: 'workbench.v1', signature: 'internal_support_only' }, sourceCommit = null } = {}) {
  session.assertCaptureBoundary();
  if (session.bag.simulationRuntimeRef.current.simulationStep !== session.completedTick) throw new Error('capture_tick_not_completed');
  return captureWorkbench({
    refs: session.bag, runtime: session.bag.simulationRuntimeRef.current,
    config: session.environment.config, build, sourceCommit,
    now: session.environment.peekClock(),
    execution: {
      profile: session.profile, seed: session.seed, setterPolicy: session.setterPolicy,
      runtimePolicy: structuredClone(session.environment.runtimePolicy),
      environmentState: session.environment.snapshot(), sensorState: session.sensorSnapshot(),
      schedule: structuredClone(session.schedule)
    }
  });
}

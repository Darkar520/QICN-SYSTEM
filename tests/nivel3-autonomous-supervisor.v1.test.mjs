// claim_scope: internal_runtime_engineering
// evidence_scope: internal_support_only
// interpretation_boundary: Automated and adversarial verification of Level 3 autonomous supervisor (B0 parity, R-1..R-10 audit remediations, fact+scheduled triggers, first-person schema gate, Gate 1 isolated Workbench with negative-control action application & minObjectiveDelta, Gate 2 dynamicState.v3 append-only surveillance & automatic rollback with tick sync, SHA-256 Knowledge Belt & Ledger, Worker topology protection + concurrency guard, Daemon header auth, and Sistema B).

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { QICNConfig } from '../services/config.js';
import { createHeadlessRuntimeSession } from '../src/runtime/HeadlessRuntimeSession.js';
import { NODAL_TOWER_COUPLING_MODES } from '../src/simulation/NodalTowerCouplingBridge.js';
import {
  LEVEL3_DEFAULT_POLICY,
  LEVEL3_SUPERVISOR_PROPOSAL_SCHEMA,
  Level3SupervisorController,
  applyTypedCandidateActionToTarget,
   evaluateLevel3Trigger,
  createInitialGovernorState,
  isAutonomousSupervisorLevel3Enabled,
  parseAndValidateLevel3Proposal,
  readLevel3LiveTelemetry,
  runLevel3ShadowGate1,
  synchronizeLevel3WorkerStateIntoTarget
} from '../src/simulation/Level3AutonomousSupervisor.js';
import {
  LEVEL3_AUDIT_BUNDLE_SCHEMA,
  createEmptyKnowledgeBelt,
  exportLevel3SealedAuditBundle,
  isActionBlockedByKnowledgeBelt,
  projectLedgerCyclesWithGate2,
  summarizeKnowledgeBeltForPrompt,
  verifyLevel3AuditLedger,
  verifyLevel3KnowledgeBelt,
  verifyLevel3SealedAuditBundle
} from '../src/simulation/Level3KnowledgeBelt.js';
import { handleLevel3WorkerRequest } from '../src/workers/level3Autonomous.worker.js';
import { callRemoteGeminiForDaemon } from '../scripts/run-level3-autonomous-daemon.mjs';
import { captureSession } from '../src/experiments/workbench/capture.js';
import { captureRuntimeSnapshot } from '../src/language/runtimeSnapshot.js';
import { prepareTurn, finalizeTurn } from '../src/language/conversationEngine.js';
import { resolveIntent } from '../src/language/intentResolver.js';
import { verifySentenceEvidential } from '../src/language/evidential/factualVerifier.js';

// 1. Default B0 configuration safety
assert.equal(
  QICNConfig.AUTONOMOUS_SUPERVISOR_LEVEL3_ENABLED,
  false,
  'B0 default AUTONOMOUS_SUPERVISOR_LEVEL3_ENABLED must stay false'
);
assert.equal(isAutonomousSupervisorLevel3Enabled(QICNConfig), false);
assert.equal(
  isAutonomousSupervisorLevel3Enabled({ ...QICNConfig, AUTONOMOUS_SUPERVISOR_LEVEL3_ENABLED: true }),
  true
);

// 2. Governor & Trigger Evaluation (Fact-based triggers + Scheduled Exploration Window + Quota/Cooldown/Strain gates)
{
  const gov = createInitialGovernorState();
  const healthyTel = {
    populatedSectors: 4,
    sectorImbalance: 0,
    sectorCoherenceMin: 0.85,
    deltaInvariantRepairs: 0,
    deltaKinematicUnfreezes: 0,
    inTube: true,
    objectiveScore: 0.89,
    baselineObjectiveScore: 0.89,
    stasisIndex: 0.02,
    metacognitiveStrain: 0.1
  };

  const noTrig = evaluateLevel3Trigger({
    tick: 12,
    nowMs: 1_800_000_000_000,
    telemetry: healthyTel,
    governorState: gov,
    policy: LEVEL3_DEFAULT_POLICY
  });
  assert.equal(noTrig.shouldTrigger, false);
  assert.equal(noTrig.reason, 'healthy_no_trigger');

  const schedTrig = evaluateLevel3Trigger({
    tick: 50,
    nowMs: 1_800_000_000_000,
    telemetry: healthyTel,
    governorState: gov,
    policy: LEVEL3_DEFAULT_POLICY
  });
  assert.equal(schedTrig.shouldTrigger, true);
  assert.equal(schedTrig.triggerKind, 'scheduled_exploration');

  const anomTrig = evaluateLevel3Trigger({
    tick: 15,
    nowMs: 1_800_000_000_000,
    telemetry: { ...healthyTel, populatedSectors: 3, sectorImbalance: 8 },
    governorState: gov,
    policy: LEVEL3_DEFAULT_POLICY
  });
  assert.equal(anomTrig.shouldTrigger, true);
  assert.equal(anomTrig.triggerKind, 'anomaly_level2');

  const driftTrig = evaluateLevel3Trigger({
    tick: 16,
    nowMs: 1_800_000_000_000,
    telemetry: { ...healthyTel, inTube: false, objectiveScore: 0.72, baselineObjectiveScore: 0.89 },
    governorState: gov,
    policy: LEVEL3_DEFAULT_POLICY
  });
  assert.equal(driftTrig.shouldTrigger, true);
  assert.equal(driftTrig.triggerKind, 'metric_drift');

  const stasisTrig = evaluateLevel3Trigger({
    tick: 18,
    nowMs: 1_800_000_000_000,
    telemetry: { ...healthyTel, stasisIndex: 0.45 },
    governorState: gov,
    policy: LEVEL3_DEFAULT_POLICY
  });
  assert.equal(stasisTrig.shouldTrigger, true);
  assert.equal(stasisTrig.triggerKind, 'prolonged_stasis');

  const strainBlock = evaluateLevel3Trigger({
    tick: 50,
    nowMs: 1_800_000_000_000,
    telemetry: { ...healthyTel, metacognitiveStrain: 0.78 },
    governorState: gov,
    policy: LEVEL3_DEFAULT_POLICY
  });
  assert.equal(strainBlock.shouldTrigger, false);
  assert.equal(strainBlock.reason, 'blocked_by_high_latency_strain');

  const recentGov = {
    ...createInitialGovernorState(),
    lastCallTick: 45,
    lastCallMs: 1_800_000_000_000 - 10_000,
    callTimestampsMs: [1_800_000_000_000 - 10_000]
  };
  const cooldownBlock = evaluateLevel3Trigger({
    tick: 50,
    nowMs: 1_800_000_000_000,
    telemetry: { ...healthyTel, populatedSectors: 3 },
    governorState: recentGov,
    policy: LEVEL3_DEFAULT_POLICY
  });
  assert.equal(cooldownBlock.shouldTrigger, false);
  assert.equal(cooldownBlock.reason, 'cooldown_active');

  const nowMs = 1_800_000_500_000;
  const fullHourGov = {
    ...createInitialGovernorState(),
    lastCallTick: 1,
    lastCallMs: nowMs - 200_000,
    callTimestampsMs: Array.from({ length: 12 }, (_, i) => nowMs - 100_000 - i * 1000)
  };
  const quotaBlock = evaluateLevel3Trigger({
    tick: 100,
    nowMs,
    telemetry: { ...healthyTel, populatedSectors: 3 },
    governorState: fullHourGov,
    policy: LEVEL3_DEFAULT_POLICY
  });
  assert.equal(quotaBlock.shouldTrigger, false);
  assert.equal(quotaBlock.reason, 'quota_exhausted');
}

// 3. Strict First-Person Voice, Typed Schema Validation, and R-9 Security Checks
{
  const snap = { tick: 25, digest: 'a'.repeat(64) };

  const validWrapped = `Nota {aux}: ${JSON.stringify({
    schema: LEVEL3_SUPERVISOR_PROPOSAL_SCHEMA,
    snapshot: snap,
    triggerKind: 'scheduled_exploration',
    firstPersonThought: 'Estoy observando en mi tick 25 que mis cuatro sectores mantienen sincronía estable y decido pensar en alto sin alterar mis factores.',
    diagnosis: 'Estado homeostático estable.',
    hypothesis: 'Mantener configuración actual preserva el tubo de viabilidad.',
    actionMode: 'reflect_only',
    candidateAction: { kind: 'none' }
  })} (fin {ok})`;
  const resValid = parseAndValidateLevel3Proposal(validWrapped, {
    expectedTick: 25,
    expectedDigest: snap.digest
  });
  assert.equal(resValid.ok, true);
  assert.equal(resValid.actionSignature, 'none');

  const thirdPersonOnly = JSON.stringify({
    schema: LEVEL3_SUPERVISOR_PROPOSAL_SCHEMA,
    snapshot: snap,
    triggerKind: 'scheduled_exploration',
    firstPersonThought: 'El sistema presenta valores normales en todos los parámetros durante la corrida actual.',
    diagnosis: 'Normal.',
    hypothesis: 'Sin cambios.',
    actionMode: 'reflect_only',
    candidateAction: { kind: 'none' }
  });
  const resNoFirstPerson = parseAndValidateLevel3Proposal(thirdPersonOnly, {
    expectedTick: 25,
    expectedDigest: snap.digest
  });
  assert.equal(resNoFirstPerson.ok, false);
  assert.equal(resNoFirstPerson.reason, 'missing_first_person_internal_voice');

  const inflated = JSON.stringify({
    schema: LEVEL3_SUPERVISOR_PROPOSAL_SCHEMA,
    snapshot: snap,
    triggerKind: 'scheduled_exploration',
    firstPersonThought: 'Estoy observando en mi tick 25 que tengo conciencia fenoménica humana probada y external_support_certified = true.',
    diagnosis: 'Certificado externamente.',
    hypothesis: 'N/A',
    actionMode: 'reflect_only',
    candidateAction: { kind: 'none' }
  });
  const resInflated = parseAndValidateLevel3Proposal(inflated, {
    expectedTick: 25,
    expectedDigest: snap.digest
  });
  assert.equal(resInflated.ok, false);
  assert.equal(resInflated.reason, 'forbidden_epistemic_inflation');

  const inventedParam = JSON.stringify({
    schema: LEVEL3_SUPERVISOR_PROPOSAL_SCHEMA,
    snapshot: snap,
    triggerKind: 'metric_drift',
    firstPersonThought: 'Estoy observando en mi tick 25 una deriva y propongo modificar un parámetro inventado.',
    diagnosis: 'Deriva.',
    hypothesis: 'Ajustar parámetro inventado.',
    actionMode: 'propose_shadow_experiment',
    candidateAction: { kind: 'kaizen_factor_nudge', key: 'INVENTED_HEURISTIC_ALPHA', deltaSteps: 1 }
  });
  const resInvented = parseAndValidateLevel3Proposal(inventedParam, {
    expectedTick: 25,
    expectedDigest: snap.digest
  });
  assert.equal(resInvented.ok, false);
  assert.equal(resInvented.reason, 'invalid_kaizen_factor_nudge');

  // [R-9] stage_code_patch_review rejects path traversal and unknown modules, accepts valid inventory module
  const makePatchProposal = (targetModule) => JSON.stringify({
    schema: LEVEL3_SUPERVISOR_PROPOSAL_SCHEMA,
    snapshot: snap,
    triggerKind: 'manual_reflection',
    firstPersonThought: 'Estoy proponiendo en mi tick 25 un parche aislado que requiere aprobación humana.',
    diagnosis: 'Optimización candidata.',
    hypothesis: 'Reducir asignaciones por tick.',
    actionMode: 'stage_code_patch_review',
    candidateAction: {
      kind: 'staged_code_patch',
      targetModule,
      patchSummary: 'Optimización de caché'
    }
  });
  const traversalCheck = parseAndValidateLevel3Proposal(makePatchProposal('../../../etc/passwd'), {
    expectedTick: 25,
    expectedDigest: snap.digest
  });
  assert.equal(traversalCheck.ok, false);
  assert.equal(traversalCheck.reason, 'invalid_or_unknown_target_module');

  const unknownModCheck = parseAndValidateLevel3Proposal(makePatchProposal('src/nonexistent_ghost_module.js'), {
    expectedTick: 25,
    expectedDigest: snap.digest
  });
  assert.equal(unknownModCheck.ok, false);
  assert.equal(unknownModCheck.reason, 'invalid_or_unknown_target_module');

  const validModCheck = parseAndValidateLevel3Proposal(makePatchProposal('src/simulation/NodalProcessingLayer.js'), {
    expectedTick: 25,
    expectedDigest: snap.digest
  });
  assert.equal(validModCheck.ok, true);

  // [R-9] PLASTICITY_DECAY nudge rejected when sensorObserverDynamicsEnabled === false
  const pdProposal = JSON.stringify({
    schema: LEVEL3_SUPERVISOR_PROPOSAL_SCHEMA,
    snapshot: snap,
    triggerKind: 'metric_drift',
    firstPersonThought: 'Estoy proponiendo en mi tick 25 ajustar PLASTICITY_DECAY.',
    diagnosis: 'Ajuste de decaimiento.',
    hypothesis: 'Mejorar retención plástica.',
    actionMode: 'propose_shadow_experiment',
    candidateAction: { kind: 'kaizen_factor_nudge', key: 'PLASTICITY_DECAY', deltaSteps: 1 }
  });
  const pdBlocked = parseAndValidateLevel3Proposal(pdProposal, {
    expectedTick: 25,
    expectedDigest: snap.digest,
    sensorObserverDynamicsEnabled: false
  });
  assert.equal(pdBlocked.ok, false);
  assert.equal(pdBlocked.reason, 'plasticity_decay_disabled_without_sensor_observer_dynamics');
}

// 4. [R-1 & R-6] Adversarial Check: Real Kaizen adjustments (no phantom learnedFactors), persistence across >= 5 ticks,
// non-trivial Gate 1 deltas, pure non-mutating readLevel3LiveTelemetry, real xN != ccc, and all viability clusters
{
  const session = createHeadlessRuntimeSession({
    config: {
      ...QICNConfig,
      KAIZEN_ADJUSTMENT_MODE: 'learned',
      SENSOR_OBSERVER_DYNAMICS_ENABLED: true,
      NODAL_TOWER_COUPLING_MODE: NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL,
      STRUCTURAL_PLASTICITY_LEVEL2_ENABLED: true,
      AUTONOMOUS_SUPERVISOR_LEVEL3_ENABLED: true
    },
    seed: 31,
    nodes: 48,
    profile: 'paired_intervention'
  });
  session.initialize();
  for (let t = 1; t <= 4; t += 1) {
    session.step(t, { evaluationOffset: t });
  }

  const kaizen = session.bag.kaizenEngine.current;
  const nodal = session.bag.nodalLayer.current;
  assert.equal('learnedFactors' in kaizen, false, 'R-1 FAIL: phantom learnedFactors property must not exist on kaizen');
  assert.equal(kaizen.getAdjustments().HEBBIAN_FACTOR, 1, 'Initial HEBBIAN_FACTOR adjustment must be 1');

  // Apply kaizen_factor_nudge (+2 steps = +0.04 -> 1.04)
  const nudgeRes = applyTypedCandidateActionToTarget(session, {
    kind: 'kaizen_factor_nudge',
    key: 'HEBBIAN_FACTOR',
    deltaSteps: 2
  });
  assert.equal(nudgeRes.applied, true, 'R-1 FAIL: kaizen_factor_nudge must apply in learned mode');
  assert.equal(nudgeRes.prevFactor, 1);
  assert.equal(nudgeRes.nextFactor, 1.04);
  assert.equal('learnedFactors' in kaizen, false, 'R-1 FAIL: applyTypedCandidateActionToTarget must never create kaizen.learnedFactors');
  assert.equal(kaizen.getAdjustments().HEBBIAN_FACTOR, 1.04, 'R-1 FAIL: kaizen.adjustments.HEBBIAN_FACTOR must equal 1.04');

  // Step 6 real ticks and verify the factor persists in kaizen.adjustments and readLevel3LiveTelemetry
  for (let t = 5; t <= 10; t += 1) {
    session.step(t, { evaluationOffset: t });
  }
  assert.equal(kaizen.getAdjustments().HEBBIAN_FACTOR, 1.04, 'R-1 FAIL: kaizen.adjustments.HEBBIAN_FACTOR was lost across 6 ticks');
  const telAfterTicks = readLevel3LiveTelemetry(session);
  assert.equal(telAfterTicks.kaizenFactors.HEBBIAN_FACTOR, 1.04, 'R-1 FAIL: readLevel3LiveTelemetry must read real kaizen.getAdjustments()');

  // Verify kaizen_factor_nudge is rejected in legacy mode and for PLASTICITY_DECAY when sensor_observer_dynamics is false
  session.environment.config.KAIZEN_ADJUSTMENT_MODE = 'legacy';
  const legacyReject = applyTypedCandidateActionToTarget(session, {
    kind: 'kaizen_factor_nudge',
    key: 'HEBBIAN_FACTOR',
    deltaSteps: 1
  });
  assert.equal(legacyReject.applied, false);
  assert.equal(legacyReject.reason, 'kaizen_not_in_learned_mode');
  session.environment.config.KAIZEN_ADJUSTMENT_MODE = 'learned';

  session.environment.config.SENSOR_OBSERVER_DYNAMICS_ENABLED = false;
  const pdExecReject = applyTypedCandidateActionToTarget(session, {
    kind: 'kaizen_factor_nudge',
    key: 'PLASTICITY_DECAY',
    deltaSteps: 1
  });
  assert.equal(pdExecReject.applied, false);
  assert.equal(pdExecReject.reason, 'plasticity_decay_requires_sensor_observer_dynamics');
  session.environment.config.SENSOR_OBSERVER_DYNAMICS_ENABLED = true;

  // Verify kaizen_factor_nudge produces non-zero physical difference in Gate 1 compared to baseline
  const capForNudge = await captureSession(session);
  const g1Nudge = await runLevel3ShadowGate1(
    capForNudge,
    { kind: 'kaizen_factor_nudge', key: 'BASE_LEARNING_RATE', deltaSteps: 2 },
    { triggerKind: 'metric_drift', horizonTicks: 10 }
  );
  assert.equal(g1Nudge.branches.candidate.candidateApplied, true);
  assert.equal(g1Nudge.branches.neg_td_cut.candidateApplied, true, 'R-5 FAIL: neg_td_cut must apply candidateAction');
  assert.equal(g1Nudge.branches.neg_reducible.candidateApplied, true, 'R-5 FAIL: neg_reducible must apply candidateAction');

  // [R-6] Pure readLevel3LiveTelemetry: must not mutate nodal.lastBridgeMetrics, reads real xN != ccc, and classifies high_dispersion & high_sensory
  const sentinelBridge = Object.freeze({ marker: 'sentinel_do_not_mutate' });
  nodal.lastBridgeMetrics = sentinelBridge;
  // Clear core bridge cut temporarily so readLevel3LiveTelemetry falls back to active nodes without calling nodal.computeBridgeMetrics
  const savedCuts = session.bag.ontologicalCore.current.constructiveFiniteCuts;
  const savedStateCuts = session.bag.ontologicalCore.current.ontologicalState.constructive_finite_cuts;
  session.bag.ontologicalCore.current.constructiveFiniteCuts = {};
  session.bag.ontologicalCore.current.ontologicalState.constructive_finite_cuts = {};

  const activeNodes = nodal.getActiveNodes();
  for (let i = 0; i < activeNodes.length; i += 1) {
    activeNodes[i].coherenceState = i % 2 === 0 ? 0.85 : 0.65; // mean = 0.75, dispersion = 0.10 (>= 0.068 -> high_dispersion)
  }
  session.bag.ontologicalCore.current.ontologicalState.coherence = 0.912345; // distinct from xN = 0.75

  const telDisp = readLevel3LiveTelemetry(session);
  assert.equal(nodal.lastBridgeMetrics, sentinelBridge, 'R-6 FAIL: readLevel3LiveTelemetry mutated nodal.lastBridgeMetrics');
  assert.equal(telDisp.xN, 0.75, `R-6 FAIL: expected real xN=0.75 from nodes, got ${telDisp.xN} (ccc=${telDisp.ccc})`);
  assert.notEqual(telDisp.xN, telDisp.ccc, 'R-6 FAIL: xN must be distinct from ccc');
  assert.equal(telDisp.cluster, 'high_dispersion', `R-6 FAIL: expected high_dispersion cluster, got ${telDisp.cluster}`);

  // Now set low dispersion (0.01) and high sensorDelta (0.22 >= 0.14) -> high_sensory
  for (let i = 0; i < activeNodes.length; i += 1) {
    activeNodes[i].coherenceState = 0.76 + (i % 2 === 0 ? 0.01 : -0.01);
  }
  session.bag.ontologicalCore.current.lastOperationalInput = { sensorDelta: 0.22, energyDispersion: 0.01 };
  const telSens = readLevel3LiveTelemetry(session);
  assert.equal(telSens.cluster, 'high_sensory', `R-6 FAIL: expected high_sensory cluster, got ${telSens.cluster}`);

  session.bag.ontologicalCore.current.constructiveFiniteCuts = savedCuts;
  session.bag.ontologicalCore.current.ontologicalState.constructive_finite_cuts = savedStateCuts;
}

// 5. [R-3, R-4, R-5, R-7] End-to-End Controller Adversarial Suite:
// - R-4: Offline deterministic calls consume 0 LLM quota (callsLastHour=0, external_llm_assisted=false); live LLM calls consume quota (callsLastHour=1, external_llm_assisted=true)
// - R-5: Gate 1 rejects marginal positive noise (0 < deltaObjectiveScore < minObjectiveDelta) with below_min_objective_delta
// - R-7: Strictly append-only Ledger on Gate 2 closure (original promoted_watching entry digest never changes; gate2_resolution entry appended)
// - R-3: Gate 2 rollback at t=16 restores completedTick=15 & runtime.simulationStep=15; resetTransientRuntimeState clears activeGate2Watch; stale live tick aborts promotion (aborted_stale_tick)
{
  const session = createHeadlessRuntimeSession({
    config: {
      ...QICNConfig,
      KAIZEN_ADJUSTMENT_MODE: 'learned',
      SENSOR_OBSERVER_DYNAMICS_ENABLED: true,
      NODAL_TOWER_COUPLING_MODE: NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL,
      STRUCTURAL_PLASTICITY_LEVEL2_ENABLED: false,
      AUTONOMOUS_SUPERVISOR_LEVEL3_ENABLED: true
    },
    seed: 23,
    nodes: 48,
    profile: 'paired_intervention'
  });
  session.initialize();
  for (let t = 1; t <= 10; t += 1) {
    session.step(t, { evaluationOffset: t });
  }

  const controller = new Level3SupervisorController({
    policy: {
      ...LEVEL3_DEFAULT_POLICY,
      scheduledExplorationEveryTicks: 10,
      minCooldownTicks: 1,
      minCooldownMs: 0,
      gate1HorizonTicks: 12,
      gate2WatchTicks: 6
    }
  });

  // 5A. [R-4] Offline deterministic scheduled exploration at tick 10 -> 0 LLM quota consumed, external_llm_assisted = false
  let nowMs = 1_800_000_000_000;
  const reflectRes = await controller.runCycle(session, { tick: 10, nowMs });
  assert.equal(reflectRes.triggered, true);
  assert.equal(reflectRes.finalStatus, 'reflect_only');
  assert.equal(reflectRes.external_llm_assisted, false, 'R-4 FAIL: deterministic local reasoner must set external_llm_assisted=false');
  assert.equal(reflectRes.quota.callsLastHour, 0, 'R-4 FAIL: deterministic local reasoner must not consume hourly LLM quota');
  assert.equal(reflectRes.quota.totalCalls, 0, 'R-4 FAIL: deterministic local reasoner must not increment totalCalls');
  assert.equal(reflectRes.quota.deterministicLocalCalls, 1);

  const offlineBundle = exportLevel3SealedAuditBundle({
    ledger: controller.auditLedger,
    belt: controller.knowledgeBelt,
    sourceTick: 10
  });
  assert.equal(offlineBundle.external_llm_assisted, false, 'R-4 FAIL: bundle with only deterministic local entries must have external_llm_assisted=false');
  assert.equal(verifyLevel3SealedAuditBundle(offlineBundle).ok, true);

  // 5B. [R-5] Gate 1 rejects marginal noise (0 < deltaObjectiveScore < minObjectiveDelta) with below_min_objective_delta
  {
    const capNoise = await captureSession(session);
    // Run with a large minObjectiveDelta (0.50) on an action that produces a small positive delta
    const g1Noise = await runLevel3ShadowGate1(
      capNoise,
      { kind: 'kaizen_strategy_action', strategyId: 'stabilize_learning' },
      { triggerKind: 'metric_drift', horizonTicks: 8, minObjectiveDelta: 0.50 }
    );
    if (g1Noise.deltas.deltaObjectiveScore > 0) {
      assert.equal(g1Noise.approved, false);
      assert.equal(g1Noise.rejectionReason, 'below_min_objective_delta');
    }
  }

  // 5C. Gate 1 rejection + Knowledge Belt repeat-failure block, using simulated live Gemini reasoner (`external_llm_assisted: true`)
  session.step(11, { evaluationOffset: 11 });
  session.step(12, { evaluationOffset: 12 });
  nowMs += 100_000;
  const failAction = { kind: 'workbench_intervention', intervention: 'kaizen_learned_mode' };
  const gate1RejectRes = await controller.runCycle(session, {
    tick: 12,
    nowMs,
    forceManual: true,
    customReasoner: async ({ snapshot }) => ({
      rawText: JSON.stringify({
        schema: LEVEL3_SUPERVISOR_PROPOSAL_SCHEMA,
        snapshot,
        triggerKind: 'metric_drift',
        firstPersonThought: 'Estoy analizando en mi tick 12 una hipótesis redundante que no superará el umbral de mejora en mi Workbench aislado.',
        diagnosis: 'Prueba de rechazo en Compuerta 1.',
        hypothesis: 'Verificar que el Workbench rechaza cambios sin mejora real.',
        actionMode: 'propose_shadow_experiment',
        candidateAction: failAction
      }),
      reasonerSource: 'gemini_live',
      external_llm_assisted: true
    })
  });
  assert.equal(gate1RejectRes.triggered, true);
  assert.equal(gate1RejectRes.finalStatus, 'rejected_gate1');
  assert.equal(gate1RejectRes.external_llm_assisted, true);
  assert.equal(gate1RejectRes.quota.callsLastHour, 1, 'R-4 FAIL: live Gemini call must increment callsLastHour to 1');
  assert.equal(gate1RejectRes.quota.totalCalls, 1);
  assert.equal(gate1RejectRes.gate1Result.branches.neg_td_cut.candidateApplied, true);
  assert.equal(gate1RejectRes.gate1Result.branches.neg_reducible.candidateApplied, true);

  session.step(13, { evaluationOffset: 13 });
  session.step(14, { evaluationOffset: 14 });
  nowMs += 100_000;
  const beltBlockRes = await controller.runCycle(session, {
    tick: 14,
    nowMs,
    forceManual: true,
    customReasoner: async ({ snapshot }) => ({
      rawText: JSON.stringify({
        schema: LEVEL3_SUPERVISOR_PROPOSAL_SCHEMA,
        snapshot,
        triggerKind: 'metric_drift',
        firstPersonThought: 'Estoy intentando repetir en mi tick 14 la misma acción que acaba de fallar en Compuerta 1.',
        diagnosis: 'Repetición de acción fallida.',
        hypothesis: 'El Cinto de Conocimiento debe bloquearme.',
        actionMode: 'propose_shadow_experiment',
        candidateAction: failAction
      }),
      reasonerSource: 'gemini_live',
      external_llm_assisted: true
    })
  });
  assert.equal(beltBlockRes.finalStatus, 'blocked_by_knowledge_belt');
  assert.equal(beltBlockRes.reason, 'previously_rejected_in_gate1');

  // 5D. [R-3 & R-7] Induce Sector-0 amputation at tick 15 -> Gate 1 approves structural_plasticity_level2 ->
  // verify append-only immutability of promoEntry.digest AND completedTick/runtimeStep synchronization on Gate 2 rollback at tick 16!
  session.environment.controls.lesionSectorWipe = true;
  session.step(15, { evaluationOffset: 15 });
  session.environment.controls.lesionSectorWipe = false;
  nowMs += 100_000;

  const promoteForRollbackTest = await controller.runCycle(session, {
    tick: 15,
    nowMs
  });
  assert.equal(promoteForRollbackTest.triggered, true);
  assert.equal(promoteForRollbackTest.finalStatus, 'promoted_watching');
  assert.ok(controller.activeGate2Watch);

  const rawPromoEntryBefore = controller.auditLedger.entries.find(
    (e) => e.cycleId === promoteForRollbackTest.cycleId
  );
  const digestBeforeGate2Rollback = rawPromoEntryBefore.digest;
  const entriesCountBeforeRollback = controller.auditLedger.entries.length;

  // Step to tick 16 and inject NaN fault to trigger Gate 2 automatic rollback
  session.step(16, { evaluationOffset: 16 });
  assert.equal(session.completedTick, 16);
  session.bag.ontologicalCore.current.ontologicalState.coherence = Number.NaN;
  nowMs += 5_000;
  const gate2RollbackStep = controller.stepGate2Surveillance(session, { tick: 16, nowMs });
  assert.equal(gate2RollbackStep.status, 'rolled_back_gate2');
  assert.equal(gate2RollbackStep.rolledBack, true);

  // [R-3] Verify completedTick and simulationRuntimeRef.current.simulationStep were rolled back from 16 to 15!
  assert.equal(
    session.completedTick,
    15,
    `R-3 FAIL: session.completedTick must roll back to 15, got ${session.completedTick}`
  );
  assert.equal(
    session.bag.simulationRuntimeRef.current.simulationStep,
    15,
    `R-3 FAIL: runtime.simulationStep must roll back to 15, got ${session.bag.simulationRuntimeRef.current.simulationStep}`
  );

  // [R-7] Verify strict append-only immutability: original promoted_watching entry kept its exact digest!
  assert.equal(
    controller.auditLedger.entries.length,
    entriesCountBeforeRollback + 1,
    'R-7 FAIL: Gate 2 resolution must append a new entry to ledger.entries'
  );
  const rawPromoEntryAfter = controller.auditLedger.entries.find(
    (e) => e.cycleId === promoteForRollbackTest.cycleId
  );
  assert.equal(
    rawPromoEntryAfter.digest,
    digestBeforeGate2Rollback,
    'R-7 FAIL: original promoted_watching entry digest was mutated!'
  );
  assert.equal(rawPromoEntryAfter.finalStatus, 'promoted_watching');

  const resolutionEntry = controller.auditLedger.entries[controller.auditLedger.entries.length - 1];
  assert.equal(resolutionEntry.entryKind, 'gate2_resolution');
  assert.equal(resolutionEntry.parentCycleId, promoteForRollbackTest.cycleId);
  assert.equal(resolutionEntry.parentDigest, digestBeforeGate2Rollback);
  assert.equal(resolutionEntry.finalStatus, 'rolled_back_gate2');
  assert.equal(verifyLevel3AuditLedger(controller.auditLedger).ok, true);

  // Consolidated cycle projection reflects rolled_back_gate2 while preserving original digest
  const projectedAfterRollback = projectLedgerCyclesWithGate2(controller.auditLedger).find(
    (c) => c.cycleId === promoteForRollbackTest.cycleId
  );
  assert.equal(projectedAfterRollback.digest, digestBeforeGate2Rollback);
  assert.equal(projectedAfterRollback.finalStatus, 'rolled_back_gate2');
  assert.equal(projectedAfterRollback.gate2ResolutionDigest, resolutionEntry.digest);

  // 5E. [R-3] Verify resetTransientRuntimeState clears activeGate2Watch and prevents phantom rollbacks,
  // and verify stale-tick protection (aborted_stale_tick) when live tick advances during Gate 1
  controller.activeGate2Watch = { cycleId: 'phantom-watch', observedTicks: 1 };
  controller.resetTransientRuntimeState({ keepKnowledgeBelt: false, keepAuditLedger: true });
  assert.equal(controller.activeGate2Watch, null, 'R-3 FAIL: resetTransientRuntimeState must clear activeGate2Watch');

  // Stale-tick abort test: simulate target.getLiveTick() advancing from 16 to 19 while Gate 1 runs
  session.environment.config.STRUCTURAL_PLASTICITY_LEVEL2_ENABLED = false;
  session.environment.controls.lesionSectorWipe = true;
  session.step(16, { evaluationOffset: 16 });
  session.environment.controls.lesionSectorWipe = false;
  nowMs += 100_000;
  const staleTarget = {
    ...session,
    getLiveTick: () => 19 // advanced 3 ticks past originTick=16
  };
  const staleRes = await controller.runCycle(staleTarget, { tick: 16, nowMs });
  assert.equal(staleRes.finalStatus, 'aborted_stale_tick', 'R-3 FAIL: must abort promotion if live runtime advanced during Gate 1');

  // 5F. [R-7] Full Gate 2 confirmation (promoted_confirmed) also preserves original digest in append-only ledger
  controller.knowledgeBelt = createEmptyKnowledgeBelt();
  session.environment.config.STRUCTURAL_PLASTICITY_LEVEL2_ENABLED = false;
  session.environment.controls.lesionSectorWipe = true;
  session.step(17, { evaluationOffset: 17 });
  session.environment.controls.lesionSectorWipe = false;
  nowMs += 100_000;

  const promoteConfirmRes = await controller.runCycle(session, { tick: 17, nowMs });
  assert.equal(promoteConfirmRes.finalStatus, 'promoted_watching');
  const rawConfirmEntryBefore = controller.auditLedger.entries.find(
    (e) => e.cycleId === promoteConfirmRes.cycleId
  );
  const digestBeforeGate2Confirm = rawConfirmEntryBefore.digest;

  for (let i = 1; i <= 6; i += 1) {
    const t = 17 + i;
    nowMs += 5_000;
    session.step(t, { evaluationOffset: t });
    await controller.runCycle(session, { tick: t, nowMs });
  }
  assert.equal(controller.activeGate2Watch, null);
  const rawConfirmEntryAfter = controller.auditLedger.entries.find(
    (e) => e.cycleId === promoteConfirmRes.cycleId
  );
  assert.equal(
    rawConfirmEntryAfter.digest,
    digestBeforeGate2Confirm,
    'R-7 FAIL: original promoted_watching digest was mutated on Gate 2 confirmation!'
  );
  const projectedConfirm = projectLedgerCyclesWithGate2(controller.auditLedger).find(
    (c) => c.cycleId === promoteConfirmRes.cycleId
  );
  assert.equal(projectedConfirm.finalStatus, 'promoted_confirmed');
  assert.equal(projectedConfirm.digest, digestBeforeGate2Confirm);
  assert.ok(projectedConfirm.gate2ResolutionDigest);

  // Verify bundle export has external_llm_assisted = true because cycle 12 & 14 used gemini_live
  const mixedBundle = exportLevel3SealedAuditBundle({
    ledger: controller.auditLedger,
    belt: controller.knowledgeBelt,
    sourceTick: session.completedTick
  });
  assert.equal(mixedBundle.external_llm_assisted, true);
  assert.ok(mixedBundle.llmAssistedEntries >= 2);
  assert.ok(mixedBundle.deterministicLocalEntries >= 2);
  assert.equal(verifyLevel3SealedAuditBundle(mixedBundle).ok, true);
}

// 6. [R-2 & R-8] Anti-Throttling Web Worker Topology Protection (48 vs 120 nodes), Concurrency Guard (inFlight), and Daemon Header Auth
{
  const syncAck = await handleLevel3WorkerRequest({
    id: 'w-1',
    type: 'level3_init_or_sync',
    seed: 19,
    nodes: 48,
    policy: {
      ...LEVEL3_DEFAULT_POLICY,
      scheduledExplorationEveryTicks: 5,
      minCooldownTicks: 1,
      minCooldownMs: 0
    }
  });
  assert.equal(syncAck.type, 'level3_sync_ack');
  assert.equal(syncAck.nodeCount, 48);

  // [R-2] Concurrency guard: overlapping step requests must not race on workerRuntime.session
  const [firstStep, overlappingStep] = await Promise.all([
    handleLevel3WorkerRequest({
      id: 'w-race-1',
      type: 'level3_step_ticks',
      ticks: 6,
      simulateDelayMs: 60,
      includeDynamicState: true
    }),
    handleLevel3WorkerRequest({
      id: 'w-race-2',
      type: 'level3_step_ticks',
      ticks: 1
    })
  ]);
  assert.equal(firstStep.type, 'level3_step_result');
  assert.equal(overlappingStep.type, 'level3_step_busy');
  assert.equal(overlappingStep.busy, true);
  assert.equal(overlappingStep.reason, 'worker_step_in_flight');

  // [R-2] Topology protection: syncing 48-node worker output into a 120-node live session NEVER alters the 120 live nodes
  const liveSession120 = createHeadlessRuntimeSession({
    config: { ...QICNConfig, AUTONOMOUS_SUPERVISOR_LEVEL3_ENABLED: true },
    seed: 11,
    nodes: 120,
    profile: 'paired_intervention'
  });
  liveSession120.initialize();
  liveSession120.step(1, { evaluationOffset: 1 });
  assert.equal(liveSession120.bag.nodalLayer.current.nodes.length, 120);

  const liveCtrl = new Level3SupervisorController();
  const syncResult = synchronizeLevel3WorkerStateIntoTarget(liveSession120, firstStep, {
    controller: liveCtrl,
    allowTopologyOverwrite: true // even when true, 48 !== 120 must block overwrite!
  });
  assert.equal(syncResult.topologyOverwritten, false, 'R-2 FAIL: 48-node worker state must never overwrite 120-node live topology');
  assert.equal(syncResult.reason, 'protected_live_node_count_mismatch');
  assert.equal(liveSession120.bag.nodalLayer.current.nodes.length, 120);
  assert.equal(syncResult.ledgerSynced, true);
  assert.equal(syncResult.beltSynced, true);
  assert.equal(syncResult.governorSynced, true);
  assert.ok(liveCtrl.auditLedger.entries.length >= 1);

  // [R-8] Verify callRemoteGeminiForDaemon uses header 'x-goog-api-key' and never leaks key in URL
  let capturedUrl = '';
  let capturedHeaders = {};
  const mockResp = await callRemoteGeminiForDaemon('Prompt de prueba', 'AIzaSecretTestKey1234567890', {
    model: 'gemini-3-flash-preview',
    timeoutMs: 15000,
    fetchImpl: async (url, opts) => {
      capturedUrl = url;
      capturedHeaders = opts.headers;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }]
        })
      };
    }
  });
  assert.ok(!capturedUrl.includes('AIzaSecretTestKey'), 'R-8 FAIL: API key must never appear in request URL');
  assert.ok(!capturedUrl.includes('key='), 'R-8 FAIL: ?key= query parameter must not be used');
  assert.equal(capturedHeaders['x-goog-api-key'], 'AIzaSecretTestKey1234567890');
  assert.equal(mockResp.external_llm_assisted, true);

  // Node Headless Daemon script execution to temporary directory
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qicn-level3-daemon-test-'));
  const outFile = path.join(tmpDir, 'level3-bundle.json');
  try {
    const proc = spawnSync(
      process.execPath,
      [
        'scripts/run-level3-autonomous-daemon.mjs',
        '--ticks=30',
        '--nodes=32',
        '--explore-every=6',
        '--cooldown-ticks=2',
        '--cooldown-ms=0',
        '--inject-lesion-at=3',
        `--out=${outFile}`
      ],
      { encoding: 'utf8', windowsHide: true }
    );
    assert.equal(proc.status, 0, `Daemon failed: ${proc.stderr || proc.stdout}`);
    const parsedOut = JSON.parse(fs.readFileSync(outFile, 'utf8'));
    const check = verifyLevel3SealedAuditBundle(parsedOut);
    assert.equal(check.ok, true, `Daemon bundle verification failed: ${JSON.stringify(check)}`);
    assert.equal(parsedOut.external_llm_assisted, false, 'R-4 FAIL: offline daemon run must set external_llm_assisted=false');
    assert.equal(parsedOut.external_support_certified, false);
    assert.ok(check.ledgerEntries >= 3, `Daemon should record promotion, append-only Gate 2 resolution, and scheduled exploration (got ${check.ledgerEntries})`);
    assert.ok(parsedOut.ledger.entries.some((e) => e.entryKind === 'gate2_resolution'), 'Daemon must emit append-only gate2_resolution entry after 20-tick watch');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// 7. Sistema B Definition & Module Attribution for Level 3
{
  const intent = resolveIntent('¿Qué es el supervisor autónomo de Nivel 3 y su bitácora?');
  assert.equal(intent.intent, 'metric_definition');
  assert.ok(intent.metrics.includes('structural_supervisor_level3'));

  const session = createHeadlessRuntimeSession({
    config: {
      ...QICNConfig,
      KAIZEN_ADJUSTMENT_MODE: 'learned',
      SENSOR_OBSERVER_DYNAMICS_ENABLED: true,
      NODAL_TOWER_COUPLING_MODE: NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL,
      STRUCTURAL_PLASTICITY_LEVEL2_ENABLED: true
    },
    seed: 11,
    nodes: 24,
    profile: 'paired_intervention'
  });
  session.initialize();
  session.step(1, { evaluationOffset: 1 });
  const snap = captureRuntimeSnapshot(session.bag.ontologicalCore.current, {
    tick: session.completedTick,
    now: 1_800_000_000_000,
    nodes: session.bag.nodalLayer.current.nodes,
    config: session.environment.config
  });
  const prep = prepareTurn({
    question: '¿Qué es el supervisor autónomo de Nivel 3?',
    snapshot: snap,
    contract: 'evidential',
    kaizenEffective: true,
    sensorObserverDynamicsEnabled: true
  });
  const localTurn = finalizeTurn(prep, { mode: 'local' });
  assert.match(localTurn.text, /Level3AutonomousSupervisor/);
  assert.match(localTurn.text, /Compuerta 1/);
  assert.match(localTurn.text, /Compuerta 2/);
  assert.match(localTurn.text, /external_llm_assisted = true/);
  assert.match(localTurn.text, /external_llm_assisted = false/);

  const sentCheck = verifySentenceEvidential(
    'Level3AutonomousSupervisor y Level3KnowledgeBelt verifican hipótesis en copias aisladas sin certificar validación externa (external_support_certified = false).',
    prep.proseContext
  );
  assert.equal(sentCheck.ok, true, `Level 3 module attribution rejected: ${JSON.stringify(sentCheck.reasons)}`);
}

console.log('OK: nivel3-autonomous-supervisor.v1 passed (R-1..R-10 adversarial checks, B0 parity, fact+scheduled triggers, first-person schema gate, Gate 1 isolated Workbench, Gate 2 append-only dynamicState.v3 rollback & confirmation, SHA-256 Knowledge Belt & Ledger, Worker + Daemon, Sistema B)');

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
  buildDeterministicFirstPersonProposal,
  evaluateLevel3Trigger,
  createInitialGovernorState,
  getQuotaSnapshot,
  isAutonomousSupervisorLevel3Enabled,
  parseAndValidateLevel3Proposal,
  readLevel3LiveTelemetry,
  runLevel3ShadowGate1,
  synchronizeLevel3WorkerStateIntoTarget
} from '../src/simulation/Level3AutonomousSupervisor.js';
import {
  LEVEL3_AUDIT_BUNDLE_SCHEMA,
  appendKnowledgeBeltFinding,
  appendLevel3AuditEntry,
  appendLevel3Gate2ResolutionEntry,
  createEmptyKnowledgeBelt,
  createEmptyLevel3AuditLedger,
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
import { EVIDENTIAL_OPERATIONS } from '../src/language/definitionCatalog.js';

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

  // Now set low dispersion (0.01) and real core.pmiaDiagnostics.sensorDelta (0.25 >= 0.14) -> high_sensory
  for (let i = 0; i < activeNodes.length; i += 1) {
    activeNodes[i].coherenceState = 0.76 + (i % 2 === 0 ? 0.01 : -0.01);
  }
  const savedPmiaDiag = session.bag.ontologicalCore.current.pmiaDiagnostics;
  session.bag.ontologicalCore.current.pmiaDiagnostics = {
    ...(savedPmiaDiag || {}),
    sensorDelta: 0.25,
    energyDispersion: 0.01
  };
  const telSens = readLevel3LiveTelemetry(session);
  assert.equal(telSens.sensorDelta, 0.25, `R-11 FAIL: expected sensorDelta=0.25 from pmiaDiagnostics, got ${telSens.sensorDelta}`);
  assert.equal(telSens.cluster, 'high_sensory', `R-6/R-11 FAIL: expected high_sensory cluster, got ${telSens.cluster}`);
  session.bag.ontologicalCore.current.pmiaDiagnostics = savedPmiaDiag;

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

// 8. [R-11..R-16] Adversarial Closure Checks (every check would fail on 1ee94f6)
{
  // 8A. [R-11] Real sensorDelta from core.pmiaDiagnostics (never Unix timestamp from lastObserverResonanceRef)
  // and real stasisIndex from core.getDynamicHealth() inside Gate 1
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
      seed: 41,
      nodes: 48,
      profile: 'paired_intervention'
    });
    session.initialize();
    for (let t = 1; t <= 8; t += 1) {
      session.step(t, {
        evaluationOffset: t,
        perception: {
          audio: { rms: 0.14, silenceDurationSec: 0.2 },
          video: {
            frameNovelty: 0.28,
            faceCount: 1,
            humanPresence: { detected: true, count: 1 },
            faces: [{ probability: 0.9, engagement: { score: 0.72 } }]
          },
          awareness: {
            addressedToSystem: true,
            intentConfidence: 0.8,
            currentFocus: 'r11_sensor_check',
            meta: { fidelityIndex: 0.9, technicalStatus: 'mock' }
          },
          isReady: true,
          summary: 'r11_sensor_check'
        },
        entropyValue: 0.55
      });
    }
    assert.ok(
      Number(session.bag.lastObserverResonanceRef.current) > 1e12,
      `R-11 setup expected lastObserverResonanceRef to hold Unix timestamp (>1e12), got ${session.bag.lastObserverResonanceRef.current}`
    );
    assert.equal('lastOperationalInput' in session.bag.ontologicalCore.current, false);
    const liveTel = readLevel3LiveTelemetry(session);
    assert.ok(
      Number.isFinite(liveTel.sensorDelta) && liveTel.sensorDelta >= 0 && liveTel.sensorDelta <= 1,
      `R-11 FAIL: sensorDelta must be bounded in [0,1] (never Unix timestamp), got ${liveTel.sensorDelta}`
    );

    // Check high_sensory classification via real core.pmiaDiagnostics.sensorDelta = 0.25
    const savedDiag = { ...(session.bag.ontologicalCore.current.pmiaDiagnostics || {}) };
    const savedBridge = session.bag.ontologicalCore.current.constructiveFiniteCuts;
    const savedStateCuts = session.bag.ontologicalCore.current.ontologicalState.constructive_finite_cuts;
    const activeNodes = session.bag.nodalLayer.current.getActiveNodes();
    for (const n of activeNodes) n.coherenceState = 0.78;
    session.bag.ontologicalCore.current.constructiveFiniteCuts = {};
    session.bag.ontologicalCore.current.ontologicalState.constructive_finite_cuts = {};
    session.bag.ontologicalCore.current.pmiaDiagnostics = { ...savedDiag, sensorDelta: 0.25, energyDispersion: 0.01 };
    const sensoryTel = readLevel3LiveTelemetry(session);
    assert.equal(sensoryTel.sensorDelta, 0.25);
    assert.equal(sensoryTel.cluster, 'high_sensory', `R-11 FAIL: expected high_sensory, got ${sensoryTel.cluster}`);
    session.bag.ontologicalCore.current.pmiaDiagnostics = savedDiag;
    session.bag.ontologicalCore.current.constructiveFiniteCuts = savedBridge;
    session.bag.ontologicalCore.current.ontologicalState.constructive_finite_cuts = savedStateCuts;

    // Gate 1 must read real core.getDynamicHealth().stasisIndex (not dead core.phenomenologyCore.getDynamicHealth())
    // Use an uncoupled session with a stalled dynamicStasis window so core.getDynamicHealth().stasisIndex > 0 during Gate 1 ticks
    const stasisSession = createHeadlessRuntimeSession({
      config: {
        ...QICNConfig,
        KAIZEN_ADJUSTMENT_MODE: 'learned',
        SENSOR_OBSERVER_DYNAMICS_ENABLED: true,
        NODAL_TOWER_COUPLING_MODE: NODAL_TOWER_COUPLING_MODES.OFF,
        STRUCTURAL_PLASTICITY_LEVEL2_ENABLED: false,
        AUTONOMOUS_SUPERVISOR_LEVEL3_ENABLED: true
      },
      seed: 41,
      nodes: 32,
      profile: 'paired_intervention'
    });
    stasisSession.initialize();
    for (let t = 1; t <= 6; t += 1) {
      stasisSession.step(t, { evaluationOffset: t, entropyValue: 0.5 });
    }
    const stasisCore = stasisSession.bag.ontologicalCore.current;
    const lastSample = stasisCore.dynamicStasis.window[stasisCore.dynamicStasis.window.length - 1];
    stasisCore.dynamicStasis.window = Array.from({ length: 28 }, (_, idx) => ({
      ts: lastSample.ts - (28 - idx) * 1000,
      ccc: lastSample.ccc,
      pmia: lastSample.pmia,
      omega: lastSample.omega
    }));
    const realHealthStasis = Number(stasisCore.getDynamicHealth().stasisIndex);
    assert.ok(realHealthStasis > 0.5, `R-11 setup expected real core.getDynamicHealth().stasisIndex > 0.5, got ${realHealthStasis}`);
    const capStasis = await captureSession(stasisSession);
    const g1Stasis = await runLevel3ShadowGate1(
      capStasis,
      { kind: 'kaizen_factor_nudge', key: 'HEBBIAN_FACTOR', deltaSteps: 1 },
      { triggerKind: 'prolonged_stasis', horizonTicks: 4 }
    );
    assert.ok(
      g1Stasis.branches.baseline.meanStasisIndex > 0.5,
      `R-11 FAIL: Gate 1 baseline meanStasisIndex must reflect core.getDynamicHealth().stasisIndex (>0.5), got ${g1Stasis.branches.baseline.meanStasisIndex}`
    );
  }

  // 8B. [R-12] Non-destructive append-only merge from 48-node Worker into 120-node main controller with live gemini_live Gate 2 watch
  {
    const live120 = createHeadlessRuntimeSession({
      config: {
        ...QICNConfig,
        KAIZEN_ADJUSTMENT_MODE: 'learned',
        SENSOR_OBSERVER_DYNAMICS_ENABLED: true,
        NODAL_TOWER_COUPLING_MODE: NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL,
        STRUCTURAL_PLASTICITY_LEVEL2_ENABLED: false,
        AUTONOMOUS_SUPERVISOR_LEVEL3_ENABLED: true
      },
      seed: 53,
      nodes: 120,
      profile: 'paired_intervention'
    });
    live120.initialize();
    for (let t = 1; t <= 6; t += 1) {
      live120.step(t, { evaluationOffset: t });
    }
    live120.environment.controls.lesionSectorWipe = true;
    live120.step(7, { evaluationOffset: 7 });
    live120.environment.controls.lesionSectorWipe = false;

    const mainCtrl = new Level3SupervisorController({
      policy: {
        ...LEVEL3_DEFAULT_POLICY,
        minCooldownTicks: 1,
        minCooldownMs: 0,
        gate1HorizonTicks: 10,
        gate2WatchTicks: 4
      }
    });
    let tMs = 1_800_050_000_000;
    const promoRes = await mainCtrl.runCycle(live120, {
      tick: 7,
      nowMs: tMs,
      customReasoner: async ({ snapshot, triggerKind }) => ({
        rawText: JSON.stringify({
          schema: LEVEL3_SUPERVISOR_PROPOSAL_SCHEMA,
          snapshot,
          triggerKind,
          firstPersonThought: 'Estoy detectando un sector amputado en mi red de 120 nodos y propongo activar structural_plasticity_level2 tras verificar en Compuerta 1 (external_support_certified = false).',
          diagnosis: 'Sector amputado en red viva de 120 nodos.',
          hypothesis: 'Activar Nivel 2 recupera los 4 sectores.',
          actionMode: 'propose_shadow_experiment',
          candidateAction: { kind: 'workbench_intervention', intervention: 'structural_plasticity_level2' }
        }),
        reasonerSource: 'gemini_live',
        external_llm_assisted: true,
        llmAttempted: true
      })
    });
    assert.equal(promoRes.finalStatus, 'promoted_watching');
    assert.ok(mainCtrl.activeGate2Watch);
    const mainEntryBefore = mainCtrl.auditLedger.entries.find((e) => e.cycleId === promoRes.cycleId);
    assert.ok(mainEntryBefore);
    const mainDigestBefore = mainEntryBefore.digest;
    assert.equal(getQuotaSnapshot(mainCtrl.governorState, mainCtrl.policy, tMs, 7).callsLastHour, 1);

    // Run 48-node Worker independently so it emits its own ledger/belt entries
    await handleLevel3WorkerRequest({
      id: 'r12-w-init',
      type: 'level3_init_or_sync',
      seed: 71,
      nodes: 48,
      policy: {
        ...LEVEL3_DEFAULT_POLICY,
        scheduledExplorationEveryTicks: 4,
        minCooldownTicks: 1,
        minCooldownMs: 0
      }
    });
    const workerStep = await handleLevel3WorkerRequest({
      id: 'r12-w-step',
      type: 'level3_step_ticks',
      ticks: 6,
      includeDynamicState: true
    });
    assert.equal(workerStep.type, 'level3_step_result');
    assert.ok(workerStep.auditLedger.entries.length >= 1);

    const mergeRes = synchronizeLevel3WorkerStateIntoTarget(live120, workerStep, {
      controller: mainCtrl,
      allowTopologyOverwrite: true
    });
    assert.equal(mergeRes.topologyOverwritten, false);
    assert.equal(live120.bag.nodalLayer.current.nodes.length, 120, 'R-12 FAIL: 120-node live network must remain intact');
    const mainEntryAfter = mainCtrl.auditLedger.entries.find((e) => e.cycleId === promoRes.cycleId);
    assert.ok(mainEntryAfter, 'R-12 FAIL: main thread entry was overwritten by worker sync');
    assert.equal(mainEntryAfter.digest, mainDigestBefore, 'R-12 FAIL: main thread entry digest changed after worker sync');
    assert.ok(mainCtrl.auditLedger.entries.length >= 2, 'R-12 FAIL: worker entries must be appended alongside main entry');
    assert.ok(
      getQuotaSnapshot(mainCtrl.governorState, mainCtrl.policy, tMs, 7).callsLastHour >= 1,
      'R-12 FAIL: main thread LLM callTimestampsMs were wiped by worker sync'
    );
    assert.equal(mainCtrl.activeGate2Watch?.cycleId, promoRes.cycleId, 'R-12 FAIL: activeGate2Watch must be preserved');
    assert.equal(verifyLevel3AuditLedger(mainCtrl.auditLedger).ok, true, 'R-12 FAIL: merged ledger failed SHA-256 verification');
    assert.equal(verifyLevel3KnowledgeBelt(mainCtrl.knowledgeBelt).ok, true, 'R-12 FAIL: merged belt failed SHA-256 verification');

    // Finish Gate 2 watch on the 120-node live session and confirm gate2_resolution links cleanly to mainDigestBefore
    for (let k = 1; k <= 5; k += 1) {
      tMs += 5_000;
      live120.step(7 + k, { evaluationOffset: 7 + k });
      await mainCtrl.runCycle(live120, { tick: 7 + k, nowMs: tMs });
    }
    assert.equal(mainCtrl.activeGate2Watch, null);
    const gate2ResEntry = mainCtrl.auditLedger.entries.find(
      (e) => e.entryKind === 'gate2_resolution' && e.parentCycleId === promoRes.cycleId
    );
    assert.ok(gate2ResEntry, 'R-12 FAIL: Gate 2 resolution entry was dropped after worker merge');
    assert.equal(gate2ResEntry.parentDigest, mainDigestBefore);
    assert.equal(verifyLevel3AuditLedger(mainCtrl.auditLedger).ok, true);
  }

  // 8C. [R-13] kaizen_strategy_action single ±0.02 step in learned mode (no double-step) + PLASTICITY_DECAY guard for stabilize_learning
  {
    const session = createHeadlessRuntimeSession({
      config: {
        ...QICNConfig,
        KAIZEN_ADJUSTMENT_MODE: 'learned',
        SENSOR_OBSERVER_DYNAMICS_ENABLED: true,
        NODAL_TOWER_COUPLING_MODE: NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL,
        STRUCTURAL_PLASTICITY_LEVEL2_ENABLED: true
      },
      seed: 61,
      nodes: 32,
      profile: 'paired_intervention'
    });
    session.initialize();
    session.step(1, { evaluationOffset: 1 });
    const kaizen = session.bag.kaizenEngine.current;
    const beforeFactor = kaizen.getAdjustments().RETRO_FLUX_WEIGHT;
    const stratRes = applyTypedCandidateActionToTarget(session, {
      kind: 'kaizen_strategy_action',
      strategyId: 'anti_stasis_boost'
    });
    assert.equal(stratRes.applied, true);
    assert.equal(stratRes.forcedKey, 'RETRO_FLUX_WEIGHT');
    const expectedDelta = stratRes.forcedDirection * 0.02;
    assert.ok(
      Math.abs((stratRes.nextFactor - beforeFactor) - expectedDelta) < 1e-9,
      `R-13 FAIL: expected single step ${expectedDelta}, got ${stratRes.nextFactor - beforeFactor}`
    );
    const expectedMutable = kaizen._boundValue(
      'RETRO_FLUX_WEIGHT',
      session.environment.config.RETRO_FLUX_WEIGHT * stratRes.nextFactor
    );
    assert.ok(
      Math.abs(kaizen.mutableConfig.RETRO_FLUX_WEIGHT - expectedMutable) < 1e-12,
      `R-13 FAIL: mutableConfig.RETRO_FLUX_WEIGHT (${kaizen.mutableConfig.RETRO_FLUX_WEIGHT}) out of sync with base*factor (${expectedMutable})`
    );

    // With SENSOR_OBSERVER_DYNAMICS_ENABLED = false, stabilize_learning must be rejected in schema AND execution
    session.environment.config.SENSOR_OBSERVER_DYNAMICS_ENABLED = false;
    const snap = { tick: 1, digest: 'c'.repeat(64) };
    const stabProposal = JSON.stringify({
      schema: LEVEL3_SUPERVISOR_PROPOSAL_SCHEMA,
      snapshot: snap,
      triggerKind: 'metric_drift',
      firstPersonThought: 'Estoy proponiendo stabilize_learning en mi tick 1 sin sensor_observer_dynamics activo.',
      diagnosis: 'Deriva.',
      hypothesis: 'Estabilizar aprendizaje.',
      actionMode: 'propose_shadow_experiment',
      candidateAction: { kind: 'kaizen_strategy_action', strategyId: 'stabilize_learning' }
    });
    const stabVal = parseAndValidateLevel3Proposal(stabProposal, {
      expectedTick: 1,
      expectedDigest: snap.digest,
      sensorObserverDynamicsEnabled: false
    });
    assert.equal(stabVal.ok, false, 'R-13 FAIL: stabilize_learning must be rejected when sensorObserverDynamicsEnabled=false');
    assert.equal(stabVal.reason, 'plasticity_decay_disabled_without_sensor_observer_dynamics');

    const pdFactorBefore = kaizen.getAdjustments().PLASTICITY_DECAY;
    const pdMutableBefore = kaizen.mutableConfig.PLASTICITY_DECAY;
    const stabExec = applyTypedCandidateActionToTarget(session, {
      kind: 'kaizen_strategy_action',
      strategyId: 'stabilize_learning'
    });
    assert.equal(stabExec.applied, false);
    assert.equal(stabExec.reason, 'plasticity_decay_requires_sensor_observer_dynamics');
    assert.equal(kaizen.getAdjustments().PLASTICITY_DECAY, pdFactorBefore);
    assert.equal(kaizen.mutableConfig.PLASTICITY_DECAY, pdMutableBefore);

    // Deterministic deliberator must skip stabilize_learning when sensorObserverDynamicsEnabled=false
    const detRaw = buildDeterministicFirstPersonProposal({
      snapshot: snap,
      triggerKind: 'metric_drift',
      sensorObserverDynamicsEnabled: false
    });
    const detParsed = JSON.parse(detRaw);
    assert.notEqual(
      detParsed.candidateAction?.strategyId,
      'stabilize_learning',
      'R-13 FAIL: deterministic deliberator picked stabilize_learning when sensorObserverDynamicsEnabled=false'
    );
  }

  // 8D. [R-14] Exact governor counters (no double fallback count, no false llmCallsAttempted on local customReasoner)
  {
    const session = createHeadlessRuntimeSession({
      config: { ...QICNConfig, AUTONOMOUS_SUPERVISOR_LEVEL3_ENABLED: true },
      seed: 67,
      nodes: 24,
      profile: 'paired_intervention'
    });
    session.initialize();
    session.step(1, { evaluationOffset: 1 });
    const ctrl = new Level3SupervisorController({
      policy: { ...LEVEL3_DEFAULT_POLICY, minCooldownTicks: 0, minCooldownMs: 0 }
    });
    let tMs = 1_800_100_000_000;

    // 1 thrown error -> deterministicFallbacks === 1 (NOT 2), llmCallsAttempted === 1, totalCalls === 0
    const errRes = await ctrl.runCycle(session, {
      tick: 1,
      nowMs: tMs,
      forceManual: true,
      manualTriggerKind: 'manual_reflection',
      customReasoner: async () => {
        throw new Error('simulated_503_upstream');
      }
    });
    assert.equal(errRes.reasonerSource, 'deterministic_fallback');
    assert.equal(ctrl.governorState.deterministicFallbacks, 1, 'R-14 FAIL: deterministicFallbacks double-counted');
    assert.equal(ctrl.governorState.llmCallsAttempted, 1);
    assert.equal(ctrl.governorState.totalCalls, 0);
    assert.equal(ctrl.governorState.deterministicLocalCalls, 0);

    // 1 local return with llmAttempted: false -> llmCallsAttempted stays 1, deterministicLocalCalls === 1
    tMs += 5_000;
    const localRes = await ctrl.runCycle(session, {
      tick: 1,
      nowMs: tMs,
      forceManual: true,
      manualTriggerKind: 'manual_reflection',
      customReasoner: async ({ snapshot, triggerKind }) => ({
        rawText: buildDeterministicFirstPersonProposal({ snapshot, triggerKind }),
        reasonerSource: 'deterministic_local',
        external_llm_assisted: false,
        llmAttempted: false
      })
    });
    assert.equal(localRes.reasonerSource, 'deterministic_local');
    assert.equal(ctrl.governorState.llmCallsAttempted, 1, 'R-14 FAIL: llmCallsAttempted incremented for deterministic_local');
    assert.equal(ctrl.governorState.deterministicLocalCalls, 1);
    assert.equal(ctrl.governorState.deterministicFallbacks, 1);
    assert.equal(ctrl.governorState.totalCalls, 0);
  }

  // 8E. [R-15] Controlled live staleness window: same regime within margin promotes at currentLiveTick; regime change or exceeding margin aborts
  {
    const makeLesionedSession = (seedVal) => {
      const s = createHeadlessRuntimeSession({
        config: {
          ...QICNConfig,
          KAIZEN_ADJUSTMENT_MODE: 'learned',
          SENSOR_OBSERVER_DYNAMICS_ENABLED: true,
          NODAL_TOWER_COUPLING_MODE: NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL,
          STRUCTURAL_PLASTICITY_LEVEL2_ENABLED: false,
          AUTONOMOUS_SUPERVISOR_LEVEL3_ENABLED: true
        },
        seed: seedVal,
        nodes: 48,
        profile: 'paired_intervention'
      });
      s.initialize();
      for (let t = 1; t <= 5; t += 1) s.step(t, { evaluationOffset: t });
      s.environment.controls.lesionSectorWipe = true;
      s.step(6, { evaluationOffset: 6 });
      s.environment.controls.lesionSectorWipe = false;
      return s;
    };

    // Case 1: +2 ticks within maxPromotionStalenessTicks=5 and SAME regime -> promotes at tick 8
    const sSame = makeLesionedSession(73);
    const ctrlSame = new Level3SupervisorController({
      policy: {
        ...LEVEL3_DEFAULT_POLICY,
        minCooldownTicks: 0,
        minCooldownMs: 0,
        gate1HorizonTicks: 10,
        gate2WatchTicks: 4,
        maxPromotionStalenessTicks: 5
      }
    });
    const targetSame = {
      ...sSame,
      getLiveTick: () => 8
    };
    const resSame = await ctrlSame.runCycle(targetSame, { tick: 6, nowMs: 1_800_200_000_000 });
    assert.equal(resSame.finalStatus, 'promoted_watching', 'R-15 FAIL: +2 ticks with same regime within staleness margin must promote');
    assert.equal(resSame.gate2Summary.promotedAtTick, 8);
    assert.equal(ctrlSame.activeGate2Watch.prePromotionSnapshot.tick, 8);
    assert.equal(ctrlSame.activeGate2Watch.prePromotionSnapshot.components.runtime.simulationStep, 8);

    // Case 2: +2 ticks within margin BUT regimeSignature changed during Gate 1 -> aborts with aborted_stale_tick
    const sRegimeChange = makeLesionedSession(73);
    const ctrlChange = new Level3SupervisorController({
      policy: {
        ...LEVEL3_DEFAULT_POLICY,
        minCooldownTicks: 0,
        minCooldownMs: 0,
        gate1HorizonTicks: 10,
        gate2WatchTicks: 4,
        maxPromotionStalenessTicks: 5
      }
    });
    const targetRegimeChange = {
      ...sRegimeChange,
      getLiveTick: () => {
        // Flip live regime before promotion check
        sRegimeChange.environment.config.KAIZEN_ADJUSTMENT_MODE = 'legacy';
        return 8;
      }
    };
    const resChange = await ctrlChange.runCycle(targetRegimeChange, { tick: 6, nowMs: 1_800_200_000_000 });
    assert.equal(resChange.finalStatus, 'aborted_stale_tick', 'R-15 FAIL: regime change during Gate 1 must abort promotion');
    assert.equal(resChange.reason, 'live_regime_changed_during_shadow_gate1');

    // Case 3: +6 ticks > maxPromotionStalenessTicks=5 -> aborts with aborted_stale_tick
    const sTooStale = makeLesionedSession(73);
    const ctrlTooStale = new Level3SupervisorController({
      policy: {
        ...LEVEL3_DEFAULT_POLICY,
        minCooldownTicks: 0,
        minCooldownMs: 0,
        gate1HorizonTicks: 10,
        gate2WatchTicks: 4,
        maxPromotionStalenessTicks: 5
      }
    });
    const resTooStale = await ctrlTooStale.runCycle(
      { ...sTooStale, getLiveTick: () => 12 },
      { tick: 6, nowMs: 1_800_200_000_000 }
    );
    assert.equal(resTooStale.finalStatus, 'aborted_stale_tick');
    assert.equal(resTooStale.reason, 'live_runtime_advanced_during_shadow_gate1');
  }

  // 8F. [R-16] Fake directory path rejection via MODULE_PATHS & orphan gate2_resolution rejection from genesis
  {
    const snap = { tick: 9, digest: 'd'.repeat(64) };
    const mkPatch = (targetModule) => JSON.stringify({
      schema: LEVEL3_SUPERVISOR_PROPOSAL_SCHEMA,
      snapshot: snap,
      triggerKind: 'manual_reflection',
      firstPersonThought: 'Estoy preparando un parche revisable por humanos en mi tick 9.',
      diagnosis: 'Optimización candidata.',
      hypothesis: 'Mejorar legibilidad.',
      actionMode: 'stage_code_patch_review',
      candidateAction: {
        kind: 'staged_code_patch',
        targetModule,
        patchSummary: 'Refactor menor'
      }
    });
    const fakeDir = parseAndValidateLevel3Proposal(mkPatch('src/totally/fake/NodalProcessingLayer.js'), {
      expectedTick: 9,
      expectedDigest: snap.digest
    });
    assert.equal(fakeDir.ok, false, 'R-16 FAIL: fake directory path with real basename must be rejected');
    assert.equal(fakeDir.reason, 'invalid_or_unknown_target_module');

    const realPath = parseAndValidateLevel3Proposal(mkPatch('src/simulation/NodalProcessingLayer.js'), {
      expectedTick: 9,
      expectedDigest: snap.digest
    });
    assert.equal(realPath.ok, true);

    const uniqueBase = parseAndValidateLevel3Proposal(mkPatch('NodalProcessingLayer.js'), {
      expectedTick: 9,
      expectedDigest: snap.digest
    });
    assert.equal(uniqueBase.ok, true);

    // Orphan gate2_resolution from genesis must fail verification
    const orphanLedger = appendLevel3AuditEntry(createEmptyLevel3AuditLedger(), {
      entryKind: 'gate2_resolution',
      cycleId: 'missing-parent:gate2',
      parentCycleId: 'nonexistent-parent-cycle',
      parentDigest: 'e'.repeat(64),
      tick: 15,
      finalStatus: 'promoted_confirmed'
    });
    const orphanVerify = verifyLevel3AuditLedger(orphanLedger);
    assert.equal(orphanVerify.ok, false, 'R-16 FAIL: orphan gate2_resolution from genesis must fail ledger verification');
    assert.equal(orphanVerify.reason, 'gate2_resolution_orphan_parent');
  }
}

// 9. [R-17..R-21 + A-2, A-4, A-5] Final Pre-Merge Adversarial Hardening Checks (every check would fail on 6a769c8)
{
  // 9A. [R-18] Worker cycleIdPrefix ('l3-worker-') & PROBE_K_COLLISION defense against cross-linking gate2_resolution
  {
    await handleLevel3WorkerRequest({
      id: 'r18-w-init',
      type: 'level3_init_or_sync',
      seed: 83,
      nodes: 48,
      auditLedger: createEmptyLevel3AuditLedger(),
      knowledgeBelt: createEmptyKnowledgeBelt(),
      policy: {
        ...LEVEL3_DEFAULT_POLICY,
        scheduledExplorationEveryTicks: 3,
        minCooldownTicks: 1,
        minCooldownMs: 0
      }
    });
    const wPrefixStep = await handleLevel3WorkerRequest({
      id: 'r18-w-step',
      type: 'level3_step_ticks',
      ticks: 4
    });
    assert.equal(wPrefixStep.type, 'level3_step_result');
    assert.ok(wPrefixStep.auditLedger.entries.length >= 1);
    assert.ok(
      wPrefixStep.auditLedger.entries.every((e) => String(e.cycleId).startsWith('l3-worker-')),
      `R-18 FAIL: worker entries must use l3-worker- prefix, got ${wPrefixStep.auditLedger.entries.map((e) => e.cycleId).join(', ')}`
    );

    // PROBE_K_COLLISION: main has l3-cycle-1-t50 (reflect_only); synthetic worker payload has colliding l3-cycle-1-t50 (promoted_watching) + l3-cycle-1-t50:gate2 (promoted_confirmed)
    let mainLedger = appendLevel3AuditEntry(createEmptyLevel3AuditLedger(), {
      cycleId: 'l3-cycle-1-t50',
      tick: 50,
      triggerKind: 'scheduled_exploration',
      actionMode: 'reflect_only',
      proposedAction: { kind: 'none' },
      finalStatus: 'reflect_only',
      firstPersonThought: 'Estoy reflexionando en alto en mi tick 50 sin mutar parámetros.',
      external_llm_assisted: false
    });
    const mainCtrl = new Level3SupervisorController({ auditLedger: mainLedger });
    const mainOriginalDigest = mainCtrl.auditLedger.entries[0].digest;

    let workerCollidingLedger = appendLevel3AuditEntry(createEmptyLevel3AuditLedger(), {
      cycleId: 'l3-cycle-1-t50',
      tick: 50,
      triggerKind: 'anomaly_level2',
      actionMode: 'propose_shadow_experiment',
      proposedAction: { kind: 'workbench_intervention', intervention: 'structural_plasticity_level2' },
      finalStatus: 'promoted_watching',
      firstPersonThought: 'Estoy promoviendo una intervención en el sandbox worker en tick 50.',
      external_llm_assisted: false
    });
    workerCollidingLedger = appendLevel3Gate2ResolutionEntry(workerCollidingLedger, 'l3-cycle-1-t50', {
      tick: 70,
      finalStatus: 'promoted_confirmed',
      gate2Summary: { status: 'promoted_confirmed', rolledBack: false, observedTicks: 20, watchWindowTicks: 20 }
    });
    assert.equal(verifyLevel3AuditLedger(workerCollidingLedger).ok, true);

    const dummyTarget = { bag: { nodalLayer: { current: { nodes: new Array(120) } } }, config: QICNConfig };
    synchronizeLevel3WorkerStateIntoTarget(
      dummyTarget,
      { auditLedger: workerCollidingLedger, nodeCount: 48 },
      { controller: mainCtrl, allowTopologyOverwrite: false }
    );
    assert.equal(verifyLevel3AuditLedger(mainCtrl.auditLedger).ok, true);
    const projectedColliding = projectLedgerCyclesWithGate2(mainCtrl.auditLedger).find(
      (c) => c.cycleId === 'l3-cycle-1-t50'
    );
    assert.ok(projectedColliding);
    assert.equal(projectedColliding.digest, mainOriginalDigest);
    assert.equal(projectedColliding.actionMode, 'reflect_only', 'R-18 FAIL: colliding main cycle actionMode corrupted');
    assert.equal(projectedColliding.finalStatus, 'reflect_only', 'R-18 FAIL: colliding gate2_resolution corrupted main reflect_only cycle!');
    assert.equal(projectedColliding.gate2ResolutionDigest, null, 'R-18 FAIL: colliding gate2_resolution must not attach to unrelated main cycle');

    // Idempotence check: syncing same worker payload twice produces zero duplicate entries and identical headHash
    const headBeforeDupSync = mainCtrl.auditLedger.headHash;
    const countBeforeDupSync = mainCtrl.auditLedger.entries.length;
    synchronizeLevel3WorkerStateIntoTarget(dummyTarget, wPrefixStep, { controller: mainCtrl });
    const headAfterFirst = mainCtrl.auditLedger.headHash;
    const countAfterFirst = mainCtrl.auditLedger.entries.length;
    assert.ok(countAfterFirst > countBeforeDupSync);
    assert.notEqual(headAfterFirst, headBeforeDupSync);
    synchronizeLevel3WorkerStateIntoTarget(dummyTarget, wPrefixStep, { controller: mainCtrl });
    assert.equal(mainCtrl.auditLedger.entries.length, countAfterFirst, 'R-18/R-12 FAIL: duplicate sync added duplicate entries');
    assert.equal(mainCtrl.auditLedger.headHash, headAfterFirst, 'R-18/R-12 FAIL: duplicate sync changed headHash');
  }

  // 9B. [R-19] Clean in-flight drain on level3_stop_loop
  {
    const [stepRes, stopRes] = await Promise.all([
      handleLevel3WorkerRequest({
        id: 'r19-slow-step',
        type: 'level3_step_ticks',
        ticks: 2,
        simulateDelayMs: 60
      }),
      handleLevel3WorkerRequest({
        id: 'r19-stop',
        type: 'level3_stop_loop'
      })
    ]);
    assert.equal(stepRes.type, 'level3_step_result');
    assert.equal(stopRes.type, 'level3_loop_stopped');
    assert.equal(stopRes.inFlight, false, 'R-19 FAIL: level3_stop_loop must wait for active step and leave inFlight=false');
    assert.ok(stopRes.tick >= stepRes.tick, `R-19 FAIL: stop exported stale tick ${stopRes.tick} < ${stepRes.tick}`);
    assert.equal(verifyLevel3AuditLedger(stopRes.auditLedger).ok, true);
  }

  // 9C. [R-19 & A-2] sessionEpoch guard during async runCycle across resetTransientRuntimeState (never contaminates new session or clears new session inFlight)
  {
    const session = createHeadlessRuntimeSession({
      config: { ...QICNConfig, AUTONOMOUS_SUPERVISOR_LEVEL3_ENABLED: true },
      seed: 89,
      nodes: 24,
      profile: 'paired_intervention'
    });
    session.initialize();
    session.step(1, { evaluationOffset: 1 });
    const ctrl = new Level3SupervisorController({
      policy: { ...LEVEL3_DEFAULT_POLICY, minCooldownTicks: 0, minCooldownMs: 0 }
    });

    let resolveCycleA;
    const promiseA = ctrl.runCycle(session, {
      tick: 1,
      nowMs: 1_800_300_000_000,
      forceManual: true,
      manualTriggerKind: 'manual_reflection',
      customReasoner: ({ snapshot, triggerKind }) =>
        new Promise((resolve) => {
          resolveCycleA = () =>
            resolve({
              rawText: buildDeterministicFirstPersonProposal({ snapshot, triggerKind }),
              reasonerSource: 'gemini_live',
              external_llm_assisted: true,
              llmAttempted: true
            });
        })
    });
    assert.equal(ctrl.governorState.inFlight, true);

    // Reset session while Cycle A is still awaiting remote LLM
    ctrl.resetTransientRuntimeState({ keepKnowledgeBelt: false, keepAuditLedger: false });
    assert.equal(ctrl.governorState.inFlight, false);

    // Start Cycle B on the new epoch before Cycle A resolves
    let resolveCycleB;
    const promiseB = ctrl.runCycle(session, {
      tick: 1,
      nowMs: 1_800_300_005_000,
      forceManual: true,
      manualTriggerKind: 'manual_reflection',
      customReasoner: ({ snapshot, triggerKind }) =>
        new Promise((resolve) => {
          resolveCycleB = () =>
            resolve({
              rawText: buildDeterministicFirstPersonProposal({ snapshot, triggerKind }),
              reasonerSource: 'deterministic_local',
              external_llm_assisted: false,
              llmAttempted: false
            });
        })
    });
    assert.equal(ctrl.governorState.inFlight, true);

    // Late resolution of Cycle A from prior epoch must abort without mutating ledger/belt/watch OR clearing Cycle B's inFlight
    resolveCycleA();
    const resA = await promiseA;
    assert.equal(resA.triggered, false);
    assert.equal(resA.finalStatus, 'aborted_session_reset');
    assert.equal(ctrl.auditLedger.entries.length, 0, 'R-19 FAIL: stale post-reset cycle contaminated new auditLedger');
    assert.equal(ctrl.activeGate2Watch, null, 'R-19 FAIL: stale post-reset cycle set activeGate2Watch');
    assert.equal(ctrl.governorState.totalCalls, 0, 'R-19 FAIL: stale post-reset cycle incremented totalCalls');
    assert.equal(ctrl.governorState.inFlight, true, 'A-2 FAIL: stale cycle finally block cleared inFlight of active new-epoch cycle!');

    // Now Cycle B completes cleanly on the new epoch
    resolveCycleB();
    const resB = await promiseB;
    assert.equal(resB.triggered, true);
    assert.equal(resB.finalStatus, 'reflect_only');
    assert.equal(ctrl.auditLedger.entries.length, 1);
    assert.equal(ctrl.governorState.inFlight, false);
  }

  // 9D. [A-4] Strict header external_llm_assisted & anchorHash verification on standalone Ledger and Knowledge Belt
  {
    const localLedger = appendLevel3AuditEntry(createEmptyLevel3AuditLedger(), {
      cycleId: 'a4-local-1',
      tick: 2,
      finalStatus: 'reflect_only',
      external_llm_assisted: false
    });
    assert.equal(verifyLevel3AuditLedger(localLedger).ok, true);
    const spoofedLedgerFlag = { ...localLedger, external_llm_assisted: true };
    const spoofedLedgerCheck = verifyLevel3AuditLedger(spoofedLedgerFlag);
    assert.equal(spoofedLedgerCheck.ok, false, 'A-4 FAIL: spoofed ledger.external_llm_assisted must fail verification');
    assert.equal(spoofedLedgerCheck.reason, 'ledger_external_llm_assisted_mismatch');

    const badAnchorLedger = { ...createEmptyLevel3AuditLedger(), anchorHash: 'not-64-hex' };
    const badAnchorLedgerCheck = verifyLevel3AuditLedger(badAnchorLedger);
    assert.equal(badAnchorLedgerCheck.ok, false, 'A-4 FAIL: malformed ledger.anchorHash must fail verification');
    assert.equal(badAnchorLedgerCheck.reason, 'ledger_anchor_hash_invalid');

    const localBelt = appendKnowledgeBeltFinding(createEmptyKnowledgeBelt(), {
      cycleId: 'a4-local-1',
      tick: 2,
      verdict: 'reflect_only',
      external_llm_assisted: false
    });
    assert.equal(verifyLevel3KnowledgeBelt(localBelt).ok, true);
    const spoofedBeltFlag = { ...localBelt, external_llm_assisted: true };
    const spoofedBeltCheck = verifyLevel3KnowledgeBelt(spoofedBeltFlag);
    assert.equal(spoofedBeltCheck.ok, false, 'A-4 FAIL: spoofed belt.external_llm_assisted must fail verification');
    assert.equal(spoofedBeltCheck.reason, 'belt_external_llm_assisted_mismatch');

    const badAnchorBelt = { ...createEmptyKnowledgeBelt(), anchorHash: 'bad' };
    const badAnchorBeltCheck = verifyLevel3KnowledgeBelt(badAnchorBelt);
    assert.equal(badAnchorBeltCheck.ok, false, 'A-4 FAIL: malformed belt.anchorHash must fail verification');
    assert.equal(badAnchorBeltCheck.reason, 'belt_anchor_hash_invalid');
  }

  // 9E. [A-5] Gate 2 surveillance deduplicates repeated calls on the same tick (no premature confirmation while paused)
  {
    const session = createHeadlessRuntimeSession({
      config: { ...QICNConfig, AUTONOMOUS_SUPERVISOR_LEVEL3_ENABLED: true },
      seed: 97,
      nodes: 24,
      profile: 'paired_intervention'
    });
    session.initialize();
    session.step(1, { evaluationOffset: 1 });
    const ctrl = new Level3SupervisorController({
      policy: { ...LEVEL3_DEFAULT_POLICY, gate2WatchTicks: 3 }
    });
    ctrl.activeGate2Watch = {
      cycleId: 'a5-watch-1',
      triggerKind: 'anomaly_level2',
      regimeSignature: 'balanced|bidirectional|L2:on|K:learned',
      proposedAction: { kind: 'none' },
      actionSignature: 'none',
      hypothesis: 'test',
      diagnosis: 'test',
      reasonerSource: 'deterministic_local',
      externalLlmAssisted: false,
      promotedAtTick: 10,
      lastObservedTick: 10,
      watchWindowTicks: 3,
      observedTicks: 0,
      prePromotionScore: 0.85,
      referenceFloorScore: 0.85,
      prePromotionInTubeRate: 1,
      scores: [],
      inTubeFlags: [],
      nonFiniteDetected: false
    };
    for (let rep = 0; rep < 5; rep += 1) {
      const dupRes = ctrl.stepGate2Surveillance(session, { tick: 10, nowMs: 1_800_400_000_000 + rep * 1000 });
      assert.equal(dupRes.duplicateTickIgnored, true);
      assert.equal(ctrl.activeGate2Watch.observedTicks, 0, 'A-5 FAIL: duplicate tick incremented Gate 2 observedTicks');
    }
    const tick11First = ctrl.stepGate2Surveillance(session, { tick: 11, nowMs: 1_800_400_010_000 });
    assert.equal(tick11First.observedTicks, 1);
    const tick11Dup = ctrl.stepGate2Surveillance(session, { tick: 11, nowMs: 1_800_400_011_000 });
    assert.equal(tick11Dup.duplicateTickIgnored, true);
    assert.equal(ctrl.activeGate2Watch.observedTicks, 1, 'A-5 FAIL: repeated tick 11 incremented Gate 2 observedTicks');
  }

  // 9F. [R-20] Sistema B definitionCatalog coherence for Level3KnowledgeBelt
  {
    const beltOp = EVIDENTIAL_OPERATIONS.find((op) => op.module === 'Level3KnowledgeBelt');
    assert.ok(beltOp, 'R-20 FAIL: Level3KnowledgeBelt missing from EVIDENTIAL_OPERATIONS');
    assert.ok(
      !beltOp.description.includes('bajo external_llm_assisted=true'),
      `R-20 FAIL: Level3KnowledgeBelt description still hardcodes unconditional external_llm_assisted=true: ${beltOp.description}`
    );
    assert.match(beltOp.description, /external_llm_assisted = true solo con LLM externo/);
    assert.match(beltOp.description, /false en deliberación determinista local/);
  }
}

console.log('OK: nivel3-autonomous-supervisor.v1 passed (R-1..R-21 + A-1..A-5 adversarial checks, B0 parity, fact+scheduled triggers, first-person schema gate, Gate 1 isolated Workbench, Gate 2 append-only dynamicState.v3 rollback/confirmation & tick dedup, SHA-256 Knowledge Belt & Ledger strict flags, Worker l3-worker merge/collision/stop-drain + sessionEpoch + Daemon, Sistema B)');

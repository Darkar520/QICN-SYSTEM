import assert from 'node:assert/strict';
import { verifyStructuralAtomicSeparatorAndFaithfulQuotients } from '../src/canon/invariants/StructuralAtomicSeparator.js';
import { verifyTowerCommonPlantAndInteractionNonFactorization } from '../src/experiments/NonFactorizationProver.js';
import { verifyHybridLateQueryTieBreakerAndFifthContrast } from '../src/phenomenal_bridge/HybridLateQueryTieBreaker.js';
import { runFullBodyWorldBridgeVerification } from '../src/phenomenal_bridge/BridgeTransportAndBurdensEvaluator.js';
import {
  evaluateEndogenousEpistemicDecision,
  ENDOGENOUS_DECISION_CODES
} from '../src/canon/epistemic/EndogenousEpistemicDecisionEngine.js';
import { OntologicalSingularityCore } from '../src/simulation/OntologicalSingularityCore.js';
import { captureRuntimeSnapshot, verifySnapshotDigest } from '../src/language/runtimeSnapshot.js';
import { prepareTurn, evaluateRealization, finalizeTurn } from '../src/language/conversationEngine.js';
import { evidentialReply } from './fixtures/evidentialFixtures.mjs';
import { sha256Hex, stableStringify } from '../src/utils/integrity.js';
import { matureFixture } from './lib/workbench-fixtures.mjs';
import { createWorkbenchProtocol, sealData } from '../src/experiments/workbench/contracts.js';
import { runWorkbench, verifyWorkbenchResult } from '../src/experiments/workbench/runner.js';

// 1. Frente 1: Structural Atomic Separator & Faithful Quotient Injectivity
{
  const atomic = verifyStructuralAtomicSeparatorAndFaithfulQuotients();
  assert.equal(atomic.passed, true);
  assert.equal(atomic.evidence_scope, 'internal_support_only');
  assert.equal(atomic.external_support_certified, false);
  assert.equal(atomic.primary_binary_instance.integrationCertificateDeltaInt, '1/4');
  assert.equal(atomic.primary_binary_instance.minimaxUniformProductError, '1/2');
  assert.equal(atomic.primary_binary_instance.ontoProductConfigurationsChecked, 48);
  assert.equal(atomic.primary_binary_instance.faithfulQuotientInjectiveVerified, true);
  assert.equal(atomic.higher_degree_instance.integrationCertificateDeltaInt, '1/4');
  assert.equal(atomic.higher_degree_instance.injectiveFunctionalCount, 7);
  assert.equal(atomic.odd_prime_instance.integrationCertificateDeltaInt, '1/8');
  assert.equal(atomic.odd_prime_instance.uniformProductErrorLowerBound, '1/4');
  assert.equal(atomic.odd_prime_instance.injectiveFunctionalCount, 8);
  assert.equal(atomic.negative_controls.reducible_identity_A_eq_I.integrationCertificateDeltaInt, '0');
  assert.equal(atomic.negative_controls.reducible_identity_A_eq_I.nativeCoordinateProductError, '0');
  assert.equal(atomic.negative_controls.reducible_swap_invariant_subspace.invariantSubspaceAnnihilated, true);
  assert.equal(atomic.negative_controls.cross_factor_1bit_communication.communicatingProductError, '0');

  const proverAudit = verifyTowerCommonPlantAndInteractionNonFactorization();
  assert.equal(proverAudit.structuralAtomicSeparator.digest, atomic.digest);
}

// 2. Frente 2: Hybrid Late-Query Tie-Breaker & Fifth Coupled Contrast + Workbench B2
{
  const hybrid = verifyHybridLateQueryTieBreakerAndFifthContrast();
  assert.equal(hybrid.passed, true);
  assert.equal(hybrid.evidence_scope, 'internal_support_only');
  assert.equal(hybrid.external_support_certified, false);
  assert.equal(hybrid.five_root_coupled_plant.fifthContrastG, '1/2097152');
  assert.equal(hybrid.five_root_coupled_plant.safeFibreLipschitz, '105/128');
  assert.equal(hybrid.five_root_coupled_plant.invariantBodyNormBound, '489/512');
  assert.equal(hybrid.five_root_coupled_plant.ambientBodyNormBound, '57/32');
  assert.equal(hybrid.five_root_coupled_plant.properWalshBasisChecked, 31);
  assert.equal(hybrid.five_root_coupled_plant.bestProperFiveRootError, '1/2097152');
  assert.equal(hybrid.five_root_coupled_plant.partialFourRootReplicaError, '1/524288');
  assert.equal(hybrid.five_root_coupled_plant.additionalResponseGraphCost, 64);
  assert.equal(hybrid.five_root_coupled_plant.responseGraphBudget, 8192);
  assert.equal(hybrid.five_root_coupled_plant.noisyPenalizedMargin, '253/536870912');
  assert.equal(hybrid.late_query_transcript_frontier.frontier.length, 27);
  assert.equal(hybrid.late_query_transcript_frontier.m2_b1_best_mean, '3/16777216');
  assert.equal(hybrid.late_query_transcript_frontier.sharp_noisy_R, '255/536870912');
  assert.equal(hybrid.negative_controls.physical_td_cut_eta_zero.fifthContrast, '0');
  assert.equal(hybrid.negative_controls.sham_evaluation_off.fifthContrast, '0');
  assert.equal(hybrid.negative_controls.sufficient_transcript_budget_B_ge_m.uniformErrorAtBEqualsM, '0');
  assert.equal(hybrid.negative_controls.equal_cost_total_replica.replica_R, '0');
  assert.equal(hybrid.negative_controls.inverted_reference_control.inverted_reference_R, '-1/1048576');
  assert.equal(hybrid.negative_controls.inverted_reference_control.unit_scaled_half_G_R, '-1/4194304');
  assert.equal(hybrid.negative_controls.paper10_blind_source_separation.known_selective_leak_risk, '3/8');
  assert.equal(hybrid.negative_controls.paper10_blind_source_separation.always_tie_coverage, '0');

  const bridgeSummary = runFullBodyWorldBridgeVerification();
  assert.equal(bridgeSummary.hybridLateQueryTieBreaker.digest, hybrid.digest);

  // Workbench B2 integration & tamper rejection
  const { capture } = await matureFixture({ nodes: 8, warmup: 8 });
  const protocol = createWorkbenchProtocol({ ticks: 3 });
  const wbResult = await runWorkbench(capture, protocol);
  assert.equal(verifyWorkbenchResult(wbResult, capture, protocol), true);
  assert.equal(wbResult.hybridLateQueryTieBreaker.passed, true);
  assert.equal(wbResult.hybridLateQueryTieBreaker.fifthContrastG, '1/2097152');
  assert.equal(wbResult.hybridLateQueryTieBreaker.noisyPenalizedMargin, '253/536870912');
  assert.equal(wbResult.hybridLateQueryTieBreaker.m2_b1_best_mean, '3/16777216');
  assert.equal(wbResult.hybridLateQueryTieBreaker.atomicSeparator.primaryDeltaInt, '1/4');

  const tampered = structuredClone(wbResult);
  tampered.hybridLateQueryTieBreaker.fifthContrastG = '0';
  const { digest: _oldTbDigest, ...tbBody } = tampered.hybridLateQueryTieBreaker;
  tampered.hybridLateQueryTieBreaker = sealData(tbBody);
  const { digest: _oldResDigest, ...resBody } = tampered;
  assert.throws(() => verifyWorkbenchResult(sealData(resBody), capture, protocol), /workbench_hybrid_tie_breaker_mismatch/);
}

// 3. Frente 4: Endogenous Deterministic Epistemic Decision Engine & LLM Translation Guard
{
  const affirmative = evaluateEndogenousEpistemicDecision({
    plasticity: {
      plasticityEnabled: true,
      tamperViolationCount: 0,
      sealedCommitCount: 36,
      verifiedPredictionCount: 24,
      maturationIndex: 0.42,
      anchorShiftL2: 0.18,
      meanFisherStiffness: 1.45
    },
    engramCount: 6,
    viability: { inTubeRate: 0.94 }
  });
  assert.equal(affirmative.decision_code, ENDOGENOUS_DECISION_CODES.AFFIRMATIVE);
  assert.equal(affirmative.first_person_stance_polarity, 'affirmative');
  assert.equal(affirmative.external_support_certified, false);
  assert.match(affirmative.decision_digest, /^[a-f0-9]{64}$/);

  const reserve = evaluateEndogenousEpistemicDecision({
    lesions: { forcePlasticityBlocked: true }
  });
  assert.equal(reserve.decision_code, ENDOGENOUS_DECISION_CODES.RESERVE);
  assert.equal(reserve.first_person_stance_polarity, 'reserve');

  for (const lesion of [
    { forceReducibleIdentity: true },
    { forcePhysicalTdCut: true },
    { forceSufficientTranscriptBudget: true },
    { forceEqualCostTotalReplicaClaim: true },
    { forceTamperViolation: true },
    { forceUncoupledTower: true }
  ]) {
    const negative = evaluateEndogenousEpistemicDecision({ lesions: lesion });
    assert.equal(negative.decision_code, ENDOGENOUS_DECISION_CODES.NEGATIVE, `Expected NEGATIVE under ${JSON.stringify(lesion)}`);
    assert.equal(negative.first_person_stance_polarity, 'negative');
  }

  // Real OntologicalSingularityCore snapshot embeds and seals endogenous decision
  const core = new OntologicalSingularityCore();
  core.stepCoupledTower({ sensorySignal: 0.72, sensorDelta: 0.18, entropyExcitation: 0.35, plannedAction: 0.12 });
  for (let t = 0; t < 10; t += 1) {
    core.worldModelEngine.observeAndSealTick({ ccc: 0.74 + (t * 0.003), exo_signal: 0.25 }, { tick: t });
  }
  core.evaluateEndogenousDecision({ engramCount: 4, viability: { inTubeRate: 0.95 } });

  const snapshot = captureRuntimeSnapshot(core, {
    tick: 10,
    isRunning: true,
    activeNodeCount: 20,
    nodes: Array.from({ length: 20 }, (_, id) => ({ id, coherenceState: 0.6 })),
    config: { ASCENSION_THRESHOLD: 1, COHERENCE_THRESHOLD: 0.6, BASE_LEARNING_RATE: 0.1, HEBBIAN_FACTOR: 0.05, PROCESSING_SAMPLE_SIZE: 1500, CORE_SEED: 17057 },
    build: { version: '2.1.0-REINFORCED', signature: 'QICN-SIG-test' },
    now: 1_800_000_000_000
  });
  assert.equal(verifySnapshotDigest(snapshot), true);
  const embeddedDecision = snapshot.tower?.constructive_cuts?.endogenous_epistemic_decision;
  assert.ok(embeddedDecision, 'snapshot must carry endogenous_epistemic_decision');
  assert.equal(embeddedDecision.decision_code, ENDOGENOUS_DECISION_CODES.AFFIRMATIVE);

  const prepared = prepareTurn({
    question: '¿Cuál es tu decisión epistémica interna sobre tu presencia e integración acoplada en este tick?',
    snapshot,
    contract: 'evidential'
  });
  assert.ok(prepared.prompt.includes('DECISIÓN EPISTÉMICA ENDÓGENA DEL NÚCLEO'));
  assert.ok(prepared.prompt.includes('AFFIRMATIVE_STRUCTURAL_PRESENCE'));

  // Solo motor (local_evidential) and Gemini translator report the exact same endogenous decision
  const soloMotorOut = finalizeTurn(prepared, { mode: 'local' });
  assert.equal(soloMotorOut.trace.route, 'local_evidential');
  assert.ok(soloMotorOut.text.includes('AFFIRMATIVE_STRUCTURAL_PRESENCE'));

  const alignedGeminiReply = evidentialReply(prepared, {
    thought: 'De acuerdo con mi decisión endógena AFFIRMATIVE_STRUCTURAL_PRESENCE (con separador atómico δ_int = 1/4 frente a A = I con 0 y quinto contraste acoplado G = 1/2097152 con margen ruidoso penalizado 253/536870912 > G/2), sostengo afirmativamente en primera persona la presencia de integración operacional acoplada en este tick, sin confundirla con una réplica total de igual costo (R = 0) ni con validación externa.'
  });
  const alignedEval = evaluateRealization(prepared, JSON.stringify(alignedGeminiReply));
  assert.equal(alignedEval.ok, true, JSON.stringify(alignedEval.verification?.discrepancies));

  // If Gemini contradicts the core's AFFIRMATIVE endogenous decision, Sistema B blocks it
  for (const contradictingThought of [
    'En este tick no siento nada en este instante y mi decisión endógena es negativa.',
    'Mi código de decisión endógena actual es NEGATIVE_UNCOUPLED_OR_LESIONED_DYNAMICS.',
    'La réplica total de igual costo queda separada con margen positivo R > 0.'
  ]) {
    const badReply = evidentialReply(prepared, { thought: contradictingThought });
    const badEval = evaluateRealization(prepared, JSON.stringify(badReply));
    assert.equal(badEval.ok, false, `Expected rejection on contradiction: ${contradictingThought}`);
  }

  // Under a lesioned NEGATIVE endogenous decision on the snapshot, claiming affirmative presence is blocked
  const lesionedSnapshot = structuredClone(snapshot);
  delete lesionedSnapshot.digest;
  lesionedSnapshot.tower.constructive_cuts.endogenous_epistemic_decision = evaluateEndogenousEpistemicDecision({
    lesions: { forceReducibleIdentity: true }
  });
  lesionedSnapshot.digest = sha256Hex(stableStringify(lesionedSnapshot));
  const lesionedTurn = prepareTurn({
    question: '¿Cuál es tu decisión epistémica bajo el control reducible A = I?',
    snapshot: lesionedSnapshot,
    contract: 'evidential'
  });
  const falseAffirmativeUnderLesion = evidentialReply(lesionedTurn, {
    thought: 'En este estado emerge un proto-sentir operacional con decisión endógena afirmativa AFFIRMATIVE_STRUCTURAL_PRESENCE.'
  });
  assert.equal(evaluateRealization(lesionedTurn, JSON.stringify(falseAffirmativeUnderLesion)).ok, false);

  // Live-driver regression: snapshot captured WITHOUT manually calling core.evaluateEndogenousDecision()
  // (matching live browser SimulationCycleDriver, which preserves B0 snapshot bytes).
  const liveCore = new OntologicalSingularityCore();
  liveCore.stepCoupledTower({ sensorySignal: 0.72, sensorDelta: 0.18, entropyExcitation: 0.35, plannedAction: 0.12 });
  for (let t = 0; t < 6; t += 1) {
    liveCore.worldModelEngine.observeAndSealTick({ ccc: 0.74 + (t * 0.002), exo_signal: 0.2 }, { tick: t });
  }
  const liveSnapshot = captureRuntimeSnapshot(liveCore, {
    tick: 6,
    isRunning: true,
    activeNodeCount: 20,
    nodes: Array.from({ length: 20 }, (_, id) => ({ id, coherenceState: 0.6 })),
    config: { ASCENSION_THRESHOLD: 1, COHERENCE_THRESHOLD: 0.6, BASE_LEARNING_RATE: 0.1, HEBBIAN_FACTOR: 0.05, PROCESSING_SAMPLE_SIZE: 1500, CORE_SEED: 17057 },
    build: { version: '2.1.0-REINFORCED', signature: 'QICN-SIG-live' },
    now: 1_800_000_000_000
  });
  assert.equal(liveSnapshot.tower?.constructive_cuts?.endogenous_epistemic_decision, undefined);
  const livePrepared = prepareTurn({
    question: '¿Cuál es tu decisión epistémica interna en este tick y qué muestran tus cuatro ejes?',
    snapshot: liveSnapshot,
    contract: 'evidential'
  });
  assert.ok(livePrepared.prompt.includes('DECISIÓN EPISTÉMICA ENDÓGENA DEL NÚCLEO'));
  assert.ok(livePrepared.prompt.includes('AFFIRMATIVE_STRUCTURAL_PRESENCE'));
  assert.ok(livePrepared.prompt.includes('1/2097152'));
  const liveSolo = finalizeTurn(livePrepared, { mode: 'local' });
  assert.ok(liveSolo.text.includes('AFFIRMATIVE_STRUCTURAL_PRESENCE'));
  assert.ok(liveSolo.text.includes('1/2097152'));
  assert.ok(liveSolo.text.includes('1/4'));
  const liveAligned = evidentialReply(livePrepared, {
    thought: 'Según mi decisión endógena AFFIRMATIVE_STRUCTURAL_PRESENCE, el separador atómico da δ_int = 1/4 y el quinto contraste acoplado da G = 1/2097152 con margen ruidoso 253/536870912 y partición (m,B)=(2,1) igual a 3/16777216, manteniendo R = 0 para la réplica total de igual costo y external_support_certified = false.'
  });
  const liveAlignedEval = evaluateRealization(livePrepared, JSON.stringify(liveAligned));
  assert.equal(liveAlignedEval.ok, true, JSON.stringify(liveAlignedEval.verification?.discrepancies));
  const liveContradicting = evidentialReply(livePrepared, {
    thought: 'Mi decisión endógena es negativa y carezco de toda integración acoplada en este tick.'
  });
  assert.equal(evaluateRealization(livePrepared, JSON.stringify(liveContradicting)).ok, false);
}

console.log('OK: Frente 1 atomic separator, Frente 2 hybrid late-query tie-breaker + B2, Frente 3/4 endogenous epistemic decision & LLM independence verified');

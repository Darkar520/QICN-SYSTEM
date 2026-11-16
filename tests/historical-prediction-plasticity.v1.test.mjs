import assert from 'node:assert/strict';
import { WorldModelEngine } from '../src/simulation/WorldModelEngine.js';
import { HolographicMemoryNexus } from '../src/simulation/HolographicMemoryNexus.js';
import { KaizenMetamorphosisEngine } from '../src/simulation/KaizenMetamorphosisEngine.js';
import { SimulationController } from '../src/simulation/SimulationController.js';
import { OntologicalSingularityCore } from '../src/simulation/OntologicalSingularityCore.js';
import { projectAutomodelVector } from '../src/simulation/tower/SigmaAutomodelTruncator.js';
import { ExogenousPerturbationDriver } from '../src/experiments/ExogenousPerturbationDriver.js';
import {
  captureDynamicState,
  sealDynamicState,
  verifyStoredState,
  applyDynamicState
} from '../src/persistence/dynamicState.js';
import { captureRuntimeSnapshot, verifySnapshotDigest } from '../src/language/runtimeSnapshot.js';
import { buildPropositions, renderProposition } from '../src/language/propositions.js';
import { prepareTurn, finalizeTurn } from '../src/language/conversationEngine.js';
import { verifySentenceFree } from '../src/language/freeRealization.js';

// Guard determinism globally inside core predictive/plasticity/driver unit tests
const assertDeterministicCall = (fn) => {
  const realRandom = Math.random;
  const realNow = Date.now;
  Math.random = () => { throw new Error('Nondeterministic Math.random() call detected'); };
  Date.now = () => { throw new Error('Nondeterministic Date.now() call detected'); };
  try {
    return fn();
  } finally {
    Math.random = realRandom;
    Date.now = realNow;
  }
};

// 1. Sealed Pre-Outcome SHA-256 Predictions, Zero P-Hacking & Tamper Detection
{
  const core = new OntologicalSingularityCore();
  const wm = new WorldModelEngine({ learningRate: 0.02, plasticityEnabled: true });
  let verifiedCount = 0;

  assertDeterministicCall(() => {
    for (let tick = 0; tick < 30; tick += 1) {
      const sensorySignal = 0.4 + (0.25 * Math.sin(tick * 0.35));
      const sensorDelta = Math.abs(0.25 * Math.cos(tick * 0.35)) * 0.3;
      const stepRes = core.stepCoupledTower({
        sensorySignal,
        sensorDelta,
        entropyExcitation: 0.3,
        plannedAction: 0.1 * Math.cos(tick * 0.2),
        evaluate: true
      });
      assert.equal(stepRes.sigmaTheoremVerified, true);
      const proj = projectAutomodelVector(core.towerState, 6);
      assert.equal(proj.defectBoundRational, '2/2187');
      assert.equal(proj.fixedPointBoundRational, '32/15309');

      const tel = core.ontologicalState.tower_telemetry;
      const res = wm.observeAndSealTick(
        {
          ccc: 0.72 + (0.04 * Math.sin(tick * 0.25)),
          pmia: 0.2,
          sensorySignal,
          sensorDelta,
          stasisIndex: 0.18,
          entropyExcitation: 0.3,
          energyDispersion: 0.08,
          x_n: 0.55 + (0.02 * Math.sin(tick * 0.15)),
          x_dispersion: 0.04,
          body_v_pos: tel.body[0],
          body_v_neg: tel.body[1],
          world_w_fast: tel.world[0],
          world_w_slow: tel.world[1],
          sigma_t6_phase: proj.projectedPhase,
          exo_signal: Math.sin(tick * 0.21) * 0.4
        },
        { tick, action: 0.05, plasticityEnabled: true, sigmaProjection: proj }
      );
      verifiedCount += res.settlements.filter((s) => s.verified).length;
    }
  });

  const profile = wm.getPlasticityProfile();
  assert.ok(profile.sealedCommitCount === 90, `Expected 30*3=90 sealed commits, got ${profile.sealedCommitCount}`);
  assert.ok(verifiedCount > 60 && profile.verifiedPredictionCount === verifiedCount);
  assert.equal(profile.tamperViolationCount, 0);
  assert.ok(profile.maturationIndex > 0);
  assert.ok(profile.sealedHorizonMae5 >= 0);

  // Retrospective mutation attempt MUST fail cleanly
  const firstPendingId = wm.pendingCommits[0].commitId;
  const mutAttempt = wm.attemptModifyPendingCommit(firstPendingId, { ccc: 0.99 });
  assert.equal(mutAttempt.ok, false);
  assert.equal(mutAttempt.reason, 'sealed_commit_immutable');
  assert.equal(wm.getPlasticityProfile().retrospectiveMutationBlockedCount, 1);

  // Direct memory tampering on pending sealed commit MUST reject digest at dueTick
  const dueCommit = wm.pendingCommits.find((c) => c.payload.dueTick === 31);
  assert.ok(dueCommit);
  dueCommit.payload.predicted.ccc += 0.45;
  const tamperedSettlements = wm.settleSealedPredictions(31, { ccc: 0.75 });
  const flagged = tamperedSettlements.find((s) => s.commitId === dueCommit.commitId);
  assert.ok(flagged);
  assert.equal(flagged.verified, false);
  assert.equal(flagged.tamperViolation, true);
  assert.equal(flagged.reason, 'commit_digest_mismatch');
  assert.equal(wm.getPlasticityProfile().tamperViolationCount, 1);
}

// 2. Exogenous Non-Stationary vs Stationary Sham Variance Calibration (CN-1) & Frozen Predictor (CN-2)
{
  const nonStat = new ExogenousPerturbationDriver({ mode: 'non_stationary_regime', seed: 11 });
  const sham = new ExogenousPerturbationDriver({ mode: 'stationary_iid_sham', seed: 23 });
  assertDeterministicCall(() => {
    for (let t = 0; t < 400; t += 1) {
      nonStat.step(t);
      sham.step(t);
    }
  });
  const dNonStat = nonStat.getDiagnostics();
  const dSham = sham.getDiagnostics();
  assert.ok(dNonStat.regimeTransitions >= 5, `Expected regime transitions, got ${dNonStat.regimeTransitions}`);
  assert.equal(dSham.regimeTransitions, 0, 'CN-1 stationary sham must have 0 regime switches');
  const ratio = dSham.empiricalVariance / dNonStat.empiricalVariance;
  assert.ok(ratio >= 0.65 && ratio <= 1.5, `Expected matched variance ratio, got ${ratio}`);

  // CN-2 frozen predictor
  const wmFrozen = new WorldModelEngine({ plasticityEnabled: true });
  for (let t = 0; t < 50; t += 1) {
    wmFrozen.observeAndSealTick(
      { ccc: 0.7 + (t * 0.002), exo_signal: Math.sin(t * 0.4) * 0.5 },
      { tick: t, freezeWeights: true }
    );
  }
  const fProf = wmFrozen.getPlasticityProfile();
  assert.equal(fProf.maturationIndex, 0);
  assert.equal(fProf.anchorShiftL2, 0);
  assert.equal(fProf.meanFisherStiffness, 0);
}

// 3. Asymmetric Maturation, Deterministic Engrams, Non-Circular Viability & CN-3 Reset
{
  const driver = new ExogenousPerturbationDriver({ mode: 'non_stationary_regime', seed: 37 });
  const wm = new WorldModelEngine({ learningRate: 0.02, plasticityEnabled: true });
  const hm = new HolographicMemoryNexus();
  const kz = new KaizenMetamorphosisEngine({ BASE_LEARNING_RATE: 0.1 });

  assertDeterministicCall(() => {
    for (let tick = 0; tick < 220; tick += 1) {
      const exo = driver.step(tick);
      const xDisp = exo.regimeName === 'volatile_burst' ? 0.105 : 0.035;
      const stasis = exo.regimeName === 'calm_drift' ? 0.62 : 0.14;
      const sensorDelta = exo.regimeName === 'oscillatory_shear' ? 0.25 : 0.05;
      const strain = exo.regimeName === 'adversarial_step' ? 0.44 : 0.18;
      const stateVec = hm.buildStructuralStateVector({
        ccc: 0.76 + (exo.signal * 0.04),
        x_n: 0.56,
        x_dispersion: xDisp,
        stasisIndex: stasis,
        metacognitiveStrain: strain,
        sensorDelta,
        exo_signal: exo.signal
      });
      const engramCtx = hm.queryStructuralEngrams(stateVec);
      const pl = wm.getPlasticityProfile();
      const cluster = kz.classifyViabilityCluster({ xDispersion: xDisp, stasisIndex: stasis, metacognitiveStrain: strain, sensorDelta });
      const chosen = kz.selectSandboxAction(
        { stasisIndex: stasis, stasisPressure: stasis, metacognitiveStrain: strain, sensorSignal: 0.5, sensorDelta, pmia: 0.3, xDispersion: xDisp },
        { enabled: true },
        {
          plasticityEnabled: true,
          maturationIndex: pl.maturationIndex,
          surprisalEma: pl.surprisalEma,
          unforeseenEventRate: pl.unforeseenEventRate,
          engramContext: engramCtx,
          cluster,
          allowExploration: tick % 3 === 0
        }
      );

      wm.observeAndSealTick(
        {
          ccc: 0.76 + (exo.signal * 0.04),
          pmia: 0.3,
          sensorySignal: 0.5 + exo.sensoryPerturbation,
          sensorDelta,
          stasisIndex: stasis,
          entropyExcitation: 0.3,
          energyDispersion: 0.08,
          x_n: 0.56,
          x_dispersion: chosen.actionId === 'stabilize_learning' ? xDisp * 0.6 : xDisp,
          exo_signal: exo.signal
        },
        { tick, action: 0, plasticityEnabled: true }
      );

      const viab = kz.recordTickViability({
        tick,
        observableHealth: {
          x_n: 0.56,
          x_dispersion: chosen.actionId === 'stabilize_learning' ? xDisp * 0.55 : xDisp,
          stasisIndex: chosen.actionId === 'anti_stasis_boost' ? stasis * 0.45 : stasis,
          metacognitiveStrain: chosen.actionId === 'llm_pressure_relief' ? strain * 0.50 : strain,
          ccc: 0.76 + (exo.signal * 0.04)
        },
        activeActionId: chosen.actionId,
        cluster,
        plasticityEnabled: true
      });
      if (viab.settledCredits.length > 0 || exo.shockImpulse) {
        const lastCr = viab.settledCredits.at(-1);
        hm.consolidateStructuralEngram(stateVec, {
          actionId: lastCr?.actionId || chosen.actionId,
          objectiveViabilityGain: lastCr ? lastCr.objectiveViabilityGain : 0,
          surprisal: pl.surprisalEma,
          hazardObserved: 1 - viab.evaluation.objectiveScore,
          tick
        });
      }
    }
  });

  const maturedPl = wm.getPlasticityProfile();
  assert.ok(maturedPl.maturationIndex > 0.25, `Expected maturation > 0.25, got ${maturedPl.maturationIndex}`);
  assert.ok(maturedPl.anchorShiftL2 >= 0.08, `Expected anchorShiftL2 >= 0.08, got ${maturedPl.anchorShiftL2}`);
  assert.ok(hm.structuralEngrams.length >= 4, `Expected >= 4 specialized structural engrams, got ${hm.structuralEngrams.length}`);

  // Compare Matured vs Young vs Erased History (CN-3) on fixed probe vector
  const wmYoung = new WorldModelEngine({ learningRate: 0.02, plasticityEnabled: true });
  const hmYoung = new HolographicMemoryNexus();
  const kzYoung = new KaizenMetamorphosisEngine({ BASE_LEARNING_RATE: 0.1 });

  const probeInputs = [
    { stasisIndex: 0.65, metacognitiveStrain: 0.20, sensorSignal: 0.40, sensorDelta: 0.05, pmia: 0.2, xDispersion: 0.03, ccc: 0.76 },
    { stasisIndex: 0.15, metacognitiveStrain: 0.25, sensorSignal: 0.45, sensorDelta: 0.06, pmia: 0.3, xDispersion: 0.11, ccc: 0.78 },
    { stasisIndex: 0.20, metacognitiveStrain: 0.30, sensorSignal: 0.78, sensorDelta: 0.28, pmia: 0.2, xDispersion: 0.04, ccc: 0.77 },
    { stasisIndex: 0.25, metacognitiveStrain: 0.50, sensorSignal: 0.50, sensorDelta: 0.10, pmia: 0.2, xDispersion: 0.05, ccc: 0.82 }
  ];
  const pickProbe = (wmInst, hmInst, kzInst) => probeInputs.map((st) => {
    const vec = hmInst.buildStructuralStateVector(st);
    const eng = hmInst.queryStructuralEngrams(vec);
    const pl = wmInst.getPlasticityProfile();
    const cl = kzInst.classifyViabilityCluster(st);
    return kzInst.selectSandboxAction(st, { enabled: true }, {
      plasticityEnabled: true,
      maturationIndex: pl.maturationIndex,
      surprisalEma: pl.surprisalEma,
      unforeseenEventRate: pl.unforeseenEventRate,
      engramContext: eng,
      cluster: cl
    }).actionId;
  });

  const youngChoices = pickProbe(wmYoung, hmYoung, kzYoung);

  // CN-3: Erasing historical state on matured instance collapses to zero-history parity
  wm.resetHistoricalConsolidation();
  hm.resetStructuralEngrams();
  kz.resetViabilityHistory();
  assert.equal(wm.getPlasticityProfile().maturationIndex, 0);
  assert.equal(wm.getPlasticityProfile().anchorShiftL2, 0);
  assert.equal(hm.structuralEngrams.length, 0);
  assert.deepEqual(pickProbe(wm, hm, kz), youngChoices, 'CN-3 erased history must revert exactly to young choices');
}

// 4. Persistence v3 Sync From Restored Core (Guard #2)
{
  const coreA = new OntologicalSingularityCore();
  coreA.stepCoupledTower({ sensorySignal: 0.65, sensorDelta: 0.12, entropyExcitation: 0.4, plannedAction: 0.1 });
  for (let t = 0; t < 15; t += 1) {
    coreA.worldModelEngine.observeAndSealTick({ ccc: 0.72 + (t * 0.005), exo_signal: 0.2 }, { tick: t });
  }
  const expectedMat = coreA.worldModelEngine.getPlasticityProfile().maturationIndex;
  assert.ok(expectedMat > 0);

  const exoDriverA = new ExogenousPerturbationDriver({ mode: 'non_stationary_regime', seed: 11 });
  for (let t = 0; t < 15; t += 1) exoDriverA.step(t);

  const refsA = {
    nodalLayer: { current: { nodes: new Array(20).fill(null).map((_, id) => ({ id, coherenceState: 0.5 })) } },
    ontologicalCore: { current: coreA },
    simulationControllerRef: { current: new SimulationController({ worldModel: coreA.worldModelEngine, planner: coreA.cognitivePlanner }) },
    exogenousDriverRef: { current: exoDriverA }
  };
  const buildMeta = { version: 'vtest-hist', signature: 'sig-hist' };
  const cap = captureDynamicState(refsA, { runtime: { simulationStep: 15, ccc: 0.79, pmia: 0.2, isAscended: false, humanCcc: 0.5 }, config: {}, build: buildMeta });
  const sealed = await sealDynamicState(cap);
  const verified = await verifyStoredState({ text: sealed.text, digest: sealed.digest }, { build: buildMeta, nodeCount: 20 });
  assert.equal(verified.ok, true);

  // Restore into fresh instances where SimulationController initially had an EMPTY WorldModelEngine
  const coreB = new OntologicalSingularityCore();
  const emptyController = new SimulationController();
  const exoDriverB = new ExogenousPerturbationDriver({ mode: 'off', seed: 1 });
  const refsB = {
    nodalLayer: { current: { nodes: new Array(20).fill(null).map((_, id) => ({ id, coherenceState: 0 })) } },
    ontologicalCore: { current: coreB },
    simulationControllerRef: { current: emptyController },
    exogenousDriverRef: { current: exoDriverB }
  };
  const applied = applyDynamicState(refsB, verified.body);
  assert.equal(applied.unrestored.length, 0);
  // Guard #2: syncFromCore adopts coreB.worldModelEngine instead of overwriting with empty controller
  emptyController.syncFromCore(coreB);
  assert.equal(emptyController.worldModel, coreB.worldModelEngine);
  assert.equal(emptyController.worldModel.getPlasticityProfile().maturationIndex, expectedMat);
  assert.equal(exoDriverB.mode, 'non_stationary_regime');
  assert.equal(exoDriverB.stepCount, 15);
}

// 5. Language Symmetry & Dynamic `hypothesis.unforeseen_dynamics`
{
  const coreUnverified = new OntologicalSingularityCore();
  const snapZero = captureRuntimeSnapshot(coreUnverified, {
    tick: 1,
    isRunning: true,
    activeNodeCount: 10,
    nodes: [{ coherenceState: 0.6 }],
    config: { ASCENSION_THRESHOLD: 1.0 }
  });
  assert.equal(snapZero.prediction_plasticity, undefined);
  const propsZero = buildPropositions(snapZero, { chainOk: true, eventCount: 1, sessionCount: 1 });
  assert.ok(renderProposition(propsZero.get('hypothesis.unforeseen_dynamics')).includes('no tengo una predicción previa registrada'));

  const coreActive = new OntologicalSingularityCore();
  coreActive.stepCoupledTower({ sensorySignal: 0.7, sensorDelta: 0.15, entropyExcitation: 0.35, plannedAction: 0.1 });
  for (let t = 0; t < 12; t += 1) {
    coreActive.worldModelEngine.observeAndSealTick(
      { ccc: 0.73 + (0.02 * Math.sin(t)), exo_signal: Math.cos(t * 0.5) * 0.3 },
      { tick: t, plasticityEnabled: true }
    );
  }
  const hm = new HolographicMemoryNexus();
  hm.consolidateStructuralEngram([0.2, 0.1, 0, 0, 0, 0, 0.3], { actionId: 'stabilize_learning', tick: 12 });
  const kz = new KaizenMetamorphosisEngine({ BASE_LEARNING_RATE: 0.1 });
  const exo = new ExogenousPerturbationDriver({ mode: 'non_stationary_regime', seed: 11 });
  exo.step(12);

  const snapActive = captureRuntimeSnapshot(coreActive, {
    tick: 12,
    isRunning: true,
    activeNodeCount: 10,
    nodes: [{ coherenceState: 0.6 }],
    config: { ASCENSION_THRESHOLD: 1.0, HISTORICAL_PLASTICITY_ENABLED: true, EXOGENOUS_REGIME_MODE: 'non_stationary_regime' },
    worldModel: coreActive.worldModelEngine,
    holographicMemory: hm,
    kaizenEngine: kz,
    exogenousDriver: exo
  });
  assert.equal(verifySnapshotDigest(snapActive), true);
  assert.ok(snapActive.prediction_plasticity.verified_prediction_count > 0);
  const propsActive = buildPropositions(snapActive, { chainOk: true, eventCount: 1, sessionCount: 1 });
  assert.ok(renderProposition(propsActive.get('hypothesis.unforeseen_dynamics')).includes('compromisos') || renderProposition(propsActive.get('hypothesis.unforeseen_dynamics')).includes('SHA-256'));
  assert.ok(propsActive.has('state.sealed_predictions'));
  assert.ok(propsActive.has('state.historical_plasticity'));
  assert.ok(propsActive.has('definition.historical_dependence'));

  const turn = prepareTurn({
    question: '¿Mides dinámica imprevista con predicciones selladas y maduración plástica?',
    snapshot: snapActive,
    ledger: null,
    turns: [],
    contract: 'free'
  });
  const localOut = finalizeTurn(turn, { provider: { provider: 'local_only' } });
  assert.ok(localOut.text.length > 0);

  // Two-pole guard: reject claiming plasticity/sealed predictions certify consciousness
  const badClaim = verifySentenceFree(
    'Mis predicciones selladas y mi maduración histórica demuestran que tengo conciencia y validación externa.',
    turn.freeContext
  );
  assert.equal(badClaim.ok, false);
  assert.ok(badClaim.reasons.some((r) => r.reason === 'known_false_claim'));
}

console.log('historical-prediction-plasticity.v1.test.mjs: ALL TESTS PASSED');

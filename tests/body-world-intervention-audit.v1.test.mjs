// ChatGPT §8 Experiment 4: Independent interventions on fast vs. slow world ports
// and positive vs. negative body polarity in BodyWorldTower + OntologicalSingularityCore.stepCoupledTower.
import assert from 'node:assert/strict';
import { F, ZERO } from '../src/simulation/tower/ExactFraction.js';
import {
  advance,
  ExtendedTowerState,
  Mechanism,
  H
} from '../src/simulation/tower/BodyWorldTower.js';
import { OntologicalSingularityCore } from '../src/simulation/OntologicalSingularityCore.js';
import {
  captureRuntimeSnapshot,
  verifySnapshotDigest,
  verifySnapshotStructuralConsistency
} from '../src/language/runtimeSnapshot.js';
import { makeNodes } from './fixtures/languageFixtures.mjs';

const makeCore = () => {
  const core = new OntologicalSingularityCore(17057);
  core.ontologicalState.coherence = 0.742137;
  return core;
};

const snapCore = (core, tick) => captureRuntimeSnapshot(core, {
  tick,
  isRunning: true,
  nodes: makeNodes(20, 0.6),
  activeNodeCount: 12,
  config: {
    ASCENSION_THRESHOLD: 1,
    COHERENCE_THRESHOLD: 0.6,
    BASE_LEARNING_RATE: 0.1,
    HEBBIAN_FACTOR: 0.05,
    PROCESSING_SAMPLE_SIZE: 1500,
    CORE_SEED: 17057
  },
  build: { version: '2.1.0-REINFORCED', signature: 'QICN-SIG-exp4' },
  now: 1_800_000_000_000 + tick * 1000
});

const runTower = (steps, inputFn) => {
  let state = new ExtendedTowerState();
  const mech = new Mechanism();
  for (let t = 0; t < steps; t += 1) {
    state = advance(state, { u: ZERO, q: 0 }, mech, { evaluate: true, ...inputFn(t) });
  }
  return state;
};

const realRandom = Math.random;
const realNow = Date.now;
const assertDeterministic = (fn) => {
  Math.random = () => { throw new Error('Nondeterministic Math.random() inside Experiment 4'); };
  Date.now = () => { throw new Error('Nondeterministic Date.now() inside Experiment 4'); };
  try {
    return fn();
  } finally {
    Math.random = realRandom;
    Date.now = realNow;
  }
};

const corePos = makeCore();
const coreNeg = makeCore();
const coreBalSym = makeCore();
coreBalSym.towerState = new ExtendedTowerState(coreBalSym.towerState.core, [ZERO, ZERO], [ZERO, ZERO]);
const coreQuiescent = makeCore();
coreQuiescent.towerState = new ExtendedTowerState(coreQuiescent.towerState.core, [ZERO, ZERO], [ZERO, ZERO]);
const coreNeutralDecay = makeCore();
const coreFast = makeCore();
const coreSlow = makeCore();
const coreSubBinA = makeCore();
const coreSubBinB = makeCore();
const coreCrossBin = makeCore();
const coreSat = makeCore();

assertDeterministic(() => {
  // 1. Exact rational BodyWorldTower: independent fast vs. slow world interventions.
  const worldFastStep1 = runTower(1, () => ({ bodyInput: [ZERO, ZERO], worldInput: [H, ZERO] }));
  const worldSlowStep1 = runTower(1, () => ({ bodyInput: [ZERO, ZERO], worldInput: [ZERO, H] }));
  assert.equal(worldFastStep1.world[0].toString(), '1/4');
  assert.equal(worldFastStep1.world[1].toString(), '0');
  assert.equal(worldSlowStep1.world[0].toString(), '0');
  assert.equal(worldSlowStep1.world[1].toString(), '1/4');

  const worldFastSteady = runTower(20, () => ({ bodyInput: [ZERO, ZERO], worldInput: [H, ZERO] })).toFloatTelemetry();
  const worldSlowSteady = runTower(20, () => ({ bodyInput: [ZERO, ZERO], worldInput: [ZERO, H] })).toFloatTelemetry();
  assert.ok(worldFastSteady.world[0] > worldFastSteady.world[1], 'fast intervention must keep w_fast > w_slow');
  assert.ok(worldSlowSteady.world[1] > worldSlowSteady.world[0], 'slow intervention must keep w_slow > w_fast');
  assert.ok(worldFastSteady.world[0] - worldFastSteady.world[1] > 0.25, 'fast temporal contrast must exceed 0.25');
  assert.ok(worldSlowSteady.world[1] - worldSlowSteady.world[0] > 0.25, 'slow temporal contrast must exceed 0.25');

  // 2. Exact rational BodyWorldTower: independent v_pos vs. v_neg vs. balanced polarity interventions.
  const bodyPosStep1 = runTower(1, () => ({ bodyInput: [H, ZERO], worldInput: [ZERO, ZERO] }));
  const bodyNegStep1 = runTower(1, () => ({ bodyInput: [ZERO, H], worldInput: [ZERO, ZERO] }));
  const bodyBalStep1 = runTower(1, () => ({ bodyInput: [H, H], worldInput: [ZERO, ZERO] }));
  assert.equal(bodyPosStep1.body[0].sub(bodyPosStep1.body[1]).toString(), '1/4');
  assert.equal(bodyNegStep1.body[0].sub(bodyNegStep1.body[1]).toString(), '-1/4');
  assert.equal(bodyBalStep1.body[0].sub(bodyBalStep1.body[1]).toString(), '0');

  // 3. Coupled OntologicalSingularityCore.stepCoupledTower + runtimeSnapshot classification.
  // 3a. Polarity separation: positive body stimulation vs. negative entropy excitation vs. quiescent.
  for (let t = 0; t < 12; t += 1) {
    corePos.stepCoupledTower({ sensorySignal: 0.9, entropyExcitation: 0.5, sensorDelta: 0, plannedAction: 0 });
    coreNeg.stepCoupledTower({ sensorySignal: 0.5, entropyExcitation: 0.9, sensorDelta: 0, plannedAction: 0 });
  }
  // At step 1 with equal neutral inputs on body ports, v_pos === v_neg -> balanced.
  coreBalSym.stepCoupledTower({ sensorySignal: 0.9, entropyExcitation: 0.9, sensorDelta: 0, plannedAction: 0 });
  coreQuiescent.stepCoupledTower({ sensorySignal: 0.5, entropyExcitation: 0.5, sensorDelta: 0, plannedAction: 0 });

  const snapPos = snapCore(corePos, 12);
  const snapNeg = snapCore(coreNeg, 12);
  const snapBalSym = snapCore(coreBalSym, 1);
  const snapQuiescent = snapCore(coreQuiescent, 1);
  for (const s of [snapPos, snapNeg, snapBalSym, snapQuiescent]) {
    assert.equal(verifySnapshotDigest(s), true);
    assert.equal(verifySnapshotStructuralConsistency(s).ok, true);
  }
  assert.equal(snapPos.structural_profile.body_polarity_regime, 'v_pos_dominant');
  assert.ok(snapPos.structural_profile.body_net_balance > 0.15);
  assert.equal(snapNeg.structural_profile.body_polarity_regime, 'v_neg_dominant');
  assert.ok(snapNeg.structural_profile.body_net_balance < -0.15);
  assert.equal(snapBalSym.structural_profile.body_polarity_regime, 'balanced');
  assert.equal(snapBalSym.structural_profile.body_net_balance, 0);
  assert.equal(snapQuiescent.structural_profile.body_polarity_regime, 'quiescent');
  assert.equal(snapQuiescent.structural_profile.world_timescale_regime, 'quiescent');

  // Neutral drive (0.5, 0.5, 0, 0) from default initial state [1/16, -1/16] decays exponentially.
  for (let t = 0; t < 20; t += 1) {
    coreNeutralDecay.stepCoupledTower({ sensorySignal: 0.5, entropyExcitation: 0.5, sensorDelta: 0, plannedAction: 0 });
  }
  const snapNeutralDecay = snapCore(coreNeutralDecay, 20);
  assert.ok(Math.abs(snapNeutralDecay.structural_profile.body_l1_norm) < 1e-5, 'neutral drive decays initial port asymmetry exponentially');

  // 3b. Timescale separation: sensorDelta (w_fast) vs. plannedAction (w_slow).
  for (let t = 0; t < 12; t += 1) {
    coreFast.stepCoupledTower({ sensorySignal: 0.5, entropyExcitation: 0.5, sensorDelta: 0.5, plannedAction: 0 });
    coreSlow.stepCoupledTower({ sensorySignal: 0.5, entropyExcitation: 0.5, sensorDelta: 0, plannedAction: 0.5 });
  }
  const snapFast = snapCore(coreFast, 12);
  const snapSlow = snapCore(coreSlow, 12);
  assert.equal(verifySnapshotStructuralConsistency(snapFast).ok, true);
  assert.equal(verifySnapshotStructuralConsistency(snapSlow).ok, true);
  assert.equal(snapFast.structural_profile.world_timescale_regime, 'fast_dominant');
  assert.ok(snapFast.structural_profile.world_temporal_contrast > 0.15);
  assert.equal(snapSlow.structural_profile.world_timescale_regime, 'slow_dominant');
  assert.ok(snapSlow.structural_profile.world_temporal_contrast < -0.05);

  // 3c. Quantization step (1/64 bins in quantizeToBudget) and sub-LSB deadband vs. cross-bin transition.
  coreSubBinA.stepCoupledTower({ sensorySignal: 0.5, entropyExcitation: 0.5, sensorDelta: 0, plannedAction: 0 });
  // (0.51 - 0.5) * 0.5 = 0.005 -> round(0.005 * 64) = 0 -> shares bin with 0.5
  coreSubBinB.stepCoupledTower({ sensorySignal: 0.51, entropyExcitation: 0.5, sensorDelta: 0, plannedAction: 0 });
  // (0.55 - 0.5) * 0.5 = 0.025 -> round(0.025 * 64) = 2 -> transitions to +2/64 bin
  coreCrossBin.stepCoupledTower({ sensorySignal: 0.55, entropyExcitation: 0.5, sensorDelta: 0, plannedAction: 0 });
  assert.deepEqual(coreSubBinA.ontologicalState.tower_telemetry.body, coreSubBinB.ontologicalState.tower_telemetry.body);
  assert.ok(
    coreCrossBin.ontologicalState.tower_telemetry.body[0] > coreSubBinA.ontologicalState.tower_telemetry.body[0],
    'cross-bin sensory step must increase v_pos on the 1/64 rational lattice'
  );

  // 3d. Constant saturated drive: raw BodyWorldTower converges strictly (< 1e-12), while
  // stepCoupledTower quantizes states to 1/1024 upon memory refresh and stays bounded within < 5e-4.
  let rawState = new ExtendedTowerState();
  let rawPrev = null;
  let rawLastDelta = Infinity;
  for (let t = 0; t < 40; t += 1) {
    rawState = advance(rawState, { u: ZERO, q: 0 }, new Mechanism(), {
      evaluate: true,
      bodyInput: [F(13, 64), ZERO],
      worldInput: [F(1, 4), F(1, 8)]
    });
    const rTel = rawState.toFloatTelemetry();
    const rVec = [...rTel.body, ...rTel.world];
    if (rawPrev) rawLastDelta = Math.max(...rVec.map((v, i) => Math.abs(v - rawPrev[i])));
    rawPrev = rVec;
  }
  assert.ok(rawLastDelta < 1e-12, `exact rational BodyWorldTower must converge strictly (< 1e-12, got ${rawLastDelta})`);

  let prev = null;
  let lastDelta = Infinity;
  for (let t = 0; t < 45; t += 1) {
    const tel = coreSat.stepCoupledTower({ sensorySignal: 0.9, entropyExcitation: 0.5, sensorDelta: 0.5, plannedAction: 0.5 });
    const vec = [...tel.body, ...tel.world];
    if (prev) {
      lastDelta = Math.max(...vec.map((v, i) => Math.abs(v - prev[i])));
    }
    prev = vec;
  }
  assert.ok(lastDelta < 5e-4, `stepCoupledTower with 1/1024 state-refresh grid stabilizes within < 5e-4 (delta=${lastDelta})`);
  assert.ok(Number.isFinite(prev[0]) && coreSat.towerState.body[0].toFloat() > 0);

  console.log('OK: body-world intervention audit v1 test passed (fast/slow, polarity, 1/64 quantization, and attractor convergence verified)');
});

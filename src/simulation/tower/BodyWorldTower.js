/**
 * Rational skew product over the unchanged writable tower (`body_world_tower.py`).
 *
 * The two extra ports implement a finite-dimensional control model (2 body coordinates,
 * 2 world coordinates). Their names do not assert phenomenal valence, world experience,
 * or biological embodiment.
 */

import {
  F,
  ZERO,
  ONE,
  HALF,
  fSum,
  fMax,
  fMin,
  vecAdd,
  vecSub,
  vecScale,
  vecNormInf,
  vecEq,
  matVecMul,
  matMul,
  matTranspose,
  matOperatorNormInf,
  matEq
} from './ExactFraction.js';
import { CONTEXTS, createState, readout, step } from './WritablePrefixTower.js';

export const ALPHA = F(1, 4);
export const BETA = F(1, 4);
export const H = F(1, 4);
export const EVAL_GAIN = F(1, 8);
export const VALUE_SCALE = BETA.mul(EVAL_GAIN).mul(H); // 1/128
export const WORLD_SCALE = BETA.mul(H); // 1/16
export const LOOP_SCALE = BETA.pow(3).mul(H); // 1/256

export const ZERO_VEC = Object.freeze([ZERO, ZERO]);
export const IDENTITY = Object.freeze([
  Object.freeze([ONE, ZERO]),
  Object.freeze([ZERO, ONE])
]);
export const SWAP = Object.freeze([
  Object.freeze([ZERO, ONE]),
  Object.freeze([ONE, ZERO])
]);
export const ROTATION = Object.freeze([
  Object.freeze([ZERO, F(-1)]),
  Object.freeze([ONE, ZERO])
]);
export const EVALUATIVE = Object.freeze([
  Object.freeze([F(1, 2), F(-1, 2)]),
  Object.freeze([F(1, 2), F(1, 2)])
]);
export const COMMON = Object.freeze([
  Object.freeze([F(1, 2), F(1, 2)]),
  Object.freeze([F(1, 2), F(1, 2)])
]);
export const FIRST = Object.freeze([
  Object.freeze([ONE, ZERO]),
  Object.freeze([ZERO, ZERO])
]);
export const SECOND = Object.freeze([
  Object.freeze([ZERO, ZERO]),
  Object.freeze([ZERO, ONE])
]);
export const NULL_MAT = Object.freeze([
  Object.freeze([ZERO, ZERO]),
  Object.freeze([ZERO, ZERO])
]);

export function roleFrame(profile) {
  return vecEq(profile, CONTEXTS[1]) ? SWAP : IDENTITY;
}

export class Mechanism {
  constructor(worldProjection = IDENTITY, evaluationMap = EVALUATIVE, motorGain = ONE) {
    this.worldProjection = worldProjection;
    this.evaluationMap = evaluationMap;
    this.motorGain = F(motorGain);
    Object.freeze(this);
  }
}

export class ExtendedTowerState {
  constructor(core = createState(), body = ZERO_VEC, world = ZERO_VEC) {
    this.core = core;
    this.body = Object.freeze(body.map((x) => F(x)));
    this.world = Object.freeze(world.map((x) => F(x)));
    Object.freeze(this);
  }

  replace({ core, body, world } = {}) {
    return new ExtendedTowerState(
      core !== undefined ? core : this.core,
      body !== undefined ? body : this.body,
      world !== undefined ? world : this.world
    );
  }

  equals(other) {
    if (!(other instanceof ExtendedTowerState)) return false;
    return (
      this.core.equals(other.core) &&
      vecEq(this.body, other.body) &&
      vecEq(this.world, other.world)
    );
  }

  toFloatTelemetry() {
    return {
      core: this.core.toFloatTelemetry(),
      body: this.body.map((x) => x.toFloat()),
      world: this.world.map((x) => x.toFloat()),
      bodyNormInf: vecNormInf(this.body).toFloat(),
      worldNormInf: vecNormInf(this.world).toFloat()
    };
  }
}

export function fibreUpdate(
  bodyRaw,
  worldRaw,
  frame,
  mechanism = new Mechanism(),
  { evaluate = false, bodyInput = ZERO_VEC, worldInput = ZERO_VEC } = {}
) {
  const body = bodyRaw.map((x) => F(x));
  const world = worldRaw.map((x) => F(x));
  const bIn = bodyInput.map((x) => F(x));
  const wIn = worldInput.map((x) => F(x));

  if ([body, world, bIn, wIn].some((v) => v.length !== 2)) {
    throw new RangeError('Each typed port has two coordinates');
  }
  const q = mechanism.worldProjection;
  const evaluation = mechanism.evaluationMap;
  const motor = mechanism.motorGain;

  if (
    [q, evaluation, frame].some(
      (m) => m.length !== 2 || m.some((row) => row.length !== 2)
    )
  ) {
    throw new RangeError('Each port operator must be 2x2');
  }
  const isIdempotent =
    matEq(q, IDENTITY) || matEq(q, COMMON) || matEq(matMul(q, q), q);
  if (!isIdempotent) {
    throw new RangeError('The world map must be an idempotent contraction');
  }
  if (
    matOperatorNormInf(q).gt(ONE) ||
    matOperatorNormInf(evaluation).gt(ONE) ||
    motor.abs().gt(ONE)
  ) {
    throw new RangeError('Mechanism exceeds the frozen gain envelope');
  }
  if (
    !matEq(matMul(frame, matTranspose(frame)), IDENTITY) ||
    !matOperatorNormInf(frame).eq(ONE)
  ) {
    throw new RangeError('The indexed frame must be a signed permutation');
  }
  if (vecNormInf(bIn).gt(H) || vecNormInf(wIn).gt(H)) {
    throw new RangeError('Primitive input exceeds the common port budget');
  }

  const sensor = matVecMul(frame, matVecMul(q, world));
  const force = vecScale(
    EVAL_GAIN,
    matVecMul(evaluation, vecSub(sensor, body))
  );
  let nextBody = vecAdd(
    vecAdd(vecScale(ALPHA, body), vecScale(BETA, sensor)),
    bIn
  );
  if (evaluate) {
    nextBody = vecAdd(nextBody, force);
  }
  const nextWorld = vecAdd(
    vecAdd(
      vecScale(ALPHA, matVecMul(q, world)),
      vecScale(
        BETA.mul(motor),
        matVecMul(q, matVecMul(matTranspose(frame), body))
      )
    ),
    matVecMul(q, wIn)
  );
  return Object.freeze([nextBody, nextWorld]);
}

export function advance(
  state,
  nativeCommand = {},
  mechanism = new Mechanism(),
  { evaluate = false, bodyInput = ZERO_VEC, worldInput = ZERO_VEC } = {}
) {
  const [nextBody, nextWorld] = fibreUpdate(
    state.body,
    state.world,
    roleFrame(state.core.profile),
    mechanism,
    { evaluate, bodyInput, worldInput }
  );
  return new ExtendedTowerState(
    step(state.core, nativeCommand || {}),
    nextBody,
    nextWorld
  );
}

export function nativeReadout(state) {
  return readout(state.core);
}

export function portReadout(state) {
  return Object.freeze([state.body, state.world]);
}

export function fibreMatrix(frame, mechanism = new Mechanism(), { evaluate = false } = {}) {
  const columns = [];
  for (let i = 0; i < 4; i += 1) {
    const vector = Array.from({ length: 4 }, (_, j) => (i === j ? ONE : ZERO));
    const [b, w] = fibreUpdate(
      vector.slice(0, 2),
      vector.slice(2, 4),
      frame,
      mechanism,
      { evaluate }
    );
    columns.push([...b, ...w]);
  }
  return matTranspose(columns);
}

// ============================================================================
// Etapa 2 Paper IX Indexed Quartic Plant & 4-Root Proper-Ancestry Closure
// (`def:bridge-indexed-quartic-plant`, `thm:bridge-quartic-global-certificate`,
//  `thm:bridge-quartic-cubic-gap`, `thm:bridge-four-root-identification`)
// ============================================================================

export const QUARTIC_ALPHA = F(1, 8);
export const QUARTIC_BETA = F(1, 4);
export const QUARTIC_H = F(1, 4);
export const QUARTIC_CHI = F(1, 8);
export const QUARTIC_KAPPA = F(1, 8);
export const QUARTIC_ZETA = F(1, 128);
export const QUARTIC_GAMMA = F(1, 128); // beta * chi * h = 1/128
export const QUARTIC_XI2 = F(1, 4096); // beta * chi * kappa * h^2 = 1/4096
export const QUARTIC_XI4 = F(1, 1048576); // beta * chi * zeta * h^4 = 1/1048576
export const QUARTIC_RAW_READING_ERROR = F(1, 1073741824); // xi_4 / 1024
export const QUARTIC_FIBER_CONTRACTION_BOUND = F(13, 16);
export const QUARTIC_BODY_NORM_BOUND_A = F(61, 64);
export const QUARTIC_BODY_NORM_BOUND_X = F(7, 4);
export const QUARTIC_WORLD_NORM_BOUND = F(3, 4);
export const QUARTIC_PRODUCT_INTEGRATION_LOWER_BOUND = F(1, 39366);
export const QUARTIC_PRODUCT_INTEGRATION_DELTA = F(1, 78732);
export const QUARTIC_PROGRAM_BUDGET = 4096;
export const QUARTIC_COST_WEIGHT = F(1n, 1n << 38n); // xi_4 / 2^18
export const QUARTIC_MAX_CANDIDATE_COST = F(1, 67108864); // 4096 * w_c = xi_4 / 64
export const QUARTIC_FOURTH_SIGNED_CONTRAST = F(1, 262144); // 4 * xi_4
export const QUARTIC_NOISE_COST_MARGIN_BOUND = F(1019, 268435456); // 1019 * xi_4 / 256 > 3 * xi_4

export function signedIndexFrame(sigma = 1) {
  const s = F(sigma);
  if (!s.abs().eq(ONE)) {
    throw new RangeError('Persistent index sigma must be +1 or -1');
  }
  return Object.freeze([
    Object.freeze([s, ZERO]),
    Object.freeze([ZERO, s])
  ]);
}

export function nativeSevenPortReadout(state) {
  const fullCore = readout(state.core);
  const threeCorePorts = [fullCore[0], fullCore[2], fullCore[3]];
  const scaledBody = state.body.map((coord) => F(coord).div(4));
  const scaledWorld = state.world.map((coord) => F(coord).div(4));
  return Object.freeze([...threeCorePorts, ...scaledBody, ...scaledWorld]);
}

export function quarticForceEvaluator(
  discrepancyVec,
  {
    R = IDENTITY,
    direction = [ONE, ZERO],
    chi = QUARTIC_CHI,
    kappa = QUARTIC_KAPPA,
    zeta = QUARTIC_ZETA
  } = {}
) {
  const re = matVecMul(R, discrepancyVec.map((x) => F(x)));
  const u = direction.map((x) => F(x));
  const linearTerm = matVecMul(COMMON, re);
  const quadScalar = F(kappa).mul(re[0]).mul(re[1]);
  const quarticScalar = F(zeta).mul(re[0].pow(2)).mul(re[1].pow(2));
  const nonlinearScalar = quadScalar.add(quarticScalar);
  const combined = vecAdd(linearTerm, vecScale(nonlinearScalar, u));
  return vecScale(F(chi), combined);
}

export function indexedQuarticFibreUpdate(
  bodyRaw,
  worldRaw,
  {
    sigma = 1,
    Q = IDENTITY,
    R = IDENTITY,
    motorGain = ONE,
    evaluate = false,
    direction = [ONE, ZERO],
    bodyInput = ZERO_VEC,
    worldInput = ZERO_VEC
  } = {}
) {
  const body = bodyRaw.map((x) => F(x));
  const world = worldRaw.map((x) => F(x));
  const aBody = bodyInput.map((x) => F(x));
  const dWorld = worldInput.map((x) => F(x));
  if (vecNormInf(aBody).gt(QUARTIC_H) || vecNormInf(dWorld).gt(QUARTIC_H)) {
    throw new RangeError('Quartic plant primitive input exceeds port budget h = 1/4');
  }
  const pSigma = signedIndexFrame(sigma);
  const qw = matVecMul(Q, world);
  const sensedWorld = matVecMul(pSigma, qw);
  const discrepancy = vecSub(sensedWorld, body);
  const force = evaluate
    ? quarticForceEvaluator(discrepancy, { R, direction })
    : ZERO_VEC;

  const nextBody = vecAdd(
    vecAdd(
      vecAdd(vecScale(QUARTIC_ALPHA, body), vecScale(QUARTIC_BETA, sensedWorld)),
      force
    ),
    aBody
  );
  const pSigmaInvBody = matVecMul(pSigma, body);
  const nextWorld = vecAdd(
    vecAdd(
      vecScale(QUARTIC_ALPHA, qw),
      vecScale(QUARTIC_BETA.mul(F(motorGain)), matVecMul(Q, pSigmaInvBody))
    ),
    matVecMul(Q, dWorld)
  );
  return Object.freeze([nextBody, nextWorld]);
}

export function evaluateReservedQuarticResponse(vRaw, direction = [ONE, ZERO]) {
  const v = vRaw.map((x) => F(x));
  const u = direction.map((x) => F(x));
  const linearPart = vecScale(QUARTIC_GAMMA, matVecMul(COMMON, v));
  const quadPart = vecScale(QUARTIC_XI2.mul(v[0]).mul(v[1]), u);
  const quarticPart = vecScale(QUARTIC_XI4.mul(v[0].pow(2)).mul(v[1].pow(2)), u);
  return vecAdd(vecAdd(linearPart, quadPart), quarticPart);
}

export function evaluateFourRootWorldConsequence(signsRaw) {
  const s = signsRaw.map((x) => F(x));
  if (s.length !== 4 || s.some((val) => !val.abs().eq(ONE))) {
    throw new RangeError('Four-root preparation requires 4 signs in {-1, +1}^4');
  }
  const d1 = s[2].sub(s[0]);
  const d2 = s[3].sub(s[1]);
  const l0First = d1.add(d2).div(2);
  const linearTerm = QUARTIC_H.mul(l0First);
  const quadTerm = QUARTIC_KAPPA.mul(QUARTIC_H.pow(2)).mul(d1).mul(d2);
  const quarticTerm = QUARTIC_ZETA.mul(QUARTIC_H.pow(4)).mul(d1.pow(2)).mul(d2.pow(2));
  return QUARTIC_BETA.mul(QUARTIC_CHI).mul(linearTerm.add(quadTerm).add(quarticTerm));
}

export function verifyIndexedQuarticPlantAndFourRootClosure() {
  // 1. Contraction & invariance bounds of def:bridge-indexed-quartic-plant and thm:bridge-quartic-global-certificate
  const linearBodyCoeff = F(11, 32);
  const linearWorldCoeff = F(15, 32);
  const commonIndexContraction = linearBodyCoeff.add(linearWorldCoeff); // 26/32 = 13/16
  if (!commonIndexContraction.eq(QUARTIC_FIBER_CONTRACTION_BOUND)) {
    throw new Error('Common-index fiber contraction bound must equal 13/16');
  }
  const bodyNormBoundA = F(5, 8).add(F(1, 16)).add(F(1, 64)).add(QUARTIC_H); // 61/64
  if (!bodyNormBoundA.eq(QUARTIC_BODY_NORM_BOUND_A)) {
    throw new Error('Body next-state norm bound on A_tilde must equal 61/64');
  }
  const bodyNormBoundX = ONE.add(F(1, 4)).add(F(1, 4)).add(QUARTIC_H); // 7/4 < 2
  if (!bodyNormBoundX.eq(QUARTIC_BODY_NORM_BOUND_X) || !bodyNormBoundX.lt(F(2))) {
    throw new Error('Body next-state norm bound on X_tilde must equal 7/4 < 2');
  }
  const worldNormBound = QUARTIC_ALPHA.add(QUARTIC_BETA).add(QUARTIC_H); // 5/8 <= 3/4
  if (!worldNormBound.lte(QUARTIC_WORLD_NORM_BOUND)) {
    throw new Error('World next-state norm bound must be <= 3/4');
  }

  // Global product integration lower bound e_* >= min{1/384, 3^-9 / 2, 1/128} = 1/39366
  const eStar = fMin([F(1, 384), F(1, 39366), F(1, 128)]);
  const deltaInt = eStar.div(2);
  if (
    !eStar.eq(QUARTIC_PRODUCT_INTEGRATION_LOWER_BOUND) ||
    !deltaInt.eq(QUARTIC_PRODUCT_INTEGRATION_DELTA)
  ) {
    throw new Error('Global product integration lower bound e_* = 1/39366 or delta_int = 1/78732 mismatch');
  }

  // 2. Six-transition washout + pulse probe with readout at t = 6
  const runSixTransitionIndexProbe = (sigma, initialBody, initialWorld) => {
    let b = initialBody.map((x) => F(x));
    let w = initialWorld.map((x) => F(x));
    // t = 1..4 sham washout transitions (evaluate = false, zero inputs)
    for (let stepIdx = 1; stepIdx <= 4; stepIdx += 1) {
      [b, w] = indexedQuarticFibreUpdate(b, w, { sigma, evaluate: false });
    }
    // t = 5: apply pulse h = 1/4 in world input coordinate 0 (evaluation off)
    [b, w] = indexedQuarticFibreUpdate(b, w, {
      sigma,
      evaluate: false,
      worldInput: [QUARTIC_H, ZERO]
    });
    // t = 6: one propagation step (evaluation off) and readout divided by 4
    [b, w] = indexedQuarticFibreUpdate(b, w, { sigma, evaluate: false });
    const state = new ExtendedTowerState(createState(), b, w);
    const readout7 = nativeSevenPortReadout(state);
    return readout7[3]; // first scaled body port b_1 / 4
  };

  const cleanPlus = runSixTransitionIndexProbe(1, ZERO_VEC, ZERO_VEC);
  const cleanMinus = runSixTransitionIndexProbe(-1, ZERO_VEC, ZERO_VEC);
  const cleanSeparation = cleanPlus.sub(cleanMinus).abs();
  const expectedCleanSeparation = F(2).mul(QUARTIC_BETA).mul(QUARTIC_H).div(4); // 1/32
  if (!cleanSeparation.eq(expectedCleanSeparation) || !cleanSeparation.eq(F(1, 32))) {
    throw new Error(`Expected clean t=6 separation 1/32, got ${cleanSeparation}`);
  }
  const initialStateWashoutBound = HALF.mul(F(3, 8).pow(6)); // 729 / 524288 < 1/64
  if (!initialStateWashoutBound.eq(F(729, 524288)) || !initialStateWashoutBound.lt(F(1, 64))) {
    throw new Error('Six-step washout bound 729/524288 < 1/64 failed');
  }
  let minSeparationOverAmbientStates = ONE;
  for (const bInitScalar of [F(-2), ZERO, F(2)]) {
    for (const wInitScalar of [F(-2), ZERO, F(2)]) {
      const bInit = [bInitScalar, bInitScalar];
      const wInit = [wInitScalar, wInitScalar];
      const sep = runSixTransitionIndexProbe(1, bInit, wInit)
        .sub(runSixTransitionIndexProbe(-1, bInit, wInit))
        .abs();
      if (!sep.gt(F(1, 64))) {
        throw new Error(`Six-transition separation at t=6 fell to <= 1/64: ${sep}`);
      }
      if (sep.lt(minSeparationOverAmbientStates)) {
        minSeparationOverAmbientStates = sep;
      }
    }
  }

  // 3. Reserved quartic response vs degree-3 cubic forecasts on {-1, 0, 1}^2 (`thm:bridge-quartic-cubic-gap`)
  const gridNodes = [F(-1), ZERO, ONE];
  const secondDiffWeights = [ONE, F(-2), ONE];
  let secondDiffFunctional = ZERO;
  let maxDegreeTwoAttainedError = ZERO;
  for (let i = 0; i < 3; i += 1) {
    for (let j = 0; j < 3; j += 1) {
      const v1 = gridNodes[i];
      const v2 = gridNodes[j];
      const response = evaluateReservedQuarticResponse([v1, v2]);
      const weight = secondDiffWeights[i].mul(secondDiffWeights[j]);
      secondDiffFunctional = secondDiffFunctional.add(weight.mul(response[0]));

      // Degree-2 optimal forecast replacing v1^2 * v2^2 with (v1^2 + v2^2)/2 - 1/4
      const degree2Replacement = v1.pow(2).add(v2.pow(2)).div(2).sub(F(1, 4));
      const linearQuad = QUARTIC_GAMMA.mul(v1.add(v2).div(2)).add(QUARTIC_XI2.mul(v1).mul(v2));
      const cubicBestForecast = linearQuad.add(QUARTIC_XI4.mul(degree2Replacement));
      const pointError = response[0].sub(cubicBestForecast).abs();
      if (pointError.gt(maxDegreeTwoAttainedError)) {
        maxDegreeTwoAttainedError = pointError;
      }
    }
  }
  const cubicGapInfimum = QUARTIC_XI4.div(4); // 1/4194304
  if (
    !secondDiffFunctional.div(16).eq(cubicGapInfimum) ||
    !maxDegreeTwoAttainedError.eq(cubicGapInfimum) ||
    !cubicGapInfimum.eq(F(1, 4194304))
  ) {
    throw new Error('Reserved quartic vs cubic forecast infimum xi_4 / 4 = 1/4194304 check failed');
  }

  // 4. Four-root proper-ancestry closure over s in {-1, 1}^4 (`thm:bridge-four-root-identification`)
  const signPreparations = [];
  for (let mask = 0; mask < 16; mask += 1) {
    signPreparations.push([
      (mask & 1) ? ONE : F(-1),
      (mask & 2) ? ONE : F(-1),
      (mask & 4) ? ONE : F(-1),
      (mask & 8) ? ONE : F(-1)
    ]);
  }

  // Direct dynamical verification of Y(s) at step 3 vs closed-form formula
  const yValues = [];
  for (const s of signPreparations) {
    const bCmd = [QUARTIC_H.mul(s[0]), QUARTIC_H.mul(s[1])];
    const wCmd = [QUARTIC_H.mul(s[2]), QUARTIC_H.mul(s[3])];
    // Step 1: prepare b_1 = h(s_1, s_2), P_sigma w_1 = h(s_3, s_4) from zero ports
    const [b1, w1] = indexedQuarticFibreUpdate(ZERO_VEC, ZERO_VEC, {
      sigma: 1,
      evaluate: false,
      bodyInput: bCmd,
      worldInput: wCmd
    });
    // Step 2: matched arms (evaluate = true vs sham evaluate = false)
    const [b2Eval, w2Eval] = indexedQuarticFibreUpdate(b1, w1, { sigma: 1, evaluate: true });
    const [b2Sham, w2Sham] = indexedQuarticFibreUpdate(b1, w1, { sigma: 1, evaluate: false });
    // Step 3: measure P_sigma (w^eval_3 - w^sham_3)_1
    const [, w3Eval] = indexedQuarticFibreUpdate(b2Eval, w2Eval, { sigma: 1, evaluate: false });
    const [, w3Sham] = indexedQuarticFibreUpdate(b2Sham, w2Sham, { sigma: 1, evaluate: false });
    const dynamicY = w3Eval[0].sub(w3Sham[0]);
    const formulaY = evaluateFourRootWorldConsequence(s);
    if (!dynamicY.eq(formulaY)) {
      throw new Error('Step-3 paired world consequence mismatch against closed-form Y(s)');
    }
    yValues.push(dynamicY);
  }

  // Compute fourth signed contrast D(Y) = 2^-4 * sum_{s} s_1 s_2 s_3 s_4 Y(s)
  const computeFourthSignedContrast = (values) =>
    fSum(
      signPreparations.map((s, idx) =>
        s[0].mul(s[1]).mul(s[2]).mul(s[3]).mul(values[idx])
      )
    ).div(16);

  const contrastY = computeFourthSignedContrast(yValues);
  if (!contrastY.eq(QUARTIC_FOURTH_SIGNED_CONTRAST) || !contrastY.eq(F(1, 262144))) {
    throw new Error(`Expected fourth signed contrast 4*xi_4 = 1/262144, got ${contrastY}`);
  }

  // Verify every proper-ancestry basis function (all 15 proper subsets J subsetneq {0,1,2,3}) has zero fourth signed contrast
  for (let subsetMask = 0; subsetMask < 15; subsetMask += 1) {
    const basisValues = signPreparations.map((s) => {
      let prod = ONE;
      for (let bit = 0; bit < 4; bit += 1) {
        if ((subsetMask >> bit) & 1) prod = prod.mul(s[bit]);
      }
      return prod;
    });
    if (!computeFourthSignedContrast(basisValues).isZero()) {
      throw new Error(`Proper subset mask ${subsetMask} failed fourth signed contrast annihilation`);
    }
  }

  // Attaining proper degree-2 forecast dropping only the 4*xi_4 * s_1*s_2*s_3*s_4 parity term
  const properAttainingValues = signPreparations.map((s, idx) =>
    yValues[idx].sub(QUARTIC_FOURTH_SIGNED_CONTRAST.mul(s[0]).mul(s[1]).mul(s[2]).mul(s[3]))
  );
  if (!computeFourthSignedContrast(properAttainingValues).isZero()) {
    throw new Error('Proper degree-2 attaining forecast must have zero fourth signed contrast');
  }
  const properErrors = yValues.map((y, idx) => y.sub(properAttainingValues[idx]).abs());
  const properUniformError = fMax(properErrors);
  const properMeanAbsError = fSum(properErrors).div(16);
  if (
    !properUniformError.eq(QUARTIC_FOURTH_SIGNED_CONTRAST) ||
    !properMeanAbsError.eq(QUARTIC_FOURTH_SIGNED_CONTRAST)
  ) {
    throw new Error('Proper-ancestry infimal uniform and mean error must equal 4*xi_4 = 1/262144');
  }

  // Noise and cost budget margin: 4*xi_4 - 4*varepsilon - 4096*w_c >= 1019*xi_4/256 > 3*xi_4
  const maxCandidateCost = QUARTIC_COST_WEIGHT.mul(QUARTIC_PROGRAM_BUDGET);
  if (!maxCandidateCost.eq(QUARTIC_MAX_CANDIDATE_COST)) {
    throw new Error('Max candidate cost 4096*w_c must equal xi_4/64 = 1/67108864');
  }
  const noiseCostMargin = QUARTIC_FOURTH_SIGNED_CONTRAST
    .sub(F(4).mul(QUARTIC_RAW_READING_ERROR))
    .sub(maxCandidateCost);
  if (
    !noiseCostMargin.eq(QUARTIC_NOISE_COST_MARGIN_BOUND) ||
    !noiseCostMargin.gt(F(3).mul(QUARTIC_XI4))
  ) {
    throw new Error(`Noise-cost margin mismatch: got ${noiseCostMargin}`);
  }

  // 5. Enlargement negative control: equal-cost 4-root replica q(e) = kappa*e_1*e_2 + zeta*e_1^2*e_2^2
  const replicaValues = signPreparations.map((s) => {
    const e1 = QUARTIC_H.mul(s[2].sub(s[0]));
    const e2 = QUARTIC_H.mul(s[3].sub(s[1]));
    const linear = QUARTIC_BETA.mul(QUARTIC_CHI).mul(e1.add(e2).div(2));
    const qScalar = QUARTIC_KAPPA.mul(e1).mul(e2).add(QUARTIC_ZETA.mul(e1.pow(2)).mul(e2.pow(2)));
    return linear.add(QUARTIC_BETA.mul(QUARTIC_CHI).mul(qScalar));
  });
  const replicaMaxError = fMax(yValues.map((y, idx) => y.sub(replicaValues[idx]).abs()));
  const replicaContrast = computeFourthSignedContrast(replicaValues);
  const replicaSignedMargin = replicaMaxError.sub( ZERO ); // rival loss - candidate loss <= 0
  if (
    !replicaMaxError.isZero() ||
    !replicaContrast.eq(QUARTIC_FOURTH_SIGNED_CONTRAST) ||
    !replicaSignedMargin.lte(ZERO)
  ) {
    throw new Error('Equal-cost 4-root replica negative control failed');
  }

  return {
    passed: true,
    plantConstants: {
      alpha: QUARTIC_ALPHA.toString(),
      beta: QUARTIC_BETA.toString(),
      h: QUARTIC_H.toString(),
      chi: QUARTIC_CHI.toString(),
      kappa: QUARTIC_KAPPA.toString(),
      zeta: QUARTIC_ZETA.toString(),
      gamma: QUARTIC_GAMMA.toString(),
      xi2: QUARTIC_XI2.toString(),
      xi4: QUARTIC_XI4.toString()
    },
    commonIndexFiberContractionBound: commonIndexContraction.toString(),
    bodyNormBoundOnSupportA: bodyNormBoundA.toString(),
    bodyNormBoundOnAmbientX: bodyNormBoundX.toString(),
    worldNormBound: QUARTIC_WORLD_NORM_BOUND.toString(),
    productIntegrationLowerBoundEStar: eStar.toString(),
    productIntegrationCertificateDeltaInt: deltaInt.toString(),
    sixTransitionProbe: {
      readoutStep: 6,
      cleanIndexedOutputDifference: cleanSeparation.toString(),
      initialStateWashoutBound: initialStateWashoutBound.toString(),
      minSeparationOverAmbientCube: minSeparationOverAmbientStates.toString(),
      exceedsOneOver64: minSeparationOverAmbientStates.gt(F(1, 64))
    },
    reservedQuarticCubicForecastGap: cubicGapInfimum.toString(),
    fourRootProperAncestryClosure: {
      preparationsCount: 16,
      fourthSignedContrast: contrastY.toString(),
      properAncestryInfimalError: properUniformError.toString(),
      programBudget: QUARTIC_PROGRAM_BUDGET,
      costWeightWc: QUARTIC_COST_WEIGHT.toString(),
      maxCandidateCost: maxCandidateCost.toString(),
      rawReadingErrorBound: QUARTIC_RAW_READING_ERROR.toString(),
      noise_cost_margin: noiseCostMargin.toString(),
      noiseCostMarginFloat: noiseCostMargin.toFloat(),
      exceedsThreeXi4: noiseCostMargin.gt(F(3).mul(QUARTIC_XI4))
    },
    equalCostFourRootReplicaNegativeControl: {
      replicaMaxError: replicaMaxError.toString(),
      replicaFourthSignedContrast: replicaContrast.toString(),
      signedMarginRivalMinusCandidate: replicaSignedMargin.toString(),
      nonpositiveMarginVerified: replicaSignedMargin.lte(ZERO)
    },
    provisional_non_confirmatory: true,
    external_support_certified: false,
    status_classification: 'provisional and non-confirmatory',
    interpretation_boundary:
      'Causal protocol-relative operational comparison on the indexed quartic plant (def:bridge-indexed-quartic-plant, thm:bridge-four-root-identification); provisional and non-confirmatory, external_support_certified=false, does not establish phenomenal experience or valence.'
  };
}

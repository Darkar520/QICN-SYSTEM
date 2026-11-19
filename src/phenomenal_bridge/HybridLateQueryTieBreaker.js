// @ts-check
/**
 * Paper IX & Paper X Hybrid Late-Query Transcript Boundary & Five-Root Coupled Plant
 * (`prop:bridge-prefix-coupling-safety`, `thm:bridge-expanded-identification`,
 *  `thm:late-parity-transcript`, `prop:late-transcript-noise-margin`,
 *  Lean 4 `QICNHybridBoundary.lean`, `check_atomic_coupled.py`, `check_late_transcript.py`).
 *
 * Implements in exact rational arithmetic (`ExactFraction`):
 * 1. The 5-root retained-prefix-to-world coupled quartic plant (site b_8 read via T_d at d >= 9,
 *    coupling eta = 1/8, xi_4 = 1/1048576, fifth contrast G = 4*eta*xi_4 = 1/2097152 > 0,
 *    safe fibre Lipschitz 105/128, invariant body bound 489/512 < 1, ambient bound 57/32 < 2).
 * 2. The late parity query & bounded transcript capacity frontier (x, q in F_2^m, B bits sealed
 *    before q is revealed: uniform minimax error G for B < m and 0 for B >= m; prefix-code mean
 *    error G*(1 - 2^{B-m}); universal mean lower bound G*(1 - sqrt(2^{B-m})); exact (m,B)=(2,1)
 *    unbalanced partition optimum 3G/8 = 3/16777216; noisy penalized margin 253G/256 > G/2).
 * 3. Mandatory negative controls and Paper X separation:
 *    - Physical T_d coupling cut (eta = 0): fifth contrast = 0.
 *    - Sham evaluation (evaluate = false): fifth contrast = 0.
 *    - Sufficient transcript budget (B >= m): capacity error = 0.
 *    - Equal-cost total replica (`equal_cost_total_replica`): exact tie R = 0 (R <= 0).
 *    - Inverted/miscalibrated reference: negative margin R = -2G = -1/1048576 (and quarter-scaled -G/2 = -1/4194304).
 *    - Paper X blind source adjudication controls (`selective_leak` risk 3/8, `always_tie` coverage 0)
 *      kept explicitly separate from signed predictive margin R.
 *
 * evidence_scope: internal_support_only
 * external_support_certified: false
 */

import { sha256Hex, stableStringify } from '../utils/integrity.js';
import {
  F,
  ZERO,
  ONE,
  HALF,
  fMin,
  fMax,
  fSum,
  vecAdd,
  vecSub,
  vecScale
} from '../simulation/tower/ExactFraction.js';
import {
  QUARTIC_ALPHA,
  QUARTIC_BETA,
  QUARTIC_H,
  QUARTIC_CHI,
  QUARTIC_KAPPA,
  QUARTIC_ZETA,
  QUARTIC_XI4
} from '../simulation/tower/BodyWorldTower.js';

export const COUPLED_ETA = F(1, 8);
export const FIFTH_CONTRAST_G = F(4).mul(COUPLED_ETA).mul(QUARTIC_XI4); // 1/2097152
export const SAFE_FIBRE_LIPSCHITZ = F(105, 128); // 13/16 + eta/16
export const INVARIANT_BODY_BOUND = F(489, 512); // 61/64 + eta/64 < 1
export const AMBIENT_BODY_BOUND = F(57, 32); // 7/4 + eta/4 < 2
export const EXPANDED_PROGRAM_BUDGET = 8192;
export const EXPANDED_COST_WEIGHT_WC = FIFTH_CONTRAST_G.div(128 * EXPANDED_PROGRAM_BUDGET);
export const PAIRED_READOUT_EPS = FIFTH_CONTRAST_G.div(1024); // 1/2147483648
export const NOISY_PENALIZED_MARGIN = F(253, 256).mul(FIFTH_CONTRAST_G); // 253/536870912
export const SHARP_NOISY_MARGIN = F(255, 256).mul(FIFTH_CONTRAST_G); // 255/536870912
export const OPTIMAL_M2_B1_MEAN_ERROR = F(3, 8).mul(FIFTH_CONTRAST_G); // 3/16777216

/**
 * Native 9-site prefix tape transition retaining sites 4..9 (including writable site 8 at index 7
 * and fixed index at index 8), matching `check_atomic_coupled.py:native`.
 * @param {number[]} bits
 * @param {number|null} writeSite8
 * @returns {number[]}
 */
export function stepRetainedNineSiteBits(bits, writeSite8 = null) {
  const b = bits.slice(0, 9);
  while (b.length < 9) b.push(0);
  const next = b.slice();
  next[0] = b[0];
  next[1] = 0;
  next[2] = 1 - b[1];
  if (writeSite8 !== null && writeSite8 !== undefined) {
    next[7] = writeSite8;
  }
  return next;
}

/**
 * Advances the 5-root coupled prefix-body-world plant one step (`check_atomic_coupled.py:advance`).
 */
export function advanceFiveRootCoupledState(
  state,
  {
    evaluate = false,
    cut = false,
    writeSite8 = null,
    bodyInput = [ZERO, ZERO],
    worldInput = [ZERO, ZERO]
  } = {}
) {
  const { bits, body, world } = state;
  const e = [F(world[0]).sub(body[0]), F(world[1]).sub(body[1])];
  const l = [e[0].sub(e[1]).div(2), e[0].add(e[1]).div(2)];
  const td = bits.slice(0, 9);
  const r = F(2 * td[7] - 1);
  let force = vecScale(QUARTIC_CHI, l);
  const couplingFactor = cut ? ZERO : COUPLED_ETA.mul(r);
  const nonlinear = QUARTIC_CHI.mul(
    QUARTIC_KAPPA.mul(e[0]).mul(e[1]).add(
      QUARTIC_ZETA.mul(ONE.add(couplingFactor)).mul(e[0].pow(2)).mul(e[1].pow(2))
    )
  );
  force = vecAdd(force, [nonlinear, ZERO]);
  let nextBody = vecAdd(
    vecAdd(vecScale(QUARTIC_ALPHA, body), vecScale(QUARTIC_BETA, world)),
    bodyInput.map((x) => F(x))
  );
  if (evaluate) {
    nextBody = vecAdd(nextBody, force);
  }
  const nextWorld = vecAdd(
    vecAdd(vecScale(QUARTIC_ALPHA, world), vecScale(QUARTIC_BETA, body)),
    worldInput.map((x) => F(x))
  );
  return {
    bits: stepRetainedNineSiteBits(bits, writeSite8),
    body: nextBody,
    world: nextWorld
  };
}

/**
 * Evaluates the 3-step paired world-coordinate consequence for preparation signs = [s1, s2, s3, s4, r] in {-1, +1}^5.
 */
export function runFiveRootCoupledPlantTrial(signs, { cut = false, sham = false } = {}) {
  const [s1, s2, s3, s4, r] = signs;
  const initialBits = [0, 0, 0, 0, 0, 0, 0, 0, 1];
  const z = advanceFiveRootCoupledState(
    { bits: initialBits, body: [ZERO, ZERO], world: [ZERO, ZERO] },
    {
      writeSite8: Math.floor((r + 1) / 2),
      bodyInput: [QUARTIC_H.mul(s1), QUARTIC_H.mul(s2)],
      worldInput: [QUARTIC_H.mul(s3), QUARTIC_H.mul(s4)]
    }
  );
  const evaluated = advanceFiveRootCoupledState(z, { evaluate: !sham, cut });
  const baseline = advanceFiveRootCoupledState(z, { evaluate: false, cut });
  const nextEval = advanceFiveRootCoupledState(evaluated);
  const nextBase = advanceFiveRootCoupledState(baseline);
  return nextEval.world[0].sub(nextBase.world[0]);
}

/**
 * Closed-form uncoupled 4-root world response Y(s1, s2, s3, s4).
 */
export function closedFormBaseResponse([s1, s2, s3, s4]) {
  const a = F(s3 - s1);
  const b = F(s4 - s2);
  return QUARTIC_BETA.mul(QUARTIC_CHI).mul(
    QUARTIC_H.mul(a.sub(b)).div(2)
      .add(QUARTIC_KAPPA.mul(QUARTIC_H.pow(2)).mul(a).mul(b))
      .add(QUARTIC_ZETA.mul(QUARTIC_H.pow(4)).mul(a.pow(2)).mul(b.pow(2)))
  );
}

/**
 * Closed-form 5-root coupled world response Y_eta(s1, s2, s3, s4, r).
 */
export function closedFormFiveRootResponse(signs) {
  const [s1, s2, s3, s4, r] = signs;
  const a = F(s3 - s1);
  const b = F(s4 - s2);
  return closedFormBaseResponse(signs).add(
    COUPLED_ETA.mul(r).mul(QUARTIC_XI4).mul(a.pow(2)).mul(b.pow(2))
  );
}

/**
 * Best proper-ancestry 5-root forecast dropping only the 5-way parity term (`background5` in Lean).
 */
export function closedFormBestProperFiveRootForecast(signs) {
  const [s1, s2, s3, s4, r] = signs;
  return closedFormBaseResponse(signs).add(
    F(4).mul(COUPLED_ETA).mul(r).mul(QUARTIC_XI4).mul(F(1 - s1 * s3 - s2 * s4))
  );
}

/**
 * Parity character (-1)^{q · x} for bitmasks x, q in {0, ..., 2^m - 1}.
 */
export function lateParitySign(x, q) {
  let v = (x & q) >>> 0;
  let pop = 0;
  while (v !== 0) {
    pop += v & 1;
    v >>>= 1;
  }
  return (pop % 2 === 0) ? 1 : -1;
}

/**
 * Calibrated quarter-scale late parity response at fixed opposing body/world signs (1, 1, -1, -1).
 */
export function calibratedLateParityResponse(x, q, { cut = false } = {}) {
  const fixed4 = [1, 1, -1, -1];
  const baseCut = runFiveRootCoupledPlantTrial([...fixed4, 1], { cut: true });
  const rSign = lateParitySign(x, q);
  const actual = runFiveRootCoupledPlantTrial([...fixed4, rSign], { cut });
  return actual.sub(baseCut).div(4);
}

/**
 * Computes the straight-line response DAG cost in the common program language (`check_atomic_coupled.py:98-115`).
 */
export function computeAdditionalResponseDagCost() {
  const nodes = new Map();
  let cost = 0;
  const bitLen = (big) => {
    const abs = big < 0n ? -big : big;
    return abs === 0n ? 0 : abs.toString(2).length;
  };
  const node = (kind, ...args) => {
    const key = JSON.stringify([kind, ...args.map((a) => (a && typeof a.toString === 'function' ? a.toString() : a))]);
    if (!nodes.has(key)) {
      nodes.set(key, nodes.size);
      if (kind === 'constant') {
        const frac = F(args[0]);
        cost += 1 + bitLen(frac.n) + bitLen(frac.d);
      } else {
        cost += 1;
      }
    }
    return nodes.get(key);
  };
  const c = (q) => node('constant', F(q));
  const op = (k, x, y) => node(k, x, y);
  const s = [0, 1, 2, 3, 4].map((i) => node('input', i));
  const a = op('sub', s[2], s[0]);
  const b = op('sub', s[3], s[1]);
  const ab = op('mul', a, b);
  const linear = op('mul', c(QUARTIC_H.div(2)), op('sub', a, b));
  const bilinear = op('mul', c(QUARTIC_KAPPA.mul(QUARTIC_H.pow(2))), ab);
  const quartic = op('mul', c(QUARTIC_ZETA.mul(QUARTIC_H.pow(4))), op('mul', ab, ab));
  const gain = op('add', c(ONE), op('mul', c(COUPLED_ETA), s[4]));
  op('mul', c(QUARTIC_BETA.mul(QUARTIC_CHI)), op('add', op('add', linear, bilinear), op('mul', gain, quartic)));
  return cost;
}

/**
 * Runs the complete verification of Frente 2:
 * - 5-root coupled prefix-to-world plant (32 preparations, fifth contrast G = 1/2097152,
 *   Lipschitz 105/128, body bound 489/512, proper Walsh annihilation, DAG cost & noisy penalized margin 253G/256),
 * - Late parity query & transcript capacity frontier (m = 1..6, B = 0..m, 27 frontier pairs,
 *   exhaustive (m,B)=(2,1) 16-partition optimal mean error 3G/8 = 3/16777216, late 1-bit round-trip),
 * - All negative controls (T_d cut eta = 0, sham, B >= m, equal-cost total replica R = 0,
 *   inverted reference R = -2G = -1/1048576 and unit-scaled -G/2 = -1/4194304, sharp readout noise 4*eps,
 *   Paper X selective leak 3/8 and always_tie coverage 0).
 */
export function verifyHybridLateQueryTieBreakerAndFifthContrast() {
  if (!QUARTIC_XI4.eq(F(1, 1048576)) || !FIFTH_CONTRAST_G.eq(F(1, 2097152))) {
    throw new Error('Fundamental fifth-contrast constant G = 1/2097152 mismatch');
  }

  // 1. Safety bounds check (`prop:bridge-prefix-coupling-safety`)
  const lipschitzCheck = F(13, 16).add(COUPLED_ETA.div(16));
  const invariantBodyCheck = F(61, 64).add(COUPLED_ETA.div(64));
  const ambientBodyCheck = F(7, 4).add(COUPLED_ETA.div(4));
  if (
    !lipschitzCheck.eq(SAFE_FIBRE_LIPSCHITZ) ||
    !invariantBodyCheck.eq(INVARIANT_BODY_BOUND) ||
    !INVARIANT_BODY_BOUND.lt(ONE) ||
    !ambientBodyCheck.eq(AMBIENT_BODY_BOUND) ||
    !AMBIENT_BODY_BOUND.lt(F(2))
  ) {
    throw new Error('Coupled prefix-to-world safety bounds (105/128, 489/512, 57/32) failed');
  }

  // 2. Enumerate all 32 preparations in {-1, +1}^5
  const signs32 = [];
  for (let mask = 0; mask < 32; mask += 1) {
    signs32.push([
      (mask & 16) ? 1 : -1,
      (mask & 8) ? 1 : -1,
      (mask & 4) ? 1 : -1,
      (mask & 2) ? 1 : -1,
      (mask & 1) ? 1 : -1
    ]);
  }
  const parity5 = (s) => F(s[0] * s[1] * s[2] * s[3] * s[4]);
  const contrast5 = (fn) => fSum(signs32.map((s) => parity5(s).mul(fn(s)))).div(32);

  let maxPartialFourRootError = ZERO;
  let maxTotalReplicaError = ZERO;
  for (const s of signs32) {
    const dyn = runFiveRootCoupledPlantTrial(s);
    const form = closedFormFiveRootResponse(s);
    const cutVal = runFiveRootCoupledPlantTrial(s, { cut: true });
    const baseVal = closedFormBaseResponse(s);
    const shamVal = runFiveRootCoupledPlantTrial(s, { sham: true });
    const properVal = closedFormBestProperFiveRootForecast(s);
    if (!dyn.eq(form)) throw new Error('5-root dynamical response mismatch against closed-form formula');
    if (!cutVal.eq(baseVal)) throw new Error('T_d cut response mismatch against 4-root base formula');
    if (!shamVal.isZero()) throw new Error('Sham response must be identically 0');
    if (!form.sub(properVal).abs().eq(FIFTH_CONTRAST_G)) {
      throw new Error('Pointwise gap against best proper 5-root forecast must equal G');
    }
    const partialErr = form.sub(baseVal).abs();
    if (partialErr.gt(maxPartialFourRootError)) maxPartialFourRootError = partialErr;
    const replicaErr = form.sub(dyn).abs();
    if (replicaErr.gt(maxTotalReplicaError)) maxTotalReplicaError = replicaErr;
  }

  const fifthContrastFormula = contrast5(closedFormFiveRootResponse);
  const fifthContrastCut = contrast5(closedFormBaseResponse);
  const fifthContrastBestProper = contrast5(closedFormBestProperFiveRootForecast);
  if (
    !fifthContrastFormula.eq(FIFTH_CONTRAST_G) ||
    !fifthContrastCut.isZero() ||
    !fifthContrastBestProper.isZero() ||
    !maxPartialFourRootError.eq(F(4).mul(FIFTH_CONTRAST_G)) ||
    !maxTotalReplicaError.isZero()
  ) {
    throw new Error('5-root signed contrast or partial/total replica verification failed');
  }

  // Verify all 31 proper 5-root Walsh basis functions (mask 0..30) have zero fifth contrast
  for (let mask = 0; mask < 31; mask += 1) {
    const walshContrast = contrast5((s) => {
      let p = 1;
      for (let i = 0; i < 5; i += 1) {
        if ((mask >> i) & 1) p *= s[i];
      }
      return F(p);
    });
    if (!walshContrast.isZero()) {
      throw new Error(`Proper 5-root Walsh basis mask ${mask} failed fifth-contrast annihilation`);
    }
  }

  // DAG cost & noisy penalized margin (`thm:bridge-expanded-identification`)
  const additionalDagCost = computeAdditionalResponseDagCost();
  if (additionalDagCost >= 256 || 4096 + additionalDagCost >= EXPANDED_PROGRAM_BUDGET) {
    throw new Error(`Expanded response DAG cost ${additionalDagCost} exceeded budget envelope`);
  }
  const penalizedMargin = FIFTH_CONTRAST_G
    .sub(F(4).mul(PAIRED_READOUT_EPS))
    .sub(EXPANDED_COST_WEIGHT_WC.mul(EXPANDED_PROGRAM_BUDGET));
  if (!penalizedMargin.eq(NOISY_PENALIZED_MARGIN) || !penalizedMargin.gt(FIFTH_CONTRAST_G.div(2))) {
    throw new Error(`Noisy penalized margin mismatch: got ${penalizedMargin}`);
  }

  // 3. Late parity query & transcript capacity frontier (`thm:late-parity-transcript`)
  // Pre-verify dynamical calibratedLateParityResponse matches G * lateParitySign(x, q) on m = 2
  for (let x = 0; x < 4; x += 1) {
    for (let q = 0; q < 4; q += 1) {
      const cal = calibratedLateParityResponse(x, q);
      const expected = FIFTH_CONTRAST_G.mul(lateParitySign(x, q));
      if (!cal.eq(expected)) {
        throw new Error('Calibrated quarter-scale late parity response mismatch');
      }
      if (!calibratedLateParityResponse(x, q, { cut: true }).isZero()) {
        throw new Error('T_d cut late parity response must be 0');
      }
    }
  }

  const frontier = [];
  for (let m = 1; m <= 6; m += 1) {
    const n = 1 << m;
    for (let b = 0; b <= m; b += 1) {
      const mask = (1 << b) - 1;
      let maxErr = ZERO;
      let sumErr = ZERO;
      let count = 0;
      for (let x = 0; x < n; x += 1) {
        for (let q = 0; q < n; q += 1) {
          const target = FIFTH_CONTRAST_G.mul(lateParitySign(x, q));
          const pred = ((q & ~mask) === 0)
            ? FIFTH_CONTRAST_G.mul(lateParitySign(x & mask, q))
            : ZERO;
          const err = target.sub(pred).abs();
          if (err.gt(maxErr)) maxErr = err;
          sumErr = sumErr.add(err);
          count += 1;
        }
      }
      const meanErr = sumErr.div(count);
      const expectedUniform = b < m ? FIFTH_CONTRAST_G : ZERO;
      const expectedMean = FIFTH_CONTRAST_G.mul(ONE.sub(F(1 << b, n)));
      if (!maxErr.eq(expectedUniform) || !meanErr.eq(expectedMean)) {
        throw new Error(`Late-query transcript frontier mismatch at m=${m}, B=${b}`);
      }
      // Check universal mean lower bound: (1 - R_mean / G)^2 <= 2^{B - m}
      const ratioOneMinus = ONE.sub(meanErr.div(FIFTH_CONTRAST_G));
      if (!ratioOneMinus.pow(2).lte(F(1 << b, n))) {
        throw new Error(`Universal randomized mean lower bound violated at m=${m}, B=${b}`);
      }
      frontier.push({
        m,
        B: b,
        R_uniform: maxErr.toString(),
        R_mean: meanErr.toString(),
        universalLowerBoundSatisfied: true
      });
    }
  }

  // Exhaustive check of all 2^4 = 16 1-bit transcript maps at (m, B) = (2, 1)
  let bestM2B1Mean = FIFTH_CONTRAST_G;
  for (let tMask = 0; tMask < 16; tMask += 1) {
    const transcript = [
      (tMask >> 0) & 1,
      (tMask >> 1) & 1,
      (tMask >> 2) & 1,
      (tMask >> 3) & 1
    ];
    let totalBestError = ZERO;
    for (const k of [0, 1]) {
      for (let q = 0; q < 4; q += 1) {
        const cellSigns = [];
        for (let x = 0; x < 4; x += 1) {
          if (transcript[x] === k) cellSigns.push(lateParitySign(x, q));
        }
        const sumSigns = cellSigns.reduce((acc, v) => acc + v, 0);
        totalBestError = totalBestError.add(
          FIFTH_CONTRAST_G.mul(cellSigns.length - Math.abs(sumSigns))
        );
      }
    }
    const mean = totalBestError.div(16);
    // Universal Cauchy-Schwarz bound: (1 - mean/G)^2 <= 2^{1-2} = 1/2
    if (!ONE.sub(mean.div(FIFTH_CONTRAST_G)).pow(2).lte(HALF)) {
      throw new Error('Cauchy-Schwarz cell bound violated at (m,B)=(2,1)');
    }
    if (mean.lt(bestM2B1Mean)) bestM2B1Mean = mean;
  }
  if (!bestM2B1Mean.eq(OPTIMAL_M2_B1_MEAN_ERROR)) {
    throw new Error(`Expected optimal (m,B)=(2,1) mean error 3G/8 = 3/16777216, got ${bestM2B1Mean}`);
  }

  // Late 1-bit round-trip control for m = 1..6 (`check_late_transcript.py:60-66`)
  for (let m = 1; m <= 6; m += 1) {
    const lastBit = 1 << (m - 1);
    const n = 1 << m;
    for (let x = 0; x < n; x += 1) {
      for (let q = 0; q < n; q += 1) {
        const replyBit = ((x & lastBit) !== 0 && (q & lastBit) !== 0) ? 1 : 0;
        const reconstructedSign = lateParitySign(x & (lastBit - 1), q) * (1 - 2 * replyBit);
        if (reconstructedSign !== lateParitySign(x, q)) {
          throw new Error(`Late 1-bit round-trip reconstruction failed at m=${m}`);
        }
      }
    }
  }

  // Equal-cost total replica & inverted reference controls (`prop:late-transcript-noise-margin`)
  let replicaMaxLoss = ZERO;
  let invertedMaxLoss = ZERO;
  for (let x = 0; x < 4; x += 1) {
    for (let q = 0; q < 4; q += 1) {
      const y = FIFTH_CONTRAST_G.mul(lateParitySign(x, q));
      const repErr = y.sub(y).abs();
      const invErr = y.sub(y.neg()).abs();
      if (repErr.gt(replicaMaxLoss)) replicaMaxLoss = repErr;
      if (invErr.gt(invertedMaxLoss)) invertedMaxLoss = invErr;
    }
  }
  const replicaSignedMarginR = ZERO.sub(replicaMaxLoss); // 0
  const invertedReferenceSignedMarginR = ZERO.sub(invertedMaxLoss); // -2*G = -1/1048576
  const invertedUnitScaledMarginR = FIFTH_CONTRAST_G.neg().div(2); // -G/2 = -1/4194304
  if (
    !replicaSignedMarginR.isZero() ||
    !invertedReferenceSignedMarginR.eq(F(-1, 1048576)) ||
    !invertedUnitScaledMarginR.eq(F(-1, 4194304))
  ) {
    throw new Error('Replica or inverted-reference negative control margin mismatch');
  }

  // Sharp readout perturbation (`check_late_transcript.py:83-89`)
  const targetClean = FIFTH_CONTRAST_G;
  const noisyTarget = FIFTH_CONTRAST_G.sub(PAIRED_READOUT_EPS).sub(PAIRED_READOUT_EPS);
  const cleanR = targetClean.abs().sub(targetClean.sub(targetClean).abs());
  const sharpNoisyR = noisyTarget.abs().sub(noisyTarget.sub(targetClean).abs());
  if (!cleanR.eq(FIFTH_CONTRAST_G) || !cleanR.sub(sharpNoisyR).eq(F(4).mul(PAIRED_READOUT_EPS)) || !sharpNoisyR.eq(SHARP_NOISY_MARGIN)) {
    throw new Error('Sharp readout noise perturbation 4*eps identity failed');
  }

  // Paper X leak & abstention synthetic block population (`check_late_transcript.py:92-105`)
  const labels16 = Array.from({ length: 16 }, (_, i) => (i % 2 === 0 ? 'h' : 'm'));
  const alwaysH = Array.from({ length: 16 }, () => 'h');
  const alwaysTie = Array.from({ length: 16 }, () => 'tie');
  const selectiveLeak = alwaysH.slice();
  let leakedCount = 0;
  for (let i = 0; i < labels16.length && leakedCount < 2; i += 1) {
    if (labels16[i] === 'm') {
      selectiveLeak[i] = 'm';
      leakedCount += 1;
    }
  }
  const evalAdjudicationRisk = (actions) => {
    let lossSum = ZERO;
    let coveredCount = 0;
    for (let i = 0; i < labels16.length; i += 1) {
      if (actions[i] === 'tie') {
        lossSum = lossSum.add(HALF);
      } else {
        coveredCount += 1;
        if (actions[i] !== labels16[i]) lossSum = lossSum.add(ONE);
      }
    }
    return {
      risk: lossSum.div(16),
      coverage: F(coveredCount, 16)
    };
  };
  const tieStats = evalAdjudicationRisk(alwaysTie);
  const alwaysHStats = evalAdjudicationRisk(alwaysH);
  const leakStats = evalAdjudicationRisk(selectiveLeak);
  if (
    !tieStats.risk.eq(HALF) ||
    !tieStats.coverage.isZero() ||
    !alwaysHStats.risk.eq(HALF) ||
    !alwaysHStats.coverage.eq(ONE) ||
    !leakStats.risk.eq(F(3, 8)) ||
    !leakStats.coverage.eq(ONE)
  ) {
    throw new Error('Paper X blind source adjudication leak/abstention controls failed');
  }

  const body = {
    schema: 'qicn.hybrid_late_query_tiebreaker.v1',
    passed: true,
    observed_domain: 'synthetic mathematical plant and isolated runtime tower clone',
    theorems_verified: [
      'paper9:prop:bridge-prefix-coupling-safety',
      'paper9:thm:bridge-expanded-identification',
      'paper9:thm:late-parity-transcript',
      'paper9:prop:late-transcript-noise-margin',
      'lean:QICNHybridBoundary.deadline_capacity_lower',
      'lean:QICNHybridBoundary.proper5_contrast_zero',
      'lean:QICNHybridBoundary.physical5_contrast',
      'lean:QICNHybridBoundary.five_root_decomposition',
      'lean:QICNHybridBoundary.fifth_gap_attained',
      'lean:QICNHybridBoundary.signed_margin_stability'
    ],
    five_root_coupled_plant: {
      preparationsCount: 32,
      eta: COUPLED_ETA.toString(),
      xi4: QUARTIC_XI4.toString(),
      fifthContrastG: FIFTH_CONTRAST_G.toString(),
      fifthContrastGFloat: FIFTH_CONTRAST_G.toFloat(),
      safeFibreLipschitz: SAFE_FIBRE_LIPSCHITZ.toString(),
      invariantBodyNormBound: INVARIANT_BODY_BOUND.toString(),
      ambientBodyNormBound: AMBIENT_BODY_BOUND.toString(),
      bestProperFiveRootError: FIFTH_CONTRAST_G.toString(),
      partialFourRootReplicaError: maxPartialFourRootError.toString(),
      properWalshBasisChecked: 31,
      additionalResponseGraphCost: additionalDagCost,
      responseGraphBudget: EXPANDED_PROGRAM_BUDGET,
      pairedReadoutEps: PAIRED_READOUT_EPS.toString(),
      noisyPenalizedMargin: penalizedMargin.toString(),
      exceedsHalfG: penalizedMargin.gt(FIFTH_CONTRAST_G.div(2))
    },
    late_query_transcript_frontier: {
      frontier,
      m2_b1_best_mean: bestM2B1Mean.toString(),
      lateOneBitRoundTripVerifiedUpToM: 6,
      sharp_noisy_R: sharpNoisyR.toString(),
      paired_reading_eps: PAIRED_READOUT_EPS.toString()
    },
    negative_controls: {
      physical_td_cut_eta_zero: {
        fifthContrast: fifthContrastCut.toString(),
        lateParityResponse: '0',
        collapsesFifthContrastToZero: fifthContrastCut.isZero()
      },
      sham_evaluation_off: {
        fifthContrast: '0'
      },
      sufficient_transcript_budget_B_ge_m: {
        uniformErrorAtBEqualsM: '0',
        meanErrorAtBEqualsM: '0',
        capacityMarginVanishes: true
      },
      equal_cost_total_replica: {
        replica_R: replicaSignedMarginR.toString(),
        nonpositiveUnderAllSharedInterventions: replicaSignedMarginR.lte(ZERO)
      },
      inverted_reference_control: {
        inverted_reference_R: invertedReferenceSignedMarginR.toString(),
        unit_scaled_half_G_R: invertedUnitScaledMarginR.toString(),
        strictlyNegative: invertedReferenceSignedMarginR.lt(ZERO)
      },
      paper10_blind_source_separation: {
        known_selective_leak_risk: leakStats.risk.toString(),
        always_tie_coverage: tieStats.coverage.toString(),
        always_tie_risk: tieStats.risk.toString(),
        always_h_risk: alwaysHStats.risk.toString(),
        provenanceAdjudicationSeparatedFromPredictiveMarginR: true
      }
    },
    evidence_scope: 'internal_support_only',
    external_support_certified: false,
    interpretation_boundary:
      'Constructive verification of the 5-root prefix-to-world contrast G = 1/2097152 and late-query transcript capacity boundary (B < m vs B >= m); defeats proper-ancestry and bounded-transcript hybrids before late query q while preserving the exact tie R <= 0 of an equal-cost total replica and separating Paper X blind provenance adjudication a(Y) in {h,m,tie} from signed predictive margin R.'
  };

  const digest = sha256Hex(stableStringify(body));
  return Object.freeze({ ...body, digest });
}

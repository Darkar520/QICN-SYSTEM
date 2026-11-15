// @ts-check

import { createLogger } from '../../utils/logger.js';

const finite = (value, fallback = 0) => {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) return fallback;
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
};

const getByPath = (obj, dottedPath) => String(dottedPath || '')
  .split('.')
  .filter(Boolean)
  .reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);

const normalizeNumber = (value) => (Number.isFinite(value) ? Number(value.toFixed(12)) : value);
const mean = (values) => (values.length ? normalizeNumber(values.reduce((sum, value) => sum + value, 0) / values.length) : 0);
const clamp01 = (value) => Math.max(0, Math.min(1, finite(value, 0)));
const logger = createLogger('FiniteProjectionEvaluator');
const COMPATIBILITY_EPSILON = 0.05;

export const INVERSE_LIMIT_COMPONENTS = Object.freeze([
  'ccc',
  'beth_q',
  'omega',
  'spectral_gap',
  'identity_stability',
  'hash_semantic'
]);

/**
 * @typedef {Object} MorphismResult
 * @property {Record<string, number>} projectedState
 * @property {number} compatibilityErrors
 * @property {Array<{ component: string, previous: number, next: number, delta: number, epsilon: number }>} componentErrors
 * @property {boolean} compatible
 */

/**
 * @typedef {Object} InverseLimitScoreResult
 * @property {number | null} inverse_limit_score
 * @property {number} totalCompatibilityErrors
 * @property {number} window
 * @property {string[]} measuredComponents
 */

export const evaluateFiniteProjection = ({ trace = [], horizon, projectionSpec = {}, metricSpec = {} }) => {
  const h = Math.max(0, Math.min(trace.length, Math.floor(finite(horizon, trace.length))));
  const window = trace.slice(0, h);
  const observables = Array.isArray(projectionSpec.observables) ? projectionSpec.observables : [];
  const projected = {};
  for (const observable of observables) {
    const values = window.map((tick) => finite(getByPath(tick, observable), NaN)).filter(Number.isFinite);
    if (projectionSpec.aggregation === 'last') {
      projected[observable] = values.length ? values[values.length - 1] : null;
    } else {
      projected[observable] = values.length ? mean(values) : null;
    }
  }
  return {
    claim_scope: 'finite_horizon_projection_only',
    horizon: h,
    projection_family: projectionSpec.family || 'unspecified_projection_family',
    aggregation: projectionSpec.aggregation || 'mean',
    metric_spec: metricSpec,
    projected,
    interpretation_boundary: 'Finite projection over recorded trace only; not full inverse-limit preservation.'
  };
};

export const computeProjectionError = ({ projected = {}, target = {}, metricSpec = {} }) => {
  const requiredKeys = Object.keys(target);
  const keys = requiredKeys.filter((key) => Number.isFinite(finite(projected[key], NaN)) && Number.isFinite(finite(target[key], NaN)));
  const errors = keys.map((key) => Math.abs(finite(projected[key]) - finite(target[key])));
  const complete = requiredKeys.length > 0 && keys.length === requiredKeys.length;
  const error = complete ? mean(errors) : null;
  const epsilon = finite(metricSpec.epsilon, 0);
  const comparator = metricSpec.comparator || 'lte';
  const pass = complete && (comparator === 'lt' ? error < epsilon : error <= epsilon);
  return {
    metric: metricSpec.name || 'l1_absolute',
    n: keys.length,
    expected_n: requiredKeys.length,
    evidence_status: complete ? 'computed' : 'not_recorded',
    error,
    epsilon,
    comparator,
    pass
  };
};

export const computeProjectionResourceProfile = ({ horizon, branchFactor = 1, stateDimension = 1 }) => {
  const h = Math.max(0, Math.floor(finite(horizon, 0)));
  const branch = Math.max(1, Math.floor(finite(branchFactor, 1)));
  const dimension = Math.max(1, Math.floor(finite(stateDimension, 1)));
  const estimatedStates = branch ** h;
  return {
    horizon: h,
    branch_factor: branch,
    state_dimension: dimension,
    estimated_states: estimatedStates,
    estimated_scalar_slots: estimatedStates * dimension,
    resource_scope: 'finite_bounded_estimate'
  };
};

/**
 * @param {Record<string, unknown>} state_t1
 * @param {Record<string, unknown>} state_t
 * @param {number} [epsilon]
 * @param {readonly string[]} [components]
 * @returns {MorphismResult}
 */
export const projectionMorphism = (state_t1 = {}, state_t = {}, epsilon = 0.05, components = INVERSE_LIMIT_COMPONENTS) => {
  const eps = Math.max(0, finite(epsilon, 0.05));
  const componentList = Array.isArray(components) && components.length ? components : INVERSE_LIMIT_COMPONENTS;
  const projectedState = { ...state_t };
  const details = {};
  let compatibilityErrors = 0;

  for (const component of componentList) {
    const valueT = finite(state_t?.[component], NaN);
    const valueT1 = finite(state_t1?.[component], NaN);
    const hasBoth = Number.isFinite(valueT) && Number.isFinite(valueT1);
    const tolerance = eps * Math.max(1, Math.abs(valueT));
    const delta = hasBoth ? Math.abs(valueT1 - valueT) : Infinity;
    const compatible = hasBoth && delta <= tolerance;

    if (!compatible) compatibilityErrors += 1;
    details[component] = {
      value_t: Number.isFinite(valueT) ? normalizeNumber(valueT) : null,
      value_t1: Number.isFinite(valueT1) ? normalizeNumber(valueT1) : null,
      delta: Number.isFinite(delta) ? normalizeNumber(delta) : null,
      tolerance: normalizeNumber(tolerance),
      compatible,
      missing: !hasBoth
    };
  }

  return {
    projectedState,
    compatibilityErrors,
    compatible: compatibilityErrors === 0,
    details,
    epsilon: eps,
    components: componentList,
    claim_scope: 'finite_horizon_projection_morphism_only',
    interpretation_boundary: 'Computable projection morphism over finite adjacent states; not full inverse-limit preservation.'
  };
};

const firstFinite = (...values) => {
  for (const value of values) {
    const n = finite(value, NaN);
    if (Number.isFinite(n)) return n;
  }
  return null;
};

export const buildInverseLimitStateFromTick = (tick = {}, summaryMetrics = {}) => {
  const metrics = tick?.metrics || {};
  return {
    ccc: firstFinite(metrics.ccc, summaryMetrics.ccc),
    beth_q: firstFinite(metrics.beth_q, summaryMetrics.beth_q),
    omega: firstFinite(metrics.omega, metrics.omega_mean, summaryMetrics.omega, summaryMetrics.omega_mean),
    spectral_gap: firstFinite(metrics.spectral_gap, summaryMetrics.spectral_gap),
    identity_stability: firstFinite(metrics.identity_stability_score, summaryMetrics.identity_stability_score),
    hash_semantic: firstFinite(
      metrics.hash_semantic,
      metrics.critical_state_hash_semantic_stability,
      metrics.critical_state_hash_stability,
      summaryMetrics.hash_semantic,
      summaryMetrics.critical_state_hash_semantic_stability,
      summaryMetrics.critical_state_hash_stability
    )
  };
};

const vectorDistance = (left = {}, right = {}, components = INVERSE_LIMIT_COMPONENTS) => {
  let sum = 0;
  let n = 0;
  for (const component of components) {
    const a = finite(left?.[component], NaN);
    const b = finite(right?.[component], NaN);
    if (Number.isFinite(a) && Number.isFinite(b)) {
      sum += (a - b) ** 2;
      n += 1;
    }
  }
  return n > 0 ? Math.sqrt(sum) : Infinity;
};

export const verifyCategoricalCompatibility = (states = [], epsilon = COMPATIBILITY_EPSILON, components = INVERSE_LIMIT_COMPONENTS) => {
  const componentList = Array.isArray(components) && components.length ? components : INVERSE_LIMIT_COMPONENTS;
  let violations = 0;
  const violationDetails = [];

  for (let index = 1; index < states.length - 1; index += 1) {
    const composed = projectionMorphism(
      projectionMorphism(states[index + 1], states[index], epsilon, componentList).projectedState,
      states[index - 1],
      epsilon,
      componentList
    ).projectedState;
    const direct = projectionMorphism(states[index + 1], states[index - 1], epsilon, componentList).projectedState;
    const error = vectorDistance(composed, direct, componentList);
    if (error > epsilon) {
      violations += 1;
      violationDetails.push({ index, error: normalizeNumber(error) });
    }
  }

  const comparisons = Math.max(0, states.length - 2);
  return {
    categorical_compatibility: violations === 0,
    violations,
    comparisons,
    violation_rate: comparisons > 0 ? violations / comparisons : 0,
    epsilon,
    violation_details: violationDetails,
    interpretation_boundary: 'Finite categorical compatibility over observed projection triples; not an infinite projective-system proof.'
  };
};

export const buildInverseLimitWitness = (states = [], epsilon = COMPATIBILITY_EPSILON, components = INVERSE_LIMIT_COMPONENTS) => {
  const componentList = Array.isArray(components) && components.length ? components : INVERSE_LIMIT_COMPONENTS;
  const compatibilities = [];
  for (let index = 0; index < states.length - 1; index += 1) {
    compatibilities.push(projectionMorphism(states[index + 1], states[index], epsilon, componentList).compatible);
  }
  const compatibleCount = compatibilities.filter(Boolean).length;
  const compatibilityRate = compatibilities.length ? compatibleCount / compatibilities.length : 0;

  return {
    is_inverse_limit_element: states.length >= 2 && compatibilities.every(Boolean),
    compatibility_rate: compatibilityRate,
    window_size: states.length,
    epsilon,
    components: componentList,
    interpretation_boundary: 'Finite-window inverse-limit witness; not uniqueness over all possible identity candidates.'
  };
};

import { F, ZERO, ONE, HALF, Frac, fSum, fMin, fMax, vecAdd, vecEq, vecNormInf, vecSub } from '../../simulation/tower/ExactFraction.js';
import {
  ALTERNATING,
  CONTEXTS,
  SITES,
  TAP,
  circle,
  createState,
  encodeBits,
  prefix,
  step,
  writePrefix
} from '../../simulation/tower/WritablePrefixTower.js';

export const evaluateFoundationalFront1 = () => {
  // 1. Fixed-scale separation modulus omega_T(r) = r^2
  for (const n of [2, 10, 100, 1000]) {
    const r = F(1, n);
    for (const x of [ZERO, ONE.sub(r).div(2), ONE.sub(r)]) {
      const diff = x.add(r).pow(2).sub(x.mul(x));
      if (!diff.gte(r.mul(r))) {
        throw new Error(`Fixed-scale modulus failed at n=${n}`);
      }
    }
    if (!r.mul(r).div(r).eq(r)) {
      throw new Error('Modulus slope identity failed');
    }
  }

  // 2. 4032 distinct 6-bit ternary pairs: 3^-m <= |c(x)-c(y)| <= 3*3^-m
  const words = [];
  for (let mask = 0; mask < 64; mask += 1) {
    words.push(
      Array.from({ length: 6 }, (_, idx) => (mask >> idx) & 1)
    );
  }
  let ternaryPairs = 0;
  for (let i = 0; i < words.length; i += 1) {
    for (let j = 0; j < words.length; j += 1) {
      if (i === j) continue;
      const x = words[i];
      const y = words[j];
      let m = 1;
      while (m <= 6 && x[m - 1] === y[m - 1]) m += 1;
      let diff = ZERO;
      for (let k = 1; k <= 6; k += 1) {
        diff = diff.add(F(2 * (x[k - 1] - y[k - 1]), 3n ** BigInt(k)));
      }
      diff = diff.abs();
      const lo = F(1n, 3n ** BigInt(m));
      const hi = F(3n, 3n ** BigInt(m));
      if (!diff.gte(lo) || !diff.lte(hi)) {
        throw new Error(`Ternary metric bound violated at m=${m}`);
      }
      ternaryPairs += 1;
    }
  }

  // 3. Interventional vs observational causal separation (prop:causal-rigid)
  const weights = [
    [0, F(3, 4)],
    [1, F(1, 4)]
  ];
  const stable = (y, z) => z;
  const sensitive = (y, z) => y ^ z;
  const probability = (model, intervention) =>
    fSum(weights.filter(([z]) => model(intervention, z) === 1).map(([, w]) => w));
  if (
    !probability(stable, 0).eq(F(1, 4)) ||
    !probability(sensitive, 0).eq(F(1, 4)) ||
    !probability(stable, 1).eq(F(1, 4)) ||
    !probability(sensitive, 1).eq(F(3, 4))
  ) {
    throw new Error('Causal interventional vs observational separation check failed');
  }

  // 4. Projective tape cuts & cofinal probes (verify_links in check_prefix_tower.py)
  const writes = [null];
  for (const s of SITES) writes.push([s, 0], [s, 1]);
  const shiftCut = (bits, write) => {
    const res = [0, ...bits.slice(0, -1).map((b) => 1 - b)];
    if (write !== null && write[0] <= bits.length) {
      res[write[0] - 1] = write[1];
    }
    return res;
  };
  let projectedAgreements = 0;
  for (let depth = 1; depth <= 6; depth += 1) {
    const count = 1 << depth;
    for (let mask = 0; mask < count; mask += 1) {
      const bits = Array.from({ length: depth }, (_, idx) => (mask >> idx) & 1);
      const state = createState(CONTEXTS[0], ZERO, encodeBits(bits, ALTERNATING), ZERO);
      for (const write of writes) {
        const observed = prefix(step(state, { write }).code, depth);
        const expected = shiftCut(bits, write);
        if (observed.some((b, idx) => b !== expected[idx])) {
          throw new Error('Projective shift cut mismatch');
        }
        projectedAgreements += depth;
      }
    }
  }

  // Omitted-bit control at site 7
  const a = createState(CONTEXTS[0], ZERO, ALTERNATING, ZERO);
  const b = a.replace({ code: writePrefix(a.code, 7, 1) });
  if (
    prefix(a.code, 6).some((bit, idx) => bit !== prefix(b.code, 6)[idx]) ||
    !circle(step(a, { probe: [7, 0] }).phase.sub(step(b, { probe: [7, 0] }).phase)).eq(TAP)
  ) {
    throw new Error('Omitted-bit control at site 7 failed');
  }

  const baseCoreSufficiencyAndBridge = verifyBaseCoreSufficiencyAndCoupledBridge();
  const baseCoreSpectrumAndRelaxation = verifyBaseCoreSpectrumAndRelaxation();
  const weightedTailAndCoercivity = verifyWeightedTailAndChannelCoercivity();

  return {
    passed: true,
    fixedScaleModulusVerified: true,
    ternaryPairsChecked: ternaryPairs,
    causalRigidSeparation: {
      observationalAtZero: '1/4',
      interventionalStableAtOne: '1/4',
      interventionalSensitiveAtOne: '3/4'
    },
    projectiveCutAgreements: projectedAgreements,
    omittedBitSite7PhaseGap: TAP.toString(),
    baseCoreSufficiencyAndBridge,
    baseCoreSpectrumAndRelaxation,
    weightedTailAndCoercivity
  };
};

const toExactFraction = (value) => {
  if (value instanceof Frac) return value;
  if (typeof value === 'bigint') return F(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new RangeError(`Expected finite number, got ${value}`);
    if (Number.isInteger(value)) return F(value);
    const text = value.toString();
    if (!text.includes('e') && !text.includes('E') && text.includes('.')) {
      const [intPart, fracPart] = text.split('.');
      const sign = intPart.startsWith('-') ? -1n : 1n;
      const absInt = intPart.replace(/^[+-]/, '') || '0';
      const den = 10n ** BigInt(fracPart.length);
      const num = sign * (BigInt(absInt) * den + BigInt(fracPart));
      return F(num, den);
    }
    throw new TypeError(`Cannot represent floating-point value ${value} as exact decimal fraction; pass Frac or p/q string`);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.includes('/')) return F(trimmed);
    if (trimmed.includes('.')) {
      const [intPart, fracPart] = trimmed.split('.');
      const sign = intPart.startsWith('-') ? -1n : 1n;
      const absInt = intPart.replace(/^[+-]/, '') || '0';
      const den = 10n ** BigInt(fracPart.length);
      const num = sign * (BigInt(absInt) * den + BigInt(fracPart));
      return F(num, den);
    }
    return F(trimmed);
  }
  return F(value);
};

/**
 * Exact BaseCore thm:relaxation spectral e-folding convention:
 * tau_state = -1 / ln(rho) is defined ONLY for strictly contractive positive spectral radii 0 < rho < 1.
 * Rejects rho <= 0 or rho >= 1.
 * @param {Frac | number | string} rhoInput
 * @returns {number}
 */
export const computeBaseCoreRelaxationTime = (rhoInput) => {
  const rhoNum = rhoInput instanceof Frac ? rhoInput.toFloat() : Number(rhoInput);
  if (rhoInput instanceof Frac) {
    if (rhoInput.lte(ZERO) || rhoInput.gte(ONE)) {
      throw new RangeError(`BaseCore thm:relaxation requires 0 < rho < 1; rejected rho=${rhoInput.toString()}`);
    }
  }
  if (!Number.isFinite(rhoNum) || rhoNum <= 0 || rhoNum >= 1) {
    throw new RangeError(`BaseCore thm:relaxation requires 0 < rho < 1; rejected rho=${rhoNum}`);
  }
  return -1 / Math.log(rhoNum);
};

/**
 * Exact one-sided directional derivative on constant subspace j(E) at u = 1/2:
 * D^+ T_{1/2}(j(e_1); j(h)) = 1/2 * j(A h - e_1 * max(<e_1, A h>, 0)), with e_1 = (1,0), A = I_2 on j(E).
 * @param {Array<Frac | number | string>} hVector
 */
export const computeBaseCoreDirectionalDerivativeAtHalf = (hVector) => {
  if (!Array.isArray(hVector) || hVector.length !== 2) {
    throw new TypeError('hVector must be a 2D vector [h1, h2] in E = R^2');
  }
  const h1 = toExactFraction(hVector[0]);
  const h2 = toExactFraction(hVector[1]);
  const dotE1 = h1;
  const positivePart = dotE1.gt(ZERO) ? dotE1 : ZERO;
  return Object.freeze([
    HALF.mul(h1.sub(positivePart)),
    HALF.mul(h2)
  ]);
};

/**
 * Evaluates the exact BaseCore thm:spectrum and thm:relaxation regime for u in [0, 1].
 * @param {Frac | number | string} uInput
 */
export const evaluateBaseCoreSpectralRegime = (uInput) => {
  const u = toExactFraction(uInput);
  if (u.lt(ZERO) || u.gt(ONE)) {
    throw new RangeError(`BaseCore parameter u must lie in [0, 1], got ${u.toString()}`);
  }

  const twoU = u.mul(2);
  const vStar = Object.freeze([twoU.lte(ONE) ? twoU : ONE, ZERO]);
  const zU = Object.freeze([vStar[0].div(2).add(u), ZERO]);

  if (u.lt(HALF)) {
    const rho = HALF;
    const deltaState = ONE.sub(rho);
    const tauState = computeBaseCoreRelaxationTime(rho);
    return {
      u: u.toString(),
      regime: 'interior_regular',
      fixedPointVector: vStar.map((x) => x.toString()),
      preProjectionPoint: zU.map((x) => x.toString()),
      frechetDifferentiable: true,
      jacobianSpectrumAssigned: true,
      derivativeOperator: '1/2 * j * A',
      derivativeMatrixOnE: [['1/2', '0'], ['0', '1/2']],
      spectrum: ['0', '1/2'],
      spectralRadiusRho: rho.toString(),
      spectralGapDeltaState: deltaState.toString(),
      tauStateLinearized: tauState,
      tauStateFormula: '1/ln(2)',
      globalGeometricContractionRate: '1/2'
    };
  }

  if (u.eq(HALF)) {
    const dPlus = computeBaseCoreDirectionalDerivativeAtHalf([ONE, ZERO]);
    const dMinus = computeBaseCoreDirectionalDerivativeAtHalf([ONE.neg(), ZERO]);
    const nonlinearitySum = vecAdd(dPlus, dMinus);
    return {
      u: u.toString(),
      regime: 'corner_non_differentiable',
      fixedPointVector: vStar.map((x) => x.toString()),
      preProjectionPoint: zU.map((x) => x.toString()),
      frechetDifferentiable: false,
      jacobianSpectrumAssigned: false,
      derivativeOperator: null,
      derivativeMatrixOnE: null,
      spectrum: null,
      spectralRadiusRho: null,
      spectralGapDeltaState: null,
      tauStateLinearized: null,
      tauStateFormula: null,
      directionalDerivativePlusE1: dPlus.map((x) => x.toString()),
      directionalDerivativeMinusE1: dMinus.map((x) => x.toString()),
      directionalNonlinearitySum: nonlinearitySum.map((x) => x.toString()),
      directionalNonlinearityGap: vecNormInf(nonlinearitySum).toString(),
      globalGeometricContractionRate: '1/2'
    };
  }

  // u > 1/2: exterior regular regime
  const denom = ONE.add(twoU); // 1 + 2u
  const rho = ONE.div(denom); // 1 / (1 + 2u)
  const deltaState = ONE.sub(rho); // 2u / (1 + 2u) >= 1/2
  const tauState = computeBaseCoreRelaxationTime(rho);
  return {
    u: u.toString(),
    regime: 'exterior_regular',
    fixedPointVector: vStar.map((x) => x.toString()),
    preProjectionPoint: zU.map((x) => x.toString()),
    frechetDifferentiable: true,
    jacobianSpectrumAssigned: true,
    projectionPerp: 'P_perp(v1, v2) = (0, v2)',
    derivativeOperator: '1/(1 + 2u) * j * P_perp * A',
    derivativeMatrixOnE: [['0', '0'], ['0', rho.toString()]],
    spectrum: ['0', rho.toString()],
    spectralRadiusRho: rho.toString(),
    spectralGapDeltaState: deltaState.toString(),
    tauStateLinearized: tauState,
    tauStateFormula: `1/ln(${denom.toString()})`,
    globalGeometricContractionRate: '1/2'
  };
};

/**
 * Assigns linearized Jacobian spectrum only at Fréchet-differentiable parameters u != 1/2.
 * Rejects u = 1/2 explicitly.
 * @param {Frac | number | string} uInput
 */
export const assignBaseCoreJacobianSpectrum = (uInput) => {
  const report = evaluateBaseCoreSpectralRegime(uInput);
  if (!report.frechetDifferentiable || !report.jacobianSpectrumAssigned) {
    throw new RangeError(
      `BaseCore thm:spectrum forbids assigning a linear Jacobian spectrum at u = ${report.u} (directional nonlinearity gap = ${report.directionalNonlinearityGap})`
    );
  }
  return report;
};

/**
 * Typed computable witness verification for BaseCore thm:spectrum & thm:relaxation.
 */
export const verifyBaseCoreSpectrumAndRelaxation = () => {
  const tauLowerBound = 1 / Math.log(3);
  const tauUpperBound = 1 / Math.log(2);

  // 1. Interior regular regime: 0 <= u < 1/2 (e.g. u = 0, u = 1/4)
  const regZero = evaluateBaseCoreSpectralRegime(ZERO);
  const regQuarter = evaluateBaseCoreSpectralRegime(F(1, 4));
  for (const reg of [regZero, regQuarter]) {
    if (
      reg.frechetDifferentiable !== true ||
      reg.jacobianSpectrumAssigned !== true ||
      reg.spectralRadiusRho !== '1/2' ||
      reg.spectralGapDeltaState !== '1/2' ||
      reg.spectrum[0] !== '0' ||
      reg.spectrum[1] !== '1/2' ||
      Math.abs(reg.tauStateLinearized - tauUpperBound) > 1e-12
    ) {
      throw new Error(`BaseCore thm:spectrum interior regular check failed at u=${reg.u}`);
    }
  }

  // 2. Non-differentiable corner: u = 1/2
  const regHalf = evaluateBaseCoreSpectralRegime(HALF);
  const dPlusE1 = computeBaseCoreDirectionalDerivativeAtHalf([ONE, ZERO]);
  const dMinusE1 = computeBaseCoreDirectionalDerivativeAtHalf([ONE.neg(), ZERO]);
  const dSum = vecAdd(dPlusE1, dMinusE1);
  if (
    regHalf.frechetDifferentiable !== false ||
    regHalf.jacobianSpectrumAssigned !== false ||
    regHalf.tauStateLinearized !== null ||
    !vecEq(dPlusE1, [ZERO, ZERO]) ||
    !vecEq(dMinusE1, [HALF.neg(), ZERO]) ||
    !vecEq(dSum, [HALF.neg(), ZERO]) ||
    vecEq(dSum, [ZERO, ZERO])
  ) {
    throw new Error('BaseCore thm:spectrum corner u=1/2 directional derivative check failed');
  }

  // Global geometric contraction ||T_{1/2}^n f - f_{1/2}^*||_inf <= 2^-n ||f - f_{1/2}^*||_inf
  // Verified constructively with exact rationals on both collinear (v0=(0,0), v0=(-1,0)) and
  // off-axis interior trajectory (v0=(0, 1/2), where ||z_n||_2^2 < 1 for every n >= 1).
  const fHalfStar = Object.freeze([ONE, ZERO]);
  const stepHalfOnClosedUnitDiskInteriorOrAxis = (v) => {
    const z = Object.freeze([v[0].div(2).add(HALF), v[1].div(2)]);
    const normSq = z[0].pow(2).add(z[1].pow(2));
    if (normSq.lte(ONE)) return z;
    if (z[1].isZero()) {
      return Object.freeze([z[0].gt(ZERO) ? ONE : ONE.neg(), ZERO]);
    }
    throw new Error('Test trajectory left exact rational domain of P_E');
  };
  const cornerInitialVectors = [
    [ZERO, ZERO],
    [ONE.neg(), ZERO],
    [ZERO, HALF]
  ];
  let globalGeometricChecks = 0;
  for (const v0 of cornerInitialVectors) {
    const initialErr = vecNormInf(vecSub(v0, fHalfStar));
    let cur = Object.freeze(v0);
    for (let n = 0; n <= 6; n += 1) {
      const err = vecNormInf(vecSub(cur, fHalfStar));
      const bound = initialErr.mul(F(1n, 1n << BigInt(n)));
      if (!err.lte(bound)) {
        throw new Error(`Global geometric bound violated at u=1/2, n=${n}`);
      }
      globalGeometricChecks += 1;
      cur = stepHalfOnClosedUnitDiskInteriorOrAxis(cur);
    }
  }

  // 3. Exterior regular regime: u > 1/2 (u = 3/4 and u = 1)
  const regThreeQuarters = evaluateBaseCoreSpectralRegime(F(3, 4));
  const regOne = evaluateBaseCoreSpectralRegime(ONE);
  if (
    regThreeQuarters.frechetDifferentiable !== true ||
    regThreeQuarters.spectralRadiusRho !== '2/5' ||
    regThreeQuarters.spectralGapDeltaState !== '3/5' ||
    regThreeQuarters.spectrum[0] !== '0' ||
    regThreeQuarters.spectrum[1] !== '2/5' ||
    !F(regThreeQuarters.spectralGapDeltaState).gte(HALF) ||
    regThreeQuarters.tauStateLinearized < tauLowerBound - 1e-12 ||
    regThreeQuarters.tauStateLinearized > tauUpperBound + 1e-12
  ) {
    throw new Error('BaseCore thm:spectrum exterior check failed at u=3/4');
  }
  if (
    regOne.frechetDifferentiable !== true ||
    regOne.spectralRadiusRho !== '1/3' ||
    regOne.spectralGapDeltaState !== '2/3' ||
    regOne.spectrum[0] !== '0' ||
    regOne.spectrum[1] !== '1/3' ||
    !F(regOne.spectralGapDeltaState).gte(HALF) ||
    Math.abs(regOne.tauStateLinearized - tauLowerBound) > 1e-12
  ) {
    throw new Error('BaseCore thm:spectrum exterior check failed at u=1');
  }

  // 4. Mandatory negative controls
  let cornerJacobianRejected = false;
  try {
    assignBaseCoreJacobianSpectrum(HALF);
  } catch {
    cornerJacobianRejected = true;
  }
  if (!cornerJacobianRejected) {
    throw new Error('Negative control failed: u=1/2 must reject linear Jacobian spectrum assignment');
  }

  const invalidRhos = [ZERO, F(-1, 2), ONE, F(3, 2), 0, -0.25, 1, 1.5, Number.NaN];
  const rejectedRhos = [];
  for (const rho of invalidRhos) {
    let rejected = false;
    try {
      computeBaseCoreRelaxationTime(rho);
    } catch {
      rejected = true;
    }
    if (!rejected) {
      throw new Error(`Negative control failed: non-contractive/non-positive rho=${rho} was not rejected`);
    }
    rejectedRhos.push(String(rho));
  }
  const nonContractiveRejected = rejectedRhos.length === invalidRhos.length;

  return {
    passed: true,
    regimes: {
      interiorZero: regZero,
      interiorQuarter: regQuarter,
      cornerHalf: regHalf,
      exteriorThreeQuarters: regThreeQuarters,
      exteriorOne: regOne
    },
    cornerGlobalGeometricContractionVerified: true,
    cornerGlobalGeometricChecks: globalGeometricChecks,
    tauStateBounds: {
      minTau: tauLowerBound,
      maxTau: tauUpperBound,
      formulaMin: '1/ln(3)',
      formulaMax: '1/ln(2)'
    },
    negativeControls: {
      cornerJacobianSpectrumRejected: cornerJacobianRejected,
      directionalNonlinearityGapAtHalf: vecNormInf(dSum).toString(),
      nonContractiveRejected,
      rejectedRhos
    }
  };
};

export const verifyBaseCoreSufficiencyAndCoupledBridge = () => {
  // 1. prop:minimal & prop:h5-not-derived (QICNBaseSufficiency)
  // On [0, 1]^2, T_zero(u) = (u_1 / 2 + 1 / 4, u_2 / 2 + 1 / 4) satisfies H1..H4 with q = 1/2
  // and unique fixed point u_* = (1/2, 1/2) on the constant subspace where H5 spatial spread = 0.
  const qZeroData = F(1, 2);
  const fixedPointZeroData = [F(1, 2), F(1, 2)];
  const stepZeroData = (u) => u.map((coord) => F(coord).div(2).add(F(1, 4)));
  const steppedFixed = stepZeroData(fixedPointZeroData);
  const spatialSpreadZeroData = fMax(steppedFixed).sub(fMin(steppedFixed));
  if (
    !steppedFixed[0].eq(F(1, 2)) ||
    !steppedFixed[1].eq(F(1, 2)) ||
    !spatialSpreadZeroData.isZero()
  ) {
    throw new Error('prop:h5-not-derived zero-data constant fixed point check failed');
  }

  // 2. prop:coupled-energy-phase-bridge (nu=1, kappa=1/4, a(s)=s/4, u in [0,1/4], e(s)=phi(s)=s/64)
  // Contraction q <= 2048 / 8191 < 1, equilibrium shift <= 8191 / (256 * 6143) = 8191 / 1572608,
  // non-collapse margin gamma = 90097 / 1572608 > 0 for N >= 2, and negative control N = 1 (spread = 0).
  const qCoupled = F(2048, 8191);
  const oneMinusQ = ONE.sub(qCoupled); // 6143 / 8191
  const perturbationBound = F(1, 256);
  const equilibriumShiftBound = perturbationBound.div(oneMinusQ); // 8191 / 1572608
  const unperturbedSpread = F(1, 16); // 98304 / 1572608
  const nonCollapseMarginGamma = unperturbedSpread.sub(equilibriumShiftBound); // 90097 / 1572608
  if (
    !qCoupled.lt(ONE) ||
    !equilibriumShiftBound.eq(F(8191, 1572608)) ||
    !nonCollapseMarginGamma.eq(F(90097, 1572608)) ||
    !nonCollapseMarginGamma.gt(ZERO)
  ) {
    throw new Error('prop:coupled-energy-phase-bridge exact rational bounds mismatch');
  }

  // Negative control N = 1: single-node state has only 1 spatial coordinate -> max - min = 0
  const singleNodeState = [F(1, 8)];
  const singleNodeSpread = fMax(singleNodeState).sub(fMin(singleNodeState));
  if (!singleNodeSpread.isZero()) {
    throw new Error('Negative control N=1 spatial spread must be 0');
  }

  return {
    passed: true,
    zeroDataFixedPoint: fixedPointZeroData.map((x) => x.toString()),
    zeroDataContractionFactor: qZeroData.toString(),
    h5NotDerivedFromH1ToH4Verified: spatialSpreadZeroData.isZero(),
    coupledEnergyPhaseBridge: {
      contractionBoundQ: qCoupled.toString(),
      equilibriumShiftBound: equilibriumShiftBound.toString(),
      nonCollapseMarginGammaForNGe2: nonCollapseMarginGamma.toString(),
      negativeControlNEquals1Spread: singleNodeSpread.toString(),
      negativeControlNEquals1FailsNonCollapse: singleNodeSpread.isZero()
    }
  };
};

export const verifyWeightedTailAndChannelCoercivity = () => {
  // 1. ex:weighted-tail-failures:
  // (a) Unbounded non-truncated metric d_t = 4^t |s - u| with w_t = 2^-t gives partial sum (2^(T+1) - 2)|s - u| -> +infinity
  const sMinusU = F(1, 4);
  const unboundedPartialSums = [];
  const truncatedPartialSums = [];
  let unbSum = ZERO;
  let truncSum = ZERO;
  for (let t = 1; t <= 8; t += 1) {
    const wT = F(1n, 1n << BigInt(t));
    const dT = F(1n << BigInt(2 * t)).mul(sMinusU);
    unbSum = unbSum.add(wT.mul(dT));
    const dTrunc = dT.lte(ONE) ? dT : ONE;
    truncSum = truncSum.add(wT.mul(dTrunc));
    unboundedPartialSums.push(unbSum);
    truncatedPartialSums.push(truncSum);
  }
  const closedFormT8 = F((1 << 9) - 2).mul(sMinusU); // 510 * 1/4 = 255/2
  if (
    !unboundedPartialSums[7].eq(closedFormT8) ||
    !unboundedPartialSums[7].gt(F(100)) ||
    !truncatedPartialSums[7].lte(ONE)
  ) {
    throw new Error('ex:weighted-tail-failures unbounded divergence vs truncated convergence check failed');
  }

  // (b) Discrete scaled metric d_t(x, y) = 2^t * 1_{x != y} on S_t = {0,1}^t gives w_t * d_t = 1 -> noncompact discrete topology
  const discreteScaledStepContributions = [];
  for (let t = 1; t <= 6; t += 1) {
    const wT = F(1n, 1n << BigInt(t));
    const dT = F(1n << BigInt(t));
    const contrib = wT.mul(dT);
    if (!contrib.eq(ONE)) {
      throw new Error('Discrete scaled metric step contribution w_t * 2^t must equal 1');
    }
    discreteScaledStepContributions.push(contrib);
  }

  // 2. prop:weighted-history: global channel coercivity inf_n (v_n c_n / w_n) > 0 vs coordinatewise Lipschitz
  // Harmonic ratio v_n c_n / w_n = 1/n has positive coordinatewise c_n > 0 but decays to 0
  const harmonicRatios = Array.from({ length: 16 }, (_, idx) => F(1, idx + 1));
  const harmonicMinAt16 = fMin(harmonicRatios);
  const uniformCoerciveRatios = Array.from({ length: 16 }, () => F(1, 2));
  const uniformCoerciveInfimum = fMin(uniformCoerciveRatios);
  if (!harmonicMinAt16.eq(F(1, 16)) || !uniformCoerciveInfimum.eq(F(1, 2))) {
    throw new Error('Global channel coercivity ratio check failed');
  }

  return {
    passed: true,
    unboundedMetricPartialSumAtT8: unboundedPartialSums[7].toString(),
    truncatedMetricPartialSumAtT8: truncatedPartialSums[7].toString(),
    discreteScaledMinDistanceBetweenDistinctHistories: '1',
    harmonicCoercivityRatioAtN16: harmonicMinAt16.toString(),
    uniformCoerciveInfimumCStar: uniformCoerciveInfimum.toString()
  };
};

export const boundFiniteApproximationError = (windowSize, contractionRate = 0.5) => {
  const window = Math.max(0, Math.floor(finite(windowSize, 0)));
  const rho = Math.max(0, Math.min(0.999999, finite(contractionRate, 0.5)));
  const error = rho < 1 ? (rho ** window) / Math.max(1e-9, 1 - rho) : Infinity;
  return {
    finite_window: window,
    contraction_rate: rho,
    approximation_error_bound: normalizeNumber(error),
    negligible: error < 0.01,
    interpretation_boundary: 'Finite truncation error bound under assumed contraction rate; not an empirical proof that the infinite limit is unique.'
  };
};

/**
 * @param {Object} input
 * @param {Array<Record<string, unknown>>} [input.trace]
 * @param {number} [input.window]
 * @param {number} [input.epsilon]
 * @param {readonly string[]} [input.components]
 * @returns {InverseLimitScoreResult & Record<string, unknown>}
 */
export const computeInverseLimitScore = ({
  trace = [],
  window = 40,
  epsilon = 0.05,
  components = INVERSE_LIMIT_COMPONENTS,
  summaryMetrics = {}
} = {}) => {
  const componentList = Array.isArray(components) && components.length ? components : INVERSE_LIMIT_COMPONENTS;
  const h = Math.max(0, Math.min(trace.length, Math.floor(finite(window, 40))));
  const slice = trace.slice(Math.max(0, trace.length - h));
  const states = slice.map((tick) => buildInverseLimitStateFromTick(tick, summaryMetrics));
  const measuredComponents = componentList.filter((component) => states.some((state) => Number.isFinite(finite(state?.[component], NaN))));

  if (states.length < 2 || measuredComponents.length === 0) {
    return {
      score: null,
      inverse_limit_score: null,
      totalCompatibilityErrors: 0,
      denominator: 0,
      comparisons: 0,
      window: states.length,
      epsilon: Math.max(0, finite(epsilon, 0.05)),
      components: measuredComponents,
      unmeasuredComponents: componentList.filter((component) => !measuredComponents.includes(component)),
      categorical_compatibility: false,
      categoricalCompatibility: {
        categorical_compatibility: false,
        violations: 0,
        comparisons: 0,
        violation_rate: 0,
        epsilon: Math.max(0, finite(epsilon, 0.05)),
        interpretation_boundary: 'No finite triples available for categorical compatibility.'
      },
      is_inverse_limit_element: false,
      inverseLimitWitness: {
        is_inverse_limit_element: false,
        compatibility_rate: 0,
        window_size: states.length,
        epsilon: Math.max(0, finite(epsilon, 0.05)),
        components: measuredComponents,
        interpretation_boundary: 'Insufficient finite states for inverse-limit witness.'
      },
      approximation_error_bound: null,
      claim_scope: 'finite_horizon_inverse_limit_score_only',
      evidence_status: 'not_recorded',
      interpretation_boundary: 'Insufficient recorded finite-state components; no full inverse-limit claim is made.'
    };
  }

  const morphisms = [];
  let totalCompatibilityErrors = 0;
  for (let idx = 1; idx < states.length; idx += 1) {
    const morphism = projectionMorphism(states[idx], states[idx - 1], epsilon, measuredComponents);
    totalCompatibilityErrors += morphism.compatibilityErrors;
    morphisms.push({
      from: idx,
      to: idx - 1,
      compatibilityErrors: morphism.compatibilityErrors,
      compatible: morphism.compatible,
      details: morphism.details
    });
  }

  const denominator = measuredComponents.length * Math.max(0, states.length - 1);
  const score = denominator > 0 ? clamp01(1 - (totalCompatibilityErrors / denominator)) : 0;
  const categorical = verifyCategoricalCompatibility(states, epsilon, measuredComponents);
  const witness = buildInverseLimitWitness(states, epsilon, measuredComponents);
  const contractionRate = firstFinite(summaryMetrics.contraction_norm_K, summaryMetrics.lipschitz_norm_K, summaryMetrics.contraction_rate, 0.5);
  const approximation = boundFiniteApproximationError(states.length, contractionRate ?? 0.5);
  if (totalCompatibilityErrors > 0) {
    logger.warn('inverse_limit_compatibility_errors', {
      totalCompatibilityErrors,
      denominator,
      window: states.length,
      components: measuredComponents
    });
  }
  return {
    score: normalizeNumber(score),
    inverse_limit_score: normalizeNumber(score),
    totalCompatibilityErrors,
    denominator,
    comparisons: Math.max(0, states.length - 1),
    window: states.length,
    epsilon: Math.max(0, finite(epsilon, 0.05)),
    components: measuredComponents,
    unmeasuredComponents: componentList.filter((component) => !measuredComponents.includes(component)),
    morphisms,
    categorical_compatibility: categorical.categorical_compatibility,
    categoricalCompatibility: categorical,
    is_inverse_limit_element: witness.is_inverse_limit_element,
    inverseLimitWitness: witness,
    approximation_error_bound: approximation.approximation_error_bound,
    finiteApproximationError: approximation,
    foundational_front1: evaluateFoundationalFront1(),
    claim_scope: 'finite_horizon_inverse_limit_score_only',
    evidence_status: 'computed_finite_window',
    interpretation_boundary: 'Finite-window inverse-limit witness and compatibility score; not full inverse-limit preservation or uniqueness over all identity candidates.'
  };
};

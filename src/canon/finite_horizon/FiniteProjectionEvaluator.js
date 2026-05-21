// @ts-check

import { createLogger } from '../../utils/logger.js';

const finite = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

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
 * @property {number} inverse_limit_score
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
  const keys = Object.keys(target).filter((key) => Number.isFinite(Number(projected[key])) && Number.isFinite(Number(target[key])));
  const errors = keys.map((key) => Math.abs(finite(projected[key]) - finite(target[key])));
  const error = mean(errors);
  const epsilon = finite(metricSpec.epsilon, 0);
  const comparator = metricSpec.comparator || 'lte';
  const pass = comparator === 'lt' ? error < epsilon : error <= epsilon;
  return {
    metric: metricSpec.name || 'l1_absolute',
    n: keys.length,
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
      score: 1,
      inverse_limit_score: 1,
      totalCompatibilityErrors: 0,
      denominator: 0,
      comparisons: 0,
      window: states.length,
      epsilon: Math.max(0, finite(epsilon, 0.05)),
      components: measuredComponents,
      unmeasuredComponents: componentList,
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
  const score = denominator > 0 ? clamp01(1 - (totalCompatibilityErrors / denominator)) : 1;
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
    claim_scope: 'finite_horizon_inverse_limit_score_only',
    evidence_status: 'computed_finite_window',
    interpretation_boundary: 'Finite-window inverse-limit witness and compatibility score; not full inverse-limit preservation or uniqueness over all identity candidates.'
  };
};

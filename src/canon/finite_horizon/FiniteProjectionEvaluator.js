const finite = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

const getByPath = (obj, dottedPath) => String(dottedPath || '')
  .split('.')
  .filter(Boolean)
  .reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);

const normalizeNumber = (value) => (Number.isFinite(value) ? Number(value.toFixed(12)) : value);
const mean = (values) => (values.length ? normalizeNumber(values.reduce((sum, value) => sum + value, 0) / values.length) : 0);
const clamp01 = (value) => Math.max(0, Math.min(1, finite(value, 0)));

export const INVERSE_LIMIT_COMPONENTS = Object.freeze([
  'ccc',
  'beth_q',
  'omega',
  'spectral_gap',
  'identity_stability',
  'hash_semantic'
]);

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
    claim_scope: 'finite_horizon_inverse_limit_score_only',
    evidence_status: 'computed_finite_window',
    interpretation_boundary: 'Finite-window adjacent-state compatibility score; not full inverse-limit preservation.'
  };
};

const finite = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

const getByPath = (obj, dottedPath) => String(dottedPath || '')
  .split('.')
  .filter(Boolean)
  .reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);

const normalizeNumber = (value) => (Number.isFinite(value) ? Number(value.toFixed(12)) : value);
const mean = (values) => (values.length ? normalizeNumber(values.reduce((sum, value) => sum + value, 0) / values.length) : 0);

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

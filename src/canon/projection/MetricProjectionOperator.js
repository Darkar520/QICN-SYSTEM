export const METRIC_PROJECTION_BOUNDARY =
  'Finite metric projection proxy only; not the Hilbert-space Aleph operator and not formal proof of BaseCore projection theorems.';

const finite = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const euclideanDistance = (left = {}, right = {}, metricSpec = {}) => {
  const components = Array.isArray(metricSpec.components) ? metricSpec.components : Object.keys({ ...left, ...right });
  const weights = metricSpec.weights || {};
  let sum = 0;
  let n = 0;
  for (const component of components) {
    const a = finite(left[component], NaN);
    const b = finite(right[component], NaN);
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    const w = Math.max(0, finite(weights[component], 1));
    sum += w * ((a - b) ** 2);
    n += 1;
  }
  return n > 0 ? Math.sqrt(sum) : Infinity;
};

const normalizeConstraintFamily = (constraintFamily = {}) => ({
  label: constraintFamily.label || 'unnamed_finite_constraint_family',
  bounds: constraintFamily.bounds || {},
  halfSpaces: Array.isArray(constraintFamily.halfSpaces) ? constraintFamily.halfSpaces : [],
  requiredComponents: Array.isArray(constraintFamily.requiredComponents) ? constraintFamily.requiredComponents : []
});

export const projectOntoAdmissibleSet = (vector = {}, constraintFamily = {}, metricSpec = {}) => {
  const family = normalizeConstraintFamily(constraintFamily);
  const projected = { ...vector };
  const missing = family.requiredComponents.filter((component) => !Number.isFinite(Number(vector[component])));
  if (missing.length) {
    return {
      schema: 'qicn.metric_projection_proxy.v1',
      status: 'INSUFFICIENT_EVIDENCE',
      pass: false,
      claim_scope: 'finite_metric_projection_proxy',
      input_vector: { ...vector },
      projected_vector: null,
      residual: Infinity,
      missing_components: missing,
      constraint_family: family.label,
      metric_spec: metricSpec.name || 'weighted_euclidean',
      interpretation_boundary: METRIC_PROJECTION_BOUNDARY
    };
  }

  for (const [component, bound] of Object.entries(family.bounds)) {
    const value = finite(projected[component], NaN);
    if (!Number.isFinite(value)) continue;
    projected[component] = clamp(
      value,
      finite(bound.min, Number.NEGATIVE_INFINITY),
      finite(bound.max, Number.POSITIVE_INFINITY)
    );
  }

  for (const halfSpace of family.halfSpaces) {
    const coeffs = halfSpace.coefficients || {};
    const limit = finite(halfSpace.max, Infinity);
    const keys = Object.keys(coeffs);
    const normSq = keys.reduce((sum, key) => sum + (finite(coeffs[key], 0) ** 2), 0);
    const dot = keys.reduce((sum, key) => sum + finite(coeffs[key], 0) * finite(projected[key], 0), 0);
    if (normSq > 0 && dot > limit) {
      const scale = (dot - limit) / normSq;
      for (const key of keys) projected[key] = finite(projected[key], 0) - scale * finite(coeffs[key], 0);
    }
  }

  const residual = euclideanDistance(vector, projected, metricSpec);
  return {
    schema: 'qicn.metric_projection_proxy.v1',
    status: residual <= finite(metricSpec.epsilon, 1e-9) ? 'FINITE_WITNESS' : 'FINITE_PROXY',
    pass: true,
    claim_scope: 'finite_metric_projection_proxy',
    input_vector: { ...vector },
    projected_vector: projected,
    residual,
    constraint_family: family.label,
    metric_spec: metricSpec.name || 'weighted_euclidean',
    interpretation_boundary: METRIC_PROJECTION_BOUNDARY
  };
};

export const verifyNonExpansive = (samples = [], projectionFn, metricSpec = {}) => {
  if (!Array.isArray(samples) || samples.length < 2 || typeof projectionFn !== 'function') {
    return {
      pass: false,
      classification: 'insufficient_projection_samples',
      max_ratio: null,
      interpretation_boundary: METRIC_PROJECTION_BOUNDARY
    };
  }
  let maxRatio = 0;
  let comparisons = 0;
  for (let i = 0; i < samples.length - 1; i += 1) {
    for (let j = i + 1; j < samples.length; j += 1) {
      const before = euclideanDistance(samples[i], samples[j], metricSpec);
      if (!Number.isFinite(before) || before <= 1e-12) continue;
      const pi = projectionFn(samples[i]);
      const pj = projectionFn(samples[j]);
      const after = euclideanDistance(pi, pj, metricSpec);
      maxRatio = Math.max(maxRatio, after / before);
      comparisons += 1;
    }
  }
  return {
    pass: comparisons > 0 && maxRatio <= 1 + finite(metricSpec.tolerance, 1e-9),
    classification: comparisons > 0 && maxRatio <= 1 + finite(metricSpec.tolerance, 1e-9)
      ? 'finite_non_expansive_sample_check_passed'
      : 'finite_non_expansive_sample_check_failed',
    max_ratio: comparisons > 0 ? maxRatio : null,
    comparisons,
    interpretation_boundary: METRIC_PROJECTION_BOUNDARY
  };
};

export const buildProjectionCertificate = ({ vector, constraintFamily, metricSpec, samples = [] } = {}) => {
  const projection = projectOntoAdmissibleSet(vector, constraintFamily, metricSpec);
  const family = normalizeConstraintFamily(constraintFamily);
  const project = (sample) => projectOntoAdmissibleSet(sample, family, metricSpec).projected_vector || sample;
  const nonExpansive = verifyNonExpansive(samples, project, metricSpec);
  return {
    ...projection,
    non_expansive_sample_check: nonExpansive,
    cannot_certify_hilbert_projection: true
  };
};

export default buildProjectionCertificate;

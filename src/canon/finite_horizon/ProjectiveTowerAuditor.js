import {
  INVERSE_LIMIT_COMPONENTS,
  buildInverseLimitStateFromTick,
  computeInverseLimitScore,
  projectionMorphism
} from './FiniteProjectionEvaluator.js';

export const PROJECTIVE_TOWER_BOUNDARY =
  'Finite projective tower witness only; not full inverse-limit preservation, uniqueness, or CCR verification.';

const finite = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const clamp01 = (value) => Math.max(0, Math.min(1, finite(value, 0)));

const variance = (values) => {
  const xs = values.filter(Number.isFinite);
  if (xs.length < 2) return 0;
  const mean = xs.reduce((sum, value) => sum + value, 0) / xs.length;
  return xs.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / xs.length;
};

export const computeDegeneracyScore = (states = [], components = INVERSE_LIMIT_COMPONENTS) => {
  if (states.length < 2) return 1;
  const componentVariances = components.map((component) => variance(states.map((state) => finite(state[component], NaN))));
  const meanVariance = componentVariances.reduce((sum, value) => sum + value, 0) / Math.max(1, componentVariances.length);
  return clamp01(1 - Math.min(1, meanVariance * 1000));
};

export const probeFiniteNFD = (states = [], components = INVERSE_LIMIT_COMPONENTS, epsilon = 0.05) => {
  if (states.length < 4) {
    return {
      pass: false,
      classification: 'insufficient_horizon_for_nfd_probe',
      nfd_score: 0,
      interpretation_boundary: PROJECTIVE_TOWER_BOUNDARY
    };
  }
  let prefixSimilar = 0;
  let divergentCompatible = 0;
  for (let i = 0; i < states.length - 2; i += 1) {
    for (let j = i + 1; j < states.length - 1; j += 1) {
      const prefixDistance = Math.sqrt(components.reduce((sum, key) => sum + ((finite(states[i][key], 0) - finite(states[j][key], 0)) ** 2), 0));
      if (prefixDistance <= epsilon) {
        prefixSimilar += 1;
        const futureDistance = Math.sqrt(components.reduce((sum, key) => sum + ((finite(states[i + 1][key], 0) - finite(states[j + 1][key], 0)) ** 2), 0));
        const compatible = projectionMorphism(states[i + 1], states[i], epsilon, components).compatible
          && projectionMorphism(states[j + 1], states[j], epsilon, components).compatible;
        if (compatible && futureDistance > epsilon / 2) divergentCompatible += 1;
      }
    }
  }
  const nfdScore = prefixSimilar > 0 ? divergentCompatible / prefixSimilar : 0;
  return {
    pass: nfdScore > 0,
    classification: nfdScore > 0 ? 'finite_nfd_probe_has_divergent_extensions' : 'finite_prefix_collapse_risk',
    nfd_score: clamp01(nfdScore),
    prefix_similar_pairs: prefixSimilar,
    divergent_compatible_pairs: divergentCompatible,
    interpretation_boundary: PROJECTIVE_TOWER_BOUNDARY
  };
};

export const auditProjectiveTower = ({
  trace = [],
  horizons = [8, 16, 32, 64],
  epsilon = 0.05,
  components = INVERSE_LIMIT_COMPONENTS,
  summaryMetrics = {}
} = {}) => {
  const cleanHorizons = horizons.map((h) => Math.max(2, Math.floor(finite(h, 0)))).filter((h) => h <= trace.length);
  const perHorizon = cleanHorizons.map((horizon) => {
    const slice = trace.slice(Math.max(0, trace.length - horizon));
    const states = slice.map((tick) => buildInverseLimitStateFromTick(tick, summaryMetrics));
    const inverse = computeInverseLimitScore({ trace: slice, window: horizon, epsilon, components, summaryMetrics });
    const degeneracyScore = computeDegeneracyScore(states, components);
    const nfdProbe = probeFiniteNFD(states, components, epsilon);
    const strongFiniteWitness = inverse.is_inverse_limit_element
      && inverse.categorical_compatibility
      && degeneracyScore < 0.85
      && nfdProbe.nfd_score > 0;
    return {
      horizon,
      inverse_limit_score: inverse.inverse_limit_score,
      categorical_compatibility: inverse.categorical_compatibility,
      is_inverse_limit_element: inverse.is_inverse_limit_element,
      approximation_error_bound: inverse.approximation_error_bound,
      degeneracy_score: degeneracyScore,
      nfd_probe: nfdProbe,
      strong_finite_witness: strongFiniteWitness,
      interpretation_boundary: PROJECTIVE_TOWER_BOUNDARY
    };
  });
  const strongCount = perHorizon.filter((item) => item.strong_finite_witness).length;
  const degeneracyRisk = perHorizon.some((item) => item.degeneracy_score >= 0.85);
  return {
    schema: 'qicn.projective_tower_audit.v1',
    status: strongCount > 0 && !degeneracyRisk ? 'FINITE_WITNESS' : 'FINITE_PROXY',
    claim_scope: 'finite_projective_tower_witness',
    horizons_evaluated: perHorizon.map((item) => item.horizon),
    strong_witness_count: strongCount,
    degeneracy_risk: degeneracyRisk,
    per_horizon: perHorizon,
    interpretation_boundary: PROJECTIVE_TOWER_BOUNDARY
  };
};

export default auditProjectiveTower;

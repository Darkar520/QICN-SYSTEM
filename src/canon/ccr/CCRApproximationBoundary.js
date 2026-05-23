export const CCR_BOUNDARY =
  'Finite CCR approximation boundary only; no finite runtime report verifies CCR or M_Omega = infinity.';

export const CCR_LEVELS = Object.freeze({
  NO_EVIDENCE: 0,
  FINITE_STABILITY: 1,
  PERTURBATION_RESISTANCE: 2,
  PROJECTION_COMPATIBILITY: 3,
  LOWER_BOUND_GROWTH: 4,
  CCR_APPROXIMATION_CANDIDATE: 5
});

const has = (value) => Boolean(value);

export const classifyCCRApproximation = ({
  finiteStability = false,
  perturbationResistance = false,
  projectionCompatibility = false,
  lowerBoundGrowth = false,
  collapseEvent = false,
  negativeControlsPassed = false
} = {}) => {
  let level = CCR_LEVELS.NO_EVIDENCE;
  const missingBurdens = [];
  const falsifiers = [];
  if (collapseEvent) falsifiers.push('collapse_event_observed');
  if (has(finiteStability) && !collapseEvent) level = Math.max(level, CCR_LEVELS.FINITE_STABILITY);
  else missingBurdens.push('finite_stability');
  if (has(perturbationResistance) && level >= CCR_LEVELS.FINITE_STABILITY) level = Math.max(level, CCR_LEVELS.PERTURBATION_RESISTANCE);
  else missingBurdens.push('perturbation_resistance');
  if (has(projectionCompatibility) && level >= CCR_LEVELS.PERTURBATION_RESISTANCE) level = Math.max(level, CCR_LEVELS.PROJECTION_COMPATIBILITY);
  else missingBurdens.push('projection_compatibility');
  if (has(lowerBoundGrowth) && level >= CCR_LEVELS.PROJECTION_COMPATIBILITY) level = Math.max(level, CCR_LEVELS.LOWER_BOUND_GROWTH);
  else missingBurdens.push('lower_bound_growth');
  if (has(negativeControlsPassed) && level >= CCR_LEVELS.LOWER_BOUND_GROWTH) level = CCR_LEVELS.CCR_APPROXIMATION_CANDIDATE;
  else missingBurdens.push('negative_controls_passed');
  if (collapseEvent) level = Math.min(level, CCR_LEVELS.FINITE_STABILITY);
  const labels = [
    'no_evidence',
    'finite_stability',
    'perturbation_resistance',
    'projection_compatibility',
    'lower_bound_growth',
    'ccr_approximation_candidate'
  ];
  return {
    schema: 'qicn.ccr_approximation_boundary.v1',
    level,
    label: labels[level],
    status: level >= CCR_LEVELS.LOWER_BOUND_GROWTH ? 'FINITE_PROXY' : 'INSUFFICIENT_EVIDENCE',
    missing_burdens: [...new Set(missingBurdens)],
    falsifiers,
    cannot_verify_CCR: true,
    forbidden_claim: 'Full closed-causal-rigidity certification from finite runtime evidence.',
    interpretation_boundary: CCR_BOUNDARY
  };
};

export default classifyCCRApproximation;

export const CCR_APPROXIMATION_BOUNDARY =
  'CCR approximation ladder only; finite runtime evidence cannot verify CCR, infinite ontological mass, or unconditional non-collapse.';

export const CCR_LEVELS = Object.freeze({
  NO_EVIDENCE: 0,
  FINITE_STABILITY: 1,
  PERTURBATION_RESISTANCE: 2,
  PROJECTION_COMPATIBILITY: 3,
  FAMILY_UPPER_BOUND_GROWTH: 4,
  LOWER_BOUND_GROWTH: 4, // deprecated transition alias (C-11)
  CCR_APPROXIMATION_CANDIDATE: 5
});

export const classifyCCRApproximation = ({
  finiteStability = false,
  perturbationResistance = false,
  projectionCompatibility = false,
  upperBoundGrowth = false,
  lowerBoundGrowth = false,
  negativeControlsPassed = false,
  collapseEvent = false
} = {}) => {
  const effectiveUpperBoundGrowth = Boolean(upperBoundGrowth || lowerBoundGrowth);
  let level = CCR_LEVELS.NO_EVIDENCE;
  if (finiteStability) level = CCR_LEVELS.FINITE_STABILITY;
  if (level >= 1 && perturbationResistance && !collapseEvent) level = CCR_LEVELS.PERTURBATION_RESISTANCE;
  if (level >= 2 && projectionCompatibility) level = CCR_LEVELS.PROJECTION_COMPATIBILITY;
  if (level >= 3 && effectiveUpperBoundGrowth) level = CCR_LEVELS.FAMILY_UPPER_BOUND_GROWTH;
  if (level >= 4 && negativeControlsPassed && !collapseEvent) level = CCR_LEVELS.CCR_APPROXIMATION_CANDIDATE;

  const labels = {
    0: 'no_evidence',
    1: 'finite_stability',
    2: 'perturbation_resistance',
    3: 'projection_compatibility',
    4: 'family_upper_bound_growth',
    5: 'ccr_approximation_candidate'
  };

  return {
    schema: 'qicn.ccr_approximation_boundary.v2',
    level,
    label: labels[level],
    cannot_verify_CCR: true,
    collapse_event_observed: Boolean(collapseEvent),
    evidence: {
      finiteStability: Boolean(finiteStability),
      perturbationResistance: Boolean(perturbationResistance),
      projectionCompatibility: Boolean(projectionCompatibility),
      upperBoundGrowth: effectiveUpperBoundGrowth,
      lowerBoundGrowth: effectiveUpperBoundGrowth,
      negativeControlsPassed: Boolean(negativeControlsPassed)
    },
    deprecated_aliases: ['LOWER_BOUND_GROWTH', 'lowerBoundGrowth'],
    interpretation_boundary: CCR_APPROXIMATION_BOUNDARY
  };
};

export default classifyCCRApproximation;

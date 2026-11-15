const num = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const ONTOLOGICAL_MASS_BOUNDARY =
  'Finite family-specific upper-bound estimator on M_Omega only (C-11, Paper I def:ontmass); the minimum of E_w / d_w over a finite subfamily of deforming perturbations (d_w > 0) is an upper bound on the global infimum M_Omega, does not compute M_Omega, and cannot certify M_Omega = infinity or CCR.';

export const estimateOntologicalMassFamilyUpperBound = ({
  perturbations = [],
  epsilon = 1e-9,
  familyId = 'unspecified_finite_family'
} = {}) => {
  const rows = Array.isArray(perturbations) ? perturbations : [];
  const ratios = [];
  const falsificationEvents = [];
  const excludedPerturbations = [];

  rows.forEach((item, index) => {
    const energy = num(item?.energy ?? item?.cost ?? item?.work, NaN);
    const deformation = num(item?.deformation ?? item?.displacement ?? item?.delta, NaN);
    if (!Number.isFinite(energy) || !Number.isFinite(deformation) || energy < 0 || deformation < 0) return;
    const absDeformation = Math.abs(deformation);
    if (absDeformation <= epsilon) {
      excludedPerturbations.push({
        index,
        id: item?.id || `perturbation_${index}`,
        energy,
        deformation,
        reason: 'zero_or_subthreshold_deformation_excluded'
      });
      return;
    }
    if (energy <= epsilon && absDeformation > epsilon) {
      falsificationEvents.push({
        index,
        id: item?.id || `perturbation_${index}`,
        energy,
        deformation,
        reason: 'zero_energy_nonzero_deformation'
      });
      return;
    }
    ratios.push(energy / absDeformation);
  });

  const sorted = [...ratios].sort((a, b) => a - b);
  const familyUpperBound = sorted.length ? sorted[0] : null;
  const medianBound = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
  const maxBound = sorted.length ? sorted[sorted.length - 1] : null;

  return {
    schema: 'qicn.ontological_mass_family_upper_bound.v2',
    status: ratios.length >= 2 && falsificationEvents.length === 0 ? 'UPPER_BOUND_SUPPORT' : 'INSUFFICIENT_EVIDENCE',
    family_id: String(familyId),
    sample_count: ratios.length,
    excluded_count: excludedPerturbations.length,
    excluded_perturbations: excludedPerturbations,
    family_upper_bound: familyUpperBound,
    lower_bound: familyUpperBound,
    deprecated_aliases: ['lower_bound', 'estimateOntologicalMassLowerBound'],
    sample_median: medianBound,
    sample_max: maxBound,
    falsification_events: falsificationEvents,
    cannot_compute_M_Omega: true,
    cannot_certify_CCR: true,
    interpretation_boundary: ONTOLOGICAL_MASS_BOUNDARY
  };
};

// Transition alias preserved for backward compatibility (Point 2 / C-11)
export const estimateOntologicalMassLowerBound = estimateOntologicalMassFamilyUpperBound;

export default estimateOntologicalMassFamilyUpperBound;

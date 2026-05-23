export const ONTOLOGICAL_MASS_BOUNDARY =
  'Finite family-specific lower-bound estimator only; does not compute M_Omega and cannot certify M_Omega = infinity or CCR.';

const finite = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

const quantile = (values, q) => {
  const xs = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!xs.length) return null;
  const idx = Math.max(0, Math.min(xs.length - 1, Math.floor(q * (xs.length - 1))));
  return xs[idx];
};

export const estimateOntologicalMassLowerBound = ({
  familyId = 'unspecified_perturbation_family',
  perturbations = [],
  epsilon = 1e-9
} = {}) => {
  const ratios = [];
  const falsificationEvents = [];
  for (const perturbation of perturbations) {
    const energy = finite(perturbation.energy, NaN);
    const deformation = finite(perturbation.deformation, NaN);
    if (!Number.isFinite(energy) || !Number.isFinite(deformation)) {
      falsificationEvents.push({ id: perturbation.id || 'unknown', reason: 'non_finite_energy_or_deformation' });
      continue;
    }
    if (energy <= 0 && deformation > epsilon) {
      falsificationEvents.push({ id: perturbation.id || 'unknown', reason: 'zero_energy_nonzero_deformation' });
    }
    ratios.push(energy / Math.max(Math.abs(deformation), epsilon));
  }
  const lowerBound = quantile(ratios, 0);
  const medianBound = quantile(ratios, 0.5);
  const upperBound = quantile(ratios, 1);
  const coverage = perturbations.length ? ratios.length / perturbations.length : 0;
  return {
    schema: 'qicn.ontological_mass_lower_bound.v1',
    status: ratios.length >= 2 && falsificationEvents.length === 0 ? 'LOWER_BOUND_SUPPORT' : 'INSUFFICIENT_EVIDENCE',
    family_id: familyId,
    sample_count: perturbations.length,
    valid_sample_count: ratios.length,
    perturbation_coverage: coverage,
    lower_bound: lowerBound,
    median_bound: medianBound,
    upper_bound: upperBound,
    confidence_envelope: {
      lower: lowerBound,
      median: medianBound,
      upper: upperBound
    },
    falsification_events: falsificationEvents,
    cannot_certify_CCR: true,
    cannot_compute_M_Omega: true,
    interpretation_boundary: ONTOLOGICAL_MASS_BOUNDARY
  };
};

export default estimateOntologicalMassLowerBound;

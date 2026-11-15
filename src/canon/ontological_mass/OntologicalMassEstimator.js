const num = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const ONTOLOGICAL_MASS_BOUNDARY =
  'Finite family-specific upper-bound estimator on M_Omega only (C-11, Paper I def:ontmass); the minimum of E_w / d_w over a finite subfamily of deforming perturbations (d_w > 0) is an upper bound on the global infimum M_Omega, does not compute M_Omega, and cannot certify M_Omega = infinity or CCR.';

export const estimateOntologicalMassFamilyUpperBound = (input = {}, extraOptions = {}) => {
  const options = { ...(input && typeof input === 'object' ? input : {}), ...(extraOptions && typeof extraOptions === 'object' ? extraOptions : {}) };
  const {
    perturbations = [],
    epsilon = 1e-9,
    minDeformation = epsilon,
    familyId = 'unspecified_finite_family',
    allowSignedDisplacement = false
  } = options;

  const rows = Array.isArray(perturbations) ? perturbations : [];
  const tol = Math.max(0, num(epsilon, 1e-9));
  const minDeformationThreshold = Number.isFinite(Number(minDeformation))
    ? Math.max(0, Number(minDeformation))
    : tol;
  const ratios = [];
  const falsificationEvents = [];
  const excludedPerturbations = [];
  let signedDisplacementNormalizedCount = 0;

  rows.forEach((item, index) => {
    const rawEnergy = item?.energy ?? item?.cost ?? item?.work;
    const rawDeformation = item?.deformation ?? item?.displacement ?? item?.delta;
    const energy = rawEnergy === null || rawEnergy === undefined || rawEnergy === '' ? NaN : Number(rawEnergy);
    const deformation = rawDeformation === null || rawDeformation === undefined || rawDeformation === '' ? NaN : Number(rawDeformation);
    const perturbationId = item?.id ?? item?.perturbation_id ?? `perturbation_${index}`;

    if (!Number.isFinite(energy) || !Number.isFinite(deformation) || energy < 0) {
      excludedPerturbations.push({
        index,
        id: perturbationId,
        perturbation_id: perturbationId,
        energy: Number.isFinite(energy) ? energy : null,
        deformation: Number.isFinite(deformation) ? deformation : null,
        reason: 'invalid_nonfinite_or_negative_energy'
      });
      return;
    }

    let effectiveDeformation = deformation;
    let signedNormalized = false;

    if (deformation < 0) {
      const canNormalizeSigned = allowSignedDisplacement === true || item?.signed_displacement === true;
      if (!canNormalizeSigned) {
        excludedPerturbations.push({
          index,
          id: perturbationId,
          perturbation_id: perturbationId,
          energy,
          deformation,
          reason: 'negative_metric_deformation_excluded'
        });
        return;
      }
      effectiveDeformation = Math.abs(deformation);
      signedNormalized = true;
    }

    if (effectiveDeformation === 0) {
      excludedPerturbations.push({
        index,
        id: perturbationId,
        perturbation_id: perturbationId,
        energy,
        deformation,
        ...(signedNormalized ? { effective_deformation: effectiveDeformation, signed_displacement_normalized: true } : {}),
        reason: 'zero_deformation_excluded_from_infimum'
      });
      return;
    }

    if (effectiveDeformation <= minDeformationThreshold) {
      excludedPerturbations.push({
        index,
        id: perturbationId,
        perturbation_id: perturbationId,
        energy,
        deformation,
        ...(signedNormalized ? { effective_deformation: effectiveDeformation, signed_displacement_normalized: true } : {}),
        reason: 'below_min_deformation_threshold'
      });
      return;
    }

    if (energy <= tol && effectiveDeformation > minDeformationThreshold) {
      falsificationEvents.push({
        index,
        id: perturbationId,
        perturbation_id: perturbationId,
        energy,
        deformation,
        effective_deformation: effectiveDeformation,
        ...(signedNormalized ? { signed_displacement_normalized: true } : {}),
        reason: 'zero_energy_nonzero_deformation'
      });
      return;
    }

    if (signedNormalized) {
      signedDisplacementNormalizedCount += 1;
    }
    ratios.push(energy / effectiveDeformation);
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
    deprecated_aliases: ['estimateOntologicalMassLowerBound'],
    removed_aliases: ['lower_bound'],
    signed_displacement_normalized: signedDisplacementNormalizedCount > 0,
    signed_displacement_normalized_count: signedDisplacementNormalizedCount,
    sample_median: medianBound,
    sample_max: maxBound,
    falsification_events: falsificationEvents,
    cannot_compute_M_Omega: true,
    cannot_certify_CCR: true,
    interpretation_boundary: ONTOLOGICAL_MASS_BOUNDARY
  };
};

// Transition alias preserved for backward compatibility (Point 2 / C-11)
export const estimateOntologicalMassLowerBound = (...args) =>
  estimateOntologicalMassFamilyUpperBound(...args);

export default estimateOntologicalMassFamilyUpperBound;

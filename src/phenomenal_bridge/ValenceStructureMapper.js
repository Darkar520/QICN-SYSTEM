import {
  asNumber,
  buildReportProvenance,
  clamp01,
  createBridgeReport,
  normalizeAgainstCap
} from './BridgeSurfaceUtils.js';

export const mapValenceStructure = (bundle) => {
  const valuation = bundle.subjective_valuation_report;
  const intervention = bundle.subjectivity_intervention_profile;
  const runtimeProjection = bundle.subjectivity_runtime_projection;

  const polaritySeparation = normalizeAgainstCap(valuation?.valuation_asymmetry_margin, 0.4);
  const valenceTopology = clamp01(
    normalizeAgainstCap(
      asNumber(valuation?.self_weight_summary?.mean_weight, 0)
        - asNumber(valuation?.nonself_weight_summary?.mean_weight, 0),
      0.5
    )
  );
  const inversionGradient = normalizeAgainstCap(
    Math.abs(asNumber(valuation?.inversion_response?.margin_shift, 0)),
    0.15
  );
  const aggregateProfile = intervention?.aggregate_profile || {};
  const selectiveCount = asNumber(aggregateProfile.selective_drop_count, 0);
  const flatDamageCount = asNumber(aggregateProfile.flat_damage_count, 0);
  const confoundedCount = asNumber(aggregateProfile.control_confounded_count, 0);
  const profileTotal = selectiveCount + flatDamageCount + confoundedCount;
  const perturbationSelectivity = clamp01(
    0.55 * (profileTotal > 0 ? selectiveCount / profileTotal : 0)
      + 0.45 * asNumber(runtimeProjection?.coordinate_estimates?.InterventionProfile?.estimate, 0)
  );

  const aliasingPenalty = valuation?.aliasing_warning?.flag ? 0.85 : 1;
  const estimate = clamp01(
    (0.4 * polaritySeparation
      + 0.25 * valenceTopology
      + 0.2 * inversionGradient
      + 0.15 * perturbationSelectivity)
      * aliasingPenalty
  );

  const warnings = [];
  const uncertaintyMarkers = [];
  if (valuation?.aliasing_warning?.flag) warnings.push('valuation_aliasing_penalty_applied');
  if ((valuation?.weighting_classification || '') !== 'self-preserving') {
    uncertaintyMarkers.push('valuation_topology_not_self_preserving');
  }
  if (confoundedCount > 0) warnings.push('control_confounded_intervention_profile_present');

  return createBridgeReport({
    artifactName: 'valence_structure_report.json',
    runId: bundle.run_id,
    predicateId: 'Pi_V',
    predicateName: 'valence_structure',
    runtimeSurface: 'valence_structure_surface',
    bridgeRole:
      'Organized evaluative topology stronger than raw self/non-self asymmetry but still weaker than any affective or phenomenal verdict.',
    estimate,
    componentScores: {
      polarity_separation: polaritySeparation,
      valence_topology: valenceTopology,
      inversion_gradient: inversionGradient,
      perturbation_selectivity: perturbationSelectivity,
      aliasing_penalty: aliasingPenalty
    },
    transformationLogic: {
      normalization_rules: [
        'valuation_asymmetry_margin normalized against provisional cap 0.40',
        'self-minus-nonself mean weight difference normalized against provisional cap 0.50',
        'absolute inversion margin shift normalized against provisional cap 0.15',
        'intervention selectivity combines aggregate selective-drop ratio with SRT-5 intervention estimate'
      ],
      aggregation_rule:
        '0.40 polarity_separation + 0.25 valence_topology + 0.20 inversion_gradient + 0.15 perturbation_selectivity, multiplied by aliasing penalty when needed',
      penalties_applied: warnings
    },
    upstreamDependencies: [
      { artifact_name: 'subjective_valuation_report.json', artifact_role: 'subjective_valuation_report' },
      { artifact_name: 'subjectivity_intervention_profile.json', artifact_role: 'subjectivity_intervention_profile' },
      { artifact_name: 'subjectivity_runtime_projection.json', artifact_role: 'subjectivity_runtime_projection' }
    ],
    fieldsUsed: [
      'subjective_valuation_report.valuation_asymmetry_margin',
      'subjective_valuation_report.self_weight_summary.mean_weight',
      'subjective_valuation_report.nonself_weight_summary.mean_weight',
      'subjective_valuation_report.weighting_classification',
      'subjective_valuation_report.inversion_response.margin_shift',
      'subjective_valuation_report.aliasing_warning.flag',
      'subjectivity_intervention_profile.aggregate_profile.selective_drop_count',
      'subjectivity_intervention_profile.aggregate_profile.flat_damage_count',
      'subjectivity_intervention_profile.aggregate_profile.control_confounded_count',
      'subjectivity_runtime_projection.coordinate_estimates.InterventionProfile.estimate'
    ],
    bridgeSpecificStructure: {
      polarity_basis: 'valuation_margin_and_self_nonself_weight_gap',
      topology_basis: 'distributed_self_preserving_case_structure',
      perturbation_basis: 'valuation_selectivity_under_minimal_srt3_interventions'
    },
    uncertaintyMarkers,
    warnings,
    collapseRisks: [
      'reward_bookkeeping_without_affective_organization',
      'uniform_reward_scaling_absorbs_apparent_valence',
      'policy_optimization_without_bridge_valence_structure'
    ],
    collapseStatus: estimate < 0.25 ? 'proxy_collapse_or_weak_signal' : 'provisional_structure_detected',
    nonImplications: ['not_felt_valence', 'not_suffering', 'not_bridge_verdict'],
    provenance: buildReportProvenance({
      artifactName: 'valence_structure_report.json',
      runId: bundle.run_id,
      upstreamRefs: bundle.refs,
      inputProfile: bundle.provenance?.input_profile,
      sourceTraceRef: bundle.provenance?.source_trace_ref
    })
  });
};

export default mapValenceStructure;

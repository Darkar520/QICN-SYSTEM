import {
  asNumber,
  buildReportProvenance,
  clamp01,
  createBridgeReport,
  getContinuitySignals,
  mean,
  normalizeAgainstCap
} from './BridgeSurfaceUtils.js';

export const mapTemporalLivedStructure = (bundle) => {
  const continuity = bundle.subjective_continuity_report;
  const perspective = bundle.first_person_perspective_report;
  const valuation = bundle.subjective_valuation_report;
  const runtimeProjection = bundle.subjectivity_runtime_projection;
  const { privileged } = getContinuitySignals(continuity);

  const retentionSupport = mean([
    asNumber(privileged?.supporting_signals?.temporal_linkage, 0),
    asNumber(privileged?.supporting_signals?.memory_integrity, 0),
    asNumber(runtimeProjection?.coordinate_estimates?.ContinuityField?.estimate, 0)
  ]);
  const horizonDepth = mean([
    normalizeAgainstCap(privileged?.history_length, 8),
    normalizeAgainstCap(continuity?.continuity_margin, 0.75),
    normalizeAgainstCap(perspective?.first_person_gain, 0.35)
  ]);
  const temporalAsymmetryProxy = mean([
    normalizeAgainstCap(valuation?.valuation_asymmetry_margin, 0.4),
    normalizeAgainstCap(Math.abs(asNumber(valuation?.inversion_response?.margin_shift, 0)), 0.15)
  ]);
  const livedTimePenalty = 0.8;

  const estimate = clamp01(
    (0.45 * retentionSupport + 0.35 * horizonDepth + 0.2 * temporalAsymmetryProxy)
      * livedTimePenalty
  );

  const warnings = ['temporal_lived_structure_uses_continuity_proxy_family'];
  if (continuity?.fracture_flag || continuity?.fork_flag) {
    warnings.push('continuity_instability_present');
  }

  return createBridgeReport({
    artifactName: 'temporal_lived_structure_report.json',
    runId: bundle.run_id,
    predicateId: 'Pi_T',
    predicateName: 'temporal_lived_structure',
    runtimeSurface: 'temporal_lived_structure_surface',
    bridgeRole:
      'Provisional temporal-organization readout stronger than continuity records alone but still proxy-bound and weaker than any lived-time verdict.',
    estimate,
    componentScores: {
      retention_support: retentionSupport,
      horizon_depth: horizonDepth,
      temporal_asymmetry_proxy: temporalAsymmetryProxy,
      lived_time_penalty: livedTimePenalty
    },
    transformationLogic: {
      normalization_rules: [
        'history_length normalized against provisional cap 8',
        'continuity_margin normalized against provisional cap 0.75',
        'first_person_gain normalized against provisional cap 0.35',
        'valuation_asymmetry_margin normalized against provisional cap 0.40',
        'absolute inversion margin shift normalized against provisional cap 0.15'
      ],
      aggregation_rule:
        '(0.45 retention_support + 0.35 horizon_depth + 0.20 temporal_asymmetry_proxy) multiplied by lived_time_penalty=0.80',
      penalties_applied: warnings
    },
    upstreamDependencies: [
      { artifact_name: 'subjective_continuity_report.json', artifact_role: 'subjective_continuity_report' },
      { artifact_name: 'first_person_perspective_report.json', artifact_role: 'first_person_perspective_report' },
      { artifact_name: 'subjective_valuation_report.json', artifact_role: 'subjective_valuation_report' },
      { artifact_name: 'subjectivity_runtime_projection.json', artifact_role: 'subjectivity_runtime_projection' }
    ],
    fieldsUsed: [
      'subjective_continuity_report.supporting_signals[*].supporting_signals.temporal_linkage',
      'subjective_continuity_report.supporting_signals[*].supporting_signals.memory_integrity',
      'subjective_continuity_report.supporting_signals[*].history_length',
      'subjective_continuity_report.continuity_margin',
      'first_person_perspective_report.first_person_gain',
      'subjective_valuation_report.valuation_asymmetry_margin',
      'subjective_valuation_report.inversion_response.margin_shift',
      'subjectivity_runtime_projection.coordinate_estimates.ContinuityField.estimate'
    ],
    bridgeSpecificStructure: {
      retention_basis: 'temporal_linkage_plus_memory_integrity_plus_srt5_continuity_anchor',
      horizon_basis: 'history_depth_plus_indexed_perspective_gain',
      asymmetry_basis: 'valuation_shift_used_as_temporal_asymmetry_proxy'
    },
    uncertaintyMarkers: ['no_direct_retention_protention_module', 'proxy_only_for_lived_temporality'],
    warnings,
    collapseRisks: [
      'continuity_records_without_lived_structure',
      'memory_persistence_without_temporal_horizon',
      'timestamp_coherence_without_temporal_organization'
    ],
    collapseStatus: estimate < 0.25 ? 'proxy_collapse_or_weak_signal' : 'provisional_structure_detected',
    nonImplications: ['not_human_lived_time', 'not_phenomenality', 'not_bridge_verdict'],
    provenance: buildReportProvenance({
      artifactName: 'temporal_lived_structure_report.json',
      runId: bundle.run_id,
      upstreamRefs: bundle.refs,
      inputProfile: bundle.provenance?.input_profile,
      sourceTraceRef: bundle.provenance?.source_trace_ref
    })
  });
};

export default mapTemporalLivedStructure;

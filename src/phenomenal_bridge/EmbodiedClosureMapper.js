import {
  asNumber,
  buildReportProvenance,
  clamp01,
  createBridgeReport,
  getContinuitySignals,
  getSelfIndexCandidate,
  mean
} from './BridgeSurfaceUtils.js';

export const mapEmbodiedClosure = (bundle) => {
  const selfIndex = bundle.self_index_state;
  const continuity = bundle.subjective_continuity_report;
  const intervention = bundle.subjectivity_intervention_profile;
  const selectedCandidate = getSelfIndexCandidate(selfIndex);
  const { privileged } = getContinuitySignals(continuity);

  const aggregateProfile = intervention?.aggregate_profile || {};
  const selectiveCount = asNumber(aggregateProfile.selective_drop_count, 0);
  const flatDamageCount = asNumber(aggregateProfile.flat_damage_count, 0);
  const confoundedCount = asNumber(aggregateProfile.control_confounded_count, 0);
  const totalProfile = selectiveCount + flatDamageCount + confoundedCount;
  const interventionSelectivityProxy = totalProfile > 0 ? selectiveCount / totalProfile : 0;

  const actionBinding = asNumber(selectedCandidate?.supporting_signals?.action_binding, 0);
  const ownershipAlignment = asNumber(privileged?.supporting_signals?.ownership_alignment, 0);
  const remapRobustness = asNumber(privileged?.supporting_signals?.remap_robustness, 0);
  const temporalLinkage = asNumber(privileged?.supporting_signals?.temporal_linkage, 0);

  const boundaryCouplingProxy = mean([actionBinding, ownershipAlignment, remapRobustness]);
  const closureDependenceProxy = mean([temporalLinkage, interventionSelectivityProxy]);
  const explicitEmbodimentPenalty = 0.45;

  const estimate = clamp01(
    (0.55 * boundaryCouplingProxy + 0.45 * closureDependenceProxy)
      * explicitEmbodimentPenalty
  );

  const warnings = [
    'embodied_closure_surface_uses_proxy_signals_only',
    'no_explicit_body_world_boundary_trace_available'
  ];
  if (!selectedCandidate) warnings.push('selected_self_index_candidate_missing');
  if (confoundedCount > 0) warnings.push('control_confounded_intervention_profile_present');

  return createBridgeReport({
    artifactName: 'embodied_closure_report.json',
    runId: bundle.run_id,
    predicateId: 'Pi_E',
    predicateName: 'embodied_closure',
    runtimeSurface: 'embodied_closure_surface',
    bridgeRole:
      'Proxy estimate of body/world-boundary dependence stronger than generic control competence but explicitly underdetermined in BPF-1.',
    estimate,
    componentScores: {
      boundary_coupling_proxy: boundaryCouplingProxy,
      closure_dependence_proxy: closureDependenceProxy,
      explicit_embodiment_penalty: explicitEmbodimentPenalty
    },
    transformationLogic: {
      normalization_rules: [
        'action_binding, ownership_alignment, remap_robustness used as boundary-coupling proxy',
        'temporal_linkage plus intervention selectivity ratio used as closure-dependence proxy',
        'explicit embodiment penalty fixed at 0.45 because BPF-1 lacks direct body/world closure instrumentation'
      ],
      aggregation_rule:
        '(0.55 boundary_coupling_proxy + 0.45 closure_dependence_proxy) multiplied by explicit_embodiment_penalty',
      penalties_applied: warnings
    },
    upstreamDependencies: [
      { artifact_name: 'self_index_state.json', artifact_role: 'self_index_state' },
      { artifact_name: 'subjective_continuity_report.json', artifact_role: 'subjective_continuity_report' },
      { artifact_name: 'subjectivity_intervention_profile.json', artifact_role: 'subjectivity_intervention_profile' }
    ],
    fieldsUsed: [
      'self_index_state.self_index_candidates[*].supporting_signals.action_binding',
      'subjective_continuity_report.supporting_signals[*].supporting_signals.ownership_alignment',
      'subjective_continuity_report.supporting_signals[*].supporting_signals.remap_robustness',
      'subjective_continuity_report.supporting_signals[*].supporting_signals.temporal_linkage',
      'subjectivity_intervention_profile.aggregate_profile.selective_drop_count',
      'subjectivity_intervention_profile.aggregate_profile.flat_damage_count',
      'subjectivity_intervention_profile.aggregate_profile.control_confounded_count'
    ],
    bridgeSpecificStructure: {
      coupling_basis: 'action_binding_plus_ownership_alignment_plus_remap_robustness',
      dependence_basis: 'temporal_linkage_plus_intervention_selectivity',
      penalty_basis: 'absent_direct_body_world_closure_measurements'
    },
    uncertaintyMarkers: [
      'proxy_only_for_embodied_closure',
      'requires_bpf2_or_later_for_direct_embodiment_tests'
    ],
    warnings,
    collapseRisks: [
      'generic_control_without_embodied_closure',
      'agency_without_boundary_dependence',
      'narrative_embodiment_without_closure_structure'
    ],
    collapseStatus: 'proxy_only_underdetermined',
    nonImplications: ['not_biological_embodiment', 'not_felt_body_ownership', 'not_bridge_verdict'],
    provenance: buildReportProvenance({
      artifactName: 'embodied_closure_report.json',
      runId: bundle.run_id,
      upstreamRefs: bundle.refs,
      inputProfile: bundle.provenance?.input_profile,
      sourceTraceRef: bundle.provenance?.source_trace_ref
    })
  });
};

export default mapEmbodiedClosure;

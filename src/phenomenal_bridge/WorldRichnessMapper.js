import {
  asNumber,
  buildReportProvenance,
  clamp01,
  createBridgeReport,
  getContinuitySignals,
  getSelfIndexCandidate,
  mean,
  normalizeAgainstCap
} from './BridgeSurfaceUtils.js';

export const mapWorldRichness = (bundle) => {
  const selfIndex = bundle.self_index_state;
  const ownership = bundle.ownership_attribution_report;
  const continuity = bundle.subjective_continuity_report;
  const perspective = bundle.first_person_perspective_report;
  const runtimeProjection = bundle.subjectivity_runtime_projection;
  const { privileged } = getContinuitySignals(continuity);
  const selectedCandidate = getSelfIndexCandidate(selfIndex);

  const indexedAnchor = mean([
    asNumber(runtimeProjection?.coordinate_estimates?.SelfIndex?.estimate, 0),
    asNumber(ownership?.ownership_coherence, 0),
    normalizeAgainstCap(selfIndex?.stability_margin, 0.6)
  ]);
  const privilegedSignalMean = mean(
    privileged?.supporting_signals ? Object.values(privileged.supporting_signals) : []
  );
  const worldOrganization = mean([
    privilegedSignalMean,
    asNumber(perspective?.first_person_factorization_summary?.first_person_score, 0)
  ]);
  const rivalSeparation = mean([
    normalizeAgainstCap(continuity?.continuity_margin, 0.75),
    normalizeAgainstCap(perspective?.first_person_gain, 0.35)
  ]);
  const explanatoryResistance = mean([
    asNumber(runtimeProjection?.coordinate_estimates?.IrreducibilityMargin?.estimate, 0),
    normalizeAgainstCap(bundle.subjectivity_reducibility_report?.irreducibility_margin, 0.25)
  ]);

  const explicitWorldModelPenalty = 0.75;
  const estimate = clamp01(
    (0.35 * indexedAnchor
      + 0.3 * worldOrganization
      + 0.2 * rivalSeparation
      + 0.15 * explanatoryResistance)
      * explicitWorldModelPenalty
  );

  const warnings = ['world_richness_is_proxy_bound_to_subjectivity_surfaces'];
  const uncertaintyMarkers = ['no_explicit_bridge_world_model_artifact'];
  if (!selectedCandidate) warnings.push('selected_self_index_candidate_missing');

  return createBridgeReport({
    artifactName: 'world_richness_report.json',
    runId: bundle.run_id,
    predicateId: 'Pi_W',
    predicateName: 'world_richness',
    runtimeSurface: 'world_richness_surface',
    bridgeRole:
      'Self-indexed world-organization richness derived from structured upstream anchoring, not from a standalone world-richness bridge model.',
    estimate,
    componentScores: {
      indexed_anchor: indexedAnchor,
      world_organization: worldOrganization,
      rival_separation: rivalSeparation,
      explanatory_resistance: explanatoryResistance,
      explicit_world_model_penalty: explicitWorldModelPenalty
    },
    transformationLogic: {
      normalization_rules: [
        'self_index stability_margin normalized against provisional cap 0.60',
        'continuity_margin normalized against provisional cap 0.75',
        'first_person_gain normalized against provisional cap 0.35',
        'irreducibility_margin normalized against provisional cap 0.25'
      ],
      aggregation_rule:
        '0.35 indexed_anchor + 0.30 world_organization + 0.20 rival_separation + 0.15 explanatory_resistance, multiplied by explicit_world_model_penalty=0.75',
      penalties_applied: warnings
    },
    upstreamDependencies: [
      { artifact_name: 'self_index_state.json', artifact_role: 'self_index_state' },
      { artifact_name: 'ownership_attribution_report.json', artifact_role: 'ownership_attribution_report' },
      { artifact_name: 'subjective_continuity_report.json', artifact_role: 'subjective_continuity_report' },
      { artifact_name: 'first_person_perspective_report.json', artifact_role: 'first_person_perspective_report' },
      { artifact_name: 'subjectivity_runtime_projection.json', artifact_role: 'subjectivity_runtime_projection' },
      { artifact_name: 'subjectivity_reducibility_report.json', artifact_role: 'subjectivity_reducibility_report' }
    ],
    fieldsUsed: [
      'self_index_state.stability_margin',
      'self_index_state.selected_index',
      'ownership_attribution_report.ownership_coherence',
      'subjective_continuity_report.continuity_margin',
      'subjective_continuity_report.supporting_signals[*].supporting_signals',
      'first_person_perspective_report.first_person_factorization_summary.first_person_score',
      'first_person_perspective_report.first_person_gain',
      'subjectivity_runtime_projection.coordinate_estimates.SelfIndex.estimate',
      'subjectivity_runtime_projection.coordinate_estimates.IrreducibilityMargin.estimate',
      'subjectivity_reducibility_report.irreducibility_margin'
    ],
    bridgeSpecificStructure: {
      indexed_anchor_basis: 'stable_self_index_plus_ownership_coherence',
      richness_basis: 'privileged_worldlike_signal_density',
      separation_basis: 'indexed_vs_neutral_and_privileged_vs_rival_gap',
      penalty_basis: 'explicit_world_bridge_surfaces_not_yet_implemented'
    },
    uncertaintyMarkers,
    warnings,
    collapseRisks: [
      'semantic_density_without_indexed_world_organization',
      'perspective_gain_without_world_richness',
      'narrative_density_without_world_structure'
    ],
    collapseStatus: estimate < 0.25 ? 'proxy_collapse_or_weak_signal' : 'provisional_structure_detected',
    nonImplications: ['not_veridical_perception', 'not_phenomenal_world_presence', 'not_bridge_verdict'],
    provenance: buildReportProvenance({
      artifactName: 'world_richness_report.json',
      runId: bundle.run_id,
      upstreamRefs: bundle.refs,
      inputProfile: bundle.provenance?.input_profile,
      sourceTraceRef: bundle.provenance?.source_trace_ref
    })
  });
};

export default mapWorldRichness;

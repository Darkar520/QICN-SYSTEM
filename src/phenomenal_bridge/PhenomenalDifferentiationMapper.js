import {
  asNumber,
  buildReportProvenance,
  clamp01,
  createBridgeReport,
  getContinuitySignals,
  normalizeAgainstCap,
  normalizeDifference
} from './BridgeSurfaceUtils.js';

export const mapPhenomenalDifferentiation = (bundle) => {
  const perspective = bundle.first_person_perspective_report;
  const continuity = bundle.subjective_continuity_report;
  const reducibility = bundle.subjectivity_reducibility_report;
  const runtimeProjection = bundle.subjectivity_runtime_projection;
  const { privileged, rival } = getContinuitySignals(continuity);

  const indexedContrast = clamp01(
    0.55 * normalizeAgainstCap(perspective?.first_person_gain, 0.35)
      + 0.45 * asNumber(runtimeProjection?.coordinate_estimates?.FirstPersonPerspective?.estimate, 0)
  );
  const rivalSeparation = clamp01(
    0.5 * normalizeAgainstCap(continuity?.continuity_margin, 0.75)
      + 0.5 * normalizeDifference(privileged?.continuity_score, rival?.continuity_score, 0.75)
  );
  const flatteningResistance = clamp01(1 - asNumber(perspective?.flattening_vulnerability, 1));
  const reducibilityResistance = reducibility?.comparison_supported
    ? clamp01(
        0.55 * normalizeAgainstCap(reducibility?.irreducibility_margin, 0.25)
          + 0.45
            * asNumber(
              runtimeProjection?.coordinate_estimates?.IrreducibilityMargin?.estimate,
              0
            )
      )
    : 0;

  const estimate = clamp01(
    0.3 * indexedContrast
      + 0.25 * rivalSeparation
      + 0.2 * flatteningResistance
      + 0.25 * reducibilityResistance
  );

  const warnings = [];
  const uncertaintyMarkers = [];
  if (!perspective?.factorization_supported) warnings.push('first_person_factorization_not_supported');
  if ((perspective?.comparison_status || '') === 'minimal_support') {
    uncertaintyMarkers.push('perspective_comparison_is_minimal');
  }
  if (!reducibility?.comparison_supported) {
    warnings.push('bridge_differentiation_missing_reducibility_anchor');
    uncertaintyMarkers.push('reducibility_anchor_absent');
  }
  if (asNumber(perspective?.flattening_vulnerability, 1) > 0.7) {
    warnings.push('flattening_vulnerability_high');
  }

  return createBridgeReport({
    artifactName: 'phenomenal_differentiation_report.json',
    runId: bundle.run_id,
    predicateId: 'Pi_D',
    predicateName: 'phenomenal_differentiation',
    runtimeSurface: 'phenomenal_differentiation_surface',
    bridgeRole:
      'Structured differentiated organization beyond raw semantic density proxies, indexed to the upstream subjectivity stack but weaker than any bridge verdict.',
    estimate,
    componentScores: {
      indexed_contrast: indexedContrast,
      rival_separation: rivalSeparation,
      flattening_resistance: flatteningResistance,
      reducibility_resistance: reducibilityResistance
    },
    transformationLogic: {
      normalization_rules: [
        'first_person_gain normalized against provisional cap 0.35',
        'continuity_margin normalized against provisional cap 0.75',
        'privileged-vs-rival continuity separation normalized against provisional cap 0.75',
        'irreducibility_margin normalized against provisional cap 0.25 when comparison_supported=true'
      ],
      aggregation_rule:
        '0.30 indexed_contrast + 0.25 rival_separation + 0.20 flattening_resistance + 0.25 reducibility_resistance',
      penalties_applied: warnings
    },
    upstreamDependencies: [
      { artifact_name: 'first_person_perspective_report.json', artifact_role: 'first_person_perspective_report' },
      { artifact_name: 'subjective_continuity_report.json', artifact_role: 'subjective_continuity_report' },
      { artifact_name: 'subjectivity_reducibility_report.json', artifact_role: 'subjectivity_reducibility_report' },
      { artifact_name: 'subjectivity_runtime_projection.json', artifact_role: 'subjectivity_runtime_projection' }
    ],
    fieldsUsed: [
      'first_person_perspective_report.first_person_gain',
      'first_person_perspective_report.factorization_supported',
      'first_person_perspective_report.flattening_vulnerability',
      'first_person_perspective_report.comparison_status',
      'subjective_continuity_report.continuity_margin',
      'subjective_continuity_report.supporting_signals[*].continuity_score',
      'subjectivity_reducibility_report.irreducibility_margin',
      'subjectivity_reducibility_report.comparison_supported',
      'subjectivity_runtime_projection.coordinate_estimates.FirstPersonPerspective.estimate',
      'subjectivity_runtime_projection.coordinate_estimates.IrreducibilityMargin.estimate'
    ],
    bridgeSpecificStructure: {
      indexed_contrast_basis: 'indexed_vs_neutral_perspective_gain',
      separation_basis: 'privileged_line_vs_rival_line_difference',
      flattening_basis: 'resistance_to_neutral_flattening',
      explanatory_basis: 'partial_reducibility_resistance'
    },
    uncertaintyMarkers,
    warnings,
    collapseRisks: [
      'semantic_density_without_indexed_contrast',
      'narration_without_differentiated_structure',
      'flattening_absorbs_apparent_differentiation'
    ],
    collapseStatus: estimate < 0.25 ? 'proxy_collapse_or_weak_signal' : 'provisional_structure_detected',
    nonImplications: ['not_qualia', 'not_phenomenality', 'not_bridge_verdict'],
    provenance: buildReportProvenance({
      artifactName: 'phenomenal_differentiation_report.json',
      runId: bundle.run_id,
      upstreamRefs: bundle.refs,
      inputProfile: bundle.provenance?.input_profile,
      sourceTraceRef: bundle.provenance?.source_trace_ref
    })
  });
};

export default mapPhenomenalDifferentiation;

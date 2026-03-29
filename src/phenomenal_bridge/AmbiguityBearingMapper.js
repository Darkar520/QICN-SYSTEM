import {
  asNumber,
  buildReportProvenance,
  clamp01,
  createBridgeReport,
  normalizeAgainstCap,
  normalizedCount
} from './BridgeSurfaceUtils.js';

export const mapAmbiguityBearing = (bundle) => {
  const selfIndex = bundle.self_index_state;
  const ownership = bundle.ownership_attribution_report;
  const continuity = bundle.subjective_continuity_report;
  const perspective = bundle.first_person_perspective_report;
  const valuation = bundle.subjective_valuation_report;

  const alternativeLoad = clamp01(
    0.45 * normalizedCount(Math.max(asNumber(selfIndex?.candidate_count, 1) - 1, 0), 3)
      + 0.55 * normalizedCount(asNumber(continuity?.rival_line_count, 0), 2)
  );
  const liveMaintenance = clamp01(
    0.5 * (continuity?.ambiguity_flag ? 1 : 0)
      + 0.3 * (continuity?.fork_flag ? 1 : 0)
      + 0.2 * normalizeAgainstCap(perspective?.flattening_vulnerability, 1)
  );
  const ambiguitySensitivity = clamp01(
    0.5 * normalizeAgainstCap(Math.abs(asNumber(valuation?.inversion_response?.margin_shift, 0)), 0.15)
      + 0.5 * normalizeAgainstCap(perspective?.first_person_gain, 0.35)
  );
  const bookkeepingPenalty = clamp01(
    0.25 * asNumber(ownership?.uncertain_fraction, 0)
      + (valuation?.aliasing_warning?.flag ? 0.1 : 0)
  );
  const noLiveAmbiguityPenalty = continuity?.ambiguity_flag || continuity?.fork_flag ? 1 : 0.7;

  const estimate = clamp01(
    (0.45 * alternativeLoad + 0.2 * liveMaintenance + 0.35 * ambiguitySensitivity)
      * (1 - bookkeepingPenalty)
      * noLiveAmbiguityPenalty
  );

  const warnings = [];
  const uncertaintyMarkers = ['no_direct_live_ambiguity_trace'];
  if (!continuity?.ambiguity_flag && !continuity?.fork_flag) {
    warnings.push('no_live_ambiguity_state_detected');
  }
  if (asNumber(ownership?.uncertain_fraction, 0) > 0.25) {
    warnings.push('ownership_uncertainty_is_not_bridge_ambiguity');
  }
  if (valuation?.aliasing_warning?.flag) {
    warnings.push('valuation_aliasing_does_not_count_as_ambiguity_bearing');
  }

  return createBridgeReport({
    artifactName: 'ambiguity_bearing_report.json',
    runId: bundle.run_id,
    predicateId: 'Pi_A',
    predicateName: 'ambiguity_bearing',
    runtimeSurface: 'ambiguity_bearing_surface',
    bridgeRole:
      'Maintained unresolved alternative load beyond uncertainty bookkeeping, represented only provisionally in BPF-1 via structural ambiguity proxies.',
    estimate,
    componentScores: {
      alternative_load: alternativeLoad,
      live_maintenance: liveMaintenance,
      ambiguity_sensitivity: ambiguitySensitivity,
      bookkeeping_penalty: bookkeepingPenalty,
      no_live_ambiguity_penalty: noLiveAmbiguityPenalty
    },
    transformationLogic: {
      normalization_rules: [
        'extra self-index candidates normalized against provisional cap 3',
        'rival_line_count normalized against provisional cap 2',
        'flattening_vulnerability used only as ambiguity sensitivity proxy',
        'absolute inversion margin shift normalized against provisional cap 0.15',
        'first_person_gain normalized against provisional cap 0.35'
      ],
      aggregation_rule:
        '(0.45 alternative_load + 0.20 live_maintenance + 0.35 ambiguity_sensitivity) multiplied by (1-bookkeeping_penalty) and by no_live_ambiguity_penalty when no direct ambiguity flag exists',
      penalties_applied: warnings
    },
    upstreamDependencies: [
      { artifact_name: 'self_index_state.json', artifact_role: 'self_index_state' },
      { artifact_name: 'ownership_attribution_report.json', artifact_role: 'ownership_attribution_report' },
      { artifact_name: 'subjective_continuity_report.json', artifact_role: 'subjective_continuity_report' },
      { artifact_name: 'first_person_perspective_report.json', artifact_role: 'first_person_perspective_report' },
      { artifact_name: 'subjective_valuation_report.json', artifact_role: 'subjective_valuation_report' }
    ],
    fieldsUsed: [
      'self_index_state.candidate_count',
      'subjective_continuity_report.rival_line_count',
      'subjective_continuity_report.ambiguity_flag',
      'subjective_continuity_report.fork_flag',
      'first_person_perspective_report.flattening_vulnerability',
      'first_person_perspective_report.first_person_gain',
      'subjective_valuation_report.inversion_response.margin_shift',
      'subjective_valuation_report.aliasing_warning.flag',
      'ownership_attribution_report.uncertain_fraction'
    ],
    bridgeSpecificStructure: {
      alternative_basis: 'candidate_and_rival_line_multiplicity',
      maintenance_basis: 'direct_ambiguity_or_fork_signal_when_available',
      sensitivity_basis: 'structured_response_to_inversion_and_perspective_change',
      penalty_basis: 'bookkeeping_uncertainty_and_absent_live_ambiguity'
    },
    uncertaintyMarkers,
    warnings,
    collapseRisks: [
      'uncertainty_bookkeeping_without_ambiguity_bearing',
      'narrated_alternatives_without_live_maintenance',
      'ambiguity_resolved_too_early_to_count_as_bridge_structure'
    ],
    collapseStatus:
      !continuity?.ambiguity_flag && !continuity?.fork_flag
        ? 'proxy_only_underdetermined'
        : estimate < 0.25
          ? 'proxy_collapse_or_weak_signal'
          : 'provisional_structure_detected',
    nonImplications: ['not_conscious_uncertainty', 'not_deliberative_experience', 'not_bridge_verdict'],
    provenance: buildReportProvenance({
      artifactName: 'ambiguity_bearing_report.json',
      runId: bundle.run_id,
      upstreamRefs: bundle.refs,
      inputProfile: bundle.provenance?.input_profile,
      sourceTraceRef: bundle.provenance?.source_trace_ref
    })
  });
};

export default mapAmbiguityBearing;

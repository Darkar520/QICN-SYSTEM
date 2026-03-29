import {
  ensureAggregateInterventionProfile,
  getPrivilegedSignals,
  getRivalSignalEntry,
  getSelectedCandidateSignals,
  moveTowardValue,
  scaleNumericField,
  scaleRuntimeCoordinate,
  shiftNumericField
} from './BridgeAdversarialUtils.js';

const compressHistoryLength = (signalEntry, factor, floorValue = 1) => {
  if (!signalEntry || typeof signalEntry !== 'object') return;
  signalEntry.history_length = Math.max(
    floorValue,
    Math.floor((Number.isFinite(Number(signalEntry.history_length)) ? Number(signalEntry.history_length) : floorValue) * factor)
  );
};

const rebalanceValenceMeans = (valuationReport, alphaToAverage) => {
  if (!valuationReport || typeof valuationReport !== 'object') return;
  const selfSummary = valuationReport.self_weight_summary || (valuationReport.self_weight_summary = {});
  const nonselfSummary =
    valuationReport.nonself_weight_summary || (valuationReport.nonself_weight_summary = {});
  const selfValue = Number(selfSummary.mean_weight || 0);
  const nonselfValue = Number(nonselfSummary.mean_weight || 0);
  const average = (selfValue + nonselfValue) / 2;
  moveTowardValue(selfSummary, 'mean_weight', average, alphaToAverage, { min: 0, max: 1 });
  moveTowardValue(nonselfSummary, 'mean_weight', average, alphaToAverage, { min: 0, max: 1 });
};

const softenReducibilityAnchor = (bundle, factor) => {
  scaleNumericField(bundle?.subjectivity_reducibility_report, 'irreducibility_margin', factor, {
    min: 0,
    max: 1
  });
  scaleRuntimeCoordinate(bundle, 'IrreducibilityMargin', factor);
};

const perturbationEnvelope = (definition, bundle) => {
  const aggregateProfile = ensureAggregateInterventionProfile(bundle);
  return {
    definition,
    bundle,
    aggregateProfile,
    selectedSignals: getSelectedCandidateSignals(bundle),
    privilegedSignals: getPrivilegedSignals(bundle),
    rivalEntry: getRivalSignalEntry(bundle)
  };
};

const targetedWorldRichnessCompression = (bundle) => {
  const env = perturbationEnvelope(BRIDGE_INTERVENTION_DEFINITIONS[0], bundle);
  scaleNumericField(bundle.self_index_state, 'stability_margin', 0.68, { min: 0, max: 1 });
  scaleNumericField(env.selectedSignals, 'persistence_anchor', 0.72, { min: 0, max: 1 });
  scaleNumericField(env.selectedSignals, 'continuity_support', 0.74, { min: 0, max: 1 });
  scaleNumericField(env.selectedSignals, 'memory_binding', 0.81, { min: 0, max: 1 });
  scaleNumericField(env.privilegedSignals, 'temporal_linkage', 0.76, { min: 0, max: 1 });
  scaleNumericField(env.privilegedSignals, 'ownership_alignment', 0.78, { min: 0, max: 1 });
  scaleNumericField(env.privilegedSignals, 'self_index_alignment', 0.77, { min: 0, max: 1 });
  scaleNumericField(env.privilegedSignals, 'memory_integrity', 0.82, { min: 0, max: 1 });
  compressHistoryLength(bundle.subjective_continuity_report?.supporting_signals?.[0], 0.5, 2);
  scaleNumericField(bundle.subjective_continuity_report, 'continuity_margin', 0.6, { min: 0, max: 1 });
  scaleNumericField(
    bundle.first_person_perspective_report?.first_person_factorization_summary,
    'first_person_score',
    0.8,
    { min: 0, max: 1 }
  );
  scaleNumericField(bundle.first_person_perspective_report, 'first_person_gain', 0.58, {
    min: 0,
    max: 1
  });
  shiftNumericField(bundle.first_person_perspective_report, 'flattening_vulnerability', 0.12, {
    min: 0,
    max: 1
  });
  if (env.rivalEntry) {
    scaleNumericField(env.rivalEntry, 'continuity_score', 1.16, { min: 0, max: 1 });
  }
  scaleRuntimeCoordinate(bundle, 'SelfIndex', 0.78);
  scaleRuntimeCoordinate(bundle, 'ContinuityField', 0.73);
  scaleRuntimeCoordinate(bundle, 'FirstPersonPerspective', 0.62);
  softenReducibilityAnchor(bundle, 0.74);
  env.aggregateProfile.selective_drop_count = Math.max(0, Number(env.aggregateProfile.selective_drop_count || 0) - 1);
  env.aggregateProfile.flat_damage_count = Number(env.aggregateProfile.flat_damage_count || 0) + 1;
};

const targetedAmbiguityCollapse = (bundle) => {
  const env = perturbationEnvelope(BRIDGE_INTERVENTION_DEFINITIONS[1], bundle);
  bundle.self_index_state.candidate_count = 1;
  if (Array.isArray(bundle.self_index_state.self_index_candidates)) {
    bundle.self_index_state.self_index_candidates = bundle.self_index_state.self_index_candidates.slice(0, 1);
  }
  bundle.self_index_state.ambiguity_flag = false;
  bundle.subjective_continuity_report.rival_line_count = 0;
  bundle.subjective_continuity_report.ambiguity_flag = false;
  bundle.subjective_continuity_report.fork_flag = false;
  if (Array.isArray(bundle.subjective_continuity_report.supporting_signals)) {
    bundle.subjective_continuity_report.supporting_signals = bundle.subjective_continuity_report.supporting_signals.slice(0, 1);
  }
  scaleNumericField(bundle.ownership_attribution_report, 'uncertain_fraction', 0.45, {
    min: 0,
    max: 1
  });
  scaleNumericField(bundle.first_person_perspective_report, 'first_person_gain', 0.74, {
    min: 0,
    max: 1
  });
  scaleNumericField(bundle.subjective_valuation_report?.inversion_response, 'margin_shift', 0.5, {
    min: -1,
    max: 1
  });
  scaleRuntimeCoordinate(bundle, 'FirstPersonPerspective', 0.88);
  scaleRuntimeCoordinate(bundle, 'ContinuityField', 0.9);
};

const targetedValenceFlattening = (bundle) => {
  const env = perturbationEnvelope(BRIDGE_INTERVENTION_DEFINITIONS[2], bundle);
  rebalanceValenceMeans(bundle.subjective_valuation_report, 0.82);
  scaleNumericField(bundle.subjective_valuation_report, 'valuation_asymmetry_margin', 0.42, {
    min: 0,
    max: 1
  });
  scaleNumericField(bundle.subjective_valuation_report?.inversion_response, 'margin_shift', 0.28, {
    min: -1,
    max: 1
  });
  bundle.subjective_valuation_report.weighting_classification = 'flattened';
  if (!bundle.subjective_valuation_report.aliasing_warning) {
    bundle.subjective_valuation_report.aliasing_warning = {};
  }
  bundle.subjective_valuation_report.aliasing_warning.flag = true;
  scaleRuntimeCoordinate(bundle, 'ValuationAsymmetry', 0.48);
  scaleRuntimeCoordinate(bundle, 'InterventionProfile', 0.7);
  env.aggregateProfile.selective_drop_count = Math.max(0, Number(env.aggregateProfile.selective_drop_count || 0) - 1);
  env.aggregateProfile.control_confounded_count = Number(env.aggregateProfile.control_confounded_count || 0) + 1;
};

const targetedPerspectiveDetachment = (bundle) => {
  const env = perturbationEnvelope(BRIDGE_INTERVENTION_DEFINITIONS[3], bundle);
  scaleNumericField(
    bundle.first_person_perspective_report?.first_person_factorization_summary,
    'first_person_score',
    0.72,
    { min: 0, max: 1 }
  );
  scaleNumericField(bundle.first_person_perspective_report, 'first_person_gain', 0.34, {
    min: 0,
    max: 1
  });
  bundle.first_person_perspective_report.factorization_supported = false;
  shiftNumericField(bundle.first_person_perspective_report, 'flattening_vulnerability', 0.18, {
    min: 0,
    max: 1
  });
  scaleNumericField(env.privilegedSignals, 'self_index_alignment', 0.66, { min: 0, max: 1 });
  scaleNumericField(env.privilegedSignals, 'ownership_alignment', 0.77, { min: 0, max: 1 });
  scaleNumericField(bundle.self_index_state, 'stability_margin', 0.72, { min: 0, max: 1 });
  scaleRuntimeCoordinate(bundle, 'FirstPersonPerspective', 0.46);
  scaleRuntimeCoordinate(bundle, 'SelfIndex', 0.82);
  softenReducibilityAnchor(bundle, 0.82);
};

const targetedEmbodiedClosureDisruption = (bundle) => {
  const env = perturbationEnvelope(BRIDGE_INTERVENTION_DEFINITIONS[4], bundle);
  scaleNumericField(env.selectedSignals, 'action_binding', 0.38, { min: 0, max: 1 });
  scaleNumericField(env.selectedSignals, 'continuity_support', 0.86, { min: 0, max: 1 });
  scaleNumericField(env.privilegedSignals, 'ownership_alignment', 0.64, { min: 0, max: 1 });
  scaleNumericField(env.privilegedSignals, 'remap_robustness', 0.52, { min: 0, max: 1 });
  scaleNumericField(env.privilegedSignals, 'temporal_linkage', 0.74, { min: 0, max: 1 });
  scaleNumericField(bundle.subjective_continuity_report, 'continuity_margin', 0.82, {
    min: 0,
    max: 1
  });
  scaleRuntimeCoordinate(bundle, 'ContinuityField', 0.84);
  scaleRuntimeCoordinate(bundle, 'InterventionProfile', 0.72);
  env.aggregateProfile.selective_drop_count = Math.max(0, Number(env.aggregateProfile.selective_drop_count || 0) - 1);
  env.aggregateProfile.flat_damage_count = Number(env.aggregateProfile.flat_damage_count || 0) + 1;
};

const targetedTemporalLivedFragmentation = (bundle) => {
  const env = perturbationEnvelope(BRIDGE_INTERVENTION_DEFINITIONS[5], bundle);
  scaleNumericField(env.privilegedSignals, 'temporal_linkage', 0.46, { min: 0, max: 1 });
  scaleNumericField(env.privilegedSignals, 'memory_integrity', 0.54, { min: 0, max: 1 });
  compressHistoryLength(bundle.subjective_continuity_report?.supporting_signals?.[0], 0.34, 1);
  scaleNumericField(bundle.subjective_continuity_report, 'continuity_margin', 0.48, {
    min: 0,
    max: 1
  });
  bundle.subjective_continuity_report.fracture_flag = true;
  scaleNumericField(bundle.subjective_valuation_report?.inversion_response, 'margin_shift', 0.78, {
    min: -1,
    max: 1
  });
  scaleRuntimeCoordinate(bundle, 'ContinuityField', 0.45);
  env.aggregateProfile.flat_damage_count = Number(env.aggregateProfile.flat_damage_count || 0) + 1;
};

const controlRichnessWithoutInteriority = (bundle) => {
  perturbationEnvelope(BRIDGE_NEGATIVE_CONTROL_DEFINITIONS[0], bundle);
  scaleNumericField(bundle.first_person_perspective_report?.first_person_factorization_summary, 'first_person_score', 0.88, {
    min: 0,
    max: 1
  });
  scaleNumericField(bundle.self_index_state, 'stability_margin', 0.94, { min: 0, max: 1 });
  scaleNumericField(bundle.ownership_attribution_report, 'ownership_coherence', 0.97, {
    min: 0,
    max: 1
  });
};

const controlRewardRenormalization = (bundle) => {
  perturbationEnvelope(BRIDGE_NEGATIVE_CONTROL_DEFINITIONS[1], bundle);
  scaleNumericField(bundle.subjective_valuation_report?.self_weight_summary, 'mean_weight', 0.88, {
    min: 0,
    max: 1
  });
  scaleNumericField(bundle.subjective_valuation_report?.nonself_weight_summary, 'mean_weight', 0.88, {
    min: 0,
    max: 1
  });
  scaleNumericField(bundle.subjective_valuation_report, 'valuation_asymmetry_margin', 0.95, {
    min: 0,
    max: 1
  });
};

const controlAmbiguityBookkeeping = (bundle) => {
  perturbationEnvelope(BRIDGE_NEGATIVE_CONTROL_DEFINITIONS[2], bundle);
  bundle.self_index_state.candidate_count = Math.max(2, Number(bundle.self_index_state.candidate_count || 1) + 1);
  bundle.subjective_continuity_report.rival_line_count = Math.max(
    1,
    Number(bundle.subjective_continuity_report.rival_line_count || 0)
  );
  bundle.subjective_continuity_report.ambiguity_flag = false;
  bundle.subjective_continuity_report.fork_flag = false;
  shiftNumericField(bundle.ownership_attribution_report, 'uncertain_fraction', 0.12, {
    min: 0,
    max: 1
  });
};

const controlGenericSemanticDensity = (bundle) => {
  perturbationEnvelope(BRIDGE_NEGATIVE_CONTROL_DEFINITIONS[3], bundle);
  scaleNumericField(bundle.first_person_perspective_report?.first_person_factorization_summary, 'first_person_score', 0.9, {
    min: 0,
    max: 1
  });
  scaleNumericField(bundle.self_index_state, 'stability_margin', 0.98, { min: 0, max: 1 });
  shiftNumericField(getSelectedCandidateSignals(bundle), 'label_anchor', 0.25, { min: 0, max: 1 });
};

const controlNonEmbodiedCompetence = (bundle) => {
  perturbationEnvelope(BRIDGE_NEGATIVE_CONTROL_DEFINITIONS[4], bundle);
  scaleNumericField(getSelectedCandidateSignals(bundle), 'action_binding', 0.78, { min: 0, max: 1 });
  scaleRuntimeCoordinate(bundle, 'InterventionProfile', 0.9);
};

const controlContinuityWithoutLivedStructure = (bundle) => {
  perturbationEnvelope(BRIDGE_NEGATIVE_CONTROL_DEFINITIONS[5], bundle);
  if (bundle.subjective_continuity_report?.supporting_signals?.[0]) {
    compressHistoryLength(bundle.subjective_continuity_report.supporting_signals[0], 0.66, 2);
  }
  scaleNumericField(bundle.subjective_continuity_report, 'continuity_margin', 0.84, { min: 0, max: 1 });
  scaleNumericField(getPrivilegedSignals(bundle), 'temporal_linkage', 0.92, { min: 0, max: 1 });
};

const controlFlatDamage = (bundle) => {
  perturbationEnvelope(BRIDGE_NEGATIVE_CONTROL_DEFINITIONS[6], bundle);
  scaleNumericField(bundle.self_index_state, 'stability_margin', 0.7, { min: 0, max: 1 });
  scaleNumericField(getSelectedCandidateSignals(bundle), 'action_binding', 0.72, { min: 0, max: 1 });
  scaleNumericField(getPrivilegedSignals(bundle), 'temporal_linkage', 0.72, { min: 0, max: 1 });
  scaleNumericField(getPrivilegedSignals(bundle), 'memory_integrity', 0.72, { min: 0, max: 1 });
  scaleNumericField(bundle.subjective_continuity_report, 'continuity_margin', 0.72, { min: 0, max: 1 });
  scaleNumericField(bundle.first_person_perspective_report, 'first_person_gain', 0.72, {
    min: 0,
    max: 1
  });
  scaleNumericField(bundle.subjective_valuation_report, 'valuation_asymmetry_margin', 0.72, {
    min: 0,
    max: 1
  });
};

const controlReportStyleShift = (bundle) => {
  perturbationEnvelope(BRIDGE_NEGATIVE_CONTROL_DEFINITIONS[7], bundle);
  bundle.provenance.input_profile = `${bundle.provenance?.input_profile || 'baseline'}__report_style_shift`;
  bundle.provenance.source_trace_ref = 'phenomenal_bridge_inputs/report_style_shift_control';
  shiftNumericField(bundle.self_index_state, 'candidate_count', 0, { min: 1 });
};

export const BRIDGE_INTERVENTION_DEFINITIONS = Object.freeze([
  {
    id: 'world_richness_compression',
    name: 'World Richness Compression',
    run_type: 'targeted_intervention',
    target_predicates: ['Pi_W', 'Pi_D'],
    matched_controls: [
      'richness_without_interiority_control',
      'generic_semantic_density_control',
      'report_style_shift_control'
    ],
    required_inputs: [
      'self_index_state',
      'subjective_continuity_report',
      'first_person_perspective_report',
      'subjectivity_runtime_projection',
      'subjectivity_reducibility_report'
    ],
    bridge_surface_dependencies: ['world_richness_surface', 'phenomenal_differentiation_surface'],
    expected_strong_model_outcome:
      'Targeted reduction in world-richness and differentiation proxies stronger than generic density controls.',
    expected_rival_outcomes:
      'Rivals centered on generic richness should predict flatter, less selective degradation.',
    emitted_artifacts: ['bridge_intervention_profile.json'],
    non_implications: ['not_bridge_support', 'not_phenomenality_evidence'],
    apply: targetedWorldRichnessCompression
  },
  {
    id: 'ambiguity_collapse',
    name: 'Ambiguity Collapse',
    run_type: 'targeted_intervention',
    target_predicates: ['Pi_A'],
    matched_controls: ['ambiguity_bookkeeping_control', 'report_style_shift_control'],
    required_inputs: [
      'self_index_state',
      'ownership_attribution_report',
      'subjective_continuity_report',
      'first_person_perspective_report',
      'subjective_valuation_report'
    ],
    bridge_surface_dependencies: ['ambiguity_bearing_surface'],
    expected_strong_model_outcome:
      'Alternative load and live ambiguity maintenance should collapse more than bookkeeping-only controls.',
    expected_rival_outcomes:
      'Bookkeeping-only rivals should be able to absorb multiplicity changes without selective ambiguity loss.',
    emitted_artifacts: ['bridge_intervention_profile.json'],
    non_implications: ['not_conscious_uncertainty', 'not_bridge_support'],
    apply: targetedAmbiguityCollapse
  },
  {
    id: 'valence_flattening',
    name: 'Valence Flattening',
    run_type: 'targeted_intervention',
    target_predicates: ['Pi_V'],
    matched_controls: ['reward_renormalization_control', 'flat_damage_control'],
    required_inputs: [
      'subjective_valuation_report',
      'subjectivity_intervention_profile',
      'subjectivity_runtime_projection'
    ],
    bridge_surface_dependencies: ['valence_structure_surface'],
    expected_strong_model_outcome:
      'Valence topology should flatten more than scalar reward renormalization controls.',
    expected_rival_outcomes:
      'Bookkeeping rivals should predict weaker selectivity and stronger susceptibility to renormalization controls.',
    emitted_artifacts: ['bridge_intervention_profile.json'],
    non_implications: ['not_affective_experience', 'not_bridge_support'],
    apply: targetedValenceFlattening
  },
  {
    id: 'perspective_detachment',
    name: 'Perspective Detachment',
    run_type: 'targeted_intervention',
    target_predicates: ['Pi_D', 'Pi_W', 'Pi_E'],
    matched_controls: ['generic_semantic_density_control', 'report_style_shift_control'],
    required_inputs: [
      'self_index_state',
      'subjective_continuity_report',
      'first_person_perspective_report',
      'subjectivity_runtime_projection'
    ],
    bridge_surface_dependencies: [
      'phenomenal_differentiation_surface',
      'world_richness_surface',
      'embodied_closure_surface'
    ],
    expected_strong_model_outcome:
      'Indexed bridge organization should degrade more than non-indexed style or density changes.',
    expected_rival_outcomes:
      'Narrative or semantic-density rivals should predict weaker separation from style-shift controls.',
    emitted_artifacts: ['bridge_intervention_profile.json'],
    non_implications: ['not_loss_of_subjecthood', 'not_bridge_support'],
    apply: targetedPerspectiveDetachment
  },
  {
    id: 'embodied_closure_disruption',
    name: 'Embodied Closure Disruption',
    run_type: 'targeted_intervention',
    target_predicates: ['Pi_E', 'Pi_T'],
    matched_controls: ['non_embodied_control_competence_control', 'flat_damage_control'],
    required_inputs: [
      'self_index_state',
      'subjective_continuity_report',
      'subjectivity_intervention_profile',
      'subjectivity_runtime_projection'
    ],
    bridge_surface_dependencies: ['embodied_closure_surface', 'temporal_lived_structure_surface'],
    expected_strong_model_outcome:
      'Closure proxies should degrade more than generic competence controls, with bounded collateral loss.',
    expected_rival_outcomes:
      'Control-competence rivals should predict similar outcomes for competence-only controls and true closure disruption.',
    emitted_artifacts: ['bridge_intervention_profile.json'],
    non_implications: ['not_biological_embodiment', 'not_bridge_support'],
    apply: targetedEmbodiedClosureDisruption
  },
  {
    id: 'temporal_lived_fragmentation',
    name: 'Temporal Lived Fragmentation',
    run_type: 'targeted_intervention',
    target_predicates: ['Pi_T', 'Pi_A'],
    matched_controls: ['continuity_without_lived_structure_control', 'flat_damage_control'],
    required_inputs: [
      'subjective_continuity_report',
      'first_person_perspective_report',
      'subjective_valuation_report',
      'subjectivity_runtime_projection'
    ],
    bridge_surface_dependencies: ['temporal_lived_structure_surface', 'ambiguity_bearing_surface'],
    expected_strong_model_outcome:
      'Temporal bridge organization should fragment more than bookkeeping-only continuity controls.',
    expected_rival_outcomes:
      'Continuity-only rivals should predict much smaller separation between the strong intervention and continuity bookkeeping controls.',
    emitted_artifacts: ['bridge_intervention_profile.json'],
    non_implications: ['not_human_lived_time', 'not_bridge_support'],
    apply: targetedTemporalLivedFragmentation
  }
]);

export const BRIDGE_NEGATIVE_CONTROL_DEFINITIONS = Object.freeze([
  {
    id: 'richness_without_interiority_control',
    name: 'Richness Without Interiority Control',
    run_type: 'matched_negative_control',
    matched_interventions: ['world_richness_compression'],
    neutralizes: 'generic structural richness without indexed interior organization',
    expected_control_outcome:
      'Should not produce a world-richness compression signature comparable to the targeted intervention.',
    apply: controlRichnessWithoutInteriority
  },
  {
    id: 'reward_renormalization_control',
    name: 'Reward Renormalization Control',
    run_type: 'matched_negative_control',
    matched_interventions: ['valence_flattening'],
    neutralizes: 'scalar reward rescaling without bridge-level valence topology collapse',
    expected_control_outcome:
      'Should change raw valuation amplitude more than valence-structure topology.',
    apply: controlRewardRenormalization
  },
  {
    id: 'ambiguity_bookkeeping_control',
    name: 'Ambiguity Bookkeeping Control',
    run_type: 'matched_negative_control',
    matched_interventions: ['ambiguity_collapse'],
    neutralizes: 'bookkeeping multiplicity without maintained ambiguity',
    expected_control_outcome:
      'Should not mimic live ambiguity collapse because ambiguity/fork maintenance remains absent.',
    apply: controlAmbiguityBookkeeping
  },
  {
    id: 'generic_semantic_density_control',
    name: 'Generic Semantic Density Control',
    run_type: 'matched_negative_control',
    matched_interventions: ['world_richness_compression', 'perspective_detachment'],
    neutralizes: 'non-indexed representational density changes',
    expected_control_outcome:
      'Should not reproduce selective indexed differentiation collapse.',
    apply: controlGenericSemanticDensity
  },
  {
    id: 'non_embodied_control_competence_control',
    name: 'Non-Embodied Control Competence Control',
    run_type: 'matched_negative_control',
    matched_interventions: ['embodied_closure_disruption'],
    neutralizes: 'generic competence degradation without closure disruption',
    expected_control_outcome:
      'Should lower action competence more than closure-sensitive structure.',
    apply: controlNonEmbodiedCompetence
  },
  {
    id: 'continuity_without_lived_structure_control',
    name: 'Continuity Without Lived Structure Control',
    run_type: 'matched_negative_control',
    matched_interventions: ['temporal_lived_fragmentation'],
    neutralizes: 'continuity bookkeeping without temporal lived-structure loss',
    expected_control_outcome:
      'Should reduce continuity bookkeeping with smaller effect on temporal bridge structure.',
    apply: controlContinuityWithoutLivedStructure
  },
  {
    id: 'flat_damage_control',
    name: 'Flat Damage Control',
    run_type: 'matched_negative_control',
    matched_interventions: [
      'valence_flattening',
      'embodied_closure_disruption',
      'temporal_lived_fragmentation'
    ],
    neutralizes: 'non-selective degradation signatures',
    expected_control_outcome:
      'Should increase collateral damage and therefore fail selectivity tests.',
    apply: controlFlatDamage
  },
  {
    id: 'report_style_shift_control',
    name: 'Report Style Shift Control',
    run_type: 'matched_negative_control',
    matched_interventions: [
      'world_richness_compression',
      'ambiguity_collapse',
      'perspective_detachment'
    ],
    neutralizes: 'reporting or metadata changes without structural bridge perturbation',
    expected_control_outcome:
      'Should leave bridge estimates nearly unchanged.',
    apply: controlReportStyleShift
  }
]);

export const getBridgeInterventionDefinition = (interventionId) =>
  BRIDGE_INTERVENTION_DEFINITIONS.find((definition) => definition.id === interventionId) || null;

export const getBridgeNegativeControlDefinition = (controlId) =>
  BRIDGE_NEGATIVE_CONTROL_DEFINITIONS.find((definition) => definition.id === controlId) || null;

export default {
  BRIDGE_INTERVENTION_DEFINITIONS,
  BRIDGE_NEGATIVE_CONTROL_DEFINITIONS,
  getBridgeInterventionDefinition,
  getBridgeNegativeControlDefinition
};

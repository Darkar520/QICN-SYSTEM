import { CROSS_SUBSTRATE_TRANSPORT_PROTOCOL } from './CrossSubstrateTransportRegistry.js';

const LAYER_VERSION = 'comparative_expansion_layer.stage2_m2.transport.v1';
const ESTIMATOR_VERSION = 'cross_substrate_transport_assessment_builder.stage2_m2.v1';

const BOUNDARY =
  'Framework-internal only; cross-substrate transport assessment records bounded transport openness and blocked-state logic, not transport preservation, not cross-substrate equivalence, not identity preservation, and not external adjudication.';

export class CrossSubstrateTransportAssessmentBuilder {
  build({ humanComparatorAssessment, currentLineage }) {
    const currentTransportClass =
      humanComparatorAssessment.channel_statuses.some(
        (entry) => entry.channel_id === 'transport_preservation_channel'
      )
        ? 'transport_not_open'
        : 'comparator_underdetermined_transport';

    const preservationAxisStatuses = Object.fromEntries(
      (CROSS_SUBSTRATE_TRANSPORT_PROTOCOL.preservation_axes || []).map((axisId) => [
        axisId,
        {
          status: 'not_evaluable_missing_transition_contract',
          rationale: 'No source-target transport contract or target counterpart has been instantiated.'
        }
      ])
    );

    const errorBudgetStatus = Object.fromEntries(
      (CROSS_SUBSTRATE_TRANSPORT_PROTOCOL.error_budget_dimensions || []).map((dimension) => [
        dimension.id,
        'runtime_declared_not_instantiated'
      ])
    );

    return {
      artifact_role: 'cross_substrate_transport_assessment',
      artifact_name: 'cross_substrate_transport_assessment.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      comparative_layer_id: 'comparative_expansion_layer.stage2_m2_runtime_opening',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'stage2_m2_runtime_comparative_opening_implemented',
      current_transport_class: currentTransportClass,
      assessment_state: 'no_verdict_authorized',
      preservation_axis_statuses: preservationAxisStatuses,
      error_budget_status: errorBudgetStatus,
      required_missing_counterparts: [
        'source_target_transport_contract',
        'target_substrate_counterpart',
        'transport_lineage_map',
        'axis_specific_error_budget_instantiation'
      ],
      unsupported_remap_conditions: [
        'missing_transition_contract',
        'missing_target_counterpart',
        'missing_transport_artifact_family'
      ],
      fork_fracture_risk_notes: [
        'fork_detection_rule_not_instantiated',
        'fracture_detection_rule_not_instantiated',
        'identity_preservation_output_forbidden'
      ],
      warnings: [
        'transport_runtime_is_bounded_internal_only',
        'no_transport_contract_instantiated',
        'no_verdict_authorized'
      ],
      boundary_flags: {
        framework_internal_only: true,
        not_cross_substrate_equivalence_support: true,
        not_identity_preservation_support: true,
        not_external_adjudication: true,
        no_verdict_authorized: true
      },
      non_implications: [
        'No cross-substrate equivalence follows from this assessment.',
        'No identity preservation follows from this assessment.',
        'No transport failure proof follows from this assessment.'
      ],
      interpretation_boundary: BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        human_comparator_assessment_ref:
          'artifacts/comparative_program/stage2m2/human_comparator_assessment.json',
        current_lineage: currentLineage
      },
      schema_ref:
        'src/comparative_program/schemas/cross_substrate_transport_assessment.v1.json'
    };
  }
}

export const createCrossSubstrateTransportAssessmentBuilder = () =>
  new CrossSubstrateTransportAssessmentBuilder();

export default {
  CrossSubstrateTransportAssessmentBuilder,
  createCrossSubstrateTransportAssessmentBuilder
};

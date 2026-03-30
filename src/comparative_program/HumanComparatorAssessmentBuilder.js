import { HUMAN_COMPARATOR_PROTOCOL } from './HumanComparatorProtocolRegistry.js';
import { COMPARATOR_BURDEN_MATRIX } from './ComparatorBurdenMatrixRegistry.js';
import { createHumanChannelStatusEvaluator } from './HumanChannelStatusEvaluator.js';

const LAYER_VERSION = 'comparative_expansion_layer.stage2_m2.comparator.v1';
const ESTIMATOR_VERSION = 'human_comparator_assessment_builder.stage2_m2.v1';

const BOUNDARY =
  'Framework-internal only; human comparator assessment records bounded comparative opening state, not human equivalence, not superiority, not external adjudication, and not claim-facing evidence.';

const buildComparatorDomainStatuses = (channelStatuses) => {
  const byId = Object.fromEntries(channelStatuses.map((entry) => [entry.channel_id, entry]));
  return {
    bridge_coordinate_domain: {
      status:
        byId.self_report_channel?.runtime_state === 'human_channel_absent'
          ? 'structurally_open_but_not_adjudicated'
          : 'structural_mapping_blocked',
      rationale:
        'Machine-side bridge coordinates exist, but human-side homologous channels are not instantiated.'
    },
    intervention_response_domain: {
      status:
        byId.intervention_response_channel?.runtime_state === 'human_channel_absent'
          ? 'blocked_by_missing_human_channel'
          : 'comparator_underdefined',
      rationale:
        'Machine-side intervention artifacts exist, but no human-side intervention-response channel is instantiated.'
    },
    transport_preservation_domain: {
      status: byId.transport_preservation_channel?.runtime_state || 'transport_not_open',
      rationale:
        'No source-target transport contract or counterpart exists for cross-substrate comparison.'
    },
    artifact_lineage_domain: {
      status: 'structural_mapping_open',
      rationale:
        'Machine-side bridge lineage, schema typing, and provenance are available and can support future comparative artifact homology.'
    }
  };
};

const evaluateBurdenStatus = (burden, channelStatuses) => {
  const requiredChannels = new Map(channelStatuses.map((entry) => [entry.channel_id, entry]));
  const relevantChannelStates = (burden.required_channel_families || []).map(
    (channelId) => requiredChannels.get(channelId)?.runtime_state || 'structural_mapping_blocked'
  );

  if (burden.currently_satisfiable) {
    return {
      status: 'satisfied_runtime_reporting_only',
      pass: true,
      blocked_reason: null
    };
  }

  if (relevantChannelStates.includes('human_channel_absent') && burden.blocked_only_by_missing_human_channel) {
    return {
      status: 'blocked_by_missing_human_channel',
      pass: false,
      blocked_reason: burden.blocked_reason
    };
  }

  if (relevantChannelStates.includes('structurally_open_but_not_adjudicated')) {
    return {
      status: 'structurally_open_but_not_adjudicated',
      pass: false,
      blocked_reason: burden.blocked_reason
    };
  }

  if (relevantChannelStates.includes('transport_not_open')) {
    return {
      status: 'transport_not_open',
      pass: false,
      blocked_reason: burden.blocked_reason
    };
  }

  return {
    status: 'comparator_underdefined',
    pass: false,
    blocked_reason: burden.blocked_reason
  };
};

export class HumanComparatorAssessmentBuilder {
  build({ bridgeBaseline, currentLineage }) {
    const channelEvaluation = createHumanChannelStatusEvaluator().evaluate({ bridgeBaseline });
    const channelStatuses = channelEvaluation.channel_statuses;
    const comparatorDomainStatuses = buildComparatorDomainStatuses(channelStatuses);

    const burdenStatuses = Object.fromEntries(
      (COMPARATOR_BURDEN_MATRIX.burdens || []).map((burden) => [
        burden.burden_id,
        {
          ...evaluateBurdenStatus(burden, channelStatuses),
          required_channel_families: [...(burden.required_channel_families || [])],
          required_artifact_families: [...(burden.required_artifact_families || [])],
          does_not_license: [...(burden.does_not_license || [])]
        }
      ])
    );

    const criticalHumanChannels = ['self_report_channel', 'intervention_response_channel', 'embodiment_boundary_channel'];
    const blockedStates = channelStatuses
      .filter(
        (entry) =>
          criticalHumanChannels.includes(entry.channel_id)
          && ['human_channel_absent', 'transport_not_open'].includes(entry.runtime_state)
      )
      .map((entry) => `${entry.channel_id}:${entry.runtime_state}`);

    const underdeterminationStates = channelStatuses
      .filter((entry) => entry.runtime_state === 'structurally_open_but_not_adjudicated')
      .map((entry) => `${entry.channel_id}:structurally_open_but_not_adjudicated`);

    const currentComparatorState =
      blockedStates.length > 0 ? 'comparator_blocked' : 'comparator_underdefined';

    return {
      artifact_role: 'human_comparator_assessment',
      artifact_name: 'human_comparator_assessment.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      comparative_layer_id: 'comparative_expansion_layer.stage2_m2_runtime_opening',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'stage2_m2_runtime_comparative_opening_implemented',
      current_comparator_state: currentComparatorState,
      comparator_object_classes: {
        machine_side_available_class: 'structurally_comparable',
        current_runtime_class:
          currentComparatorState === 'comparator_blocked'
            ? 'comparator_blocked_by_missing_human_channel'
            : 'comparator_underdefined',
        all_defined_classes: (HUMAN_COMPARATOR_PROTOCOL.comparator_object_classes || []).map(
          (entry) => entry.id
        )
      },
      channel_statuses: channelStatuses,
      burden_statuses: burdenStatuses,
      comparator_domain_statuses: comparatorDomainStatuses,
      blocked_states: blockedStates,
      underdetermination_states: underdeterminationStates,
      warnings: [
        'machine_side_structural_artifacts_available',
        'human_channel_routes_absent_or_non_instantiated',
        'no_human_data_instantiated',
        'no_verdict_authorized'
      ],
      boundary_flags: {
        framework_internal_only: true,
        not_human_equivalence_support: true,
        not_superiority_support: true,
        not_external_adjudication: true,
        no_verdict_authorized: true
      },
      non_implications: [
        'No human equivalence follows from this assessment.',
        'No non-equivalence follows from this assessment.',
        'No superiority or inferiority follows from this assessment.'
      ],
      interpretation_boundary: BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        bridge_refs: {
          projection: 'artifacts/phenomenal_bridge/bpfm3/phenomenal_bridge_projection.json',
          gate_result: 'artifacts/phenomenal_bridge/bpfm3/phenomenal_bridge_gate_result.json',
          manifest: 'artifacts/phenomenal_bridge/bpfm3/phenomenal_bridge_manifest.json',
          readiness_gate: 'artifacts/phenomenal_bridge/bpfm3/phenomenal_bridge_readiness_gate.json'
        },
        current_lineage: currentLineage
      },
      schema_ref: 'src/comparative_program/schemas/human_comparator_assessment.v1.json'
    };
  }
}

export const createHumanComparatorAssessmentBuilder = () =>
  new HumanComparatorAssessmentBuilder();

export default {
  HumanComparatorAssessmentBuilder,
  createHumanComparatorAssessmentBuilder
};

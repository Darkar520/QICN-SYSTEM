import { listCounterpartArtifactContracts } from './CounterpartArtifactContractsRegistry.js';
import { HUMAN_COMPARATOR_PROTOCOL } from './HumanComparatorProtocolRegistry.js';
import { HUMAN_CHANNEL_REQUIREMENTS } from './HumanChannelRequirementsRegistry.js';
import { HUMAN_CHANNEL_PATHWAYS } from './HumanChannelPathwaysRegistry.js';
import { listCrossSubstrateTransitionContracts } from './CrossSubstrateTransitionContractsRegistry.js';
import { listHomologationContracts } from './HomologationContractsRegistry.js';
import { deriveComparativeMachineArtifactAvailability } from './ComparativeRuntimeUtils.js';

const LAYER_VERSION = 'comparative_expansion_layer.stage2_m3.pathways.v1';
const ESTIMATOR_VERSION = 'human_channel_pathway_evaluator.stage2_m3.v1';

const BOUNDARY =
  'Framework-internal only; human-channel pathway assessment records pathway readiness, contract completeness, and forbidden-substitution exposure, not human evidence, not human equivalence, not transport preservation, and not external adjudication.';

const STANDARD_FLAGS = Object.freeze({
  framework_internal_only: true,
  not_human_equivalence_support: true,
  not_superiority_support: true,
  not_cross_substrate_equivalence_support: true,
  not_external_adjudication: true,
  not_paper10_authorization: true,
  no_verdict_authorized: true
});

const buildCriteria = ({
  pathway,
  channel,
  counterpartContract,
  homologationContract,
  transitionContract,
  machineArtifactAvailability,
  burdenStatuses
}) => {
  const criteria = {
    machine_artifact_family_available: (pathway.required_machine_artifact_family || []).every(
      (artifactName) => machineArtifactAvailability[artifactName] === true
    ),
    counterpart_contract_defined: Boolean(counterpartContract),
    homologation_contract_defined: Boolean(homologationContract),
    typed_collection_route_defined: (pathway.admissible_collection_mode || []).length > 0,
    lineage_contract_defined: Boolean(
      counterpartContract?.artifact_lineage_requirements?.length
      || transitionContract?.transition_lineage_requirements?.length
    ),
    matched_control_contract_defined: pathway.pathway_completeness_criteria?.includes(
      'matched_control_contract_defined'
    )
      ? (pathway.admissible_collection_mode || []).includes('matched_negative_control_registration')
      : true,
    transition_contract_defined: pathway.pathway_completeness_criteria?.includes(
      'transition_contract_defined'
    )
      ? Boolean(transitionContract)
      : true,
    axis_specific_error_budgets_declared: pathway.pathway_completeness_criteria?.includes(
      'axis_specific_error_budgets_declared'
    )
      ? Boolean(transitionContract?.error_budget_requirements?.length)
      : true,
    embodiment_error_budget_defined: pathway.pathway_completeness_criteria?.includes(
      'embodiment_error_budget_defined'
    )
      ? burdenStatuses.error_budget_burden?.status === 'satisfied_runtime_reporting_only'
      : true,
    burden_stack_declared: (pathway.minimum_symmetry_conditions || []).every((burdenId) =>
      Boolean(burdenStatuses[burdenId])
    )
  };

  return {
    criteria,
    incomplete_criteria: Object.entries(criteria)
      .filter(([, pass]) => pass !== true)
      .map(([criterion]) => criterion)
  };
};

const resolvePathwayStatus = ({ pathway, channel, completeness }) => {
  if (!completeness.criteria.machine_artifact_family_available) {
    return 'pathway_not_open';
  }

  if (pathway.channel_id === 'transport_preservation_channel') {
    return completeness.incomplete_criteria.length === 0
      ? 'pathway_defined_but_uninstantiated'
      : 'pathway_contract_incomplete';
  }

  if (pathway.channel_id === 'embodiment_boundary_channel') {
    return 'pathway_contract_incomplete';
  }

  if (
    pathway.channel_id === 'self_report_channel'
    && channel?.current_human_channel_state === 'blocked_by_missing_human_measurement_route'
    && (pathway.forbidden_substitution_modes || []).length > 0
  ) {
    return 'pathway_blocked_by_forbidden_proxy';
  }

  if (channel?.specifiability_status === 'partially_specifiable') {
    return 'pathway_theoretically_open';
  }

  return completeness.incomplete_criteria.length === 0
    ? 'pathway_contract_ready_but_counterpart_absent'
    : 'pathway_contract_incomplete';
};

const summarizeStatuses = (pathwayStatuses) => {
  const counts = {};
  pathwayStatuses.forEach((entry) => {
    counts[entry.status] = (counts[entry.status] || 0) + 1;
  });
  return counts;
};

export class HumanChannelPathwayEvaluator {
  evaluate({ bridgeBaseline, comparativeRuntimeBaseline, currentLineage }) {
    const channelMap = new Map(
      (HUMAN_CHANNEL_REQUIREMENTS.channels || []).map((channel) => [channel.channel_id, channel])
    );
    const stage2ChannelMap = new Map(
      (comparativeRuntimeBaseline.human_comparator_assessment?.channel_statuses || []).map((entry) => [
        entry.channel_id,
        entry
      ])
    );
    const burdenStatuses =
      comparativeRuntimeBaseline.human_comparator_assessment?.burden_statuses || {};
    const counterpartContractMap = new Map(
      listCounterpartArtifactContracts().map((contract) => [contract.contract_id, contract])
    );
    const homologationContractMap = new Map(
      listHomologationContracts().map((contract) => [contract.homologation_unit_id, contract])
    );
    const transitionContractMap = new Map(
      listCrossSubstrateTransitionContracts().map((contract) => [contract.contract_id, contract])
    );
    const machineArtifactAvailability = deriveComparativeMachineArtifactAvailability({
      bridgeBaseline,
      comparativeRuntimeBaseline
    });

    const pathwayStatuses = (HUMAN_CHANNEL_PATHWAYS.pathways || []).map((pathway) => {
      const channel = channelMap.get(pathway.channel_id) || null;
      const stage2Status = stage2ChannelMap.get(pathway.channel_id) || null;
      const counterpartContract = counterpartContractMap.get(
        pathway.required_counterpart_contract_id
      ) || null;
      const homologationContract = homologationContractMap.get(pathway.homologation_unit) || null;
      const transitionContract =
        pathway.channel_id === 'transport_preservation_channel'
          ? transitionContractMap.get('bridge_coordinate_transition_contract') || null
          : null;

      const completeness = buildCriteria({
        pathway,
        channel,
        counterpartContract,
        homologationContract,
        transitionContract,
        machineArtifactAvailability,
        burdenStatuses
      });
      const status = resolvePathwayStatus({ pathway, channel, completeness });
      const forbiddenSubstitutionsTriggered =
        status === 'pathway_blocked_by_forbidden_proxy'
          ? [...(pathway.forbidden_substitution_modes || [])]
          : [];

      return {
        pathway_id: pathway.pathway_id,
        channel_id: pathway.channel_id,
        comparator_domain: channel?.comparator_domain || 'unknown_domain',
        measurement_class: pathway.measurement_class,
        status,
        stage2_m2_runtime_state: stage2Status?.runtime_state || 'not_assessed',
        current_human_channel_state: channel?.current_human_channel_state || 'unknown_state',
        specifiability_status: channel?.specifiability_status || 'unknown_specifiability',
        required_machine_artifact_family: [...(pathway.required_machine_artifact_family || [])],
        required_counterpart_artifact_family: [
          ...(pathway.required_counterpart_artifact_family || [])
        ],
        minimum_symmetry_conditions: [...(pathway.minimum_symmetry_conditions || [])],
        burden_status_snapshot: Object.fromEntries(
          (pathway.minimum_symmetry_conditions || []).map((burdenId) => [
            burdenId,
            burdenStatuses[burdenId]?.status || 'not_declared'
          ])
        ),
        machine_artifact_availability: Object.fromEntries(
          (pathway.required_machine_artifact_family || []).map((artifactName) => [
            artifactName,
            machineArtifactAvailability[artifactName] === true ? 'available' : 'missing'
          ])
        ),
        counterpart_contract_id: pathway.required_counterpart_contract_id,
        homologation_unit: pathway.homologation_unit,
        admissible_collection_mode: [...(pathway.admissible_collection_mode || [])],
        completeness_criteria: completeness.criteria,
        incomplete_criteria: completeness.incomplete_criteria,
        blockers: [
          ...(pathway.pathway_blockers || []),
          ...completeness.incomplete_criteria,
          'counterpart_artifact_family_absent'
        ],
        forbidden_substitutions_triggered: forbiddenSubstitutionsTriggered,
        pathway_non_implications: [...(pathway.pathway_non_implications || [])]
      };
    });

    const triggeredForbiddenSubstitutions = [
      ...new Set(
        pathwayStatuses.flatMap((entry) =>
          entry.forbidden_substitutions_triggered.map(
            (substitution) => `${entry.pathway_id}:${substitution}`
          )
        )
      )
    ];
    const partialOpenings = pathwayStatuses
      .filter((entry) =>
        [
          'pathway_defined_but_uninstantiated',
          'pathway_contract_ready_but_counterpart_absent',
          'pathway_theoretically_open'
        ].includes(entry.status)
      )
      .map((entry) => entry.pathway_id);

    return {
      artifact_role: 'human_channel_pathway_assessment',
      artifact_name: 'human_channel_pathway_assessment.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      comparative_layer_id: 'comparative_expansion_layer.stage2_m3_operationalization',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'comparative_runtime_contract_operationalization_implemented',
      pathway_layer_state: 'human_channel_pathway_contract_operationalized',
      pathway_statuses: pathwayStatuses,
      pathway_summary: {
        comparator_object_class_count: (
          HUMAN_COMPARATOR_PROTOCOL.comparator_object_classes || []
        ).length,
        status_counts: summarizeStatuses(pathwayStatuses),
        pathway_count: pathwayStatuses.length,
        partial_opening_count: partialOpenings.length
      },
      pathway_authorization_state: 'no_verdict_authorized',
      triggered_forbidden_substitutions: triggeredForbiddenSubstitutions,
      partial_openings: partialOpenings,
      warnings: [
        'pathway_layer_records_contractual_readiness_only',
        'no_human_measurements_instantiated',
        'forbidden_proxy_substitutions_remain_blocked',
        'no_verdict_authorized'
      ],
      boundary_flags: {
        ...STANDARD_FLAGS
      },
      non_implications: [
        'No human evidence follows from pathway readiness.',
        'No human equivalence follows from pathway readiness.',
        'No cross-substrate verdict follows from pathway readiness.'
      ],
      interpretation_boundary: BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        stage2_m2_comparator_ref:
          'artifacts/comparative_program/stage2m2/human_comparator_assessment.json',
        bridge_projection_ref:
          'artifacts/phenomenal_bridge/bpfm3/phenomenal_bridge_projection.json',
        bridge_manifest_ref: 'artifacts/phenomenal_bridge/bpfm3/phenomenal_bridge_manifest.json',
        current_lineage: currentLineage
      },
      schema_ref: 'src/comparative_program/schemas/human_channel_pathway_assessment.v1.json'
    };
  }
}

export const createHumanChannelPathwayEvaluator = () => new HumanChannelPathwayEvaluator();

export default {
  HumanChannelPathwayEvaluator,
  createHumanChannelPathwayEvaluator
};
import {
  EXTERNAL_ADJUDICATION_OPENING_CRITERIA,
  listAdjudicationChannelCriteria
} from './ExternalAdjudicationOpeningCriteriaRegistry.js';

const LAYER_VERSION = 'comparative_expansion_layer.stage2_m4.instantiation_readiness.v1';
const ESTIMATOR_VERSION = 'human_channel_instantiation_readiness_evaluator.stage2_m4.v1';

const BOUNDARY =
  'Framework-internal only; human-channel instantiation readiness records whether legitimate human-channel protocols could be opened under current governance and contract structure. It does not instantiate human evidence, does not authorize equivalence, and does not open external adjudication.';

const STANDARD_FLAGS = Object.freeze({
  framework_internal_only: true,
  not_human_equivalence_support: true,
  not_superiority_support: true,
  not_cross_substrate_equivalence_support: true,
  not_identity_preservation_support: true,
  not_external_adjudication: true,
  not_paper10_authorization: true,
  no_evidential_instantiation: true
});

const summarizeStatuses = (entries) => {
  const counts = {};
  entries.forEach((entry) => {
    counts[entry.status] = (counts[entry.status] || 0) + 1;
  });
  return counts;
};

const unique = (items) => [...new Set(items.filter(Boolean))];

const resolveInstantiationStatus = ({
  pathwayStatus,
  contractStatus,
  homologationStatus,
  transitionStatus,
  governanceBlocked,
  contractComplete,
  homologationDefined,
  transitionDefined,
  counterpartAbsent,
  legitimateInstantiationProtocolOpenable
}) => {
  if (!pathwayStatus || pathwayStatus.status === 'pathway_not_open') {
    return 'instantiation_not_open';
  }

  if (governanceBlocked) {
    return 'instantiation_ready_but_governance_blocked';
  }

  if (
    !contractComplete
    || !homologationDefined
    || !transitionDefined
    || contractStatus?.status === 'counterpart_contract_incomplete'
    || homologationStatus?.status === 'homologation_contract_incomplete'
    || transitionStatus?.status === 'transition_contract_incomplete'
  ) {
    return 'instantiation_contract_incomplete';
  }

  if (counterpartAbsent) {
    return 'instantiation_ready_but_no_counterpart';
  }

  if (legitimateInstantiationProtocolOpenable) {
    return 'instantiation_formally_open_but_uninstantiated';
  }

  return 'instantiation_not_open';
};

export class HumanChannelInstantiationReadinessEvaluator {
  evaluate({ comparativeRuntimeBaseline, comparativeOperationalBaseline, currentLineage }) {
    const stage2ChannelMap = new Map(
      (comparativeRuntimeBaseline.human_comparator_assessment?.channel_statuses || []).map(
        (entry) => [entry.channel_id, entry]
      )
    );
    const pathwayMap = new Map(
      (comparativeOperationalBaseline.human_channel_pathway_assessment?.pathway_statuses || []).map(
        (entry) => [entry.channel_id, entry]
      )
    );
    const contractMap = new Map(
      (
        comparativeOperationalBaseline.counterpart_artifact_contract_assessment?.contract_statuses
        || []
      ).map((entry) => [entry.contract_id, entry])
    );
    const homologationMap = new Map(
      (comparativeOperationalBaseline.homologation_contract_assessment?.homologation_units || []).map(
        (entry) => [entry.homologation_unit_id, entry]
      )
    );
    const transitionMap = new Map(
      (
        comparativeOperationalBaseline.cross_substrate_transition_contract_assessment
          ?.transition_contract_statuses || []
      ).map((entry) => [entry.contract_id, entry])
    );

    const channelInstantiationStatuses = listAdjudicationChannelCriteria().map((criterion) => {
      const stage2Channel = stage2ChannelMap.get(criterion.channel_id) || null;
      const pathwayStatus = pathwayMap.get(criterion.channel_id) || null;
      const contractStatus = contractMap.get(criterion.counterpart_contract_id) || null;
      const homologationStatus =
        homologationMap.get(criterion.homologation_unit_id) || null;
      const transitionStatus = criterion.transition_contract_id
        ? transitionMap.get(criterion.transition_contract_id) || null
        : null;

      const collectionRouteDefined =
        Array.isArray(pathwayStatus?.admissible_collection_mode)
        && pathwayStatus.admissible_collection_mode.length > 0;
      const counterpartFamilyDefined =
        Array.isArray(contractStatus?.required_counterpart_artifact_class)
        && contractStatus.required_counterpart_artifact_class.length > 0;
      const counterpartAbsent =
        Array.isArray(contractStatus?.missing_artifact_families)
        && contractStatus.missing_artifact_families.length > 0;
      const homologationDefined =
        Boolean(homologationStatus)
        && Object.keys(homologationStatus.required_burden_statuses || {}).length > 0;
      const transitionDefined = criterion.transition_contract_id
        ? Boolean(transitionStatus)
        : true;
      const governanceBlocked =
        pathwayStatus?.status === 'pathway_blocked_by_forbidden_proxy'
        || (pathwayStatus?.forbidden_substitutions_triggered || []).length > 0;
      const contractComplete =
        pathwayStatus?.status !== 'pathway_contract_incomplete'
        && contractStatus?.status !== 'counterpart_contract_incomplete'
        && homologationStatus?.status !== 'homologation_contract_incomplete'
        && transitionStatus?.status !== 'transition_contract_incomplete';
      const legitimateInstantiationProtocolOpenable =
        collectionRouteDefined
        && counterpartFamilyDefined
        && homologationDefined
        && transitionDefined
        && contractComplete
        && !governanceBlocked
        && !counterpartAbsent;

      const status = resolveInstantiationStatus({
        pathwayStatus,
        contractStatus,
        homologationStatus,
        transitionStatus,
        governanceBlocked,
        contractComplete,
        homologationDefined,
        transitionDefined,
        counterpartAbsent,
        legitimateInstantiationProtocolOpenable
      });

      const blockers = unique([
        ...(pathwayStatus?.blockers || []),
        ...(contractStatus?.blocked_conditions || []),
        ...(homologationStatus?.blockers || []),
        ...(transitionStatus?.missing_transition_artifacts || []),
        ...(counterpartAbsent ? ['counterpart_artifact_family_absent'] : []),
        ...(governanceBlocked ? ['forbidden_proxy_exposure'] : []),
        ...(!collectionRouteDefined ? ['admissible_collection_route_not_declared'] : []),
        ...(!homologationDefined ? ['homologation_preconditions_not_declared'] : []),
        ...(!transitionDefined ? ['transition_contract_not_declared'] : [])
      ]);

      return {
        criterion_id: criterion.criterion_id,
        channel_id: criterion.channel_id,
        pathway_id: criterion.pathway_id,
        counterpart_contract_id: criterion.counterpart_contract_id,
        homologation_unit_id: criterion.homologation_unit_id,
        transition_contract_id: criterion.transition_contract_id || null,
        stage2_m2_runtime_state: stage2Channel?.runtime_state || 'not_assessed',
        pathway_status: pathwayStatus?.status || 'pathway_not_open',
        counterpart_contract_status:
          contractStatus?.status || 'counterpart_contract_defined_but_uninstantiated',
        homologation_status:
          homologationStatus?.status || 'homologation_not_open',
        transition_status: transitionStatus?.status || 'transition_not_open',
        status,
        pathway_exists: Boolean(pathwayStatus),
        contract_complete: contractComplete,
        forbidden_proxy_blocked: governanceBlocked,
        forbidden_proxy_exposure:
          pathwayStatus?.forbidden_substitutions_triggered || [],
        collection_route_defined: collectionRouteDefined,
        counterpart_family_defined: counterpartFamilyDefined,
        homologation_preconditions_defined: homologationDefined,
        legitimate_instantiation_protocol_openable:
          legitimateInstantiationProtocolOpenable,
        missing_counterpart_artifact_families:
          contractStatus?.missing_artifact_families || [],
        blockers,
        non_implications: [...(criterion.non_implications || [])]
      };
    });

    const formallyOpenChannels = channelInstantiationStatuses
      .filter((entry) => entry.status === 'instantiation_formally_open_but_uninstantiated')
      .map((entry) => entry.channel_id);
    const governanceBlockedChannels = channelInstantiationStatuses
      .filter((entry) => entry.status === 'instantiation_ready_but_governance_blocked')
      .map((entry) => entry.channel_id);

    return {
      artifact_role: 'human_channel_instantiation_readiness',
      artifact_name: 'human_channel_instantiation_readiness.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      comparative_layer_id: 'comparative_expansion_layer.stage2_m4_internal_closure',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'comparative_internal_closure_implemented',
      instantiation_layer_state: 'human_channel_instantiation_readiness_evaluated',
      channel_instantiation_statuses: channelInstantiationStatuses,
      instantiation_summary: {
        status_counts: summarizeStatuses(channelInstantiationStatuses),
        channel_count: channelInstantiationStatuses.length,
        formally_open_channel_count: formallyOpenChannels.length,
        governance_blocked_channel_count: governanceBlockedChannels.length,
        overall_state:
          formallyOpenChannels.length > 0
            ? 'channel_instantiation_partially_formalized'
            : 'channel_instantiation_not_ready_for_stage3'
      },
      formally_open_channels: formallyOpenChannels,
      governance_blocked_channels: governanceBlockedChannels,
      warnings: [
        'instantiation_readiness_is_non_evidential',
        'human_channels_remain_uninstantiated',
        'forbidden_proxy_exclusion_remains_in_force',
        'stage3_opening_remains_blocked_under_current_artifacts'
      ],
      boundary_flags: {
        ...STANDARD_FLAGS
      },
      non_implications: [
        'Instantiation readiness is not human evidence.',
        'Instantiation readiness is not human equivalence.',
        'Instantiation readiness is not external adjudication.'
      ],
      interpretation_boundary: BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        stage2_m2_comparator_ref:
          'artifacts/comparative_program/stage2m2/human_comparator_assessment.json',
        stage2_m3_pathway_ref:
          'artifacts/comparative_program/stage2m3/human_channel_pathway_assessment.json',
        stage2_m3_counterpart_ref:
          'artifacts/comparative_program/stage2m3/counterpart_artifact_contract_assessment.json',
        stage2_m3_homologation_ref:
          'artifacts/comparative_program/stage2m3/homologation_contract_assessment.json',
        current_lineage: currentLineage
      },
      schema_ref:
        'src/comparative_program/schemas/human_channel_instantiation_readiness.v1.json'
    };
  }
}

export const createHumanChannelInstantiationReadinessEvaluator = () =>
  new HumanChannelInstantiationReadinessEvaluator();

export default {
  HumanChannelInstantiationReadinessEvaluator,
  createHumanChannelInstantiationReadinessEvaluator
};
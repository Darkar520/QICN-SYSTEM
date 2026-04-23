import {
  listHumanChannelInstantiationContracts
} from './HumanChannelInstantiationContractRegistry.js';
import {
  getHumanChannelPreregistrationTemplate
} from './HumanChannelPreregistrationRegistry.js';
import {
  getMatchedInterventionDatasetContractForChannel
} from './MatchedInterventionDatasetContractRegistry.js';
import {
  getNegativeControlDatasetContractForChannel
} from './NegativeControlDatasetContractRegistry.js';
import {
  getStatisticalAnalysisShell
} from './StatisticalAnalysisShellRegistry.js';

const LAYER_VERSION = 'comparative_expansion_layer.stage3_1.instantiation_contracts.v1';
const ESTIMATOR_VERSION = 'human_channel_instantiation_evaluator.stage3_1.v1';

const BOUNDARY =
  'Framework-internal only; Stage3-1 instantiation assessment records whether channel-specific execution contracts, preregistration templates, and dataset-control layers are ready for later collection. It does not instantiate human data and does not authorize result claims.';

const STANDARD_FLAGS = Object.freeze({
  framework_internal_only: true,
  no_human_data_present: true,
  not_external_adjudication: true,
  not_human_equivalence_support: true,
  not_superiority_support: true,
  not_metaphysical_closure: true,
  result_claim_authorization_blocked: true
});

const summarize = (entries, key) => {
  const counts = {};
  entries.forEach((entry) => {
    const value = entry[key];
    counts[value] = (counts[value] || 0) + 1;
  });
  return counts;
};

const unique = (items) => [...new Set((items || []).filter(Boolean))];

const resolveChannelState = ({
  channelId,
  priorStage2State,
  preregistrationReady,
  negativeControlReady,
  matchedDatasetReady,
  statisticalShellReady
}) => {
  if (priorStage2State === 'instantiation_not_open') return 'instantiation_blocked_by_missing_human_route';
  if (!preregistrationReady) return 'instantiation_contract_defined';
  if (!negativeControlReady || !statisticalShellReady) return 'instantiation_preregistration_ready';
  if (channelId === 'transport_preservation_channel') return 'instantiation_dataset_contract_ready';
  if (!matchedDatasetReady) return 'instantiation_dataset_contract_ready';
  return 'instantiation_ready_for_collection';
};

export class HumanChannelInstantiationEvaluator {
  evaluate({ stage2InstantiationReadiness, currentLineage }) {
    const priorMap = new Map(
      (stage2InstantiationReadiness.channel_instantiation_statuses || []).map((entry) => [
        entry.channel_id,
        entry
      ])
    );

    const channel_assessments = listHumanChannelInstantiationContracts().map((contract) => {
      const prior = priorMap.get(contract.channel_id) || null;
      const preregTemplate = getHumanChannelPreregistrationTemplate(contract.channel_id);
      const matchedDatasetContract = getMatchedInterventionDatasetContractForChannel(contract.channel_id);
      const negativeControlContract = getNegativeControlDatasetContractForChannel(contract.channel_id);
      const statisticalShell = getStatisticalAnalysisShell(contract.statistical_analysis_shell);

      const preregistrationReady = Boolean(preregTemplate);
      const negativeControlReady = Boolean(negativeControlContract);
      const matchedDatasetReady =
        contract.channel_id === 'transport_preservation_channel'
          || !getMatchedInterventionDatasetContractForChannel(contract.channel_id)
          || Boolean(matchedDatasetContract);
      const statisticalShellReady = Boolean(statisticalShell);

      const instantiation_state = resolveChannelState({
        channelId: contract.channel_id,
        priorStage2State: prior?.status || 'instantiation_not_open',
        preregistrationReady,
        negativeControlReady,
        matchedDatasetReady,
        statisticalShellReady
      });

      const blocking_reasons = unique([
        ...(prior?.blockers || []),
        ...(!preregistrationReady ? ['preregistration_template_absent'] : []),
        ...(!negativeControlReady ? ['negative_control_contract_absent'] : []),
        ...(!matchedDatasetReady ? ['matched_dataset_contract_absent'] : []),
        ...(!statisticalShellReady ? ['statistical_shell_absent'] : []),
        ...(contract.channel_id === 'transport_preservation_channel'
          ? ['target_counterpart_manifest_still_absent']
          : []),
        'human_data_absent',
        'result_claim_authorization_blocked'
      ]);

      return {
        channel_id: contract.channel_id,
        prior_stage2_instantiation_state: prior?.status || 'instantiation_not_open',
        instantiation_state,
        preregistration_template_state: preregistrationReady
          ? 'preregistration_ready_for_freeze'
          : 'preregistration_incomplete',
        matched_dataset_contract_state: matchedDatasetContract
          ? 'dataset_contract_ready_but_uninstantiated'
          : 'dataset_contract_not_defined',
        negative_control_contract_state: negativeControlReady
          ? 'negative_control_contract_ready_but_uninstantiated'
          : 'negative_control_contract_not_defined',
        statistical_shell_state: statisticalShellReady ? 'analysis_shell_declared' : 'analysis_shell_missing',
        human_data_state: 'human_comparator_data_absent',
        result_claim_authorization_state: 'instantiation_not_authorized_for_result_claim',
        blocking_reasons,
        non_implications: [
          ...(contract.non_implications || []),
          'Collection readiness is not evidence.',
          'Collection readiness is not an adjudication verdict.'
        ]
      };
    });

    const readyCount = channel_assessments.filter(
      (entry) => entry.instantiation_state === 'instantiation_ready_for_collection'
    ).length;

    return {
      artifact_role: 'human_channel_instantiation_assessment',
      artifact_name: 'human_channel_instantiation_assessment.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      layer_id: 'comparative_expansion_layer.stage3_1_human_comparator_instantiation',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'stage3_1_instantiation_contracts_defined',
      human_data_state: 'human_comparator_data_absent',
      overall_state: readyCount > 0 ? 'instantiation_ready_or_partially_ready' : 'instantiation_incomplete',
      channel_assessments,
      counts: {
        instantiation_state_counts: summarize(channel_assessments, 'instantiation_state'),
        preregistration_state_counts: summarize(channel_assessments, 'preregistration_template_state')
      },
      boundary_flags: {
        ...STANDARD_FLAGS
      },
      non_implications: [
        'This assessment is not a dataset.',
        'This assessment is not external validation.',
        'This assessment is not human equivalence.'
      ],
      interpretation_boundary: BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        stage2_instantiation_ref:
          'artifacts/comparative_program/stage2m4/human_channel_instantiation_readiness.json',
        current_lineage: currentLineage
      },
      schema_ref:
        'src/comparative_program/schemas/human_channel_instantiation_assessment.v1.json'
    };
  }
}

export const createHumanChannelInstantiationEvaluator = () =>
  new HumanChannelInstantiationEvaluator();

export default {
  HumanChannelInstantiationEvaluator,
  createHumanChannelInstantiationEvaluator
};

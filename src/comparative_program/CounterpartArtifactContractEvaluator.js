import { COUNTERPART_ARTIFACT_CONTRACTS } from './CounterpartArtifactContractsRegistry.js';

const LAYER_VERSION = 'comparative_expansion_layer.stage2_m3.counterpart_contracts.v1';
const ESTIMATOR_VERSION = 'counterpart_artifact_contract_evaluator.stage2_m3.v1';

const BOUNDARY =
  'Framework-internal only; counterpart artifact contract assessment records contract completeness, missing artifact families, and invalid-substitution exposure, not instantiated counterpart evidence, not homologation verdicts, and not external adjudication.';

const STANDARD_FLAGS = Object.freeze({
  framework_internal_only: true,
  not_human_equivalence_support: true,
  not_cross_substrate_equivalence_support: true,
  not_external_adjudication: true,
  not_paper10_authorization: true,
  no_verdict_authorized: true
});

const resolveContractStatus = ({ contract, pathwayStatus }) => {
  switch (pathwayStatus?.status) {
    case 'pathway_blocked_by_forbidden_proxy':
      return 'counterpart_contract_blocked_by_invalid_substitution';
    case 'pathway_contract_ready_but_counterpart_absent':
      return 'counterpart_contract_ready_but_counterpart_absent';
    case 'pathway_theoretically_open':
      return contract.contract_id === 'temporal_structure_counterpart_contract'
        ? 'counterpart_contract_defined_but_uninstantiated'
        : 'counterpart_contract_theoretically_admissible';
    case 'pathway_defined_but_uninstantiated':
      return 'counterpart_contract_defined_but_uninstantiated';
    case 'pathway_contract_incomplete':
      return 'counterpart_contract_incomplete';
    default:
      return 'counterpart_contract_defined_but_uninstantiated';
  }
};

const inferTypingIncompleteness = (contract, status) => {
  if (status !== 'counterpart_contract_incomplete') return [];

  if (contract.contract_id === 'embodiment_boundary_counterpart_contract') {
    return [`${contract.contract_id}:embodiment_error_budget_reference`];
  }

  if (contract.contract_id === 'transport_counterpart_contract') {
    return [`${contract.contract_id}:axis_specific_error_budget_map`];
  }

  return [];
};

const inferLineageIncompleteness = (contract, status) => {
  if (status !== 'counterpart_contract_incomplete') return [];

  if (contract.contract_id === 'transport_counterpart_contract') {
    return [
      `${contract.contract_id}:transition_lineage_map`,
      `${contract.contract_id}:target_artifact_provenance_chain`
    ];
  }

  return [];
};

const summarizeStatuses = (contractStatuses) => {
  const counts = {};
  contractStatuses.forEach((entry) => {
    counts[entry.status] = (counts[entry.status] || 0) + 1;
  });
  return counts;
};

export class CounterpartArtifactContractEvaluator {
  evaluate({ pathwayAssessment, currentLineage }) {
    const pathwayByContractId = new Map(
      (pathwayAssessment.pathway_statuses || []).map((entry) => [entry.counterpart_contract_id, entry])
    );

    const contractStatuses = (COUNTERPART_ARTIFACT_CONTRACTS.contracts || []).map((contract) => {
      const pathwayStatus = pathwayByContractId.get(contract.contract_id) || null;
      const status = resolveContractStatus({ contract, pathwayStatus });
      const typingIncompleteness = inferTypingIncompleteness(contract, status);
      const lineageIncompleteness = inferLineageIncompleteness(contract, status);

      return {
        contract_id: contract.contract_id,
        target_domain: contract.target_domain,
        status,
        pathway_ref: pathwayStatus?.pathway_id || 'no_pathway_ref',
        homologation_target: contract.homologation_target,
        required_counterpart_artifact_class: [
          ...(contract.required_counterpart_artifact_class || [])
        ],
        structural_typing_requirements: [...(contract.structural_typing_requirements || [])],
        artifact_lineage_requirements: [...(contract.artifact_lineage_requirements || [])],
        missing_artifact_families: [...(contract.required_counterpart_artifact_class || [])],
        typing_incompleteness: typingIncompleteness,
        lineage_incompleteness: lineageIncompleteness,
        blocked_conditions: [...(contract.blocked_states || [])],
        invalid_substitution_exposure:
          status === 'counterpart_contract_blocked_by_invalid_substitution'
            ? [...(contract.invalid_substitutions || [])]
            : [],
        future_admissibility_notes: [...(contract.future_admissibility_notes || [])],
        non_implications: [...(contract.non_implications || [])]
      };
    });

    return {
      artifact_role: 'counterpart_artifact_contract_assessment',
      artifact_name: 'counterpart_artifact_contract_assessment.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      comparative_layer_id: 'comparative_expansion_layer.stage2_m3_operationalization',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'comparative_runtime_contract_operationalization_implemented',
      contract_layer_state: 'counterpart_contracts_operationalized_but_counterpart_absent',
      contract_statuses: contractStatuses,
      missing_artifact_families: [
        ...new Set(
          contractStatuses.flatMap((entry) => entry.missing_artifact_families || [])
        )
      ],
      typing_incompleteness: [
        ...new Set(contractStatuses.flatMap((entry) => entry.typing_incompleteness || []))
      ],
      lineage_incompleteness: [
        ...new Set(contractStatuses.flatMap((entry) => entry.lineage_incompleteness || []))
      ],
      blocked_conditions: [
        ...new Set(contractStatuses.flatMap((entry) => entry.blocked_conditions || []))
      ],
      contract_summary: {
        status_counts: summarizeStatuses(contractStatuses),
        contract_count: contractStatuses.length
      },
      warnings: [
        'counterpart_contracts_define_future_artifacts_only',
        'counterpart_artifact_families_remain_absent',
        'invalid_substitutions_remain_blocked',
        'no_verdict_authorized'
      ],
      boundary_flags: {
        ...STANDARD_FLAGS
      },
      non_implications: [
        'No human-side artifacts are instantiated by this assessment.',
        'No homologation verdict follows from counterpart contract readiness.',
        'No external adjudication follows from counterpart contract readiness.'
      ],
      interpretation_boundary: BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        pathway_assessment_ref:
          'artifacts/comparative_program/stage2m3/human_channel_pathway_assessment.json',
        current_lineage: currentLineage
      },
      schema_ref:
        'src/comparative_program/schemas/counterpart_artifact_contract_assessment.v1.json'
    };
  }
}

export const createCounterpartArtifactContractEvaluator = () =>
  new CounterpartArtifactContractEvaluator();

export default {
  CounterpartArtifactContractEvaluator,
  createCounterpartArtifactContractEvaluator
};
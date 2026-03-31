import { CROSS_SUBSTRATE_TRANSPORT_PROTOCOL } from './CrossSubstrateTransportRegistry.js';
import { CROSS_SUBSTRATE_TRANSITION_CONTRACTS } from './CrossSubstrateTransitionContractsRegistry.js';

const LAYER_VERSION = 'comparative_expansion_layer.stage2_m3.transition_contracts.v1';
const ESTIMATOR_VERSION = 'cross_substrate_transition_contract_evaluator.stage2_m3.v1';

const BOUNDARY =
  'Framework-internal only; cross-substrate transition contract assessment records transition-contract readiness, preservation-axis readiness, and fork or fracture exposure, not transport preservation, not identity preservation, and not external adjudication.';

const STANDARD_FLAGS = Object.freeze({
  framework_internal_only: true,
  not_superiority_support: true,
  not_cross_substrate_equivalence_support: true,
  not_identity_preservation_support: true,
  not_external_adjudication: true,
  not_paper10_authorization: true,
  no_transport_verdict_authorized: true
});

const TRANSITION_STATUS_BY_CONTRACT = Object.freeze({
  bridge_coordinate_transition_contract: 'transition_contract_ready_but_target_absent',
  intervention_signature_transition_contract: 'transition_contract_underdetermined',
  lineage_continuity_transition_contract: 'transition_contract_ready_but_target_absent',
  embodiment_boundary_transition_contract: 'transition_contract_incomplete'
});

const aggregateAxisStatus = (statuses) => {
  if (statuses.includes('transition_contract_incomplete')) return 'transition_contract_incomplete';
  if (statuses.includes('transition_contract_underdetermined')) {
    return 'transition_contract_underdetermined';
  }
  if (statuses.includes('transition_contract_ready_but_target_absent')) {
    return 'transition_contract_ready_but_target_absent';
  }
  if (statuses.includes('transition_contract_defined')) return 'transition_contract_defined';
  return 'transition_contract_defined';
};

export class CrossSubstrateTransitionContractEvaluator {
  evaluate({ comparativeRuntimeBaseline, currentLineage }) {
    const transitionContractStatuses = (
      CROSS_SUBSTRATE_TRANSITION_CONTRACTS.transition_contracts || []
    ).map((contract) => {
      const status =
        TRANSITION_STATUS_BY_CONTRACT[contract.contract_id] || 'transition_contract_defined';
      return {
        contract_id: contract.contract_id,
        status,
        transport_verdict_authorization_state: 'transition_not_authorized_for_transport_verdict',
        source_substrate_class: contract.source_substrate_class,
        target_substrate_class: contract.target_substrate_class,
        preservation_axes_required: [...(contract.preservation_axes_required || [])],
        transition_lineage_requirements: [...(contract.transition_lineage_requirements || [])],
        artifact_continuity_requirements: [...(contract.artifact_continuity_requirements || [])],
        error_budget_requirements: [...(contract.error_budget_requirements || [])],
        fork_fracture_risk_factors: [...(contract.fork_fracture_risk_factors || [])],
        invalid_substitutions: [...(contract.invalid_substitutions || [])],
        missing_transition_artifacts: [
          ...(contract.artifact_continuity_requirements || []),
          ...(contract.transition_lineage_requirements || []).filter((entry) =>
            /target|transition|branch/i.test(entry)
          )
        ]
      };
    });

    const preservationAxisReadiness = Object.fromEntries(
      (CROSS_SUBSTRATE_TRANSPORT_PROTOCOL.preservation_axes || []).map((axisId) => {
        const statuses = transitionContractStatuses
          .filter((entry) => entry.preservation_axes_required.includes(axisId))
          .map((entry) => entry.status);
        return [axisId, aggregateAxisStatus(statuses)];
      })
    );

    return {
      artifact_role: 'cross_substrate_transition_contract_assessment',
      artifact_name: 'cross_substrate_transition_contract_assessment.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      comparative_layer_id: 'comparative_expansion_layer.stage2_m3_operationalization',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'comparative_runtime_contract_operationalization_implemented',
      transition_layer_state: 'transition_contract_operationalized_but_target_absent',
      transition_contract_statuses: transitionContractStatuses,
      preservation_axis_readiness: preservationAxisReadiness,
      fracture_fork_exposure: [
        ...new Set(
          transitionContractStatuses.flatMap((entry) =>
            entry.fork_fracture_risk_factors.map((risk) => `${entry.contract_id}:${risk}`)
          )
        )
      ],
      missing_transition_artifacts: [
        ...new Set(
          transitionContractStatuses.flatMap((entry) => entry.missing_transition_artifacts || [])
        )
      ],
      transport_verdict_authorization_state: 'transition_not_authorized_for_transport_verdict',
      stage2_m2_transport_state:
        comparativeRuntimeBaseline.cross_substrate_transport_assessment?.current_transport_class
        || 'transport_not_open',
      no_transport_verdict_authorized: true,
      warnings: [
        'transition_contracts_record_readiness_only',
        'target_substrate_counterparts_remain_absent',
        'fork_and_fracture_exposures_remain_unresolved',
        'no_transport_verdict_authorized'
      ],
      boundary_flags: {
        ...STANDARD_FLAGS
      },
      non_implications: [
        'No transport-preservation verdict follows from transition-contract readiness.',
        'No identity-preservation claim follows from transition-contract readiness.',
        'No external adjudication follows from transition-contract readiness.'
      ],
      interpretation_boundary: BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        stage2_m2_transport_ref:
          'artifacts/comparative_program/stage2m2/cross_substrate_transport_assessment.json',
        current_lineage: currentLineage
      },
      schema_ref:
        'src/comparative_program/schemas/cross_substrate_transition_contract_assessment.v1.json'
    };
  }
}

export const createCrossSubstrateTransitionContractEvaluator = () =>
  new CrossSubstrateTransitionContractEvaluator();

export default {
  CrossSubstrateTransitionContractEvaluator,
  createCrossSubstrateTransitionContractEvaluator
};
import { HOMOLOGATION_CONTRACTS } from './HomologationContractsRegistry.js';

const LAYER_VERSION = 'comparative_expansion_layer.stage2_m3.homologation.v1';
const ESTIMATOR_VERSION = 'homologation_contract_evaluator.stage2_m3.v1';

const BOUNDARY =
  'Framework-internal only; homologation contract assessment records whether homologation units are defined, incomplete, underdetermined, or ready-but-counterpart-absent under bounded internal semantics. It does not authorize equivalence verdicts, transport verdicts, or external adjudication.';

const STANDARD_FLAGS = Object.freeze({
  framework_internal_only: true,
  not_human_equivalence_support: true,
  not_superiority_support: true,
  not_cross_substrate_equivalence_support: true,
  not_external_adjudication: true,
  not_paper10_authorization: true,
  no_verdict_authorized: true
});

const resolveHomologationStatus = ({ unit, contractStatus }) => {
  if (unit.homologation_unit_id === 'transport_transition_homologation') {
    return 'homologation_not_open';
  }

  if (unit.homologation_unit_id === 'embodiment_boundary_homologation') {
    return 'homologation_contract_incomplete';
  }

  switch (contractStatus?.status) {
    case 'counterpart_contract_ready_but_counterpart_absent':
      return 'homologation_contract_ready_but_counterpart_absent';
    case 'counterpart_contract_incomplete':
      return 'homologation_contract_incomplete';
    case 'counterpart_contract_blocked_by_invalid_substitution':
      return 'homologation_underdetermined';
    case 'counterpart_contract_defined_but_uninstantiated':
    case 'counterpart_contract_theoretically_admissible':
      return 'homologation_underdetermined';
    default:
      return 'homologation_contract_defined';
  }
};

const summarizeStatuses = (units) => {
  const counts = {};
  units.forEach((entry) => {
    counts[entry.status] = (counts[entry.status] || 0) + 1;
  });
  return counts;
};

export class HomologationContractEvaluator {
  evaluate({ comparativeRuntimeBaseline, counterpartAssessment, currentLineage }) {
    const contractStatusMap = new Map(
      (counterpartAssessment.contract_statuses || []).map((entry) => [entry.contract_id, entry])
    );
    const burdenStatuses =
      comparativeRuntimeBaseline.human_comparator_assessment?.burden_statuses || {};

    const homologationUnits = (HOMOLOGATION_CONTRACTS.homologation_units || []).map((unit) => {
      const contractStatus = contractStatusMap.get(unit.counterpart_contract_id) || null;
      const status = resolveHomologationStatus({ unit, contractStatus });
      const errorBudgetStatus =
        (unit.error_budget_requirements || []).length === 0
          ? 'not_required'
          : burdenStatuses.error_budget_burden?.status === 'satisfied_runtime_reporting_only'
            ? 'defined'
            : 'not_instantiated';

      return {
        homologation_unit_id: unit.homologation_unit_id,
        counterpart_contract_id: unit.counterpart_contract_id,
        status,
        verdict_authorization_state: 'homologation_not_authorized_for_verdict',
        source_artifact_family: [...(unit.source_artifact_family || [])],
        target_counterpart_family: [...(unit.target_counterpart_family || [])],
        required_burden_statuses: Object.fromEntries(
          (unit.burden_symmetry_requirements || []).map((burdenId) => [
            burdenId,
            burdenStatuses[burdenId]?.status || 'not_declared'
          ])
        ),
        intervention_comparability_status:
          (unit.intervention_comparability_requirements || []).length === 0
            ? 'not_required'
            : 'defined_but_uninstantiated',
        error_budget_status: errorBudgetStatus,
        lineage_compatibility_status:
          (unit.lineage_compatibility_requirements || []).length > 0
            ? 'defined_but_counterpart_absent'
            : 'lineage_contract_missing',
        blockers: [
          ...(contractStatus?.blocked_conditions || []),
          ...(errorBudgetStatus === 'not_instantiated'
            ? [`${unit.homologation_unit_id}:error_budget_not_instantiated`]
            : []),
          'counterpart_artifact_family_absent'
        ],
        invalidation_routes: [...(unit.invalidation_routes || [])],
        non_implications: [...(unit.non_implications || [])]
      };
    });

    return {
      artifact_role: 'homologation_contract_assessment',
      artifact_name: 'homologation_contract_assessment.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      comparative_layer_id: 'comparative_expansion_layer.stage2_m3_operationalization',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'comparative_runtime_contract_operationalization_implemented',
      homologation_layer_state:
        homologationUnits.some(
          (entry) => entry.status === 'homologation_contract_ready_but_counterpart_absent'
        )
          ? 'comparative_runtime_homologation_ready_but_counterpart_absent'
          : 'homologation_contracts_defined_but_not_ready',
      homologation_units: homologationUnits,
      contract_completeness_summary: {
        status_counts: summarizeStatuses(homologationUnits),
        ready_but_absent_units: homologationUnits
          .filter((entry) => entry.status === 'homologation_contract_ready_but_counterpart_absent')
          .map((entry) => entry.homologation_unit_id)
      },
      burden_symmetry_summary: {
        by_unit: Object.fromEntries(
          homologationUnits.map((entry) => [
            entry.homologation_unit_id,
            entry.required_burden_statuses
          ])
        ),
        blocked_burdens: [
          ...new Set(
            homologationUnits.flatMap((entry) =>
              Object.entries(entry.required_burden_statuses)
                .filter(([, status]) => status !== 'satisfied_runtime_reporting_only')
                .map(([burdenId]) => burdenId)
            )
          )
        ]
      },
      homologation_blockers: [
        ...new Set(homologationUnits.flatMap((entry) => entry.blockers || []))
      ],
      error_budget_summary: {
        by_unit: Object.fromEntries(
          homologationUnits.map((entry) => [entry.homologation_unit_id, entry.error_budget_status])
        ),
        missing_budget_units: homologationUnits
          .filter((entry) => entry.error_budget_status === 'not_instantiated')
          .map((entry) => entry.homologation_unit_id)
      },
      verdict_authorization_state: 'homologation_not_authorized_for_verdict',
      no_verdict_authorized: true,
      warnings: [
        'homologation_layer_records_contractual_feasibility_only',
        'counterpart_artifacts_remain_absent',
        'burden_symmetry_is_not_yet_satisfied',
        'no_verdict_authorized'
      ],
      boundary_flags: {
        ...STANDARD_FLAGS
      },
      non_implications: [
        'No equivalence verdict follows from homologation readiness.',
        'No transport verdict follows from homologation readiness.',
        'No external adjudication follows from homologation readiness.'
      ],
      interpretation_boundary: BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        counterpart_contract_assessment_ref:
          'artifacts/comparative_program/stage2m3/counterpart_artifact_contract_assessment.json',
        stage2_m2_equivalence_ref:
          'artifacts/comparative_program/stage2m2/human_equivalence_assessment.json',
        current_lineage: currentLineage
      },
      schema_ref: 'src/comparative_program/schemas/homologation_contract_assessment.v1.json'
    };
  }
}

export const createHomologationContractEvaluator = () => new HomologationContractEvaluator();

export default {
  HomologationContractEvaluator,
  createHomologationContractEvaluator
};
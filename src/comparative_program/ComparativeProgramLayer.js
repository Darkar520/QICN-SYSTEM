import fs from 'fs';
import {
  HUMAN_COMPARATOR_PROTOCOL
} from './HumanComparatorProtocolRegistry.js';
import { HUMAN_EQUIVALENCE_LADDER } from './HumanEquivalenceLadderRegistry.js';
import { CROSS_SUBSTRATE_TRANSPORT_PROTOCOL } from './CrossSubstrateTransportRegistry.js';
import { HUMAN_CHANNEL_REQUIREMENTS } from './HumanChannelRequirementsRegistry.js';
import { COMPARATOR_BURDEN_MATRIX } from './ComparatorBurdenMatrixRegistry.js';
import { HUMAN_CHANNEL_PATHWAYS } from './HumanChannelPathwaysRegistry.js';
import { COUNTERPART_ARTIFACT_CONTRACTS } from './CounterpartArtifactContractsRegistry.js';
import { HOMOLOGATION_CONTRACTS } from './HomologationContractsRegistry.js';
import { CROSS_SUBSTRATE_TRANSITION_CONTRACTS } from './CrossSubstrateTransitionContractsRegistry.js';
import {
  EXTERNAL_ADJUDICATION_OPENING_CRITERIA
} from './ExternalAdjudicationOpeningCriteriaRegistry.js';
import {
  HUMAN_CHANNEL_INSTANTIATION_CONTRACTS
} from './HumanChannelInstantiationContractRegistry.js';
import {
  HUMAN_CHANNEL_PREREGISTRATION_TEMPLATES
} from './HumanChannelPreregistrationRegistry.js';
import {
  REVIEWER_INDEPENDENCE_PROTOCOL
} from './ReviewerIndependenceRegistry.js';
import {
  ADJUDICATOR_INDEPENDENCE_CRITERIA
} from './AdjudicatorIndependenceRegistry.js';
import {
  STATISTICAL_ANALYSIS_SHELLS
} from './StatisticalAnalysisShellRegistry.js';
import {
  FROZEN_PREREGISTRATION_RECORD_SCHEMA,
  PREREGISTRATION_FREEZE_POLICY
} from './FrozenPreregistrationRegistry.js';
import {
  REVIEWER_CANDIDATE_SCHEMA
} from './ReviewerCandidateRegistry.js';
import {
  ADJUDICATOR_CANDIDATE_SCHEMA
} from './AdjudicatorCandidateRegistry.js';
import {
  REVIEWER_SELECTION_WORKFLOW,
  BLINDING_ASSIGNMENT_MANIFEST
} from './ReviewerSelectionWorkflowRegistry.js';
import {
  ADJUDICATOR_ASSIGNMENT_WORKFLOW
} from './AdjudicatorAssignmentWorkflowRegistry.js';
import {
  EXECUTION_PILOT_PACKAGE_MANIFEST
} from './ExecutionPilotPackageRegistry.js';
import {
  COLLECTION_SESSION_SCHEMA
} from './ExecutionSessionRegistry.js';
import {
  REPRODUCIBILITY_PACKAGE_SKELETON,
  PILOT_NEGATIVE_CONTROL_BUNDLE,
  PILOT_MATCHED_INTERVENTION_BUNDLE
} from './ReproducibilityPackageRegistry.js';
import {
  listInstantiatedEmptyRecordRoles
} from './InstantiatedEmptyRecordRegistry.js';
import {
  listCandidatePoolSlots
} from './CandidatePoolRegistry.js';
import {
  REVIEWER_ASSIGNMENT_STUB,
  ADJUDICATOR_ASSIGNMENT_STUB,
  REVIEWER_BLINDING_STUB
} from './AssignmentStubRegistry.js';
import {
  EXECUTION_PILOT_REHEARSAL_KIT,
  REHEARSAL_FAILURE_MODES,
  REHEARSAL_RESET_POLICY
} from './ExecutionPilotRehearsalRegistry.js';
import {
  DRY_RUN_SEQUENCE_PLAN,
  REHEARSAL_EVENT_LOG_SCHEMA
} from './DryRunSequenceRegistry.js';
import {
  CONTROLLED_EXECUTION_OPENING_POLICY,
  SESSION_ZERO_PROTOCOL,
  PRE_COLLECTION_ADMISSIBILITY_GATE
} from './ControlledExecutionOpeningRegistry.js';
import {
  listLiveArtifactRoles
} from './LiveArtifactRegistry.js';
import {
  listRuntimeHealthRequiredCommands,
  listCleanRoomRequiredChecks
} from './RuntimeHealthAuditRegistry.js';
import {
  FIRST_ADMISSIBLE_COLLECTION_START_POLICY,
  COLLECTION_START_COMMAND_SCHEMA,
  OPERATOR_AUTHORIZATION_SCHEMA,
  listStage3_7OpeningRequirements
} from './FirstCollectionOpeningCriteriaRegistry.js';
import {
  COMPARATIVE_PROGRAM_ARTIFACT_SCHEMA,
  COMPARATIVE_PROGRAM_EXPECTED_ARTIFACTS,
  COMPARATIVE_PROGRAM_IMPLEMENTED_ARTIFACTS
} from './ComparativeProgramArtifactRegistry.js';
import { COMPARATIVE_PROGRAM_SURFACE_POLICY } from './ComparativeProgramSurfacePolicy.js';

const readJson = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));
const readArtifactJson = (relativePath) => {
  try {
    return JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));
  } catch {
    return null;
  }
};

const deriveCurrentStageState = () => {
  const stage36b = readArtifactJson('../../artifacts/runtime_health/stage3_6b_runtime_reproducibility_gate.json');
  const stage37 = readArtifactJson('../../artifacts/external_adjudication/stage3_7/stage3_7_opening_gate.json');

  if (stage37?.stage3_7_state === 'stage3_7_first_collection_openable') {
    return {
      current_stage: 'stage3_first_admissible_collection_opening',
      current_stage3_substage: 'stage3_7_first_collection_openable'
    };
  }

  if (stage36b?.stage3_6b_state) {
    return {
      current_stage: 'stage3_runtime_health_and_reproducibility_audit',
      current_stage3_substage: stage36b.stage3_6b_state
    };
  }

  return {
    current_stage: 'stage3_controlled_execution_opening',
    current_stage3_substage: 'stage3_6_collection_open_pre_evidential'
  };
};

export const COMPARATIVE_PROGRAM_ROOT_SCHEMAS = Object.freeze({
  manifest: readJson('./schemas/comparative_program_manifest.v1.json'),
  human_comparator_assessment: readJson('./schemas/human_comparator_assessment.v1.json'),
  human_equivalence_assessment: readJson('./schemas/human_equivalence_assessment.v1.json'),
  cross_substrate_transport_assessment: readJson('./schemas/cross_substrate_transport_assessment.v1.json'),
  human_channel_pathway_assessment: readJson('./schemas/human_channel_pathway_assessment.v1.json'),
  counterpart_artifact_contract_assessment: readJson('./schemas/counterpart_artifact_contract_assessment.v1.json'),
  homologation_contract_assessment: readJson('./schemas/homologation_contract_assessment.v1.json'),
  cross_substrate_transition_contract_assessment: readJson('./schemas/cross_substrate_transition_contract_assessment.v1.json'),
  comparative_operational_readiness: readJson('./schemas/comparative_operational_readiness.v1.json'),
  comparative_final_internal_audit: readJson('./schemas/comparative_final_internal_audit.v1.json'),
  human_channel_instantiation_readiness: readJson('./schemas/human_channel_instantiation_readiness.v1.json'),
  paper10_comparative_readiness_gate: readJson('./schemas/paper10_comparative_readiness_gate.v1.json'),
  comparative_burden_fulfillment: readJson('./schemas/comparative_burden_fulfillment.v1.json'),
  stage3_opening_readiness: readJson('./schemas/stage3_opening_readiness.v1.json'),
  paper9_handoff_alignment: readJson('./schemas/paper9_handoff_alignment.v1.json'),
  stage3_opening_gate: readJson('./schemas/stage3_opening_gate.v1.json'),
  verification_matrix: readJson('./schemas/comparative_program_verification_matrix.v1.json'),
  readiness_gate: readJson('./schemas/comparative_program_readiness_gate.v1.json')
});

export const COMPARATIVE_PROGRAM_LAYER_STATUS = Object.freeze({
  layer_name: 'Comparative Expansion Layer',
  layer_id: 'comparative_expansion_layer.stage3_6b_runtime_health_and_stage3_7_first_collection_opening',
  implementation_status: 'stage3_6b_runtime_health_and_stage3_7_opening_defined',
  execution_status: 'stage3_7_first_collection_opening_prepared_or_runtime_audited',
  interpretation_boundary:
    'The comparative layer now preserves Stage 2-M4 internal closure and Stage3 readiness while extending the local stack through Stage3-0, Stage3-1, Stage3-2, Stage3-3, Stage3-4, Stage3-4B, Stage3-5, Stage3-6 controlled execution opening, Stage3-6B runtime-health and clean-room reproducibility auditing, and Stage3-7 first-admissible-collection opening criteria. It remains framework-internal only and does not establish human equivalence, superiority, external adjudication results, transport-preservation verdicts, identity preservation, or Paper 10 authorization.'
});

export class ComparativeProgramLayer {
  describe() {
    const latestStageState = deriveCurrentStageState();
    const stage36bGate = readArtifactJson('../../artifacts/runtime_health/stage3_6b_runtime_reproducibility_gate.json');
    const stage37Gate = readArtifactJson('../../artifacts/external_adjudication/stage3_7/stage3_7_opening_gate.json');
    return {
      ...COMPARATIVE_PROGRAM_LAYER_STATUS,
      comparator_object_class_count: (HUMAN_COMPARATOR_PROTOCOL.comparator_object_classes || []).length,
      equivalence_rung_count: (HUMAN_EQUIVALENCE_LADDER.rungs || []).length,
      transport_class_count: (CROSS_SUBSTRATE_TRANSPORT_PROTOCOL.transport_classes || []).length,
      human_channel_count: (HUMAN_CHANNEL_REQUIREMENTS.channels || []).length,
      comparator_burden_count: (COMPARATOR_BURDEN_MATRIX.burdens || []).length,
      pathway_count: (HUMAN_CHANNEL_PATHWAYS.pathways || []).length,
      counterpart_contract_count: (COUNTERPART_ARTIFACT_CONTRACTS.contracts || []).length,
      homologation_unit_count: (HOMOLOGATION_CONTRACTS.homologation_units || []).length,
      transition_contract_count: (CROSS_SUBSTRATE_TRANSITION_CONTRACTS.transition_contracts || []).length,
      adjudication_channel_criterion_count: (
        EXTERNAL_ADJUDICATION_OPENING_CRITERIA.required_human_channel_classes || []
      ).length,
      planned_artifacts: COMPARATIVE_PROGRAM_EXPECTED_ARTIFACTS,
      implemented_artifacts: COMPARATIVE_PROGRAM_IMPLEMENTED_ARTIFACTS,
      surface_boundary: COMPARATIVE_PROGRAM_SURFACE_POLICY.default_interpretation_boundary,
      schema_registry_status: COMPARATIVE_PROGRAM_ARTIFACT_SCHEMA.layer_status,
      scaffold_only: false,
      comparative_program_open: true,
      comparative_runtime_open: true,
      human_comparator_program_open: true,
      human_equivalence_program_open: true,
      cross_substrate_expansion_open: true,
      current_stage: latestStageState.current_stage,
      comparative_runtime_state:
        latestStageState.current_stage3_substage === 'stage3_7_first_collection_openable'
          ? 'stage3_7_first_collection_openable_non_evidential_non_adjudicative'
          : latestStageState.current_stage3_substage,
      stage2_m2_runtime_opening_complete: true,
      stage2_m3_contract_operationalization_complete: true,
      stage2_m4_internal_closure_complete: true,
      stage3_readiness_fulfillment_complete: true,
      stage3_0_scaffold_present: true,
      stage3_1_instantiation_layer_present: true,
      stage3_2_execution_readiness_layer_present: true,
      stage3_3_freeze_layer_present: true,
      stage3_4_dry_run_layer_present: true,
      stage3_4b_instantiated_empty_layer_present: true,
      stage3_5_rehearsal_layer_present: true,
      stage3_6_controlled_execution_layer_present: true,
      stage3_1_channel_contract_count: (
        HUMAN_CHANNEL_INSTANTIATION_CONTRACTS.channels || []
      ).length,
      stage3_1_preregistration_template_count: (
        HUMAN_CHANNEL_PREREGISTRATION_TEMPLATES.channel_templates || []
      ).length,
      stage3_2_reviewer_role_count: (
        REVIEWER_INDEPENDENCE_PROTOCOL.reviewer_roles || []
      ).length,
      stage3_2_adjudicator_requirement_count: (
        ADJUDICATOR_INDEPENDENCE_CRITERIA.independence_requirements || []
      ).length,
      stage3_2_statistical_shell_count: (STATISTICAL_ANALYSIS_SHELLS.shells || []).length,
      stage3_3_frozen_record_class_count: (
        FROZEN_PREREGISTRATION_RECORD_SCHEMA.record_classes || []
      ).length,
      stage3_3_freeze_state_count: (PREREGISTRATION_FREEZE_POLICY.freeze_states || []).length,
      stage3_3_reviewer_candidate_class_count: (
        REVIEWER_CANDIDATE_SCHEMA.candidate_classes || []
      ).length,
      stage3_3_adjudicator_candidate_class_count: (
        ADJUDICATOR_CANDIDATE_SCHEMA.candidate_classes || []
      ).length,
      stage3_3_reviewer_workflow_state_count: (
        REVIEWER_SELECTION_WORKFLOW.workflow_states || []
      ).length,
      stage3_3_adjudicator_workflow_state_count: (
        ADJUDICATOR_ASSIGNMENT_WORKFLOW.workflow_states || []
      ).length,
      stage3_3_blinding_class_count: (
        BLINDING_ASSIGNMENT_MANIFEST.blinding_classes || []
      ).length,
      stage3_3_pilot_component_count: (
        EXECUTION_PILOT_PACKAGE_MANIFEST.required_components || []
      ).length,
      stage3_3_collection_session_class_count: (
        COLLECTION_SESSION_SCHEMA.session_classes || []
      ).length,
      stage3_3_reproducibility_slot_count: (
        REPRODUCIBILITY_PACKAGE_SKELETON.required_slots || []
      ).length,
      stage3_3_negative_control_bundle_family_count: (
        PILOT_NEGATIVE_CONTROL_BUNDLE.bundle_families || []
      ).length,
      stage3_3_matched_bundle_family_count: (
        PILOT_MATCHED_INTERVENTION_BUNDLE.bundle_families || []
      ).length,
      stage3_4b_instantiated_empty_role_count: listInstantiatedEmptyRecordRoles().length,
      stage3_4b_candidate_pool_slot_count: listCandidatePoolSlots().length,
      stage3_4b_reviewer_assignment_stub_present: Boolean(REVIEWER_ASSIGNMENT_STUB.template_role),
      stage3_4b_adjudicator_assignment_stub_present: Boolean(ADJUDICATOR_ASSIGNMENT_STUB.template_role),
      stage3_4b_blinding_stub_present: Boolean(REVIEWER_BLINDING_STUB.template_role),
      stage3_5_rehearsal_component_count: (
        EXECUTION_PILOT_REHEARSAL_KIT.required_components || []
      ).length,
      stage3_5_failure_mode_count: (REHEARSAL_FAILURE_MODES.failure_modes || []).length,
      stage3_5_reset_rule_count: (REHEARSAL_RESET_POLICY.reset_rules || []).length,
      stage3_5_sequence_step_count: (DRY_RUN_SEQUENCE_PLAN.sequence_steps || []).length,
      stage3_5_rehearsal_event_field_count: (
        REHEARSAL_EVENT_LOG_SCHEMA.required_fields || []
      ).length,
      stage3_6_controlled_execution_state_count: (
        CONTROLLED_EXECUTION_OPENING_POLICY.controlled_execution_states || []
      ).length,
      stage3_6_session_zero_step_count: (
        SESSION_ZERO_PROTOCOL.session_zero_steps || []
      ).length,
      stage3_6_pre_collection_requirement_count: (
        PRE_COLLECTION_ADMISSIBILITY_GATE.ready_requirements || []
      ).length,
      stage3_6_live_artifact_family_count: listLiveArtifactRoles().length,
      stage3_6b_runtime_command_count: listRuntimeHealthRequiredCommands().length,
      stage3_6b_clean_room_requirement_count: listCleanRoomRequiredChecks().length,
      stage3_7_opening_requirement_count: listStage3_7OpeningRequirements().length,
      stage3_7_start_prerequisite_count: (
        FIRST_ADMISSIBLE_COLLECTION_START_POLICY.start_prerequisites || []
      ).length,
      stage3_7_collection_start_field_count: (
        COLLECTION_START_COMMAND_SCHEMA.required_fields || []
      ).length,
      stage3_7_operator_authorization_field_count: (
        OPERATOR_AUTHORIZATION_SCHEMA.required_fields || []
      ).length,
      comparative_internal_closure_state: 'comparative_internal_closure_ready',
      stage2_m4_state: 'comparative_internal_closure_ready',
      stage3_readiness_state: 'stage3_ready_but_uninstantiated',
      stage3_0_scaffold_only: false,
      stage3_1_instantiation_state: 'instantiation_ready_or_partially_ready',
      stage3_2_execution_readiness_state: 'execution_readiness_partially_satisfied',
      stage3_3_freeze_state: 'local_freeze_ready',
      stage3_3_reviewer_package_state: 'reviewer_selection_package_ready',
      stage3_3_adjudicator_package_state: 'adjudicator_assignment_package_ready',
      stage3_3_pilot_package_state: 'pilot_package_ready_but_unexecuted',
      stage3_4_execution_pilot_state: 'execution_pilot_dry_run_open',
      stage3_4b_provenance_state: 'artifact_forward_compatible',
      stage3_4b_instantiated_empty_state: 'instantiated_empty_layer_defined',
      stage3_5_rehearsal_state: 'stage3_5_rehearsal_ready',
      stage3_6_execution_opening_state: 'collection_openable_under_controls',
      stage3_6_collection_state: 'stage3_6_collection_open_pre_evidential',
      stage3_6b_runtime_state: stage36bGate?.stage3_6b_state || 'stage3_6b_runtime_not_built',
      stage3_7_opening_state: stage37Gate?.stage3_7_state || 'stage3_7_not_open',
      paper10_protocol_state: 'paper10_protocol_grade_backbone',
      current_stage3_substage: latestStageState.current_stage3_substage,
      ready_for_stage2_m4: true,
      ready_for_stage3_opening: true,
      stage3_opening_state: 'ready_for_stage3_opening',
      paper9_handoff_state: 'paper9_handoff_ready_after_second_pass',
      paper10_scoping_state: 'paper10_scoping_ready_after_stage3_only',
      paper10_scaffold_state: 'paper10_scaffold_open',
      paper10_final_authorized: false,
      candidate_integration_blocked: true,
      audit_integration_blocked: true,
      not_human_equivalence_support: true,
      not_superiority_support: true,
      not_cross_substrate_equivalence_support: true,
      not_identity_preservation_support: true,
      not_external_adjudication: true,
      external_comparative_adjudication_state:
        latestStageState.current_stage3_substage === 'stage3_7_first_collection_openable'
          ? 'first_collection_openable_pre_evidential_only'
          : latestStageState.current_stage3_substage === 'stage3_7_opening_blocked_by_runtime_health'
            || latestStageState.current_stage3_substage === 'stage3_7_opening_blocked_by_clean_room'
            ? 'first_collection_opening_blocked_pre_evidential_only'
            : latestStageState.current_stage3_substage === 'stage3_6b_runtime_blocked'
              ? 'runtime_audit_blocked_pre_evidential_only'
          : latestStageState.current_stage3_substage === 'stage3_6b_runtime_ready'
            || latestStageState.current_stage3_substage === 'stage3_6b_runtime_ready_with_warnings'
            ? 'runtime_audited_pre_evidential_only'
            : 'controlled_execution_open_pre_evidential_only',
      stage3_6b_runtime_audit_layer_present: Boolean(stage36bGate),
      stage3_7_first_collection_layer_present: Boolean(stage37Gate),
      not_paper10_authorization: true,
      no_external_validation: true,
      no_metaphysical_closure: true,
      framework_internal_only: true
    };
  }
}

export const createComparativeProgramLayer = () => new ComparativeProgramLayer();
export const describeComparativeProgramLayer = () => createComparativeProgramLayer().describe();

export default {
  COMPARATIVE_PROGRAM_LAYER_STATUS,
  COMPARATIVE_PROGRAM_ROOT_SCHEMAS,
  ComparativeProgramLayer,
  createComparativeProgramLayer,
  describeComparativeProgramLayer
};

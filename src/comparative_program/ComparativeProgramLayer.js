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
  COMPARATIVE_PROGRAM_ARTIFACT_SCHEMA,
  COMPARATIVE_PROGRAM_EXPECTED_ARTIFACTS,
  COMPARATIVE_PROGRAM_IMPLEMENTED_ARTIFACTS
} from './ComparativeProgramArtifactRegistry.js';
import { COMPARATIVE_PROGRAM_SURFACE_POLICY } from './ComparativeProgramSurfacePolicy.js';

const readJson = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

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
  layer_id: 'comparative_expansion_layer.stage3_execution_pilot_preparation',
  implementation_status: 'stage3_4_execution_pilot_dry_run_defined',
  execution_status: 'stage3_openable_but_non_adjudicative_comparative_runtime',
  interpretation_boundary:
    'The comparative layer now preserves Stage 2-M4 internal closure and Stage3 readiness while extending the local stack through Stage3-0, Stage3-1, Stage3-2, Stage3-3, and Stage3-4 dry-run preparation. It remains framework-internal only and does not establish human equivalence, superiority, external adjudication results, transport-preservation verdicts, identity preservation, or Paper 10 authorization.'
});

export class ComparativeProgramLayer {
  describe() {
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
      current_stage: 'stage3_execution_pilot_preparation',
      comparative_runtime_state: 'stage3_4_dry_run_openable_non_evidential',
      stage2_m2_runtime_opening_complete: true,
      stage2_m3_contract_operationalization_complete: true,
      stage2_m4_internal_closure_complete: true,
      stage3_readiness_fulfillment_complete: true,
      stage3_0_scaffold_present: true,
      stage3_1_instantiation_layer_present: true,
      stage3_2_execution_readiness_layer_present: true,
      stage3_3_freeze_layer_present: true,
      stage3_4_dry_run_layer_present: true,
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
      paper10_protocol_state: 'paper10_protocol_grade_backbone',
      current_stage3_substage: 'stage3_4_execution_pilot_dry_run',
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
      external_comparative_adjudication_state: 'execution_pilot_dry_run_only',
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

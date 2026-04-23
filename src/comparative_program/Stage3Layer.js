import fs from 'fs';

import {
  EXTERNAL_ADJUDICATION_PROTOCOL,
  listExternalAdjudicationObjectClasses,
  listExternalAdjudicationStates
} from './ExternalAdjudicationProtocolRegistry.js';
import {
  EXTERNAL_EVIDENCE_ADMISSIBILITY,
  listExternalEvidenceClasses
} from './ExternalEvidenceAdmissibilityRegistry.js';
import {
  HUMAN_COMPARATOR_EXECUTION_PROTOCOL,
  listHumanComparatorExecutionChannels,
  listHumanComparatorExecutionStates
} from './HumanComparatorExecutionProtocolRegistry.js';
import { STAGE3_SURFACE_POLICY } from './Stage3SurfacePolicy.js';
import { STAGE3_ARTIFACT_SCHEMA, STAGE3_EXPECTED_ARTIFACTS } from './Stage3ArtifactRegistry.js';
import { PAPER10_SCAFFOLD_MANIFEST, listPaper10RequiredSections } from './Paper10ScaffoldRegistry.js';
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
  EXECUTION_PILOT_PACKAGE_MANIFEST
} from './ExecutionPilotPackageRegistry.js';

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const STAGE3_ROOT_SCHEMAS = Object.freeze({
  external_adjudication_manifest: readJson('./schemas/external_adjudication_manifest.v1.json'),
  external_adjudication_readiness_gate: readJson('./schemas/external_adjudication_readiness_gate.v1.json'),
  external_evidence_admissibility_assessment: readJson('./schemas/external_evidence_admissibility_assessment.v1.json'),
  human_comparator_execution_plan: readJson('./schemas/human_comparator_execution_plan.v1.json'),
  paper10_scaffold_status: readJson('./schemas/paper10_scaffold_status.v1.json'),
  stage3_verification_matrix: readJson('./schemas/stage3_verification_matrix.v1.json'),
  frozen_preregistration_readiness: readJson('./schemas/frozen_preregistration_readiness.v1.json'),
  preregistration_lock_assessment: readJson('./schemas/preregistration_lock_assessment.v1.json'),
  reviewer_selection_readiness: readJson('./schemas/reviewer_selection_readiness.v1.json'),
  adjudicator_assignment_readiness: readJson('./schemas/adjudicator_assignment_readiness.v1.json'),
  blinding_assignment_readiness: readJson('./schemas/blinding_assignment_readiness.v1.json'),
  execution_pilot_package_assessment: readJson('./schemas/execution_pilot_package_assessment.v1.json'),
  reproducibility_package_skeleton_status: readJson('./schemas/reproducibility_package_skeleton_status.v1.json'),
  pilot_negative_control_bundle_status: readJson('./schemas/pilot_negative_control_bundle_status.v1.json'),
  pilot_matched_intervention_bundle_status: readJson('./schemas/pilot_matched_intervention_bundle_status.v1.json'),
  execution_pilot_opening_gate: readJson('./schemas/execution_pilot_opening_gate.v1.json'),
  execution_pilot_dry_run_status: readJson('./schemas/execution_pilot_dry_run_status.v1.json'),
  execution_pilot_manifest: readJson('./schemas/execution_pilot_manifest.v1.json')
});

export const STAGE3_LAYER_STATUS = Object.freeze({
  layer_name: 'Stage3 External Adjudication Stack',
  layer_id: 'comparative_expansion_layer.stage3_0_to_stage3_4_external_adjudication_stack',
  implementation_status: 'stage3_4_execution_pilot_dry_run_defined',
  interpretation_boundary:
    'Stage 3 now spans the local scaffold, contract, readiness, freeze, packaging, and dry-run layers from Stage3-0 through Stage3-4. The stack remains framework-internal only and does not execute external adjudication, instantiate admissible human data, or authorize Paper 10 finality.'
});

export class Stage3Layer {
  describe() {
    return {
      ...STAGE3_LAYER_STATUS,
      stage3_open: true,
      stage3_0_scaffold_only: true,
      external_adjudication_executed: false,
      human_comparator_data_present: false,
      paper10_scaffold_created: true,
      paper10_final_authorized: false,
      no_external_validation: true,
      no_human_equivalence: true,
      no_superiority_claim: true,
      no_metaphysical_closure: true,
      external_adjudication_state: EXTERNAL_ADJUDICATION_PROTOCOL.current_state,
      external_adjudication_execution_state: EXTERNAL_ADJUDICATION_PROTOCOL.execution_state,
      comparator_state: HUMAN_COMPARATOR_EXECUTION_PROTOCOL.current_state,
      comparator_execution_state: HUMAN_COMPARATOR_EXECUTION_PROTOCOL.execution_state,
      paper10_state: 'paper10_protocol_grade_backbone',
      public_release_state: PAPER10_SCAFFOLD_MANIFEST.public_release_state,
      frozen_preregistration_record_class_count: (
        FROZEN_PREREGISTRATION_RECORD_SCHEMA.record_classes || []
      ).length,
      preregistration_freeze_state_count: (
        PREREGISTRATION_FREEZE_POLICY.freeze_states || []
      ).length,
      reviewer_candidate_class_count: (
        REVIEWER_CANDIDATE_SCHEMA.candidate_classes || []
      ).length,
      adjudicator_candidate_class_count: (
        ADJUDICATOR_CANDIDATE_SCHEMA.candidate_classes || []
      ).length,
      execution_pilot_required_component_count: (
        EXECUTION_PILOT_PACKAGE_MANIFEST.required_components || []
      ).length,
      adjudication_object_class_count: listExternalAdjudicationObjectClasses().length,
      adjudication_state_count: listExternalAdjudicationStates().length,
      evidence_class_count: listExternalEvidenceClasses().length,
      comparator_channel_count: listHumanComparatorExecutionChannels().length,
      comparator_state_count: listHumanComparatorExecutionStates().length,
      paper10_required_section_count: listPaper10RequiredSections().length,
      stage3_surface_output_count: Object.keys(STAGE3_SURFACE_POLICY.outputs || {}).length,
      stage3_expected_artifact_count: STAGE3_EXPECTED_ARTIFACTS.length,
      stage3_root_schema_count: Object.keys(STAGE3_ROOT_SCHEMAS).length,
      stage3_artifact_schema_status: STAGE3_ARTIFACT_SCHEMA.implementation_status,
      blocked_surfaces: STAGE3_SURFACE_POLICY.blocked_surfaces || [],
      scaffold_only: true,
      current_stage: 'stage3_execution_pilot_preparation',
      current_stage3_substage: 'stage3_4_execution_pilot_dry_run',
      stage3_3_freeze_layer_present: true,
      stage3_4_dry_run_layer_present: true
    };
  }
}

export const createStage3Layer = () => new Stage3Layer();
export const describeStage3Layer = () => createStage3Layer().describe();

export default {
  STAGE3_ROOT_SCHEMAS,
  STAGE3_LAYER_STATUS,
  Stage3Layer,
  createStage3Layer,
  describeStage3Layer
};

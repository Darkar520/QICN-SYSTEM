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

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const STAGE3_ROOT_SCHEMAS = Object.freeze({
  external_adjudication_manifest: readJson('./schemas/external_adjudication_manifest.v1.json'),
  external_adjudication_readiness_gate: readJson('./schemas/external_adjudication_readiness_gate.v1.json'),
  external_evidence_admissibility_assessment: readJson('./schemas/external_evidence_admissibility_assessment.v1.json'),
  human_comparator_execution_plan: readJson('./schemas/human_comparator_execution_plan.v1.json'),
  paper10_scaffold_status: readJson('./schemas/paper10_scaffold_status.v1.json'),
  stage3_verification_matrix: readJson('./schemas/stage3_verification_matrix.v1.json')
});

export const STAGE3_LAYER_STATUS = Object.freeze({
  layer_name: 'Stage3-0 External Adjudication Scaffold',
  layer_id: 'comparative_expansion_layer.stage3_0_external_adjudication_scaffold',
  implementation_status: 'stage3_0_scaffold_governance_open',
  interpretation_boundary:
    'Stage3-0 adds external adjudication architecture, evidence admissibility grammar, human comparator execution grammar, internal Stage3-0 artifacts, and a scaffold-only Paper 10 source tree. It does not execute adjudication, does not instantiate human comparator data, and does not authorize external claims or Paper 10 finality.'
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
      paper10_state: PAPER10_SCAFFOLD_MANIFEST.paper10_state,
      public_release_state: PAPER10_SCAFFOLD_MANIFEST.public_release_state,
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
      current_stage: 'stage3_readiness_fulfillment',
      current_stage3_substage: 'stage3_0_external_adjudication_scaffold'
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

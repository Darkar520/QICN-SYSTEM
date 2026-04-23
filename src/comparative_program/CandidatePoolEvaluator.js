import {
  REVIEWER_CANDIDATE_POOL_FIELDS,
  ADJUDICATOR_CANDIDATE_POOL_FIELDS,
  REVIEWER_CANDIDATE_POOL_TEMPLATE,
  ADJUDICATOR_CANDIDATE_POOL_TEMPLATE
} from './CandidatePoolRegistry.js';
import {
  REVIEWER_ASSIGNMENT_STUB,
  ADJUDICATOR_ASSIGNMENT_STUB,
  REVIEWER_BLINDING_STUB
} from './AssignmentStubRegistry.js';

const LAYER_VERSION = 'comparative_expansion_layer.stage3_4b.candidate_pool_and_stubs.v1';
const ESTIMATOR_VERSION = 'candidate_pool_evaluator.stage3_4b.v1';

const BOUNDARY =
  'Framework-internal only; candidate pools and assignment stubs remain unfilled workflow shells and do not imply reviewer or adjudicator instantiation.';

const count = (items) => (items || []).length;

export class CandidatePoolEvaluator {
  evaluate({ reviewerSelectionReadiness, adjudicatorAssignmentReadiness, currentLineage }) {
    const reviewerCandidatePoolStatus = {
      artifact_role: 'reviewer_candidate_pool_status',
      artifact_name: 'reviewer_candidate_pool_status.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      layer_id: 'comparative_expansion_layer.stage3_4b_candidate_pools',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'stage3_4b_reviewer_candidate_pool_instantiated',
      candidate_pool_state:
        reviewerSelectionReadiness.reviewer_selection_state === 'reviewer_selection_package_ready'
          ? 'candidate_pool_instantiated_empty'
          : 'candidate_pool_not_open',
      reviewer_selection_state: 'reviewer_selection_not_started',
      slot_count: count(REVIEWER_CANDIDATE_POOL_TEMPLATE.candidate_slots),
      required_field_count: count(REVIEWER_CANDIDATE_POOL_FIELDS.required_fields),
      boundary_flags: {
        framework_internal_only: true,
        reviewer_selection_not_started: true,
        no_real_identities_instantiated: true
      },
      interpretation_boundary: BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        current_lineage: currentLineage
      },
      schema_ref: 'src/comparative_program/schemas/reviewer_candidate_pool_status.v1.json'
    };

    const adjudicatorCandidatePoolStatus = {
      artifact_role: 'adjudicator_candidate_pool_status',
      artifact_name: 'adjudicator_candidate_pool_status.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      layer_id: 'comparative_expansion_layer.stage3_4b_candidate_pools',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'stage3_4b_adjudicator_candidate_pool_instantiated',
      candidate_pool_state:
        adjudicatorAssignmentReadiness.adjudicator_assignment_state === 'adjudicator_assignment_package_ready'
          ? 'candidate_pool_instantiated_empty'
          : 'candidate_pool_not_open',
      adjudicator_assignment_state: 'adjudicator_assignment_not_started',
      slot_count: count(ADJUDICATOR_CANDIDATE_POOL_TEMPLATE.candidate_slots),
      required_field_count: count(ADJUDICATOR_CANDIDATE_POOL_FIELDS.required_fields),
      boundary_flags: {
        framework_internal_only: true,
        adjudicator_assignment_not_started: true,
        no_real_identities_instantiated: true
      },
      interpretation_boundary: BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        current_lineage: currentLineage
      },
      schema_ref: 'src/comparative_program/schemas/adjudicator_candidate_pool_status.v1.json'
    };

    const reviewerAssignmentStubStatus = {
      artifact_role: 'reviewer_assignment_stub_status',
      artifact_name: 'reviewer_assignment_stub_status.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      layer_id: 'comparative_expansion_layer.stage3_4b_assignment_stubs',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'stage3_4b_reviewer_assignment_stub_instantiated',
      assignment_stub_state:
        REVIEWER_ASSIGNMENT_STUB.stub_state === 'instantiated_empty'
        && REVIEWER_BLINDING_STUB.stub_state === 'instantiated_empty'
          ? 'assignment_stub_instantiated_empty'
          : 'assignment_stub_missing',
      reviewer_selection_state: 'reviewer_selection_not_started',
      blinding_state: REVIEWER_BLINDING_STUB.blinding_state,
      boundary_flags: {
        framework_internal_only: true,
        reviewer_selection_not_started: true,
        no_real_assignment: true
      },
      interpretation_boundary: BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        current_lineage: currentLineage
      },
      schema_ref: 'src/comparative_program/schemas/reviewer_assignment_stub_status.v1.json'
    };

    const adjudicatorAssignmentStubStatus = {
      artifact_role: 'adjudicator_assignment_stub_status',
      artifact_name: 'adjudicator_assignment_stub_status.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      layer_id: 'comparative_expansion_layer.stage3_4b_assignment_stubs',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'stage3_4b_adjudicator_assignment_stub_instantiated',
      assignment_stub_state:
        ADJUDICATOR_ASSIGNMENT_STUB.stub_state === 'instantiated_empty'
          ? 'assignment_stub_instantiated_empty'
          : 'assignment_stub_missing',
      adjudicator_assignment_state: 'adjudicator_assignment_not_started',
      boundary_flags: {
        framework_internal_only: true,
        adjudicator_assignment_not_started: true,
        no_real_assignment: true
      },
      interpretation_boundary: BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        current_lineage: currentLineage
      },
      schema_ref: 'src/comparative_program/schemas/adjudicator_assignment_stub_status.v1.json'
    };

    return {
      reviewerCandidatePoolStatus,
      adjudicatorCandidatePoolStatus,
      reviewerAssignmentStubStatus,
      adjudicatorAssignmentStubStatus
    };
  }
}

export const createCandidatePoolEvaluator = () => new CandidatePoolEvaluator();

export default {
  CandidatePoolEvaluator,
  createCandidatePoolEvaluator
};

import {
  REVIEWER_CANDIDATE_SCHEMA,
  REVIEWER_REJECTION_REASONS
} from './ReviewerCandidateRegistry.js';
import { ADJUDICATOR_CANDIDATE_SCHEMA } from './AdjudicatorCandidateRegistry.js';
import {
  REVIEWER_SELECTION_WORKFLOW,
  BLINDING_ASSIGNMENT_MANIFEST
} from './ReviewerSelectionWorkflowRegistry.js';
import {
  ADJUDICATOR_ASSIGNMENT_WORKFLOW
} from './AdjudicatorAssignmentWorkflowRegistry.js';

const LAYER_VERSION = 'comparative_expansion_layer.stage3_3.reviewer_selection.v1';
const ESTIMATOR_VERSION = 'reviewer_selection_evaluator.stage3_3.v1';

const BOUNDARY =
  'Framework-internal only; Stage3-3 reviewer and adjudicator artifacts record package readiness only. They do not instantiate real people, decisions, or adjudication.';

const count = (items) => (items || []).length;

export class ReviewerSelectionEvaluator {
  evaluate({ stage32ReviewerAssessment, currentLineage }) {
    const reviewerPackageReady =
      stage32ReviewerAssessment?.reviewer_selection_state === 'reviewer_selection_ready'
      && count(REVIEWER_CANDIDATE_SCHEMA.required_fields) > 0
      && count(REVIEWER_SELECTION_WORKFLOW.required_role_classes) > 0;
    const adjudicatorPackageReady =
      stage32ReviewerAssessment?.adjudicator_layer_state === 'adjudicator_criteria_defined'
      && count(ADJUDICATOR_CANDIDATE_SCHEMA.required_fields) > 0
      && count(ADJUDICATOR_ASSIGNMENT_WORKFLOW.assignment_requirements) > 0;

    const reviewerSelectionReadiness = {
      artifact_role: 'reviewer_selection_readiness',
      artifact_name: 'reviewer_selection_readiness.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      layer_id: 'comparative_expansion_layer.stage3_3_reviewer_selection',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'stage3_3_reviewer_selection_package_defined',
      reviewer_selection_state: reviewerPackageReady
        ? 'reviewer_selection_package_ready'
        : 'reviewer_selection_not_open',
      execution_state: 'reviewer_selection_not_started',
      reviewer_role_count: count(REVIEWER_SELECTION_WORKFLOW.required_role_classes),
      candidate_field_count: count(REVIEWER_CANDIDATE_SCHEMA.required_fields),
      rejection_reason_count: count(REVIEWER_REJECTION_REASONS.rejection_reasons),
      boundary_flags: {
        framework_internal_only: true,
        reviewer_selection_not_started: true,
        reviewer_identity_not_instantiated: true,
        external_validation_absent: true
      },
      non_implications: [
        'Reviewer package readiness is not reviewer selection.',
        'Reviewer package readiness is not review execution.'
      ],
      interpretation_boundary: BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        stage3_2_reviewer_state: stage32ReviewerAssessment?.reviewer_selection_state || null,
        current_lineage: currentLineage
      },
      schema_ref: 'src/comparative_program/schemas/reviewer_selection_readiness.v1.json'
    };

    const adjudicatorAssignmentReadiness = {
      artifact_role: 'adjudicator_assignment_readiness',
      artifact_name: 'adjudicator_assignment_readiness.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      layer_id: 'comparative_expansion_layer.stage3_3_adjudicator_assignment',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'stage3_3_adjudicator_assignment_package_defined',
      adjudicator_assignment_state: adjudicatorPackageReady
        ? 'adjudicator_assignment_package_ready'
        : 'adjudicator_assignment_not_open',
      execution_state: 'adjudicator_assignment_not_started',
      candidate_field_count: count(ADJUDICATOR_CANDIDATE_SCHEMA.required_fields),
      assignment_requirement_count: count(ADJUDICATOR_ASSIGNMENT_WORKFLOW.assignment_requirements),
      boundary_flags: {
        framework_internal_only: true,
        adjudicator_assignment_not_started: true,
        adjudicator_identity_not_instantiated: true,
        external_validation_absent: true
      },
      non_implications: [
        'Adjudicator package readiness is not adjudicator assignment.',
        'Adjudicator package readiness is not adjudication.'
      ],
      interpretation_boundary: BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        stage3_2_adjudicator_state: stage32ReviewerAssessment?.adjudicator_layer_state || null,
        current_lineage: currentLineage
      },
      schema_ref: 'src/comparative_program/schemas/adjudicator_assignment_readiness.v1.json'
    };

    const blindingAssignmentReadiness = {
      artifact_role: 'blinding_assignment_readiness',
      artifact_name: 'blinding_assignment_readiness.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      layer_id: 'comparative_expansion_layer.stage3_3_reviewer_selection',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'stage3_3_blinding_assignment_package_defined',
      blinding_assignment_state:
        count(BLINDING_ASSIGNMENT_MANIFEST.required_fields) > 0
          ? 'blinding_assignment_package_ready'
          : 'blinding_assignment_not_open',
      execution_state: 'blinding_assignment_not_started',
      blinding_class_count: count(BLINDING_ASSIGNMENT_MANIFEST.blinding_classes),
      boundary_flags: {
        framework_internal_only: true,
        blinding_assignment_not_started: true,
        unblinding_not_authorized: true
      },
      non_implications: [
        'Blinding package readiness is not blinding assignment execution.',
        'Blinding package readiness is not authorized unblinding.'
      ],
      interpretation_boundary: BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        current_lineage: currentLineage
      },
      schema_ref: 'src/comparative_program/schemas/blinding_assignment_readiness.v1.json'
    };

    return {
      reviewerSelectionReadiness,
      adjudicatorAssignmentReadiness,
      blindingAssignmentReadiness
    };
  }
}

export const createReviewerSelectionEvaluator = () =>
  new ReviewerSelectionEvaluator();

export default {
  ReviewerSelectionEvaluator,
  createReviewerSelectionEvaluator
};

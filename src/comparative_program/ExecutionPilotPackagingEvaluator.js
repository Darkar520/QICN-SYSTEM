import {
  EXECUTION_PILOT_PACKAGE_MANIFEST,
  SOURCE_TARGET_PAIRING_MANIFEST
} from './ExecutionPilotPackageRegistry.js';
import {
  EXECUTION_SESSION_MANIFEST,
  COLLECTION_SESSION_SCHEMA
} from './ExecutionSessionRegistry.js';
import {
  REPRODUCIBILITY_PACKAGE_SKELETON,
  PILOT_NEGATIVE_CONTROL_BUNDLE,
  PILOT_MATCHED_INTERVENTION_BUNDLE
} from './ReproducibilityPackageRegistry.js';

const LAYER_VERSION = 'comparative_expansion_layer.stage3_3.execution_pilot_packaging.v1';
const ESTIMATOR_VERSION = 'execution_pilot_packaging_evaluator.stage3_3.v1';

const BOUNDARY =
  'Framework-internal only; Stage3-3 pilot packaging artifacts record package definition and dry-run readiness only. They do not populate datasets or execute adjudication.';

const count = (items) => (items || []).length;

export class ExecutionPilotPackagingEvaluator {
  evaluate({
    frozenPreregistrationReadiness,
    reviewerSelectionReadiness,
    adjudicatorAssignmentReadiness,
    currentLineage
  }) {
    const packageReady =
      frozenPreregistrationReadiness.freeze_state === 'local_freeze_ready'
      && reviewerSelectionReadiness.reviewer_selection_state === 'reviewer_selection_package_ready'
      && adjudicatorAssignmentReadiness.adjudicator_assignment_state === 'adjudicator_assignment_package_ready'
      && count(EXECUTION_PILOT_PACKAGE_MANIFEST.required_components) > 0;

    const executionPilotPackageAssessment = {
      artifact_role: 'execution_pilot_package_assessment',
      artifact_name: 'execution_pilot_package_assessment.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      layer_id: 'comparative_expansion_layer.stage3_3_execution_pilot_packaging',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'stage3_3_execution_pilot_package_defined',
      package_state: packageReady ? 'pilot_package_ready_but_unexecuted' : 'pilot_package_defined',
      collection_session_state: 'collection_sessions_not_started',
      dataset_population_state: 'dataset_population_absent',
      reproducibility_state: 'reproducibility_skeleton_defined',
      source_target_pairing_state: SOURCE_TARGET_PAIRING_MANIFEST.default_state || 'pairing_not_instantiated',
      required_component_count: count(EXECUTION_PILOT_PACKAGE_MANIFEST.required_components),
      required_log_count: count(EXECUTION_PILOT_PACKAGE_MANIFEST.required_logs),
      session_class_count: count(COLLECTION_SESSION_SCHEMA.session_classes),
      boundary_flags: {
        framework_internal_only: true,
        collection_sessions_not_started: true,
        dataset_population_absent: true,
        pilot_execution_absent: true,
        external_validation_absent: true
      },
      remaining_blockers: [
        'human_dataset_population_absent',
        'negative_control_bundle_unpopulated',
        'matched_intervention_bundle_unpopulated',
        'source_target_pairing_not_instantiated'
      ],
      non_implications: [
        'Pilot package readiness is not evidence.',
        'Pilot package readiness is not adjudication.'
      ],
      interpretation_boundary: BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        current_lineage: currentLineage
      },
      schema_ref: 'src/comparative_program/schemas/execution_pilot_package_assessment.v1.json'
    };

    const reproducibilityPackageSkeletonStatus = {
      artifact_role: 'reproducibility_package_skeleton_status',
      artifact_name: 'reproducibility_package_skeleton_status.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      layer_id: 'comparative_expansion_layer.stage3_3_execution_pilot_packaging',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'stage3_3_reproducibility_skeleton_defined',
      reproducibility_state: 'reproducibility_skeleton_defined',
      population_state: REPRODUCIBILITY_PACKAGE_SKELETON.population_state,
      required_slot_count: count(REPRODUCIBILITY_PACKAGE_SKELETON.required_slots),
      boundary_flags: {
        framework_internal_only: true,
        dataset_population_absent: true,
        reviewer_decision_absent: true,
        adjudicator_decision_absent: true
      },
      non_implications: [
        'A reproducibility skeleton is not a populated reproducibility package.'
      ],
      interpretation_boundary: BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        current_lineage: currentLineage
      },
      schema_ref: 'src/comparative_program/schemas/reproducibility_package_skeleton_status.v1.json'
    };

    const pilotNegativeControlBundleStatus = {
      artifact_role: 'pilot_negative_control_bundle_status',
      artifact_name: 'pilot_negative_control_bundle_status.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      layer_id: 'comparative_expansion_layer.stage3_3_execution_pilot_packaging',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'stage3_3_negative_control_bundle_defined',
      bundle_state: 'pilot_bundle_defined_but_unpopulated',
      bundle_family_count: count(PILOT_NEGATIVE_CONTROL_BUNDLE.bundle_families),
      boundary_flags: {
        framework_internal_only: true,
        dataset_population_absent: true,
        external_validation_absent: true
      },
      non_implications: [
        'A negative-control bundle definition is not a dataset.'
      ],
      interpretation_boundary: BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        current_lineage: currentLineage
      },
      schema_ref: 'src/comparative_program/schemas/pilot_negative_control_bundle_status.v1.json'
    };

    const pilotMatchedInterventionBundleStatus = {
      artifact_role: 'pilot_matched_intervention_bundle_status',
      artifact_name: 'pilot_matched_intervention_bundle_status.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      layer_id: 'comparative_expansion_layer.stage3_3_execution_pilot_packaging',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'stage3_3_matched_intervention_bundle_defined',
      bundle_state: 'pilot_bundle_defined_but_unpopulated',
      bundle_family_count: count(PILOT_MATCHED_INTERVENTION_BUNDLE.bundle_families),
      boundary_flags: {
        framework_internal_only: true,
        dataset_population_absent: true,
        external_validation_absent: true
      },
      non_implications: [
        'A matched-intervention bundle definition is not a dataset.'
      ],
      interpretation_boundary: BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        current_lineage: currentLineage
      },
      schema_ref: 'src/comparative_program/schemas/pilot_matched_intervention_bundle_status.v1.json'
    };

    return {
      executionPilotPackageAssessment,
      reproducibilityPackageSkeletonStatus,
      pilotNegativeControlBundleStatus,
      pilotMatchedInterventionBundleStatus
    };
  }
}

export const createExecutionPilotPackagingEvaluator = () =>
  new ExecutionPilotPackagingEvaluator();

export default {
  ExecutionPilotPackagingEvaluator,
  createExecutionPilotPackagingEvaluator
};

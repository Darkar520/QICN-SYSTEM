import {
  EXECUTION_PILOT_REHEARSAL_KIT,
  REHEARSAL_FAILURE_MODES,
  REHEARSAL_RESET_POLICY
} from './ExecutionPilotRehearsalRegistry.js';
import {
  DRY_RUN_SEQUENCE_PLAN,
  REHEARSAL_EVENT_LOG_SCHEMA
} from './DryRunSequenceRegistry.js';

const LAYER_VERSION = 'comparative_expansion_layer.stage3_5.rehearsal_kit.v1';
const ESTIMATOR_VERSION = 'rehearsal_kit_evaluator.stage3_5.v1';

const BOUNDARY =
  'Framework-internal only; rehearsal-kit outputs are operational readiness artifacts. They remain non-evidential and non-adjudicative.';

const count = (items) => (items || []).length;

export class RehearsalKitEvaluator {
  evaluate({
    executionPilotDryRunStatus,
    instantiatedEmptyRecordAssessment,
    reviewerCandidatePoolStatus,
    adjudicatorCandidatePoolStatus,
    reviewerAssignmentStubStatus,
    adjudicatorAssignmentStubStatus,
    currentLineage
  }) {
    const dryRunSequenceReady =
      executionPilotDryRunStatus.execution_pilot_state === 'execution_pilot_dry_run_open'
      && instantiatedEmptyRecordAssessment.instantiated_empty_layer_state === 'instantiated_empty_layer_defined'
      && reviewerCandidatePoolStatus.candidate_pool_state === 'candidate_pool_instantiated_empty'
      && adjudicatorCandidatePoolStatus.candidate_pool_state === 'candidate_pool_instantiated_empty'
      && reviewerAssignmentStubStatus.assignment_stub_state === 'assignment_stub_instantiated_empty'
      && adjudicatorAssignmentStubStatus.assignment_stub_state === 'assignment_stub_instantiated_empty';

    const executionPilotRehearsalKitStatus = {
      artifact_role: 'execution_pilot_rehearsal_kit_status',
      artifact_name: 'execution_pilot_rehearsal_kit_status.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      layer_id: 'comparative_expansion_layer.stage3_5_rehearsal_kit',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'stage3_5_rehearsal_kit_defined',
      rehearsal_kit_state: count(EXECUTION_PILOT_REHEARSAL_KIT.required_components) > 0
        ? 'rehearsal_kit_defined'
        : 'rehearsal_kit_missing',
      rehearsal_state: 'rehearsal_not_started',
      evidence_state: 'rehearsal_non_evidential',
      adjudication_state: 'rehearsal_non_adjudicative',
      required_component_count: count(EXECUTION_PILOT_REHEARSAL_KIT.required_components),
      failure_mode_count: count(REHEARSAL_FAILURE_MODES.failure_modes),
      reset_rule_count: count(REHEARSAL_RESET_POLICY.reset_rules),
      boundary_flags: {
        framework_internal_only: true,
        rehearsal_non_evidential: true,
        rehearsal_non_adjudicative: true,
        rehearsal_not_started: true
      },
      interpretation_boundary: BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        current_lineage: currentLineage
      },
      schema_ref: 'src/comparative_program/schemas/execution_pilot_rehearsal_kit_status.v1.json'
    };

    const dryRunSequenceReadiness = {
      artifact_role: 'dry_run_sequence_readiness',
      artifact_name: 'dry_run_sequence_readiness.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      layer_id: 'comparative_expansion_layer.stage3_5_rehearsal_kit',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'stage3_5_dry_run_sequence_defined',
      dry_run_sequence_state: dryRunSequenceReady ? 'dry_run_sequence_ready' : 'dry_run_sequence_not_ready',
      rehearsal_state: 'rehearsal_not_started',
      sequence_step_count: count(DRY_RUN_SEQUENCE_PLAN.sequence_steps),
      invalid_condition_count: count(REHEARSAL_FAILURE_MODES.inconclusive_modes),
      boundary_flags: {
        framework_internal_only: true,
        rehearsal_non_evidential: true,
        rehearsal_not_started: true
      },
      interpretation_boundary: BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        current_lineage: currentLineage
      },
      schema_ref: 'src/comparative_program/schemas/dry_run_sequence_readiness.v1.json'
    };

    const rehearsalEventLogStatus = {
      artifact_role: 'rehearsal_event_log_status',
      artifact_name: 'rehearsal_event_log_status.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      layer_id: 'comparative_expansion_layer.stage3_5_rehearsal_kit',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'stage3_5_rehearsal_event_log_schema_defined',
      event_log_state: count(REHEARSAL_EVENT_LOG_SCHEMA.required_fields) > 0
        ? 'event_log_schema_defined'
        : 'event_log_schema_missing',
      rehearsal_state: 'rehearsal_not_started',
      event_class_count: count(REHEARSAL_EVENT_LOG_SCHEMA.event_classes),
      boundary_flags: {
        framework_internal_only: true,
        rehearsal_not_started: true,
        rehearsal_non_evidential: true
      },
      interpretation_boundary: BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        current_lineage: currentLineage
      },
      schema_ref: 'src/comparative_program/schemas/rehearsal_event_log_status.v1.json'
    };

    return {
      executionPilotRehearsalKitStatus,
      dryRunSequenceReadiness,
      rehearsalEventLogStatus
    };
  }
}

export const createRehearsalKitEvaluator = () => new RehearsalKitEvaluator();

export default {
  RehearsalKitEvaluator,
  createRehearsalKitEvaluator
};

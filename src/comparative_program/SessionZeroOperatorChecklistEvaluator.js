import {
  SESSION_ZERO_OPERATOR_CHECKLIST,
  SESSION_ZERO_FAILURE_MODES
} from './ControlledExecutionOpeningRegistry.js';

const LAYER_VERSION = 'comparative_expansion_layer.stage3_6.session_zero_checklist.v1';
const ESTIMATOR_VERSION = 'session_zero_operator_checklist_evaluator.stage3_6.v1';

const BOUNDARY =
  'Framework-internal only; session-zero checklist outputs certify pre-evidential operator readiness only.';

export class SessionZeroOperatorChecklistEvaluator {
  evaluate({ sessionZeroGateResult, liveArtifactInstantiationStatus, currentLineage }) {
    const checklistReady =
      sessionZeroGateResult.session_zero_state === 'session_zero_ready'
      && liveArtifactInstantiationStatus.live_artifact_state === 'live_artifacts_instantiated_unpopulated';

    const sessionZeroOperatorChecklistStatus = {
      artifact_role: 'session_zero_operator_checklist_status',
      artifact_name: 'session_zero_operator_checklist_status.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      layer_id: 'comparative_expansion_layer.stage3_6_session_zero_gate',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'stage3_6_session_zero_operator_checklist_defined',
      operator_checklist_state: checklistReady ? 'operator_checklist_ready' : 'operator_checklist_incomplete',
      session_zero_state: sessionZeroGateResult.session_zero_state,
      collection_state: 'collection_not_started',
      evidence_state: 'evidence_generation_absent',
      adjudication_state: 'adjudication_not_open',
      checklist_item_count: (SESSION_ZERO_OPERATOR_CHECKLIST.checklist_items || []).length,
      boundary_flags: {
        framework_internal_only: true,
        collection_not_started: true,
        evidence_generation_absent: true,
        adjudication_not_open: true
      },
      interpretation_boundary: BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        current_lineage: currentLineage
      },
      schema_ref: 'src/comparative_program/schemas/session_zero_operator_checklist_status.v1.json'
    };

    const sessionZeroFailureModeAssessment = {
      artifact_role: 'session_zero_failure_mode_assessment',
      artifact_name: 'session_zero_failure_mode_assessment.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      layer_id: 'comparative_expansion_layer.stage3_6_session_zero_gate',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'stage3_6_session_zero_failure_modes_defined',
      failure_mode_state: 'session_zero_failure_modes_defined',
      abort_state: 'session_zero_abort_modes_defined',
      invalidation_state: 'session_zero_invalidation_modes_defined',
      failure_mode_count: (SESSION_ZERO_FAILURE_MODES.failure_modes || []).length,
      abort_mode_count: (SESSION_ZERO_FAILURE_MODES.abort_modes || []).length,
      invalidation_mode_count: (SESSION_ZERO_FAILURE_MODES.invalidation_modes || []).length,
      boundary_flags: {
        framework_internal_only: true,
        evidence_generation_absent: true,
        adjudication_not_open: true
      },
      interpretation_boundary: BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        current_lineage: currentLineage
      },
      schema_ref: 'src/comparative_program/schemas/session_zero_failure_mode_assessment.v1.json'
    };

    return {
      sessionZeroOperatorChecklistStatus,
      sessionZeroFailureModeAssessment
    };
  }
}

export const createSessionZeroOperatorChecklistEvaluator = () =>
  new SessionZeroOperatorChecklistEvaluator();

export default {
  SessionZeroOperatorChecklistEvaluator,
  createSessionZeroOperatorChecklistEvaluator
};

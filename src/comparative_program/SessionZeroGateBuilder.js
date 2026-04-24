import {
  SESSION_ZERO_GATE_CRITERIA
} from './ControlledExecutionOpeningRegistry.js';

const LAYER_VERSION = 'comparative_expansion_layer.stage3_6.session_zero_gate.v1';
const ESTIMATOR_VERSION = 'session_zero_gate_builder.stage3_6.v1';

const BOUNDARY =
  'Framework-internal only; session-zero outputs certify non-evidential readiness only. They do not start collection or open adjudication.';

export class SessionZeroGateBuilder {
  build({
    sessionZeroManifest,
    liveArtifactInstantiationStatus,
    frozenPreregistrationReadiness,
    reviewerCandidatePoolStatus,
    adjudicatorCandidatePoolStatus,
    reviewerAssignmentStubStatus,
    adjudicatorAssignmentStubStatus,
    executionPilotRehearsalKitStatus,
    dryRunSequenceReadiness,
    currentLineage
  }) {
    const ready = frozenPreregistrationReadiness.freeze_state === 'local_freeze_ready'
      && reviewerCandidatePoolStatus.candidate_pool_state === 'candidate_pool_instantiated_empty'
      && adjudicatorCandidatePoolStatus.candidate_pool_state === 'candidate_pool_instantiated_empty'
      && reviewerAssignmentStubStatus.assignment_stub_state === 'assignment_stub_instantiated_empty'
      && adjudicatorAssignmentStubStatus.assignment_stub_state === 'assignment_stub_instantiated_empty'
      && executionPilotRehearsalKitStatus.rehearsal_kit_state === 'rehearsal_kit_defined'
      && dryRunSequenceReadiness.dry_run_sequence_state === 'dry_run_sequence_ready'
      && liveArtifactInstantiationStatus.live_artifact_state === 'live_artifacts_instantiated_unpopulated';

    const remainingBlockers = ready
      ? []
      : ['session_zero_structural_readiness_incomplete'];

    const updatedSessionZeroManifest = {
      ...sessionZeroManifest,
      implementation_status: 'stage3_6_session_zero_manifest_instantiated',
      session_zero_readiness_state: ready ? 'session_zero_ready' : 'session_zero_not_ready',
      session_zero_lifecycle_state: 'session_zero_not_started'
    };

    const sessionZeroGateResult = {
      artifact_role: 'session_zero_gate_result',
      artifact_name: 'session_zero_gate_result.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      layer_id: 'comparative_expansion_layer.stage3_6_session_zero_gate',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'stage3_6_session_zero_gate_defined',
      session_zero_state: ready ? 'session_zero_ready' : 'session_zero_not_ready',
      session_zero_lifecycle_state: 'session_zero_not_started',
      evidence_state: 'session_zero_non_evidential',
      adjudication_state: 'session_zero_non_adjudicative',
      external_filing_state: frozenPreregistrationReadiness.external_filing_state,
      ready_requirement_count: (SESSION_ZERO_GATE_CRITERIA.ready_requirements || []).length,
      remaining_blockers: remainingBlockers,
      boundary_flags: {
        framework_internal_only: true,
        session_zero_not_started: true,
        session_zero_non_evidential: true,
        session_zero_non_adjudicative: true
      },
      non_implications: [
        'Not a collection-start event.',
        'Not evidence.',
        'Not adjudication.'
      ],
      interpretation_boundary: BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        current_lineage: currentLineage
      },
      schema_ref: 'src/comparative_program/schemas/session_zero_gate_result.v1.json'
    };

    return {
      sessionZeroManifest: updatedSessionZeroManifest,
      sessionZeroGateResult
    };
  }
}

export const createSessionZeroGateBuilder = () => new SessionZeroGateBuilder();

export default {
  SessionZeroGateBuilder,
  createSessionZeroGateBuilder
};

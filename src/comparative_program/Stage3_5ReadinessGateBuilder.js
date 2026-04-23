import fs from 'fs';

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

const STAGE3_5_REHEARSAL_READY_CRITERIA = Object.freeze(
  readJson('../../docs/stage3_5_rehearsal_ready_criteria.v1.json')
);

const LAYER_VERSION = 'comparative_expansion_layer.stage3_5.rehearsal_ready_gate.v1';
const ESTIMATOR_VERSION = 'stage3_5_readiness_gate_builder.v1';

const BOUNDARY =
  'Framework-internal only; Stage3-5 readiness records instantiated-empty and rehearsal readiness only. It does not authorize evidence or adjudication.';

export class Stage3_5ReadinessGateBuilder {
  build({
    provenanceClosureAssessment,
    instantiatedEmptyRecordAssessment,
    reviewerCandidatePoolStatus,
    adjudicatorCandidatePoolStatus,
    reviewerAssignmentStubStatus,
    adjudicatorAssignmentStubStatus,
    executionPilotRehearsalKitStatus,
    dryRunSequenceReadiness,
    executionPilotDryRunStatus,
    currentLineage
  }) {
    const instantiatedEmptyReady =
      ['exact_head_aligned', 'stale_and_regenerated'].includes(
        provenanceClosureAssessment.preexisting_alignment_state
      )
      && instantiatedEmptyRecordAssessment.instantiated_empty_layer_state === 'instantiated_empty_layer_defined'
      && reviewerCandidatePoolStatus.candidate_pool_state === 'candidate_pool_instantiated_empty'
      && adjudicatorCandidatePoolStatus.candidate_pool_state === 'candidate_pool_instantiated_empty'
      && reviewerAssignmentStubStatus.assignment_stub_state === 'assignment_stub_instantiated_empty'
      && adjudicatorAssignmentStubStatus.assignment_stub_state === 'assignment_stub_instantiated_empty';

    const rehearsalReady =
      instantiatedEmptyReady
      && executionPilotRehearsalKitStatus.rehearsal_kit_state === 'rehearsal_kit_defined'
      && dryRunSequenceReadiness.dry_run_sequence_state === 'dry_run_sequence_ready'
      && executionPilotDryRunStatus.execution_pilot_state === 'execution_pilot_dry_run_open';

    const gateState = rehearsalReady
      ? 'stage3_5_rehearsal_ready'
      : instantiatedEmptyReady
        ? 'stage3_5_instantiated_empty_ready'
        : 'stage3_5_not_ready';

    const stage3_5_rehearsal_ready_gate = {
      artifact_role: 'stage3_5_rehearsal_ready_gate',
      artifact_name: 'stage3_5_rehearsal_ready_gate.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      layer_id: 'comparative_expansion_layer.stage3_5_rehearsal_ready_gate',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'stage3_5_readiness_gate_defined',
      stage3_5_state: gateState,
      non_evidential_state: 'stage3_5_non_evidential',
      adjudication_state: 'stage3_5_not_adjudicative',
      ready_requirements: STAGE3_5_REHEARSAL_READY_CRITERIA.ready_requirements || [],
      blocked_requirements_for_real_execution:
        STAGE3_5_REHEARSAL_READY_CRITERIA.blocked_requirements_for_real_execution || [],
      boundary_flags: {
        framework_internal_only: true,
        stage3_5_non_evidential: true,
        stage3_5_not_adjudicative: true
      },
      interpretation_boundary: BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        current_lineage: currentLineage
      },
      schema_ref: 'src/comparative_program/schemas/stage3_5_rehearsal_ready_gate.v1.json'
    };

    const stage3_5_manifest = {
      artifact_role: 'stage3_5_manifest',
      artifact_name: 'stage3_5_manifest.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      layer_id: 'comparative_expansion_layer.stage3_5_rehearsal_ready_gate',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'stage3_5_manifest_defined',
      stage3_5_state: gateState,
      provenance_state: provenanceClosureAssessment.committed_alignment_state,
      instantiated_empty_state: instantiatedEmptyRecordAssessment.instantiated_empty_layer_state,
      rehearsal_kit_state: executionPilotRehearsalKitStatus.rehearsal_kit_state,
      dry_run_state: executionPilotDryRunStatus.execution_pilot_state,
      non_evidential_state: 'stage3_5_non_evidential',
      adjudication_state: 'stage3_5_not_adjudicative',
      boundary_flags: {
        framework_internal_only: true,
        stage3_5_non_evidential: true,
        stage3_5_not_adjudicative: true,
        paper10_final_authorized: false
      },
      interpretation_boundary: BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        current_lineage: currentLineage
      },
      schema_ref: 'src/comparative_program/schemas/stage3_5_manifest.v1.json'
    };

    return {
      stage3_5_rehearsal_ready_gate,
      stage3_5_manifest
    };
  }
}

export const createStage3_5ReadinessGateBuilder = () => new Stage3_5ReadinessGateBuilder();

export default {
  Stage3_5ReadinessGateBuilder,
  createStage3_5ReadinessGateBuilder
};

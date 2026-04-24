import {
  STAGE3_6B_RUNTIME_REPRODUCIBILITY_GATE_POLICY
} from './RuntimeHealthAuditRegistry.js';

const LAYER_VERSION = 'comparative_expansion_layer.stage3_6b_runtime_reproducibility_gate.v1';
const ESTIMATOR_VERSION = 'stage3_6b_runtime_reproducibility_gate_builder.v1';

const PASSING_RUNTIME_STATES = new Set([
  'runtime_health_pass',
  'runtime_health_pass_with_warnings'
]);
const PASSING_CLEAN_ROOM_STATES = new Set([
  'clean_room_reproducible',
  'clean_room_reproducible_with_warnings'
]);
const PASSING_PATH_STATES = new Set([
  'path_leakage_clear',
  'path_leakage_clear_with_historical_examples'
]);
const PASSING_ARTIFACT_STATES = new Set([
  'artifacts_current',
  'artifacts_regenerated_without_semantic_drift',
  'artifacts_regenerated_with_expected_provenance_drift',
  'artifacts_stale_and_fixed'
]);

export class Stage3_6BRuntimeReproducibilityGateBuilder {
  build({
    runtimeHealthAudit,
    cleanRoomAudit,
    pathLeakageAudit,
    artifactRegenerationAudit,
    paper10Status,
    stage3_7_opening_gate,
    currentLineage
  }) {
    const runtimePass = PASSING_RUNTIME_STATES.has(runtimeHealthAudit.runtime_health_state);
    const cleanRoomPass = PASSING_CLEAN_ROOM_STATES.has(cleanRoomAudit.clean_room_state);
    const pathPass = PASSING_PATH_STATES.has(pathLeakageAudit.path_leakage_state);
    const artifactPass = PASSING_ARTIFACT_STATES.has(
      artifactRegenerationAudit.artifact_regeneration_state
    );
    const paper10Pass =
      paper10Status.paper10_state === 'paper10_protocol_grade_backbone'
      && paper10Status.paper10_authorization_state === 'paper10_not_final_authorized';

    const blocking_findings = [];
    if (!runtimePass) blocking_findings.push('runtime_health_not_passing');
    if (!cleanRoomPass) blocking_findings.push('clean_room_not_passing');
    if (!pathPass) blocking_findings.push('path_leakage_not_cleared');
    if (!artifactPass) blocking_findings.push('artifact_regeneration_blocking');
    if (!paper10Pass) blocking_findings.push('paper10_not_in_non_result_bearing_protocol_state');

    const hasWarnings =
      runtimeHealthAudit.runtime_health_state === 'runtime_health_pass_with_warnings'
      || cleanRoomAudit.clean_room_state === 'clean_room_reproducible_with_warnings'
      || (runtimeHealthAudit.warnings || []).length > 0
      || (cleanRoomAudit.warnings || []).length > 0;

    const stage3_6b_state = blocking_findings.length > 0
      ? 'stage3_6b_runtime_blocked'
      : hasWarnings
        ? 'stage3_6b_runtime_ready_with_warnings'
        : 'stage3_6b_runtime_ready';

    return {
      artifact_role: 'stage3_6b_runtime_reproducibility_gate',
      artifact_name: 'stage3_6b_runtime_reproducibility_gate.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      layer_id: 'comparative_expansion_layer.stage3_6b_runtime_reproducibility_gate',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'stage3_6b_runtime_reproducibility_gate_defined',
      stage3_6b_state,
      runtime_health_state: runtimeHealthAudit.runtime_health_state,
      clean_room_state: cleanRoomAudit.clean_room_state,
      path_leakage_state: pathLeakageAudit.path_leakage_state,
      artifact_regeneration_state: artifactRegenerationAudit.artifact_regeneration_state,
      paper10_state: paper10Status.paper10_state,
      paper10_authorization_state: paper10Status.paper10_authorization_state,
      stage3_7_follow_on_state:
        stage3_7_opening_gate.stage3_7_state === 'stage3_7_first_collection_openable'
          ? 'stage3_7_openable_after_runtime_audit'
          : 'stage3_7_blocked_after_runtime_audit',
      warning_count:
        (runtimeHealthAudit.warnings || []).length + (cleanRoomAudit.warnings || []).length,
      blocking_findings,
      boundary_flags: {
        framework_internal_only: true,
        evidence_generation_absent: true,
        adjudication_not_open: true,
        paper10_not_final_authorized: true
      },
      non_implications: [
        ...(STAGE3_6B_RUNTIME_REPRODUCIBILITY_GATE_POLICY.non_implications || [])
      ],
      provenance: {
        generated_at: new Date().toISOString(),
        current_lineage: currentLineage
      },
      schema_ref:
        'src/comparative_program/schemas/stage3_6b_runtime_reproducibility_gate.v1.json'
    };
  }
}

export const createStage3_6BRuntimeReproducibilityGateBuilder = () =>
  new Stage3_6BRuntimeReproducibilityGateBuilder();

export default {
  Stage3_6BRuntimeReproducibilityGateBuilder,
  createStage3_6BRuntimeReproducibilityGateBuilder
};

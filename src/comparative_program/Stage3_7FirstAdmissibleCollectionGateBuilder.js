import {
  STAGE3_7_FIRST_ADMISSIBLE_COLLECTION_OPENING_CRITERIA,
  FIRST_ADMISSIBLE_COLLECTION_START_POLICY,
  COLLECTION_START_COMMAND_SCHEMA,
  OPERATOR_AUTHORIZATION_SCHEMA
} from './FirstCollectionOpeningCriteriaRegistry.js';

const LAYER_VERSION = 'comparative_expansion_layer.stage3_7_first_admissible_collection_opening.v1';
const ESTIMATOR_VERSION = 'stage3_7_first_admissible_collection_gate_builder.v1';

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

export class Stage3_7FirstAdmissibleCollectionGateBuilder {
  build({
    runtimeHealthAudit,
    cleanRoomAudit,
    pathLeakageAudit,
    artifactRegenerationAudit,
    stage3_6_manifest,
    stage3_6_controlled_execution_gate,
    paper10Status,
    currentLineage
  }) {
    const runtimePass = PASSING_RUNTIME_STATES.has(runtimeHealthAudit.runtime_health_state);
    const cleanRoomPass = PASSING_CLEAN_ROOM_STATES.has(cleanRoomAudit.clean_room_state);
    const pathPass = PASSING_PATH_STATES.has(pathLeakageAudit.path_leakage_state);
    const artifactPass = PASSING_ARTIFACT_STATES.has(
      artifactRegenerationAudit.artifact_regeneration_state
    );
    const stage36Open =
      stage3_6_controlled_execution_gate.openability_state === 'stage3_6_controlled_execution_openable'
      && stage3_6_manifest.stage3_6_state === 'stage3_6_collection_open_pre_evidential';
    const paper10Ready =
      paper10Status.paper10_state === 'paper10_protocol_grade_backbone'
      && paper10Status.paper10_authorization_state === 'paper10_not_final_authorized';

    const blocking_findings = [];
    if (!runtimePass) blocking_findings.push('runtime_health_not_passing');
    if (!cleanRoomPass) blocking_findings.push('clean_room_not_passing');
    if (!pathPass) blocking_findings.push('live_normative_path_leak_present');
    if (!artifactPass) blocking_findings.push('artifact_regeneration_blocking');
    if (!stage36Open) blocking_findings.push('stage3_6_not_openable');
    if (!paper10Ready) blocking_findings.push('paper10_not_in_protocol_backbone_state');

    let stage3_7_state = 'stage3_7_not_open';
    if (!runtimePass) {
      stage3_7_state = 'stage3_7_opening_blocked_by_runtime_health';
    } else if (!cleanRoomPass) {
      stage3_7_state = 'stage3_7_opening_blocked_by_clean_room';
    } else if (blocking_findings.length === 0) {
      stage3_7_state = 'stage3_7_first_collection_openable';
    }

    const boundary_flags = {
      framework_internal_only: true,
      collection_start_not_executed: true,
      evidence_generation_absent: true,
      adjudication_not_open: true,
      decision_record_absent: true,
      paper10_not_final_authorized: true
    };

    const stage3_7_opening_gate = {
      artifact_role: 'stage3_7_opening_gate',
      artifact_name: 'stage3_7_opening_gate.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      layer_id: 'comparative_expansion_layer.stage3_7_first_admissible_collection_opening',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'stage3_7_opening_gate_defined',
      stage3_7_state,
      collection_state: 'collection_start_not_executed',
      evidence_state: 'evidence_generation_absent',
      adjudication_state: 'adjudication_not_open',
      decision_record_state: 'decision_record_absent',
      ready_requirement_count:
        (STAGE3_7_FIRST_ADMISSIBLE_COLLECTION_OPENING_CRITERIA.opening_requirements || []).length,
      blocking_findings,
      boundary_flags,
      non_implications: [
        ...(STAGE3_7_FIRST_ADMISSIBLE_COLLECTION_OPENING_CRITERIA.non_implications || [])
      ],
      provenance: {
        generated_at: new Date().toISOString(),
        current_lineage: currentLineage
      },
      schema_ref: 'src/comparative_program/schemas/stage3_7_opening_gate.v1.json'
    };

    const first_collection_opening_manifest = {
      artifact_role: 'first_collection_opening_manifest',
      artifact_name: 'first_collection_opening_manifest.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      layer_id: 'comparative_expansion_layer.stage3_7_first_admissible_collection_opening',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'first_collection_opening_manifest_defined',
      stage3_7_state,
      runtime_health_state: runtimeHealthAudit.runtime_health_state,
      clean_room_state: cleanRoomAudit.clean_room_state,
      collection_state: 'collection_start_not_executed',
      evidence_state: 'evidence_generation_absent',
      adjudication_state: 'adjudication_not_open',
      decision_record_state: 'decision_record_absent',
      operator_authorization_field_count:
        (OPERATOR_AUTHORIZATION_SCHEMA.required_fields || []).length,
      collection_start_command_field_count:
        (COLLECTION_START_COMMAND_SCHEMA.required_fields || []).length,
      start_prerequisite_count:
        (FIRST_ADMISSIBLE_COLLECTION_START_POLICY.start_prerequisites || []).length,
      blocking_findings,
      boundary_flags,
      provenance: {
        generated_at: new Date().toISOString(),
        current_lineage: currentLineage
      },
      schema_ref:
        'src/comparative_program/schemas/first_collection_opening_manifest.v1.json'
    };

    return {
      stage3_7_opening_gate,
      first_collection_opening_manifest
    };
  }
}

export const createStage3_7FirstAdmissibleCollectionGateBuilder = () =>
  new Stage3_7FirstAdmissibleCollectionGateBuilder();

export default {
  Stage3_7FirstAdmissibleCollectionGateBuilder,
  createStage3_7FirstAdmissibleCollectionGateBuilder
};

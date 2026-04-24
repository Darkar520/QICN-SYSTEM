import {
  STAGE3_6_CONTROLLED_EXECUTION_OPENING_CRITERIA
} from './ControlledExecutionOpeningRegistry.js';

const LAYER_VERSION = 'comparative_expansion_layer.stage3_6.controlled_execution_gate.v1';
const ESTIMATOR_VERSION = 'stage3_6_controlled_execution_gate_builder.v1';

const BOUNDARY =
  'Framework-internal only; Stage3-6 may open a controlled pre-evidential execution surface. It remains non-adjudicative and non-result-bearing.';

export class Stage3_6ControlledExecutionGateBuilder {
  build({
    liveArtifactInstantiationStatus,
    sessionZeroManifest,
    sessionZeroGateResult,
    preCollectionAdmissibilityGateResult,
    currentLineage
  }) {
    const openable =
      liveArtifactInstantiationStatus.live_artifact_state === 'live_artifacts_instantiated_unpopulated'
      && sessionZeroManifest.session_zero_readiness_state === 'session_zero_ready'
      && sessionZeroGateResult.session_zero_state === 'session_zero_ready'
      && preCollectionAdmissibilityGateResult.pre_collection_state === 'collection_openable_under_controls';

    const stageState = openable
      ? 'stage3_6_collection_open_pre_evidential'
      : 'stage3_6_not_ready';

    const stage3_6_controlled_execution_gate = {
      artifact_role: 'stage3_6_controlled_execution_gate',
      artifact_name: 'stage3_6_controlled_execution_gate.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      layer_id: 'comparative_expansion_layer.stage3_6_controlled_execution_gate',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'stage3_6_controlled_execution_gate_defined',
      stage3_6_state: stageState,
      openability_state: openable ? 'stage3_6_controlled_execution_openable' : 'stage3_6_not_ready',
      collection_state: 'collection_not_started',
      evidence_state: 'evidence_generation_absent',
      adjudication_state: 'stage3_6_non_adjudicative',
      result_state: 'stage3_6_non_result_bearing',
      ready_requirement_count: (STAGE3_6_CONTROLLED_EXECUTION_OPENING_CRITERIA.opening_requirements || []).length,
      boundary_flags: {
        framework_internal_only: true,
        collection_not_started: true,
        evidence_generation_absent: true,
        stage3_6_non_adjudicative: true,
        stage3_6_non_result_bearing: true
      },
      interpretation_boundary: BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        current_lineage: currentLineage
      },
      schema_ref: 'src/comparative_program/schemas/stage3_6_controlled_execution_gate.v1.json'
    };

    const stage3_6_manifest = {
      artifact_role: 'stage3_6_manifest',
      artifact_name: 'stage3_6_manifest.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      layer_id: 'comparative_expansion_layer.stage3_6_controlled_execution_gate',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'stage3_6_manifest_defined',
      stage3_6_state: stageState,
      live_artifact_state: liveArtifactInstantiationStatus.live_artifact_state,
      session_zero_state: sessionZeroGateResult.session_zero_state,
      pre_collection_state: preCollectionAdmissibilityGateResult.pre_collection_state,
      collection_state: 'collection_not_started',
      evidence_state: 'evidence_generation_absent',
      adjudication_state: 'stage3_6_non_adjudicative',
      result_state: 'stage3_6_non_result_bearing',
      boundary_flags: {
        framework_internal_only: true,
        collection_not_started: true,
        evidence_generation_absent: true,
        stage3_6_non_adjudicative: true,
        stage3_6_non_result_bearing: true,
        paper10_final_authorized: false
      },
      interpretation_boundary: BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        current_lineage: currentLineage
      },
      schema_ref: 'src/comparative_program/schemas/stage3_6_manifest.v1.json'
    };

    return {
      stage3_6_controlled_execution_gate,
      stage3_6_manifest
    };
  }
}

export const createStage3_6ControlledExecutionGateBuilder = () =>
  new Stage3_6ControlledExecutionGateBuilder();

export default {
  Stage3_6ControlledExecutionGateBuilder,
  createStage3_6ControlledExecutionGateBuilder
};

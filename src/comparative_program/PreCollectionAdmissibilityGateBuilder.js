import {
  PRE_COLLECTION_GATE_CRITERIA,
  PRE_COLLECTION_INVALIDATION_POLICY
} from './ControlledExecutionOpeningRegistry.js';

const LAYER_VERSION = 'comparative_expansion_layer.stage3_6.pre_collection_gate.v1';
const ESTIMATOR_VERSION = 'pre_collection_admissibility_gate_builder.stage3_6.v1';

const BOUNDARY =
  'Framework-internal only; pre-collection outputs may authorize a controlled openable state without starting collection or generating evidence.';

export class PreCollectionAdmissibilityGateBuilder {
  build({
    sessionZeroGateResult,
    sessionZeroOperatorChecklistStatus,
    contaminationChecklistStatus,
    liveArtifactInstantiationStatus,
    currentLineage
  }) {
    const openable =
      sessionZeroGateResult.session_zero_state === 'session_zero_ready'
      && sessionZeroOperatorChecklistStatus.operator_checklist_state === 'operator_checklist_ready'
      && contaminationChecklistStatus.contamination_state === 'contamination_not_detected'
      && liveArtifactInstantiationStatus.live_artifact_state === 'live_artifacts_instantiated_unpopulated'
      && liveArtifactInstantiationStatus.collection_state === 'collection_not_started'
      && liveArtifactInstantiationStatus.evidence_state === 'evidence_generation_absent';

    const remainingBlockers = openable
      ? []
      : ['pre_collection_opening_requirements_incomplete'];

    const preCollectionAdmissibilityGateResult = {
      artifact_role: 'pre_collection_admissibility_gate_result',
      artifact_name: 'pre_collection_admissibility_gate_result.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      layer_id: 'comparative_expansion_layer.stage3_6_pre_collection_gate',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'stage3_6_pre_collection_gate_defined',
      pre_collection_state: openable ? 'collection_openable_under_controls' : 'execution_opening_not_ready',
      collection_state: 'collection_not_started',
      evidence_state: 'evidence_generation_absent',
      contamination_state: contaminationChecklistStatus.contamination_state,
      adjudication_state: 'adjudication_not_open',
      ready_requirement_count: (PRE_COLLECTION_GATE_CRITERIA.ready_requirements || []).length,
      remaining_blockers: remainingBlockers,
      boundary_flags: {
        framework_internal_only: true,
        collection_not_started: true,
        evidence_generation_absent: true,
        adjudication_not_open: true
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
      schema_ref: 'src/comparative_program/schemas/pre_collection_admissibility_gate_result.v1.json'
    };

    const preCollectionInvalidationStatus = {
      artifact_role: 'pre_collection_invalidation_status',
      artifact_name: 'pre_collection_invalidation_status.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      layer_id: 'comparative_expansion_layer.stage3_6_pre_collection_gate',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'stage3_6_pre_collection_invalidation_policy_defined',
      invalidation_state: contaminationChecklistStatus.contamination_state === 'contamination_not_detected'
        ? 'no_invalidation_detected'
        : 'pre_collection_invalidated',
      collection_state: 'collection_not_started',
      evidence_state: 'evidence_generation_absent',
      invalidation_condition_count: (PRE_COLLECTION_INVALIDATION_POLICY.invalidation_conditions || []).length,
      boundary_flags: {
        framework_internal_only: true,
        collection_not_started: true,
        evidence_generation_absent: true
      },
      interpretation_boundary: BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        current_lineage: currentLineage
      },
      schema_ref: 'src/comparative_program/schemas/pre_collection_invalidation_status.v1.json'
    };

    return {
      preCollectionAdmissibilityGateResult,
      preCollectionInvalidationStatus
    };
  }
}

export const createPreCollectionAdmissibilityGateBuilder = () =>
  new PreCollectionAdmissibilityGateBuilder();

export default {
  PreCollectionAdmissibilityGateBuilder,
  createPreCollectionAdmissibilityGateBuilder
};

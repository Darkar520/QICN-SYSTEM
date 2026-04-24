import {
  PRE_COLLECTION_CONTAMINATION_CHECKLIST
} from './ControlledExecutionOpeningRegistry.js';

const LAYER_VERSION = 'comparative_expansion_layer.stage3_6.pre_collection_gate.v1';
const ESTIMATOR_VERSION = 'contamination_checklist_evaluator.stage3_6.v1';

const BOUNDARY =
  'Framework-internal only; contamination checklist outputs certify absence of detected contamination at pre-collection time only.';

export class ContaminationChecklistEvaluator {
  evaluate({ liveArtifactInstantiationStatus, currentLineage }) {
    const contaminationDetected =
      liveArtifactInstantiationStatus.collection_state !== 'collection_not_started'
      || liveArtifactInstantiationStatus.evidence_state !== 'evidence_generation_absent';

    return {
      contaminationChecklistStatus: {
        artifact_role: 'contamination_checklist_status',
        artifact_name: 'contamination_checklist_status.json',
        artifact_version: '1.0.0',
        schema_version: '1.0.0',
        layer_id: 'comparative_expansion_layer.stage3_6_pre_collection_gate',
        layer_version: LAYER_VERSION,
        estimator_version: ESTIMATOR_VERSION,
        implementation_status: 'stage3_6_contamination_checklist_defined',
        contamination_state: contaminationDetected ? 'contamination_detected' : 'contamination_not_detected',
        collection_state: 'collection_not_started',
        evidence_state: 'evidence_generation_absent',
        checklist_item_count: (PRE_COLLECTION_CONTAMINATION_CHECKLIST.checklist_items || []).length,
        detected_events: contaminationDetected ? ['unexpected_live_artifact_population_state'] : [],
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
        schema_ref: 'src/comparative_program/schemas/contamination_checklist_status.v1.json'
      }
    };
  }
}

export const createContaminationChecklistEvaluator = () =>
  new ContaminationChecklistEvaluator();

export default {
  ContaminationChecklistEvaluator,
  createContaminationChecklistEvaluator
};

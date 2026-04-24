import {
  LIVE_BUT_UNPOPULATED_ARTIFACT_POLICY,
  listLiveArtifactRoles
} from './LiveArtifactRegistry.js';

const LAYER_VERSION = 'comparative_expansion_layer.stage3_6.live_artifact_instantiation.v1';
const ESTIMATOR_VERSION = 'live_artifact_instantiation_evaluator.stage3_6.v1';

const BOUNDARY =
  'Framework-internal only; live-but-unpopulated artifacts are execution-facing shells only. They remain non-evidential and non-adjudicative until a later authorized collection-start event occurs.';

const baseEnvelope = (artifact_role, artifact_name, currentLineage, schema_ref, implementation_status) => ({
  artifact_role,
  artifact_name,
  artifact_version: '1.0.0',
  schema_version: '1.0.0',
  layer_id: 'comparative_expansion_layer.stage3_6_controlled_execution_opening',
  layer_version: LAYER_VERSION,
  estimator_version: ESTIMATOR_VERSION,
  implementation_status,
  interpretation_boundary: BOUNDARY,
  provenance: {
    generated_at: new Date().toISOString(),
    current_lineage: currentLineage
  },
  schema_ref
});

const datasetManifest = ({ artifactRole, artifactName, dataset_family, currentLineage }) => ({
  ...baseEnvelope(
    artifactRole,
    artifactName,
    currentLineage,
    'src/comparative_program/schemas/live_dataset_manifest.v1.json',
    'stage3_6_live_dataset_manifest_created'
  ),
  live_artifact_state: 'live_artifact_instantiated_unpopulated',
  dataset_family,
  dataset_state: 'live_but_unpopulated',
  empty_dataset: true,
  population_event_count: 0,
  collection_state: 'collection_not_started',
  evidence_state: 'evidence_generation_absent',
  adjudication_state: 'adjudication_not_open',
  boundary_flags: {
    framework_internal_only: true,
    empty_dataset: true,
    collection_not_started: true,
    evidence_generation_absent: true,
    adjudication_not_open: true
  },
  non_implications: [
    'Not a populated dataset.',
    'Not evidence.'
  ]
});

export class LiveArtifactInstantiationEvaluator {
  evaluate({
    stage3_5_rehearsal_ready_gate,
    stage3_5_manifest,
    instantiatedEmptyRecordAssessment,
    currentLineage
  }) {
    const readyForLiveInstantiation =
      stage3_5_rehearsal_ready_gate.stage3_5_state === 'stage3_5_rehearsal_ready'
      && stage3_5_manifest.stage3_5_state === 'stage3_5_rehearsal_ready'
      && instantiatedEmptyRecordAssessment.instantiated_empty_layer_state === 'instantiated_empty_layer_defined';

    const executionOpeningState = readyForLiveInstantiation
      ? 'execution_opening_policy_defined'
      : 'execution_opening_not_ready';

    const sessionZeroManifest = {
      ...baseEnvelope(
        'session_zero_manifest',
        'session_zero_manifest.json',
        currentLineage,
        'src/comparative_program/schemas/session_zero_manifest.v1.json',
        'stage3_6_session_zero_manifest_created'
      ),
      session_zero_readiness_state: readyForLiveInstantiation ? 'session_zero_ready' : 'session_zero_not_ready',
      session_zero_lifecycle_state: 'session_zero_not_started',
      collection_state: 'collection_not_started',
      evidence_state: 'evidence_generation_absent',
      adjudication_state: 'adjudication_not_open',
      external_filing_state: 'not_externally_filed',
      boundary_flags: {
        framework_internal_only: true,
        session_zero_not_started: true,
        evidence_generation_absent: true,
        adjudication_not_open: true
      },
      non_implications: [
        'Not a collection-start event.',
        'Not evidence.'
      ]
    };

    const liveCollectionManifest = {
      ...baseEnvelope(
        'live_collection_manifest',
        'live_collection_manifest.json',
        currentLineage,
        'src/comparative_program/schemas/live_collection_manifest.v1.json',
        'stage3_6_live_collection_manifest_created'
      ),
      live_artifact_state: readyForLiveInstantiation
        ? 'live_artifacts_instantiated_unpopulated'
        : 'live_artifacts_not_ready',
      execution_opening_state: executionOpeningState,
      collection_state: 'collection_not_started',
      evidence_state: 'evidence_generation_absent',
      adjudication_state: 'adjudication_not_open',
      live_collection_log_ref: 'artifacts/external_adjudication/stage3_6/live_collection_log.ndjson',
      dataset_manifest_refs: [
        'artifacts/external_adjudication/stage3_6/live_human_comparator_dataset_manifest.json',
        'artifacts/external_adjudication/stage3_6/live_matched_intervention_dataset_manifest.json',
        'artifacts/external_adjudication/stage3_6/live_negative_control_dataset_manifest.json'
      ],
      decision_record_ref: 'artifacts/external_adjudication/stage3_6/live_decision_record_stub.json',
      boundary_flags: {
        framework_internal_only: true,
        collection_not_started: true,
        evidence_generation_absent: true,
        adjudication_not_open: true
      },
      non_implications: [
        'Not a started collection session.',
        'Not evidence.'
      ]
    };

    const liveHumanComparatorDatasetManifest = datasetManifest({
      artifactRole: 'live_human_comparator_dataset_manifest',
      artifactName: 'live_human_comparator_dataset_manifest.json',
      dataset_family: 'human_comparator',
      currentLineage
    });
    const liveMatchedInterventionDatasetManifest = datasetManifest({
      artifactRole: 'live_matched_intervention_dataset_manifest',
      artifactName: 'live_matched_intervention_dataset_manifest.json',
      dataset_family: 'matched_intervention',
      currentLineage
    });
    const liveNegativeControlDatasetManifest = datasetManifest({
      artifactRole: 'live_negative_control_dataset_manifest',
      artifactName: 'live_negative_control_dataset_manifest.json',
      dataset_family: 'negative_control',
      currentLineage
    });

    const liveReproducibilityPackageManifest = {
      ...baseEnvelope(
        'live_reproducibility_package_manifest',
        'live_reproducibility_package_manifest.json',
        currentLineage,
        'src/comparative_program/schemas/live_reproducibility_package_manifest.v1.json',
        'stage3_6_live_reproducibility_manifest_created'
      ),
      live_artifact_state: readyForLiveInstantiation
        ? 'live_artifacts_instantiated_unpopulated'
        : 'live_artifacts_not_ready',
      population_state: 'unpopulated',
      collection_state: 'collection_not_started',
      evidence_state: 'evidence_generation_absent',
      adjudication_state: 'adjudication_not_open',
      required_slot_count: 6,
      boundary_flags: {
        framework_internal_only: true,
        collection_not_started: true,
        evidence_generation_absent: true
      },
      non_implications: [
        'Not a populated reproducibility package.'
      ]
    };

    const liveDecisionRecordStub = {
      ...baseEnvelope(
        'live_decision_record_stub',
        'live_decision_record_stub.json',
        currentLineage,
        'src/comparative_program/schemas/live_decision_record_stub.v1.json',
        'stage3_6_live_decision_record_stub_created'
      ),
      decision_record_state: 'decision_record_stub_created',
      empty_decision_record: true,
      decision_event_count: 0,
      collection_state: 'collection_not_started',
      evidence_state: 'evidence_generation_absent',
      adjudication_state: 'adjudication_not_open',
      boundary_flags: {
        framework_internal_only: true,
        empty_decision_record: true,
        evidence_generation_absent: true,
        adjudication_not_open: true
      },
      non_implications: [
        'Not a populated decision record.',
        'Not an adjudication outcome.'
      ]
    };

    const liveEvidenceInsertionRegister = {
      ...baseEnvelope(
        'live_evidence_insertion_register',
        'live_evidence_insertion_register.json',
        currentLineage,
        'src/comparative_program/schemas/live_evidence_insertion_register.v1.json',
        'stage3_6_live_evidence_insertion_register_created'
      ),
      register_state: 'live_evidence_insertion_register_created',
      insertion_event_count: 0,
      collection_state: 'collection_not_started',
      evidence_state: 'evidence_generation_absent',
      adjudication_state: 'adjudication_not_open',
      boundary_flags: {
        framework_internal_only: true,
        evidence_generation_absent: true,
        collection_not_started: true
      },
      non_implications: [
        'Not an evidential register.',
        'Not a populated provenance chain.'
      ]
    };

    const liveArtifactInstantiationStatus = {
      ...baseEnvelope(
        'live_artifact_instantiation_status',
        'live_artifact_instantiation_status.json',
        currentLineage,
        'src/comparative_program/schemas/live_artifact_instantiation_status.v1.json',
        'stage3_6_live_artifact_instantiation_defined'
      ),
      live_artifact_state: readyForLiveInstantiation
        ? 'live_artifacts_instantiated_unpopulated'
        : 'live_artifacts_not_ready',
      session_zero_manifest_state: 'session_zero_manifest_created',
      collection_log_state: 'collection_log_created_empty',
      dataset_manifest_state: 'datasets_declared_empty',
      decision_record_stub_state: 'decision_record_stub_created',
      evidence_register_state: 'live_evidence_insertion_register_created',
      evidence_state: 'evidence_generation_absent',
      collection_state: 'collection_not_started',
      adjudication_state: 'adjudication_not_open',
      live_artifact_family_count: listLiveArtifactRoles().length,
      required_empty_marker_count: (
        LIVE_BUT_UNPOPULATED_ARTIFACT_POLICY.required_empty_markers || []
      ).length,
      boundary_flags: {
        framework_internal_only: true,
        evidence_generation_absent: true,
        collection_not_started: true,
        adjudication_not_open: true
      },
      non_implications: [
        'Live-but-unpopulated artifacts are not evidence.',
        'Live-but-unpopulated artifacts do not imply collection has started.'
      ]
    };

    return {
      sessionZeroManifest,
      liveCollectionManifest,
      liveHumanComparatorDatasetManifest,
      liveMatchedInterventionDatasetManifest,
      liveNegativeControlDatasetManifest,
      liveReproducibilityPackageManifest,
      liveDecisionRecordStub,
      liveEvidenceInsertionRegister,
      liveArtifactInstantiationStatus
    };
  }
}

export const createLiveArtifactInstantiationEvaluator = () =>
  new LiveArtifactInstantiationEvaluator();

export default {
  LiveArtifactInstantiationEvaluator,
  createLiveArtifactInstantiationEvaluator
};

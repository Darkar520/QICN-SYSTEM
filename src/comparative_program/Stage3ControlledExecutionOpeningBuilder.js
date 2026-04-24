import fs from 'fs';
import path from 'path';

import {
  ensureDir,
  writeJson,
  hashFileRelative,
  captureComparativeLineage
} from './ComparativeRuntimeUtils.js';
import { createStage3RehearsalPreparationBuilder } from './Stage3RehearsalPreparationBuilder.js';
import { createLiveArtifactInstantiationEvaluator } from './LiveArtifactInstantiationEvaluator.js';
import { createSessionZeroGateBuilder } from './SessionZeroGateBuilder.js';
import { createSessionZeroOperatorChecklistEvaluator } from './SessionZeroOperatorChecklistEvaluator.js';
import { createContaminationChecklistEvaluator } from './ContaminationChecklistEvaluator.js';
import { createPreCollectionAdmissibilityGateBuilder } from './PreCollectionAdmissibilityGateBuilder.js';
import { createStage3_6ControlledExecutionGateBuilder } from './Stage3_6ControlledExecutionGateBuilder.js';

const LAYER_VERSION = 'comparative_expansion_layer.stage3_6_controlled_execution_opening.v1';
const ESTIMATOR_VERSION = 'stage3_controlled_execution_opening_builder.stage3_6.v1';

const DOC_REFS = Object.freeze([
  'docs/CONTROLLED_EXECUTION_OPENING_POLICY.md',
  'docs/SESSION_ZERO_PROTOCOL.md',
  'docs/PRE_COLLECTION_ADMISSIBILITY_GATE.md',
  'docs/CONTAMINATION_AND_ABORT_POLICY.md',
  'docs/LIVE_BUT_UNPOPULATED_ARTIFACT_POLICY.md',
  'docs/SESSION_ZERO_GATE.md',
  'docs/SESSION_ZERO_OPERATOR_CHECKLIST.md',
  'docs/PRE_COLLECTION_GATE.md',
  'docs/stage3_6_boundary.md',
  'docs/FIRST_ADMISSIBLE_COLLECTION_UNLOCK_MAP.md',
  'docs/controlled_execution_opening_policy.v1.json',
  'docs/session_zero_protocol.v1.json',
  'docs/pre_collection_admissibility_gate.v1.json',
  'docs/contamination_and_abort_policy.v1.json',
  'docs/live_but_unpopulated_artifact_policy.v1.json',
  'docs/session_zero_gate_criteria.v1.json',
  'docs/session_zero_operator_checklist.v1.json',
  'docs/session_zero_failure_modes.v1.json',
  'docs/session_zero_reset_policy.v1.json',
  'docs/pre_collection_gate_criteria.v1.json',
  'docs/pre_collection_invalidation_policy.v1.json',
  'docs/pre_collection_contamination_checklist.v1.json',
  'docs/stage3_6_controlled_execution_opening_criteria.v1.json',
  'docs/first_admissible_collection_unlock_map.v1.json'
]);

export class Stage3ControlledExecutionOpeningBuilder {
  captureCurrentLineage() {
    const extraRefs = Object.fromEntries(
      DOC_REFS.map((ref) => [
        ref.replace(/^docs\//, '').replace(/[^A-Za-z0-9_]+/g, '_'),
        {
          ref,
          sha256: hashFileRelative(ref)
        }
      ])
    );

    return captureComparativeLineage({
      layerVersion: LAYER_VERSION,
      estimatorVersion: ESTIMATOR_VERSION,
      extraRefs: {
        ...extraRefs,
        paper10_main_tex: {
          ref: 'paper10_external_adjudication_and_human_comparators/main.tex',
          sha256: hashFileRelative('paper10_external_adjudication_and_human_comparators/main.tex')
        }
      }
    });
  }

  buildArtifacts({
    stage31Dir,
    stage32Dir,
    stage33Dir,
    stage34Dir,
    stage34bDir,
    stage35Dir,
    stage36Dir,
    paper10CompileResult
  }) {
    const stage35Outputs = createStage3RehearsalPreparationBuilder().buildArtifacts({
      stage31Dir,
      stage32Dir,
      stage33Dir,
      stage34Dir,
      stage34bDir,
      stage35Dir,
      paper10CompileResult
    });

    const currentLineage = this.captureCurrentLineage();

    const liveArtifacts = createLiveArtifactInstantiationEvaluator().evaluate({
      stage3_5_rehearsal_ready_gate: stage35Outputs.stage3_5_rehearsal_ready_gate,
      stage3_5_manifest: stage35Outputs.stage3_5_manifest,
      instantiatedEmptyRecordAssessment: stage35Outputs.instantiatedEmptyRecordAssessment,
      currentLineage
    });

    const {
      sessionZeroManifest,
      sessionZeroGateResult
    } = createSessionZeroGateBuilder().build({
      sessionZeroManifest: liveArtifacts.sessionZeroManifest,
      liveArtifactInstantiationStatus: liveArtifacts.liveArtifactInstantiationStatus,
      frozenPreregistrationReadiness: stage35Outputs.frozenPreregistrationReadiness,
      reviewerCandidatePoolStatus: stage35Outputs.reviewerCandidatePoolStatus,
      adjudicatorCandidatePoolStatus: stage35Outputs.adjudicatorCandidatePoolStatus,
      reviewerAssignmentStubStatus: stage35Outputs.reviewerAssignmentStubStatus,
      adjudicatorAssignmentStubStatus: stage35Outputs.adjudicatorAssignmentStubStatus,
      executionPilotRehearsalKitStatus: stage35Outputs.executionPilotRehearsalKitStatus,
      dryRunSequenceReadiness: stage35Outputs.dryRunSequenceReadiness,
      currentLineage
    });

    const {
      sessionZeroOperatorChecklistStatus,
      sessionZeroFailureModeAssessment
    } = createSessionZeroOperatorChecklistEvaluator().evaluate({
      sessionZeroGateResult,
      liveArtifactInstantiationStatus: liveArtifacts.liveArtifactInstantiationStatus,
      currentLineage
    });

    const { contaminationChecklistStatus } = createContaminationChecklistEvaluator().evaluate({
      liveArtifactInstantiationStatus: liveArtifacts.liveArtifactInstantiationStatus,
      currentLineage
    });

    const {
      preCollectionAdmissibilityGateResult,
      preCollectionInvalidationStatus
    } = createPreCollectionAdmissibilityGateBuilder().build({
      sessionZeroGateResult,
      sessionZeroOperatorChecklistStatus,
      contaminationChecklistStatus,
      liveArtifactInstantiationStatus: liveArtifacts.liveArtifactInstantiationStatus,
      currentLineage
    });

    const {
      stage3_6_controlled_execution_gate,
      stage3_6_manifest
    } = createStage3_6ControlledExecutionGateBuilder().build({
      liveArtifactInstantiationStatus: liveArtifacts.liveArtifactInstantiationStatus,
      sessionZeroManifest,
      sessionZeroGateResult,
      preCollectionAdmissibilityGateResult,
      currentLineage
    });

    ensureDir(stage36Dir);

    writeJson(
      path.join(stage36Dir, 'live_artifact_instantiation_status.json'),
      liveArtifacts.liveArtifactInstantiationStatus
    );
    writeJson(path.join(stage36Dir, 'session_zero_manifest.json'), sessionZeroManifest);
    writeJson(path.join(stage36Dir, 'live_collection_manifest.json'), liveArtifacts.liveCollectionManifest);
    fs.writeFileSync(path.join(stage36Dir, 'live_collection_log.ndjson'), '', 'utf8');
    writeJson(
      path.join(stage36Dir, 'live_human_comparator_dataset_manifest.json'),
      liveArtifacts.liveHumanComparatorDatasetManifest
    );
    writeJson(
      path.join(stage36Dir, 'live_matched_intervention_dataset_manifest.json'),
      liveArtifacts.liveMatchedInterventionDatasetManifest
    );
    writeJson(
      path.join(stage36Dir, 'live_negative_control_dataset_manifest.json'),
      liveArtifacts.liveNegativeControlDatasetManifest
    );
    writeJson(
      path.join(stage36Dir, 'live_reproducibility_package_manifest.json'),
      liveArtifacts.liveReproducibilityPackageManifest
    );
    writeJson(
      path.join(stage36Dir, 'live_decision_record_stub.json'),
      liveArtifacts.liveDecisionRecordStub
    );
    writeJson(
      path.join(stage36Dir, 'live_evidence_insertion_register.json'),
      liveArtifacts.liveEvidenceInsertionRegister
    );
    writeJson(path.join(stage36Dir, 'session_zero_gate_result.json'), sessionZeroGateResult);
    writeJson(
      path.join(stage36Dir, 'session_zero_operator_checklist_status.json'),
      sessionZeroOperatorChecklistStatus
    );
    writeJson(
      path.join(stage36Dir, 'session_zero_failure_mode_assessment.json'),
      sessionZeroFailureModeAssessment
    );
    writeJson(
      path.join(stage36Dir, 'pre_collection_gate_result.json'),
      preCollectionAdmissibilityGateResult
    );
    writeJson(
      path.join(stage36Dir, 'pre_collection_admissibility_gate_result.json'),
      preCollectionAdmissibilityGateResult
    );
    writeJson(
      path.join(stage36Dir, 'contamination_checklist_status.json'),
      contaminationChecklistStatus
    );
    writeJson(
      path.join(stage36Dir, 'pre_collection_invalidation_status.json'),
      preCollectionInvalidationStatus
    );
    writeJson(
      path.join(stage36Dir, 'stage3_6_controlled_execution_gate.json'),
      stage3_6_controlled_execution_gate
    );
    writeJson(path.join(stage36Dir, 'stage3_6_manifest.json'), stage3_6_manifest);

    return {
      ...stage35Outputs,
      ...liveArtifacts,
      sessionZeroManifest,
      sessionZeroGateResult,
      sessionZeroOperatorChecklistStatus,
      sessionZeroFailureModeAssessment,
      contaminationChecklistStatus,
      preCollectionAdmissibilityGateResult,
      preCollectionInvalidationStatus,
      stage3_6_controlled_execution_gate,
      stage3_6_manifest
    };
  }
}

export const createStage3ControlledExecutionOpeningBuilder = () =>
  new Stage3ControlledExecutionOpeningBuilder();

export default {
  Stage3ControlledExecutionOpeningBuilder,
  createStage3ControlledExecutionOpeningBuilder
};

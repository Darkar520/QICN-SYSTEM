import path from 'path';

import {
  PROJECT_ROOT,
  ensureDir,
  writeJson,
  hashFileRelative,
  readJsonRelative,
  captureComparativeLineage
} from './ComparativeRuntimeUtils.js';
import { createStage3ExecutionReadinessBuilder } from './Stage3ExecutionReadinessBuilder.js';
import { createPreregistrationFreezeEvaluator } from './PreregistrationFreezeEvaluator.js';
import { createReviewerSelectionEvaluator } from './ReviewerSelectionEvaluator.js';
import { createExecutionPilotPackagingEvaluator } from './ExecutionPilotPackagingEvaluator.js';
import { createStage3ExecutionPilotGateBuilder } from './Stage3ExecutionPilotGateBuilder.js';
import { createExecutionPilotDryRunEvaluator } from './ExecutionPilotDryRunEvaluator.js';

const LAYER_VERSION = 'comparative_expansion_layer.stage3_3_to_stage3_4_pilot_preparation.v1';
const ESTIMATOR_VERSION = 'stage3_pilot_preparation_builder.stage3_3_to_stage3_4.v1';

const DOC_REFS = Object.freeze([
  'docs/frozen_preregistration_record_schema.v1.json',
  'docs/preregistration_freeze_policy.v1.json',
  'docs/preregistration_amendment_policy.v1.json',
  'docs/preregistration_lock_manifest.v1.json',
  'docs/reviewer_candidate_schema.v1.json',
  'docs/adjudicator_candidate_schema.v1.json',
  'docs/reviewer_selection_workflow.v1.json',
  'docs/adjudicator_assignment_workflow.v1.json',
  'docs/reviewer_rejection_reasons.v1.json',
  'docs/blinding_assignment_manifest.v1.json',
  'docs/execution_pilot_package_manifest.v1.json',
  'docs/execution_session_manifest.v1.json',
  'docs/collection_session_schema.v1.json',
  'docs/reproducibility_package_skeleton.v1.json',
  'docs/pilot_negative_control_bundle.v1.json',
  'docs/pilot_matched_intervention_bundle.v1.json',
  'docs/source_target_pairing_manifest.v1.json',
  'docs/stage3_execution_pilot_opening_criteria.v1.json',
  'docs/execution_pilot_dry_run_policy.v1.json',
  'docs/external_adjudication_results_unlock_map.v1.json'
]);

const artifactRef = (name) => `artifacts/external_adjudication/${name}`;

export class Stage3PilotPreparationBuilder {
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

  buildArtifacts({ stage31Dir, stage32Dir, stage33Dir, stage34Dir, paper10CompileResult }) {
    createStage3ExecutionReadinessBuilder().buildArtifacts({
      stage31Dir,
      stage32Dir,
      paper10CompileResult
    });

    const currentLineage = {
      ...this.captureCurrentLineage(),
      stage3_2_execution_readiness_state: readJsonRelative(
        'artifacts/external_adjudication/stage3_2/external_adjudication_execution_readiness.json'
      ).execution_readiness_state
    };

    const stage32PreregistrationReadiness = readJsonRelative(
      'artifacts/external_adjudication/stage3_1/human_channel_preregistration_readiness.json'
    );
    const stage32ReviewerAssessment = readJsonRelative(
      'artifacts/external_adjudication/stage3_2/reviewer_independence_assessment.json'
    );

    const { frozenPreregistrationReadiness, preregistrationLockAssessment } =
      createPreregistrationFreezeEvaluator().evaluate({
        stage32PreregistrationReadiness,
        currentLineage
      });

    const {
      reviewerSelectionReadiness,
      adjudicatorAssignmentReadiness,
      blindingAssignmentReadiness
    } = createReviewerSelectionEvaluator().evaluate({
      stage32ReviewerAssessment,
      currentLineage
    });

    const {
      executionPilotPackageAssessment,
      reproducibilityPackageSkeletonStatus,
      pilotNegativeControlBundleStatus,
      pilotMatchedInterventionBundleStatus
    } = createExecutionPilotPackagingEvaluator().evaluate({
      frozenPreregistrationReadiness,
      reviewerSelectionReadiness,
      adjudicatorAssignmentReadiness,
      currentLineage
    });

    const executionPilotOpeningGate = createStage3ExecutionPilotGateBuilder().build({
      frozenPreregistrationReadiness,
      reviewerSelectionReadiness,
      adjudicatorAssignmentReadiness,
      executionPilotPackageAssessment,
      currentLineage
    });

    const { executionPilotDryRunStatus, executionPilotManifest } =
      createExecutionPilotDryRunEvaluator().evaluate({
        executionPilotOpeningGate,
        currentLineage
      });

    ensureDir(stage33Dir);
    ensureDir(stage34Dir);

    writeJson(
      path.join(stage33Dir, 'frozen_preregistration_readiness.json'),
      frozenPreregistrationReadiness
    );
    writeJson(
      path.join(stage33Dir, 'preregistration_lock_assessment.json'),
      preregistrationLockAssessment
    );
    writeJson(
      path.join(stage33Dir, 'reviewer_selection_readiness.json'),
      reviewerSelectionReadiness
    );
    writeJson(
      path.join(stage33Dir, 'adjudicator_assignment_readiness.json'),
      adjudicatorAssignmentReadiness
    );
    writeJson(
      path.join(stage33Dir, 'blinding_assignment_readiness.json'),
      blindingAssignmentReadiness
    );
    writeJson(
      path.join(stage33Dir, 'execution_pilot_package_assessment.json'),
      executionPilotPackageAssessment
    );
    writeJson(
      path.join(stage33Dir, 'reproducibility_package_skeleton_status.json'),
      reproducibilityPackageSkeletonStatus
    );
    writeJson(
      path.join(stage33Dir, 'pilot_negative_control_bundle_status.json'),
      pilotNegativeControlBundleStatus
    );
    writeJson(
      path.join(stage33Dir, 'pilot_matched_intervention_bundle_status.json'),
      pilotMatchedInterventionBundleStatus
    );

    writeJson(
      path.join(stage34Dir, 'execution_pilot_opening_gate.json'),
      executionPilotOpeningGate
    );
    writeJson(
      path.join(stage34Dir, 'execution_pilot_dry_run_status.json'),
      executionPilotDryRunStatus
    );
    writeJson(path.join(stage34Dir, 'execution_pilot_manifest.json'), executionPilotManifest);

    return {
      frozenPreregistrationReadiness,
      preregistrationLockAssessment,
      reviewerSelectionReadiness,
      adjudicatorAssignmentReadiness,
      blindingAssignmentReadiness,
      executionPilotPackageAssessment,
      reproducibilityPackageSkeletonStatus,
      pilotNegativeControlBundleStatus,
      pilotMatchedInterventionBundleStatus,
      executionPilotOpeningGate,
      executionPilotDryRunStatus,
      executionPilotManifest
    };
  }
}

export const createStage3PilotPreparationBuilder = () =>
  new Stage3PilotPreparationBuilder();

export default {
  Stage3PilotPreparationBuilder,
  createStage3PilotPreparationBuilder
};

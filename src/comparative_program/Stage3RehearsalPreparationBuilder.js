import path from 'path';

import {
  ensureDir,
  writeJson,
  hashFileRelative,
  readJsonRelative,
  captureComparativeLineage
} from './ComparativeRuntimeUtils.js';
import { createStage3PilotPreparationBuilder } from './Stage3PilotPreparationBuilder.js';
import { createProvenanceClosureEvaluator } from './ProvenanceClosureEvaluator.js';
import { createInstantiatedEmptyRecordEvaluator } from './InstantiatedEmptyRecordEvaluator.js';
import { createCandidatePoolEvaluator } from './CandidatePoolEvaluator.js';
import { createRehearsalKitEvaluator } from './RehearsalKitEvaluator.js';
import { createStage3_5ReadinessGateBuilder } from './Stage3_5ReadinessGateBuilder.js';

const LAYER_VERSION = 'comparative_expansion_layer.stage3_4b_to_stage3_5_rehearsal_preparation.v1';
const ESTIMATOR_VERSION = 'stage3_rehearsal_preparation_builder.stage3_4b_to_stage3_5.v1';

const DOC_REFS = Object.freeze([
  'docs/INSTANTIATED_EMPTY_RECORDS_POLICY.md',
  'docs/LOCAL_FROZEN_RECORD_BOUNDARY.md',
  'docs/DECISION_RECORD_TEMPLATE_POLICY.md',
  'docs/REVIEWER_CANDIDATE_POOL_POLICY.md',
  'docs/ASSIGNMENT_STUB_POLICY.md',
  'docs/EXECUTION_PILOT_REHEARSAL_KIT.md',
  'docs/DRY_RUN_SEQUENCE_PLAN.md',
  'docs/stage3_5_boundary.md',
  'docs/PAPER10_FINALIZATION_UNLOCK_MAP.md',
  'docs/local_frozen_preregistration_record_template.v1.json',
  'docs/reviewer_candidate_pool_template.v1.json',
  'docs/adjudicator_candidate_pool_template.v1.json',
  'docs/blinding_assignment_stub.v1.json',
  'docs/execution_session_template.v1.json',
  'docs/decision_record_template.v1.json',
  'docs/reproducibility_package_manifest_empty.v1.json',
  'docs/collection_log_schema.v1.json',
  'docs/evidence_insertion_manifest.v1.json',
  'docs/reviewer_candidate_pool_fields.v1.json',
  'docs/adjudicator_candidate_pool_fields.v1.json',
  'docs/reviewer_assignment_stub.v1.json',
  'docs/adjudicator_assignment_stub.v1.json',
  'docs/reviewer_blinding_stub.v1.json',
  'docs/execution_pilot_rehearsal_kit.v1.json',
  'docs/dry_run_sequence_plan.v1.json',
  'docs/rehearsal_event_log_schema.v1.json',
  'docs/rehearsal_failure_modes.v1.json',
  'docs/rehearsal_reset_policy.v1.json',
  'docs/stage3_5_rehearsal_ready_criteria.v1.json',
  'docs/stage3_execution_unlock_map.v1.json'
]);

const artifactSnapshot = (artifactRef) => {
  try {
    const artifact = readJsonRelative(artifactRef);
    return {
      artifact_ref: artifactRef,
      systemHead: artifact?.provenance?.current_lineage?.qicn_system?.head || null,
      releaseHead: artifact?.provenance?.current_lineage?.qicn_release?.head || null
    };
  } catch {
    return {
      artifact_ref: artifactRef,
      systemHead: null,
      releaseHead: null
    };
  }
};

export class Stage3RehearsalPreparationBuilder {
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
    paper10CompileResult
  }) {
    const priorSnapshots = [
      artifactSnapshot('artifacts/external_adjudication/stage3_2/paper10_protocol_hardening_status.json'),
      artifactSnapshot('artifacts/external_adjudication/stage3_3/frozen_preregistration_readiness.json'),
      artifactSnapshot('artifacts/external_adjudication/stage3_4/execution_pilot_manifest.json')
    ];

    const stage34Outputs = createStage3PilotPreparationBuilder().buildArtifacts({
      stage31Dir,
      stage32Dir,
      stage33Dir,
      stage34Dir,
      paper10CompileResult
    });

    const currentLineage = this.captureCurrentLineage();
    const executionCampaignFreeze = readJsonRelative('docs/execution_campaign_freeze.v1.json');
    const releaseAuthoritySha =
      executionCampaignFreeze.current_trunk_linkage?.qicn_release_public_main_sha
      || currentLineage.qicn_release.head;
    const systemLivePinSha =
      executionCampaignFreeze.current_trunk_linkage?.qicn_system_current_main_sha
      || currentLineage.qicn_system.head;
    const pinningWasCleanAtEntry =
      priorSnapshots.every((snapshot) => snapshot.systemHead === currentLineage.qicn_system.head)
      && releaseAuthoritySha === currentLineage.qicn_release.head
      && systemLivePinSha === currentLineage.qicn_system.head;

    const provenanceClosureAssessment = createProvenanceClosureEvaluator().evaluate({
      priorSnapshots,
      currentLineage,
      releaseAuthoritySha,
      systemLivePinSha,
      pinningWasCleanAtEntry
    });

    const {
      instantiatedEmptyRecordAssessment,
      localFrozenRecordStatus,
      candidatePoolTemplateStatus,
      decisionRecordTemplateStatus
    } = createInstantiatedEmptyRecordEvaluator().evaluate({
      frozenPreregistrationReadiness: stage34Outputs.frozenPreregistrationReadiness,
      currentLineage
    });

    const {
      reviewerCandidatePoolStatus,
      adjudicatorCandidatePoolStatus,
      reviewerAssignmentStubStatus,
      adjudicatorAssignmentStubStatus
    } = createCandidatePoolEvaluator().evaluate({
      reviewerSelectionReadiness: stage34Outputs.reviewerSelectionReadiness,
      adjudicatorAssignmentReadiness: stage34Outputs.adjudicatorAssignmentReadiness,
      currentLineage
    });

    const {
      executionPilotRehearsalKitStatus,
      dryRunSequenceReadiness,
      rehearsalEventLogStatus
    } = createRehearsalKitEvaluator().evaluate({
      executionPilotDryRunStatus: stage34Outputs.executionPilotDryRunStatus,
      instantiatedEmptyRecordAssessment,
      reviewerCandidatePoolStatus,
      adjudicatorCandidatePoolStatus,
      reviewerAssignmentStubStatus,
      adjudicatorAssignmentStubStatus,
      currentLineage
    });

    const { stage3_5_rehearsal_ready_gate, stage3_5_manifest } =
      createStage3_5ReadinessGateBuilder().build({
        provenanceClosureAssessment,
        instantiatedEmptyRecordAssessment,
        reviewerCandidatePoolStatus,
        adjudicatorCandidatePoolStatus,
        reviewerAssignmentStubStatus,
        adjudicatorAssignmentStubStatus,
        executionPilotRehearsalKitStatus,
        dryRunSequenceReadiness,
        executionPilotDryRunStatus: stage34Outputs.executionPilotDryRunStatus,
        currentLineage
      });

    ensureDir(stage34Dir);
    ensureDir(stage34bDir);
    ensureDir(stage35Dir);

    writeJson(path.join(stage34Dir, 'provenance_closure_assessment.json'), provenanceClosureAssessment);

    writeJson(
      path.join(stage34bDir, 'instantiated_empty_record_assessment.json'),
      instantiatedEmptyRecordAssessment
    );
    writeJson(path.join(stage34bDir, 'local_frozen_record_status.json'), localFrozenRecordStatus);
    writeJson(
      path.join(stage34bDir, 'candidate_pool_template_status.json'),
      candidatePoolTemplateStatus
    );
    writeJson(
      path.join(stage34bDir, 'decision_record_template_status.json'),
      decisionRecordTemplateStatus
    );
    writeJson(
      path.join(stage34bDir, 'reviewer_candidate_pool_status.json'),
      reviewerCandidatePoolStatus
    );
    writeJson(
      path.join(stage34bDir, 'adjudicator_candidate_pool_status.json'),
      adjudicatorCandidatePoolStatus
    );
    writeJson(
      path.join(stage34bDir, 'reviewer_assignment_stub_status.json'),
      reviewerAssignmentStubStatus
    );
    writeJson(
      path.join(stage34bDir, 'adjudicator_assignment_stub_status.json'),
      adjudicatorAssignmentStubStatus
    );

    writeJson(
      path.join(stage35Dir, 'execution_pilot_rehearsal_kit_status.json'),
      executionPilotRehearsalKitStatus
    );
    writeJson(
      path.join(stage35Dir, 'dry_run_sequence_readiness.json'),
      dryRunSequenceReadiness
    );
    writeJson(path.join(stage35Dir, 'rehearsal_event_log_status.json'), rehearsalEventLogStatus);
    writeJson(path.join(stage35Dir, 'stage3_5_rehearsal_ready_gate.json'), stage3_5_rehearsal_ready_gate);
    writeJson(path.join(stage35Dir, 'stage3_5_manifest.json'), stage3_5_manifest);

    return {
      ...stage34Outputs,
      provenanceClosureAssessment,
      instantiatedEmptyRecordAssessment,
      localFrozenRecordStatus,
      candidatePoolTemplateStatus,
      decisionRecordTemplateStatus,
      reviewerCandidatePoolStatus,
      adjudicatorCandidatePoolStatus,
      reviewerAssignmentStubStatus,
      adjudicatorAssignmentStubStatus,
      executionPilotRehearsalKitStatus,
      dryRunSequenceReadiness,
      rehearsalEventLogStatus,
      stage3_5_rehearsal_ready_gate,
      stage3_5_manifest
    };
  }
}

export const createStage3RehearsalPreparationBuilder = () =>
  new Stage3RehearsalPreparationBuilder();

export default {
  Stage3RehearsalPreparationBuilder,
  createStage3RehearsalPreparationBuilder
};

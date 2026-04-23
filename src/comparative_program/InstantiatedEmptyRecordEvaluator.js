import {
  LOCAL_FROZEN_PREREGISTRATION_RECORD_TEMPLATE,
  REVIEWER_CANDIDATE_POOL_TEMPLATE,
  ADJUDICATOR_CANDIDATE_POOL_TEMPLATE,
  BLINDING_ASSIGNMENT_STUB,
  EXECUTION_SESSION_TEMPLATE,
  DECISION_RECORD_TEMPLATE,
  REPRODUCIBILITY_PACKAGE_MANIFEST_EMPTY,
  COLLECTION_LOG_SCHEMA,
  EVIDENCE_INSERTION_MANIFEST,
  listInstantiatedEmptyRecordRoles
} from './InstantiatedEmptyRecordRegistry.js';

const LAYER_VERSION = 'comparative_expansion_layer.stage3_4b.instantiated_empty.v1';
const ESTIMATOR_VERSION = 'instantiated_empty_record_evaluator.stage3_4b.v1';

const BOUNDARY =
  'Framework-internal only; instantiated-empty records are structural placeholders and local governance shells. They remain non-evidential and non-adjudicative.';

const count = (items) => (items || []).length;

export class InstantiatedEmptyRecordEvaluator {
  evaluate({ frozenPreregistrationReadiness, currentLineage }) {
    const localFrozenRecordReady =
      LOCAL_FROZEN_PREREGISTRATION_RECORD_TEMPLATE.record_state === 'instantiated_empty'
      && LOCAL_FROZEN_PREREGISTRATION_RECORD_TEMPLATE.freeze_state === 'frozen_local_unfiled'
      && frozenPreregistrationReadiness.freeze_state === 'local_freeze_ready';

    const candidatePoolsReady =
      REVIEWER_CANDIDATE_POOL_TEMPLATE.pool_state === 'instantiated_empty'
      && ADJUDICATOR_CANDIDATE_POOL_TEMPLATE.pool_state === 'instantiated_empty';

    const decisionTemplateReady =
      DECISION_RECORD_TEMPLATE.decision_record_state === 'instantiated_empty';

    const localFrozenRecordStatus = {
      artifact_role: 'local_frozen_record_status',
      artifact_name: 'local_frozen_record_status.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      layer_id: 'comparative_expansion_layer.stage3_4b_instantiated_empty',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'stage3_4b_local_frozen_record_instantiated',
      local_frozen_record_state: localFrozenRecordReady
        ? 'local_frozen_record_instantiated_but_unfiled'
        : 'local_frozen_record_template_only',
      external_filing_state: 'not_externally_filed',
      evidence_state: 'still_non_evidential',
      immutable_field_count: count(
        LOCAL_FROZEN_PREREGISTRATION_RECORD_TEMPLATE.immutable_after_local_freeze
      ),
      boundary_flags: {
        framework_internal_only: true,
        local_frozen_unfiled: true,
        evidence_absent: true
      },
      non_implications: [
        'A local frozen record is not an external filing.',
        'A local frozen record is not evidence.'
      ],
      interpretation_boundary: BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        current_lineage: currentLineage
      },
      schema_ref: 'src/comparative_program/schemas/local_frozen_record_status.v1.json'
    };

    const candidatePoolTemplateStatus = {
      artifact_role: 'candidate_pool_template_status',
      artifact_name: 'candidate_pool_template_status.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      layer_id: 'comparative_expansion_layer.stage3_4b_instantiated_empty',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'stage3_4b_candidate_pool_templates_instantiated',
      reviewer_candidate_pool_state: 'reviewer_candidate_pool_instantiated_empty',
      adjudicator_candidate_pool_state: 'adjudicator_candidate_pool_instantiated_empty',
      pool_template_state: candidatePoolsReady
        ? 'candidate_pool_templates_instantiated_empty'
        : 'candidate_pool_templates_incomplete',
      reviewer_slot_count: count(REVIEWER_CANDIDATE_POOL_TEMPLATE.candidate_slots),
      adjudicator_slot_count: count(ADJUDICATOR_CANDIDATE_POOL_TEMPLATE.candidate_slots),
      boundary_flags: {
        framework_internal_only: true,
        no_real_identities_instantiated: true
      },
      non_implications: [
        'Candidate pools are not reviewer or adjudicator selection.'
      ],
      interpretation_boundary: BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        current_lineage: currentLineage
      },
      schema_ref: 'src/comparative_program/schemas/candidate_pool_template_status.v1.json'
    };

    const decisionRecordTemplateStatus = {
      artifact_role: 'decision_record_template_status',
      artifact_name: 'decision_record_template_status.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      layer_id: 'comparative_expansion_layer.stage3_4b_instantiated_empty',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'stage3_4b_decision_record_template_instantiated',
      decision_record_template_state: decisionTemplateReady
        ? 'decision_record_template_instantiated_empty'
        : 'decision_record_template_incomplete',
      allowed_decision_grammar_count: count(DECISION_RECORD_TEMPLATE.allowed_decision_grammar),
      boundary_flags: {
        framework_internal_only: true,
        decision_absent: true,
        no_real_reviewer_or_adjudicator_output: true
      },
      non_implications: [
        'Decision grammar is not a decision outcome.'
      ],
      interpretation_boundary: BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        current_lineage: currentLineage
      },
      schema_ref: 'src/comparative_program/schemas/decision_record_template_status.v1.json'
    };

    const instantiatedEmptyRecordAssessment = {
      artifact_role: 'instantiated_empty_record_assessment',
      artifact_name: 'instantiated_empty_record_assessment.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      layer_id: 'comparative_expansion_layer.stage3_4b_instantiated_empty',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'stage3_4b_instantiated_empty_layer_defined',
      instantiated_empty_layer_state: 'instantiated_empty_layer_defined',
      local_frozen_record_state: localFrozenRecordStatus.local_frozen_record_state,
      reviewer_candidate_pool_state: candidatePoolTemplateStatus.reviewer_candidate_pool_state,
      adjudicator_candidate_pool_state: candidatePoolTemplateStatus.adjudicator_candidate_pool_state,
      decision_record_template_state: decisionRecordTemplateStatus.decision_record_template_state,
      evidence_insertion_manifest_state:
        EVIDENCE_INSERTION_MANIFEST.manifest_state === 'defined'
          ? 'evidence_insertion_manifest_defined'
          : 'evidence_insertion_manifest_missing',
      execution_session_template_state:
        EXECUTION_SESSION_TEMPLATE.session_state === 'instantiated_empty'
          ? 'execution_session_template_instantiated_empty'
          : 'execution_session_template_missing',
      collection_log_schema_state:
        COLLECTION_LOG_SCHEMA.artifact_role === 'collection_log_schema'
          ? 'collection_log_schema_defined'
          : 'collection_log_schema_missing',
      blinding_assignment_stub_state:
        BLINDING_ASSIGNMENT_STUB.stub_state === 'instantiated_empty'
          ? 'blinding_assignment_stub_instantiated_empty'
          : 'blinding_assignment_stub_missing',
      reproducibility_manifest_state:
        REPRODUCIBILITY_PACKAGE_MANIFEST_EMPTY.manifest_state === 'instantiated_empty'
          ? 'reproducibility_manifest_instantiated_empty'
          : 'reproducibility_manifest_missing',
      still_non_evidential: true,
      record_family_count: listInstantiatedEmptyRecordRoles().length,
      boundary_flags: {
        framework_internal_only: true,
        still_non_evidential: true,
        no_external_filing_claim: true,
        no_real_decision_claim: true
      },
      non_implications: [
        'Instantiated-empty records are not populated evidence.',
        'Instantiated-empty records do not imply human action.'
      ],
      interpretation_boundary: BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        current_lineage: currentLineage
      },
      schema_ref: 'src/comparative_program/schemas/instantiated_empty_record_assessment.v1.json'
    };

    return {
      instantiatedEmptyRecordAssessment,
      localFrozenRecordStatus,
      candidatePoolTemplateStatus,
      decisionRecordTemplateStatus
    };
  }
}

export const createInstantiatedEmptyRecordEvaluator = () =>
  new InstantiatedEmptyRecordEvaluator();

export default {
  InstantiatedEmptyRecordEvaluator,
  createInstantiatedEmptyRecordEvaluator
};

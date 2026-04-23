import {
  FROZEN_PREREGISTRATION_RECORD_SCHEMA,
  PREREGISTRATION_FREEZE_POLICY,
  PREREGISTRATION_AMENDMENT_POLICY,
  PREREGISTRATION_LOCK_MANIFEST
} from './FrozenPreregistrationRegistry.js';

const LAYER_VERSION = 'comparative_expansion_layer.stage3_3.preregistration_freeze.v1';
const ESTIMATOR_VERSION = 'preregistration_freeze_evaluator.stage3_3.v1';

const BOUNDARY =
  'Framework-internal only; Stage3-3 preregistration freeze artifacts record whether local freezing and lock semantics are structurally ready. They do not claim an externally filed preregistration record.';

const count = (items) => (items || []).length;

export class PreregistrationFreezeEvaluator {
  evaluate({ stage32PreregistrationReadiness, currentLineage }) {
    const localFreezeReady =
      stage32PreregistrationReadiness?.preregistration_state === 'preregistration_ready_for_freeze'
      && count(FROZEN_PREREGISTRATION_RECORD_SCHEMA.required_fields) > 0
      && count(PREREGISTRATION_LOCK_MANIFEST.lock_fields) > 0;

    const frozenPreregistrationReadiness = {
      artifact_role: 'frozen_preregistration_readiness',
      artifact_name: 'frozen_preregistration_readiness.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      layer_id: 'comparative_expansion_layer.stage3_3_preregistration_freeze',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'stage3_3_frozen_record_schema_defined',
      frozen_record_state: 'frozen_record_schema_defined',
      freeze_state: localFreezeReady ? 'local_freeze_ready' : 'freeze_schema_defined',
      external_filing_state: 'external_filing_absent',
      preregistration_state: 'preregistration_not_externally_filed',
      immutable_field_count: count(FROZEN_PREREGISTRATION_RECORD_SCHEMA.immutable_after_freeze),
      required_provenance_chain: [
        'qicn_system_repo_state',
        'qicn_release_repo_state',
        'document_hashes',
        'lock_manifest_hash',
        'parent_template_hash'
      ],
      boundary_flags: {
        framework_internal_only: true,
        local_freeze_ready: localFreezeReady,
        external_filing_absent: true,
        preregistration_not_externally_filed: true,
        human_data_absent: true
      },
      non_implications: [
        'Local freeze readiness is not external filing.',
        'Local freeze readiness is not evidence collection.',
        'Local freeze readiness is not adjudication.'
      ],
      interpretation_boundary: BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        stage3_2_preregistration_state: stage32PreregistrationReadiness?.preregistration_state || null,
        current_lineage: currentLineage
      },
      schema_ref: 'src/comparative_program/schemas/frozen_preregistration_readiness.v1.json'
    };

    const preregistrationLockAssessment = {
      artifact_role: 'preregistration_lock_assessment',
      artifact_name: 'preregistration_lock_assessment.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      layer_id: 'comparative_expansion_layer.stage3_3_preregistration_freeze',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'stage3_3_preregistration_lock_manifest_defined',
      lock_state: localFreezeReady ? 'local_lock_ready' : 'lock_manifest_defined',
      amendment_state: 'local_amendment_architecture_defined',
      illegal_amendment_count: count(PREREGISTRATION_AMENDMENT_POLICY.illegal_amendments),
      legal_amendment_count: count(PREREGISTRATION_AMENDMENT_POLICY.legal_amendments),
      lock_field_count: count(PREREGISTRATION_LOCK_MANIFEST.lock_fields),
      immutable_field_hash_surface_count: 1,
      boundary_flags: {
        framework_internal_only: true,
        template_only: true,
        external_filing_absent: true,
        preregistration_not_externally_filed: true
      },
      non_implications: [
        'A lock template is not a frozen preregistration record.',
        'Amendment architecture is not permission to rewrite evidence.'
      ],
      interpretation_boundary: BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        current_lineage: currentLineage
      },
      schema_ref: 'src/comparative_program/schemas/preregistration_lock_assessment.v1.json'
    };

    return {
      frozenPreregistrationReadiness,
      preregistrationLockAssessment
    };
  }
}

export const createPreregistrationFreezeEvaluator = () =>
  new PreregistrationFreezeEvaluator();

export default {
  PreregistrationFreezeEvaluator,
  createPreregistrationFreezeEvaluator
};

import fs from 'fs';

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const LOCAL_FROZEN_PREREGISTRATION_RECORD_TEMPLATE = Object.freeze(
  readJson('../../docs/local_frozen_preregistration_record_template.v1.json')
);
export const REVIEWER_CANDIDATE_POOL_TEMPLATE = Object.freeze(
  readJson('../../docs/reviewer_candidate_pool_template.v1.json')
);
export const ADJUDICATOR_CANDIDATE_POOL_TEMPLATE = Object.freeze(
  readJson('../../docs/adjudicator_candidate_pool_template.v1.json')
);
export const BLINDING_ASSIGNMENT_STUB = Object.freeze(
  readJson('../../docs/blinding_assignment_stub.v1.json')
);
export const EXECUTION_SESSION_TEMPLATE = Object.freeze(
  readJson('../../docs/execution_session_template.v1.json')
);
export const DECISION_RECORD_TEMPLATE = Object.freeze(
  readJson('../../docs/decision_record_template.v1.json')
);
export const REPRODUCIBILITY_PACKAGE_MANIFEST_EMPTY = Object.freeze(
  readJson('../../docs/reproducibility_package_manifest_empty.v1.json')
);
export const COLLECTION_LOG_SCHEMA = Object.freeze(
  readJson('../../docs/collection_log_schema.v1.json')
);
export const EVIDENCE_INSERTION_MANIFEST = Object.freeze(
  readJson('../../docs/evidence_insertion_manifest.v1.json')
);

export const listInstantiatedEmptyRecordRoles = () => [
  LOCAL_FROZEN_PREREGISTRATION_RECORD_TEMPLATE.template_role,
  REVIEWER_CANDIDATE_POOL_TEMPLATE.template_role,
  ADJUDICATOR_CANDIDATE_POOL_TEMPLATE.template_role,
  BLINDING_ASSIGNMENT_STUB.template_role,
  EXECUTION_SESSION_TEMPLATE.template_role,
  DECISION_RECORD_TEMPLATE.template_role,
  REPRODUCIBILITY_PACKAGE_MANIFEST_EMPTY.template_role,
  COLLECTION_LOG_SCHEMA.artifact_role,
  EVIDENCE_INSERTION_MANIFEST.artifact_role
].filter(Boolean);

export default {
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
};

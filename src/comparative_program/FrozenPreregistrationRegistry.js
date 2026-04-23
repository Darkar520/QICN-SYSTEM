import fs from 'fs';

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const FROZEN_PREREGISTRATION_RECORD_SCHEMA = Object.freeze(
  readJson('../../docs/frozen_preregistration_record_schema.v1.json')
);
export const PREREGISTRATION_FREEZE_POLICY = Object.freeze(
  readJson('../../docs/preregistration_freeze_policy.v1.json')
);
export const PREREGISTRATION_AMENDMENT_POLICY = Object.freeze(
  readJson('../../docs/preregistration_amendment_policy.v1.json')
);
export const PREREGISTRATION_LOCK_MANIFEST = Object.freeze(
  readJson('../../docs/preregistration_lock_manifest.v1.json')
);

export const listFrozenPreregistrationRecordClasses = () => [
  ...(FROZEN_PREREGISTRATION_RECORD_SCHEMA.record_classes || [])
];

export const listPreregistrationFreezeStates = () => [
  ...(PREREGISTRATION_FREEZE_POLICY.freeze_states || [])
];

export default {
  FROZEN_PREREGISTRATION_RECORD_SCHEMA,
  PREREGISTRATION_FREEZE_POLICY,
  PREREGISTRATION_AMENDMENT_POLICY,
  PREREGISTRATION_LOCK_MANIFEST,
  listFrozenPreregistrationRecordClasses,
  listPreregistrationFreezeStates
};

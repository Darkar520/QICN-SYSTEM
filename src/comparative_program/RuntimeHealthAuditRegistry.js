import fs from 'fs';

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const RUNTIME_HEALTH_AUDIT_POLICY = Object.freeze(
  readJson('../../docs/runtime_health_audit.v1.json')
);
export const CLEAN_ROOM_REPRODUCIBILITY_AUDIT_POLICY = Object.freeze(
  readJson('../../docs/clean_room_reproducibility_audit.v1.json')
);
export const STAGE3_6B_RUNTIME_REPRODUCIBILITY_GATE_POLICY = Object.freeze(
  readJson('../../docs/stage3_6b_runtime_reproducibility_gate.v1.json')
);

export const listRuntimeHealthRequiredCommands = () => [
  ...(RUNTIME_HEALTH_AUDIT_POLICY.required_commands || [])
];

export const listCleanRoomRequiredChecks = () => [
  ...(CLEAN_ROOM_REPRODUCIBILITY_AUDIT_POLICY.required_checks || [])
];

export default {
  RUNTIME_HEALTH_AUDIT_POLICY,
  CLEAN_ROOM_REPRODUCIBILITY_AUDIT_POLICY,
  STAGE3_6B_RUNTIME_REPRODUCIBILITY_GATE_POLICY,
  listRuntimeHealthRequiredCommands,
  listCleanRoomRequiredChecks
};

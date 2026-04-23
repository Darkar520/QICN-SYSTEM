import fs from 'fs';

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const EXECUTION_PILOT_REHEARSAL_KIT = Object.freeze(
  readJson('../../docs/execution_pilot_rehearsal_kit.v1.json')
);
export const REHEARSAL_FAILURE_MODES = Object.freeze(
  readJson('../../docs/rehearsal_failure_modes.v1.json')
);
export const REHEARSAL_RESET_POLICY = Object.freeze(
  readJson('../../docs/rehearsal_reset_policy.v1.json')
);

export default {
  EXECUTION_PILOT_REHEARSAL_KIT,
  REHEARSAL_FAILURE_MODES,
  REHEARSAL_RESET_POLICY
};

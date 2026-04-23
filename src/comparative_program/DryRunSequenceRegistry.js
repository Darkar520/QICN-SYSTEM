import fs from 'fs';

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const DRY_RUN_SEQUENCE_PLAN = Object.freeze(
  readJson('../../docs/dry_run_sequence_plan.v1.json')
);
export const REHEARSAL_EVENT_LOG_SCHEMA = Object.freeze(
  readJson('../../docs/rehearsal_event_log_schema.v1.json')
);

export default {
  DRY_RUN_SEQUENCE_PLAN,
  REHEARSAL_EVENT_LOG_SCHEMA
};

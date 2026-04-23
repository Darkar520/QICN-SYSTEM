import fs from 'fs';

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const EXECUTION_SESSION_MANIFEST = Object.freeze(
  readJson('../../docs/execution_session_manifest.v1.json')
);
export const COLLECTION_SESSION_SCHEMA = Object.freeze(
  readJson('../../docs/collection_session_schema.v1.json')
);

export default {
  EXECUTION_SESSION_MANIFEST,
  COLLECTION_SESSION_SCHEMA
};

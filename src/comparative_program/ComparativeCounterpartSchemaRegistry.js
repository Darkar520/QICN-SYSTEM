import fs from 'fs';

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const COMPARATIVE_COUNTERPART_SCHEMA_REGISTRY = Object.freeze(
  readJson('../../docs/comparative_counterpart_schema_registry.v1.json')
);

export const listComparativeCounterpartSchemas = () =>
  [...(COMPARATIVE_COUNTERPART_SCHEMA_REGISTRY.artifact_families || [])];

export const getComparativeCounterpartSchemaBinding = (artifactName) =>
  (COMPARATIVE_COUNTERPART_SCHEMA_REGISTRY.artifact_families || []).find(
    (entry) => entry.artifact_name === artifactName
  ) || null;

export default {
  COMPARATIVE_COUNTERPART_SCHEMA_REGISTRY,
  listComparativeCounterpartSchemas,
  getComparativeCounterpartSchemaBinding
};

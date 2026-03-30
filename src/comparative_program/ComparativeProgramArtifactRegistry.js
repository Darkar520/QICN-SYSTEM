import fs from 'fs';

const readJson = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const COMPARATIVE_PROGRAM_ARTIFACT_SCHEMA = Object.freeze(
  readJson('../../docs/comparative_program_artifact_schema.v1.json')
);

export const COMPARATIVE_PROGRAM_EXPECTED_ARTIFACTS = Object.freeze(
  Object.keys(COMPARATIVE_PROGRAM_ARTIFACT_SCHEMA.artifacts || {})
);

export const COMPARATIVE_PROGRAM_IMPLEMENTED_ARTIFACTS = Object.freeze(
  Object.entries(COMPARATIVE_PROGRAM_ARTIFACT_SCHEMA.artifacts || {})
    .filter(([, spec]) => typeof spec.status === 'string' && spec.status.startsWith('implemented'))
    .map(([artifactName]) => artifactName)
);

export const getComparativeArtifactSpec = (artifactName) =>
  COMPARATIVE_PROGRAM_ARTIFACT_SCHEMA.artifacts?.[artifactName] || null;

export default {
  COMPARATIVE_PROGRAM_ARTIFACT_SCHEMA,
  COMPARATIVE_PROGRAM_EXPECTED_ARTIFACTS,
  COMPARATIVE_PROGRAM_IMPLEMENTED_ARTIFACTS,
  getComparativeArtifactSpec
};

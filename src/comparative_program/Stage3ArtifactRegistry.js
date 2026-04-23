import fs from 'fs';

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const STAGE3_ARTIFACT_SCHEMA = Object.freeze(
  readJson('../../docs/stage3_artifact_schema.v1.json')
);

export const STAGE3_EXPECTED_ARTIFACTS = Object.freeze(
  Object.keys(STAGE3_ARTIFACT_SCHEMA.artifacts || {})
);

export const getStage3ArtifactSpec = (artifactName) =>
  STAGE3_ARTIFACT_SCHEMA.artifacts?.[artifactName] || null;

export default {
  STAGE3_ARTIFACT_SCHEMA,
  STAGE3_EXPECTED_ARTIFACTS,
  getStage3ArtifactSpec
};

import fs from 'fs';

const readJson = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const SUBJECTIVITY_PROTOCOL_MANIFEST = Object.freeze(
  readJson('../../docs/subjectivity_protocol.v1.json')
);

export const SUBJECTIVITY_ARTIFACT_SCHEMA = Object.freeze(
  readJson('../../docs/subjectivity_artifact_schema.v1.json')
);

export const SUBJECTIVITY_EXPECTED_ARTIFACTS = Object.freeze(
  Object.keys(SUBJECTIVITY_ARTIFACT_SCHEMA.artifacts || {})
);

export const listSubjectivityArtifacts = () => [...SUBJECTIVITY_EXPECTED_ARTIFACTS];

export const getSubjectivityArtifactSpec = (artifactName) =>
  SUBJECTIVITY_ARTIFACT_SCHEMA.artifacts?.[artifactName] || null;

export const getSubjectivityProtocolManifest = () => SUBJECTIVITY_PROTOCOL_MANIFEST;

export default {
  SUBJECTIVITY_PROTOCOL_MANIFEST,
  SUBJECTIVITY_ARTIFACT_SCHEMA,
  SUBJECTIVITY_EXPECTED_ARTIFACTS,
  listSubjectivityArtifacts,
  getSubjectivityArtifactSpec,
  getSubjectivityProtocolManifest
};

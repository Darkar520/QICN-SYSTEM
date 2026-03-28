import fs from 'fs';

const readJson = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const SUBJECTIVITY_SURFACE_POLICY = Object.freeze(
  readJson('../../docs/subjectivity_surface_policy.v1.json')
);

export const getSubjectivitySurfacePolicy = () => SUBJECTIVITY_SURFACE_POLICY;

export const getSubjectivityArtifactSurfacePolicy = (artifactName) =>
  SUBJECTIVITY_SURFACE_POLICY.outputs?.[artifactName] || null;

export default {
  SUBJECTIVITY_SURFACE_POLICY,
  getSubjectivitySurfacePolicy,
  getSubjectivityArtifactSurfacePolicy
};

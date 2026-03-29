import fs from 'fs';

const readJson = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const PHENOMENAL_BRIDGE_PROTOCOL = Object.freeze(
  readJson('../../docs/phenomenal_bridge_protocol.v1.json')
);

export const PHENOMENAL_BRIDGE_ARTIFACT_SCHEMA = Object.freeze(
  readJson('../../docs/phenomenal_bridge_artifact_schema.v1.json')
);

export const PHENOMENAL_BRIDGE_EXPECTED_ARTIFACTS = Object.freeze(
  Object.keys(PHENOMENAL_BRIDGE_ARTIFACT_SCHEMA.artifacts || {})
);

export const listPhenomenalBridgeArtifacts = () => [...PHENOMENAL_BRIDGE_EXPECTED_ARTIFACTS];

export const getPhenomenalBridgeArtifactSpec = (artifactName) =>
  PHENOMENAL_BRIDGE_ARTIFACT_SCHEMA.artifacts?.[artifactName] || null;

export const getPhenomenalBridgeProtocolManifest = () => PHENOMENAL_BRIDGE_PROTOCOL;

export default {
  PHENOMENAL_BRIDGE_PROTOCOL,
  PHENOMENAL_BRIDGE_ARTIFACT_SCHEMA,
  PHENOMENAL_BRIDGE_EXPECTED_ARTIFACTS,
  listPhenomenalBridgeArtifacts,
  getPhenomenalBridgeArtifactSpec,
  getPhenomenalBridgeProtocolManifest
};

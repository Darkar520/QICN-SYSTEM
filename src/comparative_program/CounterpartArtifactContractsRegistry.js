import fs from 'fs';

const readJson = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const COUNTERPART_ARTIFACT_CONTRACTS = Object.freeze(
  readJson('../../docs/counterpart_artifact_contracts.v1.json')
);

export const listCounterpartArtifactContracts = () => [
  ...(COUNTERPART_ARTIFACT_CONTRACTS.contracts || [])
];

export default {
  COUNTERPART_ARTIFACT_CONTRACTS,
  listCounterpartArtifactContracts
};
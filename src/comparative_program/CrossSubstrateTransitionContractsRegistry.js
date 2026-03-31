import fs from 'fs';

const readJson = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const CROSS_SUBSTRATE_TRANSITION_CONTRACTS = Object.freeze(
  readJson('../../docs/cross_substrate_transition_contracts.v1.json')
);

export const listCrossSubstrateTransitionContracts = () => [
  ...(CROSS_SUBSTRATE_TRANSITION_CONTRACTS.transition_contracts || [])
];

export default {
  CROSS_SUBSTRATE_TRANSITION_CONTRACTS,
  listCrossSubstrateTransitionContracts
};
import fs from 'fs';

const readJson = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const HOMOLOGATION_CONTRACTS = Object.freeze(
  readJson('../../docs/homologation_contracts.v1.json')
);

export const listHomologationContracts = () => [
  ...(HOMOLOGATION_CONTRACTS.homologation_units || [])
];

export default {
  HOMOLOGATION_CONTRACTS,
  listHomologationContracts
};
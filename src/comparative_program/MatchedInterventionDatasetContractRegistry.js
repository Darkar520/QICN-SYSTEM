import fs from 'fs';

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const MATCHED_INTERVENTION_DATASET_CONTRACTS = Object.freeze(
  readJson('../../docs/matched_intervention_dataset_contracts.v1.json')
);

export const listMatchedInterventionDatasetContracts = () => [
  ...(MATCHED_INTERVENTION_DATASET_CONTRACTS.channel_bindings || [])
];

export const getMatchedInterventionDatasetContractForChannel = (channelId) =>
  listMatchedInterventionDatasetContracts().find((entry) => entry.channel_id === channelId) || null;

export default {
  MATCHED_INTERVENTION_DATASET_CONTRACTS,
  listMatchedInterventionDatasetContracts,
  getMatchedInterventionDatasetContractForChannel
};

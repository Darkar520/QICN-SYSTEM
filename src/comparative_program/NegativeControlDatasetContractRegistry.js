import fs from 'fs';

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const NEGATIVE_CONTROL_DATASET_CONTRACTS = Object.freeze(
  readJson('../../docs/negative_control_dataset_contracts.v1.json')
);

export const listNegativeControlDatasetContracts = () => [
  ...(NEGATIVE_CONTROL_DATASET_CONTRACTS.negative_control_families || [])
];

export const getNegativeControlDatasetContractForChannel = (channelId) =>
  listNegativeControlDatasetContracts().find((entry) => entry.channel_id === channelId) || null;

export default {
  NEGATIVE_CONTROL_DATASET_CONTRACTS,
  listNegativeControlDatasetContracts,
  getNegativeControlDatasetContractForChannel
};

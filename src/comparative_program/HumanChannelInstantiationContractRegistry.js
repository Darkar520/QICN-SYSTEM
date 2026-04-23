import fs from 'fs';

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const HUMAN_CHANNEL_INSTANTIATION_CONTRACTS = Object.freeze(
  readJson('../../docs/human_channel_instantiation_contracts.v1.json')
);

export const listHumanChannelInstantiationContracts = () => [
  ...(HUMAN_CHANNEL_INSTANTIATION_CONTRACTS.channels || [])
];

export const getHumanChannelInstantiationContract = (channelId) =>
  listHumanChannelInstantiationContracts().find((entry) => entry.channel_id === channelId) || null;

export const listHumanChannelInstantiationStates = () => [
  ...(HUMAN_CHANNEL_INSTANTIATION_CONTRACTS.instantiation_states || [])
];

export default {
  HUMAN_CHANNEL_INSTANTIATION_CONTRACTS,
  listHumanChannelInstantiationContracts,
  getHumanChannelInstantiationContract,
  listHumanChannelInstantiationStates
};

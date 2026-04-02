import fs from 'fs';

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const HUMAN_CHANNEL_INSTANTIATION_PROTOCOLS = Object.freeze(
  readJson('../../docs/human_channel_instantiation_protocols.v1.json')
);

export const listHumanChannelInstantiationProtocols = () =>
  [...(HUMAN_CHANNEL_INSTANTIATION_PROTOCOLS.channel_protocols || [])];

export const getHumanChannelInstantiationProtocol = (channelId) =>
  (HUMAN_CHANNEL_INSTANTIATION_PROTOCOLS.channel_protocols || []).find(
    (entry) => entry.channel_id === channelId
  ) || null;

export default {
  HUMAN_CHANNEL_INSTANTIATION_PROTOCOLS,
  listHumanChannelInstantiationProtocols,
  getHumanChannelInstantiationProtocol
};

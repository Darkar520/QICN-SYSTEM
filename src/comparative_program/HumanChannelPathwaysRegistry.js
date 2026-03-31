import fs from 'fs';

const readJson = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const HUMAN_CHANNEL_PATHWAYS = Object.freeze(
  readJson('../../docs/human_channel_pathways.v1.json')
);

export const listHumanChannelPathways = () => [
  ...(HUMAN_CHANNEL_PATHWAYS.pathways || [])
];

export default {
  HUMAN_CHANNEL_PATHWAYS,
  listHumanChannelPathways
};
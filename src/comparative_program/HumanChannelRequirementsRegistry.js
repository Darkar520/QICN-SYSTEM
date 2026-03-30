import fs from 'fs';

const readJson = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const HUMAN_CHANNEL_REQUIREMENTS = Object.freeze(
  readJson('../../docs/human_channel_requirements.v1.json')
);

export const listHumanChannelRequirements = () => [
  ...(HUMAN_CHANNEL_REQUIREMENTS.channels || [])
];

export default {
  HUMAN_CHANNEL_REQUIREMENTS,
  listHumanChannelRequirements
};

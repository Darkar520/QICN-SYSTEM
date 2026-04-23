import fs from 'fs';

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const HUMAN_CHANNEL_PREREGISTRATION_TEMPLATES = Object.freeze(
  readJson('../../docs/human_channel_preregistration_templates.v1.json')
);

export const listHumanChannelPreregistrationTemplates = () => [
  ...(HUMAN_CHANNEL_PREREGISTRATION_TEMPLATES.channel_templates || [])
];

export const getHumanChannelPreregistrationTemplate = (channelId) =>
  listHumanChannelPreregistrationTemplates().find((entry) => entry.channel_id === channelId) || null;

export const listHumanChannelPreregistrationStates = () => [
  ...(HUMAN_CHANNEL_PREREGISTRATION_TEMPLATES.status_classes || [])
];

export default {
  HUMAN_CHANNEL_PREREGISTRATION_TEMPLATES,
  listHumanChannelPreregistrationTemplates,
  getHumanChannelPreregistrationTemplate,
  listHumanChannelPreregistrationStates
};

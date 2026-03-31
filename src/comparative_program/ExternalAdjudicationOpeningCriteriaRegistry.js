import fs from 'fs';

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const EXTERNAL_ADJUDICATION_OPENING_CRITERIA = Object.freeze(
  readJson('../../docs/external_adjudication_opening_criteria.v1.json')
);

export const listAdjudicationChannelCriteria = () => [
  ...(EXTERNAL_ADJUDICATION_OPENING_CRITERIA.required_human_channel_classes || [])
];

export const listAdjudicationCriteriaStatuses = () => [
  ...(EXTERNAL_ADJUDICATION_OPENING_CRITERIA.criteria_status_classes || [])
];

export const listInstantiationStatuses = () => [
  ...(EXTERNAL_ADJUDICATION_OPENING_CRITERIA.instantiation_status_classes || [])
];

export default {
  EXTERNAL_ADJUDICATION_OPENING_CRITERIA,
  listAdjudicationChannelCriteria,
  listAdjudicationCriteriaStatuses,
  listInstantiationStatuses
};
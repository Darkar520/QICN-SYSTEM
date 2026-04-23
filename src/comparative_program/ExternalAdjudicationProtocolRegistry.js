import fs from 'fs';

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const EXTERNAL_ADJUDICATION_PROTOCOL = Object.freeze(
  readJson('../../docs/external_adjudication_protocol.v1.json')
);

export const listExternalAdjudicationObjectClasses = () => [
  ...(EXTERNAL_ADJUDICATION_PROTOCOL.object_classes || [])
];

export const listExternalAdjudicationStates = () => [
  ...(EXTERNAL_ADJUDICATION_PROTOCOL.adjudication_states || [])
];

export default {
  EXTERNAL_ADJUDICATION_PROTOCOL,
  listExternalAdjudicationObjectClasses,
  listExternalAdjudicationStates
};

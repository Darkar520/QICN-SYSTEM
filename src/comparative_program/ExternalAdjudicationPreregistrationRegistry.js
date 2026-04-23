import fs from 'fs';

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const EXTERNAL_ADJUDICATION_PREREGISTRATION_TEMPLATE = Object.freeze(
  readJson('../../docs/external_adjudication_preregistration_template.v1.json')
);

export const HUMAN_COMPARATOR_PREREGISTRATION_TEMPLATE = Object.freeze(
  readJson('../../docs/human_comparator_preregistration_template.v1.json')
);

export const listExternalPreregistrationObjectClasses = () => [
  ...(EXTERNAL_ADJUDICATION_PREREGISTRATION_TEMPLATE.preregistration_object_classes || [])
];

export default {
  EXTERNAL_ADJUDICATION_PREREGISTRATION_TEMPLATE,
  HUMAN_COMPARATOR_PREREGISTRATION_TEMPLATE,
  listExternalPreregistrationObjectClasses
};

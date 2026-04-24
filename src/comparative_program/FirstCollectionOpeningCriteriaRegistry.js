import fs from 'fs';

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const STAGE3_7_FIRST_ADMISSIBLE_COLLECTION_OPENING_CRITERIA = Object.freeze(
  readJson('../../docs/stage3_7_first_admissible_collection_opening_criteria.v1.json')
);
export const FIRST_ADMISSIBLE_COLLECTION_START_POLICY = Object.freeze(
  readJson('../../docs/first_admissible_collection_start_policy.v1.json')
);
export const COLLECTION_START_COMMAND_SCHEMA = Object.freeze(
  readJson('../../docs/collection_start_command_schema.v1.json')
);
export const OPERATOR_AUTHORIZATION_SCHEMA = Object.freeze(
  readJson('../../docs/operator_authorization_schema.v1.json')
);

export const listStage3_7OpeningRequirements = () => [
  ...(STAGE3_7_FIRST_ADMISSIBLE_COLLECTION_OPENING_CRITERIA.opening_requirements || [])
];

export default {
  STAGE3_7_FIRST_ADMISSIBLE_COLLECTION_OPENING_CRITERIA,
  FIRST_ADMISSIBLE_COLLECTION_START_POLICY,
  COLLECTION_START_COMMAND_SCHEMA,
  OPERATOR_AUTHORIZATION_SCHEMA,
  listStage3_7OpeningRequirements
};

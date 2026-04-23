import fs from 'fs';

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const ADJUDICATOR_INDEPENDENCE_CRITERIA = Object.freeze(
  readJson('../../docs/adjudicator_independence_criteria.v1.json')
);

export const listAdjudicatorStates = () => [
  ...(ADJUDICATOR_INDEPENDENCE_CRITERIA.states || [])
];

export default {
  ADJUDICATOR_INDEPENDENCE_CRITERIA,
  listAdjudicatorStates
};

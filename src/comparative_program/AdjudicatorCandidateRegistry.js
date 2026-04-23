import fs from 'fs';

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const ADJUDICATOR_CANDIDATE_SCHEMA = Object.freeze(
  readJson('../../docs/adjudicator_candidate_schema.v1.json')
);

export const listAdjudicatorCandidateClasses = () => [
  ...(ADJUDICATOR_CANDIDATE_SCHEMA.candidate_classes || [])
];

export default {
  ADJUDICATOR_CANDIDATE_SCHEMA,
  listAdjudicatorCandidateClasses
};

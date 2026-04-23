import fs from 'fs';

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const REVIEWER_CANDIDATE_POOL_FIELDS = Object.freeze(
  readJson('../../docs/reviewer_candidate_pool_fields.v1.json')
);
export const ADJUDICATOR_CANDIDATE_POOL_FIELDS = Object.freeze(
  readJson('../../docs/adjudicator_candidate_pool_fields.v1.json')
);
export const REVIEWER_CANDIDATE_POOL_TEMPLATE = Object.freeze(
  readJson('../../docs/reviewer_candidate_pool_template.v1.json')
);
export const ADJUDICATOR_CANDIDATE_POOL_TEMPLATE = Object.freeze(
  readJson('../../docs/adjudicator_candidate_pool_template.v1.json')
);

export const listCandidatePoolSlots = () => [
  ...(REVIEWER_CANDIDATE_POOL_TEMPLATE.candidate_slots || []),
  ...(ADJUDICATOR_CANDIDATE_POOL_TEMPLATE.candidate_slots || [])
];

export default {
  REVIEWER_CANDIDATE_POOL_FIELDS,
  ADJUDICATOR_CANDIDATE_POOL_FIELDS,
  REVIEWER_CANDIDATE_POOL_TEMPLATE,
  ADJUDICATOR_CANDIDATE_POOL_TEMPLATE,
  listCandidatePoolSlots
};

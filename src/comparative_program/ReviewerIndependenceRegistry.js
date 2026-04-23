import fs from 'fs';

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const REVIEWER_INDEPENDENCE_PROTOCOL = Object.freeze(
  readJson('../../docs/reviewer_independence_protocol.v1.json')
);
export const REVIEWER_SELECTION_CRITERIA = Object.freeze(
  readJson('../../docs/reviewer_selection_criteria.v1.json')
);
export const CONFLICT_OF_INTEREST_POLICY = Object.freeze(
  readJson('../../docs/conflict_of_interest_policy.v1.json')
);
export const BLINDING_POLICY = Object.freeze(
  readJson('../../docs/blinding_policy.v1.json')
);

export const listReviewerRoles = () => [
  ...(REVIEWER_INDEPENDENCE_PROTOCOL.reviewer_roles || [])
];

export default {
  REVIEWER_INDEPENDENCE_PROTOCOL,
  REVIEWER_SELECTION_CRITERIA,
  CONFLICT_OF_INTEREST_POLICY,
  BLINDING_POLICY,
  listReviewerRoles
};

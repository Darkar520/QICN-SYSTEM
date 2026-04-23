import fs from 'fs';

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const REVIEWER_CANDIDATE_SCHEMA = Object.freeze(
  readJson('../../docs/reviewer_candidate_schema.v1.json')
);
export const REVIEWER_REJECTION_REASONS = Object.freeze(
  readJson('../../docs/reviewer_rejection_reasons.v1.json')
);

export const listReviewerCandidateClasses = () => [
  ...(REVIEWER_CANDIDATE_SCHEMA.candidate_classes || [])
];

export default {
  REVIEWER_CANDIDATE_SCHEMA,
  REVIEWER_REJECTION_REASONS,
  listReviewerCandidateClasses
};

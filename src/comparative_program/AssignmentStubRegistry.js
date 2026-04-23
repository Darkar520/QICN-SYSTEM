import fs from 'fs';

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const REVIEWER_ASSIGNMENT_STUB = Object.freeze(
  readJson('../../docs/reviewer_assignment_stub.v1.json')
);
export const ADJUDICATOR_ASSIGNMENT_STUB = Object.freeze(
  readJson('../../docs/adjudicator_assignment_stub.v1.json')
);
export const REVIEWER_BLINDING_STUB = Object.freeze(
  readJson('../../docs/reviewer_blinding_stub.v1.json')
);

export default {
  REVIEWER_ASSIGNMENT_STUB,
  ADJUDICATOR_ASSIGNMENT_STUB,
  REVIEWER_BLINDING_STUB
};

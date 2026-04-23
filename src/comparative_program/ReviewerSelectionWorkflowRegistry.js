import fs from 'fs';

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const REVIEWER_SELECTION_WORKFLOW = Object.freeze(
  readJson('../../docs/reviewer_selection_workflow.v1.json')
);
export const BLINDING_ASSIGNMENT_MANIFEST = Object.freeze(
  readJson('../../docs/blinding_assignment_manifest.v1.json')
);

export const listReviewerSelectionStates = () => [
  ...(REVIEWER_SELECTION_WORKFLOW.workflow_states || [])
];

export default {
  REVIEWER_SELECTION_WORKFLOW,
  BLINDING_ASSIGNMENT_MANIFEST,
  listReviewerSelectionStates
};

import fs from 'fs';

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const ADJUDICATOR_ASSIGNMENT_WORKFLOW = Object.freeze(
  readJson('../../docs/adjudicator_assignment_workflow.v1.json')
);

export const listAdjudicatorAssignmentStates = () => [
  ...(ADJUDICATOR_ASSIGNMENT_WORKFLOW.workflow_states || [])
];

export default {
  ADJUDICATOR_ASSIGNMENT_WORKFLOW,
  listAdjudicatorAssignmentStates
};

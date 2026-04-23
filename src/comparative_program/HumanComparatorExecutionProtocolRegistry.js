import fs from 'fs';

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const HUMAN_COMPARATOR_EXECUTION_PROTOCOL = Object.freeze(
  readJson('../../docs/human_comparator_execution_protocol.v1.json')
);

export const listHumanComparatorExecutionChannels = () => [
  ...(HUMAN_COMPARATOR_EXECUTION_PROTOCOL.channels || [])
];

export const listHumanComparatorExecutionStates = () => [
  ...(HUMAN_COMPARATOR_EXECUTION_PROTOCOL.comparator_execution_states || [])
];

export default {
  HUMAN_COMPARATOR_EXECUTION_PROTOCOL,
  listHumanComparatorExecutionChannels,
  listHumanComparatorExecutionStates
};

import fs from 'fs';

const readJson = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const HUMAN_COMPARATOR_PROTOCOL = Object.freeze(
  readJson('../../docs/human_comparator_protocol.v1.json')
);

export const listComparatorObjectClasses = () => [
  ...(HUMAN_COMPARATOR_PROTOCOL.comparator_object_classes || [])
];

export const listComparatorDomains = () => [...(HUMAN_COMPARATOR_PROTOCOL.comparator_domains || [])];

export default {
  HUMAN_COMPARATOR_PROTOCOL,
  listComparatorObjectClasses,
  listComparatorDomains
};

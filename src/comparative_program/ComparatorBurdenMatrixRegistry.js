import fs from 'fs';

const readJson = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const COMPARATOR_BURDEN_MATRIX = Object.freeze(
  readJson('../../docs/comparator_burden_matrix.v1.json')
);

export const listComparatorBurdens = () => [
  ...(COMPARATOR_BURDEN_MATRIX.burdens || [])
];

export default {
  COMPARATOR_BURDEN_MATRIX,
  listComparatorBurdens
};

import fs from 'fs';

const readJson = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const HUMAN_EQUIVALENCE_LADDER = Object.freeze(
  readJson('../../docs/human_equivalence_ladder.v1.json')
);

export const listHumanEquivalenceRungs = () => [...(HUMAN_EQUIVALENCE_LADDER.rungs || [])];

export default {
  HUMAN_EQUIVALENCE_LADDER,
  listHumanEquivalenceRungs
};

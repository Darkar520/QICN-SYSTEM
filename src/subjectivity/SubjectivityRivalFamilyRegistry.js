import fs from 'fs';

const readJson = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const SUBJECTIVITY_RIVAL_FAMILY = Object.freeze(
  readJson('../../docs/subjectivity_rival_family.v1.json')
);

export const getSubjectivityRivalFamily = () => SUBJECTIVITY_RIVAL_FAMILY;

export const listSubjectivityRivals = () =>
  Array.isArray(SUBJECTIVITY_RIVAL_FAMILY.rivals)
    ? SUBJECTIVITY_RIVAL_FAMILY.rivals.map((entry) => entry.id)
    : [];

export default {
  SUBJECTIVITY_RIVAL_FAMILY,
  getSubjectivityRivalFamily,
  listSubjectivityRivals
};

import fs from 'fs';

const readJson = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const SUBJECTIVITY_THRESHOLDS = Object.freeze(
  readJson('../../docs/subjectivity_thresholds.v1.json')
);

export const getSubjectivityThresholds = () => SUBJECTIVITY_THRESHOLDS;

export default {
  SUBJECTIVITY_THRESHOLDS,
  getSubjectivityThresholds
};

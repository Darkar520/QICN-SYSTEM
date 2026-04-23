import fs from 'fs';

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const EXTERNAL_EVIDENCE_ADMISSIBILITY = Object.freeze(
  readJson('../../docs/external_evidence_admissibility_criteria.v1.json')
);

export const listExternalEvidenceClasses = () => [
  ...(EXTERNAL_EVIDENCE_ADMISSIBILITY.evidence_classes || [])
];

export default {
  EXTERNAL_EVIDENCE_ADMISSIBILITY,
  listExternalEvidenceClasses
};

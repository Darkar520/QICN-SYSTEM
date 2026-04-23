import fs from 'fs';

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const PAPER10_SCAFFOLD_MANIFEST = Object.freeze(
  readJson('../../docs/paper10_scaffold_manifest.v1.json')
);

export const listPaper10RequiredSections = () => [
  ...(PAPER10_SCAFFOLD_MANIFEST.required_sections || [])
];

export default {
  PAPER10_SCAFFOLD_MANIFEST,
  listPaper10RequiredSections
};

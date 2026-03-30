import fs from 'fs';

const readJson = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const COMPARATIVE_PROGRAM_SURFACE_POLICY = Object.freeze(
  readJson('../../docs/comparative_program_surface_policy.v1.json')
);

export default {
  COMPARATIVE_PROGRAM_SURFACE_POLICY
};

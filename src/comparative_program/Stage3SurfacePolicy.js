import fs from 'fs';

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const STAGE3_SURFACE_POLICY = Object.freeze(
  readJson('../../docs/stage3_surface_policy.v1.json')
);

export default {
  STAGE3_SURFACE_POLICY
};

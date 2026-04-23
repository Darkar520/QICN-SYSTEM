import fs from 'fs';

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const EXECUTION_PILOT_PACKAGE_MANIFEST = Object.freeze(
  readJson('../../docs/execution_pilot_package_manifest.v1.json')
);
export const SOURCE_TARGET_PAIRING_MANIFEST = Object.freeze(
  readJson('../../docs/source_target_pairing_manifest.v1.json')
);

export default {
  EXECUTION_PILOT_PACKAGE_MANIFEST,
  SOURCE_TARGET_PAIRING_MANIFEST
};

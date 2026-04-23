import fs from 'fs';

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const REPRODUCIBILITY_PACKAGE_SKELETON = Object.freeze(
  readJson('../../docs/reproducibility_package_skeleton.v1.json')
);
export const PILOT_NEGATIVE_CONTROL_BUNDLE = Object.freeze(
  readJson('../../docs/pilot_negative_control_bundle.v1.json')
);
export const PILOT_MATCHED_INTERVENTION_BUNDLE = Object.freeze(
  readJson('../../docs/pilot_matched_intervention_bundle.v1.json')
);

export default {
  REPRODUCIBILITY_PACKAGE_SKELETON,
  PILOT_NEGATIVE_CONTROL_BUNDLE,
  PILOT_MATCHED_INTERVENTION_BUNDLE
};

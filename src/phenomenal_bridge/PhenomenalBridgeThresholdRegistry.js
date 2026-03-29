import fs from 'fs';

const readJson = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const PHENOMENAL_BRIDGE_THRESHOLDS = Object.freeze(
  readJson('../../docs/phenomenal_bridge_thresholds.v1.json')
);

export const getPhenomenalBridgeThresholds = () => PHENOMENAL_BRIDGE_THRESHOLDS;

export default {
  PHENOMENAL_BRIDGE_THRESHOLDS,
  getPhenomenalBridgeThresholds
};

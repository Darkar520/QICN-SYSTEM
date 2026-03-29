import fs from 'fs';

const readJson = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const PHENOMENAL_BRIDGE_RIVAL_FAMILY = Object.freeze(
  readJson('../../docs/phenomenal_bridge_rival_family.v1.json')
);

export const getPhenomenalBridgeRivalFamily = () => PHENOMENAL_BRIDGE_RIVAL_FAMILY;

export const listPhenomenalBridgeRivals = () =>
  Array.isArray(PHENOMENAL_BRIDGE_RIVAL_FAMILY.rivals)
    ? PHENOMENAL_BRIDGE_RIVAL_FAMILY.rivals.map((entry) => entry.id)
    : [];

export default {
  PHENOMENAL_BRIDGE_RIVAL_FAMILY,
  getPhenomenalBridgeRivalFamily,
  listPhenomenalBridgeRivals
};

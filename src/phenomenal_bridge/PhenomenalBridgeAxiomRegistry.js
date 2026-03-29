import fs from 'fs';

const readJson = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const PHENOMENAL_BRIDGE_AXIOMS = Object.freeze(
  readJson('../../docs/phenomenal_bridge_axioms.v1.json')
);

export const getPhenomenalBridgeAxioms = () => PHENOMENAL_BRIDGE_AXIOMS;

export const listPhenomenalBridgeAxiomIds = () =>
  Array.isArray(PHENOMENAL_BRIDGE_AXIOMS.axioms)
    ? PHENOMENAL_BRIDGE_AXIOMS.axioms.map((entry) => entry.id)
    : [];

export default {
  PHENOMENAL_BRIDGE_AXIOMS,
  getPhenomenalBridgeAxioms,
  listPhenomenalBridgeAxiomIds
};

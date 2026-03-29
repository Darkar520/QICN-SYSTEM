import fs from 'fs';

const readJson = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const PHENOMENAL_BRIDGE_SURFACE_POLICY = Object.freeze(
  readJson('../../docs/phenomenal_bridge_surface_policy.v1.json')
);

export const getPhenomenalBridgeSurfacePolicy = () => PHENOMENAL_BRIDGE_SURFACE_POLICY;

export default {
  PHENOMENAL_BRIDGE_SURFACE_POLICY,
  getPhenomenalBridgeSurfacePolicy
};

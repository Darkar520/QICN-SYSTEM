import fs from 'fs';
import {
  PHENOMENAL_BRIDGE_PROTOCOL,
  PHENOMENAL_BRIDGE_EXPECTED_ARTIFACTS
} from './PhenomenalBridgeArtifactRegistry.js';
import { PHENOMENAL_BRIDGE_AXIOMS } from './PhenomenalBridgeAxiomRegistry.js';
import { PHENOMENAL_BRIDGE_RIVAL_FAMILY } from './PhenomenalBridgeRivalFamilyRegistry.js';
import { PHENOMENAL_BRIDGE_THRESHOLDS } from './PhenomenalBridgeThresholdRegistry.js';
import { PHENOMENAL_BRIDGE_SURFACE_POLICY } from './PhenomenalBridgeSurfacePolicy.js';

const readJson = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const PHENOMENAL_BRIDGE_ROOT_SCHEMAS = Object.freeze({
  manifest: readJson('./schemas/phenomenal_bridge_manifest.v1.json'),
  projection: readJson('./schemas/phenomenal_bridge_projection.v1.json'),
  gate_result: readJson('./schemas/phenomenal_bridge_gate_result.v1.json')
});

export const PHENOMENAL_BRIDGE_LAYER_STATUS = Object.freeze({
  layer_name: 'Phenomenal Bridge Formal Layer',
  layer_id: 'phenomenal_bridge_formal_layer.bpf0',
  implementation_status: 'scaffold_only_opening_layer',
  execution_status:
    'formal_bridge_not_runtime_not_estimator_not_intervention_not_comparator_not_gate',
  interpretation_boundary:
    'BPF-0 provides formal bridge scaffolding only. It does not implement bridge predicates, interventions, comparators, runtime artifacts, gate logic, or any phenomenal support class. It remains framework-internal only.'
});

export class PhenomenalBridgeLayer {
  describe() {
    return {
      ...PHENOMENAL_BRIDGE_LAYER_STATUS,
      predicates: PHENOMENAL_BRIDGE_PROTOCOL.bridge_target_predicates,
      axiom_count: Array.isArray(PHENOMENAL_BRIDGE_AXIOMS.axioms)
        ? PHENOMENAL_BRIDGE_AXIOMS.axioms.length
        : 0,
      planned_artifacts: PHENOMENAL_BRIDGE_EXPECTED_ARTIFACTS,
      threshold_status: PHENOMENAL_BRIDGE_THRESHOLDS.status,
      rival_family_status: PHENOMENAL_BRIDGE_RIVAL_FAMILY.comparator_implementation_status,
      default_surface_boundary: PHENOMENAL_BRIDGE_SURFACE_POLICY.default_interpretation_boundary,
      scaffold_only: true,
      not_runtime_bridge: true,
      not_phenomenality_support: true,
      framework_internal_only: true
    };
  }
}

export const createPhenomenalBridgeLayer = () => new PhenomenalBridgeLayer();

export const describePhenomenalBridgeLayerScaffold = () =>
  createPhenomenalBridgeLayer().describe();

export default {
  PHENOMENAL_BRIDGE_LAYER_STATUS,
  PHENOMENAL_BRIDGE_ROOT_SCHEMAS,
  PhenomenalBridgeLayer,
  createPhenomenalBridgeLayer,
  describePhenomenalBridgeLayerScaffold
};

import fs from 'fs';
import {
  PHENOMENAL_BRIDGE_PROTOCOL,
  PHENOMENAL_BRIDGE_EXPECTED_ARTIFACTS,
  PHENOMENAL_BRIDGE_IMPLEMENTED_ARTIFACTS
} from './PhenomenalBridgeArtifactRegistry.js';
import { PHENOMENAL_BRIDGE_AXIOMS } from './PhenomenalBridgeAxiomRegistry.js';
import { PHENOMENAL_BRIDGE_RIVAL_FAMILY } from './PhenomenalBridgeRivalFamilyRegistry.js';
import { PHENOMENAL_BRIDGE_THRESHOLDS } from './PhenomenalBridgeThresholdRegistry.js';
import { PHENOMENAL_BRIDGE_SURFACE_POLICY } from './PhenomenalBridgeSurfacePolicy.js';

const readJson = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const PHENOMENAL_BRIDGE_ROOT_SCHEMAS = Object.freeze({
  manifest: readJson('./schemas/phenomenal_bridge_manifest.v1.json'),
  projection: readJson('./schemas/phenomenal_bridge_projection.v1.json'),
  gate_result: readJson('./schemas/phenomenal_bridge_gate_result.v1.json'),
  phenomenal_differentiation_report: readJson(
    './schemas/phenomenal_differentiation_report.v1.json'
  ),
  valence_structure_report: readJson('./schemas/valence_structure_report.v1.json'),
  world_richness_report: readJson('./schemas/world_richness_report.v1.json'),
  ambiguity_bearing_report: readJson('./schemas/ambiguity_bearing_report.v1.json'),
  embodied_closure_report: readJson('./schemas/embodied_closure_report.v1.json'),
  temporal_lived_structure_report: readJson(
    './schemas/temporal_lived_structure_report.v1.json'
  )
});

export const PHENOMENAL_BRIDGE_LAYER_STATUS = Object.freeze({
  layer_name: 'Phenomenal Bridge Formal Layer',
  layer_id: 'phenomenal_bridge_formal_layer.bpf1',
  implementation_status: 'provisional_bridge_surfaces_implemented',
  execution_status:
    'executing_provisional_bridge_surfaces_pre_comparator_pre_intervention_pre_gate',
  interpretation_boundary:
    'BPF-1 preserves the BPF-0 scaffold while adding provisional bridge coordinate surfaces and run-level bridge reports. It still does not implement comparator closure, intervention closure, bridge gate logic, bridge support classes, ecosystem bridge integration, phenomenality evidence, or Paper 9 authorization.'
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
      implemented_run_level_artifacts: PHENOMENAL_BRIDGE_IMPLEMENTED_ARTIFACTS,
      threshold_status: PHENOMENAL_BRIDGE_THRESHOLDS.status,
      rival_family_status: PHENOMENAL_BRIDGE_RIVAL_FAMILY.comparator_implementation_status,
      default_surface_boundary: PHENOMENAL_BRIDGE_SURFACE_POLICY.default_interpretation_boundary,
      scaffold_opening_intact: true,
      provisional_runtime_surfaces: true,
      not_runtime_bridge_gate: true,
      not_runtime_bridge_comparator: true,
      not_runtime_bridge_intervention_harness: true,
      not_bridge_support: true,
      not_phenomenality_support: true,
      framework_internal_only: true
    };
  }
}

export const createPhenomenalBridgeLayer = () => new PhenomenalBridgeLayer();

export const describePhenomenalBridgeLayer = () => createPhenomenalBridgeLayer().describe();
export const describePhenomenalBridgeLayerScaffold = () => describePhenomenalBridgeLayer();

export default {
  PHENOMENAL_BRIDGE_LAYER_STATUS,
  PHENOMENAL_BRIDGE_ROOT_SCHEMAS,
  PhenomenalBridgeLayer,
  createPhenomenalBridgeLayer,
  describePhenomenalBridgeLayer,
  describePhenomenalBridgeLayerScaffold
};

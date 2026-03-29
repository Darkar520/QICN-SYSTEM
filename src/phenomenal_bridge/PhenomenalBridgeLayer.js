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
  ),
  bridge_intervention_profile: readJson('./schemas/bridge_intervention_profile.v1.json'),
  bridge_reducibility_report: readJson('./schemas/bridge_reducibility_report.v1.json')
});

export const PHENOMENAL_BRIDGE_LAYER_STATUS = Object.freeze({
  layer_name: 'Phenomenal Bridge Formal Layer',
  layer_id: 'phenomenal_bridge_formal_layer.bpfm2',
  implementation_status: 'adversarial_bridge_runtime_implemented',
  execution_status:
    'executing_provisional_bridge_surfaces_with_adversarial_bridge_burden_pre_gate_pre_ecosystem',
  interpretation_boundary:
    'BPF-M2 preserves the BPF-0 scaffold and the BPF-1 surface layer while adding a bridge-specific intervention family, matched controls, executable weak rivals, admissible pairwise composites, a shared bridge loss family, and a bridge reducibility artifact. It still does not implement a bridge gate, bridge root verdict artifacts, bridge ecosystem integration, bridge support classes, phenomenality evidence, or Paper 9 authorization.'
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
      runtime_bridge_comparator_implemented: true,
      runtime_bridge_intervention_harness_implemented: true,
      runtime_bridge_reducibility_artifact_implemented: true,
      not_runtime_bridge_root_verdict: true,
      not_runtime_bridge_ecosystem_integration: true,
      not_runtime_bridge_candidate_integration: true,
      not_runtime_bridge_audit_integration: true,
      not_paper9_authorization: true,
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

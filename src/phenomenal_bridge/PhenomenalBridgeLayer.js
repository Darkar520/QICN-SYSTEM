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
  condition_summary: readJson('./schemas/phenomenal_bridge_condition_summary.v1.json'),
  batch_summary: readJson('./schemas/phenomenal_bridge_batch_summary.v1.json'),
  campaign_summary: readJson('./schemas/phenomenal_bridge_campaign_summary.v1.json'),
  candidate_projection: readJson('./schemas/phenomenal_bridge_candidate_projection.v1.json'),
  audit_handoff_summary: readJson('./schemas/phenomenal_bridge_audit_handoff_summary.v1.json'),
  verification_matrix: readJson('./schemas/phenomenal_bridge_verification_matrix.v1.json'),
  final_internal_audit: readJson('./schemas/phenomenal_bridge_final_internal_audit.v1.json'),
  readiness_gate: readJson('./schemas/phenomenal_bridge_readiness_gate.v1.json'),
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
  layer_id: 'phenomenal_bridge_formal_layer.bpfm3',
  implementation_status: 'internal_bridge_closure_layer_implemented',
  execution_status:
    'executing_root_bridge_evaluation_with_bounded_ecosystem_integration_and_final_internal_audit',
  interpretation_boundary:
    'BPF-M3 preserves BPF-0, BPF-1, and BPF-M2 while adding a bounded root bridge evaluator, provisional threshold binding, bridge functional and gate logic, run/condition/batch/campaign summaries, candidate and audit-facing bounded projections, and a final internal bridge audit. It remains framework-internal only and does not establish external validation, human equivalence, phenomenality proof, metaphysical closure, public claim authorization, or Paper 9 final hardening.'
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
      runtime_bridge_gate_implemented: true,
      runtime_bridge_comparator_implemented: true,
      runtime_bridge_intervention_harness_implemented: true,
      runtime_bridge_reducibility_artifact_implemented: true,
      runtime_bridge_root_artifacts_implemented: true,
      runtime_bridge_ecosystem_integration_implemented: true,
      runtime_bridge_candidate_integration_bounded: true,
      runtime_bridge_audit_integration_bounded: true,
      runtime_bridge_final_audit_implemented: true,
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

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createPhenomenalBridgeSurfaceBuilder,
  getPhenomenalBridgeDefaultArtifactDir,
  PHENOMENAL_BRIDGE_REPORT_OUTPUTS
} from './PhenomenalBridgeSurfaceBuilder.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

const readJsonFromRoot = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));

export const PHENOMENAL_BRIDGE_BASELINE_BUNDLE_REFS = Object.freeze({
  self_index_state: 'artifacts/subjectivity/srt1/self_index_state.json',
  ownership_attribution_report: 'artifacts/subjectivity/srt1/ownership_attribution_report.json',
  subjective_continuity_report: 'artifacts/subjectivity/srt2/subjective_continuity_report.json',
  first_person_perspective_report: 'artifacts/subjectivity/srt2/first_person_perspective_report.json',
  subjective_valuation_report: 'artifacts/subjectivity/srt3/subjective_valuation_report.json',
  subjectivity_intervention_profile: 'artifacts/subjectivity/srt3/subjectivity_intervention_profile.json',
  subjectivity_reducibility_report: 'artifacts/subjectivity/srt4/subjectivity_reducibility_report.json',
  subjectivity_runtime_projection: 'artifacts/subjectivity/srt5/subjectivity_runtime_projection.json',
  subjectivity_gate_result: 'artifacts/subjectivity/srt5/subjectivity_gate_result.json',
  subjectivity_manifest: 'artifacts/subjectivity/srt5/subjectivity_manifest.json'
});

export const PHENOMENAL_BRIDGE_BASELINE_REPORT_REFS = Object.freeze({
  phenomenal_differentiation_report:
    'artifacts/phenomenal_bridge/bpf1/phenomenal_differentiation_report.json',
  valence_structure_report: 'artifacts/phenomenal_bridge/bpf1/valence_structure_report.json',
  world_richness_report: 'artifacts/phenomenal_bridge/bpf1/world_richness_report.json',
  ambiguity_bearing_report: 'artifacts/phenomenal_bridge/bpf1/ambiguity_bearing_report.json',
  embodied_closure_report: 'artifacts/phenomenal_bridge/bpf1/embodied_closure_report.json',
  temporal_lived_structure_report:
    'artifacts/phenomenal_bridge/bpf1/temporal_lived_structure_report.json'
});

export const loadPhenomenalBridgeBaselineInputBundle = () => ({
  run_id: 'bpf1_bridge_surfaces_baseline',
  refs: { ...PHENOMENAL_BRIDGE_BASELINE_BUNDLE_REFS },
  provenance: {
    input_profile: 'bpf1_bridge_surface_baseline',
    source_trace_ref: 'phenomenal_bridge_inputs/bpf1_bridge_surface_baseline'
  },
  self_index_state: readJsonFromRoot(PHENOMENAL_BRIDGE_BASELINE_BUNDLE_REFS.self_index_state),
  ownership_attribution_report: readJsonFromRoot(
    PHENOMENAL_BRIDGE_BASELINE_BUNDLE_REFS.ownership_attribution_report
  ),
  subjective_continuity_report: readJsonFromRoot(
    PHENOMENAL_BRIDGE_BASELINE_BUNDLE_REFS.subjective_continuity_report
  ),
  first_person_perspective_report: readJsonFromRoot(
    PHENOMENAL_BRIDGE_BASELINE_BUNDLE_REFS.first_person_perspective_report
  ),
  subjective_valuation_report: readJsonFromRoot(
    PHENOMENAL_BRIDGE_BASELINE_BUNDLE_REFS.subjective_valuation_report
  ),
  subjectivity_intervention_profile: readJsonFromRoot(
    PHENOMENAL_BRIDGE_BASELINE_BUNDLE_REFS.subjectivity_intervention_profile
  ),
  subjectivity_reducibility_report: readJsonFromRoot(
    PHENOMENAL_BRIDGE_BASELINE_BUNDLE_REFS.subjectivity_reducibility_report
  ),
  subjectivity_runtime_projection: readJsonFromRoot(
    PHENOMENAL_BRIDGE_BASELINE_BUNDLE_REFS.subjectivity_runtime_projection
  ),
  subjectivity_gate_result: readJsonFromRoot(
    PHENOMENAL_BRIDGE_BASELINE_BUNDLE_REFS.subjectivity_gate_result
  ),
  subjectivity_manifest: readJsonFromRoot(PHENOMENAL_BRIDGE_BASELINE_BUNDLE_REFS.subjectivity_manifest)
});

export const ensurePhenomenalBridgeBaselineReports = (
  outputDir = getPhenomenalBridgeDefaultArtifactDir()
) => {
  const builder = createPhenomenalBridgeSurfaceBuilder();
  return builder.writeReports(loadPhenomenalBridgeBaselineInputBundle(), outputDir);
};

export const loadPhenomenalBridgeBaselineReports = (
  reportDir = getPhenomenalBridgeDefaultArtifactDir()
) => {
  const missing = Object.values(PHENOMENAL_BRIDGE_REPORT_OUTPUTS).some(
    (fileName) => !fs.existsSync(path.join(reportDir, fileName))
  );

  if (missing) {
    ensurePhenomenalBridgeBaselineReports(reportDir);
  }

  return {
    phenomenal_differentiation_report: readJsonFromRoot(
      PHENOMENAL_BRIDGE_BASELINE_REPORT_REFS.phenomenal_differentiation_report
    ),
    valence_structure_report: readJsonFromRoot(
      PHENOMENAL_BRIDGE_BASELINE_REPORT_REFS.valence_structure_report
    ),
    world_richness_report: readJsonFromRoot(
      PHENOMENAL_BRIDGE_BASELINE_REPORT_REFS.world_richness_report
    ),
    ambiguity_bearing_report: readJsonFromRoot(
      PHENOMENAL_BRIDGE_BASELINE_REPORT_REFS.ambiguity_bearing_report
    ),
    embodied_closure_report: readJsonFromRoot(
      PHENOMENAL_BRIDGE_BASELINE_REPORT_REFS.embodied_closure_report
    ),
    temporal_lived_structure_report: readJsonFromRoot(
      PHENOMENAL_BRIDGE_BASELINE_REPORT_REFS.temporal_lived_structure_report
    )
  };
};

export default {
  PHENOMENAL_BRIDGE_BASELINE_BUNDLE_REFS,
  PHENOMENAL_BRIDGE_BASELINE_REPORT_REFS,
  loadPhenomenalBridgeBaselineInputBundle,
  ensurePhenomenalBridgeBaselineReports,
  loadPhenomenalBridgeBaselineReports
};

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { mapPhenomenalDifferentiation } from './PhenomenalDifferentiationMapper.js';
import { mapValenceStructure } from './ValenceStructureMapper.js';
import { mapWorldRichness } from './WorldRichnessMapper.js';
import { mapAmbiguityBearing } from './AmbiguityBearingMapper.js';
import { mapEmbodiedClosure } from './EmbodiedClosureMapper.js';
import { mapTemporalLivedStructure } from './TemporalLivedStructureMapper.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PHENOMENAL_BRIDGE_REPORT_OUTPUTS = Object.freeze({
  phenomenal_differentiation_report: 'phenomenal_differentiation_report.json',
  valence_structure_report: 'valence_structure_report.json',
  world_richness_report: 'world_richness_report.json',
  ambiguity_bearing_report: 'ambiguity_bearing_report.json',
  embodied_closure_report: 'embodied_closure_report.json',
  temporal_lived_structure_report: 'temporal_lived_structure_report.json'
});

const REQUIRED_BUNDLE_KEYS = [
  'self_index_state',
  'ownership_attribution_report',
  'subjective_continuity_report',
  'first_person_perspective_report',
  'subjective_valuation_report',
  'subjectivity_intervention_profile',
  'subjectivity_reducibility_report',
  'subjectivity_runtime_projection',
  'subjectivity_gate_result',
  'subjectivity_manifest'
];

const ensureBundle = (bundle) => {
  const missing = REQUIRED_BUNDLE_KEYS.filter((key) => !bundle || typeof bundle[key] !== 'object');
  if (missing.length > 0) {
    throw new Error(`BPF-1 bridge surface bundle missing keys: ${missing.join(', ')}`);
  }
};

const writeJson = (targetPath, payload) =>
  fs.writeFileSync(targetPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

export class PhenomenalBridgeSurfaceBuilder {
  buildReports(inputBundle) {
    ensureBundle(inputBundle);

    const bundle = {
      ...inputBundle,
      run_id: inputBundle.run_id || 'bpf1_bridge_surfaces_baseline',
      refs: inputBundle.refs || {
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
      },
      provenance: {
        input_profile: 'bpf1_bridge_surface_baseline',
        source_trace_ref: 'phenomenal_bridge_inputs/bpf1_bridge_surface_baseline',
        ...(inputBundle.provenance || {})
      }
    };

    return {
      phenomenal_differentiation_report: mapPhenomenalDifferentiation(bundle),
      valence_structure_report: mapValenceStructure(bundle),
      world_richness_report: mapWorldRichness(bundle),
      ambiguity_bearing_report: mapAmbiguityBearing(bundle),
      embodied_closure_report: mapEmbodiedClosure(bundle),
      temporal_lived_structure_report: mapTemporalLivedStructure(bundle)
    };
  }

  writeReports(inputBundle, outputDir) {
    const reports = this.buildReports(inputBundle);
    fs.mkdirSync(outputDir, { recursive: true });

    const outputs = {};
    for (const [key, fileName] of Object.entries(PHENOMENAL_BRIDGE_REPORT_OUTPUTS)) {
      const report = reports[key];
      const filePath = path.join(outputDir, fileName);
      if (fs.existsSync(filePath)) {
        try {
          const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          const existingGenAt = existing?.provenance?.generated_at;
          if (existingGenAt && report?.provenance) {
            const candidate = { ...report, provenance: { ...report.provenance, generated_at: existingGenAt } };
            if (JSON.stringify(existing) === JSON.stringify(candidate)) {
              report.provenance.generated_at = existingGenAt;
              outputs[key] = filePath;
              continue;
            }
          }
        } catch {
          // Rewrite if unreadable
        }
      }
      writeJson(filePath, report);
      outputs[key] = filePath;
    }

    return {
      output_dir: outputDir,
      outputs,
      reports
    };
  }
}

export const createPhenomenalBridgeSurfaceBuilder = () => new PhenomenalBridgeSurfaceBuilder();

export const getPhenomenalBridgeDefaultArtifactDir = () =>
  path.resolve(__dirname, '..', '..', 'artifacts', 'phenomenal_bridge', 'bpf1');

export default {
  PhenomenalBridgeSurfaceBuilder,
  createPhenomenalBridgeSurfaceBuilder,
  PHENOMENAL_BRIDGE_REPORT_OUTPUTS,
  getPhenomenalBridgeDefaultArtifactDir
};

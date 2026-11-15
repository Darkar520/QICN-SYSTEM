import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  BRIDGE_NEGATIVE_CONTROL_DEFINITIONS,
  BRIDGE_INTERVENTION_DEFINITIONS
} from './PhenomenalBridgeInterventionDefinitions.js';
import {
  BRIDGE_PREDICATE_IDS,
  BRIDGE_PREDICATE_REPORT_KEYS,
  cloneDeep,
  getBridgeBaselineEstimates
} from './BridgeAdversarialUtils.js';
import { mean } from './BridgeSurfaceUtils.js';
import {
  loadPhenomenalBridgeBaselineInputBundle,
  ensurePhenomenalBridgeBaselineReports,
  PHENOMENAL_BRIDGE_BASELINE_BUNDLE_REFS,
  PHENOMENAL_BRIDGE_BASELINE_REPORT_REFS
} from './PhenomenalBridgeInputBundleLoader.js';
import { createPhenomenalBridgeSurfaceBuilder } from './PhenomenalBridgeSurfaceBuilder.js';
import {
  computeSixCertificates,
  runFullBodyWorldBridgeVerification
} from './BridgeTransportAndBurdensEvaluator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_OUTPUT_DIR = path.resolve(ROOT, 'artifacts', 'phenomenal_bridge', 'bpfm2');

const writeJson = (targetPath, payload) =>
  fs.writeFileSync(targetPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

const listNonTargets = (targets) =>
  BRIDGE_PREDICATE_IDS.filter((predicateId) => !targets.includes(predicateId));

const toReportRefMap = (reportRefs = PHENOMENAL_BRIDGE_BASELINE_REPORT_REFS) => ({
  phenomenal_differentiation_report: reportRefs.phenomenal_differentiation_report,
  valence_structure_report: reportRefs.valence_structure_report,
  world_richness_report: reportRefs.world_richness_report,
  ambiguity_bearing_report: reportRefs.ambiguity_bearing_report,
  embodied_closure_report: reportRefs.embodied_closure_report,
  temporal_lived_structure_report: reportRefs.temporal_lived_structure_report
});

const clamp01 = (value) => Math.min(1, Math.max(0, Number.isFinite(Number(value)) ? Number(value) : 0));

const evaluateRunAgainstBaseline = ({ runId, runType, definition, baselineEstimates, perturbedReports }) => {
  const perturbedEstimates = getBridgeBaselineEstimates(perturbedReports);
  const deltaByPredicate = Object.fromEntries(
    BRIDGE_PREDICATE_IDS.map((predicateId) => [
      predicateId,
      Number((perturbedEstimates[predicateId] - baselineEstimates[predicateId]).toFixed(12))
    ])
  );
  const dropByPredicate = Object.fromEntries(
    BRIDGE_PREDICATE_IDS.map((predicateId) => [
      predicateId,
      Number(Math.max(0, baselineEstimates[predicateId] - perturbedEstimates[predicateId]).toFixed(12))
    ])
  );

  const targetPredicates = definition.target_predicates || definition.matched_interventions || [];
  const collateralPredicates =
    runType === 'targeted_intervention' ? listNonTargets(targetPredicates) : BRIDGE_PREDICATE_IDS;
  const targetedBridgeDrop = mean(targetPredicates.map((predicateId) => dropByPredicate[predicateId]));
  const collateralDamage = mean(collateralPredicates.map((predicateId) => dropByPredicate[predicateId]));
  const interventionSelectivity = clamp01(
    targetedBridgeDrop / Math.max(1e-9, targetedBridgeDrop + collateralDamage)
  );

  const confoundFlags = [];
  const warnings = [];
  if (targetedBridgeDrop < 0.05) {
    confoundFlags.push('non_informative_target_drop');
  }
  if (collateralDamage >= targetedBridgeDrop && collateralDamage > 0.08) {
    confoundFlags.push('flat_damage_signature');
  }
  if (runType === 'targeted_intervention' && interventionSelectivity < 0.5 && targetedBridgeDrop > 0.05) {
    warnings.push('low_selectivity_signature');
  }
  if (runType === 'matched_negative_control' && targetedBridgeDrop > 0.1 && interventionSelectivity > 0.6) {
    confoundFlags.push('negative_control_mimics_targeted_signature');
  }

  const profileStatus =
    targetedBridgeDrop < 0.05
      ? runType === 'matched_negative_control'
        ? 'negative_control_stable'
        : 'non_informative_perturbation'
      : runType === 'matched_negative_control'
        ? confoundFlags.includes('negative_control_mimics_targeted_signature')
          ? 'negative_control_mimics_signature'
          : collateralDamage > targetedBridgeDrop
            ? 'negative_control_diffuse_damage'
            : 'negative_control_shift_without_target_signature'
        : confoundFlags.includes('flat_damage_signature')
          ? 'flat_damage_or_diffuse_drop'
          : interventionSelectivity >= 0.6
            ? 'selective_bridge_drop'
            : 'weakly_selective_bridge_drop';

  return {
    run_id: runId,
    run_type: runType,
    intervention_id: definition.id,
    intervention_name: definition.name,
    target_predicates: targetPredicates,
    matched_controls: definition.matched_controls || [],
    baseline_estimates: baselineEstimates,
    perturbed_estimates: perturbedEstimates,
    delta_by_predicate: deltaByPredicate,
    drop_by_predicate: dropByPredicate,
    targeted_bridge_drop: Number(targetedBridgeDrop.toFixed(12)),
    collateral_damage: Number(collateralDamage.toFixed(12)),
    intervention_selectivity: Number(interventionSelectivity.toFixed(12)),
    confound_flags: confoundFlags,
    warnings,
    profile_status: profileStatus,
    expected_strong_model_outcome: definition.expected_strong_model_outcome || null,
    expected_rival_outcomes: definition.expected_rival_outcomes || null,
    emitted_artifacts: definition.emitted_artifacts || [],
    non_implications: definition.non_implications || []
  };
};

const attachControlConfounds = (interventionRun, controlRunsById) => {
  const matchedControls = (interventionRun.matched_controls || [])
    .map((controlId) => controlRunsById[controlId])
    .filter(Boolean);

  const matchedControlSummary = matchedControls.map((controlRun) => ({
    control_id: controlRun.intervention_id,
    targeted_bridge_drop: controlRun.targeted_bridge_drop,
    collateral_damage: controlRun.collateral_damage,
    intervention_selectivity: controlRun.intervention_selectivity,
    profile_status: controlRun.profile_status
  }));

  const mimickingControls = matchedControls.filter(
    (controlRun) =>
      controlRun.targeted_bridge_drop >= Math.max(0.08, interventionRun.targeted_bridge_drop - 0.03)
      && Math.abs(controlRun.intervention_selectivity - interventionRun.intervention_selectivity) <= 0.12
  );

  const confoundFlags = [...interventionRun.confound_flags];
  const warnings = [...interventionRun.warnings];
  if (mimickingControls.length > 0) {
    confoundFlags.push('matched_control_mimics_signature');
    warnings.push('matched_control_mimics_targeted_drop');
  }

  let profileStatus = interventionRun.profile_status;
  if (mimickingControls.length > 0) {
    profileStatus = 'control_confounded_signature';
  }

  return {
    ...interventionRun,
    confound_flags: [...new Set(confoundFlags)],
    warnings: [...new Set(warnings)],
    profile_status: profileStatus,
    matched_control_summary: matchedControlSummary
  };
};

export class PhenomenalBridgeInterventionHarness {
  constructor({ surfaceBuilder = createPhenomenalBridgeSurfaceBuilder() } = {}) {
    this.surfaceBuilder = surfaceBuilder;
  }

  buildProfile({
    baselineBundle = loadPhenomenalBridgeBaselineInputBundle(),
    baselineReportResult = ensurePhenomenalBridgeBaselineReports()
  } = {}) {
    const baselineReports = baselineReportResult.reports;
    const baselineEstimates = getBridgeBaselineEstimates(baselineReports);

    const interventionRuns = BRIDGE_INTERVENTION_DEFINITIONS.map((definition) => {
      const perturbedBundle = cloneDeep(baselineBundle);
      perturbedBundle.run_id = `bpfm2_${definition.id}`;
      perturbedBundle.provenance = {
        ...(perturbedBundle.provenance || {}),
        input_profile: `bpfm2_${definition.id}`,
        source_trace_ref: `phenomenal_bridge_inputs/${definition.id}`
      };
      definition.apply(perturbedBundle);
      const perturbedReports = this.surfaceBuilder.buildReports(perturbedBundle);
      return evaluateRunAgainstBaseline({
        runId: perturbedBundle.run_id,
        runType: 'targeted_intervention',
        definition,
        baselineEstimates,
        perturbedReports
      });
    });

    const negativeControlRuns = BRIDGE_NEGATIVE_CONTROL_DEFINITIONS.map((definition) => {
      const perturbedBundle = cloneDeep(baselineBundle);
      perturbedBundle.run_id = `bpfm2_${definition.id}`;
      perturbedBundle.provenance = {
        ...(perturbedBundle.provenance || {}),
        input_profile: `bpfm2_${definition.id}`,
        source_trace_ref: `phenomenal_bridge_inputs/${definition.id}`
      };
      definition.apply(perturbedBundle);
      const perturbedReports = this.surfaceBuilder.buildReports(perturbedBundle);
      return evaluateRunAgainstBaseline({
        runId: perturbedBundle.run_id,
        runType: 'matched_negative_control',
        definition,
        baselineEstimates,
        perturbedReports
      });
    });

    const controlsById = Object.fromEntries(
      negativeControlRuns.map((run) => [run.intervention_id, run])
    );

    const hydratedInterventions = interventionRuns.map((run) => attachControlConfounds(run, controlsById));
    const confoundFlags = [...new Set(hydratedInterventions.flatMap((run) => run.confound_flags))];
    const warnings = [...new Set(hydratedInterventions.flatMap((run) => run.warnings))];
    const selectiveCount = hydratedInterventions.filter(
      (run) => run.profile_status === 'selective_bridge_drop'
    ).length;
    const controlMimicCount = hydratedInterventions.filter((run) =>
      run.confound_flags.includes('matched_control_mimics_signature')
    ).length;

    const profileStatus =
      selectiveCount >= 3 && controlMimicCount === 0
        ? 'selectivity_detected_pre_comparator'
        : selectiveCount >= 1
          ? 'mixed_selectivity_pre_comparator'
          : controlMimicCount > 0
            ? 'control_confounded_pre_comparator'
            : 'non_informative_pre_comparator';

    return {
      artifact_role: 'bridge_intervention_profile',
      artifact_name: 'bridge_intervention_profile.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      bridge_layer_id: 'phenomenal_bridge_formal_layer.bpfm2',
      implementation_status: 'bpfm2_adversarial_pre_gate',
      runtime_status: 'bridge_intervention_family_implemented_pre_comparator_gate',
      baseline_reference: {
        run_id: baselineBundle.run_id,
        upstream_bundle_refs: { ...PHENOMENAL_BRIDGE_BASELINE_BUNDLE_REFS },
        bridge_report_refs: toReportRefMap(),
        baseline_estimates: baselineEstimates
      },
      implemented_interventions: BRIDGE_INTERVENTION_DEFINITIONS.map((definition) => definition.id),
      implemented_negative_controls: BRIDGE_NEGATIVE_CONTROL_DEFINITIONS.map(
        (definition) => definition.id
      ),
      intervention_runs: hydratedInterventions,
      negative_control_runs: negativeControlRuns,
      targeted_bridge_drop: Number(
        mean(hydratedInterventions.map((run) => run.targeted_bridge_drop)).toFixed(12)
      ),
      collateral_damage: Number(
        mean(hydratedInterventions.map((run) => run.collateral_damage)).toFixed(12)
      ),
      intervention_selectivity: Number(
        mean(hydratedInterventions.map((run) => run.intervention_selectivity)).toFixed(12)
      ),
      confound_flags: confoundFlags,
      profile_status: profileStatus,
      warnings,
      comparison_readiness: profileStatus !== 'non_informative_pre_comparator',
      boundary_flags: {
        framework_internal_only: true,
        not_bridge_support: true,
        not_phenomenality_evidence: true,
        pre_comparator_bridge_artifact: true,
        pre_gate_bridge_artifact: true
      },
      non_implications: [
        'not_bridge_support',
        'not_phenomenality_evidence',
        'not_bridge_gate',
        'not_bridge_admissibility'
      ],
      allowed_surfaces: ['developer_inspection_surface', 'local_artifact_surface'],
      blocked_surfaces: [
        'local_report_surface',
        'internal_release_bundle_surface',
        'ecosystem_candidate_surface',
        'audit_facing_package_surface',
        'controlled_statement_surface',
        'external_claim_facing_surface'
      ],
      interpretation_boundary:
        'BPF-M2 intervention profiling is framework-internal and pre-gate. It reports selective or confounded perturbation structure only; it does not license bridge support, bridge admissibility, phenomenality, or any candidate or audit-facing bridge conclusion.',
      provenance: {
        generated_at: new Date().toISOString(),
        protocol_ref: 'docs/phenomenal_bridge_protocol.v1.json',
        rival_family_ref: 'docs/phenomenal_bridge_rival_family.v1.json',
        surface_policy_ref: 'docs/phenomenal_bridge_surface_policy.v1.json',
        artifact_schema_ref: 'docs/phenomenal_bridge_artifact_schema.v1.json',
        baseline_bundle_ref: 'src/phenomenal_bridge/PhenomenalBridgeInputBundleLoader.js',
        baseline_builder_ref: 'src/phenomenal_bridge/PhenomenalBridgeSurfaceBuilder.js',
        intervention_definition_ref:
          'src/phenomenal_bridge/PhenomenalBridgeInterventionDefinitions.js',
        harness_ref: 'src/phenomenal_bridge/PhenomenalBridgeInterventionHarness.js'
      },
      schema_ref: 'src/phenomenal_bridge/schemas/bridge_intervention_profile.v1.json'
    };
  }

  verifyBodyWorldPlantInterventions() {
    return runFullBodyWorldBridgeVerification();
  }

  computeLivePlantCertificates(lesion = null) {
    return computeSixCertificates(lesion);
  }

  writeProfile(options = {}, outputDir = DEFAULT_OUTPUT_DIR) {
    const profile = this.buildProfile(options);
    fs.mkdirSync(outputDir, { recursive: true });
    const targetPath = path.join(outputDir, 'bridge_intervention_profile.json');
    writeJson(targetPath, profile);
    return {
      output_dir: outputDir,
      profile,
      output_path: targetPath
    };
  }
}

export const createPhenomenalBridgeInterventionHarness = (options) =>
  new PhenomenalBridgeInterventionHarness(options);

export const getPhenomenalBridgeAdversarialArtifactDir = () => DEFAULT_OUTPUT_DIR;

export default {
  PhenomenalBridgeInterventionHarness,
  createPhenomenalBridgeInterventionHarness,
  getPhenomenalBridgeAdversarialArtifactDir
};

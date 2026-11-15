#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const ARTIFACT_PATH = path.join(
  ROOT,
  'artifacts',
  'phenomenal_bridge',
  'bpfm2',
  'bridge_intervention_profile.json'
);
const CANDIDATE_DIR = path.join(ROOT, 'artifacts', 'ecosystem_release_candidate');
const AUDIT_DIR = path.join(ROOT, 'artifacts', 'external_audit_package');

const REQUIRED_MODULES = [
  'src/phenomenal_bridge/PhenomenalBridgeInputBundleLoader.js',
  'src/phenomenal_bridge/PhenomenalBridgeInterventionDefinitions.js',
  'src/phenomenal_bridge/PhenomenalBridgeInterventionHarness.js'
];
const REQUIRED_SCHEMA = 'src/phenomenal_bridge/schemas/bridge_intervention_profile.v1.json';
const REQUIRED_INTERVENTIONS = [
  'world_richness_compression',
  'ambiguity_collapse',
  'valence_flattening',
  'perspective_detachment',
  'embodied_closure_disruption',
  'temporal_lived_fragmentation'
];
const REQUIRED_CONTROLS = [
  'richness_without_interiority_control',
  'reward_renormalization_control',
  'ambiguity_bookkeeping_control',
  'generic_semantic_density_control',
  'non_embodied_control_competence_control',
  'continuity_without_lived_structure_control',
  'flat_damage_control',
  'report_style_shift_control'
];
const LOW_LEVEL_OR_ADVERSARIAL = new Set([
  'phenomenal_differentiation_report.json',
  'valence_structure_report.json',
  'world_richness_report.json',
  'ambiguity_bearing_report.json',
  'embodied_closure_report.json',
  'temporal_lived_structure_report.json',
  'bridge_intervention_profile.json',
  'bridge_reducibility_report.json'
]);
const LOCAL_PATH_PATTERN =
  /\/c:\/|[A-Za-z]:\\Users\\|OneDrive|Escritorio|TRADING 3\.0|\.\.[/\\]release_repo_qicn_2026-03-01|\.\.[/\\]rigid-identity-framework/i;
const BANNED_PATTERNS = [
  /phenomenality achieved/i,
  /bridge support achieved/i,
  /phenomenal support/i,
  /paper ?9 authorized/i
];

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const exists = (relativePath) => fs.existsSync(path.join(ROOT, relativePath));
const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const collectFiles = (basePath) => {
  if (!fs.existsSync(basePath)) return [];
  return fs.readdirSync(basePath, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(basePath, entry.name);
    if (entry.isDirectory()) return collectFiles(fullPath);
    return [fullPath];
  });
};

const ensureNoLeakage = (payload, label) => {
  const text = JSON.stringify(payload, null, 2);
  assert(!LOCAL_PATH_PATTERN.test(text), `Path leak found in ${label}`);
  BANNED_PATTERNS.forEach((pattern) =>
    assert(!pattern.test(text), `Overclaim wording found in ${label}: ${pattern}`)
  );
};

const ensureNoLowLevelLeakage = () => {
  const leaked = [...collectFiles(CANDIDATE_DIR), ...collectFiles(AUDIT_DIR)].filter((filePath) =>
    LOW_LEVEL_OR_ADVERSARIAL.has(path.basename(filePath))
  );
  assert(leaked.length === 0, `Low-level/adversarial bridge artifacts leaked into candidate/audit surfaces: ${leaked.join(', ')}`);
};

const verifyRun = (run, expectedType) => {
  [
    'run_id',
    'run_type',
    'intervention_id',
    'baseline_estimates',
    'perturbed_estimates',
    'drop_by_predicate',
    'targeted_bridge_drop',
    'collateral_damage',
    'intervention_selectivity',
    'confound_flags',
    'profile_status'
  ].forEach((field) =>
    assert(Object.prototype.hasOwnProperty.call(run, field), `${run.intervention_id} missing ${field}`)
  );
  assert(run.run_type === expectedType, `${run.intervention_id} run_type mismatch`);
  assert(
    typeof run.targeted_bridge_drop === 'number'
      && run.targeted_bridge_drop >= 0
      && run.targeted_bridge_drop <= 1,
    `${run.intervention_id} targeted_bridge_drop must be in [0,1]`
  );
  assert(
    typeof run.collateral_damage === 'number' && run.collateral_damage >= 0 && run.collateral_damage <= 1,
    `${run.intervention_id} collateral_damage must be in [0,1]`
  );
  assert(
    typeof run.intervention_selectivity === 'number'
      && run.intervention_selectivity >= 0
      && run.intervention_selectivity <= 1,
    `${run.intervention_id} intervention_selectivity must be in [0,1]`
  );
  ['classification', 'support_class', 'gate_status', 'bridge_status'].forEach((field) =>
    assert(!Object.prototype.hasOwnProperty.call(run, field), `${run.intervention_id} must not expose ${field}`)
  );
};

const main = () => {
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'verify-phenomenal-bridge-scaffolding.cjs')], {
    stdio: 'inherit'
  });
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'verify-phenomenal-bridge-surfaces.cjs')], {
    stdio: 'inherit'
  });

  [...REQUIRED_MODULES, REQUIRED_SCHEMA].forEach((relativePath) =>
    assert(exists(relativePath), `Missing required intervention file ${relativePath}`)
  );

  const shouldWrite = process.argv.includes('--write') || !fs.existsSync(ARTIFACT_PATH);
  if (shouldWrite) {
    execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'build-phenomenal-bridge-adversarial.cjs')], {
      stdio: 'inherit'
    });
  }

  assert(fs.existsSync(ARTIFACT_PATH), 'bridge_intervention_profile.json was not emitted');
  const artifact = readJson(ARTIFACT_PATH);

  [
    'baseline_reference',
    'implemented_interventions',
    'implemented_negative_controls',
    'intervention_runs',
    'negative_control_runs',
    'targeted_bridge_drop',
    'collateral_damage',
    'intervention_selectivity',
    'confound_flags',
    'profile_status',
    'warnings',
    'comparison_readiness',
    'boundary_flags',
    'non_implications',
    'allowed_surfaces',
    'blocked_surfaces',
    'interpretation_boundary',
    'provenance',
    'schema_ref'
  ].forEach((field) =>
    assert(Object.prototype.hasOwnProperty.call(artifact, field), `Intervention artifact missing ${field}`)
  );

  assert(artifact.artifact_role === 'bridge_intervention_profile', 'Unexpected intervention artifact role');
  assert(artifact.bridge_layer_id === 'phenomenal_bridge_formal_layer.bpfm2', 'Intervention artifact must bind to BPF-M2');
  assert(
    artifact.boundary_flags.framework_internal_only === true
      && artifact.boundary_flags.not_bridge_support === true
      && artifact.boundary_flags.not_phenomenality_evidence === true
      && artifact.boundary_flags.pre_comparator_bridge_artifact === true
      && artifact.boundary_flags.pre_gate_bridge_artifact === true,
    'Intervention artifact boundary flags are incomplete'
  );
  [
    'internal_release_bundle_surface',
    'ecosystem_candidate_surface',
    'audit_facing_package_surface',
    'controlled_statement_surface',
    'external_claim_facing_surface'
  ].forEach((surface) =>
    assert(artifact.blocked_surfaces.includes(surface), `Intervention artifact must block ${surface}`)
  );
  assert(
    artifact.profile_status !== 'bridge_support' && artifact.profile_status !== 'bridge_admissible',
    'Intervention artifact must not leak support/admissibility wording'
  );

  REQUIRED_INTERVENTIONS.forEach((interventionId) =>
    assert(artifact.implemented_interventions.includes(interventionId), `Missing intervention ${interventionId}`)
  );
  REQUIRED_CONTROLS.forEach((controlId) =>
    assert(artifact.implemented_negative_controls.includes(controlId), `Missing control ${controlId}`)
  );

  assert(artifact.intervention_runs.length === REQUIRED_INTERVENTIONS.length, 'Unexpected intervention run count');
  assert(artifact.negative_control_runs.length === REQUIRED_CONTROLS.length, 'Unexpected negative control run count');
  artifact.intervention_runs.forEach((run) => verifyRun(run, 'targeted_intervention'));
  artifact.negative_control_runs.forEach((run) => verifyRun(run, 'matched_negative_control'));
  ensureNoLowLevelLeakage();
  ensureNoLeakage(artifact, 'bridge_intervention_profile.json');

  console.log('PASS verify-phenomenal-bridge-interventions');
};

try {
  main();
} catch (error) {
  console.error(`FAIL verify-phenomenal-bridge-interventions: ${error.message}`);
  process.exitCode = 1;
}

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
  'bridge_reducibility_report.json'
);
const CANDIDATE_DIR = path.join(ROOT, 'artifacts', 'ecosystem_release_candidate');
const AUDIT_DIR = path.join(ROOT, 'artifacts', 'external_audit_package');

const REQUIRED_MODULES = [
  'src/phenomenal_bridge/PhenomenalBridgeComparatorFamily.js',
  'src/phenomenal_bridge/PhenomenalBridgeReducibilityComparator.js'
];
const REQUIRED_SCHEMA = 'src/phenomenal_bridge/schemas/bridge_reducibility_report.v1.json';
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
const ALLOWED_CLASSIFICATIONS = new Set([
  'bridge_comparison_unsupported',
  'bridge_weak_model_sufficient',
  'bridge_weak_composite_sufficient',
  'bridge_irreducibility_not_supported',
  'bridge_partial_irreducibility_support'
]);
const LOCAL_PATH_PATTERN =
  /\/c:\/|[A-Za-z]:\\Users\\|OneDrive|Escritorio|TRADING 3\.0|\.\.[/\\]release_repo_qicn_2026-03-01|\.\.[/\\]rigid-identity-framework/i;
const BANNED_PATTERNS = [
  /phenomenality achieved/i,
  /bridge support achieved/i,
  /bridge_internal_strong_support/i,
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

const verifyLoss = (loss, label) => {
  ['e_fit', 'e_intervention', 'e_selectivity', 'e_predicates', 'complexity_penalty', 'total_loss'].forEach(
    (field) => {
      assert(Object.prototype.hasOwnProperty.call(loss, field), `${label} missing ${field}`);
      assert(typeof loss[field] === 'number', `${label}.${field} must be numeric`);
    }
  );
};

const main = () => {
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'verify-phenomenal-bridge-interventions.cjs')], {
    stdio: 'inherit'
  });

  [...REQUIRED_MODULES, REQUIRED_SCHEMA].forEach((relativePath) =>
    assert(exists(relativePath), `Missing required reducibility file ${relativePath}`)
  );

  assert(fs.existsSync(ARTIFACT_PATH), 'bridge_reducibility_report.json was not emitted');
  const artifact = readJson(ARTIFACT_PATH);

  [
    'baseline_bridge_bundle_reference',
    'bridge_intervention_profile_reference',
    'implemented_rivals',
    'implemented_composite_scope',
    'implemented_loss_family',
    'strong_model_loss',
    'best_weak_rival',
    'best_weak_rival_loss',
    'best_bridge_composite',
    'best_bridge_composite_loss',
    'bridge_irreducibility_margin',
    'comparison_supported',
    'classification',
    'warnings',
    'boundary_flags',
    'non_implications',
    'allowed_surfaces',
    'blocked_surfaces',
    'interpretation_boundary',
    'provenance',
    'schema_ref'
  ].forEach((field) =>
    assert(Object.prototype.hasOwnProperty.call(artifact, field), `Reducibility artifact missing ${field}`)
  );

  assert(artifact.artifact_role === 'bridge_reducibility_report', 'Unexpected reducibility artifact role');
  assert(artifact.bridge_layer_id === 'phenomenal_bridge_formal_layer.bpfm2', 'Reducibility artifact must bind to BPF-M2');
  assert(ALLOWED_CLASSIFICATIONS.has(artifact.classification), 'Unexpected reducibility classification');
  assert(
    artifact.boundary_flags.framework_internal_only === true
      && artifact.boundary_flags.not_bridge_support === true
      && artifact.boundary_flags.not_phenomenality_evidence === true
      && artifact.boundary_flags.pre_gate_bridge_artifact === true
      && artifact.boundary_flags.pre_ecosystem_bridge_artifact === true,
    'Reducibility artifact boundary flags are incomplete'
  );
  [
    'internal_release_bundle_surface',
    'ecosystem_candidate_surface',
    'audit_facing_package_surface',
    'controlled_statement_surface',
    'external_claim_facing_surface'
  ].forEach((surface) =>
    assert(artifact.blocked_surfaces.includes(surface), `Reducibility artifact must block ${surface}`)
  );
  verifyLoss(artifact.strong_model_loss, 'strong_model_loss');
  verifyLoss(artifact.best_weak_rival.loss, 'best_weak_rival.loss');
  verifyLoss(artifact.best_bridge_composite.loss, 'best_bridge_composite.loss');
  assert(typeof artifact.bridge_irreducibility_margin === 'number', 'bridge_irreducibility_margin must be numeric');
  assert(
    artifact.implemented_loss_family.formula.includes('L_b(M)='),
    'Loss family formula must be explicit'
  );
  assert(artifact.implemented_rivals.length >= 7, 'Bridge reducibility artifact must expose the implemented rival family');
  assert(
    artifact.implemented_composite_scope.includes('pairwise'),
    'Composite scope must remain explicitly bounded'
  );
  ['gate_status', 'support_class', 'bridge_support', 'bridge_admissibility'].forEach((field) =>
    assert(!Object.prototype.hasOwnProperty.call(artifact, field), `Reducibility artifact must not expose ${field}`)
  );
  ensureNoLowLevelLeakage();
  ensureNoLeakage(artifact, 'bridge_reducibility_report.json');

  console.log('PASS verify-phenomenal-bridge-reducibility');
};

try {
  main();
} catch (error) {
  console.error(`FAIL verify-phenomenal-bridge-reducibility: ${error.message}`);
  process.exitCode = 1;
}

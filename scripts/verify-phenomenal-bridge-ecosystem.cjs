#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const BPFM3_DIR = path.join(ROOT, 'artifacts', 'phenomenal_bridge', 'bpfm3');
const INTERNAL_RELEASE_DIR = path.join(ROOT, 'artifacts', 'internal_release');
const CANDIDATE_ROOT = path.join(ROOT, 'artifacts', 'ecosystem_release_candidate');
const AUDIT_ROOT = path.join(ROOT, 'artifacts', 'external_audit_package');
const LOCAL_PATH_PATTERN =
  /\/c:\/|[A-Za-z]:\\Users\\|OneDrive|Escritorio|TRADING 3\.0|\.\.[/\\]release_repo_qicn_2026-03-01|\.\.[/\\]rigid-identity-framework/i;
const BANNED_PATTERNS = [
  /phenomenality achieved/i,
  /bridge support achieved/i,
  /external validation achieved/i
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

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const collectFiles = (basePath) => {
  if (!fs.existsSync(basePath)) return [];
  return fs.readdirSync(basePath, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(basePath, entry.name);
    if (entry.isDirectory()) return collectFiles(full);
    return [full];
  });
};
const latestDirByPrefix = (dir, prefix) => {
  if (!fs.existsSync(dir)) return null;
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith(prefix))
    .map((entry) => path.join(dir, entry.name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
};

const ensureNoLeakage = (payload, label) => {
  const text = JSON.stringify(payload, null, 2);
  assert(!LOCAL_PATH_PATTERN.test(text), `Path leak found in ${label}`);
  BANNED_PATTERNS.forEach((pattern) =>
    assert(!pattern.test(text), `Overclaim wording found in ${label}: ${pattern}`)
  );
};

const ensureNoTextLeaks = (dir, label) => {
  const matches = collectFiles(dir).filter((filePath) => {
    if (!/\.(json|md|txt)$/i.test(filePath)) return false;
    const text = fs.readFileSync(filePath, 'utf8');
    return LOCAL_PATH_PATTERN.test(text);
  });
  assert(matches.length === 0, `Path leaks found in ${label}: ${matches.join(', ')}`);
};

const ensureNoLowLevelLeakage = (dir, label) => {
  const leaked = collectFiles(dir).filter((filePath) => LOW_LEVEL_OR_ADVERSARIAL.has(path.basename(filePath)));
  assert(leaked.length === 0, `Low-level/adversarial artifacts leaked into ${label}: ${leaked.join(', ')}`);
};

const verifyRootEcosystemArtifacts = () => {
  const required = [
    'phenomenal_bridge_condition_summary.json',
    'phenomenal_bridge_batch_summary.json',
    'phenomenal_bridge_campaign_summary.json',
    'phenomenal_bridge_candidate_projection.json',
    'phenomenal_bridge_audit_handoff_summary.json',
    'phenomenal_bridge_verification_matrix.json',
    'phenomenal_bridge_readiness_gate.json'
  ];
  required.forEach((fileName) =>
    assert(fs.existsSync(path.join(BPFM3_DIR, fileName)), `Missing ecosystem artifact ${fileName}`)
  );

  const candidateProjection = readJson(path.join(BPFM3_DIR, 'phenomenal_bridge_candidate_projection.json'));
  const auditHandoff = readJson(path.join(BPFM3_DIR, 'phenomenal_bridge_audit_handoff_summary.json'));
  const verificationMatrix = readJson(path.join(BPFM3_DIR, 'phenomenal_bridge_verification_matrix.json'));
  const readinessGate = readJson(path.join(BPFM3_DIR, 'phenomenal_bridge_readiness_gate.json'));

  assert(candidateProjection.surface_status.ecosystem_candidate_surface.pass === true, 'Candidate surface must pass');
  assert(auditHandoff.boundary_assertions.includes('not_claim_facing'), 'Audit handoff must assert non-claim boundary');
  assert(verificationMatrix.status === 'PASS', 'Bridge verification matrix must pass');
  assert(readinessGate.bridge_readiness_state === 'bridge_internal_audit_ready', 'Unexpected bridge readiness state');
  ensureNoLeakage(candidateProjection, 'phenomenal_bridge_candidate_projection.json');
  ensureNoLeakage(auditHandoff, 'phenomenal_bridge_audit_handoff_summary.json');
  ensureNoLeakage(verificationMatrix, 'phenomenal_bridge_verification_matrix.json');
  ensureNoLeakage(readinessGate, 'phenomenal_bridge_readiness_gate.json');
};

const verifyInternalReleaseBundle = () => {
  const latest = latestDirByPrefix(INTERNAL_RELEASE_DIR, 'internal_release_');
  assert(latest, 'Missing internal release bundle directory');
  const manifest = readJson(path.join(latest, 'release_bundle_manifest.json'));
  assert(manifest.phenomenal_bridge_bundle, 'Internal release bundle missing bridge section');
  assert(manifest.phenomenal_bridge_bundle.support_class, 'Internal release bridge section missing support class');
  [
    'phenomenal_bridge_projection.json',
    'phenomenal_bridge_gate_result.json',
    'phenomenal_bridge_manifest.json',
    'phenomenal_bridge_candidate_projection.json',
    'phenomenal_bridge_audit_handoff_summary.json',
    'phenomenal_bridge_verification_matrix.json',
    'phenomenal_bridge_final_internal_audit.json',
    'phenomenal_bridge_readiness_gate.json'
  ].forEach((fileName) =>
    assert(fs.existsSync(path.join(latest, 'phenomenal_bridge', fileName)), `Internal release bundle missing ${fileName}`)
  );
  ensureNoLowLevelLeakage(path.join(latest, 'phenomenal_bridge'), 'internal release phenomenal_bridge');
  ensureNoTextLeaks(latest, 'internal release bundle');
};

const verifyCandidateBundle = () => {
  const manifest = readJson(path.join(CANDIDATE_ROOT, 'ecosystem_release_candidate_manifest.json'));
  assert(manifest.phenomenal_bridge, 'Candidate manifest missing bridge section');
  const bundleRoot = path.join(CANDIDATE_ROOT, 'bundles', manifest.bundle_id);
  assert(fs.existsSync(bundleRoot), 'Candidate bundle directory missing');
  [
    'phenomenal_bridge_projection.json',
    'phenomenal_bridge_gate_result.json',
    'phenomenal_bridge_manifest.json',
    'phenomenal_bridge_campaign_summary.json',
    'phenomenal_bridge_candidate_projection.json',
    'phenomenal_bridge_verification_matrix.json',
    'phenomenal_bridge_readiness_gate.json'
  ].forEach((fileName) =>
    assert(fs.existsSync(path.join(bundleRoot, 'phenomenal_bridge', fileName)), `Candidate bundle missing ${fileName}`)
  );
  assert(
    !fs.existsSync(path.join(bundleRoot, 'phenomenal_bridge', 'phenomenal_bridge_audit_handoff_summary.json')),
    'Candidate bundle must not include audit handoff summary'
  );
  assert(
    !fs.existsSync(path.join(bundleRoot, 'phenomenal_bridge', 'phenomenal_bridge_final_internal_audit.json')),
    'Candidate bundle must not include final internal audit artifact'
  );
  ensureNoLowLevelLeakage(path.join(bundleRoot, 'phenomenal_bridge'), 'candidate phenomenal_bridge');
  ensureNoTextLeaks(bundleRoot, 'candidate bundle');
};

const verifyAuditPackage = () => {
  const manifest = readJson(path.join(AUDIT_ROOT, 'external_audit_package_manifest.json'));
  assert(manifest.copied_artifacts?.phenomenal_bridge, 'Audit package manifest missing bridge copied artifacts');
  const bundleRoot = path.join(AUDIT_ROOT, 'bundles', manifest.package_id);
  assert(fs.existsSync(bundleRoot), 'Audit package bundle directory missing');
  [
    'phenomenal_bridge_projection.json',
    'phenomenal_bridge_gate_result.json',
    'phenomenal_bridge_manifest.json',
    'phenomenal_bridge_campaign_summary.json',
    'phenomenal_bridge_candidate_projection.json',
    'phenomenal_bridge_audit_handoff_summary.json',
    'phenomenal_bridge_verification_matrix.json',
    'phenomenal_bridge_readiness_gate.json'
  ].forEach((fileName) =>
    assert(fs.existsSync(path.join(bundleRoot, 'phenomenal_bridge', fileName)), `Audit package missing ${fileName}`)
  );
  assert(
    !fs.existsSync(path.join(bundleRoot, 'phenomenal_bridge', 'phenomenal_bridge_final_internal_audit.json')),
    'Audit package must not include final internal audit artifact'
  );
  ensureNoLowLevelLeakage(path.join(bundleRoot, 'phenomenal_bridge'), 'audit phenomenal_bridge');
  ensureNoTextLeaks(bundleRoot, 'audit package');
};

const main = () => {
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'verify-phenomenal-bridge-gate.cjs')], {
    stdio: 'inherit'
  });

  verifyRootEcosystemArtifacts();
  verifyInternalReleaseBundle();
  verifyCandidateBundle();
  verifyAuditPackage();

  console.log('PASS verify-phenomenal-bridge-ecosystem');
};

try {
  main();
} catch (error) {
  console.error(`FAIL verify-phenomenal-bridge-ecosystem: ${error.message}`);
  process.exitCode = 1;
}

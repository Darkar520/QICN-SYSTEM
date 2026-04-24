#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const RELEASE_ROOT = process.env.ECO_RELEASE_ROOT
  ? path.resolve(process.env.ECO_RELEASE_ROOT)
  : path.resolve(ROOT, '..', 'release_repo_qicn_2026-03-01');
const LOCAL_PATH_PATTERN =
  /\/c:\/|[A-Za-z]:\\Users\\|OneDrive|Escritorio|QICN-FRAMEWORK|Sistema Canon Sandbox|rigid-identity-framework/i;

const REQUIRED_DOCS = [
  'docs/stage3_execution_pilot_opening_criteria.v1.json',
  'docs/execution_pilot_dry_run_policy.v1.json',
  'docs/stage3_execution_pilot_boundary.md',
  'docs/external_adjudication_results_unlock_map.v1.json',
  'docs/PAPER10_FINALIZATION_UNLOCK_MAP.md',
  'docs/stage3_surface_policy.v1.json',
  'docs/stage3_artifact_schema.v1.json'
];

const REQUIRED_RUNTIME = [
  'src/comparative_program/Stage3ExecutionPilotGateBuilder.js',
  'src/comparative_program/ExecutionPilotDryRunEvaluator.js',
  'src/comparative_program/Stage3PilotPreparationBuilder.js',
  'scripts/build-stage3-execution-pilot.cjs',
  'scripts/verify-stage3-execution-pilot.cjs'
];

const REQUIRED_SCHEMAS = [
  'src/comparative_program/schemas/execution_pilot_opening_gate.v1.json',
  'src/comparative_program/schemas/execution_pilot_dry_run_status.v1.json',
  'src/comparative_program/schemas/execution_pilot_manifest.v1.json'
];

const REQUIRED_ARTIFACTS = [
  'artifacts/external_adjudication/stage3_4/execution_pilot_opening_gate.json',
  'artifacts/external_adjudication/stage3_4/execution_pilot_dry_run_status.json',
  'artifacts/external_adjudication/stage3_4/execution_pilot_manifest.json'
];

const exists = (relativePath) => fs.existsSync(path.join(ROOT, relativePath));
const readText = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const readJson = (relativePath) => JSON.parse(readText(relativePath));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const ensureFilesExist = (relativePaths) => {
  relativePaths.forEach((relativePath) => {
    assert(exists(relativePath), `Missing required Stage3-4 surface: ${relativePath}`);
  });
};

const ensureNoPathLeaks = (relativePaths) => {
  relativePaths.forEach((relativePath) => {
    const text = readText(relativePath);
    assert(!LOCAL_PATH_PATTERN.test(text), `Path leak found in ${relativePath}`);
  });
};

const runNodeCheck = (relativePath) => {
  cp.execFileSync('node', ['--check', path.join(ROOT, relativePath)], {
    cwd: ROOT,
    stdio: 'pipe'
  });
};

const verifyArtifacts = () => {
  const gate = readJson('artifacts/external_adjudication/stage3_4/execution_pilot_opening_gate.json');
  const dryRun = readJson('artifacts/external_adjudication/stage3_4/execution_pilot_dry_run_status.json');
  const manifest = readJson('artifacts/external_adjudication/stage3_4/execution_pilot_manifest.json');

  assert(gate.execution_pilot_state === 'execution_pilot_ready_for_dry_run', 'Pilot gate must reach ready_for_dry_run');
  assert(Array.isArray(gate.dry_run_blockers) && gate.dry_run_blockers.length === 0, 'Pilot gate must have no dry-run blockers');
  assert(dryRun.execution_pilot_state === 'execution_pilot_dry_run_open', 'Dry-run must be open');
  assert(dryRun.evidence_state === 'execution_pilot_not_evidential', 'Dry-run must remain non-evidential');
  assert(dryRun.adjudication_state === 'execution_pilot_not_adjudicative', 'Dry-run must remain non-adjudicative');
  assert(dryRun.collection_session_state === 'collection_sessions_not_started', 'Collection sessions must remain not started');
  assert(manifest.execution_pilot_state === dryRun.execution_pilot_state, 'Pilot manifest must match dry-run state');
  assert(manifest.paper10_authorization_state === 'paper10_not_final_authorized', 'Paper 10 must remain not final-authorized');
};

const verifyRuntimeImport = async () => {
  const moduleUrl = pathToFileURL(path.join(ROOT, 'src', 'comparative_program', 'index.js')).href;
  const comparative = await import(moduleUrl);
  const description = comparative.describeComparativeProgramLayer();
  assert(description.stage3_4_dry_run_layer_present === true, 'Comparative layer must advertise Stage3-4 presence');
  assert(description.stage3_4_execution_pilot_state === 'execution_pilot_dry_run_open', 'Comparative layer must advertise dry-run open state');
  assert(
    [
      'stage3_4_execution_pilot_dry_run',
      'stage3_5_rehearsal_ready',
      'stage3_6_collection_open_pre_evidential',
      'stage3_6b_runtime_blocked',
      'stage3_6b_runtime_ready',
      'stage3_6b_runtime_ready_with_warnings',
      'stage3_7_opening_blocked_by_runtime_health',
      'stage3_7_opening_blocked_by_clean_room',
      'stage3_7_first_collection_openable'
    ].includes(description.current_stage3_substage),
    'Comparative layer must advertise Stage3-4 dry-run or a later bounded rehearsal, controlled-execution, runtime-audit, or Stage3-7 substage'
  );
};

const verifyReleaseUnchanged = () => {
  assert(fs.existsSync(path.join(RELEASE_ROOT, '.git')), 'QICN-RELEASE repo root missing for unchanged-state verification');
  const status = cp.execFileSync('git', ['status', '--short'], {
    cwd: RELEASE_ROOT,
    encoding: 'utf8'
  }).trim();
  assert(status === '', 'QICN-RELEASE changed during Stage3-4 hardening');
};

const verifyDependentScriptsPass = () => {
  [
    'scripts/verify-stage3-prereg-freeze.cjs',
    'scripts/verify-stage3-execution-readiness.cjs',
    'scripts/verify-stage3-opening-readiness.cjs',
    'scripts/verify-paper9-handoff-readiness.cjs',
    'scripts/verify-source-of-truth.cjs',
    'scripts/verify-comparative-program-closure.cjs',
    'scripts/verify-stage3-scaffolding.cjs'
  ].forEach((relativePath) => {
    if (!exists(relativePath)) return;
    cp.execFileSync('node', [path.join(ROOT, relativePath)], {
      cwd: ROOT,
      stdio: 'pipe'
    });
  });
};

const main = () => {
  ensureFilesExist([...REQUIRED_DOCS, ...REQUIRED_RUNTIME, ...REQUIRED_SCHEMAS, ...REQUIRED_ARTIFACTS]);
  ensureNoPathLeaks([...REQUIRED_DOCS, ...REQUIRED_SCHEMAS, ...REQUIRED_ARTIFACTS]);
  REQUIRED_RUNTIME.forEach(runNodeCheck);
  verifyArtifacts();
  verifyReleaseUnchanged();
  verifyDependentScriptsPass();

  return verifyRuntimeImport().then(() => {
    console.log('PASS verify-stage3-execution-pilot');
  });
};

try {
  main().catch((error) => {
    console.error(`FAIL verify-stage3-execution-pilot: ${error.message}`);
    process.exitCode = 1;
  });
} catch (error) {
  console.error(`FAIL verify-stage3-execution-pilot: ${error.message}`);
  process.exitCode = 1;
}

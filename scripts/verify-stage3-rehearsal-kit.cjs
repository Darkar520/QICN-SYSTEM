#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const RELEASE_ROOT = path.resolve(ROOT, '..', 'release_repo_qicn_2026-03-01');
const LOCAL_PATH_PATTERN =
  /\/c:\/|[A-Za-z]:\\Users\\|OneDrive|Escritorio|QICN-FRAMEWORK|Sistema Canon Sandbox|rigid-identity-framework/i;
const BANNED_PATTERNS = [
  /external adjudication (passed|failed|completed|executed)/i,
  /external validation (achieved|demonstrated|established)/i,
  /human equivalence (achieved|demonstrated|supported|established)/i,
  /superiority (achieved|demonstrated|supported|established)/i,
  /Paper 10 (authorized|finalized|concluded)/i
];

const REQUIRED_DOCS = [
  'docs/EXECUTION_PILOT_REHEARSAL_KIT.md',
  'docs/DRY_RUN_SEQUENCE_PLAN.md',
  'docs/execution_pilot_rehearsal_kit.v1.json',
  'docs/dry_run_sequence_plan.v1.json',
  'docs/rehearsal_event_log_schema.v1.json',
  'docs/rehearsal_failure_modes.v1.json',
  'docs/rehearsal_reset_policy.v1.json',
  'docs/stage3_5_boundary.md',
  'docs/stage3_5_rehearsal_ready_criteria.v1.json',
  'docs/stage3_execution_unlock_map.v1.json',
  'docs/PAPER10_FINALIZATION_UNLOCK_MAP.md'
];

const REQUIRED_RUNTIME = [
  'src/comparative_program/ExecutionPilotRehearsalRegistry.js',
  'src/comparative_program/DryRunSequenceRegistry.js',
  'src/comparative_program/RehearsalKitEvaluator.js',
  'src/comparative_program/Stage3_5ReadinessGateBuilder.js',
  'src/comparative_program/Stage3RehearsalPreparationBuilder.js',
  'scripts/build-stage3-rehearsal-kit.cjs',
  'scripts/verify-stage3-rehearsal-kit.cjs'
];

const REQUIRED_SCHEMAS = [
  'src/comparative_program/schemas/execution_pilot_rehearsal_kit_status.v1.json',
  'src/comparative_program/schemas/dry_run_sequence_readiness.v1.json',
  'src/comparative_program/schemas/rehearsal_event_log_status.v1.json'
];

const REQUIRED_ARTIFACTS = [
  'artifacts/external_adjudication/stage3_5/execution_pilot_rehearsal_kit_status.json',
  'artifacts/external_adjudication/stage3_5/dry_run_sequence_readiness.json',
  'artifacts/external_adjudication/stage3_5/rehearsal_event_log_status.json'
];

const exists = (relativePath) => fs.existsSync(path.join(ROOT, relativePath));
const readText = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const readJson = (relativePath) => JSON.parse(readText(relativePath));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const ensureFilesExist = (relativePaths) => {
  relativePaths.forEach((relativePath) => {
    assert(exists(relativePath), `Missing required Stage3-5 rehearsal surface: ${relativePath}`);
  });
};

const ensureNoPathLeaks = (relativePaths) => {
  relativePaths.forEach((relativePath) => {
    const text = readText(relativePath);
    assert(!LOCAL_PATH_PATTERN.test(text), `Path leak found in ${relativePath}`);
  });
};

const ensureNoBannedClaims = (relativePaths) => {
  relativePaths.forEach((relativePath) => {
    const text = readText(relativePath);
    BANNED_PATTERNS.forEach((pattern) =>
      assert(!pattern.test(text), `Banned wording found in ${relativePath}: ${pattern}`)
    );
  });
};

const runNodeCheck = (relativePath) => {
  cp.execFileSync('node', ['--check', path.join(ROOT, relativePath)], {
    cwd: ROOT,
    stdio: 'pipe'
  });
};

const verifyArtifacts = () => {
  const kit = readJson('artifacts/external_adjudication/stage3_5/execution_pilot_rehearsal_kit_status.json');
  const sequence = readJson('artifacts/external_adjudication/stage3_5/dry_run_sequence_readiness.json');
  const eventLog = readJson('artifacts/external_adjudication/stage3_5/rehearsal_event_log_status.json');

  assert(kit.rehearsal_kit_state === 'rehearsal_kit_defined', 'Rehearsal kit must be defined');
  assert(kit.rehearsal_state === 'rehearsal_not_started', 'Rehearsal must remain not started');
  assert(kit.evidence_state === 'rehearsal_non_evidential', 'Rehearsal kit must remain non-evidential');
  assert(kit.adjudication_state === 'rehearsal_non_adjudicative', 'Rehearsal kit must remain non-adjudicative');
  assert(sequence.dry_run_sequence_state === 'dry_run_sequence_ready', 'Dry-run sequence must be ready');
  assert(sequence.rehearsal_state === 'rehearsal_not_started', 'Dry-run sequence must remain not started');
  assert(eventLog.event_log_state === 'event_log_schema_defined', 'Rehearsal event log schema must be defined');
  assert(eventLog.rehearsal_state === 'rehearsal_not_started', 'Rehearsal event log must remain not started');
};

const verifyRuntimeImport = async () => {
  const moduleUrl = pathToFileURL(path.join(ROOT, 'src', 'comparative_program', 'index.js')).href;
  const comparative = await import(moduleUrl);
  const description = comparative.describeComparativeProgramLayer();
  assert(description.stage3_5_rehearsal_layer_present === true, 'Comparative layer must advertise Stage3-5 presence');
  assert(description.stage3_5_rehearsal_state === 'stage3_5_rehearsal_ready', 'Comparative layer must advertise Stage3-5 rehearsal readiness');
  assert(typeof comparative.createRehearsalKitEvaluator === 'function', 'Rehearsal kit evaluator export missing');
};

const verifyReleaseUnchanged = () => {
  assert(fs.existsSync(path.join(RELEASE_ROOT, '.git')), 'QICN-RELEASE repo root missing for unchanged-state verification');
  const status = cp.execFileSync('git', ['status', '--short'], {
    cwd: RELEASE_ROOT,
    encoding: 'utf8'
  }).trim();
  assert(status === '', 'QICN-RELEASE changed during Stage3-5 rehearsal preparation');
};

const verifyDependentScriptsPass = () => {
  [
    'scripts/verify-stage3-instantiated-empty.cjs',
    'scripts/verify-stage3-execution-pilot.cjs',
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
  ensureNoBannedClaims([...REQUIRED_DOCS, ...REQUIRED_ARTIFACTS]);
  REQUIRED_RUNTIME.forEach(runNodeCheck);
  verifyArtifacts();
  verifyReleaseUnchanged();
  verifyDependentScriptsPass();

  return verifyRuntimeImport().then(() => {
    console.log('PASS verify-stage3-rehearsal-kit');
  });
};

try {
  main().catch((error) => {
    console.error(`FAIL verify-stage3-rehearsal-kit: ${error.message}`);
    process.exitCode = 1;
  });
} catch (error) {
  console.error(`FAIL verify-stage3-rehearsal-kit: ${error.message}`);
  process.exitCode = 1;
}

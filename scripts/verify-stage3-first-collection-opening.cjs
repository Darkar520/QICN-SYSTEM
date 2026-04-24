#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const LOCAL_PATH_PATTERN =
  /\/c:\/|[A-Za-z]:[\\/](?:Users|users)[\\/]|OneDrive|Escritorio|QICN-FRAMEWORK|Sistema Canon Sandbox|rigid-identity-framework/i;
const BANNED_PATTERNS = [
  /human equivalence (achieved|demonstrated|supported|established)/i,
  /superiority (achieved|demonstrated|supported|established)/i,
  /inferiority (achieved|demonstrated|supported|established)/i,
  /external adjudication (passed|failed|completed|executed)/i,
  /external validation (achieved|demonstrated|established)/i,
  /metaphysical (subjecthood|closure|conclusion) (achieved|demonstrated|established)/i,
  /Paper 10 (authorized|finalized|concluded)/i
];

const REQUIRED_DOCS = [
  'docs/stage3_7_first_admissible_collection_opening_criteria.v1.json',
  'docs/STAGE3_7_FIRST_ADMISSIBLE_COLLECTION_BOUNDARY.md',
  'docs/first_admissible_collection_start_policy.v1.json',
  'docs/collection_start_command_schema.v1.json',
  'docs/operator_authorization_schema.v1.json',
  'docs/stage3_6b_runtime_reproducibility_gate.v1.json'
];

const REQUIRED_RUNTIME = [
  'src/comparative_program/FirstCollectionOpeningCriteriaRegistry.js',
  'src/comparative_program/Stage3_7FirstAdmissibleCollectionGateBuilder.js',
  'src/comparative_program/Stage3_6BRuntimeReproducibilityGateBuilder.js',
  'scripts/build-stage3-first-collection-opening.cjs',
  'scripts/verify-stage3-first-collection-opening.cjs'
];

const REQUIRED_ARTIFACTS = [
  'artifacts/external_adjudication/stage3_7/stage3_7_opening_gate.json',
  'artifacts/external_adjudication/stage3_7/first_collection_opening_manifest.json',
  'artifacts/runtime_health/stage3_6b_runtime_reproducibility_gate.json'
];

const exists = (relativePath) => fs.existsSync(path.join(ROOT, relativePath));
const readText = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const readJson = (relativePath) => JSON.parse(readText(relativePath));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const ensureFilesExist = (relativePaths) => {
  relativePaths.forEach((relativePath) => {
    assert(exists(relativePath), `Missing required Stage3-7 surface: ${relativePath}`);
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
  const stage37Gate = readJson('artifacts/external_adjudication/stage3_7/stage3_7_opening_gate.json');
  const stage37Manifest = readJson('artifacts/external_adjudication/stage3_7/first_collection_opening_manifest.json');
  const stage36b = readJson('artifacts/runtime_health/stage3_6b_runtime_reproducibility_gate.json');

  assert(
    [
      'stage3_7_not_open',
      'stage3_7_opening_blocked_by_runtime_health',
      'stage3_7_opening_blocked_by_clean_room',
      'stage3_7_first_collection_openable'
    ].includes(stage37Gate.stage3_7_state),
    'Stage3-7 gate must remain within allowed opening states'
  );
  assert(stage37Gate.collection_state === 'collection_start_not_executed', 'Collection start must remain unexecuted');
  assert(stage37Gate.evidence_state === 'evidence_generation_absent', 'Evidence generation must remain absent');
  assert(stage37Gate.adjudication_state === 'adjudication_not_open', 'Adjudication must remain closed');
  assert(stage37Gate.decision_record_state === 'decision_record_absent', 'Decision records must remain absent');
  assert(stage37Manifest.stage3_7_state === stage37Gate.stage3_7_state, 'Stage3-7 manifest must mirror gate state');
  assert(
    ['stage3_7_openable_after_runtime_audit', 'stage3_7_blocked_after_runtime_audit'].includes(
      stage36b.stage3_7_follow_on_state
    ),
    'Stage3-6B gate must classify the Stage3-7 follow-on state'
  );
};

const verifyRuntimeImport = async () => {
  const moduleUrl = pathToFileURL(path.join(ROOT, 'src', 'comparative_program', 'index.js')).href;
  const comparative = await import(moduleUrl);
  const description = comparative.describeComparativeProgramLayer();
  const stage3 = comparative.describeStage3Layer();

  assert(
    [
      'stage3_runtime_health_and_reproducibility_audit',
      'stage3_first_admissible_collection_opening'
    ].includes(description.current_stage),
    'Comparative layer must advertise Stage3-6B or Stage3-7 when first-collection opening artifacts exist'
  );
  assert(
    [
      'stage3_6b_runtime_blocked',
      'stage3_6b_runtime_ready',
      'stage3_6b_runtime_ready_with_warnings',
      'stage3_7_opening_blocked_by_runtime_health',
      'stage3_7_opening_blocked_by_clean_room',
      'stage3_7_first_collection_openable'
    ].includes(description.current_stage3_substage),
    'Comparative layer must advertise the Stage3-6B or Stage3-7 substage'
  );
  assert(typeof comparative.createStage3_7FirstAdmissibleCollectionGateBuilder === 'function', 'Stage3-7 gate builder export missing');
  assert(stage3.stage3_6_controlled_execution_layer_present === true, 'Stage3 layer must preserve Stage3-6 presence');
};

const verifyDependentScriptsPass = () => {
  [
    'scripts/verify-stage3-runtime-health.cjs',
    'scripts/verify-stage3-controlled-execution-opening.cjs',
    'scripts/verify-stage3-5-readiness.cjs'
  ].forEach((relativePath) => {
    cp.execFileSync('node', [path.join(ROOT, relativePath)], {
      cwd: ROOT,
      stdio: 'pipe'
    });
  });
};

const main = () => {
  ensureFilesExist([...REQUIRED_DOCS, ...REQUIRED_RUNTIME, ...REQUIRED_ARTIFACTS]);
  ensureNoPathLeaks([...REQUIRED_DOCS, ...REQUIRED_ARTIFACTS]);
  ensureNoBannedClaims([...REQUIRED_DOCS, ...REQUIRED_ARTIFACTS]);
  REQUIRED_RUNTIME.forEach(runNodeCheck);
  verifyArtifacts();
  verifyDependentScriptsPass();

  return verifyRuntimeImport().then(() => {
    console.log('PASS verify-stage3-first-collection-opening');
  });
};

try {
  main().catch((error) => {
    console.error(`FAIL verify-stage3-first-collection-opening: ${error.message}`);
    process.exitCode = 1;
  });
} catch (error) {
  console.error(`FAIL verify-stage3-first-collection-opening: ${error.message}`);
  process.exitCode = 1;
}

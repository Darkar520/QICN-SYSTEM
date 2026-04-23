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

const REQUIRED_DOCS = [
  'docs/frozen_preregistration_record_schema.v1.json',
  'docs/preregistration_freeze_policy.v1.json',
  'docs/preregistration_amendment_policy.v1.json',
  'docs/preregistration_lock_manifest.v1.json',
  'docs/reviewer_candidate_schema.v1.json',
  'docs/adjudicator_candidate_schema.v1.json',
  'docs/reviewer_selection_workflow.v1.json',
  'docs/adjudicator_assignment_workflow.v1.json',
  'docs/reviewer_rejection_reasons.v1.json',
  'docs/blinding_assignment_manifest.v1.json',
  'docs/execution_pilot_package_manifest.v1.json',
  'docs/execution_session_manifest.v1.json',
  'docs/collection_session_schema.v1.json',
  'docs/reproducibility_package_skeleton.v1.json',
  'docs/pilot_negative_control_bundle.v1.json',
  'docs/pilot_matched_intervention_bundle.v1.json',
  'docs/source_target_pairing_manifest.v1.json',
  'docs/PREREGISTRATION_FREEZE_POLICY.md',
  'docs/PREREGISTRATION_LOCKING_AND_AMENDMENTS.md',
  'docs/REVIEWER_SELECTION_WORKFLOW.md',
  'docs/ADJUDICATOR_ASSIGNMENT_WORKFLOW.md',
  'docs/EXECUTION_PILOT_PACKAGING.md',
  'docs/REPRODUCIBILITY_PACKAGE_SKELETON.md',
  'docs/stage3_surface_policy.v1.json',
  'docs/stage3_artifact_schema.v1.json'
];

const REQUIRED_RUNTIME = [
  'src/comparative_program/FrozenPreregistrationRegistry.js',
  'src/comparative_program/PreregistrationFreezeEvaluator.js',
  'src/comparative_program/ReviewerCandidateRegistry.js',
  'src/comparative_program/AdjudicatorCandidateRegistry.js',
  'src/comparative_program/ReviewerSelectionWorkflowRegistry.js',
  'src/comparative_program/AdjudicatorAssignmentWorkflowRegistry.js',
  'src/comparative_program/ReviewerSelectionEvaluator.js',
  'src/comparative_program/ExecutionPilotPackageRegistry.js',
  'src/comparative_program/ExecutionSessionRegistry.js',
  'src/comparative_program/ReproducibilityPackageRegistry.js',
  'src/comparative_program/ExecutionPilotPackagingEvaluator.js',
  'src/comparative_program/Stage3PilotPreparationBuilder.js',
  'scripts/build-stage3-prereg-freeze.cjs',
  'scripts/verify-stage3-prereg-freeze.cjs'
];

const REQUIRED_SCHEMAS = [
  'src/comparative_program/schemas/frozen_preregistration_readiness.v1.json',
  'src/comparative_program/schemas/preregistration_lock_assessment.v1.json',
  'src/comparative_program/schemas/reviewer_selection_readiness.v1.json',
  'src/comparative_program/schemas/adjudicator_assignment_readiness.v1.json',
  'src/comparative_program/schemas/blinding_assignment_readiness.v1.json',
  'src/comparative_program/schemas/execution_pilot_package_assessment.v1.json',
  'src/comparative_program/schemas/reproducibility_package_skeleton_status.v1.json',
  'src/comparative_program/schemas/pilot_negative_control_bundle_status.v1.json',
  'src/comparative_program/schemas/pilot_matched_intervention_bundle_status.v1.json'
];

const REQUIRED_ARTIFACTS = [
  'artifacts/external_adjudication/stage3_3/frozen_preregistration_readiness.json',
  'artifacts/external_adjudication/stage3_3/preregistration_lock_assessment.json',
  'artifacts/external_adjudication/stage3_3/reviewer_selection_readiness.json',
  'artifacts/external_adjudication/stage3_3/adjudicator_assignment_readiness.json',
  'artifacts/external_adjudication/stage3_3/blinding_assignment_readiness.json',
  'artifacts/external_adjudication/stage3_3/execution_pilot_package_assessment.json',
  'artifacts/external_adjudication/stage3_3/reproducibility_package_skeleton_status.json',
  'artifacts/external_adjudication/stage3_3/pilot_negative_control_bundle_status.json',
  'artifacts/external_adjudication/stage3_3/pilot_matched_intervention_bundle_status.json'
];

const exists = (relativePath) => fs.existsSync(path.join(ROOT, relativePath));
const readText = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const readJson = (relativePath) => JSON.parse(readText(relativePath));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const ensureFilesExist = (relativePaths) => {
  relativePaths.forEach((relativePath) => {
    assert(exists(relativePath), `Missing required Stage3-3 surface: ${relativePath}`);
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
  const freeze = readJson('artifacts/external_adjudication/stage3_3/frozen_preregistration_readiness.json');
  const lock = readJson('artifacts/external_adjudication/stage3_3/preregistration_lock_assessment.json');
  const reviewer = readJson('artifacts/external_adjudication/stage3_3/reviewer_selection_readiness.json');
  const adjudicator = readJson('artifacts/external_adjudication/stage3_3/adjudicator_assignment_readiness.json');
  const blinding = readJson('artifacts/external_adjudication/stage3_3/blinding_assignment_readiness.json');
  const pilot = readJson('artifacts/external_adjudication/stage3_3/execution_pilot_package_assessment.json');
  const repro = readJson('artifacts/external_adjudication/stage3_3/reproducibility_package_skeleton_status.json');
  const nc = readJson('artifacts/external_adjudication/stage3_3/pilot_negative_control_bundle_status.json');
  const mi = readJson('artifacts/external_adjudication/stage3_3/pilot_matched_intervention_bundle_status.json');

  assert(freeze.freeze_state === 'local_freeze_ready', 'Freeze layer must reach local_freeze_ready');
  assert(freeze.external_filing_state === 'external_filing_absent', 'External filing must remain absent');
  assert(freeze.preregistration_state === 'preregistration_not_externally_filed', 'Preregistration must remain not externally filed');
  assert(lock.lock_state === 'local_lock_ready', 'Lock manifest must be ready locally');
  assert(reviewer.reviewer_selection_state === 'reviewer_selection_package_ready', 'Reviewer package must be ready');
  assert(reviewer.execution_state === 'reviewer_selection_not_started', 'Reviewer selection must remain not started');
  assert(adjudicator.adjudicator_assignment_state === 'adjudicator_assignment_package_ready', 'Adjudicator package must be ready');
  assert(adjudicator.execution_state === 'adjudicator_assignment_not_started', 'Adjudicator assignment must remain not started');
  assert(blinding.blinding_assignment_state === 'blinding_assignment_package_ready', 'Blinding package must be ready');
  assert(blinding.execution_state === 'blinding_assignment_not_started', 'Blinding assignment must remain not started');
  assert(pilot.package_state === 'pilot_package_ready_but_unexecuted', 'Pilot package must be ready but unexecuted');
  assert(pilot.collection_session_state === 'collection_sessions_not_started', 'Collection sessions must remain not started');
  assert(pilot.dataset_population_state === 'dataset_population_absent', 'Dataset population must remain absent');
  assert(repro.reproducibility_state === 'reproducibility_skeleton_defined', 'Reproducibility skeleton must be defined');
  assert(repro.population_state === 'skeleton_defined_unpopulated', 'Reproducibility package must remain unpopulated');
  assert(nc.bundle_state === 'pilot_bundle_defined_but_unpopulated', 'Negative control bundle must remain unpopulated');
  assert(mi.bundle_state === 'pilot_bundle_defined_but_unpopulated', 'Matched intervention bundle must remain unpopulated');
};

const verifyRuntimeImport = async () => {
  const moduleUrl = pathToFileURL(path.join(ROOT, 'src', 'comparative_program', 'index.js')).href;
  const comparative = await import(moduleUrl);
  const description = comparative.describeComparativeProgramLayer();
  assert(description.stage3_3_freeze_layer_present === true, 'Comparative layer must advertise Stage3-3 presence');
  assert(description.stage3_3_freeze_state === 'local_freeze_ready', 'Comparative layer must advertise local freeze readiness');
  assert(description.stage3_3_pilot_package_state === 'pilot_package_ready_but_unexecuted', 'Comparative layer must advertise pilot package readiness');
};

const verifyReleaseUnchanged = () => {
  assert(fs.existsSync(path.join(RELEASE_ROOT, '.git')), 'QICN-RELEASE repo root missing for unchanged-state verification');
  const status = cp.execFileSync('git', ['status', '--short'], {
    cwd: RELEASE_ROOT,
    encoding: 'utf8'
  }).trim();
  assert(status === '', 'QICN-RELEASE changed during Stage3-3 hardening');
};

const verifyDependentScriptsPass = () => {
  [
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
    console.log('PASS verify-stage3-prereg-freeze');
  });
};

try {
  main().catch((error) => {
    console.error(`FAIL verify-stage3-prereg-freeze: ${error.message}`);
    process.exitCode = 1;
  });
} catch (error) {
  console.error(`FAIL verify-stage3-prereg-freeze: ${error.message}`);
  process.exitCode = 1;
}

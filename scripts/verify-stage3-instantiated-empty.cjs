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
  /human equivalence (achieved|demonstrated|supported|established)/i,
  /superiority (achieved|demonstrated|supported|established)/i,
  /inferiority (achieved|demonstrated|supported|established)/i,
  /external adjudication (passed|failed|completed|executed)/i,
  /external validation (achieved|demonstrated|established)/i,
  /Paper 10 (authorized|finalized|concluded)/i
];

const REQUIRED_DOCS = [
  'docs/INSTANTIATED_EMPTY_RECORDS_POLICY.md',
  'docs/LOCAL_FROZEN_RECORD_BOUNDARY.md',
  'docs/DECISION_RECORD_TEMPLATE_POLICY.md',
  'docs/REVIEWER_CANDIDATE_POOL_POLICY.md',
  'docs/ASSIGNMENT_STUB_POLICY.md',
  'docs/local_frozen_preregistration_record_template.v1.json',
  'docs/reviewer_candidate_pool_template.v1.json',
  'docs/adjudicator_candidate_pool_template.v1.json',
  'docs/blinding_assignment_stub.v1.json',
  'docs/execution_session_template.v1.json',
  'docs/decision_record_template.v1.json',
  'docs/reproducibility_package_manifest_empty.v1.json',
  'docs/collection_log_schema.v1.json',
  'docs/evidence_insertion_manifest.v1.json',
  'docs/reviewer_candidate_pool_fields.v1.json',
  'docs/adjudicator_candidate_pool_fields.v1.json',
  'docs/reviewer_assignment_stub.v1.json',
  'docs/adjudicator_assignment_stub.v1.json',
  'docs/reviewer_blinding_stub.v1.json',
  'docs/execution_campaign_freeze.v1.json',
  'docs/stage3_surface_policy.v1.json',
  'docs/stage3_artifact_schema.v1.json'
];

const REQUIRED_RUNTIME = [
  'src/comparative_program/ProvenanceClosureEvaluator.js',
  'src/comparative_program/InstantiatedEmptyRecordRegistry.js',
  'src/comparative_program/InstantiatedEmptyRecordEvaluator.js',
  'src/comparative_program/CandidatePoolRegistry.js',
  'src/comparative_program/AssignmentStubRegistry.js',
  'src/comparative_program/CandidatePoolEvaluator.js',
  'src/comparative_program/Stage3RehearsalPreparationBuilder.js',
  'scripts/build-stage3-instantiated-empty.cjs',
  'scripts/verify-stage3-instantiated-empty.cjs'
];

const REQUIRED_SCHEMAS = [
  'src/comparative_program/schemas/provenance_closure_assessment.v1.json',
  'src/comparative_program/schemas/instantiated_empty_record_assessment.v1.json',
  'src/comparative_program/schemas/local_frozen_record_status.v1.json',
  'src/comparative_program/schemas/candidate_pool_template_status.v1.json',
  'src/comparative_program/schemas/decision_record_template_status.v1.json',
  'src/comparative_program/schemas/reviewer_candidate_pool_status.v1.json',
  'src/comparative_program/schemas/adjudicator_candidate_pool_status.v1.json',
  'src/comparative_program/schemas/reviewer_assignment_stub_status.v1.json',
  'src/comparative_program/schemas/adjudicator_assignment_stub_status.v1.json'
];

const REQUIRED_ARTIFACTS = [
  'artifacts/external_adjudication/stage3_4/provenance_closure_assessment.json',
  'artifacts/external_adjudication/stage3_4b/instantiated_empty_record_assessment.json',
  'artifacts/external_adjudication/stage3_4b/local_frozen_record_status.json',
  'artifacts/external_adjudication/stage3_4b/candidate_pool_template_status.json',
  'artifacts/external_adjudication/stage3_4b/decision_record_template_status.json',
  'artifacts/external_adjudication/stage3_4b/reviewer_candidate_pool_status.json',
  'artifacts/external_adjudication/stage3_4b/adjudicator_candidate_pool_status.json',
  'artifacts/external_adjudication/stage3_4b/reviewer_assignment_stub_status.json',
  'artifacts/external_adjudication/stage3_4b/adjudicator_assignment_stub_status.json'
];

const exists = (relativePath) => fs.existsSync(path.join(ROOT, relativePath));
const readText = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const readJson = (relativePath) => JSON.parse(readText(relativePath));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const ensureFilesExist = (relativePaths) => {
  relativePaths.forEach((relativePath) => {
    assert(exists(relativePath), `Missing required Stage3-4B surface: ${relativePath}`);
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
  const currentHead = cp.execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: ROOT,
    encoding: 'utf8'
  }).trim();

  const provenance = readJson('artifacts/external_adjudication/stage3_4/provenance_closure_assessment.json');
  const instantiated = readJson('artifacts/external_adjudication/stage3_4b/instantiated_empty_record_assessment.json');
  const localFrozen = readJson('artifacts/external_adjudication/stage3_4b/local_frozen_record_status.json');
  const pools = readJson('artifacts/external_adjudication/stage3_4b/candidate_pool_template_status.json');
  const decision = readJson('artifacts/external_adjudication/stage3_4b/decision_record_template_status.json');
  const reviewerPool = readJson('artifacts/external_adjudication/stage3_4b/reviewer_candidate_pool_status.json');
  const adjudicatorPool = readJson('artifacts/external_adjudication/stage3_4b/adjudicator_candidate_pool_status.json');
  const reviewerStub = readJson('artifacts/external_adjudication/stage3_4b/reviewer_assignment_stub_status.json');
  const adjudicatorStub = readJson('artifacts/external_adjudication/stage3_4b/adjudicator_assignment_stub_status.json');

  assert(
    ['stale_and_regenerated', 'exact_head_aligned'].includes(provenance.preexisting_alignment_state),
    'Provenance preexisting alignment state is out of bounds'
  );
  assert(provenance.post_regeneration_alignment_state === 'exact_head_aligned', 'Post-regeneration provenance must be exact-head aligned');
  assert(provenance.committed_alignment_state === 'artifact_forward_compatible', 'Committed provenance must remain forward-compatible');
  assert(['pinning_consistent', 'release_pinning_cleaned'].includes(provenance.release_pinning_state), 'Release pinning state is out of bounds');
  assert(provenance.release_authority_sha === '92d5d2c3ea91c65e29dc8e102bed504866cffd2d', 'Release authority SHA mismatch');
  assert(provenance.system_live_pin_sha === currentHead, 'System live pin SHA must match current HEAD during verification');
  assert(instantiated.instantiated_empty_layer_state === 'instantiated_empty_layer_defined', 'Instantiated-empty layer must be defined');
  assert(instantiated.local_frozen_record_state === 'local_frozen_record_instantiated_but_unfiled', 'Local frozen record must be instantiated but unfiled');
  assert(instantiated.reviewer_candidate_pool_state === 'reviewer_candidate_pool_instantiated_empty', 'Reviewer candidate pool must be instantiated-empty');
  assert(instantiated.adjudicator_candidate_pool_state === 'adjudicator_candidate_pool_instantiated_empty', 'Adjudicator candidate pool must be instantiated-empty');
  assert(instantiated.decision_record_template_state === 'decision_record_template_instantiated_empty', 'Decision record template must be instantiated-empty');
  assert(instantiated.evidence_insertion_manifest_state === 'evidence_insertion_manifest_defined', 'Evidence insertion manifest must be defined');
  assert(instantiated.still_non_evidential === true, 'Instantiated-empty layer must remain non-evidential');
  assert(localFrozen.local_frozen_record_state === 'local_frozen_record_instantiated_but_unfiled', 'Local frozen record status out of bounds');
  assert(localFrozen.external_filing_state === 'not_externally_filed', 'External filing must remain absent');
  assert(pools.reviewer_candidate_pool_state === 'reviewer_candidate_pool_instantiated_empty', 'Template status must report reviewer pool instantiated-empty');
  assert(pools.adjudicator_candidate_pool_state === 'adjudicator_candidate_pool_instantiated_empty', 'Template status must report adjudicator pool instantiated-empty');
  assert(decision.decision_record_template_state === 'decision_record_template_instantiated_empty', 'Decision record template status out of bounds');
  assert(reviewerPool.candidate_pool_state === 'candidate_pool_instantiated_empty', 'Reviewer candidate pool must be instantiated-empty');
  assert(reviewerPool.reviewer_selection_state === 'reviewer_selection_not_started', 'Reviewer selection must remain not started');
  assert(adjudicatorPool.candidate_pool_state === 'candidate_pool_instantiated_empty', 'Adjudicator candidate pool must be instantiated-empty');
  assert(adjudicatorPool.adjudicator_assignment_state === 'adjudicator_assignment_not_started', 'Adjudicator assignment must remain not started');
  assert(reviewerStub.assignment_stub_state === 'assignment_stub_instantiated_empty', 'Reviewer assignment stub must be instantiated-empty');
  assert(reviewerStub.reviewer_selection_state === 'reviewer_selection_not_started', 'Reviewer assignment stub must remain not started');
  assert(adjudicatorStub.assignment_stub_state === 'assignment_stub_instantiated_empty', 'Adjudicator assignment stub must be instantiated-empty');
  assert(adjudicatorStub.adjudicator_assignment_state === 'adjudicator_assignment_not_started', 'Adjudicator assignment stub must remain not started');
};

const verifyRuntimeImport = async () => {
  const moduleUrl = pathToFileURL(path.join(ROOT, 'src', 'comparative_program', 'index.js')).href;
  const comparative = await import(moduleUrl);
  const description = comparative.describeComparativeProgramLayer();
  assert(description.stage3_4b_instantiated_empty_layer_present === true, 'Comparative layer must advertise Stage3-4B presence');
  assert(description.stage3_4b_instantiated_empty_state === 'instantiated_empty_layer_defined', 'Comparative layer must advertise Stage3-4B instantiated-empty state');
  assert(typeof comparative.createStage3RehearsalPreparationBuilder === 'function', 'Stage3 rehearsal preparation builder export missing');
};

const verifyReleaseUnchanged = () => {
  assert(fs.existsSync(path.join(RELEASE_ROOT, '.git')), 'QICN-RELEASE repo root missing for unchanged-state verification');
  const status = cp.execFileSync('git', ['status', '--short'], {
    cwd: RELEASE_ROOT,
    encoding: 'utf8'
  }).trim();
  assert(status === '', 'QICN-RELEASE changed during Stage3-4B preparation');
};

const verifyDependentScriptsPass = () => {
  [
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
    console.log('PASS verify-stage3-instantiated-empty');
  });
};

try {
  main().catch((error) => {
    console.error(`FAIL verify-stage3-instantiated-empty: ${error.message}`);
    process.exitCode = 1;
  });
} catch (error) {
  console.error(`FAIL verify-stage3-instantiated-empty: ${error.message}`);
  process.exitCode = 1;
}

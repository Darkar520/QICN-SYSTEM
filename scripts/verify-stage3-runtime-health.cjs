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
  'docs/RUNTIME_HEALTH_AUDIT.md',
  'docs/runtime_health_audit.v1.json',
  'docs/CLEAN_ROOM_REPRODUCIBILITY_AUDIT.md',
  'docs/clean_room_reproducibility_audit.v1.json',
  'docs/PATH_AND_LOCAL_LEAKAGE_AUDIT.md',
  'docs/ARTIFACT_REGENERATION_AUDIT.md',
  'docs/stage3_6b_runtime_reproducibility_gate.v1.json',
  'docs/stage3_7_first_admissible_collection_opening_criteria.v1.json',
  'docs/STAGE3_7_FIRST_ADMISSIBLE_COLLECTION_BOUNDARY.md',
  'docs/first_admissible_collection_start_policy.v1.json',
  'docs/collection_start_command_schema.v1.json',
  'docs/operator_authorization_schema.v1.json',
  'docs/stage3_surface_policy.v1.json',
  'docs/stage3_artifact_schema.v1.json'
];

const REQUIRED_RUNTIME = [
  'src/comparative_program/RuntimeHealthAuditRegistry.js',
  'src/comparative_program/FirstCollectionOpeningCriteriaRegistry.js',
  'src/comparative_program/Stage3_6BRuntimeReproducibilityGateBuilder.js',
  'src/comparative_program/Stage3_7FirstAdmissibleCollectionGateBuilder.js',
  'scripts/build-stage3-runtime-health.cjs',
  'scripts/verify-stage3-runtime-health.cjs',
  'scripts/build-stage3-first-collection-opening.cjs',
  'scripts/verify-stage3-first-collection-opening.cjs'
];

const REQUIRED_SCHEMAS = [
  'src/comparative_program/schemas/runtime_health_audit.v1.json',
  'src/comparative_program/schemas/clean_room_reproducibility_audit.v1.json',
  'src/comparative_program/schemas/path_and_local_leakage_audit.v1.json',
  'src/comparative_program/schemas/artifact_regeneration_audit.v1.json',
  'src/comparative_program/schemas/stage3_6b_runtime_reproducibility_gate.v1.json',
  'src/comparative_program/schemas/stage3_7_opening_gate.v1.json',
  'src/comparative_program/schemas/first_collection_opening_manifest.v1.json'
];

const REQUIRED_ARTIFACTS = [
  'artifacts/runtime_health/runtime_health_audit.json',
  'artifacts/runtime_health/clean_room_reproducibility_audit.json',
  'artifacts/runtime_health/path_and_local_leakage_audit.json',
  'artifacts/runtime_health/artifact_regeneration_audit.json',
  'artifacts/runtime_health/stage3_6b_runtime_reproducibility_gate.json',
  'artifacts/external_adjudication/stage3_7/stage3_7_opening_gate.json',
  'artifacts/external_adjudication/stage3_7/first_collection_opening_manifest.json'
];

const REQUIRED_PAPER10 = [
  'paper10_external_adjudication_and_human_comparators/main.tex',
  'paper10_external_adjudication_and_human_comparators/PAPER10_SECTION_STATUS.md',
  'paper10_external_adjudication_and_human_comparators/PAPER10_CLAIM_BOUNDARY.md',
  'paper10_external_adjudication_and_human_comparators/PAPER10_EVIDENCE_REQUIREMENTS.md'
];

const exists = (relativePath) => fs.existsSync(path.join(ROOT, relativePath));
const readText = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const readJson = (relativePath) => JSON.parse(readText(relativePath));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const ensureFilesExist = (relativePaths) => {
  relativePaths.forEach((relativePath) => {
    assert(exists(relativePath), `Missing required runtime-health surface: ${relativePath}`);
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
  const runtimeHealth = readJson('artifacts/runtime_health/runtime_health_audit.json');
  const cleanRoom = readJson('artifacts/runtime_health/clean_room_reproducibility_audit.json');
  const pathLeakage = readJson('artifacts/runtime_health/path_and_local_leakage_audit.json');
  const artifactRegeneration = readJson('artifacts/runtime_health/artifact_regeneration_audit.json');
  const stage36b = readJson('artifacts/runtime_health/stage3_6b_runtime_reproducibility_gate.json');
  const stage37Gate = readJson('artifacts/external_adjudication/stage3_7/stage3_7_opening_gate.json');
  const stage37Manifest = readJson(
    'artifacts/external_adjudication/stage3_7/first_collection_opening_manifest.json'
  );
  const stage36Manifest = readJson('artifacts/external_adjudication/stage3_6/stage3_6_manifest.json');
  const humanDataset = readJson(
    'artifacts/external_adjudication/stage3_6/live_human_comparator_dataset_manifest.json'
  );
  const matchedDataset = readJson(
    'artifacts/external_adjudication/stage3_6/live_matched_intervention_dataset_manifest.json'
  );
  const negativeDataset = readJson(
    'artifacts/external_adjudication/stage3_6/live_negative_control_dataset_manifest.json'
  );
  const paper10 = readJson(
    'artifacts/external_adjudication/stage3_2/paper10_protocol_hardening_status.json'
  );

  assert(
    ['runtime_health_pass', 'runtime_health_pass_with_warnings'].includes(
      runtimeHealth.runtime_health_state
    ),
    'Runtime health must pass or pass with warnings'
  );
  assert(
    ['clean_room_reproducible', 'clean_room_reproducible_with_warnings'].includes(
      cleanRoom.clean_room_state
    ),
    'Clean-room reproducibility must pass or pass with warnings'
  );
  assert(
    ['path_leakage_clear', 'path_leakage_clear_with_historical_examples'].includes(
      pathLeakage.path_leakage_state
    ),
    'Path leakage must be clear or historical-only'
  );
  assert(
    [
      'artifacts_current',
      'artifacts_regenerated_without_semantic_drift',
      'artifacts_regenerated_with_expected_provenance_drift',
      'artifacts_stale_and_fixed'
    ].includes(artifactRegeneration.artifact_regeneration_state),
    'Artifact regeneration must remain non-blocking'
  );
  assert(
    ['stage3_6b_runtime_ready', 'stage3_6b_runtime_ready_with_warnings'].includes(
      stage36b.stage3_6b_state
    ),
    'Stage3-6B gate must remain runtime-ready'
  );

  assert(
    [
      'stage3_7_first_collection_openable',
      'stage3_7_not_open',
      'stage3_7_opening_blocked_by_runtime_health',
      'stage3_7_opening_blocked_by_clean_room'
    ].includes(stage37Gate.stage3_7_state),
    'Stage3-7 gate must stay within allowed states'
  );
  assert(
    stage37Gate.collection_state === 'collection_start_not_executed',
    'Stage3-7 must keep collection start unexecuted'
  );
  assert(
    stage37Gate.evidence_state === 'evidence_generation_absent',
    'Stage3-7 must keep evidence absent'
  );
  assert(
    stage37Gate.adjudication_state === 'adjudication_not_open',
    'Stage3-7 must keep adjudication closed'
  );
  assert(
    stage37Gate.decision_record_state === 'decision_record_absent',
    'Stage3-7 must keep decision records absent'
  );
  assert(stage37Manifest.stage3_7_state === stage37Gate.stage3_7_state, 'Stage3-7 manifest must mirror gate');

  [humanDataset, matchedDataset, negativeDataset].forEach((datasetManifest) => {
    assert(datasetManifest.empty_dataset === true, `${datasetManifest.artifact_name} must remain empty`);
    assert(datasetManifest.population_event_count === 0, `${datasetManifest.artifact_name} must have zero population events`);
  });
  assert(stage36Manifest.collection_state === 'collection_not_started', 'Stage3-6 collection must remain not started');

  assert(paper10.paper10_state === 'paper10_protocol_grade_backbone', 'Paper 10 must remain protocol-grade');
  assert(paper10.paper10_authorization_state === 'paper10_not_final_authorized', 'Paper 10 final authorization must remain blocked');
  assert(
    ['compiled', 'compile_not_run_toolchain_unavailable', 'compile_failed', 'compile_failed_missing_pdf', 'compile_not_run_missing_source'].includes(paper10.compile_status),
    'Paper 10 compile status must be explicit'
  );
};

const verifyPaper10 = () => {
  const mainTex = readText('paper10_external_adjudication_and_human_comparators/main.tex');
  assert(/SIXTH HARDENING PASS/i.test(mainTex), 'Paper 10 sixth hardening banner missing');
  assert(/Runtime Health Audit/i.test(mainTex), 'Paper 10 runtime health section missing');
  assert(/Clean-Room Reproducibility/i.test(mainTex), 'Paper 10 clean-room section missing');
  assert(/Local Path Leakage Policy/i.test(mainTex), 'Paper 10 path-leakage section missing');
  assert(/Reproducible Artifact Regeneration/i.test(mainTex), 'Paper 10 artifact-regeneration section missing');
  assert(/Why Reproducibility Does Not Imply Evidence/i.test(mainTex), 'Paper 10 reproducibility non-implication section missing');
  assert(/Why Runtime Health Does Not Imply Adjudication/i.test(mainTex), 'Paper 10 runtime-health non-implication section missing');
  assert(/stage3_7_first_collection_openable/i.test(mainTex), 'Paper 10 Stage3-7 status grammar missing');
  assert(!/\\section\{Results\}.*(?:demonstrate|show|prove)/is.test(mainTex), 'Paper 10 contains result-bearing Results wording');
};

const verifyRuntimeImport = async () => {
  const moduleUrl = pathToFileURL(path.join(ROOT, 'src', 'comparative_program', 'index.js')).href;
  const comparative = await import(moduleUrl);
  const description = comparative.describeComparativeProgramLayer();
  const stage3 = comparative.describeStage3Layer();

  assert(
    [
      'stage3_controlled_execution_opening',
      'stage3_runtime_health_and_reproducibility_audit',
      'stage3_first_admissible_collection_opening'
    ].includes(description.current_stage),
    'Comparative layer must advertise Stage3-6, Stage3-6B, or Stage3-7 as the current stage'
  );
  assert(
    [
      'stage3_6_collection_open_pre_evidential',
      'stage3_6b_runtime_ready',
      'stage3_6b_runtime_ready_with_warnings',
      'stage3_7_first_collection_openable'
    ].includes(description.current_stage3_substage),
    'Comparative layer must advertise the current Stage3-6/6B/7 substage'
  );
  assert(typeof comparative.createStage3_7FirstAdmissibleCollectionGateBuilder === 'function', 'Stage3-7 gate builder export missing');
  assert(stage3.stage3_6_controlled_execution_layer_present === true, 'Stage3 layer must advertise Stage3-6 presence');
};

const verifyReleaseUnchanged = () => {
  assert(fs.existsSync(path.join(RELEASE_ROOT, '.git')), 'QICN-RELEASE repo root missing for unchanged-state verification');
  const status = cp.execFileSync('git', ['status', '--short'], {
    cwd: RELEASE_ROOT,
    encoding: 'utf8'
  }).trim();
  assert(status === '', 'QICN-RELEASE changed during runtime-health audit');
  assert(!fs.existsSync(path.join(RELEASE_ROOT, 'paper10_external_adjudication_and_human_comparators')), 'Paper 10 must not appear in QICN-RELEASE');
  assert(!fs.existsSync(path.join(RELEASE_ROOT, 'artifacts', 'external_adjudication')), 'Stage 3 public artifacts must not appear in QICN-RELEASE');
};

const verifyDependentScriptsPass = () => {
  [
    'scripts/verify-stage3-controlled-execution-opening.cjs',
    'scripts/verify-stage3-5-readiness.cjs',
    'scripts/verify-stage3-execution-pilot.cjs',
    'scripts/verify-stage3-execution-readiness.cjs',
    'scripts/verify-stage3-scaffolding.cjs',
    'scripts/verify-paper9-handoff-readiness.cjs',
    'scripts/verify-source-of-truth.cjs',
    'scripts/verify-comparative-program-closure.cjs'
  ].forEach((relativePath) => {
    if (!exists(relativePath)) return;
    cp.execFileSync('node', [path.join(ROOT, relativePath)], {
      cwd: ROOT,
      stdio: 'pipe'
    });
  });
};

const main = () => {
  ensureFilesExist([
    ...REQUIRED_DOCS,
    ...REQUIRED_RUNTIME,
    ...REQUIRED_SCHEMAS,
    ...REQUIRED_ARTIFACTS,
    ...REQUIRED_PAPER10
  ]);
  ensureNoPathLeaks([
    ...REQUIRED_DOCS,
    ...REQUIRED_SCHEMAS,
    ...REQUIRED_ARTIFACTS,
    ...REQUIRED_PAPER10
  ]);
  ensureNoBannedClaims([
    ...REQUIRED_DOCS,
    ...REQUIRED_ARTIFACTS,
    ...REQUIRED_PAPER10
  ]);
  REQUIRED_RUNTIME.forEach(runNodeCheck);
  verifyArtifacts();
  verifyPaper10();
  verifyReleaseUnchanged();
  verifyDependentScriptsPass();

  return verifyRuntimeImport().then(() => {
    console.log('PASS verify-stage3-runtime-health');
  });
};

try {
  main().catch((error) => {
    console.error(`FAIL verify-stage3-runtime-health: ${error.message}`);
    process.exitCode = 1;
  });
} catch (error) {
  console.error(`FAIL verify-stage3-runtime-health: ${error.message}`);
  process.exitCode = 1;
}

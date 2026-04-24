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
  'docs/CONTROLLED_EXECUTION_OPENING_POLICY.md',
  'docs/SESSION_ZERO_PROTOCOL.md',
  'docs/PRE_COLLECTION_ADMISSIBILITY_GATE.md',
  'docs/CONTAMINATION_AND_ABORT_POLICY.md',
  'docs/LIVE_BUT_UNPOPULATED_ARTIFACT_POLICY.md',
  'docs/SESSION_ZERO_GATE.md',
  'docs/SESSION_ZERO_OPERATOR_CHECKLIST.md',
  'docs/PRE_COLLECTION_GATE.md',
  'docs/stage3_6_boundary.md',
  'docs/FIRST_ADMISSIBLE_COLLECTION_UNLOCK_MAP.md',
  'docs/controlled_execution_opening_policy.v1.json',
  'docs/session_zero_protocol.v1.json',
  'docs/pre_collection_admissibility_gate.v1.json',
  'docs/contamination_and_abort_policy.v1.json',
  'docs/live_but_unpopulated_artifact_policy.v1.json',
  'docs/session_zero_gate_criteria.v1.json',
  'docs/session_zero_operator_checklist.v1.json',
  'docs/session_zero_failure_modes.v1.json',
  'docs/session_zero_reset_policy.v1.json',
  'docs/pre_collection_gate_criteria.v1.json',
  'docs/pre_collection_invalidation_policy.v1.json',
  'docs/pre_collection_contamination_checklist.v1.json',
  'docs/stage3_6_controlled_execution_opening_criteria.v1.json',
  'docs/first_admissible_collection_unlock_map.v1.json',
  'docs/stage3_surface_policy.v1.json',
  'docs/stage3_artifact_schema.v1.json'
];

const REQUIRED_RUNTIME = [
  'src/comparative_program/ControlledExecutionOpeningRegistry.js',
  'src/comparative_program/LiveArtifactRegistry.js',
  'src/comparative_program/LiveArtifactInstantiationEvaluator.js',
  'src/comparative_program/SessionZeroGateBuilder.js',
  'src/comparative_program/SessionZeroOperatorChecklistEvaluator.js',
  'src/comparative_program/ContaminationChecklistEvaluator.js',
  'src/comparative_program/PreCollectionAdmissibilityGateBuilder.js',
  'src/comparative_program/Stage3_6ControlledExecutionGateBuilder.js',
  'src/comparative_program/Stage3ControlledExecutionOpeningBuilder.js',
  'scripts/build-stage3-controlled-execution-opening.cjs',
  'scripts/verify-stage3-controlled-execution-opening.cjs'
];

const REQUIRED_SCHEMAS = [
  'src/comparative_program/schemas/live_artifact_instantiation_status.v1.json',
  'src/comparative_program/schemas/session_zero_manifest.v1.json',
  'src/comparative_program/schemas/live_collection_manifest.v1.json',
  'src/comparative_program/schemas/live_collection_log_record.v1.json',
  'src/comparative_program/schemas/live_dataset_manifest.v1.json',
  'src/comparative_program/schemas/live_reproducibility_package_manifest.v1.json',
  'src/comparative_program/schemas/live_decision_record_stub.v1.json',
  'src/comparative_program/schemas/live_evidence_insertion_register.v1.json',
  'src/comparative_program/schemas/contamination_checklist_status.v1.json',
  'src/comparative_program/schemas/session_zero_gate_result.v1.json',
  'src/comparative_program/schemas/session_zero_operator_checklist_status.v1.json',
  'src/comparative_program/schemas/session_zero_failure_mode_assessment.v1.json',
  'src/comparative_program/schemas/pre_collection_admissibility_gate_result.v1.json',
  'src/comparative_program/schemas/pre_collection_invalidation_status.v1.json',
  'src/comparative_program/schemas/stage3_6_controlled_execution_gate.v1.json',
  'src/comparative_program/schemas/stage3_6_manifest.v1.json'
];

const REQUIRED_ARTIFACTS = [
  'artifacts/external_adjudication/stage3_6/live_artifact_instantiation_status.json',
  'artifacts/external_adjudication/stage3_6/session_zero_manifest.json',
  'artifacts/external_adjudication/stage3_6/live_collection_manifest.json',
  'artifacts/external_adjudication/stage3_6/live_collection_log.ndjson',
  'artifacts/external_adjudication/stage3_6/live_human_comparator_dataset_manifest.json',
  'artifacts/external_adjudication/stage3_6/live_matched_intervention_dataset_manifest.json',
  'artifacts/external_adjudication/stage3_6/live_negative_control_dataset_manifest.json',
  'artifacts/external_adjudication/stage3_6/live_reproducibility_package_manifest.json',
  'artifacts/external_adjudication/stage3_6/live_decision_record_stub.json',
  'artifacts/external_adjudication/stage3_6/live_evidence_insertion_register.json',
  'artifacts/external_adjudication/stage3_6/session_zero_gate_result.json',
  'artifacts/external_adjudication/stage3_6/session_zero_operator_checklist_status.json',
  'artifacts/external_adjudication/stage3_6/session_zero_failure_mode_assessment.json',
  'artifacts/external_adjudication/stage3_6/pre_collection_gate_result.json',
  'artifacts/external_adjudication/stage3_6/pre_collection_admissibility_gate_result.json',
  'artifacts/external_adjudication/stage3_6/contamination_checklist_status.json',
  'artifacts/external_adjudication/stage3_6/pre_collection_invalidation_status.json',
  'artifacts/external_adjudication/stage3_6/stage3_6_controlled_execution_gate.json',
  'artifacts/external_adjudication/stage3_6/stage3_6_manifest.json'
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
    assert(exists(relativePath), `Missing required Stage3-6 surface: ${relativePath}`);
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
  const live = readJson('artifacts/external_adjudication/stage3_6/live_artifact_instantiation_status.json');
  const sessionZeroManifest = readJson('artifacts/external_adjudication/stage3_6/session_zero_manifest.json');
  const sessionZeroGate = readJson('artifacts/external_adjudication/stage3_6/session_zero_gate_result.json');
  const operatorChecklist = readJson('artifacts/external_adjudication/stage3_6/session_zero_operator_checklist_status.json');
  const failureModes = readJson('artifacts/external_adjudication/stage3_6/session_zero_failure_mode_assessment.json');
  const preCollection = readJson('artifacts/external_adjudication/stage3_6/pre_collection_admissibility_gate_result.json');
  const contamination = readJson('artifacts/external_adjudication/stage3_6/contamination_checklist_status.json');
  const invalidation = readJson('artifacts/external_adjudication/stage3_6/pre_collection_invalidation_status.json');
  const gate = readJson('artifacts/external_adjudication/stage3_6/stage3_6_controlled_execution_gate.json');
  const manifest = readJson('artifacts/external_adjudication/stage3_6/stage3_6_manifest.json');
  const liveCollection = readJson('artifacts/external_adjudication/stage3_6/live_collection_manifest.json');
  const humanDataset = readJson('artifacts/external_adjudication/stage3_6/live_human_comparator_dataset_manifest.json');
  const matchedDataset = readJson('artifacts/external_adjudication/stage3_6/live_matched_intervention_dataset_manifest.json');
  const negativeDataset = readJson('artifacts/external_adjudication/stage3_6/live_negative_control_dataset_manifest.json');
  const reproducibility = readJson('artifacts/external_adjudication/stage3_6/live_reproducibility_package_manifest.json');
  const decision = readJson('artifacts/external_adjudication/stage3_6/live_decision_record_stub.json');
  const evidenceRegister = readJson('artifacts/external_adjudication/stage3_6/live_evidence_insertion_register.json');
  const logText = readText('artifacts/external_adjudication/stage3_6/live_collection_log.ndjson');
  const paper10 = readJson('artifacts/external_adjudication/stage3_2/paper10_protocol_hardening_status.json');

  assert(live.live_artifact_state === 'live_artifacts_instantiated_unpopulated', 'Live artifacts must be instantiated but unpopulated');
  assert(live.collection_state === 'collection_not_started', 'Collection must remain not started');
  assert(live.evidence_state === 'evidence_generation_absent', 'Evidence generation must remain absent');
  assert(live.adjudication_state === 'adjudication_not_open', 'Adjudication must remain not open');

  assert(sessionZeroManifest.session_zero_readiness_state === 'session_zero_ready', 'Session-zero manifest must be ready');
  assert(sessionZeroManifest.session_zero_lifecycle_state === 'session_zero_not_started', 'Session-zero must remain not started');
  assert(sessionZeroGate.session_zero_state === 'session_zero_ready', 'Session-zero gate must pass');
  assert(sessionZeroGate.evidence_state === 'session_zero_non_evidential', 'Session-zero must remain non-evidential');
  assert(sessionZeroGate.adjudication_state === 'session_zero_non_adjudicative', 'Session-zero must remain non-adjudicative');

  assert(operatorChecklist.operator_checklist_state === 'operator_checklist_ready', 'Operator checklist must be ready');
  assert(failureModes.failure_mode_state === 'session_zero_failure_modes_defined', 'Failure modes must be defined');

  assert(preCollection.pre_collection_state === 'collection_openable_under_controls', 'Pre-collection gate must open under controls');
  assert(preCollection.collection_state === 'collection_not_started', 'Pre-collection gate must keep collection closed');
  assert(preCollection.evidence_state === 'evidence_generation_absent', 'Pre-collection gate must keep evidence absent');
  assert(preCollection.adjudication_state === 'adjudication_not_open', 'Pre-collection gate must keep adjudication closed');

  assert(contamination.contamination_state === 'contamination_not_detected', 'Contamination must not be detected');
  assert(Array.isArray(contamination.detected_events) && contamination.detected_events.length === 0, 'Contamination detected-events must stay empty');
  assert(invalidation.invalidation_state === 'no_invalidation_detected', 'Pre-collection invalidation must remain absent');

  assert(gate.stage3_6_state === 'stage3_6_collection_open_pre_evidential', 'Stage3-6 gate must open the pre-evidential controlled execution state');
  assert(gate.openability_state === 'stage3_6_controlled_execution_openable', 'Stage3-6 gate must remain openable');
  assert(gate.collection_state === 'collection_not_started', 'Stage3-6 gate must keep collection not started');
  assert(gate.evidence_state === 'evidence_generation_absent', 'Stage3-6 gate must keep evidence absent');
  assert(gate.adjudication_state === 'stage3_6_non_adjudicative', 'Stage3-6 gate must remain non-adjudicative');
  assert(gate.result_state === 'stage3_6_non_result_bearing', 'Stage3-6 gate must remain non-result-bearing');

  assert(manifest.stage3_6_state === gate.stage3_6_state, 'Stage3-6 manifest must mirror the gate state');
  assert(manifest.live_artifact_state === live.live_artifact_state, 'Stage3-6 manifest must mirror live-artifact state');
  assert(manifest.session_zero_state === sessionZeroGate.session_zero_state, 'Stage3-6 manifest must mirror session-zero state');
  assert(manifest.pre_collection_state === preCollection.pre_collection_state, 'Stage3-6 manifest must mirror pre-collection state');
  assert(manifest.collection_state === 'collection_not_started', 'Stage3-6 manifest must keep collection not started');
  assert(manifest.evidence_state === 'evidence_generation_absent', 'Stage3-6 manifest must keep evidence absent');
  assert(manifest.adjudication_state === 'stage3_6_non_adjudicative', 'Stage3-6 manifest must keep adjudication absent');

  [humanDataset, matchedDataset, negativeDataset].forEach((datasetManifest) => {
    assert(datasetManifest.empty_dataset === true, `${datasetManifest.artifact_name} must remain empty`);
    assert(datasetManifest.population_event_count === 0, `${datasetManifest.artifact_name} must have zero population events`);
    assert(datasetManifest.dataset_state === 'live_but_unpopulated', `${datasetManifest.artifact_name} must remain live-but-unpopulated`);
    assert(datasetManifest.collection_state === 'collection_not_started', `${datasetManifest.artifact_name} must keep collection closed`);
    assert(datasetManifest.evidence_state === 'evidence_generation_absent', `${datasetManifest.artifact_name} must keep evidence absent`);
  });

  assert(liveCollection.collection_state === 'collection_not_started', 'Live collection manifest must remain not started');
  assert(reproducibility.population_state === 'unpopulated', 'Live reproducibility manifest must remain unpopulated');
  assert(decision.empty_decision_record === true, 'Live decision stub must remain empty');
  assert(decision.decision_event_count === 0, 'Live decision stub must have zero decision events');
  assert(evidenceRegister.insertion_event_count === 0, 'Live evidence insertion register must have zero insertion events');
  assert(logText.trim() === '', 'Live collection log must remain empty');

  assert(paper10.paper10_state === 'paper10_protocol_grade_backbone', 'Paper 10 must remain protocol-grade');
  assert(paper10.paper10_authorization_state === 'paper10_not_final_authorized', 'Paper 10 final authorization must remain blocked');
  assert(
    ['compiled', 'compile_not_run_toolchain_unavailable', 'compile_failed', 'compile_failed_missing_pdf', 'compile_not_run_missing_source'].includes(paper10.compile_status),
    'Paper 10 compile status must be recorded'
  );
  if (paper10.compile_status !== 'compiled') {
    assert(Array.isArray(paper10.compile_warnings) && paper10.compile_warnings.length > 0, 'A Paper 10 compile blocker must be explicit when compilation is unavailable or failed');
  }
};

const verifyPaper10 = () => {
  const mainTex = readText('paper10_external_adjudication_and_human_comparators/main.tex');
  assert(/(FIFTH|SIXTH) HARDENING PASS/i.test(mainTex), 'Paper 10 fifth-or-sixth hardening banner missing');
  assert(/Controlled Execution Opening/i.test(mainTex), 'Paper 10 controlled execution opening section missing');
  assert(/Session-Zero Protocol/i.test(mainTex), 'Paper 10 session-zero section missing');
  assert(/Pre-Collection Admissibility Gate/i.test(mainTex), 'Paper 10 pre-collection section missing');
  assert(/Live-But-Unpopulated Artifacts/i.test(mainTex), 'Paper 10 live-artifact section missing');
  assert(/collection_open_pre_evidential/i.test(mainTex), 'Paper 10 Stage3-6 status grammar missing');
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
    'Comparative layer must advertise Stage3-6 or a later bounded Stage3-6B/7 stage'
  );
  assert(
    [
      'stage3_6_collection_open_pre_evidential',
      'stage3_6b_runtime_blocked',
      'stage3_6b_runtime_ready',
      'stage3_6b_runtime_ready_with_warnings',
      'stage3_7_opening_blocked_by_runtime_health',
      'stage3_7_opening_blocked_by_clean_room',
      'stage3_7_first_collection_openable'
    ].includes(description.current_stage3_substage),
    'Comparative layer must advertise the Stage3-6 or later bounded Stage3-6B/7 substage'
  );
  assert(description.stage3_6_controlled_execution_layer_present === true, 'Comparative layer must advertise Stage3-6 presence');
  assert(description.stage3_6_execution_opening_state === 'collection_openable_under_controls', 'Comparative layer must advertise controlled execution openability');
  assert(description.stage3_6_collection_state === 'stage3_6_collection_open_pre_evidential', 'Comparative layer must advertise pre-evidential Stage3-6 state');
  assert(
    [
      'stage3_controlled_execution_opening',
      'stage3_runtime_health_and_reproducibility_audit',
      'stage3_first_admissible_collection_opening'
    ].includes(stage3.current_stage),
    'Stage3 layer must advertise Stage3-6 or a later bounded Stage3-6B/7 stage'
  );
  assert(
    [
      'stage3_6_collection_open_pre_evidential',
      'stage3_6b_runtime_blocked',
      'stage3_6b_runtime_ready',
      'stage3_6b_runtime_ready_with_warnings',
      'stage3_7_opening_blocked_by_runtime_health',
      'stage3_7_opening_blocked_by_clean_room',
      'stage3_7_first_collection_openable'
    ].includes(stage3.current_stage3_substage),
    'Stage3 layer must advertise the Stage3-6 or later bounded Stage3-6B/7 substage'
  );
  assert(stage3.stage3_6_controlled_execution_layer_present === true, 'Stage3 layer must advertise Stage3-6 presence');
  assert(typeof comparative.createStage3ControlledExecutionOpeningBuilder === 'function', 'Stage3 controlled execution opening builder export missing');
};

const verifyReleaseUnchanged = () => {
  assert(fs.existsSync(path.join(RELEASE_ROOT, '.git')), 'QICN-RELEASE repo root missing for unchanged-state verification');
  const status = cp.execFileSync('git', ['status', '--short'], {
    cwd: RELEASE_ROOT,
    encoding: 'utf8'
  }).trim();
  assert(status === '', 'QICN-RELEASE changed during Stage3-6 controlled execution opening');
  assert(!fs.existsSync(path.join(RELEASE_ROOT, 'paper10_external_adjudication_and_human_comparators')), 'Paper 10 must not appear in QICN-RELEASE');
  assert(!fs.existsSync(path.join(RELEASE_ROOT, 'artifacts', 'external_adjudication')), 'Stage 3 public artifacts must not appear in QICN-RELEASE');
};

const verifyDependentScriptsPass = () => {
  [
    'scripts/verify-stage3-5-readiness.cjs',
    'scripts/verify-stage3-execution-pilot.cjs',
    'scripts/verify-stage3-execution-readiness.cjs',
    'scripts/verify-stage3-scaffolding.cjs',
    'scripts/verify-stage3-opening-readiness.cjs',
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
    console.log('PASS verify-stage3-controlled-execution-opening');
  });
};

try {
  main().catch((error) => {
    console.error(`FAIL verify-stage3-controlled-execution-opening: ${error.message}`);
    process.exitCode = 1;
  });
} catch (error) {
  console.error(`FAIL verify-stage3-controlled-execution-opening: ${error.message}`);
  process.exitCode = 1;
}

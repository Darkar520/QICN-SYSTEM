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
  /metaphysical subjecthood (achieved|demonstrated|established)/i,
  /machine consciousness (proved|demonstrated|established)/i,
  /Paper 10 (authorized|finalized|concluded)/i
];

const REQUIRED_DOCS = [
  'docs/human_channel_instantiation_contracts.v1.json',
  'docs/human_channel_preregistration_templates.v1.json',
  'docs/matched_intervention_dataset_contracts.v1.json',
  'docs/negative_control_dataset_contracts.v1.json',
  'docs/external_adjudication_preregistration_template.v1.json',
  'docs/human_comparator_preregistration_template.v1.json',
  'docs/reviewer_independence_protocol.v1.json',
  'docs/reviewer_conflict_disclosure_template.v1.json',
  'docs/statistical_analysis_shells.v1.json',
  'docs/adjudicator_independence_criteria.v1.json',
  'docs/reviewer_selection_criteria.v1.json',
  'docs/conflict_of_interest_policy.v1.json',
  'docs/blinding_policy.v1.json',
  'docs/HUMAN_CHANNEL_INSTANTIATION_CONTRACTS.md',
  'docs/PREREGISTRATION_ARCHITECTURE.md',
  'docs/REVIEWER_INDEPENDENCE_PROTOCOL.md',
  'docs/STATISTICAL_ANALYSIS_SHELLS.md'
];

const REQUIRED_RUNTIME = [
  'src/comparative_program/HumanChannelInstantiationContractRegistry.js',
  'src/comparative_program/HumanChannelInstantiationEvaluator.js',
  'src/comparative_program/HumanChannelPreregistrationRegistry.js',
  'src/comparative_program/MatchedInterventionDatasetContractRegistry.js',
  'src/comparative_program/NegativeControlDatasetContractRegistry.js',
  'src/comparative_program/ExternalAdjudicationPreregistrationRegistry.js',
  'src/comparative_program/ReviewerIndependenceRegistry.js',
  'src/comparative_program/AdjudicatorIndependenceRegistry.js',
  'src/comparative_program/StatisticalAnalysisShellRegistry.js',
  'src/comparative_program/Stage3ExecutionReadinessBuilder.js',
  'src/comparative_program/Paper10ProtocolHardeningBuilder.js',
  'scripts/build-stage3-execution-readiness.cjs',
  'scripts/verify-stage3-execution-readiness.cjs'
];

const REQUIRED_SCHEMAS = [
  'src/comparative_program/schemas/human_channel_instantiation_assessment.v1.json',
  'src/comparative_program/schemas/human_channel_preregistration_readiness.v1.json',
  'src/comparative_program/schemas/matched_intervention_dataset_contract_assessment.v1.json',
  'src/comparative_program/schemas/negative_control_dataset_contract_assessment.v1.json',
  'src/comparative_program/schemas/reviewer_independence_assessment.v1.json',
  'src/comparative_program/schemas/external_adjudication_execution_readiness.v1.json',
  'src/comparative_program/schemas/paper10_protocol_hardening_status.v1.json'
];

const REQUIRED_ARTIFACTS = [
  'artifacts/external_adjudication/stage3_1/human_channel_instantiation_assessment.json',
  'artifacts/external_adjudication/stage3_1/human_channel_preregistration_readiness.json',
  'artifacts/external_adjudication/stage3_1/matched_intervention_dataset_contract_assessment.json',
  'artifacts/external_adjudication/stage3_1/negative_control_dataset_contract_assessment.json',
  'artifacts/external_adjudication/stage3_2/reviewer_independence_assessment.json',
  'artifacts/external_adjudication/stage3_2/external_adjudication_execution_readiness.json',
  'artifacts/external_adjudication/stage3_2/paper10_protocol_hardening_status.json',
  'artifacts/external_adjudication/stage3_2/external_adjudication_manifest.json',
  'artifacts/external_adjudication/stage3_2/external_adjudication_readiness_gate.json',
  'artifacts/external_adjudication/stage3_2/stage3_verification_matrix.json'
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
    assert(exists(relativePath), `Missing required Stage3-1/3-2 surface: ${relativePath}`);
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

const verifyPaper10 = () => {
  const mainTex = readText('paper10_external_adjudication_and_human_comparators/main.tex');
  assert(/SCAFFOLD ONLY -- NOT FINAL MANUSCRIPT/.test(mainTex), 'Paper 10 scaffold marker missing');
  assert(/PROTOCOL-GRADE BACKBONE/i.test(mainTex), 'Paper 10 protocol-grade marker missing');
  assert(/intentionally non-result-bearing at Stage3-0/i.test(mainTex), 'Paper 10 blocked result marker missing');
  assert(/Evidence Insertion Map/i.test(mainTex), 'Paper 10 evidence insertion map missing');
  assert(!/\\section\{Results\}.*(?:demonstrate|show|prove)/is.test(mainTex), 'Paper 10 contains result-bearing Results wording');
  assert(!/human equivalence/i.test(mainTex) || /does not|not /i.test(mainTex), 'Paper 10 leaks human equivalence wording without negation');
};

const verifyArtifacts = () => {
  const instantiation = readJson('artifacts/external_adjudication/stage3_1/human_channel_instantiation_assessment.json');
  const prereg = readJson('artifacts/external_adjudication/stage3_1/human_channel_preregistration_readiness.json');
  const matched = readJson('artifacts/external_adjudication/stage3_1/matched_intervention_dataset_contract_assessment.json');
  const negative = readJson('artifacts/external_adjudication/stage3_1/negative_control_dataset_contract_assessment.json');
  const reviewer = readJson('artifacts/external_adjudication/stage3_2/reviewer_independence_assessment.json');
  const readiness = readJson('artifacts/external_adjudication/stage3_2/external_adjudication_execution_readiness.json');
  const paper10 = readJson('artifacts/external_adjudication/stage3_2/paper10_protocol_hardening_status.json');
  const manifest = readJson('artifacts/external_adjudication/stage3_2/external_adjudication_manifest.json');
  const gate = readJson('artifacts/external_adjudication/stage3_2/external_adjudication_readiness_gate.json');
  const matrix = readJson('artifacts/external_adjudication/stage3_2/stage3_verification_matrix.json');

  assert(instantiation.channel_assessments.length === 7, 'Human channel instantiation assessment must cover seven channels');
  assert(instantiation.human_data_state === 'human_comparator_data_absent', 'Human data must remain absent');
  assert(['instantiation_ready_or_partially_ready', 'instantiation_incomplete'].includes(instantiation.overall_state), 'Instantiation overall state is out of bounds');
  assert(prereg.preregistration_state === 'preregistration_ready_for_freeze', 'Preregistration templates must be ready for freeze');
  assert(prereg.execution_state === 'preregistration_not_executed', 'Preregistration execution must remain not executed');
  assert(matched.contract_state === 'dataset_contract_ready_but_uninstantiated', 'Matched intervention contracts must remain uninstantiated');
  assert(negative.contract_state === 'negative_control_contract_ready_but_uninstantiated', 'Negative control contracts must remain uninstantiated');
  assert(reviewer.reviewer_selection_state === 'reviewer_selection_ready', 'Reviewer selection should be ready, not started');
  assert(reviewer.adjudication_execution_state === 'adjudication_execution_not_open', 'Adjudication execution must remain closed');
  assert(readiness.external_adjudication_state === 'external_adjudication_ready_for_preregistration', 'Execution readiness must stop at preregistration readiness');
  assert(readiness.execution_state === 'external_adjudication_not_executed', 'External adjudication must remain unexecuted');
  assert(readiness.human_data_state === 'human_comparator_data_absent', 'Execution readiness must keep human data absent');
  assert(paper10.paper10_state === 'paper10_protocol_grade_backbone', 'Paper 10 must be protocol-grade');
  assert(paper10.paper10_authorization_state === 'paper10_not_final_authorized', 'Paper 10 final authorization must remain blocked');
  assert(paper10.blocked_result_marker_present === true, 'Paper 10 blocked result marker must be present');
  assert(manifest.external_adjudication_state === readiness.external_adjudication_state, 'Manifest must match execution readiness state');
  assert(gate.execution_state === 'external_adjudication_not_executed', 'Readiness gate must keep execution closed');
  assert(matrix.status === 'PASS', 'Stage3 execution-readiness verification matrix must pass');
};

const verifyRuntimeImport = async () => {
  const moduleUrl = pathToFileURL(path.join(ROOT, 'src', 'comparative_program', 'index.js')).href;
  const comparative = await import(moduleUrl);
  const description = comparative.describeComparativeProgramLayer();
  assert(
    ['stage3_readiness_fulfillment', 'stage3_execution_pilot_preparation'].includes(description.current_stage),
    'Comparative layer must advertise a valid Stage 3 family'
  );
  assert(
    [
      'stage3_2_external_adjudication_execution_readiness',
      'stage3_3_preregistration_freeze_and_pilot_packaging',
      'stage3_4_execution_pilot_dry_run'
    ].includes(description.current_stage3_substage),
    'Comparative layer must advertise a valid Stage3 substage'
  );
  assert(typeof comparative.createStage3ExecutionReadinessBuilder === 'function', 'Stage3 execution readiness builder export missing');
};

const verifyReleaseUnchanged = () => {
  assert(fs.existsSync(path.join(RELEASE_ROOT, '.git')), 'QICN-RELEASE repo root missing for unchanged-state verification');
  const status = cp.execFileSync('git', ['status', '--short'], {
    cwd: RELEASE_ROOT,
    encoding: 'utf8'
  }).trim();
  assert(status === '', 'QICN-RELEASE changed during Stage3-1/3-2 hardening');
};

const verifyDependentScriptsPass = () => {
  [
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
  verifyPaper10();
  verifyArtifacts();
  verifyReleaseUnchanged();
  verifyDependentScriptsPass();

  return verifyRuntimeImport().then(() => {
    console.log('PASS verify-stage3-execution-readiness');
  });
};

try {
  main().catch((error) => {
    console.error(`FAIL verify-stage3-execution-readiness: ${error.message}`);
    process.exitCode = 1;
  });
} catch (error) {
  console.error(`FAIL verify-stage3-execution-readiness: ${error.message}`);
  process.exitCode = 1;
}

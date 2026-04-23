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
  'docs/EXTERNAL_ADJUDICATION_PROGRAM.md',
  'docs/EXTERNAL_EVIDENCE_ADMISSIBILITY.md',
  'docs/HUMAN_COMPARATOR_EXECUTION_PROGRAM.md',
  'docs/STAGE3_EXTERNAL_ADJUDICATION_BOUNDARY.md',
  'docs/STAGE3_IMPLEMENTATION_PLAN.md',
  'docs/STAGE3_NONCLAIMS.md',
  'docs/STAGE3_SURFACE_POLICY.md',
  'docs/PAPER10_SCAFFOLD_PLAN.md'
];
const REQUIRED_MANIFESTS = [
  'docs/external_adjudication_protocol.v1.json',
  'docs/external_evidence_admissibility_criteria.v1.json',
  'docs/human_comparator_execution_protocol.v1.json',
  'docs/stage3_surface_policy.v1.json',
  'docs/stage3_artifact_schema.v1.json',
  'docs/paper10_scaffold_manifest.v1.json'
];
const REQUIRED_RUNTIME = [
  'src/comparative_program/ExternalAdjudicationProtocolRegistry.js',
  'src/comparative_program/ExternalEvidenceAdmissibilityRegistry.js',
  'src/comparative_program/HumanComparatorExecutionProtocolRegistry.js',
  'src/comparative_program/Stage3SurfacePolicy.js',
  'src/comparative_program/Stage3ArtifactRegistry.js',
  'src/comparative_program/Paper10ScaffoldRegistry.js',
  'src/comparative_program/Stage3Layer.js'
];
const REQUIRED_SCHEMAS = [
  'src/comparative_program/schemas/external_adjudication_manifest.v1.json',
  'src/comparative_program/schemas/external_adjudication_readiness_gate.v1.json',
  'src/comparative_program/schemas/external_evidence_admissibility_assessment.v1.json',
  'src/comparative_program/schemas/human_comparator_execution_plan.v1.json',
  'src/comparative_program/schemas/paper10_scaffold_status.v1.json',
  'src/comparative_program/schemas/stage3_verification_matrix.v1.json'
];
const REQUIRED_ARTIFACTS = [
  'artifacts/external_adjudication/stage3_0/external_adjudication_manifest.json',
  'artifacts/external_adjudication/stage3_0/external_adjudication_readiness_gate.json',
  'artifacts/external_adjudication/stage3_0/external_evidence_admissibility_assessment.json',
  'artifacts/external_adjudication/stage3_0/human_comparator_execution_plan.json',
  'artifacts/external_adjudication/stage3_0/paper10_scaffold_status.json',
  'artifacts/external_adjudication/stage3_0/stage3_verification_matrix.json'
];
const REQUIRED_PAPER10 = [
  'paper10_external_adjudication_and_human_comparators/main.tex',
  'paper10_external_adjudication_and_human_comparators/paper10_local_references.bib',
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
  relativePaths.forEach((relativePath) =>
    assert(exists(relativePath), `Missing required file: ${relativePath}`)
  );
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
  assert(/intentionally non-result-bearing at Stage3-0/i.test(mainTex), 'Paper 10 blocked result marker missing');
  assert(!/\\section\{Results\}.*(?:demonstrate|show|prove)/is.test(mainTex), 'Paper 10 contains result-bearing results section wording');
  assert(!/human equivalence/i.test(mainTex) || /does not/i.test(mainTex), 'Paper 10 leaks human equivalence wording without negation');
};

const verifyArtifacts = () => {
  const manifest = readJson('artifacts/external_adjudication/stage3_0/external_adjudication_manifest.json');
  const readiness = readJson('artifacts/external_adjudication/stage3_0/external_adjudication_readiness_gate.json');
  const admissibility = readJson('artifacts/external_adjudication/stage3_0/external_evidence_admissibility_assessment.json');
  const comparator = readJson('artifacts/external_adjudication/stage3_0/human_comparator_execution_plan.json');
  const paper10 = readJson('artifacts/external_adjudication/stage3_0/paper10_scaffold_status.json');
  const matrix = readJson('artifacts/external_adjudication/stage3_0/stage3_verification_matrix.json');

  assert(manifest.external_adjudication_state === 'external_adjudication_protocol_defined', 'External adjudication protocol state must be defined');
  assert(manifest.execution_state === 'external_adjudication_not_executed', 'External adjudication execution must remain absent');
  assert(readiness.human_data_state === 'human_comparator_data_absent', 'Human comparator data must remain absent');
  assert(comparator.execution_state === 'comparator_execution_not_open', 'Comparator execution must remain not open');
  assert(paper10.paper10_state === 'paper10_scaffold_open', 'Paper 10 scaffold state must be open');
  assert(paper10.paper10_authorization_state === 'not_paper10_final_authorized', 'Paper 10 final authorization must remain blocked');
  assert(paper10.scaffold_only_marker_present === true, 'Paper 10 scaffold marker must be true');
  assert(paper10.result_sections_blocked === true, 'Paper 10 result sections must stay blocked');
  assert(admissibility.assessment_state === 'criteria_defined_not_exercised', 'Admissibility assessment must remain criteria-only');
  assert(matrix.status === 'PASS', 'Stage3 verification matrix must pass');
};

const verifyRuntimeImport = async () => {
  const moduleUrl = pathToFileURL(path.join(ROOT, 'src', 'comparative_program', 'index.js')).href;
  const comparative = await import(moduleUrl);
  assert(typeof comparative.describeStage3Layer === 'function', 'Stage3 layer export missing');
  const stage3 = comparative.describeStage3Layer();
  assert(stage3.stage3_0_scaffold_only === true, 'Stage3 layer must advertise scaffold-only state');
  assert(stage3.external_adjudication_executed === false, 'Stage3 layer must keep adjudication unexecuted');
  assert(stage3.paper10_scaffold_created === true, 'Stage3 layer must advertise Paper 10 scaffold creation');
  assert(stage3.paper10_final_authorized === false, 'Stage3 layer must keep Paper 10 final blocked');
};

const verifyReleaseUnchanged = () => {
  assert(fs.existsSync(path.join(RELEASE_ROOT, '.git')), 'QICN-RELEASE repo root missing for unchanged-state verification');
  const status = cp.execFileSync('git', ['status', '--short'], {
    cwd: RELEASE_ROOT,
    encoding: 'utf8'
  }).trim();
  assert(status === '', 'QICN-RELEASE changed during Stage3-0 scaffolding');
};

const verifyDependentScriptsPass = () => {
  cp.execFileSync('node', [path.join(ROOT, 'scripts', 'verify-stage3-opening-readiness.cjs')], {
    cwd: ROOT,
    stdio: 'pipe'
  });
  if (exists('scripts/verify-paper9-handoff-readiness.cjs')) {
    cp.execFileSync('node', [path.join(ROOT, 'scripts', 'verify-paper9-handoff-readiness.cjs')], {
      cwd: ROOT,
      stdio: 'pipe'
    });
  }
  cp.execFileSync('node', [path.join(ROOT, 'scripts', 'verify-source-of-truth.cjs')], {
    cwd: ROOT,
    stdio: 'pipe'
  });
};

const main = async () => {
  ensureFilesExist([
    ...REQUIRED_DOCS,
    ...REQUIRED_MANIFESTS,
    ...REQUIRED_RUNTIME,
    ...REQUIRED_SCHEMAS,
    ...REQUIRED_ARTIFACTS,
    ...REQUIRED_PAPER10
  ]);
  ensureNoPathLeaks([
    ...REQUIRED_DOCS,
    ...REQUIRED_MANIFESTS,
    ...REQUIRED_SCHEMAS,
    ...REQUIRED_ARTIFACTS,
    ...REQUIRED_PAPER10
  ]);
  ensureNoBannedClaims([
    ...REQUIRED_DOCS,
    ...REQUIRED_MANIFESTS,
    ...REQUIRED_ARTIFACTS,
    ...REQUIRED_PAPER10
  ]);
  REQUIRED_RUNTIME.forEach(runNodeCheck);
  verifyPaper10();
  verifyArtifacts();
  await verifyRuntimeImport();
  verifyReleaseUnchanged();
  verifyDependentScriptsPass();

  console.log('PASS verify-stage3-scaffolding');
};

main().catch((error) => {
  console.error(`FAIL verify-stage3-scaffolding: ${error.message}`);
  process.exitCode = 1;
});

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
  /Paper 10 (authorized|finalized|concluded)/i,
  /metaphysical (closure|subjecthood|conclusion) (achieved|demonstrated|established)/i
];

const REQUIRED_DOCS = [
  'docs/stage3_5_rehearsal_ready_criteria.v1.json',
  'docs/stage3_5_boundary.md',
  'docs/stage3_execution_unlock_map.v1.json',
  'docs/PAPER10_FINALIZATION_UNLOCK_MAP.md',
  'docs/stage3_surface_policy.v1.json',
  'docs/stage3_artifact_schema.v1.json'
];

const REQUIRED_RUNTIME = [
  'src/comparative_program/Stage3_5ReadinessGateBuilder.js',
  'src/comparative_program/Stage3RehearsalPreparationBuilder.js',
  'src/comparative_program/Paper10ProtocolHardeningBuilder.js',
  'scripts/build-stage3-5-readiness.cjs',
  'scripts/verify-stage3-5-readiness.cjs'
];

const REQUIRED_SCHEMAS = [
  'src/comparative_program/schemas/stage3_5_rehearsal_ready_gate.v1.json',
  'src/comparative_program/schemas/stage3_5_manifest.v1.json'
];

const REQUIRED_ARTIFACTS = [
  'artifacts/external_adjudication/stage3_4/provenance_closure_assessment.json',
  'artifacts/external_adjudication/stage3_5/stage3_5_rehearsal_ready_gate.json',
  'artifacts/external_adjudication/stage3_5/stage3_5_manifest.json'
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
    assert(exists(relativePath), `Missing required Stage3-5 readiness surface: ${relativePath}`);
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
  const gate = readJson('artifacts/external_adjudication/stage3_5/stage3_5_rehearsal_ready_gate.json');
  const manifest = readJson('artifacts/external_adjudication/stage3_5/stage3_5_manifest.json');
  const provenance = readJson('artifacts/external_adjudication/stage3_4/provenance_closure_assessment.json');

  assert(gate.stage3_5_state === 'stage3_5_rehearsal_ready', 'Stage3-5 gate must reach rehearsal_ready');
  assert(gate.non_evidential_state === 'stage3_5_non_evidential', 'Stage3-5 gate must remain non-evidential');
  assert(gate.adjudication_state === 'stage3_5_not_adjudicative', 'Stage3-5 gate must remain non-adjudicative');
  assert(manifest.stage3_5_state === gate.stage3_5_state, 'Stage3-5 manifest must match the gate state');
  assert(manifest.provenance_state === provenance.committed_alignment_state, 'Stage3-5 manifest must mirror provenance closure state');
  assert(manifest.instantiated_empty_state === 'instantiated_empty_layer_defined', 'Stage3-5 manifest must record instantiated-empty readiness');
  assert(manifest.rehearsal_kit_state === 'rehearsal_kit_defined', 'Stage3-5 manifest must record rehearsal-kit definition');
};

const verifyPaper10 = () => {
  const mainTex = readText('paper10_external_adjudication_and_human_comparators/main.tex');
  assert(/(FOURTH|FIFTH) HARDENING PASS/i.test(mainTex), 'Paper 10 fourth-or-fifth hardening banner missing');
  assert(/Instantiated-Empty Record Layer/i.test(mainTex), 'Paper 10 instantiated-empty section missing');
  assert(/Execution Pilot Rehearsal Kit Architecture/i.test(mainTex), 'Paper 10 rehearsal-kit section missing');
  assert(/State Grammar for Execution Readiness/i.test(mainTex), 'Paper 10 state-grammar section missing');
  assert(/Stronger Execution-to-Result Transition Map/i.test(mainTex), 'Paper 10 execution-to-result transition map missing');
  assert(/Appendix K: Local Frozen Record Example/i.test(mainTex), 'Paper 10 fourth-pass appendices missing');
};

const verifyRuntimeImport = async () => {
  const moduleUrl = pathToFileURL(path.join(ROOT, 'src', 'comparative_program', 'index.js')).href;
  const comparative = await import(moduleUrl);
  const description = comparative.describeComparativeProgramLayer();
  assert(
    ['stage3_rehearsal_preparation', 'stage3_controlled_execution_opening'].includes(description.current_stage),
    'Comparative layer must advertise the Stage3 rehearsal or later controlled-execution family'
  );
  assert(
    ['stage3_5_rehearsal_ready', 'stage3_6_collection_open_pre_evidential'].includes(description.current_stage3_substage),
    'Comparative layer must advertise the Stage3-5 rehearsal-ready or later Stage3-6 pre-evidential substage'
  );
  assert(description.stage3_4b_instantiated_empty_layer_present === true, 'Comparative layer must advertise Stage3-4B presence');
  assert(description.stage3_5_rehearsal_layer_present === true, 'Comparative layer must advertise Stage3-5 presence');
  assert(typeof comparative.createStage3_5ReadinessGateBuilder === 'function', 'Stage3-5 readiness gate builder export missing');
};

const verifyReleaseUnchanged = () => {
  assert(fs.existsSync(path.join(RELEASE_ROOT, '.git')), 'QICN-RELEASE repo root missing for unchanged-state verification');
  const status = cp.execFileSync('git', ['status', '--short'], {
    cwd: RELEASE_ROOT,
    encoding: 'utf8'
  }).trim();
  assert(status === '', 'QICN-RELEASE changed during Stage3-5 readiness hardening');
};

const verifyDependentScriptsPass = () => {
  [
    'scripts/verify-stage3-rehearsal-kit.cjs',
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
    console.log('PASS verify-stage3-5-readiness');
  });
};

try {
  main().catch((error) => {
    console.error(`FAIL verify-stage3-5-readiness: ${error.message}`);
    process.exitCode = 1;
  });
} catch (error) {
  console.error(`FAIL verify-stage3-5-readiness: ${error.message}`);
  process.exitCode = 1;
}

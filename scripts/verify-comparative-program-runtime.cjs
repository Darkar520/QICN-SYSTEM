#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const ARTIFACT_ROOT = path.join(ROOT, 'artifacts', 'comparative_program', 'stage2m2');

const LOCAL_PATH_PATTERN =
  /\/c:\/|[A-Za-z]:\\Users\\|OneDrive|Escritorio|TRADING 3\.0|Sistema Canon Sandbox|rigid-identity-framework/i;
const BANNED_PATTERNS = [
  /equivalent to a human/i,
  /human equivalence achieved/i,
  /human phenomenal equivalence (achieved|supported|demonstrated)/i,
  /superiority (achieved|supported|demonstrated)/i,
  /transported identity preserved/i,
  /external adjudication (opened|achieved|supported)/i,
  /Paper 10 authorized/i
];

const REQUIRED_RUNTIME_FILES = [
  'src/comparative_program/ComparativeRuntimeUtils.js',
  'src/comparative_program/HumanChannelStatusEvaluator.js',
  'src/comparative_program/HumanComparatorAssessmentBuilder.js',
  'src/comparative_program/HumanEquivalenceAssessmentBuilder.js',
  'src/comparative_program/CrossSubstrateTransportAssessmentBuilder.js',
  'src/comparative_program/ComparativeProgramRootBuilder.js',
  'docs/human_channel_requirements.v1.json',
  'docs/comparator_burden_matrix.v1.json'
];

const REQUIRED_ARTIFACTS = [
  'human_comparator_assessment.json',
  'human_equivalence_assessment.json',
  'cross_substrate_transport_assessment.json',
  'comparative_program_manifest.json',
  'comparative_program_verification_matrix.json',
  'comparative_program_readiness_gate.json'
];

const exists = (relativePath) => fs.existsSync(path.join(ROOT, relativePath));
const readText = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const readJson = (relativePath) => JSON.parse(readText(relativePath));

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const verifyArtifacts = () => {
  const comparator = readJson('artifacts/comparative_program/stage2m2/human_comparator_assessment.json');
  const equivalence = readJson('artifacts/comparative_program/stage2m2/human_equivalence_assessment.json');
  const transport = readJson('artifacts/comparative_program/stage2m2/cross_substrate_transport_assessment.json');
  const manifest = readJson('artifacts/comparative_program/stage2m2/comparative_program_manifest.json');
  const matrix = readJson('artifacts/comparative_program/stage2m2/comparative_program_verification_matrix.json');
  const readiness = readJson('artifacts/comparative_program/stage2m2/comparative_program_readiness_gate.json');

  assert(comparator.current_comparator_state === 'comparator_blocked', 'Comparator state must remain blocked');
  assert(
    Array.isArray(comparator.blocked_states) && comparator.blocked_states.length > 0,
    'Comparator assessment must record blocked states'
  );
  assert(
    equivalence.current_rung === 'equivalence_not_open'
      || equivalence.current_rung === 'comparator_underdetermined'
      || equivalence.current_rung === 'equivalence_formally_inexpressible',
    'Equivalence rung must remain bounded'
  );
  assert(equivalence.assessment_state === 'no_verdict_authorized', 'Equivalence assessment must block verdict authorization');
  assert(
    transport.current_transport_class === 'transport_not_open'
      || transport.current_transport_class === 'comparator_underdetermined_transport',
    'Transport class must remain bounded'
  );
  assert(transport.assessment_state === 'no_verdict_authorized', 'Transport assessment must block verdict authorization');
  assert(manifest.program_status === 'comparative_runtime_open_but_human_blocked', 'Manifest must record blocked comparative runtime');
  assert(matrix.status === 'PASS', 'Verification matrix must pass');
  assert(
    readiness.readiness_class === 'comparative_runtime_open_but_human_blocked'
      || readiness.readiness_class === 'comparative_runtime_partially_open',
    'Readiness class must remain bounded'
  );
  assert(
    readiness.external_comparative_adjudication_state === 'not_ready_for_external_comparative_adjudication',
    'Readiness gate must block external adjudication'
  );
};

const verifyNoLeaks = () => {
  REQUIRED_ARTIFACTS.forEach((fileName) => {
    const fullPath = path.join(ARTIFACT_ROOT, fileName);
    const text = fs.readFileSync(fullPath, 'utf8');
    assert(!LOCAL_PATH_PATTERN.test(text), `Path leak found in ${fileName}`);
    BANNED_PATTERNS.forEach((pattern) =>
      assert(!pattern.test(text), `Banned wording found in ${fileName}: ${pattern}`)
    );
  });
};

const verifyNoForbiddenFiles = () => {
  [
    'docs/PAPER10_PROTOCOL.md',
    'docs/EXTERNAL_COMPARATIVE_ADJUDICATION.md',
    'artifacts/comparative_program/stage2m2/comparative_program_candidate_projection.json',
    'artifacts/comparative_program/stage2m2/comparative_program_audit_handoff_summary.json'
  ].forEach((relativePath) => assert(!exists(relativePath), `Forbidden file exists: ${relativePath}`));
};

const verifyRuntimeImport = async () => {
  const moduleUrl = pathToFileURL(path.join(ROOT, 'src', 'comparative_program', 'index.js')).href;
  const comparative = await import(moduleUrl);
  assert(
    typeof comparative.createComparativeProgramRootBuilder === 'function',
    'Comparative root builder export missing'
  );
};

const main = async () => {
  REQUIRED_RUNTIME_FILES.forEach((relativePath) =>
    assert(exists(relativePath), `Missing required runtime file: ${relativePath}`)
  );
  REQUIRED_ARTIFACTS.forEach((fileName) =>
    assert(fs.existsSync(path.join(ARTIFACT_ROOT, fileName)), `Missing runtime artifact: ${fileName}`)
  );
  verifyArtifacts();
  verifyNoLeaks();
  verifyNoForbiddenFiles();
  await verifyRuntimeImport();
  console.log('PASS verify-comparative-program-runtime');
};

main().catch((error) => {
  console.error(`FAIL verify-comparative-program-runtime: ${error.message}`);
  process.exitCode = 1;
});

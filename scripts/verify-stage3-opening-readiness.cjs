#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const LOCAL_PATH_PATTERN =
  /\/c:\/|[A-Za-z]:\\Users\\|OneDrive|Escritorio|QICN-FRAMEWORK|Sistema Canon Sandbox|rigid-identity-framework/i;
const BANNED_PATTERNS = [
  /equivalent to a human/i,
  /human equivalence achieved/i,
  /superiority (achieved|supported|demonstrated)/i,
  /inferiority (achieved|supported|demonstrated)/i,
  /external adjudication (opened|achieved|supported)/i,
  /Paper 10 authorized/i,
  /identity preservation achieved/i
];

const REQUIRED_DOCS = [
  'docs/PAPER9_PREREQUISITES.md',
  'docs/PAPER9_HANDOFF_ALIGNMENT.md',
  'docs/STAGE3_OPENING_GATE.md',
  'docs/HUMAN_CHANNEL_INSTANTIATION_PROTOCOLS.md',
  'docs/human_channel_instantiation_protocols.v1.json',
  'docs/comparative_counterpart_schema_registry.v1.json',
  'docs/comparative_error_budget_bindings.v1.json'
];
const REQUIRED_SCHEMAS = [
  'src/comparative_program/schemas/comparative_burden_fulfillment.v1.json',
  'src/comparative_program/schemas/stage3_opening_readiness.v1.json',
  'src/comparative_program/schemas/paper9_handoff_alignment.v1.json',
  'src/comparative_program/schemas/stage3_opening_gate.v1.json'
];
const REQUIRED_RUNTIME = [
  'src/comparative_program/ComparativeBurdenFulfillmentEvaluator.js',
  'src/comparative_program/HumanChannelInstantiationProtocolsRegistry.js',
  'src/comparative_program/ComparativeCounterpartSchemaRegistry.js',
  'src/comparative_program/ComparativeErrorBudgetBindingsRegistry.js',
  'src/comparative_program/Paper9HandoffAlignmentEvaluator.js',
  'src/comparative_program/Stage3ReadinessFulfillmentBuilder.js',
  'scripts/build-stage3-readiness-fulfillment.cjs',
  'scripts/verify-stage3-opening-readiness.cjs'
];
const REQUIRED_ARTIFACTS = [
  'comparative_burden_fulfillment.json',
  'stage3_opening_readiness.json',
  'paper9_handoff_alignment.json',
  'stage3_opening_gate.json',
  'comparative_program_manifest.json',
  'comparative_program_verification_matrix.json',
  'comparative_program_readiness_gate.json'
];
const FORBIDDEN_FILES = [
  'docs/PAPER10_PROTOCOL.md',
  'docs/EXTERNAL_COMPARATIVE_ADJUDICATION.md',
  'artifacts/comparative_program/stage3_readiness/comparative_program_candidate_projection.json',
  'artifacts/comparative_program/stage3_readiness/comparative_program_audit_handoff_summary.json',
  'artifacts/comparative_program/stage3_readiness/external_comparative_adjudication.json'
];

const exists = (relativePath) => fs.existsSync(path.join(ROOT, relativePath));
const readText = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const readJson = (relativePath) => JSON.parse(readText(relativePath));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const ensureFilesExist = (relativePaths) => {
  relativePaths.forEach((relativePath) => assert(exists(relativePath), `Missing required file: ${relativePath}`));
};
const ensureNoPathLeaks = (relativePaths) => {
  relativePaths.forEach((relativePath) => {
    const text = readText(relativePath);
    assert(!LOCAL_PATH_PATTERN.test(text), `Path leak found in ${relativePath}`);
  });
};
const ensureNoOverclaimWording = (relativePaths) => {
  relativePaths.forEach((relativePath) => {
    const text = readText(relativePath);
    BANNED_PATTERNS.forEach((pattern) => assert(!pattern.test(text), `Banned wording found in ${relativePath}: ${pattern}`));
  });
};

const verifyArtifacts = () => {
  const burdenFulfillment = readJson('artifacts/comparative_program/stage3_readiness/comparative_burden_fulfillment.json');
  const stage3Readiness = readJson('artifacts/comparative_program/stage3_readiness/stage3_opening_readiness.json');
  const paper9Alignment = readJson('artifacts/comparative_program/stage3_readiness/paper9_handoff_alignment.json');
  const stage3Gate = readJson('artifacts/comparative_program/stage3_readiness/stage3_opening_gate.json');
  const manifest = readJson('artifacts/comparative_program/stage3_readiness/comparative_program_manifest.json');
  const matrix = readJson('artifacts/comparative_program/stage3_readiness/comparative_program_verification_matrix.json');
  const readinessGate = readJson('artifacts/comparative_program/stage3_readiness/comparative_program_readiness_gate.json');

  assert(['burden_fulfillment_partial', 'burden_fulfillment_substantive_but_incomplete'].includes(burdenFulfillment.burden_fulfillment_state), 'Burden fulfillment state is out of bounds');
  assert(burdenFulfillment.burdens.length === 7, 'Stage3 burden fulfillment must cover the seven Stage 3-relevant burdens');
  assert(burdenFulfillment.burdens.every((entry) => ['closable_now_internally', 'partially_closable_now', 'blocked_pending_real_human_counterpart', 'blocked_pending_external_program'].includes(entry.stage3_closure_classification)), 'Burden fulfillment contains an unknown closure classification');
  assert(burdenFulfillment.burdens.every((entry) => ['fulfilled_for_stage3_opening_but_uninstantiated', 'stage3_prerequisite_still_open'].includes(entry.stage3_fulfillment_state)), 'Burden fulfillment contains an unknown fulfillment state');
  assert(['stage3_prerequisites_partially_satisfied', 'stage3_ready_but_uninstantiated'].includes(stage3Readiness.readiness_class), 'Stage3 readiness class is out of bounds');
  assert(['ready_for_stage3_opening', 'not_ready_for_stage3_opening'].includes(stage3Readiness.stage3_opening_state), 'Stage3 opening state is out of bounds');
  assert(['paper9_handoff_misaligned', 'paper9_handoff_ready_after_second_pass'].includes(paper9Alignment.paper9_handoff_state), 'Paper9 handoff state is out of bounds');
  assert(['stage3_prerequisites_partially_satisfied', 'ready_for_stage3_opening'].includes(stage3Gate.stage3_gate_state), 'Stage3 gate state is out of bounds');
  assert(stage3Gate.external_comparative_adjudication_state === 'not_ready_for_external_comparative_adjudication', 'External adjudication must remain blocked');
  assert(stage3Gate.paper10_authorization_state === 'not_paper10_authorized', 'Paper10 must remain blocked');
  assert(matrix.status === 'PASS', 'Stage3 verification matrix must pass');
  assert(manifest.program_status === readinessGate.readiness_class, 'Stage3 manifest and readiness gate must agree');
  assert(readinessGate.stage3_opening_state === stage3Gate.stage3_opening_state, 'Stage3 readiness gate and Stage3 opening gate must agree');
};

const verifyForbiddenFilesAbsent = () => {
  FORBIDDEN_FILES.forEach((relativePath) => assert(!exists(relativePath), `Forbidden file exists: ${relativePath}`));
};

const verifyRuntimeImport = async () => {
  const moduleUrl = pathToFileURL(path.join(ROOT, 'src', 'comparative_program', 'index.js')).href;
  const comparative = await import(moduleUrl);
  const description = comparative.describeComparativeProgramLayer();
  assert(
    ['stage3_readiness_fulfillment', 'stage3_execution_pilot_preparation', 'stage3_rehearsal_preparation'].includes(description.current_stage),
    'Comparative layer must advertise a valid Stage 3 current stage'
  );
  assert(typeof comparative.createStage3ReadinessFulfillmentBuilder === 'function', 'Stage3 readiness fulfillment builder export missing');
};

const main = async () => {
  ensureFilesExist([
    ...REQUIRED_DOCS,
    ...REQUIRED_SCHEMAS,
    ...REQUIRED_RUNTIME,
    ...REQUIRED_ARTIFACTS.map((fileName) => path.join('artifacts/comparative_program/stage3_readiness', fileName))
  ]);
  ensureNoPathLeaks([
    ...REQUIRED_DOCS,
    ...REQUIRED_SCHEMAS,
    ...REQUIRED_ARTIFACTS.map((fileName) => path.join('artifacts/comparative_program/stage3_readiness', fileName))
  ]);
  ensureNoOverclaimWording([
    ...REQUIRED_DOCS,
    ...REQUIRED_ARTIFACTS.map((fileName) => path.join('artifacts/comparative_program/stage3_readiness', fileName))
  ]);
  verifyArtifacts();
  verifyForbiddenFilesAbsent();
  await verifyRuntimeImport();

  console.log('PASS verify-stage3-opening-readiness');
};

main().catch((error) => {
  console.error(`FAIL verify-stage3-opening-readiness: ${error.message}`);
  process.exitCode = 1;
});

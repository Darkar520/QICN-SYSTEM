#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const ARTIFACT_ROOT = path.join(ROOT, 'artifacts', 'comparative_program', 'stage2m3');

const LOCAL_PATH_PATTERN =
  /\/c:\/|[A-Za-z]:\\Users\\|OneDrive|Escritorio|TRADING 3\.0|Sistema Canon Sandbox|rigid-identity-framework/i;
const BANNED_PATTERNS = [
  /equivalent to a human/i,
  /human equivalence achieved/i,
  /superiority (achieved|supported|demonstrated)/i,
  /inferiority (achieved|supported|demonstrated)/i,
  /transport[\s-]preservation (achieved|supported|demonstrated)/i,
  /identity preservation (achieved|supported|demonstrated)/i,
  /external adjudication (opened|achieved|supported)/i,
  /Paper 10 authorized/i
];

const REQUIRED_DOCS = [
  'docs/HUMAN_CHANNEL_PATHWAYS.md',
  'docs/COUNTERPART_ARTIFACT_CONTRACTS.md',
  'docs/HOMOLOGATION_CONTRACTS.md',
  'docs/CROSS_SUBSTRATE_TRANSITION_CONTRACTS.md'
];

const REQUIRED_MANIFESTS = [
  'docs/human_channel_pathways.v1.json',
  'docs/counterpart_artifact_contracts.v1.json',
  'docs/homologation_contracts.v1.json',
  'docs/cross_substrate_transition_contracts.v1.json',
  'docs/comparative_program_artifact_schema.v1.json',
  'docs/comparative_program_surface_policy.v1.json'
];

const REQUIRED_SCHEMAS = [
  'src/comparative_program/schemas/human_channel_pathway_assessment.v1.json',
  'src/comparative_program/schemas/counterpart_artifact_contract_assessment.v1.json',
  'src/comparative_program/schemas/homologation_contract_assessment.v1.json',
  'src/comparative_program/schemas/cross_substrate_transition_contract_assessment.v1.json',
  'src/comparative_program/schemas/comparative_operational_readiness.v1.json'
];

const REQUIRED_RUNTIME = [
  'src/comparative_program/HumanChannelPathwaysRegistry.js',
  'src/comparative_program/CounterpartArtifactContractsRegistry.js',
  'src/comparative_program/HomologationContractsRegistry.js',
  'src/comparative_program/CrossSubstrateTransitionContractsRegistry.js',
  'src/comparative_program/HumanChannelPathwayEvaluator.js',
  'src/comparative_program/CounterpartArtifactContractEvaluator.js',
  'src/comparative_program/HomologationContractEvaluator.js',
  'src/comparative_program/CrossSubstrateTransitionContractEvaluator.js',
  'src/comparative_program/ComparativeOperationalReadinessBuilder.js'
];

const REQUIRED_ARTIFACTS = [
  'human_channel_pathway_assessment.json',
  'counterpart_artifact_contract_assessment.json',
  'homologation_contract_assessment.json',
  'cross_substrate_transition_contract_assessment.json',
  'comparative_operational_readiness.json',
  'comparative_program_manifest.json',
  'comparative_program_verification_matrix.json',
  'comparative_program_readiness_gate.json'
];

const FORBIDDEN_FILES = [
  'docs/PAPER10_PROTOCOL.md',
  'docs/EXTERNAL_COMPARATIVE_ADJUDICATION.md',
  'artifacts/comparative_program/stage2m2/comparative_program_candidate_projection.json',
  'artifacts/comparative_program/stage2m2/comparative_program_audit_handoff_summary.json',
  'artifacts/comparative_program/stage2m3/comparative_program_candidate_projection.json',
  'artifacts/comparative_program/stage2m3/comparative_program_audit_handoff_summary.json'
];

const PATH_LEAK_CHECKED_FILES = [...REQUIRED_DOCS, ...REQUIRED_MANIFESTS, ...REQUIRED_SCHEMAS, ...REQUIRED_RUNTIME];

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

const ensureNoOverclaimWording = (relativePaths) => {
  relativePaths.forEach((relativePath) => {
    const text = readText(relativePath);
    BANNED_PATTERNS.forEach((pattern) =>
      assert(!pattern.test(text), `Banned wording found in ${relativePath}: ${pattern}`)
    );
  });
};

const ensureForbiddenFilesAbsent = () => {
  FORBIDDEN_FILES.forEach((relativePath) =>
    assert(!exists(relativePath), `Forbidden file exists: ${relativePath}`)
  );
};

const verifyManifests = () => {
  const pathways = readJson('docs/human_channel_pathways.v1.json');
  const counterpartContracts = readJson('docs/counterpart_artifact_contracts.v1.json');
  const homologationContracts = readJson('docs/homologation_contracts.v1.json');
  const transitionContracts = readJson('docs/cross_substrate_transition_contracts.v1.json');
  const schemaRegistry = readJson('docs/comparative_program_artifact_schema.v1.json');
  const surfacePolicy = readJson('docs/comparative_program_surface_policy.v1.json');

  const requiredPathwayStatuses = [
    'pathway_not_open',
    'pathway_defined_but_uninstantiated',
    'pathway_contract_incomplete',
    'pathway_contract_ready_but_counterpart_absent',
    'pathway_blocked_by_forbidden_proxy',
    'pathway_theoretically_open'
  ];
  const requiredCounterpartStatuses = [
    'counterpart_contract_defined_but_uninstantiated',
    'counterpart_contract_ready_but_counterpart_absent',
    'counterpart_contract_incomplete',
    'counterpart_contract_blocked_by_invalid_substitution',
    'counterpart_contract_theoretically_admissible'
  ];
  const requiredHomologationStatuses = [
    'homologation_not_open',
    'homologation_contract_defined',
    'homologation_contract_incomplete',
    'homologation_contract_ready_but_counterpart_absent',
    'homologation_underdetermined',
    'homologation_not_authorized_for_verdict'
  ];
  const requiredTransitionStatuses = [
    'transition_not_open',
    'transition_contract_defined',
    'transition_contract_incomplete',
    'transition_contract_ready_but_target_absent',
    'transition_contract_underdetermined',
    'transition_not_authorized_for_transport_verdict'
  ];

  const pathwayStatusIds = new Set((pathways.pathway_status_classes || []).map((entry) => entry.id));
  const counterpartStatusIds = new Set(
    (counterpartContracts.contract_status_classes || []).map((entry) => entry.id)
  );
  const homologationStatusIds = new Set(
    (homologationContracts.homologation_status_classes || []).map((entry) => entry.id)
  );
  const transitionStatusIds = new Set(
    (transitionContracts.transition_readiness_classes || []).map((entry) => entry.id)
  );

  requiredPathwayStatuses.forEach((status) =>
    assert(pathwayStatusIds.has(status), `Missing pathway status class: ${status}`)
  );
  requiredCounterpartStatuses.forEach((status) =>
    assert(counterpartStatusIds.has(status), `Missing counterpart status class: ${status}`)
  );
  requiredHomologationStatuses.forEach((status) =>
    assert(homologationStatusIds.has(status), `Missing homologation status class: ${status}`)
  );
  requiredTransitionStatuses.forEach((status) =>
    assert(transitionStatusIds.has(status), `Missing transition status class: ${status}`)
  );

  ['human_channel_pathway_assessment.json', 'counterpart_artifact_contract_assessment.json', 'homologation_contract_assessment.json', 'cross_substrate_transition_contract_assessment.json', 'comparative_operational_readiness.json'].forEach(
    (artifactName) => {
      assert(schemaRegistry.root_schema_refs[artifactName], `Schema registry missing ${artifactName}`);
      assert(surfacePolicy.outputs[artifactName], `Surface policy missing ${artifactName}`);
    }
  );
};

const verifyArtifacts = () => {
  const pathwaysManifest = readJson('docs/human_channel_pathways.v1.json');
  const counterpartManifest = readJson('docs/counterpart_artifact_contracts.v1.json');
  const homologationManifest = readJson('docs/homologation_contracts.v1.json');
  const transitionManifest = readJson('docs/cross_substrate_transition_contracts.v1.json');

  const pathwayStatusIds = new Set((pathwaysManifest.pathway_status_classes || []).map((entry) => entry.id));
  const counterpartStatusIds = new Set(
    (counterpartManifest.contract_status_classes || []).map((entry) => entry.id)
  );
  const homologationStatusIds = new Set(
    (homologationManifest.homologation_status_classes || []).map((entry) => entry.id)
  );
  const transitionStatusIds = new Set(
    (transitionManifest.transition_readiness_classes || []).map((entry) => entry.id)
  );

  const pathwayAssessment = readJson('artifacts/comparative_program/stage2m3/human_channel_pathway_assessment.json');
  const counterpartAssessment = readJson('artifacts/comparative_program/stage2m3/counterpart_artifact_contract_assessment.json');
  const homologationAssessment = readJson('artifacts/comparative_program/stage2m3/homologation_contract_assessment.json');
  const transitionAssessment = readJson('artifacts/comparative_program/stage2m3/cross_substrate_transition_contract_assessment.json');
  const operationalReadiness = readJson('artifacts/comparative_program/stage2m3/comparative_operational_readiness.json');
  const manifest = readJson('artifacts/comparative_program/stage2m3/comparative_program_manifest.json');
  const verificationMatrix = readJson('artifacts/comparative_program/stage2m3/comparative_program_verification_matrix.json');
  const readinessGate = readJson('artifacts/comparative_program/stage2m3/comparative_program_readiness_gate.json');

  const allowedOperationalStates = new Set([
    'comparative_runtime_contract_operationalized',
    'comparative_runtime_homologation_ready_but_counterpart_absent'
  ]);

  assert(
    pathwayAssessment.pathway_layer_state === 'human_channel_pathway_contract_operationalized',
    'Pathway layer must be operationalized'
  );
  assert(
    pathwayAssessment.pathway_authorization_state === 'no_verdict_authorized',
    'Pathway authorization must remain blocked'
  );
  assert(
    (pathwayAssessment.pathway_statuses || []).length === (pathwaysManifest.pathways || []).length,
    'Pathway assessment must cover all pathway definitions'
  );
  assert(
    (pathwayAssessment.pathway_statuses || []).every((entry) => pathwayStatusIds.has(entry.status)),
    'Pathway assessment contains an unknown status'
  );
  assert(
    (pathwayAssessment.partial_openings || []).length > 0,
    'Pathway assessment must record partial openings'
  );

  assert(
    counterpartAssessment.contract_layer_state === 'counterpart_contracts_operationalized_but_counterpart_absent',
    'Counterpart contract layer state must remain bounded'
  );
  assert(
    (counterpartAssessment.contract_statuses || []).every((entry) => counterpartStatusIds.has(entry.status)),
    'Counterpart contract assessment contains an unknown status'
  );
  assert(
    (counterpartAssessment.missing_artifact_families || []).length > 0,
    'Counterpart contract assessment must report missing artifact families'
  );

  assert(
    homologationAssessment.verdict_authorization_state === 'homologation_not_authorized_for_verdict',
    'Homologation verdict authorization must remain blocked'
  );
  assert(
    (homologationAssessment.homologation_units || []).every(
      (entry) =>
        homologationStatusIds.has(entry.status)
        && entry.verdict_authorization_state === 'homologation_not_authorized_for_verdict'
    ),
    'Homologation assessment contains an unknown or unbounded status'
  );
  assert(
    (homologationAssessment.homologation_units || []).some(
      (entry) => entry.status === 'homologation_contract_ready_but_counterpart_absent'
    ),
    'Homologation assessment must record ready-but-counterpart-absent units'
  );

  assert(
    transitionAssessment.transition_layer_state === 'transition_contract_operationalized_but_target_absent',
    'Transition layer state must remain bounded'
  );
  assert(
    transitionAssessment.transport_verdict_authorization_state
      === 'transition_not_authorized_for_transport_verdict',
    'Transition verdict authorization must remain blocked'
  );
  assert(
    (transitionAssessment.transition_contract_statuses || []).every(
      (entry) =>
        transitionStatusIds.has(entry.status)
        && entry.transport_verdict_authorization_state
          === 'transition_not_authorized_for_transport_verdict'
    ),
    'Transition assessment contains an unknown or unbounded status'
  );
  assert(
    (transitionAssessment.missing_transition_artifacts || []).length > 0,
    'Transition assessment must report missing transition artifacts'
  );

  assert(
    allowedOperationalStates.has(operationalReadiness.program_state),
    'Operational readiness must remain inside the bounded M3 state set'
  );
  assert(
    operationalReadiness.stage2_m4_state === 'ready_for_stage2_m4',
    'Operational readiness must expose internal Stage 2-M4 readiness'
  );
  assert(
    operationalReadiness.external_comparative_adjudication_state
      === 'not_ready_for_external_comparative_adjudication',
    'Operational readiness must keep external comparative adjudication blocked'
  );
  assert(
    operationalReadiness.transport_verdict_authorization_state
      === 'transition_not_authorized_for_transport_verdict',
    'Operational readiness must keep transport verdict authorization blocked'
  );
  assert(
    operationalReadiness.superiority_state === 'not_authorized_for_superiority_or_inferiority',
    'Operational readiness must keep superiority and inferiority blocked'
  );

  assert(manifest.program_status === operationalReadiness.program_state, 'Manifest must mirror operational program state');
  assert(
    manifest.current_states.stage2_m4_state === 'ready_for_stage2_m4',
    'Manifest must expose internal Stage 2-M4 readiness'
  );
  assert(
    manifest.boundary_flags.ready_for_stage2_m4 === true,
    'Manifest boundary flags must preserve internal Stage 2-M4 readiness'
  );

  assert(verificationMatrix.status === 'PASS', 'Operational verification matrix must pass');
  assert(
    (verificationMatrix.checks || []).some((entry) => entry.id === 'candidate_surface_blocked' && entry.status === 'PASS'),
    'Verification matrix must preserve blocked candidate surface'
  );
  assert(
    (verificationMatrix.checks || []).some((entry) => entry.id === 'audit_surface_blocked' && entry.status === 'PASS'),
    'Verification matrix must preserve blocked audit surface'
  );
  assert(
    (verificationMatrix.checks || []).some(
      (entry) => entry.id === 'no_equivalence_or_transport_leakage' && entry.status === 'PASS'
    ),
    'Verification matrix must block equivalence and transport leakage'
  );

  assert(readinessGate.program_state === operationalReadiness.program_state, 'Readiness gate must mirror operational state');
  assert(
    readinessGate.external_comparative_adjudication_state === 'not_ready_for_external_comparative_adjudication',
    'Readiness gate must keep external adjudication blocked'
  );
  assert(readinessGate.paper10_status === 'not_paper10_authorized', 'Readiness gate must keep Paper 10 blocked');
};

const verifyNoLeaks = () => {
  REQUIRED_ARTIFACTS.forEach((fileName) => {
    const text = fs.readFileSync(path.join(ARTIFACT_ROOT, fileName), 'utf8');
    assert(!LOCAL_PATH_PATTERN.test(text), `Path leak found in ${fileName}`);
    BANNED_PATTERNS.forEach((pattern) =>
      assert(!pattern.test(text), `Banned wording found in ${fileName}: ${pattern}`)
    );
  });
};

const verifyRuntimeImport = async () => {
  const moduleUrl = pathToFileURL(path.join(ROOT, 'src', 'comparative_program', 'index.js')).href;
  const comparative = await import(moduleUrl);
  assert(
    typeof comparative.createComparativeOperationalReadinessBuilder === 'function',
    'Operational readiness builder export missing'
  );
  assert(
    typeof comparative.createHumanChannelPathwayEvaluator === 'function',
    'Human channel pathway evaluator export missing'
  );
  assert(
    typeof comparative.createCounterpartArtifactContractEvaluator === 'function',
    'Counterpart contract evaluator export missing'
  );
  assert(
    typeof comparative.createHomologationContractEvaluator === 'function',
    'Homologation contract evaluator export missing'
  );
  assert(
    typeof comparative.createCrossSubstrateTransitionContractEvaluator === 'function',
    'Transition contract evaluator export missing'
  );
};

const main = async () => {
  ensureFilesExist([...REQUIRED_DOCS, ...REQUIRED_MANIFESTS, ...REQUIRED_SCHEMAS, ...REQUIRED_RUNTIME]);
  REQUIRED_ARTIFACTS.forEach((fileName) =>
    assert(fs.existsSync(path.join(ARTIFACT_ROOT, fileName)), `Missing runtime artifact: ${fileName}`)
  );
  assert(
    exists('artifacts/comparative_program/stage2m2/comparative_program_readiness_gate.json'),
    'Stage 2-M2 baseline must remain present'
  );
  ensureNoPathLeaks(PATH_LEAK_CHECKED_FILES);
  ensureNoOverclaimWording([...REQUIRED_DOCS, ...REQUIRED_MANIFESTS]);
  ensureForbiddenFilesAbsent();
  verifyManifests();
  verifyArtifacts();
  verifyNoLeaks();
  await verifyRuntimeImport();
  console.log('PASS verify-comparative-program-operationalization');
};

main().catch((error) => {
  console.error(`FAIL verify-comparative-program-operationalization: ${error.message}`);
  process.exitCode = 1;
});
#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const ARTIFACT_ROOT = path.join(ROOT, 'artifacts', 'comparative_program', 'stage2m4');

const LOCAL_PATH_PATTERN =
  /\/c:\/|[A-Za-z]:\\Users\\|OneDrive|Escritorio|TRADING 3\.0|Sistema Canon Sandbox|rigid-identity-framework/i;
const BANNED_PATTERNS = [
  /equivalent to a human/i,
  /human equivalence achieved/i,
  /superiority (achieved|supported|demonstrated)/i,
  /inferiority (achieved|supported|demonstrated)/i,
  /external adjudication (opened|achieved|supported)/i,
  /Paper 10 authorized/i
];

const REQUIRED_DOCS = [
  'docs/HUMAN_COMPARATOR_PROGRAM.md',
  'docs/HUMAN_EQUIVALENCE_PROGRAM.md',
  'docs/CROSS_SUBSTRATE_EXPANSION.md',
  'docs/COMPARATIVE_PROGRAM_IMPLEMENTATION_PLAN.md',
  'docs/COMPARATIVE_PROGRAM_INTERPRETATION_BOUNDARY.md',
  'docs/COMPARATIVE_PROGRAM_NONCLAIMS.md',
  'docs/COMPARATIVE_PROGRAM_SURFACE_POLICY.md',
  'docs/COMPARATIVE_FINAL_INTERNAL_AUDIT.md',
  'docs/EXTERNAL_ADJUDICATION_OPENING_CRITERIA.md',
  'docs/HUMAN_CHANNEL_INSTANTIATION_READINESS.md',
  'docs/PAPER10_COMPARATIVE_PREREQUISITES.md'
];

const REQUIRED_MANIFESTS = [
  'docs/external_adjudication_opening_criteria.v1.json',
  'docs/comparative_program_artifact_schema.v1.json',
  'docs/comparative_program_surface_policy.v1.json'
];

const REQUIRED_SCHEMAS = [
  'src/comparative_program/schemas/comparative_final_internal_audit.v1.json',
  'src/comparative_program/schemas/human_channel_instantiation_readiness.v1.json',
  'src/comparative_program/schemas/paper10_comparative_readiness_gate.v1.json'
];

const REQUIRED_RUNTIME = [
  'src/comparative_program/ExternalAdjudicationOpeningCriteriaRegistry.js',
  'src/comparative_program/HumanChannelInstantiationReadinessEvaluator.js',
  'src/comparative_program/ComparativeFinalInternalAuditor.js',
  'src/comparative_program/Paper10ComparativeReadinessGateBuilder.js',
  'src/comparative_program/ComparativeClosureBuilder.js',
  'scripts/build-comparative-program-closure.cjs',
  'scripts/verify-comparative-program-closure.cjs'
];

const REQUIRED_ARTIFACTS = [
  'comparative_final_internal_audit.json',
  'human_channel_instantiation_readiness.json',
  'paper10_comparative_readiness_gate.json',
  'comparative_program_manifest.json',
  'comparative_program_verification_matrix.json',
  'comparative_program_readiness_gate.json'
];

const FORBIDDEN_FILES = [
  'docs/PAPER10_PROTOCOL.md',
  'docs/EXTERNAL_COMPARATIVE_ADJUDICATION.md',
  'artifacts/comparative_program/stage2m4/comparative_program_candidate_projection.json',
  'artifacts/comparative_program/stage2m4/comparative_program_audit_handoff_summary.json'
];

const exists = (relativePath) => fs.existsSync(path.join(ROOT, relativePath));
const readText = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const readJson = (relativePath) => JSON.parse(readText(relativePath));

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const gitHead = (cwd) => cp.execFileSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' }).trim();
const gitDiffNames = (cwd, fromRef, toRef) =>
  cp
    .execFileSync('git', ['diff', '--name-only', `${fromRef}..${toRef}`], {
      cwd,
      encoding: 'utf8'
    })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

const ARTIFACT_ONLY_FORWARD_PREFIXES = ['artifacts/'];

const evaluateLineageCompatibility = (recordedHead, currentHead) => {
  if (!recordedHead || !currentHead) {
    return {
      pass: false,
      mode: 'missing_lineage',
      changed_files: [],
      disallowed_files: ['missing_lineage']
    };
  }

  if (recordedHead === currentHead) {
    return {
      pass: true,
      mode: 'exact_head_match',
      changed_files: [],
      disallowed_files: []
    };
  }

  const changedFiles = gitDiffNames(ROOT, recordedHead, currentHead);
  const disallowedFiles = changedFiles.filter(
    (relativePath) =>
      !ARTIFACT_ONLY_FORWARD_PREFIXES.some((prefix) => relativePath.startsWith(prefix))
  );

  return {
    pass: disallowedFiles.length === 0,
    mode:
      disallowedFiles.length === 0
        ? 'artifact_only_forward_compatible'
        : 'source_lineage_drift',
    changed_files: changedFiles,
    disallowed_files: disallowedFiles
  };
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

const verifyManifests = () => {
  const criteria = readJson('docs/external_adjudication_opening_criteria.v1.json');
  const schemaRegistry = readJson('docs/comparative_program_artifact_schema.v1.json');
  const surfacePolicy = readJson('docs/comparative_program_surface_policy.v1.json');

  const requiredAuditStatuses = [
    'comparative_audit_incomplete',
    'comparative_audit_pass_with_warnings',
    'comparative_audit_pass'
  ];
  const requiredClosureStatuses = [
    'comparative_internal_closure_not_ready',
    'comparative_internal_closure_ready'
  ];
  const requiredCriteriaStatuses = [
    'adjudication_not_open',
    'adjudication_criteria_defined',
    'adjudication_criteria_partially_satisfied',
    'adjudication_criteria_ready_but_uninstantiated'
  ];
  const requiredStage3States = [
    'ready_for_stage3_opening',
    'not_ready_for_stage3_opening'
  ];
  const requiredInstantiationStatuses = [
    'instantiation_not_open',
    'instantiation_contract_incomplete',
    'instantiation_ready_but_no_counterpart',
    'instantiation_ready_but_governance_blocked',
    'instantiation_formally_open_but_uninstantiated'
  ];
  const requiredPaper10Statuses = [
    'not_paper10_authorized',
    'paper10_scoping_not_open',
    'paper10_scoping_conditionally_open',
    'paper10_scoping_ready_after_stage3_only'
  ];

  const statusIds = (entries) => new Set((entries || []).map((entry) => entry.id));
  const auditStatusIds = statusIds(criteria.audit_status_classes);
  const closureStatusIds = statusIds(criteria.closure_status_classes);
  const criteriaStatusIds = statusIds(criteria.criteria_status_classes);
  const stage3StateIds = statusIds(criteria.stage3_opening_classes);
  const instantiationStatusIds = statusIds(criteria.instantiation_status_classes);
  const paper10StatusIds = statusIds(criteria.paper10_status_classes);

  requiredAuditStatuses.forEach((id) =>
    assert(auditStatusIds.has(id), `Missing audit status class ${id}`)
  );
  requiredClosureStatuses.forEach((id) =>
    assert(closureStatusIds.has(id), `Missing closure status class ${id}`)
  );
  requiredCriteriaStatuses.forEach((id) =>
    assert(criteriaStatusIds.has(id), `Missing adjudication criteria status ${id}`)
  );
  requiredStage3States.forEach((id) =>
    assert(stage3StateIds.has(id), `Missing Stage 3 opening class ${id}`)
  );
  requiredInstantiationStatuses.forEach((id) =>
    assert(instantiationStatusIds.has(id), `Missing instantiation status class ${id}`)
  );
  requiredPaper10Statuses.forEach((id) =>
    assert(paper10StatusIds.has(id), `Missing Paper 10 status class ${id}`)
  );

  [
    'comparative_final_internal_audit.json',
    'human_channel_instantiation_readiness.json',
    'paper10_comparative_readiness_gate.json'
  ].forEach((artifactName) => {
    assert(schemaRegistry.root_schema_refs[artifactName], `Schema registry missing ${artifactName}`);
    assert(surfacePolicy.outputs[artifactName], `Surface policy missing ${artifactName}`);
  });
};

const verifyArtifacts = () => {
  const criteria = readJson('docs/external_adjudication_opening_criteria.v1.json');
  const finalAudit = readJson('artifacts/comparative_program/stage2m4/comparative_final_internal_audit.json');
  const instantiation = readJson('artifacts/comparative_program/stage2m4/human_channel_instantiation_readiness.json');
  const paper10 = readJson('artifacts/comparative_program/stage2m4/paper10_comparative_readiness_gate.json');
  const manifest = readJson('artifacts/comparative_program/stage2m4/comparative_program_manifest.json');
  const matrix = readJson('artifacts/comparative_program/stage2m4/comparative_program_verification_matrix.json');
  const readiness = readJson('artifacts/comparative_program/stage2m4/comparative_program_readiness_gate.json');
  const stage2m2 = readJson('artifacts/comparative_program/stage2m2/comparative_program_readiness_gate.json');
  const stage2m3 = readJson('artifacts/comparative_program/stage2m3/comparative_program_readiness_gate.json');

  const statusIds = (entries) => new Set((entries || []).map((entry) => entry.id));
  const auditStatusIds = statusIds(criteria.audit_status_classes);
  const closureStatusIds = statusIds(criteria.closure_status_classes);
  const criteriaStatusIds = statusIds(criteria.criteria_status_classes);
  const stage3StateIds = statusIds(criteria.stage3_opening_classes);
  const instantiationStatusIds = statusIds(criteria.instantiation_status_classes);
  const paper10StatusIds = statusIds(criteria.paper10_status_classes);
  const currentHead = gitHead(ROOT);
  const stage2m2LineageCompatibility = evaluateLineageCompatibility(
    stage2m2.provenance.current_lineage.qicn_system.head,
    currentHead
  );
  const stage2m3LineageCompatibility = evaluateLineageCompatibility(
    stage2m3.provenance.current_lineage.qicn_system.head,
    currentHead
  );

  assert(auditStatusIds.has(finalAudit.audit_status), 'Final internal audit status is out of bounds');
  assert(
    closureStatusIds.has(finalAudit.current_comparative_readiness_class),
    'Final internal closure state is out of bounds'
  );
  assert(
    finalAudit.current_comparative_readiness_class === 'comparative_internal_closure_ready',
    'Stage 2-M4 must close internally as comparative_internal_closure_ready'
  );
  assert(
    finalAudit.audit_status === 'comparative_audit_pass_with_warnings'
      || finalAudit.audit_status === 'comparative_audit_pass',
    'Final internal audit must pass, with or without warnings'
  );

  assert(
    (instantiation.channel_instantiation_statuses || []).every((entry) => instantiationStatusIds.has(entry.status)),
    'Human-channel instantiation artifact contains an unknown status'
  );

  assert(
    criteriaStatusIds.has(finalAudit.adjudication_criteria_status),
    'Final internal audit adjudication criteria status is out of bounds'
  );
  assert(
    criteriaStatusIds.has(readiness.adjudication_criteria_status),
    'Readiness gate adjudication criteria status is out of bounds'
  );
  assert(
    stage3StateIds.has(finalAudit.stage3_opening_state)
      && stage3StateIds.has(readiness.stage3_opening_state),
    'Stage 3 opening state is out of bounds'
  );
  assert(
    readiness.stage3_opening_state === 'not_ready_for_stage3_opening',
    'Stage 3 must remain unopened under current Stage 2-M4 state'
  );

  assert(
    paper10StatusIds.has(paper10.paper10_readiness_status),
    'Paper 10 readiness status is out of bounds'
  );
  assert(
    paper10.paper10_authorization_state === 'not_paper10_authorized',
    'Paper 10 authorization must remain blocked'
  );
  assert(
    readiness.paper10_status === 'not_paper10_authorized',
    'Comparative readiness gate must keep Paper 10 blocked'
  );

  assert(matrix.status === 'PASS', 'Stage 2-M4 verification matrix must pass');
  assert(
    manifest.program_status === finalAudit.current_comparative_readiness_class,
    'Manifest must mirror final internal closure state'
  );
  assert(
    readiness.readiness_class === manifest.program_status,
    'Readiness gate must mirror the manifest closure state when verification passes'
  );
  assert(
    readiness.external_comparative_adjudication_state === 'not_ready_for_external_comparative_adjudication',
    'External comparative adjudication must remain blocked'
  );
  assert(
    stage2m2LineageCompatibility.pass,
    `Stage 2-M2 artifacts must match current local HEAD or differ only by artifact-only forward commits: ${JSON.stringify(stage2m2LineageCompatibility)}`
  );
  assert(
    stage2m3LineageCompatibility.pass,
    `Stage 2-M3 artifacts must match current local HEAD or differ only by artifact-only forward commits: ${JSON.stringify(stage2m3LineageCompatibility)}`
  );
};

const verifyForbiddenFilesAbsent = () => {
  FORBIDDEN_FILES.forEach((relativePath) =>
    assert(!exists(relativePath), `Forbidden file exists: ${relativePath}`)
  );
};

const verifyRuntimeImport = async () => {
  const moduleUrl = pathToFileURL(path.join(ROOT, 'src', 'comparative_program', 'index.js')).href;
  const comparative = await import(moduleUrl);
  const description = comparative.describeComparativeProgramLayer();
  assert(
    description.current_stage === 'stage2_m4_internal_closure'
      || description.current_stage === 'stage3_readiness_fulfillment'
      || description.current_stage === 'stage3_execution_pilot_preparation'
      || description.current_stage === 'stage3_rehearsal_preparation'
      || description.current_stage === 'stage3_controlled_execution_opening',
    'Comparative layer must advertise Stage 2-M4 closure, Stage3-RF, or a later bounded Stage 3 preparation superset as current stage'
  );
  assert(
    typeof comparative.createComparativeClosureBuilder === 'function',
    'Comparative closure builder export missing'
  );
};

const main = async () => {
  const allFiles = [
    ...REQUIRED_DOCS,
    ...REQUIRED_MANIFESTS,
    ...REQUIRED_SCHEMAS,
    ...REQUIRED_RUNTIME,
    ...REQUIRED_ARTIFACTS.map((fileName) => path.join('artifacts/comparative_program/stage2m4', fileName))
  ];
  const leakChecked = [
    ...REQUIRED_DOCS,
    ...REQUIRED_MANIFESTS,
    ...REQUIRED_SCHEMAS,
    ...REQUIRED_ARTIFACTS.map((fileName) => path.join('artifacts/comparative_program/stage2m4', fileName))
  ];

  ensureFilesExist(allFiles);
  ensureNoPathLeaks(leakChecked);
  ensureNoOverclaimWording([
    ...REQUIRED_DOCS,
    ...REQUIRED_MANIFESTS,
    ...REQUIRED_ARTIFACTS.map((fileName) => path.join('artifacts/comparative_program/stage2m4', fileName))
  ]);
  verifyManifests();
  verifyArtifacts();
  verifyForbiddenFilesAbsent();
  await verifyRuntimeImport();

  console.log('PASS verify-comparative-program-closure');
};

main().catch((error) => {
  console.error(`FAIL verify-comparative-program-closure: ${error.message}`);
  process.exitCode = 1;
});

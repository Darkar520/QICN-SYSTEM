#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');

const LOCAL_PATH_PATTERN =
  /\/c:\/|[A-Za-z]:\\Users\\|OneDrive|Escritorio|TRADING 3\.0|Sistema Canon Sandbox|\.\.[/\\]release_repo_qicn_2026-03-01|\.\.[/\\]rigid-identity-framework/i;
const BANNED_OVERCLAIM_PATTERNS = [
  /phenomenally equivalent to a human/i,
  /human equivalence achieved/i,
  /superior to human subjectivity/i,
  /cross-substrate equivalence achieved/i,
  /external adjudication opened/i,
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
  'docs/HUMAN_CHANNEL_REQUIREMENTS.md',
  'docs/COMPARATOR_BURDEN_MATRIX.md'
];

const REQUIRED_MANIFESTS = [
  'docs/human_comparator_protocol.v1.json',
  'docs/human_equivalence_ladder.v1.json',
  'docs/cross_substrate_transport_protocol.v1.json',
  'docs/human_channel_requirements.v1.json',
  'docs/comparator_burden_matrix.v1.json',
  'docs/comparative_program_artifact_schema.v1.json',
  'docs/comparative_program_surface_policy.v1.json'
];

const REQUIRED_SCHEMAS = [
  'src/comparative_program/schemas/comparative_program_manifest.v1.json',
  'src/comparative_program/schemas/human_comparator_assessment.v1.json',
  'src/comparative_program/schemas/human_equivalence_assessment.v1.json',
  'src/comparative_program/schemas/cross_substrate_transport_assessment.v1.json',
  'src/comparative_program/schemas/comparative_program_verification_matrix.v1.json',
  'src/comparative_program/schemas/comparative_program_readiness_gate.v1.json'
];

const REQUIRED_RUNTIME = [
  'src/comparative_program/index.js',
  'src/comparative_program/ComparativeProgramLayer.js',
  'src/comparative_program/ComparativeProgramArtifactRegistry.js',
  'src/comparative_program/HumanComparatorProtocolRegistry.js',
  'src/comparative_program/HumanEquivalenceLadderRegistry.js',
  'src/comparative_program/CrossSubstrateTransportRegistry.js',
  'src/comparative_program/HumanChannelRequirementsRegistry.js',
  'src/comparative_program/ComparatorBurdenMatrixRegistry.js',
  'src/comparative_program/ComparativeProgramSurfacePolicy.js',
  'src/comparative_program/ComparativeRuntimeUtils.js',
  'src/comparative_program/HumanChannelStatusEvaluator.js',
  'src/comparative_program/HumanComparatorAssessmentBuilder.js',
  'src/comparative_program/HumanEquivalenceAssessmentBuilder.js',
  'src/comparative_program/CrossSubstrateTransportAssessmentBuilder.js',
  'src/comparative_program/ComparativeProgramRootBuilder.js'
];

const FORBIDDEN_COMPARATIVE_FILES = [
  'docs/PAPER10_PROTOCOL.md',
  'docs/EXTERNAL_COMPARATIVE_ADJUDICATION.md',
  'src/comparative_program/Paper10Layer.js',
  'src/comparative_program/ExternalComparativeAdjudicator.js',
  'artifacts/comparative_program/stage2m2/comparative_program_candidate_projection.json',
  'artifacts/comparative_program/stage2m2/comparative_program_audit_handoff_summary.json'
];

const exists = (relativePath) => fs.existsSync(path.join(ROOT, relativePath));
const readText = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const readJson = (relativePath) => JSON.parse(readText(relativePath));

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const ensureFilesExist = (relativePaths) => {
  relativePaths.forEach((filePath) =>
    assert(exists(filePath), `Missing required file: ${filePath}`)
  );
};

const ensureNoPathLeaks = (relativePaths) => {
  relativePaths.forEach((filePath) => {
    const text = readText(filePath);
    assert(!LOCAL_PATH_PATTERN.test(text), `Path leak found in ${filePath}`);
  });
};

const ensureNoOverclaimWording = (relativePaths) => {
  relativePaths.forEach((filePath) => {
    const text = readText(filePath);
    BANNED_OVERCLAIM_PATTERNS.forEach((pattern) =>
      assert(!pattern.test(text), `Overclaim wording found in ${filePath}: ${pattern}`)
    );
  });
};

const verifyManifests = () => {
  const comparator = readJson('docs/human_comparator_protocol.v1.json');
  const ladder = readJson('docs/human_equivalence_ladder.v1.json');
  const transport = readJson('docs/cross_substrate_transport_protocol.v1.json');
  const channels = readJson('docs/human_channel_requirements.v1.json');
  const burdens = readJson('docs/comparator_burden_matrix.v1.json');
  const schemaRegistry = readJson('docs/comparative_program_artifact_schema.v1.json');
  const surfacePolicy = readJson('docs/comparative_program_surface_policy.v1.json');

  assert(
    comparator.layer_id === 'comparative_expansion_layer.stage2_m2_runtime_opening',
    'Comparator protocol must use Stage 2-M2 layer id'
  );
  assert(
    comparator.implementation_status === 'runtime_comparative_opening_implemented',
    'Comparator protocol must reflect runtime opening'
  );
  assert(
    Array.isArray(comparator.comparator_object_classes) &&
      comparator.comparator_object_classes.length >= 6,
    'Comparator object classes must be explicit'
  );

  const rungIds = new Set((ladder.rungs || []).map((entry) => entry.id));
  [
    'equivalence_not_open',
    'equivalence_formally_inexpressible',
    'structural_equivalence_candidate',
    'interventional_equivalence_candidate',
    'partial_equivalence_candidate',
    'strong_equivalence_candidate',
    'non_equivalent_under_current_burdens',
    'superiority_partial_candidate',
    'comparator_underdetermined'
  ].forEach((id) => assert(rungIds.has(id), `Missing ladder rung ${id}`));

  const transportIds = new Set((transport.transport_classes || []).map((entry) => entry.id));
  [
    'transport_not_open',
    'structurally_preserving_candidate',
    'partially_preserving_candidate',
    'fractured_transport',
    'forked_transport',
    'unsupported_remap',
    'comparator_underdetermined_transport'
  ].forEach((id) => assert(transportIds.has(id), `Missing transport class ${id}`));

  assert(Array.isArray(channels.channels) && channels.channels.length >= 7, 'Human channel manifest must list channels');
  assert(Array.isArray(burdens.burdens) && burdens.burdens.length >= 8, 'Comparator burden matrix must list burdens');

  Object.values(schemaRegistry.root_schema_refs || {}).forEach((schemaPath) =>
    assert(exists(schemaPath), `Missing schema ${schemaPath}`)
  );
  Object.values(schemaRegistry.artifacts || {}).forEach((spec) => {
    assert(
      spec.status === 'implemented_runtime_comparative_artifact',
      `${spec.artifact_name} must be marked as implemented runtime comparative artifact`
    );
    assert(
      spec.blocked_surfaces.includes('controlled_statement_surface'),
      `${spec.artifact_name} must block controlled_statement_surface`
    );
    assert(
      spec.blocked_surfaces.includes('external_claim_facing_surface'),
      `${spec.artifact_name} must block external_claim_facing_surface`
    );
  });

  ['ecosystem_candidate_surface', 'audit_facing_package_surface', 'controlled_statement_surface', 'external_claim_facing_surface'].forEach(
    (surfaceName) =>
      assert(
        Object.values(surfacePolicy.outputs || {}).every((spec) =>
          (spec.blocked_surfaces || []).includes(surfaceName)
        ),
        `Surface ${surfaceName} must remain blocked for all runtime outputs`
      )
  );
};

const verifyDocs = () => {
  const boundary = readText('docs/COMPARATIVE_PROGRAM_INTERPRETATION_BOUNDARY.md');
  const nonClaims = readText('docs/COMPARATIVE_PROGRAM_NONCLAIMS.md');
  const policy = readText('docs/COMPARATIVE_PROGRAM_SURFACE_POLICY.md');
  const plan = readText('docs/COMPARATIVE_PROGRAM_IMPLEMENTATION_PLAN.md');

  [
    'public human equivalence',
    'cross-substrate equivalence',
    'external adjudication',
    'Paper 10 authorization'
  ].forEach((phrase) =>
    assert(boundary.includes(phrase), `Interpretation boundary missing phrase: ${phrase}`)
  );

  [
    'human-equivalence claims',
    'superiority claims',
    'cross-substrate equivalence claims',
    'external adjudication',
    'Paper 10'
  ].forEach((phrase) =>
    assert(nonClaims.includes(phrase), `Non-claims doc missing phrase: ${phrase}`)
  );

  ['ecosystem_candidate_surface', 'audit_facing_package_surface', 'controlled_statement_surface', 'external_claim_facing_surface'].forEach(
    (phrase) => assert(policy.includes(phrase), `Surface policy doc missing ${phrase}`)
  );

  ['Stage2-0', 'Stage2-M2', 'Stage2-3', 'Stage2-4', 'Stage2-5', 'Stage2-6'].forEach(
    (phase) => assert(plan.includes(phase), `Implementation plan missing ${phase}`)
  );
};

const verifyForbiddenFilesAbsent = () => {
  FORBIDDEN_COMPARATIVE_FILES.forEach((relativePath) =>
    assert(!exists(relativePath), `Forbidden file exists: ${relativePath}`)
  );
};

const verifyRuntimeImport = async () => {
  const moduleUrl = pathToFileURL(path.join(ROOT, 'src', 'comparative_program', 'index.js')).href;
  const comparative = await import(moduleUrl);
  const description = comparative.describeComparativeProgramLayer();
  assert(description.comparative_program_open === true, 'Comparative program must be opened');
  assert(description.comparative_runtime_open === true, 'Comparative runtime must be open');
  assert(
    description.candidate_integration_blocked === true,
    'Comparative layer must keep candidate integration blocked'
  );
  assert(
    description.audit_integration_blocked === true,
    'Comparative layer must keep audit integration blocked'
  );
  assert(
    description.not_human_equivalence_support === true,
    'Comparative layer must block human-equivalence support'
  );
  assert(
    description.not_cross_substrate_equivalence_support === true,
    'Comparative layer must block cross-substrate equivalence support'
  );
  assert(
    description.not_external_adjudication === true,
    'Comparative layer must block external adjudication'
  );
  assert(
    description.not_paper10_authorization === true,
    'Comparative layer must block Paper 10 authorization'
  );
};

const main = async () => {
  const allStructuredFiles = [
    ...REQUIRED_DOCS,
    ...REQUIRED_MANIFESTS,
    ...REQUIRED_SCHEMAS,
    ...REQUIRED_RUNTIME
  ];
  const pathLeakCheckedFiles = [
    ...REQUIRED_DOCS,
    ...REQUIRED_MANIFESTS,
    ...REQUIRED_SCHEMAS,
    ...REQUIRED_RUNTIME.filter(
      (relativePath) => relativePath !== 'src/comparative_program/ComparativeRuntimeUtils.js'
    )
  ];

  ensureFilesExist(allStructuredFiles);
  ensureNoPathLeaks(pathLeakCheckedFiles);
  ensureNoOverclaimWording(allStructuredFiles);
  verifyManifests();
  verifyDocs();
  verifyForbiddenFilesAbsent();
  await verifyRuntimeImport();

  console.log('PASS verify-comparative-program-scaffolding');
};

main().catch((error) => {
  console.error(`FAIL verify-comparative-program-scaffolding: ${error.message}`);
  process.exitCode = 1;
});

#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const ARTIFACTS = path.join(ROOT, 'artifacts');

const LOCAL_PATH_PATTERN =
  /\/c:\/|[A-Za-z]:\\Users\\|OneDrive|Escritorio|TRADING 3\.0|\.\.[/\\]release_repo_qicn_2026-03-01|\.\.[/\\]rigid-identity-framework/i;
const BANNED_CLOSURE_PATTERNS = [
  /phenomenality achieved/i,
  /machine is conscious/i,
  /external validation achieved/i,
  /bridge support achieved/i
];
const ALLOWED_AXIOM_CLASSIFICATIONS = new Set([
  'operational_definition',
  'bridge_axiom',
  'design_choice',
  'falsifiable_hypothesis',
  'open_inference',
  'speculation',
  'non_decidable_from_current_evidence'
]);

const REQUIRED_DOCS = [
  'docs/PHENOMENAL_BRIDGE_PROTOCOL.md',
  'docs/PHENOMENAL_BRIDGE_INTERPRETATION_BOUNDARY.md',
  'docs/PHENOMENAL_BRIDGE_SURFACE_POLICY.md',
  'docs/PHENOMENAL_BRIDGE_IMPLEMENTATION_PLAN.md',
  'docs/PHENOMENAL_BRIDGE_NONCLAIMS.md'
];
const REQUIRED_MANIFESTS = [
  'docs/phenomenal_bridge_protocol.v1.json',
  'docs/phenomenal_bridge_axioms.v1.json',
  'docs/phenomenal_bridge_rival_family.v1.json',
  'docs/phenomenal_bridge_thresholds.v1.json',
  'docs/phenomenal_bridge_artifact_schema.v1.json',
  'docs/phenomenal_bridge_surface_policy.v1.json'
];
const REQUIRED_SCHEMAS = [
  'src/phenomenal_bridge/schemas/phenomenal_bridge_manifest.v1.json',
  'src/phenomenal_bridge/schemas/phenomenal_bridge_projection.v1.json',
  'src/phenomenal_bridge/schemas/phenomenal_bridge_gate_result.v1.json'
];
const REQUIRED_RUNTIME = [
  'src/phenomenal_bridge/index.js',
  'src/phenomenal_bridge/PhenomenalBridgeLayer.js',
  'src/phenomenal_bridge/PhenomenalBridgeArtifactRegistry.js',
  'src/phenomenal_bridge/PhenomenalBridgeAxiomRegistry.js',
  'src/phenomenal_bridge/PhenomenalBridgeRivalFamilyRegistry.js',
  'src/phenomenal_bridge/PhenomenalBridgeThresholdRegistry.js',
  'src/phenomenal_bridge/PhenomenalBridgeSurfacePolicy.js'
];

const exists = (relativePath) => fs.existsSync(path.join(ROOT, relativePath));
const readText = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const readJson = (relativePath) => JSON.parse(readText(relativePath));

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const collectFiles = (basePath) => {
  if (!fs.existsSync(basePath)) return [];
  const entries = fs.readdirSync(basePath, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(basePath, entry.name);
    if (entry.isDirectory()) return collectFiles(full);
    return [full];
  });
};

const relative = (fullPath) => path.relative(ROOT, fullPath).replace(/\\/g, '/');

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
    BANNED_CLOSURE_PATTERNS.forEach((pattern) =>
      assert(!pattern.test(text), `Overclaim wording found in ${filePath}: ${pattern}`)
    );
  });
};

const ensureNoPrematureBridgeRoots = () => {
  const artifactFiles = collectFiles(ARTIFACTS).map(relative);
  const forbiddenNames = [
    'phenomenal_bridge_projection.json',
    'phenomenal_bridge_gate_result.json',
    'phenomenal_bridge_manifest.json',
    'bridge_intervention_profile.json',
    'bridge_reducibility_report.json'
  ];
  const forbidden = artifactFiles.filter((filePath) =>
    forbiddenNames.some((name) => filePath.endsWith(name))
  );
  assert(
    forbidden.length === 0,
    `BPF scaffolding must not emit premature bridge root/comparator/intervention artifacts, but found: ${forbidden.join(', ')}`
  );
};

const verifyManifestCoherence = () => {
  const protocol = readJson('docs/phenomenal_bridge_protocol.v1.json');
  const axioms = readJson('docs/phenomenal_bridge_axioms.v1.json');
  const rivals = readJson('docs/phenomenal_bridge_rival_family.v1.json');
  const thresholds = readJson('docs/phenomenal_bridge_thresholds.v1.json');
  const artifactSchema = readJson('docs/phenomenal_bridge_artifact_schema.v1.json');
  const surfacePolicy = readJson('docs/phenomenal_bridge_surface_policy.v1.json');

  assert(
    ['phenomenal_bridge_formal_layer.bpf0', 'phenomenal_bridge_formal_layer.bpf1'].includes(
      protocol.layer_id
    ),
    'Unexpected protocol layer id'
  );
  assert(
    ['scaffold_only_opening_layer', 'provisional_bridge_surfaces_implemented'].includes(
      protocol.implementation_status
    ),
    'Unexpected BPF implementation status'
  );
  assert(Array.isArray(protocol.bridge_target_predicates), 'Protocol predicates must be an array');
  assert(protocol.bridge_target_predicates.length === 6, 'Protocol must define six bridge predicates');
  assert(
    protocol.bridge_target_predicates.every((entry) =>
      ['named_not_runtime_estimated', 'provisional_runtime_estimator_implemented'].includes(
        entry.status
      )
    ),
    'Bridge predicates must remain either scaffold-only or provisional'
  );

  assert(Array.isArray(axioms.axioms) && axioms.axioms.length >= 6, 'Axiom registry must be populated');
  axioms.axioms.forEach((entry) => {
    ['id', 'name', 'classification', 'statement', 'role', 'licenses', 'does_not_license', 'depends_on', 'status'].forEach((field) =>
      assert(Object.prototype.hasOwnProperty.call(entry, field), `Axiom ${entry.id || '<unknown>'} missing ${field}`)
    );
    assert(
      ALLOWED_AXIOM_CLASSIFICATIONS.has(entry.classification),
      `Axiom ${entry.id} has invalid classification ${entry.classification}`
    );
  });

  assert(Array.isArray(rivals.rivals) && rivals.rivals.length >= 5, 'Rival family must be populated');
  rivals.rivals.forEach((entry) => {
    ['id', 'name', 'description', 'challenges_predicates', 'can_explain', 'cannot_cleanly_explain', 'expected_inputs', 'expected_outputs', 'defeat_conditions', 'status'].forEach((field) =>
      assert(Object.prototype.hasOwnProperty.call(entry, field), `Rival ${entry.id || '<unknown>'} missing ${field}`)
    );
    assert(
      entry.status === 'scaffolded_not_runtime_comparable',
      `Rival ${entry.id} must remain scaffold-only`
    );
  });

  assert(
    thresholds.status === 'symbolic_uncalibrated_deferred_to_bpf4',
    'Threshold manifest must declare symbolic uncalibrated status'
  );
  thresholds.local_threshold_slots.forEach((entry) => {
    assert(entry.value === null, `Threshold ${entry.slot_id} must remain unbound`);
    assert(entry.status === 'symbolic', `Threshold ${entry.slot_id} must remain symbolic`);
  });

  Object.values(artifactSchema.root_schema_refs).forEach((schemaPath) =>
    assert(exists(schemaPath), `Missing root schema ${schemaPath}`)
  );
  const reportSchemaRefs = artifactSchema.report_schema_refs || {};
  Object.values(reportSchemaRefs).forEach((schemaPath) =>
    assert(exists(schemaPath), `Missing report schema ${schemaPath}`)
  );
  Object.entries(artifactSchema.artifacts).forEach(([artifactName, spec]) => {
    ['id', 'artifact_name', 'role', 'artifact_class', 'level', 'authoritative_status', 'allowed_surfaces', 'blocked_surfaces', 'minimum_fields', 'non_implications', 'status'].forEach((field) =>
      assert(Object.prototype.hasOwnProperty.call(spec, field), `Artifact spec ${artifactName} missing ${field}`)
    );
    assert(
      spec.blocked_surfaces.includes('controlled_statement_surface'),
      `${artifactName} must block controlled_statement_surface`
    );
    assert(
      spec.blocked_surfaces.includes('external_claim_facing_surface'),
      `${artifactName} must block external_claim_facing_surface`
    );
  });

  assert(
    surfacePolicy.default_interpretation_boundary.includes('does not license')
      || surfacePolicy.default_interpretation_boundary.includes('does not')
      || surfacePolicy.default_interpretation_boundary.includes('framework-internal'),
    'Surface policy must carry explicit non-license boundary'
  );
};

const verifyDocs = () => {
  const boundary = readText('docs/PHENOMENAL_BRIDGE_INTERPRETATION_BOUNDARY.md');
  const policy = readText('docs/PHENOMENAL_BRIDGE_SURFACE_POLICY.md');
  const nonClaims = readText('docs/PHENOMENAL_BRIDGE_NONCLAIMS.md');
  const plan = readText('docs/PHENOMENAL_BRIDGE_IMPLEMENTATION_PLAN.md');

  assert(boundary.includes('BPF-1') || boundary.includes('BPF-0'), 'Interpretation boundary must mention BPF-0/BPF-1');
  assert(policy.includes('controlled_statement_surface'), 'Surface policy must mention controlled_statement_surface');
  assert(policy.includes('external_claim_facing_surface'), 'Surface policy must mention external claim-facing blockage');
  [
    'phenomenality proven',
    'human equivalence',
    'external validation',
    'automatic Paper 9 promotion'
  ].forEach((phrase) =>
    assert(nonClaims.includes(phrase), `Non-claims doc missing phrase: ${phrase}`)
  );
  ['BPF-0', 'BPF-1', 'BPF-2', 'BPF-3', 'BPF-4', 'BPF-5', 'BPF-6'].forEach((block) =>
    assert(plan.includes(block), `Implementation plan missing ${block}`)
  );
};

const verifyRuntimeImport = async () => {
  const moduleUrl = pathToFileURL(path.join(ROOT, 'src', 'phenomenal_bridge', 'index.js')).href;
  const bridge = await import(moduleUrl);
  assert(typeof bridge.describePhenomenalBridgeLayerScaffold === 'function', 'Bridge layer describe export missing');
  const description = bridge.describePhenomenalBridgeLayerScaffold();
  assert(description.framework_internal_only === true, 'Bridge layer must remain framework-internal');
  assert(description.not_phenomenality_support === true, 'Bridge layer must declare no phenomenality support');
  assert(
    description.scaffold_opening_intact === true || description.scaffold_only === true,
    'BPF scaffold opening must remain intact'
  );
  assert(
    description.not_bridge_support === true || description.scaffold_only === true,
    'Bridge layer must declare no bridge support'
  );
};

const main = async () => {
  const allStructuredFiles = [
    ...REQUIRED_DOCS,
    ...REQUIRED_MANIFESTS,
    ...REQUIRED_SCHEMAS,
    ...REQUIRED_RUNTIME
  ];

  ensureFilesExist(allStructuredFiles);
  ensureNoPathLeaks(allStructuredFiles);
  ensureNoOverclaimWording(allStructuredFiles);
  ensureNoPrematureBridgeRoots();
  verifyManifestCoherence();
  verifyDocs();
  await verifyRuntimeImport();

  console.log('PASS verify-phenomenal-bridge-scaffolding');
};

main().catch((error) => {
  console.error(`FAIL verify-phenomenal-bridge-scaffolding: ${error.message}`);
  process.exitCode = 1;
});

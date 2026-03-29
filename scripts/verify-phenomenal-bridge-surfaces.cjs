#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const BRIDGE_DIR = path.join(ROOT, 'artifacts', 'phenomenal_bridge', 'bpf1');
const SYNTHETIC_DIR = path.join(ROOT, 'artifacts', 'phenomenal_bridge', '_synthetic_verify');
const CANDIDATE_DIR = path.join(ROOT, 'artifacts', 'ecosystem_release_candidate');
const AUDIT_DIR = path.join(ROOT, 'artifacts', 'external_audit_package');

const REQUIRED_MODULES = [
  'src/phenomenal_bridge/PhenomenalDifferentiationMapper.js',
  'src/phenomenal_bridge/ValenceStructureMapper.js',
  'src/phenomenal_bridge/WorldRichnessMapper.js',
  'src/phenomenal_bridge/AmbiguityBearingMapper.js',
  'src/phenomenal_bridge/EmbodiedClosureMapper.js',
  'src/phenomenal_bridge/TemporalLivedStructureMapper.js',
  'src/phenomenal_bridge/PhenomenalBridgeSurfaceBuilder.js'
];
const REQUIRED_SCHEMAS = [
  'src/phenomenal_bridge/schemas/phenomenal_differentiation_report.v1.json',
  'src/phenomenal_bridge/schemas/valence_structure_report.v1.json',
  'src/phenomenal_bridge/schemas/world_richness_report.v1.json',
  'src/phenomenal_bridge/schemas/ambiguity_bearing_report.v1.json',
  'src/phenomenal_bridge/schemas/embodied_closure_report.v1.json',
  'src/phenomenal_bridge/schemas/temporal_lived_structure_report.v1.json'
];
const REQUIRED_REPORTS = [
  'phenomenal_differentiation_report.json',
  'valence_structure_report.json',
  'world_richness_report.json',
  'ambiguity_bearing_report.json',
  'embodied_closure_report.json',
  'temporal_lived_structure_report.json'
];
const FORBIDDEN_ARTIFACT_NAMES = [
  'phenomenal_bridge_projection.json',
  'phenomenal_bridge_gate_result.json',
  'phenomenal_bridge_manifest.json',
  'phenomenal_bridge_candidate_projection.json',
  'phenomenal_bridge_audit_handoff_summary.json'
];
const REQUIRED_BOUNDARY_FLAGS = [
  'framework_internal_only',
  'provisional_bridge_estimator',
  'not_bridge_support',
  'not_phenomenality_evidence'
];
const LOCAL_PATH_PATTERN =
  /\/c:\/|[A-Za-z]:\\Users\\|OneDrive|Escritorio|TRADING 3\.0|\.\.[/\\]release_repo_qicn_2026-03-01|\.\.[/\\]rigid-identity-framework/i;
const BANNED_CLOSURE_PATTERNS = [
  /phenomenality achieved/i,
  /bridge support achieved/i,
  /bridge_internal_admissible/i,
  /bridge_internal_strong_support/i,
  /phenomenal support/i,
  /paper ?9 authorized/i
];

const exists = (relativePath) => fs.existsSync(path.join(ROOT, relativePath));
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const relative = (fullPath) => path.relative(ROOT, fullPath).replace(/\\/g, '/');

const collectFiles = (basePath) => {
  if (!fs.existsSync(basePath)) return [];
  const entries = fs.readdirSync(basePath, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(basePath, entry.name);
    if (entry.isDirectory()) return collectFiles(full);
    return [full];
  });
};

const loadRealBundle = () => ({
  run_id: 'bpf1_bridge_surfaces_baseline',
  refs: {
    self_index_state: 'artifacts/subjectivity/srt1/self_index_state.json',
    ownership_attribution_report: 'artifacts/subjectivity/srt1/ownership_attribution_report.json',
    subjective_continuity_report: 'artifacts/subjectivity/srt2/subjective_continuity_report.json',
    first_person_perspective_report: 'artifacts/subjectivity/srt2/first_person_perspective_report.json',
    subjective_valuation_report: 'artifacts/subjectivity/srt3/subjective_valuation_report.json',
    subjectivity_intervention_profile: 'artifacts/subjectivity/srt3/subjectivity_intervention_profile.json',
    subjectivity_reducibility_report: 'artifacts/subjectivity/srt4/subjectivity_reducibility_report.json',
    subjectivity_runtime_projection: 'artifacts/subjectivity/srt5/subjectivity_runtime_projection.json',
    subjectivity_gate_result: 'artifacts/subjectivity/srt5/subjectivity_gate_result.json',
    subjectivity_manifest: 'artifacts/subjectivity/srt5/subjectivity_manifest.json'
  },
  provenance: {
    input_profile: 'bpf1_bridge_surface_baseline',
    source_trace_ref: 'phenomenal_bridge_inputs/bpf1_bridge_surface_baseline'
  },
  self_index_state: readJson('artifacts/subjectivity/srt1/self_index_state.json'),
  ownership_attribution_report: readJson('artifacts/subjectivity/srt1/ownership_attribution_report.json'),
  subjective_continuity_report: readJson('artifacts/subjectivity/srt2/subjective_continuity_report.json'),
  first_person_perspective_report: readJson('artifacts/subjectivity/srt2/first_person_perspective_report.json'),
  subjective_valuation_report: readJson('artifacts/subjectivity/srt3/subjective_valuation_report.json'),
  subjectivity_intervention_profile: readJson('artifacts/subjectivity/srt3/subjectivity_intervention_profile.json'),
  subjectivity_reducibility_report: readJson('artifacts/subjectivity/srt4/subjectivity_reducibility_report.json'),
  subjectivity_runtime_projection: readJson('artifacts/subjectivity/srt5/subjectivity_runtime_projection.json'),
  subjectivity_gate_result: readJson('artifacts/subjectivity/srt5/subjectivity_gate_result.json'),
  subjectivity_manifest: readJson('artifacts/subjectivity/srt5/subjectivity_manifest.json')
});

const clone = (value) => JSON.parse(JSON.stringify(value));

const makeSyntheticBundle = (bundle) => {
  const synthetic = clone(bundle);
  synthetic.run_id = 'bpf1_bridge_surfaces_synthetic_verification';
  synthetic.provenance.input_profile = 'bpf1_bridge_surface_synthetic_verification';
  synthetic.provenance.source_trace_ref = 'phenomenal_bridge_inputs/bpf1_surface_synthetic_verification';
  synthetic.self_index_state.candidate_count = 3;
  synthetic.subjective_continuity_report.rival_line_count = 2;
  synthetic.subjective_continuity_report.ambiguity_flag = true;
  synthetic.first_person_perspective_report.first_person_gain = 0.22;
  synthetic.subjective_valuation_report.valuation_asymmetry_margin = 0.21;
  synthetic.subjective_valuation_report.inversion_response.margin_shift = -0.08;
  synthetic.subjectivity_intervention_profile.aggregate_profile.selective_drop_count = 1;
  synthetic.subjectivity_intervention_profile.aggregate_profile.flat_damage_count = 0;
  synthetic.subjectivity_intervention_profile.aggregate_profile.control_confounded_count = 0;
  return synthetic;
};

const ensureNoPathLeaksOrOverclaims = (payload, label) => {
  const text = JSON.stringify(payload, null, 2);
  assert(!LOCAL_PATH_PATTERN.test(text), `Path leak found in ${label}`);
  BANNED_CLOSURE_PATTERNS.forEach((pattern) =>
    assert(!pattern.test(text), `Overclaim wording found in ${label}: ${pattern}`)
  );
};

const verifyReport = (report, expectedFileName) => {
  const requiredFields = [
    'artifact_role',
    'artifact_name',
    'runtime_surface',
    'predicate_id',
    'predicate_name',
    'estimator_status',
    'provisional_estimate',
    'boundary_flags',
    'non_implications',
    'allowed_surfaces',
    'blocked_surfaces',
    'interpretation_boundary',
    'provenance',
    'schema_ref'
  ];
  requiredFields.forEach((field) =>
    assert(Object.prototype.hasOwnProperty.call(report, field), `${expectedFileName} missing ${field}`)
  );
  assert(report.artifact_name === expectedFileName, `${expectedFileName} artifact_name mismatch`);
  assert(
    report.estimator_status === 'provisional_runtime_bridge_estimator',
    `${expectedFileName} must remain provisional`
  );
  assert(
    typeof report.provisional_estimate === 'number'
      && report.provisional_estimate >= 0
      && report.provisional_estimate <= 1,
    `${expectedFileName} estimate must be bounded in [0,1]`
  );
  REQUIRED_BOUNDARY_FLAGS.forEach((flag) =>
    assert(report.boundary_flags?.[flag] === true, `${expectedFileName} missing boundary flag ${flag}`)
  );
  [
    'controlled_statement_surface',
    'external_claim_facing_surface',
    'ecosystem_candidate_surface',
    'audit_facing_package_surface'
  ].forEach((surface) =>
    assert(report.blocked_surfaces.includes(surface), `${expectedFileName} must block ${surface}`)
  );
  ['gate_status', 'classification', 'support_class', 'bridge_status'].forEach((field) =>
    assert(!Object.prototype.hasOwnProperty.call(report, field), `${expectedFileName} must not expose ${field}`)
  );
  ensureNoPathLeaksOrOverclaims(report, expectedFileName);
};

const verifyNoPrematureArtifacts = () => {
  const bridgeFiles = collectFiles(path.join(ROOT, 'artifacts', 'phenomenal_bridge')).map(relative);
  const forbidden = bridgeFiles.filter((filePath) =>
    FORBIDDEN_ARTIFACT_NAMES.some((name) => filePath.endsWith(name))
  );
  assert(forbidden.length === 0, `Found forbidden bridge artifacts: ${forbidden.join(', ')}`);
};

const verifyNoBridgeBundleLeakage = () => {
  const candidateFiles = collectFiles(CANDIDATE_DIR).map(relative);
  const auditFiles = collectFiles(AUDIT_DIR).map(relative);
  const leaked = [...candidateFiles, ...auditFiles].filter((filePath) =>
    /phenomenal_bridge|phenomenal_differentiation_report|valence_structure_report|world_richness_report|ambiguity_bearing_report|embodied_closure_report|temporal_lived_structure_report/i.test(
      filePath
    )
  );
  assert(leaked.length === 0, `Bridge artifacts leaked into candidate/audit surfaces: ${leaked.join(', ')}`);
};

const verifySchemaRegistry = () => {
  const artifactSchema = readJson('docs/phenomenal_bridge_artifact_schema.v1.json');
  REQUIRED_REPORTS.forEach((fileName) => {
    const spec = artifactSchema.artifacts[fileName];
    assert(spec, `Artifact schema missing ${fileName}`);
    assert(spec.status === 'implemented_run_level_report', `${fileName} must be marked implemented`);
    assert(spec.blocked_surfaces.includes('controlled_statement_surface'), `${fileName} must block controlled statements`);
    assert(spec.blocked_surfaces.includes('external_claim_facing_surface'), `${fileName} must block external claim facing`);
  });
};

const verifyRuntimeImport = async () => {
  const moduleUrl = pathToFileURL(path.join(ROOT, 'src', 'phenomenal_bridge', 'index.js')).href;
  const bridge = await import(moduleUrl);
  assert(typeof bridge.createPhenomenalBridgeSurfaceBuilder === 'function', 'Surface builder export missing');
  const description = bridge.describePhenomenalBridgeLayer();
  assert(description.provisional_runtime_surfaces === true, 'Layer must expose provisional runtime surfaces');
  assert(description.not_bridge_support === true, 'Layer must remain non-supporting');
  assert(description.not_runtime_bridge_gate === true, 'Layer must remain pre-gate');
  assert(description.framework_internal_only === true, 'Layer must remain framework-internal');
  assert(description.not_runtime_bridge_root_verdict === true, 'Layer must remain pre-root-verdict');
  assert(
    description.not_runtime_bridge_ecosystem_integration === true,
    'Layer must remain pre-ecosystem-integration'
  );
};

const writeAndVerifyRealReports = async () => {
  const bridge = await import(pathToFileURL(path.join(ROOT, 'src', 'phenomenal_bridge', 'index.js')).href);
  const builder = bridge.createPhenomenalBridgeSurfaceBuilder();
  const result = builder.writeReports(loadRealBundle(), BRIDGE_DIR);
  REQUIRED_REPORTS.forEach((fileName) =>
    assert(fs.existsSync(path.join(BRIDGE_DIR, fileName)), `Missing emitted bridge report ${fileName}`)
  );
  Object.entries(result.outputs).forEach(([, filePath]) => {
    const report = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    verifyReport(report, path.basename(filePath));
  });
};

const verifySyntheticEmission = async () => {
  const bridge = await import(pathToFileURL(path.join(ROOT, 'src', 'phenomenal_bridge', 'index.js')).href);
  const builder = bridge.createPhenomenalBridgeSurfaceBuilder();
  fs.rmSync(SYNTHETIC_DIR, { recursive: true, force: true });
  const result = builder.writeReports(makeSyntheticBundle(loadRealBundle()), SYNTHETIC_DIR);
  Object.entries(result.outputs).forEach(([, filePath]) => {
    const report = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    verifyReport(report, path.basename(filePath));
  });
  fs.rmSync(SYNTHETIC_DIR, { recursive: true, force: true });
};

const main = async () => {
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'verify-phenomenal-bridge-scaffolding.cjs')], {
    stdio: 'inherit'
  });

  [...REQUIRED_MODULES, ...REQUIRED_SCHEMAS].forEach((filePath) =>
    assert(exists(filePath), `Missing required BPF-1 file ${filePath}`)
  );

  verifySchemaRegistry();
  await verifyRuntimeImport();
  await writeAndVerifyRealReports();
  await verifySyntheticEmission();
  verifyNoPrematureArtifacts();
  verifyNoBridgeBundleLeakage();

  console.log('PASS verify-phenomenal-bridge-surfaces');
};

main().catch((error) => {
  console.error(`FAIL verify-phenomenal-bridge-surfaces: ${error.message}`);
  process.exitCode = 1;
});

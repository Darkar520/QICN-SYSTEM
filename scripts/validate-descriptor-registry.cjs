const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const registryPath = path.join(root, 'docs', 'descriptor_registry.v1.json');

const REQUIRED_TOP_LEVEL = [
  'registry_version',
  'registry_status',
  'source_docs',
  'machine_validation',
  'enums',
  'rows'
];

const REQUIRED_ROW_KEYS = [
  'id',
  'kind',
  'layer',
  'source_module',
  'source_artifact',
  'source_signals',
  'downstream_artifacts',
  'test_anchors',
  'gate_dependencies',
  'claim_projection_dependencies',
  'evidence_scope',
  'external_dependency',
  'status',
  'non_claim_boundary',
  'notes_gaps'
];

const EXPECTED_ENUMS = Object.freeze({
  kind: new Set([
    'runtime_parameter',
    'direct_metric',
    'proxy_metric',
    'invariant',
    'claim_projection',
    'gate_result',
    'artifact_only',
    'not_yet_classified'
  ]),
  layer: new Set([
    'runtime',
    'runtime_derived',
    'batch',
    'enforcement',
    'cross_layer',
    'external'
  ]),
  evidence_scope: new Set([
    'runtime_primary',
    'runtime_derived',
    'batch_primary',
    'batch_derived',
    'mixed',
    'external_frozen'
  ]),
  external_dependency: new Set([
    'none',
    'frozen_canon',
    'prereg_config',
    'external_service',
    'legacy_input',
    'human_interpretation_required',
    'mixed'
  ]),
  status: new Set([
    'documented_real',
    'documented_partial',
    'pending_classification',
    'external_dependency',
    'not_closed'
  ])
});

function fail(message) {
  throw new Error(`[descriptor-registry] ${message}`);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function expectNonEmptyString(value, label) {
  if (!isNonEmptyString(value)) fail(`${label} must be a non-empty string`);
}

function expectStringArray(value, label) {
  if (!Array.isArray(value)) fail(`${label} must be an array`);
  for (const [index, item] of value.entries()) {
    if (!isNonEmptyString(item)) fail(`${label}[${index}] must be a non-empty string`);
  }
}

function expectEnum(value, set, label) {
  if (!set.has(value)) fail(`${label} has invalid value: ${value}`);
}

function maybeCheckRepoPath(ref, label) {
  if (!isNonEmptyString(ref)) return;
  if (/^npm run /.test(ref)) return;
  if (!/[\\/]/.test(ref)) return;
  if (ref.endsWith('.json') && !ref.startsWith('docs/') && !ref.startsWith('src/') && !ref.startsWith('tests/') && !ref.startsWith('scripts/')) {
    return;
  }
  const full = path.join(root, ref);
  if (!fs.existsSync(full)) fail(`${label} path does not exist: ${ref}`);
}

function containsValue(list, expected) {
  return Array.isArray(list) && list.includes(expected);
}

const registry = readJson(registryPath);

for (const key of REQUIRED_TOP_LEVEL) {
  if (!(key in registry)) fail(`top-level key missing: ${key}`);
}

expectNonEmptyString(registry.registry_version, 'registry_version');
if (registry.registry_version !== 'descriptor_registry.v1') {
  fail(`registry_version must be descriptor_registry.v1, got ${registry.registry_version}`);
}

if (!Array.isArray(registry.rows) || registry.rows.length === 0) {
  fail('rows must be a non-empty array');
}

for (const [enumName, allowed] of Object.entries(EXPECTED_ENUMS)) {
  const values = registry.enums?.[enumName];
  if (!Array.isArray(values)) fail(`enums.${enumName} must be an array`);
  for (const value of values) {
    if (!allowed.has(value)) fail(`enums.${enumName} contains unsupported value: ${value}`);
  }
}

Object.values(registry.source_docs || {}).forEach((ref) => maybeCheckRepoPath(ref, 'source_docs'));
maybeCheckRepoPath(registry.machine_validation?.validator_script, 'machine_validation.validator_script');

const seenIds = new Set();
for (const row of registry.rows) {
  for (const key of REQUIRED_ROW_KEYS) {
    if (!(key in row)) fail(`row ${row.id || '<missing id>'} missing key: ${key}`);
  }

  expectNonEmptyString(row.id, 'row.id');
  if (seenIds.has(row.id)) fail(`duplicate row id: ${row.id}`);
  seenIds.add(row.id);

  expectEnum(row.kind, EXPECTED_ENUMS.kind, `${row.id}.kind`);
  expectEnum(row.layer, EXPECTED_ENUMS.layer, `${row.id}.layer`);
  expectEnum(row.evidence_scope, EXPECTED_ENUMS.evidence_scope, `${row.id}.evidence_scope`);
  expectEnum(row.external_dependency, EXPECTED_ENUMS.external_dependency, `${row.id}.external_dependency`);
  expectEnum(row.status, EXPECTED_ENUMS.status, `${row.id}.status`);

  expectStringArray(row.source_module, `${row.id}.source_module`);
  expectStringArray(row.source_artifact, `${row.id}.source_artifact`);
  expectStringArray(row.source_signals, `${row.id}.source_signals`);
  expectStringArray(row.downstream_artifacts, `${row.id}.downstream_artifacts`);
  expectStringArray(row.test_anchors, `${row.id}.test_anchors`);
  expectStringArray(row.gate_dependencies, `${row.id}.gate_dependencies`);
  expectStringArray(row.claim_projection_dependencies, `${row.id}.claim_projection_dependencies`);
  expectNonEmptyString(row.non_claim_boundary, `${row.id}.non_claim_boundary`);
  expectNonEmptyString(row.notes_gaps, `${row.id}.notes_gaps`);

  row.source_module.forEach((ref) => maybeCheckRepoPath(ref, `${row.id}.source_module`));
  row.test_anchors.forEach((ref) => maybeCheckRepoPath(ref, `${row.id}.test_anchors`));

  if (row.kind === 'artifact_only' && !isNonEmptyString(row.non_claim_boundary)) {
    fail(`${row.id} artifact_only row must declare non_claim_boundary`);
  }

  if (row.kind === 'gate_result' && row.source_module.length === 0 && row.source_artifact.length === 0) {
    fail(`${row.id} gate_result row must declare source_module and/or source_artifact`);
  }

  if (row.kind === 'claim_projection') {
    if (row.source_signals.length === 0) fail(`${row.id} claim_projection row must declare source_signals`);
    if (row.gate_dependencies.length === 0) fail(`${row.id} claim_projection row must declare gate_dependencies`);
  }

  if (row.kind === 'gate_result' && containsValue(row.source_artifact, 'admissibility.json')) {
    fail(`${row.id} must not use admissibility.json as authoritative verdict artifact`);
  }
}

const runVerdictRow = registry.rows.find((row) => row.id === 'GR_run_verdict_status');
if (!runVerdictRow) fail('missing GR_run_verdict_status row');
if (runVerdictRow.kind !== 'gate_result') fail('GR_run_verdict_status must be a gate_result');
if (!containsValue(runVerdictRow.source_artifact, 'run_verdict.json')) {
  fail('GR_run_verdict_status must use run_verdict.json as authoritative verdict artifact');
}

const preVerdictRow = registry.rows.find((row) => row.id === 'ART_harness_admissibility_preverdict');
if (!preVerdictRow) fail('missing ART_harness_admissibility_preverdict row');
if (preVerdictRow.kind !== 'artifact_only') fail('ART_harness_admissibility_preverdict must be artifact_only');
if (!containsValue(preVerdictRow.source_artifact, 'admissibility.json')) {
  fail('ART_harness_admissibility_preverdict must declare admissibility.json');
}

const paperRow = registry.rows.find((row) => row.id === 'GR_paper_admissibility_status');
if (!paperRow) fail('missing GR_paper_admissibility_status row');
if (paperRow.kind !== 'gate_result') fail('GR_paper_admissibility_status must be a gate_result');
if (!containsValue(paperRow.source_artifact, 'roeo_enforcement_report.json')) {
  fail('GR_paper_admissibility_status must declare roeo_enforcement_report.json');
}

console.log(`[descriptor-registry] OK: ${registry.rows.length} rows validated from ${path.relative(root, registryPath)}`);

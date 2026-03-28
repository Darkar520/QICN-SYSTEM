#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const DOCS = path.join(ROOT, 'docs');
const SRC = path.join(ROOT, 'src', 'subjectivity');
const ARTIFACTS_ROOT = path.join(ROOT, 'artifacts', 'subjectivity');
const LOCAL_PATH_PATTERN = /\/c:\/|[A-Za-z]:\\Users\\|OneDrive|Escritorio|\.\.[/\\]release_repo_qicn_2026-03-01|\.\.[/\\]rigid-identity-framework/i;

const REQUIRED_DOC_FILES = [
  'docs/SUBJECTIVITY_RUNTIME_PROTOCOL.md',
  'docs/SUBJECTIVITY_INTERVENTIONS_AND_NEGATIVE_CONTROLS.md',
  'docs/SUBJECTIVITY_ARTIFACT_SURFACE_POLICY.md',
  'docs/SUBJECTIVITY_INTERPRETATION_BOUNDARY.md',
  'docs/subjectivity_protocol.v1.json',
  'docs/subjectivity_thresholds.v1.json',
  'docs/subjectivity_rival_family.v1.json',
  'docs/subjectivity_artifact_schema.v1.json',
  'docs/subjectivity_surface_policy.v1.json'
];

const REQUIRED_SRC_FILES = [
  'src/subjectivity/index.js',
  'src/subjectivity/SubjectivityLayer.js',
  'src/subjectivity/SubjectivityArtifactRegistry.js',
  'src/subjectivity/SubjectivitySurfacePolicy.js',
  'src/subjectivity/SubjectivityThresholdRegistry.js',
  'src/subjectivity/SubjectivityRivalFamilyRegistry.js',
  'src/subjectivity/schemas/subjectivity_manifest.v1.json',
  'src/subjectivity/schemas/subjectivity_runtime_projection.v1.json',
  'src/subjectivity/schemas/subjectivity_gate_result.v1.json'
];

const EXPECTED_COORDINATES = [
  'SelfIndex',
  'OwnershipField',
  'ContinuityField',
  'FirstPersonPerspective',
  'ValuationAsymmetry',
  'InterventionProfile',
  'IrreducibilityMargin'
];

const EXPECTED_REQUIRED_ARTIFACTS = [
  'subjectivity_manifest.json',
  'subjectivity_runtime_projection.json',
  'subjectivity_gate_result.json',
  'self_index_state.json',
  'ownership_attribution_report.json',
  'subjective_continuity_report.json',
  'first_person_perspective_report.json',
  'subjective_valuation_report.json',
  'subjectivity_reducibility_report.json',
  'self_nonself_swap_report.json'
];

const EXPECTED_RIVALS = [
  'pure_self_monitoring',
  'memory_integration_only',
  'policy_centered_agency',
  'narrative_self_model',
  'global_workspace_without_ownership',
  'latent_bookkeeping'
];

const readJson = (relPath) => JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
const readText = (relPath) => fs.readFileSync(path.join(ROOT, relPath), 'utf8');

const assert = (condition, message, bucket) => {
  if (!condition) bucket.push(message);
};

const scanLocalPathLeaks = (files) => files
  .filter((relPath) => fs.existsSync(path.join(ROOT, relPath)))
  .filter((relPath) => LOCAL_PATH_PATTERN.test(readText(relPath)));

async function verifySubjectivityScaffolding() {
  const missingDocs = REQUIRED_DOC_FILES.filter((relPath) => !fs.existsSync(path.join(ROOT, relPath)));
  const missingSrcFiles = REQUIRED_SRC_FILES.filter((relPath) => !fs.existsSync(path.join(ROOT, relPath)));

  const protocol = readJson('docs/subjectivity_protocol.v1.json');
  const thresholds = readJson('docs/subjectivity_thresholds.v1.json');
  const rivals = readJson('docs/subjectivity_rival_family.v1.json');
  const artifactSchema = readJson('docs/subjectivity_artifact_schema.v1.json');
  const surfacePolicy = readJson('docs/subjectivity_surface_policy.v1.json');

  const protocolErrors = [];
  const thresholdErrors = [];
  const rivalErrors = [];
  const surfaceErrors = [];
  const artifactErrors = [];
  const docErrors = [];

  assert(
    JSON.stringify((protocol.coordinates || []).map((entry) => entry.id)) === JSON.stringify(EXPECTED_COORDINATES),
    'protocol coordinates do not match Paper 8 naming',
    protocolErrors
  );
  assert(
    JSON.stringify(protocol.required_artifacts || []) === JSON.stringify(EXPECTED_REQUIRED_ARTIFACTS),
    'required artifact list is incomplete or reordered unexpectedly',
    protocolErrors
  );
  assert(
    protocol.implementation_status === 'scaffold_only',
    'protocol implementation_status must be scaffold_only in SRT-0',
    protocolErrors
  );
  assert(
    Array.isArray(protocol.forbidden_inferences) && protocol.forbidden_inferences.length >= 4,
    'protocol forbidden_inferences must be explicit',
    protocolErrors
  );

  assert(
    thresholds.status === 'provisional_pre_srt1_not_empirically_calibrated',
    'threshold registry must remain provisional in SRT-0',
    thresholdErrors
  );
  assert(
    thresholds.calibration_boundary?.usable_for_runtime_gate === false,
    'threshold registry must not authorize runtime gate execution in SRT-0',
    thresholdErrors
  );

  assert(
    JSON.stringify((rivals.rivals || []).map((entry) => entry.id)) === JSON.stringify(EXPECTED_RIVALS),
    'rival family registry must keep the six canonical weak rivals',
    rivalErrors
  );
  assert(
    rivals.comparator_implementation_status === 'scaffolded_not_executable',
    'rival family registry must remain scaffolded_not_executable in SRT-0',
    rivalErrors
  );
  assert(
    typeof rivals.admissible_closure_note === 'string' && rivals.admissible_closure_note.includes('finite admissible composites'),
    'rival family closure note must mention admissible composites',
    rivalErrors
  );

  for (const artifactName of EXPECTED_REQUIRED_ARTIFACTS) {
    const spec = artifactSchema.artifacts?.[artifactName];
    assert(Boolean(spec), `artifact schema missing ${artifactName}`, artifactErrors);
    if (!spec) continue;
    assert(
      Array.isArray(spec.minimum_fields) && spec.minimum_fields.length > 0,
      `artifact schema for ${artifactName} is missing minimum_fields`,
      artifactErrors
    );
  }
  assert(
    artifactSchema.root_schema_refs?.['subjectivity_manifest.json'] === 'src/subjectivity/schemas/subjectivity_manifest.v1.json',
    'root schema ref for subjectivity_manifest.json is incorrect',
    artifactErrors
  );

  for (const artifactName of EXPECTED_REQUIRED_ARTIFACTS) {
    const policy = surfacePolicy.outputs?.[artifactName];
    assert(Boolean(policy), `surface policy missing ${artifactName}`, surfaceErrors);
    if (!policy) continue;
    assert(
      Array.isArray(policy.blocked_surfaces) && policy.blocked_surfaces.includes('external_claim_facing_surface'),
      `${artifactName} must stay blocked on external_claim_facing_surface`,
      surfaceErrors
    );
    assert(
      policy.claim_gate_status === 'blocked_for_external_claiming',
      `${artifactName} must remain blocked_for_external_claiming`,
      surfaceErrors
    );
  }

  for (const relPath of [
    'docs/SUBJECTIVITY_RUNTIME_PROTOCOL.md',
    'docs/SUBJECTIVITY_ARTIFACT_SURFACE_POLICY.md',
    'docs/SUBJECTIVITY_INTERPRETATION_BOUNDARY.md'
  ]) {
    const text = readText(relPath);
    assert(/framework-internal|framework.internal/i.test(text), `${relPath} must mention framework-internal reading`, docErrors);
    assert(/not external(?:ly)? validated/i.test(text), `${relPath} must mention no external validation`, docErrors);
  }

  const localPathLeaks = scanLocalPathLeaks([
    ...REQUIRED_DOC_FILES,
    ...REQUIRED_SRC_FILES
  ]);

  const imported = await import(pathToFileURL(path.join(SRC, 'index.js')).href);
  const importSanity = {
    hasDescribe: typeof imported.describeSubjectivityLayerScaffold === 'function',
    hasThresholds: Boolean(imported.SUBJECTIVITY_THRESHOLDS),
    hasRivals: Boolean(imported.SUBJECTIVITY_RIVAL_FAMILY)
  };

  const ok = missingDocs.length === 0
    && missingSrcFiles.length === 0
    && protocolErrors.length === 0
    && thresholdErrors.length === 0
    && rivalErrors.length === 0
    && surfaceErrors.length === 0
    && artifactErrors.length === 0
    && docErrors.length === 0
    && localPathLeaks.length === 0
    && importSanity.hasDescribe
    && importSanity.hasThresholds
    && importSanity.hasRivals;

  const payload = {
    artifact_role: 'subjectivity_scaffolding_check',
    schema_version: '1.0.0',
    layer_id: 'subjectivity_runtime_layer.srt0',
    status: ok ? 'PASS' : 'FAIL',
    missing_docs: missingDocs,
    missing_src_files: missingSrcFiles,
    protocol_errors: protocolErrors,
    threshold_errors: thresholdErrors,
    rival_errors: rivalErrors,
    surface_errors: surfaceErrors,
    artifact_errors: artifactErrors,
    doc_errors: docErrors,
    local_path_leaks: localPathLeaks,
    import_sanity: importSanity,
    interpretation_boundary: 'Subjectivity scaffolding verification only; structural consistency check, not subjectivity support, not external validation.'
  };

  fs.mkdirSync(ARTIFACTS_ROOT, { recursive: true });
  const outputPath = path.join(ARTIFACTS_ROOT, 'subjectivity_scaffolding_check.json');
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  return { ok, outputPath, payload };
}

if (require.main === module) {
  verifySubjectivityScaffolding()
    .then((result) => {
      if (!result.ok) {
        throw new Error(`Subjectivity scaffolding verification failed. See ${path.relative(ROOT, result.outputPath)}`);
      }
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    })
    .catch((error) => {
      console.error(`FAIL verify-subjectivity-scaffolding: ${error.message}`);
      process.exit(1);
    });
}

module.exports = {
  verifySubjectivityScaffolding
};

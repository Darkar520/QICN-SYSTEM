#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src', 'subjectivity');
const ARTIFACTS_ROOT = path.join(ROOT, 'artifacts', 'subjectivity');
const LOCAL_PATH_PATTERN =
  /\/c:\/|[A-Za-z]:\\Users\\|OneDrive|Escritorio|\.\.[/\\]release_repo_qicn_2026-03-01|\.\.[/\\]rigid-identity-framework/i;

const REQUIRED_DOC_FILES = [
  'docs/SUBJECTIVITY_RUNTIME_PROTOCOL.md',
  'docs/SUBJECTIVITY_INTERVENTIONS_AND_NEGATIVE_CONTROLS.md',
  'docs/SUBJECTIVITY_ARTIFACT_SURFACE_POLICY.md',
  'docs/SUBJECTIVITY_INTERPRETATION_BOUNDARY.md',
  'docs/SUBJECTIVITY_MAINTENANCE.md',
  'docs/SUBJECTIVITY_CANDIDATE_INTEGRATION.md',
  'docs/SUBJECTIVITY_AUDIT_HANDOFF.md',
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
  'src/subjectivity/SelfIndexRegistry.js',
  'src/subjectivity/OwnershipAttributionLayer.js',
  'src/subjectivity/SubjectiveContinuityLedger.js',
  'src/subjectivity/FirstPersonPerspectiveMapper.js',
  'src/subjectivity/SubjectiveValuationEngine.js',
  'src/subjectivity/SubjectivityInterventionHarness.js',
  'src/subjectivity/SubjectivityReducibilityComparator.js',
  'src/subjectivity/SubjectivityGateEvaluator.js',
  'src/subjectivity/SubjectivityEcosystemIntegrator.js',
  'src/subjectivity/schemas/subjectivity_manifest.v1.json',
  'src/subjectivity/schemas/subjectivity_runtime_projection.v1.json',
  'src/subjectivity/schemas/subjectivity_gate_result.v1.json',
  'src/subjectivity/schemas/subjectivity_condition_summary.v1.json',
  'src/subjectivity/schemas/subjectivity_batch_summary.v1.json',
  'src/subjectivity/schemas/subjectivity_campaign_summary.v1.json',
  'src/subjectivity/schemas/subjectivity_candidate_projection.v1.json',
  'src/subjectivity/schemas/subjectivity_audit_handoff_summary.v1.json',
  'src/subjectivity/schemas/subjectivity_verification_matrix.v1.json',
  'src/subjectivity/schemas/self_index_state.v1.json',
  'src/subjectivity/schemas/ownership_attribution_report.v1.json',
  'src/subjectivity/schemas/subjective_continuity_report.v1.json',
  'src/subjectivity/schemas/first_person_perspective_report.v1.json',
  'src/subjectivity/schemas/subjective_valuation_report.v1.json',
  'src/subjectivity/schemas/subjectivity_intervention_profile.v1.json',
  'src/subjectivity/schemas/subjectivity_reducibility_report.v1.json'
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

const EXPECTED_RIVALS = [
  'pure_self_monitoring',
  'memory_integration_only',
  'policy_centered_agency',
  'narrative_self_model',
  'global_workspace_without_ownership',
  'latent_bookkeeping'
];

const EXPECTED_REQUIRED_ARTIFACTS = [
  'self_index_state.json',
  'ownership_attribution_report.json',
  'subjective_continuity_report.json',
  'first_person_perspective_report.json',
  'subjective_valuation_report.json',
  'subjectivity_intervention_profile.json',
  'subjectivity_reducibility_report.json',
  'subjectivity_runtime_projection.json',
  'subjectivity_gate_result.json',
  'subjectivity_manifest.json',
  'subjectivity_condition_summary.json',
  'subjectivity_batch_summary.json',
  'subjectivity_campaign_summary.json',
  'subjectivity_candidate_projection.json',
  'subjectivity_audit_handoff_summary.json',
  'subjectivity_verification_matrix.json'
];

const GATE_STATUS_CLASSES = [
  'subjectivity_evaluation_unsupported',
  'drift_invalidated',
  'weak_rival_reducible',
  'interventionally_unstable',
  'subjectivity_gate_fail',
  'insufficient_subjectivity_support',
  'subjectivity_admissible',
  'subjectivity_internal_strong_support'
];

const readJson = (relPath) =>
  JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
const readText = (relPath) => fs.readFileSync(path.join(ROOT, relPath), 'utf8');

const assert = (condition, message, bucket) => {
  if (!condition) bucket.push(message);
};

async function verifySubjectivityScaffolding() {
  const missingDocs = REQUIRED_DOC_FILES.filter(
    (relPath) => !fs.existsSync(path.join(ROOT, relPath))
  );
  const missingSrcFiles = REQUIRED_SRC_FILES.filter(
    (relPath) => !fs.existsSync(path.join(ROOT, relPath))
  );

  const protocol = readJson('docs/subjectivity_protocol.v1.json');
  const thresholds = readJson('docs/subjectivity_thresholds.v1.json');
  const rivals = readJson('docs/subjectivity_rival_family.v1.json');
  const artifactSchema = readJson('docs/subjectivity_artifact_schema.v1.json');
  const surfacePolicy = readJson('docs/subjectivity_surface_policy.v1.json');

  const protocolErrors = [];
  const thresholdErrors = [];
  const rivalErrors = [];
  const artifactErrors = [];
  const surfaceErrors = [];
  const docErrors = [];

  assert(
    protocol.layer_id === 'subjectivity_runtime_layer.srt6',
    'protocol layer_id must be subjectivity_runtime_layer.srt6',
    protocolErrors
  );
  assert(
    JSON.stringify((protocol.coordinates || []).map((entry) => entry.id)) ===
      JSON.stringify(EXPECTED_COORDINATES),
    'protocol coordinates must match the seven Paper 8 coordinates',
    protocolErrors
  );
  assert(
    protocol.functional?.status === 'implemented_internal_gate_closure_in_srt5',
    'protocol functional status must reflect SRT-5 internal gate closure',
    protocolErrors
  );
  assert(
    protocol.functional?.non_compensation === true,
    'protocol must declare non_compensation=true',
    protocolErrors
  );
  assert(
    JSON.stringify(protocol.required_artifacts || []) ===
      JSON.stringify(EXPECTED_REQUIRED_ARTIFACTS),
    'protocol required_artifacts must match the emitted and consumed SRT-5 artifact set',
    protocolErrors
  );
  assert(
    JSON.stringify(protocol.runtime_status_classes || []) ===
      JSON.stringify(GATE_STATUS_CLASSES),
    'protocol runtime_status_classes must match the SRT-5 gate taxonomy',
    protocolErrors
  );

  assert(
    thresholds.layer_id === 'subjectivity_runtime_layer.srt6',
    'threshold registry must move to subjectivity_runtime_layer.srt6',
    thresholdErrors
  );
  assert(
    thresholds.status ===
      'provisional_srt6_internal_gate_thresholds_and_ecosystem_hardening_not_empirically_calibrated',
    'threshold registry must reflect SRT-6 provisional internal gate thresholds',
    thresholdErrors
  );
  assert(
    thresholds.calibration_boundary?.usable_for_runtime_gate === true,
    'threshold registry must authorize runtime gate execution in SRT-5',
    thresholdErrors
  );
  assert(
    thresholds.calibration_boundary?.usable_for_external_claiming === false,
    'threshold registry must keep external claiming disabled',
    thresholdErrors
  );
  assert(
    Number(thresholds.global_thresholds?.Phi_subj) > 0 &&
      Number(thresholds.global_thresholds?.Gamma_subj) > 0,
    'threshold registry must define global thresholds for Phi_subj and Gamma_subj',
    thresholdErrors
  );

  assert(
    JSON.stringify((rivals.rivals || []).map((entry) => entry.id)) ===
      JSON.stringify(EXPECTED_RIVALS),
    'rival family registry must keep the six canonical weak rivals',
    rivalErrors
  );
  assert(
    rivals.comparator_implementation_status ===
      'minimally_executable_partial_runtime',
    'rival family registry must remain minimally_executable_partial_runtime',
    rivalErrors
  );

  for (const artifactName of EXPECTED_REQUIRED_ARTIFACTS) {
    const spec = artifactSchema.artifacts?.[artifactName];
    assert(Boolean(spec), `artifact schema missing ${artifactName}`, artifactErrors);
    if (!spec) continue;
    assert(
      Array.isArray(spec.minimum_fields) && spec.minimum_fields.length > 0,
      `${artifactName} must define minimum_fields`,
      artifactErrors
    );
  }

  assert(
    artifactSchema.artifacts?.['subjectivity_runtime_projection.json']
      ?.implementation_status === 'implemented_internal_gate_closure_in_srt5',
    'subjectivity_runtime_projection.json must be marked implemented_internal_gate_closure_in_srt5',
    artifactErrors
  );
  assert(
    artifactSchema.artifacts?.['subjectivity_gate_result.json']
      ?.implementation_status === 'implemented_internal_gate_closure_in_srt5',
    'subjectivity_gate_result.json must be marked implemented_internal_gate_closure_in_srt5',
    artifactErrors
  );
  assert(
    artifactSchema.artifacts?.['subjectivity_manifest.json']
      ?.implementation_status === 'implemented_internal_gate_closure_in_srt5',
    'subjectivity_manifest.json must be marked implemented_internal_gate_closure_in_srt5',
    artifactErrors
  );

  for (const artifactName of EXPECTED_REQUIRED_ARTIFACTS) {
    const policy = surfacePolicy.outputs?.[artifactName];
    assert(Boolean(policy), `surface policy missing ${artifactName}`, surfaceErrors);
    if (!policy) continue;
    assert(
      Array.isArray(policy.blocked_surfaces) &&
        policy.blocked_surfaces.includes('external_claim_facing_surface'),
      `${artifactName} must remain blocked on external_claim_facing_surface`,
      surfaceErrors
    );
    assert(
      policy.claim_gate_status === 'blocked_for_external_claiming',
      `${artifactName} must remain blocked_for_external_claiming`,
      surfaceErrors
    );
    assert(
      policy.statement_gate_status === 'blocked',
      `${artifactName} must remain statement blocked`,
      surfaceErrors
    );
  }

  assert(
    surfacePolicy.outputs?.['subjectivity_gate_result.json']?.runtime_status ===
      'implemented_internal_gate_closure_in_srt5',
    'subjectivity_gate_result.json surface policy must reflect implemented_internal_gate_closure_in_srt5',
    surfaceErrors
  );

  for (const relPath of [
    'docs/SUBJECTIVITY_RUNTIME_PROTOCOL.md',
    'docs/SUBJECTIVITY_ARTIFACT_SURFACE_POLICY.md',
    'docs/SUBJECTIVITY_INTERPRETATION_BOUNDARY.md'
  ]) {
    const text = readText(relPath);
    assert(
      /framework-internal/i.test(text),
      `${relPath} must mention framework-internal reading`,
      docErrors
    );
    assert(
      /not external(?:ly)? validated/i.test(text),
      `${relPath} must mention no external validation`,
      docErrors
    );
    assert(
      /not claim-facing|not claim facing|not claim-facing promotion/i.test(text),
      `${relPath} must keep claim-facing promotion blocked`,
      docErrors
    );
  }

  const localPathLeaks = [...REQUIRED_DOC_FILES, ...REQUIRED_SRC_FILES].filter(
    (relPath) =>
      fs.existsSync(path.join(ROOT, relPath)) &&
      LOCAL_PATH_PATTERN.test(readText(relPath))
  );

  const imported = await import(pathToFileURL(path.join(SRC, 'index.js')).href);
  const importSanity = {
    hasDescribe: typeof imported.describeSubjectivityLayerScaffold === 'function',
    hasSelfIndex: typeof imported.createSelfIndexRegistry === 'function',
    hasOwnership: typeof imported.createOwnershipAttributionLayer === 'function',
    hasContinuity:
      typeof imported.createSubjectiveContinuityLedger === 'function',
    hasPerspective:
      typeof imported.createFirstPersonPerspectiveMapper === 'function',
    hasValuation:
      typeof imported.createSubjectiveValuationEngine === 'function',
    hasIntervention:
      typeof imported.createSubjectivityInterventionHarness === 'function',
    hasReducibility:
      typeof imported.createSubjectivityReducibilityComparator === 'function',
    hasGate:
      typeof imported.createSubjectivityGateEvaluator === 'function',
    hasEcosystemIntegrator:
      typeof imported.createSubjectivityEcosystemIntegrator === 'function'
  };

  const ok =
    missingDocs.length === 0 &&
    missingSrcFiles.length === 0 &&
    protocolErrors.length === 0 &&
    thresholdErrors.length === 0 &&
    rivalErrors.length === 0 &&
    artifactErrors.length === 0 &&
    surfaceErrors.length === 0 &&
    docErrors.length === 0 &&
    localPathLeaks.length === 0 &&
    Object.values(importSanity).every(Boolean);

  const payload = {
    artifact_role: 'subjectivity_scaffolding_check',
    schema_version: '1.0.0',
    layer_id: 'subjectivity_runtime_layer.srt6',
    status: ok ? 'PASS' : 'FAIL',
    missing_docs: missingDocs,
    missing_src_files: missingSrcFiles,
    protocol_errors: protocolErrors,
    threshold_errors: thresholdErrors,
    rival_errors: rivalErrors,
    artifact_errors: artifactErrors,
    surface_errors: surfaceErrors,
    doc_errors: docErrors,
    local_path_leaks: localPathLeaks,
    import_sanity: importSanity,
    interpretation_boundary:
      'Subjectivity scaffolding verification only; structural consistency check for SRT-6 ecosystem hardening, not subjectivity support, not external validation.'
  };

  fs.mkdirSync(ARTIFACTS_ROOT, { recursive: true });
  const outputPath = path.join(
    ARTIFACTS_ROOT,
    'subjectivity_scaffolding_check.json'
  );
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  return { ok, outputPath, payload };
}

if (require.main === module) {
  verifySubjectivityScaffolding()
    .then((result) => {
      if (!result.ok) {
        throw new Error(
          `Subjectivity scaffolding verification failed. See ${path.relative(
            ROOT,
            result.outputPath
          )}`
        );
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

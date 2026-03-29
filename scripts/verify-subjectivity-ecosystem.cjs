#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const { buildSubjectivityEcosystem } = require('./build-subjectivity-ecosystem.cjs');

const ROOT = path.resolve(__dirname, '..');
const SRT5_DIR = path.join(ROOT, 'artifacts', 'subjectivity', 'srt5');
const SRT6_DIR = path.join(ROOT, 'artifacts', 'subjectivity', 'srt6');
const LOCAL_PATH_PATTERN =
  /\/c:\/|[A-Za-z]:\\Users\\|OneDrive|Escritorio|\.\.[/\\]release_repo_qicn_2026-03-01|\.\.[/\\]rigid-identity-framework/i;

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const writeJson = (filePath, payload) =>
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
const assert = (condition, message, bucket) => {
  if (!condition) bucket.push(message);
};

const validateRequiredFields = (payload, requiredFields, bucket, label) => {
  for (const field of requiredFields) {
    assert(
      Object.prototype.hasOwnProperty.call(payload, field),
      `${label} missing required field ${field}`,
      bucket
    );
  }
};

async function verifySubjectivityEcosystem() {
  const build = await buildSubjectivityEcosystem();
  if (!build.ok) {
    throw new Error('SRT-6 build failed before verification.');
  }

  const imported = await import(
    pathToFileURL(path.join(ROOT, 'src', 'subjectivity', 'index.js')).href
  );
  const integrator = imported.createSubjectivityEcosystemIntegrator();

  const artifactSchema = readJson(path.join(ROOT, 'docs', 'subjectivity_artifact_schema.v1.json'));
  const surfacePolicy = readJson(path.join(ROOT, 'docs', 'subjectivity_surface_policy.v1.json'));

  const runBundle = {
    projection: readJson(path.join(SRT5_DIR, 'subjectivity_runtime_projection.json')),
    gate_result: readJson(path.join(SRT5_DIR, 'subjectivity_gate_result.json')),
    manifest: readJson(path.join(SRT5_DIR, 'subjectivity_manifest.json')),
    refs: {
      projection: 'artifacts/subjectivity/srt5/subjectivity_runtime_projection.json',
      gate_result: 'artifacts/subjectivity/srt5/subjectivity_gate_result.json',
      manifest: 'artifacts/subjectivity/srt5/subjectivity_manifest.json'
    }
  };

  const conditionSummary = readJson(path.join(SRT6_DIR, 'subjectivity_condition_summary.json'));
  const batchSummary = readJson(path.join(SRT6_DIR, 'subjectivity_batch_summary.json'));
  const campaignSummary = readJson(path.join(SRT6_DIR, 'subjectivity_campaign_summary.json'));
  const candidateProjection = readJson(path.join(SRT6_DIR, 'subjectivity_candidate_projection.json'));
  const auditHandoff = readJson(path.join(SRT6_DIR, 'subjectivity_audit_handoff_summary.json'));
  const verificationMatrix = readJson(path.join(SRT6_DIR, 'subjectivity_verification_matrix.json'));

  const schemaErrors = [];
  for (const [artifactName, payload] of [
    ['subjectivity_condition_summary.json', conditionSummary],
    ['subjectivity_batch_summary.json', batchSummary],
    ['subjectivity_campaign_summary.json', campaignSummary],
    ['subjectivity_candidate_projection.json', candidateProjection],
    ['subjectivity_audit_handoff_summary.json', auditHandoff],
    ['subjectivity_verification_matrix.json', verificationMatrix]
  ]) {
    validateRequiredFields(
      payload,
      artifactSchema.artifacts[artifactName].minimum_fields,
      schemaErrors,
      artifactName
    );
  }

  const behaviorErrors = [];
  assert(
    conditionSummary.run_count >= 1,
    'condition summary must aggregate at least one run',
    behaviorErrors
  );
  assert(
    batchSummary.condition_count >= 1,
    'batch summary must aggregate at least one condition summary',
    behaviorErrors
  );
  assert(
    campaignSummary.batch_count >= 1,
    'campaign summary must aggregate at least one batch summary',
    behaviorErrors
  );
  assert(
    candidateProjection.readiness_class === 'subjectivity_stack_audit_ready_internal',
    'candidate projection must reach subjectivity_stack_audit_ready_internal under the verification baseline',
    behaviorErrors
  );
  assert(
    verificationMatrix.status === 'PASS',
    'verification matrix must pass under the verification baseline',
    behaviorErrors
  );

  const surfaceErrors = [];
  for (const artifactName of [
    'subjectivity_runtime_projection.json',
    'subjectivity_gate_result.json',
    'subjectivity_manifest.json',
    'subjectivity_condition_summary.json',
    'subjectivity_batch_summary.json',
    'subjectivity_campaign_summary.json',
    'subjectivity_candidate_projection.json',
    'subjectivity_audit_handoff_summary.json',
    'subjectivity_verification_matrix.json'
  ]) {
    const policy = surfacePolicy.outputs?.[artifactName];
    assert(Boolean(policy), `surface policy missing ${artifactName}`, surfaceErrors);
    if (!policy) continue;
    assert(
      (policy.blocked_surfaces || []).includes('external_claim_facing_surface'),
      `${artifactName} must remain blocked on external_claim_facing_surface`,
      surfaceErrors
    );
    assert(
      (policy.blocked_surfaces || []).includes('controlled_statement_surface'),
      `${artifactName} must remain blocked on controlled_statement_surface`,
      surfaceErrors
    );
  }

  const controlErrors = [];
  const staleRunBundle = JSON.parse(JSON.stringify(runBundle));
  staleRunBundle.manifest.lineage.thresholds.sha256 = 'stale-threshold-hash-without-rerun';
  const staleControl = integrator.integrate({ run_bundle: staleRunBundle });
  assert(
    staleControl.candidate_projection.invalidation_reasons.includes('thresholds_drift'),
    'stale_threshold_control must expose thresholds_drift',
    controlErrors
  );
  assert(
    staleControl.candidate_projection.readiness_class !== 'subjectivity_stack_candidate_ready'
      && staleControl.candidate_projection.readiness_class !== 'subjectivity_stack_audit_ready_internal',
    'stale_threshold_control must degrade readiness below candidate-ready',
    controlErrors
  );

  const unsupportedRunBundle = JSON.parse(JSON.stringify(runBundle));
  unsupportedRunBundle.gate_result.classification = 'subjectivity_evaluation_unsupported';
  unsupportedRunBundle.gate_result.gate_status = 'fail';
  unsupportedRunBundle.gate_result.invalidation_reasons = ['missing_required_coordinates'];
  const unsupportedControl = integrator.integrate({ run_bundle: unsupportedRunBundle });
  assert(
    unsupportedControl.candidate_projection.invalidation_reasons.includes('run_gate_not_clean'),
    'unsupported_gate_control must expose run_gate_not_clean',
    controlErrors
  );
  assert(
    unsupportedControl.candidate_projection.readiness_class === 'subjectivity_stack_incomplete',
    'unsupported_gate_control must collapse to subjectivity_stack_incomplete',
    controlErrors
  );

  const leakingSurfacePolicy = JSON.parse(JSON.stringify(surfacePolicy));
  leakingSurfacePolicy.outputs['subjectivity_candidate_projection.json'].blocked_surfaces =
    ['controlled_statement_surface'];
  const leakControl = integrator.integrate(
    { run_bundle: runBundle },
    { surfacePolicy: leakingSurfacePolicy }
  );
  assert(
    leakControl.candidate_projection.invalidation_reasons.some((reason) =>
      /external_claim_surface_not_blocked/i.test(reason)
    ),
    'claim_surface_leak_control must expose external_claim_surface_not_blocked',
    controlErrors
  );

  const leakErrors = [];
  for (const payload of [
    conditionSummary,
    batchSummary,
    campaignSummary,
    candidateProjection,
    auditHandoff,
    verificationMatrix
  ]) {
    const serialized = JSON.stringify(payload);
    assert(
      !LOCAL_PATH_PATTERN.test(serialized),
      `${payload.artifact_role} contains a local path leak`,
      leakErrors
    );
    assert(
      /framework-internal/i.test(payload.interpretation_boundary),
      `${payload.artifact_role} must declare framework-internal boundary`,
      leakErrors
    );
    assert(
      /not external(?:ly)? validated/i.test(payload.interpretation_boundary),
      `${payload.artifact_role} must deny external validation`,
      leakErrors
    );
    assert(
      /not human equivalence/i.test(payload.interpretation_boundary),
      `${payload.artifact_role} must deny human equivalence`,
      leakErrors
    );
    assert(
      /not phenomenality/i.test(payload.interpretation_boundary),
      `${payload.artifact_role} must deny phenomenality closure`,
      leakErrors
    );
  }

  const ok =
    schemaErrors.length === 0
    && behaviorErrors.length === 0
    && surfaceErrors.length === 0
    && controlErrors.length === 0
    && leakErrors.length === 0;

  const payload = {
    artifact_role: 'subjectivity_ecosystem_check',
    schema_version: '1.0.0',
    layer_id: 'subjectivity_runtime_layer.srt6',
    status: ok ? 'PASS' : 'FAIL',
    emitted_artifacts: [
      'artifacts/subjectivity/srt6/subjectivity_condition_summary.json',
      'artifacts/subjectivity/srt6/subjectivity_batch_summary.json',
      'artifacts/subjectivity/srt6/subjectivity_campaign_summary.json',
      'artifacts/subjectivity/srt6/subjectivity_candidate_projection.json',
      'artifacts/subjectivity/srt6/subjectivity_audit_handoff_summary.json',
      'artifacts/subjectivity/srt6/subjectivity_verification_matrix.json'
    ],
    baseline_summary: {
      support_class: runBundle.manifest.support_class,
      readiness_class: candidateProjection.readiness_class,
      verification_status: verificationMatrix.status
    },
    stale_threshold_control: {
      readiness_class: staleControl.candidate_projection.readiness_class,
      invalidation_reasons: staleControl.candidate_projection.invalidation_reasons
    },
    unsupported_gate_control: {
      readiness_class: unsupportedControl.candidate_projection.readiness_class,
      invalidation_reasons: unsupportedControl.candidate_projection.invalidation_reasons
    },
    claim_surface_leak_control: {
      readiness_class: leakControl.candidate_projection.readiness_class,
      invalidation_reasons: leakControl.candidate_projection.invalidation_reasons
    },
    schema_errors: schemaErrors,
    behavior_errors: behaviorErrors,
    surface_errors: surfaceErrors,
    control_errors: controlErrors,
    leak_errors: leakErrors,
    interpretation_boundary:
      'SRT-6 ecosystem verification only; confirms internal aggregation, candidate/audit packaging discipline, anti-stale controls, and blocked claim-facing surfaces, not external validation, not phenomenality closure.'
  };

  const outputPath = path.join(SRT6_DIR, 'subjectivity_ecosystem_check.json');
  writeJson(outputPath, payload);
  return { ok, outputPath, payload };
}

if (require.main === module) {
  verifySubjectivityEcosystem()
    .then((result) => {
      if (!result.ok) {
        throw new Error(
          `Subjectivity ecosystem verification failed. See ${path.relative(
            ROOT,
            result.outputPath
          )}`
        );
      }
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    })
    .catch((error) => {
      console.error(`FAIL verify-subjectivity-ecosystem: ${error.message}`);
      process.exit(1);
    });
}

module.exports = {
  verifySubjectivityEcosystem
};

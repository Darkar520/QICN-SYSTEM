#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const { verifySubjectivityReducibility } = require('./verify-subjectivity-reducibility.cjs');

const ROOT = path.resolve(__dirname, '..');
const SRT3_ARTIFACTS_DIR = path.join(ROOT, 'artifacts', 'subjectivity', 'srt3');
const SRT4_ARTIFACTS_DIR = path.join(ROOT, 'artifacts', 'subjectivity', 'srt4');
const SRT5_ARTIFACTS_DIR = path.join(ROOT, 'artifacts', 'subjectivity', 'srt5');
const LOCAL_PATH_PATTERN =
  /\/c:\/|[A-Za-z]:\\Users\\|OneDrive|Escritorio|\.\.[/\\]release_repo_qicn_2026-03-01|\.\.[/\\]rigid-identity-framework/i;

const BLOCKED_SURFACES = [
  'controlled_statement_surface',
  'external_claim_facing_surface'
];

const readJson = (relPath) =>
  JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
const readArtifact = (artifactPath) =>
  JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
const writeJson = (targetPath, payload) =>
  fs.writeFileSync(targetPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

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

async function verifySubjectivityGate() {
  const upstream = await verifySubjectivityReducibility();
  if (!upstream.ok) {
    throw new Error(
      `SRT-4 dependency verification failed before SRT-5. See ${path.relative(
        ROOT,
        upstream.outputPath
      )}`
    );
  }

  const imported = await import(
    pathToFileURL(path.join(ROOT, 'src', 'subjectivity', 'index.js')).href
  );
  const evaluator = imported.createSubjectivityGateEvaluator();
  const comparator = imported.createSubjectivityReducibilityComparator();

  const artifactSchema = readJson('docs/subjectivity_artifact_schema.v1.json');
  const surfacePolicy = readJson('docs/subjectivity_surface_policy.v1.json');
  const protocol = readJson('docs/subjectivity_protocol.v1.json');

  const baselineInput = {
    run_id: 'srt5_gate_baseline',
    condition_id: 'baseline_subjectivity_enabled',
    self_index_state: readArtifact(
      path.join(SRT3_ARTIFACTS_DIR, 'self_index_state.json')
    ),
    ownership_attribution_report: readArtifact(
      path.join(SRT3_ARTIFACTS_DIR, 'ownership_attribution_report.json')
    ),
    subjective_continuity_report: readArtifact(
      path.join(SRT3_ARTIFACTS_DIR, 'subjective_continuity_report.json')
    ),
    first_person_perspective_report: readArtifact(
      path.join(SRT3_ARTIFACTS_DIR, 'first_person_perspective_report.json')
    ),
    subjective_valuation_report: readArtifact(
      path.join(SRT3_ARTIFACTS_DIR, 'subjective_valuation_report.json')
    ),
    subjectivity_intervention_profile: readArtifact(
      path.join(SRT3_ARTIFACTS_DIR, 'subjectivity_intervention_profile.json')
    ),
    subjectivity_reducibility_report: readArtifact(
      path.join(SRT4_ARTIFACTS_DIR, 'subjectivity_reducibility_report.json')
    ),
    provenance: {
      source_trace_ref: 'subjectivity_inputs/srt5_gate_baseline',
      input_profile: 'srt5_verification_baseline'
    }
  };

  const cleanLineage = evaluator.captureCurrentLineage();
  const baselineBundle = evaluator.writeArtifacts(
    {
      ...baselineInput,
      expected_lineage: cleanLineage
    },
    SRT5_ARTIFACTS_DIR
  );

  const gateCompensationControlBundle = evaluator.evaluate({
    ...baselineInput,
    run_id: 'srt5_gate_compensation_control',
    ownership_attribution_report: {
      ...baselineInput.ownership_attribution_report,
      ownership_coherence: 0.52,
      uncertain_fraction: 0.05,
      self_index_dependency: {
        ...baselineInput.ownership_attribution_report.self_index_dependency,
        ambiguity_flag: true
      },
      warnings: [
        ...(baselineInput.ownership_attribution_report.warnings || []),
        'gate_compensation_control_injected'
      ]
    },
    expected_lineage: cleanLineage,
    provenance: {
      source_trace_ref: 'subjectivity_inputs/srt5_gate_compensation_control',
      input_profile: 'srt5_verification_gate_compensation_control'
    }
  });

  const missingCoordinateControlBundle = evaluator.evaluate({
    ...baselineInput,
    run_id: 'srt5_missing_coordinate_control',
    subjectivity_reducibility_report: null,
    expected_lineage: cleanLineage,
    provenance: {
      source_trace_ref: 'subjectivity_inputs/srt5_missing_coordinate_control',
      input_profile: 'srt5_verification_missing_coordinate_control'
    }
  });

  const staleLineage = JSON.parse(JSON.stringify(cleanLineage));
  staleLineage.thresholds.sha256 = 'stale-threshold-hash-without-rerun';
  const driftInvalidationControlBundle = evaluator.evaluate({
    ...baselineInput,
    run_id: 'srt5_drift_invalidation_control',
    expected_lineage: staleLineage,
    provenance: {
      source_trace_ref: 'subjectivity_inputs/srt5_drift_invalidation_control',
      input_profile: 'srt5_verification_drift_invalidation_control'
    }
  });

  const comparatorUnsupportedArtifact = comparator.compare({
    run_id: 'srt5_comparator_unsupported_control',
    self_index_state: baselineInput.self_index_state,
    ownership_attribution_report: baselineInput.ownership_attribution_report,
    subjective_continuity_report: baselineInput.subjective_continuity_report,
    first_person_perspective_report: baselineInput.first_person_perspective_report,
    subjective_valuation_report: baselineInput.subjective_valuation_report,
    subjectivity_intervention_profile: baselineInput.subjectivity_intervention_profile,
    control_mode: 'incomplete_comparator_control',
    provenance: {
      source_trace_ref: 'subjectivity_inputs/srt5_comparator_unsupported_control',
      input_profile: 'srt5_verification_comparator_unsupported_control'
    }
  });

  const comparatorUnsupportedControlBundle = evaluator.evaluate({
    ...baselineInput,
    run_id: 'srt5_comparator_unsupported_control',
    subjectivity_reducibility_report: comparatorUnsupportedArtifact,
    expected_lineage: cleanLineage,
    provenance: {
      source_trace_ref: 'subjectivity_inputs/srt5_comparator_unsupported_control',
      input_profile: 'srt5_verification_comparator_unsupported_control'
    }
  });

  const schemaErrors = [];
  validateRequiredFields(
    baselineBundle.projection,
    artifactSchema.artifacts['subjectivity_runtime_projection.json']
      .minimum_fields,
    schemaErrors,
    'subjectivity_runtime_projection.json'
  );
  validateRequiredFields(
    baselineBundle.gate_result,
    artifactSchema.artifacts['subjectivity_gate_result.json'].minimum_fields,
    schemaErrors,
    'subjectivity_gate_result.json'
  );
  validateRequiredFields(
    baselineBundle.manifest,
    artifactSchema.artifacts['subjectivity_manifest.json'].minimum_fields,
    schemaErrors,
    'subjectivity_manifest.json'
  );

  const behaviorErrors = [];
  assert(
    Object.keys(baselineBundle.projection.coordinate_estimates || {}).length === 7,
    'baseline projection must emit seven coordinate estimates',
    behaviorErrors
  );
  assert(
    Number.isFinite(baselineBundle.projection.global_functional_result?.phi_subj),
    'baseline projection must emit a finite phi_subj',
    behaviorErrors
  );
  assert(
    Number.isFinite(baselineBundle.gate_result.gamma_subj),
    'baseline gate result must emit a finite gamma_subj',
    behaviorErrors
  );
  assert(
    baselineBundle.gate_result.gate_status === 'pass',
    'baseline gate result must pass under the verification baseline',
    behaviorErrors
  );
  assert(
    [
      'subjectivity_admissible',
      'subjectivity_internal_strong_support'
    ].includes(baselineBundle.gate_result.classification),
    'baseline classification must remain within admissible internal support classes',
    behaviorErrors
  );
  assert(
    baselineBundle.gate_result.drift_status?.invalidated === false,
    'baseline gate result must not be drift-invalidated',
    behaviorErrors
  );

  const controlErrors = [];
  assert(
    gateCompensationControlBundle.gate_result.global_functional_result.pass === true,
    'gate_compensation_control must keep phi_subj above threshold',
    controlErrors
  );
  assert(
    gateCompensationControlBundle.gate_result.gate_status === 'fail',
    'gate_compensation_control must fail the gate despite a passing functional',
    controlErrors
  );
  assert(
    gateCompensationControlBundle.gate_result.classification ===
      'subjectivity_gate_fail',
    'gate_compensation_control must classify as subjectivity_gate_fail',
    controlErrors
  );
  assert(
    missingCoordinateControlBundle.gate_result.classification ===
      'subjectivity_evaluation_unsupported',
    'missing_coordinate_control must classify as subjectivity_evaluation_unsupported',
    controlErrors
  );
  assert(
    missingCoordinateControlBundle.gate_result.invalidation_reasons.some((reason) =>
      /missing_required_coordinates/i.test(reason)
    ),
    'missing_coordinate_control must expose missing_required_coordinates',
    controlErrors
  );
  assert(
    driftInvalidationControlBundle.gate_result.classification ===
      'drift_invalidated',
    'drift_invalidation_control must classify as drift_invalidated',
    controlErrors
  );
  assert(
    driftInvalidationControlBundle.gate_result.drift_status?.invalidated === true,
    'drift_invalidation_control must mark drift_status.invalidated=true',
    controlErrors
  );
  assert(
    comparatorUnsupportedControlBundle.gate_result.classification ===
      'subjectivity_evaluation_unsupported',
    'comparator_unsupported_control must classify as subjectivity_evaluation_unsupported',
    controlErrors
  );
  assert(
    comparatorUnsupportedControlBundle.gate_result.invalidation_reasons.includes(
      'comparator_unsupported'
    ),
    'comparator_unsupported_control must expose comparator_unsupported',
    controlErrors
  );

  const surfaceErrors = [];
  for (const artifactName of [
    'subjectivity_runtime_projection.json',
    'subjectivity_gate_result.json',
    'subjectivity_manifest.json'
  ]) {
    const policy = surfacePolicy.outputs?.[artifactName];
    assert(Boolean(policy), `surface policy missing ${artifactName}`, surfaceErrors);
    if (!policy) continue;
    for (const blockedSurface of BLOCKED_SURFACES) {
      assert(
        Array.isArray(policy.blocked_surfaces) &&
          policy.blocked_surfaces.includes(blockedSurface),
        `${artifactName} must remain blocked on ${blockedSurface}`,
        surfaceErrors
      );
    }
    assert(
      policy.claim_gate_status === 'blocked_for_external_claiming',
      `${artifactName} must remain blocked_for_external_claiming`,
      surfaceErrors
    );
  }

  const leakErrors = [];
  for (const payload of [
    baselineBundle.projection,
    baselineBundle.gate_result,
    baselineBundle.manifest,
    gateCompensationControlBundle.gate_result,
    missingCoordinateControlBundle.gate_result,
    driftInvalidationControlBundle.gate_result,
    comparatorUnsupportedControlBundle.gate_result
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
      /not externally validated/i.test(payload.interpretation_boundary),
      `${payload.artifact_role} must deny external validation`,
      leakErrors
    );
    assert(
      /not human equivalence|not equivalent to human subjectivity/i.test(
        payload.interpretation_boundary
      ),
      `${payload.artifact_role} must explicitly deny human equivalence`,
      leakErrors
    );
    assert(
      /not phenomenality|not phenomenality closure/i.test(
        payload.interpretation_boundary
      ),
      `${payload.artifact_role} must explicitly deny phenomenality closure`,
      leakErrors
    );
  }

  const protocolErrors = [];
  assert(
    protocol.functional?.status === 'implemented_internal_gate_closure_in_srt5',
    'protocol must reflect SRT-5 gate closure',
    protocolErrors
  );
  assert(
    Array.isArray(protocol.runtime_status_classes) &&
      protocol.runtime_status_classes.includes('subjectivity_admissible') &&
      protocol.runtime_status_classes.includes(
        'subjectivity_internal_strong_support'
      ),
    'protocol must include the SRT-5 internal gate taxonomy',
    protocolErrors
  );

  const ok =
    schemaErrors.length === 0 &&
    behaviorErrors.length === 0 &&
    controlErrors.length === 0 &&
    surfaceErrors.length === 0 &&
    leakErrors.length === 0 &&
    protocolErrors.length === 0;

  const payload = {
    artifact_role: 'subjectivity_gate_check',
    schema_version: '1.0.0',
    layer_id: protocol.layer_id || 'subjectivity_runtime_layer.srt5',
    status: ok ? 'PASS' : 'FAIL',
    emitted_artifacts: [
      'artifacts/subjectivity/srt5/subjectivity_runtime_projection.json',
      'artifacts/subjectivity/srt5/subjectivity_gate_result.json',
      'artifacts/subjectivity/srt5/subjectivity_manifest.json'
    ],
    baseline_summary: {
      phi_subj: baselineBundle.gate_result.phi_subj,
      gamma_subj: baselineBundle.gate_result.gamma_subj,
      classification: baselineBundle.gate_result.classification,
      gate_status: baselineBundle.gate_result.gate_status
    },
    gate_compensation_control: {
      phi_pass:
        gateCompensationControlBundle.gate_result.global_functional_result.pass,
      gate_status: gateCompensationControlBundle.gate_result.gate_status,
      classification: gateCompensationControlBundle.gate_result.classification
    },
    missing_coordinate_control: {
      classification: missingCoordinateControlBundle.gate_result.classification,
      invalidation_reasons:
        missingCoordinateControlBundle.gate_result.invalidation_reasons
    },
    drift_invalidation_control: {
      classification: driftInvalidationControlBundle.gate_result.classification,
      drift_status: driftInvalidationControlBundle.gate_result.drift_status
    },
    comparator_unsupported_control: {
      classification:
        comparatorUnsupportedControlBundle.gate_result.classification,
      invalidation_reasons:
        comparatorUnsupportedControlBundle.gate_result.invalidation_reasons
    },
    schema_errors: schemaErrors,
    behavior_errors: behaviorErrors,
    control_errors: controlErrors,
    surface_errors: surfaceErrors,
    leak_errors: leakErrors,
    protocol_errors: protocolErrors,
    interpretation_boundary:
      'SRT-5 verification only; confirms executable internal gate closure with non-compensation, drift invalidation, comparator dependency, and blocked claim-facing surfaces, not external validation, not phenomenality closure.'
  };

  fs.mkdirSync(SRT5_ARTIFACTS_DIR, { recursive: true });
  const outputPath = path.join(
    SRT5_ARTIFACTS_DIR,
    'subjectivity_gate_check.json'
  );
  writeJson(outputPath, payload);

  return { ok, outputPath, payload };
}

if (require.main === module) {
  verifySubjectivityGate()
    .then((result) => {
      if (!result.ok) {
        throw new Error(
          `Subjectivity gate verification failed. See ${path.relative(
            ROOT,
            result.outputPath
          )}`
        );
      }
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    })
    .catch((error) => {
      console.error(`FAIL verify-subjectivity-gate: ${error.message}`);
      process.exit(1);
    });
}

module.exports = {
  verifySubjectivityGate
};

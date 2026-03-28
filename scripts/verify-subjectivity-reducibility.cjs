#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const { verifySubjectivityValuationIntervention } = require('./verify-subjectivity-valuation-intervention.cjs');

const ROOT = path.resolve(__dirname, '..');
const SRT3_ARTIFACTS_DIR = path.join(ROOT, 'artifacts', 'subjectivity', 'srt3');
const SRT4_ARTIFACTS_DIR = path.join(ROOT, 'artifacts', 'subjectivity', 'srt4');
const LOCAL_PATH_PATTERN =
  /\/c:\/|[A-Za-z]:\\Users\\|OneDrive|Escritorio|\.\.[/\\]release_repo_qicn_2026-03-01|\.\.[/\\]rigid-identity-framework/i;

const EXPECTED_RUNTIME_STATUS = 'implemented_internal_partial_comparator';
const BLOCKED_SURFACES = [
  'local_report_surface',
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

async function verifySubjectivityReducibility() {
  const upstream = await verifySubjectivityValuationIntervention();
  if (!upstream.ok) {
    throw new Error(
      `SRT-3 dependency verification failed before SRT-4. See ${path.relative(
        ROOT,
        upstream.outputPath
      )}`
    );
  }

  const imported = await import(
    pathToFileURL(path.join(ROOT, 'src', 'subjectivity', 'index.js')).href
  );
  const comparator = imported.createSubjectivityReducibilityComparator();

  const artifactSchema = readJson('docs/subjectivity_artifact_schema.v1.json');
  const surfacePolicy = readJson('docs/subjectivity_surface_policy.v1.json');
  const protocol = readJson('docs/subjectivity_protocol.v1.json');
  const rivals = readJson('docs/subjectivity_rival_family.v1.json');

  const comparatorInput = {
    run_id: 'srt4_reducibility_baseline',
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
    provenance: {
      source_trace_ref: 'subjectivity_inputs/srt4_reducibility_baseline',
      input_profile: 'srt4_verification_baseline'
    }
  };

  const reducibilityArtifact = comparator.compare(comparatorInput);
  const unfairLossControlArtifact = comparator.compare({
    ...comparatorInput,
    run_id: 'srt4_unfair_loss_control',
    control_mode: 'unfair_loss_control',
    provenance: {
      source_trace_ref: 'subjectivity_inputs/srt4_unfair_loss_control',
      input_profile: 'srt4_verification_unfair_loss_control'
    }
  });
  const incompleteComparatorControlArtifact = comparator.compare({
    ...comparatorInput,
    run_id: 'srt4_incomplete_comparator_control',
    control_mode: 'incomplete_comparator_control',
    provenance: {
      source_trace_ref: 'subjectivity_inputs/srt4_incomplete_comparator_control',
      input_profile: 'srt4_verification_incomplete_comparator_control'
    }
  });

  fs.mkdirSync(SRT4_ARTIFACTS_DIR, { recursive: true });
  const emittedArtifactPath = path.join(
    SRT4_ARTIFACTS_DIR,
    'subjectivity_reducibility_report.json'
  );
  writeJson(emittedArtifactPath, reducibilityArtifact);

  const schemaErrors = [];
  validateRequiredFields(
    reducibilityArtifact,
    artifactSchema.artifacts['subjectivity_reducibility_report.json']
      .minimum_fields,
    schemaErrors,
    'subjectivity_reducibility_report.json'
  );

  const behaviorErrors = [];
  assert(
    reducibilityArtifact.comparison_supported === true,
    'baseline comparator run must be supported',
    behaviorErrors
  );
  assert(
    typeof reducibilityArtifact.loss_family?.shared_loss_family === 'boolean' &&
      reducibilityArtifact.loss_family.shared_loss_family === true,
    'baseline comparator run must use a shared loss family',
    behaviorErrors
  );
  assert(
    Number.isFinite(reducibilityArtifact.strong_model_loss?.total_loss),
    'strong model loss must be finite',
    behaviorErrors
  );
  assert(
    Number.isFinite(reducibilityArtifact.best_weak_loss),
    'best_weak_loss must be finite',
    behaviorErrors
  );
  assert(
    Number.isFinite(reducibilityArtifact.best_hybrid_loss),
    'best_hybrid_loss must be finite',
    behaviorErrors
  );
  assert(
    Array.isArray(reducibilityArtifact.rival_family_used?.members) &&
      reducibilityArtifact.rival_family_used.members.length >= 6,
    'baseline comparator must evaluate the six canonical weak rivals',
    behaviorErrors
  );
  assert(
    reducibilityArtifact.hybrid_family_used?.hybrid_count > 0,
    'baseline comparator must evaluate admissible hybrids',
    behaviorErrors
  );
  assert(
    [
      'weak_model_sufficient',
      'weak_hybrid_sufficient',
      'irreducibility_not_yet_supported',
      'partial_irreducibility_support'
    ].includes(reducibilityArtifact.classification),
    'baseline comparator classification must remain within SRT-4 reducibility classes',
    behaviorErrors
  );

  const controlErrors = [];
  assert(
    unfairLossControlArtifact.comparison_supported === false,
    'unfair_loss_control must disable comparison support',
    controlErrors
  );
  assert(
    unfairLossControlArtifact.classification === 'comparison_unsupported',
    'unfair_loss_control must fall to comparison_unsupported',
    controlErrors
  );
  assert(
    unfairLossControlArtifact.warnings.includes('loss_family_not_shared'),
    'unfair_loss_control must expose loss_family_not_shared',
    controlErrors
  );
  assert(
    incompleteComparatorControlArtifact.comparison_supported === false,
    'incomplete_comparator_control must disable comparison support',
    controlErrors
  );
  assert(
    incompleteComparatorControlArtifact.classification ===
      'comparison_unsupported',
    'incomplete_comparator_control must fall to comparison_unsupported',
    controlErrors
  );
  assert(
    incompleteComparatorControlArtifact.warnings.includes(
      'rival_family_incomplete'
    ) ||
      incompleteComparatorControlArtifact.warnings.includes(
        'hybrid_family_incomplete'
      ),
    'incomplete_comparator_control must expose incomplete family coverage',
    controlErrors
  );

  const surfaceErrors = [];
  const policy = surfacePolicy.outputs?.['subjectivity_reducibility_report.json'];
  assert(
    Boolean(policy),
    'subjectivity_reducibility_report.json missing surface policy',
    surfaceErrors
  );
  if (policy) {
    assert(
      policy.runtime_status === EXPECTED_RUNTIME_STATUS,
      'subjectivity_reducibility_report.json must remain partial comparator only',
      surfaceErrors
    );
    for (const blockedSurface of BLOCKED_SURFACES) {
      assert(
        Array.isArray(policy.blocked_surfaces) &&
          policy.blocked_surfaces.includes(blockedSurface),
        `subjectivity_reducibility_report.json must remain blocked on ${blockedSurface}`,
        surfaceErrors
      );
    }
    assert(
      policy.claim_gate_status === 'blocked_for_external_claiming',
      'subjectivity_reducibility_report.json must remain blocked_for_external_claiming',
      surfaceErrors
    );
    assert(
      policy.statement_gate_status === 'blocked',
      'subjectivity_reducibility_report.json must remain statement blocked',
      surfaceErrors
    );
  }

  const noClaimLeakErrors = [];
  for (const payload of [
    reducibilityArtifact,
    unfairLossControlArtifact,
    incompleteComparatorControlArtifact
  ]) {
    const serialized = JSON.stringify(payload);
    assert(
      !/subjectivity_(admissible|strong_support|achieved)/i.test(serialized),
      `${payload.artifact_role} must not contain inflated subjectivity status classes`,
      noClaimLeakErrors
    );
    assert(
      !LOCAL_PATH_PATTERN.test(serialized),
      `${payload.artifact_role} contains a local path leak`,
      noClaimLeakErrors
    );
    assert(
      /framework-internal/i.test(payload.interpretation_boundary),
      `${payload.artifact_role} must declare framework-internal boundary`,
      noClaimLeakErrors
    );
    assert(
      /not externally validated/i.test(payload.interpretation_boundary),
      `${payload.artifact_role} must declare no external validation`,
      noClaimLeakErrors
    );
    assert(
      /not final proof of irreducibility/i.test(payload.interpretation_boundary),
      `${payload.artifact_role} must deny final irreducibility proof`,
      noClaimLeakErrors
    );
  }

  const protocolErrors = [];
  const comparatorCoordinate = (protocol.coordinates || []).find(
    (entry) => entry.id === 'IrreducibilityMargin'
  );
  assert(
    comparatorCoordinate?.status === 'implemented_internal_partial_comparator',
    'protocol must mark IrreducibilityMargin as partial comparator in SRT-4',
    protocolErrors
  );
  assert(
    Array.isArray(protocol.required_negative_controls) &&
      protocol.required_negative_controls.includes('unfair_loss_control') &&
      protocol.required_negative_controls.includes(
        'incomplete_comparator_control'
      ),
    'protocol must include the SRT-4 comparator negative controls',
    protocolErrors
  );
  assert(
    Array.isArray(protocol.reducibility_status_classes) &&
      protocol.reducibility_status_classes.includes(
        'partial_irreducibility_support'
      ),
    'protocol must include SRT-4 reducibility status classes',
    protocolErrors
  );
  assert(
    rivals.comparator_implementation_status ===
      'minimally_executable_partial_runtime',
    'rival family registry must be minimally executable in SRT-4',
    protocolErrors
  );

  const ok =
    schemaErrors.length === 0 &&
    behaviorErrors.length === 0 &&
    controlErrors.length === 0 &&
    surfaceErrors.length === 0 &&
    noClaimLeakErrors.length === 0 &&
    protocolErrors.length === 0;

  const payload = {
    artifact_role: 'subjectivity_reducibility_check',
    schema_version: '1.0.0',
    layer_id: protocol.layer_id || 'subjectivity_runtime_layer.srt4',
    status: ok ? 'PASS' : 'FAIL',
    emitted_artifacts: [
      'artifacts/subjectivity/srt4/subjectivity_reducibility_report.json'
    ],
    reducibility_summary: {
      strong_model_loss: reducibilityArtifact.strong_model_loss,
      best_weak_rival: reducibilityArtifact.best_weak_rival,
      best_weak_hybrid: reducibilityArtifact.best_weak_hybrid,
      irreducibility_margin: reducibilityArtifact.irreducibility_margin,
      classification: reducibilityArtifact.classification
    },
    unfair_loss_control: {
      comparison_supported: unfairLossControlArtifact.comparison_supported,
      classification: unfairLossControlArtifact.classification,
      warnings: unfairLossControlArtifact.warnings
    },
    incomplete_comparator_control: {
      comparison_supported:
        incompleteComparatorControlArtifact.comparison_supported,
      classification: incompleteComparatorControlArtifact.classification,
      warnings: incompleteComparatorControlArtifact.warnings
    },
    schema_errors: schemaErrors,
    behavior_errors: behaviorErrors,
    control_errors: controlErrors,
    surface_errors: surfaceErrors,
    claim_leak_errors: noClaimLeakErrors,
    protocol_errors: protocolErrors,
    interpretation_boundary:
      'SRT-4 verification only; confirms executable reducibility comparison with shared loss, complexity penalty, admissible weak hybrids, and comparator controls, not final irreducibility proof, not external validation.'
  };

  const outputPath = path.join(
    SRT4_ARTIFACTS_DIR,
    'subjectivity_reducibility_check.json'
  );
  writeJson(outputPath, payload);

  return { ok, outputPath, payload };
}

if (require.main === module) {
  verifySubjectivityReducibility()
    .then((result) => {
      if (!result.ok) {
        throw new Error(
          `Subjectivity reducibility verification failed. See ${path.relative(
            ROOT,
            result.outputPath
          )}`
        );
      }
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    })
    .catch((error) => {
      console.error(
        `FAIL verify-subjectivity-reducibility: ${error.message}`
      );
      process.exit(1);
    });
}

module.exports = {
  verifySubjectivityReducibility
};

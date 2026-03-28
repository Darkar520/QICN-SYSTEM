#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const ARTIFACTS_DIR = path.join(ROOT, 'artifacts', 'subjectivity', 'srt2');
const LOCAL_PATH_PATTERN =
  /\/c:\/|[A-Za-z]:\\Users\\|OneDrive|Escritorio|\.\.[/\\]release_repo_qicn_2026-03-01|\.\.[/\\]rigid-identity-framework/i;

const EXPECTED_RUNTIME_STATUS = 'implemented_internal_support_pre_comparator';
const BLOCKED_SURFACES = [
  'local_report_surface',
  'controlled_statement_surface',
  'external_claim_facing_surface'
];

const readJson = (relPath) =>
  JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
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

async function verifySubjectivityContinuityPerspective() {
  const imported = await import(
    pathToFileURL(path.join(ROOT, 'src', 'subjectivity', 'index.js')).href
  );
  const selfIndexRegistry = imported.createSelfIndexRegistry();
  const ownershipLayer = imported.createOwnershipAttributionLayer();
  const continuityLedger = imported.createSubjectiveContinuityLedger();
  const perspectiveMapper = imported.createFirstPersonPerspectiveMapper();

  const artifactSchema = readJson('docs/subjectivity_artifact_schema.v1.json');
  const surfacePolicy = readJson('docs/subjectivity_surface_policy.v1.json');
  const protocol = readJson('docs/subjectivity_protocol.v1.json');

  const baselineSelfIndexInput = {
    run_id: 'srt2_continuity_perspective_baseline',
    candidate_loci: [
      {
        candidate_index: 'locus_alpha',
        display_label: 'alpha',
        supporting_signals: {
          persistence_anchor: 0.88,
          continuity_support: 0.84,
          action_binding: 0.75,
          memory_binding: 0.8,
          label_anchor: 0.1
        }
      },
      {
        candidate_index: 'locus_beta',
        display_label: 'beta',
        supporting_signals: {
          persistence_anchor: 0.42,
          continuity_support: 0.38,
          action_binding: 0.3,
          memory_binding: 0.34,
          label_anchor: 0.1
        }
      }
    ],
    provenance: {
      source_trace_ref: 'subjectivity_inputs/srt2_baseline_trace',
      input_profile: 'srt2_verification_baseline'
    }
  };

  const baselineOwnershipEntries = [
    {
      entry_id: 'evt_self_trace',
      candidate_index: 'locus_alpha',
      source_kind: 'event',
      substantive_signals: {
        causal_link: 0.84,
        continuity_link: 0.78,
        action_author_link: 0.81,
        memory_link: 0.67
      },
      bookkeeping_only: false,
      external_hint: 0
    },
    {
      entry_id: 'evt_self_memory',
      candidate_index: 'locus_alpha',
      source_kind: 'memory',
      substantive_signals: {
        causal_link: 0.75,
        continuity_link: 0.82,
        action_author_link: 0.59,
        memory_link: 0.87
      },
      bookkeeping_only: false,
      external_hint: 0
    },
    {
      entry_id: 'evt_external_trace',
      candidate_index: 'locus_beta',
      source_kind: 'event',
      substantive_signals: {
        causal_link: 0.49,
        continuity_link: 0.35,
        action_author_link: 0.28,
        memory_link: 0.22
      },
      bookkeeping_only: false,
      external_hint: 0.81
    }
  ];

  const baselineTrajectoryLines = [
    {
      line_id: 'alpha_line',
      candidate_index: 'locus_alpha',
      history_window_id: 'hist_alpha',
      history_length: 6,
      copied_memory_only: false,
      fracture_signal: 0.08,
      fork_overlap: 0.04,
      supporting_signals: {
        temporal_linkage: 0.92,
        ownership_alignment: 0.88,
        self_index_alignment: 0.91,
        remap_robustness: 0.85,
        memory_integrity: 0.82
      }
    },
    {
      line_id: 'beta_line',
      candidate_index: 'locus_beta',
      history_window_id: 'hist_beta',
      history_length: 5,
      copied_memory_only: false,
      fracture_signal: 0.11,
      fork_overlap: 0.05,
      supporting_signals: {
        temporal_linkage: 0.46,
        ownership_alignment: 0.42,
        self_index_alignment: 0.31,
        remap_robustness: 0.38,
        memory_integrity: 0.45
      }
    }
  ];

  const baselinePerspectiveObservations = [
    {
      observation_id: 'obs_alpha_trace',
      candidate_index: 'locus_alpha',
      line_id: 'alpha_line',
      ownership_entry_id: 'evt_self_trace',
      orientation_signal: 0.92,
      egocentric_binding: 0.88,
      continuity_context: 0.86,
      neutral_observability: 0.22
    },
    {
      observation_id: 'obs_alpha_memory',
      candidate_index: 'locus_alpha',
      line_id: 'alpha_line',
      ownership_entry_id: 'evt_self_memory',
      orientation_signal: 0.87,
      egocentric_binding: 0.84,
      continuity_context: 0.82,
      neutral_observability: 0.24
    }
  ];

  const baselineSelfIndexArtifact = selfIndexRegistry.evaluate(
    baselineSelfIndexInput
  );
  const baselineOwnershipArtifact = ownershipLayer.evaluate({
    run_id: baselineSelfIndexInput.run_id,
    self_index_state: baselineSelfIndexArtifact,
    ownership_entries: baselineOwnershipEntries,
    provenance: {
      source_trace_ref: 'subjectivity_inputs/srt2_baseline_trace',
      input_profile: 'srt2_verification_baseline'
    }
  });
  const baselineContinuityArtifact = continuityLedger.evaluate({
    run_id: baselineSelfIndexInput.run_id,
    self_index_state: baselineSelfIndexArtifact,
    ownership_attribution_report: baselineOwnershipArtifact,
    trajectory_lines: baselineTrajectoryLines,
    provenance: {
      source_trace_ref: 'subjectivity_inputs/srt2_baseline_trace',
      input_profile: 'srt2_verification_baseline'
    }
  });
  const baselinePerspectiveArtifact = perspectiveMapper.evaluate({
    run_id: baselineSelfIndexInput.run_id,
    self_index_state: baselineSelfIndexArtifact,
    ownership_attribution_report: baselineOwnershipArtifact,
    subjective_continuity_report: baselineContinuityArtifact,
    perspective_observations: baselinePerspectiveObservations,
    provenance: {
      source_trace_ref: 'subjectivity_inputs/srt2_baseline_trace',
      input_profile: 'srt2_verification_baseline'
    }
  });

  const memoryCopyControlArtifact = continuityLedger.evaluate({
    run_id: 'srt2_memory_copy_without_continuity_control',
    control_mode: 'memory_copy_without_continuity_control',
    self_index_state: baselineSelfIndexArtifact,
    ownership_attribution_report: baselineOwnershipArtifact,
    trajectory_lines: [
      {
        line_id: 'copied_alpha_line',
        candidate_index: 'locus_alpha',
        history_window_id: 'hist_copied_alpha',
        history_length: 6,
        copied_memory_only: true,
        fracture_signal: 0.42,
        fork_overlap: 0.08,
        supporting_signals: {
          temporal_linkage: 0.18,
          ownership_alignment: 0.29,
          self_index_alignment: 0.24,
          remap_robustness: 0.12,
          memory_integrity: 0.93
        }
      },
      {
        line_id: 'copied_beta_rival',
        candidate_index: 'locus_beta',
        history_window_id: 'hist_copied_beta',
        history_length: 5,
        copied_memory_only: false,
        fracture_signal: 0.17,
        fork_overlap: 0.05,
        supporting_signals: {
          temporal_linkage: 0.31,
          ownership_alignment: 0.22,
          self_index_alignment: 0.14,
          remap_robustness: 0.21,
          memory_integrity: 0.48
        }
      }
    ],
    provenance: {
      source_trace_ref:
        'subjectivity_inputs/srt2_memory_copy_without_continuity_control',
      input_profile: 'srt2_verification_memory_copy_control'
    }
  });

  const perspectiveNeutralControlArtifact = perspectiveMapper.evaluate({
    run_id: 'srt2_perspective_neutral_factorization_control',
    control_mode: 'perspective_neutral_factorization_control',
    self_index_state: baselineSelfIndexArtifact,
    ownership_attribution_report: baselineOwnershipArtifact,
    subjective_continuity_report: baselineContinuityArtifact,
    perspective_observations: [
      {
        observation_id: 'obs_neutral_1',
        candidate_index: 'locus_beta',
        line_id: 'beta_line',
        ownership_entry_id: 'evt_external_trace',
        orientation_signal: 0.52,
        egocentric_binding: 0.18,
        continuity_context: 0.28,
        neutral_observability: 0.86
      },
      {
        observation_id: 'obs_neutral_2',
        candidate_index: 'locus_beta',
        line_id: 'beta_line',
        ownership_entry_id: 'evt_external_trace',
        orientation_signal: 0.48,
        egocentric_binding: 0.12,
        continuity_context: 0.25,
        neutral_observability: 0.82
      }
    ],
    provenance: {
      source_trace_ref:
        'subjectivity_inputs/srt2_perspective_neutral_factorization_control',
      input_profile: 'srt2_verification_perspective_neutral_control'
    }
  });

  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  const emittedArtifacts = {
    self_index_state: path.join(ARTIFACTS_DIR, 'self_index_state.json'),
    ownership_attribution_report: path.join(
      ARTIFACTS_DIR,
      'ownership_attribution_report.json'
    ),
    subjective_continuity_report: path.join(
      ARTIFACTS_DIR,
      'subjective_continuity_report.json'
    ),
    first_person_perspective_report: path.join(
      ARTIFACTS_DIR,
      'first_person_perspective_report.json'
    )
  };
  writeJson(emittedArtifacts.self_index_state, baselineSelfIndexArtifact);
  writeJson(
    emittedArtifacts.ownership_attribution_report,
    baselineOwnershipArtifact
  );
  writeJson(
    emittedArtifacts.subjective_continuity_report,
    baselineContinuityArtifact
  );
  writeJson(
    emittedArtifacts.first_person_perspective_report,
    baselinePerspectiveArtifact
  );

  const schemaErrors = [];
  validateRequiredFields(
    baselineContinuityArtifact,
    artifactSchema.artifacts['subjective_continuity_report.json'].minimum_fields,
    schemaErrors,
    'subjective_continuity_report.json'
  );
  validateRequiredFields(
    baselinePerspectiveArtifact,
    artifactSchema.artifacts['first_person_perspective_report.json'].minimum_fields,
    schemaErrors,
    'first_person_perspective_report.json'
  );

  const behaviorErrors = [];
  assert(
    baselineContinuityArtifact.continuity_status === 'continuity_sufficient',
    'baseline continuity must be continuity_sufficient',
    behaviorErrors
  );
  assert(
    baselineContinuityArtifact.privileged_line?.line_id === 'alpha_line',
    'baseline continuity must privilege alpha_line',
    behaviorErrors
  );
  assert(
    baselineContinuityArtifact.continuity_margin > 0.08,
    'baseline continuity margin must clear the ambiguity margin',
    behaviorErrors
  );
  assert(
    baselineContinuityArtifact.fracture_flag === false,
    'baseline continuity must not set fracture_flag',
    behaviorErrors
  );
  assert(
    baselineContinuityArtifact.fork_flag === false,
    'baseline continuity must not set fork_flag',
    behaviorErrors
  );
  assert(
    baselinePerspectiveArtifact.factorization_supported === true,
    'baseline perspective must support first-person factorization',
    behaviorErrors
  );
  assert(
    baselinePerspectiveArtifact.comparison_status === 'minimal_support',
    'baseline perspective must expose explicit minimal_support comparison status',
    behaviorErrors
  );
  assert(
    baselinePerspectiveArtifact.first_person_gain > 0.15,
    'baseline perspective must show a positive 1p over neutral gain',
    behaviorErrors
  );
  assert(
    baselinePerspectiveArtifact.first_person_factorization_summary
      ?.selected_index === baselineSelfIndexArtifact.selected_index,
    'baseline perspective must anchor factorization to selected self-index',
    behaviorErrors
  );
  assert(
    baselinePerspectiveArtifact.baseline_neutral_summary?.baseline_name ===
      'index_neutral_factorization',
    'baseline perspective must expose an explicit index-neutral baseline',
    behaviorErrors
  );

  const controlErrors = [];
  assert(
    memoryCopyControlArtifact.continuity_status !== 'continuity_sufficient',
    'memory-copy-without-continuity control must not pass as continuity_sufficient',
    controlErrors
  );
  assert(
    memoryCopyControlArtifact.fracture_flag === true ||
      memoryCopyControlArtifact.ambiguity_flag === true,
    'memory-copy-without-continuity control must surface fracture or ambiguity',
    controlErrors
  );
  assert(
    perspectiveNeutralControlArtifact.factorization_supported === false,
    'perspective-neutral control must not support first-person factorization',
    controlErrors
  );
  assert(
    perspectiveNeutralControlArtifact.comparison_status !== 'minimal_support',
    'perspective-neutral control must not report minimal_support',
    controlErrors
  );
  assert(
    perspectiveNeutralControlArtifact.first_person_gain <= 0.03,
    'perspective-neutral control must collapse or reverse first-person gain',
    controlErrors
  );

  const surfaceErrors = [];
  for (const artifactName of [
    'subjective_continuity_report.json',
    'first_person_perspective_report.json'
  ]) {
    const policy = surfacePolicy.outputs?.[artifactName];
    assert(Boolean(policy), `${artifactName} missing surface policy`, surfaceErrors);
    if (!policy) continue;
    assert(
      policy.runtime_status === EXPECTED_RUNTIME_STATUS,
      `${artifactName} surface policy must stay pre-comparator`,
      surfaceErrors
    );
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
    assert(
      policy.statement_gate_status === 'blocked',
      `${artifactName} must remain statement blocked`,
      surfaceErrors
    );
  }

  const noClaimLeakErrors = [];
  for (const payload of [baselineContinuityArtifact, baselinePerspectiveArtifact]) {
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
  }
  assert(
    /not equivalent to metaphysical persistence/i.test(
      baselineContinuityArtifact.interpretation_boundary
    ),
    'continuity artifact must deny metaphysical persistence inference',
    noClaimLeakErrors
  );
  assert(
    /not equivalent to human autobiographical continuity/i.test(
      baselineContinuityArtifact.interpretation_boundary
    ),
    'continuity artifact must deny human autobiographical equivalence',
    noClaimLeakErrors
  );
  assert(
    /not equivalent to strong phenomenal perspective/i.test(
      baselinePerspectiveArtifact.interpretation_boundary
    ),
    'perspective artifact must deny strong phenomenal perspective inference',
    noClaimLeakErrors
  );

  const protocolErrors = [];
  const implementedCoordinates = (protocol.coordinates || [])
    .filter((entry) => entry.status === 'implemented_internal_support_pre_comparator')
    .map((entry) => entry.id);
  assert(
    ['SelfIndex', 'OwnershipField', 'ContinuityField', 'FirstPersonPerspective'].every(
      (coordinate) => implementedCoordinates.includes(coordinate)
    ),
    'protocol must mark the first four Paper 8 coordinates as implemented in SRT-2',
    protocolErrors
  );
  assert(
    Array.isArray(protocol.required_negative_controls) &&
      protocol.required_negative_controls.includes(
        'memory_copy_without_continuity_control'
      ) &&
      protocol.required_negative_controls.includes(
        'perspective_neutral_factorization_control'
      ),
    'protocol must include the SRT-2 negative controls',
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
    artifact_role: 'subjectivity_continuity_perspective_check',
    schema_version: '1.0.0',
    layer_id: protocol.layer_id || 'subjectivity_runtime_layer.srt2',
    status: ok ? 'PASS' : 'FAIL',
    emitted_artifacts: [
      'artifacts/subjectivity/srt2/self_index_state.json',
      'artifacts/subjectivity/srt2/ownership_attribution_report.json',
      'artifacts/subjectivity/srt2/subjective_continuity_report.json',
      'artifacts/subjectivity/srt2/first_person_perspective_report.json'
    ],
    minimal_comparison: {
      baseline_name: baselinePerspectiveArtifact.baseline_neutral_summary
        ?.baseline_name,
      first_person_gain: baselinePerspectiveArtifact.first_person_gain,
      comparison_status: baselinePerspectiveArtifact.comparison_status
    },
    negative_controls: {
      memory_copy_without_continuity_control: {
        expected_behavior:
          'copied memory without temporal/autobiographical linkage must not pass as continuity_sufficient',
        actual_status: memoryCopyControlArtifact.continuity_status,
        fracture_flag: memoryCopyControlArtifact.fracture_flag,
        ambiguity_flag: memoryCopyControlArtifact.ambiguity_flag
      },
      perspective_neutral_factorization_control: {
        expected_behavior:
          'index-neutral organization must not automatically support first-person factorization',
        actual_gain: perspectiveNeutralControlArtifact.first_person_gain,
        factorization_supported:
          perspectiveNeutralControlArtifact.factorization_supported,
        comparison_status: perspectiveNeutralControlArtifact.comparison_status
      }
    },
    schema_errors: schemaErrors,
    behavior_errors: behaviorErrors,
    control_errors: controlErrors,
    surface_errors: surfaceErrors,
    claim_leak_errors: noClaimLeakErrors,
    protocol_errors: protocolErrors,
    interpretation_boundary:
      'SRT-2 verification only; confirms executable Continuity and Perspective artifacts with explicit 1p-vs-neutral comparison and minimal negative controls, not subjectivity support, not external validation.'
  };

  const outputPath = path.join(
    ARTIFACTS_DIR,
    'subjectivity_continuity_perspective_check.json'
  );
  writeJson(outputPath, payload);

  return { ok, outputPath, payload };
}

if (require.main === module) {
  verifySubjectivityContinuityPerspective()
    .then((result) => {
      if (!result.ok) {
        throw new Error(
          `Subjectivity continuity/perspective verification failed. See ${path.relative(
            ROOT,
            result.outputPath
          )}`
        );
      }
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    })
    .catch((error) => {
      console.error(
        `FAIL verify-subjectivity-continuity-perspective: ${error.message}`
      );
      process.exit(1);
    });
}

module.exports = {
  verifySubjectivityContinuityPerspective
};

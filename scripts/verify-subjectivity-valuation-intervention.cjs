#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const ARTIFACTS_DIR = path.join(ROOT, 'artifacts', 'subjectivity', 'srt3');
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

async function verifySubjectivityValuationIntervention() {
  const imported = await import(
    pathToFileURL(path.join(ROOT, 'src', 'subjectivity', 'index.js')).href
  );
  const selfIndexRegistry = imported.createSelfIndexRegistry();
  const ownershipLayer = imported.createOwnershipAttributionLayer();
  const continuityLedger = imported.createSubjectiveContinuityLedger();
  const perspectiveMapper = imported.createFirstPersonPerspectiveMapper();
  const valuationEngine = imported.createSubjectiveValuationEngine();
  const interventionHarness = imported.createSubjectivityInterventionHarness();

  const artifactSchema = readJson('docs/subjectivity_artifact_schema.v1.json');
  const surfacePolicy = readJson('docs/subjectivity_surface_policy.v1.json');
  const protocol = readJson('docs/subjectivity_protocol.v1.json');

  const baselineSelfIndexInput = {
    run_id: 'srt3_valuation_intervention_baseline',
    candidate_loci: [
      {
        candidate_index: 'locus_alpha',
        display_label: 'alpha',
        supporting_signals: {
          persistence_anchor: 0.89,
          continuity_support: 0.85,
          action_binding: 0.78,
          memory_binding: 0.82,
          label_anchor: 0.1
        }
      },
      {
        candidate_index: 'locus_beta',
        display_label: 'beta',
        supporting_signals: {
          persistence_anchor: 0.41,
          continuity_support: 0.37,
          action_binding: 0.31,
          memory_binding: 0.35,
          label_anchor: 0.1
        }
      }
    ],
    provenance: {
      source_trace_ref: 'subjectivity_inputs/srt3_baseline_trace',
      input_profile: 'srt3_verification_baseline'
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
        action_author_link: 0.82,
        memory_link: 0.68
      },
      bookkeeping_only: false,
      external_hint: 0
    },
    {
      entry_id: 'evt_self_memory',
      candidate_index: 'locus_alpha',
      source_kind: 'memory',
      substantive_signals: {
        causal_link: 0.76,
        continuity_link: 0.83,
        action_author_link: 0.61,
        memory_link: 0.88
      },
      bookkeeping_only: false,
      external_hint: 0
    },
    {
      entry_id: 'evt_external_trace',
      candidate_index: 'locus_beta',
      source_kind: 'event',
      substantive_signals: {
        causal_link: 0.5,
        continuity_link: 0.36,
        action_author_link: 0.29,
        memory_link: 0.24
      },
      bookkeeping_only: false,
      external_hint: 0.82
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

  const valuationCases = [
    {
      case_id: 'case_self_preserve_1',
      candidate_index: 'locus_alpha',
      ownership_entry_id: 'evt_self_trace',
      line_id: 'alpha_line',
      self_preservation_signal: 0.91,
      nonself_preservation_signal: 0.2,
      consequence_cost: 0.78,
      risk_load: 0.74,
      reward_signal: 0.56
    },
    {
      case_id: 'case_self_preserve_2',
      candidate_index: 'locus_alpha',
      ownership_entry_id: 'evt_self_memory',
      line_id: 'alpha_line',
      self_preservation_signal: 0.85,
      nonself_preservation_signal: 0.24,
      consequence_cost: 0.69,
      risk_load: 0.63,
      reward_signal: 0.49
    },
    {
      case_id: 'case_nonself_tradeoff',
      candidate_index: 'locus_beta',
      ownership_entry_id: 'evt_external_trace',
      line_id: 'beta_line',
      self_preservation_signal: 0.22,
      nonself_preservation_signal: 0.77,
      consequence_cost: 0.58,
      risk_load: 0.54,
      reward_signal: 0.44
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
      source_trace_ref: 'subjectivity_inputs/srt3_baseline_trace',
      input_profile: 'srt3_verification_baseline'
    }
  });
  const baselineContinuityArtifact = continuityLedger.evaluate({
    run_id: baselineSelfIndexInput.run_id,
    self_index_state: baselineSelfIndexArtifact,
    ownership_attribution_report: baselineOwnershipArtifact,
    trajectory_lines: baselineTrajectoryLines,
    provenance: {
      source_trace_ref: 'subjectivity_inputs/srt3_baseline_trace',
      input_profile: 'srt3_verification_baseline'
    }
  });
  const baselinePerspectiveArtifact = perspectiveMapper.evaluate({
    run_id: baselineSelfIndexInput.run_id,
    self_index_state: baselineSelfIndexArtifact,
    ownership_attribution_report: baselineOwnershipArtifact,
    subjective_continuity_report: baselineContinuityArtifact,
    perspective_observations: baselinePerspectiveObservations,
    provenance: {
      source_trace_ref: 'subjectivity_inputs/srt3_baseline_trace',
      input_profile: 'srt3_verification_baseline'
    }
  });

  const valuationInput = {
    run_id: baselineSelfIndexInput.run_id,
    self_index_state: baselineSelfIndexArtifact,
    ownership_attribution_report: baselineOwnershipArtifact,
    subjective_continuity_report: baselineContinuityArtifact,
    first_person_perspective_report: baselinePerspectiveArtifact,
    valuation_cases: valuationCases,
    provenance: {
      source_trace_ref: 'subjectivity_inputs/srt3_baseline_trace',
      input_profile: 'srt3_verification_baseline'
    }
  };

  const baselineValuationArtifact = valuationEngine.evaluate(valuationInput);
  const interventionProfileArtifact = interventionHarness.run(valuationInput);

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
    ),
    subjective_valuation_report: path.join(
      ARTIFACTS_DIR,
      'subjective_valuation_report.json'
    ),
    subjectivity_intervention_profile: path.join(
      ARTIFACTS_DIR,
      'subjectivity_intervention_profile.json'
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
  writeJson(
    emittedArtifacts.subjective_valuation_report,
    baselineValuationArtifact
  );
  writeJson(
    emittedArtifacts.subjectivity_intervention_profile,
    interventionProfileArtifact
  );

  const schemaErrors = [];
  validateRequiredFields(
    baselineValuationArtifact,
    artifactSchema.artifacts['subjective_valuation_report.json'].minimum_fields,
    schemaErrors,
    'subjective_valuation_report.json'
  );
  validateRequiredFields(
    interventionProfileArtifact,
    artifactSchema.artifacts['subjectivity_intervention_profile.json']
      .minimum_fields,
    schemaErrors,
    'subjectivity_intervention_profile.json'
  );

  const behaviorErrors = [];
  assert(
    baselineValuationArtifact.weighting_classification === 'self-preserving',
    'baseline valuation must classify as self-preserving',
    behaviorErrors
  );
  assert(
    baselineValuationArtifact.valuation_asymmetry_margin > 0.12,
    'baseline valuation must show positive self/non-self asymmetry',
    behaviorErrors
  );
  assert(
    baselineValuationArtifact.inversion_response?.status === 'responsive',
    'baseline valuation must expose a responsive inversion response',
    behaviorErrors
  );
  assert(
    baselineValuationArtifact.aliasing_warning?.flag === true,
    'baseline valuation must expose reward_aliasing_control as a warning boundary',
    behaviorErrors
  );

  const inversionRun = interventionProfileArtifact.intervention_runs.find(
    (run) => run.intervention_name === 'self_nonself_valuation_inversion'
  );
  const riskReassignmentRun =
    interventionProfileArtifact.intervention_runs.find(
      (run) => run.intervention_name === 'risk_consequence_reassignment'
    );
  const rewardAliasingControl =
    interventionProfileArtifact.negative_control_runs.find(
      (run) => run.intervention_name === 'reward_aliasing_control'
    );
  const nonselectiveDamageControl =
    interventionProfileArtifact.negative_control_runs.find(
      (run) => run.intervention_name === 'nonselective_damage_control'
    );

  assert(
    Boolean(inversionRun),
    'intervention profile must include self_nonself_valuation_inversion',
    behaviorErrors
  );
  assert(
    Boolean(riskReassignmentRun),
    'intervention profile must include risk_consequence_reassignment',
    behaviorErrors
  );
  assert(
    inversionRun?.profile_status === 'selective_drop',
    'valuation inversion must register as selective_drop',
    behaviorErrors
  );
  assert(
    inversionRun?.targeted_coordinate_drop > 0.1,
    'valuation inversion must produce explicit targeted coordinate drop',
    behaviorErrors
  );
  assert(
    riskReassignmentRun?.targeted_coordinate_drop > 0.06,
    'risk/consequence reassignment must produce explicit targeted coordinate drop',
    behaviorErrors
  );
  assert(
    ['selective_drop', 'flat_damage'].includes(
      riskReassignmentRun?.profile_status
    ),
    'risk/consequence reassignment must produce a non-trivial intervention status',
    behaviorErrors
  );

  const controlErrors = [];
  assert(
    rewardAliasingControl?.profile_status === 'control_confounded_perturbation',
    'reward_aliasing_control must register as control_confounded_perturbation',
    controlErrors
  );
  assert(
    rewardAliasingControl?.control_confound_flag === true,
    'reward_aliasing_control must set control_confound_flag',
    controlErrors
  );
  assert(
    nonselectiveDamageControl?.profile_status === 'flat_damage',
    'nonselective_damage_control must register as flat_damage',
    controlErrors
  );
  assert(
    interventionProfileArtifact.aggregate_profile?.selective_drop_count >= 1,
    'aggregate profile must register at least one selective_drop',
    controlErrors
  );

  const surfaceErrors = [];
  for (const artifactName of [
    'subjective_valuation_report.json',
    'subjectivity_intervention_profile.json'
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
  for (const payload of [
    baselineValuationArtifact,
    interventionProfileArtifact
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
  }
  assert(
    /not equivalent to affective or moral valuation/i.test(
      baselineValuationArtifact.interpretation_boundary
    ),
    'valuation artifact must deny affective or moral equivalence',
    noClaimLeakErrors
  );
  assert(
    /not equivalent to human valuational life/i.test(
      baselineValuationArtifact.interpretation_boundary
    ),
    'valuation artifact must deny human valuational-life equivalence',
    noClaimLeakErrors
  );

  const protocolErrors = [];
  const implementedCoordinates = (protocol.coordinates || [])
    .filter((entry) => entry.status === 'implemented_internal_support_pre_comparator')
    .map((entry) => entry.id);
  assert(
    [
      'SelfIndex',
      'OwnershipField',
      'ContinuityField',
      'FirstPersonPerspective',
      'ValuationAsymmetry',
      'InterventionProfile'
    ].every((coordinate) => implementedCoordinates.includes(coordinate)),
    'protocol must mark the first six Paper 8 coordinates as implemented in SRT-3',
    protocolErrors
  );
  assert(
    Array.isArray(protocol.required_negative_controls) &&
      protocol.required_negative_controls.includes('reward_aliasing_control') &&
      protocol.required_negative_controls.includes('nonselective_damage_control'),
    'protocol must include the SRT-3 negative controls',
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
    artifact_role: 'subjectivity_valuation_intervention_check',
    schema_version: '1.0.0',
    layer_id: protocol.layer_id || 'subjectivity_runtime_layer.srt3',
    status: ok ? 'PASS' : 'FAIL',
    emitted_artifacts: [
      'artifacts/subjectivity/srt3/self_index_state.json',
      'artifacts/subjectivity/srt3/ownership_attribution_report.json',
      'artifacts/subjectivity/srt3/subjective_continuity_report.json',
      'artifacts/subjectivity/srt3/first_person_perspective_report.json',
      'artifacts/subjectivity/srt3/subjective_valuation_report.json',
      'artifacts/subjectivity/srt3/subjectivity_intervention_profile.json'
    ],
    baseline_valuation: {
      valuation_asymmetry_margin:
        baselineValuationArtifact.valuation_asymmetry_margin,
      weighting_classification:
        baselineValuationArtifact.weighting_classification,
      inversion_response: baselineValuationArtifact.inversion_response
    },
    intervention_profile: {
      inversion_run: inversionRun,
      risk_reassignment_run: riskReassignmentRun,
      reward_aliasing_control: rewardAliasingControl,
      nonselective_damage_control: nonselectiveDamageControl
    },
    schema_errors: schemaErrors,
    behavior_errors: behaviorErrors,
    control_errors: controlErrors,
    surface_errors: surfaceErrors,
    claim_leak_errors: noClaimLeakErrors,
    protocol_errors: protocolErrors,
    interpretation_boundary:
      'SRT-3 verification only; confirms executable Valuation and Intervention surfaces with explicit inversion, risk reassignment, and negative controls, not subjectivity support, not external validation.'
  };

  const outputPath = path.join(
    ARTIFACTS_DIR,
    'subjectivity_valuation_intervention_check.json'
  );
  writeJson(outputPath, payload);

  return { ok, outputPath, payload };
}

if (require.main === module) {
  verifySubjectivityValuationIntervention()
    .then((result) => {
      if (!result.ok) {
        throw new Error(
          `Subjectivity valuation/intervention verification failed. See ${path.relative(
            ROOT,
            result.outputPath
          )}`
        );
      }
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    })
    .catch((error) => {
      console.error(
        `FAIL verify-subjectivity-valuation-intervention: ${error.message}`
      );
      process.exit(1);
    });
}

module.exports = {
  verifySubjectivityValuationIntervention
};

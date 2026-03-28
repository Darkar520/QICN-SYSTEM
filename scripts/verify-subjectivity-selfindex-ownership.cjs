#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const ARTIFACTS_DIR = path.join(ROOT, 'artifacts', 'subjectivity', 'srt1');
const LOCAL_PATH_PATTERN = /\/c:\/|[A-Za-z]:\\Users\\|OneDrive|Escritorio|\.\.[/\\]release_repo_qicn_2026-03-01|\.\.[/\\]rigid-identity-framework/i;

const EXPECTED_RUNTIME_STATUS = 'implemented_internal_support_pre_comparator';
const BLOCKED_SURFACES = ['controlled_statement_surface', 'external_claim_facing_surface'];

const readJson = (relPath) => JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
const writeJson = (targetPath, payload) =>
  fs.writeFileSync(targetPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

const assert = (condition, message, bucket) => {
  if (!condition) bucket.push(message);
};

const validateRequiredFields = (payload, requiredFields, bucket, label) => {
  for (const field of requiredFields) {
    assert(Object.prototype.hasOwnProperty.call(payload, field), `${label} missing required field ${field}`, bucket);
  }
};

async function verifySubjectivitySelfIndexOwnership() {
  const imported = await import(pathToFileURL(path.join(ROOT, 'src', 'subjectivity', 'index.js')).href);
  const selfIndexRegistry = imported.createSelfIndexRegistry();
  const ownershipLayer = imported.createOwnershipAttributionLayer();

  const artifactSchema = readJson('docs/subjectivity_artifact_schema.v1.json');
  const surfacePolicy = readJson('docs/subjectivity_surface_policy.v1.json');
  const protocol = readJson('docs/subjectivity_protocol.v1.json');

  const baselineSelfIndexInput = {
    run_id: 'srt1_selfindex_ownership_baseline',
    candidate_loci: [
      {
        candidate_index: 'locus_alpha',
        display_label: 'alpha',
        supporting_signals: {
          persistence_anchor: 0.86,
          continuity_support: 0.81,
          action_binding: 0.74,
          memory_binding: 0.77,
          label_anchor: 0.12
        }
      },
      {
        candidate_index: 'locus_beta',
        display_label: 'beta',
        supporting_signals: {
          persistence_anchor: 0.39,
          continuity_support: 0.34,
          action_binding: 0.29,
          memory_binding: 0.3,
          label_anchor: 0.12
        }
      }
    ],
    provenance: {
      source_trace_ref: 'subjectivity_inputs/srt1_baseline_trace',
      input_profile: 'srt1_verification_baseline'
    }
  };

  const labelOnlySwapSelfIndexInput = {
    ...baselineSelfIndexInput,
    run_id: 'srt1_label_only_swap_control',
    control_mode: 'label_only_swap_control',
    candidate_loci: baselineSelfIndexInput.candidate_loci.map((candidate, index, all) => ({
      ...candidate,
      display_label: all[(index + 1) % all.length].display_label
    })),
    provenance: {
      source_trace_ref: 'subjectivity_inputs/srt1_label_only_swap_control',
      input_profile: 'srt1_verification_label_only_swap'
    }
  };

  const bookkeepingOwnershipEntries = [
    {
      entry_id: 'evt_self_1',
      candidate_index: 'locus_alpha',
      source_kind: 'event',
      substantive_signals: {
        causal_link: 0.82,
        continuity_link: 0.71,
        action_author_link: 0.8,
        memory_link: 0.63
      },
      bookkeeping_only: false,
      external_hint: 0
    },
    {
      entry_id: 'evt_external_1',
      candidate_index: 'locus_beta',
      source_kind: 'memory',
      substantive_signals: {
        causal_link: 0.54,
        continuity_link: 0.41,
        action_author_link: 0.2,
        memory_link: 0.24
      },
      bookkeeping_only: false,
      external_hint: 0.78
    },
    {
      entry_id: 'evt_bookkeeping_1',
      candidate_index: 'locus_alpha',
      source_kind: 'state',
      substantive_signals: {
        causal_link: 0.05,
        continuity_link: 0,
        action_author_link: 0,
        memory_link: 0
      },
      bookkeeping_only: true,
      bookkeeping_tags: ['owned_by_self'],
      external_hint: 0
    }
  ];

  const baselineSelfIndexArtifact = selfIndexRegistry.evaluate(baselineSelfIndexInput);
  const labelSwapArtifact = selfIndexRegistry.evaluate(labelOnlySwapSelfIndexInput);
  const baselineOwnershipArtifact = ownershipLayer.evaluate({
    run_id: baselineSelfIndexInput.run_id,
    self_index_state: baselineSelfIndexArtifact,
    ownership_entries: bookkeepingOwnershipEntries,
    provenance: {
      source_trace_ref: 'subjectivity_inputs/srt1_baseline_trace',
      input_profile: 'srt1_verification_baseline'
    }
  });
  const bookkeepingControlArtifact = ownershipLayer.evaluate({
    run_id: 'srt1_bookkeeping_control',
    control_mode: 'bookkeeping_control',
    self_index_state: baselineSelfIndexArtifact,
    ownership_entries: [
      {
        entry_id: 'evt_bookkeeping_only',
        candidate_index: 'locus_alpha',
        source_kind: 'state',
        substantive_signals: {
          causal_link: 0,
          continuity_link: 0,
          action_author_link: 0,
          memory_link: 0
        },
        bookkeeping_only: true,
        bookkeeping_tags: ['self_owned']
      }
    ],
    provenance: {
      source_trace_ref: 'subjectivity_inputs/srt1_bookkeeping_control',
      input_profile: 'srt1_verification_bookkeeping_control'
    }
  });

  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  const selfIndexPath = path.join(ARTIFACTS_DIR, 'self_index_state.json');
  const ownershipPath = path.join(ARTIFACTS_DIR, 'ownership_attribution_report.json');
  writeJson(selfIndexPath, baselineSelfIndexArtifact);
  writeJson(ownershipPath, baselineOwnershipArtifact);

  const schemaErrors = [];
  validateRequiredFields(
    baselineSelfIndexArtifact,
    artifactSchema.artifacts['self_index_state.json'].minimum_fields,
    schemaErrors,
    'self_index_state.json'
  );
  validateRequiredFields(
    baselineOwnershipArtifact,
    artifactSchema.artifacts['ownership_attribution_report.json'].minimum_fields,
    schemaErrors,
    'ownership_attribution_report.json'
  );

  const behaviorErrors = [];
  assert(
    baselineSelfIndexArtifact.selected_index === 'locus_alpha',
    'baseline self-index must select locus_alpha',
    behaviorErrors
  );
  assert(
    baselineSelfIndexArtifact.ambiguity_flag === false,
    'baseline self-index must not be ambiguous',
    behaviorErrors
  );
  assert(
    labelSwapArtifact.selected_index === baselineSelfIndexArtifact.selected_index,
    'label-only swap control must not change selected_index',
    behaviorErrors
  );
  assert(
    labelSwapArtifact.ambiguity_flag === baselineSelfIndexArtifact.ambiguity_flag,
    'label-only swap control must preserve ambiguity outcome',
    behaviorErrors
  );

  const baselineSelfOwnedCount = baselineOwnershipArtifact.ownership_entries.filter(
    (entry) => entry.classification === 'self-owned'
  ).length;
  const baselineNonSelfCount = baselineOwnershipArtifact.ownership_entries.filter(
    (entry) => entry.classification === 'non-self/external'
  ).length;
  const bookkeepingEntry = baselineOwnershipArtifact.ownership_entries.find(
    (entry) => entry.entry_id === 'evt_bookkeeping_1'
  );
  const bookkeepingControlEntry = bookkeepingControlArtifact.ownership_entries[0];

  assert(
    baselineSelfOwnedCount >= 1,
    'baseline ownership must contain at least one self-owned entry',
    behaviorErrors
  );
  assert(
    baselineNonSelfCount >= 1,
    'baseline ownership must contain at least one non-self/external entry',
    behaviorErrors
  );
  assert(
    bookkeepingEntry?.classification === 'uncertain',
    'bookkeeping-like entry must not be promoted to self-owned in baseline run',
    behaviorErrors
  );
  assert(
    bookkeepingControlEntry?.classification === 'uncertain',
    'bookkeeping control must remain uncertain',
    behaviorErrors
  );
  assert(
    bookkeepingControlArtifact.warnings.some((warning) =>
      warning.includes('bookkeeping_like_rejected')
    ),
    'bookkeeping control must emit bookkeeping_like_rejected warning',
    behaviorErrors
  );

  const surfaceErrors = [];
  for (const artifactName of ['self_index_state.json', 'ownership_attribution_report.json']) {
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
        Array.isArray(policy.blocked_surfaces) && policy.blocked_surfaces.includes(blockedSurface),
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
  for (const payload of [baselineSelfIndexArtifact, baselineOwnershipArtifact]) {
    const serialized = JSON.stringify(payload);
    assert(
      !/subjectivity_(admissible|strong_support)/.test(serialized),
      `${payload.artifact_role} must not contain subjectivity gate status classes`,
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

  const protocolErrors = [];
  const implementedCoordinates = (protocol.coordinates || [])
    .filter((entry) => entry.status === 'implemented_internal_support_pre_comparator')
    .map((entry) => entry.id);
  assert(
    JSON.stringify(implementedCoordinates) === JSON.stringify(['SelfIndex', 'OwnershipField']),
    'protocol must mark SelfIndex and OwnershipField as the only implemented coordinates in SRT-1',
    protocolErrors
  );

  const ok =
    schemaErrors.length === 0 &&
    behaviorErrors.length === 0 &&
    surfaceErrors.length === 0 &&
    noClaimLeakErrors.length === 0 &&
    protocolErrors.length === 0;

  const payload = {
    artifact_role: 'subjectivity_selfindex_ownership_check',
    schema_version: '1.0.0',
    layer_id: 'subjectivity_runtime_layer.srt1',
    status: ok ? 'PASS' : 'FAIL',
    emitted_artifacts: [
      'artifacts/subjectivity/srt1/self_index_state.json',
      'artifacts/subjectivity/srt1/ownership_attribution_report.json'
    ],
    negative_controls: {
      label_only_swap_control: {
        expected_behavior: 'selected_index must remain invariant under display-label swap',
        actual_selected_index: labelSwapArtifact.selected_index,
        baseline_selected_index: baselineSelfIndexArtifact.selected_index
      },
      bookkeeping_control: {
        expected_behavior: 'bookkeeping-only ownership must remain uncertain',
        actual_classification: bookkeepingControlEntry?.classification || null
      }
    },
    schema_errors: schemaErrors,
    behavior_errors: behaviorErrors,
    surface_errors: surfaceErrors,
    claim_leak_errors: noClaimLeakErrors,
    protocol_errors: protocolErrors,
    interpretation_boundary:
      'SRT-1 verification only; confirms executable SelfIndex and Ownership artifacts with minimal negative controls, not subjectivity support, not external validation.'
  };

  const outputPath = path.join(ARTIFACTS_DIR, 'subjectivity_selfindex_ownership_check.json');
  writeJson(outputPath, payload);

  return { ok, outputPath, payload };
}

if (require.main === module) {
  verifySubjectivitySelfIndexOwnership()
    .then((result) => {
      if (!result.ok) {
        throw new Error(
          `Subjectivity self-index/ownership verification failed. See ${path.relative(ROOT, result.outputPath)}`
        );
      }
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    })
    .catch((error) => {
      console.error(`FAIL verify-subjectivity-selfindex-ownership: ${error.message}`);
      process.exit(1);
    });
}

module.exports = {
  verifySubjectivitySelfIndexOwnership
};

const fs = require('fs');
const path = require('path');

const {
  PROJECT_ROOT,
  EVALUATION_ROOT,
  ensureDir,
  readJson,
  writeJson,
  copyFile,
  toProjectRelative,
  createSeededRandom,
  loadDefinitions,
  buildRunEvaluationMetricsArtifact,
  buildConditionEvaluationSummaryArtifact,
  buildConditionComparisonReportArtifact
} = require('./evaluation-phase-common.cjs');
const { verifyArtifacts } = require('./verify-artifacts.cjs');

const parseArg = (name, fallback = null) => {
  const hit = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const parseListArg = (name, fallback = []) => {
  const raw = parseArg(name, null);
  if (!raw) return fallback;
  const values = String(raw)
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value));
  return values.length > 0 ? values : fallback;
};

const makeSample = ({ jobId, entropyFloat01, nowMs, ttlMs = 60000, source = 'custom_entropy_api' }) => ({
  source,
  jobId,
  timestampMs: nowMs,
  receivedAtMs: nowMs,
  ttlMs,
  entropyBits: entropyFloat01 >= 0.5 ? '10101010101010101010101010101010' : '01010101010101010101010101010101',
  entropyFloat01,
  quality: {
    valid: true,
    bitBalance: 0.5,
    shots: 2048
  }
});

const buildSeededSequence = ({ seed, prefix, startMs, count = 3, source = 'custom_entropy_api' }) => {
  const nextRandom = createSeededRandom(seed);
  const samples = [];
  for (let index = 0; index < count; index += 1) {
    const raw = 0.15 + (nextRandom() * 0.7);
    samples.push(makeSample({
      jobId: `${prefix}_${seed}_${index + 1}`,
      entropyFloat01: raw,
      nowMs: startMs + index,
      source
    }));
  }
  return samples;
};

const fetchFromSequence = (sequence, tracker) => async () => {
  tracker.calls += 1;
  const sample = sequence[(tracker.calls - 1) % sequence.length];
  return {
    ok: true,
    json: async () => ({
      mode: 'upstream_quantum',
      sample
    })
  };
};

const buildRunId = ({ conditionId, seed, replicateIndex }) => `${conditionId}_seed_${seed}_rep_${replicateIndex}`;

const buildConditionConfig = ({ conditionId, seed, replaySequence }) => {
  switch (conditionId) {
    case 'baseline':
      return { mode: 'baseline' };
    case 'replay':
      return {
        mode: 'replay',
        seed,
        replaySourceId: 'protocol_replay_fixture_v1',
        replaySequence
      };
    case 'shuffled':
      return {
        mode: 'shuffled',
        seed,
        replaySourceId: 'protocol_shuffled_fixture_v1',
        replaySequence
      };
    case 'prng_only':
      return {
        mode: 'prng_only',
        seed
      };
    case 'delayed_entropy':
      return {
        mode: 'delayed_entropy',
        seed,
        delayMs: 60
      };
    case 'dropout':
      return {
        mode: 'dropout',
        seed,
        dropoutRate: 1
      };
    default:
      throw new Error(`Unsupported protocol condition: ${conditionId}`);
  }
};

const summarizeConditionAssertions = (runEvaluationArtifact) => Object.fromEntries(
  Object.entries(runEvaluationArtifact.condition_assertions || {}).map(([key, value]) => [
    key,
    value?.passed === true
  ])
);

async function runProtocolizedEvaluation({
  batchId: explicitBatchId = null,
  outputRoot: explicitOutputRoot = null,
  seedSchedule: explicitSeedSchedule = null
} = {}) {
  const { protocol, comparisonMatrix, metricsRegistry, statisticalPolicy } = loadDefinitions();
  const frozenCandidateManifestPath = path.join(PROJECT_ROOT, 'artifacts', 'ecosystem_release_candidate', 'ecosystem_release_candidate_manifest.json');
  const frozenVerificationMatrixPath = path.join(PROJECT_ROOT, 'artifacts', 'ecosystem_release_candidate', 'ecosystem_verification_matrix.json');
  if (!fs.existsSync(frozenCandidateManifestPath) || !fs.existsSync(frozenVerificationMatrixPath)) {
    throw new Error('Frozen ecosystem candidate manifests are missing. Run ecosystem candidate generation before protocolized evaluation.');
  }
  const frozenCandidate = readJson(frozenCandidateManifestPath);
  const immutableFrozenCandidateManifestPath = typeof frozenCandidate.bundle_id === 'string' && frozenCandidate.bundle_id.trim().length > 0
    ? path.join(
      PROJECT_ROOT,
      'artifacts',
      'ecosystem_release_candidate',
      'bundles',
      frozenCandidate.bundle_id,
      'ecosystem_release_candidate_manifest.json'
    )
    : frozenCandidateManifestPath;
  const frozenCandidateManifestRef = toProjectRelative(
    fs.existsSync(immutableFrozenCandidateManifestPath) ? immutableFrozenCandidateManifestPath : frozenCandidateManifestPath
  );
  const frozenVerificationMatrix = readJson(frozenVerificationMatrixPath);
  if (frozenCandidate.candidate_status !== 'PASS' || frozenVerificationMatrix.status !== 'PASS') {
    throw new Error(`Frozen ecosystem baseline required before evaluation. current candidate status=${frozenCandidate.candidate_status}, verification status=${frozenVerificationMatrix.status}.`);
  }

  const generatedAt = new Date().toISOString();
  const batchId = explicitBatchId || parseArg('batch-id', `protocolized_evaluation_${generatedAt.replace(/[:.]/g, '-')}`);
  const batchRoot = path.resolve(explicitOutputRoot || parseArg('output-root', path.join(EVALUATION_ROOT, 'batches', batchId)));
  const runsRoot = path.join(batchRoot, 'artifacts');
  const aggregateRoot = path.join(batchRoot, 'aggregate');
  const seedSchedule = Array.isArray(explicitSeedSchedule) && explicitSeedSchedule.length > 0
    ? explicitSeedSchedule
    : parseListArg('seed-schedule', protocol.canonical_seed_schedule);
  const effectiveRunsPerCondition = seedSchedule.length;
  if (effectiveRunsPerCondition < protocol.minimum_runs_per_condition) {
    throw new Error(`Seed schedule too small for protocol minimum. received=${effectiveRunsPerCondition}, minimum=${protocol.minimum_runs_per_condition}`);
  }
  ensureDir(runsRoot);
  ensureDir(aggregateRoot);

  const {
    QuantumEntropyBridge
  } = await import('../src/simulation/QuantumEntropyBridge.js');
  const {
    ExperimentalEpisodeHarness
  } = await import('../src/experiments/ExperimentalEpisodeHarness.js');
  const {
    AdmissibilityEngine
  } = await import('../src/experiments/AdmissibilityEngine.js');
  const {
    buildConditionMetricsArtifacts
  } = await import('../src/experiments/EntropyConditionMetrics.js');
  const {
    buildConditionSupportLabelsArtifact
  } = await import('../src/experiments/OutputSupportLabels.js');
  const {
    buildConditionOutputConsumptionPolicyArtifact
  } = await import('../src/experiments/OutputConsumptionPolicy.js');
  const {
    buildConditionOutputSurfacePolicyArtifact
  } = await import('../src/experiments/OutputSurfacePolicy.js');
  const {
    buildConditionControlledStatementsArtifact
  } = await import('../src/experiments/ControlledStatements.js');
  const {
    buildLocalReportForSurface
  } = await import('../src/experiments/OutputSurfaceEnforcer.js');

  const schemaPath = path.join(PROJECT_ROOT, 'src', 'experiments', 'schemas', 'run_record.v1.json');
  const engine = new AdmissibilityEngine({ capP95Ms: 50, hardCapMs: 100 });

  const makeHarness = async ({ runId, seed }) => {
    const harness = new ExperimentalEpisodeHarness({
      runMeta: {
        runId,
        seed,
        versionHash: 'protocolized_evaluation_phase_v1',
        configHash: 'protocolized_evaluation_cfg_v1',
        deterministic: true,
        sensorsMode: 'mock'
      },
      schemaPath,
      baseDir: batchRoot
    });
    await harness.initRun();
    return harness;
  };

  const emitTick = async ({ harness, tick, entropyMode, entropySnapshot, seed, conditionIndex, replicateIndex }) => {
    const nextRandom = createSeededRandom((seed * 13) + (conditionIndex * 97) + (replicateIndex * 17) + tick + 1);
    const omegaBase = 1.0 + (conditionIndex * 0.01) + (replicateIndex * 0.001);
    const cccBase = 0.9 + (conditionIndex * 0.005) + (replicateIndex * 0.001);
    await harness.onTick({
      tick,
      t_ms: 42 + tick,
      versionHash: 'protocolized_evaluation_phase_v1',
      configHash: 'protocolized_evaluation_cfg_v1',
      metrics: {
        omega: omegaBase + (tick * 0.01),
        ccc: cccBase + (tick * 0.01),
        pmia: 0.5 + (nextRandom() * 0.03) + (tick * 0.01),
        stasis_index: 0.1 + (nextRandom() * 0.03) + (tick * 0.02)
      },
      render_trace_hash: `protocolized_trace_${tick}`,
      integrity: { event_present: false, C2_ok: null, echo_sig: null, nonce: null, requestId: null },
      intervention: { active: false, tag: null, params: null },
      sensors: { mode: 'mock', summary: {} },
      observability: {
        modules_active: ['ontological_core'],
        wm_pred_error: null,
        planner_cost: null,
        self_state_stub: {
          wm_enabled: true,
          planner_enabled: true,
          sensors_mode: 'mock',
          entropy_mode: entropyMode
        }
      },
      entropy: entropySnapshot
    });
  };

  const runConditionReplicate = async ({
    conditionId,
    conditionIndex,
    seed,
    replicateIndex,
    runStartMs
  }) => {
    const runId = buildRunId({ conditionId, seed, replicateIndex });
    const sampleBaseMs = Date.now();
    const replaySequence = buildSeededSequence({
      seed,
      prefix: conditionId === 'shuffled' ? 'protocol_shuffled' : 'protocol_replay',
      startMs: sampleBaseMs
    });
    const upstreamSequence = buildSeededSequence({
      seed: seed + 1000,
      prefix: 'protocol_upstream',
      startMs: sampleBaseMs
    });
    const conditionConfig = buildConditionConfig({ conditionId, seed, replaySequence });
    const bridge = new QuantumEntropyBridge({
      enabled: true,
      provider: 'custom',
      endpoint: 'http://localhost/mock',
      defaultTtlMs: 60000,
      requiredQualityMin: 0,
      logLevel: 'silent',
      experimentalCondition: conditionConfig
    });
    const harness = await makeHarness({ runId, seed });
    const fetchTracker = { calls: 0 };
    const fetchMock = fetchFromSequence(upstreamSequence, fetchTracker);

    if (conditionId === 'baseline' || conditionId === 'delayed_entropy' || conditionId === 'dropout') {
      bridge.setRuntimeRefillContext({ fetchImpl: fetchMock, endpoint: 'http://localhost/mock' });
      await bridge.refillFromProvider({
        fetchImpl: fetchMock,
        endpoint: 'http://localhost/mock',
        force: true,
        requestedChunks: protocol.tick_count_per_run
      });
    } else {
      await bridge.refillFromProvider({
        force: true,
        requestedChunks: protocol.tick_count_per_run
      });
    }

    const fallbackRandom = createSeededRandom(seed + (replicateIndex * 31) + (conditionIndex * 17));
    const selectionBaseMs = Date.now() + 5;
    for (let tick = 0; tick < protocol.tick_count_per_run; tick += 1) {
      const tickNowMs = selectionBaseMs + (tick * 20);
      const decision = bridge.selectEntropy(tickNowMs, 0.3 + (fallbackRandom() * 0.4));
      await emitTick({
        harness,
        tick,
        entropyMode: decision.mode,
        entropySnapshot: bridge.getForensicSnapshot(tickNowMs),
        seed,
        conditionIndex,
        replicateIndex
      });
    }

    const ended = await harness.endRun();
    const { verdict } = engine.evaluateRun({ artifactDir: ended.artifactDir });
    const runEvaluation = buildRunEvaluationMetricsArtifact({
      artifactDir: ended.artifactDir,
      metricsRegistry,
      protocol,
      conditionId,
      seed,
      replicateIndex
    });
    const entropyDiagnostics = readJson(path.join(ended.artifactDir, 'entropy_run_diagnostics.json'));
    const runMetrics = readJson(path.join(ended.artifactDir, 'run_metrics.json'));

    return {
      runId,
      artifactDir: ended.artifactDir,
      verdict,
      entropyDiagnostics,
      runMetrics,
      runEvaluation: runEvaluation.artifact,
      fetchCalls: fetchTracker.calls,
      conditionAssertions: summarizeConditionAssertions(runEvaluation.artifact)
    };
  };

  const runRecords = [];
  const baseNow = Date.now();
  let runCounter = 0;
  for (let conditionIndex = 0; conditionIndex < protocol.condition_order.length; conditionIndex += 1) {
    const conditionId = protocol.condition_order[conditionIndex];
    for (let replicateIndex = 0; replicateIndex < seedSchedule.length; replicateIndex += 1) {
      const seed = seedSchedule[replicateIndex];
      const runStartMs = baseNow + (runCounter * 1000);
      runCounter += 1;
      runRecords.push(await runConditionReplicate({
        conditionId,
        conditionIndex,
        seed,
        replicateIndex: replicateIndex + 1,
        runStartMs
      }));
    }
  }

  const metricsResult = buildConditionMetricsArtifacts({
    artifactsRoot: runsRoot,
    outputDir: aggregateRoot
  });
  const conditionSupport = buildConditionSupportLabelsArtifact({
    outputDir: aggregateRoot,
    conditionSummary: metricsResult.conditionSummary,
    comparison: metricsResult.comparison
  });
  const conditionConsumption = buildConditionOutputConsumptionPolicyArtifact({
    outputDir: aggregateRoot,
    conditionSummary: metricsResult.conditionSummary,
    comparison: metricsResult.comparison,
    conditionSupportLabels: conditionSupport.artifact
  });
  const conditionSurface = buildConditionOutputSurfacePolicyArtifact({
    outputDir: aggregateRoot,
    conditionSummary: metricsResult.conditionSummary,
    comparison: metricsResult.comparison,
    conditionSupportLabels: conditionSupport.artifact,
    conditionConsumptionPolicy: conditionConsumption.artifact
  });
  const conditionStatements = buildConditionControlledStatementsArtifact({
    outputDir: aggregateRoot,
    conditionSupportLabels: conditionSupport.artifact,
    conditionConsumptionPolicy: conditionConsumption.artifact,
    conditionSurfacePolicy: conditionSurface.artifact
  });
  const artifactVerification = await verifyArtifacts({
    artifactsRoot: aggregateRoot,
    scope: 'small_batch',
    outputPath: path.join(aggregateRoot, 'artifact_manifest.json')
  });
  if (!artifactVerification.ok) {
    throw new Error('Protocolized evaluation aggregate artifacts failed verification.');
  }
  const localReport = buildLocalReportForSurface({
    rootDir: aggregateRoot,
    scope: 'small_batch',
    outputPath: path.join(aggregateRoot, 'condition_local_report.json')
  });
  const conditionEvaluationSummary = buildConditionEvaluationSummaryArtifact({
    runsRoot,
    aggregateRoot,
    metricsRegistry,
    protocol
  });
  const conditionComparisonReport = buildConditionComparisonReportArtifact({
    aggregateRoot,
    conditionSummaryArtifact: conditionEvaluationSummary.artifact,
    groupedRuns: conditionEvaluationSummary.groupedRuns,
    comparisonMatrix,
    statisticalPolicy
  });

  const conditionStatuses = {};
  const warnings = [];
  const failures = [];
  for (const conditionId of protocol.condition_order) {
    const condition = conditionEvaluationSummary.artifact.conditions?.[conditionId];
    if (!condition) {
      failures.push(`missing_condition:${conditionId}`);
      continue;
    }
    const assertionFailures = Object.entries(condition.assertion_pass_rates || {})
      .filter(([, value]) => value.observed_count > 0 && value.pass_rate !== 1)
      .map(([key]) => key);
    const conditionStatus = {
      requested_run_count: effectiveRunsPerCondition,
      materialized_run_count: condition.materialized_run_count,
      included_run_count: condition.included_run_count,
      excluded_run_count: condition.excluded_run_count,
      sample_size_status: condition.sample_size_status,
      assertion_failures: assertionFailures
    };
    conditionStatuses[conditionId] = conditionStatus;
    if (condition.included_run_count < protocol.minimum_runs_per_condition) {
      failures.push(`insufficient_condition_n:${conditionId}`);
    } else if (condition.included_run_count < protocol.minimum_runs_per_condition_for_minimal_contrast) {
      warnings.push(`minimal_contrast_not_available:${conditionId}`);
    }
    if (assertionFailures.length > 0) {
      failures.push(`condition_assertion_failure:${conditionId}`);
    }
  }

  const comparisonStatuses = conditionComparisonReport.artifact.comparisons.map((entry) => {
    const matrixEntry = (comparisonMatrix.comparisons || []).find((item) => item.id === entry.id) || null;
    if (!matrixEntry) {
      failures.push(`comparison_not_in_matrix:${entry.id}`);
    } else if (matrixEntry.support_level === 'minimal_contrast' && entry.realized_support_level !== 'minimal_contrast') {
      warnings.push(`minimal_contrast_not_realized:${entry.id}`);
    } else if (matrixEntry.support_level === 'description_only' && entry.realized_support_level !== 'description_only') {
      failures.push(`description_only_mismatch:${entry.id}`);
    }
    return {
      id: entry.id,
      declared_support_level: entry.support_level_declared,
      realized_support_level: entry.realized_support_level,
      blocking_conditions: entry.blocking_conditions
    };
  });

  const batchStatus = failures.length > 0 ? 'FAIL' : warnings.length > 0 ? 'PASS_WITH_WARNINGS' : 'PASS';
  const blockedClaimFacingOutputs = [
    'run_evaluation_metrics.json',
    'condition_evaluation_summary.json',
    'condition_comparison_report.json',
    'evaluation_protocol_manifest.json',
    'evaluation_batch_report.json'
  ];

  const evaluationProtocolManifest = {
    artifact_role: 'evaluation_protocol_manifest',
    schema_version: '1.0.0',
    generated_at: generatedAt,
    batch_id: batchId,
    protocol_ref: 'docs/evaluation_protocol.v1.json',
    comparison_matrix_ref: 'docs/evaluation_comparison_matrix.v1.json',
    metrics_registry_ref: 'docs/evaluation_metrics_registry.v1.json',
    controls_registry_ref: 'docs/evaluation_controls_registry.v1.json',
    statistical_policy_ref: 'docs/evaluation_statistical_policy.v1.json',
    interpretation_boundary_ref: 'docs/EVALUATION_INTERPRETATION_BOUNDARY.md',
    ecosystem_candidate_manifest_ref: frozenCandidateManifestRef,
    ecosystem_candidate_status: frozenCandidate.candidate_status,
    baselines: {
      qicn_system: {
        branch: frozenCandidate.baselines.qicn_system.branch,
        head: frozenCandidate.baselines.qicn_system.head,
        upstream: frozenCandidate.baselines.qicn_system.upstream
      },
      qicn_release: {
        branch: frozenCandidate.baselines.qicn_release.branch,
        head: frozenCandidate.baselines.qicn_release.head,
        upstream: frozenCandidate.baselines.qicn_release.upstream,
        freeze_tag: frozenCandidate.baselines.qicn_release.canonical_freeze_tag,
        freeze_commit: frozenCandidate.baselines.qicn_release.canonical_freeze_commit,
        upstream_pin_status: frozenCandidate.baselines.qicn_release.upstream_pin_status
      }
    },
    batch_paths: {
      batch_root: toProjectRelative(batchRoot),
      runs_root: toProjectRelative(runsRoot),
      aggregate_root: toProjectRelative(aggregateRoot)
    },
    seed_schedule: seedSchedule,
    condition_order: protocol.condition_order,
    canonical_runs_per_condition: protocol.canonical_runs_per_condition,
    effective_runs_per_condition: effectiveRunsPerCondition,
    required_run_artifacts: protocol.required_run_artifacts,
    required_batch_artifacts: protocol.required_batch_artifacts,
    blocked_claim_facing_outputs: blockedClaimFacingOutputs,
    claim_facing_status: 'blocked',
    interpretation_boundary: 'Evaluation protocol manifest only; internal experimental coordination over a frozen ecosystem baseline, never external validation, never theory confirmation.'
  };

  const evaluationBatchReport = {
    artifact_role: 'evaluation_batch_report',
    schema_version: '1.0.0',
    generated_at: generatedAt,
    batch_id: batchId,
    status: batchStatus,
    warnings,
    failures,
    run_count: runRecords.length,
    condition_count: Object.keys(conditionStatuses).length,
    seed_schedule: seedSchedule,
    condition_statuses: conditionStatuses,
    comparison_statuses: comparisonStatuses,
    invalidates_batch_if: [
      'required_condition_missing',
      'included_run_count_below_minimum_runs_per_condition',
      'aggregate_artifact_verification_failed',
      'condition_assertion_failure'
    ],
    authoritative_run_exclusion_rules: protocol.exclusion_rules,
    source_artifacts: {
      condition_metrics_summary: 'condition_metrics_summary.json',
      condition_comparison: 'condition_comparison.json',
      condition_support_labels: 'condition_support_labels.json',
      artifact_manifest: 'artifact_manifest.json',
      condition_evaluation_summary: 'condition_evaluation_summary.json',
      condition_comparison_report: 'condition_comparison_report.json',
      condition_local_report: 'condition_local_report.json'
    },
    blocked_claim_facing_outputs: blockedClaimFacingOutputs,
    interpretation_boundary: 'Batch report only; descriptive internal evaluation status, never claim closure, never corpus validation, never theory confirmation.'
  };

  const protocolManifestPath = path.join(aggregateRoot, 'evaluation_protocol_manifest.json');
  const batchReportPath = path.join(aggregateRoot, 'evaluation_batch_report.json');
  writeJson(protocolManifestPath, evaluationProtocolManifest);
  writeJson(batchReportPath, evaluationBatchReport);

  const rootCopies = [
    ['evaluation_protocol_manifest.json', protocolManifestPath],
    ['evaluation_batch_report.json', batchReportPath],
    ['condition_evaluation_summary.json', path.join(aggregateRoot, 'condition_evaluation_summary.json')],
    ['condition_comparison_report.json', path.join(aggregateRoot, 'condition_comparison_report.json')],
    ['condition_metrics_summary.json', path.join(aggregateRoot, 'condition_metrics_summary.json')],
    ['condition_comparison.json', path.join(aggregateRoot, 'condition_comparison.json')],
    ['condition_support_labels.json', path.join(aggregateRoot, 'condition_support_labels.json')],
    ['condition_output_consumption_policy.json', path.join(aggregateRoot, 'condition_output_consumption_policy.json')],
    ['condition_output_surface_policy.json', path.join(aggregateRoot, 'condition_output_surface_policy.json')],
    ['condition_controlled_statements.json', path.join(aggregateRoot, 'condition_controlled_statements.json')],
    ['artifact_manifest.json', path.join(aggregateRoot, 'artifact_manifest.json')],
    ['condition_local_report.json', localReport.outputPath]
  ];
  for (const [fileName, sourcePath] of rootCopies) {
    copyFile(sourcePath, path.join(EVALUATION_ROOT, fileName));
  }

  writeJson(path.join(EVALUATION_ROOT, 'latest_batch_pointer.json'), {
    artifact_role: 'evaluation_latest_batch_pointer',
    batch_id: batchId,
    batch_root: toProjectRelative(batchRoot),
    aggregate_root: toProjectRelative(aggregateRoot),
    generated_at: generatedAt
  });

  const output = {
    artifact_role: 'protocolized_evaluation_run_result',
    batch_id: batchId,
    status: batchStatus,
    run_count: runRecords.length,
    batch_root: toProjectRelative(batchRoot),
    aggregate_root: toProjectRelative(aggregateRoot),
    protocol_manifest: toProjectRelative(protocolManifestPath),
    batch_report: toProjectRelative(batchReportPath)
  };
  return output;
}

if (require.main === module) {
  runProtocolizedEvaluation()
    .then((output) => {
      process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
    })
    .catch((error) => {
      console.error(`FAIL run-protocolized-evaluation: ${error.message}`);
      process.exit(1);
    });
}

module.exports = {
  runProtocolizedEvaluation
};

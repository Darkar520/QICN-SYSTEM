const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

const {
  PROJECT_ROOT,
  EVALUATION_ROOT,
  ensureDir,
  writeJson,
  readJson,
  loadDefinitions,
  buildRunEvaluationMetricsArtifact,
  buildConditionEvaluationSummaryArtifact,
  buildConditionComparisonReportArtifact
} = require('../scripts/evaluation-phase-common.cjs');
const { verifyEvaluationMetrics } = require('../scripts/verify-evaluation-metrics.cjs');
const { verifyEvaluationComparisons } = require('../scripts/verify-evaluation-comparisons.cjs');

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const metricDefaultsByCondition = (conditionId, seed, replicateIndex) => {
  const seedOffset = (seed % 1000) * 0.00001;
  const replicateOffset = replicateIndex * 0.0001;
  const base = {
    fallback_tick_ratio: 0,
    stale_tick_ratio: 0,
    degraded_tick_ratio: 0,
    pending_tick_ratio: 0,
    provider_error_burden: 0,
    buffer_exhaustion_burden: 0,
    entropy_latency_mean_ms: 0.25 + seedOffset + replicateOffset,
    entropy_latency_max_ms: 0.4 + seedOffset + replicateOffset,
    quantum_primary_ratio: 1,
    channel_clean_ratio: 1,
    omega_mean: 1.01 + seedOffset,
    ccc_mean: 0.91 + seedOffset,
    pmia_mean: 0.51 + seedOffset,
    stasis_index_mean: 0.11 + seedOffset,
    tick_budget_p95_ms: 42.5 + replicateOffset,
    tick_budget_max_ms: 43 + replicateOffset
  };

  if (conditionId === 'replay') {
    return {
      ...base,
      omega_mean: 1.005 + seedOffset
    };
  }
  if (conditionId === 'shuffled') {
    return {
      ...base,
      entropy_latency_mean_ms: 0.3 + seedOffset + replicateOffset
    };
  }
  if (conditionId === 'prng_only') {
    return {
      ...base,
      quantum_primary_ratio: 0,
      channel_clean_ratio: 1,
      omega_mean: 1.02,
      ccc_mean: 0.92,
      pmia_mean: 0.52,
      stasis_index_mean: 0.12
    };
  }
  if (conditionId === 'delayed_entropy') {
    return {
      ...base,
      entropy_latency_mean_ms: 60 + replicateIndex,
      entropy_latency_max_ms: 60.5 + replicateIndex,
      tick_budget_p95_ms: 55 + replicateIndex,
      tick_budget_max_ms: 58 + replicateIndex
    };
  }
  if (conditionId === 'dropout') {
    return {
      ...base,
      fallback_tick_ratio: 1,
      degraded_tick_ratio: 1,
      pending_tick_ratio: 0.3333333333333333,
      quantum_primary_ratio: 0,
      channel_clean_ratio: 0.6666666666666666
    };
  }
  return base;
};

const makeRunEvaluationArtifact = ({
  conditionId,
  seed,
  replicateIndex,
  exclusionCandidate = false
}) => {
  const numericValues = metricDefaultsByCondition(conditionId, seed, replicateIndex);
  return {
    artifact_role: 'run_evaluation_metrics',
    protocol_ref: 'docs/evaluation_protocol.v1.json',
    metrics_registry_ref: 'docs/evaluation_metrics_registry.v1.json',
    source_artifacts: {
      run_metrics: 'run_metrics.json',
      run_verdict: 'run_verdict.json',
      entropy_run_diagnostics: 'entropy_run_diagnostics.json',
      support_labels: 'support_labels.json'
    },
    run_id: `${conditionId}_seed_${seed}_rep_${replicateIndex}`,
    condition_id: conditionId,
    seed,
    replicate_index: replicateIndex,
    tick_count: 3,
    metric_values: {
      ...numericValues,
      run_verdict_status: exclusionCandidate ? 'DISCARDED' : 'ADMISSIBLE',
      entropy_run_level_status: exclusionCandidate ? 'invalid' : 'clean',
      invalidation_incidence: exclusionCandidate ? 1 : 0,
      support_label: 'under_evaluation'
    },
    condition_assertions: {
      mode_recorded: {
        supported: true,
        passed: true,
        observed: conditionId,
        expected: conditionId
      }
    },
    support_layer: {
      support_label: 'under_evaluation',
      closure_state: 'not_closed',
      validation_state: 'externally_unvalidated'
    },
    exclusion_candidate: exclusionCandidate,
    claim_facing_status: 'blocked',
    interpretation_boundary: 'Synthetic test evaluation artifact only; not claim-facing and not theory-facing.'
  };
};

const writeSyntheticRunArtifact = (runsRoot, runArtifact) => {
  const dir = path.join(runsRoot, runArtifact.run_id);
  ensureDir(dir);
  writeJson(path.join(dir, 'run_evaluation_metrics.json'), runArtifact);
};

const buildSyntheticBatchReport = ({
  protocol,
  comparisonMatrix,
  batchId,
  seedSchedule,
  summaryArtifact,
  comparisonArtifact,
  runCount
}) => {
  const conditionStatuses = {};
  const warnings = [];
  const failures = [];

  for (const conditionId of protocol.condition_order) {
    const condition = summaryArtifact.conditions?.[conditionId];
    if (!condition) {
      failures.push(`missing_condition:${conditionId}`);
      continue;
    }
    const assertionFailures = Object.entries(condition.assertion_pass_rates || {})
      .filter(([, value]) => value.observed_count > 0 && value.pass_rate !== 1)
      .map(([key]) => key);
    conditionStatuses[conditionId] = {
      requested_run_count: seedSchedule.length,
      materialized_run_count: condition.materialized_run_count,
      included_run_count: condition.included_run_count,
      excluded_run_count: condition.excluded_run_count,
      sample_size_status: condition.sample_size_status,
      assertion_failures: assertionFailures
    };
    if (condition.included_run_count < protocol.minimum_runs_per_condition) {
      failures.push(`insufficient_condition_n:${conditionId}`);
    } else if (condition.included_run_count < protocol.minimum_runs_per_condition_for_minimal_contrast) {
      warnings.push(`minimal_contrast_not_available:${conditionId}`);
    }
    if (assertionFailures.length > 0) {
      failures.push(`condition_assertion_failure:${conditionId}`);
    }
  }

  const comparisonStatuses = (comparisonArtifact.comparisons || []).map((entry) => {
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

  const status = failures.length > 0 ? 'FAIL' : warnings.length > 0 ? 'PASS_WITH_WARNINGS' : 'PASS';
  return {
    artifact_role: 'evaluation_batch_report',
    schema_version: '1.0.0',
    generated_at: new Date().toISOString(),
    batch_id: batchId,
    status,
    warnings,
    failures,
    run_count: runCount,
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
      condition_evaluation_summary: 'condition_evaluation_summary.json',
      condition_comparison_report: 'condition_comparison_report.json'
    },
    blocked_claim_facing_outputs: [
      'run_evaluation_metrics.json',
      'condition_evaluation_summary.json',
      'condition_comparison_report.json',
      'evaluation_protocol_manifest.json',
      'evaluation_batch_report.json'
    ],
    interpretation_boundary: 'Synthetic batch report for consolidation testing only.'
  };
};

const materializeSyntheticBatch = ({ rootDir, excludedByCondition = {} }) => {
  const {
    protocol,
    comparisonMatrix,
    metricsRegistry,
    statisticalPolicy
  } = loadDefinitions();
  ensureDir(rootDir);
  const runsRoot = path.join(rootDir, 'runs');
  ensureDir(runsRoot);
  const seedSchedule = [...protocol.canonical_seed_schedule];

  for (const conditionId of protocol.condition_order) {
    const excludedIndexes = new Set(excludedByCondition[conditionId] || []);
    seedSchedule.forEach((seed, index) => {
      writeSyntheticRunArtifact(runsRoot, makeRunEvaluationArtifact({
        conditionId,
        seed,
        replicateIndex: index + 1,
        exclusionCandidate: excludedIndexes.has(index + 1)
      }));
    });
  }

  writeJson(path.join(rootDir, 'condition_metrics_summary.json'), {
    artifact_role: 'small_batch_condition_summary_stub',
    interpretation_boundary: 'Synthetic summary stub for consolidation testing only.'
  });

  const summary = buildConditionEvaluationSummaryArtifact({
    runsRoot,
    aggregateRoot: rootDir,
    metricsRegistry,
    protocol
  });
  const comparison = buildConditionComparisonReportArtifact({
    aggregateRoot: rootDir,
    conditionSummaryArtifact: summary.artifact,
    groupedRuns: summary.groupedRuns,
    comparisonMatrix,
    statisticalPolicy
  });
  const batchId = `synthetic_batch_${path.basename(rootDir)}`;
  const batchReport = buildSyntheticBatchReport({
    protocol,
    comparisonMatrix,
    batchId,
    seedSchedule,
    summaryArtifact: summary.artifact,
    comparisonArtifact: comparison.artifact,
    runCount: protocol.condition_order.length * seedSchedule.length
  });

  writeJson(path.join(rootDir, 'evaluation_batch_report.json'), batchReport);
  writeJson(path.join(rootDir, 'evaluation_protocol_manifest.json'), {
    artifact_role: 'evaluation_protocol_manifest',
    batch_id: batchId,
    seed_schedule: seedSchedule,
    condition_order: protocol.condition_order,
    required_run_artifacts: protocol.required_run_artifacts,
    required_batch_artifacts: protocol.required_batch_artifacts
  });
  writeJson(path.join(rootDir, 'latest_batch_pointer.json'), {
    artifact_role: 'evaluation_latest_batch_pointer',
    batch_id: batchId,
    batch_root: '.',
    aggregate_root: '.',
    generated_at: new Date().toISOString()
  });

  return {
    protocol,
    comparisonMatrix,
    summary: summary.artifact,
    comparison: comparison.artifact,
    batchReport
  };
};

const makeSample = ({ jobId, entropyFloat01, nowMs, ttlMs = 60000 }) => ({
  source: 'custom_entropy_api',
  jobId,
  timestampMs: nowMs,
  receivedAtMs: nowMs,
  ttlMs,
  entropyBits: entropyFloat01 >= 0.5 ? '10101010101010101010101010101010' : '01010101010101010101010101010101',
  entropyFloat01,
  quality: { valid: true, bitBalance: 0.5, shots: 2048 }
});

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

const runSeededCondition = async ({
  QuantumEntropyBridge,
  ExperimentalEpisodeHarness,
  AdmissibilityEngine,
  schemaPath,
  baseDir,
  runId,
  conditionId,
  seed
}) => {
  const { protocol, metricsRegistry } = loadDefinitions();
  const baseNow = 1700000000000;
  const harness = new ExperimentalEpisodeHarness({
    runMeta: {
      runId,
      seed,
      versionHash: 'vhash_eval_consolidation',
      configHash: 'cfg_eval_consolidation',
      deterministic: true,
      sensorsMode: 'mock'
    },
    schemaPath,
    baseDir
  });
  await harness.initRun();

  const experimentalCondition = conditionId === 'prng_only'
    ? { mode: 'prng_only', seed }
    : { mode: 'baseline' };

  const bridge = new QuantumEntropyBridge({
    enabled: true,
    provider: 'custom',
    endpoint: 'http://localhost/mock',
    defaultTtlMs: 60000,
    requiredQualityMin: 0,
    logLevel: 'silent',
    experimentalCondition
  });

  if (conditionId === 'baseline') {
    const upstreamSequence = [
      makeSample({ jobId: `baseline_${seed}_a`, entropyFloat01: 0.31, nowMs: baseNow }),
      makeSample({ jobId: `baseline_${seed}_b`, entropyFloat01: 0.69, nowMs: baseNow + 1 }),
      makeSample({ jobId: `baseline_${seed}_c`, entropyFloat01: 0.47, nowMs: baseNow + 2 })
    ];
    const tracker = { calls: 0 };
    const fetchMock = fetchFromSequence(upstreamSequence, tracker);
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

  for (let tick = 0; tick < protocol.tick_count_per_run; tick += 1) {
    const nowMs = baseNow + (tick * 20);
    const decision = bridge.selectEntropy(nowMs, 0.37);
    await harness.onTick({
      tick,
      t_ms: 42 + tick,
      versionHash: 'vhash_eval_consolidation',
      configHash: 'cfg_eval_consolidation',
      metrics: {
        omega: 1.01 + (tick * 0.01),
        ccc: 0.91 + (tick * 0.01),
        pmia: 0.51 + (tick * 0.01),
        stasis_index: 0.11 + (tick * 0.01)
      },
      render_trace_hash: `trace_${tick}`,
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
          entropy_mode: decision.mode
        }
      },
      entropy: bridge.getForensicSnapshot(nowMs)
    });
  }

  const ended = await harness.endRun();
  new AdmissibilityEngine({ capP95Ms: 50, hardCapMs: 100 }).evaluateRun({ artifactDir: ended.artifactDir });
  return buildRunEvaluationMetricsArtifact({
    artifactDir: ended.artifactDir,
    metricsRegistry,
    protocol,
    conditionId,
    seed,
    replicateIndex: 1
  }).artifact;
};

(async () => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'protocolized-eval-consolidation-'));
  try {
    // A1: description_only path when valid exclusions reduce a condition below minimal contrast, not below batch minimum.
    const descriptionRoot = path.join(scratch, 'description_only_case');
    const descriptionCase = materializeSyntheticBatch({
      rootDir: descriptionRoot,
      excludedByCondition: {
        delayed_entropy: [3]
      }
    });
    const delayedComparison = descriptionCase.comparison.comparisons.find((entry) => entry.id === 'baseline_vs_delayed_entropy');
    assert(descriptionCase.summary.conditions.delayed_entropy.sample_size_status === 'description_only', 'A1 FAIL: delayed_entropy with one valid exclusion must degrade to description_only.');
    assert(delayedComparison.realized_support_level === 'description_only', 'A1 FAIL: baseline_vs_delayed_entropy must not emit minimal_contrast at n=2.');
    assert(descriptionCase.batchReport.status === 'PASS_WITH_WARNINGS', 'A1 FAIL: batch with n=2 condition should remain PASS_WITH_WARNINGS, not PASS.');
    const descriptionMetrics = verifyEvaluationMetrics({ rootDir: descriptionRoot });
    const descriptionMetricsCheck = readJson(path.join(descriptionRoot, 'evaluation_metrics_check.json'));
    assert(descriptionMetrics.status === 'PASS_WITH_WARNINGS', 'A1 FAIL: metrics verifier should pass with warnings for description_only case.');
    assert(descriptionMetricsCheck.status === 'PASS_WITH_WARNINGS', 'A1 FAIL: metrics verifier must report PASS_WITH_WARNINGS for description_only case.');
    const descriptionComparisons = verifyEvaluationComparisons({ rootDir: descriptionRoot });
    const descriptionComparisonCheck = readJson(path.join(descriptionRoot, 'evaluation_comparisons_check.json'));
    assert(descriptionComparisons.status === 'PASS_WITH_WARNINGS', 'A1 FAIL: comparison verifier should not fail on legitimate description_only degradation.');
    assert(descriptionComparisonCheck.status === 'PASS_WITH_WARNINGS', 'A1 FAIL: comparison verifier must report PASS_WITH_WARNINGS when minimal contrast is not realized.');

    // A1: unsupported path when valid exclusions reduce a condition below batch minimum.
    const unsupportedRoot = path.join(scratch, 'unsupported_case');
    const unsupportedCase = materializeSyntheticBatch({
      rootDir: unsupportedRoot,
      excludedByCondition: {
        dropout: [2, 3]
      }
    });
    const dropoutComparison = unsupportedCase.comparison.comparisons.find((entry) => entry.id === 'baseline_vs_dropout');
    assert(unsupportedCase.summary.conditions.dropout.sample_size_status === 'unsupported', 'A1 FAIL: dropout with included n=1 must be unsupported.');
    assert(dropoutComparison.realized_support_level === 'unsupported', 'A1 FAIL: baseline_vs_dropout must be unsupported when included n < 2.');
    assert(unsupportedCase.batchReport.status === 'FAIL', 'A1 FAIL: batch with included n below minimum must fail.');
    const unsupportedMetrics = verifyEvaluationMetrics({ rootDir: unsupportedRoot });
    const unsupportedMetricsCheck = readJson(path.join(unsupportedRoot, 'evaluation_metrics_check.json'));
    assert(unsupportedMetrics.status === 'FAIL', 'A1 FAIL: metrics verifier must fail when a condition drops below minimum batch n.');
    assert(unsupportedMetricsCheck.status === 'FAIL', 'A1 FAIL: metrics verifier status must be FAIL for unsupported batch case.');
    const unsupportedComparisons = verifyEvaluationComparisons({ rootDir: unsupportedRoot });
    const unsupportedComparisonCheck = readJson(path.join(unsupportedRoot, 'evaluation_comparisons_check.json'));
    assert(unsupportedComparisons.status === 'PASS_WITH_WARNINGS', 'A1 FAIL: comparison verifier should accept unsupported status when the batch limits are explicit.');
    assert(unsupportedComparisonCheck.status === 'PASS_WITH_WARNINGS', 'A1 FAIL: comparison verifier must downgrade to PASS_WITH_WARNINGS, not FAIL, for explicit insufficient-n blocking.');

    // A2/A4: supported comparisons only. Unsupported comparisons must fail if injected.
    const matrixIds = descriptionCase.comparisonMatrix.comparisons.map((entry) => entry.id).sort();
    const emittedIds = descriptionCase.comparison.comparisons.map((entry) => entry.id).sort();
    assert(JSON.stringify(matrixIds) === JSON.stringify(emittedIds), 'A2/A4 FAIL: comparison report must emit only matrix-declared supported comparisons.');
    assert(descriptionCase.comparison.unsupported_comparisons.some((entry) => entry.id === 'replay_vs_shuffled'), 'A2/A4 FAIL: unsupported comparisons must remain machine-readable in the report registry.');

    const tamperedReportPath = path.join(descriptionRoot, 'condition_comparison_report.json');
    const tamperedReport = readJson(tamperedReportPath);
    tamperedReport.comparisons.push({
      id: 'replay_vs_shuffled',
      baseline: 'replay',
      target: 'shuffled',
      comparison_type: 'inter_condition',
      support_level_declared: 'description_only',
      realized_support_level: 'description_only',
      minimum_n_per_condition_for_description: 2,
      minimum_n_per_condition_for_minimal_contrast: 999,
      baseline_included_n: 3,
      target_included_n: 3,
      blocking_conditions: [],
      primary_metrics: {},
      secondary_metrics: {},
      non_claim_boundary: 'Tampered unsupported comparison.'
    });
    writeJson(tamperedReportPath, tamperedReport);
    const tamperedVerification = verifyEvaluationComparisons({ rootDir: descriptionRoot });
    const tamperedCheck = readJson(path.join(descriptionRoot, 'evaluation_comparisons_check.json'));
    assert(tamperedVerification.status === 'FAIL', 'A2 FAIL: verifier must fail when an unsupported comparison is injected into the emitted report.');
    assert(tamperedCheck.status === 'FAIL', 'A2 FAIL: comparison verifier status must become FAIL for injected unsupported comparisons.');
    assert(tamperedCheck.failures.includes('unknown_comparisons_in_report'), 'A2 FAIL: injected unsupported comparison must be rejected as unknown_comparisons_in_report.');

    // A3: new evaluation artifacts must be blocked from claim-facing export surfaces.
    // This is a synthetic boundary test, independent of mutable latest pointers.
    const actualProtocolManifest = readJson(path.join(EVALUATION_ROOT, 'evaluation_protocol_manifest.json'));
    const sampleRunDir = fs.readdirSync(path.join(descriptionRoot, 'runs'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(descriptionRoot, 'runs', entry.name))[0];
    assert(sampleRunDir && fs.existsSync(path.join(sampleRunDir, 'run_evaluation_metrics.json')), 'A3 FAIL: synthetic batch must contain run evaluation metrics.');
    // Model an existing governed output plus ungoverned evaluation artifacts.
    // Separate output-policy tests verify generation of the full policy inventory.
    const policy = {
      governed_outputs: ['ordinary_report.json'],
      outputs: { 'ordinary_report.json': { allowed_surfaces: ['local_report_surface'] } }
    };
    for (const [dir, name] of [[sampleRunDir, 'output_surface_policy.json'], [descriptionRoot, 'condition_output_surface_policy.json']]) {
      writeJson(path.join(dir, name), policy);
      writeJson(path.join(dir, 'ordinary_report.json'), { artifact_role: 'synthetic_control' });
    }

    const blockedBatchArtifacts = [
      'condition_evaluation_summary.json',
      'condition_comparison_report.json',
      'evaluation_protocol_manifest.json',
      'evaluation_batch_report.json'
    ];
    for (const artifactName of ['run_evaluation_metrics.json', ...blockedBatchArtifacts]) {
      assert(actualProtocolManifest.blocked_claim_facing_outputs.includes(artifactName), `A3 FAIL: ${artifactName} must be listed as blocked_claim_facing_output in protocol manifest.`);
    }
    const {
      exportOutputForSurface,
      buildLocalReportForSurface
    } = await import(pathToFileURL(path.join(PROJECT_ROOT, 'src', 'experiments', 'OutputSurfaceEnforcer.js')).href);
    const claimBlockRoot = path.join(scratch, 'claim_block_exports');
    ensureDir(claimBlockRoot);
    const runEvalExport = exportOutputForSurface({
      rootDir: sampleRunDir,
      artifactName: 'run_evaluation_metrics.json',
      surface: 'claim_facing_blocked_surface',
      scope: 'run',
      outputDir: claimBlockRoot
    });
    assert(runEvalExport.ok === false, 'A3 FAIL: run_evaluation_metrics.json must not export to claim-facing surfaces.');
    assert(fs.existsSync(runEvalExport.decisionPath), 'A3 FAIL: run_evaluation_metrics.json blocked export must emit a machine-readable decision.');
    assert(runEvalExport.decision.reason_code === 'blocked_output_not_governed', 'A3 FAIL: run_evaluation_metrics.json must be refused as blocked_output_not_governed.');

    for (const artifactName of blockedBatchArtifacts) {
      const exportResult = exportOutputForSurface({
        rootDir: descriptionRoot,
        artifactName,
        surface: 'claim_facing_blocked_surface',
        scope: 'small_batch',
        outputDir: claimBlockRoot
      });
      assert(exportResult.ok === false, `A3 FAIL: ${artifactName} must not export to claim-facing surfaces.`);
      assert(fs.existsSync(exportResult.decisionPath), `A3 FAIL: ${artifactName} blocked export must emit a machine-readable decision.`);
      assert(exportResult.decision.reason_code === 'blocked_output_not_governed', `A3 FAIL: ${artifactName} must be refused as blocked_output_not_governed under claim-facing export.`);
    }
    const localReport = buildLocalReportForSurface({
      rootDir: descriptionRoot,
      scope: 'small_batch',
      outputPath: path.join(claimBlockRoot, 'local_report.json')
    });
    assert(localReport.artifact.included_outputs['ordinary_report.json'], 'A3 FAIL: positive control must be included.');
    for (const artifactName of blockedBatchArtifacts) {
      assert(!localReport.artifact.included_outputs[artifactName], `A3 FAIL: ${artifactName} must not appear in local_report included outputs.`);
    }

    // A5: minimum reproducibility by seed under deterministic synthetic control.
    const {
      QuantumEntropyBridge
    } = await import(pathToFileURL(path.join(PROJECT_ROOT, 'src', 'simulation', 'QuantumEntropyBridge.js')).href);
    const {
      ExperimentalEpisodeHarness
    } = await import(pathToFileURL(path.join(PROJECT_ROOT, 'src', 'experiments', 'ExperimentalEpisodeHarness.js')).href);
    const {
      AdmissibilityEngine
    } = await import(pathToFileURL(path.join(PROJECT_ROOT, 'src', 'experiments', 'AdmissibilityEngine.js')).href);
    const schemaPath = path.join(PROJECT_ROOT, 'src', 'experiments', 'schemas', 'run_record.v1.json');
    const reproducibilityRoot = path.join(scratch, 'reproducibility_case');
    ensureDir(reproducibilityRoot);
    const runA = await runSeededCondition({
      QuantumEntropyBridge,
      ExperimentalEpisodeHarness,
      AdmissibilityEngine,
      schemaPath,
      baseDir: reproducibilityRoot,
      runId: 'repro_prng_a',
      conditionId: 'prng_only',
      seed: 17057
    });
    const runB = await runSeededCondition({
      QuantumEntropyBridge,
      ExperimentalEpisodeHarness,
      AdmissibilityEngine,
      schemaPath,
      baseDir: reproducibilityRoot,
      runId: 'repro_prng_b',
      conditionId: 'prng_only',
      seed: 17057
    });
    assert(JSON.stringify(runA.metric_values) === JSON.stringify(runB.metric_values), 'A5 FAIL: same seeded prng_only condition must reproduce identical evaluation metric values.');
    assert(JSON.stringify(runA.condition_assertions) === JSON.stringify(runB.condition_assertions), 'A5 FAIL: same seeded prng_only condition must reproduce identical condition assertions.');
    assert(runA.exclusion_candidate === runB.exclusion_candidate, 'A5 FAIL: same seeded prng_only condition must reproduce the same exclusion candidate state.');

    console.log('ok protocolized-evaluation-consolidation.v1');
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error('fail protocolized-evaluation-consolidation.v1:', error.message);
  process.exit(1);
});

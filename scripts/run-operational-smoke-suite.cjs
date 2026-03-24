const fs = require('fs');
const os = require('os');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');

const stepResult = (label, ok, details = {}) => ({ label, ok, ...details });

const makeEntropySnapshot = ({ value, nowMs, requestId, jobId }) => ({
  enabled: true,
  provider: 'custom',
  experiment: {
    active: false,
    mode: 'baseline',
    seed: 17057,
    delayMs: 0,
    dropoutRate: 0,
    replayLength: 0,
    replaySourceId: null,
    interventionSurface: 'none'
  },
  config: {
    defaultTtlMs: 60000,
    bufferCapacityChunks: 4,
    lowWatermarkChunks: 1,
    refillTargetChunks: 3,
    allowProviderFallback: true
  },
  effectiveConnectionState: 'ok',
  effectiveMode: 'quantum_primary',
  effectiveReason: 'fresh_sample',
  lastConnectionState: 'ok',
  lastConnectionReason: 'connection_ok',
  lastError: '',
  bufferState: { occupancyChunks: 2, capacityChunks: 4, lowWatermarkChunks: 1, refillTargetChunks: 3 },
  channelHealth: { status: 'healthy', bufferExhaustions: 0, fallbackCount: 0, lastError: '' },
  counters: {
    consumedChunks: 1,
    providerErrors: 0,
    refillsStarted: 0,
    refillsCompleted: 0,
    pendingResponses: 0,
    reactiveRefillsScheduled: 0,
    fallbackSelections: 0,
    staleSelections: 0,
    rejectedSamples: 0
  },
  decisionProvenance: {
    provider: 'custom_entropy_api',
    requestId,
    requestUrl: 'http://localhost/mock',
    responseMode: 'upstream_quantum',
    fetchStartMs: nowMs - 5,
    fetchEndMs: nowMs,
    latencyMs: 5,
    insertTsMs: nowMs,
    receivedAtMs: nowMs,
    expiresAtMs: nowMs + 60000,
    ttlMs: 60000,
    byteCount: 32,
    fingerprint: `${jobId}_fingerprint`,
    fallbackUsed: false
  },
  lastDecision: {
    mode: 'quantum_primary',
    reason: 'fresh_sample',
    source: 'custom_entropy_api',
    timestampMs: nowMs,
    jobId,
    chunkId: `${jobId}_chunk`,
    entropyValue: value
  }
});

async function runOperationalSmokeSuite({
  projectRoot = PROJECT_ROOT,
  outputPath = path.join(projectRoot, 'artifacts', 'operational_smoke_manifest.json')
} = {}) {
  const repoRoot = path.resolve(projectRoot);
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'qicn-operational-smoke-'));
  const steps = [];

  try {
    const { ExperimentalEpisodeHarness } = await import('../src/experiments/ExperimentalEpisodeHarness.js');
    const { AdmissibilityEngine } = await import('../src/experiments/AdmissibilityEngine.js');
    const { buildConditionMetricsArtifacts } = await import('../src/experiments/EntropyConditionMetrics.js');
    const { buildConditionSupportLabelsArtifact } = await import('../src/experiments/OutputSupportLabels.js');
    const { buildConditionOutputConsumptionPolicyArtifact } = await import('../src/experiments/OutputConsumptionPolicy.js');
    const { buildConditionOutputSurfacePolicyArtifact } = await import('../src/experiments/OutputSurfacePolicy.js');
    const { buildConditionControlledStatementsArtifact } = await import('../src/experiments/ControlledStatements.js');
    const { verifyArtifacts } = require('./verify-artifacts.cjs');
    const { emitControlledStatementForSurface, exportOutputForSurface, buildLocalReportForSurface } = await import('../src/experiments/OutputSurfaceEnforcer.js');

    const schemaPath = path.join(repoRoot, 'src', 'experiments', 'schemas', 'run_record.v1.json');
    const makeHarness = async (runId) => {
      const harness = new ExperimentalEpisodeHarness({
        runMeta: {
          runId,
          seed: 17057,
          versionHash: 'smoke_vhash',
          configHash: 'smoke_cfg',
          deterministic: true,
          sensorsMode: 'mock'
        },
        schemaPath,
        baseDir: scratch
      });
      await harness.initRun();
      return harness;
    };

    const emitTick = async (harness, tick, entropySnapshot) => harness.onTick({
      tick,
      t_ms: 43,
      versionHash: 'smoke_vhash',
      configHash: 'smoke_cfg',
      metrics: {
        omega: 1.01 + tick * 0.01,
        ccc: 0.91 + tick * 0.01,
        pmia: 0.5,
        stasis_index: 0.1
      },
      render_trace_hash: `smoke_trace_${tick}`,
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
          entropy_mode: 'quantum_primary'
        }
      },
      entropy: entropySnapshot
    });

    const engine = new AdmissibilityEngine({ capP95Ms: 50, hardCapMs: 100 });
    const baseNow = Date.now();

    const runIds = ['operational_smoke_a', 'operational_smoke_b'];
    const runDirs = [];
    for (let index = 0; index < runIds.length; index++) {
      const runId = runIds[index];
      const harness = await makeHarness(runId);
      const entropySnapshot = makeEntropySnapshot({
        value: 0.61 + index * 0.07,
        nowMs: baseNow + index * 10,
        requestId: `smoke_req_${index}`,
        jobId: `smoke_job_${index}`
      });
      await emitTick(harness, 0, entropySnapshot);
      const ended = await harness.endRun();
      runDirs.push(ended.artifactDir);
      engine.evaluateRun({ artifactDir: ended.artifactDir });
      steps.push(stepResult(`run_${index + 1}_materialized`, true, { run_id: runId }));
    }

    const aggregateDir = path.join(scratch, 'aggregated');
    fs.mkdirSync(aggregateDir, { recursive: true });
    const metricsResult = buildConditionMetricsArtifacts({ artifactsRoot: scratch, outputDir: aggregateDir });
    const conditionSupport = buildConditionSupportLabelsArtifact({
      outputDir: aggregateDir,
      conditionSummary: metricsResult.conditionSummary,
      comparison: metricsResult.comparison
    });
    const conditionConsumption = buildConditionOutputConsumptionPolicyArtifact({
      outputDir: aggregateDir,
      conditionSummary: metricsResult.conditionSummary,
      comparison: metricsResult.comparison,
      conditionSupportLabels: conditionSupport.artifact
    });
    const conditionSurface = buildConditionOutputSurfacePolicyArtifact({
      outputDir: aggregateDir,
      conditionSummary: metricsResult.conditionSummary,
      comparison: metricsResult.comparison,
      conditionSupportLabels: conditionSupport.artifact,
      conditionConsumptionPolicy: conditionConsumption.artifact
    });
    const conditionStatements = buildConditionControlledStatementsArtifact({
      outputDir: aggregateDir,
      conditionSupportLabels: conditionSupport.artifact,
      conditionConsumptionPolicy: conditionConsumption.artifact,
      conditionSurfacePolicy: conditionSurface.artifact
    });
    steps.push(stepResult('small_batch_materialized', true, {
      summary_artifact: path.basename(metricsResult.summaryPath),
      comparison_artifact: path.basename(metricsResult.comparisonPath),
      support_labels_artifact: path.basename(conditionSupport.outputPath),
      surface_policy_artifact: path.basename(conditionSurface.outputPath),
      controlled_statements_artifact: path.basename(conditionStatements.outputPath)
    }));

    const artifactVerification = await verifyArtifacts({
      artifactsRoot: aggregateDir,
      scope: 'small_batch',
      outputPath: path.join(aggregateDir, 'artifact_manifest.json')
    });
    steps.push(stepResult('artifact_verification', artifactVerification.ok, { manifest_artifact: path.basename(artifactVerification.outputPath) }));
    if (!artifactVerification.ok) {
      throw new Error('Small-batch artifact verification failed inside operational smoke suite.');
    }

    const report = buildLocalReportForSurface({
      rootDir: aggregateDir,
      scope: 'small_batch',
      outputPath: path.join(aggregateDir, 'condition_local_report.json')
    });
    steps.push(stepResult('local_report', true, { report_artifact: path.basename(report.outputPath) }));

    const summaryExport = exportOutputForSurface({
      rootDir: aggregateDir,
      artifactName: 'condition_metrics_summary.json',
      surface: 'descriptive_export_surface',
      scope: 'small_batch',
      outputDir: path.join(aggregateDir, 'exports')
    });
    steps.push(stepResult('summary_export', summaryExport.ok, { decision_artifact: path.basename(summaryExport.decisionPath) }));
    if (!summaryExport.ok) {
      throw new Error('condition_metrics_summary export failed inside operational smoke suite.');
    }

    const statement = emitControlledStatementForSurface({
      rootDir: runDirs[0],
      surface: 'controlled_statement_surface',
      scope: 'run_level',
      outputDir: path.join(runDirs[0], 'smoke_statement')
    });
    steps.push(stepResult('controlled_statement', statement.ok, { decision_artifact: path.basename(statement.decisionPath) }));
    if (!statement.ok) {
      throw new Error('Controlled statement emission failed inside operational smoke suite.');
    }

    const manifest = {
      artifact_role: 'operational_smoke_manifest',
      project_root: '.',
      scratch_materialization: 'temporary_os_dir_not_persisted_in_manifest',
      run_ids: runIds,
      aggregate_artifacts: [
        'condition_metrics_summary.json',
        'condition_comparison.json',
        'condition_support_labels.json',
        'condition_output_consumption_policy.json',
        'condition_output_surface_policy.json',
        'condition_controlled_statements.json',
        'artifact_manifest.json',
        'condition_local_report.json'
      ],
      step_count: steps.length,
      steps,
      interpretation_boundary: 'Operational smoke suite only; verifies governed runtime/artifact flow, not external validation, not theory closure, not claim promotion.',
      non_claim_restrictions: [
        'Smoke success does not imply scientific closure.',
        'Smoke success does not imply causal confirmation.',
        'Smoke success does not imply external validation.'
      ]
    };

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    return { ok: true, outputPath, manifest };
  } catch (error) {
    const manifest = {
      artifact_role: 'operational_smoke_manifest',
      project_root: '.',
      scratch_materialization: 'temporary_os_dir_not_persisted_in_manifest',
      step_count: steps.length,
      steps,
      ok: false,
      failure: String(error.message || error),
      interpretation_boundary: 'Operational smoke failure manifest only; not claim semantics.'
    };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    throw error;
  }
}

if (require.main === module) {
  (async () => {
    try {
      const result = await runOperationalSmokeSuite();
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } catch (error) {
      console.error(`FAIL run-operational-smoke-suite: ${error.message}`);
      process.exit(1);
    }
  })();
}

module.exports = {
  runOperationalSmokeSuite
};

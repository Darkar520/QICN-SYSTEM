import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { QuantumEntropyBridge } from '../src/simulation/QuantumEntropyBridge.js';
import { ExperimentalEpisodeHarness } from '../src/experiments/ExperimentalEpisodeHarness.js';
import { AdmissibilityEngine } from '../src/experiments/AdmissibilityEngine.js';
import { assessOutputForSurface, exportOutputForSurface, emitControlledStatementForSurface, buildLocalReportForSurface } from '../src/experiments/OutputSurfaceEnforcer.js';
import { buildConditionSupportLabelsArtifact } from '../src/experiments/OutputSupportLabels.js';
import { buildConditionOutputConsumptionPolicyArtifact } from '../src/experiments/OutputConsumptionPolicy.js';
import { buildConditionOutputSurfacePolicyArtifact } from '../src/experiments/OutputSurfacePolicy.js';
import { buildConditionControlledStatementsArtifact } from '../src/experiments/ControlledStatements.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const makeSample = ({ jobId, entropyFloat01, nowMs, ttlMs = 60000 }) => ({
  source: 'custom_entropy_api',
  jobId,
  timestampMs: nowMs,
  receivedAtMs: nowMs,
  ttlMs,
  entropyBits: '10101010101010101010101010101010',
  entropyFloat01,
  quality: { valid: true, bitBalance: 0.5, shots: 2048 }
});

const makeHarness = async ({ baseDir, runId, configHash = 'cfg_enforcer' }) => {
  const harness = new ExperimentalEpisodeHarness({
    runMeta: {
      runId,
      seed: 17057,
      versionHash: 'vhash_enforcer',
      configHash,
      deterministic: true,
      sensorsMode: 'mock'
    },
    schemaPath: path.resolve(__dirname, '../src/experiments/schemas/run_record.v1.json'),
    baseDir
  });
  await harness.initRun();
  return harness;
};

const emitTick = async ({ harness, tick, entropyMode, entropySnapshot }) => {
  await harness.onTick({
    tick,
    t_ms: 42,
    versionHash: 'vhash_enforcer',
    configHash: 'cfg_enforcer',
    metrics: { omega: 1.0 + tick * 0.01, ccc: 0.9 + tick * 0.01, pmia: 0.5, stasis_index: 0.1 },
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
        entropy_mode: entropyMode
      }
    },
    entropy: entropySnapshot
  });
};

const evaluateRun = ({ artifactDir }) => new AdmissibilityEngine({ capP95Ms: 50, hardCapMs: 100 }).evaluateRun({ artifactDir }).verdict;

(async () => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'output-enforcer-v68-'));
  try {
    const baseNow = Date.now();

    const cleanBridge = new QuantumEntropyBridge({
      enabled: true,
      provider: 'custom',
      endpoint: 'http://localhost/mock',
      defaultTtlMs: 60000,
      requiredQualityMin: 0,
      logLevel: 'silent',
      experimentalCondition: { mode: 'baseline' }
    });
    const cleanHarness = await makeHarness({ baseDir: scratch, runId: 'enforcer_clean' });
    cleanBridge.ingestSample(
      makeSample({ jobId: 'enforcer-clean-1', entropyFloat01: 0.63, nowMs: baseNow }),
      baseNow,
      {
        provider: 'custom_entropy_api',
        requestId: 'req-enforcer-clean-1',
        requestUrl: 'http://localhost/mock',
        responseMode: 'upstream_quantum',
        fetchStartMs: baseNow - 5,
        fetchEndMs: baseNow,
        latencyMs: 5
      }
    );
    const cleanDecision = cleanBridge.selectEntropy(baseNow + 5, 0.41);
    await emitTick({ harness: cleanHarness, tick: 0, entropyMode: cleanDecision.mode, entropySnapshot: cleanBridge.getForensicSnapshot(baseNow + 5) });
    const cleanEnded = await cleanHarness.endRun();
    evaluateRun(cleanEnded);
    const cleanDir = cleanEnded.artifactDir;

    const invalidHarness = await makeHarness({ baseDir: scratch, runId: 'enforcer_invalid' });
    await emitTick({
      harness: invalidHarness,
      tick: 0,
      entropyMode: 'quantum_primary',
      entropySnapshot: {
        enabled: true,
        provider: 'custom',
        experiment: { active: false, mode: 'baseline', seed: 17057, delayMs: 0, dropoutRate: 0, replayLength: 0, replaySourceId: null, interventionSurface: 'none' },
        config: { defaultTtlMs: 60000, bufferCapacityChunks: 4, lowWatermarkChunks: 1, refillTargetChunks: 3, allowProviderFallback: true },
        effectiveConnectionState: 'ok',
        effectiveMode: 'quantum_primary',
        effectiveReason: 'fresh_sample',
        lastConnectionState: 'ok',
        lastConnectionReason: 'connection_ok',
        lastError: '',
        bufferState: { occupancyChunks: 2, capacityChunks: 4, lowWatermarkChunks: 1, refillTargetChunks: 3 },
        channelHealth: { status: 'healthy', bufferExhaustions: 0, fallbackCount: 0, lastError: '' },
        counters: { consumedChunks: 1, providerErrors: 0, refillsStarted: 0, refillsCompleted: 0, pendingResponses: 0, reactiveRefillsScheduled: 0, fallbackSelections: 0, staleSelections: 0, rejectedSamples: 0 },
        decisionProvenance: null,
        lastDecision: { mode: 'quantum_primary', reason: 'fresh_sample', source: 'custom_entropy_api', timestampMs: Date.now(), jobId: 'job-gap', chunkId: '', entropyValue: 0.77 }
      }
    });
    const invalidEnded = await invalidHarness.endRun();
    evaluateRun(invalidEnded);
    const invalidDir = invalidEnded.artifactDir;

    // CASE 1: internal consumer may read descriptive outputs via internal_debug_surface alias.
    {
      const assessment = assessOutputForSurface({
        rootDir: cleanDir,
        artifactName: 'run_metrics.json',
        surface: 'internal_debug_surface'
      });
      assert(assessment.ok === true, 'CASE 1 FAIL: internal_debug_surface must read run_metrics.json.');
      assert(assessment.decision.canonical_surface === 'developer_inspection_surface', 'CASE 1 FAIL: internal_debug_surface alias must resolve to developer_inspection_surface.');
    }

    // CASE 2: descriptive export surface may export bounded descriptive outputs.
    {
      const exportDir = path.join(scratch, 'run-export');
      const result = exportOutputForSurface({
        rootDir: cleanDir,
        artifactName: 'run_metrics.json',
        surface: 'descriptive_export_surface',
        outputDir: exportDir
      });
      assert(result.ok === true, 'CASE 2 FAIL: run_metrics export must succeed on descriptive_export_surface.');
      assert(fs.existsSync(result.outputPath), 'CASE 2 FAIL: exported run_metrics artifact missing.');
      assert(fs.existsSync(result.decisionPath), 'CASE 2 FAIL: export decision artifact missing.');
    }

    // CASE 3: export must be blocked when the boundary is missing.
    {
      const runMetricsPath = path.join(cleanDir, 'run_metrics.json');
      const runMetrics = JSON.parse(fs.readFileSync(runMetricsPath, 'utf8'));
      const originalBoundary = runMetrics.interpretation_boundary;
      delete runMetrics.interpretation_boundary;
      fs.writeFileSync(runMetricsPath, `${JSON.stringify(runMetrics, null, 2)}\n`, 'utf8');
      const result = exportOutputForSurface({
        rootDir: cleanDir,
        artifactName: 'run_metrics.json',
        surface: 'descriptive_export_surface',
        outputDir: path.join(scratch, 'blocked-export')
      });
      assert(result.ok === false, 'CASE 3 FAIL: export must be blocked when interpretation_boundary is removed.');
      assert(result.decision.reason_code === 'blocked_missing_boundary', 'CASE 3 FAIL: missing boundary must return blocked_missing_boundary.');
      assert(result.outputPath === null, 'CASE 3 FAIL: no artifact should be exported when boundary is missing.');
      runMetrics.interpretation_boundary = originalBoundary;
      fs.writeFileSync(runMetricsPath, `${JSON.stringify(runMetrics, null, 2)}\n`, 'utf8');
    }

    // CASE 4: support labels under evaluation must block export.
    {
      const result = exportOutputForSurface({
        rootDir: invalidDir,
        artifactName: 'support_labels.json',
        surface: 'descriptive_export_surface',
        outputDir: path.join(scratch, 'invalid-support-export')
      });
      assert(result.ok === false, 'CASE 4 FAIL: under_evaluation support label export must be blocked.');
      assert(result.decision.reason_code === 'blocked_under_evaluation_support', 'CASE 4 FAIL: support export must block with blocked_under_evaluation_support.');
    }

    // CASE 5: condition comparison must remain blocked for claim-facing export.
    {
      const conditionDir = path.join(scratch, 'condition-enforcer');
      fs.mkdirSync(conditionDir, { recursive: true });
      const conditionSummary = {
        artifact_role: 'small_batch_condition_summary',
        support_boundary_ref: 'condition_support_labels.json',
        consumption_policy_ref: 'condition_output_consumption_policy.json',
        surface_policy_ref: 'condition_output_surface_policy.json',
        interpretation_boundary: 'Small-batch descriptive summary only; not claim-safe and not externally validated.',
        conditions: {
          baseline: {
            run_count: 2,
            status_counts: { ADMISSIBLE: 2 },
            entropy_status_counts: { clean: 2 },
            interpretation_boundary: 'Small-batch descriptive summary only.'
          },
          delayed_entropy: {
            run_count: 2,
            status_counts: { ADMISSIBLE: 1, DISCARDED: 1 },
            entropy_status_counts: { degraded: 1, invalid: 1 },
            interpretation_boundary: 'Small-batch descriptive summary only.'
          }
        }
      };
      const comparison = {
        artifact_role: 'small_batch_condition_comparison',
        support_boundary_ref: 'condition_support_labels.json',
        consumption_policy_ref: 'condition_output_consumption_policy.json',
        surface_policy_ref: 'condition_output_surface_policy.json',
        interpretation_boundary: 'Small-batch descriptive comparison only; not causal confirmation, not claim closure, not external validation.',
        comparisons: [
          {
            condition: 'delayed_entropy',
            interpretation_boundary: 'Descriptive delta versus baseline only; no causal or theoretical claim.'
          }
        ]
      };
      fs.writeFileSync(path.join(conditionDir, 'condition_metrics_summary.json'), `${JSON.stringify(conditionSummary, null, 2)}\n`, 'utf8');
      fs.writeFileSync(path.join(conditionDir, 'condition_comparison.json'), `${JSON.stringify(comparison, null, 2)}\n`, 'utf8');
      const conditionSupport = buildConditionSupportLabelsArtifact({ outputDir: conditionDir, conditionSummary, comparison }).artifact;
      const conditionConsumption = buildConditionOutputConsumptionPolicyArtifact({
        outputDir: conditionDir,
        conditionSummary,
        comparison,
        conditionSupportLabels: conditionSupport
      }).artifact;
      const conditionSurface = buildConditionOutputSurfacePolicyArtifact({
        outputDir: conditionDir,
        conditionSummary,
        comparison,
        conditionSupportLabels: conditionSupport,
        conditionConsumptionPolicy: conditionConsumption
      }).artifact;
      buildConditionControlledStatementsArtifact({
        outputDir: conditionDir,
        conditionSupportLabels: conditionSupport,
        conditionConsumptionPolicy: conditionConsumption,
        conditionSurfacePolicy: conditionSurface
      });

      const result = exportOutputForSurface({
        rootDir: conditionDir,
        artifactName: 'condition_comparison.json',
        surface: 'claim_facing_blocked_surface',
        scope: 'small_batch',
        outputDir: path.join(scratch, 'condition-claim-export')
      });
      assert(result.ok === false, 'CASE 5 FAIL: condition comparison must be blocked on claim_facing_blocked_surface.');
      assert(result.decision.reason_code === 'blocked_claim_facing_output', 'CASE 5 FAIL: claim-facing condition comparison must block with blocked_claim_facing_output.');
    }

    // CASE 6: controlled statements are emitted only on the local controlled surface.
    {
      const result = emitControlledStatementForSurface({
        rootDir: cleanDir,
        surface: 'controlled_statement_surface',
        outputDir: path.join(scratch, 'statement-allowed')
      });
      assert(result.ok === true, 'CASE 6 FAIL: local descriptive controlled statement should be emitted on controlled_statement_surface.');
      assert(result.decision.statement.text === 'Repository-local descriptive support posture only.', 'CASE 6 FAIL: controlled statement wording must remain tightly constrained.');
      assert(fs.existsSync(result.decisionPath), 'CASE 6 FAIL: statement emission decision artifact missing.');
    }

    // CASE 7: strong wording/classes must be blocked explicitly.
    {
      const result = emitControlledStatementForSurface({
        rootDir: cleanDir,
        surface: 'controlled_statement_surface',
        outputDir: path.join(scratch, 'statement-blocked'),
        statementClass: 'framework_confirmation',
        requestedText: 'This validates the framework.'
      });
      assert(result.ok === false, 'CASE 7 FAIL: strong claim-facing controlled statement must be blocked.');
      assert(result.decision.reason_code === 'blocked_statement_class', 'CASE 7 FAIL: prohibited statement class must block with blocked_statement_class.');
    }

    // CASE 8: local report must include only allowed outputs and exclude blocked ones.
    {
      const report = buildLocalReportForSurface({
        rootDir: cleanDir,
        outputPath: path.join(scratch, 'local-report.json')
      });
      assert(fs.existsSync(report.outputPath), 'CASE 8 FAIL: local report artifact missing.');
      assert(report.artifact.included_outputs['run_metrics.json'], 'CASE 8 FAIL: local report must include run_metrics.json.');
      assert(report.artifact.included_outputs['support_labels.json'], 'CASE 8 FAIL: local report must include support_labels.json.');
      assert(report.artifact.blocked_outputs['entropy_preverdict.json'], 'CASE 8 FAIL: local report must exclude entropy_preverdict.json.');
      assert(report.artifact.blocked_outputs['entropy_preverdict.json'].reason_code === 'blocked_surface_not_allowed', 'CASE 8 FAIL: blocked pre-verdict output must report blocked_surface_not_allowed.');
    }

    console.log('ok output-surface-enforcer.v68');
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error('fail output-surface-enforcer.v68:', error.message);
  process.exit(1);
});

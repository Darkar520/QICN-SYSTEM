import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { QuantumEntropyBridge } from '../src/simulation/QuantumEntropyBridge.js';
import { ExperimentalEpisodeHarness } from '../src/experiments/ExperimentalEpisodeHarness.js';
import { AdmissibilityEngine } from '../src/experiments/AdmissibilityEngine.js';
import { buildRunOutputSurfacePolicyArtifact, buildConditionOutputSurfacePolicyArtifact } from '../src/experiments/OutputSurfacePolicy.js';
import { buildRunControlledStatementsArtifact, buildConditionControlledStatementsArtifact } from '../src/experiments/ControlledStatements.js';
import { buildConditionSupportLabelsArtifact } from '../src/experiments/OutputSupportLabels.js';
import { buildConditionOutputConsumptionPolicyArtifact } from '../src/experiments/OutputConsumptionPolicy.js';

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

const makeHarness = async ({ baseDir, runId, configHash = 'cfg_surface' }) => {
  const harness = new ExperimentalEpisodeHarness({
    runMeta: {
      runId,
      seed: 17057,
      versionHash: 'vhash_surface',
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
    versionHash: 'vhash_surface',
    configHash: 'cfg_surface',
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

const evaluateRun = ({ artifactDir }) => {
  const verdict = new AdmissibilityEngine({ capP95Ms: 50, hardCapMs: 100 }).evaluateRun({ artifactDir }).verdict;
  const surfacePolicy = JSON.parse(fs.readFileSync(path.join(artifactDir, 'output_surface_policy.json'), 'utf8'));
  const controlledStatements = JSON.parse(fs.readFileSync(path.join(artifactDir, 'controlled_statements.json'), 'utf8'));
  return { verdict, surfacePolicy, controlledStatements };
};

(async () => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'output-surface-v67-'));
  try {
    const baseNow = Date.now();

    // CASE 1: descriptive export surfaces, internal-only outputs, and controlled statements must remain separated.
    {
      const bridge = new QuantumEntropyBridge({
        enabled: true,
        provider: 'custom',
        endpoint: 'http://localhost/mock',
        defaultTtlMs: 60000,
        requiredQualityMin: 0,
        logLevel: 'silent',
        experimentalCondition: { mode: 'baseline' }
      });
      const harness = await makeHarness({ baseDir: scratch, runId: 'surface_clean' });
      bridge.ingestSample(
        makeSample({ jobId: 'surface-1', entropyFloat01: 0.61, nowMs: baseNow }),
        baseNow,
        {
          provider: 'custom_entropy_api',
          requestId: 'req-surface-1',
          requestUrl: 'http://localhost/mock',
          responseMode: 'upstream_quantum',
          fetchStartMs: baseNow - 4,
          fetchEndMs: baseNow,
          latencyMs: 4
        }
      );
      const decision = bridge.selectEntropy(baseNow + 2, 0.4);
      await emitTick({ harness, tick: 0, entropyMode: decision.mode, entropySnapshot: bridge.getForensicSnapshot(baseNow + 2) });
      const ended = await harness.endRun();
      const { verdict, surfacePolicy, controlledStatements } = evaluateRun(ended);
      const runMetrics = JSON.parse(fs.readFileSync(path.join(ended.artifactDir, 'run_metrics.json'), 'utf8'));
      const supportLabels = JSON.parse(fs.readFileSync(path.join(ended.artifactDir, 'support_labels.json'), 'utf8'));
      const preVerdict = JSON.parse(fs.readFileSync(path.join(ended.artifactDir, 'entropy_preverdict.json'), 'utf8'));

      assert(verdict.status === 'ADMISSIBLE', 'CASE 1 FAIL: clean run must remain admissible.');
      assert(runMetrics.surface_policy_ref === 'output_surface_policy.json', 'CASE 1 FAIL: run_metrics must carry surface_policy_ref.');
      assert(supportLabels.surface_policy_ref === 'output_surface_policy.json', 'CASE 1 FAIL: support_labels must carry surface_policy_ref.');
      assert(supportLabels.controlled_statements_ref === 'controlled_statements.json', 'CASE 1 FAIL: support_labels must carry controlled_statements_ref.');
      assert(preVerdict.surface_policy_ref === 'output_surface_policy.json', 'CASE 1 FAIL: entropy_preverdict must carry surface_policy_ref.');
      assert(surfacePolicy.outputs['run_metrics.json'].allowed_surfaces.includes('descriptive_export_surface'), 'CASE 1 FAIL: run_metrics must be allowed on descriptive_export_surface.');
      assert(surfacePolicy.outputs['run_metrics.json'].export_gate_status === 'local_export_with_boundary_only', 'CASE 1 FAIL: run_metrics export must stay local_export_with_boundary_only.');
      assert(surfacePolicy.outputs['run_metrics.json'].statement_gate_status === 'no_statement_authorized', 'CASE 1 FAIL: run_metrics must not authorize statements.');
      assert(surfacePolicy.outputs['entropy_preverdict.json'].allowed_surfaces.includes('internal_runtime_surface'), 'CASE 1 FAIL: entropy_preverdict must stay internal_runtime_only.');
      assert(!surfacePolicy.outputs['entropy_preverdict.json'].allowed_surfaces.includes('developer_inspection_surface'), 'CASE 1 FAIL: entropy_preverdict must not surface on developer_inspection_surface.');
      assert(surfacePolicy.outputs['support_labels.json'].allowed_surfaces.includes('controlled_statement_surface'), 'CASE 1 FAIL: support_labels must be allowed to feed controlled_statement_surface when internal support exists.');
      assert(controlledStatements.statement_gate_status === 'local_descriptive_statement_only', 'CASE 1 FAIL: run-level controlled statements must remain local_descriptive_statement_only.');
      assert(controlledStatements.emitted_statements.length === 1, 'CASE 1 FAIL: exactly one controlled statement should be emitted in the clean case.');
      assert(controlledStatements.emitted_statements[0].text === 'Repository-local descriptive support posture only.', 'CASE 1 FAIL: controlled statement wording must remain tightly constrained.');
      assert(controlledStatements.prohibited_statement_classes.includes('framework_confirmation'), 'CASE 1 FAIL: prohibited statement classes must include framework_confirmation.');
      const verdictArtifact = JSON.parse(fs.readFileSync(path.join(ended.artifactDir, 'run_verdict.json'), 'utf8'));
      assert(!('surface_policy_ref' in verdictArtifact), 'CASE 1 FAIL: run_verdict must not be contaminated with surface policy refs.');
    }

    // CASE 2: missing boundaries must block descriptive export surfaces.
    {
      const artifactDir = path.join(scratch, 'artifacts', 'surface_clean');
      const runMetricsPath = path.join(artifactDir, 'run_metrics.json');
      const runMetrics = JSON.parse(fs.readFileSync(runMetricsPath, 'utf8'));
      delete runMetrics.interpretation_boundary;
      fs.writeFileSync(runMetricsPath, `${JSON.stringify(runMetrics, null, 2)}\n`, 'utf8');
      const rebuilt = buildRunOutputSurfacePolicyArtifact({ artifactDir }).artifact;
      assert(rebuilt.outputs['run_metrics.json'].export_gate_status === 'blocked_missing_boundary', 'CASE 2 FAIL: missing interpretation boundary must block descriptive export.');
      assert(!rebuilt.outputs['run_metrics.json'].allowed_surfaces.includes('descriptive_export_surface'), 'CASE 2 FAIL: descriptive_export_surface must be removed when boundary is missing.');
      assert(rebuilt.outputs['run_metrics.json'].blocked_by.includes('required_boundary_missing'), 'CASE 2 FAIL: missing boundary must be explicit in blocked_by.');
    }

    // CASE 3: under_evaluation support labels must block controlled statements.
    {
      const harness = await makeHarness({ baseDir: scratch, runId: 'surface_invalid' });
      await emitTick({
        harness,
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
      const ended = await harness.endRun();
      const { verdict, surfacePolicy, controlledStatements } = evaluateRun(ended);

      assert(verdict.status === 'DISCARDED', 'CASE 3 FAIL: invalid run must remain discarded.');
      assert(surfacePolicy.outputs['support_labels.json'].statement_gate_status === 'blocked_under_evaluation', 'CASE 3 FAIL: under_evaluation support labels must block statements.');
      assert(!surfacePolicy.outputs['support_labels.json'].allowed_surfaces.includes('controlled_statement_surface'), 'CASE 3 FAIL: controlled_statement_surface must be blocked under under_evaluation.');
      assert(controlledStatements.statement_gate_status === 'blocked', 'CASE 3 FAIL: controlled statements must remain blocked under under_evaluation.');
      assert(controlledStatements.emitted_statements.length === 0, 'CASE 3 FAIL: no controlled statement should be emitted when support stays under_evaluation.');
      assert(controlledStatements.blocked_statements.some((entry) => entry.statement_class === 'local_descriptive_support_only'), 'CASE 3 FAIL: blocked local descriptive statement must be recorded explicitly.');
    }

    // CASE 4: condition summaries may stay descriptive, but comparisons remain blocked for export and statements.
    {
      const outputDir = path.join(scratch, 'condition-surface');
      fs.mkdirSync(outputDir, { recursive: true });
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

      const conditionSupport = buildConditionSupportLabelsArtifact({ outputDir, conditionSummary, comparison }).artifact;
      const conditionConsumption = buildConditionOutputConsumptionPolicyArtifact({
        outputDir,
        conditionSummary,
        comparison,
        conditionSupportLabels: conditionSupport
      }).artifact;
      const conditionSurface = buildConditionOutputSurfacePolicyArtifact({
        outputDir,
        conditionSummary,
        comparison,
        conditionSupportLabels: conditionSupport,
        conditionConsumptionPolicy: conditionConsumption
      }).artifact;
      const conditionStatements = buildConditionControlledStatementsArtifact({
        outputDir,
        conditionSupportLabels: conditionSupport,
        conditionConsumptionPolicy: conditionConsumption,
        conditionSurfacePolicy: conditionSurface
      }).artifact;

      assert(conditionSurface.outputs['condition_metrics_summary.json'].allowed_surfaces.includes('descriptive_export_surface'), 'CASE 4 FAIL: condition summary must stay descriptive-exportable with boundary.');
      assert(conditionSurface.outputs['condition_comparison.json'].export_gate_status === 'blocked_for_external_claiming', 'CASE 4 FAIL: condition comparison must remain blocked_for_external_claiming.');
      assert(conditionSurface.outputs['condition_comparison.json'].blocked_surfaces.includes('external_claim_facing_surface'), 'CASE 4 FAIL: condition comparison must remain blocked on external_claim_facing_surface.');
      assert(conditionSurface.outputs['condition_comparison.json'].blocked_surfaces.includes('descriptive_export_surface'), 'CASE 4 FAIL: condition comparison must remain blocked on descriptive_export_surface.');
      assert(conditionSurface.condition_level_access.delayed_entropy.statement_gate_status === 'blocked_under_evaluation', 'CASE 4 FAIL: delayed_entropy condition must block controlled statements.');
      assert(conditionSurface.condition_level_access.baseline.statement_gate_status === 'local_descriptive_statement_only', 'CASE 4 FAIL: baseline condition may permit only local descriptive controlled statements.');
      assert(conditionStatements.statement_gate_status === 'local_descriptive_statement_only', 'CASE 4 FAIL: condition controlled statements should remain locally descriptive only.');
      assert(conditionStatements.emitted_statements.length === 1, 'CASE 4 FAIL: only one condition-level controlled statement should be emitted.');
      assert(conditionStatements.emitted_statements[0].text.includes('Condition baseline'), 'CASE 4 FAIL: the emitted condition statement must remain condition-scoped and descriptive.');
      assert(conditionStatements.blocked_statements.some((entry) => entry.condition === 'delayed_entropy'), 'CASE 4 FAIL: blocked delayed_entropy statement must be recorded.');
      const conditionSupportArtifact = JSON.parse(fs.readFileSync(path.join(outputDir, 'condition_support_labels.json'), 'utf8'));
      assert(conditionSupportArtifact.surface_policy_ref === 'condition_output_surface_policy.json', 'CASE 4 FAIL: condition_support_labels must carry surface_policy_ref.');
      assert(conditionSupportArtifact.controlled_statements_ref === 'condition_controlled_statements.json', 'CASE 4 FAIL: condition_support_labels must carry controlled_statements_ref.');
    }

    console.log('ok output-surface-policy.v67');
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error('fail output-surface-policy.v67:', error.message);
  process.exit(1);
});

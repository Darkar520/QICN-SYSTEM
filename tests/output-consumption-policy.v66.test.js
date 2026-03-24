import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { QuantumEntropyBridge } from '../src/simulation/QuantumEntropyBridge.js';
import { ExperimentalEpisodeHarness } from '../src/experiments/ExperimentalEpisodeHarness.js';
import { AdmissibilityEngine } from '../src/experiments/AdmissibilityEngine.js';
import {
  buildRunOutputConsumptionPolicyArtifact,
  buildConditionOutputConsumptionPolicyArtifact
} from '../src/experiments/OutputConsumptionPolicy.js';
import { buildConditionSupportLabelsArtifact } from '../src/experiments/OutputSupportLabels.js';

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

const makeHarness = async ({ baseDir, runId, configHash = 'cfg_policy' }) => {
  const harness = new ExperimentalEpisodeHarness({
    runMeta: {
      runId,
      seed: 17057,
      versionHash: 'vhash_test',
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
    versionHash: 'vhash_test',
    configHash: 'cfg_policy',
    metrics: { omega: 1.0 + tick * 0.01, ccc: 0.91 + tick * 0.01, pmia: 0.5, stasis_index: 0.1 },
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
  const policy = JSON.parse(fs.readFileSync(path.join(artifactDir, 'output_consumption_policy.json'), 'utf8'));
  return { verdict, policy };
};

(async () => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'output-policy-v66-'));
  try {
    const baseNow = Date.now();

    // CASE 1: descriptive, diagnostic, and support outputs must be classified separately and remain claim-unsafe.
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
      const harness = await makeHarness({ baseDir: scratch, runId: 'policy_clean' });
      bridge.ingestSample(
        makeSample({ jobId: 'clean-1', entropyFloat01: 0.63, nowMs: baseNow }),
        baseNow,
        {
          provider: 'custom_entropy_api',
          requestId: 'req-clean-1',
          requestUrl: 'http://localhost/mock',
          responseMode: 'upstream_quantum',
          fetchStartMs: baseNow - 5,
          fetchEndMs: baseNow,
          latencyMs: 5
        }
      );
      const decision = bridge.selectEntropy(baseNow + 5, 0.41);
      await emitTick({ harness, tick: 0, entropyMode: decision.mode, entropySnapshot: bridge.getForensicSnapshot(baseNow + 5) });
      const ended = await harness.endRun();
      const { verdict, policy } = evaluateRun(ended);
      const runMetrics = JSON.parse(fs.readFileSync(path.join(ended.artifactDir, 'run_metrics.json'), 'utf8'));
      const support = JSON.parse(fs.readFileSync(path.join(ended.artifactDir, 'support_labels.json'), 'utf8'));

      assert(verdict.status === 'ADMISSIBLE', 'CASE 1 FAIL: clean fixture must remain admissible.');
      assert(policy.outputs['run_metrics.json'].consumption_class === 'descriptive_machine_readable', 'CASE 1 FAIL: run_metrics must remain descriptive_machine_readable.');
      assert(Array.isArray(policy.governed_outputs) && policy.governed_outputs.includes('run_metrics.json'), 'CASE 1 FAIL: governed_outputs must include run_metrics.json.');
      assert(policy.outputs['run_metrics.json'].boundary_ready === true, 'CASE 1 FAIL: run_metrics should be boundary-ready.');
      assert(policy.outputs['run_metrics.json'].human_facing_allowed === true, 'CASE 1 FAIL: run_metrics should be human-facing only with boundaries present.');
      assert(policy.outputs['run_metrics.json'].blocking_conditions.includes('external_validation_absent'), 'CASE 1 FAIL: run_metrics must remain blocked by external_validation_absent.');
      assert(policy.outputs['run_metrics.json'].claim_gate_status === 'claim_unsafe', 'CASE 1 FAIL: run_metrics claim_gate_status must remain claim_unsafe.');
      assert(policy.outputs['run_metrics.json'].allowed_consumption.includes('bounded_human_review'), 'CASE 1 FAIL: run_metrics must declare allowed descriptive consumption.');
      assert(policy.outputs['run_metrics.json'].blocked_consumption.includes('causal_confirmation'), 'CASE 1 FAIL: run_metrics must explicitly block causal_confirmation.');
      assert(policy.outputs['entropy_run_diagnostics.json'].claim_safety === 'claim_unsafe', 'CASE 1 FAIL: entropy diagnostics must remain claim_unsafe.');
      assert(policy.outputs['entropy_run_diagnostics.json'].blocking_conditions.includes('diagnostic_output_not_claim'), 'CASE 1 FAIL: entropy diagnostics must be blocked from claim use.');
      assert(policy.outputs['support_labels.json'].consumption_class === 'support_only_not_claim_safe', 'CASE 1 FAIL: support labels must stay support_only_not_claim_safe.');
      assert(policy.outputs['support_labels.json'].claim_facing_allowed === false, 'CASE 1 FAIL: support labels must not become claim-facing outputs.');
      assert(policy.outputs['support_labels.json'].support_statement_status === 'local_descriptive_support_only', 'CASE 1 FAIL: support labels must remain local_descriptive_support_only only.');
      assert(policy.validation_context.external_validation_present === false, 'CASE 1 FAIL: policy must record absence of external validation.');
      assert(policy.support_statement_policy.status === 'local_descriptive_support_only', 'CASE 1 FAIL: run support statement policy should remain local_descriptive_support_only.');
      assert(runMetrics.consumption_policy_ref === 'output_consumption_policy.json', 'CASE 1 FAIL: run_metrics must carry policy ref.');
      assert(support.consumption_policy_ref === 'output_consumption_policy.json', 'CASE 1 FAIL: support labels must carry policy ref.');
      const verdictArtifact = JSON.parse(fs.readFileSync(path.join(ended.artifactDir, 'run_verdict.json'), 'utf8'));
      assert(!('consumption_class' in verdictArtifact), 'CASE 1 FAIL: run_verdict must not collapse into consumption policy fields.');
      assert(!('support_label' in verdictArtifact), 'CASE 1 FAIL: run_verdict must remain separate from support labels.');
    }

    // CASE 2: if a descriptive output loses its boundary, human-facing consumption must be blocked.
    {
      const artifactDir = path.join(scratch, 'artifacts', 'policy_clean');
      const runMetricsPath = path.join(artifactDir, 'run_metrics.json');
      const runMetrics = JSON.parse(fs.readFileSync(runMetricsPath, 'utf8'));
      delete runMetrics.interpretation_boundary;
      fs.writeFileSync(runMetricsPath, `${JSON.stringify(runMetrics, null, 2)}\n`, 'utf8');
      const rebuilt = buildRunOutputConsumptionPolicyArtifact({ artifactDir }).artifact;
      assert(rebuilt.outputs['run_metrics.json'].boundary_ready === false, 'CASE 2 FAIL: missing interpretation boundary must clear boundary_ready.');
      assert(rebuilt.outputs['run_metrics.json'].human_facing_allowed === false, 'CASE 2 FAIL: missing interpretation boundary must block human-facing consumption.');
      assert(rebuilt.outputs['run_metrics.json'].blocking_conditions.includes('required_boundary_missing'), 'CASE 2 FAIL: missing interpretation boundary must produce required_boundary_missing.');
    }

    // CASE 3: under_evaluation support posture must block claim-facing export even if machine-readable output exists.
    {
      const harness = await makeHarness({ baseDir: scratch, runId: 'policy_invalid' });
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
      const { verdict, policy } = evaluateRun(ended);
      assert(verdict.status === 'DISCARDED', 'CASE 3 FAIL: invalid fixture must stay discarded.');
      assert(policy.outputs['support_labels.json'].export_policy === 'blocked_for_claim_facing_export', 'CASE 3 FAIL: under_evaluation support label must block claim-facing export.');
      assert(policy.outputs['support_labels.json'].blocking_conditions.includes('support_label_under_evaluation_blocks_claim_facing_export'), 'CASE 3 FAIL: under_evaluation support label must record explicit blocking.');
      assert(policy.outputs['support_labels.json'].support_statement_status === 'blocked', 'CASE 3 FAIL: under_evaluation support label must block support statements.');
      assert(policy.support_statement_policy.status === 'blocked', 'CASE 3 FAIL: run-level support statement policy must remain blocked under under_evaluation.');
    }

    // CASE 4: condition comparison must remain blocked for causal/external claiming while summary remains descriptive with boundaries.
    {
      const outputDir = path.join(scratch, 'condition-policy');
      fs.mkdirSync(outputDir, { recursive: true });
      const conditionSummary = {
        artifact_role: 'small_batch_condition_summary',
        support_boundary_ref: 'condition_support_labels.json',
        consumption_policy_ref: 'condition_output_consumption_policy.json',
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
        interpretation_boundary: 'Small-batch descriptive comparison only; not causal confirmation, not claim closure, not external validation.',
        comparisons: [
          {
            condition: 'delayed_entropy',
            interpretation_boundary: 'Descriptive delta versus baseline only; no causal or theoretical claim.'
          }
        ]
      };
      const conditionSupport = buildConditionSupportLabelsArtifact({
        outputDir,
        conditionSummary,
        comparison
      }).artifact;
      const conditionPolicy = buildConditionOutputConsumptionPolicyArtifact({
        outputDir,
        conditionSummary,
        comparison,
        conditionSupportLabels: conditionSupport
      }).artifact;

      assert(conditionPolicy.outputs['condition_metrics_summary.json'].consumption_class === 'descriptive_machine_readable', 'CASE 4 FAIL: condition summary must remain descriptive_machine_readable.');
      assert(conditionPolicy.outputs['condition_metrics_summary.json'].human_facing_allowed === true, 'CASE 4 FAIL: condition summary should be human-facing only with boundaries.');
      assert(conditionPolicy.outputs['condition_comparison.json'].consumption_class === 'blocked_for_external_claiming', 'CASE 4 FAIL: condition comparison must stay blocked_for_external_claiming.');
      assert(conditionPolicy.outputs['condition_comparison.json'].human_facing_allowed === false, 'CASE 4 FAIL: condition comparison must not be human-facing in this phase.');
      assert(conditionPolicy.outputs['condition_comparison.json'].blocking_conditions.includes('causal_read_blocked'), 'CASE 4 FAIL: condition comparison must record causal_read_blocked.');
      assert(conditionPolicy.outputs['condition_comparison.json'].blocked_consumption.includes('causal_confirmation'), 'CASE 4 FAIL: condition comparison must explicitly block causal_confirmation.');
      assert(conditionPolicy.condition_level_access.delayed_entropy.export_policy === 'blocked_for_claim_facing_export', 'CASE 4 FAIL: under_evaluation condition support must block claim-facing export.');
      assert(conditionPolicy.condition_level_access.baseline.claim_safety === 'support_only_not_claim_safe', 'CASE 4 FAIL: baseline condition support must remain support_only_not_claim_safe.');
      assert(conditionPolicy.outputs['condition_support_labels.json'].support_statement_status === 'local_descriptive_support_only', 'CASE 4 FAIL: condition support labels must stay local_descriptive_support_only only.');
      assert(conditionPolicy.support_statement_policy.status === 'local_descriptive_support_only', 'CASE 4 FAIL: condition support statement policy should stay locally descriptive only.');
      assert(conditionPolicy.validation_context.external_validation_present === false, 'CASE 4 FAIL: condition policy must record absent external validation.');
    }

    console.log('ok output-consumption-policy.v66');
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error('fail output-consumption-policy.v66:', error.message);
  process.exit(1);
});

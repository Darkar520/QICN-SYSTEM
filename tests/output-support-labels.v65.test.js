import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { QuantumEntropyBridge } from '../src/simulation/QuantumEntropyBridge.js';
import { ExperimentalEpisodeHarness } from '../src/experiments/ExperimentalEpisodeHarness.js';
import { AdmissibilityEngine } from '../src/experiments/AdmissibilityEngine.js';
import { buildConditionMetricsArtifacts } from '../src/experiments/EntropyConditionMetrics.js';
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

const makeHarness = async ({ baseDir, runId, configHash = 'cfg_support' }) => {
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
    configHash: 'cfg_support',
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

const finalize = ({ artifactDir }) => {
  const verdict = new AdmissibilityEngine({ capP95Ms: 50, hardCapMs: 100 }).evaluateRun({ artifactDir }).verdict;
  const support = JSON.parse(fs.readFileSync(path.join(artifactDir, 'support_labels.json'), 'utf8'));
  return { verdict, support };
};

(async () => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'support-labels-v65-'));
  try {
    const baseNow = Date.now();

    // CASE 1: admissible baseline run should emit internal_support_only but remain not_closed and externally_unvalidated.
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
      const harness = await makeHarness({ baseDir: scratch, runId: 'support_clean' });
      bridge.ingestSample(
        makeSample({ jobId: 'clean-1', entropyFloat01: 0.61, nowMs: baseNow }),
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
      const decision = bridge.selectEntropy(baseNow + 5, 0.4);
      await emitTick({ harness, tick: 0, entropyMode: decision.mode, entropySnapshot: bridge.getForensicSnapshot(baseNow + 5) });
      const ended = await harness.endRun();
      const { verdict, support } = finalize(ended);
      assert(verdict.status === 'ADMISSIBLE', 'CASE 1 FAIL: clean run must remain admissible.');
      assert(support.support_label === 'internal_support_only', 'CASE 1 FAIL: clean admissible run should emit internal_support_only.');
      assert(support.closure_state === 'not_closed', 'CASE 1 FAIL: clean run must remain not_closed.');
      assert(support.validation_state === 'externally_unvalidated', 'CASE 1 FAIL: clean run must remain externally_unvalidated.');
      assert(support.non_claim_boundaries.includes('No implica validacion externa.'), 'CASE 1 FAIL: non-claim boundary missing.');
    }

    // CASE 2: discarded run should remain under_evaluation and must not overemit internal_support_only.
    {
      const harness = await makeHarness({ baseDir: scratch, runId: 'support_invalid' });
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
      const { verdict, support } = finalize(ended);
      assert(verdict.status === 'DISCARDED', 'CASE 2 FAIL: provenance-gap run must be discarded.');
      assert(support.support_label === 'under_evaluation', 'CASE 2 FAIL: discarded run must stay under_evaluation.');
      assert(!support.label_reasons.includes('internal_runtime_evidence_only'), 'CASE 2 FAIL: under_evaluation run must not emit internal support reason.');
    }

    // CASE 3: condition-level support labels should stay internal_support_only + not_closed + externally_unvalidated.
    {
      const artifactsRoot = path.join(scratch, 'artifacts');
      const metricsArtifacts = buildConditionMetricsArtifacts({ artifactsRoot, outputDir: artifactsRoot });
      const conditionSupport = buildConditionSupportLabelsArtifact({
        outputDir: artifactsRoot,
        conditionSummary: metricsArtifacts.conditionSummary,
        comparison: metricsArtifacts.comparison
      }).artifact;
      assert(conditionSupport.conditions.baseline.support_label === 'internal_support_only', 'CASE 3 FAIL: baseline condition support label mismatch.');
      assert(conditionSupport.conditions.baseline.closure_state === 'not_closed', 'CASE 3 FAIL: baseline condition must remain not_closed.');
      assert(conditionSupport.conditions.baseline.validation_state === 'externally_unvalidated', 'CASE 3 FAIL: baseline condition must remain externally_unvalidated.');
      assert(conditionSupport.non_claim_boundaries.includes('No implica validacion externa.'), 'CASE 3 FAIL: condition-level non-claim boundary missing.');
    }

    // CASE 4: outputs must keep verdict and support label separate.
    {
      const supportPath = path.join(scratch, 'artifacts', 'support_clean', 'support_labels.json');
      const verdictPath = path.join(scratch, 'artifacts', 'support_clean', 'run_verdict.json');
      const support = JSON.parse(fs.readFileSync(supportPath, 'utf8'));
      const verdict = JSON.parse(fs.readFileSync(verdictPath, 'utf8'));
      assert(verdict.status === 'ADMISSIBLE', 'CASE 4 FAIL: verdict fixture mismatch.');
      assert(!('support_label' in verdict), 'CASE 4 FAIL: support label must not be collapsed into run_verdict.json.');
      assert(support.source_artifacts.run_verdict === 'run_verdict.json', 'CASE 4 FAIL: support label must reference verdict, not replace it.');
    }

    console.log('ok output-support-labels.v65');
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error('fail output-support-labels.v65:', error.message);
  process.exit(1);
});

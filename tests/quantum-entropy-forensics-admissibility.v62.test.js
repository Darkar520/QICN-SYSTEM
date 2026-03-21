import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { QuantumEntropyBridge } from '../src/simulation/QuantumEntropyBridge.js';
import { ExperimentalEpisodeHarness } from '../src/experiments/ExperimentalEpisodeHarness.js';
import { AdmissibilityEngine } from '../src/experiments/AdmissibilityEngine.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const makeSample = ({ jobId, entropyFloat01, nowMs, receivedAtMs = nowMs, ttlMs = 60000 }) => ({
  source: 'custom_entropy_api',
  jobId,
  timestampMs: nowMs,
  receivedAtMs,
  ttlMs,
  entropyBits: '10101010101010101010101010101010',
  entropyFloat01,
  quality: { valid: true, bitBalance: 0.5, shots: 2048 }
});

const makeHarness = async ({ baseDir, runId, configHash }) => {
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
    t_ms: 45,
    versionHash: 'vhash_test',
    configHash: 'cfg_entropy',
    metrics: { omega: 1.01 + (tick * 0.001), ccc: 0.99 },
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

(async () => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'entropy-forensics-v62-'));
  try {
    // CASE 1: nominal entropy provenance/freshness should produce pre-verdict artifact and clean run-level diagnostics
    {
      const bridge = new QuantumEntropyBridge({
        enabled: true,
        provider: 'custom',
        endpoint: 'http://localhost/mock',
        defaultTtlMs: 60000,
        requiredQualityMin: 0,
        logLevel: 'silent'
      });
      const harness = await makeHarness({ baseDir: scratch, runId: 'entropy_clean', configHash: 'cfg_entropy' });
      const baseNow = Date.now();
      for (let tick = 0; tick < 2; tick += 1) {
        const tickNow = baseNow + (tick * 50);
        bridge.ingestSample(
          makeSample({
            jobId: `job-clean-${tick}`,
            entropyFloat01: 0.61 + (tick * 0.05),
            nowMs: tickNow - 10
          }),
          tickNow - 5,
          {
            provider: 'custom_entropy_api',
            requestId: `req-clean-${tick}`,
            requestUrl: 'http://localhost/mock',
            responseMode: 'upstream_quantum',
            fetchStartMs: tickNow - 20,
            fetchEndMs: tickNow - 15,
            latencyMs: 5
          }
        );
        const decision = bridge.selectEntropy(tickNow, 0.4);
        await emitTick({
          harness,
          tick,
          entropyMode: decision.mode,
          entropySnapshot: bridge.getForensicSnapshot(tickNow)
        });
      }
      const ended = await harness.endRun();
      const artifactDir = ended.artifactDir;
      const preVerdict = JSON.parse(fs.readFileSync(path.join(artifactDir, 'entropy_preverdict.json'), 'utf8'));
      assert(preVerdict.status === 'PENDING_ENTROPY_RUN_LEVEL', 'CASE 1 FAIL: entropy pre-verdict artifact must be explicit.');
      assert(preVerdict.summary.quantum_primary_ticks === 2, 'CASE 1 FAIL: expected two primary entropy ticks.');
      assert(preVerdict.provenance.request_ids_observed === 2, 'CASE 1 FAIL: request IDs should be preserved in pre-verdict provenance.');
      const verdict = new AdmissibilityEngine({ capP95Ms: 50, hardCapMs: 100 }).evaluateRun({ artifactDir }).verdict;
      const diagnostics = JSON.parse(fs.readFileSync(path.join(artifactDir, 'entropy_run_diagnostics.json'), 'utf8'));
      assert(diagnostics.run_level_status === 'clean', 'CASE 1 FAIL: nominal entropy run diagnostics must be clean.');
      assert(verdict.status === 'ADMISSIBLE', 'CASE 1 FAIL: nominal entropy run should remain ADMISSIBLE.');
      assert(verdict.entropy?.status === 'clean', 'CASE 1 FAIL: run verdict should expose clean entropy status.');
    }

    // CASE 2: stale/provider-error/fallback should degrade diagnostics without forcing discard
    {
      const harness = await makeHarness({ baseDir: scratch, runId: 'entropy_degraded', configHash: 'cfg_entropy' });
      const baseNow = Date.now();
      await emitTick({
        harness,
        tick: 0,
        entropyMode: 'quantum_stale',
        entropySnapshot: {
          enabled: true,
          provider: 'custom',
          config: { defaultTtlMs: 1000, bufferCapacityChunks: 8, lowWatermarkChunks: 2, refillTargetChunks: 6, allowProviderFallback: true },
          effectiveConnectionState: 'stale',
          effectiveMode: 'quantum_stale',
          effectiveReason: 'expired_sample',
          lastConnectionState: 'ok',
          lastConnectionReason: 'sample_ingested',
          lastError: 'expired_sample',
          bufferState: { occupancyChunks: 0, capacityChunks: 8, lowWatermarkChunks: 2, refillTargetChunks: 6 },
          channelHealth: { status: 'stale', bufferExhaustions: 0, fallbackCount: 1, lastError: 'expired_sample' },
          counters: { providerErrors: 0, refillsStarted: 0, refillsCompleted: 0, pendingResponses: 0, reactiveRefillsScheduled: 0, fallbackSelections: 0, staleSelections: 1, consumedChunks: 0, rejectedSamples: 0 },
          decisionProvenance: null,
          lastDecision: { mode: 'quantum_stale', reason: 'expired_sample', source: 'deterministic_local', timestampMs: baseNow, jobId: 'job-stale', chunkId: '', entropyValue: 0.31 }
        }
      });

      const fallbackBridge = new QuantumEntropyBridge({
        enabled: true,
        provider: 'custom',
        endpoint: 'http://localhost/mock',
        defaultTtlMs: 60000,
        requiredQualityMin: 0,
        logLevel: 'silent'
      });
      fallbackBridge.reportBridgeFailure('provider_down', baseNow + 20);
      const fallbackDecision = fallbackBridge.selectEntropy(baseNow + 25, 0.29);
      await emitTick({
        harness,
        tick: 1,
        entropyMode: fallbackDecision.mode,
        entropySnapshot: fallbackBridge.getForensicSnapshot(baseNow + 25)
      });
      const ended = await harness.endRun();
      const artifactDir = ended.artifactDir;
      const preVerdict = JSON.parse(fs.readFileSync(path.join(artifactDir, 'entropy_preverdict.json'), 'utf8'));
      assert(preVerdict.summary.provider_error_count >= 1, 'CASE 2 FAIL: provider errors must be preserved in the pre-verdict artifact.');
      assert(preVerdict.summary.stale_ticks >= 1, 'CASE 2 FAIL: stale delivery must be reflected in the pre-verdict artifact.');
      assert(preVerdict.summary.fallback_ticks >= 1, 'CASE 2 FAIL: fallback delivery must be reflected in the pre-verdict artifact.');
      const verdict = new AdmissibilityEngine({ capP95Ms: 50, hardCapMs: 100 }).evaluateRun({ artifactDir }).verdict;
      const diagnostics = JSON.parse(fs.readFileSync(path.join(artifactDir, 'entropy_run_diagnostics.json'), 'utf8'));
      assert(diagnostics.run_level_status === 'degraded', 'CASE 2 FAIL: stale/provider-error/fallback should degrade entropy diagnostics.');
      assert(diagnostics.warnings.includes('ENTROPY_PROVIDER_ERROR_OBSERVED'), 'CASE 2 FAIL: provider error warning missing.');
      assert(diagnostics.warnings.includes('ENTROPY_FALLBACK_OBSERVED'), 'CASE 2 FAIL: fallback warning missing.');
      assert(diagnostics.warnings.includes('ENTROPY_STALE_OBSERVED'), 'CASE 2 FAIL: stale warning missing.');
      assert(verdict.status === 'ADMISSIBLE', 'CASE 2 FAIL: degraded entropy observations alone should not discard the run.');
      assert(verdict.entropy?.status === 'degraded', 'CASE 2 FAIL: run verdict should expose degraded entropy status.');
    }

    // CASE 3: missing provenance on quantum_primary should invalidate run-level entropy diagnostics and discard the run
    {
      const harness = await makeHarness({ baseDir: scratch, runId: 'entropy_invalid', configHash: 'cfg_entropy' });
      await emitTick({
        harness,
        tick: 0,
        entropyMode: 'quantum_primary',
        entropySnapshot: {
          enabled: true,
          provider: 'custom',
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
          lastDecision: { mode: 'quantum_primary', reason: 'fresh_sample', source: 'custom_entropy_api', timestampMs: Date.now(), jobId: 'job-missing-prov', chunkId: '', entropyValue: 0.77 }
        }
      });
      const ended = await harness.endRun();
      const artifactDir = ended.artifactDir;
      const verdict = new AdmissibilityEngine({ capP95Ms: 50, hardCapMs: 100 }).evaluateRun({ artifactDir }).verdict;
      const diagnostics = JSON.parse(fs.readFileSync(path.join(artifactDir, 'entropy_run_diagnostics.json'), 'utf8'));
      assert(diagnostics.run_level_status === 'invalid', 'CASE 3 FAIL: missing primary provenance must invalidate entropy run diagnostics.');
      assert(diagnostics.invalidating_reasons.includes('DSC_ENTROPY_PROVENANCE_GAP'), 'CASE 3 FAIL: missing provenance reason missing.');
      assert(verdict.status === 'DISCARDED', 'CASE 3 FAIL: entropy provenance gap must discard the run.');
      assert(verdict.reasons.includes('DSC_ENTROPY_PROVENANCE_GAP'), 'CASE 3 FAIL: run verdict should carry entropy provenance discard reason.');
    }

    console.log('ok quantum-entropy-forensics-admissibility.v62');
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error('fail quantum-entropy-forensics-admissibility.v62:', error.message);
  process.exit(1);
});

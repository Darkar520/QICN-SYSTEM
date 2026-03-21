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
    configHash: 'cfg_entropy_experiment',
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

const finalizeRun = ({ artifactDir }) => {
  const verdict = new AdmissibilityEngine({ capP95Ms: 50, hardCapMs: 100 }).evaluateRun({ artifactDir }).verdict;
  const entropyPreVerdict = JSON.parse(fs.readFileSync(path.join(artifactDir, 'entropy_preverdict.json'), 'utf8'));
  const entropyRunDiagnostics = JSON.parse(fs.readFileSync(path.join(artifactDir, 'entropy_run_diagnostics.json'), 'utf8'));
  return { verdict, entropyPreVerdict, entropyRunDiagnostics };
};

const makeFetchMockFromSequence = (sequence, tracker) => async () => {
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

(async () => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'entropy-experiments-v63-'));
  try {
    const baseNow = Date.now();

    // CASE 1: baseline/upstream_quantum
    {
      const fetchTracker = { calls: 0 };
      const sequence = [
        makeSample({ jobId: 'baseline-1', entropyFloat01: 0.21, nowMs: baseNow }),
        makeSample({ jobId: 'baseline-2', entropyFloat01: 0.79, nowMs: baseNow + 1 })
      ];
      const bridge = new QuantumEntropyBridge({
        enabled: true,
        provider: 'custom',
        endpoint: 'http://localhost/mock',
        defaultTtlMs: 60000,
        requiredQualityMin: 0,
        logLevel: 'silent'
      });
      const fetchMock = makeFetchMockFromSequence(sequence, fetchTracker);
      bridge.setRuntimeRefillContext({ fetchImpl: fetchMock, endpoint: 'http://localhost/mock' });
      const refill = await bridge.refillFromProvider({ fetchImpl: fetchMock, endpoint: 'http://localhost/mock', force: true, requestedChunks: 2 });
      assert(refill.acceptedChunks === 2, 'CASE 1 FAIL: baseline refill should ingest two upstream chunks.');
      const harness = await makeHarness({ baseDir: scratch, runId: 'exp_baseline', configHash: 'cfg_entropy_experiment' });
      const d1 = bridge.selectEntropy(baseNow + 10, 0.5);
      const d2 = bridge.selectEntropy(baseNow + 20, 0.5);
      await emitTick({ harness, tick: 0, entropyMode: d1.mode, entropySnapshot: bridge.getForensicSnapshot(baseNow + 10) });
      await emitTick({ harness, tick: 1, entropyMode: d2.mode, entropySnapshot: bridge.getForensicSnapshot(baseNow + 20) });
      const ended = await harness.endRun();
      const { entropyPreVerdict, entropyRunDiagnostics, verdict } = finalizeRun(ended);
      assert(entropyPreVerdict.experiment.last_condition.mode === 'baseline', 'CASE 1 FAIL: baseline condition must be recorded in entropy_preverdict.json.');
      assert(entropyRunDiagnostics.experiment.last_condition.mode === 'baseline', 'CASE 1 FAIL: baseline condition must persist to run diagnostics.');
      assert(verdict.entropy?.experiment?.last_condition?.mode === 'baseline', 'CASE 1 FAIL: baseline condition must propagate to run_verdict.json.');
      assert(fetchTracker.calls === 2, 'CASE 1 FAIL: baseline should use upstream provider requests.');
    }

    // CASE 2: replay control
    {
      const replaySequence = [
        makeSample({ jobId: 'replay-a', entropyFloat01: 0.12, nowMs: baseNow }),
        makeSample({ jobId: 'replay-b', entropyFloat01: 0.88, nowMs: baseNow + 1 })
      ];
      const bridge = new QuantumEntropyBridge({
        enabled: true,
        provider: 'custom',
        endpoint: 'http://localhost/mock',
        defaultTtlMs: 60000,
        requiredQualityMin: 0,
        logLevel: 'silent',
        experimentalCondition: {
          mode: 'replay',
          seed: 17057,
          replaySourceId: 'fixture_replay_v1',
          replaySequence
        }
      });
      const refill = await bridge.refillFromProvider({ force: true, requestedChunks: 2 });
      assert(refill.acceptedChunks === 2, 'CASE 2 FAIL: replay control should materialize replay chunks.');
      const d1 = bridge.selectEntropy(baseNow + 30, 0.5);
      const d2 = bridge.selectEntropy(baseNow + 40, 0.5);
      assert(Math.abs(d1.entropyValue - 0.12) < 1e-6, 'CASE 2 FAIL: replay control should re-inject the preserved sequence in order.');
      assert(Math.abs(d2.entropyValue - 0.88) < 1e-6, 'CASE 2 FAIL: replay control should preserve second replay sample.');
      const harness = await makeHarness({ baseDir: scratch, runId: 'exp_replay', configHash: 'cfg_entropy_experiment' });
      await emitTick({ harness, tick: 0, entropyMode: d1.mode, entropySnapshot: bridge.getForensicSnapshot(baseNow + 30) });
      await emitTick({ harness, tick: 1, entropyMode: d2.mode, entropySnapshot: bridge.getForensicSnapshot(baseNow + 40) });
      const ended = await harness.endRun();
      const { entropyPreVerdict } = finalizeRun(ended);
      assert(entropyPreVerdict.experiment.last_condition.mode === 'replay', 'CASE 2 FAIL: replay control must be recorded in artifacts.');
      assert(entropyPreVerdict.experiment.last_condition.replay_source_id === 'fixture_replay_v1', 'CASE 2 FAIL: replay source id must be preserved.');
    }

    // CASE 3: shuffled control
    {
      const shuffledSequence = [
        makeSample({ jobId: 'shuffled-a', entropyFloat01: 0.11, nowMs: baseNow }),
        makeSample({ jobId: 'shuffled-b', entropyFloat01: 0.22, nowMs: baseNow + 1 }),
        makeSample({ jobId: 'shuffled-c', entropyFloat01: 0.33, nowMs: baseNow + 2 })
      ];
      const buildBridge = () => new QuantumEntropyBridge({
        enabled: true,
        provider: 'custom',
        endpoint: 'http://localhost/mock',
        defaultTtlMs: 60000,
        requiredQualityMin: 0,
        logLevel: 'silent',
        experimentalCondition: {
          mode: 'shuffled',
          seed: 77,
          replaySourceId: 'fixture_shuffled_v1',
          replaySequence: shuffledSequence
        }
      });
      const bridgeA = buildBridge();
      const bridgeB = buildBridge();
      await bridgeA.refillFromProvider({ force: true, requestedChunks: 3 });
      await bridgeB.refillFromProvider({ force: true, requestedChunks: 3 });
      const valuesA = [
        bridgeA.selectEntropy(baseNow + 50, 0.5).entropyValue,
        bridgeA.selectEntropy(baseNow + 60, 0.5).entropyValue,
        bridgeA.selectEntropy(baseNow + 70, 0.5).entropyValue
      ];
      const valuesB = [
        bridgeB.selectEntropy(baseNow + 50, 0.5).entropyValue,
        bridgeB.selectEntropy(baseNow + 60, 0.5).entropyValue,
        bridgeB.selectEntropy(baseNow + 70, 0.5).entropyValue
      ];
      assert(valuesA.join(',') === valuesB.join(','), 'CASE 3 FAIL: shuffled control must be reproducible with fixed seed.');
      assert(valuesA.join(',') !== '0.11,0.22,0.33', 'CASE 3 FAIL: shuffled control must alter temporal order.');
      const harness = await makeHarness({ baseDir: scratch, runId: 'exp_shuffled', configHash: 'cfg_entropy_experiment' });
      await emitTick({ harness, tick: 0, entropyMode: 'quantum_primary', entropySnapshot: bridgeA.getForensicSnapshot(baseNow + 70) });
      const ended = await harness.endRun();
      const { entropyPreVerdict } = finalizeRun(ended);
      assert(entropyPreVerdict.experiment.last_condition.mode === 'shuffled', 'CASE 3 FAIL: shuffled control must be recorded in artifacts.');
    }

    // CASE 4: prng_only control
    {
      const buildBridge = () => new QuantumEntropyBridge({
        enabled: true,
        provider: 'custom',
        endpoint: 'http://localhost/mock',
        defaultTtlMs: 60000,
        requiredQualityMin: 0,
        logLevel: 'silent',
        experimentalCondition: {
          mode: 'prng_only',
          seed: 17057
        }
      });
      const bridgeA = buildBridge();
      const bridgeB = buildBridge();
      await bridgeA.refillFromProvider({ force: true, requestedChunks: 2 });
      await bridgeB.refillFromProvider({ force: true, requestedChunks: 2 });
      const valuesA = [
        bridgeA.selectEntropy(baseNow + 80, 0.5).entropyValue,
        bridgeA.selectEntropy(baseNow + 90, 0.5).entropyValue
      ];
      const valuesB = [
        bridgeB.selectEntropy(baseNow + 80, 0.5).entropyValue,
        bridgeB.selectEntropy(baseNow + 90, 0.5).entropyValue
      ];
      assert(valuesA.join(',') === valuesB.join(','), 'CASE 4 FAIL: prng_only control must be reproducible with fixed seed.');
      const harness = await makeHarness({ baseDir: scratch, runId: 'exp_prng', configHash: 'cfg_entropy_experiment' });
      await emitTick({ harness, tick: 0, entropyMode: 'quantum_primary', entropySnapshot: bridgeA.getForensicSnapshot(baseNow + 90) });
      const ended = await harness.endRun();
      const { entropyPreVerdict } = finalizeRun(ended);
      assert(entropyPreVerdict.experiment.last_condition.mode === 'prng_only', 'CASE 4 FAIL: prng_only control must be recorded in artifacts.');
    }

    // CASE 5: delayed_entropy control
    {
      const fetchTracker = { calls: 0 };
      const sequence = [
        makeSample({ jobId: 'delay-1', entropyFloat01: 0.41, nowMs: baseNow }),
        makeSample({ jobId: 'delay-2', entropyFloat01: 0.59, nowMs: baseNow + 1 })
      ];
      const bridge = new QuantumEntropyBridge({
        enabled: true,
        provider: 'custom',
        endpoint: 'http://localhost/mock',
        defaultTtlMs: 60000,
        requiredQualityMin: 0,
        logLevel: 'silent',
        experimentalCondition: {
          mode: 'delayed_entropy',
          seed: 17057,
          delayMs: 60
        }
      });
      const fetchMock = makeFetchMockFromSequence(sequence, fetchTracker);
      const startMs = Date.now();
      const refill = await bridge.refillFromProvider({ fetchImpl: fetchMock, endpoint: 'http://localhost/mock', force: true, requestedChunks: 2 });
      const elapsedMs = Date.now() - startMs;
      assert(refill.acceptedChunks === 2, 'CASE 5 FAIL: delayed_entropy should still ingest chunks.');
      assert(elapsedMs >= 50, 'CASE 5 FAIL: delayed_entropy should introduce observable delivery delay.');
      assert(bridge.getAuditTrail(20).events.some((entry) => entry.type === 'experimental_delay_applied'), 'CASE 5 FAIL: delayed entropy must be observable in event trail.');
      const harness = await makeHarness({ baseDir: scratch, runId: 'exp_delay', configHash: 'cfg_entropy_experiment' });
      await emitTick({ harness, tick: 0, entropyMode: 'quantum_primary', entropySnapshot: bridge.getForensicSnapshot(Date.now()) });
      const ended = await harness.endRun();
      const { entropyPreVerdict } = finalizeRun(ended);
      assert(entropyPreVerdict.experiment.last_condition.mode === 'delayed_entropy', 'CASE 5 FAIL: delayed_entropy must be recorded in artifacts.');
      assert(entropyPreVerdict.experiment.last_condition.delay_ms === 60, 'CASE 5 FAIL: delayed_entropy parameters must persist.');
    }

    // CASE 6: dropout control
    {
      const fetchTracker = { calls: 0 };
      const sequence = [
        makeSample({ jobId: 'drop-1', entropyFloat01: 0.61, nowMs: baseNow }),
        makeSample({ jobId: 'drop-2', entropyFloat01: 0.73, nowMs: baseNow + 1 })
      ];
      const bridge = new QuantumEntropyBridge({
        enabled: true,
        provider: 'custom',
        endpoint: 'http://localhost/mock',
        defaultTtlMs: 60000,
        requiredQualityMin: 0,
        logLevel: 'silent',
        experimentalCondition: {
          mode: 'dropout',
          seed: 17057,
          dropoutRate: 1
        }
      });
      const fetchMock = makeFetchMockFromSequence(sequence, fetchTracker);
      const refill = await bridge.refillFromProvider({ fetchImpl: fetchMock, endpoint: 'http://localhost/mock', force: true, requestedChunks: 2 });
      assert(refill.acceptedChunks === 0, 'CASE 6 FAIL: dropout control with rate 1 must prevent chunk ingestion.');
      const fallbackDecision = bridge.selectEntropy(Date.now(), 0.37);
      assert(fallbackDecision.mode === 'deterministic_fallback', 'CASE 6 FAIL: dropout control should surface deterministic fallback when the buffer stays empty.');
      assert(bridge.getAuditTrail(20).events.some((entry) => entry.type === 'experimental_dropout_applied'), 'CASE 6 FAIL: dropout control must be observable in event trail.');
      const harness = await makeHarness({ baseDir: scratch, runId: 'exp_dropout', configHash: 'cfg_entropy_experiment' });
      await emitTick({ harness, tick: 0, entropyMode: fallbackDecision.mode, entropySnapshot: bridge.getForensicSnapshot(Date.now()) });
      const ended = await harness.endRun();
      const { entropyPreVerdict, entropyRunDiagnostics, verdict } = finalizeRun(ended);
      assert(entropyPreVerdict.experiment.last_condition.mode === 'dropout', 'CASE 6 FAIL: dropout control must be recorded in pre-verdict artifacts.');
      assert(entropyRunDiagnostics.experiment.last_condition.mode === 'dropout', 'CASE 6 FAIL: dropout control must persist to run diagnostics.');
      assert(verdict.entropy?.experiment?.last_condition?.mode === 'dropout', 'CASE 6 FAIL: dropout control must propagate to run_verdict.json.');
    }

    console.log('ok quantum-entropy-experimental-controls.v63');
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error('fail quantum-entropy-experimental-controls.v63:', error.message);
  process.exit(1);
});

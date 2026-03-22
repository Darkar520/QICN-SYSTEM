import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { QuantumEntropyBridge } from '../src/simulation/QuantumEntropyBridge.js';
import { ExperimentalEpisodeHarness } from '../src/experiments/ExperimentalEpisodeHarness.js';
import { AdmissibilityEngine } from '../src/experiments/AdmissibilityEngine.js';
import { buildConditionMetricsArtifacts } from '../src/experiments/EntropyConditionMetrics.js';

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

const makeHarness = async ({ baseDir, runId }) => {
  const harness = new ExperimentalEpisodeHarness({
    runMeta: {
      runId,
      seed: 17057,
      versionHash: 'vhash_test',
      configHash: 'cfg_entropy_metrics',
      deterministic: true,
      sensorsMode: 'mock'
    },
    schemaPath: path.resolve(__dirname, '../src/experiments/schemas/run_record.v1.json'),
    baseDir
  });
  await harness.initRun();
  return harness;
};

const emitTick = async ({ harness, tick, entropyMode, entropySnapshot, omega, ccc }) => {
  await harness.onTick({
    tick,
    t_ms: 40 + tick,
    versionHash: 'vhash_test',
    configHash: 'cfg_entropy_metrics',
    metrics: { omega, ccc, pmia: 0.5 + tick * 0.01, stasis_index: 0.1 + tick * 0.02 },
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

const runCondition = async ({ baseDir, runId, condition, sequence, nowBase }) => {
  const bridge = new QuantumEntropyBridge({
    enabled: true,
    provider: 'custom',
    endpoint: 'http://localhost/mock',
    defaultTtlMs: 60000,
    requiredQualityMin: 0,
    logLevel: 'silent',
    experimentalCondition: condition
  });
  const harness = await makeHarness({ baseDir, runId });
  const fetchTracker = { calls: 0 };
  const fetchMock = fetchFromSequence(sequence, fetchTracker);

  if (condition.mode === 'baseline' || condition.mode === 'delayed_entropy' || condition.mode === 'dropout') {
    bridge.setRuntimeRefillContext({ fetchImpl: fetchMock, endpoint: 'http://localhost/mock' });
    await bridge.refillFromProvider({
      fetchImpl: fetchMock,
      endpoint: 'http://localhost/mock',
      force: true,
      requestedChunks: 3
    });
  } else {
    await bridge.refillFromProvider({ force: true, requestedChunks: 3 });
  }

  for (let tick = 0; tick < 3; tick += 1) {
    const decision = bridge.selectEntropy(nowBase + (tick * 20), 0.35);
    await emitTick({
      harness,
      tick,
      entropyMode: decision.mode,
      entropySnapshot: bridge.getForensicSnapshot(nowBase + (tick * 20)),
      omega: 1.0 + tick * 0.02,
      ccc: 0.9 + tick * 0.01
    });
  }

  const ended = await harness.endRun();
  const evaluation = new AdmissibilityEngine({ capP95Ms: 50, hardCapMs: 100 }).evaluateRun({ artifactDir: ended.artifactDir });
  return {
    artifactDir: ended.artifactDir,
    verdict: evaluation.verdict,
    runMetrics: JSON.parse(fs.readFileSync(path.join(ended.artifactDir, 'run_metrics.json'), 'utf8'))
  };
};

(async () => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'entropy-metrics-v64-'));
  try {
    const artifactsRoot = path.join(scratch, 'artifacts');
    const baseNow = Date.now();
    const replaySequence = [
      makeSample({ jobId: 'replay-a', entropyFloat01: 0.12, nowMs: baseNow }),
      makeSample({ jobId: 'replay-b', entropyFloat01: 0.88, nowMs: baseNow + 1 }),
      makeSample({ jobId: 'replay-c', entropyFloat01: 0.55, nowMs: baseNow + 2 })
    ];
    const upstreamSequence = [
      makeSample({ jobId: 'upstream-a', entropyFloat01: 0.22, nowMs: baseNow }),
      makeSample({ jobId: 'upstream-b', entropyFloat01: 0.67, nowMs: baseNow + 1 }),
      makeSample({ jobId: 'upstream-c', entropyFloat01: 0.41, nowMs: baseNow + 2 })
    ];

    const runs = [];
    runs.push(await runCondition({ baseDir: scratch, runId: 'baseline_a', condition: { mode: 'baseline' }, sequence: upstreamSequence, nowBase: baseNow }));
    runs.push(await runCondition({ baseDir: scratch, runId: 'baseline_b', condition: { mode: 'baseline' }, sequence: upstreamSequence, nowBase: baseNow + 100 }));
    runs.push(await runCondition({ baseDir: scratch, runId: 'replay_a', condition: { mode: 'replay', seed: 17057, replaySourceId: 'fixture_replay_v1', replaySequence }, sequence: upstreamSequence, nowBase: baseNow + 200 }));
    runs.push(await runCondition({ baseDir: scratch, runId: 'shuffled_a', condition: { mode: 'shuffled', seed: 77, replaySourceId: 'fixture_shuffled_v1', replaySequence }, sequence: upstreamSequence, nowBase: baseNow + 300 }));
    runs.push(await runCondition({ baseDir: scratch, runId: 'prng_a', condition: { mode: 'prng_only', seed: 17057 }, sequence: upstreamSequence, nowBase: baseNow + 400 }));
    runs.push(await runCondition({ baseDir: scratch, runId: 'prng_b', condition: { mode: 'prng_only', seed: 17057 }, sequence: upstreamSequence, nowBase: baseNow + 500 }));
    runs.push(await runCondition({ baseDir: scratch, runId: 'delay_a', condition: { mode: 'delayed_entropy', seed: 17057, delayMs: 40 }, sequence: upstreamSequence, nowBase: baseNow + 600 }));
    runs.push(await runCondition({ baseDir: scratch, runId: 'dropout_a', condition: { mode: 'dropout', seed: 17057, dropoutRate: 1 }, sequence: upstreamSequence, nowBase: baseNow + 700 }));

    assert(runs.every((run) => fs.existsSync(path.join(run.artifactDir, 'run_metrics.json'))), 'CASE 1 FAIL: each evaluated run must emit run_metrics.json.');
    assert(runs.every((run) => run.runMetrics.artifact_role === 'run_level_metrics_auxiliary'), 'CASE 1 FAIL: run_metrics artifact role mismatch.');

    const aggregated = buildConditionMetricsArtifacts({ artifactsRoot });
    const summary = JSON.parse(fs.readFileSync(aggregated.summaryPath, 'utf8'));
    const comparison = JSON.parse(fs.readFileSync(aggregated.comparisonPath, 'utf8'));

    assert(summary.conditions.baseline.run_count === 2, 'CASE 2 FAIL: baseline runs must group together.');
    assert(summary.conditions.prng_only.run_count === 2, 'CASE 2 FAIL: prng_only runs must group together for inter-run dispersion.');
    assert(summary.conditions.replay.run_count === 1, 'CASE 2 FAIL: replay run grouping mismatch.');
    assert(summary.conditions.dropout.run_count === 1, 'CASE 2 FAIL: dropout run grouping mismatch.');

    const baselineVsDelay = comparison.comparisons.find((entry) => entry.condition === 'delayed_entropy');
    const baselineVsDropout = comparison.comparisons.find((entry) => entry.condition === 'dropout');
    const baselineVsReplay = comparison.comparisons.find((entry) => entry.condition === 'replay');
    const baselineVsShuffled = comparison.comparisons.find((entry) => entry.condition === 'shuffled');
    const baselineVsPrng = comparison.comparisons.find((entry) => entry.condition === 'prng_only');

    assert(Boolean(baselineVsReplay && baselineVsShuffled && baselineVsPrng && baselineVsDelay && baselineVsDropout), 'CASE 3 FAIL: baseline comparison must include every experimental condition.');
    assert(
      Number(baselineVsDelay.metrics['stability.entropy_latency_mean_ms'].delta_abs) > 0,
      'CASE 3 FAIL: delayed_entropy should increase mean entropy latency versus baseline.'
    );
    assert(
      Number(baselineVsDropout.metrics['burden.fallback_tick_ratio'].delta_abs) > 0,
      'CASE 3 FAIL: dropout should increase fallback burden versus baseline.'
    );
    assert(
      Number(summary.conditions.prng_only.metrics['burden.fallback_tick_ratio'].std_dev) === 0,
      'CASE 4 FAIL: identical seeded prng_only runs should produce zero inter-run std on fallback burden.'
    );
    assert(
      summary.conditions.baseline.metrics['dispersion_intra_run.omega.std_dev'].sample_count === 2,
      'CASE 4 FAIL: baseline condition summary must aggregate repeated runs.'
    );
    assert(
      runs.find((run) => run.runMetrics.experimental_condition.mode === 'dropout').runMetrics.burden.fallback_tick_ratio > 0,
      'CASE 5 FAIL: dropout run metrics must show non-zero fallback burden.'
    );
    assert(
      runs.find((run) => run.runMetrics.experimental_condition.mode === 'delayed_entropy').runMetrics.stability.entropy_latency_mean_ms > 0,
      'CASE 5 FAIL: delayed run metrics must preserve latency burden.'
    );

    console.log('ok entropy-condition-metrics.v64');
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error('fail entropy-condition-metrics.v64:', error.message);
  process.exit(1);
});

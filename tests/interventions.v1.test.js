import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const assert = (c, m) => { if (!c) throw new Error(m); };
const lcg = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967295);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runHarnessWithScheduler = async ({ baseDir, runId, scheduler, schedulerMeta, seed = 17057, ticks = 240 }) => {
  const { ExperimentalEpisodeHarness } = await import('../src/experiments/ExperimentalEpisodeHarness.js');
  const harness = new ExperimentalEpisodeHarness({
    runMeta: {
      runId,
      seed,
      versionHash: 'vhash_pr6b',
      configHash: 'cfg_pr6b',
      deterministic: true,
      sensorsMode: 'mock',
      scheduleHash: schedulerMeta.scheduleHash,
      preregisterHash: schedulerMeta.preregisterHash
    },
    schemaPath: path.resolve(__dirname, '../src/experiments/schemas/run_record.v1.json'),
    baseDir
  });
  await harness.initRun();
  const rnd = lcg(seed);
  for (let tick = 0; tick < ticks; tick++) {
    const x = rnd();
    const intervention = scheduler.getInterventionState(tick);
    await harness.onTick({
      tick,
      t_ms: 50 + Math.floor(x * 2),
      versionHash: 'vhash_pr6b',
      configHash: 'cfg_pr6b',
      metrics: { omega: 1 + x * 0.1 },
      render_trace_hash: `trace_${tick}_${Math.floor(x * 1e6)}`,
      integrity: { event_present: false, C2_ok: null, echo_sig: null, nonce: null, requestId: null },
      intervention: {
        active: Boolean(intervention.active),
        tag: intervention.tag,
        eventId: intervention.eventId,
        params: intervention.params
      },
      sensors: { mode: 'mock', summary: {} },
      observability: {
        modules_active: ['ontological_core'],
        wm_pred_error: null,
        planner_cost: null,
        self_state_stub: { wm_enabled: null, planner_enabled: null, sensors_mode: 'mock', entropy_mode: null }
      }
    });
  }
  return harness.endRun();
};

(async () => {
  const { CausalInterventionScheduler } = await import('../src/experiments/CausalInterventionScheduler.js');
  const prereg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../config/interventions/preregister.v1.json'), 'utf8'));
  const schedulerA = new CausalInterventionScheduler(prereg, { throwOnInvalid: false });
  const schedulerB = new CausalInterventionScheduler(prereg, { throwOnInvalid: false });
  const metaA = schedulerA.getMetadata();
  const metaB = schedulerB.getMetadata();
  assert(metaA.valid === true, `CASE 1 FAIL: prereg must be valid (${metaA.reasons.join('|')})`);
  assert(metaA.scheduleHash === metaB.scheduleHash, 'CASE 1 FAIL: scheduleHash must be deterministic');
  assert(metaA.preregisterHash === metaB.preregisterHash, 'CASE 1 FAIL: preregisterHash must be deterministic');
  const requiredTags = ['WORLD_MODEL_OFF', 'PLANNER_OFF', 'SENSOR_MUTE', 'ENTROPY_CLAMP', 'LEARNING_FREEZE', 'SENSORY_DEGRADE'];
  requiredTags.forEach((tag) => assert(prereg.events.some((event) => event.tag === tag), `CASE 2 FAIL: missing required tag ${tag}`));
  const seqA = Array.from({ length: 20000 }, (_, tick) => schedulerA.getInterventionState(tick).eventId || null);
  const seqB = Array.from({ length: 20000 }, (_, tick) => schedulerB.getInterventionState(tick).eventId || null);
  assert(JSON.stringify(seqA) === JSON.stringify(seqB), 'CASE 3 FAIL: intervention sequence must be deterministic');
  const overlapped = JSON.parse(JSON.stringify(prereg));
  overlapped.events.push({
    tag: 'OVERLAP_BAD',
    start_tick: prereg.events[0].start_tick + 10,
    duration_ticks: 300,
    params: {},
    prediction: { targets: [{ metric: 'OMEGA', expected_delta: '<0', min_effect: 0.1, window_ticks: 60 }], negative_controls: ['none'] }
  });
  const schedulerBad = new CausalInterventionScheduler(overlapped, { throwOnInvalid: false });
  const badMeta = schedulerBad.getMetadata();
  assert(badMeta.valid === false, 'CASE 4 FAIL: overlap policy forbidden must invalidate schedule');
  assert(badMeta.reasons.some((r) => r.startsWith('OVERLAP_FORBIDDEN:')), 'CASE 4 FAIL: overlap reason missing');
  const d1 = fs.mkdtempSync(path.join(os.tmpdir(), 'pr6b-1-'));
  const d2 = fs.mkdtempSync(path.join(os.tmpdir(), 'pr6b-2-'));
  const r1 = await runHarnessWithScheduler({ baseDir: d1, runId: 'pr6b_run', scheduler: schedulerA, schedulerMeta: metaA });
  const r2 = await runHarnessWithScheduler({ baseDir: d2, runId: 'pr6b_run', scheduler: schedulerB, schedulerMeta: metaB });
  const h1 = JSON.parse(fs.readFileSync(path.join(r1.artifactDir, 'run_header.json'), 'utf8'));
  assert(h1.scheduleHash === metaA.scheduleHash, 'CASE 5 FAIL: header scheduleHash mismatch');
  assert(h1.preregisterHash === metaA.preregisterHash, 'CASE 5 FAIL: header preregisterHash mismatch');
  assert(r1.ticksHash === r2.ticksHash, 'CASE 6 FAIL: deterministic rerun ticks_hash mismatch');
  console.log('OK: interventions.v1 tests passed');
})().catch((error) => {
  console.error('FAIL: interventions.v1 tests failed:', error.message);
  process.exit(1);
});


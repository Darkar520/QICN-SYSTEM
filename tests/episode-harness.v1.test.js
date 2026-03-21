import os from 'os';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const assert = (c, m) => { if (!c) throw new Error(m); };

const lcg = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967295);

const runHarness = async ({ baseDir, runId, seed = 17057, configHash = 'cfg_ok', driftAtTick = null }) => {
  const { ExperimentalEpisodeHarness } = await import('../src/experiments/ExperimentalEpisodeHarness.js');
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const harness = new ExperimentalEpisodeHarness({
    runMeta: { runId, seed, versionHash: 'vhash_test', configHash, deterministic: true, sensorsMode: 'mock' },
    schemaPath: path.resolve(__dirname, '../src/experiments/schemas/run_record.v1.json'),
    baseDir
  });
  await harness.initRun();
  const rng = lcg(seed);
  for (let tick = 0; tick < 200; tick++) {
    const x = rng();
    await harness.onTick({
      tick, t_ms: 50 + Math.floor(x * 2), versionHash: 'vhash_test',
      configHash: tick === driftAtTick ? 'cfg_drift' : configHash,
      metrics: { omega: 1 + x * 0.1 }, render_trace_hash: `h_${tick}_${Math.floor(x * 1e6)}`,
      integrity: { event_present: false, C2_ok: null, echo_sig: null, nonce: null, requestId: null },
      intervention: { active: false, tag: null, params: null },
      sensors: { mode: 'mock', summary: {} },
      observability: {
        modules_active: ['ontological_core'], wm_pred_error: null, planner_cost: null,
        self_state_stub: { wm_enabled: null, planner_enabled: null, sensors_mode: 'mock', entropy_mode: null }
      }
    });
  }
  return harness.endRun();
};

(async () => {
  const d1 = fs.mkdtempSync(path.join(os.tmpdir(), 'ep-harness-1-'));
  const d2 = fs.mkdtempSync(path.join(os.tmpdir(), 'ep-harness-2-'));
  const r1 = await runHarness({ baseDir: d1, runId: 'det_run' });
  const r2 = await runHarness({ baseDir: d2, runId: 'det_run' });
  const nd1 = fs.readFileSync(path.join(r1.artifactDir, 'ticks.ndjson'), 'utf8').trim().split('\n').map(JSON.parse);
  assert(nd1.length === 200, 'CASE 1 FAIL: expected 200 tick lines');
  nd1.forEach((row, i) => assert(row.tick === i, `CASE 1 FAIL: tick monotonic break at ${i}`));
  nd1.forEach((row) => {
    assert(row.versionHash === 'vhash_test', 'CASE 2 FAIL: versionHash unstable');
    assert(row.configHash === 'cfg_ok', 'CASE 2 FAIL: configHash unstable');
  });
  const summary1 = JSON.parse(fs.readFileSync(path.join(r1.artifactDir, 'run_summary.json'), 'utf8'));
  assert(summary1.counts.schema_violations === 0, 'CASE 3 FAIL: schema violations must be zero');
  assert(!fs.existsSync(path.join(r1.artifactDir, 'entropy_preverdict.json')), 'CASE 3B FAIL: no entropy artifact should be emitted when no entropy snapshots are provided.');
  assert(r1.ticksHash === r2.ticksHash, 'CASE 4 FAIL: deterministic ticks_hash mismatch');
  const r3 = await runHarness({ baseDir: d1, runId: 'drift_run', driftAtTick: 77 });
  const summary3 = JSON.parse(fs.readFileSync(path.join(r3.artifactDir, 'run_summary.json'), 'utf8'));
  assert(summary3.flags.hash_drift === true, 'CASE 5 FAIL: hash drift must be flagged');
  console.log('OK: episode-harness.v1 tests passed');
})().catch((error) => {
  console.error('FAIL: episode-harness.v1 tests failed:', error.message);
  process.exit(1);
});

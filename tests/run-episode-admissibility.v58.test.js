import fs from 'fs';
import os from 'os';
import path from 'path';
import { ExperimentalEpisodeHarness } from '../src/experiments/ExperimentalEpisodeHarness.js';
import { AdmissibilityEngine } from '../src/experiments/AdmissibilityEngine.js';
import { sha256Hex, stableStringify } from '../src/utils/integrity.js';

const assert = (c, m) => { if (!c) throw new Error(m); };
const lcg = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967295);

(async () => {
  const root = path.resolve('.');
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'run-ep-v58-'));
  try {
    const deterministic = true;
    const sensorsMode = 'mock';
    const seed = 17057;
    const tickMs = 43;
    const durationSec = 8;
    const ticks = Math.max(1, Math.floor((durationSec * 1000) / tickMs));
    const runId = `v58_${Date.now()}_${seed}`;
    const versionHash = 'test_v58';
    const scheduleHash = `${sensorsMode}_det`;
    const configHash = sha256Hex(stableStringify({ deterministic, sensorsMode, tickMs, scheduleHash }));
    const harness = new ExperimentalEpisodeHarness({
      runMeta: { runId, seed, versionHash, configHash, deterministic, sensorsMode, mode: 'test_v58', scheduleHash, preregisterHash: 'campaign_local_v1' },
      schemaPath: path.resolve(root, 'src/experiments/schemas/run_record.v1.json'),
      baseDir: scratch
    });
    await harness.initRun();
    const rng = lcg(seed);
    for (let tick = 0; tick < ticks; tick++) {
      const x = rng();
      const y = rng();
      await harness.onTick({
        tick,
        t_ms: tickMs + Math.floor(x * 2),
        versionHash,
        configHash,
        metrics: {
          omega: Number((0.95 + (tick * 0.0002) + x * 0.02).toFixed(6)),
          ccc: Number((0.98 + y * 0.01 + 0.005).toFixed(6))
        },
        render_trace_hash: `trace_${tick}_${Math.floor(x * 1e6)}`,
        integrity: { event_present: false, C2_ok: null, echo_sig: null, nonce: null, requestId: null },
        intervention: { active: false, tag: null, params: null },
        sensors: { mode: sensorsMode, summary: { fidelityIndex: Number((0.9 + x * 0.1).toFixed(4)), sensor_load: Number((0.3 + y * 0.2).toFixed(4)) } },
        observability: {
          modules_active: ['ontological_core', 'nodal_layer'],
          wm_pred_error: Number((0.05 + (1 - y) * 0.02).toFixed(6)),
          planner_cost: Number((0.03 + x * 0.015).toFixed(6)),
          self_state_stub: {
            wm_enabled: true,
            planner_enabled: true,
            sensors_mode: sensorsMode,
            entropy_mode: 'deterministic_local'
          }
        }
      });
    }
    const ended = await harness.endRun();
    const artifactDir = ended.artifactDir;
    const adm = new AdmissibilityEngine({ capP95Ms: 50, hardCapMs: 100 }).evaluateRun({ artifactDir }).verdict;
    const summary = JSON.parse(fs.readFileSync(path.join(artifactDir, 'run_summary.json'), 'utf8'));
    assert(Number(summary?.tick_ms?.p95) <= 50, 'CASE 1 FAIL: p95 tick_ms must be <= 50');
    assert(summary?.flags?.io_partial === false, 'CASE 2 FAIL: io_partial must be false');
    assert(Number(summary?.counts?.lines_expected) === Number(summary?.counts?.lines_written), 'CASE 3 FAIL: lines_expected must match lines_written');
    assert(adm.status === 'ADMISSIBLE', `CASE 4 FAIL: run must be ADMISSIBLE, got ${adm.status}`);
    const proxies = [summary?.metrics?.cog, summary?.metrics?.phen, summary?.metrics?.subj];
    const nonNull = proxies.filter((v) => v !== null && v !== undefined && Number.isFinite(Number(v))).length;
    assert(nonNull >= 2, `CASE 5 FAIL: expected >=2 non-null proxies, got ${nonNull}`);

    const runIdAbl = `v58abl_${Date.now()}_${seed}`;
    const harnessAbl = new ExperimentalEpisodeHarness({
      runMeta: { runId: runIdAbl, seed, versionHash, configHash, deterministic, sensorsMode, mode: 'test_v58_abl', scheduleHash, preregisterHash: 'campaign_local_v1' },
      schemaPath: path.resolve(root, 'src/experiments/schemas/run_record.v1.json'),
      baseDir: scratch
    });
    await harnessAbl.initRun();
    const rngA = lcg(seed);
    for (let tick = 0; tick < ticks; tick++) {
      const x = rngA();
      const y = rngA();
      await harnessAbl.onTick({
        tick,
        t_ms: tickMs + Math.floor(x * 2),
        versionHash,
        configHash,
        metrics: {
          omega: Number((0.95 + (tick * 0.0002) + x * 0.02).toFixed(6)),
          ccc: Number((0.98 + y * 0.01 + 0.005).toFixed(6))
        },
        render_trace_hash: `trace_abl_${tick}_${Math.floor(x * 1e6)}`,
        integrity: { event_present: false, C2_ok: null, echo_sig: null, nonce: null, requestId: null },
        intervention: { active: true, tag: tick % 2 === 0 ? 'PLANNER_OFF' : 'WORLD_MODEL_OFF', params: {} },
        sensors: { mode: sensorsMode, summary: { fidelityIndex: Number((0.9 + x * 0.1).toFixed(4)), sensor_load: Number((0.3 + y * 0.2).toFixed(4)) } },
        observability: {
          modules_active: ['ontological_core', 'nodal_layer'],
          wm_pred_error: Number((0.05 + (1 - y) * 0.02).toFixed(6)),
          planner_cost: Number((0.03 + x * 0.015).toFixed(6)),
          self_state_stub: {
            wm_enabled: true,
            planner_enabled: false,
            sensors_mode: sensorsMode,
            entropy_mode: 'deterministic_local'
          }
        }
      });
    }
    const endedAbl = await harnessAbl.endRun();
    const summaryAbl = JSON.parse(fs.readFileSync(path.join(endedAbl.artifactDir, 'run_summary.json'), 'utf8'));
    assert(Number(summaryAbl?.metrics?.cog) < Number(summary?.metrics?.cog), 'CASE 6 FAIL: COG proxy must decrease under planner/world-model ablation');
    console.log('OK: run-episode-admissibility.v58 tests passed');
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error('FAIL: run-episode-admissibility.v58 tests failed:', error.message);
  process.exit(1);
});

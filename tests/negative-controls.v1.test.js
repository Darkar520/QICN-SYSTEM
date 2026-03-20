import fs from 'fs';
import os from 'os';
import path from 'path';
import { evaluateRoeoBatch } from '../src/experiments/roeo_signature.js';
import { evaluateSnoBatch } from '../src/experiments/sno_discriminator.js';
import { runNegativeControlsBatch, computeNc1TimePermutationEffect } from '../src/experiments/negative_controls_runner.js';
import { sha256Hex, stableStringify } from '../src/utils/integrity.js';

const assert = (c, m) => { if (!c) throw new Error(m); };

const writeRun = ({ root, runId, cond, phase }) => {
  const runPath = path.join(root, runId);
  fs.mkdirSync(runPath, { recursive: true });
  fs.writeFileSync(path.join(runPath, 'run_header.json'), `${JSON.stringify({ runId, scheduleHash: `sched_${cond}`, versionHash: 'v1', configHash: 'c1' })}\n`);
  fs.writeFileSync(path.join(runPath, 'run_verdict.json'), `${JSON.stringify({ runId, status: 'ADMISSIBLE' })}\n`);
  fs.writeFileSync(path.join(runPath, 'run_summary.json'), `${JSON.stringify({ counts: { ticks: 60 }, tick_ms: { p95: 20, max: 30 }, metrics: { cog: 0.4 + cond * 0.1, phen: 0.5 + cond * 0.1, subj: 0.6 + cond * 0.1 } })}\n`);
  fs.writeFileSync(path.join(runPath, 'eo_report.json'), `${JSON.stringify({ runId, signature: { COG: 0.4 + cond * 0.1, PHEN: 0.5 + cond * 0.1, SUBJ: 0.6 + cond * 0.1, EO_scalar: 0.5 + cond * 0.1 } })}\n`);
  const lines = Array.from({ length: 60 }, (_, i) => JSON.stringify({ tick: i, metrics: { omega: Math.sin((i / 5) + phase) + cond * 0.2, ccc: Math.cos((i / 6) + phase) - cond * 0.1 } })).join('\n');
  fs.writeFileSync(path.join(runPath, 'ticks.ndjson'), `${lines}\n`);
  return runPath;
};

(async () => {
  const smoothTicks = Array.from({ length: 120 }, (_, i) => ({
    tick: i,
    metrics: { omega: i / 120 }
  }));
  const smoothEffect = computeNc1TimePermutationEffect({
    ticks: smoothTicks,
    runId: 'smooth',
    preregHash: 'prereg_smooth'
  });
  assert(smoothEffect.metric_used === 'metrics.omega', 'CASE 0 FAIL: NC1 must prioritize omega series when present');
  assert(smoothEffect.observed_effect >= 0.1, 'CASE 0 FAIL: smooth temporal series must be sensitive to permutation');

  const noiseTicks = Array.from({ length: 120 }, (_, i) => ({
    tick: i,
    metrics: { omega: (Math.sin(i * 97.123) * 0.5) + (Math.cos(i * 53.77) * 0.5) }
  }));
  const noiseEffect = computeNc1TimePermutationEffect({
    ticks: noiseTicks,
    runId: 'noise',
    preregHash: 'prereg_noise'
  });
  assert(noiseEffect.observed_effect < smoothEffect.observed_effect, 'CASE 0 FAIL: i.i.d-like signal must be less sensitive than smooth signal');

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nc-v1-'));
  const runsRoot = path.join(tmp, 'artifacts', 'runs');
  const outRoot = path.join(tmp, 'artifacts', 'roeo_batches');
  fs.mkdirSync(runsRoot, { recursive: true });
  const labels = ['S0', 'S1', 'S2', 'S3'];
  const runs = {};
  labels.forEach((label, idx) => {
    runs[label] = Array.from({ length: 3 }, (_, r) => writeRun({
      root: runsRoot,
      runId: `${label}_r${r}`,
      cond: idx,
      phase: idx * 0.15 + (r * 0.03)
    }));
  });
  const strictAllow = ['eo.COG', 'eo.PHEN', 'eo.SUBJ', 'summary.tick_ms.p95', 'ticks.metrics.omega.autocorr1'];
  const looseAllow = ['eo.COG', 'eo.PHEN', 'eo.SUBJ', 'eo.EO_scalar', 'summary.tick_ms.p95', 'summary.tick_ms.max', 'summary.counts.ticks', 'ticks.metrics.omega.mean', 'ticks.metrics.omega.std', 'ticks.metrics.omega.slope', 'ticks.metrics.ccc.mean', 'ticks.metrics.ccc.std', 'ticks.metrics.ccc.slope'];
  const prereg = {
    epsilon_RO: 0.08,
    minimum_intersection_dims: 2,
    min_runs_per_class: 3,
    weights: { COG: 1, PHEN: 1, SUBJ: 1 },
    alphas: { COG: 1, PHEN: 1, SUBJ: 1, EO_scalar: 1 },
    sno: {
      SNO_feature_set_id: 'sno_features_v1',
      strict: { chance: 0.25, delta_SNO: 0.1, allowlist: strictAllow, allowlist_hash: sha256Hex(stableStringify(strictAllow)) },
      loose: { chance: 0.25, delta_SNO: 0.15, allowlist: looseAllow, allowlist_hash: sha256Hex(stableStringify(looseAllow)) }
    },
    negative_controls: {
      effect_min: 0.1,
      tau_placebo: 0.02,
      leak_threshold: 0.75,
      expected: { NC1_time_permutation: 'effect_min_or_ro_fail', NC2_self_noise_or_shift: 'effect_min', NC3_placebo: 'abs_effect_le_tau', NC4_leak_feature: 'acc_ge_threshold' }
    },
    pairs: labels.flatMap((label, idx) => runs[label].map((runA, r) => {
      const next = labels[(idx + 1) % labels.length];
      return {
        pair_id: `${label}_${r}_to_${next}_${r}`,
        condition_a: label,
        condition_b: next,
        run_a: runA,
        run_b: runs[next][r]
      };
    }))
  };
  const preregPath = path.join(tmp, 'prereg.json');
  fs.writeFileSync(preregPath, `${JSON.stringify(prereg, null, 2)}\n`);
  evaluateRoeoBatch({ preregPath, batchId: 'b1', outputRoot: outRoot });
  evaluateSnoBatch({ preregPath, batchId: 'b1', outputRoot: outRoot, injectLeak: false });
  evaluateSnoBatch({ preregPath, batchId: 'b1_leak', outputRoot: outRoot, injectLeak: true });
  const nc = runNegativeControlsBatch({ preregPath, batchId: 'b1', outputRoot: outRoot }).report;
  assert(nc.controls.NC1_time_permutation.pass, 'CASE 1 FAIL: NC1 must pass expected outcome');
  assert(nc.controls.NC2_self_noise_or_shift.pass, 'CASE 2 FAIL: NC2 must pass expected outcome');
  assert(nc.controls.NC3_placebo.pass, 'CASE 3 FAIL: NC3 placebo must pass');
  assert(nc.controls.NC4_leak_feature.pass, 'CASE 4 FAIL: NC4 leak sanity must pass');
  console.log('OK: negative-controls.v1 tests passed');
})().catch((error) => {
  console.error('FAIL: negative-controls.v1 tests failed:', error.message);
  process.exit(1);
});

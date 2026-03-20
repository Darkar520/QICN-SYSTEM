import fs from 'fs';
import os from 'os';
import path from 'path';
import { evaluateRoeoBatch } from '../src/experiments/roeo_signature.js';
import { evaluateSnoBatch } from '../src/experiments/sno_discriminator.js';
import { runNegativeControlsBatch, evaluateBatchEnforcement } from '../src/experiments/negative_controls_runner.js';
import { sha256Hex, stableStringify } from '../src/utils/integrity.js';

const assert = (c, m) => { if (!c) throw new Error(m); };

const writeRun = ({ root, runId, cond }) => {
  const runPath = path.join(root, runId);
  fs.mkdirSync(runPath, { recursive: true });
  fs.writeFileSync(path.join(runPath, 'run_header.json'), `${JSON.stringify({ runId, scheduleHash: `sched_${cond}`, versionHash: 'v1', configHash: 'c1' })}\n`);
  fs.writeFileSync(path.join(runPath, 'run_verdict.json'), `${JSON.stringify({ runId, status: 'ADMISSIBLE' })}\n`);
  fs.writeFileSync(path.join(runPath, 'run_summary.json'), `${JSON.stringify({ counts: { ticks: 20 }, tick_ms: { p95: 30, max: 40 }, metrics: { cog: 0.5, phen: 0.5, subj: 0.5 } })}\n`);
  fs.writeFileSync(path.join(runPath, 'eo_report.json'), `${JSON.stringify({ runId, signature: { COG: 0.5, PHEN: 0.5, SUBJ: 0.5, EO_scalar: 0.5 } })}\n`);
  const lines = Array.from({ length: 20 }, (_, i) => JSON.stringify({ tick: i, metrics: { omega: Math.sin(i / 3), ccc: Math.cos(i / 4) } })).join('\n');
  fs.writeFileSync(path.join(runPath, 'ticks.ndjson'), `${lines}\n`);
  return runPath;
};

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'enf-v1-'));
  const runsRoot = path.join(tmp, 'artifacts', 'runs');
  const outRoot = path.join(tmp, 'artifacts', 'roeo_batches');
  fs.mkdirSync(runsRoot, { recursive: true });
  const runs = ['S0', 'S1', 'S2', 'S3'].map((s, i) => ({ s, p: writeRun({ root: runsRoot, runId: `${s}_run`, cond: i }) }));
  const strictAllow = ['eo.COG', 'eo.PHEN', 'eo.SUBJ', 'summary.tick_ms.p95', 'ticks.metrics.omega.autocorr1'];
  const prereg = {
    epsilon_RO: 0.08,
    minimum_intersection_dims: 2,
    min_runs_per_class: 5,
    weights: { COG: 1, PHEN: 1, SUBJ: 1 },
    alphas: { COG: 1, PHEN: 1, SUBJ: 1, EO_scalar: 1 },
    sno: {
      SNO_feature_set_id: 'sno_features_v1',
      strict: { chance: 0.25, delta_SNO: 0.1, allowlist: strictAllow, allowlist_hash: sha256Hex(stableStringify(strictAllow)) },
      loose: { chance: 0.25, delta_SNO: 0.15, allowlist: strictAllow, allowlist_hash: sha256Hex(stableStringify(strictAllow)) }
    },
    negative_controls: {
      effect_min: 0.1,
      tau_placebo: 0.02,
      leak_threshold: 0.75,
      expected: { NC1_time_permutation: 'effect_min_or_ro_fail', NC2_self_noise_or_shift: 'effect_min', NC3_placebo: 'abs_effect_le_tau', NC4_leak_feature: 'acc_ge_threshold' }
    },
    pairs: [
      { pair_id: 'p01', condition_a: 'S0', condition_b: 'S1', run_a: runs[0].p, run_b: runs[1].p },
      { pair_id: 'p23', condition_a: 'S2', condition_b: 'S3', run_a: runs[2].p, run_b: runs[3].p }
    ]
  };
  const preregPath = path.join(tmp, 'prereg.json');
  fs.writeFileSync(preregPath, `${JSON.stringify(prereg, null, 2)}\n`);
  evaluateRoeoBatch({ preregPath, batchId: 'b2', outputRoot: outRoot });
  evaluateSnoBatch({ preregPath, batchId: 'b2', outputRoot: outRoot, injectLeak: false });
  evaluateSnoBatch({ preregPath, batchId: 'b2_leak', outputRoot: outRoot, injectLeak: true });
  runNegativeControlsBatch({ preregPath, batchId: 'b2', outputRoot: outRoot });
  const enf = evaluateBatchEnforcement({ preregPath, batchId: 'b2', outputRoot: outRoot }).report;
  assert(enf.batch_status === 'NOT_PAPER_ADMISSIBLE', 'CASE 1 FAIL: insufficient n must block paper admissibility');
  assert(enf.reasons.includes('INSUFFICIENT_N'), 'CASE 2 FAIL: missing INSUFFICIENT_N reason');
  fs.rmSync(path.join(outRoot, 'b2', 'negative_controls_report.json'));
  const enfMissing = evaluateBatchEnforcement({ preregPath, batchId: 'b2', outputRoot: outRoot }).report;
  assert(enfMissing.reasons.includes('MISSING_NEGATIVE_CONTROLS'), 'CASE 3 FAIL: missing NC report must block');
  console.log('OK: roeo_enforcement.v1 tests passed');
})().catch((error) => {
  console.error('FAIL: roeo_enforcement.v1 tests failed:', error.message);
  process.exit(1);
});

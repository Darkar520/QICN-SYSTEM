import fs from 'fs';
import os from 'os';
import path from 'path';
import { evaluateSnoBatch } from '../src/experiments/sno_discriminator.js';
import { sha256Hex, stableStringify } from '../src/utils/integrity.js';

const assert = (c, m) => { if (!c) throw new Error(m); };

const writeRun = ({ root, runId, cond, scheduleHash, jitter = 0 }) => {
  const runPath = path.join(root, runId);
  fs.mkdirSync(runPath, { recursive: true });
  fs.writeFileSync(path.join(runPath, 'run_header.json'), `${JSON.stringify({ runId, scheduleHash, versionHash: 'v1', configHash: 'c1' })}\n`);
  fs.writeFileSync(path.join(runPath, 'run_verdict.json'), `${JSON.stringify({ runId, status: 'ADMISSIBLE' })}\n`);
  fs.writeFileSync(path.join(runPath, 'run_summary.json'), `${JSON.stringify({ counts: { ticks: 20 }, tick_ms: { p95: 49, max: 52 } })}\n`);
  fs.writeFileSync(path.join(runPath, 'eo_report.json'), `${JSON.stringify({ signature: { COG: 0.5 + jitter, PHEN: 0.5 + jitter, SUBJ: 0.5 + jitter, EO_scalar: 0.5 + jitter } })}\n`);
  const lines = Array.from({ length: 20 }, (_, i) => JSON.stringify({ tick: i, metrics: { omega: Math.sin(i / 3) + jitter, ccc: Math.cos(i / 4) - jitter, cond } })).join('\n');
  fs.writeFileSync(path.join(runPath, 'ticks.ndjson'), `${lines}\n`);
  return runPath;
};

(async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sno-v1-'));
  const runsDir = path.join(root, 'artifacts', 'runs');
  fs.mkdirSync(runsDir, { recursive: true });
  const classes = ['S0', 'S1', 'S2', 'S3'];
  const pairs = [];
  classes.forEach((c, idx) => {
    for (let r = 0; r < 3; r++) {
      const run = writeRun({ root: runsDir, runId: `${c}_run_${r}`, cond: idx, scheduleHash: `sched_${c}`, jitter: (r - 1) * 0.0001 });
      const nextClass = classes[(idx + 1) % classes.length];
      const next = path.join(runsDir, `${nextClass}_run_${r}`);
      pairs.push({ pair_id: `${c}_${r}_to_${nextClass}_${r}`, condition_a: c, condition_b: nextClass, run_a: run, run_b: next });
    }
  });
  const strictAllow = ['eo.COG', 'eo.PHEN', 'eo.SUBJ', 'summary.tick_ms.p95', 'ticks.metrics.omega.autocorr1'];
  const looseAllow = ['eo.COG', 'eo.PHEN', 'eo.SUBJ', 'eo.EO_scalar', 'summary.tick_ms.p95', 'summary.tick_ms.max', 'summary.counts.ticks', 'ticks.metrics.omega.mean', 'ticks.metrics.omega.std', 'ticks.metrics.omega.slope', 'ticks.metrics.ccc.mean', 'ticks.metrics.ccc.std', 'ticks.metrics.ccc.slope'];
  const prereg = {
    sno: {
      SNO_feature_set_id: 'sno_features_v1',
      strict: { chance: 0.25, delta_SNO: 0.1, allowlist: strictAllow, allowlist_hash: sha256Hex(stableStringify(strictAllow)) },
      loose: { chance: 0.25, delta_SNO: 0.15, allowlist: looseAllow, allowlist_hash: sha256Hex(stableStringify(looseAllow)) }
    },
    pairs
  };
  const preregPath = path.join(root, 'roeo_preregister.v1.json');
  fs.writeFileSync(preregPath, `${JSON.stringify(prereg, null, 2)}\n`);
  const outA = evaluateSnoBatch({ preregPath, batchId: 'batch_clean', outputRoot: path.join(root, 'artifacts', 'roeo_batches'), injectLeak: false }).report;
  assert(outA.strict.acc <= outA.strict.threshold, 'CASE 1 FAIL: strict no-leak must be near chance');
  const outB = evaluateSnoBatch({ preregPath, batchId: 'batch_leak', outputRoot: path.join(root, 'artifacts', 'roeo_batches'), injectLeak: true }).report;
  assert(outB.strict.acc >= 0.75, 'CASE 2 FAIL: strict with leak must be >= 0.75');
  assert(fs.existsSync(path.join(root, 'artifacts', 'roeo_batches', 'batch_clean', 'sno_report.json')), 'CASE 3 FAIL: sno_report missing');
  console.log('OK: sno.v1 tests passed');
})().catch((error) => {
  console.error('FAIL: sno.v1 tests failed:', error.message);
  process.exit(1);
});

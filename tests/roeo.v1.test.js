import fs from 'fs';
import os from 'os';
import path from 'path';
import { evaluateRoeoBatch } from '../src/experiments/roeo_signature.js';
import { sha256Hex, stableStringify } from '../src/utils/integrity.js';

const assert = (c, m) => { if (!c) throw new Error(m); };

const mkRun = ({ root, id, status = 'ADMISSIBLE', cog = 0.5, phen = 0.5, subj = 0.5 }) => {
  const dir = path.join(root, id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'run_header.json'), `${JSON.stringify({ runId: id, versionHash: 'vh', configHash: 'ch' })}\n`);
  fs.writeFileSync(path.join(dir, 'run_summary.json'), `${JSON.stringify({ counts: { ticks: 5 }, tick_ms: { p95: 50, max: 60 } })}\n`);
  fs.writeFileSync(path.join(dir, 'run_verdict.json'), `${JSON.stringify({ runId: id, status, hashes: { ticks_hash: `th_${id}` } })}\n`);
  const lines = Array.from({ length: 5 }, (_, t) => JSON.stringify({ tick: t, metrics: { cog, phen, subj } })).join('\n');
  fs.writeFileSync(path.join(dir, 'ticks.ndjson'), `${lines}\n`);
  return dir;
};

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'roeo-v1-'));
  const s0 = mkRun({ root: tmp, id: 'run_s0', cog: 0.9, phen: 0.85, subj: 0.88 });
  const s0clone = mkRun({ root: tmp, id: 'run_s0_clone', cog: 0.9, phen: 0.85, subj: 0.88 });
  const s2 = mkRun({ root: tmp, id: 'run_s2', cog: 0.3, phen: 0.35, subj: 0.25 });
  const bad = mkRun({ root: tmp, id: 'run_bad', status: 'DISCARDED' });
  const allowlist = ['metrics.cog', 'metrics.phen', 'metrics.subj', 'summary.tick_ms.p95', 'summary.tick_ms.max', 'summary.counts.ticks'];
  const prereg = {
    version: '1.0.1',
    epsilon_RO: 0.08,
    minimum_intersection_dims: 2,
    weights: { COG: 1, PHEN: 1, SUBJ: 1 },
    alphas: { COG: 1, PHEN: 1, SUBJ: 1, EO_scalar: 1 },
    sno: { SNO_feature_set_id: 'sno_features_v1', allowlist, allowlist_hash: sha256Hex(stableStringify(allowlist)), strict: { chance: 0.25, delta_SNO: 0.1 }, loose: { chance: 0.25, delta_SNO: 0.15 } },
    pairs: [
      { pair_id: 'replay', condition_a: 'S0', condition_b: 'S0', run_a: s0, run_b: s0clone },
      { pair_id: 'contrast', condition_a: 'S0', condition_b: 'S2', run_a: s0, run_b: s2 },
      { pair_id: 'nonadmissible', condition_a: 'S0', condition_b: 'S3', run_a: s0, run_b: bad }
    ]
  };
  const preregPath = path.join(tmp, 'roeo_preregister.v1.json');
  fs.writeFileSync(preregPath, `${JSON.stringify(prereg, null, 2)}\n`);
  const { outPath, payload } = evaluateRoeoBatch({ preregPath, batchId: 'roeo_test_batch', outputRoot: path.join(tmp, 'batches') });
  assert(fs.existsSync(outPath), 'CASE 1 FAIL: operational_equivalence.json missing');
  assert(fs.existsSync(path.join(s0, 'eo_report.json')), 'CASE 1 FAIL: eo_report.json missing for run_s0');
  const replay = payload.pairs.find((p) => p.pair_id === 'replay');
  assert(replay && replay.ro_status === 'EQUIVALENT', 'CASE 2 FAIL: replay must be equivalent');
  assert(Math.abs(Number(replay.d)) <= 1e-9, 'CASE 2 FAIL: replay distance must be 0');
  const contrast = payload.pairs.find((p) => p.pair_id === 'contrast');
  assert(contrast && contrast.ro_status === 'NOT_EQUIVALENT', 'CASE 3 FAIL: contrast must be not equivalent');
  assert(Number(contrast.d) > Number(payload.epsilon_RO), 'CASE 3 FAIL: contrast distance must exceed epsilon');
  const nonad = payload.pairs.find((p) => p.pair_id === 'nonadmissible');
  assert(nonad && nonad.ro_status === 'NOT_EVALUABLE', 'CASE 4 FAIL: non-admissible pair must be NOT_EVALUABLE');
  assert(nonad.reason === 'NON_ADMISSIBLE_RUN', 'CASE 4 FAIL: wrong reason for non-admissible');
  assert(payload.sno.SNO_feature_set_id === 'sno_features_v1', 'CASE 5 FAIL: missing SNO feature set id');
  assert(typeof payload.sno.allowlist_hash === 'string' && payload.sno.allowlist_hash.length > 0, 'CASE 5 FAIL: missing allowlist hash');
  console.log('OK: roeo.v1 tests passed');
})().catch((error) => {
  console.error('FAIL: roeo.v1 tests failed:', error.message);
  process.exit(1);
});

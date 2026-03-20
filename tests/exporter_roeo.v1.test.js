import fs from 'fs';
import os from 'os';
import path from 'path';
import { exportRoeoAssets } from '../src/experiments/latex_asset_generator_roeo.js';
import { sha256Hex, stableStringify } from '../src/utils/integrity.js';

const assert = (c, m) => { if (!c) throw new Error(m); };

const writeJson = (p, o) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, `${JSON.stringify(o, null, 2)}\n`, 'utf8'); };

const makeFixture = ({ root, batchId, admissible }) => {
  const runsRoot = path.join(root, 'runs');
  const r0 = path.join(runsRoot, 'S0_run');
  const r1 = path.join(runsRoot, 'S1_run');
  writeJson(path.join(r0, 'run_header.json'), { runId: 'S0_run' });
  writeJson(path.join(r1, 'run_header.json'), { runId: 'S1_run' });
  fs.writeFileSync(path.join(r0, 'ticks.ndjson'), `${JSON.stringify({ tick: 0, metrics: { omega: 0.1 } })}\n`, 'utf8');
  fs.writeFileSync(path.join(r1, 'ticks.ndjson'), `${JSON.stringify({ tick: 0, metrics: { omega: 0.2 } })}\n`, 'utf8');
  writeJson(path.join(r0, 'run_summary.json'), { metrics: { cog: 0.4 } });
  writeJson(path.join(r1, 'run_summary.json'), { metrics: { cog: 0.5 } });
  writeJson(path.join(r0, 'run_verdict.json'), { status: 'ADMISSIBLE' });
  writeJson(path.join(r1, 'run_verdict.json'), { status: 'ADMISSIBLE' });
  writeJson(path.join(r0, 'eo_report.json'), { runId: 'S0_run', hashes: { ticks_hash: 'th0' } });
  writeJson(path.join(r1, 'eo_report.json'), { runId: 'S1_run', hashes: { ticks_hash: 'th1' } });
  const prereg = {
    epsilon_RO: 0.08,
    pairs: [{ pair_id: 'p01', condition_a: 'S0', condition_b: 'S1', run_a: r0, run_b: r1 }]
  };
  const preregHash = sha256Hex(stableStringify(prereg));
  const batchRoot = path.join(root, 'roeo_batches', batchId);
  writeJson(path.join(batchRoot, 'operational_equivalence.json'), { batchId, epsilon_RO: 0.08, pairs: [{ pair_id: 'p01', condition_a: 'S0', condition_b: 'S1', ro_status: 'EQUIVALENT', d: 0, epsilon: 0.08 }], prereg_hash: preregHash });
  writeJson(path.join(batchRoot, 'sno_report.json'), { batchId, chance: 0.25, strict: { acc: 0.2, threshold: 0.35, pass_non_identifiable: true }, prereg_hash: preregHash });
  writeJson(path.join(root, 'roeo_batches', `${batchId}_leak`, 'sno_report.json'), { batchId: `${batchId}_leak`, strict: { acc: 0.8 }, prereg_hash: preregHash });
  writeJson(path.join(batchRoot, 'negative_controls_report.json'), { batchId, controls: { NC1_time_permutation: { expected: 'x', observed_effect: 0.2, pass: true }, NC2_self_noise_or_shift: { expected: 'x', observed_effect: 0.2, pass: true }, NC3_placebo: { expected: 'x', observed_abs_effect: 0, pass: true }, NC4_leak_feature: { expected: 'x', observed_acc: 0.8, pass: true } }, prereg_hash: preregHash });
  writeJson(path.join(batchRoot, 'roeo_enforcement_report.json'), { batchId, batch_status: admissible ? 'PAPER_ADMISSIBLE' : 'NOT_PAPER_ADMISSIBLE', reasons: admissible ? [] : ['INSUFFICIENT_N'], prereg_hash: preregHash });
  const preregPath = path.join(root, 'prereg.json');
  writeJson(preregPath, prereg);
  return { preregPath, batchRoot };
};

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'export-roeo-v1-'));
  const exportsRoot = path.join(tmp, 'paper_exports');

  const c1 = makeFixture({ root: tmp, batchId: 'b_not', admissible: false });
  const r1 = exportRoeoAssets({ batchId: 'b_not', roeoRoot: path.join(tmp, 'roeo_batches'), exportsRoot, preregPath: c1.preregPath }).manifest;
  assert(r1.exported === false, 'CASE 1 FAIL: not admissible batch must not export');
  assert(r1.preregister?.sha256, 'CASE 1 FAIL: manifest must include prereg hash even when not exported');
  assert(r1.reports?.operational?.sha256, 'CASE 1 FAIL: manifest must include report hashes when not exported');
  assert(!fs.existsSync(path.join(exportsRoot, 'b_not', 'tables_ROEO.tex')), 'CASE 2 FAIL: tables_ROEO.tex must not exist');
  assert(!fs.existsSync(path.join(exportsRoot, 'b_not', 'appendix_hashes.tex')), 'CASE 2 FAIL: appendix_hashes.tex must not exist for non-admissible batch');

  const c2 = makeFixture({ root: tmp, batchId: 'b_yes', admissible: true });
  const r2 = exportRoeoAssets({ batchId: 'b_yes', roeoRoot: path.join(tmp, 'roeo_batches'), exportsRoot, preregPath: c2.preregPath }).manifest;
  assert(r2.exported === true, 'CASE 3 FAIL: admissible batch must export');
  assert(r2.runs?.length === 2, 'CASE 3 FAIL: manifest must include per-run provenance');
  assert(r2.exports?.tables_ROEO?.sha256, 'CASE 3 FAIL: manifest must include exported asset hashes');
  ['tables_ROEO.tex', 'tables_SNO.tex', 'tables_NC.tex', 'appendix_hashes.tex', 'figures_data_ROEO.json', 'export_manifest.json'].forEach((f) => {
    assert(fs.existsSync(path.join(exportsRoot, 'b_yes', f)), `CASE 4 FAIL: missing ${f}`);
  });

  const opPath = path.join(tmp, 'roeo_batches', 'b_yes', 'operational_equivalence.json');
  const opJson = JSON.parse(fs.readFileSync(opPath, 'utf8'));
  opJson.pairs[0].d = 0.123456;
  writeJson(opPath, opJson);
  const r3 = exportRoeoAssets({ batchId: 'b_yes', roeoRoot: path.join(tmp, 'roeo_batches'), exportsRoot, preregPath: c2.preregPath }).manifest;
  assert(r3.exported === false, 'CASE 5 FAIL: input tamper must block export');
  assert(r3.reasons.includes('INPUT_HASH_MISMATCH'), 'CASE 6 FAIL: must emit INPUT_HASH_MISMATCH reason');
  console.log('OK: exporter_roeo.v1 tests passed');
})().catch((error) => {
  console.error('FAIL: exporter_roeo.v1 tests failed:', error.message);
  process.exit(1);
});

#!/usr/bin/env node
// Restore equivalence for persistence v3 (internal check, not external evidence).
//
// Run A: K + M ticks; the dynamic state is captured after tick K.
// Run B: fresh process, initializeSystem, restore the capture, align the RNG,
//        clocks and synthetic sensor stream, run M ticks.
// If the capture is complete, B reproduces A's ticks K+1..K+M exactly. In the
// browser the RNG and the wall clock cannot be restored, so a restored run is
// a continuation from the saved state, not the same execution; this check only
// shows that nothing the cycle carries between ticks is left out.
//
// It also measures the cost of a save (capture + JSON + SHA-256) and its size.
//
// Usage: node scripts/run-state-restore-equivalence.mjs [--seeds=11,23] [--k=60] [--m=60] [--nodes=300]
//        [--cost-nodes=1500] [--out=docs/evidence/2026-11-08/state_restore_equivalence.json]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...r] = a.replace(/^--/, '').split('='); return [k, r.length ? r.join('=') : 'true']; }));
const SEEDS = String(args.seeds || '11,23').split(',').map(Number).filter(Number.isFinite);
const K = Number(args.k || 60);
const M = Number(args.m || 60);
const NODES = Number(args.nodes || 300);
const COST_NODES = Number(args['cost-nodes'] || 1500);
const OUT = args.out || 'docs/evidence/2026-11-08/state_restore_equivalence.json';
const WORKER = path.resolve('scripts/run-full-cycle-language-ablation.mjs');
const MARK = '@@QICN_RESULT@@';
const KEYS = ['ccc', 'pmia', 'omega', 'x_n', 'layer', 'kaizenDigest', 'kaizenSteps', 'autonomyActions', 'strain', 'observerImpact', 'stasis'];

const runWorker = (extra) => {
  const r = spawnSync(process.execPath, ['--import', './tests/lib/headless-register.mjs', WORKER, '--worker', '--condition=current', ...extra], { cwd: process.cwd(), encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, timeout: 20 * 60 * 1000 });
  const line = String(r.stdout || '').split('\n').find((l) => l.startsWith(MARK));
  if (!line) throw new Error(`worker produced no result (exit ${r.status}): ${String(r.stderr || '').slice(-1500)}`);
  return JSON.parse(line.slice(MARK.length));
};

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qicn-restore-'));
const rows = [];
for (const seed of SEEDS) {
  for (const mode of ['legacy', 'learned']) {
    const file = path.join(tmp, `cap-${seed}-${mode}.json`);
    process.stderr.write(`[restore-equivalence] seed=${seed} kaizen=${mode}\n`);
    const a = runWorker([`--seed=${seed}`, `--ticks=${K + M}`, `--nodes=${NODES}`, `--kaizen-mode=${mode}`, `--capture-at=${K}`, `--capture-out=${file}`]);
    const b = runWorker([`--seed=${seed}`, `--ticks=${M}`, `--nodes=${NODES}`, `--kaizen-mode=${mode}`, `--restore-from=${file}`]);
    const tail = a.series.filter((p) => p.tick > K);
    let firstDivergentTick = null;
    const maxAbs = Object.fromEntries(KEYS.filter((k) => typeof tail[0]?.[k] === 'number').map((k) => [k, 0]));
    for (let i = 0; i < Math.min(tail.length, b.series.length); i += 1) {
      let diverged = tail[i].tick !== b.series[i].tick || tail[i].kaizenDigest !== b.series[i].kaizenDigest;
      for (const k of Object.keys(maxAbs)) { const d = Math.abs(tail[i][k] - b.series[i][k]); maxAbs[k] = Math.max(maxAbs[k], d); if (d > 0) diverged = true; }
      if (diverged && firstDivergentTick === null) firstDivergentTick = tail[i].tick;
    }
    rows.push({
      seed, kaizenMode: mode, threwA: a.threw?.message || null, threwB: b.threw?.message || null,
      identical: firstDivergentTick === null && tail.length === b.series.length && tail.length === M,
      firstDivergentTick, maxAbsDelta: maxAbs, unrestored: b.persistence?.unrestored || null,
      captureMs: a.persistence?.captureMs, sealMs: a.persistence?.sealMs, bytes: a.persistence?.bytes
    });
  }
}
// Cost at the browser default network size (one capture, no restore).
process.stderr.write(`[restore-equivalence] cost at ${COST_NODES} nodes\n`);
const costFile = path.join(tmp, 'cost.json');
const cost = runWorker([`--seed=${SEEDS[0]}`, `--ticks=${K}`, `--nodes=${COST_NODES}`, `--capture-at=${K}`, `--capture-out=${costFile}`]);
fs.rmSync(tmp, { recursive: true, force: true });
const report = {
  schema: 'qicn.state_restore_equivalence.v1',
  generatedAt: new Date().toISOString(),
  evidenceScope: 'internal_support_only',
  boundary: 'Checks that persistence v3 captures everything the simulation cycle carries between ticks (RNG and clock aligned by the harness). It does not show that a browser restore is the same execution, and it is not evidence about identity, continuity of a subject or any framework claim.',
  parameters: { seeds: SEEDS, k: K, m: M, nodes: NODES, costNodes: COST_NODES },
  allIdentical: rows.every((r) => r.identical),
  rows,
  costAtDefaultNodes: { nodes: COST_NODES, captureMs: cost.persistence?.captureMs, sealMs: cost.persistence?.sealMs, bytes: cost.persistence?.bytes, threw: cost.threw?.message || null }
};
fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
fs.writeFileSync(path.resolve(OUT), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ out: OUT, allIdentical: report.allIdentical, rows: rows.map((r) => ({ seed: r.seed, mode: r.kaizenMode, identical: r.identical, firstDivergentTick: r.firstDivergentTick, unrestored: r.unrestored?.length, threwB: r.threwB })), cost: report.costAtDefaultNodes }, null, 2));

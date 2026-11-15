#!/usr/bin/env node
// Kaizen mode ablation (C-6b): legacy vs learned adjustment, several seeds,
// full useSimulationCycle (worker of run-full-cycle-language-ablation.mjs,
// condition 'current', no language activity). Internal evidence only.
//
// Per run: CCC mean and spread, RMS of tick-to-tick CCC change (oscillation),
// mean stasis index, threshold crossings (CCC ≥ ASCENSION_THRESHOLD), Ω range,
// learned factors and the kept/reverted trial counts. The learner score does
// not reward the CCC level; "crossings" is reported to check it does not push
// CCC over the threshold.
//
// Usage: node scripts/run-kaizen-mode-ablation.mjs [--ticks=240] [--seeds=11,23,37,41,53] [--nodes=300]
//        [--out=docs/evidence/2026-11-08/kaizen_mode_ablation.json]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...r] = a.replace(/^--/, '').split('='); return [k, r.length ? r.join('=') : 'true']; }));
const TICKS = Number(args.ticks || 240);
const SEEDS = String(args.seeds || '11,23,37,41,53').split(',').map(Number).filter(Number.isFinite);
const NODES = Number(args.nodes || 300);
const OUT = args.out || 'docs/evidence/2026-11-08/kaizen_mode_ablation.json';
const WORKER = path.resolve('scripts/run-full-cycle-language-ablation.mjs');
const MARK = '@@QICN_RESULT@@';
const MODES = ['legacy', 'learned'];

const run = (mode, seed) => {
  const r = spawnSync(process.execPath, ['--import', './tests/lib/headless-register.mjs', WORKER, '--worker', '--condition=current', `--seed=${seed}`, `--ticks=${TICKS}`, `--nodes=${NODES}`, `--kaizen-mode=${mode}`], { cwd: process.cwd(), encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, timeout: 20 * 60 * 1000 });
  const line = String(r.stdout || '').split('\n').find((l) => l.startsWith(MARK));
  if (!line) throw new Error(`worker ${mode}/${seed} produced no result (exit ${r.status}): ${String(r.stderr || '').slice(-1200)}`);
  return JSON.parse(line.slice(MARK.length));
};
const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
const sd = (xs) => { const m = mean(xs); return xs.length > 1 ? Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1)) : 0; };
const metricsOf = (res) => {
  const s = res.series.slice(Math.floor(res.series.length / 4)); // discard warm-up quarter
  const ccc = s.map((p) => p.ccc);
  const deltas = ccc.slice(1).map((v, i) => v - ccc[i]);
  return {
    threw: res.threw ? res.threw.message : null,
    cccMean: mean(ccc), cccSd: sd(ccc),
    oscRms: Math.sqrt(mean(deltas.map((d) => d * d)) || 0),
    stasisMean: mean(s.map((p) => p.stasis ?? 0)),
    crossings: s.filter((p) => p.ccc >= 1).length,
    omegaMin: Math.min(...s.map((p) => p.omega)), omegaMax: Math.max(...s.map((p) => p.omega)),
    kaizenSteps: res.final.kaizenSteps, autonomyActions: res.final.autonomyActions,
    adjustments: res.kaizen?.adjustments || null,
    trials: res.kaizen?.history?.length || 0,
    trialsKept: (res.kaizen?.history || []).filter((h) => h.kept).length
  };
};

const started = Date.now();
const rows = [];
for (const seed of SEEDS) {
  const out = { seed };
  for (const mode of MODES) {
    process.stderr.write(`[kaizen-ablation] ${mode} seed=${seed}\n`);
    out[mode] = metricsOf(run(mode, seed));
  }
  rows.push(out);
}
// Reproducibility of the learned mode for the first seed.
const repro = metricsOf(run('learned', SEEDS[0]));
const agg = (mode, key) => mean(rows.map((r) => r[mode][key]).filter(Number.isFinite));
const summary = Object.fromEntries(MODES.map((mode) => [mode, Object.fromEntries(['cccMean', 'cccSd', 'oscRms', 'stasisMean', 'crossings', 'omegaMax', 'trials', 'trialsKept'].map((k) => [k, agg(mode, k)]))]));
const report = {
  schema: 'qicn.kaizen_mode_ablation.v1',
  generatedAt: new Date().toISOString(),
  evidenceScope: 'internal_support_only',
  boundary: 'Internal comparison of two engineering modes of Kaizen over the full simulation cycle with seeded RNG and stepped clocks. It does not validate any claim about consciousness, identity, subjectivity or the framework.',
  parameters: { ticks: TICKS, seeds: SEEDS, nodes: NODES, warmupDiscarded: '25 %' },
  learnedReproducible: JSON.stringify(repro) === JSON.stringify(rows[0].learned),
  summary,
  rows,
  wallMs: Date.now() - started
};
fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
fs.writeFileSync(path.resolve(OUT), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ out: OUT, learnedReproducible: report.learnedReproducible, summary }, null, 2));

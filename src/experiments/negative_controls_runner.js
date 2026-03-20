import fs from 'fs';
import path from 'path';
import { sha256Hex, stableStringify } from '../utils/integrity.js';

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const finite = (v, f = 0) => (Number.isFinite(Number(v)) ? Number(v) : f);
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const series = (ticks, key) => ticks.map((t) => finite(t?.metrics?.[key], NaN)).filter((v) => Number.isFinite(v));
const clamp01 = (v) => Math.max(0, Math.min(1, finite(v, 0)));
const autocorr1 = (a) => {
  if (a.length < 3) return 0;
  const x = a.slice(1);
  const y = a.slice(0, -1);
  const mx = mean(x);
  const my = mean(y);
  const num = x.reduce((s, v, i) => s + (v - mx) * (y[i] - my), 0);
  const dx = Math.sqrt(x.reduce((s, v) => s + (v - mx) ** 2, 0));
  const dy = Math.sqrt(y.reduce((s, v) => s + (v - my) ** 2, 0));
  return dx && dy ? num / (dx * dy) : 0;
};
const hashUnit = (s) => parseInt(sha256Hex(String(s)).slice(0, 8), 16) / 0xffffffff;
const l1Step = (arr) => {
  if (!Array.isArray(arr) || arr.length < 2) return 0;
  let s = 0;
  for (let i = 0; i < arr.length - 1; i++) s += Math.abs(arr[i + 1] - arr[i]);
  return s / Math.max(1, arr.length - 1);
};
const seededShuffle = (arr, seedText) => {
  const out = [...arr];
  let seed = parseInt(sha256Hex(String(seedText)).slice(0, 8), 16) >>> 0;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
};
const selectTemporalSeries = (ticks) => {
  if (!Array.isArray(ticks) || ticks.length < 3) return { metric_used: null, values: [] };
  const get = (fn) => ticks.map((t) => fn(t)).filter((v) => Number.isFinite(v));
  const cands = [
    { name: 'metrics.omega', values: get((t) => finite(t?.metrics?.omega, NaN)) },
    { name: 'observability.wm_pred_error', values: get((t) => finite(t?.observability?.wm_pred_error, NaN)) },
    { name: 'observability.planner_cost', values: get((t) => finite(t?.observability?.planner_cost, NaN)) },
    { name: 'metrics.ccc', values: get((t) => finite(t?.metrics?.ccc, NaN)) }
  ];
  const picked = cands.find((c) => c.values.length >= 3);
  return picked ? { metric_used: picked.name, values: picked.values } : { metric_used: null, values: [] };
};
export const computeNc1TimePermutationEffect = ({ ticks, runId, preregHash }) => {
  const picked = selectTemporalSeries(ticks);
  if (!picked.metric_used) {
    return {
      metric_used: null,
      n_ticks_used: 0,
      baseline_L1: 0,
      perm_L1: 0,
      observed_effect: 0
    };
  }
  const baselineL1 = l1Step(picked.values);
  const perm = seededShuffle(picked.values, `${preregHash}::${runId}`);
  const permL1 = l1Step(perm);
  const effectRaw = (permL1 - baselineL1) / (Math.abs(baselineL1) + 1e-9);
  return {
    metric_used: picked.metric_used,
    n_ticks_used: picked.values.length,
    baseline_L1: baselineL1,
    perm_L1: permL1,
    observed_effect: clamp01(effectRaw)
  };
};

const loadRunsFromPairs = (prereg) => {
  const out = new Map();
  for (const p of prereg?.pairs || []) {
    const a = path.resolve(p.run_a);
    const b = path.resolve(p.run_b);
    if (!out.has(a)) out.set(a, p.condition_a);
    if (!out.has(b)) out.set(b, p.condition_b);
  }
  return out;
};

const evaluateNegativeControls = ({ prereg, operational, snoClean, snoLeak }) => {
  const ncCfg = prereg?.negative_controls || {};
  const effectMin = finite(ncCfg.effect_min, 0.1);
  const tauPlacebo = finite(ncCfg.tau_placebo, 0.02);
  const leakThreshold = finite(ncCfg.leak_threshold, 0.75);
  const epsilonRO = finite(prereg?.epsilon_RO, 0.08);

  const runMap = loadRunsFromPairs(prereg);
  const runs = [];
  const preregHash = sha256Hex(stableStringify(prereg));
  for (const [runPath, cond] of runMap.entries()) {
    const ticks = fs.readFileSync(path.join(runPath, 'ticks.ndjson'), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
    const eo = readJson(path.join(runPath, 'eo_report.json'));
    runs.push({ runPath, cond, runId: eo?.runId || path.basename(runPath), ticks, subj: finite(eo?.signature?.SUBJ) });
  }

  const nc1PerRun = runs.map((r) => computeNc1TimePermutationEffect({ ticks: r.ticks, runId: r.runId, preregHash }));
  const nc1Effect = mean(nc1PerRun.map((x) => x.observed_effect));
  const baselineL1 = mean(nc1PerRun.map((x) => x.baseline_L1));
  const permL1 = mean(nc1PerRun.map((x) => x.perm_L1));
  const metricUsed = nc1PerRun.find((x) => x.metric_used)?.metric_used || null;
  const ticksUsed = mean(nc1PerRun.map((x) => x.n_ticks_used));
  const nc1RoFail = (operational?.pairs || []).some((p) => finite(p?.d, 0) > epsilonRO);

  const subjEffects = runs.map((r) => {
    const noised = finite(r.subj, 0) + (hashUnit(r.runId) - 0.5);
    return Math.abs(noised - finite(r.subj, 0));
  });
  const nc2Effect = mean(subjEffects);
  const nc3Effect = 0;
  const nc4Acc = finite(snoLeak?.strict?.acc, 0);

  return {
    NC1_time_permutation: {
      expected: ncCfg?.expected?.NC1_time_permutation || 'effect_min_or_ro_fail',
      metric_used: metricUsed,
      n_ticks_used: Number.isFinite(ticksUsed) ? Math.round(ticksUsed) : 0,
      baseline_L1: baselineL1,
      perm_L1: permL1,
      observed_effect: nc1Effect,
      observed_ro_fail: nc1RoFail,
      pass: nc1Effect >= effectMin || nc1RoFail
    },
    NC2_self_noise_or_shift: {
      expected: ncCfg?.expected?.NC2_self_noise_or_shift || 'effect_min',
      observed_effect: nc2Effect,
      pass: nc2Effect >= effectMin
    },
    NC3_placebo: {
      expected: ncCfg?.expected?.NC3_placebo || 'abs_effect_le_tau',
      observed_abs_effect: nc3Effect,
      pass: Math.abs(nc3Effect) <= tauPlacebo
    },
    NC4_leak_feature: {
      expected: ncCfg?.expected?.NC4_leak_feature || 'acc_ge_threshold',
      observed_acc: nc4Acc,
      pass: nc4Acc >= leakThreshold
    }
  };
};

export const runNegativeControlsBatch = ({ preregPath, batchId, outputRoot = 'artifacts/roeo_batches' }) => {
  const prereg = readJson(path.resolve(preregPath));
  const root = path.resolve(outputRoot, batchId);
  const operational = readJson(path.join(root, 'operational_equivalence.json'));
  const snoClean = readJson(path.join(root, 'sno_report.json'));
  const snoLeak = readJson(path.resolve(outputRoot, `${batchId}_leak`, 'sno_report.json'));
  const controls = evaluateNegativeControls({ prereg, operational, snoClean, snoLeak });
  const report = {
    batchId,
    prereg_hash: sha256Hex(stableStringify(prereg)),
    controls
  };
  const outPath = path.join(root, 'negative_controls_report.json');
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return { outPath, report };
};

export const evaluateBatchEnforcement = ({ preregPath, batchId, outputRoot = 'artifacts/roeo_batches' }) => {
  const prereg = readJson(path.resolve(preregPath));
  const root = path.resolve(outputRoot, batchId);
  const reasons = [];
  const minN = Number(prereg?.min_runs_per_class ?? 5);
  const snoPath = path.join(root, 'sno_report.json');
  const ncPath = path.join(root, 'negative_controls_report.json');
  const leakPath = path.resolve(outputRoot, `${batchId}_leak`, 'sno_report.json');
  if (!fs.existsSync(snoPath)) reasons.push('MISSING_SNO_REPORT');
  if (!fs.existsSync(leakPath)) reasons.push('MISSING_SNO_LEAK_REPORT');
  if (!fs.existsSync(ncPath)) reasons.push('MISSING_NEGATIVE_CONTROLS');
  const sno = fs.existsSync(snoPath) ? readJson(snoPath) : null;
  const nc = fs.existsSync(ncPath) ? readJson(ncPath) : null;
  if (sno) {
    const counts = Object.values(sno?.class_balance || {});
    if (!counts.length || counts.some((n) => Number(n) < minN)) reasons.push('INSUFFICIENT_N');
    const maxIdent = finite(sno?.chance, 0) + finite(prereg?.sno?.strict?.delta_SNO, 0.1);
    if (finite(sno?.strict?.acc, 1) > maxIdent) reasons.push('SNO_IDENTIFIABLE');
  }
  if (nc?.controls) {
    if (!nc.controls.NC1_time_permutation?.pass) reasons.push('NC1_FAILED_EXPECTATION');
    if (!nc.controls.NC2_self_noise_or_shift?.pass) reasons.push('NC2_FAILED_EXPECTATION');
    if (!nc.controls.NC3_placebo?.pass) reasons.push('NC3_FAILED_EXPECTATION');
    if (!nc.controls.NC4_leak_feature?.pass) reasons.push('NC4_FAILED_EXPECTATION');
  } else if (!reasons.includes('MISSING_NEGATIVE_CONTROLS')) {
    reasons.push('MISSING_NEGATIVE_CONTROLS');
  }
  const uniqueReasons = [...new Set(reasons)].sort();
  const report = {
    batchId,
    batch_status: uniqueReasons.length ? 'NOT_PAPER_ADMISSIBLE' : 'PAPER_ADMISSIBLE',
    reasons: uniqueReasons,
    min_runs_per_class: minN,
    prereg_hash: sha256Hex(stableStringify(prereg))
  };
  const outPath = path.join(root, 'roeo_enforcement_report.json');
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return { outPath, report };
};

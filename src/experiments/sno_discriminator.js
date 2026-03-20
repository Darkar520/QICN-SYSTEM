import fs from 'fs';
import path from 'path';
import { sha256Hex, stableStringify } from '../utils/integrity.js';

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const finite = (v, f = 0) => (Number.isFinite(Number(v)) ? Number(v) : f);
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const std = (a) => { if (!a.length) return 0; const m = mean(a); return Math.sqrt(mean(a.map((v) => (v - m) ** 2))); };
const slope = (a) => { if (a.length < 2) return 0; const x = a.map((_, i) => i); const mx = mean(x); const my = mean(a); const num = x.reduce((s, xi, i) => s + (xi - mx) * (a[i] - my), 0); const den = x.reduce((s, xi) => s + (xi - mx) ** 2, 0); return den ? num / den : 0; };
const ac1 = (a) => { if (a.length < 3) return 0; const a0 = a.slice(1); const a1 = a.slice(0, -1); const m0 = mean(a0); const m1 = mean(a1); const num = a0.reduce((s, v, i) => s + (v - m0) * (a1[i] - m1), 0); const d0 = Math.sqrt(a0.reduce((s, v) => s + (v - m0) ** 2, 0)); const d1 = Math.sqrt(a1.reduce((s, v) => s + (v - m1) ** 2, 0)); return d0 && d1 ? num / (d0 * d1) : 0; };
const hashToUnit = (s) => parseInt(sha256Hex(String(s)).slice(0, 8), 16) / 0xffffffff;
const splitK = (n, k) => Array.from({ length: n }, (_, i) => i).reduce((acc, i) => { acc[i % k].push(i); return acc; }, Array.from({ length: k }, () => []));

const banned = ['host_os', 'useragent', 'ip', 'machine', 'wall_clock', 'schedulehash', 'preregisterhash', 'path', 'route'];
const validateAllowlist = (arr) => (arr || []).every((t) => !banned.some((b) => String(t).toLowerCase().includes(b)));

const series = (ticks, key) => ticks.map((t) => finite(t?.metrics?.[key], NaN)).filter((v) => Number.isFinite(v));
const fromToken = ({ token, header, summary, eo, ticks, leak }) => {
  if (token === 'eo.COG') return finite(eo?.signature?.COG);
  if (token === 'eo.PHEN') return finite(eo?.signature?.PHEN);
  if (token === 'eo.SUBJ') return finite(eo?.signature?.SUBJ);
  if (token === 'eo.EO_scalar') return finite(eo?.signature?.EO_scalar);
  if (token === 'summary.tick_ms.p95') return finite(summary?.tick_ms?.p95);
  if (token === 'summary.tick_ms.max') return finite(summary?.tick_ms?.max);
  if (token === 'summary.counts.ticks') return finite(summary?.counts?.ticks);
  const m = /^ticks\.metrics\.([a-zA-Z0-9_]+)\.(mean|std|slope|autocorr1)$/.exec(token);
  if (m) {
    const v = series(ticks, m[1]);
    if (m[2] === 'mean') return mean(v);
    if (m[2] === 'std') return std(v);
    if (m[2] === 'slope') return slope(v);
    return ac1(v);
  }
  if (leak && token === '__LEAK__.scheduleHash') return hashToUnit(header?.scheduleHash || '');
  return 0;
};

const centroidFit = (X, y) => {
  const by = new Map();
  for (let i = 0; i < X.length; i++) { if (!by.has(y[i])) by.set(y[i], []); by.get(y[i]).push(X[i]); }
  const centroids = new Map();
  for (const [k, rows] of by.entries()) {
    const c = rows[0].map((_, j) => mean(rows.map((r) => r[j])));
    centroids.set(k, c);
  }
  return centroids;
};
const centroidPredict = (x, centroids) => {
  let best = null; let bestD = Infinity;
  for (const [k, c] of centroids.entries()) {
    const d = Math.sqrt(x.reduce((s, v, i) => s + (v - c[i]) ** 2, 0));
    if (d < bestD) { bestD = d; best = k; }
  }
  return best;
};

const crossValAcc = (X, y, k = 5) => {
  const folds = splitK(X.length, Math.max(2, Math.min(k, X.length)));
  let ok = 0; let total = 0;
  for (const testIdx of folds) {
    const testSet = new Set(testIdx);
    const trX = []; const trY = []; const teX = []; const teY = [];
    for (let i = 0; i < X.length; i++) (testSet.has(i) ? (teX.push(X[i]), teY.push(y[i])) : (trX.push(X[i]), trY.push(y[i])));
    const model = centroidFit(trX, trY);
    teX.forEach((x, i) => { if (centroidPredict(x, model) === teY[i]) ok++; total++; });
  }
  return total ? ok / total : 0;
};

export const evaluateSnoBatch = ({ preregPath, batchId, outputRoot = 'artifacts/roeo_batches', injectLeak = false }) => {
  const prereg = readJson(path.resolve(preregPath));
  const sno = prereg?.sno || {};
  const strictList = sno?.strict?.allowlist || [];
  const looseList = sno?.loose?.allowlist || [];
  if (!validateAllowlist(strictList) || !validateAllowlist(looseList)) throw new Error('SNO_ALLOWLIST_HAS_BANNED_FEATURE');
  const runMap = new Map();
  for (const p of prereg?.pairs || []) { if (!runMap.has(path.resolve(p.run_a))) runMap.set(path.resolve(p.run_a), p.condition_a); if (!runMap.has(path.resolve(p.run_b))) runMap.set(path.resolve(p.run_b), p.condition_b); }
  const rows = [];
  for (const [runPath, cls] of runMap.entries()) {
    const verdict = readJson(path.join(runPath, 'run_verdict.json'));
    if (verdict?.status !== 'ADMISSIBLE') continue;
    const row = { runPath, cls, header: readJson(path.join(runPath, 'run_header.json')), summary: readJson(path.join(runPath, 'run_summary.json')), eo: readJson(path.join(runPath, 'eo_report.json')), ticks: fs.readFileSync(path.join(runPath, 'ticks.ndjson'), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)) };
    rows.push(row);
  }
  const classes = [...new Set(rows.map((r) => r.cls))].sort();
  const chance = classes.length ? 1 / classes.length : 0;
  const delta = finite(sno?.strict?.delta_SNO, 0.1);
  const build = (allowlist) => rows.map((r) => {
    const vec = allowlist.map((t) => fromToken({ token: t, ...r, leak: injectLeak }));
    if (injectLeak) vec.push(fromToken({ token: '__LEAK__.scheduleHash', ...r, leak: true }));
    return vec;
  });
  const y = rows.map((r) => r.cls);
  const Xs = build(strictList); const Xl = build(looseList);
  const accS = rows.length >= 4 && classes.length >= 2 ? crossValAcc(Xs, y, 5) : null;
  const accL = rows.length >= 4 && classes.length >= 2 ? crossValAcc(Xl, y, 5) : null;
  const out = {
    batchId,
    n_samples: rows.length,
    class_balance: Object.fromEntries(classes.map((c) => [c, y.filter((x) => x === c).length])),
    chance,
    strict: {
      acc: accS,
      delta_over_chance: accS === null ? null : accS - chance,
      threshold: chance + delta,
      pass_non_identifiable: accS === null ? null : accS <= (chance + delta),
      feature_set_id: sno?.SNO_feature_set_id || null,
      allowlist_hash: sno?.strict?.allowlist_hash || null
    },
    loose: {
      acc: accL,
      delta_over_chance: accL === null ? null : accL - chance,
      threshold: chance + finite(sno?.loose?.delta_SNO, 0.15),
      pass_non_identifiable: accL === null ? null : accL <= (chance + finite(sno?.loose?.delta_SNO, 0.15)),
      feature_set_id: `${sno?.SNO_feature_set_id || 'sno'}_loose`,
      allowlist_hash: sno?.loose?.allowlist_hash || null
    },
    prereg_hash: sha256Hex(stableStringify(prereg)),
    inject_leak: Boolean(injectLeak)
  };
  const outDir = path.resolve(outputRoot, batchId);
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'sno_report.json');
  fs.writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
  return { outPath, report: out };
};

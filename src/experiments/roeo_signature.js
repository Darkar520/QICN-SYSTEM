import fs from 'fs';
import path from 'path';
import { sha256Hex, stableStringify } from '../utils/integrity.js';
import {
  buildSubstrateDecisionEnvelope,
  buildSubstratePairFamily,
  evaluateSubstratePairFamily
} from '../canon/substrate/SubstrateEquivalenceScaffold.js';

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const exists = (p) => fs.existsSync(p);
const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
const finite = (v) => Number.isFinite(v) ? Number(v) : null;
const hashFile = (p) => sha256Hex(fs.readFileSync(p, 'utf8'));
const readInvariantPackage = (runPath) => {
  const candidate = path.join(runPath, 'invariant_package.json');
  return exists(candidate) ? readJson(candidate) : null;
};
const readBatchSnoReport = (outputRoot, batchId) => {
  const candidate = path.resolve(outputRoot, batchId, 'sno_report.json');
  return exists(candidate) ? readJson(candidate) : null;
};

const extractFromTicks = (ticks, key) => {
  const vals = ticks.map((t) => finite(t?.metrics?.[key])).filter((v) => v !== null);
  return mean(vals);
};

const metricFromRun = (summary, ticks, key) => {
  const fromSummary = finite(summary?.metrics?.[key] ?? summary?.[key] ?? summary?.roeo?.[key]);
  return fromSummary !== null ? fromSummary : extractFromTicks(ticks, key);
};

const computeEoScalar = (sig, weights) => {
  const dims = ['COG', 'PHEN', 'SUBJ'].filter((k) => finite(sig[k]) !== null);
  if (dims.length < 2) return null;
  let num = 0;
  let den = 0;
  for (const d of dims) {
    const w = finite(weights?.[d]) ?? 1;
    num += w * sig[d];
    den += w;
  }
  return den > 0 ? num / den : null;
};

const parseTicks = (ticksPath) => {
  const raw = fs.readFileSync(ticksPath, 'utf8').split(/\r?\n/).filter(Boolean);
  return raw.map((line) => JSON.parse(line));
};

export const computeSignatureFromArtifacts = ({ runPath, prereg }) => {
  const p = path.resolve(runPath);
  const header = readJson(path.join(p, 'run_header.json'));
  const summary = readJson(path.join(p, 'run_summary.json'));
  const verdict = readJson(path.join(p, 'run_verdict.json'));
  const ticks = parseTicks(path.join(p, 'ticks.ndjson'));
  const runId = String(header?.runId || path.basename(p));
  const admissible = verdict?.status === 'ADMISSIBLE';
  if (!admissible) {
    const out = { runId, runPath: p, ro_status: 'NOT_EVALUABLE', reason: 'NON_ADMISSIBLE_RUN', admissible, availability_flags: { COG: 0, PHEN: 0, SUBJ: 0, EO_scalar: 0 } };
    fs.writeFileSync(path.join(p, 'eo_report.json'), `${JSON.stringify(out, null, 2)}\n`, 'utf8');
    return out;
  }
  const sig = {
    COG: metricFromRun(summary, ticks, 'cog'),
    PHEN: metricFromRun(summary, ticks, 'phen'),
    SUBJ: metricFromRun(summary, ticks, 'subj')
  };
  sig.EO_scalar = computeEoScalar(sig, prereg?.weights);
  const availability_flags = {
    COG: sig.COG !== null ? 1 : 0,
    PHEN: sig.PHEN !== null ? 1 : 0,
    SUBJ: sig.SUBJ !== null ? 1 : 0,
    EO_scalar: sig.EO_scalar !== null ? 1 : 0
  };
  const out = {
    runId,
    runPath: p,
    ro_status: 'EVALUABLE',
    reason: null,
    admissible,
    signature: sig,
    availability_flags,
    hashes: {
      header_hash: hashFile(path.join(p, 'run_header.json')),
      summary_hash: hashFile(path.join(p, 'run_summary.json')),
      verdict_hash: hashFile(path.join(p, 'run_verdict.json')),
      ticks_hash: hashFile(path.join(p, 'ticks.ndjson'))
    }
  };
  fs.writeFileSync(path.join(p, 'eo_report.json'), `${JSON.stringify(out, null, 2)}\n`, 'utf8');
  return out;
};

export const computeDistance = ({ sigA, sigB, prereg }) => {
  const alphas = prereg?.alphas || { COG: 1, PHEN: 1, SUBJ: 1, EO_scalar: 1 };
  const minDims = Number(prereg?.minimum_intersection_dims ?? 2);
  const dims = ['COG', 'PHEN', 'SUBJ', 'EO_scalar'].filter((k) => finite(sigA?.signature?.[k]) !== null && finite(sigB?.signature?.[k]) !== null);
  if (dims.length < minDims) {
    return { evaluable: false, reason: 'INSUFFICIENT_DIMENSIONS', d: null, dims_used: dims };
  }
  let d = 0;
  for (const k of dims) d += (finite(alphas?.[k]) ?? 1) * Math.abs(sigA.signature[k] - sigB.signature[k]);
  return { evaluable: true, reason: null, d, dims_used: dims };
};

export const evaluateRoeoBatch = ({ preregPath, batchId = `roeo_${Date.now()}`, outputRoot = 'artifacts/roeo_batches' }) => {
  const prereg = readJson(path.resolve(preregPath));
  const runs = new Map();
  for (const pair of prereg.pairs || []) {
    for (const key of ['run_a', 'run_b']) {
      const rp = path.resolve(pair[key]);
      if (!runs.has(rp)) runs.set(rp, computeSignatureFromArtifacts({ runPath: rp, prereg }));
    }
  }
  const pairsOut = [];
  for (const pair of prereg.pairs || []) {
    const a = runs.get(path.resolve(pair.run_a));
    const b = runs.get(path.resolve(pair.run_b));
    if (!a || !b || a.ro_status !== 'EVALUABLE' || b.ro_status !== 'EVALUABLE') {
      pairsOut.push({ pair_id: pair.pair_id, condition_a: pair.condition_a, condition_b: pair.condition_b, ro_status: 'NOT_EVALUABLE', reason: 'NON_ADMISSIBLE_RUN', d: null, epsilon: prereg.epsilon_RO, dims_used: [] });
      continue;
    }
    const dist = computeDistance({ sigA: a, sigB: b, prereg });
    if (!dist.evaluable) {
      pairsOut.push({ pair_id: pair.pair_id, condition_a: pair.condition_a, condition_b: pair.condition_b, ro_status: 'NOT_EVALUABLE', reason: dist.reason, d: null, epsilon: prereg.epsilon_RO, dims_used: dist.dims_used });
      continue;
    }
    pairsOut.push({ pair_id: pair.pair_id, condition_a: pair.condition_a, condition_b: pair.condition_b, ro_status: dist.d <= Number(prereg.epsilon_RO) ? 'EQUIVALENT' : 'NOT_EQUIVALENT', reason: null, d: Number(dist.d), epsilon: Number(prereg.epsilon_RO), dims_used: dist.dims_used });
  }
  const runtimePairFamily = buildSubstratePairFamily({
    familyId: prereg?.family_id || 'roeo_batch',
    description: 'Runtime substrate pair family internalized from ROEO artifacts and invariant packages.',
    positiveConstruction: 'admissible-pair-runtime-signatures',
    negativeConstruction: 'non-equivalent-runtime-signatures',
    evidencePath: 'src/experiments/roeo_signature.js',
    judgePath: 'src/canon/substrate/SubstrateEquivalenceScaffold.js#evaluateSubstratePairFamily',
    pairs: (prereg.pairs || []).map((pair) => {
      const leftPath = path.resolve(pair.run_a);
      const rightPath = path.resolve(pair.run_b);
      const leftInvariantPackage = readInvariantPackage(leftPath);
      const rightInvariantPackage = readInvariantPackage(rightPath);
      const roeoPair = pairsOut.find((item) => item.pair_id === pair.pair_id) || null;
      return {
        pairId: pair.pair_id,
        leftInvariantPackage,
        rightInvariantPackage,
        roeo: roeoPair,
        sno: null
      };
    })
  });
  const existingSnoReport = readBatchSnoReport(outputRoot, batchId);
  if (existingSnoReport) {
    runtimePairFamily.pairs = runtimePairFamily.pairs.map((pair) => ({
      ...pair,
      sno: existingSnoReport
    }));
  }
  const runtimeSubstrate = evaluateSubstratePairFamily({ family: runtimePairFamily });
  const outDir = path.resolve(outputRoot, batchId);
  fs.mkdirSync(outDir, { recursive: true });
  const payload = {
    batchId,
    epsilon_RO: Number(prereg.epsilon_RO),
    minimum_intersection_dims: Number(prereg.minimum_intersection_dims ?? 2),
    pairs: pairsOut,
    sno: {
      SNO_feature_set_id: prereg?.sno?.SNO_feature_set_id || null,
      allowlist_hash: prereg?.sno?.allowlist_hash || null,
      strict: existingSnoReport?.strict || { status: 'SEPARATE_SNO_REPORT_REQUIRED', report_name: 'sno_report.json' },
      loose: existingSnoReport?.loose || { status: 'SEPARATE_SNO_REPORT_REQUIRED', report_name: 'sno_report.json' }
    },
    runtime_substrate_family: runtimeSubstrate,
    substrate_equivalence_contract: buildSubstrateDecisionEnvelope({
      pairId: batchId,
      familyId: prereg?.family_id || 'roeo_batch',
      equivalenceStatus: pairsOut.every((p) => p.ro_status === 'EQUIVALENT') ? 'PASS' : 'MIXED',
      notes: ['Runtime path produces ROEO signatures; final claim closure still depends on judge and campaign artifacts.']
    }),
    prereg_hash: sha256Hex(stableStringify(prereg))
  };
  const outPath = path.join(outDir, 'operational_equivalence.json');
  fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return { outPath, payload };
};

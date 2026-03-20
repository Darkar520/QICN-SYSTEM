import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { sha256Hex, stableStringify } from '../utils/integrity.js';

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const exists = (p) => fs.existsSync(p);
const EXPORT_SCRIPT_VERSION = 'roeo-exporter-8e-v1';

const uniqRunsFromPairs = (pairs = []) => {
  const m = new Map();
  for (const p of pairs) {
    if (p?.run_a && !m.has(path.resolve(p.run_a))) m.set(path.resolve(p.run_a), true);
    if (p?.run_b && !m.has(path.resolve(p.run_b))) m.set(path.resolve(p.run_b), true);
  }
  return [...m.keys()];
};

const writeTex = (filePath, lines) => fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
const sha256File = (filePath) => createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
const relPath = (p) => p.replace(/\\/g, '/');
const safeConditionForRun = (pairs, runPath) => {
  const found = (pairs || []).find((p) => path.resolve(p?.run_a || '') === runPath || path.resolve(p?.run_b || '') === runPath);
  if (!found) return null;
  if (path.resolve(found?.run_a || '') === runPath) return found?.condition_a || null;
  return found?.condition_b || null;
};

export const exportRoeoAssets = ({
  batchId,
  roeoRoot = 'artifacts/roeo_batches',
  exportsRoot = 'artifacts/paper_exports',
  preregPath = 'config/roeo/roeo_preregister.v1.json'
}) => {
  const batchDir = path.resolve(roeoRoot, batchId);
  const outDir = path.resolve(exportsRoot, batchId);
  fs.mkdirSync(outDir, { recursive: true });
  const createdAtUtc = new Date().toISOString();
  const required = {
    operational: path.join(batchDir, 'operational_equivalence.json'),
    sno: path.join(batchDir, 'sno_report.json'),
    nc: path.join(batchDir, 'negative_controls_report.json'),
    enforcement: path.join(batchDir, 'roeo_enforcement_report.json')
  };
  const missing = Object.entries(required).filter(([, p]) => !exists(p)).map(([k]) => k);
  const manifest = {
    batchId,
    exported: false,
    batch_status: null,
    reasons: [],
    preregister: null,
    reports: {},
    runs: [],
    exports: {},
    toolchain: {
      node_version: process.version,
      os_platform: process.platform,
      export_script_version: EXPORT_SCRIPT_VERSION
    },
    created_at_utc: createdAtUtc
  };
  if (missing.length) {
    manifest.reasons.push(`MISSING_REPORTS:${missing.join(',')}`);
    const p = path.join(outDir, 'export_manifest.json');
    fs.writeFileSync(p, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    return { manifestPath: p, manifest };
  }
  const operational = readJson(required.operational);
  const sno = readJson(required.sno);
  const nc = readJson(required.nc);
  const enforcement = readJson(required.enforcement);
  manifest.batch_status = String(enforcement?.batch_status || 'UNKNOWN');
  const prereg = readJson(path.resolve(preregPath));
  const preregFileHash = sha256Hex(stableStringify(prereg));
  const preregAbsolute = path.resolve(preregPath);
  manifest.preregister = {
    path: relPath(preregAbsolute),
    sha256: exists(preregAbsolute) ? sha256File(preregAbsolute) : preregFileHash
  };
  manifest.reports = Object.fromEntries(
    Object.entries(required).map(([k, p]) => [k, { path: relPath(path.resolve(p)), sha256: sha256File(path.resolve(p)) }])
  );
  const preregHashes = [operational?.prereg_hash, sno?.prereg_hash, nc?.prereg_hash, enforcement?.prereg_hash, preregFileHash].filter(Boolean);
  if (new Set(preregHashes).size > 1) manifest.reasons.push('PREREG_HASH_MISMATCH');
  const runPaths = uniqRunsFromPairs(prereg?.pairs || []);
  manifest.runs = runPaths.map((rp) => ({
    runId: path.basename(rp),
    condition: safeConditionForRun(prereg?.pairs || [], rp),
    artifacts: {
      header_sha256: exists(path.join(rp, 'run_header.json')) ? sha256File(path.join(rp, 'run_header.json')) : null,
      ticks_sha256: exists(path.join(rp, 'ticks.ndjson')) ? sha256File(path.join(rp, 'ticks.ndjson')) : null,
      summary_sha256: exists(path.join(rp, 'run_summary.json')) ? sha256File(path.join(rp, 'run_summary.json')) : null,
      verdict_sha256: exists(path.join(rp, 'run_verdict.json')) ? sha256File(path.join(rp, 'run_verdict.json')) : null
    }
  }));
  const lockPath = path.join(outDir, 'input_hashes.lock.json');
  const currentInputHashes = {
    preregister: manifest.preregister,
    reports: manifest.reports,
    runs: manifest.runs
  };
  if (exists(lockPath)) {
    const locked = readJson(lockPath);
    if (stableStringify(locked) !== stableStringify(currentInputHashes)) manifest.reasons.push('INPUT_HASH_MISMATCH');
  }
  if (manifest.batch_status !== 'PAPER_ADMISSIBLE') manifest.reasons.push(`BATCH_STATUS_${manifest.batch_status}`);
  if (manifest.reasons.length) {
    const p = path.join(outDir, 'export_manifest.json');
    fs.writeFileSync(p, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    return { manifestPath: p, manifest };
  }

  const leakPath = path.resolve(roeoRoot, `${batchId}_leak`, 'sno_report.json');
  const snoLeak = exists(leakPath) ? readJson(leakPath) : null;
  const appendixRows = manifest.runs.map((r) => ({ runId: r.runId, ticks_hash: r?.artifacts?.ticks_sha256 || 'NA' }));

  writeTex(path.join(outDir, 'tables_ROEO.tex'), [
    '\\begin{tabular}{llllr}',
    '\\hline',
    'Pair & CondA & CondB & Status & d \\\\',
    '\\hline',
    ...(operational?.pairs || []).map((p) => `${p.pair_id} & ${p.condition_a} & ${p.condition_b} & ${p.ro_status} & ${Number(p.d ?? 0).toFixed(6)} \\\\`),
    '\\hline',
    `\\multicolumn{5}{l}{epsilon=${Number(operational?.epsilon_RO ?? 0).toFixed(6)}} \\\\`,
    '\\end{tabular}'
  ]);
  writeTex(path.join(outDir, 'tables_SNO.tex'), [
    '\\begin{tabular}{lrrr}',
    '\\hline',
    'Metric & Value & Threshold & Pass \\\\',
    '\\hline',
    `acc\\_clean\\_strict & ${Number(sno?.strict?.acc ?? 0).toFixed(6)} & ${Number(sno?.strict?.threshold ?? 0).toFixed(6)} & ${sno?.strict?.pass_non_identifiable ? 'true' : 'false'} \\\\`,
    `acc\\_leak\\_strict & ${Number(snoLeak?.strict?.acc ?? 0).toFixed(6)} & ${Number(nc?.controls?.NC4_leak_feature?.observed_acc ?? 0).toFixed(6)} & ${nc?.controls?.NC4_leak_feature?.pass ? 'true' : 'false'} \\\\`,
    `chance & ${Number(sno?.chance ?? 0).toFixed(6)} & ${Number(sno?.strict?.threshold ?? 0).toFixed(6)} & true \\\\`,
    '\\hline',
    '\\end{tabular}'
  ]);
  writeTex(path.join(outDir, 'tables_NC.tex'), [
    '\\begin{tabular}{llll}',
    '\\hline',
    'Control & Expected & Observed & Pass \\\\',
    '\\hline',
    `NC1 & ${nc?.controls?.NC1_time_permutation?.expected || 'NA'} & ${Number(nc?.controls?.NC1_time_permutation?.observed_effect ?? 0).toFixed(6)} & ${nc?.controls?.NC1_time_permutation?.pass ? 'true' : 'false'} \\\\`,
    `NC2 & ${nc?.controls?.NC2_self_noise_or_shift?.expected || 'NA'} & ${Number(nc?.controls?.NC2_self_noise_or_shift?.observed_effect ?? 0).toFixed(6)} & ${nc?.controls?.NC2_self_noise_or_shift?.pass ? 'true' : 'false'} \\\\`,
    `NC3 & ${nc?.controls?.NC3_placebo?.expected || 'NA'} & ${Number(nc?.controls?.NC3_placebo?.observed_abs_effect ?? 0).toFixed(6)} & ${nc?.controls?.NC3_placebo?.pass ? 'true' : 'false'} \\\\`,
    `NC4 & ${nc?.controls?.NC4_leak_feature?.expected || 'NA'} & ${Number(nc?.controls?.NC4_leak_feature?.observed_acc ?? 0).toFixed(6)} & ${nc?.controls?.NC4_leak_feature?.pass ? 'true' : 'false'} \\\\`,
    '\\hline',
    '\\end{tabular}'
  ]);
  writeTex(path.join(outDir, 'appendix_hashes.tex'), [
    '\\begin{tabular}{ll}',
    '\\hline',
    'Artifact & sha256 \\\\',
    '\\hline',
    `preregister & ${manifest.preregister.sha256} \\\\`,
    ...Object.entries(manifest.reports).map(([k, v]) => `report:${k} & ${v.sha256} \\\\`),
    ...appendixRows.map((r) => `ticks:${r.runId} & ${r.ticks_hash} \\\\`),
    '\\hline',
    `\\multicolumn{2}{l}{prereg\\_hash=${preregFileHash}} \\\\`,
    '\\end{tabular}'
  ]);
  fs.writeFileSync(path.join(outDir, 'figures_data_ROEO.json'), `${JSON.stringify({
    batchId,
    epsilon_RO: operational?.epsilon_RO ?? null,
    pairs: (operational?.pairs || []).map((p) => ({ pair_id: p.pair_id, d: p.d, epsilon: p.epsilon, ro_status: p.ro_status }))
  }, null, 2)}\n`, 'utf8');

  manifest.exported = true;
  const exportPaths = {
    tables_ROEO: path.join(outDir, 'tables_ROEO.tex'),
    tables_SNO: path.join(outDir, 'tables_SNO.tex'),
    tables_NC: path.join(outDir, 'tables_NC.tex'),
    appendix_hashes: path.join(outDir, 'appendix_hashes.tex'),
    figures_data_ROEO: path.join(outDir, 'figures_data_ROEO.json')
  };
  manifest.exports = Object.fromEntries(
    Object.entries(exportPaths).map(([k, p]) => [k, { path: relPath(path.resolve(p)), sha256: sha256File(path.resolve(p)) }])
  );
  const manifestPath = path.join(outDir, 'export_manifest.json');
  fs.writeFileSync(lockPath, `${JSON.stringify(currentInputHashes, null, 2)}\n`, 'utf8');
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return { manifestPath, manifest };
};

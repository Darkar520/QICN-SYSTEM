import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { spawnSync } from 'child_process';
import { buildDeterministicZip } from './pdf_corpus_zip.js';

const nowIso = () => new Date().toISOString();
const sha256File = (p) => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const norm = (p) => p.replace(/\\/g, '/');
const safeId = (s) => s.replace(/[^a-zA-Z0-9._-]+/g, '_');
const readText = (p) => fs.readFileSync(p, 'utf8');
const ensureDir = (p) => fs.mkdirSync(p, { recursive: true });
const writeJson = (p, o) => fs.writeFileSync(p, `${JSON.stringify(o, null, 2)}\n`, 'utf8');
const writeText = (p, t) => fs.writeFileSync(p, `${t}`, 'utf8');
const execCmd = (cmd, args, cwd) => spawnSync(cmd, args, { cwd, encoding: 'utf8' });

const classifyCategory = (sourcePath) => {
  const lower = norm(sourcePath).toLowerCase();
  if (lower.includes('/paper') || lower.includes('\\paper')) return 'papers';
  if (lower.includes('theory')) return 'theory';
  if (lower.includes('notebooklm') || lower.includes('notebook lm')) return 'notebook_lm';
  if (lower.includes('artifacts/paper_exports') || lower.includes('exports') || lower.includes('reports')) return 'experimental';
  return 'other';
};

const findFiles = (rootAbs) => {
  const out = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else out.push(full);
    }
  };
  walk(rootAbs);
  return out;
};

const detectLatexUnit = (file) => {
  const base = path.basename(file).toLowerCase();
  if (base === 'main.tex' || base === 'paper.tex') return true;
  const txt = readText(file);
  return txt.includes('\\documentclass');
};

const sanitizeGeneratedTexInDir = (dir, logDir) => {
  const files = fs.readdirSync(dir).filter((n) => /^tables_.*\.tex$/i.test(n) || /^appendix.*\.tex$/i.test(n));
  const diffs = [];
  for (const f of files) {
    const p = path.join(dir, f);
    const before = readText(p);
    const after = before.replace(/(?<!\\)_/g, '\\_');
    if (before !== after) {
      writeText(p, after);
      diffs.push(`FILE ${f}\n- unescaped underscores fixed\n`);
    }
  }
  if (diffs.length) writeText(path.join(logDir, 'sanitization.patch'), diffs.join('\n'));
  return diffs.length > 0;
};

const runLatexBuild = ({ texPath, preferLatexmk, logDir }) => {
  const dir = path.dirname(texPath);
  const name = path.basename(texPath);
  const status = { toolchain: null, attempts: [] };
  const tryCmd = (cmd, args) => {
    const r = execCmd(cmd, args, dir);
    status.attempts.push({ cmd: [cmd, ...args].join(' '), exitCode: r.status ?? 1 });
    writeText(path.join(logDir, 'stdout.log'), `${(r.stdout || '')}\n`, 'utf8');
    writeText(path.join(logDir, 'stderr.log'), `${(r.stderr || '')}\n`, 'utf8');
    return r;
  };
  if (preferLatexmk) {
    const r = tryCmd('latexmk', ['-pdf', '-interaction=nonstopmode', '-halt-on-error', name]);
    status.toolchain = 'latexmk';
    if (r.status === 0) return { ok: true, pdfPath: path.join(dir, `${path.basename(name, '.tex')}.pdf`), status };
  }
  let r = tryCmd('pdflatex', ['-interaction=nonstopmode', '-halt-on-error', name]);
  status.toolchain = 'pdflatex';
  if (r.status === 0) r = tryCmd('pdflatex', ['-interaction=nonstopmode', '-halt-on-error', name]);
  if (r.status === 0) return { ok: true, pdfPath: path.join(dir, `${path.basename(name, '.tex')}.pdf`), status };
  const combined = `${readText(path.join(logDir, 'stdout.log'))}\n${readText(path.join(logDir, 'stderr.log'))}`;
  if (combined.includes('Missing $ inserted')) {
    const sanitized = sanitizeGeneratedTexInDir(dir, logDir);
    if (sanitized) {
      let s = tryCmd('pdflatex', ['-interaction=nonstopmode', '-halt-on-error', name]);
      if (s.status === 0) s = tryCmd('pdflatex', ['-interaction=nonstopmode', '-halt-on-error', name]);
      if (s.status === 0) return { ok: true, pdfPath: path.join(dir, `${path.basename(name, '.tex')}.pdf`), status };
    }
  }
  return { ok: false, pdfPath: null, status };
};

const runDocBuild = ({ type, sourcePath, logDir }) => {
  const dir = path.dirname(sourcePath);
  const base = path.basename(sourcePath);
  const stem = path.basename(sourcePath, path.extname(sourcePath));
  const setLogs = (r, cmd) => {
    writeText(path.join(logDir, 'stdout.log'), `${(r.stdout || '')}\n`);
    writeText(path.join(logDir, 'stderr.log'), `${(r.stderr || '')}\n`);
    return { ok: r.status === 0, cmd, exitCode: r.status ?? 1 };
  };
  if (type === 'qmd') {
    const r = execCmd('quarto', ['render', base, '--to', 'pdf'], dir);
    const st = setLogs(r, `quarto render ${base} --to pdf`);
    return { ...st, output: path.join(dir, `${stem}.pdf`), toolchain: 'quarto' };
  }
  if (type === 'md') {
    const r = execCmd('pandoc', [base, '-o', `${stem}.pdf`], dir);
    const st = setLogs(r, `pandoc ${base} -o ${stem}.pdf`);
    return { ...st, output: path.join(dir, `${stem}.pdf`), toolchain: 'pandoc' };
  }
  const r = execCmd('jupyter', ['nbconvert', '--to', 'pdf', base, '--output', stem], dir);
  const st = setLogs(r, `jupyter nbconvert --to pdf ${base} --output ${stem}`);
  return { ...st, output: path.join(dir, `${stem}.pdf`), toolchain: 'jupyter-nbconvert' };
};

const canonicalKey = (s) => String(s || '').toLowerCase().replace(/\s+/g, '');
const resolveRootCandidates = (rootBase, rootName) => {
  const out = new Set();
  const direct = path.resolve(rootBase, rootName);
  if (fs.existsSync(direct)) out.add(direct);
  const baseEntries = fs.readdirSync(rootBase, { withFileTypes: true }).filter((e) => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules');
  const wanted = canonicalKey(rootName);
  for (const e of baseEntries) {
    const full = path.join(rootBase, e.name);
    if (canonicalKey(e.name) === wanted) out.add(full);
    const child = path.join(full, rootName);
    if (fs.existsSync(child) && fs.statSync(child).isDirectory()) out.add(child);
    const grand = fs.readdirSync(full, { withFileTypes: true }).filter((x) => x.isDirectory());
    for (const g of grand) {
      if (canonicalKey(g.name) === wanted) out.add(path.join(full, g.name));
    }
  }
  return [...out];
};

const copyIntoCorpus = ({ pdfPath, sourcePath, rootLabel, corpusPdfDir, dedupeMap }) => {
  const hash = sha256File(pdfPath);
  const category = classifyCategory(sourcePath || pdfPath);
  const fileName = path.basename(pdfPath);
  const rel = norm(path.join(category, safeId(rootLabel), fileName));
  const outAbs = path.join(corpusPdfDir, rel);
  if (!dedupeMap.has(hash)) {
    ensureDir(path.dirname(outAbs));
    fs.copyFileSync(pdfPath, outAbs);
    dedupeMap.set(hash, rel);
  }
  return { rel_path: dedupeMap.get(hash), sha256: hash, bytes: fs.statSync(pdfPath).size };
};

export const buildPdfCorpus = ({
  corpusId,
  roots,
  outRoot,
  preferLatexmk = true,
  deterministic = true,
  zipMode = 'store'
}) => {
  const started = nowIso();
  const rootBase = process.cwd();
  const outDir = path.resolve(outRoot, corpusId);
  const corpusPdfDir = path.join(outDir, 'pdf_corpus');
  const logsRoot = path.join(outDir, 'build_logs');
  ensureDir(corpusPdfDir);
  ensureDir(logsRoot);
  const units = [];

  for (const rootName of roots) {
    const candidates = resolveRootCandidates(rootBase, rootName);
    for (const rootAbs of candidates) {
      const files = findFiles(rootAbs);
      for (const f of files) {
        const ext = path.extname(f).toLowerCase();
        if (ext === '.pdf') units.push({ type: 'pdf', source: f, rootName });
        else if (ext === '.tex' && detectLatexUnit(f)) units.push({ type: 'latex', source: f, rootName });
        else if (ext === '.qmd') units.push({ type: 'qmd', source: f, rootName });
        else if (ext === '.md') units.push({ type: 'md', source: f, rootName });
        else if (ext === '.ipynb') units.push({ type: 'ipynb', source: f, rootName });
      }
    }
  }

  units.sort((a, b) => norm(a.source).localeCompare(norm(b.source)));
  const dedupeMap = new Map();
  const manifestEntries = [];
  let nSuccess = 0; let nFailed = 0; let nSkipped = 0; let nCopied = 0;

  for (const u of units) {
    const unitId = safeId(norm(path.relative(rootBase, u.source)));
    const logDir = path.join(logsRoot, unitId);
    ensureDir(logDir);
    const statusPath = path.join(logDir, 'status.json');
    const inputHashes = { source_path: norm(u.source), source_sha256: sha256File(u.source), source_type: u.type };
    writeJson(path.join(logDir, 'input_hashes.json'), inputHashes);
    let buildStatus = 'SKIPPED';
    let note = null;
    let outputPdf = null;
    let toolchain = null;
    let cmd = null;

    if (u.type === 'pdf') {
      buildStatus = 'COPIED';
      outputPdf = u.source;
      nCopied += 1;
      writeText(path.join(logDir, 'stdout.log'), '');
      writeText(path.join(logDir, 'stderr.log'), '');
      writeJson(path.join(logDir, 'toolchain.json'), { toolchain: 'copy', cmd: null });
    } else if (u.type === 'latex') {
      const r = runLatexBuild({ texPath: u.source, preferLatexmk, logDir });
      toolchain = r.status.toolchain;
      cmd = r.status.attempts;
      if (r.ok && r.pdfPath && fs.existsSync(r.pdfPath)) {
        buildStatus = 'SUCCESS';
        outputPdf = r.pdfPath;
        nSuccess += 1;
      } else {
        buildStatus = 'FAILED';
        note = 'LATEX_BUILD_FAILED';
        nFailed += 1;
      }
      writeJson(path.join(logDir, 'toolchain.json'), { toolchain, attempts: cmd });
    } else {
      const r = runDocBuild({ type: u.type, sourcePath: u.source, logDir });
      toolchain = r.toolchain;
      cmd = r.cmd;
      writeJson(path.join(logDir, 'toolchain.json'), { toolchain, cmd, exitCode: r.exitCode });
      if (r.ok && fs.existsSync(r.output)) {
        buildStatus = 'SUCCESS';
        outputPdf = r.output;
        nSuccess += 1;
      } else {
        buildStatus = 'SKIPPED';
        note = `${u.type.toUpperCase()}_TOOLCHAIN_MISSING_OR_FAILED`;
        nSkipped += 1;
      }
    }

    let outMeta = null;
    if (outputPdf && fs.existsSync(outputPdf)) {
      outMeta = copyIntoCorpus({ pdfPath: outputPdf, sourcePath: u.source, rootLabel: u.rootName, corpusPdfDir, dedupeMap });
      writeJson(path.join(logDir, 'output_hashes.json'), { output_pdf: norm(outputPdf), ...outMeta });
    } else {
      writeJson(path.join(logDir, 'output_hashes.json'), { output_pdf: null });
    }

    const st = { status: buildStatus, reason: note, timestamp_utc: nowIso() };
    writeJson(statusPath, st);
    manifestEntries.push({
      rel_path: outMeta ? outMeta.rel_path : null,
      source_path: norm(u.source),
      source_type: u.type,
      build_status: buildStatus,
      bytes: outMeta ? outMeta.bytes : 0,
      sha256: outMeta ? outMeta.sha256 : null,
      timestamp_utc: st.timestamp_utc,
      toolchain_used: toolchain || (u.type === 'pdf' ? 'copy' : null),
      notes: note
    });
  }

  const aliases = {};
  for (const m of manifestEntries) {
    if (!m.sha256 || !m.rel_path) continue;
    if (!aliases[m.sha256]) aliases[m.sha256] = [];
    aliases[m.sha256].push(m.rel_path);
  }
  const dedupe = Object.fromEntries(Object.entries(aliases).map(([k, arr]) => [k, { canonical: arr[0], aliases: arr }]));

  const indexLines = ['# PDF Corpus Index', '', `- Corpus ID: \`${corpusId}\``, `- Generated: \`${nowIso()}\``, ''];
  const grouped = {};
  for (const m of manifestEntries.filter((x) => x.rel_path)) {
    const cat = m.rel_path.split('/')[0];
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(m);
  }
  for (const cat of Object.keys(grouped).sort()) {
    indexLines.push(`## ${cat}`);
    const seen = new Set();
    for (const m of grouped[cat].sort((a, b) => a.rel_path.localeCompare(b.rel_path))) {
      if (seen.has(m.rel_path)) continue;
      seen.add(m.rel_path);
      indexLines.push(`- \`${m.rel_path}\`  (\`${(m.sha256 || '').slice(0, 12)}\`)`);
    }
    indexLines.push('');
  }
  writeText(path.join(outDir, 'pdf_corpus_index.md'), `${indexLines.join('\n')}\n`);

  const zipPath = path.join(outDir, 'pdf_corpus.zip');
  const zipMeta = buildDeterministicZip({ sourceDir: corpusPdfDir, zipPath });

  const manifest = {
    corpusId,
    started_utc: started,
    finished_utc: nowIso(),
    deterministic,
    zip_mode: zipMode,
    n_units_total: units.length,
    n_pdf_final: new Set(manifestEntries.filter((m) => m.rel_path).map((m) => m.rel_path)).size,
    n_success: nSuccess,
    n_failed: nFailed,
    n_skipped: nSkipped,
    n_copied: nCopied,
    entries: manifestEntries,
    dedupe,
    corpus_zip_sha256: zipMeta.corpus_zip_sha256
  };
  if (manifest.n_pdf_final <= 0) {
    writeJson(path.join(outDir, 'pdf_corpus_manifest.json'), manifest);
    throw new Error('NO_PDF_FINAL');
  }
  writeJson(path.join(outDir, 'pdf_corpus_manifest.json'), manifest);
  return {
    corpusId,
    outDir,
    zipPath,
    corpus_zip_sha256: zipMeta.corpus_zip_sha256,
    n_units_total: manifest.n_units_total,
    n_pdf_final: manifest.n_pdf_final,
    n_success: manifest.n_success,
    n_failed: manifest.n_failed,
    n_skipped: manifest.n_skipped,
    n_copied: manifest.n_copied
  };
};

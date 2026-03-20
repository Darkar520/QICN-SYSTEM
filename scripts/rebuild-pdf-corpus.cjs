const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { applyHygieneGuard } = require('./latex_hygiene_guard.cjs');
const parseArg = (name, fallback = null) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const nowIso = () => new Date().toISOString();
const norm = (p) => String(p).replace(/\\/g, '/');
const ensureDir = (p) => fs.mkdirSync(p, { recursive: true });
const isDir = (p) => fs.existsSync(p) && fs.statSync(p).isDirectory();
const isFile = (p) => fs.existsSync(p) && fs.statSync(p).isFile();
const readText = (p) => fs.readFileSync(p, 'utf8');
const writeText = (p, t) => fs.writeFileSync(p, t, 'utf8');

const stableSortObject = (input) => {
  if (Array.isArray(input)) return input.map(stableSortObject);
  if (!input || typeof input !== 'object') return input;
  const out = {};
  for (const k of Object.keys(input).sort()) out[k] = stableSortObject(input[k]);
  return out;
};
const stableStringify = (v) => JSON.stringify(stableSortObject(v), null, 2);
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const sha256Text = (txt) => sha256(Buffer.from(String(txt), 'utf8'));
const sha256File = (p) => sha256(fs.readFileSync(p));
const writeJson = (p, o) => writeText(p, `${JSON.stringify(o, null, 2)}\n`);

const canonicalizeName = (input) => {
  const map = {
    'Ã¡': 'á', 'Ã©': 'é', 'Ã­': 'í', 'Ã³': 'ó', 'Ãº': 'ú', 'Ã±': 'ñ', 'Ã': 'Á',
    'Ã¢€â€"': '-', 'Ã¢€â€"': '-', 'Ã¢€œ': '"', 'Ã¢€Â': '"', 'Ã¢€œ': "'", 'Ã¢€â„¢': "'"
  };
  let s = String(input || '');
  for (const [k, v] of Object.entries(map)) s = s.split(k).join(v);
  s = s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  s = s.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  return s || 'doc';
};

const stripComment = (line) => {
  let out = '';
  let escaped = false;
  for (const ch of line) {
    if (ch === '%' && !escaped) break;
    out += ch;
    escaped = ch === '\\' && !escaped;
    if (ch !== '\\') escaped = false;
  }
  return out.trim();
};

const summarizeTexRoot = (texText) => {
  const rawLines = texText.split(/\r?\n/);
  const nonComment = rawLines.map(stripComment).filter((l) => l.length > 0);
  const documentclassLine = nonComment.find((l) => l.includes('\\documentclass')) || '';
  const first200NonCommentLines = nonComment.slice(0, 200);
  const includeRefs = [];
  const graphRefs = [];
  const includeRegex = /\\(?:include|input)\{([^}]+)\}/g;
  const graphicsRegex = /\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/g;
  for (const line of nonComment) {
    let m = includeRegex.exec(line);
    while (m) {
      includeRefs.push(m[1].trim());
      m = includeRegex.exec(line);
    }
    m = graphicsRegex.exec(line);
    while (m) {
      graphRefs.push(m[1].trim());
      m = graphicsRegex.exec(line);
    }
    includeRegex.lastIndex = 0;
    graphicsRegex.lastIndex = 0;
  }
  includeRefs.sort();
  graphRefs.sort();
  return {
    documentclassLine,
    first200NonCommentLines,
    sortedIncludesAndInputs: includeRefs,
    sortedGraphicsRefs: graphRefs
  };
};

const hasDocumentClass = (fullPath) => {
  try {
    return readText(fullPath).includes('\\documentclass');
  } catch (_) {
    return false;
  }
};

const shouldSkipPath = (lowerNormPath) => {
  const deny = [
    '/node_modules/',
    '/.git/',
    '/.agent/',
    '/_build/',
    '/build/',
    '/dist/',
    '/output/',
    '/out/',
    '/target/',
    '/artifacts/pdf_corpus/',
    '/artifacts/pdf_corpus_rebuild/'
  ];
  return deny.some((s) => lowerNormPath.includes(s));
};

const walk = (root, cb) => {
  if (!isDir(root)) return;
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      const lower = norm(full).toLowerCase();
      if (e.isDirectory()) {
        if (shouldSkipPath(`/${lower}/`)) continue;
        stack.push(full);
        continue;
      }
      if (shouldSkipPath(`/${lower}/`)) continue;
      cb(full);
    }
  }
};

const isRelevantPdfPath = (lower) => {
  const hints = [
    'paper', 'papers', 'notebooklm', 'notebook lm', '/pdfs/', '/exports/', '/reports/',
    '/artifacts/paper_exports/', 'phenomenological-instability-paper',
    'phenomenological-regimes-paper', 'rigid-identity-framework'
  ];
  return hints.some((h) => lower.includes(h));
};

const discoverCorpus = (repoRoot) => {
  const texCandidates = [];
  const pdfCandidates = [];
  walk(repoRoot, (full) => {
    const lower = norm(full).toLowerCase();
    const ext = path.extname(full).toLowerCase();
    if (ext === '.tex' && hasDocumentClass(full)) {
      const relPath = norm(path.relative(repoRoot, full));
      const identityRelPath = relPath.toLowerCase();
      const texText = readText(full);
      const rootData = summarizeTexRoot(texText);
      const rootSignature = sha256Text(stableStringify(rootData));
      texCandidates.push({
        sourceAbs: path.resolve(full),
        relPath,
        identityRelPath,
        displayName: path.basename(relPath, '.tex'),
        docId: sha256Text(identityRelPath).slice(0, 16),
        rootSignature,
        texText
      });
      return;
    }
    if (ext === '.pdf' && isRelevantPdfPath(lower)) {
      const relPath = norm(path.relative(repoRoot, full));
      const identityRelPath = relPath.toLowerCase();
      pdfCandidates.push({
        sourceAbs: path.resolve(full),
        relPath,
        identityRelPath,
        displayName: path.basename(relPath, '.pdf'),
        docId: sha256Text(identityRelPath).slice(0, 16)
      });
    }
  });
  texCandidates.sort((a, b) => a.relPath.localeCompare(b.relPath));
  pdfCandidates.sort((a, b) => a.relPath.localeCompare(b.relPath));
  return { texCandidates, pdfCandidates };
};

const dedupeTexCandidates = (texCandidates) => {
  const bySignature = new Map();

  for (const c of texCandidates) {
    // Use more robust signature: path + content hash of first 4KB
    const contentHash = sha256Text(c.texText.slice(0, 4096));
    const robustSignature = `${c.relPath}:${contentHash}`;
    const list = bySignature.get(robustSignature) || [];
    list.push(c);
    bySignature.set(robustSignature, list);
  }

  // Keep deterministic winner: shortest path, then lexicographic
  const kept = [];
  const duplicates = [];

  for (const [signature, list] of bySignature.entries()) {
    list.sort((a, b) => {
      if (a.relPath.length !== b.relPath.length)
        return a.relPath.length - b.relPath.length;
      return a.relPath.localeCompare(b.relPath);
    });

    kept.push(list[0]);
    if (list.length > 1) {
      duplicates.push({
        rootSignature: signature,
        keptRelPath: list[0].relPath,
        duplicateRelPaths: list.slice(1).map(x => x.relPath)
      });
    }
  }

  kept.sort((a, b) => a.relPath.localeCompare(b.relPath));
  return { kept, duplicates };
};

const copyDir = (src, dst) => {
  ensureDir(dst);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
};

const runCmd = (cmd, args, cwd) => spawnSync(cmd, args, { cwd, encoding: 'utf8' });

// ENHANCED TOOLCHAIN DETECTION - Fixes PDFLATEX_MISSING false positives
const detectToolchain = () => {
  const tools = ['pdflatex', 'xelatex', 'lualatex', 'latexmk', 'bibtex', 'biber'];
  const results = {};

  for (const tool of tools) {
    // Try where command on Windows first
    const whereResult = runCmd('where', [tool], process.cwd());
    results[tool] = whereResult.status === 0 && whereResult.stdout.includes(tool);

    // Also try direct execution as fallback
    if (!results[tool]) {
      const directResult = runCmd(tool, ['--version'], process.cwd());
      results[tool] = directResult.status === 0;
    }
  }

  // latexmk requires Perl - if it fails, treat as unavailable
  if (results.latexmk) {
    const testResult = runCmd('latexmk', ['--version'], process.cwd());
    results.latexmk = testResult.status === 0 && !testResult.stderr?.toString().includes('Perl');
  }

  return results;
};

const inMathRange = (text, idx) => {
  // Check if position is inside math mode ($...$, \(...\), \[...\])
  let i = 0;
  let inMath = false;
  while (i < idx) {
    // Check for display math \[ ... \]
    if (text.substring(i, i + 2) === '\\[') { inMath = true; i += 2; continue; }
    if (text.substring(i, i + 2) === '\\]') { inMath = false; i += 2; continue; }
    // Check for inline math \( ... \)
    if (text.substring(i, i + 2) === '\\(') { inMath = true; i += 2; continue; }
    if (text.substring(i, i + 2) === '\\)') { inMath = false; i += 2; continue; }
    // Check for $...$ (not escaped)
    if (text[i] === '$' && (i === 0 || text[i - 1] !== '\\')) {
      inMath = !inMath;
      i++;
      continue;
    }
    i++;
  }
  return inMath;
};

const escapeLatexText = (text) => {
  const specials = new Set(['_', '%', '&', '#', '{', '}', '~', '^', '\\']);
  let out = '';
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (!specials.has(ch)) { out += ch; continue; }
    if (ch === '\\') { out += '\\textbackslash{}'; continue; }
    if (text[i - 1] === '\\') { out += ch; continue; }
    if (inMathRange(text, i)) { out += ch; continue; }
    if (ch === '~') { out += '\\textasciitilde{}'; continue; }
    if (ch === '^') { out += '\\textasciicircum{}'; continue; }
    out += `\\${ch}`;
  }
  return out;
};

// sanitizeGeneratedArtifactsRecursive removed in favor of latex_hygiene_guard.js

const firstFatalErrorSnippet = (logPath) => {
  if (!isFile(logPath)) return null;
  const lines = readText(logPath).split(/\r?\n/);
  const idx = lines.findIndex((l) => l.trim().startsWith('!'));
  if (idx < 0) return null;
  return lines.slice(idx, Math.min(idx + 6, lines.length)).join('\n').trim();
};

const selectBuildProfile = (texText, toolchain) => {
  const hasFontspec = /\\usepackage(?:\[[^\]]*\])?\{[^}]*fontspec[^}]*\}/i.test(texText);
  const hasAddBibResource = /\\addbibresource\{[^}]+\}/i.test(texText);
  const hasBibliography = /\\bibliography\{[^}]+\}/i.test(texText);
  const engine = hasFontspec ? (toolchain.xelatex ? 'xelatex' : (toolchain.lualatex ? 'lualatex' : 'pdflatex')) : 'pdflatex';
  let bib = 'none';
  if (hasAddBibResource) bib = 'biber';
  else if (hasBibliography) bib = 'bibtex';
  return { engine, bib };
};

const appendLogs = (logFile, chunk) => fs.appendFileSync(logFile, `${chunk || ''}\n`, 'utf8');

const runPipelineManual = ({ engine, bib, texName, cwd, toolchain, stdoutLog, stderrLog }) => {
  const runTex = () => runCmd(engine, ['-interaction=nonstopmode', '-halt-on-error', texName], cwd);
  const base = path.basename(texName, '.tex');
  const r1 = runTex();
  appendLogs(stdoutLog, r1.stdout); appendLogs(stderrLog, r1.stderr);
  if (r1.status !== 0) return { ok: false, stage: `${engine}-pass1` };

  if (bib === 'biber') {
    if (!toolchain.biber) return { ok: false, stage: 'biber-missing' };
    const rb = runCmd('biber', [base], cwd);
    appendLogs(stdoutLog, rb.stdout); appendLogs(stderrLog, rb.stderr);
    if (rb.status !== 0) return { ok: false, stage: 'biber' };
  } else if (bib === 'bibtex') {
    if (!toolchain.bibtex) return { ok: false, stage: 'bibtex-missing' };
    const rb = runCmd('bibtex', [base], cwd);
    appendLogs(stdoutLog, rb.stdout); appendLogs(stderrLog, rb.stderr);
    if (rb.status !== 0) return { ok: false, stage: 'bibtex' };
  }

  const r2 = runTex();
  appendLogs(stdoutLog, r2.stdout); appendLogs(stderrLog, r2.stderr);
  if (r2.status !== 0) return { ok: false, stage: `${engine}-pass2` };

  const r3 = runTex();
  appendLogs(stdoutLog, r3.stdout); appendLogs(stderrLog, r3.stderr);
  return { ok: r3.status === 0, stage: `${engine}-pass3` };
};

const pagesFromPdf = (pdfPath) => {
  try {
    const txt = fs.readFileSync(pdfPath).toString('latin1');
    const m = txt.match(/\/Type\s*\/Page\b/g);
    return m ? m.length : null;
  } catch (_) {
    return null;
  }
};

const sourceBundleHash = (sourceDir) => {
  const exts = new Set(['.tex', '.bib', '.sty', '.cls', '.png', '.jpg', '.jpeg', '.pdf', '.eps', '.svg', '.csv', '.json']);
  const files = [];
  walk(sourceDir, (f) => {
    if (exts.has(path.extname(f).toLowerCase())) files.push(f);
  });
  files.sort((a, b) => norm(a).localeCompare(norm(b)));
  const payload = files.map((f) => `${norm(path.relative(sourceDir, f))}:${sha256File(f)}`).join('\n');
  return sha256Text(payload);
};

const compileTexCandidate = ({ candidate, repoRoot, outputRoot, toolchain }) => {
  const docId = candidate.docId;
  const displaySafe = canonicalizeName(candidate.displayName);
  const buildDir = path.join(outputRoot, '_build', docId);
  const logsDir = path.join(outputRoot, 'build_logs', docId);
  const srcRoot = path.join(buildDir, 'src');
  ensureDir(buildDir); ensureDir(logsDir);
  copyDir(path.dirname(candidate.sourceAbs), srcRoot);
  const texName = path.basename(candidate.sourceAbs);
  const texPathInBuild = path.join(srcRoot, texName);
  const stdoutLog = path.join(logsDir, 'build_stdout.txt');
  const stderrLog = path.join(logsDir, 'build_stderr.txt');
  writeText(stdoutLog, '');
  writeText(stderrLog, '');

  const out = {
    docId,
    relPath: candidate.relPath,
    displayName: candidate.displayName,
    rootSignature: candidate.rootSignature,
    source_path: norm(candidate.sourceAbs),
    build_mode: 'compiled',
    toolchain: 'none',
    engine: 'unknown',
    bib: 'none',
    status: 'FAIL',
    outputPdfPath: null,
    sha256Pdf: null,
    sha256_sources_bundle: sourceBundleHash(path.dirname(candidate.sourceAbs)),
    failReason: null,
    errors: [],
    warnings: [],
    pages: null,
    build_mutations: []
  };

  const profile = selectBuildProfile(candidate.texText, toolchain);
  out.engine = profile.engine;
  out.bib = profile.bib;

  // Helper to check if engine exists at build time
  const engineExists = (engine) => {
    const whereResult = runCmd('where', [engine], srcRoot);
    if (whereResult.status === 0) return true;
    const directResult = runCmd(engine, ['--version'], srcRoot);
    return directResult.status === 0;
  };

  let buildOk = false;
  let stage = 'not-started';
  if (toolchain.latexmk) {
    const args = ['-interaction=nonstopmode', '-halt-on-error'];
    if (profile.engine === 'xelatex') args.unshift('-xelatex');
    else if (profile.engine === 'lualatex') args.unshift('-lualatex');
    else args.unshift('-pdf');
    args.push(texName);
    const r = runCmd('latexmk', args, srcRoot);
    appendLogs(stdoutLog, r.stdout);
    appendLogs(stderrLog, r.stderr);
    out.toolchain = 'latexmk';
    if (r.status === 0) {
      buildOk = true;
      stage = 'latexmk';
    } else {
      stage = 'latexmk-fallback';
    }
  }

  // ENHANCED FALLBACK - Always attempt manual build, don't fail on uncertain detection
  if (!buildOk) {
    // Try direct execution - detection may be wrong on Windows PATH issues
    if (!engineExists(profile.engine)) {
      out.failReason = `${profile.engine.toUpperCase()}_MISSING`;
      out.errors.push(out.failReason);
      stage = 'engine-missing';
    } else {
      out.toolchain = profile.engine;
      const manual = runPipelineManual({
        engine: profile.engine,
        bib: profile.bib,
        texName,
        cwd: srcRoot,
        toolchain,
        stdoutLog,
        stderrLog
      });
      buildOk = manual.ok;
      stage = manual.stage;
    }
  }

  // PR-10A HYGIENE GUARD PASS: If build failed, attempt purely hygiene fixes and track provenance
  if (!buildOk) {
    let anyMutated = false;
    const walkUnfiltered = (dir, cb) => {
      if (!isDir(dir)) return;
      const stack = [dir];
      while (stack.length) {
        const curr = stack.pop();
        const entries = fs.readdirSync(curr, { withFileTypes: true });
        for (const e of entries) {
          const full = path.join(curr, e.name);
          if (e.isDirectory()) stack.push(full);
          else cb(full);
        }
      }
    };

    walkUnfiltered(srcRoot, (fullPath) => {
      if (!fullPath.endsWith('.tex')) return;
      const originalText = readText(fullPath);
      const hygieneResult = applyHygieneGuard(originalText, fullPath);

      if (hygieneResult.isMutated) {
        if (hygieneResult.classification === 'CONTENT_MUTATION') {
          console.error(`CONTENT_MUTATION detected by guard in ${fullPath}! Aborting immediately.`);
          process.exit(1);
        }
        writeText(fullPath, hygieneResult.mutatedText);
        const diffPath = path.join(logsDir, `hygiene_${path.basename(fullPath)}.diff`);
        writeText(diffPath, hygieneResult.diff);

        out.build_mutations.push({
          file: norm(path.relative(srcRoot, fullPath)),
          diff_path: norm(diffPath),
          classification: hygieneResult.classification,
          reasons: hygieneResult.mutations
        });
        anyMutated = true;
      }
    });

    if (anyMutated) {
      appendLogs(stdoutLog, `\n--- RETRYING AFTER LATEX HYGIENE GUARD ---\n`);
      const manualPost = runPipelineManual({
        engine: profile.engine,
        bib: profile.bib,
        texName,
        cwd: srcRoot,
        toolchain,
        stdoutLog,
        stderrLog
      });
      buildOk = manualPost.ok;
      stage = manualPost.stage + '-post-hygiene';
    }
  }

  const builtPdf = path.join(srcRoot, `${path.basename(texName, '.tex')}.pdf`);
  if (buildOk && isFile(builtPdf)) {
    const outPdf = path.join(outputRoot, 'pdfs', `${docId}_${displaySafe}.pdf`);
    ensureDir(path.dirname(outPdf));
    fs.copyFileSync(builtPdf, outPdf);
    out.status = 'PASS';
    out.outputPdfPath = norm(outPdf);
    out.sha256Pdf = sha256File(outPdf);
    out.pages = pagesFromPdf(outPdf);
  } else {
    out.status = 'FAIL';
    if (!out.failReason) out.failReason = 'LATEX_BUILD_FAILED';
    out.errors.push(out.failReason);
    const mainLog = path.join(srcRoot, 'main.log');
    if (isFile(mainLog)) fs.copyFileSync(mainLog, path.join(logsDir, 'main.log'));
    const snippet = firstFatalErrorSnippet(path.join(logsDir, 'main.log')) || firstFatalErrorSnippet(mainLog);
    if (snippet) writeText(path.join(logsDir, 'fatal_error_snippet.txt'), snippet);
    appendLogs(stderrLog, `BUILD_STAGE:${stage}`);
  }

  writeJson(path.join(logsDir, 'build_cmd.json'), {
    selected_engine: profile.engine,
    selected_bib: profile.bib,
    prefer_latexmk: true,
    source_relpath: candidate.relPath
  });
  writeJson(path.join(logsDir, 'status.json'), {
    status: out.status,
    failReason: out.failReason,
    engine: out.engine,
    bib: out.bib,
    toolchain: out.toolchain,
    timestamp_utc: nowIso()
  });
  return out;
};

const copyPdfCandidate = ({ candidate, outputRoot }) => {
  const safe = canonicalizeName(candidate.displayName);
  const outPdf = path.join(outputRoot, 'pdfs', `${candidate.docId}_${safe}.pdf`);
  ensureDir(path.dirname(outPdf));
  fs.copyFileSync(candidate.sourceAbs, outPdf);
  return {
    docId: candidate.docId,
    relPath: candidate.relPath,
    displayName: candidate.displayName,
    rootSignature: null,
    source_path: norm(candidate.sourceAbs),
    build_mode: 'copied',
    toolchain: 'none',
    engine: 'none',
    bib: 'none',
    status: 'PASS',
    outputPdfPath: norm(outPdf),
    sha256Pdf: sha256File(outPdf),
    sha256_sources_bundle: null,
    failReason: null,
    errors: [],
    warnings: [],
    pages: pagesFromPdf(outPdf)
  };
};

const buildZip = async ({ sourceDir, zipPath }) => {
  const { buildDeterministicZip } = await import('../src/tools/pdf_corpus_zip.js');
  return buildDeterministicZip({ sourceDir, zipPath });
};

const main = async () => {
  const repoRoot = parseArg('repo-root', process.cwd());
  const outputRoot = parseArg('output-root', path.join(process.cwd(), 'artifacts', 'pdf_corpus_rebuild'));
  const cutoffLabel = parseArg('cutoff-label', null);

  console.log(`QICN PDF Corpus Rebuild`);
  console.log(`Repo: ${repoRoot}`);
  console.log(`Output: ${outputRoot}`);
  console.log(`Cutoff: ${cutoffLabel || 'none'}`);
  console.log('');

  // Step 1: Detect toolchain
  console.log('Detecting toolchain...');
  const toolchain = detectToolchain();
  console.log('Toolchain:', toolchain);

  // Step 2: Discover corpus
  console.log('\nDiscovering corpus...');
  const { texCandidates, pdfCandidates } = discoverCorpus(repoRoot);
  console.log(`Found ${texCandidates.length} .tex roots, ${pdfCandidates.length} PDFs`);

  // Step 3: Deduplicate
  console.log('\nDeduplicating...');
  const { kept: texKept, duplicates } = dedupeTexCandidates(texCandidates);
  console.log(`Kept ${texKept.length} unique .tex, ${duplicates.length} duplicates`);

  // Step 4: Build PDFs
  ensureDir(path.join(outputRoot, 'pdfs'));
  ensureDir(path.join(outputRoot, 'build_logs'));
  ensureDir(path.join(outputRoot, '_build'));

  const results = [];
  const startTime = Date.now();

  // Build .tex files
  for (let i = 0; i < texKept.length; i++) {
    const candidate = texKept[i];
    const pct = ((i + 1) / texKept.length * 100).toFixed(1);
    process.stdout.write(`[${pct}%] Building: ${candidate.relPath.slice(0, 60)}... `);

    try {
      const result = compileTexCandidate({
        candidate,
        repoRoot,
        outputRoot,
        toolchain
      });
      results.push(result);
      console.log(result.status);
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      results.push({
        docId: candidate.docId,
        relPath: candidate.relPath,
        status: 'FAIL',
        failReason: `EXCEPTION: ${err.message}`
      });
    }
  }

  // Copy existing PDFs
  for (const candidate of pdfCandidates) {
    const alreadyBuilt = results.find((r) => r.relPath === candidate.relPath);
    if (alreadyBuilt) continue;
    process.stdout.write(`Copying: ${candidate.relPath}... `);
    try {
      const result = copyPdfCandidate({ candidate, outputRoot });
      results.push(result);
      console.log('PASS');
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      results.push({
        docId: candidate.docId,
        relPath: candidate.relPath,
        status: 'FAIL',
        failReason: `COPY_ERROR: ${err.message}`
      });
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nBuild completed in ${elapsed}s`);

  // Step 5: Summary
  const passCount = results.filter((r) => r.status === 'PASS').length;
  const failCount = results.filter((r) => r.status === 'FAIL').length;
  console.log(`\n=== RESULTS ===`);
  console.log(`PASS: ${passCount}`);
  console.log(`FAIL: ${failCount}`);
  console.log(`Total: ${results.length}`);

  // Step 6: Fail reasons
  const failReasons = {};
  for (const r of results.filter((r) => r.status === 'FAIL')) {
    const reason = r.failReason || 'UNKNOWN';
    failReasons[reason] = (failReasons[reason] || 0) + 1;
  }
  if (Object.keys(failReasons).length > 0) {
    console.log(`\n=== FAILURE REASONS ===`);
    for (const [reason, count] of Object.entries(failReasons).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${reason}: ${count}`);
    }
  }

  // Step 7: Write manifest
  const manifest = {
    generated_at: nowIso(),
    repo_root: repoRoot,
    output_root: outputRoot,
    cutoff_label: cutoffLabel,
    toolchain,
    summary: {
      total: results.length,
      pass: passCount,
      fail: failCount,
      duplicates_skipped: duplicates.length,
      build_time_seconds: parseFloat(elapsed)
    },
    duplicates,
    results
  };
  const manifestPath = path.join(outputRoot, 'manifest.json');
  writeJson(manifestPath, manifest);
  console.log(`\nManifest: ${manifestPath}`);

  // Step 8: SHA256 of manifest
  const manifestSha = sha256File(manifestPath);
  const shaPath = path.join(outputRoot, 'manifest.sha256.txt');
  writeText(shaPath, `${manifestSha}  manifest.json\n`);
  console.log(`SHA256: ${shaPath}`);

  // Step 9: Build ZIP
  console.log('\nBuilding ZIP...');
  const dateStr = new Date().toISOString().slice(0, 10);
  const zipPath = path.join(outputRoot, `pdf_corpus_rebuild_${dateStr}.zip`);
  try {
    await buildZip({ sourceDir: outputRoot, zipPath });
    const zipSha = sha256File(zipPath);
    const zipShaPath = path.join(outputRoot, `pdf_corpus_rebuild_${dateStr}.sha256.txt`);
    writeText(zipShaPath, `${zipSha}  pdf_corpus_rebuild_${dateStr}.zip\n`);
    console.log(`ZIP: ${zipPath}`);
    console.log(`ZIP SHA256: ${zipSha}`);
  } catch (err) {
    console.log(`ZIP Error: ${err.message}`);
  }

  console.log('\n=== DONE ===');
};

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});

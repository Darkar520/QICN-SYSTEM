#!/usr/bin/env node
// Generates and verifies knowledge/qicn_living_vault.v1.json — the living,
// SHA-256-sealed deep knowledge vault shared by Gemini (Context Caching +
// read-only Runtime Skills) and local "Solo motor" mode.
//
// Strictly READ-ONLY over the theoretical framework repository at committed HEAD
// (so uncommitted WIP edits in parallel sessions never leak or cause drift).
// Also synchronizes src/language/frameworkSummary.generated.js and
// src/language/moduleInventory.generated.js so all runtime knowledge surfaces
// stay atomically aligned.
//
// Usage:
//   node scripts/sync-living-knowledge-vault.mjs [--framework=<path>] [--check]
//   npm run sync:knowledge-vault
//   npm run verify:knowledge-vault

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const OUT_PATH = path.resolve(ROOT, 'knowledge', 'qicn_living_vault.v1.json');

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...rest] = a.replace(/^--/, '').split('=');
    return [k, rest.length ? rest.join('=') : 'true'];
  })
);
const CHECK_MODE = args.check === 'true';

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');

function resolveFrameworkRoot() {
  if (args.framework) {
    const candidate = path.resolve(args.framework);
    if (fs.existsSync(path.join(candidate, 'rigid-identity-framework', 'registry', 'theorems.jsonl'))) {
      return candidate;
    }
    if (fs.existsSync(path.join(candidate, 'registry', 'theorems.jsonl'))) {
      return path.dirname(candidate);
    }
  }
  const candidates = [
    path.resolve(ROOT, '..', 'qicn-framework-ordenado'),
    path.resolve(ROOT, '..', 'QICN-FRAMEWORK')
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'rigid-identity-framework', 'registry', 'theorems.jsonl'))) {
      return dir;
    }
  }
  return null;
}

function runSubscript(scriptRelPath, extraArgs = []) {
  const res = spawnSync(process.execPath, [path.resolve(ROOT, scriptRelPath), ...extraArgs], {
    cwd: ROOT,
    encoding: 'utf8',
    windowsHide: true
  });
  if (res.status !== 0) {
    const detail = (res.stderr || res.stdout || '').trim();
    throw new Error(`${scriptRelPath} ${extraArgs.join(' ')} failed (${res.status}): ${detail}`);
  }
  return (res.stdout || '').trim();
}

function gitIn(cwd, gitArgs) {
  try {
    return execFileSync('git', gitArgs, {
      cwd,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
      windowsHide: true
    });
  } catch {
    return null;
  }
}

function readCommittedFile(fwRoot, relPath) {
  const normalized = relPath.replace(/\\/g, '/');
  const fromGit = gitIn(fwRoot, ['show', `HEAD:${normalized}`]);
  if (fromGit !== null) return fromGit;
  const abs = path.join(fwRoot, normalized);
  if (fs.existsSync(abs)) return fs.readFileSync(abs, 'utf8');
  return null;
}

function listCommittedFiles(fwRoot, relDir, ext) {
  const normalized = relDir.replace(/\\/g, '/');
  const out = gitIn(fwRoot, ['ls-tree', '-r', '--name-only', 'HEAD', normalized]);
  if (out !== null) {
    return out
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && (!ext || l.endsWith(ext)))
      .sort();
  }
  const absDir = path.join(fwRoot, normalized);
  if (!fs.existsSync(absDir)) return [];
  const results = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && (!ext || entry.name.endsWith(ext))) {
        results.push(path.relative(fwRoot, full).replace(/\\/g, '/'));
      }
    }
  };
  walk(absDir);
  return results.sort();
}

function cleanTexText(raw) {
  if (!raw) return '';
  return String(raw)
    .replace(/%[^\n]*/g, ' ')
    .replace(/\\(?:label|ref|eqref|cite|citet|citep|footnote|index)\{[^}]*\}/g, ' ')
    .replace(/\\(?:textbf|textit|emph|texttt|mathrm|operatorname\*?|textsc|underline)\{([^{}]*)\}/g, '$1')
    .replace(/\\(?:begin|end)\{[^}]*\}/g, ' ')
    .replace(/\\\\/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTexTitle(tex) {
  if (!tex) return '';
  const m = tex.match(/\\title(?:\[[^\]]*\])?\{([\s\S]*?)\}(?=\s*(?:\\author|\\date|\\begin|%))/);
  return cleanTexText(m ? m[1] : '').slice(0, 280);
}

function extractTexAbstract(tex) {
  if (!tex) return '';
  const m = tex.match(/\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/);
  return cleanTexText(m ? m[1] : '').slice(0, 1800);
}

function extractTexSections(tex) {
  if (!tex) return [];
  const out = [];
  const re = /\\(section|subsection)\*?(?:\[[^\]]*\])?\{([^{}\n]+)\}/g;
  for (const m of tex.matchAll(re)) {
    const title = cleanTexText(m[2]);
    if (!title) continue;
    out.push({ level: m[1] === 'section' ? 1 : 2, title: title.slice(0, 160) });
    if (out.length >= 48) break;
  }
  return out;
}

function stripLeanComments(source) {
  let text = String(source || '');
  text = text.replace(/\/-[\s\S]*?-\//g, ' ');
  text = text.replace(/--[^\n]*/g, '');
  return text;
}

function parseLeanModule(relPath, rawSource) {
  const clean = stripLeanComments(rawSource);
  const imports = [];
  const declarations = [];
  let sorryHits = 0;

  for (const line of clean.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^import\s+/.test(trimmed)) {
      const imp = trimmed.replace(/^import\s+/, '').trim();
      if (imp) imports.push(imp);
      continue;
    }
    if (/\bsorry\b/.test(trimmed)) {
      sorryHits += 1;
    }
    // Match public declarations (excluding private/local/protected)
    if (/^(?:private|protected|local)\b/.test(trimmed)) continue;
    const declMatch = trimmed.match(
      /^(?:@\[[^\]]+\]\s*)*(?:noncomputable\s+)?(theorem|lemma|def|structure|inductive|abbrev|class)\s+([A-Za-z_][A-Za-z0-9_'.]*)/
    );
    if (declMatch) {
      declarations.push({ kind: declMatch[1], name: declMatch[2] });
    }
  }

  const moduleName = relPath
    .replace(/^rigid-identity-framework\/lean\//, '')
    .replace(/\.lean$/, '')
    .replace(/\//g, '.');

  return {
    module: moduleName,
    path: relPath,
    imports,
    declarationCount: declarations.length,
    theoremAndLemmaCount: declarations.filter((d) => d.kind === 'theorem' || d.kind === 'lemma').length,
    sorryHits,
    declarations
  };
}

const PAPERS = [
  ['basecore', 'BaseCore', 'rigid-identity-framework/basecore/BASECORE.tex', 'fuente formal activa (source of truth); el resto depende de ella'],
  ['paper1', 'Paper I', 'rigid-identity-framework/paper1/main.tex', 'identidad rígida y fundamentos (paquete derivado público)'],
  ['paper2', 'Paper II', 'rigid-identity-framework/paper2/main.tex', 'regímenes fenomenológicos y completitud (paquete derivado público)'],
  ['paper3', 'Paper III', 'rigid-identity-framework/paper3/main.tex', 'inestabilidad del régimen nulo y ruido (paquete derivado público)'],
  ['paper4', 'Paper IV', 'rigid-identity-framework/paper4/main.tex', 'protocolo forense QICN v4.5 y campaña por bloques (resultados preliminares sintéticos)'],
  ['paper5', 'Paper V', 'rigid-identity-framework/paper5_operational_consciousness/main.tex', 'criterio operacional C_op e invariantes I_per..I_leg'],
  ['paper6', 'Paper VI', 'rigid-identity-framework/paper6_predictions_falsation/main.tex', 'predicciones falsables y modos de fallo'],
  ['paper7', 'Paper VII', 'rigid-identity-framework/paper7_operational_life_subjecthood/main.tex', 'vida operacional, reparación activa y subjetividad (clasificatorio)'],
  ['paper8', 'Paper VIII', 'rigid-identity-framework/paper8_first_person_subjectivity/main.tex', 'subjetividad en primera persona y reserva informada privada'],
  ['paper9', 'Paper IX', 'rigid-identity-framework/paper9_phenomenal_bridge_organization/main.tex', 'puente fenomenal, BodyWorldTower y desempate híbrido de 5 raíces (bridge_surface_only)'],
  ['paper10', 'Paper X', 'rigid-identity-framework/paper10_external_adjudication/main.tex', 'andamio de protocolo de adjudicación externa y fuga selectiva'],
  ['bridge', 'Paper puente', 'rigid-identity-framework/paper_bridge_operational_subjecthood/main.tex', 'puente formal entre invariantes y subjetividad operacional (cadena Σ_approx)']
];

function computeVaultDigest(vaultWithoutDigest) {
  return sha256(JSON.stringify(vaultWithoutDigest));
}

function verifyExistingVaultIntegrityOnly() {
  if (!fs.existsSync(OUT_PATH)) {
    throw new Error('knowledge/qicn_living_vault.v1.json is missing (and sibling framework repo not found).');
  }
  const parsed = JSON.parse(fs.readFileSync(OUT_PATH, 'utf8'));
  const expected = parsed?.provenance?.vaultSha256;
  if (!expected || typeof expected !== 'string' || !/^[a-f0-9]{64}$/.test(expected)) {
    throw new Error('knowledge/qicn_living_vault.v1.json missing valid 64-hex provenance.vaultSha256');
  }
  const clone = structuredClone(parsed);
  delete clone.provenance.vaultSha256;
  const recomputed = computeVaultDigest(clone);
  if (recomputed !== expected) {
    throw new Error(`knowledge/qicn_living_vault.v1.json SHA-256 mismatch: stored=${expected.slice(0, 12)} computed=${recomputed.slice(0, 12)}`);
  }
  if (parsed?.provenance?.external_support_certified !== false) {
    throw new Error('knowledge/qicn_living_vault.v1.json violates external_support_certified=false boundary');
  }
  return parsed;
}

async function buildLivingVaultObject(fwRoot) {
  const head = (gitIn(fwRoot, ['rev-parse', '--short=12', 'HEAD']) || 'unknown').trim();
  const theoremsRaw = readCommittedFile(fwRoot, 'rigid-identity-framework/registry/theorems.jsonl');
  const macrosRaw = readCommittedFile(fwRoot, 'rigid-identity-framework/registry/macros.jsonl');
  if (!theoremsRaw) throw new Error('Could not read committed rigid-identity-framework/registry/theorems.jsonl');

  const theoremRows = theoremsRaw
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));

  const macroRows = macrosRaw
    ? macrosRaw.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line))
    : [];

  const readJson = (rel) => {
    const raw = readCommittedFile(fwRoot, rel);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  };

  const governance = {
    canonSourceOfTruth: (readCommittedFile(fwRoot, 'docs/CANON_SOURCE_OF_TRUTH.md') || '').trim(),
    canonManifest: (readCommittedFile(fwRoot, 'docs/CANON_MANIFEST.md') || '').trim(),
    claimRegistryDoc: (readCommittedFile(fwRoot, 'docs/CLAIM_REGISTRY.md') || '').trim(),
    layerBoundariesDoc: (readCommittedFile(fwRoot, 'docs/LAYER_BOUNDARIES.md') || '').trim(),
    theorySystemInterfaceDoc: (readCommittedFile(fwRoot, 'docs/THEORY_SYSTEM_INTERFACE.md') || '').trim(),
    glossaryCanonical: (readCommittedFile(fwRoot, 'release/GLOSSARY_CANONICAL.v1.md') || '').trim(),
    claimRegistry: readJson('release/claim_registry.v1.json'),
    layerBoundaries: readJson('release/layer_boundaries.v1.json'),
    systemInterfaceBoundary: readJson('release/system_interface_boundary.v1.json'),
    predictionCanonMap: readJson('rigid-identity-framework/registry/prediction-canon-map.json')
  };

  const statsByPaper = new Map();
  for (const row of theoremRows) {
    const p = row.paper || 'unknown';
    if (!statsByPaper.has(p)) statsByPaper.set(p, { entries: 0, proved: 0, conditional: 0, heuristic: 0, other: 0 });
    const bucket = statsByPaper.get(p);
    bucket.entries += 1;
    const st = String(row.epistemic_status || 'other');
    if (st in bucket) bucket[st] += 1;
    else bucket.other += 1;
  }

  const papers = PAPERS.map(([id, name, file, role]) => {
    const tex = readCommittedFile(fwRoot, file) || '';
    return {
      id,
      name,
      file,
      role,
      sourceSha256: sha256(tex).slice(0, 16),
      title: extractTexTitle(tex) || name,
      abstract: extractTexAbstract(tex),
      sections: extractTexSections(tex),
      stats: statsByPaper.get(id) || { entries: 0, proved: 0, conditional: 0, heuristic: 0, other: 0 }
    };
  });

  const theorems = theoremRows.map((row) => ({
    id: row.id || '',
    paper: row.paper || '',
    type: row.type || '',
    label: row.label || '',
    title: String(row.title || '').slice(0, 180),
    status: row.epistemic_status || 'unknown',
    proofStatus: row.proof_status || 'unknown',
    file: row.location?.file || '',
    line: Number.isFinite(row.location?.line_start) ? row.location.line_start : null,
    deps: Array.isArray(row.depends_on) ? row.depends_on.slice(0, 12) : [],
    statement: String(row.statement || '').replace(/\s+/g, ' ').trim().slice(0, 900)
  }));

  const macros = macroRows.map((row) => ({
    name: row.name || '',
    latex: row.latex_name || '',
    def: String(row.definition || '').slice(0, 260),
    arity: Number.isFinite(row.arity) ? row.arity : 0,
    owner: row.owner || '',
    canonical: Boolean(row.canonical)
  }));

  const leanToolchain = (readCommittedFile(fwRoot, 'rigid-identity-framework/lean/lean-toolchain') || 'leanprover/lean4:v4.31.0').trim();
  const leanVersionMatch = leanToolchain.match(/v(\d+\.\d+\.\d+)/);
  const leanVersion = leanVersionMatch ? leanVersionMatch[1] : '4.31.0';
  const leanPaths = listCommittedFiles(fwRoot, 'rigid-identity-framework/lean', '.lean');
  const leanHashAccumulator = crypto.createHash('sha256');
  const leanModules = [];
  for (const relPath of leanPaths) {
    const src = readCommittedFile(fwRoot, relPath) || '';
    leanHashAccumulator.update(relPath);
    leanHashAccumulator.update('\0');
    leanHashAccumulator.update(src);
    leanModules.push(parseLeanModule(relPath, src));
  }
  const leanTreeSha256 = leanHashAccumulator.digest('hex').slice(0, 16);
  const leanPublicDeclarationCount = leanModules.reduce((acc, m) => acc + m.declarationCount, 0);
  const leanTheoremLemmaCount = leanModules.reduce((acc, m) => acc + m.theoremAndLemmaCount, 0);
  const leanSorryCount = leanModules.reduce((acc, m) => acc + m.sorryHits, 0);

  // Import live QICN-SYSTEM runtime catalogs (cache-busted via query param after sub-builds)
  const stamp = Date.now();
  const invMod = await import(`${pathToFileURL(path.resolve(ROOT, 'src/language/moduleInventory.generated.js')).href}?t=${stamp}`);
  const defMod = await import(`${pathToFileURL(path.resolve(ROOT, 'src/language/definitionCatalog.js')).href}?t=${stamp}`);
  const vaultMod = await import(`${pathToFileURL(path.resolve(ROOT, 'src/language/knowledge/QicnKnowledgeVault.js')).href}?t=${stamp}`);

  const moduleFiles = Array.isArray(invMod.MODULE_FILES) ? [...invMod.MODULE_FILES] : [];
  const moduleNames = Array.isArray(invMod.MODULE_NAMES) ? [...invMod.MODULE_NAMES] : [];
  const runtimeInventorySha256 = sha256(JSON.stringify({ moduleFiles, moduleNames })).slice(0, 16);

  const verifiedOperations = Array.isArray(defMod.EVIDENTIAL_OPERATIONS) ? defMod.EVIDENTIAL_OPERATIONS : [];
  const definitions = defMod.DEFINITIONS && typeof defMod.DEFINITIONS === 'object'
    ? Object.entries(defMod.DEFINITIONS).map(([key, d]) => ({
      key,
      title: d.title || key,
      text: d.text || '',
      source: d.source || ''
    }))
    : [];
  const controllableParameters = vaultMod.CONTROLLABLE_PARAMETER_DOCS && typeof vaultMod.CONTROLLABLE_PARAMETER_DOCS === 'object'
    ? Object.entries(vaultMod.CONTROLLABLE_PARAMETER_DOCS).map(([key, info]) => ({
      key,
      range: info.range || '',
      summary: info.summary || ''
    }))
    : [];

  const claimCount = Array.isArray(governance.claimRegistry?.entries)
    ? governance.claimRegistry.entries.length
    : (Array.isArray(governance.claimRegistry?.claims) ? governance.claimRegistry.claims.length : 0);
  const predictionCount = Array.isArray(governance.predictionCanonMap?.latex_canonical_predictions)
    ? governance.predictionCanonMap.latex_canonical_predictions.length
    : 0;

  const vault = {
    schema: 'qicn.living_knowledge_vault.v1',
    provenance: {
      frameworkHead: head,
      registrySha256: sha256(theoremsRaw).slice(0, 16),
      macrosSha256: sha256(macrosRaw || '').slice(0, 16),
      leanTreeSha256,
      leanVersion,
      runtimeInventorySha256,
      counts: {
        papers: papers.length,
        theorems: theorems.length,
        macros: macros.length,
        leanModules: leanModules.length,
        leanPublicDeclarations: leanPublicDeclarationCount,
        leanTheoremsAndLemmas: leanTheoremLemmaCount,
        leanSorryCount,
        claims: claimCount,
        predictions: predictionCount,
        runtimeFiles: moduleFiles.length,
        runtimeModules: moduleNames.length,
        verifiedOperations: verifiedOperations.length,
        definitions: definitions.length,
        controllableParameters: controllableParameters.length
      },
      evidence_scope: 'internal_support_only',
      external_support_certified: false
    },
    governance,
    papers,
    theorems,
    macros,
    lean: {
      version: leanVersion,
      toolchain: leanToolchain,
      moduleCount: leanModules.length,
      publicDeclarationCount: leanPublicDeclarationCount,
      theoremAndLemmaCount: leanTheoremLemmaCount,
      sorryCount: leanSorryCount,
      modules: leanModules
    },
    runtimeBridge: {
      fileCount: moduleFiles.length,
      moduleCount: moduleNames.length,
      verifiedOperations,
      definitions,
      controllableParameters
    }
  };

  vault.provenance.vaultSha256 = computeVaultDigest(vault);
  return vault;
}

async function main() {
  const fwRoot = resolveFrameworkRoot();

  if (CHECK_MODE) {
    runSubscript('scripts/build-module-inventory.mjs', ['--check']);
    if (!fwRoot) {
      const existing = verifyExistingVaultIntegrityOnly();
      console.log(JSON.stringify({
        status: 'up_to_date_offline_verified',
        frameworkPresent: false,
        frameworkHead: existing.provenance.frameworkHead,
        vaultSha256: existing.provenance.vaultSha256.slice(0, 16),
        counts: existing.provenance.counts
      }));
      return;
    }

    runSubscript('scripts/build-framework-summary.mjs', ['--check', `--framework=${path.join(fwRoot, 'rigid-identity-framework')}`]);
    const existing = verifyExistingVaultIntegrityOnly();
    const expected = await buildLivingVaultObject(fwRoot);
    if (existing.provenance.vaultSha256 !== expected.provenance.vaultSha256) {
      console.error(
        `[living-vault] knowledge/qicn_living_vault.v1.json is stale ` +
        `(disk=${existing.provenance.vaultSha256.slice(0, 12)} head=${existing.provenance.frameworkHead} ` +
        `vs expected=${expected.provenance.vaultSha256.slice(0, 12)} head=${expected.provenance.frameworkHead}). ` +
        'Run: npm run sync:knowledge-vault'
      );
      process.exit(1);
    }
    console.log(JSON.stringify({
      status: 'up_to_date',
      frameworkPresent: true,
      frameworkHead: expected.provenance.frameworkHead,
      vaultSha256: expected.provenance.vaultSha256.slice(0, 16),
      counts: expected.provenance.counts
    }));
    return;
  }

  if (!fwRoot) {
    console.error('[living-vault] Sibling framework repository not found (expected ../qicn-framework-ordenado or --framework=<path>).');
    process.exit(1);
  }

  runSubscript('scripts/build-framework-summary.mjs', [`--framework=${path.join(fwRoot, 'rigid-identity-framework')}`]);
  runSubscript('scripts/build-module-inventory.mjs');

  const vault = await buildLivingVaultObject(fwRoot);
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  const serialized = `${JSON.stringify(vault)}\n`;
  fs.writeFileSync(OUT_PATH, serialized, 'utf8');

  console.log(JSON.stringify({
    status: 'synced',
    out: path.relative(ROOT, OUT_PATH),
    bytes: Buffer.byteLength(serialized, 'utf8'),
    frameworkHead: vault.provenance.frameworkHead,
    vaultSha256: vault.provenance.vaultSha256.slice(0, 16),
    counts: vault.provenance.counts
  }, null, 2));
}

main().catch((err) => {
  console.error(`[living-vault] ERROR: ${err?.message || err}`);
  process.exit(1);
});

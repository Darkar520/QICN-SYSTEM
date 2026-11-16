#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');
const { readReportOutputArg, resolveReportOutput } = require('./lib/report-output-path.cjs');

const ROOT = path.resolve(__dirname, '..');
const SRC_ROOT = path.join(ROOT, 'src');
const ALLOWED_ACTIVE_SUPPORT_ROOTS = [
  path.join(ROOT, 'services'),
  path.join(ROOT, 'config')
];
const DOCUMENTATION_WHITELIST = new Set([
  'src/canon/sourceOfTruth.js'
]);

const files = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (/\.(js|jsx|mjs|cjs)$/.test(entry.name)) {
      files.push(full);
    }
  }
};

walk(SRC_ROOT);
const violations = [];
for (const file of files) {
  const relFile = path.relative(ROOT, file).replace(/\\/g, '/');
  if (DOCUMENTATION_WHITELIST.has(relFile)) continue;
  const text = fs.readFileSync(file, 'utf8');
  const importRegex = /(?:import\s+[^'"]*from\s+|import\s*\(|require\()\s*['"]([^'"]+)['"]/g;
  for (const match of text.matchAll(importRegex)) {
    const spec = match[1];
    if (spec.startsWith('./') || spec.startsWith('../')) {
      const resolved = path.resolve(path.dirname(file), spec);
      const allowedActiveSupport = ALLOWED_ACTIVE_SUPPORT_ROOTS.some((root) => resolved.startsWith(root));
      if (!resolved.startsWith(SRC_ROOT) && !allowedActiveSupport) {
        violations.push({ file: relFile, specifier: spec, reason: 'IMPORT_OUTSIDE_SRC_ROOT' });
      }
      if (
        resolved.includes(`${path.sep}simulation${path.sep}`) &&
        !resolved.startsWith(path.join(SRC_ROOT, 'simulation')) &&
        !resolved.startsWith(path.join(ROOT, 'services')) &&
        !resolved.startsWith(path.join(ROOT, 'config'))
      ) {
        violations.push({ file: relFile, specifier: spec, reason: 'IMPORT_INTO_LEGACY_SIMULATION_TREE' });
      }
      if (
        resolved.includes(`${path.sep}js${path.sep}`) &&
        !resolved.startsWith(path.join(SRC_ROOT, 'js')) &&
        !resolved.startsWith(path.join(ROOT, 'services')) &&
        !resolved.startsWith(path.join(ROOT, 'config'))
      ) {
        violations.push({ file: relFile, specifier: spec, reason: 'IMPORT_INTO_LEGACY_JS_TREE' });
      }
    } else if (/SISTEMA CANON|Sistema Canon Sandbox\/simulation\/|Sistema Canon Sandbox\/js\//.test(spec)) {
      violations.push({ file: relFile, specifier: spec, reason: 'EXPLICIT_LEGACY_SPECIFIER' });
    }
  }
}

const payload = {
  activeRoot: 'src',
  buildEntry: 'src/index.jsx',
  sourceOfTruth: 'src',
  legacyPathDecisions: [
    {
      path: 'SISTEMA CANON',
      decision: 'LEGACY_TO_ARCHIVE',
      phase4ConsolidationStatus: 'READY_TO_ARCHIVE_NEXT'
    },
    {
      path: 'simulation',
      decision: 'LEGACY_TO_BLOCK_FROM_RUNTIME',
      phase4ConsolidationStatus: 'BLOCKED_KEEP_ONE_MORE_PHASE'
    },
    {
      path: 'js',
      decision: 'LEGACY_TO_BLOCK_FROM_RUNTIME',
      phase4ConsolidationStatus: 'BLOCKED_KEEP_ONE_MORE_PHASE'
    }
  ],
  scannedFiles: files.length,
  violations,
  status: violations.length === 0 ? 'PASS' : 'FAIL'
};

const outPath = resolveReportOutput({
  projectRoot: ROOT,
  defaultPath: path.join(ROOT, 'artifacts', 'runtime_source_of_truth_check.json'),
  outputPath: readReportOutputArg(process.argv.slice(2))
});
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

if (violations.length) {
  console.error('[QICN] Source-of-truth verification failed.');
  console.error(JSON.stringify(violations, null, 2));
  process.exit(1);
}

console.log('[QICN] Source-of-truth verification passed.');

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const STRONG_TERM_RE = /\b(consciencia|conciencia|consciousness|phenomenality|phenomenal|transcendence|transcendencia|ascension|ascensi[oó]n|identity|identidad|ontological|ontol[oó]gic[oa])\b/i;
const EXTERNAL_VALIDATION_RE = /\b(external validation|externally validated|validaci[oó]n externa|validado externamente)\b/i;
const NEGATED_EXTERNAL_VALIDATION_RE = /\b(not|no|never|without|sin|nunca)\b[^.\n;]{0,120}\b(external validation|externally validated|validaci[oó]n externa|validado externamente)\b/i;
const SCANNABLE_EXTS = new Set(['.cjs', '.js', '.jsx', '.json', '.md', '.mjs', '.txt']);
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage']);

const defaultTargets = [
  'src/experiments/ControlledStatements.js',
  'src/experiments/OutputConsumptionPolicy.js',
  'src/experiments/OutputSurfaceEnforcer.js',
  'src/experiments/OutputSurfacePolicy.js',
  'docs/EXTERNAL_EVIDENCE_ADMISSIBILITY.md'
];

const has = (content, pattern) => pattern.test(content);

const isPositiveExternalValidationLine = (line, context = line) => {
  if (!EXTERNAL_VALIDATION_RE.test(line)) return false;
  if (NEGATED_EXTERNAL_VALIDATION_RE.test(line)) return false;
  if (/\bThis is externally validated\./i.test(line)) return false;
  if (/\b(PROHIBITED|blocked|required_for_promotion)\b/i.test(context)) return false;
  if (/\brequires?\b[^.\n;]{0,120}\bexternal validation\b[^.\n;]{0,120}\bnot present\b/i.test(context)) return false;
  return true;
};

const readFile = (filePath) => fs.readFileSync(filePath, 'utf8');

const listFiles = (targetPath) => {
  const resolved = path.resolve(targetPath);
  if (!fs.existsSync(resolved)) return [];
  const stat = fs.statSync(resolved);
  if (stat.isFile()) return SCANNABLE_EXTS.has(path.extname(resolved).toLowerCase()) ? [resolved] : [];
  if (!stat.isDirectory()) return [];

  const out = [];
  const stack = [resolved];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) stack.push(path.join(current, entry.name));
        continue;
      }
      const filePath = path.join(current, entry.name);
      if (SCANNABLE_EXTS.has(path.extname(filePath).toLowerCase())) out.push(filePath);
    }
  }
  return out.sort((a, b) => a.localeCompare(b));
};

const analyzeFile = (filePath) => {
  const content = readFile(filePath);
  const findings = [];
  const strongTermPresent = has(content, STRONG_TERM_RE);

  if (strongTermPresent && !/\bclaim_scope\b/i.test(content)) {
    findings.push({
      code: 'missing_claim_scope',
      file: filePath,
      message: 'Strong claim wording appears without claim_scope.'
    });
  }

  if (strongTermPresent && !/\b(interpretation_boundary|claim_boundary|nonclaim_boundary)\b/i.test(content)) {
    findings.push({
      code: 'missing_interpretation_boundary',
      file: filePath,
      message: 'Strong claim wording appears without an explicit interpretation/claim boundary.'
    });
  }

  const evidenceScopeMatch = content.match(/\bevidence_scope\b\s*[:=]\s*["']?([A-Z_]+)/i);
  const evidenceScope = evidenceScopeMatch ? evidenceScopeMatch[1].toUpperCase() : null;
  const lines = content.split(/\r?\n/);
  const positiveExternalLines = lines
    .map((line, index) => ({
      line,
      lineNumber: index + 1,
      context: lines.slice(Math.max(0, index - 3), Math.min(lines.length, index + 4)).join('\n')
    }))
    .filter(({ line, context }) => isPositiveExternalValidationLine(line, context));

  if (positiveExternalLines.length && evidenceScope !== 'EXTERNAL_VALIDATION') {
    findings.push({
      code: 'external_validation_overclaim',
      file: filePath,
      line: positiveExternalLines[0].lineNumber,
      message: 'Positive external-validation wording requires evidence_scope=EXTERNAL_VALIDATION.'
    });
  }

  if (/\bpaper_level_equivalent_status\b/i.test(content)
    && /\bEXTERNAL_VALIDATION\b/i.test(content)
    && !/\b(external_package_ref|external_review_package_ref|external_evidence_package_ref)\b/i.test(content)) {
    findings.push({
      code: 'missing_external_package_ref',
      file: filePath,
      message: 'paper_level_equivalent_status with EXTERNAL_VALIDATION requires an external package reference.'
    });
  }

  return findings;
};

const targets = process.argv.slice(2);
const scanTargets = targets.length ? targets : defaultTargets.filter((target) => fs.existsSync(path.resolve(target)));
const files = [...new Set(scanTargets.flatMap(listFiles))];
const findings = files.flatMap(analyzeFile);

if (findings.length) {
  console.error(`[claim-surface-boundaries] FAIL: ${findings.length} finding(s)`);
  for (const finding of findings) {
    const rel = path.relative(process.cwd(), finding.file);
    const loc = finding.line ? `:${finding.line}` : '';
    console.error(`- ${finding.code} ${rel}${loc} :: ${finding.message}`);
  }
  process.exit(1);
}

console.log(`[claim-surface-boundaries] OK: ${files.length} file(s) scanned`);

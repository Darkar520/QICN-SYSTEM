#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..');

const resolveManuscriptDir = () => {
  const candidates = [path.join(ROOT, 'paper9_phenomenal_bridge_organization')];
  const envRoots = [process.env.ECO_RELEASE_ROOT, process.env.QICN_FRAMEWORK_ROOT].filter(Boolean);
  for (const envRoot of envRoots) {
    const resolved = path.resolve(envRoot);
    candidates.push(
      path.join(resolved, 'paper9_phenomenal_bridge_organization'),
      path.join(resolved, 'rigid-identity-framework', 'paper9_phenomenal_bridge_organization')
    );
  }
  const siblingFramework = path.resolve(ROOT, '..', 'qicn-framework-ordenado');
  candidates.push(
    path.join(siblingFramework, 'paper9_phenomenal_bridge_organization'),
    path.join(siblingFramework, 'rigid-identity-framework', 'paper9_phenomenal_bridge_organization')
  );
  const found = candidates.find(
    (dir) => fs.existsSync(path.join(dir, 'main.tex')) && fs.existsSync(path.join(dir, 'main.pdf'))
  );
  return found || candidates[0];
};

const MANUSCRIPT_DIR = resolveManuscriptDir();
const MAIN_TEX = path.join(MANUSCRIPT_DIR, 'main.tex');
const MAIN_PDF = path.join(MANUSCRIPT_DIR, 'main.pdf');
const MAIN_LOG = path.join(MANUSCRIPT_DIR, 'main.log');
const SHARED_BIB = path.join(MANUSCRIPT_DIR, 'references.bib');
const LOCAL_BIB = path.join(MANUSCRIPT_DIR, 'paper9_local_references.bib');
const HANDOFF_ARTIFACT = path.join(ROOT, 'artifacts', 'comparative_program', 'stage3_readiness', 'paper9_handoff_alignment.json');
const STAGE3_BUILDER_SCRIPT = path.join(ROOT, 'scripts', 'build-stage3-readiness-fulfillment.cjs');
const LOCAL_PATH_PATTERN = /\/c:\/|[A-Za-z]:\\Users\\|OneDrive|Escritorio|QICN-FRAMEWORK|Sistema Canon Sandbox|rigid-identity-framework/i;
const NEGATION_CONTEXT = /\b(not|does not|doesn't|without|blocked|remains blocked|not authorize|does not authorize|invalid|unavailable|does not follow)\b/i;
const BANNED_PATTERNS = [
  /external adjudication already happened/i,
  /human equivalence (already )?(exists|has been (shown|established|demonstrated))/i,
  /superiority (already )?(exists|has been (shown|established|demonstrated|supported))/i,
  /inferiority (already )?(exists|has been (shown|established|demonstrated|supported))/i,
  /transport preservation (has been )?(shown|established|demonstrated|supported)/i,
  /Paper 10 (is )?(authorized|open(ed)?)/i
];
const REQUIRED_PATTERNS = [
  /BPF-M3/,
  /Stage 2-M4/,
  /Stage 3 readiness fulfillment/i,
  /external adjudication/i,
  /Paper 10/i,
  /ready[_ ]for[_ ]stage3[_ ]opening|Stage 3 opening/i
];

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const readText = (filePath) => fs.readFileSync(filePath, 'utf8');

const parsePageCount = () => {
  if (fs.existsSync(MAIN_LOG)) {
    const logText = readText(MAIN_LOG);
    const match = logText.match(/Output written on main\.pdf \((\d+) pages?,/i);
    if (match) return Number(match[1]);
  }
  if (!fs.existsSync(MAIN_PDF)) return null;
  const pdfText = fs.readFileSync(MAIN_PDF, 'latin1');
  const pagesTreeMatches = [...pdfText.matchAll(/\/Type\s*\/Pages\b[\s\S]{0,400}?\/Count\s+(\d+)/g)];
  if (pagesTreeMatches.length > 0) {
    const counts = pagesTreeMatches.map((entry) => Number(entry[1])).filter((n) => n > 0);
    if (counts.length > 0) return Math.max(...counts);
  }
  const pageLeaves = pdfText.match(/\/Type\s*\/Page\b(?!s)/g);
  return pageLeaves && pageLeaves.length > 0 ? pageLeaves.length : null;
};

const ensureHandoffArtifactBuilt = () => {
  if (fs.existsSync(HANDOFF_ARTIFACT)) return;
  if (fs.existsSync(STAGE3_BUILDER_SCRIPT)) {
    cp.execFileSync(process.execPath, [STAGE3_BUILDER_SCRIPT], { cwd: ROOT, stdio: 'pipe' });
  }
};

const assertNoUnboundedMatches = (text, pattern) => {
  const lines = text.split(/\r?\n/);
  const offendingLine = lines.find((line) => pattern.test(line) && !NEGATION_CONTEXT.test(line));
  assert(!offendingLine, `Banned manuscript wording found: ${pattern}`);
};

const main = () => {
  ensureHandoffArtifactBuilt();
  assert(fs.existsSync(MAIN_TEX), 'Missing Paper 9 manuscript source: paper9_phenomenal_bridge_organization/main.tex');
  assert(fs.existsSync(MAIN_PDF), 'Missing compiled Paper 9 PDF: paper9_phenomenal_bridge_organization/main.pdf');
  assert(fs.existsSync(SHARED_BIB), 'Missing shared bibliography for Paper 9');
  assert(fs.existsSync(LOCAL_BIB), 'Missing local bibliography for Paper 9');
  assert(fs.existsSync(HANDOFF_ARTIFACT), 'Missing paper9_handoff_alignment.json');

  const manuscriptText = readText(MAIN_TEX);
  const pageCount = parsePageCount();
  const handoff = JSON.parse(readText(HANDOFF_ARTIFACT));
  const bannedScanText = manuscriptText.replace(/``[\s\S]*?''/g, '');

  REQUIRED_PATTERNS.forEach((pattern) => {
    assert(pattern.test(manuscriptText), `Missing required manuscript content: ${pattern}`);
  });
  BANNED_PATTERNS.forEach((pattern) => {
    assertNoUnboundedMatches(bannedScanText, pattern);
  });
  assert(!LOCAL_PATH_PATTERN.test(manuscriptText), 'Local path leak found in Paper 9 manuscript source');
  assert(handoff.paper9_handoff_state === 'paper9_handoff_ready_after_second_pass', 'Paper 9 handoff artifact is not in the ready-after-second-pass state');
  assert(handoff.paper9_location && handoff.paper9_location.manuscript_present_in_allowed_roots === true, 'Paper 9 handoff artifact does not recognize the manuscript inside allowed roots');
  assert(handoff.external_support_certified !== true, 'Paper 9 handoff artifact must not certify external support');
  assert(
    !handoff.boundary_flags || (
      handoff.boundary_flags.external_support_certified !== true
      && handoff.boundary_flags.not_external_adjudication === true
    ),
    'Paper 9 handoff boundary flags must preserve external_support_certified: false and not_external_adjudication: true'
  );
  assert(typeof pageCount === 'number' && pageCount > 0, 'Could not determine Paper 9 PDF page count from main.log or main.pdf');

  console.log(`PASS verify-paper9-handoff-readiness (${pageCount} pages)`);
};

try {
  main();
} catch (error) {
  console.error(`FAIL verify-paper9-handoff-readiness: ${error.message}`);
  process.exitCode = 1;
}
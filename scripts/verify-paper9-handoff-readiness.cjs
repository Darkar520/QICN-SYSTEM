#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MANUSCRIPT_DIR = path.join(ROOT, 'paper9_phenomenal_bridge_organization');
const MAIN_TEX = path.join(MANUSCRIPT_DIR, 'main.tex');
const MAIN_PDF = path.join(MANUSCRIPT_DIR, 'main.pdf');
const MAIN_LOG = path.join(MANUSCRIPT_DIR, 'main.log');
const SHARED_BIB = path.join(MANUSCRIPT_DIR, 'references.bib');
const LOCAL_BIB = path.join(MANUSCRIPT_DIR, 'paper9_local_references.bib');
const HANDOFF_ARTIFACT = path.join(ROOT, 'artifacts', 'comparative_program', 'stage3_readiness', 'paper9_handoff_alignment.json');
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
  if (!fs.existsSync(MAIN_LOG)) return null;
  const logText = readText(MAIN_LOG);
  const match = logText.match(/Output written on main\.pdf \((\d+) pages?,/i);
  return match ? Number(match[1]) : null;
};

const assertNoUnboundedMatches = (text, pattern) => {
  const lines = text.split(/\r?\n/);
  const offendingLine = lines.find((line) => pattern.test(line) && !NEGATION_CONTEXT.test(line));
  assert(!offendingLine, `Banned manuscript wording found: ${pattern}`);
};

const main = () => {
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
  assert(typeof pageCount === 'number' && pageCount > 0, 'Could not determine Paper 9 PDF page count from main.log');

  console.log(`PASS verify-paper9-handoff-readiness (${pageCount} pages)`);
};

try {
  main();
} catch (error) {
  console.error(`FAIL verify-paper9-handoff-readiness: ${error.message}`);
  process.exitCode = 1;
}
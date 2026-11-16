#!/usr/bin/env node
/**
 * verify-framework-import-drift.cjs  (Bridge Phase 1)
 *
 * Detects drift between the QICN-FRAMEWORK import snapshot and:
 *   (a) the local imported copies under qicn_imported_* (LOCAL integrity), and
 *   (b) the live framework at the pinned commit (UPSTREAM staleness).
 *
 * Governance: read-only. Reports drift; never re-imports or mutates anything.
 * Internal != external. Does not certify anything.
 *
 * Gate semantics (default):
 *   - FAIL only on un-allowlisted LOCAL_DRIFT or DESTINATION_MISSING
 *     (the quarantined copies must match what was imported).
 *   - UPSTREAM_DRIFT / SOURCE_MISSING are reported as sync status (STALE),
 *     NOT a hard failure: re-import is a manual reviewed action (Phase 0).
 *   - --strict additionally fails on un-allowlisted upstream drift.
 *
 * Flags:
 *   --self-test            run internal logic tests, exit 0/1
 *   --strict               also fail on un-allowlisted upstream drift
 *   --json-file=<path>     write the full report JSON to <path>
 *   --out=<path>           alias for --json-file (QICN_REPORT_DIR also opt-in)
 *   --local-only           never resolve/probe the upstream tree; also enabled
 *                          by QICN_BRIDGE_LOCAL_ONLY=1. Strict cannot pass here.
 *   --framework-root=<dir> override framework root (else env QICN_FRAMEWORK_ROOT
 *                          or manifest.source_root)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { readReportOutputArg, resolveReportOutput, isBridgeLocalOnly } = require('./lib/report-output-path.cjs');

const REPO_ROOT = path.resolve(__dirname, '..');
const MANIFEST = path.join(REPO_ROOT, 'qicn_imported_manifest_v39.json');
const ALLOWLIST = path.join(REPO_ROOT, 'docs', 'bridge_drift_allowlist.v1.json');
const PIN = path.join(REPO_ROOT, 'docs', 'bridge_pin.v1.json');

function sha256(file) {
  // Normalize line endings to LF before hashing for cross-platform consistency.
  // Windows commits with CRLF; CI (Ubuntu) checks out as LF via git autocrlf.
  const raw = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
}

function resolveFrameworkRoot(manifest, argRoot) {
  if (argRoot) return argRoot;
  if (process.env.QICN_FRAMEWORK_ROOT) return process.env.QICN_FRAMEWORK_ROOT;
  return manifest.source_root;
}

function loadAllowlist() {
  if (!fs.existsSync(ALLOWLIST)) return { entries: [] };
  try { return readJson(ALLOWLIST); } catch { return { entries: [] }; }
}

function normRel(p) {
  return String(p).replace(/\\/g, '/');
}

function isAllowlisted(allow, relative, kind) {
  const rel = normRel(relative);
  return (allow.entries || []).some(
    (e) => normRel(e.path) === rel && (!e.kinds || e.kinds.includes(kind))
  );
}

/** Core comparison. Pure: takes a fileHash resolver so it is unit-testable. */
function computeDrift({ manifest, frameworkRoot, repoRoot, allow, hashFn, existsFn, localOnly = false }) {
  const findings = [];
  const counts = {
    total: 0, in_sync: 0,
    local_drift: 0, destination_missing: 0,
    upstream_drift: 0, source_missing: 0,
    allowlisted: 0,
  };
  if (localOnly) counts.local_intact = 0;

  for (const entry of manifest.entries) {
    counts.total += 1;
    const destAbs = path.join(repoRoot, ...entry.destination_relative.replace(/\\\\/g, "/").split("/"));
    const rec = { path: normRel(entry.source_relative), status: [], allowlisted: [] };

    // (a) local integrity
    if (!existsFn(destAbs)) {
      rec.status.push('DESTINATION_MISSING');
      counts.destination_missing += 1;
    } else if (hashFn(destAbs) !== entry.sha256_destination) {
      rec.status.push('LOCAL_DRIFT');
      counts.local_drift += 1;
    }

    // (b) upstream staleness
    if (!localOnly) {
      const srcAbs = path.join(frameworkRoot, ...entry.source_relative.replace(/\\\\/g, "/").split("/"));
      if (!existsFn(srcAbs)) {
        rec.status.push('SOURCE_MISSING');
        counts.source_missing += 1;
      } else if (hashFn(srcAbs) !== entry.sha256_source) {
        rec.status.push('UPSTREAM_DRIFT');
        counts.upstream_drift += 1;
      }
    }

    if (rec.status.length === 0) {
      if (localOnly) counts.local_intact += 1;
      else counts.in_sync += 1;
      continue;
    }
    for (const k of rec.status) {
      if (isAllowlisted(allow, entry.source_relative, k)) rec.allowlisted.push(k);
    }
    if (rec.allowlisted.length) counts.allowlisted += 1;
    findings.push(rec);
  }
  return { counts, findings };
}

function gateVerdict(counts, findings, strict, localOnly = false) {
  const blocking = findings.filter((f) =>
    f.status.some(
      (k) =>
        (['LOCAL_DRIFT', 'DESTINATION_MISSING'].includes(k) ||
          (strict && ['UPSTREAM_DRIFT', 'SOURCE_MISSING'].includes(k))) &&
        !f.allowlisted.includes(k)
    )
  );
  if (strict && localOnly) {
    blocking.push({ path: null, status: ['UPSTREAM_NOT_CHECKED'], allowlisted: [] });
  }
  const stale = counts.upstream_drift > 0 || counts.source_missing > 0;
  return {
    integrity: blocking.length === 0 ? 'PASS' : 'FAIL',
    sync_status: localOnly ? 'not_recorded' : (stale ? 'STALE' : 'IN_SYNC'),
    blocking_count: blocking.length,
    blocking,
  };
}

function runReal(argv) {
  const strict = argv.includes('--strict');
  const rootArg = (argv.find((a) => a.startsWith('--framework-root=')) || '').split('=')[1];
  const localOnly = argv.includes('--local-only') || isBridgeLocalOnly();
  const requestedOut = readReportOutputArg(argv, ['json-file']);
  // Historically the bridge writes no report unless --json-file is passed.
  const jsonOut = requestedOut !== undefined || process.env.QICN_REPORT_DIR?.trim()
    ? resolveReportOutput({
      projectRoot: REPO_ROOT,
      defaultPath: path.join(REPO_ROOT, 'artifacts', 'bridge_drift_report.v1.json'),
      outputPath: requestedOut,
      cwd: REPO_ROOT
    })
    : null;

  const manifest = readJson(MANIFEST);
  const allow = loadAllowlist();
  const pin = fs.existsSync(PIN) ? readJson(PIN) : null;
  const frameworkRoot = localOnly ? null : resolveFrameworkRoot(manifest, rootArg);

  const frameworkPresent = localOnly ? null : fs.existsSync(frameworkRoot);
  const hashFn = (f) => sha256(f);
  const existsFn = (f) => fs.existsSync(f);

  const { counts, findings } = computeDrift({
    manifest, frameworkRoot, repoRoot: REPO_ROOT, allow, hashFn, existsFn, localOnly,
  });
  const verdict = gateVerdict(counts, findings, strict, localOnly);

  const report = {
    schema: 'bridge_drift_report.v1',
    generated_at: new Date().toISOString(),
    framework_root: frameworkRoot,
    framework_root_present: frameworkPresent,
    bridge_pin: pin ? pin.framework.pin_commit_short : 'unknown',
    import_manifest: path.basename(MANIFEST),
    strict,
    counts,
    verdict,
    findings,
    ...(localOnly ? {
      verification_scope: 'local_only',
      upstream_status: 'not_recorded',
      evidence_scope: 'internal_support_only',
      external_support_certified: false
    } : {}),
  };

  if (jsonOut) {
    const outPath = path.resolve(REPO_ROOT, jsonOut);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  }

  console.log('[bridge:drift] framework_root_present=' + frameworkPresent +
    ' pin=' + report.bridge_pin);
  console.log('[bridge:drift] total=' + counts.total +
    ' in_sync=' + counts.in_sync +
    ' local_drift=' + counts.local_drift +
    ' dest_missing=' + counts.destination_missing +
    ' upstream_drift=' + counts.upstream_drift +
    ' source_missing=' + counts.source_missing +
    ' allowlisted=' + counts.allowlisted);
  console.log('[bridge:drift] integrity=' + verdict.integrity +
    ' sync_status=' + verdict.sync_status +
    ' blocking=' + verdict.blocking_count);

  if (localOnly) {
    console.log('[bridge:drift] local-only: upstream not queried; sync status not_recorded.');
  } else if (!frameworkPresent) {
    console.log('[bridge:drift] NOTE: framework root not found; upstream check skipped. ' +
      'Set QICN_FRAMEWORK_ROOT or --framework-root=. Local integrity still evaluated.');
  }
  if (verdict.integrity === 'FAIL') {
    console.error('[bridge:drift] FAIL: un-allowlisted local integrity drift:');
    for (const b of verdict.blocking) console.error('  - ' + b.path + ' [' + b.status.join(',') + ']');
    process.exit(1);
  }
  process.exit(0);
}

function selfTest() {
  let ok = true;
  const eq = (name, got, exp) => {
    const pass = JSON.stringify(got) === JSON.stringify(exp);
    if (!pass) { ok = false; console.error('  FAIL ' + name + ' got=' + JSON.stringify(got) + ' exp=' + JSON.stringify(exp)); }
    else console.log('  ok ' + name);
  };

  const fwRoot = path.join('/tmp-fw');
  const repoRoot = path.join('/tmp-repo');
  const k = (root, rel) => path.join(root, rel);

  const manifest = {
    source_root: fwRoot,
    entries: [
      { source_relative: 'a.txt', destination_relative: 'q/a.txt', sha256_source: 'SA', sha256_destination: 'DA' },
      { source_relative: 'b.txt', destination_relative: 'q/b.txt', sha256_source: 'SB', sha256_destination: 'DB' },
      { source_relative: 'c.txt', destination_relative: 'q/c.txt', sha256_source: 'SC', sha256_destination: 'DC' },
      { source_relative: 'd.txt', destination_relative: 'q/d.txt', sha256_source: 'SD', sha256_destination: 'DD' },
    ],
  };
  // Synthetic world (keys built with path.join for OS portability):
  //  a: fully in sync ; b: upstream drift ; c: local drift ; d: source missing (allowlisted)
  const world = {};
  world[k(fwRoot, 'a.txt')] = 'SA'; world[k(repoRoot, 'q/a.txt')] = 'DA';
  world[k(fwRoot, 'b.txt')] = 'SB2'; world[k(repoRoot, 'q/b.txt')] = 'DB';
  world[k(fwRoot, 'c.txt')] = 'SC'; world[k(repoRoot, 'q/c.txt')] = 'DC2';
  world[k(repoRoot, 'q/d.txt')] = 'DD';
  // fwRoot/d.txt intentionally absent

  const hashFn = (f) => world[f];
  const existsFn = (f) => Object.prototype.hasOwnProperty.call(world, f);
  const allow = { entries: [{ path: 'd.txt', kinds: ['SOURCE_MISSING'] }] };

  const args = { manifest, frameworkRoot: fwRoot, repoRoot, allow, hashFn, existsFn };
  const { counts, findings } = computeDrift(args);
  eq('in_sync', counts.in_sync, 1);
  eq('local_drift', counts.local_drift, 1);
  eq('upstream_drift', counts.upstream_drift, 1);
  eq('source_missing', counts.source_missing, 1);

  const verdict = gateVerdict(counts, findings, false);
  eq('integrity_fail_on_local_drift', verdict.integrity, 'FAIL');
  eq('sync_stale', verdict.sync_status, 'STALE');
  eq('blocking_is_c_only', verdict.blocking.map((b) => b.path), ['c.txt']);

  const verdictStrict = gateVerdict(counts, findings, true);
  eq('strict_blocks_b_and_c', verdictStrict.blocking.map((b) => b.path).sort(), ['b.txt', 'c.txt']);

  console.log(ok ? '[bridge:drift] self-test PASS' : '[bridge:drift] self-test FAIL');
  process.exit(ok ? 0 : 1);
}
const argv = process.argv.slice(2);
if (argv.includes('--self-test')) selfTest();
else runReal(argv);

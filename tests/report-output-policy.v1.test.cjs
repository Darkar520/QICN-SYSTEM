const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const { execFileSync, spawnSync } = require('node:child_process');
const { readReportOutputArg, resolveReportOutput, isBridgeLocalOnly } = require('../scripts/lib/report-output-path.cjs');

const ROOT = path.resolve(__dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'qicn-report-policy-'));
const cleanEnv = { ...process.env };
delete cleanEnv.QICN_REPORT_DIR;
delete cleanEnv.QICN_BRIDGE_LOCAL_ONLY;
const digest = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const canonicalReports = [
  'artifacts/runtime_source_of_truth_check.json',
  'artifacts/operational_readiness_manifest.json',
  'artifacts/operational_readiness/environment_contract_manifest.json',
  'artifacts/operational_smoke_manifest.json',
  'docs/cognitive_emergence_prereg.v1.json'
];
const before = new Map(canonicalReports.map((rel) => [rel, fs.existsSync(path.join(ROOT, rel)) ? digest(path.join(ROOT, rel)) : null]));
const invoke = (script, args = [], env = cleanEnv) => {
  const result = spawnSync(process.execPath, [script, ...args], { cwd: ROOT, env, encoding: 'utf8', timeout: 120000, windowsHide: true });
  assert.equal(result.status, 0, `${script}: ${result.stderr || result.stdout}`);
  return result;
};

// Run the actual bridge CLI logic with synthetic filesystem capabilities. A
// forbidden upstream read/probe throws before it could access any real tree.
const bridgeSandbox = (source, argv, env = {}, local = false) => {
  const writes = new Map();
  const upstream = path.join(ROOT, 'synthetic-upstream-never-accessed-on-disk');
  const destination = path.join(ROOT, 'synthetic-import.txt');
  const sourceFile = path.join(upstream, 'a.txt');
  const hash = crypto.createHash('sha256').update('fixture').digest('hex');
  const manifest = { source_root: upstream, entries: [{ source_relative: 'a.txt', destination_relative: 'synthetic-import.txt', sha256_destination: hash, sha256_source: hash }] };
  let probes = 0;
  let exitCode = null;
  const virtual = new Map([
    [path.join(ROOT, 'qicn_imported_manifest_v39.json'), JSON.stringify(manifest)],
    [path.join(ROOT, 'docs/bridge_drift_allowlist.v1.json'), '{"entries":[]}'],
    [path.join(ROOT, 'docs/bridge_pin.v1.json'), '{"framework":{"pin_commit_short":"fixture"}}'],
    [destination, 'fixture'], [sourceFile, 'fixture']
  ]);
  const check = (file) => {
    if (String(file).startsWith(upstream)) {
      probes += 1;
      assert.equal(local, false, 'local-only probed upstream');
    }
  };
  const mockFs = {
    existsSync(file) { check(file); return file === upstream || virtual.has(file); },
    readFileSync(file) { check(file); assert.ok(virtual.has(file), `unexpected read: ${file}`); return virtual.get(file); },
    mkdirSync() {},
    writeFileSync(file, text) { writes.set(file, String(text)); }
  };
  const helper = require('../scripts/lib/report-output-path.cjs');
  const sandboxRequire = (name) => {
    if (name === 'fs') return mockFs;
    if (name === './lib/report-output-path.cjs') return {
      ...helper,
      isBridgeLocalOnly: () => helper.isBridgeLocalOnly(env),
      resolveReportOutput: (options) => helper.resolveReportOutput({ ...options, env })
    };
    return require(name);
  };
  class FixedDate extends Date { constructor(...args) { super(...(args.length ? args : [1_800_000_000_000])); } }
  const exit = new Error('synthetic process exit');
  try { vm.runInNewContext(source, {
    require: sandboxRequire, __dirname: path.join(ROOT, 'scripts'), Date: FixedDate,
    console: { log() {}, error() {} },
    process: { argv: [process.execPath, 'bridge', ...argv], env, exit(code) { exitCode = code; throw exit; } }
  }); } catch (error) { if (error !== exit) throw error; }
  return { writes, probes, exitCode };
};

try {
  for (const rel of canonicalReports) {
    const defaultPath = path.join(ROOT, rel);
    assert.equal(resolveReportOutput({ projectRoot: ROOT, defaultPath, env: {} }), defaultPath);
    assert.equal(resolveReportOutput({ projectRoot: ROOT, defaultPath, env: { QICN_REPORT_DIR: '' } }), defaultPath);
    assert.equal(resolveReportOutput({ projectRoot: ROOT, defaultPath, env: { QICN_REPORT_DIR: temp } }), path.join(temp, rel));
    assert.equal(resolveReportOutput({ projectRoot: ROOT, defaultPath, outputPath: path.join(temp, 'explicit.json'), env: { QICN_REPORT_DIR: 'unused' } }), path.join(temp, 'explicit.json'));
  }
  assert.equal(readReportOutputArg([]), undefined);
  assert.equal(readReportOutputArg(['--out=a=b.json']), 'a=b.json');
  assert.equal(readReportOutputArg(['--out', 'file with spaces.json']), 'file with spaces.json');
  assert.equal(readReportOutputArg(['--output=legacy.json'], ['output']), 'legacy.json');
  assert.equal(readReportOutputArg(['--json-file=legacy.json'], ['json-file']), 'legacy.json');
  for (const argv of [['--out'], ['--out='], ['--out', '--strict'], ['--out=a', '--out=b']]) {
    assert.throws(() => readReportOutputArg(argv));
  }
  for (const value of [undefined, '', '0', 'false', 'true']) assert.equal(isBridgeLocalOnly({ QICN_BRIDGE_LOCAL_ONLY: value }), false);
  assert.equal(isBridgeLocalOnly({ QICN_BRIDGE_LOCAL_ONLY: '1' }), true);

  const bridgePath = 'scripts/verify-framework-import-drift.cjs';
  const current = fs.readFileSync(path.join(ROOT, bridgePath), 'utf8');
  const original = execFileSync('git', ['show', `4142610792c51a171db3b965ff314646fa5535c1:${bridgePath}`], { cwd: ROOT, encoding: 'utf8' });
  const virtualOut = path.join(temp, 'virtual-bridge-default.json');
  const oldDefault = bridgeSandbox(original, [`--json-file=${virtualOut}`]);
  const newDefault = bridgeSandbox(current, [`--json-file=${virtualOut}`]);
  assert.deepEqual(newDefault, oldDefault, 'no-opt-in bridge behavior changed');
  assert.equal(bridgeSandbox(current, []).writes.size, 0, 'default bridge must not start writing a report');
  const local = bridgeSandbox(current, [`--out=${virtualOut}`], { QICN_BRIDGE_LOCAL_ONLY: '1' }, true);
  const localReport = JSON.parse(local.writes.get(virtualOut));
  assert.equal(local.exitCode, 0);
  assert.equal(local.probes, 0);
  assert.equal(localReport.framework_root, null);
  assert.equal(localReport.framework_root_present, null);
  assert.equal(localReport.verdict.sync_status, 'not_recorded');
  assert.equal(localReport.counts.in_sync, 0);
  assert.equal(localReport.counts.local_intact, 1);
  const strict = bridgeSandbox(current, ['--local-only', '--strict'], {}, true);
  assert.equal(strict.exitCode, 1, 'strict must not pass with unchecked upstream');

  // Capture the real default destination without actually writing to it.
  const sourceTruth = path.join(ROOT, 'scripts/verify-source-of-truth.cjs');
  const writes = new Map();
  const normalRequire = createRequire(sourceTruth);
  vm.runInNewContext(fs.readFileSync(sourceTruth, 'utf8'), {
    __dirname: path.dirname(sourceTruth), console,
    process: { argv: [process.execPath, sourceTruth], env: cleanEnv, exit(code) { assert.equal(code, 0); } },
    require(name) {
      if (name === 'node:fs') return { ...fs, mkdirSync() {}, writeFileSync(file, text) { writes.set(file, String(text)); } };
      if (name === './lib/report-output-path.cjs') return { readReportOutputArg, resolveReportOutput: (options) => resolveReportOutput({ ...options, env: cleanEnv }) };
      return normalRequire(name);
    }
  });
  assert.deepEqual([...writes.keys()], [path.join(ROOT, canonicalReports[0])]);

  for (const [script, basename] of [
    ['scripts/verify-source-of-truth.cjs', 'source.json'],
    ['scripts/verify-operational-readiness.cjs', 'readiness.json'],
    ['scripts/verify-env-contract.cjs', 'env.json'],
    ['scripts/cognitive-emergence-prereg.cjs', 'cognition.json']
  ]) {
    const out = path.join(temp, 'explicit', basename);
    invoke(script, [`--out=${out}`], { ...cleanEnv, QICN_REPORT_DIR: path.join(temp, 'unused') });
    assert.ok(fs.existsSync(out));
  }
  assert.ok(fs.existsSync(path.join(temp, 'explicit/operational_readiness/environment_contract_manifest.json')));
  const envDir = path.join(temp, 'env-only');
  invoke('scripts/verify-operational-readiness.cjs', [], { ...cleanEnv, QICN_REPORT_DIR: envDir });
  assert.ok(fs.existsSync(path.join(envDir, 'artifacts/operational_readiness_manifest.json')));
  assert.ok(fs.existsSync(path.join(envDir, 'artifacts/operational_readiness/environment_contract_manifest.json')));
  invoke('scripts/run-operational-smoke-suite.cjs', [`--out=${path.join(temp, 'smoke.json')}`]);
  assert.ok(fs.existsSync(path.join(temp, 'smoke.json')));
  assert.equal(fs.existsSync(path.join(temp, 'unused')), false);
  for (const [rel, previous] of before) {
    assert.equal(fs.existsSync(path.join(ROOT, rel)) ? digest(path.join(ROOT, rel)) : null, previous, `canonical report changed: ${rel}`);
  }
  console.log('OK: opt-in report routing, legacy bridge parity, no upstream probes and no canonical report writes');
} finally {
  const resolved = path.resolve(temp);
  assert.ok(resolved.startsWith(path.resolve(os.tmpdir()) + path.sep));
  fs.rmSync(resolved, { recursive: true, force: true });
}

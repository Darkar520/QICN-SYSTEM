import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseRecord = (tick, overrides = {}) => ({
  runId: 'run_1',
  tick,
  t_ms: 50,
  versionHash: 'vh1',
  configHash: 'cfg1',
  metrics: { omega: 1.01 },
  render_trace_hash: `trace_${tick}`,
  integrity: { event_present: false, C2_ok: null, echo_sig: null, nonce: null, requestId: null },
  intervention: { active: false, tag: null, params: null },
  sensors: { mode: 'mock', summary: {} },
  observability: {
    modules_active: ['ontological_core'],
    wm_pred_error: null,
    planner_cost: null,
    self_state_stub: { wm_enabled: null, planner_enabled: null, sensors_mode: 'mock', entropy_mode: null }
  },
  ...overrides
});

const writeArtifact = ({ root, runId, schemaValidation = 'permissive', rows = [], ioPartial = false, scheduleHash = null, preregisterHash = null }) => {
  const artifactDir = path.join(root, runId);
  fs.mkdirSync(path.join(artifactDir, 'schema'), { recursive: true });
  const schemaSrc = path.resolve(__dirname, '../src/experiments/schemas/run_record.v1.json');
  fs.copyFileSync(schemaSrc, path.join(artifactDir, 'schema/run_record.v1.json'));
  const header = {
    runId,
    seed: 17057,
    versionHash: 'vh1',
    configHash: 'cfg1',
    schema_validation: schemaValidation,
    scheduleHash,
    preregisterHash,
    startTime: new Date().toISOString()
  };
  fs.writeFileSync(path.join(artifactDir, 'run_header.json'), `${JSON.stringify(header, null, 2)}\n`, 'utf8');
  const ndjson = rows.map((row) => JSON.stringify(row)).join('\n');
  fs.writeFileSync(path.join(artifactDir, 'ticks.ndjson'), ndjson.length ? `${ndjson}\n` : '', 'utf8');
  const summary = {
    runId,
    counts: { ticks: rows.length, schema_violations: 0 },
    tick_ms: { p50: 50, p95: 50, max: 50 },
    flags: { io_partial: ioPartial, schema_drift: false, hash_drift: false, monotonic_violation: false }
  };
  fs.writeFileSync(path.join(artifactDir, 'run_summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  return artifactDir;
};

(async () => {
  const { AdmissibilityEngine, exportPaperAssets } = await import('../src/experiments/AdmissibilityEngine.js');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'admiss-pr6c-'));
  const engine = new AdmissibilityEngine({ capP95Ms: 50, hardCapMs: 100 });

  const admissibleRows = Array.from({ length: 5 }, (_, i) => baseRecord(i, {
    intervention: { active: true, tag: 'WORLD_MODEL_OFF', eventId: `e${i}`, params: { eventId: `e${i}` } }
  }));
  const admissibleDir = writeArtifact({ root, runId: 'run_ok', schemaValidation: 'permissive', rows: admissibleRows });
  const v1 = engine.evaluateRun({ artifactDir: admissibleDir, flakeStatuses: [0, 0] }).verdict;
  assert(v1.status === 'ADMISSIBLE', 'CASE 1 FAIL: permissive run should be ADMISSIBLE');
  assert(v1.extras_detected.some((p) => p.includes('intervention.eventId')), 'CASE 1 FAIL: permissive extras must be reported');

  const strictDir = writeArtifact({ root, runId: 'run_strict', schemaValidation: 'strict', rows: admissibleRows });
  const v2 = engine.evaluateRun({ artifactDir: strictDir, flakeStatuses: [0, 0] }).verdict;
  assert(v2.status === 'DISCARDED', 'CASE 2 FAIL: strict run with extra eventId must be DISCARDED');
  assert(v2.reasons.includes('DSC_SCHEMA_VIOLATION'), 'CASE 2 FAIL: strict schema violation reason missing');

  const driftRows = Array.from({ length: 5 }, (_, i) => baseRecord(i, i === 3 ? { configHash: 'cfg_drift' } : {}));
  const driftDir = writeArtifact({ root, runId: 'run_drift', rows: driftRows });
  const v3 = engine.evaluateRun({ artifactDir: driftDir, flakeStatuses: [0, 0] }).verdict;
  assert(v3.status === 'TAMPERED', 'CASE 3 FAIL: config hash drift must be TAMPERED');
  assert(v3.reasons.includes('TMP_HASH_DRIFT'), 'CASE 3 FAIL: TMP_HASH_DRIFT reason missing');

  const c2Rows = Array.from({ length: 5 }, (_, i) => baseRecord(i, {
    integrity: { event_present: true, C2_ok: i === 0 ? false : true, echo_sig: 'sig', nonce: 'n1', requestId: 'r1' }
  }));
  const c2Dir = writeArtifact({ root, runId: 'run_c2', rows: c2Rows, scheduleHash: 'sh1', preregisterHash: 'ph1' });
  const v4 = engine.evaluateRun({ artifactDir: c2Dir, flakeStatuses: [0, 0] }).verdict;
  assert(v4.status === 'TAMPERED', 'CASE 4 FAIL: C2 mismatch/replay must be TAMPERED');
  assert(v4.reasons.includes('TMP_C2_MISMATCH'), 'CASE 4 FAIL: TMP_C2_MISMATCH reason missing');
  assert(v4.reasons.includes('TMP_NONCE_REPLAY'), 'CASE 4 FAIL: TMP_NONCE_REPLAY reason missing');

  const flakyDir = writeArtifact({ root, runId: 'run_flaky', rows: Array.from({ length: 5 }, (_, i) => baseRecord(i)) });
  const v5 = engine.evaluateRun({ artifactDir: flakyDir, flakeStatuses: [0, 1] }).verdict;
  assert(v5.status === 'DISCARDED', 'CASE 5 FAIL: flaky run must be DISCARDED');
  assert(v5.reasons.includes('DSC_FLAKY_TESTS'), 'CASE 5 FAIL: DSC_FLAKY_TESTS reason missing');

  const exportInfo = exportPaperAssets({ artifactsRoot: root, batchId: 'batch_test' });
  assert(exportInfo.included.includes('run_ok'), 'CASE 6 FAIL: exporter must include admissible run');
  assert(!exportInfo.included.includes('run_drift'), 'CASE 6 FAIL: exporter must exclude tampered run');
  assert(fs.existsSync(path.join(exportInfo.outDir, 'tables.tex')), 'CASE 6 FAIL: tables.tex missing');
  assert(fs.existsSync(path.join(exportInfo.outDir, 'figures_data.json')), 'CASE 6 FAIL: figures_data.json missing');

  // CASE 7: BaseCore §06 runtime_use_admissibility validation rejects overclaiming or missing fields
  const badRuaDir = writeArtifact({ root, runId: 'run_bad_rua', rows: Array.from({ length: 5 }, (_, i) => baseRecord(i)) });
  const badHeaderPath = path.join(badRuaDir, 'run_header.json');
  const badHeader = JSON.parse(fs.readFileSync(badHeaderPath, 'utf8'));
  badHeader.runtime_use_admissibility = {
    measured_state_space: 'finite_state',
    estimator_or_update_rule: 'rule_v1',
    finite_horizon: 5,
    calibration_regime: 'uncalibrated',
    failure_controls: ['nc1'],
    claim_class: 'external_validation'
  };
  fs.writeFileSync(badHeaderPath, `${JSON.stringify(badHeader, null, 2)}\n`, 'utf8');
  const v7 = engine.evaluateRun({ artifactDir: badRuaDir, flakeStatuses: [0, 0] }).verdict;
  assert(v7.status === 'DISCARDED', 'CASE 7 FAIL: overclaiming runtime_use_admissibility must be DISCARDED');
  assert(v7.reasons.includes('DSC_RUNTIME_USE_ADMISSIBILITY_INVALID'), 'CASE 7 FAIL: DSC_RUNTIME_USE_ADMISSIBILITY_INVALID reason missing');

  console.log('OK: admissibility-exporter.v1 tests passed');
})().catch((error) => {
  console.error('FAIL: admissibility-exporter.v1 tests failed:', error.message);
  process.exit(1);
});

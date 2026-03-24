import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { sha256Hex, stableStringify } from '../utils/integrity.js';
import { buildCanonicalClaimMappingSnapshot } from '../canon/claimMapping/runtimeClaimMapping.js';
import { buildCanonicalInvariantPackage } from '../canon/invariants/CanonicalInvariantPackage.js';
import { evaluateEntropyPreVerdictArtifact } from './EntropyForensics.js';
import { buildRunMetricsArtifact } from './EntropyConditionMetrics.js';
import { buildRunSupportLabelsArtifact } from './OutputSupportLabels.js';
import { buildRunOutputConsumptionPolicyArtifact } from './OutputConsumptionPolicy.js';
import { buildRunOutputSurfacePolicyArtifact } from './OutputSurfacePolicy.js';
import { buildRunControlledStatementsArtifact } from './ControlledStatements.js';

const pct = (arr, p) => {
  if (!Array.isArray(arr) || arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return Number(sorted[idx] || 0);
};

const asObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : null);
const fileHash = (filePath) => sha256Hex(fs.readFileSync(filePath, 'utf8'));

const typeMatches = (value, typeName) => {
  if (typeName === 'null') return value === null;
  if (typeName === 'array') return Array.isArray(value);
  if (typeName === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (typeName === 'integer') return Number.isInteger(value);
  if (typeName === 'object') return asObject(value) !== null;
  return typeof value === typeName;
};

const validateBySchema = (value, schema, mode, prefix = '$', extras = []) => {
  const node = asObject(schema) || {};
  if (node.type) {
    const allowed = Array.isArray(node.type) ? node.type : [node.type];
    if (!allowed.some((t) => typeMatches(value, t))) {
      return { ok: false, extras };
    }
  }
  if (node.enum && !node.enum.includes(value)) {
    return { ok: false, extras };
  }
  if (Array.isArray(value)) {
    if (node.items) {
      for (let i = 0; i < value.length; i++) {
        const r = validateBySchema(value[i], node.items, mode, `${prefix}[${i}]`, extras);
        if (!r.ok) return r;
      }
    }
    return { ok: true, extras };
  }
  const obj = asObject(value);
  if (!obj) return { ok: true, extras };
  const props = asObject(node.properties) || {};
  const required = Array.isArray(node.required) ? node.required : [];
  const hasDeclaredShape = Object.keys(props).length > 0 || required.length > 0;
  for (const key of required) {
    if (!(key in obj)) return { ok: false, extras };
  }
  if (!hasDeclaredShape) return { ok: true, extras };
  for (const [key, val] of Object.entries(obj)) {
    if (!(key in props)) {
      extras.push(`${prefix}.${key}`);
      if (mode === 'strict') return { ok: false, extras };
      continue;
    }
    const r = validateBySchema(val, props[key], mode, `${prefix}.${key}`, extras);
    if (!r.ok) return r;
  }
  return { ok: true, extras };
};

const readNdjson = (filePath) => {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const rows = [];
  let parseError = false;
  for (const line of lines) {
    try {
      rows.push(JSON.parse(line));
    } catch {
      parseError = true;
    }
  }
  return { rows, lineCount: lines.length, parseError };
};

const readOptionalJson = (filePath) => {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return { __parse_error__: true };
  }
};

const runFlakeGate = ({ command, cwd, runs = 2 }) => {
  const parts = String(command || '').trim().split(/\s+/).filter(Boolean);
  const binRaw = parts[0];
  const bin = /^node(\.exe)?$/i.test(binRaw) ? process.execPath : binRaw;
  const args = parts.slice(1);
  const statuses = [];
  for (let i = 0; i < runs; i++) {
    const result = spawnSync(bin, args, {
      cwd,
      shell: false,
      stdio: 'pipe',
      encoding: 'utf8'
    });
    statuses.push(Number(result.status ?? 1));
  }
  return statuses;
};

export class AdmissibilityEngine {
  constructor({ capP95Ms = 50, hardCapMs = 100 } = {}) {
    this.capP95Ms = Number(capP95Ms);
    this.hardCapMs = Number(hardCapMs);
  }

  evaluateRun({ artifactDir, flakeStatuses = null, flakeCommand = null, flakeCwd = null }) {
    const headerPath = path.join(artifactDir, 'run_header.json');
    const ticksPath = path.join(artifactDir, 'ticks.ndjson');
    const summaryPath = path.join(artifactDir, 'run_summary.json');
    const entropyPreVerdictPath = path.join(artifactDir, 'entropy_preverdict.json');
    const schemaPath = path.join(artifactDir, 'schema', 'run_record.v1.json');
    const header = JSON.parse(fs.readFileSync(headerPath, 'utf8'));
    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    const mode = String(header.schema_validation || 'permissive').toLowerCase() === 'strict' ? 'strict' : 'permissive';
    const { rows, lineCount, parseError } = readNdjson(ticksPath);

    const tamperedReasons = [];
    const discardedReasons = [];
    const extrasDetected = [];
    if (parseError) discardedReasons.push('DSC_SCHEMA_VIOLATION');
    if (rows.length === 0 || lineCount !== rows.length) discardedReasons.push('DSC_MISSING_LINES');

    const tickMs = [];
    const seenNonceReq = new Set();
    let prevVersionHash = null;
    let prevConfigHash = null;
    let expectedTick = 0;
    for (const row of rows) {
      const validation = validateBySchema(row, schema, mode, '$', extrasDetected);
      if (!validation.ok) discardedReasons.push('DSC_SCHEMA_VIOLATION');
      if (row?.tick !== expectedTick) discardedReasons.push('DSC_MISSING_LINES');
      expectedTick += 1;
      const vHash = String(row?.versionHash ?? '');
      const cHash = String(row?.configHash ?? '');
      if (vHash !== String(header.versionHash || '') || cHash !== String(header.configHash || '')) {
        tamperedReasons.push('TMP_HASH_DRIFT');
      }
      if (prevVersionHash !== null && (prevVersionHash !== vHash || prevConfigHash !== cHash)) {
        tamperedReasons.push('TMP_HASH_DRIFT');
      }
      prevVersionHash = vHash;
      prevConfigHash = cHash;

      const iv = asObject(row?.integrity);
      if (iv?.event_present === true) {
        if (iv.C2_ok !== true || typeof iv.echo_sig !== 'string' || iv.echo_sig.length === 0) {
          tamperedReasons.push('TMP_C2_MISMATCH');
        }
        if (typeof iv.nonce !== 'string' || typeof iv.requestId !== 'string' || !iv.nonce || !iv.requestId) {
          tamperedReasons.push('TMP_C2_MISMATCH');
        } else {
          const replayKey = `${iv.nonce}::${iv.requestId}`;
          if (seenNonceReq.has(replayKey)) tamperedReasons.push('TMP_NONCE_REPLAY');
          seenNonceReq.add(replayKey);
        }
      }

      const intervention = asObject(row?.intervention);
      const params = asObject(intervention?.params);
      if (header.scheduleHash || header.preregisterHash) {
        if (intervention?.active) {
          if (!params || params.scheduleHash !== header.scheduleHash || params.preregisterHash !== header.preregisterHash) {
            tamperedReasons.push('TMP_SCHEDULE_HASH_DRIFT');
          }
        }
      }
      const t = Number(row?.t_ms);
      if (Number.isFinite(t)) tickMs.push(t);
    }

    if (summary?.flags?.io_partial === true) discardedReasons.push('DSC_IO_PARTIAL');
    if (Number(summary?.counts?.ticks) !== rows.length) discardedReasons.push('DSC_MISSING_LINES');
    const p95 = pct(tickMs, 95);
    const maxTick = pct(tickMs, 100);
    if (p95 > this.capP95Ms) discardedReasons.push('DSC_TICK_BUDGET_P95');
    if (maxTick > this.hardCapMs) discardedReasons.push('DSC_TICK_HARD_CAP');

    let flake = Array.isArray(flakeStatuses) ? flakeStatuses : null;
    if (!flake && flakeCommand) {
      flake = runFlakeGate({ command: flakeCommand, cwd: flakeCwd || process.cwd(), runs: 2 });
    }
    if (Array.isArray(flake) && flake.some((x) => x === 0) && flake.some((x) => x !== 0)) {
      discardedReasons.push('DSC_FLAKY_TESTS');
    }

    const entropyPreVerdict = readOptionalJson(entropyPreVerdictPath);
    const entropyDiagnostics = entropyPreVerdict
      ? evaluateEntropyPreVerdictArtifact(entropyPreVerdict)
      : null;
    if (entropyDiagnostics?.invalidatesRun) {
      discardedReasons.push(...entropyDiagnostics.invalidatingReasons);
    }

    const tampered = [...new Set(tamperedReasons)];
    const discarded = [...new Set(discardedReasons)];
    const status = tampered.length > 0 ? 'TAMPERED' : (discarded.length > 0 ? 'DISCARDED' : 'ADMISSIBLE');
    const verdict = {
      runId: String(header.runId || path.basename(artifactDir)),
      status,
      reasons: tampered.length > 0 ? tampered : discarded,
      reasons_all: { tampered, discarded },
      schema_validation: mode,
      flake_gate: {
        command: flakeCommand || null,
        statuses: Array.isArray(flake) ? flake : null
      },
      entropy: entropyDiagnostics
        ? {
          status: entropyDiagnostics.runLevelStatus,
          invalidates_run: entropyDiagnostics.invalidatesRun,
          invalidating_reasons: entropyDiagnostics.invalidatingReasons,
          warnings: entropyDiagnostics.warnings,
          experiment: entropyPreVerdict?.experiment || null,
          source_artifact: 'entropy_preverdict.json',
          authoritative_artifact: 'entropy_run_diagnostics.json',
          interpretation_boundary: 'Run-level entropy diagnostics only; not claim closure, not support label, not external validation.'
        }
        : null,
      interpretation_boundary: 'Run-level admissibility only; not support label, not claim closure, not external validation.',
      extras_detected: mode === 'permissive' ? [...new Set(extrasDetected)] : [],
      metrics: { tick_count: rows.length, tick_ms_p95: p95, tick_ms_max: maxTick },
      hashes: {
        ticks_hash: fileHash(ticksPath),
        header_hash: fileHash(headerPath),
        summary_hash: fileHash(summaryPath),
        entropy_preverdict_hash: entropyPreVerdict ? fileHash(entropyPreVerdictPath) : null
      }
    };
    const verdictPath = path.join(artifactDir, 'run_verdict.json');
    fs.writeFileSync(verdictPath, `${JSON.stringify(verdict, null, 2)}\n`, 'utf8');
    if (entropyDiagnostics) {
      fs.writeFileSync(path.join(artifactDir, 'entropy_run_diagnostics.json'), `${JSON.stringify({
        runId: String(header.runId || path.basename(artifactDir)),
        artifact_role: 'authoritative_run_level_entropy_diagnostics',
        consumption_policy_ref: 'output_consumption_policy.json',
        surface_policy_ref: 'output_surface_policy.json',
        source_artifact: 'entropy_preverdict.json',
        source_artifact_hash: entropyPreVerdict ? fileHash(entropyPreVerdictPath) : null,
        overall_run_verdict_artifact: 'run_verdict.json',
        run_level_status: entropyDiagnostics.runLevelStatus,
        invalidates_run: entropyDiagnostics.invalidatesRun,
        invalidating_reasons: entropyDiagnostics.invalidatingReasons,
        warnings: entropyDiagnostics.warnings,
        policy: entropyDiagnostics.policy,
        experiment: entropyPreVerdict?.experiment || null,
        source_summary: entropyPreVerdict?.summary || null,
        overall_run_verdict_status: status,
        interpretation_boundary: 'Authoritative entropy run-level diagnostics only; not claim closure, not support label, not external validation.'
      }, null, 2)}\n`, 'utf8');
    }
    const invariantPackage = buildCanonicalInvariantPackage({ header, summary, verdict, ticks: rows });
    fs.writeFileSync(path.join(artifactDir, 'invariant_package.json'), `${JSON.stringify(invariantPackage, null, 2)}\n`, 'utf8');
    const claimMapping = buildCanonicalClaimMappingSnapshot({ header, summary, verdict, ticks: rows });
    fs.writeFileSync(path.join(artifactDir, 'claim_mapping_snapshot.json'), `${JSON.stringify(claimMapping, null, 2)}\n`, 'utf8');
    fs.writeFileSync(path.join(artifactDir, 'full_native_invariant_status.json'), `${JSON.stringify(claimMapping.fullNativeInvariantStatus || {}, null, 2)}\n`, 'utf8');
    fs.writeFileSync(path.join(artifactDir, 'claim_closure_runtime_diagnostics.json'), `${JSON.stringify({
      runtimeCoverage: claimMapping.runtimeCoverage,
      claimClosingRuntime: claimMapping.claimClosingRuntime,
      boundaryRuntime: claimMapping.boundaryRuntime,
      substrateRuntime: claimMapping.substrateRuntime,
      p503ThresholdRuntime: claimMapping.p503ThresholdRuntime
    }, null, 2)}\n`, 'utf8');
    fs.writeFileSync(path.join(artifactDir, 'runtime_claim_projection.json'), `${JSON.stringify(claimMapping.runtimeClaimProjection || {}, null, 2)}\n`, 'utf8');
    fs.writeFileSync(path.join(artifactDir, 'release_materialization_map.json'), `${JSON.stringify(claimMapping.releaseMaterializationMap || {}, null, 2)}\n`, 'utf8');
    fs.writeFileSync(path.join(artifactDir, 'p5_03_threshold_runtime.json'), `${JSON.stringify(claimMapping.p503ThresholdRuntime || {}, null, 2)}\n`, 'utf8');
    buildRunMetricsArtifact({ artifactDir });
    buildRunSupportLabelsArtifact({ artifactDir });
    buildRunOutputConsumptionPolicyArtifact({ artifactDir });
    buildRunOutputSurfacePolicyArtifact({ artifactDir });
    buildRunControlledStatementsArtifact({ artifactDir });
    return { verdictPath, verdict };
  }
}

export const exportPaperAssets = ({ artifactsRoot, batchId = `batch_${Date.now()}` }) => {
  const runsRoot = path.resolve(artifactsRoot);
  const dirs = fs.readdirSync(runsRoot, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => path.join(runsRoot, d.name));
  const admissibleRuns = [];
  for (const dir of dirs) {
    const verdictPath = path.join(dir, 'run_verdict.json');
    if (!fs.existsSync(verdictPath)) continue;
    const verdict = JSON.parse(fs.readFileSync(verdictPath, 'utf8'));
    if (verdict.status !== 'ADMISSIBLE') continue;
    const summaryPath = path.join(dir, 'run_summary.json');
    const summary = fs.existsSync(summaryPath) ? JSON.parse(fs.readFileSync(summaryPath, 'utf8')) : {};
    admissibleRuns.push({ runId: verdict.runId, verdict, summary });
  }
  const outDir = path.join(runsRoot, 'paper_exports', batchId);
  fs.mkdirSync(outDir, { recursive: true });
  const lines = [
    '\\begin{tabular}{lrrrr}',
    '\\hline',
    'Run ID & Ticks & P95(ms) & Max(ms) & Status \\\\',
    '\\hline',
    ...admissibleRuns.map((r) => `${r.runId} & ${Number(r.summary?.counts?.ticks || 0)} & ${Number(r.summary?.tick_ms?.p95 || 0)} & ${Number(r.summary?.tick_ms?.max || 0)} & ADMISSIBLE \\\\`),
    '\\hline',
    '\\end{tabular}'
  ];
  fs.writeFileSync(path.join(outDir, 'tables.tex'), `${lines.join('\n')}\n`, 'utf8');
  fs.writeFileSync(path.join(outDir, 'figures_data.json'), `${JSON.stringify({
    batchId,
    included_runs: admissibleRuns.map((r) => ({
      runId: r.runId,
      tick_ms_p95: Number(r.summary?.tick_ms?.p95 || 0),
      tick_ms_max: Number(r.summary?.tick_ms?.max || 0),
      ticks_hash: r.verdict?.hashes?.ticks_hash || null
    }))
  }, null, 2)}\n`, 'utf8');
  return { outDir, included: admissibleRuns.map((r) => r.runId) };
};

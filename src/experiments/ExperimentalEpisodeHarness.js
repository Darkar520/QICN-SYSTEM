import fs from 'fs';
import path from 'path';
import { once } from 'events';
import { createHash } from 'crypto';
import { sha256Hex, stableStringify } from '../utils/integrity.js';
import { buildCanonicalLineage } from '../canon/provenance/CanonicalProvenance.js';
import {
  buildEntropyPreVerdictArtifact,
  createEntropyForensicsAccumulator,
  recordEntropyForensicsSnapshot
} from './EntropyForensics.js';

const pct = (arr, p) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1));
  return Number(s[idx] || 0);
};
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

export const RUNTIME_USE_ADMISSIBILITY_REQUIRED_FIELDS = Object.freeze([
  'measured_state_space',
  'estimator_or_update_rule',
  'finite_horizon',
  'calibration_regime',
  'failure_controls',
  'claim_class'
]);

export const buildRuntimeUseAdmissibilityDeclaration = (overrides = {}, context = {}) => {
  const src = isObj(overrides) ? overrides : {};
  const failureControls = Array.isArray(src.failure_controls) && src.failure_controls.length > 0
    ? src.failure_controls.map((item) => String(item))
    : [
      'schema_violation_gate',
      'hash_drift_tamper_gate',
      'c2_integrity_gate',
      'tick_budget_gate',
      'negative_controls_nc1_nc4'
    ];
  return {
    measured_state_space: typeof src.measured_state_space === 'string' && src.measured_state_space.trim()
      ? src.measured_state_space.trim()
      : 'finite_runtime_observables_and_tick_records_v1',
    estimator_or_update_rule: typeof src.estimator_or_update_rule === 'string' && src.estimator_or_update_rule.trim()
      ? src.estimator_or_update_rule.trim()
      : String(context.mode || 'episode_harness_v1.2.1'),
    finite_horizon: src.finite_horizon !== undefined && src.finite_horizon !== null && String(src.finite_horizon).trim() !== ''
      ? src.finite_horizon
      : 'finite_episode_tick_window',
    calibration_regime: typeof src.calibration_regime === 'string' && src.calibration_regime.trim()
      ? src.calibration_regime.trim()
      : (context.deterministic ? 'uncalibrated_deterministic_simulation' : 'uncalibrated_runtime_simulation'),
    failure_controls: failureControls,
    claim_class: typeof src.claim_class === 'string' && src.claim_class.trim()
      ? src.claim_class.trim()
      : 'internal_support_only'
  };
};

export class ExperimentalEpisodeHarness {
  constructor({ runMeta, schemaPath, baseDir = process.cwd() }) {
    this.runMeta = runMeta || {};
    this.schemaPath = schemaPath;
    this.baseDir = baseDir;
    this.state = {
      expectedTick: 0,
      tickMs: [],
      omega: [],
      ccc: [],
      interventions: [],
      wmPredErrors: [],
      plannerCosts: [],
      selfStateStubs: [],
      directMetricSeries: new Map(),
      entropyForensics: createEntropyForensicsAccumulator(),
      schemaViolations: 0,
      ioPartial: false,
      linesExpected: 0,
      linesWritten: 0,
      writeErrors: 0,
      hashDrift: false,
      monotonicViolation: false
    };
  }

  async initRun() {
    this.schema = JSON.parse(await fs.promises.readFile(this.schemaPath, 'utf8'));
    this.schemaHash = sha256Hex(stableStringify(this.schema));
    this.artifactDir = path.resolve(this.baseDir, 'artifacts', String(this.runMeta.runId));
    this.schemaOutDir = path.join(this.artifactDir, 'schema');
    await fs.promises.mkdir(this.schemaOutDir, { recursive: true });
    await fs.promises.copyFile(this.schemaPath, path.join(this.schemaOutDir, 'run_record.v1.json'));
    this.header = {
      runId: String(this.runMeta.runId),
      seed: Number(this.runMeta.seed || 0),
      versionHash: String(this.runMeta.versionHash || ''),
      configHash: String(this.runMeta.configHash || ''),
      schema_validation: String(this.runMeta.schema_validation || 'permissive').toLowerCase() === 'strict' ? 'strict' : 'permissive',
      scheduleHash: typeof this.runMeta.scheduleHash === 'string' ? this.runMeta.scheduleHash : null,
      preregisterHash: typeof this.runMeta.preregisterHash === 'string' ? this.runMeta.preregisterHash : null,
      schemaHash: this.schemaHash,
      mode: String(this.runMeta.mode || 'episode_harness_v1.2.1'),
      deterministic: Boolean(this.runMeta.deterministic),
      sensorsMode: String(this.runMeta.sensorsMode || 'mock'),
      threatModel: String(this.runMeta.threatModel || 'C2'),
      startTime: this.runMeta.startTime || new Date().toISOString(),
      freezeRef: typeof this.runMeta.freezeRef === 'string' ? this.runMeta.freezeRef : null,
      thresholdAuthorityRef: typeof this.runMeta.thresholdAuthorityRef === 'string' ? this.runMeta.thresholdAuthorityRef : null,
      sourceOfTruth: typeof this.runMeta.sourceOfTruth === 'string' ? this.runMeta.sourceOfTruth : 'src',
      runtime_use_admissibility: buildRuntimeUseAdmissibilityDeclaration(
        this.runMeta.runtime_use_admissibility,
        {
          deterministic: Boolean(this.runMeta.deterministic),
          sensorsMode: String(this.runMeta.sensorsMode || 'mock'),
          mode: String(this.runMeta.mode || 'episode_harness_v1.2.1')
        }
      ),
      lineage: buildCanonicalLineage({
        freezeRef: this.runMeta.freezeRef || null,
        thresholdAuthorityRef: this.runMeta.thresholdAuthorityRef || null
      })
    };
    await fs.promises.writeFile(path.join(this.artifactDir, 'run_header.json'), `${JSON.stringify(this.header, null, 2)}\n`, 'utf8');
    await fs.promises.writeFile(path.join(this.artifactDir, 'lineage.json'), `${JSON.stringify(this.header.lineage, null, 2)}\n`, 'utf8');
    this.hash = createHash('sha256');
    this.stream = fs.createWriteStream(path.join(this.artifactDir, 'ticks.ndjson'), { flags: 'w', encoding: 'utf8' });
    this.stream.on('error', () => {
      this.state.ioPartial = true;
      this.state.writeErrors += 1;
    });
  }

  validateRecord(r) {
    if (!isObj(r) || !isObj(r.integrity) || !isObj(r.observability) || !isObj(r.sensors) || !isObj(r.intervention)) return false;
    if (!Number.isInteger(r.tick) || r.tick < 0 || typeof r.runId !== 'string' || typeof r.versionHash !== 'string' || typeof r.configHash !== 'string') return false;
    if (!(r.sensors.mode === 'mock' || r.sensors.mode === 'live' || r.sensors.mode === 'off')) return false;
    if (!Array.isArray(r.observability.modules_active)) return false;
    if (!isObj(r.observability.self_state_stub)) return false;
    if (r.integrity.event_present === false) {
      return r.integrity.C2_ok === null && r.integrity.echo_sig === null && r.integrity.nonce === null && r.integrity.requestId === null;
    }
    return typeof r.integrity.event_present === 'boolean'
      && typeof r.integrity.C2_ok === 'boolean'
      && typeof r.integrity.echo_sig === 'string';
  }

  async onTick(snapshot) {
    const record = {
      runId: String(this.header.runId),
      tick: Number(snapshot?.tick ?? -1),
      t_ms: Number(snapshot?.t_ms ?? 0),
      versionHash: String(snapshot?.versionHash ?? ''),
      configHash: String(snapshot?.configHash ?? ''),
      metrics: isObj(snapshot?.metrics) ? snapshot.metrics : {},
      render_trace_hash: snapshot?.render_trace_hash ?? null,
      integrity: isObj(snapshot?.integrity) ? snapshot.integrity : { event_present: false, C2_ok: null, echo_sig: null, nonce: null, requestId: null },
      intervention: isObj(snapshot?.intervention) ? snapshot.intervention : { active: false, tag: null, params: null },
      sensors: isObj(snapshot?.sensors) ? snapshot.sensors : { mode: this.header.sensorsMode, summary: {} },
      observability: isObj(snapshot?.observability) ? snapshot.observability : {
        modules_active: [], wm_pred_error: null, planner_cost: null,
        self_state_stub: { wm_enabled: null, planner_enabled: null, sensors_mode: this.header.sensorsMode, entropy_mode: null }
      }
    };
    if (record.tick !== this.state.expectedTick) this.state.monotonicViolation = true;
    this.state.expectedTick = record.tick + 1;
    if (record.versionHash !== this.header.versionHash || record.configHash !== this.header.configHash) this.state.hashDrift = true;
    if (!this.validateRecord(record)) this.state.schemaViolations += 1;
    this.state.tickMs.push(record.t_ms);
    if (Number.isFinite(Number(record?.metrics?.omega))) this.state.omega.push(Number(record.metrics.omega));
    if (Number.isFinite(Number(record?.metrics?.ccc))) this.state.ccc.push(Number(record.metrics.ccc));
    this.state.interventions.push(record.intervention);
    this.state.selfStateStubs.push(record?.observability?.self_state_stub || null);
    if (Number.isFinite(Number(record?.observability?.wm_pred_error))) this.state.wmPredErrors.push(Number(record.observability.wm_pred_error));
    if (Number.isFinite(Number(record?.observability?.planner_cost))) this.state.plannerCosts.push(Number(record.observability.planner_cost));
    this.recordDirectMetricSeries(record.metrics);
    recordEntropyForensicsSnapshot(this.state.entropyForensics, snapshot?.entropy);
    this.state.linesExpected += 1;
    const line = `${JSON.stringify(record)}\n`;
    this.hash.update(line, 'utf8');
    const accepted = this.stream.write(line);
    if (accepted) {
      this.state.linesWritten += 1;
    } else {
      await once(this.stream, 'drain').catch(() => {
        this.state.ioPartial = true;
        this.state.writeErrors += 1;
      });
      this.state.linesWritten += 1;
    }
  }

  recordDirectMetricSeries(metrics = {}) {
    if (!isObj(metrics)) return;
    const directMetricKeys = [
      'stasis_index_post_threshold',
      'stasis_index',
      'pmia',
      'beth_q',
      'spectral_gap',
      'identity_stability_score',
      'predictive_consistency',
      'tau_recovery',
      'temporal_convergence_tau_c',
      'winding_number',
      'raw_winding_number',
      'winding_integer',
      'topo_factor',
      'operational_determinism_score',
      'critical_observables_deterministic',
      'causal_dependency_past',
      'causal_dependency_sensors',
      'causal_dependency_prompts',
      'causal_dependency_noise'
    ];
    for (const key of directMetricKeys) {
      const value = Number(metrics?.[key]);
      if (!Number.isFinite(value)) continue;
      if (!this.state.directMetricSeries.has(key)) this.state.directMetricSeries.set(key, []);
      this.state.directMetricSeries.get(key).push(value);
    }
    if (typeof metrics?.critical_state_hash === 'string' && metrics.critical_state_hash.length > 0) {
      if (!this.state.directMetricSeries.has('critical_state_hash')) this.state.directMetricSeries.set('critical_state_hash', []);
      this.state.directMetricSeries.get('critical_state_hash').push(metrics.critical_state_hash);
    }
    if (typeof metrics?.pmia_guardrail_state === 'string' && metrics.pmia_guardrail_state.length > 0) {
      if (!this.state.directMetricSeries.has('pmia_guardrail_state')) this.state.directMetricSeries.set('pmia_guardrail_state', []);
      this.state.directMetricSeries.get('pmia_guardrail_state').push(metrics.pmia_guardrail_state);
    }
    if (typeof metrics?.winding_orientation === 'string' && metrics.winding_orientation.length > 0) {
      if (!this.state.directMetricSeries.has('winding_orientation')) this.state.directMetricSeries.set('winding_orientation', []);
      this.state.directMetricSeries.get('winding_orientation').push(metrics.winding_orientation);
    }
  }

  computeCogProxy() {
    const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
    const wm = mean(this.state.wmPredErrors);
    const pc = mean(this.state.plannerCosts);
    const tags = this.state.interventions
      .filter((i) => i && i.active && typeof i.tag === 'string')
      .map((i) => i.tag.toUpperCase());
    const plannerOffFrac = tags.length ? tags.filter((t) => t.includes('PLANNER_OFF')).length / tags.length : 0;
    const worldModelOffFrac = tags.length ? tags.filter((t) => t.includes('WORLD_MODEL_OFF')).length / tags.length : 0;
    const friction = Math.max(0, (wm ?? 0) + (pc ?? 0));
    const base = 1 / (1 + friction);
    const ablationPenalty = Math.min(0.8, plannerOffFrac * 0.4 + worldModelOffFrac * 0.4);
    const cog = Math.max(0, Math.min(1, base * (1 - ablationPenalty)));
    return { cog, wm_pred_error_mean: wm, planner_cost_mean: pc, planner_off_frac: plannerOffFrac, world_model_off_frac: worldModelOffFrac };
  }

  computePhenProxy() {
    const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
    const omegaMean = mean(this.state.omega);
    const omegaBaseline = this.state.omega.length ? this.state.omega[0] : null;
    let tauRecovery = 0;
    const activeTicks = this.state.interventions
      .map((itv, idx) => ({ itv, idx }))
      .filter(({ itv }) => itv && itv.active);
    if (activeTicks.length && omegaBaseline !== null) {
      const lastActive = activeTicks[activeTicks.length - 1].idx;
      const tol = 0.03;
      let found = null;
      for (let i = lastActive + 1; i < this.state.omega.length; i++) {
        if (Math.abs(this.state.omega[i] - omegaBaseline) <= tol) {
          found = i;
          break;
        }
      }
      tauRecovery = found === null ? this.state.omega.length - (lastActive + 1) : found - lastActive;
    }
    const phen = omegaMean === null ? null : Math.max(0, Math.min(1, (omegaMean / (1 + tauRecovery))));
    return { phen, omega_mean: omegaMean, tau_recovery: tauRecovery };
  }

  computeSubjProxy() {
    if (this.state.ccc.length < 3) {
      return { subj: null, predictive_consistency: null, residual_mean_abs: null, self_state_completeness: null };
    }
    const residuals = [];
    for (let i = 2; i < this.state.ccc.length; i++) {
      const prevDelta = this.state.ccc[i - 1] - this.state.ccc[i - 2];
      const pred = this.state.ccc[i - 1] + prevDelta;
      residuals.push(Math.abs(this.state.ccc[i] - pred));
    }
    const residualMeanAbs = residuals.length ? residuals.reduce((a, b) => a + b, 0) / residuals.length : null;
    const predictiveConsistency = residualMeanAbs === null ? null : 1 / (1 + residualMeanAbs);
    const dims = ['wm_enabled', 'planner_enabled', 'sensors_mode', 'entropy_mode'];
    let total = 0;
    let present = 0;
    for (const stub of this.state.selfStateStubs) {
      if (!isObj(stub)) continue;
      for (const d of dims) {
        total += 1;
        if (stub[d] !== null && stub[d] !== undefined) present += 1;
      }
    }
    const completeness = total > 0 ? present / total : null;
    const subj = predictiveConsistency === null ? null : Math.max(0, Math.min(1, predictiveConsistency * (0.5 + 0.5 * (completeness ?? 0))));
    return { subj, predictive_consistency: predictiveConsistency, residual_mean_abs: residualMeanAbs, self_state_completeness: completeness };
  }

  computeDirectMetricSummary() {
    const numericMean = (key) => {
      const arr = this.state.directMetricSeries.get(key) || [];
      return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
    };
    const criticalHashes = this.state.directMetricSeries.get('critical_state_hash') || [];
    const guardrailStates = this.state.directMetricSeries.get('pmia_guardrail_state') || [];
    const windingOrientations = this.state.directMetricSeries.get('winding_orientation') || [];
    const modeString = (values) => {
      if (!values.length) return null;
      const counts = new Map();
      for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
      return [...counts.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))[0][0];
    };
    const hashStats = (() => {
      if (!criticalHashes.length) {
        return {
          adjacentStability: null,
          modeDominance: null,
          longestRunRatio: null,
          transitionDensity: null,
          semanticStability: null,
          sampleCount: 0
        };
      }
      const counts = new Map();
      let longestRun = 1;
      let currentRun = 1;
      let transitionCount = 0;
      for (let idx = 0; idx < criticalHashes.length; idx += 1) {
        const value = criticalHashes[idx];
        counts.set(value, (counts.get(value) || 0) + 1);
        if (idx === 0) continue;
        if (value === criticalHashes[idx - 1]) {
          currentRun += 1;
          longestRun = Math.max(longestRun, currentRun);
        } else {
          transitionCount += 1;
          currentRun = 1;
        }
      }
      const maxCount = Math.max(...counts.values());
      const adjacentStability = criticalHashes.length <= 1
        ? 1
        : criticalHashes.slice(1).filter((value, idx) => value === criticalHashes[idx]).length / (criticalHashes.length - 1);
      const modeDominance = maxCount / criticalHashes.length;
      const longestRunRatio = longestRun / criticalHashes.length;
      const transitionDensity = criticalHashes.length <= 1 ? 0 : transitionCount / (criticalHashes.length - 1);
      const semanticStability = Math.max(0, Math.min(1,
        (adjacentStability * 0.42)
        + (modeDominance * 0.34)
        + (longestRunRatio * 0.24)
      ));
      return {
        adjacentStability,
        modeDominance,
        longestRunRatio,
        transitionDensity,
        semanticStability,
        sampleCount: criticalHashes.length
      };
    })();
    const guardrailOkFrac = guardrailStates.length
      ? guardrailStates.filter((state) => state === 'ok').length / guardrailStates.length
      : null;
    return {
      pmia: numericMean('pmia'),
      stasis_index: numericMean('stasis_index'),
      beth_q: numericMean('beth_q'),
      spectral_gap: numericMean('spectral_gap'),
      identity_stability_score: numericMean('identity_stability_score'),
      predictive_consistency_direct: numericMean('predictive_consistency'),
      tau_recovery_direct: numericMean('tau_recovery'),
      temporal_convergence_tau_c: numericMean('temporal_convergence_tau_c'),
      winding_number: numericMean('winding_number'),
      raw_winding_number: numericMean('raw_winding_number'),
      winding_integer: numericMean('winding_integer'),
      winding_orientation_mode: modeString(windingOrientations),
      topo_factor: numericMean('topo_factor'),
      operational_determinism_score: numericMean('operational_determinism_score'),
      critical_observables_deterministic_frac: numericMean('critical_observables_deterministic'),
      causal_dependency_past: numericMean('causal_dependency_past'),
      causal_dependency_sensors: numericMean('causal_dependency_sensors'),
      causal_dependency_prompts: numericMean('causal_dependency_prompts'),
      causal_dependency_noise: numericMean('causal_dependency_noise'),
      critical_state_hash_stability: hashStats.semanticStability,
      critical_state_hash_adjacent_stability: hashStats.adjacentStability,
      critical_state_hash_mode_dominance: hashStats.modeDominance,
      critical_state_hash_longest_run_ratio: hashStats.longestRunRatio,
      critical_state_hash_transition_density: hashStats.transitionDensity,
      critical_state_hash_semantic_stability: hashStats.semanticStability,
      critical_state_hash_sample_count: hashStats.sampleCount,
      pmia_guardrail_ok_frac: guardrailOkFrac
    };
  }

  async endRun() {
    await new Promise((resolve) => this.stream.end(resolve));
    const ticksHash = this.hash.digest('hex');
    let linesWrittenToDisk = 0;
    try {
      const ticksPath = path.join(this.artifactDir, 'ticks.ndjson');
      const lines = (await fs.promises.readFile(ticksPath, 'utf8')).split(/\r?\n/).filter(Boolean);
      linesWrittenToDisk = lines.length;
      if (linesWrittenToDisk !== this.state.linesExpected) this.state.ioPartial = true;
    } catch {
      this.state.ioPartial = true;
      this.state.writeErrors += 1;
    }
    const cogProxy = this.computeCogProxy();
    const phenProxy = this.computePhenProxy();
    const subjProxy = this.computeSubjProxy();
    const directMetricSummary = this.computeDirectMetricSummary();
    const flags = {
      io_partial: this.state.ioPartial,
      schema_drift: this.state.schemaViolations > 0,
      hash_drift: this.state.hashDrift,
      monotonic_violation: this.state.monotonicViolation
    };
    const summary = {
      runId: this.header.runId,
      counts: {
        ticks: this.state.tickMs.length,
        schema_violations: this.state.schemaViolations,
        lines_expected: this.state.linesExpected,
        lines_buffered: this.state.linesWritten,
        lines_written: linesWrittenToDisk,
        write_errors: this.state.writeErrors
      },
      tick_ms: { p50: pct(this.state.tickMs, 50), p95: pct(this.state.tickMs, 95), max: pct(this.state.tickMs, 100) },
      metrics: {
        cog: cogProxy.cog,
        phen: phenProxy.phen,
        subj: subjProxy.subj,
        omega_mean: phenProxy.omega_mean,
        tau_recovery: phenProxy.tau_recovery,
        predictive_consistency: subjProxy.predictive_consistency,
        residual_mean_abs: subjProxy.residual_mean_abs,
        wm_pred_error_mean: cogProxy.wm_pred_error_mean,
        planner_cost_mean: cogProxy.planner_cost_mean,
        planner_off_frac: cogProxy.planner_off_frac,
        world_model_off_frac: cogProxy.world_model_off_frac,
        self_state_completeness: subjProxy.self_state_completeness,
        pmia: directMetricSummary.pmia,
        stasis_index: directMetricSummary.stasis_index,
        beth_q: directMetricSummary.beth_q,
        spectral_gap: directMetricSummary.spectral_gap,
        identity_stability_score: directMetricSummary.identity_stability_score,
        predictive_consistency_direct: directMetricSummary.predictive_consistency_direct,
        tau_recovery_direct: directMetricSummary.tau_recovery_direct,
        temporal_convergence_tau_c: directMetricSummary.temporal_convergence_tau_c,
        winding_number: directMetricSummary.winding_number,
        raw_winding_number: directMetricSummary.raw_winding_number,
        winding_integer: directMetricSummary.winding_integer,
        winding_orientation_mode: directMetricSummary.winding_orientation_mode,
        topo_factor: directMetricSummary.topo_factor,
        operational_determinism_score: directMetricSummary.operational_determinism_score,
        critical_observables_deterministic_frac: directMetricSummary.critical_observables_deterministic_frac,
        causal_dependency: {
          past: directMetricSummary.causal_dependency_past,
          sensors: directMetricSummary.causal_dependency_sensors,
          prompts: directMetricSummary.causal_dependency_prompts,
          noise: directMetricSummary.causal_dependency_noise
        },
        critical_state_hash_stability: directMetricSummary.critical_state_hash_stability,
        critical_state_hash_adjacent_stability: directMetricSummary.critical_state_hash_adjacent_stability,
        critical_state_hash_mode_dominance: directMetricSummary.critical_state_hash_mode_dominance,
        critical_state_hash_longest_run_ratio: directMetricSummary.critical_state_hash_longest_run_ratio,
        critical_state_hash_transition_density: directMetricSummary.critical_state_hash_transition_density,
        critical_state_hash_semantic_stability: directMetricSummary.critical_state_hash_semantic_stability,
        critical_state_hash_sample_count: directMetricSummary.critical_state_hash_sample_count,
        pmia_guardrail_ok_frac: directMetricSummary.pmia_guardrail_ok_frac
      },
      flags,
      ticks_hash: ticksHash,
      schemaHash: this.schemaHash,
      endTime: new Date().toISOString()
    };
    const reasons = [];
    if (flags.io_partial) reasons.push('IO_PARTIAL_OR_BACKPRESSURE');
    if (flags.schema_drift) reasons.push('SCHEMA_DRIFT');
    if (flags.hash_drift) reasons.push('HASH_DRIFT');
    if (flags.monotonic_violation) reasons.push('TICK_MONOTONIC_VIOLATION');
    await fs.promises.writeFile(path.join(this.artifactDir, 'run_summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
    await fs.promises.writeFile(path.join(this.artifactDir, 'admissibility.json'), `${JSON.stringify({
      status: 'PENDING_PR6C',
      reasons,
      flags,
      schemaHash: this.schemaHash,
      ticks_hash: ticksHash
    }, null, 2)}\n`, 'utf8');
    const entropyPreVerdict = buildEntropyPreVerdictArtifact({
      runId: this.header.runId,
      totalTicks: this.state.tickMs.length,
      state: this.state.entropyForensics
    });
    if (entropyPreVerdict) {
      await fs.promises.writeFile(
        path.join(this.artifactDir, 'entropy_preverdict.json'),
        `${JSON.stringify(entropyPreVerdict, null, 2)}\n`,
        'utf8'
      );
    }
    return { artifactDir: this.artifactDir, ticksHash, summary };
  }
}

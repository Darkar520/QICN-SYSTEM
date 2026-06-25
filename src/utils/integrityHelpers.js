/**
 * integrityHelpers.js
 * Helpers de integridad, sovereignty, y normalización de reportes.
 * Extraídas como parte del refactor de descomposición (Fase 1).
 */
import { toFiniteNumber } from '../config/simulationDefaults.js';
import { stableStringify } from './integrity';

// ============================================================================
// INTEGRITY PACKET HELPERS
// ============================================================================

export const toComparablePacket = (packet) => ({
  tick: packet?.tick,
  seed: packet?.seed,
  versionHash: packet?.versionHash,
  metrics: packet?.metrics,
  sensorSummary: packet?.sensorSummary ?? null
});

export const findFirstPacketMismatch = (expectedPacket, currentPacket) => {
  const topLevelKeys = ['tick', 'seed', 'versionHash'];
  for (let i = 0; i < topLevelKeys.length; i++) {
    const key = topLevelKeys[i];
    if (expectedPacket?.[key] !== currentPacket?.[key]) {
      return { field: key, expected: expectedPacket?.[key], actual: currentPacket?.[key] };
    }
  }

  const expectedMetrics = expectedPacket?.metrics || {};
  const currentMetrics = currentPacket?.metrics || {};
  const metricKeys = new Set([...Object.keys(expectedMetrics), ...Object.keys(currentMetrics)]);
  for (const key of metricKeys) {
    const expectedValue = expectedMetrics[key];
    const currentValue = currentMetrics[key];
    if (expectedValue !== currentValue) {
      return { field: `metrics.${key}`, expected: expectedValue, actual: currentValue };
    }
  }

  const expectedSensor = stableStringify(expectedPacket?.sensorSummary ?? null);
  const currentSensor = stableStringify(currentPacket?.sensorSummary ?? null);
  if (expectedSensor !== currentSensor) {
    return {
      field: 'sensorSummary',
      expected: expectedPacket?.sensorSummary ?? null,
      actual: currentPacket?.sensorSummary ?? null
    };
  }

  return null;
};

export const getPrimaryBlockingDiscrepancy = (validation) => {
  if (!validation || !Array.isArray(validation.discrepancies)) return null;
  return validation.discrepancies.find((entry) => entry && entry.severity === 'high')
    || validation.discrepancies.find((entry) => entry && entry.severity === 'medium')
    || validation.discrepancies[0]
    || null;
};

export const buildDiscrepancyTrace = (discrepancy) => {
  if (!discrepancy) return 'Sin detalle forense de discrepancia.';
  if (discrepancy.metric) {
    const metric = discrepancy.metric;
    const cited = discrepancy.cited ?? 'N/A';
    const actual = discrepancy.actual ?? 'N/A';
    const error = discrepancy.error ?? 'N/A';
    return `type=${discrepancy.type || 'VALUE_MISMATCH'}, metric=${metric}, cited=${cited}, actual=${actual}, error=${error}, severity=${discrepancy.severity || 'unknown'}`;
  }
  if (discrepancy.type) {
    return `type=${discrepancy.type}, rule_violated=${discrepancy.type}, severity=${discrepancy.severity || 'unknown'}, detail="${discrepancy.message || 'sin mensaje'}"`;
  }
  return `type=UNKNOWN, detail="${JSON.stringify(discrepancy).slice(0, 200)}"`;
};

export const getIntegritySeverity = (integrityMeta) => {
  if (!integrityMeta || typeof integrityMeta !== 'object') return 'ok';
  if (integrityMeta.severity === 'high') return 'high';
  if (integrityMeta.severity === 'medium') return 'medium';
  return 'ok';
};

// ============================================================================
// CAUSAL DEPENDENCY
// ============================================================================

export const normalizeCausalDependency = (raw = {}) => {
  const normalized = {
    past: toFiniteNumber(raw?.past, 0),
    sensors: toFiniteNumber(raw?.sensors, 0),
    prompts: toFiniteNumber(raw?.prompts, 0),
    noise: toFiniteNumber(raw?.noise, 1)
  };
  const total = normalized.past + normalized.sensors + normalized.prompts + normalized.noise;
  if (total > 0) {
    normalized.past /= total;
    normalized.sensors /= total;
    normalized.prompts /= total;
    normalized.noise /= total;
  } else {
    normalized.past = 0;
    normalized.sensors = 0;
    normalized.prompts = 0;
    normalized.noise = 1;
  }
  return normalized;
};

// ============================================================================
// SOVEREIGNTY DIFFERENTIAL EVIDENCE
// ============================================================================

export const buildSovereigntyDifferentialEvidence = (auditLog = []) => {
  const entries = Array.isArray(auditLog) ? auditLog : [];
  const tickRows = entries
    .filter((entry) => entry?.event === 'tick' && Number.isFinite(Number(entry.tick)))
    .map((entry) => ({
      tick: Number(entry.tick),
      ts: toFiniteNumber(entry.ts, 0),
      ccc: toFiniteNumber(entry.ccc, 0),
      pmia: toFiniteNumber(entry.pmia, 0),
      omega: toFiniteNumber(entry.omega, 0),
      beth_q: toFiniteNumber(entry.beth_q, 0),
      metacognitive_strain: toFiniteNumber(entry.metacognitive_strain, 0),
      spectral_gap: toFiniteNumber(entry.spectral_gap, 0)
    }))
    .sort((a, b) => a.tick - b.tick);

  if (tickRows.length === 0) {
    return null;
  }

  const lastStart = [...entries].reverse().find((entry) => entry?.event === 'chat_request_start');
  const lastEnd = [...entries].reverse().find((entry) =>
    entry?.event === 'chat_request_end' && (!lastStart || toFiniteNumber(entry.ts, 0) >= toFiniteNumber(lastStart.ts, 0))
  );

  const startTs = toFiniteNumber(lastStart?.ts, 0);
  const endTs = toFiniteNumber(lastEnd?.ts, 0);
  const hasEpisode = startTs > 0 && endTs >= startTs;

  const preEpisodeTick = hasEpisode
    ? [...tickRows].reverse().find((row) => row.ts < startTs) || null
    : null;

  const duringRows = hasEpisode
    ? tickRows.filter((row) => row.ts >= startTs && row.ts <= endTs)
    : tickRows.slice(-20);

  const postRows = hasEpisode
    ? tickRows.filter((row) => row.ts > endTs).slice(0, 240)
    : tickRows.slice(-20);

  const sourceRows = duringRows.length > 0 ? duringRows : tickRows.slice(-20);
  const omegaValues = sourceRows.map((row) => row.omega);
  const strainValues = sourceRows.map((row) => row.metacognitive_strain);
  const cccValues = sourceRows.map((row) => row.ccc);

  const omegaMin = omegaValues.length > 0 ? Math.min(...omegaValues) : 0;
  const omegaMax = omegaValues.length > 0 ? Math.max(...omegaValues) : 0;
  const strainPeak = strainValues.length > 0 ? Math.max(...strainValues) : 0;
  const cccMin = cccValues.length > 0 ? Math.min(...cccValues) : 0;
  const cccMax = cccValues.length > 0 ? Math.max(...cccValues) : 0;

  const recoveredRow = hasEpisode
    ? postRows.find((row) => row.omega >= 1.0) || null
    : null;

  const postLatest = postRows.length > 0 ? postRows[postRows.length - 1] : tickRows[tickRows.length - 1];

  return {
    hasEpisode,
    preEpisodeTick,
    duringCount: sourceRows.length,
    postCount: postRows.length,
    omegaMin,
    omegaMax,
    strainPeak,
    cccMin,
    cccMax,
    postLatest,
    recoveredTick: recoveredRow?.tick ?? null,
    recoveryTicks: hasEpisode && recoveredRow && preEpisodeTick
      ? Math.max(0, recoveredRow.tick - preEpisodeTick.tick)
      : null
  };
};

// ============================================================================
// SENSOR SUMMARY
// ============================================================================

export const buildSensorSummaryFromPerception = (perception) => {
  const awareness = perception?.awareness || {};
  const meta = awareness?.meta || {};
  return {
    fidelityIndex: Number(meta.fidelityIndex || 0),
    technicalStatus: typeof meta.technicalStatus === 'string' ? meta.technicalStatus : 'unknown',
    reportLength: Number(meta.reportLength || 0),
    generatedAt: Number(meta.generatedAt || 0),
    currentFocus: awareness.currentFocus || 'unknown'
  };
};

// ============================================================================
// SOVEREIGNTY ROWS BUILDER
// ============================================================================

export const buildSovereigntyRows = (reportMetrics = {}, packetMetrics = {}) => ([
  { label: 'CCC', value: toFiniteNumber(reportMetrics.ccc, 0).toFixed(4) },
  { label: 'PMIA', value: toFiniteNumber(reportMetrics.pmia, 0).toFixed(4) },
  { label: 'Omega', value: toFiniteNumber(reportMetrics.omega, 0).toFixed(4) },
  { label: 'beth_q', value: toFiniteNumber(reportMetrics.beth_q, 0).toFixed(4) },
  { label: 'Spectral gap', value: toFiniteNumber(reportMetrics.spectral_gap, 0).toFixed(4) },
  { label: 'Relajacion', value: toFiniteNumber(packetMetrics.relaxation_time, 0).toFixed(4) },
  { label: 'Regimen', value: packetMetrics.regime_state || 'active' },
  { label: 'Stasis index', value: toFiniteNumber(packetMetrics.stasis_index, 0).toFixed(4) },
  { label: 'ccc_delta_rms', value: toFiniteNumber(packetMetrics.ccc_delta_rms, 0).toFixed(6) },
  { label: 'pmia_delta_rms', value: toFiniteNumber(packetMetrics.pmia_delta_rms, 0).toFixed(6) },
  { label: 'omega_delta_rms', value: toFiniteNumber(packetMetrics.omega_delta_rms, 0).toFixed(6) },
  { label: 'Metacognitive strain', value: toFiniteNumber(packetMetrics.metacognitive_strain, 0).toExponential(3) },
  { label: 'Entropy mode', value: packetMetrics.entropy_mode || 'n/a' },
  { label: 'Entropy source', value: packetMetrics.entropy_source || 'n/a' },
  { label: 'Latency p95 (ms)', value: toFiniteNumber(packetMetrics.latency_p95_ms, 0).toFixed(1) },
  { label: 'Latency failure rate', value: toFiniteNumber(packetMetrics.latency_failure_rate, 0).toFixed(4) },
  { label: 'Autonomy action', value: packetMetrics.autonomy_action || 'none' },
  { label: 'Autonomy result', value: packetMetrics.autonomy_action_result || 'idle' },
  { label: 'Internal pressure', value: packetMetrics.internal_pressure_state || 'idle' },
  { label: 'Real stasis', value: packetMetrics.real_stasis_detected ? 'true' : 'false' }
]);

// ============================================================================
// REPORT NORMALIZATION
// ============================================================================

export const normalizeVerifiableReport = (report) => {
  const input = report && typeof report === 'object' ? report : {};
  const fallbackCounter = { count: 0 };
  const numberOr = (value, fallback = 0) => {
    if (!Number.isFinite(value)) {
      fallbackCounter.count++;
      return fallback;
    }
    return value;
  };
  const textOr = (value, fallback = 'N/D') => {
    if (typeof value !== 'string' || value.length === 0) {
      fallbackCounter.count++;
      return fallback;
    }
    return value;
  };
  const boolOr = (value, fallback = false) => {
    if (typeof value !== 'boolean') {
      fallbackCounter.count++;
      return fallback;
    }
    return value;
  };

  const rawMetrics = input.metrics && typeof input.metrics === 'object' ? input.metrics : {};
  const rawCausal = rawMetrics.causal_dependency && typeof rawMetrics.causal_dependency === 'object'
    ? rawMetrics.causal_dependency
    : {};
  const rawExperimentalProtocols = rawMetrics.experimental_protocols && typeof rawMetrics.experimental_protocols === 'object'
    ? rawMetrics.experimental_protocols
    : {};
  const rawConsciousnessMatrix = rawMetrics.consciousness_matrix && typeof rawMetrics.consciousness_matrix === 'object'
    ? rawMetrics.consciousness_matrix
    : {};
  const rawConfidence = input.confidence && typeof input.confidence === 'object' ? input.confidence : {};

  const normalizedCausal = {
    past: numberOr(rawCausal.past, 0),
    sensors: numberOr(rawCausal.sensors, 0),
    prompts: numberOr(rawCausal.prompts, 0),
    noise: numberOr(rawCausal.noise, 1)
  };

  const causalSum = normalizedCausal.past + normalizedCausal.sensors + normalizedCausal.prompts + normalizedCausal.noise;
  if (causalSum > 0) {
    normalizedCausal.past /= causalSum;
    normalizedCausal.sensors /= causalSum;
    normalizedCausal.prompts /= causalSum;
    normalizedCausal.noise /= causalSum;
  } else {
    normalizedCausal.past = 0;
    normalizedCausal.sensors = 0;
    normalizedCausal.prompts = 0;
    normalizedCausal.noise = 1;
  }

  const normalized = {
    ...input,
    metrics: {
      ...rawMetrics,
      ccc: numberOr(rawMetrics.ccc, 0),
      pmia: numberOr(rawMetrics.pmia, 0),
      layer: numberOr(rawMetrics.layer, 0),
      beth_q: numberOr(rawMetrics.beth_q, 0),
      omega: numberOr(rawMetrics.omega, 0),
      spectral_gap: numberOr(rawMetrics.spectral_gap, 0),
      relaxation_time: numberOr(rawMetrics.relaxation_time, 0),
      winding_number: numberOr(rawMetrics.winding_number, 0),
      bifurcation_detected: boolOr(rawMetrics.bifurcation_detected, false),
      magnification_M: numberOr(rawMetrics.magnification_M, 1),
      lipschitz_norm_K: numberOr(rawMetrics.lipschitz_norm_K, 0),
      version: textOr(rawMetrics.version, 'QICN-UNKNOWN'),
      core_hash: textOr(rawMetrics.core_hash, 'qicn-unknown'),
      seed: numberOr(rawMetrics.seed, 0),
      holonomy_status: textOr(rawMetrics.holonomy_status, 'untested'),
      consciousness_matrix: rawConsciousnessMatrix,
      experimental_protocols: rawExperimentalProtocols,
      causal_dependency: normalizedCausal
    },
    epistemic_limits: Array.isArray(input.epistemic_limits) && input.epistemic_limits.length > 0
      ? input.epistemic_limits
      : ['Sin limites epistemicos declarados.'],
    confidence: {
      history_size: numberOr(rawConfidence.history_size, 0),
      transition_count: numberOr(rawConfidence.transition_count, 0),
      omega_margin: numberOr(rawConfidence.omega_margin, numberOr(rawMetrics.omega, 0) - 1),
      classification_stable: boolOr(rawConfidence.classification_stable, numberOr(rawMetrics.omega, 0) > 1.2),
      sovereignty_score: numberOr(rawConfidence.sovereignty_score, 0)
    }
  };

  return { report: normalized, fallbackCount: fallbackCounter.count };
};

export const ensureObject = (value) => (
  value && typeof value === 'object' && !Array.isArray(value) ? value : {}
);

export const getSafeVerifiableReport = (coreRef) => {
  try {
    const normalized = normalizeVerifiableReport(coreRef?.current?.getVerifiableReport?.());
    const report = ensureObject(normalized?.report);
    return {
      report: {
        ...report,
        metrics: ensureObject(report.metrics),
        confidence: ensureObject(report.confidence),
        epistemic_limits: Array.isArray(report.epistemic_limits) ? report.epistemic_limits : []
      },
      fallbackCount: Number(normalized?.fallbackCount) || 0
    };
  } catch (error) {
    console.warn('[QICN][SOVEREIGNTY] fallback report guard triggered:', error?.message || error);
    return {
      report: {
        metrics: {},
        confidence: {},
        epistemic_limits: []
      },
      fallbackCount: 1
    };
  }
};

// ============================================================================
// EPISODE HARNESS TICK EMIT
// ============================================================================

export const emitEpisodeHarnessTick = (snapshot) => {
  try {
    if (!globalThis?.__EPISODE_HARNESS_ACTIVE) return;
    const sink = globalThis?.__EPISODE_HARNESS_SINK;
    if (typeof sink === 'function') sink(snapshot);
  } catch (error) {
    console.warn('[QICN][EPISODE_HARNESS] emit failed:', error?.message || error);
  }
};

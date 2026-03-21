const isObj = (value) => value && typeof value === 'object' && !Array.isArray(value);
const toFinite = (value, fallback = null) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};
const asString = (value, fallback = '') => {
  if (value === undefined || value === null) return fallback;
  const normalized = String(value).trim();
  return normalized || fallback;
};

const makeCounterState = () => ({
  providerErrors: 0,
  refillsStarted: 0,
  refillsCompleted: 0,
  pendingResponses: 0,
  reactiveRefillsScheduled: 0,
  fallbackSelections: 0,
  staleSelections: 0,
  consumedChunks: 0,
  rejectedSamples: 0
});

export const createEntropyForensicsAccumulator = () => ({
  observedTicks: 0,
  enabledObserved: false,
  quantumPrimaryTicks: 0,
  staleTicks: 0,
  fallbackTicks: 0,
  degradedTicks: 0,
  pendingTicks: 0,
  providers: new Set(),
  responseModes: new Set(),
  requestIds: new Set(),
  fingerprints: new Set(),
  missingProviderOnPrimaryTicks: 0,
  missingRequestIdOnPrimaryTicks: 0,
  missingFingerprintOnPrimaryTicks: 0,
  primaryTicksWithoutDecisionProvenance: 0,
  malformedSnapshotTicks: 0,
  timestampInconsistencyTicks: 0,
  negativeAgeTicks: 0,
  staleAtConsumeTicks: 0,
  maxConsumedAgeMs: null,
  minFreshnessRemainingMs: null,
  ttlObservedMinMs: null,
  ttlObservedMaxMs: null,
  maxBufferExhaustions: 0,
  maxFallbackCount: 0,
  counters: makeCounterState(),
  effectiveModesSeen: new Set(),
  connectionStatesSeen: new Set(),
  lastEffectiveState: null
});

const updateMax = (current, candidate) => {
  if (!Number.isFinite(candidate)) return current;
  if (current === null || candidate > current) return candidate;
  return current;
};

const updateMin = (current, candidate) => {
  if (!Number.isFinite(candidate)) return current;
  if (current === null || candidate < current) return candidate;
  return current;
};

const applyCounterMax = (state, counters = {}) => {
  for (const key of Object.keys(state.counters)) {
    const nextValue = Math.max(0, Math.floor(toFinite(counters?.[key], 0) || 0));
    if (nextValue > state.counters[key]) {
      state.counters[key] = nextValue;
    }
  }
};

const updateTtlRange = (state, ttlMs) => {
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) return;
  state.ttlObservedMinMs = updateMin(state.ttlObservedMinMs, ttlMs);
  state.ttlObservedMaxMs = updateMax(state.ttlObservedMaxMs, ttlMs);
};

export const recordEntropyForensicsSnapshot = (state, snapshot) => {
  if (!isObj(state)) return;
  if (!isObj(snapshot)) {
    state.malformedSnapshotTicks += 1;
    return;
  }

  state.observedTicks += 1;
  state.enabledObserved = state.enabledObserved || Boolean(snapshot.enabled);

  const effectiveMode = asString(snapshot.effectiveMode || snapshot.lastDecision?.mode, '');
  const effectiveConnectionState = asString(
    snapshot.effectiveConnectionState || snapshot.connectionState,
    ''
  );
  const effectiveReason = asString(snapshot.effectiveReason || snapshot.lastDecision?.reason, '');

  if (effectiveMode) state.effectiveModesSeen.add(effectiveMode);
  if (effectiveConnectionState) state.connectionStatesSeen.add(effectiveConnectionState);

  if (effectiveMode === 'quantum_primary') state.quantumPrimaryTicks += 1;
  if (effectiveMode === 'quantum_stale') state.staleTicks += 1;
  if (effectiveMode === 'deterministic_fallback') state.fallbackTicks += 1;
  if (effectiveConnectionState === 'degraded' || effectiveConnectionState === 'stale') state.degradedTicks += 1;
  if (effectiveConnectionState === 'pending') state.pendingTicks += 1;

  const channelHealth = isObj(snapshot.channelHealth) ? snapshot.channelHealth : {};
  state.maxBufferExhaustions = Math.max(
    state.maxBufferExhaustions,
    Math.max(0, Math.floor(toFinite(channelHealth.bufferExhaustions, 0) || 0))
  );
  state.maxFallbackCount = Math.max(
    state.maxFallbackCount,
    Math.max(0, Math.floor(toFinite(channelHealth.fallbackCount, 0) || 0))
  );
  applyCounterMax(state, snapshot.counters);

  const decisionProvenance = isObj(snapshot.decisionProvenance) ? snapshot.decisionProvenance : null;
  if (effectiveMode === 'quantum_primary') {
    if (!decisionProvenance) {
      state.primaryTicksWithoutDecisionProvenance += 1;
    } else {
      const provider = asString(decisionProvenance.provider, '');
      const requestId = asString(decisionProvenance.requestId, '');
      const fingerprint = asString(decisionProvenance.fingerprint, '');
      const responseMode = asString(decisionProvenance.responseMode, '');
      if (provider) state.providers.add(provider);
      else state.missingProviderOnPrimaryTicks += 1;
      if (requestId) state.requestIds.add(requestId);
      else state.missingRequestIdOnPrimaryTicks += 1;
      if (fingerprint) state.fingerprints.add(fingerprint);
      else state.missingFingerprintOnPrimaryTicks += 1;
      if (responseMode) state.responseModes.add(responseMode);

      const ageAtConsumeMs = toFinite(decisionProvenance.ageAtConsumeMs, null);
      const freshnessRemainingMs = toFinite(decisionProvenance.freshnessRemainingMs, null);
      const fetchStartMs = toFinite(decisionProvenance.fetchStartMs, null);
      const fetchEndMs = toFinite(decisionProvenance.fetchEndMs, null);
      const insertTsMs = toFinite(decisionProvenance.insertTsMs, null);
      const consumedAtMs = toFinite(decisionProvenance.consumedAtMs, null);
      const receivedAtMs = toFinite(decisionProvenance.receivedAtMs, null);
      const expiresAtMs = toFinite(decisionProvenance.expiresAtMs, null);
      const ttlMs = Number.isFinite(receivedAtMs) && Number.isFinite(expiresAtMs)
        ? Math.max(0, expiresAtMs - receivedAtMs)
        : toFinite(snapshot?.config?.defaultTtlMs, null);

      updateTtlRange(state, ttlMs);
      state.maxConsumedAgeMs = updateMax(state.maxConsumedAgeMs, ageAtConsumeMs);
      state.minFreshnessRemainingMs = updateMin(state.minFreshnessRemainingMs, freshnessRemainingMs);

      if (Number.isFinite(ageAtConsumeMs) && ageAtConsumeMs < 0) {
        state.negativeAgeTicks += 1;
      }
      if (decisionProvenance.staleAtConsume === true || (Number.isFinite(freshnessRemainingMs) && freshnessRemainingMs < 0)) {
        state.staleAtConsumeTicks += 1;
      }
      if (
        (Number.isFinite(fetchStartMs) && Number.isFinite(fetchEndMs) && fetchEndMs < fetchStartMs) ||
        (Number.isFinite(fetchEndMs) && Number.isFinite(insertTsMs) && insertTsMs < fetchEndMs) ||
        (Number.isFinite(insertTsMs) && Number.isFinite(consumedAtMs) && consumedAtMs < insertTsMs) ||
        (Number.isFinite(receivedAtMs) && Number.isFinite(consumedAtMs) && consumedAtMs < receivedAtMs)
      ) {
        state.timestampInconsistencyTicks += 1;
      }
    }
  }

  state.lastEffectiveState = {
    effectiveMode: effectiveMode || null,
    effectiveConnectionState: effectiveConnectionState || null,
    effectiveReason: effectiveReason || null,
    lastConnectionState: asString(snapshot.lastConnectionState, '') || null,
    lastConnectionReason: asString(snapshot.lastConnectionReason, '') || null,
    lastError: asString(snapshot.lastError || channelHealth.lastError, '') || null
  };
};

export const buildEntropyPreVerdictArtifact = ({ runId, totalTicks, state }) => {
  if (!isObj(state) || state.observedTicks <= 0) return null;
  return {
    runId: String(runId || ''),
    status: 'PENDING_ENTROPY_RUN_LEVEL',
    artifact_role: 'pre_verdict',
    authoritative_run_artifact: 'run_verdict.json',
    authoritative_entropy_artifact: 'entropy_run_diagnostics.json',
    summary: {
      observed_ticks: state.observedTicks,
      total_ticks: Math.max(0, Math.floor(toFinite(totalTicks, 0) || 0)),
      coverage_ratio: Math.max(0, Math.min(1, totalTicks > 0 ? state.observedTicks / totalTicks : 0)),
      entropy_enabled_observed: state.enabledObserved,
      quantum_primary_ticks: state.quantumPrimaryTicks,
      stale_ticks: state.staleTicks,
      fallback_ticks: state.fallbackTicks,
      degraded_ticks: state.degradedTicks,
      pending_ticks: state.pendingTicks,
      provider_error_count: state.counters.providerErrors,
      refill_started_count: state.counters.refillsStarted,
      refill_completed_count: state.counters.refillsCompleted,
      refill_pending_count: state.counters.pendingResponses,
      reactive_refill_scheduled_count: state.counters.reactiveRefillsScheduled,
      buffer_exhaustions: state.maxBufferExhaustions,
      fallback_count: state.maxFallbackCount
    },
    provenance: {
      providers: [...state.providers].sort(),
      response_modes: [...state.responseModes].sort(),
      request_ids_observed: state.requestIds.size,
      fingerprints_observed: state.fingerprints.size,
      missing_provider_on_primary_ticks: state.missingProviderOnPrimaryTicks,
      missing_request_id_on_primary_ticks: state.missingRequestIdOnPrimaryTicks,
      missing_fingerprint_on_primary_ticks: state.missingFingerprintOnPrimaryTicks,
      primary_ticks_without_decision_provenance: state.primaryTicksWithoutDecisionProvenance
    },
    freshness: {
      ttl_observed_min_ms: state.ttlObservedMinMs,
      ttl_observed_max_ms: state.ttlObservedMaxMs,
      max_consumed_age_ms: state.maxConsumedAgeMs,
      min_freshness_remaining_ms: state.minFreshnessRemainingMs,
      stale_at_consume_ticks: state.staleAtConsumeTicks
    },
    integrity: {
      malformed_snapshot_ticks: state.malformedSnapshotTicks,
      timestamp_inconsistency_ticks: state.timestampInconsistencyTicks,
      negative_age_ticks: state.negativeAgeTicks
    },
    effective_modes_seen: [...state.effectiveModesSeen].sort(),
    connection_states_seen: [...state.connectionStatesSeen].sort(),
    last_effective_state: state.lastEffectiveState
  };
};

export const evaluateEntropyPreVerdictArtifact = (artifact) => {
  const invalidatingReasons = [];
  const warnings = [];
  if (!isObj(artifact)) {
    invalidatingReasons.push('DSC_ENTROPY_PREVERDICT_MALFORMED');
  } else {
    const status = asString(artifact.status, '');
    const summary = isObj(artifact.summary) ? artifact.summary : null;
    const provenance = isObj(artifact.provenance) ? artifact.provenance : null;
    const freshness = isObj(artifact.freshness) ? artifact.freshness : null;
    const integrity = isObj(artifact.integrity) ? artifact.integrity : null;
    if (status !== 'PENDING_ENTROPY_RUN_LEVEL' || !summary || !provenance || !freshness || !integrity) {
      invalidatingReasons.push('DSC_ENTROPY_PREVERDICT_MALFORMED');
    } else {
      if (
        (Number(provenance.primary_ticks_without_decision_provenance) || 0) > 0 ||
        (Number(provenance.missing_provider_on_primary_ticks) || 0) > 0 ||
        (Number(provenance.missing_request_id_on_primary_ticks) || 0) > 0 ||
        (Number(provenance.missing_fingerprint_on_primary_ticks) || 0) > 0
      ) {
        invalidatingReasons.push('DSC_ENTROPY_PROVENANCE_GAP');
      }
      if (
        (Number(integrity.timestamp_inconsistency_ticks) || 0) > 0 ||
        (Number(integrity.negative_age_ticks) || 0) > 0 ||
        (Number(freshness.stale_at_consume_ticks) || 0) > 0
      ) {
        invalidatingReasons.push('DSC_ENTROPY_TIMESTAMP_INCONSISTENT');
      }
      if ((Number(integrity.malformed_snapshot_ticks) || 0) > 0) {
        invalidatingReasons.push('DSC_ENTROPY_PREVERDICT_MALFORMED');
      }
      if ((Number(summary.provider_error_count) || 0) > 0) warnings.push('ENTROPY_PROVIDER_ERROR_OBSERVED');
      if ((Number(summary.fallback_ticks) || 0) > 0 || (Number(summary.buffer_exhaustions) || 0) > 0) {
        warnings.push('ENTROPY_FALLBACK_OBSERVED');
      }
      if ((Number(summary.stale_ticks) || 0) > 0) warnings.push('ENTROPY_STALE_OBSERVED');
      if ((Number(summary.pending_ticks) || 0) > 0 || (Number(summary.refill_pending_count) || 0) > 0) {
        warnings.push('ENTROPY_PENDING_OBSERVED');
      }
    }
  }
  const uniqueInvalidatingReasons = [...new Set(invalidatingReasons)];
  const uniqueWarnings = [...new Set(warnings)];
  return {
    runLevelStatus: uniqueInvalidatingReasons.length > 0
      ? 'invalid'
      : (uniqueWarnings.length > 0 ? 'degraded' : 'clean'),
    invalidatesRun: uniqueInvalidatingReasons.length > 0,
    invalidatingReasons: uniqueInvalidatingReasons,
    warnings: uniqueWarnings,
    policy: {
      stale_policy: 'record_and_degrade',
      provider_error_policy: 'record_and_degrade',
      fallback_policy: 'record_and_degrade',
      buffer_exhaustion_policy: 'record_and_degrade',
      missing_provenance_on_quantum_primary_policy: 'invalidate_run',
      timestamp_inconsistency_policy: 'invalidate_run'
    }
  };
};

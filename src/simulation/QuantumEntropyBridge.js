import { EntropyProviderClient } from './EntropyProviderClient.js';
import { EntropyBufferManager } from './EntropyBufferManager.js';
import { EntropyHealthMonitor } from './EntropyHealthMonitor.js';

const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));
const toFinite = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const asString = (value, fallback = '') => {
  if (value === undefined || value === null) return fallback;
  return String(value).trim();
};

const bitsToFloat01 = (bits) => {
  const normalizedBits = String(bits || '').replace(/[^01]/g, '');
  if (!normalizedBits) return null;
  const slice = normalizedBits.slice(0, 32);
  const denominator = Math.pow(2, slice.length) - 1;
  if (!Number.isFinite(denominator) || denominator <= 0) return null;
  const numerator = parseInt(slice, 2);
  if (!Number.isFinite(numerator)) return null;
  return clamp01(numerator / denominator);
};

const ANU_QRNG_DEFAULT_ENDPOINT = 'https://qrng.anu.edu.au/API/jsonI.php?length=16&type=uint8';
const FALLBACK_RESPONSE_MODES = new Set(['simulated_fallback', 'local_entropy']);
const LOG_LEVELS = ['silent', 'error', 'warn', 'info', 'debug'];

export class QuantumEntropyBridge {
  constructor(options = {}) {
    this._pollTimer = null;
    this._pollInFlight = false;
    this._pollFetchImpl = null;
    this._scheduledRefillTimer = null;
    this._lastReactiveRefillAtMs = 0;
    this.pendingProviderJobId = '';
    this.runtimeRefillContext = null;
    this.eventLog = [];
    this.maxEventLogEntries = 96;
    this.lastSample = null;
    this.lastDecision = {
      mode: 'deterministic_fallback',
      sampleAgeMs: null,
      sampleValid: false,
      source: 'deterministic_local',
      reason: 'quantum_disabled',
      entropyValue: 0.5,
      timestampMs: 0,
      jobId: ''
    };
    this.lastConnectionTest = {
      connectionState: 'idle',
      lastSampleAtMs: 0,
      lastMode: 'deterministic_fallback',
      lastReason: 'quantum_disabled',
      lastJobId: ''
    };
    this.config = this.buildConfig(options, {
      enabled: false,
      defaultTtlMs: 60000,
      requiredQualityMin: 0,
      pollMs: 10000,
      endpoint: '',
      anuEndpoint: ANU_QRNG_DEFAULT_ENDPOINT,
      provider: 'custom',
      mode: 'auto_hybrid',
      apiKeyRef: '',
      bufferCapacityChunks: 8,
      lowWatermarkChunks: 2,
      refillTargetChunks: 6,
      requestTimeoutMs: 4500,
      retryCount: 1,
      retryBackoffMs: 300,
      allowProviderFallback: true,
      logLevel: 'warn'
    });
    this.lastDecision.reason = this.config.enabled ? 'bridge_unavailable' : 'quantum_disabled';
    this.lastConnectionTest.lastReason = this.config.enabled ? 'bridge_unavailable' : 'quantum_disabled';
    this.providerClient = new EntropyProviderClient({
      defaultTimeoutMs: this.config.requestTimeoutMs,
      retryCount: this.config.retryCount,
      retryBackoffMs: this.config.retryBackoffMs
    });
    this.bufferManager = new EntropyBufferManager({
      capacityChunks: this.config.bufferCapacityChunks,
      lowWatermarkChunks: this.config.lowWatermarkChunks,
      refillTargetChunks: this.config.refillTargetChunks
    });
    this.healthMonitor = new EntropyHealthMonitor({ enabled: this.config.enabled });
    this.configWarnings = [];
    this.channelHealth = this.healthMonitor.snapshot();
    this._applyRuntimeConfig(Date.now(), 'constructor');
  }

  buildConfig(nextConfig = {}, baseConfig = this.config) {
    const ttlCandidate = nextConfig.ttlMs ?? nextConfig.defaultTtlMs ?? baseConfig.defaultTtlMs;
    const qualityCandidate = nextConfig.qualityMin ?? nextConfig.requiredQualityMin ?? baseConfig.requiredQualityMin;
    const pollCandidate = nextConfig.pollMs ?? baseConfig.pollMs;
    const capacityCandidate = nextConfig.bufferCapacityChunks ?? baseConfig.bufferCapacityChunks;
    const lowCandidate = nextConfig.lowWatermarkChunks ?? baseConfig.lowWatermarkChunks;
    const targetCandidate = nextConfig.refillTargetChunks ?? baseConfig.refillTargetChunks;
    const timeoutCandidate = nextConfig.requestTimeoutMs ?? baseConfig.requestTimeoutMs;
    const retryCountCandidate = nextConfig.retryCount ?? baseConfig.retryCount;
    const retryBackoffCandidate = nextConfig.retryBackoffMs ?? baseConfig.retryBackoffMs;
    const logLevelCandidate = asString(nextConfig.logLevel ?? baseConfig.logLevel, 'warn').toLowerCase();
    return {
      ...baseConfig,
      ...nextConfig,
      enabled: Boolean(nextConfig.enabled ?? baseConfig.enabled),
      defaultTtlMs: Math.max(1000, toFinite(ttlCandidate, baseConfig.defaultTtlMs)),
      requiredQualityMin: clamp01(qualityCandidate),
      pollMs: Math.max(1000, toFinite(pollCandidate, baseConfig.pollMs)),
      endpoint: asString(nextConfig.endpoint ?? baseConfig.endpoint, ''),
      anuEndpoint: asString(nextConfig.anuEndpoint ?? baseConfig.anuEndpoint, ANU_QRNG_DEFAULT_ENDPOINT) || ANU_QRNG_DEFAULT_ENDPOINT,
      provider: asString(nextConfig.provider ?? baseConfig.provider, 'custom') || 'custom',
      mode: asString(nextConfig.mode ?? baseConfig.mode, 'auto_hybrid') || 'auto_hybrid',
      apiKeyRef: asString(nextConfig.apiKeyRef ?? baseConfig.apiKeyRef, ''),
      bufferCapacityChunks: Math.max(1, Math.floor(toFinite(capacityCandidate, baseConfig.bufferCapacityChunks))),
      lowWatermarkChunks: Math.max(0, Math.floor(toFinite(lowCandidate, baseConfig.lowWatermarkChunks))),
      refillTargetChunks: Math.max(1, Math.floor(toFinite(targetCandidate, baseConfig.refillTargetChunks))),
      requestTimeoutMs: Math.max(500, Math.floor(toFinite(timeoutCandidate, baseConfig.requestTimeoutMs))),
      retryCount: Math.max(0, Math.floor(toFinite(retryCountCandidate, baseConfig.retryCount))),
      retryBackoffMs: Math.max(0, Math.floor(toFinite(retryBackoffCandidate, baseConfig.retryBackoffMs))),
      allowProviderFallback: Boolean(nextConfig.allowProviderFallback ?? baseConfig.allowProviderFallback),
      logLevel: LOG_LEVELS.includes(logLevelCandidate) ? logLevelCandidate : baseConfig.logLevel
    };
  }

  configure(nextConfig = {}) {
    const previousProvider = this.config.provider;
    const previousEndpoint = this.config.endpoint;
    const previousMode = this.config.mode;
    const previousEnabled = this.config.enabled;

    this.config = this.buildConfig(nextConfig, this.config);
    this._applyRuntimeConfig(Date.now(), 'configure');

    const providerSurfaceChanged =
      previousProvider !== this.config.provider ||
      previousEndpoint !== this.config.endpoint ||
      previousMode !== this.config.mode;

    if (!this.config.enabled) {
      this.stopPolling();
      this.clearRuntimeRefillContext();
      this.bufferManager.clear('quantum_disabled', Date.now());
      this.pendingProviderJobId = '';
      this.healthMonitor.setEnabled(false, Date.now());
      this._syncChannelHealth();
      this.lastDecision = {
        ...this.lastDecision,
        mode: 'deterministic_fallback',
        reason: 'quantum_disabled',
        source: 'deterministic_local',
        sampleValid: false
      };
      this.lastConnectionTest = {
        ...this.lastConnectionTest,
        connectionState: 'idle',
        lastMode: 'deterministic_fallback',
        lastReason: 'quantum_disabled',
        lastJobId: ''
      };
      return;
    }

    if (!previousEnabled || providerSurfaceChanged) {
      this._clearScheduledReactiveRefill();
      this.bufferManager.clear(providerSurfaceChanged ? 'provider_surface_changed' : 'bridge_reenabled', Date.now());
      this.pendingProviderJobId = '';
      if (this.config.provider !== 'anu_qrng') {
        this.stopPolling();
      }
      this._emitEvent('config_applied', {
        provider: this.config.provider,
        endpoint: this.config.endpoint,
        enabled: this.config.enabled
      });
    }
  }

  setConfig(partialConfig = {}) {
    this.configure(partialConfig);
    return { ...this.config };
  }

  _applyRuntimeConfig(nowMs = Date.now(), source = 'runtime') {
    this.providerClient.configure({
      defaultTimeoutMs: this.config.requestTimeoutMs,
      retryCount: this.config.retryCount,
      retryBackoffMs: this.config.retryBackoffMs
    });
    const bufferConfigResult = this.bufferManager.configure({
      capacityChunks: this.config.bufferCapacityChunks,
      lowWatermarkChunks: this.config.lowWatermarkChunks,
      refillTargetChunks: this.config.refillTargetChunks
    });
    this.configWarnings = Array.isArray(bufferConfigResult.warnings) ? bufferConfigResult.warnings : [];
    this.healthMonitor.setEnabled(this.config.enabled, nowMs);
    this.healthMonitor.markConfigWarnings(this.configWarnings, nowMs);
    this.healthMonitor.applyBufferSnapshot(this.bufferManager.snapshot(nowMs));
    this._syncChannelHealth();
    if (this.configWarnings.length > 0) {
      this._emitEvent('config_warning', {
        source,
        warnings: [...this.configWarnings]
      });
    }
  }

  _syncChannelHealth() {
    this.channelHealth = this.healthMonitor.snapshot();
  }

  _emitEvent(type, payload = {}, level = 'info', nowMs = Date.now()) {
    const entry = {
      ts: nowMs,
      type,
      level,
      ...payload
    };
    this.eventLog.push(entry);
    if (this.eventLog.length > this.maxEventLogEntries) {
      this.eventLog = this.eventLog.slice(-this.maxEventLogEntries);
    }
    const currentLevel = LOG_LEVELS.indexOf(this.config.logLevel);
    const eventLevel = LOG_LEVELS.indexOf(level);
    if (currentLevel >= 0 && eventLevel >= 0 && eventLevel <= currentLevel && typeof console !== 'undefined') {
      const message = `[QICN][QUANTUM_ENTROPY] ${JSON.stringify(entry)}`;
      if (level === 'error' && typeof console.error === 'function') {
        console.error(message);
      } else if (level === 'warn' && typeof console.warn === 'function') {
        console.warn(message);
      } else if (typeof console.info === 'function') {
        console.info(message);
      }
    }
  }

  _resolveAnuEndpoint(candidate = '') {
    const raw = asString(candidate, '');
    if (raw && /^https?:\/\//i.test(raw) && /qrng\.anu\.edu\.au/i.test(raw)) {
      return raw;
    }
    if (/^https?:\/\//i.test(this.config.anuEndpoint) && /qrng\.anu\.edu\.au/i.test(this.config.anuEndpoint)) {
      return this.config.anuEndpoint;
    }
    return ANU_QRNG_DEFAULT_ENDPOINT;
  }

  _getReactiveRefillDelayMs() {
    return Math.max(50, Math.min(250, Math.floor(this.config.pollMs / 4) || 0));
  }

  _clearScheduledReactiveRefill() {
    if (this._scheduledRefillTimer) {
      clearTimeout(this._scheduledRefillTimer);
      this._scheduledRefillTimer = null;
    }
  }

  setRuntimeRefillContext(context = {}) {
    this.runtimeRefillContext = {
      fetchImpl: typeof context.fetchImpl === 'function' ? context.fetchImpl : null,
      endpoint: context.endpoint ?? this.config.endpoint,
      apiKeyRef: context.apiKeyRef ?? this.config.apiKeyRef,
      timeoutMs: context.timeoutMs ?? this.config.requestTimeoutMs,
      buildRequestUrl: typeof context.buildRequestUrl === 'function' ? context.buildRequestUrl : undefined
    };
    return this.runtimeRefillContext;
  }

  clearRuntimeRefillContext() {
    this.runtimeRefillContext = null;
    this._clearScheduledReactiveRefill();
  }

  _scheduleReactiveRefill(reason = 'low_watermark', nowMs = Date.now()) {
    if (!this.config.enabled || this._pollInFlight || this._scheduledRefillTimer) return false;
    const context = this.runtimeRefillContext;
    if (!context?.fetchImpl) return false;
    const minimumGapMs = this._getReactiveRefillDelayMs();
    if (nowMs - this._lastReactiveRefillAtMs < minimumGapMs) return false;

    const plan = this.bufferManager.getRefillPlan(nowMs);
    if (!plan.needed) return false;

    this._scheduledRefillTimer = setTimeout(async () => {
      this._scheduledRefillTimer = null;
      this._lastReactiveRefillAtMs = Date.now();
      try {
        await this.refillFromProvider({
          ...context
        });
      } catch (error) {
        this.reportBridgeFailure(error?.message || 'reactive_refill_failed', Date.now());
      }
    }, minimumGapMs);

    this._emitEvent('reactive_refill_scheduled', {
      reason,
      requestedChunks: plan.requestedChunks,
      occupancyChunks: plan.bufferSnapshot.occupancyChunks,
      delayMs: minimumGapMs
    }, 'info', nowMs);
    return true;
  }

  async fetchAnuSample(options = {}) {
    const result = await this.providerClient.fetchChunk({
      provider: 'anu_qrng',
      endpoint: this._resolveAnuEndpoint(options.endpoint || this.config.endpoint),
      fetchImpl: options.fetchImpl,
      timeoutMs: options.timeoutMs ?? this.config.requestTimeoutMs,
      ttlMs: this.config.defaultTtlMs
    });
    if (!result.ok || !result.sample) {
      throw new Error(result.reason || 'bridge_unavailable');
    }
    return result.sample;
  }

  startPolling(options = {}) {
    if (!this.config.enabled || this.config.provider !== 'anu_qrng') {
      this.stopPolling();
      return { started: false, reason: 'provider_not_anu' };
    }
    this.stopPolling();
    this._pollFetchImpl = typeof options.fetchImpl === 'function' ? options.fetchImpl : this._pollFetchImpl;
    this.setRuntimeRefillContext({
      fetchImpl: this._pollFetchImpl,
      endpoint: this._resolveAnuEndpoint(options.endpoint || this.config.endpoint),
      timeoutMs: options.timeoutMs ?? this.config.requestTimeoutMs
    });
    const pollMs = Math.max(1000, toFinite(options.pollMs, this.config.pollMs));
    const poll = async () => {
      if (this._pollInFlight) return;
      await this.refillFromProvider({
        fetchImpl: this._pollFetchImpl,
        timeoutMs: options.timeoutMs ?? this.config.requestTimeoutMs
      });
    };
    poll();
    this._pollTimer = setInterval(poll, pollMs);
    return { started: true, pollMs };
  }

  stopPolling() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
    this._clearScheduledReactiveRefill();
    this._pollInFlight = false;
  }

  normalizeSample(sample, nowMs = Date.now(), configOverride = this.config) {
    if (!sample || typeof sample !== 'object') {
      return { valid: false, reason: 'invalid_payload' };
    }

    const source = String(sample.source || 'quantum_bridge');
    const jobId = String(sample.jobId || '');
    const timestampMs = Math.max(0, toFinite(sample.timestampMs, nowMs));
    const receivedAtMs = Math.max(0, toFinite(sample.receivedAtMs, nowMs));
    const ttlMs = Math.max(1000, toFinite(sample.ttlMs, configOverride.defaultTtlMs));
    const qualityObj = sample.quality && typeof sample.quality === 'object' ? sample.quality : {};
    const qualityValidFlag = qualityObj.valid !== false;
    const bitBalance = clamp01(qualityObj.bitBalance ?? 0.5);
    const shots = Math.max(0, Math.floor(toFinite(qualityObj.shots, 0)));
    const entropyFloatCandidate = Number(sample.entropyFloat01);
    const entropyFloat01 = Number.isFinite(entropyFloatCandidate)
      ? clamp01(entropyFloatCandidate)
      : bitsToFloat01(sample.entropyBits);
    const qualityScore = clamp01((1 - Math.abs(0.5 - bitBalance) * 2) * 0.7 + clamp01(shots / 2048) * 0.3);

    if (!Number.isFinite(entropyFloat01)) {
      return { valid: false, reason: 'missing_entropy_value' };
    }
    if (!qualityValidFlag) {
      return { valid: false, reason: 'quality_rejected' };
    }
    if (qualityScore < clamp01(configOverride.requiredQualityMin)) {
      return { valid: false, reason: 'quality_below_threshold' };
    }

    return {
      valid: true,
      source,
      jobId,
      timestampMs,
      receivedAtMs,
      ttlMs,
      entropyBits: String(sample.entropyBits || ''),
      entropyFloat01,
      quality: {
        shots,
        bitBalance,
        qualityScore,
        valid: true
      },
      meta: sample.meta && typeof sample.meta === 'object' ? { ...sample.meta } : {}
    };
  }

  reportBridgeFailure(reason = 'bridge_unavailable', nowMs = Date.now()) {
    this.healthMonitor.markFailure(reason, this.bufferManager.snapshot(nowMs), nowMs);
    this._syncChannelHealth();
    this.lastConnectionTest = {
      ...this.lastConnectionTest,
      connectionState: 'error',
      lastReason: String(reason || 'bridge_unavailable')
    };
    this._emitEvent('provider_error', {
      reason: String(reason || 'bridge_unavailable'),
      bufferOccupancyChunks: this.channelHealth.bufferOccupancyChunks || 0
    }, 'warn', nowMs);
  }

  ingestSample(sample, nowMs = Date.now(), context = {}) {
    const normalized = this.normalizeSample(sample, nowMs, this.config);
    if (!normalized.valid) {
      this.healthMonitor.markDropped(normalized.reason, this.bufferManager.snapshot(nowMs), nowMs);
      this._syncChannelHealth();
      this.reportBridgeFailure(normalized.reason, nowMs);
      return { accepted: false, reason: normalized.reason };
    }

    const responseMode = asString(context.responseMode, '');
    const fallbackUsed = FALLBACK_RESPONSE_MODES.has(responseMode);
    if (fallbackUsed && !this.config.allowProviderFallback) {
      this.healthMonitor.markDropped('provider_fallback_disabled', this.bufferManager.snapshot(nowMs), nowMs);
      this._syncChannelHealth();
      this._emitEvent('provider_sample_rejected', {
        reason: 'provider_fallback_disabled',
        responseMode
      }, 'warn', nowMs);
      return { accepted: false, reason: 'provider_fallback_disabled' };
    }

    const ingestResult = this.bufferManager.ingestSample(normalized, {
      provider: context.provider || normalized.meta?.provider || normalized.source,
      requestId: context.requestId || normalized.jobId,
      requestUrl: context.requestUrl || '',
      fetchStartMs: context.fetchStartMs,
      fetchEndMs: context.fetchEndMs,
      latencyMs: context.latencyMs,
      fallbackUsed,
      responseMode
    }, nowMs);
    this.lastSample = normalized;
    this.healthMonitor.markSuccess(ingestResult.bufferSnapshot, nowMs, { lastEvent: 'sample_ingested' });
    this._syncChannelHealth();
    this.lastConnectionTest = {
      ...this.lastConnectionTest,
      connectionState: this.config.enabled ? 'ok' : 'idle',
      lastSampleAtMs: nowMs,
      lastMode: 'quantum_primary',
      lastReason: 'sample_ingested',
      lastJobId: normalized.jobId || ''
    };
    return {
      accepted: true,
      reason: 'sample_ingested',
      sample: normalized,
      chunkId: ingestResult.chunkId,
      bufferSnapshot: ingestResult.bufferSnapshot
    };
  }

  async refillFromProvider(options = {}) {
    const nowMs = Date.now();
    if (!this.config.enabled) {
      return {
        ok: false,
        skipped: true,
        reason: 'quantum_disabled',
        diagnostics: this.getConnectionDiagnostics(nowMs)
      };
    }
    if (this._pollInFlight) {
      return {
        ok: true,
        skipped: true,
        reason: 'refill_in_flight',
        diagnostics: this.getConnectionDiagnostics(nowMs)
      };
    }
    const plan = options.force
      ? {
        needed: true,
        requestedChunks: Math.max(1, Math.floor(toFinite(options.requestedChunks, this.config.refillTargetChunks))),
        bufferSnapshot: this.bufferManager.snapshot(nowMs),
        stalePrunedCount: 0
      }
      : this.bufferManager.getRefillPlan(nowMs);
    if (!plan.needed || plan.requestedChunks <= 0) {
      return {
        ok: true,
        skipped: true,
        reason: 'buffer_above_low_watermark',
        diagnostics: this.getConnectionDiagnostics(nowMs)
      };
    }

    this._pollInFlight = true;
    this.healthMonitor.markRefillStart(plan.requestedChunks, plan.bufferSnapshot, nowMs);
    this._syncChannelHealth();
    this._emitEvent('refill_started', {
      requestedChunks: plan.requestedChunks,
      occupancyChunks: plan.bufferSnapshot.occupancyChunks
    }, 'info', nowMs);

    let acceptedChunks = 0;
    let pending = false;
    let lastReason = 'refill_completed';
    let lastPendingJobId = this.pendingProviderJobId;

    try {
      for (let index = 0; index < plan.requestedChunks; index += 1) {
        const result = await this.providerClient.fetchChunk({
          provider: this.config.provider,
          endpoint: this.config.provider === 'anu_qrng'
            ? this._resolveAnuEndpoint(options.endpoint || this.config.endpoint)
            : asString(options.endpoint ?? this.config.endpoint, ''),
          mode: this.config.mode,
          ttlMs: this.config.defaultTtlMs,
          apiKeyRef: options.apiKeyRef ?? this.config.apiKeyRef,
          fetchImpl: options.fetchImpl,
          timeoutMs: options.timeoutMs ?? this.config.requestTimeoutMs,
          pendingJobId: this.pendingProviderJobId,
          buildRequestUrl: options.buildRequestUrl
        });

        if (result.status === 'pending') {
          pending = true;
          lastReason = result.reason || 'upstream_pending';
          this.pendingProviderJobId = asString(result.pendingJobId, this.pendingProviderJobId);
          lastPendingJobId = this.pendingProviderJobId;
          if (result.sample && typeof result.sample === 'object') {
            this.ingestSample(result.sample, Date.now(), {
              ...(result.requestMeta || {}),
              responseMode: result.responseMode || 'upstream_pending'
            });
          }
          this.healthMonitor.markPending(lastReason, this.pendingProviderJobId, this.bufferManager.snapshot(Date.now()), Date.now());
          this._syncChannelHealth();
          this.lastConnectionTest = {
            ...this.lastConnectionTest,
            connectionState: 'pending',
            lastMode: 'quantum_pending',
            lastReason,
            lastJobId: this.pendingProviderJobId || ''
          };
          this._emitEvent('provider_pending', {
            pendingJobId: this.pendingProviderJobId,
            reason: lastReason
          }, 'info', Date.now());
          break;
        }

        if (!result.ok || !result.sample) {
          lastReason = result.reason || 'bridge_unavailable';
          this.reportBridgeFailure(lastReason, Date.now());
          break;
        }

        this.pendingProviderJobId = '';
        const ingestResult = this.ingestSample(result.sample, Date.now(), {
          ...(result.requestMeta || {}),
          responseMode: result.responseMode || 'upstream_quantum'
        });
        if (!ingestResult.accepted) {
          lastReason = ingestResult.reason || 'sample_rejected';
          break;
        }
        acceptedChunks += 1;
      }
    } finally {
      const endMs = Date.now();
      const bufferSnapshot = this.bufferManager.snapshot(endMs);
      this.healthMonitor.markRefillEnd({
        acceptedChunks,
        bufferSnapshot,
        pendingJobId: lastPendingJobId,
        lastReason
      }, endMs);
      this._syncChannelHealth();
      this._pollInFlight = false;
      this._emitEvent('refill_completed', {
        acceptedChunks,
        requestedChunks: plan.requestedChunks,
        pending,
        lastReason,
        occupancyChunks: bufferSnapshot.occupancyChunks
      }, pending || acceptedChunks === 0 ? 'warn' : 'info', endMs);
    }

    return {
      ok: acceptedChunks > 0,
      pending,
      acceptedChunks,
      requestedChunks: plan.requestedChunks,
      lastReason,
      pendingJobId: lastPendingJobId,
      diagnostics: this.getConnectionDiagnostics(Date.now())
    };
  }

  selectEntropy(nowMs, deterministicValue) {
    const timestampMs = Math.max(0, toFinite(nowMs, Date.now()));
    const fallbackEntropy = clamp01(deterministicValue);

    if (!this.config.enabled) {
      this.lastDecision = {
        mode: 'deterministic_fallback',
        sampleAgeMs: null,
        sampleValid: false,
        source: 'deterministic_local',
        reason: 'quantum_disabled',
        entropyValue: fallbackEntropy,
        timestampMs,
        jobId: ''
      };
      return this.lastDecision;
    }

    const consumed = this.bufferManager.consumeChunk(timestampMs);
    if (consumed.ok) {
      this.lastSample = consumed.chunk.sample;
      this.healthMonitor.markConsume(consumed.bufferSnapshot, timestampMs, { chunkId: consumed.chunk.chunkId });
      this._syncChannelHealth();
      this.lastDecision = {
        mode: 'quantum_primary',
        sampleAgeMs: consumed.ageMs,
        sampleValid: true,
        source: String(consumed.chunk.sample.source || 'quantum_bridge'),
        reason: 'fresh_sample',
        entropyValue: clamp01(consumed.chunk.sample.entropyFloat01),
        timestampMs,
        jobId: String(consumed.chunk.sample.jobId || '')
      };
      if (consumed.bufferSnapshot.occupancyChunks <= this.config.lowWatermarkChunks) {
        this._emitEvent('buffer_low', {
          occupancyChunks: consumed.bufferSnapshot.occupancyChunks,
          lowWatermarkChunks: this.config.lowWatermarkChunks
        }, 'info', timestampMs);
        this._scheduleReactiveRefill('low_watermark', timestampMs);
      }
      return this.lastDecision;
    }

    const lastSampleAgeMs = this.lastSample
      ? Math.max(0, timestampMs - Math.max(0, toFinite(this.lastSample.receivedAtMs, timestampMs)))
      : null;
    const lastSampleFresh = this.lastSample
      ? lastSampleAgeMs <= Math.max(1000, toFinite(this.lastSample.ttlMs, this.config.defaultTtlMs))
      : false;

    if (this.lastSample && !lastSampleFresh) {
      this.healthMonitor.markFallback('expired_sample', consumed.bufferSnapshot, timestampMs, true);
      this._syncChannelHealth();
      this.lastDecision = {
        mode: 'quantum_stale',
        sampleAgeMs: lastSampleAgeMs,
        sampleValid: Boolean(this.lastSample?.quality?.valid),
        source: 'deterministic_local',
        reason: 'expired_sample',
        entropyValue: fallbackEntropy,
        timestampMs,
        jobId: String(this.lastSample.jobId || '')
      };
      return this.lastDecision;
    }

    this.healthMonitor.markFallback(
      this.channelHealth.lastError ? 'bridge_unavailable' : consumed.reason || 'buffer_empty',
      consumed.bufferSnapshot,
      timestampMs,
      false
    );
    this._syncChannelHealth();
    this.lastDecision = {
      mode: 'deterministic_fallback',
      sampleAgeMs: null,
      sampleValid: false,
      source: 'deterministic_local',
      reason: this.channelHealth.lastError ? 'bridge_unavailable' : (consumed.reason || 'buffer_empty'),
      entropyValue: fallbackEntropy,
      timestampMs,
      jobId: ''
    };
    this._scheduleReactiveRefill('buffer_empty', timestampMs);
    this._emitEvent('fallback_selected', {
      reason: this.lastDecision.reason,
      occupancyChunks: consumed.bufferSnapshot?.occupancyChunks || 0
    }, 'warn', timestampMs);
    return this.lastDecision;
  }

  _deriveEffectiveDelivery(nowMs = Date.now()) {
    if (!this.config.enabled) {
      return {
        connectionState: 'disabled',
        mode: 'deterministic_fallback',
        reason: 'quantum_disabled'
      };
    }
    const snapshot = this.bufferManager.snapshot(nowMs);
    if (this.lastDecision.mode === 'quantum_stale' || this.channelHealth.status === 'stale') {
      return {
        connectionState: 'stale',
        mode: 'quantum_stale',
        reason: this.lastDecision.reason || 'expired_sample'
      };
    }
    if (snapshot.occupancyChunks > 0 && this.channelHealth.status === 'healthy') {
      return {
        connectionState: 'ok',
        mode: 'quantum_primary',
        reason: this.lastDecision.mode === 'quantum_primary' ? this.lastDecision.reason : 'buffer_ready'
      };
    }
    if (this.pendingProviderJobId) {
      return {
        connectionState: snapshot.occupancyChunks > 0 ? 'ok' : 'pending',
        mode: snapshot.occupancyChunks > 0 ? 'quantum_primary' : this.lastDecision.mode,
        reason: snapshot.occupancyChunks > 0 ? 'buffer_ready' : (this.lastConnectionTest.lastReason || 'upstream_pending')
      };
    }
    if (this.lastDecision.mode === 'deterministic_fallback') {
      return {
        connectionState: 'degraded',
        mode: 'deterministic_fallback',
        reason: this.lastDecision.reason || 'bridge_unavailable'
      };
    }
    if (this.lastConnectionTest.connectionState === 'testing') {
      return {
        connectionState: 'testing',
        mode: this.lastDecision.mode,
        reason: this.lastConnectionTest.lastReason || 'testing'
      };
    }
    if (this.lastConnectionTest.connectionState === 'pending') {
      return {
        connectionState: 'pending',
        mode: this.lastDecision.mode,
        reason: this.lastConnectionTest.lastReason || 'upstream_pending'
      };
    }
    if (snapshot.occupancyChunks > 0) {
      return {
        connectionState: 'ok',
        mode: 'quantum_primary',
        reason: 'buffer_ready'
      };
    }
    return {
      connectionState: this.channelHealth.consecutiveFailures > 0 ? 'degraded' : 'idle',
      mode: this.lastDecision.mode,
      reason: this.lastDecision.reason || 'buffer_empty'
    };
  }

  getTelemetry(nowMs = Date.now()) {
    const timestampMs = Math.max(0, toFinite(nowMs, Date.now()));
    const ageMs = this.lastSample
      ? Math.max(0, timestampMs - Math.max(0, toFinite(this.lastSample.receivedAtMs, timestampMs)))
      : null;
    const bufferState = this.bufferManager.snapshot(timestampMs);
    const eventLog = this.eventLog.slice(-12);

    return {
      enabled: this.config.enabled,
      mode: this.lastDecision.mode,
      reason: this.lastDecision.reason,
      entropyValue: clamp01(this.lastDecision.entropyValue),
      entropySource: this.lastDecision.source,
      source: this.lastDecision.source,
      sampleAgeMs: ageMs,
      sampleValid: Boolean(this.lastSample?.quality?.valid),
      jobId: this.lastSample?.jobId || '',
      channelHealth: {
        ...this.channelHealth
      },
      bufferState,
      configWarnings: [...this.configWarnings],
      auditSummary: {
        chunkAuditCount: this.bufferManager.getAuditTrail(9999).length,
        eventCount: this.eventLog.length,
        lastEvent: eventLog.length > 0 ? eventLog[eventLog.length - 1] : null
      },
      lastSample: this.lastSample
        ? {
          source: this.lastSample.source,
          jobId: this.lastSample.jobId,
          timestampMs: this.lastSample.timestampMs,
          receivedAtMs: this.lastSample.receivedAtMs,
          ttlMs: this.lastSample.ttlMs,
          quality: this.lastSample.quality
        }
        : null
    };
  }

  getConnectionDiagnostics(nowMs = Date.now()) {
    const timestampMs = Math.max(0, toFinite(nowMs, Date.now()));
    const lastSampleAgeMs = this.lastSample
      ? Math.max(0, timestampMs - Math.max(0, toFinite(this.lastSample.receivedAtMs, timestampMs)))
      : null;
    const bufferState = this.bufferManager.snapshot(timestampMs);
    const effectiveDelivery = this._deriveEffectiveDelivery(timestampMs);
    return {
      channelHealth: {
        ...this.channelHealth
      },
      bufferState,
      configWarnings: [...this.configWarnings],
      lastError: this.channelHealth.lastError || '',
      lastSampleAgeMs,
      lastDecision: {
        mode: this.lastDecision.mode,
        reason: this.lastDecision.reason,
        source: this.lastDecision.source,
        entropyValue: clamp01(this.lastDecision.entropyValue)
      },
      connectionState: effectiveDelivery.connectionState,
      effectiveConnectionState: effectiveDelivery.connectionState,
      effectiveMode: effectiveDelivery.mode,
      effectiveReason: effectiveDelivery.reason,
      lastSampleAtMs: this.lastConnectionTest.lastSampleAtMs,
      lastMode: this.lastDecision.mode,
      lastReason: this.lastDecision.reason,
      lastJobId: this.lastDecision.jobId || this.lastConnectionTest.lastJobId,
      lastConnectionState: this.lastConnectionTest.connectionState,
      lastConnectionMode: this.lastConnectionTest.lastMode,
      lastConnectionReason: this.lastConnectionTest.lastReason,
      lastConnectionJobId: this.lastConnectionTest.lastJobId,
      lastPendingJobId: this.pendingProviderJobId || '',
      eventLog: this.eventLog.slice(-12)
    };
  }

  getBufferSnapshot(nowMs = Date.now()) {
    return this.bufferManager.snapshot(nowMs);
  }

  getAuditTrail(limit = 20) {
    const safeLimit = Math.max(1, Math.floor(toFinite(limit, 20)));
    return {
      chunkAudit: this.bufferManager.getAuditTrail(safeLimit),
      events: this.eventLog.slice(-safeLimit)
    };
  }

  async testConnection(config = {}, options = {}) {
    const probeConfig = this.buildConfig(config, this.config);
    const provider = asString(probeConfig.provider, 'custom') || 'custom';
    if (provider !== 'anu_qrng' && !probeConfig.endpoint) {
      this.lastConnectionTest = {
        ...this.lastConnectionTest,
        connectionState: 'error',
        lastReason: 'missing_endpoint'
      };
      return {
        ok: false,
        connectionState: 'error',
        lastReason: 'missing_endpoint',
        diagnostics: this.getConnectionDiagnostics(Date.now())
      };
    }

    this.lastConnectionTest = {
      ...this.lastConnectionTest,
      connectionState: 'testing',
      lastReason: 'testing'
    };

    const result = await this.providerClient.fetchChunk({
      provider,
      endpoint: provider === 'anu_qrng'
        ? this._resolveAnuEndpoint(probeConfig.endpoint || probeConfig.anuEndpoint)
        : probeConfig.endpoint,
      mode: probeConfig.mode,
      ttlMs: probeConfig.defaultTtlMs,
      apiKeyRef: probeConfig.apiKeyRef,
      fetchImpl: options.fetchImpl,
      timeoutMs: options.timeoutMs ?? probeConfig.requestTimeoutMs
    });

    if (result.status === 'pending') {
      const pendingJobId = asString(result.pendingJobId, '');
      this.lastConnectionTest = {
        ...this.lastConnectionTest,
        connectionState: 'pending',
        lastMode: 'quantum_pending',
        lastReason: result.reason || 'upstream_pending',
        lastJobId: pendingJobId
      };
      return {
        ok: false,
        connectionState: 'pending',
        lastMode: 'quantum_pending',
        lastReason: result.reason || 'upstream_pending',
        lastJobId: pendingJobId,
        diagnostics: this.getConnectionDiagnostics(Date.now())
      };
    }

    if (!result.ok || !result.sample) {
      const reason = result.reason || 'bridge_unavailable';
      this.lastConnectionTest = {
        ...this.lastConnectionTest,
        connectionState: 'error',
        lastReason: reason
      };
      return {
        ok: false,
        connectionState: 'error',
        lastReason: reason,
        diagnostics: this.getConnectionDiagnostics(Date.now())
      };
    }

    if (FALLBACK_RESPONSE_MODES.has(result.responseMode || '') && !probeConfig.allowProviderFallback) {
      this.lastConnectionTest = {
        ...this.lastConnectionTest,
        connectionState: 'error',
        lastReason: 'provider_fallback_disabled'
      };
      return {
        ok: false,
        connectionState: 'error',
        lastReason: 'provider_fallback_disabled',
        diagnostics: this.getConnectionDiagnostics(Date.now())
      };
    }

    const normalized = this.normalizeSample(result.sample, Date.now(), probeConfig);
    if (!normalized.valid) {
      this.lastConnectionTest = {
        ...this.lastConnectionTest,
        connectionState: 'error',
        lastReason: normalized.reason
      };
      return {
        ok: false,
        connectionState: 'error',
        lastReason: normalized.reason,
        diagnostics: this.getConnectionDiagnostics(Date.now())
      };
    }

    const mode = normalized.receivedAtMs + normalized.ttlMs >= Date.now()
      ? 'quantum_primary'
      : 'quantum_stale';
    const reason = mode === 'quantum_primary' ? 'connection_ok' : 'sample_stale';
    this.lastConnectionTest = {
      ...this.lastConnectionTest,
      connectionState: mode === 'quantum_primary' ? 'ok' : 'error',
      lastSampleAtMs: Date.now(),
      lastMode: mode,
      lastReason: reason,
      lastJobId: normalized.jobId || ''
    };
    return {
      ok: mode === 'quantum_primary',
      connectionState: mode === 'quantum_primary' ? 'ok' : 'error',
      lastMode: mode,
      lastReason: reason,
      lastJobId: normalized.jobId || '',
      diagnostics: this.getConnectionDiagnostics(Date.now())
    };
  }
}

export default QuantumEntropyBridge;

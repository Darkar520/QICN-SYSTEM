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

const normalizeByte = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(255, Math.round(numeric)));
};

export class QuantumEntropyBridge {
  constructor(options = {}) {
    this.config = this.buildConfig(options, {
      enabled: false,
      defaultTtlMs: 60000,
      requiredQualityMin: 0,
      pollMs: 10000,
      endpoint: '',
      anuEndpoint: ANU_QRNG_DEFAULT_ENDPOINT,
      provider: 'custom',
      mode: 'auto_hybrid',
      apiKeyRef: ''
    });
    this._pollTimer = null;
    this._pollInFlight = false;
    this._pollFetchImpl = null;
    this.lastSample = null;
    this.lastDecision = {
      mode: 'deterministic_fallback',
      sampleAgeMs: null,
      sampleValid: false,
      source: 'deterministic_local',
      reason: this.config.enabled ? 'bridge_unavailable' : 'quantum_disabled',
      entropyValue: 0.5,
      timestampMs: 0,
      jobId: ''
    };
    this.channelHealth = {
      status: this.config.enabled ? 'degraded' : 'disabled',
      consecutiveFailures: 0,
      consecutiveValid: 0,
      droppedSamples: 0,
      lastError: '',
      lastUpdateMs: 0
    };
    this.lastConnectionTest = {
      connectionState: 'idle',
      lastSampleAtMs: 0,
      lastMode: 'deterministic_fallback',
      lastReason: this.config.enabled ? 'bridge_unavailable' : 'quantum_disabled',
      lastJobId: ''
    };
  }

  buildConfig(nextConfig = {}, baseConfig = this.config) {
    const ttlCandidate = nextConfig.ttlMs ?? nextConfig.defaultTtlMs ?? baseConfig.defaultTtlMs;
    const qualityCandidate = nextConfig.qualityMin ?? nextConfig.requiredQualityMin ?? baseConfig.requiredQualityMin;
    const pollCandidate = nextConfig.pollMs ?? baseConfig.pollMs;
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
      apiKeyRef: asString(nextConfig.apiKeyRef ?? baseConfig.apiKeyRef, '')
    };
  }

  configure(nextConfig = {}) {
    this.config = this.buildConfig(nextConfig, this.config);
    if (!this.config.enabled) {
      this.stopPolling();
      this.channelHealth.status = 'disabled';
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
        lastReason: 'quantum_disabled'
      };
    } else if (this.config.provider !== 'anu_qrng') {
      this.stopPolling();
    }
  }

  setConfig(partialConfig = {}) {
    this.configure(partialConfig);
    return { ...this.config };
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

  _bitBalance(bytes = []) {
    const list = Array.isArray(bytes) ? bytes : [];
    let ones = 0;
    let total = 0;
    for (let index = 0; index < list.length; index += 1) {
      const byte = normalizeByte(list[index]);
      for (let bit = 0; bit < 8; bit += 1) {
        ones += (byte >> bit) & 1;
        total += 1;
      }
    }
    if (total <= 0) return 0.5;
    return clamp01(ones / total);
  }

  async fetchAnuSample(options = {}) {
    const fetchImpl = typeof options.fetchImpl === 'function'
      ? options.fetchImpl
      : (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
    if (!fetchImpl) {
      throw new Error('fetch_unavailable');
    }

    const endpoint = this._resolveAnuEndpoint(options.endpoint || this.config.endpoint);
    const timeoutMs = Math.max(1000, toFinite(options.timeoutMs, 4000));
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);
    try {
      const response = await fetchImpl(endpoint, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: abortController.signal
      });
      if (!response.ok) {
        throw new Error(`http_${response.status}`);
      }
      const payload = await response.json();
      const bytes = Array.isArray(payload?.data) ? payload.data.map(normalizeByte).slice(0, 16) : [];
      if (bytes.length === 0) {
        throw new Error('anu_empty');
      }
      const entropyBits = bytes.map((byte) => byte.toString(2).padStart(8, '0')).join('');
      const entropyFloat01 = bitsToFloat01(entropyBits);
      if (!Number.isFinite(entropyFloat01)) {
        throw new Error('anu_invalid_entropy');
      }
      const nowMs = Date.now();
      return {
        entropyFloat01,
        entropyBits,
        source: 'anu_qrng_vacuum_fluctuation',
        timestampMs: nowMs,
        receivedAtMs: nowMs,
        ttlMs: this.config.defaultTtlMs,
        quality: {
          valid: true,
          shots: bytes.length,
          bitBalance: this._bitBalance(bytes)
        },
        jobId: `anu_${nowMs}_${Math.random().toString(36).slice(2, 8)}`
      };
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new Error('bridge_timeout');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  startPolling(options = {}) {
    if (!this.config.enabled || this.config.provider !== 'anu_qrng') {
      this.stopPolling();
      return { started: false, reason: 'provider_not_anu' };
    }

    this.stopPolling();
    this._pollFetchImpl = typeof options.fetchImpl === 'function' ? options.fetchImpl : this._pollFetchImpl;
    const pollMs = Math.max(1000, toFinite(options.pollMs, this.config.pollMs));
    const poll = async () => {
      if (this._pollInFlight) return;
      this._pollInFlight = true;
      try {
        const sample = await this.fetchAnuSample({
          fetchImpl: this._pollFetchImpl
        });
        this.ingestSample(sample, Date.now());
      } catch (error) {
        this.reportBridgeFailure(error?.message || 'anu_fetch_error', Date.now());
      } finally {
        this._pollInFlight = false;
      }
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
    this._pollInFlight = false;
  }

  normalizeSample(sample, nowMs = Date.now()) {
    if (!sample || typeof sample !== 'object') {
      return { valid: false, reason: 'invalid_payload' };
    }

    const source = String(sample.source || 'quantum_bridge');
    const jobId = String(sample.jobId || '');
    const timestampMs = Math.max(0, toFinite(sample.timestampMs, nowMs));
    const receivedAtMs = Math.max(0, toFinite(sample.receivedAtMs, nowMs));
    const ttlMs = Math.max(1000, toFinite(sample.ttlMs, this.config.defaultTtlMs));
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
    if (qualityScore < this.config.requiredQualityMin) {
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
      }
    };
  }

  reportBridgeFailure(reason = 'bridge_unavailable', nowMs = Date.now()) {
    this.channelHealth.consecutiveFailures += 1;
    this.channelHealth.consecutiveValid = 0;
    this.channelHealth.lastError = String(reason || 'bridge_unavailable');
    this.channelHealth.lastUpdateMs = Math.max(0, toFinite(nowMs, Date.now()));
    if (this.config.enabled) {
      this.channelHealth.status = 'degraded';
    }
    this.lastConnectionTest = {
      ...this.lastConnectionTest,
      connectionState: 'error',
      lastReason: String(reason || 'bridge_unavailable')
    };
  }

  ingestSample(sample, nowMs = Date.now()) {
    const normalized = this.normalizeSample(sample, nowMs);
    if (!normalized.valid) {
      this.channelHealth.droppedSamples += 1;
      this.reportBridgeFailure(normalized.reason, nowMs);
      return { accepted: false, reason: normalized.reason };
    }

    this.lastSample = normalized;
    this.channelHealth.consecutiveValid += 1;
    this.channelHealth.consecutiveFailures = 0;
    this.channelHealth.lastError = '';
    this.channelHealth.lastUpdateMs = Math.max(0, toFinite(nowMs, Date.now()));
    this.channelHealth.status = this.config.enabled ? 'healthy' : 'disabled';
    this.lastConnectionTest = {
      ...this.lastConnectionTest,
      connectionState: this.config.enabled ? 'ok' : 'idle',
      lastSampleAtMs: Math.max(0, toFinite(nowMs, Date.now())),
      lastMode: 'quantum_primary',
      lastReason: 'sample_ingested',
      lastJobId: normalized.jobId || ''
    };
    return { accepted: true, reason: 'sample_ingested', sample: normalized };
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

    if (!this.lastSample) {
      this.lastDecision = {
        mode: 'deterministic_fallback',
        sampleAgeMs: null,
        sampleValid: false,
        source: 'deterministic_local',
        reason: this.channelHealth.lastError ? 'bridge_unavailable' : 'no_sample',
        entropyValue: fallbackEntropy,
        timestampMs,
        jobId: ''
      };
      return this.lastDecision;
    }

    const ageMs = Math.max(0, timestampMs - Math.max(0, toFinite(this.lastSample.receivedAtMs, timestampMs)));
    const sampleValid = Boolean(this.lastSample?.quality?.valid);
    const isFresh = sampleValid && ageMs <= Math.max(1000, toFinite(this.lastSample.ttlMs, this.config.defaultTtlMs));

    if (isFresh) {
      this.channelHealth.status = 'healthy';
      this.lastDecision = {
        mode: 'quantum_primary',
        sampleAgeMs: ageMs,
        sampleValid: true,
        source: String(this.lastSample.source || 'quantum_bridge'),
        reason: 'fresh_sample',
        entropyValue: clamp01(this.lastSample.entropyFloat01),
        timestampMs,
        jobId: String(this.lastSample.jobId || '')
      };
      return this.lastDecision;
    }

    this.channelHealth.status = 'stale';
    this.lastDecision = {
      mode: 'quantum_stale',
      sampleAgeMs: ageMs,
      sampleValid,
      source: 'deterministic_local',
      reason: sampleValid ? 'expired_sample' : 'invalid_payload',
      entropyValue: fallbackEntropy,
      timestampMs,
      jobId: String(this.lastSample.jobId || '')
    };
    return this.lastDecision;
  }

  getTelemetry(nowMs = Date.now()) {
    const timestampMs = Math.max(0, toFinite(nowMs, Date.now()));
    const ageMs = this.lastSample
      ? Math.max(0, timestampMs - Math.max(0, toFinite(this.lastSample.receivedAtMs, timestampMs)))
      : null;

    return {
      enabled: this.config.enabled,
      mode: this.lastDecision.mode,
      reason: this.lastDecision.reason,
      entropyValue: clamp01(this.lastDecision.entropyValue),
      entropySource: this.lastDecision.source,
      sampleAgeMs: ageMs,
      sampleValid: Boolean(this.lastSample?.quality?.valid),
      jobId: this.lastSample?.jobId || '',
      channelHealth: {
        ...this.channelHealth
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
    return {
      channelHealth: {
        ...this.channelHealth
      },
      lastError: this.channelHealth.lastError || '',
      lastSampleAgeMs,
      lastDecision: {
        mode: this.lastDecision.mode,
        reason: this.lastDecision.reason,
        source: this.lastDecision.source,
        entropyValue: clamp01(this.lastDecision.entropyValue)
      },
      connectionState: this.lastConnectionTest.connectionState,
      lastSampleAtMs: this.lastConnectionTest.lastSampleAtMs,
      lastMode: this.lastConnectionTest.lastMode,
      lastReason: this.lastConnectionTest.lastReason,
      lastJobId: this.lastConnectionTest.lastJobId
    };
  }

  async testConnection(config = {}, options = {}) {
    const probeConfig = this.buildConfig(config, this.config);
    const provider = asString(probeConfig.provider, 'custom') || 'custom';
    const isAnuProvider = provider === 'anu_qrng';
    const fetchImpl = typeof options.fetchImpl === 'function'
      ? options.fetchImpl
      : (typeof fetch === 'function' ? fetch : null);
    if (!fetchImpl) {
      this.lastConnectionTest = {
        ...this.lastConnectionTest,
        connectionState: 'error',
        lastReason: 'fetch_unavailable'
      };
      return {
        ok: false,
        connectionState: 'error',
        lastReason: 'fetch_unavailable',
        diagnostics: this.getConnectionDiagnostics(Date.now())
      };
    }
    if (!isAnuProvider && !probeConfig.endpoint) {
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

    if (isAnuProvider) {
      try {
        const sample = await this.fetchAnuSample({
          fetchImpl,
          endpoint: probeConfig.endpoint,
          timeoutMs: options.timeoutMs
        });
        const ingestResult = this.ingestSample(sample, Date.now());
        if (!ingestResult.accepted) {
          this.lastConnectionTest = {
            ...this.lastConnectionTest,
            connectionState: 'error',
            lastReason: ingestResult.reason || 'invalid_sample'
          };
          return {
            ok: false,
            connectionState: 'error',
            lastReason: ingestResult.reason || 'invalid_sample',
            diagnostics: this.getConnectionDiagnostics(Date.now())
          };
        }
        const diagnostics = this.getConnectionDiagnostics(Date.now());
        this.lastConnectionTest = {
          ...this.lastConnectionTest,
          connectionState: 'ok',
          lastSampleAtMs: Date.now(),
          lastMode: 'quantum_primary',
          lastReason: 'connection_ok',
          lastJobId: sample?.jobId || ''
        };
        return {
          ok: true,
          connectionState: 'ok',
          lastMode: 'quantum_primary',
          lastReason: 'connection_ok',
          lastJobId: sample?.jobId || '',
          diagnostics
        };
      } catch (error) {
        const reason = error?.name === 'AbortError' ? 'bridge_timeout' : (error?.message || 'bridge_unavailable');
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
    }

    const abortController = new AbortController();
    const timeoutMs = Math.max(1500, toFinite(options.timeoutMs, 4500));
    const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);
    try {
      const headers = { Accept: 'application/json' };
      if (probeConfig.apiKeyRef) {
        headers['x-api-key'] = probeConfig.apiKeyRef;
      }
      const response = await fetchImpl(probeConfig.endpoint, {
        method: 'GET',
        headers,
        signal: abortController.signal
      });
      if (!response.ok) {
        const reason = `http_${response.status}`;
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

      const payload = await response.json();
      const payloadMode = String(payload?.mode || '');
      if (payloadMode === 'upstream_pending') {
        const pendingJobId = String(payload?.pendingJobId || '');
        this.lastConnectionTest = {
          ...this.lastConnectionTest,
          connectionState: 'pending',
          lastMode: 'quantum_pending',
          lastReason: payload?.reason || 'upstream_pending',
          lastJobId: pendingJobId
        };
        return {
          ok: false,
          connectionState: 'pending',
          lastMode: 'quantum_pending',
          lastReason: payload?.reason || 'upstream_pending',
          lastJobId: pendingJobId,
          diagnostics: this.getConnectionDiagnostics(Date.now())
        };
      }
      const sample = (payload && typeof payload === 'object' && payload.sample)
        ? payload.sample
        : payload;
      const previousConfig = this.config;
      this.config = probeConfig;
      const normalized = this.normalizeSample(sample, Date.now());
      this.config = previousConfig;
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
    } catch (error) {
      const reason = error?.name === 'AbortError' ? 'bridge_timeout' : (error?.message || 'bridge_unavailable');
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
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export default QuantumEntropyBridge;

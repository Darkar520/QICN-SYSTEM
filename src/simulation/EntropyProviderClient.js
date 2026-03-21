const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));
const toFinite = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const asString = (value, fallback = '') => {
  if (value === undefined || value === null) return fallback;
  return String(value).trim() || fallback;
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

const normalizeByte = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(255, Math.round(numeric)));
};

const ANU_QRNG_DEFAULT_ENDPOINT = 'https://qrng.anu.edu.au/API/jsonI.php?length=16&type=uint8';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));

const fetchWithTimeout = async (fetchImpl, url, options = {}, timeoutMs = 4500) => {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), Math.max(250, timeoutMs));
  try {
    return await fetchImpl(url, {
      ...options,
      signal: abortController.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

const buildRequestUrl = ({ endpoint, provider, mode, ttlMs, pendingJobId }) => {
  const baseEndpoint = asString(endpoint, '');
  if (!baseEndpoint) return '';
  const appendSearch = (searchParams) => {
    searchParams.set('provider', provider || 'custom');
    searchParams.set('mode', mode || 'auto_hybrid');
    searchParams.set('ttlMs', String(Math.max(1000, toFinite(ttlMs, 60000))));
    if (provider === 'ibm' && pendingJobId) {
      searchParams.set('ibmJobId', String(pendingJobId));
    }
  };

  try {
    const resolved = baseEndpoint.startsWith('http://') || baseEndpoint.startsWith('https://')
      ? new URL(baseEndpoint)
      : new URL(baseEndpoint, 'http://localhost');
    appendSearch(resolved.searchParams);
    return baseEndpoint.startsWith('http://') || baseEndpoint.startsWith('https://')
      ? resolved.toString()
      : `${resolved.pathname}${resolved.search}`;
  } catch {
    const separator = baseEndpoint.includes('?') ? '&' : '?';
    const pairs = [
      `provider=${encodeURIComponent(provider || 'custom')}`,
      `mode=${encodeURIComponent(mode || 'auto_hybrid')}`,
      `ttlMs=${encodeURIComponent(String(Math.max(1000, toFinite(ttlMs, 60000))))}`
    ];
    if (provider === 'ibm' && pendingJobId) {
      pairs.push(`ibmJobId=${encodeURIComponent(String(pendingJobId))}`);
    }
    return `${baseEndpoint}${separator}${pairs.join('&')}`;
  }
};

export class EntropyProviderClient {
  constructor(config = {}) {
    this.config = {
      defaultTimeoutMs: 4500,
      retryCount: 1,
      retryBackoffMs: 300
    };
    this.requestCounter = 0;
    this.configure(config);
  }

  configure(nextConfig = {}) {
    this.config = {
      defaultTimeoutMs: Math.max(500, toFinite(nextConfig.defaultTimeoutMs, this.config.defaultTimeoutMs)),
      retryCount: Math.max(0, Math.floor(toFinite(nextConfig.retryCount, this.config.retryCount))),
      retryBackoffMs: Math.max(0, Math.floor(toFinite(nextConfig.retryBackoffMs, this.config.retryBackoffMs)))
    };
    return { ...this.config };
  }

  async fetchChunk(options = {}) {
    const maxAttempts = Math.max(1, this.config.retryCount + 1);
    let lastResult = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      lastResult = options.provider === 'anu_qrng'
        ? await this.fetchAnuChunk({ ...options, attempt })
        : await this.fetchHttpChunk({ ...options, attempt });
      if (lastResult.ok || lastResult.status === 'pending') {
        return { ...lastResult, attempts: attempt };
      }
      if (attempt < maxAttempts) {
        await sleep(this.config.retryBackoffMs * attempt);
      }
    }
    return { ...(lastResult || {}), attempts: maxAttempts };
  }

  async fetchAnuChunk(options = {}) {
    const fetchImpl = typeof options.fetchImpl === 'function'
      ? options.fetchImpl
      : (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
    if (!fetchImpl) {
      return {
        ok: false,
        status: 'error',
        reason: 'fetch_unavailable'
      };
    }

    const endpoint = asString(options.endpoint, ANU_QRNG_DEFAULT_ENDPOINT) || ANU_QRNG_DEFAULT_ENDPOINT;
    const fetchStartMs = Date.now();
    try {
      const response = await fetchWithTimeout(fetchImpl, endpoint, {
        method: 'GET',
        headers: { Accept: 'application/json' }
      }, Math.max(1000, toFinite(options.timeoutMs, this.config.defaultTimeoutMs)));
      if (!response.ok) {
        return {
          ok: false,
          status: 'error',
          reason: `http_${response.status}`,
          requestMeta: {
            provider: 'anu_qrng',
            fetchStartMs,
            fetchEndMs: Date.now(),
            latencyMs: Math.max(0, Date.now() - fetchStartMs),
            requestId: `anu_req_${++this.requestCounter}`
          }
        };
      }
      const payload = await response.json();
      const bytes = Array.isArray(payload?.data) ? payload.data.map(normalizeByte).slice(0, 16) : [];
      if (bytes.length === 0) {
        return {
          ok: false,
          status: 'error',
          reason: 'anu_empty',
          requestMeta: {
            provider: 'anu_qrng',
            fetchStartMs,
            fetchEndMs: Date.now(),
            latencyMs: Math.max(0, Date.now() - fetchStartMs),
            requestId: `anu_req_${++this.requestCounter}`
          }
        };
      }
      const entropyBits = bytes.map((byte) => byte.toString(2).padStart(8, '0')).join('');
      const entropyFloat01 = bitsToFloat01(entropyBits);
      if (!Number.isFinite(entropyFloat01)) {
        return {
          ok: false,
          status: 'error',
          reason: 'anu_invalid_entropy'
        };
      }
      const fetchEndMs = Date.now();
      return {
        ok: true,
        status: 'ok',
        responseMode: 'upstream_quantum',
        sample: {
          source: 'anu_qrng_vacuum_fluctuation',
          jobId: `anu_job_${fetchEndMs}_${++this.requestCounter}`,
          timestampMs: fetchEndMs,
          receivedAtMs: fetchEndMs,
          ttlMs: Math.max(1000, toFinite(options.ttlMs, 60000)),
          entropyBits,
          entropyFloat01,
          quality: {
            valid: true,
            shots: bytes.length,
            bitBalance: clamp01(
              bytes
                .map((byte) => byte.toString(2).padStart(8, '0'))
                .join('')
                .split('')
                .reduce((acc, bit) => (bit === '1' ? acc + 1 : acc), 0) / (bytes.length * 8)
            )
          }
        },
        requestMeta: {
          provider: 'anu_qrng',
          fetchStartMs,
          fetchEndMs,
          latencyMs: Math.max(0, fetchEndMs - fetchStartMs),
          requestId: `anu_req_${this.requestCounter}`
        }
      };
    } catch (error) {
      return {
        ok: false,
        status: 'error',
        reason: error?.name === 'AbortError' ? 'bridge_timeout' : (error?.message || 'bridge_unavailable'),
        requestMeta: {
          provider: 'anu_qrng',
          fetchStartMs,
          fetchEndMs: Date.now(),
          latencyMs: Math.max(0, Date.now() - fetchStartMs),
          requestId: `anu_req_${++this.requestCounter}`
        }
      };
    }
  }

  async fetchHttpChunk(options = {}) {
    const fetchImpl = typeof options.fetchImpl === 'function'
      ? options.fetchImpl
      : (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
    if (!fetchImpl) {
      return {
        ok: false,
        status: 'error',
        reason: 'fetch_unavailable'
      };
    }
    const provider = asString(options.provider, 'custom') || 'custom';
    const endpoint = asString(options.endpoint, '');
    if (!endpoint) {
      return {
        ok: false,
        status: 'error',
        reason: 'missing_endpoint'
      };
    }
    const requestUrl = typeof options.buildRequestUrl === 'function'
      ? options.buildRequestUrl(asString(options.pendingJobId, ''))
      : buildRequestUrl({
        endpoint,
        provider,
        mode: asString(options.mode, 'auto_hybrid') || 'auto_hybrid',
        ttlMs: options.ttlMs,
        pendingJobId: asString(options.pendingJobId, '')
      });
    const headers = { Accept: 'application/json' };
    if (options.apiKeyRef) {
      headers['x-api-key'] = String(options.apiKeyRef);
    }
    const fetchStartMs = Date.now();
    try {
      const response = await fetchWithTimeout(fetchImpl, requestUrl, {
        method: 'GET',
        headers
      }, Math.max(1000, toFinite(options.timeoutMs, this.config.defaultTimeoutMs)));
      if (!response.ok) {
        return {
          ok: false,
          status: 'error',
          reason: `http_${response.status}`,
          requestMeta: {
            provider,
            requestUrl,
            fetchStartMs,
            fetchEndMs: Date.now(),
            latencyMs: Math.max(0, Date.now() - fetchStartMs),
            requestId: `provider_req_${++this.requestCounter}`
          }
        };
      }
      const payload = await response.json();
      const payloadMode = asString(payload?.mode, '');
      const pendingJobId = asString(payload?.pendingJobId, '');
      const requestMeta = {
        provider,
        requestUrl,
        fetchStartMs,
        fetchEndMs: Date.now(),
        latencyMs: Math.max(0, Date.now() - fetchStartMs),
        requestId: asString(payload?.sample?.jobId || payload?.jobId, `provider_req_${++this.requestCounter}`)
      };
      if (payloadMode === 'upstream_pending') {
        return {
          ok: false,
          status: 'pending',
          reason: asString(payload?.reason, 'upstream_pending'),
          pendingJobId,
          responseMode: payloadMode,
          sample: payload?.sample && typeof payload.sample === 'object' ? payload.sample : null,
          requestMeta
        };
      }
      const sample = payload?.sample && typeof payload.sample === 'object' ? payload.sample : payload;
      if (!sample || typeof sample !== 'object') {
        return {
          ok: false,
          status: 'error',
          reason: 'missing_sample',
          requestMeta
        };
      }
      return {
        ok: true,
        status: 'ok',
        sample,
        responseMode: payloadMode || 'upstream_quantum',
        requestMeta
      };
    } catch (error) {
      return {
        ok: false,
        status: 'error',
        reason: error?.name === 'AbortError' ? 'bridge_timeout' : (error?.message || 'bridge_unavailable'),
        requestMeta: {
          provider,
          requestUrl,
          fetchStartMs,
          fetchEndMs: Date.now(),
          latencyMs: Math.max(0, Date.now() - fetchStartMs),
          requestId: `provider_req_${++this.requestCounter}`
        }
      };
    }
  }
}

export default EntropyProviderClient;

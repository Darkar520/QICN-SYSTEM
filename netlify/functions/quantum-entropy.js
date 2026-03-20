import { randomBytes } from 'node:crypto';

const asJson = (statusCode, payload) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store'
  },
  body: JSON.stringify(payload)
});

const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));
const toFinite = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const toText = (value, fallback = '') => {
  if (value === undefined || value === null) return fallback;
  return String(value).trim() || fallback;
};

const getQueryParam = (event, key, fallback = '') => {
  const query = event?.queryStringParameters || {};
  const value = query[key] ?? query[String(key || '').toLowerCase()] ?? query[String(key || '').toUpperCase()];
  return toText(value, fallback);
};

const getHeaderValue = (event, key, fallback = '') => {
  const headers = event?.headers || {};
  const value = headers[key] ?? headers[String(key || '').toLowerCase()] ?? headers[String(key || '').toUpperCase()];
  return toText(value, fallback);
};

const normalizeProvider = (value) => {
  const normalized = toText(value, 'custom').toLowerCase();
  if (normalized === 'ibm' || normalized === 'braket' || normalized === 'custom') return normalized;
  return 'custom';
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

const computeBitBalance = (bits) => {
  const normalizedBits = String(bits || '').replace(/[^01]/g, '');
  if (!normalizedBits) return 0.5;
  const ones = normalizedBits.split('').reduce((acc, bit) => (bit === '1' ? acc + 1 : acc), 0);
  return clamp01(ones / normalizedBits.length);
};

const randomBits = (bitCount = 256) => {
  const safeBitCount = Math.max(32, Math.min(4096, Math.floor(toFinite(bitCount, 256))));
  const byteCount = Math.ceil(safeBitCount / 8);
  const bytes = randomBytes(byteCount);
  const bits = Array.from(bytes)
    .map((byte) => byte.toString(2).padStart(8, '0'))
    .join('')
    .slice(0, safeBitCount);
  return bits;
};

const deepGet = (input, path, fallback = undefined) => {
  const cleanPath = toText(path, '');
  if (!cleanPath) return fallback;
  const segments = cleanPath.split('.').map((segment) => segment.trim()).filter(Boolean);
  let current = input;
  for (const segment of segments) {
    if (!current || typeof current !== 'object' || !(segment in current)) return fallback;
    current = current[segment];
  }
  return current === undefined ? fallback : current;
};

const normalizeSample = ({ payload = {}, provider = 'custom', ttlMs = 60000, fallbackReason = '' } = {}) => {
  const nowMs = Date.now();
  const source = toText(payload?.source, provider === 'ibm' ? 'ibm_quantum' : `${provider}_entropy`);
  const entropyBits = toText(
    payload?.entropyBits
    || payload?.entropy_bits
    || payload?.bits
    || payload?.bitstring
    || payload?.random_bits
    || payload?.valueBits,
    ''
  ).replace(/[^01]/g, '');
  const entropyFloat01 = clamp01(
    payload?.entropyFloat01
    ?? payload?.entropy_float_01
    ?? payload?.entropy
    ?? bitsToFloat01(entropyBits)
    ?? 0.5
  );
  const shots = Math.max(0, Math.floor(toFinite(payload?.shots ?? payload?.quality?.shots, 1024)));
  const bitBalance = clamp01(payload?.quality?.bitBalance ?? computeBitBalance(entropyBits));
  const qualityValid = payload?.quality?.valid !== false;

  return {
    source,
    jobId: toText(payload?.jobId || payload?.job_id, `${provider}-${nowMs}`),
    timestampMs: Math.max(0, toFinite(payload?.timestampMs, nowMs)),
    receivedAtMs: nowMs,
    ttlMs: Math.max(1000, Math.floor(toFinite(payload?.ttlMs, ttlMs))),
    entropyBits,
    entropyFloat01,
    quality: {
      valid: Boolean(qualityValid),
      bitBalance,
      shots
    },
    meta: {
      provider,
      fallbackReason: toText(fallbackReason),
      upstream: toText(payload?.meta?.upstream, provider === 'ibm' ? 'ibm_runtime_or_simulated' : `${provider}_local`)
    }
  };
};

const buildSyntheticSample = ({ provider = 'custom', ttlMs = 60000, reason = 'local_entropy', jobId = '' } = {}) => {
  const bits = randomBits(256);
  return normalizeSample({
    provider,
    ttlMs,
    fallbackReason: reason,
    payload: {
      source: provider === 'ibm' ? 'ibm_simulated' : `${provider}_simulated`,
      jobId: jobId || `${provider}-${Date.now()}`,
      entropyBits: bits,
      entropyFloat01: bitsToFloat01(bits),
      quality: {
        valid: true,
        shots: 1024,
        bitBalance: computeBitBalance(bits)
      },
      meta: {
        upstream: 'local_secure_random'
      }
    }
  });
};

const fetchWithTimeout = async (url, options = {}, timeoutMs = 5500) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
};

const ibmAuthHeaders = (apiKey) => ({
  'Content-Type': 'application/json',
  Accept: 'application/json',
  Authorization: `Bearer ${apiKey}`,
  'x-api-key': apiKey
});

const fetchIbmSample = async ({ endpoint, apiKey, ttlMs, shots }) => {
  const response = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: ibmAuthHeaders(apiKey),
    body: JSON.stringify({
      shots,
      requestedBits: 256,
      purpose: 'qicn_quantum_entropy_bridge'
    })
  }, 7000);
  if (!response.ok) {
    throw new Error(`ibm_http_${response.status}`);
  }
  const payload = await response.json().catch(() => ({}));
  const samplePayload = payload?.sample && typeof payload.sample === 'object'
    ? payload.sample
    : payload;
  return normalizeSample({
    provider: 'ibm',
    ttlMs,
    payload: samplePayload
  });
};

const IBM_QUEUE_STATE = {
  jobId: '',
  status: 'idle',
  lastSubmitMs: 0,
  lastPollMs: 0,
  lastSample: null
};

const resolveStatusUrl = (template, jobId) => {
  const cleanTemplate = toText(template, '');
  if (!cleanTemplate) return '';
  if (cleanTemplate.includes('{jobId}')) {
    return cleanTemplate.replaceAll('{jobId}', encodeURIComponent(jobId));
  }
  const delimiter = cleanTemplate.includes('?') ? '&' : '?';
  return `${cleanTemplate}${delimiter}jobId=${encodeURIComponent(jobId)}`;
};

const parseDoneState = (payload, donePath, doneValuesSet) => {
  const doneBoolean = deepGet(payload, 'done', undefined);
  if (typeof doneBoolean === 'boolean') return doneBoolean;

  const statusAtPath = deepGet(payload, donePath, undefined);
  if (typeof statusAtPath === 'boolean') return statusAtPath;
  if (statusAtPath !== undefined && statusAtPath !== null) {
    return doneValuesSet.has(String(statusAtPath).trim().toLowerCase());
  }

  const fallbackStatus = payload?.status ?? payload?.state ?? payload?.jobStatus;
  if (fallbackStatus !== undefined && fallbackStatus !== null) {
    return doneValuesSet.has(String(fallbackStatus).trim().toLowerCase());
  }

  return false;
};

const extractQueueSamplePayload = (statusPayload, resultPath) => {
  const fromConfiguredPath = deepGet(statusPayload, resultPath, undefined);
  if (fromConfiguredPath && typeof fromConfiguredPath === 'object') return fromConfiguredPath;
  if (statusPayload?.sample && typeof statusPayload.sample === 'object') return statusPayload.sample;
  if (statusPayload?.result?.sample && typeof statusPayload.result.sample === 'object') return statusPayload.result.sample;
  if (statusPayload?.result && typeof statusPayload.result === 'object') return statusPayload.result;
  return statusPayload;
};

const fetchIbmQueueSample = async ({
  submitEndpoint,
  statusEndpointTemplate,
  apiKey,
  ttlMs,
  shots,
  ibmJobId,
  jobIdPath = 'jobId',
  donePath = 'status',
  doneValues = 'done,completed,succeeded,success,finished',
  resultPath = 'sample',
  pollCooldownMs = 1200
}) => {
  const nowMs = Date.now();
  const doneValuesSet = new Set(
    String(doneValues || '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );
  if (doneValuesSet.size === 0) {
    ['done', 'completed', 'succeeded', 'success', 'finished'].forEach((state) => doneValuesSet.add(state));
  }

  let jobId = toText(ibmJobId, toText(IBM_QUEUE_STATE.jobId, ''));
  if (!jobId) {
    const submitResponse = await fetchWithTimeout(submitEndpoint, {
      method: 'POST',
      headers: ibmAuthHeaders(apiKey),
      body: JSON.stringify({
        shots,
        requestedBits: 256,
        purpose: 'qicn_quantum_entropy_queue'
      })
    }, 7000);
    if (!submitResponse.ok) {
      throw new Error(`ibm_queue_submit_http_${submitResponse.status}`);
    }
    const submitPayload = await submitResponse.json().catch(() => ({}));
    jobId = toText(
      deepGet(submitPayload, jobIdPath, '')
      || submitPayload?.jobId
      || submitPayload?.job_id,
      ''
    );
    if (!jobId) {
      throw new Error('ibm_queue_missing_job_id');
    }
    IBM_QUEUE_STATE.lastSubmitMs = nowMs;
  }

  IBM_QUEUE_STATE.jobId = jobId;
  IBM_QUEUE_STATE.status = 'pending';

  const msSincePoll = Math.max(0, nowMs - Number(IBM_QUEUE_STATE.lastPollMs || 0));
  if (msSincePoll < Math.max(0, Number(pollCooldownMs) || 0)) {
    return {
      pending: true,
      jobId,
      sample: IBM_QUEUE_STATE.lastSample || null,
      reason: 'ibm_queue_poll_cooldown'
    };
  }

  const statusUrl = resolveStatusUrl(statusEndpointTemplate, jobId);
  if (!statusUrl) {
    throw new Error('ibm_queue_missing_status_endpoint');
  }
  IBM_QUEUE_STATE.lastPollMs = Date.now();

  const statusResponse = await fetchWithTimeout(statusUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'x-api-key': apiKey
    }
  }, 7000);
  if (!statusResponse.ok) {
    throw new Error(`ibm_queue_status_http_${statusResponse.status}`);
  }

  const statusPayload = await statusResponse.json().catch(() => ({}));
  const isDone = parseDoneState(statusPayload, donePath, doneValuesSet);
  if (!isDone) {
    return {
      pending: true,
      jobId,
      sample: IBM_QUEUE_STATE.lastSample || null,
      reason: 'ibm_queue_pending'
    };
  }

  const samplePayload = extractQueueSamplePayload(statusPayload, resultPath);
  const normalized = normalizeSample({
    provider: 'ibm',
    ttlMs,
    payload: {
      ...samplePayload,
      jobId
    }
  });
  IBM_QUEUE_STATE.lastSample = normalized;
  IBM_QUEUE_STATE.jobId = '';
  IBM_QUEUE_STATE.status = 'done';
  return {
    pending: false,
    jobId,
    sample: normalized
  };
};

export const handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return asJson(405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  const provider = normalizeProvider(
    getQueryParam(event, 'provider', process.env.QUANTUM_PROVIDER_DEFAULT || 'custom')
  );
  const ttlMs = Math.max(1000, Math.floor(toFinite(
    getQueryParam(event, 'ttlMs', process.env.QUANTUM_ENTROPY_TTL_MS || 60000),
    60000
  )));
  const shots = Math.max(128, Math.floor(toFinite(
    getQueryParam(event, 'shots', process.env.QUANTUM_SHOTS_DEFAULT || 1024),
    1024
  )));

  if (provider === 'ibm') {
    const endpoint = toText(process.env.IBM_QUANTUM_ENDPOINT, '');
    const apiKey = toText(
      getHeaderValue(event, 'x-api-key', ''),
      toText(process.env.IBM_QUANTUM_API_KEY, '')
    );
    const queueMode = toText(process.env.IBM_QUANTUM_MODE, 'auto').toLowerCase();
    const queueSubmitEndpoint = toText(
      process.env.IBM_QUANTUM_QUEUE_SUBMIT_ENDPOINT || process.env.IBM_QUANTUM_SUBMIT_ENDPOINT,
      ''
    );
    const queueStatusEndpoint = toText(
      process.env.IBM_QUANTUM_QUEUE_STATUS_ENDPOINT || process.env.IBM_QUANTUM_STATUS_ENDPOINT,
      ''
    );
    const useQueue = queueMode === 'queue'
      || (queueMode === 'auto' && Boolean(queueSubmitEndpoint && queueStatusEndpoint));

    if ((useQueue && (!queueSubmitEndpoint || !queueStatusEndpoint)) || (!useQueue && !endpoint) || !apiKey) {
      return asJson(200, {
        ok: true,
        provider,
        mode: 'simulated_fallback',
        sample: buildSyntheticSample({
          provider: 'ibm',
          ttlMs,
          reason: !apiKey
            ? 'missing_ibm_api_key'
            : (useQueue ? 'missing_ibm_queue_endpoints' : 'missing_ibm_endpoint')
        })
      });
    }

    try {
      if (useQueue) {
        const queueResult = await fetchIbmQueueSample({
          submitEndpoint: queueSubmitEndpoint,
          statusEndpointTemplate: queueStatusEndpoint,
          apiKey,
          ttlMs,
          shots,
          ibmJobId: getQueryParam(event, 'ibmJobId', ''),
          jobIdPath: toText(process.env.IBM_QUANTUM_QUEUE_JOB_ID_PATH, 'jobId'),
          donePath: toText(process.env.IBM_QUANTUM_QUEUE_DONE_PATH, 'status'),
          doneValues: toText(process.env.IBM_QUANTUM_QUEUE_DONE_VALUES, 'done,completed,succeeded,success,finished'),
          resultPath: toText(process.env.IBM_QUANTUM_QUEUE_RESULT_PATH, 'sample'),
          pollCooldownMs: Math.max(0, Math.floor(toFinite(process.env.IBM_QUANTUM_QUEUE_POLL_COOLDOWN_MS, 1200)))
        });

        if (queueResult.pending) {
          return asJson(200, {
            ok: true,
            provider,
            mode: 'upstream_pending',
            pendingJobId: queueResult.jobId,
            reason: queueResult.reason || 'ibm_queue_pending',
            sample: queueResult.sample || null
          });
        }

        return asJson(200, {
          ok: true,
          provider,
          mode: 'upstream_quantum',
          sample: queueResult.sample
        });
      }

      const sample = await fetchIbmSample({ endpoint, apiKey, ttlMs, shots });
      return asJson(200, {
        ok: true,
        provider,
        mode: 'upstream_quantum',
        sample
      });
    } catch (error) {
      return asJson(200, {
        ok: true,
        provider,
        mode: 'simulated_fallback',
        sample: buildSyntheticSample({
          provider: 'ibm',
          ttlMs,
          reason: toText(error?.message, 'ibm_upstream_unavailable'),
          jobId: IBM_QUEUE_STATE.jobId || ''
        })
      });
    }
  }

  if (provider === 'braket') {
    return asJson(200, {
      ok: true,
      provider,
      mode: 'simulated_fallback',
      sample: buildSyntheticSample({
        provider: 'braket',
        ttlMs,
        reason: 'braket_adapter_pending'
      })
    });
  }

  return asJson(200, {
    ok: true,
    provider: 'custom',
    mode: 'local_entropy',
    sample: buildSyntheticSample({
      provider: 'custom',
      ttlMs,
      reason: 'custom_provider_local_entropy'
    })
  });
};

export default { handler };

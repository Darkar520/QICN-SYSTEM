import { GEMINI_ENGINE_CONFIG, GEMINI_MODEL_FALLBACK_CHAIN, GEMINI_STRICT_MODEL, LLM_AUTH_ERROR_TOKEN } from '../config/simulationDefaults.js';

export class LlmRequestError extends Error {
  constructor(code, status, providerMessage = null) {
    super(code);
    this.name = 'LlmRequestError';
    this.code = code;
    this.status = status;
    this.providerMessage = providerMessage;
  }
}

// Transient provider errors are retried after a short wait (2026-11-08: a 503
// «high demand» lost a whole turn). Not transient: a daily quota, a retry hint
// longer than a minute, credentials, bad requests, and timeouts (a timed-out
// high-thinking request already waited minutes).
export const TRANSIENT_RETRY_DELAYS_MS = Object.freeze([4000, 12000]);
export const transientRetryDelayMs = (error, retryIndex = 0) => {
  if (!(retryIndex >= 0 && retryIndex < TRANSIENT_RETRY_DELAYS_MS.length)) return null;
  const status = Number(error?.status) || null;
  const code = String(error?.code || '');
  const message = String(error?.providerMessage || error?.message || '');
  if (/per ?day|perday|requests per day|daily|diari/i.test(message)) return null;
  const hint = message.match(/retry in\s+(\d+(?:\.\d+)?)\s*s/i);
  const hintMs = hint ? Math.ceil(Number(hint[1]) * 1000) : null;
  if (hintMs !== null && hintMs > 60000) return null;
  const transient = [500, 502, 503].includes(status) || status === 429 || code === 'LLM_NETWORK';
  if (!transient) return null;
  return Math.max(TRANSIENT_RETRY_DELAYS_MS[retryIndex], hintMs ?? 0);
};

// Provider error text is kept for the user, with any key-shaped token removed.
export const sanitizeProviderMessage = (value) => {
  if (typeof value !== 'string' || !value.trim()) return null;
  return value
    .replace(/AIza[0-9A-Za-z_-]{10,}/g, '[clave]')
    .replace(/AQ\.[0-9A-Za-z_.-]{10,}/g, '[clave]')
    .replace(/([?&]key=)[^&\s]+/gi, '$1[clave]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);
};

const readProviderMessage = (body) => {
  try {
    const parsed = JSON.parse(body);
    const error = parsed?.error;
    if (typeof error?.message === 'string') return sanitizeProviderMessage(error.message);
    if (typeof parsed?.detail === 'string' && parsed.detail) return sanitizeProviderMessage(parsed.detail);
    if (typeof parsed?.hint === 'string' && parsed.hint) return sanitizeProviderMessage(parsed.hint);
    if (typeof error === 'string') return sanitizeProviderMessage(error);
  } catch {
    // Non-JSON upstream body: keep only a short sanitized prefix.
    return sanitizeProviderMessage(String(body || '').slice(0, 160));
  }
  return null;
};

export const getLlmRequestGuidance = (error) => {
  if (error.code === 'UNAUTHORIZED') return 'La sesión del servidor no está autorizada. Vuelve a iniciar sesión y reenvía la consulta.';
  if (error.code === 'MISSING_GEMINI_API_KEY') return 'Falta la clave Gemini del servidor. Revisa la configuración en Control API.';
  if ([LLM_AUTH_ERROR_TOKEN, 'GEMINI_API_KEY_INVALID'].includes(error.code)) {
    return 'Gemini rechazó la credencial. Revisa la clave y sus permisos en Control API.';
  }
  if (error.status === 429) return 'Gemini alcanzó un límite de solicitudes o cuota. Espera un momento antes de reenviar.';
  if (error.status === 503) return 'Gemini no está disponible en este momento. Vuelve a enviar la consulta en unos momentos.';
  if (error.code === 'LLM_NETWORK') return 'No se pudo conectar con el servicio de chat. Revisa la conexión y vuelve a enviar la consulta.';
  if (error.code === 'LLM_TIMEOUT' || error.status === 504) return 'El servicio tardó demasiado en responder. Vuelve a enviar la consulta en unos momentos.';
  if (error.code === 'LLM_INVALID_RESPONSE') return 'La ruta del chat devolvió una respuesta inesperada. Comprueba que abriste el runtime con su servidor.';
  if (error.status === 404 || error.code === 'STRICT_MODEL_ENFORCED') return 'El modelo o la ruta de Gemini no están disponibles. Revisa la configuración en Control API.';
  return 'El servicio de chat no pudo completar la consulta. Revisa Control API e inténtalo de nuevo.';
};

const readErrorCode = (body, fallback) => {
  try {
    const code = JSON.parse(body)?.error;
    if (Array.isArray(code?.details) && code.details.some((detail) => detail?.reason === 'API_KEY_INVALID')) {
      return LLM_AUTH_ERROR_TOKEN;
    }
    if (typeof code === 'string') {
      const candidate = code.split(':')[0];
      if (/^[A-Z][A-Z0-9_]*$/.test(candidate)) return candidate;
    }
  } catch {
    // HTML and upstream errors are represented by their HTTP status.
  }
  return fallback;
};

export const robustFetchLLMResponse = async (apiUrl, payload, timeout = 120000, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  const startTime = performance.now();

  try {
    console.log(`[NETWORK] Peticion LLM iniciada (Timeout: ${timeout / 1000}s) → ${new URL(apiUrl, globalThis.location?.origin || 'http://localhost').pathname}...`);
    const endpoint = new URL(apiUrl, globalThis.location?.origin || 'http://localhost');
    const proxyMode = endpoint.pathname === '/.netlify/functions/llm-proxy'
      && endpoint.origin === (globalThis.location?.origin || 'http://localhost');
    if (!proxyMode && endpoint.origin !== 'https://generativelanguage.googleapis.com') {
      throw new Error('UNSUPPORTED_LLM_ENDPOINT');
    }
    const headers = { 'Content-Type': 'application/json' };

    // IMPORTANTE:
    // - Authorization Bearer solo debe viajar al proxy propio.
    // - En llamadas directas a Gemini, usar API key (query/header), no token de sesión.
    if (proxyMode && options?.authToken) {
      headers.Authorization = `Bearer ${options.authToken}`;
    }
    if (!proxyMode && options?.apiKey) {
      headers['x-goog-api-key'] = String(options.apiKey).trim();
    }
    const requestBody = proxyMode
      ? {
        provider: 'gemini',
        model: GEMINI_ENGINE_CONFIG.MODEL_ID,
        temperature: payload?.generationConfig?.temperature ?? 0.6,
        maxTokens: payload?.generationConfig?.maxOutputTokens ?? 2048,
        messages: [
          ...(payload?.systemInstruction?.parts?.[0]?.text
            ? [{ role: 'system', content: String(payload.systemInstruction.parts[0].text) }]
            : []),
          ...((payload?.contents || []).map((entry) => ({
            role: entry?.role === 'model' ? 'assistant' : 'user',
            content: String(entry?.parts?.[0]?.text || '')
          })))
        ],
        contextMeta: options?.contextMeta || {},
        integrity: options?.integrityEnvelope || null,
        rawPayload: payload
      }
      : payload;

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    const endTime = performance.now();
    const duration = endTime - startTime;
    console.log(`[NETWORK] Respuesta recibida en ${duration.toFixed(1)}ms (Status: ${res.status})`);

    if (!res.ok) {
      const errorText = await res.text();

      // === DETECCIÓN ESPECÍFICA DE 401 ===
      // Causas: API key expirada, inválida, o sin permisos para este modelo.
      // Acción: lanzar error semántico para que el caller limpie el key.
      if (res.status === 401 || res.status === 403) {
        throw new LlmRequestError(
          proxyMode ? readErrorCode(errorText, 'UNAUTHORIZED') : LLM_AUTH_ERROR_TOKEN,
          res.status,
          readProviderMessage(errorText)
        );
      }

      // === DETECCIÓN DE 404 (modelo no disponible en v1beta) ===
      // Intentar con el siguiente modelo de la cadena de fallback
      if (
        res.status === 404 &&
        !proxyMode &&
        !GEMINI_STRICT_MODEL &&
        (options?.fallbackAttempt ?? 0) < GEMINI_MODEL_FALLBACK_CHAIN.length - 1
      ) {
        const currentModel = options?.modelId || GEMINI_ENGINE_CONFIG.MODEL_ID;
        const currentIdx = GEMINI_MODEL_FALLBACK_CHAIN.indexOf(currentModel);
        const nextModel = GEMINI_MODEL_FALLBACK_CHAIN[currentIdx + 1];
        if (nextModel && options?.apiKey) {
          console.warn(`[LLM_FALLBACK] Modelo ${currentModel} retornó 404. Reintentando con ${nextModel}...`);
          const fallbackUrl = GEMINI_ENGINE_CONFIG.getEndpointForModel(options.apiKey, nextModel);
          return robustFetchLLMResponse(fallbackUrl, payload, timeout, {
            ...options,
            fallbackAttempt: (options?.fallbackAttempt ?? 0) + 1,
            modelId: nextModel
          });
        }
      }

      throw new LlmRequestError(readErrorCode(errorText, `HTTP_${res.status}`), res.status, readProviderMessage(errorText));
    }

    const text = await res.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new LlmRequestError('LLM_INVALID_RESPONSE');
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new LlmRequestError('LLM_INVALID_RESPONSE');
    }
    if (proxyMode) {
      if (!parsed.ok) throw new LlmRequestError(readErrorCode(text, 'LLM_INVALID_RESPONSE'));
      return {
        ...(parsed.raw || { candidates: [{ content: { parts: [{ text: parsed.content || '' }] } }] }),
        qicnInference: {
          provider: parsed.provider, model: parsed.model, requestId: parsed.requestId,
          usedFallback: Boolean(parsed.usedFallback), usage: parsed.usage || null
        }
      };
    }
    return { ...parsed, qicnInference: {
      provider: 'gemini', model: options?.modelId || GEMINI_ENGINE_CONFIG.MODEL_ID,
      usedFallback: Boolean(options?.fallbackAttempt), usage: parsed.usageMetadata || null
    } };
  } catch (error) {
    if (controller.signal.aborted || error.name === 'AbortError') throw new LlmRequestError('LLM_TIMEOUT');
    if (error instanceof TypeError) throw new LlmRequestError('LLM_NETWORK');
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

const describeError = (error) => ({
  code: error?.code || 'UNKNOWN',
  status: error?.status ?? null,
  providerMessage: error?.providerMessage || null
});

// A recovery through the proxy keeps the direct-route error: it is attached to
// the successful result (qicnInference.recoveredFrom) or to the final error
// (originalError). The user's key is never cleared here.
export const requestGemini = async (apiUrl, payload, timeout, options) => {
  try {
    return await robustFetchLLMResponse(apiUrl, payload, timeout, options);
  } catch (error) {
    const canRecover = ['LLM_NETWORK', LLM_AUTH_ERROR_TOKEN].includes(error.code);
    if (!canRecover || !options.proxyFallback || !apiUrl.startsWith(`${GEMINI_ENGINE_CONFIG.BASE_URL}/`)) {
      throw error;
    }
    try {
      const result = await robustFetchLLMResponse(options.proxyFallback, payload, timeout, {
        ...options,
        apiKey: '',
        contextMeta: { ...options.contextMeta, recoveredFrom: error.code }
      });
      return { ...result, qicnInference: { ...result.qicnInference, transportFallback: true, recoveredFrom: describeError(error) } };
    } catch (fallbackError) {
      if (fallbackError && typeof fallbackError === 'object') fallbackError.originalError = describeError(error);
      throw fallbackError;
    }
  }
};


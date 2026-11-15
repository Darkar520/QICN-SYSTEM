// ============================================================================
// LLM PROXY — ULTRATHINK v2
// Modelo verificado: gemini-3-flash-preview (Google AI docs)
// Fallback automático solo cuando GEMINI_STRICT_MODEL=false
// ============================================================================
import {
  buildC2ContractBlock,
  buildC2Signature,
  stableStringify,
  verifyC2Echo,
  IntegrityC2Error
} from './lib/integrity-c2.js';
import { requireUser } from './lib/auth-user.js';
import { boundGeminiPayload, UPSTREAM_TIMEOUT_MS } from './lib/llm-request-policy.js';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';

// Cadena de fallback sincronizada con index.jsx
const PROXY_MODEL_FALLBACK_CHAIN = [
  'gemini-3-flash-preview', // Primario
  'gemini-2.5-flash',       // Fallback estable
  'gemini-2.0-flash',       // Fallback legado
];

const asJson = (statusCode, payload) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store'
  },
  body: JSON.stringify(payload)
});

const validateBody = (body) => {
  if (!body || typeof body !== 'object') return 'INVALID_BODY';
  if (typeof body.provider !== 'string' || !body.provider.trim()) return 'INVALID_PROVIDER';
  if (typeof body.model !== 'string' || !body.model.trim()) return 'INVALID_MODEL';
  if (!Array.isArray(body.messages) || body.messages.length === 0 ||
      body.messages.some((message) => !message || !['system', 'user', 'assistant'].includes(message.role) ||
        typeof message.content !== 'string')) return 'INVALID_MESSAGES';
  return null;
};

const isStrictModelEnabled = () =>
  String(process.env.GEMINI_STRICT_MODEL || 'true').toLowerCase() !== 'false';

const normalizeThreatModel = () => {
  const value = String(process.env.INTEGRITY_THREAT_MODEL || 'C1').trim().toUpperCase();
  return value === 'C2' ? 'C2' : 'C1';
};

const appendSystemContract = (payload, contractBlock) => {
  if (!payload.systemInstruction || typeof payload.systemInstruction !== 'object') {
    payload.systemInstruction = { parts: [{ text: contractBlock }] };
    return payload;
  }
  const parts = Array.isArray(payload.systemInstruction.parts)
    ? payload.systemInstruction.parts
    : [];
  if (parts.length === 0) {
    payload.systemInstruction.parts = [{ text: contractBlock }];
    return payload;
  }
  const first = parts[0] || {};
  const prevText = String(first.text || '');
  parts[0] = {
    ...first,
    text: prevText ? `${prevText}\n\n${contractBlock}` : contractBlock
  };
  payload.systemInstruction.parts = parts;
  return payload;
};

const toGeminiPayload = (input) => {
  if (input?.rawPayload && typeof input.rawPayload === 'object') {
    return input.rawPayload;
  }
  const systemMessages = input.messages.filter((m) => m?.role === 'system');
  const userAssistantMessages = input.messages.filter((m) => m?.role !== 'system');

  const contents = userAssistantMessages.map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: String(msg.content || '') }]
  }));

  const systemPrompt = systemMessages.map((m) => String(m.content || '')).join('\n').trim();

  const generationConfig = {
    temperature: Number.isFinite(input.temperature) ? input.temperature : 0.6,
    maxOutputTokens: Number.isFinite(input.maxTokens) ? input.maxTokens : 1024
  };

  const payload = { contents, generationConfig };
  if (systemPrompt) {
    payload.systemInstruction = { parts: [{ text: systemPrompt }] };
  }

  return payload;
};

export const handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return asJson(405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  const authRequired = (process.env.AUTH_REQUIRED || 'true').toLowerCase() !== 'false';
  if (authRequired && !requireUser(event, context)) {
    return asJson(401, { ok: false, error: 'UNAUTHORIZED' });
  }

  let body = null;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return asJson(400, { ok: false, error: 'INVALID_JSON' });
  }

  const schemaError = validateBody(body);
  if (schemaError) {
    return asJson(400, { ok: false, error: schemaError });
  }

  const provider = body.provider.toLowerCase();
  if (provider !== 'gemini') {
    return asJson(400, { ok: false, error: 'UNSUPPORTED_PROVIDER' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return asJson(500, {
      ok: false,
      error: 'MISSING_GEMINI_API_KEY',
      hint: 'Configura la variable de entorno GEMINI_API_KEY en el panel de Netlify > Site configuration > Environment variables.'
    });
  }

  // En modo estricto, se usa el modelo del entorno; si no, el cliente puede pedir cualquiera.
  const enforcedModel = process.env.GEMINI_MODEL_ID || PROXY_MODEL_FALLBACK_CHAIN[0];
  const requestedModel = String(body.model || '').trim();
  if (isStrictModelEnabled() && requestedModel && requestedModel !== enforcedModel) {
    return asJson(400, {
      ok: false,
      provider,
      model: requestedModel,
      error: `STRICT_MODEL_ENFORCED: modelo permitido=${enforcedModel}`
    });
  }

  const requestId = `qicn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const threatModel = normalizeThreatModel();
  const c2Config = {
    active: threatModel === 'C2',
    secret: String(process.env.INTEGRITY_HMAC_SECRET || '')
  };
  let c2Context = null;

  if (c2Config.active) {
    if (!c2Config.secret.trim()) {
      return asJson(500, {
        ok: false,
        requestId,
        error: 'C2_SECRET_MISSING',
        hint: 'Set INTEGRITY_HMAC_SECRET in Netlify environment variables when INTEGRITY_THREAT_MODEL=C2.'
      });
    }
    const integrity = body.integrity;
    if (!integrity || typeof integrity !== 'object') {
      return asJson(400, {
        ok: false,
        requestId,
        error: 'C2_INTEGRITY_ENVELOPE_MISSING'
      });
    }
    if (!integrity.packet || typeof integrity.packet !== 'object') {
      return asJson(400, {
        ok: false,
        requestId,
        error: 'C2_INTEGRITY_PACKET_INVALID'
      });
    }
    const nonce = String(integrity.nonce || '').trim();
    const clientRequestId = String(integrity.requestId || '').trim();
    if (!nonce || !clientRequestId) {
      return asJson(400, {
        ok: false,
        requestId,
        error: 'C2_INTEGRITY_CONTEXT_INVALID',
        detail: 'nonce and requestId are required.'
      });
    }
    const packetCanonical = stableStringify(integrity.packet);
    c2Context = {
      packetCanonical,
      nonce,
      requestId: clientRequestId,
      runId: String(integrity.runId || ''),
      versionHash: String(integrity.versionHash || integrity.packet?.versionHash || ''),
      configHash: String(integrity.configHash || '')
    };
    const signature = buildC2Signature({
      ...c2Context,
      secret: c2Config.secret
    });
    c2Context.signature = signature;
  }

  let geminiPayload;
  try {
    geminiPayload = boundGeminiPayload(toGeminiPayload(body));
  } catch (error) {
    return asJson(400, { ok: false, error: error.message });
  }
  if (c2Context) {
    const c2Contract = buildC2ContractBlock({
      packetCanonical: c2Context.packetCanonical,
      nonce: c2Context.nonce,
      requestId: c2Context.requestId,
      runId: c2Context.runId,
      versionHash: c2Context.versionHash,
      configHash: c2Context.configHash,
      signature: c2Context.signature
    });
    appendSystemContract(geminiPayload, c2Contract);
  }

  // Función auxiliar: intenta llamar a un modelo específico
  const upstreamSignal = AbortSignal.timeout(UPSTREAM_TIMEOUT_MS);
  const tryModel = async (modelId) => {
    const resp = await fetch(
      `${GEMINI_API_URL}/models/${modelId}:generateContent`,
      {
        method: 'POST',
        signal: upstreamSignal,
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey.trim()
        },
        body: JSON.stringify(geminiPayload)
      }
    );
    const data = await resp.json();
    return { resp, data };
  };

  // Cadena de modelos a intentar:
  // - estricto: solo modelo forzado
  // - no estricto: primario + fallback chain
  const modelChain = isStrictModelEnabled()
    ? [enforcedModel]
    : [enforcedModel, ...PROXY_MODEL_FALLBACK_CHAIN.filter(m => m !== enforcedModel)];

  try {
    let lastError = null;
    for (const modelId of modelChain) {
      const { resp, data } = await tryModel(modelId);

      // 401/403: el API key del servidor es inválido — no tiene sentido hacer fallback
      if (resp.status === 401 || resp.status === 403) {
        return asJson(resp.status, {
          ok: false,
          provider,
          model: modelId,
          requestId,
          error: 'GEMINI_API_KEY_INVALID',
          hint: 'El API key configurado en GEMINI_API_KEY es inválido o no tiene permisos para este modelo. Genera un nuevo key en https://aistudio.google.com/app/apikey',
          detail: data?.error?.message || ''
        });
      }

      // 404: el modelo no está disponible → intentar el siguiente de la cadena
      if (resp.status === 404) {
        console.warn(`[PROXY_FALLBACK] Modelo "${modelId}" retornó 404. Probando siguiente...`);
        lastError = data?.error?.message || `MODEL_NOT_FOUND: ${modelId}`;
        continue;
      }

      // Otro error upstream
      if (!resp.ok) {
        return asJson(resp.status, {
          ok: false,
          provider,
          model: modelId,
          requestId,
          error: data?.error?.message || 'UPSTREAM_ERROR'
        });
      }

      // Éxito
      const content = data?.candidates?.[0]?.content?.parts?.map((p) => p?.text || '').join('\n').trim() || '';
      if (!content) {
        return asJson(502, { ok: false, provider, model: modelId, requestId, error: 'UPSTREAM_EMPTY_RESPONSE' });
      }
      if (c2Context) {
        try {
          verifyC2Echo(content, {
            expectedPacketCanonical: c2Context.packetCanonical,
            expectedNonce: c2Context.nonce,
            expectedRequestId: c2Context.requestId,
            expectedRunId: c2Context.runId,
            expectedVersionHash: c2Context.versionHash,
            expectedConfigHash: c2Context.configHash,
            secret: c2Config.secret
          });
        } catch (error) {
          const detail = error instanceof IntegrityC2Error
            ? error.message
            : (error?.message || 'unknown C2 verification error');
          return asJson(422, {
            ok: false,
            provider,
            model: modelId,
            requestId,
            error: 'C2_INTEGRITY_REJECTED',
            detail
          });
        }
      }
      return asJson(200, {
        ok: true,
        provider,
        model: modelId,
        integrityThreatModel: threatModel,
        usedFallback: modelId !== enforcedModel,
        requestId,
        content,
        usage: data?.usageMetadata || null,
        raw: data
      });
    }

    // Todos los modelos fallaron con 404
    return asJson(404, {
      ok: false,
      provider,
      requestId,
      error: 'ALL_MODELS_UNAVAILABLE',
      hint: 'Ningún modelo de la cadena de fallback estuvo disponible. Verifica que tu API key tenga acceso a los modelos Gemini 3.',
      detail: lastError
    });

  } catch (error) {
    const timedOut = ['AbortError', 'TimeoutError'].includes(error?.name);
    return asJson(timedOut ? 504 : 502, {
      ok: false,
      provider,
      requestId,
      error: timedOut ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_FAILURE'
    });
  }
};

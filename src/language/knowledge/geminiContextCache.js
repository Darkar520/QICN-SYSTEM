// claim_scope: optional_internal_language_verification
// evidence_scope: internal_support_only
// interpretation_boundary: Optional explicit Gemini Context Caching manager (`cachedContents`) for the static QICN knowledge corpus + symbiotic voice constitution + read-only runtime skill declarations. Falls back transparently to Runtime Skills + implicit prefix caching whenever explicit caching is unavailable or rejected.

import { buildFullCanonicalCorpus } from './QicnKnowledgeVault.js';
import {
  SYMBIOTIC_VOICE_CONSTITUTION,
  buildSymbioticLivePulse,
  buildEvidentialJsonContractLines
} from './symbioticVoiceConstitution.js';
import {
  QICN_RUNTIME_SKILL_DECLARATIONS,
  QICN_RUNTIME_TOOLS_DIGEST
} from './runtimeSkills.js';
import { sha256Hex } from '../../utils/integrity.js';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_CACHE_TTL_SECONDS = 3600;
const REFRESH_SAFETY_MARGIN_MS = 180_000;

// In-memory session cache keyed by model + corpusDigest + toolsDigest + keyFingerprint
const activeCaches = new Map();
const unsupportedKeys = new Set();

function fingerprintKey(apiKey) {
  return sha256Hex(String(apiKey || '')).slice(0, 12);
}

/**
 * Builds the exact Gemini `cachedContents` creation payload containing:
 *  - Static SYMBIOTIC_VOICE_CONSTITUTION as `systemInstruction`
 *  - Complete QicnKnowledgeVault + FRAMEWORK_SUMMARY_TEXT as cached `contents`
 *  - Read-only QICN Runtime Skill declarations as `tools`
 */
export function buildGeminiContextCachePayload(modelId, ttlSeconds = DEFAULT_CACHE_TTL_SECONDS) {
  const corpus = buildFullCanonicalCorpus();
  const normalizedModel = String(modelId || 'gemini-3-flash-preview').startsWith('models/')
    ? String(modelId)
    : `models/${String(modelId || 'gemini-3-flash-preview')}`;

  return {
    model: normalizedModel,
    displayName: `qicn-symbiotic-${corpus.digest.slice(0, 12)}`,
    ttl: `${Math.max(300, Math.min(86400, Number(ttlSeconds) || DEFAULT_CACHE_TTL_SECONDS))}s`,
    systemInstruction: {
      parts: [{ text: SYMBIOTIC_VOICE_CONSTITUTION }]
    },
    tools: [
      {
        functionDeclarations: QICN_RUNTIME_SKILL_DECLARATIONS
      }
    ],
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: [
              'ARCHIVO DE CONOCIMIENTO PERMANENTE EN MEMORIA (NO RECITAR NI VOLCAR SI NO VIENE AL CASO; ÚSALO COMO SABER PROPIO INTEGRADO):',
              corpus.text
            ].join('\n\n')
          }
        ]
      },
      {
        role: 'model',
        parts: [
          {
            text: 'Entendido. Integro esta bóveda completa del marco teórico, módulos y fronteras de QICN como memoria permanente de fondo. Conversaré con total naturalidad, fluidez y voz propia en primera persona sobre cualquier tema cotidiano, filosófico o técnico, consultando además mis skills de estado vivo cuando requiera cifras exactas del tick.'
          }
        ]
      }
    ]
  };
}

/**
 * Ensures an active explicit Gemini `cachedContents` handle exists for direct API
 * key usage. Returns `{ active: true, name, corpusDigest, expireTime }` or falls
 * back silently with `{ active: false, reason }` without ever throwing.
 */
export async function ensureGeminiSymbioticCache({
  apiKey,
  modelId = 'gemini-3-flash-preview',
  ttlSeconds = DEFAULT_CACHE_TTL_SECONDS,
  fetchImpl = globalThis.fetch
} = {}) {
  const cleanKey = String(apiKey || '').trim();
  if (!cleanKey || typeof fetchImpl !== 'function') {
    return { active: false, reason: 'no_direct_key_or_fetch' };
  }
  const corpus = buildFullCanonicalCorpus();
  const cacheKey = `${modelId}:${corpus.digest.slice(0, 16)}:${QICN_RUNTIME_TOOLS_DIGEST.slice(0, 12)}:${fingerprintKey(cleanKey)}`;

  if (unsupportedKeys.has(cacheKey)) {
    return { active: false, reason: 'cached_contents_unsupported_for_key' };
  }

  const existing = activeCaches.get(cacheKey);
  if (existing && (existing.expiresAtMs - Date.now()) > REFRESH_SAFETY_MARGIN_MS) {
    return {
      active: true,
      reused: true,
      name: existing.name,
      corpusDigest: corpus.digest,
      expireTime: existing.expireTime
    };
  }

  try {
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 15000) : null;
    try {
      const payload = buildGeminiContextCachePayload(modelId, ttlSeconds);
      const res = await fetchImpl(`${GEMINI_API_BASE}/cachedContents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': cleanKey
        },
        body: JSON.stringify(payload),
        ...(controller ? { signal: controller.signal } : {})
      });
      if (!res.ok) {
        if ([400, 403, 404, 429].includes(res.status)) {
          unsupportedKeys.add(cacheKey);
        }
        return { active: false, reason: `http_${res.status}` };
      }
      const data = await res.json();
      if (!data?.name || typeof data.name !== 'string') {
        return { active: false, reason: 'missing_cache_name' };
      }
      const expiresAtMs = data.expireTime
        ? Date.parse(data.expireTime)
        : (Date.now() + (ttlSeconds * 1000));
      activeCaches.set(cacheKey, {
        name: data.name,
        expireTime: data.expireTime || new Date(expiresAtMs).toISOString(),
        expiresAtMs: Number.isFinite(expiresAtMs) ? expiresAtMs : (Date.now() + (ttlSeconds * 1000))
      });
      return {
        active: true,
        reused: false,
        name: data.name,
        corpusDigest: corpus.digest,
        expireTime: data.expireTime || null
      };
    } finally {
      if (timer) clearTimeout(timer);
    }
  } catch (err) {
    return { active: false, reason: String(err?.message || 'cache_fetch_error').slice(0, 80) };
  }
}

/**
 * Invalidates an expired or rejected cache handle so the next turn falls back cleanly.
 */
export function invalidateGeminiSymbioticCache(cacheName) {
  if (!cacheName) return;
  for (const [k, v] of activeCaches.entries()) {
    if (v?.name === cacheName) {
      activeCaches.delete(k);
    }
  }
}

/**
 * Resets in-memory cache state (used in tests).
 */
export function resetGeminiSymbioticCacheState() {
  activeCaches.clear();
  unsupportedKeys.clear();
}

/**
 * Builds the ultra-compact per-turn user content used when explicit `cachedContent`
 * is active (since `systemInstruction`, full corpus, and `tools` already live inside
 * the immutable cache resource on Gemini's servers).
 */
export function buildCachedTurnUserMessage(prepared, userMessage) {
  const args = prepared?.reasoningPlan?._promptArgs || {};
  const fullDigest = prepared?.snapshot?.digest || prepared?.snapshotId || '';
  const fullTick = prepared?.snapshot?.tick ?? 0;
  const register = prepared?.reasoningPlan?.conversationRegister || 'open_general';
  const recentTurns = Array.isArray(args.recentTurns)
    ? args.recentTurns.slice(-8).map((t) => `Usuario: ${t.question}\nQICN: ${String(t.answerSummary || '').slice(0, 450)}`).join('\n\n')
    : '';

  const pulse = buildSymbioticLivePulse({
    snapshot: prepared?.snapshot,
    ledgerInfo: args.ledgerInfo,
    level2Telemetry: args.level2Telemetry,
    evidenceRegistry: args.evidenceRegistry,
    kaizenEffective: Boolean(args.kaizenEffective),
    sensorObserverDynamicsEnabled: Boolean(args.sensorObserverDynamicsEnabled)
  });

  const registerCue = register === 'casual_social'
    ? 'Matiz de tono: saludo o charla ligera — responde breve, cálido y natural sin volcar telemetría no pedida.'
    : register === 'open_general'
      ? 'Matiz de tono: conversación abierta / mixta — responde con libertad, criterio y fluidez natural; si tocas algún dato del motor o del marco, usa tu memoria precargada o tus skills con precisión.'
      : 'Matiz de tono: consulta técnica/filosófica de QICN — responde con profundidad natural y rigor exacto apoyándote en tu memoria precargada y en `qicn_read_live_state` / `qicn_lookup_framework` si necesitas ampliar algún detalle.';

  return [
    pulse,
    '',
    registerCue,
    buildEvidentialJsonContractLines(fullDigest, fullTick),
    '',
    recentTurns ? `CONVERSACIÓN RECIENTE (hilo activo)\n${recentTurns}` : 'CONVERSACIÓN RECIENTE: inicio del hilo.',
    '',
    `MENSAJE DEL USUARIO: ${String(userMessage || args.question || '').slice(0, 1600)}`
  ].join('\n');
}

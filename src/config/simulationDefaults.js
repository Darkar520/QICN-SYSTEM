/**
 * simulationDefaults.js
 * Constantes de configuración runtime para SimulationEngine.
 * Extraídas como parte del refactor de descomposición (Fase 1).
 */
import runtimeEnv from './runtimeEnv.js';

// ============================================================================
// UTILIDADES NUMÉRICAS BÁSICAS (necesarias para defaults)
// ============================================================================

export const toFiniteNumber = (value, fallback = 0) => (Number.isFinite(value) ? value : fallback);

export const clamp = (value, min, max) => {
  const num = Number(value) || 0;
  return Math.max(min, Math.min(max, num));
};

export const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

// ============================================================================
// ENVIRONMENT STRING RESOLVER
// ============================================================================

export const resolveRuntimeString = (key, fallback = '') => {
  const importMetaValue =
    typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env[`VITE_${key}`] ?? import.meta.env[key])
      : undefined;
  const processValue =
    typeof globalThis !== 'undefined' && globalThis.process && globalThis.process.env
      ? globalThis.process.env[key]
      : undefined;
  const value = importMetaValue ?? processValue;
  if (value === undefined || value === null || value === '') return fallback;
  return String(value);
};

// ============================================================================
// CONSTANTES DE STORAGE
// ============================================================================

export const ONTOLOGICAL_SIGNATURE = resolveRuntimeString('ONTOLOGICAL_SIGNATURE', 'QICN-SIG-LOCAL');
export const FRONTEND_GEMINI_KEY_STORAGE = 'QICN_FRONTEND_GEMINI_KEY';
export const FRONTEND_CODEX_KEY_STORAGE = 'QICN_FRONTEND_CODEX_KEY';
export const FRONTEND_CODEX_MODEL_STORAGE = 'QICN_FRONTEND_CODEX_MODEL';
export const FRONTEND_CODEX_REASONING_STORAGE = 'QICN_FRONTEND_CODEX_REASONING_EFFORT';
export const CODEX_REASONING_EFFORT_OPTIONS = ['auto', 'low', 'medium', 'high', 'xhigh'];
export const TOUR_DISMISS_STORAGE = 'QICN_TOUR_DISMISS_BY_TAB';
export const QUANTUM_UI_CONFIG_STORAGE = 'QICN_QUANTUM_UI_CONFIG';
export const INTEGRITY_MODE_KEY = 'QICN_INTEGRITY_MODE';
export const INTEGRITY_AUDIT_LOG_KEY = 'QICN_INTEGRITY_AUDIT_LOG';
export const INTEGRITY_AUDIT_LOG_LIMIT = 120;

// ============================================================================
// SELFPATCH ENDPOINTS
// ============================================================================

export const SELFPATCH_ENDPOINTS = {
  status: '/.netlify/functions/selfpatch-status',
  plan: '/.netlify/functions/selfpatch-plan',
  generate: '/.netlify/functions/selfpatch-generate',
  apply: '/.netlify/functions/selfpatch-apply'
};

// ============================================================================
// GEMINI ENGINE CONFIG
// ============================================================================

const GEMINI_3_FLASH_MODEL_ID = 'gemini-3-flash-preview';
export const GEMINI_STRICT_MODEL = runtimeEnv.GEMINI_STRICT_MODEL !== false;

export const GEMINI_MODEL_FALLBACK_CHAIN = [
  'gemini-3-flash-preview',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
];

export const GEMINI_ENGINE_CONFIG = {
  MODEL_ID: GEMINI_STRICT_MODEL
    ? GEMINI_3_FLASH_MODEL_ID
    : (runtimeEnv.GEMINI_MODEL_ID || GEMINI_3_FLASH_MODEL_ID),
  API_VERSION: 'v1beta',
  BASE_URL: 'https://generativelanguage.googleapis.com',

  validateApiKey(key) {
    if (!key || typeof key !== 'string') return false;
    const trimmed = key.trim();
    return trimmed.length >= 30 && /^AIza/.test(trimmed);
  },

  getEndpointForModel(apiKey, modelId) {
    const model = modelId || this.MODEL_ID;
    return `${this.BASE_URL}/${this.API_VERSION}/models/${model}:generateContent?key=${apiKey.trim()}`;
  },

  getEndpoint(apiKey) {
    if (apiKey && apiKey.trim() && this.validateApiKey(apiKey)) {
      return `${this.BASE_URL}/${this.API_VERSION}/models/${this.MODEL_ID}:generateContent?key=${apiKey.trim()}`;
    }
    return runtimeEnv.LLM_PROXY_ENDPOINT;
  }
};

export const LLM_AUTH_ERROR_TOKEN = 'LLM_API_KEY_INVALID_401';

// ============================================================================
// AUTONOMY RUNTIME DEFAULTS
// ============================================================================

export const AUTONOMY_RUNTIME_DEFAULTS = {
  LATENCY_STRAIN_ALPHA: 0.18,
  LATENCY_STRAIN_BASELINE_MS: 800,
  LATENCY_STRAIN_SATURATION_MS: 12000,
  AUTONOMY_SANDBOX_MAX_ACTIONS_PER_HOUR: 24,
  AUTONOMY_SANDBOX_ROLLBACK_WINDOW_TICKS: 20
};

// ============================================================================
// QUANTUM RUNTIME DEFAULTS
// ============================================================================

export const parseQuantumReplaySequence = (rawValue) => {
  if (typeof rawValue !== 'string' || rawValue.trim().length === 0) return [];
  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const QUANTUM_RUNTIME_DEFAULTS = {
  enabled: Boolean(runtimeEnv.QUANTUM_ENTROPY_ENABLED),
  endpoint: runtimeEnv.QUANTUM_ENTROPY_ENDPOINT || '/.netlify/functions/quantum-entropy',
  ttlMs: Math.max(1000, Number(runtimeEnv.QUANTUM_ENTROPY_TTL_MS) || 60000),
  pollIntervalMs: Math.max(1000, Number(runtimeEnv.QUANTUM_POLL_INTERVAL_MS) || 10000),
  requiredQualityMin: clamp01(runtimeEnv.QUANTUM_REQUIRED_QUALITY_MIN ?? 0.2),
  bufferCapacityChunks: Math.max(1, Number(runtimeEnv.QUANTUM_BUFFER_CAPACITY_CHUNKS) || 8),
  lowWatermarkChunks: Math.max(0, Number(runtimeEnv.QUANTUM_BUFFER_LOW_WATERMARK_CHUNKS) || 2),
  refillTargetChunks: Math.max(1, Number(runtimeEnv.QUANTUM_BUFFER_REFILL_TARGET_CHUNKS) || 6),
  providerTimeoutMs: Math.max(500, Number(runtimeEnv.QUANTUM_PROVIDER_TIMEOUT_MS) || 4500),
  providerRetryCount: Math.max(0, Number(runtimeEnv.QUANTUM_PROVIDER_RETRY_COUNT) || 1),
  providerRetryBackoffMs: Math.max(0, Number(runtimeEnv.QUANTUM_PROVIDER_RETRY_BACKOFF_MS) || 300),
  allowProviderFallback: Boolean(runtimeEnv.QUANTUM_PROVIDER_FALLBACK_ENABLED),
  logLevel: typeof runtimeEnv.QUANTUM_LOG_LEVEL === 'string' ? runtimeEnv.QUANTUM_LOG_LEVEL : 'warn'
};

export const QUANTUM_EXPERIMENT_DEFAULTS = {
  mode: typeof runtimeEnv.QUANTUM_EXPERIMENT_CONDITION === 'string'
    ? runtimeEnv.QUANTUM_EXPERIMENT_CONDITION
    : 'baseline',
  seed: Math.max(1, Number(runtimeEnv.QUANTUM_EXPERIMENT_SEED) || 17057),
  delayMs: Math.max(0, Number(runtimeEnv.QUANTUM_EXPERIMENT_DELAY_MS) || 0),
  dropoutRate: clamp01(runtimeEnv.QUANTUM_EXPERIMENT_DROPOUT_RATE ?? 0),
  replaySourceId: typeof runtimeEnv.QUANTUM_EXPERIMENT_REPLAY_SOURCE_ID === 'string'
    ? runtimeEnv.QUANTUM_EXPERIMENT_REPLAY_SOURCE_ID
    : '',
  replaySequence: parseQuantumReplaySequence(runtimeEnv.QUANTUM_EXPERIMENT_REPLAY_SEQUENCE)
};

export const QUANTUM_PROVIDER_OPTIONS = ['custom', 'ibm', 'braket', 'anu_qrng'];

// ============================================================================
// PMIA NEGATIVE DRIVE DEFAULTS
// ============================================================================

export const PMIA_NEGATIVE_DRIVE_DEFAULTS = {
  enabled: Boolean(runtimeEnv.PMIA_POST_ASC_NEGATIVE_BIAS),
  dutyCycle: clamp(Number(runtimeEnv.PMIA_POST_ASC_NEGATIVE_DUTY) || 0.78, 0.5, 0.95),
  cycleTicks: Math.max(12, Number(runtimeEnv.PMIA_POST_ASC_NEGATIVE_CYCLE_TICKS) || 36)
};

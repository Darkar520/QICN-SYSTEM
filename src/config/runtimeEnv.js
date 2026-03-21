const asBool = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  const normalized = String(value).toLowerCase().trim();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  return fallback;
};

const processEnv =
  typeof globalThis !== 'undefined' &&
  globalThis.process &&
  globalThis.process.env
    ? globalThis.process.env
    : {};

const importMetaEnv =
  typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env
    : {};

const getEnv = (key, fallback = undefined) => {
  const value =
    importMetaEnv[`VITE_${key}`] ??
    importMetaEnv[key] ??
    processEnv[key];
  return value !== undefined ? value : fallback;
};

export const runtimeEnv = {
  // Secure-by-default posture: explicit opt-in is required to disable auth
  // or expose selfpatch/client-key paths.
  APP_ENV: getEnv('APP_ENV', getEnv('NODE_ENV', 'production')),
  LLM_PROXY_ENDPOINT: getEnv('LLM_PROXY_ENDPOINT', '/.netlify/functions/llm-proxy'),
  GEMINI_MODEL_ID: getEnv('GEMINI_MODEL_ID', 'gemini-3-flash-preview'),
  GEMINI_STRICT_MODEL: asBool(getEnv('GEMINI_STRICT_MODEL'), true),
  AUTH_REQUIRED: asBool(getEnv('AUTH_REQUIRED'), true),
  FRONTEND_GEMINI_ALLOWED: asBool(getEnv('FRONTEND_GEMINI_ALLOWED'), false),
  FEATURE_PWA: asBool(getEnv('FEATURE_PWA'), true),
  FEATURE_SENSORS: asBool(getEnv('FEATURE_SENSORS'), true),
  QUANTUM_ENTROPY_ENABLED: asBool(getEnv('QUANTUM_ENTROPY_ENABLED'), false),
  QUANTUM_ENTROPY_ENDPOINT: getEnv('QUANTUM_ENTROPY_ENDPOINT', '/.netlify/functions/quantum-entropy'),
  QUANTUM_PROVIDER_DEFAULT: getEnv('QUANTUM_PROVIDER_DEFAULT', 'custom'),
  QUANTUM_ENTROPY_TTL_MS: Number(getEnv('QUANTUM_ENTROPY_TTL_MS')) || 60000,
  QUANTUM_POLL_INTERVAL_MS: Number(getEnv('QUANTUM_POLL_INTERVAL_MS')) || 10000,
  QUANTUM_REQUIRED_QUALITY_MIN: Number(getEnv('QUANTUM_REQUIRED_QUALITY_MIN')) || 0.2,
  QUANTUM_BUFFER_CAPACITY_CHUNKS: Number(getEnv('QUANTUM_BUFFER_CAPACITY_CHUNKS')) || 8,
  QUANTUM_BUFFER_LOW_WATERMARK_CHUNKS: Number(getEnv('QUANTUM_BUFFER_LOW_WATERMARK_CHUNKS')) || 2,
  QUANTUM_BUFFER_REFILL_TARGET_CHUNKS: Number(getEnv('QUANTUM_BUFFER_REFILL_TARGET_CHUNKS')) || 6,
  QUANTUM_PROVIDER_TIMEOUT_MS: Number(getEnv('QUANTUM_PROVIDER_TIMEOUT_MS')) || 4500,
  QUANTUM_PROVIDER_RETRY_COUNT: Number(getEnv('QUANTUM_PROVIDER_RETRY_COUNT')) || 1,
  QUANTUM_PROVIDER_RETRY_BACKOFF_MS: Number(getEnv('QUANTUM_PROVIDER_RETRY_BACKOFF_MS')) || 300,
  QUANTUM_PROVIDER_FALLBACK_ENABLED: asBool(getEnv('QUANTUM_PROVIDER_FALLBACK_ENABLED'), true),
  QUANTUM_LOG_LEVEL: getEnv('QUANTUM_LOG_LEVEL', 'warn'),
  SELF_PATCH_ENABLED: asBool(getEnv('SELF_PATCH_ENABLED'), false),
  SELF_PATCH_MODE: getEnv('SELF_PATCH_MODE', 'semi_auto'),
  SELF_PATCH_CODE_PROVIDER: getEnv('SELF_PATCH_CODE_PROVIDER', 'openai'),
  SELF_PATCH_CODE_MODEL: getEnv('SELF_PATCH_CODE_MODEL', 'gpt-5.3-codex'),
  SELF_PATCH_CODE_REASONING_EFFORT: getEnv('SELF_PATCH_CODE_REASONING_EFFORT', 'high'),
  SELF_PATCH_GENERATION_DRY_RUN: asBool(getEnv('SELF_PATCH_GENERATION_DRY_RUN'), true),
  SELF_PATCH_LOCAL_APPLY: asBool(getEnv('SELF_PATCH_LOCAL_APPLY'), false),
  SELF_PATCH_AUTORUN_ENABLED: asBool(getEnv('SELF_PATCH_AUTORUN_ENABLED'), false),
  SELF_PATCH_AUTORUN_INTERVAL_MS: Number(getEnv('SELF_PATCH_AUTORUN_INTERVAL_MS')) || 45000,
  SELF_PATCH_AUTORUN_REQUIRE_SIM_RUNNING: asBool(getEnv('SELF_PATCH_AUTORUN_REQUIRE_SIM_RUNNING'), false),
  ALLOW_CLIENT_CODEX_KEY: asBool(getEnv('ALLOW_CLIENT_CODEX_KEY'), false),
  PMIA_POST_ASC_NEGATIVE_BIAS: asBool(getEnv('PMIA_POST_ASC_NEGATIVE_BIAS'), true),
  PMIA_POST_ASC_NEGATIVE_DUTY: Number(getEnv('PMIA_POST_ASC_NEGATIVE_DUTY')) || 0.78,
  PMIA_POST_ASC_NEGATIVE_CYCLE_TICKS: Number(getEnv('PMIA_POST_ASC_NEGATIVE_CYCLE_TICKS')) || 36,
  QICN_PATCH_MAX_PROPOSALS_24H: Number(getEnv('QICN_PATCH_MAX_PROPOSALS_24H')) || 3,
  QICN_PATCH_MAX_INFLIGHT: Number(getEnv('QICN_PATCH_MAX_INFLIGHT')) || 1,
  QICN_PATCH_COOLDOWN_MIN: Number(getEnv('QICN_PATCH_COOLDOWN_MIN')) || 120,
  QICN_PATCH_TOKEN_BUDGET_DAY: Number(getEnv('QICN_PATCH_TOKEN_BUDGET_DAY')) || 100000
};

export default runtimeEnv;

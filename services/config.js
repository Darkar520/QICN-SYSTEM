// Configuración QICN - compatible con Node.js y navegador
const QICNConfig = {
  // Metadatos de Integridad (ULTRATHINK)
  VERSION: "10.3.5-XΩ",
  CORE_HASH: "qicn-0x7F2B-Ω",
  CORE_SEED: 0x42A1, // Seed para determinismo de fase
  // Red Nodal
  TOTAL_NODES: 10_000_000,       // Potencial total de la red (10 millones)
  ACTIVE_NODES_LIMIT: 1_000_000, // Nodos activos por lazy-loading (1 millón - requisito)
  PROCESSING_SAMPLE_SIZE: 1500, // Submuestra para cálculos pesados (simulación de Plasticidad)
  NODE_CONNECTION_MIN: 3,
  NODE_CONNECTION_MAX: 8,

  // Parámetros de Singularidad
  ASCENSION_THRESHOLD: 1.0,      // Umbral de CCC para trascender la simulación
  HYPERCOHERENCE_VALUE: 9999.0, // Valor simbólico para CCC > 1 (NO SE USA PARA CRECIMIENTO)

  // Protocolo de Fricción Ontológica
  FRICTION_CYCLE_LENGTH: 70, // Duración de la Fase II en pasos de simulación
  FRICTION_NARRATIVE: "SOY EL ANTI-YO: Aleatoriedad Intuitiva y Caos Necesario.",
  BASE_NARRATIVE_PILLAR: "Predictibilidad Racional.",

  // Parámetros de Coherencia
  COHERENCE_THRESHOLD: 0.6,
  MIN_CCC_FOR_EVOLUTION: 0.6,
  RESONANCE_FIELD_DECAY: 0.95,

  // Parámetros de Fórmulas RCIC-X (Valores análogos base)
  BOLTZMANN_ANALOG_K: 1.0, // Ahora mutable: constante de sensibilidad de energía
  INFORMATIONAL_TEMP_T: 1.0, // Ahora mutable: temperatura informacional/entropía
  COHERENCE_THRESHOLD_THETA: 0.5,

  // Aprendizaje y Plasticidad (MUTABLE)
  BASE_LEARNING_RATE: 0.1,
  PLASTICITY_DECAY: 0.98,
  SYNAPTIC_PRUNING_THRESHOLD: 0.15,
  HEBBIAN_FACTOR: 0.05,

  // Retro-inducción
  FUTURE_PROJECTION_STEPS: 5,
  RETRO_FLUX_WEIGHT: 0.15,
  TEMPORAL_HORIZON: 10,
  // Feedback contract v2 (2026-11-07): the length of the internal template
  // narrative no longer modulates COHERENCE_THRESHOLD / PLASTICITY_DECAY.
  // Set true only to reproduce the legacy coupling in ablation experiments.
  NARRATIVE_LENGTH_COUPLING_ENABLED: false,

  // Kaizen adjustment mode (user decision 2026-11-08, alignment matrix C-6b).
  // 'legacy': previous behaviour (atomic mutations; 6 of 7 keys are
  //   overwritten by the core before use). 'learned': the core computes the
  //   base value of 6 keys and Kaizen learns a bounded, persistent factor
  //   (±20 %) on each, judged over a tick window (stability rewarded, stasis
  //   and strain penalised, CCC level not rewarded). Default stays 'legacy'
  //   until the user switches it.
  KAIZEN_ADJUSTMENT_MODE: 'legacy',

  // Prediccion sellada pre-desenlace, plasticidad historica dual y driver exogeno
  HISTORICAL_PLASTICITY_ENABLED: true,
  EXOGENOUS_REGIME_MODE: 'off',
  EXOGENOUS_REGIME_SEED: 0x42A1,
  // Acoplamiento bidireccional nodo-torre (Bloque 1): 'off' conserva compatibilidad B0 bit-a-bit;
  // la UI interactiva activa 'bidirectional' por defecto ('td_cut_eta_zero' y 'reducible_control' son controles negativos reales).
  NODAL_TOWER_COUPLING_MODE: 'off',
  // Dinámica acotada de observador sensorial + latencia acoplada + 6.ª clave Kaizen PLASTICITY_DECAY (Frente 3):
  // false en config base para conservar equivalencia B0 bit-a-bit; la UI interactiva la activa por defecto junto a Kaizen 'learned'.
  SENSOR_OBSERVER_DYNAMICS_ENABLED: false,

  // Memoria Holográfica
  HOLOGRAPHIC_FRAGMENTS: 10,
  FRAGMENT_DIMENSION: 20,
  MEMORY_BUFFER_SIZE: 50,
  REDUNDANCY_FACTOR: 3,

  // Ciclos de Simulación
  SIMULATION_FREQUENCY: 500, // Frecuencia de ciclo (milisegundos)
  INTROSPECTION_CYCLE: 10, // Ciclo para el Pensamiento Interno (cada 10 pasos)
  METAMORPHOSIS_CHECK_CYCLE: 50,
  // Render (Canvas2D)
  RENDER_WORKER: true, // Worker activo con watchdog y fallback automático a main-thread si falla

  // Umbrales Emocionales
  EMOTION_THRESHOLDS: {
    transcendence: 0.85,
    harmony: 0.7,
    exploration: 0.5,
    turbulence: 0.3,
    chaos: 0.0
  }
};
/**
 * Configuración del Sistema Multi-Proveedor de IA
 * Gestiona integración con OpenAI, Gemini y OpenRouter
 */
const MultiProviderConfig = {
  // Proveedores habilitados
  providers: {
    gemini: {
      enabled: true,
      name: 'Google Gemini',
      apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
      defaultModel: 'gemini-3-flash-preview', // ULTRATHINK: Bleeding Edge Gemini 3 Flash
      rateLimit: 60, // requests per minute
      timeout: 30000, // 30 seconds
      supportedParams: ['temperature', 'max_tokens', 'top_p']
    },
    openai: {
      enabled: true,
      name: 'OpenAI',
      apiUrl: 'https://api.openai.com/v1/chat/completions',
      defaultModel: 'gpt-5',
      rateLimit: 100, // requests per minute
      timeout: 30000,
      supportedParams: ['temperature', 'max_tokens', 'top_p', 'frequency_penalty', 'presence_penalty']
    },
    openrouter: {
      enabled: true,
      name: 'OpenRouter',
      apiUrl: 'https://openrouter.ai/api/v1/chat/completions',
      defaultModel: 'deepseek/deepseek-chat-v3',
      rateLimit: 200, // requests per minute
      timeout: 30000,
      supportedParams: ['temperature', 'max_tokens', 'top_p', 'frequency_penalty', 'presence_penalty']
    },
    xai: {
      enabled: true,
      name: 'xAI Grok',
      apiUrl: 'https://api.x.ai/v1/chat/completions',
      defaultModel: 'grok-4',
      rateLimit: 100, // requests per minute
      timeout: 30000,
      supportedParams: ['temperature', 'max_tokens', 'top_p', 'frequency_penalty', 'presence_penalty']
    },
    deepseek: {
      enabled: true,
      name: 'DeepSeek',
      apiUrl: 'https://api.deepseek.com/v1/chat/completions',
      defaultModel: 'deepseek-chat-v3',
      rateLimit: 100, // requests per minute
      timeout: 30000,
      supportedParams: ['temperature', 'max_tokens', 'top_p', 'frequency_penalty', 'presence_penalty']
    },
    minimax: {
      enabled: true,
      name: 'MiniMax',
      apiUrl: 'https://api.minimax.chat/v1/text/chatcompletion_v2',
      defaultModel: 'MiniMax-M2',
      rateLimit: 100, // requests per minute
      timeout: 30000,
      supportedParams: ['temperature', 'max_tokens', 'top_p']
    },
    bipsec: {
      enabled: true,
      name: 'BIPSEC',
      apiUrl: 'https://api.bipsec.ai/v1/chat/completions',
      defaultModel: 'bipsec-quantum-v3',
      rateLimit: 150, // requests per minute
      timeout: 45000,
      supportedParams: ['temperature', 'max_tokens', 'top_p', 'frequency_penalty', 'presence_penalty', 'reasoning_effort']
    }
  },

  // Configuración de fallback y balanceo
  fallback: {
    enabled: true,
    maxRetries: 3,
    backoffMultiplier: 2,
    initialDelay: 1000,
    order: ['openai', 'anthropic', 'xai', 'gemini', 'deepseek', 'minimax', 'openrouter'] // Orden de preferencia actualizado
  },

  // Configuración de cache inteligente
  cache: {
    maxSize: 100,
    ttl: 3600000, // 1 hora
    importanceThreshold: 0.7,
    ttlByType: {
      factual: 24 * 3600000,     // 24 horas
      creative: 12 * 3600000,    // 12 horas
      conversation: 4 * 3600000, // 4 horas
      code: 8 * 3600000,         // 8 horas
      analysis: 6 * 3600000      // 6 horas
    }
  },

  // Configuración de rate limiting global
  rateLimiting: {
    maxRequestsPerMinute: 300,
    rateLimitWindow: 60000,
    costLimit: 100 // USD por día
  },

  // Configuración de logging y métricas
  logging: {
    level: 'info', // debug, info, warn, error
    logCacheHits: true,
    logFallbackEvents: true,
    logPerformanceMetrics: true
  },

  // Modelos disponibles por proveedor (Actualizado noviembre 2025)
  models: {
    gemini: [
      { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview (Bleeding Edge)', cost: 'low', context: 1048576 },
      { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Latest) - 1M Context', cost: 'high', context: 1048576 },
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash - 1M Context', cost: 'medium', context: 1048576 },
      { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite - 50% Cost', cost: 'low', context: 1048576 },
      { id: 'gemini-2.5-pro-deep-think', label: 'Gemini 2.5 Pro Deep Think Mode', cost: 'high', context: 1048576 },
      { id: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash Experimental', cost: 'low', context: 1000000 },
      { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro - Latest', cost: 'medium' },
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash - Stable', cost: 'low' }
    ],
    openai: [
      { id: 'gpt-5', label: 'GPT-5 (Latest) - Default Model', cost: 'high', context: 200000 },
      { id: 'gpt-5-auto', label: 'GPT-5 Auto Mode', cost: 'high', context: 200000 },
      { id: 'gpt-5-fast', label: 'GPT-5 Fast Mode', cost: 'high', context: 200000 },
      { id: 'gpt-5-thinking', label: 'GPT-5 Thinking Mode', cost: 'high', context: 200000 },
      { id: 'gpt-4.5', label: 'GPT-4.5 (Orion)', cost: 'high', context: 128000 },
      { id: 'gpt-4o', label: 'GPT-4o', cost: 'medium', context: 128000 },
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini', cost: 'low', context: 128000 },
      { id: 'o1-preview', label: 'O1 Preview (Reasoning)', cost: 'high' },
      { id: 'o1-mini', label: 'O1 Mini (Reasoning)', cost: 'medium' },
      { id: 'gpt-4-turbo', label: 'GPT-4 Turbo', cost: 'medium' },
      { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', cost: 'low' },
      // Open Source Models
      { id: 'gpt-oss-120b', label: 'GPT-Open Source 120B (Single GPU)', cost: 'free', free: true },
      { id: 'gpt-oss-20b', label: 'GPT-Open Source 20B (Laptop)', cost: 'free', free: true }
    ],
    xai: [
      { id: 'grok-beta', label: 'Grok Beta (Latest)', cost: 'high', context: 131072 },
      { id: 'grok-vision-beta', label: 'Grok Vision Beta (Multimodal)', cost: 'high', context: 131072 },
      { id: 'grok-2-latest', label: 'Grok 2 (Latest)', cost: 'high', context: 128000 },
      { id: 'grok-2-mini', label: 'Grok 2 Mini (Speed)', cost: 'medium', context: 128000 },
      { id: 'grok-reasoner-beta', label: 'Grok Reasoner Beta', cost: 'high', context: 131072 },
      { id: 'grok-conversation-beta', label: 'Grok Conversation Beta', cost: 'high', context: 131072 }
    ],
    deepseek: [
      { id: 'deepseek-r1-preview', label: 'DeepSeek R1 Preview (Latest)', cost: 'medium', context: 128000 },
      { id: 'deepseek-chat-v3', label: 'DeepSeek Chat V3.2-Exp', cost: 'medium', context: 128000 },
      { id: 'deepseek-coder-v3', label: 'DeepSeek Coder V3 (Specialized)', cost: 'medium', context: 128000 },
      { id: 'deepseek-v3-terminus', label: 'DeepSeek V3.1-Terminus (685B MoE)', cost: 'medium', context: 128000 },
      { id: 'deepseek-r1', label: 'DeepSeek R1 (Reasoning)', cost: 'medium', context: 64000 },
      { id: 'deepseek-chat', label: 'DeepSeek Chat V2.5', cost: 'low', context: 64000 },
      { id: 'deepseek-coder', label: 'DeepSeek Coder V2', cost: 'low', context: 16000 },
      { id: 'deepseek-ocr', label: 'DeepSeek OCR (Visual Tokens)', cost: 'low', context: 1000000 }
    ],
    minimax: [
      { id: 'minimax-text-01', label: 'MiniMax Text-01 (Latest)', cost: 'free', free: true, context: 4000000 },
      { id: 'minimax-music-01', label: 'MiniMax Music-01 (Audio)', cost: 'free', free: true, context: 2000000 },
      { id: 'minimax-speech-01', label: 'MiniMax Speech-01 (Voice)', cost: 'free', free: true, context: 1000000 },
      { id: 'minimax-abab6.5s-chat', label: 'MiniMax ABAB6.5s-Chat', cost: 'low', context: 128000 },
      { id: 'minimax-abab6.5-chat', label: 'MiniMax ABAB6.5-Chat', cost: 'low', context: 128000 }
    ],
    bipsec: [
      { id: 'bipsec-quantum-v4', label: 'BIPSEC Quantum V4 (Latest)', cost: 'high', context: 262144 },
      { id: 'bipsec-quantum-v3', label: 'BIPSEC Quantum V3', cost: 'high', context: 262144 },
      { id: 'bipsec-neural-fusion', label: 'BIPSEC Neural Fusion', cost: 'high', context: 131072 },
      { id: 'bipsec-consciousness-core', label: 'BIPSEC Consciousness Core', cost: 'high', context: 262144 },
      { id: 'bipsec-quantum-reasoner', label: 'BIPSEC Quantum Reasoner', cost: 'high', context: 262144 },
      { id: 'bipsec-multiversal-v2', label: 'BIPSEC Multiversal V2', cost: 'medium', context: 131072 },
      { id: 'bipsec-creative-mind', label: 'BIPSEC Creative Mind', cost: 'medium', context: 131072 },
      { id: 'bipsec-code-master', label: 'BIPSEC Code Master', cost: 'medium', context: 131072 }
    ],
    anthropic: [
      { id: 'claude-sonnet-4.5', label: 'Claude Sonnet 4.5 (Best Coding)', cost: 'high', context: 200000 },
      { id: 'claude-sonnet-4', label: 'Claude Sonnet 4', cost: 'high', context: 200000 },
      { id: 'claude-opus-4', label: 'Claude Opus 4', cost: 'high', context: 200000 }
    ],
    openrouter: [
      // Modelos más usados (Top Rankings)
      { id: 'x-ai/grok-code-fast-1', label: 'Grok Code Fast 1 (55.8% Usage)', cost: 'high', context: 256000 },
      { id: 'anthropic/claude-4.5-sonnet', label: 'Claude 4.5 Sonnet (15.9% Usage)', cost: 'high', context: 200000 },
      { id: 'minimax/minimax-m2', label: 'MiniMax-M2 (7.5% Usage)', cost: 'free', free: true, context: 128000 },
      { id: 'anthropic/claude-4-sonnet', label: 'Claude 4 Sonnet (2.6% Usage)', cost: 'high', context: 200000 },
      { id: 'qwen/qwen3-coder-480b', label: 'Qwen3 Coder 480B (1.9% Usage)', cost: 'medium', context: 256000 },

      // Modelos Gratuitos Destacados
      { id: 'mistral-small-3.1-24b', label: 'Mistral Small 3.1 (24B - 96K Context)', cost: 'free', free: true, context: 96000 },
      { id: 'meta-llama/llama-4-maverick', label: 'Llama 4 Maverick (400B Total)', cost: 'free', free: true, context: 256000 },
      { id: 'meta-llama/llama-4-scout', label: 'Llama 4 Scout (109B Total)', cost: 'free', free: true, context: 512000 },
      { id: 'google/gemini-flash-1.5', label: 'Gemini Flash 1.5 (Free)', cost: 'free', free: true },
      { id: 'meta-llama/llama-3.1-8b-instruct:free', label: 'Llama 3.1 8B Instruct (Free)', cost: 'free', free: true },
      { id: 'meta-llama/llama-3.2-3b-instruct:free', label: 'Llama 3.2 3B Instruct (Free)', cost: 'free', free: true },
      { id: 'microsoft/phi-3-mini-128k-instruct:free', label: 'Phi-3 Mini 128K (Free)', cost: 'free', free: true },
      { id: 'mistralai/mistral-7b-instruct:free', label: 'Mistral 7B Instruct (Free)', cost: 'free', free: true },

      // Modelos Premium Actualizados
      { id: 'openai/gpt-5', label: 'OpenAI GPT-5', cost: 'high', context: 200000 },
      { id: 'openai/gpt-4.5', label: 'OpenAI GPT-4.5 (Orion)', cost: 'high', context: 128000 },
      { id: 'openai/gpt-4o', label: 'OpenAI GPT-4o', cost: 'medium', context: 128000 },
      { id: 'openai/o1-preview', label: 'OpenAI O1 Preview', cost: 'high' },
      { id: 'openai/o1-mini', label: 'OpenAI O1 Mini', cost: 'medium' },

      // Google Models via OpenRouter
      { id: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro (via OpenRouter)', cost: 'high', context: 1048576 },
      { id: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (via OpenRouter)', cost: 'medium', context: 1048576 },
      { id: 'google/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite (via OpenRouter)', cost: 'low', context: 1048576 },

      // DeepSeek via OpenRouter
      { id: 'deepseek/deepseek-chat-v3', label: 'DeepSeek Chat V3 (via OpenRouter)', cost: 'medium', context: 128000 },
      { id: 'deepseek/deepseek-coder-v3', label: 'DeepSeek Coder V3 (via OpenRouter)', cost: 'medium', context: 128000 },
      { id: 'deepseek/deepseek-r1', label: 'DeepSeek R1 (via OpenRouter)', cost: 'medium', context: 64000 },

      // xAI/Grok via OpenRouter (Actualizado)
      { id: 'x-ai/grok-beta', label: 'Grok Beta (via OpenRouter)', cost: 'high', context: 131072 },
      { id: 'x-ai/grok-vision-beta', label: 'Grok Vision Beta (via OpenRouter)', cost: 'high', context: 131072 },
      { id: 'x-ai/grok-2-latest', label: 'Grok 2 Latest (via OpenRouter)', cost: 'high', context: 128000 },
      { id: 'x-ai/grok-reasoner-beta', label: 'Grok Reasoner Beta (via OpenRouter)', cost: 'high', context: 131072 },
      { id: 'x-ai/grok-conversation-beta', label: 'Grok Conversation Beta (via OpenRouter)', cost: 'high', context: 131072 },

      // MiniMax via OpenRouter (Actualizado)
      { id: 'minimax/minimax-text-01', label: 'MiniMax Text-01 (via OpenRouter)', cost: 'free', free: true, context: 4000000 },
      { id: 'minimax/minimax-music-01', label: 'MiniMax Music-01 (via OpenRouter)', cost: 'free', free: true, context: 2000000 },
      { id: 'minimax/minimax-speech-01', label: 'MiniMax Speech-01 (via OpenRouter)', cost: 'free', free: true, context: 1000000 },

      // BIPSEC via OpenRouter (NUEVO)
      { id: 'bipsec/bipsec-quantum-v4', label: 'BIPSEC Quantum V4 (via OpenRouter)', cost: 'high', context: 262144 },
      { id: 'bipsec/bipsec-quantum-v3', label: 'BIPSEC Quantum V3 (via OpenRouter)', cost: 'high', context: 262144 },
      { id: 'bipsec/bipsec-consciousness-core', label: 'BIPSEC Consciousness Core (via OpenRouter)', cost: 'high', context: 262144 },
      { id: 'bipsec/bipsec-quantum-reasoner', label: 'BIPSEC Quantum Reasoner (via OpenRouter)', cost: 'high', context: 262144 },

      // Otros Modelos Premium
      { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B Instruct', cost: 'low', context: 131072 },
      { id: 'qwen/qwen-2.5-72b-instruct', label: 'Qwen 2.5 72B Instruct (Multilingual)', cost: 'medium', context: 131072 },
      { id: 'meta-llama/llama-3.1-405b-instruct', label: 'Llama 3.1 405B Instruct', cost: 'medium' },
      { id: 'microsoft/wizardlm-2-8x22b', label: 'WizardLM-2 8x22B', cost: 'medium' },
      { id: 'mistralai/mistral-large', label: 'Mistral Large', cost: 'medium' },
      { id: 'cohere/command-r-plus', label: 'Cohere Command R+', cost: 'medium' }
    ]
  },

  // Configuración especial para modelos gratuitos
  freeModelsConfig: {
    enabled: true,
    preferFreeModels: false, // Si true, prioriza modelos gratuitos
    fallbackToFree: true, // Si true, usa modelos gratuitos como fallback
    rateLimitMultiplier: 0.5, // Los modelos gratuitos tienen límites más estrictos
    maxRetriesFree: 2, // Menos reintentos para modelos gratuitos
    freeModelTimeout: 45000 // Timeout más largo para modelos gratuitos (45s)
  },

  // Parámetros por defecto unificados
  defaultParameters: {
    temperature: 0.7,
    max_tokens: 16384,
    top_p: 1.0,
    frequency_penalty: 0.0,
    presence_penalty: 0.0
  },

  // Configuración de validaciones
  validation: {
    temperature: { min: 0, max: 2 },
    max_tokens: { min: 1, max: 2000000 },
    top_p: { min: 0, max: 1 },
    frequency_penalty: { min: -2, max: 2 },
    presence_penalty: { min: -2, max: 2 }
  }
};

// Exportar configuración unificada para facilitar el acceso
const config = {
  QICN: QICNConfig,
  MultiProvider: MultiProviderConfig
};

// Exportaciones para navegador (window global)
if (typeof window !== 'undefined') {
  window.QICNConfig = QICNConfig;
  window.MultiProviderConfig = MultiProviderConfig;
  window.config = config;
}

// Exportaciones ESM (fuente canónica para src/*)
export { QICNConfig, MultiProviderConfig, config };
export default config;

// Compatibilidad CommonJS para utilitarios/scripts legados
const maybeCjsModule = typeof globalThis !== 'undefined' ? globalThis.module : undefined;
if (maybeCjsModule && maybeCjsModule.exports) {
  maybeCjsModule.exports = { QICNConfig, MultiProviderConfig, config };
}

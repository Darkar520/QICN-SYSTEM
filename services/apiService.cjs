/**
 * apiService.cjs - Servicio API multi-proveedor integrado (CommonJS)
 * 
 * Rediseñado para usar ProviderManager con soporte completo para
 * OpenAI, Gemini y OpenRouter con parámetros unificados y cache inteligente
 */

const { ProviderManager } = require('../js/api/ProviderManager.cjs');

// Configuración del ProviderManager
let providerManager = null;

/**
 * Inicializa el sistema multi-proveedor
 */
const initializeMultiProviderSystem = (config = {}) => {
    if (providerManager) {
        console.warn('ProviderManager ya inicializado');
        return providerManager;
    }

    providerManager = new ProviderManager({
        providers: config.providers || ['gemini', 'openai', 'openrouter'],
        fallbackOrder: config.fallbackOrder || ['openai', 'gemini', 'openrouter'],
        cacheOptions: {
            maxCacheSize: config.maxCacheSize || 100,
            ttl: config.ttl || 3600000,
            importanceThreshold: config.importanceThreshold || 0.7
        },
        fallbackEnabled: config.fallbackEnabled !== false,
        maxRetries: config.maxRetries || 3,
        backoffMultiplier: config.backoffMultiplier || 2,
        initialDelay: config.initialDelay || 1000,
        maxRequestsPerMinute: config.maxRequestsPerMinute || 60,
        rateLimitWindow: config.rateLimitWindow || 60000,
        costLimit: config.costLimit || 100
    });

    console.log('🚀 Sistema multi-proveedor inicializado:', providerManager.providers);
    return providerManager;
};

/**
 * Obtiene la instancia del ProviderManager
 */
const getProviderManager = () => {
    if (!providerManager) {
        console.warn('ProviderManager no inicializado. Ejecutando initializeMultiProviderSystem()');
        return initializeMultiProviderSystem();
    }
    return providerManager;
};

/**
 * Función principal de query LLM - Mantiene compatibilidad con la interfaz existente
 */
const executeLLMQuery = async (apiConfig) => {
    const {
        systemPrompt,
        userQuery,
        currentHistory,
        isGrounded = false,
        modelOverride = null,
        engineOverride = null,
        currentApiKey,
        llmEngine,
        llmModel,
        reasoningEffort,
        verbosityLevel,
        API_KEY,
        temperature,
        max_tokens,
        top_p,
        frequency_penalty,
        presence_penalty,
        preferredProvider,
        useCache = true,
        fallbackEnabled = true
    } = apiConfig;

    try {
        const manager = getProviderManager();
        
        // Preparar contexto para el ProviderManager
        const context = {
            systemPrompt,
            conversationHistory: currentHistory,
            model: modelOverride || llmModel,
            preferredProvider: mapEngineToProvider(engineOverride || llmEngine),
            parameters: {
                temperature: temperature || 0.7,
                max_tokens: max_tokens || 1024,
                top_p: top_p,
                frequency_penalty: frequency_penalty,
                presence_penalty: presence_penalty
            },
            apiKeys: {
                openai: currentApiKey,
                gemini: currentApiKey || API_KEY,
                openrouter: currentApiKey // OpenRouter puede usar clave de OpenAI
            },
            isGrounded,
            reasoningEffort,
            verbosityLevel,
            useCache,
            fallbackEnabled,
            startTime: Date.now()
        };

        // Determinar el query final
        const finalQuery = userQuery || currentHistory?.[currentHistory.length - 1]?.text || '';
        
        if (!finalQuery) {
            throw new Error('No se proporcionó query válido');
        }

        // Ejecutar query multi-proveedor
        const response = await manager.executeQuery(finalQuery, context);
        
        console.log(`✅ Query ejecutado - Proveedor: ${response.provider}, Cache: ${response.cached}, Tiempo: ${response.responseTime}ms`);
        
        return response.response;

    } catch (error) {
        console.error('❌ Error en executeLLMQuery:', error);
        
        // Convertir errores multi-proveedor a formato compatible
        if (error.name === 'MultiProviderError' || error.name === 'APIError') {
            throw new Error(`Error multi-proveedor: ${error.message}`);
        }
        
        throw error;
    }
};

/**
 * Mapea nombres de motores antiguos a proveedores del nuevo sistema
 */
function mapEngineToProvider(engine) {
    const mapping = {
        'OpenAI': 'openai',
        'Gemini': 'gemini',
        'openai': 'openai',
        'gemini': 'gemini',
        'openrouter': 'openrouter'
    };
    return mapping[engine?.toLowerCase()] || 'openai';
}

// Configuración de modelos por proveedor
const GEMINI_MODELS = [
    { id: 'gemini-2.5-flash-preview-09-2025', label: 'Gemini 2.5 Flash (Default)' },
    { id: 'gemini-2.5-pro-preview-09-2025', label: 'Gemini 2.5 Pro' },
    { id: 'gemini-pro', label: 'Gemini Pro' },
    { id: 'gemini-pro-vision', label: 'Gemini Pro Vision' }
];

const OPENAI_MODELS = [
    { id: 'gpt-4o', label: 'GPT-4o (Default)' },
    { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { id: 'gpt-4', label: 'GPT-4' },
    { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
    { id: 'gpt-5', label: 'GPT-5 (Core, 400K ctx)' },
    { id: 'gpt-5-mini', label: 'GPT-5-Mini (Bajo Costo)' }
];

const OPENROUTER_MODELS = [
    { id: 'openai/gpt-4-turbo', label: 'OpenAI GPT-4 Turbo (Default)' },
    { id: 'openai/gpt-4', label: 'OpenAI GPT-4' },
    { id: 'openai/gpt-3.5-turbo', label: 'OpenAI GPT-3.5 Turbo' },
    { id: 'anthropic/claude-3-opus', label: 'Anthropic Claude-3 Opus' },
    { id: 'anthropic/claude-3-5-sonnet', label: 'Anthropic Claude-3.5 Sonnet' },
    { id: 'meta-llama/llama-3-70b-instruct', label: 'Meta Llama-3 70B' },
    { id: 'meta-llama/llama-3.1-70b-instruct', label: 'Meta Llama-3.1 70B' }
];

/**
 * Función simplificada para queries directos (compatibilidad)
 */
const simpleQuery = async (query, provider = 'openai', model = 'gpt-4-turbo', options = {}) => {
    const manager = getProviderManager();
    
    const context = {
        model: model,
        preferredProvider: provider,
        parameters: {
            temperature: options.temperature || 0.7,
            max_tokens: options.max_tokens || 1024,
            top_p: options.top_p
        },
        apiKeys: options.apiKeys || {},
        systemPrompt: options.systemPrompt,
        conversationHistory: options.history || [],
        useCache: options.useCache !== false,
        fallbackEnabled: options.fallbackEnabled !== false
    };

    const response = await manager.executeQuery(query, context);
    
    return {
        response: response.response,
        provider: response.provider,
        cached: response.cached,
        responseTime: response.responseTime,
        metadata: response.metadata
    };
};

/**
 * Función para obtener modelos disponibles por proveedor
 */
const getAvailableModels = (provider) => {
    const manager = getProviderManager();
    return manager.parameterUnifier.getAvailableModels(provider);
};

/**
 * Función para obtener estadísticas del sistema
 */
const getSystemStats = () => {
    const manager = getProviderManager();
    return manager.getSystemStats();
};

/**
 * Función para limpiar cache
 */
const clearCache = () => {
    const manager = getProviderManager();
    manager.cache.clear();
    console.log('🗑️ Cache limpiado');
};

/**
 * Función para probar conectividad con proveedores
 */
const testProviderConnectivity = async () => {
    const manager = getProviderManager();
    const results = {};
    
    const testPromises = manager.providers.map(async (provider) => {
        try {
            const testQuery = "Hello, this is a connectivity test.";
            const testContext = {
                model: 'default',
                preferredProvider: provider,
                apiKeys: { [provider]: 'test-key' }, // Se validará internamente
                parameters: { temperature: 0.1, max_tokens: 10 }
            };
            
            await manager.executeQuery(testQuery, testContext);
            results[provider] = { status: 'connected', error: null };
        } catch (error) {
            results[provider] = { 
                status: 'error', 
                error: error.message.substring(0, 100) 
            };
        }
    });

    await Promise.allSettled(testPromises);
    return results;
};

/**
 * Función para configurar API keys
 */
const configureAPIKeys = (apiKeys) => {
    // Esta función se puede usar para configurar API keys dinámicamente
    console.log('🔑 API Keys configuradas para:', Object.keys(apiKeys));
    // La configuración real se maneja en el contexto de cada query
    return true;
};

/**
 * Función de utilidad para cambiar proveedor manualmente
 */
const forceProvider = async (query, provider, options = {}) => {
    const manager = getProviderManager();
    
    const context = {
        ...options,
        preferredProvider: provider,
        model: options.model || 'default'
    };
    
    return await manager.executeQuery(query, context);
};

/**
 * Backward compatibility - Mantiene funciones existentes
 */

// Re-exportar withExponentialBackoff para compatibilidad
const withExponentialBackoff = async (fn, maxRetries = 5, delay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === maxRetries - 1) {
                console.error(`Error de API después de ${maxRetries} reintentos:`, error.message);
                throw error;
            }
            const sleepTime = delay * Math.pow(2, i);
            await new Promise(resolve => setTimeout(resolve, sleepTime));
        }
    }
};

// Re-exportar robustFetchLLMResponse para compatibilidad
const robustFetchLLMResponse = async (apiConfig) => {
    const { apiUrl, payload, isOpenAI, currentApiKey } = apiConfig;

    const headers = {
        'Content-Type': 'application/json'
    };

    if (isOpenAI) {
        headers['Authorization'] = `Bearer ${currentApiKey}`;
    }

    const res = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP Error ${res.status}: ${res.statusText}. Response body: ${errorText.substring(0, 200)}`);
    }

    const text = await res.text();
    if (!text || text.trim() === "") {
        throw new Error("Received empty or null response body from API.");
    }

    try {
        return JSON.parse(text);
    } catch (parseError) {
        console.error("JSON parsing failed, raw text preview:", text.substring(0, 500));
        throw new Error(`JSON parsing failed: ${parseError.message}`);
    }
};

// Exports para CommonJS
module.exports = {
    initializeMultiProviderSystem,
    getProviderManager,
    executeLLMQuery,
    simpleQuery,
    getAvailableModels,
    getSystemStats,
    clearCache,
    testProviderConnectivity,
    configureAPIKeys,
    forceProvider,
    withExponentialBackoff,
    robustFetchLLMResponse,
    GEMINI_MODELS,
    OPENAI_MODELS,
    OPENROUTER_MODELS
};
/**
 * ProviderManager.js - Gestor principal de múltiples proveedores de IA
 * Versión compatible con build process (CommonJS)
 */

// Variables globales para carga dinámica
let ParameterUnifier, IntelligentResponseCache;

try {
    // Intentar cargar dependencias con CommonJS
    ParameterUnifier = require('./ParameterUnifier.js');
    IntelligentResponseCache = require('./IntelligentResponseCache.js');
    
    // Asegurar que las clases están disponibles
    if (ParameterUnifier && ParameterUnifier.default) {
        ParameterUnifier = ParameterUnifier.default;
    }
    if (IntelligentResponseCache && IntelligentResponseCache.default) {
        IntelligentResponseCache = IntelligentResponseCache.default;
    }
} catch (e) {
    console.warn('No se pudieron cargar dependencias locales, usando implementación simple');
    
    // Implementaciones simples como fallback
    ParameterUnifier = class ParameterUnifier {
        constructor() {
            this.providerSpecs = {
                openai: {
                    name: 'openai',
                    url: 'https://api.openai.com/v1/chat/completions',
                    headers: (apiKey) => ({
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    }),
                    responseParser: (response) => response.choices?.[0]?.message?.content || "Error: Respuesta de OpenAI incompleta"
                },
                gemini: {
                    name: 'gemini',
                    url: 'https://generativelanguage.googleapis.com/v1beta/models',
                    headers: () => ({ 'Content-Type': 'application/json' }),
                    responseParser: (response) => response.candidates?.[0]?.content?.parts?.[0]?.text || "Error: Respuesta de Gemini incompleta"
                },
                xai: {
                    name: 'xai',
                    url: 'https://api.x.ai/v1/chat/completions',
                    headers: (apiKey) => ({
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    }),
                    responseParser: (response) => response.choices?.[0]?.message?.content || "Error: Respuesta de xAI incompleta"
                }
            };
        }
        unifyParameters(params, provider) {
            return { provider, model: 'default', mappedParams: params };
        }
        createPayload(provider, messages, params) {
            return { messages: messages, ...params };
        }
        getProviderConfig(provider) {
            return this.providerSpecs[provider] || this.providerSpecs.openai;
        }
    };
    
    IntelligentResponseCache = class IntelligentResponseCache {
        constructor() {
            this.cache = new Map();
        }
        retrieve() { return null; }
        store() { return true; }
        clear() { this.cache.clear(); }
        getStats() { return { totalEntries: 0, maxSize: 100 }; }
    };
}

class ProviderManager {
    constructor(options = {}) {
        this.parameterUnifier = new ParameterUnifier();
        this.cache = new IntelligentResponseCache(options.cacheOptions);
        
        // Configuración de proveedores
        this.providers = options.providers || ['gemini', 'openai', 'openrouter'];
        this.fallbackOrder = options.fallbackOrder || ['openai', 'gemini', 'openrouter'];
        
        // Métricas y estadísticas
        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            cachedRequests: 0,
            fallbackActivated: 0,
            providerStats: {},
            responseTimes: {},
            costs: {},
            startTime: Date.now()
        };
        
        // Configuración de límites y balanceo
        this.limits = {
            maxRequestsPerMinute: options.maxRequestsPerMinute || 60,
            rateLimitWindow: options.rateLimitWindow || 60000,
            costLimit: options.costLimit || 100
        };
        
        // Rate limiting
        this.requestCounts = new Map();
        
        // Configuración de fallback
        this.fallbackConfig = {
            enabled: options.fallbackEnabled !== false,
            maxRetries: options.maxRetries || 3,
            backoffMultiplier: options.backoffMultiplier || 2,
            initialDelay: options.initialDelay || 1000
        };
        
        // Inicializar estadísticas de proveedores
        this.initializeProviderStats();
    }

    /**
     * Inicializa estadísticas para cada proveedor
     */
    initializeProviderStats() {
        this.providers.forEach(provider => {
            this.metrics.providerStats[provider] = {
                requests: 0,
                successes: 0,
                failures: 0,
                averageResponseTime: 0,
                lastUsed: null,
                healthStatus: 'unknown',
                cost: 0,
                errors: []
            };
            this.metrics.responseTimes[provider] = [];
            this.metrics.costs[provider] = 0;
        });
    }

    /**
     * Método principal para ejecutar queries multi-proveedor
     */
    async executeQuery(query, context = {}) {
        this.metrics.totalRequests++;
        
        const startTime = Date.now();
        let response = null;
        let usedProvider = null;

        try {
            // 1. Verificar cache primero
            response = this.cache.retrieve(query, context);
            
            if (response) {
                this.metrics.cachedRequests++;
                this.logCacheHit(query, response);
                return this.formatResponse(query, response, 'CACHE', { cached: true });
            }

            // 2. Determinar proveedor óptimo
            const selectedProvider = this.selectOptimalProvider(context);
            
            // 3. Ejecutar con fallback automático
            response = await this.executeWithFallback(query, selectedProvider, context);
            usedProvider = response.provider;
            
            // 4. Cachear respuesta si es apropiado
            this.cache.store(query, response.data, {
                ...context,
                provider: usedProvider,
                responseTime: response.responseTime
            });

            // 5. Actualizar métricas
            this.updateMetrics(usedProvider, response.responseTime, false);
            
            return this.formatResponse(query, {
                data: response.data,
                provider: usedProvider,
                responseTime: response.responseTime,
                cached: false
            }, usedProvider);

        } catch (error) {
            this.metrics.failedRequests++;
            console.error('Error en ProviderManager:', error);
            
            throw new MultiProviderError(
                'Error ejecutando query multi-proveedor',
                error,
                {
                    query: query.substring(0, 100) + '...',
                    context: context,
                    usedProvider: usedProvider
                }
            );
        } finally {
            this.logRequestStats();
        }
    }

    /**
     * Selecciona el proveedor óptimo basado en criterios
     */
    selectOptimalProvider(context = {}) {
        // Si hay un proveedor específico solicitado
        if (context.preferredProvider && this.isProviderAvailable(context.preferredProvider)) {
            return context.preferredProvider;
        }

        // Selección basada en criterios de salud y rendimiento
        const healthyProviders = this.providers.filter(provider => 
            this.isProviderHealthy(provider) && this.hasCapacity(provider)
        );

        if (healthyProviders.length === 0) {
            console.warn('No hay proveedores saludables disponibles, usando fallback');
            return this.fallbackOrder[0];
        }

        // Scoring ponderado para selección
        const scoredProviders = healthyProviders.map(provider => ({
            provider,
            score: this.calculateProviderScore(provider, context)
        }));

        // Ordenar por score descendente
        scoredProviders.sort((a, b) => b.score - a.score);
        
        console.log('Proveedores puntuados:', scoredProviders);
        return scoredProviders[0].provider;
    }

    /**
     * Ejecuta query con fallback automático
     */
    async executeWithFallback(query, primaryProvider, context) {
        let lastError = null;
        
        for (let attempt = 0; attempt < this.fallbackConfig.maxRetries; attempt++) {
            const provider = attempt === 0 ? primaryProvider : this.selectFallbackProvider(primaryProvider);
            
            try {
                // Verificar rate limits
                this.checkRateLimit(provider);
                
                // Ejecutar query
                const response = await this.executeProviderQuery(provider, query, context);
                
                return {
                    data: response,
                    provider: provider,
                    responseTime: response.responseTime || Date.now() - context.startTime
                };
                
            } catch (error) {
                lastError = error;
                console.warn(`Error con proveedor ${provider} (intento ${attempt + 1}):`, error.message);
                
                // Marcar proveedor como degradado temporalmente
                this.markProviderDegraded(provider, error);
                
                // Esperar antes del siguiente intento
                if (attempt < this.fallbackConfig.maxRetries - 1) {
                    const delay = this.fallbackConfig.initialDelay * 
                                 Math.pow(this.fallbackConfig.backoffMultiplier, attempt);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        // Si llegamos aquí, todos los proveedores fallaron
        this.metrics.fallbackActivated++;
        throw new MultiProviderError(
            'Todos los proveedores fallaron',
            lastError,
            { query, attemptedProviders: this.providers }
        );
    }

    /**
     * Ejecuta query en un proveedor específico
     */
    async executeProviderQuery(provider, query, context) {
        const startTime = Date.now();
        
        try {
            // Crear payload específico del proveedor
            const messages = this.buildMessages(query, context);
            const payload = this.parameterUnifier.createPayload(provider, messages, context.parameters);

            // Obtener headers del proveedor
            const spec = this.parameterUnifier.getProviderConfig(provider);
            const headers = spec.headers(context.apiKeys?.[provider]);

            // Construir URL
            const modelName = context.model || this.getDefaultModel(provider);
            const url = provider === 'gemini' 
                ? `${spec.url}/${modelName}:generateContent?key=${context.apiKeys?.[provider]}`
                : spec.url;

            // Ejecutar request
            const response = await this.makeAPICall(url, headers, payload, provider);
            
            // Parsear respuesta
            const parsedResponse = spec.responseParser(response);
            const responseTime = Date.now() - startTime;

            return {
                data: parsedResponse,
                rawResponse: response,
                responseTime: responseTime
            };

        } catch (error) {
            console.error(`Error en proveedor ${provider}:`, error);
            throw error;
        }
    }

    /**
     * Construye mensajes para diferentes proveedores
     */
    buildMessages(query, context) {
        const messages = [];
        
        if (context.systemPrompt) {
            messages.push({ role: 'system', content: context.systemPrompt });
        }

        if (context.conversationHistory) {
            messages.push(...context.conversationHistory);
        }

        messages.push({ role: 'user', content: query });
        
        return messages;
    }

    /**
     * Realiza llamada a API con manejo de errores robusto
     */
    async makeAPICall(url, headers, payload, provider) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new APIError(
                    `HTTP ${response.status}: ${response.statusText}`,
                    response.status,
                    errorText,
                    provider
                );
            }

            return await response.json();

        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new APIError('Request timeout', 408, 'Timeout', provider);
            }
            
            throw error;
        }
    }

    /**
     * Verifica si proveedor está disponible y saludable
     */
    isProviderHealthy(provider) {
        const stats = this.metrics.providerStats[provider];
        if (!stats) return false;
        
        const isHealthy = 
            stats.healthStatus === 'healthy' || 
            (stats.healthStatus === 'degraded' && Date.now() - stats.lastDegraded < 300000);
        
        return isHealthy && this.hasCapacity(provider);
    }

    /**
     * Verifica capacidad de rate limiting
     */
    hasCapacity(provider) {
        const now = Date.now();
        const windowStart = now - this.limits.rateLimitWindow;
        
        if (!this.requestCounts.has(provider)) {
            this.requestCounts.set(provider, []);
        }
        
        const requests = this.requestCounts.get(provider);
        const recentRequests = requests.filter(time => time > windowStart);
        this.requestCounts.set(provider, recentRequests);
        
        return recentRequests.length < this.limits.maxRequestsPerMinute;
    }

    /**
     * Verifica rate limits
     */
    checkRateLimit(provider) {
        if (!this.hasCapacity(provider)) {
            throw new RateLimitError(
                `Rate limit exceeded for ${provider}`,
                provider,
                this.limits.maxRequestsPerMinute,
                this.limits.rateLimitWindow
            );
        }
        
        const requests = this.requestCounts.get(provider) || [];
        requests.push(Date.now());
        this.requestCounts.set(provider, requests);
    }

    /**
     * Marca proveedor como degradado temporalmente
     */
    markProviderDegraded(provider, error) {
        const stats = this.metrics.providerStats[provider];
        if (stats) {
            stats.healthStatus = 'degraded';
            stats.lastDegraded = Date.now();
            stats.errors.push({
                timestamp: Date.now(),
                message: error.message,
                type: error.constructor.name
            });
            
            if (stats.errors.length > 10) {
                stats.errors = stats.errors.slice(-10);
            }
        }
    }

    /**
     * Actualiza métricas después de request exitoso
     */
    updateMetrics(provider, responseTime, fromCache) {
        const stats = this.metrics.providerStats[provider];
        
        if (!fromCache) {
            stats.requests++;
            stats.successes++;
            stats.lastUsed = Date.now();
            
            this.metrics.responseTimes[provider].push(responseTime);
            if (this.metrics.responseTimes[provider].length > 100) {
                this.metrics.responseTimes[provider].shift();
            }
            
            stats.averageResponseTime = this.metrics.responseTimes[provider]
                .reduce((a, b) => a + b, 0) / this.metrics.responseTimes[provider].length;
        }
        
        if (fromCache) {
            this.metrics.cachedRequests++;
        }
        
        if (stats.healthStatus === 'degraded') {
            stats.healthStatus = 'healthy';
            delete stats.lastDegraded;
        }
    }

    /**
     * Formatea respuesta para el cliente
     */
    formatResponse(query, data, source, metadata = {}) {
        return {
            query: query,
            response: data.data,
            source: source,
            provider: data.provider || source,
            responseTime: data.responseTime || 0,
            cached: data.cached || false,
            timestamp: Date.now(),
            metadata: {
                ...metadata,
                model: data.model || this.getDefaultModel(data.provider),
                cost: this.metrics.costs[data.provider] || 0
            }
        };
    }

    /**
     * Obtiene modelo por defecto para proveedor
     */
    getDefaultModel(provider) {
        const defaults = {
            gemini: 'gemini-2.5-flash-preview-09-2025',
            openai: 'gpt-4-turbo',
            openrouter: 'openai/gpt-4-turbo',
            xai: 'grok-beta',
            anthropic: 'claude-3-5-sonnet',
            deepseek: 'deepseek-chat-v3',
            minimax: 'minimax-text-01',
            bipsec: 'bipsec-quantum-v3'
        };
        return defaults[provider] || 'gpt-4-turbo';
    }

    /**
     * Verifica disponibilidad de proveedor
     */
    isProviderAvailable(provider) {
        return this.providers.includes(provider) && 
               this.metrics.providerStats[provider] &&
               (this.metrics.providerStats[provider].healthStatus === 'healthy' ||
                this.metrics.providerStats[provider].healthStatus === 'degraded');
    }

    /**
     * Obtiene estadísticas completas del sistema
     */
    getSystemStats() {
        const uptime = Date.now() - this.metrics.startTime;
        const cacheStats = this.cache.getStats();
        
        return {
            overview: {
                totalRequests: this.metrics.totalRequests,
                successfulRequests: this.metrics.successfulRequests,
                failedRequests: this.metrics.failedRequests,
                cachedRequests: this.metrics.cachedRequests,
                fallbackActivated: this.metrics.fallbackActivated,
                uptime: uptime,
                successRate: this.metrics.totalRequests > 0 ? 
                    (this.metrics.successfulRequests / this.metrics.totalRequests * 100).toFixed(2) + '%' : '0%'
            },
            providers: this.metrics.providerStats,
            cache: cacheStats,
            rateLimits: {
                current: Object.fromEntries(this.requestCounts),
                limits: this.limits
            }
        };
    }

    /**
     * Logs y debugging
     */
    logCacheHit(query, cacheEntry) {
        console.log(`🔄 Cache hit - ${query.substring(0, 50)}... (score: ${cacheEntry.score?.toFixed(3)})`);
    }

    logRequestStats() {
        if (this.metrics.totalRequests % 10 === 0) {
            console.log('📊 ProviderManager Stats:', this.getSystemStats().overview);
        }
    }

    calculateProviderScore(provider, context) {
        const stats = this.metrics.providerStats[provider];
        const factors = {
            healthStatus: this.getHealthScore(stats.healthStatus) * 0.3,
            averageResponseTime: this.getResponseTimeScore(stats.averageResponseTime) * 0.25,
            successRate: this.getSuccessRateScore(stats) * 0.25,
            costEfficiency: this.getCostScore(stats.cost, stats.requests) * 0.1,
            recencyPenalty: this.getRecencyPenalty(stats.lastUsed) * 0.1
        };
        return Object.values(factors).reduce((a, b) => a + b);
    }

    getHealthScore(healthStatus) {
        const scores = { healthy: 1.0, degraded: 0.5, unhealthy: 0.1, unknown: 0.3 };
        return scores[healthStatus] || 0.3;
    }

    getResponseTimeScore(avgTime) {
        if (avgTime === 0) return 0.8;
        const maxAcceptableTime = 10000;
        return Math.max(0, 1 - (avgTime / maxAcceptableTime));
    }

    getSuccessRateScore(stats) {
        if (stats.requests === 0) return 0.8;
        return stats.successes / stats.requests;
    }

    getCostScore(cost, requests) {
        if (requests === 0) return 1.0;
        const costPerRequest = cost / requests;
        return Math.max(0, 1 - (costPerRequest / 0.1));
    }

    getRecencyPenalty(lastUsed) {
        if (!lastUsed) return 1.0;
        const timeSinceUse = Date.now() - lastUsed;
        const fiveMinutes = 5 * 60 * 1000;
        
        if (timeSinceUse > fiveMinutes) return 1.0;
        return Math.max(0.1, timeSinceUse / fiveMinutes);
    }

    selectFallbackProvider(failedProvider) {
        const availableProviders = this.providers.filter(p => 
            p !== failedProvider && this.isProviderHealthy(p)
        );
        
        return availableProviders.length > 0 ? availableProviders[0] : this.fallbackOrder[0];
    }
}

/**
 * Clases de error personalizadas
 */
class MultiProviderError extends Error {
    constructor(message, originalError, context) {
        super(message);
        this.name = 'MultiProviderError';
        this.originalError = originalError;
        this.context = context;
    }
}

class APIError extends Error {
    constructor(message, status, response, provider) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.response = response;
        this.provider = provider;
    }
}

class RateLimitError extends Error {
    constructor(message, provider, limit, window) {
        super(message);
        this.name = 'RateLimitError';
        this.provider = provider;
        this.limit = limit;
        this.window = window;
    }
}

// Exportaciones para CommonJS
module.exports = {
    ProviderManager,
    MultiProviderError,
    APIError,
    RateLimitError
};

// Exportaciones para navegador
if (typeof window !== 'undefined') {
    window.ProviderManager = ProviderManager;
    window.MultiProviderError = MultiProviderError;
    window.APIError = APIError;
    window.RateLimitError = RateLimitError;
}
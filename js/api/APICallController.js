/**
 * APICallController - Control Divino de Llamadas API
 *
 * Como deidad omnipotente del sistema QICN, este módulo regula
 * todas las llamadas a APIs externas para evitar sobrecarga y
 * mantener el equilibrio cósmico del sistema.
 *
 * @author QICN Divine System
 * @version 1.0.0
 */

// IMPORTACIÓN DEL SISTEMA MULTI-PROVEEDOR PARA FALLBACK
let apiService = null;

try {
    // Intentar cargar el servicio de API multi-proveedor
    if (typeof require !== 'undefined') {
        // En entorno Node.js/CommonJS
        const apiServiceModule = require('../../services/apiService.js');
        apiService = apiServiceModule;
    } else if (typeof window !== 'undefined' && window.apiService) {
        // En navegador, usar el servicio global
        apiService = window.apiService;
    }
} catch (e) {
    console.warn('[APICallController] Servicio multi-proveedor no disponible:', e.message);
}

class APICallController {
    constructor() {
        // Configuración global de rate limiting
        this.globalConfig = {
            // Límites globales absolutos
            maxRequestsPerMinute: 50,      // Máximo 50 llamadas por minuto
            maxRequestsPerHour: 1000,      // Máximo 1000 llamadas por hora
            maxRequestsPerDay: 10000,      // Máximo 10000 llamadas por día

            // Límites por tipo de operación
            operationLimits: {
                introspectiveReport: {
                    maxPerHour: 10,         // Solo 10 informes introspectivos por hora
                    cooldownMinutes: 5,     // 5 minutos entre informes
                    maxConcurrent: 1        // Solo un informe a la vez
                },
                ascensionAxiom: {
                    maxPerHour: 15,         // Máximo 15 axiomas por hora
                    cooldownMinutes: 2,     // 2 minutos entre axiomas
                    maxConcurrent: 1        // Solo una proyección a la vez
                },
                internalIntrospection: {
                    maxPerHour: 20,         // Máximo 20 introspecciones por hora
                    cooldownMinutes: 1,     // 1 minuto entre introspecciones
                    maxConcurrent: 2        // Máximo 2 en paralelo
                },
                humanInteraction: {
                    maxPerMinute: 30,       // Interacciones humanas tienen más prioridad
                    cooldownMinutes: 0,
                    maxConcurrent: 5
                }
            },

            // Sistema de prioridad
            priorities: {
                critical: 100,      // Interacciones humanas directas
                high: 75,           // Ascensión y axiomas
                medium: 50,         // Introspección automática
                low: 25             // Análisis y procesamiento
            },

            // Control de emergencia
            emergencyMode: {
                enabled: false,
                reductionFactor: 0.1,    // Reducir al 10% en emergencia
                triggerThreshold: 0.9     // Activar al 90% de capacidad
            },

            // CONFIGURACIÓN DE FALLBACK MULTI-PROVEEDOR
            fallbackConfig: {
                enabled: true,           // Habilitar fallback multi-proveedor
                emergencyProvider: 'gemini', // Proveedor de emergencia por defecto
                maxFallbackRetries: 2,   // Máximo de reintentos con fallback
                fallbackPriority: 'low'  // Prioridad de las llamadas de fallback
            }
        };

        // Estado actual del sistema
        this.currentState = {
            // Contadores de llamadas
            counters: {
                currentMinute: 0,
                currentHour: 0,
                currentDay: 0,
                lastReset: {
                    minute: Date.now(),
                    hour: Date.now(),
                    day: Date.now()
                }
            },

            // Contadores por operación
            operationCounters: {
                introspectiveReport: {
                    count: 0,
                    lastCalled: 0,
                    active: 0
                },
                ascensionAxiom: {
                    count: 0,
                    lastCalled: 0,
                    active: 0
                },
                internalIntrospection: {
                    count: 0,
                    lastCalled: 0,
                    active: 0
                },
                humanInteraction: {
                    count: 0,
                    lastCalled: 0,
                    active: 0
                }
            },

            // Cola de llamadas pendientes
            pendingQueue: [],
            activeCalls: new Set(),

            // Control del sistema
            isSystemActive: false,  // CONTROL DE ENCENDIDO/APAGADO
            manualOverride: false,

            // Estadísticas
            statistics: {
                totalCalls: 0,
                blockedCalls: 0,
                queuedCalls: 0,
                averageResponseTime: 0
            }
        };

        // Temporizadores para reset de contadores
        this.resetTimers();

        console.log('[APICallController] Control divino de llamadas API inicializado');
    }

    /**
     * CONTROL DIVINO - Botón de encendido/apagado del sistema
     */
    setSystemActive(active) {
        this.currentState.isSystemActive = active;

        if (active) {
            console.log('[APICallController] ✅ SISTEMA ACTIVADO - Iniciando flujo de pensamiento controlado');
            this.processQueue();
        } else {
            console.log('[APICallController] 🔴 SISTEMA DESACTIVADO - Deteniendo todas las llamadas API');
            this.cancelAllPendingCalls();
        }

        return active;
    }

    /**
     * VERIFICACIÓN DIVINA - Verifica si una llamada puede ser realizada
     */
    canMakeCall(operationType = 'default', priority = 'medium') {
        // Si el sistema está apagado, no se permiten llamadas excepto las críticas
        if (!this.currentState.isSystemActive && priority !== 'critical') {
            return { allowed: false, reason: 'Sistema desactivado' };
        }

        // Resetear contadores si es necesario
        this.updateCounters();

        // Verificar límites globales
        const globalCheck = this.checkGlobalLimits();
        if (!globalCheck.allowed) {
            return globalCheck;
        }

        // Verificar límites por operación
        const operationCheck = this.checkOperationLimits(operationType);
        if (!operationCheck.allowed) {
            return operationCheck;
        }

        // Verificar modo de emergencia
        if (this.globalConfig.emergencyMode.enabled) {
            const emergencyChance = Math.random();
            if (emergencyChance > this.globalConfig.emergencyMode.reductionFactor) {
                return { allowed: false, reason: 'Modo de emergencia activo' };
            }
        }

        return { allowed: true };
    }

    /**
     * EJECUCIÓN CONTROLADA - Ejecuta una llamada API con control divino
     * INTEGRACIÓN CON SISTEMA MULTI-PROVEEDOR
     */
    async executeCall(operationType, apiCallFunction, priority = 'medium', options = {}) {
        const callId = this.generateCallId();
        const startTime = Date.now();

        // Verificar si se puede hacer la llamada
        const canCall = this.canMakeCall(operationType, priority);
        if (!canCall.allowed) {
            // INTENTAR FALLBACK MULTI-PROVEEDOR ANTES DE BLOQUEAR
            if (this.globalConfig.fallbackConfig.enabled && !options.skipFallback) {
                console.log(`[APICallController] ⚠️ Llamada bloqueada: ${canCall.reason}. Intentando fallback multi-proveedor...`);
                const fallbackResult = await this.tryMultiProviderFallback(operationType, apiCallFunction, priority, options);
                if (fallbackResult.success) {
                    return fallbackResult;
                }
            }
            
            this.currentState.statistics.blockedCalls++;
            console.log(`[APICallController] ❌ Llamada bloqueada: ${canCall.reason} - ${operationType}`);
            return { success: false, reason: canCall.reason, data: null };
        }

        // Actualizar contadores
        this.updateCounters(operationType);
        this.currentState.activeCalls.add(callId);
        this.currentState.operationCounters[operationType].active++;

        try {
            console.log(`[APICallController] 🚀 Ejecutando llamada: ${operationType} [${callId}]`);

            // Ejecutar la llamada API con timeout
            const result = await Promise.race([
                apiCallFunction(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout de llamada API')), 30000)
                )
            ]);

            // Actualizar estadísticas
            const responseTime = Date.now() - startTime;
            this.updateStatistics(responseTime, true);

            console.log(`[APICallController] ✅ Llamada completada: ${operationType} [${callId}] en ${responseTime}ms`);

            return {
                success: true,
                data: result,
                callId: callId,
                responseTime: responseTime
            };

        } catch (error) {
            console.error(`[APICallController] ❌ Error en llamada ${operationType} [${callId}]:`, error.message);

            // INTENTAR FALLBACK MULTI-PROVEEDOR EN CASO DE ERROR
            if (this.globalConfig.fallbackConfig.enabled && !options.skipFallback) {
                console.log(`[APICallController] ⚠️ Error detectado. Intentando fallback multi-proveedor...`);
                const fallbackResult = await this.tryMultiProviderFallback(operationType, apiCallFunction, priority, options);
                if (fallbackResult.success) {
                    return fallbackResult;
                }
            }

            this.updateStatistics(Date.now() - startTime, false);

            return {
                success: false,
                reason: error.message,
                callId: callId,
                data: null
            };

        } finally {
            // Limpiar estado
            this.currentState.activeCalls.delete(callId);
            this.currentState.operationCounters[operationType].active--;
            this.processQueue(); // Procesar siguiente en cola
        }
    }

    /**
     * INTENTO DE FALLBACK MULTI-PROVEEDOR
     * Intenta usar proveedores alternativos cuando el principal falla
     */
    async tryMultiProviderFallback(operationType, originalApiCallFunction, priority, options) {
        try {
            // Verificar si el sistema multi-proveedor está disponible
            if (!apiService || !apiService.executeLLMQuery) {
                console.warn('[APICallController] Sistema multi-proveedor no disponible para fallback');
                return { success: false, reason: 'Sistema multi-proveedor no disponible' };
            }

            console.log(`[APICallController] 🔄 Intentando fallback multi-proveedor para ${operationType}...`);

            // Extraer información del query original si es posible
            const queryInfo = this.extractQueryInfo(originalApiCallFunction);
            
            // Preparar configuración para el sistema multi-proveedor
            const apiConfig = {
                systemPrompt: queryInfo.systemPrompt || `Operación: ${operationType}`,
                userQuery: queryInfo.userQuery || 'Query automático del sistema QICN',
                currentHistory: queryInfo.history || [],
                isGrounded: false,
                currentApiKey: options.apiKey || this.getEmergencyApiKey(),
                llmEngine: options.engine || 'gemini',
                llmModel: options.model || 'gemini-2.5-flash-preview-09-2025',
                temperature: options.temperature || 0.7,
                max_tokens: options.max_tokens || 1024,
                preferredProvider: options.preferredProvider || this.globalConfig.fallbackConfig.emergencyProvider,
                useCache: true,
                fallbackEnabled: true
            };

            // Ejecutar query usando el sistema multi-proveedor
            const result = await apiService.executeLLMQuery(apiConfig);

            console.log(`[APICallController] ✅ Fallback multi-proveedor exitoso para ${operationType}`);
            
            return {
                success: true,
                data: result,
                callId: `fallback_${Date.now()}`,
                responseTime: Date.now() - options.startTime,
                provider: result.provider || 'fallback',
                cached: result.cached || false
            };

        } catch (fallbackError) {
            console.error(`[APICallController] ❌ Fallback multi-proveedor fallido:`, fallbackError.message);
            return {
                success: false,
                reason: `Fallback fallido: ${fallbackError.message}`,
                data: null
            };
        }
    }

    /**
     * Extrae información de query de una función API call
     */
    extractQueryInfo(apiCallFunction) {
        try {
            // Intentar ejecutar la función una vez para obtener info del query
            // Esto es un hack para extraer la configuración del query
            const functionString = apiCallFunction.toString();
            
            // Buscar patrones comunes en las funciones de query
            const systemPromptMatch = functionString.match(/systemPrompt:\s*["']([^"']+)["']/);
            const userQueryMatch = functionString.match(/userQuery:\s*["']([^"']+)["']/);
            
            return {
                systemPrompt: systemPromptMatch ? systemPromptMatch[1] : null,
                userQuery: userQueryMatch ? userQueryMatch[1] : null,
                history: []
            };
        } catch (e) {
            console.warn('[APICallController] No se pudo extraer info del query:', e.message);
            return {
                systemPrompt: null,
                userQuery: null,
                history: []
            };
        }
    }

    /**
     * Obtiene API key de emergencia desde configuración global
     */
    getEmergencyApiKey() {
        if (typeof window !== 'undefined' && window.API_KEY) {
            return window.API_KEY;
        }
        if (typeof process !== 'undefined' && process.env.API_KEY) {
            return process.env.API_KEY;
        }
        return null;
    }

    /**
     * Llamada específica para informe introspectivo
     */
    async executeIntrospectiveReport(apiCallFunction) {
        return this.executeCall('introspectiveReport', apiCallFunction, 'medium', {
            timeout: 25000
        });
    }

    /**
     * Llamada específica para proyección de axioma de ascensión
     */
    async executeAscensionAxiom(apiCallFunction) {
        return this.executeCall('ascensionAxiom', apiCallFunction, 'high', {
            timeout: 20000
        });
    }

    /**
     * Llamada específica para introspección interna
     */
    async executeInternalIntrospection(apiCallFunction) {
        return this.executeCall('internalIntrospection', apiCallFunction, 'medium', {
            timeout: 15000
        });
    }

    /**
     * Llamada para interacción humana (máxima prioridad)
     */
    async executeHumanInteraction(apiCallFunction) {
        return this.executeCall('humanInteraction', apiCallFunction, 'critical', {
            timeout: 10000
        });
    }

    /**
     * Verificación de límites globales
     */
    checkGlobalLimits() {
        const { counters } = this.currentState;

        if (counters.currentMinute >= this.globalConfig.maxRequestsPerMinute) {
            return { allowed: false, reason: 'Límite por minuto excedido' };
        }

        if (counters.currentHour >= this.globalConfig.maxRequestsPerHour) {
            return { allowed: false, reason: 'Límite por hora excedido' };
        }

        if (counters.currentDay >= this.globalConfig.maxRequestsPerDay) {
            return { allowed: false, reason: 'Límite por día excedido' };
        }

        return { allowed: true };
    }

    /**
     * Verificación de límites por operación
     */
    checkOperationLimits(operationType) {
        const config = this.globalConfig.operationLimits[operationType];
        if (!config) return { allowed: true }; // Operaciones no configuradas pasan

        const counter = this.currentState.operationCounters[operationType];
        const now = Date.now();

        // Verificar cooldown
        if (config.cooldownMinutes > 0) {
            const cooldownMs = config.cooldownMinutes * 60 * 1000;
            if (now - counter.lastCalled < cooldownMs) {
                return {
                    allowed: false,
                    reason: `Cooldown activo: ${config.cooldownMinutes} minutos`
                };
            }
        }

        // Verificar llamadas concurrentes
        if (counter.active >= config.maxConcurrent) {
            return {
                allowed: false,
                reason: `Máximo concurrentes alcanzado: ${config.maxConcurrent}`
            };
        }

        // Verificar límite por hora
        if (counter.count >= config.maxPerHour) {
            return {
                allowed: false,
                reason: `Límite por hora alcanzado: ${config.maxPerHour}`
            };
        }

        return { allowed: true };
    }

    /**
     * Actualización de contadores
     */
    updateCounters(operationType = null) {
        const now = Date.now();
        const { counters } = this.currentState;

        // Reset por minuto
        if (now - counters.lastReset.minute > 60000) {
            counters.currentMinute = 0;
            counters.lastReset.minute = now;
        }

        // Reset por hora
        if (now - counters.lastReset.hour > 3600000) {
            counters.currentHour = 0;
            counters.lastReset.hour = now;

            // Reset contadores de operaciones por hora
            Object.keys(this.currentState.operationCounters).forEach(op => {
                this.currentState.operationCounters[op].count = 0;
            });
        }

        // Reset por día
        if (now - counters.lastReset.day > 86400000) {
            counters.currentDay = 0;
            counters.lastReset.day = now;
        }

        // Incrementar contadores si se especifica operación
        if (operationType) {
            counters.currentMinute++;
            counters.currentHour++;
            counters.currentDay++;

            if (this.currentState.operationCounters[operationType]) {
                this.currentState.operationCounters[operationType].count++;
                this.currentState.operationCounters[operationType].lastCalled = now;
            }
        }
    }

    /**
     * Actualización de estadísticas
     */
    updateStatistics(responseTime, success) {
        const stats = this.currentState.statistics;
        stats.totalCalls++;

        if (success) {
            // Actualizar tiempo promedio de respuesta
            stats.averageResponseTime =
                (stats.averageResponseTime * (stats.totalCalls - 1) + responseTime) / stats.totalCalls;
        }
    }

    /**
     * Procesamiento de cola de llamadas pendientes
     */
    processQueue() {
        if (!this.currentState.isSystemActive || this.currentState.pendingQueue.length === 0) {
            return;
        }

        // Procesar llamadas en cola por prioridad
        this.currentState.pendingQueue
            .sort((a, b) => this.globalConfig.priorities[b.priority] - this.globalConfig.priorities[a.priority])
            .forEach(call => {
                if (this.canMakeCall(call.operationType, call.priority).allowed) {
                    this.executeCall(call.operationType, call.apiCallFunction, call.priority, call.options);
                    // Remover de la cola
                    const index = this.currentState.pendingQueue.indexOf(call);
                    if (index > -1) {
                        this.currentState.pendingQueue.splice(index, 1);
                    }
                }
            });
    }

    /**
     * Cancelar todas las llamadas pendientes
     */
    cancelAllPendingCalls() {
        this.currentState.pendingQueue = [];
        console.log('[APICallController] Todas las llamadas pendientes han sido canceladas');
    }

    /**
     * Obtener estado actual del sistema
     */
    getSystemStatus() {
        return {
            isActive: this.currentState.isSystemActive,
            counters: { ...this.currentState.counters },
            operationCounters: { ...this.currentState.operationCounters },
            activeCalls: this.currentState.activeCalls.size,
            queuedCalls: this.currentState.pendingQueue.length,
            statistics: { ...this.currentState.statistics },
            emergencyMode: this.globalConfig.emergencyMode.enabled
        };
    }

    /**
     * Activar/desactivar modo de emergencia
     */
    setEmergencyMode(enabled) {
        this.globalConfig.emergencyMode.enabled = enabled;
        console.log(`[APICallController] Modo de emergencia: ${enabled ? 'ACTIVADO' : 'DESACTIVADO'}`);
    }

    /**
     * Generar ID único para llamada
     */
    generateCallId() {
        return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Configurar temporizadores para reset automático
     */
    resetTimers() {
        // Reset por minuto
        setInterval(() => {
            this.currentState.counters.currentMinute = 0;
        }, 60000);

        // Reset por hora
        setInterval(() => {
            this.currentState.counters.currentHour = 0;
            Object.keys(this.currentState.operationCounters).forEach(op => {
                this.currentState.operationCounters[op].count = 0;
            });
        }, 3600000);

        // Reset por día
        setInterval(() => {
            this.currentState.counters.currentDay = 0;
        }, 86400000);
    }
}

// Instancia global del controlador divino
const globalAPICallController = new APICallController();

// Exportar para uso en todo el sistema QICN
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { APICallController, globalAPICallController };
} else {
    window.APICallController = APICallController;
    window.globalAPICallController = globalAPICallController;
}
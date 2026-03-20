/**
 * IntelligentResponseCache.cjs - Sistema de cache inteligente
 * Versión compatible con build process (CommonJS)
 */

class IntelligentResponseCache {
    constructor(options = {}) {
        this.maxCacheSize = options.maxCacheSize || 100;
        this.ttl = options.ttl || 3600000; // 1 hora
        this.importanceThreshold = options.importanceThreshold || 0.7;
        
        // Almacenamiento principal
        this.cache = new Map();
        this.accessOrder = [];
        
        // Configuración por tipo de contenido
        this.ttlByType = options.ttlByType || {
            factual: 24 * 3600000,     // 24 horas
            creative: 12 * 3600000,    // 12 horas
            conversation: 4 * 3600000, // 4 horas
            code: 8 * 3600000,         // 8 horas
            analysis: 6 * 3600000      // 6 horas
        };
        
        this.maxCacheSizeByType = options.maxCacheSizeByType || {
            factual: 50,
            creative: 30,
            conversation: 20,
            code: 15,
            analysis: 10
        };
    }

    /**
     * Genera clave única para un query
     */
    generateKey(query, context) {
        const baseKey = typeof query === 'string' ? query.trim().toLowerCase() : JSON.stringify(query);
        const provider = context?.provider || 'unknown';
        const model = context?.model || 'default';
        
        return `${baseKey}_${provider}_${model}`;
    }

    /**
     * Calcula puntuación de similitud semántica
     */
    calculateSimilarity(query1, query2) {
        if (!query1 || !query2) return 0;
        
        const q1 = query1.toLowerCase().trim();
        const q2 = query2.toLowerCase().trim();
        
        // Coincidencia exacta
        if (q1 === q2) return 1.0;
        
        // Palabras comunes
        const words1 = q1.split(/\s+/);
        const words2 = q2.split(/\s+/);
        const commonWords = words1.filter(word => words2.includes(word));
        
        const jaccardSimilarity = commonWords.length / (new Set([...words1, ...words2]).size);
        
        // Longitud similar
        const lengthRatio = Math.min(q1.length, q2.length) / Math.max(q1.length, q2.length);
        
        return jaccardSimilarity * 0.7 + lengthRatio * 0.3;
    }

    /**
     * Encuentra entrada más similar en cache
     */
    findSimilarEntry(query, provider, threshold = 0.8) {
        let bestMatch = null;
        let bestScore = 0;
        
        for (const [key, entry] of this.cache.entries()) {
            // Verificar mismo proveedor si se especifica
            if (provider && entry.metadata?.provider !== provider) {
                continue;
            }
            
            const similarity = this.calculateSimilarity(query, entry.query);
            if (similarity > threshold && similarity > bestScore) {
                bestMatch = { key, entry, similarity };
                bestScore = similarity;
            }
        }
        
        return bestMatch;
    }

    /**
     * Verifica si una entrada ha expirado
     */
    isExpired(entry) {
        return Date.now() - entry.timestamp > entry.ttl;
    }

    /**
     * Calcula puntuación de importancia
     */
    calculateImportance(query, context) {
        let importance = 0.5; // Base
        
        // Factor de longitud del query
        const queryLength = typeof query === 'string' ? query.length : JSON.stringify(query).length;
        importance += Math.min(queryLength / 1000, 0.2);
        
        // Factor de parámetros específicos
        if (context?.provider) importance += 0.1;
        if (context?.model) importance += 0.1;
        if (context?.parameters?.temperature) importance += 0.1;
        
        // Factor de tipo de contenido
        const contentType = this.detectContentType(query);
        if (contentType === 'factual') importance += 0.2;
        else if (contentType === 'code') importance += 0.15;
        else if (contentType === 'analysis') importance += 0.1;
        
        return Math.min(importance, 1.0);
    }

    /**
     * Detecta tipo de contenido del query
     */
    detectContentType(query) {
        const queryLower = query.toLowerCase();
        
        // Patrones de código
        if (queryLower.match(/function|class|var|let|const|import|export|def|class/)) {
            return 'code';
        }
        
        // Patrones de análisis
        if (queryLower.match(/analyze|analysis|compare|evaluate|assessment|review/)) {
            return 'analysis';
        }
        
        // Patrones creativos
        if (queryLower.match(/create|generate|write|story|poem|creative|imagine/)) {
            return 'creative';
        }
        
        // Por defecto, conversacional
        return 'conversation';
    }

    /**
     * Gestiona limpieza automática por LRU y TTL
     */
    cleanup() {
        const now = Date.now();
        const entriesToRemove = [];
        
        // Marcar entradas expiradas para eliminación
        for (const [key, entry] of this.cache.entries()) {
            if (this.isExpired(entry)) {
                entriesToRemove.push(key);
            }
        }
        
        // Si necesitamos más espacio, eliminar entradas menos importantes
        while (this.cache.size > this.maxCacheSize) {
            let leastImportantKey = null;
            let lowestImportance = 1.0;
            let oldestAccess = now;
            
            for (const [key, entry] of this.cache.entries()) {
                if (entry.accessCount === 0) {
                    leastImportantKey = key;
                    break;
                }
                
                const avgImportance = entry.importance / entry.accessCount;
                const accessTime = entry.lastAccess || entry.timestamp;
                
                if (avgImportance < lowestImportance || 
                    (avgImportance === lowestImportance && accessTime < oldestAccess)) {
                    leastImportantKey = key;
                    lowestImportance = avgImportance;
                    oldestAccess = accessTime;
                }
            }
            
            if (leastImportantKey) {
                entriesToRemove.push(leastImportantKey);
            } else {
                break;
            }
        }
        
        // Eliminar entradas marcadas
        entriesToRemove.forEach(key => {
            this.cache.delete(key);
            const orderIndex = this.accessOrder.indexOf(key);
            if (orderIndex > -1) {
                this.accessOrder.splice(orderIndex, 1);
            }
        });
        
        return entriesToRemove.length;
    }

    /**
     * Recupera entrada del cache
     */
    retrieve(query, context = {}) {
        const key = this.generateKey(query, context);
        const entry = this.cache.get(key);
        
        if (!entry) {
            // Buscar entrada similar
            const similar = this.findSimilarEntry(query, context.provider);
            if (similar && similar.similarity > 0.9) {
                return this.processCacheHit(similar.entry, similar.similarity);
            }
            return null;
        }
        
        // Verificar expiración
        if (this.isExpired(entry)) {
            this.cache.delete(key);
            return null;
        }
        
        return this.processCacheHit(entry, 1.0);
    }

    /**
     * Procesa un cache hit
     */
    processCacheHit(entry, similarity) {
        // Actualizar estadísticas de acceso
        entry.accessCount++;
        entry.lastAccess = Date.now();
        entry.similarity = similarity;
        
        // Reordenar access order
        const key = this.generateKey(entry.query, entry.metadata);
        const existingIndex = this.accessOrder.indexOf(key);
        if (existingIndex > -1) {
            this.accessOrder.splice(existingIndex, 1);
        }
        this.accessOrder.push(key);
        
        return {
            ...entry,
            score: similarity,
            cached: true
        };
    }

    /**
     * Almacena respuesta en cache
     */
    store(query, response, context = {}) {
        const key = this.generateKey(query, context);
        const importance = this.calculateImportance(query, context);
        const contentType = this.detectContentType(query);
        
        const entry = {
            query,
            response,
            metadata: {
                provider: context.provider,
                model: context.model,
                parameters: context.parameters,
                ...context
            },
            timestamp: Date.now(),
            lastAccess: Date.now(),
            accessCount: 1,
            importance,
            contentType,
            ttl: this.ttlByType[contentType] || this.ttl,
            similarity: 1.0
        };
        
        // Verificar si cumple el umbral de importancia
        if (importance < this.importanceThreshold) {
            return false;
        }
        
        // Almacenar entrada
        this.cache.set(key, entry);
        this.accessOrder.push(key);
        
        // Limpiar si es necesario
        this.cleanup();
        
        return true;
    }

    /**
     * Limpia el cache completamente
     */
    clear() {
        this.cache.clear();
        this.accessOrder = [];
    }

    /**
     * Obtiene estadísticas del cache
     */
    getStats() {
        const stats = {
            totalEntries: this.cache.size,
            maxSize: this.maxCacheSize,
            utilization: (this.cache.size / this.maxCacheSize * 100).toFixed(1) + '%',
            entriesByType: {},
            averageAccessCount: 0,
            oldestEntry: null,
            newestEntry: null
        };
        
        let totalAccess = 0;
        let oldestTimestamp = Date.now();
        let newestTimestamp = 0;
        
        for (const [key, entry] of this.cache.entries()) {
            // Contar por tipo
            const type = entry.contentType || 'unknown';
            stats.entriesByType[type] = (stats.entriesByType[type] || 0) + 1;
            
            // Calcular estadísticas de acceso
            totalAccess += entry.accessCount;
            
            // Encontrar más antigua y más nueva
            if (entry.timestamp < oldestTimestamp) {
                oldestTimestamp = entry.timestamp;
                stats.oldestEntry = {
                    key: key.substring(0, 50) + '...',
                    age: Date.now() - entry.timestamp
                };
            }
            
            if (entry.timestamp > newestTimestamp) {
                newestTimestamp = entry.timestamp;
                stats.newestEntry = {
                    key: key.substring(0, 50) + '...',
                    age: Date.now() - entry.timestamp
                };
            }
        }
        
        stats.averageAccessCount = this.cache.size > 0 ? 
            (totalAccess / this.cache.size).toFixed(2) : 0;
        
        return stats;
    }

    /**
     * Busca en el cache por query
     */
    search(query) {
        const results = [];
        
        for (const [key, entry] of this.cache.entries()) {
            const similarity = this.calculateSimilarity(query, entry.query);
            if (similarity > 0.5) {
                results.push({
                    entry,
                    similarity,
                    relevance: similarity * entry.importance
                });
            }
        }
        
        return results.sort((a, b) => b.relevance - a.relevance);
    }

    /**
     * Obtiene entradas próximas a expirar
     */
    getExpiringEntries(hours = 1) {
        const threshold = Date.now() - (hours * 3600000);
        const expiring = [];
        
        for (const [key, entry] of this.cache.entries()) {
            const expirationTime = entry.timestamp + entry.ttl;
            if (expirationTime > Date.now() && expirationTime < Date.now() + (hours * 3600000)) {
                expiring.push({
                    key,
                    entry,
                    timeUntilExpiration: expirationTime - Date.now()
                });
            }
        }
        
        return expiring;
    }
}

// Exportaciones para CommonJS
module.exports = {
    IntelligentResponseCache
};

// Exportaciones para navegador
if (typeof window !== 'undefined') {
    window.IntelligentResponseCache = IntelligentResponseCache;
}
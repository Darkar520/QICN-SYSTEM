/**
 * IntelligentResponseCache.js - Sistema de cache inteligente para respuestas de IA
 * 
 * Reduce llamadas a APIs mediante almacenamiento inteligente de respuestas,
 * con análisis de importancia y deduplicación semántica
 */

class IntelligentResponseCache {
    constructor(options = {}) {
        this.maxCacheSize = options.maxCacheSize || 100;
        this.ttl = options.ttl || 3600000; // 1 hora por defecto
        this.importanceThreshold = options.importanceThreshold || 0.7;
        
        this.cache = new Map();
        this.usageStats = new Map();
        this.importanceScorer = new ImportanceScorer();
        this.semanticAnalyzer = new SemanticAnalyzer();
        
        // Configuración de TTL por tipo de query
        this.ttlByType = {
            factual: 24 * 3600000,      // 24 horas para consultas factuales
            creative: 12 * 3600000,     // 12 horas para respuestas creativas
            conversation: 4 * 3600000,  // 4 horas para conversación
            code: 8 * 3600000,          // 8 horas para código
            analysis: 6 * 3600000       // 6 horas para análisis
        };
    }

    /**
     * Genera una clave de cache basada en query y contexto
     */
    generateCacheKey(query, context = {}) {
        const normalizedQuery = this.normalizeQuery(query);
        const normalizedContext = this.normalizeContext(context);
        return this.hashCode(`${normalizedQuery}:${JSON.stringify(normalizedContext)}`);
    }

    /**
     * Normaliza query para comparación semántica
     */
    normalizeQuery(query) {
        return query
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s]/g, '');
    }

    /**
     * Normaliza contexto para comparación
     */
    normalizeContext(context) {
        const normalized = {};
        
        // Normalizar campos importantes del contexto
        if (context.provider) normalized.provider = context.provider;
        if (context.model) normalized.model = context.model;
        if (context.temperature) normalized.temperature = Math.round(context.temperature * 100) / 100;
        if (context.systemPrompt) normalized.systemPrompt = this.normalizeQuery(context.systemPrompt).substring(0, 100);
        
        return normalized;
    }

    /**
     * Hash simple para generar claves de cache
     */
    hashCode(str) {
        let hash = 0;
        if (str.length === 0) return hash;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Determina si una query debe ser cacheada
     */
    shouldCache(query, response, context = {}) {
        // Factores que indican si debe cachearse
        const factors = {
            responseLength: response.length,
            queryComplexity: this.calculateQueryComplexity(query),
            repetitionScore: this.calculateRepetitionScore(query),
            importanceScore: this.importanceScorer.calculateImportance(query, response, context),
            contextRelevance: this.calculateContextRelevance(context)
        };

        // Scoring ponderado
        const cacheScore = (
            factors.importanceScore * 0.4 +
            factors.queryComplexity * 0.2 +
            factors.repetitionScore * 0.2 +
            factors.contextRelevance * 0.2
        );

        return {
            shouldCache: cacheScore >= this.importanceThreshold,
            score: cacheScore,
            factors: factors
        };
    }

    /**
     * Calcula complejidad de la query
     */
    calculateQueryComplexity(query) {
        const factors = {
            length: Math.min(query.length / 100, 1),
            questionWords: (query.match(/\b(what|how|why|when|where|who|explain|analyze)\b/gi) || []).length / 5,
            technicalTerms: this.countTechnicalTerms(query) / 10,
            punctuation: (query.match(/[.,;:!?]/g) || []).length / 10
        };

        return Math.min(Object.values(factors).reduce((a, b) => a + b), 1);
    }

    /**
     * Cuenta términos técnicos en la query
     */
    countTechnicalTerms(query) {
        const technicalTerms = [
            'algorithm', 'function', 'variable', 'class', 'method', 'api', 'sql', 'javascript',
            'python', 'react', 'node', 'database', 'system', 'architecture', 'framework',
            'programming', 'code', 'development', 'software', 'technical', 'data', 'analysis'
        ];
        
        const normalizedQuery = query.toLowerCase();
        return technicalTerms.filter(term => normalizedQuery.includes(term)).length;
    }

    /**
     * Calcula score de repetición basado en historial
     */
    calculateRepetitionScore(query) {
        const normalizedQuery = this.normalizeQuery(query);
        let repetitionCount = 0;
        
        for (const [key, entry] of this.cache.entries()) {
            if (this.semanticAnalyzer.areSimilar(normalizedQuery, key.split(':')[0])) {
                repetitionCount++;
            }
        }
        
        return Math.min(repetitionCount / 10, 1);
    }

    /**
     * Calcula relevancia del contexto
     */
    calculateContextRelevance(context) {
        let relevance = 0;
        
        if (context.systemPrompt && context.systemPrompt.length > 10) relevance += 0.3;
        if (context.conversationHistory && context.conversationHistory.length > 0) relevance += 0.4;
        if (context.provider) relevance += 0.1;
        if (context.model) relevance += 0.1;
        
        return Math.min(relevance, 1);
    }

    /**
     * Determina el TTL apropiado para una query
     */
    determineTTL(query, context = {}) {
        const normalizedQuery = this.normalizeQuery(query);
        
        // Clasificar tipo de query
        if (normalizedQuery.includes('code') || normalizedQuery.includes('function') || 
            normalizedQuery.includes('algorithm') || normalizedQuery.includes('programming')) {
            return this.ttlByType.code;
        }
        
        if (normalizedQuery.includes('what') || normalizedQuery.includes('when') || 
            normalizedQuery.includes('where') || normalizedQuery.includes('facts')) {
            return this.ttlByType.factual;
        }
        
        if (normalizedQuery.includes('creative') || normalizedQuery.includes('story') || 
            normalizedQuery.includes('imagine') || normalizedQuery.includes('creative')) {
            return this.ttlByType.creative;
        }
        
        if (normalizedQuery.includes('analyze') || normalizedQuery.includes('compare') || 
            normalizedQuery.includes('evaluate') || normalizedQuery.includes('assessment')) {
            return this.ttlByType.analysis;
        }
        
        return this.ttlByType.conversation;
    }

    /**
     * Almacena respuesta en cache
     */
    store(query, response, context = {}) {
        const cacheKey = this.generateCacheKey(query, context);
        const { shouldCache, score } = this.shouldCache(query, response, context);
        
        if (!shouldCache) {
            console.log('Query no califica para cache (score:', score, ')');
            return false;
        }
        
        const ttl = this.determineTTL(query, context);
        const expiresAt = Date.now() + ttl;
        
        // Verificar límites de cache
        if (this.cache.size >= this.maxCacheSize) {
            this.evictOldest();
        }
        
        const cacheEntry = {
            response: response,
            context: context,
            timestamp: Date.now(),
            expiresAt: expiresAt,
            score: score,
            query: query,
            usageCount: 1,
            lastAccessed: Date.now()
        };
        
        this.cache.set(cacheKey, cacheEntry);
        this.updateUsageStats(cacheKey, 'stored');
        
        console.log(`Respuesta cacheada con score ${score.toFixed(3)} y TTL ${ttl}ms`);
        return true;
    }

    /**
     * Recupera respuesta del cache
     */
    retrieve(query, context = {}) {
        const cacheKey = this.generateCacheKey(query, context);
        const entry = this.cache.get(cacheKey);
        
        if (!entry) {
            // Buscar cache con similitud semántica
            return this.findSemanticMatch(query, context);
        }
        
        // Verificar si ha expirado
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(cacheKey);
            this.updateUsageStats(cacheKey, 'expired');
            return null;
        }
        
        // Actualizar estadísticas de uso
        entry.usageCount++;
        entry.lastAccessed = Date.now();
        this.updateUsageStats(cacheKey, 'retrieved');
        
        console.log(`Cache hit - Query cached con ${entry.usageCount} usos previos`);
        return {
            response: entry.response,
            context: entry.context,
            score: entry.score,
            usageCount: entry.usageCount,
            cached: true,
            age: Date.now() - entry.timestamp
        };
    }

    /**
     * Busca coincidencias semánticas cuando no hay cache directo
     */
    findSemanticMatch(query, context = {}) {
        const normalizedQuery = this.normalizeQuery(query);
        let bestMatch = null;
        let bestSimilarity = 0;
        
        for (const [key, entry] of this.cache.entries()) {
            const similarity = this.semanticAnalyzer.calculateSimilarity(normalizedQuery, key.split(':')[0]);
            
            if (similarity > bestSimilarity && similarity > 0.8 && // 80% de similitud mínima
                Date.now() < entry.expiresAt) {
                bestSimilarity = similarity;
                bestMatch = entry;
            }
        }
        
        if (bestMatch) {
            bestMatch.usageCount++;
            bestMatch.lastAccessed = Date.now();
            this.updateUsageStats(this.generateCacheKey(query, context), 'semantic_match');
            
            return {
                response: bestMatch.response,
                context: bestMatch.context,
                score: bestMatch.score,
                usageCount: bestMatch.usageCount,
                cached: true,
                semanticMatch: true,
                similarity: bestSimilarity,
                age: Date.now() - bestMatch.timestamp
            };
        }
        
        return null;
    }

    /**
     * Elimina la entrada más antigua del cache
     */
    evictOldest() {
        let oldestKey = null;
        let oldestTime = Infinity;
        
        for (const [key, entry] of this.cache.entries()) {
            if (entry.timestamp < oldestTime) {
                oldestTime = entry.timestamp;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            this.cache.delete(oldestKey);
            this.updateUsageStats(oldestKey, 'evicted');
        }
    }

    /**
     * Actualiza estadísticas de uso
     */
    updateUsageStats(cacheKey, action) {
        const stats = this.usageStats.get(cacheKey) || {
            stored: 0,
            retrieved: 0,
            expired: 0,
            evicted: 0,
            semantic_match: 0
        };
        
        stats[action] = (stats[action] || 0) + 1;
        this.usageStats.set(cacheKey, stats);
    }

    /**
     * Obtiene estadísticas del cache
     */
    getStats() {
        const stats = {
            totalEntries: this.cache.size,
            maxSize: this.maxCacheSize,
            utilization: (this.cache.size / this.maxCacheSize * 100).toFixed(1) + '%',
            ttl: this.ttl,
            entriesByTTL: {},
            recentActivity: {}
        };
        
        // Estadísticas por TTL
        for (const [key, entry] of this.cache.entries()) {
            const ttlType = this.getTTLType(entry.expiresAt - Date.now());
            stats.entriesByTTL[ttlType] = (stats.entriesByTTL[ttlType] || 0) + 1;
        }
        
        return stats;
    }

    /**
     * Obtiene tipo de TTL basado en tiempo restante
     */
    getTTLType(timeRemaining) {
        if (timeRemaining > this.ttlByType.factual) return 'factual';
        if (timeRemaining > this.ttlByType.creative) return 'creative';
        if (timeRemaining > this.ttlByType.analysis) return 'analysis';
        if (timeRemaining > this.ttlByType.code) return 'code';
        return 'conversation';
    }

    /**
     * Limpia entradas expiradas
     */
    cleanup() {
        let cleaned = 0;
        const now = Date.now();
        
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
                this.updateUsageStats(key, 'expired');
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            console.log(`Limpiadas ${cleaned} entradas expiradas del cache`);
        }
        
        return cleaned;
    }

    /**
     * Limpia todo el cache
     */
    clear() {
        const size = this.cache.size;
        this.cache.clear();
        this.usageStats.clear();
        console.log(`Cache completamente limpiado (${size} entradas eliminadas)`);
    }
}

/**
 * ImportanceScorer - Calcula importancia de queries y respuestas
 */
class ImportanceScorer {
    calculateImportance(query, response, context) {
        const factors = {
            queryLength: Math.min(query.length / 200, 1) * 0.1,
            responseLength: Math.min(response.length / 1000, 1) * 0.2,
            hasSystemPrompt: context.systemPrompt ? 0.3 : 0,
            hasContext: context.conversationHistory ? 0.2 : 0,
            technicalScore: this.calculateTechnicalScore(query, response) * 0.2,
            uniqueTerms: this.calculateUniqueTerms(query) * 0.1
        };
        
        return Math.min(Object.values(factors).reduce((a, b) => a + b), 1);
    }
    
    calculateTechnicalScore(query, response) {
        const technicalPatterns = [
            /function\s*\(/i, /class\s+\w+/i, /import\s+\w+/i, /export\s+/i,
            /\b\d+\b/, /===|!==|==|!=/, /\bfor\s*\(/i, /\bwhile\s*\(/i,
            /\bif\s*\(/i, /\btry\s*{/i, /\bcatch\s*\(/i
        ];
        
        let matches = 0;
        const text = query + ' ' + response;
        
        technicalPatterns.forEach(pattern => {
            if (pattern.test(text)) matches++;
        });
        
        return Math.min(matches / 10, 1);
    }
    
    calculateUniqueTerms(query) {
        const words = query.toLowerCase().split(/\s+/);
        const uniqueWords = new Set(words);
        return Math.min(uniqueWords.size / words.length, 1);
    }
}

/**
 * SemanticAnalyzer - Análisis de similitud semántica
 */
class SemanticAnalyzer {
    areSimilar(query1, query2) {
        const similarity = this.calculateSimilarity(query1, query2);
        return similarity > 0.8;
    }
    
    calculateSimilarity(str1, str2) {
        const words1 = new Set(str1.split(' '));
        const words2 = new Set(str2.split(' '));
        
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        
        return intersection.size / union.size;
    }
}
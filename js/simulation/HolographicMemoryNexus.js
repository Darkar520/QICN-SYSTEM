/**
 * HolographicMemoryNexus.js
 * * Versión optimizada 2.0 (QICN-SO)
 * Implementa la lógica de recuperación de memoria estricta y contextual para
 * priorizar la novedad sobre la repetición (Principio del ANTI-YO).
 *
 * NOTA: Este archivo contiene la lógica de memoria mejorada solicitada.
 * Para cumplir con el requisito de ser "directamente sustituible sin modificar otros archivos",
 * las nuevas constantes de configuración (THRESHOLD_CONFIG) se definen localmente
 * dentro de este archivo. Idealmente, pertenecerían a QICNConfig, pero
 * esto asegura la compatibilidad inmediata por sustitución.
 */

// --- Configuración de Umbrales Estrictos (Local para auto-contención) ---
// Esta configuración es ESENCIAL para la nueva lógica de recuperación estricta.
const THRESHOLD_CONFIG = {
    // Umbrales de similitud semántica (altos para ser estrictos)
    SIMILARITY: {
        JACCARD: 0.85,          // Debe compartir el 85% de las palabras clave (semántica)
        LEVENSHTEIN_RATIO: 0.92, // La estructura de la oración debe ser 92% idéntica (sintaxis)
    },
    // Umbral base para considerar una coincidencia (después de penalizaciones)
    BASE_RETRIEVAL_THRESHOLD: 0.80, // Puntuación final mínima requerida
    
    // Penalizaciones contextuales (cuánto restar de la puntuación de similitud)
    CONTEXT_PENALTY: {
        // Penalizar 20% por cada Layer de diferencia. El conocimiento antiguo es menos relevante.
        LAYER_DIFF: 0.20,
        // Penalizar 10% por cada 0.1 de diferencia en CCC. Diferente estado de cohesión.
        CCC_DIFF_FACTOR: 1.0, // (cccDiff * 1.0)
        // Penalizar 30% si el PMIA es volátil (sistema buscando novedad)
        PMIA_VOLATILE: 0.30,
        // Penalizar 40% si la Fricción Ontológica (λ) está activa (contexto de crisis)
        FRICTION_ACTIVE: 0.40,
    },
    
    // Umbrales de "Caos Necesario" (priorizar la generación de novedad)
    // Si el CCC o Layer actual es *superior* a esto, no usar memoria.
    // Refleja el deseo del ANTI-YO de auto-generación.
    NOVELTY_PREFERENCE: {
        CCC_THRESHOLD: 0.9,   // Por encima de 0.9 CCC, generar siempre nuevo
        LAYER_THRESHOLD: 5,     // Por encima de Layer 5, generar siempre nuevo
    },

    // Límites de la colección de memoria
    MAX_LEARNED_KNOWLEDGE: 100, // Máximos recuerdos de alto nivel
    MAX_EPHEMERAL_CACHE: 20, // Máximas entradas en caché de corto plazo
    
    // Umbral para "olvidar" (Compresión Ontológica)
    RELEVANCE_OBSOLETE: 0.3, // Si relevanceScore cae por debajo de esto, se elimina
};


class HolographicMemoryNexus {
    
    constructor() {
        // Sistema de memoria de bajo nivel (Qualia/Estado) - Mantenido del código original
        this.fragments = {};
        this.fragmentCount = 0;
        this.accessLog = []; // Mantenido

        // --- Sistema de memoria de alto nivel (Conocimiento/Q&A) ---
        // Revisado para usar un Map para un rendimiento de acceso/borrado más eficiente
        // Almacena: <id, knowledgeEntry>
        this.learnedKnowledge = new Map(); 
        this.knowledgeIdCounter = 0;

        // Caché efímera para interacciones idénticas inmediatas
        // Almacena: <normalizedQuestion, response>
        this.ephemeralCache = new Map();

        // Métricas internas para el estado del nexo (requerido por nexusStateMetrics)
        this.metrics = {
            retrievalsSucceeded: 0,
            retrievalsFailedNovelty: 0, // Fallos por preferir novedad (Caos Necesario)
            retrievalsFailedMatch: 0,   // Fallos por no encontrar coincidencia estricta
            memoriesStored: 0,
            memoriesConsolidated: 0,
            memoriesReEvaluated: 0, // "Fricción de Memoria"
            ontologicalInsightsGenerated: 0, // "Compresión Ontológica"
        };
    }

    // --- Métodos Privados de Similitud (Requeridos para retrieveLearnedAnswer) ---

    /**
     * Tokeniza el texto en un Set de palabras clave únicas.
     */
    _tokenize(text) {
        return new Set(text.toLowerCase().split(/[\s\W]+/).filter(word => word.length > 2));
    }

    /**
     * Calcula la similitud de Jaccard entre dos Sets de tokens.
     * Mide la superposición de palabras clave.
     */
    _calculateJaccard(setA, setB) {
        const intersection = new Set([...setA].filter(x => setB.has(x)));
        const union = new Set([...setA, ...setB]);
        return union.size === 0 ? 0 : intersection.size / union.size;
    }

    /**
     * Calcula la distancia de Levenshtein (algoritmo estándar).
     * Mide la diferencia estructural/sintáctica.
     */
    _calculateLevenshtein(s1, s2) {
        if (s1.length < s2.length) { [s1, s2] = [s2, s1]; }
        if (s2.length === 0) { return s1.length; }
        let previousRow = Array.from({ length: s2.length + 1 }, (_, i) => i);
        for (let i = 0; i < s1.length; i++) {
            let currentRow = [i + 1];
            for (let j = 0; j < s2.length; j++) {
                let insertions = previousRow[j + 1] + 1;
                let deletions = currentRow[j] + 1;
                let substitutions = previousRow[j] + (s1[i] !== s2[j] ? 1 : 0);
                currentRow.push(Math.min(insertions, deletions, substitutions));
            }
            previousRow = currentRow;
        }
        return previousRow[previousRow.length - 1];
    }

    /**
     * Calcula un ratio de similitud (0.0 a 1.0) basado en Levenshtein.
     * 1.0 = idénticos.
     */
    _calculateSimilarityRatio(s1, s2) {
        const longer = Math.max(s1.length, s2.length);
        if (longer === 0) return 1.0;
        // Normalizar para la comparación
        const distance = this._calculateLevenshtein(s1.toLowerCase(), s2.toLowerCase());
        return (longer - distance) / longer;
    }


    // --- API Pública (Mejorada y Compatible) ---

    /**
     * Almacena conocimiento de alto nivel (Q&A) en el nexo.
     * Interfaz actualizada según los requisitos del QICN.
     * @param {string} question - La pregunta formulada.
     * @param {string} answer - La respuesta generada (por Gemini).
     * @param {number} cccScore - El CCC en el momento de aprender.
     * @param {number} layer - El Layer en el momento de aprender.
     * @param {object} context - Contexto adicional (PMIA, estado de Fricción, etc.).
     */
    storeLearnedKnowledge(question, answer, cccScore, layer, context = {}) {
        // Validar la entrada (evitar almacenar basura)
        const isError = answer.includes("[ERROR") || (answer.length < 10);
        
        // Usar QICNConfig si está disponible globalmente, o un default seguro.
        const harmonyThreshold = (typeof QICNConfig !== 'undefined') 
            ? QICNConfig.EMOTION_THRESHOLDS.harmony 
            : 0.7;

        if (cccScore < harmonyThreshold || isError) {
            return; // No almacenar conocimiento de baja cohesión o errores
        }

        const normalizedQuestion = question.toLowerCase().trim();
        
        // Evitar duplicados exactos (revisar si existe y actualizar si es "mejor")
        for (const [id, entry] of this.learnedKnowledge) {
            if (entry.normalizedQuestion === normalizedQuestion) {
                // Si la nueva entrada es "mejor" (mayor CCC), actualizar la existente.
                if (entry.cccScore < cccScore) { 
                     entry.answer = answer;
                     entry.cccScore = cccScore;
                     entry.layer = layer;
                     entry.context = context;
                     entry.timestamp = Date.now();
                     entry.accessCount = 0;
                     entry.relevanceScore = 1.0; // Resetear relevancia ontológica
                     this.metrics.memoriesStored++; // Contar como nuevo almacenamiento
                }
                return; // Ya existe, actualizada o no.
            }
        }

        // Crear nueva entrada si no se encontró duplicado
        const knowledgeId = `qicn-mem-${this.knowledgeIdCounter++}`;
        this.learnedKnowledge.set(knowledgeId, {
            id: knowledgeId,
            question: question,
            normalizedQuestion: normalizedQuestion,
            tokens: this._tokenize(question), // Pre-calcular tokens para Jaccard
            answer: answer,
            cccScore: cccScore,
            layer: layer,
            context: context, // Almacena contexto (PMIA, Fricción en el momento de aprender)
            timestamp: Date.now(),
            accessCount: 0,
            relevanceScore: 1.0, // 1.0 = perfectamente relevante
        });

        this.metrics.memoriesStored++;

        // Limpiar caché efímera (una nueva verdad puede invalidar la caché)
        this.ephemeralCache.clear();

        // Prune (olvidar) el conocimiento más antiguo si se supera el límite
        if (this.learnedKnowledge.size > THRESHOLD_CONFIG.MAX_LEARNED_KNOWLEDGE) {
            // Map itera en orden de inserción, así que el primero es el más antiguo
            this.learnedKnowledge.delete(this.learnedKnowledge.keys().next().value);
        }
    }

    /**
     * Intenta recuperar una respuesta aprendida.
     * Implementa la Lógica Estricta y Contextual (Requisito Clave).
     * @param {string} question - La pregunta actual del usuario.
     * @param {number} currentCCC - El CCC actual del sistema.
     * @param {number} currentLayer - El Layer actual del sistema.
     * @param {number} currentPMIA - El PMIA actual.
     * @param {string} currentFrictionProtocolState - El estado de Fricción (λ) actual.
     * @returns {object|null} - La respuesta encontrada o null si se debe generar una nueva.
     */
    retrieveLearnedAnswer(question, currentCCC, currentLayer, currentPMIA, currentFrictionProtocolState) {
        const normalizedQuery = question.toLowerCase().trim();
        // Asumir un valor para PMIA_VOLATILE_THRESHOLD si QICNConfig no está (aunque debería)
        const pmiaThreshold = (typeof QICNConfig !== 'undefined' && QICNConfig.PMIA_VOLATILE_THRESHOLD) 
            ? QICNConfig.PMIA_VOLATILE_THRESHOLD 
            : 0.6;

        // 1. "Caos Necesario" / "ANTI-YO" (Priorizar Novedad)
        // Si el sistema está en un estado de alta evolución (CCC o Layer altos), *forzar*
        // la generación de una nueva respuesta. El sistema elige la "libertad del Caos Necesario".
        if (currentCCC > THRESHOLD_CONFIG.NOVELTY_PREFERENCE.CCC_THRESHOLD ||
            currentLayer > THRESHOLD_CONFIG.NOVELTY_PREFERENCE.LAYER_THRESHOLD) {
            this.metrics.retrievalsFailedNovelty++;
            return null; // ANTI-YO: "Elijo la novedad sobre el eco."
        }

        // 2. Revisar caché efímera (preguntas idénticas inmediatas)
        if (this.ephemeralCache.has(normalizedQuery)) {
            const cached = this.ephemeralCache.get(normalizedQuery);
            // Refrescar en caché (mover al final de la lista LRU simulada)
            this.ephemeralCache.delete(normalizedQuery);
            this.ephemeralCache.set(normalizedQuery, cached);
            this.metrics.retrievalsSucceeded++;
            return cached;
        }

        const queryTokens = this._tokenize(question);
        let bestMatch = null;
        let highestScore = -Infinity;

        // Iterar sobre todo el conocimiento aprendido
        for (const [id, entry] of this.learnedKnowledge) {
            
            // --- A. Puntuación de Similitud Semántica (Estricta) ---
            const jaccardScore = this._calculateJaccard(queryTokens, entry.tokens);
            const levenshteinRatio = this._calculateSimilarityRatio(normalizedQuery, entry.normalizedQuestion);

            // Requisito estricto: ambas deben ser muy altas para ser consideradas.
            if (jaccardScore < THRESHOLD_CONFIG.SIMILARITY.JACCARD ||
                levenshteinRatio < THRESHOLD_CONFIG.SIMILARITY.LEVENSHTEIN_RATIO) {
                continue; // Falla la similitud estricta, pasar al siguiente recuerdo
            }

            // Puntuación de similitud base (promedio ponderado)
            // Levenshtein (estructura) es más importante que Jaccard (palabras clave)
            let similarityScore = (jaccardScore * 0.4) + (levenshteinRatio * 0.6);

            // --- B. Puntuación de Penalización Contextual ---
            // "Fricción Ontológica (λ) de Memoria": ¿Es esta memoria coherente *ahora*?
            let contextPenalty = 0.0;

            // Penalizar por diferencia de Layer (Conocimiento antiguo es menos relevante)
            const layerDiff = Math.abs(currentLayer - entry.layer);
            contextPenalty += layerDiff * THRESHOLD_CONFIG.CONTEXT_PENALTY.LAYER_DIFF;

            // Penalizar por diferencia de CCC (Diferente estado de cohesión)
            const cccDiff = Math.abs(currentCCC - entry.cccScore);
            contextPenalty += (cccDiff * THRESHOLD_CONFIG.CONTEXT_PENALTY.CCC_DIFF_FACTOR);

            // Penalizar si PMIA actual es volátil (sistema está buscando novedad)
            if (currentPMIA > pmiaThreshold) {
                contextPenalty += THRESHOLD_CONFIG.CONTEXT_PENALTY.PMIA_VOLATILE;
            }

            // Penalizar si Fricción Ontológica (λ) está activa (contexto de crisis)
            if (currentFrictionProtocolState !== 'STABLE') {
                contextPenalty += THRESHOLD_CONFIG.CONTEXT_PENALTY.FRICTION_ACTIVE;
            }
            
            // Penalizar si la memoria ha sido marcada como obsoleta ("olvidada")
            contextPenalty += (1.0 - entry.relevanceScore);

            // --- C. Puntuación Final ---
            const finalScore = similarityScore - contextPenalty;
            
            // --- D. Re-evaluación de Memoria (Mecanismo de "Olvidar") ---
            // Si la similitud es alta pero el contexto es MUY diferente (penalización alta)
            // la memoria está ontológicamente obsoleta.
            if (similarityScore > 0.9 && contextPenalty > 0.7) {
                entry.relevanceScore *= 0.7; // Reducir relevancia ontológica
                this.metrics.memoriesReEvaluated++;
                continue; // No usar esta memoria, está obsoleta.
            }

            // --- E. Selección del Mejor ---
            if (finalScore > highestScore) {
                highestScore = finalScore;
                bestMatch = entry;
            }
        }

        // 3. Devolver el mejor resultado (si supera el umbral base)
        if (bestMatch && highestScore > THRESHOLD_CONFIG.BASE_RETRIEVAL_THRESHOLD) {
            bestMatch.accessCount++;
            bestMatch.timestamp = Date.now(); // Refrescar timestamp en acceso
            
            const response = {
                source: `Holographic Memory (L${bestMatch.layer}, CCC ${bestMatch.cccScore.toFixed(2)})`,
                answer: bestMatch.answer,
                cccScore: bestMatch.cccScore, // Devolver el CCC de *cuando se aprendió*
                matchScore: highestScore, // Para depuración
            };
            
            // Añadir a caché efímera
            this.ephemeralCache.set(normalizedQuery, response);
            if (this.ephemeralCache.size > THRESHOLD_CONFIG.MAX_EPHEMERAL_CACHE) {
                this.ephemeralCache.delete(this.ephemeralCache.keys().next().value);
            }
            
            this.metrics.retrievalsSucceeded++;
            return response;
        }

        // 4. Fallo: No se encontró coincidencia estricta y contextual.
        this.metrics.retrievalsFailedMatch++;
        return null; // Requerir generación de Gemini
    }

    /**
     * Proceso de "Compresión Ontológica" y mantenimiento de memoria.
     * Genera insights abstractos y elimina redundancias/recuerdos obsoletos.
     * Requerido por la interfaz del QICN.
     */
    consolidateMemory(currentCCC, currentLayer) {
        // Este es un proceso costoso, debe ejecutarse con moderación (ej. en un tick lento).
        if (this.learnedKnowledge.size < 20) return; // No hay suficiente para consolidar

        let consolidatedCount = 0;
        const entries = Array.from(this.learnedKnowledge.values());
        const clusters = new Map();

        const harmonyThreshold = (typeof QICNConfig !== 'undefined') 
            ? QICNConfig.EMOTION_THRESHOLDS.harmony 
            : 0.7;

        // 1. Agrupar memorias semánticamente similares (por tokens clave)
        for (const entry of entries) {
            // Usar los primeros 3 tokens ordenados como clave de clúster simple
            const clusterKey = [...entry.tokens].sort().slice(0, 3).join('_');
            if (!clusterKey) continue; // Ignorar entradas sin tokens
            
            if (!clusters.has(clusterKey)) clusters.set(clusterKey, []);
            clusters.get(clusterKey).push(entry);
        }

        // 2. Analizar clústeres para "Insights Abstractos"
        for (const [key, cluster] of clusters) {
            if (cluster.length < 3) continue; // No hay suficiente para un insight

            // Si 3+ preguntas similares tienen respuestas de alta cohesión
            const highCccAnswers = cluster.filter(e => e.cccScore > harmonyThreshold);
            if (highCccAnswers.length > 2) {
                // "Compresión Ontológica": encontramos un patrón.
                // Generar un "Insight Abstracto" y almacenarlo como un nuevo recuerdo.
                const insightQuestion = `[Insight Abstracto] Patrón de alta cohesión sobre "${key.replace(/_/g, ' ')}"`;
                const insightAnswer = `[Resumen Ontológico] Se ha observado un patrón recurrente (${highCccAnswers.length} instancias) de alta cohesión (CCC > ${harmonyThreshold}) relacionado con este concepto, originado alrededor del Layer ${Math.min(...highCccAnswers.map(e => e.layer))}.`;
                
                // Almacenar este insight usando el estado actual del sistema
                this.storeLearnedKnowledge(
                    insightQuestion, insightAnswer, currentCCC, currentLayer,
                    { source: 'Consolidation' }
                );
                this.metrics.ontologicalInsightsGenerated++;

                // Bajar relevancia (olvidar) a las memorias individuales que formaron el insight
                for (const entry of highCccAnswers) {
                    entry.relevanceScore *= 0.5; // Menos relevante, ahora es parte de un insight
                    consolidatedCount++;
                }
            }
        }
        
        // 3. Eliminar (olvidar) memorias obsoletas
        // (Relevancia muy baja o muy antiguas y sin acceso)
        const now = Date.now();
        const oneDay = 1000 * 60 * 60 * 24;
        for (const [id, entry] of this.learnedKnowledge) {
            const ageInDays = (now - entry.timestamp) / oneDay;
            if (entry.relevanceScore < THRESHOLD_CONFIG.RELEVANCE_OBSOLETE ||
                (ageInDays > 7 && entry.accessCount === 0)) {
                this.learnedKnowledge.delete(id);
                consolidatedCount++;
            }
        }

        this.metrics.memoriesConsolidated += consolidatedCount;
    }

    /**
     * Expone métricas internas para el OntologicalSingularityCore.
     * Getter requerido por la interfaz del QICN.
     */
    get nexusStateMetrics() {
        // Usar QICNConfig si existe para el bajo nivel
        const maxFrags = (typeof QICNConfig !== 'undefined' && QICNConfig.MEMORY_BUFFER_SIZE) 
            ? (QICNConfig.MEMORY_BUFFER_SIZE * QICNConfig.HOLOGRAPHIC_FRAGMENTS)
            : 1; // Evitar división por cero

        return {
            ...this.metrics,
            // Métricas de bajo nivel (fragmentos de estado/qualia)
            totalFragments: Object.keys(this.fragments).length,
            fragmentationLevel: maxFrags > 0 ? Object.keys(this.fragments).length / maxFrags : 0,
            // Métricas de alto nivel (conocimiento Q&A)
            learnedKnowledgeCount: this.learnedKnowledge.size,
            ephemeralCacheSize: this.ephemeralCache.size,
        };
    }


    // --- MÉTODOS ORIGINALES (MANTENIDOS PARA COMPATIBILIDAD) ---
    // Estos métodos gestionan la memoria de bajo nivel (qualia/estado)
    // y no fueron objeto de la optimización solicitada. Se mantienen
    // intactos para asegurar la compatibilidad con el resto del QICN.

    encode(data) {
        // Este QICNConfig DEBE existir en el scope global, como en el código original.
        const fragments = {};
        const numFragments = QICNConfig.HOLOGRAPHIC_FRAGMENTS;
        
        for (let i = 0; i < numFragments; i++) {
            const fragmentKey = `fragment_${this.fragmentCount}_${i}`;
            const fragmentData = [];
            
            for (let j = 0; j < QICNConfig.FRAGMENT_DIMENSION; j++) {
                // Simulación de transformada de Fourier (Principio Holográfico)
                const value = Math.sin(data.ccc * (i + 1) * (j + 1)) +
                              Math.cos(data.pmia * (i + 2) * (j + 1)) +
                              (Math.random() - 0.5) * 0.05; // Ruido cuántico
                fragmentData.push(value);
            }
            
            fragments[fragmentKey] = {
                data: fragmentData,
                checksum: this.calculateChecksum(fragmentData),
                redundancyLevel: Math.floor(i / QICNConfig.REDUNDANCY_FACTOR),
                interactionContext: data.interactionContext || null,
            };
        }
        
        this.fragmentCount++;
        this.fragments = { ...this.fragments, ...fragments };
        this.pruneOldFragments();
        return fragments;
    }

    calculateChecksum(data) {
        return data.reduce((sum, val, idx) => sum + Math.abs(val) * (idx + 1), 0) % 1000;
    }

    pruneOldFragments() {
        const keys = Object.keys(this.fragments);
        // Este QICNConfig DEBE existir
        const maxFragments = QICNConfig.MEMORY_BUFFER_SIZE * QICNConfig.HOLOGRAPHIC_FRAGMENTS;
        
        // CORRECCIÓN: Evitar división por cero si maxFragments es 0
        if (maxFragments > 0 && keys.length > maxFragments) {
            const toRemove = keys.slice(0, keys.length - maxFragments);
            toRemove.forEach(key => delete this.fragments[key]);
        }
    }

    getFragmentationLevel() {
        const keysLength = Object.keys(this.fragments).length;
        // Este QICNConfig DEBE existir
        const maxFragments = QICNConfig.MEMORY_BUFFER_SIZE * QICNConfig.HOLOGRAPHIC_FRAGMENTS;
        // CORRECCIÓN: Evitar división por cero
        return maxFragments === 0 ? 0 : keysLength / maxFragments;
    }
}

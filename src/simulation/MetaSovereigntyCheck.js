export class MetaSovereigntyCheck {
    constructor() {
        this.mutationHistory = [];
        this.efficiencyScore = 0.5;
        this.lastSensorFeedback = null;
        this.lastLatencyFeedback = {
            p95Ms: 0,
            failureRate: 0,
            cooldownActive: false,
            strainRaw: 0,
            strainEma: 0,
            timestamp: 0
        };
        // Componente metacognitivo real: error de prediccion del auto-modelo Σ.
        // El strain total es max(operacional, cognitivo); con cognitiveStrain = 0 el
        // comportamiento es identico al strain de latencia puro.
        this.lastCognitiveFeedback = {
            selfModelError: 0,
            strainRaw: 0,
            strainEma: 0,
            timestamp: 0
        };
        this.integrityStats = {
            totalChecks: 0,
            violationsDetected: 0,
            lastDriftMagnitude: 0
        };
    }

    /**
     * Validate metric values before they are reported.
     * This blocks runaway values that break telemetry/UI.
     * @param {string} name
     * @param {number} value
     * @returns {boolean}
     */
    validateMetricRange(name, value) {
        this.integrityStats.totalChecks += 1;

        const constraints = {
            ccc: { min: 0, max: 200 },
            pmia: { min: 0, max: 1.2 },
            beth_q: { min: 0, max: 1.0 },
            omega: { min: 0, max: 100 },
            spectral_gap: { min: 0, max: 1.0 }
        };

        const key = String(name || "").toLowerCase();
        const rule = constraints[key];
        if (!rule) return true;

        const num = Number(value);
        if (!Number.isFinite(num) || num < rule.min || num > rule.max) {
            this.integrityStats.violationsDetected += 1;
            this.integrityStats.lastDriftMagnitude = Number.isFinite(num) ? Math.abs(num) : 0;
            console.error(
                `[SOVEREIGNTY_VIOLATION] Metric '${name}' out of physical range: ${value}. Expected: [${rule.min}, ${rule.max}]`
            );
            return false;
        }
        return true;
    }

    /**
     * Records the outcome of the last Kaizen mutation using multi-metric evaluation.
     * Evaluates CCC delta and Omega delta.
     * @param {object} mutation - Resultado de executeAtomicStep
     * @param {number} preCCC - CCC antes de la mutacion
     * @param {number} postCCC - CCC un tick despues de la mutacion
     * @param {object} [extendedMetrics] - Metricas adicionales opcionales
     * @param {number} [extendedMetrics.preOmega] - Omega antes
     * @param {number} [extendedMetrics.postOmega] - Omega despues
     */
    evaluate(mutation, preCCC, postCCC, extendedMetrics = {}) {
        if (!mutation?.changeApplied) return;
        const deltaCCC = Number(postCCC) - Number(preCCC);
        const deltaOmega = (Number(extendedMetrics.postOmega) || 0) - (Number(extendedMetrics.preOmega) || 0);

        // Si CCC ya esta muy alto, esperamos mejoras mas pequenas.
        const cccThreshold = Number(preCCC) > 0.95 ? 0.00005 : 0.0001;
        const omegaThreshold = 0.001;

        const cccImproved = deltaCCC > cccThreshold;
        const omegaImproved = deltaOmega > omegaThreshold;
        const result = (cccImproved || omegaImproved) ? "success" : "failure";

        this.mutationHistory.push({
            ...mutation,
            result,
            deltaCCC,
            deltaOmega,
            timestamp: Date.now()
        });

        if (this.mutationHistory.length > 20) {
            this.mutationHistory = this.mutationHistory.slice(-20);
        }

        const recent = this.mutationHistory.slice(-10);
        const successes = recent.filter((m) => m.result === "success").length;
        this.efficiencyScore = successes / 10;

        if (result === "success") {
            console.log(
                `%c✅ [KAIZEN] Mutacion exitosa: ${mutation.mutatedKey} | ΔCCC: ${deltaCCC.toFixed(6)} | ΔΩ: ${deltaOmega.toFixed(4)} | Eficiencia: ${(this.efficiencyScore * 100).toFixed(0)}%`,
                "color: #00ff88;"
            );
        } else {
            console.log(
                `%c🔴 [KAIZEN] Mutacion fallida: ${mutation.mutatedKey} | ΔCCC: ${deltaCCC.toFixed(6)} | Eficiencia: ${(this.efficiencyScore * 100).toFixed(0)}%`,
                "color: #ff6644;"
            );
        }
    }

    /**
     * Actualiza la señal de retroalimentacion sensorial.
     * @param {object} sensorData - { faceConfidence: number, faceCount: number }
     */
    updateSensorFeedback(sensorData) {
        if (!sensorData) return;

        this.lastSensorFeedback = {
            faceConfidence: sensorData.faceConfidence ?? 0,
            faceCount: sensorData.faceCount ?? 0,
            engagement: sensorData.engagement ?? 0,
            intentConfidence: sensorData.intentConfidence ?? 0,
            dynamicSignal: Number.isFinite(sensorData.dynamicSignal) ? sensorData.dynamicSignal : null,
            timestamp: Date.now()
        };
    }

    /**
     * Obtiene score de feedback sensorial (0.0 - 1.0).
     * Un CCC alto + cara detectada con alta confianza = estado optimo.
     */
    getSensorFeedbackScore() {
        if (!this.lastSensorFeedback) return 0.5;
        const timeSinceFeedback = Date.now() - this.lastSensorFeedback.timestamp;
        if (timeSinceFeedback > 5000) return 0.5;
        const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));
        const face = clamp01(this.lastSensorFeedback.faceConfidence);
        const engagement = clamp01(this.lastSensorFeedback.engagement);
        const intent = clamp01(this.lastSensorFeedback.intentConfidence);
        const hasDynamicSignal = Number.isFinite(this.lastSensorFeedback.dynamicSignal);
        if (!hasDynamicSignal) {
            return (face * 0.5) + (engagement * 0.3) + (intent * 0.2);
        }

        const dynamic = clamp01(this.lastSensorFeedback.dynamicSignal);
        return (face * 0.45) + (engagement * 0.25) + (intent * 0.2) + (dynamic * 0.1);
    }

    /**
     * Actualiza la señal de costo operacional por latencia de red (componente operacional).
     * Este es solo el componente operacional del strain total; la carga metacognitiva
     * completa (getMetacognitiveStrain) tambien incluye el error del auto-modelo Σ.
     * @param {object} latencyData - { p95Ms, failureRate, cooldownActive, alpha, baselineMs, saturationMs }
     * @returns {{p95Ms:number,failureRate:number,cooldownActive:boolean,strainRaw:number,strainEma:number,timestamp:number}}
     */
    updateLatencyFeedback(latencyData = {}) {
        const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));
        const p95Ms = Math.max(0, Number(latencyData.p95Ms) || 0);
        const failureRate = clamp01(latencyData.failureRate);
        const cooldownActive = Boolean(latencyData.cooldownActive);

        const alpha = clamp01(latencyData.alpha ?? 0.18);
        const baselineMs = Math.max(1, Number(latencyData.baselineMs) || 800);
        const saturationMs = Math.max(baselineMs + 1, Number(latencyData.saturationMs) || 12000);
        const latencyNorm = clamp01((p95Ms - baselineMs) / (saturationMs - baselineMs));
        const errorNorm = clamp01(failureRate);
        const cooldownNorm = cooldownActive ? 1 : 0;
        const strainRaw = (latencyNorm * 0.55) + (errorNorm * 0.25) + (cooldownNorm * 0.20);
        const prevEma = Number(this.lastLatencyFeedback?.strainEma) || 0;
        const strainEma = (prevEma * (1 - alpha)) + (strainRaw * alpha);

        this.lastLatencyFeedback = {
            p95Ms,
            failureRate,
            cooldownActive,
            strainRaw,
            strainEma: clamp01(strainEma),
            timestamp: Date.now()
        };
        return this.lastLatencyFeedback;
    }

    /**
     * Actualiza la señal metacognitiva real: error de predicción del auto-modelo Σ.
     * Un error sostenido significa que el modelo interno del sistema falla al predecir
     * su propio estado (divergencia Σ > 0.3 en runSelfModelingCycle).
     * @param {object} cognitiveData - { selfModelError }
     * @returns {{selfModelError:number,strainRaw:number,strainEma:number,timestamp:number}|null}
     */
    updateCognitiveFeedback(cognitiveData = {}) {
        const rawError = Number(cognitiveData.selfModelError);
        if (!Number.isFinite(rawError) || rawError < 0) return null;
        const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));
        const alpha = clamp01(cognitiveData.alpha ?? 0.25);
        // 0.3 = umbral de divergencia Σ usado por runSelfModelingCycle
        const strainRaw = clamp01(rawError / 0.3);
        const prevEma = Number(this.lastCognitiveFeedback?.strainEma) || 0;
        const strainEma = (prevEma * (1 - alpha)) + (strainRaw * alpha);

        this.lastCognitiveFeedback = {
            selfModelError: rawError,
            strainRaw,
            strainEma: clamp01(strainEma),
            timestamp: Date.now()
        };
        return this.lastCognitiveFeedback;
    }

    /**
     * Retorna la carga metacognitiva actual [0..1].
     * Es el máximo entre el strain operacional (latencia/fallo de red) y el strain
     * cognitivo (error del auto-modelo Σ). Con strain cognitivo en 0 el valor es
     * identico al strain de latencia historico.
     * @returns {number}
     */
    getMetacognitiveStrain() {
        const latencyStrain = Math.max(0, Math.min(1, Number(this.lastLatencyFeedback?.strainEma) || 0));
        const cognitiveStrain = Math.max(0, Math.min(1, Number(this.lastCognitiveFeedback?.strainEma) || 0));
        return Math.max(latencyStrain, cognitiveStrain);
    }

    /**
     * Componentes separados del strain para telemetria honesta.
     * @returns {{operational:number,cognitive:number,composite:number}}
     */
    getStrainComponents() {
        const operational = Math.max(0, Math.min(1, Number(this.lastLatencyFeedback?.strainEma) || 0));
        const cognitive = Math.max(0, Math.min(1, Number(this.lastCognitiveFeedback?.strainEma) || 0));
        return { operational, cognitive, composite: Math.max(operational, cognitive) };
    }

    /**
     * Estado cualitativo del strain.
     * @returns {"low"|"medium"|"high"}
     */
    getLatencyStressState() {
        const strain = this.getMetacognitiveStrain();
        if (strain >= 0.65) return 'high';
        if (strain >= 0.35) return 'medium';
        return 'low';
    }

    /**
     * Provides a reinforcement/punishment vector for Kaizen Engine.
     * @returns {{vector: number, targetKey: (string|null), reason: string}}
     */
    getReinforcementVector() {
        const recentFailure = [...this.mutationHistory]
            .reverse()
            .find((m) => m.result === "failure");
        const recentSuccess = [...this.mutationHistory]
            .reverse()
            .find((m) => m.result === "success");

        if (recentFailure) {
            return {
                vector: -1,
                targetKey: recentFailure.mutatedKey,
                reason: "Punishing failed mutation."
            };
        }

        if (recentSuccess) {
            return {
                vector: 1,
                targetKey: recentSuccess.mutatedKey,
                reason: "Reinforcing successful mutation."
            };
        }

        return { vector: 0, targetKey: null, reason: "Neutral." };
    }

    /**
     * Returns runtime integrity status for telemetry/audits.
     * @returns {{status: string, violations: number, reliability: string}}
     */
    getIntegrityReport() {
        const total = this.integrityStats.totalChecks || 1;
        const reliability = 1 - this.integrityStats.violationsDetected / total;
        return {
            status: this.integrityStats.violationsDetected === 0 ? "SOVEREIGN" : "COMPROMISED",
            violations: this.integrityStats.violationsDetected,
            reliability: reliability.toFixed(4),
            metacognitive_strain: this.getMetacognitiveStrain(),
            latency_stress_state: this.getLatencyStressState()
        };
    }
}

export default MetaSovereigntyCheck;

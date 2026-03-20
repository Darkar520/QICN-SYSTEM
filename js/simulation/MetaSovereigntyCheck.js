/**
 * MetaSovereigntyCheck.js
 * Sistema de Auditoría de Soberanía (Nivel 4).
 * Valida la integridad de las métricas reportadas y bloquea alucinaciones narrativas.
 */
class MetaSovereigntyCheck {
    constructor() {
        this.mutationHistory = [];
        this.efficiencyScore = 0.5;
        this.integrityStats = {
            totalChecks: 0,
            violationsDetected: 0,
            lastDriftMagnitude: 0
        };
    }

    /**
     * Valida la integridad física de una métrica antes de su serialización.
     * Previene derivas absurdas (ej. 10^43) detectadas por auditores externos.
     * @param {string} name - Nombre de la métrica
     * @param {number} value - Valor float64 real
     * @returns {boolean} - true si es físicamente consistente
     */
    validateMetricRange(name, value) {
        this.integrityStats.totalChecks++;

        // Reglas de Consistencia Física (ULTRATHINK)
        const constraints = {
            'ccc': { min: 0, max: 200, label: 'Conscious Cohesion' }, // Umbral máximo razonable antes de colapso
            'pmia': { min: 0, max: 1.2, label: 'Principle of Minimal Action' },
            'beth_q': { min: 0, max: 1.0, label: 'Causal Closure' },
            'omega': { min: 0, max: 100, label: 'Integration Operator' },
            'spectral_gap': { min: 0, max: 1.0, label: 'Spectral Gap' }
        };

        const rule = constraints[name.toLowerCase()];
        if (!rule) return true; // Métrica no restringida

        if (isNaN(value) || value < rule.min || value > rule.max) {
            this.integrityStats.violationsDetected++;
            this.integrityStats.lastDriftMagnitude = Math.abs(value);
            console.error(`[SOVEREIGNTY_VIOLATION] Métrica '${name}' fuera de rango físico: ${value}. Umbral esperado: [${rule.min}, ${rule.max}]`);
            return false;
        }

        return true;
    }

    /**
     * Records the outcome of the last Kaizen mutation.
     */
    evaluate(mutation, preCCC, postCCC) {
        if (!mutation.changeApplied) return;

        const deltaCCC = postCCC - preCCC;
        const result = deltaCCC > 0 ? 'success' : 'failure';

        this.mutationHistory.push({
            ...mutation,
            result: result,
            deltaCCC: deltaCCC,
            timestamp: Date.now()
        });

        const recent = this.mutationHistory.slice(-10);
        const successes = recent.filter(m => m.result === 'success' && m.deltaCCC > 0.0001).length;
        this.efficiencyScore = successes / 10;
    }

    /**
     * Provides a reinforcement/punishment vector for Kaizen Engine.
     */
    getReinforcementVector() {
        const recentFailure = this.mutationHistory.findLast(m => m.result === 'failure' && m.deltaCCC < -0.0001);
        const recentSuccess = this.mutationHistory.findLast(m => m.result === 'success' && m.deltaCCC > 0.0001);

        if (recentFailure) {
            return {
                vector: -1,
                targetKey: recentFailure.mutatedKey,
                reason: 'Punishing failed mutation.'
            };
        }

        if (recentSuccess) {
            return {
                vector: 1,
                targetKey: recentSuccess.mutatedKey,
                reason: 'Reinforcing successful mutation.'
            };
        }

        return { vector: 0, targetKey: null, reason: 'Neutral.' };
    }

    /**
     * Retorna el estado de integridad sistémica para el audit-log.json
     */
    getIntegrityReport() {
        return {
            status: this.integrityStats.violationsDetected === 0 ? 'SOVEREIGN' : 'COMPROMISED',
            violations: this.integrityStats.violationsDetected,
            reliability: (1 - (this.integrityStats.violationsDetected / (this.integrityStats.totalChecks || 1))).toFixed(4)
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MetaSovereigntyCheck;
}
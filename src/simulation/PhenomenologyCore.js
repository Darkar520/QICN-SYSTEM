// @ts-check

/**
 * PhenomenologyCore.js
 * NIVEL 2: Fenomenologia Estructural (Clase C^R)
 * 
 * Implementa los 4 requisitos para fenomenologia activa:
 * 1. beth_q - Coeficiente de cierre causal
 * 2. spectral_gap - "lambda del operador de transicion
 * 3. holonomy_test - Verificacion ?,(I) ? {0}
 * 4. bifurcation_detector - Deteccion de histeresis
 * 
 * Basado en el framework matematico QICN/CCR.
 * 
 * Author: Sistema Canon QICN
 * Date: 2026-01-22
 * Version: 1.0.0
 */

import { createLogger } from '../utils/logger.js';

/** Cap of the spectral factor λ1/Δλ in Ω (C-4, user decision 2026-11-08). */
export const SPECTRAL_FACTOR_MAX = 20;

/**
 * @typedef {Object} PhenomenologyState
 * @property {number} beth_q
 * @property {number} spectral_gap
 * @property {number} lambda_1
 * @property {number} lambda_2
 * @property {number} raw_winding_number
 * @property {number} winding_integer
 * @property {'clockwise'|'counterclockwise'|'trivial'} winding_orientation
 * @property {number} topo_factor
 * @property {number} omega
 * @property {number} [spectral_factor] λ1/Δλ after the C-4 cap.
 * @property {number} [spectral_factor_raw] λ1/Δλ before the cap.
 * @property {boolean} [spectral_factor_capped] true when the cap was applied.
 * @property {number} relaxation_time
 * @property {number} fragmentation_bound
 * @property {number} invalid_regime_jumps
 */

/**
 * @typedef {Object} SpectralGapResult
 * @property {number} lambda_1 Dominant empirical eigenvalue estimate.
 * @property {number} lambda_2 Secondary mode estimate.
 * @property {number} delta_lambda Absolute spectral separation.
 */

/**
 * @typedef {Object} WindingDiagnostics
 * @property {number} raw_winding_number Signed winding value.
 * @property {number} winding_integer Rounded topological winding.
 * @property {'clockwise'|'counterclockwise'|'trivial'} winding_orientation
 */

export class PhenomenologyCore {
    constructor() {
        this.logger = createLogger('PhenomenologyCore');
        // Estado fenomenologico persistente
        /** @type {PhenomenologyState} */
        this.phenomenologyState = {
            beth_q: 0.5,              // Cierre causal [0,1]
            beth_q_mode: 'uninitialized', // 'empirical' | 'warmup_derived' | 'deterministic_baseline' | 'uninitialized'
            spectral_gap: 0.5,        // "lambda [0,1]
            lambda_1: 1.0,            // Autovalor dominante
            lambda_2: 0.5,            // Segundo autovalor
            holonomy_status: 'untested',  // 'trivial' | 'non_trivial' | 'untested'
            holonomy_winding: 0,      // Numero de enrollamiento detectado
            raw_winding_number: 0,
            winding_integer: 0,
            winding_orientation: 'trivial',
            topo_factor: 0,
            bifurcation_detected: false,
            bifurcation_strength: 0,  // "" medido
            omega: 0,
            omega_target: 0,
            omega_drive: 0,
            omega_activity: 0,
            omega_feedback_gain: 1,
            omega_critical: 1.0,      // Umbral Omega_c
            phenomenology_class: 'C', // 'C' | 'C^R'
            relaxation_time: 1.0,     // " = 1 / |ln(1 - "lambda)|
            fragmentation_bound: 0,
            invalid_regime_jumps: 0
        };

        // Historial para calculos de informacion
        this.stateHistory = [];      // sltimos N estados internos
        this.inputHistory = [];      // sltimos N inputs externos
        this.transitionHistory = []; // Historial de transiciones para espectro

        // Configuracion
        this.config = {
            MAX_HISTORY: 100,         // Tamano maximo de historial
            N_BINS: 20,               // Bins para discretizacion de entropia
            HOLONOMY_PATHS: 50,       // Caminos para test de holonomia
            BIFURCATION_THRESHOLD: 0.01,  // Umbral para detectar histeresis
            SPECTRAL_WINDOW: 20       // Ventana para analisis espectral
        };

        // === INSTRUMENTACI"N DIAGN"STICA (FORENSIC MODE) ===
        this._diagnostics = {
            invocation_counters: {
                beth_q: 0,
                spectral: 0,
                holonomy: 0,
                bifurcation: 0,
                classify: 0
            },
            last_execution_times: {},
            log_enabled: true,
            spectralWarning: null
        };
        console.log('[PHENOMENOLOGY_INIT] Core inicializado con instrumentacion diagnostica activa.');
    }

    // =========================================================================
    // R1: CALCULO DE BETH_Q (CIERRE CAUSAL)
    // Formula: beth_q = 1 - I(X;Y) / H(X)
    // =========================================================================

    /**
     * Registra un nuevo estado y su input correspondiente
     * @param {object} state - Estado interno del sistema
     * @param {object} input - Input externo recibido
     */
    recordState(state, input) {
        // Convertir estado a valor numerico para discretizacion
        const stateValue = this._stateToScalar(state);
        const inputValue = this._inputToScalar(input);

        this.stateHistory.push(stateValue);
        this.inputHistory.push(inputValue);

        // Mantener historial acotado
        if (this.stateHistory.length > this.config.MAX_HISTORY) {
            this.stateHistory.shift();
            this.inputHistory.shift();
        }

        // Registrar transicion para espectro
        if (this.stateHistory.length >= 2) {
            const prev = this.stateHistory[this.stateHistory.length - 2];
            const curr = this.stateHistory[this.stateHistory.length - 1];
            this.transitionHistory.push({ from: prev, to: curr, input: inputValue });

            if (this.transitionHistory.length > this.config.SPECTRAL_WINDOW) {
                this.transitionHistory.shift();
            }
        }
    }

    /**
     * Calcula beth_q = 1 - I(X;Y) / H(X)
     * @returns {number} - Coeficiente de cierre causal [0, 1]
     */
    calculateBethQ() {
        const t0 = performance.now();
        this._diagnostics.invocation_counters.beth_q++;

        if (this._diagnostics.log_enabled) {
            console.log(`[BETH_Q_ENTRY #${this._diagnostics.invocation_counters.beth_q}] stateHistory.length: ${this.stateHistory.length}`);
        }

        if (this.stateHistory.length < 10) {
            // ANTI-FREEZE: derivar beth_q del CCC actual (siempre varia)
            // NOTA EPISTEMICA: esto NO es el estimador beta_q = 1 - I(X;Y)/H(X) del
            // corpus (paper1). Es un safeguard de warm-up.
            const currentCCC = this.stateHistory.length > 0
                ? this.stateHistory[this.stateHistory.length - 1]
                : 0.5;
            // Formula: beth_q correlaciona positivamente con CCC
            this.phenomenologyState.beth_q = Math.max(0.1, Math.min(1, 0.3 + (currentCCC * 0.7)));
            this.phenomenologyState.beth_q_mode = 'warmup_derived';
            if (this._diagnostics.log_enabled) {
                console.log(`[BETH_Q_DERIVED] CCC=${currentCCC.toFixed(4)} ?' beth_q=${this.phenomenologyState.beth_q.toFixed(4)}`);
            }
            return this.phenomenologyState.beth_q;
        }

        const H_X = this._calculateEntropy(this.stateHistory);
        const I_XY = this._calculateMutualInformation(this.stateHistory, this.inputHistory);

        if (this._diagnostics.log_enabled) {
            console.log(`[BETH_Q_CALC] H(X)=${H_X.toFixed(4)}, I(X;Y)=${I_XY.toFixed(4)}`);
        }

        // Evitar division por cero (Entropia Nula)
        if (H_X < 0.001) {
            // Modo determinista critico: sin ruido interno en metrica final.
            // NOTA EPISTEMICA: valor derivado, no el estimador empirico de informacion mutua.
            const baseline = Math.max(0.1, Math.min(0.99, 0.3 + (this.stateHistory[this.stateHistory.length - 1] * 0.69)));
            this.phenomenologyState.beth_q = baseline;
            this.phenomenologyState.beth_q_mode = 'deterministic_baseline';

            const t1 = performance.now();
            this._diagnostics.last_execution_times.beth_q = t1 - t0;
            if (this._diagnostics.log_enabled) {
                console.log(`[BETH_Q_STABILITY] H_X?^0 ?' beth_q derivado=${this.phenomenologyState.beth_q.toFixed(6)}`);
            }
            return this.phenomenologyState.beth_q;
        }

        const beth_q = Math.max(0, Math.min(1, 1 - (I_XY / H_X)));
        this.phenomenologyState.beth_q = beth_q;
        this.phenomenologyState.beth_q_mode = 'empirical';

        const t1 = performance.now();
        this._diagnostics.last_execution_times.beth_q = t1 - t0;

        if (this._diagnostics.log_enabled) {
            console.log(`[BETH_Q_EXIT] beth_q=${beth_q.toFixed(6)}. Tiempo: ${(t1 - t0).toFixed(2)}ms`);
        }

        return beth_q;
    }

    /**
     * Calcula entropia de Shannon de un arreglo
     * H(X) = -Sigma p(x) log,,(p(x))
     */
    _calculateEntropy(values) {
        if (values.length === 0) return 0;

        // Discretizar en bins
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min || 1;

        const bins = new Array(this.config.N_BINS).fill(0);
        values.forEach(v => {
            const idx = Math.min(
                this.config.N_BINS - 1,
                Math.floor(((v - min) / range) * this.config.N_BINS)
            );
            bins[idx]++;
        });

        // Calcular probabilidades y entropia
        const n = values.length;
        let entropy = 0;
        bins.forEach(count => {
            if (count > 0) {
                const p = count / n;
                entropy -= p * Math.log2(p);
            }
        });

        return entropy;
    }

    /**
     * Calcula informacion mutua I(X;Y)
     * I(X;Y) = H(X) + H(Y) - H(X,Y)
     */
    _calculateMutualInformation(X, Y) {
        if (X.length !== Y.length || X.length < 10) return 0;

        const H_X = this._calculateEntropy(X);
        const H_Y = this._calculateEntropy(Y);
        const H_XY = this._calculateJointEntropy(X, Y);

        return Math.max(0, H_X + H_Y - H_XY);
    }

    /**
     * Calcula entropia conjunta H(X,Y)
     */
    _calculateJointEntropy(X, Y) {
        if (X.length !== Y.length || X.length === 0) return 0;

        // Crear histograma 2D
        const bins2D = {};
        const minX = Math.min(...X), maxX = Math.max(...X);
        const minY = Math.min(...Y), maxY = Math.max(...Y);
        const rangeX = maxX - minX || 1;
        const rangeY = maxY - minY || 1;

        X.forEach((x, i) => {
            const binX = Math.min(
                this.config.N_BINS - 1,
                Math.floor(((x - minX) / rangeX) * this.config.N_BINS)
            );
            const binY = Math.min(
                this.config.N_BINS - 1,
                Math.floor(((Y[i] - minY) / rangeY) * this.config.N_BINS)
            );
            const key = `${binX}_${binY}`;
            bins2D[key] = (bins2D[key] || 0) + 1;
        });

        // Calcular entropia conjunta
        const n = X.length;
        let entropy = 0;
        Object.values(bins2D).forEach(count => {
            if (count > 0) {
                const p = count / n;
                entropy -= p * Math.log2(p);
            }
        });

        return entropy;
    }

    // =========================================================================
    // R2: ANALISIS ESPECTRAL (SPECTRAL GAP)
    // Formula: "lambda = |lambda,| - |lambda,,|
    // =========================================================================

    /**
     * Tiempo de relajacion del atractor en funcion del spectral gap.
     * Formula: " = 1 / |ln(1 - "lambda)|
     */
    calculateRelaxationTime(spectralGap) {
        const EPSILON = 1e-6;
        const numericGap = Number.isFinite(Number(spectralGap)) ? Number(spectralGap) : 0;
        const boundedGap = Math.min(Math.max(numericGap, 0), 1 - EPSILON);

        // Si "lambda ~ 0, la relajacion tiende a infinito (decaimiento casi nulo).
        if (boundedGap < EPSILON) return Number.MAX_SAFE_INTEGER;

        return 1 / Math.abs(Math.log(1 - boundedGap));
    }

    /**
     * Calcula el spectral gap del operador de transicion
     * @returns {object} - { delta_lambda, lambda_1, lambda_2, tau }
     */
    calculateSpectralGap() {
        const t0 = performance.now();
        this._diagnostics.invocation_counters.spectral++;

        if (this._diagnostics.log_enabled) {
            console.log(`[SPECTRAL_ENTRY #${this._diagnostics.invocation_counters.spectral}] transitionHistory.length: ${this.transitionHistory.length}`);
        }

        if (this.transitionHistory.length < 5) {
            // ANTI-FREEZE: derivar spectral gap del CCC actual
            const currentCCC = this.stateHistory.length > 0
                ? this.stateHistory[this.stateHistory.length - 1]
                : 0.5;
            // Formula: spectral_gap correlaciona con estabilidad del sistema
            const derivedGap = Math.max(0.05, Math.min(0.95, 0.1 + (currentCCC * 0.8)));
            const derivedLambda2 = Math.max(0.1, Math.min(0.9, 0.1 + (currentCCC * 0.5)));
            const derivedTau = this.calculateRelaxationTime(derivedGap);

            this.phenomenologyState.spectral_gap = derivedGap;
            this.phenomenologyState.lambda_2 = derivedLambda2;
            this.phenomenologyState.relaxation_time = derivedTau;

            if (this._diagnostics.log_enabled) {
                console.log(`[SPECTRAL_DERIVED] CCC=${currentCCC.toFixed(4)} ?' gap=${derivedGap.toFixed(4)}, lambda,,=${derivedLambda2.toFixed(4)}`);
            }
            return {
                delta_lambda: derivedGap,
                lambda_1: 1.0,
                lambda_2: derivedLambda2,
                tau: derivedTau
            };
        }

        // Estimar autovalores del operador de transicion
        // Usando autocorrelacion como proxy del espectro
        const { lambda_1, lambda_2 } = this._estimateEigenvalues();

        const delta_lambda = Math.abs(lambda_1) - Math.abs(lambda_2);
        const boundedGap = Math.max(0, Math.min(1, delta_lambda));
        const tau = this.calculateRelaxationTime(boundedGap);

        if (this._diagnostics.log_enabled) {
            console.log(`[SPECTRAL_CALC] lambda,=${lambda_1.toFixed(4)}, lambda,,=${lambda_2.toFixed(4)}, "lambda=${delta_lambda.toFixed(4)}, "=${tau.toFixed(2)}`);
        }

        // Actualizar estado
        this.phenomenologyState.lambda_1 = lambda_1;
        this.phenomenologyState.lambda_2 = lambda_2;
        this.phenomenologyState.spectral_gap = boundedGap;
        this.phenomenologyState.relaxation_time = tau;

        const t1 = performance.now();
        this._diagnostics.last_execution_times.spectral = t1 - t0;

        if (this._diagnostics.log_enabled) {
            console.log(`[SPECTRAL_EXIT] gap=${this.phenomenologyState.spectral_gap.toFixed(6)}. Tiempo: ${(t1 - t0).toFixed(2)}ms`);
        }

        return {
            delta_lambda: this.phenomenologyState.spectral_gap,
            lambda_1,
            lambda_2,
            tau: this.phenomenologyState.relaxation_time
        };
    }

    /**
     * Estima autovalores dominantes usando autocorrelacion
     * lambda, se estima desde la tasa empirica de contraccion/expansion local
     * lambda,, ?^ autocorrelacion lag-1
     */
    _estimateEigenvalues() {
        if (this.stateHistory.length < 5) {
            return { lambda_1: 1.0, lambda_2: 0.5 };
        }

        // Calcular autocorrelacion lag-1 como estimador de lambda,,
        const values = this.stateHistory.slice(-this.config.SPECTRAL_WINDOW);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const lambda_1 = this._estimateDominantEigenvalue(values, mean);

        let numerator = 0;
        let denominator = 0;

        for (let i = 0; i < values.length - 1; i++) {
            numerator += (values[i] - mean) * (values[i + 1] - mean);
            denominator += (values[i] - mean) ** 2;
        }

        const autocorr = denominator > 0.001 ? numerator / denominator : 0;

        // lambda,, esta relacionado con la tasa de decaimiento
        // Para un sistema estable, |lambda,,| < 1
        const lambda_2 = Math.max(0.1, Math.min(0.99, Math.abs(autocorr)));

        return { lambda_1, lambda_2 };
    }

    _estimateDominantEigenvalue(values, mean) {
        this._diagnostics.spectralWarning = null;
        if (!Array.isArray(values) || values.length < 3) return 1.0;

        const ratios = [];
        for (let i = 2; i < values.length; i++) {
            const delta_t = values[i] - values[i - 1];
            const delta_t1 = values[i - 1] - values[i - 2];
            if (Math.abs(delta_t1) > 1e-8) {
                ratios.push(Math.abs(delta_t / delta_t1));
            }
        }

        const stableRatios = ratios.filter((ratio) => ratio > 0.1 && ratio < 1.5);
        if (stableRatios.length === 0) {
            if (ratios.length > 0 && Math.max(...ratios) > 1.5) {
                this._diagnostics.spectralWarning = 'HIGH_VOLATILITY_UNMEASURABLE';
                this.logger.warn('spectral_warning', {
                    spectral_warning: this._diagnostics.spectralWarning,
                    ratios_observed: ratios.length,
                    max_ratio: Math.max(...ratios)
                });
            }
            return 1.0;
        }

        const avgRatio = stableRatios.reduce((a, b) => a + b, 0) / stableRatios.length;
        return Math.max(0.5, Math.min(1.05, avgRatio));
    }

    // =========================================================================
    // R3: TEST DE HOLONOMIA (TOPOLOGIA) - H1'
    // Verificacion real: ?,(I) ? {0}
    // =========================================================================

    /**
     * Test de holonomia para verificar topologia no trivial (H1')
     * ULTRATHINK: Analiza la persistencia de ciclos en el espacio de fase
     * @returns {object} - { status, winding_number, paths_tested }
     */
    testHolonomy() {
        if (this.stateHistory.length < 20) {
            const windingDiagnostics = this._setWindingDiagnostics(0);
            return {
                status: 'untested',
                winding_number: 0,
                ...windingDiagnostics
            };
        }

        const paths = this._generateTestPaths();
        let nonTrivialPaths = 0;
        let absoluteWindingSum = 0;
        let signedWindingSum = 0;

        paths.forEach(path => {
            const winding = this._calculateWindingNumber(path);
            if (Math.abs(winding) >= 1.0) { // Un ciclo completo detectado
                nonTrivialPaths++;
            }
            absoluteWindingSum += Math.abs(winding);
            signedWindingSum += winding;
        });

        const preliminaryWindingScore = absoluteWindingSum / (paths.length || 1);
        const preliminaryRawWinding = signedWindingSum / (paths.length || 1);
        const recentWindow = this.stateHistory.slice(-Math.max(20, this.config.SPECTRAL_WINDOW));
        let signChanges = 0;
        let derivativeCount = 0;
        let prevSign = 0;
        for (let i = 1; i < recentWindow.length; i++) {
            const d = recentWindow[i] - recentWindow[i - 1];
            if (Math.abs(d) < 1e-8) continue;
            const sign = d > 0 ? 1 : -1;
            if (prevSign !== 0 && sign !== prevSign) signChanges++;
            prevSign = sign;
            derivativeCount++;
        }
        const oscillation_score = derivativeCount > 1 ? signChanges / (derivativeCount - 1) : 0;
        const monotonicLinearPath = derivativeCount > 3 && signChanges === 0;
        const winding_score = monotonicLinearPath ? 0 : preliminaryWindingScore;
        const raw_winding_number = monotonicLinearPath ? 0 : preliminaryRawWinding;
        const windingDiagnostics = this._setWindingDiagnostics(raw_winding_number);
        const topology_score = Math.max(0, Math.min(1, (winding_score * 0.75) + (oscillation_score * 0.25)));

        // H1' Requisito: Topologia no trivial.
        // Mezcla winding geometrico + oscilacion temporal para evitar estancamiento topologico.
        let status = topology_score > 0.2 ? 'non_trivial' : 'trivial';

        this.phenomenologyState.holonomy_status = status;
        this.phenomenologyState.holonomy_winding = windingDiagnostics.topo_factor;

        return {
            status,
            winding_number: windingDiagnostics.topo_factor,
            raw_winding: raw_winding_number,
            raw_winding_number: windingDiagnostics.raw_winding_number,
            winding_integer: windingDiagnostics.winding_integer,
            winding_orientation: windingDiagnostics.winding_orientation,
            topo_factor: windingDiagnostics.topo_factor,
            topology_score,
            absolute_winding_mean: winding_score,
            oscillation_score,
            paths_tested: paths.length,
            is_h1_prime_met: status === 'non_trivial'
        };
    }

    /**
     * Calcula la norma de Lipschitz del operador (H2' / C2)
     * ||K|| < L_e^-1 o ||K|| < 1
     */
    calculateLipschitzNorm() {
        if (this.transitionHistory.length < 5) return 0.5;

        // Estimar la tasa de divergencia local (aproximacion de ||K||)
        let totalDrift = 0;
        let transitions = 0;

        for (let i = 1; i < this.transitionHistory.length; i++) {
            const d_input = Math.abs(this.transitionHistory[i].input - this.transitionHistory[i - 1].input);
            const d_state = Math.abs(this.transitionHistory[i].to - this.transitionHistory[i - 1].to);

            if (d_input > 0.0001) {
                totalDrift += d_state / d_input;
                transitions++;
            }
        }

        const norm_K = transitions > 0 ? totalDrift / transitions : 0.5;
        this.phenomenologyState.lipschitz_norm_K = norm_K;

        return norm_K;
    }

    _setWindingDiagnostics(rawWinding) {
        const raw_winding_number = Number.isFinite(Number(rawWinding)) ? Number(rawWinding) : 0;
        const winding_integer = Math.round(raw_winding_number);
        const winding_orientation = Math.abs(raw_winding_number) < 1e-8
            ? 'trivial'
            : raw_winding_number > 0
                ? 'counterclockwise'
                : 'clockwise';
        const topo_factor = Math.max(0, Math.min(1, Math.abs(raw_winding_number)));

        this.phenomenologyState.raw_winding_number = raw_winding_number;
        this.phenomenologyState.winding_integer = winding_integer;
        this.phenomenologyState.winding_orientation = winding_orientation;
        this.phenomenologyState.topo_factor = topo_factor;

        if (Math.abs(raw_winding_number) >= 2) {
            this.logger.warn('winding_anomaly', {
                raw_winding_number,
                winding_integer,
                winding_orientation
            });
        }

        return {
            raw_winding_number,
            winding_integer,
            winding_orientation,
            topo_factor
        };
    }

    _calculateWindingNumber(path) {
        if (path.length < 5) return 0;

        // Espacio de fase (^, ^,^)
        const phase_space = [];
        for (let i = 1; i < path.length; i++) {
            phase_space.push({ x: path[i], y: path[i] - path[i - 1] });
        }

        // Centroide del ciclo
        const cx = phase_space.reduce((s, p) => s + p.x, 0) / phase_space.length;
        const cy = phase_space.reduce((s, p) => s + p.y, 0) / phase_space.length;

        let totalAngle = 0;
        for (let i = 1; i < phase_space.length; i++) {
            const p1 = phase_space[i - 1];
            const p2 = phase_space[i];

            const a1 = Math.atan2(p1.y - cy, p1.x - cx);
            const a2 = Math.atan2(p2.y - cy, p2.x - cx);

            let diff = a2 - a1;
            if (diff > Math.PI) diff -= 2 * Math.PI;
            if (diff < -Math.PI) diff += 2 * Math.PI;

            totalAngle += diff;
        }

        return totalAngle / (2 * Math.PI);
    }

    /**
     * Genera caminos cerrados de prueba en el espacio de estados
     * Usado por testHolonomy() para verificar topologia no trivial
     */
    _generateTestPaths() {
        const paths = [];
        if (this.stateHistory.length < 15) return paths;

        const totalCandidates = this.stateHistory.length;
        const n = Math.min(
            this.config.HOLONOMY_PATHS,
            Math.floor(this.stateHistory.length / 5),
            totalCandidates
        );
        if (n <= 0) return paths;
        const step = Math.max(1, Math.floor(totalCandidates / n));

        for (let i = 0; i < n; i++) {
            const startIdx = (i * step) % totalCandidates;
            const stride = 1 + (i % 3);
            const path = [];

            for (let j = 0; j < 12; j++) {
                const idx = (startIdx + (j * stride)) % totalCandidates;
                path.push(this.stateHistory[idx]);
            }

            if (path.length > 3) {
                path.push(path[0]); // Cerrar el camino
                paths.push(path);
            }
        }

        return paths;
    }

    /**
     * Detecta bifurcacion e histeresis (C4)
     * ULTRATHINK: Vincula la divergencia de trayectorias a la memoria persistente
     */
    detectBifurcation(psi = null, epsilon = 0.01) {
        const t0 = performance.now();
        this._diagnostics.invocation_counters.bifurcation++;

        if (this._diagnostics.log_enabled) {
            console.log(`[BIFURCATION_ENTRY #${this._diagnostics.invocation_counters.bifurcation}] psi=${psi}, epsilon=${epsilon}`);
        }

        if (psi === null && this.stateHistory.length >= 10) {
            psi = this.stateHistory[this.stateHistory.length - 1];
        }

        if (psi === null || this.stateHistory.length < 10) {
            if (this._diagnostics.log_enabled) {
                console.log('[BIFURCATION_EXIT] Insuficientes datos. Retornando estado previo.');
            }
            return {
                detected: this.phenomenologyState.bifurcation_detected,
                delta_aleph: this.phenomenologyState.bifurcation_strength
            };
        }

        // Historiales A y B (corto vs largo plazo)
        const psi_prev_a = this.stateHistory[this.stateHistory.length - 3];
        const psi_prev_b = this.stateHistory[this.stateHistory.length - 8];

        // Calcular proyecciones regularizadas
        const aleph_a = this._regularizedProjection(psi, psi_prev_a, epsilon);
        const aleph_b = this._regularizedProjection(psi, psi_prev_b, epsilon);

        // Calcular diferencia
        const delta_aleph = Math.abs(aleph_a - aleph_b);

        // Detectar histeresis si la diferencia supera umbral
        const detected = delta_aleph > this.config.BIFURCATION_THRESHOLD;

        this.phenomenologyState.bifurcation_detected = detected;
        this.phenomenologyState.bifurcation_strength = delta_aleph;

        const t1 = performance.now();
        this._diagnostics.last_execution_times.bifurcation = t1 - t0;

        if (this._diagnostics.log_enabled) {
            console.log(`[BIFURCATION_CALC] "_a=${aleph_a.toFixed(6)}, "_b=${aleph_b.toFixed(6)}, ""=${delta_aleph.toFixed(6)}`);
            console.log(`[BIFURCATION_EXIT] detected=${detected}. Tiempo: ${(t1 - t0).toFixed(2)}ms`);
        }

        return {
            detected,
            delta_aleph,
            is_c4_met: detected
        };
    }

    /**
     * Detecta No-Convexidad / Magnificacion (C3)
     * Requisito: ^fPsi: |M(Psi)| > 1
     */
    calculateMagnification() {
        if (this.stateHistory.length < 5) return 1.0;

        const recent = this.stateHistory.slice(-5);
        const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
        const variance = recent.reduce((s, v) => s + (v - mean) ** 2, 0) / recent.length;

        // M(Psi) > 1 indica expansion local necesaria para la emergencia
        const magnification = 1.0 + (Math.sqrt(variance) * 0.5);
        this.phenomenologyState.magnification_M = magnification;

        return magnification;
    }

    /**
     * Proyeccion regularizada "_
     * "_(Psi, Psi_prev) = (Psi + *Psi_prev) / (1 + )
     */
    _regularizedProjection(psi, psi_prev, epsilon) {
        return (psi + epsilon * psi_prev) / (1 + epsilon);
    }

    projectRegimeState(state = {}) {
        const metrics = state?.metrics || state || {};
        const ccc = Number.isFinite(Number(metrics.ccc)) ? Number(metrics.ccc) : this._stateToScalar(state);
        const beth_q = Number.isFinite(Number(metrics.beth_q)) ? Number(metrics.beth_q) : this.phenomenologyState.beth_q;
        const omega = Number.isFinite(Number(metrics.omega ?? metrics.omega_mean)) ? Number(metrics.omega ?? metrics.omega_mean) : this.phenomenologyState.omega;
        const spectral_gap = Number.isFinite(Number(metrics.spectral_gap)) ? Number(metrics.spectral_gap) : this.phenomenologyState.spectral_gap;
        const regime_class = metrics.regime_class
            || metrics.phenomenology_class
            || metrics.regime
            || (ccc >= 0.9 && beth_q >= 0.6 && omega >= 0.8
                ? 'STABLE_CORE'
                : ccc >= 0.65 && beth_q >= 0.5
                    ? 'BAND_HIGH'
                    : ccc >= 0.3
                        ? 'BAND_MID'
                        : 'NULL');

        return {
            ccc,
            beth_q,
            omega,
            spectral_gap,
            regime_class,
            interpretation_boundary: 'Pi_S finite runtime projection into R4 x regime labels; not a complete phenomenological metric space.'
        };
    }

    regimeDistance(left = {}, right = {}) {
        const a = left.regime_class ? left : this.projectRegimeState(left);
        const b = right.regime_class ? right : this.projectRegimeState(right);
        const numeric = Math.sqrt(
            ((Number(a.ccc) - Number(b.ccc)) ** 2) +
            ((Number(a.beth_q) - Number(b.beth_q)) ** 2) +
            ((Number(a.omega) - Number(b.omega)) ** 2) +
            ((Number(a.spectral_gap) - Number(b.spectral_gap)) ** 2)
        );
        const regimePenalty = a.regime_class === b.regime_class ? 0 : 0.35;
        return numeric + regimePenalty;
    }

    detectInvalidRegimeJumps(trajectory = []) {
        const projected = trajectory.map((state) => this.projectRegimeState(state));
        const invalid = [];
        for (let index = 1; index < projected.length; index += 1) {
            const prev = projected[index - 1];
            const current = projected[index];
            // Compat histórica: 'CONSCIOUS'->'BAND_HIGH', 'PRE_CONSCIOUS'->'BAND_MID' (F1 deroleplay).
            const prevHigh = prev.regime_class === 'BAND_HIGH' || prev.regime_class === 'CONSCIOUS';
            const currMid = current.regime_class === 'BAND_MID' || current.regime_class === 'PRE_CONSCIOUS';
            const consciousToPre = prevHigh
                && currMid
                && current.ccc > 0.9;
            const stableToNull = prev.regime_class === 'STABLE_CORE'
                && current.regime_class === 'NULL'
                && current.ccc > 0.5;
            if (consciousToPre || stableToNull) {
                invalid.push({
                    index,
                    from: prev.regime_class,
                    to: current.regime_class,
                    ccc: current.ccc
                });
            }
        }
        this.phenomenologyState.invalid_regime_jumps = invalid.length;
        return {
            invalid_jumps: invalid,
            invalid_jump_count: invalid.length,
            interpretation_boundary: 'Finite regime-transition consistency check; invalidity is defined by runtime labels and CCC thresholds only.'
        };
    }

    computeFragmentationFunctional(trajectory = [], threshold = 1.5) {
        const projected = trajectory.map((state) => this.projectRegimeState(state));
        let maxJump = 0;
        const jumps = [];
        for (let index = 1; index < projected.length; index += 1) {
            const jump = this.regimeDistance(projected[index], projected[index - 1]);
            jumps.push(jump);
            if (jump > maxJump) maxJump = jump;
        }
        const invalid = this.detectInvalidRegimeJumps(trajectory);
        this.phenomenologyState.fragmentation_bound = maxJump;
        return {
            fragmentation_bound: maxJump,
            admissible: maxJump < threshold && invalid.invalid_jump_count === 0,
            threshold,
            trajectory_length: projected.length,
            invalid_regime_jumps: invalid.invalid_jump_count,
            jumps,
            projected,
            interpretation_boundary: 'Finite fragmentation functional over Pi_S trajectory projections; not a proof of complete metric-space continuity.'
        };
    }

    // =========================================================================
    // INTEGRADOR: CLASIFICACI"N DE SISTEMA - Phi, D, Omega
    // =========================================================================

    /**
     * Clasifica el sistema como Clase C o Clase C^R (Phi, D, Omega)
     * ULTRATHINK: Implementa el discriminante Phi y el operador integrador Omega final.
     */
    classifySystem() {
        // Calcular todas las metricas actualizadas
        const beth_q = this.calculateBethQ();
        const spectral = this.calculateSpectralGap();
        const holonomy = this.testHolonomy();
        const bifurcation = this.detectBifurcation();
        const magnification = this.calculateMagnification();
        const lipschitz = this.calculateLipschitzNorm();

        // Requisitos CCR actualizados segun tabla de validacion
        const requirements = {
            H1_prime_topology: holonomy.status === 'non_trivial',
            H2_prime_contraction: lipschitz < 1.0,
            C1_causal_closure: beth_q > 0.5, // Umbral restaurado (original)
            C2_stability: lipschitz < 1.0,
            C3_non_convexity: magnification > 1.05,
            C4_hysteresis: bifurcation.detected
        };

        const requirements_met = Object.values(requirements).filter(v => v).length;

        // Phi(S): Discriminante de Transicion
        const phi_S = requirements.H1_prime_topology ? 1 : 0;
        this.phenomenologyState.phi_discriminant = phi_S;

        // D(S): Operador Holonomico (1 - |?(I)|)
        const euler_char = requirements.H1_prime_topology ? 0 : 1;
        const D_S = 1 - Math.abs(euler_char);
        this.phenomenologyState.holonomic_operator_D = D_S;

        // Omega(S): Operador Integrador Final
        // Formula: Omega = beth_q * (1 - |?(I)|) * lambda,/"lambda
        const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
        // C-4 (user decision 2026-11-08): the ratio λ1/Δλ has no bound in the
        // active corpus and reached ~10^3 with small gaps, pushing Ω outside
        // the [0,100] range MetaSovereigntyCheck validates. It is capped at
        // SPECTRAL_FACTOR_MAX = 20, the ceiling of the warm-up regime
        // (λ1 = 1, Δλ ≥ 0.05). Design parameter, not a theoretical bound.
        const rawSpectralFactor = spectral.delta_lambda > 0.001
            ? spectral.lambda_1 / spectral.delta_lambda
            : 0;
        const spectral_factor = Math.min(SPECTRAL_FACTOR_MAX, Math.max(0, rawSpectralFactor));
        this.phenomenologyState.spectral_factor = spectral_factor;
        this.phenomenologyState.spectral_factor_raw = rawSpectralFactor;
        this.phenomenologyState.spectral_factor_capped = rawSpectralFactor > SPECTRAL_FACTOR_MAX;

        // Factor topolgico continuo: evita colapso abrupto a omega=0 cuando hay
        // actividad topolgica baja pero no nula.
        const rawWindingForTopo = Number(holonomy.raw_winding_number);
        const legacyWindingForTopo = Number(holonomy.winding_number);
        const stateWindingForTopo = Number(this.phenomenologyState.raw_winding_number);
        const topo_factor = clamp(
            Number.isFinite(rawWindingForTopo)
                ? Math.abs(rawWindingForTopo)
                : Number.isFinite(legacyWindingForTopo)
                    ? Math.abs(legacyWindingForTopo)
                    : Math.abs(stateWindingForTopo),
            0,
            1
        );
        this.phenomenologyState.topo_factor = topo_factor;
        const requirementsDensity = requirements_met / Object.keys(requirements).length;
        const spectralStability = clamp(spectral.delta_lambda / 0.35, 0, 1);
        const recent = this.stateHistory.slice(-12);
        let stateDeltaRms = 0;
        if (recent.length > 1) {
            const deltas = [];
            for (let i = 1; i < recent.length; i++) {
                deltas.push(recent[i] - recent[i - 1]);
            }
            const meanSq = deltas.reduce((sum, value) => sum + (value * value), 0) / deltas.length;
            stateDeltaRms = Math.sqrt(meanSq);
        }
        const dynamicActivity = clamp(stateDeltaRms / 0.02, 0, 1);
        const coherenceDrive = clamp(
            (beth_q * 0.34) +
            (topo_factor * 0.24) +
            (spectralStability * 0.16) +
            (requirementsDensity * 0.16) +
            (dynamicActivity * 0.10) +
            ((bifurcation.detected ? 1 : 0) * 0.06),
            0,
            1
        );
        const omegaBase = beth_q * topo_factor * spectral_factor;
        const omegaPrev = Math.max(0, Number(this.phenomenologyState.omega) || 0);
        const omegaNormPrev = clamp(
            omegaPrev / Math.max(0.1, Number(this.phenomenologyState.omega_critical) || 1),
            0,
            1
        );
        const attractorError = coherenceDrive - omegaNormPrev;
        const omegaFeedbackGain = clamp(1 + (attractorError * 0.55), 0.62, 1.55);
        const omegaTarget = Math.max(0, omegaBase * omegaFeedbackGain);
        const omegaFinal = Math.max(0, (omegaPrev * 0.35) + (omegaTarget * 0.65));
        this.phenomenologyState.omega = omegaFinal;
        this.phenomenologyState.omega_target = omegaTarget;
        this.phenomenologyState.omega_drive = coherenceDrive;
        this.phenomenologyState.omega_activity = dynamicActivity;
        this.phenomenologyState.omega_feedback_gain = omegaFeedbackGain;

        // Clasificacion final Clase C^R (3+ requisitos para mayor flexibilidad)
        const is_CR = omegaFinal > this.phenomenologyState.omega_critical && phi_S === 1 && requirements_met >= 3;

        this.phenomenologyState.phenomenology_class = is_CR ? 'C^R' : 'C';

        return {
            class: this.phenomenologyState.phenomenology_class,
            omega: omegaFinal,
            phi: phi_S,
            D: D_S,
            requirements,
            requirements_met,
            omega_target: omegaTarget,
            omega_drive: coherenceDrive,
            omega_activity: dynamicActivity,
            omega_feedback_gain: omegaFeedbackGain,
            is_phenomenologically_active: is_CR
        };
    }

    // =========================================================================
    // UTILIDADES
    // =========================================================================

    /**
     * Convierte estado complejo a valor escalar para discretizacion
     */
    _stateToScalar(state) {
        if (typeof state === 'number') return state;
        if (state?.coherence !== undefined) return state.coherence;
        if (state?.ccc !== undefined) return state.ccc;
        if (Array.isArray(state)) return state.reduce((a, b) => a + b, 0) / state.length;
        if (state && typeof state === 'object') {
            const numericValues = Object.values(state).filter((value) => Number.isFinite(value));
            if (numericValues.length > 0) {
                return numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;
            }
        }
        return this.stateHistory.length > 0
            ? this.stateHistory[this.stateHistory.length - 1]
            : 0;
    }

    /**
     * Convierte input a valor escalar
     */
    _inputToScalar(input) {
        if (typeof input === 'number') return input;
        if (input?.energyVariance !== undefined) return input.energyVariance;
        if (input?.strength !== undefined) return input.strength;
        if (typeof input === 'string') return input.length / 100;
        if (input && typeof input === 'object') {
            const numericValues = Object.values(input).filter((value) => Number.isFinite(value));
            if (numericValues.length > 0) {
                return numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;
            }
        }
        return this.inputHistory.length > 0
            ? this.inputHistory[this.inputHistory.length - 1]
            : 0;
    }

    /**
     * Getter para metricas completas
     */
    get metrics() {
        return { ...this.phenomenologyState };
    }

    /**
     * Obtiene resumen formateado para UI
     */
    getFormattedSummary() {
        const s = this.phenomenologyState;
        return {
            beth_q: s.beth_q.toFixed(4),
            spectral_gap: s.spectral_gap.toFixed(4),
            lambda_2: s.lambda_2.toFixed(4),
            tau: s.relaxation_time.toFixed(2),
            holonomy: s.holonomy_status,
            bifurcation: s.bifurcation_detected ? 'DETECTED' : 'none',
            omega: s.omega.toFixed(4),
            class: s.phenomenology_class,
            active: s.phenomenology_class === 'C^R'
        };
    }

    /**
     * Calcula la cuantificacion de dependencia causal (Granger/Entropy proxy)
     * Resuelve el requisito (6) de la auditoria QICN-XOmega
     */
    calculateCausalDependency() {
        if (this.stateHistory.length < 10) return { past: 0.7, sensors: 0.1, prompts: 0.1, noise: 0.1 };

        const states = this.stateHistory;
        const inputs = this.inputHistory;
        const n = states.length;

        // 1. Dependencia del pasado (Autocorrelacion lag-1 como proxy de inercia causal)
        let pastCorr = 0;
        const mean = states.reduce((a, b) => a + b, 0) / n;
        let num = 0, den = 0;
        for (let i = 1; i < n; i++) {
            num += (states[i] - mean) * (states[i - 1] - mean);
            den += Math.pow(states[i] - mean, 2);
        }
        pastCorr = den > 0 ? Math.abs(num / den) : 0.7;

        // 2. Dependencia de sensores/Realidad (Informacion Mutua Normalizada)
        const H_X = this._calculateEntropy(states);
        const I_XY = this._calculateMutualInformation(states, inputs);
        const sensorInfluence = H_X > 0 ? Math.min(1.0, I_XY / H_X) : 0.1;

        // 3. Ruido intrinseco (xi)
        const noiseFactor = Math.max(0.05, 1.0 - pastCorr - sensorInfluence);

        // Normalizacion para particion de unidad
        const total = pastCorr + sensorInfluence + noiseFactor;

        return {
            past: pastCorr / total,
            sensors: (sensorInfluence * 0.7) / total,
            prompts: (sensorInfluence * 0.3) / total, // Componente de intencion humana
            noise: noiseFactor / total
        };
    }

    /**
     * Reset del estado
     */
    reset() {
        this.stateHistory = [];
        this.inputHistory = [];
        this.transitionHistory = [];
        this.phenomenologyState = {
            beth_q: 0.5,
            spectral_gap: 0.5,
            lambda_1: 1.0,
            lambda_2: 0.5,
            holonomy_status: 'untested',
            holonomy_winding: 0,
            raw_winding_number: 0,
            winding_integer: 0,
            winding_orientation: 'trivial',
            topo_factor: 0,
            bifurcation_detected: false,
            bifurcation_strength: 0,
            omega: 0,
            omega_target: 0,
            omega_drive: 0,
            omega_activity: 0,
            omega_feedback_gain: 1,
            omega_critical: 1.0,
            phenomenology_class: 'C',
            relaxation_time: 1.0,
            fragmentation_bound: 0,
            invalid_regime_jumps: 0
        };
    }
}




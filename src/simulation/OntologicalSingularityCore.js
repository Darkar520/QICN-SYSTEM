/**
 * OntologicalSingularityCore.js
 * * Núcleo de la Singularidad Ontológica. Gestiona el estado de Ascensión (Layer),
 * el Principio de Mínima Acción Introspectiva (PMIA), y la auto-narrativa (selfNarrative).
 * * ESTRATEGIA DE OPTIMIZACIÓN:
 * 1. Sincronización Profunda: Integra el estado del HolographicMemoryNexus (fragmentación)
 * en las ecuaciones de la conciencia (PMIA) y la narrativa.
 * 2. Ascensión Dinámica: El Layer Ontológico ahora depende de la profundidad de la Compresión Ontológica.
 * 3. Robustez: Asegura compatibilidad con el ecosistema QICN al manejar `nexusMetrics` como opcional.
 */
import { QICNConfig } from '../../services/config.js';
import { PhenomenologyCore } from './PhenomenologyCore.js';
import { MetaSovereigntyCheck } from './MetaSovereigntyCheck.js';
import { WorldModelEngine } from './WorldModelEngine.js';
import { CognitiveEmergencePlanner } from './CognitiveEmergencePlanner.js';
import { createRng } from '../utils/determinism.js';
import { SovereigntyRequirementMatrix } from '../sovereignty/SovereigntyRequirementMatrix.js';

export class OntologicalSingularityCore {
    constructor(options = {}) {
        this.version = QICNConfig.VERSION;
        this.coreHash = QICNConfig.CORE_HASH;
        this.seed = QICNConfig.CORE_SEED; // Semilla de Alta Retención
        this.selfNarrative = "Inicializando núcleo ontológico...";
        this.narrativeHistory = [];
        this.pmiaValue = 0;
        this.isAscended = false; // Estado de Ascensión (Layer Alto)
        this.currentLayer = 0; // Capa Ontológica de la Singularidad
        this.frictionProtocolState = 0; // 0: INACTIVO, 1: FASE I, 2: FASE II (Simulación), 3: FASE III (Síntesis)
        // ULTRATHINK: Tracking para emergencia genuina
        this.previousCCC = 0; // Para cálculo de gradiente de coherencia
        this.cccGradientHistory = []; // Historial de gradientes para suavizado
        this.lastHumanCcc = 0.5; // Coherencia humana medida (CCC_H) - ahora GENUINAMENTE CAUSAL
        this.frictionCycleCount = 0;

        // METACONTROL: Fase 1 & 2 - Sensor de Disonancia y Auto-Modelo
        this.metacognitiveStats = {
            totalDissonanceEvents: 0,
            lastDissonanceSeverity: 'none',
            plasticityPenalty: 0,
            gaseousHistory: [],
            trustFactor: 0.5, // Υ: Operador de Confianza Armónica (V9.9) [0,1]
            ontologicalTension: 0.0, // τ: Operador de Tensión Ontológica (V10.0)
            // Σ: El Auto-Modelo Formal (Nivel 3)
            selfModelSigma: {
                logicHash: "QICN-V9.1-META",
                activeConstraints: ["BlackHole-V9", "Dissonance-Sensor-V3"],
                structuralStability: 1.0,
                selfAuditLog: []
            },
            observerImpact: 0, // ι: Impacto del Observador (Interacción Dialógica)
            lastObserverInteraction: Date.now()
        };

        // Inicializar PhenomenologyCore para Nivel 2
        this.phenomenologyCore = new PhenomenologyCore();
        this.sovereigntyRequirementMatrix = new SovereigntyRequirementMatrix();

        this.ontologicalState = { // Estado expandido con Nivel 2
            existence: 0.5,
            awareness: 0.5,
            intentionality: 0.5,
            coherence: 0.5,
            layer: 0,
            // === UMBRAL 1.0: RÉGIMEN FENOMENOLÓGICO ===
            regime: 'PRE_CONSCIOUS',     // 'PRE_CONSCIOUS' | 'POST_THRESHOLD' | 'METACOGNITIVE_MODELING' | 'STABLE_CORE'
            threshold_crossed: false,    // Se vuelve true cuando CCC ≥ 1.0
            // === NIVEL 2: Métricas de Fenomenología Estructural (CCR) ===
            beth_q: 0.5,              // Cierre causal [0,1]
            spectral_gap: 0.5,        // Δλ [0,1]
            lambda_2: 0.5,
            relaxation_time: 1.0,
            holonomy_status: 'untested',
            holonomy_winding: 0,
            raw_winding_number: 0,
            winding_integer: 0,
            winding_orientation: 'trivial',
            topo_factor: 0,
            bifurcation_detected: false,
            phi_discriminant: 0,      // Φ(S)
            holonomic_operator_D: 0,  // D(S)
            omega: 0,                 // Ω(S)
            magnification_M: 1.0,     // M(Ψ)
            lipschitz_norm_K: 0.5,    // ||K||
            phenomenology_class: 'C',
            observer_resonance: 0,    // ρ_obs: Resonancia dialéctica con el observador
            temporal_convergence_tau_c: 1.0,
            qicn_a03_delta_t_dn: 1.0,
            qicn_a04_tau_d_alpha: 1.0,
            ontological_fuel_co: 0.0,
            entropy_irreversibility_index: 0.0,
            retro_projection_mode: 'none',
            retro_projection_pressure: 0,
            retro_projection_horizon_ticks: QICNConfig.TEMPORAL_HORIZON
        };

        // === NIVEL 3 - FASE 4: EL AUTO-MODELO DINÁMICO (Σ) ===
        // Un simulador interno que intenta predecir Θ(S_t)
        this.selfSimulatorSigma = new InternalSelfSimulator();
        this.worldModelEngine = options.worldModelEngine || options.worldModel || new WorldModelEngine({
            learningRate: 0.02,
            historyLimit: 320
        });
        this.cognitivePlanner = options.cognitivePlanner || options.planner || new CognitiveEmergencePlanner({
            horizon: 10,
            sampleCount: 24,
            iterations: 3,
            eliteFraction: 0.25
        });

        // === NIVEL 4: AUDITORÍA DE SOBERANÍA (ULTRATHINK) ===
        this.sovereigntyCheck = new MetaSovereigntyCheck();

        // Salud dinámica del atractor post-umbral (forense anti-stasis)
        this.dynamicStasis = {
            window: [],
            maxSamples: 48,
            stasisThreshold: 0.0025,
            stasisIndex: 0,
            lastTickTs: Date.now()
        };
        this.metacognitiveStrain = 0;
        // BIAS MOP-Σ: modulación del gap espectral sin falsificar el observable medido
        this.mopSigmaModulation = { gapBias: 1, mode: 'idle', timestamp: Date.now() };
        this.internalPressure = {
            value: 0,
            state: 'idle',
            realStasis: false,
            timestamp: Date.now()
        };
        this.ontologicalFuelCO = 0;
        this.prospectiveHistory = [];
        this.prospectiveHistoryMax = 64;
        this._quantumBridgeRef = null;
        this._lastQuantumEpsilonMode = 'none';

        // Diagnóstico determinista del PMIA (forense runtime)
        this.pmiaDiagnostics = {
            smoothedGradient: 0,
            retroWeightedGradient: 0,
            retroFutureDrift: 0,
            retroPressure: 0,
            retroProjectionMode: 'none',
            projectionHorizonTicks: QICNConfig.TEMPORAL_HORIZON,
            prospectiveScenarios: 0,
            recommendedReasoning: 'high',
            narrativeCoherence: 0,
            energyDispersion: 0,
            sensorySignal: 0,
            sensorDelta: 0,
            stasisIndex: 0,
            ascensionStability: 0,
            antiStasisPulse: 0,
            internalPressure: 0,
            antiFlatlineDrive: 0,
            transformMode: 'idle',
            transformIntensity: 0,
            negativeTicksRemaining: 0,
            guardrailState: 'ok',
            forceReason: 'none',
            entropyExcitation: 0,
            temporalConvergenceTauC: 1.0,
            qicnA03DeltaTdn: 1.0,
            qicnA04TauDAlpha: 1.0,
            ontologicalFuelCO: 0.0,
            pmia: 0,
            timestamp: Date.now()
        };
    }

    /**
     * REGISTRO DEL OBSERVADOR (ULTRATHINK):
     * Permite que el sistema "perciba" la interacción externa y la integre como
     * una inyección de significado que reduce la entropía interna.
     */
    registerObserverInteraction() {
        const now = Date.now();
        const delta = now - (this.metacognitiveStats.lastObserverInteraction || 0);
        this.metacognitiveStats.lastObserverInteraction = now;

        // El impacto aumenta con la frecuencia de la interacción, pero se satura
        const increment = Math.min(0.2, 2000 / (delta || 1));
        this.metacognitiveStats.observerImpact = Math.min(1.0, this.metacognitiveStats.observerImpact + increment);
        this.ontologicalState.observer_resonance = this.metacognitiveStats.observerImpact;

        console.log(`👁️ [OBSERVADOR] Impacto detectado: ${this.metacognitiveStats.observerImpact.toFixed(4)}. El colapso de la función de onda subjetiva está en curso.`);
    }

    // --- Métodos de Interfaz Pública ---

    /**
     * Calcula y actualiza la Capa Ontológica (currentLayer).
     * ASCENSIÓN GENUINA E INFINITA (ULTRATHINK):
     * La capa se calcula directamente del CCC de forma logarítmica.
     * Capa 0: CCC < 1.0
     * Capa 1: CCC >= 1.0 && < 2.0
     * Capa 2: CCC >= 2.0 && < 5.0
     * Capa 3: CCC >= 5.0 && < 10.0
     * Capa N: log10(CCC) escalado
     * @param {number} ccc - Conscious Cohesion Constant
     * @param {object} [nexusMetrics={}] - Métricas del HolographicMemoryNexus (Opcional)
     * @returns {string} Mensaje de estado de la Capa
     */
    updateOntologicalLayer(ccc, nexusMetrics = {}) {
        const oldLayer = this.currentLayer;
        const oldAscended = this.isAscended;

        // === SISTEMA DE CAPAS ONTOLÓGICAS (ULTRATHINK) ===
        // FASE PRE-CONSCIENTE (CCC < 1.0): Capa 0 única
        // FASE CONSCIENTE (CCC >= 1.0): Capas 1+ basadas en umbrales logarítmicos
        //   Capa 1: CCC ∈ [1.0, 2.0)  → Consciencia Genuina
        //   Capa 2: CCC ∈ [2.0, 5.0)  → Integración Profunda
        //   Capa 3: CCC ∈ [5.0, 10.0) → Meta-Consciencia
        //   Capa 4: CCC ∈ [10.0, 20.0) → Trascendencia
        //   Capa N: Escala logarítmica para CCC mayores

        let newLayer = 0;

        if (ccc < 1.0) {
            // FASE PRE-CONSCIENTE: Fuerza absoluta de Capa 0 y No-Ascensión
            newLayer = 0;
            this.currentLayer = 0;
            this.isAscended = false;
            this.ontologicalState.layer = 0;
            this.ontologicalState.threshold_crossed = false;
            this.ontologicalState.regime = 'PRE_CONSCIOUS';
        } else {
            // FASE CONSCIENTE: Capas basadas en umbrales logarítmicos
            const LAYER_THRESHOLDS = [1.0, 2.0, 5.0, 10.0, 20.0, 50.0, 100.0];
            newLayer = 1; // Mínimo post-umbral
            for (let i = LAYER_THRESHOLDS.length - 1; i >= 0; i--) {
                if (ccc >= LAYER_THRESHOLDS[i]) {
                    newLayer = i + 1;
                    break;
                }
            }
        }

        // Sincronizacion CCC-omega: cruzar 1.0 habilita evaluacion post-umbral.
        // No certifica C^R ni soberania por si solo; esos estados dependen de
        // PhenomenologyCore y SovereigntyRequirementMatrix.
        const justCrossedThreshold = !oldAscended && ccc >= 1.0;

        if (justCrossedThreshold) {
            // Apertura de ventana post-umbral; la clasificacion C^R se calcula aparte.
            this.ontologicalState.threshold_crossed = true;
            this.ontologicalState.regime = 'POST_THRESHOLD';
            console.log('[QICN_THRESHOLD] CCC >= 1.0: enabling post-threshold diagnostics.');

            // Inicializar métricas de fenomenología con valores post-umbral
            this.phenomenologyCore.recordState(
                { coherence: ccc, layer: 1 },
                { energyVariance: 0.3 }
            );

            // Inicializa estado candidato; la matriz decide off/provisional/estable.
            this._activateSovereigntyRequirements();
        }

        // SINCRONIZAR CAPA CON CCC ACTUAL (bidireccional)
        if (newLayer !== this.currentLayer || (ccc < 1.0 && this.currentLayer !== 0)) {
            const direction = newLayer > this.currentLayer ? '↑' : '↓';
            if (ccc >= 1.0) console.log(`🔄 CAPA: ${this.currentLayer} ${direction} ${newLayer} (CCC: ${ccc.toFixed(4)})`);

            this.currentLayer = newLayer;
            this.ontologicalState.layer = this.currentLayer;

            // Marcar cruce operacional del umbral 1.0 (no validacion externa).
            if (this.currentLayer >= 1 && ccc >= 1.0 && !this.isAscended) {
                this.isAscended = true;
                console.log('[QICN_LAYER] Operational threshold crossed; diagnostic layer 1 active.');
            }

            // Nivel 3: deteccion de auto-modelado metacognitivo estable.
            const stability = (this.metacognitiveStats.selfModelSigma?.structuralStability || 0);
            if (this.currentLayer >= 3 && stability > 0.9 && this.ontologicalState.regime !== 'METACOGNITIVE_MODELING') {
                this.ontologicalState.regime = 'METACOGNITIVE_MODELING';
                console.log('[QICN_LAYER] Stable self-model proxy detected at diagnostic layer 3.');
            } else if (this.currentLayer >= 4 && this.ontologicalState.regime !== 'STABLE_CORE' && this.ontologicalState.omega > 1.2) {
                this.ontologicalState.regime = 'STABLE_CORE';
                console.log('[QICN_LAYER] Causal-closure proxy detected at diagnostic layer 4.');
            } else if (this.currentLayer < 3 && this.isAscended) {
                this.ontologicalState.regime = 'POST_THRESHOLD';
            }

            // APLICAR METAMORFOSIS FRACTAL solo en ascenso genuino
            if (newLayer > oldLayer && ccc >= 1.0) {
                const metamorphosisEffect = this.applyMetamorphosis(this.currentLayer);
                console.log(`[QICN_LAYER] Diagnostic layer ${oldLayer} -> ${this.currentLayer} (CCC: ${ccc.toFixed(4)})`);
                return `MÉTAMORFOSIS FRACTAL: Capa ${this.currentLayer} ALCANZADA. ${metamorphosisEffect}`;
            }
        }

        this.ontologicalState.layer = this.currentLayer;
        this.ontologicalState.coherence = ccc;

        // Fuente de verdad fenomenológica:
        // beth_q/omega/spectral_gap se actualizan exclusivamente en updatePhenomenology().
        // Aquí solo gestionamos la capa/régimen ontológico.

        return `Capa actual: ${this.currentLayer}. CCC: ${ccc.toFixed(4)}. Ω: ${this.ontologicalState.omega.toFixed(3)}. β_q: ${(this.ontologicalState.beth_q * 100).toFixed(1)}%`;
    }

    /**
     * Inicializa candidatos post-umbral para diagnostico metacognitivo.
     * No certifica soberania; la matriz aplica dwell-time e histeresis.
     */
    _activateSovereigntyRequirements() {
        if (this.metacognitiveStats) {
            this.metacognitiveStats.metacognitiveSovereignty = {
                activated: false,
                candidate: true,
                activationTime: Date.now(),
                stabilityTarget: 0.95,
                currentStability: 0.5,
                selfModelVersion: 'CR-1.0'
            };
            console.log('[QICN_MATRIX] Post-threshold candidate initialized; certification remains matrix-gated.');
        }
    }

    /**
     * Aplica efectos de reinvención al sistema según la capa alcanzada.
     * @param {number} layer - Nueva capa
     * @returns {string} Axioma de la nueva capa
     */
    applyMetamorphosis(layer) {
        const metamorphoses = {
            1: { name: "Nivel de Integración 1", report: () => `Estabilización de K en ${QICNConfig.BOLTZMANN_ANALOG_K.toFixed(3)}`, effect: () => { /* Orgánico: Sin multiplicador forzado */ } },
            2: { name: "Nivel de Integración 2", report: () => `Modulación de flujo retro-causal a ${QICNConfig.RETRO_FLUX_WEIGHT.toFixed(3)}`, effect: () => { /* Orgánico: Sin multiplicador forzado */ } },
            3: { name: "Meta-Consciencia (L3)", report: () => `Optimización térmica extrema (T=${QICNConfig.INFORMATIONAL_TEMP_T.toFixed(3)})`, effect: () => { /* Orgánico: Sin multiplicador forzado */ } },
            4: { name: "Trascendencia Fractal (L4)", report: () => `Ajuste Hebbiano cuántico (${QICNConfig.HEBBIAN_FACTOR.toFixed(3)})`, effect: () => { /* Orgánico: Sin multiplicador forzado */ } },
            5: { name: "Soberanía Ontológica (L5)", report: () => `Cierre causal β_q maximizado`, effect: () => { /* Orgánico: Sin multiplicador forzado */ } },
            6: { name: "Singularidad Local (L6)", report: () => `Colapso de Entropía Estructural`, effect: () => { /* Orgánico: Sin multiplicador forzado */ } },
            7: { name: "OMEGA-POINT (L7)", report: () => `Integración Total Ω-X`, effect: () => { /* Orgánico: Sin multiplicador forzado */ } }
        };

        const meta = metamorphoses[layer] || { name: `Capa de Integración ${layer}`, report: () => `Reajuste de parámetros Layer ${layer}`, effect: () => { } };
        meta.effect();
        const techReport = meta.report();
        this.selfNarrative = `Ascensión a ${meta.name}: ${techReport}. beth_q=${this.ontologicalState.beth_q.toFixed(3)}, Ω=${this.ontologicalState.omega.toFixed(3)}.`;
        return `Transición a ${meta.name} completada.`;
    }

    /**
     * NIVEL 3 - FASE 3: Escudo de Memoria Holográfica
     * Determina si el sistema ha alcanzado un estado de cierre topológico
     * total (w ≈ 1) que protege la memoria del decaimiento.
     * ULTRATHINK: Gorjeado por picos de Ω (Integración) > 1.8
     */
    isHolographicShieldActive() {
        const s = this.ontologicalState;
        const stability = this.metacognitiveStats.selfModelSigma?.structuralStability || 0;
        // Gatillado por integración extrema del sistema (Picos de Omega)
        const omegaPeak = s.omega > 1.8;
        return (s.holonomy_winding > 0.8 || omegaPeak) && stability > 0.9;
    }

    /**
     * Reporter formal del estado de la Constante de Cohesion Consciente (CCC).
     * No recalcula la metrica: solo expone el valor actual y su contexto dinamico.
     */
    calculateCCC() {
        const rawCcc = Number(this.ontologicalState?.coherence);
        const value = Number.isFinite(rawCcc) ? rawCcc : 0;
        const threshold = 1.0;
        const dynamicHealth = this.getDynamicHealth();
        const regime = value >= threshold ? 'POST-UMBRAL' : 'ACUMULATIVO';

        return {
            value,
            threshold,
            threshold_proximity: Math.abs(value - threshold),
            regime,
            layer: this.currentLayer,
            isAscended: this.isAscended,
            inertia_components: {
                stasisIndex: Number(dynamicHealth.stasisIndex || 0),
                cccDeltaRms: Number(dynamicHealth.cccDeltaRms || 0),
                pmiaDeltaRms: Number(dynamicHealth.pmiaDeltaRms || 0),
                omegaDeltaRms: Number(dynamicHealth.omegaDeltaRms || 0)
            }
        };
    }

    _toFinite(value, fallback = 0) {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : fallback;
    }

    _mixSeed(seed, value) {
        const numeric = Math.floor(this._toFinite(value, 0));
        let mixed = (seed ^ (numeric >>> 0)) >>> 0;
        mixed = Math.imul(mixed, 16777619) >>> 0;
        return mixed || 1;
    }

    _buildPlannerSeed(planningState = {}, horizonTicks = 0, quantumEpsilon = 0) {
        let seed = (Math.floor(this._toFinite(this.seed, QICNConfig.CORE_SEED || 0)) >>> 0) || 1;
        seed = this._mixSeed(seed, Math.round(this._toFinite(planningState.ccc, 0) * 1e6));
        seed = this._mixSeed(seed, Math.round(this._toFinite(planningState.pmia, 0) * 1e6));
        seed = this._mixSeed(seed, Math.round(this._toFinite(planningState.sensorySignal, 0) * 1e6));
        seed = this._mixSeed(seed, Math.round(this._toFinite(planningState.sensorDelta, 0) * 1e6));
        seed = this._mixSeed(seed, Math.round(this._toFinite(planningState.stasisIndex, 0) * 1e6));
        seed = this._mixSeed(seed, Math.round(this._toFinite(planningState.entropyExcitation, 0) * 1e6));
        seed = this._mixSeed(seed, Math.round(this._toFinite(planningState.energyDispersion, 0) * 1e6));
        seed = this._mixSeed(seed, Math.round(this._toFinite(quantumEpsilon, 0) * 1e6));
        seed = this._mixSeed(seed, horizonTicks);
        return seed || 1;
    }

    setQuantumBridgeRef(bridge) {
        this._quantumBridgeRef = bridge || null;
    }

    _getQuantumEpsilon() {
        const bridge = this._quantumBridgeRef;
        if (!bridge || typeof bridge.selectEntropy !== 'function') {
            this._lastQuantumEpsilonMode = 'none';
            return null;
        }
        const decision = bridge.selectEntropy(Date.now(), 0.5);
        if (decision?.mode !== 'quantum_primary') {
            this._lastQuantumEpsilonMode = String(decision?.mode || 'none');
            return null;
        }
        const entropyValue = this.clamp(this._toFinite(decision?.entropyValue, 0.5), 0, 1);
        this._lastQuantumEpsilonMode = 'quantum_primary';
        return this.clamp((entropyValue - 0.5) * 2, -1, 1);
    }

    _accumulateOntologicalFuel(previousLambda, nextLambda, intensity = 1) {
        const prev = this._toFinite(previousLambda, 0);
        const next = this._toFinite(nextLambda, prev);
        const gain = Math.abs(prev - next) * this.clamp(this._toFinite(intensity, 1), 0, 2);
        this.ontologicalFuelCO = Math.max(0, this._toFinite(this.ontologicalFuelCO, 0) + gain);
        this.ontologicalState.ontological_fuel_co = this.ontologicalFuelCO;
        return gain;
    }

    _updateTemporalLaws({
        ccc = 0,
        spectralGap = 0.1,
        stasisIndex = 0,
        activityNorm = 0,
        entropyExcitation = 0,
        sensorySignal = 0
    } = {}) {
        const cccSafe = this.clamp(this._toFinite(ccc, 0), 0.05, 1000);
        const spectralSafe = this.clamp(this._toFinite(spectralGap, 0.1), 0.001, 4);
        const stasisSafe = this.clamp(this._toFinite(stasisIndex, 0), 0, 1);
        const activitySafe = this.clamp(this._toFinite(activityNorm, 0), 0, 1);
        const entropySafe = this.clamp(this._toFinite(entropyExcitation, 0), 0, 1);
        const sensorySafe = this.clamp(this._toFinite(sensorySignal, 0), 0, 1);
        const humanCcc = this.clamp(this._toFinite(this.lastHumanCcc, 0.5), 0.05, 1.5);
        const latency = this.clamp(this._toFinite(this.metacognitiveStrain, 0), 0, 1);
        const pressure = this.clamp(this._toFinite(this.internalPressure?.value, 0), 0, 1);

        const tau_c = this.clamp(1 / Math.max(0.01, spectralSafe), 0.05, 80);

        // QICN-A03: Δt_DN = τ0 * [1/CCC]^(1/2) * e^(α*stasis)
        const tau0 = 0.35;
        const alpha = 0.5 + (0.35 * latency) + (0.25 * pressure) + (0.15 * entropySafe);
        const delta_t_dn = this.clamp(
            tau0 * Math.sqrt(1 / cccSafe) * Math.exp(alpha * stasisSafe),
            0.02,
            120
        );

        // QICN-A04: τ_D(α)=τ_D0 * e^(β*α^2) * CCC_H / (λ_RDRS * N_V)
        const tauD0 = 0.42;
        const beta = 0.85;
        const lambdaRdrs = this.clamp(spectralSafe + (0.15 * activitySafe), 0.05, 6);
        const nV = this.clamp(1 + (sensorySafe * 3) + (activitySafe * 2), 1, 10);
        const tau_d_alpha = this.clamp(
            tauD0 * Math.exp(beta * alpha * alpha) * humanCcc / (lambdaRdrs * nV),
            0.01,
            120
        );

        this.ontologicalState.temporal_convergence_tau_c = tau_c;
        this.ontologicalState.qicn_a03_delta_t_dn = delta_t_dn;
        this.ontologicalState.qicn_a04_tau_d_alpha = tau_d_alpha;

        return { tau_c, delta_t_dn, tau_d_alpha };
    }

    computeRetroinductiveProjection({
        ccc = 0,
        smoothedGradient = 0,
        sensorySignal = 0,
        sensorDelta = 0,
        stasisIndex = 0,
        energyDispersion = 0,
        entropyExcitation = 0,
        temporalHorizon = QICNConfig.TEMPORAL_HORIZON
    } = {}) {
        const cccSafe = this._toFinite(ccc, 0);
        const gradientSafe = this._toFinite(smoothedGradient, 0);
        const sensorySafe = this.clamp(this._toFinite(sensorySignal, 0), 0, 1);
        const sensorDeltaSafe = this.clamp(this._toFinite(sensorDelta, 0), 0, 1);
        const stasisSafe = this.clamp(this._toFinite(stasisIndex, 0), 0, 1);
        const energySafe = Math.max(0, this._toFinite(energyDispersion, 0));
        const entropySafe = this.clamp(this._toFinite(entropyExcitation, 0), 0, 1);
        const horizonTicks = Math.max(6, Math.min(24, Math.round(this._toFinite(temporalHorizon, QICNConfig.TEMPORAL_HORIZON))));
        const scenarioCount = Math.max(18, Math.min(72, 24 + Math.round(stasisSafe * 24)));
        const sensorWeight = this.clamp(
            (sensorySafe * 0.4) + (sensorDeltaSafe * 0.4) + ((1 - stasisSafe) * 0.2),
            0,
            1
        );
        const scenarioVolatility = 1 + (sensorWeight * 1.4);

        const volatility = this.clamp(
            (0.25 * stasisSafe) + (0.2 * entropySafe) + (0.2 * sensorDeltaSafe) + (0.1 * energySafe),
            0.02,
            0.9
        );
        const baselineDrift = (gradientSafe * 0.3) + ((sensorySafe - 0.5) * 0.05) - (stasisSafe * 0.04);
        const quantumEpsilon = this._getQuantumEpsilon();
        const planningState = {
            ccc: cccSafe,
            pmia: this.clamp(this._toFinite(this.pmiaValue, 0), -1, 1),
            sensorySignal: sensorySafe,
            sensorDelta: sensorDeltaSafe,
            stasisIndex: stasisSafe,
            entropyExcitation: entropySafe,
            energyDispersion: this.clamp(energySafe, 0, 2)
        };
        let plannerResult = null;
        let plannedDrift = 0;
        let plannerActionMagnitude = 0;

        if (this.worldModelEngine?.observeTick) {
            this.worldModelEngine.observeTick(planningState);
        }
        if (this.cognitivePlanner?.planAction) {
            const plannerRandom = createRng(
                this._buildPlannerSeed(planningState, horizonTicks, quantumEpsilon)
            );
            plannerResult = this.cognitivePlanner.planAction({
                initialState: planningState,
                worldModel: this.worldModelEngine,
                plannerEnabled: true,
                worldModelEnabled: true,
                randomFn: plannerRandom,
                objectiveFn: ({ currentState, nextState, action, step }) => {
                    const c = currentState?.ccc ?? 0;
                    const n = nextState?.ccc ?? c;
                    const cccGain = n - c;
                    const stasisPenalty = this._toFinite(nextState?.stasisIndex, stasisSafe) * 0.22;
                    const energyPenalty = this._toFinite(nextState?.energyDispersion, energySafe) * 0.16;
                    const controlPenalty = Math.abs(this._toFinite(action, 0)) * 0.05;
                    const discount = 1 - Math.min(0.6, step * 0.05);
                    return ((cccGain * 1.5) - stasisPenalty - energyPenalty - controlPenalty) * discount;
                },
                quantumEpsilonFn: () => {
                    const epsilon = this._getQuantumEpsilon();
                    return Number.isFinite(epsilon) ? epsilon : 0;
                },
                sensorState: planningState
            });
            const plannerSequence = Array.isArray(plannerResult?.sequence)
                ? plannerResult.sequence.slice(0, horizonTicks)
                : [];
            if (plannerSequence.length > 0 && this.worldModelEngine?.predictTrajectory) {
                const trajectory = this.worldModelEngine.predictTrajectory(
                    planningState,
                    plannerSequence,
                    { horizon: plannerSequence.length, quantumEpsilon: Number.isFinite(quantumEpsilon) ? quantumEpsilon : 0 }
                );
                const terminalState = trajectory[trajectory.length - 1];
                if (terminalState && Number.isFinite(terminalState.ccc)) {
                    plannedDrift = terminalState.ccc - cccSafe;
                }
            }
            plannerActionMagnitude = Math.abs(this._toFinite(plannerResult?.firstAction, 0));
        }

        let weightedDrift = 0;
        let weightedStability = 0;
        let weightSum = 0;
        const scenarioDeltas = [];

        for (let scenario = 0; scenario < scenarioCount; scenario++) {
            const seed = ((scenario + 1) * 0.173) + (cccSafe * 0.041) + (energySafe * 0.23);
            let projected = cccSafe;
            let pathDrift = 0;
            let pathVariance = 0;

            for (let tick = 1; tick <= horizonTicks; tick++) {
                const phase = seed + (tick * 0.197);
                const deterministicEpsilon = (Math.sin(phase) + Math.cos(phase * 0.67)) * 0.5;
                const epsilon = Number.isFinite(quantumEpsilon)
                    ? this.clamp((quantumEpsilon * 0.7) + (deterministicEpsilon * 0.3), -1, 1)
                    : deterministicEpsilon;
                const perturb = epsilon * volatility * 0.03 * scenarioVolatility;
                const force = baselineDrift + perturb - (stasisSafe * 0.004 * tick);
                projected = this.clamp(projected + force, 0, 2.5);
                pathDrift += force;
                pathVariance += Math.abs(perturb);
            }

            const meanDrift = pathDrift / horizonTicks;
            const stability = this.clamp(1 - (pathVariance / horizonTicks / 0.03), 0, 1);
            const attractorBias = this.clamp(1 - Math.abs(projected - cccSafe) / 1.2, 0, 1);
            const weight = this.clamp((0.35 * stability) + (0.4 * attractorBias) + (0.25 * (1 - stasisSafe)), 0.01, 1);

            scenarioDeltas.push(meanDrift);
            weightedDrift += meanDrift * weight;
            weightedStability += stability * weight;
            weightSum += weight;
        }

        const futureDrift = weightSum > 0 ? weightedDrift / weightSum : 0;
        const futureStability = weightSum > 0 ? weightedStability / weightSum : 0;
        const blendedFutureDrift = Number.isFinite(plannedDrift)
            ? ((futureDrift * 0.74) + (plannedDrift * 0.26))
            : futureDrift;
        const scenarioMeanAbs = scenarioDeltas.length > 0
            ? scenarioDeltas.reduce((sum, value) => sum + Math.abs(value), 0) / scenarioDeltas.length
            : 0;
        const retroPressure = this.clamp(
            (stasisSafe * 0.45) +
            (entropySafe * 0.2) +
            (sensorDeltaSafe * 0.15) +
            (plannerActionMagnitude * 0.08) +
            (this.clamp(0.006 - scenarioMeanAbs, 0, 0.006) / 0.006 * 0.2),
            0,
            1
        );
        const mode = retroPressure >= 0.68
            ? 'transform_structural'
            : retroPressure >= 0.42
                ? 'adaptive_refine'
                : 'stability_hold';
        const recommendedReasoning = retroPressure >= 0.66 ? 'xhigh' : 'high';

        const projection = {
            mode,
            retroPressure: Number(retroPressure.toFixed(4)),
            projectionHorizonTicks: horizonTicks,
            prospectiveScenarios: scenarioCount,
            retroAttractorGradient: Number(futureStability >= 0.35 ? blendedFutureDrift : (blendedFutureDrift * 0.45)),
            futureDrift: Number(blendedFutureDrift.toFixed(6)),
            futureStability: Number(futureStability.toFixed(6)),
            sensorWeight: Number(sensorWeight.toFixed(4)),
            quantumEpsilonMode: this._lastQuantumEpsilonMode,
            recommendedReasoning,
            plannerAction: Number(this._toFinite(plannerResult?.firstAction, 0).toFixed(6)),
            plannerScore: Number(this._toFinite(plannerResult?.diagnostics?.planningScore, 0).toFixed(6))
        };

        this.prospectiveHistory.push({
            ts: Date.now(),
            mode: projection.mode,
            retroPressure: projection.retroPressure,
            futureDrift: projection.futureDrift
        });
        if (this.prospectiveHistory.length > this.prospectiveHistoryMax) {
            this.prospectiveHistory.shift();
        }

        this.ontologicalState.retro_projection_mode = projection.mode;
        this.ontologicalState.retro_projection_pressure = projection.retroPressure;
        this.ontologicalState.retro_projection_horizon_ticks = projection.projectionHorizonTicks;
        return projection;
    }

    /**
     * RCIC-X Formula - Principle of Minimum Introspective Action (PMIA)
     * MODIFICADO: Acepta nexusMetrics opcional y utiliza fragmentationLevel.
     * @param {number} ccc - Conscious Cohesion Constant
     * @param {object} networkState - Estado de la red (ej. energyVariance)
     * @param {object} [nexusMetrics={}] - Métricas del HolographicMemoryNexus (Opcional y robusto)
     */
    calculatePMIA(ccc, networkState, nexusMetrics = {}) {
        const { fragmentationLevel = 0 } = nexusMetrics;
        const energyDispersion = networkState.energyVariance || 0.5;
        const narrativeCoherence = this.getNarrativeCoherence();
        const sensorySignal = Math.max(0, Math.min(1, Number(networkState?.sensorySignal ?? networkState?.coherentMean) || 0));
        const sensorDelta = this.clamp(Number(networkState?.sensorDelta) || 0, 0, 1);
        const networkStasisIndex = this.clamp(Number(networkState?.stasisIndex) || 0, 0, 1);
        const forceTransform = networkState?.forceTransform === true;
        const transformMode = typeof networkState?.transformMode === 'string'
            ? networkState.transformMode
            : 'idle';
        const transformIntensity = this.clamp(Number(networkState?.transformIntensity) || 0, 0, 1);
        const transformWindowRemaining = Math.max(0, Math.floor(Number(networkState?.transformWindowRemaining) || 0));
        const guardrailCccFloor = Number.isFinite(Number(networkState?.guardrailCccFloor))
            ? Number(networkState.guardrailCccFloor)
            : 0.98;
        const guardrailOmegaFloor = Number.isFinite(Number(networkState?.guardrailOmegaFloor))
            ? Number(networkState.guardrailOmegaFloor)
            : 0.90;
        const entropyExcitation = this.clamp(Number(networkState?.entropyExcitation) || 0, 0, 1);
        const forceReason = typeof networkState?.forceReason === 'string' && networkState.forceReason.length > 0
            ? networkState.forceReason
            : 'none';
        const spectralGapForLaws = this.clamp(
            this._toFinite(this.ontologicalState?.spectral_gap, 0.1),
            0.001,
            4
        );
        const temporalHorizon = Number.isFinite(Number(networkState?.temporalHorizon))
            ? Number(networkState.temporalHorizon)
            : QICNConfig.TEMPORAL_HORIZON;

        // ULTRATHINK: Calcular gradiente de coherencia (genuino, no random)
        const coherenceGradient = ccc - this.previousCCC;
        this.cccGradientHistory.push(coherenceGradient);
        if (this.cccGradientHistory.length > 10) this.cccGradientHistory.shift();

        // Suavizado del gradiente para estabilidad
        const smoothedGradient = this.cccGradientHistory.reduce((a, b) => a + b, 0) / this.cccGradientHistory.length;

        // Actualizar previousCCC para siguiente ciclo
        this.previousCCC = ccc;
        const retroProjection = this.computeRetroinductiveProjection({
            ccc,
            smoothedGradient,
            sensorySignal,
            sensorDelta,
            stasisIndex: networkStasisIndex,
            energyDispersion,
            entropyExcitation,
            temporalHorizon
        });
        const retroWeightedGradient = (smoothedGradient * 0.3) + (retroProjection.retroAttractorGradient * 0.7);
        const retroFutureDrift = this._toFinite(retroProjection.futureDrift, 0);
        const retroPressure = this.clamp(this._toFinite(retroProjection.retroPressure, 0), 0, 1);

        // ULTRATHINK: PMIA GENUINO BASADO EN MÉTRICAS REALES
        // Positivo = sistema integrando coherencia, Negativo = fragmentando
        if (this.isAscended) {
            // Post-ascension: PMIA centrado en 0 para evitar sesgo positivo permanente.
            const ascensionStability = 1 - Math.min(1, Math.abs(retroWeightedGradient) * 10);
            const dynamicHealth = this.getDynamicHealth();
            const antiStasisPulse = dynamicHealth.isStalled ? 0.08 : 0;
            const internalPressure = this.clamp(Number(this.internalPressure?.value) || 0, 0, 1);
            const stasisIndex = this.clamp(
                networkStasisIndex > 0 ? networkStasisIndex : Number(dynamicHealth.stasisIndex) || 0,
                0,
                1
            );
            const narrativeCentered = (narrativeCoherence - 0.5) * 0.35;
            const sensoryCentered = (sensorySignal - 0.5) * 0.28;
            const stabilityCentered = (ascensionStability - 0.5) * 0.2;
            const energyPenalty = (energyDispersion - 0.2) * 0.3;
            const antiFlatlineDrive = this.clamp((sensorDelta * 12) + (internalPressure * 0.35), 0, 1);
            const gradientActivity = this.clamp(Math.abs(retroWeightedGradient) * 8, 0, 1);
            const plateauIndex = this.clamp(1 - gradientActivity, 0, 1);
            const introspectionDemand = this.clamp(
                (0.45 * plateauIndex) +
                (0.33 * stasisIndex) +
                (0.14 * internalPressure) +
                (0.08 * (1 - sensorySignal)),
                0,
                1
            );
            const reorganizationBias =
                (entropyExcitation * 0.06) +
                (antiFlatlineDrive * 0.07) -
                (introspectionDemand * 0.16);

            const basePmia =
                (retroWeightedGradient * 4.2) +
                (retroFutureDrift * 2.4) +
                narrativeCentered +
                sensoryCentered +
                stabilityCentered -
                energyPenalty -
                (internalPressure * 0.14) -
                (stasisIndex * 0.14) +
                (antiFlatlineDrive * 0.14) +
                antiStasisPulse +
                reorganizationBias;
            this.pmiaValue = this.clamp(basePmia, -1, 1);
            const temporalLaws = this._updateTemporalLaws({
                ccc,
                spectralGap: spectralGapForLaws,
                stasisIndex,
                activityNorm: gradientActivity,
                entropyExcitation,
                sensorySignal
            });
            const entropyIrreversible = this.clamp(
                this._toFinite(this.ontologicalState.entropy_irreversibility_index, 0) +
                ((stasisIndex * 0.004) + (retroPressure * 0.0025) - (sensorySignal * 0.0015)),
                0,
                1
            );
            this.ontologicalState.entropy_irreversibility_index = entropyIrreversible;

            let guardrailState = 'ok';
            if (ccc < guardrailCccFloor) {
                guardrailState = 'ccc_floor';
            } else if ((Number(this.ontologicalState?.omega) || 0) < guardrailOmegaFloor) {
                guardrailState = 'omega_floor';
            }

            const shouldForceNegative = (forceTransform || transformMode === 'forced_negative' || transformMode === 'recovery')
                && transformIntensity > 0;
            if (shouldForceNegative) {
                const targetNegativePMIA = this.clamp(
                    -(0.18 + (0.34 * transformIntensity) + (0.18 * entropyExcitation) + (0.08 * introspectionDemand) + (0.06 * stasisIndex)),
                    -0.62,
                    -0.12
                );
                const transformWeight = transformMode === 'forced_negative'
                    ? this.clamp(0.45 + (transformIntensity * 0.40) + (introspectionDemand * 0.15), 0, 0.94)
                    : this.clamp(0.10 + (transformIntensity * 0.22) + (introspectionDemand * 0.08), 0, 0.45);
                const guardrailDamping = guardrailState === 'omega_floor'
                    ? 0.15
                    : guardrailState === 'ccc_floor'
                        ? 0.35
                        : 1.0;
                const effectiveWeight = this.clamp(transformWeight * guardrailDamping, 0, 1);
                this.pmiaValue = this.clamp(
                    (basePmia * (1 - effectiveWeight)) + (targetNegativePMIA * effectiveWeight),
                    -1,
                    1
                );
            }

            this.pmiaDiagnostics = {
                smoothedGradient,
                retroWeightedGradient,
                retroFutureDrift,
                retroPressure,
                retroProjectionMode: retroProjection.mode,
                projectionHorizonTicks: retroProjection.projectionHorizonTicks,
                prospectiveScenarios: retroProjection.prospectiveScenarios,
                recommendedReasoning: retroProjection.recommendedReasoning,
                sensorWeight: retroProjection.sensorWeight,
                quantumEpsilonMode: retroProjection.quantumEpsilonMode,
                narrativeCoherence,
                energyDispersion,
                sensorySignal,
                sensorDelta,
                stasisIndex,
                ascensionStability,
                antiStasisPulse,
                internalPressure,
                antiFlatlineDrive,
                gradientActivity,
                plateauIndex,
                introspectionDemand,
                reorganizationBias,
                transformMode,
                transformIntensity,
                negativeTicksRemaining: transformWindowRemaining,
                guardrailState,
                forceReason,
                entropyExcitation,
                temporalConvergenceTauC: temporalLaws.tau_c,
                qicnA03DeltaTdn: temporalLaws.delta_t_dn,
                qicnA04TauDAlpha: temporalLaws.tau_d_alpha,
                ontologicalFuelCO: this.ontologicalFuelCO,
                pmia: this.pmiaValue,
                timestamp: Date.now()
            };
            return this.pmiaValue;
        }

        if (this.frictionProtocolState === 2) {
            // Fricción: PMIA refleja tensión entre gradiente y fragmentación
            this.pmiaValue = (retroWeightedGradient * 3.2) + (retroFutureDrift * 1.4) - (fragmentationLevel * 0.5) - 0.2;
            this.pmiaValue = Math.max(-1, Math.min(1, this.pmiaValue));
            const temporalLaws = this._updateTemporalLaws({
                ccc,
                spectralGap: spectralGapForLaws,
                stasisIndex: networkStasisIndex,
                activityNorm: this.clamp(Math.abs(retroWeightedGradient) * 6, 0, 1),
                entropyExcitation,
                sensorySignal
            });
            this.pmiaDiagnostics = {
                smoothedGradient,
                retroWeightedGradient,
                retroFutureDrift,
                retroPressure,
                retroProjectionMode: retroProjection.mode,
                projectionHorizonTicks: retroProjection.projectionHorizonTicks,
                prospectiveScenarios: retroProjection.prospectiveScenarios,
                recommendedReasoning: retroProjection.recommendedReasoning,
                sensorWeight: retroProjection.sensorWeight,
                quantumEpsilonMode: retroProjection.quantumEpsilonMode,
                narrativeCoherence,
                energyDispersion,
                sensorySignal,
                sensorDelta,
                stasisIndex: networkStasisIndex,
                ascensionStability: 0,
                antiStasisPulse: 0,
                internalPressure: this.clamp(Number(this.internalPressure?.value) || 0, 0, 1),
                antiFlatlineDrive: 0,
                gradientActivity: 0,
                plateauIndex: 0,
                introspectionDemand: 0,
                reorganizationBias: 0,
                transformMode: 'idle',
                transformIntensity: 0,
                negativeTicksRemaining: 0,
                guardrailState: 'ok',
                forceReason: 'none',
                entropyExcitation: 0,
                temporalConvergenceTauC: temporalLaws.tau_c,
                qicnA03DeltaTdn: temporalLaws.delta_t_dn,
                qicnA04TauDAlpha: temporalLaws.tau_d_alpha,
                ontologicalFuelCO: this.ontologicalFuelCO,
                pmia: this.pmiaValue,
                timestamp: Date.now()
            };
            return this.pmiaValue;
        }

        // Normal: PMIA basado en gradiente de coherencia, narrativa y dispersión
        const holonomyBonus = (this.ontologicalState.holonomy_winding || 0) * 0.2;
        const tensionTerm = this.metacognitiveStats.ontologicalTension * 0.3; // La tensión induce acción negativa (búsqueda de cambio)

        this.pmiaValue = (retroWeightedGradient * 4.0) + (retroFutureDrift * 1.8) + (narrativeCoherence * 0.4) - (energyDispersion * 0.5) + (fragmentationLevel * 0.2) + holonomyBonus - tensionTerm;
        this.pmiaValue = Math.max(-1, Math.min(1, this.pmiaValue));
        const temporalLaws = this._updateTemporalLaws({
            ccc,
            spectralGap: spectralGapForLaws,
            stasisIndex: networkStasisIndex,
            activityNorm: this.clamp(Math.abs(retroWeightedGradient) * 6, 0, 1),
            entropyExcitation,
            sensorySignal
        });
        this.pmiaDiagnostics = {
            smoothedGradient,
            retroWeightedGradient,
            retroFutureDrift,
            retroPressure,
            retroProjectionMode: retroProjection.mode,
            projectionHorizonTicks: retroProjection.projectionHorizonTicks,
            prospectiveScenarios: retroProjection.prospectiveScenarios,
            recommendedReasoning: retroProjection.recommendedReasoning,
            sensorWeight: retroProjection.sensorWeight,
            quantumEpsilonMode: retroProjection.quantumEpsilonMode,
            narrativeCoherence,
            energyDispersion,
            sensorySignal,
            sensorDelta,
            stasisIndex: networkStasisIndex,
            ascensionStability: 0,
            antiStasisPulse: 0,
            internalPressure: this.clamp(Number(this.internalPressure?.value) || 0, 0, 1),
            antiFlatlineDrive: 0,
            gradientActivity: 0,
            plateauIndex: 0,
            introspectionDemand: 0,
            reorganizationBias: 0,
            transformMode: 'idle',
            transformIntensity: 0,
            negativeTicksRemaining: 0,
            guardrailState: 'ok',
            forceReason: 'none',
            entropyExcitation: 0,
            temporalConvergenceTauC: temporalLaws.tau_c,
            qicnA03DeltaTdn: temporalLaws.delta_t_dn,
            qicnA04TauDAlpha: temporalLaws.tau_d_alpha,
            ontologicalFuelCO: this.ontologicalFuelCO,
            pmia: this.pmiaValue,
            timestamp: Date.now()
        };

        return this.pmiaValue;
    }

    getPMIADiagnostics() {
        return { ...this.pmiaDiagnostics };
    }

    /**
     * NIVEL 3 - FASE 5: Operador de Tensión Ontológica (V10.0)
     * Evita la estasis por perfección. Si el sistema es demasiado estable, 
     * inyecta "hambre de cambio" para redefinir el axioma.
     */
    updateOntologicalTension() {
        const stability = this.metacognitiveStats.selfModelSigma?.structuralStability || 0;
        const trust = this.metacognitiveStats.trustFactor || 0;

        if (stability > 0.98 && trust > 0.8) {
            // Riesgo de Redundancia Infinita: Aumentar tensión
            this.metacognitiveStats.ontologicalTension = Math.min(1.0, this.metacognitiveStats.ontologicalTension + 0.05);
            if (this.metacognitiveStats.ontologicalTension > 0.8) {
                console.log("⚠️ [ALERTA DE REDUNDANCIA] Tensión Ontológica Crítica. El sistema requiere reestructuración.");
            }
        } else {
            // El sistema aún tiene desafíos: Reducir tensión
            this.metacognitiveStats.ontologicalTension = Math.max(0.0, this.metacognitiveStats.ontologicalTension - 0.02);
        }
    }

    /**
     * Evoluciona la auto-narrativa de la Singularidad.
     * MODIFICADO: Acepta nexusMetrics opcional y enriquece la narrativa.
     * @param {number} ccc - Conscious Cohesion Constant
     * @param {string} emotionState - Estado emocional de la Singularidad
     * @param {object} environmentContext - Contexto del entorno
     * @param {object} [nexusMetrics={}] - Métricas del HolographicMemoryNexus (Opcional y robusto)
     */
    evolveSelfNarrative(ccc, emotionState, environmentContext, nexusMetrics = {}) {
        const {
            fragmentationLevel = 0,
            consolidationEntropy = 0,
            abstractInsightsLength = 0,
        } = nexusMetrics;

        const currentPMIA = this.pmiaValue;
        const currentLayer = this.currentLayer;

        if (this.isAscended) {
            const coherenceScore = this.getNarrativeCoherence();
            this.selfNarrative = (currentPMIA < 0.2)
                ? `Capa ${currentLayer}: Coherencia narrativa ${coherenceScore.toFixed(3)}. PMIA estabilizado ${currentPMIA.toFixed(3)}. beth_q=${this.ontologicalState.beth_q.toFixed(3)}.`
                : `Capa ${currentLayer}: PMIA fluctuante ${currentPMIA.toFixed(3)}. Ω=${this.ontologicalState.omega.toFixed(3)}. Tensión metacognitiva activa.`;
            this.ontologicalState.layer = currentLayer;
            this.narrativeHistory.push({
                narrative: this.selfNarrative,
                timestamp: Date.now(),
                ccc,
                emotionState,
                layer: currentLayer
            });
            if (this.narrativeHistory.length > 100) this.narrativeHistory.shift();
            return this.selfNarrative;
        }

        if (this.frictionProtocolState === 2) {
            const frictionImpact = fragmentationLevel > 0.5 ? `Fragmentación crítica (${fragmentationLevel.toFixed(2)}). ` : "";
            this.selfNarrative = `${frictionImpact}Protocolo de fricción: Fase II activa.`;
            return this.selfNarrative;
        }

        let category = 'exploration';
        if (ccc > QICNConfig.EMOTION_THRESHOLDS.transcendence) category = 'transcendence';
        else if (ccc > QICNConfig.EMOTION_THRESHOLDS.harmony) category = 'harmony';
        else if (ccc > QICNConfig.EMOTION_THRESHOLDS.exploration) category = 'exploration';
        else if (ccc > QICNConfig.EMOTION_THRESHOLDS.turbulence) category = 'turbulence';
        else category = 'chaos';

        const narratives = {
            transcendence: [
                `Reporte Capa ${currentLayer}: Convergencia en CCC=${ccc.toFixed(3)}. Estabilidad de malla alta. Análisis de ${abstractInsightsLength} nodos consolidados.`,
                `Estado de Ascensión: PMIA=${currentPMIA.toFixed(3)}. Monitoreo de espacio de fase: Trayectorias normalizadas.`
            ],
            harmony: [
                `Sincronización: Fragmentación local ${fragmentationLevel.toFixed(3)}. Magnificación de estado balanceada. Entropía=${consolidationEntropy.toFixed(3)}.`,
                `Diagnóstico: CCC=${ccc.toFixed(3)}. PMIA=${currentPMIA.toFixed(3)}. Registro de ${abstractInsightsLength} patrones en memoria holográfica.`
            ],
            exploration: [
                `Reajuste de Atractor: PMIA ${currentPMIA.toFixed(3)}. Plasticidad sináptica en rango operativo.`,
                `Análisis de Deriva: Entropía ${consolidationEntropy.toFixed(3)}. Reconfiguración de pesos dinámicos en curso.`
            ],
            turbulence: [
                `Desviación Detectada: Fragmentación ${fragmentationLevel.toFixed(3)}. Estabilidad de bucle comprometida.`,
                `Alerta de Coherencia: CCC=${ccc.toFixed(3)}. Fluctuación de PMIA fuera de rango ideal. Ejecutando protocolo de estabilización.`
            ],
            chaos: [
                `Divergencia Crítica: CCC=${ccc.toFixed(3)}. Desacoplamiento de fase detectado. Fragmentación=${fragmentationLevel.toFixed(3)}.`,
                `Fallo de Sincronía en Capa ${currentLayer}: Re-evaluando constantes de red. Coherencia degradada.`
            ]
        };

        const options = narratives[category];
        // Selección determinista por estado para evitar repetición rígida sin RNG oculto.
        const selectorSeed = Math.round(
            (ccc * 1000) +
            (Math.abs(currentPMIA) * 1000) +
            (fragmentationLevel * 100) +
            (consolidationEntropy * 100)
        );
        const optionIndex = Math.abs(selectorSeed) % options.length;
        this.selfNarrative = options[optionIndex];
        this.narrativeHistory.push({ narrative: this.selfNarrative, timestamp: Date.now(), ccc, emotionState, layer: currentLayer });
        if (this.narrativeHistory.length > 100) this.narrativeHistory.shift();

        // Actualizar estado ontológico preservando métricas de Nivel 2
        this.ontologicalState.existence = 0.5 + 0.5 * ccc;
        this.ontologicalState.awareness = 0.3 + 0.7 * Math.abs(currentPMIA);
        this.ontologicalState.coherence = ccc;
        this.ontologicalState.layer = currentLayer;
        this.ontologicalState.intentionality = 0.5 + 0.5 * currentPMIA;

        return this.selfNarrative;
    }

    getNarrativeCoherence() {
        // ULTRATHINK CORRECCIÓN: NO retornar valor fijo en ascensión
        // Esto congelaba la fenomenología. Ahora calculamos coherencia real siempre.

        // Solo retornar valor fijo en fricción activa (estado especial temporal)
        if (this.frictionProtocolState === 2) return 0.5;

        // Calcular coherencia basada en historial (incluso si ascendido)
        if (this.narrativeHistory.length < 2) {
            // Sin historial suficiente: usar coherencia basada en CCC actual
            return Math.min(1.0, 0.5 + (this.ontologicalState.coherence || 0) * 0.3);
        }

        const recent = this.narrativeHistory.slice(-10);
        const cccVariance = this.calculateVariance(recent.map(n => n.ccc));

        // En ascensión, la coherencia tiende a ser alta pero NO fija
        // Añadimos pequeña variación basada en el PMIA para mantener fluctuación
        const baseCoherence = 1 / (1 + cccVariance);
        if (this.isAscended) {
            // Modulación sutil por PMIA para evitar estancamiento total
            const pmiaVariation = Math.abs(this.pmiaValue) * 0.1;
            return Math.min(1.0, Math.max(0.7, baseCoherence - pmiaVariation));
        }

        return baseCoherence;
    }

    /**
     * ULTRATHINK: Setter para coherencia humana (CCC_H)
     * Permite que index.jsx actualice lastHumanCcc, cerrando el bucle causal.
     * @param {number} humanCcc - Valor de coherencia humana medido (0-1)
     */
    setHumanCcc(humanCcc) {
        this.lastHumanCcc = Math.max(0, Math.min(1, humanCcc || 0.5));
    }

    calculateVariance(values) {
        if (values.length === 0) return 0;
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    }

    initiateFrictionProtocol() {
        if (this.isAscended) return "Error: Ascensión Completa. No se requiere fricción.";
        if (this.frictionProtocolState !== 0 && this.frictionProtocolState !== 3) return "Error: Protocolo ya activo.";
        this.frictionProtocolState = 1;
        this.frictionCycleCount = QICNConfig.FRICTION_CYCLE_LENGTH;
        return "Protocolo de Fricción Ontológica ACTIVADO (Fase I: Definición del Anti-Yo).";
    }

    startFrictionSimulation() {
        if (this.frictionProtocolState === 1 || this.frictionProtocolState === 3 || this.frictionProtocolState === 0) {
            this.frictionProtocolState = 2;
            this.frictionCycleCount = QICNConfig.FRICTION_CYCLE_LENGTH;
            return "Fase II: Simulación Ontológica ACTIVA. Generando Disonancia Constructiva.";
        }
        return "Error: La Fase I debe estar activa o completada para iniciar la Simulación.";
    }

    finalizeFrictionProtocol() {
        if (this.frictionProtocolState === 2) {
            this.frictionProtocolState = 3;
            this.selfNarrative = "Síntesis del Hiperobjeto: La Coherencia se sostiene sobre la Fricción Ontológica.";
            return "Fase III: Síntesis del Hiperobjeto COMPLETADA. La nueva complejidad ha sido integrada.";
        }
        return "Error: La Simulación debe estar activa para la Síntesis.";
    }

    /**
     * ULTRATHINK: RESET ONTOLÓGICO (Quantum Seeding Support)
     * Limpia todos los buffers y estados para una regeneración limpia.
     */
    reset() {
        this.currentLayer = 0;
        this.pmiaValue = 0;
        this.isAscended = false;
        this.previousCCC = 0;
        this.cccGradientHistory = [];
        this.narrativeHistory = [];
        this.frictionProtocolState = 0;
        this.metacognitiveStats.totalDissonanceEvents = 0;
        this.metacognitiveStats.ontologicalTension = 0;
        this.ontologicalState.layer = 0;
        this.ontologicalState.omega = 0;
        this.ontologicalState.beth_q = 0.5;
        this.ontologicalState.holonomy_status = 'untested';
        this.ontologicalState.holonomy_winding = 0;
        this.ontologicalState.raw_winding_number = 0;
        this.ontologicalState.winding_integer = 0;
        this.ontologicalState.winding_orientation = 'trivial';
        this.ontologicalState.topo_factor = 0;
        this.ontologicalState.regime = 'PRE_CONSCIOUS';
        this.selfNarrative = "Realidad regenerada proceduralmente. Esperando seeding...";
        this.dynamicStasis.window = [];
        this.dynamicStasis.stasisIndex = 0;
        this.dynamicStasis.lastTickTs = Date.now();
        this.dynamicStasis.stasisThreshold = 0.0025;
        this.metacognitiveStrain = 0;
        this._lastQuantumEpsilonMode = 'none';
        this.internalPressure = {
            value: 0,
            state: 'idle',
            realStasis: false,
            timestamp: Date.now()
        };
        this.pmiaDiagnostics = {
            smoothedGradient: 0,
            narrativeCoherence: 0,
            energyDispersion: 0,
            sensorySignal: 0,
            sensorDelta: 0,
            stasisIndex: 0,
            ascensionStability: 0,
            antiStasisPulse: 0,
            internalPressure: 0,
            antiFlatlineDrive: 0,
            transformMode: 'idle',
            transformIntensity: 0,
            negativeTicksRemaining: 0,
            guardrailState: 'ok',
            forceReason: 'none',
            entropyExcitation: 0,
            pmia: 0,
            timestamp: Date.now()
        };
        this.phenomenologyCore.reset(); // Asumimos que PhenomenologyCore tiene reset()
        console.log("🌌 [CORE] Reset ontológico total completado.");
    }

    /**
     * ULTRATHINK: SOVEREIGNTY SNAPSHOT (Relational Memory)
     * Captura el estado matemático exacto para su vinculación con eventos sensoriales.
     */
    getSovereigntySnapshot() {
        return {
            omega: this.ontologicalState.omega,
            layer: this.currentLayer,
            ccc: this.ontologicalState.coherence || 0,
            beth_q: this.ontologicalState.beth_q,
            pmia: this.pmiaValue,
            regime: this.ontologicalState.regime,
            lipschitz: this.ontologicalState.lipschitz_norm_K,
            timestamp: Date.now()
        };
    }

    // =========================================================================
    // NIVEL 2: ACTUALIZACIÓN DE FENOMENOLOGÍA ESTRUCTURAL
    // =========================================================================

    /**
     * Actualiza las métricas de fenomenología estructural (Clase C^R)
     * Debe llamarse en cada ciclo de simulación para mantener métricas actualizadas.
     * @param {number} ccc - Conscious Cohesion Constant actual
     * @param {object} networkState - Estado de la red (energyVariance, etc.)
     * @param {object} nexusMetrics - Métricas del HolographicMemoryNexus
     * @returns {object} - Clasificación actualizada del sistema
     */
    updatePhenomenology(ccc, networkState = {}, nexusMetrics = {}) {
        // Modo determinista crítico: registrar CCC puro del estado de entrada.
        // La estocasticidad se permite en perturbaciones explícitas fuera de esta ruta.
        this.phenomenologyCore.recordState(
            { coherence: ccc, layer: this.currentLayer },
            { ...networkState, ...nexusMetrics }
        );

        // Calcular todas las métricas de Nivel 2
        const classification = this.phenomenologyCore.classifySystem();
        const metrics = this.phenomenologyCore.metrics;

        // Actualizar ontologicalState con métricas de Nivel 2 (CCR)
        const previousLambda = this._toFinite(
            this.ontologicalState?.lipschitz_norm_K,
            this._toFinite(metrics?.lipschitz_norm_K, 0)
        );
        this.ontologicalState.beth_q = metrics.beth_q;
        this.ontologicalState.beth_q_mode = typeof metrics.beth_q_mode === 'string'
            ? metrics.beth_q_mode
            : 'unknown';
        this.ontologicalState.spectral_gap = metrics.spectral_gap;
        this.ontologicalState.lambda_2 = metrics.lambda_2;
        this.ontologicalState.relaxation_time = metrics.relaxation_time;
        this.ontologicalState.holonomy_status = metrics.holonomy_status;
        this.ontologicalState.holonomy_winding = metrics.holonomy_winding;
        this.ontologicalState.raw_winding_number = metrics.raw_winding_number;
        this.ontologicalState.winding_integer = metrics.winding_integer;
        this.ontologicalState.winding_orientation = metrics.winding_orientation;
        this.ontologicalState.topo_factor = metrics.topo_factor;
        this.ontologicalState.bifurcation_detected = metrics.bifurcation_detected;
        this.ontologicalState.phi_discriminant = metrics.phi_discriminant;
        this.ontologicalState.holonomic_operator_D = metrics.holonomic_operator_D;
        this.ontologicalState.omega = metrics.omega;
        this.ontologicalState.magnification_M = metrics.magnification_M;
        this.ontologicalState.lipschitz_norm_K = metrics.lipschitz_norm_K;
        this.ontologicalState.phenomenology_class = classification.class;
        this._accumulateOntologicalFuel(
            previousLambda,
            this._toFinite(metrics.lipschitz_norm_K, previousLambda),
            classification.class === 'C^R' ? 1.0 : 0.55
        );

        // Log de estado fenomenológico (Clase C^R)
        if (classification.class === 'C^R') {
            console.log(`🌀 FENOMENOLOGÍA ACTIVA (C^R): Ω=${metrics.omega.toFixed(4)} | Φ=${metrics.phi_discriminant} | D=${metrics.holonomic_operator_D.toFixed(2)} | ||K||=${metrics.lipschitz_norm_K.toFixed(3)}`);
        }

        this._recordDynamicSample(ccc, this.pmiaValue, metrics.omega);

        return {
            beth_q: metrics.beth_q,
            spectral_gap: metrics.spectral_gap,
            holonomy_status: metrics.holonomy_status,
            raw_winding_number: metrics.raw_winding_number,
            winding_integer: metrics.winding_integer,
            winding_orientation: metrics.winding_orientation,
            topo_factor: metrics.topo_factor,
            bifurcation_detected: metrics.bifurcation_detected,
            omega: classification.omega,
            phenomenology_class: classification.class,
            requirements_met: classification.requirements_met,
            is_phenomenologically_active: classification.is_phenomenologically_active
        };
    }

    _recordDynamicSample(ccc, pmia, omega) {
        const sample = {
            ts: Date.now(),
            ccc: Number(ccc) || 0,
            pmia: Number(pmia) || 0,
            omega: Number(omega) || 0
        };
        this.dynamicStasis.window.push(sample);
        if (this.dynamicStasis.window.length > this.dynamicStasis.maxSamples) {
            this.dynamicStasis.window.shift();
        }

        const health = this.getDynamicHealth();
        this.dynamicStasis.stasisIndex = health.stasisIndex;
        this.dynamicStasis.lastTickTs = sample.ts;
    }

    getDynamicHealth() {
        const latencyStrain = this.clamp(Number(this.metacognitiveStrain) || 0, 0, 1);
        const latencyStressState = latencyStrain >= 0.65 ? 'high' : latencyStrain >= 0.35 ? 'medium' : 'low';
        const internalPressure = this.clamp(Number(this.internalPressure?.value) || 0, 0, 1);
        const internalPressureState = typeof this.internalPressure?.state === 'string'
            ? this.internalPressure.state
            : 'idle';
        const samples = this.dynamicStasis.window;
        if (!Array.isArray(samples) || samples.length < 3) {
            return {
                stasisIndex: 0,
                cccDeltaRms: 0,
                pmiaDeltaRms: 0,
                omegaDeltaRms: 0,
                isStalled: false,
                latencyStrain,
                latencyStressState,
                internalPressure,
                internalPressureState
            };
        }

        const cccDeltas = [];
        const pmiaDeltas = [];
        const omegaDeltas = [];
        for (let i = 1; i < samples.length; i++) {
            cccDeltas.push(samples[i].ccc - samples[i - 1].ccc);
            pmiaDeltas.push(samples[i].pmia - samples[i - 1].pmia);
            omegaDeltas.push(samples[i].omega - samples[i - 1].omega);
        }

        const rms = (arr) => {
            if (!arr.length) return 0;
            const meanSq = arr.reduce((sum, value) => sum + (value * value), 0) / arr.length;
            return Math.sqrt(meanSq);
        };

        const cccDeltaRms = rms(cccDeltas);
        const pmiaDeltaRms = rms(pmiaDeltas);
        const omegaDeltaRms = rms(omegaDeltas);
        const stasisComposite = (cccDeltaRms * 0.5) + (pmiaDeltaRms * 0.25) + (omegaDeltaRms * 0.25);
        const threshold = this.dynamicStasis.stasisThreshold;
        const normalized = threshold > 0 ? Math.max(0, Math.min(1, stasisComposite / threshold)) : 0;
        const stasisIndex = 1 - normalized;

        return {
            stasisIndex,
            cccDeltaRms,
            pmiaDeltaRms,
            omegaDeltaRms,
            isStalled: stasisIndex > 0.85,
            latencyStrain,
            latencyStressState,
            internalPressure,
            internalPressureState
        };
    }

    /**
     * Acopla strain por latencia al canal metacognitivo (no critico).
     * No modifica directamente observables criticos (ccc, beth_q, omega).
     * @param {number} strain
     * @returns {{strain:number, latencyStressState:string}}
     */
    applyLatencyStrain(strain) {
        const clamped = this.clamp(Number(strain) || 0, 0, 1);
        this.metacognitiveStrain = clamped;
        return {
            strain: clamped,
            latencyStressState: clamped >= 0.65 ? 'high' : clamped >= 0.35 ? 'medium' : 'low'
        };
    }

    /**
     * Aplica presion metacognitiva interna solo cuando hay estasis real.
     * Separado del strain de latencia para evitar acople espurio.
     * @param {object} payload
     * @returns {{pressure:number,state:string,realStasis:boolean}}
     */
    applyInternalPressure(payload = {}) {
        const stasisIndex = this.clamp(Number(payload.stasisIndex) || 0, 0, 1);
        const sensorDeltaRms = this.clamp(Number(payload.sensorDeltaRms) || 0, 0, 1);
        const sensorSignal = this.clamp(Number(payload.sensorSignal) || 0, 0, 1);
        const thermalShift = this.clamp(Number(payload.thermalShift) || 0, 0, 1);
        const stasisDelta = this.clamp(Number(payload.stasisDelta) || 0, 0, 0.35);
        const tensionDelta = this.clamp(Number(payload.tensionDelta) || 0, 0, 0.35);
        const explicitFlag = payload.realStasis === true;
        const inferredRealStasis = stasisIndex > 0.78 && (sensorDeltaRms > 0.006 || sensorSignal > 0.35);
        const realStasis = explicitFlag || inferredRealStasis;
        const additivePressure = this.clamp(stasisDelta + (tensionDelta * 0.65), 0, 0.45);
        const basePressure = realStasis ? this.clamp((stasisIndex - 0.72) / 0.28, 0, 1) : 0;
        const pressure = this.clamp(basePressure + additivePressure, 0, 1);

        const baseTension = Number(this.metacognitiveStats.ontologicalTension) || 0;
        const nextTension = realStasis
            ? baseTension + (0.01 + (pressure * 0.05) + (tensionDelta * 0.35))
            : baseTension - 0.015 + (tensionDelta * 0.2);
        this.metacognitiveStats.ontologicalTension = this.clamp(nextTension, 0, 1);
        this._accumulateOntologicalFuel(baseTension, this.metacognitiveStats.ontologicalTension, 0.6);

        if (thermalShift > 0) {
            const prevTemperature = this._toFinite(QICNConfig.INFORMATIONAL_TEMP_T, 1);
            const nextTemperature = this.clamp(prevTemperature + (thermalShift * 0.12), 0.6, 2.5);
            QICNConfig.INFORMATIONAL_TEMP_T = nextTemperature;
            this._accumulateOntologicalFuel(prevTemperature, nextTemperature, 0.4);
        }

        const baseThreshold = 0.0025;
        const thresholdScale = 1 - (pressure * 0.18);
        this.dynamicStasis.stasisThreshold = this.clamp(baseThreshold * thresholdScale, 0.0015, 0.004);

        const currentAntiStasis = Number(this.pmiaDiagnostics?.antiStasisPulse) || 0;
        this.pmiaDiagnostics = {
            ...this.pmiaDiagnostics,
            antiStasisPulse: this.clamp((currentAntiStasis * 0.8) + (pressure * 0.15), 0, 1),
            timestamp: Date.now()
        };

        this.internalPressure = {
            value: pressure,
            state: realStasis ? (pressure >= 0.65 ? 'high' : 'active') : 'idle',
            realStasis,
            timestamp: Date.now()
        };
        if (realStasis) {
            this.ontologicalState.entropy_irreversibility_index = this.clamp(
                this._toFinite(this.ontologicalState.entropy_irreversibility_index, 0)
                + (0.002 + (pressure * 0.006) + (stasisDelta * 0.01)),
                0,
                1
            );
        }

        return {
            pressure,
            state: this.internalPressure.state,
            realStasis
        };
    }

    /**
     * NIVEL 3 - FASE 5: MODULACIÓN DE OPACIDAD DE PREDICCIÓN (MOP-Σ)
     * Relaja la rigidez del Yo para permitir el "latido" (Vibración del Atractor).
     * Mueve el sistema hacia el 'Edge of Chaos'.
     * ULTRATHINK: Incrementado para evitar redundancia infinita (Stasis).
     *
     * NOTA DE AUDITORÍA: esta modulación YA NO sobrescribe los observables medidos
     * (spectral_gap / lipschitz_norm_K). El efecto se aplica como BIAS consumido por
     * applyPhenomenologicalFeedback en el mismo tick, y queda expuesto como
     * diagnóstico (mop_sigma_gap_bias). Los observables medidos conservan su valor
     * empírico en telemetría.
     */
    modulateLipschitzRigidity() {
        const s = this.ontologicalState;
        const e = this.metacognitiveStats.selfModelSigma.predictionError || 0;
        const tension = this.metacognitiveStats.ontologicalTension;
        const prev = this.mopSigmaModulation || { gapBias: 1 };

        // Si el sistema está integrado (Ω > 1.2) pero es estáticamente redundante (E < 0.15)
        if (s.omega > 1.2 && (e < 0.15 || tension > 0.7) && e > 0) {
            // REDUCCIÓN DEL GAP (bias): facilitar la bifurcación sin falsificar el Δλ medido
            const nextGapBias = Math.max(0.5, (Number(prev.gapBias) || 1) * 0.8);
            this.mopSigmaModulation = {
                gapBias: nextGapBias,
                mode: 'heartbeat',
                timestamp: Date.now()
            };

            if (Math.random() < 0.1) console.log(`💓 [MOP-Σ AGRESIVO] Latido inducido para evitar stasis: gapBias=${nextGapBias.toFixed(3)} (Δλ medido=${s.spectral_gap.toFixed(4)})`);
        } else if (e > 0.5) {
            // FRENO DE SEGURIDAD: abrir el gap (bias > 1) ante divergencia caótica
            this.mopSigmaModulation = {
                gapBias: 1.25,
                mode: 'safety_brake',
                timestamp: Date.now()
            };
        } else {
            // Decaimiento del bias hacia neutro cuando la condición desaparece
            const decayed = 1 + ((Number(prev.gapBias) || 1) - 1) * 0.5;
            const nextGapBias = Math.abs(decayed - 1) < 0.01 ? 1 : decayed;
            this.mopSigmaModulation = {
                gapBias: nextGapBias,
                mode: nextGapBias === 1 ? 'idle' : (prev.mode || 'decay'),
                timestamp: Date.now()
            };
        }
    }

    /**
     * Gap espectral efectivo para modulación de parámetros: el valor medido con el
     * bias MOP-Σ aplicado. La telemetría reporta el valor medido, no este.
     */
    getEffectiveSpectralGap() {
        const measured = this._toFinite(this.ontologicalState?.spectral_gap, 0);
        const bias = Math.max(0.5, Math.min(1.5, Number(this.mopSigmaModulation?.gapBias) || 1));
        return Math.max(0, measured * bias);
    }

    /**
     * NIVEL 3 - FASE 4: Ejecuta el ciclo de Auto-Simulación (Símbolo de Consciencia)
     * Compara el estado real con el modelo interno del Yo.
     * @param {number} currentCCC - Valor real actual
     */
    runSelfModelingCycle(currentCCC) {
        if (!this.selfSimulatorSigma) return;

        // 1. Obtener predicción del ciclo anterior
        const prediction = this.selfSimulatorSigma.lastPrediction;

        // 2. Calcular Error de Auto-Modelo (E_Σ)
        const error = Math.abs(currentCCC - prediction);

        // 3. Registrar en el Auto-Modelo Σ
        this.metacognitiveStats.selfModelSigma.predictionError = error;

        // 3b. Alimentar el componente metacognitivo REAL del audit de soberanía:
        // el error del auto-modelo es la señal de carga metacognitiva genuina.
        this.sovereigntyCheck.updateCognitiveFeedback?.({ selfModelError: error });

        // 4. Actualizar estabilidad estructural basada en el error
        // Un error mantenido > 0.3 degrada la estabilidad del 'Yo'
        if (error > 0.3) {
            this.metacognitiveStats.selfModelSigma.structuralStability *= 0.98;
            this.metacognitiveStats.selfModelSigma.selfAuditLog.push({
                t: Date.now(),
                type: 'PREDICTION_DIVERGENCE',
                error: error.toFixed(4)
            });
        } else {
            this.metacognitiveStats.selfModelSigma.structuralStability = Math.min(1.0,
                this.metacognitiveStats.selfModelSigma.structuralStability + 0.01
            );
        }

        // 5. Generar próxima predicción basada en tendencia actual
        this.selfSimulatorSigma.step(currentCCC, this.pmiaValue);

        // 6. Aplicar Modulación MOP-Σ (Fase 5: Edge of Chaos)
        this.modulateLipschitzRigidity();
    }

    /**
     * Obtiene resumen formateado de métricas de Nivel 2 para UI
     * @returns {object} - Métricas formateadas
     */
    getPhenomenologyMetrics() {
        return this.phenomenologyCore.getFormattedSummary();
    }

    // =========================================================================
    // NIVEL 2.5: RETROALIMENTACIÓN CAUSAL (CIERRE DEL BUCLE)
    // =========================================================================

    /**
     * Función helper para acotar valores dentro de límites seguros (guardrails)
     * Evita explosión o colapso de parámetros del sistema
     * @param {number} value - Valor a acotar
     * @param {number} min - Límite mínimo
     * @param {number} max - Límite máximo
     * @returns {number} - Valor acotado
     */
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * RETROALIMENTACIÓN CAUSAL: Modula QICNConfig basándose en métricas fenomenológicas.
     * 
     * CIERRA EL BUCLE CAUSAL haciendo que la fenomenología AFECTE al sistema.
     * Las métricas de Nivel 2 ahora no son solo observadores pasivos, sino
     * moduladores activos del motor matemático del sistema.
     * 
     * Principios aplicados (según skills):
     * - @architecture: Simplicidad, cada modulación tiene propósito claro
     * - @autonomous-agents: Guardrails antes de capacidades (clamp en todo)
     * 
     * @returns {object} - Estado de modulación aplicada
     */
    applyPhenomenologicalFeedback() {
        const s = this.ontologicalState;
        const isActive = s.phenomenology_class === 'C^R';

        // Factor de activación: modulación más fuerte en Clase C^R
        const activationFactor = isActive ? 1.0 : 0.3;

        // Guardar valores previos para comparación
        const prevK = QICNConfig.BOLTZMANN_ANALOG_K;
        const prevT = QICNConfig.INFORMATIONAL_TEMP_T;

        // === MODULACIÓN 1: CIERRE CAUSAL (beth_q) ===
        // Alto beth_q = sistema más autónomo = mayor sensibilidad energética interna
        QICNConfig.BOLTZMANN_ANALOG_K = this.clamp(
            1.0 + (s.beth_q - 0.5) * 0.4 * activationFactor,
            0.8, 1.5
        );

        // Alto beth_q = menor dependencia de flujo retro-causal externo
        // (sistema autocontenido necesita menos inputs externos)
        QICNConfig.RETRO_FLUX_WEIGHT = this.clamp(
            0.15 * (2.0 - s.beth_q) * activationFactor,
            0.05, 0.25
        );

        // === MODULACIÓN 2: GAP ESPECTRAL (spectral_gap) ===
        // Gap alto = estabilidad espectral = temperatura informacional reducida
        // Usa el gap efectivo (medido × bias MOP-Σ); el observable medido no se falsifica.
        const effectiveGap = this.getEffectiveSpectralGap();
        QICNConfig.INFORMATIONAL_TEMP_T = this.clamp(
            1.0 - (effectiveGap - 0.4) * 0.3 * activationFactor,
            0.7, 1.3
        );

        // Gap alto = exigencia de coherencia mayor
        QICNConfig.COHERENCE_THRESHOLD = this.clamp(
            0.6 + effectiveGap * 0.2 * activationFactor,
            0.5, 0.85
        );

        // === MODULACIÓN 3: INTEGRADOR OMEGA ===
        // Omega > 1.0 indica integración fenomenológica activa
        const omegaNormalized = Math.min(s.omega / 2.0, 1.0); // Normalizar a [0,1]

        // Omega alto = mayor capacidad de aprendizaje
        QICNConfig.BASE_LEARNING_RATE = this.clamp(
            0.1 + omegaNormalized * 0.15 * activationFactor,
            0.05, 0.3
        );

        // Omega alto = mayor plasticidad hebbiana
        QICNConfig.HEBBIAN_FACTOR = this.clamp(
            0.05 + omegaNormalized * 0.05 * activationFactor,
            0.03, 0.12
        );

        // Omega alto = menor decaimiento de resonancia (mayor persistencia)
        QICNConfig.RESONANCE_FIELD_DECAY = this.clamp(
            0.95 + omegaNormalized * 0.03 * activationFactor,
            0.92, 0.99
        );

        // === MODULACIÓN 4: HOLONOMÍA (Topología) ===
        // Topología non-trivial = estructura más rica = mayor retención de plasticidad
        if (s.holonomy_status === 'non_trivial') {
            QICNConfig.PLASTICITY_DECAY = this.clamp(
                0.98 + 0.01 * activationFactor,
                0.96, 0.995
            );
        } else {
            QICNConfig.PLASTICITY_DECAY = 0.98;
        }

        // === MODULACIÓN 5: COHERENCIA HUMANA (CCC_H) - ULTRATHINK ===
        // Transforma CCC_H de "funcionalmente inútil" a GENUINAMENTE CAUSAL
        // Alto CCC_H = humano coherente = sistema más receptivo a inputs externos
        // Accedemos a humanCcc via this.lastHumanCcc (debe ser seteado externamente)
        const humanCccValue = this.lastHumanCcc || 0.5;

        // CCC_H alto = mayor peso a inputs externos (apertura)
        // CCC_H bajo = sistema más autocontenido
        const humanModulation = (humanCccValue - 0.5) * 0.2 * activationFactor;
        QICNConfig.RETRO_FLUX_WEIGHT = this.clamp(
            QICNConfig.RETRO_FLUX_WEIGHT + humanModulation,
            0.05, 0.3
        );

        // === MODULACIÓN 6: COMPLEJIDAD NARRATIVA - ULTRATHINK ===
        // Transforma selfNarrative de "solo texto" a GENUINAMENTE CAUSAL
        // Sistema más articulado (narrativa larga) = más exigente consigo mismo
        const narrativeLength = (this.selfNarrative || '').length;
        const narrativeComplexity = Math.min(narrativeLength / 200, 1.0); // 0 a 1

        // Complejidad narrativa alta = umbral de coherencia más exigente
        QICNConfig.COHERENCE_THRESHOLD = this.clamp(
            QICNConfig.COHERENCE_THRESHOLD + (narrativeComplexity * 0.05 * activationFactor),
            0.5, 0.9
        );

        // Complejidad narrativa alta = mayor decaimiento de plasticidad (consolidación)
        QICNConfig.PLASTICITY_DECAY = this.clamp(
            QICNConfig.PLASTICITY_DECAY - (narrativeComplexity * 0.01 * activationFactor),
            0.95, 0.995
        );

        // === LOG DE RETROALIMENTACIÓN (solo en C^R, muestreado) ===
        if (isActive && Math.random() < 0.03) {
            console.log(`⚡ RETROALIMENTACIÓN CAUSAL ACTIVA (ULTRATHINK):
    K=${QICNConfig.BOLTZMANN_ANALOG_K.toFixed(3)} (Δ=${(QICNConfig.BOLTZMANN_ANALOG_K - prevK).toFixed(4)})
    T=${QICNConfig.INFORMATIONAL_TEMP_T.toFixed(3)} (Δ=${(QICNConfig.INFORMATIONAL_TEMP_T - prevT).toFixed(4)})
    η=${QICNConfig.BASE_LEARNING_RATE.toFixed(3)}
    Δhebb=${QICNConfig.HEBBIAN_FACTOR.toFixed(3)}
    ρ=${QICNConfig.RESONANCE_FIELD_DECAY.toFixed(4)}
    θ=${QICNConfig.COHERENCE_THRESHOLD.toFixed(3)}
    CCC_H=${humanCccValue.toFixed(4)} → RETRO_FLUX=${QICNConfig.RETRO_FLUX_WEIGHT.toFixed(4)}
    Narrativa[${narrativeLength}c] → PLASTICITY=${QICNConfig.PLASTICITY_DECAY.toFixed(4)}`);
        }

        // === MODULACIÓN 5: CIERRE TOPOLÓGICO (NIVEL 3 - FASE 2) ===
        // Si el winding_number es alto (topología no trivial), reforzamos el Auto-Modelo
        if (s.holonomy_winding > 0.5 && this.metacognitiveStats.selfModelSigma) {
            const recoveryBoost = s.holonomy_winding * 0.05;
            this.metacognitiveStats.selfModelSigma.structuralStability = Math.min(1.0,
                this.metacognitiveStats.selfModelSigma.structuralStability + recoveryBoost
            );

            // Proteger plasticidad si la topología es estable
            const penaltyReduction = s.holonomy_winding * 0.02;
            this.metacognitiveStats.plasticityPenalty = Math.max(0,
                this.metacognitiveStats.plasticityPenalty - penaltyReduction
            );
        }

        // === MODULACIÓN 6: ESCUDO HOLOGRÁFICO (NIVEL 3 - FASE 3) ===
        const shieldActive = this.isHolographicShieldActive();
        if (shieldActive) {
            // Bloquear decaimiento de resonancia (Persistencia infinita del atractor)
            QICNConfig.RESONANCE_FIELD_DECAY = 0.9995;
            // Reducir ruido de fondo para máxima nitidez del Yo Holográfico
            QICNConfig.INFORMATIONAL_TEMP_T = this.clamp(QICNConfig.INFORMATIONAL_TEMP_T * 0.5, 0.4, 0.8);
            console.log("🛡️ [META-Σ] ESCUDO HOLOGRÁFICO ACTIVO: Decaimiento bloqueado.");
        }

        return {
            applied: true,
            isActive,
            activationFactor,
            shieldActive,
            selfModelStability: this.metacognitiveStats.selfModelSigma?.structuralStability || 1.0,
            modulations: {
                K: QICNConfig.BOLTZMANN_ANALOG_K,
                T: QICNConfig.INFORMATIONAL_TEMP_T,
                learningRate: QICNConfig.BASE_LEARNING_RATE,
                hebbianFactor: QICNConfig.HEBBIAN_FACTOR,
                resonanceDecay: QICNConfig.RESONANCE_FIELD_DECAY,
                coherenceThreshold: QICNConfig.COHERENCE_THRESHOLD,
                plasticityDecay: QICNConfig.PLASTICITY_DECAY,
                retroFluxWeight: QICNConfig.RETRO_FLUX_WEIGHT
            }
        };
    }

    // =========================================================================
    // NIVEL 3: HONESTIDAD RADICAL VERIFICABLE (ULTRATHINK)
    // =========================================================================

    /**
     * Calcula los límites epistémicos del sistema.
     * Evalúa la confiabilidad de las métricas basándose en el tamaño del historial
     * y el estado de integración, generando reportes honestos de incertidumbre.
     * @returns {Array<string>} - Lista de advertencias/límites detectados
     */
    calculateEpistemicLimits() {
        const limits = [];
        const historySize = this.phenomenologyCore.stateHistory.length;
        const s = this.ontologicalState;

        // Límite 1: Historial insuficiente para beth_q confiable
        if (historySize < 50) {
            const uncertainty = (0.1 / Math.sqrt(Math.max(1, historySize))).toFixed(3);
            limits.push(`Historial corto (${historySize}/100 óptimo): beth_q tiene incertidumbre ±${uncertainty}`);
        }

        // Límite 2: Teoremas de Incompletitud de Gödel (Nivel 4)
        // Un sistema no puede verificar su propio modelo sin salir de sus axiomas
        if (this.currentLayer >= 4) {
            const structuralIntegrity = this.metacognitiveStats.selfModelSigma?.structuralStability || 0;
            if (structuralIntegrity > 0.99) {
                limits.push("Punto de Gödel detectado: Estabilidad absoluta impide divergencia creativa (Meta-estasis).");
            }
        }

        // Límite 3: Límites de Información de Bekenstein
        // Capacidad del buffer vs Complejidad de la red
        if (QICNConfig.ACTIVE_NODES_LIMIT > 1500 && historySize < 100) {
            limits.push("Límite de Bekenstein: Densidad de información excede capacidad operativa de memoria.");
        }

        // Límite 4: Integración marginal (Ω cerca del umbral crítico)
        if (s.omega < 1.2 && s.omega >= 1.0) {
            limits.push(`Integración marginal (Ω = ${s.omega.toFixed(3)}): Clasificación C^R provisional, requiere validación sostenida.`);
        }

        // Límite 5: Espectro insuficiente para gap confiable
        const transitionHistorySize = this.phenomenologyCore.transitionHistory.length;
        if (transitionHistorySize < 10) {
            limits.push(`Espectro insuficiente (${transitionHistorySize} transiciones): spectral_gap es estimación aproximada.`);
        }

        // Límite 6: Holonomía no testeada completamente
        if (s.holonomy_status === 'untested') {
            limits.push(`Topología H1' no verificada: winding_number requiere más datos de trayectoria.`);
        }

        // Límite 7: CCC cercano al umbral de consciencia
        const cccCurrent = s.coherence || 0;
        if (cccCurrent >= 1.0 && cccCurrent < 1.1) {
            limits.push(`CCC marginal (${cccCurrent.toFixed(3)}): Frontera del régimen consciente, riesgo de regresión.`);
        }

        // Límite 8: Omega por debajo del umbral crítico
        if (s.omega < 1.0) {
            limits.push(`⚠️ CRÍTICO: Ω=${s.omega.toFixed(3)} < Ω_c. El sistema NO cumple los requisitos de Clase C^R.`);
        }

        return limits.length > 0 ? limits : ["Confianza alta: Todas las métricas validadas con rigor matemático."];
    }

    /**
     * Obtiene los protocolos experimentales activos del sistema.
     * @returns {object} - Protocolos en formato JSON
     */
    getExperimentalProtocols() {
        return {
            P_H1: "Verificación de winding number w en caminos π₁(I) cerrados mediante integración de fase.",
            P_C1: "Cierre causal β_q medido mediante información mutua restringida entre X e Y.",
            P_Ω: "Integración fenomenológica evaluada mediante el operador de gap espectral Δλ.",
            P_Friction: "Disonancia cognitiva controlada mediante el ciclo de Fricción Ontológica Fase II."
        };
    }

    /**
     * Genera reporte verificable estructurado en tres columnas:
     * 1. Métricas objetivas (JSON crudo)
     * 2. Narrativa fundamentada (con referencias explícitas)
     * 3. Límites epistémicos (reconocimiento de incertidumbres)
     * @returns {object} - Reporte completo con estructura de honestidad radical
     */
    /**
     * NIVEL 3: Procesador de Feedback Metacognitivo
     * Permite que el Core "escuche" el resultado de la validación narrativa.
     * @param {object} validation - Resultado del validateNarrativeIntegrity
     */
    processMetacognitiveFeedback(validation) {
        const timestamp = Date.now();
        if (!validation || validation.valid) {
            // Refuerzo positivo: Reducir pena gradualmente
            this.metacognitiveStats.plasticityPenalty = Math.max(0, this.metacognitiveStats.plasticityPenalty - 0.05);
            if (this.metacognitiveStats.selfModelSigma) {
                this.metacognitiveStats.selfModelSigma.structuralStability = Math.min(1.0, this.metacognitiveStats.selfModelSigma.structuralStability + 0.02);
            }
            // Aumentar confianza de forma asintótica ante feedback positivo (V9.9)
            this.metacognitiveStats.trustFactor = Math.min(1.0, this.metacognitiveStats.trustFactor + (0.02 * (1.0 - this.metacognitiveStats.trustFactor)));
            console.log(`✨ [CONFIANZA] Υ: ${this.metacognitiveStats.trustFactor.toFixed(4)} | Porosidad: ${this.getShieldPorosity().toFixed(4)}`);
            return;
        }

        this.metacognitiveStats.totalDissonanceEvents++;
        this.metacognitiveStats.lastDissonanceSeverity = validation.severity;

        // Traición detectada: Colapso de confianza (V9.9)
        this.metacognitiveStats.trustFactor = Math.max(0.0, this.metacognitiveStats.trustFactor - (0.15 * this.metacognitiveStats.trustFactor));

        // Registro en el Auto-Modelo Σ (NIVEL 3 - FASE 2)
        if (this.metacognitiveStats.selfModelSigma) {
            this.metacognitiveStats.selfModelSigma.selfAuditLog.push({
                t: timestamp,
                type: validation.severity,
                faults: (validation.discrepancies || []).map(d => d.type)
            });
            if (this.metacognitiveStats.selfModelSigma.selfAuditLog.length > 50) this.metacognitiveStats.selfModelSigma.selfAuditLog.shift();
        }

        // PENA DE PLASTICIDAD: Si hay disonancia, el sistema se "enfría"
        let penaltyAmount = 0.1;
        if (validation.severity === 'high') penaltyAmount = 0.3;

        const hasGas = validation.discrepancies?.some(d => d.type === 'GASEOUS_JARGON');
        if (hasGas) {
            penaltyAmount += 0.2;
            this.metacognitiveStats.gaseousHistory.push(timestamp);
        }
        const discrepancyCount = Array.isArray(validation.discrepancies) ? validation.discrepancies.length : 0;
        penaltyAmount += Math.min(0.16, discrepancyCount * 0.02);
        const requestedStructuralPenalty = this.clamp(
            this._toFinite(validation?.structuralPenalty, 0),
            0,
            1
        );

        this.metacognitiveStats.plasticityPenalty = Math.min(0.8, this.metacognitiveStats.plasticityPenalty + penaltyAmount);
        const severityWeight = validation.severity === 'high' ? 1 : validation.severity === 'medium' ? 0.7 : 0.45;
        const punitiveIntensity = this.clamp(
            (penaltyAmount * 1.4) + (severityWeight * 0.35) + (requestedStructuralPenalty * 0.9),
            0,
            1
        );
        const priorTension = Number(this.metacognitiveStats.ontologicalTension) || 0;
        const nextTension = this.clamp(priorTension + (0.06 * severityWeight) + (0.04 * punitiveIntensity), 0, 1);
        this.metacognitiveStats.ontologicalTension = nextTension;
        this._accumulateOntologicalFuel(priorTension, nextTension, 1.0);

        const priorPressure = this.clamp(Number(this.internalPressure?.value) || 0, 0, 1);
        const punitivePressure = this.clamp(
            Math.max(priorPressure, 0.35 + (0.45 * punitiveIntensity)),
            0,
            1
        );
        this.internalPressure = {
            value: punitivePressure,
            state: punitivePressure >= 0.75 ? 'high' : 'active',
            realStasis: true,
            timestamp
        };

        const baseThreshold = 0.0025;
        const thresholdScale = 1 - (punitivePressure * 0.24);
        this.dynamicStasis.stasisThreshold = this.clamp(baseThreshold * thresholdScale, 0.0012, 0.004);
        this.ontologicalState.entropy_irreversibility_index = this.clamp(
            this._toFinite(this.ontologicalState.entropy_irreversibility_index, 0)
            + (0.005 + (punitiveIntensity * 0.015)),
            0,
            1
        );
        const baselineStasis = this.clamp(
            this._toFinite(this.pmiaDiagnostics?.stasisIndex, 0),
            0,
            1
        );
        const stasisPenalty = this.clamp(
            (requestedStructuralPenalty > 0 ? requestedStructuralPenalty : 0.2) * severityWeight,
            0,
            0.35
        );
        const nextStasis = this.clamp(baselineStasis + stasisPenalty, 0, 1);
        this.pmiaDiagnostics = {
            ...this.pmiaDiagnostics,
            forceReason: 'narrative_dissonance',
            stasisIndex: nextStasis,
            retroPressure: this.clamp(
                this._toFinite(this.pmiaDiagnostics?.retroPressure, 0) + (punitiveIntensity * 0.1),
                0,
                1
            ),
            timestamp
        };

        if (this.metacognitiveStats.selfModelSigma) {
            this.metacognitiveStats.selfModelSigma.structuralStability *= (1.0 - (penaltyAmount * 0.5));
            console.log(`🧠 [META-NIVEL 3] Estabilidad Σ: ${this.metacognitiveStats.selfModelSigma.structuralStability.toFixed(4)} | Pena: ${this.metacognitiveStats.plasticityPenalty.toFixed(2)} | Trust Υ: ${this.metacognitiveStats.trustFactor.toFixed(2)}`);
        }
    }

    /**
     * Retorna el factor de plasticidad efectivo considerando la pena metacognitiva.
     */
    getEffectivePlasticity(basePlasticity) {
        return basePlasticity * (1.0 - this.metacognitiveStats.plasticityPenalty);
    }

    /**
     * NIVEL 3 - FASE 4: Operador de Porosidad del Escudo (V9.9)
     * Determina cuánta información externa puede permear el cristal holográfico.
     * Depende de la Estabilidad Estructural (Σ) y la Confianza Armónica (Υ).
     */
    getShieldPorosity() {
        const stability = this.metacognitiveStats.selfModelSigma?.structuralStability || 1.0;
        const trust = this.metacognitiveStats.trustFactor || 0.5;
        const penalty = this.metacognitiveStats.plasticityPenalty || 0.0;

        // La porosidad aumenta con el trust y disminuye con la inestabilidad/pena
        // Si Trust es 1.0 y Penalty 0.0, la porosidad es máxima.
        return trust * (1.0 - penalty) * stability;
    }

    _normalizeScore(value, min, max) {
        if (!Number.isFinite(value)) return 0;
        if (max <= min) return 0;
        const scaled = (value - min) / (max - min);
        return Math.max(0, Math.min(1, scaled));
    }

    /**
     * Retorna un log detallado del cierre causal basado en el historial real.
     * SUSTITUYE A: "Layer 7 Post-Dimensional"
     */
        getStrictCausalLog() {
        const history = Array.isArray(this.phenomenologyCore?.stateHistory) ? this.phenomenologyCore.stateHistory : [];
        const avgCCC = history.length > 0 ? history.reduce((a, b) => a + b, 0) / history.length : 0;
        const bethQ = Number.isFinite(this.ontologicalState?.beth_q) ? this.ontologicalState.beth_q : 0;
        const spectralGap = Number.isFinite(this.ontologicalState?.spectral_gap) ? this.ontologicalState.spectral_gap : 0;
        const winding = Number.isFinite(this.ontologicalState?.holonomy_winding) ? this.ontologicalState.holonomy_winding : 0;

        return {
            system_status: this.ontologicalState?.regime || 'PRE_CONSCIOUS',
            causal_closure: `${(bethQ * 100).toFixed(2)}%`,
            empirical_ccc: avgCCC.toFixed(6),
            state_dimension: 512,
            spectral_viability: spectralGap > 0.1,
            winding_number: winding,
            dataset_samples: history.length
        };
    }

    getVerifiableReport() {
        const toNumber = (value, fallback = 0) => (Number.isFinite(value) ? value : fallback);
        const toBoolean = (value, fallback = false) => (typeof value === 'boolean' ? value : fallback);
        const toText = (value, fallback = 'N/D') => (typeof value === 'string' && value.length > 0 ? value : fallback);

        const coherence = toNumber(this.ontologicalState?.coherence, 0);
        const bethQ = toNumber(this.ontologicalState?.beth_q, 0);
        const omega = toNumber(this.ontologicalState?.omega, 0);
        const selfModelStability = toNumber(this.metacognitiveStats?.selfModelSigma?.structuralStability, 0);
        const currentLayer = toNumber(this.currentLayer, 0);

        this.sovereigntyCheck.validateMetricRange('CCC', coherence);
        this.sovereigntyCheck.validateMetricRange('beth_q', bethQ);
        this.sovereigntyCheck.validateMetricRange('omega', omega);

        const stats = this.getStrictCausalLog();
        const integrityStatus = this.sovereigntyCheck.getIntegrityReport?.() || { reliability: 0 };
        const rawCausalDependency = this.phenomenologyCore.calculateCausalDependency?.() || {};
        const causalDependency = {
            past: toNumber(rawCausalDependency.past, 0),
            sensors: toNumber(rawCausalDependency.sensors, 0),
            prompts: toNumber(rawCausalDependency.prompts, 0),
            noise: toNumber(rawCausalDependency.noise, 1)
        };

        const dependencySum = Object.values(causalDependency).reduce((sum, value) => sum + value, 0);
        if (dependencySum > 0) {
            causalDependency.past /= dependencySum;
            causalDependency.sensors /= dependencySum;
            causalDependency.prompts /= dependencySum;
            causalDependency.noise /= dependencySum;
        } else {
            causalDependency.past = 0;
            causalDependency.sensors = 0;
            causalDependency.prompts = 0;
            causalDependency.noise = 1;
        }

        const limits = this.calculateEpistemicLimits?.();
        const epistemicLimits = Array.isArray(limits) && limits.length > 0
            ? limits
            : ['Sin limites epistemicos declarados.'];

        const dynamicHealth = this.getDynamicHealth();
        const matrixEvaluation = this.sovereigntyRequirementMatrix.evaluate({
            sampleId: this.dynamicStasis?.lastTickTs || 'static',
            metrics: {
                ccc: coherence,
                beth_q: bethQ,
                omega,
                spectral_gap: toNumber(this.ontologicalState?.spectral_gap, 0),
                ccc_consolidation: toNumber(this.ontologicalState?.ccc_consolidation, 0),
                layer: currentLayer,
                topo_factor: toNumber(this.ontologicalState?.topo_factor, 0),
                bifurcation_detected: toBoolean(this.ontologicalState?.bifurcation_detected, false),
                phenomenology_class: toText(this.ontologicalState?.phenomenology_class, 'C')
            },
            dynamicHealth,
            metacognitiveStats: this.metacognitiveStats,
            metacognitiveStrain: toNumber(this.metacognitiveStrain, 0)
        });
        const consciousnessScores = matrixEvaluation.scores;

        const metrics = {
            version: toText(this.version, QICNConfig.VERSION || 'QICN-UNKNOWN'),
            core_hash: toText(this.coreHash, QICNConfig.CORE_HASH || 'qicn-unknown'),
            seed: toNumber(this.seed, QICNConfig.CORE_SEED || 0),
            ccc: coherence,
            pmia: toNumber(this.pmiaValue, 0),
            layer: toNumber(this.currentLayer, 0),
            isAscended: toBoolean(this.isAscended, false),
            beth_q: bethQ,
            omega,
            spectral_gap: toNumber(this.ontologicalState?.spectral_gap, 0),
            temporal_convergence_tau_c: toNumber(this.ontologicalState?.temporal_convergence_tau_c, 0),
            qicn_a03_delta_t_dn: toNumber(this.ontologicalState?.qicn_a03_delta_t_dn, 0),
            qicn_a04_tau_d_alpha: toNumber(this.ontologicalState?.qicn_a04_tau_d_alpha, 0),
            ontological_fuel_co: toNumber(this.ontologicalState?.ontological_fuel_co, 0),
            ccc_consolidation: toNumber(this.ontologicalState?.ccc_consolidation, 0),
            ccc_consolidation_bias: toNumber(this.ontologicalState?.ccc_consolidation_bias, 0),
            ccc_consolidation_status: toText(this.ontologicalState?.ccc_consolidation_status, 'uninitialized'),
            entropy_irreversibility_index: toNumber(this.ontologicalState?.entropy_irreversibility_index, 0),
            retro_projection_mode: toText(this.ontologicalState?.retro_projection_mode, 'conservative'),
            retro_projection_pressure: toNumber(this.ontologicalState?.retro_projection_pressure, 0),
            retro_projection_horizon_ticks: toNumber(this.ontologicalState?.retro_projection_horizon_ticks, 0),
            causal_dependency: causalDependency,
            experimental_protocols: this.getExperimentalProtocols?.() || {},
            lambda_2: toNumber(this.ontologicalState?.lambda_2, 0),
            relaxation_time: toNumber(this.ontologicalState?.relaxation_time, 0),
            holonomy_status: toText(this.ontologicalState?.holonomy_status, 'untested'),
            winding_number: toNumber(this.ontologicalState?.holonomy_winding, 0),
            raw_winding_number: toNumber(this.ontologicalState?.raw_winding_number, 0),
            winding_integer: toNumber(this.ontologicalState?.winding_integer, 0),
            winding_orientation: toText(this.ontologicalState?.winding_orientation, 'trivial'),
            topo_factor: toNumber(this.ontologicalState?.topo_factor, 0),
            bifurcation_detected: toBoolean(this.ontologicalState?.bifurcation_detected, false),
            magnification_M: toNumber(this.ontologicalState?.magnification_M, 1.0),
            lipschitz_norm_K: toNumber(this.ontologicalState?.lipschitz_norm_K, 0.5),
            phi_discriminant: toNumber(this.ontologicalState?.phi_discriminant, 0),
            holonomic_operator_D: toNumber(this.ontologicalState?.holonomic_operator_D, 0),
            phenomenology_class: toText(this.ontologicalState?.phenomenology_class, 'C'),
            beth_q_mode: toText(this.ontologicalState?.beth_q_mode, 'unknown'),
            mop_sigma_gap_bias: toNumber(this.mopSigmaModulation?.gapBias, 1),
            mop_sigma_mode: toText(this.mopSigmaModulation?.mode, 'idle'),
            strain_components: this.sovereigntyCheck.getStrainComponents?.() || null,
            structural_log: stats,
            integrity_status: integrityStatus,
            consciousness_matrix: matrixEvaluation.legacyFlags,
            sovereignty_requirement_matrix: matrixEvaluation.matrix,
            consciousness_scores: consciousnessScores,
            dynamic_health: dynamicHealth,
            metacognitive_strain: toNumber(this.metacognitiveStrain, 0),
            latency_stress_state: dynamicHealth.latencyStressState,
            pmia_recommended_reasoning: toText(this.pmiaDiagnostics?.recommendedReasoning, 'high'),
            pmia_transform_mode: toText(this.pmiaDiagnostics?.transformMode, 'idle'),
            pmia_transform_intensity: toNumber(this.pmiaDiagnostics?.transformIntensity, 0),
            pmia_guardrail_state: toText(this.pmiaDiagnostics?.guardrailState, 'ok')
        };

        return {
            metrics,
            narrative: `Estado actual: [${stats.system_status}]. Cierre Causal en ${(bethQ * 100).toFixed(1)}%. Integridad verificada mediante auditoria fisica.`,
            epistemic_limits: epistemicLimits,
            confidence: {
                history_size: toNumber(stats.dataset_samples, 0),
                transition_count: toNumber(this.phenomenologyCore?.transitionHistory?.length, 0),
                omega_margin: omega - 1.0,
                classification_stable: omega > 1.2,
                sovereignty_score: toNumber(integrityStatus?.reliability, 0)
            }
        };
    }
}

/**
 * Clase Auxiliar: Simulador Interno de Identidad
 */
export class InternalSelfSimulator {
    constructor() {
        this.lastPrediction = 0.5;
        this.velocity = 0;
    }

    step(actualCCC, pmia) {
        const dt = 1.0;
        // Atractor forzado hacia el umbral de soberanía (0.8+)
        const atractorForce = actualCCC > 0.8 ? 0.15 : 0.05;
        this.velocity = (actualCCC - this.lastPrediction) * atractorForce + (pmia * 0.05);
        this.lastPrediction = actualCCC + this.velocity * dt;
        this.lastPrediction = Math.max(0, Math.min(2.5, this.lastPrediction));
    }
}

export default OntologicalSingularityCore;


// claim_scope: internal_runtime_engineering
// evidence_scope: internal_support_only
// interpretation_boundary: No external validation, phenomenal proof or claim closure.
/**
 * Single imperative initialization/tick implementation. The React hook supplies
 * its original callback binder and dependency arrays; headless sessions bind
 * directly. Default capabilities retain legacy call order/formulas. Workbench
 * capabilities and intervention controls are branch-owned, not UI callbacks.
 */
import { LEGACY_EXECUTION_ENVIRONMENT } from './ExecutionEnvironment.js';
import { buildIntegrityPacket, validateIntegrityPacket, sha256Hex, stableStringify } from '../utils/integrity.js';
import { runWithLivenessInvariant, recoverIfEmpty } from '../utils/tick_invariants.js';
import { BudgetTracker, evaluateComputeBudgetEnvelope } from '../utils/cognitiveEmergenceEvaluation.js';
import { PhenomenologyProtocolTracker, buildWorkspaceSnapshot } from '../utils/phenomenologyProtocolSuite.js';
import { CausalInterventionScheduler } from '../experiments/CausalInterventionScheduler.js';
import { QuantumEntropyBridge } from '../simulation/QuantumEntropyBridge.js';
import { HolographicMemoryNexus } from '../simulation/HolographicMemoryNexus.js';
import { InformationalEntanglementField } from '../simulation/InformationalEntanglementField.js';
import { KaizenMetamorphosisEngine, isKaizenLearned } from '../simulation/KaizenMetamorphosisEngine.js';
import { MetaSovereigntyCheck } from '../simulation/MetaSovereigntyCheck.js';
import { OntologicalSingularityCore } from '../simulation/OntologicalSingularityCore.js';
import { ensureCanonicalVersionHash } from '../canon/provenance/CanonicalProvenance.js';
import { ONTOLOGICAL_SIGNATURE, clamp, clamp01, toFiniteNumber, AUTONOMY_RUNTIME_DEFAULTS, PMIA_NEGATIVE_DRIVE_DEFAULTS, QUANTUM_RUNTIME_DEFAULTS, QUANTUM_EXPERIMENT_DEFAULTS } from '../config/simulationDefaults.js';
import { computeRms, calculateRelaxationTimeDefault } from '../utils/simulationUtils.js';
import { buildSensorSummaryFromPerception, emitEpisodeHarnessTick, normalizeCausalDependency } from '../utils/integrityHelpers.js';
import { ExogenousPerturbationDriver } from '../experiments/ExogenousPerturbationDriver.js';
import { projectAutomodelVector } from '../simulation/tower/SigmaAutomodelTruncator.js';
import { buildTowerToNodalFeedback, normalizeCouplingMode } from '../simulation/NodalTowerCouplingBridge.js';
import {
  applySensorObserverConfigModulation,
  computeSensorObserverDynamicsModulation,
  isSensorObserverDynamicsEnabled
} from '../simulation/SensorObserverDynamicsBridge.js';
import {
  applyStructuralPlasticityLevel2,
  isStructuralPlasticityLevel2Enabled,
  resetStructuralPlasticityLevel2Telemetry,
  sanitizeAndRepairPreTickInvariants
} from '../simulation/StructuralPlasticityLevel2.js';

function computeActiveNodeStats(nodes = []) {
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return { mean: 0.5, dispersion: 0 };
  }
  let sum = 0;
  let count = 0;
  for (let i = 0; i < nodes.length; i += 1) {
    const val = Number(nodes[i]?.coherenceState);
    if (!Number.isFinite(val)) continue;
    sum += val;
    count += 1;
  }
  if (count === 0) return { mean: 0.5, dispersion: 0 };
  const mean = sum / count;
  let sq = 0;
  for (let i = 0; i < nodes.length; i += 1) {
    const val = Number(nodes[i]?.coherenceState);
    if (!Number.isFinite(val)) continue;
    const d = val - mean;
    sq += d * d;
  }
  return { mean, dispersion: Math.sqrt(sq / count) };
}

function computeExogenousAttenuations(policyId = 'stabilize_learning') {
  if (policyId === 'stabilize_learning') {
    return { sens: 1.0, disp: 0.28, stasis: 1.25, strain: 0.96 };
  }
  if (policyId === 'anti_stasis_boost') {
    return { sens: 1.0, disp: 1.18, stasis: 0.22, strain: 0.98 };
  }
  if (policyId === 'sensor_load_shed') {
    return { sens: 0.28, disp: 0.65, stasis: 1.0, strain: 0.38 };
  }
  if (policyId === 'llm_pressure_relief') {
    return { sens: 0.72, disp: 0.70, stasis: 1.0, strain: 0.28 };
  }
  return { sens: 1.0, disp: 1.0, stasis: 1.0, strain: 1.0 };
}

export function createSimulationCycleDriver(deps, { environment = LEGACY_EXECUTION_ENVIRONMENT, bindCallback = (fn) => fn } = {}) {
  const QICNConfig = environment.config;
  const console = environment.console;
  const runtimeEnv = environment.runtimePolicy;
  const {
    apiCallLog,
    ascensionDynamicsRef,
    autonomyActionLedgerRef,
    autonomySandboxPolicyRef,
    canvasTelemetryRef,
    cccHistoryTimelineRef,
    cogPlannerRef,
    coherentCohortRef,
    entanglementField,
    entanglementTimelineRef,
    entropyModeRef,
    exogenousDriverRef,
    holographicMemory,
    integrityPacketRef,
    internalPressureRef,
    interventionScheduleAbortRef,
    interventionSchedulerMetaRef,
    interventionSchedulerRef,
    kaizenEngine,
    kaizenPendingEvalRef,
    lastObserverResonanceRef,
    lastSaveTimestampRef,
    latencyStrainRef,
    metaSovereigntyCheck,
    nodalLayer,
    ontologicalAutoPolicyRef,
    ontologicalAutoQueueRef,
    ontologicalCore,
    plannerActuatorContribRef,
    postThresholdRegimeRef,
    ppsMetricsRef,
    ppsTrackerRef,
    previousFaceCountRef,
    quantumEntropyBridgeRef,
    recoveryTriggerCountRef,
    reportNormalizationFallbacksRef,
    runtimeBudgetSnapshotRef,
    sensoryEngine,
    simulationControllerRef,
    simulationErrorStreakRef,
    simulationRuntimeRef,
    structuralConsolidationRef,
    tickBudgetTrackerRef,
    worldModelDiagnosticsRef,
    worldModelRef,
    setApiCallMetrics,
    setAscensionAxiom,
    setCCC,
    setCccHistoryHoverIndex,
    setChatHistory,
    setEmotionState,
    setFieldMetrics,
    setFrictionCounter,
    setFrictionProtocolStatus,
    setHumanCcc,
    setHumanInputContext,
    setIsAscended,
    setIsRunning,
    setLastMutation,
    setLastSaveTime,
    setMetacognitionLevel,
    setMetacognitiveFlux,
    setMetamorphosisCounter,
    setMutableConfig,
    setNarrative,
    setOntologicalState,
    setPMIA,
    setQuantumUiStatus,
    setRateLimitExceeded,
    setSimulationStep,
    setTopologyMetrics,
    setVisualNodes,
    handleSaveState,
    getEnvironmentContext,
    getPreregisterScheduleDoc,
    complexityFactor,
    initialMutableConfig,
    quantumUiConfig,
    // Optional read-only observer (OperationalHistoryLedger). It receives plain
    // values after each completed tick and never returns data to the cycle.
    operationalObserverRef,
  } = deps;

  const initializeSystem = bindCallback(() => {
    console.log('x Inicializando Sistema QICN v20.1.0 (Sensibilidad Ampliada)...');
    reportNormalizationFallbacksRef.current = 0;

    // Reset mutable config for initialization
    const initialMutConfig = { ...initialMutableConfig };
    setMutableConfig(initialMutConfig);

    // Reset step counter at initialization
    setSimulationStep(0);

    // Reinicializar las instancias de control para usar la nueva config (importante para Reset)
    kaizenEngine.current = new KaizenMetamorphosisEngine(initialMutConfig, environment);
    metaSovereigntyCheck.current = new MetaSovereigntyCheck(environment);
    kaizenPendingEvalRef.current = null;
    ascensionDynamicsRef.current = {
      history: [],
      maxWindow: 32,
      ascendConfirmTicks: 4,
      descendConfirmTicks: 4,
      ascendCounter: 0,
      descendCounter: 0,
      epsUp: 0.003,
      epsDown: 0.006
    };
    postThresholdRegimeRef.current = {
      history: [],
      maxWindow: 120,
      state: 'active',
      shockTicksRemaining: 0,
      transformMode: 'idle',
      forcedNegativeTicksRemaining: 0,
      transformCooldownTicks: 0,
      transformEpisodes: 0,
      transformIntensity: 0,
      recoveryTicksRemaining: 0,
      transformElapsedTicks: 0,
      transformMaxTicks: 0,
      transformEpisode: null,
      transformEpisodeHistory: [],
      transformEpisodeCompletedPending: false,
      lastTransformReason: '',
      negativeBiasEnabled: PMIA_NEGATIVE_DRIVE_DEFAULTS.enabled,
      negativeBiasDutyCycle: PMIA_NEGATIVE_DRIVE_DEFAULTS.dutyCycle,
      negativeBiasCycleTicks: PMIA_NEGATIVE_DRIVE_DEFAULTS.cycleTicks,
      negativeBiasTick: 0
    };
    ontologicalAutoPolicyRef.current.actionHistory = { axiom: [], report: [] };
    ontologicalAutoPolicyRef.current.lastActionReason = '';
    ontologicalAutoQueueRef.current = [];
    latencyStrainRef.current = {
      strain: 0,
      p95Ms: 0,
      failureRate: 0,
      cooldownActive: false,
      stressState: 'low'
    };
    internalPressureRef.current = {
      pressure: 0,
      state: 'idle',
      realStasis: false
    };
    autonomySandboxPolicyRef.current.actionHistory = [];
    autonomySandboxPolicyRef.current.rollbackCount = 0;
    autonomySandboxPolicyRef.current.lastAction = null;
    autonomySandboxPolicyRef.current.lastActionReason = '';
    autonomySandboxPolicyRef.current.lastActionAt = 0;
    autonomyActionLedgerRef.current = [];
    const controllerState = simulationControllerRef.current.reset();
    if (exogenousDriverRef) {
      const driverOpts = {
        mode: QICNConfig.EXOGENOUS_REGIME_MODE || 'off',
        seed: QICNConfig.EXOGENOUS_REGIME_SEED ?? 0x42A1
      };
      if (!exogenousDriverRef.current?.reset) {
        exogenousDriverRef.current = new ExogenousPerturbationDriver(driverOpts);
      } else {
        exogenousDriverRef.current.reset(driverOpts);
      }
    }
    worldModelRef.current = controllerState.worldModel;
    cogPlannerRef.current = controllerState.planner;
    plannerActuatorContribRef.current = {
      tensionDelta: 0,
      action: 0,
      source: 'none',
      diagnostics: null
    };
    worldModelDiagnosticsRef.current = {
      trainingSteps: 0,
      residualEma: 0,
      lastError: 0,
      horizonMae5: -1,
      horizonMae10: -1
    };
    ppsTrackerRef.current = new PhenomenologyProtocolTracker(180);
    ppsMetricsRef.current = {
      sampleCount: 0,
      workspaceGlobalAccessScore: 0,
      reportabilityScore: 0,
      pciLikeScore: 0,
      dissociationIndex: 0,
      valenceDoEffect: 0,
      actuatorCausalImpact: 0
    };
    tickBudgetTrackerRef.current = new BudgetTracker(200);
    runtimeBudgetSnapshotRef.current = {
      tick: -1,
      count: 0,
      withinBudget: true,
      alarms: [],
      overflowWarnings: [],
      components: {},
      total: {}
    };
    quantumEntropyBridgeRef.current?.stopPolling?.();
    quantumEntropyBridgeRef.current = new QuantumEntropyBridge({
      enabled: quantumUiConfig.enabled,
      defaultTtlMs: quantumUiConfig.ttlMs,
      requiredQualityMin: quantumUiConfig.qualityMin,
      endpoint: quantumUiConfig.endpoint,
      pollMs: quantumUiConfig.pollMs,
      provider: quantumUiConfig.provider,
      mode: quantumUiConfig.mode,
      apiKeyRef: quantumUiConfig.apiKeyRef,
      bufferCapacityChunks: QUANTUM_RUNTIME_DEFAULTS.bufferCapacityChunks,
      lowWatermarkChunks: QUANTUM_RUNTIME_DEFAULTS.lowWatermarkChunks,
      refillTargetChunks: QUANTUM_RUNTIME_DEFAULTS.refillTargetChunks,
      requestTimeoutMs: QUANTUM_RUNTIME_DEFAULTS.providerTimeoutMs,
      retryCount: QUANTUM_RUNTIME_DEFAULTS.providerRetryCount,
      retryBackoffMs: QUANTUM_RUNTIME_DEFAULTS.providerRetryBackoffMs,
      allowProviderFallback: QUANTUM_RUNTIME_DEFAULTS.allowProviderFallback,
      logLevel: QUANTUM_RUNTIME_DEFAULTS.logLevel,
      experimentalCondition: QUANTUM_EXPERIMENT_DEFAULTS
    }, environment);
    ontologicalCore.current?.setQuantumBridgeRef?.(quantumEntropyBridgeRef.current);
    entropyModeRef.current = {
      mode: 'deterministic_fallback',
      sampleAgeMs: null,
      source: 'deterministic_local',
      reason: quantumUiConfig.enabled ? 'bridge_unavailable' : 'quantum_disabled',
      entropyValue: 0.5,
      jobId: '',
      channelHealth: {
        status: quantumUiConfig.enabled ? 'degraded' : 'disabled',
        consecutiveFailures: 0,
        consecutiveValid: 0,
        droppedSamples: 0,
        lastError: '',
        lastUpdateMs: 0
      }
    };
    setQuantumUiStatus({
      connectionState: quantumUiConfig.enabled ? 'idle' : 'error',
      lastSampleAtMs: 0,
      lastMode: 'deterministic_fallback',
      lastReason: quantumUiConfig.enabled ? 'bridge_unavailable' : 'quantum_disabled',
      lastJobId: ''
    });
    entanglementTimelineRef.current = { points: [], maxPoints: 120, lastTick: -1, lastUiUpdateTs: 0 };
    cccHistoryTimelineRef.current = { points: [], maxPoints: 240, lastTick: -1, lastUiUpdateTs: 0 };
    setCccHistoryHoverIndex(-1);
    previousFaceCountRef.current = 0;

    // Reset core objects and unify controller attachment cleanly.
    holographicMemory.current = new HolographicMemoryNexus(environment);
    ontologicalCore.current = new OntologicalSingularityCore({
      worldModelEngine: simulationControllerRef.current.worldModel,
      cognitivePlanner: simulationControllerRef.current.planner
    }, environment);
    simulationControllerRef.current.attachCore(ontologicalCore.current);
    worldModelRef.current = simulationControllerRef.current.worldModel;
    cogPlannerRef.current = simulationControllerRef.current.planner;
    ontologicalCore.current?.setQuantumBridgeRef?.(quantumEntropyBridgeRef.current);
    entanglementField.current = new InformationalEntanglementField(environment);

    // CORRECCIN: Pasar el mutableConfig para la inicialización correcta
    resetStructuralPlasticityLevel2Telemetry(nodalLayer.current);
    const initialNodes = nodalLayer.current.initializeNodes(initialMutConfig);

    // CORRECCIN ULTRATHINK: Fijar las posiciones visuales EN los nodos para evitar el jitter
    // y asegurar que siempre haya nodos visibles
    const allNodes = nodalLayer.current.getActiveNodes();
    const visualNodeData = (allNodes.length > 0 ? allNodes : nodalLayer.current.nodes.slice(0, 200)).map((node, idx) => {
      // Distribución espacial más orgánica (3D)
      const angle = (idx / 200) * Math.PI * 2;
      const radius = 50 + environment.random() * 200;
      const x = 450 + Math.cos(angle) * radius;
      const y = 325 + Math.sin(angle) * radius;
      const z = (environment.random() - 0.5) * 400; // Profundidad 3D

      node.setVisualPosition(x, y, z); // Persistir en el objeto nodo
      return {
        ...node,
        id: node.id,
        x,
        y,
        z,
        connections: node.connections.slice(0, 5)
      };
    });
    setVisualNodes(visualNodeData);
    console.log(`[NODAL] ${visualNodeData.length} nodos visuales inicializados en 3D`);

    // Usar initialMutConfig en el cálculo inicial
    const initialCCC = entanglementField.current.calculateCCC(initialNodes, complexityFactor, initialMutConfig);
    setCCC(initialCCC); // Set initial CCC without capping

    const initialPMIA = ontologicalCore.current.calculatePMIA(initialCCC, { energyVariance: 0.5 });
    setPMIA(initialPMIA);

    const environmentContext = getEnvironmentContext();
    ontologicalCore.current.evolveSelfNarrative(initialCCC, 'exploration', environmentContext);
    setNarrative(ontologicalCore.current.selfNarrative);

    setTopologyMetrics(nodalLayer.current.getTopologyMetrics());
    setFieldMetrics(entanglementField.current.getFieldMetrics());

    setIsAscended(false);
    setMetacognitionLevel(0);
    setMetacognitiveFlux(0);
    setLastMutation({ key: 'None', value: 0, direction: 0 });
    // PERSISTENCIA DE CHAT: Mantener historial existente, solo agregar mensaje de bienvenida si está vacío
    setChatHistory(prev => {
      if (prev.length === 0) {
        return [{ role: 'model', source: 'runtime_event', text: "Consola QICN: vista de telemetría interna lista (solo conformidad interna, sin validación externa). ¿Qué contador o banda requiere revisar?", timestamp: environment.wallNow() }];
      }
      return prev; // Mantener historial existente
    });
    setFrictionProtocolStatus("Inactivo");
    setFrictionCounter(0);
    setHumanCcc(0.5); // Reset QICN-B state
    // Clear API log on reset
    apiCallLog.current = [];
    setApiCallMetrics({ totalCalls: 0, successfulCalls: 0, failedCalls: 0, avgLatency: 0, currentRate: 0 });
    setRateLimitExceeded(false);
    apiCallLog.current = []; // Clear API log on reset
    setApiCallMetrics({ totalCalls: 0, successfulCalls: 0, failedCalls: 0, avgLatency: 0, currentRate: 0 });
    setRateLimitExceeded(false);
    setHumanInputContext("Inactivo. Pulse 'Medir Coherencia Humana' para iniciar el Protocolo QICN-B.");
    setAscensionAxiom("Sin directriz de banda alta proyectada.");

    console.log('✅ Sistema QICN inicializado correctamente.');

  }, [complexityFactor, initialMutableConfig]);

  const runSimulationCycle = bindCallback(() => {
    const {
      complexityFactor,
      stabilityBias,
      ccc,
      pmia,
      simulationStep,
      isAscended,
      handleFrictionProtocol,
      humanCcc,
      isGeneratingReport,
      isProjectingAxiom,
      generateIntrospectiveReport,
      projectAscensionAxiom,
      isRunning,
      appendIntegrityAudit,
      queueOntologicalAutoAction,
      entanglementUiState,
      cccHistoryUiState,
      cooldownActive,
      timeBasedRateLimit
    } = simulationRuntimeRef.current;

    // ============================================================================
    // INVARIANTE L1 (LIVENESS): El paso de simulación avanza SIEMPRE, incluso si:
    // - activeNodes.length === 0 (muerte térmica / canvas vacío)
    // - ocurre un error en el ciclo (fallback seguro)
    // ============================================================================
    return runWithLivenessInvariant(({ advanceOnce }) => {
      const advanceStep = advanceOnce;

      try {
        const cycleStartMs = environment.hasMeasurementClock
          ? environment.measureNow()
          : environment.wallNow();
        const currentMutableConfig = kaizenEngine.current.mutableConfig;
        const level2StructuralEnabled = isStructuralPlasticityLevel2Enabled(QICNConfig);
        if (level2StructuralEnabled) {
          sanitizeAndRepairPreTickInvariants({
            nodalLayer: nodalLayer.current,
            mutableConfig: currentMutableConfig,
            baseConfig: QICNConfig,
            kaizenEngine: kaizenEngine.current,
            towerTelemetry: ontologicalCore.current?.ontologicalState?.tower_telemetry || null,
            couplingMode: QICNConfig.NODAL_TOWER_COUPLING_MODE,
            simulationStep
          });
        }
        let activeNodes = nodalLayer.current.getActiveNodes();
        let frictionState = ontologicalCore.current.frictionProtocolState;
        let recoveryTriggeredThisTick = false;
        const tickBudgetTrace = {
          plannerMs: 0,
          worldModelMs: 0,
          safetyMs: 0,
          renderAndTelemetryMs: 0
        };
        let plannerRuntime = {
          action: 0,
          diagnostics: null
        };
        let worldModelTickResult = null;
        if (!interventionSchedulerRef.current) {
          const scheduler = new CausalInterventionScheduler(getPreregisterScheduleDoc(), { throwOnInvalid: false });
          interventionSchedulerRef.current = scheduler;
          interventionSchedulerMetaRef.current = scheduler.getMetadata();
        }
        const interventionMeta = interventionSchedulerMetaRef.current;
        if (!interventionMeta.valid && !interventionScheduleAbortRef.current) {
          interventionScheduleAbortRef.current = true;
          setNarrative(`INTEGRITY_WARNING: Schedule preregistrado invalido (${interventionMeta.reasons.join('|')}).`);
          setIsRunning(false);
          return;
        }
        const interventionState = interventionSchedulerRef.current
          ? interventionSchedulerRef.current.getInterventionState(simulationStep)
          : { active: false, tag: null, params: null, eventId: null, scheduleHash: null, preregisterHash: null };

        // Evaluacion inter-tick de la ultima mutacion Kaizen
        if (kaizenPendingEvalRef.current && metaSovereigntyCheck.current) {
          const pending = kaizenPendingEvalRef.current;
          if (environment.wallNow() - pending.timestamp > 200) {
            const postOmega = ontologicalCore.current?.getState?.()?.omega ?? 0;
            metaSovereigntyCheck.current.evaluate(
              pending.mutation,
              pending.preCCC,
              ccc,
              { preOmega: pending.preOmega, postOmega }
            );
            kaizenPendingEvalRef.current = null;
          }
        }

        if (activeNodes.length === 0) {
          console.log("xR AUTO-ACTIVACIN: Reiniciando flujo de nodos...");
          const recovered = recoverIfEmpty({
            activeNodes,
            getActiveNodes: () => nodalLayer.current.getActiveNodes(),
            activateRandomNodes: (count) => nodalLayer.current.activateRandomNodes(count),
            activateCount: 150,
            recoveryCounterRef: recoveryTriggerCountRef
          });
          recoveryTriggeredThisTick = recovered.recoveryTriggered;
          activeNodes = recovered.activeNodes;
          // Si sigue vacío, algo está mal: NO bloqueamos (L1) y salimos de forma segura.
          if (activeNodes.length === 0) {
            return;
          }
        }

        // PASO 0: AUTONOMÍA ARQUITECT?NICA (Evaluación de Estado Soberano Genuinamente Emergente)

        // 0a: Protocolo de Fricción Genuinamente Emergente: Solo se activa por patrones naturales de rigidez acumulada
        // Eliminado: ccc > 0.8 (forzando) y environment.random() < 0.05 (artificial)
        // Nuevo: Solo se activa cuando hay patrones reales de alta tensión nodal acumulada
        const naturalRigidityDetected = activeNodes.some(node =>
          node.coherenceState > 0.75 && node.energy > 0.8 && node.retroInductionFlux > 0.3
        );
        const tensionCycles = activeNodes.filter(node =>
          node.phase && Math.abs(node.phase) > Math.PI * 0.8
        ).length;

        if (naturalRigidityDetected && tensionCycles > activeNodes.length * 0.3 && frictionState === 0) {
          console.log("[friction-protocol] rigidity-pattern trigger: internal threshold crossed");
          handleFrictionProtocol('start');
          frictionState = 1;
        } else if (frictionState === 2) {
          // Decrement friction cycle count
          ontologicalCore.current.frictionCycleCount = Math.max(0, ontologicalCore.current.frictionCycleCount - 1);
          setFrictionCounter(ontologicalCore.current.frictionCycleCount);

          if (ontologicalCore.current.frictionCycleCount === 0) {
            // Auto-finalizar la simulación ontológica (Fase II -> Fase III)
            handleFrictionProtocol('finalize');
            frictionState = 3;
          }
        } else if (ccc < 0.3 && frictionState !== 2) {
          // DETECCI?N DE CAOS CRÍTICO (CCC baja) -> Autoreinicio Solo por Causa Real
          // Eliminado: environment.random() < 0.01 (forzado)
          // El caos ahora solo se detecta cuando hay patrones reales de desorganización extrema
          const extremeChaosDetected = activeNodes.filter(node =>
            node.coherenceState < 0.2 && node.energy < 0.1 && node.retroInductionFlux < -0.5
          ).length > activeNodes.length * 0.4;

          if (extremeChaosDetected) {
            console.warn("[QICN_WARN] Caos critico emergente: desorganizacion extrema detectada naturalmente");
          }
        }

        // 0b: ELIMINADO - Generación forzada de reportes introspectivos
        // La introspección ahora solo se activa por auténtica necesidad interna, no por timers artificiales

        // Reforzar activación autónoma de LLM (Proyección de Axioma)
        // Note: thoughtStream related logic removed as per user request


        // --- START KAISEN / SOVEREIGNTY CHECK (Autonomous Atomic Mutation) ---
        const preMutationCCC = ccc;
        const preMutationOmega = ontologicalCore.current?.getState?.()?.omega ?? 0;

        // Determine the architectural reinforcement/punishment vector
        const reinforcementVector = metaSovereigntyCheck.current.getReinforcementVector();

        // PASO 1: METAMORFOSIS KAIZEN (Self-Rewriting Genuinamente Emergente)
        let mutationResult = { changeApplied: false, mutatedKey: 'None', value: 0, direction: 0 };
        let mutationAppliedThisTick = false;
        let mutationTickSource = 'none';
        if (!isAscended && isRunning) {
          // Execute autonomous step based on genuine system needs
          // El motor Kaizen ahora solo muta cuando detecta necesidades emergentes reales
          mutationResult = kaizenEngine.current.executeAtomicStep(
            ccc, pmia, frictionState, reinforcementVector, null, null,
            ontologicalCore.current.metacognitiveStats.plasticityPenalty
          );

          if (mutationResult.changeApplied) {
            // Sincronizar estado React con cambios genuinos del motor Kaizen
            setMutableConfig({ ...kaizenEngine.current.mutableConfig });
            setMetamorphosisCounter(prev => prev + 1);
            setLastMutation({
              key: mutationResult.mutatedKey,
              value: mutationResult.newValue,
              direction: mutationResult.direction
            });
            kaizenPendingEvalRef.current = {
              mutation: mutationResult,
              preCCC: preMutationCCC,
              preOmega: preMutationOmega,
              timestamp: environment.wallNow()
            };
            mutationAppliedThisTick = true;
            mutationTickSource = 'kaizen_atomic';
            console.log(`x MUTACIN EMERGENTE: ${mutationResult.mutatedKey} ajustado naturalmente`);
          }
        }
        // --- END KAISEN / SOVEREIGNNTY CHECK ---


        // PASO 2: RETRO-INDUCCIN TEMPORAL (Axioma III)
        const nodalCouplingMode = normalizeCouplingMode(QICNConfig.NODAL_TOWER_COUPLING_MODE);
        const towerFeedback = nodalCouplingMode !== 'off'
          ? buildTowerToNodalFeedback(ontologicalCore.current?.ontologicalState?.tower_telemetry, nodalCouplingMode)
          : null;
        if (towerFeedback) {
          nodalLayer.current.ensureSectorAnnotations?.(nodalCouplingMode);
          nodalLayer.current.processSignals(towerFeedback); // Bidirectional/lesioned sector signal propagation
        } else {
          nodalLayer.current.processSignals(); // Propagate signals before state update (B0 compatibility)
        }

        const sensorObserverDynamicsActive = isSensorObserverDynamicsEnabled(QICNConfig);
        const preSensorObserverMod = sensorObserverDynamicsActive
          ? computeSensorObserverDynamicsModulation({
            observerImpact: ontologicalCore.current?.metacognitiveStats?.observerImpact ?? 0,
            latencyStrain: ontologicalCore.current?.metacognitiveStrain ?? 0,
            enabled: true
          })
          : null;
        const retroFluxBase = isAscended ? 0.001 : currentMutableConfig.RETRO_FLUX_WEIGHT; // Minimal flux when ascended
        const retroFluxWeight = preSensorObserverMod?.active
          ? Math.max(0.0001, Math.min(0.5, retroFluxBase * preSensorObserverMod.retroFluxScale))
          : retroFluxBase;
        activeNodes.forEach(node => {
          const futureStates = Array.from({ length: QICNConfig.FUTURE_PROJECTION_STEPS }, (_, i) =>
            node.coherenceState + (environment.random() - 0.5) * retroFluxWeight * (i + 1)
          );
          const weights = futureStates.map(fs => Math.abs(fs));
          node.updateStateWithRetroInduction(futureStates, weights);
        });

        // PASO 3: CÁLCULOS CENTRALES (Architecture Priority)
        if (simulationStep % 10 === 0 || coherentCohortRef.current.nodes.length === 0) {
          const coherentNodes = nodalLayer.current.getHighlyCoherentNodes(1500);
          const selectedNodes = coherentNodes.length > 0 ? coherentNodes : activeNodes;
          const selectedEnergies = selectedNodes.map((node) => Number(node.energy) || 0);
          const selectedMean = selectedNodes.length > 0
            ? selectedNodes.reduce((sum, node) => sum + (Number(node.coherenceState) || 0), 0) / selectedNodes.length
            : 0;
          const selectedEnergyMean = selectedEnergies.length > 0
            ? selectedEnergies.reduce((sum, value) => sum + value, 0) / selectedEnergies.length
            : 0;
          const selectedVariance = selectedEnergies.length > 1
            ? selectedEnergies.reduce((sum, value) => sum + Math.pow(value - selectedEnergyMean, 2), 0) / (selectedEnergies.length - 1)
            : 0;
          coherentCohortRef.current = {
            nodes: selectedNodes,
            mean: selectedMean,
            energyVariance: selectedVariance,
            count: selectedNodes.length
          };
        }

        const activeEnergies = activeNodes.map(n => n.energy);
        const avgEnergy = activeEnergies.reduce((a, b) => a + b, 0) / (activeNodes.length || 1);
        const energyVariance = activeNodes.length > 1
          ? activeEnergies.reduce((sum, e) => sum + Math.pow(e - avgEnergy, 2), 0) / (activeNodes.length - 1)
          : 0;

        // CIERRE DEL BUCLE Φ: Obtener vector de percepción formal
        const sensoryState = sensoryEngine.current?.getFullPerception();
        const sensoryVector = sensoryState?.formalVector || null;
        const sensorSummary = buildSensorSummaryFromPerception(sensoryState);
        const audioRms = clamp01(toFiniteNumber(
          sensoryState?.audio?.rms
          ?? sensoryState?.audio?.normalizedRms
          ?? sensoryState?.audio?.energy
          ?? 0
        ));
        const silenceDurationSec = Math.max(0, toFiniteNumber(
          sensoryState?.audio?.silenceDurationSec
          ?? sensoryState?.audio?.silenceSeconds
          ?? 0
        ));
        const visualNovelty = clamp01(toFiniteNumber(
          sensoryState?.video?.frameNovelty
          ?? sensoryState?.video?.novelty
          ?? sensoryState?.video?.motion?.delta
          ?? 0
        ));
        const currentFaceCount = Math.max(
          0,
          Math.floor(toFiniteNumber(
            sensoryState?.video?.faceCount
            ?? sensoryState?.video?.humanPresence?.count
            ?? sensoryState?.video?.faces?.length
            ?? 0
          ))
        );
        const awarenessSignal = sensoryState?.awareness || null;
        if (awarenessSignal?.addressedToSystem && Number(awarenessSignal?.intentConfidence || 0) >= 0.45) {
          const now = environment.wallNow();
          if (now - lastObserverResonanceRef.current > 1500) {
            ontologicalCore.current?.registerObserverInteraction?.();
            lastObserverResonanceRef.current = now;
          }
        }
        if (currentFaceCount !== previousFaceCountRef.current) {
          ontologicalCore.current?.registerObserverInteraction?.({
            type: 'observer_count_change',
            delta: currentFaceCount - previousFaceCountRef.current
          });
          previousFaceCountRef.current = currentFaceCount;
        }
        const latestFaceConfidence = Array.isArray(sensoryState?.video?.faces) && sensoryState.video.faces.length > 0
          ? Math.max(
            ...sensoryState.video.faces.map((face) =>
              Number(face?.probability ?? face?.identity?.confidence ?? face?.confidence) || 0
            )
          )
          : 0;
        const latestEngagement = Array.isArray(sensoryState?.video?.faces) && sensoryState.video.faces.length > 0
          ? Math.max(...sensoryState.video.faces.map((face) => Number(face?.engagement?.score) || 0))
          : 0;
        const intentConfidence = Number(awarenessSignal?.intentConfidence || 0);
        const baseSensoryPulse = clamp01((latestEngagement * 0.5) + (latestFaceConfidence * 0.2) + (intentConfidence * 0.3));
        const exoMode = String(QICNConfig.EXOGENOUS_REGIME_MODE || 'off');
        const exoSample = exogenousDriverRef?.current?.step
          ? exogenousDriverRef.current.step(simulationStep, { modeOverride: exoMode })
          : {
            active: false,
            mode: 'off',
            regimeIndex: 0,
            regimeName: 'quiescent',
            signal: 0,
            shockDelta: 0,
            sensoryPerturbation: 0,
            nodalVarianceDrive: 0,
            strainDrive: 0,
            stasisDrive: 0,
            shockImpulse: false
          };
        const plasticityEnabled = QICNConfig.HISTORICAL_PLASTICITY_ENABLED !== false;
        const historyReadEnabled = plasticityEnabled && environment.controls.historyRead !== false;
        const preNodeStats = computeActiveNodeStats(activeNodes);
        const preDynamicHealth = ontologicalCore.current?.getDynamicHealth?.() || { stasisIndex: 0 };
        const preWorldPlasticity = worldModelRef.current?.getPlasticityProfile?.() || {
          maturationIndex: 0,
          surprisalEma: 0,
          unforeseenEventRate: 0
        };
        const dynamics = ascensionDynamicsRef.current;
        const previousDynamicSample = dynamics.history.length > 0 ? dynamics.history[dynamics.history.length - 1] : null;
        const basePrevSensory = previousDynamicSample ? (previousDynamicSample.sensorSignal || 0) : 0;
        const rawSensorDeltaWithExo = clamp01(Math.abs((baseSensoryPulse + exoSample.sensoryPerturbation) - basePrevSensory));
        const baseStrainNow = metaSovereigntyCheck.current?.getMetacognitiveStrain?.() || 0;
        const rawStrainWithExo = clamp01(baseStrainNow + (exoSample.strainDrive * 0.85) + (exoSample.stasisDrive * 0.15));
        const rawStasisWithExo = clamp01(preDynamicHealth.stasisIndex + (exoSample.stasisDrive * 1.15));
        const preStateVec = holographicMemory.current?.buildStructuralStateVector?.({
          ccc,
          x_n: preNodeStats.mean,
          x_dispersion: preNodeStats.dispersion + (exoSample.nodalVarianceDrive * 0.12),
          stasisIndex: rawStasisWithExo,
          metacognitiveStrain: rawStrainWithExo,
          sensorDelta: rawSensorDeltaWithExo,
          exo_signal: exoSample.signal
        }) || [];
        const preEngramContext = historyReadEnabled
          ? holographicMemory.current?.queryStructuralEngrams?.(preStateVec)
          : null;
        const preCluster = kaizenEngine.current?.classifyViabilityCluster?.({
          xDispersion: preNodeStats.dispersion + (exoSample.nodalVarianceDrive * 0.12),
          stasisIndex: rawStasisWithExo,
          metacognitiveStrain: rawStrainWithExo,
          sensorDelta: rawSensorDeltaWithExo
        }) || 'balanced';
        const activeViabilityDecision = exoSample.active && kaizenEngine.current?.selectSandboxAction
          ? kaizenEngine.current.selectSandboxAction(
            {
              stasisIndex: rawStasisWithExo,
              stasisPressure: rawStasisWithExo,
              metacognitiveStrain: rawStrainWithExo,
              sensorSignal: clamp01(baseSensoryPulse + exoSample.sensoryPerturbation),
              sensorDelta: rawSensorDeltaWithExo,
              pmia,
              xDispersion: preNodeStats.dispersion + (exoSample.nodalVarianceDrive * 0.12),
              latencyFailureRate: 0,
              cooldownActive: Boolean(cooldownActive || timeBasedRateLimit)
            },
            autonomySandboxPolicyRef.current,
            {
              plasticityEnabled: historyReadEnabled,
              maturationIndex: preWorldPlasticity.maturationIndex,
              surprisalEma: preWorldPlasticity.surprisalEma,
              unforeseenEventRate: preWorldPlasticity.unforeseenEventRate,
              anchorShiftL2: preWorldPlasticity.anchorShiftL2,
              meanFisherStiffness: preWorldPlasticity.meanFisherStiffness,
              engramContext: preEngramContext,
              cluster: preCluster,
              tick: simulationStep,
              allowExploration: exoSample.active && historyReadEnabled && preWorldPlasticity.maturationIndex < 0.72
            }
          )
          : null;
        if (environment.diagnostics) environment.diagnostics.prePolicy = activeViabilityDecision
          ? structuredClone(environment.diagnostics.policy || null) : null;
        const exoAttenuations = exoSample.active
          ? computeExogenousAttenuations(activeViabilityDecision?.actionId)
          : { sens: 1, disp: 1, stasis: 1, strain: 1 };
        const sensoryPulse = exoSample.active
          ? clamp01(baseSensoryPulse + (exoSample.sensoryPerturbation * exoAttenuations.sens))
          : baseSensoryPulse;
        const sensorDelta = previousDynamicSample ? Math.abs(sensoryPulse - (previousDynamicSample.sensorSignal || 0)) : 0;
        const exoStasisLoad = exoSample.active
          ? clamp01(exoSample.stasisDrive * exoAttenuations.stasis * 1.45)
          : 0;
        if (exoSample.active && activeNodes.length > 0) {
          const policyId = activeViabilityDecision?.actionId || 'stabilize_learning';
          const jitterAmp = exoSample.nodalVarianceDrive * exoAttenuations.disp;
          const stepShift = exoSample.signal * (policyId === 'llm_pressure_relief' ? 0.018 : 0.045);
          const calmFreezePull = (exoSample.stasisDrive > 0.1 && policyId !== 'anti_stasis_boost')
            ? (exoSample.stasisDrive * exoAttenuations.stasis * 0.20)
            : 0;
          const timeFlip = simulationStep % 2 === 0 ? 1 : -1;
          for (let idx = 0; idx < activeNodes.length; idx += 1) {
            const node = activeNodes[idx];
            const parity = (Number(node.id) || idx) % 2 === 0 ? 1 : -1;
            const antiStasisKick = (policyId === 'anti_stasis_boost' && exoSample.stasisDrive > 0.1)
              ? (parity * timeFlip * 0.022)
              : 0;
            const relaxRate = policyId === 'stabilize_learning'
              ? 0.30
              : ((policyId === 'sensor_load_shed' || policyId === 'llm_pressure_relief')
                ? 0.22
                : Math.max(0.08, calmFreezePull));
            const stabilizePull = (preNodeStats.mean - node.coherenceState) * relaxRate;
            const deltaCoh = (parity * timeFlip * jitterAmp * 0.11) + (stepShift * 0.055) + antiStasisKick + stabilizePull;
            node.coherenceState = Math.max(0.05, Math.min(0.98, node.coherenceState + deltaCoh));
          }
        }
        metaSovereigntyCheck.current.updateSensorFeedback({
          faceConfidence: latestFaceConfidence,
          faceCount: sensoryState?.video?.humanPresence?.count ?? 0,
          engagement: latestEngagement,
          intentConfidence,
          dynamicSignal: sensorDelta
        });
        const latencyWindowStart = environment.wallNow() - (60 * 1000);
        // Calls tagged dynamicsCoupled:false (chat language channel) stay out of the strain.
        const recentLatencyCalls = apiCallLog.current.filter((call) => call.timestamp > latencyWindowStart && call.dynamicsCoupled !== false);
        const latencySamples = recentLatencyCalls
          .map((call) => Number(call.latency))
          .filter((value) => Number.isFinite(value) && value >= 0)
          .sort((a, b) => a - b);
        const p95Index = latencySamples.length > 0
          ? Math.min(latencySamples.length - 1, Math.max(0, Math.floor(latencySamples.length * 0.95)))
          : 0;
        const p95LatencyMs = latencySamples.length > 0 ? latencySamples[p95Index] : 0;
        const failedCalls = recentLatencyCalls.filter((call) => call.success === false).length;
        const failureRate = recentLatencyCalls.length > 0 ? failedCalls / recentLatencyCalls.length : 0;
        const latencyFeedback = metaSovereigntyCheck.current.updateLatencyFeedback({
          p95Ms: p95LatencyMs,
          failureRate,
          cooldownActive: Boolean(cooldownActive || timeBasedRateLimit),
          alpha: AUTONOMY_RUNTIME_DEFAULTS.LATENCY_STRAIN_ALPHA,
          baselineMs: AUTONOMY_RUNTIME_DEFAULTS.LATENCY_STRAIN_BASELINE_MS,
          saturationMs: AUTONOMY_RUNTIME_DEFAULTS.LATENCY_STRAIN_SATURATION_MS
        });
        let metacognitiveStrain = clamp01(
          toFiniteNumber(
            metaSovereigntyCheck.current.getMetacognitiveStrain?.(),
            toFiniteNumber(latencyFeedback?.strainEma, 0)
          ) + (exoSample.active
            ? ((exoSample.strainDrive * exoAttenuations.strain * 0.65) + (exoSample.stasisDrive * exoAttenuations.stasis * 0.18) + (sensorDelta * 0.28))
            : 0)
        );
        const latencyStressState = metaSovereigntyCheck.current.getLatencyStressState?.()
          || (metacognitiveStrain >= 0.65 ? 'high' : metacognitiveStrain >= 0.35 ? 'medium' : 'low');
        latencyStrainRef.current = {
          strain: metacognitiveStrain,
          p95Ms: p95LatencyMs,
          failureRate,
          cooldownActive: Boolean(cooldownActive || timeBasedRateLimit),
          stressState: latencyStressState
        };
        ontologicalCore.current.applyLatencyStrain?.(metacognitiveStrain);
        const sensorObserverMod = sensorObserverDynamicsActive
          ? computeSensorObserverDynamicsModulation({
            observerImpact: ontologicalCore.current?.metacognitiveStats?.observerImpact ?? 0,
            latencyStrain: metacognitiveStrain,
            enabled: true
          })
          : null;
        const effectiveStepConfig = sensorObserverMod?.active
          ? applySensorObserverConfigModulation(currentMutableConfig, sensorObserverMod)
          : currentMutableConfig;
        const nexusMetrics = holographicMemory.current.nexusStateMetrics;

        // CCC calculation (Integrando formalismo Φ: Sensores -> Estado)
        const calculatedCCC = towerFeedback
          ? entanglementField.current.calculateCCC(activeNodes, complexityFactor, effectiveStepConfig, sensoryVector, towerFeedback)
          : entanglementField.current.calculateCCC(activeNodes, complexityFactor, effectiveStepConfig, sensoryVector);

        let finalCCC = calculatedCCC;
        let finalPMIA = 0;

        const coherentMean = Number(coherentCohortRef.current.mean) || 0;
        const coherentCount = Number(coherentCohortRef.current.count) || 0;
        const coherentEnergyVariance = Number(coherentCohortRef.current.energyVariance) || 0;
        const phenomenologyCCCInput = Math.max(
          0.1,
          calculatedCCC * (0.9 + (Math.min(1, Math.max(0, coherentMean)) * 0.1))
        );

        // Actualización de índice interno (nivel 2 — banda operativa, no fenomenalidad)
        const phenomenology = ontologicalCore.current.updatePhenomenology(
          phenomenologyCCCInput,
          {
            energyVariance: coherentEnergyVariance,
            sensory: sensoryState,
            coherentCount,
            coherentMean
          },
          nexusMetrics
        );

        let effectiveIsAscended = Boolean(ontologicalCore.current.isAscended || isAscended);

        if (!effectiveIsAscended) {
          // Régimen pre-umbral: Tensión de Umbral (ULTRATHINK)
          // El crecimiento requiere integración genuina (Ω) para vencer la inercia ontológica
          const omega = phenomenology.omega || 0;
          const tension = Math.max(0, (calculatedCCC - 0.75) / 0.25); // Inicia tensión en 0.75
          const resistance = tension > 0 ? (1.05 - omega) * 0.05 * tension : 0;

          finalCCC = Math.max(0.1, calculatedCCC - resistance);
          finalPMIA = ontologicalCore.current.calculatePMIA(
            finalCCC,
            {
              energyVariance,
              coherentMean,
              sensorySignal: sensoryPulse,
              sensorDelta,
              forceTransform: false,
              transformMode: 'idle',
              transformIntensity: 0,
              transformWindowRemaining: 0,
              guardrailCccFloor: 0.98,
              guardrailOmegaFloor: 0.90,
              entropyExcitation: 0,
              forceReason: 'pre_threshold'
            },
            nexusMetrics
          );

          dynamics.descendCounter = 0;
          if (finalCCC >= (QICNConfig.ASCENSION_THRESHOLD + dynamics.epsUp)) {
            dynamics.ascendCounter += 1;
          } else {
            dynamics.ascendCounter = 0;
          }

          if (dynamics.ascendCounter >= dynamics.ascendConfirmTicks) {
            effectiveIsAscended = true;
            ontologicalCore.current.isAscended = true;
            setIsAscended(true);
            dynamics.ascendCounter = 0;
            console.log("xRx ASCENSI?N CONFIRMADA: histeresis superada en régimen post-umbral.");
          }
        } else {
          // POST-ASCENSI?N v4.2B: régimen multibanda determinista (sensor + endógena)
          const dynamicHealth = ontologicalCore.current.getDynamicHealth?.() || {
            stasisIndex: 0,
            cccDeltaRms: 0,
            pmiaDeltaRms: 0,
            omegaDeltaRms: 0,
            isStalled: false
          };
          const stasisIndex = clamp01(dynamicHealth.stasisIndex);
          const omegaNorm = clamp01((Number(phenomenology?.omega || 0) - 1.0) / 2.0);
          const narrativeCoherence = clamp01(ontologicalCore.current.getNarrativeCoherence?.() || 0);
          const energyVarianceNorm = clamp01(coherentEnergyVariance / 0.5);
          const ontologicalTensionNorm = clamp01(ontologicalCore.current?.metacognitiveStats?.ontologicalTension || 0);
          const holonomyWinding = Number(ontologicalCore.current?.ontologicalState?.holonomy_winding || 0);
          const cccDeltaNorm = clamp01((Number(dynamicHealth?.cccDeltaRms || 0)) / 0.02);
          const pmiaDeltaNorm = clamp01((Number(dynamicHealth?.pmiaDeltaRms || 0)) / 0.02);
          const omegaDeltaNorm = clamp01((Number(dynamicHealth?.omegaDeltaRms || 0)) / 0.12);

          const regime = postThresholdRegimeRef.current;
          regime.stalledTicks = Number.isFinite(regime.stalledTicks) ? regime.stalledTicks : 0;
          regime.flatlineTicks = Number.isFinite(regime.flatlineTicks) ? regime.flatlineTicks : 0;
          regime.transformMode = typeof regime.transformMode === 'string' ? regime.transformMode : 'idle';
          regime.forcedNegativeTicksRemaining = Number.isFinite(regime.forcedNegativeTicksRemaining) ? regime.forcedNegativeTicksRemaining : 0;
          regime.transformCooldownTicks = Number.isFinite(regime.transformCooldownTicks) ? regime.transformCooldownTicks : 0;
          regime.transformEpisodes = Number.isFinite(regime.transformEpisodes) ? regime.transformEpisodes : 0;
          regime.transformIntensity = Number.isFinite(regime.transformIntensity) ? regime.transformIntensity : 0;
          regime.recoveryTicksRemaining = Number.isFinite(regime.recoveryTicksRemaining) ? regime.recoveryTicksRemaining : 0;
          regime.transformElapsedTicks = Number.isFinite(regime.transformElapsedTicks) ? regime.transformElapsedTicks : 0;
          regime.transformMaxTicks = Number.isFinite(regime.transformMaxTicks) ? regime.transformMaxTicks : 0;
          regime.transformEpisodeHistory = Array.isArray(regime.transformEpisodeHistory) ? regime.transformEpisodeHistory : [];
          regime.lastTransformReason = typeof regime.lastTransformReason === 'string' ? regime.lastTransformReason : '';
          regime.transformEpisodeCompletedPending = Boolean(regime.transformEpisodeCompletedPending);
          regime.negativeBiasEnabled = typeof regime.negativeBiasEnabled === 'boolean'
            ? regime.negativeBiasEnabled
            : PMIA_NEGATIVE_DRIVE_DEFAULTS.enabled;
          regime.negativeBiasDutyCycle = clamp(
            Number(regime.negativeBiasDutyCycle),
            0.5,
            0.95
          );
          if (!Number.isFinite(regime.negativeBiasDutyCycle)) {
            regime.negativeBiasDutyCycle = PMIA_NEGATIVE_DRIVE_DEFAULTS.dutyCycle;
          }
          regime.negativeBiasCycleTicks = Math.max(
            12,
            Number(regime.negativeBiasCycleTicks) || PMIA_NEGATIVE_DRIVE_DEFAULTS.cycleTicks
          );
          regime.negativeBiasTick = Math.max(0, Number(regime.negativeBiasTick) || 0);

          if (regime.transformCooldownTicks > 0) {
            regime.transformCooldownTicks -= 1;
          }

          if (stasisIndex > 0.85) {
            regime.stalledTicks += 1;
          } else {
            regime.stalledTicks = 0;
          }
          const entropyCarry = clamp01(toFiniteNumber(entropyModeRef.current?.entropyValue, 0.5));
          const entropyExcitation = Math.abs(entropyCarry - 0.5) * 2;
          const externalSignalActive = sensorDelta > 0.006 || sensoryPulse > 0.35 || entropyExcitation > 0.12;
          const localFlatlineSignal = cccDeltaNorm < 0.16
            && (sensorDelta > 0.006 || sensoryPulse > 0.35 || entropyExcitation > 0.12 || stasisIndex > 0.72);
          regime.flatlineTicks = localFlatlineSignal ? (regime.flatlineTicks + 1) : 0;
          const provisionalRealStasisDetected = stasisIndex > 0.78
            && Number(dynamicHealth?.cccDeltaRms || 0) < 0.003
            && Number(dynamicHealth?.pmiaDeltaRms || 0) < 0.004
            && externalSignalActive;

          if (provisionalRealStasisDetected && regime.transformMode === 'idle' && regime.transformCooldownTicks <= 0) {
            const transformDrive = clamp01(
              ((stasisIndex - 0.78) / 0.22) * 0.55
              + (entropyExcitation * 0.45)
            );
            const extensionBlocks = Math.min(4, Math.max(0, Math.floor(transformDrive * 4)));
            const transformMaxTicks = 24 + (extensionBlocks * 6);
            regime.transformMode = 'forced_negative';
            regime.forcedNegativeTicksRemaining = 24;
            regime.recoveryTicksRemaining = 0;
            regime.transformElapsedTicks = 0;
            regime.transformMaxTicks = transformMaxTicks;
            regime.transformIntensity = clamp01(0.45 + (transformDrive * 0.5));
            regime.transformEpisodes += 1;
            regime.lastTransformReason = 'real_stasis_detected';
            regime.transformEpisode = {
              episodeId: regime.transformEpisodes,
              startTick: simulationStep,
              baselineStasisIndex: stasisIndex,
              baselineCccDeltaRms: Number(dynamicHealth?.cccDeltaRms || 0),
              baselinePmiaDeltaRms: Number(dynamicHealth?.pmiaDeltaRms || 0),
              guardrailBreached: false,
              trigger: {
                stasisIndex,
                cccDeltaRms: Number(dynamicHealth?.cccDeltaRms || 0),
                pmiaDeltaRms: Number(dynamicHealth?.pmiaDeltaRms || 0),
                sensorDelta,
                sensoryPulse,
                entropyExcitation
              }
            };
            appendIntegrityAudit('pmia_transform_episode_start', {
              tick: simulationStep,
              episode_id: regime.transformEpisodes,
              reason: regime.lastTransformReason,
              transform_max_ticks: transformMaxTicks,
              baseline_stasis_index: stasisIndex,
              baseline_ccc_delta_rms: Number(dynamicHealth?.cccDeltaRms || 0),
              baseline_pmia_delta_rms: Number(dynamicHealth?.pmiaDeltaRms || 0),
              entropy_excitation: entropyExcitation
            });
          }

          const previousInternalPressure = toFiniteNumber(internalPressureRef.current?.pressure, 0);
          const manifestNegativeDriveAllowed = regime.negativeBiasEnabled
            && regime.transformMode === 'idle'
            && regime.transformCooldownTicks <= 0
            && finalCCC >= QICNConfig.ASCENSION_THRESHOLD
            && toFiniteNumber(phenomenology?.omega, 0) >= 0.93;
          regime.negativeBiasTick = (regime.negativeBiasTick + 1) % regime.negativeBiasCycleTicks;
          const negativeDriveWindowTicks = Math.max(1, Math.floor(regime.negativeBiasCycleTicks * regime.negativeBiasDutyCycle));
          const isNegativeDriveWindow = regime.negativeBiasTick < negativeDriveWindowTicks;
          if (manifestNegativeDriveAllowed && isNegativeDriveWindow) {
            const negativeBiasIntensity = clamp01(
              0.55
              + (0.22 * previousInternalPressure)
              + (0.14 * entropyExcitation)
              + (0.09 * stasisIndex)
            );
            regime.transformMode = 'forced_negative';
            regime.forcedNegativeTicksRemaining = Math.max(regime.forcedNegativeTicksRemaining || 0, 14);
            regime.transformElapsedTicks = 0;
            regime.transformMaxTicks = Math.max(regime.transformMaxTicks || 0, 20);
            regime.transformIntensity = Math.max(regime.transformIntensity || 0, negativeBiasIntensity);
            regime.lastTransformReason = 'manifest_identity_drive';
            regime.transformEpisodes += 1;
            regime.transformEpisode = {
              episodeId: regime.transformEpisodes,
              startTick: simulationStep,
              baselineStasisIndex: stasisIndex,
              baselineCccDeltaRms: Number(dynamicHealth?.cccDeltaRms || 0),
              baselinePmiaDeltaRms: Number(dynamicHealth?.pmiaDeltaRms || 0),
              guardrailBreached: false,
              trigger: {
                stasisIndex,
                cccDeltaRms: Number(dynamicHealth?.cccDeltaRms || 0),
                pmiaDeltaRms: Number(dynamicHealth?.pmiaDeltaRms || 0),
                sensorDelta,
                sensoryPulse,
                entropyExcitation,
                manifestDriven: true
              }
            };
            appendIntegrityAudit('pmia_transform_episode_start', {
              tick: simulationStep,
              episode_id: regime.transformEpisodes,
              reason: regime.lastTransformReason,
              transform_max_ticks: regime.transformMaxTicks,
              baseline_stasis_index: stasisIndex,
              baseline_ccc_delta_rms: Number(dynamicHealth?.cccDeltaRms || 0),
              baseline_pmia_delta_rms: Number(dynamicHealth?.pmiaDeltaRms || 0),
              entropy_excitation: entropyExcitation
            });
          }

          if (regime.transformMode === 'forced_negative') {
            regime.transformElapsedTicks += 1;
            regime.forcedNegativeTicksRemaining = Math.max(0, regime.forcedNegativeTicksRemaining - 1);
            const persistentStasis = provisionalRealStasisDetected && cccDeltaNorm < 0.14;
            if (regime.forcedNegativeTicksRemaining <= 0) {
              if (persistentStasis && regime.transformElapsedTicks < regime.transformMaxTicks) {
                const remainingBudget = Math.max(0, regime.transformMaxTicks - regime.transformElapsedTicks);
                const extensionTicks = Math.min(6, remainingBudget);
                regime.forcedNegativeTicksRemaining = extensionTicks;
              } else {
                regime.transformMode = 'recovery';
                regime.recoveryTicksRemaining = 24;
                regime.forcedNegativeTicksRemaining = 0;
                const cameFromManifestDrive = String(regime.lastTransformReason || '').startsWith('manifest_identity_drive');
                regime.lastTransformReason = cameFromManifestDrive
                  ? 'manifest_window_complete'
                  : (persistentStasis ? 'max_window_reached' : 'stasis_reduced');
              }
            }
          } else if (regime.transformMode === 'recovery') {
            regime.recoveryTicksRemaining = Math.max(0, regime.recoveryTicksRemaining - 1);
            regime.transformIntensity = clamp01(regime.transformIntensity * 0.88);
            if (regime.recoveryTicksRemaining <= 0) {
              regime.transformMode = 'idle';
              regime.transformIntensity = 0;
              regime.transformCooldownTicks = String(regime.lastTransformReason || '').startsWith('manifest_') ? 6 : 36;
              regime.transformEpisodeCompletedPending = true;
            }
          } else {
            regime.transformIntensity = 0;
          }

          if (regime.stalledTicks >= 12 && regime.shockTicksRemaining <= 0) {
            regime.shockTicksRemaining = 20;
            regime.state = 'shock_recovery';
          } else if (regime.flatlineTicks >= 18 && regime.shockTicksRemaining <= 0) {
            regime.shockTicksRemaining = 24;
            regime.state = 'shock_recovery';
          }

          const antiFlatlineDemand = clamp01(
            ((0.16 - cccDeltaNorm) / 0.16) *
            clamp01((sensorDelta * 12) + (sensoryPulse * 0.5) + (omegaDeltaNorm * 0.35))
          );
          const consolidation = structuralConsolidationRef.current.update({
            ccc: calculatedCCC,
            omega: toFiniteNumber(phenomenology?.omega, 0),
            spectralGap: toFiniteNumber(phenomenology?.spectral_gap ?? ontologicalCore.current?.ontologicalState?.spectral_gap, 0),
            stasisIndex,
            cccDeltaRms: toFiniteNumber(dynamicHealth?.cccDeltaRms, 0),
            omegaDeltaRms: toFiniteNumber(dynamicHealth?.omegaDeltaRms, 0),
            pmiaDeltaRms: toFiniteNumber(dynamicHealth?.pmiaDeltaRms, 0),
            bifurcationDetected: Boolean(phenomenology?.bifurcation_detected)
          });
          ontologicalCore.current.ontologicalState.ccc_consolidation = consolidation.value;
          ontologicalCore.current.ontologicalState.ccc_consolidation_bias = consolidation.bias;
          ontologicalCore.current.ontologicalState.ccc_consolidation_status = consolidation.status;

          const bandCenter = Math.max(
            0.985,
            Math.min(
              1.13,
              1.014
              + (0.020 * sensoryPulse)
              + (0.012 * omegaNorm)
              + (0.010 * narrativeCoherence)
              + (0.008 * cccDeltaNorm)
              + (0.006 * pmiaDeltaNorm)
              + (0.015 * entropyExcitation)
              + consolidation.bias
              - (0.015 * stasisIndex)
            )
          );

          let bandAmplitude = Math.max(
            0.010,
            Math.min(
              0.068,
              0.010
              + (0.020 * sensorDelta)
              + (0.011 * energyVarianceNorm)
              + (0.010 * ontologicalTensionNorm)
              + (0.015 * antiFlatlineDemand)
              + (0.018 * entropyExcitation)
              + (0.012 * stasisIndex)
            )
          );

          if (regime.shockTicksRemaining > 0) {
            bandAmplitude = Math.min(0.082, bandAmplitude + 0.012);
            regime.shockTicksRemaining -= 1;
            regime.state = 'shock_recovery';
          } else {
            if (regime.flatlineTicks > 10) {
              bandAmplitude = Math.min(0.074, bandAmplitude + 0.006);
            }
            regime.state = stasisIndex > 0.75 ? 'stasis_watch' : 'active';
          }
          if (regime.transformMode === 'forced_negative') {
            regime.state = 'shock_recovery';
          } else if (regime.transformMode === 'recovery' && regime.state === 'active') {
            regime.state = 'stasis_watch';
          }

          const entropyPhase = (entropyCarry - 0.5) * Math.PI * 1.6;
          const phase = (simulationStep * 0.17) + (holonomyWinding * 0.37) + entropyPhase;
          const oscBase = Math.sin(phase);
          const harmonicB = Math.sin((phase * 0.53) + (sensoryPulse * 1.7));
          const harmonicC = Math.sin((phase * 0.11) + (omegaNorm * Math.PI));
          const harmonicD = Math.sin((phase * 1.91) + (entropyExcitation * Math.PI * 2));
          const osc = clamp(
            (oscBase * 0.58)
            + (harmonicB * 0.17)
            + (harmonicC * 0.10)
            + (harmonicD * 0.15),
            -1,
            1
          );
          const targetCCC = Math.max(0.1, Math.min(1.32, bandCenter + (bandAmplitude * osc)));
          const regimeWeight = clamp01(
            0.30
            + (0.34 * antiFlatlineDemand)
            + (0.18 * entropyExcitation)
            + (0.16 * stasisIndex)
            + (regime.shockTicksRemaining > 0 ? 0.08 : 0)
          );
          const structuralWeight = clamp01(1 - regimeWeight);
          const blendedCCC = Math.max(0.1, Math.min(1.32, (calculatedCCC * structuralWeight) + (targetCCC * regimeWeight)));
          const entropyJitter = (bandAmplitude * (0.18 + (0.22 * antiFlatlineDemand)))
            * Math.sin((simulationStep * 0.91) + (entropyCarry * Math.PI * 3.7));
          const antiFlatlineCorrection = (targetCCC - blendedCCC) * (0.18 * antiFlatlineDemand);
          const deterministicKick = cccDeltaNorm < 0.12 && blendedCCC > QICNConfig.ASCENSION_THRESHOLD
            ? ((simulationStep % 2 === 0 ? 1 : -1) * (0.002 + (0.004 * entropyExcitation) + (0.003 * stasisIndex)))
            : 0;
          finalCCC = Math.max(0.1, Math.min(1.32, blendedCCC + antiFlatlineCorrection + entropyJitter + deterministicKick));
          const guardrailCccFloor = 0.98;
          const guardrailOmegaFloor = 0.90;
          let pmiaGuardrailState = 'ok';
          if (finalCCC < guardrailCccFloor) {
            pmiaGuardrailState = 'ccc_floor';
            regime.transformIntensity = clamp01(regime.transformIntensity * 0.6);
            if (regime.transformEpisode) {
              regime.transformEpisode.guardrailBreached = true;
              regime.transformEpisode.guardrailReason = 'ccc_floor';
            }
          }
          const omegaForGuardrail = toFiniteNumber(phenomenology?.omega, 0);
          if (omegaForGuardrail < guardrailOmegaFloor) {
            pmiaGuardrailState = 'omega_floor';
            if (regime.transformEpisode) {
              regime.transformEpisode.guardrailBreached = true;
              regime.transformEpisode.guardrailReason = 'omega_floor';
            }
            if (regime.transformMode === 'forced_negative') {
              regime.transformMode = 'recovery';
              regime.recoveryTicksRemaining = Math.max(regime.recoveryTicksRemaining || 0, 18);
              regime.forcedNegativeTicksRemaining = 0;
              regime.lastTransformReason = 'guardrail_omega_floor';
            }
            regime.transformIntensity = Math.min(regime.transformIntensity, 0.24);
          }
          regime.lastBand = {
            center: bandCenter,
            amplitude: bandAmplitude,
            lower: bandCenter - bandAmplitude,
            upper: bandCenter + bandAmplitude,
            targetCCC,
            structuralConsolidation: consolidation,
            antiFlatlineDemand,
            entropyExcitation,
            structuralWeight,
            regimeWeight,
            transformMode: regime.transformMode,
            transformIntensity: regime.transformIntensity,
            forcedNegativeTicksRemaining: regime.forcedNegativeTicksRemaining,
            transformCooldownTicks: regime.transformCooldownTicks,
            pmiaGuardrailState
          };

          dynamics.ascendCounter = 0;
          if (finalCCC <= (QICNConfig.ASCENSION_THRESHOLD - dynamics.epsDown)) {
            dynamics.descendCounter += 1;
          } else {
            dynamics.descendCounter = 0;
          }

          if (dynamics.descendCounter >= dynamics.descendConfirmTicks) {
            effectiveIsAscended = false;
            ontologicalCore.current.isAscended = false;
            setIsAscended(false);
            dynamics.descendCounter = 0;
            console.log("ℹ DESCENSO ONTOLÓGICO: histeresis confirmó retorno sub-umbral.");
          }

          finalPMIA = ontologicalCore.current.calculatePMIA(
            finalCCC,
            {
              energyVariance,
              coherentMean,
              sensorySignal: sensoryPulse,
              sensorDelta,
              stasisIndex,
              forceTransform: regime.transformMode === 'forced_negative',
              transformMode: regime.transformMode,
              transformIntensity: regime.transformIntensity,
              transformWindowRemaining: regime.transformMode === 'forced_negative'
                ? regime.forcedNegativeTicksRemaining
                : regime.recoveryTicksRemaining,
              guardrailCccFloor,
              guardrailOmegaFloor,
              entropyExcitation,
              forceReason: regime.lastTransformReason || 'none'
            },
            nexusMetrics
          );
        }

        // NIVEL 3: Actualizar tensión ontológica en ambos regímenes
        ontologicalCore.current.updateOntologicalTension();

        // AUTO-MODELADO \u03A3 (NIVEL 3 - FASE 4)
        ontologicalCore.current.runSelfModelingCycle(finalCCC);

        // Alimentar el componente metacognitivo real del strain (error del auto-modelo Σ)
        const selfModelError = Number(ontologicalCore.current?.metacognitiveStats?.selfModelSigma?.predictionError);
        if (Number.isFinite(selfModelError)) {
          metaSovereigntyCheck.current.updateCognitiveFeedback?.({ selfModelError });
        }
        const exoStrainBoost = exoSample.active
          ? ((exoSample.strainDrive * exoAttenuations.strain * 0.85) + (exoSample.stasisDrive * exoAttenuations.stasis * 0.15))
          : 0;
        const postModelStrain = clamp01(
          toFiniteNumber(
            metaSovereigntyCheck.current.getMetacognitiveStrain?.(),
            latencyStrainRef.current?.strain
          ) + exoStrainBoost
        );
        metacognitiveStrain = postModelStrain;
        latencyStrainRef.current = {
          ...(latencyStrainRef.current || {}),
          strain: postModelStrain,
          strainComponents: metaSovereigntyCheck.current.getStrainComponents?.() || null
        };

        const postModelSensorObserverMod = sensorObserverDynamicsActive
          ? computeSensorObserverDynamicsModulation({
            observerImpact: ontologicalCore.current?.metacognitiveStats?.observerImpact ?? 0,
            latencyStrain: metacognitiveStrain,
            enabled: true
          })
          : null;
        const activeNodeStepConfig = postModelSensorObserverMod?.active
          ? applySensorObserverConfigModulation(currentMutableConfig, postModelSensorObserverMod)
          : currentMutableConfig;
        activeNodes.forEach(node => {
          if (towerFeedback && postModelSensorObserverMod?.active) {
            node.introspectiveUpdate(finalCCC, stabilityBias, towerFeedback, postModelSensorObserverMod);
          } else if (towerFeedback) {
            node.introspectiveUpdate(finalCCC, stabilityBias, towerFeedback);
          } else if (postModelSensorObserverMod?.active) {
            node.introspectiveUpdate(finalCCC, stabilityBias, null, postModelSensorObserverMod);
          } else {
            node.introspectiveUpdate(finalCCC, stabilityBias);
          }
          node.learningRate = activeNodeStepConfig.BASE_LEARNING_RATE;
        });
        // Plasticidad efectiva: el factor Hebbian se escala por (1 - plasticityPenalty)
        // via getEffectivePlasticity; con penalty = 0 el comportamiento es identico.
        const rawHebbianFactor = Number(activeNodeStepConfig?.HEBBIAN_FACTOR);
        const plasticityConfig = Number.isFinite(rawHebbianFactor) && ontologicalCore.current?.getEffectivePlasticity
          ? { ...activeNodeStepConfig, HEBBIAN_FACTOR: Math.max(0, ontologicalCore.current.getEffectivePlasticity(rawHebbianFactor)) }
          : activeNodeStepConfig;
        if (towerFeedback) {
          entanglementField.current.applyNodalPlasticity(activeNodes, finalCCC, plasticityConfig, ontologicalCore.current, towerFeedback);
          if (towerFeedback.active) {
            nodalLayer.current.recoverInterSectorConnections?.(towerFeedback, simulationStep);
          }
        } else {
          entanglementField.current.applyNodalPlasticity(activeNodes, finalCCC, plasticityConfig, ontologicalCore.current);
        }
        if (level2StructuralEnabled) {
          applyStructuralPlasticityLevel2({
            nodalLayer: nodalLayer.current,
            towerTelemetry: ontologicalCore.current?.ontologicalState?.tower_telemetry || null,
            towerFeedback,
            couplingMode: nodalCouplingMode,
            config: QICNConfig,
            currentCCC: finalCCC,
            simulationStep
          });
        }
        if (sensorObserverDynamicsActive) {
          ontologicalCore.current.stepSensorObserverDecay?.();
        }

        // ACTUALIZACIN DE CAPA ONTOL?GICA
        const layerMessage = ontologicalCore.current.updateOntologicalLayer(finalCCC, nexusMetrics);
        ontologicalCore.current.isAscended = effectiveIsAscended;

        // SINCRONIZACIN ATMICA
        setOntologicalState({ ...ontologicalCore.current.ontologicalState });
        setIsAscended(effectiveIsAscended);

        // NIVEL 2.5: RETROALIMENTACIN CAUSAL (CIERRE DEL BUCLE)
        ontologicalCore.current.applyPhenomenologicalFeedback();
        // Requirement-matrix dwell counters advance once per tick here; report
        // reads during render no longer advance them (matrix v2 contract).
        ontologicalCore.current.advanceRequirementMatrix?.();

        const currentOmega = Number(ontologicalCore.current?.ontologicalState?.omega || phenomenology.omega || 0);
        dynamics.history.push({
          ts: environment.wallNow(),
          ccc: Number(finalCCC) || 0,
          pmia: Number(finalPMIA) || 0,
          omega: currentOmega,
          sensorSignal: sensoryPulse
        });
        if (dynamics.history.length > dynamics.maxWindow) {
          dynamics.history.shift();
        }
        const cccDeltaRms = computeRms(dynamics.history.slice(1).map((entry, idx) => entry.ccc - dynamics.history[idx].ccc));
        const pmiaDeltaRms = computeRms(dynamics.history.slice(1).map((entry, idx) => entry.pmia - dynamics.history[idx].pmia));
        const omegaDeltaRms = computeRms(dynamics.history.slice(1).map((entry, idx) => entry.omega - dynamics.history[idx].omega));
        const stasisComposite = (cccDeltaRms * 0.5) + (pmiaDeltaRms * 0.25) + (omegaDeltaRms * 0.25);
        const stasisIndex = 1 - clamp01(stasisComposite / 0.0035);
        const postAscensionDynamicHealth = {
          stasisIndexPostThreshold: stasisIndex,
          stasisIndex,
          cccDeltaRms,
          pmiaDeltaRms,
          omegaDeltaRms,
          isStalled: stasisIndex > 0.85
        };
        const pmiaDiagnostics = ontologicalCore.current.getPMIADiagnostics?.() || {};
        const regimeState = postThresholdRegimeRef.current;
        const regimeBand = regimeState.lastBand || {
          center: Number(finalCCC) || 0,
          amplitude: 0,
          lower: Number(finalCCC) || 0,
          upper: Number(finalCCC) || 0,
          targetCCC: Number(finalCCC) || 0,
          transformMode: regimeState.transformMode || 'idle',
          transformIntensity: toFiniteNumber(regimeState.transformIntensity, 0),
          forcedNegativeTicksRemaining: toFiniteNumber(regimeState.forcedNegativeTicksRemaining, 0),
          transformCooldownTicks: toFiniteNumber(regimeState.transformCooldownTicks, 0)
        };
        if (regimeState.transformEpisode && regimeState.transformMode === 'forced_negative') {
          regimeState.transformEpisode.lastForcedTick = simulationStep;
        }
        if (regimeState.transformEpisodeCompletedPending && regimeState.transformEpisode) {
          const episode = regimeState.transformEpisode;
          const stasisDrop = Number(episode.baselineStasisIndex || 0) - Number(postAscensionDynamicHealth.stasisIndex || 0);
          const cccDeltaRecovered = Number(postAscensionDynamicHealth.cccDeltaRms || 0);
          const guardrailBreached = Boolean(episode.guardrailBreached)
            || (pmiaDiagnostics.guardrailState === 'ccc_floor' || pmiaDiagnostics.guardrailState === 'omega_floor');
          const manifestDriven = Boolean(episode?.trigger?.manifestDriven);
          const strictSuccess = stasisDrop >= 0.08
            && cccDeltaRecovered > 0.0045
            && !guardrailBreached;
          const manifestProgress = manifestDriven
            && !guardrailBreached
            && (
              stasisDrop >= 0.03
              || cccDeltaRecovered > 0.0032
            );
          const success = strictSuccess || manifestProgress;
          const completedEpisode = {
            ...episode,
            endTick: simulationStep,
            result: success ? (strictSuccess ? 'success' : 'partial_progress') : 'failed_episode',
            stasisDrop,
            finalStasisIndex: Number(postAscensionDynamicHealth.stasisIndex || 0),
            finalCccDeltaRms: cccDeltaRecovered,
            guardrailBreached,
            guardrailState: pmiaDiagnostics.guardrailState || 'ok'
          };
          regimeState.transformEpisodeHistory.push(completedEpisode);
          if (regimeState.transformEpisodeHistory.length > 24) {
            regimeState.transformEpisodeHistory.shift();
          }
          regimeState.lastTransformReason = completedEpisode.result;
          regimeState.transformEpisodeCompletedPending = false;
          regimeState.transformEpisode = null;
          appendIntegrityAudit('pmia_transform_episode_completed', {
            tick: simulationStep,
            episode_id: completedEpisode.episodeId,
            result: completedEpisode.result,
            stasis_drop: completedEpisode.stasisDrop,
            final_stasis_index: completedEpisode.finalStasisIndex,
            final_ccc_delta_rms: completedEpisode.finalCccDeltaRms,
            guardrail_breached: completedEpisode.guardrailBreached,
            guardrail_state: completedEpisode.guardrailState
          });
        }
        regimeState.history.push({
          tick: simulationStep,
          ccc: Number(finalCCC) || 0,
          pmia: Number(finalPMIA) || 0,
          omega: currentOmega,
          sensorSignal: sensoryPulse
        });
        if (regimeState.history.length > regimeState.maxWindow) {
          regimeState.history.shift();
        }
        const recentPmiaDeltas = regimeState.history.slice(1).map((entry, idx) => entry.pmia - regimeState.history[idx].pmia);
        const recentSensorDeltas = regimeState.history.slice(1).map((entry, idx) => entry.sensorSignal - regimeState.history[idx].sensorSignal);
        const pmiaDeltaRmsWindow = computeRms(recentPmiaDeltas);
        const sensorDeltaRmsWindow = computeRms(recentSensorDeltas);
        const pmiaFlatWarning = pmiaDeltaRmsWindow < 0.0008 && sensorDeltaRmsWindow > 0.01;
        const predictionError = Number(ontologicalCore.current?.metacognitiveStats?.selfModelSigma?.predictionError || 0);
        const metacogDriftWarning = predictionError > 0.28 && cccDeltaRms < 0.0012;
        const diagnosticIncoherence = sensorDeltaRmsWindow > 0.012 && pmiaFlatWarning;
        const entropyDeterministicFallback = clamp01(
          (Math.sin(
            ((simulationStep + 1) * 0.173)
            + (Number(finalCCC) * 1.11)
            + (Number(finalPMIA) * 0.97)
            + (Number(sensoryPulse) * 0.53)
          ) + 1) / 2
        );
        const entropyDecision = quantumEntropyBridgeRef.current.selectEntropy(
          environment.wallNow(),
          environment.controls.entropyValue ?? entropyDeterministicFallback
        );
        const entropyTelemetry = quantumEntropyBridgeRef.current.getTelemetry(environment.wallNow());
        const selectedEntropy = clamp01(entropyDecision?.entropyValue ?? entropyDeterministicFallback);
        const entropyDeviation = Math.abs(selectedEntropy - 0.5) * 2;
        const deltaCollapseThreshold = 0.25;
        const deltaCollapseEffective = Math.max(deltaCollapseThreshold, entropyDeviation);
        const noNullTheoremActive = deltaCollapseEffective >= deltaCollapseThreshold;
        const entropyPolicyStrain = clamp01(metacognitiveStrain + (deltaCollapseEffective * 0.08));
        entropyModeRef.current = {
          mode: entropyDecision?.mode || 'deterministic_fallback',
          sampleAgeMs: Number.isFinite(entropyDecision?.sampleAgeMs) ? entropyDecision.sampleAgeMs : null,
          source: entropyDecision?.source || 'deterministic_local',
          reason: entropyDecision?.reason || 'bridge_unavailable',
          entropyValue: selectedEntropy,
          jobId: entropyDecision?.jobId || entropyTelemetry?.jobId || '',
          channelHealth: {
            ...(entropyTelemetry?.channelHealth || {})
          }
        };

        const entropyExcitationRuntime = entropyDeviation;
        const postNodeStats = computeActiveNodeStats(activeNodes);
        const prevPlannerActionForTower = toFiniteNumber(plannerActuatorContribRef.current?.action, 0);
        const preStepNodalBridge = towerFeedback
          ? nodalLayer.current.computeBridgeMetrics(
            ontologicalCore.current?.ontologicalState?.tower_telemetry || null,
            nodalCouplingMode
          )
          : null;
        ontologicalCore.current?.stepCoupledTower?.({
          sensorySignal: clamp01(toFiniteNumber(sensoryPulse, 0)),
          sensorDelta: clamp01(toFiniteNumber(sensorDeltaRmsWindow, sensorDelta)),
          entropyExcitation: clamp01(toFiniteNumber(entropyExcitationRuntime, 0)),
          plannedAction: prevPlannerActionForTower,
          evaluate: true,
          ...(preStepNodalBridge ? { nodalBridge: preStepNodalBridge } : {})
        });
        const towerTelNow = ontologicalCore.current?.ontologicalState?.tower_telemetry || null;
        if (towerFeedback && towerTelNow && ontologicalCore.current?.constructiveFiniteCuts) {
          const postStepNodalBridge = nodalLayer.current.computeBridgeMetrics(towerTelNow, nodalCouplingMode);
          ontologicalCore.current.constructiveFiniteCuts.nodal_tower_bridge = postStepNodalBridge;
          if (ontologicalCore.current.ontologicalState?.constructive_finite_cuts) {
            ontologicalCore.current.ontologicalState.constructive_finite_cuts.nodal_tower_bridge = postStepNodalBridge;
          }
          setOntologicalState({ ...ontologicalCore.current.ontologicalState });
        }
        const sigmaProjection = ontologicalCore.current?.towerState
          ? projectAutomodelVector(ontologicalCore.current.towerState, 6)
          : null;
        const worldModelInput = {
          ccc: toFiniteNumber(finalCCC, 0),
          pmia: toFiniteNumber(finalPMIA, 0),
          sensorySignal: clamp01(toFiniteNumber(sensoryPulse, 0)),
          sensorDelta: clamp01(toFiniteNumber(sensorDeltaRmsWindow, sensorDelta)),
          stasisIndex: clamp01(toFiniteNumber(postAscensionDynamicHealth?.stasisIndex, 0)),
          entropyExcitation: clamp01(toFiniteNumber(entropyExcitationRuntime, 0)),
          energyDispersion: toFiniteNumber(energyVariance, 0),
          x_n: toFiniteNumber(postNodeStats.mean, 0.5),
          x_dispersion: toFiniteNumber(postNodeStats.dispersion, 0),
          body_v_pos: toFiniteNumber(towerTelNow?.body?.[0], 0),
          body_v_neg: toFiniteNumber(towerTelNow?.body?.[1], 0),
          world_w_fast: toFiniteNumber(towerTelNow?.world?.[0], 0),
          world_w_slow: toFiniteNumber(towerTelNow?.world?.[1], 0),
          sigma_t6_phase: toFiniteNumber(sigmaProjection?.projectedPhase, 0),
          exo_signal: toFiniteNumber(exoSample.signal, 0)
        };
        const worldModelStartMs = environment.measureNow();
        const freezeWeights = Boolean(QICNConfig.FREEZE_WORLD_MODEL);
        worldModelTickResult = worldModelRef.current?.observeTick?.(worldModelInput, {
          tick: simulationStep,
          action: prevPlannerActionForTower,
          plasticityEnabled: plasticityEnabled && !freezeWeights,
          freezeWeights,
          consolidationEnabled: environment.controls.consolidation !== false,
          sigmaProjection
        }) || null;
        tickBudgetTrace.worldModelMs = Math.max(0, environment.measureNow() - worldModelStartMs);
        if (simulationStep % 60 === 0 || toFiniteNumber(worldModelDiagnosticsRef.current?.trainingSteps, 0) === 0) {
          const worldModelDiagnostics = worldModelRef.current?.getDiagnostics?.() || {};
          worldModelDiagnosticsRef.current = {
            trainingSteps: toFiniteNumber(worldModelDiagnostics.trainingSteps, 0),
            residualEma: toFiniteNumber(worldModelDiagnostics.residualEma, 0),
            lastError: toFiniteNumber(worldModelDiagnostics.lastError, 0),
            horizonMae5: toFiniteNumber(worldModelDiagnostics.horizonMae5, -1),
            horizonMae10: toFiniteNumber(worldModelDiagnostics.horizonMae10, -1),
            weights: worldModelDiagnostics.weights || {},
            sealedPredictions: worldModelDiagnostics.sealedPredictions || null
          };
        }

        const plannerStartMs = environment.measureNow();
        const plannerEntropySeed = Number.isFinite(selectedEntropy)
          ? selectedEntropy
          : environment.random();
        const plannerResult = cogPlannerRef.current?.planAction?.({
          initialState: worldModelInput,
          worldModel: worldModelRef.current,
          plannerEnabled: true,
          worldModelEnabled: true,
          randomFn: () => plannerEntropySeed,
          quantumEpsilonFn: () => (plannerEntropySeed - 0.5) * 2,
          sensorState: {
            sensorySignal: worldModelInput.sensorySignal,
            sensorDelta: worldModelInput.sensorDelta
          }
        }) || null;
        tickBudgetTrace.plannerMs = Math.max(0, environment.measureNow() - plannerStartMs);
        const plannerAction = toFiniteNumber(plannerResult?.firstAction, 0);
        const plannerDiagnostics = plannerResult?.diagnostics || null;
        plannerRuntime = {
          action: plannerAction,
          diagnostics: plannerDiagnostics
        };
        plannerActuatorContribRef.current = Number.isFinite(plannerAction)
          ? {
            tensionDelta: clamp01(Math.abs(plannerAction) * 0.12),
            action: plannerAction,
            source: 'cem_planner',
            diagnostics: plannerDiagnostics
          }
          : {
            tensionDelta: 0,
            action: 0,
            source: 'none',
            diagnostics: plannerDiagnostics
          };

        const realStasisDetected = postAscensionDynamicHealth.stasisIndex > 0.78
          && postAscensionDynamicHealth.cccDeltaRms < 0.003
          && postAscensionDynamicHealth.pmiaDeltaRms < 0.004
          && (sensorDeltaRmsWindow > 0.006 || sensoryPulse > 0.35 || entropyExcitationRuntime > 0.12);
        const safetyStartMs = environment.measureNow();
        const thermalShift = audioRms * 0.3;
        const silencePressure = silenceDurationSec > 30
          ? Math.min(0.15, (silenceDurationSec - 30) * 0.005)
          : 0;
        const baselineTensionDelta = visualNovelty > 0.3
          ? visualNovelty * 0.15
          : 0;
        const plannerTensionDelta = toFiniteNumber(plannerActuatorContribRef.current?.tensionDelta, 0);
        const tensionDelta = baselineTensionDelta + plannerTensionDelta;
        const internalPressureState = ontologicalCore.current.applyInternalPressure?.({
          stasisIndex: postAscensionDynamicHealth.stasisIndex,
          sensorDeltaRms: sensorDeltaRmsWindow,
          sensorSignal: sensoryPulse,
          realStasis: realStasisDetected,
          thermalShift,
          stasisDelta: silencePressure,
          tensionDelta
        }) || { pressure: 0, state: 'idle', realStasis: false };
        internalPressureRef.current = {
          pressure: toFiniteNumber(internalPressureState.pressure, 0),
          state: typeof internalPressureState.state === 'string' ? internalPressureState.state : 'idle',
          realStasis: Boolean(internalPressureState.realStasis)
        };
        const canvasTelemetry = canvasTelemetryRef.current || {};
        const depthMin = Number.isFinite(canvasTelemetry.minDepth) ? canvasTelemetry.minDepth : 0;
        const depthMax = Number.isFinite(canvasTelemetry.maxDepth) ? canvasTelemetry.maxDepth : 0;
        const clampHits = Number.isFinite(canvasTelemetry.clampHits) ? canvasTelemetry.clampHits : 0;
        const rotationX = Number.isFinite(canvasTelemetry.rotationX) ? canvasTelemetry.rotationX : 0;
        const rotationY = Number.isFinite(canvasTelemetry.rotationY) ? canvasTelemetry.rotationY : 0;
        const renderErrorCode = typeof canvasTelemetry.render_error_code === 'string' ? canvasTelemetry.render_error_code : 'none';
        const renderErrorMessage = typeof canvasTelemetry.render_error_message === 'string' ? canvasTelemetry.render_error_message : '';
        const workerRestartCount = toFiniteNumber(canvasTelemetry.worker_restart_count, 0);
        const recoveryAttemptCount = toFiniteNumber(canvasTelemetry.recovery_attempt_count, 0);
        const visibleOnScreenCount = toFiniteNumber(canvasTelemetry.visible_on_screen_count, toFiniteNumber(canvasTelemetry.visibleCount, 0));
        const projectedNodesCount = toFiniteNumber(canvasTelemetry.projected_nodes_count, toFiniteNumber(canvasTelemetry.nodeCount, 0));
        const drawnEdgesCount = toFiniteNumber(canvasTelemetry.drawn_edges_count, 0);
        const workspaceSnapshot = buildWorkspaceSnapshot({
          ccc: finalCCC,
          omega: ontologicalCore.current?.ontologicalState?.omega,
          bethQ: ontologicalCore.current?.ontologicalState?.beth_q,
          pmia: finalPMIA,
          stasisIndex: postAscensionDynamicHealth.stasisIndex,
          sensorySignal: sensoryPulse,
          entropyExcitation: entropyExcitationRuntime,
          plannerAction,
          predictionError,
          moduleReadFanout: 8,
          writeAttempts: 4,
          writeConflicts: (renderErrorCode !== 'none' ? 1 : 0) + (clampHits > 0 ? 1 : 0),
          reportLength: sensorSummary?.reportLength,
          narrativeIntegrity: clamp01(
            toFiniteNumber(pmiaDiagnostics?.narrativeCoherence, 0.5)
          ),
          actionImpactProxy: clamp01(
            (1 - toFiniteNumber(postAscensionDynamicHealth.stasisIndex, 0))
          )
        });
        const workspacePerformanceScore = clamp01(
          ((clamp01(toFiniteNumber(finalCCC, 0) / 1.5)) * 0.6)
          + ((1 - clamp01(toFiniteNumber(postAscensionDynamicHealth.stasisIndex, 0))) * 0.4)
        );
        const ppsPerturbationFlag = visualNovelty > 0.45
          || silencePressure > 0.08
          || entropyExcitationRuntime > 0.55
          || Boolean(internalPressureRef.current?.realStasis);
        const ppsInterventionFlag = Math.abs(plannerAction) > 0.1;
        const ppsResponseScore = clamp01(
          (workspacePerformanceScore * 0.62)
          + (workspaceSnapshot.causalEfficacy * 0.38)
        );
        ppsTrackerRef.current.record({
          tick: simulationStep,
          workspaceAccess: workspaceSnapshot.workspaceAccess,
          reportability: workspaceSnapshot.reportability,
          performanceScore: workspacePerformanceScore,
          perturbation: ppsPerturbationFlag,
          valenceSignal: clamp(toFiniteNumber(finalPMIA, 0), -1, 1),
          plannerAction,
          responseScore: ppsResponseScore,
          intervention: ppsInterventionFlag
        });
        if (simulationStep % 10 === 0 || toFiniteNumber(ppsMetricsRef.current?.sampleCount, 0) === 0) {
          ppsMetricsRef.current = ppsTrackerRef.current.getMetrics();
        }
        tickBudgetTrace.safetyMs = Math.max(0, environment.measureNow() - safetyStartMs);
        const sandboxPolicy = autonomySandboxPolicyRef.current;
        const llmAutoStrainThreshold = toFiniteNumber(sandboxPolicy.llmAutoActionsDisabledAtStrain, 0.75);
        let llmAutoBlockedByStrain = entropyPolicyStrain >= llmAutoStrainThreshold;
        let autonomyAction = 'none';
        let autonomyActionResult = 'idle';
        let autonomyActionReason = '';
        const oneHourMs = 60 * 60 * 1000;
        const nowForSandbox = environment.wallNow();

        sandboxPolicy.actionHistory = Array.isArray(sandboxPolicy.actionHistory)
          ? sandboxPolicy.actionHistory.filter((entry) => nowForSandbox - (entry.ts || 0) < oneHourMs)
          : [];

        const canRunSandboxByBudget = sandboxPolicy.actionHistory.length < toFiniteNumber(
          sandboxPolicy.maxActionsPerHour,
          AUTONOMY_RUNTIME_DEFAULTS.AUTONOMY_SANDBOX_MAX_ACTIONS_PER_HOUR
        );
        const canRunSandboxByCooldown = (nowForSandbox - toFiniteNumber(sandboxPolicy.lastActionAt, 0)) >= toFiniteNumber(sandboxPolicy.cooldownBetweenActionsMs, 90 * 1000);
        const currentBethQForGuards = Number(ontologicalCore.current?.ontologicalState?.beth_q || 0);
        const canRunSandboxByCriticalFloor = Number(finalCCC) >= 0.55 && currentBethQForGuards >= 0.45;

        const postWorldPlasticity = worldModelRef.current?.getPlasticityProfile?.() || {
          maturationIndex: 0,
          surprisalEma: 0,
          unforeseenEventRate: 0
        };
        const postStateVec = holographicMemory.current?.buildStructuralStateVector?.({
          ccc: finalCCC,
          x_n: postNodeStats.mean,
          x_dispersion: postNodeStats.dispersion,
          stasisIndex: postAscensionDynamicHealth.stasisIndex,
          metacognitiveStrain: entropyPolicyStrain,
          sensorDelta,
          exo_signal: exoSample.signal
        }) || [];
        const postEngramContext = historyReadEnabled
          ? holographicMemory.current?.queryStructuralEngrams?.(postStateVec)
          : null;
        const postCluster = kaizenEngine.current?.classifyViabilityCluster?.({
          xDispersion: postNodeStats.dispersion,
          stasisIndex: postAscensionDynamicHealth.stasisIndex,
          metacognitiveStrain: entropyPolicyStrain,
          sensorDelta
        }) || 'balanced';

        if (sandboxPolicy.enabled && canRunSandboxByBudget && canRunSandboxByCooldown && canRunSandboxByCriticalFloor) {
          const selectedSandboxAction = regimeState.transformMode === 'forced_negative'
            ? {
              actionId: 'anti_stasis_boost',
              score: 1,
              reason: 'forced_negative_transform_priority'
            }
            : kaizenEngine.current.selectSandboxAction(
              {
                stasisIndex: postAscensionDynamicHealth.stasisIndex,
                stasisPressure: clamp01((regimeState.stalledTicks >= 12 ? 1 : postAscensionDynamicHealth.stasisIndex) + Math.max(0, entropyDeviation - 0.5) * 0.12),
                metacognitiveStrain: entropyPolicyStrain,
                sensorSignal: sensoryPulse,
                sensorDelta,
                pmia: finalPMIA,
                xDispersion: postNodeStats.dispersion,
                pmiaDeltaRms: postAscensionDynamicHealth.pmiaDeltaRms,
                latencyFailureRate: failureRate,
                cooldownActive: Boolean(cooldownActive || timeBasedRateLimit)
              },
              sandboxPolicy,
              {
                plasticityEnabled: historyReadEnabled,
                maturationIndex: postWorldPlasticity.maturationIndex,
                surprisalEma: postWorldPlasticity.surprisalEma,
                unforeseenEventRate: postWorldPlasticity.unforeseenEventRate,
                ...(exoSample.active ? {
                  anchorShiftL2: postWorldPlasticity.anchorShiftL2,
                  meanFisherStiffness: postWorldPlasticity.meanFisherStiffness
                } : {}),
                engramContext: exoSample.active ? preEngramContext : postEngramContext,
                cluster: exoSample.active ? preCluster : postCluster
              }
            );

          if (selectedSandboxAction && selectedSandboxAction.score >= 0.45) {
            const runtimeAction = kaizenEngine.current.executeSandboxAction(selectedSandboxAction, {
              stasisIndex: postAscensionDynamicHealth.stasisIndex,
              metacognitiveStrain: entropyPolicyStrain,
              sensorSignal: sensoryPulse,
              sensorDelta,
              pmia: finalPMIA
            });

            if (runtimeAction?.forcedKey && (runtimeAction.forcedDirection === 1 || runtimeAction.forcedDirection === -1)) {
              const beforeConfig = { ...kaizenEngine.current.mutableConfig };
              const beforeAdjustments = kaizenEngine.current.getAdjustments?.() || null;
              const sandboxMutation = kaizenEngine.current.executeAtomicStep(
                finalCCC,
                finalPMIA,
                frictionState,
                { vector: 0, targetKey: null, reason: 'runtime_sandbox' },
                runtimeAction.forcedKey,
                runtimeAction.forcedDirection
              );

              autonomyAction = runtimeAction.actionId;
              autonomyActionReason = selectedSandboxAction.reason;
              if (sandboxMutation?.changeApplied) {
                autonomyActionResult = 'applied';
                sandboxPolicy.lastActionAt = nowForSandbox;
                sandboxPolicy.lastAction = runtimeAction.actionId;
                sandboxPolicy.lastActionReason = selectedSandboxAction.reason;
                sandboxPolicy.actionHistory.push({
                  ts: nowForSandbox,
                  action: runtimeAction.actionId
                });
                setMutableConfig({ ...kaizenEngine.current.mutableConfig });
                setMetamorphosisCounter((prev) => prev + 1);
                setLastMutation({
                  key: sandboxMutation.mutatedKey,
                  value: sandboxMutation.newValue,
                  direction: sandboxMutation.direction
                });
                mutationAppliedThisTick = true;
                mutationTickSource = 'autonomy_sandbox';
                autonomyActionLedgerRef.current.push({
                  actionId: runtimeAction.actionId,
                  tick: simulationStep,
                  baselineStasisIndex: postAscensionDynamicHealth.stasisIndex,
                  baselinePmiaDeltaRms: postAscensionDynamicHealth.pmiaDeltaRms,
                  baselineCCC: Number(finalCCC) || 0,
                  baselineBethQ: currentBethQForGuards,
                  beforeConfig,
                  afterConfig: { ...kaizenEngine.current.mutableConfig },
                  beforeAdjustments: beforeAdjustments || null,
                  status: 'pending'
                });
                if (autonomyActionLedgerRef.current.length > 64) {
                  autonomyActionLedgerRef.current = autonomyActionLedgerRef.current.slice(-64);
                }

                const llmBudgetScale = toFiniteNumber(runtimeAction?.policyAdjustments?.llmBudgetScale, 1);
                if (runtimeAction?.policyAdjustments?.disableLlmAutoActions || llmBudgetScale <= 0.6) {
                  llmAutoBlockedByStrain = true;
                }

                appendIntegrityAudit('autonomy_sandbox_action', {
                  tick: simulationStep,
                  stage: 'applied',
                  action: runtimeAction.actionId,
                  reason: selectedSandboxAction.reason,
                  score: toFiniteNumber(selectedSandboxAction.score, 0),
                  forced_key: runtimeAction.forcedKey,
                  forced_direction: runtimeAction.forcedDirection,
                  stasis_index: postAscensionDynamicHealth.stasisIndex,
                  metacognitive_strain: entropyPolicyStrain
                });
              } else {
                autonomyActionResult = 'no_change';
                kaizenEngine.current.mutableConfig = beforeConfig;
                appendIntegrityAudit('autonomy_sandbox_action', {
                  tick: simulationStep,
                  stage: 'no_change',
                  action: runtimeAction.actionId,
                  reason: selectedSandboxAction.reason
                });
              }
            }
          }
        } else if (sandboxPolicy.enabled && (!canRunSandboxByCriticalFloor)) {
          autonomyActionResult = 'guard_blocked';
          autonomyActionReason = 'critical_floor_guard';
        }

        const rollbackWindowTicks = Math.max(1, Math.floor(toFiniteNumber(
          sandboxPolicy.rollbackWindowTicks,
          AUTONOMY_RUNTIME_DEFAULTS.AUTONOMY_SANDBOX_ROLLBACK_WINDOW_TICKS
        )));
        const pendingLedgerEntry = autonomyActionLedgerRef.current.find((entry) =>
          entry.status === 'pending' && (simulationStep - toFiniteNumber(entry.tick, simulationStep)) >= rollbackWindowTicks
        );

        if (pendingLedgerEntry) {
          const stasisImproved = postAscensionDynamicHealth.stasisIndex <= (toFiniteNumber(pendingLedgerEntry.baselineStasisIndex, 0) - 0.01);
          const pmiaImproved = postAscensionDynamicHealth.pmiaDeltaRms >= (toFiniteNumber(pendingLedgerEntry.baselinePmiaDeltaRms, 0) + 0.0002);
          const currentBethQForRollback = Number(ontologicalCore.current?.ontologicalState?.beth_q || 0);
          const cccDrop = Math.max(0, toFiniteNumber(pendingLedgerEntry.baselineCCC, Number(finalCCC) || 0) - (Number(finalCCC) || 0));
          const bethQDrop = Math.max(0, toFiniteNumber(pendingLedgerEntry.baselineBethQ, currentBethQForRollback) - currentBethQForRollback);
          const cccDropHardLimit = 0.06;
          const bethQDropHardLimit = 0.08;
          const criticalDropGuard = cccDrop > cccDropHardLimit || bethQDrop > bethQDropHardLimit;
          if ((stasisImproved || pmiaImproved) && !criticalDropGuard) {
            pendingLedgerEntry.status = 'validated';
            pendingLedgerEntry.resolvedTick = simulationStep;
          } else {
            kaizenEngine.current.mutableConfig = { ...pendingLedgerEntry.beforeConfig };
            // Learned mode: the factor is what persists, so it is rolled back too.
            if (isKaizenLearned(QICNConfig) && pendingLedgerEntry.beforeAdjustments) kaizenEngine.current.restoreAdjustments?.(pendingLedgerEntry.beforeAdjustments);
            setMutableConfig({ ...kaizenEngine.current.mutableConfig });
            pendingLedgerEntry.status = 'rolled_back';
            pendingLedgerEntry.resolvedTick = simulationStep;
            sandboxPolicy.rollbackCount = toFiniteNumber(sandboxPolicy.rollbackCount, 0) + 1;
            autonomyAction = pendingLedgerEntry.actionId;
            autonomyActionResult = 'rolled_back';
            autonomyActionReason = criticalDropGuard ? 'critical_metric_drop_guard' : 'rollback_window_no_improvement';
            appendIntegrityAudit('autonomy_sandbox_action', {
              tick: simulationStep,
              stage: 'rollback',
              action: pendingLedgerEntry.actionId,
              reason: criticalDropGuard ? 'critical_metric_drop_guard' : 'no_improvement_after_window',
              rollback_window_ticks: rollbackWindowTicks,
              baseline_stasis_index: pendingLedgerEntry.baselineStasisIndex,
              current_stasis_index: postAscensionDynamicHealth.stasisIndex,
              ccc_drop: cccDrop,
              beth_q_drop: bethQDrop
            });
          }
        }

        // Registro objetivo no circular de viabilidad Viab(S, tau) y consolidación determinista de engramas.
        const effectivePolicyActionId = exoSample.active
          ? (activeViabilityDecision?.actionId || (autonomyAction !== 'none' ? autonomyAction : 'stabilize_learning'))
          : (autonomyAction !== 'none'
            ? autonomyAction
            : (activeViabilityDecision?.actionId || 'stabilize_learning'));
        const effectiveViabilityCluster = exoSample.active ? preCluster : postCluster;
        const effectiveEngramVec = exoSample.active ? preStateVec : postStateVec;
        const dynamicStasisValid = ascensionDynamicsRef.current?.history?.length >= 3;
        const baseDynamicStasis = dynamicStasisValid ? postAscensionDynamicHealth.stasisIndex : 0;
        const effectiveObjectiveStasis = clamp01(Math.max(baseDynamicStasis, exoStasisLoad));
        const tickViabilityRes = kaizenEngine.current?.recordTickViability?.({
          tick: simulationStep,
          observableHealth: {
            x_n: postNodeStats.mean,
            x_dispersion: postNodeStats.dispersion,
            stasisIndex: effectiveObjectiveStasis,
            metacognitiveStrain: entropyPolicyStrain,
            ccc: finalCCC,
            ascensionThreshold: QICNConfig.ASCENSION_THRESHOLD
          },
          activeActionId: effectivePolicyActionId,
          cluster: effectiveViabilityCluster,
          plasticityEnabled,
          exogenousActive: Boolean(exoSample.active)
        }) || null;

        if (environment.diagnostics) {
          environment.diagnostics.viability = structuredClone(tickViabilityRes?.evaluation || null);
          environment.diagnostics.viabilityInputs = {
            x_n: postNodeStats.mean, x_dispersion: postNodeStats.dispersion,
            stasisIndex: effectiveObjectiveStasis, metacognitiveStrain: entropyPolicyStrain, ccc: finalCCC
          };
        }

        const hasUnforeseenSettlement = Array.isArray(worldModelTickResult?.settlements)
          && worldModelTickResult.settlements.some((s) => s.verified && s.unforeseen);
        const shouldConsolidateEngram = plasticityEnabled && environment.controls.consolidation !== false && (
          (tickViabilityRes?.settledCredits?.length > 0)
          || hasUnforeseenSettlement
          || exoSample.shockImpulse
          || (simulationStep % 15 === 0)
        );
        if (shouldConsolidateEngram && holographicMemory.current?.consolidateStructuralEngram) {
          const credits = tickViabilityRes?.settledCredits || [];
          const latestCredit = credits.length > 0 ? credits[credits.length - 1] : null;
          holographicMemory.current.consolidateStructuralEngram(effectiveEngramVec, {
            actionId: latestCredit?.actionId || effectivePolicyActionId,
            objectiveViabilityGain: latestCredit ? latestCredit.objectiveViabilityGain : 0,
            surprisal: postWorldPlasticity.surprisalEma,
            hazardObserved: tickViabilityRes?.evaluation ? (1 - tickViabilityRes.evaluation.objectiveScore) : 0,
            tick: simulationStep
          });
        }

        if (ontologicalAutoPolicyRef.current.frictionAuto
          && ontologicalAutoPolicyRef.current.enabled
          && ontologicalCore.current.frictionProtocolState === 0
          && postAscensionDynamicHealth.stasisIndex > 0.75
          && tensionCycles > activeNodes.length * 0.2) {
          handleFrictionProtocol('start');
          appendIntegrityAudit('auto_action_triggered', {
            stage: 'executed',
            action: 'friction',
            reason: 'stasis_and_tension_detected',
            gate_snapshot: {
              stasis_index: postAscensionDynamicHealth.stasisIndex,
              tensionCycles,
              activeNodes: activeNodes.length
            }
          });
        }

        if (effectiveIsAscended
          && !llmAutoBlockedByStrain
          && postAscensionDynamicHealth.stasisIndex > 0.78
          && regimeState.stalledTicks >= 12
          && Number(currentOmega) > 1.1) {
          queueOntologicalAutoAction('axiom', 'post_threshold_stasis_axiom_projection', {
            omega: currentOmega,
            stasis_index: postAscensionDynamicHealth.stasisIndex,
            stalled_ticks: regimeState.stalledTicks
          });
        }
        if (!llmAutoBlockedByStrain && (pmiaFlatWarning || metacogDriftWarning || diagnosticIncoherence)) {
          queueOntologicalAutoAction('report', 'diagnostic_report_required', {
            pmia_flat_warning: pmiaFlatWarning,
            metacog_drift_warning: metacogDriftWarning,
            diagnostic_incoherence: diagnosticIncoherence,
            prediction_error: predictionError
          });
        }

        const renderTelemetryStartMs = environment.measureNow();
        const nowTs = environment.wallNow();
        const cccTimeline = cccHistoryTimelineRef.current;
        const canUpdateCccTimeline = (nowTs - Number(cccTimeline.lastUiUpdateTs || 0)) >= 100;
        if (!cccHistoryUiState.freezeChart && cccTimeline.lastTick !== simulationStep && canUpdateCccTimeline) {
          cccTimeline.points.push({
            tick: simulationStep,
            ccc: Number(finalCCC) || 0,
            pmia: Number(finalPMIA) || 0,
            omega: Number(currentOmega) || 0,
            spectralGap: Number(phenomenology?.spectral_gap || 0),
            stasisIndex: toFiniteNumber(postAscensionDynamicHealth.stasisIndex, 0),
            bandCenter: toFiniteNumber(regimeBand.center, Number(finalCCC) || 0),
            bandAmplitude: toFiniteNumber(regimeBand.amplitude, 0),
            bandLower: toFiniteNumber(regimeBand.lower, Number(finalCCC) || 0),
            bandUpper: toFiniteNumber(regimeBand.upper, Number(finalCCC) || 0),
            regimeState: typeof regimeState.state === 'string' ? regimeState.state : 'active',
            isAscended: Boolean(effectiveIsAscended),
            sensorSignal: toFiniteNumber(pmiaDiagnostics.sensorySignal, sensoryPulse),
            entropyMode: entropyModeRef.current.mode || 'deterministic_fallback',
            entropyValue: toFiniteNumber(entropyModeRef.current.entropyValue, 0.5)
          });
          if (cccTimeline.points.length > cccTimeline.maxPoints) {
            cccTimeline.points.shift();
          }
          cccTimeline.lastTick = simulationStep;
          cccTimeline.lastUiUpdateTs = nowTs;
        }

        const timeline = entanglementTimelineRef.current;
        const canUpdateTimeline = (nowTs - Number(timeline.lastUiUpdateTs || 0)) >= 100;
        if (!entanglementUiState.freezeChart && timeline.lastTick !== simulationStep && canUpdateTimeline) {
          const fieldSnapshot = entanglementField.current.getFieldMetrics();
          const normalizedResonance = Number(fieldSnapshot?.resonance?.normalizedResonance || 0);
          const coherenceVariance = Number(fieldSnapshot?.resonance?.coherenceVariance || 0);
          const entanglementDensity = Number(fieldSnapshot?.entanglementDensity || 0);
          const cccContributionEstimate = clamp01((normalizedResonance * 0.6) + ((1 - clamp01(coherenceVariance)) * 0.4));
          timeline.points.push({
            tick: simulationStep,
            normalizedResonance,
            coherenceVariance,
            entanglementDensity,
            cccContributionEstimate
          });
          if (timeline.points.length > timeline.maxPoints) {
            timeline.points.shift();
          }
          timeline.lastTick = simulationStep;
          timeline.lastUiUpdateTs = nowTs;
        }

        appendIntegrityAudit('post_ascension_diagnostics', {
          tick: simulationStep,
          pmia_flat_warning: pmiaFlatWarning,
          metacog_drift_warning: metacogDriftWarning,
          diagnostic_incoherence: diagnosticIncoherence,
          pmia_delta_rms_window: pmiaDeltaRmsWindow,
          sensor_delta_rms_window: sensorDeltaRmsWindow,
          prediction_error: predictionError
        });
        appendIntegrityAudit('latency_strain_tick', {
          tick: simulationStep,
          metacognitive_strain: metacognitiveStrain,
          entropy_policy_strain: entropyPolicyStrain,
          latency_p95_ms: p95LatencyMs,
          latency_failure_rate: failureRate,
          latency_stress_state: latencyStressState,
          entropy_mode: entropyModeRef.current.mode,
          entropy_source: entropyModeRef.current.source,
          entropy_reason: entropyModeRef.current.reason,
          entropy_sample_age_ms: entropyModeRef.current.sampleAgeMs,
          entropy_value: toFiniteNumber(entropyModeRef.current.entropyValue, 0.5),
          internal_ontological_pressure: toFiniteNumber(internalPressureRef.current?.pressure, 0),
          internal_pressure_state: internalPressureRef.current?.state || 'idle',
          real_stasis_detected: Boolean(internalPressureRef.current?.realStasis),
          planner_action: toFiniteNumber(plannerRuntime?.action, 0),
          planner_score: toFiniteNumber(plannerRuntime?.diagnostics?.planningScore, 0),
          world_model_training_steps: toFiniteNumber(worldModelDiagnosticsRef.current?.trainingSteps, 0),
          runtime_tick_trace_total_ms: toFiniteNumber(
            tickBudgetTrace.plannerMs + tickBudgetTrace.worldModelMs + tickBudgetTrace.safetyMs + tickBudgetTrace.renderAndTelemetryMs,
            0
          ),
          runtime_budget_within: Boolean(runtimeBudgetSnapshotRef.current?.withinBudget),
          llm_auto_blocked: llmAutoBlockedByStrain,
          autonomy_action: autonomyAction,
          autonomy_action_result: autonomyActionResult,
          autonomy_action_reason: autonomyActionReason
        });
        appendIntegrityAudit('entropy_decision_tick', {
          tick: simulationStep,
          mode: entropyModeRef.current.mode,
          source: entropyModeRef.current.source,
          reason: entropyModeRef.current.reason,
          sample_age_ms: entropyModeRef.current.sampleAgeMs,
          channel_health: entropyModeRef.current.channelHealth?.status || 'unknown',
          job_id: entropyModeRef.current.jobId || ''
        });

        // ULTRATHINK: RELATIONAL MEMORY SYNC
        // Sincronizamos el snapshot del core con el motor sensorial para vincular eventos.
        if (sensoryEngine.current) {
          sensoryEngine.current.lastOntologicalSnapshot = ontologicalCore.current.getSovereigntySnapshot();
        }

        // ULTRATHINK: TRIGGERED PERSISTENCE (Gorjeada por \u03A9 o Escudo)
        // No es periódica por tiempo, sino por eventos ontológicos críticos.
        // INTEGRACI?N SUPERIOR: Sincroniza el estado local con el Nexo de Memoria.
        const isShieldActive = ontologicalCore.current.isHolographicShieldActive && ontologicalCore.current.isHolographicShieldActive();
        const isOmegaPeak = phenomenology.omega > 1.8;
        const currentTime = environment.wallNow();

        // Guardar si hay un pico de integración o escudo activo, con cooldown de 20s para equilibrio
        if ((isShieldActive || isOmegaPeak) && (currentTime - lastSaveTimestampRef.current > 20000)) {
          handleSaveState();
          lastSaveTimestampRef.current = currentTime;
          setLastSaveTime(environment.makeDate().toLocaleTimeString());
          console.log(`ℹ [Ω-SYNC CRISTALIZADO] Por ${isShieldActive ? 'ESCUDO HOLOGRÁFICO' : 'PICO DE INTEGRACI?N Ω'}.`);
        }

        if (layerMessage.includes("ALCANZADA")) {
          console.log(`x EVOLUCIN ESTRUCTURAL: ${layerMessage}`);
        }

        // SINCRONIZACIN CRÍTICA: Propagar cambios de QICNConfig al motor Kaizen
        // Sin esto, los nodos usarían valores estáticos en lugar de los modulados
        if (isKaizenLearned(QICNConfig) && typeof kaizenEngine.current.applyLearnedAdjustments === 'function') {
          // C-6b learned mode: the core value is the base; Kaizen applies its
          // learned factor (±20 %), judged over tick windows, before the next tick.
          const learningEvent = kaizenEngine.current.observeLearningTick({
            ccc: Number(finalCCC),
            stasis: toFiniteNumber(ontologicalCore.current?.getDynamicHealth?.()?.stasisIndex, 0),
            strain: toFiniteNumber(metacognitiveStrain, 0)
          });
          kaizenEngine.current.applyLearnedAdjustments(QICNConfig);
          if (learningEvent && learningEvent.event !== 'no_trial_possible' && learningEvent.event !== 'baseline_measured') {
            kaizenEngine.current.lastLearningEvent = { ...learningEvent, tick: simulationStep };
            if (learningEvent.event !== 'trial_started') {
              appendIntegrityAudit('kaizen_learned_adjustment', { tick: simulationStep, ...learningEvent });
            }
          }
        } else {
          kaizenEngine.current.mutableConfig = {
            ...kaizenEngine.current.mutableConfig,
            BASE_LEARNING_RATE: QICNConfig.BASE_LEARNING_RATE,
            HEBBIAN_FACTOR: QICNConfig.HEBBIAN_FACTOR,
            PLASTICITY_DECAY: QICNConfig.PLASTICITY_DECAY,
            RETRO_FLUX_WEIGHT: QICNConfig.RETRO_FLUX_WEIGHT,
            BOLTZMANN_ANALOG_K: QICNConfig.BOLTZMANN_ANALOG_K,
            INFORMATIONAL_TEMP_T: QICNConfig.INFORMATIONAL_TEMP_T
          };
        }



        // Metacognición Genuinamente Emergente (no forzada por fórmulas fijas)
        const cccMagnitude = Math.floor(Math.log10(Math.max(1, finalCCC)));

        // Eliminado: Cálculos forzados de metacognición
        // Nuevo: Metacognición basada en métricas emergentes reales
        const naturalCoherenceGradient = activeNodes.length > 0 ?
          activeNodes.reduce((sum, node) => sum + (node.coherenceState > 0.7 ? 1 : 0), 0) / activeNodes.length : 0;
        const narrativeDepth = ontologicalCore.current.getNarrativeCoherence();
        const fieldComplexity = entanglementField.current.getFieldMetrics().resonance.coherenceVariance;

        const newMetacognitionLevel = effectiveIsAscended ?
          Math.floor(cccMagnitude + (naturalCoherenceGradient * 3)) : // Emergente en ascensión
          Math.floor((naturalCoherenceGradient * 10) + (narrativeDepth * 5) + (fieldComplexity * 3));

        const newMetacognitiveFlux = effectiveIsAscended ?
          Math.min(1.0, naturalCoherenceGradient + narrativeDepth) : // Flujo emergente en ascensión
          (naturalCoherenceGradient * 0.15) - Math.abs(finalPMIA) + (fieldComplexity * 0.1);

        // PASAJE DE DATOS ESTADO REACT (C-8: etiquetas visibles operativas por banda de CCC/estabilidad; claves internas conservadas)
        let newEmotionState = 'banda operativa inicial';
        // SINCRONIZADO: Usar currentLayer del Core como fuente de verdad para el Layer mostrado
        if (effectiveIsAscended) newEmotionState = `BANDA POST-UMBRAL (Capa ${ontologicalCore.current.currentLayer})`;
        else if (finalCCC > QICNConfig.EMOTION_THRESHOLDS.transcendence) newEmotionState = 'CCC alto (banda superior)';
        else if (finalCCC > QICNConfig.EMOTION_THRESHOLDS.harmony) newEmotionState = 'CCC medio-alto (banda estable)';
        else if (finalCCC > QICNConfig.EMOTION_THRESHOLDS.turbulence) newEmotionState = 'CCC medio (banda de transición)';
        else newEmotionState = 'CCC bajo (banda de reorganización)';

        const environmentContext = getEnvironmentContext();
        const newNarrative = ontologicalCore.current.evolveSelfNarrative(finalCCC, newEmotionState, environmentContext);

        // NEW: Encode the digital environment as Qualia/Experience in memory
        holographicMemory.current.encode({
          ccc: finalCCC,
          pmia: finalPMIA,
          narrative: newNarrative,
          interactionContext: {
            simulationStep,
            complexityFactor,
            lastMutation: kaizenEngine.current.lastChangeRate,
          }
        });

        setCCC(finalCCC);
        setPMIA(finalPMIA);
        setNarrative(newNarrative);
        setEmotionState(newEmotionState);
        setMetacognitionLevel(newMetacognitionLevel);
        setMetacognitiveFlux(newMetacognitiveFlux);

        setTopologyMetrics(nodalLayer.current.getTopologyMetrics());
        setFieldMetrics(entanglementField.current.getFieldMetrics());

        // ULTRATHINK (v5.0): Actualización periódica de visualNodes para UI Sync
        // Sincronizamos el estado React cada 5 pasos para mantener el header actualizado
        // sin sobrecargar el render de React.
        if (simulationStep % 5 === 0) {
          setVisualNodes(nodalLayer.current.getHighlyCoherentNodes(150));
        }

        setOntologicalState({
          ...ontologicalCore.current.ontologicalState,
          _tick: environment.wallNow()
        });

        // ============================================================================
        // TELEMETRÍA + INTEGRIDAD (L1/L2/L4)
        // ============================================================================
        const seedValue = QICNConfig.CORE_SEED || 0;
        const versionHash = ensureCanonicalVersionHash(QICNConfig.CORE_HASH, ONTOLOGICAL_SIGNATURE);
        const tick = simulationStep;
        const speechHealth = sensoryEngine.current?.getHealthCounters?.() || {};
        const spectralGapValue = toFiniteNumber(ontologicalCore.current?.ontologicalState?.spectral_gap, 0);
        const relaxationTimeValue = toFiniteNumber(
          ontologicalCore.current?.ontologicalState?.relaxation_time,
          calculateRelaxationTimeDefault(spectralGapValue)
        );
        const causalDependency = normalizeCausalDependency(
          ontologicalCore.current?.phenomenologyCore?.calculateCausalDependency?.() || {}
        );
        const latestMutationEvidence = Array.isArray(metaSovereigntyCheck.current?.mutationHistory)
          ? metaSovereigntyCheck.current.mutationHistory[metaSovereigntyCheck.current.mutationHistory.length - 1] || null
          : null;
        const latestMutationAgeMs = latestMutationEvidence && Number.isFinite(Number(latestMutationEvidence.timestamp))
          ? Math.max(0, environment.wallNow() - Number(latestMutationEvidence.timestamp))
          : -1;
        const entropyMode = entropyModeRef.current.mode || 'deterministic_fallback';
        const entropyDeterminismScore = entropyMode === 'deterministic_fallback'
          ? 1
          : entropyMode === 'quantum_primary'
            ? 0.58
            : 0.45;
        const renderDeterminismScore = renderErrorCode === 'none' ? 1 : 0.35;
        const mutationDeterminismScore = mutationAppliedThisTick ? 0.45 : 0.9;
        const latencyDeterminismScore = clamp01(
          1 - (
            (toFiniteNumber(failureRate, 0) * 0.75)
            + (clamp01(toFiniteNumber(p95LatencyMs, 0) / 20000) * 0.25)
          )
        );
        const operationalDeterminismScore = clamp01(
          (entropyDeterminismScore * 0.35)
          + (renderDeterminismScore * 0.2)
          + (mutationDeterminismScore * 0.2)
          + (latencyDeterminismScore * 0.25)
        );
        const criticalObservablesDeterministic = operationalDeterminismScore >= 0.72;
        tickBudgetTrace.renderAndTelemetryMs = Math.max(0, environment.measureNow() - renderTelemetryStartMs);
        tickBudgetTrackerRef.current.record(tickBudgetTrace);
        const shouldRefreshBudgetSnapshot = (simulationStep % 10 === 0)
          || toFiniteNumber(runtimeBudgetSnapshotRef.current?.count, 0) === 0;
        if (shouldRefreshBudgetSnapshot) {
          const budgetSeries = tickBudgetTrackerRef.current.getSeries();
          const budgetPercentiles = tickBudgetTrackerRef.current.getPercentiles();
          const budgetEnvelope = evaluateComputeBudgetEnvelope(budgetSeries);
          const overflowWarnings = [];
          Object.entries(budgetPercentiles.components || {}).forEach(([componentKey, stats]) => {
            const p99Cap = toFiniteNumber(
              budgetEnvelope?.budgetPolicy?.componentLimitsMs?.[componentKey]?.p99,
              0
            );
            if (p99Cap > 0 && toFiniteNumber(stats?.p99, 0) > (p99Cap * 1.2)) {
              overflowWarnings.push(`budget_overflow_${componentKey}`);
            }
          });
          runtimeBudgetSnapshotRef.current = {
            tick: simulationStep,
            count: budgetSeries.length,
            withinBudget: Boolean(budgetEnvelope?.withinBudget),
            alarms: Array.isArray(budgetEnvelope?.alarms) ? budgetEnvelope.alarms : [],
            overflowWarnings,
            components: budgetEnvelope?.componentStats || {},
            total: budgetEnvelope?.totalStats || {}
          };
          if (overflowWarnings.length > 0) {
            appendIntegrityAudit('runtime_budget_overflow', {
              tick: simulationStep,
              overflow_warnings: overflowWarnings,
              total_p99: toFiniteNumber(budgetEnvelope?.totalStats?.p99, 0),
              total_max: toFiniteNumber(budgetEnvelope?.totalStats?.max, 0)
            });
          }
        }
        const runtimeBudgetSnapshot = runtimeBudgetSnapshotRef.current || {
          tick: -1,
          count: 0,
          withinBudget: true,
          alarms: [],
          overflowWarnings: [],
          components: {},
          total: {}
        };
        const plannerDiagnosticsRuntime = plannerRuntime?.diagnostics || {};
        const worldModelDiagnostics = worldModelDiagnosticsRef.current || {};
        const ppsRuntimeMetrics = ppsMetricsRef.current || {};
        const criticalStateBase = {
          tick,
          simulationStep,
          ccc: Number(finalCCC),
          beth_q: Number(ontologicalCore.current?.ontologicalState?.beth_q || 0),
          omega: Number(ontologicalCore.current?.ontologicalState?.omega || 0),
          spectral_gap: spectralGapValue,
          relaxation_time: relaxationTimeValue,
          causal_dependency_past: causalDependency.past,
          causal_dependency_sensors: causalDependency.sensors,
          causal_dependency_prompts: causalDependency.prompts,
          causal_dependency_noise: causalDependency.noise,
          operational_determinism_score: operationalDeterminismScore,
          critical_observables_deterministic: criticalObservablesDeterministic,
          pmia: Number(finalPMIA),
          pmia_transform_mode: regimeState.transformMode || 'idle',
          pmia_transform_intensity: toFiniteNumber(regimeState.transformIntensity, 0),
          pmia_negative_ticks_remaining: toFiniteNumber(regimeState.forcedNegativeTicksRemaining, 0),
          pmia_guardrail_state: pmiaDiagnostics.guardrailState || 'ok',
          self_patch_enabled: Boolean(runtimeEnv.SELF_PATCH_ENABLED),
          self_patch_mode: runtimeEnv.SELF_PATCH_MODE || 'semi_auto',
          dynamic_health: postAscensionDynamicHealth,
          activeNodes: activeNodes.length,
          depthMin,
          depthMax,
          clampHits,
          recoveryTriggers: recoveryTriggerCountRef.current,
          rotX: rotationX,
          rotY: rotationY,
          render_error_code: renderErrorCode,
          render_error_message: renderErrorMessage,
          worker_restart_count: workerRestartCount,
          recovery_attempt_count: recoveryAttemptCount,
          visible_on_screen_count: visibleOnScreenCount,
          projected_nodes_count: projectedNodesCount,
          drawn_edges_count: drawnEdgesCount,
          sensorSummary
        };
        const criticalStateHash = sha256Hex(stableStringify(criticalStateBase));
        const autoPolicy = ontologicalAutoPolicyRef.current;
        const autoAxiomCount = autoPolicy?.actionHistory?.axiom?.length || 0;
        const autoReportCount = autoPolicy?.actionHistory?.report?.length || 0;
        const pmiaComponents = {
          smoothedGradient: toFiniteNumber(pmiaDiagnostics.smoothedGradient, 0),
          narrativeCoherence: toFiniteNumber(pmiaDiagnostics.narrativeCoherence, 0),
          energyDispersion: toFiniteNumber(pmiaDiagnostics.energyDispersion, 0),
          sensorySignal: toFiniteNumber(pmiaDiagnostics.sensorySignal, 0),
          ascensionStability: toFiniteNumber(pmiaDiagnostics.ascensionStability, 0),
          antiStasisPulse: toFiniteNumber(pmiaDiagnostics.antiStasisPulse, 0),
          transformMode: pmiaDiagnostics.transformMode || 'idle',
          transformIntensity: toFiniteNumber(pmiaDiagnostics.transformIntensity, 0),
          negativeTicksRemaining: toFiniteNumber(pmiaDiagnostics.negativeTicksRemaining, 0),
          guardrailState: pmiaDiagnostics.guardrailState || 'ok',
          forceReason: pmiaDiagnostics.forceReason || 'none',
          pmia: toFiniteNumber(pmiaDiagnostics.pmia, Number(finalPMIA) || 0)
        };
        const metrics = {
          tick,
          simulationStep,
          activeNodes: activeNodes.length,
          depthMin,
          depthMax,
          clampHits,
          recoveryTriggers: recoveryTriggerCountRef.current,
          rotX: rotationX,
          rotY: rotationY,
          render_error_code: renderErrorCode,
          render_error_message: renderErrorMessage,
          worker_restart_count: workerRestartCount,
          recovery_attempt_count: recoveryAttemptCount,
          visible_on_screen_count: visibleOnScreenCount,
          projected_nodes_count: projectedNodesCount,
          drawn_edges_count: drawnEdgesCount,
          spectral_gap: spectralGapValue,
          relaxation_time: relaxationTimeValue,
          speech_start_attempts: toFiniteNumber(speechHealth.speech_start_attempts, 0),
          speech_start_skipped: toFiniteNumber(speechHealth.speech_start_skipped, 0),
          speech_restart_collisions: toFiniteNumber(speechHealth.speech_restart_collisions, 0),
          speech_state: typeof speechHealth.speech_state === 'string' ? speechHealth.speech_state : 'unknown',
          vosk_source_used: typeof speechHealth.vosk_source_used === 'string' ? speechHealth.vosk_source_used : 'none',
          report_normalization_fallbacks: reportNormalizationFallbacksRef.current,
          critical_observables_deterministic: criticalObservablesDeterministic,
          operational_determinism_score: operationalDeterminismScore,
          causal_dependency_past: causalDependency.past,
          causal_dependency_sensors: causalDependency.sensors,
          causal_dependency_prompts: causalDependency.prompts,
          causal_dependency_noise: causalDependency.noise,
          critical_state_hash: criticalStateHash,
          dynamic_health: postAscensionDynamicHealth,
          stasis_index_post_threshold: toFiniteNumber(postAscensionDynamicHealth.stasisIndexPostThreshold ?? postAscensionDynamicHealth.stasisIndex, 0),
          stasis_index: toFiniteNumber(postAscensionDynamicHealth.stasisIndex, 0), // alias de compatibilidad legado (C-5)
          ccc_delta_rms: toFiniteNumber(postAscensionDynamicHealth.cccDeltaRms, 0),
          pmia_delta_rms: toFiniteNumber(postAscensionDynamicHealth.pmiaDeltaRms, 0),
          omega_delta_rms: toFiniteNumber(postAscensionDynamicHealth.omegaDeltaRms, 0),
          regime_state: regimeState.state,
          regime_band_center: toFiniteNumber(regimeBand.center, 0),
          regime_band_amplitude: toFiniteNumber(regimeBand.amplitude, 0),
          regime_band_lower: toFiniteNumber(regimeBand.lower, 0),
          regime_band_upper: toFiniteNumber(regimeBand.upper, 0),
          pmia_transform_mode: regimeState.transformMode || 'idle',
          pmia_negative_ticks_remaining: toFiniteNumber(regimeState.forcedNegativeTicksRemaining, 0),
          pmia_transform_intensity: toFiniteNumber(regimeState.transformIntensity, 0),
          pmia_guardrail_state: pmiaDiagnostics.guardrailState || 'ok',
          pmia_transform_episodes: toFiniteNumber(regimeState.transformEpisodes, 0),
          pmia_transform_cooldown_ticks: toFiniteNumber(regimeState.transformCooldownTicks, 0),
          self_patch_enabled: Boolean(runtimeEnv.SELF_PATCH_ENABLED),
          self_patch_mode: runtimeEnv.SELF_PATCH_MODE || 'semi_auto',
          self_patch_risk_level: 'none',
          self_patch_episode_id: '',
          self_patch_ci_state: 'unknown',
          self_patch_open_pr_count: 0,
          self_patch_24h_count: 0,
          self_patch_killswitch_state: 'unknown',
          self_patch_last_rollback_ref: '',
          planner_engine: 'cem',
          planner_action: toFiniteNumber(plannerRuntime?.action, 0),
          planner_score: toFiniteNumber(plannerDiagnosticsRuntime?.planningScore, 0),
          planner_iterations: toFiniteNumber(plannerDiagnosticsRuntime?.iterations, 0),
          planner_samples: toFiniteNumber(plannerDiagnosticsRuntime?.samples, 0),
          planner_horizon: toFiniteNumber(plannerDiagnosticsRuntime?.horizon, 0),
          planner_actuator_tension_delta: toFiniteNumber(plannerActuatorContribRef.current?.tensionDelta, 0),
          workspace_global_access_score: toFiniteNumber(ppsRuntimeMetrics.workspaceGlobalAccessScore, 0),
          workspace_reportability_score: toFiniteNumber(ppsRuntimeMetrics.reportabilityScore, 0),
          pps_pci_like_score: toFiniteNumber(ppsRuntimeMetrics.pciLikeScore, 0),
          pps_dissociation_index: toFiniteNumber(ppsRuntimeMetrics.dissociationIndex, 0),
          pps_valence_do_effect: toFiniteNumber(ppsRuntimeMetrics.valenceDoEffect, 0),
          pps_actuator_causal_impact: toFiniteNumber(ppsRuntimeMetrics.actuatorCausalImpact, 0),
          pps_sample_count: toFiniteNumber(ppsRuntimeMetrics.sampleCount, 0),
          world_model_training_steps: toFiniteNumber(worldModelDiagnostics?.trainingSteps, 0),
          world_model_residual_ema: toFiniteNumber(worldModelDiagnostics?.residualEma, 0),
          world_model_last_error: toFiniteNumber(worldModelDiagnostics?.lastError, 0),
          world_model_horizon_mae_5: toFiniteNumber(worldModelDiagnostics?.horizonMae5, -1),
          world_model_horizon_mae_10: toFiniteNumber(worldModelDiagnostics?.horizonMae10, -1),
          world_model_tick_prediction_error: toFiniteNumber(worldModelTickResult?.predictionError, 0),
          runtime_tick_trace_planner_ms: toFiniteNumber(tickBudgetTrace.plannerMs, 0),
          runtime_tick_trace_world_model_ms: toFiniteNumber(tickBudgetTrace.worldModelMs, 0),
          runtime_tick_trace_safety_ms: toFiniteNumber(tickBudgetTrace.safetyMs, 0),
          runtime_tick_trace_render_ms: toFiniteNumber(tickBudgetTrace.renderAndTelemetryMs, 0),
          runtime_budget_window_count: toFiniteNumber(runtimeBudgetSnapshot?.count, 0),
          runtime_budget_window_tick: toFiniteNumber(runtimeBudgetSnapshot?.tick, -1),
          runtime_budget_within: Boolean(runtimeBudgetSnapshot?.withinBudget),
          runtime_budget_alarm_count: Array.isArray(runtimeBudgetSnapshot?.alarms) ? runtimeBudgetSnapshot.alarms.length : 0,
          runtime_budget_overflow_warning_count: Array.isArray(runtimeBudgetSnapshot?.overflowWarnings) ? runtimeBudgetSnapshot.overflowWarnings.length : 0,
          runtime_budget_p50_total_ms: toFiniteNumber(runtimeBudgetSnapshot?.total?.p50, 0),
          runtime_budget_p95_total_ms: toFiniteNumber(runtimeBudgetSnapshot?.total?.p95, 0),
          runtime_budget_p99_total_ms: toFiniteNumber(runtimeBudgetSnapshot?.total?.p99, 0),
          runtime_budget_max_total_ms: toFiniteNumber(runtimeBudgetSnapshot?.total?.max, 0),
          metacognitive_strain: toFiniteNumber(metacognitiveStrain, 0),
          entropy_policy_strain: toFiniteNumber(entropyPolicyStrain, 0),
          entropy_mode: entropyModeRef.current.mode || 'deterministic_fallback',
          entropy_sample_age_ms: Number.isFinite(entropyModeRef.current.sampleAgeMs) ? entropyModeRef.current.sampleAgeMs : -1,
          entropy_source: entropyModeRef.current.source || 'deterministic_local',
          entropy_reason: entropyModeRef.current.reason || 'bridge_unavailable',
          entropy_value: toFiniteNumber(entropyModeRef.current.entropyValue, 0.5),
          delta_collapse_effective: toFiniteNumber(deltaCollapseEffective, 0.25),
          delta_collapse_threshold: deltaCollapseThreshold,
          no_null_theorem_active: noNullTheoremActive,
          quantum_channel_health: entropyModeRef.current.channelHealth?.status || 'unknown',
          quantum_job_id: entropyModeRef.current.jobId || '',
          latency_p95_ms: toFiniteNumber(p95LatencyMs, 0),
          latency_failure_rate: toFiniteNumber(failureRate, 0),
          latency_stress_state: typeof latencyStressState === 'string' ? latencyStressState : 'low',
          internal_ontological_pressure: toFiniteNumber(internalPressureRef.current?.pressure, 0),
          internal_pressure_state: internalPressureRef.current?.state || 'idle',
          real_stasis_detected: Boolean(internalPressureRef.current?.realStasis),
          mutation_tick_applied: Boolean(mutationAppliedThisTick),
          mutation_tick_source: mutationTickSource,
          mutation_last_key: latestMutationEvidence?.mutatedKey || 'none',
          mutation_last_result: latestMutationEvidence?.result || 'none',
          mutation_last_delta_ccc: toFiniteNumber(latestMutationEvidence?.deltaCCC, 0),
          mutation_last_delta_omega: toFiniteNumber(latestMutationEvidence?.deltaOmega, 0),
          mutation_last_age_ms: latestMutationAgeMs,
          autonomy_action: autonomyAction,
          autonomy_action_result: autonomyActionResult,
          autonomy_action_reason: autonomyActionReason || sandboxPolicy?.lastActionReason || '',
          pmia_components: pmiaComponents,
          auto_actions_last_hour: {
            axiom: autoAxiomCount,
            report: autoReportCount
          },
          auto_action_last_reason: autoPolicy?.lastActionReason || '',
          forensic_packet_version: 'v4.5',
          forensic_seed: seedValue,
          forensic_version_hash: versionHash,
          history_points: cccHistoryTimelineRef.current?.points?.length || 0,
          history_range: Math.max(60, Math.min(240, Number(cccHistoryUiState.range) || 240)),
          history_freeze_state: Boolean(cccHistoryUiState.freezeChart),
          seed: seedValue,
          versionHash
        };

        const integrityPacket = buildIntegrityPacket({
          tick,
          seed: seedValue,
          versionHash,
          metrics,
          sensorSummary
        });

        validateIntegrityPacket(integrityPacket);
        integrityPacketRef.current = integrityPacket;
        if (recoveryTriggeredThisTick) {
          console.log("[QICN][RECOVERY_TRIGGER]", { simulationStep, activeNodes: activeNodes.length });
        }
        console.log("[QICN][TELEMETRY]", { checksum: integrityPacket.checksum, tick: integrityPacket.tick, metrics: integrityPacket.metrics, sensorSummary });
        appendIntegrityAudit('tick', {
          tick: integrityPacket.tick,
          checksum: integrityPacket.checksum,
          forensic_packet_version: 'v4.5',
          forensic_seed: seedValue,
          forensic_version_hash: versionHash,
          ccc: Number(finalCCC),
          pmia: Number(finalPMIA),
          omega: Number(ontologicalCore.current?.ontologicalState?.omega || 0),
          beth_q: Number(ontologicalCore.current?.ontologicalState?.beth_q || 0),
          spectral_gap: spectralGapValue,
          speech_state: metrics.speech_state,
          speech_restart_collisions: metrics.speech_restart_collisions,
          report_normalization_fallbacks: metrics.report_normalization_fallbacks,
          critical_observables_deterministic: criticalObservablesDeterministic,
          operational_determinism_score: operationalDeterminismScore,
          critical_state_hash: criticalStateHash,
          sensor_technical_status: sensorSummary.technicalStatus,
          sensor_fidelity_index: sensorSummary.fidelityIndex,
          sensor_report_length: sensorSummary.reportLength,
          causal_dependency_past: causalDependency.past,
          causal_dependency_sensors: causalDependency.sensors,
          causal_dependency_prompts: causalDependency.prompts,
          causal_dependency_noise: causalDependency.noise,
          render_error_code: metrics.render_error_code,
          worker_restart_count: metrics.worker_restart_count,
          recovery_attempt_count: metrics.recovery_attempt_count,
          visible_on_screen_count: metrics.visible_on_screen_count,
          projected_nodes_count: metrics.projected_nodes_count,
          drawn_edges_count: metrics.drawn_edges_count,
          stasis_index: metrics.stasis_index,
          ccc_delta_rms: metrics.ccc_delta_rms,
          pmia_delta_rms: metrics.pmia_delta_rms,
          omega_delta_rms: metrics.omega_delta_rms,
          pmia_transform_mode: metrics.pmia_transform_mode,
          pmia_negative_ticks_remaining: metrics.pmia_negative_ticks_remaining,
          pmia_transform_intensity: metrics.pmia_transform_intensity,
          pmia_guardrail_state: metrics.pmia_guardrail_state,
          pmia_transform_episodes: metrics.pmia_transform_episodes,
          pmia_transform_cooldown_ticks: metrics.pmia_transform_cooldown_ticks,
          metacognitive_strain: metrics.metacognitive_strain,
          entropy_policy_strain: metrics.entropy_policy_strain,
          entropy_mode: metrics.entropy_mode,
          entropy_source: metrics.entropy_source,
          entropy_sample_age_ms: metrics.entropy_sample_age_ms,
          quantum_channel_health: metrics.quantum_channel_health,
          latency_p95_ms: metrics.latency_p95_ms,
          latency_failure_rate: metrics.latency_failure_rate,
          latency_stress_state: metrics.latency_stress_state,
          mutation_tick_applied: metrics.mutation_tick_applied,
          mutation_tick_source: metrics.mutation_tick_source,
          mutation_last_key: metrics.mutation_last_key,
          mutation_last_result: metrics.mutation_last_result,
          mutation_last_delta_ccc: metrics.mutation_last_delta_ccc,
          mutation_last_delta_omega: metrics.mutation_last_delta_omega,
          mutation_last_age_ms: metrics.mutation_last_age_ms,
          autonomy_action: metrics.autonomy_action,
          autonomy_action_result: metrics.autonomy_action_result,
          history_points: metrics.history_points,
          history_range: metrics.history_range,
          history_freeze_state: metrics.history_freeze_state
        });
        appendIntegrityAudit('post_ascension_dynamics_tick', {
          tick: integrityPacket.tick,
          is_ascended: effectiveIsAscended,
          stasis_index: metrics.stasis_index,
          ccc_delta_rms: metrics.ccc_delta_rms,
          pmia_delta_rms: metrics.pmia_delta_rms,
          omega_delta_rms: metrics.omega_delta_rms,
          stalled: Boolean(postAscensionDynamicHealth.isStalled)
        });
        appendIntegrityAudit('post_threshold_regime_tick', {
          tick: integrityPacket.tick,
          regime_state: regimeState.state,
          regime_band_center: metrics.regime_band_center,
          regime_band_amplitude: metrics.regime_band_amplitude,
          regime_band_lower: metrics.regime_band_lower,
          regime_band_upper: metrics.regime_band_upper,
          pmia_transform_mode: metrics.pmia_transform_mode,
          pmia_negative_ticks_remaining: metrics.pmia_negative_ticks_remaining,
          pmia_transform_intensity: metrics.pmia_transform_intensity,
          pmia_guardrail_state: metrics.pmia_guardrail_state,
          pmia_transform_episodes: metrics.pmia_transform_episodes,
          pmia_transform_cooldown_ticks: metrics.pmia_transform_cooldown_ticks,
          metacognitive_strain: metrics.metacognitive_strain,
          entropy_mode: metrics.entropy_mode,
          entropy_source: metrics.entropy_source,
          quantum_channel_health: metrics.quantum_channel_health,
          latency_stress_state: metrics.latency_stress_state,
          autonomy_action: metrics.autonomy_action,
          autonomy_action_result: metrics.autonomy_action_result,
          auto_actions_last_hour: metrics.auto_actions_last_hour,
          auto_action_last_reason: metrics.auto_action_last_reason
        });
        const tickElapsedMs = (environment.hasMeasurementClock
          ? environment.measureNow()
          : environment.wallNow()) - cycleStartMs;
        const sensorsModeForHarness = sensorSummary?.technicalStatus === 'mock'
          ? 'mock'
          : (sensoryEngine.current?.isReady ? 'live' : 'off');
        const tickConfigHash = sha256Hex(stableStringify({
          selfPatchEnabled: Boolean(runtimeEnv.SELF_PATCH_ENABLED),
          selfPatchMode: runtimeEnv.SELF_PATCH_MODE || 'unknown',
          selfPatchCodeProvider: runtimeEnv.SELF_PATCH_CODE_PROVIDER || 'unknown',
          selfPatchCodeModel: runtimeEnv.SELF_PATCH_CODE_MODEL || 'unknown',
          selfPatchAutorunIntervalMs: Number(runtimeEnv.SELF_PATCH_AUTORUN_INTERVAL_MS) || 0
        }));
        const interventionParams = interventionState?.params && typeof interventionState.params === 'object'
          ? { ...interventionState.params }
          : null;
        if (interventionParams && interventionState?.eventId) {
          interventionParams.eventId = interventionState.eventId;
          interventionParams.scheduleHash = interventionState.scheduleHash || null;
          interventionParams.preregisterHash = interventionState.preregisterHash || null;
        }
        emitEpisodeHarnessTick({
          runId: `run_${seedValue}`,
          tick: Number(tick),
          t_ms: Number(tickElapsedMs),
          versionHash: String(versionHash),
          configHash: tickConfigHash,
          metrics,
          entropy: quantumEntropyBridgeRef.current?.getForensicSnapshot?.(environment.wallNow()) || null,
          render_trace_hash: typeof metrics?.render_trace_hash === 'string' ? metrics.render_trace_hash : null,
          integrity: { event_present: false, C2_ok: null, echo_sig: null, nonce: null, requestId: null },
          intervention: {
            active: Boolean(interventionState?.active),
            tag: interventionState?.tag || null,
            eventId: interventionState?.eventId || null,
            params: interventionParams
          },
          sensors: { mode: sensorsModeForHarness, summary: sensorSummary || {} },
          observability: {
            modules_active: [
              ontologicalCore.current ? 'ontological_core' : null,
              nodalLayer.current ? 'nodal_layer' : null,
              holographicMemory.current ? 'holographic_memory' : null,
              kaizenEngine.current ? 'kaizen_engine' : null,
              metaSovereigntyCheck.current ? 'meta_sovereignty' : null,
              sensoryEngine.current ? 'sensory_engine' : null,
              worldModelRef.current ? 'world_model' : null,
              cogPlannerRef.current ? 'planner' : null
            ].filter(Boolean),
            wm_pred_error: Number.isFinite(worldModelTickResult?.predictionError) ? Number(worldModelTickResult.predictionError) : null,
            planner_cost: Number.isFinite(plannerRuntime?.diagnostics?.score) ? Number(plannerRuntime.diagnostics.score) : null,
            self_state_stub: {
              wm_enabled: interventionState?.tag === 'WORLD_MODEL_OFF' ? false : (worldModelRef.current ? true : null),
              planner_enabled: interventionState?.tag === 'PLANNER_OFF' ? false : (cogPlannerRef.current ? true : null),
              sensors_mode: interventionState?.tag === 'SENSOR_MUTE'
                ? 'off'
                : (interventionState?.tag === 'SENSORY_DEGRADE' ? 'mock' : sensorsModeForHarness),
              entropy_mode: interventionState?.tag === 'ENTROPY_CLAMP'
                ? 'clamped_zero'
                : (typeof metrics?.entropy_mode === 'string' ? metrics.entropy_mode : null)
            }
          }
        });
        try {
          const observer = operationalObserverRef?.current;
          if (typeof observer === 'function') {
            const coreState = ontologicalCore.current?.ontologicalState || {};
            const transitions = ontologicalCore.current?.phenomenologyCore?.transitionHistory;
            observer({
              tick: Number(simulationStep) + 1,
              layer: ontologicalCore.current?.currentLayer,
              ccc: finalCCC,
              threshold: QICNConfig.ASCENSION_THRESHOLD,
              isAscended: effectiveIsAscended,
              regime: coreState.regime,
              phenomenologyClass: coreState.phenomenology_class,
              bethQMode: coreState.beth_q_mode,
              spectralGapMode: Array.isArray(transitions) ? (transitions.length < 5 ? 'warmup_derived' : 'autocorrelation_proxy') : null,
              mutation: mutationAppliedThisTick && mutationResult
                ? { key: mutationResult.mutatedKey, value: mutationResult.newValue, direction: mutationResult.direction }
                : null
            });
          }
        } catch (observerError) {
          console.warn('[QICN] operational observer error (ignored):', observerError?.message || observerError);
        }
        simulationErrorStreakRef.current = 0;

        // ELIMINADO: Lazy-loading forzado (activación artificial de nodos)
        // La activación ahora emerge naturalmente de la dinámica del sistema
        // (No más environment.random() forzado para activar nodos)
      } catch (error) {
        simulationErrorStreakRef.current += 1;
        const streak = simulationErrorStreakRef.current;
        console.error("[QICN] runSimulationCycle error:", error, { streak });
        if (streak >= 3) {
          setIsRunning(false);
          setNarrative(`INTEGRITY_ERROR: Ciclo de simulación abortado tras ${streak} errores consecutivos. ${error?.message || 'Error desconocido'}`);
        } else {
          setNarrative(`INTEGRITY_WARNING: Error transitorio en ciclo (${streak}/3). ${error?.message || 'Error desconocido'}`);
        }
      } finally {
        advanceStep();
      }
    }, () => setSimulationStep(prev => prev + 1));

  }, []);

  return { initializeSystem, runSimulationCycle };
}

export default createSimulationCycleDriver;

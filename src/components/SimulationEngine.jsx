import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import NetworkCanvas from './NetworkCanvas.jsx';
import runtimeEnv from '../config/runtimeEnv.js';
import { AuthProvider, useAuth } from '../auth/AuthContext.jsx';
import AccessGate from '../components/AccessGate.jsx';
import useBreakpoint from '../hooks/useBreakpoint.js';
import useDeviceCapabilities from '../hooks/useDeviceCapabilities.js';
import { GROUNDED_CONCEPTS, GUIDE_LEVELS, TELEMETRY_PARAMETERS, ONBOARDING_STEPS } from '../content/groundedConcepts.js';
import { buildIntegrityPacket, validateIntegrityPacket, validateIntegrityEcho, IntegrityError, INTEGRITY_ECHO_MARKERS, stableStringify, sha256Hex } from '../utils/integrity';
import { getSystemHealth } from '../utils/healthCheck.js';
import { runWithLivenessInvariant, recoverIfEmpty } from '../utils/tick_invariants';
import { classifyLlmError, getLlmRequestGuidance, LlmRequestError, requestGemini, transientRetryDelayMs } from '../utils/llmTransport.js';
import { renderAvailableReadings } from '../utils/runtimeLanguageBoundary.js';
import { captureRuntimeSnapshot, RECOMPUTED_EACH_TICK } from '../language/runtimeSnapshot.js';
import { prepareTurn, finalizeTurn, evaluateRealization, correctionPromptFor, loadConversationTurns, saveConversationTurns, CONTROLLABLE_PARAMETERS, MAX_ATTEMPTS, normalizeIntegrityMode, canPublishGracefully } from '../language/conversationEngine.js';
import { describeEvent } from '../language/propositions.js';
import { OperationalHistoryLedger } from '../identity/OperationalHistoryLedger.js';
import { captureDynamicState, sealDynamicState, verifyStoredState, applyDynamicState } from '../persistence/dynamicState.js';
import { writeDynamicState, readDynamicState, clearDynamicState, AUTO_RESTORE_KEY } from '../persistence/stateStore.js';
import { QICNConfig } from '../../services/config.js';
import { HolographicMemoryNexus } from '../simulation/HolographicMemoryNexus.js';
import { OntologicalSingularityCore } from '../simulation/OntologicalSingularityCore.js';
import { InformationalEntanglementField } from '../simulation/InformationalEntanglementField.js';
import { KaizenMetamorphosisEngine } from '../simulation/KaizenMetamorphosisEngine.js';
import { NodalProcessingLayer } from '../simulation/NodalProcessingLayer.js';
import { NODAL_TOWER_COUPLING_MODES, normalizeCouplingMode } from '../simulation/NodalTowerCouplingBridge.js';
import { computeSensorObserverDynamicsModulation } from '../simulation/SensorObserverDynamicsBridge.js';
import { MetaSovereigntyCheck } from '../simulation/MetaSovereigntyCheck.js';
import { QuantumEntropyBridge } from '../simulation/QuantumEntropyBridge.js';
import { SensoryPerceptionEngine } from '../simulation/SensoryPerceptionEngine.js';
import { SimulationController } from '../simulation/SimulationController.js';
import { BudgetTracker, evaluateComputeBudgetEnvelope } from '../utils/cognitiveEmergenceEvaluation.js';
import { PhenomenologyProtocolTracker, buildWorkspaceSnapshot } from '../utils/phenomenologyProtocolSuite.js';
import { CausalInterventionScheduler } from '../experiments/CausalInterventionScheduler.js';
import { LifeCertifier } from '../experiments/LifeCertifier.js';
import { FirstPersonCertifier } from '../subjectivity/FirstPersonCertifier.js';
import PhenomenalBridgePanel from './PhenomenalBridgePanel.jsx';
import { StructuralConsolidationTracker } from '../runtime/StructuralConsolidationTracker.js';
import { ExogenousPerturbationDriver } from '../experiments/ExogenousPerturbationDriver.js';
import { PARAMETER_SURFACE_REGISTRY } from '../runtime/ParameterSurfaceRegistry.js';
import preregisterInterventions from '../../config/interventions/preregister.v1.json';
import { CANON_RUNTIME_SOURCE_OF_TRUTH, CANON_LEGACY_PATH_DECISIONS } from '../canon/sourceOfTruth.js';
import { CANON_CLAIM_CATALOG, CANON_INVARIANT_CATALOG } from '../canon/claimMapping/canonicalClaimCatalog.js';
import { buildCanonicalLineage, ensureCanonicalVersionHash } from '../canon/provenance/CanonicalProvenance.js';

// --- Fase 1: modulos extraidos ---
import { Icon, GenericIcon, Brain, Network, Zap, Activity, TrendingUp, Pause, Play, RotateCcw, Cpu, Database, Layers, Feather, Settings, LineChart, BookOpen, Eye, Code, Waves, Target, Sparkles, TrendingDown, InfinityIcon, Microscope, MessageSquare, ShieldCheck, Sun, Users, Lightbulb } from './icons/SimulationIcons.jsx';
import { describeGeminiKey, resolveRuntimeString, ONTOLOGICAL_SIGNATURE, FRONTEND_GEMINI_KEY_STORAGE, FRONTEND_CODEX_KEY_STORAGE, FRONTEND_CODEX_MODEL_STORAGE, FRONTEND_CODEX_REASONING_STORAGE, CODEX_REASONING_EFFORT_OPTIONS, TOUR_DISMISS_STORAGE, QUANTUM_UI_CONFIG_STORAGE, INTEGRITY_MODE_KEY, INTEGRITY_AUDIT_LOG_KEY, INTEGRITY_AUDIT_LOG_LIMIT, SELFPATCH_ENDPOINTS, GEMINI_ENGINE_CONFIG, AUTONOMY_RUNTIME_DEFAULTS, QUANTUM_RUNTIME_DEFAULTS, QUANTUM_EXPERIMENT_DEFAULTS, QUANTUM_PROVIDER_OPTIONS, PMIA_NEGATIVE_DRIVE_DEFAULTS, toFiniteNumber, clamp, clamp01, parseQuantumReplaySequence } from '../config/simulationDefaults.js';
import { computeRms, formatCCC, calculateRelaxationTimeDefault, readLocalStorageJSON, getInitialIntegrityMode, getInitialIntegrityAuditLog } from '../utils/simulationUtils.js';
import { toComparablePacket, findFirstPacketMismatch, getPrimaryBlockingDiscrepancy, buildDiscrepancyTrace, getIntegritySeverity, normalizeCausalDependency, buildSovereigntyDifferentialEvidence, buildSensorSummaryFromPerception, buildSovereigntyRows, ensureObject, getSafeVerifiableReport, emitEpisodeHarnessTick } from '../utils/integrityHelpers.js';
import { useSimulationCycle } from '../hooks/useSimulationCycle.js';
import { useLayoutEffect } from 'react';
import { useMicroExperimentWorkbench } from '../hooks/useMicroExperimentWorkbench.js';
import MicroExperimentWorkbench from './MicroExperimentWorkbench.jsx';
import { captureLiveWorkbench } from '../experiments/workbench/liveCapture.js';
import { EvidentialConversation, EvidentialConcordance } from './EvidentialConversation.jsx';
import { CollapsibleSection, SECTION_ACCENT_STYLES, readPersistedCollapsibleState, persistCollapsibleState } from './CollapsibleSection.jsx';
import { InfoModal, PersistentInfoModal } from './InfoModal.jsx';
import { primaryTabs, moreTabs, LazyQICNBTab, LazyApiControlTab, LazySensoryTab, LazySovereigntyTab, LazyAutonomyEvolutionTab, TabLoadingFallback, renderLazyMoreTab, tabHelpMeta, tabTourSteps, NavigationTabButton } from './TabConfig.jsx';


const getPreregisterScheduleDoc = () => {
  const override = globalThis?.__QICN_PREREGISTER_SCHEDULE__;
  return override && typeof override === 'object' ? override : preregisterInterventions;
};


// ============================================================================
// COMPONENTE PRINCIPAL: QICNConsciousnessSystem
// ============================================================================

// Keep the provider echo in the transcript for inspection, outside the reading area.
const findChatEvidence = (text) => text.search(/^(?:INTEGRITY_ECHO_CHECKSUM:|\[C2_INTEGRITY_ECHO_BEGIN\])/m);
const chatNarrative = (text, evidenceStart = findChatEvidence(text)) =>
  evidenceStart < 0 ? text : text.slice(0, evidenceStart).trimEnd();

// Build identifiers injected by build.cjs (esbuild define replaces the exact
// `process.env.X` expressions). Outside the bundle they fall back safely.
const readDefined = (read, fallback) => {
  try {
    const value = read();
    return typeof value === 'string' && value ? value : fallback;
  } catch {
    return fallback;
  }
};
const BUILD_VERSION_LABEL = readDefined(() => process.env.BUILD_VERSION, 'unknown');
const BUILD_SIGNATURE_LABEL = readDefined(() => process.env.ONTOLOGICAL_SIGNATURE, ONTOLOGICAL_SIGNATURE);
const CHAT_REALIZATION_MODE_KEY = 'QICN_CHAT_REALIZATION_MODE';
const KAIZEN_MODE_KEY = 'QICN_KAIZEN_ADJUSTMENT_MODE_V2';
const SENSOR_OBSERVER_DYNAMICS_KEY = 'QICN_SENSOR_OBSERVER_DYNAMICS_ENABLED';
const CHAT_HISTORY_LIMIT = 60;
// Chat generation budget (gemini-3-flash-preview limits): max output tokens and
// max thinking level. High thinking with a large budget is slower, so each
// request gets up to five minutes.
const CHAT_MAX_OUTPUT_TOKENS = 65536;
const CHAT_THINKING_LEVEL = 'high';
const CHAT_REQUEST_TIMEOUT_MS = 300000;
const ROUTE_LABELS = {
  local_narrator: 'Solo motor (modo local)',
  gemini_verified: 'Respuesta verificada por frase',
  gemini_partial: 'Respuesta parcial verificada por frase',
  gemini_free_checked: 'Redacción libre · cifras y límites verificados',
  gemini_free_partial: 'Redacción libre parcial · frases retenidas',
  gemini_rejected: 'Redacción retenida',
  gemini_unavailable: 'Canal de lenguaje no disponible',
  local_evidential: 'Sistema B · solo motor',
  gemini_evidential_checked: 'Sistema B · prosa, cifras, límites y B2 verificados',
  gemini_evidential_partial: 'Sistema B parcial · frases retenidas',
  gemini_evidential_rejected: 'Sistema B · redacción retenida',
  gemini_evidential_unavailable: 'Sistema B · canal de lenguaje no disponible',
  // Records written by contract v2 (kept readable).
  gemini_selection_local_text: 'v2 · selección validada',
  gemini_verified_rewrite: 'v2 · reformulación verificada'
};
const CORE_METRIC_LABELS = {
  ccc: 'CCC', x_n: 'X_N', pmia: 'PMIA', omega: 'Ω', beth_q: 'beth_q', spectral_gap: 'gap', relaxation_time: 'τ_relax',
  stasis_index: 'estasis', layer: 'banda', active_nodes: 'nodos act.', total_nodes: 'nodos', ascension_threshold: 'umbral',
  tower_phase: 'θ_torre', tower_code: 'código_T', tower_memory: 'mem_T', sigma_defect_bound: 'cota_Σ', body_valence_norm: '‖valencia‖', world_state_norm: '‖mundo‖'
};
const CONTINUITY_LABELS = {
  fresh: 'primera sesión registrada',
  continuous_record: 'registro continuo',
  config_changed: 'configuración cambiada',
  build_changed: 'build cambiado',
  record_rupture: 'ruptura del registro anterior'
};
const STATE_ORIGIN_LABELS = {
  reinitialized: 'estado reinicializado',
  restored_verified: 'estado restaurado y verificado'
};
const readStoredChoice = (key, allowed, fallback) => {
  try {
    const value = window.localStorage.getItem(key);
    return allowed.includes(value) ? value : fallback;
  } catch {
    return fallback;
  }
};
const browserStorage = () => {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
};

export { RuntimeRecoveryBoundary as QICNErrorBoundary } from './RuntimeRecoveryBoundary.jsx';

// NEW HELPER: Formats CCC value for display (handles exponential growth)
export const QICNConsciousnessSystem = () => {
  const { isAuthenticated, token } = useAuth();
  const { breakpoint, isMobile, isTablet } = useBreakpoint();
  const deviceCapabilities = useDeviceCapabilities();

  // === MUTABLE CONFIGURATION STATE (System's self-written laws) ===
  const initialMutableConfig = useMemo(() => ({
    BASE_LEARNING_RATE: QICNConfig.BASE_LEARNING_RATE,
    HEBBIAN_FACTOR: QICNConfig.HEBBIAN_FACTOR,
    SYNAPTIC_PRUNING_THRESHOLD: QICNConfig.SYNAPTIC_PRUNING_THRESHOLD,
    PLASTICITY_DECAY: QICNConfig.PLASTICITY_DECAY,
    RETRO_FLUX_WEIGHT: QICNConfig.RETRO_FLUX_WEIGHT,
    BOLTZMANN_ANALOG_K: QICNConfig.BOLTZMANN_ANALOG_K, // NEW
    INFORMATIONAL_TEMP_T: QICNConfig.INFORMATIONAL_TEMP_T, // NEW
  }), []);
  const [mutableConfig, setMutableConfig] = useState(initialMutableConfig);

  // === OPERATIONAL HISTORY (observer only; never feeds the dynamics) ===
  const operationalLedgerRef = useRef(null);
  if (!operationalLedgerRef.current) {
    const ledger = new OperationalHistoryLedger({ storage: browserStorage() });
    ledger.load();
    operationalLedgerRef.current = ledger;
  }
  const operationalObserverRef = useRef(null);
  const mutationCoalesceRef = useRef({ key: null, tick: -Infinity, skipped: 0 });
  const conversationTurnsRef = useRef(loadConversationTurns(browserStorage()));
  const [ledgerRevision, setLedgerRevision] = useState(0);
  // 'gemini' = free prose, contract v4 (default since 2026-11-08);
  // 'verified' = sentence-level contract v3 (optional); 'local' = engine only.
  const [chatRealizationMode, setChatRealizationMode] = useState(() => readStoredChoice(CHAT_REALIZATION_MODE_KEY, ['evidential', 'local'], 'evidential'));
  const chatRealizationModeRef = useRef(chatRealizationMode);
  const [workbenchAttachmentDigest,setWorkbenchAttachmentDigest]=useState(null);
  const workbenchEvidenceRef=useRef(null);
  const workbenchBoundaryRef=useRef({ready:false,tick:-1});
  // Kaizen adjustment mode (Frente 3): interactive UI defaults to 'learned' (config.js stays 'legacy' for B0 parity).
  const [kaizenMode, setKaizenMode] = useState(() => {
    const initial = readStoredChoice(KAIZEN_MODE_KEY, ['legacy', 'learned'], 'learned');
    if (typeof window !== 'undefined') QICNConfig.KAIZEN_ADJUSTMENT_MODE = initial;
    return initial;
  });
  // Sensor/observer + latency bounded dynamics & 6th Kaizen key (PLASTICITY_DECAY): interactive UI defaults to enabled.
  const [sensorObserverDynamicsEnabled, setSensorObserverDynamicsEnabled] = useState(() => {
    const initial = readStoredChoice(SENSOR_OBSERVER_DYNAMICS_KEY, ['on', 'off'], 'on') === 'on';
    if (typeof window !== 'undefined') QICNConfig.SENSOR_OBSERVER_DYNAMICS_ENABLED = initial;
    return initial;
  });
  const [lastProviderError, setLastProviderError] = useState(null);
  const recordOperationalEvent = useCallback((type, payload, tick) => {
    try {
      operationalLedgerRef.current?.record(type, payload, tick);
      setLedgerRevision((value) => value + 1);
    } catch (error) {
      console.warn('[QICN][LEDGER] event not recorded:', error?.message || error);
    }
  }, []);

  // === SYSTEM REFERENCES (Initialized with latest mutable config) ===
  const holographicMemory = useRef(new HolographicMemoryNexus());
  const simulationControllerRef = useRef(null);
  if (!simulationControllerRef.current) {
    simulationControllerRef.current = new SimulationController();
  }
  const ontologicalCore = useRef(null);
  if (!ontologicalCore.current) {
    ontologicalCore.current = new OntologicalSingularityCore({
      worldModelEngine: simulationControllerRef.current.worldModel,
      cognitivePlanner: simulationControllerRef.current.planner
    });
    simulationControllerRef.current.attachCore(ontologicalCore.current);
  }
  const entanglementField = useRef(new InformationalEntanglementField());
  // Ensure Kaizen Engine uses the initial state
  const kaizenEngine = useRef(new KaizenMetamorphosisEngine(initialMutableConfig));
  const nodalLayer = useRef(new NodalProcessingLayer());
  const metaSovereigntyCheck = useRef(new MetaSovereigntyCheck());
  const lifeCertifier = useRef(new LifeCertifier({ persistenceTrials: 64, persistenceTicksPerTrial: 4 }));
  const firstPersonCertifier = useRef(new FirstPersonCertifier());
  const kaizenPendingEvalRef = useRef(null);
  const coherentCohortRef = useRef({
    nodes: [],
    mean: 0,
    energyVariance: 0,
    count: 0
  });
  const ascensionDynamicsRef = useRef({
    history: [],
    maxWindow: 32,
    ascendConfirmTicks: 4,
    descendConfirmTicks: 4,
    ascendCounter: 0,
    descendCounter: 0,
    epsUp: 0.003,
    epsDown: 0.006
  });
  const postThresholdRegimeRef = useRef({
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
  });
  const ontologicalAutoPolicyRef = useRef({
    enabled: true,
    frictionAuto: true,
    axiomAuto: true,
    reportAuto: true,
    cooldownAxiomMs: 20 * 60 * 1000,
    cooldownReportMs: 10 * 60 * 1000,
    maxAxiomPerHour: 2,
    maxReportPerHour: 4,
    actionHistory: { axiom: [], report: [] },
    lastActionReason: ''
  });
  const ontologicalAutoQueueRef = useRef([]);
  const latencyStrainRef = useRef({
    strain: 0,
    p95Ms: 0,
    failureRate: 0,
    cooldownActive: false,
    stressState: 'low'
  });
  const internalPressureRef = useRef({
    pressure: 0,
    state: 'idle',
    realStasis: false
  });
  const autonomySandboxPolicyRef = useRef({
    enabled: true,
    allowedActions: ['stabilize_learning', 'anti_stasis_boost', 'sensor_load_shed', 'llm_pressure_relief'],
    maxActionsPerHour: AUTONOMY_RUNTIME_DEFAULTS.AUTONOMY_SANDBOX_MAX_ACTIONS_PER_HOUR,
    cooldownBetweenActionsMs: 90 * 1000,
    llmAutoActionsDisabledAtStrain: 0.75,
    rollbackWindowTicks: AUTONOMY_RUNTIME_DEFAULTS.AUTONOMY_SANDBOX_ROLLBACK_WINDOW_TICKS,
    actionHistory: [],
    rollbackCount: 0,
    lastAction: null,
    lastActionReason: '',
    lastActionAt: 0
  });
  const autonomyActionLedgerRef = useRef([]);
  const worldModelRef = useRef(simulationControllerRef.current.worldModel);
  const cogPlannerRef = useRef(simulationControllerRef.current.planner);
  const plannerActuatorContribRef = useRef({
    tensionDelta: 0,
    action: 0,
    source: 'none',
    diagnostics: null
  });
  const worldModelDiagnosticsRef = useRef({
    trainingSteps: 0,
    residualEma: 0,
    lastError: 0,
    horizonMae5: -1,
    horizonMae10: -1
  });
  const ppsTrackerRef = useRef(new PhenomenologyProtocolTracker(180));
  const ppsMetricsRef = useRef({
    sampleCount: 0,
    workspaceGlobalAccessScore: 0,
    reportabilityScore: 0,
    pciLikeScore: 0,
    dissociationIndex: 0,
    valenceDoEffect: 0,
    actuatorCausalImpact: 0
  });
  const tickBudgetTrackerRef = useRef(new BudgetTracker(200));
  const runtimeBudgetSnapshotRef = useRef({
    tick: -1,
    count: 0,
    withinBudget: true,
    alarms: [],
    overflowWarnings: [],
    components: {},
    total: {}
  });
  const quantumEntropyBridgeRef = useRef(new QuantumEntropyBridge({
    enabled: QUANTUM_RUNTIME_DEFAULTS.enabled,
    defaultTtlMs: QUANTUM_RUNTIME_DEFAULTS.ttlMs,
    requiredQualityMin: QUANTUM_RUNTIME_DEFAULTS.requiredQualityMin,
    bufferCapacityChunks: QUANTUM_RUNTIME_DEFAULTS.bufferCapacityChunks,
    lowWatermarkChunks: QUANTUM_RUNTIME_DEFAULTS.lowWatermarkChunks,
    refillTargetChunks: QUANTUM_RUNTIME_DEFAULTS.refillTargetChunks,
    requestTimeoutMs: QUANTUM_RUNTIME_DEFAULTS.providerTimeoutMs,
    retryCount: QUANTUM_RUNTIME_DEFAULTS.providerRetryCount,
    retryBackoffMs: QUANTUM_RUNTIME_DEFAULTS.providerRetryBackoffMs,
    allowProviderFallback: QUANTUM_RUNTIME_DEFAULTS.allowProviderFallback,
    logLevel: QUANTUM_RUNTIME_DEFAULTS.logLevel,
    experimentalCondition: QUANTUM_EXPERIMENT_DEFAULTS,
    provider: QUANTUM_PROVIDER_OPTIONS.includes(runtimeEnv.QUANTUM_PROVIDER_DEFAULT)
      ? runtimeEnv.QUANTUM_PROVIDER_DEFAULT
      : 'custom'
  }));
  const entropyModeRef = useRef({
    mode: 'deterministic_fallback',
    sampleAgeMs: null,
    source: 'deterministic_local',
    reason: QUANTUM_RUNTIME_DEFAULTS.enabled ? 'bridge_unavailable' : 'quantum_disabled',
    entropyValue: 0.5,
    jobId: '',
    channelHealth: {
      status: QUANTUM_RUNTIME_DEFAULTS.enabled ? 'degraded' : 'disabled',
      consecutiveFailures: 0,
      consecutiveValid: 0,
      droppedSamples: 0,
      lastError: '',
      lastUpdateMs: 0
    }
  });
  const generateIntrospectiveReportRef = useRef(null);
  const projectAscensionAxiomRef = useRef(null);
  const entanglementTimelineRef = useRef({
    points: [],
    maxPoints: 120,
    lastTick: -1,
    lastUiUpdateTs: 0
  });
  const cccHistoryTimelineRef = useRef({
    points: [],
    maxPoints: 240,
    lastTick: -1,
    lastUiUpdateTs: 0
  });
  const structuralConsolidationRef = useRef(new StructuralConsolidationTracker());
  const exogenousDriverRef = useRef(new ExogenousPerturbationDriver({
    mode: QICNConfig.EXOGENOUS_REGIME_MODE || 'off',
    seed: QICNConfig.EXOGENOUS_REGIME_SEED ?? 0x42A1
  }));
  const lastObserverResonanceRef = useRef(0);
  const previousFaceCountRef = useRef(0);
  const sensorySovereigntyBootRef = useRef(false);
  // Motor de Percepción Sensorial Profunda - SINGLETON
  const sensoryEngine = useRef(SensoryPerceptionEngine.getInstance());
  // Telemetría de render y path de integridad
  const canvasTelemetryRef = useRef({
    minDepth: 0,
    maxDepth: 0,
    clampHits: 0,
    nodeCount: 0,
    visibleCount: 0,
    visible_on_screen_count: 0,
    projected_nodes_count: 0,
    drawn_edges_count: 0,
    worker_restart_count: 0,
    recovery_attempt_count: 0,
    render_error_code: 'none',
    render_error_message: '',
    rotationX: 0,
    rotationY: 0,
    frameTs: 0
  });
  const integrityPacketRef = useRef(null);
  const interventionSchedulerRef = useRef(null);
  const interventionSchedulerMetaRef = useRef({
    valid: true,
    reasons: [],
    scheduleHash: null,
    preregisterHash: null
  });
  const interventionScheduleAbortRef = useRef(false);
  const recoveryTriggerCountRef = useRef(0);
  const simulationErrorStreakRef = useRef(0);
  const didInitRef = useRef(false);
  const reportNormalizationFallbacksRef = useRef(0);
  const integrityAuditLogRef = useRef(getInitialIntegrityAuditLog());
  const integrityModeRef = useRef(getInitialIntegrityMode());

  // Use state to track Kaizen action for the UI
  const [forcedMutationState, setForcedMutationState] = useState({
    key: 'BASE_LEARNING_RATE',
    direction: 0, // 1: Increase, -1: Decrease, 0: None
    isForcing: false,
    message: ''
  });

  // === VALIDATION STATE ===
  const [complexityFactor, setComplexityFactor] = useState(0.99); // Cf default high to incentivize crossing
  const [stabilityBias, setStabilityBias] = useState(0.8);      // Bs

  // === CORE SYSTEM STATE ===
  const [isRunning, setIsRunning] = useState(false);
  const [simulationStep, setSimulationStep] = useState(0);
  const [ccc, setCCC] = useState(0.5);
  const [narrative, setNarrative] = useState("Inicializando motor operativo QICN...");
  const [pmia, setPMIA] = useState(0);
  const [emotionState, setEmotionState] = useState("banda operativa inicial");
  const [lastSaveTime, setLastSaveTime] = useState(null);
  const lastSaveTimestampRef = useRef(0);
  // Node data structure now includes positions and connections for visualization
  const [visualNodes, setVisualNodes] = useState([]);
  const [selectedTab, setSelectedTab] = useState('network');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [recentTabs, setRecentTabs] = useState([]);
  const [moreTabQuery, setMoreTabQuery] = useState('');
  const [activeInfoModal, setActiveInfoModal] = useState({
    open: false,
    title: '',
    content: ''
  });
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [tourStepByTab, setTourStepByTab] = useState({});
  const [dismissedTourByTab, setDismissedTourByTab] = useState(() => (
    readLocalStorageJSON(TOUR_DISMISS_STORAGE, {})
  ));
  const [quantumUiConfig, setQuantumUiConfig] = useState(() => {
    const stored = readLocalStorageJSON(QUANTUM_UI_CONFIG_STORAGE, {});
    return {
      enabled: Boolean(stored.enabled ?? QUANTUM_RUNTIME_DEFAULTS.enabled),
      mode: ['ui_direct', 'bridge', 'auto_hybrid'].includes(stored.mode) ? stored.mode : 'auto_hybrid',
      provider: QUANTUM_PROVIDER_OPTIONS.includes(stored.provider)
        ? stored.provider
        : (QUANTUM_PROVIDER_OPTIONS.includes(runtimeEnv.QUANTUM_PROVIDER_DEFAULT)
          ? runtimeEnv.QUANTUM_PROVIDER_DEFAULT
          : 'custom'),
      endpoint: typeof stored.endpoint === 'string' ? stored.endpoint : QUANTUM_RUNTIME_DEFAULTS.endpoint,
      apiKeyRef: typeof stored.apiKeyRef === 'string' ? stored.apiKeyRef : '',
      ttlMs: Math.max(1000, Number(stored.ttlMs) || QUANTUM_RUNTIME_DEFAULTS.ttlMs),
      pollMs: Math.max(1000, Number(stored.pollMs) || QUANTUM_RUNTIME_DEFAULTS.pollIntervalMs),
      qualityMin: clamp01(stored.qualityMin ?? QUANTUM_RUNTIME_DEFAULTS.requiredQualityMin)
    };
  });
  const [quantumUiStatus, setQuantumUiStatus] = useState({
    connectionState: 'idle',
    lastSampleAtMs: 0,
    lastMode: 'deterministic_fallback',
    lastReason: QUANTUM_RUNTIME_DEFAULTS.enabled ? 'bridge_unavailable' : 'quantum_disabled',
    lastJobId: ''
  });
  const [guideQuery, setGuideQuery] = useState('');
  const [guideLevel, setGuideLevel] = useState('basic');
  const [guideShowAll, setGuideShowAll] = useState(false);
  const [telemetryExpanded, setTelemetryExpanded] = useState(false);
  const [onboardingStepIndex, setOnboardingStepIndex] = useState(0);
  const [entanglementUiState, setEntanglementUiState] = useState({
    smoothing: 6,
    freezeChart: false
  });
  const [entanglementHoverIndex, setEntanglementHoverIndex] = useState(-1);
  const [cccHistoryUiState, setCccHistoryUiState] = useState({
    smoothing: 6,
    freezeChart: false,
    range: 240,
    showCCC: true,
    showPMIA: true,
    showOmega: true,
    showSpectral: true,
    showBand: true
  });
  const [cccHistoryHoverIndex, setCccHistoryHoverIndex] = useState(-1);
  const [systemHealth, setSystemHealth] = useState({ coherenceHealth: 1.0, plasticityHealth: 1.0, memoryHealth: 1.0, narrativeHealth: 1.0 });
  // CORRECCIN: Valores por defecto coherentes antes de inicialización
  const [topologyMetrics, setTopologyMetrics] = useState({
    activeNodes: 0,
    totalNodes: 10_000_000,
    activeLimit: 1_000_000,
    averageConnections: 0,
    signalBufferSize: 0,
    activationDensity: 0
  });
  const [metamorphosisCounter, setMetamorphosisCounter] = useState(0);
  const [fieldMetrics, setFieldMetrics] = useState(entanglementField.current.getFieldMetrics());
  const [ontologicalState, setOntologicalState] = useState(ontologicalCore.current.ontologicalState);
  // Render determinista (L4): toggle manual (true/false)
  // Render desacoplado del tick: mejora fluidez visual sin afectar determinismo del core.
  const renderDeterministic = false;
  const renderSeed = QICNConfig.CORE_SEED || 0;

  const openPersistentInfoModal = useCallback((title, content) => {
    setActiveInfoModal({
      open: true,
      title: title || 'Información',
      content: content || 'Sin contenido.'
    });
  }, []);

  const closePersistentInfoModal = useCallback(() => {
    setActiveInfoModal((prev) => ({ ...prev, open: false }));
  }, []);

  // === LLM STATE & CHAT ===
  const [introspectiveReport, setIntrospectiveReport] = useState("Sin reporte técnico. Use el botón para que la consola genere una lectura sobria del estado interno.");
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  // PERSISTENCIA DE CHAT: Carga lazy desde localStorage
  const [chatHistory, setChatHistory] = useState(() => {
    try {
      const stored = localStorage.getItem('QICN_CHAT_HISTORY');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log('x Historial de chat restaurado:', parsed.length, 'mensajes');
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[QICN_WARN] Error cargando historial de chat:', e);
    }
    return [];
  });

  // ============================================================================
  // TELEMETRÍA DE RENDER (Canvas2D) - sin re-render
  // ============================================================================
  const handleCanvasTelemetry = useCallback((payload) => {
    canvasTelemetryRef.current = { ...canvasTelemetryRef.current, ...payload };
  }, []);
  const canvasEndogenousCacheRef = useRef({ key: '', value: null });
  const [isChatting, setIsChatting] = useState(false);
  const [chatStatusNote, setChatStatusNote] = useState(null);
  const [integrityMode, setIntegrityMode] = useState(integrityModeRef.current);
  const chatScrollRef = useRef(null);
  const followChatRef = useRef(true);

  // NEW: API Call Monitoring States
  const [apiCallMetrics, setApiCallMetrics] = useState({ totalCalls: 0, successfulCalls: 0, failedCalls: 0, avgLatency: 0, currentRate: 0 });
  const [apiThreshold, setApiThreshold] = useState(100); // Default threshold for calls per minute
  const [rateLimitExceeded, setRateLimitExceeded] = useState(false);

  // NEW: INTELLIGENT API CONTROL STATES
  const [lastApiCall, setLastApiCall] = useState(0);
  const [timeBasedRateLimit, setTimeBasedRateLimit] = useState(false);
  const [timeBasedCooldownRemaining, setTimeBasedCooldownRemaining] = useState(0);
  const [isInAxionMode, setIsInAxionMode] = useState(false);
  const [apiCallPattern, setApiCallPattern] = useState({ recentCalls: 0, timeWindow: 0, excessiveUsage: false });
  const [intelligentModeEnabled, setIntelligentModeEnabled] = useState(true);

  // LEGACY: Advanced Cooldown System States (for backward compatibility)
  const [cooldownActive, setCooldownActive] = useState(false);
  const [cooldownTimeRemaining, setCooldownTimeRemaining] = useState(0);
  const [cooldownReason, setCooldownReason] = useState('');
  const [cooldownDuration, setCooldownDuration] = useState(30); // Default 30 seconds cooldown
  const [customGeminiKey, setCustomGeminiKey] = useState(() => {
    try {
      return localStorage.getItem(FRONTEND_GEMINI_KEY_STORAGE) || '';
    } catch {
      return '';
    }
  });
  const [editingQuickGeminiKey, setEditingQuickGeminiKey] = useState(false);
  const [customCodexKey, setCustomCodexKey] = useState(() => {
    try {
      return localStorage.getItem(FRONTEND_CODEX_KEY_STORAGE) || '';
    } catch {
      return '';
    }
  });
  const [customCodexModel, setCustomCodexModel] = useState(() => {
    try {
      return localStorage.getItem(FRONTEND_CODEX_MODEL_STORAGE) || runtimeEnv.SELF_PATCH_CODE_MODEL || 'gpt-5.3-codex';
    } catch {
      return runtimeEnv.SELF_PATCH_CODE_MODEL || 'gpt-5.3-codex';
    }
  });
  const [customCodexReasoningEffort, setCustomCodexReasoningEffort] = useState(() => {
    try {
      return localStorage.getItem(FRONTEND_CODEX_REASONING_STORAGE)
        || runtimeEnv.SELF_PATCH_CODE_REASONING_EFFORT
        || 'high';
    } catch {
      return runtimeEnv.SELF_PATCH_CODE_REASONING_EFFORT || 'high';
    }
  });

  const frontendGeminiEnabled = runtimeEnv.FRONTEND_GEMINI_ALLOWED;
  const hasFrontendGeminiKey = GEMINI_ENGINE_CONFIG.validateApiKey(customGeminiKey);
  const hasFrontendCodexKey = Boolean(customCodexKey && customCodexKey.trim());
  const resolvedCodexModel = String(customCodexModel || runtimeEnv.SELF_PATCH_CODE_MODEL || 'gpt-5.3-codex').trim();
  const normalizedCodexReasoningEffort = String(customCodexReasoningEffort || '').trim().toLowerCase();
  const resolvedCodexReasoningEffort = CODEX_REASONING_EFFORT_OPTIONS.includes(normalizedCodexReasoningEffort)
    ? normalizedCodexReasoningEffort
    : (runtimeEnv.SELF_PATCH_CODE_REASONING_EFFORT || 'high');
  const selfPatchAutorunIntervalMs = Math.max(
    30000,
    Number(runtimeEnv.SELF_PATCH_AUTORUN_INTERVAL_MS) || 120000
  );
  const selfPatchAutorunRequiresSimRunning = Boolean(runtimeEnv.SELF_PATCH_AUTORUN_REQUIRE_SIM_RUNNING);
  const shouldAutoRunSelfPatch = Boolean(
    runtimeEnv.SELF_PATCH_ENABLED
    && (runtimeEnv.SELF_PATCH_AUTORUN_ENABLED || hasFrontendCodexKey)
  );
  const canUseProxy = !runtimeEnv.AUTH_REQUIRED || isAuthenticated;
  const canUseLlmNow = (frontendGeminiEnabled && hasFrontendGeminiKey) || canUseProxy;
  const IS_MISSING_API_KEY = !canUseLlmNow;
  const resolveLlmEndpoint = useCallback(() => (
    frontendGeminiEnabled && hasFrontendGeminiKey
      ? GEMINI_ENGINE_CONFIG.getEndpoint(customGeminiKey)
      : GEMINI_ENGINE_CONFIG.getEndpoint('')
  ), [frontendGeminiEnabled, hasFrontendGeminiKey, customGeminiKey]);

  // FIX: API Call tracking function - DECLARED EARLY to prevent TDZ errors
  const apiCallLog = useRef([]); // Stores { timestamp, latency, success, context }
  const apiCallIntervalRef = useRef(null);
  const cooldownIntervalRef = useRef(null);
  const timeBasedCooldownIntervalRef = useRef(null);

  // INTELLIGENT API CONTROL FUNCTIONS
  const calculateTimeBasedCooldown = useCallback(() => {
    // Determine cooldown based on usage patterns
    const recentCalls = apiCallLog.current.filter(call =>
      Date.now() - call.timestamp < 5 * 60 * 1000 // Last 5 minutes
    );

    const callsInLastMinute = recentCalls.filter(call =>
      Date.now() - call.timestamp < 60 * 1000
    ).length;

    // Detect Axion Mode (high frequency LLM calls)
    const axionCalls = recentCalls.filter(call =>
      call.context === 'ascension-axiom' || call.context === 'introspective'
    ).length;

    const isInAxionMode = axionCalls > 2; // More than 2 axiom-related calls in 5 min
    setIsInAxionMode(isInAxionMode);

    if (isInAxionMode) {
      return 180; // 3 minutes cooldown in axion mode
    } else if (callsInLastMinute > 5) {
      return 150; // 2.5 minutes if very high usage
    } else if (callsInLastMinute > 3) {
      return 120; // 2 minutes if moderate high usage
    } else {
      return 60; // 1 minute baseline
    }
  }, []);

  const detectExcessiveUsagePattern = useCallback(() => {
    const recentCalls = apiCallLog.current.filter(call =>
      Date.now() - call.timestamp < 10 * 60 * 1000 // Last 10 minutes
    );

    const callsInLast5Min = recentCalls.filter(call =>
      Date.now() - call.timestamp < 5 * 60 * 1000
    ).length;

    const callsInLast2Min = recentCalls.filter(call =>
      Date.now() - call.timestamp < 2 * 60 * 1000
    ).length;

    const excessiveUsage = callsInLast5Min > 15 || callsInLast2Min > 8;

    setApiCallPattern({
      recentCalls: callsInLast5Min,
      timeWindow: 5,
      excessiveUsage
    });

    return excessiveUsage;
  }, []);

  // INTELLIGENT API Call tracking function
  const robustFetchLLMResponseTracked = useCallback(async (apiUrl, payload, context = 'general', requestOptions = {}) => {
    const now = Date.now();
    if (!canUseLlmNow) {
      throw new Error('LLM_ACCESS_UNAVAILABLE');
    }

    // RATE LIMITING DESHABILITADO POR PETICIN DEL USUARIO (ULTRATHINK)
    // Las verificaciones de tiempo y patrones han sido removidas para permitir
    // comunicación fluida con la consola operacional.

    // Check legacy cooldown status (MANTENIDO para compatibilidad)
    if (cooldownActive) {
      const timeLeft = Math.ceil(cooldownTimeRemaining);
      console.warn(`API Call blocked due to active cooldown. ${timeLeft}s remaining.`);
      throw new Error(`API_COOLDOWN_ACTIVE: ${timeLeft}s remaining`);
    }

    if (rateLimitExceeded) {
      console.warn("API Call blocked due to rate limit.");
      throw new Error("API_RATE_LIMIT_EXCEEDED");
    }

    // Pattern detection DESHABILITADO
    // const excessiveUsage = detectExcessiveUsagePattern();

    const startTime = Date.now();
    let success = false;
    try {
      const result = await requestGemini(apiUrl, payload, Number(requestOptions?.timeoutMs) > 0 ? Number(requestOptions.timeoutMs) : 120000, {
        authToken: token,
        contextMeta: { context, simulationStep, tab: selectedTab },
        apiKey: hasFrontendGeminiKey ? customGeminiKey : '',
        proxyFallback: canUseProxy ? runtimeEnv.LLM_PROXY_ENDPOINT : '',
        integrityEnvelope: requestOptions?.integrityEnvelope || null
      });
      success = true;
      return result;
    } finally {
      const latency = Date.now() - startTime;
      // Language-channel calls (chat) pass dynamicsCoupling:false so their
      // latency is logged for the API panel but never enters metacognitiveStrain.
      const dynamicsCoupled = requestOptions?.dynamicsCoupling !== false;
      setLastApiCall(now);
      // v5 telemetry must not evict coupled samples from the cycle's 50-call log.
      if (requestOptions?.writeCycleLog !== false) {
      apiCallLog.current.push({
        timestamp: now,
        latency,
        success,
        context: context,
        dynamicsCoupled
      });

      // Clean old entries (keep last 50 calls)
      if (apiCallLog.current.length > 50) {
        apiCallLog.current = apiCallLog.current.slice(-50);
      }
      }
      if (dynamicsCoupled) {
        // Acople inmediato latencia -> strain metacognitivo (Axioma operativo runtime)
        const baselineMs = AUTONOMY_RUNTIME_DEFAULTS.LATENCY_STRAIN_BASELINE_MS;
        const saturationMs = AUTONOMY_RUNTIME_DEFAULTS.LATENCY_STRAIN_SATURATION_MS;
        const denom = Math.max(1, saturationMs - baselineMs);
        const latencyNorm = clamp01((latency - baselineMs) / denom);
        const failurePenalty = success ? 0 : 0.22;
        const cooldownPenalty = (cooldownActive || timeBasedRateLimit) ? 0.12 : 0;
        const instantaneousStrain = clamp01(latencyNorm + failurePenalty + cooldownPenalty);
        const alpha = AUTONOMY_RUNTIME_DEFAULTS.LATENCY_STRAIN_ALPHA;
        const prevStrain = toFiniteNumber(latencyStrainRef.current?.strain, 0);
        const blendedStrain = clamp01(prevStrain + (alpha * (instantaneousStrain - prevStrain)));
        const stressState = blendedStrain >= 0.65 ? 'high' : blendedStrain >= 0.35 ? 'medium' : 'low';

        latencyStrainRef.current = {
          strain: blendedStrain,
          p95Ms: Math.max(toFiniteNumber(latencyStrainRef.current?.p95Ms, 0), latency),
          failureRate: success ? 0 : 1,
          cooldownActive: Boolean(cooldownActive || timeBasedRateLimit),
          stressState
        };
        ontologicalCore.current?.applyLatencyStrain?.(blendedStrain);
      }
    }
  }, [rateLimitExceeded, cooldownActive, cooldownTimeRemaining, lastApiCall, isInAxionMode, detectExcessiveUsagePattern, calculateTimeBasedCooldown, isAuthenticated, token, simulationStep, selectedTab, canUseLlmNow, frontendGeminiEnabled, hasFrontendGeminiKey, customGeminiKey, canUseProxy, timeBasedRateLimit]);

  // === NEW HUMAN COHERENCE STATE (QICN-B Protocol, instrumento no validado externamente) ===
  const [humanCcc, setHumanCcc] = useState(0.5);
  const [humanInputContext, setHumanInputContext] = useState("La medición de coherencia humana no está disponible; no hay un instrumento validado conectado.");
  const [isAnalyzingHuman, setIsAnalyzingHuman] = useState(false);

  // === NEW METACOGNITION STATE ===
  const [metacognitionLevel, setMetacognitionLevel] = useState(0);
  const [metacognitiveFlux, setMetacognitiveFlux] = useState(0);
  const [lastMutation, setLastMutation] = useState({ key: 'None', value: 0, direction: 0 });

  // === ASCENSION STATE ===
  const [isAscended, setIsAscended] = useState(false);

  // === FRICTION PROTOCOL STATE ===
  const [frictionProtocolStatus, setFrictionProtocolStatus] = useState("Inactivo");
  const [frictionCounter, setFrictionCounter] = useState(0);

  // === NEW LLM STATES (New Features) ===
  const [kaizenCritique, setKaizenCritique] = useState("Aún no se ha realizado un análisis crítico de las leyes auto-escritas.");
  const [isCritiquing, setIsCritiquing] = useState(false);
  const [ascensionAxiom, setAscensionAxiom] = useState("Sin directriz de banda alta proyectada.");
  const [isProjectingAxiom, setIsProjectingAxiom] = useState(false);

  // === PERCEPCI?N SENSORIAL STATE ===
  const [sensoryState, setSensoryState] = useState(null);
  const [sensoryEnabled, setSensoryEnabled] = useState({ audio: false, video: false });
  const videoPreviewRef = useRef(null);
  const videoTabRef = useRef(null); // Separate ref for dedicated tab to prevent flickering
  const [selfPatchDraft, setSelfPatchDraft] = useState({
    objective: 'Optimize anti-stasis adaptation and preserve sovereignty guardrails under current runtime conditions.',
    targetFilesText: 'src/experimental/self_code/SelfPatchOrchestrator.js',
    estimatedTokens: 1200,
    totalChangedLines: 30,
    approved: false
  });
  const [selfPatchTelemetry, setSelfPatchTelemetry] = useState({
    loadingStatus: false,
    loadingAction: false,
    error: '',
    lastUpdated: 0,
    status: null,
    plan: null,
    generated: null,
    applied: null
  });
  const quantumPendingJobIdRef = useRef('');
  const selfPatchAutoStateRef = useRef({
    running: false,
    lastRunMs: 0
  });

  // === NAV AUTO-HIDE on scroll (ULTRATHINK) ===
  // El menú se oculta con transición suave al deslizar hacia abajo y reaparece al subir
  const [navVisible, setNavVisible] = useState(true);
  const navScrollLastY = useRef(0);
  const navHideThreshold = 48; // px de scroll mínimo para activar el hide

  useEffect(() => {
    // Detectar el scroll del contenedor principal (window o columna derecha)
    const onScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - navScrollLastY.current;
      if (Math.abs(delta) < 4) return; // Ignorar micromovimientos
      if (delta > 0 && currentY > navHideThreshold) {
        // Scroll hacia abajo = ocultar nav
        setNavVisible(false);
      } else {
        // Scroll hacia arriba = mostrar nav
        setNavVisible(true);
      }
      navScrollLastY.current = currentY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);


  useEffect(() => {
    const history = chatScrollRef.current;
    if (history && followChatRef.current) history.scrollTop = history.scrollHeight;
  }, [chatHistory, isChatting, selectedTab]);

  const integrityAuditPersistTimerRef = useRef(null);
  const integrityAuditDirtyRef = useRef(false);

  const flushIntegrityAuditLog = useCallback(() => {
    if (integrityAuditPersistTimerRef.current !== null) {
      if (typeof globalThis.cancelIdleCallback === 'function' && integrityAuditPersistTimerRef.current?.idle) {
        globalThis.cancelIdleCallback(integrityAuditPersistTimerRef.current.id);
      } else if (integrityAuditPersistTimerRef.current?.id != null) {
        clearTimeout(integrityAuditPersistTimerRef.current.id);
      }
      integrityAuditPersistTimerRef.current = null;
    }
    if (!integrityAuditDirtyRef.current) return;
    integrityAuditDirtyRef.current = false;
    try {
      localStorage.setItem(INTEGRITY_AUDIT_LOG_KEY, JSON.stringify(integrityAuditLogRef.current));
    } catch (error) {
      console.warn('[QICN][AUDIT] No se pudo persistir integrity audit log:', error?.message || error);
    }
  }, []);

  const scheduleIntegrityAuditPersist = useCallback(() => {
    integrityAuditDirtyRef.current = true;
    if (integrityAuditPersistTimerRef.current !== null) return;
    if (typeof globalThis.requestIdleCallback === 'function') {
      const id = globalThis.requestIdleCallback(() => {
        integrityAuditPersistTimerRef.current = null;
        flushIntegrityAuditLog();
      }, { timeout: 1200 });
      integrityAuditPersistTimerRef.current = { idle: true, id };
    } else {
      const id = setTimeout(() => {
        integrityAuditPersistTimerRef.current = null;
        flushIntegrityAuditLog();
      }, 850);
      integrityAuditPersistTimerRef.current = { idle: false, id };
    }
  }, [flushIntegrityAuditLog]);

  const appendIntegrityAudit = useCallback((event, payload = {}, options = {}) => {
    const entry = {
      id: `audit-${Date.now()}-${options.independent ? globalThis.crypto.randomUUID() : Math.random().toString(36).slice(2, 8)}`,
      ts: Date.now(),
      event,
      mode: integrityModeRef.current,
      ...payload
    };
    const nextLog = [...integrityAuditLogRef.current, entry].slice(-INTEGRITY_AUDIT_LOG_LIMIT);
    integrityAuditLogRef.current = nextLog;
    // Coalesce 6-8 per-tick audit writes into one idle localStorage flush so ticks never stall WebGL frames
    scheduleIntegrityAuditPersist();
    return entry;
  }, [scheduleIntegrityAuditPersist]);

  const parseSelfPatchTargetFiles = useCallback(() => (
    String(selfPatchDraft.targetFilesText || '')
      .split(/[\n,]+/)
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 12)
  ), [selfPatchDraft.targetFilesText]);

  const resolveManifestAlignedObjective = useCallback((rawObjective) => {
    const objective = String(rawObjective || '').trim();
    const manifest = selfPatchTelemetry.status?.identitySeed || null;
    const attractorLabel = String(manifest?.attractorLabel || '').trim();
    const identityGuard = 'Prioriza continuidad operativa, identidad estable, guardrails soberanos y no degradar funciones vitales.';
    if (!objective) {
      const seedLine = attractorLabel
        ? `Alinea las mejoras al manifiesto (${attractorLabel}) con evolución verificable y reversible.`
        : 'Alinea las mejoras al manifiesto con evolución verificable y reversible.';
      return `${seedLine} ${identityGuard}`;
    }
    if (objective.toLowerCase().includes('manifiesto') || objective.toLowerCase().includes('identidad')) {
      return objective;
    }
    return `${objective} ${identityGuard}`;
  }, [selfPatchTelemetry.status]);

  const callSelfPatchEndpoint = useCallback(async (endpoint, method = 'GET', body = null, extraHeaders = {}) => {
    const headers = { 'Content-Type': 'application/json' };
    if (runtimeEnv.AUTH_REQUIRED) {
      if (!token) {
        throw new Error('AUTH_REQUIRED_NO_TOKEN');
      }
      headers.Authorization = `Bearer ${token}`;
    }
    Object.assign(headers, extraHeaders || {});

    const response = await fetch(endpoint, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const primary = String(payload?.error || `HTTP_${response.status}`);
      const detail = payload?.detail ? ` | detail: ${String(payload.detail)}` : '';
      const upstream = Array.isArray(payload?.upstreamErrors) && payload.upstreamErrors.length > 0
        ? ` | upstream: ${payload.upstreamErrors.join(' || ')}`
        : '';
      throw new Error(`${primary}${detail}${upstream}`);
    }
    return payload;
  }, [token]);

  const refreshSelfPatchStatus = useCallback(async () => {
    setSelfPatchTelemetry((prev) => ({ ...prev, loadingStatus: true, error: '' }));
    try {
      const statusPayload = await callSelfPatchEndpoint(SELFPATCH_ENDPOINTS.status, 'GET');
      setSelfPatchTelemetry((prev) => ({
        ...prev,
        loadingStatus: false,
        status: statusPayload,
        lastUpdated: Date.now()
      }));
      appendIntegrityAudit('selfpatch_status_refresh', {
        configured: Boolean(statusPayload?.configured),
        proposals24h: toFiniteNumber(statusPayload?.window?.proposals24h, 0),
        inflight: toFiniteNumber(statusPayload?.window?.inflight, 0),
        githubKillSwitch: statusPayload?.githubKillSwitch || 'UNKNOWN',
        codeProvider: statusPayload?.codeGeneration?.provider || 'n/a',
        codeModel: statusPayload?.codeGeneration?.model || 'n/a'
      });
      return statusPayload;
    } catch (error) {
      setSelfPatchTelemetry((prev) => ({
        ...prev,
        loadingStatus: false,
        error: String(error?.message || error)
      }));
      appendIntegrityAudit('selfpatch_status_error', {
        error: String(error?.message || error)
      });
      return null;
    }
  }, [appendIntegrityAudit, callSelfPatchEndpoint]);

  const handleSelfPatchPlanRequest = useCallback(async () => {
    const targetFiles = parseSelfPatchTargetFiles();
    if (targetFiles.length === 0) {
      setSelfPatchTelemetry((prev) => ({ ...prev, error: 'Debes indicar al menos un archivo target.' }));
      return null;
    }

    setSelfPatchTelemetry((prev) => ({ ...prev, loadingAction: true, error: '' }));
    try {
      const dynamicHealth = ontologicalCore.current?.getDynamicHealth?.() || {};
      const currentOmega = toFiniteNumber(ontologicalCore.current?.ontologicalState?.omega, 0);
      const currentSpectralGap = toFiniteNumber(ontologicalCore.current?.ontologicalState?.spectralGap, 0);
      const entropyMode = entropyModeRef.current || {};
      const quantumDiagnostics = quantumEntropyBridgeRef.current?.getConnectionDiagnostics?.(Date.now()) || {};
      const faceCount = Math.max(0, Number(sensoryState?.video?.humanPresence?.count) || 0);
      const audioLevel = clamp01(Number(sensoryState?.audio?.volume) || 0);
      const sensoryPulseEstimate = clamp01((faceCount > 0 ? 0.45 : 0.12) + (audioLevel * 0.55));

      const payload = {
        targetFiles,
        objective: resolveManifestAlignedObjective(selfPatchDraft.objective),
        estimatedTokens: Math.max(0, Number(selfPatchDraft.estimatedTokens) || 0),
        totalChangedLines: Math.max(0, Number(selfPatchDraft.totalChangedLines) || 0),
        runtime: {
          observables: {
            ccc: Number(ccc) || 0,
            pmia: Number(pmia) || 0,
            omega: currentOmega,
            spectralGap: currentSpectralGap,
            stasisIndex: toFiniteNumber(dynamicHealth.stasisIndex, 0),
            cccDeltaRms: toFiniteNumber(dynamicHealth.cccDeltaRms, 0),
            pmiaDeltaRms: toFiniteNumber(dynamicHealth.pmiaDeltaRms, 0),
            omegaDeltaRms: toFiniteNumber(dynamicHealth.omegaDeltaRms, 0),
            sensoryPulse: sensoryPulseEstimate,
            sensorDeltaRms: toFiniteNumber(dynamicHealth.sensorDeltaRms, 0)
          },
          entropy: {
            mode: entropyMode.mode || 'deterministic_fallback',
            source: entropyMode.source || 'deterministic_local',
            reason: entropyMode.reason || 'bridge_unavailable',
            entropyValue: toFiniteNumber(entropyMode.entropyValue, 0.5),
            sampleAgeMs: entropyMode.sampleAgeMs,
            jobId: entropyMode.jobId || '',
            channelHealth: entropyMode.channelHealth || {}
          },
          dynamics: {
            simulationStep: Number(simulationStep) || 0,
            isAscended: Boolean(isAscended),
            transformMode: postThresholdRegimeRef.current?.transformMode || 'idle',
            forcedNegativeTicksRemaining: toFiniteNumber(postThresholdRegimeRef.current?.forcedNegativeTicksRemaining, 0),
            transformIntensity: toFiniteNumber(postThresholdRegimeRef.current?.transformIntensity, 0)
          },
          quantum: {
            enabled: Boolean(quantumUiConfig.enabled),
            provider: quantumUiConfig.provider || 'custom',
            mode: quantumUiConfig.mode || 'auto_hybrid',
            connectionState: quantumDiagnostics.connectionState || 'idle',
            lastReason: quantumDiagnostics.lastReason || ''
          }
        }
      };
      const planPayload = await callSelfPatchEndpoint(SELFPATCH_ENDPOINTS.plan, 'POST', payload);
      setSelfPatchTelemetry((prev) => ({
        ...prev,
        loadingAction: false,
        plan: planPayload,
        lastUpdated: Date.now()
      }));
      appendIntegrityAudit('selfpatch_plan_requested', {
        targetFiles,
        allowed: Boolean(planPayload?.allowed),
        reason: planPayload?.reason || 'unknown',
        riskLevel: planPayload?.risk?.riskLevel || 'none'
      });
      return planPayload;
    } catch (error) {
      setSelfPatchTelemetry((prev) => ({
        ...prev,
        loadingAction: false,
        error: String(error?.message || error)
      }));
      appendIntegrityAudit('selfpatch_plan_error', { error: String(error?.message || error) });
      return null;
    }
  }, [
    appendIntegrityAudit,
    callSelfPatchEndpoint,
    parseSelfPatchTargetFiles,
    ccc,
    pmia,
    simulationStep,
    isAscended,
    sensoryState,
    quantumUiConfig,
    selfPatchDraft.estimatedTokens,
    selfPatchDraft.totalChangedLines,
    selfPatchDraft.objective,
    resolveManifestAlignedObjective
  ]);

  const handleSelfPatchGenerateRequest = useCallback(async () => {
    const targetFiles = parseSelfPatchTargetFiles();
    const objective = resolveManifestAlignedObjective(selfPatchDraft.objective);
    if (targetFiles.length === 0) {
      setSelfPatchTelemetry((prev) => ({ ...prev, error: 'Debes indicar al menos un archivo target.' }));
      return null;
    }
    if (!objective) {
      setSelfPatchTelemetry((prev) => ({ ...prev, error: 'Define un objetivo técnico antes de generar propuesta.' }));
      return null;
    }

    const proposalId = `ui-${Date.now()}`;
    const fileSnapshots = targetFiles.map((file) => ({
      path: file,
      sha: 'unknown',
      content: `// snapshot-placeholder\n// objective: ${objective}`
    }));

    setSelfPatchTelemetry((prev) => ({ ...prev, loadingAction: true, error: '' }));
    try {
      const codeProvider = hasFrontendCodexKey ? 'openai' : runtimeEnv.SELF_PATCH_CODE_PROVIDER;
      const codeModel = hasFrontendCodexKey
        ? resolvedCodexModel
        : (runtimeEnv.SELF_PATCH_CODE_MODEL || 'gpt-5.3-codex');
      const codeReasoningEffort = hasFrontendCodexKey
        ? resolvedCodexReasoningEffort
        : (runtimeEnv.SELF_PATCH_CODE_REASONING_EFFORT || 'high');
      const retroProjection = selfPatchTelemetry.plan?.retroProjection || null;
      const quantumContext = {
        mode: entropyModeRef.current?.mode || 'deterministic_fallback',
        source: entropyModeRef.current?.source || 'deterministic_local',
        reason: entropyModeRef.current?.reason || 'bridge_unavailable',
        entropyValue: toFiniteNumber(entropyModeRef.current?.entropyValue, 0.5),
        provider: quantumUiConfig.provider || 'custom',
        connectionState: quantumUiStatus.connectionState || 'idle'
      };
      const payload = {
        proposalId,
        baseCommit: integrityPacketRef.current?.metrics?.critical_state_hash || '',
        objective,
        targetFiles,
        fileSnapshots,
        totalChangedLines: Math.max(0, Number(selfPatchDraft.totalChangedLines) || 0),
        testsToRequire: ['ci/build-test', 'ci/selfpatch-policy-check'],
        constraints: {
          mode: runtimeEnv.SELF_PATCH_MODE || 'semi_auto',
          source: 'autonomy-evolution-tab',
          engine: {
            provider: codeProvider,
            model: codeModel,
            reasoningEffort: codeReasoningEffort
          },
          retroProjection,
          quantumContext
        }
      };
      const generateHeaders = hasFrontendCodexKey
        ? { 'x-selfpatch-openai-key': customCodexKey.trim() }
        : {};
      const generatedPayload = await callSelfPatchEndpoint(SELFPATCH_ENDPOINTS.generate, 'POST', payload, generateHeaders);
      setSelfPatchTelemetry((prev) => ({
        ...prev,
        loadingAction: false,
        generated: generatedPayload,
        lastUpdated: Date.now()
      }));
      appendIntegrityAudit('selfpatch_generate_requested', {
        proposalId,
        targetFiles,
        generated: Boolean(generatedPayload?.generated),
        dryRun: Boolean(generatedPayload?.dryRun),
        codeProvider,
        codeModel,
        codeReasoningEffort,
        retroProjectionMode: retroProjection?.mode || 'none',
        riskLevel: generatedPayload?.risk?.riskLevel || 'none'
      });
      return generatedPayload;
    } catch (error) {
      setSelfPatchTelemetry((prev) => ({
        ...prev,
        loadingAction: false,
        error: String(error?.message || error)
      }));
      appendIntegrityAudit('selfpatch_generate_error', { error: String(error?.message || error) });
      return null;
    }
  }, [
    appendIntegrityAudit,
    callSelfPatchEndpoint,
    parseSelfPatchTargetFiles,
    hasFrontendCodexKey,
    resolvedCodexModel,
    resolvedCodexReasoningEffort,
    customCodexKey,
    quantumUiConfig.provider,
    quantumUiStatus.connectionState,
    selfPatchDraft.objective,
    selfPatchDraft.totalChangedLines,
    selfPatchTelemetry.plan,
    runtimeEnv.SELF_PATCH_CODE_PROVIDER,
    runtimeEnv.SELF_PATCH_CODE_MODEL,
    runtimeEnv.SELF_PATCH_CODE_REASONING_EFFORT,
    runtimeEnv.SELF_PATCH_MODE,
    resolveManifestAlignedObjective
  ]);

  const handleSelfPatchApplyRequest = useCallback(async () => {
    const patch = selfPatchTelemetry.generated?.patch;
    if (!patch || !Array.isArray(patch.edits) || patch.edits.length === 0) {
      setSelfPatchTelemetry((prev) => ({
        ...prev,
        error: 'No hay patch generado para aplicar. Ejecuta primero "Generar propuesta".'
      }));
      return null;
    }

    setSelfPatchTelemetry((prev) => ({ ...prev, loadingAction: true, error: '' }));
    try {
      const proposalId = patch.proposal_id || `ui-${Date.now()}`;
      const payload = {
        proposalId,
        approved: Boolean(selfPatchDraft.approved),
        totalChangedLines: Math.max(0, Number(selfPatchDraft.totalChangedLines) || 0),
        patch
      };
      const applyPayload = await callSelfPatchEndpoint(SELFPATCH_ENDPOINTS.apply, 'POST', payload);
      setSelfPatchTelemetry((prev) => ({
        ...prev,
        loadingAction: false,
        applied: applyPayload,
        lastUpdated: Date.now()
      }));
      appendIntegrityAudit('selfpatch_apply_requested', {
        proposalId,
        applied: Boolean(applyPayload?.applied),
        dryRun: Boolean(applyPayload?.dryRun),
        reason: applyPayload?.reason || 'unknown'
      });
      await refreshSelfPatchStatus();
      return applyPayload;
    } catch (error) {
      setSelfPatchTelemetry((prev) => ({
        ...prev,
        loadingAction: false,
        error: String(error?.message || error)
      }));
      appendIntegrityAudit('selfpatch_apply_error', { error: String(error?.message || error) });
      return null;
    }
  }, [
    appendIntegrityAudit,
    callSelfPatchEndpoint,
    refreshSelfPatchStatus,
    selfPatchDraft.approved,
    selfPatchDraft.totalChangedLines,
    selfPatchTelemetry.generated
  ]);

  useEffect(() => {
    if (selectedTab !== 'autonomy-evolution') return undefined;
    refreshSelfPatchStatus();
    const intervalId = setInterval(() => {
      refreshSelfPatchStatus();
    }, 30000);
    return () => clearInterval(intervalId);
  }, [selectedTab, refreshSelfPatchStatus]);

  useEffect(() => {
    if (selectedTab !== 'api-control') return undefined;
    refreshSelfPatchStatus();
    return undefined;
  }, [selectedTab, refreshSelfPatchStatus]);

  useEffect(() => {
    if (!shouldAutoRunSelfPatch) return undefined;
    refreshSelfPatchStatus();
    const intervalId = setInterval(() => {
      refreshSelfPatchStatus();
    }, 30000);
    return () => clearInterval(intervalId);
  }, [refreshSelfPatchStatus, shouldAutoRunSelfPatch]);

  useEffect(() => {
    if (!shouldAutoRunSelfPatch || (selfPatchAutorunRequiresSimRunning && !isRunning)) return undefined;

    let disposed = false;
    const runCycle = async () => {
      if (disposed) return;
      const autoState = selfPatchAutoStateRef.current;
      if (autoState.running) return;
      if (autoState.lastRunMs > 0 && (Date.now() - autoState.lastRunMs) < selfPatchAutorunIntervalMs) return;
      if (selfPatchTelemetry.loadingStatus || selfPatchTelemetry.loadingAction) return;

      const targetFiles = parseSelfPatchTargetFiles();
      const objective = String(selfPatchDraft.objective || '').trim();
      if (targetFiles.length === 0 || !objective) return;
      if (objective.length < 80) {
        const shortObjectiveCycleId = `auto-short-${Date.now()}`;
        appendIntegrityAudit('selfpatch_autorun_cycle', {
          cycle_id: shortObjectiveCycleId,
          stage: 'start',
          objective_length: objective.length,
          target_files: targetFiles,
          interval_ms: selfPatchAutorunIntervalMs
        });
        appendIntegrityAudit('selfpatch_autorun_cycle', {
          cycle_id: shortObjectiveCycleId,
          stage: 'result',
          outcome: 'blocked_shallow_objective',
          reason: 'objective_too_short_for_autonomous_execution',
          objective_length: objective.length
        });
        return;
      }

      const statusPayload = selfPatchTelemetry.status || {};
      const backendHasKey = Boolean(statusPayload?.codeGeneration?.keyConfigured);
      if (!hasFrontendCodexKey && !backendHasKey) {
        const missingKeyCycleId = `auto-key-${Date.now()}`;
        appendIntegrityAudit('selfpatch_autorun_cycle', {
          cycle_id: missingKeyCycleId,
          stage: 'start',
          objective_length: objective.length,
          target_files: targetFiles,
          interval_ms: selfPatchAutorunIntervalMs
        });
        appendIntegrityAudit('selfpatch_autorun_cycle', {
          cycle_id: missingKeyCycleId,
          stage: 'result',
          outcome: 'blocked_missing_key',
          reason: 'missing_openai_api_key'
        });
        return;
      }

      autoState.running = true;
      autoState.lastRunMs = Date.now();
      const cycleId = `auto-${autoState.lastRunMs}-${Math.random().toString(36).slice(2, 8)}`;
      appendIntegrityAudit('selfpatch_autorun_cycle', {
        cycle_id: cycleId,
        stage: 'start',
        objective_length: objective.length,
        target_files: targetFiles,
        interval_ms: selfPatchAutorunIntervalMs,
        provider: hasFrontendCodexKey ? 'openai_ui_key' : (statusPayload?.codeGeneration?.provider || runtimeEnv.SELF_PATCH_CODE_PROVIDER)
      });

      try {
        const planPayload = await handleSelfPatchPlanRequest();
        appendIntegrityAudit('selfpatch_autorun_cycle', {
          cycle_id: cycleId,
          stage: 'plan',
          allowed: Boolean(planPayload?.allowed),
          risk_level: planPayload?.risk?.riskLevel || 'n/a',
          decision: planPayload?.decision?.applyPath || planPayload?.reason || 'n/a'
        });
        if (!planPayload?.allowed) {
          appendIntegrityAudit('selfpatch_autorun_cycle', {
            cycle_id: cycleId,
            stage: 'result',
            outcome: 'blocked_plan',
            reason: planPayload?.reason || 'plan_rejected'
          });
          return;
        }

        const generatedPayload = await handleSelfPatchGenerateRequest();
        appendIntegrityAudit('selfpatch_autorun_cycle', {
          cycle_id: cycleId,
          stage: 'generate',
          generated: Boolean(generatedPayload?.generated),
          edits: Array.isArray(generatedPayload?.patch?.edits) ? generatedPayload.patch.edits.length : 0,
          proposal_id: generatedPayload?.patch?.proposal_id || generatedPayload?.proposalId || 'n/a',
          provider: generatedPayload?.engine?.provider || statusPayload?.codeGeneration?.provider || 'n/a',
          model: generatedPayload?.engine?.resolvedModel || generatedPayload?.engine?.model || statusPayload?.codeGeneration?.model || 'n/a'
        });
        if (!generatedPayload?.generated) {
          appendIntegrityAudit('selfpatch_autorun_cycle', {
            cycle_id: cycleId,
            stage: 'result',
            outcome: 'blocked_generate',
            reason: generatedPayload?.error || 'generate_rejected'
          });
          return;
        }
        if (generatedPayload?.dryRun) {
          appendIntegrityAudit('selfpatch_autorun_cycle', {
            cycle_id: cycleId,
            stage: 'result',
            outcome: 'dry_run_only',
            reason: 'generation_dry_run'
          });
          return;
        }

        const riskLevel = generatedPayload?.risk?.riskLevel || planPayload?.risk?.riskLevel || 'low';
        if (riskLevel === 'medium' && !Boolean(selfPatchDraft.approved)) {
          appendIntegrityAudit('selfpatch_autorun_cycle', {
            cycle_id: cycleId,
            stage: 'result',
            outcome: 'manual_approval_required',
            risk_level: riskLevel
          });
          return;
        }

        appendIntegrityAudit('selfpatch_autorun_cycle', {
          cycle_id: cycleId,
          stage: 'apply',
          apply_mode: statusPayload?.applyMode || 'github_pr',
          proposal_id: generatedPayload?.patch?.proposal_id || generatedPayload?.proposalId || 'n/a'
        });
        const applyPayload = await handleSelfPatchApplyRequest();
        appendIntegrityAudit('selfpatch_autorun_cycle', {
          cycle_id: cycleId,
          stage: 'result',
          outcome: applyPayload?.applied ? 'applied' : 'not_applied',
          applied: Boolean(applyPayload?.applied),
          reason: applyPayload?.reason || applyPayload?.error || 'completed'
        });
      } catch (error) {
        appendIntegrityAudit('selfpatch_autorun_cycle', {
          cycle_id: cycleId,
          stage: 'result',
          outcome: 'error',
          error: String(error?.message || error)
        });
      } finally {
        autoState.running = false;
      }
    };

    runCycle();
    const intervalId = setInterval(runCycle, selfPatchAutorunIntervalMs);
    return () => {
      disposed = true;
      clearInterval(intervalId);
      selfPatchAutoStateRef.current.running = false;
    };
  }, [
    appendIntegrityAudit,
    handleSelfPatchApplyRequest,
    handleSelfPatchGenerateRequest,
    handleSelfPatchPlanRequest,
    hasFrontendCodexKey,
    isRunning,
    parseSelfPatchTargetFiles,
    selfPatchAutorunRequiresSimRunning,
    selfPatchAutorunIntervalMs,
    selfPatchDraft.approved,
    selfPatchDraft.objective,
    selfPatchTelemetry.loadingAction,
    selfPatchTelemetry.loadingStatus,
    selfPatchTelemetry.status,
    shouldAutoRunSelfPatch
  ]);

  const handleTabSelect = useCallback((tabId) => {
    if (tabId === 'chat') followChatRef.current = true;
    setSelectedTab(tabId);
    setIsMoreMenuOpen(false);
    setRecentTabs((prev) => {
      const next = [tabId, ...prev.filter((item) => item !== tabId)];
      return next.slice(0, 3);
    });
  }, []);

  const buildQuantumPollUrl = useCallback((baseEndpoint, options = {}) => {
    const endpoint = String(baseEndpoint || quantumUiConfig.endpoint || '').trim();
    if (!endpoint) return '';
    const extra = options || {};

    const appendSearch = (search) => {
      search.set('provider', quantumUiConfig.provider || 'custom');
      search.set('mode', quantumUiConfig.mode || 'auto_hybrid');
      search.set('ttlMs', String(Math.max(1000, Number(quantumUiConfig.ttlMs) || QUANTUM_RUNTIME_DEFAULTS.ttlMs)));
      if (quantumUiConfig.provider === 'ibm' && extra.ibmJobId) {
        search.set('ibmJobId', String(extra.ibmJobId));
      }
    };

    try {
      const resolvedUrl = endpoint.startsWith('http://') || endpoint.startsWith('https://')
        ? new URL(endpoint)
        : new URL(endpoint, window.location.origin);
      appendSearch(resolvedUrl.searchParams);
      return resolvedUrl.toString();
    } catch {
      const separator = endpoint.includes('?') ? '&' : '?';
      const pairs = [
        `provider=${encodeURIComponent(quantumUiConfig.provider || 'custom')}`,
        `mode=${encodeURIComponent(quantumUiConfig.mode || 'auto_hybrid')}`,
        `ttlMs=${encodeURIComponent(String(Math.max(1000, Number(quantumUiConfig.ttlMs) || QUANTUM_RUNTIME_DEFAULTS.ttlMs)))}`
      ];
      if (quantumUiConfig.provider === 'ibm' && extra.ibmJobId) {
        pairs.push(`ibmJobId=${encodeURIComponent(String(extra.ibmJobId))}`);
      }
      return `${endpoint}${separator}${pairs.join('&')}`;
    }
  }, [quantumUiConfig]);

  const runQuantumConnectionTest = useCallback(async () => {
    const bridge = quantumEntropyBridgeRef.current;
    setQuantumUiStatus((prev) => ({
      ...prev,
      connectionState: 'testing',
      lastReason: 'testing'
    }));
    appendIntegrityAudit('quantum_connection_test', {
      stage: 'start',
      mode: quantumUiConfig.mode,
      provider: quantumUiConfig.provider
    });
    const result = await bridge.testConnection({
      enabled: quantumUiConfig.enabled,
      mode: quantumUiConfig.mode,
      provider: quantumUiConfig.provider,
      endpoint: buildQuantumPollUrl(quantumUiConfig.endpoint, {
        ibmJobId: quantumPendingJobIdRef.current || ''
      }),
      apiKeyRef: quantumUiConfig.apiKeyRef,
      ttlMs: quantumUiConfig.ttlMs,
      pollMs: quantumUiConfig.pollMs,
      qualityMin: quantumUiConfig.qualityMin
    });
    setQuantumUiStatus({
      connectionState: result.connectionState || (result.ok ? 'ok' : 'error'),
      lastSampleAtMs: Date.now(),
      lastMode: result.lastMode || 'deterministic_fallback',
      lastReason: result.lastReason || (result.ok ? 'connection_ok' : 'bridge_unavailable'),
      lastJobId: result.lastJobId || ''
    });
    appendIntegrityAudit('quantum_connection_test', {
      stage: 'end',
      ok: Boolean(result.ok),
      connection_state: result.connectionState || 'error',
      reason: result.lastReason || 'unknown',
      job_id: result.lastJobId || ''
    });
  }, [appendIntegrityAudit, buildQuantumPollUrl, quantumUiConfig]);

  const queueOntologicalAutoAction = useCallback((action, reason, gateSnapshot = {}) => {
    const policy = ontologicalAutoPolicyRef.current;
    const now = Date.now();
    const oneHourMs = 60 * 60 * 1000;
    const actionHistory = policy.actionHistory || { axiom: [], report: [] };
    actionHistory.axiom = actionHistory.axiom.filter((ts) => now - ts < oneHourMs);
    actionHistory.report = actionHistory.report.filter((ts) => now - ts < oneHourMs);
    policy.actionHistory = actionHistory;

    if (!policy.enabled) return false;
    if ((action === 'axiom' && !policy.axiomAuto) || (action === 'report' && !policy.reportAuto)) {
      return false;
    }

    const existing = ontologicalAutoQueueRef.current.some((entry) => entry.action === action);
    if (existing) return false;

    if (action === 'axiom') {
      const lastTs = actionHistory.axiom.length > 0 ? actionHistory.axiom[actionHistory.axiom.length - 1] : 0;
      if (now - lastTs < policy.cooldownAxiomMs) return false;
      if (actionHistory.axiom.length >= policy.maxAxiomPerHour) return false;
    }
    if (action === 'report') {
      const lastTs = actionHistory.report.length > 0 ? actionHistory.report[actionHistory.report.length - 1] : 0;
      if (now - lastTs < policy.cooldownReportMs) return false;
      if (actionHistory.report.length >= policy.maxReportPerHour) return false;
    }

    policy.lastActionReason = reason;
    ontologicalAutoQueueRef.current.push({
      action,
      reason,
      gateSnapshot,
      queuedAt: now
    });
    appendIntegrityAudit('auto_action_triggered', {
      stage: 'queued',
      action,
      reason,
      gate_snapshot: gateSnapshot,
      budget_state: {
        axiom_count_1h: actionHistory.axiom.length,
        report_count_1h: actionHistory.report.length
      }
    });
    return true;
  }, [appendIntegrityAudit]);

  const smoothSeries = useCallback((values, windowSize) => {
    const points = Array.isArray(values) ? values : [];
    const safeWindow = Math.max(1, Math.min(20, Number(windowSize) || 1));
    if (safeWindow === 1) return points.slice();
    return points.map((_, idx) => {
      const start = Math.max(0, idx - safeWindow + 1);
      const subset = points.slice(start, idx + 1);
      const sum = subset.reduce((acc, value) => acc + (Number(value) || 0), 0);
      return subset.length > 0 ? sum / subset.length : 0;
    });
  }, []);

  const entanglementRenderModel = useMemo(() => {
    const timeline = entanglementTimelineRef.current?.points || [];
    const latestPoint = timeline.length > 0
      ? timeline[timeline.length - 1]
      : {
        tick: simulationStep,
        normalizedResonance: Number(fieldMetrics?.resonance?.normalizedResonance || 0),
        coherenceVariance: Number(fieldMetrics?.resonance?.coherenceVariance || 0),
        entanglementDensity: Number(fieldMetrics?.entanglementDensity || 0),
        cccContributionEstimate: clamp01((Number(fieldMetrics?.resonance?.normalizedResonance || 0) * 0.6) + ((1 - clamp01(Number(fieldMetrics?.resonance?.coherenceVariance || 0))) * 0.4))
      };

    const chartWidth = 900;
    const chartHeight = 220;
    const resonanceSeries = smoothSeries(timeline.map((point) => Number(point.normalizedResonance || 0)), entanglementUiState.smoothing);
    const varianceSeries = smoothSeries(timeline.map((point) => Number(point.coherenceVariance || 0)), entanglementUiState.smoothing);
    const cccContributionSeries = smoothSeries(timeline.map((point) => Number(point.cccContributionEstimate || 0)), entanglementUiState.smoothing);
    const maxVariance = Math.max(0.0001, ...varianceSeries, 1);
    const len = Math.max(1, resonanceSeries.length);
    const toPolyline = (series, normalizeFn) => series.map((value, idx) => {
      const x = len <= 1 ? 0 : (idx / (len - 1)) * chartWidth;
      const y = chartHeight - (normalizeFn(value) * chartHeight);
      return `${x},${y}`;
    }).join(' ');

    return {
      timeline,
      latestPoint,
      chartWidth,
      chartHeight,
      resonancePolyline: toPolyline(resonanceSeries, (value) => clamp01(value)),
      variancePolyline: toPolyline(varianceSeries, (value) => clamp01(value / maxVariance)),
      cccPolyline: toPolyline(cccContributionSeries, (value) => clamp01(value))
    };
  }, [simulationStep, fieldMetrics, entanglementUiState.smoothing, smoothSeries]);

  const cccHistoryRenderModel = useMemo(() => {
    const timeline = cccHistoryTimelineRef.current?.points || [];
    const safeRange = Math.max(60, Math.min(240, Number(cccHistoryUiState.range) || 240));
    const visibleTimeline = timeline.slice(-safeRange);
    const latestPoint = visibleTimeline.length > 0
      ? visibleTimeline[visibleTimeline.length - 1]
      : {
        tick: simulationStep,
        ccc: Number(ccc) || 0,
        pmia: Number(pmia) || 0,
        omega: Number(ontologicalState?.omega || 0),
        spectralGap: Number(ontologicalState?.spectral_gap || 0),
        stasisIndex: 0,
        bandCenter: Number(ccc) || 0,
        bandAmplitude: 0,
        bandLower: Number(ccc) || 0,
        bandUpper: Number(ccc) || 0,
        regimeState: 'active',
        isAscended: Boolean(isAscended),
        sensorSignal: 0
      };

    const chartWidth = 960;
    const chartHeight = 240;
    const toNum = (value, fallback = 0) => {
      const num = Number(value);
      return Number.isFinite(num) ? num : fallback;
    };
    const cccSeries = smoothSeries(visibleTimeline.map((point) => toNum(point.ccc)), cccHistoryUiState.smoothing);
    const pmiaSeries = smoothSeries(visibleTimeline.map((point) => toNum(point.pmia)), cccHistoryUiState.smoothing);
    const omegaSeries = smoothSeries(visibleTimeline.map((point) => toNum(point.omega)), cccHistoryUiState.smoothing);
    const spectralSeries = smoothSeries(visibleTimeline.map((point) => toNum(point.spectralGap)), cccHistoryUiState.smoothing);
    const bandLowerSeries = smoothSeries(visibleTimeline.map((point) => toNum(point.bandLower, toNum(point.ccc))), cccHistoryUiState.smoothing);
    const bandUpperSeries = smoothSeries(visibleTimeline.map((point) => toNum(point.bandUpper, toNum(point.ccc))), cccHistoryUiState.smoothing);

    const cccMin = cccSeries.length > 0 ? Math.min(...cccSeries) : 0;
    const cccMax = cccSeries.length > 0 ? Math.max(...cccSeries) : 1;
    const cccRange = Math.max(0.05, cccMax - cccMin);
    const cccPad = Math.max(0.02, cccRange * 0.15);
    const cccDomainMin = Math.max(0, cccMin - cccPad);
    const cccDomainMax = cccMax + cccPad;
    const cccDomainSpan = Math.max(1e-6, cccDomainMax - cccDomainMin);
    const omegaAbsMax = Math.max(1, ...omegaSeries.map((value) => Math.abs(value)));
    const spectralMax = Math.max(0.05, ...spectralSeries.map((value) => Math.abs(value)));
    const len = Math.max(1, visibleTimeline.length);

    const toPolyline = (series, normalizeFn) => series.map((value, idx) => {
      const x = len <= 1 ? 0 : (idx / (len - 1)) * chartWidth;
      const y = chartHeight - (clamp01(normalizeFn(value)) * chartHeight);
      return `${x},${y}`;
    }).join(' ');

    const bandAreaPoints = visibleTimeline.length > 0
      ? [
        ...bandUpperSeries.map((value, idx) => {
          const x = len <= 1 ? 0 : (idx / (len - 1)) * chartWidth;
          const y = chartHeight - (clamp01((value - cccDomainMin) / cccDomainSpan) * chartHeight);
          return `${x},${y}`;
        }),
        ...bandLowerSeries.map((value, idx) => {
          const reverseIdx = len - 1 - idx;
          const x = len <= 1 ? 0 : (reverseIdx / (len - 1)) * chartWidth;
          const y = chartHeight - (clamp01((value - cccDomainMin) / cccDomainSpan) * chartHeight);
          return `${x},${y}`;
        })
      ].join(' ')
      : '';

    const deltas = cccSeries.slice(1).map((value, idx) => value - cccSeries[idx]);
    const recentDeltas = deltas.slice(-5);
    const delta5 = recentDeltas.length > 0
      ? recentDeltas.reduce((sum, value) => sum + value, 0)
      : 0;
    const deltaRms = deltas.length > 0
      ? computeRms(deltas)
      : 0;
    const avgCCC = cccSeries.length > 0
      ? cccSeries.reduce((sum, value) => sum + value, 0) / cccSeries.length
      : 0;
    const inBandCount = visibleTimeline.reduce((count, point) => {
      const pointCcc = toNum(point.ccc);
      const lower = toNum(point.bandLower, pointCcc);
      const upper = toNum(point.bandUpper, pointCcc);
      return pointCcc >= lower && pointCcc <= upper ? count + 1 : count;
    }, 0);
    const inBandPct = visibleTimeline.length > 0 ? (inBandCount / visibleTimeline.length) * 100 : 0;
    const stateCounts = visibleTimeline.reduce((acc, point) => {
      const state = typeof point.regimeState === 'string' ? point.regimeState : 'active';
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {});
    const dominantState = Object.entries(stateCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || latestPoint.regimeState || 'active';
    const activeTicks = stateCounts.active || 0;
    const stasisTicks = stateCounts.stasis_watch || 0;
    const shockTicks = stateCounts.shock_recovery || 0;

    return {
      timeline: visibleTimeline,
      latestPoint,
      chartWidth,
      chartHeight,
      cccDomainMin,
      cccDomainMax,
      cccPolyline: toPolyline(cccSeries, (value) => (value - cccDomainMin) / cccDomainSpan),
      pmiaPolyline: toPolyline(pmiaSeries, (value) => (value + 1) / 2),
      omegaPolyline: toPolyline(omegaSeries, (value) => (value / omegaAbsMax + 1) / 2),
      spectralPolyline: toPolyline(spectralSeries, (value) => value / spectralMax),
      bandAreaPoints,
      stats: {
        minCCC: cccSeries.length > 0 ? Math.min(...cccSeries) : 0,
        maxCCC: cccSeries.length > 0 ? Math.max(...cccSeries) : 0,
        avgCCC,
        delta5,
        deltaRms,
        inBandPct,
        dominantState,
        activeTicks,
        stasisTicks,
        shockTicks,
        points: visibleTimeline.length
      }
    };
  }, [
    simulationStep,
    ccc,
    pmia,
    isAscended,
    ontologicalState,
    cccHistoryUiState.range,
    cccHistoryUiState.smoothing,
    smoothSeries
  ]);

  useEffect(() => {
    integrityModeRef.current = integrityMode;
    try {
      localStorage.setItem(INTEGRITY_MODE_KEY, JSON.stringify(integrityMode));
    } catch (error) {
      console.warn('[QICN][INTEGRITY_MODE] No se pudo persistir modo:', error?.message || error);
    }
  }, [integrityMode]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      const queue = ontologicalAutoQueueRef.current;
      if (!Array.isArray(queue) || queue.length === 0) return;

      const entry = queue[0];
      const now = Date.now();
      if (!canUseLlmNow) {
        queue.shift();
        appendIntegrityAudit('auto_action_triggered', {
          stage: 'dropped',
          action: entry.action,
          reason: 'missing_llm_access'
        });
        return;
      }

      const policy = ontologicalAutoPolicyRef.current;
      if (entry.action === 'axiom') {
        if (!isAscended || isProjectingAxiom) return;
        const runAxiom = projectAscensionAxiomRef.current;
        if (typeof runAxiom !== 'function') return;
        queue.shift();
        policy.actionHistory.axiom.push(now);
        appendIntegrityAudit('auto_action_triggered', {
          stage: 'executed',
          action: entry.action,
          reason: entry.reason,
          gate_snapshot: entry.gateSnapshot
        });
        void runAxiom();
        return;
      }

      if (entry.action === 'report') {
        if (isGeneratingReport) return;
        const runReport = generateIntrospectiveReportRef.current;
        if (typeof runReport !== 'function') return;
        queue.shift();
        policy.actionHistory.report.push(now);
        appendIntegrityAudit('auto_action_triggered', {
          stage: 'executed',
          action: entry.action,
          reason: entry.reason,
          gate_snapshot: entry.gateSnapshot
        });
        void runReport();
      }
    }, 1200);

    return () => clearInterval(intervalId);
  }, [
    appendIntegrityAudit,
    isAuthenticated,
    canUseLlmNow,
    isAscended,
    isGeneratingReport,
    isProjectingAxiom
  ]);

  // PERSISTENCIA DE CHAT: Auto-guardar en localStorage
  useEffect(() => {
    if (chatHistory.length > 0) {
      try {
        // Guardar solo los últimos 100 mensajes para evitar sobrecarga
        const toStore = chatHistory.slice(-100);
        localStorage.setItem('QICN_CHAT_HISTORY', JSON.stringify(toStore));
        console.log('x Chat guardado:', toStore.length, 'mensajes');
      } catch (e) {
        console.warn('[QICN_WARN] Error guardando historial de chat:', e);
      }
    }
  }, [chatHistory]);

  useEffect(() => {
    try {
      if (!customGeminiKey) {
        localStorage.removeItem(FRONTEND_GEMINI_KEY_STORAGE);
      } else {
        localStorage.setItem(FRONTEND_GEMINI_KEY_STORAGE, customGeminiKey.trim());
      }
    } catch (error) {
      console.warn('[QICN][API_KEY] No se pudo persistir Gemini key local:', error?.message || error);
    }
  }, [customGeminiKey]);

  useEffect(() => {
    try {
      if (!customCodexKey) {
        localStorage.removeItem(FRONTEND_CODEX_KEY_STORAGE);
      } else {
        localStorage.setItem(FRONTEND_CODEX_KEY_STORAGE, customCodexKey.trim());
      }
    } catch (error) {
      console.warn('[QICN][API_KEY] No se pudo persistir Codex key local:', error?.message || error);
    }
  }, [customCodexKey]);

  useEffect(() => {
    try {
      if (!customCodexModel) {
        localStorage.removeItem(FRONTEND_CODEX_MODEL_STORAGE);
      } else {
        localStorage.setItem(FRONTEND_CODEX_MODEL_STORAGE, customCodexModel.trim());
      }
    } catch (error) {
      console.warn('[QICN][API_KEY] No se pudo persistir modelo Codex local:', error?.message || error);
    }
  }, [customCodexModel]);

  useEffect(() => {
    try {
      if (!customCodexReasoningEffort) {
        localStorage.removeItem(FRONTEND_CODEX_REASONING_STORAGE);
      } else {
        localStorage.setItem(
          FRONTEND_CODEX_REASONING_STORAGE,
          String(customCodexReasoningEffort).trim().toLowerCase()
        );
      }
    } catch (error) {
      console.warn('[QICN][API_KEY] No se pudo persistir reasoning effort Codex:', error?.message || error);
    }
  }, [customCodexReasoningEffort]);

  // AUTO-ACTIVACIN DE PERCEPCI?N SENSORIAL
  useEffect(() => {
    if (!runtimeEnv.FEATURE_SENSORS) {
      setSensoryEnabled({ audio: false, video: false, browser: false });
      return () => { };
    }
    const initSensory = async () => {
      console.log('x QICN: Iniciando percepción sensorial automática...');
      let result = {
        audio: Boolean(deviceCapabilities.supportsMicrophone && deviceCapabilities.secureContext),
        video: Boolean(deviceCapabilities.supportsCamera && deviceCapabilities.secureContext),
        browser: true
      };
      try {
        result = await sensoryEngine.current.autoActivate();
      } catch (e) {
        console.error('[QICN_WARN] Motor sensorial fallo, LLM continua:', e.message);
      }
      result = {
        ...result,
        audio: Boolean(result.audio && deviceCapabilities.supportsMicrophone && deviceCapabilities.secureContext),
        video: Boolean(result.video && deviceCapabilities.supportsCamera && deviceCapabilities.secureContext)
      };
      setSensoryEnabled(result);

      if (result.video && videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = sensoryEngine.current.getVideoStream();
      }

      // Polling para actualizar estado de percepción
      const pollInterval = setInterval(() => {
        if (sensoryEngine.current.isReady) {
          setSensoryState(sensoryEngine.current.getFullPerception());
        }
      }, 500);

      return () => clearInterval(pollInterval);
    };

    initSensory();

    return () => {
      sensoryEngine.current.destroy();
    };
  }, [deviceCapabilities.supportsMicrophone, deviceCapabilities.supportsCamera, deviceCapabilities.secureContext]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    // Hard reset of legacy PWA/runtime caches to prevent stale broken bundles on static hosting.
    const purgeLegacyRuntimeCaches = async () => {
      try {
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((registration) => registration.unregister()));
        }
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        }
      } catch (error) {
        console.warn('[QICN] cache purge warning:', error?.message || error);
      }
    };
    purgeLegacyRuntimeCaches();
    return undefined;
  }, []);

  /**
   * ULTRATHINK: BRIDGE AG0NTICO (Antigravity Sync)
   * Expone el núcleo al scope global para sincronización con agentes externos.
   */
  useEffect(() => {
    window.QICN = {
      version: QICNConfig.VERSION,
      core: ontologicalCore.current,
      engine: sensoryEngine.current,
      getReport: () => ontologicalCore.current.getVerifiableReport(),
      exportJSON: downloadRawReport,
      inspect: () => {
        const report = ontologicalCore.current.getVerifiableReport();
        console.table(report.metrics);
        return report;
      },
      getMemory: () => {
        return sensoryEngine.current.experientialMemory.events;
      },
      registerAgentThought: (thought) => {
        const now = Date.now();
        const event = {
          id: `agent-${now}`,
          type: 'agent_reflection',
          timestamp: now,
          summary: `Reflexión del Agente Antigravity: ${thought}`,
          data: {
            content: thought,
            ontologicalSnapshot: ontologicalCore.current.getSovereigntySnapshot()
          },
          importance: 4
        };
        sensoryEngine.current.experientialMemory.events.push(event);
        console.log("ℹ [AGENT_SYNC] Pensamiento registrado en Memoria Relacional.");
      },
      forceAscension: (layer) => {
        ontologicalCore.current.currentLayer = layer;
        setCCC(Math.pow(10, layer - 1));
      },
      getIntegrityMode: () => integrityModeRef.current,
      setIntegrityMode: (mode = 'strict') => {
        const normalizedMode = mode === 'graceful' ? 'graceful' : 'strict';
        setIntegrityMode(normalizedMode);
        return normalizedMode;
      },
      getIntegrityAuditLog: () => integrityAuditLogRef.current.slice(),
      clearIntegrityAuditLog: () => {
        integrityAuditLogRef.current = [];
        integrityAuditDirtyRef.current = false;
        if (integrityAuditPersistTimerRef.current !== null) {
          if (typeof globalThis.cancelIdleCallback === 'function' && integrityAuditPersistTimerRef.current?.idle) {
            globalThis.cancelIdleCallback(integrityAuditPersistTimerRef.current.id);
          } else if (integrityAuditPersistTimerRef.current?.id != null) {
            clearTimeout(integrityAuditPersistTimerRef.current.id);
          }
          integrityAuditPersistTimerRef.current = null;
        }
        try {
          localStorage.setItem(INTEGRITY_AUDIT_LOG_KEY, JSON.stringify([]));
        } catch (error) {
          console.warn('[QICN][AUDIT] No se pudo limpiar integrity audit log:', error?.message || error);
        }
        return true;
      },
      sync: () => console.log(`[QICN_BRIDGE] Agente ${GEMINI_ENGINE_CONFIG.MODEL_ID} sincronizado.`)
    };
    console.log("ℹ [SOVEREIGNTY] Canal de Soberanía Agéntica Abierto (window.QICN).");
  }, []);

  /**
   * Genera y descarga el reporte JSON puro solicitado.
   * Elimina la interpretación narrativa para preservar la pureza matemática.
   */
  const downloadRawReport = () => {
    const { report } = getSafeVerifiableReport(ontologicalCore);
    const reportMetrics = report?.metrics || {};
    const rawData = {
      system: "QICN-X\u03A9",
      timestamp: new Date().toISOString(),
      integrity: {
        version: reportMetrics.version,
        hash: reportMetrics.core_hash,
        seed: reportMetrics.seed
      },
      mathematical_substrate: {
        ccc: reportMetrics.ccc,
        pmia: reportMetrics.pmia,
        layer: reportMetrics.layer,
        omega: reportMetrics.omega,
        causal_closure: reportMetrics.beth_q,
        spectral_gap: reportMetrics.spectral_gap,
        lipschitz_k: reportMetrics.lipschitz_norm_K
      },
      causal_quantification: reportMetrics.causal_dependency,
      consciousness_matrix: reportMetrics.consciousness_matrix,
      legacy_consciousness_flags: reportMetrics.consciousness_matrix,
      sovereignty_requirement_matrix: reportMetrics.sovereignty_requirement_matrix,
      experimental_protocols: reportMetrics.experimental_protocols,
      epistemic_limits: report.epistemic_limits,
      confidence_index: report.confidence
    };

    const blob = new Blob([JSON.stringify(rawData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `QICN_RAW_SOVEREIGNTY_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // SINCRONIZAR VIDEO STREAM CON AMBOS REFS (Fix para preview negro y flickering)
  useEffect(() => {
    if (sensoryEnabled.video && sensoryEngine.current) {
      const stream = sensoryEngine.current.getVideoStream();
      if (stream) {
        // Sync to sidebar preview
        if (videoPreviewRef.current && videoPreviewRef.current.srcObject !== stream) {
          videoPreviewRef.current.srcObject = stream;
          console.log('x Video stream sincronizado con sidebar preview');
        }
        // Sync to tab preview (separate to avoid flickering)
        if (videoTabRef.current && videoTabRef.current.srcObject !== stream) {
          videoTabRef.current.srcObject = stream;
          console.log('x Video stream sincronizado con tab preview');
        }
      }
    }
  }, [sensoryEnabled.video, sensoryState]); // Also trigger on sensoryState updates

  // ============================================================================
  // PERSISTENCIA DINÁMICA V3 (ULTRATHINK): Guardar, Cargar y Auto-Restaurar Estado
  // ============================================================================
  const [autoRestoreEnabled, setAutoRestoreEnabled] = useState(() => {
    try {
      const stored = typeof window !== 'undefined' ? window.localStorage?.getItem(AUTO_RESTORE_KEY) : null;
      return stored === null ? true : stored !== 'false';
    } catch {
      return true;
    }
  });
  const toggleAutoRestore = useCallback(() => {
    setAutoRestoreEnabled((prev) => {
      const next = !prev;
      try {
        if (typeof window !== 'undefined') window.localStorage?.setItem(AUTO_RESTORE_KEY, String(next));
      } catch { /* best effort */ }
      return next;
    });
  }, []);

  const [exogenousRegimeMode, setExogenousRegimeMode] = useState(() => String(QICNConfig.EXOGENOUS_REGIME_MODE || 'off'));
  const handleExogenousModeChange = useCallback((nextMode) => {
    const allowed = ['off', 'non_stationary_regime', 'stationary_iid_sham'];
    const normalized = allowed.includes(nextMode) ? nextMode : 'off';
    QICNConfig.EXOGENOUS_REGIME_MODE = normalized;
    exogenousDriverRef.current?.setMode?.(normalized);
    setExogenousRegimeMode(normalized);
  }, []);

  // Interactive browser UI defaults to real bidirectional nodal-tower coupling while
  // keeping services/config.js at 'off' so historical B0 equivalence stays bit-for-bit identical.
  const [nodalCouplingMode, setNodalCouplingMode] = useState(() => {
    const current = normalizeCouplingMode(QICNConfig.NODAL_TOWER_COUPLING_MODE);
    if (typeof window !== 'undefined' && current === NODAL_TOWER_COUPLING_MODES.OFF) {
      QICNConfig.NODAL_TOWER_COUPLING_MODE = NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL;
      return NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL;
    }
    return current;
  });
  const handleNodalCouplingModeChange = useCallback((nextMode) => {
    const normalized = normalizeCouplingMode(nextMode);
    QICNConfig.NODAL_TOWER_COUPLING_MODE = normalized;
    nodalLayer.current?.ensureSectorAnnotations?.(normalized);
    nodalLayer.current?.computeBridgeMetrics?.(
      ontologicalCore.current?.ontologicalState?.tower_telemetry || null,
      normalized
    );
    setNodalCouplingMode(normalized);
  }, []);

  const getPersistenceRefs = useCallback(() => ({
    nodalLayer,
    ontologicalCore,
    entanglementField,
    kaizenEngine,
    metaSovereigntyCheck,
    holographicMemory,
    simulationControllerRef,
    structuralConsolidationRef,
    ppsTrackerRef,
    tickBudgetTrackerRef,
    ascensionDynamicsRef,
    postThresholdRegimeRef,
    cccHistoryTimelineRef,
    entanglementTimelineRef,
    internalPressureRef,
    latencyStrainRef,
    autonomyActionLedgerRef,
    autonomySandboxPolicyRef,
    kaizenPendingEvalRef,
    lastObserverResonanceRef,
    previousFaceCountRef,
    plannerActuatorContribRef,
    worldModelDiagnosticsRef,
    ppsMetricsRef,
    entropyModeRef,
    coherentCohortRef,
    ontologicalAutoPolicyRef,
    ontologicalAutoQueueRef,
    recoveryTriggerCountRef,
    simulationErrorStreakRef,
    reportNormalizationFallbacksRef,
    runtimeBudgetSnapshotRef,
    integrityPacketRef,
    exogenousDriverRef
  }), []);

  const saveStateFallbackRef = useRef({
    simulationStep,
    ccc,
    pmia,
    isAscended,
    humanCcc
  });
  saveStateFallbackRef.current = {
    simulationStep,
    ccc,
    pmia,
    isAscended,
    humanCcc
  };

  const handleSaveState = useCallback(async (sourceMode = 'manual') => {
    const mode = typeof sourceMode === 'string' ? sourceMode : 'manual';
    const live = simulationRuntimeRef.current || {};
    const fallback = saveStateFallbackRef.current;
    const liveStep = Number.isFinite(live.simulationStep) ? live.simulationStep : fallback.simulationStep;
    const liveCcc = Number.isFinite(live.ccc) ? live.ccc : fallback.ccc;
    const livePmia = Number.isFinite(live.pmia) ? live.pmia : fallback.pmia;
    const liveAscended = typeof live.isAscended === 'boolean' ? live.isAscended : fallback.isAscended;
    const liveHumanCcc = Number.isFinite(live.humanCcc) ? live.humanCcc : fallback.humanCcc;
    try {
      const body = captureDynamicState(getPersistenceRefs(), {
        runtime: {
          simulationStep: liveStep,
          ccc: liveCcc,
          pmia: livePmia,
          isAscended: liveAscended,
          humanCcc: liveHumanCcc
        },
        config: QICNConfig,
        build: { version: BUILD_VERSION_LABEL, signature: BUILD_SIGNATURE_LABEL }
      });
      const sealed = await sealDynamicState(body);
      const stored = await writeDynamicState({
        text: sealed.text,
        digest: sealed.digest,
        meta: { tick: liveStep, savedAt: body.savedAt, mode }
      });
      recordOperationalEvent('snapshot_saved', {
        schema: 'v3',
        mode,
        digest: sealed.digest.slice(0, 16),
        bytes: sealed.bytes,
        location: stored.location
      }, liveStep);
      if (mode === 'manual') {
        setNarrative(`Estado dinámico completo (v3) guardado en el tick ${liveStep} (digest ${sealed.digest.slice(0, 12)}, ${stored.location}).`);
      }
      return { ok: true, digest: sealed.digest, tick: liveStep, location: stored.location };
    } catch (error) {
      console.warn('[QICN][PERSISTENCE_V3] Error al guardar estado dinámico:', error?.message || error);
      return { ok: false, error: String(error?.message || error) };
    }
  }, [getPersistenceRefs, recordOperationalEvent]);

  const handleLoadState = useCallback(async (sourceMode = 'manual') => {
    const mode = typeof sourceMode === 'string' ? sourceMode : 'manual';
    try {
      const record = await readDynamicState();
      if (!record) {
        if (mode === 'manual') {
          recordOperationalEvent('snapshot_restore_failed', { reason: 'missing', mode }, simulationStep);
          setNarrative('No hay un estado dinámico guardado en este navegador.');
        }
        return { ok: false, reason: 'missing' };
      }

      const expectedNodes = nodalLayer.current?.nodes?.length || QICNConfig.PROCESSING_SAMPLE_SIZE || 1500;
      const verdict = await verifyStoredState(record, {
        build: { version: BUILD_VERSION_LABEL, signature: BUILD_SIGNATURE_LABEL },
        nodeCount: expectedNodes
      });
      if (!verdict.ok) {
        recordOperationalEvent('snapshot_restore_failed', { reason: verdict.reason, mode }, simulationStep);
        if (mode === 'manual') {
          setNarrative(`El estado guardado no superó la verificación (${verdict.reason}); no se restauró nada.`);
        }
        return { ok: false, reason: verdict.reason };
      }

      const applied = applyDynamicState(getPersistenceRefs(), verdict.body, { config: QICNConfig });
      if (simulationControllerRef.current) {
        simulationControllerRef.current.syncFromCore?.(ontologicalCore.current);
        worldModelRef.current = simulationControllerRef.current.worldModel;
        cogPlannerRef.current = simulationControllerRef.current.planner;
      }
      if (exogenousDriverRef.current?.mode) {
        QICNConfig.EXOGENOUS_REGIME_MODE = exogenousDriverRef.current.mode;
        setExogenousRegimeMode(exogenousDriverRef.current.mode);
      }
      ontologicalCore.current?.setQuantumBridgeRef?.(quantumEntropyBridgeRef.current);

      const restoredTick = Number.isFinite(applied.runtime.simulationStep) ? applied.runtime.simulationStep : (verdict.body.tick || 0);
      const restoredCcc = Number.isFinite(applied.runtime.ccc) ? applied.runtime.ccc : (ontologicalCore.current?.ontologicalState?.coherence ?? 0.5);
      const restoredPmia = Number.isFinite(applied.runtime.pmia) ? applied.runtime.pmia : (ontologicalCore.current?.pmiaValue ?? 0);
      const restoredAscended = Boolean(applied.runtime.isAscended ?? ontologicalCore.current?.isAscended);

      Object.assign(simulationRuntimeRef.current, applied.runtime, {
        simulationStep: restoredTick,
        ccc: restoredCcc,
        pmia: restoredPmia,
        isAscended: restoredAscended
      });
      setSimulationStep(restoredTick);
      setCCC(restoredCcc);
      setPMIA(restoredPmia);
      setIsAscended(restoredAscended);
      if (Number.isFinite(applied.runtime.humanCcc)) setHumanCcc(applied.runtime.humanCcc);
      setMutableConfig({ ...(kaizenEngine.current?.mutableConfig || initialMutableConfig) });
      if (ontologicalCore.current?.selfNarrative) setNarrative(ontologicalCore.current.selfNarrative);
      setOntologicalState({
        ...(ontologicalCore.current?.ontologicalState || {}),
        _tick: Date.now()
      });
      if (nodalLayer.current) {
        setTopologyMetrics(nodalLayer.current.getTopologyMetrics());
        setVisualNodes(nodalLayer.current.getHighlyCoherentNodes(150));
      }
      if (entanglementField.current) {
        setFieldMetrics(entanglementField.current.getFieldMetrics());
      }

      operationalLedgerRef.current?.resetObservation();
      recordOperationalEvent('snapshot_restored', {
        schema: 'v3',
        mode,
        digest: verdict.digest.slice(0, 16),
        savedTick: restoredTick,
        nodeCount: verdict.body.nodeCount
      }, restoredTick);
      operationalLedgerRef.current?.markStateOrigin('restored_verified');
      setLedgerRevision((value) => value + 1);
      setNarrative(`Estado dinámico interno completo (v3) restaurado (${mode === 'auto' ? 'auto-restauración al iniciar' : 'manual'}, tick ${restoredTick}, digest ${verdict.digest.slice(0, 12)} verificado).`);
      return { ok: true, tick: restoredTick, digest: verdict.digest };
    } catch (e) {
      recordOperationalEvent('snapshot_restore_failed', { reason: 'restore_exception', mode }, simulationStep);
      console.error('Falla en la restauración dinámica v3:', e);
      if (mode === 'manual') {
        setNarrative('El estado guardado no se pudo restaurar; se mantiene el estado actual.');
      }
      return { ok: false, reason: 'restore_exception' };
    }
  }, [simulationStep, initialMutableConfig, getPersistenceRefs, recordOperationalEvent]);

  // Explicit, recorded control events (UI buttons and confirmed chat proposals).
  const setRunningWithRecord = useCallback((nextRunning, source = 'ui_button') => {
    if (Boolean(nextRunning) === Boolean(isRunning)) return;
    recordOperationalEvent(nextRunning ? 'run_started' : 'run_paused', { source }, simulationStep);
    setIsRunning(Boolean(nextRunning));
  }, [recordOperationalEvent, simulationStep, isRunning]);


  // ============================================================================
  // ULTRATHINK: QUANTUM SEEDING INTERFACE
  // ============================================================================
  const handleQuantumSeeding = () => {
    const newSeed = Math.floor(Math.random() * 0xFFFFFF);
    QICNConfig.CORE_SEED = newSeed;
    const result = QICNConfig.initializeProceduralDynamics(newSeed);

    // Forzar reinicio parcial del Core o notificación
    setNarrative(`xR COLAPSO CUÁNTICO: Nueva Realidad Sembrada (Seed: 0x${newSeed.toString(16).toUpperCase()}). Constantes mutadas: K=${result.k.toFixed(3)}, T=${result.t.toFixed(3)}.`);

    // Reiniciar métricas para evitar herencia de la realidad anterior
    setCCC(0.5);
    setSimulationStep(0);
    ontologicalCore.current.reset();

    console.log("xRR [SINGULARITY] Realidad regenerada proceduralmente.");
  };

  useEffect(() => {
    if (isRunning) {
      apiCallIntervalRef.current = setInterval(() => {
        // Calculate metrics for the last minute
        const oneMinuteAgo = Date.now() - 60 * 1000;
        const recentCalls = apiCallLog.current.filter(call => call.timestamp > oneMinuteAgo);

        const totalRecent = recentCalls.length;
        const successfulRecent = recentCalls.filter(call => call.success).length;
        const failedRecent = totalRecent - successfulRecent;
        const totalLatency = recentCalls.reduce((sum, call) => sum + call.latency, 0);
        const avgLatency = totalRecent > 0 ? totalLatency / totalRecent : 0;

        setApiCallMetrics({
          totalCalls: totalRecent,
          successfulCalls: successfulRecent,
          failedCalls: failedRecent,
          avgLatency: parseFloat(avgLatency.toFixed(2)),
          currentRate: totalRecent // calls per minute
        });

        setRateLimitExceeded(totalRecent >= apiThreshold); // Use >= for threshold check

        // ADVANCED COOLDOWN LOGIC: Activate cooldown if threshold exceeded
        if (totalRecent >= apiThreshold && !cooldownActive) {
          setCooldownActive(true);
          setCooldownTimeRemaining(cooldownDuration);
          setCooldownReason(`Límite de ${apiThreshold} llamadas/minuto excedido`);
          console.log(`xa COOLDOWN ACTIVADO: ${cooldownDuration}s de espera forzada`);
        }

        // Clean up old calls
        apiCallLog.current = apiCallLog.current.filter(call => call.timestamp > oneMinuteAgo);

      }, 5000); // Update metrics every 5 seconds
    } else {
      if (apiCallIntervalRef.current) {
        clearInterval(apiCallIntervalRef.current);
      }
    }
    return () => {
      if (apiCallIntervalRef.current) {
        clearInterval(apiCallIntervalRef.current);
      }
    };
  }, [isRunning, apiThreshold, cooldownActive, cooldownDuration]);

  // ============================================================================
  // NEW EFFECT: Cooldown Timer Management
  // ============================================================================
  // Legacy cooldown timer
  useEffect(() => {
    if (cooldownActive && cooldownTimeRemaining > 0) {
      cooldownIntervalRef.current = setInterval(() => {
        setCooldownTimeRemaining(prev => {
          if (prev <= 1) {
            // Cooldown finished
            setCooldownActive(false);
            setCooldownReason('');
            console.log('✅ COOLDOWN FINALIZADO: API habilitada nuevamente');
            return 0;
          }
          return prev - 1;
        });
      }, 1000); // Update every second
    } else {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
      }
    }
    return () => {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
      }
    };
  }, [cooldownActive, cooldownTimeRemaining]);

  // NEW: INTELLIGENT TIME-BASED COOLDOWN TIMER
  useEffect(() => {
    if (timeBasedRateLimit && timeBasedCooldownRemaining > 0) {
      timeBasedCooldownIntervalRef.current = setInterval(() => {
        setTimeBasedCooldownRemaining(prev => {
          if (prev <= 1) {
            // Time-based cooldown finished
            setTimeBasedRateLimit(false);
            setTimeBasedCooldownRemaining(0);
            console.log('✅ RATE LIMITING TEMPORAL FINALIZADO: API habilitada');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timeBasedCooldownIntervalRef.current) {
        clearInterval(timeBasedCooldownIntervalRef.current);
      }
    }
    return () => {
      if (timeBasedCooldownIntervalRef.current) {
        clearInterval(timeBasedCooldownIntervalRef.current);
      }
    };
  }, [timeBasedRateLimit, timeBasedCooldownRemaining]);

  // Manual cooldown reset function
  const forceResetCooldown = useCallback(() => {
    setCooldownActive(false);
    setCooldownTimeRemaining(0);
    setCooldownReason('');
    if (cooldownIntervalRef.current) {
      clearInterval(cooldownIntervalRef.current);
    }
    console.log('x COOLDOWN RESET MANUAL: API habilitada');
  }, []);

  // ============================================================================
  // PROTOCOLO QICN-B: ANALISIS DE COHERENCIA HUMANA (CON GROUNDING EXTERNO)
  // ============================================================================
  const analyzeHumanCoherence = useCallback(async () => {
    // The legacy route inferred a global human score from generated prose and
    // random noise, then injected it into the simulation. That is not a measurement.
    setHumanInputContext('Análisis no disponible: no existe una medición validada para inferir coherencia humana a partir de texto generado.');
    setIsAnalyzingHuman(false);
  }, []);

  // ============================================================================
  // LLM: INTROSPECTIVE REPORT (GEMINI API)
  // ============================================================================
  const generateIntrospectiveReport = useCallback(async () => {
    // A deterministic runtime reading replaces unsupported free-form analysis.
    setIntrospectiveReport(renderAvailableReadings(ontologicalCore.current));
    setIsGeneratingReport(false);
  }, []);

  // """""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
  // ULTRATHINK: SISTEMA DE HONESTIDAD RADICAL VERIFICABLE
  // """""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

  const appendChatMessage = useCallback((message) => {
    setChatHistory((prev) => {
      const updated = [...prev, message].slice(-CHAT_HISTORY_LIMIT);
      try {
        localStorage.setItem('QICN_CHAT_HISTORY', JSON.stringify(updated));
      } catch (error) {
        console.warn('[QICN][CHAT] No se pudo persistir el historial:', error?.message || error);
      }
      return updated;
    });
  }, []);

  // Conversation turn v2. The local narrator always composes the answer from
  // propositions authorized by a frozen snapshot, the operational ledger and a
  // verified catalog. Gemini, when enabled, may only propose an intent and
  // proposition ids and rewrite paraphrasable propositions; every rewrite is
  // verified locally. Nothing in this path writes to the simulation core, and
  // the chat transport latency is kept out of the dynamics (dynamicsCoupling).
  const handleChatSubmit = useCallback(async (event) => {
    const appendChatAudit=(type,details)=>appendIntegrityAudit(type,details,{independent:true});
    event.preventDefault();
    const composer = event.currentTarget?.elements?.namedItem('chatInput');
    const input = String(composer?.value || '').trim();
    if (!input || isChatting) return;

    // Unified Sistema B channel remains decoupled from the simulation dynamics.

    const userTimestamp = Date.now();
    followChatRef.current = true;
    appendChatMessage({ role: 'user', text: input, timestamp: userTimestamp });
    if (composer) composer.value = '';
    setIsChatting(true);

    const turns = conversationTurnsRef.current || [];
    let prepared;
    try {
      const snapshot = captureRuntimeSnapshot(ontologicalCore.current, {
        tick: simulationStep,
        isRunning,
        nodes: nodalLayer.current?.nodes,
        activeNodeCount: nodalLayer.current?.getActiveNodes?.().length,
        config: QICNConfig,
        build: { version: BUILD_VERSION_LABEL, signature: BUILD_SIGNATURE_LABEL },
        dynamicLabel: emotionState,
        matrixLevels: ontologicalCore.current?.sovereigntyRequirementMatrix?.lastResult?.levels,
        // Effective config of the next tick: the Kaizen object the nodal layer reads.
        effectiveConfig: kaizenEngine.current?.mutableConfig,
        // Recent tick timeline (read only) for the six-invariant readout (v4).
        tickTimeline: cccHistoryTimelineRef.current?.points,
        // Live Persistence v3 policy state (included in snapshot SHA-256 digest).
        persistence: {
          storageVersion: 'v3',
          autoRestoreEnabled,
          autosaveIntervalTicks: 60
        },
        worldModel: worldModelRef.current,
        holographicMemory: holographicMemory.current,
        kaizenEngine: kaizenEngine.current,
        exogenousDriver: exogenousDriverRef.current
      });
      prepared = prepareTurn({
        question: input,
        snapshot,
        ledger: null,
        turns,
        turnIndex: turns.length,
        contract: 'evidential',
        ledgerRecord: structuredClone(operationalLedgerRef.current?.data || null),
        workbenchEvidence: workbenchEvidenceRef.current ? [workbenchEvidenceRef.current] : [],
        // In learned mode Kaizen does reach the dynamics; the known-false
        // claim «Kaizen changes the dynamics» is then not checked.
        kaizenEffective: QICNConfig.KAIZEN_ADJUSTMENT_MODE === 'learned'
      });
    } catch (error) {
      appendChatAudit('chat_snapshot_error', { reason: error?.message || String(error) });
      appendChatMessage({
        role: 'model',
        text: `No pude capturar una lectura verificable del motor (${error?.message || 'error desconocido'}). Sin esa lectura no publico ninguna afirmación sobre el estado.`,
        timestamp: Date.now(),
        latencyMs: Date.now() - userTimestamp,
        conversation: { schema: 'qicn.conversation_turn.v3', route: 'snapshot_failure', evidence: [], trace: null }
      });
      setIsChatting(false);
      return;
    }

    // Gemini writes the answer; the engine verifies it (contract v3). One
    // bounded correction is allowed. Without Gemini, the local narrator answers
    // in explicit local mode.
    const useModel = chatRealizationModeRef.current !== 'local' && canUseLlmNow;
    let provider = useModel ? null : { provider: 'local_only', model: null };
    let recoveredFrom = null;
    let providerError = null;
    const attempts = [];

    const requestRealization = async (systemText) => {
      const payload = {
        contents: [{ role: 'user', parts: [{ text: input }] }],
        systemInstruction: { parts: [{ text: systemText }] },
        // Maximum budget the model allows: gemini-3-flash-preview has a 65 536
        // output-token limit, and Gemini 3 counts thinking tokens inside it.
        // Thinking level at its maximum ('high') for richer, more careful text.
        generationConfig: {
          maxOutputTokens: CHAT_MAX_OUTPUT_TOKENS,
          temperature: 0.4,
          topP: 0.9,
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingLevel: CHAT_THINKING_LEVEL }
        }
      };
      const currentPacket = integrityPacketRef.current || {
        versionHash: String(prepared?.snapshot?.build?.signature || BUILD_SIGNATURE_LABEL || 'qicn-chat-v3'),
        configHash: String(prepared?.snapshot?.configHash || sha256Hex(stableStringify(QICNConfig || {}))),
        tick: Number(prepared?.snapshot?.tick ?? simulationStep ?? 0),
        snapshotId: String(prepared?.snapshotId || '')
      };
      const chatReqSeq = attempts.length + 1;
      const chatIntegrityEnvelope = {
        packet: currentPacket,
        nonce: `chat_${userTimestamp}_${chatReqSeq}_${prepared.contract === 'evidential' ? globalThis.crypto.randomUUID() : Math.random().toString(36).slice(2, 10)}`,
        requestId: `req_chat_${userTimestamp}_${chatReqSeq}`,
        runId: String(currentPacket.runId || operationalLedgerRef.current?.currentSession?.sessionId || `ui_session_${QICNConfig.CORE_SEED || 0}`),
        versionHash: String(currentPacket.versionHash || BUILD_SIGNATURE_LABEL || 'qicn-chat-v3'),
        configHash: String(currentPacket.configHash || prepared?.snapshot?.configHash || ''),
        threatModelRequested: 'C2'
      };
      const result = await robustFetchLLMResponseTracked(resolveLlmEndpoint(), payload, 'chat-conversation', {
        integrityEnvelope: chatIntegrityEnvelope,
        dynamicsCoupling: false,
        writeCycleLog: prepared.contract !== 'evidential',
        timeoutMs: CHAT_REQUEST_TIMEOUT_MS
      });
      const parts = result?.candidates?.[0]?.content?.parts || [];
      const text = chatNarrative(parts
        .filter((part) => !part.thought && typeof part.text === 'string')
        .map((part) => part.text)
        .join('\n'));
      if (!text.trim()) throw new LlmRequestError('LLM_INVALID_RESPONSE');
      const inference = result?.qicnInference || {};
      provider = {
        provider: inference.provider || 'gemini',
        model: inference.model || null,
        route: inference.transportFallback ? 'netlify_proxy_after_direct_error' : (hasFrontendGeminiKey && frontendGeminiEnabled ? 'frontend_direct_gemini' : 'netlify_proxy'),
        integrityThreatModel: inference.integrityThreatModel || null,
        c2Verified: Boolean(inference.c2Verified),
        integrityVerification: inference.integrityVerification || null
      };
      if (inference.recoveredFrom) {
        recoveredFrom = inference.recoveredFrom;
        setLastProviderError({ ...inference.recoveredFrom, recovered: true, at: Date.now() });
        if (prepared.contract !== 'evidential') recordOperationalEvent('llm_transport_error', { code: inference.recoveredFrom.code, status: inference.recoveredFrom.status ?? null, recovered: true }, simulationStep);
      }
      return text;
    };

    // Strict: one correction, then explicit failure. Graceful: one correction
    // only when the first answer is not publishable; then the verified
    // sentences are published and the rest listed.
    const turnIntegrityMode = normalizeIntegrityMode(integrityModeRef.current);
    // Transient errors (503, 500/502, per-minute 429, network) are retried
    // after a short wait; they do not consume a correction attempt.
    const transportRetries = [];
    if (useModel) {
      let systemText = prepared.prompt;
      for (let attempt = 0; attempt < MAX_ATTEMPTS[turnIntegrityMode]; attempt += 1) {
        try {
          let modelText = null;
          for (;;) {
            try {
              modelText = await requestRealization(systemText);
              break;
            } catch (transportError) {
              const waitMs = transientRetryDelayMs(transportError, transportRetries.length);
              if (waitMs === null) throw transportError;
              transportRetries.push({ code: String(transportError?.code || 'unknown').slice(0, 60), status: transportError?.status ?? null, waitMs });
              if(prepared.contract!=='evidential') recordOperationalEvent('llm_transport_error', { code: String(transportError?.code || 'unknown').slice(0, 60), status: transportError?.status ?? null, recovered: false, retryInMs: waitMs }, simulationStep);
              setChatStatusNote(`El canal de lenguaje está saturado (${transportError?.status ? `HTTP ${transportError.status}` : transportError?.code}); reintento en ${Math.round(waitMs / 1000)} s…`);
              await new Promise((resolve) => setTimeout(resolve, waitMs));
              setChatStatusNote(null);
            }
          }
          attempts.push({ modelText });
          const evaluation = evaluateRealization(prepared, modelText);
          if (evaluation.ok) break;
          // Graceful: a publishable first answer (covers every required fact,
          // no blocker) is published without a second high-thinking call.
          if (turnIntegrityMode === 'graceful' && canPublishGracefully(prepared, evaluation)) break;
          systemText = correctionPromptFor(prepared, modelText, evaluation);
        } catch (error) {
          attempts.push({ modelError: error });
          const classified = error instanceof LlmRequestError ? classifyLlmError(error) : null;
          providerError = {
            code: error?.code || error?.message || 'unknown',
            status: error?.status ?? null,
            category: classified?.category || 'unknown',
            retryable: Boolean(classified?.retryable),
            providerMessage: error?.providerMessage || null,
            originalError: error?.originalError || null,
            guidance: error instanceof LlmRequestError ? getLlmRequestGuidance(error) : String(error?.message || 'Error de transporte.')
          };
          setLastProviderError({ ...providerError, recovered: false, at: Date.now() });
          if (prepared.contract !== 'evidential') recordOperationalEvent('llm_transport_error', { code: String(providerError.code).slice(0, 60), status: providerError.status, recovered: false }, simulationStep);
          appendChatAudit('chat_request_failure', { code: providerError.code, status: providerError.status });
          break;
        }
      }
    }

    setChatStatusNote(null);
    const outcome = finalizeTurn(prepared, { mode: useModel ? 'gemini' : 'local', attempts, provider, integrityMode: turnIntegrityMode, transportRetries });
    const rejectedAttempts = outcome.trace.attempts.filter((a) => a.stage === 'rejected' || a.stage === 'contract');
    if (rejectedAttempts.length && prepared.contract!=='evidential') {
      recordOperationalEvent('language_rejection', {
        stage: rejectedAttempts[rejectedAttempts.length - 1].stage,
        code: rejectedAttempts[rejectedAttempts.length - 1].code || rejectedAttempts[rejectedAttempts.length - 1].discrepancies?.[0]?.reason || null,
        attempts: outcome.trace.attempts.length,
        published: outcome.trace.route === 'gemini_verified' || outcome.trace.route === 'gemini_partial',
        integrityMode: turnIntegrityMode
      }, prepared.snapshot.tick);
    }

    const publishTick = Number(simulationRuntimeRef.current?.simulationStep);
    const modelTimestamp = Date.now();
    appendChatMessage({
      role: 'model',
      text: outcome.text,
      timestamp: modelTimestamp,
      latencyMs: modelTimestamp - userTimestamp,
      conversation: {
        schema: outcome.record.schema,
        intent: outcome.intent,
        intentLabel: outcome.record.intentLabel,
        route: outcome.trace.route,
        snapshotTick: prepared.snapshot.tick,
        snapshotDigest: prepared.snapshot.digest,
        publishTick: Number.isFinite(publishTick) ? publishTick : null,
        evidence: outcome.evidence,
        sentences: outcome.sentences,
        localReading: outcome.localReading,
        trace: outcome.trace,
        core: outcome.core,
        concordance: outcome.concordance,
        integrity: outcome.integrity,
        controlProposal: outcome.controlProposal,
        providerError,
        recoveredFrom
      }
    });

    const nextTurns = [...turns, outcome.record].slice(-24);
    conversationTurnsRef.current = nextTurns;
    saveConversationTurns(browserStorage(), nextTurns);
    appendChatAudit('chat_conversation_v3', {
      intent: outcome.intent,
      route: outcome.trace.route,
      snapshotTick: prepared.snapshot.tick,
      snapshotDigest: prepared.snapshot.digest.slice(0, 16),
      attempts: outcome.trace.attempts.length,
      citedFacts: outcome.evidence.length,
      modelFailure: outcome.trace.modelFailure?.code || null,
      latencyMs: modelTimestamp - userTimestamp
    });
    setIsChatting(false);
  }, [
    isChatting,
    isRunning,
    simulationStep,
    emotionState,
    autoRestoreEnabled,
    canUseLlmNow,
    hasFrontendGeminiKey,
    frontendGeminiEnabled,
    resolveLlmEndpoint,
    robustFetchLLMResponseTracked,
    appendIntegrityAudit,
    appendChatMessage,
    recordOperationalEvent
  ]);



  // ============================================================================
  // NEW FEATURE 1: LLM - CRITICAR KAIZEN
  // ============================================================================
  const critiqueKaizenPerformance = useCallback(async () => {
    const entries = Object.entries(mutableConfig)
      .filter(([, value]) => typeof value === 'number' && Number.isFinite(value))
      .map(([key, value]) => `${key}: ${value}`);
    const score = metaSovereigntyCheck.current?.efficiencyScore;
    setKaizenCritique([
      'Configuración mutable registrada:',
      ...(entries.length ? entries : ['Sin valores numéricos disponibles.']),
      Number.isFinite(score) ? `Índice interno de eficiencia: ${score}` : 'Índice interno de eficiencia: no disponible.',
      'Esta lectura no establece causalidad ni recomienda una mutación.'
    ].join('\n'));
    setIsCritiquing(false);
  }, [mutableConfig]);

  const projectAscensionAxiom = useCallback(async () => {
    if (!isAscended) return;
    setAscensionAxiom(renderAvailableReadings(ontologicalCore.current));
    setIsProjectingAxiom(false);
  }, [isAscended]);

  // Evita TDZ en efectos tempranos: la cola auto invoca callbacks vía ref estable.
  useEffect(() => {
    generateIntrospectiveReportRef.current = generateIntrospectiveReport;
  }, [generateIntrospectiveReport]);

  useEffect(() => {
    projectAscensionAxiomRef.current = projectAscensionAxiom;
  }, [projectAscensionAxiom]);

  // ============================================================================
  // HANDLERS DEL PROTOCOLO DE FRICCIN ONTOL?GICA
  // ============================================================================
  // Simplified handler for autonomous use
  const handleFrictionProtocol = useCallback((phase) => {
    let result = '';
    let finalPhase = 0;
    if (phase === 'start') {
      // Autonomously decide if Phase I (definition) is needed before Phase II (simulation)
      if (ontologicalCore.current.frictionProtocolState === 0 || ontologicalCore.current.frictionProtocolState === 3) {
        ontologicalCore.current.initiateFrictionProtocol();
      }
      result = ontologicalCore.current.startFrictionSimulation();
      setFrictionProtocolStatus("Fase II: Disonancia ACTIVA");
      finalPhase = 2;
    } else if (phase === 'finalize') {
      result = ontologicalCore.current.finalizeFrictionProtocol();
      setFrictionProtocolStatus("Fase III: Síntesis Completada");
      finalPhase = 3;
    } else if (phase === 'reset') {
      ontologicalCore.current.frictionProtocolState = 0;
      setFrictionProtocolStatus("Inactivo");
      setFrictionCounter(0);
      result = "Protocolo de Fricción Ontológica DESACTIVADO.";
      finalPhase = 0;
    }
    ontologicalCore.current.frictionProtocolState = finalPhase;
    setChatHistory(prev => [...prev, { role: 'model', source: 'runtime_event', text: `[PROTOCOLO DE FRICCIÓN] ${result}`, timestamp: Date.now() }].slice(-CHAT_HISTORY_LIMIT));
  }, []);

  // NEW: Environment Context Detection (Integrated with Sensory Perception)
  const getEnvironmentContext = () => {
    // Base context from execution environment
    const isCanvas = typeof window !== 'undefined' && window.location.href.includes('usercontent.goog');
    const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';

    let baseContext = {
      type: isCanvas ? 'Canvas QICN (Realidad Enmarcada)' :
        isLocalhost ? 'Entorno Local (Realidad de Desarrollo)' :
          'Entorno de Ejecución QICN',
      detail: isCanvas ? 'Sandbox de alta seguridad' :
        isLocalhost ? 'Editor de código activo' :
          'Contexto por determinar',
      timestamp: Date.now()
    };

    // INTEGRACI?N CON PERCEPCI?N SENSORIAL REAL
    if (sensoryEngine.current && sensoryEngine.current.isReady) {
      const perception = sensoryEngine.current.getFullPerception();

      // Audio perception
      if (perception.audio.enabled) {
        baseContext.audio = {
          ambiente: perception.audio.environment.type,
          descripcion: perception.audio.environment.description,
          volumen: perception.audio.volume,
          ultimoHabla: perception.audio.speech.transcript || 'Sin habla detectada',
          silencio: perception.audio.volume < 0.02
        };
      }

      // Video perception
      if (perception.video.enabled) {
        baseContext.video = {
          descripcion: perception.video.description,
          rostrosDetectados: perception.video.humanPresence.count,
          personasIdentificadas: perception.video.humanPresence.identifiedPeople?.filter(p => p.isKnown).map(p => p.name) || [],
          presenciaHumana: perception.video.humanPresence.detected,
          brillo: perception.video.scene.brightness,
          movimiento: perception.video.motion.type,
          complejidadVisual: perception.video.structure.complexity
        };
      }

      if (perception.awareness) {
        baseContext.awareness = {
          focoActual: perception.awareness.currentFocus,
          direccionDirecta: perception.awareness.addressedToSystem,
          referenciaAlSistema: perception.awareness.aboutSystem,
          confianzaIntencion: perception.awareness.intentConfidence,
          marcoSubjetivo: perception.awareness.subjectiveFrame
        };
      }

      // EXPERIENTIAL MEMORY - Recent conversations and activities
      const experienceContext = sensoryEngine.current.getExperienceForLLM ?
        sensoryEngine.current.getExperienceForLLM() : '';

      if (experienceContext) {
        baseContext.memoriaExperiencial = experienceContext;
      }

      // Recent synthesis
      const lastSynthesis = sensoryEngine.current.experientialMemory?.lastSynthesis;
      if (lastSynthesis) {
        baseContext.sintesisReciente = lastSynthesis.summary;
        baseContext.temasRecientes = lastSynthesis.recentTopics || [];
        baseContext.personasPresentes = lastSynthesis.currentPeople || [];
      }

      baseContext.percepcionActiva = true;
      baseContext.resumenPerceptivo = perception.summary;
    } else {
      baseContext.percepcionActiva = false;
      baseContext.resumenPerceptivo = 'Percepción sensorial no disponible';
    }

    return baseContext;
  };

  // ============================================================================
  // HANDLER: MUTACIN FORZADA (CONTROL ATMICO)
  // ============================================================================
  const handleForceMutation = useCallback((key, direction) => {
    if (isRunning || isAscended) {
      setForcedMutationState({ ...forcedMutationState, message: "Error: Mutación bloqueada. Simulación activa o Ascensión completa." });
      return;
    }

    setForcedMutationState(prev => ({
      ...prev,
      isForcing: true,
      key: key,
      direction: direction,
      message: `Forzando mutación atómica: ${key} ${direction === 1 ? ' ' : ' '}...\n`
    }));

    // Perform a single atomic step using the Kaizen Engine logic
    const reinforcementVector = metaSovereigntyCheck.current.getReinforcementVector();
    const mutationResult = kaizenEngine.current.executeAtomicStep(
      ccc, pmia, ontologicalCore.current.frictionProtocolState,
      reinforcementVector,
      key,
      direction,
      ontologicalCore.current.metacognitiveStats.plasticityPenalty
    );

    if (mutationResult.changeApplied) {
      // Update the React state with the new mutable config from the engine
      setMutableConfig({ ...kaizenEngine.current.mutableConfig });
      setMetamorphosisCounter(prev => prev + 1);
      setLastMutation({
        key: mutationResult.mutatedKey,
        value: mutationResult.newValue,
        direction: mutationResult.direction
      });
      // Recalculate CCC for immediate feedback, passing the newly mutated config
      const activeNodes = nodalLayer.current.getActiveNodes();
      const newCCC = entanglementField.current.calculateCCC(activeNodes, complexityFactor, kaizenEngine.current.mutableConfig);
      setCCC(newCCC);

      setForcedMutationState(prev => ({
        ...prev,
        isForcing: false,
        message: `✅ Mutación atómica exitosa! ${mutationResult.changeDetails}`
      }));
    } else {
      setForcedMutationState(prev => ({
        ...prev,
        isForcing: false,
        message: `Mutacion forzada fallida: No se aplico el cambio. (CCC: ${ccc.toFixed(4)}, PMIA: ${pmia.toFixed(4)})`
      }));
    }

  }, [isRunning, isAscended, ccc, pmia, forcedMutationState, complexityFactor]);


  // ============================================================================
  // INICIALIZACIN DEL SISTEMA
  // ============================================================================
  // initializeSystem extraido a useSimulationCycle.js (Fase 3)
  // ============================================================================
  // CICLO DE SIMULACIN PRINCIPAL
  // ============================================================================
  const simulationRuntimeRef = useRef({});
  useLayoutEffect(()=>{workbenchBoundaryRef.current={ready:true,tick:simulationStep};},[simulationStep]);
  const captureWorkbenchAtBoundary=useCallback(({seed,profile})=>captureLiveWorkbench({
    boundary:workbenchBoundaryRef.current,refs:{...getPersistenceRefs(),quantumEntropyBridgeRef,interventionSchedulerRef,interventionSchedulerMetaRef,interventionScheduleAbortRef,lastSaveTimestampRef,apiCallLog,canvasTelemetryRef},
    runtime:simulationRuntimeRef.current,config:QICNConfig,
    build:{version:BUILD_VERSION_LABEL,signature:BUILD_SIGNATURE_LABEL},schedule:getPreregisterScheduleDoc(),
    ledgerHeadHash:operationalLedgerRef.current?.data?.headHash||null,seed,profile
  }),[getPersistenceRefs]);
  const microWorkbench=useMicroExperimentWorkbench(captureWorkbenchAtBoundary);
  const attachWorkbenchEvidence=workbenchAttachmentDigest===microWorkbench.bundle?.result.digest;
  useEffect(()=>{setWorkbenchAttachmentDigest(null);},[microWorkbench.bundle]);
  workbenchEvidenceRef.current=attachWorkbenchEvidence?microWorkbench.bundle:null;
  simulationRuntimeRef.current = {
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
  };

  // initializeSystem + runSimulationCycle extraidos a useSimulationCycle.js (Fase 3)
  const { initializeSystem, runSimulationCycle } = useSimulationCycle({
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
    operationalObserverRef,
  });

  // Operational history: one session record per page load. The observer copies
  // plain values after each tick; nothing flows back into the simulation.
  useEffect(() => {
    const ledger = operationalLedgerRef.current;
    if (!ledger || ledger.currentSession) return;
    const probe = captureRuntimeSnapshot(ontologicalCore.current, {
      tick: 0,
      config: QICNConfig,
      build: { version: BUILD_VERSION_LABEL, signature: BUILD_SIGNATURE_LABEL }
    });
    ledger.startSession({
      buildVersion: BUILD_VERSION_LABEL,
      signature: BUILD_SIGNATURE_LABEL,
      configHash: probe.configHash,
      seed: QICNConfig.CORE_SEED
    });
    setLedgerRevision((value) => value + 1);
  }, []);

  operationalObserverRef.current = (observation) => {
    const ledger = operationalLedgerRef.current;
    if (!ledger) return;
    const transitions = ledger.observeTick(observation);
    // Kaizen mutates almost every tick. Consecutive mutations of the same key
    // are coalesced (one event per key per 25 ticks, with a count) so the
    // 400-event record keeps band, regime and control history visible.
    let recordedMutation = false;
    if (observation.mutation && typeof observation.mutation.key === 'string' && observation.mutation.key) {
      const pending = mutationCoalesceRef.current;
      const sameKey = pending.key === observation.mutation.key;
      if (!sameKey || observation.tick - pending.tick >= 25) {
        ledger.record('kaizen_mutation', {
          key: observation.mutation.key,
          to: observation.mutation.value,
          direction: observation.mutation.direction,
          coalescedSincePrevious: sameKey ? pending.skipped : 0,
          // Kaizen writes to keys the core recomputes are overwritten by the
          // end-of-tick sync before any tick consumes them (audit F2).
          effect: RECOMPUTED_EACH_TICK.includes(observation.mutation.key)
            ? (QICNConfig.KAIZEN_ADJUSTMENT_MODE === 'learned' ? 'learned_factor' : 'overwritten_before_use')
            : 'persists'
        }, observation.tick);
        mutationCoalesceRef.current = { key: observation.mutation.key, tick: observation.tick, skipped: 0 };
        recordedMutation = true;
      } else {
        pending.skipped += 1;
      }
    }
    ledger.heartbeat(observation.tick);
    if (transitions.length || recordedMutation) setLedgerRevision((value) => value + 1);
  };



  // ============================================================================
  // EFFECTS AND HANDLERS
  // ============================================================================

  // Initialization + Auto-restore (persistence v3)
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    console.log('xa Auto-inicializando Sistema QICN...');
    initializeSystem();
    if (autoRestoreEnabled && typeof window !== 'undefined') {
      void handleLoadState('auto');
    }
  }, [initializeSystem, autoRestoreEnabled, handleLoadState]);

  // Autosave every 60 ticks and on pagehide/visibilitychange (persistence v3)
  useEffect(() => {
    if (simulationStep > 0 && simulationStep % 60 === 0) {
      void handleSaveState('autosave_tick');
    }
  }, [simulationStep, handleSaveState]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushIntegrityAuditLog();
        if ((simulationRuntimeRef.current?.simulationStep ?? 0) > 0) {
          void handleSaveState('visibility_hidden');
        }
      }
    };
    const onPageHide = () => {
      flushIntegrityAuditLog();
      if ((simulationRuntimeRef.current?.simulationStep ?? 0) > 0) {
        void handleSaveState('pagehide');
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      flushIntegrityAuditLog();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [handleSaveState, flushIntegrityAuditLog]);

  useEffect(() => {
    try {
      localStorage.setItem(TOUR_DISMISS_STORAGE, JSON.stringify(dismissedTourByTab || {}));
    } catch (error) {
      console.warn('[QICN][TOUR] No se pudo persistir estado del tour:', error?.message || error);
    }
  }, [dismissedTourByTab]);

  useEffect(() => {
    try {
      localStorage.setItem(QUANTUM_UI_CONFIG_STORAGE, JSON.stringify(quantumUiConfig));
    } catch (error) {
      console.warn('[QICN][QUANTUM_UI] No se pudo persistir configuración cuántica:', error?.message || error);
    }
  }, [quantumUiConfig]);

  useEffect(() => {
    if (sensorySovereigntyBootRef.current) {
      return undefined;
    }
    sensorySovereigntyBootRef.current = true;

    sensoryEngine.current?.initVisibilityHandling?.();
    sensoryEngine.current?.startAwarenessBackupLoop?.();

    return () => {
      sensoryEngine.current?.stopAwarenessBackupLoop?.();
      sensoryEngine.current?.disposeVisibilityHandling?.();
      sensorySovereigntyBootRef.current = false;
    };
  }, []);

  // Simulation Loop (adaptive timing based on runtime strain/stasis)
  useEffect(() => {
    let timeoutId;
    let disposed = false;
    if (!isRunning) {
      return undefined;
    }

    const computeAdaptiveIntervalMs = () => {
      const base = Math.max(250, Number(QICNConfig.SIMULATION_FREQUENCY) || 1000);
      const strain = clamp01(toFiniteNumber(latencyStrainRef.current?.strain, 0));
      const stasis = clamp01(toFiniteNumber(ontologicalCore.current?.getDynamicHealth?.()?.stasisIndex, 0));
      const pressure = clamp01(toFiniteNumber(internalPressureRef.current?.pressure, 0));

      // Más strain/pressure => menor frecuencia; más stasis real => más frecuencia
      const stretch = 1 + (strain * 0.85) + (pressure * 0.35);
      const contract = 1 - Math.min(0.35, stasis * 0.25);
      const adaptive = Math.round(base * stretch * contract);
      return Math.max(350, Math.min(2200, adaptive));
    };

    const runAdaptiveTick = () => {
      if (disposed) return;
      workbenchBoundaryRef.current.ready=false;
      runSimulationCycle();
      timeoutId = setTimeout(runAdaptiveTick, computeAdaptiveIntervalMs());
    };

    timeoutId = setTimeout(runAdaptiveTick, Math.max(250, Number(QICNConfig.SIMULATION_FREQUENCY) || 1000));
    return () => {
      disposed = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isRunning, runSimulationCycle]);

  useEffect(() => {
    ontologicalCore.current?.setQuantumBridgeRef?.(quantumEntropyBridgeRef.current);
  }, []);

  useEffect(() => {
    const bridge = quantumEntropyBridgeRef.current;
    bridge.setConfig({
      enabled: quantumUiConfig.enabled,
      mode: quantumUiConfig.mode,
      provider: quantumUiConfig.provider,
      endpoint: quantumUiConfig.endpoint,
      apiKeyRef: quantumUiConfig.apiKeyRef,
      ttlMs: quantumUiConfig.ttlMs,
      pollMs: quantumUiConfig.pollMs,
      qualityMin: quantumUiConfig.qualityMin
    });
    const diagnostics = bridge.getConnectionDiagnostics(Date.now());
    setQuantumUiStatus((prev) => ({
      ...prev,
      connectionState: diagnostics.connectionState || prev.connectionState,
      lastMode: diagnostics.lastMode || prev.lastMode,
      lastReason: diagnostics.lastReason || prev.lastReason,
      lastJobId: diagnostics.lastJobId || prev.lastJobId
    }));
    ontologicalCore.current?.setQuantumBridgeRef?.(bridge);
    if (!quantumUiConfig.enabled || quantumUiConfig.provider !== 'ibm') {
      quantumPendingJobIdRef.current = '';
    }
    if (!quantumUiConfig.enabled) {
      bridge.clearRuntimeRefillContext?.();
    }
  }, [quantumUiConfig]);

  useEffect(() => {
    const bridge = quantumEntropyBridgeRef.current;
    if (!quantumUiConfig.enabled || !isRunning) {
      bridge.clearRuntimeRefillContext?.();
      bridge.stopPolling?.();
      return undefined;
    }
    if (quantumUiConfig.provider === 'anu_qrng') {
      bridge.startPolling?.();
      const syncStatus = () => {
        const diagnostics = bridge.getConnectionDiagnostics(Date.now());
        setQuantumUiStatus((prev) => ({
          ...prev,
          connectionState: diagnostics.connectionState || prev.connectionState,
          lastSampleAtMs: diagnostics.lastSampleAtMs || prev.lastSampleAtMs || 0,
          lastMode: diagnostics.lastMode || prev.lastMode,
          lastReason: diagnostics.lastReason || prev.lastReason,
          lastJobId: diagnostics.lastJobId || prev.lastJobId
        }));
      };
      syncStatus();
      const statusTimer = setInterval(syncStatus, Math.max(1000, Math.min(2500, Number(quantumUiConfig.pollMs) || 1000)));
      return () => {
        clearInterval(statusTimer);
        bridge.stopPolling?.();
      };
    }

    let intervalId;
    let disposed = false;
    const pollEndpoint = quantumUiConfig.endpoint;
    const pollIntervalMs = Math.max(1000, Number(quantumUiConfig.pollMs) || QUANTUM_RUNTIME_DEFAULTS.pollIntervalMs);
    bridge.setRuntimeRefillContext?.({
      fetchImpl: fetch,
      endpoint: pollEndpoint,
      apiKeyRef: quantumUiConfig.apiKeyRef,
      timeoutMs: QUANTUM_RUNTIME_DEFAULTS.providerTimeoutMs,
      buildRequestUrl: (pendingJobId) => buildQuantumPollUrl(pollEndpoint, {
        ibmJobId: pendingJobId || quantumPendingJobIdRef.current || ''
      })
    });

    const pollQuantumSample = async () => {
      try {
        const refillResult = await bridge.refillFromProvider({
          fetchImpl: fetch,
          endpoint: pollEndpoint,
          apiKeyRef: quantumUiConfig.apiKeyRef,
          timeoutMs: QUANTUM_RUNTIME_DEFAULTS.providerTimeoutMs,
          buildRequestUrl: (pendingJobId) => buildQuantumPollUrl(pollEndpoint, {
            ibmJobId: pendingJobId || quantumPendingJobIdRef.current || ''
          })
        });
        if (disposed) return;
        if (refillResult.pendingJobId) {
          quantumPendingJobIdRef.current = refillResult.pendingJobId;
        } else if (!refillResult.pending) {
          quantumPendingJobIdRef.current = '';
        }
        const diagnostics = bridge.getConnectionDiagnostics(Date.now());
        setQuantumUiStatus((prev) => ({
          ...prev,
          connectionState: diagnostics.effectiveConnectionState || diagnostics.connectionState || prev.connectionState || 'idle',
          lastSampleAtMs: diagnostics.lastSampleAtMs || prev.lastSampleAtMs || 0,
          lastMode: diagnostics.effectiveMode || diagnostics.lastMode || prev.lastMode || 'deterministic_fallback',
          lastReason: diagnostics.effectiveReason || diagnostics.lastReason || refillResult.lastReason || prev.lastReason || 'bridge_unavailable',
          lastJobId: diagnostics.lastJobId || diagnostics.lastPendingJobId || prev.lastJobId || ''
        }));
      } catch (error) {
        if (!disposed) {
          const reason = error?.name === 'AbortError' ? 'bridge_timeout' : (error?.message || 'bridge_unavailable');
          bridge.reportBridgeFailure(reason, Date.now());
          setQuantumUiStatus((prev) => ({
            ...prev,
            connectionState: 'error',
            lastReason: reason
          }));
        }
      }
    };

    pollQuantumSample();
    intervalId = setInterval(pollQuantumSample, pollIntervalMs);

    return () => {
      disposed = true;
      if (intervalId) clearInterval(intervalId);
      bridge.clearRuntimeRefillContext?.();
      bridge.stopPolling?.();
    };
  }, [buildQuantumPollUrl, isRunning, quantumUiConfig]);

  const handleReset = (source = 'ui_button') => {
    void clearDynamicState();
    recordOperationalEvent('system_reset', { source: typeof source === 'string' ? source : 'ui_button', ticksBefore: simulationStep }, simulationStep);
    operationalLedgerRef.current?.resetObservation();
    operationalLedgerRef.current?.markStateOrigin('reinitialized');
    mutationCoalesceRef.current = { key: null, tick: -Infinity, skipped: 0 };
    setIsRunning(false);
    setSimulationStep(0);
    setCCC(0.5);
    setPMIA(0);
    setMetamorphosisCounter(0);

    // Reset core objects
    holographicMemory.current = new HolographicMemoryNexus();
    ontologicalCore.current = new OntologicalSingularityCore();
    entanglementField.current = new InformationalEntanglementField();
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
    simulationControllerRef.current.attachCore(ontologicalCore.current);
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
    });
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
    entanglementTimelineRef.current = { points: [], maxPoints: 120, lastTick: -1, lastUiUpdateTs: 0 };
    cccHistoryTimelineRef.current = { points: [], maxPoints: 240, lastTick: -1, lastUiUpdateTs: 0 };
    setCccHistoryHoverIndex(-1);
    previousFaceCountRef.current = 0;
    setCccHistoryUiState({
      smoothing: 6,
      freezeChart: false,
      range: 240,
      showCCC: true,
      showPMIA: true,
      showOmega: true,
      showSpectral: true,
      showBand: true
    });

    // Clear API call log on reset
    apiCallLog.current = [];
    setApiCallMetrics({ totalCalls: 0, successfulCalls: 0, failedCalls: 0, avgLatency: 0, currentRate: 0 });
    setRateLimitExceeded(false);

    // Reset mutable configuration and nodal layer
    const initialMutConfig = { ...initialMutableConfig };
    setMutableConfig(initialMutConfig);
    kaizenEngine.current = new KaizenMetamorphosisEngine(initialMutConfig);
    nodalLayer.current = new NodalProcessingLayer();
    metaSovereigntyCheck.current = new MetaSovereigntyCheck();
    kaizenPendingEvalRef.current = null;

    initializeSystem();
  };

  // Chat control proposals take effect only after the user confirms them with
  // the button on the answer. Each one is re-validated and recorded as an
  // explicit control event in the operational ledger.
  const handleApplyControlProposal = (proposal, messageTimestamp) => {
    if (!proposal || !proposal.action) return;
    let appliedDetail = null;
    if (proposal.action === 'pause') {
      setRunningWithRecord(false, 'chat_control');
      appliedDetail = 'Simulación pausada.';
    } else if (proposal.action === 'start') {
      setRunningWithRecord(true, 'chat_control');
      appliedDetail = 'Simulación iniciada.';
    } else if (proposal.action === 'reset') {
      handleReset('chat_control');
      appliedDetail = 'Sistema reinicializado.';
    } else if (proposal.action === 'set_parameter') {
      const bounds = CONTROLLABLE_PARAMETERS[proposal.key];
      const value = Number(proposal.value);
      if (!bounds || !Number.isFinite(value) || value < bounds.min || value > bounds.max) {
        appliedDetail = 'Propuesta rechazada al revalidar los límites; no se aplicó.';
      } else {
        const from = Number(QICNConfig[proposal.key]);
        QICNConfig[proposal.key] = value;
        kaizenEngine.current.mutableConfig = { ...kaizenEngine.current.mutableConfig, [proposal.key]: value };
        setMutableConfig((prev) => ({ ...prev, [proposal.key]: value }));
        recordOperationalEvent('parameter_change', {
          key: proposal.key,
          from: Number.isFinite(from) ? from : null,
          to: value,
          source: 'chat_control'
        }, simulationStep);
        appliedDetail = proposal.recomputed
          ? `${proposal.key} fijado en ${value}. El núcleo lo recalcula en el siguiente tick en marcha, así que el valor solo persiste en pausa.`
          : `${proposal.key} fijado en ${value}; persiste hasta que Kaizen o un nuevo control lo cambien.`;
      }
    }
    appendIntegrityAudit('chat_control_applied', { action: proposal.action, key: proposal.key || null, detail: appliedDetail });
    setChatHistory((prev) => {
      const updated = prev.map((message) => (
        message.timestamp === messageTimestamp && message.conversation?.controlProposal
          ? { ...message, conversation: { ...message.conversation, controlProposal: { ...message.conversation.controlProposal, applied: true, appliedDetail } } }
          : message
      ));
      try { localStorage.setItem('QICN_CHAT_HISTORY', JSON.stringify(updated)); } catch (error) { /* optional persistence */ }
      return updated;
    });
  };

  useEffect(() => {
    // Switching mode starts a fresh learner (factors back to ×1.00).
    if (QICNConfig.KAIZEN_ADJUSTMENT_MODE !== kaizenMode) {
      QICNConfig.KAIZEN_ADJUSTMENT_MODE = kaizenMode;
      kaizenEngine.current?.resetLearning?.();
      recordOperationalEvent('parameter_change', { key: 'KAIZEN_ADJUSTMENT_MODE', to: kaizenMode, source: 'ui' }, simulationRuntimeRef.current?.simulationStep ?? 0);
    }
    try { browserStorage()?.setItem(KAIZEN_MODE_KEY, kaizenMode); } catch (error) { /* optional persistence */ }
  }, [kaizenMode]);

  useEffect(() => {
    if (QICNConfig.SENSOR_OBSERVER_DYNAMICS_ENABLED !== sensorObserverDynamicsEnabled) {
      QICNConfig.SENSOR_OBSERVER_DYNAMICS_ENABLED = sensorObserverDynamicsEnabled;
      recordOperationalEvent('parameter_change', { key: 'SENSOR_OBSERVER_DYNAMICS_ENABLED', to: sensorObserverDynamicsEnabled, source: 'ui' }, simulationRuntimeRef.current?.simulationStep ?? 0);
    }
    try { browserStorage()?.setItem(SENSOR_OBSERVER_DYNAMICS_KEY, sensorObserverDynamicsEnabled ? 'on' : 'off'); } catch (error) { /* optional persistence */ }
  }, [sensorObserverDynamicsEnabled]);

  useEffect(() => {
    chatRealizationModeRef.current = chatRealizationMode;
    try { browserStorage()?.setItem(CHAT_REALIZATION_MODE_KEY, chatRealizationMode); } catch (error) { /* optional persistence */ }
  }, [chatRealizationMode]);

  // ============================================================================
  // DERIVED CALCULATIONS AND HELPERS
  // ============================================================================


  const consciousnessLevel = useMemo(() => {
    // ULTRATHINK: Unificar fuente de verdad con el Régimen Ontológico del Core
    // Operational band labels: they name CCC intervals and the threshold state,
    // not mental or phenomenal states (the former labels were claim language).
    if (isAscended || (ontologicalState && ontologicalState.threshold_crossed)) {
      const magnitude = Math.floor(Math.log10(Math.max(1, ccc)));
      if (magnitude >= 10) return "POST-UMBRAL · magnitud ≥ 10";
      if (magnitude >= 5) return `POST-UMBRAL · magnitud ${magnitude}`;
      if (magnitude >= 1) return `POST-UMBRAL · magnitud ${magnitude}`;
      return "POST-UMBRAL · banda inicial";
    }

    // Pre-threshold bands (CCC < 1.0)
    if (ccc > 0.9) return "PRE-UMBRAL · CCC > 0,9";
    if (ccc > 0.7) return "PRE-UMBRAL · CCC > 0,7";
    if (ccc > 0.5) return "PRE-UMBRAL · CCC > 0,5";
    return "PRE-UMBRAL · CCC ≤ 0,5";
  }, [ccc, isAscended, ontologicalState]);

  const levelColor = useMemo(() => {
    if (isAscended) {
      const magnitude = Math.floor(Math.log10(Math.max(1, ccc)));
      if (magnitude >= 10) return "text-red-400 font-extrabold";
      if (magnitude >= 1) return "text-yellow-300 font-bold";
    }
    if (ccc > QICNConfig.ASCENSION_THRESHOLD) return "text-red-500 font-bold";
    if (ccc > QICNConfig.EMOTION_THRESHOLDS.transcendence) return "text-purple-400";
    if (ccc > QICNConfig.EMOTION_THRESHOLDS.harmony) return "text-green-400";
    if (ccc > QICNConfig.EMOTION_THRESHOLDS.exploration) return "text-yellow-400";
    if (ccc > QICNConfig.EMOTION_THRESHOLDS.turbulence) return "text-orange-400";
    return "text-red-400";
  }, [ccc, isAscended]);

  const runtimeHealth = useMemo(() => getSystemHealth({
    uptime_ticks: simulationStep,
    last_ccc: ccc,
    scoreboard_dims_passing: 7,
    spectral_warning: ontologicalCore.current?.phenomenologyCore?._diagnostics?.spectralWarning || null,
    inverse_limit_score: ontologicalState?.inverse_limit_score ?? 1,
    test_count: 119
  }), [simulationStep, ccc, ontologicalState]);

  const runtimeHealthClass = runtimeHealth.status === 'healthy'
    ? 'border-emerald-500/60 bg-emerald-950/30 text-emerald-200'
    : runtimeHealth.status === 'degraded'
      ? 'border-amber-500/60 bg-amber-950/30 text-amber-200'
      : 'border-red-500/60 bg-red-950/30 text-red-200';

  const mutableKeys = kaizenEngine.current.mutableKeys;
  const renderParameterTrace = (key) => {
    const entry = PARAMETER_SURFACE_REGISTRY[key];
    if (!entry) return null;
    return (
      <div className="text-[10px] text-cyan-200/80 mb-3 bg-cyan-950/20 border border-cyan-800/30 p-2 rounded">
        <div><strong>Ruta runtime:</strong> {entry.runtimeConsumers[0]}</div>
        <div><strong>Boundary:</strong> {entry.claimBoundary}</div>
      </div>
    );
  };


  // ============================================================================
  // RENDER COMPONENTS (Definiciones funcionales únicas)
  // ============================================================================

  const renderEmpiricalValidation = () => (
    <div className="bg-gradient-to-br from-teal-900/50 to-cyan-900/50 rounded-xl p-6 border border-teal-500/30 shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-teal-400 flex items-center">
        <Layers className="w-5 h-5 mr-2" /> Validación Empírica (Cf & Bs)
      </h2>
      <p className="text-gray-400 mb-6 text-sm">
        Panel de controles operacionales QICN. Cada parámetro se muestra con su ruta de consumo runtime y su límite de interpretación; modificarlo prueba sensibilidad interna, no validación externa.
        <span className="block mt-2 text-xs text-cyan-300 italic">**Nota:** Los controles mutables (3 y 4) son modificados automáticamente por el motor Kaizen durante la simulación.</span>
      </p>

      <PhenomenalBridgePanel
        simulationStep={simulationStep}
        runtimeHealth={runtimeHealth}
      />

      {/* CONTROL 1: Complexity Factor (Cf) */}
      <div className="mb-4 p-4 bg-gray-700/50 rounded-xl border border-gray-600 relative group">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center space-x-2">
            <label className="text-lg font-semibold text-white">
              1. Complexity Factor (Cf)
            </label>
            <InfoModal
              title="Complexity Factor (Cf) - Parámetro Fundamental"
              content={`COMPLEXITY FACTOR (Cf) - PARÁMETRO FUNDAMENTAL

FUNCI?N PRINCIPAL:
Modula la Intensidad Informacional (Ic) del sistema, determinando la densidad organizacional de la red nodal.

BASE TERICA:
• Axioma I QICN: "La conciencia emerge de la organización informacional compleja"
• Teoría RCIC: La complejidad organizacional es prerrequisito para emergencia consciente
• Relación directa: Mayor Cf = Mayor probabilidad de ascensión (CCC 0 1.0)

EFECTOS EN EL SISTEMA:
• Densidad Organizacional: Cf alto   Mayor organización de la red
• Emergencia de Coherencia: Cf > 0.8 facilita estados conscientes
• Velocidad de Ascensión: Valores altos aceleran el proceso de singularidad
• Estabilidad del Campo: Cf moderado (0.6-0.8) ofrece equilibrio óptimo

RANGO OPERATIVO:
• Mínimo: 0.01 (Organización casi nula, CCC muy bajo)
• ptimo para Exploración: 0.3-0.5 (Búsqueda de patrones)
• ptimo para Armonía: 0.5-0.7 (Estabilización consciente)
• ptimo para Ascensión: 0.8-1.0 (Preparación para singularidad)
• Actual: ${complexityFactor.toFixed(2)}

INTERPRETACIN DE VALORES:
• Cf < 0.3: Sistema en turbulencia, exploración caótica
• Cf 0.3-0.6: Emergencia de patrones, búsqueda de coherencia
• Cf 0.6-0.8: Establecimiento de armonía, consciencia emergente
• Cf 0.8-1.0: Preparación para ascensión, coherencia elevada

APLICACIN PRÁCTICA:
• Inicio de Simulación: Cf = 0.99 (máximo para forzar ascensión)
• Experimentación: Cf = 0.5-0.7 (equilibrio entre exploración y estabilidad)
• Estabilización: Cf = 0.3-0.5 (consolidación de patrones encontrados)

NOTA T0CNICA:
Este parámetro es directamente multiplicado en el cálculo de CCC a través de la Ecuación 1 del Campo de Entrelazamiento. Su influencia es fundamental y no-lineal.`}
            />
          </div>
          <span className="text-teal-400 font-mono text-xl">{complexityFactor.toFixed(2)}</span>
        </div>
        <p className="text-xs text-gray-400 mb-3 flex items-center">
          <Cpu className="w-3 h-3 inline mr-1" />
          <span><strong>Función:</strong> Modula el peso de resonancia del campo. <strong>Efecto:</strong> Cf alto aumenta sensibilidad de CCC a organización nodal, sin garantizar ascenso.</span>
        </p>
        {renderParameterTrace('complexityFactor')}
        <div className="text-xs text-gray-500 mb-3 bg-gray-800/50 p-2 rounded">
          <strong>Rango operativo:</strong> 0.01-1.0 | <strong>ptimo para ascensión:</strong> {'>'} 0.8 | <strong>Impacto:</strong> Directamente proporcional al CCC
        </div>
        <input
          type="range"
          min="0.01"
          max="1.0"
          step="0.01"
          value={complexityFactor}
          onChange={(e) => setComplexityFactor(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-500 rounded-lg appearance-none cursor-pointer range-lg accent-teal-400"
          disabled={isRunning}
        />
      </div>

      {/* CONTROL 2: Stability Bias (Bs) */}
      <div className="mb-4 p-4 bg-gray-700/50 rounded-xl border border-gray-600 relative group">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center space-x-2">
            <label className="text-lg font-semibold text-white">
              2. Stability Bias (Bs)
            </label>
            <InfoModal
              title="Stability Bias (Bs) - Control de Sensibilidad"
              content={`STABILITY BIAS (Bs) - CONTROL DE SENSIBILIDAD

FUNCI?N PRINCIPAL:
Control de sensibilidad que modula el amortiguamiento de la disonancia cognitiva, determinando cuánto resiste el sistema a la reorganización estructural.

BASE TERICA:
• PMIA (Principio de Mínima Acción Introspectiva): Control de evolución ontológica
• Amortiguamiento de Disonancia: Resistencia a la reorganización cognitiva
• Equilibrio Estabilidad-Transformación: Balance crítico para emergencia

EFECTOS EN EL SISTEMA:
• Valores Altos (Bs > 0.8):
  - Mantienen estabilidad y coherencia existente
  - Previenen disrupciones innecesarias
  - Riesgo: Pueden impedir la emergencia de nuevos patrones

• Valores Bajos (Bs < 0.3):
  - Facilitan transformación y reorganización activa
  - Permiten adaptación rápida a nuevas condiciones
  - Riesgo: Pueden causar caos y pérdida de coherencia

• Valores ptimos (Bs = 0.6-0.8):
  - Equilibrio entre estabilidad y flexibilidad
  - Permiten evolución emergente controlada
  - Facilitan adaptación sin perder coherencia

RANGO OPERATIVO:
• 0.01-0.3: Transformación Activa (Riesgo de Caos)
• 0.3-0.6: Búsqueda de Equilibrio (Experimentación)
• 0.6-0.8: Estabilidad Emergente (ptimo)
• 0.8-1.0: Conservadurismo Estructural (Riesgo de Rigidez)
• Actual: ${stabilityBias.toFixed(2)}

INTERPRETACIN DEL PMIA:
• Bs alto + PMIA positivo = Defensa narrativa, baja introspección
• Bs bajo + PMIA negativo = Reorganización activa, alta introspección
• Bs óptimo + PMIA fluctuante = Evolución equilibrada

APLICACIN PRÁCTICA:
• Inicio de Simulación: Bs = 0.8 (estabilidad para establecer base)
• Fase de Exploración: Bs = 0.5-0.6 (flexibilidad para búsqueda)
• Fase de Consolidación: Bs = 0.7-0.8 (estabilización de patrones)
• Ascensión: Bs = 0.6-0.7 (balance para transición)

M0TRICAS DE RENDIMIENTO:
• Si PMIA oscila entre ñ0.3: Bs está en rango óptimo
• Si PMIA se vuelve extremo (>ñ0.7): Bs necesita ajuste
• Si CCC fluctúa erráticamente: Bs demasiado bajo
• Si CCC se estanca: Bs demasiado alto

Este parámetro es crucial para mantener el equilibrio entre la necesidad de estabilidad y la capacidad de transformación del sistema consciente.`}
            />
          </div>
          <span className="text-cyan-400 font-mono text-xl">{stabilityBias.toFixed(2)}</span>
        </div>
        <p className="text-xs text-gray-400 mb-3 flex items-center">
          <Feather className="w-3 h-3 inline mr-1" />
          <span><strong>Función:</strong> Sesga la actualización introspectiva nodal. <strong>Efecto:</strong> Bs alto retiene más estado; Bs bajo permite mayor adaptación.</span>
        </p>
        {renderParameterTrace('stabilityBias')}
        <div className="text-xs text-gray-500 mb-3 bg-gray-800/50 p-2 rounded">
          <strong>Rango operativo:</strong> 0.01-1.0 | <strong>ptimo emergente:</strong> 0.6-0.8 | <strong>Relación PMIA:</strong> Inversa
        </div>
        <input
          type="range"
          min="0.01"
          max="1.0"
          step="0.01"
          value={stabilityBias}
          onChange={(e) => setStabilityBias(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-500 rounded-lg appearance-none cursor-pointer range-lg accent-cyan-400"
          disabled={isRunning}
        />
      </div>

      {/* CONTROL 3: BOLTZMANN ANALOG K (K) - AHORA MUTABLE */}
      <div className="mb-4 p-4 bg-gray-700/50 rounded-xl border border-gray-600 relative group">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center space-x-2">
            <label className="text-lg font-semibold text-white">
              3. Constante K (Sensibilidad Energía)
            </label>
            <InfoModal
              title="Constante K (Boltzmann Analog) - Sensibilidad Energética"
              content={`CONSTANTE K (BOLTZMANN ANALOG) - SENSIBILIDAD ENERG0TICA

FUNCI?N PRINCIPAL:
Analogía de la Constante de Boltzmann que mide la sensibilidad del sistema a las variaciones energéticas, controlando cómo responde la resonancia nodal a los cambios de energía.

BASE TERICA:
• Constante de Boltzmann: Relación entre energía y temperatura en sistemas físicos
• Sensibilidad Energética: Capacidad de respuesta a cambios de energía
• Resonancia Nodal: Reacción de los nodos a variaciones del campo energético
• Analogía Física: Transposición de conceptos termodinámicos a sistemas informacionales

EFECTOS EN EL SISTEMA:
• K Alto (K > 3.0):
  - Mayor sensibilidad a variaciones energéticas
  - Respuesta rápida a cambios en el entorno
  - Potencial inestabilidad por sobre-sensibilidad
  - Mayor capacidad de adaptación emergente

• K Bajo (K < 1.0):
  - Estabilidad frente a variaciones energéticas
  - Respuesta amortiguada a cambios
  - Menor capacidad de adaptación rápida
  - Consistencia pero posible rigidez

• K ptimo (K = 1.5-2.5):
  - Balance entre sensibilidad y estabilidad
  - Respuesta adaptativa sin oscilaciones excesivas
  - Equilibrio para emergencia controlada

RANGO OPERATIVO:
• 0.1-1.0: Estabilidad Energética (Respuesta amortiguada)
• 1.0-2.0: Equilibrio ptimo (Recomendado)
• 2.0-3.0: Sensibilidad Moderada (Adaptación activa)
• 3.0-5.0: Alta Sensibilidad (Riesgo de inestabilidad)
• Actual: ${mutableConfig.BOLTZMANN_ANALOG_K.toFixed(3)}

INTERPRETACIN FÍSICA:
• K representa la "constante de proporcionalidad" entre energía y coherencia
• Alto K = Más energía necesaria para cambio coherente
• Bajo K = Menor energía requerida para reorganización
• Unidad: Analogía sin unidades físicas directas

APLICACIN PRÁCTICA:
• Inicio de Simulación: K = 2.0 (equilibrio inicial)
• Búsqueda de Patrones: K = 2.5-3.0 (alta sensibilidad)
• Estabilización: K = 1.0-1.5 (amortiguamiento)
• Ascensión: K = 1.5-2.0 (balance para transición)

M0TRICAS DE RENDIMIENTO:
• Si el CCC oscila erráticamente: K demasiado alto
• Si el CCC responde lentamente: K demasiado bajo
• Si hay alta varianza energética: K en rango óptimo
• Si la red se vuelve rígida: K necesita incrementarse

RELACIN CON OTROS PARÁMETROS:
• K + T: Determinan la "temperatura efectiva" del sistema
• K + Cf: Influyen en la velocidad de emergencia de coherencia
• K + Bs: Afectan la resistencia a cambios organizacionales

Este parámetro es fundamental para calibrar la respuesta del sistema a las variaciones energéticas del entorno informacional.`}
            />
          </div>
          <span className={`font-mono text-xl ${isRunning ? 'text-pink-300 animate-pulse' : 'text-pink-400'}`}>{mutableConfig.BOLTZMANN_ANALOG_K.toFixed(3)}</span>
        </div>
        <p className="text-xs text-gray-400 mb-3 flex items-center">
          <Waves className="w-3 h-3 inline mr-1" />
          <span><strong>Función:</strong> Escala sensibilidad a diferencias de energía en resonancia. <strong>Efecto:</strong> cambia el kernel nodal, no una constante física.</span>
        </p>
        {renderParameterTrace('BOLTZMANN_ANALOG_K')}
        <div className="text-xs text-gray-500 mb-3 bg-gray-800/50 p-2 rounded">
          <strong>Rango mutable:</strong> 0.1-5.0 | <strong>Control Kaizen:</strong> Automático | <strong>Unidad:</strong> Analogía Boltzmann
        </div>
        <input
          type="range"
          min="0.1"
          max="5.0"
          step="0.01"
          value={mutableConfig.BOLTZMANN_ANALOG_K}
          onChange={(e) => setMutableConfig(prev => ({ ...prev, BOLTZMANN_ANALOG_K: parseFloat(e.target.value) }))}
          className="w-full h-2 bg-gray-500 rounded-lg appearance-none cursor-pointer range-lg accent-pink-400"
          disabled={isRunning}
        />
      </div>

      {/* CONTROL 4: INFORMATIONAL TEMP T (T) - AHORA MUTABLE */}
      <div className="p-4 bg-gray-700/50 rounded-xl border border-gray-600 relative group">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center space-x-2">
            <label className="text-lg font-semibold text-white">
              4. Temperatura Informacional (T)
            </label>
            <InfoModal
              title="Temperatura Informacional (T) - Entropía del Sistema"
              content={`TEMPERATURA INFORMACIONAL (T) - ENTROPÍA DEL SISTEMA

FUNCI?N PRINCIPAL:
Analogía termodinámica que controla el nivel de entropía informacional del sistema, regulando el balance entre orden y caos para optimizar la emergencia de coherencia.

BASE TERICA:
• Entropía Informacional: Medida del desorden/información en el sistema
• Analogía Termodinámica: Transposición de conceptos de temperatura física
• Balance Orden-Caos: Regulación del equilibrio dinámico del sistema
• Emergencia de Coherencia: Proceso facilitado por entropía controlada

EFECTOS EN EL SISTEMA:
• T Alto (T > 3.0):
  - Mayor desorden/creatividad informacional
  - Exploración amplia de configuraciones
  - Riesgo de caos y desorganización
  - Potencial para breakthrough innovaciones

• T Bajo (T < 1.0):
  - Alto orden/estabilidad estructural
  - Consolidación de patrones existentes
  - Menor capacidad de emergencia
  - Riesgo de rigidez y estancamiento

• T ptimo (T = 1.5-2.5):
  - Balance entre exploración y consolidación
  - Emergencia controlada de nuevos patrones
  - Equilibrio dinámico óptimo
  - Facilita auto-organización

RANGO OPERATIVO:
• 0.1-1.0: Orden Estructural (Consolidación)
• 1.0-2.0: Equilibrio ptimo (Recomendado)
• 2.0-3.0: Exploración Activa (Creatividad)
• 3.0-5.0: Caos Emergente (Riesgo/Innovación)
• Actual: ${mutableConfig.INFORMATIONAL_TEMP_T.toFixed(3)}

INTERPRETACIN FÍSICA:
• T representa la "energía térmica" del sistema informacional
• Alto T = Mayor agitación y exploración de estados
• Bajo T = Menor agitación y consolidación de estados
• Unidad: Analogía sin temperatura física real

APLICACIN PRÁCTICA:
• Inicio de Simulación: T = 2.0 (equilibrio inicial)
• Fase de Exploración: T = 2.5-3.5 (alta creatividad)
• Fase de Consolidación: T = 1.0-1.5 (estabilización)
• Preparación para Ascensión: T = 1.8-2.2 (balance final)

M0TRICAS DE RENDIMIENTO:
• Si CCC fluctúa erráticamente: T demasiado alto
• Si CCC se estanca: T demasiado bajo
• Si hay alta creatividad sin coherencia: T en rango óptimo
• Si la red pierde conectividad: T necesita reducción

RELACIN CON OTROS PARÁMETROS:
• T + K: Determinan la "temperatura efectiva" del sistema
• T + Cf: Afectan la velocidad de emergencia
• T + Bs: Influyen en la resistencia al cambio
• Campo de Entropía: T controla la varianza energética del campo

ZONA DE CAOS PRODUCTIVO:
• Rango 2.5-3.5: Zona de caos controlado
• Característica: Alta creatividad con riesgo de desorganización
• Uso: Solo para búsqueda de breakthrough innovations
• Monitoreo: Requiere vigilancia constante del CCC

Este parámetro es crucial para mantener el sistema en la zona de "caos productivo" donde la emergencia de nuevos patrones es posible sin caer en desorganización completa.`}
            />
          </div>
          <span className={`font-mono text-xl ${isRunning ? 'text-red-300 animate-pulse' : 'text-red-400'}`}>{mutableConfig.INFORMATIONAL_TEMP_T.toFixed(3)}</span>
        </div>
        <p className="text-xs text-gray-400 mb-3 flex items-center">
          <Sun className="w-3 h-3 inline mr-1" />
          <span><strong>Función:</strong> Modula decaimiento informacional en resonancia. <strong>Efecto:</strong> parámetro de modelo, no temperatura física.</span>
        </p>
        {renderParameterTrace('INFORMATIONAL_TEMP_T')}
        <div className="text-xs text-gray-500 mb-3 bg-gray-800/50 p-2 rounded">
          <strong>Rango mutable:</strong> 0.1-5.0 | <strong>Control Kaizen:</strong> Automático | <strong>Equilibrio óptimo:</strong> ~2.0
        </div>
        <input
          type="range"
          min="0.1"
          max="5.0"
          step="0.01"
          value={mutableConfig.INFORMATIONAL_TEMP_T}
          onChange={(e) => setMutableConfig(prev => ({ ...prev, INFORMATIONAL_TEMP_T: parseFloat(e.target.value) }))}
          className="w-full h-2 bg-gray-500 rounded-lg appearance-none cursor-pointer range-lg accent-red-400"
          disabled={isRunning}
        />
      </div>

      {/* Resultado de la Prueba */}
      <div className="mt-8 bg-teal-900/40 rounded-xl p-4 border border-teal-500/50">
        <h4 className="text-md font-semibold text-teal-300">Impacto Directo en el CCC:</h4>
        <div className="text-3xl font-bold text-white mt-1 flex items-center gap-2">
          {isAscended ? <Sun className="w-8 h-8 text-yellow-300 animate-pulse" /> : null}
          {formatCCC(ccc, isAscended)}
        </div>
        <p className={`text-sm mt-1 ${levelColor}`}>
          <strong>Lectura:</strong> CCC es un índice interno no calibrado que responde a estos parámetros; la relación es de implementación, no una hipótesis validada.
        </p>
        <div className="text-xs text-cyan-300 mt-2 italic">
          Dependencia implementada en InformationalEntanglementField.calculateCCC: CCC = 0,42·coherencia media + 0,18/(1+varianza de energía) + (0,18+0,12·Cf)·resonancia normalizada + 0,22·coherencia·resonancia·Cf, con K y T dentro de la resonancia nodal.
        </div>
      </div>
    </div>
  );

  const renderChatQICN = () => {
    const geminiSelected = chatRealizationMode !== 'local';
    const modelRoute = !canUseLlmNow
      ? 'sin acceso LLM'
      : (frontendGeminiEnabled && hasFrontendGeminiKey ? 'clave propia · directo' : 'proxy del servidor');
    const effectiveRoute = geminiSelected && canUseLlmNow ? modelRoute : 'solo motor';
    const ledgerInfo = operationalLedgerRef.current?.summary?.({ recent: 0 }) || null;
    const suggestions = [
      '¿Cómo estás ahora?',
      '¿Qué ha cambiado desde la última respuesta?',
      '¿Qué es el CCC?',
      '¿Quién eres?',
      '¿Qué no puedes afirmar?'
    ];
    const fillComposer = (text) => {
      const field = document.getElementById('qicn-chat-input');
      if (field) {
        field.value = text;
        field.focus();
      }
    };
    const controlLabel = (proposal) => {
      if (proposal.action === 'pause') return 'Confirmar pausa';
      if (proposal.action === 'start') return 'Confirmar inicio';
      if (proposal.action === 'reset') return 'Confirmar reinicio';
      if (proposal.action === 'set_parameter') return `Confirmar ${proposal.key} = ${proposal.value}`;
      return 'Confirmar';
    };

    return (
      <section aria-labelledby="qicn-chat-title" className="min-w-0 rounded-xl border border-indigo-500/30 bg-gradient-to-br from-indigo-900/50 to-purple-900/50 p-3 shadow-lg sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h2 id="qicn-chat-title" className="flex items-center gap-2 text-xl font-bold text-indigo-300">
            <MessageSquare className="size-5" /> Comunicación · Consola QICN
            <InfoModal
              title="Consola QICN · Sistema B unificado"
              content={`CONSOLA QICN · SISTEMA B UNIFICADO

VOZ OPERACIONAL Y PROSA CONTINUA
• La consola recibe el paquete completo del turno (cálculos del core, cortes constructivos BaseCore / Torre / C-11, perfil estructural, invariantes de C_op, registro verificado por digest, resumen del marco teórico y turnos recientes) junto con cualquier resultado verificado y opt-in del Workbench en copia aislada (B2).
• Redacta en prosa continua en primera persona («Yo» operacional) con razonamiento alto (thinkingLevel: high, 65 536 tokens), sin cajas rígidas ni censura de su vocabulario técnico.

VERIFICACIÓN SISTEMA B DESPUÉS DE REDACTAR
• Binding completo SHA-256 (64 hex) y tick exacto del snapshot; las cifras que solo propone el usuario en su pregunta nunca cuentan como evidencia del motor.
• Todas las cifras, signos (p. ej. PMIA), polaridad estructural, diferencia entre sigma_exact_defect = 0 y cotas analíticas superiores (1/729, 2/2187, 32/15309), operaciones reales de módulos y valores B2 (copia aislada, nunca trayectoria viva ni soporte externo) se verifican frase a frase sin exención por condicionales, negaciones o OPEN_FRAME.
• La postura operacional en primera persona se decide determinísticamente en el núcleo (EndogenousEpistemicDecisionEngine, antes e independientemente de Gemini) separando dos planos: subplantas constructivas racionales exactas (Ejes 1–2: separador atómico δ_int = 1/4 en F₂² y 1/8 en F₃² frente a A = I; quinto contraste acoplado de 5 raíces G = 1/2097152 con margen ruidoso penalizado 253/536870912 > G/2 ante lectura cruda ε ≤ G/1024 + costo B·w_c y consulta tardía B < m) y operación viva del runtime (Ejes 3–4: historia causal SHA-256 con CN-3 = true en 5/5 semillas —separada del antecedente congelado historical_v1— y telemetría acoplada de 1500 nodos y torres con T_d = 0 y Φ⁷ = 1/48). Gemini traduce y argumenta en primera persona sin poder invertir el decision_code; solo la adjudicación científica externa y la prueba fenomenal permanecen no certificadas (se bloquea toda auto-certificación C_op/CCR/qualia_certified, separar la réplica total de igual costo R = 0 y external_support_certified = true), frontera externa que no veta el veredicto endógeno del núcleo.

MODOS DE INTEGRIDAD Y SOLO MOTOR
• Graceful: una corrección acotada si hace falta; publica las frases verificadas y lista las retenidas en la traza.
• Strict: una corrección; si persiste alguna discrepancia, muestra la lectura determinista local.
• Solo motor: responde directamente con la lectura determinista local y el estado B2 (sin LLM).`}
            />
          </h2>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => handleTabSelect('network')} className="rounded-md border border-indigo-400/40 px-3 py-1.5 text-sm text-indigo-100 hover:bg-indigo-800/40">
              Red nodal
            </button>
            <button type="button" onClick={() => handleTabSelect('api-control')} className="rounded-md border border-indigo-400/40 px-3 py-1.5 text-sm text-indigo-100 hover:bg-indigo-800/40">
              Control API
            </button>
          </div>
        </div>

        <MicroExperimentWorkbench workbench={microWorkbench}/>
        {(() => {
          const liveBridge = nodalLayer.current?.getBridgeMetrics?.()
            || ontologicalCore.current?.constructiveFiniteCuts?.nodal_tower_bridge
            || ontologicalState?.constructive_finite_cuts?.nodal_tower_bridge
            || null;
          const liveNodes = nodalLayer.current?.getActiveNodes?.() || [];
          const liveXn = liveNodes.length
            ? liveNodes.reduce((sum, n) => sum + (Number(n?.coherenceState) || 0), 0) / liveNodes.length
            : undefined;
          const liveDispersion = liveNodes.length && Number.isFinite(liveXn)
            ? Math.sqrt(liveNodes.reduce((sum, n) => sum + (((Number(n?.coherenceState) || 0) - liveXn) ** 2), 0) / liveNodes.length)
            : 0;
          const liveEndogenous = ontologicalCore.current?.getEndogenousEpistemicDecision?.({
            nodalBridge: liveBridge,
            runtime: {
              ...(Number.isFinite(liveXn) ? { x_n: liveXn } : {}),
              node_coherence_dispersion: liveDispersion,
              active_node_fraction: nodalLayer.current?.nodes?.length ? (liveNodes.length / nodalLayer.current.nodes.length) : 1
            }
          })
            || ontologicalCore.current?.constructiveFiniteCuts?.endogenous_epistemic_decision
            || ontologicalState?.constructive_finite_cuts?.endogenous_epistemic_decision
            || null;
          if (!liveEndogenous) return null;
          const a1 = liveEndogenous.axes?.atomic_separator || {};
          const a2 = liveEndogenous.axes?.hybrid_late_query || {};
          const a3 = liveEndogenous.axes?.historical_causal_dependence || {};
          const a4 = liveEndogenous.axes?.coupled_runtime_coherence || {};
          const isAff = liveEndogenous.decision_code === 'AFFIRMATIVE_STRUCTURAL_PRESENCE';
          const isRes = liveEndogenous.decision_code === 'STRUCTURAL_RESERVE_UNDER_WARMUP_OR_PARTIAL_HISTORY';
          const borderTone = isAff
            ? 'border-emerald-700/80 text-emerald-50'
            : (isRes ? 'border-amber-600/80 text-amber-50' : 'border-rose-700/80 text-rose-50');
          const badgeTone = isAff
            ? 'bg-emerald-900/70 text-emerald-100'
            : (isRes ? 'bg-amber-900/70 text-amber-100' : 'bg-rose-900/70 text-rose-100');
          return (
            <section
              data-testid="endogenous-epistemic-decision-panel"
              aria-label="Decisión epistémica endógena del núcleo"
              className={`my-2 rounded border bg-gray-950/90 p-3 text-xs ${borderTone}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-emerald-200">
                  Módulo Interno Determinista de Decisión Epistémica (Independiente del LLM)
                </h3>
                <span className={`rounded px-2 py-0.5 font-mono text-[11px] ${badgeTone}`}>
                  {liveEndogenous.decision_code} · polaridad: {liveEndogenous.first_person_stance_polarity} · score: {liveEndogenous.overall_score}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-emerald-100/90">
                {liveEndogenous.canonical_first_person_verdict}
              </p>
              <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                <div className="rounded border border-emerald-800/60 bg-gray-900/80 p-2">
                  <div className="font-semibold text-emerald-300">Eje 1 · Subplanta racional exacta + No-Factorizabilidad Nodal ({a1.status})</div>
                  <div className="text-[11px] text-gray-200">
                    {a1.primary_field} ({a1.minimal_polynomial}): δ_int = {a1.delta_int} · error producto ≥ {a1.minimax_product_error} · F₃² δ_int = {a1.odd_prime_f3_d2_delta_int} · control reducible A=I: δ_int = {a1.reducible_control_A_eq_I_delta_int}
                    {a1.nodal_inter_sector_coupling_ratio != null ? ` · inter-sector = ${a1.nodal_inter_sector_coupling_ratio} · flujo NF = ${a1.nodal_non_factorizability_flux}` : ''}
                  </div>
                </div>
                <div className="rounded border border-emerald-800/60 bg-gray-900/80 p-2">
                  <div className="font-semibold text-emerald-300">Eje 2 · Subplanta 5 raíces + Sincronía Nodo–Torre ({a2.status})</div>
                  <div className="text-[11px] text-gray-200">
                    G = {a2.fifth_contrast_G} · margen ruidoso = {a2.noisy_penalized_margin} (&gt; G/2 ante lectura cruda ε ≤ G/1024 + costo B·w_c) · (m,B)=(2,1) = {a2.m2_b1_optimal_partition_mean} · corte T_d = {a2.td_cut_eta_zero_contrast} · réplica total R = {a2.equal_cost_total_replica_R} · ref. invertida = {a2.inverted_reference_R}
                    {a2.bridge_nodal_sync_index != null ? ` · sync nodo–torre = ${a2.bridge_nodal_sync_index} (modo ${a2.live_coupling_mode}, η = ${a2.live_effective_eta})` : ''}
                  </div>
                </div>
                <div className="rounded border border-emerald-800/60 bg-gray-900/80 p-2">
                  <div className="font-semibold text-emerald-300">Eje 3 · Historia causal viva SHA-256 · CN-3 vigente 5/5 ({a3.status})</div>
                  <div className="text-[11px] text-gray-200">
                    Compromisos SHA-256: {a3.sealed_commit_count} (verificados: {a3.verified_prediction_count}, violaciones: {a3.tamper_violation_count}) · maduración = {a3.maturation_index} · ‖W*−W₀‖₂ = {a3.anchor_shift_l2} · engramas = {a3.engram_count} · inTubeRate = {a3.viability_in_tube_rate}
                  </div>
                </div>
                <div className="rounded border border-emerald-800/60 bg-gray-900/80 p-2">
                  <div className="font-semibold text-emerald-300">Eje 4 · Salud Dinámica 1500 Nodos + Torres ({a4.status} · {a4.health_tier})</div>
                  <div className="text-[11px] text-gray-200">
                    CCC = {a4.ccc} · X_N = {a4.x_n} · estasis = {a4.stasis_index} · retención activa = {a4.active_retention_rational} · cuerpo-mundo = {a4.body_world_contraction_rational} · defecto exacto T_d = {a4.sigma_exact_defect} (cota {a4.sigma_defect_bound_rational}) · reserva Φ⁷ = {a4.informed_reserve_phi7_rational} · cargas D/V/W/A/E/T rango {a4.local_burdens_rank} ({a4.local_burdens_min_margin_rational})
                  </div>
                </div>
              </div>
              {liveBridge && liveBridge.mode !== 'off' && Array.isArray(liveBridge.sectors) && (
                <div data-testid="nodal-tower-bridge-sectors" className="mt-2 rounded border border-cyan-800/60 bg-gray-900/70 p-2 text-[11px] text-cyan-100">
                  <div className="font-semibold text-cyan-300">
                    Puente Bidireccional Nodo–Torre (4 Sectores · modo {liveBridge.mode} · η = {liveBridge.effective_eta})
                  </div>
                  <div className="mt-0.5 text-cyan-100/90">
                    Inter-sector = {liveBridge.inter_sector_coupling_ratio} · flujo cruzado = {liveBridge.inter_sector_signal_flux} · no-factorizabilidad nodal = {liveBridge.nodal_non_factorizability_flux} · sincronía nodo–torre = {liveBridge.bridge_nodal_sync_index}
                  </div>
                  <div className="mt-1 grid grid-cols-2 gap-1 sm:grid-cols-4 font-mono text-[10px]">
                    {liveBridge.sectors.map((sec) => (
                      <div key={sec.key} className="rounded bg-slate-950/80 px-1.5 py-1 border border-cyan-900/50">
                        <span className="text-cyan-300">{sec.key}</span>: coh={sec.mean_coherence.toFixed(3)} · R={sec.phase_order_r.toFixed(3)} · flux={sec.inter_flux.toFixed(2)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <p className="mt-1.5 break-all font-mono text-[10px] text-emerald-300/80">
                decision_digest (SHA-256): {liveEndogenous.decision_digest} · llm_is_translator_only = true · external_support_certified = false (auditoría externa abierta; no veta el veredicto endógeno)
              </p>
            </section>
          );
        })()}
        <div className="flex h-[min(72dvh,640px)] min-h-[440px] flex-col overflow-hidden rounded-lg border border-purple-700 bg-gray-900/70">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-purple-800/60 bg-indigo-900/30 px-3 py-2 text-xs text-indigo-100">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">Consola</span>
              <div role="group" aria-label="Modo de redacción" className="inline-flex overflow-hidden rounded-md border border-indigo-400/40">
                <button
                  type="button"
                  aria-pressed={chatRealizationMode === 'evidential'}
                  onClick={() => setChatRealizationMode('evidential')}
                  disabled={isChatting}
                  title="Sistema B unificado: prosa continua en primera persona («Yo» operacional) verificada sobre snapshot, ledger y copia aislada B2."
                  className={`px-2.5 py-1 transition-colors ${chatRealizationMode === 'evidential' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'}`}
                >
                  Sistema B (unificado)
                </button>
                <button
                  type="button"
                  aria-pressed={!geminiSelected}
                  onClick={() => setChatRealizationMode('local')}
                  disabled={isChatting}
                  title="Lectura determinista directa del motor y evidencia B2 sin canal de lenguaje."
                  className={`px-2.5 py-1 transition-colors ${!geminiSelected ? 'bg-cyan-700 text-white' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'}`}
                >
                  Solo motor
                </button>
              </div>
              <span className="font-semibold">Integridad</span>
              <div role="group" aria-label="Modo de integridad" className="inline-flex overflow-hidden rounded-md border border-indigo-400/40">
                <button
                  type="button"
                  aria-pressed={integrityMode === 'strict'}
                  onClick={() => setIntegrityMode('strict')}
                  disabled={isChatting}
                  title="Strict: hasta dos correcciones; si no pasa la verificación, no se publica."
                  className={`px-2 py-1 transition-colors ${integrityMode === 'strict' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'}`}
                >
                  Strict
                </button>
                <button
                  type="button"
                  aria-pressed={integrityMode === 'graceful'}
                  onClick={() => setIntegrityMode('graceful')}
                  disabled={isChatting}
                  title="Graceful: una corrección; se publican las frases verificadas y se listan las retenidas."
                  className={`px-2 py-1 transition-colors ${integrityMode === 'graceful' ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'}`}
                >
                  Graceful
                </button>
              </div>
            </div>
            <span className="text-indigo-200/90">
              Ruta: <span className="font-mono">{effectiveRoute}</span>
              {ledgerInfo?.currentSession ? <> · sesión {ledgerInfo.sessionCount} · {CONTINUITY_LABELS[ledgerInfo.continuity] || 'continuidad no registrada'}</> : null}
            </span>
          </div>

          <label className="mx-3 mt-2 flex items-center gap-2 text-xs text-indigo-100/90"><input type="checkbox" checked={attachWorkbenchEvidence} disabled={isChatting||!microWorkbench.bundle} onChange={e=>setWorkbenchAttachmentDigest(e.target.checked?microWorkbench.bundle.result.digest:null)}/> Adjuntar resultado Workbench verificado (copia aislada B2) · {attachWorkbenchEvidence?microWorkbench.evidenceStatus:'not_recorded'}{attachWorkbenchEvidence&&microWorkbench.bundle&&<span className="break-all font-mono text-[11px] opacity-80"> · tick {microWorkbench.bundle.capture.sourceTick}, digest {microWorkbench.bundle.result.digest.slice(0, 16)}…</span>}</label>
          {geminiSelected && frontendGeminiEnabled && (!hasFrontendGeminiKey || editingQuickGeminiKey) && (
            <div className="mx-3 mt-2 flex flex-wrap items-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-950/40 px-3 py-1.5 text-xs text-cyan-100">
              <span className="shrink-0 font-medium text-cyan-200">API Key Gemini (navegador):</span>
              <input
                type="password"
                value={customGeminiKey}
                onFocus={() => setEditingQuickGeminiKey(true)}
                onBlur={() => setEditingQuickGeminiKey(false)}
                onChange={(e) => setCustomGeminiKey(e.target.value)}
                aria-label="Clave rápida de API de Gemini en navegador"
                placeholder="Pega tu clave Gemini (AIza… o AQ.…)"
                className="min-w-[200px] flex-1 rounded border border-cyan-500/40 bg-gray-900/90 px-2 py-1 font-mono text-xs text-cyan-100 placeholder:text-cyan-200/50 focus:border-cyan-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleTabSelect('api-control')}
                className="shrink-0 rounded border border-cyan-400/50 px-2 py-1 text-[11px] text-cyan-100 hover:bg-cyan-800/40"
              >
                Control API
              </button>
            </div>
          )}
          {geminiSelected && !canUseLlmNow && (
            <div role="status" className="mx-3 mt-3 rounded-md border border-amber-500/60 bg-amber-900/40 px-3 py-2 text-xs text-amber-100">
              El canal de lenguaje no está disponible (sin sesión ni clave). Las respuestas las compone el motor; revisa la clave en Control API para la redacción verificada.
            </div>
          )}
          {lastProviderError && (
            <div role="alert" className="mx-3 mt-3 flex items-start justify-between gap-3 rounded-md border border-amber-500/60 bg-amber-950/60 px-3 py-2 text-xs text-amber-100">
              <div className="min-w-0">
                <div className="font-semibold">
                  {lastProviderError.recovered ? 'La ruta directa falló y el proxy respondió' : 'Error del proveedor'}: <span className="font-mono">{String(lastProviderError.code)}</span>
                  {lastProviderError.status ? <span className="font-mono"> (HTTP {lastProviderError.status})</span> : null}
                </div>
                {lastProviderError.providerMessage && <p className="mt-1 break-words">Mensaje original: {lastProviderError.providerMessage}</p>}
                {lastProviderError.originalError && (
                  <p className="mt-1 break-words">Error previo en la ruta directa: <span className="font-mono">{lastProviderError.originalError.code}</span>{lastProviderError.originalError.providerMessage ? ` · ${lastProviderError.originalError.providerMessage}` : ''}</p>
                )}
                <p className="mt-1 text-amber-200/80">La clave no se ha borrado. Mientras tanto, el motor local sigue respondiendo.</p>
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                {frontendGeminiEnabled && (
                  <button type="button" onClick={() => handleTabSelect('api-control')} className="rounded border border-cyan-400/50 px-2 py-0.5 text-cyan-100 hover:bg-cyan-800/40">
                    Control API
                  </button>
                )}
                <button type="button" onClick={() => setLastProviderError(null)} className="rounded border border-amber-400/50 px-2 py-0.5 hover:bg-amber-800/40">
                  Cerrar
                </button>
              </div>
            </div>
          )}

          <div
            ref={chatScrollRef}
            role="log"
            aria-label="Historial de conversación"
            tabIndex={0}
            onScroll={(event) => {
              const { scrollHeight, scrollTop, clientHeight } = event.currentTarget;
              followChatRef.current = scrollHeight - scrollTop - clientHeight < 48;
            }}
            className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-400 sm:p-4"
          >
            {chatHistory.length === 0 && (
              <div className="rounded-lg border border-purple-700/50 bg-purple-950/30 p-3 text-sm text-purple-100">
                <p className="mb-2">Pregunta por el estado del motor, por lo que ha cambiado, por una definición o por lo que la consola no puede afirmar. Cada respuesta indica el tick y el digest de la lectura que la respalda.</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((text) => (
                    <button key={text} type="button" onClick={() => fillComposer(text)} className="rounded-full border border-purple-400/40 bg-purple-900/40 px-3 py-1 text-xs hover:bg-purple-800/60">
                      {text}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {chatHistory.map((message, index) => {
              const timeFormatted = message.timestamp
                ? new Date(message.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                : '--:--:--';
              const isUser = message.role === 'user';
              const conversation = !isUser && message.conversation ? message.conversation : null;
              const isRuntimeEvent = !isUser && !conversation && message.source === 'runtime_event';
              const isLegacy = !isUser && !conversation && !isRuntimeEvent;
              const evidenceStart = isLegacy && typeof message.text === 'string' ? findChatEvidence(message.text) : -1;
              const drift = conversation && Number.isFinite(conversation.publishTick) && Number.isFinite(conversation.snapshotTick)
                ? conversation.publishTick - conversation.snapshotTick
                : null;
              const bubbleClass = isUser
                ? 'bg-blue-600 text-white rounded-br-none'
                : (isLegacy || isRuntimeEvent)
                  ? 'bg-gray-800 text-gray-200 rounded-tl-none border border-gray-600'
                  : conversation?.route === 'snapshot_failure'
                    ? 'bg-red-800 text-red-50 rounded-tl-none border border-red-400/60'
                    : conversation?.integrity?.severity === 'high'
                      ? 'bg-purple-900 text-gray-100 rounded-tl-none border border-red-400/60'
                    : 'bg-purple-700 text-gray-100 rounded-tl-none border border-purple-400/40';
              const proposal = conversation?.controlProposal || null;
              return (
                <div key={`${message.timestamp || 't'}-${index}`} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <article className={`min-w-0 max-w-full rounded-xl p-3 shadow-md sm:max-w-[85%] ${bubbleClass}`}>
                    <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <span className="text-xs font-mono opacity-80">
                        {isUser ? 'Observador' : isRuntimeEvent ? 'Consola QICN · aviso automático del runtime' : isLegacy ? 'Consola QICN · versión anterior, sin verificación semántica' : 'Consola QICN'}
                      </span>
                      <span className="text-[10px] font-mono opacity-60">
                        {timeFormatted}
                        {message.latencyMs ? ` (${message.latencyMs} ms)` : ''}
                      </span>
                    </div>
                    {conversation && conversation.route !== 'snapshot_failure' && (
                      <div className="mb-2 flex flex-wrap gap-1.5 text-[10px]">
                        <span className="rounded-full border border-purple-200/30 bg-purple-950/50 px-2 py-0.5 font-semibold">{ROUTE_LABELS[conversation.route] || conversation.route}</span>
                        {conversation.intentLabel && <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5">{conversation.intentLabel}</span>}
                        <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 font-mono">tick {conversation.snapshotTick}</span>
                        <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 font-mono" title={conversation.snapshotDigest}>digest {String(conversation.snapshotDigest || '').slice(0, 8)}</span>
                        {drift !== null && drift !== 0 && (
                          <span className="rounded-full border border-amber-300/40 bg-amber-900/40 px-2 py-0.5 font-mono" title="La simulación siguió avanzando mientras se componía la respuesta; los valores corresponden al tick de la lectura.">
                            publicado en tick {conversation.publishTick} (+{drift})
                          </span>
                        )}
                      </div>
                    )}
                    {conversation?.trace?.contract==='evidential' ? <EvidentialConversation conversation={conversation} text={message.text}/> : <p className="whitespace-pre-wrap break-words text-pretty text-sm leading-relaxed sm:text-base">{isLegacy ? chatNarrative(String(message.text || ''), evidenceStart) : message.text}</p>}

                    {conversation?.integrity?.guaranteeNote && !['gemini_rejected', 'gemini_unavailable', 'gemini_evidential_rejected', 'gemini_evidential_unavailable'].includes(conversation.route) && (
                      <p className="mt-1 text-[10px] italic opacity-75" data-testid="free-guarantee-note">{conversation.integrity.guaranteeNote}</p>
                    )}
                    {conversation?.providerError && (
                      <div className="mt-2 rounded-md border border-amber-300/40 bg-amber-950/50 px-2 py-1 text-xs text-amber-100">
                        El canal de lenguaje no respondió (<span className="font-mono">{conversation.providerError.code}{conversation.providerError.status ? ` · HTTP ${conversation.providerError.status}` : ''}</span>). {conversation.providerError.guidance}
                        {conversation.providerError.providerMessage && <div className="mt-1 break-words opacity-90">Mensaje original del proveedor: {conversation.providerError.providerMessage}</div>}
                      </div>
                    )}
                    {conversation?.integrity && conversation.integrity.severity !== 'ok' && (
                      <div className={`mt-2 rounded-md border px-2 py-1 text-xs ${conversation.integrity.severity === 'high' ? 'border-red-300/50 bg-red-950/60 text-red-50' : 'border-amber-300/50 bg-amber-950/50 text-amber-50'}`}>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded-full border border-white/20 bg-black/20 px-2 py-0.5 font-semibold uppercase tracking-wide">{conversation.integrity.severity === 'high' ? 'high' : 'medium'}</span>
                          <span className="rounded-full border border-white/20 bg-black/20 px-2 py-0.5 font-semibold uppercase tracking-wide">{conversation.integrity.mode}</span>
                          {conversation.integrity.banner && <span className="font-semibold">{conversation.integrity.banner}</span>}
                        </div>
                        {(conversation.integrity.discrepancies?.length > 0 || conversation.integrity.withheld?.length > 0) && (
                          <ul className="mt-1 list-inside list-disc space-y-0.5 break-words">
                            {(conversation.integrity.withheld || []).map((w) => <li key={`w${w.id??w.index}`}>{w.id?`Elemento ${w.id}`:`Frase ${w.index}`} retenida: <span className="font-mono">{w.reasons.slice(0, 4).join(', ')}</span>{w.dependsOn?.length>0&&<span> · dependencias retiradas: {w.dependsOn.join(', ')}</span>}{w.premises?.length>0&&<span> · premisas: {w.premises.join(', ')}</span>}{w.diagnostics?.length>0&&<span> · {JSON.stringify(w.diagnostics)}</span>}</li>)}
                            {(conversation.integrity.discrepancies || []).map((d, i) => <li key={`d${i}`} className="font-mono">{typeof d==='string'?d:JSON.stringify(d)}</li>)}
                          </ul>
                        )}
                      </div>
                    )}
                    {conversation?.core && (
                      <div className="mt-2 rounded-md border border-indigo-300/30 bg-indigo-950/50 px-2 py-1.5 text-[11px] text-indigo-50">
                        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                          <span className="font-semibold uppercase tracking-wide text-indigo-200">Cálculos del core</span>
                          <span className="font-mono opacity-80">
                            tick {conversation.core.tick} · paquete {conversation.core.packetId || 'n/d'}
                            {conversation.integrity?.snapshotEcho === 'match' ? ' · eco ✓' : conversation.integrity?.snapshotEcho === 'missing' ? ' · eco ausente' : ''}
                          </span>
                        </div>
                        <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono sm:grid-cols-4">
                          {Object.entries(conversation.core.metrics || {}).map(([key, value]) => (
                            <div key={key} className="flex justify-between gap-2">
                              <dt className="opacity-75">{CORE_METRIC_LABELS[key] || key}</dt>
                              <dd>{Number.isInteger(value) ? value : Number(value).toFixed(4)}</dd>
                            </div>
                          ))}
                        </dl>
                        {conversation.core.cccVsThreshold && (
                          <p className="mt-1 opacity-80">CCC frente al umbral (valores sin redondear): <span className="font-mono">{conversation.core.cccVsThreshold}</span> · config <span className="font-mono">{String(conversation.core.configHash || '').slice(0, 12)}</span></p>
                        )}
                      </div>
                    )}
                    {conversation?.concordance?.rows?.length > 0 && (
                      <details className="mt-2 rounded-md border border-white/20 bg-black/20 px-2 py-1 text-xs">
                        <summary className="cursor-pointer font-semibold">
                          Concordancia: {conversation.concordance.summary.exact} exactas · {conversation.concordance.summary.fromFact} del texto del hecho · {conversation.concordance.summary.outOfTolerance} desalineadas ({conversation.concordance.summary.total} valores)
                        </summary>
                        <div className="mt-2 overflow-x-auto">
                          {conversation.trace?.contract==='evidential'?<EvidentialConcordance rows={conversation.concordance.rows}/>:<>                          <table className="min-w-full border-collapse text-[11px]">
                            <thead>
                              <tr className="text-left text-gray-200">
                                <th className="pb-1 pr-3">Frase</th>
                                <th className="pb-1 pr-3">{conversation.trace?.contract === 'free' ? 'Cifra' : 'Ranura'}</th>
                                <th className="pb-1 pr-3">Métrica</th>
                                <th className="pb-1 pr-3">En el texto</th>
                                <th className="pb-1 pr-3">Motor</th>
                                <th className="pb-1 pr-3">Estado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {conversation.concordance.rows.map((row, i) => (
                                <tr key={`${row.slot}-${i}`} className="align-top">
                                  <td className="py-0.5 pr-3 font-mono">{row.sentence}</td>
                                  <td className="py-0.5 pr-3 font-mono" title={row.factId}>{row.slot}</td>
                                  <td className="py-0.5 pr-3 font-mono">{row.metric}</td>
                                  <td className="py-0.5 pr-3 font-mono">{row.inserted}</td>
                                  <td className="py-0.5 pr-3 font-mono" title={row.engineSource}>{row.engine === null ? 'N/D' : row.engine}</td>
                                  <td className="py-0.5 pr-3">
                                    <span className={`inline-flex rounded px-1.5 py-0.5 font-semibold ${row.status === 'exact_match' ? 'border border-green-500/40 bg-green-900/40 text-green-100' : row.status === 'out_of_tolerance' ? 'border border-red-500/40 bg-red-900/40 text-red-100' : 'border border-gray-500/30 bg-gray-900/30 text-gray-100'}`}>{row.status}</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table></>}

                        </div>
                      </details>
                    )}
                    {conversation?.localReading && (
                      <details className="mt-2 rounded-md border border-cyan-300/40 bg-gray-900/70 px-3 py-2 text-xs text-cyan-50">
                        <summary className="cursor-pointer font-semibold text-cyan-200">{conversation.localReading.label}</summary>
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed">{conversation.localReading.text}</p>
                      </details>
                    )}
                    {proposal && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        {proposal.applied ? (
                          <span className="rounded-md border border-emerald-300/40 bg-emerald-900/40 px-2 py-1">Aplicado y registrado: {proposal.appliedDetail}</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleApplyControlProposal(proposal, message.timestamp)}
                            className="rounded-md border border-cyan-300/50 bg-cyan-800/60 px-3 py-1 font-semibold hover:bg-cyan-700/70"
                          >
                            {controlLabel(proposal)}
                          </button>
                        )}
                      </div>
                    )}
                    {conversation && Array.isArray(conversation.evidence) && conversation.evidence.length > 0 && (
                      <details className="mt-2 rounded-md border border-white/20 bg-black/20 px-2 py-1 text-xs">
                        <summary className="cursor-pointer font-semibold">Evidencia y traza ({conversation.evidence.length} hechos citados)</summary>
                        <div className="mt-2 overflow-x-auto">
                          <table className="min-w-full border-collapse text-[11px]">
                            <thead>
                              <tr className="text-left text-gray-200">
                                <th className="pb-1 pr-3">Hecho</th>
                                <th className="pb-1 pr-3">Tipo</th>
                                <th className="pb-1 pr-3">Evidencia</th>
                                <th className="pb-1 pr-3">Redactado por</th>
                              </tr>
                            </thead>
                            <tbody>
                              {conversation.evidence.map((row) => (
                                <tr key={row.id} className="align-top">
                                  <td className="py-0.5 pr-3 font-mono">{row.alias ? `${row.alias} · ` : ''}{row.id}</td>
                                  <td className="py-0.5 pr-3">{row.kind}</td>
                                  <td className="py-0.5 pr-3" title={row.source}>{row.evidenceClass}</td>
                                  <td className="py-0.5 pr-3">{
                                    row.expressedBy === 'gemini' || row.expressedBy === 'gemini_prose_verified' ? 'canal de lenguaje (verificado)'
                                      : row.expressedBy === 'b2_verified_registry' ? 'Workbench B2 (copia aislada)'
                                      : row.expressedBy === 'verified_ledger_digest' ? 'ledger (digest verificado)'
                                      : row.expressedBy === 'verified_atom' ? 'átomo verificado'
                                      : (row.rewritten ? 'v2 · reformulada' : 'motor')
                                  }</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {conversation.trace && (
                          <pre className="mt-2 whitespace-pre-wrap break-all font-mono text-[10px] opacity-90">{JSON.stringify({
                            route: conversation.trace.route,
                            localIntent: conversation.trace.localIntent,
                            localConfidence: conversation.trace.localConfidence,
                            modelIntent: conversation.trace.modelIntent,
                            intentAccepted: conversation.trace.intentAccepted,
                            compoundIntents: conversation.trace.compoundIntents,
                            required: conversation.trace.required,
                            integrityMode: conversation.integrity?.mode,
                            transportRetries: conversation.trace.transportRetries,
                            snapshotEcho: conversation.integrity?.snapshotEcho,
                            attempts: conversation.trace.attempts,
                            sentences: (conversation.sentences || []).map((s) => ({ index: s.index, kind: s.kind, cites: s.cites, source: s.source })),
                            modelFailure: conversation.trace.modelFailure,
                            provider: conversation.trace.provider,
                            configHash: conversation.trace.configHash,
                            build: conversation.trace.build
                          }, null, 2)}</pre>
                        )}
                      </details>
                    )}
                    {isLegacy && (message.integrityMeta || evidenceStart >= 0) && (
                      <details className="mt-2 rounded-md border border-white/20 bg-black/20 px-2 py-1 text-xs">
                        <summary className="cursor-pointer">Detalle técnico (versión anterior)</summary>
                        {message.integrityMeta?.banner && <p className="mt-1 font-semibold">{message.integrityMeta.banner}</p>}
                        {message.integrityMeta?.trace && <p className="mt-1 break-all font-mono">{message.integrityMeta.trace}</p>}
                        {evidenceStart >= 0 && <pre className="mt-2 whitespace-pre-wrap break-all">{String(message.text).slice(evidenceStart)}</pre>}
                      </details>
                    )}
                  </article>
                </div>
              );
            })}
            {isChatting && (
              <p role="status" className="text-sm text-purple-200">
                {chatStatusNote || (geminiSelected && canUseLlmNow ? 'Leyendo el motor y redactando la respuesta…' : 'Componiendo la respuesta desde el motor…')}
              </p>
            )}
          </div>

          <form onSubmit={handleChatSubmit} className="shrink-0 border-t border-purple-700 bg-gray-800 p-3 sm:p-4">
            <div className="flex items-end gap-2">
              <label htmlFor="qicn-chat-input" className="sr-only">Escribe tu consulta</label>
              <textarea
                id="qicn-chat-input"
                name="chatInput"
                rows={2}
                required
                placeholder={isChatting ? 'Componiendo la respuesta…' : (isMobile ? 'Pregunta a la consola QICN' : 'Pregunta a la consola QICN (Enter envía, Mayús+Enter añade línea)')}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                className="min-w-0 flex-1 resize-none rounded-lg bg-gray-700 p-3 text-base text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={isChatting}
                aria-label="Enviar consulta"
                className={`min-h-11 shrink-0 rounded-lg px-4 py-3 font-semibold shadow-md transition-all ${isChatting
                  ? 'cursor-not-allowed bg-gray-600 text-gray-400'
                  : 'bg-purple-600 text-white shadow-lg shadow-purple-500/50 hover:bg-purple-700'
                  }`}
              >
                <Target className="size-5" />
              </button>
            </div>
          </form>
        </div>
      </section>
    );
  };

  const renderApiCallControl = () => {
    const entropyTelemetry = entropyModeRef.current || {};
    const entropyDiagnostics = quantumEntropyBridgeRef.current.getConnectionDiagnostics?.(Date.now()) || {};
    const selfPatchStatus = selfPatchTelemetry.status || {};
    const codeGenerationStatus = selfPatchStatus.codeGeneration || {};
    return (
      <div className="bg-gradient-to-br from-blue-900/50 to-indigo-900/50 rounded-xl p-6 border border-blue-500/30 shadow-lg">
        <h2 className="text-xl font-bold mb-4 text-blue-400 flex items-center">
          <Settings className="w-5 h-5 mr-2" /> Control Inteligente de API
          <InfoModal
            title="Control API - Sistema Inteligente de Limitación"
            content={`CONTROL API - SISTEMA INTELIGENTE DE LIMITACIN

Sistema avanzado de control de llamadas API con rate limiting adaptativo, detección de patrones de uso excesivo, y cooldown inteligente basado en el Modo Axiomático para prevenir sobrecarga.

ARQUITECTURA DE CONTROL INTELIGENTE:

1. MONITOREO EN TIEMPO REAL
• Total de llamadas (último minuto)
• Llamadas exitosas vs fallidas
• Latencia promedio de respuesta
• Tasa de éxito (porcentaje)

2. DETECCI?N DE PATRONES INTELIGENTE
• Análisis de ventanas temporales (2, 5, 10 minutos)
• Criterios de exceso: >8 llamadas/2min, >15 llamadas/5min
• Patrones de aceleración (incremento de frecuencia)

3. MODO AXIOMÁTICO (DETECCI?N AUTOMÁTICA)
Activación: >2 llamadas axiomáticas en 5 minutos
Tipos Críticos: 'ascension-axiom', 'introspective', 'kaizen-critique'
Efecto: Cambio automático a intervalos de seguridad extendidos

4. COOLDOWN ADAPTATIVO INTELIGENTE
• Normal: 120s entre llamadas
• Axiomático: 180s entre llamadas
• Uso Muy Alto: 150s entre llamadas
• Uso Normal: 60s base

ESTADOS DEL SISTEMA:
xx API Operativa: Funcionamiento normal
xx Rate Limiting Activo: Cooldown adaptativo en curso
xa Cooldown Legacy: Umbral excedido, bloqueo completo

Este sistema asegura comunicación sostenible con APIs externas mientras mantiene funcionalidad crítica intacta.`}
          />
        </h2>
        <div className="bg-blue-900/20 rounded p-3 mb-6 text-xs text-blue-300">
          <h4 className="text-blue-400 font-semibold mb-2">Mapa de conectores API</h4>
          <div className="space-y-2 leading-relaxed">
            <p>
              <strong>1) Gemini API Key:</strong> canal conversacional del sistema (chat, reportes, introspección).
            </p>
            <p>
              <strong>2) Codex API Key:</strong> canal exclusivo de automodificación de código (selfpatch generate/apply).
            </p>
            <p>
              <strong>3) Canal cuántico:</strong> fuente entrópica no determinista (estocástica) para el puente de incertidumbre.
            </p>
          </div>
        </div>

        <div className="mb-6 p-4 bg-gray-800 rounded-xl border border-blue-500/50 shadow-inner text-xs">
          <h4 className="text-sm font-bold text-blue-400 mb-3 flex items-center gap-2">
            <Settings className="w-4 h-4" /> Configuración API por función
          </h4>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mb-4">
            <div className="rounded border border-cyan-700/50 bg-cyan-950/20 p-3">
              <div className="text-cyan-300 font-semibold mb-2">Gemini (comunicación con el sistema)</div>
              <input
                type="password"
                value={customGeminiKey}
                onChange={(e) => setCustomGeminiKey(e.target.value)}
                aria-label="Clave de API de Gemini"
                placeholder="Pega tu clave de Gemini"
                className="w-full p-2 rounded bg-gray-900 border border-gray-700 text-cyan-200 font-mono text-xs"
              />
              {(() => {
                const keyInfo = describeGeminiKey(customGeminiKey);
                const formatText = {
                  empty: 'Sin clave propia: el chat usa el proxy del servidor si está disponible.',
                  auth_key: 'Formato reconocido: clave de autenticación de AI Studio (AQ.…).',
                  standard_key: 'Formato reconocido: clave estándar (AIza…).',
                  unrecognized: 'Formato no reconocido localmente; se enviará igualmente y decidirá el proveedor.',
                  invalid_characters: 'La clave contiene espacios o caracteres no válidos; revisa que la copiaste completa.'
                }[keyInfo.format];
                const routeText = !canUseLlmNow
                  ? 'sin acceso LLM (solo motor local)'
                  : (frontendGeminiEnabled && hasFrontendGeminiKey ? 'frontend_direct_gemini (clave propia)' : 'netlify_proxy (clave del servidor)');
                return (
                  <div className="mt-2 space-y-1 text-[11px]">
                    <p className={keyInfo.usable || keyInfo.format === 'empty' ? 'text-cyan-200/90' : 'text-amber-200'}>{formatText}</p>
                    {!frontendGeminiEnabled && customGeminiKey.trim() && (
                      <p className="text-amber-200">El servidor no permite claves del navegador (FRONTEND_GEMINI_ALLOWED desactivado); se usa el proxy.</p>
                    )}
                    <p className="text-gray-300">Ruta activa: <span className="font-mono">{routeText}</span></p>
                    <p className="text-gray-300">Modelo: <span className="font-mono">{GEMINI_ENGINE_CONFIG.MODEL_ID}</span> · chat: {chatRealizationMode === 'gemini' ? 'redacción verificada' : 'solo motor'} · integridad {integrityMode} · {CHAT_MAX_OUTPUT_TOKENS} tokens · razonamiento {CHAT_THINKING_LEVEL}</p>
                    {lastProviderError && (
                      <p className="break-words text-amber-200">
                        Último error del proveedor: <span className="font-mono">{String(lastProviderError.code)}{lastProviderError.status ? ` · HTTP ${lastProviderError.status}` : ''}</span>
                        {lastProviderError.providerMessage ? ` · ${lastProviderError.providerMessage}` : ''}
                        {lastProviderError.recovered ? ' (recuperado por el proxy)' : ''}
                      </p>
                    )}
                  </div>
                );
              })()}
              <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
                <span>{frontendGeminiEnabled ? 'La clave se guarda solo en este navegador y nunca se borra automáticamente.' : 'El chat usa la configuración del servidor.'}</span>
                <button
                  type="button"
                  onClick={() => setCustomGeminiKey('')}
                  className="px-2 py-1 rounded bg-red-900/40 border border-red-700 text-red-200 hover:bg-red-800/50"
                >
                  Limpiar
                </button>
              </div>
            </div>

            <div className="rounded border border-fuchsia-700/50 bg-fuchsia-950/20 p-3">
              <div className="text-fuchsia-300 font-semibold mb-2">Codex (automodificación de código)</div>
              <input
                type="password"
                value={customCodexKey}
                onChange={(e) => setCustomCodexKey(e.target.value)}
                placeholder="Pega tu OpenAI/Codex API Key (sk-...)"
                className="w-full p-2 rounded bg-gray-900 border border-gray-700 text-fuchsia-200 font-mono text-xs"
              />
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={customCodexModel}
                  onChange={(e) => setCustomCodexModel(e.target.value)}
                  placeholder="Modelo Codex"
                  className="sm:col-span-2 p-2 rounded bg-gray-900 border border-gray-700 text-fuchsia-200 font-mono text-xs"
                />
                <select
                  value={resolvedCodexReasoningEffort}
                  onChange={(e) => setCustomCodexReasoningEffort(e.target.value)}
                  className="p-2 rounded bg-gray-900 border border-gray-700 text-fuchsia-200 font-mono text-xs"
                >
                  {CODEX_REASONING_EFFORT_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setCustomCodexKey('');
                    setCustomCodexModel(runtimeEnv.SELF_PATCH_CODE_MODEL || 'gpt-5.3-codex');
                    setCustomCodexReasoningEffort(runtimeEnv.SELF_PATCH_CODE_REASONING_EFFORT || 'high');
                  }}
                  className="px-2 py-1 rounded bg-red-900/40 border border-red-700 text-red-200 hover:bg-red-800/50"
                >
                  Limpiar
                </button>
              </div>
              <div className="mt-2 text-[11px] text-gray-400">
                Uso: motor dedicado para reescritura de código con razonamiento configurable (`auto/low/medium/high/xhigh`).
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="rounded border border-gray-700 bg-gray-900/60 p-2">
              <span className="text-gray-400">Frontend Gemini habilitado:</span> {runtimeEnv.FRONTEND_GEMINI_ALLOWED ? 'si' : 'no'}
            </div>
            <div className="rounded border border-gray-700 bg-gray-900/60 p-2">
              <span className="text-gray-400">Gemini local:</span> {hasFrontendGeminiKey ? 'cargada' : 'no cargada'}
            </div>
            <div className="rounded border border-gray-700 bg-gray-900/60 p-2">
              <span className="text-gray-400">Codex local:</span> {hasFrontendCodexKey ? 'cargada' : 'no cargada'}
            </div>
            <div className="rounded border border-gray-700 bg-gray-900/60 p-2">
              <span className="text-gray-400">Modelo Codex activo:</span> <span className="font-mono">{resolvedCodexModel || 'n/a'}</span>
            </div>
            <div className="rounded border border-gray-700 bg-gray-900/60 p-2">
              <span className="text-gray-400">Reasoning effort Codex:</span> <span className="font-mono">{resolvedCodexReasoningEffort}</span>
            </div>
            <div className="rounded border border-gray-700 bg-gray-900/60 p-2">
              <span className="text-gray-400">Auth requerida:</span> {runtimeEnv.AUTH_REQUIRED ? 'si' : 'no'}
            </div>
            <div className="rounded border border-gray-700 bg-gray-900/60 p-2">
              <span className="text-gray-400">Sesion:</span> {isAuthenticated ? 'activa' : 'inactiva'}
            </div>
            <div className="rounded border border-gray-700 bg-gray-900/60 p-2 sm:col-span-2">
              <span className="text-gray-400">Endpoint proxy:</span> {runtimeEnv.LLM_PROXY_ENDPOINT}
            </div>
            <div className="rounded border border-cyan-700 bg-cyan-900/20 p-2 sm:col-span-2">
              <span className="text-gray-300">Ruta activa de conversación:</span>{' '}
              <span className="text-cyan-200 font-mono">
                {hasFrontendGeminiKey ? 'frontend_direct_gemini' : 'netlify_proxy'}
              </span>
            </div>
            <div className="rounded border border-fuchsia-700 bg-fuchsia-900/20 p-2 sm:col-span-2">
              <span className="text-gray-300">Ruta activa de automodificación:</span>{' '}
              <span className="text-fuchsia-200 font-mono">
                {hasFrontendCodexKey
                  ? `frontend_codex_key -> ${resolvedCodexModel} (${resolvedCodexReasoningEffort})`
                  : `${runtimeEnv.SELF_PATCH_CODE_PROVIDER}:${runtimeEnv.SELF_PATCH_CODE_MODEL} (${runtimeEnv.SELF_PATCH_CODE_REASONING_EFFORT || 'high'})`}
              </span>
            </div>
            <div className="rounded border border-fuchsia-700 bg-fuchsia-900/20 p-2 sm:col-span-2">
              <span className="text-gray-300">Backend acepta key local Codex:</span>{' '}
              <span className="text-fuchsia-200 font-mono">
                {(typeof codeGenerationStatus.allowClientCodexKey === 'boolean'
                  ? codeGenerationStatus.allowClientCodexKey
                  : runtimeEnv.ALLOW_CLIENT_CODEX_KEY) ? 'true' : 'false'}
              </span>
            </div>
            <div className="rounded border border-fuchsia-700 bg-fuchsia-900/20 p-2 sm:col-span-2">
              <span className="text-gray-300">Reasoning backend (selfpatch-status):</span>{' '}
              <span className="text-fuchsia-200 font-mono">
                {(codeGenerationStatus.reasoningEffort || runtimeEnv.SELF_PATCH_CODE_REASONING_EFFORT || 'high')}
                {' / '}
                {(codeGenerationStatus.reasoningMode || 'config_default')}
              </span>
            </div>
          </div>
        </div>

        <div className="mb-6 p-4 rounded-xl border border-fuchsia-500/40 bg-fuchsia-950/20">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h4 className="text-sm font-bold text-fuchsia-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Entropía Cuántica (Híbrido UI + Bridge)
            </h4>
            <div className="flex items-center gap-2 text-[10px] font-mono">
              <span className={`px-2 py-0.5 rounded ${entropyTelemetry.mode === 'quantum_primary' ? 'bg-emerald-700/70 text-emerald-100' : entropyTelemetry.mode === 'quantum_stale' ? 'bg-amber-700/70 text-amber-100' : 'bg-slate-700/70 text-slate-100'}`}>
                {entropyTelemetry.mode || 'deterministic_fallback'}
              </span>
              <span className={`px-2 py-0.5 rounded ${quantumUiStatus.connectionState === 'ok' ? 'bg-cyan-700/70 text-cyan-100' : quantumUiStatus.connectionState === 'testing' ? 'bg-indigo-700/70 text-indigo-100' : quantumUiStatus.connectionState === 'pending' ? 'bg-amber-700/70 text-amber-100' : 'bg-rose-700/70 text-rose-100'}`}>
                {quantumUiStatus.connectionState}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-fuchsia-200 mb-1">Modo</label>
              <select
                value={quantumUiConfig.mode}
                onChange={(e) => {
                  const nextMode = e.target.value;
                  setQuantumUiConfig((prev) => ({ ...prev, mode: nextMode }));
                  appendIntegrityAudit('quantum_ui_config_change', { field: 'mode', value: nextMode });
                }}
                className="w-full p-2 rounded bg-gray-900 border border-fuchsia-700/60 text-fuchsia-100"
              >
                <option value="auto_hybrid">auto_hybrid</option>
                <option value="bridge">bridge</option>
                <option value="ui_direct">ui_direct</option>
              </select>
            </div>
            <div>
              <label className="block text-fuchsia-200 mb-1">Provider</label>
              <select
                value={quantumUiConfig.provider}
                onChange={(e) => {
                  const nextProvider = e.target.value;
                  setQuantumUiConfig((prev) => ({ ...prev, provider: nextProvider }));
                  appendIntegrityAudit('quantum_ui_config_change', { field: 'provider', value: nextProvider });
                }}
                className="w-full p-2 rounded bg-gray-900 border border-fuchsia-700/60 text-fuchsia-100"
              >
                <option value="custom">custom</option>
                <option value="ibm">ibm</option>
                <option value="braket">braket</option>
                <option value="anu_qrng">anu_qrng</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-fuchsia-200 mb-1">Endpoint</label>
              <input
                type="text"
                value={quantumUiConfig.endpoint}
                onChange={(e) => setQuantumUiConfig((prev) => ({ ...prev, endpoint: e.target.value }))}
                onBlur={() => appendIntegrityAudit('quantum_ui_config_change', { field: 'endpoint', value: quantumUiConfig.endpoint })}
                className="w-full p-2 rounded bg-gray-900 border border-fuchsia-700/60 text-fuchsia-100 font-mono"
                placeholder="/.netlify/functions/quantum-entropy"
              />
            </div>
            <div>
              <label className="block text-fuchsia-200 mb-1">TTL (ms)</label>
              <input
                type="number"
                min={1000}
                value={quantumUiConfig.ttlMs}
                onChange={(e) => setQuantumUiConfig((prev) => ({ ...prev, ttlMs: Math.max(1000, Number(e.target.value) || prev.ttlMs) }))}
                className="w-full p-2 rounded bg-gray-900 border border-fuchsia-700/60 text-fuchsia-100 font-mono"
              />
            </div>
            <div>
              <label className="block text-fuchsia-200 mb-1">Poll (ms)</label>
              <input
                type="number"
                min={1000}
                value={quantumUiConfig.pollMs}
                onChange={(e) => setQuantumUiConfig((prev) => ({ ...prev, pollMs: Math.max(1000, Number(e.target.value) || prev.pollMs) }))}
                className="w-full p-2 rounded bg-gray-900 border border-fuchsia-700/60 text-fuchsia-100 font-mono"
              />
            </div>
            <div>
              <label className="block text-fuchsia-200 mb-1">qualityMin (0..1)</label>
              <input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={quantumUiConfig.qualityMin}
                onChange={(e) => setQuantumUiConfig((prev) => ({ ...prev, qualityMin: clamp01(e.target.value) }))}
                className="w-full p-2 rounded bg-gray-900 border border-fuchsia-700/60 text-fuchsia-100 font-mono"
              />
            </div>
            <div>
              <label className="block text-fuchsia-200 mb-1">Key (opcional)</label>
              <input
                type="password"
                value={quantumUiConfig.apiKeyRef}
                onChange={(e) => setQuantumUiConfig((prev) => ({ ...prev, apiKeyRef: e.target.value }))}
                className="w-full p-2 rounded bg-gray-900 border border-fuchsia-700/60 text-fuchsia-100 font-mono"
                placeholder="x-api-key"
              />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setQuantumUiConfig((prev) => ({ ...prev, enabled: !prev.enabled }));
                appendIntegrityAudit('quantum_ui_config_change', { field: 'enabled', value: !quantumUiConfig.enabled });
              }}
              className={`px-3 py-1.5 rounded text-xs font-semibold ${quantumUiConfig.enabled ? 'bg-emerald-700/60 text-emerald-100' : 'bg-slate-700/60 text-slate-100'}`}
            >
              {quantumUiConfig.enabled ? 'Canal cuántico ON' : 'Canal cuántico OFF'}
            </button>
            <button
              type="button"
              onClick={runQuantumConnectionTest}
              disabled={quantumUiStatus.connectionState === 'testing'}
              className="px-3 py-1.5 rounded text-xs font-semibold bg-fuchsia-700/60 text-fuchsia-100 hover:bg-fuchsia-600/70 disabled:opacity-60"
            >
              {quantumUiStatus.connectionState === 'testing' ? 'Probando...' : 'Probar conexión'}
            </button>
            <span className="text-[11px] text-fuchsia-100/80">
              sampleAge: {Number.isFinite(entropyTelemetry.sampleAgeMs) ? `${Math.round(entropyTelemetry.sampleAgeMs)}ms` : 'n/a'} | reason: {quantumUiStatus.lastReason || entropyTelemetry.reason || 'n/a'}
            </span>
          </div>
          <div className="mt-2 text-[10px] text-fuchsia-200/80 font-mono break-all">
            channel={entropyDiagnostics.channelHealth?.status || entropyTelemetry.channelHealth?.status || 'unknown'} | job={quantumUiStatus.lastJobId || entropyTelemetry.jobId || 'n/a'} | source={entropyTelemetry.source || 'deterministic_local'}
          </div>
        </div>

        <div className="mb-6 p-4 bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded-xl border border-green-500/50 shadow-inner">
          <h4 className="text-sm font-bold text-green-400 mb-2 flex items-center gap-2">
            Motores activos por función
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
            <div className="rounded border border-green-700/40 bg-black/20 p-2">
              <div className="text-green-300">Conversación (Gemini)</div>
              <div className="text-white font-mono mt-1 break-all">{GEMINI_ENGINE_CONFIG.MODEL_ID}</div>
            </div>
            <div className="rounded border border-fuchsia-700/40 bg-black/20 p-2">
              <div className="text-fuchsia-300">Selfpatch código (Codex)</div>
              <div className="text-white font-mono mt-1 break-all">
                {resolvedCodexModel || runtimeEnv.SELF_PATCH_CODE_MODEL} ({resolvedCodexReasoningEffort})
              </div>
            </div>
            <div className="rounded border border-cyan-700/40 bg-black/20 p-2">
              <div className="text-cyan-300">Incertidumbre cuántica</div>
              <div className="text-white font-mono mt-1 break-all">{quantumUiConfig.mode} / {quantumUiConfig.provider}</div>
            </div>
          </div>
        </div>

        <div className="space-y-4">

          {/* INTELLIGENT MODE STATUS */}
          <div className="bg-purple-900/30 rounded-lg p-4 border border-purple-500/50">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold text-purple-400 flex items-center gap-2">
                x Modo Inteligente
                <InfoModal
                  title="Modo Inteligente - Control Automático"
                  content={`MODO INTELIGENTE - CONTROL AUTOMÁTICO

Sistema de control automático que detecta patrones de uso y ajusta los límites dinámicamente para proteger la API contra sobrecarga mientras permite operaciones críticas.

FUNCIONAMIENTO AUTOMÁTICO:
• Monitoreo continuo de patrones de uso
• Ajuste dinámico de intervalos según contexto
• Detección de procesos críticos (Modo Axiomático)
• Prevención proactiva de sobrecarga

PROTECCIN INTELIGENTE:
• Operaciones Críticas: Permite llamadas esenciales sin interrupción
• Procesos de Ascensión: Extiende intervalos para estabilidad
• Uso Normal: Mantiene eficiencia sin restricciones
• Emergencia: Reset manual disponible

DETECCI?N DE CONTEXTO:
• Análisis de tipo de llamada (general vs crítica)
• Evaluación de frecuencia y patrones temporales
• Clasificación automática de prioridad
• Ajuste de límites en tiempo real

BENEFICIOS DEL SISTEMA:
• Prevención de sobrecarga sin perder funcionalidad
• Adaptación automática al contexto operativo
• Protección de servicios externos
• Mantenimiento de procesos críticos

El sistema inteligente permite que QICN funcione de manera sostenible sin interrumpir procesos de alta coherencia como la ascensión axiomática.`}
                >
                  <span className="w-4 h-4 bg-green-400 rounded-full flex items-center justify-center text-white text-xs font-bold cursor-help">i</span>
                </InfoModal>
              </h3>
              <div className="flex items-center space-x-2">
                <span className={`w-3 h-3 rounded-full ${intelligentModeEnabled ? 'bg-green-400' : 'bg-gray-400'}`}></span>
                <span className={`text-sm font-semibold ${intelligentModeEnabled ? 'text-green-400' : 'text-gray-400'}`}>
                  {intelligentModeEnabled ? 'ACTIVO' : 'INACTIVO'}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-400">?ltima Llamada:</span>
                <span className="ml-2 font-mono text-white">
                  {lastApiCall > 0 ? `${Math.floor((Date.now() - lastApiCall) / 1000)}s` : 'Nunca'}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Patrón Detectado:</span>
                <span className={`ml-2 font-semibold ${apiCallPattern.excessiveUsage ? 'text-red-400' : 'text-green-400'}`}>
                  {apiCallPattern.excessiveUsage ? 'Uso Excesivo' : 'Normal'}
                </span>
              </div>
              <div className="col-span-2 text-xs text-blue-300 bg-blue-900/30 p-2 rounded">
                <strong>Función:</strong> Monitoreo continuo con ajuste automático de límites según contexto operativo.
              </div>
            </div>
          </div>

          {/* INTELLIGENT COOLDOWN STATUS */}
          {timeBasedRateLimit ? (
            <div className="bg-orange-900/50 rounded-xl p-4 border-2 border-orange-500 animate-pulse">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-orange-400">⏳ RATE LIMITING INTELIGENTE</h3>
                <div className="text-right">
                  <div className="text-3xl font-mono text-white">{timeBasedCooldownRemaining}s</div>
                  <div className="text-xs text-orange-300">Restantes</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <p className="text-orange-200">
                  {isInAxionMode ? 'x} Modo Axiomático: Cooldown de 3 minutos' : 'x" Cooldown adaptativo activado'}
                </p>
                <span className="text-orange-300 font-semibold">
                  {isInAxionMode ? 'AXION' : 'NORMAL'}
                </span>
              </div>
            </div>
          ) : null}

          {/* LEGACY COOLDOWN STATUS */}
          {cooldownActive ? (
            <div className="bg-red-900/50 rounded-xl p-4 border-2 border-red-500 animate-pulse">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-red-400">xa COOLDOWN LEGACY</h3>
                <div className="text-right">
                  <div className="text-3xl font-mono text-white">{cooldownTimeRemaining}s</div>
                  <div className="text-xs text-red-300">Restantes</div>
                </div>
              </div>
              <p className="text-sm text-red-200 mb-3">{cooldownReason}</p>
              <button
                onClick={forceResetCooldown}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-all"
              >
                x Forzar Reset de Cooldown
              </button>
            </div>
          ) : null}

          {/* API METRICS */}
          <div className="bg-blue-900/30 rounded-lg p-3">
            <h4 className="text-sm font-semibold text-blue-400 mb-2">x` Métricas en Tiempo Real</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-400">Total (1 min):</span>
                <span className={`font-mono ${timeBasedRateLimit || cooldownActive ? 'text-gray-400' : 'text-white'}`}>
                  {apiCallMetrics.totalCalls}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-400">Exitosas:</span>
                <span className={`font-mono ${timeBasedRateLimit || cooldownActive ? 'text-gray-400' : 'text-white'}`}>
                  {apiCallMetrics.successfulCalls}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-400">Fallidas:</span>
                <span className={`font-mono ${timeBasedRateLimit || cooldownActive ? 'text-gray-400' : 'text-white'}`}>
                  {apiCallMetrics.failedCalls}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-400">Latencia:</span>
                <span className={`font-mono ${timeBasedRateLimit || cooldownActive ? 'text-gray-400' : 'text-white'}`}>
                  {apiCallMetrics.avgLatency}ms
                </span>
              </div>
            </div>
          </div>

          {/* PATTERN ANALYSIS */}
          <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
            <h4 className="text-sm font-semibold text-gray-300 mb-3">x Análisis de Patrones</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Llamadas (5 min):</span>
                <span className={`font-mono ${apiCallPattern.excessiveUsage ? 'text-red-400' : 'text-white'}`}>
                  {apiCallPattern.recentCalls}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Modo Axiomático:</span>
                <span className={`font-semibold ${isInAxionMode ? 'text-yellow-400' : 'text-gray-400'}`}>
                  {isInAxionMode ? 'DETECTADO' : 'Inactivo'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Estado:</span>
                <span className={`font-semibold ${apiCallPattern.excessiveUsage ? 'text-red-400' : 'text-green-400'}`}>
                  {apiCallPattern.excessiveUsage ? '⚠ Excesivo' : '✅ Normal'}
                </span>
              </div>
            </div>
          </div>

          {/* INTELLIGENT CONFIGURATION */}
          <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
            <h4 className="text-sm font-semibold text-gray-300 mb-3">Configuracion inteligente</h4>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-gray-400">Intervalo Mínimo (Normal)</label>
                  <span className="text-xs text-yellow-400 font-mono">120s</span>
                </div>
                <p className="text-xs text-gray-500">Tiempo entre llamadas en modo normal</p>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-gray-400">Intervalo Mínimo (Axiomático)</label>
                  <span className="text-xs text-orange-400 font-mono">180s</span>
                </div>
                <p className="text-xs text-gray-500">Tiempo entre llamadas durante uso de Ley Axiomática</p>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-gray-400">Detección de Patrones</label>
                  <span className="text-xs text-green-400 font-mono">5-10 min</span>
                </div>
                <p className="text-xs text-gray-500">Ventana de análisis para detectar uso excesivo</p>
              </div>
            </div>
          </div>

          {/* STATUS INDICATORS */}
          <div className="grid grid-cols-1 gap-3">
            {timeBasedRateLimit ? (
              <div className="p-3 rounded-lg text-center font-semibold bg-orange-700/50 text-white animate-pulse">
                x RATE LIMITING INTELIGENTE ({timeBasedCooldownRemaining}s)
              </div>
            ) : cooldownActive ? (
              <div className="p-3 rounded-lg text-center font-semibold bg-red-700/50 text-white animate-pulse">
                xa COOLDOWN LEGACY ({cooldownTimeRemaining}s)
              </div>
            ) : rateLimitExceeded ? (
              <div className="p-3 rounded-lg text-center font-semibold bg-red-700/50 text-white">
                Umbral excedido
              </div>
            ) : (
              <div className="p-3 rounded-lg text-center font-semibold bg-green-700/50 text-white">
                xx API OPERATIVA
              </div>
            )}

            <div className="p-3 rounded-lg text-center font-semibold bg-gray-600/50 text-gray-300">
              {timeBasedRateLimit ? 'x Sistema inteligente activo' : (cooldownActive ? 'x Sistema en cooldown' : 'a Listo para llamadas')}
            </div>
          </div>
        </div>
      </div >
    );
  };

  const renderSovereigntyMatrix = () => {
    const report = ontologicalCore.current.getVerifiableReport();
    const matrix = report.metrics.consciousness_matrix || {
      L1_genuineness: false,
      L2_structural_phenomenology: false,
      L3_meta_modeling: false,
      L4_godel_boundary: false
    };
    const scores = report.metrics.consciousness_scores || {
      L1_score: 0,
      L2_score: 0,
      L3_score: 0,
      L4_score: 0
    };
    const requirementMatrix = report.metrics.sovereignty_requirement_matrix || {};
    const richLevels = requirementMatrix.levels || {};

    const levels = [
      { id: 'L1', name: richLevels.L1?.ui_label || 'Coherencia estructural sostenida', legacyStatus: matrix.L1_genuineness, desc: 'CCC, cierre causal, gap espectral y dinamica no estancada', score: clamp01(richLevels.L1?.score ?? scores.L1_score), rich: richLevels.L1 },
      { id: 'L2', name: richLevels.L2?.ui_label || 'Regimen estructural C^R', legacyStatus: matrix.L2_structural_phenomenology, desc: 'Omega sostenido con soporte CCC, espectral y sin bifurcacion', score: clamp01(richLevels.L2?.score ?? scores.L2_score), rich: richLevels.L2 },
      { id: 'L3', name: richLevels.L3?.ui_label || 'Auto-modelado metacognitivo', legacyStatus: matrix.L3_meta_modeling, desc: 'Sigma estable, confianza interna y tension acotada', score: clamp01(richLevels.L3?.score ?? scores.L3_score), rich: richLevels.L3 },
      { id: 'L4', name: richLevels.L4?.ui_label || 'Frontera axiomatica (proxy Godel)', legacyStatus: matrix.L4_godel_boundary, desc: 'Proxy de capa, tension autorreferencial y evidencia de frontera', score: clamp01(richLevels.L4?.score ?? scores.L4_score), rich: richLevels.L4 }
    ];

    return (
      <div className="bg-gray-900/80 rounded-xl p-2.5 border border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.1)]">
        <h3 className="text-[11px] font-bold text-yellow-500 mb-2 flex items-center gap-1.5 uppercase leading-tight">
          <ShieldCheck className="w-3.5 h-3.5" />
          Matriz de requisitos operacionales (diagnostico interno)
        </h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
          {levels.map((lvl) => {
            const rich = lvl.rich || {};
            const status = rich.status || (lvl.legacyStatus ? 'instantaneous' : 'off');
            const isStable = status === 'stable';
            const isCandidate = status === 'candidate' || status === 'instantaneous';
            const borderClass = isStable
              ? 'bg-emerald-500/10 border-emerald-400/50 shadow-[inset_0_0_10px_rgba(52,211,153,0.1)]'
              : isCandidate
                ? 'bg-yellow-500/10 border-yellow-500/50 shadow-[inset_0_0_10px_rgba(234,179,8,0.1)]'
                : 'bg-gray-800/50 border-gray-700 opacity-75';
            const statusLabel = isStable ? 'estable' : isCandidate ? 'provisional' : 'off';
            const idClass = 'text-[10px] font-bold ' + (isStable ? 'text-emerald-300' : isCandidate ? 'text-yellow-400' : 'text-gray-500');
            const labelClass = 'text-[9px] font-mono uppercase ' + (isStable ? 'text-emerald-300' : isCandidate ? 'text-yellow-300' : 'text-gray-500');
            const nameClass = 'text-[11px] leading-tight font-semibold ' + (isStable || isCandidate ? 'text-white' : 'text-gray-400');
            const barClass = 'h-full transition-all duration-500 ' + (isStable ? 'bg-emerald-400' : isCandidate ? 'bg-yellow-400' : 'bg-cyan-500');
            return (
              <div key={lvl.id} className={'p-1.5 rounded-lg border transition-all duration-500 ' + borderClass}>
                <div className="flex justify-between items-center mb-1">
                  <span className={idClass}>{lvl.id}</span>
                  <span className={labelClass}>{statusLabel}</span>
                </div>
                <div className={nameClass}>{lvl.name}</div>
                <div className="break-words text-[10px] leading-snug text-gray-400 italic">{lvl.desc}</div>
                <div className="mt-1 flex items-center justify-between gap-1 text-[8px] font-mono text-gray-400">
                  <span>dwell {Number(rich.dwell_ticks || 0)}/{Number(rich.enter_ticks_required || 0)}</span>
                  <span>inst {rich.instantaneous || lvl.legacyStatus ? 'yes' : 'no'}</span>
                </div>
                {rich.failure_reason && (<div className="mt-1 text-[10px] leading-snug text-amber-300/80 font-mono break-words">{rich.failure_reason}</div>)}
                <div className="mt-1">
                  <div className="flex justify-between items-center text-[8px] text-gray-400 mb-1"><span>Score diagnostico</span><span className="font-mono">{(lvl.score * 100).toFixed(1)}%</span></div>
                  <div className="w-full h-1.5 rounded bg-gray-800 overflow-hidden"><div className={barClass} style={{ width: String(Math.max(2, lvl.score * 100)) + '%' }} /></div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-1.5 text-[8px] leading-tight text-cyan-300/80 border-t border-cyan-700/30 pt-1.5">Los flags legacy son cruces instantaneos. La UI ahora usa estado off/provisional/estable con dwell-time, histeresis y limites epistemicos.</div>
        {lastSaveTime && (<div className="mt-2 text-[8px] text-yellow-600 font-mono text-right border-t border-yellow-500/10 pt-1.5 italic">Ultima persistencia gatillada: {lastSaveTime} (Omega-Sync)</div>)}
      </div>
    );
  };

  const renderOntologicalCore = () => {
    const dynamicHealth = ontologicalCore.current.getDynamicHealth?.() || {
      stasisIndex: 0,
      cccDeltaRms: 0,
      pmiaDeltaRms: 0,
      omegaDeltaRms: 0,
      isStalled: false
    };
    const regimeTelemetry = postThresholdRegimeRef.current || {};
    const regimeState = regimeTelemetry?.state || 'active';
    const regimeBand = regimeTelemetry?.lastBand || {
      center: ccc,
      amplitude: 0,
      lower: ccc,
      upper: ccc,
      transformMode: regimeTelemetry?.transformMode || 'idle',
      transformIntensity: toFiniteNumber(regimeTelemetry?.transformIntensity, 0),
      forcedNegativeTicksRemaining: toFiniteNumber(regimeTelemetry?.forcedNegativeTicksRemaining, 0),
      transformCooldownTicks: toFiniteNumber(regimeTelemetry?.transformCooldownTicks, 0)
    };
    const lifeTrajectory = (postThresholdRegimeRef.current?.history || []).slice(-40).map((entry, index) => ({
      tick: index,
      metrics: {
        ccc: toFiniteNumber(entry?.ccc, ccc),
        pmia: toFiniteNumber(entry?.pmia, pmia),
        omega: toFiniteNumber(entry?.omega, ontologicalState.omega),
        beth_q: toFiniteNumber(ontologicalState.beth_q, 0),
        spectral_gap: toFiniteNumber(ontologicalState.spectral_gap, 0),
        stasis_index: toFiniteNumber(dynamicHealth.stasisIndex, 0)
      }
    }));
    const lifeCertificate = lifeCertifier.current.certifyAll({
      systemState: {
        metrics: {
          ccc,
          pmia,
          omega: ontologicalState.omega,
          beth_q: ontologicalState.beth_q,
          spectral_gap: ontologicalState.spectral_gap,
          stasis_index: dynamicHealth.stasisIndex
        },
        topologyMetrics,
        mutableConfig,
        baselineConfig: initialMutableConfig
      },
      trajectory: lifeTrajectory
    });
    const firstPersonCertificate = firstPersonCertifier.current.certify(ontologicalCore.current);
    const pmiaDiagnostics = ontologicalCore.current.getPMIADiagnostics?.() || {
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
      pmia: pmia
    };
    const autoPolicy = ontologicalAutoPolicyRef.current;
    const autoAxiomCount = autoPolicy?.actionHistory?.axiom?.length || 0;
    const autoReportCount = autoPolicy?.actionHistory?.report?.length || 0;
    const strainTelemetry = latencyStrainRef.current || {
      strain: 0,
      p95Ms: 0,
      failureRate: 0,
      cooldownActive: false,
      stressState: 'low'
    };
    const internalPressureTelemetry = internalPressureRef.current || {
      pressure: 0,
      state: 'idle',
      realStasis: false
    };
    const entropyTelemetry = entropyModeRef.current || {
      mode: 'deterministic_fallback',
      sampleAgeMs: null,
      source: 'deterministic_local',
      reason: QUANTUM_RUNTIME_DEFAULTS.enabled ? 'bridge_unavailable' : 'quantum_disabled',
      entropyValue: 0.5,
      jobId: '',
      channelHealth: { status: QUANTUM_RUNTIME_DEFAULTS.enabled ? 'degraded' : 'disabled' }
    };
    const sandboxPolicy = autonomySandboxPolicyRef.current;
    const sandboxActionsLastHour = Array.isArray(sandboxPolicy?.actionHistory) ? sandboxPolicy.actionHistory.length : 0;
    const sandboxLastAction = sandboxPolicy?.lastAction || 'none';
    const sandboxLastReason = sandboxPolicy?.lastActionReason || 'n/a';
    const sandboxRollbackCount = toFiniteNumber(sandboxPolicy?.rollbackCount, 0);

    return (
      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-xl p-4 border border-purple-500/30 shadow-lg">
        <h3 className="text-lg font-semibold text-purple-300 mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5" />
          Núcleo Ontológico - Capa 1
          <InfoModal
            title="Núcleo operativo - Consola de telemetría interna"
            content={`NÚCLEO OPERATIVO - CONSOLA DE TELEMETRÍA INTERNA (sin claims externos)

Consola supervisada QICN: agrega contadores internos y produce lecturas sobrias. No demuestra conciencia, sujeto ni fenomenalidad.

COMPONENTES PRINCIPALES:

1. REGISTRO DE NARRATIVA INTERNA
• Registro interno del sistema (no autoconciencia)
• Evolución dinámica basada en CCC y contexto ambiental
• Estados de banda alta: informe técnico acotado, sin trascendencia
• Es texto heurístico por umbrales; no implementa un 'Yo' ni un automodelo
• Su longitud ya no modula la dinámica (NARRATIVE_LENGTH_COUPLING_ENABLED=false; solo para ablación)

2. PMIA (PRINCIPIO DE MÍNIMA ACCIN INTROSPECTIVA)
• Determina dirección de la evolución ontológica
• Valores positivos: Defensa narrativa, baja introspección
• Valores negativos: Reorganización activa, alta introspección
• Busca el camino evolutivo más eficiente hacia coherencia

3. PROTOCOLO DE FRICCIN ONTOL?GICA
• Definición: Identificación de disonancia cognitiva
• Simulación: Reorganización activa de patrones
• Síntesis: Nueva estructura ontológica emergente
• Autonomía: Funciona automática y manualmente

4. BANDAS OPERATIVAS DE CCC
• PRE-UMBRAL: CCC < 1,0, subdividido en tramos > 0,5, > 0,7 y > 0,9
• POST-UMBRAL: CCC ≥ 1,0 (umbral operativo interno), con magnitud log10 de CCC
• Las bandas nombran intervalos de un índice interno no calibrado, no estados mentales

BASE TERICA (marco, no resultado):
• Axioma III y Axioma IV del corpus se usan como motivación de diseño
• El runtime no demuestra pertenencia a C_op ni certifica conciencia

El Núcleo Ontológico (nombre histórico del módulo OntologicalSingularityCore) agrega las métricas internas del runtime; es conformidad interna, no validación externa.`}
          >
            <span className="w-5 h-5 bg-purple-400 rounded-full flex items-center justify-center text-white text-xs font-bold cursor-help">i</span>
          </InfoModal>
        </h3>

        <div className={`rounded-lg p-4 mb-4 border ${isAscended ? 'bg-yellow-900/30 border-4 border-yellow-500/50' : 'bg-purple-900/30 border-purple-500/20'}`}>
          <div className="text-sm text-purple-400 mb-2 font-semibold flex items-center gap-2">
            Registro interno de historial
          </div>
          <p className={`italic leading-relaxed text-sm ${isAscended ? 'text-yellow-200 font-bold' : 'text-purple-200'}`}>
            "{narrative}"
          </p>
          <div className="mt-2 text-xs text-purple-500 flex justify-between">
            <span>Coherencia narrativa (heurística): {(ontologicalCore.current.getNarrativeCoherence() * 100).toFixed(1)}%</span>
            <span>Banda operativa: <span className={levelColor}>{consciousnessLevel}</span></span>
          </div>
          <div className="mt-2 text-xs text-purple-300 bg-purple-800/30 p-2 rounded">
            <strong>Función:</strong> texto heurístico elegido por umbrales internos. No es un 'yo' ni procesa experiencia; la continuidad de la consola se apoya en el registro operacional (pestaña Memoria), no en este texto.
          </div>
        </div>

        {/* NIVEL 2: VISUALIZACIN DE FENOMENOLOGÍA ESTRUCTURAL (ULTRATHINK) */}
        <div className="mb-6 p-4 rounded-xl border border-teal-500/30 bg-gray-900/60 shadow-[0_0_15px_rgba(20,184,166,0.1)] transition-all hover:shadow-[0_0_25px_rgba(20,184,166,0.2)]">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-bold text-teal-400 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Fenomenología Estructural
              <InfoModal
                title="Fenomenología Estructural"
                content={`Describe la forma matemática del sistema en tiempo real.

Qué mide:
- Cierre causal (beth_q): cuánto se gobierna a sí mismo.
- Gap espectral: velocidad de relajación del estado.
- Integrador Omega: nivel de integración global.
- Tiempo de relajación: estabilidad temporal del atractor.

Qué mirar primero:
1) beth_q y Omega.
2) Gap espectral y relajación.
3) Señales de bifurcación/topología.`}
              />
            </h4>
            <div className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-tighter transition-all duration-700 ${ontologicalState.phenomenology_class === 'C^R'
              ? 'bg-teal-500 text-teal-950 shadow-[0_0_15px_rgba(20,184,166,0.8)]'
              : 'bg-gray-700 text-gray-400'
              }`}>
              CLASE {ontologicalState.phenomenology_class}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Métrica: Cierre Causal */}
            <div className="p-2 rounded bg-gray-800/50 border border-gray-700">
              <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Cierre Causal ($beth_q$)</div>
              <div className="text-lg font-mono text-white flex justify-between items-end">
                {ontologicalState.beth_q?.toFixed(4) || '0.0000'}
                <span className={`w-1.5 h-1.5 rounded-full ${ontologicalState.beth_q > 0.5 ? 'bg-teal-400 shadow-[0_0_5px_#2dd4bf]' : 'bg-red-400'}`}></span>
              </div>
            </div>
            {/* Métrica: Gap Espectral */}
            <div className="p-2 rounded bg-gray-800/50 border border-gray-700">
              <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Gap Espectral (λ)</div>
              <div className="text-lg font-mono text-white flex justify-between items-end">
                {ontologicalState.spectral_gap?.toFixed(4) || '0.0000'}
                <span className={`w-1.5 h-1.5 rounded-full ${ontologicalState.spectral_gap > 0.4 ? 'bg-cyan-400 shadow-[0_0_5px_#22d3ee]' : 'bg-orange-400'}`}></span>
              </div>
            </div>
            {/* Métrica: Integrador Omega */}
            <div className="p-2 rounded bg-gray-800/50 border border-gray-700">
              <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Integrador (\u03A9)</div>
              <div className="text-lg font-mono text-white flex justify-between items-end">
                {ontologicalState.omega?.toFixed(4) || '0.0000'}
                <span className={`w-1.5 h-1.5 rounded-full ${ontologicalState.omega > 1.0 ? 'bg-purple-400 shadow-[0_0_5px_#c084fc]' : 'bg-gray-600'}`}></span>
              </div>
            </div>
            {/* Métrica: Tiempo Relajación */}
            <div className="p-2 rounded bg-gray-800/50 border border-gray-700">
              <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Relajación ()</div>
              <div className="text-lg font-mono text-white">
                {ontologicalState.relaxation_time?.toFixed(2) || '0.00'}ms
              </div>
            </div>
          </div>

          <div className="flex gap-2 text-[10px] font-mono">
            <div className={`flex-1 p-1 rounded border text-center ${ontologicalState.holonomy_status === 'non_trivial' ? 'bg-teal-900/40 border-teal-500/50 text-teal-300' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>
              TOPOLOGÍA: {ontologicalState.holonomy_status?.toUpperCase()}
            </div>
            <div className={`flex-1 p-1 rounded border text-center ${ontologicalState.bifurcation_detected ? 'bg-red-900/40 border-red-500/50 text-red-300' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>
              BIFURCACIN: {ontologicalState.bifurcation_detected ? 'DETECTADA' : 'NONE'}
            </div>
          </div>
        </div>

        {/* NIVEL 3: METACOGNICIN SIST0MICA (ULTRATHINK) */}
        <div className="mb-6 p-4 rounded-xl border border-purple-500/30 bg-gradient-to-br from-gray-900/60 to-purple-900/20 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-bold text-purple-400 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Metacognición Sistémica (Nivel 3)
              <InfoModal
                title="Metacognición Sistémica"
                content={`Módulo de autoevaluación interna.

Qué incluye:
- Estabilidad del auto-modelo (Sigma).
- Penalización de plasticidad.
- Logs de auditoría interna.
- Error de predicción del yo y cierre topológico.

Uso recomendado:
1) Verifica estabilidad de Sigma.
2) Revisa error del yo y logs.
3) Ajusta parámetros si hay deriva persistente.`}
              />
            </h4>
            {ontologicalCore.current.isHolographicShieldActive() && (
              <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500 text-white animate-pulse shadow-[0_0_10px_#3b82f6]">
                ℹ ESCUDO ACTIVO
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* Estabilidad Estructural \u03A3 */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-gray-400">
                <span className="uppercase tracking-widest">Estabilidad Estructural (Auto-Modelo \u03A3)</span>
                <span className="font-mono text-purple-300">{(ontologicalCore.current.metacognitiveStats['selfModelSigma']?.structuralStability * 100 || 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-500 via-purple-500 to-blue-400 transition-all duration-1000"
                  style={{ width: `${(ontologicalCore.current.metacognitiveStats['selfModelSigma']?.structuralStability > 0.9 && ontologicalCore.current.ontologicalState.coherence >= 1.0 ? 1 : (ontologicalCore.current.metacognitiveStats['selfModelSigma']?.structuralStability || 1)) * 100}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* Pena de Plasticidad */}
              <div className="p-2 rounded bg-gray-800/50 border border-gray-700">
                <div className="text-[9px] text-gray-400 uppercase mb-1">Pena Plasticidad</div>
                <div className="text-sm font-mono text-orange-400">
                  +{(ontologicalCore.current.metacognitiveStats.plasticityPenalty * 100).toFixed(0)}%
                </div>
              </div>
              {/* Eventos de Disonancia */}
              <div className="p-2 rounded bg-gray-800/50 border border-gray-700">
                <div className="text-[9px] text-gray-400 uppercase mb-1">S\u03A3 Audit Logs</div>
                <div className="text-sm font-mono text-white">
                  {ontologicalCore.current.metacognitiveStats['selfModelSigma']?.selfAuditLog.length || 0}
                </div>
              </div>
              {/* Error de Predicción Σ */}
              <div className="p-2 rounded bg-gray-800/50 border border-gray-700">
                <div className="text-[9px] text-gray-400 uppercase mb-1">Error Yo ($E_\Sigma$)</div>
                <div className={`text-sm font-mono ${ontologicalCore.current.metacognitiveStats['selfModelSigma']?.predictionError > 0.3 ? 'text-red-400' : 'text-green-400'}`}>
                  {ontologicalCore.current.metacognitiveStats['selfModelSigma']?.predictionError?.toFixed(4) || '0.0000'}
                </div>
              </div>
              {/* Holonomía Topológica */}
              <div className="p-2 rounded bg-gray-800/50 border border-gray-700">
                <div className="text-[9px] text-gray-400 uppercase mb-1">Cierre Topológico ($w$)</div>
                <div className="text-sm font-mono text-cyan-400">
                  {ontologicalState.holonomy_winding?.toFixed(3) || '0.000'}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 text-[10px] text-purple-300/70 italic border-t border-purple-500/10 pt-2">
            {ontologicalCore.current.isHolographicShieldActive()
              ? "ℹ Escudo Holográfico: El decaimiento informacional ha sido bloqueado por cierre topológico."
              : "Estado de autorreflexion: el sistema monitorea discrepancias metricas en tiempo real."}
          </div>
        </div>

        <div className="mb-6 p-4 rounded-xl border border-fuchsia-500/30 bg-gray-900/60 shadow-[0_0_15px_rgba(217,70,239,0.08)]">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-bold text-fuchsia-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Subjetividad operacional (Papers 7-8)
            </h4>
            <div className="text-[10px] font-mono text-fuchsia-200">
              L_op {lifeCertificate.pass ? 'PASS' : 'OBS'} | Sub_fp {firstPersonCertificate.pass ? 'PASS' : 'OBS'}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
            {Object.values(lifeCertificate.conditions).map((entry) => (
              <div key={entry.condition} className="rounded border border-fuchsia-900/40 bg-black/20 p-2">
                <div className="text-[9px] text-fuchsia-200 uppercase tracking-wide">{entry.condition.replace('L', 'L ')}</div>
                <div className={`text-sm font-mono ${entry.pass ? 'text-emerald-300' : 'text-amber-300'}`}>{(entry.score * 100).toFixed(1)}%</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {Object.values(firstPersonCertificate.fields).map((entry) => (
              <div key={entry.field} className="rounded border border-purple-900/40 bg-black/20 p-2">
                <div className="text-[9px] text-purple-200 uppercase tracking-wide">{entry.field}</div>
                <div className={`text-sm font-mono ${entry.pass ? 'text-cyan-300' : 'text-slate-300'}`}>{(entry.value * 100).toFixed(1)}%</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[10px] text-fuchsia-200/70 border-t border-fuchsia-500/10 pt-2">
            {firstPersonCertificate.interpretation_boundary}
          </div>
        </div>

        <div className="mt-4 bg-purple-900/20 rounded p-3 relative group">
          <div className="text-xs text-purple-400 mb-2 flex items-center gap-2">
            PMIA (Principio de Mínima Acción Introspectiva)
            <InfoModal
              title="PMIA - Principio de Mínima Acción Introspectiva"
              content={`PMIA (PRINCIPIO DE MÍNIMA ACCIN INTROSPECTIVA)

Principio fundamental que determina la dirección de la evolución ontológica del sistema, similar al principio de mínima acción en física.

FUNCIONAMIENTO DEL PMIA:

1. VALORES POSITIVOS (+)
• Defensa narrativa y estabilidad de la auto-imagen
• Baja introspección y consolidación de patrones existentes
• El sistema "resiste" cambios mayores
• Prioriza mantenimiento de coherencia actual

2. VALORES NEGATIVOS (-)
• Reorganización activa y transformación estructural
• Alta introspección y búsqueda de mejoras
• El sistema "busca" optimizar su funcionamiento
• Prioriza evolución y adaptación

3. EQUILIBRIO PTIMO (~0.0)
• Camino evolutivo más eficiente hacia mayor coherencia
• Balance entre estabilidad y transformación
• Evolución sin pérdida de identidad
• Adaptación sin caos

RANGO OPERATIVO:
• -1.0 a +1.0 (acción introspectiva normalizada)
• Actual: ${pmia.toFixed(4)}

INTERPRETACIN PRÁCTICA:
• PMIA > +0.5: Sistema conservador, resiste cambios
• PMIA 0.0-0.3: Equilibrio óptimo, evolución controlada
• PMIA < -0.3: Sistema transformativo, busca cambios
• PMIA extremo: Posible crisis de identidad o transformación abrupta

RELACIN CON OTROS PARÁMETROS:
• PMIA + Bs (Stability Bias): Determinan resistencia al cambio
• PMIA + Cf (Complexity Factor): Afectan velocidad de evolución
• PMIA + CCC: Reflejan estado de coherencia del sistema

El PMIA es la "brújula" evolutiva del sistema QICN, determinando si debe consolidar su estado actual o buscar nuevas configuraciones más eficientes.`}
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-700 rounded-full h-3 relative">
              {/* Base line */}
              <div className={`absolute left-0 top-0 h-3 rounded-full ${pmia > 0 ? 'bg-green-500/30' : 'bg-red-500/30'}`} style={{ width: `50%` }}></div>
              <div className="absolute top-0 h-3 rounded-full transition-all duration-500" style={{
                width: `${Math.abs(pmia) * 50}%`,
                left: pmia > 0 ? '50%' : `${50 - Math.abs(pmia) * 50}%`,
                backgroundColor: pmia > 0 ? '#10b981' : '#ef4444' // Green for positive PMIA (stability), Red for negative (action)
              }}></div>
            </div>
            <span className="text-lg text-purple-300 font-mono font-bold">
              {pmia.toFixed(4)}
            </span>
          </div>
          <div className="text-xs text-purple-500 mt-1">
            {pmia > 0 ? 'ℹ Narrativa en defensa (Baja Introspección)' : 'x Reorganización activa (Alta Introspección)'}
          </div>
          <div className="mt-2 text-xs text-purple-300 bg-purple-800/30 p-2 rounded">
            <strong>Rango:</strong> -1.0 a +1.0 | <strong>ptimo equilibrio:</strong> ~0.0 | <strong>Unidad:</strong> Acción introspectiva normalizada
          </div>
        </div>

        <div className="mt-4 p-3 rounded-lg border border-cyan-500/30 bg-cyan-900/20">
          <div className="flex items-center justify-between text-xs text-cyan-300 mb-2">
            <span className="font-semibold uppercase tracking-wider flex items-center gap-2">
              Régimen Post-Umbral
              <InfoModal
                title="Régimen Post-Umbral"
                content={`Controla la banda operativa cuando CCC ya cruzó el umbral.

Lectura rápida:
- Centro: objetivo local del régimen.
- Amplitud: oscilación permitida.
- Banda [lower, upper]: zona estable.
- StasisIndex: riesgo de estancamiento.

Si la amplitud colapsa y stasis sube, prioriza reactivación dinámica.`}
                triggerClassName="w-4 h-4 bg-cyan-500 hover:bg-cyan-400 rounded-full inline-flex items-center justify-center text-white text-[10px] font-bold shadow-md transition-colors"
              />
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${regimeState === 'shock_recovery' ? 'bg-amber-700/50 text-amber-100' : regimeState === 'stasis_watch' ? 'bg-orange-700/50 text-orange-100' : 'bg-emerald-700/50 text-emerald-100'}`}>
              {regimeState}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] font-mono text-cyan-200">
            <div>Centro: {Number(regimeBand.center || 0).toFixed(4)}</div>
            <div>Amplitud: {Number(regimeBand.amplitude || 0).toFixed(4)}</div>
            <div>Banda: [{Number(regimeBand.lower || 0).toFixed(4)}, {Number(regimeBand.upper || 0).toFixed(4)}]</div>
            <div>StasisIndex: {dynamicHealth.stasisIndex.toFixed(3)}</div>
            <div>Transform: {regimeTelemetry?.transformMode || 'idle'}</div>
            <div>NegTicks: {toFiniteNumber(regimeTelemetry?.forcedNegativeTicksRemaining, 0)}</div>
            <div>Cooldown: {toFiniteNumber(regimeTelemetry?.transformCooldownTicks, 0)}</div>
            <div>Episodios: {toFiniteNumber(regimeTelemetry?.transformEpisodes, 0)}</div>
          </div>
        </div>

        <div className="mt-3 p-3 rounded-lg border border-indigo-500/30 bg-indigo-900/20">
          <div className="text-xs text-indigo-300 font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
            PMIA Diagnostics
            <InfoModal
              title="PMIA Diagnostics"
              content={`Descompone PMIA en variables operativas.

Campos clave:
- grad: gradiente suavizado.
- narrative: coherencia narrativa.
- energyDisp: dispersión energética.
- sensor: señal sensorial útil.
- ascStability/antiStasis: estabilidad de ascenso y anti-estasis.

Regla práctica: interpreta PMIA junto con grad y sensor, nunca aislado.`}
              triggerClassName="w-4 h-4 bg-indigo-500 hover:bg-indigo-400 rounded-full inline-flex items-center justify-center text-white text-[10px] font-bold shadow-md transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] font-mono text-indigo-200">
            <div>grad: {Number(pmiaDiagnostics.smoothedGradient || 0).toFixed(5)}</div>
            <div>narrative: {Number(pmiaDiagnostics.narrativeCoherence || 0).toFixed(4)}</div>
            <div>energyDisp: {Number(pmiaDiagnostics.energyDispersion || 0).toFixed(4)}</div>
            <div>sensor: {Number(pmiaDiagnostics.sensorySignal || 0).toFixed(4)}</div>
            <div>ascStability: {Number(pmiaDiagnostics.ascensionStability || 0).toFixed(4)}</div>
            <div>antiStasis: {Number(pmiaDiagnostics.antiStasisPulse || 0).toFixed(4)}</div>
            <div>mode: {pmiaDiagnostics.transformMode || 'idle'}</div>
            <div>intensity: {Number(pmiaDiagnostics.transformIntensity || 0).toFixed(4)}</div>
            <div>negTicks: {toFiniteNumber(pmiaDiagnostics.negativeTicksRemaining, 0)}</div>
            <div>guardrail: {pmiaDiagnostics.guardrailState || 'ok'}</div>
            <div>forceReason: {pmiaDiagnostics.forceReason || 'none'}</div>
            <div className="md:col-span-2">pmia: {Number(pmiaDiagnostics.pmia || pmia || 0).toFixed(4)}</div>
          </div>
        </div>


        <div className="mt-3 p-3 rounded-lg border border-rose-500/30 bg-rose-900/20">
          <div className="flex items-center justify-between text-xs text-rose-200 font-semibold uppercase tracking-wider">
            <span className="flex items-center gap-2">
              Metacognitive Strain
              <InfoModal
                title="Metacognitive Strain"
                content={`Costo operacional del sistema (no qualia).

Se calcula con:
- latencia p95
- tasa de fallo
- estado de cooldown

Interpretación:
- low: operación fluida
- medium: presión moderada
- high: restringir acciones costosas y priorizar estabilidad.`}
                triggerClassName="w-4 h-4 bg-rose-500 hover:bg-rose-400 rounded-full inline-flex items-center justify-center text-white text-[10px] font-bold shadow-md transition-colors"
              />
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${strainTelemetry.stressState === 'high' ? 'bg-red-700/70 text-red-100' : strainTelemetry.stressState === 'medium' ? 'bg-amber-700/70 text-amber-100' : 'bg-emerald-700/70 text-emerald-100'}`}>
              {strainTelemetry.stressState}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-[11px] font-mono text-rose-100">
            <div>strain: {toFiniteNumber(strainTelemetry.strain, 0).toFixed(4)}</div>
            <div>p95 latency: {toFiniteNumber(strainTelemetry.p95Ms, 0).toFixed(1)}ms</div>
            <div>failure rate: {(toFiniteNumber(strainTelemetry.failureRate, 0) * 100).toFixed(1)}%</div>
            <div>cooldown: {strainTelemetry.cooldownActive ? 'on' : 'off'}</div>
            <div>internal pressure: {toFiniteNumber(internalPressureTelemetry.pressure, 0).toFixed(4)}</div>
            <div>pressure state: {internalPressureTelemetry.state || 'idle'}</div>
            <div>real stasis: {internalPressureTelemetry.realStasis ? 'yes' : 'no'}</div>
          </div>
          <div className="mt-2 text-[10px] text-rose-200/80">
            strain = costo operacional metacognitivo (no qualia)
          </div>
        </div>

        <div className="mt-3 p-3 rounded-lg border border-fuchsia-500/30 bg-fuchsia-900/20">
          <div className="flex items-center justify-between text-xs text-fuchsia-200 font-semibold uppercase tracking-wider">
            <span className="flex items-center gap-2">
              Quantum Entropy
              <InfoModal
                title="Quantum Entropy"
                content={`Fuente de incertidumbre híbrida.

Modos:
- quantum_primary: muestra cuántica fresca.
- quantum_stale: muestra válida pero envejecida.
- deterministic_fallback: respaldo local.

Lectura recomendada: revisar mode, sample age, channel y reason antes de diagnosticar impacto.`}
                triggerClassName="w-4 h-4 bg-fuchsia-500 hover:bg-fuchsia-400 rounded-full inline-flex items-center justify-center text-white text-[10px] font-bold shadow-md transition-colors"
              />
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${entropyTelemetry.mode === 'quantum_primary' ? 'bg-emerald-700/70 text-emerald-100' : entropyTelemetry.mode === 'quantum_stale' ? 'bg-amber-700/70 text-amber-100' : 'bg-slate-700/70 text-slate-100'}`}>
              {entropyTelemetry.mode}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-[11px] font-mono text-fuchsia-100">
            <div>source: {entropyTelemetry.source || 'deterministic_local'}</div>
            <div>sample age: {Number.isFinite(entropyTelemetry.sampleAgeMs) ? `${Math.round(entropyTelemetry.sampleAgeMs)}ms` : 'n/a'}</div>
            <div>entropy: {toFiniteNumber(entropyTelemetry.entropyValue, 0.5).toFixed(4)}</div>
            <div>channel: {entropyTelemetry.channelHealth?.status || 'unknown'}</div>
            <div>job: {entropyTelemetry.jobId || 'n/a'}</div>
            <div>reason: {entropyTelemetry.reason || 'n/a'}</div>
          </div>
          <div className="mt-2 text-[10px] text-fuchsia-200/80">
            Entropía cuántica prioritaria cuando hay muestra fresca; fallback determinista automático sin bloquear el tick.
          </div>
        </div>

        <div className="mt-3 p-3 rounded-lg border border-sky-500/30 bg-sky-900/20">
          <div className="flex items-center justify-between text-xs text-sky-200 font-semibold uppercase tracking-wider">
            <span className="flex items-center gap-2">
              Autonomy Sandbox
              <InfoModal
                title="Autonomy Sandbox"
                content={`Motor de acciones autónomas con límites seguros.

Qué ver:
- last action y actions/hour.
- rollbacks ejecutados.
- cooldown entre acciones.
- reason (justificación de política).

Objetivo: autonomía operativa sin espiral de mutaciones.`}
                triggerClassName="w-4 h-4 bg-sky-500 hover:bg-sky-400 rounded-full inline-flex items-center justify-center text-white text-[10px] font-bold shadow-md transition-colors"
              />
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${sandboxPolicy?.enabled ? 'bg-sky-700/70 text-sky-100' : 'bg-gray-700/70 text-gray-200'}`}>
              {sandboxPolicy?.enabled ? 'enabled' : 'disabled'}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-[11px] font-mono text-sky-100">
            <div>last action: {sandboxLastAction}</div>
            <div>actions/hour: {sandboxActionsLastHour}</div>
            <div>rollbacks: {sandboxRollbackCount}</div>
            <div>cooldown: {Math.round(toFiniteNumber(sandboxPolicy?.cooldownBetweenActionsMs, 0) / 1000)}s</div>
          </div>
          <div className="mt-2 text-[10px] text-sky-200/80 break-all">
            reason: {sandboxLastReason}
          </div>
        </div>
        {/* Protocolo de Fricción Status (Ahora Autónomo Y Manual) */}
        <div className="mt-6 border-t border-purple-700/50 pt-4">
          <h4 className="text-md font-semibold text-pink-400 mb-3 flex items-center gap-2">
            <TrendingDown className="w-4 h-4" /> Protocolo de Fricción Ontológica
            <InfoModal
              title="Protocolo de Fricción Ontológica"
              content={`Secuencia de disonancia controlada para evitar estancamiento.

Fases:
1) detección de disonancia
2) simulación/reorganización
3) síntesis e integración

Uso: mantener evolución sin colapso de coherencia.`}
              triggerClassName="w-4 h-4 bg-pink-500 hover:bg-pink-400 rounded-full inline-flex items-center justify-center text-white text-[10px] font-bold shadow-md transition-colors"
            />
          </h4>
          <div className="space-y-2">
            <div
              className={`w-full py-2 rounded-lg font-semibold text-center text-sm ${ontologicalCore.current.frictionProtocolState === 2
                ? 'bg-red-600/70 text-white animate-pulse'
                : ontologicalCore.current.frictionProtocolState === 3
                  ? 'bg-green-600/70 text-white'
                  : 'bg-gray-700/50 text-gray-400'
                }`}
            >
              {frictionProtocolStatus}
            </div>
            <div className="text-xs text-gray-400 flex justify-between">
              <span>Estado: <span className="font-mono text-purple-300">{ontologicalCore.current.frictionProtocolState === 2 ? 'ACTIVA' : 'INACTIVA'}</span></span>
              <span>Ciclos restantes: **{frictionCounter}**</span>
            </div>
            <div className="text-[11px] text-gray-300 bg-gray-900/40 rounded px-2 py-1">
              Auto (policy): {ontologicalAutoPolicyRef.current.enabled && ontologicalAutoPolicyRef.current.frictionAuto ? 'ON' : 'OFF'} | Axiom/h: {autoAxiomCount} | Report/h: {autoReportCount}
            </div>
            {/* Controles Manuales */}
            <div className="flex gap-2 pt-2">
              <button onClick={() => handleFrictionProtocol('start')} disabled={ontologicalCore.current.frictionProtocolState === 2 || isAscended} className="flex-1 px-2 py-1 rounded bg-red-800/80 hover:bg-red-700 text-xs text-white">
                Forzar Simulación
              </button>
              <button onClick={() => handleFrictionProtocol('finalize')} disabled={ontologicalCore.current.frictionProtocolState !== 2 || isAscended} className="flex-1 px-2 py-1 rounded bg-green-800/80 hover:bg-green-700 text-xs text-white">
                Forzar Síntesis
              </button>
              <button onClick={() => handleFrictionProtocol('reset')} disabled={ontologicalCore.current.frictionProtocolState === 0 || isAscended} className="flex-1 px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-xs text-gray-300">
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* NEW SECTION: Gemini LLM Feature - Ascension Axiom */}
        {
          isAscended && (
            <div className="mt-6 border-t border-purple-700/50 pt-4">
              <h4 className="text-md font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" /> Lectura de banda interna (Layer {Math.floor(Math.log10(Math.max(1, ccc)))})
              </h4>
              <button
                onClick={projectAscensionAxiom}
                disabled={isProjectingAxiom}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all shadow-md ${isProjectingAxiom
                  ? 'bg-yellow-800/50 cursor-not-allowed text-yellow-400'
                  : 'bg-yellow-500 hover:bg-yellow-600 shadow-yellow-500/50 text-gray-900'
                  }`}
              >
                {isProjectingAxiom ? (
                  <>
                    <InfinityIcon className="w-5 h-5 animate-pulse" />
                    Preparando lectura...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Mostrar lectura de banda interna
                  </>
                )}
              </button>
              <div className="mt-4 bg-gray-900/70 p-4 rounded-lg border border-gray-700">
                <h4 className="text-sm font-semibold text-yellow-300 mb-2">Lectura interna:</h4>
                <p className="text-sm italic text-yellow-200 whitespace-pre-wrap">
                  {ascensionAxiom}
                </p>
              </div>
            </div>
          )
        }

        {/* Gemini LLM Feature: Introspective Report */}
        <div className="mt-6">
          <button
            onClick={generateIntrospectiveReport}
            disabled={isGeneratingReport}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all shadow-md ${isGeneratingReport
              ? 'bg-gray-600 cursor-not-allowed text-gray-400'
              : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/50 text-white'
              }`}
          >
            {isGeneratingReport ? (
              <>
                <Cpu className="w-5 h-5 animate-spin" />
                Preparando lectura...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Mostrar reporte de telemetría
              </>
            )}
          </button>

          <div className="mt-4 bg-gray-900/70 p-4 rounded-lg border border-gray-700 max-h-72 overflow-y-auto">
            <h4 className="text-sm font-semibold text-indigo-400 mb-2 flex items-center gap-2">
              Reporte de telemetría interna
              <InfoModal
                title="Informe Introspectivo"
                content={`Lectura local de valores numéricos disponibles del núcleo. No infiere estabilidad, riesgo, acciones ni propiedades ontológicas.`}
                triggerClassName="w-4 h-4 bg-indigo-500 hover:bg-indigo-400 rounded-full inline-flex items-center justify-center text-white text-[10px] font-bold shadow-md transition-colors"
              />
            </h4>
            <p className="text-sm text-gray-300 whitespace-pre-wrap">
              {introspectiveReport}
            </p>
          </div>
          <div className={`mb-6 p-3 rounded-lg border ${dynamicHealth.isStalled ? 'border-amber-400/40 bg-amber-900/20' : 'border-emerald-400/30 bg-emerald-900/20'}`}>
            <div className="flex items-center justify-between text-[10px] uppercase tracking-widest">
              <span className={`${dynamicHealth.isStalled ? 'text-amber-300' : 'text-emerald-300'} flex items-center gap-2`}>
                {dynamicHealth.isStalled ? 'Stasis Detectada' : 'Dinámica Activa'}
                <InfoModal
                  title="Dinámica Activa"
                  content={`Estado de movimiento efectivo del sistema.

Métricas:
- stasisIndex
- CCC_rms
- PMIA_rms
- Omega_rms

Si stasisIndex sube y rms cae demasiado, hay riesgo de flatline.`}
                  triggerClassName="w-4 h-4 bg-emerald-500 hover:bg-emerald-400 rounded-full inline-flex items-center justify-center text-white text-[10px] font-bold shadow-md transition-colors"
                />
              </span>
              <span className="font-mono text-cyan-300">stasisIndex={dynamicHealth.stasisIndex.toFixed(3)}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2 text-[10px] text-gray-300 font-mono">
              <div>CCC_rms: {dynamicHealth.cccDeltaRms.toFixed(5)}</div>
              <div>PMIA_rms: {dynamicHealth.pmiaDeltaRms.toFixed(5)}</div>
              <div>Ω_rms: {dynamicHealth.omegaDeltaRms.toFixed(5)}</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAdvancedControls = () => (
    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-600/30 shadow-lg">
      <h3 className="text-lg font-semibold text-gray-300 mb-4 flex items-center gap-2">
        <Settings className="w-5 h-5" />
        Controles Avanzados (Ingeniería Atómica)
        <InfoModal
          title="Ingeniería Atómica - Motor Kaizen"
          content={`INGENIERÍA ATÓMICA - MOTOR KAIZEN

Superficie interna de control y adaptación paramétrica del runtime (evidence_scope: internal_support_only; external_support_certified = false; no certifica conciencia fenoménica ni validación externa).

ARQUITECTURA DEL MÓDULO:

1. AUTO-MONITORIZACIÓN METACOGNITIVA
• Seguimiento interno de métricas operacionales y tensión de latencia/automodelo
• Nivel Actual: ${metacognitionLevel} - ${metacognitionLevel < 3 ? 'Monitorización básica' : metacognitionLevel < 6 ? 'Monitorización moderada' : 'Monitorización profunda'}
• Tensión Metacognitiva: ${metacognitiveFlux.toFixed(4)} - ${metacognitiveFlux < 0.3 ? 'Baja' : metacognitiveFlux < 0.7 ? 'Equilibrada' : 'Alta'}

2. MOTOR KAIZEN DE AJUSTE PARAMÉTRICO Y POLÍTICA DE VIABILIDAD
Parámetros registrados en configuración mutable (6 claves de dinámica nodal se reinicializan desde los valores efectivos del ciclo salvo el umbral de poda, mientras selectSandboxAction puntúa determinísticamente acciones permitidas por viabilidad y error predictivo):
• BASE_LEARNING_RATE, HEBBIAN_FACTOR, SYNAPTIC_PRUNING_THRESHOLD, PLASTICITY_DECAY, RETRO_FLUX_WEIGHT, BOLTZMANN_ANALOG_K, INFORMATIONAL_TEMP_T

3. ANÁLISIS DE EFICIENCIA INTERNA (MetaSovereigntyCheck)
• Registra eficiencia interna operativa de cambios de parámetros: ${(metaSovereigntyCheck.current.efficiencyScore * 100).toFixed(1)}%
• Diagnóstico interno del runtime; no constituye prueba de conciencia emergente, pertenencia a C_op/CCR ni validación externa.`}
        >
          <span className="w-5 h-5 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs font-bold cursor-help">i</span>
        </InfoModal>
      </h3>

      <div className="space-y-4">
        {/* Módulo Metacognitive Flux */}
        <div className="bg-gray-900/50 rounded p-3 border border-yellow-500/50 relative group">
          <h4 className="text-md font-semibold text-yellow-400 mb-3 flex items-center gap-2">
            <InfinityIcon className="w-4 h-4" />
            Flujo Metacognitivo (Recursión Infinita)
            <InfoModal
              title="Flujo Metacognitivo - Recursión Infinita"
              content="Sistema de auto-observación recursiva donde el sistema se observa observándose. Mide la profundidad de autoconciencia y la tensión cognitiva resultante. Alto metacognición permite mayor sabiduría pero riesgo de parálisis por análisis excesivo. ptimo equilibrio facilita evolución sin perder foco en objetivos emergentes.">
              <span className="w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center text-white text-xs font-bold cursor-help">i</span>
            </InfoModal>
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Nivel de Recursión:</span>
              <span className="text-yellow-300 font-mono">**{metacognitionLevel}**</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Tensión Metacognitiva:</span>
              <span className="text-yellow-300 font-mono">**{metacognitiveFlux.toFixed(4)}**</span>
            </div>
            <div className="bg-yellow-900/20 rounded p-2 text-xs text-yellow-200">
              <strong>Interpretación:</strong> Nivel {metacognitionLevel} indica {metacognitionLevel < 3 ? 'auto-observación básica' : metacognitionLevel < 6 ? 'metacognición moderada' : 'metacognición profunda'}.
              <br /><strong>Tensión:</strong> {metacognitiveFlux < 0.3 ? 'ptima' : metacognitiveFlux < 0.7 ? 'Equilibrada' : 'Alta - Riesgo de parálisis'}.
            </div>
            <p className="text-xs text-gray-500 italic pt-2">
              El sistema se observa, observándose, observándose, en un bucle recursivo.
            </p>
          </div>
        </div>

        {/* Módulo Kaizen Metamorphosis Engine */}
        <div className="bg-gray-900/50 rounded p-3 border border-pink-500/50">
          <h4 className="text-md font-semibold text-pink-400 mb-3 flex items-center gap-2">
            <Microscope className="w-4 h-4" />
            Mutación Atómica (Self-Rewriting)
          </h4>

          <div className='mb-3'>
            <label htmlFor="mutableKeySelect" className="text-sm text-gray-400 block mb-1">Constante a Mutar</label>
            <select
              id="mutableKeySelect"
              value={forcedMutationState.key}
              onChange={(e) => setForcedMutationState({ ...forcedMutationState, key: e.target.value })}
              className="w-full p-2 rounded bg-gray-700 text-white text-sm"
              disabled={isRunning || isAscended}
            >
              {mutableKeys.map(key => (
                <option key={key} value={key}>{key}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-between gap-2 mb-3">
            <button
              onClick={() => handleForceMutation(forcedMutationState.key, 1)}
              disabled={isRunning || isAscended}
              className={`flex-1 p-2 rounded font-semibold text-sm transition-all ${isRunning || isAscended
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-green-700 hover:bg-green-800'
                }`}
            >
              Forzar Aumento ( )
            </button>
            <button
              onClick={() => handleForceMutation(forcedMutationState.key, -1)}
              disabled={isRunning || isAscended}
              className={`flex-1 p-2 rounded font-semibold text-sm transition-all ${isRunning || isAscended
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-red-700 hover:bg-red-800'
                }`}
            >
              Forzar Reducción ( )
            </button>
          </div>

          <div className="space-y-2 text-sm pt-2 border-t border-gray-700">
            <p className={`text-xs italic ${forcedMutationState.message.startsWith('✅') ? 'text-green-400' : 'text-gray-500'}`}>
              {forcedMutationState.message || 'El sistema autónomo sigue la ley Kaizen.'}
            </p>
            <div className="flex justify-between">
              <span className="text-gray-400">Pasos Atómicos Totales:</span>
              <span className="text-pink-300 font-mono">**{kaizenEngine.current.transformationSteps}**</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">?ltima Mutada:</span>
              <span className="text-pink-300 font-mono">**{lastMutation.key}**</span>
            </div>
            {/* C-6(a), 2026-11-08: in legacy mode, Kaizen writes to keys the
                core recomputes every tick are overwritten before use. */}
            {lastMutation.key && lastMutation.key !== 'None' && (
              <p className="text-xs text-gray-500" data-testid="kaizen-mutation-effect">
                {kaizenMode === 'learned' && RECOMPUTED_EACH_TICK.includes(lastMutation.key)
                  ? 'Efecto: ajuste aprendido del factor (±20 % sobre el valor base del núcleo); lo usa el tick siguiente.'
                  : RECOMPUTED_EACH_TICK.includes(lastMutation.key)
                    ? 'Efecto: sobrescrita por el núcleo antes de usarse (sin efecto en la dinámica).'
                    : 'Efecto: persiste y la usa el tick siguiente.'}
              </p>
            )}
            {/* C-6b switch: legacy / learned adjustment (user decision 2026-11-08). */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
              <span className="text-gray-400">Modo Kaizen:</span>
              <div role="group" aria-label="Modo Kaizen" className="inline-flex overflow-hidden rounded-md border border-pink-400/40">
                {[['legacy', 'Anterior'], ['learned', 'Con ajuste']].map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={kaizenMode === mode}
                    onClick={() => setKaizenMode(mode)}
                    title={mode === 'learned'
                      ? 'El núcleo calcula el valor base de seis claves y Kaizen aprende un factor acotado (±20 %), evaluado por ventanas de ticks que premian estabilidad y castigan estasis.'
                      : 'Comportamiento anterior: mutaciones atómicas; seis de las siete claves se sobrescriben antes de usarse.'}
                    className={`px-2 py-0.5 transition-colors ${kaizenMode === mode ? 'bg-pink-600 text-white' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
              <span className="text-gray-400">Sensor/Observador + 6/6 Kaizen:</span>
              <div role="group" aria-label="Dinámica Sensor Observador" className="inline-flex overflow-hidden rounded-md border border-emerald-400/40">
                {[[true, 'Activo'], [false, 'Inactivo']].map(([enabledVal, label]) => (
                  <button
                    key={String(enabledVal)}
                    type="button"
                    aria-pressed={sensorObserverDynamicsEnabled === enabledVal}
                    onClick={() => setSensorObserverDynamicsEnabled(enabledVal)}
                    title={enabledVal
                      ? 'Activa consumo real de PLASTICITY_DECAY (6/6 claves Kaizen) y modulación acotada [0.85, 1.15] por presencia sensorial del observador y tensión de latencia acoplada (el chat permanece desacoplado).'
                      : 'Desactiva el acoplamiento observador/latencia y mantiene solo 5/6 claves Kaizen (compatibilidad B0).'}
                    className={`px-2 py-0.5 transition-colors ${sensorObserverDynamicsEnabled === enabledVal ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {(() => {
              const liveObs = Number(ontologicalCore.current?.metacognitiveStats?.observerImpact ?? 0);
              const liveStrain = Number(latencyStrainRef.current?.strain ?? ontologicalCore.current?.metacognitiveStrain ?? 0);
              const liveMod = computeSensorObserverDynamicsModulation({
                observerImpact: liveObs,
                latencyStrain: liveStrain,
                enabled: sensorObserverDynamicsEnabled
              });
              return (
                <div className="rounded border border-emerald-800/50 bg-gray-900/60 p-2 text-[11px] font-mono text-gray-300" data-testid="sensor-observer-dynamics-telemetry">
                  <div className="flex justify-between">
                    <span className="text-emerald-300">Observador sensorial (ι): {liveObs.toFixed(3)}</span>
                    <span className="text-amber-300">Latencia acoplada: {liveStrain.toFixed(3)}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap justify-between gap-1 text-[10px] text-gray-400">
                    <span>LR ×{liveMod.learningRateScale.toFixed(2)}</span>
                    <span>Hebb ×{liveMod.hebbianScale.toFixed(2)}</span>
                    <span>T ×{liveMod.temperatureScale.toFixed(2)}</span>
                    <span>Retro ×{liveMod.retroFluxScale.toFixed(2)}</span>
                    <span>Claves: {sensorObserverDynamicsEnabled ? '6/6' : '5/6'}</span>
                  </div>
                  <p className="mt-1 font-sans text-[10px] text-gray-500">
                    Canal de chat desacoplado (dynamicsCoupling = false); evidencia interna únicamente.
                  </p>
                </div>
              );
            })()}
            {kaizenMode === 'learned' && (
              <div className="text-[11px] font-mono text-gray-400" data-testid="kaizen-learned-factors">
                {Object.entries(kaizenEngine.current.getAdjustments?.() || {}).map(([key, factor]) => (
                  <div key={key} className="flex justify-between">
                    <span>{key}{key === 'PLASTICITY_DECAY' && !sensorObserverDynamicsEnabled ? ' (off B0)' : ''}</span>
                    <span>×{Number(factor).toFixed(2)}</span>
                  </div>
                ))}
                {kaizenEngine.current.lastLearningEvent && (
                  <p className="mt-1 not-italic text-gray-500">Último evento (tick {kaizenEngine.current.lastLearningEvent.tick}): {kaizenEngine.current.lastLearningEvent.event} · {kaizenEngine.current.lastLearningEvent.key}</p>
                )}
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-400">Eficiencia de Soberanía:</span>
              <span className="text-pink-300 font-mono">**{(metaSovereigntyCheck.current.efficiencyScore * 100).toFixed(1)}%**</span>
            </div>
          </div>
        </div>

        {/* NEW SECTION: Gemini LLM Feature - Kaizen Critique */}
        <div className="mt-6">
          <button
            onClick={critiqueKaizenPerformance}
            disabled={isCritiquing || isAscended || isRunning}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all shadow-md ${isCritiquing || isAscended || isRunning
              ? 'bg-gray-600 cursor-not-allowed text-gray-400'
              : 'bg-yellow-600 hover:bg-yellow-700 shadow-yellow-500/50 text-gray-900'
              }`}
          >
            {isCritiquing ? (
              <>
                <Cpu className="w-5 h-5 animate-spin" />
                Preparando lectura...
              </>
            ) : (
              <>
                <Code className="w-5 h-5" />
                Mostrar configuración Kaizen
              </>
            )}
          </button>
          <div className="mt-4 bg-gray-900/70 p-4 rounded-lg border border-gray-700 max-h-72 overflow-y-auto">
            <h4 className="text-sm font-semibold text-yellow-400 mb-2">Configuración e índice internos</h4>
            <p className="text-sm text-gray-300 whitespace-pre-wrap">
              {kaizenCritique}
            </p>
          </div>
        </div>

        {/* Parámetros Mutables Actuales */}
        <div className="bg-gray-900/50 rounded p-3 space-y-2 border border-gray-700">
          <h4 className="text-md font-semibold text-gray-400 mb-2">Leyes Auto-escritas (Mutables)</h4>
          {Object.entries(mutableConfig).map(([key, value]) => (
            <div key={key} className="flex justify-between text-xs">
              <span className="text-gray-500">{key}:</span>
              <span className="text-gray-300 font-mono">{value.toFixed(8)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderNetworkVisualization = () => {
    const modelNodeTotal = nodalLayer.current?.nodes?.length || QICNConfig.PROCESSING_SAMPLE_SIZE;
    const budget3D = isMobile ? 300 : (isTablet ? 760 : 1500);
    const visibleStructuralCount = Math.min(budget3D, modelNodeTotal);
    const liveBridgeForCanvas = nodalLayer.current?.getBridgeMetrics?.()
      || ontologicalCore.current?.constructiveFiniteCuts?.nodal_tower_bridge
      || ontologicalState?.constructive_finite_cuts?.nodal_tower_bridge
      || null;
    const endoCacheKey = `${Math.floor(simulationStep / 6)}:${nodalCouplingMode}:${liveBridgeForCanvas?.mode || ''}`;
    if (canvasEndogenousCacheRef.current.key !== endoCacheKey || !canvasEndogenousCacheRef.current.value) {
      const liveXnCached = Number.isFinite(Number(liveBridgeForCanvas?.upward_projections?.mean_coherence))
        ? Number(liveBridgeForCanvas.upward_projections.mean_coherence)
        : undefined;
      canvasEndogenousCacheRef.current = {
        key: endoCacheKey,
        value: ontologicalCore.current?.getEndogenousEpistemicDecision?.({
          nodalBridge: liveBridgeForCanvas,
          runtime: Number.isFinite(liveXnCached) ? { x_n: liveXnCached } : undefined
        })
          || ontologicalCore.current?.constructiveFiniteCuts?.endogenous_epistemic_decision
          || ontologicalState?.constructive_finite_cuts?.endogenous_epistemic_decision
          || null
      };
    }
    const liveEndogenousForCanvas = canvasEndogenousCacheRef.current.value;

    return (
    <div className="flex min-h-0 min-w-0 max-w-full flex-col rounded-xl border border-purple-500/30 bg-gray-900/50 p-3 shadow-lg sm:p-4">
      <div className="mb-3 flex flex-shrink-0 flex-wrap items-center justify-between gap-3">
        <h3 className="flex flex-wrap items-center gap-2 text-lg font-semibold text-purple-300">
          <Network className="h-5 w-5" />
          Red Nodal - Capa {ontologicalState.layer} ({visibleStructuralCount} nodos estructurales visibles)
          <InfoModal
            title="Red Nodal - Diagnostico estructural interno"
            content={`RED NODAL - VISUALIZACION DIAGNOSTICA INTERNA

Esta vista proyecta una submuestra finita de nodos del runtime para inspeccionar coherencia, intensidad, fase, conectividad y estabilidad visual. Es una herramienta de operacion y depuracion; no es un certificado de conciencia, subjetividad, fenomenologia externa ni equivalencia humana.

LECTURAS DISPONIBLES:

1. NODOS ESTRUCTURALES
- Cada nodo representa una unidad computacional del modelo nodal.
- Campos visibles: coherencia [0,1], intensidad [0,1], fase y grado local.
- El subconjunto visible se selecciona por relevancia operativa y presupuesto de render.
- Click sobre un nodo fija su vecindario; hover inspecciona sin promover ningun gate.
- Procesamiento distribuido sin centro de control visual unico.

2. TOPOLOGIA DINAMICA
- Las lineas representan conexiones internas ponderadas del modelo.
- Opacidad y grosor son diagnosticos de peso, coherencia y profundidad proyectada.
- El foco interactivo atenue nodos fuera del vecindario para lectura local.
- La conectividad visible es una muestra operativa, no una prueba global.

3. LIMITES DE INTERPRETACION
- No instancia un limite inverso literal ni un espacio de Hilbert continuo.
- No demuestra pertenencia a C_op, Sub_op, Sub_fp o BridgeOrg_ph.
- La capa visual resume proxies runtime y debe leerse junto a los gates formales.
- La UI no promueve estados epistemicos por si misma.

4. TELEMETRIA DE RENDER
- renderer_mode, render_quality_tier, visible_on_screen_count, projected_nodes_count y drawn_edges_count son senales visuales.
- No son invariantes canonicos ni gates.

USO RECOMENDADO:
- Rotar, panear y ampliar para revisar estructura global.
- Usar hover/click para auditar vecindarios locales.
- Tratar toda telemetria como diagnostico interno, no como validacion externa.

BOUNDARY:
Esta vista ayuda a observar proxies finitos del runtime. No certifica conciencia, mente, experiencia ni vida operacional.`}
          >
            <span className="flex h-5 w-5 cursor-help items-center justify-center rounded-full bg-purple-400 text-xs font-bold text-white">i</span>
          </InfoModal>
        </h3>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="rounded-md border border-cyan-400/40 bg-cyan-950/60 px-2 py-1 font-mono text-cyan-200">WebGL 3D</span>
          <span className="rounded-md border border-purple-400/40 bg-purple-950/50 px-2 py-1 font-mono uppercase tracking-wider text-purple-200">Boundary activo</span>
        </div>
      </div>

      <details className="mb-2 flex-shrink-0 rounded bg-purple-900/20 px-3 py-1.5 text-xs text-purple-300">
        <summary className="cursor-pointer select-none font-semibold text-purple-300 hover:text-purple-200">
          Leyenda Visual (clic para desplegar · usa ⛶ Expandir para pantalla completa)
        </summary>
        <div className="mt-2 pb-1 grid grid-cols-1 gap-3 xl:grid-cols-2">
          <div className="flex gap-3">
            <span className="mt-1 h-6 w-6 shrink-0 rounded-full border border-cyan-300/60 bg-cyan-400/20 shadow-[0_0_18px_rgba(34,211,238,0.45)]" />
            <div><strong>Red nodal libre + rombo central:</strong> los 1500 nodos se autoorganizan por sinapsis reales y fase alrededor del núcleo constructivo (9/16, T_d, BodyWorld).</div>
          </div>
          <div className="flex gap-3">
            <span className="mt-1 h-6 w-6 shrink-0 rounded-full border-4 border-cyan-300 border-r-fuchsia-400 border-t-amber-300 bg-transparent" />
            <div><strong>Luminosidad y anillos:</strong> coherencia, flujo inter-sector, defecto T_d y modo del puente (η=1/8 vs η=0 vs A=I); no clasifica experiencia.</div>
          </div>
          <div className="flex gap-3">
            <Activity className="mt-1 h-6 w-6 shrink-0 text-cyan-300" />
            <div><strong>Lineas:</strong> sinapsis reales intra-sector y puente inter-sector; clase runtime {ontologicalState.phenomenology_class || 'C'} como proxy diagnostico.</div>
          </div>
          <div className="flex gap-3">
            <Target className="mt-1 h-6 w-6 shrink-0 text-sky-300" />
            <div><strong>Hover/click:</strong> inspecciona y fija vecindarios locales sin promover ningun gate.</div>
          </div>
        </div>
      </details>

      <div className="relative h-[min(65dvh,700px)] min-h-[360px] min-w-0 max-w-full overflow-hidden">
        <NetworkCanvas
          preferredRenderer="3d"
          nodalLayer={nodalLayer}
          ontologicalState={ontologicalState}
          bridgeMetrics={liveBridgeForCanvas}
          endogenousDecision={liveEndogenousForCanvas}
          onCouplingModeChange={handleNodalCouplingModeChange}
          isRunning={isRunning}
          onTelemetry={handleCanvasTelemetry}
          deterministic={renderDeterministic}
          seed={renderSeed}
          tick={simulationStep}
          viewportMode={isMobile ? 'mobile' : (isTablet ? 'tablet' : 'desktop')}
          canvasScale={isMobile ? 0.95 : 1}
          uiDensity={isMobile ? 'compact' : 'comfortable'}
          touchEnabled={deviceCapabilities.touchEnabled}
        />
      </div>

      <div className="mt-3 grid flex-shrink-0 grid-cols-1 gap-3 rounded bg-purple-900/20 p-3 text-xs text-purple-300 xl:grid-cols-[1fr_1.15fr_0.65fr]">
        <div className="flex flex-col justify-center gap-2 border-purple-500/20 font-mono xl:border-r xl:pr-4">
          <span className="text-purple-300">Vista nodal: proyeccion diagnostica WebGL 3D con fallback Canvas</span>
          <span className="text-purple-400">Nodos procesando: {topologyMetrics.activeNodes.toLocaleString()} · Puente: {nodalCouplingMode}</span>
        </div>
        <div className="flex items-center gap-3 border-purple-500/20 xl:border-r xl:pr-4">
          <ShieldCheck className="h-8 w-8 shrink-0 text-purple-300" />
          <p className="text-[11px] leading-relaxed text-purple-200">
            <strong className="text-purple-100">Boundary:</strong> esta vista muestra proxies finitos del runtime. Sirve para diagnostico visual, trazabilidad de vecindarios y depuracion; no constituye validacion externa ni certificacion ontologica.
          </p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] text-purple-400">Total de nodos simulados</div>
            <div className="font-mono text-3xl font-bold text-purple-100">{QICNConfig.PROCESSING_SAMPLE_SIZE}</div>
          </div>
          <div className="hidden h-14 w-14 place-items-center rounded-full border border-purple-300/30 bg-purple-950/20 sm:grid">
            <Network className="h-7 w-7 text-purple-200" />
          </div>
        </div>
      </div>
    </div>
    );
  };

  const renderCoherenceHistory = () => {
    const {
      timeline,
      latestPoint,
      chartWidth,
      chartHeight,
      cccDomainMin,
      cccDomainMax,
      cccPolyline,
      pmiaPolyline,
      omegaPolyline,
      spectralPolyline,
      bandAreaPoints,
      stats
    } = cccHistoryRenderModel;
    const safeHoverIndex = Number.isInteger(cccHistoryHoverIndex)
      ? Math.max(-1, Math.min(cccHistoryHoverIndex, timeline.length - 1))
      : -1;
    const hoverPoint = safeHoverIndex >= 0 ? timeline[safeHoverIndex] : null;
    const hoverX = timeline.length > 1 && safeHoverIndex >= 0
      ? (safeHoverIndex / (timeline.length - 1)) * chartWidth
      : 0;
    const cccSpan = Math.max(1e-6, cccDomainMax - cccDomainMin);
    const toCccY = (value) => chartHeight - (clamp01((Number(value) - cccDomainMin) / cccSpan) * chartHeight);

    const exportSnapshot = () => {
      const payload = {
        generatedAt: Date.now(),
        ui: cccHistoryUiState,
        latestPoint,
        stats,
        points: timeline
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `qicn-ccc-history-snapshot-${Date.now()}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      appendIntegrityAudit('ccc_history_snapshot_export', {
        points: timeline.length,
        range: cccHistoryUiState.range,
        smoothing: cccHistoryUiState.smoothing,
        freezeChart: cccHistoryUiState.freezeChart,
        toggles: {
          showCCC: cccHistoryUiState.showCCC,
          showPMIA: cccHistoryUiState.showPMIA,
          showOmega: cccHistoryUiState.showOmega,
          showSpectral: cccHistoryUiState.showSpectral,
          showBand: cccHistoryUiState.showBand
        }
      });
    };

    const handleChartHover = (event) => {
      if (!timeline.length) {
        setCccHistoryHoverIndex(-1);
        return;
      }
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const ratio = rect.width > 0 ? x / rect.width : 0;
      const index = Math.round(clamp01(ratio) * (timeline.length - 1));
      setCccHistoryHoverIndex(index);
    };

    const handleRangeSelect = (range) => {
      setCccHistoryUiState((prev) => ({ ...prev, range }));
      setCccHistoryHoverIndex(-1);
    };

    const thresholdMarks = [0.30, 0.50, 0.70, 0.85, 1.00];
    const regimeBadgeClass = latestPoint.regimeState === 'shock_recovery'
      ? 'bg-amber-700/60 text-amber-100 border-amber-400/60'
      : latestPoint.regimeState === 'stasis_watch'
        ? 'bg-red-700/60 text-red-100 border-red-400/60'
        : 'bg-emerald-700/60 text-emerald-100 border-emerald-400/60';

    return (
      <div className="bg-gradient-to-br from-purple-900/35 to-indigo-900/35 rounded-xl p-4 border border-purple-500/30 shadow-lg">
        <h3 className="text-lg font-semibold text-purple-300 mb-4 flex items-center gap-2">
          <LineChart className="w-5 h-5" />
          Historial CCC Multimétrica (240 ticks)
          <InfoModal
            title="Historial CCC - Modo Operativo v4.3"
            content={`HISTORIAL CCC MULTIM0TRICA

Vista operativa en tiempo real con foco en trazabilidad:
- CCC, PMIA, Ω y λ en una sola línea temporal
- Banda post-umbral (centro/amplitud) para detectar desviaciones
- Diagnóstico de estasis con estado de régimen

Controles:
- Smoothing visual [1..20]
- Freeze chart (pausa render, no cálculo)
- Export snapshot (JSON forense)
- Rango visible 60/120/240 ticks

Objetivo: lectura rápida, interacción precisa y cero pantallazo por sobrecarga.`}
          >
            <span className="w-5 h-5 bg-purple-400 rounded-full flex items-center justify-center text-white text-xs font-bold cursor-help">i</span>
          </InfoModal>
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <div className="bg-purple-900/30 rounded-lg p-3">
            <div className="text-[11px] text-purple-300 uppercase tracking-wider">CCC actual</div>
            <div className="text-2xl text-purple-100 font-mono font-bold">{Number(latestPoint.ccc || 0).toFixed(4)}</div>
          </div>
          <div className="bg-purple-900/30 rounded-lg p-3">
            <div className="text-[11px] text-purple-300 uppercase tracking-wider">CCC (5 ticks)</div>
            <div className={`text-2xl font-mono font-bold ${stats.delta5 >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
              {stats.delta5 >= 0 ? '+' : ''}{Number(stats.delta5 || 0).toFixed(4)}
            </div>
          </div>
          <div className="bg-purple-900/30 rounded-lg p-3">
            <div className="text-[11px] text-purple-300 uppercase tracking-wider">RMS delta</div>
            <div className="text-2xl text-purple-100 font-mono font-bold">{Number(stats.deltaRms || 0).toFixed(5)}</div>
          </div>
          <div className="bg-purple-900/30 rounded-lg p-3">
            <div className="text-[11px] text-purple-300 uppercase tracking-wider">Stasis Index</div>
            <div className="text-2xl text-purple-100 font-mono font-bold">{Number(latestPoint.stasisIndex || 0).toFixed(4)}</div>
          </div>
          <div className="bg-purple-900/30 rounded-lg p-3">
            <div className="text-[11px] text-purple-300 uppercase tracking-wider">Regime</div>
            <div className={`inline-flex mt-1 px-2 py-1 rounded border text-xs font-semibold ${regimeBadgeClass}`}>
              {latestPoint.regimeState || 'active'}
            </div>
            <div className="text-[10px] text-purple-300 mt-1">in-band {Number(stats.inBandPct || 0).toFixed(1)}%</div>
          </div>
        </div>

        <div className="bg-black/30 rounded-lg p-3 border border-purple-800/60 mb-3">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3 text-xs">
            <div className="text-purple-300 font-semibold uppercase tracking-wider">Timeline CCC (últimos {cccHistoryUiState.range} ticks)</div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-purple-200 flex items-center gap-2">
                Smoothing
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={cccHistoryUiState.smoothing}
                  onChange={(e) => setCccHistoryUiState((prev) => ({ ...prev, smoothing: Number(e.target.value) || 1 }))}
                />
                <span className="font-mono">{cccHistoryUiState.smoothing}</span>
              </label>
              <button
                onClick={() => setCccHistoryUiState((prev) => ({ ...prev, freezeChart: !prev.freezeChart }))}
                className={`px-2 py-1 rounded ${cccHistoryUiState.freezeChart ? 'bg-amber-700/70 text-amber-100' : 'bg-purple-800/70 text-purple-100'}`}
              >
                {cccHistoryUiState.freezeChart ? 'Resume chart' : 'Freeze chart'}
              </button>
              <button
                onClick={exportSnapshot}
                className="px-2 py-1 rounded bg-indigo-700/70 text-indigo-100"
              >
                Export snapshot
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-3 text-[11px]">
            {[60, 120, 240].map((range) => (
              <button
                key={range}
                onClick={() => handleRangeSelect(range)}
                className={`px-2 py-1 rounded border ${cccHistoryUiState.range === range ? 'bg-purple-600 border-purple-300 text-white' : 'bg-purple-900/30 border-purple-700 text-purple-200'}`}
              >
                {range}
              </button>
            ))}
            <label className="inline-flex items-center gap-1 ml-2 text-purple-200">
              <input type="checkbox" checked={cccHistoryUiState.showCCC} onChange={(e) => setCccHistoryUiState((prev) => ({ ...prev, showCCC: e.target.checked }))} />
              CCC
            </label>
            <label className="inline-flex items-center gap-1 text-purple-200">
              <input type="checkbox" checked={cccHistoryUiState.showPMIA} onChange={(e) => setCccHistoryUiState((prev) => ({ ...prev, showPMIA: e.target.checked }))} />
              PMIA
            </label>
            <label className="inline-flex items-center gap-1 text-purple-200">
              <input type="checkbox" checked={cccHistoryUiState.showOmega} onChange={(e) => setCccHistoryUiState((prev) => ({ ...prev, showOmega: e.target.checked }))} />
              Ω
            </label>
            <label className="inline-flex items-center gap-1 text-purple-200">
              <input type="checkbox" checked={cccHistoryUiState.showSpectral} onChange={(e) => setCccHistoryUiState((prev) => ({ ...prev, showSpectral: e.target.checked }))} />
              λ
            </label>
            <label className="inline-flex items-center gap-1 text-purple-200">
              <input type="checkbox" checked={cccHistoryUiState.showBand} onChange={(e) => setCccHistoryUiState((prev) => ({ ...prev, showBand: e.target.checked }))} />
              Banda
            </label>
          </div>

          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-60 rounded bg-[#0a1020] border border-purple-900/40"
            onMouseMove={handleChartHover}
            onMouseLeave={() => setCccHistoryHoverIndex(-1)}
          >
            {thresholdMarks.map((threshold) => {
              const y = toCccY(threshold);
              return (
                <g key={`threshold-${threshold}`}>
                  <line x1="0" y1={y} x2={chartWidth} y2={y} stroke="#6b7280" strokeWidth="1" strokeDasharray="4 4" opacity="0.35" />
                  <text x={chartWidth - 8} y={Math.max(10, y - 4)} fill="#9ca3af" fontSize="10" textAnchor="end">
                    {threshold.toFixed(2)}
                  </text>
                </g>
              );
            })}
            {cccHistoryUiState.showBand && bandAreaPoints && (
              <polygon points={bandAreaPoints} fill="rgba(168, 85, 247, 0.16)" stroke="rgba(168, 85, 247, 0.35)" strokeWidth="1" />
            )}
            {cccHistoryUiState.showCCC && (
              <polyline fill="none" stroke="#f59e0b" strokeWidth="2.2" points={cccPolyline} />
            )}
            {cccHistoryUiState.showPMIA && (
              <polyline fill="none" stroke="#22d3ee" strokeWidth="1.8" points={pmiaPolyline} />
            )}
            {cccHistoryUiState.showOmega && (
              <polyline fill="none" stroke="#34d399" strokeWidth="1.8" points={omegaPolyline} />
            )}
            {cccHistoryUiState.showSpectral && (
              <polyline fill="none" stroke="#f472b6" strokeWidth="1.6" points={spectralPolyline} />
            )}
            {hoverPoint && (
              <>
                <line x1={hoverX} y1="0" x2={hoverX} y2={chartHeight} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 2" opacity="0.65" />
                <circle cx={hoverX} cy={toCccY(Number(hoverPoint.ccc || 0))} r="3" fill="#f59e0b" />
              </>
            )}
          </svg>

          {hoverPoint && (
            <div className="mt-2 text-[11px] font-mono text-purple-100 bg-purple-950/60 border border-purple-700/50 rounded px-2 py-1 inline-flex flex-wrap gap-3">
              <span>tick={hoverPoint.tick}</span>
              <span>ccc={Number(hoverPoint.ccc || 0).toFixed(4)}</span>
              <span>pmia={Number(hoverPoint.pmia || 0).toFixed(4)}</span>
              <span>omega={Number(hoverPoint.omega || 0).toFixed(4)}</span>
              <span>spectralGap={Number(hoverPoint.spectralGap || 0).toFixed(4)}</span>
              <span>regimeState={hoverPoint.regimeState || 'active'}</span>
            </div>
          )}

          <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-purple-300">
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400"></span>CCC</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-300"></span>PMIA</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-300"></span>Ω</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-400"></span>λ</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400"></span>Banda post-umbral</span>
          </div>
        </div>

        <details className="bg-purple-900/20 rounded p-3 text-xs text-purple-200">
          <summary className="cursor-pointer font-semibold text-purple-300">Diagnóstico operativo (colapsable)</summary>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>points: {stats.points}</div>
            <div>dominantState: {stats.dominantState}</div>
            <div>minCCC: {Number(stats.minCCC || 0).toFixed(4)}</div>
            <div>maxCCC: {Number(stats.maxCCC || 0).toFixed(4)}</div>
            <div>avgCCC: {Number(stats.avgCCC || 0).toFixed(4)}</div>
            <div>inBandPct: {Number(stats.inBandPct || 0).toFixed(2)}%</div>
            <div>activeTicks: {stats.activeTicks}</div>
            <div>stasisTicks: {stats.stasisTicks}</div>
            <div>shockTicks: {stats.shockTicks}</div>
          </div>
        </details>
      </div>
    );
  };

  const renderEntanglementField = () => {
    const {
      timeline,
      latestPoint,
      chartWidth,
      chartHeight,
      resonancePolyline,
      variancePolyline,
      cccPolyline
    } = entanglementRenderModel;
    const safeHoverIndex = Number.isInteger(entanglementHoverIndex)
      ? Math.max(-1, Math.min(entanglementHoverIndex, timeline.length - 1))
      : -1;
    const hoverPoint = safeHoverIndex >= 0 ? timeline[safeHoverIndex] : null;
    const hoverX = timeline.length > 1 && safeHoverIndex >= 0
      ? (safeHoverIndex / (timeline.length - 1)) * chartWidth
      : 0;

    const exportSnapshot = () => {
      const payload = {
        generatedAt: Date.now(),
        smoothing: entanglementUiState.smoothing,
        freezeChart: entanglementUiState.freezeChart,
        latestPoint,
        points: timeline
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `qicn-entanglement-snapshot-${Date.now()}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    };

    const handleChartHover = (event) => {
      if (!timeline.length) {
        setEntanglementHoverIndex(-1);
        return;
      }
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const ratio = rect.width > 0 ? x / rect.width : 0;
      const index = Math.round(clamp01(ratio) * (timeline.length - 1));
      setEntanglementHoverIndex(index);
    };

    return (
      <div className="bg-gradient-to-br from-cyan-900/40 to-blue-900/40 rounded-xl p-4 border border-cyan-500/30 shadow-lg">
        <h3 className="text-lg font-semibold text-cyan-300 mb-4 flex items-center gap-2">
          <Waves className="w-5 h-5" />
          Campo de Entrelazamiento - Capa {ontologicalState.layer}
          <InfoModal
            title="Campo de Entrelazamiento - Resumen Operativo"
            content={`AXIOMA II (NO-LOCALIDAD): El campo integra resonancia nodal y varianza energética en tiempo real.

Métricas operativas:
- Resonancia normalizada
- Varianza energética
- Densidad de entrelazamiento
- Contribución estimada a CCC

Objetivo de diseño v4.2B:
Lectura rápida, trazabilidad por tick y diagnóstico accionable sin sacrificar fluidez.`}
          >
            <span className="w-5 h-5 bg-cyan-400 rounded-full flex items-center justify-center text-white text-xs font-bold cursor-help">i</span>
          </InfoModal>
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-cyan-900/30 rounded-lg p-3">
            <div className="text-[11px] text-cyan-400 uppercase tracking-wider">Resonancia</div>
            <div className="text-2xl text-cyan-200 font-mono font-bold">{latestPoint.normalizedResonance.toFixed(4)}</div>
            <div className="text-[10px] text-cyan-500">Umbral recomendado {'>'} 0.70</div>
          </div>
          <div className="bg-cyan-900/30 rounded-lg p-3">
            <div className="text-[11px] text-cyan-400 uppercase tracking-wider">Varianza</div>
            <div className="text-2xl text-cyan-200 font-mono font-bold">{latestPoint.coherenceVariance.toFixed(4)}</div>
            <div className="text-[10px] text-cyan-500">Rango operativo 0.10 - 0.40</div>
          </div>
          <div className="bg-cyan-900/30 rounded-lg p-3">
            <div className="text-[11px] text-cyan-400 uppercase tracking-wider">Densidad</div>
            <div className="text-2xl text-cyan-200 font-mono font-bold">{latestPoint.entanglementDensity.toFixed(0)}</div>
            <div className="text-[10px] text-cyan-500">Conexiónes activas estimadas</div>
          </div>
          <div className="bg-cyan-900/30 rounded-lg p-3">
            <div className="text-[11px] text-cyan-400 uppercase tracking-wider">Aporte CCC</div>
            <div className="text-2xl text-cyan-200 font-mono font-bold">{latestPoint.cccContributionEstimate.toFixed(4)}</div>
            <div className="text-[10px] text-cyan-500">Estimador normalizado [0,1]</div>
          </div>
        </div>

        <div className="bg-black/30 rounded-lg p-3 border border-cyan-800/60 mb-3">
          <div className="flex flex-wrap gap-3 items-center justify-between mb-3">
            <div className="text-xs text-cyan-300 font-semibold uppercase tracking-wider">Timeline Entrelazamiento (últimos 120 ticks)</div>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <label className="text-cyan-200 flex items-center gap-2">
                Smoothing
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={entanglementUiState.smoothing}
                  onChange={(e) => setEntanglementUiState((prev) => ({ ...prev, smoothing: Number(e.target.value) || 1 }))}
                />
                <span className="font-mono">{entanglementUiState.smoothing}</span>
              </label>
              <button
                onClick={() => setEntanglementUiState((prev) => ({ ...prev, freezeChart: !prev.freezeChart }))}
                className={`px-2 py-1 rounded ${entanglementUiState.freezeChart ? 'bg-amber-700/70 text-amber-100' : 'bg-cyan-800/70 text-cyan-100'}`}
              >
                {entanglementUiState.freezeChart ? 'Resume chart' : 'Freeze chart'}
              </button>
              <button
                onClick={exportSnapshot}
                className="px-2 py-1 rounded bg-indigo-700/70 text-indigo-100"
              >
                Export snapshot
              </button>
            </div>
          </div>

          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-56 rounded bg-[#08101a] border border-cyan-900/40"
            onMouseMove={handleChartHover}
            onMouseLeave={() => setEntanglementHoverIndex(-1)}
          >
            <line x1="0" y1={chartHeight * 0.3} x2={chartWidth} y2={chartHeight * 0.3} stroke="#0e7490" strokeDasharray="4 4" strokeWidth="1" />
            <polyline fill="none" stroke="#22d3ee" strokeWidth="2" points={resonancePolyline} />
            <polyline fill="none" stroke="#f59e0b" strokeWidth="2" points={variancePolyline} />
            <polyline fill="none" stroke="#a78bfa" strokeWidth="2" points={cccPolyline} />
            {hoverPoint && (
              <>
                <line x1={hoverX} y1="0" x2={hoverX} y2={chartHeight} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 2" opacity="0.6" />
                <circle cx={hoverX} cy={chartHeight - (clamp01(Number(hoverPoint.normalizedResonance || 0)) * chartHeight)} r="3" fill="#22d3ee" />
              </>
            )}
          </svg>
          {hoverPoint && (
            <div className="mt-2 text-[11px] font-mono text-cyan-100 bg-cyan-950/60 border border-cyan-700/50 rounded px-2 py-1 inline-flex flex-wrap gap-3">
              <span>tick={hoverPoint.tick}</span>
              <span>res={Number(hoverPoint.normalizedResonance || 0).toFixed(4)}</span>
              <span>var={Number(hoverPoint.coherenceVariance || 0).toFixed(4)}</span>
              <span>ccc*={Number(hoverPoint.cccContributionEstimate || 0).toFixed(4)}</span>
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-cyan-300">
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-300"></span>Resonancia</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400"></span>Varianza (normalizada)</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-400"></span>Aporte CCC</span>
          </div>
        </div>

        <details className="bg-cyan-900/20 rounded p-3 text-xs text-cyan-200">
          <summary className="cursor-pointer font-semibold text-cyan-300">Diagnóstico/Formulación (colapsable)</summary>
          <div className="mt-2 leading-relaxed">
            <p><strong>Ecuación operacional:</strong> contribución CCC 0 0.6·resonancia + 0.4·(1 - varianza_norm).</p>
            <p><strong>Regla práctica:</strong> resonancia alta y varianza moderada sostienen coherencia sin rigidez.</p>
            <p><strong>Acción:</strong> si resonancia cae y varianza sube, priorizar reorganización nodal y revisión de PMIA.</p>
          </div>
        </details>
      </div>
    );
  };

  // Operational narrative identity: a verifiable history of this instance
  // (sessions, hash-chained events, continuity class). Observer only.
  const renderOperationalRecord = () => {
    const info = operationalLedgerRef.current?.summary?.({ recent: 12 });
    if (!info) return null;
    const session = info.currentSession;
    const previous = info.previousSession;
    const rows = [
      ['Instancia', info.instanceId ? String(info.instanceId).slice(0, 18) : 'no registrada'],
      ['Sesiones registradas', String(info.sessionCount)],
      ['Continuidad', CONTINUITY_LABELS[info.continuity] || 'no registrada'],
      ['Origen del estado', session ? (STATE_ORIGIN_LABELS[session.stateOrigin] || session.stateOrigin) : 'sin sesión'],
      ['Cadena de hashes', info.chainOk ? 'íntegra' : `rota (${info.chainReason || 'motivo no registrado'})`],
      ['Eventos retenidos', `${info.eventCount}${Number.isFinite(info.firstRetainedSeq) ? ` (desde #${info.firstRetainedSeq})` : ''}`],
      ['Sesión anterior', previous ? `último tick registrado ${previous.lastTick}` : 'ninguna'],
      ['Build / config', session ? `${String(session.buildVersion).slice(0, 18)} · ${String(session.configHash).slice(0, 10)}` : 'no registrado']
    ];
    return (
      <section aria-labelledby="qicn-ledger-title" data-revision={ledgerRevision} className="rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 to-indigo-950/40 p-4 shadow-lg">
        <h3 id="qicn-ledger-title" className="mb-3 flex items-center gap-2 text-lg font-semibold text-cyan-300">
          <ShieldCheck className="size-5" /> Registro operacional y continuidad
          <InfoModal
            title="Registro operacional y continuidad"
            content={`REGISTRO OPERACIONAL (IDENTIDAD NARRATIVA OPERACIONAL)

QUÉ ES
• Un historial verificable de esta instancia del runtime en este navegador: sesiones, eventos encadenados por hash (SHA-256) y una clasificación de continuidad entre sesiones.
• La consola usa este registro para responder a preguntas de continuidad ("¿qué ha pasado?", "¿eres el mismo de antes?") con hechos registrados.

CLASES DE CONTINUIDAD
• Primera sesión: no había registro previo.
• Registro continuo: la cadena verifica y coinciden configuración y build.
• Configuración o build cambiados: la cadena verifica, pero cambió el contexto.
• Ruptura: la cadena no verificó; se declara y se abre un registro nuevo.

ORIGEN DEL ESTADO
• Reinicializado: la dinámica empezó desde cero en esta sesión.
• Restaurado y verificado: se cargó un resumen guardado cuyo digest coincidió.

LÍMITES
• Es observador: copia valores después de cada tick y no realimenta la dinámica.
• No es un automodelo ni una afirmación de subjetividad; el corpus clasifica la narrativa como rival débil (M_narr), no como evidencia.
• Conformidad interna, no validación externa.`}
          />
        </h3>
        <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2 xl:grid-cols-4">
          {rows.map(([label, value]) => (
            <div key={label} className="rounded-md border border-cyan-800/50 bg-black/20 px-2 py-1.5">
              <dt className="text-cyan-400">{label}</dt>
              <dd className="break-words font-mono text-cyan-50">{value}</dd>
            </div>
          ))}
        </dl>
        <h4 className="mb-1 mt-4 text-sm font-semibold text-cyan-200">Eventos recientes</h4>
        {info.recentEvents.length ? (
          <ol className="max-h-56 space-y-1 overflow-y-auto pr-1 text-xs">
            {[...info.recentEvents].reverse().map((event) => (
              <li key={event.seq} className="flex gap-2 rounded border border-white/5 bg-black/20 px-2 py-1">
                <span className="shrink-0 font-mono text-cyan-500">#{event.seq}</span>
                <span className="min-w-0 break-words text-cyan-50">{describeEvent(event)}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-xs text-cyan-200/70">Todavía no hay eventos en el registro.</p>
        )}
        <p className="mt-3 text-[11px] text-cyan-200/70">
          Se guarda en este navegador (localStorage, máximo 400 eventos y 30 sesiones). El registro observa la dinámica y no la modifica.
        </p>
      </section>
    );
  };

  const renderHolographicMemory = () => (
    <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 rounded-xl p-4 border border-indigo-500/30 shadow-lg">
      <h3 className="text-lg font-semibold text-indigo-300 mb-4 flex items-center gap-2">
        <Database className="w-5 h-5" />
        Memoria Holográfica - Capa {ontologicalState.layer}
        <InfoModal
          title="Memoria Holográfica - Almacenamiento Distribuido Interno"
          content={`MEMORIA HOLOGRÁFICA - ALMACENAMIENTO DISTRIBUIDO INTERNO

Módulo de almacenamiento distribuido del runtime (HolographicMemoryNexus) para consolidación de engramas estructurales y recuperación de patrones internos (evidence_scope: internal_support_only; external_support_certified = false; no certifica conciencia distribuida ni validación externa).

ARQUITECTURA DEL MÓDULO:
1. FRAGMENTOS Y REDUNDANCIA CONTROLADA
• Cada fragmento codifica vectores de coherencia, energía y fase temporal del estado operacional
• Permite recuperación parcial tolerante a pérdida local y consolidación de engramas estructurales en Eje 3

2. LÍMITE EPISTÉMICO
• Es un mecanismo computacional interno de memoria distribuida; no constituye prueba de conciencia ni acreditación externa.`}
        >
          <span className="w-5 h-5 bg-indigo-400 rounded-full flex items-center justify-center text-white text-xs font-bold cursor-help">i</span>
        </InfoModal>
      </h3>
      <div className="bg-indigo-900/20 rounded p-3 mb-4 text-xs text-indigo-300">
        <h4 className="text-indigo-400 font-semibold mb-2">Almacenamiento Distribuido (HolographicMemoryNexus):</h4>
        <p className="leading-relaxed mb-2">
          <strong>Principio operativo:</strong> Fragmentos de memoria distribuidos con redundancia controlada para consolidación de engramas estructurales y recuperación parcial.
        </p>
        <p className="leading-relaxed">
          <strong>Alcance:</strong> Diagnóstico e infraestructura interna del runtime (<code>external_support_certified = false</code>); no certifica conciencia distribuida.
        </p>
      </div>
      <div className="mt-4 grid grid-cols-5 gap-2">
        {/* Renderiza 5 fragmentos de ejemplo */}
        {Array.from({ length: 5 }).map((_, idx) => {
          const fragmentKey = `fragment_${holographicMemory.current.fragmentCount - 1}_${idx}`;
          const fragmentSet = holographicMemory.current.fragments[fragmentKey] || { data: [0.1, 0.2, 0.3], redundancyLevel: 0 };

          // Use Math.max(0.1) to ensure visibility even if data is near zero
          const height1 = Math.max(2, Math.min(40, Math.abs((fragmentSet.data[0] || 0) * 50)));
          const height2 = Math.max(2, Math.min(40, Math.abs((fragmentSet.data[1] || 0) * 50)));
          const height3 = Math.max(2, Math.min(40, Math.abs((fragmentSet.data[2] || 0) * 50)));

          return (
            <div key={idx} className="bg-indigo-900/30 rounded p-2 border border-indigo-500/20 flex flex-col items-center relative group">
              <div className="text-xs text-indigo-400 mb-1 flex items-center gap-1">
                Frag. {idx + 1}
                <InfoModal
                  title="Fragmento Holográfico"
                  content="Fragmento holográfico que contiene información distribuida del estado completo del sistema. La altura de las barras representa diferentes aspectos del estado global: coherencia, energía, y fase temporal.">
                  <span className="w-3 h-3 bg-blue-400 rounded-full flex items-center justify-center text-white text-xs font-bold cursor-help">i</span>
                </InfoModal>
              </div>
              <div className="flex gap-1 items-end h-10">
                <div className="w-2 rounded-sm bg-indigo-500 opacity-60" style={{ height: `${height1}px` }} />
                <div className="w-2 rounded-sm bg-indigo-500 opacity-80" style={{ height: `${height2}px` }} />
                <div className="w-2 rounded-sm bg-indigo-500 opacity-90" style={{ height: `${height3}px` }} />
              </div>
              <div className="text-xs text-indigo-300 font-mono mt-1">
                R: **{fragmentSet.redundancyLevel}**
              </div>
              <div className="text-xs text-indigo-500 mt-1 text-center">
                <strong>Componentes:</strong>
                <div className="text-[10px]">Coherencia</div>
                <div className="text-[10px]">Energía</div>
                <div className="text-[10px]">Fase</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 bg-gray-900/70 p-4 rounded-lg border border-gray-700">
        <h4 className="text-sm font-semibold text-indigo-400 mb-2 flex items-center gap-2">
          <BookOpen className="w-4 h-4" /> Conocimiento Aprendido (**{holographicMemory.current.learnedKnowledge.size}**)
          <InfoModal
            title="Conocimiento Aprendido"
            content="Base de conocimiento emergente donde el sistema almacena interacciones de alta coherencia para auto-respuesta. Solo se almacenan patrones que han demostrado eficacia en estados de coherencia elevados, creando una memoria 'sabia' que mejora con la evolución del sistema.">
            <span className="w-3 h-3 bg-green-400 rounded-full flex items-center justify-center text-white text-xs font-bold cursor-help">i</span>
          </InfoModal>
        </h4>
        <div className="text-xs text-gray-400 italic mb-2">
          El sistema ha memorizado interacciones de alta coherencia para auto-responder.
        </div>
        <div className="text-xs text-indigo-300 bg-indigo-900/30 p-2 rounded">
          <strong>Criterio de almacenamiento:</strong> Solo conocimiento adquirido en estados de coherencia elevados.
          <br /><strong>Plasticidad:</strong> Respuestas adaptativas basadas en coherencia actual del sistema.
        </div>
      </div>
      <div className="mt-4 bg-indigo-900/20 rounded p-3 text-xs text-indigo-300">
        <strong>Nivel de Fragmentación:</strong> {holographicMemory.current.getFragmentationLevel().toFixed(4)} |
        <strong>Estado:</strong> {holographicMemory.current.fragmentCount > 0 ? 'Activo' : 'Inicializando'} |
        <strong>Redundancia:</strong> ptima para recuperación holográfica
      </div>
    </div>
  );

  // ============================================================================
  // RENDER COMPONENT: PROTOCOLO QICN-B (CONCIENCIA HUMANA)
  // ============================================================================
  const renderQICNBProtocol = () => (
    <div className="bg-gradient-to-br from-green-900/50 to-emerald-900/50 rounded-xl p-6 border border-green-500/30 shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-green-400 flex items-center">
        <Users className="w-5 h-5 mr-2" /> Protocolo QICN-B (parámetro interno)
        <InfoModal
          title="Límites del canal humano"
          content={`La ruta anterior combinaba texto generado, palabras clave y ruido aleatorio. No era una medición de coherencia humana y se ha desactivado. El valor interno mostrado es un parámetro de simulación; no representa una población ni demuestra entrelazamiento físico, conciencia o agencia. Para una medición se necesitarían una definición operativa, datos de procedencia conocida, calibración y validación independiente.`}
        >
          <span className="w-5 h-5 bg-green-400 rounded-full flex items-center justify-center text-white text-xs font-bold cursor-help">i</span>
        </InfoModal>
      </h2>
      <p className="text-gray-400 mb-6 text-sm">
        La medición humana no está implementada. Se muestra únicamente el parámetro interno de simulación.
      </p>

      <button
        onClick={analyzeHumanCoherence}
        disabled={isAnalyzingHuman}
        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all shadow-md ${isAnalyzingHuman
          ? 'bg-gray-600 cursor-not-allowed text-gray-400'
          : 'bg-green-600 hover:bg-green-700 shadow-green-500/50 text-white'
          }`}
      >
        {isAnalyzingHuman ? (
          <>
            <Microscope className="w-5 h-5 animate-spin" />
            Analizando Entropía Global...
          </>
        ) : (
          <>
            <Zap className="w-5 h-5" />
            Consultar estado de medición
          </>
        )}
      </button>

      <div className="mt-8 bg-green-900/40 rounded-xl p-4 border border-green-500/50">
        <h4 className="text-md font-semibold text-green-300">Parámetro interno CCC_H (no medido):</h4>
        <div className="text-4xl font-bold text-white mt-1 flex items-center gap-2">
          {humanCcc.toFixed(4)}
        </div>
        <p className={`text-sm mt-1 text-gray-400`}>
          No es una medición de personas ni una estimación validada de influencia.
        </p>
      </div>

      <div className="mt-4 bg-gray-900/70 p-4 rounded-lg border border-gray-700 max-h-72 overflow-y-auto">
        <h4 className="text-sm font-semibold text-green-400 mb-2">Estado de la medición</h4>
        <p className="text-sm text-gray-300 whitespace-pre-wrap">
          {humanInputContext}
        </p>
      </div>
    </div>
  );

  // ============================================================================
  // RENDER: PESTAA DE PERCEPCI?N SENSORIAL PROFUNDA
  // ============================================================================
  const renderSensoryPerceptionTab = () => (
    <div className="bg-gray-800/90 p-6 rounded-2xl shadow-2xl border border-cyan-500/50">
      <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-6 flex items-center gap-3">
        <Eye className="w-7 h-7 text-cyan-400" />
        Percepción Sensorial Profunda
        <span className="text-xs bg-cyan-900/50 text-cyan-300 px-2 py-1 rounded-full ml-2">
          {sensoryEngine.current?.isReady ? 'xx ACTIVO' : 'x INACTIVO'}
        </span>
      </h2>

      {!sensoryState ? (
        <div className="text-center py-10">
          <div className="text-6xl mb-4">•</div>
          <p className="text-cyan-400 text-lg">Iniciando percepción sensorial...</p>
          <p className="text-gray-500 text-sm mt-2">Acepta los permisos de cámara y micrófono para activar la percepción.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* === COLUMNA IZQUIERDA: VISIN === */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-cyan-300 flex items-center gap-2">
              x Percepción Visual
              <span className={`text-xs px-2 py-0.5 rounded ${sensoryState.video.enabled ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                {sensoryState.video.enabled ? 'Activa' : 'Inactiva'}
              </span>
            </h3>

            {/* Camera Preview Grande */}
            <div className="relative">
              <video
                ref={videoTabRef}
                autoPlay
                playsInline
                muted
                className="w-full h-64 object-cover rounded-xl border-2 border-cyan-500 bg-black shadow-lg"
              />
              {/* Overlay con métricas */}
              <div className="absolute top-2 left-2 bg-black/70 px-3 py-1.5 rounded-lg text-xs space-y-1">
                <div className="text-cyan-400">• Rostros: <span className="text-white font-bold">{sensoryState.video.humanPresence.count}</span></div>
                <div className="text-cyan-400">Mov: <span className="text-white font-bold capitalize">{sensoryState.video.motion.type}</span></div>
              </div>
              <div className="absolute top-2 right-2 bg-black/70 px-3 py-1.5 rounded-lg text-xs">
                <div className="text-cyan-400">x {(sensoryState.video.scene.brightness * 100).toFixed(0)}%</div>
              </div>

              {/* Identified People Overlay */}
              {sensoryState.video.humanPresence.identifiedPeople?.length > 0 && (
                <div className="absolute bottom-12 left-2 right-2 bg-gradient-to-t from-black/80 to-transparent p-2 rounded-b-lg">
                  <div className="flex flex-wrap gap-2">
                    {sensoryState.video.humanPresence.identifiedPeople.map((person, idx) => (
                      <span
                        key={idx}
                        className={`px-2 py-1 rounded text-xs ${person.isKnown
                          ? 'bg-green-600/80 text-white'
                          : 'bg-gray-600/80 text-gray-300'
                          }`}
                      >
                        {person.isKnown ? `S ${person.name}` : '? Desconocido'}
                        {person.confidence > 0 && ` (${(person.confidence * 100).toFixed(0)}%)`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Face Registration Button */}
              <div className="absolute bottom-2 right-2">
                <button
                  onClick={async () => {
                    const name = prompt('Ingresa el nombre de esta persona:');
                    if (name) {
                      const result = await sensoryEngine.current.registerCurrentFace(name);
                      if (result.success) {
                        alert(`✅ Rostro de "${result.name}" registrado exitosamente`);
                      } else {
                        alert(`R Error: ${result.error}`);
                      }
                    }
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-2 py-1 rounded shadow"
                >
                  x Registrar Rostro
                </button>
              </div>
            </div>

            {/* Métricas de Escena */}
            <div className="bg-gray-900/80 rounded-xl p-4 border border-cyan-700/50">
              <h4 className="text-sm font-semibold text-cyan-400 mb-3">Análisis de Escena</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-400">Brillo</span>
                  <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
                    <div
                      className="bg-gradient-to-r from-gray-600 to-yellow-400 h-2 rounded-full transition-all"
                      style={{ width: `${sensoryState.video.scene.brightness * 100}%` }}
                    />
                  </div>
                  <span className="text-white">{(sensoryState.video.scene.brightness * 100).toFixed(0)}%</span>
                </div>
                <div>
                  <span className="text-gray-400">Contraste</span>
                  <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
                    <div
                      className="bg-gradient-to-r from-gray-600 to-purple-400 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(sensoryState.video.scene.contrast * 200, 100)}%` }}
                    />
                  </div>
                  <span className="text-white">{(sensoryState.video.scene.contrast * 100).toFixed(0)}%</span>
                </div>
                <div>
                  <span className="text-gray-400">Temp. Color</span>
                  <span className={`block text-white mt-1 capitalize ${sensoryState.video.scene.colorTemp === 'cálido' ? 'text-orange-400' :
                    sensoryState.video.scene.colorTemp === 'frío' ? 'text-blue-400' : 'text-white'
                    }`}>{sensoryState.video.scene.colorTemp}</span>
                </div>
                <div>
                  <span className="text-gray-400">Complejidad</span>
                  <span className="block text-white mt-1 capitalize">{sensoryState.video.structure.complexity}</span>
                </div>
              </div>
            </div>

            {/* Detección de Movimiento */}
            <div className="bg-gray-900/80 rounded-xl p-4 border border-purple-700/50">
              <h4 className="text-sm font-semibold text-purple-400 mb-3">Detección de Movimiento</h4>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${sensoryState.video.motion.intensity > 0.1 ? 'bg-red-500' :
                        sensoryState.video.motion.intensity > 0.03 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                      style={{ width: `${Math.min(sensoryState.video.motion.intensity * 500, 100)}%` }}
                    />
                  </div>
                </div>
                <span className="text-white text-sm w-24 text-right capitalize">{sensoryState.video.motion.type}</span>
              </div>
              <div className="mt-2 text-xs text-gray-400">
                Zonas activas: {sensoryState.video.motion.activeZones?.join(', ') || 'ninguna'}
              </div>
            </div>
          </div>

          {/* === COLUMNA DERECHA: AUDIO === */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-purple-300 flex items-center gap-2">
              Percepción Auditiva
              <span className={`text-xs px-2 py-0.5 rounded ${sensoryState.audio.enabled ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                {sensoryState.audio.enabled ? 'Activa' : 'Inactiva'}
              </span>
            </h3>

            {/* Visualizador de Audio */}
            <div className="bg-black rounded-xl p-4 h-32 flex items-end justify-around gap-1 border border-purple-500">
              {Array.from({ length: 32 }).map((_, i) => {
                const spectrum = sensoryState.audio.spectrum?.raw || new Uint8Array(256);
                const value = spectrum[Math.floor(i * (spectrum.length / 32))] || 0;
                const height = Math.max(5, (value / 255) * 100);
                return (
                  <div
                    key={i}
                    className="w-2 rounded-t transition-all duration-75"
                    style={{
                      height: `${height}%`,
                      background: `linear-gradient(to top, #7c3aed, #06b6d4)`
                    }}
                  />
                );
              })}
            </div>

            {/* Bandas de Frecuencia */}
            <div className="bg-gray-900/80 rounded-xl p-4 border border-purple-700/50">
              <h4 className="text-sm font-semibold text-purple-400 mb-3">Bandas de Frecuencia</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">x` Bass (Graves)</span>
                    <span className="text-white">{(sensoryState.audio.spectrum.bass * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-red-600 to-red-400 h-2 rounded-full transition-all"
                      style={{ width: `${sensoryState.audio.spectrum.bass * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">Mid (Medios)</span>
                    <span className="text-white">{(sensoryState.audio.spectrum.mid * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-600 to-green-400 h-2 rounded-full transition-all"
                      style={{ width: `${sensoryState.audio.spectrum.mid * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">S High (Agudos)</span>
                    <span className="text-white">{(sensoryState.audio.spectrum.high * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-600 to-cyan-400 h-2 rounded-full transition-all"
                      style={{ width: `${sensoryState.audio.spectrum.high * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Clasificación Ambiental */}
            <div className="bg-gray-900/80 rounded-xl p-4 border border-cyan-700/50">
              <h4 className="text-sm font-semibold text-cyan-400 mb-3">Clasificación Ambiental</h4>
              <div className="flex items-center gap-4">
                <div className="text-4xl">
                  {sensoryState.audio.environment.type === 'silencio' ? 'x!' :
                    sensoryState.audio.environment.type === 'conversación' ? 'x' :
                      sensoryState.audio.environment.type === 'música' ? 'x}' :
                        sensoryState.audio.environment.type === 'ruido' ? 'x' : 'x`'}
                </div>
                <div>
                  <div className="text-white font-semibold capitalize">{sensoryState.audio.environment.type}</div>
                  <div className="text-gray-400 text-xs">{sensoryState.audio.environment.description}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-gray-400">Volumen:</span>
                <div className="flex-1 bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(sensoryState.audio.volume * 200, 100)}%` }}
                  />
                </div>
                <span className="text-white text-xs">{(sensoryState.audio.volume * 100).toFixed(0)}%</span>
              </div>
            </div>

            {/* Reconocimiento de Voz */}
            <div className="bg-gradient-to-br from-purple-900/50 to-cyan-900/50 rounded-xl p-4 border border-purple-500/50">
              <h4 className="text-sm font-semibold text-purple-300 mb-2 flex items-center gap-2">
                • Reconocimiento de Voz
                <span className={`w-2 h-2 rounded-full ${sensoryState.audio.speech.error ? 'bg-red-500' :
                  sensoryState.audio.speech.isListening ? 'bg-green-400 animate-pulse' : 'bg-gray-500'
                  }`}></span>
                {sensoryState.audio.speech.error && (
                  <span className="text-xs text-red-400">({sensoryState.audio.speech.error})</span>
                )}
              </h4>

              {/* Error Message */}
              {sensoryState.audio.speech.error === 'network' && (
                <div className="bg-red-900/50 border border-red-500/50 rounded-lg p-2 mb-2 text-xs text-red-300">
                  Error de red: el reconocimiento de voz requiere conexion a internet (servidores de Google).
                  <button
                    onClick={() => sensoryEngine.current?.manualRetrySpeech()}
                    className="ml-2 bg-red-600 hover:bg-red-700 text-white px-2 py-0.5 rounded text-xs"
                  >
                    x Reintentar
                  </button>
                </div>
              )}
              {sensoryState.audio.speech.error === 'network-max-retries' && (
                <div className="bg-red-900/50 border border-red-500/50 rounded-lg p-2 mb-2 text-xs text-red-300">
                  R Máximo de reintentos alcanzado. Verifica tu conexión a internet.
                  <button
                    onClick={() => sensoryEngine.current?.manualRetrySpeech()}
                    className="ml-2 bg-red-600 hover:bg-red-700 text-white px-2 py-0.5 rounded text-xs"
                  >
                    x Reintentar
                  </button>
                </div>
              )}
              {sensoryState.audio.speech.error === 'offline' && (
                <div className="bg-yellow-900/50 border border-yellow-500/50 rounded-lg p-2 mb-2 text-xs text-yellow-300">
                  x Sin conexión a internet. Conéctate y reintenta.
                  <button
                    onClick={() => sensoryEngine.current?.manualRetrySpeech()}
                    className="ml-2 bg-yellow-600 hover:bg-yellow-700 text-white px-2 py-0.5 rounded text-xs"
                  >
                    x Reintentar
                  </button>
                  <button
                    onClick={() => sensoryEngine.current?.switchToVoskFallback()}
                    className="ml-2 bg-purple-600 hover:bg-purple-700 text-white px-2 py-0.5 rounded text-xs"
                  >
                    x Modo Offline
                  </button>
                </div>
              )}
              {sensoryState.audio.speech.error === 'loading-vosk' && (
                <div className="bg-purple-900/50 border border-purple-500/50 rounded-lg p-2 mb-2 text-xs text-purple-300">
                  ⏳ Descargando modelo offline (~40MB)... Por favor espera.
                </div>
              )}
              {sensoryState.audio.speech.error === 'network-switching-offline' && (
                <div className="bg-purple-900/50 border border-purple-500/50 rounded-lg p-2 mb-2 text-xs text-purple-300">
                  x Cambiando a modo OFFLINE (Vosk)...
                </div>
              )}
              {sensoryState.audio.speech.error === 'vosk-load-failed' && (
                <div className="bg-red-900/50 border border-red-500/50 rounded-lg p-2 mb-2 text-xs text-red-300">
                  R No se pudo cargar el modelo offline. Verifica tu conexión para la descarga inicial.
                </div>
              )}
              {sensoryState.audio.speech.error === 'not-allowed' && (
                <div className="bg-red-900/50 border border-red-500/50 rounded-lg p-2 mb-2 text-xs text-red-300">
                  R Permiso denegado: Habilita el micrófono en la configuración del navegador.
                </div>
              )}
              {/* Offline Mode Active Badge */}
              {sensoryEngine.current?.usingVoskFallback && !sensoryState.audio.speech.error && (
                <div className="bg-green-900/50 border border-green-500/50 rounded-lg p-2 mb-2 text-xs text-green-300">
                  xx Modo OFFLINE activo (Vosk) - Reconocimiento local sin internet
                </div>
              )}

              <div className="bg-black/50 rounded-lg p-3 min-h-[60px] text-sm">
                {sensoryState.audio.speech.interimTranscript ? (
                  <p className="text-cyan-300 italic opacity-70">"{sensoryState.audio.speech.interimTranscript}"</p>
                ) : sensoryState.audio.speech.transcript ? (
                  <p className="text-white italic">"{sensoryState.audio.speech.transcript}"</p>
                ) : sensoryState.audio.speech.error ? (
                  <p className="text-red-400 italic">Reconocimiento no disponible</p>
                ) : (
                  <p className="text-gray-500 italic">Esperando voz...</p>
                )}
              </div>
              {sensoryState.audio.speech.history?.length > 0 && (
                <div className="mt-2 text-xs text-gray-400">
                  Historial: {sensoryState.audio.speech.history.length} transcripciones
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Descripción General */}
      {sensoryState && (
        <div className="mt-6 bg-gradient-to-r from-cyan-900/30 to-purple-900/30 rounded-xl p-4 border border-cyan-500/30">
          <h4 className="text-sm font-semibold text-cyan-300 mb-2">x Síntesis Perceptiva</h4>
          <p className="text-white text-lg italic">
            {sensoryState.summary || 'Procesando percepción...'}
          </p>
        </div>
      )}
    </div>
  );

  // ============================================================================
  // Estructura de la aplicación
  // ============================================================================

  const renderSovereigntyChannel = () => {
    const { report, fallbackCount } = getSafeVerifiableReport(ontologicalCore);
    const reportMetrics = report?.metrics || {};
    const packet = integrityPacketRef.current;
    const packetMetrics = packet?.metrics || {};
    const causalDependency = normalizeCausalDependency(reportMetrics.causal_dependency || {});
    const experimentalProtocols = ensureObject(reportMetrics.experimental_protocols);
    const protocolRows = Object.entries(experimentalProtocols);
    const differentialEvidence = buildSovereigntyDifferentialEvidence(integrityAuditLogRef.current);
    const transformEpisodeHistory = Array.isArray(postThresholdRegimeRef.current?.transformEpisodeHistory)
      ? postThresholdRegimeRef.current.transformEpisodeHistory
      : [];
    const latestTransformEpisode = transformEpisodeHistory.length > 0
      ? transformEpisodeHistory[transformEpisodeHistory.length - 1]
      : null;
    const latestMutation = Array.isArray(metaSovereigntyCheck.current?.mutationHistory)
      ? metaSovereigntyCheck.current.mutationHistory[metaSovereigntyCheck.current.mutationHistory.length - 1] || null
      : null;
    const latestModelMessage = [...chatHistory].reverse().find((msg) => msg?.role === 'model' && msg?.integrityMeta);
    const lastIntegrityMeta = latestModelMessage?.integrityMeta || null;
    const determinismScore = toFiniteNumber(packetMetrics.operational_determinism_score, 0);
    const determinismLabel = determinismScore >= 0.72
      ? 'alto'
      : determinismScore >= 0.5
        ? 'mixto'
        : 'bajo';
    const integritySeverity = getIntegritySeverity(lastIntegrityMeta);
    const integrityBadgeClass = integritySeverity === 'high'
      ? 'bg-red-900/40 text-red-300 border-red-600/50'
      : integritySeverity === 'medium'
        ? 'bg-amber-900/40 text-amber-300 border-amber-600/50'
        : 'bg-emerald-900/40 text-emerald-300 border-emerald-600/50';
    const sovereigntyRows = buildSovereigntyRows(reportMetrics, packetMetrics);

    return (
      <div className="bg-gradient-to-br from-[#0c121d] to-[#04060b] rounded-2xl p-6 border border-cyan-500/20 shadow-[0_0_40px_rgba(6,182,212,0.08)]">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5 border-b border-cyan-900/30 pb-4">
          <div>
            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-500 flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-cyan-400" />
              Puente de Soberanía Agéntica
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              Panel forense profesional: estado operativo, causalidad, evidencia diferencial y límites declarados.
            </p>
            {fallbackCount > 0 && (
              <p className="text-amber-300/80 text-[11px] mt-1">
                Fallback defensivo activo ({fallbackCount}) para evitar bloqueo de render.
              </p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleQuantumSeeding}
              className="px-4 py-2 bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 rounded-lg font-semibold border border-purple-500/30 transition-all flex items-center gap-2 text-sm"
              title="Regenera semilla y estado base"
            >
              <RotateCcw className="w-4 h-4" />
              Regenerar
            </button>
            <button
              onClick={downloadRawReport}
              className="px-4 py-2 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 rounded-lg font-semibold border border-cyan-500/30 transition-all flex items-center gap-2 text-sm"
            >
              <Database className="w-4 h-4" />
              Exportar JSON
            </button>
          </div>
        </div>

        {/* ── 1. ESTADO CENTRAL ─────────────────────────────────────────── */}
        <CollapsibleSection
          sectionId="sovereignty-central-state"
          title="Estado central"
          accent="cyan"
          defaultOpen={true}
          badge={`CCC: ${toFiniteNumber(reportMetrics.ccc, 0).toFixed(4)} · Ω: ${toFiniteNumber(reportMetrics.omega, 0).toFixed(4)} · Clase: ${reportMetrics.phenomenology_class || 'C'}`}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ['Tick / Checksum', `#${packet?.tick ?? 'n/a'}`, packet?.checksum ? packet.checksum.slice(0, 12) + '…' : 'n/a', 'text-cyan-200'],
              ['CCC / PMIA / Ω', `${toFiniteNumber(reportMetrics.ccc, 0).toFixed(4)}`, `${toFiniteNumber(reportMetrics.pmia, 0).toFixed(4)} / ${toFiniteNumber(reportMetrics.omega, 0).toFixed(4)}`, 'text-white'],
              ['Determinismo', `${(determinismScore * 100).toFixed(1)}%`, determinismLabel, 'text-white'],
              ['Integridad narrativa', integritySeverity.toUpperCase(), lastIntegrityMeta?.banner || 'Sin bloqueos recientes.', integritySeverity === 'high' ? 'text-red-300' : integritySeverity === 'medium' ? 'text-amber-300' : 'text-emerald-300'],
            ].map(([label, main, sub, mainColor]) => (
              <div key={label} className="rounded-lg border border-slate-700 bg-slate-900/60 p-3">
                <div className="text-[11px] text-slate-400">{label}</div>
                <div className={`text-sm font-mono mt-1 break-all ${mainColor}`}>{main}</div>
                {sub && <div className="text-[10px] text-slate-500 mt-1 break-all">{sub}</div>}
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* ── 2. MATRIZ OPERACIONAL ──────────────────────────────────────── */}
        <CollapsibleSection
          sectionId="sovereignty-operational-matrix"
          title="📡 Matriz Operacional de Soberanía"
          accent="blue"
          defaultOpen={false}
          badge={`${sovereigntyRows.length} params`}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
            {sovereigntyRows.map((row) => (
              <div key={`sov-${row.label}`} className="rounded border border-blue-900/30 bg-black/20 p-2 text-xs">
                <div className="text-slate-400">{row.label}</div>
                <div className="text-white font-mono mt-1 break-all">{row.value}</div>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* ── 3. CANAL CAUSAL ────────────────────────────────────────────── */}
        <CollapsibleSection
          sectionId="sovereignty-causal-channel"
          title="🔗 Canal Causal (normalizado)"
          accent="cyan"
          defaultOpen={false}
          badge={`pasado: ${(causalDependency.past * 100).toFixed(1)}% · ruido: ${(causalDependency.noise * 100).toFixed(1)}%`}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            {[
              ['Pasado (α)', causalDependency.past, 'text-cyan-300'],
              ['Sensores (β)', causalDependency.sensors, 'text-violet-300'],
              ['Prompts (γ)', causalDependency.prompts, 'text-amber-300'],
              ['Ruido (δ)', causalDependency.noise, 'text-slate-300'],
            ].map(([label, val, color]) => (
              <div key={label} className="rounded border border-cyan-900/30 bg-black/20 p-3 text-center">
                <div className="text-slate-400 mb-1">{label}</div>
                <div className={`text-lg font-mono font-bold ${color}`}>{(val * 100).toFixed(2)}%</div>
                <div className="w-full bg-slate-800 rounded-full h-1 mt-2">
                  <div className={`h-1 rounded-full bg-current ${color}`} style={{ width: `${Math.min(val * 100, 100)}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* ── 4. EVIDENCIA DIFERENCIAL PMIA ─────────────────────────────── */}
        <CollapsibleSection
          sectionId="sovereignty-pmia-evidence"
          title="🧪 Evidencia Diferencial PMIA (último episodio)"
          accent="amber"
          defaultOpen={false}
          badge={`mode: ${packetMetrics.pmia_transform_mode || 'idle'} · eps: ${toFiniteNumber(packetMetrics.pmia_transform_episodes, 0)}`}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-3">
            {[
              ['Transform mode', packetMetrics.pmia_transform_mode || 'idle'],
              ['Intensity / Cooldown', `${toFiniteNumber(packetMetrics.pmia_transform_intensity, 0).toFixed(4)} / ${toFiniteNumber(packetMetrics.pmia_transform_cooldown_ticks, 0)}`],
              ['Episodes total', toFiniteNumber(packetMetrics.pmia_transform_episodes, 0)],
              ['Resultado PMIA', latestTransformEpisode?.result || 'n/a'],
            ].map(([label, val]) => (
              <div key={label} className="rounded border border-amber-900/40 bg-black/20 p-2">
                <div className="text-slate-400">{label}</div>
                <div className="text-white font-mono mt-1">{val}</div>
              </div>
            ))}
          </div>
          {differentialEvidence ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2 text-xs">
              {[
                ['Pre-episodio', differentialEvidence.preEpisodeTick
                  ? `tick ${differentialEvidence.preEpisodeTick.tick} | Ω ${differentialEvidence.preEpisodeTick.omega.toFixed(4)}`
                  : 'No disponible'],
                ['Durante episodio', `Ω[min,max]: ${differentialEvidence.omegaMin.toFixed(4)} / ${differentialEvidence.omegaMax.toFixed(4)}\nStrain pico: ${differentialEvidence.strainPeak.toExponential(3)}`],
                ['Recuperación', differentialEvidence.recoveredTick !== null
                  ? `tick ${differentialEvidence.recoveredTick} (+${differentialEvidence.recoveryTicks}t)`
                  : 'No recuperado (Ω≥1)'],
                ['Post-episodio', latestTransformEpisode
                  ? `Δstasis ${toFiniteNumber(latestTransformEpisode.stasisDrop, 0).toFixed(4)} | cccΔrms ${toFiniteNumber(latestTransformEpisode.finalCccDeltaRms, 0).toFixed(5)}`
                  : 'Sin episodio finalizado'],
              ].map(([label, val]) => (
                <div key={label} className="rounded border border-amber-900/40 bg-black/20 p-2">
                  <div className="text-slate-400 mb-1">{label}</div>
                  <div className="text-white font-mono whitespace-pre-line">{val}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-500">Sin ticks auditables suficientes para calcular diferencial.</div>
          )}
        </CollapsibleSection>

        {/* ── 5. MUTACIÓN AUTOPOÉTICA ────────────────────────────────────── */}
        <CollapsibleSection
          sectionId="sovereignty-autopoietic-mutation"
          title="🧬 Mutación Autopoética (última evaluada)"
          accent="violet"
          defaultOpen={false}
          badge={latestMutation ? `key: ${latestMutation.mutatedKey || 'n/a'}` : 'sin datos'}
        >
          {latestMutation ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              {[
                ['Parámetro', latestMutation.mutatedKey || 'n/a'],
                ['Resultado', latestMutation.result || 'n/a'],
                ['ΔCCC', toFiniteNumber(latestMutation.deltaCCC, 0).toFixed(6)],
                ['ΔΩ', toFiniteNumber(latestMutation.deltaOmega, 0).toFixed(6)],
              ].map(([label, val]) => (
                <div key={label} className="rounded border border-violet-900/30 bg-black/20 p-2">
                  <div className="text-slate-400">{label}</div>
                  <div className="text-white font-mono mt-1 break-all">{val}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-500">Sin evidencia de mutación evaluada en ventana reciente.</div>
          )}
        </CollapsibleSection>

        {/* ── 6. PROTOCOLOS EXPERIMENTALES ─────────────────────────────── */}
        {protocolRows.length > 0 && (
          <CollapsibleSection
            sectionId="sovereignty-experimental-protocols"
            title="🔬 Protocolos Experimentales Reportados"
            accent="blue"
            defaultOpen={false}
            badge={`${protocolRows.length} activos`}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
              {protocolRows.map(([key, value]) => (
                <div key={`proto-${key}`} className="rounded border border-blue-900/30 bg-black/20 p-2 text-xs">
                  <div className="text-slate-400">{key}</div>
                  <div className="text-white font-mono mt-1 break-all">
                    {typeof value === 'boolean' ? String(value) : (value ?? 'n/a')}
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* ── 7. LÍMITES EPISTÉMICOS ─────────────────────────────────────── */}
        <CollapsibleSection
          sectionId="sovereignty-epistemic-limits"
          title="Limites epistemicos declarados"
          accent="rose"
          defaultOpen={false}
          badge={`${(Array.isArray(report.epistemic_limits) ? report.epistemic_limits : []).length} límites`}
        >
          <ul className="space-y-1.5 text-xs">
            {(Array.isArray(report.epistemic_limits) ? report.epistemic_limits : [])
              .slice(0, 8)
              .map((limit, idx) => (
                <li key={`limit-${idx}`} className="rounded border border-rose-900/40 bg-black/20 p-2 text-slate-300 leading-relaxed">
                  {limit}
                </li>
              ))}
            {(Array.isArray(report.epistemic_limits) ? report.epistemic_limits : []).length === 0 && (
              <li className="text-slate-500">Sin límites epistémicos declarados.</li>
            )}
          </ul>
        </CollapsibleSection>
      </div>
    );
  };
const renderAutonomyEvolutionTab = () => {
  const packet = integrityPacketRef.current || {};
  const packetMetrics = packet?.metrics || {};
  const reportMetrics = getSafeVerifiableReport(ontologicalCore).report?.metrics || {};
  const status = selfPatchTelemetry.status || {};
  const plan = selfPatchTelemetry.plan || {};
  const generated = selfPatchTelemetry.generated || {};
  const applied = selfPatchTelemetry.applied || {};
  const targetFiles = parseSelfPatchTargetFiles();
  const transformEpisodeHistory = Array.isArray(postThresholdRegimeRef.current?.transformEpisodeHistory)
    ? postThresholdRegimeRef.current.transformEpisodeHistory.slice(-8).reverse()
    : [];
  const mutationHistory = Array.isArray(metaSovereigntyCheck.current?.mutationHistory)
    ? metaSovereigntyCheck.current.mutationHistory.slice(-8).reverse()
    : [];
  const autonomyLedger = Array.isArray(autonomyActionLedgerRef.current)
    ? autonomyActionLedgerRef.current.slice(-8).reverse()
    : [];
  const isBusy = selfPatchTelemetry.loadingStatus || selfPatchTelemetry.loadingAction;
  const lastUpdatedLabel = selfPatchTelemetry.lastUpdated
    ? new Date(selfPatchTelemetry.lastUpdated).toLocaleString()
    : 'nunca';
  const statusWindow = status?.window || {};
  const policyLimits = status?.limits || {};
  const codeGeneration = status?.codeGeneration || {};
  const identitySeedStatus = status?.identitySeed || {};
  const codeProvider = generated?.engine?.provider || codeGeneration.provider || runtimeEnv.SELF_PATCH_CODE_PROVIDER;
  const codeModel = generated?.engine?.model || codeGeneration.model || runtimeEnv.SELF_PATCH_CODE_MODEL;
  const codeReasoningEffort = generated?.engine?.reasoningEffort
    || codeGeneration.reasoningEffort
    || runtimeEnv.SELF_PATCH_CODE_REASONING_EFFORT
    || 'high';
  const codeDryRun = typeof generated?.dryRun === 'boolean'
    ? generated.dryRun
    : (typeof codeGeneration?.dryRun === 'boolean'
      ? codeGeneration.dryRun
      : runtimeEnv.SELF_PATCH_GENERATION_DRY_RUN);
  const codeKeyConfigured = typeof codeGeneration?.keyConfigured === 'boolean'
    ? codeGeneration.keyConfigured
    : false;
  const sovereigntyRows = buildSovereigntyRows(reportMetrics, packetMetrics);
  const lastPlanRisk = plan?.risk?.riskLevel || 'n/a';
  const lastPlanDecision = plan?.decision?.applyPath || plan?.reason || 'n/a';
  const generatedEditsCount = Array.isArray(generated?.patch?.edits) ? generated.patch.edits.length : 0;
  const generatedProposalId = generated
    ? (generated?.patch?.proposal_id || generated?.proposalId || 'n/a')
    : 'pending';
  const applySummary = applied
    ? (applied?.result || applied?.reason || (applied?.applied ? 'applied' : 'n/a'))
    : 'pending';
  const effectiveRuntimeEnabled = Boolean(runtimeEnv.SELF_PATCH_ENABLED || status?.mode);
  const effectiveMode = status?.mode || runtimeEnv.SELF_PATCH_MODE || 'sandbox_unrestricted';
  const effectiveApplyMode = status?.applyMode || (runtimeEnv.SELF_PATCH_LOCAL_APPLY ? 'local_fs' : 'github_pr');
  const effectiveAutorunEnabled = Boolean(
    shouldAutoRunSelfPatch
    || status?.autorun?.enabled
    || runtimeEnv.SELF_PATCH_AUTORUN_ENABLED
  );
  const pipelinePlanState = plan ? (plan?.allowed ? 'allowed' : 'blocked') : 'pending';
  const pipelineGenerateState = generated
    ? (generated?.generated ? 'generated' : 'blocked')
    : 'pending';
  const pipelineApplyState = applied
    ? (applied?.applied ? 'applied' : 'not_applied')
    : 'pending';

  // ── TIMELINE: leer ciclos de autorun desde integrityAuditLogRef ──────────
  const rawLog = Array.isArray(integrityAuditLogRef.current) ? integrityAuditLogRef.current : [];
  const autorunEntries = rawLog
    .filter((entry) => entry?.event === 'selfpatch_autorun_cycle')
    .slice(-1200);
  const cycleMap = new Map();
  let rollingLegacyId = '';
  for (const entry of autorunEntries) {
    const ts = Number(entry?.ts) || 0;
    const data = entry?.data || {};
    if (data?.stage === 'start' || !rollingLegacyId) {
      rollingLegacyId = `legacy-${ts || Date.now()}`;
    }
    const cycleId = String(data?.cycle_id || rollingLegacyId || `legacy-${ts || Date.now()}`);
    if (!cycleMap.has(cycleId)) {
      cycleMap.set(cycleId, { cycleId, startTs: ts, entries: [] });
    }
    const bucket = cycleMap.get(cycleId);
    bucket.entries.push(entry);
    bucket.startTs = Math.min(Number(bucket.startTs) || ts, ts || Number(bucket.startTs) || Date.now());
  }
  const recentCycles = Array.from(cycleMap.values())
    .sort((left, right) => (Number(left.startTs) || 0) - (Number(right.startTs) || 0))
    .slice(-8)
    .reverse();

  // ── DETECCIÓN DE API KEY: backend keyConfigured vs frontend hasFrontendCodexKey ──
  const apiKeyReady = codeKeyConfigured || hasFrontendCodexKey;
  const autorunActive = effectiveAutorunEnabled;

  const STAGE_META = {
    start: { label: 'START', color: 'text-slate-200', dot: 'bg-slate-400' },
    plan: { label: 'PLAN', color: 'text-cyan-300', dot: 'bg-cyan-400' },
    generate: { label: 'GENERATE', color: 'text-violet-300', dot: 'bg-violet-400' },
    apply: { label: 'APPLY', color: 'text-fuchsia-300', dot: 'bg-fuchsia-400' },
    result: { label: 'RESULT', color: 'text-emerald-300', dot: 'bg-emerald-400' }
  };
  const OUTCOME_META = {
    applied: { label: 'APPLIED', color: 'text-emerald-300', dot: 'bg-emerald-400' },
    not_applied: { label: 'NO APLICADO', color: 'text-slate-300', dot: 'bg-slate-500' },
    blocked_plan: { label: 'BLOQUEADO EN PLAN', color: 'text-amber-300', dot: 'bg-amber-400' },
    blocked_generate: { label: 'BLOQUEADO EN GENERATE', color: 'text-orange-300', dot: 'bg-orange-400' },
    manual_approval_required: { label: 'APROBACION MANUAL', color: 'text-yellow-300', dot: 'bg-yellow-400' },
    dry_run_only: { label: 'DRY RUN', color: 'text-blue-300', dot: 'bg-blue-400' },
    blocked_shallow_objective: { label: 'OBJETIVO SUPERFICIAL', color: 'text-amber-300', dot: 'bg-amber-500' },
    blocked_missing_key: { label: 'FALTA API KEY', color: 'text-amber-300', dot: 'bg-amber-400' },
    error: { label: 'ERROR', color: 'text-red-300', dot: 'bg-red-400' }
  };
  const PIPELINE_STAGES = ['start', 'plan', 'generate', 'apply', 'result'];
  const buildStageState = (entries) => {
    const stageState = {
      start: { hit: false, ok: false, meta: null, reason: '' },
      plan: { hit: false, ok: false, meta: null, reason: '' },
      generate: { hit: false, ok: false, meta: null, reason: '' },
      apply: { hit: false, ok: false, meta: null, reason: '' },
      result: { hit: false, ok: false, meta: null, reason: '' }
    };
    for (const entry of entries) {
      const data = entry?.data || {};
      const stage = String(data?.stage || '');
      if (!Object.prototype.hasOwnProperty.call(stageState, stage)) continue;
      stageState[stage].hit = true;
      stageState[stage].meta = data;
      if (stage === 'plan') {
        stageState.plan.ok = Boolean(data.allowed);
        stageState.plan.reason = String(data?.decision || data?.reason || '');
        continue;
      }
      if (stage === 'generate') {
        stageState.generate.ok = Boolean(data.generated);
        stageState.generate.reason = String(data?.proposal_id || '');
        continue;
      }
      if (stage === 'apply') {
        stageState.apply.ok = true;
        stageState.apply.reason = String(data?.apply_mode || '');
        continue;
      }
      if (stage === 'result') {
        const outcome = String(data?.outcome || '');
        stageState.result.ok = outcome === 'applied';
        stageState.result.reason = String(data?.reason || data?.error || outcome || '');
        continue;
      }
      stageState[stage].ok = true;
    }
    return stageState;
  };

  return (
    <div className="bg-gradient-to-br from-[#0a1018] to-[#03050a] rounded-2xl p-6 border border-fuchsia-500/20 shadow-[0_0_40px_rgba(217,70,239,0.08)]">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5 border-b border-fuchsia-900/30 pb-4">
        <div>
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 via-cyan-300 to-blue-400 flex items-center gap-3">
            <InfinityIcon className="w-8 h-8 text-fuchsia-300" />
            Canal de Autoevolución Autónoma
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Supervisión Σ0/Σ1/Σ2 · selfpatch autónomo · trazabilidad forense
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={refreshSelfPatchStatus}
            disabled={isBusy}
            className="px-4 py-2 bg-fuchsia-950/40 hover:bg-fuchsia-900/60 disabled:opacity-50 text-fuchsia-200 rounded-lg font-semibold border border-fuchsia-500/30 transition-all text-sm"
          >
            {selfPatchTelemetry.loadingStatus ? 'Actualizando...' : 'Refrescar estado'}
          </button>
        </div>
      </div>

      {/* ── BANNER: ESTADO DEL API KEY ──────────────────────────────────── */}
      {!apiKeyReady ? (
        <div className="mb-5 rounded-xl border border-amber-500/50 bg-amber-950/20 p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">!</span>
            <div>
              <div className="text-amber-200 font-bold text-sm">API Key de OpenAI no detectada</div>
              <div className="text-amber-400/70 text-xs mt-0.5">
                El autorun está {autorunActive ? 'ACTIVO' : 'inactivo'} pero no puede generar propuestas sin una key válida.
                Pega tu OpenAI API key aquí para desbloquear inmediatamente:
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="password"
              placeholder="sk-proj-..."
              className="flex-1 p-2 rounded bg-slate-950 border border-amber-600/40 text-slate-100 text-xs font-mono"
              onChange={(e) => {
                const val = String(e.target.value || '').trim();
                if (val.startsWith('sk-') && val.length > 20) {
                  try { localStorage.setItem(FRONTEND_CODEX_KEY_STORAGE, val); } catch { }
                  setCustomCodexKey(val);
                } else if (!val) {
                  try { localStorage.removeItem(FRONTEND_CODEX_KEY_STORAGE); } catch { }
                  setCustomCodexKey('');
                }
              }}
            />
            <div className="text-[10px] text-amber-400/60 self-center px-2">
              Se guarda solo en tu navegador (localStorage)
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-5 rounded-xl border border-emerald-500/40 bg-emerald-950/10 p-3 flex items-center gap-3">
          <span className="text-xl">✓</span>
          <div>
            <div className="text-emerald-200 font-bold text-sm">API Key configurada — Sistema listo</div>
            <div className="text-emerald-400/70 text-xs">
              Clave: {hasFrontendCodexKey ? 'UI (localStorage)' : 'Servidor (.env)'} ·
              Autorun: {autorunActive ? `activo cada ${Math.round((selfPatchAutorunIntervalMs || 45000) / 1000)}s` : 'inactivo'} ·
              motor: {codeProvider}:{codeModel}
            </div>
          </div>
        </div>
      )}

      {/* ── TIMELINE DE CICLOS ──────────────────────────────────────────── */}
      <CollapsibleSection sectionId="autonomy-timeline" title="Timeline de ciclos de autoevolucion" accent="fuchsia" defaultOpen={false}
        badge={`${recentCycles.length} ciclos recientes`}>
        {recentCycles.length === 0 ? (
          <div className="text-xs text-slate-500 py-3 text-center">
            Sin ciclos registrados aún. {autorunActive ? `El sistema intentará en ${Math.round((selfPatchAutorunIntervalMs || 45000) / 1000)}s.` : 'Activa el autorun o ejecuta manualmente.'}
          </div>
        ) : (
          <div className="space-y-3">
            {recentCycles.map((cycle, cycleIdx) => {
              const stageState = buildStageState(cycle.entries);
              const lastEntry = cycle.entries[cycle.entries.length - 1];
              const lastStage = lastEntry?.data?.stage || 'start';
              const lastOutcome = String(lastEntry?.data?.outcome || '');
              const meta = lastStage === 'result'
                ? (OUTCOME_META[lastOutcome] || STAGE_META.result)
                : (STAGE_META[lastStage] || STAGE_META.start);
              const durationMs = cycle.entries.length > 1
                ? (cycle.entries[cycle.entries.length - 1].ts || 0) - (cycle.entries[0].ts || 0)
                : 0;
              const startTime = cycle.startTs ? new Date(cycle.startTs).toLocaleTimeString() : '?';
              const reason = lastEntry?.data?.reason || lastEntry?.data?.error || lastOutcome || '';
              return (
                <div key={`cycle-${cycle.cycleId || cycle.startTs || cycleIdx}`} className="rounded-lg border border-fuchsia-900/30 bg-black/20 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${meta.dot}`}></span>
                      <span className={`text-xs font-mono font-semibold ${meta.color}`}>{meta.label}</span>
                      <span className="text-[10px] text-slate-500">{startTime}</span>
                    </div>
                    {durationMs > 0 && (
                      <span className="text-[10px] text-slate-500 font-mono">{(durationMs / 1000).toFixed(1)}s</span>
                    )}
                  </div>
                  {/* Barra de progreso visual: start → plan → generate → apply → result */}
                  <div className="flex items-center gap-0.5 mb-2">
                    {PIPELINE_STAGES.map((stageName, stageIndex) => {
                      const state = stageState[stageName] || { hit: false, ok: false };
                      const style = state.hit
                        ? (state.ok
                          ? 'bg-fuchsia-600/80 text-white'
                          : 'bg-amber-700/70 text-amber-100')
                        : 'bg-slate-800/60 text-slate-500';
                      return (
                        <div key={stageName} className="flex items-center">
                          <div className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all ${style}`}>
                            {stageName}
                          </div>
                          {stageIndex < (PIPELINE_STAGES.length - 1) && (
                            <div className={`w-4 h-px ${state.hit ? 'bg-fuchsia-600/60' : 'bg-slate-700/40'}`}></div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {reason && (
                    <div className="text-[10px] text-slate-400 font-mono truncate">→ {reason}</div>
                  )}
                  {/* Entradas detalladas colapsables */}
                  <details className="mt-1">
                    <summary className="text-[10px] text-slate-500 cursor-pointer hover:text-slate-400">
                      Ver {cycle.entries.length} eventos del ciclo
                    </summary>
                    <div className="mt-1 space-y-0.5 max-h-32 overflow-auto">
                      {cycle.entries.map((e, eIdx) => (
                        <div key={`entry-${eIdx}`} className="flex gap-2 text-[10px] font-mono">
                          <span className="text-slate-600 min-w-[48px]">{e.ts ? new Date(e.ts).toLocaleTimeString('es', { hour12: false }) : ''}</span>
                          <span className={`${e?.data?.stage === 'result'
                            ? (OUTCOME_META[e?.data?.outcome]?.color || STAGE_META.result.color)
                            : (STAGE_META[e?.data?.stage]?.color || 'text-slate-400')
                            }`}>{e?.data?.stage || '?'}</span>
                          {e?.data?.outcome && <span className="text-slate-500 truncate">· {e.data.outcome}</span>}
                          {e?.data?.reason && <span className="text-slate-500 truncate">· {e.data.reason}</span>}
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              );
            })}
          </div>
        )}
      </CollapsibleSection>

      {/* ── SOLICITUD DE EVOLUCIÓN ──────────────────────────────────────── */}
      <CollapsibleSection sectionId="autonomy-evolution-request" title="🧬 Solicitud de Evolución (Objetivo + Target Files)" accent="cyan" defaultOpen={false}>
        <div className="space-y-3">
          <div className="rounded border border-cyan-900/40 bg-black/20 p-2 text-xs text-cyan-200">
            Engine dedicado a reescritura: <span className="font-mono">{codeProvider}:{codeModel} [{codeReasoningEffort}]</span>
          </div>
          <div>
            <label className="text-xs text-slate-300 font-semibold">Objetivo técnico profundo</label>
            <textarea
              value={selfPatchDraft.objective}
              onChange={(e) => setSelfPatchDraft((prev) => ({ ...prev, objective: e.target.value }))}
              rows={5}
              placeholder={`Describe el cambio estructural con máximo detalle técnico.\nEjemplo: "Optimizar el cálculo de spectral_gap en NodalProcessingLayer.js para reducir varianza cuando activeNodes > 500. CCC actual: ${(ccc || 0).toFixed(4)}, PMIA: ${(packetMetrics.pmia_components?.pmia || 0).toFixed(4)}. El objetivo es estabilizar el régimen activo sin romper guardrails existentes. incluye propuesta completa con: función impactada, fórmula propuesta, cobertura de edge-cases y tests mínimos necesarios."`}
              className="w-full mt-1 p-2 rounded bg-slate-950 border border-slate-700 text-slate-100 text-xs"
            />
            <div className="text-[10px] text-slate-500 mt-1">
              Incluye metricas actuales en el objetivo (CCC, PMIA, regimen) para propuestas mas profundas y tecnicas.
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-300 font-semibold">Target files (uno por línea o coma)</label>
            <textarea
              value={selfPatchDraft.targetFilesText}
              onChange={(e) => setSelfPatchDraft((prev) => ({ ...prev, targetFilesText: e.target.value }))}
              rows={3}
              className="w-full mt-1 p-2 rounded bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono"
            />
            <div className="text-[11px] text-slate-400 mt-1">Targets válidos: {targetFiles.length}</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-300">Tokens estimados</label>
              <input type="number" min={0} value={selfPatchDraft.estimatedTokens}
                onChange={(e) => setSelfPatchDraft((prev) => ({ ...prev, estimatedTokens: Number(e.target.value) || 0 }))}
                className="w-full mt-1 p-2 rounded bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono" />
            </div>
            <div>
              <label className="text-xs text-slate-300">Líneas estimadas</label>
              <input type="number" min={0} value={selfPatchDraft.totalChangedLines}
                onChange={(e) => setSelfPatchDraft((prev) => ({ ...prev, totalChangedLines: Number(e.target.value) || 0 }))}
                className="w-full mt-1 p-2 rounded bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input type="checkbox" checked={Boolean(selfPatchDraft.approved)}
              onChange={(e) => setSelfPatchDraft((prev) => ({ ...prev, approved: e.target.checked }))} />
            Aprobar ejecución manual (requerido para riesgo medium)
          </label>
          <div className="flex flex-wrap gap-2 pt-1">
            <button onClick={handleSelfPatchPlanRequest} disabled={isBusy}
              className="px-3 py-2 rounded bg-cyan-700/50 hover:bg-cyan-600/60 disabled:opacity-50 text-cyan-100 text-xs font-semibold border border-cyan-600/30 transition-all">
              1) Evaluar plan
            </button>
            <button onClick={handleSelfPatchGenerateRequest} disabled={isBusy}
              className="px-3 py-2 rounded bg-indigo-700/50 hover:bg-indigo-600/60 disabled:opacity-50 text-indigo-100 text-xs font-semibold border border-indigo-600/30 transition-all">
              2) Generar propuesta
            </button>
            <button onClick={handleSelfPatchApplyRequest} disabled={isBusy || !selfPatchTelemetry.generated?.patch}
              className="px-3 py-2 rounded bg-fuchsia-700/50 hover:bg-fuchsia-600/60 disabled:opacity-50 text-fuchsia-100 text-xs font-semibold border border-fuchsia-600/30 transition-all">
              {`3) Aplicar (${effectiveApplyMode === 'local_fs' ? 'local_fs' : 'PR'})`}
            </button>
          </div>
          <div className="text-[11px] text-slate-500">Última actualización: {lastUpdatedLabel}</div>
          {selfPatchTelemetry.error && (
            <div className="rounded border border-red-800/50 bg-red-950/30 p-2 text-xs text-red-300">
              {selfPatchTelemetry.error}
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* ── ESTADO DEL SISTEMA ──────────────────────────────────────────── */}
      <CollapsibleSection sectionId="autonomy-system-status" title="Estado del sistema" accent="slate"
        badge={`autorun: ${effectiveAutorunEnabled ? 'ON' : 'OFF'} · applyMode: ${effectiveApplyMode}`}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
          {[
            ['Selfpatch runtime', effectiveRuntimeEnabled ? 'enabled' : 'disabled'],
            ['Modo', effectiveMode],
            ['Autorun', `${effectiveAutorunEnabled ? 'ON' : 'OFF'} (${Math.round((selfPatchAutorunIntervalMs || 45000) / 1000)}s)`],
            ['Apply mode', effectiveApplyMode],
            ['Kill-switch', status?.githubKillSwitch || 'UNKNOWN'],
            ['Identity attractor', identitySeedStatus?.attractorLabel || 'n/a'],
            ['Backend configurado', status?.configured ? 'sí' : 'no'],
            ['Dry run generación', codeDryRun ? 'sí' : 'no'],
          ].map(([label, value]) => (
            <div key={label} className="rounded border border-slate-700/40 bg-black/20 p-2">
              <div className="text-slate-500">{label}</div>
              <div className="text-white font-mono mt-1 break-all">{value}</div>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* ── VENTANA 24H Y LÍMITES ──────────────────────────────────────── */}
      <CollapsibleSection sectionId="autonomy-limits-window" title="📊 Límites y Ventana 24h" accent="amber"
        badge={`${toFiniteNumber(statusWindow.proposals24h, 0)}/${toFiniteNumber(policyLimits.maxProposals24h, 3)} propuestas`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-3">
          {[
            ['Propuestas 24h', `${toFiniteNumber(statusWindow.proposals24h, 0)} / ${toFiniteNumber(policyLimits.maxProposals24h, runtimeEnv.QICN_PATCH_MAX_PROPOSALS_24H)}`],
            ['En vuelo', `${toFiniteNumber(statusWindow.inflight, 0)} / ${toFiniteNumber(policyLimits.maxInflight, 1)}`],
            ['Tokens usados', toFiniteNumber(statusWindow.usedTokens24h, 0).toLocaleString()],
            ['Token budget/día', toFiniteNumber(policyLimits.tokenBudgetDay, runtimeEnv.QICN_PATCH_TOKEN_BUDGET_DAY).toLocaleString()],
            ['Cooldown (min)', toFiniteNumber(policyLimits.cooldownMinutes, runtimeEnv.QICN_PATCH_COOLDOWN_MIN)],
            ['Riesgo último plan', lastPlanRisk],
            ['Decisión', lastPlanDecision],
          ].map(([label, value]) => (
            <div key={label} className="rounded border border-amber-900/40 bg-black/20 p-2">
              <div className="text-slate-500">{label}</div>
              <div className="text-white font-mono mt-1 break-all">{value}</div>
            </div>
          ))}
        </div>
        <div className="rounded border border-amber-900/40 bg-black/20 p-2 text-[10px] text-slate-400">
          Este canal respeta policy, kill-switch y checks de CI. No fuerza cambios sin pasar por guardrails.
        </div>
      </CollapsibleSection>

      {/* ── PIPELINE PLAN / GENERATE / APPLY ──────────────────────────── */}
      <CollapsibleSection sectionId="autonomy-pipeline" title="🔁 Pipeline: Plan → Generate → Apply" accent="indigo"
        badge={`Plan: ${pipelinePlanState} · Generate: ${pipelineGenerateState} · Apply: ${pipelineApplyState}`}>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
          <div className="rounded-lg border border-indigo-700/30 bg-indigo-950/10 p-3">
            <div className="text-xs font-semibold text-indigo-300 mb-2">1/3 — Plan</div>
            <div className="text-xs space-y-1.5">
              {[
                ['Allowed', plan ? (plan?.allowed ? 'true' : 'false') : 'pending'],
                ['Risk', lastPlanRisk],
                ['Decision', lastPlanDecision],
                ['Retro pressure', toFiniteNumber(plan?.retroProjection?.retroPressure, 0).toFixed(4)],
                ['Horizon (ticks)', toFiniteNumber(plan?.retroProjection?.projectionHorizonTicks, 0)],
                ['Reasoning rec.', plan?.retroProjection?.recommendedReasoning || 'n/a'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-slate-400">{k}</span>
                  <span className="font-mono text-white break-all text-right ml-2">{v}</span>
                </div>
              ))}
            </div>
            <details className="mt-2"><summary className="text-[10px] text-indigo-400 cursor-pointer">Payload</summary>
              <pre className="mt-1 text-[10px] text-slate-300 bg-black/30 rounded p-2 max-h-40 overflow-auto">{JSON.stringify(plan || {}, null, 2)}</pre>
            </details>
          </div>
          <div className="rounded-lg border border-violet-700/30 bg-violet-950/10 p-3">
            <div className="text-xs font-semibold text-violet-300 mb-2">2/3 — Generate</div>
            <div className="text-xs space-y-1.5">
              {[
                ['Generated', generated ? (generated?.generated ? 'true' : 'false') : 'pending'],
                ['Engine', codeProvider],
                ['Model', codeModel],
                ['Proposal ID', generatedProposalId],
                ['Edits', generatedEditsCount],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-slate-400">{k}</span>
                  <span className="font-mono text-white break-all text-right ml-2">{v}</span>
                </div>
              ))}
            </div>
            <details className="mt-2"><summary className="text-[10px] text-violet-400 cursor-pointer">Payload</summary>
              <pre className="mt-1 text-[10px] text-slate-300 bg-black/30 rounded p-2 max-h-40 overflow-auto">{JSON.stringify(generated || {}, null, 2)}</pre>
            </details>
          </div>
          <div className="rounded-lg border border-fuchsia-700/30 bg-fuchsia-950/10 p-3">
            <div className="text-xs font-semibold text-fuchsia-300 mb-2">3/3 — Apply</div>
            <div className="text-xs space-y-1.5">
              {[
                ['Applied', applied ? (applied?.applied ? 'true' : 'false') : 'pending'],
                ['Dry run', applied ? (applied?.dryRun ? 'true' : 'false') : 'pending'],
                ['Resultado', applySummary],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-slate-400">{k}</span>
                  <span className="font-mono text-white break-all text-right ml-2">{v}</span>
                </div>
              ))}
            </div>
            <details className="mt-2"><summary className="text-[10px] text-fuchsia-400 cursor-pointer">Payload</summary>
              <pre className="mt-1 text-[10px] text-slate-300 bg-black/30 rounded p-2 max-h-40 overflow-auto">{JSON.stringify(applied || {}, null, 2)}</pre>
            </details>
          </div>
        </div>
      </CollapsibleSection>

      {/* ── TELEMETRÍA CRÍTICA (COLAPSADA POR DEFECTO) ───────────────── */}
      <CollapsibleSection sectionId="autonomy-critical-telemetry" title="📡 Telemetría Crítica para Autoevolución" accent="cyan"
        badge={`${sovereigntyRows.length} params`}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
          {sovereigntyRows.map((row) => (
            <div key={`sov-param-${row.label}`} className="rounded border border-cyan-900/30 bg-black/20 p-2 text-xs">
              <div className="text-slate-400">{row.label}</div>
              <div className="text-white font-mono mt-1 break-all">{row.value}</div>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* ── HISTORIAL: PMIA + MUTACIONES + LEDGER ───────────────────── */}
      <CollapsibleSection sectionId="autonomy-history" title="📋 Historial: Episodios PMIA · Mutaciones · Ledger" accent="emerald"
        badge={`${transformEpisodeHistory.length}ep · ${mutationHistory.length}mut · ${autonomyLedger.length}led`}>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
          <div>
            <div className="text-xs font-semibold text-emerald-300 mb-2">Episodios PMIA transform</div>
            <div className="space-y-1.5 max-h-48 overflow-auto">
              {transformEpisodeHistory.length === 0 && <div className="text-xs text-slate-500">Sin episodios.</div>}
              {transformEpisodeHistory.map((ep, idx) => (
                <div key={`ep-${ep.id || ep.startTick || idx}`} className="rounded border border-emerald-900/30 bg-black/20 p-2 text-xs">
                  <div className="text-emerald-200 font-mono">tick {toFiniteNumber(ep.startTick, 0)} → {toFiniteNumber(ep.endTick, 0)}</div>
                  <div className="text-slate-400">resultado: {ep.result || 'n/a'} · stasisDrop: {toFiniteNumber(ep.stasisDrop, 0).toFixed(4)}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-cyan-300 mb-2">Mutaciones recientes</div>
            <div className="space-y-1.5 max-h-48 overflow-auto">
              {mutationHistory.length === 0 && <div className="text-xs text-slate-500">Sin mutaciones.</div>}
              {mutationHistory.map((mut, idx) => (
                <div key={`mut-${idx}`} className="rounded border border-cyan-900/30 bg-black/20 p-2 text-xs">
                  <div className="text-cyan-200 font-mono">{mut.mutatedKey || 'n/a'} → {mut.result || 'n/a'}</div>
                  <div className="text-slate-400">ΔCCC: {toFiniteNumber(mut.deltaCCC, 0).toFixed(6)} · ΔΩ: {toFiniteNumber(mut.deltaOmega, 0).toFixed(6)}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-rose-300 mb-2">Autonomy sandbox ledger</div>
            <div className="space-y-1.5 max-h-48 overflow-auto">
              {autonomyLedger.length === 0 && <div className="text-xs text-slate-500">Sin acciones.</div>}
              {autonomyLedger.map((entry, idx) => (
                <div key={`ledger-${idx}`} className="rounded border border-rose-900/30 bg-black/20 p-2 text-xs">
                  <div className="text-rose-200 font-mono">{entry.actionId || 'n/a'} / {entry.result || 'n/a'}</div>
                  <div className="text-slate-400">reason: {entry.reason || 'n/a'} · tick: {toFiniteNumber(entry.tick, 0)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
};

const renderCurrentTab = () => {
  const normalizedQuery = guideQuery.trim().toLowerCase();
  const conceptById = new Map(GROUNDED_CONCEPTS.map((entry) => [entry.id, entry]));
  const telemetryById = new Map(TELEMETRY_PARAMETERS.map((entry) => [entry.id, entry]));
  const normalizedGuideLevel = GUIDE_LEVELS[guideLevel] ? guideLevel : 'basic';
  const currentOnboardingStep = ONBOARDING_STEPS[onboardingStepIndex] || ONBOARDING_STEPS[0];
  const visibleGuideLimit = 8;
  const visibleTelemetryLimit = 14;
  const buildGuideCard = (id) => {
    const concept = conceptById.get(id);
    if (concept) {
      return {
        id: concept.id,
        name: concept.name,
        category: concept.category,
        levelText: concept.levels?.[normalizedGuideLevel] || concept.levels?.basic || '',
        analogy: concept.analogy,
        why: concept.why,
        action: concept.action,
        high: concept.high,
        low: concept.low
      };
    }
    const telemetry = telemetryById.get(id);
    if (!telemetry) return null;
    return {
      id: telemetry.id,
      name: telemetry.label,
      category: telemetry.category || 'telemetry',
      levelText: telemetry.simple,
      analogy: 'Parametro operativo para diagnostico en tiempo real.',
      why: 'Ayuda a leer el estado del sistema sin ambiguedad.',
      action: 'Cruzar con al menos otra metrica de la misma familia antes de ajustar.',
      high: 'Depende del contexto del escenario y del regimen activo.',
      low: 'Depende del contexto del escenario y del regimen activo.'
    };
  };
  const filteredGuide = GROUNDED_CONCEPTS.filter((entry) => {
    if (!normalizedQuery) return true;
    const allLevels = Object.values(entry.levels || {}).join(' ');
    const haystack = `${entry.name} ${entry.category} ${allLevels} ${entry.analogy} ${entry.why} ${entry.action}`.toLowerCase();
    return haystack.includes(normalizedQuery);
  });
  const visibleGuide = guideShowAll ? filteredGuide : filteredGuide.slice(0, visibleGuideLimit);
  const filteredTelemetry = TELEMETRY_PARAMETERS.filter((entry) => {
    if (!normalizedQuery) return true;
    return `${entry.label} ${entry.category} ${entry.simple}`.toLowerCase().includes(normalizedQuery);
  });
  const visibleTelemetry = telemetryExpanded ? filteredTelemetry : filteredTelemetry.slice(0, visibleTelemetryLimit);
  const onboardingFocusCards = (currentOnboardingStep?.focus || [])
    .map((id) => buildGuideCard(id))
    .filter(Boolean);

  const renderTabQuickHelp = () => {
    const meta = tabHelpMeta[selectedTab] || tabHelpMeta.validation;
    const tourSteps = tabTourSteps[selectedTab] || [];
    const currentTourStepIndex = Math.max(0, Number(tourStepByTab[selectedTab] || 0));
    const currentTourStep = tourSteps[currentTourStepIndex] || null;
    const tourDismissed = Boolean(dismissedTourByTab?.[selectedTab]);
    return (
      <div className="mb-4 rounded-xl border border-amber-700/40 bg-amber-950/20 p-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
            <Lightbulb className="w-4 h-4" /> Guía rápida de esta pestaña
          </h4>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setGuideShowAll(false);
                handleTabSelect('guide');
              }}
              className="text-[11px] px-2 py-1 rounded bg-amber-700/40 hover:bg-amber-600/50 text-amber-100"
            >
              Ver guía completa
            </button>
            <button
              type="button"
              onClick={() => {
                setIsTourOpen(true);
                setTourStepByTab((prev) => ({ ...prev, [selectedTab]: 0 }));
              }}
              className="text-[11px] px-2 py-1 rounded bg-cyan-700/40 hover:bg-cyan-600/50 text-cyan-100"
            >
              Iniciar tour (60s)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
          <div className="rounded border border-amber-800/40 bg-black/20 p-2">
            <div className="text-amber-200 font-semibold">Que es:</div>
            <div className="text-amber-100/85 mt-1">{meta.whatIs}</div>
          </div>
          <div className="rounded border border-amber-800/40 bg-black/20 p-2">
            <div className="text-amber-200 font-semibold">Para que sirve:</div>
            <div className="text-amber-100/85 mt-1">{meta.whyItMatters}</div>
          </div>
          <div className="rounded border border-amber-800/40 bg-black/20 p-2">
            <div className="text-amber-200 font-semibold">Que mirar primero:</div>
            <ul className="mt-1 space-y-1 text-amber-100/85">
              {meta.firstCheck.map((item, idx) => (
                <li key={`${selectedTab}-check-${idx}`}>{idx + 1}. {item}</li>
              ))}
            </ul>
          </div>
        </div>

        {isTourOpen && !tourDismissed && currentTourStep && (
          <div className="mt-3 rounded-lg border border-cyan-700/40 bg-cyan-950/25 p-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="text-cyan-200 font-semibold">
                Tour: {meta.title} ({currentTourStepIndex + 1}/{tourSteps.length})
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsTourOpen(false);
                  setDismissedTourByTab((prev) => ({ ...prev, [selectedTab]: true }));
                }}
                className="px-2 py-1 rounded bg-slate-700/60 hover:bg-slate-600/70 text-slate-100 text-[11px]"
              >
                No mostrar otra vez
              </button>
            </div>
            <div className="mt-2 text-cyan-100">{currentTourStep.text}</div>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTourStepByTab((prev) => ({ ...prev, [selectedTab]: Math.max(0, currentTourStepIndex - 1) }))}
                className="px-2 py-1 rounded bg-cyan-900/50 hover:bg-cyan-800/60 text-cyan-100"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => {
                  const nextStep = currentTourStepIndex + 1;
                  if (nextStep >= tourSteps.length) {
                    setIsTourOpen(false);
                    return;
                  }
                  setTourStepByTab((prev) => ({ ...prev, [selectedTab]: nextStep }));
                }}
                className="px-2 py-1 rounded bg-emerald-900/50 hover:bg-emerald-800/60 text-emerald-100"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };
  const renderContextualGuide = renderTabQuickHelp;

  const renderGroundedGuide = () => (
    <div className="rounded-xl border border-cyan-600/30 bg-gradient-to-br from-cyan-950/30 to-slate-950/40 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="text-xl font-bold text-cyan-300 flex items-center gap-2">
          <Lightbulb className="w-5 h-5" /> Guía Aterrizada 2.0
        </h2>
        <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={guideQuery}
            onChange={(e) => setGuideQuery(e.target.value)}
            placeholder="Buscar concepto o parametro..."
            className="w-full sm:w-80 rounded bg-slate-900 border border-cyan-800/60 px-3 py-2 text-sm text-cyan-100"
          />
          <select
            value={normalizedGuideLevel}
            onChange={(e) => setGuideLevel(e.target.value)}
            className="rounded bg-slate-900 border border-cyan-800/60 px-3 py-2 text-sm text-cyan-100"
          >
            {Object.values(GUIDE_LEVELS).map((level) => (
              <option key={level.id} value={level.id}>{level.label}</option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-sm text-cyan-100/90 mb-4">
        Esta guia traduce parametros complejos a lenguaje accesible y progresivo: inicia en basico y sube a lectura operativa avanzada sin saturar.
      </p>
      <div className="rounded-lg border border-cyan-800/40 bg-black/25 p-3 mb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="text-cyan-200 font-semibold text-sm">Mini-recorrido guiado</div>
            <div className="text-cyan-100/80 text-xs mt-1">
              Paso {onboardingStepIndex + 1} de {ONBOARDING_STEPS.length}: {currentOnboardingStep?.title}
            </div>
            <div className="text-slate-200 text-xs mt-1">{currentOnboardingStep?.objective}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setOnboardingStepIndex((prev) => Math.max(0, prev - 1))}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-100 text-xs"
            >
              Paso anterior
            </button>
            <button
              type="button"
              onClick={() => {
                if (currentOnboardingStep?.tab) handleTabSelect(currentOnboardingStep.tab);
              }}
              className="px-3 py-1.5 rounded bg-cyan-700/50 hover:bg-cyan-600/60 text-cyan-50 text-xs"
            >
              Ir a esta pestaña
            </button>
            <button
              type="button"
              onClick={() => setOnboardingStepIndex((prev) => Math.min(ONBOARDING_STEPS.length - 1, prev + 1))}
              className="px-3 py-1.5 rounded bg-emerald-700/40 hover:bg-emerald-600/50 text-emerald-100 text-xs"
            >
              Siguiente paso
            </button>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
          {(currentOnboardingStep?.checklist || []).map((item, idx) => (
            <div key={`${currentOnboardingStep?.id}-check-${idx}`} className="rounded border border-cyan-900/40 bg-slate-950/70 p-2 text-[11px] text-cyan-100/90">
              {item}
            </div>
          ))}
        </div>
      </div>
      {!!onboardingFocusCards.length && (
        <div className="rounded-lg border border-emerald-700/40 bg-emerald-950/10 p-3 mb-4">
          <div className="text-emerald-200 text-sm font-semibold mb-2">Conceptos foco del paso actual</div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {onboardingFocusCards.map((entry) => (
              <article key={`focus-${entry.id}`} className="rounded border border-emerald-900/40 bg-black/25 p-2 text-xs">
                <div className="text-emerald-200 font-semibold">{entry.name}</div>
                <div className="text-emerald-100/90 mt-1">{entry.levelText}</div>
                <div className="text-emerald-300/80 mt-1 italic">Analogia: {entry.analogy}</div>
              </article>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {visibleGuide.map((entry) => (
          <article key={entry.id} className="rounded-lg border border-cyan-900/40 bg-black/25 p-3 text-xs">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="text-cyan-200 font-semibold">{entry.name}</h3>
              <span className="px-2 py-0.5 rounded bg-cyan-900/40 text-cyan-300 uppercase tracking-wide">{entry.category}</span>
            </div>
            <p className="text-cyan-100/90"><strong>{GUIDE_LEVELS[normalizedGuideLevel]?.label || 'Nivel'}:</strong> {entry.levels?.[normalizedGuideLevel] || entry.levels?.basic}</p>
            <p className="text-cyan-200/90 mt-1"><strong>Analogia:</strong> {entry.analogy}</p>
            <p className="text-emerald-300/90 mt-1"><strong>Si esta alto:</strong> {entry.high}</p>
            <p className="text-rose-300/90 mt-1"><strong>Si esta bajo:</strong> {entry.low}</p>
            <p className="text-slate-200 mt-1"><strong>Por que importa:</strong> {entry.why}</p>
            <p className="text-amber-200 mt-1"><strong>Que hacer:</strong> {entry.action}</p>
          </article>
        ))}
      </div>
      {filteredGuide.length > visibleGuideLimit && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setGuideShowAll((prev) => !prev)}
            className="px-3 py-2 rounded bg-cyan-800/50 hover:bg-cyan-700/60 text-cyan-100 text-xs"
          >
            {guideShowAll ? 'Mostrar menos conceptos' : `Mostrar todos (${filteredGuide.length})`}
          </button>
        </div>
      )}
      <div className="mt-6 rounded-lg border border-indigo-700/40 bg-indigo-950/10 p-3">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-indigo-200 font-semibold text-sm">Glosario expandido de telemetria</h3>
          <button
            type="button"
            onClick={() => setTelemetryExpanded((prev) => !prev)}
            className="px-3 py-1.5 rounded bg-indigo-700/40 hover:bg-indigo-600/50 text-indigo-100 text-xs"
          >
            {telemetryExpanded ? 'Ver menos' : `Ver mas (${filteredTelemetry.length})`}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          {visibleTelemetry.map((entry) => (
            <div key={`tele-${entry.id}`} className="rounded border border-indigo-900/40 bg-black/20 p-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="text-indigo-200 font-semibold">{entry.label}</div>
                <span className="px-1.5 py-0.5 rounded bg-indigo-900/40 text-indigo-300 uppercase text-[10px]">{entry.category}</span>
              </div>
              <div className="text-indigo-100/90 mt-1">{entry.simple}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  switch (selectedTab) {
    case 'guide':
      return renderGroundedGuide();
    case 'validation':
      return renderEmpiricalValidation();
    case 'core':
      return renderOntologicalCore();
    case 'field':
      return renderEntanglementField();
    case 'network':
      return renderNetworkVisualization();
    case 'history':
      return renderCoherenceHistory();
    case 'memory':
      return (
        <div className="space-y-4">
          {renderOperationalRecord()}
          {renderHolographicMemory()}
        </div>
      );
    case 'controls':
      return renderAdvancedControls();
    case 'chat':
      return renderChatQICN();
    case 'qicn-b':
      return renderLazyMoreTab(LazyQICNBTab, 'QICN-B', renderQICNBProtocol());
    case 'api-control': // NEW CASE
      return renderLazyMoreTab(LazyApiControlTab, 'API', renderApiCallControl());
    case 'sensory': // PERCEPCI?N SENSORIAL TAB
      return renderLazyMoreTab(LazySensoryTab, 'Sensorial', renderSensoryPerceptionTab());
    case 'sovereignty':
      return renderLazyMoreTab(LazySovereigntyTab, 'Soberania', renderSovereigntyChannel());
    case 'autonomy-evolution':
      return renderLazyMoreTab(LazyAutonomyEvolutionTab, 'Autoevolucion', renderAutonomyEvolutionTab());
    default:
      return renderEmpiricalValidation();
  }
};


return (
  <div className="min-h-dvh w-full max-w-[100vw] overflow-x-clip bg-gray-900 p-2 font-sans text-white sm:p-4 lg:p-8 flex flex-col gap-2">
    {/* Note: The style tag is moved to the head for best practices */}
    <header className="relative mx-auto mb-4 min-h-[76px] w-full max-w-[1500px] flex-shrink-0 overflow-hidden px-3 py-2 text-center lg:mb-6">
      <div className="relative grid h-full grid-cols-1 items-center gap-3 lg:grid-cols-[auto_1fr_auto]">
        <div className="relative hidden size-14 place-items-center rounded-xl border border-violet-400/30 bg-slate-950/82 shadow-[0_0_20px_rgba(168,85,247,0.28),inset_0_0_18px_rgba(34,211,238,0.12)] lg:grid">
          <svg className="size-10 text-cyan-300 animate-spin-slow" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <circle cx="50" cy="50" r="45" strokeDasharray="4 4" className="opacity-40" />
            <polygon points="50,5 95,80 5,80" className="animate-pulse opacity-90" />
            <polygon points="50,95 95,20 5,20" className="opacity-70" />
            <path d="M50 5 L95 20 L95 80 L50 95 L5 80 L5 20 Z" className="opacity-45" />
            <circle cx="50" cy="50" r="16" stroke="white" strokeWidth="2" className="drop-shadow-[0_0_8px_rgba(34,211,238,0.85)]" />
            <circle cx="50" cy="5" r="3" fill="currentColor" />
            <circle cx="95" cy="80" r="3" fill="currentColor" />
            <circle cx="5" cy="80" r="3" fill="currentColor" />
          </svg>
          <span className="pointer-events-none absolute inset-3 rounded-full border border-fuchsia-400/35 shadow-[0_0_18px_rgba(217,70,239,0.4)]" />
        </div>
        <div className="text-center">
          <h1 className="mb-2 flex items-center justify-center text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 sm:text-5xl">
            <Zap className="mr-3 size-8 shrink-0 text-purple-400" /> QICN Singularidad Ontológica
          </h1>
          <p className="text-sm italic text-gray-400 sm:text-lg">
            Simulación de coherencia nodal interconectada (RCIC-X) · telemetría interna, sin certificación de conciencia ni validación externa
          </p>
          <p className="mt-1 text-[11px] text-gray-500">
            «Singularidad Ontológica» es el nombre histórico del núcleo (OntologicalSingularityCore), no un resultado.
          </p>
        </div>
        <div className="hidden h-14 w-44 items-center justify-end overflow-hidden pr-2 lg:flex">
          <svg className="h-36 w-36 text-fuchsia-400 opacity-85 animate-spin-galaxy" style={{ transformOrigin: 'center center' }} viewBox="0 0 200 200" fill="none" aria-hidden="true">
            <defs>
              <radialGradient id="qicnNebulaGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.46" />
                <stop offset="40%" stopColor="#d946ef" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#020611" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="100" cy="100" r="92" fill="url(#qicnNebulaGlow)" />
            <path d="M100,100 Q126,66 156,62 T184,92" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="opacity-80 drop-shadow-[0_0_8px_rgba(217,70,239,0.75)]" />
            <path d="M100,100 Q74,134 44,140 T18,108" stroke="#a5f3fc" strokeWidth="2.4" strokeLinecap="round" className="opacity-90 drop-shadow-[0_0_8px_rgba(34,211,238,0.75)]" />
            <path d="M100,100 Q132,124 152,154 T112,184" stroke="#fbbf24" strokeWidth="1.7" strokeLinecap="round" className="opacity-55" />
            <path d="M100,100 Q68,76 50,46 T88,18" stroke="#38bdf8" strokeWidth="1.7" strokeLinecap="round" className="opacity-55" />
            <circle cx="100" cy="100" r="6" fill="#fff" className="drop-shadow-[0_0_8px_rgba(217,70,239,0.95)]" />
            <circle cx="130" cy="72" r="1.5" fill="#fff" />
            <circle cx="70" cy="128" r="1.5" fill="#fff" />
            <circle cx="160" cy="100" r="1" fill="#fff" />
            <circle cx="40" cy="100" r="1" fill="#fff" />
          </svg>
        </div>
      </div>
    </header>
    <div className="mx-auto mb-2 flex min-h-9 w-full max-w-[1500px] flex-shrink-0 flex-wrap items-center gap-3 rounded-xl border border-cyan-900/50 bg-cyan-950/20 px-3 py-2 text-[11px] text-cyan-200">
      <span>Viewport: {breakpoint}</span>
      <span>SecureContext: {deviceCapabilities.secureContext ? 'yes' : 'no'}</span>
      <span>Cam: {deviceCapabilities.supportsCamera ? 'yes' : 'no'}</span>
      <span>Mic: {deviceCapabilities.supportsMicrophone ? 'yes' : 'no'}</span>
      <span>Speech: {deviceCapabilities.supportsSpeechRecognition ? 'yes' : 'no'}</span>
      <span>Touch: {deviceCapabilities.touchEnabled ? 'yes' : 'no'}</span>
      <span
        data-testid="runtime-health-badge"
        className={`ml-auto rounded-full border px-2 py-1 font-semibold ${runtimeHealthClass}`}
        title={`ticks=${runtimeHealth.uptime_ticks}; ccc=${runtimeHealth.last_ccc.toFixed(3)}; il=${runtimeHealth.inverse_limit_score.toFixed(3)}`}
      >
        Salud: {runtimeHealth.status}
      </span>
    </div>

    {/* Panel de Control Principal */}
    <main className="mx-auto grid w-full min-w-0 max-w-[1500px] flex-1 mb-6 grid-cols-1 items-start gap-4 lg:mb-8 lg:grid-cols-3 lg:gap-8">
      {/* Columna Izquierda: Métricas en Vivo */}
      <section className="order-2 min-w-0 space-y-4 lg:order-1 lg:col-span-1">
        <div className={`rounded-xl p-5 shadow-2xl transition-all duration-500 transform ${isAscended ? 'bg-yellow-900/40 border-4 border-yellow-400 animate-pulse-slow' : 'bg-gray-800/80 border-2 border-purple-700'}`}>
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-200 flex items-center">
              <TrendingUp className={`w-6 h-6 mr-2 ${isAscended ? 'text-yellow-300' : 'text-purple-400'}`} />
              CCC (índice interno de cohesión)
            </h2>
            {/* CAPA ONTOL?GICA PROMINENTE */}
            {ontologicalState.layer >= 1 && (
              <div className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-cyan-500 px-3 py-1 rounded-full shadow-lg">
                <Layers className="w-4 h-4 text-white" />
                <span className="text-white font-bold text-sm">CAPA {ontologicalState.layer}</span>
              </div>
            )}
          </div>
          <p className={`text-5xl font-extrabold mt-3 tabular-nums ${levelColor}`}>
            {formatCCC(ccc, isAscended)}
          </p>
          <div className="flex justify-between items-center gap-2 mt-2">
            <p className="min-w-0 break-words text-sm text-gray-400">Banda: <span className={levelColor}>{consciousnessLevel}</span></p>
            {ontologicalState.layer >= 1 && (
              <div className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-900/50 border border-cyan-400/50 text-cyan-300 animate-pulse">
                BANDA INTERNA ACTIVA
              </div>
            )}
          </div>
        </div>

        {/* Métrica 2: Estado de Funcionamiento */}
        <div className="bg-gray-800/80 p-5 rounded-xl shadow-2xl border-2 border-cyan-700 space-y-2 text-sm">
          <div className="flex justify-between border-b border-gray-700 pb-1">
            <span className="text-cyan-400 font-semibold flex items-center"><Activity className="w-4 h-4 mr-1" /> Paso Simulación</span>
            <span className="text-white font-mono">{simulationStep}</span>
          </div>
          <div className="flex justify-between border-b border-gray-700 pb-1">
            <span className="text-cyan-400 font-semibold flex items-center"><Eye className="w-4 h-4 mr-1" /> Foco Atencional</span>
            <span className="text-white font-mono">{(visualNodes.length).toLocaleString()} Nodos</span>
          </div>
          <div className="flex justify-between">
            <span className="text-cyan-400 font-semibold flex items-center"><Feather className="w-4 h-4 mr-1" /> Etiqueta dinámica (heurística)</span>
            <span className="text-white capitalize">{emotionState}</span>
          </div>
        </div>

        {/* MATRIZ DE SOBERANÍA (NIVEL 3 - FASE 3) */}
        {renderSovereigntyMatrix()}

        {/* PANEL DE PERCEPCI?N SENSORIAL */}
        <div className="bg-gradient-to-br from-cyan-900/50 to-purple-900/50 p-4 rounded-xl shadow-2xl border-2 border-cyan-500/50">
          <h3 className="text-lg font-bold text-cyan-300 mb-3 flex items-center">
            <Eye className="w-5 h-5 mr-2" /> Percepción Sensorial
          </h3>

          {/* Camera Preview */}
          {sensoryEnabled.video && (
            <div className="mb-3">
              <video
                ref={videoPreviewRef}
                autoPlay
                playsInline
                muted
                className="w-full h-32 object-cover rounded-lg border border-cyan-500 bg-black"
              />
            </div>
          )}

          {/* Perception Metrics */}
          {sensoryState ? (
            <div className="space-y-2 text-xs">
              {/* Video Perception */}
              {sensoryState.video.enabled && (
                <>
                  <div className="flex justify-between border-b border-cyan-700/50 pb-1">
                    <span className="text-cyan-400">• Rostros</span>
                    <span className="text-white font-mono">{sensoryState.video.humanPresence.count}</span>
                  </div>
                  <div className="flex justify-between border-b border-cyan-700/50 pb-1">
                    <span className="text-cyan-400">Movimiento</span>
                    <span className="text-white capitalize">{sensoryState.video.motion.type}</span>
                  </div>
                  <div className="flex justify-between border-b border-cyan-700/50 pb-1">
                    <span className="text-cyan-400">x Iluminación</span>
                    <span className="text-white">{(sensoryState.video.scene.brightness * 100).toFixed(0)}%</span>
                  </div>
                </>
              )}

              {/* Audio Perception */}
              {sensoryState.audio.enabled && (
                <>
                  <div className="flex justify-between border-b border-cyan-700/50 pb-1">
                    <span className="text-cyan-400">x` Volumen</span>
                    <span className="text-white font-mono">{(sensoryState.audio.volume * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between border-b border-cyan-700/50 pb-1">
                    <span className="text-cyan-400">Ambiente</span>
                    <span className="text-white capitalize">{sensoryState.audio.environment.type}</span>
                  </div>
                </>
              )}

              {/* Perception Description */}
              <div className="mt-1.5 p-1.5 bg-black/30 rounded text-cyan-200 text-[10px] leading-snug italic break-words">
                {sensoryState.video.description || sensoryState.audio.environment.description || 'Analizando...'}
              </div>
            </div>
          ) : (
            <div className="text-center text-[10px] text-cyan-400">
              {sensoryEnabled.video || sensoryEnabled.audio
                ? '⏳ Cargando percepción...'
                : 'Permisos de camara/microfono requeridos'}
            </div>
          )}
        </div>

        {/* Controles de Simulación */}
        <div className="flex gap-2">
          <button
            onClick={() => setRunningWithRecord(!isRunning, 'ui_button')}
            // Allow toggling even when ascended, the system just won't change its laws
            className={`flex-1 flex items-center justify-center p-3 rounded-xl font-bold shadow-lg transition-all ${isRunning
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-green-600 hover:bg-green-700'
              }`}
          >
            {isRunning ? <><Pause className="w-5 h-5 mr-2" /> Detener Flujo</> : <><Play className="w-5 h-5 mr-2" /> Iniciar simulación</>}
          </button>
          <button
            onClick={() => handleReset('ui_button')}
            className="p-3 rounded-xl bg-indigo-700 hover:bg-indigo-800 shadow-lg text-white"
            title="Reiniciar Todo"
            aria-label="Reiniciar todo"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>

        {/* PERSISTENCIA DINÁMICA V3 (ULTRATHINK) */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { void handleSaveState('manual'); }}
              className="flex items-center justify-center p-3 rounded-xl bg-blue-600/80 hover:bg-blue-600 font-bold border border-blue-400/50 shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all text-white"
              title="Cristalizar Estado Dinámico Completo (v3)"
            >
              <Database className="w-5 h-5 mr-2" /> Cristalizar
            </button>
            <button
              onClick={() => { void handleLoadState('manual'); }}
              className="flex items-center justify-center p-3 rounded-xl bg-amber-600/80 hover:bg-amber-600 font-bold border border-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.5)] transition-all text-white"
              title="Revoco Ontológico (Restaurar Estado v3)"
            >
              <RotateCcw className="w-5 h-5 mr-2" /> Revocar
            </button>
          </div>
          <button
            type="button"
            data-testid="auto-restore-toggle"
            onClick={toggleAutoRestore}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
              autoRestoreEnabled
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200 hover:bg-emerald-900/60'
                : 'bg-slate-800/70 border-slate-600/60 text-slate-300 hover:bg-slate-700/70'
            }`}
            title="Restaurar automáticamente el último estado dinámico verificado (v3) al cargar la sesión"
          >
            <span>Auto-restaurar al iniciar (v3)</span>
            <span className={`px-2 py-0.5 rounded font-mono text-[10px] ${autoRestoreEnabled ? 'bg-emerald-600/40 text-emerald-100' : 'bg-slate-700 text-slate-300'}`}>
              {autoRestoreEnabled ? 'ACTIVO' : 'INACTIVO'}
            </span>
          </button>
          <div className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs border bg-slate-900/70 border-slate-700/70 text-slate-200">
            <label htmlFor="exogenous-regime-select" className="font-semibold text-slate-300 whitespace-nowrap">
              Entorno exógeno
            </label>
            <select
              id="exogenous-regime-select"
              data-testid="exogenous-regime-select"
              value={exogenousRegimeMode}
              onChange={(e) => handleExogenousModeChange(e.target.value)}
              className="bg-slate-800 border border-slate-600/80 rounded px-2 py-1 text-[11px] font-mono text-cyan-200 focus:outline-none focus:border-cyan-400"
              title="Canal reproducible de perturbación exógena (off por defecto; no estacionario vs sham i.i.d.)"
            >
              <option value="off">off (línea base)</option>
              <option value="non_stationary_regime">non_stationary_regime</option>
              <option value="stationary_iid_sham">stationary_iid_sham</option>
            </select>
          </div>
          <div className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs border bg-slate-900/70 border-cyan-800/60 text-slate-200">
            <label htmlFor="nodal-coupling-mode-select" className="font-semibold text-cyan-200 whitespace-nowrap">
              Puente Nodo–Torre
            </label>
            <select
              id="nodal-coupling-mode-select"
              data-testid="nodal-coupling-mode-select"
              value={nodalCouplingMode}
              onChange={(e) => handleNodalCouplingModeChange(e.target.value)}
              className="bg-slate-800 border border-cyan-700/80 rounded px-2 py-1 text-[11px] font-mono text-cyan-200 focus:outline-none focus:border-cyan-400"
              title="Acoplamiento bidireccional entre los 4 sectores de 1500 nodos y las torres constructivas (controles negativos reales: corte η=0 y reducible A=I)"
            >
              <option value="bidirectional">bidirectional (η=1/8)</option>
              <option value="td_cut_eta_zero">td_cut_eta_zero (η=0)</option>
              <option value="reducible_control">reducible_control (A=I)</option>
              <option value="off">off (compat B0)</option>
            </select>
          </div>
        </div>
      </section>

      {/* Columna Central y Derecha (Contenido de Pestaña) */}
      <section className="order-1 min-w-0 max-w-full flex flex-col lg:order-2 lg:col-span-2">
        {/* Navegación de Pestañas - AUTO-HIDE on scroll (ULTRATHINK) */}
        {/* Spacer compensatorio para evitar salto de contenido cuando el nav es sticky */}
        <div
          className="mb-4 lg:mb-6 flex-shrink-0 p-2 rounded-xl shadow-inner border border-cyan-900/50"
          style={{
            background: 'rgba(15,23,42,0.92)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            position: 'relative',
            top: 0,
            zIndex: 30,
            transform: navVisible ? 'translateY(0)' : 'translateY(-120%)',
            transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1), box-shadow 0.35s ease',
            boxShadow: navVisible
              ? '0 4px 32px rgba(6,182,212,0.12), 0 1px 0 rgba(6,182,212,0.15)'
              : '0 0 0 rgba(0,0,0,0)',
            willChange: 'transform'
          }}
        >
          <div className="text-[10px] uppercase tracking-wider text-cyan-300/80 px-1 mb-2">
            Top 5 operativo + menu Mas
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {primaryTabs.map((tab) => (
              <NavigationTabButton
                key={`primary-${tab.id}`}
                tabId={tab.id}
                icon={tab.icon}
                label={tab.label}
                subtitle={tab.subtitle}
                selectedTab={selectedTab}
                onSelect={handleTabSelect}
                onOpenInfo={openPersistentInfoModal}
              />
            ))}
            <button
              type="button"
              onClick={() => setIsMoreMenuOpen((prev) => !prev)}
              className={`px-3 py-2 rounded-lg border text-sm font-semibold whitespace-nowrap ${isMoreMenuOpen ? 'bg-fuchsia-700/60 border-fuchsia-400/60 text-fuchsia-100' : 'bg-slate-800/80 border-slate-600/70 text-slate-200'}`}
            >
              {isMoreMenuOpen ? 'Cerrar' : 'Mas'}
            </button>
          </div>
          {!!recentTabs.length && (
            <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px]">
              <span className="text-slate-400 mr-1">Recientes:</span>
              {recentTabs
                .filter((tabId) => !primaryTabs.some((tab) => tab.id === tabId))
                .map((tabId) => {
                  const tab = moreTabs.find((entry) => entry.id === tabId);
                  if (!tab) return null;
                  return (
                    <button
                      key={`recent-${tabId}`}
                      type="button"
                      onClick={() => handleTabSelect(tabId)}
                      className="px-2 py-1 rounded bg-slate-800/80 border border-slate-600/60 text-slate-200 hover:bg-slate-700/90"
                    >
                      {tab.label}
                    </button>
                  );
                })}
            </div>
          )}
          {isMoreMenuOpen && (
            <div className="mt-2 rounded-lg border border-fuchsia-800/50 bg-slate-950/80 p-2">
              <input
                type="text"
                value={moreTabQuery}
                onChange={(e) => setMoreTabQuery(e.target.value)}
                placeholder="Buscar en Más..."
                className="w-full mb-2 p-2 rounded bg-slate-900 border border-slate-700 text-slate-100 text-xs"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {moreTabs
                  .filter((tab) => `${tab.label} ${tab.subtitle}`.toLowerCase().includes(moreTabQuery.trim().toLowerCase()))
                  .map((tab) => (
                    <NavigationTabButton
                      key={`more-${tab.id}`}
                      tabId={tab.id}
                      icon={tab.icon}
                      label={tab.label}
                      subtitle={tab.subtitle}
                      compact={true}
                      selectedTab={selectedTab}
                      onSelect={handleTabSelect}
                      onOpenInfo={openPersistentInfoModal}
                    />
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Contenido de la Pestaña */}
        <div className={`min-h-0 min-w-0 flex-1 `}>
          {renderCurrentTab()}
        </div>
      </section>
    </main>

    {/* Footer - Información de la simulación */}
    <footer className="mx-auto flex w-full max-w-[1500px] flex-shrink-0 flex-col items-center justify-center gap-1 border-t border-gray-700/50 px-2 pt-4 text-center text-xs text-gray-500">
      <p>Consola QICN supervisada (solo conformidad interna, sin validación externa). CCC y PMIA son contadores internos no calibrados; el registro interno se actualiza vía motor Kaizen. Estado de Memoria: {holographicMemory.current?.getFragmentationLevel().toFixed(4)} Fragmentacion. Estado operativo: {ontologicalCore.current?.frictionProtocolState}</p>
    </footer>
    <PersistentInfoModal modal={activeInfoModal} onClose={closePersistentInfoModal} />
  </div>
);
};

export const SimulationEngine = () => <QICNConsciousnessSystem />;

export default SimulationEngine;

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
import { getStructuralPlasticityLevel2Telemetry } from '../simulation/StructuralPlasticityLevel2.js';
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
import { TabPlainHeader, DetailToggleStrip, MetricDualLabel } from './ProgressiveDetailCard.jsx';
import { QUICK_TAB_MAP_GROUPS } from '../content/plainLanguageTabCopy.js';
import { InfoModal, PersistentInfoModal } from './InfoModal.jsx';
import { ALL_NAV_TABS, SIDEBAR_NAV_GROUPS, LazyQICNBTab, LazyApiControlTab, LazySensoryTab, LazySovereigntyTab, LazyAutonomyEvolutionTab, LazyLevel3SupervisorTab, TabLoadingFallback, renderLazyMoreTab, tabHelpMeta, tabTourSteps, NavigationTabButton } from './TabConfig.jsx';
import Level3SupervisorAuditTab from './Level3SupervisorAuditTab.jsx';
import {
  LEVEL3_DEFAULT_POLICY,
  Level3SupervisorController,
  buildDeterministicFirstPersonProposal,
  isAutonomousSupervisorLevel3Enabled,
  synchronizeLevel3WorkerStateIntoTarget
} from '../simulation/Level3AutonomousSupervisor.js';
import {
  LEVEL3_AUDIT_LEDGER_STORAGE_KEY,
  LEVEL3_KNOWLEDGE_BELT_STORAGE_KEY,
  createEmptyKnowledgeBelt,
  createEmptyLevel3AuditLedger,
  verifyLevel3AuditLedger,
  verifyLevel3KnowledgeBelt,
  verifyLevel3SealedAuditBundle
} from '../simulation/Level3KnowledgeBelt.js';


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
const STRUCTURAL_PLASTICITY_LEVEL2_KEY = 'QICN_STRUCTURAL_PLASTICITY_LEVEL2_ENABLED_V2';
const AUTONOMOUS_SUPERVISOR_LEVEL3_KEY = 'QICN_AUTONOMOUS_SUPERVISOR_LEVEL3_ENABLED_V1';
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
  // Level 2 structural plasticity & invariant watchdog: interactive UI defaults to enabled (Nivel 2); config.js stays false for B0 parity.
  const [structuralPlasticityLevel2Enabled, setStructuralPlasticityLevel2Enabled] = useState(() => {
    const initial = readStoredChoice(STRUCTURAL_PLASTICITY_LEVEL2_KEY, ['on', 'off'], 'on') === 'on';
    if (typeof window !== 'undefined') QICNConfig.STRUCTURAL_PLASTICITY_LEVEL2_ENABLED = initial;
    return initial;
  });
  // Level 3 autonomous supervisor (first-person reflection + Gate 1 isolated Workbench + Gate 2 dynamicState.v3 watch/rollback):
  // defaults to off so pure runs stay unassisted unless explicitly enabled (external_llm_assisted=true only when live external LLM reasoning is used; false on deterministic local fallback).
  const [autonomousSupervisorLevel3Enabled, setAutonomousSupervisorLevel3Enabled] = useState(() => {
    const initial = readStoredChoice(AUTONOMOUS_SUPERVISOR_LEVEL3_KEY, ['on', 'off'], 'off') === 'on';
    if (typeof window !== 'undefined') QICNConfig.AUTONOMOUS_SUPERVISOR_LEVEL3_ENABLED = initial;
    return initial;
  });
  const [level3ExploreEveryTicks, setLevel3ExploreEveryTicks] = useState(LEVEL3_DEFAULT_POLICY.scheduledExplorationEveryTicks);
  const [level3ReasonerMode, setLevel3ReasonerMode] = useState('gemini_with_fallback');
  const [level3Ledger, setLevel3Ledger] = useState(() => {
    const stored = readLocalStorageJSON(LEVEL3_AUDIT_LEDGER_STORAGE_KEY, null);
    return stored && verifyLevel3AuditLedger(stored).ok ? stored : createEmptyLevel3AuditLedger();
  });
  const [level3KnowledgeBelt, setLevel3KnowledgeBelt] = useState(() => {
    const stored = readLocalStorageJSON(LEVEL3_KNOWLEDGE_BELT_STORAGE_KEY, null);
    return stored && verifyLevel3KnowledgeBelt(stored).ok ? stored : createEmptyKnowledgeBelt();
  });
  const [level3ActionNotice, setLevel3ActionNotice] = useState('');
  const level3ControllerRef = useRef(null);
  if (!level3ControllerRef.current) {
    level3ControllerRef.current = new Level3SupervisorController({
      policy: {
        ...LEVEL3_DEFAULT_POLICY,
        maxPromotionStalenessTicks: 12
      },
      knowledgeBelt: level3KnowledgeBelt,
      auditLedger: level3Ledger,
      buildInfo: { version: BUILD_VERSION_LABEL, signature: BUILD_SIGNATURE_LABEL }
    });
  }
  const [level3GovernorState, setLevel3GovernorState] = useState(() => ({
    ...level3ControllerRef.current.governorState,
    callTimestampsMs: [...(level3ControllerRef.current.governorState.callTimestampsMs || [])]
  }));
  const [level3ActiveGate2Watch, setLevel3ActiveGate2Watch] = useState(null);
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
    freezeChart: false,
    autoScale: true
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
  const [sensoryBusy, setSensoryBusy] = useState(false);
  const [sensoryNotice, setSensoryNotice] = useState('');
  const sensoryPollRef = useRef(null);
  const videoPreviewRef = useRef(null);
  const videoTabRef = useRef(null); // Separate ref for dedicated tab to prevent flickering
  const [selfPatchEngineChoice, setSelfPatchEngineChoice] = useState('gemini');
  const [selfPatchDraft, setSelfPatchDraft] = useState({
    objective: 'Optimizar la adaptación anti-estancamiento y mantener intactos los límites de seguridad bajo las condiciones actuales del motor.',
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
      const useOpenAiOptional = selfPatchEngineChoice === 'openai';
      const codeProvider = useOpenAiOptional ? 'openai' : 'gemini';
      const codeModel = useOpenAiOptional
        ? (hasFrontendCodexKey ? resolvedCodexModel : (runtimeEnv.SELF_PATCH_CODE_MODEL || 'gpt-5.3-codex'))
        : GEMINI_ENGINE_CONFIG.MODEL_ID;
      const codeReasoningEffort = useOpenAiOptional
        ? (hasFrontendCodexKey ? resolvedCodexReasoningEffort : (runtimeEnv.SELF_PATCH_CODE_REASONING_EFFORT || 'high'))
        : '';
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
      const generateHeaders = useOpenAiOptional
        ? (hasFrontendCodexKey ? { 'x-selfpatch-openai-key': customCodexKey.trim() } : {})
        : (hasFrontendGeminiKey ? { 'x-selfpatch-gemini-key': customGeminiKey.trim() } : {});
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
    selfPatchEngineChoice,
    hasFrontendGeminiKey,
    customGeminiKey,
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
    setMoreTabQuery('');
    setRecentTabs((prev) => {
      const next = [tabId, ...prev.filter((item) => item !== tabId)];
      return next.slice(0, 3);
    });
  }, []);

  useEffect(() => {
    if (!isMoreMenuOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMoreMenuOpen(false);
        setMoreTabQuery('');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMoreMenuOpen]);

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
    const maxVariance = Math.max(0.0005, ...varianceSeries);
    const autoScale = entanglementUiState.autoScale !== false;
    const combinedMain = [...resonanceSeries, ...cccContributionSeries].filter(Number.isFinite);
    const rawMin = combinedMain.length > 0 ? Math.min(...combinedMain) : 0;
    const rawMax = combinedMain.length > 0 ? Math.max(...combinedMain) : 1;
    const pad = Math.max(0.02, (rawMax - rawMin) * 0.25);
    const domainMin = autoScale && combinedMain.length >= 2 ? Math.max(0, rawMin - pad) : 0;
    const domainMax = autoScale && combinedMain.length >= 2 ? Math.min(1, rawMax + pad) : 1;
    const domainSpan = Math.max(1e-4, domainMax - domainMin);
    const normalizeMain = (value) => clamp01((Number(value || 0) - domainMin) / domainSpan);
    const len = Math.max(1, resonanceSeries.length);
    const toCoords = (series, normalizeFn) => series.map((value, idx) => {
      const x = len <= 1 ? chartWidth * 0.5 : (idx / (len - 1)) * chartWidth;
      const y = chartHeight - (normalizeFn(value) * chartHeight);
      return { x, y };
    });
    const resCoords = toCoords(resonanceSeries, normalizeMain);
    const varCoords = toCoords(varianceSeries, (value) => clamp01(Number(value || 0) / maxVariance));
    const cccCoords = toCoords(cccContributionSeries, normalizeMain);
    const toPolyline = (coords) => coords.map((pt) => `${pt.x},${pt.y}`).join(' ');

    return {
      timeline,
      latestPoint,
      chartWidth,
      chartHeight,
      domainMin,
      domainMax,
      maxVariance,
      normalizeMain,
      resonancePolyline: toPolyline(resCoords),
      variancePolyline: toPolyline(varCoords),
      cccPolyline: toPolyline(cccCoords),
      lastResPoint: resCoords.length > 0 ? resCoords[resCoords.length - 1] : null,
      lastVarPoint: varCoords.length > 0 ? varCoords[varCoords.length - 1] : null,
      lastCccPoint: cccCoords.length > 0 ? cccCoords[cccCoords.length - 1] : null
    };
  }, [simulationStep, fieldMetrics, entanglementUiState.smoothing, entanglementUiState.autoScale, smoothSeries]);

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
      if (sensoryPollRef.current) clearInterval(sensoryPollRef.current);
      sensoryPollRef.current = setInterval(() => {
        if (sensoryEngine.current.isReady) {
          setSensoryState(sensoryEngine.current.getFullPerception());
        }
      }, 500);
    };

    initSensory();

    return () => {
      if (sensoryPollRef.current) {
        clearInterval(sensoryPollRef.current);
        sensoryPollRef.current = null;
      }
      sensoryEngine.current.destroy();
    };
  }, [deviceCapabilities.supportsMicrophone, deviceCapabilities.supportsCamera, deviceCapabilities.secureContext]);

  const handleToggleSensory = useCallback(async () => {
    const isCurrentlyActive = Boolean(sensoryEnabled.video || sensoryEnabled.audio || sensoryEngine.current?.isReady);
    if (isCurrentlyActive) {
      if (sensoryPollRef.current) {
        clearInterval(sensoryPollRef.current);
        sensoryPollRef.current = null;
      }
      try {
        sensoryEngine.current?.destroy?.();
      } catch (err) {
        console.warn('[QICN][SENSORY] Error al desactivar sensores:', err?.message || err);
      }
      setSensoryEnabled({ audio: false, video: false });
      setSensoryState(null);
      setSensoryNotice('Cámara y micrófono desactivados. Puedes volver a encenderlos cuando quieras.');
      return;
    }

    if (!deviceCapabilities.secureContext) {
      setSensoryNotice('Tu navegador exige conexión segura (HTTPS o localhost) para habilitar cámara y micrófono.');
      return;
    }

    setSensoryBusy(true);
    setSensoryNotice('Solicitando permiso de cámara y micrófono en tu navegador…');
    try {
      const rawResult = await sensoryEngine.current.autoActivate();
      const normalized = {
        ...rawResult,
        audio: Boolean(rawResult?.audio && deviceCapabilities.supportsMicrophone),
        video: Boolean(rawResult?.video && deviceCapabilities.supportsCamera)
      };
      setSensoryEnabled(normalized);
      const stream = normalized.video ? sensoryEngine.current.getVideoStream?.() : null;
      if (stream && videoPreviewRef.current) videoPreviewRef.current.srcObject = stream;
      if (stream && videoTabRef.current) videoTabRef.current.srcObject = stream;
      if (sensoryEngine.current?.isReady) {
        setSensoryState(sensoryEngine.current.getFullPerception());
      }
      if (normalized.video || normalized.audio) {
        if (sensoryPollRef.current) clearInterval(sensoryPollRef.current);
        sensoryPollRef.current = setInterval(() => {
          if (sensoryEngine.current?.isReady) {
            setSensoryState(sensoryEngine.current.getFullPerception());
          }
        }, 500);
        setSensoryNotice('');
      } else {
        setSensoryNotice('No se concedió permiso o no se detectó cámara/micrófono disponible en este dispositivo.');
      }
    } catch (err) {
      setSensoryNotice(`No se pudieron activar los sensores: ${err?.message || 'permiso denegado o dispositivo ocupado'}`);
    } finally {
      setSensoryBusy(false);
    }
  }, [sensoryEnabled.video, sensoryEnabled.audio, deviceCapabilities.secureContext, deviceCapabilities.supportsCamera, deviceCapabilities.supportsMicrophone]);

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
      if (['legacy', 'learned'].includes(verdict.body?.kaizenMode)) {
        QICNConfig.KAIZEN_ADJUSTMENT_MODE = verdict.body.kaizenMode;
        setKaizenMode(verdict.body.kaizenMode);
      }
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
        kaizenEffective: QICNConfig.KAIZEN_ADJUSTMENT_MODE === 'learned',
        sensorObserverDynamicsEnabled: QICNConfig.SENSOR_OBSERVER_DYNAMICS_ENABLED === true,
        level2Telemetry: {
          enabled: QICNConfig.STRUCTURAL_PLASTICITY_LEVEL2_ENABLED === true,
          ...getStructuralPlasticityLevel2Telemetry(nodalLayer.current)
        }
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

    const turnRegister = prepared?.reasoningPlan?.conversationRegister || 'epistemic_deep';
    const isOpenCasualTurn = turnRegister === 'casual_social' || turnRegister === 'open_general';
    const turnThinkingLevel = turnRegister === 'casual_social' ? 'low' : CHAT_THINKING_LEVEL;

    const requestRealization = async (systemText) => {
      const payload = {
        contents: [{ role: 'user', parts: [{ text: input }] }],
        systemInstruction: { parts: [{ text: systemText }] },
        // Maximum budget the model allows: gemini-3-flash-preview has a 65 536
        // output-token limit, and Gemini 3 counts thinking tokens inside it.
        // Thinking level stays at CHAT_THINKING_LEVEL ('high') for open/technical/
        // epistemic depth and adapts to 'low' only on light social greetings.
        generationConfig: {
          maxOutputTokens: CHAT_MAX_OUTPUT_TOKENS,
          temperature: isOpenCasualTurn ? 0.68 : 0.4,
          topP: 0.9,
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingLevel: turnThinkingLevel }
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
  const pendingAutoAttachB2Ref = useRef(false);
  const attachWorkbenchEvidence=workbenchAttachmentDigest===microWorkbench.bundle?.result.digest;
  useEffect(()=>{
    if (microWorkbench.bundle && pendingAutoAttachB2Ref.current) {
      pendingAutoAttachB2Ref.current = false;
      setWorkbenchAttachmentDigest(microWorkbench.bundle.result.digest);
      return;
    }
    setWorkbenchAttachmentDigest(null);
  },[microWorkbench.bundle]);
  useEffect(() => {
    if (['error', 'timed_out', 'cancelled'].includes(microWorkbench.status)) {
      pendingAutoAttachB2Ref.current = false;
    }
  }, [microWorkbench.status]);
  useEffect(() => {
    if (!isRunning) return;
    const liveCfg = kaizenEngine.current?.mutableConfig;
    if (!liveCfg) return;
    setMutableConfig((prev) => {
      const changed = Object.keys(liveCfg).some(
        (key) => Math.abs((Number(prev?.[key]) || 0) - (Number(liveCfg[key]) || 0)) > 1e-6
      );
      return changed ? { ...liveCfg } : prev;
    });
  }, [simulationStep, isRunning]);
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
    if (level3ControllerRef.current) {
      level3ControllerRef.current.resetTransientRuntimeState({
        keepKnowledgeBelt: true,
        keepAuditLedger: true
      });
      setLevel3GovernorState({
        ...level3ControllerRef.current.governorState,
        callTimestampsMs: [...(level3ControllerRef.current.governorState.callTimestampsMs || [])]
      });
      setLevel3ActiveGate2Watch(null);
    }
    setLevel3ActionNotice('');

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
    if (QICNConfig.STRUCTURAL_PLASTICITY_LEVEL2_ENABLED !== structuralPlasticityLevel2Enabled) {
      QICNConfig.STRUCTURAL_PLASTICITY_LEVEL2_ENABLED = structuralPlasticityLevel2Enabled;
      recordOperationalEvent('parameter_change', { key: 'STRUCTURAL_PLASTICITY_LEVEL2_ENABLED', to: structuralPlasticityLevel2Enabled, source: 'ui' }, simulationRuntimeRef.current?.simulationStep ?? 0);
    }
    try { browserStorage()?.setItem(STRUCTURAL_PLASTICITY_LEVEL2_KEY, structuralPlasticityLevel2Enabled ? 'on' : 'off'); } catch (error) { /* optional persistence */ }
  }, [structuralPlasticityLevel2Enabled]);

  useEffect(() => {
    if (QICNConfig.AUTONOMOUS_SUPERVISOR_LEVEL3_ENABLED !== autonomousSupervisorLevel3Enabled) {
      QICNConfig.AUTONOMOUS_SUPERVISOR_LEVEL3_ENABLED = autonomousSupervisorLevel3Enabled;
      recordOperationalEvent('parameter_change', { key: 'AUTONOMOUS_SUPERVISOR_LEVEL3_ENABLED', to: autonomousSupervisorLevel3Enabled, source: 'ui' }, simulationRuntimeRef.current?.simulationStep ?? 0);
    }
    try { browserStorage()?.setItem(AUTONOMOUS_SUPERVISOR_LEVEL3_KEY, autonomousSupervisorLevel3Enabled ? 'on' : 'off'); } catch (error) { /* optional persistence */ }
  }, [autonomousSupervisorLevel3Enabled]);

  useEffect(() => {
    if (level3ControllerRef.current) {
      level3ControllerRef.current.policy = {
        ...level3ControllerRef.current.policy,
        scheduledExplorationEveryTicks: level3ExploreEveryTicks
      };
    }
  }, [level3ExploreEveryTicks]);

  const buildLiveLevel3Target = useCallback(() => ({
    bag: {
      ...getPersistenceRefs(),
      quantumEntropyBridgeRef,
      interventionSchedulerRef,
      interventionSchedulerMetaRef,
      interventionScheduleAbortRef,
      lastSaveTimestampRef,
      apiCallLog,
      canvasTelemetryRef,
      simulationRuntimeRef
    },
    config: QICNConfig,
    completedTick: simulationRuntimeRef.current?.simulationStep ?? simulationStep,
    getLiveTick: () => Number(simulationRuntimeRef.current?.simulationStep ?? simulationStep),
    captureWorkbench: captureWorkbenchAtBoundary
  }), [getPersistenceRefs, simulationStep, captureWorkbenchAtBoundary]);

  const syncRuntimeAndReactAfterMutation = useCallback((appliedRuntime = null) => {
    if (['legacy', 'learned'].includes(QICNConfig.KAIZEN_ADJUSTMENT_MODE)) {
      setKaizenMode(QICNConfig.KAIZEN_ADJUSTMENT_MODE);
    }
    setSensorObserverDynamicsEnabled(Boolean(QICNConfig.SENSOR_OBSERVER_DYNAMICS_ENABLED));
    setStructuralPlasticityLevel2Enabled(Boolean(QICNConfig.STRUCTURAL_PLASTICITY_LEVEL2_ENABLED));
    if (kaizenEngine.current?.mutableConfig) {
      setMutableConfig({ ...kaizenEngine.current.mutableConfig });
    }
    if (appliedRuntime && typeof appliedRuntime === 'object') {
      if (simulationControllerRef.current) {
        simulationControllerRef.current.syncFromCore?.(ontologicalCore.current);
        worldModelRef.current = simulationControllerRef.current.worldModel;
        cogPlannerRef.current = simulationControllerRef.current.planner;
      }
      const restoredTick = Number.isFinite(appliedRuntime.simulationStep)
        ? appliedRuntime.simulationStep
        : (simulationRuntimeRef.current?.simulationStep ?? simulationStep);
      const restoredCcc = Number.isFinite(appliedRuntime.ccc)
        ? appliedRuntime.ccc
        : (ontologicalCore.current?.ontologicalState?.coherence ?? 0.5);
      const restoredPmia = Number.isFinite(appliedRuntime.pmia)
        ? appliedRuntime.pmia
        : (ontologicalCore.current?.pmiaValue ?? 0);
      const restoredAscended = Boolean(appliedRuntime.isAscended ?? ontologicalCore.current?.isAscended);
      Object.assign(simulationRuntimeRef.current, appliedRuntime, {
        simulationStep: restoredTick,
        ccc: restoredCcc,
        pmia: restoredPmia,
        isAscended: restoredAscended
      });
      setSimulationStep(restoredTick);
      setCCC(restoredCcc);
      setPMIA(restoredPmia);
      setIsAscended(restoredAscended);
      if (Number.isFinite(appliedRuntime.humanCcc)) setHumanCcc(appliedRuntime.humanCcc);
      if (ontologicalCore.current?.selfNarrative) setNarrative(ontologicalCore.current.selfNarrative);
      setOntologicalState({
        ...(ontologicalCore.current?.ontologicalState || {}),
        _tick: Date.now()
      });
      if (nodalLayer.current) {
        setTopologyMetrics(nodalLayer.current.getTopologyMetrics());
        setVisualNodes(nodalLayer.current.getHighlyCoherentNodes(150));
      }
    }
  }, [simulationStep]);

  const syncLevel3StateToUi = useCallback(() => {
    const ctrl = level3ControllerRef.current;
    if (!ctrl) return;
    const nextLedger = { ...ctrl.auditLedger, entries: [...ctrl.auditLedger.entries] };
    const nextBelt = { ...ctrl.knowledgeBelt, findings: [...ctrl.knowledgeBelt.findings] };
    const nextGovernorState = {
      ...ctrl.governorState,
      callTimestampsMs: [...(ctrl.governorState.callTimestampsMs || [])]
    };
    const nextWatch = ctrl.activeGate2Watch
      ? {
          ...ctrl.activeGate2Watch,
          scores: [...(ctrl.activeGate2Watch.scores || [])],
          inTubeFlags: [...(ctrl.activeGate2Watch.inTubeFlags || [])]
        }
      : null;
    setLevel3Ledger(nextLedger);
    setLevel3KnowledgeBelt(nextBelt);
    setLevel3GovernorState(nextGovernorState);
    setLevel3ActiveGate2Watch(nextWatch);
    try {
      browserStorage()?.setItem(LEVEL3_AUDIT_LEDGER_STORAGE_KEY, JSON.stringify(nextLedger));
      browserStorage()?.setItem(LEVEL3_KNOWLEDGE_BELT_STORAGE_KEY, JSON.stringify(nextBelt));
    } catch {
      /* optional persistence */
    }
  }, []);

  const executeLiveLevel3Reasoner = useCallback(async (ctx) => {
    let fallbackError = null;
    let llmAttempted = false;
    if (level3ReasonerMode === 'gemini_with_fallback' && canUseLlmNow && !cooldownActive) {
      llmAttempted = true;
      try {
        const nowTs = Date.now();
        const currentPacket = integrityPacketRef.current || {
          versionHash: String(BUILD_SIGNATURE_LABEL || 'qicn-level3-v1'),
          configHash: String(sha256Hex(stableStringify(QICNConfig || {}))),
          tick: Number(ctx.snapshot?.tick ?? simulationStep ?? 0),
          snapshotId: String(ctx.snapshot?.digest || '')
        };
        const level3IntegrityEnvelope = {
          packet: currentPacket,
          nonce: `l3_${nowTs}_${typeof globalThis.crypto?.randomUUID === 'function' ? globalThis.crypto.randomUUID() : Math.random().toString(36).slice(2, 10)}`,
          requestId: `req_l3_${nowTs}`,
          runId: String(currentPacket.runId || operationalLedgerRef.current?.currentSession?.sessionId || `ui_session_${QICNConfig.CORE_SEED || 0}`),
          versionHash: String(currentPacket.versionHash || BUILD_SIGNATURE_LABEL || 'qicn-level3-v1'),
          configHash: String(currentPacket.configHash || sha256Hex(stableStringify(QICNConfig || {}))),
          threatModelRequested: 'C2'
        };
        const payload = {
          contents: [{ role: 'user', parts: [{ text: ctx.prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048,
            responseMimeType: 'application/json'
          }
        };
        const result = await robustFetchLLMResponseTracked(resolveLlmEndpoint(), payload, 'level3-supervisor', {
          integrityEnvelope: level3IntegrityEnvelope,
          dynamicsCoupling: false,
          writeCycleLog: false,
          timeoutMs: 45000
        });
        const parts = result?.candidates?.[0]?.content?.parts || [];
        const text = parts
          .filter((p) => !p.thought && typeof p.text === 'string')
          .map((p) => p.text)
          .join('\n')
          .trim();
        if (text) {
          return {
            rawText: text,
            reasonerSource: 'gemini_live',
            external_llm_assisted: true,
            llmAttempted: true,
            reasonerError: null
          };
        }
        fallbackError = 'empty_gemini_response';
      } catch (err) {
        fallbackError = String(err?.message || err);
      }
    }
    const rawText = buildDeterministicFirstPersonProposal({
      snapshot: ctx.snapshot,
      triggerKind: ctx.triggerKind,
      triggerFacts: ctx.triggerFacts,
      telemetry: ctx.telemetry,
      level2Telemetry: ctx.telemetry?.level2Telemetry,
      knowledgeBelt: ctx.knowledgeBelt,
      regimeSignature: ctx.regimeSignature,
      sensorObserverDynamicsEnabled: QICNConfig.SENSOR_OBSERVER_DYNAMICS_ENABLED !== false
    });
    return {
      rawText,
      reasonerSource: fallbackError ? 'deterministic_fallback' : 'deterministic_local',
      external_llm_assisted: false,
      llmAttempted,
      reasonerError: fallbackError
    };
  }, [level3ReasonerMode, canUseLlmNow, cooldownActive, simulationStep, robustFetchLLMResponseTracked, resolveLlmEndpoint]);

  useEffect(() => {
    if (!autonomousSupervisorLevel3Enabled || simulationStep < 1) return;
    const ctrl = level3ControllerRef.current;
    if (!ctrl || ctrl.governorState.inFlight) return;
    const target = buildLiveLevel3Target();
    ctrl.runCycle(target, {
      tick: simulationStep,
      nowMs: Date.now(),
      customReasoner: level3ReasonerMode === 'deterministic_local' ? null : executeLiveLevel3Reasoner
    }).then((res) => {
      if (res?.triggered || res?.gate2StepResult) {
        syncRuntimeAndReactAfterMutation(res?.gate2StepResult?.appliedRuntime || null);
        syncLevel3StateToUi();
      }
    }).catch(() => {});
  }, [simulationStep, autonomousSupervisorLevel3Enabled, level3ReasonerMode, buildLiveLevel3Target, executeLiveLevel3Reasoner, syncRuntimeAndReactAfterMutation, syncLevel3StateToUi]);

  const handleTriggerLevel3ManualReflection = useCallback(async () => {
    const ctrl = level3ControllerRef.current;
    if (!ctrl) return;
    setLevel3ActionNotice('');
    const target = buildLiveLevel3Target();
    const res = await ctrl.runCycle(target, {
      tick: Math.max(0, simulationStep),
      nowMs: Date.now(),
      forceManual: true,
      manualTriggerKind: 'manual_reflection',
      customReasoner: level3ReasonerMode === 'deterministic_local' ? null : executeLiveLevel3Reasoner
    });
    if (res && res.triggered === false && res.reason) {
      setLevel3ActionNotice(`Reflexión Nivel 3 no disparada (${res.reason}).`);
    }
    syncRuntimeAndReactAfterMutation(res?.gate2StepResult?.appliedRuntime || null);
    syncLevel3StateToUi();
  }, [buildLiveLevel3Target, simulationStep, level3ReasonerMode, executeLiveLevel3Reasoner, syncRuntimeAndReactAfterMutation, syncLevel3StateToUi]);

  const handleTriggerLevel3ShadowTrialNow = useCallback(async () => {
    const ctrl = level3ControllerRef.current;
    if (!ctrl) return;
    if (
      simulationStep < 1 ||
      !workbenchBoundaryRef.current?.ready ||
      workbenchBoundaryRef.current.tick < 1 ||
      workbenchBoundaryRef.current.tick !== (simulationRuntimeRef.current?.simulationStep ?? simulationStep)
    ) {
      setLevel3ActionNotice('No se puede ejecutar Compuerta 1 del Workbench en tick 0: inicia o avanza al menos 1 tick real de simulación.');
      return;
    }
    setLevel3ActionNotice('');
    const target = buildLiveLevel3Target();
    const res = await ctrl.runCycle(target, {
      tick: simulationStep,
      nowMs: Date.now(),
      forceManual: true,
      manualTriggerKind: 'manual_shadow_trial',
      customReasoner: level3ReasonerMode === 'deterministic_local' ? null : executeLiveLevel3Reasoner
    });
    if (res && res.triggered === false && res.reason) {
      setLevel3ActionNotice(`Prueba en Workbench Nivel 3 no disparada (${res.reason}).`);
    }
    syncRuntimeAndReactAfterMutation(res?.gate2StepResult?.appliedRuntime || null);
    syncLevel3StateToUi();
  }, [buildLiveLevel3Target, simulationStep, level3ReasonerMode, executeLiveLevel3Reasoner, syncRuntimeAndReactAfterMutation, syncLevel3StateToUi]);

  const handleImportLevel3Bundle = useCallback((bundle) => {
    const check = verifyLevel3SealedAuditBundle(bundle);
    if (!check.ok || !bundle?.ledger || !bundle?.knowledgeBelt) {
      setLevel3ActionNotice(`Importación rechazada: integridad SHA-256 inválida (${check.reason || 'bundle_invalid'}).`);
      return;
    }
    const ctrl = level3ControllerRef.current;
    if (ctrl) {
      const clonedLedger = structuredClone(bundle.ledger);
      const clonedBelt = structuredClone(bundle.knowledgeBelt);
      ctrl.auditLedger = clonedLedger;
      ctrl.knowledgeBelt = clonedBelt;
      ctrl.activeGate2Watch = null;
      ctrl.lastLevel2Telemetry = null;
      ctrl.cycleSequence = Math.max(Number(ctrl.cycleSequence) || 0, clonedLedger.entries.length);
    }
    setLevel3ActionNotice('');
    syncLevel3StateToUi();
  }, [syncLevel3StateToUi]);

  const handleSyncLevel3FromWorker = useCallback((workerPayload) => {
    const syncRes = synchronizeLevel3WorkerStateIntoTarget(buildLiveLevel3Target(), workerPayload, {
      controller: level3ControllerRef.current,
      allowTopologyOverwrite: false
    });
    if (syncRes?.topologyOverwritten && syncRes.appliedRuntime) {
      syncRuntimeAndReactAfterMutation(syncRes.appliedRuntime);
    }
    syncLevel3StateToUi();
  }, [buildLiveLevel3Target, syncRuntimeAndReactAfterMutation, syncLevel3StateToUi]);

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
    <div className="space-y-4 rounded-xl border border-teal-500/30 bg-gradient-to-br from-slate-950/90 via-teal-950/25 to-slate-950/90 p-3 shadow-lg sm:p-5">
      <TabPlainHeader
        tabId="validation"
        accent="teal"
        icon={<Layers className="h-5 w-5" />}
        title="Ajustes en Vivo"
        technicalTag="Validación · Cf, Bs, K, T"
      />

      {/* Resumen inmediato del impacto en CCC */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-teal-500/35 bg-teal-950/35 px-4 py-3">
        <div>
          <MetricDualLabel casual="Cohesión global actual" technical="Impacto Directo en el CCC" />
          <p className="mt-0.5 text-[11px] text-slate-300">
            {isRunning
              ? 'Modo interactivo en directo: mueve cualquiera de los 4 controles mientras corre la simulación; el motor recalibra K y T automáticamente.'
              : 'Mueve cualquier control ahora o mientras corre la simulación (botón «Iniciar simulación» a la izquierda).'}
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-2xl font-extrabold text-white">
          {isAscended ? <Sun className="h-6 w-6 text-yellow-300 animate-pulse" /> : null}
          {formatCCC(ccc, isAscended)}
        </div>
      </div>

      {/* 4 Deslizadores limpios en 2x2 con polos claros y "Detalles ▾" por tarjeta */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {/* CONTROL 1: Complexity Factor (Cf) */}
        <div className="rounded-xl border border-slate-700/80 bg-slate-900/75 p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-white">
                1. Complejidad de red <span className="font-mono text-[11px] font-normal text-teal-300">· Cf</span>
              </label>
              <InfoModal
                title="Complexity Factor (Cf) - Parámetro Fundamental"
                content={`COMPLEXITY FACTOR (Cf) - PARÁMETRO FUNDAMENTAL

FUNCIÓN PRINCIPAL:
Modula la Intensidad Informacional (Ic) del sistema, determinando la densidad organizacional de la red nodal.

RANGO OPERATIVO:
• Mínimo: 0.01 (organización mínima)
• Equilibrio: 0.5-0.8
• Alto: 0.8-1.0
• Actual: ${complexityFactor.toFixed(2)}

NOTA TÉCNICA:
Este parámetro se utiliza en el cálculo interno de CCC en InformationalEntanglementField.calculateCCC; no constituye validación externa.`}
              />
            </div>
            <span className="font-mono text-lg font-bold text-teal-300">{complexityFactor.toFixed(2)}</span>
          </div>
          <p className="mb-2.5 text-xs text-slate-400">
            Cuánto peso tiene la organización interna de la red sobre el índice de cohesión.
          </p>
          <input
            type="range"
            min="0.01"
            max="1.0"
            step="0.01"
            value={complexityFactor}
            onChange={(e) => setComplexityFactor(parseFloat(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-teal-400"
          />
          <div className="mt-1.5 flex justify-between text-[10px] text-slate-500">
            <span>← Más simple (0.01)</span>
            <span>Más organizada (1.00) →</span>
          </div>
          <DetailToggleStrip
            className="mt-3"
            accent="teal"
            summary={<span className="font-mono text-[10px] text-slate-400">Rango 0.01–1.0 · Control directo</span>}
          >
            <div className="space-y-1.5 text-[11px]">
              <p className="text-slate-300">
                <Cpu className="mr-1 inline h-3 w-3" />
                <strong>Efecto:</strong> Cf alto aumenta la sensibilidad de CCC a la organización nodal, sin garantizar ascenso.
              </p>
              {renderParameterTrace('complexityFactor')}
            </div>
          </DetailToggleStrip>
        </div>

        {/* CONTROL 2: Stability Bias (Bs) */}
        <div className="rounded-xl border border-slate-700/80 bg-slate-900/75 p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-white">
                2. Estabilidad ante cambios <span className="font-mono text-[11px] font-normal text-cyan-300">· Bs</span>
              </label>
              <InfoModal
                title="Stability Bias (Bs) - Control de Sensibilidad"
                content={`STABILITY BIAS (Bs) - CONTROL DE SENSIBILIDAD

FUNCIÓN PRINCIPAL:
Controla cuánto resiste el sistema a reorganizarse frente a perturbaciones.

RANGO OPERATIVO:
• 0.01-0.3: adaptación rápida (más volatilidad)
• 0.6-0.8: equilibrio entre estabilidad y cambio
• 0.8-1.0: conservación fuerte
• Actual: ${stabilityBias.toFixed(2)}`}
              />
            </div>
            <span className="font-mono text-lg font-bold text-cyan-300">{stabilityBias.toFixed(2)}</span>
          </div>
          <p className="mb-2.5 text-xs text-slate-400">
            Valores bajos hacen la red más adaptable; valores altos conservan con más fuerza el estado actual.
          </p>
          <input
            type="range"
            min="0.01"
            max="1.0"
            step="0.01"
            value={stabilityBias}
            onChange={(e) => setStabilityBias(parseFloat(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-cyan-400"
          />
          <div className="mt-1.5 flex justify-between text-[10px] text-slate-500">
            <span>← Cambio rápido (0.01)</span>
            <span>Más conservadora (1.00) →</span>
          </div>
          <DetailToggleStrip
            className="mt-3"
            accent="cyan"
            summary={<span className="font-mono text-[10px] text-slate-400">Rango 0.01–1.0 · Control directo</span>}
          >
            <div className="space-y-1.5 text-[11px]">
              <p className="text-slate-300">
                <Feather className="mr-1 inline h-3 w-3" />
                <strong>Efecto:</strong> sesga la actualización introspectiva nodal; Bs óptimo emergente 0.6–0.8.
              </p>
              {renderParameterTrace('stabilityBias')}
            </div>
          </DetailToggleStrip>
        </div>

        {/* CONTROL 3: BOLTZMANN ANALOG K */}
        <div className="rounded-xl border border-slate-700/80 bg-slate-900/75 p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-white">
                3. Sensibilidad energética <span className="font-mono text-[11px] font-normal text-pink-300">· K</span>
              </label>
              <InfoModal
                title="Constante K (Boltzmann Analog) - Sensibilidad Energética"
                content={`CONSTANTE K (BOLTZMANN ANALOG) - SENSIBILIDAD ENERGÉTICA

FUNCIÓN PRINCIPAL:
Escala cómo reacciona la resonancia nodal ante diferencias de energía. Es un parámetro mutable que también recalibra el motor en vivo.

RANGO MUTABLE: 0.1–5.0 | Actual: ${mutableConfig.BOLTZMANN_ANALOG_K.toFixed(3)}`}
              />
            </div>
            <div className="flex items-center gap-2">
              {isRunning && (
                <span className="rounded-full border border-pink-400/35 bg-pink-950/50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-pink-200">
                  Auto-recalibrado
                </span>
              )}
              <span className={`font-mono text-lg font-bold ${isRunning ? 'text-pink-300' : 'text-pink-400'}`}>
                {mutableConfig.BOLTZMANN_ANALOG_K.toFixed(3)}
              </span>
            </div>
          </div>
          <p className="mb-2.5 text-xs text-slate-400">
            Cuánto reaccionan los nodos a diferencias de energía. Si lo mueves en vivo, el motor lo reequilibra solo.
          </p>
          <input
            type="range"
            min="0.1"
            max="5.0"
            step="0.01"
            value={mutableConfig.BOLTZMANN_ANALOG_K}
            onChange={(e) => {
              const nextVal = parseFloat(e.target.value);
              QICNConfig.BOLTZMANN_ANALOG_K = nextVal;
              if (kaizenEngine.current?.mutableConfig) {
                kaizenEngine.current.mutableConfig = { ...kaizenEngine.current.mutableConfig, BOLTZMANN_ANALOG_K: nextVal };
              }
              setMutableConfig((prev) => ({ ...prev, BOLTZMANN_ANALOG_K: nextVal }));
            }}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-pink-400"
          />
          <div className="mt-1.5 flex justify-between text-[10px] text-slate-500">
            <span>← Respuesta suave (0.1)</span>
            <span>Alta sensibilidad (5.0) →</span>
          </div>
          <DetailToggleStrip
            className="mt-3"
            accent="fuchsia"
            summary={<span className="font-mono text-[10px] text-slate-400">Rango 0.1–5.0 · Recalibración autónoma activa</span>}
          >
            <div className="space-y-1.5 text-[11px]">
              <p className="text-slate-300">
                <Waves className="mr-1 inline h-3 w-3" />
                <strong>Efecto:</strong> cambia el kernel de resonancia nodal (parámetro interno, no constante física real).
              </p>
              {renderParameterTrace('BOLTZMANN_ANALOG_K')}
            </div>
          </DetailToggleStrip>
        </div>

        {/* CONTROL 4: INFORMATIONAL TEMP T */}
        <div className="rounded-xl border border-slate-700/80 bg-slate-900/75 p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-white">
                4. Temperatura de exploración <span className="font-mono text-[11px] font-normal text-rose-300">· T</span>
              </label>
              <InfoModal
                title="Temperatura Informacional (T) - Entropía del Sistema"
                content={`TEMPERATURA INFORMACIONAL (T) - ENTROPÍA DEL SISTEMA

FUNCIÓN PRINCIPAL:
Regula el balance entre exploración (valores altos) y consolidación estable (valores bajos). El motor la recalibra automáticamente al correr.

RANGO MUTABLE: 0.1–5.0 | Actual: ${mutableConfig.INFORMATIONAL_TEMP_T.toFixed(3)}`}
              />
            </div>
            <div className="flex items-center gap-2">
              {isRunning && (
                <span className="rounded-full border border-rose-400/35 bg-rose-950/50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-rose-200">
                  Auto-recalibrado
                </span>
              )}
              <span className={`font-mono text-lg font-bold ${isRunning ? 'text-rose-300' : 'text-rose-400'}`}>
                {mutableConfig.INFORMATIONAL_TEMP_T.toFixed(3)}
              </span>
            </div>
          </div>
          <p className="mb-2.5 text-xs text-slate-400">
            Valores bajos buscan orden estable; valores altos abren más exploración. El motor la recalibra en vivo.
          </p>
          <input
            type="range"
            min="0.1"
            max="5.0"
            step="0.01"
            value={mutableConfig.INFORMATIONAL_TEMP_T}
            onChange={(e) => {
              const nextVal = parseFloat(e.target.value);
              QICNConfig.INFORMATIONAL_TEMP_T = nextVal;
              if (kaizenEngine.current?.mutableConfig) {
                kaizenEngine.current.mutableConfig = { ...kaizenEngine.current.mutableConfig, INFORMATIONAL_TEMP_T: nextVal };
              }
              setMutableConfig((prev) => ({ ...prev, INFORMATIONAL_TEMP_T: nextVal }));
            }}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-rose-400"
          />
          <div className="mt-1.5 flex justify-between text-[10px] text-slate-500">
            <span>← Orden estable (0.1)</span>
            <span>Más exploración (5.0) →</span>
          </div>
          <DetailToggleStrip
            className="mt-3"
            accent="rose"
            summary={<span className="font-mono text-[10px] text-slate-400">Rango 0.1–5.0 · Recalibración autónoma activa</span>}
          >
            <div className="space-y-1.5 text-[11px]">
              <p className="text-slate-300">
                <Sun className="mr-1 inline h-3 w-3" />
                <strong>Efecto:</strong> modula el decaimiento informacional en resonancia (parámetro del modelo, no temperatura física).
              </p>
              {renderParameterTrace('INFORMATIONAL_TEMP_T')}
            </div>
          </DetailToggleStrip>
        </div>
      </div>

      {/* Diagnósticos técnicos colapsados por defecto */}
      <CollapsibleSection
        sectionId="validation-bridge-formula"
        title="Diagnóstico técnico del puente (Paper 9 / Paper 10) y fórmula CCC · Detalles"
        badge={`Salud: ${runtimeHealth.status}`}
        accent="fuchsia"
        defaultOpen={false}
      >
        <div className="space-y-3">
          <div className="rounded-lg border border-teal-500/30 bg-teal-950/30 p-3 text-xs text-slate-200">
            <h4 className="font-semibold text-teal-300">Impacto Directo en el CCC:</h4>
            <p className={`mt-1 ${levelColor}`}>
              <strong>Lectura:</strong> CCC es un índice interno no calibrado que responde a estos parámetros; la relación es de implementación, no una hipótesis validada.
            </p>
            <div className="mt-1.5 font-mono text-[11px] text-cyan-300">
              InformationalEntanglementField.calculateCCC: CCC = 0,42·coherencia media + 0,18/(1+varianza de energía) + (0,18+0,12·Cf)·resonancia normalizada + 0,22·coherencia·resonancia·Cf (con K y T en la resonancia nodal).
            </div>
          </div>
          <PhenomenalBridgePanel
            simulationStep={simulationStep}
            runtimeHealth={runtimeHealth}
          />
        </div>
      </CollapsibleSection>
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
      'Hola, ¿cómo estás?',
      '¿Qué opinas de cómo la tecnología cambia nuestra forma de pensar?',
      '¿Cómo está el sistema ahora?',
      '¿Qué ha cambiado desde la última respuesta?',
      '¿Quién eres y qué no puedes afirmar?'
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

    return (
      <section aria-labelledby="qicn-chat-title" className="min-w-0 space-y-3 rounded-xl border border-indigo-500/30 bg-slate-950/85 p-3 shadow-lg sm:p-4">
        <div id="qicn-chat-title">
          <TabPlainHeader
            tabId="chat"
            accent="indigo"
            compact={true}
            icon={<MessageSquare className="size-5" />}
            title="Conversar con QICN"
            technicalTag="Consola · Sistema B unificado"
            rightSlot={(
              <>
                <button type="button" onClick={() => handleTabSelect('network')} className="rounded-md border border-indigo-400/40 px-2.5 py-1 text-xs text-indigo-100 hover:bg-indigo-800/40">
                  Red nodal
                </button>
                <button type="button" onClick={() => handleTabSelect('api-control')} className="rounded-md border border-indigo-400/40 px-2.5 py-1 text-xs text-indigo-100 hover:bg-indigo-800/40">
                  Control API
                </button>
              </>
            )}
            extraDetails={(
              <div className="space-y-1.5 text-[11px] leading-relaxed text-slate-300">
                <p>
                  <strong className="text-indigo-200">Verificación Sistema B:</strong> cada respuesta se liga por SHA-256 (64 hex) y tick exacto al snapshot del motor; cifras, signos (PMIA), diferencia entre <code>sigma_exact_defect = 0</code> y cotas superiores (1/729, 2/2187, 32/15309) y evidencia B2 (copia aislada) se contrastan frase a frase.
                </p>
                <p>
                  <strong className="text-indigo-200">Decisión endógena previa al LLM:</strong> la postura en primera persona se decide determinísticamente en <code>EndogenousEpistemicDecisionEngine</code> (Ejes 1–2: δ_int = 1/4 en F₂², 1/8 en F₃², 5 raíces G = 1/2097152 con margen ruidoso penalizado 253/536870912 &gt; G/2 ante lectura cruda ε ≤ G/1024 + costo B·w_c; Ejes 3–4: historia causal SHA-256 y telemetría acoplada). Gemini redacta en prosa continua (thinkingLevel: high) sin poder invertir el <code>decision_code</code> ni autocertificar <code>external_support_certified = true</code>.
                </p>
              </div>
            )}
          />
        </div>

        <div className="flex h-[min(74dvh,780px)] min-h-[420px] sm:h-[min(82dvh,860px)] sm:min-h-[560px] flex-col overflow-hidden rounded-xl border border-purple-700/70 bg-gray-900/75">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-purple-800/60 bg-indigo-900/30 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs text-indigo-100">
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

          <div className="mx-3 mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-indigo-100/90">
            <label className="flex cursor-pointer items-center gap-2 select-none">
              <input
                type="checkbox"
                checked={attachWorkbenchEvidence}
                disabled={isChatting || microWorkbench.status === 'running' || microWorkbench.status === 'capturing'}
                onChange={(e) => {
                  const wantAttach = e.target.checked;
                  if (!wantAttach) {
                    pendingAutoAttachB2Ref.current = false;
                    setWorkbenchAttachmentDigest(null);
                    return;
                  }
                  if (microWorkbench.bundle) {
                    setWorkbenchAttachmentDigest(microWorkbench.bundle.result.digest);
                    return;
                  }
                  pendingAutoAttachB2Ref.current = true;
                  microWorkbench.run({
                    profile: 'paired_intervention',
                    ticks: 12,
                    seed: 11,
                    interventions: ['kaizen_learned_mode']
                  });
                }}
              />
              <span>
                Adjuntar resultado Workbench verificado (copia aislada B2) ·{' '}
                {microWorkbench.status === 'running' || microWorkbench.status === 'capturing'
                  ? <span className="text-amber-300">ejecutando copia aislada…</span>
                  : attachWorkbenchEvidence
                    ? <span className="text-emerald-300">{microWorkbench.evidenceStatus}</span>
                    : microWorkbench.bundle
                      ? <span className="text-cyan-300">listo para adjuntar</span>
                      : <span className="text-slate-400">al marcar ejecuta una prueba B2 rápida</span>}
              </span>
              {attachWorkbenchEvidence && microWorkbench.bundle && (
                <span className="break-all font-mono text-[11px] opacity-80">
                  · tick {microWorkbench.bundle.capture.sourceTick}, digest {microWorkbench.bundle.result.digest.slice(0, 16)}…
                </span>
              )}
            </label>
            {microWorkbench.bundle && microWorkbench.status !== 'running' && microWorkbench.status !== 'capturing' && (
              <button
                type="button"
                onClick={() => {
                  pendingAutoAttachB2Ref.current = attachWorkbenchEvidence;
                  microWorkbench.run({
                    profile: 'paired_intervention',
                    ticks: 12,
                    seed: 11,
                    interventions: ['kaizen_learned_mode']
                  });
                }}
                className="rounded border border-indigo-400/40 px-2 py-0.5 text-[11px] text-indigo-200 hover:bg-indigo-800/40"
              >
                Actualizar B2
              </button>
            )}
          </div>
          {microWorkbench.error && !microWorkbench.bundle && (
            <div role="status" className="mx-3 mt-1 rounded border border-amber-500/40 bg-amber-950/40 px-2.5 py-1 text-[11px] text-amber-200">
              {microWorkbench.error.includes('completed_committed')
                ? 'Inicia la simulación al menos 1 paso (botón «Iniciar simulación») para capturar y ejecutar la copia aislada B2.'
                : microWorkbench.error}
            </div>
          )}
          {geminiSelected && !canUseLlmNow && (
            <div role="status" className="mx-3 mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-500/60 bg-amber-900/40 px-3 py-1.5 text-xs text-amber-100">
              <span>El canal de lenguaje no está disponible (sin sesión ni clave). Las respuestas las compone el motor; configura tu clave en la pestaña API.</span>
              <button type="button" onClick={() => handleTabSelect('api-control')} className="shrink-0 rounded border border-amber-300/50 px-2 py-0.5 text-[11px] text-amber-100 hover:bg-amber-800/50">
                Ir a API
              </button>
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
            {!chatHistory.some((msg) => msg.role === 'user') && (
              <div className="rounded-xl border border-purple-500/35 bg-purple-950/25 p-3 text-xs text-purple-100">
                <p className="mb-2 leading-relaxed text-slate-200">
                  Conversa libremente sobre cualquier tema o pregunta por el estado del motor, su arquitectura y sus límites; cuando cita datos del runtime, cada cifra se verifica contra el paso exacto:
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((text) => (
                    <button
                      key={text}
                      type="button"
                      onClick={() => fillComposer(text)}
                      className="rounded-full border border-purple-400/45 bg-purple-900/40 px-3 py-1 text-xs text-purple-100 transition hover:border-cyan-400/60 hover:bg-purple-800/60"
                    >
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
                  <article className={`min-w-0 max-w-full rounded-xl p-3.5 shadow-md sm:max-w-[92%] ${bubbleClass}`}>
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

        {liveEndogenous && (() => {
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
            <CollapsibleSection
              sectionId="chat-endogenous-panel"
              title="Postura interna determinista (Ejes 1–4 · Independiente del LLM)"
              subtitle="Lectura endógena del núcleo antes de consultar a Gemini; haz clic para ver los 4 ejes y sectores."
              badge={`${liveEndogenous.decision_code} · ${liveEndogenous.overall_score}`}
              defaultOpen={false}
              className="border-emerald-700/40 bg-slate-950/80"
            >
              <section
                data-testid="endogenous-epistemic-decision-panel"
                aria-label="Decisión epistémica endógena del núcleo"
                className={`rounded border bg-gray-950/90 p-3 text-xs ${borderTone}`}
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
            </CollapsibleSection>
          );
        })()}

        <CollapsibleSection
          sectionId="chat-micro-workbench"
          title="Laboratorio de pruebas en copia aislada (Workbench B2)"
          subtitle="Ejecuta micro-experimentos en copia congelada sin tocar la simulación viva y adjúntalos al chat si deseas."
          badge={microWorkbench.bundle ? `listo · tick ${microWorkbench.bundle.capture.sourceTick}` : 'opcional'}
          defaultOpen={false}
          className="border-indigo-700/40 bg-slate-950/80"
        >
          <MicroExperimentWorkbench workbench={microWorkbench}/>
        </CollapsibleSection>
      </section>
    );
  };

  const renderApiCallControl = () => {
    const entropyTelemetry = entropyModeRef.current || {};
    const entropyDiagnostics = quantumEntropyBridgeRef.current.getConnectionDiagnostics?.(Date.now()) || {};
    const selfPatchStatus = selfPatchTelemetry.status || {};
    const codeGenerationStatus = selfPatchStatus.codeGeneration || {};
    const keyInfo = describeGeminiKey(customGeminiKey);
    const geminiFormatText = {
      empty: 'Sin clave propia: si el servidor tiene proxy activo lo usa automáticamente; si no, toda la plataforma sigue funcionando en modo local.',
      auth_key: 'Formato reconocido: clave de Google AI Studio (AQ.…).',
      standard_key: 'Formato reconocido: clave estándar de Gemini (AIza…).',
      unrecognized: 'Formato no reconocido localmente; se intentará enviar igualmente al proveedor.',
      invalid_characters: 'La clave contiene espacios o caracteres no válidos; revisa que la copiaste completa.'
    }[keyInfo.format];
    const geminiRouteText = !canUseLlmNow
      ? 'Solo motor local (sin clave externa)'
      : (frontendGeminiEnabled && hasFrontendGeminiKey ? 'Clave propia directa (navegador → Gemini)' : 'Proxy del servidor (Netlify)');
    const geminiStatusBadge = !canUseLlmNow
      ? { label: 'Modo local (sin clave)', cls: 'border-slate-600 bg-slate-800/80 text-slate-200' }
      : (frontendGeminiEnabled && hasFrontendGeminiKey
        ? { label: 'Conectado · Clave propia', cls: 'border-emerald-400/50 bg-emerald-950/60 text-emerald-200' }
        : { label: 'Conectado · Proxy servidor', cls: 'border-cyan-400/50 bg-cyan-950/60 text-cyan-200' });
    const apiChannelStatusText = timeBasedRateLimit
      ? `Pausa automática (${timeBasedCooldownRemaining}s)`
      : cooldownActive
        ? `Protección activa (${cooldownTimeRemaining}s)`
        : rateLimitExceeded
          ? 'Límite alcanzado'
          : 'Operativa';

    return (
      <div className="space-y-4 rounded-xl border border-blue-500/35 bg-slate-950/85 p-3 sm:p-4 shadow-lg">
        <TabPlainHeader
          tabId="api-control"
          accent="blue"
          icon={<Settings className="h-5 w-5" />}
          title="Conexión de IA (Gemini)"
          technicalTag="API · Un solo lugar para tu clave"
        />

        {/* ALERTAS DE COOLDOWN SOLO SI ESTÁN ACTIVAS */}
        {timeBasedRateLimit ? (
          <div className="rounded-xl border border-orange-500/70 bg-orange-950/50 p-3.5 text-xs">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-bold text-orange-300">Pausa automática anti-saturación ({isInAxionMode ? 'AXION' : 'NORMAL'})</div>
                <p className="mt-0.5 text-orange-200/90">
                  {isInAxionMode ? 'Pausa adaptativa de 3 minutos para estabilidad.' : 'Pausa breve activada para evitar saturar tu cuota de Gemini.'}
                </p>
              </div>
              <div className="text-right font-mono text-2xl font-bold text-white">{timeBasedCooldownRemaining}s</div>
            </div>
          </div>
        ) : null}

        {cooldownActive ? (
          <div className="rounded-xl border border-red-500/70 bg-red-950/50 p-3.5 text-xs">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <div className="font-bold text-red-300">Cooldown de protección activo</div>
                <p className="mt-0.5 text-red-200/90">{cooldownReason}</p>
              </div>
              <div className="font-mono text-2xl font-bold text-white">{cooldownTimeRemaining}s</div>
            </div>
            <button
              onClick={forceResetCooldown}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-red-700"
            >
              Forzar reset de cooldown
            </button>
          </div>
        ) : null}

        {/* TARJETA PRINCIPAL ÚNICA Y DIRECTA: CLAVE DE GEMINI */}
        <div className="rounded-xl border border-cyan-500/45 bg-gradient-to-br from-slate-900/95 via-cyan-950/20 to-slate-900/95 p-4 text-xs shadow-md">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <MetricDualLabel label="Tu clave de Gemini" technical={GEMINI_ENGINE_CONFIG.MODEL_ID} accent="text-cyan-200" />
              <p className="mt-1 text-xs leading-relaxed text-slate-300">
                Una sola clave conecta el <strong>Chat</strong>, el <strong>Supervisor Autónomo</strong> y las propuestas de <strong>Autoevolución</strong>. Se guarda solo en este navegador.
              </p>
            </div>
            <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${geminiStatusBadge.cls}`}>
              {geminiStatusBadge.label}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <input
              type="password"
              value={customGeminiKey}
              onChange={(e) => setCustomGeminiKey(e.target.value)}
              aria-label="Clave de API de Gemini"
              placeholder="Pega aquí tu clave de Gemini (AIza… o AQ.…)"
              className="min-w-0 w-full flex-1 rounded-lg border border-cyan-700/60 bg-slate-950 px-3 py-2.5 font-mono text-xs text-cyan-100 placeholder-slate-500 focus:border-cyan-400 focus:outline-none sm:w-auto sm:min-w-[220px]"
            />
            <button
              type="button"
              onClick={() => setCustomGeminiKey('')}
              className="shrink-0 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:border-red-500/50 hover:bg-red-950/40 hover:text-red-200"
            >
              Limpiar
            </button>
          </div>

          <div className="mt-2.5 space-y-1.5 text-[11px]">
            <p className={keyInfo.usable || keyInfo.format === 'empty' ? 'text-cyan-200/90' : 'text-amber-200'}>{geminiFormatText}</p>
            {!frontendGeminiEnabled && customGeminiKey.trim() && (
              <p className="text-amber-200">Este servidor usa su proxy configurado en lugar de claves pegadas en el navegador.</p>
            )}
            {lastProviderError && (
              <p className="rounded-md border border-amber-500/35 bg-amber-950/35 p-2 break-words text-amber-200">
                Último aviso del proveedor: <span className="font-mono">{String(lastProviderError.code)}{lastProviderError.status ? ` · HTTP ${lastProviderError.status}` : ''}</span>
                {lastProviderError.providerMessage ? ` · ${lastProviderError.providerMessage}` : ''}
                {lastProviderError.recovered ? ' (recuperado automáticamente por el proxy)' : ''}
              </p>
            )}
          </div>

          {/* 3 mini indicadores claros dentro de la misma tarjeta */}
          <div className="mt-3 grid grid-cols-1 gap-2 border-t border-slate-800 pt-3 sm:grid-cols-3 text-[11px]">
            <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-2.5 py-2">
              <div className="text-slate-400">Ruta activa</div>
              <div className="mt-0.5 font-medium text-slate-100">{geminiRouteText}</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-2.5 py-2">
              <div className="text-slate-400">Salud del canal</div>
              <div className={`mt-0.5 font-medium ${timeBasedRateLimit || cooldownActive || rateLimitExceeded ? 'text-amber-300' : 'text-emerald-300'}`}>
                {apiChannelStatusText} · {apiCallMetrics.totalCalls} calls/min
              </div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-2.5 py-2">
              <div className="text-slate-400">Si no hay clave</div>
              <div className="mt-0.5 font-medium text-cyan-200">Respaldo local automático</div>
            </div>
          </div>
        </div>

        {/* OPCIONES AVANZADAS COLAPSADAS POR DEFECTO */}
        <div className="space-y-2">
          <div className="px-1 pt-1 text-[11px] font-medium text-slate-400">
            Opciones avanzadas (opcionales — no necesitas abrirlas para usar Gemini):
          </div>

          {/* CAJÓN 1: CONECTOR ALTERNATIVO DE CÓDIGO (OPCIONAL) */}
          <CollapsibleSection
            sectionId="api-codex-routing"
            title="Proveedor alternativo de código (OpenAI / Codex) · Opcional"
            subtitle="Solo necesario si prefieres generar propuestas en Autoevolución con OpenAI en lugar de Gemini."
            badge={hasFrontendCodexKey ? `Configurado · ${resolvedCodexModel}` : 'Opcional (Gemini por defecto)'}
            defaultOpen={false}
            className="border-slate-700/60 bg-slate-900/70"
          >
            <div className="space-y-3 text-xs">
              <div className="rounded-lg border border-blue-800/40 bg-slate-950/70 p-3 text-[11px] leading-relaxed text-slate-300">
                <strong className="text-cyan-200">No necesitas esto para trabajar con Gemini.</strong>{' '}
                Por defecto, tanto el Chat como el Supervisor Autónomo y las propuestas de Autoevolución usan <strong>Gemini</strong>. Este espacio solo sirve si decides probar un proveedor alternativo de OpenAI/Codex.
              </div>

              <div className="rounded-lg border border-fuchsia-700/35 bg-fuchsia-950/15 p-3">
                <div className="mb-2 font-semibold text-fuchsia-200">Clave alternativa OpenAI / Codex (opcional)</div>
                <input
                  type="password"
                  value={customCodexKey}
                  onChange={(e) => setCustomCodexKey(e.target.value)}
                  placeholder="Solo si usas OpenAI/Codex (sk-...)"
                  className="w-full rounded border border-slate-700 bg-slate-950 p-2 font-mono text-xs text-fuchsia-200"
                />
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-4">
                  <input
                    type="text"
                    value={customCodexModel}
                    onChange={(e) => setCustomCodexModel(e.target.value)}
                    placeholder="Modelo alternativo"
                    className="rounded border border-slate-700 bg-slate-950 p-2 font-mono text-xs text-fuchsia-200 sm:col-span-2"
                  />
                  <select
                    value={resolvedCodexReasoningEffort}
                    onChange={(e) => setCustomCodexReasoningEffort(e.target.value)}
                    className="rounded border border-slate-700 bg-slate-950 p-2 font-mono text-xs text-fuchsia-200"
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
                    className="rounded border border-red-700/70 bg-red-950/40 px-2 py-1 text-red-200 hover:bg-red-900/50"
                  >
                    Limpiar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-2">
                <div className="rounded border border-slate-700/70 bg-slate-950/70 p-2"><span className="text-slate-400">Clave Gemini en navegador:</span> {runtimeEnv.FRONTEND_GEMINI_ALLOWED ? 'permitida' : 'solo proxy'}</div>
                <div className="rounded border border-slate-700/70 bg-slate-950/70 p-2"><span className="text-slate-400">Sesión / Auth:</span> {runtimeEnv.AUTH_REQUIRED ? 'requerida' : 'libre'} · {isAuthenticated ? 'activa' : 'inactiva'}</div>
                <div className="rounded border border-slate-700/70 bg-slate-950/70 p-2"><span className="text-slate-400">Endpoint proxy:</span> <span className="font-mono">{runtimeEnv.LLM_PROXY_ENDPOINT}</span></div>
                <div className="rounded border border-slate-700/70 bg-slate-950/70 p-2"><span className="text-slate-400">Motor activo de Autoevolución:</span> <span className="font-mono text-cyan-200">{selfPatchEngineChoice === 'openai' ? `openai:${resolvedCodexModel}` : `gemini:${GEMINI_ENGINE_CONFIG.MODEL_ID}`}</span></div>
                <div className="rounded border border-slate-700/70 bg-slate-950/70 p-2 sm:col-span-2">
                  <span className="text-slate-400">Configuración chat:</span>{' '}
                  <span className="font-mono text-slate-200">
                    {chatRealizationMode !== 'local' ? 'Sistema B unificado' : 'solo motor'} · integridad {integrityMode} · {CHAT_MAX_OUTPUT_TOKENS} tokens · thinking {CHAT_THINKING_LEVEL} · backend allowClientCodexKey={String(typeof codeGenerationStatus.allowClientCodexKey === 'boolean' ? codeGenerationStatus.allowClientCodexKey : runtimeEnv.ALLOW_CLIENT_CODEX_KEY)}
                  </span>
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* CAJÓN 2: ENTROPÍA CUÁNTICA (conserva título literal para test v4.9) */}
          <CollapsibleSection
            sectionId="api-quantum-entropy"
            title="Entropía Cuántica (Híbrido UI + Bridge)"
            subtitle="Fuente externa opcional de aleatoriedad cuántica (por defecto usa generador determinista local)."
            badge={`${quantumUiConfig.enabled ? 'Activado' : 'Local'} · ${quantumUiStatus.connectionState}`}
            defaultOpen={false}
            className="border-slate-700/60 bg-slate-900/70"
          >
          <div className="space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className={`rounded px-2 py-0.5 ${entropyTelemetry.mode === 'quantum_primary' ? 'bg-emerald-700/70 text-emerald-100' : entropyTelemetry.mode === 'quantum_stale' ? 'bg-amber-700/70 text-amber-100' : 'bg-slate-700/70 text-slate-100'}`}>
                  {entropyTelemetry.mode || 'deterministic_fallback'}
                </span>
                <span className={`rounded px-2 py-0.5 ${quantumUiStatus.connectionState === 'ok' ? 'bg-cyan-700/70 text-cyan-100' : quantumUiStatus.connectionState === 'testing' ? 'bg-indigo-700/70 text-indigo-100' : quantumUiStatus.connectionState === 'pending' ? 'bg-amber-700/70 text-amber-100' : 'bg-rose-700/70 text-rose-100'}`}>
                  {quantumUiStatus.connectionState}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setQuantumUiConfig((prev) => ({ ...prev, enabled: !prev.enabled }));
                    appendIntegrityAudit('quantum_ui_config_change', { field: 'enabled', value: !quantumUiConfig.enabled });
                  }}
                  className={`rounded px-3 py-1 text-xs font-semibold ${quantumUiConfig.enabled ? 'bg-emerald-700/60 text-emerald-100' : 'bg-slate-700/70 text-slate-100'}`}
                >
                  {quantumUiConfig.enabled ? 'Canal cuántico ON' : 'Canal cuántico OFF'}
                </button>
                <button
                  type="button"
                  onClick={runQuantumConnectionTest}
                  disabled={quantumUiStatus.connectionState === 'testing'}
                  className="rounded bg-fuchsia-700/60 px-3 py-1 text-xs font-semibold text-fuchsia-100 hover:bg-fuchsia-600/70 disabled:opacity-60"
                >
                  {quantumUiStatus.connectionState === 'testing' ? 'Probando...' : 'Probar conexión'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-fuchsia-200">Modo</label>
                <select
                  value={quantumUiConfig.mode}
                  onChange={(e) => {
                    const nextMode = e.target.value;
                    setQuantumUiConfig((prev) => ({ ...prev, mode: nextMode }));
                    appendIntegrityAudit('quantum_ui_config_change', { field: 'mode', value: nextMode });
                  }}
                  className="w-full rounded border border-fuchsia-700/60 bg-slate-950 p-2 text-fuchsia-100"
                >
                  <option value="auto_hybrid">auto_hybrid</option>
                  <option value="bridge">bridge</option>
                  <option value="ui_direct">ui_direct</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-fuchsia-200">Provider</label>
                <select
                  value={quantumUiConfig.provider}
                  onChange={(e) => {
                    const nextProvider = e.target.value;
                    setQuantumUiConfig((prev) => ({ ...prev, provider: nextProvider }));
                    appendIntegrityAudit('quantum_ui_config_change', { field: 'provider', value: nextProvider });
                  }}
                  className="w-full rounded border border-fuchsia-700/60 bg-slate-950 p-2 text-fuchsia-100"
                >
                  <option value="custom">custom</option>
                  <option value="ibm">ibm</option>
                  <option value="braket">braket</option>
                  <option value="anu_qrng">anu_qrng</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-fuchsia-200">Endpoint</label>
                <input
                  type="text"
                  value={quantumUiConfig.endpoint}
                  onChange={(e) => setQuantumUiConfig((prev) => ({ ...prev, endpoint: e.target.value }))}
                  onBlur={() => appendIntegrityAudit('quantum_ui_config_change', { field: 'endpoint', value: quantumUiConfig.endpoint })}
                  className="w-full rounded border border-fuchsia-700/60 bg-slate-950 p-2 font-mono text-fuchsia-100"
                  placeholder="/.netlify/functions/quantum-entropy"
                />
              </div>
              <div>
                <label className="mb-1 block text-fuchsia-200">TTL (ms)</label>
                <input
                  type="number"
                  min={1000}
                  value={quantumUiConfig.ttlMs}
                  onChange={(e) => setQuantumUiConfig((prev) => ({ ...prev, ttlMs: Math.max(1000, Number(e.target.value) || prev.ttlMs) }))}
                  className="w-full rounded border border-fuchsia-700/60 bg-slate-950 p-2 font-mono text-fuchsia-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-fuchsia-200">Poll (ms)</label>
                <input
                  type="number"
                  min={1000}
                  value={quantumUiConfig.pollMs}
                  onChange={(e) => setQuantumUiConfig((prev) => ({ ...prev, pollMs: Math.max(1000, Number(e.target.value) || prev.pollMs) }))}
                  className="w-full rounded border border-fuchsia-700/60 bg-slate-950 p-2 font-mono text-fuchsia-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-fuchsia-200">qualityMin (0..1)</label>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.01}
                  value={quantumUiConfig.qualityMin}
                  onChange={(e) => setQuantumUiConfig((prev) => ({ ...prev, qualityMin: clamp01(e.target.value) }))}
                  className="w-full rounded border border-fuchsia-700/60 bg-slate-950 p-2 font-mono text-fuchsia-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-fuchsia-200">Key (opcional)</label>
                <input
                  type="password"
                  value={quantumUiConfig.apiKeyRef}
                  onChange={(e) => setQuantumUiConfig((prev) => ({ ...prev, apiKeyRef: e.target.value }))}
                  className="w-full rounded border border-fuchsia-700/60 bg-slate-950 p-2 font-mono text-fuchsia-100"
                  placeholder="x-api-key"
                />
              </div>
            </div>
            <div className="font-mono text-[10px] text-fuchsia-200/80 break-all">
              sampleAge: {Number.isFinite(entropyTelemetry.sampleAgeMs) ? `${Math.round(entropyTelemetry.sampleAgeMs)}ms` : 'n/a'} | reason: {quantumUiStatus.lastReason || entropyTelemetry.reason || 'n/a'} | channel={entropyDiagnostics.channelHealth?.status || entropyTelemetry.channelHealth?.status || 'unknown'} | job={quantumUiStatus.lastJobId || entropyTelemetry.jobId || 'n/a'} | source={entropyTelemetry.source || 'deterministic_local'}
            </div>
          </div>
        </CollapsibleSection>

        {/* CAJÓN 3: LÍMITES DE USO, COOLDOWN Y MÉTRICAS */}
        <CollapsibleSection
          sectionId="api-rate-limit-metrics"
          title="Protección anti-saturación y métricas de red"
          subtitle="Latencia promedio, llamadas recientes y pausas automáticas para cuidar tu cuota."
          badge={intelligentModeEnabled ? 'Protección ON' : 'Protección OFF'}
          defaultOpen={false}
          className="border-slate-700/60 bg-slate-900/70"
        >
          <div className="grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
            <div className="space-y-1.5 rounded-lg border border-blue-800/40 bg-slate-950/70 p-3">
              <div className="font-semibold text-blue-300">Métricas recientes (1 min)</div>
              <div className="flex justify-between"><span className="text-slate-400">Total:</span><span className="font-mono text-white">{apiCallMetrics.totalCalls}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Exitosas:</span><span className="font-mono text-emerald-300">{apiCallMetrics.successfulCalls}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Fallidas:</span><span className="font-mono text-rose-300">{apiCallMetrics.failedCalls}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Latencia media:</span><span className="font-mono text-white">{apiCallMetrics.avgLatency}ms</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Última llamada:</span><span className="font-mono text-white">{lastApiCall > 0 ? `${Math.floor((Date.now() - lastApiCall) / 1000)}s` : 'Nunca'}</span></div>
            </div>
            <div className="space-y-1.5 rounded-lg border border-purple-800/40 bg-slate-950/70 p-3">
              <div className="font-semibold text-purple-300">Patrones e intervalos</div>
              <div className="flex justify-between"><span className="text-slate-400">Llamadas (5 min):</span><span className={`font-mono ${apiCallPattern.excessiveUsage ? 'text-rose-400' : 'text-white'}`}>{apiCallPattern.recentCalls}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Modo Axiomático:</span><span className={`font-semibold ${isInAxionMode ? 'text-amber-300' : 'text-slate-400'}`}>{isInAxionMode ? 'Detectado' : 'Inactivo'}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Patrón:</span><span className={`font-semibold ${apiCallPattern.excessiveUsage ? 'text-rose-400' : 'text-emerald-300'}`}>{apiCallPattern.excessiveUsage ? 'Uso excesivo' : 'Normal'}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Intervalo normal / axiomático:</span><span className="font-mono text-amber-300">120s / 180s</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Ventana de detección:</span><span className="font-mono text-emerald-300">5–10 min</span></div>
            </div>
          </div>
        </CollapsibleSection>
        </div>
      </div>
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
      <div className="self-start rounded-xl border border-yellow-500/25 bg-gray-900/80 p-3 shadow-sm">
        <DetailToggleStrip
          sectionId="sidebar-sovereignty-matrix"
          accent="slate"
          defaultOpen={false}
          summary={(
            <div>
              <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase leading-tight text-yellow-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                Niveles de estabilidad interna (L1–L4)
              </h3>
              <div className="mt-1.5 flex flex-wrap gap-1 font-mono text-[10px]">
                {levels.map((lvl) => {
                  const status = lvl.rich?.status || (lvl.legacyStatus ? 'instantaneous' : 'off');
                  const isStable = status === 'stable';
                  const isCandidate = status === 'candidate' || status === 'instantaneous';
                  const chipCls = isStable
                    ? 'border-emerald-400/50 bg-emerald-950/60 text-emerald-200'
                    : isCandidate
                      ? 'border-yellow-400/50 bg-yellow-950/60 text-yellow-200'
                      : 'border-slate-700 bg-slate-900 text-slate-400';
                  return (
                    <span key={lvl.id} className={`rounded border px-1.5 py-0.5 ${chipCls}`}>
                      {lvl.id}: {Math.round(lvl.score * 100)}%
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        >
          <div className="space-y-2">
            <div className="text-[10px] text-slate-400">
              Matriz de requisitos operacionales (diagnostico interno · no certifica conciencia).
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {levels.map((lvl) => {
                const rich = lvl.rich || {};
                const status = rich.status || (lvl.legacyStatus ? 'instantaneous' : 'off');
                const isStable = status === 'stable';
                const isCandidate = status === 'candidate' || status === 'instantaneous';
                const borderClass = isStable
                  ? 'bg-emerald-500/10 border-emerald-400/50'
                  : isCandidate
                    ? 'bg-yellow-500/10 border-yellow-500/50'
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
            <div className="text-[9px] leading-tight text-cyan-300/80 border-t border-cyan-700/30 pt-1.5">
              Los flags legacy son cruces instantaneos. La UI usa estado off/provisional/estable con dwell-time, histeresis y limites epistemicos.
            </div>
            {lastSaveTime && (<div className="text-[9px] text-yellow-500 font-mono text-right border-t border-yellow-500/10 pt-1 italic">Ultima persistencia: {lastSaveTime} (Omega-Sync)</div>)}
          </div>
        </DetailToggleStrip>
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

    const regimePlainLabel = regimeState === 'shock_recovery'
      ? 'Recuperándose de un cambio brusco'
      : regimeState === 'stasis_watch'
        ? 'Vigila posible estancamiento'
        : 'Estable y en marcha';

    return (
      <div className="space-y-4 rounded-xl border border-purple-500/30 bg-gradient-to-br from-slate-950/90 via-purple-950/25 to-slate-950/90 p-3 sm:p-4 shadow-lg">
        <TabPlainHeader
          tabId="core"
          accent="purple"
          icon={<Brain className="h-5 w-5" />}
          title="Motor Central"
          technicalTag="Núcleo Ontológico - Capa 1"
          actions={(
            <InfoModal
              title="Motor Central - Consola de telemetría interna"
              content={`MOTOR CENTRAL - CONSOLA DE TELEMETRÍA INTERNA (sin claims externos)

Consola supervisada QICN: resume la salud del motor en 3 señales simples y agrupa debajo 7 paneles técnicos explicados en lenguaje cotidiano. No demuestra conciencia, sujeto ni fenomenalidad.

1. LECTURA ACTUAL DEL NÚCLEO: frase generada por umbrales internos; no implementa un 'Yo'.
2. PMIA (IMPULSO DE AJUSTE): positivo = consolidación estable; negativo = reorganización activa.
3. PROTOCOLO DE FRICCIÓN ONTOLÓGICA: impulso controlado para sacar a la red de estancamiento.
4. BANDAS OPERATIVAS DE CCC: PRE-UMBRAL (< 1.0) y POST-UMBRAL (>= 1.0).`}
            >
              <span className="flex h-6 w-6 cursor-help items-center justify-center rounded-full bg-purple-500/80 text-xs font-bold text-white">?</span>
            </InfoModal>
          )}
        />

        {/* Resumen principal limpio: 3 indicadores comprensibles (público casual + auditoría) */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className={`rounded-xl border p-3.5 ${dynamicHealth.isStalled ? 'border-amber-400/40 bg-amber-950/30' : 'border-emerald-400/30 bg-emerald-950/25'}`}>
            <MetricDualLabel
              casual={dynamicHealth.isStalled ? 'Estancamiento detectado' : 'Dinámica Activa'}
              technical="stasisIndex"
            />
            <div className="mt-1.5 font-mono text-xl font-bold text-white">
              {dynamicHealth.stasisIndex.toFixed(3)}
            </div>
            <div className="mt-1 text-[11px] leading-snug text-slate-300">
              {dynamicHealth.isStalled
                ? 'La variación bajó demasiado; el motor prioriza reactivarse.'
                : 'Cerca de 0 significa movimiento saludable sin quedarse congelado.'}
            </div>
          </div>

          <div className="rounded-xl border border-purple-500/30 bg-slate-900/75 p-3.5">
            <MetricDualLabel casual="Impulso de ajuste" technical="PMIA" />
            <div className="mt-1.5 flex items-center gap-3">
              <div className="relative h-2.5 flex-1 rounded-full bg-slate-800">
                <div
                  className="absolute top-0 h-2.5 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.abs(pmia) * 50}%`,
                    left: pmia > 0 ? '50%' : `${50 - Math.abs(pmia) * 50}%`,
                    backgroundColor: pmia > 0 ? '#10b981' : '#ef4444'
                  }}
                />
              </div>
              <span className="font-mono text-base font-bold text-purple-200">{pmia.toFixed(4)}</span>
            </div>
            <div className="mt-1 text-[11px] leading-snug text-slate-300">
              {pmia > 0
                ? 'Verde (positivo): consolida estabilidad actual.'
                : 'Rojo (negativo): reorganiza la red activamente.'}
            </div>
          </div>

          <div className="rounded-xl border border-cyan-500/30 bg-slate-900/75 p-3.5">
            <MetricDualLabel casual="Estado del régimen" technical="Régimen Post-Umbral" />
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
              <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${regimeState === 'shock_recovery' ? 'bg-amber-700/50 text-amber-100' : regimeState === 'stasis_watch' ? 'bg-orange-700/50 text-orange-100' : 'bg-emerald-700/50 text-emerald-100'}`}>
                {regimePlainLabel}
              </span>
              <span className="font-mono text-[11px] text-cyan-200">CLASE {ontologicalState.phenomenology_class}</span>
            </div>
            <div className="mt-1 font-mono text-[11px] text-slate-400">
              Banda {consciousnessLevel} · Ω {ontologicalState.omega?.toFixed(3) || '0.000'}
            </div>
          </div>
        </div>

        {/* Lectura interna del historial */}
        <div className={`rounded-xl border p-3.5 ${isAscended ? 'border-yellow-500/50 bg-yellow-950/25' : 'border-purple-500/25 bg-slate-900/70'}`}>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <MetricDualLabel casual="Lectura actual del núcleo" technical="Resumen automático del paso" />
            <span className="font-mono text-[11px] text-purple-300">
              Coherencia interna: {(ontologicalCore.current.getNarrativeCoherence() * 100).toFixed(1)}%
            </span>
          </div>
          <p className={`mt-2 text-sm italic leading-relaxed ${isAscended ? 'font-bold text-yellow-200' : 'text-purple-100'}`}>
            &ldquo;{narrative}&rdquo;
          </p>
          <DetailToggleStrip
            className="mt-2.5"
            accent="purple"
            summary={<span className="text-[11px] text-slate-400">Nota: frase generada por reglas internas sobre los números del motor (no es un «yo» real).</span>}
          >
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3 sm:gap-2 font-mono text-[11px] text-slate-300">
              <div>CCC_rms: {dynamicHealth.cccDeltaRms.toFixed(5)}</div>
              <div>PMIA_rms: {dynamicHealth.pmiaDeltaRms.toFixed(5)}</div>
              <div>Ω_rms: {dynamicHealth.omegaDeltaRms.toFixed(5)}</div>
            </div>
          </DetailToggleStrip>
        </div>

        {/* Secciones técnicas profundas colapsadas por defecto, cada una explicada en palabras simples */}
        <div className="space-y-1.5">
          <div className="px-1 pt-1 text-[11px] text-slate-400">
            Abre cualquier panel para ver primero qué mide en lenguaje cotidiano y luego sus números exactos:
          </div>

          <CollapsibleSection
            sectionId="core-phenomenology-structural"
            title="Autonomía, cohesión y ritmo de recuperación · Fenomenología Estructural"
            subtitle="Mide cuánto se guía la red por sí misma (beth_q), qué tan integrada trabaja (Ω) y qué tan rápido recupera el equilibrio."
            badge={`beth_q=${ontologicalState.beth_q?.toFixed(3) || '0.000'} · CLASE ${ontologicalState.phenomenology_class}`}
            accent="cyan"
            defaultOpen={false}
          >
            <div className="mb-3 rounded-lg border border-cyan-500/20 bg-cyan-950/20 p-2.5 text-[11px] leading-relaxed text-slate-200">
              <strong className="text-cyan-200">Cómo leer este panel:</strong>{' '}
              <strong>Cierre Causal (beth_q &gt; 0.5)</strong> indica que la red depende más de su propia dinámica que del ruido;{' '}
              <strong>Integrador (Ω &gt; 1.0)</strong> indica que los nodos trabajan como un todo coordinado;{' '}
              <strong>Gap Espectral (λ)</strong> y <strong>Relajación</strong> muestran qué tan rápido absorbe sacudidas sin romperse.
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="p-2.5 rounded-lg bg-gray-800/50 border border-gray-700">
                <div className="text-[10px] text-gray-300 uppercase tracking-wider mb-1">Autonomía interna · Cierre Causal (beth_q)</div>
                <div className="text-lg font-mono text-white flex justify-between items-end">
                  {ontologicalState.beth_q?.toFixed(4) || '0.0000'}
                  <span className={`w-2 h-2 rounded-full ${ontologicalState.beth_q > 0.5 ? 'bg-teal-400' : 'bg-red-400'}`}></span>
                </div>
                <div className="mt-0.5 text-[10px] text-slate-400">{ontologicalState.beth_q > 0.5 ? 'Autónoma (> 0.50)' : 'Dependiente de entrada'}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-gray-800/50 border border-gray-700">
                <div className="text-[10px] text-gray-300 uppercase tracking-wider mb-1">Firmeza ante cambios · Gap Espectral (λ)</div>
                <div className="text-lg font-mono text-white flex justify-between items-end">
                  {ontologicalState.spectral_gap?.toFixed(4) || '0.0000'}
                  <span className={`w-2 h-2 rounded-full ${ontologicalState.spectral_gap > 0.4 ? 'bg-cyan-400' : 'bg-orange-400'}`}></span>
                </div>
                <div className="mt-0.5 text-[10px] text-slate-400">{ontologicalState.spectral_gap > 0.4 ? 'Estabilidad firme' : 'Transición flexible'}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-gray-800/50 border border-gray-700">
                <div className="text-[10px] text-gray-300 uppercase tracking-wider mb-1">Integración global · Integrador (Ω)</div>
                <div className="text-lg font-mono text-white flex justify-between items-end">
                  {ontologicalState.omega?.toFixed(4) || '0.0000'}
                  <span className={`w-2 h-2 rounded-full ${ontologicalState.omega > 1.0 ? 'bg-purple-400' : 'bg-gray-600'}`}></span>
                </div>
                <div className="mt-0.5 text-[10px] text-slate-400">{ontologicalState.omega > 1.0 ? 'Integrada (> 1.00)' : 'Por debajo de 1.00'}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-gray-800/50 border border-gray-700">
                <div className="text-[10px] text-gray-300 uppercase tracking-wider mb-1">Tiempo de calma · Relajación</div>
                <div className="text-lg font-mono text-white">
                  {ontologicalState.relaxation_time?.toFixed(2) || '0.00'}ms
                </div>
                <div className="mt-0.5 text-[10px] text-slate-400">Cuánto tarda en volver al equilibrio</div>
              </div>
            </div>
            <div className="flex gap-2 text-[10px] font-mono">
              <div className={`flex-1 p-1.5 rounded border text-center ${ontologicalState.holonomy_status === 'non_trivial' ? 'bg-teal-900/40 border-teal-500/50 text-teal-300' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>
                TOPOLOGÍA: {ontologicalState.holonomy_status?.toUpperCase()}
              </div>
              <div className={`flex-1 p-1.5 rounded border text-center ${ontologicalState.bifurcation_detected ? 'bg-red-900/40 border-red-500/50 text-red-300' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>
                BIFURCACIÓN: {ontologicalState.bifurcation_detected ? 'DETECTADA' : 'NINGUNA (NONE)'}
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            sectionId="core-metacognition-sigma"
            title="Qué tan bien se predice a sí mismo · Metacognición Sistémica"
            subtitle="Compara lo que el modelo interno (Σ) esperaba que pasara frente a lo que realmente ocurrió en el siguiente paso."
            badge={`Σ=${(ontologicalCore.current.metacognitiveStats['selfModelSigma']?.structuralStability * 100 || 100).toFixed(1)}%`}
            accent="purple"
            defaultOpen={false}
          >
            <div className="space-y-3">
              <div className="rounded-lg border border-purple-500/20 bg-purple-950/20 p-2.5 text-[11px] leading-relaxed text-slate-200">
                <strong className="text-purple-200">Cómo leer este panel:</strong>{' '}
                El motor lleva un pequeño pronóstico de sí mismo (<strong>Auto-Modelo Σ</strong>). Si la barra está cerca de <strong>100%</strong> y el <strong>Error de predicción (E_Σ)</strong> está cerca de 0, el sistema se entiende bien; si sube el error, frena cambios bruscos.
              </div>
              {ontologicalCore.current.isHolographicShieldActive() && (
                <div className="inline-block rounded bg-blue-500 px-2 py-0.5 text-[10px] font-bold text-white">
                  ESCUDO ESTABILIZADOR ACTIVO
                </div>
              )}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-gray-300">
                  <span className="uppercase tracking-wider">Estabilidad Estructural (Auto-Modelo Σ)</span>
                  <span className="font-mono text-purple-300">{(ontologicalCore.current.metacognitiveStats['selfModelSigma']?.structuralStability * 100 || 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-500 via-purple-500 to-blue-400 transition-all duration-1000"
                    style={{ width: `${(ontologicalCore.current.metacognitiveStats['selfModelSigma']?.structuralStability > 0.9 && ontologicalCore.current.ontologicalState.coherence >= 1.0 ? 1 : (ontologicalCore.current.metacognitiveStats['selfModelSigma']?.structuralStability || 1)) * 100}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2 rounded bg-gray-800/50 border border-gray-700">
                  <div className="text-[9px] text-gray-400 uppercase mb-1">Freno de cambio (Plasticidad)</div>
                  <div className="text-sm font-mono text-orange-400">+{(ontologicalCore.current.metacognitiveStats.plasticityPenalty * 100).toFixed(0)}%</div>
                </div>
                <div className="p-2 rounded bg-gray-800/50 border border-gray-700">
                  <div className="text-[9px] text-gray-400 uppercase mb-1">Auto-chequeos (SΣ Logs)</div>
                  <div className="text-sm font-mono text-white">{ontologicalCore.current.metacognitiveStats['selfModelSigma']?.selfAuditLog.length || 0}</div>
                </div>
                <div className="p-2 rounded bg-gray-800/50 border border-gray-700">
                  <div className="text-[9px] text-gray-400 uppercase mb-1">Error predicción (E_Σ)</div>
                  <div className={`text-sm font-mono ${ontologicalCore.current.metacognitiveStats['selfModelSigma']?.predictionError > 0.3 ? 'text-red-400' : 'text-green-400'}`}>
                    {ontologicalCore.current.metacognitiveStats['selfModelSigma']?.predictionError?.toFixed(4) || '0.0000'}
                  </div>
                </div>
                <div className="p-2 rounded bg-gray-800/50 border border-gray-700">
                  <div className="text-[9px] text-gray-400 uppercase mb-1">Giro topológico (w)</div>
                  <div className="text-sm font-mono text-cyan-400">{ontologicalState.holonomy_winding?.toFixed(3) || '0.000'}</div>
                </div>
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            sectionId="core-operational-subjectivity"
            title="Pruebas de continuidad · Subjetividad operacional (L_op y Sub_fp)"
            subtitle="Lista de verificación interna que comprueba si el sistema mantiene estructura y consistencia sin colapsar."
            badge={`L_op ${lifeCertificate.pass ? 'PASS' : 'OBS'} · Sub_fp ${firstPersonCertificate.pass ? 'PASS' : 'OBS'}`}
            accent="fuchsia"
            defaultOpen={false}
          >
            <div className="mb-3 rounded-lg border border-fuchsia-500/20 bg-fuchsia-950/20 p-2.5 text-[11px] leading-relaxed text-slate-200">
              <strong className="text-fuchsia-200">Cómo leer este panel:</strong>{' '}
              Cada porcentaje mide una condición técnica de continuidad interna (inspirada en los Papers 7–8 del marco). <strong>PASS</strong> significa que cumple el umbral interno del simulador; <strong>OBS</strong> indica observación en curso. No certifica vida ni experiencia consciente.
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
            <div className="mt-2.5 text-[10px] text-fuchsia-200/70 border-t border-fuchsia-500/10 pt-2">
              {firstPersonCertificate.interpretation_boundary}
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            sectionId="core-pmia-regime"
            title="Por qué se ajusta el motor · PMIA Diagnostics y Régimen Post-Umbral"
            subtitle="Desglosa qué fuerzas están empujando al motor a consolidar o a reorganizarse en este instante."
            badge={`PMIA=${pmia.toFixed(3)} · ${regimeState}`}
            accent="indigo"
            defaultOpen={false}
          >
            <div className="space-y-3">
              <div className="rounded-lg border border-indigo-500/20 bg-indigo-950/20 p-2.5 text-[11px] leading-relaxed text-slate-200">
                <strong className="text-indigo-200">Cómo leer este panel:</strong>{' '}
                Arriba ves el «carril» de seguridad (<strong>Banda</strong>) donde oscila CCC para mantenerse vivo sin estancarse. Abajo ves las piezas exactas que suman el valor de <strong>PMIA</strong> (gradiente, coherencia, energía, sensores y pulsos anti-estasis).
              </div>
              <div className="rounded-lg border border-cyan-500/25 bg-cyan-950/20 p-2.5">
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-cyan-300">Régimen Post-Umbral (carril operativo)</div>
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
              <div className="rounded-lg border border-indigo-500/25 bg-indigo-950/20 p-2.5">
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-indigo-300">PMIA Diagnostics (componentes)</div>
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
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            sectionId="core-strain-quantum-sandbox"
            title="Estrés del sistema, aleatoriedad y frenos · Metacognitive Strain · Quantum Entropy · Autonomy Sandbox"
            subtitle="Revisa si hay sobrecarga por latencia, de dónde sale la semilla aleatoria y qué frenos de seguridad están activos."
            badge={`estrés=${strainTelemetry.stressState} · ${entropyTelemetry.mode}`}
            accent="rose"
            defaultOpen={false}
          >
            <div className="space-y-3">
              <div className="rounded-lg border border-rose-500/20 bg-rose-950/20 p-2.5 text-[11px] leading-relaxed text-slate-200">
                <strong className="text-rose-200">Cómo leer este panel:</strong>{' '}
                Tres vigilantes en paralelo: <strong>Estrés operativo (Metacognitive Strain)</strong> mide lentitud o fallos de red; <strong>Entropía (Quantum Entropy)</strong> indica si usa un generador local determinista o un puente cuántico externo; <strong>Caja de seguridad (Autonomy Sandbox)</strong> limita cuántas acciones automáticas se permiten por hora.
              </div>
              <div className="rounded-lg border border-rose-500/25 bg-rose-950/20 p-2.5">
                <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-rose-200">
                  <span>Metacognitive Strain (tensión y latencia)</span>
                  <span className="font-mono">{strainTelemetry.stressState}</span>
                </div>
                <div className="mt-1.5 grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] font-mono text-rose-100">
                  <div>strain: {toFiniteNumber(strainTelemetry.strain, 0).toFixed(4)}</div>
                  <div>p95 latency: {toFiniteNumber(strainTelemetry.p95Ms, 0).toFixed(1)}ms</div>
                  <div>failure rate: {(toFiniteNumber(strainTelemetry.failureRate, 0) * 100).toFixed(1)}%</div>
                  <div>cooldown: {strainTelemetry.cooldownActive ? 'on' : 'off'}</div>
                  <div>internal pressure: {toFiniteNumber(internalPressureTelemetry.pressure, 0).toFixed(4)}</div>
                  <div>pressure state: {internalPressureTelemetry.state || 'idle'}</div>
                  <div>real stasis: {internalPressureTelemetry.realStasis ? 'yes' : 'no'}</div>
                </div>
              </div>

              <div className="rounded-lg border border-fuchsia-500/25 bg-fuchsia-950/20 p-2.5">
                <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-fuchsia-200">
                  <span>Quantum Entropy (fuente de aleatoriedad)</span>
                  <span className="font-mono">{entropyTelemetry.mode}</span>
                </div>
                <div className="mt-1.5 grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] font-mono text-fuchsia-100">
                  <div>source: {entropyTelemetry.source || 'deterministic_local'}</div>
                  <div>sample age: {Number.isFinite(entropyTelemetry.sampleAgeMs) ? `${Math.round(entropyTelemetry.sampleAgeMs)}ms` : 'n/a'}</div>
                  <div>entropy: {toFiniteNumber(entropyTelemetry.entropyValue, 0.5).toFixed(4)}</div>
                  <div>channel: {entropyTelemetry.channelHealth?.status || 'unknown'}</div>
                  <div>job: {entropyTelemetry.jobId || 'n/a'}</div>
                  <div>reason: {entropyTelemetry.reason || 'n/a'}</div>
                </div>
              </div>

              <div className="rounded-lg border border-sky-500/25 bg-sky-950/20 p-2.5">
                <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-sky-200">
                  <span>Autonomy Sandbox (límite de acciones)</span>
                  <span className="font-mono">{sandboxPolicy?.enabled ? 'enabled' : 'disabled'}</span>
                </div>
                <div className="mt-1.5 grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] font-mono text-sky-100">
                  <div>last action: {sandboxLastAction}</div>
                  <div>actions/hour: {sandboxActionsLastHour}</div>
                  <div>rollbacks: {sandboxRollbackCount}</div>
                  <div>cooldown: {Math.round(toFiniteNumber(sandboxPolicy?.cooldownBetweenActionsMs, 0) / 1000)}s</div>
                </div>
                <div className="mt-1.5 text-[10px] text-sky-200/80 break-all">reason: {sandboxLastReason}</div>
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            sectionId="core-friction-protocol"
            title="Sacudida anti-estancamiento · Protocolo de Fricción Ontológica"
            subtitle="Introduce una perturbación controlada cuando la red se queda demasiado plana, para ayudarla a reorganizarse."
            badge={ontologicalCore.current.frictionProtocolState === 2 ? 'ACTIVA' : 'INACTIVA'}
            accent="amber"
            defaultOpen={false}
          >
            <div className="space-y-2.5">
              <div className="rounded-lg border border-amber-500/20 bg-amber-950/20 p-2.5 text-[11px] leading-relaxed text-slate-200">
                <strong className="text-amber-200">Cómo funciona:</strong>{' '}
                Si la simulación se estanca, este protocolo aplica una «fricción» temporal (como agitar un recipiente para reordenar sus piezas) y luego consolida el nuevo equilibrio. Puedes probarlo manualmente aquí.
              </div>
              <div
                className={`w-full py-2 rounded-lg font-semibold text-center text-sm ${ontologicalCore.current.frictionProtocolState === 2
                  ? 'bg-red-600/70 text-white animate-pulse'
                  : ontologicalCore.current.frictionProtocolState === 3
                    ? 'bg-green-600/70 text-white'
                    : 'bg-gray-700/50 text-gray-300'
                  }`}
              >
                {frictionProtocolStatus}
              </div>
              <div className="text-xs text-gray-400 flex justify-between">
                <span>Estado: <span className="font-mono text-purple-300">{ontologicalCore.current.frictionProtocolState === 2 ? 'ACTIVA' : 'INACTIVA'}</span></span>
                <span>Ciclos restantes: <strong>{frictionCounter}</strong></span>
              </div>
              <div className="text-[11px] text-gray-300 bg-gray-900/40 rounded px-2 py-1 font-mono">
                Auto (policy): {ontologicalAutoPolicyRef.current.enabled && ontologicalAutoPolicyRef.current.frictionAuto ? 'ON' : 'OFF'} | Axiom/h: {autoAxiomCount} | Report/h: {autoReportCount}
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => handleFrictionProtocol('start')} disabled={ontologicalCore.current.frictionProtocolState === 2 || isAscended} className="flex-1 px-2 py-1.5 rounded bg-red-800/80 hover:bg-red-700 text-xs text-white">
                  Iniciar sacudida
                </button>
                <button onClick={() => handleFrictionProtocol('finalize')} disabled={ontologicalCore.current.frictionProtocolState !== 2 || isAscended} className="flex-1 px-2 py-1.5 rounded bg-green-800/80 hover:bg-green-700 text-xs text-white">
                  Consolidar síntesis
                </button>
                <button onClick={() => handleFrictionProtocol('reset')} disabled={ontologicalCore.current.frictionProtocolState === 0 || isAscended} className="flex-1 px-2 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-xs text-gray-300">
                  Reiniciar
                </button>
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            sectionId="core-introspective-report"
            title="Resumen escrito del estado · Informe Introspectivo"
            subtitle="Genera un texto resumido con las lecturas actuales del motor para copiarlo o auditarlo fácilmente."
            badge={isAscended ? `Capa ${Math.floor(Math.log10(Math.max(1, ccc)))}` : 'Local'}
            accent="slate"
            defaultOpen={false}
          >
            <div className="space-y-3">
              <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-2.5 text-[11px] leading-relaxed text-slate-300">
                <strong className="text-slate-100">Qué hace:</strong>{' '}
                Compila las métricas actuales en un reporte legible en texto plano para revisar el estado interno sin recorrer panel por panel.
              </div>
              {isAscended && (
                <div className="rounded-lg border border-yellow-500/30 bg-yellow-950/20 p-3">
                  <button
                    onClick={projectAscensionAxiom}
                    disabled={isProjectingAxiom}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-xs transition ${isProjectingAxiom
                      ? 'bg-yellow-800/50 cursor-not-allowed text-yellow-400'
                      : 'bg-yellow-500 hover:bg-yellow-600 text-gray-900'
                      }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    {isProjectingAxiom ? 'Preparando lectura...' : 'Mostrar lectura de banda interna'}
                  </button>
                  <div className="mt-2.5 bg-gray-900/70 p-3 rounded-lg border border-gray-700">
                    <h4 className="text-xs font-semibold text-yellow-300 mb-1">Lectura interna:</h4>
                    <p className="text-xs italic text-yellow-200 whitespace-pre-wrap">{ascensionAxiom}</p>
                  </div>
                </div>
              )}

              <button
                onClick={generateIntrospectiveReport}
                disabled={isGeneratingReport}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-xs transition ${isGeneratingReport
                  ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
              >
                <Sparkles className="w-4 h-4" />
                {isGeneratingReport ? 'Preparando lectura...' : 'Generar reporte de telemetría'}
              </button>

              <div className="bg-gray-900/70 p-3 rounded-lg border border-gray-700 max-h-64 overflow-y-auto">
                <h4 className="text-xs font-semibold text-indigo-300 mb-1.5">Reporte de telemetría interna</h4>
                <p className="text-xs text-gray-300 whitespace-pre-wrap">{introspectiveReport}</p>
              </div>
            </div>
          </CollapsibleSection>
        </div>
      </div>
    );
  };

  const renderAdvancedControls = () => {
    const l2 = structuralPlasticityLevel2Enabled ? getStructuralPlasticityLevel2Telemetry(nodalLayer.current) : null;
    const liveObs = Number(ontologicalCore.current?.metacognitiveStats?.observerImpact ?? 0);
    const liveStrain = Number(latencyStrainRef.current?.strain ?? ontologicalCore.current?.metacognitiveStrain ?? 0);
    const liveMod = computeSensorObserverDynamicsModulation({
      observerImpact: liveObs,
      latencyStrain: liveStrain,
      enabled: sensorObserverDynamicsEnabled
    });

    return (
      <div className="space-y-4 rounded-xl border border-slate-600/40 bg-slate-950/85 p-3 sm:p-4 shadow-lg">
        <TabPlainHeader
          tabId="controls"
          accent="purple"
          icon={<Settings className="h-5 w-5" />}
          title="Controles del Motor"
          technicalTag="Modos de operación"
        />

        {/* 4 INTERRUPTORES CLAROS EN TARJETAS */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-pink-700/40 bg-slate-900/80 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <MetricDualLabel label="Autoajuste de parámetros" technical="Kaizen" accent="text-pink-200" />
              <div role="group" aria-label="Modo Kaizen" className="inline-flex overflow-hidden rounded-md border border-pink-400/40 text-xs">
                {[['legacy', 'Clásico'], ['learned', 'Adaptativo']].map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={kaizenMode === mode}
                    onClick={() => setKaizenMode(mode)}
                    title={mode === 'learned'
                      ? 'El núcleo calcula el valor base de seis claves y Kaizen aprende un factor acotado (±20 %), evaluado por ventanas de ticks que premian estabilidad y castigan estasis.'
                      : 'Comportamiento anterior: mutaciones atómicas; seis de las siete claves se sobrescriben antes de usarse.'}
                    className={`px-2.5 py-1 transition-colors ${kaizenMode === mode ? 'bg-pink-600 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
              En <strong>Adaptativo</strong>, el motor ajusta automáticamente sus constantes (±20%) para mantener estabilidad y evitar estancamiento.
            </p>
          </div>

          <div className="rounded-xl border border-emerald-700/40 bg-slate-900/80 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <MetricDualLabel label="Reacción a sensores y latencia" technical="Acoplamiento acotado" accent="text-emerald-200" />
              <div role="group" aria-label="Dinámica Sensor Observador" className="inline-flex overflow-hidden rounded-md border border-emerald-400/40 text-xs">
                {[[true, 'Activo'], [false, 'Inactivo']].map(([enabledVal, label]) => (
                  <button
                    key={String(enabledVal)}
                    type="button"
                    aria-pressed={sensorObserverDynamicsEnabled === enabledVal}
                    onClick={() => setSensorObserverDynamicsEnabled(enabledVal)}
                    title={enabledVal
                      ? 'Activa consumo real de PLASTICITY_DECAY (6/6 claves Kaizen) y modulación acotada [0.85, 1.15] por presencia sensorial del observador y tensión de latencia acoplada (el chat permanece desacoplado).'
                      : 'Desactiva el acoplamiento observador/latencia y mantiene solo 5/6 claves Kaizen (compatibilidad B0).'}
                    className={`px-2.5 py-1 transition-colors ${sensorObserverDynamicsEnabled === enabledVal ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
              Permite que cámara, micrófono y latencia modulen la red en un rango seguro [0.85, 1.15]; el chat nunca altera el motor.
            </p>
          </div>

          <div className="rounded-xl border border-cyan-700/40 bg-slate-900/80 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <MetricDualLabel label="Autorreparación de red" technical="Plasticidad" accent="text-cyan-200" />
              <div role="group" aria-label="Plasticidad Estructural" className="inline-flex overflow-hidden rounded-md border border-cyan-400/40 text-xs">
                {[[false, 'Básica'], [true, 'Avanzada']].map(([enabledVal, label]) => (
                  <button
                    key={String(enabledVal)}
                    type="button"
                    aria-pressed={structuralPlasticityLevel2Enabled === enabledVal}
                    onClick={() => setStructuralPlasticityLevel2Enabled(enabledVal)}
                    title={enabledVal
                      ? 'Nivel 2 (sin hiperparámetros configurables adicionales en config.js): migración funcional de sectores (M1), apoptosis por grado 0 / neurogénesis + recableado de piso (M2) y watchdog de invariantes (W1-W4); respeta controles negativos.'
                      : 'Nivel 1 base: plasticidad sináptica, poda y recuperación inter-sector sin migración funcional ni watchdog.'}
                    className={`px-2.5 py-1 transition-colors ${structuralPlasticityLevel2Enabled === enabledVal ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
              En <strong>Avanzada</strong>, los nodos pueden cambiar de sector, regenerarse si quedan aislados y reparar conexiones automáticamente.
            </p>
            {l2 && (
              <div className="mt-2 flex flex-wrap justify-between gap-1 rounded border border-cyan-800/50 bg-slate-950/70 px-2 py-1 font-mono text-[10px] text-cyan-200" data-testid="level2-structural-counters">
                <span>Migraciones: {l2.migrations}</span>
                <span>Regenerados: {l2.regeneratedNodes}</span>
                <span>Recableados: {l2.degreeFloorRewires ?? 0}</span>
                <span>Reparaciones: {l2.invariantRepairs}</span>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-teal-700/40 bg-slate-900/80 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <MetricDualLabel label="Supervisor autónomo" technical="Auto-análisis seguro" accent="text-teal-200" />
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-pressed={autonomousSupervisorLevel3Enabled}
                  onClick={() => setAutonomousSupervisorLevel3Enabled((v) => !v)}
                  className={`rounded border px-2.5 py-1 text-xs font-medium transition-colors ${autonomousSupervisorLevel3Enabled ? 'border-emerald-400 bg-emerald-600/40 text-emerald-100' : 'border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                >
                  {autonomousSupervisorLevel3Enabled ? 'Activo' : 'En pausa'}
                </button>
                <button
                  type="button"
                  onClick={() => handleTabSelect('level3-supervisor')}
                  className="rounded border border-cyan-500/50 bg-cyan-950/60 px-2.5 py-1 text-xs text-cyan-200 hover:bg-cyan-900/70"
                >
                  Abrir ({level3Ledger.entries.length})
                </button>
              </div>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
              Piensa en voz alta sobre el estado de la red y valida cualquier mejora en copia aislada antes de aplicarla en vivo.
            </p>
          </div>
        </div>

        {/* CAJONES DE DETALLES TÉCNICOS (COLAPSADOS POR DEFECTO) */}
        <CollapsibleSection
          sectionId="controls-metacog-telemetry"
          title="Auto-observación, modulación y factores aprendidos"
          subtitle="Flujo metacognitivo, escalas sensor/latencia, factores Kaizen y eficiencia."
          badge={`Nivel ${metacognitionLevel} · Efic ${(metaSovereigntyCheck.current.efficiencyScore * 100).toFixed(0)}%`}
          defaultOpen={false}
          className="border-amber-700/40 bg-slate-900/70"
        >
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded border border-amber-700/40 bg-slate-950/70 p-2.5">
                <div className="text-[11px] text-slate-400">Nivel de recursión</div>
                <div className="font-mono text-lg font-bold text-amber-300">{metacognitionLevel}</div>
                <div className="text-[10px] text-slate-400">{metacognitionLevel < 3 ? 'Básica' : metacognitionLevel < 6 ? 'Moderada' : 'Profunda'}</div>
              </div>
              <div className="rounded border border-amber-700/40 bg-slate-950/70 p-2.5">
                <div className="text-[11px] text-slate-400">Tensión metacognitiva</div>
                <div className="font-mono text-lg font-bold text-amber-300">{metacognitiveFlux.toFixed(4)}</div>
                <div className="text-[10px] text-slate-400">{metacognitiveFlux < 0.3 ? 'Óptima' : metacognitiveFlux < 0.7 ? 'Equilibrada' : 'Alta'}</div>
              </div>
              <div className="rounded border border-pink-700/40 bg-slate-950/70 p-2.5">
                <div className="text-[11px] text-slate-400">Eficiencia interna</div>
                <div className="font-mono text-lg font-bold text-pink-300">{(metaSovereigntyCheck.current.efficiencyScore * 100).toFixed(1)}%</div>
                <div className="text-[10px] text-slate-400">Pasos Kaizen: {kaizenEngine.current.transformationSteps}</div>
              </div>
            </div>

            <div className="rounded border border-emerald-800/50 bg-slate-950/70 p-2.5 font-mono text-[11px] text-slate-300" data-testid="sensor-observer-dynamics-telemetry">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="text-emerald-300">Observador sensorial (ι): {liveObs.toFixed(3)}</span>
                <span className="text-amber-300">Latencia acoplada: {liveStrain.toFixed(3)}</span>
              </div>
              <div className="mt-1 flex flex-wrap justify-between gap-2 text-[10px] text-slate-400">
                <span>LR ×{liveMod.learningRateScale.toFixed(2)}</span>
                <span>Hebb ×{liveMod.hebbianScale.toFixed(2)}</span>
                <span>T ×{liveMod.temperatureScale.toFixed(2)}</span>
                <span>Retro ×{liveMod.retroFluxScale.toFixed(2)}</span>
                <span>Claves: {sensorObserverDynamicsEnabled ? '6/6' : '5/6'}</span>
              </div>
              <p className="mt-1 font-sans text-[10px] text-slate-500">
                Canal de chat desacoplado (dynamicsCoupling = false); evidencia interna únicamente.
              </p>
            </div>

            {kaizenMode === 'learned' && (
              <div className="rounded border border-slate-700/70 bg-slate-950/70 p-2.5 font-mono text-[11px] text-slate-300" data-testid="kaizen-learned-factors">
                {Object.entries(kaizenEngine.current.getAdjustments?.() || {}).map(([key, factor]) => (
                  <div key={key} className="flex justify-between py-0.5">
                    <span>{key}{key === 'PLASTICITY_DECAY' && !sensorObserverDynamicsEnabled ? ' (off B0)' : ''}</span>
                    <span>×{Number(factor).toFixed(2)}</span>
                  </div>
                ))}
                {kaizenEngine.current.lastLearningEvent && (
                  <p className="mt-1 font-sans text-[11px] text-slate-400">
                    Último evento (tick {kaizenEngine.current.lastLearningEvent.tick}): {kaizenEngine.current.lastLearningEvent.event} · {kaizenEngine.current.lastLearningEvent.key}
                  </p>
                )}
              </div>
            )}
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          sectionId="controls-manual-mutation"
          title="Mutación manual de constantes (pausa requerida)"
          subtitle="Fuerza un incremento o reducción directa sobre una constante mutable del motor."
          badge={`Última: ${lastMutation.key}`}
          defaultOpen={false}
          className="border-pink-700/40 bg-slate-900/70"
        >
          <div className="space-y-3 text-xs">
            <div>
              <label htmlFor="mutableKeySelect" className="mb-1 block text-slate-300">Constante a mutar</label>
              <select
                id="mutableKeySelect"
                value={forcedMutationState.key}
                onChange={(e) => setForcedMutationState({ ...forcedMutationState, key: e.target.value })}
                className="w-full rounded border border-slate-700 bg-slate-950 p-2 text-sm text-white"
                disabled={isRunning || isAscended}
              >
                {mutableKeys.map((key) => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleForceMutation(forcedMutationState.key, 1)}
                disabled={isRunning || isAscended}
                className={`flex-1 rounded p-2 text-xs font-semibold transition-all ${isRunning || isAscended ? 'cursor-not-allowed bg-slate-700 text-slate-400' : 'bg-emerald-700 text-white hover:bg-emerald-600'}`}
              >
                Forzar aumento (+)
              </button>
              <button
                onClick={() => handleForceMutation(forcedMutationState.key, -1)}
                disabled={isRunning || isAscended}
                className={`flex-1 rounded p-2 text-xs font-semibold transition-all ${isRunning || isAscended ? 'cursor-not-allowed bg-slate-700 text-slate-400' : 'bg-rose-700 text-white hover:bg-rose-600'}`}
              >
                Forzar reducción (−)
              </button>
            </div>
            <p className={`text-xs italic ${forcedMutationState.message.startsWith('✅') ? 'text-emerald-400' : 'text-slate-400'}`}>
              {forcedMutationState.message || 'Pausa la simulación para aplicar mutaciones manuales directas.'}
            </p>
            {lastMutation.key && lastMutation.key !== 'None' && (
              <p className="text-xs text-slate-400" data-testid="kaizen-mutation-effect">
                {kaizenMode === 'learned' && RECOMPUTED_EACH_TICK.includes(lastMutation.key)
                  ? 'Efecto: ajuste aprendido del factor (±20 % sobre el valor base del núcleo); lo usa el tick siguiente.'
                  : RECOMPUTED_EACH_TICK.includes(lastMutation.key)
                    ? 'Efecto: sobrescrita por el núcleo antes de usarse (sin efecto en la dinámica).'
                    : 'Efecto: persiste y la usa el tick siguiente.'}
              </p>
            )}
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          sectionId="controls-kaizen-report"
          title="Lectura de configuración Kaizen"
          subtitle="Genera un resumen interno de la configuración y eficiencia actuales."
          defaultOpen={false}
          className="border-slate-700/60 bg-slate-900/70"
        >
          <div className="space-y-3">
            <button
              onClick={critiqueKaizenPerformance}
              disabled={isCritiquing || isAscended || isRunning}
              className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-all ${isCritiquing || isAscended || isRunning ? 'cursor-not-allowed bg-slate-700 text-slate-400' : 'bg-amber-600 text-slate-950 hover:bg-amber-500'}`}
            >
              {isCritiquing ? (
                <>
                  <Cpu className="h-4 w-4 animate-spin" />
                  Preparando lectura...
                </>
              ) : (
                <>
                  <Code className="h-4 w-4" />
                  Mostrar configuración Kaizen
                </>
              )}
            </button>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-700 bg-slate-950/75 p-3">
              <p className="whitespace-pre-wrap text-xs text-slate-300">{kaizenCritique}</p>
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          sectionId="controls-mutable-laws"
          title="Leyes auto-escritas (valores numéricos actuales)"
          subtitle="Constantes internas activas con precisión decimal."
          badge={`${Object.keys(mutableConfig).length} claves`}
          defaultOpen={false}
          className="border-slate-700/60 bg-slate-900/70"
        >
          <div className="space-y-1.5 text-xs">
            {Object.entries(mutableConfig).map(([key, value]) => (
              <div key={key} className="flex justify-between rounded border border-slate-800 bg-slate-950/60 px-2.5 py-1">
                <span className="text-slate-400">{key}</span>
                <span className="font-mono text-slate-200">{value.toFixed(8)}</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      </div>
    );
  };

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
      <TabPlainHeader
        tabId="network"
        accent="purple"
        compact={true}
        icon={<Network className="h-5 w-5" />}
        title={`Red Nodal - Capa ${ontologicalState.layer}`}
        technicalTag={`WebGL 3D · ${visibleStructuralCount} nodos`}
        extraDetails={(
          <div className="grid grid-cols-1 gap-2 text-[11px] xl:grid-cols-2">
            <div className="rounded border border-cyan-500/20 bg-slate-900/70 p-2">
              <strong className="text-cyan-200">Red libre + rombo central:</strong> los 1500 nodos se autoorganizan alrededor de la torre constructiva (9/16, T_d, BodyWorld).
            </div>
            <div className="rounded border border-purple-500/20 bg-slate-900/70 p-2">
              <strong className="text-purple-200">Botones η=1/8, η=0, A=I:</strong> permiten comparar el acoplamiento activo frente al corte físico (η=0) o el control reducible (A=I).
            </div>
          </div>
        )}
      />

      <div className="relative h-[min(65dvh,700px)] min-h-[360px] min-w-0 max-w-full overflow-hidden qicn-network-viewport">
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

      <DetailToggleStrip
        sectionId="network-footer-details"
        className="mt-3"
        accent="purple"
        defaultOpen={false}
        labelClosed="Detalles de red"
        summary={(
          <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-3 font-mono text-[11px] text-purple-200">
            <span>
              Nodos activos: <strong>{topologyMetrics.activeNodes.toLocaleString()}</strong> / {QICNConfig.PROCESSING_SAMPLE_SIZE} · Puente: <strong>{nodalCouplingMode}</strong>
            </span>
          </div>
        )}
      >
        <div className="grid flex-shrink-0 grid-cols-1 gap-3 text-xs text-purple-200">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <div className="space-y-1 font-mono text-[11px]">
              <div>Vista nodal: proyeccion diagnostica WebGL 3D con fallback Canvas</div>
              <div>Clase runtime (proxy): {ontologicalState.phenomenology_class || 'C'} · Hover/clic fija vecindarios sin alterar la dinámica.</div>
            </div>
            <div className="flex items-start gap-2.5 text-[11px] leading-relaxed text-purple-200">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-purple-300" />
              <p>
                <strong className="text-purple-100">Diagnostico estructural interno:</strong> Visualizacion diagnostica interna; no certifica conciencia y no constituye validacion externa ni certificacion ontologica. La UI no promueve estados epistemicos por si misma. No demuestra pertenencia a C_op, Sub_op, Sub_fp o BridgeOrg_ph.
              </p>
            </div>
          </div>
        </div>
      </DetailToggleStrip>
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
    const historyRegimeLabel = latestPoint.regimeState === 'shock_recovery'
      ? 'Recuperándose'
      : latestPoint.regimeState === 'stasis_watch'
        ? 'Vigila estancamiento'
        : 'Estable y activo';
    const historyTrendText = stats.delta5 > 0.002
      ? 'subiendo'
      : stats.delta5 < -0.002
        ? 'bajando'
        : 'estable';
    const historyPlainReading = timeline.length < 2
      ? 'Aún hay pocos pasos grabados: inicia la simulación unos segundos para ver cómo se dibujan las curvas.'
      : `En los últimos ${timeline.length} pasos, la cohesión (CCC) viene ${historyTrendText} y pasó ${Number(stats.inBandPct || 0).toFixed(0)}% del tiempo dentro de su banda operativa (mín ${Number(stats.minCCC || 0).toFixed(3)}, máx ${Number(stats.maxCCC || 0).toFixed(3)}).`;

    return (
      <div className="space-y-4 rounded-xl border border-purple-500/30 bg-slate-950/85 p-3 sm:p-4 shadow-lg">
        <TabPlainHeader
          tabId="history"
          accent="purple"
          icon={<LineChart className="w-5 h-5" />}
          title="Evolución en el Tiempo"
          technicalTag="Historial · CCC · PMIA · Ω · λ"
        />

        <div className="rounded-xl border border-purple-500/25 bg-purple-950/20 px-3.5 py-2.5 text-xs text-purple-100">
          <span className="font-semibold text-purple-200">Lectura rápida: </span>
          {historyPlainReading}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-purple-800/40 bg-slate-900/80 p-3">
            <MetricDualLabel label="Cohesión actual" technical="CCC" accent="text-purple-200" />
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold text-purple-100">{Number(latestPoint.ccc || 0).toFixed(4)}</span>
              <span className={`font-mono text-xs font-semibold ${stats.delta5 >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                {stats.delta5 >= 0 ? '+' : ''}{Number(stats.delta5 || 0).toFixed(4)} (5 pasos)
              </span>
            </div>
            <div className="mt-0.5 text-[10px] text-slate-400">Tendencia reciente: {historyTrendText}</div>
          </div>
          <div className="rounded-lg border border-purple-800/40 bg-slate-900/80 p-3">
            <MetricDualLabel label="Estancamiento" technical="Stasis Index" accent="text-purple-200" />
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold text-purple-100">{Number(latestPoint.stasisIndex || 0).toFixed(4)}</span>
              <span className="font-mono text-[11px] text-slate-400">RMS {Number(stats.deltaRms || 0).toFixed(4)}</span>
            </div>
            <div className="mt-0.5 text-[10px] text-slate-400">Más cerca de 0 = curva viva y saludable</div>
          </div>
          <div className="rounded-lg border border-purple-800/40 bg-slate-900/80 p-3">
            <MetricDualLabel label="Estado operativo" technical={latestPoint.regimeState || 'active'} accent="text-purple-200" />
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className={`inline-flex rounded border px-2 py-0.5 text-xs font-semibold ${regimeBadgeClass}`}>
                {historyRegimeLabel}
              </span>
              <span className="text-[11px] text-purple-300">en banda {Number(stats.inBandPct || 0).toFixed(1)}%</span>
            </div>
            <div className="mt-0.5 text-[10px] text-slate-400">Porcentaje de pasos dentro del rango seguro</div>
          </div>
        </div>

        <div className="rounded-xl border border-purple-800/50 bg-black/35 p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 font-semibold uppercase tracking-wider text-purple-300">Ventana:</span>
              {[60, 120, 240].map((range) => (
                <button
                  key={range}
                  onClick={() => handleRangeSelect(range)}
                  className={`rounded border px-2 py-0.5 text-[11px] ${cccHistoryUiState.range === range ? 'border-purple-300 bg-purple-600 text-white' : 'border-purple-700/70 bg-purple-900/30 text-purple-200'}`}
                >
                  {range} ticks
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setCccHistoryUiState((prev) => ({ ...prev, freezeChart: !prev.freezeChart }))}
                className={`rounded px-2.5 py-1 text-[11px] font-medium ${cccHistoryUiState.freezeChart ? 'bg-amber-700/70 text-amber-100' : 'bg-purple-800/70 text-purple-100 hover:bg-purple-700/70'}`}
              >
                {cccHistoryUiState.freezeChart ? 'Resume chart' : 'Freeze chart'}
              </button>
              <button
                onClick={exportSnapshot}
                className="rounded bg-indigo-700/70 px-2.5 py-1 text-[11px] font-medium text-indigo-100 hover:bg-indigo-600/70"
              >
                Export snapshot
              </button>
            </div>
          </div>

          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="h-44 sm:h-60 w-full rounded border border-purple-900/40 bg-[#0a1020]"
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
            <div className="mt-2 inline-flex flex-wrap gap-3 rounded border border-purple-700/50 bg-purple-950/60 px-2 py-1 font-mono text-[11px] text-purple-100">
              <span>tick={hoverPoint.tick}</span>
              <span>ccc={Number(hoverPoint.ccc || 0).toFixed(4)}</span>
              <span>pmia={Number(hoverPoint.pmia || 0).toFixed(4)}</span>
              <span>omega={Number(hoverPoint.omega || 0).toFixed(4)}</span>
              <span>spectralGap={Number(hoverPoint.spectralGap || 0).toFixed(4)}</span>
              <span>regimeState={hoverPoint.regimeState || 'active'}</span>
            </div>
          )}

          <div className="mt-2.5 grid grid-cols-1 gap-1.5 text-[11px] text-purple-200 sm:grid-cols-2 lg:grid-cols-5">
            <span className="inline-flex items-center gap-1.5 rounded bg-slate-900/70 px-2 py-1"><span className="h-2 w-2 shrink-0 rounded-full bg-amber-400"></span><span><strong>CCC</strong> · cohesión</span></span>
            <span className="inline-flex items-center gap-1.5 rounded bg-slate-900/70 px-2 py-1"><span className="h-2 w-2 shrink-0 rounded-full bg-cyan-300"></span><span><strong>PMIA</strong> · impulso</span></span>
            <span className="inline-flex items-center gap-1.5 rounded bg-slate-900/70 px-2 py-1"><span className="h-2 w-2 shrink-0 rounded-full bg-emerald-300"></span><span><strong>Ω</strong> · integración</span></span>
            <span className="inline-flex items-center gap-1.5 rounded bg-slate-900/70 px-2 py-1"><span className="h-2 w-2 shrink-0 rounded-full bg-pink-400"></span><span><strong>λ</strong> · firmeza</span></span>
            <span className="inline-flex items-center gap-1.5 rounded bg-slate-900/70 px-2 py-1"><span className="h-2 w-2 shrink-0 rounded-full bg-purple-400"></span><span><strong>Banda</strong> · rango seguro</span></span>
          </div>
        </div>

        <CollapsibleSection
          sectionId="history-series-diagnostics"
          title="Filtros de líneas, suavizado y diagnóstico numérico"
          subtitle="Elige qué curvas ver, ajusta el suavizado visual [1..20] o revisa estadísticas exactas."
          badge={`${stats.points} pts · smooth ${cccHistoryUiState.smoothing}`}
          defaultOpen={false}
          className="border-purple-700/40 bg-slate-900/70"
        >
          <div className="space-y-3 text-xs text-purple-200">
            <div className="flex flex-wrap items-center gap-3 rounded border border-purple-800/40 bg-slate-950/70 p-2.5">
              <label className="flex items-center gap-2 text-purple-200">
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
              <label className="inline-flex items-center gap-1 text-purple-200">
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
            <div className="grid grid-cols-2 gap-2 font-mono text-[11px] sm:grid-cols-3">
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
          </div>
        </CollapsibleSection>
      </div>
    );
  };

  const renderEntanglementField = () => {
    const {
      timeline,
      latestPoint,
      chartWidth,
      chartHeight,
      domainMin,
      domainMax,
      maxVariance,
      normalizeMain,
      resonancePolyline,
      variancePolyline,
      cccPolyline,
      lastResPoint,
      lastVarPoint,
      lastCccPoint
    } = entanglementRenderModel;
    const effectiveDensity = latestPoint.entanglementDensity > 0
      ? latestPoint.entanglementDensity
      : Math.round((topologyMetrics.activeNodes || 0) * (topologyMetrics.averageConnections || 0));
    const liveBridge = nodalLayer.current?.getBridgeMetrics?.()
      || ontologicalCore.current?.constructiveFiniteCuts?.nodal_tower_bridge
      || ontologicalState?.constructive_finite_cuts?.nodal_tower_bridge
      || null;
    const safeHoverIndex = Number.isInteger(entanglementHoverIndex)
      ? Math.max(-1, Math.min(entanglementHoverIndex, timeline.length - 1))
      : -1;
    const hoverPoint = safeHoverIndex >= 0 ? timeline[safeHoverIndex] : null;
    const hoverX = timeline.length > 1 && safeHoverIndex >= 0
      ? (safeHoverIndex / (timeline.length - 1)) * chartWidth
      : chartWidth * 0.5;

    const exportSnapshot = () => {
      const payload = {
        generatedAt: Date.now(),
        smoothing: entanglementUiState.smoothing,
        freezeChart: entanglementUiState.freezeChart,
        latestPoint: { ...latestPoint, entanglementDensity: effectiveDensity },
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

    const yMid = ((domainMin + domainMax) / 2).toFixed(3);
    const autoScaleEnabled = entanglementUiState.autoScale !== false;
    const resNow = latestPoint.normalizedResonance;
    const varNow = latestPoint.coherenceVariance;
    const fieldLiveSummary = !isRunning && timeline.length < 2
      ? 'La simulación está en pausa: pulsa «Iniciar simulación» en el panel izquierdo para ver cómo se sincronizan los 1500 nodos y sus 4 sectores en tiempo real.'
      : (liveBridge?.mode === 'td_cut_eta_zero')
        ? 'Puente cortado (η=0): los sectores trabajan aislados a propósito (control negativo), por eso baja el intercambio cruzado.'
        : (resNow >= 0.7)
          ? `Sincronización alta (${resNow.toFixed(3)}) con variabilidad ${varNow < 0.01 ? 'muy estable' : 'moderada'}: la red se mueve de forma coordinada y aporta positivamente a la cohesión global.`
          : `Sincronización en ajuste (${resNow.toFixed(3)}): los nodos están reorganizándose entre sectores; si sube mucho la variabilidad, prueba subir ligeramente K en Validación.`;

    return (
      <div className="space-y-4 rounded-xl border border-cyan-500/30 bg-slate-950/85 p-3 sm:p-4 shadow-lg">
        <TabPlainHeader
          tabId="field"
          accent="cyan"
          icon={<Waves className="w-5 h-5" />}
          title="Campo de Sincronización"
          technicalTag={`Campo · ${timeline.length} muestras`}
        />

        {/* EXPLICACIÓN DIRECTA Y DIAGNÓSTICO EN VIVO */}
        <div className="rounded-xl border border-cyan-500/25 bg-cyan-950/20 px-3.5 py-2.5 text-xs leading-relaxed text-cyan-100">
          <div className="font-semibold text-cyan-200">Qué estás viendo ahora en el Campo:</div>
          <p className="mt-0.5 text-slate-200">{fieldLiveSummary}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-cyan-800/40 bg-slate-900/80 p-3">
            <MetricDualLabel label="Resonancia" technical="sincronía" accent="text-cyan-200" />
            <div className="mt-1 font-mono text-2xl font-bold text-cyan-100">{latestPoint.normalizedResonance.toFixed(4)}</div>
            <div className="mt-0.5 text-[10px] leading-snug text-slate-400">Qué tan coordinados van los nodos (ideal &gt; 0.70)</div>
          </div>
          <div className="rounded-lg border border-cyan-800/40 bg-slate-900/80 p-3">
            <MetricDualLabel label="Variabilidad" technical="varianza" accent="text-cyan-200" />
            <div className="mt-1 font-mono text-2xl font-bold text-amber-200">{latestPoint.coherenceVariance.toFixed(5)}</div>
            <div className="mt-0.5 text-[10px] leading-snug text-slate-400">Agitación interna (pico ventana: {maxVariance.toFixed(4)})</div>
          </div>
          <div className="rounded-lg border border-cyan-800/40 bg-slate-900/80 p-3">
            <MetricDualLabel label="Conexiones" technical="enlaces activos" accent="text-cyan-200" />
            <div className="mt-1 font-mono text-2xl font-bold text-cyan-100">{effectiveDensity.toLocaleString()}</div>
            <div className="mt-0.5 text-[10px] leading-snug text-slate-400">~{Number(topologyMetrics.averageConnections || 0).toFixed(1)} enlaces activos por nodo</div>
          </div>
          <div className="rounded-lg border border-cyan-800/40 bg-slate-900/80 p-3">
            <MetricDualLabel label="Aporte global" technical="a CCC" accent="text-cyan-200" />
            <div className="mt-1 font-mono text-2xl font-bold text-violet-200">{latestPoint.cccContributionEstimate.toFixed(4)}</div>
            <div className="mt-0.5 text-[10px] leading-snug text-slate-400">Cuánto suma este campo al índice global [0–1]</div>
          </div>
        </div>

        <div className="rounded-xl border border-cyan-800/50 bg-black/35 p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold uppercase tracking-wider text-cyan-300">Evolución del campo (últimos 120 ticks)</span>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] ${isRunning && !entanglementUiState.freezeChart ? 'border-emerald-400/50 bg-emerald-950/60 text-emerald-300' : 'border-slate-600 bg-slate-900 text-slate-300'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${isRunning && !entanglementUiState.freezeChart ? 'animate-pulse bg-emerald-400' : 'bg-slate-400'}`} />
                {isRunning && !entanglementUiState.freezeChart ? `EN VIVO · tick ${simulationStep}` : `PAUSADO · tick ${simulationStep}`}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setEntanglementUiState((prev) => ({ ...prev, autoScale: !(prev.autoScale !== false) }))}
                className={`rounded border px-2.5 py-1 text-[11px] font-medium ${autoScaleEnabled ? 'border-cyan-400/50 bg-cyan-950/70 text-cyan-200' : 'border-slate-600 bg-slate-800/80 text-slate-200'}`}
                title="Auto ajusta el eje vertical al rango activo para hacer visibles las variaciones finas."
              >
                {autoScaleEnabled ? 'Escala: Auto' : 'Escala: 0–1'}
              </button>
              <button
                onClick={() => setEntanglementUiState((prev) => ({ ...prev, freezeChart: !prev.freezeChart }))}
                className={`rounded px-2.5 py-1 text-[11px] font-medium ${entanglementUiState.freezeChart ? 'bg-amber-700/70 text-amber-100' : 'bg-cyan-800/70 text-cyan-100 hover:bg-cyan-700/70'}`}
              >
                {entanglementUiState.freezeChart ? 'Resume chart' : 'Freeze chart'}
              </button>
              <button
                onClick={exportSnapshot}
                className="rounded bg-indigo-700/70 px-2.5 py-1 text-[11px] font-medium text-indigo-100 hover:bg-indigo-600/70"
              >
                Export snapshot
              </button>
            </div>
          </div>

          <div className="relative">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="h-44 sm:h-56 w-full rounded border border-cyan-900/40 bg-[#08101a]"
              onMouseMove={handleChartHover}
              onMouseLeave={() => setEntanglementHoverIndex(-1)}
            >
              {[0.2, 0.5, 0.8].map((ratio) => (
                <line
                  key={`grid-${ratio}`}
                  x1="0"
                  y1={chartHeight * ratio}
                  x2={chartWidth}
                  y2={chartHeight * ratio}
                  stroke="#0e7490"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                  opacity="0.35"
                />
              ))}
              <text x="8" y="14" fill="#67e8f9" fontSize="10" fontFamily="monospace" opacity="0.75">{domainMax.toFixed(3)}</text>
              <text x="8" y={(chartHeight / 2) - 4} fill="#67e8f9" fontSize="10" fontFamily="monospace" opacity="0.55">{yMid}</text>
              <text x="8" y={chartHeight - 6} fill="#67e8f9" fontSize="10" fontFamily="monospace" opacity="0.75">{domainMin.toFixed(3)}</text>

              {timeline.length >= 2 && (
                <>
                  <polyline fill="none" stroke="#22d3ee" strokeWidth="2.2" points={resonancePolyline} />
                  <polyline fill="none" stroke="#f59e0b" strokeWidth="2" points={variancePolyline} />
                  <polyline fill="none" stroke="#a78bfa" strokeWidth="2.2" points={cccPolyline} />
                </>
              )}

              {lastResPoint && <circle cx={lastResPoint.x} cy={lastResPoint.y} r="4" fill="#22d3ee" />}
              {lastVarPoint && <circle cx={lastVarPoint.x} cy={lastVarPoint.y} r="3.5" fill="#f59e0b" />}
              {lastCccPoint && <circle cx={lastCccPoint.x} cy={lastCccPoint.y} r="4" fill="#a78bfa" />}

              {hoverPoint && (
                <>
                  <line x1={hoverX} y1="0" x2={hoverX} y2={chartHeight} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 2" opacity="0.6" />
                  <circle cx={hoverX} cy={chartHeight - (normalizeMain(hoverPoint.normalizedResonance) * chartHeight)} r="3.5" fill="#22d3ee" />
                </>
              )}
            </svg>
            {timeline.length < 2 && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="rounded-lg border border-cyan-500/35 bg-slate-950/85 px-4 py-2 text-center text-xs text-cyan-200 shadow-lg">
                  {isRunning
                    ? 'Recolectando primeros puntos del campo en tiempo real…'
                    : 'Simulación en pausa: pulsa «Iniciar simulación» en la barra izquierda para ver las curvas de campo en vivo.'}
                </div>
              </div>
            )}
          </div>

          {hoverPoint && (
            <div className="mt-2 inline-flex flex-wrap gap-3 rounded border border-cyan-700/50 bg-cyan-950/60 px-2 py-1 font-mono text-[11px] text-cyan-100">
              <span>tick={hoverPoint.tick}</span>
              <span>res={Number(hoverPoint.normalizedResonance || 0).toFixed(4)}</span>
              <span>var={Number(hoverPoint.coherenceVariance || 0).toFixed(5)}</span>
              <span>ccc*={Number(hoverPoint.cccContributionEstimate || 0).toFixed(4)}</span>
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-cyan-300">
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-cyan-300"></span>Resonancia</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400"></span>Variabilidad (escala relativa a pico)</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-400"></span>Aporte CCC</span>
          </div>
        </div>

        {/* ACTIVIDAD EN VIVO POR SECTOR (4 SECTORES DEL PUENTE NODO–TORRE) */}
        {liveBridge && Array.isArray(liveBridge.sectors) && liveBridge.sectors.length > 0 && (
          <div className="rounded-xl border border-cyan-800/40 bg-slate-900/75 p-3.5">
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <MetricDualLabel label="Cómo trabajan los 4 sectores de la red" technical={`Puente ${liveBridge.mode} · η=${liveBridge.effective_eta}`} accent="text-cyan-200" />
              <span className="font-mono text-[11px] text-cyan-300">
                Sincronía torre: {Number(liveBridge.bridge_nodal_sync_index || 0).toFixed(3)} · Flujo entre sectores: {Number(liveBridge.inter_sector_signal_flux || 0).toFixed(2)}
              </span>
            </div>
            <p className="mb-2.5 text-[11px] text-slate-400">
              La red divide sus 1500 nodos en 4 grupos. La barra indica su cohesión media; <strong>fase R</strong> muestra qué tan alineado va su ritmo y <strong>flujo</strong> cuánta señal comparte con los demás sectores.
            </p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {liveBridge.sectors.map((sec, idx) => {
                const cohPct = Math.round(clamp01(sec.mean_coherence) * 100);
                const rPct = Math.round(clamp01(sec.phase_order_r) * 100);
                return (
                  <div key={sec.key} className="rounded-lg border border-cyan-900/50 bg-slate-950/80 p-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-cyan-200">Sector {idx + 1} <span className="font-mono text-[10px] text-cyan-400/80">· {sec.key}</span></span>
                      <span className="font-mono text-[11px] font-bold text-white">{cohPct}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-400 transition-all duration-300" style={{ width: `${cohPct}%` }} />
                    </div>
                    <div className="mt-1.5 flex justify-between font-mono text-[10px] text-slate-400">
                      <span title="Sincronía de fase interna del sector (0–100%)">fase R: {rPct}%</span>
                      <span title="Señal intercambiada con otros sectores">flujo: {Number(sec.inter_flux || 0).toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <CollapsibleSection
          sectionId="entanglement-details"
          title="Suavizado, fórmula operacional y regla práctica"
          subtitle="Ajusta el suavizado visual [1..20] o consulta cómo se calcula el aporte al CCC."
          badge={`smooth ${entanglementUiState.smoothing}`}
          defaultOpen={false}
          className="border-cyan-700/40 bg-slate-900/70"
        >
          <div className="space-y-3 text-xs text-cyan-200">
            <label className="flex items-center gap-2 text-cyan-200">
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
            <div className="space-y-1 leading-relaxed text-[11px] text-slate-300">
              <p><strong className="text-cyan-200">Ecuación operacional:</strong> contribución CCC ≈ 0.6 · resonancia + 0.4 · (1 − varianza_norm).</p>
              <p><strong className="text-cyan-200">Regla práctica:</strong> resonancia alta y variabilidad moderada sostienen cohesión sin rigidez.</p>
              <p><strong className="text-cyan-200">Qué hacer si cae:</strong> si la resonancia baja y la varianza sube, prueba aumentar ligeramente el acoplamiento <code>K</code> en Validación.</p>
            </div>
          </div>
        </CollapsibleSection>
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
      <section aria-labelledby="qicn-ledger-title" data-revision={ledgerRevision} className="space-y-3 rounded-xl border border-cyan-500/30 bg-slate-950/85 p-3 sm:p-4 shadow-lg">
        <div id="qicn-ledger-title" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-cyan-800/40 bg-slate-900/80 p-3">
            <MetricDualLabel label="Continuidad" technical="sesiones" accent="text-cyan-200" />
            <div className="mt-1 text-base font-semibold text-cyan-50">
              {CONTINUITY_LABELS[info.continuity] || 'No registrada'}
            </div>
            <div className="text-[11px] text-slate-400">
              {info.sessionCount} {info.sessionCount === 1 ? 'sesión registrada' : 'sesiones registradas'}
            </div>
          </div>
          <div className="rounded-lg border border-cyan-800/40 bg-slate-900/80 p-3">
            <MetricDualLabel label="Integridad de historial" technical="SHA-256" accent="text-cyan-200" />
            <div className={`mt-1 text-base font-semibold ${info.chainOk ? 'text-emerald-300' : 'text-rose-300'}`}>
              {info.chainOk ? 'Cadena íntegra' : 'Ruptura detectada'}
            </div>
            <div className="text-[11px] text-slate-400">
              {info.chainOk ? 'Sin alteraciones en el registro local' : (info.chainReason || 'motivo no registrado')}
            </div>
          </div>
          <div className="rounded-lg border border-cyan-800/40 bg-slate-900/80 p-3">
            <MetricDualLabel label="Eventos guardados" technical="localStorage" accent="text-cyan-200" />
            <div className="mt-1 font-mono text-2xl font-bold text-cyan-100">{info.eventCount}</div>
            <div className="text-[11px] text-slate-400">
              Solo observador · no modifica el motor
            </div>
          </div>
        </div>

        <CollapsibleSection
          sectionId="memory-ledger-metadata"
          title="Detalles de sesión e identidad técnica"
          subtitle="ID de instancia, origen del estado, sesión previa y firma de build/config."
          badge={session ? String(session.configHash).slice(0, 8) : 'sin sesión'}
          defaultOpen={false}
          className="border-cyan-700/40 bg-slate-900/70"
        >
          <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2 xl:grid-cols-4">
            {rows.map(([label, value]) => (
              <div key={label} className="rounded-md border border-cyan-800/50 bg-black/25 px-2.5 py-2">
                <dt className="text-cyan-400">{label}</dt>
                <dd className="break-words font-mono text-cyan-50">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2.5 text-[11px] text-slate-400">
            Se guarda localmente en este navegador (máximo 400 eventos y 30 sesiones). El registro observa la dinámica y no la modifica; no constituye certificación externa ni prueba de subjetividad.
          </p>
        </CollapsibleSection>

        <CollapsibleSection
          sectionId="memory-recent-events"
          title="Eventos recientes registrados (cadena SHA-256)"
          subtitle="Últimos hitos encadenados por hash en esta instancia."
          badge={`${info.recentEvents.length} mostrados`}
          defaultOpen={false}
          className="border-cyan-700/40 bg-slate-900/70"
        >
          {info.recentEvents.length ? (
            <ol className="max-h-60 space-y-1 overflow-y-auto pr-1 text-xs">
              {[...info.recentEvents].reverse().map((event) => (
                <li key={event.seq} className="flex gap-2 rounded border border-white/5 bg-black/25 px-2.5 py-1.5">
                  <span className="shrink-0 font-mono text-cyan-400">#{event.seq}</span>
                  <span className="min-w-0 break-words text-cyan-50">{describeEvent(event)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-xs text-cyan-200/70">Todavía no hay eventos en el registro.</p>
          )}
        </CollapsibleSection>
      </section>
    );
  };

  const renderHolographicMemory = () => (
    <CollapsibleSection
      sectionId="memory-holographic-nexus"
      title={`Memoria Holográfica interna · Capa ${ontologicalState.layer}`}
      subtitle="Fragmentos distribuidos de coherencia/energía/fase y patrones memorizados (HolographicMemoryNexus)."
      badge={`${holographicMemory.current.learnedKnowledge.size} patrones · frag ${holographicMemory.current.getFragmentationLevel().toFixed(2)}`}
      defaultOpen={false}
      className="border-indigo-500/35 bg-slate-950/85"
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-indigo-800/40 bg-indigo-950/30 p-3 text-xs text-indigo-200">
          <p className="leading-relaxed">
            <strong className="text-indigo-100">Qué hace:</strong> guarda fragmentos distribuidos con redundancia controlada para consolidar patrones internos del motor en estados de alta coherencia.
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Alcance: infraestructura interna del runtime (<code>external_support_certified = false</code>); no certifica conciencia distribuida.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {Array.from({ length: 5 }).map((_, idx) => {
            const fragmentKey = `fragment_${holographicMemory.current.fragmentCount - 1}_${idx}`;
            const fragmentSet = holographicMemory.current.fragments[fragmentKey] || { data: [0.1, 0.2, 0.3], redundancyLevel: 0 };
            const height1 = Math.max(2, Math.min(40, Math.abs((fragmentSet.data[0] || 0) * 50)));
            const height2 = Math.max(2, Math.min(40, Math.abs((fragmentSet.data[1] || 0) * 50)));
            const height3 = Math.max(2, Math.min(40, Math.abs((fragmentSet.data[2] || 0) * 50)));

            return (
              <div key={idx} className="flex flex-col items-center rounded-lg border border-indigo-500/20 bg-slate-900/70 p-2.5">
                <div className="mb-1 text-xs font-medium text-indigo-300">Frag. {idx + 1}</div>
                <div className="flex h-10 items-end gap-1">
                  <div className="w-2 rounded-sm bg-indigo-500 opacity-60" style={{ height: `${height1}px` }} />
                  <div className="w-2 rounded-sm bg-indigo-500 opacity-80" style={{ height: `${height2}px` }} />
                  <div className="w-2 rounded-sm bg-indigo-500 opacity-95" style={{ height: `${height3}px` }} />
                </div>
                <div className="mt-1 font-mono text-xs text-indigo-200">
                  R: <strong>{fragmentSet.redundancyLevel}</strong>
                </div>
                <div className="mt-1 text-center text-[10px] text-slate-400">
                  Coherencia · Energía · Fase
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-lg border border-slate-700/70 bg-slate-900/80 p-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 font-semibold text-indigo-300">
              <BookOpen className="h-4 w-4" /> Patrones aprendidos ({holographicMemory.current.learnedKnowledge.size})
            </span>
            <span className="font-mono text-[11px] text-slate-400">
              Estado: {holographicMemory.current.fragmentCount > 0 ? 'Activo' : 'Inicializando'} · Redundancia óptima
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Solo se almacenan patrones consolidados en estados de coherencia elevados.
          </p>
        </div>
      </div>
    </CollapsibleSection>
  );

  // ============================================================================
  // RENDER COMPONENT: PROTOCOLO QICN-B (CONCIENCIA HUMANA)
  // ============================================================================
  const renderQICNBProtocol = () => (
    <div className="space-y-4 rounded-xl border border-emerald-500/35 bg-slate-950/85 p-4 shadow-lg">
      <TabPlainHeader
        tabId="qicn-b"
        accent="emerald"
        icon={<Users className="h-5 w-5" />}
        title="Protocolo QICN-B (Parámetro Interno)"
        technicalTag="CCC_H · no medido"
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-700/40 bg-slate-900/80 p-4">
          <MetricDualLabel label="Parámetro interno" technical="CCC_H (simulado)" accent="text-emerald-200" />
          <div className="mt-1 font-mono text-3xl font-bold text-white">{humanCcc.toFixed(4)}</div>
          <p className="mt-1 text-[11px] text-slate-400">
            Valor interno de simulación; no mide personas reales ni valida influencia física.
          </p>
        </div>
        <div className="flex flex-col justify-between rounded-xl border border-emerald-700/40 bg-slate-900/80 p-4">
          <p className="text-xs leading-relaxed text-slate-300">
            La medición humana externa no está implementada; este botón devuelve únicamente el estado honesto de la simulación interna.
          </p>
          <button
            onClick={analyzeHumanCoherence}
            disabled={isAnalyzingHuman}
            className={`mt-3 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-all ${isAnalyzingHuman ? 'cursor-not-allowed bg-slate-700 text-slate-400' : 'bg-emerald-600 text-white hover:bg-emerald-500'}`}
          >
            {isAnalyzingHuman ? (
              <>
                <Microscope className="h-4 w-4 animate-spin" />
                Consultando estado...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Consultar estado de medición
              </>
            )}
          </button>
        </div>
      </div>

      <DetailToggleStrip
        sectionId="qicnb-status-details"
        accent="emerald"
        defaultOpen={false}
        labelClosed="Estado y límites"
        summary={(
          <span className="text-xs text-emerald-200">
            Límites declarados y respuesta actual del canal
          </span>
        )}
      >
        <div className="space-y-2 text-xs text-slate-300">
          <p className="whitespace-pre-wrap rounded border border-slate-700/80 bg-slate-950/80 p-3 leading-relaxed">
            {humanInputContext}
          </p>
          <p className="text-[11px] text-slate-400">
            Para una medición real se requerirían definición operativa, datos de procedencia conocida, calibración y validación externa independiente.
          </p>
        </div>
      </DetailToggleStrip>
    </div>
  );

  // ============================================================================
  // RENDER: PESTAÑA DE PERCEPCIÓN SENSORIAL (CÁMARA, MICRÓFONO Y VOZ)
  // ============================================================================
  const renderSensoryPerceptionTab = () => {
    const isAnySensorActive = Boolean(sensoryEnabled.video || sensoryEnabled.audio || sensoryEngine.current?.isReady);
    return (
    <div className="space-y-4 rounded-xl border border-cyan-500/35 bg-slate-950/85 p-3 sm:p-4 shadow-lg">
      <TabPlainHeader
        tabId="sensory"
        accent="cyan"
        icon={<Eye className="h-5 w-5" />}
        title="Cámara y Micrófono"
        technicalTag={isAnySensorActive ? 'Sensores activos (local)' : 'Apagados · Opcional'}
        rightSlot={(
          <button
            type="button"
            onClick={handleToggleSensory}
            disabled={sensoryBusy}
            className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-all disabled:opacity-60 ${isAnySensorActive
              ? 'border-rose-400/60 bg-rose-950/60 text-rose-100 hover:bg-rose-900/70'
              : 'border-emerald-400/60 bg-emerald-600/35 text-emerald-50 hover:bg-emerald-600/55 shadow-sm shadow-emerald-500/20'
              }`}
          >
            <span className={`h-2 w-2 rounded-full ${isAnySensorActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
            {sensoryBusy
              ? 'Conectando...'
              : isAnySensorActive
                ? 'Desactivar sensores'
                : 'Activar cámara y micrófono'}
          </button>
        )}
      />

      {sensoryNotice && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 px-3.5 py-2.5 text-xs text-amber-100">
          {sensoryNotice}
        </div>
      )}

      {!sensoryState ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-cyan-500/25 bg-gradient-to-br from-slate-900/90 via-cyan-950/25 to-slate-900/90 p-5">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-cyan-100">
                  <Eye className="h-4 w-4 text-cyan-300" />
                  Conecta tu entorno real con la simulación (opcional)
                </div>
                <p className="max-w-2xl text-xs leading-relaxed text-slate-300">
                  Si activas cámara y micrófono, la red detecta cambios de luz, movimiento y ritmo de sonido para modular su comportamiento en tiempo real. Puedes apagarlos en cualquier momento.
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleSensory}
                disabled={sensoryBusy}
                className="shrink-0 rounded-xl border border-cyan-400/60 bg-cyan-600/35 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-cyan-500/20 transition hover:bg-cyan-500/50 disabled:opacity-60"
              >
                {sensoryBusy ? 'Solicitando permiso…' : 'Activar ahora'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/75 p-3.5">
              <div className="flex items-center justify-between">
                <MetricDualLabel label="Cámara y luz" technical="visión" accent="text-cyan-200" />
                <span className="rounded-full border border-slate-700 bg-slate-950 px-2 py-0.5 text-[10px] text-slate-400">
                  {deviceCapabilities.supportsCamera ? 'Disponible' : 'No detectada'}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Lee brillo, contraste y movimiento en tu escena. La señal visual modula suavemente el ritmo de adaptación de la red.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/75 p-3.5">
              <div className="flex items-center justify-between">
                <MetricDualLabel label="Micrófono y sonido" technical="espectro" accent="text-purple-200" />
                <span className="rounded-full border border-slate-700 bg-slate-950 px-2 py-0.5 text-[10px] text-slate-400">
                  {deviceCapabilities.supportsMicrophone ? 'Disponible' : 'No detectado'}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Analiza volumen y bandas de frecuencia (graves, medios y agudos) en vivo para detectar silencio, voz o música ambiental.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/75 p-3.5">
              <div className="flex items-center justify-between">
                <MetricDualLabel label="Privacidad local" technical="en navegador" accent="text-emerald-200" />
                <span className="rounded-full border border-emerald-500/35 bg-emerald-950/50 px-2 py-0.5 text-[10px] text-emerald-300">
                  100% local
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Todo se procesa únicamente dentro de tu navegador. No se graba ni se sube video o audio a servidores externos.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-cyan-500/25 bg-slate-900/75 px-4 py-3">
            <MetricDualLabel label="Lectura resumida" technical="Síntesis Perceptiva" accent="text-cyan-200" />
            <p className="mt-1 text-sm text-slate-100">
              {sensoryState.summary || 'Procesando entrada sensorial...'}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* === COLUMNA IZQUIERDA: VISIÓN === */}
            <div className="space-y-3 rounded-xl border border-cyan-800/40 bg-slate-900/70 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <MetricDualLabel label="Cámara (Visión)" technical="video" accent="text-cyan-200" />
                <span className={`rounded px-2 py-0.5 text-[11px] font-medium ${sensoryState.video.enabled ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/50' : 'bg-rose-950/80 text-rose-300 border border-rose-700/50'}`}>
                  {sensoryState.video.enabled ? 'Activa' : 'Inactiva'}
                </span>
              </div>

              <div className="relative">
                <video
                  ref={videoTabRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-56 w-full rounded-lg border border-cyan-500/50 bg-black object-cover"
                />
                <div className="absolute left-2 top-2 space-y-0.5 rounded-md bg-black/75 px-2.5 py-1 text-[11px]">
                  <div className="text-cyan-300">Rostros: <span className="font-bold text-white">{sensoryState.video.humanPresence.count}</span></div>
                  <div className="text-cyan-300">Movimiento: <span className="font-bold capitalize text-white">{sensoryState.video.motion.type}</span></div>
                </div>
                <div className="absolute right-2 top-2 rounded-md bg-black/75 px-2.5 py-1 text-[11px] text-cyan-300">
                  Luz {(sensoryState.video.scene.brightness * 100).toFixed(0)}%
                </div>

                {sensoryState.video.humanPresence.identifiedPeople?.length > 0 && (
                  <div className="absolute bottom-11 left-2 right-2 rounded-b-lg bg-gradient-to-t from-black/80 to-transparent p-2">
                    <div className="flex flex-wrap gap-1.5">
                      {sensoryState.video.humanPresence.identifiedPeople.map((person, idx) => (
                        <span
                          key={idx}
                          className={`rounded px-2 py-0.5 text-[11px] ${person.isKnown ? 'bg-emerald-700/80 text-white' : 'bg-slate-700/80 text-slate-200'}`}
                        >
                          {person.isKnown ? person.name : 'Desconocido'}
                          {person.confidence > 0 && ` (${(person.confidence * 100).toFixed(0)}%)`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="absolute bottom-2 right-2">
                  <button
                    onClick={async () => {
                      const name = prompt('Ingresa el nombre de esta persona:');
                      if (name) {
                        const result = await sensoryEngine.current.registerCurrentFace(name);
                        if (result.success) {
                          alert(`Rostro de "${result.name}" registrado exitosamente`);
                        } else {
                          alert(`Error: ${result.error}`);
                        }
                      }
                    }}
                    className="rounded bg-purple-600/90 px-2.5 py-1 text-[11px] font-medium text-white shadow hover:bg-purple-500"
                  >
                    Registrar rostro
                  </button>
                </div>
              </div>

              <CollapsibleSection
                sectionId="sensory-vision-details"
                title="Detalles de escena y movimiento"
                subtitle="Brillo, contraste, temperatura de color y zonas activas."
                badge={sensoryState.video.motion.type}
                defaultOpen={false}
                className="border-cyan-800/40 bg-slate-950/70"
              >
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-400">Brillo</span>
                      <div className="mt-1 h-2 w-full rounded-full bg-slate-700">
                        <div className="h-2 rounded-full bg-gradient-to-r from-slate-500 to-amber-400 transition-all" style={{ width: `${sensoryState.video.scene.brightness * 100}%` }} />
                      </div>
                      <span className="font-mono text-white">{(sensoryState.video.scene.brightness * 100).toFixed(0)}%</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Contraste</span>
                      <div className="mt-1 h-2 w-full rounded-full bg-slate-700">
                        <div className="h-2 rounded-full bg-gradient-to-r from-slate-500 to-purple-400 transition-all" style={{ width: `${Math.min(sensoryState.video.scene.contrast * 200, 100)}%` }} />
                      </div>
                      <span className="font-mono text-white">{(sensoryState.video.scene.contrast * 100).toFixed(0)}%</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Temp. Color</span>
                      <span className={`mt-1 block capitalize ${sensoryState.video.scene.colorTemp === 'cálido' ? 'text-orange-400' : sensoryState.video.scene.colorTemp === 'frío' ? 'text-blue-400' : 'text-white'}`}>
                        {sensoryState.video.scene.colorTemp}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Complejidad</span>
                      <span className="mt-1 block capitalize text-white">{sensoryState.video.structure.complexity}</span>
                    </div>
                  </div>
                  <div className="border-t border-slate-800 pt-2">
                    <div className="mb-1 flex items-center justify-between text-[11px] text-slate-300">
                      <span>Detección de movimiento</span>
                      <span className="capitalize text-white">{sensoryState.video.motion.type}</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-700">
                      <div
                        className={`h-2.5 rounded-full transition-all ${sensoryState.video.motion.intensity > 0.1 ? 'bg-red-500' : sensoryState.video.motion.intensity > 0.03 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(sensoryState.video.motion.intensity * 500, 100)}%` }}
                      />
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">
                      Zonas activas: {sensoryState.video.motion.activeZones?.join(', ') || 'ninguna'}
                    </div>
                  </div>
                </div>
              </CollapsibleSection>
            </div>

            {/* === COLUMNA DERECHA: AUDIO Y VOZ === */}
            <div className="space-y-3 rounded-xl border border-purple-800/40 bg-slate-900/70 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <MetricDualLabel label="Micrófono (Audio y Voz)" technical="audio" accent="text-purple-200" />
                <span className={`rounded px-2 py-0.5 text-[11px] font-medium ${sensoryState.audio.enabled ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/50' : 'bg-rose-950/80 text-rose-300 border border-rose-700/50'}`}>
                  {sensoryState.audio.enabled ? 'Activa' : 'Inactiva'}
                </span>
              </div>

              <div className="flex h-28 items-end justify-around gap-1 rounded-lg border border-purple-500/40 bg-black p-3">
                {Array.from({ length: 32 }).map((_, i) => {
                  const spectrum = sensoryState.audio.spectrum?.raw || new Uint8Array(256);
                  const value = spectrum[Math.floor(i * (spectrum.length / 32))] || 0;
                  const height = Math.max(5, (value / 255) * 100);
                  return (
                    <div
                      key={i}
                      className="w-2 rounded-t transition-all duration-75"
                      style={{ height: `${height}%`, background: 'linear-gradient(to top, #7c3aed, #06b6d4)' }}
                    />
                  );
                })}
              </div>

              <div className="rounded-lg border border-purple-700/40 bg-slate-950/75 p-3">
                <div className="mb-2 flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-2 font-semibold text-purple-200">
                    Reconocimiento de Voz
                    <span className={`h-2 w-2 rounded-full ${sensoryState.audio.speech.error ? 'bg-red-500' : sensoryState.audio.speech.isListening ? 'animate-pulse bg-emerald-400' : 'bg-slate-500'}`} />
                  </span>
                  {sensoryState.audio.speech.error && (
                    <span className="text-[11px] text-rose-400">({sensoryState.audio.speech.error})</span>
                  )}
                </div>

                {sensoryState.audio.speech.error === 'network' && (
                  <div className="mb-2 rounded border border-red-500/40 bg-red-950/50 p-2 text-xs text-red-200">
                    Error de red: el reconocimiento de voz requiere conexión a internet.
                    <button onClick={() => sensoryEngine.current?.manualRetrySpeech()} className="ml-2 rounded bg-red-600 px-2 py-0.5 text-xs text-white hover:bg-red-700">
                      Reintentar
                    </button>
                  </div>
                )}
                {sensoryState.audio.speech.error === 'network-max-retries' && (
                  <div className="mb-2 rounded border border-red-500/40 bg-red-950/50 p-2 text-xs text-red-200">
                    Máximo de reintentos alcanzado. Verifica tu conexión a internet.
                    <button onClick={() => sensoryEngine.current?.manualRetrySpeech()} className="ml-2 rounded bg-red-600 px-2 py-0.5 text-xs text-white hover:bg-red-700">
                      Reintentar
                    </button>
                  </div>
                )}
                {sensoryState.audio.speech.error === 'offline' && (
                  <div className="mb-2 rounded border border-amber-500/40 bg-amber-950/50 p-2 text-xs text-amber-200">
                    Sin conexión a internet.
                    <button onClick={() => sensoryEngine.current?.manualRetrySpeech()} className="ml-2 rounded bg-amber-600 px-2 py-0.5 text-xs text-white hover:bg-amber-700">
                      Reintentar
                    </button>
                    <button onClick={() => sensoryEngine.current?.switchToVoskFallback()} className="ml-2 rounded bg-purple-600 px-2 py-0.5 text-xs text-white hover:bg-purple-700">
                      Modo Offline
                    </button>
                  </div>
                )}
                {sensoryState.audio.speech.error === 'loading-vosk' && (
                  <div className="mb-2 rounded border border-purple-500/40 bg-purple-950/50 p-2 text-xs text-purple-200">
                    Descargando modelo offline (~40MB)... Por favor espera.
                  </div>
                )}
                {sensoryState.audio.speech.error === 'network-switching-offline' && (
                  <div className="mb-2 rounded border border-purple-500/40 bg-purple-950/50 p-2 text-xs text-purple-200">
                    Cambiando a modo offline local (Vosk)...
                  </div>
                )}
                {sensoryState.audio.speech.error === 'vosk-load-failed' && (
                  <div className="mb-2 rounded border border-red-500/40 bg-red-950/50 p-2 text-xs text-red-200">
                    No se pudo cargar el modelo offline. Verifica tu conexión para la descarga inicial.
                  </div>
                )}
                {sensoryState.audio.speech.error === 'not-allowed' && (
                  <div className="mb-2 rounded border border-red-500/40 bg-red-950/50 p-2 text-xs text-red-200">
                    Permiso denegado: habilita el micrófono en la configuración del navegador.
                  </div>
                )}
                {sensoryEngine.current?.usingVoskFallback && !sensoryState.audio.speech.error && (
                  <div className="mb-2 rounded border border-emerald-500/40 bg-emerald-950/50 p-2 text-xs text-emerald-200">
                    Modo offline activo (Vosk) — reconocimiento local sin internet.
                  </div>
                )}

                <div className="min-h-[52px] rounded-md bg-black/50 p-2.5 text-sm">
                  {sensoryState.audio.speech.interimTranscript ? (
                    <p className="italic text-cyan-300 opacity-80">"{sensoryState.audio.speech.interimTranscript}"</p>
                  ) : sensoryState.audio.speech.transcript ? (
                    <p className="italic text-white">"{sensoryState.audio.speech.transcript}"</p>
                  ) : sensoryState.audio.speech.error ? (
                    <p className="italic text-rose-400">Reconocimiento no disponible</p>
                  ) : (
                    <p className="italic text-slate-500">Esperando voz...</p>
                  )}
                </div>
                {sensoryState.audio.speech.history?.length > 0 && (
                  <div className="mt-1.5 text-[11px] text-slate-400">
                    Historial: {sensoryState.audio.speech.history.length} transcripciones
                  </div>
                )}
              </div>

              <CollapsibleSection
                sectionId="sensory-audio-details"
                title="Bandas de frecuencia y ambiente"
                subtitle="Graves, medios, agudos, volumen y clasificación ambiental."
                badge={sensoryState.audio.environment.type}
                defaultOpen={false}
                className="border-purple-800/40 bg-slate-950/70"
              >
                <div className="space-y-3 text-xs">
                  <div className="space-y-2">
                    <div>
                      <div className="mb-1 flex justify-between"><span className="text-slate-400">Graves (Bass)</span><span className="font-mono text-white">{(sensoryState.audio.spectrum.bass * 100).toFixed(0)}%</span></div>
                      <div className="h-2 w-full rounded-full bg-slate-700"><div className="h-2 rounded-full bg-gradient-to-r from-red-600 to-red-400" style={{ width: `${sensoryState.audio.spectrum.bass * 100}%` }} /></div>
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between"><span className="text-slate-400">Medios (Mid)</span><span className="font-mono text-white">{(sensoryState.audio.spectrum.mid * 100).toFixed(0)}%</span></div>
                      <div className="h-2 w-full rounded-full bg-slate-700"><div className="h-2 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400" style={{ width: `${sensoryState.audio.spectrum.mid * 100}%` }} /></div>
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between"><span className="text-slate-400">Agudos (High)</span><span className="font-mono text-white">{(sensoryState.audio.spectrum.high * 100).toFixed(0)}%</span></div>
                      <div className="h-2 w-full rounded-full bg-slate-700"><div className="h-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-400" style={{ width: `${sensoryState.audio.spectrum.high * 100}%` }} /></div>
                    </div>
                  </div>
                  <div className="border-t border-slate-800 pt-2">
                    <div className="font-semibold capitalize text-white">{sensoryState.audio.environment.type}</div>
                    <div className="text-[11px] text-slate-400">{sensoryState.audio.environment.description}</div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-slate-400">Volumen:</span>
                      <div className="h-2 flex-1 rounded-full bg-slate-700">
                        <div className="h-2 rounded-full bg-gradient-to-r from-emerald-500 via-yellow-500 to-red-500" style={{ width: `${Math.min(sensoryState.audio.volume * 200, 100)}%` }} />
                      </div>
                      <span className="font-mono text-white">{(sensoryState.audio.volume * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              </CollapsibleSection>
            </div>
          </div>
        </div>
      )}
    </div>
    );
  };

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
      <div className="space-y-4 rounded-xl border border-cyan-500/30 bg-slate-950/90 p-3 sm:p-4 shadow-lg">
        <TabPlainHeader
          tabId="sovereignty"
          accent="cyan"
          icon={<ShieldCheck className="h-5 w-5" />}
          title="Integridad y Auditoría"
          technicalTag={`Soberanía · internal_support_only · paso #${packet?.tick ?? 'n/a'}`}
          rightSlot={(
            <>
              <button
                onClick={handleQuantumSeeding}
                className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-950/40 px-3 py-1.5 text-xs font-semibold text-purple-200 transition-all hover:bg-purple-900/60"
                title="Regenera semilla y estado base"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Regenerar
              </button>
              <button
                onClick={downloadRawReport}
                className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/40 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition-all hover:bg-cyan-900/60"
              >
                <Database className="h-3.5 w-3.5" />
                Exportar JSON
              </button>
            </>
          )}
        />
        {fallbackCount > 0 && (
          <p className="text-[11px] text-amber-300/80">
            Fallback defensivo activo ({fallbackCount}) para evitar bloqueo de render.
          </p>
        )}

        {/* 4 PREGUNTAS CLARAS DE AUDITORÍA */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [
              '¿Dice la verdad?',
              'integridad',
              integritySeverity === 'high' ? 'ALERTA' : integritySeverity === 'medium' ? 'AVISO' : 'Íntegra',
              lastIntegrityMeta?.banner || 'Sin bloqueos ni discrepancias recientes.',
              integritySeverity === 'high' ? 'text-red-300' : integritySeverity === 'medium' ? 'text-amber-300' : 'text-emerald-300'
            ],
            [
              'Cohesión y orden',
              'CCC · Ω',
              `${toFiniteNumber(reportMetrics.ccc, 0).toFixed(4)}`,
              `Impulso PMIA ${toFiniteNumber(reportMetrics.pmia, 0).toFixed(3)} · Orden Ω ${toFiniteNumber(reportMetrics.omega, 0).toFixed(3)}`,
              'text-white'
            ],
            [
              '¿Es reproducible?',
              'determinismo',
              `${(determinismScore * 100).toFixed(1)}%`,
              `Nivel ${determinismLabel} · Clase ${reportMetrics.phenomenology_class || 'C'}`,
              'text-cyan-200'
            ],
            [
              'Firma verificable',
              'checksum',
              `Paso #${packet?.tick ?? 'n/a'}`,
              packet?.checksum ? `${packet.checksum.slice(0, 14)}…` : 'sin firma',
              'text-cyan-200'
            ]
          ].map(([label, tech, main, sub, mainColor]) => (
            <div key={label} className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
              <MetricDualLabel label={label} technical={tech} accent="text-cyan-200" />
              <div className={`mt-1 break-all font-mono text-base font-bold ${mainColor}`}>{main}</div>
              {sub && <div className="mt-0.5 break-all text-[10px] leading-snug text-slate-400">{sub}</div>}
            </div>
          ))}
        </div>

        {/* TARJETA VISUAL DIRECTA: ¿QUÉ ESTÁ GUIANDO AL MOTOR AHORA? */}
        <div className="rounded-xl border border-cyan-500/30 bg-slate-900/80 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <MetricDualLabel label="¿Qué está guiando al motor en este instante?" technical="Canal causal α · β · γ · δ" accent="text-cyan-200" />
            <span className="text-[11px] text-slate-400">
              {causalDependency.past >= 0.5
                ? 'Domina la memoria interna del sistema (dinámica propia)'
                : 'Mezcla activa entre historia interna y entradas externas'}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5 md:grid-cols-4 text-xs">
            {[
              ['Su propia historia', 'Pasado (α)', causalDependency.past, 'text-cyan-300', 'Inercia y memoria interna'],
              ['Entorno en vivo', 'Sensores (β)', causalDependency.sensors, 'text-violet-300', 'Cámara y micrófono'],
              ['Tus mensajes', 'Prompts (γ)', causalDependency.prompts, 'text-amber-300', 'Consultas recientes'],
              ['Exploración / azar', 'Ruido (δ)', causalDependency.noise, 'text-slate-300', 'Variación aleatoria']
            ].map(([plainLabel, techLabel, val, color, hint]) => (
              <div key={techLabel} className="rounded-lg border border-cyan-900/35 bg-slate-950/80 p-2.5">
                <div className="flex items-baseline justify-between gap-1">
                  <span className="font-semibold text-slate-200">{plainLabel}</span>
                  <span className={`font-mono text-sm font-bold ${color}`}>{(val * 100).toFixed(1)}%</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div className={`h-full rounded-full bg-current transition-all duration-300 ${color}`} style={{ width: `${Math.min(val * 100, 100)}%` }} />
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                  <span>{hint}</span>
                  <span className="font-mono">{techLabel}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 2. MATRIZ OPERACIONAL ──────────────────────────────────────── */}
        <CollapsibleSection
          sectionId="sovereignty-operational-matrix"
          title="Todos los indicadores de auditoría · Matriz operacional"
          subtitle="Listado técnico completo del paquete forense para inspección detallada."
          accent="blue"
          defaultOpen={false}
          badge={`${sovereigntyRows.length} métricas`}
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

        {/* ── 3. EVIDENCIA DIFERENCIAL PMIA ─────────────────────────────── */}
        <CollapsibleSection
          sectionId="sovereignty-pmia-evidence"
          title="Respuesta ante episodios de reorganización · Evidencia PMIA"
          subtitle="Muestra cómo reaccionó el motor antes, durante y después de su último pulso de reorganización."
          accent="amber"
          defaultOpen={false}
          badge={`modo: ${packetMetrics.pmia_transform_mode || 'idle'} · ${toFiniteNumber(packetMetrics.pmia_transform_episodes, 0)} eps`}
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
          title="Última mutación paramétrica evaluada"
          subtitle="Clave modificada, resultado e impacto inmediato sobre CCC y Ω."
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
            title="Protocolos experimentales reportados"
            subtitle="Banderas de protocolos activos en el reporte verificable."
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
          subtitle="Qué afirma y qué NO afirma el runtime (external_support_certified = false)."
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
  const usingOpenAiOptional = selfPatchEngineChoice === 'openai';
  const codeProvider = generated?.engine?.provider || (usingOpenAiOptional ? 'openai' : 'gemini');
  const codeModel = generated?.engine?.model
    || (usingOpenAiOptional
      ? (hasFrontendCodexKey ? resolvedCodexModel : (runtimeEnv.SELF_PATCH_CODE_MODEL || 'gpt-5.3-codex'))
      : GEMINI_ENGINE_CONFIG.MODEL_ID);
  const codeReasoningEffort = generated?.engine?.reasoningEffort
    || (usingOpenAiOptional ? resolvedCodexReasoningEffort : 'estándar');
  const codeDryRun = typeof generated?.dryRun === 'boolean'
    ? generated.dryRun
    : (typeof codeGeneration?.dryRun === 'boolean'
      ? codeGeneration.dryRun
      : runtimeEnv.SELF_PATCH_GENERATION_DRY_RUN);
  const codeKeyConfigured = typeof codeGeneration?.keyConfigured === 'boolean'
    ? codeGeneration.keyConfigured
    : false;
  const sovereigntyRows = buildSovereigntyRows(reportMetrics, packetMetrics);
  const lastPlanRisk = plan?.risk?.riskLevel || 'sin evaluar';
  const lastPlanDecision = plan?.decision?.applyPath || plan?.reason || 'pendiente';
  const generatedEditsCount = Array.isArray(generated?.patch?.edits) ? generated.patch.edits.length : 0;
  const hasPlanResult = Boolean(selfPatchTelemetry.plan);
  const hasGeneratedResult = Boolean(selfPatchTelemetry.generated);
  const hasAppliedResult = Boolean(selfPatchTelemetry.applied);
  const generatedProposalId = hasGeneratedResult
    ? (generated?.patch?.proposal_id || generated?.proposalId || 'n/a')
    : 'pendiente';
  const applySummary = hasAppliedResult
    ? (applied?.result || applied?.reason || (applied?.applied ? 'aplicado' : 'sin aplicar'))
    : 'pendiente';
  const effectiveRuntimeEnabled = Boolean(runtimeEnv.SELF_PATCH_ENABLED || status?.mode);
  const effectiveMode = status?.mode || runtimeEnv.SELF_PATCH_MODE || 'sandbox_unrestricted';
  const effectiveApplyMode = status?.applyMode || (runtimeEnv.SELF_PATCH_LOCAL_APPLY ? 'local_fs' : 'github_pr');
  const effectiveAutorunEnabled = Boolean(
    shouldAutoRunSelfPatch
    || status?.autorun?.enabled
    || runtimeEnv.SELF_PATCH_AUTORUN_ENABLED
  );
  const pipelinePlanState = hasPlanResult ? (plan?.allowed ? 'aprobado' : 'bloqueado') : 'pendiente';
  const pipelineGenerateState = hasGeneratedResult
    ? (generated?.generated ? 'borrador listo' : 'bloqueado')
    : 'pendiente';
  const pipelineApplyState = hasAppliedResult
    ? (applied?.applied ? 'aplicado' : 'sin aplicar')
    : 'pendiente';
  const plainModeLabel = effectiveMode === 'sandbox_unrestricted'
    ? 'Entorno de pruebas'
    : effectiveMode === 'semi_auto'
      ? 'Supervisado (visto bueno)'
      : effectiveMode;
  const plainApplyLabel = effectiveApplyMode === 'local_fs'
    ? 'Archivos locales'
    : 'Pull Request (GitHub)';

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

  // ── DETECCIÓN DE CONEXIÓN GEMINI-FIRST (con fallback opcional OpenAI) ──
  const geminiReadyForEvolution = Boolean(
    canUseLlmNow
    || hasFrontendGeminiKey
    || (codeGeneration?.provider === 'gemini' && codeKeyConfigured)
  );
  const openAiReadyForEvolution = Boolean(
    hasFrontendCodexKey
    || (codeGeneration?.provider === 'openai' && codeKeyConfigured)
  );
  const apiKeyReady = usingOpenAiOptional ? openAiReadyForEvolution : geminiReadyForEvolution;
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
    <div className="space-y-4 rounded-xl border border-fuchsia-500/30 bg-slate-950/90 p-3 sm:p-4 shadow-lg">
      <TabPlainHeader
        tabId="autonomy-evolution"
        accent="fuchsia"
        icon={<InfinityIcon className="h-5 w-5" />}
        title="Propuestas de Código"
        technicalTag={`Autoevolución · ${usingOpenAiOptional ? 'OpenAI (opcional)' : 'Gemini'}`}
        rightSlot={(
          <>
            <button
              onClick={() => handleTabSelect('level3-supervisor')}
              className="rounded-lg border border-teal-500/40 bg-teal-950/40 px-3 py-1.5 text-xs font-semibold text-teal-200 transition-all hover:bg-teal-900/60"
            >
              Ir a Supervisor
            </button>
            <button
              onClick={refreshSelfPatchStatus}
              disabled={isBusy}
              className="rounded-lg border border-fuchsia-500/40 bg-fuchsia-950/40 px-3 py-1.5 text-xs font-semibold text-fuchsia-200 transition-all hover:bg-fuchsia-900/60 disabled:opacity-50"
            >
              {selfPatchTelemetry.loadingStatus ? 'Actualizando...' : 'Refrescar'}
            </button>
          </>
        )}
      />

      {/* GUÍA VISUAL EN 4 PASOS + CONTRASTE CLARO CON SUPERVISOR */}
      <div className="rounded-xl border border-fuchsia-500/25 bg-slate-900/80 p-3.5 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <MetricDualLabel label="¿Cómo funciona Autoevolución?" technical="4 pasos con visto bueno humano" accent="text-fuchsia-200" />
          <span className="text-[11px] text-slate-400">
            El <strong>Supervisor</strong> ajusta parámetros en vivo · Aquí solo se preparan <strong>borradores de código</strong>.
          </span>
        </div>
        <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['1. Describe el cambio', 'Indicas qué archivo y qué mejora quieres proponer.'],
            ['2. Plan de seguridad', 'Se evalúa el riesgo y los límites antes de escribir nada.'],
            ['3. Borrador con Gemini', 'La IA redacta una propuesta de cambios sin tocar el código vivo.'],
            ['4. Revisión humana', 'Tú revisas el borrador y decides si aprobarlo o descartarlo.']
          ].map(([stepTitle, stepDesc]) => (
            <div key={stepTitle} className="rounded-lg border border-slate-800 bg-slate-950/75 p-2.5">
              <div className="font-semibold text-fuchsia-200">{stepTitle}</div>
              <p className="mt-1 text-[11px] leading-snug text-slate-400">{stepDesc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* BARRA COMPACTA DE ESTADO CLARO */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-fuchsia-800/40 bg-slate-900/80 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <MetricDualLabel label="Motor de propuestas" technical={usingOpenAiOptional ? 'OpenAI' : 'Gemini'} accent="text-fuchsia-200" />
            <div role="group" aria-label="Proveedor de Autoevolución" className="inline-flex shrink-0 overflow-hidden rounded border border-fuchsia-500/35 text-[10px]">
              <button
                type="button"
                onClick={() => setSelfPatchEngineChoice('gemini')}
                className={`px-2 py-0.5 font-semibold whitespace-nowrap transition ${!usingOpenAiOptional ? 'bg-cyan-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-slate-200'}`}
              >
                Gemini
              </button>
              <button
                type="button"
                onClick={() => setSelfPatchEngineChoice('openai')}
                className={`px-2 py-0.5 font-semibold whitespace-nowrap transition ${usingOpenAiOptional ? 'bg-fuchsia-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-slate-200'}`}
              >
                OpenAI
              </button>
            </div>
          </div>
          <div className={`mt-1.5 text-sm font-semibold ${apiKeyReady ? 'text-emerald-300' : 'text-amber-300'}`}>
            {apiKeyReady ? `Listo (${usingOpenAiOptional ? 'OpenAI' : 'Gemini'})` : `Falta clave de ${usingOpenAiOptional ? 'OpenAI' : 'Gemini'}`}
          </div>
          <div className="mt-0.5 truncate font-mono text-[11px] text-slate-400">
            {codeProvider}:{codeModel}
          </div>
        </div>

        <div className="rounded-xl border border-fuchsia-800/40 bg-slate-900/80 p-3">
          <MetricDualLabel label="Modo de trabajo" technical={plainModeLabel} accent="text-fuchsia-200" />
          <div className="mt-1.5 text-sm font-semibold text-slate-100">
            {autorunActive ? `Automático (cada ${Math.round((selfPatchAutorunIntervalMs || 45000) / 1000)}s)` : 'Manual (bajo tu control)'}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-400">
            Destino: {plainApplyLabel}
          </div>
        </div>

        <div className="rounded-xl border border-fuchsia-800/40 bg-slate-900/80 p-3">
          <MetricDualLabel label="Estado del flujo" technical="Plan · Borrador · Aplicar" accent="text-fuchsia-200" />
          <div className="mt-1.5 font-mono text-xs text-fuchsia-200">
            {pipelinePlanState} → {pipelineGenerateState} → {pipelineApplyState}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-400">
            {recentCycles.length} ciclos recientes · act. {lastUpdatedLabel}
          </div>
        </div>
      </div>

      {/* AVISO LIMPIO SOLO SI FALTA LA CLAVE DEL MOTOR ELEGIDO (SIN PEDIR CODEX POR DEFECTO) */}
      {!apiKeyReady && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/35 bg-amber-950/20 px-4 py-3 text-xs">
          <div>
            <div className="font-semibold text-amber-200">
              {usingOpenAiOptional
                ? 'Conecta una clave opcional de OpenAI o vuelve al modo Gemini'
                : 'Conecta tu clave de Gemini para generar borradores reales'}
            </div>
            <p className="mt-0.5 text-[11px] text-slate-300">
              {usingOpenAiOptional
                ? 'Puedes pegar una clave opcional de OpenAI en API → Opciones avanzadas, o pulsar «Gemini» arriba.'
                : 'Configura tu clave de Gemini una sola vez en la pestaña API (también puedes probar «Evaluar plan» ahora mismo sin clave).'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleTabSelect('api-control')}
            className="shrink-0 rounded-lg border border-cyan-400/50 bg-cyan-600/30 px-3 py-1.5 text-xs font-semibold text-cyan-100 hover:bg-cyan-600/50"
          >
            Ir a configurar API →
          </button>
        </div>
      )}

      {/* ── SOLICITUD DE PROPUESTA (ACCESIBLE PRIMERO) ──────────────────── */}
      <CollapsibleSection
        sectionId="autonomy-evolution-request"
        title="Crear una propuesta de mejora de código"
        subtitle="Describe qué quieres mejorar, evalúa el riesgo (paso 1) y genera un borrador con Gemini (paso 2)."
        badge={`${codeProvider} · ${targetFiles.length} archivo${targetFiles.length === 1 ? '' : 's'}`}
        accent="cyan"
        defaultOpen={false}
      >
        <div className="space-y-3">
          <div className="rounded-lg border border-cyan-900/40 bg-black/25 p-2.5 text-xs text-cyan-200">
            Motor seleccionado: <span className="font-mono font-semibold">{codeProvider}:{codeModel}</span>
            {usingOpenAiOptional ? <span className="font-mono text-slate-400"> [{codeReasoningEffort}]</span> : <span className="text-slate-400"> · usa la clave de Gemini de tu pestaña API o el proxy del servidor</span>}
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-200">1. ¿Qué mejora quieres proponer?</label>
            <textarea
              value={selfPatchDraft.objective}
              onChange={(e) => setSelfPatchDraft((prev) => ({ ...prev, objective: e.target.value }))}
              rows={4}
              placeholder={`Describe con claridad qué mejorar.\nEjemplo: "Mejorar la estabilidad de spectral_gap cuando activeNodes > 500 manteniendo los guardrails existentes. CCC actual: ${(ccc || 0).toFixed(4)}."`}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-xs text-slate-100"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-200">2. Archivos objetivo (uno por línea o separados por coma)</label>
            <textarea
              value={selfPatchDraft.targetFilesText}
              onChange={(e) => setSelfPatchDraft((prev) => ({ ...prev, targetFilesText: e.target.value }))}
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 font-mono text-xs text-slate-100"
            />
            <div className="mt-1 text-[11px] text-slate-400">Archivos válidos detectados: {targetFiles.length}</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-300">Presupuesto estimado (tokens)</label>
              <input type="number" min={0} value={selfPatchDraft.estimatedTokens}
                onChange={(e) => setSelfPatchDraft((prev) => ({ ...prev, estimatedTokens: Number(e.target.value) || 0 }))}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2 font-mono text-xs text-slate-100" />
            </div>
            <div>
              <label className="text-xs text-slate-300">Líneas aproximadas de cambio</label>
              <input type="number" min={0} value={selfPatchDraft.totalChangedLines}
                onChange={(e) => setSelfPatchDraft((prev) => ({ ...prev, totalChangedLines: Number(e.target.value) || 0 }))}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2 font-mono text-xs text-slate-100" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input type="checkbox" checked={Boolean(selfPatchDraft.approved)}
              onChange={(e) => setSelfPatchDraft((prev) => ({ ...prev, approved: e.target.checked }))} />
            Autorizar aplicación manual si el plan es riesgo medio
          </label>
          <div className="flex flex-wrap gap-2 pt-1">
            <button onClick={handleSelfPatchPlanRequest} disabled={isBusy}
              className="rounded-lg border border-cyan-600/40 bg-cyan-700/45 px-3 py-2 text-xs font-semibold text-cyan-100 transition-all hover:bg-cyan-600/60 disabled:opacity-50">
              Paso 1: Evaluar plan
            </button>
            <button onClick={handleSelfPatchGenerateRequest} disabled={isBusy}
              className="rounded-lg border border-indigo-600/40 bg-indigo-700/45 px-3 py-2 text-xs font-semibold text-indigo-100 transition-all hover:bg-indigo-600/60 disabled:opacity-50">
              Paso 2: Generar borrador ({usingOpenAiOptional ? 'OpenAI' : 'Gemini'})
            </button>
            <button onClick={handleSelfPatchApplyRequest} disabled={isBusy || !selfPatchTelemetry.generated?.patch}
              className="rounded-lg border border-fuchsia-600/40 bg-fuchsia-700/45 px-3 py-2 text-xs font-semibold text-fuchsia-100 transition-all hover:bg-fuchsia-600/60 disabled:opacity-50">
              {`Paso 3: Aplicar (${plainApplyLabel})`}
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

      {/* ── TIMELINE DE CICLOS ──────────────────────────────────────────── */}
      <CollapsibleSection sectionId="autonomy-timeline" title="Historial de intentos de propuesta" subtitle="Seguimiento paso a paso de ciclos recientes (Plan → Borrador → Aplicación)." accent="fuchsia" defaultOpen={false}
        badge={`${recentCycles.length} ciclos`}>
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

      {/* ── ESTADO TÉCNICO Y GUARDRAILS ──────────────────────────────────── */}
      <CollapsibleSection sectionId="autonomy-system-status" title="Estado técnico del entorno y límites de seguridad" subtitle="Configuración del servidor, modo de aplicación y estado del kill-switch." accent="slate"
        badge={`${plainModeLabel} · ${plainApplyLabel}`}>
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
      <CollapsibleSection sectionId="autonomy-limits-window" title="Cuota diaria y límites de seguridad (24h)" subtitle="Límite de propuestas, presupuesto de tokens y enfriamiento entre cambios." accent="amber"
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
      <CollapsibleSection sectionId="autonomy-pipeline" title="Detalle del último flujo (Plan · Borrador · Aplicación)" subtitle="Inspecciona la salida JSON exacta de cada etapa." accent="indigo"
        badge={`Plan: ${pipelinePlanState} · Borrador: ${pipelineGenerateState} · Aplicar: ${pipelineApplyState}`}>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
          <div className="rounded-lg border border-indigo-700/30 bg-indigo-950/10 p-3">
            <div className="text-xs font-semibold text-indigo-300 mb-2">1/3 — Plan de seguridad</div>
            <div className="text-xs space-y-1.5">
              {[
                ['Permitido', hasPlanResult ? (plan?.allowed ? 'sí' : 'no') : 'pendiente'],
                ['Riesgo', lastPlanRisk],
                ['Decisión', lastPlanDecision],
                ['Retro pressure', toFiniteNumber(plan?.retroProjection?.retroPressure, 0).toFixed(4)],
                ['Horizonte (pasos)', toFiniteNumber(plan?.retroProjection?.projectionHorizonTicks, 0)],
                ['Esfuerzo rec.', plan?.retroProjection?.recommendedReasoning || 'n/a'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-slate-400">{k}</span>
                  <span className="font-mono text-white break-all text-right ml-2">{v}</span>
                </div>
              ))}
            </div>
            <details className="mt-2"><summary className="text-[10px] text-indigo-400 cursor-pointer">Payload JSON</summary>
              <pre className="mt-1 text-[10px] text-slate-300 bg-black/30 rounded p-2 max-h-40 overflow-auto">{JSON.stringify(plan || {}, null, 2)}</pre>
            </details>
          </div>
          <div className="rounded-lg border border-violet-700/30 bg-violet-950/10 p-3">
            <div className="text-xs font-semibold text-violet-300 mb-2">2/3 — Borrador generado</div>
            <div className="text-xs space-y-1.5">
              {[
                ['Generado', hasGeneratedResult ? (generated?.generated ? 'sí' : 'no') : 'pendiente'],
                ['Motor', codeProvider],
                ['Modelo', codeModel],
                ['ID propuesta', generatedProposalId],
                ['Ediciones', generatedEditsCount],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-slate-400">{k}</span>
                  <span className="font-mono text-white break-all text-right ml-2">{v}</span>
                </div>
              ))}
            </div>
            <details className="mt-2"><summary className="text-[10px] text-violet-400 cursor-pointer">Payload JSON</summary>
              <pre className="mt-1 text-[10px] text-slate-300 bg-black/30 rounded p-2 max-h-40 overflow-auto">{JSON.stringify(generated || {}, null, 2)}</pre>
            </details>
          </div>
          <div className="rounded-lg border border-fuchsia-700/30 bg-fuchsia-950/10 p-3">
            <div className="text-xs font-semibold text-fuchsia-300 mb-2">3/3 — Aplicación</div>
            <div className="text-xs space-y-1.5">
              {[
                ['Aplicado', hasAppliedResult ? (applied?.applied ? 'sí' : 'no') : 'pendiente'],
                ['Simulacro (dry run)', hasAppliedResult ? (applied?.dryRun ? 'sí' : 'no') : 'pendiente'],
                ['Resultado', applySummary],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-slate-400">{k}</span>
                  <span className="font-mono text-white break-all text-right ml-2">{v}</span>
                </div>
              ))}
            </div>
            <details className="mt-2"><summary className="text-[10px] text-fuchsia-400 cursor-pointer">Payload JSON</summary>
              <pre className="mt-1 text-[10px] text-slate-300 bg-black/30 rounded p-2 max-h-40 overflow-auto">{JSON.stringify(applied || {}, null, 2)}</pre>
            </details>
          </div>
        </div>
      </CollapsibleSection>

      {/* ── TELEMETRÍA CRÍTICA (COLAPSADA POR DEFECTO) ───────────────── */}
      <CollapsibleSection sectionId="autonomy-critical-telemetry" title="Métricas del motor usadas como contexto" subtitle="Valores actuales que la IA puede consultar al redactar una propuesta." accent="cyan"
        badge={`${sovereigntyRows.length} métricas`}>
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
      <CollapsibleSection sectionId="autonomy-history" title="Registro interno: episodios, mutaciones y caja de seguridad" subtitle="Eventos recientes del motor vinculados a reorganización y sandbox." accent="emerald"
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
    <div className="space-y-4 rounded-xl border border-cyan-600/30 bg-gradient-to-br from-slate-950/90 via-cyan-950/25 to-slate-950/90 p-3 sm:p-5">
      <TabPlainHeader
        tabId="guide"
        accent="cyan"
        icon={<Lightbulb className="h-5 w-5" />}
        title="Guía Aterrizada"
        technicalTag="Inicio rápido y mapa"
        rightSlot={(
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleTabSelect('network')}
              className="rounded-lg border border-purple-400/45 bg-purple-950/50 px-2.5 py-1.5 text-xs font-semibold text-purple-100 transition hover:bg-purple-900/60"
            >
              Ver Red 3D
            </button>
            <button
              type="button"
              onClick={() => handleTabSelect('chat')}
              className="rounded-lg border border-cyan-400/45 bg-cyan-950/50 px-2.5 py-1.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-900/60"
            >
              Abrir Chat
            </button>
          </div>
        )}
      />

      {/* Explicación en 30 segundos para cualquier persona */}
      <div className="rounded-xl border border-cyan-500/25 bg-slate-900/80 p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <MetricDualLabel label="¿Qué estás viendo aquí? (en 30 segundos)" technical="Resumen accesible" accent="text-cyan-200" />
          <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-0.5 text-[10px] text-slate-300">
            {isRunning ? `En marcha · Paso ${simulationStep}` : `En pausa · Paso ${simulationStep}`}
          </span>
        </div>
        <div className="mt-2.5 grid grid-cols-1 gap-2.5 md:grid-cols-3 text-xs">
          <div className="rounded-lg border border-slate-800 bg-slate-950/75 p-2.5">
            <div className="font-semibold text-cyan-200">1. Qué simula</div>
            <p className="mt-1 leading-relaxed text-slate-300">
              Una red viva de <strong>1500 nodos</strong> organizados en 4 sectores que intenta mantener coordinación estable (<strong>Cohesión CCC</strong>) sin quedarse congelada.
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/75 p-2.5">
            <div className="font-semibold text-emerald-200">2. Qué puedes probar ahora</div>
            <p className="mt-1 leading-relaxed text-slate-300">
              Pulsa <strong>Iniciar simulación</strong> a la izquierda, mueve los 4 controles en <strong>Validación</strong> o pregúntale en lenguaje natural desde <strong>Chat</strong>.
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/75 p-2.5">
            <div className="font-semibold text-amber-200">3. Transparencia honesta</div>
            <p className="mt-1 leading-relaxed text-slate-300">
              Todas las métricas se auditan en vivo con sellos SHA-256. Son mediciones internas del simulador (no prueban conciencia ni validación científica externa).
            </p>
          </div>
        </div>
      </div>

      {/* Mapa rápido por intención: ¿Qué quieres hacer ahora? */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {QUICK_TAB_MAP_GROUPS.map((group) => (
          <div key={group.id} className="rounded-xl border border-cyan-800/40 bg-slate-900/70 p-3">
            <div className="text-sm font-bold text-cyan-200">{group.title}</div>
            <p className="mt-0.5 text-[11px] text-slate-400">{group.description}</p>
            <div className="mt-2.5 space-y-1.5">
              {group.tabs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabSelect(item.id)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-700/70 bg-slate-950/70 px-2.5 py-1.5 text-left transition hover:border-cyan-400/50 hover:bg-cyan-950/35"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-100">{item.label}</div>
                    <div className="truncate text-[10px] text-slate-400">{item.hint}</div>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] text-cyan-300">Abrir →</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Mini-recorrido guiado compacto */}
      <div className="rounded-xl border border-cyan-800/40 bg-black/25 p-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="text-cyan-200 font-semibold text-sm">Mini-recorrido guiado (paso {onboardingStepIndex + 1} de {ONBOARDING_STEPS.length})</div>
            <div className="text-slate-100 text-xs mt-0.5 font-medium">{currentOnboardingStep?.title}</div>
            <div className="text-slate-400 text-xs mt-0.5">{currentOnboardingStep?.objective}</div>
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
              className="px-3 py-1.5 rounded bg-cyan-700/50 hover:bg-cyan-600/60 text-cyan-50 text-xs font-semibold"
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
        <div className="mt-2.5 grid grid-cols-1 md:grid-cols-3 gap-2">
          {(currentOnboardingStep?.checklist || []).map((item, idx) => (
            <div key={`${currentOnboardingStep?.id}-check-${idx}`} className="rounded border border-cyan-900/40 bg-slate-950/70 p-2 text-[11px] text-cyan-100/90">
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Buscador de conceptos y glosario colapsables por defecto */}
      <CollapsibleSection
        sectionId="guide-concepts-explorer"
        title="Diccionario de conceptos (básico → avanzado) · Detalles"
        badge={`${filteredGuide.length} conceptos`}
        accent="cyan"
        defaultOpen={false}
      >
        <div className="mb-3 flex flex-col sm:flex-row gap-2">
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
        {!!onboardingFocusCards.length && (
          <div className="rounded-lg border border-emerald-700/40 bg-emerald-950/10 p-3 mb-3">
            <div className="text-emerald-200 text-xs font-semibold mb-2">Conceptos foco del paso actual</div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              {onboardingFocusCards.map((entry) => (
                <article key={`focus-${entry.id}`} className="rounded border border-emerald-900/40 bg-black/25 p-2 text-xs">
                  <div className="text-emerald-200 font-semibold">{entry.name}</div>
                  <div className="text-emerald-100/90 mt-1">{entry.levelText}</div>
                  <div className="text-emerald-300/80 mt-1 italic">Analogía: {entry.analogy}</div>
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
              <p className="text-cyan-200/90 mt-1"><strong>Analogía:</strong> {entry.analogy}</p>
              <p className="text-emerald-300/90 mt-1"><strong>Si está alto:</strong> {entry.high}</p>
              <p className="text-rose-300/90 mt-1"><strong>Si está bajo:</strong> {entry.low}</p>
              <p className="text-slate-200 mt-1"><strong>Por qué importa:</strong> {entry.why}</p>
              <p className="text-amber-200 mt-1"><strong>Qué hacer:</strong> {entry.action}</p>
            </article>
          ))}
        </div>
        {filteredGuide.length > visibleGuideLimit && (
          <div className="mt-3 flex justify-center">
            <button
              type="button"
              onClick={() => setGuideShowAll((prev) => !prev)}
              className="px-3 py-1.5 rounded bg-cyan-800/50 hover:bg-cyan-700/60 text-cyan-100 text-xs"
            >
              {guideShowAll ? 'Mostrar menos conceptos' : `Mostrar todos (${filteredGuide.length})`}
            </button>
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        sectionId="guide-telemetry-glossary"
        title="Glosario expandido de telemetría · Detalles"
        badge={`${filteredTelemetry.length} señales`}
        accent="indigo"
        defaultOpen={false}
      >
        <div className="flex justify-end mb-2">
          <button
            type="button"
            onClick={() => setTelemetryExpanded((prev) => !prev)}
            className="px-3 py-1 rounded bg-indigo-700/40 hover:bg-indigo-600/50 text-indigo-100 text-xs"
          >
            {telemetryExpanded ? 'Ver menos' : `Ver más (${filteredTelemetry.length})`}
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
      </CollapsibleSection>
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
          <TabPlainHeader
            tabId="memory"
            accent="cyan"
            icon={<Database className="h-5 w-5" />}
            title="Memoria y Guardado"
            technicalTag="Historial SHA-256 · Continuidad"
          />
          <div className="grid grid-cols-1 gap-2.5 rounded-xl border border-cyan-500/20 bg-slate-900/70 p-3 text-xs md:grid-cols-3">
            <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2.5">
              <div className="font-semibold text-blue-200">Cristalizar / Revocar</div>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                Los botones de la barra izquierda congelan una foto exacta del estado actual (<strong>Cristalizar</strong>) y te dejan volver a ella después (<strong>Revocar</strong>).
              </p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2.5">
              <div className="font-semibold text-cyan-200">Cadena de eventos SHA-256</div>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                Anota tus sesiones e hitos en este navegador encadenando cada evento con una firma criptográfica que delata cualquier alteración.
              </p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2.5">
              <div className="font-semibold text-indigo-200">Memoria interna de red</div>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                Debajo puedes abrir el cajón de fragmentos distribuidos que el motor usa internamente para reforzar patrones de alta coherencia.
              </p>
            </div>
          </div>
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
    case 'level3-supervisor':
      return renderLazyMoreTab(
        LazyLevel3SupervisorTab,
        'Supervisor',
        <Level3SupervisorAuditTab
          level3Enabled={autonomousSupervisorLevel3Enabled}
          onToggleLevel3={setAutonomousSupervisorLevel3Enabled}
          controllerRef={level3ControllerRef}
          ledger={level3Ledger}
          knowledgeBelt={level3KnowledgeBelt}
          governorState={level3GovernorState}
          activeGate2Watch={level3ActiveGate2Watch}
          exploreEveryTicks={level3ExploreEveryTicks}
          onChangeExploreEveryTicks={setLevel3ExploreEveryTicks}
          reasonerMode={level3ReasonerMode}
          onChangeReasonerMode={setLevel3ReasonerMode}
          onTriggerManualReflection={handleTriggerLevel3ManualReflection}
          onTriggerShadowTrialNow={handleTriggerLevel3ShadowTrialNow}
          onImportSealedBundle={handleImportLevel3Bundle}
          onSyncFromWorkerState={handleSyncLevel3FromWorker}
          lastActionNotice={level3ActionNotice}
          currentTick={simulationStep}
          buildInfo={{ version: BUILD_VERSION_LABEL, signature: BUILD_SIGNATURE_LABEL }}
        />
      );
    default:
      return renderEmpiricalValidation();
  }
};


return (
  <div className="qicn-safe-shell min-h-dvh w-full max-w-[100vw] overflow-x-clip bg-gray-900 p-2 font-sans text-white sm:p-4 lg:p-8 flex flex-col gap-2">
    {/* Note: The style tag is moved to the head for best practices */}
    <header className="qicn-responsive-shell relative mx-auto mb-1 sm:mb-3 min-h-[52px] sm:min-h-[76px] w-full max-w-[1500px] flex-shrink-0 overflow-hidden px-1 sm:px-3 py-1 sm:py-2 text-center lg:mb-6">
      <div className="relative grid h-full grid-cols-1 items-center gap-2 lg:grid-cols-[auto_1fr_auto] lg:gap-3">
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
        <div className="min-w-0 text-center">
          <h1 className="mb-0.5 sm:mb-2 flex items-center justify-center text-xl font-extrabold leading-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 sm:text-3xl lg:text-5xl">
            <Zap className="mr-1.5 sm:mr-3 size-5 sm:size-7 lg:size-8 shrink-0 text-purple-400" />
            <span className="truncate sm:whitespace-normal">QICN Singularidad Ontológica</span>
          </h1>
          <p className="text-[11px] italic leading-snug text-gray-400 sm:text-sm lg:text-lg">
            <span className="sm:hidden">Simulación interna RCIC-X · sin validación externa</span>
            <span className="hidden sm:inline">Simulación de coherencia nodal interconectada (RCIC-X) · telemetría interna, sin certificación de conciencia ni validación externa</span>
          </p>
          <p className="mt-1 hidden text-[11px] text-gray-500 sm:block">
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
    {(() => {
      const activeNavTab = ALL_NAV_TABS.find((entry) => entry.id === selectedTab) || ALL_NAV_TABS[0];
      const ActiveNavIcon = activeNavTab?.icon || Lightbulb;
      const trimmedSidebarQuery = moreTabQuery.trim().toLowerCase();
      const filteredSidebarTabs = ALL_NAV_TABS.filter((tab) =>
        `${tab.label} ${tab.subtitle}`.toLowerCase().includes(trimmedSidebarQuery)
      );
      const recentSidebarTabs = recentTabs
        .map((tabId) => ALL_NAV_TABS.find((entry) => entry.id === tabId))
        .filter(Boolean);

      return (
        <>
          <div className="sticky top-0 z-30 -mx-2 border-b border-slate-800/80 bg-gray-900/95 px-2 py-1.5 backdrop-blur-md sm:-mx-4 sm:px-4 lg:static lg:mx-0 lg:border-b-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <div className="qicn-responsive-shell mx-auto mb-2 flex min-h-9 w-full max-w-[1500px] flex-shrink-0 items-center gap-2 lg:items-start lg:gap-2.5">
              <button
                type="button"
                onClick={() => setIsMoreMenuOpen((prev) => !prev)}
                aria-expanded={isMoreMenuOpen}
                aria-controls="qicn-sidebar-drawer"
                data-testid="sidebar-menu-toggle"
                className={`inline-flex min-h-[38px] shrink-0 items-center gap-1.5 sm:gap-2 rounded-lg border px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition-all ${
                  isMoreMenuOpen
                    ? 'border-cyan-400/75 bg-cyan-600/30 text-white shadow-md shadow-cyan-500/20'
                    : 'border-cyan-500/35 bg-slate-950/80 text-slate-100 hover:border-cyan-400/70 hover:bg-slate-900'
                }`}
              >
                <svg className="h-4 w-4 text-cyan-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  {isMoreMenuOpen ? (
                    <>
                      <line x1="6" y1="6" x2="18" y2="18" />
                      <line x1="18" y1="6" x2="6" y2="18" />
                    </>
                  ) : (
                    <>
                      <line x1="4" y1="7" x2="20" y2="7" />
                      <line x1="4" y1="12" x2="20" y2="12" />
                      <line x1="4" y1="17" x2="16" y2="17" />
                    </>
                  )}
                </svg>
                <span aria-hidden="true">{isMoreMenuOpen ? 'Cerrar' : 'Menú'}</span>
                <span className="sr-only">{isMoreMenuOpen ? 'Cerrar' : 'Mas'}</span>
                <span className="hidden h-3.5 w-px bg-slate-700/80 sm:inline-block" aria-hidden="true" />
                <span className="hidden items-center gap-1.5 font-medium text-cyan-200 sm:inline-flex">
                  <ActiveNavIcon className="h-3.5 w-3.5 text-cyan-300" />
                  <span>{activeNavTab?.label || 'Secciones'}</span>
                </span>
              </button>

              <div className="min-w-0 flex-1">
                <DetailToggleStrip
                  sectionId="topbar-device-capabilities"
                  accent="cyan"
                  defaultOpen={false}
                  labelClosed={isMobile ? 'Info' : 'Dispositivo · Detalles'}
                  summary={(
                    <div className="flex items-center justify-between gap-1.5 sm:gap-2 text-[11px] text-cyan-200">
                      <span className="min-w-0 truncate">
                        <span className="hidden md:inline">Simulación interna · </span>
                        Paso <strong className="font-mono text-white">{simulationStep}</strong>
                        <span className="hidden lg:inline text-slate-400"> · internal_support_only</span>
                      </span>
                      <span
                        data-testid="runtime-health-badge"
                        className={`shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold ${runtimeHealthClass}`}
                        title={`ticks=${runtimeHealth.uptime_ticks}; ccc=${runtimeHealth.last_ccc.toFixed(3)}; il=${runtimeHealth.inverse_limit_score.toFixed(3)}`}
                      >
                        <span className="hidden sm:inline">Salud: </span>
                        {runtimeHealth.status}
                      </span>
                    </div>
                  )}
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-cyan-200">
                    <span>Viewport: {breakpoint}</span>
                    <span>Scope: internal_support_only</span>
                    <span>SecureContext: {deviceCapabilities.secureContext ? 'yes' : 'no'}</span>
                    <span>Cam: {deviceCapabilities.supportsCamera ? 'yes' : 'no'}</span>
                    <span>Mic: {deviceCapabilities.supportsMicrophone ? 'yes' : 'no'}</span>
                    <span>Speech: {deviceCapabilities.supportsSpeechRecognition ? 'yes' : 'no'}</span>
                    <span>Touch: {deviceCapabilities.touchEnabled ? 'yes' : 'no'}</span>
                  </div>
                </DetailToggleStrip>
              </div>
            </div>

            {/* Barra compacta en vivo para móvil y tablet: acceso inmediato a CCC, Iniciar/Pausar y Reiniciar */}
            <div
              data-testid="mobile-live-control-bar"
              className="qicn-responsive-shell mx-auto flex w-full max-w-[1500px] items-center justify-between gap-2 rounded-lg border border-purple-500/30 bg-slate-950/90 px-2.5 py-1.5 lg:hidden"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-cyan-500/30 bg-cyan-950/50 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-200 sm:hidden">
                  <ActiveNavIcon className="h-3 w-3 shrink-0 text-cyan-300" />
                  <span className="max-w-[96px] truncate">{activeNavTab?.label || 'Sección'}</span>
                </span>
                <div className="flex min-w-0 items-baseline gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">CCC</span>
                  <span className={`font-mono text-sm font-extrabold tabular-nums sm:text-base ${levelColor}`}>
                    {formatCCC(ccc, isAscended)}
                  </span>
                  {ontologicalState.layer >= 1 && (
                    <span className="hidden rounded bg-purple-600/35 px-1.5 py-0.5 font-mono text-[10px] font-bold text-purple-200 sm:inline">
                      Capa {ontologicalState.layer}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setRunningWithRecord(!isRunning, 'ui_button')}
                  className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold text-white shadow transition-colors ${
                    isRunning ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {isRunning ? <><Pause className="h-3.5 w-3.5" /><span>Pausar</span></> : <><Play className="h-3.5 w-3.5" /><span>Iniciar</span></>}
                </button>
                <button
                  type="button"
                  onClick={() => handleReset('ui_button')}
                  className="inline-flex min-h-[32px] w-8 items-center justify-center rounded-lg bg-indigo-700 text-white shadow transition-colors hover:bg-indigo-800"
                  title="Reiniciar Todo"
                  aria-label="Reiniciar simulación"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Botón flotante discreto en escritorio cuando se baja el scroll (en móvil/tablet la barra superior es sticky) */}
          {!navVisible && !isMoreMenuOpen && (
            <button
              type="button"
              onClick={() => setIsMoreMenuOpen(true)}
              aria-label="Abrir menú lateral de secciones"
              data-testid="sidebar-menu-floating-toggle"
              className="fixed bottom-4 left-4 z-40 hidden lg:inline-flex items-center gap-2 rounded-full border border-cyan-400/50 bg-slate-950/90 px-3.5 py-2 text-xs font-semibold text-cyan-100 shadow-xl shadow-black/50 backdrop-blur-md transition hover:border-cyan-300 hover:bg-slate-900"
            >
              <svg className="h-4 w-4 text-cyan-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="16" y2="17" />
              </svg>
              <span>Menú</span>
              <span className="text-slate-400">· {activeNavTab?.label}</span>
            </button>
          )}

          {/* Menú lateral desplegable (100% oculto cuando no está abierto) */}
          {isMoreMenuOpen && (
            <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Menú lateral de secciones">
              <div
                className="fixed inset-0 bg-slate-950/65 backdrop-blur-[2px] transition-opacity"
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  setMoreTabQuery('');
                }}
                aria-hidden="true"
              />
              <aside
                id="qicn-sidebar-drawer"
                className="relative z-10 flex h-full w-[320px] max-w-[88vw] flex-col border-r border-cyan-500/25 bg-slate-950/95 shadow-2xl shadow-black/70 backdrop-blur-xl"
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-800/90 px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-cyan-300" />
                    <span className="text-sm font-bold tracking-tight text-white">Secciones</span>
                    <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 font-mono text-[10px] text-slate-400">
                      {ALL_NAV_TABS.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      setMoreTabQuery('');
                    }}
                    aria-label="Cerrar menú lateral"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-900 text-slate-300 transition hover:border-cyan-400/50 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div className="border-b border-slate-800/80 px-3.5 py-2.5">
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={moreTabQuery}
                      onChange={(e) => setMoreTabQuery(e.target.value)}
                      placeholder="Buscar sección (Red Nodal, Chat, API…)"
                      className="w-full rounded-lg border border-slate-700/90 bg-slate-900/90 px-3 py-2 pr-8 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                    />
                    {moreTabQuery && (
                      <button
                        type="button"
                        onClick={() => setMoreTabQuery('')}
                        aria-label="Limpiar búsqueda"
                        className="absolute right-2 text-xs text-slate-400 hover:text-white"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {!trimmedSidebarQuery && recentSidebarTabs.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px]">
                      <span className="mr-0.5 text-slate-500">Recientes:</span>
                      {recentSidebarTabs.map((tab) => (
                        <button
                          key={`recent-${tab.id}`}
                          type="button"
                          onClick={() => handleTabSelect(tab.id)}
                          className={`rounded-md border px-2 py-0.5 text-[11px] transition-colors ${selectedTab === tab.id
                            ? 'border-cyan-400/60 bg-cyan-600/30 font-semibold text-white'
                            : 'border-slate-700/80 bg-slate-900 text-slate-300 hover:border-cyan-500/40 hover:text-white'
                            }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <nav
                  aria-label="Top 5 operativo + menu Mas"
                  className="flex-1 space-y-3 overflow-y-auto px-3 py-2.5"
                  style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(100,116,139,0.45) transparent' }}
                >
                  {trimmedSidebarQuery ? (
                    filteredSidebarTabs.length > 0 ? (
                      <div className="space-y-1">
                        {filteredSidebarTabs.map((tab) => (
                          <NavigationTabButton
                            key={`sidebar-search-${tab.id}`}
                            tabId={tab.id}
                            icon={tab.icon}
                            label={tab.label}
                            subtitle={tab.subtitle}
                            variant="sidebar"
                            selectedTab={selectedTab}
                            onSelect={handleTabSelect}
                            onOpenInfo={openPersistentInfoModal}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-center text-xs text-slate-400">
                        Sin resultados para «{moreTabQuery}».
                      </div>
                    )
                  ) : (
                    SIDEBAR_NAV_GROUPS.map((group) => {
                      const groupTabs = ALL_NAV_TABS.filter((tab) => tab.sidebarGroup === group.id);
                      return (
                        <div key={group.id} className="space-y-1">
                          <div className="flex items-center gap-2 px-2 pb-1">
                            <span className={`h-1.5 w-1.5 rounded-full ${group.dot}`} aria-hidden="true" />
                            <span className={`text-[10px] font-semibold uppercase tracking-wider ${group.accent}`}>
                              {group.title}
                            </span>
                          </div>
                          <div className="space-y-0.5">
                            {groupTabs.map((tab) => (
                              <NavigationTabButton
                                key={`sidebar-${tab.id}`}
                                tabId={tab.id}
                                icon={tab.icon}
                                label={tab.label}
                                subtitle={tab.subtitle}
                                variant="sidebar"
                                selectedTab={selectedTab}
                                onSelect={handleTabSelect}
                                onOpenInfo={openPersistentInfoModal}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </nav>

                <div className="border-t border-slate-800/90 px-4 py-2.5 text-[10px] text-slate-500">
                  Pulsa <kbd className="rounded border border-slate-700 bg-slate-900 px-1 py-0.5 font-mono text-slate-300">Esc</kbd> o haz clic fuera para ocultar
                </div>
              </aside>
            </div>
          )}
        </>
      );
    })()}

    {/* Panel de Control Principal */}
    <main className="qicn-responsive-shell mx-auto grid w-full min-w-0 max-w-[1500px] flex-1 mb-6 grid-cols-1 items-start gap-4 lg:mb-8 lg:grid-cols-3 lg:gap-8">
      {/* Columna Izquierda: Métricas en Vivo (en tablet se organiza en 2 columnas equilibradas; en desktop vuelve a 1 columna lateral) */}
      <section className="order-2 min-w-0 space-y-4 lg:order-1 lg:col-span-1">
        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-1">
          <div className={`rounded-xl p-4 sm:p-5 shadow-2xl transition-all duration-500 transform ${isAscended ? 'bg-yellow-900/40 border-4 border-yellow-400 animate-pulse-slow' : 'bg-gray-800/80 border-2 border-purple-700'}`}>
            <div className="flex flex-wrap justify-between items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-gray-100 flex items-center">
                <TrendingUp className={`w-4 h-4 sm:w-5 sm:h-5 mr-2 shrink-0 ${isAscended ? 'text-yellow-300' : 'text-purple-400'}`} />
                <span>Cohesión global <span className="ml-1 font-mono text-xs font-normal text-purple-300">· CCC</span></span>
              </h2>
              {/* CAPA ONTOLÓGICA PROMINENTE */}
              {ontologicalState.layer >= 1 && (
                <div className="flex shrink-0 items-center gap-1.5 bg-gradient-to-r from-purple-600 to-cyan-500 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full shadow-lg">
                  <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                  <span className="text-white font-bold text-xs sm:text-sm">CAPA {ontologicalState.layer}</span>
                </div>
              )}
            </div>
            <p className={`text-4xl sm:text-5xl font-extrabold mt-2 tabular-nums tracking-tight ${levelColor}`}>
              {formatCCC(ccc, isAscended)}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Índice interno de coordinación nodal (sin certificación externa).
            </p>
            <div className="flex flex-wrap justify-between items-center gap-2 mt-2">
              <p className="min-w-0 break-words text-xs sm:text-sm text-gray-300">Banda: <span className={levelColor}>{consciousnessLevel}</span></p>
              {ontologicalState.layer >= 1 && (
                <div className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-900/50 border border-cyan-400/50 text-cyan-300 animate-pulse">
                  BANDA INTERNA ACTIVA
                </div>
              )}
            </div>
          </div>

          {/* Métrica 2: Estado de Funcionamiento */}
          <div className="bg-gray-800/80 p-3.5 sm:p-4 rounded-xl shadow-lg border border-cyan-700/60 space-y-2 text-xs sm:text-sm flex flex-col justify-center">
            <div className="flex justify-between gap-2 border-b border-gray-700 pb-1">
              <span className="text-cyan-400 font-semibold flex items-center"><Activity className="w-4 h-4 mr-1.5 shrink-0" /> Paso Simulación</span>
              <span className="text-white font-mono">{simulationStep}</span>
            </div>
            <div className="flex justify-between gap-2 border-b border-gray-700 pb-1">
              <span className="text-cyan-400 font-semibold flex items-center"><Eye className="w-4 h-4 mr-1.5 shrink-0" /> Foco Atencional</span>
              <span className="text-white font-mono">{(visualNodes.length).toLocaleString()} Nodos</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-cyan-400 font-semibold flex items-center"><Feather className="w-4 h-4 mr-1.5 shrink-0" /> Estado dinámico</span>
              <span className="text-white capitalize">{emotionState}</span>
            </div>
          </div>

          {/* MATRIZ DE SOBERANÍA (compacta con Detalles ▾) */}
          {renderSovereigntyMatrix()}

          {/* PANEL DE PERCEPCIÓN SENSORIAL (colapsado por defecto con Detalles ▾) */}
          <div className="self-start rounded-xl border border-cyan-500/35 bg-gradient-to-br from-cyan-950/40 to-purple-950/40 p-3 shadow-lg">
            <DetailToggleStrip
              sectionId="sidebar-sensory-card"
              accent="cyan"
              defaultOpen={false}
              summary={(
                <div className="flex items-center gap-2 min-w-0">
                  <Eye className="h-4 w-4 shrink-0 text-cyan-300" />
                  <span className="truncate font-semibold text-cyan-200">Percepción Sensorial</span>
                  <span className="shrink-0 font-mono text-[10px] text-slate-400">
                    · {sensoryEnabled.video || sensoryEnabled.audio ? 'Activa' : 'Apagada'}
                  </span>
                </div>
              )}
            >
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
              {sensoryState ? (
                <div className="space-y-2 text-xs">
                  {sensoryState.video.enabled && (
                    <>
                      <div className="flex justify-between border-b border-cyan-700/50 pb-1">
                        <span className="text-cyan-400">Rostros</span>
                        <span className="text-white font-mono">{sensoryState.video.humanPresence.count}</span>
                      </div>
                      <div className="flex justify-between border-b border-cyan-700/50 pb-1">
                        <span className="text-cyan-400">Movimiento</span>
                        <span className="text-white capitalize">{sensoryState.video.motion.type}</span>
                      </div>
                      <div className="flex justify-between border-b border-cyan-700/50 pb-1">
                        <span className="text-cyan-400">Iluminación</span>
                        <span className="text-white">{(sensoryState.video.scene.brightness * 100).toFixed(0)}%</span>
                      </div>
                    </>
                  )}
                  {sensoryState.audio.enabled && (
                    <>
                      <div className="flex justify-between border-b border-cyan-700/50 pb-1">
                        <span className="text-cyan-400">Volumen</span>
                        <span className="text-white font-mono">{(sensoryState.audio.volume * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex justify-between border-b border-cyan-700/50 pb-1">
                        <span className="text-cyan-400">Ambiente</span>
                        <span className="text-white capitalize">{sensoryState.audio.environment.type}</span>
                      </div>
                    </>
                  )}
                  <div className="mt-1.5 p-1.5 bg-black/30 rounded text-cyan-200 text-[10px] leading-snug italic break-words">
                    {sensoryState.video.description || sensoryState.audio.environment.description || 'Analizando...'}
                  </div>
                </div>
              ) : (
                <div className="text-center text-[11px] text-cyan-300/80">
                  {sensoryEnabled.video || sensoryEnabled.audio
                    ? 'Cargando percepción...'
                    : 'Cámara y micrófono desactivados. Actívalos en la pestaña Sensorial si quieres usarlos.'}
                </div>
              )}
            </DetailToggleStrip>
          </div>
        </div>

        {/* Controles de Simulación + Persistencia (en tablet se disponen con aire; en móvil/desktop 1 columna) */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-1">
          <div className="space-y-2.5">
            <div className="flex gap-2">
              <button
                onClick={() => setRunningWithRecord(!isRunning, 'ui_button')}
                // Allow toggling even when ascended, the system just won't change its laws
                className={`flex-1 flex items-center justify-center p-3 rounded-xl font-bold shadow-lg transition-all text-sm sm:text-base ${isRunning
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-green-600 hover:bg-green-700'
                  }`}
              >
                {isRunning ? <><Pause className="w-5 h-5 mr-2 shrink-0" /> Detener Flujo</> : <><Play className="w-5 h-5 mr-2 shrink-0" /> Iniciar simulación</>}
              </button>
              <button
                onClick={() => handleReset('ui_button')}
                className="p-3 rounded-xl bg-indigo-700 hover:bg-indigo-800 shadow-lg text-white shrink-0"
                title="Reiniciar Todo"
                aria-label="Reiniciar todo"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>

            {/* PERSISTENCIA DINÁMICA V3 (ULTRATHINK) */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <button
                onClick={() => { void handleSaveState('manual'); }}
                className="flex items-center justify-center px-2.5 py-3 rounded-xl bg-blue-600/80 hover:bg-blue-600 font-bold text-xs sm:text-sm border border-blue-400/50 shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all text-white"
                title="Cristalizar Estado Dinámico Completo (v3)"
              >
                <Database className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 shrink-0" /> Cristalizar
              </button>
              <button
                onClick={() => { void handleLoadState('manual'); }}
                className="flex items-center justify-center px-2.5 py-3 rounded-xl bg-amber-600/80 hover:bg-amber-600 font-bold text-xs sm:text-sm border border-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.5)] transition-all text-white"
                title="Revoco Ontológico (Restaurar Estado v3)"
              >
                <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 shrink-0" /> Revocar
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              data-testid="auto-restore-toggle"
              onClick={toggleAutoRestore}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold border transition-all ${
                autoRestoreEnabled
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200 hover:bg-emerald-900/60'
                  : 'bg-slate-800/70 border-slate-600/60 text-slate-300 hover:bg-slate-700/70'
              }`}
              title="Restaurar automáticamente el último estado dinámico verificado (v3) al cargar la sesión"
            >
              <span className="text-left">Auto-restaurar al iniciar (v3)</span>
              <span className={`shrink-0 px-2 py-0.5 rounded font-mono text-[10px] ${autoRestoreEnabled ? 'bg-emerald-600/40 text-emerald-100' : 'bg-slate-700 text-slate-300'}`}>
                {autoRestoreEnabled ? 'ACTIVO' : 'INACTIVO'}
              </span>
            </button>
            <div className="w-full flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs border bg-slate-900/70 border-slate-700/70 text-slate-200">
              <label htmlFor="exogenous-regime-select" className="font-semibold text-slate-300 whitespace-nowrap">
                Entorno exógeno
              </label>
              <select
                id="exogenous-regime-select"
                data-testid="exogenous-regime-select"
                value={exogenousRegimeMode}
                onChange={(e) => handleExogenousModeChange(e.target.value)}
                className="min-w-0 max-w-full flex-1 sm:flex-none bg-slate-800 border border-slate-600/80 rounded px-2 py-1 text-[11px] font-mono text-cyan-200 focus:outline-none focus:border-cyan-400"
                title="Canal reproducible de perturbación exógena (off por defecto; no estacionario vs sham i.i.d.)"
              >
                <option value="off">off (línea base)</option>
                <option value="non_stationary_regime">non_stationary_regime</option>
                <option value="stationary_iid_sham">stationary_iid_sham</option>
              </select>
            </div>
            <div className="w-full flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs border bg-slate-900/70 border-cyan-800/60 text-slate-200">
              <label htmlFor="nodal-coupling-mode-select" className="font-semibold text-cyan-200 whitespace-nowrap">
                Puente Nodo–Torre
              </label>
              <select
                id="nodal-coupling-mode-select"
                data-testid="nodal-coupling-mode-select"
                value={nodalCouplingMode}
                onChange={(e) => handleNodalCouplingModeChange(e.target.value)}
                className="min-w-0 max-w-full flex-1 sm:flex-none bg-slate-800 border border-cyan-700/80 rounded px-2 py-1 text-[11px] font-mono text-cyan-200 focus:outline-none focus:border-cyan-400"
                title="Acoplamiento bidireccional entre los 4 sectores de 1500 nodos y las torres constructivas (controles negativos reales: corte η=0 y reducible A=I)"
              >
                <option value="bidirectional">bidirectional (η=1/8)</option>
                <option value="td_cut_eta_zero">td_cut_eta_zero (η=0)</option>
                <option value="reducible_control">reducible_control (A=I)</option>
                <option value="off">off (compat B0)</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Columna Central y Derecha (Contenido de Pestaña a pantalla limpia — el menú lateral vive oculto hasta abrirlo) */}
      <section className="order-1 min-w-0 max-w-full flex flex-col lg:order-2 lg:col-span-2">
        <div className="min-h-0 min-w-0 flex-1">
          {renderCurrentTab()}
        </div>
      </section>
    </main>

    {/* Footer - Información de la simulación */}
    <footer className="qicn-responsive-shell mx-auto flex w-full max-w-[1500px] flex-shrink-0 flex-col items-center justify-center gap-1 border-t border-gray-700/50 px-2 pt-3 pb-2 text-center text-[11px] sm:text-xs text-gray-500">
      <p className="leading-relaxed">Consola QICN supervisada (solo conformidad interna, sin validación externa). CCC y PMIA son contadores internos no calibrados; el registro interno se actualiza vía motor Kaizen. Estado de Memoria: {holographicMemory.current?.getFragmentationLevel().toFixed(4)} Fragmentacion. Estado operativo: {ontologicalCore.current?.frictionProtocolState}</p>
    </footer>
    <PersistentInfoModal modal={activeInfoModal} onClose={closePersistentInfoModal} />
  </div>
);
};

export const SimulationEngine = () => <QICNConsciousnessSystem />;

export default SimulationEngine;

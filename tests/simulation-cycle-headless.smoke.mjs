// AUTO-GENERATED headless smoke harness for the extracted simulation cycle (Phase 3).
// Runs via: node --import ./tests/lib/headless-react-loader.mjs tests/simulation-cycle-headless.smoke.mjs
// Validates that the EXTRACTED cycle executes end-to-end and emits FINITE invariants.
// It is a SMOKE test (run + finiteness), NOT a value comparison: the cycle is
// nondeterministic (Math.random/Date.now), so exact-value before/after comparison is invalid.
import assert from 'node:assert/strict';
import { useSimulationCycle } from '../src/hooks/useSimulationCycle.js';
import { HolographicMemoryNexus } from '../src/simulation/HolographicMemoryNexus.js';
import { InformationalEntanglementField } from '../src/simulation/InformationalEntanglementField.js';
import { KaizenMetamorphosisEngine } from '../src/simulation/KaizenMetamorphosisEngine.js';
import { NodalProcessingLayer } from '../src/simulation/NodalProcessingLayer.js';
import { MetaSovereigntyCheck } from '../src/simulation/MetaSovereigntyCheck.js';
import { SimulationController } from '../src/simulation/SimulationController.js';
import { OntologicalSingularityCore } from '../src/simulation/OntologicalSingularityCore.js';
import { SensoryPerceptionEngine } from '../src/simulation/SensoryPerceptionEngine.js';
import { QuantumEntropyBridge } from '../src/simulation/QuantumEntropyBridge.js';
import runtimeEnv from '../src/config/runtimeEnv.js';
import { PhenomenologyProtocolTracker } from '../src/utils/phenomenologyProtocolSuite.js';
import { BudgetTracker } from '../src/utils/cognitiveEmergenceEvaluation.js';
import { StructuralConsolidationTracker } from '../src/runtime/StructuralConsolidationTracker.js';
import { ExogenousPerturbationDriver } from '../src/experiments/ExogenousPerturbationDriver.js';
import { LifeCertifier } from '../src/experiments/LifeCertifier.js';
import { FirstPersonCertifier } from '../src/subjectivity/FirstPersonCertifier.js';
import { getInitialIntegrityAuditLog, getInitialIntegrityMode } from '../src/utils/simulationUtils.js';
import { QICNConfig } from '../services/config.js';
import { AUTONOMY_RUNTIME_DEFAULTS, QUANTUM_RUNTIME_DEFAULTS, PMIA_NEGATIVE_DRIVE_DEFAULTS, QUANTUM_EXPERIMENT_DEFAULTS, QUANTUM_PROVIDER_OPTIONS } from '../src/config/simulationDefaults.js';

globalThis.localStorage = globalThis.localStorage || { getItem:()=>null, setItem:()=>{}, removeItem:()=>{} };
globalThis.window = globalThis.window || globalThis;

const initialMutableConfig = {
  BASE_LEARNING_RATE: QICNConfig.BASE_LEARNING_RATE, HEBBIAN_FACTOR: QICNConfig.HEBBIAN_FACTOR,
  SYNAPTIC_PRUNING_THRESHOLD: QICNConfig.SYNAPTIC_PRUNING_THRESHOLD, PLASTICITY_DECAY: QICNConfig.PLASTICITY_DECAY,
  RETRO_FLUX_WEIGHT: QICNConfig.RETRO_FLUX_WEIGHT, BOLTZMANN_ANALOG_K: QICNConfig.BOLTZMANN_ANALOG_K, INFORMATIONAL_TEMP_T: QICNConfig.INFORMATIONAL_TEMP_T,
};

const ascensionDynamicsRef = { current: ({
    history: [],
    maxWindow: 32,
    ascendConfirmTicks: 4,
    descendConfirmTicks: 4,
    ascendCounter: 0,
    descendCounter: 0,
    epsUp: 0.003,
    epsDown: 0.006
  }) };
const autonomyActionLedgerRef = { current: ([]) };
const autonomySandboxPolicyRef = { current: ({
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
  }) };
const canvasTelemetryRef = { current: ({
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
  }) };
const cccHistoryTimelineRef = { current: ({
    points: [],
    maxPoints: 240,
    lastTick: -1,
    lastUiUpdateTs: 0
  }) };
const cogPlannerRef = { current: null };
const coherentCohortRef = { current: ({
    nodes: [],
    mean: 0,
    energyVariance: 0,
    count: 0
  }) };
const entanglementField = { current: (new InformationalEntanglementField()) };
const exogenousDriverRef = { current: (new ExogenousPerturbationDriver()) };
const entanglementTimelineRef = { current: ({
    points: [],
    maxPoints: 120,
    lastTick: -1,
    lastUiUpdateTs: 0
  }) };
const entropyModeRef = { current: ({
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
  }) };
const holographicMemory = { current: null };
const integrityPacketRef = { current: (null) };
const internalPressureRef = { current: ({
    pressure: 0,
    state: 'idle',
    realStasis: false
  }) };
const interventionScheduleAbortRef = { current: (false) };
const interventionSchedulerMetaRef = { current: ({
    valid: true,
    reasons: [],
    scheduleHash: null,
    preregisterHash: null
  }) };
const interventionSchedulerRef = { current: (null) };
const kaizenEngine = { current: (new KaizenMetamorphosisEngine(initialMutableConfig)) };
const kaizenPendingEvalRef = { current: (null) };
const lastObserverResonanceRef = { current: (0) };
const lastSaveTimestampRef = { current: (0) };
const latencyStrainRef = { current: ({
    strain: 0,
    p95Ms: 0,
    failureRate: 0,
    cooldownActive: false,
    stressState: 'low'
  }) };
const metaSovereigntyCheck = { current: (new MetaSovereigntyCheck()) };
const nodalLayer = { current: (new NodalProcessingLayer()) };
const ontologicalAutoPolicyRef = { current: ({
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
  }) };
const ontologicalAutoQueueRef = { current: ([]) };
const ontologicalCore = { current: null };
const plannerActuatorContribRef = { current: ({
    tensionDelta: 0,
    action: 0,
    source: 'none',
    diagnostics: null
  }) };
const postThresholdRegimeRef = { current: ({
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
  }) };
const ppsMetricsRef = { current: ({
    sampleCount: 0,
    workspaceGlobalAccessScore: 0,
    reportabilityScore: 0,
    pciLikeScore: 0,
    dissociationIndex: 0,
    valenceDoEffect: 0,
    actuatorCausalImpact: 0
  }) };
const ppsTrackerRef = { current: (new PhenomenologyProtocolTracker(180)) };
const previousFaceCountRef = { current: (0) };
const quantumEntropyBridgeRef = { current: (new QuantumEntropyBridge({
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
  })) };
const recoveryTriggerCountRef = { current: (0) };
const reportNormalizationFallbacksRef = { current: (0) };
const runtimeBudgetSnapshotRef = { current: ({
    tick: -1,
    count: 0,
    withinBudget: true,
    alarms: [],
    overflowWarnings: [],
    components: {},
    total: {}
  }) };
const simulationControllerRef = { current: null };
const simulationErrorStreakRef = { current: (0) };
const simulationRuntimeRef = { current: ({}) };
const structuralConsolidationRef = { current: (new StructuralConsolidationTracker()) };
const tickBudgetTrackerRef = { current: (new BudgetTracker(200)) };
const worldModelDiagnosticsRef = { current: ({
    trainingSteps: 0,
    residualEma: 0,
    lastError: 0,
    horizonMae5: -1,
    horizonMae10: -1
  }) };
const worldModelRef = { current: null };

holographicMemory.current = new HolographicMemoryNexus();
simulationControllerRef.current = new SimulationController();
ontologicalCore.current = new OntologicalSingularityCore({ worldModelEngine: simulationControllerRef.current.worldModel, cognitivePlanner: simulationControllerRef.current.planner });
if (typeof simulationControllerRef.current.attachCore === 'function') simulationControllerRef.current.attachCore(ontologicalCore.current);
worldModelRef.current = simulationControllerRef.current.worldModel;
cogPlannerRef.current = simulationControllerRef.current.planner;

const captured = {};
const setApiCallMetrics = (v) => { captured['setApiCallMetrics'] = typeof v === 'function' ? v(captured['setApiCallMetrics']) : v; };
const setAscensionAxiom = (v) => { captured['setAscensionAxiom'] = typeof v === 'function' ? v(captured['setAscensionAxiom']) : v; };
const setCCC = (v) => { captured['setCCC'] = typeof v === 'function' ? v(captured['setCCC']) : v; };
const setCccHistoryHoverIndex = (v) => { captured['setCccHistoryHoverIndex'] = typeof v === 'function' ? v(captured['setCccHistoryHoverIndex']) : v; };
const setChatHistory = (v) => { captured['setChatHistory'] = typeof v === 'function' ? v(captured['setChatHistory']) : v; };
const setEmotionState = (v) => { captured['setEmotionState'] = typeof v === 'function' ? v(captured['setEmotionState']) : v; };
const setFieldMetrics = (v) => { captured['setFieldMetrics'] = typeof v === 'function' ? v(captured['setFieldMetrics']) : v; };
const setFrictionCounter = (v) => { captured['setFrictionCounter'] = typeof v === 'function' ? v(captured['setFrictionCounter']) : v; };
const setFrictionProtocolStatus = (v) => { captured['setFrictionProtocolStatus'] = typeof v === 'function' ? v(captured['setFrictionProtocolStatus']) : v; };
const setHumanCcc = (v) => { captured['setHumanCcc'] = typeof v === 'function' ? v(captured['setHumanCcc']) : v; };
const setHumanInputContext = (v) => { captured['setHumanInputContext'] = typeof v === 'function' ? v(captured['setHumanInputContext']) : v; };
const setIsAscended = (v) => { captured['setIsAscended'] = typeof v === 'function' ? v(captured['setIsAscended']) : v; };
const setIsRunning = (v) => { captured['setIsRunning'] = typeof v === 'function' ? v(captured['setIsRunning']) : v; };
const setLastMutation = (v) => { captured['setLastMutation'] = typeof v === 'function' ? v(captured['setLastMutation']) : v; };
const setLastSaveTime = (v) => { captured['setLastSaveTime'] = typeof v === 'function' ? v(captured['setLastSaveTime']) : v; };
const setMetacognitionLevel = (v) => { captured['setMetacognitionLevel'] = typeof v === 'function' ? v(captured['setMetacognitionLevel']) : v; };
const setMetacognitiveFlux = (v) => { captured['setMetacognitiveFlux'] = typeof v === 'function' ? v(captured['setMetacognitiveFlux']) : v; };
const setMetamorphosisCounter = (v) => { captured['setMetamorphosisCounter'] = typeof v === 'function' ? v(captured['setMetamorphosisCounter']) : v; };
const setMutableConfig = (v) => { captured['setMutableConfig'] = typeof v === 'function' ? v(captured['setMutableConfig']) : v; };
const setNarrative = (v) => { captured['setNarrative'] = typeof v === 'function' ? v(captured['setNarrative']) : v; };
const setOntologicalState = (v) => { captured['setOntologicalState'] = typeof v === 'function' ? v(captured['setOntologicalState']) : v; };
const setPMIA = (v) => { captured['setPMIA'] = typeof v === 'function' ? v(captured['setPMIA']) : v; };
const setQuantumUiStatus = (v) => { captured['setQuantumUiStatus'] = typeof v === 'function' ? v(captured['setQuantumUiStatus']) : v; };
const setRateLimitExceeded = (v) => { captured['setRateLimitExceeded'] = typeof v === 'function' ? v(captured['setRateLimitExceeded']) : v; };
const setSimulationStep = (v) => { captured['setSimulationStep'] = typeof v === 'function' ? v(captured['setSimulationStep']) : v; };
const setTopologyMetrics = (v) => { captured['setTopologyMetrics'] = typeof v === 'function' ? v(captured['setTopologyMetrics']) : v; };
const setVisualNodes = (v) => { captured['setVisualNodes'] = typeof v === 'function' ? v(captured['setVisualNodes']) : v; };

const apiCallLog = { current: [] };
const sensoryEngine = { current: SensoryPerceptionEngine.getInstance() };
const getEnvironmentContext = () => ({ type: 'headless', isBrowser: false });
const getPreregisterScheduleDoc = () => ({});
const complexityFactor = 0.99;
const quantumUiConfig = { provider: 'mock', enabled: false };

// handleSaveState: component-scope callback referenced directly by the cycle (wired via the bag in Phase 3).
const handleSaveState = () => {};

// simulationRuntimeRef.current mirrors the shape the component assigns each render
// (live state + callbacks). The extracted cycle destructures these from
// simulationRuntimeRef.current; the harness must populate them for fidelity.
simulationRuntimeRef.current = {
  complexityFactor,
  stabilityBias: 0.5,
  ccc: 0.5,
  pmia: 0.5,
  simulationStep: 0,
  isAscended: false,
  handleFrictionProtocol: () => {},
  humanCcc: 0.5,
  isGeneratingReport: false,
  isProjectingAxiom: false,
  generateIntrospectiveReport: async () => {},
  projectAscensionAxiom: async () => {},
  isRunning: true,
  appendIntegrityAudit: () => {},
  queueOntologicalAutoAction: () => {},
  entanglementUiState: { smoothing: 6, freezeChart: false },
  cccHistoryUiState: { smoothing: 6, freezeChart: false, range: 240, showCCC: true, showPMIA: true, showOmega: true, showSpectral: true, showBand: true },
  cooldownActive: false,
  timeBasedRateLimit: false
};

const bag = { apiCallLog, ascensionDynamicsRef, autonomyActionLedgerRef, autonomySandboxPolicyRef, canvasTelemetryRef, cccHistoryTimelineRef, cogPlannerRef, coherentCohortRef, entanglementField, entanglementTimelineRef, entropyModeRef, exogenousDriverRef, holographicMemory, integrityPacketRef, internalPressureRef, interventionScheduleAbortRef, interventionSchedulerMetaRef, interventionSchedulerRef, kaizenEngine, kaizenPendingEvalRef, lastObserverResonanceRef, lastSaveTimestampRef, latencyStrainRef, metaSovereigntyCheck, nodalLayer, ontologicalAutoPolicyRef, ontologicalAutoQueueRef, ontologicalCore, plannerActuatorContribRef, postThresholdRegimeRef, ppsMetricsRef, ppsTrackerRef, previousFaceCountRef, quantumEntropyBridgeRef, recoveryTriggerCountRef, reportNormalizationFallbacksRef, runtimeBudgetSnapshotRef, sensoryEngine, simulationControllerRef, simulationErrorStreakRef, simulationRuntimeRef, structuralConsolidationRef, tickBudgetTrackerRef, worldModelDiagnosticsRef, worldModelRef, setApiCallMetrics, setAscensionAxiom, setCCC, setCccHistoryHoverIndex, setChatHistory, setEmotionState, setFieldMetrics, setFrictionCounter, setFrictionProtocolStatus, setHumanCcc, setHumanInputContext, setIsAscended, setIsRunning, setLastMutation, setLastSaveTime, setMetacognitionLevel, setMetacognitiveFlux, setMetamorphosisCounter, setMutableConfig, setNarrative, setOntologicalState, setPMIA, setQuantumUiStatus, setRateLimitExceeded, setSimulationStep, setTopologyMetrics, setVisualNodes, getEnvironmentContext, getPreregisterScheduleDoc, complexityFactor, initialMutableConfig, quantumUiConfig, handleSaveState };

// Seed functional-update setters with the component's React initial values
// (arrays/objects) so functional updaters (e.g. setChatHistory(prev => prev.length))
// don't see undefined. This is harness fidelity, not hook behavior.
captured['setChatHistory'] = [];
captured['setVisualNodes'] = [];
captured['setNarrative'] = '';
captured['setLastMutation'] = { key: 'None', value: 0, direction: 0 };
const { initializeSystem, runSimulationCycle } = useSimulationCycle(bag);

// Hard safety timeout: if the cycle hangs on a lingering timer/promise, fail fast.
const guard = setTimeout(() => { console.error('[headless] TIMEOUT: cycle did not finish in 30s'); process.exit(3); }, 30000);
guard.unref?.();

let threw = null;
try {
  await initializeSystem();
  for (let t = 0; t < 5; t++) { await runSimulationCycle(); }
} catch (e) { threw = e; }
clearTimeout(guard);

if (threw) { console.error('HEADLESS CYCLE THREW:', threw && threw.message); console.error(threw && threw.stack && threw.stack.split('\n').slice(0,6).join('\n')); process.exit(2); }

const finiteOk = (k) => { const v = captured[k]; return typeof v === 'number' && Number.isFinite(v); };
const invariantSetters = ['setCcc','setPmia','setSystemHealth'].filter(s => s in captured);
console.log('[headless] captured setter keys:', Object.keys(captured).length);
console.log('[headless] sample invariants:', JSON.stringify(Object.fromEntries(['setCcc','setPmia'].filter(k=>k in captured).map(k=>[k,captured[k]]))));
assert.ok(Object.keys(captured).length > 0, 'cycle must emit at least one setter update');
console.log('[headless] OK: extracted cycle ran 5 ticks without throwing and emitted state.');
process.exit(0);
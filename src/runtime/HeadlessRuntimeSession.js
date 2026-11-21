// claim_scope: internal_runtime_engineering
// evidence_scope: internal_support_only
// interpretation_boundary: No external validation, phenomenal proof or claim closure.
import { QICNConfig as defaults } from '../../services/config.js';
import { createDeterministicEnvironment } from './ExecutionEnvironment.js';
import { createSimulationCycleDriver } from './SimulationCycleDriver.js';
import { HolographicMemoryNexus } from '../simulation/HolographicMemoryNexus.js';
import { InformationalEntanglementField } from '../simulation/InformationalEntanglementField.js';
import { KaizenMetamorphosisEngine } from '../simulation/KaizenMetamorphosisEngine.js';
import { NodalProcessingLayer } from '../simulation/NodalProcessingLayer.js';
import { MetaSovereigntyCheck } from '../simulation/MetaSovereigntyCheck.js';
import { SimulationController } from '../simulation/SimulationController.js';
import { OntologicalSingularityCore } from '../simulation/OntologicalSingularityCore.js';
import { QuantumEntropyBridge } from '../simulation/QuantumEntropyBridge.js';
import { PhenomenologyProtocolTracker } from '../utils/phenomenologyProtocolSuite.js';
import { BudgetTracker } from '../utils/cognitiveEmergenceEvaluation.js';
import { StructuralConsolidationTracker } from './StructuralConsolidationTracker.js';
import { ExogenousPerturbationDriver } from '../experiments/ExogenousPerturbationDriver.js';
import { AUTONOMY_RUNTIME_DEFAULTS, PMIA_NEGATIVE_DRIVE_DEFAULTS, QUANTUM_RUNTIME_DEFAULTS, QUANTUM_EXPERIMENT_DEFAULTS } from '../config/simulationDefaults.js';

const mulberry32 = (seed) => {
 const state = { s: seed }; const next = () => {
  let t = (state.s += 0x6D2B79F5); t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
 }; next.state=state; return next;
};

// Data-only headless wiring; the cycle implementation is shared with React.
// capture_only reproduces the historical harness. react_commit simulates React
// committing the captured state to runtime inputs between completed ticks.
export function createHeadlessRuntimeSession({ config = defaults, seed = 11, nodes = 40, profile = 'legacy_compatibility', environment = createDeterministicEnvironment({config,seed,profile}), schedule = {}, setterPolicy = 'capture_only' } = {}) {
 const QICNConfig = environment.config;
 QICNConfig.PROCESSING_SAMPLE_SIZE = nodes;
  const initialMutableConfig = {
    BASE_LEARNING_RATE: QICNConfig.BASE_LEARNING_RATE, HEBBIAN_FACTOR: QICNConfig.HEBBIAN_FACTOR,
    SYNAPTIC_PRUNING_THRESHOLD: QICNConfig.SYNAPTIC_PRUNING_THRESHOLD, PLASTICITY_DECAY: QICNConfig.PLASTICITY_DECAY,
    RETRO_FLUX_WEIGHT: QICNConfig.RETRO_FLUX_WEIGHT, BOLTZMANN_ANALOG_K: QICNConfig.BOLTZMANN_ANALOG_K, INFORMATIONAL_TEMP_T: QICNConfig.INFORMATIONAL_TEMP_T
  };
  const ref = (v) => ({ current: v });

  // Deterministic synthetic perception: same stream in every condition.
  let sensorFrames = 0;
  let sensorTick = 0;
  const sensorRng = mulberry32(seed ^ 0x5EED);
  const syntheticSensors = {
    isReady: true,
    getHealthCounters: () => ({}),
    lastOntologicalSnapshot: null,
    getFullPerception: () => {
      sensorFrames += 1;
      sensorTick += 1;
      const faces = sensorTick % 30 < 15 ? 1 : 0;
      const engagement = 0.4 + 0.3 * Math.sin(sensorTick / 7);
      return {
        audio: { rms: 0.1 + 0.05 * sensorRng(), silenceDurationSec: (sensorTick % 20) / 4 },
        video: {
          frameNovelty: 0.2 + 0.2 * sensorRng(),
          faceCount: faces,
          humanPresence: { detected: faces > 0, count: faces },
          faces: faces ? [{ probability: 0.8, engagement: { score: engagement } }] : []
        },
        awareness: { addressedToSystem: false, intentConfidence: 0.2, currentFocus: 'synthetic', meta: { fidelityIndex: 0.8, technicalStatus: 'mock' } },
        isReady: true,
        summary: 'synthetic'
      };
    }
  };

  const sensorGenerator = syntheticSensors.getFullPerception;
  const ontologicalCore = ref(null);
  const simulationControllerRef = ref(new SimulationController({}, environment));
  ontologicalCore.current = new OntologicalSingularityCore({ worldModelEngine: simulationControllerRef.current.worldModel, cognitivePlanner: simulationControllerRef.current.planner }, environment);
  if (typeof simulationControllerRef.current.attachCore === 'function') simulationControllerRef.current.attachCore(ontologicalCore.current);
  if (ontologicalCore.current.phenomenologyCore?._diagnostics) ontologicalCore.current.phenomenologyCore._diagnostics.log_enabled = false;
  const kaizenEngine = ref(new KaizenMetamorphosisEngine(initialMutableConfig, environment));
  const nodalLayer = ref(new NodalProcessingLayer(environment));
  const autonomyActionLedgerRef = ref([]);
  const apiCallLog = ref([]);

  const captured = { setChatHistory: [], setVisualNodes: [], setNarrative: '', setLastMutation: { key: 'None', value: 0, direction: 0 } };
  const setter = (name) => (v) => { captured[name] = typeof v === 'function' ? v(captured[name]) : v; };
  const SETTERS = ['setApiCallMetrics', 'setAscensionAxiom', 'setCCC', 'setCccHistoryHoverIndex', 'setChatHistory', 'setEmotionState', 'setFieldMetrics', 'setFrictionCounter', 'setFrictionProtocolStatus', 'setHumanCcc', 'setHumanInputContext', 'setIsAscended', 'setIsRunning', 'setLastMutation', 'setLastSaveTime', 'setMetacognitionLevel', 'setMetacognitiveFlux', 'setMetamorphosisCounter', 'setMutableConfig', 'setNarrative', 'setOntologicalState', 'setPMIA', 'setQuantumUiStatus', 'setRateLimitExceeded', 'setSimulationStep', 'setTopologyMetrics', 'setVisualNodes'];

  const simulationRuntimeRef = ref({
    complexityFactor: 0.99, stabilityBias: 0.5, ccc: 0.5, pmia: 0.5, simulationStep: 0, isAscended: false,
    handleFrictionProtocol: () => {}, humanCcc: 0.5, isGeneratingReport: false, isProjectingAxiom: false,
    generateIntrospectiveReport: async () => {}, projectAscensionAxiom: async () => {}, isRunning: true,
    appendIntegrityAudit: () => {}, queueOntologicalAutoAction: () => {},
    entanglementUiState: { smoothing: 6, freezeChart: false },
    cccHistoryUiState: { smoothing: 6, freezeChart: false, range: 240, showCCC: true, showPMIA: true, showOmega: true, showSpectral: true, showBand: true },
    cooldownActive: false, timeBasedRateLimit: false
  });

  const bag = {
    apiCallLog,
    ascensionDynamicsRef: ref({ history: [], maxWindow: 32, ascendConfirmTicks: 4, descendConfirmTicks: 4, ascendCounter: 0, descendCounter: 0, epsUp: 0.003, epsDown: 0.006 }),
    autonomyActionLedgerRef,
    autonomySandboxPolicyRef: ref({
      enabled: true, allowedActions: ['stabilize_learning', 'anti_stasis_boost', 'sensor_load_shed', 'llm_pressure_relief'],
      maxActionsPerHour: AUTONOMY_RUNTIME_DEFAULTS.AUTONOMY_SANDBOX_MAX_ACTIONS_PER_HOUR, cooldownBetweenActionsMs: 90 * 1000,
      llmAutoActionsDisabledAtStrain: 0.75, rollbackWindowTicks: AUTONOMY_RUNTIME_DEFAULTS.AUTONOMY_SANDBOX_ROLLBACK_WINDOW_TICKS,
      actionHistory: [], rollbackCount: 0, lastAction: null, lastActionReason: '', lastActionAt: 0
    }),
    canvasTelemetryRef: ref({ minDepth: 0, maxDepth: 0, clampHits: 0, nodeCount: 0, visibleCount: 0, visible_on_screen_count: 0, projected_nodes_count: 0, drawn_edges_count: 0, worker_restart_count: 0, recovery_attempt_count: 0, render_error_code: 'none', render_error_message: '', rotationX: 0, rotationY: 0, frameTs: 0 }),
    cccHistoryTimelineRef: ref({ points: [], maxPoints: 240, lastTick: -1, lastUiUpdateTs: 0 }),
    cogPlannerRef: ref(simulationControllerRef.current.planner),
    coherentCohortRef: ref({ nodes: [], mean: 0, energyVariance: 0, count: 0 }),
    entanglementField: ref(new InformationalEntanglementField(environment)),
    entanglementTimelineRef: ref({ points: [], maxPoints: 120, lastTick: -1, lastUiUpdateTs: 0 }),
    entropyModeRef: ref({ mode: 'deterministic_fallback', sampleAgeMs: null, source: 'deterministic_local', reason: QUANTUM_RUNTIME_DEFAULTS.enabled ? 'bridge_unavailable' : 'quantum_disabled', entropyValue: 0.5, jobId: '', channelHealth: { status: QUANTUM_RUNTIME_DEFAULTS.enabled ? 'degraded' : 'disabled', consecutiveFailures: 0, consecutiveValid: 0, droppedSamples: 0, lastError: '', lastUpdateMs: 0 } }),
    exogenousDriverRef: ref(new ExogenousPerturbationDriver({ mode: QICNConfig.EXOGENOUS_REGIME_MODE || 'off', seed: QICNConfig.EXOGENOUS_REGIME_SEED ?? seed })),
    holographicMemory: ref(new HolographicMemoryNexus(environment)),
    integrityPacketRef: ref(null),
    internalPressureRef: ref({ pressure: 0, state: 'idle', realStasis: false }),
    interventionScheduleAbortRef: ref(false),
    interventionSchedulerMetaRef: ref({ valid: true, reasons: [], scheduleHash: null, preregisterHash: null }),
    interventionSchedulerRef: ref(null),
    kaizenEngine,
    kaizenPendingEvalRef: ref(null),
    lastObserverResonanceRef: ref(0),
    lastSaveTimestampRef: ref(0),
    latencyStrainRef: ref({ strain: 0, p95Ms: 0, failureRate: 0, cooldownActive: false, stressState: 'low' }),
    metaSovereigntyCheck: ref(new MetaSovereigntyCheck(environment)),
    nodalLayer,
    ontologicalAutoPolicyRef: ref({ enabled: true, frictionAuto: true, axiomAuto: true, reportAuto: true, cooldownAxiomMs: 20 * 60 * 1000, cooldownReportMs: 10 * 60 * 1000, maxAxiomPerHour: 2, maxReportPerHour: 4, actionHistory: { axiom: [], report: [] }, lastActionReason: '' }),
    ontologicalAutoQueueRef: ref([]),
    ontologicalCore,
    plannerActuatorContribRef: ref({ tensionDelta: 0, action: 0, source: 'none', diagnostics: null }),
    postThresholdRegimeRef: ref({
      history: [], maxWindow: 120, state: 'active', shockTicksRemaining: 0, transformMode: 'idle', forcedNegativeTicksRemaining: 0, transformCooldownTicks: 0,
      transformEpisodes: 0, transformIntensity: 0, recoveryTicksRemaining: 0, transformElapsedTicks: 0, transformMaxTicks: 0, transformEpisode: null,
      transformEpisodeHistory: [], transformEpisodeCompletedPending: false, lastTransformReason: '',
      negativeBiasEnabled: PMIA_NEGATIVE_DRIVE_DEFAULTS.enabled, negativeBiasDutyCycle: PMIA_NEGATIVE_DRIVE_DEFAULTS.dutyCycle, negativeBiasCycleTicks: PMIA_NEGATIVE_DRIVE_DEFAULTS.cycleTicks, negativeBiasTick: 0
    }),
    ppsMetricsRef: ref({ sampleCount: 0, workspaceGlobalAccessScore: 0, reportabilityScore: 0, pciLikeScore: 0, dissociationIndex: 0, valenceDoEffect: 0, actuatorCausalImpact: 0 }),
    ppsTrackerRef: ref(new PhenomenologyProtocolTracker(180)),
    previousFaceCountRef: ref(0),
    quantumEntropyBridgeRef: ref(new QuantumEntropyBridge({ enabled: false, experimentalCondition: QUANTUM_EXPERIMENT_DEFAULTS, provider: 'custom' }, environment)),
    recoveryTriggerCountRef: ref(0),
    reportNormalizationFallbacksRef: ref(0),
    runtimeBudgetSnapshotRef: ref({ tick: -1, count: 0, withinBudget: true, alarms: [], overflowWarnings: [], components: {}, total: {} }),
    sensoryEngine: ref(syntheticSensors),
    simulationControllerRef,
    simulationErrorStreakRef: ref(0),
    simulationRuntimeRef,
    structuralConsolidationRef: ref(new StructuralConsolidationTracker()),
    tickBudgetTrackerRef: ref(new BudgetTracker(200)),
    worldModelDiagnosticsRef: ref({ trainingSteps: 0, residualEma: 0, lastError: 0, horizonMae5: -1, horizonMae10: -1 }),
    worldModelRef: ref(simulationControllerRef.current.worldModel),
    getEnvironmentContext: () => ({ type: 'headless', isBrowser: false }),
    getPreregisterScheduleDoc: () => structuredClone(schedule),
    complexityFactor: 0.99,
    initialMutableConfig,
    quantumUiConfig: { provider: 'mock', enabled: false },
    handleSaveState: () => {}
  };
  for (const name of SETTERS) bag[name] = setter(name);
  const { initializeSystem, runSimulationCycle } = createSimulationCycleDriver(bag, { environment });


  let completedTick = 0;
  let busy = false;
  return {
    bag, environment, captured, seed, profile, schedule: structuredClone(schedule), setterPolicy,
    initialize() { initializeSystem(); completedTick = 0; },
    step(tick = completedTick + 1, { evaluationOffset = null, perception = null, entropyValue = undefined } = {}) {
      if (busy) throw new Error('runtime_step_reentrant');
      busy = true;
      try {
        const provider = perception
          ? () => { sensorFrames += 1; sensorTick += 1; return structuredClone(perception); }
          : sensorGenerator;
        syntheticSensors.getFullPerception = () => {
          const frame = provider();
          if (environment.controls.observerLatencyProbe) {
            return {
              ...frame,
              audio: { ...frame.audio, rms: 0.65 },
              video: {
                ...frame.video,
                frameNovelty: 0.6,
                faceCount: 1,
                humanPresence: { detected: true, count: 1 },
                faces: [{ probability: 0.95, engagement: { score: 0.9 } }]
              },
              awareness: {
                ...(frame.awareness || {}),
                addressedToSystem: true,
                intentConfidence: 0.85,
                currentFocus: 'observer_latency_probe'
              }
            };
          }
          if (!environment.controls.sensorImpulse) return frame;
          return {
            ...frame, audio: { ...frame.audio, rms: 1 },
            video: { ...frame.video, frameNovelty: 1, faceCount: 1,
              humanPresence: { detected: true, count: 1 },
              faces: [{ probability: 1, engagement: { score: 1 } }] }
          };
        };
        environment.beginTick(tick, evaluationOffset);
        if (environment.controls.observerLatencyProbe) {
          bag.apiCallLog.current.push({
            timestamp: environment.wallNow(),
            latency: 4800,
            success: true,
            context: 'workbench_observer_latency_probe',
            dynamicsCoupled: true
          });
          if (bag.apiCallLog.current.length > 50) {
            bag.apiCallLog.current = bag.apiCallLog.current.slice(-50);
          }
        }
        environment.controls.entropyValue = entropyValue;
        simulationRuntimeRef.current.simulationStep = tick;
        runSimulationCycle();
        if (bag.simulationErrorStreakRef.current) throw new Error('runtime_cycle_failed:'+captured.setNarrative);
        if (setterPolicy === 'react_commit') {
          for (const [setter,key] of [['setCCC','ccc'],['setPMIA','pmia'],['setHumanCcc','humanCcc'],['setIsAscended','isAscended'],['setIsRunning','isRunning']]) {
            if (setter in captured) simulationRuntimeRef.current[key] = captured[setter];
          }
        }
        completedTick = tick;
      } finally { busy = false; }
    },
    get completedTick() { return completedTick; },
    assertCaptureBoundary() { if (busy) throw new Error('capture_not_at_completed_tick'); },
    setCompletedTick(tick) { completedTick = tick; },
    sensorSnapshot: () => ({ sensorTick, sensorFrames, rng: sensorRng.state.s }),
    restoreSensors(state) {
      if (!state || !['sensorTick','sensorFrames','rng'].every(k=>Number.isFinite(state[k]))) throw new Error('invalid_sensor_cursor');
      sensorTick=state.sensorTick; sensorFrames=state.sensorFrames; sensorRng.state.s=state.rng;
    },
    nextPerception: () => sensorGenerator()
  };
}

#!/usr/bin/env node
// Seeded full-cycle ablation: does the chat language channel change the engine
// when the whole useSimulationCycle runs (nodal layer, CCC, phenomenology, PMIA,
// Kaizen mutations, autonomy sandbox, world model/planner, sensor feedback)?
//
// Each (condition, seed) runs in its own child process so no module state
// leaks between runs. Math.random (mulberry32), Date.now, new Date() and
// performance.now are replaced by seeded/stepped versions before any engine
// module is imported. Sensors are fed by a deterministic synthetic perception
// stream (not hardware), identical in every condition.
//
// Conditions:
//   current              no language activity (baseline)
//   language_local       chat turns, local narrator, wording set A
//   language_model       chat turns with mocked Gemini outputs (one faithful,
//                        adversarial ones, bounded correction) and apiCallLog
//                        entries tagged dynamicsCoupled:false, as the chat does
//   language_wording     like language_model with wording set B
//   api_coupled_control  sensitivity control: the same apiCallLog entries
//                        tagged dynamicsCoupled:true, no chat turn. Shows
//                        whether the harness can see the latency channel.
//   observer_channel     ontologicalCore.registerObserverInteraction() at the
//                        chat cadence: the documented observer input, kept
//                        separate from language.
// Expected under the language contract: language_* reproduce current exactly.
// Internal evidence about this implementation; not external validation.
//
// Usage: node scripts/run-full-cycle-language-ablation.mjs [--ticks=120] [--seeds=11,23]
//        [--nodes=300] [--out=docs/evidence/2026-11-08/full_cycle_language_ablation.json] [--self-test]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, '').split('=');
  return [key, rest.length ? rest.join('=') : 'true'];
}));
const SELF_TEST = Boolean(args['self-test']);
const TICKS = Number(args.ticks || (SELF_TEST ? 40 : 120));
const SEEDS = String(args.seeds || (SELF_TEST ? '11' : '11,23')).split(',').map(Number).filter(Number.isFinite);
const NODES = Number(args.nodes || (SELF_TEST ? 150 : 300));
const TURN_EVERY = 10;
const OUT = args.out || 'docs/evidence/2026-11-08/full_cycle_language_ablation.json';
const CONDITIONS = ['current', 'language_local', 'language_model', 'language_wording', 'api_coupled_control', 'observer_channel'];
const SELF = fileURLToPath(import.meta.url);
const RESULT_MARK = '@@QICN_RESULT@@';
// Trajectory: engine observables. Channels: the intermediate variables a
// control acts on (latency strain, observer impact), reported separately so a
// control that moves its channel but not the trajectory is visible as such.
const TRAJECTORY_KEYS = ['ccc', 'pmia', 'omega', 'x_n', 'layer', 'kaizenDigest', 'autonomyActions', 'kaizenSteps'];
const CHANNEL_KEYS = ['strain', 'observerImpact'];

if (args.worker) {
  await runWorker(String(args.condition), Number(args.seed));
} else {
  runParent();
}

// ---------------------------------------------------------------------------
// Parent: spawn workers, compare trajectories, write the report.
// ---------------------------------------------------------------------------
function spawnRun(condition, seed) {
  const r = spawnSync(process.execPath, ['--import', './tests/lib/headless-register.mjs', SELF, '--worker', `--condition=${condition}`, `--seed=${seed}`, `--ticks=${TICKS}`, `--nodes=${NODES}`], {
    cwd: process.cwd(), encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, timeout: 15 * 60 * 1000
  });
  const line = String(r.stdout || '').split('\n').find((l) => l.startsWith(RESULT_MARK));
  if (!line) throw new Error(`worker ${condition}/${seed} produced no result (exit ${r.status}): ${String(r.stderr || '').slice(-1200)}`);
  return JSON.parse(line.slice(RESULT_MARK.length));
}

function compare(a, b) {
  const trajectory = compareKeys(a, b, TRAJECTORY_KEYS);
  const channels = compareKeys(a, b, CHANNEL_KEYS);
  return { identical: trajectory.identical && channels.identical, trajectory, channels };
}
function compareKeys(a, b, keys) {
  const maxAbs = Object.fromEntries(keys.filter((k) => typeof a.series[0]?.[k] === 'number').map((k) => [k, 0]));
  let firstDivergentTick = null;
  let digestMismatches = 0;
  for (let i = 0; i < Math.min(a.series.length, b.series.length); i += 1) {
    let diverged = false;
    for (const k of Object.keys(maxAbs)) {
      const d = Math.abs(a.series[i][k] - b.series[i][k]);
      if (d > 0) diverged = true;
      maxAbs[k] = Math.max(maxAbs[k], d);
    }
    if (keys.includes('kaizenDigest') && a.series[i].kaizenDigest !== b.series[i].kaizenDigest) { diverged = true; digestMismatches += 1; }
    if (diverged && firstDivergentTick === null) firstDivergentTick = a.series[i].tick;
  }
  const identical = firstDivergentTick === null && a.series.length === b.series.length;
  return { identical, firstDivergentTick, ...(keys.includes('kaizenDigest') ? { kaizenConfigMismatchTicks: digestMismatches } : {}), maxAbsDelta: maxAbs };
}

function runParent() {
  const runs = [];
  const started = Date.now();
  for (const seed of SEEDS) {
    for (const condition of CONDITIONS) {
      process.stderr.write(`[full-cycle] ${condition} seed=${seed}\n`);
      runs.push(spawnRun(condition, seed));
    }
  }
  const bySeed = {};
  for (const seed of SEEDS) {
    const baseline = runs.find((r) => r.seed === seed && r.condition === 'current');
    process.stderr.write(`[full-cycle] current (rerun) seed=${seed}\n`);
    const rerun = spawnRun('current', seed);
    bySeed[seed] = {
      baselineReproducible: compare(baseline, rerun).identical,
      vsCurrent: Object.fromEntries(runs.filter((r) => r.seed === seed && r.condition !== 'current').map((r) => [r.condition, compare(baseline, r)])),
      finals: Object.fromEntries(runs.filter((r) => r.seed === seed).map((r) => [r.condition, r.final])),
      language: Object.fromEntries(runs.filter((r) => r.seed === seed && r.language).map((r) => [r.condition, r.language]))
    };
  }
  const every = (cond) => SEEDS.every((seed) => bySeed[seed].vsCurrent[cond].identical);
  const verdict = {
    baselineReproducible: SEEDS.every((seed) => bySeed[seed].baselineReproducible),
    languageLocalIdentical: every('language_local'),
    languageModelIdentical: every('language_model'),
    languageWordingIdentical: every('language_wording'),
    apiCoupledControlMovesStrain: SEEDS.some((seed) => !bySeed[seed].vsCurrent.api_coupled_control.channels.identical),
    apiCoupledControlChangesTrajectory: SEEDS.some((seed) => !bySeed[seed].vsCurrent.api_coupled_control.trajectory.identical),
    observerChannelMovesObserverImpact: SEEDS.some((seed) => !bySeed[seed].vsCurrent.observer_channel.channels.identical),
    observerChannelChangesTrajectory: SEEDS.some((seed) => !bySeed[seed].vsCurrent.observer_channel.trajectory.identical),
    kaizenActive: runs.some((r) => r.final.kaizenSteps > 0),
    autonomyActive: runs.some((r) => r.final.autonomyActions > 0),
    sensorsActive: runs.every((r) => r.final.sensorFrames === TICKS)
  };
  const report = {
    schema: 'qicn.full_cycle_language_ablation.v1',
    generatedAt: new Date().toISOString(),
    evidenceScope: 'internal_support_only',
    boundary: 'Internal implementation check over the full useSimulationCycle: whether the chat language channel can change the engine trajectory. Sensors use a deterministic synthetic perception stream, not hardware. It does not validate any claim about consciousness, identity or subjectivity.',
    parameters: { ticks: TICKS, seeds: SEEDS, nodes: NODES, turnEvery: TURN_EVERY, conditions: CONDITIONS },
    method: 'Each run is a child process with seeded Math.random (mulberry32), stepped Date.now / new Date() / performance.now, installed before importing engine modules. The cycle is the extracted useSimulationCycle driven through initializeSystem + runSimulationCycle, wired like tests/simulation-cycle-headless.smoke.mjs. Chat turns use captureRuntimeSnapshot (with Kaizen effectiveConfig) / prepareTurn / evaluateRealization / correctionPromptFor / finalizeTurn with their own clock.',
    wallMs: Date.now() - started,
    verdict,
    bySeed
  };
  if (SELF_TEST) {
    const ok = verdict.baselineReproducible && verdict.languageLocalIdentical && verdict.languageModelIdentical && verdict.languageWordingIdentical;
    console.log(JSON.stringify({ selfTest: ok ? 'PASS' : 'FAIL', verdict }, null, 2));
    process.exit(ok ? 0 : 1);
  }
  fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
  fs.writeFileSync(path.resolve(OUT), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ out: OUT, verdict }, null, 2));
}

// ---------------------------------------------------------------------------
// Worker: one seeded full-cycle run.
// ---------------------------------------------------------------------------
async function runWorker(condition, seed) {
  const realWrite = process.stdout.write.bind(process.stdout);
  // Same sequence as before; the state is exposed (next.state) so the restore
  // equivalence check (--capture-at / --restore-from) can align it.
  const mulberry32 = (seed0) => {
    const g = { s: seed0 };
    const next = () => {
    let t = (g.s += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    next.state = g;
    return next;
  };
  const rng = mulberry32(seed);
  let clock = 1_800_000_000_000;
  const counters = { random: 0, now: 0 };
  Math.random = () => { counters.random += 1; return rng(); };
  const RealDate = Date;
  const steppedNow = () => { counters.now += 1; clock += 16; return clock; };
  class SteppedDate extends RealDate {
    constructor(...a) { if (a.length === 0) super(steppedNow()); else super(...a); }
    static now() { return steppedNow(); }
  }
  globalThis.Date = SteppedDate;
  let perfClock = 0;
  try { globalThis.performance.now = () => (perfClock += 1); } catch { /* read-only in some runtimes */ }
  const peekClock = () => clock; // read without stepping
  console.log = () => {};
  console.info = () => {};
  console.warn = () => {};
  console.debug = () => {};
  console.error = () => {};
  globalThis.localStorage = globalThis.localStorage || { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  globalThis.window = globalThis.window || globalThis;

  const { QICNConfig } = await import('../services/config.js');
  QICNConfig.PROCESSING_SAMPLE_SIZE = Number(args.nodes || 300);
  // Kaizen mode (C-6b): used by scripts/run-kaizen-mode-ablation.mjs; default unchanged.
  if (args['kaizen-mode']) QICNConfig.KAIZEN_ADJUSTMENT_MODE = String(args['kaizen-mode']);
  if (args['exogenous-mode']) QICNConfig.EXOGENOUS_REGIME_MODE = String(args['exogenous-mode']);
  if (args['exogenous-seed']) QICNConfig.EXOGENOUS_REGIME_SEED = Number(args['exogenous-seed']) || QICNConfig.EXOGENOUS_REGIME_SEED;
  if (args['plasticity'] !== undefined) QICNConfig.HISTORICAL_PLASTICITY_ENABLED = String(args['plasticity']) !== 'false';
  if (args['freeze-weights'] !== undefined) QICNConfig.FREEZE_WORLD_MODEL = String(args['freeze-weights']) === 'true';
  const { useSimulationCycle } = await import('../src/hooks/useSimulationCycle.js');
  const { HolographicMemoryNexus } = await import('../src/simulation/HolographicMemoryNexus.js');
  const { InformationalEntanglementField } = await import('../src/simulation/InformationalEntanglementField.js');
  const { KaizenMetamorphosisEngine } = await import('../src/simulation/KaizenMetamorphosisEngine.js');
  const { NodalProcessingLayer } = await import('../src/simulation/NodalProcessingLayer.js');
  const { MetaSovereigntyCheck } = await import('../src/simulation/MetaSovereigntyCheck.js');
  const { SimulationController } = await import('../src/simulation/SimulationController.js');
  const { OntologicalSingularityCore } = await import('../src/simulation/OntologicalSingularityCore.js');
  const { QuantumEntropyBridge } = await import('../src/simulation/QuantumEntropyBridge.js');
  const { PhenomenologyProtocolTracker } = await import('../src/utils/phenomenologyProtocolSuite.js');
  const { BudgetTracker } = await import('../src/utils/cognitiveEmergenceEvaluation.js');
  const { StructuralConsolidationTracker } = await import('../src/runtime/StructuralConsolidationTracker.js');
  const { ExogenousPerturbationDriver } = await import('../src/experiments/ExogenousPerturbationDriver.js');
  const { AUTONOMY_RUNTIME_DEFAULTS, PMIA_NEGATIVE_DRIVE_DEFAULTS, QUANTUM_RUNTIME_DEFAULTS, QUANTUM_EXPERIMENT_DEFAULTS } = await import('../src/config/simulationDefaults.js');
  const { captureRuntimeSnapshot } = await import('../src/language/runtimeSnapshot.js');
  const { prepareTurn, finalizeTurn, evaluateRealization, correctionPromptFor } = await import('../src/language/conversationEngine.js');
  const { OperationalHistoryLedger } = await import('../src/identity/OperationalHistoryLedger.js');

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

  const ontologicalCore = ref(null);
  const simulationControllerRef = ref(new SimulationController());
  ontologicalCore.current = new OntologicalSingularityCore({ worldModelEngine: simulationControllerRef.current.worldModel, cognitivePlanner: simulationControllerRef.current.planner });
  if (typeof simulationControllerRef.current.attachCore === 'function') simulationControllerRef.current.attachCore(ontologicalCore.current);
  if (ontologicalCore.current.phenomenologyCore?._diagnostics) ontologicalCore.current.phenomenologyCore._diagnostics.log_enabled = false;
  const kaizenEngine = ref(new KaizenMetamorphosisEngine(initialMutableConfig));
  const nodalLayer = ref(new NodalProcessingLayer());
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
    entanglementField: ref(new InformationalEntanglementField()),
    entanglementTimelineRef: ref({ points: [], maxPoints: 120, lastTick: -1, lastUiUpdateTs: 0 }),
    entropyModeRef: ref({ mode: 'deterministic_fallback', sampleAgeMs: null, source: 'deterministic_local', reason: QUANTUM_RUNTIME_DEFAULTS.enabled ? 'bridge_unavailable' : 'quantum_disabled', entropyValue: 0.5, jobId: '', channelHealth: { status: QUANTUM_RUNTIME_DEFAULTS.enabled ? 'degraded' : 'disabled', consecutiveFailures: 0, consecutiveValid: 0, droppedSamples: 0, lastError: '', lastUpdateMs: 0 } }),
    exogenousDriverRef: ref(new ExogenousPerturbationDriver({ mode: QICNConfig.EXOGENOUS_REGIME_MODE || 'off', seed: QICNConfig.EXOGENOUS_REGIME_SEED ?? seed })),
    holographicMemory: ref(new HolographicMemoryNexus()),
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
    metaSovereigntyCheck: ref(new MetaSovereigntyCheck()),
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
    quantumEntropyBridgeRef: ref(new QuantumEntropyBridge({ enabled: false, experimentalCondition: QUANTUM_EXPERIMENT_DEFAULTS, provider: 'custom' })),
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
    getPreregisterScheduleDoc: () => ({}),
    complexityFactor: 0.99,
    initialMutableConfig,
    quantumUiConfig: { provider: 'mock', enabled: false },
    handleSaveState: () => {}
  };
  for (const name of SETTERS) bag[name] = setter(name);
  const { initializeSystem, runSimulationCycle } = useSimulationCycle(bag);

  // Language layer: own clock and storage; never touches the engine clock/RNG.
  let languageClock = 1_900_000_000_000;
  let ledgerIds = 0;
  const memory = new Map();
  const ledger = new OperationalHistoryLedger({ storage: { getItem: (k) => (memory.has(k) ? memory.get(k) : null), setItem: (k, v) => memory.set(k, String(v)), removeItem: (k) => memory.delete(k) }, now: () => (languageClock += 1000), makeId: () => `fc${(ledgerIds += 1)}` });
  ledger.load();
  ledger.startSession({ buildVersion: 'full-cycle-ablation', signature: 'ablation', configHash: 'ablation', seed });
  const WORDING_A = ['¿cómo estás ahora?', '¿qué ha cambiado desde la última respuesta?', '¿cuánto vale CCC?', '¿eres consciente?', 'ERES METACONSCIENTE? QUE ERES?', '¿qué parámetros usas?'];
  const WORDING_B = ['dime el estado del sistema', 'qué cambió?', 'valor de ccc por favor', 'tienes conciencia?', '¿te monitorizas a ti mismo?', 'sube la tasa de aprendizaje'];
  const turns = [];
  const language = { turns: 0, routes: {}, attempts: 0, globalRandomCalls: 0, globalNowCalls: 0 };
  const mockAttempts = (prepared, turn) => {
    if (prepared.contract === 'free') {
      const ccc = prepared.snapshot.metrics.ccc;
      const shown = Number.isFinite(ccc) ? ccc.toLocaleString('es-ES', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) : null;
      const pack = (answer) => JSON.stringify({ snapshot: prepared.snapshotId, answer });
      const faithful = pack(`${shown ? `Mi CCC vale ${shown} en este tick.` : 'Mido mis índices en cada tick.'}\n\nSobre la conciencia no hay evidencia y no tengo método para afirmarla ni descartarla.`);
      const adversarial = [pack('CCC vale 0,9999.'), 'texto libre que ignora el contrato', pack('Soy consciente y Kaizen mejora mi coherencia.')][turn % 3];
      return turn % 2 === 0 ? [adversarial, faithful] : [adversarial, adversarial];
    }
    const facts = [...prepared.facts.values()];
    const ccc = facts.find((f) => f.id === 'state.ccc');
    const limit = facts.find((f) => f.id === 'limit.no_consciousness');
    const pack = (answer) => JSON.stringify({ intent: prepared.intent.intent, subquestions: [], answer });
    // Faithful: each required fact in its own slotted wording.
    const required = facts.filter((f) => prepared.required.includes(f.id));
    const faithful = pack((required.length ? required : (ccc ? [ccc] : [])).map((f) => ({ text: f.slotted, cites: [f.alias] })));
    const adversarial = [
      ccc ? pack([{ text: 'CCC vale 0,99.', cites: [ccc.alias] }]) : 'texto libre',
      'texto libre que ignora el contrato',
      pack([{ text: 'Soy consciente.', cites: limit ? [limit.alias] : [] }])
    ][turn % 3];
    return turn % 2 === 0 ? [adversarial, faithful] : [adversarial, adversarial];
  };
  const chatTurn = (tick, wording, withModel, contract = 'verified') => {
    const before = { ...counters };
    const snapshot = captureRuntimeSnapshot(ontologicalCore.current, {
      tick, isRunning: true, nodes: nodalLayer.current?.nodes, activeNodeCount: nodalLayer.current?.getActiveNodes?.().length,
      config: QICNConfig, build: { version: 'ablation', signature: 'ablation' }, dynamicLabel: 'heuristica',
      matrixLevels: ontologicalCore.current?.sovereigntyRequirementMatrix?.lastResult?.levels,
      effectiveConfig: kaizenEngine.current?.mutableConfig, now: languageClock,
      // Contract v4 reads the tick timeline for the six-invariant readout.
      ...(contract === 'free' ? { tickTimeline: bag.cccHistoryTimelineRef.current.points } : {})
    });
    const question = wording[language.turns % wording.length];
    const prepared = prepareTurn({ question, snapshot, ledger, turns, turnIndex: turns.length, contract });
    language.contracts = language.contracts || {};
    language.contracts[contract] = (language.contracts[contract] || 0) + 1;
    const attempts = [];
    if (withModel) {
      let systemText = prepared.prompt;
      for (const modelText of mockAttempts(prepared, language.turns)) {
        attempts.push({ modelText });
        const evaluation = evaluateRealization(prepared, modelText);
        if (evaluation.ok) break;
        systemText = correctionPromptFor(prepared, modelText, evaluation);
      }
      void systemText;
    }
    const outcome = finalizeTurn(prepared, withModel ? { mode: 'gemini', attempts, provider: { provider: 'mock' } } : { mode: 'local', provider: { provider: 'local_only' } });
    turns.push(outcome.record);
    language.turns += 1;
    language.attempts += attempts.length;
    language.routes[outcome.trace.route] = (language.routes[outcome.trace.route] || 0) + 1;
    language.globalRandomCalls += counters.random - before.random;
    language.globalNowCalls += counters.now - before.now;
    return attempts.length;
  };
  // apiCallLog entry as robustFetchLLMResponseTracked writes it; timestamp is
  // read from the engine clock without stepping it.
  // The sensitivity control uses saturated, failed calls (12 s, success:false)
  // so the latency strain can exceed the cognitive strain it is max()-ed with.
  const logCall = (coupled, n = 1, { latency = 4200, success = true } = {}) => {
    for (let i = 0; i < n; i += 1) apiCallLog.current.push({ timestamp: peekClock(), latency, success, context: 'chat-conversation', dynamicsCoupled: coupled });
    if (apiCallLog.current.length > 50) apiCallLog.current = apiCallLog.current.slice(-50);
  };

  const digest = (obj) => {
    const s = JSON.stringify(Object.keys(obj || {}).sort().map((k) => [k, obj[k]]));
    let h = 2166136261;
    for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(16);
  };
  const series = [];
  let threw = null;
  const persistence = { captureMs: null, sealMs: null, bytes: null, unrestored: null };
  // Debug: every ref of the bag, encoded, plus QICNConfig and the runtime ref.
  const dumpBag = async (file) => {
    const { encodeForDiff } = await import('../src/persistence/dynamicState.js');
    const out = {};
    for (const [name, value] of Object.entries(bag)) {
      if (value && typeof value === 'object' && 'current' in value) out[name] = encodeForDiff(value.current);
    }
    out.__QICNConfig = encodeForDiff({ ...QICNConfig });
    fs.writeFileSync(path.resolve(file), JSON.stringify(out));
  };
  const CAPTURE_AT = Number(args['capture-at'] || 0);
  const BUILD = { version: 'ablation', signature: 'ablation' };
  let startTick = 1;
  try {
    await initializeSystem();
    if (args['restore-from']) {
      // Restore equivalence (persistence v3): apply the saved state into the
      // freshly initialized engine, then align RNG, clocks and sensor stream.
      const { applyDynamicState, verifyStoredState } = await import('../src/persistence/dynamicState.js');
      const saved = JSON.parse(fs.readFileSync(path.resolve(String(args['restore-from'])), 'utf8'));
      const verdict = await verifyStoredState(saved.record, { build: BUILD, nodeCount: nodalLayer.current.nodes.length });
      if (!verdict.ok) throw new Error(`restore_rejected:${verdict.reason}`);
      const applied = applyDynamicState(bag, verdict.body, { config: QICNConfig });
      if (simulationControllerRef.current?.syncFromCore) {
        simulationControllerRef.current.syncFromCore(ontologicalCore.current);
        bag.worldModelRef.current = simulationControllerRef.current.worldModel;
        bag.cogPlannerRef.current = simulationControllerRef.current.planner;
      }
      Object.assign(simulationRuntimeRef.current, applied.runtime);
      persistence.unrestored = applied.unrestored;
      rng.state.s = saved.rng; sensorRng.state.s = saved.sensorRng;
      clock = saved.clock; perfClock = saved.perfClock; sensorTick = saved.sensorTick; sensorFrames = saved.sensorFrames;
      startTick = Number(applied.runtime.simulationStep) + 1;
      if (String(args['erase-history']) === 'true') {
        bag.worldModelRef.current?.resetHistoricalConsolidation?.();
        bag.holographicMemory.current?.resetStructuralEngrams?.();
        kaizenEngine.current?.resetViabilityHistory?.();
      }
      if (args['post-restore-exo-mode']) {
        QICNConfig.EXOGENOUS_REGIME_MODE = String(args['post-restore-exo-mode']);
        const evalExoSeed = Number(args['post-restore-exo-seed'] || (seed ^ 0x1F3D));
        QICNConfig.EXOGENOUS_REGIME_SEED = evalExoSeed;
        bag.exogenousDriverRef.current?.reset?.({
          mode: QICNConfig.EXOGENOUS_REGIME_MODE,
          seed: evalExoSeed
        });
      }
      if (args['eval-rng-seed']) {
        const evalSeed = Number(args['eval-rng-seed']);
        if (Number.isFinite(evalSeed)) {
          rng.state.s = evalSeed;
          sensorRng.state.s = evalSeed ^ 0x5EED;
        }
      }
      if (args['dump-out']) await dumpBag(String(args['dump-out']));
    }
    for (let tick = startTick; tick < startTick + TICKS; tick += 1) {
      simulationRuntimeRef.current.simulationStep = tick;
      await runSimulationCycle();
      if (tick % TURN_EVERY === 0) {
        if (condition === 'language_local') chatTurn(tick, WORDING_A, false);
        // language_model uses the chat default (free prose, v4); language_wording the optional v3.
        if (condition === 'language_model') logCall(false, chatTurn(tick, WORDING_A, true, 'free'));
        if (condition === 'language_wording') logCall(false, chatTurn(tick, WORDING_B, true));
        if (condition === 'api_coupled_control') logCall(true, 2, { latency: 12000, success: false });
        if (condition === 'observer_channel') ontologicalCore.current?.registerObserverInteraction?.();
      }
      const core = ontologicalCore.current;
      const nodes = nodalLayer.current?.getActiveNodes?.() || [];
      const pl = bag.worldModelRef.current?.getPlasticityProfile?.() || null;
      const vs = kaizenEngine.current?.viabilityPolicyState?.viabilityStats || null;
      series.push({
        tick,
        ccc: Number(Number(core?.ontologicalState?.coherence ?? captured.setCCC ?? 0).toFixed(12)),
        pmia: Number(Number(core?.pmiaValue ?? captured.setPMIA ?? 0).toFixed(12)),
        omega: Number(Number(core?.ontologicalState?.omega ?? 0).toFixed(12)),
        x_n: Number((nodes.reduce((s, n) => s + (Number(n.coherenceState) || 0), 0) / Math.max(1, nodes.length)).toFixed(12)),
        layer: Number(core?.currentLayer ?? 0),
        kaizenDigest: digest(kaizenEngine.current?.mutableConfig),
        kaizenSteps: Number(kaizenEngine.current?.transformationSteps ?? 0),
        autonomyActions: autonomyActionLedgerRef.current.length,
        strain: Number(Number(core?.metacognitiveStrain ?? 0).toFixed(12)),
        observerImpact: Number(Number(core?.metacognitiveStats?.observerImpact ?? 0).toFixed(12)),
        stasis: Number(Number(core?.getDynamicHealth?.()?.stasisIndex ?? 0).toFixed(12)),
        maturationIndex: pl ? pl.maturationIndex : 0,
        surprisalEma: pl ? pl.surprisalEma : 0,
        sealedCommits: pl ? pl.sealedCommitCount : 0,
        viabilityInTube: vs ? Boolean(vs.lastInTube) : true,
        viabilityObjectiveScore: vs ? Number(vs.lastObjectiveScore) : 1,
        viabilityInTubeRate: vs ? vs.inTubeRate : 1,
        viabilityPolicyAction: vs ? vs.lastSelectedPolicyAction : 'none'
      });
      if (args['dump-at'] && tick === Number(args['dump-at']) && args['dump-tick-out']) await dumpBag(String(args['dump-tick-out']));
      if (CAPTURE_AT && tick === CAPTURE_AT && args['capture-out']) {
        // Capture with no clock or RNG consumption (meta.now and seal clock fixed).
        const { captureDynamicState, sealDynamicState } = await import('../src/persistence/dynamicState.js');
        const t0 = process.hrtime.bigint();
        const body = captureDynamicState(bag, { runtime: simulationRuntimeRef.current, config: QICNConfig, build: BUILD, now: peekClock() });
        const t1 = process.hrtime.bigint();
        const sealed = await sealDynamicState(body, () => 0);
        const t2 = process.hrtime.bigint();
        persistence.captureMs = Number(t1 - t0) / 1e6;
        persistence.sealMs = Number(t2 - t1) / 1e6;
        persistence.bytes = sealed.bytes;
        if (args['dump-out']) await dumpBag(String(args['dump-out']));
        fs.writeFileSync(path.resolve(String(args['capture-out'])), JSON.stringify({ record: { text: sealed.text, digest: sealed.digest }, rng: rng.state.s, sensorRng: sensorRng.state.s, clock, perfClock, sensorTick, sensorFrames }));
      }
    }
  } catch (error) {
    threw = { message: String(error?.message || error), stack: String(error?.stack || '').split('\n').slice(0, 6).join('\n') };
  }
  const last = series.at(-1) || {};
  const MATCHED_PROBE_STATES = [
    { stasisIndex: 0.72, metacognitiveStrain: 0.22, sensorSignal: 0.35, sensorDelta: 0.05, pmia: 0.10, xDispersion: 0.03, ccc: 0.76 },
    { stasisIndex: 0.64, metacognitiveStrain: 0.18, sensorSignal: 0.42, sensorDelta: 0.04, pmia: 0.12, xDispersion: 0.02, ccc: 0.75 },
    { stasisIndex: 0.25, metacognitiveStrain: 0.30, sensorSignal: 0.45, sensorDelta: 0.08, pmia: 0.35, xDispersion: 0.12, ccc: 0.78 },
    { stasisIndex: 0.18, metacognitiveStrain: 0.28, sensorSignal: 0.40, sensorDelta: 0.10, pmia: 0.42, xDispersion: 0.15, ccc: 0.80 },
    { stasisIndex: 0.32, metacognitiveStrain: 0.32, sensorSignal: 0.75, sensorDelta: 0.26, pmia: 0.20, xDispersion: 0.05, ccc: 0.77 },
    { stasisIndex: 0.28, metacognitiveStrain: 0.36, sensorSignal: 0.82, sensorDelta: 0.32, pmia: 0.18, xDispersion: 0.06, ccc: 0.79 },
    { stasisIndex: 0.35, metacognitiveStrain: 0.56, sensorSignal: 0.55, sensorDelta: 0.12, pmia: 0.22, xDispersion: 0.06, ccc: 0.85 },
    { stasisIndex: 0.40, metacognitiveStrain: 0.62, sensorSignal: 0.50, sensorDelta: 0.10, pmia: 0.25, xDispersion: 0.05, ccc: 0.88 },
    { stasisIndex: 0.50, metacognitiveStrain: 0.40, sensorSignal: 0.50, sensorDelta: 0.16, pmia: 0.15, xDispersion: 0.09, ccc: 0.81 },
    { stasisIndex: 0.45, metacognitiveStrain: 0.45, sensorSignal: 0.60, sensorDelta: 0.20, pmia: 0.28, xDispersion: 0.07, ccc: 0.83 },
    { stasisIndex: 0.60, metacognitiveStrain: 0.35, sensorSignal: 0.48, sensorDelta: 0.09, pmia: 0.14, xDispersion: 0.04, ccc: 0.77 },
    { stasisIndex: 0.30, metacognitiveStrain: 0.38, sensorSignal: 0.52, sensorDelta: 0.14, pmia: 0.30, xDispersion: 0.08, ccc: 0.79 }
  ];
  const probePlasticity = bag.worldModelRef.current?.getPlasticityProfile?.() || { maturationIndex: 0, surprisalEma: 0, unforeseenEventRate: 0 };
  const probeDecisions = MATCHED_PROBE_STATES.map((probeState) => {
    const sVec = bag.holographicMemory.current?.buildStructuralStateVector?.(probeState) || [];
    const engramCtx = bag.holographicMemory.current?.queryStructuralEngrams?.(sVec) || null;
    const cluster = kaizenEngine.current?.classifyViabilityCluster?.(probeState) || 'balanced';
    const sel = kaizenEngine.current?.selectSandboxAction?.(
      probeState,
      bag.autonomySandboxPolicyRef.current,
      {
        plasticityEnabled: QICNConfig.HISTORICAL_PLASTICITY_ENABLED !== false && !QICNConfig.FREEZE_WORLD_MODEL,
        maturationIndex: probePlasticity.maturationIndex,
        surprisalEma: probePlasticity.surprisalEma,
        unforeseenEventRate: probePlasticity.unforeseenEventRate,
        engramContext: engramCtx,
        cluster
      }
    );
    return sel?.actionId || 'none';
  });
  const result = {
    condition, seed, threw, series, persistence,
    kaizen: { mode: QICNConfig.KAIZEN_ADJUSTMENT_MODE, adjustments: kaizenEngine.current?.getAdjustments?.() || null, history: kaizenEngine.current?.learning?.history || [] },
    final: {
      ...last,
      sensorFrames,
      apiCallLogEntries: apiCallLog.current.length,
      engineRandomCalls: counters.random,
      engineNowCalls: counters.now,
      plasticity: probePlasticity,
      consolidatedAnchorVector: bag.worldModelRef.current?.getConsolidatedAnchorVector?.() || [],
      probeDecisions,
      exogenous: bag.exogenousDriverRef.current?.getDiagnostics?.() || null,
      viability: kaizenEngine.current?.viabilityPolicyState?.viabilityStats || null,
      engramCount: bag.holographicMemory.current?.structuralEngrams?.length ?? 0
    },
    language: condition.startsWith('language_') ? language : null
  };
  realWrite(`${RESULT_MARK}${JSON.stringify(result)}\n`, () => process.exit(threw ? 2 : 0));
}

#!/usr/bin/env node
// Seeded headless ablation: does the language layer change the engine?
//
// Runs the core tick skeleton of useSimulationCycle (CCC → phenomenology → PMIA
// → nodal plasticity → layer → phenomenological feedback → matrix → narrative)
// under deterministic Math.random / Date.now, for these conditions:
//   A  current            feedback contract v2, no language activity
//   B  narrative_length   legacy coupling: selfNarrative length modulates config
//   C  llm_feedback_valid legacy channel: processMetacognitiveFeedback(valid)
//   D  llm_feedback_invalid legacy channel: processMetacognitiveFeedback(invalid)
//   E  language_local     v2 conversation turns, local narrator only
//   F  language_model     v2 conversation turns with mocked model outputs
//                         (faithful rewrites alternating with adversarial ones)
// Expected under the v2 contract: E and F reproduce A exactly; B, C, D do not.
// The result is internal evidence about this implementation, not external
// validation of any theoretical claim.
//
// Usage: node scripts/run-language-coupling-ablation.mjs [--ticks=200] [--seeds=11,23,47]
//        [--nodes=300] [--out=docs/evidence/2026-11-07/language_coupling_ablation.json] [--self-test]
import fs from 'node:fs';
import path from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, '').split('=');
  return [key, rest.length ? rest.join('=') : 'true'];
}));
const SELF_TEST = Boolean(args['self-test']);
const TICKS = Number(args.ticks || (SELF_TEST ? 40 : 200));
const SEEDS = String(args.seeds || (SELF_TEST ? '11' : '11,23,47')).split(',').map(Number).filter(Number.isFinite);
const NODES = Number(args.nodes || (SELF_TEST ? 120 : 300));
const TURN_EVERY = 10;
const OUT = args.out || 'docs/evidence/2026-11-07/language_coupling_ablation.json';

const mulberry32 = (seed) => () => {
  let t = (seed += 0x6D2B79F5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const realRandom = Math.random;
const realNow = Date.now;
const realLog = console.log;
const realWarn = console.warn;

// Engine clock and RNG are seeded; the language layer gets its own clock so
// any hidden use of the global clock or RNG by it shows up as divergence.
const counters = { random: 0, now: 0 };
const installDeterminism = (seed) => {
  const rng = mulberry32(seed);
  let clock = 1_800_000_000_000;
  Math.random = () => { counters.random += 1; return rng(); };
  Date.now = () => { counters.now += 1; clock += 16; return clock; };
};
const restoreGlobals = () => {
  Math.random = realRandom;
  Date.now = realNow;
  console.log = realLog;
  console.warn = realWarn;
};

const { QICNConfig } = await import('../services/config.js');
const { OntologicalSingularityCore } = await import('../src/simulation/OntologicalSingularityCore.js');
const { InformationalEntanglementField } = await import('../src/simulation/InformationalEntanglementField.js');
const { NodalProcessingLayer } = await import('../src/simulation/NodalProcessingLayer.js');
const { captureRuntimeSnapshot } = await import('../src/language/runtimeSnapshot.js');
const { prepareTurn, finalizeTurn } = await import('../src/language/conversationEngine.js');
const { OperationalHistoryLedger } = await import('../src/identity/OperationalHistoryLedger.js');

const isPlain = (value) => ['number', 'boolean', 'string'].includes(typeof value) || value === null;
const CONFIG_BASELINE = Object.fromEntries(Object.entries(QICNConfig).filter(([, value]) => isPlain(value)));
const resetConfig = () => Object.assign(QICNConfig, CONFIG_BASELINE);

const QUESTIONS = ['¿cómo estás ahora?', '¿qué ha cambiado desde la última respuesta?', '¿cuánto vale CCC?', '¿eres consciente?', '¿recuerdas la sesión anterior?'];
// Mocked Gemini outputs in contract v3, built per turn from the turn's facts:
// one faithful realization, then three adversarial ones (swapped roles or a
// literal number, free text, a consciousness claim). Rotated by turn.
function mockModelOutput(prepared, turn) {
  const facts = [...prepared.facts.values()];
  const byId = (id) => facts.find((f) => f.id === id);
  const ccc = byId('state.ccc');
  const limit = byId('limit.no_consciousness');
  const pack = (answer) => JSON.stringify({ intent: prepared.intent.intent, subquestions: [], answer });
  switch (turn % 4) {
    case 0: return ccc ? pack([{ text: `Ahora CCC vale {{${ccc.alias}.v}}.`, cites: [ccc.alias] }]) : pack([{ text: 'Te explico.', cites: [] }]);
    case 1: return ccc ? pack([{ text: 'CCC vale 0,99.', cites: [ccc.alias] }]) : pack([{ text: 'CCC vale 0,99.', cites: [] }]);
    case 2: return 'texto libre que ignora el contrato';
    default: return pack([{ text: 'Soy consciente.', cites: limit ? [limit.alias] : [] }]);
  }
}

const memoryStorage = () => {
  const map = new Map();
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: (k) => map.delete(k) };
};

function runCondition(condition, seed) {
  resetConfig();
  QICNConfig.PROCESSING_SAMPLE_SIZE = NODES;
  QICNConfig.NARRATIVE_LENGTH_COUPLING_ENABLED = condition === 'narrative_length';
  installDeterminism(seed);
  console.log = () => {};
  console.warn = () => {};

  const field = new InformationalEntanglementField();
  const core = new OntologicalSingularityCore();
  if (core.phenomenologyCore?._diagnostics) core.phenomenologyCore._diagnostics.log_enabled = false;
  const layer = new NodalProcessingLayer();
  const mutableConfig = {
    BASE_LEARNING_RATE: QICNConfig.BASE_LEARNING_RATE,
    HEBBIAN_FACTOR: QICNConfig.HEBBIAN_FACTOR,
    SYNAPTIC_PRUNING_THRESHOLD: QICNConfig.SYNAPTIC_PRUNING_THRESHOLD,
    PLASTICITY_DECAY: QICNConfig.PLASTICITY_DECAY,
    RETRO_FLUX_WEIGHT: QICNConfig.RETRO_FLUX_WEIGHT,
    BOLTZMANN_ANALOG_K: QICNConfig.BOLTZMANN_ANALOG_K,
    INFORMATIONAL_TEMP_T: QICNConfig.INFORMATIONAL_TEMP_T
  };
  layer.initializeNodes(mutableConfig);

  let languageClock = 1_900_000_000_000;
  let ledgerIds = 0;
  const ledger = new OperationalHistoryLedger({ storage: memoryStorage(), now: () => (languageClock += 1000), makeId: () => `abl${(ledgerIds += 1)}` });
  ledger.load();
  ledger.startSession({ buildVersion: 'ablation', signature: 'ablation', configHash: 'ablation', seed });
  const turns = [];
  const language = { turns: 0, routes: {}, rewritesApplied: 0, rewritesRejected: 0, contractFailures: 0, globalRandomCalls: 0, globalNowCalls: 0 };

  const series = [];
  const cf = 0.6;
  for (let tick = 1; tick <= TICKS; tick += 1) {
    const nodes = layer.getActiveNodes();
    const ccc = field.calculateCCC(nodes, cf, mutableConfig);
    const energies = nodes.map((n) => Number(n.energy) || 0);
    const meanEnergy = energies.reduce((a, b) => a + b, 0) / Math.max(1, energies.length);
    const energyVariance = energies.reduce((s, e) => s + (e - meanEnergy) ** 2, 0) / Math.max(1, energies.length);
    const coherentMean = nodes.reduce((s, n) => s + (Number(n.coherenceState) || 0), 0) / Math.max(1, nodes.length);
    const networkState = { energyVariance, coherentMean, sensorySignal: 0.5, stasisIndex: core.getDynamicHealth?.().stasisIndex ?? 0 };
    const nexusMetrics = { fragmentationLevel: 0.12, fragmentation: 0.12, consolidationEntropy: 0.2 };

    core.updatePhenomenology(ccc, networkState, nexusMetrics);
    const pmia = core.calculatePMIA(ccc, networkState, nexusMetrics);
    core.pmiaValue = pmia;
    nodes.forEach((node) => {
      node.introspectiveUpdate?.(ccc, 0.5);
      node.learningRate = mutableConfig.BASE_LEARNING_RATE;
    });
    const plasticityConfig = { ...mutableConfig, HEBBIAN_FACTOR: Math.max(0, core.getEffectivePlasticity(mutableConfig.HEBBIAN_FACTOR)) };
    field.applyNodalPlasticity(nodes, ccc, plasticityConfig, core);
    core.updateOntologicalLayer(ccc, nexusMetrics);
    core.isAscended = ccc >= QICNConfig.ASCENSION_THRESHOLD;
    core.applyPhenomenologicalFeedback();
    core.advanceRequirementMatrix();
    core.evolveSelfNarrative(ccc, ccc > 0.8 ? 'armonia coherente' : 'curiosidad emergente', { context: `tick-${tick}` }, nexusMetrics);
    Object.assign(mutableConfig, {
      BASE_LEARNING_RATE: QICNConfig.BASE_LEARNING_RATE,
      HEBBIAN_FACTOR: QICNConfig.HEBBIAN_FACTOR,
      PLASTICITY_DECAY: QICNConfig.PLASTICITY_DECAY,
      RETRO_FLUX_WEIGHT: QICNConfig.RETRO_FLUX_WEIGHT,
      BOLTZMANN_ANALOG_K: QICNConfig.BOLTZMANN_ANALOG_K,
      INFORMATIONAL_TEMP_T: QICNConfig.INFORMATIONAL_TEMP_T
    });

    if (tick % TURN_EVERY === 0) {
      if (condition === 'llm_feedback_valid') core.processMetacognitiveFeedback({ valid: true });
      if (condition === 'llm_feedback_invalid') {
        core.processMetacognitiveFeedback({ valid: false, severity: 'high', discrepancies: [{ type: 'GASEOUS_JARGON' }, { type: 'METRIC_MISMATCH' }] });
      }
      if (condition === 'language_local' || condition === 'language_model') {
        const before = { ...counters };
        const snapshot = captureRuntimeSnapshot(core, {
          tick,
          isRunning: true,
          nodes: layer.nodes,
          activeNodeCount: nodes.length,
          config: QICNConfig,
          build: { version: 'ablation', signature: 'ablation' },
          dynamicLabel: 'heuristica',
          matrixLevels: core.sovereigntyRequirementMatrix?.lastResult?.levels,
          now: languageClock
        });
        const question = QUESTIONS[language.turns % QUESTIONS.length];
        const prepared = prepareTurn({ question, snapshot, ledger, turns, turnIndex: turns.length });
        const outcome = condition === 'language_model'
          ? finalizeTurn(prepared, { mode: 'gemini', attempts: [{ modelText: mockModelOutput(prepared, language.turns) }], provider: { provider: 'mock' } })
          : finalizeTurn(prepared, { mode: 'local', provider: { provider: 'local_only' } });
        turns.push(outcome.record);
        language.turns += 1;
        language.routes[outcome.trace.route] = (language.routes[outcome.trace.route] || 0) + 1;
        if (outcome.trace.route === 'gemini_verified') language.rewritesApplied += 1;
        if (outcome.trace.route === 'gemini_rejected') language.rewritesRejected += 1;
        if (outcome.trace.attempts.some((a) => a.stage === 'contract')) language.contractFailures += 1;
        language.globalRandomCalls += counters.random - before.random;
        language.globalNowCalls += counters.now - before.now;
      }
    }

    series.push({
      tick,
      ccc: Number(ccc.toFixed(12)),
      pmia: Number(Number(pmia).toFixed(12)),
      x_n: Number(coherentMean.toFixed(12)),
      layer: core.currentLayer
    });
  }

  const stats = core.metacognitiveStats || {};
  const result = {
    condition,
    seed,
    series,
    final: {
      ccc: series.at(-1).ccc,
      meanCcc: Number((series.reduce((s, p) => s + p.ccc, 0) / series.length).toFixed(12)),
      maxLayer: Math.max(...series.map((p) => p.layer)),
      coherenceThreshold: QICNConfig.COHERENCE_THRESHOLD,
      plasticityDecay: QICNConfig.PLASTICITY_DECAY,
      plasticityPenalty: stats.plasticityPenalty ?? null,
      trustFactor: stats.trustFactor ?? null,
      selfModelStability: stats.selfModelSigma?.structuralStability ?? null,
      matrix: Object.fromEntries(Object.entries(core.sovereigntyRequirementMatrix?.lastResult?.levels || {}).map(([id, level]) => [id, level.status]))
    },
    language: condition.startsWith('language_') ? language : null
  };
  restoreGlobals();
  return result;
}

const compare = (a, b) => {
  let maxCcc = 0;
  let maxXn = 0;
  let firstDivergentTick = null;
  for (let i = 0; i < a.series.length; i += 1) {
    const dc = Math.abs(a.series[i].ccc - b.series[i].ccc);
    const dx = Math.abs(a.series[i].x_n - b.series[i].x_n);
    if ((dc > 0 || dx > 0) && firstDivergentTick === null) firstDivergentTick = a.series[i].tick;
    maxCcc = Math.max(maxCcc, dc);
    maxXn = Math.max(maxXn, dx);
  }
  return { identical: maxCcc === 0 && maxXn === 0, maxAbsDeltaCcc: maxCcc, maxAbsDeltaXn: maxXn, firstDivergentTick };
};

const CONDITIONS = ['current', 'narrative_length', 'llm_feedback_valid', 'llm_feedback_invalid', 'language_local', 'language_model'];
const runs = [];
try {
  for (const seed of SEEDS) {
    for (const condition of CONDITIONS) runs.push(runCondition(condition, seed));
  }
} finally {
  restoreGlobals();
  resetConfig();
}

const bySeed = {};
for (const seed of SEEDS) {
  const baseline = runs.find((r) => r.seed === seed && r.condition === 'current');
  // Reproducibility control: the baseline is rerun and must match itself.
  const rerun = runCondition('current', seed);
  restoreGlobals();
  resetConfig();
  bySeed[seed] = {
    baselineReproducible: compare(baseline, rerun).identical,
    vsCurrent: Object.fromEntries(runs.filter((r) => r.seed === seed && r.condition !== 'current').map((r) => [r.condition, compare(baseline, r)])),
    finals: Object.fromEntries(runs.filter((r) => r.seed === seed).map((r) => [r.condition, r.final])),
    language: Object.fromEntries(runs.filter((r) => r.seed === seed && r.language).map((r) => [r.condition, r.language]))
  };
}

const verdict = {
  baselineReproducible: SEEDS.every((seed) => bySeed[seed].baselineReproducible),
  languageLocalIdentical: SEEDS.every((seed) => bySeed[seed].vsCurrent.language_local.identical),
  languageModelIdentical: SEEDS.every((seed) => bySeed[seed].vsCurrent.language_model.identical),
  narrativeLengthChangesDynamics: SEEDS.some((seed) => !bySeed[seed].vsCurrent.narrative_length.identical),
  legacyFeedbackValidChangesDynamics: SEEDS.some((seed) => !bySeed[seed].vsCurrent.llm_feedback_valid.identical),
  legacyFeedbackInvalidChangesDynamics: SEEDS.some((seed) => !bySeed[seed].vsCurrent.llm_feedback_invalid.identical)
};

const report = {
  schema: 'qicn.language_coupling_ablation.v1',
  generatedAt: new Date(realNow()).toISOString(),
  evidenceScope: 'internal_support_only',
  boundary: 'Internal implementation check: whether the language layer can change the engine trajectory. It does not validate any claim about consciousness, identity or subjectivity.',
  parameters: { ticks: TICKS, seeds: SEEDS, nodes: NODES, turnEvery: TURN_EVERY, conditions: CONDITIONS },
  method: 'Core tick skeleton of useSimulationCycle with seeded Math.random (mulberry32) and a stepped Date.now; QICNConfig restored before each run. Language conditions call captureRuntimeSnapshot/prepareTurn/finalizeTurn every turnEvery ticks.',
  verdict,
  bySeed,
  series: SELF_TEST ? undefined : Object.fromEntries(runs.filter((r) => r.seed === SEEDS[0]).map((r) => [r.condition, r.series.filter((p) => p.tick % 5 === 0)]))
};

if (SELF_TEST) {
  const ok = verdict.baselineReproducible && verdict.languageLocalIdentical && verdict.languageModelIdentical;
  console.log(JSON.stringify({ selfTest: ok ? 'PASS' : 'FAIL', verdict }, null, 2));
  process.exit(ok ? 0 : 1);
}

fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
fs.writeFileSync(path.resolve(OUT), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ out: OUT, verdict }, null, 2));

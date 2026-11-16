// Shared fixtures for language-layer tests. A fake core exposes only the
// fields the snapshot reads; a Proxy records any write attempt.
import { captureRuntimeSnapshot } from '../../src/language/runtimeSnapshot.js';
import { OperationalHistoryLedger } from '../../src/identity/OperationalHistoryLedger.js';

export const makeMemoryStorage = () => {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    _map: map
  };
};

export const makeFakeCore = (overrides = {}) => {
  const writes = [];
  const base = {
    ontologicalState: {
      coherence: 0.742137,
      beth_q: 0.8193,
      beth_q_mode: 'warmup_derived',
      omega: 0.4211,
      spectral_gap: 0.6937,
      relaxation_time: 0.8466,
      holonomy_winding: 0.12,
      regime: 'PRE_CONSCIOUS',
      phenomenology_class: 'C',
      ...overrides.ontologicalState
    },
    pmiaValue: overrides.pmiaValue ?? -0.1234,
    currentLayer: overrides.currentLayer ?? 0,
    phenomenologyCore: { transitionHistory: new Array(overrides.transitions ?? 3).fill(0) },
    getDynamicHealth: overrides.getDynamicHealth || (() => ({ stasisIndex: 0.31 }))
  };
  const watch = (target, path) => new Proxy(target, {
    set(obj, prop, value) { writes.push(`${path}.${String(prop)}`); obj[prop] = value; return true; },
    get(obj, prop) {
      const value = obj[prop];
      return value && typeof value === 'object' && !Array.isArray(value) ? watch(value, `${path}.${String(prop)}`) : value;
    }
  });
  return { core: watch(base, 'core'), writes };
};

export const makeNodes = (n = 20, coherence = 0.6) => Array.from({ length: n }, (_, i) => ({ id: i, coherenceState: coherence + ((i % 5) - 2) * 0.01 }));

export const makeSnapshot = ({ tick = 120, isRunning = true, core = makeFakeCore().core, nodes = makeNodes(), config } = {}) => captureRuntimeSnapshot(core, {
  tick,
  isRunning,
  nodes,
  activeNodeCount: 12,
  config: config || { ASCENSION_THRESHOLD: 1, COHERENCE_THRESHOLD: 0.6, BASE_LEARNING_RATE: 0.1, HEBBIAN_FACTOR: 0.05, PROCESSING_SAMPLE_SIZE: 1500, CORE_SEED: 17057 },
  build: { version: '2.1.0-REINFORCED', signature: 'QICN-SIG-test' },
  dynamicLabel: 'armonía coherente',
  matrixLevels: { L1: { status: 'candidate' }, L2: { status: 'off' }, L3: { status: 'off' }, L4: { status: 'off' } },
  now: 1_800_000_000_000
});

export const makeLedger = ({ storage = makeMemoryStorage(), configHash = 'cfg-a', build = 'b1' } = {}) => {
  let clock = 1_800_000_000_000;
  let ids = 0;
  const ledger = new OperationalHistoryLedger({ storage, now: () => (clock += 1000), makeId: () => `id${(ids += 1)}` });
  ledger.load();
  ledger.startSession({ buildVersion: build, signature: 'sig', configHash, seed: 17057 });
  return { ledger, storage };
};

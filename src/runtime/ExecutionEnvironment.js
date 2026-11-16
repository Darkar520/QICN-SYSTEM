// claim_scope: internal_runtime_engineering
// evidence_scope: internal_support_only
// interpretation_boundary: No external validation, phenomenal proof or claim closure.
// Capabilities are associated out of band: persistence v3 never serializes
// callbacks, provider credentials, clocks or environment ownership.
import { QICNConfig } from '../../services/config.js';
import runtimeEnv from '../config/runtimeEnv.js';

const owners = new WeakMap();
const silent = Object.freeze({ log() {}, info() {}, warn() {}, error() {}, debug() {} });
export const LEGACY_EXECUTION_ENVIRONMENT = Object.freeze({
  mode: 'legacy', config: QICNConfig, runtimePolicy: runtimeEnv, controls: Object.freeze({}),
  get hasMeasurementClock() { return typeof globalThis.performance?.now === 'function'; },
  random: () => Math.random(), wallNow: () => Date.now(),
  measureNow: () => globalThis.performance.now(),
  makeDate: (...args) => new Date(...args),
  console, logger: silent,
  setTimeout: (...args) => globalThis.setTimeout(...args),
  clearTimeout: (...args) => globalThis.clearTimeout(...args),
  setInterval: (...args) => globalThis.setInterval(...args),
  clearInterval: (...args) => globalThis.clearInterval(...args),
  get fetch() { return typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : null; },
  abortController: () => new AbortController()
});

export function bindExecutionEnvironment(owner, environment) {
  if (environment && environment !== LEGACY_EXECUTION_ENVIRONMENT) owners.set(owner, environment);
  return owner;
}
export const executionEnvironmentFor = (owner) => owners.get(owner) || LEGACY_EXECUTION_ENVIRONMENT;
export const hasExecutionEnvironment = (owner) => owners.has(owner);

const copy = (value) => structuredClone(value);
const denied = (name) => () => { throw new Error(`workbench_capability_denied:${name}`); };
const mix = (seed, tick) => (Math.imul(seed ^ tick, 0x45d9f3b) ^ Math.imul(tick, 0x27d4eb2d)) >>> 0;

/** A branch owns its configuration, serializable RNG and virtual clocks. */
export function createDeterministicEnvironment({ config, seed = 11, profile = 'legacy_compatibility', state = null } = {}) {
  if (!['legacy_compatibility', 'paired_intervention'].includes(profile)) throw new Error('invalid_execution_profile');
  const initial = {
    rng: seed, clock: 1_800_000_000_000, perfClock: 0, tick: 0,
    randomCalls: 0, clockCalls: 0, measurementCalls: 0
  };
  let cursor = { ...initial };
  let pairedEpoch = cursor.clock, pairedMeasurementEpoch = cursor.perfClock;
  const environment = {
    mode: 'workbench', profile, config: copy(config || QICNConfig), controls: {}, diagnostics: {},
    runtimePolicy: { SELF_PATCH_ENABLED: false, SELF_PATCH_MODE: 'disabled', SELF_PATCH_CODE_PROVIDER: 'none', SELF_PATCH_CODE_MODEL: 'none', SELF_PATCH_AUTORUN_INTERVAL_MS: 0 },
    hasMeasurementClock: true,
    console: silent, logger: silent,
    random() {
      cursor.randomCalls += 1;
      let t = (cursor.rng += 0x6D2B79F5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    wallNow() {
      cursor.clockCalls += 1;
      if (profile === 'legacy_compatibility') cursor.clock += 16;
      return cursor.clock;
    },
    measureNow() { cursor.measurementCalls += 1; return ++cursor.perfClock; },
    makeDate(...args) { return new Date(...(args.length ? args : [environment.wallNow()])); },
    beginTick(tick, evaluationOffset = null) {
      cursor.tick = tick;
      if (profile === 'paired_intervention' && evaluationOffset !== null) {
        cursor.rng = mix(seed, evaluationOffset);
        cursor.clock = pairedEpoch + evaluationOffset * 1000;
        cursor.perfClock = pairedMeasurementEpoch + evaluationOffset * 1000;
      }
    },
    snapshot: () => copy(cursor),
    restore(next) {
      if (!next || Object.keys(initial).some((key) => !Number.isFinite(next[key]))) throw new Error('invalid_execution_cursor');
      cursor = Object.fromEntries(Object.keys(initial).map((key) => [key, next[key]]));
      pairedEpoch = cursor.clock; pairedMeasurementEpoch = cursor.perfClock;
    },
    peekClock: () => cursor.clock,
    setTimeout: denied('timer'), clearTimeout: denied('timer'),
    setInterval: denied('interval'), clearInterval: denied('interval'),
    fetch: denied('network'), abortController: denied('network_abort_controller')
  };
  if (state) environment.restore(state);
  return environment;
}

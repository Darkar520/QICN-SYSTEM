// Dynamic state persistence v3 (user decision 2026-11-08).
//
// Captures everything the simulation cycle carries from one tick to the next:
// the nodal network (every node and its weighted connections), the core and
// its nested estimators (phenomenology histories, PMIA, stasis, self-model Σ,
// requirement matrix), Kaizen (config, learned factors, learner), the
// MetaSovereignty checks, the entanglement field, holographic memory, world
// model and planner, the cycle's plain refs (regime band, timelines,
// autonomy ledger…), the modulated QICNConfig keys and the runtime values the
// cycle reads (tick, CCC, PMIA, ascension flag).
//
// Not captured, by construction: the RNG state (Math.random), the wall clock,
// sensor streams, the API call log and provider configuration (quantum bridge,
// keys). A restored run is a continuation from the saved state, not the same
// execution. Completeness is checked by scripts/run-state-restore-equivalence.mjs:
// with RNG and clock aligned in the headless harness, restore + N ticks must
// reproduce the uninterrupted trajectory exactly.
//
// The serializer is generic over class instances (fields restored in place
// into the freshly initialized instances) so new fields are captured without
// a manual list. Node references anywhere outside the node array are encoded
// by id. Browser objects (EventTarget), functions and excluded keys are skipped.

export const DYNAMIC_STATE_SCHEMA = 'qicn.dynamic_state.v3';

// Instance components restored in place, in capture order (nodal layer first
// so node references elsewhere resolve to node ids).
export const INSTANCE_REFS = Object.freeze([
  'nodalLayer', 'ontologicalCore', 'entanglementField', 'kaizenEngine', 'metaSovereigntyCheck',
  'holographicMemory', 'simulationControllerRef', 'structuralConsolidationRef', 'ppsTrackerRef', 'tickBudgetTrackerRef'
]);
// Plain refs whose `.current` value is replaced (or updated in place).
export const PLAIN_REFS = Object.freeze([
  'ascensionDynamicsRef', 'postThresholdRegimeRef', 'cccHistoryTimelineRef', 'entanglementTimelineRef',
  'internalPressureRef', 'latencyStrainRef', 'autonomyActionLedgerRef', 'autonomySandboxPolicyRef',
  'kaizenPendingEvalRef', 'lastObserverResonanceRef', 'previousFaceCountRef', 'plannerActuatorContribRef',
  'worldModelDiagnosticsRef', 'ppsMetricsRef', 'entropyModeRef', 'coherentCohortRef', 'ontologicalAutoPolicyRef',
  'ontologicalAutoQueueRef', 'recoveryTriggerCountRef', 'simulationErrorStreakRef', 'reportNormalizationFallbacksRef',
  'runtimeBudgetSnapshotRef', 'integrityPacketRef'
]);
// QICNConfig keys written by the cycle (applyPhenomenologicalFeedback) and Kaizen.
export const CONFIG_KEYS = Object.freeze([
  'BOLTZMANN_ANALOG_K', 'RETRO_FLUX_WEIGHT', 'INFORMATIONAL_TEMP_T', 'COHERENCE_THRESHOLD',
  'BASE_LEARNING_RATE', 'HEBBIAN_FACTOR', 'RESONANCE_FIELD_DECAY', 'PLASTICITY_DECAY', 'SYNAPTIC_PRUNING_THRESHOLD'
]);
export const RUNTIME_KEYS = Object.freeze(['simulationStep', 'ccc', 'pmia', 'isAscended', 'humanCcc']);
// Keys never captured: provider bridges, credentials, browser and logging objects.
const EXCLUDED_KEY = /^(quantumBridge\w*|quantumEntropyBridge\w*|sensoryEngine|sensory\w*|apiKey\w*|logger|sink|attachedCore)$/;

const SKIP = Symbol('skip');
const isPlainObject = (v) => {
  if (v === null || typeof v !== 'object') return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
};
const isBrowserObject = (v) => (typeof globalThis.EventTarget === 'function' && v instanceof globalThis.EventTarget)
  || (typeof globalThis.Node === 'function' && v instanceof globalThis.Node);

// Object graph codec. Every object gets an id at its first occurrence; later
// occurrences (shared references, cycles) are encoded as {__ref: id}, so
// sharing survives the round trip. Decoding follows the same order.
function encodeValue(value, ctx) {
  if (value === undefined) return { __undef: 1 };
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (Number.isFinite(value)) return value;
    return { __num: Number.isNaN(value) ? 'NaN' : (value > 0 ? 'Infinity' : '-Infinity') };
  }
  if (typeof value === 'bigint') return { __bigint: String(value) };
  if (typeof value === 'function' || typeof value === 'symbol') return SKIP;
  if (ctx.ids.has(value)) return { __ref: ctx.ids.get(value) };
  if (value instanceof Promise || value instanceof WeakMap || value instanceof WeakSet || value instanceof ArrayBuffer || isBrowserObject(value)) return SKIP;
  const id = ctx.next++;
  ctx.ids.set(value, id);
  if (value instanceof Date) return { __date: value.getTime(), __id: id };
  if (ArrayBuffer.isView(value)) return { __typed: value.constructor.name, data: Array.from(value), __id: id };
  if (value instanceof Set) return { __set: [...value].map((v) => encodeOrSkip(v, ctx)), __id: id };
  if (value instanceof Map) return { __map: [...value].map(([k, v]) => [encodeOrSkip(k, ctx), encodeOrSkip(v, ctx)]), __id: id };
  if (Array.isArray(value)) return { __arr: value.map((v) => encodeOrSkip(v, ctx)), __id: id };
  const fields = {};
  for (const key of Object.keys(value)) {
    if (EXCLUDED_KEY.test(key)) continue;
    const enc = encodeValue(value[key], ctx);
    if (enc !== SKIP) fields[key] = enc;
  }
  return isPlainObject(value) ? { __plain: fields, __id: id } : { __obj: fields, __class: value.constructor?.name || 'Object', __id: id };
}
const encodeOrSkip = (v, ctx) => { const e = encodeValue(v, ctx); return e === SKIP ? { __skip: 1 } : e; };

function decodeValue(enc, existing, ctx, path) {
  if (enc === null || typeof enc !== 'object') return enc;
  if (enc.__undef) return undefined;
  if (enc.__num) return Number(enc.__num);
  if (enc.__bigint) return BigInt(enc.__bigint);
  if ('__ref' in enc) {
    if (!ctx.byId.has(enc.__ref)) ctx.unrestored.push(`${path} (unresolved ref ${enc.__ref})`);
    return ctx.byId.get(enc.__ref);
  }
  const reg = (obj) => { ctx.byId.set(enc.__id, obj); return obj; };
  if ('__date' in enc) return reg(new Date(enc.__date));
  if (enc.__typed) { const C = globalThis[enc.__typed]; return reg(typeof C === 'function' ? C.from(enc.data) : enc.data); }
  if (enc.__arr) {
    const prev = Array.isArray(existing) ? existing : [];
    const out = reg([]);
    enc.__arr.forEach((e, i) => { out[i] = e && e.__skip ? prev[i] : decodeValue(e, prev[i], ctx, `${path}[${i}]`); });
    return out;
  }
  if (enc.__set) {
    const target = reg(existing instanceof Set ? existing : new Set());
    target.clear();
    enc.__set.forEach((e, i) => { if (!e?.__skip) target.add(decodeValue(e, undefined, ctx, `${path}[${i}]`)); });
    return target;
  }
  if (enc.__map) {
    const old = existing instanceof Map ? new Map(existing) : new Map();
    const target = reg(existing instanceof Map ? existing : new Map());
    target.clear();
    enc.__map.forEach(([k, v], i) => {
      if (k?.__skip || v?.__skip) return;
      const key = decodeValue(k, undefined, ctx, `${path}.key${i}`);
      target.set(key, decodeValue(v, old.get(key), ctx, `${path}.${String(key)}`));
    });
    return target;
  }
  if (enc.__obj) {
    if (existing && typeof existing === 'object') {
      reg(existing);
      restoreFields(existing, enc.__obj, ctx, path);
      return existing;
    }
    ctx.unrestored.push(`${path} (${enc.__class}: no fresh instance)`);
    return existing;
  }
  if (enc.__plain) {
    // Plain objects are rebuilt (stale keys of the fresh value do not survive);
    // nested class instances keep their identity.
    const out = reg({});
    for (const [key, value] of Object.entries(enc.__plain)) out[key] = decodeValue(value, existing?.[key], ctx, `${path}.${key}`);
    return out;
  }
  return enc;
}

function restoreFields(target, fields, ctx, path) {
  for (const [key, value] of Object.entries(fields)) {
    try {
      target[key] = decodeValue(value, target[key], ctx, `${path}.${key}`);
    } catch (error) {
      ctx.unrestored.push(`${path}.${key} (${error?.message || 'error'})`);
    }
  }
}

/** Debug helper: graph encoding of any value (used by the equivalence harness to locate uncaptured state). */
export function encodeForDiff(value) {
  const enc = encodeValue(value, { ids: new Map(), next: 1 });
  return enc === SKIP ? null : enc;
}

/**
 * Capture the dynamic state.
 * @param {object} refs React refs by name (the useSimulationCycle bag names)
 * @param {object} meta { runtime: {simulationStep, ccc, pmia, isAscended, humanCcc}, config: QICNConfig, build: {version, signature}, now }
 * @returns {object} body (plain JSON-safe object; not yet sealed)
 */
export function captureDynamicState(refs, meta = {}) {
  const nodes = refs.nodalLayer?.current?.nodes || [];
  const ctx = { ids: new Map(), next: 1 };
  const instances = {};
  for (const name of INSTANCE_REFS) {
    const current = refs[name]?.current;
    if (!current || typeof current !== 'object') continue;
    const enc = encodeValue(current, ctx);
    if (enc !== SKIP) instances[name] = enc;
  }
  const plain = {};
  for (const name of PLAIN_REFS) {
    if (!refs[name]) continue;
    plain[name] = encodeOrSkip(refs[name].current, ctx);
  }
  const config = {};
  for (const key of CONFIG_KEYS) if (Number.isFinite(meta.config?.[key])) config[key] = meta.config[key];
  const runtime = {};
  for (const key of RUNTIME_KEYS) if (meta.runtime && key in meta.runtime) runtime[key] = encodeOrSkip(meta.runtime[key], ctx);
  return {
    schema: DYNAMIC_STATE_SCHEMA,
    build: { version: String(meta.build?.version || 'unknown'), signature: String(meta.build?.signature || 'unknown') },
    nodeCount: nodes.length,
    tick: Number(meta.runtime?.simulationStep) || 0,
    savedAt: Number.isFinite(meta.now) ? meta.now : Date.now(),
    kaizenMode: meta.config?.KAIZEN_ADJUSTMENT_MODE || 'legacy',
    components: { instances, plain, config, runtime },
    notCaptured: ['rng_state', 'wall_clock', 'sensor_streams', 'api_call_log', 'provider_configuration']
  };
}

/**
 * Apply a verified body into freshly initialized refs (after initializeSystem).
 * Decoding follows the capture order so shared references resolve.
 * @returns {{ runtime: object, unrestored: string[] }} runtime values for the caller's React state
 */
export function applyDynamicState(refs, body, { config } = {}) {
  const ctx = { byId: new Map(), unrestored: [] };
  const c = body.components;
  for (const name of INSTANCE_REFS) {
    const enc = c.instances[name];
    if (!enc) continue;
    const target = refs[name]?.current;
    if (!target) { ctx.unrestored.push(name); continue; }
    decodeValue(enc, target, ctx, name);
  }
  for (const name of PLAIN_REFS) {
    if (!(name in c.plain) || !refs[name]) continue;
    const enc = c.plain[name];
    if (enc && enc.__skip) continue;
    refs[name].current = decodeValue(enc, refs[name].current, ctx, name);
  }
  if (config) for (const [key, value] of Object.entries(c.config || {})) config[key] = value;
  const runtime = {};
  for (const [key, enc] of Object.entries(c.runtime || {})) runtime[key] = decodeValue(enc, undefined, ctx, `runtime.${key}`);
  return { runtime, unrestored: ctx.unrestored };
}

// ---------------------------------------------------------------------------
// Sealing and verification
// ---------------------------------------------------------------------------
async function sha256HexAsync(text) {
  const subtle = globalThis.crypto?.subtle;
  if (subtle && typeof TextEncoder === 'function') {
    const buf = await subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  const { sha256Hex } = await import('../utils/integrity.js');
  return sha256Hex(text);
}

/** Serialize and digest. Returns { text, digest, bytes, timings }. */
export async function sealDynamicState(body, clock = () => (globalThis.performance?.now?.() ?? 0)) {
  const t0 = clock();
  const text = JSON.stringify(body);
  const t1 = clock();
  const digest = await sha256HexAsync(text);
  const t2 = clock();
  return { text, digest, bytes: text.length, timings: { stringifyMs: t1 - t0, digestMs: t2 - t1 } };
}

/**
 * Verify a stored record against the running build. Every mismatch rejects:
 * digest, schema, build version and signature, node count.
 */
export async function verifyStoredState(record, { build, nodeCount }) {
  if (!record || typeof record.text !== 'string' || typeof record.digest !== 'string') return { ok: false, reason: 'missing' };
  const digest = await sha256HexAsync(record.text);
  if (digest !== record.digest) return { ok: false, reason: 'digest_mismatch' };
  let body;
  try { body = JSON.parse(record.text); } catch { return { ok: false, reason: 'parse_error' }; }
  if (body?.schema !== DYNAMIC_STATE_SCHEMA) return { ok: false, reason: 'schema_mismatch', body };
  if (body.build?.version !== String(build?.version) || body.build?.signature !== String(build?.signature)) return { ok: false, reason: 'other_build', body };
  if (body.nodeCount !== nodeCount) return { ok: false, reason: 'node_count_mismatch', body };
  return { ok: true, reason: null, body, digest };
}

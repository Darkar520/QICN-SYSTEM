// Operational history ledger.
//
// Engineering record of the runtime's configuration, sessions and state
// transitions. It supports statements such as "the configuration did not change
// since the previous session" or "the dynamic state was reinitialized" because
// those facts are recorded and verifiable here (hash chain + digests).
//
// Boundary (see docs/THEORY_SOURCE_COVERAGE_2026-11-07.md §6.4):
// - This is not the rigid-identity object I_ri of Paper V, not Sigma_op of the
//   bridge paper and not any Paper VIII subjectivity module.
// - The ledger never feeds the dynamics. It only observes.
import { sha256Hex, stableStringify } from '../utils/integrity.js';

export const LEDGER_SCHEMA = 'qicn.operational_history_ledger.v1';
export const LEDGER_STORAGE_KEY = 'QICN_OPERATIONAL_LEDGER_V1';
export const LEDGER_MAX_EVENTS = 400;
export const LEDGER_MAX_SESSIONS = 30;
// Events that decide continuity and state origin. When the 400-event window
// drops them they are kept in `pinned` (2026-11-08) so a session can still be
// checked against its own start after long runs. Each pinned event keeps its
// own hash; it is verified by recomputing it, not by its old chain neighbours.
export const PINNED_EVENT_TYPES = Object.freeze(['session_start', 'snapshot_restored', 'system_reset']);
const PINNED_SET = new Set(PINNED_EVENT_TYPES);
export const LEDGER_MAX_PINNED = LEDGER_MAX_SESSIONS * 3;
export const GENESIS_HASH = '0'.repeat(64);

export const EVENT_TYPES = Object.freeze([
  'session_start',
  'run_started',
  'run_paused',
  'system_reset',
  'band_transition',
  'threshold_crossing',
  'regime_change',
  'class_change',
  'beth_q_mode_change',
  'spectral_gap_mode_change',
  'kaizen_mutation',
  'parameter_change',
  'snapshot_saved',
  'snapshot_restored',
  'snapshot_restore_failed',
  'observer_interaction',
  'llm_transport_error',
  'language_rejection'
]);

const EVENT_SET = new Set(EVENT_TYPES);

const finiteOrNull = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null);

const sanitizePayload = (payload) => {
  // Payloads are small, flat records. Strings are bounded; nested objects are
  // serialized deterministically so the hash covers exactly what is stored.
  const out = {};
  if (!payload || typeof payload !== 'object') return out;
  for (const [key, value] of Object.entries(payload)) {
    if (!/^[a-zA-Z0-9_]{1,40}$/.test(key)) continue;
    if (typeof value === 'number') out[key] = Number.isFinite(value) ? value : null;
    else if (typeof value === 'boolean' || value === null) out[key] = value;
    else if (typeof value === 'string') out[key] = value.slice(0, 160);
    else if (Array.isArray(value)) out[key] = value.slice(0, 12).map((item) => (typeof item === 'string' ? item.slice(0, 60) : item));
  }
  return out;
};

const hashEvent = (event) => sha256Hex(stableStringify({
  seq: event.seq,
  type: event.type,
  tick: event.tick,
  at: event.at,
  sessionId: event.sessionId,
  payload: event.payload,
  prevHash: event.prevHash
}));

export class OperationalHistoryLedger {
  constructor({ storage = null, now = () => Date.now(), makeId = null } = {}) {
    this.storage = storage;
    this.now = now;
    this.makeId = makeId || (() => `${this.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`);
    this.data = null;
    this.loadStatus = { status: 'not_loaded', reason: null };
    this.currentSession = null;
    this.previousSession = null;
    this.observed = null;
    this.lastHeartbeatTick = -Infinity;
  }

  // ---------------------------------------------------------------------------
  // Loading and verification
  // ---------------------------------------------------------------------------
  load() {
    let raw = null;
    try {
      raw = this.storage?.getItem?.(LEDGER_STORAGE_KEY) ?? null;
    } catch {
      raw = null;
    }
    if (!raw) {
      this.data = this._emptyLedger();
      this.loadStatus = { status: 'fresh', reason: 'no_prior_record' };
      return this.loadStatus;
    }
    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
    const verification = OperationalHistoryLedger.verify(parsed);
    if (!verification.ok) {
      // Keep a trace of the rupture without trusting the old content.
      this.data = this._emptyLedger();
      this.data.priorRupture = { reason: verification.reason, detectedAt: this.now() };
      this.loadStatus = { status: 'record_rupture', reason: verification.reason };
      return this.loadStatus;
    }
    this.data = parsed;
    this.loadStatus = { status: 'verified', reason: null };
    return this.loadStatus;
  }

  static verify(data) {
    if (!data || typeof data !== 'object') return { ok: false, reason: 'unparseable' };
    if (data.schema !== LEDGER_SCHEMA) return { ok: false, reason: 'schema_mismatch' };
    if (typeof data.instanceId !== 'string' || !data.instanceId) return { ok: false, reason: 'missing_instance_id' };
    if (!Array.isArray(data.events) || !Array.isArray(data.sessions)) return { ok: false, reason: 'malformed_lists' };
    let prevHash = typeof data.anchorHash === 'string' ? data.anchorHash : GENESIS_HASH;
    let prevSeq = null;
    for (const event of data.events) {
      if (!event || !EVENT_SET.has(event.type)) return { ok: false, reason: 'unknown_event_type' };
      if (event.prevHash !== prevHash) return { ok: false, reason: 'chain_break', seq: event.seq };
      if (prevSeq !== null && event.seq !== prevSeq + 1) return { ok: false, reason: 'sequence_gap', seq: event.seq };
      if (hashEvent(event) !== event.hash) return { ok: false, reason: 'hash_mismatch', seq: event.seq };
      prevHash = event.hash;
      prevSeq = event.seq;
    }
    if (data.headHash !== prevHash) return { ok: false, reason: 'head_mismatch' };
    // Pinned events (optional; absent in records written before 2026-11-08):
    // allowed types only, own hash recomputed, strictly older than the
    // retained window, increasing seq, one session_start per session.
    const pinned = data.pinned === undefined ? [] : data.pinned;
    if (!Array.isArray(pinned)) return { ok: false, reason: 'pinned_malformed' };
    const windowStartSeq = data.events.length ? data.events[0].seq : Number(data.nextSeq);
    let prevPinnedSeq = -Infinity;
    const pinnedStartIds = new Set();
    for (const event of pinned) {
      if (!event || !PINNED_SET.has(event.type)) return { ok: false, reason: 'pinned_unknown_type' };
      if (hashEvent(event) !== event.hash) return { ok: false, reason: 'pinned_hash_mismatch', seq: event.seq };
      if (!(event.seq < windowStartSeq) || !(event.seq > prevPinnedSeq)) return { ok: false, reason: 'pinned_order', seq: event.seq };
      if (event.type === 'session_start') {
        if (pinnedStartIds.has(event.sessionId)) return { ok: false, reason: 'pinned_duplicate_start' };
        pinnedStartIds.add(event.sessionId);
      }
      prevPinnedSeq = event.seq;
    }
    // Session metadata is not hashed directly; the fields that decide
    // continuity must match the hashed session_start event of that session
    // (in the chain or pinned). A session whose start event is in neither must
    // predate every retained event; it is then reported as unanchored.
    const starts = new Map([...pinned, ...data.events].filter((event) => event.type === 'session_start').map((event) => [event.sessionId, event]));
    const firstRetainedAt = [...pinned, ...data.events].length ? [...pinned, ...data.events][0].at : Infinity;
    for (const session of data.sessions) {
      if (!session || typeof session.sessionId !== 'string') return { ok: false, reason: 'session_malformed' };
      const start = starts.get(session.sessionId);
      if (!start) {
        if (!(Number(session.startedAt) < firstRetainedAt)) return { ok: false, reason: 'session_without_start_event' };
        continue;
      }
      const p = start.payload || {};
      if (p.configHash !== session.configHash) return { ok: false, reason: 'session_config_mismatch' };
      if (p.buildVersion !== session.buildVersion) return { ok: false, reason: 'session_build_mismatch' };
      if (typeof p.signature === 'string' && p.signature !== String(session.signature).slice(0, 40)) return { ok: false, reason: 'session_signature_mismatch' };
      if ('seed' in p && p.seed !== (session.seed ?? null)) return { ok: false, reason: 'session_seed_mismatch' };
      // Records written before 2026-11-08 took startedAt from a clock read just
      // before the event; up to 1 s of difference is accepted for them.
      if (!(Math.abs(Number(start.at) - Number(session.startedAt)) <= 1000)) return { ok: false, reason: 'session_start_time_mismatch' };
    }
    return { ok: true, reason: null };
  }

  // Origin of the dynamic state of a session, derived from hashed events
  // (session_start → reinitialized; system_reset → reinitialized;
  // snapshot_restored → restored_verified). The stored field is not trusted.
  static deriveStateOrigin(events, sessionId) {
    let origin = 'reinitialized';
    for (const event of events) {
      if (event.sessionId !== sessionId) continue;
      if (event.type === 'snapshot_restored') origin = 'restored_verified';
      else if (event.type === 'system_reset' || event.type === 'session_start') origin = 'reinitialized';
    }
    return origin;
  }

  // Payload and tick of the snapshot_restored event that defines the current
  // origin of a session (null when the session is reinitialized).
  static lastRestoreOf(events, sessionId) {
    let last = null;
    for (const event of events) {
      if (event.sessionId !== sessionId) continue;
      if (event.type === 'snapshot_restored') last = { ...(event.payload || {}), tick: event.tick, at: event.at };
      else if (event.type === 'system_reset' || event.type === 'session_start') last = null;
    }
    return last;
  }

  // 'chain' when the session_start event is in the retained window, 'pinned'
  // when it was kept after truncation, null when it is lost.
  static anchorOf(data, sessionId) {
    const isStart = (event) => event?.type === 'session_start' && event.sessionId === sessionId;
    if (data?.events?.some(isStart)) return 'chain';
    if (Array.isArray(data?.pinned) && data.pinned.some(isStart)) return 'pinned';
    return null;
  }

  static isAnchored(data, sessionId) {
    return OperationalHistoryLedger.anchorOf(data, sessionId) !== null;
  }

  // Pinned events first (they are older), then the retained window.
  static originEvents(data) {
    return [...(Array.isArray(data?.pinned) ? data.pinned : []), ...(data?.events || [])];
  }

  _emptyLedger() {
    return {
      schema: LEDGER_SCHEMA,
      instanceId: `qicn-${this.makeId()}`,
      createdAt: this.now(),
      anchorHash: GENESIS_HASH,
      headHash: GENESIS_HASH,
      nextSeq: 1,
      events: [],
      pinned: [],
      sessions: [],
      priorRupture: null
    };
  }

  // ---------------------------------------------------------------------------
  // Sessions
  // ---------------------------------------------------------------------------
  startSession({ buildVersion = 'unknown', signature = 'unknown', configHash = 'unknown', seed = null } = {}) {
    if (!this.data) this.load();
    const previous = this.data.sessions.length ? this.data.sessions[this.data.sessions.length - 1] : null;
    this.previousSession = previous ? { ...previous } : null;

    let continuity = 'fresh';
    if (this.loadStatus.status === 'record_rupture') continuity = 'record_rupture';
    else if (previous && !OperationalHistoryLedger.isAnchored(this.data, previous.sessionId)) {
      // The previous session's start event was truncated: its metadata cannot
      // be checked against the chain, so continuity is not asserted.
      continuity = 'previous_unanchored';
    } else if (previous) {
      const sameConfig = previous.configHash === configHash;
      const sameBuild = previous.buildVersion === buildVersion && previous.signature === signature;
      continuity = sameConfig && sameBuild ? 'continuous_record' : (sameConfig ? 'build_changed' : 'config_changed');
    }

    this.currentSession = {
      sessionId: `s-${this.makeId()}`,
      startedAt: this.now(),
      buildVersion,
      signature,
      configHash,
      seed: finiteOrNull(seed),
      lastTick: 0,
      lastSeenAt: this.now(),
      lastStateDigest: null,
      stateOrigin: 'reinitialized'
    };
    this.data.sessions.push(this.currentSession);
    if (this.data.sessions.length > LEDGER_MAX_SESSIONS) {
      this.data.sessions = this.data.sessions.slice(-LEDGER_MAX_SESSIONS);
    }
    const startEvent = this.record('session_start', {
      continuity,
      buildVersion,
      signature: String(signature).slice(0, 40),
      configHash,
      seed: finiteOrNull(seed),
      previousSessionId: previous?.sessionId || null,
      previousLastTick: previous ? finiteOrNull(previous.lastTick) : null,
      priorRuptureReason: this.data.priorRupture?.reason || null
    }, 0);
    // The session's start time is the hashed event time.
    this.currentSession.startedAt = startEvent.at;
    this._persist();
    this.continuity = continuity;
    return continuity;
  }

  heartbeat(tick, stateDigest = null, { every = 25 } = {}) {
    if (!this.currentSession) return false;
    const numericTick = finiteOrNull(tick);
    if (numericTick === null || numericTick - this.lastHeartbeatTick < every) return false;
    this.lastHeartbeatTick = numericTick;
    this.currentSession.lastTick = numericTick;
    this.currentSession.lastSeenAt = this.now();
    if (typeof stateDigest === 'string') this.currentSession.lastStateDigest = stateDigest.slice(0, 64);
    this._persist();
    return true;
  }

  markStateOrigin(origin) {
    if (this.currentSession && ['reinitialized', 'restored_verified'].includes(origin)) {
      this.currentSession.stateOrigin = origin;
      this._persist();
    }
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------
  record(type, payload = {}, tick = null) {
    if (!EVENT_SET.has(type)) throw new Error(`Unknown ledger event type: ${type}`);
    if (!this.data) this.load();
    const event = {
      seq: this.data.nextSeq,
      type,
      tick: finiteOrNull(tick),
      at: this.now(),
      sessionId: this.currentSession?.sessionId || null,
      payload: sanitizePayload(payload),
      prevHash: this.data.headHash
    };
    event.hash = hashEvent(event);
    this.data.events.push(event);
    this.data.headHash = event.hash;
    this.data.nextSeq += 1;
    if (this.data.events.length > LEDGER_MAX_EVENTS) {
      const dropped = this.data.events.length - LEDGER_MAX_EVENTS;
      this.data.anchorHash = this.data.events[dropped - 1].hash;
      // Keep the continuity-deciding events of sessions still on record.
      const kept = this.data.events.slice(0, dropped).filter((event) => PINNED_SET.has(event.type));
      if (!Array.isArray(this.data.pinned)) this.data.pinned = [];
      if (kept.length) {
        const live = new Set(this.data.sessions.map((session) => session.sessionId));
        this.data.pinned = [...this.data.pinned, ...kept]
          .filter((event) => live.has(event.sessionId))
          .slice(-LEDGER_MAX_PINNED);
      }
      this.data.events = this.data.events.slice(dropped);
    }
    this._persist();
    return event;
  }

  /**
   * Observe the end-of-tick state and record discrete transitions.
   * Pure observation: the arguments are plain values copied by the caller.
   */
  observeTick({ tick, layer, ccc, threshold, isAscended, regime, phenomenologyClass, bethQMode, spectralGapMode } = {}) {
    const next = {
      layer: finiteOrNull(layer),
      isAscended: Boolean(isAscended),
      regime: typeof regime === 'string' ? regime : null,
      phenomenologyClass: typeof phenomenologyClass === 'string' ? phenomenologyClass : null,
      bethQMode: typeof bethQMode === 'string' ? bethQMode : null,
      spectralGapMode: typeof spectralGapMode === 'string' ? spectralGapMode : null
    };
    const prev = this.observed;
    this.observed = next;
    if (!prev) return [];
    const recorded = [];
    const cccValue = finiteOrNull(ccc);
    if (prev.layer !== null && next.layer !== null && prev.layer !== next.layer) {
      recorded.push(this.record('band_transition', { from: prev.layer, to: next.layer, ccc: cccValue }, tick));
    }
    if (prev.isAscended !== next.isAscended) {
      recorded.push(this.record('threshold_crossing', {
        direction: next.isAscended ? 'up' : 'down', ccc: cccValue, threshold: finiteOrNull(threshold)
      }, tick));
    }
    if (prev.regime && next.regime && prev.regime !== next.regime) {
      recorded.push(this.record('regime_change', { from: prev.regime, to: next.regime }, tick));
    }
    if (prev.phenomenologyClass && next.phenomenologyClass && prev.phenomenologyClass !== next.phenomenologyClass) {
      recorded.push(this.record('class_change', { from: prev.phenomenologyClass, to: next.phenomenologyClass }, tick));
    }
    if (prev.bethQMode && next.bethQMode && prev.bethQMode !== next.bethQMode) {
      recorded.push(this.record('beth_q_mode_change', { from: prev.bethQMode, to: next.bethQMode }, tick));
    }
    if (prev.spectralGapMode && next.spectralGapMode && prev.spectralGapMode !== next.spectralGapMode) {
      recorded.push(this.record('spectral_gap_mode_change', { from: prev.spectralGapMode, to: next.spectralGapMode }, tick));
    }
    return recorded;
  }

  resetObservation() {
    this.observed = null;
  }

  // ---------------------------------------------------------------------------
  // Read model
  // ---------------------------------------------------------------------------
  summary({ recent = 8 } = {}) {
    const data = this.data || this._emptyLedger();
    const events = data.events;
    const counts = {};
    for (const event of events) counts[event.type] = (counts[event.type] || 0) + 1;
    const sessionEvents = this.currentSession
      ? events.filter((event) => event.sessionId === this.currentSession.sessionId)
      : [];
    const verification = OperationalHistoryLedger.verify(data);
    return {
      schema: LEDGER_SCHEMA,
      instanceId: data.instanceId,
      createdAt: data.createdAt,
      chainOk: verification.ok,
      chainReason: verification.reason,
      headHash: data.headHash,
      loadStatus: this.loadStatus.status,
      priorRuptureReason: data.priorRupture?.reason || null,
      continuity: this.continuity || null,
      sessionCount: data.sessions.length,
      // stateOrigin is derived from hashed events; lastTick/lastSeenAt are an
      // unchained heartbeat and are labelled as such by the language layer.
      currentSession: this.currentSession
        ? { ...this.currentSession, stateOrigin: OperationalHistoryLedger.deriveStateOrigin(OperationalHistoryLedger.originEvents(data), this.currentSession.sessionId), restore: OperationalHistoryLedger.lastRestoreOf(OperationalHistoryLedger.originEvents(data), this.currentSession.sessionId), anchored: OperationalHistoryLedger.isAnchored(data, this.currentSession.sessionId), anchoredBy: OperationalHistoryLedger.anchorOf(data, this.currentSession.sessionId) }
        : null,
      previousSession: this.previousSession
        ? { ...this.previousSession, stateOrigin: OperationalHistoryLedger.deriveStateOrigin(OperationalHistoryLedger.originEvents(data), this.previousSession.sessionId), anchored: OperationalHistoryLedger.isAnchored(data, this.previousSession.sessionId), anchoredBy: OperationalHistoryLedger.anchorOf(data, this.previousSession.sessionId) }
        : null,
      eventCount: events.length,
      pinnedCount: Array.isArray(data.pinned) ? data.pinned.length : 0,
      firstRetainedSeq: events.length ? events[0].seq : null,
      counts,
      sessionEventCount: sessionEvents.length,
      recentEvents: events.slice(-recent).map((event) => ({
        seq: event.seq, type: event.type, tick: event.tick, at: event.at, payload: { ...event.payload }, sessionId: event.sessionId
      }))
    };
  }

  _persist() {
    try {
      this.storage?.setItem?.(LEDGER_STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // Storage quota or privacy mode: the in-memory record stays authoritative
      // for this session and the summary reports chainOk from memory.
    }
  }
}

export default OperationalHistoryLedger;

import { sha256Hex, stableStringify } from '../utils/integrity.js';

const DEFAULT_PRIORITY = [
  'KILL_SWITCH',
  'WORLD_MODEL_OFF',
  'PLANNER_OFF',
  'LEARNING_FREEZE',
  'ENTROPY_CLAMP',
  'SENSOR_MUTE',
  'SENSORY_DEGRADE'
];

const toFiniteInt = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
};

const canonicalEventIdInput = (event) => ({
  tag: String(event?.tag || ''),
  start_tick: toFiniteInt(event?.start_tick, -1),
  duration_ticks: toFiniteInt(event?.duration_ticks, -1),
  params: event?.params && typeof event.params === 'object' ? event.params : {}
});

export class CausalInterventionScheduler {
  constructor(scheduleDoc = {}, { throwOnInvalid = false } = {}) {
    this.raw = scheduleDoc && typeof scheduleDoc === 'object' ? scheduleDoc : {};
    this.overlapPolicy = String(this.raw.overlap_policy || 'forbidden');
    this.priorityOrder = Array.isArray(this.raw.priority_order) && this.raw.priority_order.length > 0
      ? this.raw.priority_order.map((x) => String(x))
      : [...DEFAULT_PRIORITY];
    this.events = Array.isArray(this.raw.events) ? this.raw.events.map((event) => this.normalizeEvent(event)) : [];
    this.preregisterHash = sha256Hex(stableStringify(this.raw));
    this.scheduleHash = sha256Hex(stableStringify({
      overlap_policy: this.overlapPolicy,
      priority_order: this.priorityOrder,
      events: this.events.map((event) => ({
        tag: event.tag,
        eventId: event.eventId,
        start_tick: event.start_tick,
        duration_ticks: event.duration_ticks,
        params: event.params,
        prediction: event.prediction
      }))
    }));
    this.validation = this.validate();
    if (throwOnInvalid && !this.validation.valid) {
      throw new Error(`SCHEDULE_INVALID: ${this.validation.reasons.join(',')}`);
    }
  }

  normalizeEvent(event) {
    const normalized = {
      tag: String(event?.tag || ''),
      start_tick: toFiniteInt(event?.start_tick, -1),
      duration_ticks: toFiniteInt(event?.duration_ticks, -1),
      params: event?.params && typeof event.params === 'object' ? event.params : {},
      prediction: event?.prediction && typeof event.prediction === 'object'
        ? event.prediction
        : { targets: [], negative_controls: [] }
    };
    return {
      ...normalized,
      eventId: sha256Hex(stableStringify(canonicalEventIdInput(normalized)))
    };
  }

  validate() {
    const reasons = [];
    if (this.overlapPolicy !== 'forbidden') reasons.push('INVALID_OVERLAP_POLICY');
    const seen = new Set();
    this.events.forEach((event) => {
      if (!event.tag || event.start_tick < 0 || event.duration_ticks <= 0) reasons.push(`EVENT_INVALID:${event.tag || 'unknown'}`);
      if (seen.has(event.tag)) reasons.push(`DUPLICATE_TAG:${event.tag}`);
      seen.add(event.tag);
      const targets = Array.isArray(event?.prediction?.targets) ? event.prediction.targets : [];
      const controls = Array.isArray(event?.prediction?.negative_controls) ? event.prediction.negative_controls : [];
      if (targets.length === 0) reasons.push(`MISSING_PREDICTION_TARGETS:${event.tag}`);
      if (controls.length === 0) reasons.push(`MISSING_NEGATIVE_CONTROLS:${event.tag}`);
    });
    const byStart = [...this.events].sort((a, b) => a.start_tick - b.start_tick);
    for (let i = 1; i < byStart.length; i++) {
      const prev = byStart[i - 1];
      const curr = byStart[i];
      const prevEnd = prev.start_tick + prev.duration_ticks;
      if (curr.start_tick < prevEnd) reasons.push(`OVERLAP_FORBIDDEN:${prev.tag}->${curr.tag}`);
    }
    return { valid: reasons.length === 0, reasons };
  }

  getMetadata() {
    return {
      valid: this.validation.valid,
      reasons: [...this.validation.reasons],
      overlap_policy: this.overlapPolicy,
      priority_order: [...this.priorityOrder],
      scheduleHash: this.scheduleHash,
      preregisterHash: this.preregisterHash
    };
  }

  getInterventionState(tick) {
    const tickInt = toFiniteInt(tick, -1);
    if (!this.validation.valid || tickInt < 0) {
      return { active: false, tag: null, params: null, eventId: null, scheduleHash: this.scheduleHash, preregisterHash: this.preregisterHash, scheduleValid: this.validation.valid };
    }
    const active = this.events.filter((event) => tickInt >= event.start_tick && tickInt < (event.start_tick + event.duration_ticks));
    if (active.length === 0) {
      return { active: false, tag: null, params: null, eventId: null, scheduleHash: this.scheduleHash, preregisterHash: this.preregisterHash, scheduleValid: true };
    }
    const rank = (tag) => {
      const idx = this.priorityOrder.indexOf(tag);
      return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
    };
    active.sort((a, b) => rank(a.tag) - rank(b.tag));
    const current = active[0];
    return {
      active: true,
      tag: current.tag,
      eventId: current.eventId,
      params: { ...current.params },
      scheduleHash: this.scheduleHash,
      preregisterHash: this.preregisterHash,
      scheduleValid: true
    };
  }
}


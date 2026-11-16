import { bindExecutionEnvironment, executionEnvironmentFor } from '../runtime/ExecutionEnvironment.js';
const toFinite = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

export class EntropyHealthMonitor {
  constructor(options = {}, executionEnvironment) {
    bindExecutionEnvironment(this, executionEnvironment);
    this.state = {
      status: 'disabled',
      consecutiveFailures: 0,
      consecutiveValid: 0,
      droppedSamples: 0,
      lastError: '',
      lastUpdateMs: 0,
      refillInFlight: false,
      bufferOccupancyChunks: 0,
      capacityChunks: 0,
      lowWatermarkChunks: 0,
      refillTargetChunks: 0,
      bufferExhaustions: 0,
      fallbackCount: 0,
      lastRefillStartedMs: 0,
      lastRefillCompletedMs: 0,
      lastRefillDurationMs: 0,
      lastPendingJobId: '',
      lastConsumedChunkId: '',
      configWarnings: [],
      lastEvent: 'init'
    };
    this.setEnabled(Boolean(options.enabled), executionEnvironmentFor(this).wallNow());
  }

  setEnabled(enabled, nowMs = executionEnvironmentFor(this).wallNow()) {
    this.state.status = enabled ? 'degraded' : 'disabled';
    this.state.lastUpdateMs = nowMs;
    this.state.lastEvent = enabled ? 'enabled' : 'disabled';
    if (!enabled) {
      this.state.refillInFlight = false;
      this.state.lastPendingJobId = '';
    }
  }

  applyBufferSnapshot(snapshot = {}) {
    this.state.bufferOccupancyChunks = Math.max(0, Math.floor(toFinite(snapshot.occupancyChunks, 0)));
    this.state.capacityChunks = Math.max(0, Math.floor(toFinite(snapshot.capacityChunks, 0)));
    this.state.lowWatermarkChunks = Math.max(0, Math.floor(toFinite(snapshot.lowWatermarkChunks, 0)));
    this.state.refillTargetChunks = Math.max(0, Math.floor(toFinite(snapshot.refillTargetChunks, 0)));
    this.state.lastConsumedChunkId = String(snapshot.lastConsumedChunkId || this.state.lastConsumedChunkId || '');
  }

  markConfigWarnings(warnings = [], nowMs = executionEnvironmentFor(this).wallNow()) {
    this.state.configWarnings = Array.isArray(warnings) ? warnings.slice(0, 8) : [];
    this.state.lastUpdateMs = nowMs;
    if (this.state.configWarnings.length > 0) {
      this.state.lastEvent = 'config_warning';
    }
  }

  markRefillStart(requestedChunks = 0, snapshot = {}, nowMs = executionEnvironmentFor(this).wallNow()) {
    this.applyBufferSnapshot(snapshot);
    this.state.refillInFlight = requestedChunks > 0;
    this.state.lastRefillStartedMs = nowMs;
    this.state.lastUpdateMs = nowMs;
    this.state.lastEvent = requestedChunks > 0 ? 'refill_started' : 'refill_skipped';
  }

  markRefillEnd(payload = {}, nowMs = executionEnvironmentFor(this).wallNow()) {
    this.applyBufferSnapshot(payload.bufferSnapshot || {});
    this.state.refillInFlight = false;
    this.state.lastRefillCompletedMs = nowMs;
    this.state.lastRefillDurationMs = Math.max(0, nowMs - Math.max(0, toFinite(this.state.lastRefillStartedMs, nowMs)));
    this.state.lastPendingJobId = String(payload.pendingJobId || '');
    this.state.lastUpdateMs = nowMs;
    this.state.lastEvent = payload.pendingJobId ? 'refill_pending' : 'refill_completed';
    this._syncStatus();
  }

  markSuccess(snapshot = {}, nowMs = executionEnvironmentFor(this).wallNow(), details = {}) {
    this.applyBufferSnapshot(snapshot);
    this.state.consecutiveValid += 1;
    this.state.consecutiveFailures = 0;
    this.state.lastError = '';
    this.state.lastPendingJobId = '';
    this.state.lastUpdateMs = nowMs;
    this.state.lastEvent = String(details.lastEvent || 'sample_ingested');
    this._syncStatus();
  }

  markFailure(reason = 'bridge_unavailable', snapshot = {}, nowMs = executionEnvironmentFor(this).wallNow()) {
    this.applyBufferSnapshot(snapshot);
    this.state.consecutiveFailures += 1;
    this.state.consecutiveValid = 0;
    this.state.lastError = String(reason || 'bridge_unavailable');
    this.state.lastUpdateMs = nowMs;
    this.state.lastEvent = 'provider_error';
    this._syncStatus();
  }

  markPending(reason = 'upstream_pending', pendingJobId = '', snapshot = {}, nowMs = executionEnvironmentFor(this).wallNow()) {
    this.applyBufferSnapshot(snapshot);
    this.state.lastError = String(reason || 'upstream_pending');
    this.state.lastPendingJobId = String(pendingJobId || '');
    this.state.lastUpdateMs = nowMs;
    this.state.lastEvent = 'provider_pending';
    this._syncStatus({ allowHealthy: false });
  }

  markDropped(reason = 'sample_rejected', snapshot = {}, nowMs = executionEnvironmentFor(this).wallNow()) {
    this.applyBufferSnapshot(snapshot);
    this.state.droppedSamples += 1;
    this.state.lastError = String(reason || 'sample_rejected');
    this.state.lastUpdateMs = nowMs;
    this.state.lastEvent = 'sample_dropped';
    this._syncStatus({ allowHealthy: false });
  }

  markConsume(snapshot = {}, nowMs = executionEnvironmentFor(this).wallNow(), details = {}) {
    this.applyBufferSnapshot(snapshot);
    this.state.lastConsumedChunkId = String(details.chunkId || this.state.lastConsumedChunkId || '');
    this.state.lastUpdateMs = nowMs;
    this.state.lastEvent = 'chunk_consumed';
    this._syncStatus();
  }

  markFallback(reason = 'buffer_empty', snapshot = {}, nowMs = executionEnvironmentFor(this).wallNow(), stale = false) {
    this.applyBufferSnapshot(snapshot);
    this.state.fallbackCount += 1;
    this.state.lastError = String(reason || 'buffer_empty');
    this.state.lastUpdateMs = nowMs;
    this.state.lastEvent = stale ? 'fallback_stale' : 'fallback_buffer_empty';
    if (!stale) {
      this.state.bufferExhaustions += 1;
    }
    this._syncStatus({ stale });
  }

  snapshot() {
    return {
      ...this.state,
      configWarnings: [...this.state.configWarnings]
    };
  }

  _syncStatus(options = {}) {
    const stale = Boolean(options.stale);
    const allowHealthy = options.allowHealthy !== false;
    if (this.state.status === 'disabled') return;
    if (stale) {
      this.state.status = 'stale';
      return;
    }
    if (this.state.bufferOccupancyChunks > 0 && this.state.consecutiveFailures === 0 && allowHealthy) {
      this.state.status = 'healthy';
      return;
    }
    this.state.status = 'degraded';
  }
}

export default EntropyHealthMonitor;

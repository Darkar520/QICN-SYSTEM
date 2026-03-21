const toFinite = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const asPositiveInt = (value, fallback, minimum = 1) => Math.max(minimum, Math.floor(toFinite(value, fallback)));

const computeFingerprint = (text) => {
  const input = String(text || '');
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

export class EntropyBufferManager {
  constructor(config = {}) {
    this.queue = [];
    this.auditLog = [];
    this.chunkCounter = 0;
    this.stats = {
      totalIngested: 0,
      totalConsumed: 0,
      totalPrunedStale: 0,
      totalDroppedCapacity: 0,
      lastConsumedChunkId: '',
      lastPrunedAtMs: 0
    };
    this.config = {
      capacityChunks: 8,
      lowWatermarkChunks: 2,
      refillTargetChunks: 6,
      auditTrailLimit: 128
    };
    this.configWarnings = [];
    this.configure(config);
  }

  buildConfig(nextConfig = {}, baseConfig = this.config) {
    const warnings = [];
    const capacityChunks = asPositiveInt(nextConfig.capacityChunks, baseConfig.capacityChunks, 1);
    let lowWatermarkChunks = Math.max(0, Math.floor(toFinite(nextConfig.lowWatermarkChunks, baseConfig.lowWatermarkChunks)));
    let refillTargetChunks = asPositiveInt(nextConfig.refillTargetChunks, baseConfig.refillTargetChunks, 1);
    const auditTrailLimit = asPositiveInt(nextConfig.auditTrailLimit, baseConfig.auditTrailLimit, 16);

    if (!Number.isFinite(Number(nextConfig.capacityChunks)) && nextConfig.capacityChunks !== undefined) {
      warnings.push('capacity_chunks_sanitized');
    }
    if (!Number.isFinite(Number(nextConfig.lowWatermarkChunks)) && nextConfig.lowWatermarkChunks !== undefined) {
      warnings.push('low_watermark_sanitized');
    }
    if (!Number.isFinite(Number(nextConfig.refillTargetChunks)) && nextConfig.refillTargetChunks !== undefined) {
      warnings.push('refill_target_sanitized');
    }

    if (lowWatermarkChunks >= capacityChunks) {
      lowWatermarkChunks = Math.max(0, capacityChunks - 1);
      warnings.push('low_watermark_clamped_to_capacity');
    }
    if (refillTargetChunks > capacityChunks) {
      refillTargetChunks = capacityChunks;
      warnings.push('refill_target_clamped_to_capacity');
    }
    if (refillTargetChunks <= lowWatermarkChunks) {
      refillTargetChunks = Math.min(capacityChunks, lowWatermarkChunks + 1);
      warnings.push('refill_target_raised_above_low_watermark');
    }

    return {
      config: {
        capacityChunks,
        lowWatermarkChunks,
        refillTargetChunks,
        auditTrailLimit
      },
      warnings
    };
  }

  configure(nextConfig = {}) {
    const result = this.buildConfig(nextConfig, this.config);
    this.config = result.config;
    this.configWarnings = result.warnings;
    if (this.auditLog.length > this.config.auditTrailLimit) {
      this.auditLog = this.auditLog.slice(-this.config.auditTrailLimit);
    }
    return result;
  }

  _appendAudit(entry) {
    this.auditLog.push({
      ts: entry.ts ?? Date.now(),
      ...entry
    });
    if (this.auditLog.length > this.config.auditTrailLimit) {
      this.auditLog = this.auditLog.slice(-this.config.auditTrailLimit);
    }
  }

  clear(reason = 'buffer_cleared', nowMs = Date.now()) {
    if (this.queue.length > 0) {
      this._appendAudit({
        type: 'buffer_cleared',
        reason,
        droppedChunks: this.queue.length,
        ts: nowMs
      });
    }
    this.queue = [];
  }

  _pruneStale(nowMs = Date.now()) {
    let removed = 0;
    while (this.queue.length > 0) {
      const oldest = this.queue[0];
      if (!Number.isFinite(oldest.expiresAtMs) || nowMs <= oldest.expiresAtMs) break;
      this.queue.shift();
      oldest.status = 'stale_dropped';
      oldest.staleAtMs = nowMs;
      removed += 1;
      this.stats.totalPrunedStale += 1;
      this.stats.lastPrunedAtMs = nowMs;
      this._appendAudit({
        type: 'chunk_stale_dropped',
        chunkId: oldest.chunkId,
        provider: oldest.provider,
        requestId: oldest.requestId,
        ageMs: Math.max(0, nowMs - oldest.insertTsMs),
        ts: nowMs
      });
    }
    return removed;
  }

  getRefillPlan(nowMs = Date.now()) {
    const stalePrunedCount = this._pruneStale(nowMs);
    const occupancyChunks = this.queue.length;
    const requestedChunks = occupancyChunks <= this.config.lowWatermarkChunks
      ? Math.max(0, this.config.refillTargetChunks - occupancyChunks)
      : 0;
    return {
      needed: requestedChunks > 0,
      requestedChunks,
      stalePrunedCount,
      bufferSnapshot: this.snapshot(nowMs)
    };
  }

  ingestSample(sample, metadata = {}, nowMs = Date.now()) {
    this._pruneStale(nowMs);
    while (this.queue.length >= this.config.capacityChunks) {
      const dropped = this.queue.shift();
      this.stats.totalDroppedCapacity += 1;
      this._appendAudit({
        type: 'chunk_capacity_dropped',
        chunkId: dropped.chunkId,
        provider: dropped.provider,
        requestId: dropped.requestId,
        ts: nowMs
      });
    }

    const entropyBits = String(sample?.entropyBits || '');
    const byteCount = Math.max(0, Math.ceil(entropyBits.length / 8));
    const chunkId = `entropy_chunk_${nowMs}_${String(++this.chunkCounter).padStart(6, '0')}`;
    const fingerprint = computeFingerprint([
      sample?.source || '',
      sample?.jobId || '',
      entropyBits,
      sample?.entropyFloat01 ?? ''
    ].join('|'));
    const chunk = {
      chunkId,
      provider: String(metadata.provider || sample?.meta?.provider || sample?.source || 'unknown'),
      requestId: String(metadata.requestId || sample?.jobId || chunkId),
      requestUrl: String(metadata.requestUrl || ''),
      responseMode: String(metadata.responseMode || ''),
      fetchStartMs: Number.isFinite(Number(metadata.fetchStartMs)) ? Number(metadata.fetchStartMs) : nowMs,
      fetchEndMs: Number.isFinite(Number(metadata.fetchEndMs)) ? Number(metadata.fetchEndMs) : nowMs,
      latencyMs: Number.isFinite(Number(metadata.latencyMs))
        ? Number(metadata.latencyMs)
        : Math.max(0, nowMs - (Number(metadata.fetchStartMs) || nowMs)),
      insertTsMs: nowMs,
      receivedAtMs: Number.isFinite(Number(sample?.receivedAtMs)) ? Number(sample.receivedAtMs) : nowMs,
      expiresAtMs: Math.max(
        nowMs + 1000,
        (Number.isFinite(Number(sample?.receivedAtMs)) ? Number(sample.receivedAtMs) : nowMs)
          + Math.max(1000, Number(sample?.ttlMs) || 60000)
      ),
      byteCount,
      fingerprint,
      fallbackUsed: Boolean(metadata.fallbackUsed),
      status: 'buffered',
      sample
    };
    this.queue.push(chunk);
    this.stats.totalIngested += 1;
    this._appendAudit({
      type: 'chunk_ingested',
      chunkId,
      provider: chunk.provider,
      requestId: chunk.requestId,
      byteCount,
      fingerprint,
      fallbackUsed: chunk.fallbackUsed,
      responseMode: chunk.responseMode,
      occupancyChunks: this.queue.length,
      ts: nowMs
    });
    return {
      accepted: true,
      chunkId,
      chunk,
      bufferSnapshot: this.snapshot(nowMs)
    };
  }

  consumeChunk(nowMs = Date.now()) {
    const stalePrunedCount = this._pruneStale(nowMs);
    if (this.queue.length === 0) {
      return {
        ok: false,
        reason: stalePrunedCount > 0 ? 'buffer_empty_after_prune' : 'buffer_empty',
        stalePrunedCount,
        bufferSnapshot: this.snapshot(nowMs)
      };
    }
    const chunk = this.queue.shift();
    chunk.status = 'consumed';
    chunk.consumedAtMs = nowMs;
    this.stats.totalConsumed += 1;
    this.stats.lastConsumedChunkId = chunk.chunkId;
    this._appendAudit({
      type: 'chunk_consumed',
      chunkId: chunk.chunkId,
      provider: chunk.provider,
      requestId: chunk.requestId,
      ageMs: Math.max(0, nowMs - chunk.receivedAtMs),
      occupancyChunks: this.queue.length,
      ts: nowMs
    });
    return {
      ok: true,
      chunk,
      ageMs: Math.max(0, nowMs - chunk.receivedAtMs),
      stalePrunedCount,
      bufferSnapshot: this.snapshot(nowMs)
    };
  }

  snapshot(nowMs = Date.now()) {
    const occupancyChunks = this.queue.length;
    const oldestChunk = occupancyChunks > 0 ? this.queue[0] : null;
    const newestChunk = occupancyChunks > 0 ? this.queue[this.queue.length - 1] : null;
    return {
      capacityChunks: this.config.capacityChunks,
      lowWatermarkChunks: this.config.lowWatermarkChunks,
      refillTargetChunks: this.config.refillTargetChunks,
      occupancyChunks,
      oldestAgeMs: oldestChunk ? Math.max(0, nowMs - oldestChunk.receivedAtMs) : null,
      newestAgeMs: newestChunk ? Math.max(0, nowMs - newestChunk.receivedAtMs) : null,
      totalIngested: this.stats.totalIngested,
      totalConsumed: this.stats.totalConsumed,
      totalPrunedStale: this.stats.totalPrunedStale,
      totalDroppedCapacity: this.stats.totalDroppedCapacity,
      lastConsumedChunkId: this.stats.lastConsumedChunkId || ''
    };
  }

  getAuditTrail(limit = 20) {
    const safeLimit = Math.max(1, Math.floor(toFinite(limit, 20)));
    return this.auditLog.slice(-safeLimit);
  }
}

export default EntropyBufferManager;

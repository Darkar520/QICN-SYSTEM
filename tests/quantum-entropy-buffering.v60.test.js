import assert from 'node:assert/strict';
import { QuantumEntropyBridge } from '../src/simulation/QuantumEntropyBridge.js';

const makeSample = (jobId, entropyFloat01, ttlMs = 60000) => ({
  source: 'custom_entropy_api',
  jobId,
  timestampMs: Date.now(),
  receivedAtMs: Date.now(),
  ttlMs,
  entropyBits: '10101010101010101010101010101010',
  entropyFloat01,
  quality: { valid: true, bitBalance: 0.5, shots: 2048 }
});

try {
  // CASE 1: nominal fill + local consumption without network on each select
  {
    let fetchCalls = 0;
    const bridge = new QuantumEntropyBridge({
      enabled: true,
      provider: 'custom',
      endpoint: 'http://localhost/mock',
      defaultTtlMs: 60000,
      requiredQualityMin: 0,
      bufferCapacityChunks: 4,
      lowWatermarkChunks: 1,
      refillTargetChunks: 3,
      requestTimeoutMs: 1200,
      retryCount: 0,
      allowProviderFallback: true,
      logLevel: 'silent'
    });
    const fetchMock = async () => {
      fetchCalls += 1;
      return {
        ok: true,
        json: async () => ({
          mode: 'upstream_quantum',
          sample: makeSample(`job-nominal-${fetchCalls}`, 0.1 * fetchCalls)
        })
      };
    };

    const refill = await bridge.refillFromProvider({
      fetchImpl: fetchMock,
      endpoint: 'http://localhost/mock'
    });
    assert.equal(refill.ok, true, 'CASE 1 FAIL: initial refill should succeed.');
    assert.equal(refill.acceptedChunks, 3, 'CASE 1 FAIL: initial refill must ingest 3 chunks.');
    assert.equal(fetchCalls, 3, 'CASE 1 FAIL: initial refill must fetch until refill target.');

    const first = bridge.selectEntropy(Date.now(), 0.5);
    const second = bridge.selectEntropy(Date.now(), 0.5);
    assert.equal(first.mode, 'quantum_primary', 'CASE 1 FAIL: first select should use buffered quantum chunk.');
    assert.equal(second.mode, 'quantum_primary', 'CASE 1 FAIL: second select should use buffered quantum chunk.');
    assert.equal(fetchCalls, 3, 'CASE 1 FAIL: selectEntropy should not hit network directly.');
    const snapshot = bridge.getBufferSnapshot(Date.now());
    assert.equal(snapshot.occupancyChunks, 1, 'CASE 1 FAIL: buffer occupancy must decrease after local consumption.');
  }

  // CASE 2: refill triggers again below low watermark
  {
    let fetchCalls = 0;
    const bridge = new QuantumEntropyBridge({
      enabled: true,
      provider: 'custom',
      endpoint: 'http://localhost/mock',
      defaultTtlMs: 60000,
      requiredQualityMin: 0,
      bufferCapacityChunks: 5,
      lowWatermarkChunks: 1,
      refillTargetChunks: 4,
      retryCount: 0,
      logLevel: 'silent'
    });
    const fetchMock = async () => {
      fetchCalls += 1;
      return {
        ok: true,
        json: async () => ({
          mode: 'upstream_quantum',
          sample: makeSample(`job-refill-${fetchCalls}`, Math.min(0.95, 0.11 * fetchCalls))
        })
      };
    };
    await bridge.refillFromProvider({ fetchImpl: fetchMock, endpoint: 'http://localhost/mock' });
    bridge.selectEntropy(Date.now(), 0.5);
    bridge.selectEntropy(Date.now(), 0.5);
    bridge.selectEntropy(Date.now(), 0.5);
    const beforeRefill = bridge.getBufferSnapshot(Date.now());
    assert.equal(beforeRefill.occupancyChunks, 1, 'CASE 2 FAIL: expected buffer at low watermark before refill.');
    const refill = await bridge.refillFromProvider({ fetchImpl: fetchMock, endpoint: 'http://localhost/mock' });
    assert.equal(refill.acceptedChunks, 3, 'CASE 2 FAIL: refill should top up back to target.');
    const afterRefill = bridge.getBufferSnapshot(Date.now());
    assert.equal(afterRefill.occupancyChunks, 4, 'CASE 2 FAIL: refill should restore target occupancy.');
  }

  // CASE 3: provider error must not crash and must surface diagnostics
  {
    const bridge = new QuantumEntropyBridge({
      enabled: true,
      provider: 'custom',
      endpoint: 'http://localhost/mock',
      defaultTtlMs: 60000,
      requiredQualityMin: 0,
      bufferCapacityChunks: 2,
      lowWatermarkChunks: 1,
      refillTargetChunks: 2,
      requestTimeoutMs: 300,
      retryCount: 0,
      logLevel: 'silent'
    });
    const failingFetch = async () => {
      throw new Error('network_down');
    };
    const refill = await bridge.refillFromProvider({ fetchImpl: failingFetch, endpoint: 'http://localhost/mock' });
    assert.equal(refill.ok, false, 'CASE 3 FAIL: refill should report failure.');
    const diagnostics = bridge.getConnectionDiagnostics(Date.now());
    assert.equal(diagnostics.connectionState, 'error', 'CASE 3 FAIL: diagnostics should expose provider error.');
    assert.equal(diagnostics.lastReason, 'network_down', 'CASE 3 FAIL: diagnostics should keep provider error reason.');
  }

  // CASE 3B: invalid provider payload must be rejected legibly
  {
    const bridge = new QuantumEntropyBridge({
      enabled: true,
      provider: 'custom',
      endpoint: 'http://localhost/mock',
      defaultTtlMs: 60000,
      requiredQualityMin: 0,
      bufferCapacityChunks: 2,
      lowWatermarkChunks: 1,
      refillTargetChunks: 2,
      retryCount: 0,
      logLevel: 'silent'
    });
    const invalidFetch = async () => ({
      ok: true,
      json: async () => ({ mode: 'upstream_quantum', sample: null })
    });
    const refill = await bridge.refillFromProvider({ fetchImpl: invalidFetch, endpoint: 'http://localhost/mock' });
    assert.equal(refill.ok, false, 'CASE 3B FAIL: invalid payload should fail refill.');
    assert.equal(refill.lastReason, 'missing_entropy_value', 'CASE 3B FAIL: invalid payload should expose normalization failure.');
  }

  // CASE 4: exhausted buffer should degrade explicitly instead of failing opaquely
  {
    const bridge = new QuantumEntropyBridge({
      enabled: true,
      provider: 'custom',
      endpoint: 'http://localhost/mock',
      defaultTtlMs: 60000,
      requiredQualityMin: 0,
      bufferCapacityChunks: 1,
      lowWatermarkChunks: 0,
      refillTargetChunks: 1,
      retryCount: 0,
      logLevel: 'silent'
    });
    bridge.ingestSample(makeSample('job-exhaustion', 0.77), Date.now(), { provider: 'custom', responseMode: 'upstream_quantum' });
    const quantumDecision = bridge.selectEntropy(Date.now(), 0.41);
    const fallbackDecision = bridge.selectEntropy(Date.now(), 0.41);
    assert.equal(quantumDecision.mode, 'quantum_primary', 'CASE 4 FAIL: first decision should consume buffered chunk.');
    assert.equal(fallbackDecision.mode, 'deterministic_fallback', 'CASE 4 FAIL: second decision should fallback explicitly after exhaustion.');
    assert.equal(Number(fallbackDecision.entropyValue.toFixed(2)), 0.41, 'CASE 4 FAIL: fallback must use deterministic value.');
  }

  // CASE 5: observability must expose structured audit and buffer state
  {
    const bridge = new QuantumEntropyBridge({
      enabled: true,
      provider: 'custom',
      endpoint: 'http://localhost/mock',
      requiredQualityMin: 0,
      bufferCapacityChunks: 3,
      lowWatermarkChunks: 1,
      refillTargetChunks: 2,
      retryCount: 0,
      logLevel: 'silent'
    });
    await bridge.refillFromProvider({
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({
          mode: 'upstream_quantum',
          sample: makeSample('job-observability', 0.62)
        })
      }),
      endpoint: 'http://localhost/mock',
      requestedChunks: 1,
      force: true
    });
    bridge.selectEntropy(Date.now(), 0.5);
    const telemetry = bridge.getTelemetry(Date.now());
    const auditTrail = bridge.getAuditTrail(10);
    assert.equal(typeof telemetry.bufferState?.occupancyChunks, 'number', 'CASE 5 FAIL: telemetry must expose buffer state.');
    assert.ok(auditTrail.chunkAudit.length >= 1, 'CASE 5 FAIL: chunk audit trail should not be empty.');
    assert.ok(auditTrail.events.some((entry) => entry.type === 'refill_completed'), 'CASE 5 FAIL: event log should record refill completion.');
  }

  // CASE 6: invalid buffer config must sanitize and expose warnings
  {
    const bridge = new QuantumEntropyBridge({
      enabled: true,
      provider: 'custom',
      bufferCapacityChunks: 1,
      lowWatermarkChunks: 5,
      refillTargetChunks: 0,
      logLevel: 'invalid'
    });
    const diagnostics = bridge.getConnectionDiagnostics(Date.now());
    assert.ok(diagnostics.configWarnings.length >= 1, 'CASE 6 FAIL: invalid config should emit warnings.');
    assert.equal(diagnostics.bufferState.capacityChunks, 1, 'CASE 6 FAIL: capacity should remain sanitized to 1.');
    assert.ok(
      diagnostics.bufferState.refillTargetChunks > diagnostics.bufferState.lowWatermarkChunks,
      'CASE 6 FAIL: refill target must remain above low watermark after sanitization.'
    );
  }

  console.log('ok quantum-entropy-buffering.v60');
} catch (error) {
  console.error('fail quantum-entropy-buffering.v60:', error.message);
  process.exit(1);
}

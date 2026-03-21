import assert from 'node:assert/strict';
import { QuantumEntropyBridge } from '../src/simulation/QuantumEntropyBridge.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  // Objective:
  // prove the critical integration path end-to-end:
  // local buffered consumption -> low watermark -> reactive refill without waiting only for poll ->
  // provider failure -> deterministic fallback -> diagnostics/UI-facing state updated coherently.
  let fetchCalls = 0;
  let providerMode = 'success';
  const fetchMock = async () => {
    fetchCalls += 1;
    if (providerMode === 'fail') {
      throw new Error('provider_down');
    }
    return {
      ok: true,
      json: async () => ({
        mode: 'upstream_quantum',
        sample: makeSample(`job-runtime-${fetchCalls}`, Math.min(0.95, 0.13 * fetchCalls))
      })
    };
  };

  const bridge = new QuantumEntropyBridge({
    enabled: true,
    provider: 'custom',
    endpoint: 'http://localhost/mock',
    defaultTtlMs: 60000,
    requiredQualityMin: 0,
    pollMs: 200,
    bufferCapacityChunks: 3,
    lowWatermarkChunks: 1,
    refillTargetChunks: 3,
    requestTimeoutMs: 800,
    retryCount: 0,
    logLevel: 'silent'
  });

  bridge.setRuntimeRefillContext({
    fetchImpl: fetchMock,
    endpoint: 'http://localhost/mock'
  });

  const initialRefill = await bridge.refillFromProvider({
    fetchImpl: fetchMock,
    endpoint: 'http://localhost/mock',
    force: true,
    requestedChunks: 3
  });
  assert.equal(initialRefill.acceptedChunks, 3, 'CASE 1 FAIL: initial refill should seed the buffer.');
  assert.equal(fetchCalls, 3, 'CASE 1 FAIL: initial fill should perform three provider calls.');

  bridge.selectEntropy(Date.now(), 0.5);
  bridge.selectEntropy(Date.now(), 0.5);
  await wait(260);

  const diagnosticsAfterReactiveRefill = bridge.getConnectionDiagnostics(Date.now());
  assert.equal(fetchCalls, 5, 'CASE 2 FAIL: low watermark should trigger exactly one reactive refill cycle.');
  assert.ok(
    diagnosticsAfterReactiveRefill.bufferState.occupancyChunks >= 2,
    'CASE 2 FAIL: reactive refill should restore buffer above the low watermark.'
  );
  assert.equal(diagnosticsAfterReactiveRefill.connectionState, 'ok', 'CASE 2 FAIL: effective runtime state should remain ok after successful reactive refill.');
  assert.ok(
    diagnosticsAfterReactiveRefill.eventLog.some((entry) => entry.type === 'reactive_refill_scheduled'),
    'CASE 2 FAIL: reactive refill scheduling should be observable.'
  );

  providerMode = 'fail';
  bridge.selectEntropy(Date.now(), 0.5);
  bridge.selectEntropy(Date.now(), 0.5);
  await wait(260);
  bridge.selectEntropy(Date.now(), 0.37);
  await wait(260);
  const fallbackDecision = bridge.selectEntropy(Date.now(), 0.37);
  const degradedDiagnostics = bridge.getConnectionDiagnostics(Date.now());

  const uiLikeStatus = {
    connectionState: degradedDiagnostics.connectionState,
    lastMode: degradedDiagnostics.effectiveMode,
    lastReason: degradedDiagnostics.effectiveReason
  };

  assert.equal(fallbackDecision.mode, 'deterministic_fallback', 'CASE 3 FAIL: exhausted buffer plus provider failure should produce deterministic fallback.');
  assert.equal(uiLikeStatus.connectionState, 'degraded', 'CASE 3 FAIL: UI-facing connection state should reflect degraded runtime delivery.');
  assert.equal(uiLikeStatus.lastMode, 'deterministic_fallback', 'CASE 3 FAIL: effective mode should expose deterministic fallback.');
  assert.equal(degradedDiagnostics.lastConnectionState, 'error', 'CASE 3 FAIL: diagnostics should still retain the last connection-test state separately.');
  assert.equal(degradedDiagnostics.lastConnectionReason, 'provider_down', 'CASE 3 FAIL: diagnostics should expose provider failure reason.');
  assert.ok(
    degradedDiagnostics.eventLog.some((entry) => entry.type === 'provider_error'),
    'CASE 3 FAIL: provider error should remain visible in the event log.'
  );

  console.log('ok quantum-entropy-runtime-integration.v61');
} catch (error) {
  console.error('fail quantum-entropy-runtime-integration.v61:', error.message);
  process.exit(1);
}

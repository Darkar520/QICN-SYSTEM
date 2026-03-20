import assert from 'node:assert/strict';
import { QuantumEntropyBridge } from '../src/simulation/QuantumEntropyBridge.js';

try {
  // CASE 1: telemetry shape after successful sample ingestion
  {
    const bridge = new QuantumEntropyBridge({
      enabled: true,
      defaultTtlMs: 60000,
      requiredQualityMin: 0
    });
    const now = Date.now();
    bridge.ingestSample({
      source: 'ibm_quantum',
      jobId: 'job-telemetry-1',
      timestampMs: now - 50,
      receivedAtMs: now - 50,
      ttlMs: 60000,
      entropyFloat01: 0.63,
      quality: { shots: 2048, bitBalance: 0.49, valid: true }
    }, now - 50);
    bridge.selectEntropy(now, 0.4);
    const telemetry = bridge.getTelemetry(now);

    assert.equal(typeof telemetry.enabled, 'boolean', 'CASE 1 FAIL: enabled missing.');
    assert.equal(typeof telemetry.mode, 'string', 'CASE 1 FAIL: mode missing.');
    assert.equal(typeof telemetry.reason, 'string', 'CASE 1 FAIL: reason missing.');
    assert.equal(typeof telemetry.entropySource, 'string', 'CASE 1 FAIL: entropySource missing.');
    assert.equal(typeof telemetry.channelHealth, 'object', 'CASE 1 FAIL: channelHealth missing.');
    assert.equal(typeof telemetry.channelHealth.status, 'string', 'CASE 1 FAIL: channelHealth.status missing.');
    assert.equal(typeof telemetry.sampleValid, 'boolean', 'CASE 1 FAIL: sampleValid missing.');
    assert.equal(telemetry.mode, 'quantum_primary', 'CASE 1 FAIL: expected quantum_primary telemetry mode.');
  }

  // CASE 2: telemetry should expose degraded channel after failure
  {
    const bridge = new QuantumEntropyBridge({
      enabled: true,
      defaultTtlMs: 60000,
      requiredQualityMin: 0.8
    });
    bridge.ingestSample({
      source: 'ibm_quantum',
      jobId: 'job-telemetry-2',
      timestampMs: Date.now(),
      receivedAtMs: Date.now(),
      ttlMs: 60000,
      entropyFloat01: 0.5,
      quality: { shots: 4, bitBalance: 0.99, valid: true }
    }, Date.now());
    const telemetry = bridge.getTelemetry(Date.now());
    assert.ok(
      telemetry.channelHealth.status === 'degraded' || telemetry.channelHealth.status === 'stale',
      'CASE 2 FAIL: expected degraded/stale channel health after invalid quality sample.'
    );
    assert.ok(telemetry.channelHealth.droppedSamples >= 1, 'CASE 2 FAIL: droppedSamples should increase.');
  }

  console.log('OK: quantum telemetry v4.8 test passed');
} catch (error) {
  console.error('FAIL: quantum telemetry v4.8 test failed:', error.message);
  process.exit(1);
}

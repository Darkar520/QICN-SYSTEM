import assert from 'node:assert/strict';
import { QuantumEntropyBridge } from '../src/simulation/QuantumEntropyBridge.js';

try {
  // CASE 1: valid fresh quantum sample must be primary
  {
    const bridge = new QuantumEntropyBridge({
      enabled: true,
      defaultTtlMs: 60000,
      requiredQualityMin: 0
    });
    const now = Date.now();
    const ingest = bridge.ingestSample({
      source: 'ibm_quantum',
      jobId: 'job-1',
      timestampMs: now - 200,
      receivedAtMs: now - 100,
      ttlMs: 60000,
      entropyFloat01: 0.8125,
      quality: { shots: 1024, bitBalance: 0.5, valid: true }
    }, now);
    assert.equal(ingest.accepted, true, 'CASE 1 FAIL: expected sample to be accepted.');
    const decision = bridge.selectEntropy(now, 0.25);
    assert.equal(decision.mode, 'quantum_primary', 'CASE 1 FAIL: expected quantum_primary mode.');
    assert.equal(Number(decision.entropyValue.toFixed(4)), 0.8125, 'CASE 1 FAIL: expected quantum entropy value.');
    assert.equal(decision.reason, 'fresh_sample', 'CASE 1 FAIL: expected fresh_sample reason.');
  }

  // CASE 2: stale sample must fallback deterministically
  {
    const bridge = new QuantumEntropyBridge({
      enabled: true,
      defaultTtlMs: 1000,
      requiredQualityMin: 0
    });
    const now = Date.now();
    bridge.ingestSample({
      source: 'ibm_quantum',
      jobId: 'job-2',
      timestampMs: now - 5000,
      receivedAtMs: now - 5000,
      ttlMs: 1000,
      entropyFloat01: 0.9,
      quality: { shots: 1024, bitBalance: 0.5, valid: true }
    }, now - 5000);
    const decision = bridge.selectEntropy(now, 0.37);
    assert.equal(decision.mode, 'quantum_stale', 'CASE 2 FAIL: expected quantum_stale mode.');
    assert.equal(Number(decision.entropyValue.toFixed(4)), 0.37, 'CASE 2 FAIL: stale sample should fallback to deterministic entropy.');
    assert.equal(decision.reason, 'expired_sample', 'CASE 2 FAIL: expected expired_sample reason.');
  }

  // CASE 3: invalid sample must fallback deterministically
  {
    const bridge = new QuantumEntropyBridge({
      enabled: true,
      defaultTtlMs: 60000,
      requiredQualityMin: 0
    });
    const ingest = bridge.ingestSample({
      source: 'ibm_quantum',
      jobId: 'job-3',
      entropyFloat01: null,
      quality: { shots: 0, bitBalance: 0.5, valid: false }
    }, Date.now());
    assert.equal(ingest.accepted, false, 'CASE 3 FAIL: invalid payload should not be accepted.');
    const decision = bridge.selectEntropy(Date.now(), 0.44);
    assert.equal(decision.mode, 'deterministic_fallback', 'CASE 3 FAIL: expected deterministic fallback.');
    assert.equal(Number(decision.entropyValue.toFixed(4)), 0.44, 'CASE 3 FAIL: invalid payload should keep deterministic entropy.');
    assert.ok(
      decision.reason === 'bridge_unavailable' || decision.reason === 'no_sample',
      'CASE 3 FAIL: expected bridge_unavailable/no_sample reason.'
    );
  }

  console.log('OK: quantum entropy selector v4.8 test passed');
} catch (error) {
  console.error('FAIL: quantum entropy selector v4.8 test failed:', error.message);
  process.exit(1);
}

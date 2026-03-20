import assert from 'node:assert/strict';
import { QuantumEntropyBridge } from '../src/simulation/QuantumEntropyBridge.js';

const run = async () => {
  const bridge = new QuantumEntropyBridge({
    enabled: true,
    defaultTtlMs: 2000,
    requiredQualityMin: 0.2
  });

  bridge.setConfig({
    enabled: true,
    ttlMs: 2000,
    qualityMin: 0.2,
    endpoint: 'http://localhost/mock'
  });

  {
    const now = Date.now();
    const ingest = bridge.ingestSample({
      source: 'ibm',
      jobId: 'job-fresh',
      timestampMs: now - 50,
      receivedAtMs: now - 20,
      ttlMs: 2500,
      entropyBits: '10100110100110100110100110100110',
      quality: { valid: true, bitBalance: 0.51, shots: 2048 }
    }, now);
    assert.equal(ingest.accepted, true, 'CASE 1 FAIL: expected accepted sample.');
    const decision = bridge.selectEntropy(now, 0.4);
    assert.equal(decision.mode, 'quantum_primary', 'CASE 1 FAIL: expected quantum_primary.');
  }

  {
    const staleNow = Date.now() + 4000;
    const decision = bridge.selectEntropy(staleNow, 0.33);
    assert.equal(decision.mode, 'quantum_stale', 'CASE 2 FAIL: expected quantum_stale.');
    assert.equal(Number(decision.entropyValue.toFixed(2)), 0.33, 'CASE 2 FAIL: stale sample must fallback to deterministic entropy.');
  }

  {
    const bridgeNoSample = new QuantumEntropyBridge({ enabled: true });
    const decision = bridgeNoSample.selectEntropy(Date.now(), 0.28);
    assert.equal(decision.mode, 'deterministic_fallback', 'CASE 3 FAIL: no sample must use deterministic fallback.');
  }

  {
    const bridgeDisabled = new QuantumEntropyBridge({ enabled: false });
    const decision = bridgeDisabled.selectEntropy(Date.now(), 0.72);
    assert.equal(decision.mode, 'deterministic_fallback', 'CASE 4 FAIL: disabled bridge must use deterministic fallback.');
    assert.equal(decision.reason, 'quantum_disabled', 'CASE 4 FAIL: disabled reason mismatch.');
  }

  {
    const fakeFetch = async () => ({
      ok: true,
      async json() {
        return {
          sample: {
            source: 'ibm',
            jobId: 'job-test',
            timestampMs: Date.now(),
            receivedAtMs: Date.now(),
            ttlMs: 4000,
            entropyBits: '10101010101010101010101010101010',
            quality: { valid: true, bitBalance: 0.5, shots: 4096 }
          }
        };
      }
    });
    const result = await bridge.testConnection({}, { fetchImpl: fakeFetch });
    assert.equal(result.ok, true, 'CASE 5 FAIL: expected successful testConnection.');
    assert.equal(result.connectionState, 'ok', 'CASE 5 FAIL: expected connectionState=ok.');
  }
};

run()
  .then(() => console.log('ok quantum-fallback-behavior.v49'))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

import assert from 'node:assert/strict';
import { QuantumEntropyBridge } from '../src/simulation/QuantumEntropyBridge.js';

const makeAnuFetchMock = () => async () => ({
  ok: true,
  json: async () => ({
    data: [12, 45, 99, 201, 34, 255, 17, 88, 190, 3, 76, 54, 129, 211, 7, 166]
  })
});

try {
  const fetchMock = makeAnuFetchMock();
  const bridge = new QuantumEntropyBridge({
    enabled: true,
    provider: 'anu_qrng',
    pollMs: 25,
    defaultTtlMs: 60000,
    requiredQualityMin: 0
  });

  const sample = await bridge.fetchAnuSample({ fetchImpl: fetchMock, timeoutMs: 1500 });
  assert.equal(sample.source, 'anu_qrng_vacuum_fluctuation', 'CASE 1 FAIL: expected ANU source.');
  assert.equal(typeof sample.entropyFloat01, 'number', 'CASE 1 FAIL: entropyFloat01 must be number.');
  assert.ok(sample.entropyFloat01 >= 0 && sample.entropyFloat01 <= 1, 'CASE 1 FAIL: entropyFloat01 out of range.');
  assert.equal(sample.quality?.valid, true, 'CASE 1 FAIL: quality.valid should be true.');

  const started = bridge.startPolling({ fetchImpl: fetchMock, pollMs: 20 });
  assert.equal(started.started, true, 'CASE 2 FAIL: ANU polling should start.');
  await new Promise((resolve) => setTimeout(resolve, 90));
  bridge.stopPolling();

  const decision = bridge.selectEntropy(Date.now(), 0.5);
  assert.equal(decision.mode, 'quantum_primary', 'CASE 2 FAIL: expected quantum_primary after polling.');
  assert.equal(decision.source, 'anu_qrng_vacuum_fluctuation', 'CASE 2 FAIL: source should remain ANU.');

  const diagnostics = bridge.getConnectionDiagnostics(Date.now());
  assert.ok((diagnostics.channelHealth?.consecutiveValid || 0) >= 1, 'CASE 3 FAIL: expected at least one valid sample.');

  const testResult = await bridge.testConnection(
    { enabled: true, provider: 'anu_qrng' },
    { fetchImpl: fetchMock, timeoutMs: 1500 }
  );
  assert.equal(testResult.ok, true, 'CASE 4 FAIL: ANU testConnection should succeed.');
  assert.equal(testResult.lastMode, 'quantum_primary', 'CASE 4 FAIL: ANU testConnection mode must be quantum_primary.');

  const customBridge = new QuantumEntropyBridge({ enabled: true, provider: 'custom' });
  const customStart = customBridge.startPolling({ fetchImpl: fetchMock });
  assert.equal(customStart.started, false, 'CASE 5 FAIL: non-ANU provider must not start ANU polling.');

  console.log('ok quantum-entropy-bridge-polling.v51');
} catch (error) {
  console.error('fail quantum-entropy-bridge-polling.v51:', error.message);
  process.exit(1);
}

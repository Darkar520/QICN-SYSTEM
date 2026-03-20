import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { QuantumEntropyBridge } from '../src/simulation/QuantumEntropyBridge.js';

try {
  // CASE 1: same input sequence -> same decisions
  {
    const sequence = [
      {
        sample: {
          source: 'ibm_quantum',
          jobId: 'job-a',
          timestampMs: 1000,
          receivedAtMs: 1000,
          ttlMs: 60000,
          entropyBits: '1010101010101010',
          quality: { shots: 1024, bitBalance: 0.5, valid: true }
        },
        now: 1050,
        fallback: 0.2
      },
      { sample: null, now: 1060, fallback: 0.21 },
      { sample: null, now: 66050, fallback: 0.22 }
    ];

    const run = () => {
      const bridge = new QuantumEntropyBridge({ enabled: true, defaultTtlMs: 60000, requiredQualityMin: 0 });
      return sequence.map((step) => {
        if (step.sample) {
          bridge.ingestSample(step.sample, step.now);
        }
        const decision = bridge.selectEntropy(step.now, step.fallback);
        return {
          mode: decision.mode,
          reason: decision.reason,
          entropyValue: Number(decision.entropyValue.toFixed(6))
        };
      });
    };

    const first = run();
    const second = run();
    assert.deepEqual(second, first, 'CASE 1 FAIL: selector decisions are not deterministic for same sequence.');
  }

  // CASE 2: bridge source must stay decoupled from critical observables
  {
    const sourcePath = path.join(process.cwd(), 'src/simulation/QuantumEntropyBridge.js');
    const source = fs.readFileSync(sourcePath, 'utf8');
    assert.ok(!/ccc/i.test(source), 'CASE 2 FAIL: bridge should not reference CCC.');
    assert.ok(!/beth_q/i.test(source), 'CASE 2 FAIL: bridge should not reference beth_q.');
    assert.ok(!/omega/i.test(source), 'CASE 2 FAIL: bridge should not reference omega.');
  }

  console.log('OK: quantum entropy determinism guard v4.8 test passed');
} catch (error) {
  console.error('FAIL: quantum entropy determinism guard v4.8 test failed:', error.message);
  process.exit(1);
}

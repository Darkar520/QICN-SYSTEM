import assert from 'node:assert/strict';
import { MetaSovereigntyCheck } from '../src/simulation/MetaSovereigntyCheck.js';

const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

try {
  // CASE 1: formula and state bands low/medium/high
  {
    const checker = new MetaSovereigntyCheck();
    checker.updateLatencyFeedback({
      p95Ms: 700,
      failureRate: 0,
      cooldownActive: false,
      alpha: 1,
      baselineMs: 800,
      saturationMs: 12000
    });
    assert.equal(checker.getLatencyStressState(), 'low', 'CASE 1 FAIL: expected low state.');

    checker.updateLatencyFeedback({
      p95Ms: 8000,
      failureRate: 0.2,
      cooldownActive: false,
      alpha: 1,
      baselineMs: 800,
      saturationMs: 12000
    });
    assert.equal(checker.getLatencyStressState(), 'medium', 'CASE 1 FAIL: expected medium state.');

    checker.updateLatencyFeedback({
      p95Ms: 16000,
      failureRate: 0.9,
      cooldownActive: true,
      alpha: 1,
      baselineMs: 800,
      saturationMs: 12000
    });
    assert.equal(checker.getLatencyStressState(), 'high', 'CASE 1 FAIL: expected high state.');
  }

  // CASE 2: clamps and EMA bounds remain in [0,1]
  {
    const checker = new MetaSovereigntyCheck();
    const sample = checker.updateLatencyFeedback({
      p95Ms: 999999,
      failureRate: 999,
      cooldownActive: true,
      alpha: 0.18,
      baselineMs: 800,
      saturationMs: 12000
    });
    assert.ok(sample.strainRaw >= 0 && sample.strainRaw <= 1, 'CASE 2 FAIL: strainRaw out of [0,1].');
    assert.ok(sample.strainEma >= 0 && sample.strainEma <= 1, 'CASE 2 FAIL: strainEma out of [0,1].');
    assert.ok(clamp01(checker.getMetacognitiveStrain()) === checker.getMetacognitiveStrain(), 'CASE 2 FAIL: getter strain not clamped.');
  }

  // CASE 3: determinism for same temporal input sequence
  {
    const seq = [
      { p95Ms: 900, failureRate: 0.0, cooldownActive: false },
      { p95Ms: 1800, failureRate: 0.1, cooldownActive: false },
      { p95Ms: 2200, failureRate: 0.15, cooldownActive: true },
      { p95Ms: 1400, failureRate: 0.02, cooldownActive: false }
    ];
    const cfg = { alpha: 0.18, baselineMs: 800, saturationMs: 12000 };

    const a = new MetaSovereigntyCheck();
    const b = new MetaSovereigntyCheck();
    seq.forEach((item) => {
      a.updateLatencyFeedback({ ...item, ...cfg });
      b.updateLatencyFeedback({ ...item, ...cfg });
    });

    assert.equal(
      Number(a.getMetacognitiveStrain().toFixed(10)),
      Number(b.getMetacognitiveStrain().toFixed(10)),
      'CASE 3 FAIL: same input sequence produced different strain.'
    );
    assert.equal(a.getLatencyStressState(), b.getLatencyStressState(), 'CASE 3 FAIL: stress state mismatch for same sequence.');
  }

  console.log('OK: metacognitive latency strain v4.4 test passed');
} catch (error) {
  console.error('FAIL: metacognitive latency strain v4.4 test failed:', error.message);
  process.exit(1);
}

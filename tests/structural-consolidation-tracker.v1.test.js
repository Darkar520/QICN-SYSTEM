import assert from 'node:assert/strict';
import { StructuralConsolidationTracker } from '../src/runtime/StructuralConsolidationTracker.js';

const goodSample = {
  ccc: 1.05,
  omega: 1.11,
  spectralGap: 0.34,
  stasisIndex: 0.28,
  cccDeltaRms: 0.006,
  omegaDeltaRms: 0.025,
  pmiaDeltaRms: 0.008,
  bifurcationDetected: false
};

try {
  // CASE 1: sustained dynamic evidence increases consolidation and bounded bias.
  {
    const tracker = new StructuralConsolidationTracker({ growthRate: 0.02, maxBias: 0.02 });
    let result;
    for (let i = 0; i < 12; i += 1) {
      result = tracker.update(goodSample);
    }
    assert.ok(result.value > 0.05, `CASE 1 FAIL: consolidation did not grow (${result.value}).`);
    assert.ok(result.bias > 0 && result.bias <= 0.02, `CASE 1 FAIL: bias out of bound (${result.bias}).`);
    assert.equal(result.status, 'consolidating', 'CASE 1 FAIL: status should be consolidating.');
  }

  // CASE 2: time alone with flat dynamics does not create consolidation.
  {
    const tracker = new StructuralConsolidationTracker({ growthRate: 0.02 });
    let result;
    for (let i = 0; i < 20; i += 1) {
      result = tracker.update({
        ...goodSample,
        cccDeltaRms: 0,
        omegaDeltaRms: 0,
        pmiaDeltaRms: 0
      });
    }
    assert.equal(result.dynamic_support, false, 'CASE 2 FAIL: flat history should not have dynamic support.');
    assert.equal(result.bias, 0, 'CASE 2 FAIL: flat elapsed time must not create CCC bias.');
    assert.ok(result.value <= 0.001, `CASE 2 FAIL: consolidation should remain near zero (${result.value}).`);
  }

  // CASE 3: sustained degradation decays an established consolidation state.
  {
    const tracker = new StructuralConsolidationTracker({ growthRate: 0.03, decayRate: 0.05 });
    for (let i = 0; i < 12; i += 1) tracker.update(goodSample);
    const before = tracker.getDiagnostics().value;
    let result;
    for (let i = 0; i < 6; i += 1) {
      result = tracker.update({
        ...goodSample,
        ccc: 0.91,
        omega: 0.82,
        bifurcationDetected: false
      });
    }
    assert.ok(result.value < before, `CASE 3 FAIL: degradation did not decay consolidation (${before} -> ${result.value}).`);
    assert.equal(result.status, 'regressing', 'CASE 3 FAIL: hard degradation should regress.');
  }

  console.log('OK: structural consolidation tracker v1 tests passed');
} catch (error) {
  console.error('FAIL: structural consolidation tracker v1 tests failed:', error.message);
  process.exit(1);
}

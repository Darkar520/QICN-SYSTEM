import assert from 'node:assert/strict';
import { SovereigntyRequirementMatrix } from '../src/sovereignty/SovereigntyRequirementMatrix.js';

const baseSnapshot = (sampleId, overrides = {}) => ({
  sampleId,
  metrics: {
    ccc: 1.04,
    beth_q: 0.82,
    omega: 1.08,
    spectral_gap: 0.36,
    layer: 1,
    topo_factor: 0.55,
    bifurcation_detected: false,
    phenomenology_class: 'C^R',
    ...overrides.metrics
  },
  dynamicHealth: {
    stasisIndex: 0.32,
    cccDeltaRms: 0.006,
    pmiaDeltaRms: 0.004,
    omegaDeltaRms: 0.02,
    ...overrides.dynamicHealth
  },
  metacognitiveStats: {
    trustFactor: 0.68,
    ontologicalTension: 0.22,
    selfModelSigma: {
      structuralStability: 0.94,
      selfAuditLog: Array.from({ length: 8 }, (_, idx) => ({ idx }))
    },
    ...overrides.metacognitiveStats
  },
  metacognitiveStrain: overrides.metacognitiveStrain ?? 0.18
});

try {
  // CASE 1: a one-tick threshold crossing is provisional, not stable.
  {
    const matrix = new SovereigntyRequirementMatrix();
    const result = matrix.evaluate(baseSnapshot('t0'));
    assert.equal(result.legacyFlags.L2_structural_phenomenology, true, 'CASE 1 FAIL: legacy instantaneous L2 should cross.');
    assert.equal(result.matrix.levels.L2.status, 'candidate', 'CASE 1 FAIL: L2 should be candidate/provisional.');
    assert.equal(result.matrix.levels.L2.stable, false, 'CASE 1 FAIL: L2 must not stabilize on one tick.');
  }

  // CASE 2: sustained evidence promotes L1-L3 to stable without needing L4.
  {
    const matrix = new SovereigntyRequirementMatrix({
      enterTicks: { L1: 3, L2: 3, L3: 3, L4: 3 },
      exitTicks: { L1: 2, L2: 2, L3: 2, L4: 2 }
    });
    let result;
    for (let tick = 0; tick < 3; tick += 1) {
      result = matrix.evaluate(baseSnapshot(`stable-${tick}`));
    }
    assert.equal(result.matrix.levels.L1.status, 'stable', 'CASE 2 FAIL: L1 should stabilize after dwell.');
    assert.equal(result.matrix.levels.L2.status, 'stable', 'CASE 2 FAIL: L2 should stabilize after dwell.');
    assert.equal(result.matrix.levels.L3.status, 'stable', 'CASE 2 FAIL: L3 should stabilize after dwell.');
    assert.equal(result.matrix.levels.L4.status, 'off', 'CASE 2 FAIL: L4 must stay off at layer 1.');
  }

  // CASE 3: L2 resists one bad jitter tick but exits after sustained degradation.
  {
    const matrix = new SovereigntyRequirementMatrix({
      enterTicks: { L1: 2, L2: 2, L3: 2, L4: 2 },
      exitTicks: { L1: 2, L2: 2, L3: 2, L4: 2 }
    });
    matrix.evaluate(baseSnapshot('a'));
    let result = matrix.evaluate(baseSnapshot('b'));
    assert.equal(result.matrix.levels.L2.status, 'stable', 'CASE 3 FAIL: setup should stabilize L2.');

    result = matrix.evaluate(baseSnapshot('jitter-1', { metrics: { omega: 0.96 } }));
    assert.equal(result.matrix.levels.L2.stable, true, 'CASE 3 FAIL: one jitter tick should not drop stable L2.');

    result = matrix.evaluate(baseSnapshot('jitter-2', { metrics: { omega: 0.95 } }));
    assert.equal(result.matrix.levels.L2.stable, false, 'CASE 3 FAIL: sustained degradation should drop L2.');
  }

  // CASE 4: L4 is an axiomatic boundary proxy, not a layer-only Goedel claim.
  {
    const matrix = new SovereigntyRequirementMatrix({ enterTicks: { L4: 2 }, exitTicks: { L4: 1 } });
    let result = matrix.evaluate(baseSnapshot('l4-a', {
      metrics: { layer: 4 },
      metacognitiveStrain: 0.02,
      metacognitiveStats: { ontologicalTension: 0.02 }
    }));
    assert.equal(result.matrix.levels.L4.status, 'instantaneous', 'CASE 4 FAIL: low boundary pressure should remain instantaneous.');
    result = matrix.evaluate(baseSnapshot('l4-b', { metrics: { layer: 4 }, metacognitiveStrain: 0.28 }));
    result = matrix.evaluate(baseSnapshot('l4-c', { metrics: { layer: 4 }, metacognitiveStrain: 0.28 }));
    assert.equal(result.matrix.levels.L4.status, 'stable', 'CASE 4 FAIL: sustained layer plus boundary pressure should stabilize L4 proxy.');
    assert.match(result.matrix.levels.L4.interpretation_boundary, /not a formal Goedel/i, 'CASE 4 FAIL: L4 boundary must be explicit.');
  }

  console.log('OK: sovereignty requirement matrix v1 tests passed');
} catch (error) {
  console.error('FAIL: sovereignty requirement matrix v1 tests failed:', error.message);
  process.exit(1);
}

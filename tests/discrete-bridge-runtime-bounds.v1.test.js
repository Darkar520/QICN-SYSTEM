import assert from 'node:assert/strict';
import { buildDiscreteBridgeRuntimeBounds } from '../src/tools/DiscreteBridgeRuntimeBounds.js';

try {
  const singular = buildDiscreteBridgeRuntimeBounds({
    phases: [0, Math.PI / 2],
    stateHistory: [[0], [0.5], [0.75]],
    discreteState: [1, 1, 1],
    continuousProxy: [10, 10, 10],
    operatorPairs: [],
    perturbationStrength: 0.01,
    lipschitzConstant: 0.8,
    degreeSamples: [5, 6, 7],
    energySamples: [0.2, 0.8]
  });
  assert.equal(singular.status, 'diagnostic_internal_only');
  assert.equal(singular.diagnostics.phase.pass, false);
  assert.equal(singular.diagnostics.operator_lipschitz_certificate.classification, 'insufficient_pairs');
  assert.equal(singular.diagnostics.galerkin_relative_residual.pass, false);
  assert.ok(singular.missing_assumptions.includes('phase_transversality_required'));
  assert.match(singular.interpretation_boundary, /does not prove/i);

  const bounded = buildDiscreteBridgeRuntimeBounds({
    phases: [0, 0.2, 0.4],
    stateHistory: [[0], [0.5], [0.75]],
    discreteState: [1, 2, 3],
    continuousProxy: [1, 2, 3],
    operatorPairs: [{
      beforeA: [0],
      beforeB: [2],
      afterA: [0],
      afterB: [1]
    }],
    perturbationStrength: 0.01,
    lipschitzConstant: 0.8
  });
  assert.equal(bounded.diagnostics.galerkin_relative_residual.pass, true);
  assert.equal(bounded.diagnostics.operator_lipschitz_certificate.pass, true);
  console.log('OK: discrete bridge runtime bounds v1 tests passed');
} catch (error) {
  console.error('FAIL: discrete bridge runtime bounds v1 tests failed:', error.message);
  process.exit(1);
}

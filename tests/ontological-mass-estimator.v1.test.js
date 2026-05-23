import assert from 'node:assert/strict';
import { estimateOntologicalMassLowerBound } from '../src/canon/ontological_mass/OntologicalMassEstimator.js';

try {
  const report = estimateOntologicalMassLowerBound({
    familyId: 'bounded_noise_v1',
    perturbations: [
      { id: 'p1', energy: 2, deformation: 0.5 },
      { id: 'p2', energy: 3, deformation: 0.25 },
      { id: 'p3', energy: 4, deformation: 0.2 }
    ]
  });
  assert.equal(report.status, 'LOWER_BOUND_SUPPORT');
  assert.equal(report.cannot_certify_CCR, true);
  assert.equal(report.cannot_compute_M_Omega, true);
  assert.ok(report.lower_bound > 0);
  assert.match(report.interpretation_boundary, /cannot certify M_Omega = infinity/i);

  const bad = estimateOntologicalMassLowerBound({
    perturbations: [{ id: 'bad', energy: 0, deformation: 1 }]
  });
  assert.equal(bad.status, 'INSUFFICIENT_EVIDENCE');
  assert.equal(bad.falsification_events[0].reason, 'zero_energy_nonzero_deformation');
  console.log('OK: ontological mass estimator v1 tests passed');
} catch (error) {
  console.error('FAIL: ontological mass estimator v1 tests failed:', error.message);
  process.exit(1);
}

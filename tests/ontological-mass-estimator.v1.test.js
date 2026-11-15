import assert from 'node:assert/strict';
import {
  estimateOntologicalMassFamilyUpperBound,
  estimateOntologicalMassLowerBound
} from '../src/canon/ontological_mass/OntologicalMassEstimator.js';

try {
  const report = estimateOntologicalMassFamilyUpperBound({
    familyId: 'bounded_noise_v1',
    perturbations: [
      { id: 'p1', energy: 2, deformation: 0.5 },
      { id: 'p2', energy: 3, deformation: 0.25 },
      { id: 'p3', energy: 4, deformation: 0.2 },
      { id: 'p_zero_def', energy: 5, deformation: 0 }
    ]
  });
  assert.equal(report.status, 'UPPER_BOUND_SUPPORT');
  assert.equal(report.cannot_certify_CCR, true);
  assert.equal(report.cannot_compute_M_Omega, true);
  assert.equal(report.family_upper_bound, 4);
  assert.equal(report.lower_bound, 4);
  assert.equal(report.sample_count, 3);
  assert.equal(report.excluded_count, 1);
  assert.equal(report.excluded_perturbations[0].reason, 'zero_or_subthreshold_deformation_excluded');
  assert.match(report.interpretation_boundary, /upper bound on the global infimum M_Omega/i);
  assert.match(report.interpretation_boundary, /cannot certify M_Omega = infinity/i);

  // Transition alias check
  const aliasReport = estimateOntologicalMassLowerBound({
    perturbations: [
      { id: 'p1', energy: 2, deformation: 0.5 },
      { id: 'p2', energy: 3, deformation: 0.25 }
    ]
  });
  assert.equal(aliasReport.status, 'UPPER_BOUND_SUPPORT');
  assert.equal(aliasReport.family_upper_bound, 4);

  const bad = estimateOntologicalMassFamilyUpperBound({
    perturbations: [{ id: 'bad', energy: 0, deformation: 1 }]
  });
  assert.equal(bad.status, 'INSUFFICIENT_EVIDENCE');
  assert.equal(bad.falsification_events[0].reason, 'zero_energy_nonzero_deformation');
  console.log('OK: ontological mass estimator v1 tests passed');
} catch (error) {
  console.error('FAIL: ontological mass estimator v1 tests failed:', error.message);
  process.exit(1);
}

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
      { id: 'p_zero_def', energy: 5, deformation: 0 },
      { id: 'p_neg_def', energy: 6, deformation: -0.5 },
      { id: 'p_subthreshold', energy: 5, deformation: 1e-12 },
      { id: 'p_neg_energy', energy: -1, deformation: 0.5 },
      { id: 'p_nan', energy: Number.NaN, deformation: 0.5 }
    ]
  });
  assert.equal(report.status, 'UPPER_BOUND_SUPPORT');
  assert.equal(report.cannot_certify_CCR, true);
  assert.equal(report.cannot_compute_M_Omega, true);
  assert.equal(report.family_upper_bound, 4);
  assert.equal(report.lower_bound, undefined);
  assert.equal('lower_bound' in report, false);
  assert.deepEqual(report.deprecated_aliases, ['estimateOntologicalMassLowerBound']);
  assert.deepEqual(report.removed_aliases, ['lower_bound']);
  assert.equal(report.sample_count, 3);
  assert.equal(report.excluded_count, 5);
  assert.equal(report.signed_displacement_normalized, false);

  const byId = Object.fromEntries(report.excluded_perturbations.map((entry) => [entry.perturbation_id, entry]));
  assert.equal(byId.p_zero_def.reason, 'zero_deformation_excluded_from_infimum');
  assert.equal(byId.p_neg_def.reason, 'negative_metric_deformation_excluded');
  assert.equal(byId.p_neg_def.energy, 6);
  assert.equal(byId.p_neg_def.deformation, -0.5);
  assert.equal(byId.p_subthreshold.reason, 'below_min_deformation_threshold');
  assert.equal(byId.p_neg_energy.reason, 'invalid_nonfinite_or_negative_energy');
  assert.equal(byId.p_nan.reason, 'invalid_nonfinite_or_negative_energy');
  assert.match(report.interpretation_boundary, /upper bound on the global infimum M_Omega/i);
  assert.match(report.interpretation_boundary, /cannot certify M_Omega = infinity/i);

  // Optional mode allowSignedDisplacement: true with deformation < 0
  const signedReport = estimateOntologicalMassFamilyUpperBound(
    {
      familyId: 'signed_displacement_v1',
      perturbations: [
        { id: 's1', energy: 2, deformation: -0.5 },
        { id: 's2', energy: 3, deformation: 0.5 }
      ]
    },
    { allowSignedDisplacement: true }
  );
  assert.equal(signedReport.status, 'UPPER_BOUND_SUPPORT');
  assert.equal(signedReport.sample_count, 2);
  assert.equal(signedReport.excluded_count, 0);
  assert.equal(signedReport.family_upper_bound, 4);
  assert.equal(signedReport.signed_displacement_normalized, true);
  assert.equal(signedReport.signed_displacement_normalized_count, 1);

  // Per-item signed_displacement: true and single-options object form
  const inlineSignedReport = estimateOntologicalMassFamilyUpperBound({
    allowSignedDisplacement: true,
    perturbations: [
      { id: 'i1', energy: 1.5, deformation: -0.5 },
      { id: 'i2', energy: 4, deformation: 1 }
    ]
  });
  assert.equal(inlineSignedReport.status, 'UPPER_BOUND_SUPPORT');
  assert.equal(inlineSignedReport.family_upper_bound, 3);
  assert.equal(inlineSignedReport.signed_displacement_normalized, true);

  // Monotonicity of upper bound when extending finite family W_1 subset W_2: M_hat(W_2) <= M_hat(W_1)
  const w1 = [
    { id: 'w1_a', energy: 10, deformation: 1 },
    { id: 'w1_b', energy: 8, deformation: 1 }
  ];
  const w2 = [
    ...w1,
    { id: 'w2_c', energy: 3, deformation: 1 }
  ];
  const rW1 = estimateOntologicalMassFamilyUpperBound({ familyId: 'W1', perturbations: w1 });
  const rW2 = estimateOntologicalMassFamilyUpperBound({ familyId: 'W2', perturbations: w2 });
  assert.equal(rW1.family_upper_bound, 8);
  assert.equal(rW2.family_upper_bound, 3);
  assert.ok(rW2.family_upper_bound <= rW1.family_upper_bound);

  // Transition alias check
  const aliasReport = estimateOntologicalMassLowerBound({
    perturbations: [
      { id: 'p1', energy: 2, deformation: 0.5 },
      { id: 'p2', energy: 3, deformation: 0.25 }
    ]
  });
  assert.equal(aliasReport.status, 'UPPER_BOUND_SUPPORT');
  assert.equal(aliasReport.family_upper_bound, 4);
  assert.equal(aliasReport.lower_bound, undefined);

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

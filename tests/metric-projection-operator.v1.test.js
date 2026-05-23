import assert from 'node:assert/strict';
import {
  METRIC_PROJECTION_BOUNDARY,
  buildProjectionCertificate,
  projectOntoAdmissibleSet,
  verifyNonExpansive
} from '../src/canon/projection/MetricProjectionOperator.js';

const family = {
  label: 'unit_box_with_coupling',
  requiredComponents: ['ccc', 'omega'],
  bounds: {
    ccc: { min: 0, max: 1 },
    omega: { min: 0, max: 1 }
  },
  halfSpaces: [
    { coefficients: { ccc: 1, omega: 1 }, max: 1.4 }
  ]
};
const metricSpec = { name: 'test_metric', components: ['ccc', 'omega'], epsilon: 1e-9 };

try {
  assert.match(METRIC_PROJECTION_BOUNDARY, /Finite metric projection proxy/);
  const admissible = projectOntoAdmissibleSet({ ccc: 0.5, omega: 0.5 }, family, metricSpec);
  assert.equal(admissible.pass, true);
  assert.equal(admissible.residual, 0, 'CASE 1 FAIL: admissible vector should project to itself.');

  const outside = projectOntoAdmissibleSet({ ccc: 2, omega: -1 }, family, metricSpec);
  assert.equal(outside.pass, true);
  assert.ok(outside.projected_vector.ccc <= 1 && outside.projected_vector.ccc >= 0);
  assert.ok(outside.projected_vector.omega <= 1 && outside.projected_vector.omega >= 0);
  assert.ok(outside.residual > 0, 'CASE 2 FAIL: outside vector should have positive residual.');

  const missing = projectOntoAdmissibleSet({ ccc: 0.4 }, family, metricSpec);
  assert.equal(missing.status, 'INSUFFICIENT_EVIDENCE');
  assert.equal(missing.pass, false);

  const project = (sample) => projectOntoAdmissibleSet(sample, family, metricSpec).projected_vector;
  const nonExpansive = verifyNonExpansive([
    { ccc: -1, omega: 0.2 },
    { ccc: 2, omega: 0.9 },
    { ccc: 0.3, omega: 0.3 }
  ], project, metricSpec);
  assert.equal(nonExpansive.pass, true, 'CASE 3 FAIL: box/halfspace projection should be sample non-expansive.');

  const bad = verifyNonExpansive([
    { ccc: 0, omega: 0 },
    { ccc: 1, omega: 1 }
  ], (sample) => ({ ccc: sample.ccc * 3, omega: sample.omega * 3 }), metricSpec);
  assert.equal(bad.pass, false, 'CASE 4 FAIL: expanding projection must fail.');

  const cert = buildProjectionCertificate({
    vector: { ccc: 1.2, omega: 0.9 },
    constraintFamily: family,
    metricSpec,
    samples: [{ ccc: 0, omega: 0 }, { ccc: 2, omega: 2 }]
  });
  assert.equal(cert.cannot_certify_hilbert_projection, true);
  assert.match(cert.interpretation_boundary, /not the Hilbert-space Aleph operator/i);
  console.log('OK: metric projection operator v1 tests passed');
} catch (error) {
  console.error('FAIL: metric projection operator v1 tests failed:', error.message);
  process.exit(1);
}

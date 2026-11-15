import assert from 'node:assert/strict';
import {
  DEFAULT_SUPPORT_BOUNDS,
  applyBoundedPerturbation,
  buildPersistenceCertificate,
  isInSupport,
  measureCollapseDistance,
  randomPointInSupport,
  verifyForwardInvariance
} from '../src/canon/persistence/PersistenceCertifier.js';
import { buildCanonicalInvariantPackage } from '../src/canon/invariants/CanonicalInvariantPackage.js';

const stableTrajectory = Array.from({ length: 40 }, (_, tick) => ({
  tick,
  metrics: {
    ccc: 0.72 + (tick * 0.001),
    omega: 0.74 + (tick * 0.001),
    omega_mean: 0.74 + (tick * 0.001),
    beth_q: 0.71 + (tick * 0.001),
    spectral_gap: 0.22
  }
}));

try {
  const point = randomPointInSupport(DEFAULT_SUPPORT_BOUNDS, 42);
  assert.equal(isInSupport(point), true, 'CASE 1 FAIL: generated support point should be inside A_S.');
  assert.equal(isInSupport(applyBoundedPerturbation(point, DEFAULT_SUPPORT_BOUNDS, 43)), true, 'CASE 2 FAIL: bounded perturbation should remain in support.');

  const forward = verifyForwardInvariance(null, DEFAULT_SUPPORT_BOUNDS, 10000, 20);
  assert.equal(forward.forward_invariant, true, 'CASE 3 FAIL: empirical support should have zero escapes.');
  assert.equal(forward.escapes, 0, 'CASE 4 FAIL: forward-invariance gate requires 0 escapes.');
  assert.equal(forward.trials, 10000, 'CASE 5 FAIL: gate should run 10,000 trials.');
  assert.match(forward.interpretation_boundary, /finite bounded perturbation/, 'CASE 6 FAIL: forward boundary must be explicit.');

  const collapse = measureCollapseDistance(stableTrajectory);
  assert.ok(collapse.min_collapse_distance > 0, 'CASE 7 FAIL: stable trajectory must have positive distance from collapse set.');
  assert.ok(collapse.normalized_collapse_distance > 0, 'CASE 8 FAIL: normalized collapse distance should be positive.');

  const certificate = buildPersistenceCertificate({
    trajectory: stableTrajectory,
    trials: 10000,
    ticksPerTrial: 20
  });
  assert.equal(certificate.forward.forward_invariant, true, 'CASE 9 FAIL: certificate should preserve forward invariance.');
  assert.ok(certificate.collapse.min_collapse_distance > 0, 'CASE 10 FAIL: certificate should preserve collapse distance.');
  assert.ok(certificate.score > 0.7, 'CASE 11 FAIL: certificate score should be high for stable support.');

  const invariantPackage = buildCanonicalInvariantPackage({
    header: { sourceOfTruth: 'src' },
    verdict: { status: 'ADMISSIBLE' },
    summary: { metrics: {}, flags: {} },
    ticks: stableTrajectory
  });
  const invariant = invariantPackage.invariants.I_per;
  assert.equal(invariant.directSignals.forwardInvariant, null, 'CASE 12 FAIL: simulated trials are not recorded runtime observations.');
  assert.equal(invariant.directSignals.minCollapseDistance, null, 'CASE 13 FAIL: no measured collapse certificate was supplied.');
  assert.ok(!invariant.runtimeSignals.includes('persistence_certificate.forward_invariance'));
  assert.equal(invariant.maturity, 'PARTIAL_RUNTIME_PATH');
  assert.equal(buildCanonicalInvariantPackage({}).invariants.I_per.score, 0, 'missing runtime data cannot produce persistence support');
  assert.equal(buildCanonicalInvariantPackage({ ticks: [{}, {}] }).invariants.I_per.directSignals.continuityRatio, 0,
    'missing tick identifiers cannot be replaced by synthetic consecutive indices');

  console.log('OK: persistence-forward-invariance tests passed');
} catch (error) {
  console.error('FAIL: persistence-forward-invariance tests failed:', error.message);
  process.exit(1);
}

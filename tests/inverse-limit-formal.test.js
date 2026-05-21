import assert from 'node:assert/strict';
import {
  boundFiniteApproximationError,
  buildInverseLimitStateFromTick,
  buildInverseLimitWitness,
  computeInverseLimitScore,
  verifyCategoricalCompatibility
} from '../src/canon/finite_horizon/FiniteProjectionEvaluator.js';
import { buildCanonicalInvariantPackage } from '../src/canon/invariants/CanonicalInvariantPackage.js';

const makeTick = (index, state) => ({
  tick: index,
  metrics: {
    ccc: state.ccc,
    beth_q: state.beth_q,
    omega: state.omega,
    spectral_gap: state.spectral_gap,
    identity_stability_score: state.identity_stability,
    critical_state_hash_semantic_stability: state.hash_semantic,
    predictive_consistency: 0.9,
    operational_determinism_score: 0.94,
    critical_observables_deterministic: 1
  }
});

const stableTrace = Array.from({ length: 40 }, (_, index) => makeTick(index, {
  ccc: 0.72 + index * 0.0005,
  beth_q: 0.71 + index * 0.0005,
  omega: 0.74 + index * 0.0005,
  spectral_gap: 0.22 + index * 0.0002,
  identity_stability: 0.88 + index * 0.0002,
  hash_semantic: 0.93
}));

try {
  const states = stableTrace.map((tick) => buildInverseLimitStateFromTick(tick, { contraction_norm_K: 0.5 }));
  const categorical = verifyCategoricalCompatibility(states, 0.05);
  assert.equal(categorical.categorical_compatibility, true, 'CASE 1 FAIL: stable trajectory should satisfy categorical compatibility.');
  assert.equal(categorical.violations, 0, 'CASE 2 FAIL: stable categorical compatibility should have 0 violations.');

  const witness = buildInverseLimitWitness(states, 0.05);
  assert.equal(witness.is_inverse_limit_element, true, 'CASE 3 FAIL: stable trajectory should be finite inverse-limit element.');
  assert.equal(witness.compatibility_rate, 1, 'CASE 4 FAIL: witness compatibility rate should be exact.');
  assert.match(witness.interpretation_boundary, /Finite-window inverse-limit witness/, 'CASE 5 FAIL: witness boundary must be explicit.');

  const approximation = boundFiniteApproximationError(40, 0.5);
  assert.equal(approximation.negligible, true, 'CASE 6 FAIL: 40-tick contraction bound should be negligible.');
  assert.ok(approximation.approximation_error_bound < 0.01, 'CASE 7 FAIL: approximation error must be <0.01.');

  const score = computeInverseLimitScore({
    trace: stableTrace,
    window: 40,
    epsilon: 0.05,
    summaryMetrics: { contraction_norm_K: 0.5 }
  });
  assert.equal(score.is_inverse_limit_element, true, 'CASE 8 FAIL: score result must expose inverse-limit witness.');
  assert.equal(score.categorical_compatibility, true, 'CASE 9 FAIL: score result must expose categorical compatibility.');
  assert.ok(score.approximation_error_bound < 0.01, 'CASE 10 FAIL: score result must expose finite approximation bound.');

  const invariantPackage = buildCanonicalInvariantPackage({
    header: { sourceOfTruth: 'src' },
    verdict: { status: 'ADMISSIBLE' },
    summary: {
      metrics: {
        contraction_norm_K: 0.5,
        identity_stability_score: 0.9,
        predictive_consistency: 0.9,
        self_state_completeness: 0.9,
        critical_state_hash_semantic_stability: 0.93,
        operational_determinism_score: 0.94,
        critical_observables_deterministic_frac: 1
      },
      flags: {}
    },
    ticks: stableTrace
  });
  const invariant = invariantPackage.invariants.I_ri;
  assert.equal(invariant.directSignals.inverseLimitElement, true, 'CASE 11 FAIL: I_ri must expose inverseLimitElement.');
  assert.equal(invariant.directSignals.categoricalCompatibility, true, 'CASE 12 FAIL: I_ri must expose categorical compatibility.');
  assert.ok(invariant.directSignals.approximationErrorBound < 0.01, 'CASE 13 FAIL: I_ri must expose approximation error bound.');
  assert.ok(
    invariant.runtimeSignals.includes('finite_horizon.categorical_compatibility'),
    'CASE 14 FAIL: I_ri runtime signals must include categorical compatibility.'
  );

  console.log('OK: inverse-limit-formal tests passed');
} catch (error) {
  console.error('FAIL: inverse-limit-formal tests failed:', error.message);
  process.exit(1);
}

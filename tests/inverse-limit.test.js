import assert from 'node:assert/strict';
import {
  computeInverseLimitScore,
  projectionMorphism
} from '../src/canon/finite_horizon/FiniteProjectionEvaluator.js';
import { buildCanonicalInvariantPackage } from '../src/canon/invariants/CanonicalInvariantPackage.js';

const components = ['ccc', 'beth_q', 'omega', 'spectral_gap', 'identity_stability', 'hash_semantic'];

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
  ccc: 0.72 + (index * 0.001),
  beth_q: 0.71 + (index * 0.001),
  omega: 0.74 + (index * 0.001),
  spectral_gap: 0.22 + (index * 0.0005),
  identity_stability: 0.88 + (index * 0.0005),
  hash_semantic: 0.93
}));

const chaoticTrace = Array.from({ length: 40 }, (_, index) => {
  const high = index % 2 === 0;
  return makeTick(index, {
    ccc: high ? 0.05 : 1.4,
    beth_q: high ? 1.2 : 0.02,
    omega: high ? 0.01 : 1.35,
    spectral_gap: high ? 0.01 : 0.6,
    identity_stability: high ? 0.18 : 1.3,
    hash_semantic: high ? 0.1 : 1.1
  });
});

try {
  {
    const morphism = projectionMorphism(
      { ccc: 0.52, beth_q: 0.51, omega: 0.49, spectral_gap: 0.2, identity_stability: 0.8, hash_semantic: 0.91 },
      { ccc: 0.5, beth_q: 0.5, omega: 0.5, spectral_gap: 0.2, identity_stability: 0.8, hash_semantic: 0.9 },
      0.05,
      components
    );
    assert.equal(morphism.compatible, true, 'CASE 1 FAIL: small adjacent deltas should be compatible.');
    assert.equal(morphism.compatibilityErrors, 0, 'CASE 1 FAIL: compatible morphism should have zero errors.');
  }

  {
    const score = computeInverseLimitScore({ trace: stableTrace, window: 40, epsilon: 0.05 });
    assert.ok(score.inverse_limit_score > 0.7, `CASE 2 FAIL: stable finite trace should score high, got ${score.inverse_limit_score}`);
    assert.equal(score.evidence_status, 'computed_finite_window', 'CASE 2 FAIL: stable score should be computed.');
    assert.deepEqual(score.components, components, 'CASE 2 FAIL: all inverse-limit components should be measured.');
  }

  {
    const score = computeInverseLimitScore({ trace: chaoticTrace, window: 40, epsilon: 0.05 });
    assert.ok(score.inverse_limit_score < 0.3, `CASE 3 FAIL: chaotic finite trace should score low, got ${score.inverse_limit_score}`);
    assert.ok(score.totalCompatibilityErrors > 0, 'CASE 3 FAIL: chaotic trace should accumulate compatibility errors.');
  }

  {
    const invariantPackage = buildCanonicalInvariantPackage({
      header: { sourceOfTruth: 'src' },
      verdict: { status: 'ADMISSIBLE' },
      summary: {
        metrics: {
          identity_stability_score: 0.9,
          predictive_consistency: 0.9,
          self_state_completeness: 0.9,
          critical_state_hash_semantic_stability: 0.93,
          operational_determinism_score: 0.94,
          critical_observables_deterministic_frac: 1
        }
      },
      ticks: stableTrace
    });
    const invariant = invariantPackage.invariants.I_ri;
    assert.ok(Number.isFinite(invariant.directSignals.inverseLimitScore), 'CASE 4 FAIL: I_ri must expose inverseLimitScore.');
    assert.ok(
      invariant.runtimeSignals.includes('finite_horizon.inverse_limit_score'),
      'CASE 4 FAIL: I_ri runtimeSignals must include finite_horizon.inverse_limit_score.'
    );
    assert.ok(
      invariant.provenance.residualDependencies.some((item) => item.includes('not full inverse-limit preservation')),
      'CASE 4 FAIL: I_ri provenance must preserve the inverse-limit boundary.'
    );
  }

  console.log('OK: inverse-limit tests passed');
} catch (error) {
  console.error('FAIL: inverse-limit tests failed:', error.message);
  process.exit(1);
}

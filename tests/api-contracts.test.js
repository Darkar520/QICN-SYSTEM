import assert from 'node:assert/strict';
import { PhenomenologyCore } from '../src/simulation/PhenomenologyCore.js';
import { computeInverseLimitScore } from '../src/canon/finite_horizon/FiniteProjectionEvaluator.js';
import { buildCanonicalInvariantPackage } from '../src/canon/invariants/CanonicalInvariantPackage.js';
import {
  runSpectralDecayControl,
  runInverseLimitRuptureControl,
  runTrivialTopologyControl
} from '../src/experiments/negative_controls_expanded.js';

const makeTick = (index) => ({
  tick: index,
  metrics: {
    ccc: 0.7 + (index * 0.001),
    pmia: 0.4,
    beth_q: 0.65,
    omega: 0.72,
    spectral_gap: 0.24,
    identity_stability_score: 0.9,
    critical_state_hash_semantic_stability: 0.94,
    predictive_consistency: 0.9,
    operational_determinism_score: 0.95,
    critical_observables_deterministic: 1
  }
});

try {
  const core = new PhenomenologyCore();
  core._diagnostics.log_enabled = false;
  core.stateHistory = Array.from({ length: 20 }, (_, index) => 1 - (index * 0.01));
  core.inputHistory = Array.from({ length: 20 }, (_, index) => index / 19);
  core.transitionHistory = core.stateHistory.slice(1).map((value, index) => ({
    from: core.stateHistory[index],
    to: value,
    input: core.inputHistory[index + 1]
  }));
  const spectral = core.calculateSpectralGap();
  for (const field of ['lambda_1', 'lambda_2', 'delta_lambda']) {
    assert.ok(Number.isFinite(Number(spectral[field])), `spectral contract missing finite ${field}`);
  }

  const ticks = Array.from({ length: 40 }, (_, index) => makeTick(index));
  const inverseLimit = computeInverseLimitScore({ trace: ticks, window: 40 });
  assert.ok(Number.isFinite(Number(inverseLimit.inverse_limit_score)), 'inverse_limit_score must be finite');
  assert.ok(Number.isFinite(Number(inverseLimit.totalCompatibilityErrors)), 'totalCompatibilityErrors must be finite');

  const invariantPackage = buildCanonicalInvariantPackage({
    header: { sourceOfTruth: 'src' },
    verdict: { status: 'ADMISSIBLE' },
    summary: { metrics: { identity_stability_score: 0.9, predictive_consistency: 0.9 } },
    ticks
  });
  assert.ok(Number.isFinite(Number(invariantPackage?.invariants?.I_ri?.score)), 'I_ri score must be present and finite');

  for (const result of [
    runSpectralDecayControl(),
    runInverseLimitRuptureControl(),
    runTrivialTopologyControl()
  ]) {
    assert.equal(typeof result.control, 'string', 'negative control must expose control id');
    assert.equal(typeof result.pass, 'boolean', 'negative control must expose pass boolean');
    assert.equal(typeof result.interpretation_boundary, 'string', 'negative control must expose interpretation boundary');
  }

  console.log('OK: API contracts passed');
} catch (error) {
  console.error('FAIL: API contracts failed:', error.message);
  process.exit(1);
}

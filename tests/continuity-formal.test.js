import assert from 'node:assert/strict';
import { PhenomenologyCore } from '../src/simulation/PhenomenologyCore.js';
import { buildCanonicalInvariantPackage } from '../src/canon/invariants/CanonicalInvariantPackage.js';

const stableTrajectory = Array.from({ length: 16 }, (_, index) => ({
  metrics: {
    ccc: 0.66 + index * 0.01,
    beth_q: 0.55 + index * 0.005,
    omega: 0.82 + index * 0.01,
    spectral_gap: 0.2 + index * 0.002,
    regime_class: index < 6 ? 'CONSCIOUS' : 'STABLE_CORE'
  }
}));

try {
  const core = new PhenomenologyCore();
  core._diagnostics.log_enabled = false;

  const projection = core.projectRegimeState(stableTrajectory[0]);
  assert.equal(projection.regime_class, 'CONSCIOUS', 'CASE 1 FAIL: Pi_S should preserve explicit regime labels.');
  assert.equal(Number.isFinite(projection.ccc), true, 'CASE 2 FAIL: Pi_S must expose finite CCC.');
  assert.match(projection.interpretation_boundary, /Pi_S finite runtime projection/, 'CASE 3 FAIL: Pi_S boundary must be explicit.');

  const fragmentation = core.computeFragmentationFunctional(stableTrajectory, 1.5);
  assert.equal(fragmentation.admissible, true, 'CASE 4 FAIL: stable trajectory should have bounded fragmentation.');
  assert.ok(fragmentation.fragmentation_bound < 1.5, 'CASE 5 FAIL: fragmentation bound should stay below threshold.');
  assert.equal(fragmentation.invalid_regime_jumps, 0, 'CASE 6 FAIL: stable trajectory should have 0 invalid jumps.');
  assert.match(fragmentation.interpretation_boundary, /Finite fragmentation functional/, 'CASE 7 FAIL: fragmentation boundary must be explicit.');

  const invalid = core.detectInvalidRegimeJumps([
    { metrics: { ccc: 0.95, beth_q: 0.7, omega: 1.0, spectral_gap: 0.3, regime_class: 'CONSCIOUS' } },
    { metrics: { ccc: 0.96, beth_q: 0.7, omega: 1.0, spectral_gap: 0.3, regime_class: 'PRE_CONSCIOUS' } }
  ]);
  assert.equal(invalid.invalid_jump_count, 1, 'CASE 8 FAIL: contradictory regime transition should be detected.');

  const discontinuous = core.computeFragmentationFunctional([
    { metrics: { ccc: 0.95, beth_q: 0.7, omega: 1.0, spectral_gap: 0.3, regime_class: 'CONSCIOUS' } },
    { metrics: { ccc: 0.96, beth_q: 0.7, omega: 1.0, spectral_gap: 0.3, regime_class: 'PRE_CONSCIOUS' } }
  ], 1.5);
  assert.equal(discontinuous.admissible, false, 'CASE 9 FAIL: invalid jumps should make fragmentation inadmissible.');

  const invariantPackage = buildCanonicalInvariantPackage({
    header: { sourceOfTruth: 'src' },
    verdict: { status: 'ADMISSIBLE' },
    summary: { metrics: { predictive_consistency: 0.9, tau_recovery: 2 }, flags: {} },
    ticks: stableTrajectory
  });
  const invariant = invariantPackage.invariants.I_cont;
  assert.equal(invariant.directSignals.piSProjectionDefined, true, 'CASE 10 FAIL: I_cont must expose Pi_S projection status.');
  assert.equal(invariant.directSignals.invalidRegimeJumps, 0, 'CASE 11 FAIL: I_cont must expose invalid jump count.');
  assert.ok(
    invariant.runtimeSignals.includes('phenomenology.fragmentation_functional'),
    'CASE 12 FAIL: I_cont runtime signals must include fragmentation functional.'
  );

  console.log('OK: continuity-formal tests passed');
} catch (error) {
  console.error('FAIL: continuity-formal tests failed:', error.message);
  process.exit(1);
}

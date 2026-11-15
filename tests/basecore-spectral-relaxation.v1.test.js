import assert from 'node:assert/strict';
import { F, ZERO, ONE, HALF, vecAdd, vecEq } from '../src/simulation/tower/ExactFraction.js';
import {
  assignBaseCoreJacobianSpectrum,
  computeBaseCoreDirectionalDerivativeAtHalf,
  computeBaseCoreRelaxationTime,
  evaluateBaseCoreSpectralRegime,
  evaluateFoundationalFront1,
  verifyBaseCoreSpectrumAndRelaxation
} from '../src/canon/finite_horizon/FiniteProjectionEvaluator.js';
import {
  PhenomenologyCore,
  SPECTRAL_INTERPRETATION_BOUNDARY
} from '../src/simulation/PhenomenologyCore.js';

try {
  // 1. Full BaseCore thm:spectrum & thm:relaxation verification report
  const witness = verifyBaseCoreSpectrumAndRelaxation();
  assert.equal(witness.passed, true);
  assert.equal(witness.cornerGlobalGeometricContractionVerified, true);
  assert.equal(witness.negativeControls.cornerJacobianSpectrumRejected, true);
  assert.equal(witness.negativeControls.directionalNonlinearityGapAtHalf, '1/2');
  assert.equal(witness.negativeControls.nonContractiveRejected, true);

  // Also wired into evaluateFoundationalFront1()
  const f1 = evaluateFoundationalFront1();
  assert.equal(f1.passed, true);
  assert.equal(f1.baseCoreSpectrumAndRelaxation.passed, true);

  // 2. Interior regular regime: 0 <= u < 1/2 (u = 0, u = 1/4)
  const regZero = evaluateBaseCoreSpectralRegime(ZERO);
  assert.deepEqual(regZero.fixedPointVector, ['0', '0']);
  assert.equal(regZero.frechetDifferentiable, true);
  assert.deepEqual(regZero.spectrum, ['0', '1/2']);
  assert.equal(regZero.spectralRadiusRho, '1/2');
  assert.equal(regZero.spectralGapDeltaState, '1/2');

  const regQuarter = evaluateBaseCoreSpectralRegime(F(1, 4));
  assert.deepEqual(regQuarter.fixedPointVector, ['1/2', '0']);
  assert.equal(regQuarter.frechetDifferentiable, true);
  assert.equal(regQuarter.jacobianSpectrumAssigned, true);
  assert.deepEqual(regQuarter.derivativeMatrixOnE, [['1/2', '0'], ['0', '1/2']]);
  assert.deepEqual(regQuarter.spectrum, ['0', '1/2']);
  assert.equal(regQuarter.spectralRadiusRho, '1/2');
  assert.equal(regQuarter.spectralGapDeltaState, '1/2');
  assert.ok(Math.abs(regQuarter.tauStateLinearized - (1 / Math.log(2))) < 1e-12);

  // 3. Corner non-differentiable regime: u = 1/2
  const regHalf = evaluateBaseCoreSpectralRegime(HALF);
  assert.deepEqual(regHalf.fixedPointVector, ['1', '0']);
  assert.equal(regHalf.frechetDifferentiable, false);
  assert.equal(regHalf.jacobianSpectrumAssigned, false);
  assert.equal(regHalf.spectrum, null);
  assert.equal(regHalf.tauStateLinearized, null);

  const dPlus = computeBaseCoreDirectionalDerivativeAtHalf([ONE, ZERO]);
  const dMinus = computeBaseCoreDirectionalDerivativeAtHalf([ONE.neg(), ZERO]);
  const dSum = vecAdd(dPlus, dMinus);
  assert.equal(vecEq(dPlus, [ZERO, ZERO]), true);
  assert.equal(vecEq(dMinus, [HALF.neg(), ZERO]), true);
  assert.equal(vecEq(dSum, [HALF.neg(), ZERO]), true);
  assert.equal(vecEq(dSum, [ZERO, ZERO]), false);

  // 4. Exterior regular regime: u > 1/2 (u = 3/4, u = 1)
  const regThreeQuarters = evaluateBaseCoreSpectralRegime(F(3, 4));
  assert.deepEqual(regThreeQuarters.fixedPointVector, ['1', '0']);
  assert.equal(regThreeQuarters.frechetDifferentiable, true);
  assert.equal(regThreeQuarters.projectionPerp, 'P_perp(v1, v2) = (0, v2)');
  assert.deepEqual(regThreeQuarters.derivativeMatrixOnE, [['0', '0'], ['0', '2/5']]);
  assert.deepEqual(regThreeQuarters.spectrum, ['0', '2/5']);
  assert.equal(regThreeQuarters.spectralRadiusRho, '2/5');
  assert.equal(regThreeQuarters.spectralGapDeltaState, '3/5');
  assert.ok(regThreeQuarters.tauStateLinearized >= (1 / Math.log(3)) - 1e-12);
  assert.ok(regThreeQuarters.tauStateLinearized <= (1 / Math.log(2)) + 1e-12);

  const regOne = evaluateBaseCoreSpectralRegime(ONE);
  assert.deepEqual(regOne.fixedPointVector, ['1', '0']);
  assert.equal(regOne.frechetDifferentiable, true);
  assert.deepEqual(regOne.spectrum, ['0', '1/3']);
  assert.equal(regOne.spectralRadiusRho, '1/3');
  assert.equal(regOne.spectralGapDeltaState, '2/3');
  assert.ok(Math.abs(regOne.tauStateLinearized - (1 / Math.log(3))) < 1e-12);

  // 5. Negative controls: reject Jacobian spectrum at u = 1/2 and tau_state for rho <= 0 or rho >= 1
  assert.throws(
    () => assignBaseCoreJacobianSpectrum(HALF),
    /forbids assigning a linear Jacobian spectrum at u = 1\/2/i
  );
  for (const badRho of [0, -0.5, 1, 1.25, ZERO, ONE, F(4, 3), Number.NaN]) {
    assert.throws(
      () => computeBaseCoreRelaxationTime(badRho),
      /requires 0 < rho < 1/i
    );
  }

  // 6. PhenomenologyCore boundary metadata checks (warmup, empirical, reset)
  const core = new PhenomenologyCore();
  core._diagnostics.log_enabled = false;
  assert.equal(core.phenomenologyState.spectral_estimator_mode, 'uninitialized');
  assert.equal(core.phenomenologyState.basecore_thm_relaxation_instantiated, false);
  assert.equal(core.phenomenologyState.spectral_interpretation_boundary, SPECTRAL_INTERPRETATION_BOUNDARY);

  // Warmup branch (< 5 transitions)
  core.recordState({ ccc: 0.6 }, { strength: 0.2 });
  const warmupSpectral = core.calculateSpectralGap();
  assert.ok(Number.isFinite(warmupSpectral.delta_lambda));
  assert.ok(Number.isFinite(warmupSpectral.tau));
  assert.equal(warmupSpectral.spectral_estimator_mode, 'warmup_ccc_proxy');
  assert.equal(warmupSpectral.basecore_thm_relaxation_instantiated, false);
  assert.equal(warmupSpectral.spectral_interpretation_boundary, SPECTRAL_INTERPRETATION_BOUNDARY);
  assert.equal(core.phenomenologyState.spectral_estimator_mode, 'warmup_ccc_proxy');
  assert.equal(core.phenomenologyState.basecore_thm_relaxation_instantiated, false);

  // Empirical branch (>= 5 transitions)
  for (let i = 1; i <= 10; i += 1) {
    core.recordState({ ccc: 0.6 + (0.02 * i) }, { strength: 0.2 + (0.01 * i) });
  }
  const empiricalSpectral = core.calculateSpectralGap();
  assert.ok(Number.isFinite(empiricalSpectral.delta_lambda));
  assert.ok(Number.isFinite(empiricalSpectral.tau));
  assert.equal(empiricalSpectral.spectral_estimator_mode, 'lag1_autocorrelation_proxy');
  assert.equal(empiricalSpectral.basecore_thm_relaxation_instantiated, false);
  assert.equal(empiricalSpectral.spectral_interpretation_boundary, SPECTRAL_INTERPRETATION_BOUNDARY);
  assert.equal(core.phenomenologyState.spectral_estimator_mode, 'lag1_autocorrelation_proxy');
  assert.equal(core.phenomenologyState.basecore_thm_relaxation_instantiated, false);
  assert.match(empiricalSpectral.spectral_interpretation_boundary, /Empirical lag-1 autocorrelation proxy/i);
  assert.match(empiricalSpectral.spectral_interpretation_boundary, /Frechet differentiability at u = 1\/2/i);

  // Relaxation time operational API preserved
  assert.ok(Math.abs(core.calculateRelaxationTime(0.5) - (1 / Math.log(2))) < 1e-12);
  assert.equal(core.calculateRelaxationTime(0), Number.MAX_SAFE_INTEGER);

  core.reset();
  assert.equal(core.phenomenologyState.spectral_estimator_mode, 'uninitialized');
  assert.equal(core.phenomenologyState.basecore_thm_relaxation_instantiated, false);
  assert.equal(core.phenomenologyState.spectral_interpretation_boundary, SPECTRAL_INTERPRETATION_BOUNDARY);

  console.log('OK: basecore spectral & relaxation v1 tests passed');
} catch (error) {
  console.error('FAIL: basecore spectral & relaxation v1 tests failed:', error.message);
  process.exit(1);
}

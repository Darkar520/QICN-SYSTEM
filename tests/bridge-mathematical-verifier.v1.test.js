import assert from 'node:assert/strict';
import {
  BridgeMathematicalVerifier,
  VERIFIER_EPISTEMIC_STATUS
} from '../src/tools/BridgeMathematicalVerifier.js';

const verifier = new BridgeMathematicalVerifier({
  tolerance: 1e-5,
  maxLipschitzConstant: 0.99,
  maxPhasePairs: 8
});

const assertBoundary = (result) => {
  assert.equal(result.epistemicStatus, VERIFIER_EPISTEMIC_STATUS);
  assert.equal(result.claimBoundary.notExternalValidation, true);
  assert.equal(result.claimBoundary.notSubBridgeGate, true);
  assert.equal(result.claimBoundary.notConsciousnessEvidence, true);
  assert.match(result.interpretationBoundary, /Internal diagnostic proxy only/);
};

try {
  const singular = verifier.evaluatePhaseTransversality([0, Math.PI / 2]);
  assert.equal(singular.pass, false);
  assert.equal(singular.classification, 'phase_singularity_detected');
  assert.equal(singular.pairEvaluationMode, 'exhaustive');
  assertBoundary(singular);

  const largePhaseSample = verifier.evaluatePhaseTransversality(
    Array.from({ length: 150 }, (_, index) => index / 150)
  );
  assert.equal(largePhaseSample.pairEvaluationMode, 'sampled_deterministic');
  assert.ok(largePhaseSample.pairsEvaluated <= verifier.maxPhasePairs + 1);
  assert.ok(largePhaseSample.coverageRatio < 1);
  assertBoundary(largePhaseSample);

  const insufficientHistory = verifier.estimateTrajectoryContraction([[1, 2, 3]]);
  assert.equal(insufficientHistory.pass, false);
  assert.equal(insufficientHistory.classification, 'insufficient_history');
  assertBoundary(insufficientHistory);

  const expandingTrajectory = verifier.estimateTrajectoryContraction([
    [0],
    [1],
    [3]
  ]);
  assert.equal(expandingTrajectory.pass, false);
  assert.equal(expandingTrajectory.classification, 'trajectory_expansion_or_insufficient_proxy');
  assert.equal(expandingTrajectory.estimatorType, 'single_trajectory_proxy');
  assertBoundary(expandingTrajectory);

  const alias = verifier.evaluateLipschitzContractivity([[0], [0.5], [0.75]]);
  assert.equal(alias.deprecatedAlias, 'estimateTrajectoryContraction');
  assertBoundary(alias);

  for (const lipschitz of [1, 1.2, Infinity, NaN]) {
    const result = verifier.estimateFixedPointPerturbationBound(0.1, lipschitz);
    assert.equal(result.pass, false);
    assert.equal(result.classification, 'non_contractive_lipschitz_input');
    assert.equal(result.fixedPointDriftBound, Infinity);
    assertBoundary(result);
  }

  const boundedDrift = verifier.estimateFixedPointPerturbationBound(0.01, 0.8);
  assert.equal(boundedDrift.pass, true);
  assert.equal(boundedDrift.classification, 'bounded_perturbation_drift_proxy');
  assertBoundary(boundedDrift);

  const scaledGalerkin = verifier.evaluateGalerkinConsistency([1, 1, 1], [10, 10, 10]);
  assert.equal(scaledGalerkin.pass, false);
  assert.equal(scaledGalerkin.classification, 'projection_norm_leakage_detected');
  assert.ok(scaledGalerkin.cosineSimilarity > 0.999);
  assert.ok(scaledGalerkin.relativeNormError > 0.5);
  assertBoundary(scaledGalerkin);

  const exactGalerkin = verifier.evaluateGalerkinConsistency([1, 2, 3], [1, 2, 3]);
  assert.equal(exactGalerkin.pass, true);
  assert.equal(exactGalerkin.classification, 'galerkin_relative_norm_proxy_bounded');
  assert.equal(exactGalerkin.relativeNormError, 0);
  assertBoundary(exactGalerkin);

  const incompatibleGalerkin = verifier.evaluateGalerkinConsistency([1], [1, 2]);
  assert.equal(incompatibleGalerkin.pass, false);
  assert.equal(incompatibleGalerkin.classification, 'incompatible_dimensions');
  assertBoundary(incompatibleGalerkin);

  const contractivePairs = verifier.estimateOperatorLipschitzFromPairs([
    {
      beforeA: [0, 0],
      beforeB: [2, 0],
      afterA: [0, 0],
      afterB: [1, 0]
    }
  ]);
  assert.equal(contractivePairs.pass, true);
  assert.equal(contractivePairs.estimatorType, 'finite_pair_operator_proxy');
  assertBoundary(contractivePairs);

  const expansivePairs = verifier.estimateOperatorLipschitzFromPairs([
    {
      beforeA: [0],
      beforeB: [1],
      afterA: [0],
      afterB: [2]
    }
  ]);
  assert.equal(expansivePairs.pass, false);
  assert.equal(expansivePairs.classification, 'finite_pair_operator_expansion_risk');
  assertBoundary(expansivePairs);

  const noPairs = verifier.estimateOperatorLipschitzFromPairs([]);
  assert.equal(noPairs.pass, false);
  assert.equal(noPairs.classification, 'insufficient_pairs');
  assertBoundary(noPairs);

  const invalidOnlyPairs = verifier.estimateOperatorLipschitzFromPairs([
    {
      beforeA: [1],
      beforeB: [1],
      afterA: [2],
      afterB: [2]
    }
  ]);
  assert.equal(invalidOnlyPairs.pass, false);
  assert.equal(invalidOnlyPairs.classification, 'insufficient_valid_pairs');
  assertBoundary(invalidOnlyPairs);

  console.log('OK: bridge mathematical verifier diagnostics remain bounded');
} catch (error) {
  console.error('FAIL: bridge mathematical verifier diagnostics failed:', error.message);
  process.exit(1);
}

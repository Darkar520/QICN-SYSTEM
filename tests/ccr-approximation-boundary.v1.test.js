import assert from 'node:assert/strict';
import { CCR_LEVELS, classifyCCRApproximation } from '../src/canon/ccr/CCRApproximationBoundary.js';

try {
  const none = classifyCCRApproximation();
  assert.equal(none.level, CCR_LEVELS.NO_EVIDENCE);
  assert.equal(none.cannot_verify_CCR, true);
  assert.doesNotMatch(JSON.stringify(none), /CCR verified/i);

  const partial = classifyCCRApproximation({
    finiteStability: true,
    projectionCompatibility: true,
    lowerBoundGrowth: true,
    negativeControlsPassed: true
  });
  assert.ok(partial.level < CCR_LEVELS.CCR_APPROXIMATION_CANDIDATE, 'CASE 1 FAIL: missing perturbation resistance must block candidate.');

  const candidate = classifyCCRApproximation({
    finiteStability: true,
    perturbationResistance: true,
    projectionCompatibility: true,
    lowerBoundGrowth: true,
    negativeControlsPassed: true
  });
  assert.equal(candidate.level, CCR_LEVELS.CCR_APPROXIMATION_CANDIDATE);
  assert.equal(candidate.label, 'ccr_approximation_candidate');
  assert.equal(candidate.cannot_verify_CCR, true);

  const collapsed = classifyCCRApproximation({
    finiteStability: true,
    perturbationResistance: true,
    projectionCompatibility: true,
    lowerBoundGrowth: true,
    negativeControlsPassed: true,
    collapseEvent: true
  });
  assert.ok(collapsed.level <= CCR_LEVELS.FINITE_STABILITY, 'CASE 2 FAIL: collapse must downgrade.');
  console.log('OK: ccr approximation boundary v1 tests passed');
} catch (error) {
  console.error('FAIL: ccr approximation boundary v1 tests failed:', error.message);
  process.exit(1);
}

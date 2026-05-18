import fs from 'fs';
import path from 'path';
import {
  validateInvariantWeights,
  calibrateOrFreeze,
  fitConstrainedWeights
} from '../src/canon/calibration/InvariantWeightCalibration.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

(() => {
  const frozenPath = path.resolve('src/canon/calibration/heuristic_frozen_v1.json');
  assert(fs.existsSync(frozenPath), 'CASE 1 FAIL: heuristic_frozen_v1.json must exist.');

  const valid = validateInvariantWeights({ invariantId: 'I_per', weights: { continuity: 0.45, stasis: 0.25, io: 0.2, monotonic: 0.1 } });
  assert(valid.ok, 'CASE 2 FAIL: convex weights should validate.');

  const frozen = calibrateOrFreeze({ invariantId: 'I_per', weights: { continuity: 0.45, stasis: 0.25, io: 0.2, monotonic: 0.1 }, datasetRef: null });
  assert(frozen.status === 'INSUFFICIENT_EXTERNAL_EVIDENCE', 'CASE 3 FAIL: missing dataset must block calibration.');
  assert(frozen.action === 'FROZEN_HEURISTIC', 'CASE 4 FAIL: missing dataset must freeze heuristic weights.');

  const fitted = fitConstrainedWeights({
    designMatrix: [[1, 0], [0, 1], [1, 1]],
    labels: [1, 0.5, 1.5],
    constraints: { minWeight: 0, sumToOne: true },
    featureNames: ['a', 'b']
  });
  assert(fitted.status === 'FITTED_CONSTRAINED_WEIGHTS', 'CASE 5 FAIL: fixture dataset should fit constrained weights.');
  assert(Math.abs(Object.values(fitted.weights).reduce((a, b) => a + b, 0) - 1) < 1e-9, 'CASE 6 FAIL: fitted weights must sum to one.');

  console.log('OK: invariant-weight-calibration.v1 tests passed');
})();

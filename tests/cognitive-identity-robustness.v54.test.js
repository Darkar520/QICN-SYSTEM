import assert from 'node:assert/strict';
import { computeIdentityStabilityScore } from '../src/utils/cognitiveEmergenceEvaluation.js';

const makeSeries = ({ shock = false, smoothingAttack = false } = {}) => {
  const base = Array.from({ length: 32 }, (_, idx) => ({
    cccDrift: 0.02 + ((idx % 4) * 0.003),
    omegaDrift: 0.03 + ((idx % 3) * 0.003),
    spectralGapDrift: 0.03 + ((idx % 5) * 0.002),
    narrativePenalty: 0.05,
    perturbationResponse: 0.03
  }));
  if (!shock) return base;
  return [
    ...base,
    {
      cccDrift: 0.22,
      omegaDrift: 0.21,
      spectralGapDrift: 0.24,
      narrativePenalty: 0.35,
      perturbationResponse: 0.19,
      isShock: true,
      shockMagnitude: 0.26,
      ...(smoothingAttack
        ? {
          cccDriftSmoothed: 0.01,
          omegaDriftSmoothed: 0.01,
          spectralGapDriftSmoothed: 0.01
        }
        : {})
    }
  ];
};

try {
  const stable = computeIdentityStabilityScore(makeSeries());
  const shocked = computeIdentityStabilityScore(makeSeries({ shock: true }));
  const attacked = computeIdentityStabilityScore(makeSeries({ shock: true, smoothingAttack: true }));

  assert.ok(stable.score >= 0.82, 'CASE 1 FAIL: stable series should keep high identity score.');
  assert.ok(shocked.score < stable.score, 'CASE 2 FAIL: controlled shock must reduce identity score.');
  assert.ok(attacked.components.smoothingGuardPenalty > 0, 'CASE 3 FAIL: smoothing attack must trigger guard penalty.');
  assert.ok(attacked.score <= shocked.score, 'CASE 3 FAIL: smoothing attack must not inflate score.');

  console.log('ok cognitive-identity-robustness.v54');
} catch (error) {
  console.error('fail cognitive-identity-robustness.v54:', error.message);
  process.exit(1);
}

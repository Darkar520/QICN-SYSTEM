import assert from 'node:assert/strict';
import { auditProjectiveTower } from '../src/canon/finite_horizon/ProjectiveTowerAuditor.js';

const tick = (index, values) => ({ tick: index, metrics: values });
const constantTrace = Array.from({ length: 32 }, (_, index) => tick(index, {
  ccc: 0.7,
  beth_q: 0.7,
  omega: 0.7,
  spectral_gap: 0.2,
  identity_stability_score: 0.9,
  critical_state_hash_semantic_stability: 0.9
}));
const structuredTrace = Array.from({ length: 48 }, (_, index) => tick(index, {
  ccc: 0.62 + Math.sin(index / 5) * 0.025,
  beth_q: 0.64 + Math.sin(index / 6) * 0.025,
  omega: 0.75 + Math.sin(index / 7) * 0.025,
  spectral_gap: 0.23 + Math.sin(index / 8) * 0.01,
  identity_stability_score: 0.88 + Math.sin(index / 9) * 0.01,
  critical_state_hash_semantic_stability: 0.92 + Math.sin(index / 10) * 0.005
}));
const chaoticTrace = Array.from({ length: 16 }, (_, index) => tick(index, {
  ccc: index % 2 ? 0.1 : 1.8,
  beth_q: index % 2 ? 0.2 : 1.7,
  omega: index % 2 ? 0.1 : 1.6,
  spectral_gap: index % 2 ? 0.05 : 0.9,
  identity_stability_score: index % 2 ? 0.1 : 1,
  critical_state_hash_semantic_stability: index % 2 ? 0.1 : 1
}));

try {
  const constant = auditProjectiveTower({ trace: constantTrace, horizons: [8, 16, 32], epsilon: 0.05 });
  assert.equal(constant.degeneracy_risk, true, 'CASE 1 FAIL: constant trace must be degeneracy risk.');
  assert.equal(constant.strong_witness_count, 0, 'CASE 2 FAIL: constant trace cannot be strong witness.');

  const structured = auditProjectiveTower({ trace: structuredTrace, horizons: [16, 32, 48], epsilon: 0.05 });
  assert.ok(structured.per_horizon.length >= 2, 'CASE 3 FAIL: structured tower should evaluate multiple horizons.');
  assert.ok(structured.per_horizon.some((item) => item.is_inverse_limit_element), 'CASE 4 FAIL: structured trace should have finite compatibility.');
  assert.match(structured.interpretation_boundary, /not full inverse-limit/i);

  const chaotic = auditProjectiveTower({ trace: chaoticTrace, horizons: [8, 16], epsilon: 0.05 });
  assert.ok(
    chaotic.per_horizon.some((item) => !item.is_inverse_limit_element),
    'CASE 5 FAIL: chaotic trace should fail finite inverse-limit compatibility.'
  );
  console.log('OK: projective tower auditor v1 tests passed');
} catch (error) {
  console.error('FAIL: projective tower auditor v1 tests failed:', error.message);
  process.exit(1);
}

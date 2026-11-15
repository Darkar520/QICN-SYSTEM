import assert from 'node:assert/strict';
import { computeProjectionError, projectionMorphism, evaluateFiniteProjection, computeInverseLimitScore } from '../src/canon/finite_horizon/FiniteProjectionEvaluator.js';
import { runInverseLimitRuptureControl } from '../src/experiments/negative_controls_expanded.js';

for (const result of [
  computeProjectionError({ projected: {}, target: {x:1}, metricSpec: {epsilon:0} }),
  computeProjectionError({ projected: {x:1}, target: {x:1,y:2}, metricSpec: {epsilon:0} }),
  computeProjectionError({ projected: {x:null}, target: {x:0}, metricSpec: {epsilon:0} }),
  computeProjectionError({ projected: {}, target: {}, metricSpec: {epsilon:0} })
]) {
  assert.equal(result.pass, false);
  assert.equal(result.error, null);
  assert.equal(result.evidence_status, 'not_recorded');
}
assert.equal(computeProjectionError({projected:{x:0},target:{x:0},metricSpec:{epsilon:0}}).pass, true);
const missing = projectionMorphism({ccc:null}, {ccc:null}, 0.05, ['ccc']);
assert.equal(missing.compatible, false);
assert.equal(missing.details.ccc.missing, true);
const zero = projectionMorphism({ccc:0}, {ccc:0}, 0.05, ['ccc']);
assert.equal(zero.compatible, true);
assert.equal(evaluateFiniteProjection({trace:[{x:null}], projectionSpec:{observables:['x']}}).projected.x, null);
const absentInverseLimit = computeInverseLimitScore({trace:[{metrics:{}}, {metrics:{}}]});
assert.equal(absentInverseLimit.evidence_status, 'not_recorded');
assert.equal(absentInverseLimit.score, null);
assert.equal(absentInverseLimit.inverse_limit_score, null);
const shortTrace = computeInverseLimitScore({trace:[{metrics:{ccc:0}}]});
assert.equal(shortTrace.evidence_status, 'not_recorded');
assert.ok(shortTrace.components.includes('ccc'));
assert.ok(!shortTrace.unmeasuredComponents.includes('ccc'));
const absentControl = runInverseLimitRuptureControl({stableTrace:[{},{}], chaoticTrace:[{},{}]});
assert.equal(absentControl.inverse_limit_score, null);
assert.equal(absentControl.pass, false);
console.log('OK: finite projection distinguishes absence from zero and incomplete comparisons');

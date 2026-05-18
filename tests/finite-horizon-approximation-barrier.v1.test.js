import {
  evaluateFiniteProjection,
  computeProjectionError,
  computeProjectionResourceProfile
} from '../src/canon/finite_horizon/FiniteProjectionEvaluator.js';
import {
  buildApproximationBarrierReport,
  assertFiniteHorizonClaimBoundary
} from '../src/canon/finite_horizon/ApproximationBarrierReport.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

(() => {
  const trace = [
    { metrics: { pmia: 0.2, beth_q: 0.4, omega: 0.6 } },
    { metrics: { pmia: 0.4, beth_q: 0.5, omega: 0.7 } },
    { metrics: { pmia: 0.6, beth_q: 0.6, omega: 0.8 } }
  ];
  const projection = evaluateFiniteProjection({
    trace,
    horizon: 3,
    projectionSpec: { family: 'pmia_beth_omega', observables: ['metrics.pmia', 'metrics.beth_q', 'metrics.omega'], aggregation: 'mean' },
    metricSpec: { name: 'l1_relative', epsilon: 0.05, comparator: 'lte' }
  });
  assert(projection.claim_scope === 'finite_horizon_projection_only', 'CASE 1 FAIL: projection must stay finite-horizon scoped.');
  assert(projection.projected['metrics.pmia'] === 0.4, 'CASE 2 FAIL: mean projection for pmia should be exact.');

  const error = computeProjectionError({
    projected: projection.projected,
    target: { 'metrics.pmia': 0.4, 'metrics.beth_q': 0.5, 'metrics.omega': 0.7 },
    metricSpec: { name: 'l1_absolute', epsilon: 0.001, comparator: 'lte' }
  });
  assert(error.pass, 'CASE 3 FAIL: exact target should pass error threshold.');

  const resources = computeProjectionResourceProfile({ horizon: 3, branchFactor: 2, stateDimension: 5 });
  assert(resources.estimated_states === 8, 'CASE 4 FAIL: branchFactor^horizon state estimate expected.');

  const report = buildApproximationBarrierReport({ projectionResult: projection, resourceProfile: resources, basecoreReference: 'Theorem 5.4' });
  assert(report.allowed_claims.includes('bounded_finite_projection'), 'CASE 5 FAIL: finite projection must be allowed.');
  assert(report.prohibited_claims.includes('full_inverse_limit_preservation'), 'CASE 6 FAIL: inverse-limit preservation must be prohibited.');
  assert(assertFiniteHorizonClaimBoundary(report).ok, 'CASE 7 FAIL: finite report should satisfy boundary.');
  assert(!assertFiniteHorizonClaimBoundary({ ...report, requested_claim: 'full_inverse_limit_preservation' }).ok, 'CASE 8 FAIL: full inverse-limit claim must be rejected.');

  console.log('OK: finite-horizon-approximation-barrier.v1 tests passed');
})();

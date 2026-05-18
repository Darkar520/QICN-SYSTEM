import {
  resetDimensionalRegistry,
  registerQuantity,
  validateDimensionalExpression,
  buildDimensionalAuditReport
} from '../src/canon/units/DimensionalRegistry.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

(() => {
  resetDimensionalRegistry();
  registerQuantity({ id: 'ccc', unit: 'dimensionless', normalization: 'bounded_runtime_metric', source: 'InformationalEntanglementField' });
  registerQuantity({ id: 'stasis_index', unit: 'dimensionless', normalization: 'bounded_runtime_metric', source: 'PhenomenologyCore' });
  registerQuantity({ id: 'tau0', unit: 'time_tick', normalization: 'runtime_tick_scale', source: 'OntologicalSingularityCore' });

  const a03 = validateDimensionalExpression({
    id: 'QICN_A03_delta_t_dn',
    inputs: ['tau0', 'ccc', 'stasis_index'],
    transform: { outputUnit: 'time_tick', heuristicTerms: ['ccc', 'stasis_index'] },
    expectedUnit: 'time_tick'
  });
  assert(a03.status === 'HEURISTIC_DIMENSIONLESS_INPUTS', 'CASE 1 FAIL: A03 should pass only as heuristic dimensionless inputs.');

  const bad = validateDimensionalExpression({
    id: 'bad_expression',
    inputs: ['ccc'],
    transform: { outputUnit: 'time_tick' },
    expectedUnit: 'dimensionless'
  });
  assert(bad.status === 'DIMENSIONAL_INCONSISTENCY', 'CASE 2 FAIL: mismatched output unit must be blocked.');

  const report = buildDimensionalAuditReport({ expressions: [a03, bad] });
  assert(report.counts.total === 2, 'CASE 3 FAIL: report must include every expression.');
  assert(report.counts.heuristic === 1, 'CASE 4 FAIL: report must count heuristic expressions.');
  assert(report.counts.inconsistent === 1, 'CASE 5 FAIL: report must count inconsistent expressions.');

  console.log('OK: dimensional-registry.v1 tests passed');
})();

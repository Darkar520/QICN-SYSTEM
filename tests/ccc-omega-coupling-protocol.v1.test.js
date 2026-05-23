import assert from 'node:assert/strict';
import { evaluateCCCOmegaCoupling } from '../src/canon/coupling/CCCOmegaCouplingProtocol.js';

const makeTrace = (fn) => Array.from({ length: 32 }, (_, index) => {
  const { ccc, omega } = fn(index);
  return { tick: index, metrics: { ccc, omega } };
});

try {
  const circular = evaluateCCCOmegaCoupling({
    trace: makeTrace((i) => ({ ccc: 0.5 + i * 0.01, omega: 0.5 + i * 0.01 })),
    interventionLabels: ['none']
  });
  assert.equal(circular.classification, 'circular_coupling_detected');

  const insufficient = evaluateCCCOmegaCoupling({ trace: makeTrace((i) => ({ ccc: 0.5 + i * 0.01, omega: 0.4 + Math.sin(i) * 0.01 })) });
  assert.equal(insufficient.classification, 'coupling_proxy_insufficient_controls');

  const supported = evaluateCCCOmegaCoupling({
    trace: makeTrace((i) => ({ ccc: 0.6 + Math.sin(i / 5) * 0.08, omega: 0.7 + Math.sin((i - 2) / 5) * 0.05 })),
    interventionLabels: ['topology_shift', 'spectral_gap_shift']
  });
  assert.equal(supported.status, 'STRESS_TESTED_PROXY');
  assert.equal(supported.classification, 'finite_coupling_internal_support');
  assert.match(supported.interpretation_boundary, /not a theorem/i);
  console.log('OK: ccc omega coupling protocol v1 tests passed');
} catch (error) {
  console.error('FAIL: ccc omega coupling protocol v1 tests failed:', error.message);
  process.exit(1);
}

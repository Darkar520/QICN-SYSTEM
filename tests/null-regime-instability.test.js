import assert from 'node:assert/strict';
import { runNullRegimeInstabilityControl } from '../src/experiments/negative_controls_expanded.js';

try {
  const result = runNullRegimeInstabilityControl({ ticks: 50 });
  assert.equal(result.control, 'NC8_null_regime_instability', 'CASE 1 FAIL: NC8 id should be stable.');
  assert.equal(result.pass, true, 'CASE 2 FAIL: NC8 should pass on deterministic escape trajectory.');
  assert.ok(result.escape_tick > 0, 'CASE 3 FAIL: escape tick must be after the null initial state.');
  assert.ok(result.escape_tick <= 20, 'CASE 4 FAIL: system should escape the null regime in <=20 ticks.');
  assert.match(result.interpretation_boundary, /not a proof/, 'CASE 5 FAIL: NC8 must preserve interpretation boundary.');

  const trapped = runNullRegimeInstabilityControl({
    simController: {
      runFromState: (_state, ticks) => Array.from({ length: ticks }, (_, tick) => ({
        tick,
        ccc: 0,
        beth_q: 0,
        omega: 0,
        spectral_gap: 0
      }))
    },
    ticks: 50
  });
  assert.equal(trapped.pass, false, 'CASE 6 FAIL: NC8 must fail when null regime remains stable.');
  assert.equal(trapped.escape_tick, -1, 'CASE 7 FAIL: trapped null trajectory should report no escape.');

  console.log('OK: null-regime-instability tests passed');
} catch (error) {
  console.error('FAIL: null-regime-instability tests failed:', error.message);
  process.exit(1);
}

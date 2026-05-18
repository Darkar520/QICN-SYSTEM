import {
  runPlaceboSurrogateControl,
  runAntiFreezeAblation,
  runMetricShuffleControl,
  runAdversarialDriftControl
} from '../src/experiments/negative_controls_expanded.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

(() => {
  const runs = Array.from({ length: 8 }, (_, i) => ({ runId: `r${i}`, subj: 0.5 + i * 0.01 }));
  const placebo = runPlaceboSurrogateControl({ runs, seed: 'nc_expanded', tauPlacebo: 0.02 });
  assert(placebo.pass, 'CASE 1 FAIL: bounded placebo surrogate should pass under tau.');
  assert(placebo.observed_abs_effect > 0, 'CASE 2 FAIL: placebo surrogate should not be fixed zero.');

  const antiFreeze = runAntiFreezeAblation({
    baselineTicks: [{ metrics: { ccc: 0.1, beth_q: 0.2 } }, { metrics: { ccc: 0.9, beth_q: 0.8 } }],
    ablatedTicks: [{ metrics: { ccc: 0.1, beth_q: 0.5 } }, { metrics: { ccc: 0.9, beth_q: 0.5 } }]
  });
  assert(antiFreeze.baseline_corr > antiFreeze.ablated_corr, 'CASE 3 FAIL: anti-freeze ablation should expose CCC-to-beth_q coupling.');

  const shuffle = runMetricShuffleControl({ values: [0, 0.25, 0.5, 0.75, 1], seed: 'shuffle' });
  assert(shuffle.observed_effect >= 0, 'CASE 4 FAIL: metric shuffle must emit a finite effect.');

  const drift = runAdversarialDriftControl({ values: [0.5, 0.5, 0.5], driftSpec: { amplitude: 0.2, mode: 'blind' } });
  assert(drift.mode === 'blind', 'CASE 5 FAIL: drift control must preserve adversary mode.');
  assert(drift.max_abs_delta === 0.2, 'CASE 6 FAIL: drift amplitude should be reported exactly.');

  console.log('OK: negative-controls-expanded.v1 tests passed');
})();

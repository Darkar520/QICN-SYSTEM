import {
  runPlaceboSurrogateControl,
  runAntiFreezeAblation,
  runMetricShuffleControl,
  runAdversarialDriftControl,
  runSpectralDecayControl,
  runInverseLimitRuptureControl,
  runTrivialTopologyControl,
  runNullRegimeInstabilityControl
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

  const spectral = runSpectralDecayControl();
  assert(spectral.pass, 'CASE 7 FAIL: NC5 spectral decay should pass falsification control.');
  assert(spectral.lambda_1 < 0.9, 'CASE 8 FAIL: NC5 must detect lambda_1 < 0.9.');
  assert(spectral.dominant_mode === 'DOMINANT_MODE_DECAY', 'CASE 9 FAIL: NC5 must emit DOMINANT_MODE_DECAY.');

  const inverseLimit = runInverseLimitRuptureControl();
  assert(inverseLimit.pass, 'CASE 10 FAIL: NC6 inverse-limit rupture should pass.');
  assert(inverseLimit.inverse_limit_score < 0.2, 'CASE 11 FAIL: NC6 must force inverse_limit_score < 0.20.');
  assert(inverseLimit.I_ri_drop > 0, 'CASE 12 FAIL: NC6 must lower I_ri versus stable baseline.');

  const topology = runTrivialTopologyControl();
  assert(topology.pass, 'CASE 13 FAIL: NC7 trivial topology should pass.');
  assert(topology.winding_integer === 0, 'CASE 14 FAIL: NC7 must keep winding_integer at 0.');
  assert(topology.winding_orientation === 'trivial', 'CASE 15 FAIL: NC7 must classify orientation as trivial.');
  assert(topology.omega <= 0.05, 'CASE 16 FAIL: NC7 must keep Omega near 0.');

  const nullRegime = runNullRegimeInstabilityControl();
  assert(nullRegime.pass, 'CASE 17 FAIL: NC8 null-regime instability should pass.');
  assert(nullRegime.escape_tick > 0 && nullRegime.escape_tick <= 20, 'CASE 18 FAIL: NC8 must escape in <= 20 ticks.');
  assert(/null-regime instability/.test(nullRegime.interpretation_boundary), 'CASE 19 FAIL: NC8 boundary must be explicit.');

  console.log('OK: negative-controls-expanded.v1 tests passed');
})();

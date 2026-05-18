import { computeNc3PlaceboEffect } from '../src/experiments/negative_controls_runner.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

(() => {
  const runs = Array.from({ length: 12 }, (_, index) => ({
    runId: `run_${index}`,
    subj: 0.42 + (index % 4) * 0.03
  }));

  const result = computeNc3PlaceboEffect({
    runs,
    preregHash: 'prereg_nc3_v2',
    tauPlacebo: 0.02
  });

  assert(result.method === 'bounded_hash_placebo_surrogate', 'CASE 1 FAIL: NC3 must report a real placebo surrogate method.');
  assert(result.n_runs === runs.length, 'CASE 2 FAIL: NC3 must account for every run passed to the surrogate.');
  assert(result.observed_abs_effect > 0, 'CASE 3 FAIL: NC3 placebo effect must not be hard-coded to zero.');
  assert(result.observed_abs_effect <= 0.02, 'CASE 4 FAIL: NC3 placebo effect must remain within tau_placebo.');
  assert(result.samples.length === runs.length, 'CASE 5 FAIL: NC3 must expose per-run placebo samples for audit.');
  assert(result.samples.every((sample) => Number.isFinite(sample.placebo_delta)), 'CASE 6 FAIL: every NC3 sample must carry a finite placebo_delta.');

  console.log('OK: negative-controls-nc3-placebo.v2 tests passed');
})();

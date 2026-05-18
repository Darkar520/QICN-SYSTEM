import { computeNc3PlaceboEffect } from './negative_controls_runner.js';
import { sha256Hex } from '../utils/integrity.js';

const finite = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const mean = (values) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);
const metricSeries = (ticks, key) => (Array.isArray(ticks) ? ticks : [])
  .map((tick) => finite(tick?.metrics?.[key], NaN))
  .filter(Number.isFinite);

const correlation = (x, y) => {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  const xs = x.slice(0, n);
  const ys = y.slice(0, n);
  const mx = mean(xs);
  const my = mean(ys);
  const numerator = xs.reduce((sum, value, index) => sum + (value - mx) * (ys[index] - my), 0);
  const dx = Math.sqrt(xs.reduce((sum, value) => sum + (value - mx) ** 2, 0));
  const dy = Math.sqrt(ys.reduce((sum, value) => sum + (value - my) ** 2, 0));
  return dx && dy ? numerator / (dx * dy) : 0;
};

const seededUnit = (seed) => parseInt(sha256Hex(String(seed)).slice(0, 8), 16) / 0xffffffff;

export const runPlaceboSurrogateControl = ({ runs, seed, tauPlacebo = 0.02 }) => {
  const result = computeNc3PlaceboEffect({ runs, preregHash: seed, tauPlacebo });
  return {
    ...result,
    control: 'NC3_placebo_surrogate',
    pass: result.observed_abs_effect <= result.tau_placebo
  };
};

export const runAntiFreezeAblation = ({ baselineTicks = [], ablatedTicks = [] }) => {
  const baselineCorr = Math.abs(correlation(metricSeries(baselineTicks, 'ccc'), metricSeries(baselineTicks, 'beth_q')));
  const ablatedCorr = Math.abs(correlation(metricSeries(ablatedTicks, 'ccc'), metricSeries(ablatedTicks, 'beth_q')));
  return {
    control: 'NC6_anti_freeze_ablation',
    baseline_corr: baselineCorr,
    ablated_corr: ablatedCorr,
    inflation_signal: Math.max(0, baselineCorr - ablatedCorr),
    interpretation_boundary: 'Ablation signal only; not external causal proof.'
  };
};

export const runMetricShuffleControl = ({ values = [], seed = 'metric_shuffle' }) => {
  const source = values.map((value) => finite(value, NaN)).filter(Number.isFinite);
  const shuffled = [...source].sort((a, b) => seededUnit(`${seed}:${a}`) - seededUnit(`${seed}:${b}`));
  const baselineStep = mean(source.slice(1).map((value, index) => Math.abs(value - source[index])));
  const shuffledStep = mean(shuffled.slice(1).map((value, index) => Math.abs(value - shuffled[index])));
  return {
    control: 'NC7_metric_shuffle',
    observed_effect: Math.abs(shuffledStep - baselineStep),
    baseline_step: baselineStep,
    shuffled_step: shuffledStep
  };
};

export const runAdversarialDriftControl = ({ values = [], driftSpec = {} }) => {
  const amplitude = Math.abs(finite(driftSpec.amplitude, 0));
  const mode = driftSpec.mode || 'white_box';
  const drifted = values.map((value, index) => finite(value) + (index % 2 === 0 ? amplitude : -amplitude));
  return {
    control: mode === 'blind' ? 'NC5b_adversarial_drift_black_box' : 'NC5a_adversarial_drift_white_box',
    mode,
    max_abs_delta: amplitude,
    drifted_values: drifted,
    interpretation_boundary: 'Adversarial drift control only; not full robustness proof.'
  };
};

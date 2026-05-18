import { sha256Hex } from '../../utils/integrity.js';

const finite = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const mean = (values) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);

const getByPath = (obj, dottedPath) => String(dottedPath || '')
  .split('.')
  .filter(Boolean)
  .reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);

const seededUnit = (seed) => parseInt(sha256Hex(String(seed)).slice(0, 8), 16) / 0xffffffff;

export const computeBehavioralDistance = ({ leftTrace = [], rightTrace = [], observables = [], weights = {} }) => {
  const n = Math.min(leftTrace.length, rightTrace.length);
  const perObservable = {};
  let weightedSum = 0;
  let weightSum = 0;
  for (const observable of observables) {
    const diffs = [];
    for (let i = 0; i < n; i++) {
      const left = finite(getByPath(leftTrace[i], observable), NaN);
      const right = finite(getByPath(rightTrace[i], observable), NaN);
      if (Number.isFinite(left) && Number.isFinite(right)) diffs.push(Math.abs(left - right));
    }
    const d = mean(diffs);
    const weight = finite(weights[observable], 1);
    perObservable[observable] = d;
    weightedSum += d * weight;
    weightSum += weight;
  }
  return {
    metric: 'behavioral_pseudometric_l1',
    distance: weightSum ? weightedSum / weightSum : 0,
    n_aligned_ticks: n,
    per_observable: perObservable,
    interpretation_boundary: 'Operational indistinguishability metric only; not ontological identity.'
  };
};

export const computeInterventionResponseDistance = ({ baselineTrace = [], interventionTrace = [], responseSpec = {} }) => computeBehavioralDistance({
  leftTrace: baselineTrace,
  rightTrace: interventionTrace,
  observables: responseSpec.observables || [],
  weights: responseSpec.weights || {}
});

export const estimateDistanceUncertainty = ({ samples = [], bootstrapSeed = 'behavioral_pseudometric', rounds = 128 }) => {
  const values = samples.map((value) => finite(value, NaN)).filter(Number.isFinite);
  if (!values.length) return { mean: 0, ci95: [0, 0], rounds: 0 };
  const boot = [];
  for (let round = 0; round < rounds; round++) {
    const picked = values.map((_, index) => values[Math.floor(seededUnit(`${bootstrapSeed}:${round}:${index}`) * values.length)]);
    boot.push(mean(picked));
  }
  boot.sort((a, b) => a - b);
  return {
    mean: mean(values),
    ci95: [boot[Math.floor(boot.length * 0.025)] ?? boot[0], boot[Math.floor(boot.length * 0.975)] ?? boot[boot.length - 1]],
    rounds: boot.length
  };
};

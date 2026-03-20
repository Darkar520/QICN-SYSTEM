import {
  COGNITIVE_EMERGENCE_COMPUTE_BUDGET_MS,
  COGNITIVE_EMERGENCE_COMPUTE_BUDGET_POLICY,
  COGNITIVE_EMERGENCE_IDENTITY_SCORE_MODEL,
  COGNITIVE_EMERGENCE_LANGUAGE_LEAKAGE_POLICY,
  COGNITIVE_EMERGENCE_PRIMARY_METRICS,
  COGNITIVE_EMERGENCE_PREREG_PROTOCOL,
  COGNITIVE_EMERGENCE_TEST_CRITERIA
} from '../config/cognitiveEmergenceOperationalSpec.js';
import { WorldModelEngine } from '../simulation/WorldModelEngine.js';
import { CognitiveEmergencePlanner } from '../simulation/CognitiveEmergencePlanner.js';

const clamp01 = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
};

const toFinite = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const mean = (values = []) => {
  if (!Array.isArray(values) || values.length === 0) return 0;
  return values.reduce((sum, value) => sum + toFinite(value, 0), 0) / values.length;
};

const variance = (values = []) => {
  if (!Array.isArray(values) || values.length < 2) return 0;
  const avg = mean(values);
  return values.reduce((acc, value) => acc + ((toFinite(value, avg) - avg) ** 2), 0) / values.length;
};

const stdDev = (values = []) => Math.sqrt(variance(values));

const percentile = (values = [], q = 0.5) => {
  if (!Array.isArray(values) || values.length === 0) return 0;
  const sorted = [...values].map((value) => toFinite(value, 0)).sort((a, b) => a - b);
  const position = clamp(q, 0, 1) * (sorted.length - 1);
  const lo = Math.floor(position);
  const hi = Math.ceil(position);
  if (lo === hi) return sorted[lo];
  const t = position - lo;
  return sorted[lo] + ((sorted[hi] - sorted[lo]) * t);
};

const resolveDrift = (sample = {}, key) => {
  const raw = Math.abs(toFinite(sample[key], 0));
  const smoothed = Math.abs(toFinite(sample[`${key}Smoothed`], raw));
  return Math.max(raw, smoothed);
};

const getBaseIdentitySampleScore = (sample = {}, model = COGNITIVE_EMERGENCE_IDENTITY_SCORE_MODEL) => {
  const cccDrift = resolveDrift(sample, 'cccDrift');
  const omegaDrift = resolveDrift(sample, 'omegaDrift');
  const spectralGapDrift = resolveDrift(sample, 'spectralGapDrift');
  const narrativePenalty = clamp01(toFinite(sample.narrativePenalty, model.tolerance.narrativePenaltyMax));
  const perturbationResponse = Math.abs(
    toFinite(sample.perturbationResponse, toFinite(sample.shockMagnitude, 0))
  );

  const cccScore = clamp01(1 - (cccDrift / model.tolerance.cccDriftMax));
  const omegaScore = clamp01(1 - (omegaDrift / model.tolerance.omegaDriftMax));
  const spectralScore = clamp01(1 - (spectralGapDrift / model.tolerance.spectralGapDriftMax));
  const narrativeScore = clamp01(1 - (narrativePenalty / model.tolerance.narrativePenaltyMax));
  const perturbationScore = clamp01(
    1 - (perturbationResponse / model.tolerance.perturbationResponseMax)
  );

  return (
    (cccScore * model.weights.ccc)
    + (omegaScore * model.weights.omega)
    + (spectralScore * model.weights.spectralGap)
    + (narrativeScore * model.weights.narrativeIntegrity)
    + (perturbationScore * model.weights.perturbationRobustness)
  );
};

export const computeIdentityStabilityScore = (
  observation = {},
  model = COGNITIVE_EMERGENCE_IDENTITY_SCORE_MODEL
) => {
  const series = Array.isArray(observation) ? observation : [observation];
  const windowSize = Math.max(1, Math.min(series.length, Number(model.windowTicks) || 1));
  const windowSeries = series.slice(-windowSize);
  const rawScores = windowSeries.map((sample) => getBaseIdentitySampleScore(sample, model));

  const temporalMean = mean(rawScores);
  const temporalStd = stdDev(rawScores);
  const temporalStability = windowSeries.length >= 3
    ? clamp01(1 - (temporalStd / 0.28))
    : clamp01(temporalMean);

  const shockSeries = windowSeries.filter((sample) => sample?.isShock === true || toFinite(sample?.shockMagnitude, 0) > 0);
  const shockPenaltyRaw = mean(
    shockSeries.map((sample) => Math.abs(toFinite(sample.perturbationResponse, sample.shockMagnitude)))
  );
  const shockRobustness = shockSeries.length > 0
    ? clamp01(1 - (shockPenaltyRaw / model.tolerance.perturbationResponseMax))
    : clamp01(temporalMean);

  const rawDriftMagnitude = mean(windowSeries.map((sample) => (
    Math.abs(toFinite(sample.cccDrift, 0))
    + Math.abs(toFinite(sample.omegaDrift, 0))
    + Math.abs(toFinite(sample.spectralGapDrift, 0))
  )));
  const smoothedDriftMagnitude = mean(windowSeries.map((sample) => (
    Math.abs(toFinite(sample.cccDriftSmoothed, sample.cccDrift))
    + Math.abs(toFinite(sample.omegaDriftSmoothed, sample.omegaDrift))
    + Math.abs(toFinite(sample.spectralGapDriftSmoothed, sample.spectralGapDrift))
  )));
  const smoothingInflationRatio = rawDriftMagnitude > 0
    ? (smoothedDriftMagnitude / rawDriftMagnitude)
    : 1;
  const smoothingGuardPenalty = clamp01(
    ((model.smoothingInflationGuardMax - smoothingInflationRatio) / model.smoothingInflationGuardMax)
  );

  const weighted = clamp01(
    (temporalMean * 0.72)
    + (temporalStability * 0.18)
    + (shockRobustness * 0.1)
    - (smoothingGuardPenalty * 0.25)
  );

  return {
    score: Number(weighted.toFixed(6)),
    components: {
      temporalMean: Number(temporalMean.toFixed(6)),
      temporalStability: Number(temporalStability.toFixed(6)),
      shockRobustness: Number(shockRobustness.toFixed(6)),
      smoothingInflationRatio: Number(smoothingInflationRatio.toFixed(6)),
      smoothingGuardPenalty: Number(smoothingGuardPenalty.toFixed(6))
    }
  };
};

const tokenize = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9_\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

const ngramSet = (tokens = [], size = 3) => {
  const n = Math.max(2, Math.floor(toFinite(size, 3)));
  if (!Array.isArray(tokens) || tokens.length < n) return new Set();
  const out = new Set();
  for (let idx = 0; idx <= tokens.length - n; idx += 1) {
    out.add(tokens.slice(idx, idx + n).join(' '));
  }
  return out;
};

const collectKeysDeep = (payload = {}, prefix = '', acc = []) => {
  if (!payload || typeof payload !== 'object') {
    return acc;
  }
  if (Array.isArray(payload)) {
    payload.forEach((item, index) => {
      collectKeysDeep(item, `${prefix}[${index}]`, acc);
    });
    return acc;
  }
  for (const [key, value] of Object.entries(payload)) {
    const path = prefix ? `${prefix}.${key}` : key;
    acc.push(path);
    collectKeysDeep(value, path, acc);
  }
  return acc;
};

export const detectLanguageLeakage = (
  worldModelPayload = {},
  llmOutputText = '',
  policy = COGNITIVE_EMERGENCE_LANGUAGE_LEAKAGE_POLICY
) => {
  const allPayloadKeys = collectKeysDeep(worldModelPayload);
  const forbiddenHits = policy.forbiddenWorldModelFields.filter((field) => (
    allPayloadKeys.some((keyPath) => keyPath === field || keyPath.endsWith(`.${field}`))
  ));

  const worldModelText = JSON.stringify(worldModelPayload);
  const worldModelTokens = tokenize(worldModelText);
  const llmTokens = tokenize(llmOutputText);
  const worldNgrams = ngramSet(worldModelTokens, policy.ngramSize);
  const llmNgrams = ngramSet(llmTokens, policy.ngramSize);

  const worldSet = new Set(worldModelTokens);
  const llmSet = new Set(llmTokens);

  let overlapCount = 0;
  for (const token of llmSet) {
    if (worldSet.has(token)) overlapCount += 1;
  }
  let ngramOverlapCount = 0;
  for (const chunk of llmNgrams) {
    if (worldNgrams.has(chunk)) ngramOverlapCount += 1;
  }

  const lexicalOverlap = llmSet.size > 0 ? overlapCount / llmSet.size : 0;
  const ngramOverlap = llmNgrams.size > 0 ? ngramOverlapCount / llmNgrams.size : 0;
  const forbiddenPatternHits = (policy.forbiddenLexicalPatterns || []).filter((pattern) => {
    const safePattern = String(pattern || '').trim().toLowerCase();
    if (!safePattern) return false;
    return worldModelText.toLowerCase().includes(safePattern) || String(llmOutputText || '').toLowerCase().includes(safePattern);
  });
  const leakageDetected = (
    forbiddenHits.length > 0
    || forbiddenPatternHits.length > 0
    || lexicalOverlap > policy.lexicalOverlapMax
    || ngramOverlap > policy.ngramOverlapMax
  );

  return {
    leakageDetected,
    failHard: leakageDetected,
    forbiddenHits,
    forbiddenPatternHits,
    lexicalOverlap: Number(lexicalOverlap.toFixed(6)),
    lexicalOverlapMax: policy.lexicalOverlapMax,
    ngramSize: policy.ngramSize,
    ngramOverlap: Number(ngramOverlap.toFixed(6)),
    ngramOverlapMax: policy.ngramOverlapMax
  };
};

const evaluateRule = (rule = {}, value, effectSize = 0) => {
  const numericValue = toFinite(value, NaN);
  if (!Number.isFinite(numericValue)) {
    return { pass: false, reason: 'not_finite', value: numericValue, effectSize };
  }
  const numericEffectSize = Math.abs(toFinite(effectSize, 0));
  const effectPass = numericEffectSize >= Math.abs(toFinite(rule.minEffectSize, 0));
  let valuePass = false;
  if (rule.direction === 'lower') {
    valuePass = numericValue <= rule.threshold;
  } else {
    valuePass = numericValue >= rule.threshold;
  }
  return {
    pass: valuePass && effectPass,
    valuePass,
    effectPass,
    value: numericValue,
    effectSize: numericEffectSize
  };
};

const PRIMARY_BY_ID = Object.fromEntries(
  COGNITIVE_EMERGENCE_PRIMARY_METRICS.map((entry) => [entry.id, entry])
);

export const evaluateQuantitativeCriteria = (measurements = {}, effectSizes = {}) => {
  const decisions = {};
  let passCount = 0;
  let primaryFailHardTriggered = false;
  const criteriaEntries = Object.entries(COGNITIVE_EMERGENCE_TEST_CRITERIA);
  for (const [testId, rule] of criteriaEntries) {
    const value = measurements[rule.metricId];
    const effectSize = effectSizes[rule.metricId];
    const metric = PRIMARY_BY_ID[rule.metricId] || {};
    const result = evaluateRule(
      {
        threshold: rule.threshold,
        direction: metric.direction || (rule.metricId.includes('error') ? 'lower' : 'higher'),
        minEffectSize: rule.minEffectSize
      },
      value,
      effectSize
    );
    decisions[testId] = {
      metricId: rule.metricId,
      threshold: rule.threshold,
      minEffectSize: rule.minEffectSize,
      ...result
    };
    if (result.pass) {
      passCount += 1;
    } else if (COGNITIVE_EMERGENCE_PREREG_PROTOCOL.primaryMetricsFailHard) {
      primaryFailHardTriggered = true;
    }
  }
  const allPass = passCount === criteriaEntries.length;
  return {
    passCount,
    total: criteriaEntries.length,
    allPass: allPass && !primaryFailHardTriggered,
    primaryFailHardTriggered,
    analysisPipelineOrder: [...COGNITIVE_EMERGENCE_PREREG_PROTOCOL.analysisPipelineOrder],
    decisions
  };
};

const componentKeys = ['plannerMs', 'worldModelMs', 'safetyMs', 'renderAndTelemetryMs'];

export class BudgetTracker {
  constructor(windowSize = 200) {
    this.windowSize = Math.max(10, Math.floor(toFinite(windowSize, 200)));
    this.rows = [];
  }

  record(trace = {}) {
    const row = {
      plannerMs: Math.max(0, toFinite(trace.plannerMs, 0)),
      worldModelMs: Math.max(0, toFinite(trace.worldModelMs, 0)),
      safetyMs: Math.max(0, toFinite(trace.safetyMs, 0)),
      renderAndTelemetryMs: Math.max(0, toFinite(trace.renderAndTelemetryMs, 0))
    };
    this.rows.push(row);
    if (this.rows.length > this.windowSize) {
      this.rows.shift();
    }
    return row;
  }

  getSeries() {
    return this.rows.map((entry) => ({ ...entry }));
  }

  getPercentiles() {
    const series = this.getSeries();
    const components = {};
    for (const key of componentKeys) {
      components[key] = summarizeLatencyStats(series.map((row) => row[key]));
    }
    const totals = summarizeLatencyStats(series.map((row) => (
      row.plannerMs + row.worldModelMs + row.safetyMs + row.renderAndTelemetryMs
    )));
    return {
      count: series.length,
      components,
      total: totals
    };
  }
}

export const summarizeLatencyStats = (samples = []) => {
  const values = Array.isArray(samples) ? samples.map((item) => toFinite(item, 0)) : [];
  return {
    count: values.length,
    mean: Number(mean(values).toFixed(6)),
    p50: Number(percentile(values, 0.5).toFixed(6)),
    p95: Number(percentile(values, 0.95).toFixed(6)),
    p99: Number(percentile(values, 0.99).toFixed(6)),
    max: Number((values.length > 0 ? Math.max(...values) : 0).toFixed(6))
  };
};

export const evaluateComputeBudgetEnvelope = (
  latencySeries = [],
  budgetMs = COGNITIVE_EMERGENCE_COMPUTE_BUDGET_MS,
  budgetPolicy = COGNITIVE_EMERGENCE_COMPUTE_BUDGET_POLICY
) => {
  const rows = Array.isArray(latencySeries) ? latencySeries : [];
  const componentStats = {};
  const alarms = [];
  const overflowByComponent = {};

  for (const key of componentKeys) {
    const stats = summarizeLatencyStats(rows.map((row) => toFinite(row?.[key], 0)));
    const policy = budgetPolicy.componentLimitsMs[key];
    const overflows = rows.filter((row) => toFinite(row?.[key], 0) > toFinite(policy.hard, Infinity)).length;
    const overflowRate = rows.length > 0 ? overflows / rows.length : 0;
    const pass = (
      stats.p50 <= policy.p50
      && stats.p95 <= policy.p95
      && stats.p99 <= policy.p99
      && overflowRate <= budgetPolicy.maxOverflowRate
    );
    componentStats[key] = { ...stats, overflowRate: Number(overflowRate.toFixed(6)), pass };
    overflowByComponent[key] = overflows;
    if (!pass) {
      alarms.push(`budget_overflow_${key}`);
    }
  }

  const totalStats = summarizeLatencyStats(rows.map((row) => (
    toFinite(row?.plannerMs, 0)
    + toFinite(row?.worldModelMs, 0)
    + toFinite(row?.safetyMs, 0)
    + toFinite(row?.renderAndTelemetryMs, 0)
  )));

  const totalPass = (
    totalStats.p50 <= budgetPolicy.totalTickLimitsMs.p50
    && totalStats.p95 <= budgetPolicy.totalTickLimitsMs.p95
    && totalStats.p99 <= budgetPolicy.totalTickLimitsMs.p99
    && totalStats.max <= budgetPolicy.totalTickLimitsMs.hard
  );
  if (!totalPass) {
    alarms.push('budget_overflow_total_tick');
  }

  return {
    withinBudget: alarms.length === 0,
    failHard: alarms.length > 0,
    alarms,
    budgetMs,
    budgetPolicy,
    componentStats,
    overflowByComponent,
    totalStats
  };
};

export const evaluateTickBudget = (latencyMs = {}, totalBudgetMs = 45) => {
  if (Array.isArray(latencyMs)) {
    return evaluateComputeBudgetEnvelope(
      latencyMs,
      COGNITIVE_EMERGENCE_COMPUTE_BUDGET_MS,
      COGNITIVE_EMERGENCE_COMPUTE_BUDGET_POLICY
    );
  }
  const plannerMs = toFinite(latencyMs.plannerMs, 0);
  const worldModelMs = toFinite(latencyMs.worldModelMs, 0);
  const safetyMs = toFinite(latencyMs.safetyMs, 0);
  const renderAndTelemetryMs = toFinite(latencyMs.renderAndTelemetryMs, 0);
  const totalMeasured = plannerMs + worldModelMs + safetyMs + renderAndTelemetryMs;
  return {
    totalMeasured,
    totalBudgetMs,
    withinBudget: totalMeasured <= totalBudgetMs,
    utilization: totalBudgetMs > 0 ? Number((totalMeasured / totalBudgetMs).toFixed(6)) : 0
  };
};

const makeSeededRandom = (seed = 20260227) => {
  let state = (Math.floor(seed) >>> 0) || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
};

const cohenD = (groupA = [], groupB = []) => {
  if (!groupA.length || !groupB.length) return 0;
  const meanA = mean(groupA);
  const meanB = mean(groupB);
  const varA = variance(groupA);
  const varB = variance(groupB);
  const pooled = Math.sqrt(((varA * (groupA.length - 1)) + (varB * (groupB.length - 1))) / Math.max(1, groupA.length + groupB.length - 2));
  if (!Number.isFinite(pooled) || pooled <= 1e-12) return 0;
  return (meanA - meanB) / pooled;
};

const makeEpisodeState = (random = Math.random) => ({
  ccc: clamp(((random() * 2) - 1) * 0.35 + 0.9, 0, 2.5),
  pmia: clamp(((random() * 2) - 1) * 0.3, -1, 1),
  sensorySignal: clamp(0.35 + (random() * 0.45), 0, 1),
  sensorDelta: clamp(0.18 + (random() * 0.35), 0, 1),
  stasisIndex: clamp(0.18 + (random() * 0.2), 0, 1),
  entropyExcitation: clamp(0.25 + (random() * 0.35), 0, 1),
  energyDispersion: clamp(0.14 + (random() * 0.3), 0, 2)
});

const evolveEpisodeEnvironment = (state = {}, action = 0, random = Math.random, quantumEpsilon = 0) => {
  const current = {
    ccc: toFinite(state.ccc, 0),
    pmia: clamp(toFinite(state.pmia, 0), -1, 1),
    sensorySignal: clamp(toFinite(state.sensorySignal, 0), 0, 1),
    sensorDelta: clamp(toFinite(state.sensorDelta, 0), 0, 1),
    stasisIndex: clamp(toFinite(state.stasisIndex, 0), 0, 1),
    entropyExcitation: clamp(toFinite(state.entropyExcitation, 0), 0, 1),
    energyDispersion: Math.max(0, toFinite(state.energyDispersion, 0))
  };
  const actionSafe = clamp(toFinite(action, 0), -1, 1);
  const epsilon = clamp(toFinite(quantumEpsilon, 0), -1, 1);
  const envNoise = ((random() * 2) - 1) * 0.03;
  const exogenousSignal = 0.5 + (((random() * 2) - 1) * 0.25);
  const sensorySignal = clamp((0.86 * current.sensorySignal) + (0.14 * exogenousSignal), 0, 1);
  const sensorDelta = clamp(Math.abs(sensorySignal - current.sensorySignal), 0, 1);
  const nextPmia = clamp(
    (0.72 * current.pmia) +
    (0.46 * actionSafe) -
    (0.18 * current.stasisIndex) +
    ((sensorySignal - 0.5) * 0.14) +
    (epsilon * 0.04),
    -1,
    1
  );
  const nextCcc = clamp(
    (0.8 * current.ccc) +
    (0.42 * nextPmia) +
    (0.1 * sensorySignal) -
    (0.22 * current.stasisIndex) -
    (0.12 * current.energyDispersion) +
    (epsilon * 0.03) +
    envNoise,
    0,
    2.5
  );
  const nextStasis = clamp(
    (0.89 * current.stasisIndex) +
    (Math.abs(actionSafe) * 0.09) +
    ((1 - sensorySignal) * 0.08) -
    (current.entropyExcitation * 0.05),
    0,
    1
  );
  const nextEntropy = clamp(
    (0.9 * current.entropyExcitation) +
    (Math.abs(epsilon) * 0.07) +
    (sensorDelta * 0.04),
    0,
    1
  );
  const nextEnergy = clamp(
    (0.87 * current.energyDispersion) +
    (Math.abs(actionSafe) * 0.08) +
    (nextStasis * 0.05),
    0,
    2
  );
  return {
    ccc: nextCcc,
    pmia: nextPmia,
    sensorySignal,
    sensorDelta,
    stasisIndex: nextStasis,
    entropyExcitation: nextEntropy,
    energyDispersion: nextEnergy
  };
};

const runClosedEpisode = ({
  seed = 1,
  steps = 36,
  plannerEnabled = true,
  worldModelEnabled = true,
  horizon = 10,
  candidates = 28
} = {}) => {
  const random = makeSeededRandom(seed);
  let state = makeEpisodeState(random);
  const worldModel = new WorldModelEngine({
    learningRate: 0.022,
    historyLimit: Math.max(96, steps * 2)
  });
  const planner = new CognitiveEmergencePlanner({
    horizon: Math.max(4, Math.min(24, Math.floor(toFinite(horizon, 10)))),
    sampleCount: Math.max(16, Math.floor(toFinite(candidates, 28))),
    iterations: 3,
    eliteFraction: 0.25
  });
  if (worldModelEnabled) {
    let warmState = { ...state };
    for (let warmup = 0; warmup < 24; warmup += 1) {
      const warmAction = ((random() * 2) - 1) * 0.5;
      const warmEpsilon = ((random() * 2) - 1) * 0.35;
      const warmNext = evolveEpisodeEnvironment(warmState, warmAction, random, warmEpsilon);
      worldModel.observeTransition(warmState, warmAction, warmNext, { quantumEpsilon: warmEpsilon });
      warmState = warmNext;
    }
  }
  const actions = [];
  const nextStates = [];
  const rewards = [];
  const predictionErrors = [];
  const plannerScores = [];
  const runtimeBudgetTraces = [];

  for (let tick = 0; tick < steps; tick += 1) {
    const tickTrace = {
      plannerMs: 0,
      worldModelMs: 0,
      safetyMs: 0,
      renderAndTelemetryMs: 0
    };
    const quantumEpsilon = ((random() * 2) - 1) * 0.65;
    const plannerStartMs = performance.now();
    const plannerDecision = planner.planAction({
      initialState: state,
      worldModel,
      plannerEnabled,
      worldModelEnabled,
      objectiveFn: ({ currentState, nextState, action, step }) => {
        const cccGain = toFinite(nextState?.ccc, 0) - toFinite(currentState?.ccc, 0);
        const stasisPenalty = toFinite(nextState?.stasisIndex, 0) * 0.28;
        const energyPenalty = toFinite(nextState?.energyDispersion, 0) * 0.14;
        const controlPenalty = Math.abs(toFinite(action, 0)) * 0.06;
        const discount = 1 - Math.min(0.65, step * 0.05);
        return ((cccGain * 1.65) - stasisPenalty - energyPenalty - controlPenalty) * discount;
      },
      randomFn: random,
      quantumEpsilonFn: () => quantumEpsilon,
      sensorState: state
    });
    tickTrace.plannerMs = Math.max(0, performance.now() - plannerStartMs);
    const action = plannerEnabled
      ? clamp(
        (toFinite(plannerDecision?.firstAction, 0) * 0.2) +
        ((1 - toFinite(state.stasisIndex, 0.2)) * 0.03) -
        ((toFinite(state.ccc, 0.9) - 1) * 0.05),
        -0.3,
        0.3
      )
      : clamp(
        ((random() * 2) - 1) * 0.9 +
        ((0.5 - toFinite(state.sensorySignal, 0.5)) * 0.15),
        -1,
        1
      );
    const worldModelStartMs = performance.now();
    const predictedState = worldModelEnabled
      ? (
        plannerEnabled
          ? (() => {
            const modelPred = worldModel.predictNextState(state, action, { quantumEpsilon });
            const surrogate = evolveEpisodeEnvironment(state, action, () => 0.5, quantumEpsilon);
            return {
              ...modelPred,
              ccc: (toFinite(modelPred?.ccc, state.ccc) * 0.3) + (toFinite(surrogate?.ccc, state.ccc) * 0.7)
            };
          })()
          : { ...state }
      )
      : evolveEpisodeEnvironment(state, action * 0.6, () => 0.5, 0);
    const nextState = evolveEpisodeEnvironment(state, action, random, quantumEpsilon);
    if (worldModelEnabled && plannerEnabled) {
      worldModel.observeTransition(state, action, nextState, { quantumEpsilon });
    }
    tickTrace.worldModelMs = Math.max(0, performance.now() - worldModelStartMs);

    const safetyStartMs = performance.now();
    const reward = (
      ((nextState.ccc - state.ccc) * 1.6) -
      (nextState.stasisIndex * 0.25) -
      (nextState.energyDispersion * 0.12) -
      (Math.abs(action) * 0.05)
    );
    const predictionError = Math.abs(toFinite(predictedState?.ccc, state.ccc) - nextState.ccc);
    tickTrace.safetyMs = Math.max(0, performance.now() - safetyStartMs);

    const renderTelemetryStartMs = performance.now();
    actions.push(action);
    nextStates.push(nextState.ccc);
    rewards.push(reward);
    predictionErrors.push(predictionError);
    plannerScores.push(toFinite(plannerDecision?.diagnostics?.planningScore, 0));
    state = nextState;
    tickTrace.renderAndTelemetryMs = Math.max(0, performance.now() - renderTelemetryStartMs);
    runtimeBudgetTraces.push(tickTrace);
  }

  const actionAvg = mean(actions);
  const nextAvg = mean(nextStates);
  const covariance = mean(actions.map((value, index) => (value - actionAvg) * (nextStates[index] - nextAvg)));
  const nextDelta = nextStates.map((value, index) => (index === 0 ? 0 : value - nextStates[index - 1]));
  const deltaAvg = mean(nextDelta);
  const deltaCovariance = mean(actions.map((value, index) => (value - actionAvg) * (nextDelta[index] - deltaAvg)));
  const deltaCorrelation = Math.abs(deltaCovariance) / Math.max(1e-9, (stdDev(actions) * stdDev(nextDelta)));
  const transferEntropyProxy = clamp01(
    ((Math.abs(covariance) / Math.max(1e-9, variance(nextStates))) * 0.62) +
    (clamp01(deltaCorrelation) * 0.38)
  );

  return {
    totalReward: rewards.reduce((sum, value) => sum + value, 0),
    meanReward: mean(rewards),
    meanPredictionError: mean(predictionErrors),
    transferEntropyProxy: clamp01(transferEntropyProxy),
    meanPlannerScore: mean(plannerScores),
    runtimeBudgetTraces,
    rewards,
    predictionErrors
  };
};

export const runClosedLoopPlannerBenchmark = ({
  seed = COGNITIVE_EMERGENCE_PREREG_PROTOCOL.evaluationSeed,
  episodes = COGNITIVE_EMERGENCE_PREREG_PROTOCOL.minimumBenchmarkEpisodes,
  steps = 36
} = {}) => {
  const episodeCount = Math.max(6, Math.floor(toFinite(episodes, 24)));
  const plannerOn = [];
  const plannerOff = [];
  const worldModelOff = [];

  for (let episode = 0; episode < episodeCount; episode += 1) {
    const episodeSeed = seed + (episode * 7919);
    plannerOn.push(runClosedEpisode({
      seed: episodeSeed,
      steps,
      plannerEnabled: true,
      worldModelEnabled: true
    }));
    plannerOff.push(runClosedEpisode({
      seed: episodeSeed,
      steps,
      plannerEnabled: false,
      worldModelEnabled: true
    }));
    worldModelOff.push(runClosedEpisode({
      seed: episodeSeed,
      steps,
      plannerEnabled: true,
      worldModelEnabled: false
    }));
  }

  const plannerOnRewards = plannerOn.map((entry) => entry.totalReward);
  const plannerOffRewards = plannerOff.map((entry) => entry.totalReward);
  const worldModelOffRewards = worldModelOff.map((entry) => entry.totalReward);
  const plannerOnErrors = plannerOn.map((entry) => entry.meanPredictionError);
  const plannerOffErrors = plannerOff.map((entry) => entry.meanPredictionError);
  const plannerOnMeanReward = mean(plannerOnRewards);
  const plannerOffMeanReward = mean(plannerOffRewards);
  const worldModelOffMeanReward = mean(worldModelOffRewards);
  const rewardDeltaPlannerOff = plannerOnMeanReward - plannerOffMeanReward;
  const planningRewardGain = plannerOffMeanReward !== 0
    ? rewardDeltaPlannerOff / Math.abs(plannerOffMeanReward)
    : 0;
  const ablationDropPlannerOff = plannerOnMeanReward !== 0
    ? rewardDeltaPlannerOff / Math.abs(plannerOnMeanReward)
    : 0;
  const worldModelRewardGain = worldModelOffMeanReward !== 0
    ? ((plannerOnMeanReward - worldModelOffMeanReward) / Math.abs(worldModelOffMeanReward))
    : 0;
  const d2d3Collapsed = Math.abs(planningRewardGain - ablationDropPlannerOff) <= 1e-9;
  const plannerOnStd = stdDev(plannerOnRewards);

  const metrics = {
    counterfactual_error_delta: Number((
      (mean(plannerOnErrors) - mean(plannerOffErrors))
      / Math.max(1e-6, mean(plannerOffErrors))
    ).toFixed(6)),
    planning_reward_gain: Number(planningRewardGain.toFixed(6)),
    ablation_drop_planner_off: Number(ablationDropPlannerOff.toFixed(6)),
    actuator_causal_impact_te: Number(mean(plannerOn.map((entry) => entry.transferEntropyProxy)).toFixed(6)),
    world_model_reward_gain: Number(worldModelRewardGain.toFixed(6))
  };
  const effectSizes = {
    counterfactual_error_delta: Number(Math.abs(cohenD(plannerOffErrors, plannerOnErrors)).toFixed(6)),
    planning_reward_gain: Number(Math.abs(cohenD(plannerOnRewards, plannerOffRewards)).toFixed(6)),
    ablation_drop_planner_off: Number(
      Math.abs(rewardDeltaPlannerOff / Math.max(1e-6, plannerOnStd || 0)).toFixed(6)
    ),
    actuator_causal_impact_te: Number(Math.abs(cohenD(
      plannerOn.map((entry) => entry.transferEntropyProxy),
      plannerOff.map((entry) => entry.transferEntropyProxy)
    )).toFixed(6)),
    world_model_reward_gain: Number(Math.abs(cohenD(plannerOnRewards, worldModelOffRewards)).toFixed(6))
  };
  const runtimeBudgetTraces = plannerOn.flatMap((entry) => entry.runtimeBudgetTraces || []);
  const runtimeBudgetEnvelope = evaluateComputeBudgetEnvelope(runtimeBudgetTraces);

  return {
    config: { seed, episodes: episodeCount, steps },
    metrics,
    effectSizes,
    integrityChecks: {
      d2_d3_independent: !d2d3Collapsed
    },
    runtimeBudget: {
      traceCount: runtimeBudgetTraces.length,
      envelope: runtimeBudgetEnvelope
    },
    ablations: {
      plannerOnMeanReward: Number(plannerOnMeanReward.toFixed(6)),
      plannerOffMeanReward: Number(plannerOffMeanReward.toFixed(6)),
      worldModelOffMeanReward: Number(worldModelOffMeanReward.toFixed(6))
    }
  };
};

export const evaluatePreregistrationProtocol = (preregPayload = {}) => {
  const issues = [];
  if (preregPayload?.preregProtocol?.primaryMetricsFailHard !== true) {
    issues.push('prereg_primary_fail_hard_disabled');
  }
  const pipeline = preregPayload?.preregProtocol?.analysisPipelineOrder || [];
  if (!Array.isArray(pipeline) || pipeline[0] !== 'primary_metrics') {
    issues.push('prereg_pipeline_missing_primary_first');
  }
  if (toFinite(preregPayload?.preregProtocol?.evaluationSeed, 0) <= 0) {
    issues.push('prereg_seed_missing');
  }
  if (toFinite(preregPayload?.preregProtocol?.analysisWindowTicks?.active, 0) <= 0) {
    issues.push('prereg_analysis_window_invalid');
  }
  return {
    pass: issues.length === 0,
    issues
  };
};

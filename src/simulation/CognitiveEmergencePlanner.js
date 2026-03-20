const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const toFinite = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const copyState = (state = {}) => ({
  ccc: toFinite(state.ccc, 0),
  pmia: clamp(toFinite(state.pmia, 0), -1, 1),
  sensorySignal: clamp(toFinite(state.sensorySignal, 0), 0, 1),
  sensorDelta: clamp(toFinite(state.sensorDelta, 0), 0, 1),
  stasisIndex: clamp(toFinite(state.stasisIndex, 0), 0, 1),
  entropyExcitation: clamp(toFinite(state.entropyExcitation, 0), 0, 1),
  energyDispersion: Math.max(0, toFinite(state.energyDispersion, 0))
});

const gaussian = (randomFn = Math.random) => {
  const u1 = Math.max(1e-9, Math.min(1 - 1e-9, toFinite(randomFn(), 0.5)));
  const u2 = Math.max(1e-9, Math.min(1 - 1e-9, toFinite(randomFn(), 0.5)));
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
};

const fallbackPredict = (state = {}, action = 0, quantumEpsilon = 0) => {
  const s = copyState(state);
  const actionSafe = clamp(toFinite(action, 0), -1, 1);
  const epsilon = clamp(toFinite(quantumEpsilon, 0), -1, 1);
  return {
    ...s,
    ccc: clamp(
      (0.78 * s.ccc) +
      (0.56 * (s.pmia + actionSafe)) -
      (0.12 * s.stasisIndex) -
      (0.08 * s.energyDispersion) +
      (0.04 * s.sensorySignal) +
      (epsilon * 0.02),
      0,
      2.5
    ),
    pmia: clamp(s.pmia + (actionSafe * 0.5), -1, 1),
    stasisIndex: clamp((s.stasisIndex * 0.92) + (Math.abs(actionSafe) * 0.06) - (s.sensorySignal * 0.03), 0, 1),
    energyDispersion: clamp((s.energyDispersion * 0.9) + (Math.abs(actionSafe) * 0.05) + (Math.abs(epsilon) * 0.03), 0, 2),
    sensorDelta: clamp((s.sensorDelta * 0.88) + (Math.abs(actionSafe) * 0.03), 0, 1),
    entropyExcitation: clamp((s.entropyExcitation * 0.9) + (Math.abs(epsilon) * 0.04), 0, 1)
  };
};

const defaultObjective = ({
  currentState = {},
  nextState = {},
  action = 0,
  step = 0,
  sensorState = {}
} = {}) => {
  const current = copyState(currentState);
  const next = copyState(nextState);
  const actionSafe = Math.abs(clamp(toFinite(action, 0), -1, 1));
  const sensorNovelty = clamp(toFinite(sensorState.sensorDelta, next.sensorDelta), 0, 1);
  const cccGain = next.ccc - current.ccc;
  const stabilityPenalty = (next.stasisIndex * 0.35) + (next.energyDispersion * 0.22);
  const controlPenalty = actionSafe * 0.08;
  const noveltyReward = sensorNovelty * 0.04;
  const temporalDiscount = 1 - Math.min(0.7, step * 0.06);
  return ((cccGain * 1.7) + noveltyReward - stabilityPenalty - controlPenalty) * temporalDiscount;
};

export class CognitiveEmergencePlanner {
  constructor(config = {}) {
    this.config = {
      horizon: Math.max(3, Math.min(24, Math.floor(toFinite(config.horizon, 10)))),
      sampleCount: Math.max(8, Math.min(128, Math.floor(toFinite(config.sampleCount, 24)))),
      iterations: Math.max(1, Math.min(6, Math.floor(toFinite(config.iterations, 3)))),
      eliteFraction: clamp(toFinite(config.eliteFraction, 0.25), 0.1, 0.6),
      actionMin: clamp(toFinite(config.actionMin, -1), -1, 1),
      actionMax: clamp(toFinite(config.actionMax, 1), -1, 1),
      initialStd: clamp(toFinite(config.initialStd, 0.45), 0.05, 1),
      minStd: clamp(toFinite(config.minStd, 0.05), 0.01, 0.2)
    };
  }

  _heuristicAction(initialState = {}) {
    const s = copyState(initialState);
    return clamp(
      (-(s.stasisIndex * 0.28)) +
      ((0.5 - s.sensorySignal) * 0.2) +
      ((0.95 - s.ccc) * 0.24),
      this.config.actionMin,
      this.config.actionMax
    );
  }

  _evaluateSequence({
    initialState = {},
    sequence = [],
    worldModel = null,
    worldModelEnabled = true,
    objectiveFn = defaultObjective,
    quantumEpsilonFn = null,
    sensorState = {}
  } = {}) {
    let state = copyState(initialState);
    let reward = 0;
    for (let step = 0; step < sequence.length; step += 1) {
      const action = clamp(toFinite(sequence[step], 0), this.config.actionMin, this.config.actionMax);
      const quantumEpsilon = typeof quantumEpsilonFn === 'function' ? toFinite(quantumEpsilonFn(), 0) : 0;
      const next = worldModelEnabled && worldModel && typeof worldModel.predictNextState === 'function'
        ? worldModel.predictNextState(state, action, { quantumEpsilon })
        : fallbackPredict(state, action, quantumEpsilon);
      reward += toFinite(objectiveFn({
        currentState: state,
        nextState: next,
        action,
        step,
        sensorState
      }), 0);
      state = copyState(next);
    }
    return { reward, terminalState: state };
  }

  planAction({
    initialState = {},
    worldModel = null,
    plannerEnabled = true,
    worldModelEnabled = true,
    objectiveFn = defaultObjective,
    randomFn = Math.random,
    quantumEpsilonFn = null,
    sensorState = {}
  } = {}) {
    const seedAction = this._heuristicAction(initialState);
    if (!plannerEnabled) {
      return {
        firstAction: seedAction,
        sequence: [seedAction],
        diagnostics: {
          plannerEnabled: false,
          worldModelEnabled,
          planningScore: 0,
          iterations: 0,
          samples: 1,
          horizon: 1
        }
      };
    }

    const horizon = this.config.horizon;
    const sampleCount = this.config.sampleCount;
    const eliteCount = Math.max(2, Math.floor(sampleCount * this.config.eliteFraction));
    const minStd = this.config.minStd;
    const mean = Array.from({ length: horizon }, (_, index) => seedAction * Math.exp(-index * 0.06));
    const std = Array.from({ length: horizon }, () => this.config.initialStd);
    let bestSequence = [...mean];
    let bestScore = -Infinity;

    for (let iteration = 0; iteration < this.config.iterations; iteration += 1) {
      const sampled = [];
      for (let sample = 0; sample < sampleCount; sample += 1) {
        const sequence = [];
        for (let step = 0; step < horizon; step += 1) {
          const candidate = mean[step] + (gaussian(randomFn) * std[step]);
          sequence.push(clamp(candidate, this.config.actionMin, this.config.actionMax));
        }
        const evaluation = this._evaluateSequence({
          initialState,
          sequence,
          worldModel,
          worldModelEnabled,
          objectiveFn,
          quantumEpsilonFn,
          sensorState
        });
        sampled.push({ sequence, score: evaluation.reward });
      }

      sampled.sort((a, b) => b.score - a.score);
      if (sampled[0] && sampled[0].score > bestScore) {
        bestScore = sampled[0].score;
        bestSequence = [...sampled[0].sequence];
      }

      const elites = sampled.slice(0, eliteCount);
      for (let step = 0; step < horizon; step += 1) {
        const eliteValues = elites.map((entry) => entry.sequence[step]);
        const eliteMean = eliteValues.reduce((sum, value) => sum + value, 0) / eliteValues.length;
        const eliteVar = eliteValues.reduce((sum, value) => sum + ((value - eliteMean) ** 2), 0) / eliteValues.length;
        mean[step] = clamp(eliteMean, this.config.actionMin, this.config.actionMax);
        std[step] = Math.max(minStd, Math.sqrt(Math.max(0, eliteVar)));
      }
    }

    return {
      firstAction: clamp(toFinite(bestSequence[0], seedAction), this.config.actionMin, this.config.actionMax),
      sequence: bestSequence,
      diagnostics: {
        plannerEnabled: true,
        worldModelEnabled,
        planningScore: Number(bestScore.toFixed(6)),
        iterations: this.config.iterations,
        samples: sampleCount,
        horizon
      }
    };
  }
}

export default CognitiveEmergencePlanner;

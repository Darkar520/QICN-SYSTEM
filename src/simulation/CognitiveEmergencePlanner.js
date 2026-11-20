import { bindExecutionEnvironment, executionEnvironmentFor, LEGACY_EXECUTION_ENVIRONMENT } from '../runtime/ExecutionEnvironment.js';
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

const gaussian = (randomFn = LEGACY_EXECUTION_ENVIRONMENT.random) => {
  const u1 = Math.max(1e-9, Math.min(1 - 1e-9, toFinite(randomFn(), 0.5)));
  const u2 = Math.max(1e-9, Math.min(1 - 1e-9, toFinite(randomFn(), 0.5)));
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
};

const writeNormalizedState = (out, state = {}) => {
  out.ccc = toFinite(state.ccc, 0);
  out.pmia = clamp(toFinite(state.pmia, 0), -1, 1);
  out.sensorySignal = clamp(toFinite(state.sensorySignal, 0), 0, 1);
  out.sensorDelta = clamp(toFinite(state.sensorDelta, 0), 0, 1);
  out.stasisIndex = clamp(toFinite(state.stasisIndex, 0), 0, 1);
  out.entropyExcitation = clamp(toFinite(state.entropyExcitation, 0), 0, 1);
  out.energyDispersion = Math.max(0, toFinite(state.energyDispersion, 0));
  return out;
};

const fallbackPredict = (state = {}, action = 0, quantumEpsilon = 0, out = null) => {
  const sCcc = toFinite(state.ccc, 0);
  const sPmia = clamp(toFinite(state.pmia, 0), -1, 1);
  const sSensory = clamp(toFinite(state.sensorySignal, 0), 0, 1);
  const sSensorDelta = clamp(toFinite(state.sensorDelta, 0), 0, 1);
  const sStasis = clamp(toFinite(state.stasisIndex, 0), 0, 1);
  const sEntropy = clamp(toFinite(state.entropyExcitation, 0), 0, 1);
  const sEnergy = Math.max(0, toFinite(state.energyDispersion, 0));
  const actionSafe = clamp(toFinite(action, 0), -1, 1);
  const absAct = Math.abs(actionSafe);
  const epsilon = clamp(toFinite(quantumEpsilon, 0), -1, 1);
  const absEps = Math.abs(epsilon);
  const target = out || {};
  target.ccc = clamp(
    (0.78 * sCcc) +
    (0.56 * (sPmia + actionSafe)) -
    (0.12 * sStasis) -
    (0.08 * sEnergy) +
    (0.04 * sSensory) +
    (epsilon * 0.02),
    0,
    2.5
  );
  target.pmia = clamp(sPmia + (actionSafe * 0.5), -1, 1);
  target.sensorySignal = sSensory;
  target.stasisIndex = clamp((sStasis * 0.92) + (absAct * 0.06) - (sSensory * 0.03), 0, 1);
  target.energyDispersion = clamp((sEnergy * 0.9) + (absAct * 0.05) + (absEps * 0.03), 0, 2);
  target.sensorDelta = clamp((sSensorDelta * 0.88) + (absAct * 0.03), 0, 1);
  target.entropyExcitation = clamp((sEntropy * 0.9) + (absEps * 0.04), 0, 1);
  return target;
};

const defaultObjective = ({
  currentState = {},
  nextState = {},
  action = 0,
  step = 0,
  sensorState = {}
} = {}) => {
  const curCcc = toFinite(currentState.ccc, 0);
  const nextCcc = toFinite(nextState.ccc, 0);
  const nextStasis = clamp(toFinite(nextState.stasisIndex, 0), 0, 1);
  const nextEnergy = Math.max(0, toFinite(nextState.energyDispersion, 0));
  const nextSensorDelta = clamp(toFinite(nextState.sensorDelta, 0), 0, 1);
  const actionSafe = Math.abs(clamp(toFinite(action, 0), -1, 1));
  const sensorNovelty = clamp(toFinite(sensorState.sensorDelta, nextSensorDelta), 0, 1);
  const cccGain = nextCcc - curCcc;
  const stabilityPenalty = (nextStasis * 0.35) + (nextEnergy * 0.22);
  const controlPenalty = actionSafe * 0.08;
  const noveltyReward = sensorNovelty * 0.04;
  const temporalDiscount = 1 - Math.min(0.7, step * 0.06);
  return ((cccGain * 1.7) + noveltyReward - stabilityPenalty - controlPenalty) * temporalDiscount;
};

const _scratchA = { ccc: 0, pmia: 0, sensorySignal: 0, sensorDelta: 0, stasisIndex: 0, entropyExcitation: 0, energyDispersion: 0 };
const _scratchB = { ccc: 0, pmia: 0, sensorySignal: 0, sensorDelta: 0, stasisIndex: 0, entropyExcitation: 0, energyDispersion: 0 };
const _scratchPredictOpts = { quantumEpsilon: 0, out: null };
const _scratchObjArgs = { currentState: null, nextState: null, action: 0, step: 0, sensorState: null };

export class CognitiveEmergencePlanner {
  constructor(config = {}, executionEnvironment) {
    bindExecutionEnvironment(this, executionEnvironment);
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
    const useModel = Boolean(worldModelEnabled && worldModel && typeof worldModel.predictNextState === 'function');
    const hasQuantumFn = typeof quantumEpsilonFn === 'function';
    const actionMin = this.config.actionMin;
    const actionMax = this.config.actionMax;
    const predictOpts = _scratchPredictOpts;
    const objArgs = _scratchObjArgs;
    objArgs.sensorState = sensorState;

    let cur = writeNormalizedState(_scratchA, initialState);
    let nxt = _scratchB;
    let reward = 0;
    const seqLen = sequence.length;
    for (let step = 0; step < seqLen; step += 1) {
      const action = clamp(toFinite(sequence[step], 0), actionMin, actionMax);
      const quantumEpsilon = hasQuantumFn ? toFinite(quantumEpsilonFn(), 0) : 0;
      let nextState;
      if (useModel) {
        predictOpts.quantumEpsilon = quantumEpsilon;
        predictOpts.out = nxt;
        nextState = worldModel.predictNextState(cur, action, predictOpts);
        if (nextState !== nxt) {
          writeNormalizedState(nxt, nextState);
        }
      } else {
        fallbackPredict(cur, action, quantumEpsilon, nxt);
      }
      objArgs.currentState = cur;
      objArgs.nextState = nxt;
      objArgs.action = action;
      objArgs.step = step;
      reward += toFinite(objectiveFn(objArgs), 0);
      const tmp = cur;
      cur = nxt;
      nxt = tmp;
    }
    return { reward, terminalState: cur };
  }

  planAction({
    initialState = {},
    worldModel = null,
    plannerEnabled = true,
    worldModelEnabled = true,
    objectiveFn = defaultObjective,
    randomFn = executionEnvironmentFor(this).random,
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
    const actionMin = this.config.actionMin;
    const actionMax = this.config.actionMax;
    const mean = new Float64Array(horizon);
    const std = new Float64Array(horizon);
    let bestSequence = new Array(horizon);
    for (let i = 0; i < horizon; i += 1) {
      const m = seedAction * Math.exp(-i * 0.06);
      mean[i] = m;
      std[i] = this.config.initialStd;
      bestSequence[i] = m;
    }
    let bestScore = -Infinity;

    // Pre-allocate sample slots reused across CEM iterations (zero per-iteration array/object GC)
    const sampled = new Array(sampleCount);
    for (let s = 0; s < sampleCount; s += 1) {
      sampled[s] = { sequence: new Float64Array(horizon), score: 0 };
    }
    const evalArgs = {
      initialState,
      sequence: null,
      worldModel,
      worldModelEnabled,
      objectiveFn,
      quantumEpsilonFn,
      sensorState
    };

    for (let iteration = 0; iteration < this.config.iterations; iteration += 1) {
      for (let sample = 0; sample < sampleCount; sample += 1) {
        const entry = sampled[sample];
        const sequence = entry.sequence;
        for (let step = 0; step < horizon; step += 1) {
          const candidate = mean[step] + (gaussian(randomFn) * std[step]);
          sequence[step] = clamp(candidate, actionMin, actionMax);
        }
        evalArgs.sequence = sequence;
        entry.score = this._evaluateSequence(evalArgs).reward;
      }

      sampled.sort((a, b) => b.score - a.score);
      if (sampled[0] && sampled[0].score > bestScore) {
        bestScore = sampled[0].score;
        const winSeq = sampled[0].sequence;
        for (let i = 0; i < horizon; i += 1) bestSequence[i] = winSeq[i];
      }

      const kCount = Math.min(eliteCount, sampleCount);
      for (let step = 0; step < horizon; step += 1) {
        let sum = 0;
        for (let e = 0; e < kCount; e += 1) sum += sampled[e].sequence[step];
        const eliteMean = sum / kCount;
        let varSum = 0;
        for (let e = 0; e < kCount; e += 1) {
          const d = sampled[e].sequence[step] - eliteMean;
          varSum += d * d;
        }
        const eliteVar = varSum / kCount;
        mean[step] = clamp(eliteMean, actionMin, actionMax);
        std[step] = Math.max(minStd, Math.sqrt(Math.max(0, eliteVar)));
      }
    }

    return {
      firstAction: clamp(toFinite(bestSequence[0], seedAction), actionMin, actionMax),
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

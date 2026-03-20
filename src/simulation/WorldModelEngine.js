const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const toFinite = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const copyState = (state = {}) => ({
  ccc: toFinite(state.ccc, 0),
  pmia: toFinite(state.pmia, 0),
  sensorySignal: clamp(toFinite(state.sensorySignal, 0), 0, 1),
  sensorDelta: clamp(toFinite(state.sensorDelta, 0), 0, 1),
  stasisIndex: clamp(toFinite(state.stasisIndex, 0), 0, 1),
  entropyExcitation: clamp(toFinite(state.entropyExcitation, 0), 0, 1),
  energyDispersion: Math.max(0, toFinite(state.energyDispersion, 0))
});

export class WorldModelEngine {
  constructor(config = {}) {
    this.config = {
      learningRate: clamp(toFinite(config.learningRate, 0.018), 0.001, 0.08),
      regularization: clamp(toFinite(config.regularization, 0.0009), 0, 0.01),
      maxAbsWeight: clamp(toFinite(config.maxAbsWeight, 3.2), 0.5, 8),
      historyLimit: Math.max(32, Math.floor(toFinite(config.historyLimit, 256))),
      residualEmaAlpha: clamp(toFinite(config.residualEmaAlpha, 0.12), 0.01, 0.6)
    };
    // Linear transition priors from existing dynamics.
    this.weights = {
      bias: 0,
      ccc: 0.82,
      pmia: 0.74,
      action: 0.18,
      sensorySignal: 0.08,
      sensorDelta: 0.06,
      stasisIndex: -0.22,
      entropyExcitation: 0.05,
      energyDispersion: -0.12
    };
    this.history = [];
    this.lastObservedState = null;
    this.lastPrediction = null;
    this.lastError = 0;
    this.residualEma = 0;
    this.trainingSteps = 0;
  }

  _predictCccRaw(state = {}, action = 0, quantumEpsilon = 0) {
    const s = copyState(state);
    const actionSafe = clamp(toFinite(action, 0), -1, 1);
    const pmiaAction = s.pmia + actionSafe;
    const epsilon = clamp(toFinite(quantumEpsilon, 0), -1, 1);
    return (
      this.weights.bias +
      (this.weights.ccc * s.ccc) +
      (this.weights.pmia * pmiaAction) +
      (this.weights.action * actionSafe) +
      (this.weights.sensorySignal * s.sensorySignal) +
      (this.weights.sensorDelta * s.sensorDelta) +
      (this.weights.stasisIndex * s.stasisIndex) +
      (this.weights.entropyExcitation * s.entropyExcitation) +
      (this.weights.energyDispersion * s.energyDispersion) +
      (epsilon * 0.025)
    );
  }

  _featureVector(state = {}, action = 0) {
    const s = copyState(state);
    return {
      bias: 1,
      ccc: s.ccc,
      pmia: s.pmia,
      action: clamp(toFinite(action, 0), -1, 1),
      sensorySignal: s.sensorySignal,
      sensorDelta: s.sensorDelta,
      stasisIndex: s.stasisIndex,
      entropyExcitation: s.entropyExcitation,
      energyDispersion: s.energyDispersion
    };
  }

  _applyGradient(error = 0, features = {}) {
    const rate = this.config.learningRate;
    for (const [key, featureValue] of Object.entries(features)) {
      const regularized = this.weights[key] * (1 - this.config.regularization);
      this.weights[key] = clamp(
        regularized + (rate * error * featureValue),
        -this.config.maxAbsWeight,
        this.config.maxAbsWeight
      );
    }
  }

  predictNextState(state = {}, action = 0, options = {}) {
    const s = copyState(state);
    const epsilon = clamp(toFinite(options.quantumEpsilon, 0), -1, 1);
    const nextCcc = clamp(this._predictCccRaw(s, action, epsilon), 0, 2.5);
    const actionMagnitude = Math.abs(toFinite(action, 0));
    const nextStasis = clamp(
      (s.stasisIndex * 0.92) +
      (actionMagnitude * 0.11) +
      ((1 - s.sensorySignal) * 0.06) -
      (s.entropyExcitation * 0.04),
      0,
      1
    );
    const nextEnergy = clamp(
      (s.energyDispersion * 0.9) +
      (actionMagnitude * 0.08) +
      (Math.abs(epsilon) * 0.06),
      0,
      2
    );
    const nextSensorDelta = clamp((s.sensorDelta * 0.86) + (Math.abs(epsilon) * 0.08), 0, 1);
    const nextEntropy = clamp((s.entropyExcitation * 0.9) + (Math.abs(epsilon) * 0.05), 0, 1);
    return {
      ...s,
      ccc: nextCcc,
      pmia: clamp(s.pmia + toFinite(action, 0), -1, 1),
      stasisIndex: nextStasis,
      energyDispersion: nextEnergy,
      sensorDelta: nextSensorDelta,
      entropyExcitation: nextEntropy
    };
  }

  predictTrajectory(initialState = {}, actionSequence = [], options = {}) {
    const steps = Math.max(1, Math.floor(toFinite(options.horizon, actionSequence.length || 1)));
    const sequence = Array.isArray(actionSequence) ? actionSequence : [];
    const trajectory = [];
    let state = copyState(initialState);
    for (let index = 0; index < steps; index += 1) {
      const action = toFinite(sequence[index], 0);
      state = this.predictNextState(state, action, options);
      trajectory.push({ ...state, action });
    }
    return trajectory;
  }

  observeTransition(previousState = {}, action = 0, observedNextState = {}, options = {}) {
    const prev = copyState(previousState);
    const next = copyState(observedNextState);
    const epsilon = clamp(toFinite(options.quantumEpsilon, 0), -1, 1);
    const predicted = this.predictNextState(prev, action, { quantumEpsilon: epsilon });
    const error = next.ccc - predicted.ccc;
    const features = this._featureVector(prev, action);
    this._applyGradient(error, features);

    this.lastPrediction = predicted;
    this.lastError = error;
    this.residualEma = ((1 - this.config.residualEmaAlpha) * this.residualEma) + (this.config.residualEmaAlpha * Math.abs(error));
    this.trainingSteps += 1;
    this.lastObservedState = next;
    this.history.push({ t: Date.now(), state: next, action: clamp(toFinite(action, 0), -1, 1), epsilon });
    if (this.history.length > this.config.historyLimit) {
      this.history.shift();
    }

    return {
      predictionError: this.lastError,
      residualEma: this.residualEma,
      trainingSteps: this.trainingSteps,
      predicted,
      observed: next
    };
  }

  observeTick(observation = {}) {
    const current = copyState(observation);
    if (this.lastObservedState) {
      const transition = this.observeTransition(this.lastObservedState, 0, current, { quantumEpsilon: 0 });
      return {
        predictionError: transition.predictionError,
        residualEma: transition.residualEma,
        trainingSteps: transition.trainingSteps
      };
    }
    this.lastObservedState = current;
    this.history.push({ t: Date.now(), state: current });
    if (this.history.length > this.config.historyLimit) {
      this.history.shift();
    }
    return {
      predictionError: this.lastError,
      residualEma: this.residualEma,
      trainingSteps: this.trainingSteps
    };
  }

  getLatestPrediction() {
    return this.lastPrediction ? { ...this.lastPrediction } : null;
  }

  validatePredictionHorizon(steps = 5) {
    const horizon5 = Math.max(1, Math.floor(toFinite(steps, 5)));
    const horizon10 = Math.max(horizon5, 10);
    const evaluateHorizon = (horizon) => {
      if (this.history.length <= horizon + 1) {
        return null;
      }
      const maxAnchors = Math.min(12, this.history.length - horizon - 1);
      if (maxAnchors <= 0) return null;
      const startAnchor = Math.max(0, this.history.length - horizon - maxAnchors - 1);
      let errorSum = 0;
      let sampleCount = 0;
      for (let anchor = startAnchor; anchor <= (startAnchor + maxAnchors - 1); anchor += 1) {
        const anchorEntry = this.history[anchor];
        if (!anchorEntry?.state) continue;
        let predictedState = copyState(anchorEntry.state);
        for (let offset = 1; offset <= horizon; offset += 1) {
          const observedEntry = this.history[anchor + offset];
          if (!observedEntry?.state) break;
          const action = toFinite(observedEntry?.action, 0);
          const epsilon = toFinite(observedEntry?.epsilon, 0);
          predictedState = this.predictNextState(predictedState, action, { quantumEpsilon: epsilon });
          const observed = copyState(observedEntry.state);
          errorSum += Math.abs(predictedState.ccc - observed.ccc);
          sampleCount += 1;
        }
      }
      if (sampleCount <= 0) return null;
      return errorSum / sampleCount;
    };

    const horizonMae5 = evaluateHorizon(horizon5);
    const horizonMae10 = evaluateHorizon(horizon10);
    return {
      horizonMae5: Number(toFinite(horizonMae5, -1).toFixed(6)),
      horizonMae10: Number(toFinite(horizonMae10, -1).toFixed(6))
    };
  }

  getDiagnostics() {
    const horizon = this.validatePredictionHorizon(5);
    return {
      trainingSteps: this.trainingSteps,
      residualEma: Number(this.residualEma.toFixed(6)),
      lastError: Number(this.lastError.toFixed(6)),
      horizonMae5: horizon.horizonMae5,
      horizonMae10: horizon.horizonMae10,
      lastObservedState: this.lastObservedState ? { ...this.lastObservedState } : null,
      weights: { ...this.weights }
    };
  }
}

export default WorldModelEngine;

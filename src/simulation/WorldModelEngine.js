import { sha256Hex, stableStringify } from '../utils/integrity.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const toFinite = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export const SEALED_TARGET_KEYS = Object.freeze([
  'ccc',
  'x_n',
  'x_dispersion',
  'body_v_pos',
  'body_v_neg',
  'world_w_fast',
  'world_w_slow',
  'sigma_t6_phase',
  'exo_signal'
]);

export const DEFAULT_SEALED_HORIZONS = Object.freeze([1, 3, 5]);

const MULTI_FEATURE_KEYS = Object.freeze([
  'bias',
  'ccc',
  'pmia',
  'action',
  'sensorySignal',
  'sensorDelta',
  'stasisIndex',
  'entropyExcitation',
  'energyDispersion',
  'x_n',
  'x_dispersion',
  'body_v_pos',
  'body_v_neg',
  'world_w_fast',
  'world_w_slow',
  'sigma_t6_phase',
  'exo_signal'
]);

const TARGET_BOUNDS = Object.freeze({
  ccc: [0, 2.5],
  x_n: [0, 1],
  x_dispersion: [0, 1],
  body_v_pos: [0, 2],
  body_v_neg: [0, 2],
  world_w_fast: [-2, 2],
  world_w_slow: [-2, 2],
  sigma_t6_phase: [-1, 1],
  exo_signal: [-1.5, 1.5]
});

const INITIAL_TARGET_SIGMA = Object.freeze({
  ccc: 0.06,
  x_n: 0.04,
  x_dispersion: 0.03,
  body_v_pos: 0.05,
  body_v_neg: 0.05,
  world_w_fast: 0.08,
  world_w_slow: 0.05,
  sigma_t6_phase: 0.08,
  exo_signal: 0.14
});

const copyState = (state = {}) => ({
  ccc: toFinite(state.ccc, 0),
  pmia: toFinite(state.pmia, 0),
  sensorySignal: clamp(toFinite(state.sensorySignal, 0), 0, 1),
  sensorDelta: clamp(toFinite(state.sensorDelta, 0), 0, 1),
  stasisIndex: clamp(toFinite(state.stasisIndex, 0), 0, 1),
  entropyExcitation: clamp(toFinite(state.entropyExcitation, 0), 0, 1),
  energyDispersion: Math.max(0, toFinite(state.energyDispersion, 0))
});

const copyExtendedState = (state = {}) => ({
  ...copyState(state),
  x_n: clamp(toFinite(state.x_n, 0.5), 0, 1),
  x_dispersion: clamp(toFinite(state.x_dispersion, 0), 0, 1),
  body_v_pos: clamp(toFinite(state.body_v_pos, 0), 0, 2),
  body_v_neg: clamp(toFinite(state.body_v_neg, 0), 0, 2),
  world_w_fast: clamp(toFinite(state.world_w_fast, 0), -2, 2),
  world_w_slow: clamp(toFinite(state.world_w_slow, 0), -2, 2),
  sigma_t6_phase: clamp(toFinite(state.sigma_t6_phase, 0), -1, 1),
  exo_signal: clamp(toFinite(state.exo_signal, 0), -1.5, 1.5)
});

const createInitialCccWeights = () => ({
  bias: 0,
  ccc: 0.82,
  pmia: 0.74,
  action: 0.18,
  sensorySignal: 0.08,
  sensorDelta: 0.06,
  stasisIndex: -0.22,
  entropyExcitation: 0.05,
  energyDispersion: -0.12
});

const createInitialMultiWeights = () => {
  const matrix = {};
  for (const target of SEALED_TARGET_KEYS) {
    const row = {};
    for (const feat of MULTI_FEATURE_KEYS) row[feat] = 0;
    if (target === 'ccc') {
      row.ccc = 0.88;
      row.sensorySignal = 0.05;
      row.stasisIndex = -0.06;
      row.exo_signal = 0.04;
    } else if (target === 'exo_signal') {
      row.exo_signal = 0.78;
    } else if (target === 'world_w_fast') {
      row.world_w_fast = 0.82;
      row.world_w_slow = 0.08;
      row.exo_signal = 0.08;
    } else if (target === 'sigma_t6_phase') {
      row.sigma_t6_phase = 0.85;
      row.action = 0.12;
    } else {
      row[target] = 0.92;
      if (target === 'x_dispersion' || target === 'x_n') row.exo_signal = 0.04;
    }
    matrix[target] = row;
  }
  return matrix;
};

const createZeroStiffness = () => {
  const ccc = {};
  for (const key of Object.keys(createInitialCccWeights())) ccc[key] = 0;
  const multi = {};
  for (const target of SEALED_TARGET_KEYS) {
    multi[target] = {};
    for (const feat of MULTI_FEATURE_KEYS) multi[target][feat] = 0;
  }
  return { ccc, multi };
};

const cloneWeightMatrix = (matrix) => {
  const out = {};
  for (const [k, row] of Object.entries(matrix)) out[k] = { ...row };
  return out;
};

const extractTargetVector = (extState) => {
  const out = {};
  for (const key of SEALED_TARGET_KEYS) {
    out[key] = Number(toFinite(extState[key], 0).toFixed(8));
  }
  return out;
};

const l2DistanceMap = (a, b) => {
  let sumSq = 0;
  for (const k of Object.keys(a)) {
    const d = toFinite(a[k], 0) - toFinite(b?.[k], 0);
    sumSq += d * d;
  }
  return Math.sqrt(sumSq);
};

export class WorldModelEngine {
  constructor(config = {}) {
    this.config = {
      learningRate: clamp(toFinite(config.learningRate, 0.018), 0.001, 0.08),
      multiLearningRate: clamp(toFinite(config.multiLearningRate, 0.025), 0.001, 0.08),
      regularization: clamp(toFinite(config.regularization, 0.0009), 0, 0.01),
      maxAbsWeight: clamp(toFinite(config.maxAbsWeight, 3.2), 0.5, 8),
      maxAbsMultiWeight: clamp(toFinite(config.maxAbsMultiWeight, 1.5), 0.5, 4),
      historyLimit: Math.max(32, Math.floor(toFinite(config.historyLimit, 256))),
      residualEmaAlpha: clamp(toFinite(config.residualEmaAlpha, 0.12), 0.01, 0.6),
      plasticityEnabled: config.plasticityEnabled !== false,
      stiffnessAlphaUp: clamp(toFinite(config.stiffnessAlphaUp, 0.035), 0.001, 0.2),
      stiffnessAlphaDown: clamp(toFinite(config.stiffnessAlphaDown, 0.002), 0.0001, 0.05),
      stiffnessMax: clamp(toFinite(config.stiffnessMax, 4.0), 0.5, 12),
      ewcLambda: clamp(toFinite(config.ewcLambda, 0.08), 0, 0.5),
      anchorAdaptRate: clamp(toFinite(config.anchorAdaptRate, 0.025), 0.001, 0.2),
      unforeseenKappa: clamp(toFinite(config.unforeseenKappa, 2.5), 1.2, 6),
      unforeseenMinAbsError: clamp(toFinite(config.unforeseenMinAbsError, 0.02), 0.001, 0.25),
      maxPendingCommits: Math.max(8, Math.floor(toFinite(config.maxPendingCommits, 64))),
      maxResolvedRecords: Math.max(32, Math.floor(toFinite(config.maxResolvedRecords, 256)))
    };

    this.weights = createInitialCccWeights();
    this.multiWeights = createInitialMultiWeights();
    this.residualScaleEma = { ...INITIAL_TARGET_SIGMA };

    this.history = [];
    this.lastObservedState = null;
    this.lastExtendedState = null;
    this.lastPrediction = null;
    this.lastError = 0;
    this.residualEma = 0;
    this.trainingSteps = 0;
    this.internalTickCursor = 0;

    this.pendingCommits = [];
    this.resolvedPredictions = [];
    this.commitSequence = 0;

    this.plasticityState = this._createFreshPlasticityState();
  }

  _createFreshPlasticityState() {
    return {
      consolidatedWeights: {
        ccc: createInitialCccWeights(),
        multi: createInitialMultiWeights()
      },
      fisherStiffness: createZeroStiffness(),
      maturationIndex: 0,
      cumulativeSurprise: 0,
      surprisalEma: 0,
      unforeseenEventCount: 0,
      unforeseenRateEma: 0,
      sealedCommitCount: 0,
      verifiedPredictionCount: 0,
      expiredCommitCount: 0,
      tamperViolationCount: 0,
      retrospectiveMutationBlockedCount: 0,
      lastSettledTick: -1,
      lastCommitDigest: null,
      horizonMaeEma: { 1: null, 3: null, 5: null }
    };
  }

  /**
   * Explicitly erases consolidated historical plasticity while resetting to initial priors.
   * Intended exclusively for controlled ablation / CN-3 negative control.
   */
  resetHistoricalConsolidation() {
    this.weights = createInitialCccWeights();
    this.multiWeights = createInitialMultiWeights();
    this.residualScaleEma = { ...INITIAL_TARGET_SIGMA };
    this.pendingCommits = [];
    this.resolvedPredictions = [];
    this.commitSequence = 0;
    this.lastSettledTick = -1;
    this.plasticityState = this._createFreshPlasticityState();
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

  _extendedFeatureVector(extState = {}, action = 0) {
    const s = copyExtendedState(extState);
    return {
      bias: 1,
      ccc: s.ccc,
      pmia: s.pmia,
      action: clamp(toFinite(action, 0), -1, 1),
      sensorySignal: s.sensorySignal,
      sensorDelta: s.sensorDelta,
      stasisIndex: s.stasisIndex,
      entropyExcitation: s.entropyExcitation,
      energyDispersion: s.energyDispersion,
      x_n: s.x_n,
      x_dispersion: s.x_dispersion,
      body_v_pos: s.body_v_pos,
      body_v_neg: s.body_v_neg,
      world_w_fast: s.world_w_fast,
      world_w_slow: s.world_w_slow,
      sigma_t6_phase: s.sigma_t6_phase,
      exo_signal: s.exo_signal
    };
  }

  _applyGradient(error = 0, features = {}, options = {}) {
    const rate = toFinite(options.learningRateOverride, this.config.learningRate);
    if (rate <= 0) return;
    const usePlasticity = options.plasticityEnabled !== undefined
      ? Boolean(options.plasticityEnabled)
      : this.config.plasticityEnabled;
    const pl = this.plasticityState;

    for (const [key, featureValue] of Object.entries(features)) {
      const w = toFinite(this.weights[key], 0);
      const l2Pull = this.config.regularization * w;
      const omega = usePlasticity ? toFinite(pl.fisherStiffness.ccc[key], 0) : 0;
      const anchor = usePlasticity ? toFinite(pl.consolidatedWeights.ccc[key], w) : 0;
      const ewcPull = usePlasticity ? (this.config.ewcLambda * omega * (w - anchor) * rate) : 0;
      this.weights[key] = clamp(
        w - l2Pull - ewcPull + (rate * error * featureValue),
        -this.config.maxAbsWeight,
        this.config.maxAbsWeight
      );
    }
  }

  predictNextState(state = {}, action = 0, options = {}) {
    const sCcc = toFinite(state.ccc, 0);
    const sPmia = clamp(toFinite(state.pmia, 0), -1, 1);
    const sSensory = clamp(toFinite(state.sensorySignal, 0), 0, 1);
    const sSensorDelta = clamp(toFinite(state.sensorDelta, 0), 0, 1);
    const sStasis = clamp(toFinite(state.stasisIndex, 0), 0, 1);
    const sEntropy = clamp(toFinite(state.entropyExcitation, 0), 0, 1);
    const sEnergy = Math.max(0, toFinite(state.energyDispersion, 0));

    const actionFin = toFinite(action, 0);
    const actionSafe = clamp(actionFin, -1, 1);
    const epsilon = clamp(toFinite(options.quantumEpsilon, 0), -1, 1);
    const pmiaAction = sPmia + actionSafe;
    const w = this.weights;
    const rawCcc =
      w.bias +
      (w.ccc * sCcc) +
      (w.pmia * pmiaAction) +
      (w.action * actionSafe) +
      (w.sensorySignal * sSensory) +
      (w.sensorDelta * sSensorDelta) +
      (w.stasisIndex * sStasis) +
      (w.entropyExcitation * sEntropy) +
      (w.energyDispersion * sEnergy) +
      (epsilon * 0.025);
    const nextCcc = clamp(rawCcc, 0, 2.5);
    const actionMagnitude = Math.abs(actionFin);
    const absEps = Math.abs(epsilon);
    const nextStasis = clamp(
      (sStasis * 0.92) +
      (actionMagnitude * 0.11) +
      ((1 - sSensory) * 0.06) -
      (sEntropy * 0.04),
      0,
      1
    );
    const nextEnergy = clamp(
      (sEnergy * 0.9) +
      (actionMagnitude * 0.08) +
      (absEps * 0.06),
      0,
      2
    );
    const nextSensorDelta = clamp((sSensorDelta * 0.86) + (absEps * 0.08), 0, 1);
    const nextEntropy = clamp((sEntropy * 0.9) + (absEps * 0.05), 0, 1);
    const nextPmia = clamp(sPmia + actionFin, -1, 1);

    const out = options.out;
    if (out) {
      out.ccc = nextCcc;
      out.pmia = nextPmia;
      out.sensorySignal = sSensory;
      out.sensorDelta = nextSensorDelta;
      out.stasisIndex = nextStasis;
      out.entropyExcitation = nextEntropy;
      out.energyDispersion = nextEnergy;
      return out;
    }
    return {
      ccc: nextCcc,
      pmia: nextPmia,
      sensorySignal: sSensory,
      sensorDelta: nextSensorDelta,
      stasisIndex: nextStasis,
      entropyExcitation: nextEntropy,
      energyDispersion: nextEnergy
    };
  }

  _predictExtendedStep(extState = {}, action = 0, options = {}) {
    const baseNext = this.predictNextState(extState, action, options);
    const feat = this._extendedFeatureVector(extState, action);
    const nextExt = copyExtendedState({ ...extState, ...baseNext });
    for (const target of SEALED_TARGET_KEYS) {
      const row = this.multiWeights[target];
      let pred = 0;
      for (const fKey of MULTI_FEATURE_KEYS) {
        pred += toFinite(row[fKey], 0) * toFinite(feat[fKey], 0);
      }
      const [lo, hi] = TARGET_BOUNDS[target];
      nextExt[target] = clamp(pred, lo, hi);
    }
    if (options.sigmaProjection && Number.isFinite(Number(options.sigmaProjection.projectedPhase))) {
      nextExt.sigma_t6_phase = clamp(
        (nextExt.sigma_t6_phase * 0.5) + (Number(options.sigmaProjection.projectedPhase) * 0.5),
        -1,
        1
      );
    }
    return nextExt;
  }

  _updateMultiWeights(prevExt, action, observedExt, options = {}) {
    const rate = toFinite(options.learningRateOverride, this.config.multiLearningRate);
    if (rate <= 0) return { stepSurprisal: 0 };
    const usePlasticity = options.plasticityEnabled !== undefined
      ? Boolean(options.plasticityEnabled)
      : this.config.plasticityEnabled;
    const pl = this.plasticityState;
    const feat = this._extendedFeatureVector(prevExt, action);

    let surprisalSum = 0;
    for (const target of SEALED_TARGET_KEYS) {
      const row = this.multiWeights[target];
      let pred = 0;
      for (const fKey of MULTI_FEATURE_KEYS) {
        pred += toFinite(row[fKey], 0) * toFinite(feat[fKey], 0);
      }
      const err = toFinite(observedExt[target], 0) - pred;
      const sigma = Math.max(1e-4, toFinite(this.residualScaleEma[target], 0.05));
      surprisalSum += 0.5 * Math.log(1 + ((err * err) / (sigma * sigma)));

      for (const fKey of MULTI_FEATURE_KEYS) {
        const w = toFinite(row[fKey], 0);
        const l2Pull = this.config.regularization * w;
        const omega = usePlasticity ? toFinite(pl.fisherStiffness.multi[target]?.[fKey], 0) : 0;
        const anchor = usePlasticity ? toFinite(pl.consolidatedWeights.multi[target]?.[fKey], w) : 0;
        const ewcPull = usePlasticity ? (this.config.ewcLambda * omega * (w - anchor) * rate) : 0;
        row[fKey] = clamp(
          w - l2Pull - ewcPull + (rate * err * toFinite(feat[fKey], 0)),
          -this.config.maxAbsMultiWeight,
          this.config.maxAbsMultiWeight
        );
      }
      this.residualScaleEma[target] = clamp(
        (0.92 * sigma) + (0.08 * Math.abs(err)),
        0.01,
        1.0
      );
    }

    const stepSurprisal = clamp(surprisalSum / SEALED_TARGET_KEYS.length, 0, 10);
    return { stepSurprisal };
  }

  _updatePlasticityConsolidation(featuresCcc, featuresMulti, effectiveSurprisal, unforeseenFlag, options = {}) {
    const usePlasticity = options.plasticityEnabled !== undefined
      ? Boolean(options.plasticityEnabled)
      : this.config.plasticityEnabled;
    if (!usePlasticity) return;

    const pl = this.plasticityState;
    const sBounded = clamp(toFinite(effectiveSurprisal, 0), 0, 10);
    const drive = Math.min(2.0, sBounded + (unforeseenFlag ? 0.5 : 0));
    const alphaUp = this.config.stiffnessAlphaUp;
    const alphaDown = this.config.stiffnessAlphaDown;
    const omegaMax = this.config.stiffnessMax;
    const adaptBase = this.config.anchorAdaptRate;

    for (const [k, fVal] of Object.entries(featuresCcc)) {
      const prevOmega = toFinite(pl.fisherStiffness.ccc[k], 0);
      const nextOmega = clamp(
        ((1 - alphaDown) * prevOmega) + (alphaUp * drive * Math.abs(toFinite(fVal, 0))),
        0,
        omegaMax
      );
      pl.fisherStiffness.ccc[k] = nextOmega;
      const beta = adaptBase / (1 + (0.5 * nextOmega));
      const curAnchor = toFinite(pl.consolidatedWeights.ccc[k], this.weights[k]);
      pl.consolidatedWeights.ccc[k] = clamp(
        curAnchor + (beta * (this.weights[k] - curAnchor)),
        -this.config.maxAbsWeight,
        this.config.maxAbsWeight
      );
    }

    for (const target of SEALED_TARGET_KEYS) {
      for (const fKey of MULTI_FEATURE_KEYS) {
        const prevOmega = toFinite(pl.fisherStiffness.multi[target][fKey], 0);
        const fMag = Math.abs(toFinite(featuresMulti[fKey], 0));
        const nextOmega = clamp(
          ((1 - alphaDown) * prevOmega) + (alphaUp * drive * fMag),
          0,
          omegaMax
        );
        pl.fisherStiffness.multi[target][fKey] = nextOmega;
        const beta = adaptBase / (1 + (0.5 * nextOmega));
        const w = toFinite(this.multiWeights[target][fKey], 0);
        const curAnchor = toFinite(pl.consolidatedWeights.multi[target][fKey], w);
        pl.consolidatedWeights.multi[target][fKey] = clamp(
          curAnchor + (beta * (w - curAnchor)),
          -this.config.maxAbsMultiWeight,
          this.config.maxAbsMultiWeight
        );
      }
    }

    const surpriseGain = (0.004 * Math.tanh(sBounded)) + (unforeseenFlag ? 0.006 : 0);
    pl.maturationIndex = clamp(
      (0.9995 * pl.maturationIndex) + surpriseGain,
      0,
      1
    );
  }

  /**
   * Resolves sealed pre-outcome commits whose dueTick matches `currentTick` (and expires stale misses).
   * Runs strictly BEFORE updating predictive weights at `currentTick`.
   */
  settleSealedPredictions(currentTick, observedExtendedState = {}) {
    const tick = Math.floor(toFinite(currentTick, -1));
    if (tick < 0 || this.pendingCommits.length === 0) return [];

    const observedTargets = extractTargetVector(copyExtendedState(observedExtendedState));
    const settledNow = [];
    const remaining = [];
    const pl = this.plasticityState;

    for (const rec of this.pendingCommits) {
      const dueTick = Math.floor(toFinite(rec?.payload?.dueTick, -1));
      if (dueTick > tick) {
        remaining.push(rec);
        continue;
      }
      if (dueTick < tick) {
        pl.expiredCommitCount += 1;
        continue;
      }

      const recomputedDigest = sha256Hex(stableStringify(rec.payload));
      if (recomputedDigest !== rec.commitDigest || rec.settled === true) {
        pl.tamperViolationCount += 1;
        settledNow.push({
          commitId: rec.commitId,
          issuedAtTick: rec.payload.issuedAtTick,
          horizon: rec.payload.horizon,
          dueTick,
          verified: false,
          tamperViolation: true,
          reason: rec.settled ? 'already_settled' : 'commit_digest_mismatch',
          mae: null,
          surprisal: null,
          unforeseen: false
        });
        continue;
      }

      let absErrSum = 0;
      let surprisalSum = 0;
      let zMax = 0;
      let maxAbsErr = 0;
      const targetErrors = {};
      const predicted = rec.payload.predicted || {};
      const sigmas = rec.payload.predictedSigma || {};

      for (const key of SEALED_TARGET_KEYS) {
        const obs = toFinite(observedTargets[key], 0);
        const pred = toFinite(predicted[key], 0);
        const err = obs - pred;
        const absErr = Math.abs(err);
        const sigma = Math.max(0.015, toFinite(sigmas[key], INITIAL_TARGET_SIGMA[key]));
        const z = absErr / sigma;
        targetErrors[key] = Number(err.toFixed(6));
        absErrSum += absErr;
        surprisalSum += 0.5 * Math.log(1 + ((err * err) / Math.max(sigma * sigma, 1e-4)));
        if (z > zMax) zMax = z;
        if (absErr > maxAbsErr) maxAbsErr = absErr;
      }

      const mae = absErrSum / SEALED_TARGET_KEYS.length;
      const surprisal = clamp(surprisalSum / SEALED_TARGET_KEYS.length, 0, 10);
      const unforeseen = (zMax > this.config.unforeseenKappa) && (maxAbsErr > this.config.unforeseenMinAbsError);

      const resolution = {
        commitId: rec.commitId,
        issuedAtTick: rec.payload.issuedAtTick,
        horizon: rec.payload.horizon,
        dueTick,
        commitDigest: rec.commitDigest,
        verified: true,
        tamperViolation: false,
        mae: Number(mae.toFixed(6)),
        surprisal: Number(surprisal.toFixed(6)),
        zMax: Number(zMax.toFixed(4)),
        unforeseen,
        targetErrors
      };

      pl.verifiedPredictionCount += 1;
      pl.lastSettledTick = tick;
      pl.cumulativeSurprise += surprisal;
      pl.surprisalEma = pl.verifiedPredictionCount === 1
        ? surprisal
        : ((0.92 * pl.surprisalEma) + (0.08 * surprisal));
      if (unforeseen) pl.unforeseenEventCount += 1;
      pl.unforeseenRateEma = pl.verifiedPredictionCount === 1
        ? (unforeseen ? 1 : 0)
        : ((0.95 * pl.unforeseenRateEma) + (0.05 * (unforeseen ? 1 : 0)));

      const hKey = rec.payload.horizon;
      if (hKey in pl.horizonMaeEma) {
        const prevH = pl.horizonMaeEma[hKey];
        pl.horizonMaeEma[hKey] = prevH === null ? mae : ((0.9 * prevH) + (0.1 * mae));
      }

      this.resolvedPredictions.push(resolution);
      if (this.resolvedPredictions.length > this.config.maxResolvedRecords) {
        this.resolvedPredictions = this.resolvedPredictions.slice(-this.config.maxResolvedRecords);
      }
      settledNow.push(resolution);
    }

    this.pendingCommits = remaining;
    return settledNow;
  }

  /**
   * Emits and cryptographically seals pre-outcome multi-horizon commitments for `t + k`.
   * Must be executed strictly AFTER weight updates at tick `t` and before advancing to `t + 1`.
   */
  issueSealedPredictions(currentTick, currentExtendedState = {}, plannedAction = 0, options = {}) {
    const tick = Math.floor(toFinite(currentTick, 0));
    const horizons = Array.isArray(options.horizons) && options.horizons.length > 0
      ? options.horizons
      : DEFAULT_SEALED_HORIZONS;
    const maxHorizon = Math.max(...horizons);
    const priorObserved = extractTargetVector(copyExtendedState(currentExtendedState));
    const priorStateDigest = sha256Hex(stableStringify(priorObserved));

    let rollState = copyExtendedState(currentExtendedState);
    const rolledByStep = {};
    for (let stepOffset = 1; stepOffset <= maxHorizon; stepOffset += 1) {
      rollState = this._predictExtendedStep(rollState, plannedAction, {
        quantumEpsilon: 0,
        sigmaProjection: stepOffset === 1 ? options.sigmaProjection : null
      });
      rolledByStep[stepOffset] = extractTargetVector(rollState);
    }

    const issued = [];
    for (const h of horizons) {
      const horizon = Math.max(1, Math.floor(toFinite(h, 1)));
      const predicted = rolledByStep[horizon] || extractTargetVector(rollState);
      const predictedSigma = {};
      const horizonScale = Math.sqrt(horizon);
      for (const key of SEALED_TARGET_KEYS) {
        const baseScale = Math.max(0.015, toFinite(this.residualScaleEma[key], INITIAL_TARGET_SIGMA[key]));
        predictedSigma[key] = Number((baseScale * horizonScale).toFixed(6));
      }

      const payload = {
        schema: 'qicn.prediction_commit.v1',
        issuedAtTick: tick,
        horizon,
        dueTick: tick + horizon,
        targetKeys: [...SEALED_TARGET_KEYS],
        predicted,
        predictedSigma,
        priorStateDigest,
        sigmaTruncatorDepth: toFinite(options.sigmaProjection?.depth, 6),
        sigmaDefectBound: String(options.sigmaProjection?.defectBoundRational || '2/2187')
      };
      const commitDigest = sha256Hex(stableStringify(payload));
      const commitId = `pred_${tick}_h${horizon}_${++this.commitSequence}`;
      const record = {
        commitId,
        payload,
        commitDigest,
        settled: false
      };

      this.pendingCommits.push(record);
      this.plasticityState.sealedCommitCount += 1;
      this.plasticityState.lastCommitDigest = commitDigest;
      issued.push({
        commitId,
        issuedAtTick: tick,
        dueTick: tick + horizon,
        horizon,
        commitDigest
      });
    }

    if (this.pendingCommits.length > this.config.maxPendingCommits) {
      this.pendingCommits = this.pendingCommits.slice(-this.config.maxPendingCommits);
    }
    return issued;
  }

  /**
   * Anti-retrospective guard: prevents any post-hoc rewriting of sealed pending commits.
   */
  attemptModifyPendingCommit(commitId, mutatingPatch = {}) {
    this.plasticityState.retrospectiveMutationBlockedCount += 1;
    return {
      ok: false,
      reason: 'sealed_commit_immutable',
      commitId: String(commitId || ''),
      attemptedKeys: Object.keys(mutatingPatch || {})
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
    this._applyGradient(error, features, options);

    this.lastPrediction = predicted;
    this.lastError = error;
    this.residualEma = ((1 - this.config.residualEmaAlpha) * this.residualEma) + (this.config.residualEmaAlpha * Math.abs(error));
    this.trainingSteps += 1;
    this.lastObservedState = next;
    const timestamp = Number.isFinite(options.tick) ? options.tick : this.internalTickCursor;
    this.history.push({ t: timestamp, state: next, action: clamp(toFinite(action, 0), -1, 1), epsilon });
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

  /**
   * Full causal pipeline for one deterministic simulation tick:
   * 1) Settle & verify pre-outcome commits due at `tick` (zero retrospective fitting).
   * 2) Update fast + elastic consolidated weights from observed transition.
   * 3) Emit & SHA-256-seal new commitments for future horizons `[1, 3, 5]`.
   */
  observeAndSealTick(observation = {}, options = {}) {
    const tick = Number.isFinite(options.tick)
      ? Math.floor(Number(options.tick))
      : (++this.internalTickCursor);
    const currentExt = copyExtendedState(observation);
    const plannedAction = clamp(toFinite(options.action, 0), -1, 1);
    const sealEnabled = options.sealEnabled !== false;
    const freezeWeights = Boolean(options.freezeWeights);

    const settlements = sealEnabled
      ? this.settleSealedPredictions(tick, currentExt)
      : [];

    const prevExt = this.lastExtendedState;
    const learningRateOverride = freezeWeights ? 0 : undefined;
    const plasticityEnabled = options.plasticityEnabled !== undefined
      ? (Boolean(options.plasticityEnabled) && !freezeWeights)
      : (this.config.plasticityEnabled && !freezeWeights);

    let transitionResult = {
      predictionError: this.lastError,
      residualEma: this.residualEma,
      trainingSteps: this.trainingSteps
    };

    if (prevExt) {
      transitionResult = this.observeTransition(prevExt, plannedAction, currentExt, {
        tick,
        quantumEpsilon: 0,
        plasticityEnabled,
        learningRateOverride
      });
      const multiUpdate = this._updateMultiWeights(prevExt, plannedAction, currentExt, {
        plasticityEnabled,
        learningRateOverride
      });

      const verifiedSettlements = settlements.filter((s) => s.verified);
      const meanSettledSurprisal = verifiedSettlements.length > 0
        ? (verifiedSettlements.reduce((sum, s) => sum + s.surprisal, 0) / verifiedSettlements.length)
        : multiUpdate.stepSurprisal;
      const anyUnforeseen = verifiedSettlements.some((s) => s.unforeseen);

      this._updatePlasticityConsolidation(
        this._featureVector(prevExt, plannedAction),
        this._extendedFeatureVector(prevExt, plannedAction),
        meanSettledSurprisal,
        anyUnforeseen,
        { plasticityEnabled: plasticityEnabled && options.consolidationEnabled !== false }
      );
    } else {
      this.lastObservedState = copyState(currentExt);
      this.history.push({ t: tick, state: this.lastObservedState });
      if (this.history.length > this.config.historyLimit) this.history.shift();
    }

    this.lastExtendedState = currentExt;
    const issued = sealEnabled
      ? this.issueSealedPredictions(tick, currentExt, plannedAction, options)
      : [];

    return {
      ...transitionResult,
      tick,
      settlements,
      issuedCommits: issued,
      plasticity: this.getPlasticityProfile()
    };
  }

  observeTick(observation = {}, options = {}) {
    if (options.legacyOnly) {
      const current = copyState(observation);
      if (this.lastObservedState) {
        const transition = this.observeTransition(this.lastObservedState, 0, current, { quantumEpsilon: 0, ...options });
        return {
          predictionError: transition.predictionError,
          residualEma: transition.residualEma,
          trainingSteps: transition.trainingSteps
        };
      }
      this.lastObservedState = current;
      this.history.push({ t: this.internalTickCursor, state: current });
      if (this.history.length > this.config.historyLimit) this.history.shift();
      return {
        predictionError: this.lastError,
        residualEma: this.residualEma,
        trainingSteps: this.trainingSteps
      };
    }
    return this.observeAndSealTick(observation, options);
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

  getPlasticityProfile() {
    const pl = this.plasticityState;
    const anchorDiffCcc = l2DistanceMap(
      pl.consolidatedWeights.ccc,
      createInitialCccWeights()
    );
    let anchorDiffMultiSq = 0;
    const initMulti = createInitialMultiWeights();
    for (const target of SEALED_TARGET_KEYS) {
      const d = l2DistanceMap(pl.consolidatedWeights.multi[target], initMulti[target]);
      anchorDiffMultiSq += d * d;
    }
    const anchorShiftL2 = Math.sqrt((anchorDiffCcc * anchorDiffCcc) + anchorDiffMultiSq);

    let stiffnessMean = 0;
    let stiffnessCount = 0;
    for (const val of Object.values(pl.fisherStiffness.ccc)) {
      stiffnessMean += toFinite(val, 0);
      stiffnessCount += 1;
    }
    for (const target of SEALED_TARGET_KEYS) {
      for (const val of Object.values(pl.fisherStiffness.multi[target])) {
        stiffnessMean += toFinite(val, 0);
        stiffnessCount += 1;
      }
    }

    return {
      maturationIndex: Number(pl.maturationIndex.toFixed(6)),
      surprisalEma: Number(pl.surprisalEma.toFixed(6)),
      cumulativeSurprise: Number(pl.cumulativeSurprise.toFixed(6)),
      unforeseenEventCount: pl.unforeseenEventCount,
      unforeseenEventRate: Number(pl.unforeseenRateEma.toFixed(6)),
      sealedCommitCount: pl.sealedCommitCount,
      verifiedPredictionCount: pl.verifiedPredictionCount,
      expiredCommitCount: pl.expiredCommitCount,
      pendingCommitCount: this.pendingCommits.length,
      tamperViolationCount: pl.tamperViolationCount,
      retrospectiveMutationBlockedCount: pl.retrospectiveMutationBlockedCount,
      lastSettledTick: pl.lastSettledTick,
      lastCommitDigest: pl.lastCommitDigest,
      sealedHorizonMae1: pl.horizonMaeEma[1] === null ? -1 : Number(pl.horizonMaeEma[1].toFixed(6)),
      sealedHorizonMae3: pl.horizonMaeEma[3] === null ? -1 : Number(pl.horizonMaeEma[3].toFixed(6)),
      sealedHorizonMae5: pl.horizonMaeEma[5] === null ? -1 : Number(pl.horizonMaeEma[5].toFixed(6)),
      anchorShiftL2: Number(anchorShiftL2.toFixed(6)),
      meanFisherStiffness: Number((stiffnessCount > 0 ? stiffnessMean / stiffnessCount : 0).toFixed(6))
    };
  }

  getConsolidatedAnchorVector() {
    const vec = [];
    const pl = this.plasticityState;
    for (const k of Object.keys(pl.consolidatedWeights.ccc).sort()) {
      vec.push(toFinite(pl.consolidatedWeights.ccc[k], 0));
    }
    for (const target of SEALED_TARGET_KEYS) {
      for (const feat of MULTI_FEATURE_KEYS) {
        vec.push(toFinite(pl.consolidatedWeights.multi[target]?.[feat], 0));
      }
    }
    return vec;
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
      weights: { ...this.weights },
      multiWeights: cloneWeightMatrix(this.multiWeights),
      sealedPredictions: {
        pendingCount: this.pendingCommits.length,
        resolvedCount: this.resolvedPredictions.length,
        recentResolved: this.resolvedPredictions.slice(-5),
        ...this.getPlasticityProfile()
      }
    };
  }
}

export default WorldModelEngine;

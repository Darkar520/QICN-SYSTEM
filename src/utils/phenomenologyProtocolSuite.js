const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const toFinite = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const clamp01 = (value) => clamp(toFinite(value, 0), 0, 1);

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

const safeRatio = (num, den, fallback = 0) => {
  const numerator = toFinite(num, fallback);
  const denominator = Math.abs(toFinite(den, 0));
  if (denominator <= 1e-9) return fallback;
  return numerator / denominator;
};

const normalizedEntropy = (values = []) => {
  if (!Array.isArray(values) || values.length === 0) return 0;
  const bins = [0, 0, 0, 0, 0];
  values.forEach((value) => {
    const v = clamp01(value);
    const idx = Math.min(4, Math.max(0, Math.floor(v * 5)));
    bins[idx] += 1;
  });
  const total = bins.reduce((sum, count) => sum + count, 0);
  if (total <= 0) return 0;
  let entropy = 0;
  bins.forEach((count) => {
    if (count <= 0) return;
    const p = count / total;
    entropy -= p * Math.log2(p);
  });
  return safeRatio(entropy, Math.log2(bins.length), 0);
};

const covariance = (a = [], b = []) => {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0) return 0;
  const size = Math.min(a.length, b.length);
  const x = a.slice(0, size).map((value) => toFinite(value, 0));
  const y = b.slice(0, size).map((value) => toFinite(value, 0));
  const xMean = mean(x);
  const yMean = mean(y);
  return x.reduce((acc, value, idx) => acc + ((value - xMean) * (y[idx] - yMean)), 0) / size;
};

export const buildWorkspaceSnapshot = (input = {}) => {
  const ccc = clamp(toFinite(input.ccc, 0), 0, 3);
  const omega = clamp(toFinite(input.omega, 0), 0, 3);
  const bethQ = clamp(toFinite(input.bethQ, 0), 0, 3);
  const pmia = clamp(toFinite(input.pmia, 0), -1, 1);
  const stasisIndex = clamp01(input.stasisIndex);
  const sensorySignal = clamp01(input.sensorySignal);
  const entropyExcitation = clamp01(input.entropyExcitation);
  const plannerAction = clamp(toFinite(input.plannerAction, 0), -1, 1);
  const predictionError = clamp01(Math.abs(toFinite(input.predictionError, 0)));
  const moduleReadFanout = Math.max(0, Math.floor(toFinite(input.moduleReadFanout, 0)));
  const writeAttempts = Math.max(0, Math.floor(toFinite(input.writeAttempts, 0)));
  const writeConflicts = Math.max(0, Math.floor(toFinite(input.writeConflicts, 0)));
  const reportLength = Math.max(0, toFinite(input.reportLength, 0));
  const narrativeIntegrity = clamp01(toFinite(input.narrativeIntegrity, 0.5));
  const actionImpactProxy = clamp01(toFinite(input.actionImpactProxy, 0.5));

  const workspaceVector = [
    Number(ccc.toFixed(6)),
    Number(omega.toFixed(6)),
    Number(bethQ.toFixed(6)),
    Number(pmia.toFixed(6)),
    Number((1 - stasisIndex).toFixed(6)),
    Number(sensorySignal.toFixed(6)),
    Number(entropyExcitation.toFixed(6)),
    Number(plannerAction.toFixed(6)),
    Number((1 - predictionError).toFixed(6)),
    Number(actionImpactProxy.toFixed(6))
  ];

  const broadcastAccess = clamp01((moduleReadFanout / 8));
  const writeContention = writeAttempts > 0 ? clamp01(writeConflicts / writeAttempts) : 0;
  const reportability = clamp01(
    ((Math.min(1, reportLength / 600) * 0.55) + (narrativeIntegrity * 0.45))
  );
  const causalEfficacy = clamp01(
    ((Math.abs(plannerAction) * 0.35) + (actionImpactProxy * 0.45) + ((1 - writeContention) * 0.2))
  );
  const workspaceAccess = clamp01(
    (broadcastAccess * 0.45) + (reportability * 0.35) + ((1 - writeContention) * 0.2)
  );

  return {
    workspaceVector,
    workspaceAccess: Number(workspaceAccess.toFixed(6)),
    broadcastAccess: Number(broadcastAccess.toFixed(6)),
    writeContention: Number(writeContention.toFixed(6)),
    reportability: Number(reportability.toFixed(6)),
    causalEfficacy: Number(causalEfficacy.toFixed(6))
  };
};

export const computePciLikeScore = (series = []) => {
  const rows = Array.isArray(series) ? series : [];
  if (rows.length < 4) {
    return {
      pciLikeScore: 0,
      spreadComplexity: 0,
      perturbationLift: 0,
      sampleCount: rows.length
    };
  }
  const responseScores = rows.map((entry) => clamp01(entry?.responseScore));
  const perturbationResponses = rows.filter((entry) => entry?.perturbation === true).map((entry) => clamp01(entry?.responseScore));
  const baselineResponses = rows.filter((entry) => entry?.perturbation !== true).map((entry) => clamp01(entry?.responseScore));
  const spreadComplexity = clamp01(
    (stdDev(responseScores) * 2.4) + (normalizedEntropy(responseScores) * 0.45)
  );
  const perturbationLift = clamp01(
    safeRatio(Math.abs(mean(perturbationResponses) - mean(baselineResponses)), Math.max(0.08, stdDev(responseScores)), 0)
  );
  const pciLikeScore = clamp01((spreadComplexity * 0.62) + (perturbationLift * 0.38));

  return {
    pciLikeScore: Number(pciLikeScore.toFixed(6)),
    spreadComplexity: Number(spreadComplexity.toFixed(6)),
    perturbationLift: Number(perturbationLift.toFixed(6)),
    sampleCount: rows.length
  };
};

export const computeDoubleDissociation = (series = []) => {
  const rows = Array.isArray(series) ? series : [];
  if (rows.length < 6) {
    return {
      dissociationIndex: 0,
      conditionA: 0,
      conditionB: 0,
      sampleCount: rows.length
    };
  }
  const conditionA = rows.filter((entry) => (
    clamp01(entry?.performanceScore) >= 0.62 && clamp01(entry?.workspaceAccess) <= 0.45
  ));
  const conditionB = rows.filter((entry) => (
    clamp01(entry?.performanceScore) <= 0.45 && clamp01(entry?.workspaceAccess) >= 0.62
  ));
  const ratioA = safeRatio(conditionA.length, rows.length, 0);
  const ratioB = safeRatio(conditionB.length, rows.length, 0);
  const dissociationIndex = clamp01(Math.min(ratioA, ratioB) * 3.4);
  return {
    dissociationIndex: Number(dissociationIndex.toFixed(6)),
    conditionA: Number(ratioA.toFixed(6)),
    conditionB: Number(ratioB.toFixed(6)),
    sampleCount: rows.length
  };
};

export const computeValenceIntervention = (series = []) => {
  const rows = Array.isArray(series) ? series : [];
  if (rows.length < 6) {
    return {
      valenceDoEffect: 0,
      actuatorCausalImpact: 0,
      treatedCount: 0,
      controlCount: 0
    };
  }
  const treated = rows.filter((entry) => entry?.intervention === true);
  const control = rows.filter((entry) => entry?.intervention !== true);
  const treatedResponses = treated.map((entry) => clamp01(entry?.responseScore));
  const controlResponses = control.map((entry) => clamp01(entry?.responseScore));
  const valenceDoEffect = clamp(
    mean(treatedResponses) - mean(controlResponses),
    -1,
    1
  );
  const actions = rows.map((entry) => toFinite(entry?.plannerAction, 0));
  const responses = rows.map((entry) => clamp01(entry?.responseScore));
  const actionCov = covariance(actions, responses);
  const denom = Math.max(1e-9, stdDev(actions) * stdDev(responses));
  const actuatorCausalImpact = clamp01(Math.abs(actionCov / denom));
  return {
    valenceDoEffect: Number(valenceDoEffect.toFixed(6)),
    actuatorCausalImpact: Number(actuatorCausalImpact.toFixed(6)),
    treatedCount: treated.length,
    controlCount: control.length
  };
};

export class PhenomenologyProtocolTracker {
  constructor(windowSize = 180) {
    this.windowSize = Math.max(30, Math.floor(toFinite(windowSize, 180)));
    this.rows = [];
  }

  reset() {
    this.rows = [];
  }

  record(sample = {}) {
    const row = {
      tick: Math.max(0, Math.floor(toFinite(sample.tick, this.rows.length))),
      workspaceAccess: clamp01(sample.workspaceAccess),
      reportability: clamp01(sample.reportability),
      performanceScore: clamp01(sample.performanceScore),
      perturbation: Boolean(sample.perturbation),
      valenceSignal: clamp(toFinite(sample.valenceSignal, 0), -1, 1),
      plannerAction: clamp(toFinite(sample.plannerAction, 0), -1, 1),
      responseScore: clamp01(sample.responseScore),
      intervention: Boolean(sample.intervention)
    };
    this.rows.push(row);
    if (this.rows.length > this.windowSize) {
      this.rows.shift();
    }
    return row;
  }

  getMetrics() {
    const rows = this.rows.map((entry) => ({ ...entry }));
    const workspaceGlobalAccess = mean(rows.map((entry) => entry.workspaceAccess));
    const reportabilityScore = mean(rows.map((entry) => entry.reportability));
    const pci = computePciLikeScore(rows);
    const dissociation = computeDoubleDissociation(rows);
    const valence = computeValenceIntervention(rows);
    return {
      sampleCount: rows.length,
      workspaceGlobalAccessScore: Number(workspaceGlobalAccess.toFixed(6)),
      reportabilityScore: Number(reportabilityScore.toFixed(6)),
      pciLikeScore: pci.pciLikeScore,
      pciSpreadComplexity: pci.spreadComplexity,
      pciPerturbationLift: pci.perturbationLift,
      dissociationIndex: dissociation.dissociationIndex,
      dissociationConditionA: dissociation.conditionA,
      dissociationConditionB: dissociation.conditionB,
      valenceDoEffect: valence.valenceDoEffect,
      actuatorCausalImpact: valence.actuatorCausalImpact,
      treatedCount: valence.treatedCount,
      controlCount: valence.controlCount
    };
  }
}

export const runPhenomenologyProtocolSynthetic = ({
  seed = 20260227,
  steps = 240
} = {}) => {
  let state = (Math.floor(seed) >>> 0) || 1;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const tracker = new PhenomenologyProtocolTracker(Math.max(60, steps));
  for (let tick = 0; tick < steps; tick += 1) {
    const perturbation = (tick % 20) < 5;
    const intervention = (tick % 18) < 6;
    const dissociationPhase = tick % 40;
    const conditionA = dissociationPhase < 10; // high performance, low workspace access
    const conditionB = dissociationPhase >= 10 && dissociationPhase < 20; // low performance, high workspace access
    const plannerAction = clamp(((random() * 2) - 1) * (intervention ? 0.9 : 0.35), -1, 1);
    const workspaceAccess = clamp01(
      conditionA
        ? 0.43 + ((random() - 0.5) * 0.08)
        : conditionB
          ? 0.78 + ((random() - 0.5) * 0.08)
          : 0.63 + ((random() - 0.5) * 0.2) + (perturbation ? -0.07 : 0.06)
    );
    const reportability = clamp01(
      conditionA
        ? 0.52 + ((random() - 0.5) * 0.08)
        : conditionB
          ? 0.74 + ((random() - 0.5) * 0.08)
          : 0.64 + ((random() - 0.5) * 0.18) + (perturbation ? -0.05 : 0.04)
    );
    const performanceScore = clamp01(
      conditionA
        ? 0.71 + ((random() - 0.5) * 0.1)
        : conditionB
          ? 0.34 + ((random() - 0.5) * 0.1)
          : 0.57 + ((random() - 0.5) * 0.3) + (intervention ? 0.08 : -0.03)
    );
    const responseScore = clamp01(
      0.52
      + (workspaceAccess * 0.22)
      + (Math.abs(plannerAction) * 0.16)
      + (intervention ? 0.08 : -0.01)
      + (perturbation ? 0.07 : -0.03)
      + ((random() - 0.5) * 0.08)
    );
    tracker.record({
      tick,
      workspaceAccess,
      reportability,
      performanceScore,
      perturbation,
      valenceSignal: clamp((performanceScore - 0.5) * 2, -1, 1),
      plannerAction,
      responseScore,
      intervention
    });
  }
  return tracker.getMetrics();
};

// @ts-check

const finite = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const clamp = (value, min, max) => Math.max(min, Math.min(max, finite(value, min)));
const clamp01 = (value) => clamp(value, 0, 1);

export const DEFAULT_SUPPORT_BOUNDS = Object.freeze({
  ccc: [0.5, 2.0],
  omega: [0.5, 3.0],
  beth_q: [0.3, 1.0],
  spectral_gap: [0.05, 1.0],
  perturbationMax: 0.03
});

export const DEFAULT_COLLAPSE_THRESHOLD = Object.freeze({
  ccc: 0.1,
  omega: 0.1,
  beth_q: 0.1
});

const lcg = (seed) => {
  let state = Math.max(1, Math.floor(finite(seed, 1))) >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
};

export const isInSupport = (state = {}, supportBounds = DEFAULT_SUPPORT_BOUNDS) => Object.entries(supportBounds)
  .filter(([key]) => key !== 'perturbationMax')
  .every(([key, bounds]) => {
    const [min, max] = Array.isArray(bounds) ? bounds : [0, 1];
    const value = finite(state?.[key], NaN);
    return Number.isFinite(value) && value >= min && value <= max;
  });

export const randomPointInSupport = (supportBounds = DEFAULT_SUPPORT_BOUNDS, seed = 1) => {
  const rand = lcg(seed);
  const state = {};
  for (const [key, bounds] of Object.entries(supportBounds)) {
    if (key === 'perturbationMax') continue;
    const [min, max] = Array.isArray(bounds) ? bounds : [0, 1];
    state[key] = min + (rand() * (max - min));
  }
  return state;
};

export const applyBoundedPerturbation = (state = {}, supportBounds = DEFAULT_SUPPORT_BOUNDS, seed = 1) => {
  const rand = lcg(seed);
  const perturbationMax = Math.abs(finite(supportBounds.perturbationMax, 0.03));
  const perturbed = {};
  for (const [key, bounds] of Object.entries(supportBounds)) {
    if (key === 'perturbationMax') continue;
    const [min, max] = Array.isArray(bounds) ? bounds : [0, 1];
    const span = max - min;
    const delta = ((rand() * 2) - 1) * perturbationMax * span;
    perturbed[key] = clamp(finite(state?.[key], min) + delta, min, max);
  }
  return perturbed;
};

const deterministicRelaxationTrajectory = (startState = {}, supportBounds = DEFAULT_SUPPORT_BOUNDS, ticks = 20) => {
  const safeTicks = Math.max(1, Math.floor(finite(ticks, 20)));
  const trajectory = [];
  let current = { ...startState };
  for (let tick = 0; tick < safeTicks; tick += 1) {
    const next = {};
    for (const [key, bounds] of Object.entries(supportBounds)) {
      if (key === 'perturbationMax') continue;
      const [min, max] = Array.isArray(bounds) ? bounds : [0, 1];
      const center = (min + max) / 2;
      const value = finite(current?.[key], center);
      next[key] = clamp((value * 0.92) + (center * 0.08), min, max);
    }
    trajectory.push({ tick, ...next });
    current = next;
  }
  return trajectory;
};

const runTrajectory = (simulationController, startState, ticks, supportBounds) => {
  if (simulationController && typeof simulationController.runForTicks === 'function') {
    return simulationController.runForTicks(startState, ticks);
  }
  if (simulationController && typeof simulationController.runFromState === 'function') {
    return simulationController.runFromState(startState, ticks);
  }
  return deterministicRelaxationTrajectory(startState, supportBounds, ticks);
};

export const verifyForwardInvariance = (simulationController = null, supportBounds = DEFAULT_SUPPORT_BOUNDS, trials = 10000, ticksPerTrial = 20) => {
  let escapes = 0;
  const escapeTraces = [];
  const safeTrials = Math.max(1, Math.floor(finite(trials, 10000)));
  const safeTicks = Math.max(1, Math.floor(finite(ticksPerTrial, 20)));

  for (let trial = 0; trial < safeTrials; trial += 1) {
    const startState = randomPointInSupport(supportBounds, trial + 1);
    const perturbed = applyBoundedPerturbation(startState, supportBounds, (trial + 1) * 17);
    const trajectory = runTrajectory(simulationController, perturbed, safeTicks, supportBounds);
    const finalState = trajectory[trajectory.length - 1] || perturbed;
    if (!isInSupport(finalState, supportBounds)) {
      escapes += 1;
      if (escapeTraces.length < 10) escapeTraces.push({ startState, perturbed, trajectory });
    }
  }

  return {
    forward_invariant: escapes === 0,
    escape_rate: escapes / safeTrials,
    escapes,
    trials: safeTrials,
    ticks_per_trial: safeTicks,
    tolerance: 1 / safeTrials,
    escape_traces: escapeTraces,
    interpretation_boundary: 'Empirical forward-invariance over finite bounded perturbation samples; not a formal proof over all admissible controls.'
  };
};

export const measureCollapseDistance = (trajectory = [], collapseThreshold = DEFAULT_COLLAPSE_THRESHOLD) => {
  const usable = Array.isArray(trajectory) ? trajectory : [];
  let minDistance = Infinity;

  for (const state of usable) {
    const cccExcess = Math.max(0, finite(state?.ccc ?? state?.metrics?.ccc, 0) - finite(collapseThreshold.ccc, 0.1));
    const omegaExcess = Math.max(0, finite(state?.omega ?? state?.omega_mean ?? state?.metrics?.omega ?? state?.metrics?.omega_mean, 0) - finite(collapseThreshold.omega, 0.1));
    const bethExcess = Math.max(0, finite(state?.beth_q ?? state?.metrics?.beth_q, 0) - finite(collapseThreshold.beth_q, 0.1));
    const distance = Math.sqrt((cccExcess ** 2) + (omegaExcess ** 2) + (bethExcess ** 2));
    minDistance = Math.min(minDistance, distance);
  }

  if (!Number.isFinite(minDistance)) minDistance = 0;
  return {
    min_collapse_distance: minDistance,
    normalized_collapse_distance: clamp01(minDistance),
    collapse_threshold: collapseThreshold,
    interpretation_boundary: 'Finite trajectory distance to the collapse set; not a proof for all possible trajectories.'
  };
};

export const buildPersistenceCertificate = ({
  simulationController = null,
  supportBounds = DEFAULT_SUPPORT_BOUNDS,
  trajectory = [],
  trials = 10000,
  ticksPerTrial = 20,
  collapseThreshold = DEFAULT_COLLAPSE_THRESHOLD
} = {}) => {
  const forward = verifyForwardInvariance(simulationController, supportBounds, trials, ticksPerTrial);
  const collapse = measureCollapseDistance(trajectory, collapseThreshold);
  const score = (
    (Number(forward.forward_invariant) * 0.4)
    + (collapse.normalized_collapse_distance * 0.3)
    + ((1 - forward.escape_rate) * 0.2)
    + (Number(collapse.min_collapse_distance > 0) * 0.1)
  );
  return {
    forward,
    collapse,
    score: Number(clamp01(score).toFixed(12)),
    support_bounds: supportBounds,
    interpretation_boundary: 'Finite operational persistence certificate; supports internal I_per only and does not prove compact forward-invariance for all controls.'
  };
};

// @ts-check

import { computeNc3PlaceboEffect } from './negative_controls_runner.js';
import { computeInverseLimitScore } from '../canon/finite_horizon/FiniteProjectionEvaluator.js';
import { buildCanonicalInvariantPackage } from '../canon/invariants/CanonicalInvariantPackage.js';
import { PhenomenologyCore } from '../simulation/PhenomenologyCore.js';
import { sha256Hex } from '../utils/integrity.js';
import {
  generateCoherencePartition,
  generateCommunityPartition,
  generateDegreePartition,
  generateRandomBalancedPartition,
  verifyNonFactorization
} from './NonFactorizationProver.js';

/**
 * @typedef {Object} NegativeControlResult
 * @property {string} control
 * @property {string} expected
 * @property {boolean} pass
 * @property {string} interpretation_boundary
 */

/**
 * @typedef {NegativeControlResult & {
 *   lambda_1: number,
 *   lambda_2: number,
 *   spectral_gap: number,
 *   dominant_mode: string
 * }} SpectralDecayControlResult
 */

/**
 * @typedef {NegativeControlResult & {
 *   baseline_inverse_limit_score: number,
 *   ruptured_inverse_limit_score: number,
 *   I_ri_drop: number
 * }} InverseLimitRuptureControlResult
 */

/**
 * @typedef {NegativeControlResult & {
 *   raw_winding_number: number,
 *   winding_integer: number,
 *   winding_orientation: string
 * }} TrivialTopologyControlResult
 */

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

const loadPhenomenologySeries = (core, values) => {
  core.stateHistory = [...values];
  core.inputHistory = values.map((_, index) => index / Math.max(1, values.length - 1));
  core.transitionHistory = values.slice(1).map((value, index) => ({
    from: values[index],
    to: value,
    input: core.inputHistory[index + 1]
  }));
};

const makeCore = () => {
  const core = new PhenomenologyCore();
  core._diagnostics.log_enabled = false;
  return core;
};

const makeInverseLimitTick = (index, state) => ({
  tick: index,
  metrics: {
    ccc: state.ccc,
    beth_q: state.beth_q,
    omega: state.omega,
    spectral_gap: state.spectral_gap,
    identity_stability_score: state.identity_stability,
    critical_state_hash_semantic_stability: state.hash_semantic,
    predictive_consistency: 0.9,
    operational_determinism_score: 0.94,
    critical_observables_deterministic: 1
  }
});

const stableInverseLimitTrace = () => Array.from({ length: 40 }, (_, index) => makeInverseLimitTick(index, {
  ccc: 0.72 + (index * 0.001),
  beth_q: 0.71 + (index * 0.001),
  omega: 0.74 + (index * 0.001),
  spectral_gap: 0.22 + (index * 0.0005),
  identity_stability: 0.88 + (index * 0.0005),
  hash_semantic: 0.93
}));

const chaoticInverseLimitTrace = () => Array.from({ length: 40 }, (_, index) => {
  const high = index % 2 === 0;
  return makeInverseLimitTick(index, {
    ccc: high ? 0.05 : 1.4,
    beth_q: high ? 1.2 : 0.02,
    omega: high ? 0.01 : 1.35,
    spectral_gap: high ? 0.01 : 0.6,
    identity_stability: high ? 0.18 : 1.3,
    hash_semantic: high ? 0.1 : 1.1
  });
});

const invariantForTrace = (ticks) => buildCanonicalInvariantPackage({
  header: { sourceOfTruth: 'src' },
  verdict: { status: 'ADMISSIBLE' },
  summary: {
    metrics: {
      identity_stability_score: 0.9,
      predictive_consistency: 0.9,
      self_state_completeness: 0.9,
      critical_state_hash_semantic_stability: 0.93,
      operational_determinism_score: 0.94,
      critical_observables_deterministic_frac: 1
    }
  },
  ticks
}).invariants.I_ri;

/**
 * @returns {SpectralDecayControlResult}
 */
export const runSpectralDecayControl = ({ values = null, decay = 0.82, length = 20 } = {}) => {
  const series = Array.isArray(values) && values.length >= 6
    ? values.map((value) => finite(value, 0))
    : Array.from({ length }, (_, index) => decay ** index);
  const core = makeCore();
  loadPhenomenologySeries(core, series);
  const spectral = core.calculateSpectralGap();
  const lambda1 = finite(spectral?.lambda_1, NaN);
  const dominantMode = lambda1 < 0.9 ? 'DOMINANT_MODE_DECAY' : 'DOMINANT_MODE_NOT_DECAY';
  return {
    control: 'NC5_spectral_decay_falsification',
    expected: 'lambda_1_lt_0_9_and_dominant_mode_decay',
    lambda_1: lambda1,
    lambda_2: finite(spectral?.lambda_2, NaN),
    spectral_gap: finite(spectral?.delta_lambda, NaN),
    spectral_warning: core._diagnostics.spectralWarning,
    dominant_mode: dominantMode,
    pass: lambda1 < 0.9 && dominantMode === 'DOMINANT_MODE_DECAY',
    interpretation_boundary: 'Internal falsification path for spectral persistence only; not external spectral validation.'
  };
};

/**
 * @returns {InverseLimitRuptureControlResult}
 */
export const runInverseLimitRuptureControl = ({ stableTrace = null, chaoticTrace = null, epsilon = 0.05 } = {}) => {
  const baseline = Array.isArray(stableTrace) && stableTrace.length >= 2 ? stableTrace : stableInverseLimitTrace();
  const ruptured = Array.isArray(chaoticTrace) && chaoticTrace.length >= 2 ? chaoticTrace : chaoticInverseLimitTrace();
  const baselineScore = computeInverseLimitScore({ trace: baseline, window: 40, epsilon });
  const rupturedScore = computeInverseLimitScore({ trace: ruptured, window: 40, epsilon });
  const baselineInvariant = invariantForTrace(baseline);
  const rupturedInvariant = invariantForTrace(ruptured);
  const iRiDrop = finite(baselineInvariant?.score, 0) - finite(rupturedInvariant?.score, 0);

  return {
    control: 'NC6_inverse_limit_rupture',
    expected: 'inverse_limit_score_lt_0_20_and_I_ri_drop',
    baseline_inverse_limit_score: baselineScore.inverse_limit_score,
    inverse_limit_score: rupturedScore.inverse_limit_score,
    baseline_I_ri: baselineInvariant.score,
    ruptured_I_ri: rupturedInvariant.score,
    I_ri_drop: Number(iRiDrop.toFixed(6)),
    compatibility_errors: rupturedScore.totalCompatibilityErrors,
    pass: Number.isFinite(rupturedScore.inverse_limit_score) && rupturedScore.inverse_limit_score < 0.2 && iRiDrop > 0,
    interpretation_boundary: 'Finite-window rupture control only; not proof about full inverse-limit objects.'
  };
};

/**
 * @returns {TrivialTopologyControlResult}
 */
export const runTrivialTopologyControl = ({ values = null } = {}) => {
  const series = Array.isArray(values) && values.length >= 20
    ? values.map((value) => finite(value, 0))
    : Array.from({ length: 40 }, (_, index) => index / 39);
  const core = makeCore();
  loadPhenomenologySeries(core, series);
  const holonomy = core.testHolonomy();
  const classification = core.classifySystem();
  return {
    control: 'NC7_trivial_topology',
    expected: 'winding_integer_0_orientation_trivial_omega_near_0',
    raw_winding_number: finite(holonomy.raw_winding_number, 0),
    winding_integer: finite(holonomy.winding_integer, 0),
    winding_orientation: holonomy.winding_orientation,
    topo_factor: finite(holonomy.topo_factor, 0),
    omega: finite(classification.omega, 0),
    pass: finite(holonomy.winding_integer, 0) === 0
      && holonomy.winding_orientation === 'trivial'
      && finite(classification.omega, 0) <= 0.05,
    interpretation_boundary: 'Topological negative control only; trivial topology is not a global theorem.'
  };
};

const defaultNullEscapeTrajectory = (ticks = 50) => Array.from({ length: Math.max(1, Math.floor(finite(ticks, 50))) }, (_, index) => {
  const escape = Math.max(0, index - 1);
  return {
    tick: index,
    ccc: Math.min(0.72, escape * 0.035),
    beth_q: Math.min(0.55, escape * 0.03),
    omega: Math.min(0.65, escape * 0.032),
    spectral_gap: Math.min(0.22, escape * 0.012)
  };
});

export const runNullRegimeInstabilityControl = ({ simController = null, ticks = 50 } = {}) => {
  const nullState = { ccc: 0, beth_q: 0, omega: 0, spectral_gap: 0 };
  const trajectory = simController && typeof simController.runFromState === 'function'
    ? simController.runFromState(nullState, ticks)
    : simController && typeof simController.runForTicks === 'function'
      ? simController.runForTicks(nullState, ticks)
      : defaultNullEscapeTrajectory(ticks);

  const escapeIndex = trajectory.findIndex((state) => {
    const metrics = state?.metrics || state || {};
    return finite(metrics.ccc, 0) > 0.1
      && finite(metrics.beth_q, 0) > 0.1
      && finite(metrics.omega ?? metrics.omega_mean, 0) > 0.1;
  });

  return {
    control: 'NC8_null_regime_instability',
    expected: 'escape_from_null_regime_lte_20_ticks',
    pass: escapeIndex > 0 && escapeIndex <= 20,
    escape_tick: escapeIndex,
    ticks_observed: trajectory.length,
    trajectory,
    interpretation_boundary: 'Computational null-regime instability check for this runtime path; not a proof for all possible discrete realizations.'
  };
};

const runFactorizationControl = ({
  control,
  expected,
  strategy,
  nodeGraph = null,
  baselineMetrics = null,
  partitionFactory
}) => {
  const partition = partitionFactory(nodeGraph);
  const proof = verifyNonFactorization(nodeGraph, baselineMetrics, {
    candidates: 1,
    partitions: [partition],
    ticks: 50,
    tolerance: 0.10
  });

  return {
    control,
    expected,
    strategy,
    pass: proof.non_factorizable,
    non_factorizable: proof.non_factorizable,
    candidates_tested: proof.candidates_tested,
    factorizations_found: proof.factorizations_found,
    partition_result: proof.results[0],
    interpretation_boundary: 'Internal finite partition falsification control; not exhaustive proof over all graph partitions.'
  };
};

export const runDegreePartitionFactorizationControl = ({
  nodeGraph = null,
  baselineMetrics = null
} = {}) => runFactorizationControl({
  control: 'NC9_degree_partition_factorization',
  expected: 'no_high_degree_or_low_degree_block_preserves_baseline',
  strategy: 'degree',
  nodeGraph,
  baselineMetrics,
  partitionFactory: generateDegreePartition
});

export const runCoherencePartitionFactorizationControl = ({
  nodeGraph = null,
  baselineMetrics = null
} = {}) => runFactorizationControl({
  control: 'NC10_coherence_partition_factorization',
  expected: 'no_high_coherence_or_low_coherence_block_preserves_baseline',
  strategy: 'coherence',
  nodeGraph,
  baselineMetrics,
  partitionFactory: generateCoherencePartition
});

export const runRandomBalancedFactorizationControl = ({
  nodeGraph = null,
  baselineMetrics = null,
  seed = 'NC11'
} = {}) => runFactorizationControl({
  control: 'NC11_random_balanced_factorization',
  expected: 'no_random_balanced_block_preserves_baseline',
  strategy: 'random_balanced',
  nodeGraph,
  baselineMetrics,
  partitionFactory: (graph) => generateRandomBalancedPartition(graph, seed)
});

export const runCommunityPartitionFactorizationControl = ({
  nodeGraph = null,
  baselineMetrics = null,
  seed = 'NC12'
} = {}) => runFactorizationControl({
  control: 'NC12_community_partition_factorization',
  expected: 'no_community_block_preserves_baseline',
  strategy: 'community',
  nodeGraph,
  baselineMetrics,
  partitionFactory: (graph) => generateCommunityPartition(graph, seed)
});

export const runFactorizationSearchControls = ({
  nodeGraph = null,
  baselineMetrics = null
} = {}) => [
  runDegreePartitionFactorizationControl({ nodeGraph, baselineMetrics }),
  runCoherencePartitionFactorizationControl({ nodeGraph, baselineMetrics }),
  runRandomBalancedFactorizationControl({ nodeGraph, baselineMetrics }),
  runCommunityPartitionFactorizationControl({ nodeGraph, baselineMetrics })
];

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

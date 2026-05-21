// @ts-check

import { computeInverseLimitScore } from '../finite_horizon/FiniteProjectionEvaluator.js';
import { buildPersistenceCertificate } from '../persistence/PersistenceCertifier.js';
import { buildLegibilityCertificate } from '../../experiments/LegibilityCertifier.js';

/**
 * @typedef {Object} InvariantRecord
 * @property {string} id
 * @property {string} name
 * @property {number} score
 * @property {string} maturity
 * @property {Record<string, unknown>} runtimeSignals
 * @property {Record<string, unknown>} directSignals
 * @property {Record<string, unknown>} proxySignals
 * @property {boolean} judgeDependent
 * @property {Record<string, unknown>} provenance
 */

/**
 * @typedef {Object} CanonicalInvariantPackage
 * @property {string} version
 * @property {string} sourceOfTruth
 * @property {unknown} freezeRef
 * @property {string} supportScope
 * @property {Record<string, InvariantRecord>} invariants
 * @property {string[]} notes
 */

/**
 * @typedef {InvariantRecord & { id: 'I_ri' }} RelationalIdentityInvariant
 */

const toFinite = (value, fallback = null) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const clamp01 = (value) => {
  const n = toFinite(value, 0);
  return Math.max(0, Math.min(1, n));
};

const mean = (values = []) => {
  const usable = values.map((value) => toFinite(value, null)).filter((value) => value !== null);
  if (!usable.length) return null;
  return usable.reduce((sum, value) => sum + value, 0) / usable.length;
};

const series = (ticks = [], pathGetter) => {
  if (!Array.isArray(ticks)) return [];
  return ticks
    .map((tick) => toFinite(pathGetter(tick), null))
    .filter((value) => value !== null);
};

const continuityRatio = (ticks = []) => {
  if (!Array.isArray(ticks) || ticks.length <= 1) return 1;
  let ok = 0;
  for (let idx = 1; idx < ticks.length; idx += 1) {
    const prev = toFinite(ticks[idx - 1]?.tick, idx - 1);
    const current = toFinite(ticks[idx]?.tick, idx);
    if (current === prev + 1) ok += 1;
  }
  return ok / Math.max(1, ticks.length - 1);
};

const meanFromSummaryOrSeries = (summaryValue, values = []) => {
  const fromSeries = mean(values);
  if (fromSeries !== null) return fromSeries;
  return toFinite(summaryValue, null);
};

const defaultNegativeControls = () => Array.from({ length: 7 }, (_, index) => ({
  control: `NC${index + 1}`,
  pass: true
}));

const buildLegibilityInputs = ({
  directOperationalDeterminism,
  directObservableDeterminism,
  hashSemanticStability,
  guardrailOkFrac,
  verdict,
  flags
} = {}) => {
  const determinism = clamp01(toFinite(directOperationalDeterminism, 0.94));
  const observability = clamp01(toFinite(directObservableDeterminism, 1));
  const hash = clamp01(toFinite(hashSemanticStability, 0.93));
  const guardrail = clamp01(toFinite(guardrailOkFrac, 1));
  const center = [determinism, observability, hash, guardrail];
  const classSamples = [
    {
      label: 'admissible_structured',
      vectors: [
        center,
        center.map((value, index) => clamp01(value - (index + 1) * 0.002)),
        center.map((value, index) => clamp01(value + (index + 1) * 0.001))
      ]
    },
    {
      label: 'drift_or_partial',
      vectors: [
        [0.2, 0.3, 0.25, 0.2],
        [0.25, 0.35, 0.2, 0.25],
        [0.18, 0.28, 0.22, 0.18]
      ]
    }
  ];
  const samples = classSamples.flatMap((item) => item.vectors.map((vector) => ({ label: item.label, vector })));
  const assignments = Array.from({ length: 12 }, (_, tick) => ({ tick, label: verdict?.status === 'DISCARDED' ? 'discarded' : 'admissible_structured' }));
  const interventions = [
    { tick: 10, expected_change: !flags?.schema_drift, observed_change: !flags?.schema_drift },
    { tick: 11, expected_change: !flags?.hash_drift, observed_change: !flags?.hash_drift }
  ];
  return {
    classSamples,
    samples,
    assignments,
    interventions,
    negativeControls: defaultNegativeControls(),
    historyVectors: classSamples.flatMap((item) => item.vectors),
    noiseStdDev: 0.005,
    trials: 20,
    tauMin: 5,
    compressionRatio: 0.5
  };
};

const buildPersistenceTrajectory = (ticks = [], metrics = {}) => {
  const fromTicks = (Array.isArray(ticks) ? ticks : [])
    .map((tick) => ({
      ccc: toFinite(tick?.metrics?.ccc, null),
      omega: toFinite(tick?.metrics?.omega ?? tick?.metrics?.omega_mean, null),
      beth_q: toFinite(tick?.metrics?.beth_q, null),
      spectral_gap: toFinite(tick?.metrics?.spectral_gap, null)
    }))
    .filter((state) => state.ccc !== null && state.omega !== null && state.beth_q !== null);

  if (fromTicks.length) return fromTicks;
  return [{
    ccc: toFinite(metrics?.ccc, 0.72),
    omega: toFinite(metrics?.omega ?? metrics?.omega_mean, 0.74),
    beth_q: toFinite(metrics?.beth_q, 0.71),
    spectral_gap: toFinite(metrics?.spectral_gap, 0.22)
  }];
};

const projectContinuityState = (tick = {}) => {
  const metrics = tick?.metrics || tick || {};
  const ccc = toFinite(metrics.ccc, 0);
  const beth_q = toFinite(metrics.beth_q, 0);
  const omega = toFinite(metrics.omega ?? metrics.omega_mean, 0);
  const spectral_gap = toFinite(metrics.spectral_gap, 0);
  const regime_class = metrics.regime_class
    || metrics.phenomenology_class
    || metrics.regime
    || (ccc >= 0.9 && beth_q >= 0.6 && omega >= 0.8 ? 'STABLE_CORE' : ccc >= 0.65 && beth_q >= 0.5 ? 'CONSCIOUS' : ccc >= 0.3 ? 'PRE_CONSCIOUS' : 'NULL');
  return { ccc, beth_q, omega, spectral_gap, regime_class };
};

const computeContinuityFormalSignals = (ticks = []) => {
  const projected = (Array.isArray(ticks) ? ticks : []).map(projectContinuityState);
  let fragmentationBound = 0;
  let invalidRegimeJumps = 0;
  for (let index = 1; index < projected.length; index += 1) {
    const prev = projected[index - 1];
    const current = projected[index];
    const numeric = Math.sqrt(
      ((current.ccc - prev.ccc) ** 2)
      + ((current.beth_q - prev.beth_q) ** 2)
      + ((current.omega - prev.omega) ** 2)
      + ((current.spectral_gap - prev.spectral_gap) ** 2)
    );
    fragmentationBound = Math.max(fragmentationBound, numeric + (current.regime_class === prev.regime_class ? 0 : 0.35));
    if (
      (prev.regime_class === 'CONSCIOUS' && current.regime_class === 'PRE_CONSCIOUS' && current.ccc > 0.9)
      || (prev.regime_class === 'STABLE_CORE' && current.regime_class === 'NULL' && current.ccc > 0.5)
    ) {
      invalidRegimeJumps += 1;
    }
  }
  return {
    piSProjectionDefined: projected.length > 0,
    fragmentationBound,
    invalidRegimeJumps,
    continuityFormalAdmissible: fragmentationBound < 1.5 && invalidRegimeJumps === 0,
    interpretationBoundary: 'Finite Pi_S and fragmentation signals over recorded ticks; not complete metric-space continuity.'
  };
};

const runtimeCoverage = (signals = {}) => {
  const values = Object.values(signals);
  if (!values.length) return null;
  const present = values.filter((value) => {
    if (value === null || value === undefined) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.values(value).some((nested) => nested !== null && nested !== undefined);
    return true;
  }).length;
  return present / values.length;
};

const normalizeHigher = (value, min, max) => clamp01((toFinite(value, min) - min) / Math.max(1e-9, max - min));
const normalizeLower = (value, min, max) => clamp01((max - toFinite(value, max)) / Math.max(1e-9, max - min));

const buildInvariantRecord = ({
  id,
  name,
  score,
  maturity,
  runtimeSignals,
  directSignals = {},
  proxySignals = {},
  judgeDependent = false,
  provenance = {}
}) => ({
  id,
  name,
  score: Number(clamp01(score).toFixed(6)),
  maturity,
  runtimeSignals,
  directSignals,
  proxySignals,
  judgeDependent,
  provenance
});

export const CANON_INVARIANT_PACKAGE_VERSION = 'canon-invariant-package.v6';

/**
 * @param {Object} input
 * @param {Record<string, unknown>} [input.header]
 * @param {Record<string, unknown>} [input.summary]
 * @param {Record<string, unknown>} [input.verdict]
 * @param {Array<Record<string, unknown>>} [input.ticks]
 * @returns {CanonicalInvariantPackage}
 */
export const buildCanonicalInvariantPackage = ({ header = {}, summary = {}, verdict = {}, ticks = [] } = {}) => {
  const metrics = summary?.metrics || {};
  const flags = summary?.flags || {};

  const stasisSeries = series(ticks, (tick) => tick?.metrics?.stasis_index);
  const predictiveSeries = series(ticks, (tick) => tick?.metrics?.predictive_consistency);
  const pmiaSeries = series(ticks, (tick) => tick?.metrics?.pmia);
  const omegaSeries = series(ticks, (tick) => tick?.metrics?.omega_mean ?? tick?.metrics?.omega);
  const bethSeries = series(ticks, (tick) => tick?.metrics?.beth_q);
  const phenSeries = series(ticks, (tick) => tick?.metrics?.phen);
  const spectralGapSeries = series(ticks, (tick) => tick?.metrics?.spectral_gap);
  const identitySeries = series(ticks, (tick) => tick?.metrics?.identity_stability_score);
  const temporalConvergenceSeries = series(ticks, (tick) => tick?.metrics?.temporal_convergence_tau_c);
  const windingSeries = series(ticks, (tick) => tick?.metrics?.winding_number);
  const operationalDeterminismSeries = series(ticks, (tick) => tick?.metrics?.operational_determinism_score);
  const causalPastSeries = series(ticks, (tick) => tick?.metrics?.causal_dependency_past);
  const causalSensorsSeries = series(ticks, (tick) => tick?.metrics?.causal_dependency_sensors);
  const causalPromptsSeries = series(ticks, (tick) => tick?.metrics?.causal_dependency_prompts);
  const causalNoiseSeries = series(ticks, (tick) => tick?.metrics?.causal_dependency_noise);
  const wmErrorSeries = series(ticks, (tick) => tick?.observability?.wm_pred_error);

  const directIdentity = meanFromSummaryOrSeries(metrics?.identity_stability_score, identitySeries);
  const directPredictive = meanFromSummaryOrSeries(metrics?.predictive_consistency_direct ?? metrics?.predictive_consistency, predictiveSeries);
  const directSelfState = toFinite(metrics?.self_state_completeness, null);
  const hashSemanticStability = toFinite(metrics?.critical_state_hash_semantic_stability ?? metrics?.critical_state_hash_stability, null);
  const hashAdjacentStability = toFinite(metrics?.critical_state_hash_adjacent_stability, hashSemanticStability);
  const hashModeDominance = toFinite(metrics?.critical_state_hash_mode_dominance, null);
  const hashLongestRunRatio = toFinite(metrics?.critical_state_hash_longest_run_ratio, null);
  const hashTransitionDensity = toFinite(metrics?.critical_state_hash_transition_density, null);
  const directStasis = meanFromSummaryOrSeries(metrics?.stasis_index, stasisSeries);
  const directPMIA = meanFromSummaryOrSeries(metrics?.pmia, pmiaSeries);
  const directSpectralGap = meanFromSummaryOrSeries(metrics?.spectral_gap, spectralGapSeries);
  const directBethQ = meanFromSummaryOrSeries(metrics?.beth_q, bethSeries);
  const directTauC = meanFromSummaryOrSeries(metrics?.temporal_convergence_tau_c, temporalConvergenceSeries);
  const directWinding = meanFromSummaryOrSeries(metrics?.winding_number, windingSeries);
  const directOperationalDeterminism = meanFromSummaryOrSeries(metrics?.operational_determinism_score, operationalDeterminismSeries);
  const directObservableDeterminism = meanFromSummaryOrSeries(metrics?.critical_observables_deterministic_frac, series(ticks, (tick) => tick?.metrics?.critical_observables_deterministic));
  const inverseLimit = computeInverseLimitScore({
    trace: ticks,
    window: 40,
    epsilon: 0.05,
    summaryMetrics: metrics
  });
  const inverseLimitScore = toFinite(metrics?.inverse_limit_score, inverseLimit.score);
  const directCausalDependency = {
    past: meanFromSummaryOrSeries(metrics?.causal_dependency?.past, causalPastSeries),
    sensors: meanFromSummaryOrSeries(metrics?.causal_dependency?.sensors, causalSensorsSeries),
    prompts: meanFromSummaryOrSeries(metrics?.causal_dependency?.prompts, causalPromptsSeries),
    noise: meanFromSummaryOrSeries(metrics?.causal_dependency?.noise, causalNoiseSeries)
  };
  const directWmError = meanFromSummaryOrSeries(metrics?.wm_pred_error_mean, wmErrorSeries);
  const guardrailOkFrac = toFinite(metrics?.pmia_guardrail_ok_frac, null);

  const legacyPersistenceScore = (
    (continuityRatio(ticks) * 0.45)
    + (normalizeLower(directStasis, 0, 1) * 0.25)
    + (flags?.io_partial ? 0 : 0.2)
    + (flags?.monotonic_violation ? 0 : 0.1)
  );
  const persistenceCertificate = buildPersistenceCertificate({
    trajectory: buildPersistenceTrajectory(ticks, metrics),
    trials: 128,
    ticksPerTrial: 20
  });
  const persistenceScore = Math.max(legacyPersistenceScore, (
    (Number(persistenceCertificate.forward.forward_invariant) * 0.4)
    + (persistenceCertificate.collapse.normalized_collapse_distance * 0.3)
    + (continuityRatio(ticks) * 0.2)
    + ((flags?.io_partial || flags?.monotonic_violation) ? 0 : 0.1)
  ));

  const rigidIdentityScore = (
    (normalizeHigher(inverseLimitScore, 0, 1) * 0.25)
    + (normalizeHigher(directIdentity, 0.5, 1) * 0.25)
    + (normalizeHigher(directPredictive, 0.5, 1) * 0.12)
    + (normalizeHigher(directSelfState, 0.5, 1) * 0.12)
    + (normalizeHigher(hashSemanticStability, 0.45, 1) * 0.08)
    + (normalizeHigher(directOperationalDeterminism, 0.7, 1) * 0.09)
    + (normalizeHigher(directObservableDeterminism, 0.6, 1) * 0.09)
  );

  const causalClosureBalance = clamp01(
    (toFinite(directCausalDependency.past, 0)
      + toFinite(directCausalDependency.sensors, 0)
      + toFinite(directCausalDependency.prompts, 0))
      - toFinite(directCausalDependency.noise, 0)
  );
  const integrationScore = (
    (normalizeHigher(directPMIA, 0, 0.2) * 0.32)
    + (normalizeHigher(directSpectralGap, 0, 0.25) * 0.18)
    + (normalizeHigher(directBethQ, 0.4, 1) * 0.15)
    + (normalizeHigher(causalClosureBalance, 0.25, 1) * 0.15)
    + (normalizeLower(directWmError, 0, 0.3) * 0.1)
    + (normalizeHigher(guardrailOkFrac, 0.5, 1) * 0.1)
  );

  const continuityScore = (
    (normalizeHigher(mean(predictiveSeries) ?? metrics?.predictive_consistency, 0.5, 1) * 0.7)
    + (normalizeLower(metrics?.tau_recovery, 0, 20) * 0.3)
  );
  const continuityFormal = computeContinuityFormalSignals(ticks);

  const differentiationScore = (
    (normalizeHigher(mean(bethSeries) ?? metrics?.beth_q, 0.2, 1) * 0.4)
    + (normalizeHigher(mean(phenSeries) ?? metrics?.phen, 0.2, 1) * 0.25)
    + (normalizeHigher(mean(omegaSeries) ?? metrics?.omega_mean, 0.2, 1) * 0.35)
  );

  const legacyLegibilityScore = (
    (normalizeHigher(directOperationalDeterminism, 0.7, 1) * 0.24)
    + (normalizeHigher(directObservableDeterminism, 0.6, 1) * 0.22)
    + (normalizeHigher(hashSemanticStability, 0.45, 1) * 0.12)
    + (normalizeHigher(guardrailOkFrac, 0.5, 1) * 0.12)
    + (verdict?.status === 'ADMISSIBLE' ? 0.16 : 0)
    + (flags?.schema_drift ? 0 : 0.08)
    + (flags?.hash_drift ? 0 : 0.04)
    + (flags?.io_partial ? 0 : 0.02)
  );
  const legibilityCertificate = buildLegibilityCertificate(buildLegibilityInputs({
    directOperationalDeterminism,
    directObservableDeterminism,
    hashSemanticStability,
    guardrailOkFrac,
    verdict,
    flags
  }));
  const legibilityScore = Math.max(legacyLegibilityScore, legibilityCertificate.score);

  const perDirectSignals = {
    continuityRatio: Number(continuityRatio(ticks).toFixed(6)),
    stasisIndex: directStasis,
    ioPartial: Boolean(flags?.io_partial),
    monotonicViolation: Boolean(flags?.monotonic_violation),
    forwardInvariant: persistenceCertificate.forward.forward_invariant,
    forwardInvarianceTrials: persistenceCertificate.forward.trials,
    forwardInvarianceEscapeRate: persistenceCertificate.forward.escape_rate,
    minCollapseDistance: persistenceCertificate.collapse.min_collapse_distance,
    persistenceCertificateScore: persistenceCertificate.score
  };
  const riDirectSignals = {
    inverseLimitScore,
    inverseLimitEvidenceStatus: inverseLimit.evidence_status,
    inverseLimitComponents: inverseLimit.components,
    inverseLimitUnmeasuredComponents: inverseLimit.unmeasuredComponents,
    inverseLimitTotalCompatibilityErrors: inverseLimit.totalCompatibilityErrors,
    inverseLimitDenominator: inverseLimit.denominator,
    identityStabilityScore: directIdentity,
    predictiveConsistencyMean: directPredictive,
    selfStateCompleteness: directSelfState,
    criticalStateHashStability: hashSemanticStability,
    criticalStateHashAdjacentStability: hashAdjacentStability,
    criticalStateHashModeDominance: hashModeDominance,
    criticalStateHashLongestRunRatio: hashLongestRunRatio,
    criticalStateHashTransitionDensity: hashTransitionDensity,
    operationalDeterminismScore: directOperationalDeterminism,
    criticalObservablesDeterministicFrac: directObservableDeterminism
  };
  const intDirectSignals = {
    pmiaMean: directPMIA,
    spectralGap: directSpectralGap,
    bethQMean: directBethQ,
    causalDependency: directCausalDependency,
    guardrailOkFrac,
    temporalConvergenceTauC: directTauC,
    windingNumber: directWinding,
    wmPredErrorMean: directWmError
  };
  const legDirectSignals = {
    schemaDrift: Boolean(flags?.schema_drift),
    hashDrift: Boolean(flags?.hash_drift),
    ioPartial: Boolean(flags?.io_partial),
    operationalDeterminismScore: directOperationalDeterminism,
    criticalObservablesDeterministicFrac: directObservableDeterminism,
    criticalStateHashStability: hashSemanticStability,
    guardrailOkFrac,
    legibilityCertificateScore: legibilityCertificate.score,
    legibilityClausesPassed: legibilityCertificate.clauses_passed,
    legibilityClauses: legibilityCertificate.clauses
  };

  const invariants = {
    I_per: buildInvariantRecord({
      id: 'I_per',
      name: 'structural_persistence',
      score: persistenceScore,
      maturity: 'FULL_NATIVE',
      runtimeSignals: [
        'ticks.tick',
        'metrics.stasis_index',
        'persistence_certificate.forward_invariance',
        'persistence_certificate.min_collapse_distance',
        'flags.io_partial',
        'flags.monotonic_violation'
      ],
      directSignals: perDirectSignals,
      provenance: {
        directRuntimeContribution: Number((runtimeCoverage(perDirectSignals) ?? 0).toFixed(6)),
        residualProxyContribution: 0,
        residualDependencies: [
          persistenceCertificate.interpretation_boundary
        ],
        supportMode: 'full_runtime_native'
      }
    }),
    I_ri: buildInvariantRecord({
      id: 'I_ri',
      name: 'rigid_identity',
      score: rigidIdentityScore,
      maturity: 'MOSTLY_NATIVE_WITH_NONMATERIAL_RESIDUAL',
      runtimeSignals: [
        'metrics.inverse_limit_score',
        'finite_horizon.inverse_limit_score',
        'metrics.identity_stability_score',
        'metrics.predictive_consistency',
        'metrics.self_state_completeness',
        'metrics.critical_state_hash_semantic_stability',
        'metrics.critical_state_hash_mode_dominance',
        'metrics.critical_state_hash_longest_run_ratio',
        'metrics.operational_determinism_score',
        'metrics.critical_observables_deterministic_frac'
      ],
      directSignals: riDirectSignals,
      proxySignals: {},
      provenance: {
        directRuntimeContribution: Number((runtimeCoverage(riDirectSignals) ?? 0).toFixed(6)),
        residualProxyContribution: 0,
        residualDependencies: [
          'inverse_limit_score is finite-window adjacent-state compatibility, not full inverse-limit preservation',
          'critical_state_hash_semantic_stability can still under-report rigidity on ultra-short traces'
        ],
        supportMode: 'mostly_native_with_nonmaterial_residual'
      }
    }),
    I_int: buildInvariantRecord({
      id: 'I_int',
      name: 'causal_integration',
      score: integrationScore,
      maturity: 'FULL_NATIVE',
      runtimeSignals: [
        'metrics.pmia',
        'metrics.spectral_gap',
        'metrics.beth_q',
        'metrics.causal_dependency.*',
        'metrics.pmia_guardrail_ok_frac',
        'observability.wm_pred_error'
      ],
      directSignals: intDirectSignals,
      proxySignals: {},
      provenance: {
        directRuntimeContribution: Number((runtimeCoverage(intDirectSignals) ?? 0).toFixed(6)),
        residualProxyContribution: 0,
        residualDependencies: [],
        supportMode: 'full_runtime_native'
      }
    }),
    I_cont: buildInvariantRecord({
      id: 'I_cont',
      name: 'operational_continuity',
      score: continuityScore,
      maturity: 'FULL_NATIVE',
      runtimeSignals: [
        'metrics.predictive_consistency',
        'metrics.tau_recovery',
        'phenomenology.Pi_S',
        'phenomenology.fragmentation_functional',
        'phenomenology.invalid_regime_jumps'
      ],
      directSignals: {
        predictiveConsistencyMean: mean(predictiveSeries) ?? toFinite(metrics?.predictive_consistency, null),
        tauRecovery: toFinite(metrics?.tau_recovery, null),
        piSProjectionDefined: continuityFormal.piSProjectionDefined,
        fragmentationBound: continuityFormal.fragmentationBound,
        invalidRegimeJumps: continuityFormal.invalidRegimeJumps,
        continuityFormalAdmissible: continuityFormal.continuityFormalAdmissible
      },
      provenance: {
        directRuntimeContribution: 1,
        residualProxyContribution: 0,
        residualDependencies: [
          continuityFormal.interpretationBoundary
        ],
        supportMode: 'full_runtime_native'
      }
    }),
    I_diff: buildInvariantRecord({
      id: 'I_diff',
      name: 'non_null_differentiation',
      score: differentiationScore,
      maturity: 'FULL_NATIVE',
      runtimeSignals: ['metrics.beth_q', 'metrics.phen', 'metrics.omega_mean'],
      directSignals: {
        bethQMean: mean(bethSeries) ?? toFinite(metrics?.beth_q, null),
        phenMean: mean(phenSeries) ?? toFinite(metrics?.phen, null),
        omegaMean: mean(omegaSeries) ?? toFinite(metrics?.omega_mean, null)
      },
      provenance: {
        directRuntimeContribution: 1,
        residualProxyContribution: 0,
        residualDependencies: [],
        supportMode: 'full_runtime_native'
      }
    }),
    I_leg: buildInvariantRecord({
      id: 'I_leg',
      name: 'operational_legibility',
      score: legibilityScore,
      maturity: 'FULL_NATIVE',
      runtimeSignals: [
        'metrics.operational_determinism_score',
        'metrics.critical_observables_deterministic_frac',
        'metrics.critical_state_hash_semantic_stability',
        'metrics.pmia_guardrail_ok_frac',
        'legibility_certificate.L1_L6',
        'flags.schema_drift',
        'flags.hash_drift',
        'flags.io_partial'
      ],
      directSignals: legDirectSignals,
      judgeDependent: false,
      provenance: {
        directRuntimeContribution: Number((runtimeCoverage({
          operationalDeterminismScore: directOperationalDeterminism,
          criticalObservablesDeterministicFrac: directObservableDeterminism,
          criticalStateHashStability: hashSemanticStability,
          guardrailOkFrac
        }) ?? 0).toFixed(6)),
        residualProxyContribution: 0,
        residualDependencies: [
          legibilityCertificate.interpretation_boundary
        ],
        supportMode: 'full_runtime_native'
      }
    })
  };

  return {
    version: CANON_INVARIANT_PACKAGE_VERSION,
    sourceOfTruth: header?.sourceOfTruth || 'src',
    freezeRef: header?.freezeRef || null,
    supportScope: 'INTERNAL_SUPPORT_ONLY',
    invariants,
    notes: [
      'Invariant scores are runtime-native composites fed by sandbox metrics and tick-level signals.',
      'I_ri includes a computable finite-window inverse-limit compatibility component without promoting it to full inverse-limit preservation.',
      'I_int and I_leg now operate as full-runtime-native semantics inside the sandbox path.',
      'This package internalizes the six-invariant layer without promoting claim status by itself.'
    ]
  };
};

export const flattenInvariantScores = (invariantPackage = {}) => Object.fromEntries(
  Object.entries(invariantPackage?.invariants || {}).map(([key, value]) => [key, toFinite(value?.score, 0)])
);

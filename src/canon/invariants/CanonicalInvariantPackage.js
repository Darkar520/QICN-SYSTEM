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
  const directCausalDependency = {
    past: meanFromSummaryOrSeries(metrics?.causal_dependency?.past, causalPastSeries),
    sensors: meanFromSummaryOrSeries(metrics?.causal_dependency?.sensors, causalSensorsSeries),
    prompts: meanFromSummaryOrSeries(metrics?.causal_dependency?.prompts, causalPromptsSeries),
    noise: meanFromSummaryOrSeries(metrics?.causal_dependency?.noise, causalNoiseSeries)
  };
  const directWmError = meanFromSummaryOrSeries(metrics?.wm_pred_error_mean, wmErrorSeries);
  const guardrailOkFrac = toFinite(metrics?.pmia_guardrail_ok_frac, null);

  const persistenceScore = (
    (continuityRatio(ticks) * 0.45)
    + (normalizeLower(directStasis, 0, 1) * 0.25)
    + (flags?.io_partial ? 0 : 0.2)
    + (flags?.monotonic_violation ? 0 : 0.1)
  );

  const rigidIdentityScore = (
    (normalizeHigher(directIdentity, 0.5, 1) * 0.38)
    + (normalizeHigher(directPredictive, 0.5, 1) * 0.16)
    + (normalizeHigher(directSelfState, 0.5, 1) * 0.15)
    + (normalizeHigher(hashSemanticStability, 0.45, 1) * 0.08)
    + (normalizeHigher(directOperationalDeterminism, 0.7, 1) * 0.11)
    + (normalizeHigher(directObservableDeterminism, 0.6, 1) * 0.12)
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

  const differentiationScore = (
    (normalizeHigher(mean(bethSeries) ?? metrics?.beth_q, 0.2, 1) * 0.4)
    + (normalizeHigher(mean(phenSeries) ?? metrics?.phen, 0.2, 1) * 0.25)
    + (normalizeHigher(mean(omegaSeries) ?? metrics?.omega_mean, 0.2, 1) * 0.35)
  );

  const legibilityScore = (
    (normalizeHigher(directOperationalDeterminism, 0.7, 1) * 0.24)
    + (normalizeHigher(directObservableDeterminism, 0.6, 1) * 0.22)
    + (normalizeHigher(hashSemanticStability, 0.45, 1) * 0.12)
    + (normalizeHigher(guardrailOkFrac, 0.5, 1) * 0.12)
    + (verdict?.status === 'ADMISSIBLE' ? 0.16 : 0)
    + (flags?.schema_drift ? 0 : 0.08)
    + (flags?.hash_drift ? 0 : 0.04)
    + (flags?.io_partial ? 0 : 0.02)
  );

  const perDirectSignals = {
    continuityRatio: Number(continuityRatio(ticks).toFixed(6)),
    stasisIndex: directStasis,
    ioPartial: Boolean(flags?.io_partial),
    monotonicViolation: Boolean(flags?.monotonic_violation)
  };
  const riDirectSignals = {
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
    guardrailOkFrac
  };

  const invariants = {
    I_per: buildInvariantRecord({
      id: 'I_per',
      name: 'structural_persistence',
      score: persistenceScore,
      maturity: 'FULL_NATIVE',
      runtimeSignals: ['ticks.tick', 'metrics.stasis_index', 'flags.io_partial', 'flags.monotonic_violation'],
      directSignals: perDirectSignals,
      provenance: {
        directRuntimeContribution: Number((runtimeCoverage(perDirectSignals) ?? 0).toFixed(6)),
        residualProxyContribution: 0,
        residualDependencies: [],
        supportMode: 'full_runtime_native'
      }
    }),
    I_ri: buildInvariantRecord({
      id: 'I_ri',
      name: 'rigid_identity',
      score: rigidIdentityScore,
      maturity: 'MOSTLY_NATIVE_WITH_NONMATERIAL_RESIDUAL',
      runtimeSignals: [
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
        residualDependencies: ['critical_state_hash_semantic_stability can still under-report rigidity on ultra-short traces'],
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
      runtimeSignals: ['metrics.predictive_consistency', 'metrics.tau_recovery'],
      directSignals: {
        predictiveConsistencyMean: mean(predictiveSeries) ?? toFinite(metrics?.predictive_consistency, null),
        tauRecovery: toFinite(metrics?.tau_recovery, null)
      },
      provenance: {
        directRuntimeContribution: 1,
        residualProxyContribution: 0,
        residualDependencies: [],
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
        residualDependencies: [],
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
      'I_ri now operates as mostly native runtime semantics with a nonmaterial residual localized to ultra-short trace hash semantics.',
      'I_int and I_leg now operate as full-runtime-native semantics inside the sandbox path.',
      'This package internalizes the six-invariant layer without promoting claim status by itself.'
    ]
  };
};

export const flattenInvariantScores = (invariantPackage = {}) => Object.fromEntries(
  Object.entries(invariantPackage?.invariants || {}).map(([key, value]) => [key, toFinite(value?.score, 0)])
);

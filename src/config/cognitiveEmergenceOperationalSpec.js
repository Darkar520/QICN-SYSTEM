const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }
  Object.freeze(value);
  for (const key of Object.keys(value)) {
    deepFreeze(value[key]);
  }
  return value;
};

const stableStringify = (value) => {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort((a, b) => a.localeCompare(b));
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

const hashStablePayload = (payload) => {
  const text = stableStringify(payload);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a32_${(hash >>> 0).toString(16).padStart(8, '0')}`;
};

export const COGNITIVE_EMERGENCE_SPEC_VERSION = 'v1.1.0';
export const COGNITIVE_EMERGENCE_PREREGISTRATION_ID = 'CEOP-2026-02-27-v1.1';
export const COGNITIVE_EMERGENCE_ACTUATOR_SET_VERSION = 'A-2026-02-27-v1.1';

const ACTUATOR_SET_BASE = [
  { id: 'thermal_shift_gain', domain: 'thermal', min: 0, max: 1.2, default: 0.3 },
  { id: 'stasis_delta_gain', domain: 'stasis', min: 0, max: 0.35, default: 0.15 },
  { id: 'tension_delta_gain', domain: 'tension', min: 0, max: 0.35, default: 0.15 },
  { id: 'retro_horizon_ticks', domain: 'planner', min: 6, max: 24, default: 10 },
  { id: 'prospective_scenarios', domain: 'planner', min: 18, max: 72, default: 24 },
  { id: 'retro_weight', domain: 'planner', min: 0.1, max: 0.9, default: 0.7 },
  { id: 'historical_weight', domain: 'planner', min: 0.1, max: 0.9, default: 0.3 },
  { id: 'entropy_excitation_gain', domain: 'entropy', min: 0, max: 1, default: 0.42 },
  { id: 'observer_impact_gain', domain: 'observer', min: 0, max: 1, default: 0.2 },
  { id: 'anti_stasis_pulse_gain', domain: 'anti_stasis', min: 0, max: 1, default: 0.15 },
  { id: 'transform_intensity', domain: 'transform', min: 0, max: 1, default: 0.5 },
  { id: 'transform_window_ticks', domain: 'transform', min: 0, max: 360, default: 120 }
];

const PRIMARY_METRICS_BASE = [
  {
    id: 'counterfactual_error_delta',
    description: 'World-model counterfactual error improvement vs baseline heuristic.',
    direction: 'lower',
    threshold: -0.1,
    minEffectSize: 0.1
  },
  {
    id: 'planning_reward_gain',
    description: 'Reward gain with planner enabled vs planner-off ablation.',
    direction: 'higher',
    threshold: 0.15,
    minEffectSize: 0.15
  },
  {
    id: 'ablation_drop_planner_off',
    description: 'Required drop when planner is disabled.',
    direction: 'higher',
    threshold: 0.12,
    minEffectSize: 0.12
  },
  {
    id: 'identity_stability_score',
    description: 'Composite identity stability score under perturbation windows.',
    direction: 'higher',
    threshold: 0.82,
    minEffectSize: 0.08
  },
  {
    id: 'actuator_causal_impact_te',
    description: 'Transfer entropy lower bound from actuator channel to future state.',
    direction: 'higher',
    threshold: 0.1,
    minEffectSize: 0.05
  },
  {
    id: 'entropy_primary_ratio',
    description: 'Share of quantum_primary mode during active operation.',
    direction: 'higher',
    threshold: 0.85,
    minEffectSize: 0.05
  }
];

const SECONDARY_METRICS_BASE = [
  {
    id: 'planner_latency_p95_ms',
    description: 'Planner latency p95 budget for real-time loop.',
    direction: 'lower',
    threshold: 18
  },
  {
    id: 'tick_latency_p95_ms',
    description: 'Full simulation tick p95 budget.',
    direction: 'lower',
    threshold: 45
  },
  {
    id: 'retro_projection_variance',
    description: 'Future drift variance with quantum epsilon enabled.',
    direction: 'higher',
    threshold: 0.0001
  },
  {
    id: 'guardrail_violations_per_hour',
    description: 'Safety budget violations per hour.',
    direction: 'lower',
    threshold: 2
  }
];

const TEST_CRITERIA_BASE = {
  D1: {
    metricId: 'counterfactual_error_delta',
    threshold: -0.1,
    minEffectSize: 0.1
  },
  D2: {
    metricId: 'planning_reward_gain',
    threshold: 0.15,
    minEffectSize: 0.15
  },
  D3: {
    metricId: 'ablation_drop_planner_off',
    threshold: 0.12,
    minEffectSize: 0.12
  },
  D4: {
    metricId: 'identity_stability_score',
    threshold: 0.82,
    minEffectSize: 0.08
  },
  D5: {
    metricId: 'actuator_causal_impact_te',
    threshold: 0.1,
    minEffectSize: 0.05
  },
  D6: {
    metricId: 'entropy_primary_ratio',
    threshold: 0.85,
    minEffectSize: 0.05
  }
};

export const COGNITIVE_EMERGENCE_ACTUATOR_SET = deepFreeze(ACTUATOR_SET_BASE.map((entry) => ({ ...entry })));
export const COGNITIVE_EMERGENCE_PRIMARY_METRICS = deepFreeze(PRIMARY_METRICS_BASE.map((entry) => ({ ...entry })));
export const COGNITIVE_EMERGENCE_SECONDARY_METRICS = deepFreeze(SECONDARY_METRICS_BASE.map((entry) => ({ ...entry })));
export const COGNITIVE_EMERGENCE_TEST_CRITERIA = deepFreeze({ ...TEST_CRITERIA_BASE });

export const COGNITIVE_EMERGENCE_COMPUTE_BUDGET_MS = deepFreeze({
  totalTickBudgetMs: 45,
  plannerBudgetMs: 18,
  worldModelBudgetMs: 12,
  safetyBudgetMs: 5,
  renderAndTelemetryBudgetMs: 10
});

export const COGNITIVE_EMERGENCE_COMPUTE_BUDGET_POLICY = deepFreeze({
  maxOverflowRate: 0.02,
  componentLimitsMs: {
    plannerMs: { p50: 12, p95: 18, p99: 23, hard: 26 },
    worldModelMs: { p50: 10, p95: 12, p99: 15, hard: 18 },
    safetyMs: { p50: 4, p95: 5, p99: 6, hard: 8 },
    renderAndTelemetryMs: { p50: 8, p95: 10, p99: 12, hard: 14 }
  },
  totalTickLimitsMs: { p50: 36, p95: 45, p99: 50, hard: 55 }
});

export const COGNITIVE_EMERGENCE_IDENTITY_SCORE_MODEL = deepFreeze({
  windowTicks: 180,
  perturbationWindowTicks: 45,
  smoothingInflationGuardMax: 1.03,
  tolerance: {
    cccDriftMax: 0.12,
    omegaDriftMax: 0.2,
    spectralGapDriftMax: 0.2,
    narrativePenaltyMax: 0.4,
    perturbationResponseMax: 0.22
  },
  weights: {
    ccc: 0.28,
    omega: 0.22,
    spectralGap: 0.18,
    narrativeIntegrity: 0.17,
    perturbationRobustness: 0.15
  }
});

export const COGNITIVE_EMERGENCE_LANGUAGE_LEAKAGE_POLICY = deepFreeze({
  forbiddenWorldModelFields: [
    'llm_raw_text',
    'assistant_response',
    'prompt_transcript',
    'freeform_generation'
  ],
  forbiddenLexicalPatterns: [
    'sk-proj-',
    'api_key',
    'authorization',
    'system_prompt',
    'developer_prompt'
  ],
  lexicalOverlapMax: 0.18,
  ngramSize: 3,
  ngramOverlapMax: 0.1
});

export const COGNITIVE_EMERGENCE_PREREG_PROTOCOL = deepFreeze({
  evaluationSeed: 20260227,
  analysisWindowTicks: { warmup: 120, active: 960, cooldown: 120 },
  analysisPipelineOrder: ['primary_metrics', 'secondary_metrics', 'effect_size_validation', 'claim_boundary_check'],
  primaryMetricsFailHard: true,
  fixedAnalysisMethod: 'pre_registered_thresholds_with_effect_size',
  minimumBenchmarkEpisodes: 24,
  effectSizeMethod: 'cohens_d'
});

export const COGNITIVE_EMERGENCE_CLAIM_BOUNDARY = deepFreeze({
  allowed: [
    'operational_cognition',
    'non_biological_agency',
    'counterfactual_planning'
  ],
  disallowed: [
    'biological_qualia_proven',
    'subjective_experience_proven',
    'human_equivalent_consciousness_claim'
  ]
});

export const getCognitiveEmergenceSpecSnapshot = () => ({
  specVersion: COGNITIVE_EMERGENCE_SPEC_VERSION,
  preregistrationId: COGNITIVE_EMERGENCE_PREREGISTRATION_ID,
  actuatorSetVersion: COGNITIVE_EMERGENCE_ACTUATOR_SET_VERSION,
  actuatorSet: COGNITIVE_EMERGENCE_ACTUATOR_SET,
  primaryMetrics: COGNITIVE_EMERGENCE_PRIMARY_METRICS,
  secondaryMetrics: COGNITIVE_EMERGENCE_SECONDARY_METRICS,
  testCriteria: COGNITIVE_EMERGENCE_TEST_CRITERIA,
  computeBudgetMs: COGNITIVE_EMERGENCE_COMPUTE_BUDGET_MS,
  computeBudgetPolicy: COGNITIVE_EMERGENCE_COMPUTE_BUDGET_POLICY,
  identityScoreModel: COGNITIVE_EMERGENCE_IDENTITY_SCORE_MODEL,
  languageLeakagePolicy: COGNITIVE_EMERGENCE_LANGUAGE_LEAKAGE_POLICY,
  preregProtocol: COGNITIVE_EMERGENCE_PREREG_PROTOCOL,
  claimBoundary: COGNITIVE_EMERGENCE_CLAIM_BOUNDARY
});

export const computeCognitiveEmergenceSpecHashes = (snapshot = getCognitiveEmergenceSpecSnapshot()) => {
  const actuatorSetHash = hashStablePayload(snapshot.actuatorSet);
  const specHash = hashStablePayload({
    ...snapshot,
    actuatorSetHash
  });
  return {
    actuatorSetHash,
    specHash
  };
};

const BASE_HASHES = computeCognitiveEmergenceSpecHashes();

export const COGNITIVE_EMERGENCE_ACTUATOR_SET_HASH = BASE_HASHES.actuatorSetHash;
export const COGNITIVE_EMERGENCE_SPEC_HASH = BASE_HASHES.specHash;

export const COGNITIVE_EMERGENCE_SPEC_LOCK = deepFreeze({
  specVersion: COGNITIVE_EMERGENCE_SPEC_VERSION,
  preregistrationId: COGNITIVE_EMERGENCE_PREREGISTRATION_ID,
  actuatorSetVersion: COGNITIVE_EMERGENCE_ACTUATOR_SET_VERSION,
  actuatorSetHash: COGNITIVE_EMERGENCE_ACTUATOR_SET_HASH,
  specHash: COGNITIVE_EMERGENCE_SPEC_HASH
});

export const validateSpecCompatibility = (candidate = {}) => {
  const errors = [];
  if (!candidate || typeof candidate !== 'object') {
    return { valid: false, errors: ['candidate_not_object'] };
  }
  if (candidate.specVersion !== COGNITIVE_EMERGENCE_SPEC_VERSION) {
    errors.push('spec_version_mismatch');
  }
  if (candidate.preregistrationId !== COGNITIVE_EMERGENCE_PREREGISTRATION_ID) {
    errors.push('preregistration_id_mismatch');
  }
  if (candidate.frozenActuatorSetVersion !== COGNITIVE_EMERGENCE_ACTUATOR_SET_VERSION) {
    errors.push('actuator_set_version_mismatch');
  }
  if (candidate.actuatorSetHash !== COGNITIVE_EMERGENCE_ACTUATOR_SET_HASH) {
    errors.push('actuator_set_hash_mismatch');
  }
  if (candidate.specHash !== COGNITIVE_EMERGENCE_SPEC_HASH) {
    errors.push('spec_hash_mismatch');
  }
  return {
    valid: errors.length === 0,
    errors
  };
};

export const validateCognitiveEmergenceSpec = () => {
  const errors = [];
  const actuatorIds = COGNITIVE_EMERGENCE_ACTUATOR_SET.map((entry) => entry.id);
  if (COGNITIVE_EMERGENCE_ACTUATOR_SET.length < 10 || COGNITIVE_EMERGENCE_ACTUATOR_SET.length > 20) {
    errors.push('actuator_set_size_out_of_range');
  }
  if (new Set(actuatorIds).size !== actuatorIds.length) {
    errors.push('actuator_set_has_duplicates');
  }
  if (!Object.isFrozen(COGNITIVE_EMERGENCE_ACTUATOR_SET) || !COGNITIVE_EMERGENCE_ACTUATOR_SET.every((entry) => Object.isFrozen(entry))) {
    errors.push('actuator_set_not_deep_frozen');
  }

  const primaryIds = new Set(COGNITIVE_EMERGENCE_PRIMARY_METRICS.map((entry) => entry.id));
  for (const entry of COGNITIVE_EMERGENCE_PRIMARY_METRICS) {
    if (!Number.isFinite(Number(entry.minEffectSize)) || Number(entry.minEffectSize) <= 0) {
      errors.push(`primary_metric_min_effect_invalid:${entry.id}`);
    }
    if (entry.direction !== 'higher' && entry.direction !== 'lower') {
      errors.push(`primary_metric_direction_invalid:${entry.id}`);
    }
  }

  for (const [criterionKey, criterion] of Object.entries(COGNITIVE_EMERGENCE_TEST_CRITERIA)) {
    if (!primaryIds.has(criterion.metricId)) {
      errors.push(`criteria_metric_not_primary:${criterionKey}`);
    }
  }

  const weightValues = Object.values(COGNITIVE_EMERGENCE_IDENTITY_SCORE_MODEL.weights);
  const weightSum = weightValues.reduce((sum, value) => sum + Number(value || 0), 0);
  if (Math.abs(weightSum - 1) > 1e-6) {
    errors.push('identity_weight_sum_not_1');
  }

  const totalBudget =
    COGNITIVE_EMERGENCE_COMPUTE_BUDGET_MS.plannerBudgetMs
    + COGNITIVE_EMERGENCE_COMPUTE_BUDGET_MS.worldModelBudgetMs
    + COGNITIVE_EMERGENCE_COMPUTE_BUDGET_MS.safetyBudgetMs
    + COGNITIVE_EMERGENCE_COMPUTE_BUDGET_MS.renderAndTelemetryBudgetMs;
  if (totalBudget > COGNITIVE_EMERGENCE_COMPUTE_BUDGET_MS.totalTickBudgetMs) {
    errors.push('compute_budget_overflow');
  }

  if (
    COGNITIVE_EMERGENCE_PREREG_PROTOCOL.analysisPipelineOrder[0] !== 'primary_metrics'
    || COGNITIVE_EMERGENCE_PREREG_PROTOCOL.primaryMetricsFailHard !== true
  ) {
    errors.push('prereg_primary_pipeline_violation');
  }

  const hashes = computeCognitiveEmergenceSpecHashes();
  if (hashes.actuatorSetHash !== COGNITIVE_EMERGENCE_ACTUATOR_SET_HASH) {
    errors.push('actuator_set_hash_drift');
  }
  if (hashes.specHash !== COGNITIVE_EMERGENCE_SPEC_HASH) {
    errors.push('spec_hash_drift');
  }

  return {
    valid: errors.length === 0,
    errors,
    summary: {
      actuatorCount: COGNITIVE_EMERGENCE_ACTUATOR_SET.length,
      weightSum,
      totalBudget,
      actuatorSetHash: COGNITIVE_EMERGENCE_ACTUATOR_SET_HASH,
      specHash: COGNITIVE_EMERGENCE_SPEC_HASH
    }
  };
};

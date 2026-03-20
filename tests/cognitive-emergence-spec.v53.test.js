import assert from 'node:assert/strict';
import {
  COGNITIVE_EMERGENCE_SPEC_VERSION,
  COGNITIVE_EMERGENCE_PREREGISTRATION_ID,
  COGNITIVE_EMERGENCE_ACTUATOR_SET_VERSION,
  COGNITIVE_EMERGENCE_SPEC_HASH,
  COGNITIVE_EMERGENCE_ACTUATOR_SET_HASH,
  COGNITIVE_EMERGENCE_SPEC_LOCK,
  COGNITIVE_EMERGENCE_ACTUATOR_SET,
  COGNITIVE_EMERGENCE_PRIMARY_METRICS,
  COGNITIVE_EMERGENCE_SECONDARY_METRICS,
  COGNITIVE_EMERGENCE_TEST_CRITERIA,
  COGNITIVE_EMERGENCE_COMPUTE_BUDGET_MS,
  COGNITIVE_EMERGENCE_COMPUTE_BUDGET_POLICY,
  COGNITIVE_EMERGENCE_IDENTITY_SCORE_MODEL,
  COGNITIVE_EMERGENCE_LANGUAGE_LEAKAGE_POLICY,
  COGNITIVE_EMERGENCE_PREREG_PROTOCOL,
  computeCognitiveEmergenceSpecHashes,
  getCognitiveEmergenceSpecSnapshot,
  validateSpecCompatibility,
  validateCognitiveEmergenceSpec
} from '../src/config/cognitiveEmergenceOperationalSpec.js';

try {
  // CASE 1: core versioning + ids
  assert.equal(typeof COGNITIVE_EMERGENCE_SPEC_VERSION, 'string', 'CASE 1 FAIL: spec version missing.');
  assert.equal(typeof COGNITIVE_EMERGENCE_PREREGISTRATION_ID, 'string', 'CASE 1 FAIL: preregistration id missing.');
  assert.equal(typeof COGNITIVE_EMERGENCE_ACTUATOR_SET_VERSION, 'string', 'CASE 1 FAIL: actuator set version missing.');
  assert.ok(COGNITIVE_EMERGENCE_PREREGISTRATION_ID.length > 5, 'CASE 1 FAIL: preregistration id too short.');
  assert.ok(String(COGNITIVE_EMERGENCE_SPEC_HASH).startsWith('fnv1a32_'), 'CASE 1 FAIL: spec hash format invalid.');
  assert.ok(String(COGNITIVE_EMERGENCE_ACTUATOR_SET_HASH).startsWith('fnv1a32_'), 'CASE 1 FAIL: actuator hash format invalid.');

  // CASE 2: actuator set must be frozen and 10..20
  const actuatorIds = COGNITIVE_EMERGENCE_ACTUATOR_SET.map((entry) => entry.id);
  assert.ok(COGNITIVE_EMERGENCE_ACTUATOR_SET.length >= 10, 'CASE 2 FAIL: actuator set below minimum.');
  assert.ok(COGNITIVE_EMERGENCE_ACTUATOR_SET.length <= 20, 'CASE 2 FAIL: actuator set above maximum.');
  assert.equal(new Set(actuatorIds).size, actuatorIds.length, 'CASE 2 FAIL: duplicated actuator ids.');
  assert.equal(Object.isFrozen(COGNITIVE_EMERGENCE_ACTUATOR_SET), true, 'CASE 2 FAIL: actuator set array must be frozen.');
  assert.equal(COGNITIVE_EMERGENCE_ACTUATOR_SET.every((entry) => Object.isFrozen(entry)), true, 'CASE 2 FAIL: actuator entries must be frozen.');

  // CASE 3: preregistered metrics quality
  assert.ok(COGNITIVE_EMERGENCE_PRIMARY_METRICS.length >= 5, 'CASE 3 FAIL: primary metrics too small.');
  COGNITIVE_EMERGENCE_PRIMARY_METRICS.forEach((entry) => {
    assert.equal(typeof entry.id, 'string', `CASE 3 FAIL: invalid primary id for ${entry.description}`);
    assert.equal(typeof entry.threshold, 'number', `CASE 3 FAIL: threshold missing for ${entry.id}`);
    assert.equal(typeof entry.minEffectSize, 'number', `CASE 3 FAIL: minEffectSize missing for ${entry.id}`);
  });
  assert.ok(COGNITIVE_EMERGENCE_SECONDARY_METRICS.length >= 4, 'CASE 3 FAIL: secondary metrics too small.');

  // CASE 4: criteria map should point to existing metrics
  const metricIds = new Set([
    ...COGNITIVE_EMERGENCE_PRIMARY_METRICS.map((entry) => entry.id),
    ...COGNITIVE_EMERGENCE_SECONDARY_METRICS.map((entry) => entry.id)
  ]);
  Object.entries(COGNITIVE_EMERGENCE_TEST_CRITERIA).forEach(([testId, rule]) => {
    assert.ok(metricIds.has(rule.metricId), `CASE 4 FAIL: criteria ${testId} points to unknown metric ${rule.metricId}.`);
    assert.ok(
      COGNITIVE_EMERGENCE_PRIMARY_METRICS.some((entry) => entry.id === rule.metricId),
      `CASE 4 FAIL: criteria ${testId} must map to primary metrics only.`
    );
    assert.equal(typeof rule.threshold, 'number', `CASE 4 FAIL: threshold missing for ${testId}.`);
    assert.equal(typeof rule.minEffectSize, 'number', `CASE 4 FAIL: min effect missing for ${testId}.`);
  });

  // CASE 5: compute budget and identity score model sanity
  const totalParts =
    COGNITIVE_EMERGENCE_COMPUTE_BUDGET_MS.plannerBudgetMs +
    COGNITIVE_EMERGENCE_COMPUTE_BUDGET_MS.worldModelBudgetMs +
    COGNITIVE_EMERGENCE_COMPUTE_BUDGET_MS.safetyBudgetMs +
    COGNITIVE_EMERGENCE_COMPUTE_BUDGET_MS.renderAndTelemetryBudgetMs;
  assert.ok(
    totalParts <= COGNITIVE_EMERGENCE_COMPUTE_BUDGET_MS.totalTickBudgetMs,
    'CASE 5 FAIL: tick sub-budgets exceed total.'
  );
  const weightValues = Object.values(COGNITIVE_EMERGENCE_IDENTITY_SCORE_MODEL.weights);
  const weightSum = weightValues.reduce((sum, value) => sum + value, 0);
  assert.ok(Math.abs(weightSum - 1) < 1e-6, 'CASE 5 FAIL: identity weights must sum to 1.');
  assert.ok(COGNITIVE_EMERGENCE_COMPUTE_BUDGET_POLICY.componentLimitsMs.plannerMs.p99 >= COGNITIVE_EMERGENCE_COMPUTE_BUDGET_MS.plannerBudgetMs, 'CASE 5 FAIL: planner p99 policy below base budget.');
  assert.ok(COGNITIVE_EMERGENCE_COMPUTE_BUDGET_POLICY.totalTickLimitsMs.p95 >= COGNITIVE_EMERGENCE_COMPUTE_BUDGET_MS.totalTickBudgetMs, 'CASE 5 FAIL: total tick p95 policy below base budget.');

  // CASE 6: leakage policy must include forbidden fields and overlap limits
  assert.ok(COGNITIVE_EMERGENCE_LANGUAGE_LEAKAGE_POLICY.forbiddenWorldModelFields.length >= 2, 'CASE 6 FAIL: leakage forbidden fields too short.');
  assert.ok(COGNITIVE_EMERGENCE_LANGUAGE_LEAKAGE_POLICY.lexicalOverlapMax > 0, 'CASE 6 FAIL: lexical overlap max invalid.');
  assert.ok(COGNITIVE_EMERGENCE_LANGUAGE_LEAKAGE_POLICY.lexicalOverlapMax < 1, 'CASE 6 FAIL: lexical overlap max out of range.');
  assert.ok(COGNITIVE_EMERGENCE_LANGUAGE_LEAKAGE_POLICY.ngramSize >= 2, 'CASE 6 FAIL: ngram size must be >=2.');
  assert.ok(COGNITIVE_EMERGENCE_LANGUAGE_LEAKAGE_POLICY.forbiddenLexicalPatterns.length >= 2, 'CASE 6 FAIL: missing forbidden lexical patterns.');

  // CASE 7: prereg protocol must enforce primary-first fail-hard and fixed seed/window
  assert.equal(COGNITIVE_EMERGENCE_PREREG_PROTOCOL.primaryMetricsFailHard, true, 'CASE 7 FAIL: primary fail-hard must be true.');
  assert.equal(COGNITIVE_EMERGENCE_PREREG_PROTOCOL.analysisPipelineOrder[0], 'primary_metrics', 'CASE 7 FAIL: pipeline must start with primary metrics.');
  assert.ok(Number(COGNITIVE_EMERGENCE_PREREG_PROTOCOL.evaluationSeed) > 0, 'CASE 7 FAIL: evaluation seed missing.');
  assert.ok(Number(COGNITIVE_EMERGENCE_PREREG_PROTOCOL.analysisWindowTicks.active) > 0, 'CASE 7 FAIL: active analysis window missing.');

  // CASE 8: lock hashes must match fresh recompute and compatibility guard must fail on drift
  const freshHashes = computeCognitiveEmergenceSpecHashes(getCognitiveEmergenceSpecSnapshot());
  assert.equal(freshHashes.specHash, COGNITIVE_EMERGENCE_SPEC_HASH, 'CASE 8 FAIL: spec hash drift.');
  assert.equal(freshHashes.actuatorSetHash, COGNITIVE_EMERGENCE_ACTUATOR_SET_HASH, 'CASE 8 FAIL: actuator hash drift.');
  const compatible = validateSpecCompatibility({
    specVersion: COGNITIVE_EMERGENCE_SPEC_VERSION,
    preregistrationId: COGNITIVE_EMERGENCE_PREREGISTRATION_ID,
    frozenActuatorSetVersion: COGNITIVE_EMERGENCE_ACTUATOR_SET_VERSION,
    actuatorSetHash: COGNITIVE_EMERGENCE_ACTUATOR_SET_HASH,
    specHash: COGNITIVE_EMERGENCE_SPEC_HASH
  });
  assert.equal(compatible.valid, true, 'CASE 8 FAIL: compatibility should pass for identical lock.');
  const incompatible = validateSpecCompatibility({
    ...COGNITIVE_EMERGENCE_SPEC_LOCK,
    frozenActuatorSetVersion: `${COGNITIVE_EMERGENCE_ACTUATOR_SET_VERSION}-drift`
  });
  assert.equal(incompatible.valid, false, 'CASE 8 FAIL: compatibility must fail on version drift.');

  // CASE 9: internal validator must pass
  const validation = validateCognitiveEmergenceSpec();
  assert.equal(validation.valid, true, `CASE 9 FAIL: validator errors: ${validation.errors.join(', ')}`);

  console.log('ok cognitive-emergence-spec.v53');
} catch (error) {
  console.error('fail cognitive-emergence-spec.v53:', error.message);
  process.exit(1);
}

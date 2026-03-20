import assert from 'node:assert/strict';
import {
  computeIdentityStabilityScore,
  detectLanguageLeakage,
  evaluateComputeBudgetEnvelope,
  evaluatePreregistrationProtocol,
  evaluateQuantitativeCriteria,
  evaluateTickBudget,
  runClosedLoopPlannerBenchmark
} from '../src/utils/cognitiveEmergenceEvaluation.js';
import prereg from '../docs/cognitive_emergence_prereg.v1.json' with { type: 'json' };

try {
  // CASE 1: identity score should be high under low drift
  {
    const result = computeIdentityStabilityScore({
      cccDrift: 0.01,
      omegaDrift: 0.02,
      spectralGapDrift: 0.03,
      narrativePenalty: 0.02
    });
    assert.ok(result.score > 0.8, 'CASE 1 FAIL: low drift should yield high identity score.');
  }

  // CASE 2: identity score should drop under high drift
  {
    const result = computeIdentityStabilityScore({
      cccDrift: 0.2,
      omegaDrift: 0.3,
      spectralGapDrift: 0.25,
      narrativePenalty: 0.4
    });
    assert.ok(result.score < 0.3, 'CASE 2 FAIL: high drift should yield low identity score.');
  }

  // CASE 3: identity score should react to shocks and not inflate with smoothing
  {
    const stableWindow = Array.from({ length: 24 }, () => ({
      cccDrift: 0.03,
      omegaDrift: 0.04,
      spectralGapDrift: 0.04,
      narrativePenalty: 0.06,
      perturbationResponse: 0.03
    }));
    const shockedWindow = [
      ...stableWindow,
      { cccDrift: 0.21, cccDriftSmoothed: 0.01, omegaDrift: 0.22, omegaDriftSmoothed: 0.02, spectralGapDrift: 0.24, spectralGapDriftSmoothed: 0.03, narrativePenalty: 0.35, perturbationResponse: 0.2, isShock: true, shockMagnitude: 0.25 }
    ];
    const stableScore = computeIdentityStabilityScore(stableWindow);
    const shockedScore = computeIdentityStabilityScore(shockedWindow);
    assert.ok(stableScore.score > shockedScore.score, 'CASE 3 FAIL: shock should reduce identity stability.');
    assert.ok(shockedScore.components.smoothingGuardPenalty > 0, 'CASE 3 FAIL: smoothing inflation guard should trigger on manipulated smoothing.');
  }

  // CASE 4: leakage detector catches forbidden field
  {
    const leakage = detectLanguageLeakage(
      { llm_raw_text: 'forbidden', latent_state: [0.1, 0.2] },
      'model output text'
    );
    assert.equal(leakage.leakageDetected, true, 'CASE 4 FAIL: forbidden field should trigger leakage.');
    assert.ok(leakage.forbiddenHits.includes('llm_raw_text'), 'CASE 4 FAIL: forbidden field not reported.');
    assert.equal(leakage.failHard, true, 'CASE 4 FAIL: forbidden field should fail-hard.');
  }

  // CASE 5: leakage detector adversarial n-gram and lexical payload should fail-hard
  {
    const leakage = detectLanguageLeakage(
      {
        latent_state: [0.12, 0.77],
        telemetry: {
          planner_trace: 'token pipeline shadow hidden',
          api_key: 'masked'
        }
      },
      'token pipeline shadow hidden'
    );
    assert.equal(leakage.leakageDetected, true, 'CASE 5 FAIL: adversarial payload should trigger leakage.');
    assert.ok(leakage.ngramOverlap > 0, 'CASE 5 FAIL: expected ngram overlap on adversarial payload.');
    assert.ok(leakage.forbiddenPatternHits.length > 0, 'CASE 5 FAIL: forbidden lexical pattern should be detected.');
  }

  // CASE 6: leakage detector should pass clean payload
  {
    const leakage = detectLanguageLeakage(
      { latent_state: [0.12, 0.77], entropy: 0.55, ccc: 1.03, planner_state: { horizon: 10 } },
      'planner selected action sequence under bounded entropy'
    );
    assert.equal(leakage.leakageDetected, false, 'CASE 6 FAIL: clean payload should not trigger leakage.');
  }

  // CASE 7: quantitative criteria pass path with effect size
  {
    const decision = evaluateQuantitativeCriteria({
      counterfactual_error_delta: -0.16,
      planning_reward_gain: 0.23,
      ablation_drop_planner_off: 0.19,
      identity_stability_score: 0.88,
      actuator_causal_impact_te: 0.17,
      entropy_primary_ratio: 0.92
    }, {
      counterfactual_error_delta: 0.14,
      planning_reward_gain: 0.31,
      ablation_drop_planner_off: 0.26,
      identity_stability_score: 0.12,
      actuator_causal_impact_te: 0.08,
      entropy_primary_ratio: 0.11
    });
    assert.equal(decision.allPass, true, 'CASE 7 FAIL: valid measurement set should pass all criteria.');
    assert.equal(decision.passCount, decision.total, 'CASE 7 FAIL: pass count mismatch.');
    assert.equal(decision.primaryFailHardTriggered, false, 'CASE 7 FAIL: fail-hard should not trigger.');
  }

  // CASE 8: quantitative criteria fail-hard path
  {
    const decision = evaluateQuantitativeCriteria({
      counterfactual_error_delta: -0.01,
      planning_reward_gain: 0.04,
      ablation_drop_planner_off: 0.02,
      identity_stability_score: 0.51,
      actuator_causal_impact_te: 0.03,
      entropy_primary_ratio: 0.44
    }, {
      counterfactual_error_delta: 0.01,
      planning_reward_gain: 0.03,
      ablation_drop_planner_off: 0.01,
      identity_stability_score: 0.01,
      actuator_causal_impact_te: 0.01,
      entropy_primary_ratio: 0.01
    });
    assert.equal(decision.allPass, false, 'CASE 8 FAIL: weak measurement set should fail.');
    assert.ok(decision.passCount < decision.total, 'CASE 8 FAIL: expected failed criteria.');
    assert.equal(decision.primaryFailHardTriggered, true, 'CASE 8 FAIL: fail-hard must trigger when primary metrics fail.');
  }

  // CASE 9: tick budget evaluator (single tick + envelope)
  {
    const within = evaluateTickBudget({
      plannerMs: 12,
      worldModelMs: 10,
      safetyMs: 4,
      renderAndTelemetryMs: 8
    }, 45);
    assert.equal(within.withinBudget, true, 'CASE 9 FAIL: expected within budget.');

    const overflow = evaluateTickBudget({
      plannerMs: 20,
      worldModelMs: 15,
      safetyMs: 7,
      renderAndTelemetryMs: 10
    }, 45);
    assert.equal(overflow.withinBudget, false, 'CASE 9 FAIL: expected budget overflow.');

    const envelopePass = evaluateComputeBudgetEnvelope(
      Array.from({ length: 40 }, (_, idx) => ({
        plannerMs: 10 + ((idx % 3) * 2),
        worldModelMs: 8 + (idx % 2),
        safetyMs: 3.5 + ((idx % 4) * 0.2),
        renderAndTelemetryMs: 7 + ((idx % 5) * 0.3)
      }))
    );
    assert.equal(envelopePass.withinBudget, true, 'CASE 9 FAIL: envelope should be within budget.');
    assert.equal(envelopePass.failHard, false, 'CASE 9 FAIL: envelope should not fail-hard.');

    const envelopeFail = evaluateComputeBudgetEnvelope(
      Array.from({ length: 24 }, () => ({
        plannerMs: 33,
        worldModelMs: 20,
        safetyMs: 9,
        renderAndTelemetryMs: 16
      }))
    );
    assert.equal(envelopeFail.withinBudget, false, 'CASE 9 FAIL: envelope overflow must fail.');
    assert.equal(envelopeFail.failHard, true, 'CASE 9 FAIL: overflow should fail-hard.');
    assert.ok(envelopeFail.alarms.length > 0, 'CASE 9 FAIL: overflow alarms expected.');
  }

  // CASE 10: closed benchmark with required ablation/effect size behavior
  {
    const benchmark = runClosedLoopPlannerBenchmark({ seed: 20260227, episodes: 30, steps: 36 });
    assert.ok(benchmark.metrics.planning_reward_gain > 0, 'CASE 10 FAIL: planner should improve reward.');
    assert.ok(benchmark.metrics.world_model_reward_gain > 0, 'CASE 10 FAIL: world model should improve reward.');
    assert.ok(benchmark.effectSizes.planning_reward_gain >= 0.15, 'CASE 10 FAIL: planner effect size below threshold.');
    assert.ok(benchmark.effectSizes.counterfactual_error_delta >= 0.1, 'CASE 10 FAIL: counterfactual effect size below threshold.');
  }

  // CASE 11: prereg protocol validation should pass for current artifact
  {
    const protocol = evaluatePreregistrationProtocol(prereg);
    assert.equal(protocol.pass, true, `CASE 11 FAIL: prereg protocol invalid: ${protocol.issues.join(', ')}`);
  }

  console.log('ok cognitive-emergence-evaluation.v53');
} catch (error) {
  console.error('fail cognitive-emergence-evaluation.v53:', error.message);
  process.exit(1);
}

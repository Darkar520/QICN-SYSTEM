import assert from 'node:assert/strict';
import { runClosedLoopPlannerBenchmark } from '../src/utils/cognitiveEmergenceEvaluation.js';

try {
  const benchmark = runClosedLoopPlannerBenchmark({
    seed: 20260227,
    episodes: 36,
    steps: 36
  });

  assert.notEqual(
    benchmark.metrics.planning_reward_gain,
    benchmark.metrics.ablation_drop_planner_off,
    'CASE_FAIL: D2/D3 metric collapse (must be different values).'
  );
  assert.equal(
    benchmark.integrityChecks?.d2_d3_independent,
    true,
    'CASE_FAIL: benchmark must flag D2/D3 independence.'
  );
  assert.ok(
    benchmark.ablations.plannerOnMeanReward > benchmark.ablations.plannerOffMeanReward,
    'CASE_FAIL: planner ON must beat planner OFF.'
  );
  assert.ok(
    benchmark.ablations.plannerOnMeanReward > benchmark.ablations.worldModelOffMeanReward,
    'CASE_FAIL: planner + world model must beat world-model-off.'
  );
  assert.ok(
    benchmark.effectSizes.planning_reward_gain >= 0.15,
    'CASE_FAIL: D2 effect size below required threshold.'
  );
  assert.ok(
    benchmark.effectSizes.ablation_drop_planner_off >= 0.12,
    'CASE_FAIL: D3 effect size below required threshold.'
  );
  assert.notEqual(
    benchmark.effectSizes.planning_reward_gain,
    benchmark.effectSizes.ablation_drop_planner_off,
    'CASE_FAIL: D2/D3 effect size collapse detected.'
  );

  console.log('ok planner-metric-independence.v55');
} catch (error) {
  console.error('fail planner-metric-independence.v55:', error.message);
  process.exit(1);
}

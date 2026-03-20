import assert from 'node:assert/strict';
import { runClosedLoopPlannerBenchmark } from '../src/utils/cognitiveEmergenceEvaluation.js';

try {
  const benchmark = runClosedLoopPlannerBenchmark({
    seed: 20260227,
    episodes: 36,
    steps: 36
  });

  assert.ok(benchmark.metrics.planning_reward_gain >= 0.15, 'CASE 1 FAIL: planner reward gain below threshold.');
  assert.ok(benchmark.metrics.ablation_drop_planner_off >= 0.12, 'CASE 2 FAIL: planner-off ablation drop below threshold.');
  assert.ok(benchmark.metrics.counterfactual_error_delta <= -0.1, 'CASE 3 FAIL: counterfactual error delta below required improvement.');
  assert.ok(benchmark.effectSizes.planning_reward_gain >= 0.15, 'CASE 4 FAIL: planner effect size below threshold.');
  assert.ok(benchmark.effectSizes.counterfactual_error_delta >= 0.1, 'CASE 5 FAIL: counterfactual effect size below threshold.');
  assert.ok(
    benchmark.ablations.plannerOnMeanReward > benchmark.ablations.plannerOffMeanReward,
    'CASE 6 FAIL: planner ON should outperform planner OFF.'
  );
  assert.ok(
    benchmark.ablations.plannerOnMeanReward > benchmark.ablations.worldModelOffMeanReward,
    'CASE 7 FAIL: world model ON should outperform world model OFF.'
  );

  console.log('ok worldmodel-planner-ablation.v54');
} catch (error) {
  console.error('fail worldmodel-planner-ablation.v54:', error.message);
  process.exit(1);
}

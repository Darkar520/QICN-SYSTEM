import assert from 'node:assert/strict';
import {
  evaluateComputeBudgetEnvelope,
  summarizeLatencyStats
} from '../src/utils/cognitiveEmergenceEvaluation.js';

const healthySeries = Array.from({ length: 60 }, (_, idx) => ({
  plannerMs: 9 + (idx % 3),
  worldModelMs: 7 + (idx % 2),
  safetyMs: 3 + ((idx % 4) * 0.2),
  renderAndTelemetryMs: 6 + ((idx % 5) * 0.3)
}));

const overflowSeries = Array.from({ length: 30 }, () => ({
  plannerMs: 32,
  worldModelMs: 20,
  safetyMs: 9,
  renderAndTelemetryMs: 16
}));

try {
  const healthy = evaluateComputeBudgetEnvelope(healthySeries);
  assert.equal(healthy.withinBudget, true, 'CASE 1 FAIL: healthy envelope should pass budget.');
  assert.equal(healthy.failHard, false, 'CASE 1 FAIL: healthy envelope should not fail-hard.');
  assert.ok(healthy.totalStats.p99 <= healthy.budgetPolicy.totalTickLimitsMs.p99, 'CASE 1 FAIL: p99 exceeds policy.');

  const overflow = evaluateComputeBudgetEnvelope(overflowSeries);
  assert.equal(overflow.withinBudget, false, 'CASE 2 FAIL: overflow envelope must fail.');
  assert.equal(overflow.failHard, true, 'CASE 2 FAIL: overflow must fail-hard.');
  assert.ok(overflow.alarms.length > 0, 'CASE 2 FAIL: overflow alarms expected.');

  const stats = summarizeLatencyStats(healthySeries.map((entry) => entry.plannerMs));
  assert.ok(stats.p50 > 0 && stats.p95 >= stats.p50 && stats.p99 >= stats.p95, 'CASE 3 FAIL: percentile ordering invalid.');

  console.log('ok compute-budget-enforcement.v54');
} catch (error) {
  console.error('fail compute-budget-enforcement.v54:', error.message);
  process.exit(1);
}

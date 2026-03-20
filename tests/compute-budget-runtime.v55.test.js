import assert from 'node:assert/strict';
import { BudgetTracker, evaluateComputeBudgetEnvelope } from '../src/utils/cognitiveEmergenceEvaluation.js';

try {
  // CASE 1: runtime envelope stays inside p95 budget under nominal traces.
  {
    const tracker = new BudgetTracker(200);
    for (let i = 0; i < 100; i += 1) {
      tracker.record({
        plannerMs: 10 + (i % 3),
        worldModelMs: 8 + (i % 2),
        safetyMs: 3 + ((i % 4) * 0.2),
        renderAndTelemetryMs: 7 + ((i % 5) * 0.2)
      });
    }
    const percentiles = tracker.getPercentiles();
    const envelope = evaluateComputeBudgetEnvelope(tracker.getSeries());
    assert.ok(percentiles.total.p95 < 45, 'CASE 1 FAIL: runtime p95 should remain below 45ms.');
    assert.equal(envelope.withinBudget, true, 'CASE 1 FAIL: envelope should stay within budget.');
    assert.equal(envelope.failHard, false, 'CASE 1 FAIL: nominal runtime should not fail-hard.');
  }

  // CASE 2: overflow is detected and tracker keeps accepting new traces (no runtime halt).
  {
    const tracker = new BudgetTracker(200);
    for (let i = 0; i < 100; i += 1) {
      tracker.record({
        plannerMs: 30 + (i % 2),
        worldModelMs: 16 + (i % 2),
        safetyMs: 8 + (i % 2),
        renderAndTelemetryMs: 14 + (i % 2)
      });
    }
    const envelope = evaluateComputeBudgetEnvelope(tracker.getSeries());
    assert.equal(envelope.withinBudget, false, 'CASE 2 FAIL: overflow envelope must be out of budget.');
    assert.equal(envelope.failHard, true, 'CASE 2 FAIL: overflow envelope must fail-hard.');
    assert.ok(envelope.alarms.length > 0, 'CASE 2 FAIL: overflow alarms expected.');
    const countBefore = tracker.getPercentiles().count;
    tracker.record({ plannerMs: 8, worldModelMs: 6, safetyMs: 2, renderAndTelemetryMs: 5 });
    const countAfter = tracker.getPercentiles().count;
    assert.ok(countAfter >= countBefore, 'CASE 2 FAIL: tracker should continue after overflow.');
  }

  console.log('ok compute-budget-runtime.v55');
} catch (error) {
  console.error('fail compute-budget-runtime.v55:', error.message);
  process.exit(1);
}

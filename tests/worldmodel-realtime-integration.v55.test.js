import assert from 'node:assert/strict';
import { WorldModelEngine } from '../src/simulation/WorldModelEngine.js';

try {
  const model = new WorldModelEngine({ learningRate: 0.02, historyLimit: 256 });
  const initialCccWeight = model.getDiagnostics().weights.ccc;

  for (let tick = 0; tick < 50; tick += 1) {
    const ccc = 1 + (tick * 0.01);
    const pmia = 0.2 + (tick * 0.004);
    const sensorySignal = Math.min(1, 0.45 + (tick * 0.004));
    const sensorDelta = 0.05 + ((tick % 5) * 0.01);
    const stasisIndex = Math.max(0, 0.25 - (tick * 0.002));
    const entropyExcitation = Math.min(1, 0.2 + (tick * 0.003));
    const energyDispersion = 0.12 + (tick * 0.002);
    model.observeTick({
      ccc,
      pmia,
      sensorySignal,
      sensorDelta,
      stasisIndex,
      entropyExcitation,
      energyDispersion
    });
  }

  const diagnostics = model.getDiagnostics();
  const horizon = model.validatePredictionHorizon(5);

  assert.equal(diagnostics.trainingSteps, 49, 'CASE FAIL: trainingSteps should be 49 after 50 ticks.');
  assert.ok(diagnostics.residualEma < 0.5, 'CASE FAIL: residual EMA should stay below 0.5 after warmup.');
  assert.ok(horizon.horizonMae5 >= 0 && horizon.horizonMae5 < 0.3, 'CASE FAIL: horizon MAE5 should be below 0.3.');
  assert.notEqual(
    Number(diagnostics.weights.ccc.toFixed(6)),
    Number(initialCccWeight.toFixed(6)),
    'CASE FAIL: CCC weight must update from initial prior.'
  );

  console.log('ok worldmodel-realtime-integration.v55');
} catch (error) {
  console.error('fail worldmodel-realtime-integration.v55:', error.message);
  process.exit(1);
}

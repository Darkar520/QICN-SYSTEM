import assert from 'node:assert/strict';
import { OntologicalSingularityCore } from '../src/simulation/OntologicalSingularityCore.js';
import { QICNConfig } from '../services/config.js';

const approxGreater = (a, b, message) => {
  assert.ok(Number.isFinite(a) && Number.isFinite(b) && a > b, message);
};

const approxDifferent = (a, b, message, epsilon = 1e-9) => {
  assert.ok(Math.abs(a - b) > epsilon, message);
};

const originalTemp = QICNConfig.INFORMATIONAL_TEMP_T;

try {
  const core = new OntologicalSingularityCore();

  const baselinePressure = core.applyInternalPressure({
    stasisIndex: 0.15,
    sensorDeltaRms: 0.02,
    sensorSignal: 0.4
  });
  assert.equal(typeof baselinePressure.pressure, 'number', 'CASE 1 FAIL: baseline pressure should be numeric.');

  const beforeTemp = Number(QICNConfig.INFORMATIONAL_TEMP_T);
  const beforeTension = Number(core.metacognitiveStats.ontologicalTension || 0);
  const beforeIrreversible = Number(core.ontologicalState.entropy_irreversibility_index || 0);

  const coupled = core.applyInternalPressure({
    stasisIndex: 0.92,
    sensorDeltaRms: 0.18,
    sensorSignal: 0.81,
    realStasis: true,
    thermalShift: 0.9,
    stasisDelta: 0.2,
    tensionDelta: 0.25
  });

  assert.equal(coupled.realStasis, true, 'CASE 2 FAIL: expected realStasis=true under explicit flag.');
  approxGreater(coupled.pressure, 0, 'CASE 2 FAIL: expected positive pressure with coupled inputs.');
  approxGreater(Number(QICNConfig.INFORMATIONAL_TEMP_T), beforeTemp, 'CASE 2 FAIL: thermalShift did not increase INFORMATIONAL_TEMP_T.');
  approxGreater(Number(core.metacognitiveStats.ontologicalTension || 0), beforeTension, 'CASE 2 FAIL: tensionDelta did not raise ontological tension.');
  approxGreater(Number(core.ontologicalState.entropy_irreversibility_index || 0), beforeIrreversible, 'CASE 2 FAIL: stasis coupling did not increase entropy irreversibility index.');

  const beforeObserver = Number(core.metacognitiveStats.observerImpact || 0);
  core.registerObserverInteraction();
  const afterObserver = Number(core.metacognitiveStats.observerImpact || 0);
  approxGreater(afterObserver, beforeObserver, 'CASE 3 FAIL: observer interaction did not increase observerImpact.');
  approxDifferent(
    Number(core.ontologicalState.observer_resonance || 0),
    0,
    'CASE 3 FAIL: observer resonance should update after observer interaction.'
  );

  QICNConfig.INFORMATIONAL_TEMP_T = originalTemp;
  console.log('ok sensory-dynamics-coupling.v52');
} catch (error) {
  // restore mutable global config on failure as well
  QICNConfig.INFORMATIONAL_TEMP_T = originalTemp;
  console.error('fail sensory-dynamics-coupling.v52:', error.message);
  process.exit(1);
}

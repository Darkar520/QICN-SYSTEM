import assert from 'node:assert/strict';
import { OntologicalSingularityCore } from '../src/simulation/OntologicalSingularityCore.js';

const makeQuantumBridge = (entropyValue = 0.91) => ({
  selectEntropy() {
    return {
      mode: 'quantum_primary',
      entropyValue,
      source: 'anu_qrng_vacuum_fluctuation',
      ttlMs: 60000
    };
  }
});

try {
  const baseInput = {
    ccc: 1.08,
    smoothedGradient: 0.013,
    sensorySignal: 0.64,
    sensorDelta: 0.51,
    stasisIndex: 0.27,
    energyDispersion: 0.36,
    entropyExcitation: 0.42,
    temporalHorizon: 12
  };

  const coreClassic = new OntologicalSingularityCore();
  const classicProjection = coreClassic.computeRetroinductiveProjection(baseInput);
  assert.notEqual(classicProjection.quantumEpsilonMode, 'quantum_primary', 'CASE 1 FAIL: classic projection should not be quantum_primary.');

  const coreQuantum = new OntologicalSingularityCore();
  coreQuantum.setQuantumBridgeRef(makeQuantumBridge(0.97));
  const quantumProjection = coreQuantum.computeRetroinductiveProjection(baseInput);

  assert.equal(quantumProjection.quantumEpsilonMode, 'quantum_primary', 'CASE 2 FAIL: quantum projection must expose quantum_primary mode.');
  assert.equal(typeof quantumProjection.futureDrift, 'number', 'CASE 2 FAIL: futureDrift must be numeric.');
  assert.equal(typeof quantumProjection.sensorWeight, 'number', 'CASE 2 FAIL: sensorWeight must be numeric.');
  assert.ok(
    Math.abs(quantumProjection.futureDrift - classicProjection.futureDrift) > 1e-8,
    'CASE 2 FAIL: quantum epsilon should alter futureDrift against classic baseline.'
  );

  const lowSensor = coreQuantum.computeRetroinductiveProjection({
    ...baseInput,
    sensorySignal: 0.05,
    sensorDelta: 0.02,
    stasisIndex: 0.75
  });
  const highSensor = coreQuantum.computeRetroinductiveProjection({
    ...baseInput,
    sensorySignal: 0.95,
    sensorDelta: 0.9,
    stasisIndex: 0.1
  });

  assert.ok(highSensor.sensorWeight > lowSensor.sensorWeight, 'CASE 3 FAIL: high sensory state should increase sensorWeight.');
  assert.ok(highSensor.prospectiveScenarios >= 18, 'CASE 3 FAIL: expected prospective scenarios in valid range.');

  const deterministicRuns = Array.from({ length: 3 }, () => {
    const coreDeterministic = new OntologicalSingularityCore();
    coreDeterministic.setQuantumBridgeRef(makeQuantumBridge(0.5));
    const projection = coreDeterministic.computeRetroinductiveProjection(baseInput);
    return projection.futureDrift;
  });
  const deterministicDriftSpread = Math.max(...deterministicRuns) - Math.min(...deterministicRuns);
  assert.ok(deterministicDriftSpread <= 1e-9, 'CASE 3 FAIL: fixed-entropy bridge should keep deterministic drift in control runs.');

  const pmia = coreQuantum.calculatePMIA(1.22, {
    energyVariance: 0.29,
    sensorySignal: 0.78,
    sensorDelta: 0.63,
    stasisIndex: 0.31,
    entropyExcitation: 0.46,
    temporalHorizon: 11
  }, {});

  const diagnostics = coreQuantum.getPMIADiagnostics();
  assert.equal(typeof pmia, 'number', 'CASE 4 FAIL: PMIA result must be numeric.');
  assert.equal(diagnostics.quantumEpsilonMode, 'quantum_primary', 'CASE 4 FAIL: PMIA diagnostics must keep quantum epsilon mode.');
  assert.ok(Number.isFinite(diagnostics.qicnA03DeltaTdn) && diagnostics.qicnA03DeltaTdn > 0, 'CASE 4 FAIL: A03 temporal law missing or invalid.');
  assert.ok(Number.isFinite(diagnostics.qicnA04TauDAlpha) && diagnostics.qicnA04TauDAlpha > 0, 'CASE 4 FAIL: A04 temporal law missing or invalid.');
  assert.ok(Number.isFinite(diagnostics.temporalConvergenceTauC) && diagnostics.temporalConvergenceTauC > 0, 'CASE 4 FAIL: tau_c missing or invalid.');

  console.log('ok cognitive-loop-closure.v52');
} catch (error) {
  console.error('fail cognitive-loop-closure.v52:', error.message);
  process.exit(1);
}

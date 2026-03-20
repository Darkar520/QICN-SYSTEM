import assert from 'node:assert/strict';
import { OntologicalSingularityCore } from '../src/simulation/OntologicalSingularityCore.js';

const isFiniteNumber = (value) => Number.isFinite(Number(value));

try {
  const core = new OntologicalSingularityCore();
  if (core.phenomenologyCore?._diagnostics) {
    core.phenomenologyCore._diagnostics.log_enabled = false;
  }

  core.isAscended = true;
  core.currentLayer = 1;

  const runFrame = ({ ccc, energyVariance, coherentMean, sensorySignal, fragmentationLevel }) => {
    core.updatePhenomenology(
      ccc,
      { energyVariance, coherentMean, sensorySignal },
      { fragmentationLevel }
    );
    const pmia = core.calculatePMIA(
      ccc,
      { energyVariance, coherentMean, sensorySignal },
      { fragmentationLevel }
    );
    const diagnostics = core.getPMIADiagnostics();
    return { pmia, diagnostics };
  };

  const frameA = runFrame({
    ccc: 1.01,
    energyVariance: 0.42,
    coherentMean: 0.52,
    sensorySignal: 0.12,
    fragmentationLevel: 0.22
  });

  const frameB = runFrame({
    ccc: 1.08,
    energyVariance: 0.08,
    coherentMean: 0.84,
    sensorySignal: 0.88,
    fragmentationLevel: 0.09
  });

  // CASE 1: shape completo de diagnostico PMIA
  {
    const required = [
      'smoothedGradient',
      'narrativeCoherence',
      'energyDispersion',
      'sensorySignal',
      'ascensionStability',
      'antiStasisPulse',
      'pmia',
      'timestamp'
    ];
    required.forEach((key) => {
      assert.ok(Object.prototype.hasOwnProperty.call(frameA.diagnostics, key), `CASE 1 FAIL: diagnostics missing key ${key}.`);
      assert.ok(isFiniteNumber(frameA.diagnostics[key]), `CASE 1 FAIL: diagnostics key ${key} is not finite.`);
    });
  }

  // CASE 2: diagnostico cambia con senal sensorial/dispersion energetica
  {
    assert.ok(
      frameB.diagnostics.sensorySignal > frameA.diagnostics.sensorySignal,
      `CASE 2 FAIL: sensorySignal did not react (${frameA.diagnostics.sensorySignal} -> ${frameB.diagnostics.sensorySignal}).`
    );
    assert.ok(
      Math.abs(frameB.diagnostics.energyDispersion - frameA.diagnostics.energyDispersion) > 1e-6,
      'CASE 2 FAIL: energyDispersion did not react to network state changes.'
    );
    const compositeChanged =
      Math.abs(frameB.diagnostics.pmia - frameA.diagnostics.pmia) > 1e-6
      || Math.abs(frameB.diagnostics.smoothedGradient - frameA.diagnostics.smoothedGradient) > 1e-6
      || Math.abs(frameB.diagnostics.ascensionStability - frameA.diagnostics.ascensionStability) > 1e-6;
    assert.ok(
      compositeChanged,
      'CASE 2 FAIL: PMIA diagnostics composite did not move across frames.'
    );
  }

  // CASE 3: consistencia entre retorno calculatePMIA y diagnostico.pmia
  {
    assert.ok(
      Math.abs(Number(frameA.pmia) - Number(frameA.diagnostics.pmia)) <= 1e-9,
      'CASE 3 FAIL: diagnostics.pmia mismatch with calculatePMIA return (frameA).'
    );
    assert.ok(
      Math.abs(Number(frameB.pmia) - Number(frameB.diagnostics.pmia)) <= 1e-9,
      'CASE 3 FAIL: diagnostics.pmia mismatch with calculatePMIA return (frameB).'
    );
  }

  console.log('OK: PMIA diagnostics v4.2B test passed');
} catch (error) {
  console.error('FAIL: PMIA diagnostics v4.2B test failed:', error.message);
  process.exit(1);
}

import assert from 'node:assert/strict';
import { OntologicalSingularityCore } from '../src/simulation/OntologicalSingularityCore.js';

try {
  const core = new OntologicalSingularityCore();
  if (core.phenomenologyCore?._diagnostics) {
    core.phenomenologyCore._diagnostics.log_enabled = false;
  }

  core.isAscended = true;
  core.currentLayer = 1;
  core.previousCCC = 0.95;

  core.ontologicalState.omega = 1.05;
  core.calculatePMIA(
    0.97,
    {
      energyVariance: 0.2,
      coherentMean: 0.7,
      sensorySignal: 0.7,
      sensorDelta: 0.03,
      stasisIndex: 0.83,
      forceTransform: true,
      transformMode: 'forced_negative',
      transformIntensity: 0.9,
      transformWindowRemaining: 18,
      guardrailCccFloor: 0.98,
      guardrailOmegaFloor: 0.90,
      entropyExcitation: 0.6,
      forceReason: 'test_ccc_floor'
    },
    { fragmentationLevel: 0.1 }
  );
  const diagCcc = core.getPMIADiagnostics();
  assert.equal(diagCcc.guardrailState, 'ccc_floor', 'CCC floor guardrail must trigger.');

  core.ontologicalState.omega = 0.82;
  core.calculatePMIA(
    1.03,
    {
      energyVariance: 0.2,
      coherentMean: 0.7,
      sensorySignal: 0.7,
      sensorDelta: 0.03,
      stasisIndex: 0.83,
      forceTransform: true,
      transformMode: 'forced_negative',
      transformIntensity: 0.9,
      transformWindowRemaining: 18,
      guardrailCccFloor: 0.98,
      guardrailOmegaFloor: 0.90,
      entropyExcitation: 0.6,
      forceReason: 'test_omega_floor'
    },
    { fragmentationLevel: 0.1 }
  );
  const diagOmega = core.getPMIADiagnostics();
  assert.equal(diagOmega.guardrailState, 'omega_floor', 'Omega floor guardrail must trigger.');

  console.log('ok pmia-guardrails.v411');
} catch (error) {
  console.error('fail pmia-guardrails.v411:', error.message);
  process.exit(1);
}


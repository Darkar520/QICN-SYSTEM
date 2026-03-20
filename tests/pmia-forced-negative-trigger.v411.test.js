import assert from 'node:assert/strict';
import { OntologicalSingularityCore } from '../src/simulation/OntologicalSingularityCore.js';

try {
  const core = new OntologicalSingularityCore();
  if (core.phenomenologyCore?._diagnostics) {
    core.phenomenologyCore._diagnostics.log_enabled = false;
  }

  core.isAscended = true;
  core.currentLayer = 1;
  core.previousCCC = 0.92;
  core.ontologicalState.omega = 1.06;

  const idlePMIA = core.calculatePMIA(
    1.08,
    {
      energyVariance: 0.14,
      coherentMean: 0.82,
      sensorySignal: 0.76,
      sensorDelta: 0.05,
      stasisIndex: 0.84,
      forceTransform: false,
      transformMode: 'idle',
      transformIntensity: 0,
      transformWindowRemaining: 0,
      entropyExcitation: 0.2
    },
    { fragmentationLevel: 0.08 }
  );

  const forcedPMIA = core.calculatePMIA(
    1.08,
    {
      energyVariance: 0.14,
      coherentMean: 0.82,
      sensorySignal: 0.76,
      sensorDelta: 0.05,
      stasisIndex: 0.84,
      forceTransform: true,
      transformMode: 'forced_negative',
      transformIntensity: 1,
      transformWindowRemaining: 24,
      guardrailCccFloor: 0.98,
      guardrailOmegaFloor: 0.90,
      entropyExcitation: 0.8,
      forceReason: 'test_stasis_trigger'
    },
    { fragmentationLevel: 0.08 }
  );

  const diagnostics = core.getPMIADiagnostics();

  assert.ok(Number.isFinite(idlePMIA), 'idlePMIA must be finite.');
  assert.ok(Number.isFinite(forcedPMIA), 'forcedPMIA must be finite.');
  assert.ok(forcedPMIA < idlePMIA - 0.08, `forcedPMIA must be significantly lower than idlePMIA (${forcedPMIA} vs ${idlePMIA}).`);
  assert.ok(forcedPMIA <= -0.12, `forcedPMIA must enter negative transform zone (got ${forcedPMIA}).`);
  assert.equal(diagnostics.transformMode, 'forced_negative', 'diagnostics.transformMode must be forced_negative.');
  assert.equal(diagnostics.forceReason, 'test_stasis_trigger', 'diagnostics.forceReason mismatch.');
  assert.equal(diagnostics.negativeTicksRemaining, 24, 'diagnostics.negativeTicksRemaining mismatch.');

  console.log('ok pmia-forced-negative-trigger.v411');
} catch (error) {
  console.error('fail pmia-forced-negative-trigger.v411:', error.message);
  process.exit(1);
}


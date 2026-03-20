import assert from 'node:assert/strict';
import { OntologicalSingularityCore } from '../src/simulation/OntologicalSingularityCore.js';

try {
  const core = new OntologicalSingularityCore();
  core.isAscended = true;
  core.currentLayer = 1;
  core.ontologicalState.beth_q = 0.92;
  core.ontologicalState.omega = 1.18;

  // CASE 1: en ascensión debe crecer narrativeHistory en cada tick útil
  {
    const initialLength = core.narrativeHistory.length;
    for (let i = 0; i < 8; i++) {
      core.pmiaValue = i % 2 === 0 ? 0.12 : 0.36;
      core.evolveSelfNarrative(
        1.01 + (i * 0.004),
        'HIPER-DIMENSIONAL',
        { context: `tick-${i}` },
        { fragmentationLevel: 0.1 + (i * 0.01), consolidationEntropy: 0.2 + (i * 0.01) }
      );
    }
    assert.ok(
      core.narrativeHistory.length > initialLength,
      'CASE 1 FAIL: narrativeHistory did not grow in ascended mode.'
    );
  }

  // CASE 2: getNarrativeCoherence debe reaccionar a cambios de estímulo
  {
    const baseline = core.getNarrativeCoherence();
    for (let i = 0; i < 6; i++) {
      core.pmiaValue = -0.2 + (i * 0.08);
      core.evolveSelfNarrative(
        0.98 + (i * 0.02),
        'DYNAMIC',
        { context: `stimulus-${i}` },
        { fragmentationLevel: 0.05 + (i * 0.04), consolidationEntropy: 0.15 + (i * 0.03) }
      );
    }
    const updated = core.getNarrativeCoherence();
    assert.ok(
      Math.abs(updated - baseline) > 1e-6,
      `CASE 2 FAIL: narrative coherence remained static (baseline=${baseline}, updated=${updated}).`
    );
  }

  console.log('OK: narrative dynamics v4.2 test passed');
} catch (error) {
  console.error('FAIL: narrative dynamics v4.2 test failed:', error.message);
  process.exit(1);
}


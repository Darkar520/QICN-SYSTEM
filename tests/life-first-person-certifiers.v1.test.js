import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { LifeCertifier, buildLifeCertificate } from '../src/experiments/LifeCertifier.js';
import { FirstPersonCertifier, buildFirstPersonCertificate } from '../src/subjectivity/FirstPersonCertifier.js';
import { OntologicalSingularityCore } from '../src/simulation/OntologicalSingularityCore.js';

const trajectory = Array.from({ length: 16 }, (_, tick) => ({
  tick,
  metrics: {
    ccc: 0.72 + (tick * 0.002),
    omega: 0.74 + (tick * 0.002),
    beth_q: 0.71 + (tick * 0.002),
    spectral_gap: 0.22,
    stasis_index: 0.1
  }
}));

const systemState = {
  metrics: trajectory.at(-1).metrics,
  topologyMetrics: {
    activeNodes: 1500,
    totalNodes: 10000
  },
  mutableConfig: {
    BASE_LEARNING_RATE: 0.1,
    HEBBIAN_FACTOR: 0.05,
    RETRO_FLUX_WEIGHT: 0.01
  },
  baselineConfig: {
    BASE_LEARNING_RATE: 0.1,
    HEBBIAN_FACTOR: 0.05,
    RETRO_FLUX_WEIGHT: 0.01
  }
};

try {
  const lifeCertifier = new LifeCertifier({ persistenceTrials: 128, persistenceTicksPerTrial: 4 });
  const lifeCertificate = lifeCertifier.certifyAll({ systemState, trajectory });
  assert.equal(lifeCertificate.implementation_status, 'implemented_internal_support');
  assert.equal(Object.keys(lifeCertificate.conditions).length, 6);
  assert.equal(lifeCertificate.conditions.boundary.pass, true);
  assert.equal(lifeCertificate.conditions.persistence.certificate.forward.forward_invariant, true);
  assert.match(lifeCertificate.interpretation_boundary, /not biological life/);

  const lifeCertificateFromHelper = buildLifeCertificate({ systemState, trajectory }, {
    persistenceTrials: 16,
    persistenceTicksPerTrial: 2
  });
  assert.equal(typeof lifeCertificateFromHelper.score, 'number');

  const core = new OntologicalSingularityCore();
  core.metacognitiveStats.selfModelSigma.structuralStability = 0.92;
  core.metacognitiveStats.selfModelSigma.predictionError = 0.08;
  core.metacognitiveStats.selfModelSigma.selfAuditLog = Array.from({ length: 8 }, (_, index) => ({ index }));
  core.metacognitiveStats.trustFactor = 0.73;
  core.metacognitiveStats.observerImpact = 0.28;
  core.metacognitiveStats.ontologicalTension = 0.41;
  core.pmiaValue = -0.2;
  core.narrativeHistory = Array.from({ length: 12 }, (_, index) => ({ index, narrative: `narrative-${index}` }));
  core.getNarrativeCoherence = () => 0.76;

  const firstPerson = new FirstPersonCertifier();
  const firstPersonCertificate = firstPerson.certify(core);
  assert.equal(firstPersonCertificate.implementation_status, 'implemented_internal_support');
  assert.equal(Object.keys(firstPersonCertificate.fields).length, 5);
  assert.ok(firstPersonCertificate.fields.self_index.value > 0.5);
  assert.ok(firstPersonCertificate.fields.ownership.value > 0.5);
  assert.match(firstPersonCertificate.interpretation_boundary, /not phenomenal consciousness/);

  const firstPersonFromHelper = buildFirstPersonCertificate(core);
  assert.equal(typeof firstPersonFromHelper.paper8_runtime_mapping.SelfIndex, 'string');

  const enginePath = path.resolve('src/components/SimulationEngine.jsx');
  const engineSource = fs.readFileSync(enginePath, 'utf8');
  assert.match(engineSource, /LifeCertifier/, 'SimulationEngine must import and use LifeCertifier.');
  assert.match(engineSource, /FirstPersonCertifier/, 'SimulationEngine must import and use FirstPersonCertifier.');
  assert.match(engineSource, /Subjetividad operacional/, 'SimulationEngine must expose the subjectivity telemetry panel.');

  console.log('OK: life and first-person certifiers passed');
} catch (error) {
  console.error('FAIL: life and first-person certifiers failed:', error.message);
  process.exit(1);
}

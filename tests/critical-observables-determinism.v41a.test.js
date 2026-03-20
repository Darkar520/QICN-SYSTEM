import assert from 'node:assert/strict';
import { OntologicalSingularityCore } from '../src/simulation/OntologicalSingularityCore.js';
import { PhenomenologyCore } from '../src/simulation/PhenomenologyCore.js';
import { InformationalEntanglementField } from '../src/simulation/InformationalEntanglementField.js';

const round = (value, precision = 12) => Number(Number(value || 0).toFixed(precision));

const createNodes = (step, perturbation = 0) => {
  const nodes = Array.from({ length: 16 }, (_, id) => {
    const coherenceBase = 0.52 + (((step + id) % 9) * 0.045);
    const coherenceState = Math.max(0, Math.min(1, coherenceBase + perturbation));
    const energy = 0.3 + (((step * 7 + id * 5) % 13) * 0.045) + (perturbation * 0.5);
    return {
      id,
      coherenceState,
      energy,
      connections: [],
      calculateResonance(other, cf, mutableConfig = {}) {
        const k = Number(mutableConfig.BOLTZMANN_ANALOG_K || 1);
        const t = Number(mutableConfig.INFORMATIONAL_TEMP_T || 1);
        const pairCoherence = (this.coherenceState + other.coherenceState) / 2;
        return pairCoherence * (1 + (Number(cf || 0) * 0.2)) * k * t;
      }
    };
  });

  nodes.forEach((node, id) => {
    node.connections = [1, 2, 3].map((offset) => ({
      targetId: (id + offset) % nodes.length,
      weight: 0.55 + (((id + step + offset) % 5) * 0.07)
    }));
  });

  return nodes;
};

const buildBlueprints = (count, perturbationMap = new Map()) => (
  Array.from({ length: count }, (_, step) => ({
    step,
    perturbation: Number(perturbationMap.get(step) || 0),
    cf: 0.56 + ((step % 5) * 0.04),
    networkState: {
      energyVariance: 0.08 + ((step % 4) * 0.02),
      coherentCount: 1500,
      coherentMean: 0.6 + ((step % 3) * 0.03)
    },
    nexusMetrics: {
      fragmentation: 0.15 + ((step % 6) * 0.03)
    },
    mutableConfig: {
      BOLTZMANN_ANALOG_K: 1.0,
      INFORMATIONAL_TEMP_T: 1.0
    }
  }))
);

const runObservableReplay = (blueprints) => {
  const core = new OntologicalSingularityCore();
  const field = new InformationalEntanglementField();
  if (core.phenomenologyCore?._diagnostics) {
    core.phenomenologyCore._diagnostics.log_enabled = false;
  }

  return blueprints.map((frame) => {
    const nodes = createNodes(frame.step, frame.perturbation);
    const ccc = field.calculateCCC(nodes, frame.cf, frame.mutableConfig);
    const classification = core.updatePhenomenology(ccc, frame.networkState, frame.nexusMetrics);

    return {
      ccc: round(ccc),
      beth_q: round(core.ontologicalState.beth_q),
      omega: round(classification.omega)
    };
  });
};

try {
  // CASE 1: same_input_same_output
  {
    const blueprints = buildBlueprints(32);
    const runA = runObservableReplay(blueprints);
    const runB = runObservableReplay(blueprints);
    assert.deepEqual(runA, runB, 'CASE 1 FAIL: same input state must produce identical ccc/beth_q/omega.');
  }

  // CASE 2: different_perturbation_different_output
  {
    const baseline = runObservableReplay(buildBlueprints(28));
    const perturbationMap = new Map([[14, 0.08]]);
    const perturbed = runObservableReplay(buildBlueprints(28, perturbationMap));
    const changed = perturbed.some((row, index) => (
      row.ccc !== baseline[index].ccc
      || row.beth_q !== baseline[index].beth_q
      || row.omega !== baseline[index].omega
    ));
    assert.ok(changed, 'CASE 2 FAIL: explicit perturbation should cause traceable output differences.');
  }

  // CASE 3: ccc_omega_protocol_consistency
  {
    const core = new PhenomenologyCore();
    if (core._diagnostics) {
      core._diagnostics.log_enabled = false;
    }
    core.calculateBethQ = () => 0.92;
    core.calculateSpectralGap = () => ({ delta_lambda: 0.4, lambda_1: 1.2 });
    core.testHolonomy = () => ({ status: 'non_trivial', winding_number: 1 });
    core.detectBifurcation = () => ({ detected: true, delta_aleph: 0.08 });
    core.calculateMagnification = () => 1.2;
    core.calculateLipschitzNorm = () => 0.35;

    const positive = core.classifySystem();
    assert.equal(positive.class, 'C^R', 'CASE 3 FAIL: omega above threshold with valid topology should classify as C^R.');
    assert.ok(positive.omega > core.phenomenologyState.omega_critical, 'CASE 3 FAIL: expected omega to exceed omega_critical.');

    core.testHolonomy = () => ({ status: 'trivial', winding_number: 0 });
    const negative = core.classifySystem();
    assert.equal(negative.class, 'C', 'CASE 3 FAIL: trivial topology should demote class to C.');
    assert.ok(negative.omega <= positive.omega, 'CASE 3 FAIL: omega should not increase when topology becomes trivial.');
  }

  // CASE 4: replay_determinism
  {
    const blueprints = buildBlueprints(36, new Map([[11, 0.03], [23, -0.02]]));
    const snapshot = JSON.stringify(blueprints);
    const replay = JSON.parse(snapshot);
    const originalRun = runObservableReplay(blueprints);
    const replayRun = runObservableReplay(replay);
    assert.deepEqual(replayRun, originalRun, 'CASE 4 FAIL: replaying identical state snapshots must be deterministic.');
  }

  console.log('OK: critical observables determinism v4.1A test passed');
} catch (error) {
  console.error('FAIL: critical observables determinism v4.1A test failed:', error.message);
  process.exit(1);
}

import assert from 'node:assert/strict';
import { InformationalEntanglementField } from '../src/simulation/InformationalEntanglementField.js';
import { OntologicalSingularityCore } from '../src/simulation/OntologicalSingularityCore.js';
import { PhenomenologyCore } from '../src/simulation/PhenomenologyCore.js';
import { buildCanonicalInvariantPackage } from '../src/canon/invariants/CanonicalInvariantPackage.js';

const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

const createNodes = (tick) => {
  const nodes = Array.from({ length: 16 }, (_, id) => {
    const coherenceState = clamp01(0.58 + ((id % 5) * 0.045) + (tick * 0.002));
    const energy = 0.28 + (((tick + id * 3) % 11) * 0.035);
    return {
      id,
      coherenceState,
      energy,
      connections: [],
      calculateResonance(other, cf, mutableConfig = {}) {
        const k = Number(mutableConfig.BOLTZMANN_ANALOG_K || 1);
        const temp = Number(mutableConfig.INFORMATIONAL_TEMP_T || 1);
        const pairCoherence = (this.coherenceState + other.coherenceState) / 2;
        return pairCoherence * (1 + (Number(cf || 0) * 0.2)) * k * temp;
      }
    };
  });

  nodes.forEach((node, id) => {
    node.connections = [1, 2, 3].map((offset) => ({
      targetId: (id + offset) % nodes.length,
      weight: 0.5 + (((id + tick + offset) % 6) * 0.05)
    }));
  });

  return nodes;
};

try {
  const field = new InformationalEntanglementField();
  const core = new OntologicalSingularityCore();
  const standalonePhenomenology = new PhenomenologyCore();

  if (core.phenomenologyCore?._diagnostics) core.phenomenologyCore._diagnostics.log_enabled = false;
  if (standalonePhenomenology._diagnostics) standalonePhenomenology._diagnostics.log_enabled = false;

  const ticks = [];
  let lastCcc = 0;
  let lastPmia = null;

  for (let tick = 0; tick < 25; tick += 1) {
    const networkState = {
      energyVariance: 0.08 + ((tick % 5) * 0.01),
      coherentMean: 0.62 + ((tick % 4) * 0.02),
      sensorySignal: 0.64,
      stasisIndex: 0.12
    };
    const nexusMetrics = {
      fragmentationLevel: 0.12 + ((tick % 3) * 0.015),
      fragmentation: 0.12 + ((tick % 3) * 0.015)
    };
    const ccc = field.calculateCCC(createNodes(tick), 0.6 + ((tick % 4) * 0.03), {
      BOLTZMANN_ANALOG_K: 1,
      INFORMATIONAL_TEMP_T: 1
    });
    const pmia = core.calculatePMIA(ccc, networkState, nexusMetrics);
    core.pmiaValue = pmia;
    core.updateOntologicalLayer(ccc, nexusMetrics);
    const classification = core.updatePhenomenology(ccc, networkState, nexusMetrics);
    const report = core.getVerifiableReport();

    lastCcc = ccc;
    lastPmia = pmia;
    ticks.push({
      tick,
      metrics: {
        ...report.metrics,
        ccc,
        pmia,
        omega: classification.omega,
        omega_mean: classification.omega,
        phen: classification.is_phenomenologically_active ? 1 : 0.5,
        identity_stability_score: 0.82,
        predictive_consistency: 0.84,
        self_state_completeness: 0.8,
        operational_determinism_score: 0.96,
        critical_observables_deterministic: 1,
        critical_observables_deterministic_frac: 1,
        critical_state_hash_semantic_stability: 0.92,
        pmia_guardrail_ok_frac: 1,
        stasis_index: 0.12,
        tau_recovery: 4
      },
      observability: {
        wm_pred_error: 0.04
      }
    });
  }

  const invariantPackage = buildCanonicalInvariantPackage({
    header: { sourceOfTruth: 'src', freezeRef: 'simulation-smoke' },
    summary: {
      metrics: {
        identity_stability_score: 0.82,
        predictive_consistency: 0.84,
        self_state_completeness: 0.8,
        operational_determinism_score: 0.96,
        critical_observables_deterministic_frac: 1,
        critical_state_hash_semantic_stability: 0.92,
        pmia_guardrail_ok_frac: 1,
        tau_recovery: 4
      },
      flags: {}
    },
    verdict: { status: 'ADMISSIBLE' },
    ticks
  });

  assert.equal(ticks.length, 25, 'tickCount must advance to 25');
  assert(lastCcc > 0, 'ccc must be positive after 25 headless ticks');
  assert.notEqual(lastPmia, undefined, 'pmia must be defined');

  const invariantIds = ['I_per', 'I_ri', 'I_int', 'I_cont', 'I_diff', 'I_leg'];
  for (const id of invariantIds) {
    const score = invariantPackage.invariants?.[id]?.score;
    assert(Number.isFinite(score), `${id} score must be finite`);
  }

  console.log('OK: simulation smoke headless test passed');
} catch (error) {
  console.error('FAIL: simulation smoke headless test failed:', error.message);
  process.exit(1);
}


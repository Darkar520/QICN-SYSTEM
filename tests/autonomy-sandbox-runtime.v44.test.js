import assert from 'node:assert/strict';
import { KaizenMetamorphosisEngine } from '../src/simulation/KaizenMetamorphosisEngine.js';

const initialConfig = {
  BASE_LEARNING_RATE: 0.1,
  HEBBIAN_FACTOR: 0.05,
  SYNAPTIC_PRUNING_THRESHOLD: 0.15,
  PLASTICITY_DECAY: 0.98,
  RETRO_FLUX_WEIGHT: 0.15,
  BOLTZMANN_ANALOG_K: 1.0,
  INFORMATIONAL_TEMP_T: 1.0
};

try {
  const engine = new KaizenMetamorphosisEngine({ ...initialConfig });
  const systemState = {
    stasisIndex: 0.82,
    stasisPressure: 0.9,
    metacognitiveStrain: 0.66,
    sensorSignal: 0.72,
    sensorDelta: 0.18,
    pmia: 0.12,
    pmiaDeltaRms: 0.0009,
    latencyFailureRate: 0.2,
    cooldownActive: true
  };
  const policy = {
    enabled: true,
    allowedActions: ['stabilize_learning', 'anti_stasis_boost', 'sensor_load_shed', 'llm_pressure_relief']
  };

  // CASE 1: deterministic planner for same state
  {
    const a = engine.selectSandboxAction(systemState, policy);
    const b = engine.selectSandboxAction(systemState, policy);
    assert.ok(a && b, 'CASE 1 FAIL: planner did not return an action.');
    assert.equal(a.actionId, b.actionId, 'CASE 1 FAIL: planner is not deterministic for same state.');
    assert.equal(Number(a.score.toFixed(10)), Number(b.score.toFixed(10)), 'CASE 1 FAIL: planner score is not deterministic.');
  }

  // CASE 2: selected action belongs to whitelist
  {
    const action = engine.selectSandboxAction(systemState, policy);
    assert.ok(policy.allowedActions.includes(action.actionId), `CASE 2 FAIL: action ${action.actionId} not in whitelist.`);
  }

  // CASE 3: execution maps to forced mutation compatible with mutable keys
  {
    const selected = engine.selectSandboxAction(systemState, policy);
    const mapped = engine.executeSandboxAction(selected, systemState);
    assert.ok(mapped, 'CASE 3 FAIL: executeSandboxAction returned null.');
    assert.ok(engine.mutableKeys.includes(mapped.forcedKey), `CASE 3 FAIL: forced key not mutable (${mapped.forcedKey}).`);
    assert.ok(mapped.forcedDirection === 1 || mapped.forcedDirection === -1, 'CASE 3 FAIL: forced direction must be +/-1.');
  }

  // CASE 4: forced atomic mutation path is deterministic in magnitude
  {
    const before = { ...engine.mutableConfig };
    const r1 = engine.executeAtomicStep(1.02, 0.2, 0, { vector: 0 }, 'BASE_LEARNING_RATE', 1);
    const after1 = engine.mutableConfig.BASE_LEARNING_RATE;
    engine.mutableConfig = { ...before };
    const r2 = engine.executeAtomicStep(1.02, 0.2, 0, { vector: 0 }, 'BASE_LEARNING_RATE', 1);
    const after2 = engine.mutableConfig.BASE_LEARNING_RATE;
    assert.ok(r1.changeApplied && r2.changeApplied, 'CASE 4 FAIL: expected forced mutation to apply.');
    assert.equal(
      Number((after1 - before.BASE_LEARNING_RATE).toFixed(12)),
      Number((after2 - before.BASE_LEARNING_RATE).toFixed(12)),
      'CASE 4 FAIL: forced mutation step should be deterministic.'
    );
  }

  console.log('OK: autonomy sandbox runtime v4.4 test passed');
} catch (error) {
  console.error('FAIL: autonomy sandbox runtime v4.4 test failed:', error.message);
  process.exit(1);
}

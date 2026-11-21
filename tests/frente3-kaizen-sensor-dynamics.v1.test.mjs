// claim_scope: internal_runtime_engineering
// evidence_scope: internal_support_only
// interpretation_boundary: Frente 3 Pillar A verification (Kaizen 6/6 + bounded sensory observer/latency dynamics + B0 negative control).
import assert from 'node:assert/strict';
import { QICNConfig } from '../services/config.js';
import {
  SENSOR_OBSERVER_DYNAMICS_BOUNDS,
  applySensorObserverConfigModulation,
  computeSensorObserverDynamicsModulation
} from '../src/simulation/SensorObserverDynamicsBridge.js';
import {
  KaizenMetamorphosisEngine,
  KAIZEN_LEARNABLE_KEYS,
  KAIZEN_LEARNABLE_KEYS_ALL
} from '../src/simulation/KaizenMetamorphosisEngine.js';
import { ConsciousNode } from '../src/simulation/ConsciousNode.js';
import { createDeterministicEnvironment } from '../src/runtime/ExecutionEnvironment.js';
import { createHeadlessRuntimeSession } from '../src/runtime/HeadlessRuntimeSession.js';
import { captureRuntimeSnapshot, verifySnapshotDigest } from '../src/language/runtimeSnapshot.js';

// 1. Default config stays B0-safe
assert.equal(QICNConfig.KAIZEN_ADJUSTMENT_MODE, 'legacy', 'B0 default KAIZEN_ADJUSTMENT_MODE must stay legacy');
assert.equal(QICNConfig.SENSOR_OBSERVER_DYNAMICS_ENABLED, false, 'B0 default SENSOR_OBSERVER_DYNAMICS_ENABLED must stay false');

// 2. Pure bridge: identity when disabled, bounded [0.85, 1.15] when enabled, monotonic decay
{
  const off = computeSensorObserverDynamicsModulation({ observerImpact: 0.9, latencyStrain: 0.8, enabled: false });
  assert.equal(off.active, false);
  assert.equal(off.learningRateScale, 1);
  assert.equal(off.hebbianScale, 1);
  assert.equal(off.temperatureScale, 1);
  assert.equal(off.retroFluxScale, 1);
  assert.equal(off.coherenceStabilizationPull, 0);

  const onObs = computeSensorObserverDynamicsModulation({ observerImpact: 1, latencyStrain: 0, enabled: true });
  const onStrain = computeSensorObserverDynamicsModulation({ observerImpact: 0, latencyStrain: 1, enabled: true });
  for (const mod of [onObs, onStrain]) {
    assert.equal(mod.active, true);
    for (const k of ['learningRateScale', 'hebbianScale', 'temperatureScale', 'retroFluxScale']) {
      assert.ok(mod[k] >= SENSOR_OBSERVER_DYNAMICS_BOUNDS.scaleMin && mod[k] <= SENSOR_OBSERVER_DYNAMICS_BOUNDS.scaleMax, `${k} out of bounds: ${mod[k]}`);
    }
  }
  assert.ok(onObs.learningRateScale > 1 && onObs.coherenceStabilizationPull > 0, 'observer presence should gently sharpen learning and stability pull');
  assert.ok(onStrain.temperatureScale > 1 && onStrain.hebbianScale < 1 && onStrain.retroFluxScale < 1, 'latency strain should act as a homeostatic brake');
  assert.ok(onObs.observerImpactNext < 1, 'observerImpact must decay per tick');

  const base = { BASE_LEARNING_RATE: 0.1, HEBBIAN_FACTOR: 0.05, INFORMATIONAL_TEMP_T: 1.0, RETRO_FLUX_WEIGHT: 0.15 };
  const derived = applySensorObserverConfigModulation(base, onStrain);
  assert.notEqual(derived, base, 'must not mutate base config');
  assert.equal(base.INFORMATIONAL_TEMP_T, 1.0, 'base config must stay untouched');
  assert.ok(derived.INFORMATIONAL_TEMP_T > 1.0 && derived.HEBBIAN_FACTOR < 0.05);
}

// 3. PLASTICITY_DECAY active consumer + 6/6 Kaizen learnable keys when enabled vs 5/6 B0 negative control
{
  const envOff = createDeterministicEnvironment({ config: { ...QICNConfig, SENSOR_OBSERVER_DYNAMICS_ENABLED: false }, seed: 11 });
  const envOn = createDeterministicEnvironment({ config: { ...QICNConfig, SENSOR_OBSERVER_DYNAMICS_ENABLED: true }, seed: 11 });

  const nOff1 = new ConsciousNode(1, { BASE_LEARNING_RATE: 0.1 }, envOff);
  const nOff2 = new ConsciousNode(1, { BASE_LEARNING_RATE: 0.1 }, createDeterministicEnvironment({ config: { ...QICNConfig, SENSOR_OBSERVER_DYNAMICS_ENABLED: false }, seed: 11 }));
  nOff1.connections = [{ targetId: 2, weight: 0.9 }];
  nOff2.connections = [{ targetId: 2, weight: 0.9 }];
  nOff1.applyPlasticity(0.1, { HEBBIAN_FACTOR: 0.05, SYNAPTIC_PRUNING_THRESHOLD: 0.15, PLASTICITY_DECAY: 0.85 });
  nOff2.applyPlasticity(0.1, { HEBBIAN_FACTOR: 0.05, SYNAPTIC_PRUNING_THRESHOLD: 0.15, PLASTICITY_DECAY: 0.99 });
  assert.equal(nOff1.connections[0].weight, nOff2.connections[0].weight, 'B0 negative control: PLASTICITY_DECAY must not alter weights when flag is false');

  const nOnLow = new ConsciousNode(1, { BASE_LEARNING_RATE: 0.1 }, envOn);
  const nOnHigh = new ConsciousNode(1, { BASE_LEARNING_RATE: 0.1 }, createDeterministicEnvironment({ config: { ...QICNConfig, SENSOR_OBSERVER_DYNAMICS_ENABLED: true }, seed: 11 }));
  nOnLow.connections = [{ targetId: 2, weight: 0.9 }];
  nOnHigh.connections = [{ targetId: 2, weight: 0.9 }];
  nOnLow.applyPlasticity(0.1, { HEBBIAN_FACTOR: 0.05, SYNAPTIC_PRUNING_THRESHOLD: 0.15, PLASTICITY_DECAY: 0.85 });
  nOnHigh.applyPlasticity(0.1, { HEBBIAN_FACTOR: 0.05, SYNAPTIC_PRUNING_THRESHOLD: 0.15, PLASTICITY_DECAY: 0.99 });
  assert.ok(nOnLow.connections[0].weight < nOnHigh.connections[0].weight, 'active mode: lower PLASTICITY_DECAY must relax extreme weight toward 0.5 faster');

  // Kaizen key pool switches cleanly between 5/6 (B0) and 6/6 (active)
  assert.equal(KAIZEN_LEARNABLE_KEYS.length, 5);
  assert.equal(KAIZEN_LEARNABLE_KEYS_ALL.length, 6);
  assert.ok(KAIZEN_LEARNABLE_KEYS_ALL.includes('PLASTICITY_DECAY'));

  const base = { BASE_LEARNING_RATE: 0.1, HEBBIAN_FACTOR: 0.05, SYNAPTIC_PRUNING_THRESHOLD: 0.15, PLASTICITY_DECAY: 0.98, RETRO_FLUX_WEIGHT: 0.15, BOLTZMANN_ANALOG_K: 1, INFORMATIONAL_TEMP_T: 1 };
  const kOff = new KaizenMetamorphosisEngine({ ...base }, envOff);
  const kOn = new KaizenMetamorphosisEngine({ ...base }, envOn);
  const triedOff = new Set();
  const triedOn = new Set();
  for (let i = 0; i < 24 * 40; i += 1) {
    const sample = { ccc: 0.7 + (i % 2) * 0.004, stasis: 0, strain: 0 };
    const e1 = kOff.observeLearningTick(sample);
    const e2 = kOn.observeLearningTick(sample);
    if (e1?.event === 'trial_started') triedOff.add(e1.key);
    if (e2?.event === 'trial_started') triedOn.add(e2.key);
  }
  assert.equal(triedOff.size, 5);
  assert.ok(!triedOff.has('PLASTICITY_DECAY'));
  assert.equal(triedOn.size, 6, `expected all 6 keys learned when active, got ${[...triedOn]}`);
  assert.ok(triedOn.has('PLASTICITY_DECAY'), 'PLASTICITY_DECAY must be learned when active');
}

// 4. Paired headless ablation: active dynamics vs OFF negative control + reversible observer decay + chat decoupling
{
  const runArm = ({ kaizenMode, sensorObsEnabled, probe = false, uncoupledChatCalls = 0 }) => {
    const session = createHeadlessRuntimeSession({
      config: {
        ...QICNConfig,
        KAIZEN_ADJUSTMENT_MODE: kaizenMode,
        SENSOR_OBSERVER_DYNAMICS_ENABLED: sensorObsEnabled
      },
      seed: 19,
      nodes: 24
    });
    session.initialize();
    if (probe) session.environment.controls.observerLatencyProbe = true;
    const series = [];
    for (let t = 1; t <= 40; t += 1) {
      if (uncoupledChatCalls > 0 && t <= uncoupledChatCalls) {
        session.bag.apiCallLog.current.push({
          timestamp: session.environment.peekClock(),
          latency: 9500,
          success: false,
          context: 'chat-conversation',
          dynamicsCoupled: false
        });
      }
      session.step(t);
      series.push(session.bag.ontologicalCore.current.ontologicalState.coherence);
    }
    // Turn off probe for 15 ticks and verify observerImpact decays smoothly
    session.environment.controls.observerLatencyProbe = false;
    const obsPeak = session.bag.ontologicalCore.current.metacognitiveStats.observerImpact;
    for (let t = 41; t <= 55; t += 1) {
      session.step(t);
    }
    const obsAfterDecay = session.bag.ontologicalCore.current.metacognitiveStats.observerImpact;
    return { session, series, obsPeak, obsAfterDecay };
  };

  const ctrlA = runArm({ kaizenMode: 'legacy', sensorObsEnabled: false, probe: true });
  const ctrlB = runArm({ kaizenMode: 'legacy', sensorObsEnabled: false, probe: true });
  const maxDiffIdentical = Math.max(...ctrlA.series.map((v, i) => Math.abs(v - ctrlB.series[i])));
  assert.equal(maxDiffIdentical, 0, 'identical runs must have zero diff');

  const active = runArm({ kaizenMode: 'learned', sensorObsEnabled: true, probe: true });
  const maxDiffActiveVsOff = Math.max(...active.series.map((v, i) => Math.abs(v - ctrlA.series[i])));
  assert.ok(maxDiffActiveVsOff > 1e-6, `active Kaizen+sensor/observer dynamics must measurably diverge from OFF control (got ${maxDiffActiveVsOff})`);
  assert.ok(active.obsPeak > 0, 'probe should raise observerImpact');
  assert.ok(active.obsAfterDecay < active.obsPeak, `observerImpact must decay after probe ends (${active.obsPeak} -> ${active.obsAfterDecay})`);

  // Negative control: uncoupled chat calls (dynamicsCoupled=false) MUST NOT change trajectory even when active!
  const activeWithChat = runArm({ kaizenMode: 'learned', sensorObsEnabled: true, probe: true, uncoupledChatCalls: 20 });
  const chatMaxDiff = Math.max(...active.series.map((v, i) => Math.abs(v - activeWithChat.series[i])));
  assert.equal(chatMaxDiff, 0, `chat calls with dynamicsCoupled=false must NEVER change trajectory (got ${chatMaxDiff})`);

  // Snapshot telemetry remains SHA-256 valid and reports learned kaizen_mode + latency_strain without breaking frozen runtimeSnapshot.js
  const snapOn = captureRuntimeSnapshot(active.session.bag.ontologicalCore.current, {
    tick: active.session.completedTick,
    now: 1800000000000,
    nodes: active.session.bag.nodalLayer.current.nodes,
    config: active.session.environment.config
  });
  assert.equal(verifySnapshotDigest(snapOn), true);
  assert.equal(snapOn.modes.kaizen_mode, 'learned');
  assert.ok(Number.isFinite(snapOn.structural_profile.latency_strain));
}

console.log('OK: frente3-kaizen-sensor-dynamics.v1 passed (6/6 Kaizen, bounded observer/latency modulation, decay, chat decoupling, B0 negative controls)');

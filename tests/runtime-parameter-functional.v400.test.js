import assert from 'node:assert/strict';
import { ConsciousNode } from '../src/simulation/ConsciousNode.js';
import { KaizenMetamorphosisEngine } from '../src/simulation/KaizenMetamorphosisEngine.js';
import { MetaSovereigntyCheck } from '../src/simulation/MetaSovereigntyCheck.js';
import { SensoryPerceptionEngine } from '../src/simulation/SensoryPerceptionEngine.js';

const approxEqual = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

const createAuditMock = ({
  frameTimes = [30, 35, 40],
  targetFPS = 15,
  brightness = 0.55,
  noiseFloor = 0.2,
  voiceClarity = 0.85,
  continuityLagMs = 100,
  syntheticFallbackActive = false,
  sensorBlackout = false
} = {}) => ({
  performanceConfig: {
    targetFPS,
    minFPS: 5,
    adaptiveSampling: true,
    frameSkipThreshold: 0.85,
    frameProcessingTimes: frameTimes,
    maxFrameTimeHistory: 30,
    faceDetectMinIntervalMs: 150,
    faceDetectMaxIntervalMs: 600
  },
  videoPerception: {
    scene: { brightness, contrast: 0.5 },
    humanPresence: { count: 1 },
    faces: [{ engagement: { score: 0.8 } }]
  },
  audioPerception: {
    environment: { noiseFloor },
    voice: {
      clarity: voiceClarity,
      isSpeaking: true,
      tonalVariance: 0.02,
      jitter: 0.01,
      shimmer: 0.01
    }
  },
  syntheticImagination: { active: syntheticFallbackActive },
  _lastContinuityTickTs: Date.now() - continuityLagMs,
  arePrimarySensorsUnavailable: () => sensorBlackout,
  getAdaptiveFrameInterval: SensoryPerceptionEngine.prototype.getAdaptiveFrameInterval
});

try {
  // CASE 1: ConsciousNode resonance responds to K/T changes
  {
    const mutableConfig = { BASE_LEARNING_RATE: 0.1 };
    const nodeA = new ConsciousNode(1, mutableConfig);
    const nodeB = new ConsciousNode(2, mutableConfig);
    nodeA.energy = 0.9;
    nodeB.energy = 0.2;
    nodeA.intensity = 1.0;
    nodeA.phase = 0;
    nodeB.phase = 0;

    const lowKT = nodeA.calculateResonance(nodeB, 0.5, {
      BOLTZMANN_ANALOG_K: 0.2,
      INFORMATIONAL_TEMP_T: 0.2
    });
    const highKT = nodeA.calculateResonance(nodeB, 0.5, {
      BOLTZMANN_ANALOG_K: 5.0,
      INFORMATIONAL_TEMP_T: 5.0
    });

    assert.ok(highKT > lowKT, 'CASE 1 FAIL: resonance should increase with higher K*T.');
  }

  // CASE 2: applyPlasticity responds to HEBBIAN_FACTOR and SYNAPTIC_PRUNING_THRESHOLD
  {
    const mutableConfig = { BASE_LEARNING_RATE: 0.1 };
    const node = new ConsciousNode(3, mutableConfig);
    node.intensity = 1;
    node.connections = [
      { targetId: 10, weight: 0.4 },
      { targetId: 11, weight: 0.12 }
    ];

    const originalRandom = Math.random;
    try {
      Math.random = () => 0.5;
      node.applyPlasticity(-1, {
        HEBBIAN_FACTOR: 0.05,
        SYNAPTIC_PRUNING_THRESHOLD: 0.15
      });
    } finally {
      Math.random = originalRandom;
    }

    assert.ok(node.connections.length === 1, 'CASE 2 FAIL: connection below pruning threshold should be removed.');
    assert.ok(node.connections[0].weight < 0.4, 'CASE 2 FAIL: remaining connection should be updated by plasticity dynamics.');
  }

  // CASE 3: Kaizen executeAtomicStep keeps key-specific bounds
  {
    const engine = new KaizenMetamorphosisEngine({
      BASE_LEARNING_RATE: 0.1,
      HEBBIAN_FACTOR: 0.05,
      SYNAPTIC_PRUNING_THRESHOLD: 0.15,
      PLASTICITY_DECAY: 0.98,
      RETRO_FLUX_WEIGHT: 0.15,
      BOLTZMANN_ANALOG_K: 1.0,
      INFORMATIONAL_TEMP_T: 1.0
    });

    const keysToCheck = [
      'BASE_LEARNING_RATE',
      'HEBBIAN_FACTOR',
      'SYNAPTIC_PRUNING_THRESHOLD',
      'PLASTICITY_DECAY',
      'RETRO_FLUX_WEIGHT',
      'BOLTZMANN_ANALOG_K',
      'INFORMATIONAL_TEMP_T'
    ];

    keysToCheck.forEach((key) => {
      const result = engine.executeAtomicStep(0.9, 0.1, 0, { vector: 0 }, key, 1);
      assert.ok(result.changeApplied, `CASE 3 FAIL: expected mutation for ${key}.`);
      const value = engine.mutableConfig[key];
      if (key.includes('RATE') || key.includes('FACTOR') || key.includes('WEIGHT')) {
        assert.ok(value >= 0.0001 && value <= 0.5, `CASE 3 FAIL: out-of-range bound for ${key}.`);
      } else if (key.includes('THRESHOLD') || key.includes('DECAY')) {
        assert.ok(value >= 0.01 && value <= 0.99, `CASE 3 FAIL: out-of-range bound for ${key}.`);
      } else {
        assert.ok(value >= 0.1 && value <= 5.0, `CASE 3 FAIL: out-of-range bound for ${key}.`);
      }
    });
  }

  // CASE 4: MetaSovereigntyCheck sensor score weighted blend
  {
    const checker = new MetaSovereigntyCheck();
    checker.updateSensorFeedback({
      faceConfidence: 0.8,
      faceCount: 1,
      engagement: 0.5,
      intentConfidence: 0.3
    });
    const score = checker.getSensorFeedbackScore();
    assert.ok(approxEqual(score, 0.61, 1e-9), `CASE 4 FAIL: expected 0.61, got ${score}.`);

    checker.lastSensorFeedback.timestamp = Date.now() - 6000;
    assert.equal(checker.getSensorFeedbackScore(), 0.5, 'CASE 4 FAIL: stale feedback must fallback to 0.5.');
  }

  // CASE 5: Sensory fidelity audit classification nominal/degraded/critical
  {
    const nominalMock = createAuditMock({
      frameTimes: [20, 22, 24],
      brightness: 0.55,
      noiseFloor: 0.15,
      voiceClarity: 0.9
    });
    const nominal = SensoryPerceptionEngine.prototype.calculateSensorFidelityAudit.call(nominalMock);
    assert.equal(nominal.technicalStatus, 'nominal', 'CASE 5 FAIL: expected nominal status.');

    const degradedMock = createAuditMock({
      frameTimes: [120, 130, 140],
      brightness: 0.4,
      noiseFloor: 0.5,
      voiceClarity: 0.45
    });
    const degraded = SensoryPerceptionEngine.prototype.calculateSensorFidelityAudit.call(degradedMock);
    assert.equal(degraded.technicalStatus, 'degraded', 'CASE 5 FAIL: expected degraded status.');

    const criticalMock = createAuditMock({
      frameTimes: [280, 300, 320],
      brightness: 0.1,
      noiseFloor: 0.95,
      voiceClarity: 0.05,
      continuityLagMs: 3000,
      syntheticFallbackActive: true,
      sensorBlackout: true
    });
    const critical = SensoryPerceptionEngine.prototype.calculateSensorFidelityAudit.call(criticalMock);
    assert.equal(critical.technicalStatus, 'critical', 'CASE 5 FAIL: expected critical status.');
    assert.equal(critical.flags.syntheticFallbackActive, true, 'CASE 5 FAIL: synthetic fallback flag should be true.');
    assert.equal(critical.flags.sensorBlackout, true, 'CASE 5 FAIL: sensor blackout flag should be true.');
  }

  console.log('OK: runtime parameter functional v4.0 test passed');
} catch (error) {
  console.error('FAIL: runtime parameter functional v4.0 test failed:', error.message);
  process.exit(1);
}

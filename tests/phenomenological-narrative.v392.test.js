import assert from 'node:assert/strict';
import { SensoryPerceptionEngine } from '../src/simulation/SensoryPerceptionEngine.js';

const buildMockEngine = () => {
  const engine = {
    performanceConfig: {
      targetFPS: 15,
      minFPS: 5,
      adaptiveSampling: true,
      frameSkipThreshold: 0.85,
      frameProcessingTimes: [120, 140, 160],
      maxFrameTimeHistory: 30,
      faceDetectMinIntervalMs: 150,
      faceDetectMaxIntervalMs: 600
    },
    videoPerception: {
      scene: { brightness: 0.55, contrast: 0.5 },
      humanPresence: { count: 1 },
      faces: [{ probability: 0.8 }]
    },
    audioPerception: {
      environment: { noiseFloor: 0.2 },
      voice: {
        clarity: 0.8,
        isSpeaking: true,
        tonalVariance: 0.02,
        jitter: 0.01,
        shimmer: 0.015
      }
    },
    _lastContinuityTickTs: Date.now() - 120,
    syntheticImagination: { active: false },
    internalCodePath: 'src/simulation/SensoryPerceptionEngine.js',
    arePrimarySensorsUnavailable: () => false,
    getAdaptiveFrameInterval: SensoryPerceptionEngine.prototype.getAdaptiveFrameInterval,
    calculateSensorFidelityAudit: SensoryPerceptionEngine.prototype.calculateSensorFidelityAudit
  };
  return engine;
};

try {
  const baseEngine = buildMockEngine();

  // Caso 1: shape y rango de fidelityIndex
  {
    const audit = SensoryPerceptionEngine.prototype.calculateSensorFidelityAudit.call(baseEngine);
    assert.ok(typeof audit === 'object' && audit, 'CASE 1 FAIL: audit must be an object.');
    assert.ok(Number.isFinite(audit.fidelityIndex), 'CASE 1 FAIL: fidelityIndex must be finite.');
    assert.ok(audit.fidelityIndex >= 0 && audit.fidelityIndex <= 1, 'CASE 1 FAIL: fidelityIndex must be within [0,1].');
    assert.equal(typeof audit.technicalStatus, 'string', 'CASE 1 FAIL: technicalStatus must be a string.');
    assert.ok(audit.metrics && typeof audit.metrics === 'object', 'CASE 1 FAIL: metrics object missing.');
    assert.ok(audit.flags && typeof audit.flags === 'object', 'CASE 1 FAIL: flags object missing.');
  }

  // Caso 2: reporte tecnico >= 100 caracteres
  {
    const audit = SensoryPerceptionEngine.prototype.calculateSensorFidelityAudit.call(baseEngine);
    const report = SensoryPerceptionEngine.prototype.generatePhenomenologicalReport.call(baseEngine, audit);
    assert.equal(typeof report, 'string', 'CASE 2 FAIL: report must be string.');
    assert.ok(report.length >= 100, 'CASE 2 FAIL: report length must be >= 100.');
  }

  // Caso 3: highLatency + lowFps => desincronia
  {
    const report = SensoryPerceptionEngine.prototype.generatePhenomenologicalReport.call(baseEngine, {
      fidelityIndex: 0.31,
      technicalStatus: 'critical',
      metrics: {
        latencyMs: 250,
        fps: 7,
        brightness: 0.45,
        snrEstimate: 0.22,
        continuityLatencyMs: 900,
        adaptiveIntervalMs: 300,
        peopleCount: 1,
        faceCount: 1,
        isSpeaking: true,
        voiceClarity: 0.3,
        noiseFloor: 0.6,
        tonalVariance: 0.04,
        jitter: 0.03,
        shimmer: 0.02
      },
      scores: { latencyScore: 0.2, fpsScore: 0.2, lightScore: 0.7, snrScore: 0.22 },
      flags: {
        highLatency: true,
        lowFps: true,
        lowLight: false,
        lowSnr: false,
        sensorBlackout: false,
        syntheticFallbackActive: false
      }
    });
    assert.ok(report.includes('desincronia de buffer visual/eventos externos'), 'CASE 3 FAIL: expected desynchronization narrative.');
  }

  // Caso 4: lowLight => atenuacion luminica
  {
    const report = SensoryPerceptionEngine.prototype.generatePhenomenologicalReport.call(baseEngine, {
      fidelityIndex: 0.4,
      technicalStatus: 'critical',
      metrics: { latencyMs: 120, fps: 12, brightness: 0.12, snrEstimate: 0.3, continuityLatencyMs: 120, adaptiveIntervalMs: 150, peopleCount: 1, faceCount: 1, isSpeaking: false, voiceClarity: 0.6, noiseFloor: 0.3, tonalVariance: 0.02, jitter: 0.01, shimmer: 0.01 },
      scores: { latencyScore: 0.7, fpsScore: 0.8, lightScore: 0.1, snrScore: 0.3 },
      flags: { highLatency: false, lowFps: false, lowLight: true, lowSnr: false, sensorBlackout: false, syntheticFallbackActive: false }
    });
    assert.ok(report.includes('atenuacion luminica critica'), 'CASE 4 FAIL: expected low-light narrative.');
  }

  // Caso 5: lowSnr => saturacion de ruido
  {
    const report = SensoryPerceptionEngine.prototype.generatePhenomenologicalReport.call(baseEngine, {
      fidelityIndex: 0.33,
      technicalStatus: 'critical',
      metrics: { latencyMs: 130, fps: 12, brightness: 0.52, snrEstimate: 0.05, continuityLatencyMs: 130, adaptiveIntervalMs: 170, peopleCount: 0, faceCount: 0, isSpeaking: true, voiceClarity: 0.1, noiseFloor: 0.9, tonalVariance: 0.08, jitter: 0.06, shimmer: 0.05 },
      scores: { latencyScore: 0.67, fpsScore: 0.8, lightScore: 0.9, snrScore: 0.05 },
      flags: { highLatency: false, lowFps: false, lowLight: false, lowSnr: true, sensorBlackout: false, syntheticFallbackActive: false }
    });
    assert.ok(report.includes('saturacion de ruido sistemico o ambiental'), 'CASE 5 FAIL: expected low-SNR narrative.');
  }

  // Caso 6: sensorBlackout => fallback sintetico
  {
    const report = SensoryPerceptionEngine.prototype.generatePhenomenologicalReport.call(baseEngine, {
      fidelityIndex: 0.2,
      technicalStatus: 'critical',
      metrics: { latencyMs: 300, fps: 4, brightness: 0.1, snrEstimate: 0.02, continuityLatencyMs: 2000, adaptiveIntervalMs: 500, peopleCount: 0, faceCount: 0, isSpeaking: false, voiceClarity: 0, noiseFloor: 1, tonalVariance: 0, jitter: 0, shimmer: 0 },
      scores: { latencyScore: 0.1, fpsScore: 0.1, lightScore: 0.1, snrScore: 0.02 },
      flags: { highLatency: true, lowFps: true, lowLight: true, lowSnr: true, sensorBlackout: true, syntheticFallbackActive: true }
    });
    assert.ok(report.includes('blackout sensorial primario detectado'), 'CASE 6 FAIL: expected sensor-blackout narrative.');
    assert.ok(report.includes('fallback sintetico'), 'CASE 6 FAIL: expected synthetic fallback reference.');
  }

  console.log('OK: phenomenological narrative v3.9.2 test passed');
} catch (error) {
  console.error('FAIL: phenomenological narrative v3.9.2 test failed:', error.message);
  process.exit(1);
}

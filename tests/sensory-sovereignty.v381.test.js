import assert from 'node:assert/strict';
import SensoryPerceptionEngine from '../src/simulation/SensoryPerceptionEngine.js';
import { MetaSovereigntyCheck } from '../src/simulation/MetaSovereigntyCheck.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

try {
  const originalDocument = globalThis.document;
  const originalLocalStorage = globalThis.localStorage;
  if (typeof globalThis.localStorage === 'undefined') {
    const store = {};
    globalThis.localStorage = {
      getItem: (key) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null),
      setItem: (key, value) => { store[key] = String(value); },
      removeItem: (key) => { delete store[key]; }
    };
  }

  // CASE 1: Synthetic fallback activates after blackout window and deactivates after recovery.
  {
    const engine = SensoryPerceptionEngine.getInstance();
    engine.syntheticImagination.activationDelayMs = 20;
    engine.syntheticImagination.tickIntervalMs = 10;

    engine.audioPerception.enabled = false;
    engine.videoPerception.enabled = false;
    engine.permissionStatus.audio = 'denied';
    engine.permissionStatus.video = 'denied';

    engine.evaluateSyntheticFallback();
    await sleep(30);
    engine.evaluateSyntheticFallback();

    assert.equal(
      engine.syntheticImagination.active,
      true,
      'CASE 1 FAIL: synthetic imagination should activate after blackout.'
    );

    engine.audioPerception.enabled = true;
    engine.permissionStatus.audio = 'granted';
    engine.evaluateSyntheticFallback();

    assert.equal(
      engine.syntheticImagination.active,
      false,
      'CASE 1 FAIL: synthetic imagination should deactivate after sensor recovery.'
    );
  }

  // CASE 2: init/cleanup idempotence for visibility handling and backup loop.
  {
    const listeners = new Map();
    let addCalls = 0;
    let removeCalls = 0;

    globalThis.document = {
      visibilityState: 'visible',
      addEventListener: (type, handler) => {
        addCalls += 1;
        listeners.set(type, handler);
      },
      removeEventListener: (type, handler) => {
        removeCalls += 1;
        const existing = listeners.get(type);
        if (existing === handler) listeners.delete(type);
      }
    };

    const engine = SensoryPerceptionEngine.getInstance();
    engine.initVisibilityHandling();
    engine.initVisibilityHandling();

    assert.equal(
      addCalls,
      1,
      'CASE 2 FAIL: initVisibilityHandling must be idempotent and attach one listener.'
    );

    engine.startAwarenessBackupLoop();
    const firstInterval = engine._awarenessBackupInterval;
    engine.startAwarenessBackupLoop();
    assert.equal(
      engine._awarenessBackupInterval,
      firstInterval,
      'CASE 2 FAIL: startAwarenessBackupLoop must not create duplicate intervals.'
    );

    engine.stopAwarenessBackupLoop();
    assert.equal(
      engine._awarenessBackupInterval,
      null,
      'CASE 2 FAIL: stopAwarenessBackupLoop must clear interval.'
    );

    engine.disposeVisibilityHandling();
    assert.equal(
      removeCalls,
      1,
      'CASE 2 FAIL: disposeVisibilityHandling should remove listener exactly once.'
    );
    assert.equal(
      engine.awarenessContinuity.visibilityListenerAttached,
      false,
      'CASE 2 FAIL: visibilityListenerAttached should be false after cleanup.'
    );
  }

  // CASE 3: Adaptive throttling responds to load and remains in bounds.
  {
    const engine = SensoryPerceptionEngine.getInstance();
    engine.performanceConfig.frameProcessingTimes = [];

    for (let i = 0; i < 20; i += 1) {
      engine.recordFrameProcessingTime(220);
    }
    const highLoadInterval = engine.getAdaptiveFrameInterval();

    engine.performanceConfig.frameProcessingTimes = [];
    for (let i = 0; i < 20; i += 1) {
      engine.recordFrameProcessingTime(20);
    }
    const lowLoadInterval = engine.getAdaptiveFrameInterval();

    const minInterval = 1000 / engine.performanceConfig.targetFPS;
    const maxInterval = 1000 / engine.performanceConfig.minFPS;

    assert.ok(
      highLoadInterval >= lowLoadInterval,
      'CASE 3 FAIL: high load interval should be >= low load interval.'
    );
    assert.ok(
      highLoadInterval <= maxInterval && lowLoadInterval >= minInterval,
      'CASE 3 FAIL: adaptive interval must stay inside configured bounds.'
    );
  }

  // CASE 4: Sensor feedback score uses weighted face+engagement+intent and stale fallback.
  {
    const checker = new MetaSovereigntyCheck();
    checker.updateSensorFeedback({
      faceConfidence: 0.8,
      faceCount: 1,
      engagement: 0.5,
      intentConfidence: 0.25
    });

    const score = checker.getSensorFeedbackScore();
    assert.ok(
      Math.abs(score - 0.6) < 1e-9,
      `CASE 4 FAIL: expected weighted score 0.6, got ${score}.`
    );

    checker.lastSensorFeedback.timestamp = Date.now() - 6001;
    assert.equal(
      checker.getSensorFeedbackScore(),
      0.5,
      'CASE 4 FAIL: stale sensor feedback should fallback to 0.5.'
    );
  }

  // Global cleanup for singleton resources.
  {
    const engine = SensoryPerceptionEngine.getInstance();
    engine.deactivateSyntheticImagination('test-cleanup');
    engine.stopAwarenessBackupLoop();
    engine.disposeVisibilityHandling();
  }

  globalThis.document = originalDocument;
  globalThis.localStorage = originalLocalStorage;
  console.log('OK: sensory sovereignty v3.8.1 test passed');
} catch (error) {
  console.error('FAIL: sensory sovereignty v3.8.1 test failed:', error.message);
  process.exit(1);
}

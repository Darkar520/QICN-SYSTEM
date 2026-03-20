// Validate that speech restart flow avoids double start() collisions.
// Run with: node tests/speech-fsm.test.js

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

class FakeSpeechRecognition {
  constructor() {
    this.started = false;
    this.continuous = true;
    this.interimResults = true;
    this.lang = "es-ES";
    this.maxAlternatives = 1;
  }

  start() {
    if (this.started) {
      throw new Error("Failed to execute 'start' on 'SpeechRecognition': recognition has already started.");
    }
    this.started = true;
    if (typeof this.onstart === "function") {
      this.onstart();
    }
  }

  stop() {
    this.started = false;
  }

  abort() {
    this.started = false;
  }

  emitError(error) {
    if (typeof this.onerror === "function") {
      this.onerror({ error });
    }
  }

  emitEnd() {
    this.started = false;
    if (typeof this.onend === "function") {
      this.onend();
    }
  }
}

const originalSetTimeout = global.setTimeout;
const originalClearTimeout = global.clearTimeout;
const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");

(async () => {
  // Accelerate timers for deterministic test runtime.
  global.setTimeout = (fn, _delay, ...args) => originalSetTimeout(fn, 0, ...args);
  global.clearTimeout = (id) => originalClearTimeout(id);

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    value: {
      SpeechRecognition: FakeSpeechRecognition,
      webkitSpeechRecognition: FakeSpeechRecognition
    }
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    writable: true,
    value: { onLine: true }
  });

  const { SensoryPerceptionEngine } = await import("../src/simulation/SensoryPerceptionEngine.js");

  const engine = SensoryPerceptionEngine.getInstance();
  engine.audioPerception.enabled = true;
  engine.maxSpeechRetries = 2;

  engine.initializeSpeechRecognition();

  const recognition = engine.speechRecognition;
  assert(recognition, "speechRecognition instance must exist");

  // Reproduce the problematic sequence: network error + onend + retry path.
  recognition.emitError("network");
  recognition.emitEnd();

  // Allow queued retries to run.
  await new Promise((resolve) => originalSetTimeout(resolve, 25));

  const health = engine.getHealthCounters();
  assert(health.speech_restart_collisions === 0, "speech restart collisions must remain zero");
  assert(health.speech_start_attempts >= 1, "speech start attempts must be tracked");

  engine.destroy();

  console.log("OK: speech FSM test passed");
})()
  .catch((err) => {
    console.error("FAIL: speech FSM test failed:", err.message);
    process.exit(1);
  })
  .finally(() => {
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;

    if (originalWindowDescriptor) {
      Object.defineProperty(globalThis, "window", originalWindowDescriptor);
    } else {
      delete global.window;
    }

    if (originalNavigatorDescriptor) {
      Object.defineProperty(globalThis, "navigator", originalNavigatorDescriptor);
    } else {
      delete global.navigator;
    }
  });

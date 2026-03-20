// Render trace hash tests (operation-level determinism, no pixel snapshots)
// Run with: node tests/render-trace-hash.test.js

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const createMockCanvasContext = () => ({
  beginPath() { },
  closePath() { },
  moveTo() { },
  lineTo() { },
  arc() { },
  fill() { },
  stroke() { },
  fillRect() { },
  clearRect() { },
  fillText() { },
  strokeText() { },
  save() { },
  restore() { },
  translate() { },
  rotate() { },
  scale() { },
  createLinearGradient() {
    return {
      addColorStop() { }
    };
  },
  createRadialGradient() {
    return {
      addColorStop() { }
    };
  }
});

const runTraceSequence = ({ seed, ticks = 12, nowProvider = () => 0, leakNowIntoDeterministicPath = false, recorderFactory, rngFactory }) => {
  const baseCtx = createMockCanvasContext();
  const recorder = recorderFactory(baseCtx, true);
  const ctx = recorder.ctx;
  const rng = rngFactory(seed);
  for (let tick = 0; tick < ticks; tick++) {
    const x = rng() * 100;
    const y = rng() * 100;
    const r = 2 + (rng() * 6);
    const hue = Math.floor(rng() * 360);
    const now = leakNowIntoDeterministicPath ? nowProvider() : tick;

    const grad = ctx.createLinearGradient(0, 0, 120, 80);
    grad.addColorStop(0, '#000000');
    grad.addColorStop(1, `hsl(${hue} 90% 60%)`);

    ctx.fillStyle = grad;
    ctx.strokeStyle = `hsl(${hue} 85% 58%)`;
    ctx.lineWidth = 1 + (rng() * 2);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + now * 0.01, y + 10);
    ctx.arc(x + 5, y + 5, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillRect(x * 0.5, y * 0.5, 10 + r, 8 + r);
  }
  return recorder.finalizeTraceHash();
};

(async () => {
  const { createRng } = await import('../src/utils/determinism.js');
  const { createCanvasTraceRecorder, shouldTraceRenderHash } = await import('../src/utils/render_trace_hash.js');

  // deterministic mode always enables trace hash
  assert(shouldTraceRenderHash(true) === true, 'deterministic=true must enable trace hash');

  // global flag enables trace hash in non-deterministic mode
  const originalFlag = globalThis.TRACE_RENDER_HASH;
  globalThis.TRACE_RENDER_HASH = true;
  assert(shouldTraceRenderHash(false) === true, 'TRACE_RENDER_HASH global flag must enable tracing');
  globalThis.TRACE_RENDER_HASH = originalFlag;

  // same seed/config/ticks => same trace hash
  const hashA1 = runTraceSequence({
    seed: 20260227,
    ticks: 16,
    recorderFactory: createCanvasTraceRecorder,
    rngFactory: createRng
  });
  const hashA2 = runTraceSequence({
    seed: 20260227,
    ticks: 16,
    recorderFactory: createCanvasTraceRecorder,
    rngFactory: createRng
  });
  assert(hashA1 === hashA2, 'same seed/config/ticks must produce identical trace hash');

  // different seed => different trace hash
  const hashB = runTraceSequence({
    seed: 20260228,
    ticks: 16,
    recorderFactory: createCanvasTraceRecorder,
    rngFactory: createRng
  });
  assert(hashA1 !== hashB, 'different seed must produce different trace hash');

  // falsification: leaking Date.now-equivalent into deterministic path breaks reproducibility
  const leakHashA = runTraceSequence({
    seed: 20260227,
    ticks: 16,
    nowProvider: () => 1000,
    leakNowIntoDeterministicPath: true,
    recorderFactory: createCanvasTraceRecorder,
    rngFactory: createRng
  });
  const leakHashB = runTraceSequence({
    seed: 20260227,
    ticks: 16,
    nowProvider: () => 1001,
    leakNowIntoDeterministicPath: true,
    recorderFactory: createCanvasTraceRecorder,
    rngFactory: createRng
  });
  assert(
    leakHashA !== leakHashB,
    'if a Date.now-like source leaks into deterministic path, trace hash must diverge (negative control)'
  );

  console.log('OK: render trace hash tests passed');
})().catch((err) => {
  console.error('FAIL: render trace hash tests failed:', err.message);
  process.exit(1);
});


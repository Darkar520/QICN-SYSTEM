// Minimal unit tests for L1 liveness + recovery invariants
// Run with: node tests/liveness.test.js

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

(async () => {
  const { runWithLivenessInvariant, recoverIfEmpty } = await import('../src/utils/tick_invariants.js');
  const { readFileSync } = await import('fs');

  // L1: step increments exactly once per tick, even with early return or exceptions
  const N = 50;
  let simulationStep = 0;
  let advanceCalls = 0;

  for (let i = 0; i < N; i++) {
    runWithLivenessInvariant(({ advanceOnce }) => {
      // simulate an early return path that might try to advance
      if (i % 2 === 0) advanceOnce();
      return;
    }, () => {
      simulationStep += 1;
      advanceCalls += 1;
    });
  }

  assert(simulationStep === N, `simulationStep must increment ${N} times, got ${simulationStep}`);
  assert(advanceCalls === N, `advanceFn must be called ${N} times, got ${advanceCalls}`);

  // L1: exception path still advances once
  let threw = false;
  try {
    runWithLivenessInvariant(() => {
      throw new Error('boom');
    }, () => {
      simulationStep += 1;
      advanceCalls += 1;
    });
  } catch (e) {
    threw = true;
    assert(e.message === 'boom', 'Expected thrown error to propagate');
  }
  assert(threw, 'Expected exception to be thrown');
  assert(simulationStep === N + 1, 'simulationStep must advance on exception');
  assert(advanceCalls === N + 1, 'advanceFn must be called once on exception');

  // L1: explicit double-advance guard (inner advanceOnce + wrapper finally)
  let explicitSingleAdvanceCount = 0;
  runWithLivenessInvariant(({ advanceOnce }) => {
    const advancedInsideTry = advanceOnce();
    assert(advancedInsideTry === true, 'Inner advanceOnce must return true on first call');
    return;
  }, () => {
    explicitSingleAdvanceCount += 1;
  });
  assert(
    explicitSingleAdvanceCount === 1,
    'advanceFn must still be called exactly once when inner advanceOnce runs before wrapper finally'
  );

  // L1: repeated inner calls plus wrapper finally still produce one increment
  let repeatedAdvanceCount = 0;
  runWithLivenessInvariant(({ advanceOnce }) => {
    const first = advanceOnce();
    const second = advanceOnce();
    assert(first === true, 'First inner advanceOnce should return true');
    assert(second === false, 'Second inner advanceOnce should return false');
    return;
  }, () => {
    repeatedAdvanceCount += 1;
  });
  assert(repeatedAdvanceCount === 1, 'Repeated inner advanceOnce calls must not over-increment');

  // Recovery trigger behavior
  const recoveryCounterRef = { current: 0 };
  let activeNodes = [];
  const getActiveNodes = () => activeNodes;
  const activateRandomNodes = (count) => {
    activeNodes = Array.from({ length: count }, (_, idx) => ({ id: idx + 1 }));
  };

  const recovered = recoverIfEmpty({
    activeNodes,
    getActiveNodes,
    activateRandomNodes,
    activateCount: 150,
    recoveryCounterRef
  });

  assert(recoveryCounterRef.current === 1, 'recoveryTriggers must increment on empty');
  assert(recovered.recoveryTriggered === true, 'recoveryTriggered must be true on empty');
  assert(recovered.activeNodes.length === 150, 'activateRandomNodes must repopulate activeNodes');

  // No-op when not empty
  const recovered2 = recoverIfEmpty({
    activeNodes: recovered.activeNodes,
    getActiveNodes,
    activateRandomNodes,
    activateCount: 150,
    recoveryCounterRef
  });
  assert(recoveryCounterRef.current === 1, 'recoveryTriggers must not increment when not empty');
  assert(recovered2.recoveryTriggered === false, 'recoveryTriggered must be false when not empty');

  // Runtime liveness regression: workspace snapshot inputs must be initialized
  // before buildWorkspaceSnapshot runs, otherwise the browser tick loop hits TDZ.
  const indexText = readFileSync(new URL('../src/components/SimulationEngine.jsx', import.meta.url), 'utf8') + '\n' + readFileSync(new URL('../src/runtime/SimulationCycleDriver.js', import.meta.url), 'utf8');
  const workspaceSnapshotIndex = indexText.indexOf('const workspaceSnapshot = buildWorkspaceSnapshot');
  const renderErrorCodeIndex = indexText.indexOf('const renderErrorCode = typeof canvasTelemetry.render_error_code');
  const clampHitsIndex = indexText.indexOf('const clampHits = Number.isFinite(canvasTelemetry.clampHits)');
  assert(workspaceSnapshotIndex > -1, 'index.jsx must build a workspaceSnapshot during runtime ticks');
  assert(renderErrorCodeIndex > -1, 'index.jsx must derive renderErrorCode for runtime tick telemetry');
  assert(clampHitsIndex > -1, 'index.jsx must derive clampHits for runtime tick telemetry');
  assert(
    renderErrorCodeIndex < workspaceSnapshotIndex,
    'renderErrorCode must be initialized before buildWorkspaceSnapshot uses it'
  );
  assert(
    clampHitsIndex < workspaceSnapshotIndex,
    'clampHits must be initialized before buildWorkspaceSnapshot uses it'
  );

  console.log('OK: liveness tests passed');
})().catch((err) => {
  console.error('FAIL: liveness tests failed:', err.message);
  process.exit(1);
});

// Minimal unit tests for deterministic utilities + checksum reproducibility
// Run with: node tests/determinism.test.js

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

(async () => {
  const { createRng, computeNodesKeyUnordered, compareDepthDesc, computeOrbitalAngle } = await import('../src/utils/determinism.js');
  const { buildIntegrityPacket } = await import('../src/utils/integrity.js');

  // Stable depth sort + deterministic tie-breakers
  const items = [
    { depth: 1, id: 2, idx: 1 },
    { depth: 1, id: 1, idx: 0 },
    { depth: 2, id: 9, idx: 2 },
    { depth: 1, id: 1, idx: 3 }
  ];
  items.sort((a, b) => compareDepthDesc(a.depth, b.depth, a.id, b.id, a.idx, b.idx));
  assert(items[0].depth === 2, 'highest depth must come first');
  assert(items[1].id === 1 && items[1].idx === 0, 'tie-breaker must order by id then index');
  assert(items[2].id === 1 && items[2].idx === 3, 'tie-breaker must order by id then index');
  assert(items[3].id === 2, 'remaining higher id last for same depth');

  // Unordered node key must be order-insensitive
  const nodesA = [{ id: 1 }, { id: 2 }, { id: 3 }];
  const nodesB = [{ id: 3 }, { id: 1 }, { id: 2 }];
  assert(computeNodesKeyUnordered(nodesA) === computeNodesKeyUnordered(nodesB), 'node key must be order-insensitive');

  // Deterministic orbital angle
  assert(computeOrbitalAngle(1, 0.1, 10) === 2, 'orbital angle must be base + speed*tick');

  // Deterministic checksum sequence across ticks
  const makeChecksums = (seed) => {
    const versionHash = 'test-version';
    const rng = createRng(seed);
    const out = [];
    for (let tick = 0; tick < 20; tick++) {
      const metrics = {
        tick,
        simulationStep: tick,
        activeNodes: 100,
        depthMin: -10 + rng() * 0.01,
        depthMax: 50 + rng() * 0.01,
        clampHits: 0,
        recoveryTriggers: 0,
        rotX: 0.5,
        rotY: 0.5,
        seed,
        versionHash
      };
      out.push(buildIntegrityPacket({ tick, seed, versionHash, metrics, sensorSummary: null }).checksum);
    }
    return out;
  };

  const a1 = makeChecksums(123);
  const a2 = makeChecksums(123);
  const b1 = makeChecksums(124);

  assert(a1.length === a2.length, 'checksum sequences must have same length');
  for (let i = 0; i < a1.length; i++) {
    assert(a1[i] === a2[i], `checksum mismatch at i=${i}`);
  }
  let anyDiff = false;
  for (let i = 0; i < a1.length; i++) {
    if (a1[i] !== b1[i]) {
      anyDiff = true;
      break;
    }
  }
  assert(anyDiff, 'different seed must produce a different checksum sequence');

  console.log('OK: determinism tests passed');
})().catch((err) => {
  console.error('FAIL: determinism tests failed:', err.message);
  process.exit(1);
});


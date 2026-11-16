import assert from 'node:assert/strict';
import { captureRuntimeSnapshot, captureTowerSnapshot, verifySnapshotDigest } from '../src/language/runtimeSnapshot.js';
import { OntologicalSingularityCore } from '../src/simulation/OntologicalSingularityCore.js';
import { sha256Hex, stableStringify } from '../src/utils/integrity.js';

const graphDescriptors = (root) => {
  const entries = new Map();
  const walk = (value) => {
    if (!value || typeof value !== 'object' || entries.has(value)) return;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    entries.set(value, { descriptors, extensible: Object.isExtensible(value), prototype: Object.getPrototypeOf(value) });
    for (const descriptor of Object.values(descriptors)) walk(descriptor.value);
  };
  walk(root);
  return entries;
};

// Captured on 4142610 before the fix, including graph sharing and undefined.
const GOLDEN_RUNTIME = 'ef504d77fcb0e33236b12123b7ae5567ff673822440c33fd420b1755bf2d03f4';
const GOLDEN_TOWER = '20367c4d30cf9ec4a07ef04afd32d2dc3444c7e728fc2308f1b0f4c78d45322c';
const fixture = () => {
  const shared = { values: [1, 2, 3], negative: -0.125, missing: undefined };
  const cuts = { schema: 'fixture.cuts.v1', first: shared, second: shared };
  const telemetry = { body: [0.42, 0.18], world: [0.20, 0.35], constructiveFiniteCuts: cuts };
  const core = {
    ontologicalState: { coherence: 0.742137, tower_telemetry: telemetry, constructive_finite_cuts: cuts },
    getDynamicHealth: () => ({ stasisIndex: 0.31 })
  };
  return { core, cuts, telemetry };
};
const context = { tick: 120, now: 1_800_000_000_000, nodes: [], config: { ASCENSION_THRESHOLD: 1 } };

{
  const { core, cuts, telemetry } = fixture();
  const before = graphDescriptors(core);
  const realRandom = Math.random;
  const realNow = Date.now;
  let snapshot;
  let tower;
  try {
    Math.random = () => { throw new Error('snapshot consumed global RNG'); };
    Date.now = () => { throw new Error('snapshot consumed global clock'); };
    snapshot = captureRuntimeSnapshot(core, context);
    tower = captureTowerSnapshot(core);
  } finally {
    Math.random = realRandom;
    Date.now = realNow;
  }
  assert.deepEqual(graphDescriptors(core), before, 'capture changed live values, descriptors, identity or extensibility');
  assert.equal(snapshot.digest, GOLDEN_RUNTIME);
  assert.equal(tower.digest, GOLDEN_TOWER);
  assert.equal(verifySnapshotDigest(snapshot), true);
  assert.notEqual(snapshot.tower.constructive_cuts, cuts);
  assert.notEqual(tower.telemetry, telemetry);
  assert.notEqual(tower.telemetry.body, telemetry.body);
  assert.equal(snapshot.tower.constructive_cuts.first, snapshot.tower.constructive_cuts.second);
  assert.ok(Object.hasOwn(snapshot.tower.constructive_cuts.first, 'missing'));
  assert.ok(Object.isFrozen(snapshot.tower.constructive_cuts.first.values));
  assert.throws(() => { snapshot.tower.constructive_cuts.first.values[0] = 99; }, TypeError);
  assert.equal(cuts.first.values[0], 1);
  cuts.first.values[0] = 99;
  telemetry.body[0] = 0.99;
  assert.equal(snapshot.tower.constructive_cuts.first.values[0], 1);
  assert.equal(tower.telemetry.body[0], 0.42);
  assert.equal(verifySnapshotDigest(snapshot), true);
  const { digest, ...body } = tower;
  assert.equal(sha256Hex(stableStringify(body)), digest);
}

// Actual core, not only the fixture: every object reached from the observation
// source retains its own descriptors and extensibility after both capture APIs.
for (const step of [false, true]) {
  const core = new OntologicalSingularityCore();
  if (step) core.stepCoupledTower({ sensorySignal: 0.7, sensorDelta: 0.2, entropyExcitation: 0.3, plannedAction: 0.1 });
  const before = graphDescriptors(core);
  const snapshot = captureRuntimeSnapshot(core, context);
  const tower = captureTowerSnapshot(core);
  assert.deepEqual(graphDescriptors(core), before);
  assert.equal(verifySnapshotDigest(snapshot), true);
  assert.notEqual(snapshot.tower.constructive_cuts, core.constructiveFiniteCuts);
  assert.notEqual(tower.telemetry, core.ontologicalState.tower_telemetry);
}

// Fallback source without constructiveFiniteCuts in telemetry is detached too.
{
  const { core, cuts } = fixture();
  delete core.ontologicalState.tower_telemetry.constructiveFiniteCuts;
  const before = graphDescriptors(core);
  const snapshot = captureRuntimeSnapshot(core, context);
  assert.notEqual(snapshot.tower.constructive_cuts, cuts);
  assert.deepEqual(graphDescriptors(core), before);
}

console.log('OK: snapshot observational isolation and unchanged 4142610 SHA-256 digests');

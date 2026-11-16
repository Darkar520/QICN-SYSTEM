import assert from 'node:assert/strict';
import { matureFixture, snapshotHost, assertNoSharedMutable, graphObjects } from './lib/workbench-fixtures.mjs';
import { captureSession } from '../src/experiments/workbench/capture.js';
import { restoreWorkbenchCapture } from '../src/experiments/workbench/restore.js';
import { createWorkbenchProtocol } from '../src/experiments/workbench/contracts.js';
import { runWorkbench } from '../src/experiments/workbench/runner.js';

const { session: live, capture } = await matureFixture();
let observerCalls=0;
live.bag.operationalObserverRef={current:()=>observerCalls++};
const descriptors = () => new Map([...graphObjects(live.bag)].map(value => [value, {
  prototype: Object.getPrototypeOf(value), extensible: Object.isExtensible(value),
  properties: Reflect.ownKeys(value).map(key => {
    const descriptor=Object.getOwnPropertyDescriptor(value,key);
    return { key, configurable: descriptor.configurable, enumerable: descriptor.enumerable,
      writable: descriptor.writable, get: descriptor.get, set: descriptor.set };
  })
}]));
const beforeDescriptors=descriptors();
const before=snapshotHost(live);
const repeated=await captureSession(live);
assert.equal(repeated.digest,capture.digest);
assert.deepEqual(snapshotHost(live),before,'capture mutated host');
const { session:branch,unrestored }=await restoreWorkbenchCapture(capture);
assert.deepEqual(unrestored,[]);
assertNoSharedMutable(live.bag,branch.bag);
assert.notEqual(live.environment.config,branch.environment.config);
assert.equal(branch.bag.simulationControllerRef.current.worldModel,branch.bag.ontologicalCore.current.worldModelEngine);
assert.equal(branch.bag.simulationControllerRef.current.planner,branch.bag.ontologicalCore.current.cognitivePlanner);
branch.bag.nodalLayer.current.nodes[0].energy+=0.2;
branch.bag.holographicMemory.current.structuralEngrams.length=0;
branch.environment.config.BASE_LEARNING_RATE=0.4;
branch.bag.ontologicalCore.current.stepCoupledTower({sensorySignal:1,plannedAction:0.5});
assert.deepEqual(snapshotHost(live),before,'branch mutations leaked to host');
assert.deepEqual(descriptors(),beforeDescriptors,'capture/restore froze or altered host descriptors');

const protocol=createWorkbenchProtocol({ticks:5,branches:[{id:'baseline',intervention:'sham'},{id:'null',intervention:'sham'}]});
const request=structuredClone(capture);
const pending=runWorkbench(request,protocol);
request.configuration.BASE_LEARNING_RATE=0.49;
live.bag.nodalLayer.current.nodes[0].energy+=0.15;
live.environment.config.BASE_LEARNING_RATE=0.23;
const deliberatelyChanged=snapshotHost(live);
const result=await pending;
const reference=await runWorkbench(capture,protocol);
assert.equal(result.digest,reference.digest,'in-flight workbench consumed newer host/request state');
assert.deepEqual(snapshotHost(live),deliberatelyChanged);
assert.equal(observerCalls,0,'live observer/ledger callback invoked');
assert.equal(result.comparisons[1].maxAbsDiff,0);
assert.equal(result.comparisons[1].fullStateIdentical,true);
const {session:external}=await restoreWorkbenchCapture(capture);
external.bag.quantumEntropyBridgeRef.current.config.enabled=true;
await assert.rejects(captureSession(external),/external_entropy_requires_explicit_replay_capture/);
console.log('OK: zero capture mutation, both leakage directions, alias restoration, in-flight detachment and sham');

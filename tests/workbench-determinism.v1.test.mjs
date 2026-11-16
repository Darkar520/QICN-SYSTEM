import assert from 'node:assert/strict';
import { matureFixture, inputTape, withGlobalTraps } from './lib/workbench-fixtures.mjs';
import { createHeadlessRuntimeSession } from '../src/runtime/HeadlessRuntimeSession.js';
import { captureSession } from '../src/experiments/workbench/capture.js';
import { restoreWorkbenchCapture } from '../src/experiments/workbench/restore.js';
import { createWorkbenchProtocol } from '../src/experiments/workbench/contracts.js';
import { runWorkbench } from '../src/experiments/workbench/runner.js';
import { readWorkbenchMetrics } from '../src/experiments/workbench/metrics.js';
import { runWorkbenchInWorker } from '../scripts/lib/workbench-worker-client.mjs';

await withGlobalTraps(async()=>{
  const session=createHeadlessRuntimeSession({nodes:12});session.initialize();
  for(let tick=0;tick<6;tick++)session.step();
  const capture=await captureSession(session);
  const {session:restored}=await restoreWorkbenchCapture(capture);
  for(let tick=0;tick<5;tick++) {
    session.step();restored.step();
    assert.deepEqual(readWorkbenchMetrics(restored,capture.sourceBuild),readWorkbenchMetrics(session,capture.sourceBuild),'uninterrupted/restored full state differs');
  }
  for(const profile of ['legacy_compatibility','paired_intervention']) {
    const protocol=createWorkbenchProtocol({profile,ticks:5,inputTape:profile==='paired_intervention'?inputTape(5):[],branches:[{id:'baseline',intervention:'sham'},{id:'sham',intervention:'sham'}]});
    const a=await runWorkbench(capture,protocol),b=await runWorkbench(capture,protocol);
    assert.equal(a.digest,b.digest);
    assert.equal(a.comparisons[1].maxAbsDiff,0);
    assert.equal(a.comparisons[1].fullStateIdentical,true);
  }
});
const {capture}=await matureFixture();
const protocol=createWorkbenchProtocol({profile:'paired_intervention',ticks:4,inputTape:inputTape(4)});
const direct=await runWorkbench(capture,protocol);
const worker=await runWorkbenchInWorker(capture,protocol);
assert.equal(worker.digest,direct.digest,'worker and headless driver differ');
await assert.rejects(runWorkbenchInWorker(capture,protocol,{expectedBuild:{version:'other',signature:'other'}}),/other_build/);
const abort=new AbortController();
const pending=runWorkbenchInWorker(capture,protocol,{signal:abort.signal});abort.abort();
await assert.rejects(pending,/workbench_cancelled/);
await assert.rejects(runWorkbenchInWorker(capture,protocol,{timeoutMs:1}),/workbench_timeout/);
await assert.rejects(runWorkbench(capture,protocol,{signal:abort.signal}),/workbench_cancelled/);
console.log('OK: global clock/RNG/network/timer traps, full restore continuation, both profiles, worker identity, cancellation and timeout');

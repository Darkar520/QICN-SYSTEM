import assert from 'node:assert/strict';
import { matureFixture } from './lib/workbench-fixtures.mjs';
import { createWorkbenchProtocol, sealData } from '../src/experiments/workbench/contracts.js';
import { runWorkbench, verifyWorkbenchResult } from '../src/experiments/workbench/runner.js';
import { sealDynamicState } from '../src/persistence/dynamicState.js';
import { inputTape } from './lib/workbench-fixtures.mjs';

const {capture}=await matureFixture();
const protocol=createWorkbenchProtocol({ticks:3});
let getterCalls=0;
const accessor=structuredClone(protocol);
Object.defineProperty(accessor,'intrusion',{enumerable:true,get(){getterCalls++;return 1;}});
await assert.rejects(runWorkbench(capture,accessor),/non_data_input/);
assert.equal(getterCalls,0,'protocol accessor invoked a host callback');
const instance=new (class Protocol { constructor(){Object.assign(this,protocol);} })();
await assert.rejects(runWorkbench(capture,instance),/non_data_input/);
const result=await runWorkbench(capture,protocol);
assert.equal(verifyWorkbenchResult(result,capture,protocol),true);
const resign=value=>{const {digest,...body}=structuredClone(value);return sealData(body);};
const changed=structuredClone(capture);changed.sourceTick++;
await assert.rejects(runWorkbench(changed,protocol),/digest_mismatch/);
const inner=structuredClone(capture);inner.dynamicRecord.text+=' ';
await assert.rejects(runWorkbench(resign(inner),protocol),/restore_rejected:digest_mismatch/);
await assert.rejects(runWorkbench(capture,protocol,{expectedBuild:{version:'other',signature:'other'}}),/other_build/);
const missing=structuredClone(capture), body=JSON.parse(missing.dynamicRecord.text);
delete body.components.instances.kaizenEngine;
const signed=await sealDynamicState(body,()=>0);missing.dynamicRecord={text:signed.text,digest:signed.digest};
await assert.rejects(runWorkbench(resign(missing),protocol),/incomplete_dynamic_capture/);
const incomplete=structuredClone(capture), tampered=JSON.parse(incomplete.dynamicRecord.text);
tampered.components.instances.ontologicalCore.__obj.uninstantiated={__obj:{},__class:'UnknownRuntimeClass',__id:999999};
const signed2=await sealDynamicState(tampered,()=>0);incomplete.dynamicRecord={text:signed2.text,digest:signed2.digest};
await assert.rejects(runWorkbench(resign(incomplete),protocol),/workbench_unrestored/);
for(const mutate of [
  x=>x.branches[0].chain.records.pop(),
  x=>x.branches[0].chain.records.reverse(),
  x=>{x.branches[0].chain.records[1].payload.values.ccc+=0.1;},
  x=>{x.branches[0].intervention.allowedFields.push('undeclared');},
  x=>{x.comparisons[0].maxAbsDiff=1;}
]) {
  const copy=structuredClone(result);mutate(copy);
  assert.throws(()=>verifyWorkbenchResult(resign(copy),capture,protocol));
}
const other=createWorkbenchProtocol({ticks:4});
assert.throws(()=>verifyWorkbenchResult(result,capture,other),/context_mismatch/);
for (const mutate of [x=>x.execution.seed++, x=>x.sourceTick++]) {
  const otherCapture=structuredClone(capture);mutate(otherCapture);
  assert.throws(()=>verifyWorkbenchResult(result,resign(otherCapture),protocol),/context_mismatch/,'stale result accepted for a different capture');
}
const tapeProtocol=createWorkbenchProtocol({profile:'paired_intervention',ticks:3,inputTape:inputTape(3)});
const tapeResult=await runWorkbench(capture,tapeProtocol);
const changedTape=structuredClone(tapeProtocol);changedTape.inputTape[0].entropyValue+=0.01;
assert.throws(()=>verifyWorkbenchResult(tapeResult,capture,resign(changedTape)),/context_mismatch/,'result accepted with a different future input tape');
assert.throws(()=>createWorkbenchProtocol({profile:'paired_intervention',ticks:3}),/input_tape_required/);
assert.throws(()=>createWorkbenchProtocol({ticks:0}));
assert.throws(()=>createWorkbenchProtocol({branches:[{id:'x',intervention:'erase_declared_history'}]}),/baseline_sham_required/);
console.log('OK: capture/v3/build validation, missing and unrestored state, chain tampering/truncation/reordering, comparisons and protocol binding');

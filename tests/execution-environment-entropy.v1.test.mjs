import assert from 'node:assert/strict';
import { createDeterministicEnvironment, executionEnvironmentFor } from '../src/runtime/ExecutionEnvironment.js';
import { QuantumEntropyBridge } from '../src/simulation/QuantumEntropyBridge.js';
import { EntropyBufferManager } from '../src/simulation/EntropyBufferManager.js';
import { EntropyHealthMonitor } from '../src/simulation/EntropyHealthMonitor.js';
import { EntropyExperimentController } from '../src/simulation/EntropyExperimentController.js';
import { EntropyProviderClient } from '../src/simulation/EntropyProviderClient.js';
import { withGlobalTraps } from './lib/workbench-fixtures.mjs';

await withGlobalTraps(async()=>{
  const environment=createDeterministicEnvironment();
  const bridge=new QuantumEntropyBridge({enabled:false},environment);
  for(const component of [bridge,bridge.providerClient,bridge.bufferManager,bridge.healthMonitor,bridge.experimentController]) assert.equal(executionEnvironmentFor(component),environment);
  bridge.configure({enabled:false});
  const decision=bridge.selectEntropy(1234,0.4);
  assert.equal(decision.entropyValue,0.4);
  bridge.getTelemetry(1234);bridge.getForensicSnapshot(1234);bridge.getConnectionDiagnostics(1234);
  assert.ok(environment.snapshot().clockCalls>0,'eager clock defaults were not exercised');
  assert.equal(environment.snapshot().randomCalls,0);
  assert.throws(()=>environment.fetch('https://invalid.test'),/capability_denied:network/);
  assert.throws(()=>environment.setTimeout(()=>{},1),/capability_denied:timer/);
  const buffer=new EntropyBufferManager({},environment);buffer.snapshot();buffer.getRefillPlan();buffer.clear();
  const health=new EntropyHealthMonitor({},environment);health.markFailure();health.markFallback();
  const experiment=new EntropyExperimentController({mode:'prng_only'},environment);
  experiment.materializeSyntheticChunk();

  let timers=0,cleared=0,requests=0;
  environment.setTimeout=(fn)=>{timers++;fn();return timers;};
  environment.clearTimeout=()=>{cleared++;};
  environment.abortController=()=>({signal:{},abort(){}});
  const provider=new EntropyProviderClient({retryCount:0},environment);
  const response=await provider.fetchChunk({provider:'anu_qrng',fetchImpl:async()=>{
    requests++;return {ok:true,json:async()=>({data:Array.from({length:16},(_,i)=>i)})};
  }});
  assert.equal(response.ok,true);
  assert.equal(requests,1);assert.equal(timers,1);assert.equal(cleared,1);
  const delayed=new EntropyExperimentController({mode:'delayed_entropy',delayMs:20},environment);
  const controlled=await delayed.applyPostFetchControls({ok:true,sample:{},requestMeta:{latencyMs:2,fetchEndMs:100}});
  assert.equal(controlled.requestMeta.latencyMs,22);
  assert.equal(timers,2);
});
console.log('OK: bridge and all four entropy helpers own clock/network/timer capabilities, including eager defaults and provider timeout');

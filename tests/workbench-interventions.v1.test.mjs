import assert from 'node:assert/strict';
import { matureFixture } from './lib/workbench-fixtures.mjs';
import { restoreWorkbenchCapture } from '../src/experiments/workbench/restore.js';
import { applyWorkbenchIntervention } from '../src/experiments/workbench/interventions.js';
import { createWorkbenchProtocol } from '../src/experiments/workbench/contracts.js';
import { runWorkbench } from '../src/experiments/workbench/runner.js';

const {capture}=await matureFixture({warmup:40});
for(const intervention of ['sham','block_history_read','suspend_consolidation','freeze_predictor_weights','erase_declared_history']) {
  const {session}=await restoreWorkbenchCapture(capture);
  const effect=applyWorkbenchIntervention(session,intervention);
  assert.equal(effect.physicalDigestBefore,effect.physicalDigestAfter);
  assert.ok(Array.isArray(effect.allowedFields));
  if(intervention==='erase_declared_history') {
    assert.ok(effect.originalCommitDigestsRetained.length>0);
    assert.equal(session.bag.worldModelRef.current.getPlasticityProfile().maturationIndex,0);
    assert.equal(session.bag.holographicMemory.current.structuralEngrams.length,0);
    assert.ok(session.bag.worldModelRef.current.trainingSteps>0,'declared erasure incorrectly claims total history loss');
    session.step();
    assert.ok(session.bag.worldModelRef.current.pendingCommits.length>0,'erasure incorrectly disabled subsequent prediction');
  }
}
const protocol=createWorkbenchProtocol({ticks:8,branches:[{id:'baseline',intervention:'sham'},{id:'null',intervention:'sham'},{id:'sensitivity',intervention:'sensor_impulse'}]});
const result=await runWorkbench(capture,protocol);
assert.equal(result.comparisons[1].maxAbsDiff,0);
assert.equal(result.comparisons[1].fullStateIdentical,true);
assert.ok(result.comparisons[2].maxAbsDiff>0,'positive control failed to move numeric trajectory');
assert.equal(result.comparisons[2].fullStateIdentical,false);
assert.equal(result.originalArchive.dynamicRecordDigest,capture.dynamicRecord.digest);
assert.equal(result.external_support_certified,false);
console.log('OK: explicit intervention scopes, physical-state conservation, original commitments retained and positive sensitivity');

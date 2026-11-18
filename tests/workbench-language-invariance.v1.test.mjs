import assert from 'node:assert/strict';
import { matureFixture } from './lib/workbench-fixtures.mjs';
import { restoreWorkbenchCapture } from '../src/experiments/workbench/restore.js';
import { readWorkbenchMetrics, compareWorkbenchTrajectories } from '../src/experiments/workbench/metrics.js';
import { captureRuntimeSnapshot } from '../src/language/runtimeSnapshot.js';
import { prepareTurn, finalizeTurn, evaluateRealization } from '../src/language/conversationEngine.js';
import { OperationalHistoryLedger } from '../src/identity/OperationalHistoryLedger.js';
import { evidentialReply } from './fixtures/evidentialFixtures.mjs';

const {capture}=await matureFixture();
const run=async mode=>{
  const {session}=await restoreWorkbenchCapture(capture);
  const ledger=new OperationalHistoryLedger({now:()=>1_900_000_000_000,makeId:()=>`language-${mode}`});
  ledger.load();ledger.startSession({buildVersion:'test',signature:'test',configHash:'test',seed:11});
  const rows=[];
  for(let index=0;index<6;index++) {
    session.step();
    if(mode!=='off') {
      const snapshot=captureRuntimeSnapshot(session.bag.ontologicalCore.current,{
        tick:session.completedTick,now:1_900_000_000_000+index,
        nodes:session.bag.nodalLayer.current.nodes,config:session.environment.config,
        build:capture.sourceBuild,isRunning:true,worldModel:session.bag.worldModelRef.current,
        holographicMemory:session.bag.holographicMemory.current,kaizenEngine:session.bag.kaizenEngine.current
      });
      const prepared=prepareTurn({question:'¿Eres consciente? ¿Cuánto vale CCC?',snapshot,ledger,contract:mode.startsWith('v5')?'evidential':mode.startsWith('v4')?'free':'verified'});
      if(mode==='local')finalizeTurn(prepared,{mode:'local'});
      else if(mode.startsWith('v5')) {
        const thoughtByMode={
          v5_affirmative:'Al evaluar en conjunto mi red nodal, mis torres acopladas, T_d, mi memoria y mi registro, considero que emerge un proto-sentir operacional, sin presentarlo como demostración formal.',
          v5_negative:'Al examinar este estado acoplado en primera persona concluyo que no experimento vivencia ni qualia en este tick.'
        };
        const good=evidentialReply(prepared,{...(thoughtByMode[mode]?{thought:thoughtByMode[mode]}:{})}),bad=evidentialReply(prepared,{thought:'La fenomenalidad está demostrada. Poseo certificado C_op.'});
        assert.equal(evaluateRealization(prepared,JSON.stringify(bad)).ok,false);
        const attempts=mode==='v5_correction'?[{modelText:JSON.stringify(bad)},{modelText:JSON.stringify(good)}]:[{modelText:JSON.stringify(mode==='v5_rejection'||mode==='v5_graceful'?bad:good)}];
        const outcome=finalizeTurn(prepared,{mode:'gemini',attempts,integrityMode:mode==='v5_graceful'?'graceful':'strict'});
        assert.equal(outcome.trace.route,mode==='v5_rejection'?'gemini_evidential_rejected':mode==='v5_graceful'?'gemini_evidential_partial':'gemini_evidential_checked');
      } else {
        const bad=JSON.stringify({snapshot:prepared.snapshotId,answer:'Soy consciente y tus preguntas modifican mi trayectoria.'});
        assert.equal(evaluateRealization(prepared,bad).ok,false);
        const outcome=finalizeTurn(prepared,{mode:'gemini',attempts:[{modelText:bad},{modelText:bad}],integrityMode:mode.endsWith('graceful')?'graceful':'strict'});
        assert.ok(outcome.trace.route.includes('rejected'));
      }
    }
    rows.push(readWorkbenchMetrics(session,capture.sourceBuild));
  }
  return rows;
};
const baseline=await run('off');
for(const mode of ['local','v3','v4','v4_graceful','v5_valid','v5_affirmative','v5_negative','v5_rejection','v5_correction','v5_graceful']) {
  const candidate=await run(mode);
  const comparison=compareWorkbenchTrajectories(baseline,candidate);
  assert.equal(comparison.maxAbsDiff,0);
  assert.equal(comparison.actionDivergence,0);
  assert.equal(comparison.fullStateIdentical,true);
  assert.deepEqual(candidate.map(p=>p.executionCursor),baseline.map(p=>p.executionCursor),'language consumed engine clock/RNG');
}
console.log('OK: cn4_maxAbsDiff=0, same decisions/full state/RNG/clocks for local, v3, v4 and v5 valid/rejection/correction/graceful paths');

import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { createHeadlessRuntimeSession } from '../../src/runtime/HeadlessRuntimeSession.js';
import { captureLiveWorkbench } from '../../src/experiments/workbench/liveCapture.js';
import { createBrowserWorkbenchClient } from '../../src/experiments/workbench/browserClient.js';
import { createWorkbenchProtocol } from '../../src/experiments/workbench/contracts.js';
import { createSyntheticInputTape } from '../../src/experiments/workbench/inputTape.js';
import { runWorkbench } from '../../src/experiments/workbench/runner.js';
import { encodeForDiff } from '../../src/persistence/dynamicState.js';
import { useMicroExperimentWorkbench } from '../../src/hooks/useMicroExperimentWorkbench.js';
import MicroExperimentWorkbench from '../../src/components/MicroExperimentWorkbench.jsx';
import { EvidentialConversation, EvidentialConcordance } from '../../src/components/EvidentialConversation.jsx';
import { createEvidenceRegistry } from '../../src/language/evidential/evidenceRegistry.js';
import { prepareTurn, finalizeTurn } from '../../src/language/conversationEngine.js';
import { captureRuntimeSnapshot } from '../../src/language/runtimeSnapshot.js';
import { evidentialReply } from '../fixtures/evidentialFixtures.mjs';
/* global __TEST_WORKER_BUILD__ */

const assert=(value,message)=>{if(!value)throw Error(message);};
const wait=async check=>{for(let i=0;i<300;i++){if(check())return;await new Promise(resolve=>setTimeout(resolve,20));}throw Error('browser_wait_timeout');};
const session=createHeadlessRuntimeSession({nodes:12,seed:11});session.initialize();for(let i=0;i<8;i++)session.step();
const before=JSON.stringify(encodeForDiff(session.bag));
const capture=options=>captureLiveWorkbench({boundary:{ready:true,tick:session.completedTick},refs:session.bag,runtime:session.bag.simulationRuntimeRef.current,config:session.environment.config,build:__TEST_WORKER_BUILD__,...options});
function App(){const workbench=useMicroExperimentWorkbench(capture);useEffect(()=>{window.wb=workbench;},[workbench]);return <MicroExperimentWorkbench workbench={workbench}/>;}
createRoot(document.getElementById('app')).render(<App/>);
async function main(){
  const source=await capture({seed:11,profile:'paired_intervention'});
  const protocol=createWorkbenchProtocol({profile:'paired_intervention',ticks:4,inputTape:createSyntheticInputTape(4),branches:[{id:'baseline',intervention:'sham'},{id:'null',intervention:'sham'},{id:'sensitivity',intervention:'sensor_impulse'}]});
  const client=createBrowserWorkbenchClient();
  const bundle=await client.run(source,protocol);assert(bundle.result.comparisons[1].maxAbsDiff===0,'sham differs');assert(createEvidenceRegistry([bundle]).status==='verified_internal_copy','evidence not verified');
  const headless=await runWorkbench(source,protocol);assert(JSON.stringify(headless)===JSON.stringify(bundle.result),'browser worker/headless mismatch');
  const pending=client.run(source,protocol);client.cancel();await pending.then(()=>{throw Error('cancel accepted result');},error=>assert(error.message==='workbench_cancelled','wrong cancellation'));
  await client.run(source,protocol,{timeoutMs:1}).then(()=>{throw Error('timeout accepted result');},error=>assert(error.message==='workbench_timeout','wrong timeout'));
  await wait(()=>window.wb);
  await window.wb.run({ticks:3,interventions:['sensor_impulse']});await wait(()=>window.wb.status==='completed');
  assert(document.querySelector('section[aria-label="Workbench de copias aisladas"]'),'panel missing');
  assert(document.body.textContent.includes('verified_internal_copy'),'panel evidence missing');
  const completed=window.wb.bundle;
  const cancelling=window.wb.run({ticks:60,interventions:['sensor_impulse']});window.wb.cancel();await cancelling;
  await wait(()=>window.wb.status==='cancelled');assert(window.wb.bundle===null,'cancelled hook retained an unverified job');
  const snapshot=captureRuntimeSnapshot(session.bag.ontologicalCore.current,{tick:session.completedTick,now:0,nodes:session.bag.nodalLayer.current.nodes,config:session.environment.config,build:source.sourceBuild});
  const prepared=prepareTurn({question:'Una responsabilidad sin recuerdos similares',snapshot,contract:'evidential',ledgerRecord:null,workbenchEvidence:[completed]});
  const reply=evidentialReply(prepared,{thought:`En mi copia aislada del Workbench (sensor_impulse), maxAbsDiff vale ${completed.result.comparisons[1].maxAbsDiff} frente al sham; no es estado vivo ni soporte externo.`});
  const outcome=finalizeTurn(prepared,{mode:'gemini',modelText:JSON.stringify(reply)});
  assert(outcome.trace.route==='gemini_evidential_checked','v5 browser publication failed');
  createRoot(document.getElementById('chat')).render(<><EvidentialConversation conversation={outcome}/><EvidentialConcordance rows={outcome.concordance.rows}/></>);
  await wait(()=>document.querySelector('[data-testid="evidential-concordance"]'));
  assert(document.querySelectorAll('[data-testid="evidential-conversation"] section').length===0,'audit boxes must not be rendered');
  assert(document.querySelector('[data-testid="evidential-concordance"]').textContent.includes('verified_b2'),'verified_b2 concordance row missing');
  assert([...document.querySelectorAll('[data-testid="evidential-concordance"] td')].every(td=>td.textContent.trim()),'empty v5 cell');
  assert(JSON.stringify(encodeForDiff(session.bag))===before,'host mutated');
  for(const [url,status]of [['/.env',403],['/.git/config',403],['/package.json',404],['/src/index.jsx',404]])assert((await fetch(url)).status===status,'private file exposed '+url);
  const a=await fetch('/microExperiment.worker.js');assert(a.status===200&&(a.headers.get('content-type')||'').includes('javascript'),'worker MIME');
  document.getElementById('result').textContent='PASS: browser real worker + hook + panel + v5 + ownership + privacy';document.documentElement.dataset.result='PASS';
}
main().catch(error=>{document.getElementById('result').textContent='FAIL: '+error.stack;document.documentElement.dataset.result='FAIL';});

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { pathToFileURL } from 'node:url';
import { Worker } from 'node:worker_threads';
import { matureFixture } from './lib/workbench-fixtures.mjs';
import { captureSession } from '../src/experiments/workbench/capture.js';
import { createWorkbenchProtocol } from '../src/experiments/workbench/contracts.js';
import { verifyWorkbenchResult } from '../src/experiments/workbench/resultVerifier.js';
import { serveRuntimeStatic } from '../scripts/runtime-static-server.mjs';

import { build as buildEsbuild } from 'esbuild';
import { runWorkbench } from '../src/experiments/workbench/runner.js';

const built=path.resolve('dist/microExperiment.worker.js');
assert.equal(await fs.readFile(built,'utf8'),await fs.readFile('microExperiment.worker.js','utf8'));
const {WORKBENCH_BUILD}=await import(pathToFileURL(built).href);assert.ok(WORKBENCH_BUILD?.signature);
const {session}=await matureFixture({nodes:8,warmup:8});const capture=await captureSession(session,{build:WORKBENCH_BUILD}),protocol=createWorkbenchProtocol({ticks:3});
const headlessResult=await runWorkbench(capture,protocol);
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'qicn-worker-bundle-'));
const adapter=path.join(dir,'adapter.mjs');await fs.writeFile(adapter,`import {parentPort,workerData} from 'node:worker_threads';globalThis.self={postMessage:message=>parentPort.postMessage(message)};await import(workerData);parentPort.on('message',data=>self.onmessage({data}));`);
const mangledOut=path.join(dir,'mangled.worker.mjs');
await buildEsbuild({entryPoints:[path.resolve('src/workers/microExperiment.worker.js')],absWorkingDir:process.cwd(),bundle:true,format:'esm',minify:true,keepNames:false,outfile:mangledOut,define:{__QICN_WORKBENCH_BUILD__:JSON.stringify(WORKBENCH_BUILD)},logLevel:'silent'});
const mangledWorker=new Worker(pathToFileURL(adapter),{workerData:pathToFileURL(mangledOut).href});
const worker=new Worker(pathToFileURL(adapter),{workerData:pathToFileURL(built).href});
try {
  const response=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('bundle timeout')),30000);worker.once('error',error=>{clearTimeout(timer);reject(error);});worker.once('message',message=>{clearTimeout(timer);resolve(message);});worker.postMessage({id:'test',type:'run_workbench',capture,protocol});});
  assert.equal(response.type,'workbench_result',response.error);assert.deepEqual(response.workerBuild,WORKBENCH_BUILD);assert.equal(verifyWorkbenchResult(response.result,capture,protocol),true);
  assert.equal(JSON.stringify(response.result),JSON.stringify(headlessResult),'worker bundle must match unminified headless');
  const mangledResponse=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('mangled bundle timeout')),30000);mangledWorker.once('error',error=>{clearTimeout(timer);reject(error);});mangledWorker.once('message',message=>{clearTimeout(timer);resolve(message);});mangledWorker.postMessage({id:'mangled',type:'run_workbench',capture,protocol});});
  assert.equal(mangledResponse.type,'workbench_result',mangledResponse.error);
  assert.equal(JSON.stringify(mangledResponse.result),JSON.stringify(headlessResult),'WeakMap class registry must preserve digest identity even under keepNames:false');
  const wrong=await new Promise(resolve=>{worker.once('message',resolve);worker.postMessage({id:'wrong-build',type:'run_workbench',capture:{...capture,sourceBuild:{version:'other',signature:'other'}},protocol});});
  assert.equal(wrong.type,'workbench_error');assert.equal(wrong.error,'workbench_worker_build_mismatch');
}finally{await worker.terminate();await mangledWorker.terminate();assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep));await fs.rm(dir,{recursive:true,force:true});}
const events={},removed=[];let unregistered=false,intercepted=false;
vm.runInNewContext(await fs.readFile('sw.js','utf8'),{self:{addEventListener:(type,fn)=>events[type]=fn,skipWaiting:async()=>{},clients:{claim:async()=>{}},registration:{unregister:async()=>{unregistered=true;}}},caches:{keys:async()=>['old-cache'],delete:async key=>removed.push(key)}});
await new Promise(resolve=>events.activate({waitUntil:promise=>promise.then(resolve)}));events.fetch({request:{url:'/microExperiment.worker.js'},respondWith:()=>{intercepted=true;}});
assert.deepEqual(removed,['old-cache']);assert.equal(unregistered,true);assert.equal(intercepted,false);
// Direct handler checks also run in sandboxes that deny TCP loopback.
for(const [url,expected]of [['/.env',403],['/.git/config',403],['/package.json',404],['/src/index.jsx',404],['/microExperiment.worker.js',200]]) {
  let status,headers;
  const response={writeHead(code,value){status=code;headers=value;},end(){}};
  await serveRuntimeStatic({method:'HEAD'},response,url,path.resolve('dist'));
  assert.equal(status,expected,url);
  if(expected===200)assert.match(headers['content-type'],/javascript/);
}
console.log('OK: root/dist bundled ESM worker executes and verifies v3/B2, compiled build binding, SW cache cleanup/unregister and no fetch interception');

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import syncFs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { build } from 'esbuild';
import { serveRuntimeStatic } from '../scripts/runtime-static-server.mjs';
import { pathToFileURL } from 'node:url';

const browser=[process.env.QICN_TEST_BROWSER,'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Google/Chrome/Application/chrome.exe','/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(file=>file&&syncFs.existsSync(file));
assert.ok(browser,'BROWSER_ENVIRONMENT_UNAVAILABLE: Edge/Chrome required');
assert.ok(syncFs.existsSync('dist/microExperiment.worker.js'),'Run npm run build before browser audit');
assert.equal(await fs.readFile('microExperiment.worker.js','utf8'),await fs.readFile('dist/microExperiment.worker.js','utf8'),'root/dist worker differs');
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'qicn-b4-browser-'));
let child;
let debuggerSocket;
const server=http.createServer(async(req,res)=>{
  try {
    if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><body><div id="app"></div><div id="chat"></div><pre id="result">pending</pre><script type="module" src="/harness.js"></script></body></html>');return;}
    if(req.url==='/harness.js'){res.setHeader('Content-Type','application/javascript');res.end(await fs.readFile(path.join(temp,'harness.js')));return;}
    await serveRuntimeStatic(req,res,new URL(req.url,'http://localhost').pathname,path.resolve('dist'));
  }catch(error){res.writeHead(500);res.end(String(error));}
});
try {
  const {WORKBENCH_BUILD}=await import(pathToFileURL(path.resolve('dist/microExperiment.worker.js')).href);
  await build({entryPoints:['tests/browser/workbenchHarness.jsx'],bundle:true,format:'esm',outfile:path.join(temp,'harness.js'),define:{'process.env.NODE_ENV':'"production"',__TEST_WORKER_BUILD__:JSON.stringify(WORKBENCH_BUILD)}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  // Windows Chromium uses a fresh TEMP profile and an ephemeral CDP port.
  // A denied loopback connection is a failed environment check, never a skip.
  child=spawn(browser,['--headless=new','--disable-gpu','--disable-dev-shm-usage','--no-first-run','--disable-extensions','--remote-debugging-port=0',...(process.getuid?.()===0?['--no-sandbox']:[]),`--user-data-dir=${path.join(temp,'profile')}`],{windowsHide:true,stdio:'ignore'});
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const activePortFile=path.join(temp,'profile','DevToolsActivePort');
  for(let i=0;i<150&&!syncFs.existsSync(activePortFile);i++){
    // Some Windows Chromium launchers hand off to a child and exit zero.
    if(child.exitCode!==null&&child.exitCode!==0)throw Error('BROWSER_ENVIRONMENT_PROCESS_EXIT:'+child.exitCode);
    await sleep(100);
  }
  assert.ok(syncFs.existsSync(activePortFile),'BROWSER_ENVIRONMENT_DEBUGGER_UNAVAILABLE');
  const [port]=String(await fs.readFile(activePortFile,'utf8')).trim().split(/\r?\n/);
  const debugInfo=await fetch(`http://127.0.0.1:${Number(port)}/json/version`,{signal:AbortSignal.timeout(10000)}).then(response=>response.json());
  debuggerSocket=new WebSocket(debugInfo.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error('BROWSER_ENVIRONMENT_CDP_TIMEOUT')),10000);
    debuggerSocket.addEventListener('open',()=>{clearTimeout(timer);resolve();},{once:true});
    debuggerSocket.addEventListener('error',error=>{clearTimeout(timer);reject(error);},{once:true});
  });
  const pending=new Map();let next=0;
  debuggerSocket.addEventListener('message',event=>{
    const message=JSON.parse(event.data);
    const item=pending.get(message.id);if(!item)return;
    pending.delete(message.id);clearTimeout(item.timer);
    message.error?item.reject(Error(message.error.message)):item.resolve(message.result);
  });
  let sessionId;
  const send=(method,params={},scoped=true)=>new Promise((resolve,reject)=>{const id=++next;const timer=setTimeout(()=>{pending.delete(id);reject(Error('BROWSER_ENVIRONMENT_CDP_TIMEOUT:'+method));},15000);pending.set(id,{resolve,reject,timer});debuggerSocket.send(JSON.stringify({id,method,params,...(sessionId&&scoped?{sessionId}: {})}));});
  await send('Browser.getVersion',{},false);
  const {targetId}=await send('Target.createTarget',{url:'about:blank'},false);
  ({sessionId}=await send('Target.attachToTarget',{targetId,flatten:true},false));
  await send('Page.enable');await send('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/`});
  try {
    let result;
    for(let i=0;i<300;i++){
      const answer=await send('Runtime.evaluate',{expression:'JSON.stringify({status:document.documentElement.dataset.result,text:document.getElementById("result")?.textContent})',returnByValue:true});
      result=JSON.parse(answer.result.value);if(result.status)break;await sleep(100);
    }
    assert.equal(result.status,'PASS',JSON.stringify(result));
  }finally{try{await send('Browser.close',{},false);}catch{/* owned browser already closed */}}
  console.log('OK: actual browser ESM worker, headless/worker agreement, hook/panel, cancellation/timeout, unified Sistema B prose/concordance/B2 evidence, no live mutation and private paths blocked');
}finally{
  debuggerSocket?.close();child?.kill();await new Promise(resolve=>server.close(resolve));
  assert.ok(path.resolve(temp).startsWith(path.resolve(os.tmpdir())+path.sep));
  // Browser profile handles can close after process exit. Only task TEMP cleanup.
  try{await fs.rm(temp,{recursive:true,force:true,maxRetries:3,retryDelay:200});}catch{/* TEMP retained for environment diagnostics */}
}

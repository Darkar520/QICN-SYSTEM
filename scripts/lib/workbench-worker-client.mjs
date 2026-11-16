import { Worker } from 'node:worker_threads';
import { verifyWorkbenchResult } from '../../src/experiments/workbench/runner.js';
import { assertData } from '../../src/experiments/workbench/contracts.js';

export function runWorkbenchInWorker(capture, protocol, { signal = null, timeoutMs = 120000, expectedBuild = null } = {}) {
  if (signal?.aborted) return Promise.reject(new Error('workbench_cancelled'));
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1) return Promise.reject(new Error('invalid_worker_timeout'));
  assertData(capture); assertData(protocol);
  expectedBuild = expectedBuild || capture.sourceBuild;
  assertData(expectedBuild);
  const captured = structuredClone(capture), preregistered = structuredClone(protocol);
  return new Promise((resolve,reject) => {
    const worker = new Worker(new URL('./workbench-node-worker.mjs', import.meta.url), { execArgv: [], resourceLimits: { maxOldGenerationSizeMb: 256 } });
    let settled = false;
    const finish = (error,result) => {
      if (settled) return;
      settled = true; clearTimeout(timer); signal?.removeEventListener('abort',abort);
      worker.terminate(); if (error) reject(error); else resolve(result);
    };
    const abort = () => finish(new Error('workbench_cancelled'));
    const timer = setTimeout(() => finish(new Error('workbench_timeout')),timeoutMs);
    signal?.addEventListener('abort',abort,{once:true});
    worker.once('error',error => finish(error));
    worker.once('exit',code => { if (!settled) finish(new Error(`workbench_worker_exit:${code}`)); });
    worker.once('message',message => {
      try {
        if (message.id !== 'workbench' || message.type !== 'workbench_result') throw new Error(message.error || 'workbench_worker_protocol_error');
        verifyWorkbenchResult(message.result,captured,preregistered);
        finish(null,message.result);
      } catch (error) { finish(error); }
    });
    worker.postMessage({ type: 'run_workbench', id: 'workbench', capture: captured, protocol: preregistered, expectedBuild: structuredClone(expectedBuild) });
  });
}

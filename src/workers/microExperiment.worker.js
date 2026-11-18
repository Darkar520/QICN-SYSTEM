// Browser module worker entrypoint; deliberately has no live-runtime bridge.
/* global __QICN_WORKBENCH_BUILD__ */
import { runWorkbench } from '../experiments/workbench/runner.js';
import { assertData } from '../experiments/workbench/contracts.js';
export const WORKBENCH_BUILD=typeof __QICN_WORKBENCH_BUILD__==='undefined'?null:Object.freeze(__QICN_WORKBENCH_BUILD__);
export async function handleWorkbenchRequest(request) {
  assertData(request);
  if (!request || request.type !== 'run_workbench' || typeof request.id !== 'string') throw new Error('invalid_workbench_request');
  if(WORKBENCH_BUILD && (request.capture?.sourceBuild?.signature!==WORKBENCH_BUILD.signature || request.capture?.sourceBuild?.version!==WORKBENCH_BUILD.version))throw new Error('workbench_worker_build_mismatch');
  return { id: request.id, type: 'workbench_result', workerBuild:WORKBENCH_BUILD, result: await runWorkbench(request.capture, request.protocol, { expectedBuild: request.expectedBuild || null }) };
}
if (typeof self !== 'undefined' && typeof self.postMessage === 'function' && typeof document === 'undefined') {
  self.onmessage = async ({ data }) => {
    try { self.postMessage(await handleWorkbenchRequest(data)); }
    catch (error) { self.postMessage({ id: data?.id || null, type: 'workbench_error', error: String(error.message || error) }); }
  };
}

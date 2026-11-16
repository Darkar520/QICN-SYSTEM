// Browser module worker entrypoint; deliberately has no live-runtime bridge.
import { runWorkbench } from '../experiments/workbench/runner.js';
import { assertData } from '../experiments/workbench/contracts.js';
export async function handleWorkbenchRequest(request) {
  assertData(request);
  if (!request || request.type !== 'run_workbench' || typeof request.id !== 'string') throw new Error('invalid_workbench_request');
  return { id: request.id, type: 'workbench_result', result: await runWorkbench(request.capture, request.protocol, { expectedBuild: request.expectedBuild || null }) };
}
if (typeof self !== 'undefined' && typeof self.postMessage === 'function' && typeof document === 'undefined') {
  self.onmessage = async ({ data }) => {
    try { self.postMessage(await handleWorkbenchRequest(data)); }
    catch (error) { self.postMessage({ id: data?.id || null, type: 'workbench_error', error: String(error.message || error) }); }
  };
}

import { parentPort } from 'node:worker_threads';
import { handleWorkbenchRequest } from '../../src/workers/microExperiment.worker.js';
parentPort.on('message', async (request) => {
  try { parentPort.postMessage(await handleWorkbenchRequest(request)); }
  catch (error) { parentPort.postMessage({ id: request?.id || null, type: 'workbench_error', error: String(error.message || error) }); }
});

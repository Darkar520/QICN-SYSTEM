import fs from 'fs';
import path from 'path';
import assert from 'node:assert/strict';

const file = path.resolve('src/index_network_canvas.jsx');
const content = fs.readFileSync(file, 'utf8');

const required = [
  'const queueCanvasRecovery = useCallback',
  'if (!usingWorker && transferredToWorkerRef.current)',
  'offscreen_context_guard',
  'canvas_recovery_remount',
  'recovery_attempt_count'
];

for (const token of required) {
  assert.ok(content.includes(token), `Missing token: ${token}`);
}

console.log('ok network-offscreen-guard.v410');

import fs from 'fs';
import path from 'path';
import assert from 'node:assert/strict';

const file = path.resolve('src/index_network_canvas.jsx');
const content = fs.readFileSync(file, 'utf8');

const requiredTokens = [
  'worker_fault',
  'projection_fault',
  'data_fault',
  'render_error_code',
  'render_error_message',
  'worker_restart_count',
  'visible_on_screen_count',
  'projected_nodes_count',
  'drawn_edges_count',
  'Recuperacion visual activa con malla sintetica temporal.',
  'Reactivar red'
];

for (const token of requiredTokens) {
  assert.ok(content.includes(token), `CASE FAIL: missing token ${token}`);
}

console.log('ok network-render-resilience.v49');

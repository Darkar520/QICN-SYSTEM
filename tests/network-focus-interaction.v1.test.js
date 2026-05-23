import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const assert = (condition, message) => { if (!condition) throw new Error(message); };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');

const canvasText = fs.readFileSync(path.join(root, 'src/index_network_canvas.jsx'), 'utf8');
const workerText = fs.readFileSync(path.join(root, 'src/network_canvas_worker.js'), 'utf8');

const canvasRequiredTokens = [
  'buildNodeSummary',
  'buildNeighborhoodSet',
  'findNearestProjectedNode',
  'interactionRef',
  'handleCanvasClick',
  'network-node-focus-tooltip',
  'hover_node_id',
  'selected_node_id',
  'focus_neighborhood_size',
  'Diagnostico visual interno; no es gate ni validacion externa.'
];

for (const token of canvasRequiredTokens) {
  assert(canvasText.includes(token), `NetworkCanvas should preserve interactive focus token: ${token}`);
}

const workerRequiredTokens = [
  'interaction = {}',
  'buildNeighborhoodSet',
  'findNearestProjectedNode',
  'hoverNode',
  'selectedNode',
  'focusNeighborhoodSize',
  'visibleOnscreenCount',
  'drawnEdgesCount'
];

for (const token of workerRequiredTokens) {
  assert(workerText.includes(token), `network canvas worker should preserve focus telemetry token: ${token}`);
}

assert(
  canvasText.includes('role="application"') && canvasText.includes('aria-label="Red nodal interactiva'),
  'NetworkCanvas should expose an accessible interaction boundary'
);

console.log('OK: network focus interaction guards passed');

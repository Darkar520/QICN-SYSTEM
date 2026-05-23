import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const assert = (condition, message) => { if (!condition) throw new Error(message); };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');

const canvasText = fs.readFileSync(path.join(root, 'src/index_network_canvas.jsx'), 'utf8');
const workerText = fs.readFileSync(path.join(root, 'src/network_canvas_worker.js'), 'utf8');
const uiText = fs.readFileSync(path.join(root, 'src/components/SimulationEngine.jsx'), 'utf8');

const sharedRendererTokens = [
  'drawCinematicDepthBackground',
  'pseudoRandomUnit',
  'bezierCurveTo',
  'quadraticCurveTo',
  "globalCompositeOperation = 'screen'",
  'ctx.ellipse',
  'depthLift',
  'shadowAlpha'
];

for (const token of sharedRendererTokens) {
  assert(canvasText.includes(token), `main renderer should preserve cinematic depth token: ${token}`);
  assert(workerText.includes(token), `worker renderer should preserve cinematic depth token: ${token}`);
}

assert(canvasText.includes('2.5D ENGINE v8.1 Active'), 'network HUD should advertise the new lightweight cinematic renderer');
assert(uiText.includes('proyeccion diagnostica cinematica (Canvas v4.2)'), 'network panel footer should reflect the cinematic renderer status');
assert(!canvasText.includes('3D ENGINE v8.0 Active'), 'legacy HUD label should not remain after cinematic renderer upgrade');

console.log('OK: network cinematic depth guards passed');

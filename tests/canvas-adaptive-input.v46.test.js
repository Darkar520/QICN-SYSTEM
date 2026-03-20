import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const assert = (condition, message) => { if (!condition) throw new Error(message); };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const text = fs.readFileSync(path.join(__dirname, '../src/index_network_canvas.jsx'), 'utf8');

assert(text.includes('ResizeObserver'), 'canvas should use ResizeObserver for adaptive sizing');
assert(text.includes('onTouchStart'), 'canvas should support touch start interaction');
assert(text.includes('onTouchMove'), 'canvas should support touch move interaction');
assert(text.includes('canvasSize.width'), 'canvas width must be container-driven');
assert(!text.includes('width={900}\n                height={650}'), 'fixed 900x650 canvas dimensions should be removed');

console.log('OK: canvas adaptive input tests passed');

import fs from 'fs';
import path from 'path';
import assert from 'node:assert/strict';

const file = path.resolve('src/index_network_canvas.jsx');
const content = fs.readFileSync(file, 'utf8');

const required = [
  'const handleMouseDown =',
  'const handleMouseMove =',
  'const handleWheel =',
  'const handleTouchStart =',
  'const handleTouchMove =',
  'const handleTouchEnd =',
  'handleDoubleClick',
  'Reactivar red',
  'Recentrar cámara'
];

for (const token of required) {
  assert.ok(content.includes(token), `3D interaction token missing: ${token}`);
}

console.log('ok network-3d-interactions.v410');

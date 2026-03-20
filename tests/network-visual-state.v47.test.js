import fs from 'fs';
import path from 'path';

const file = path.resolve('src/index_network_canvas.jsx');
const content = fs.readFileSync(file, 'utf8');

const requiredPatterns = [
  /const\s+\[renderState,\s*setRenderState\]\s*=\s*useState\('recovering'\)/,
  /const\s+\[drawStats,\s*setDrawStats\]\s*=\s*useState\(\s*\{[\s\S]*visibleNodes:\s*0,[\s\S]*edgeCount:\s*0,/,
  /renderState:\s*visibleOnscreen\s*>\s*0\s*\?\s*'active'\s*:\s*\(projectedNodes\.length\s*>\s*0\s*\?\s*'recovering'\s*:\s*'no_visible_nodes'\)/,
  /RENDER_STATE_META\[renderState\]/,
  /N\s*\{drawStats\.visibleNodes\}\s*\|\s*E\s*\{drawStats\.edgeCount\}/
];

for (const pattern of requiredPatterns) {
  if (!pattern.test(content)) {
    throw new Error(`missing pattern: ${pattern}`);
  }
}

console.log('ok network-visual-state.v47');

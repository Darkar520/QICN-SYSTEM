import fs from 'fs';
import path from 'path';
import assert from 'node:assert/strict';

const file = path.resolve('src/components/SimulationEngine.jsx');
// Fase 2: primaryTabs/moreTabs -> TabConfig.jsx. Texto combinado para el chequeo estático.
const content = [file, path.resolve('src/components/TabConfig.jsx')]
  .map((p) => fs.readFileSync(p, 'utf8'))
  .join('\n');

assert.ok(content.includes('const primaryTabs = ['), 'CASE 1 FAIL: primaryTabs definition missing.');
assert.ok(content.includes('const moreTabs = ['), 'CASE 2 FAIL: moreTabs definition missing.');
assert.ok(content.includes("Top 5 operativo + menu Mas"), 'CASE 3 FAIL: Top 5 + Mas copy missing.');
assert.ok(content.includes("{isMoreMenuOpen ? 'Cerrar' : 'Mas'}"), 'CASE 4 FAIL: Mas toggle missing.');
assert.ok(content.includes('Recientes:'), 'CASE 5 FAIL: recent tabs UI missing.');
assert.ok(!content.includes('Herramientas avanzadas'), 'CASE 6 FAIL: legacy advanced tools label should be removed.');

console.log('ok navigation-top5-more.v49');

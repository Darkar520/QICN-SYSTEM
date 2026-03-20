import fs from 'fs';
import path from 'path';
import assert from 'node:assert/strict';

const file = path.resolve('src/index.jsx');
const content = fs.readFileSync(file, 'utf8');

assert.ok(content.includes('const primaryTabs = ['), 'CASE 1 FAIL: primaryTabs definition missing.');
assert.ok(content.includes('const moreTabs = ['), 'CASE 2 FAIL: moreTabs definition missing.');
assert.ok(content.includes("Top 5 operativo + menu Mas"), 'CASE 3 FAIL: Top 5 + Mas copy missing.');
assert.ok(content.includes("{isMoreMenuOpen ? 'Cerrar' : 'Mas'}"), 'CASE 4 FAIL: Mas toggle missing.');
assert.ok(content.includes('Recientes:'), 'CASE 5 FAIL: recent tabs UI missing.');
assert.ok(!content.includes('Herramientas avanzadas'), 'CASE 6 FAIL: legacy advanced tools label should be removed.');

console.log('ok navigation-top5-more.v49');

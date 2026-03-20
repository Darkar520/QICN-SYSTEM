import fs from 'fs';
import path from 'path';
import assert from 'node:assert/strict';

const file = path.resolve('src/index.jsx');
const content = fs.readFileSync(file, 'utf8');

const criticalCleanTokens = [
  'Núcleo Ontológico - Capa 1',
  'Fenomenología Estructural',
  'Metacognición Sistémica',
  'Régimen Post-Umbral',
  'Dinámica Activa'
];

for (const token of criticalCleanTokens) {
  assert.ok(content.includes(token), `Critical UI label missing or malformed: ${token}`);
}

const forbiddenMojibake = [
  'N\u00c3\u0192\u00c2\u00bacleo Ontol',
  'Fenomenolog\u00c3\u0192',
  'Metacognici\u00c3\u0192',
  'R\u00c3\u0192\u00c2\u00a9gimen Post',
  'Din\u00c3\u0192\u00c2\u00a1mica Activa'
];

for (const token of forbiddenMojibake) {
  assert.ok(!content.includes(token), `Mojibake detected in critical UI: ${token}`);
}

console.log('ok ui-mojibake-guard.v410');

import fs from 'fs';
import path from 'path';
import assert from 'node:assert/strict';

const file = path.resolve('src/components/SimulationEngine.jsx');
const content = fs.readFileSync(file, 'utf8');

const requiredLabels = [
  'Fenomenología Estructural',
  'Metacognición Sistémica',
  'Régimen Post-Umbral',
  'PMIA Diagnostics',
  'Metacognitive Strain',
  'Quantum Entropy',
  'Autonomy Sandbox',
  'Protocolo de Fricción Ontológica',
  'Informe Introspectivo',
  'Dinámica Activa'
];

for (const label of requiredLabels) {
  assert.ok(content.includes(label), `Core label missing: ${label}`);
}

console.log('ok core-label-coverage.v410');

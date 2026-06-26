import fs from 'fs';
import path from 'path';
import assert from 'node:assert/strict';

const file = path.resolve('src/components/SimulationEngine.jsx');
const content = fs.readFileSync(file, 'utf8') + '\n' + fs.readFileSync(path.resolve('src/hooks/useSimulationCycle.js'), 'utf8');

const required = [
  "regime.forcedNegativeTicksRemaining = 24",
  "const transformMaxTicks = 24 + (extensionBlocks * 6)",
  "Math.min(4, Math.max(0, Math.floor(transformDrive * 4)))",
  "regime.transformElapsedTicks < regime.transformMaxTicks",
  "const extensionTicks = Math.min(6, remainingBudget)"
];

for (const token of required) {
  assert.ok(content.includes(token), `Missing token: ${token}`);
}

console.log('ok pmia-negative-window.v411');


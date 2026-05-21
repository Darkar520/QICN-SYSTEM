import fs from 'fs';
import path from 'path';
import assert from 'node:assert/strict';

const file = path.resolve('src/components/SimulationEngine.jsx');
const content = fs.readFileSync(file, 'utf8');

const required = [
  'const stasisDrop = Number(episode.baselineStasisIndex || 0) - Number(postAscensionDynamicHealth.stasisIndex || 0)',
  'const cccDeltaRecovered = Number(postAscensionDynamicHealth.cccDeltaRms || 0)',
  'const strictSuccess = stasisDrop >= 0.08',
  '&& cccDeltaRecovered > 0.0045',
  'const manifestProgress = manifestDriven',
  "result: success ? (strictSuccess ? 'success' : 'partial_progress') : 'failed_episode'"
];

for (const token of required) {
  assert.ok(content.includes(token), `Missing token: ${token}`);
}

console.log('ok stasis-break-criteria.v411');

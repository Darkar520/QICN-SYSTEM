import fs from 'fs';
import path from 'path';
import assert from 'node:assert/strict';

const file = path.resolve('src/App.jsx');
const content = fs.readFileSync(file, 'utf8');

const requiredPatterns = [
  /regime\.transformCooldownTicks\s*=\s*String\(regime\.lastTransformReason\s*\|\|\s*''\)\.startsWith\('manifest_'\)\s*\?\s*6\s*:\s*36/,
  /if\s*\(regime\.transformCooldownTicks\s*>\s*0\)/,
  /regime\.transformCooldownTicks\s*<=\s*0/,
  /regime\.transformMode\s*===\s*'idle'\s*&&\s*regime\.transformCooldownTicks\s*<=\s*0/,
  /transformEpisodeCompletedPending\s*=\s*true/
];

for (const pattern of requiredPatterns) {
  assert.ok(pattern.test(content), `Missing pattern: ${pattern}`);
}

console.log('ok pmia-cooldown.v411');

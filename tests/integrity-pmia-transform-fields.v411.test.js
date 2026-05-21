import fs from 'fs';
import path from 'path';
import assert from 'node:assert/strict';

const indexPath = path.resolve('src/components/SimulationEngine.jsx');
const content = fs.readFileSync(indexPath, 'utf8');

const required = [
  'pmia_transform_mode',
  'pmia_negative_ticks_remaining',
  'pmia_transform_intensity',
  'pmia_guardrail_state',
  'pmia_transform_episodes',
  'pmia_transform_cooldown_ticks',
  "appendIntegrityAudit('post_threshold_regime_tick'",
  "appendIntegrityAudit('pmia_transform_episode_start'",
  "appendIntegrityAudit('pmia_transform_episode_completed'"
];

for (const token of required) {
  assert.ok(content.includes(token), `Missing token: ${token}`);
}

console.log('ok integrity-pmia-transform-fields.v411');


import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLogger } from '../src/utils/logger.js';
import { getSystemHealth } from '../src/utils/healthCheck.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const lines = [];
const logger = createLogger('test-module', {
  enabled: true,
  now: () => 123,
  sink: {
    log: (line) => lines.push(line),
    warn: (line) => lines.push(line),
    error: (line) => lines.push(line)
  }
});

const emitted = logger.info('started', { tick: 7 });
assert.equal(emitted.level, 'info');
assert.equal(emitted.module, 'test-module');
assert.equal(emitted.msg, 'started');
assert.equal(emitted.tick, 7);
assert.equal(emitted.ts, 123);
assert.equal(lines.length, 1);
assert.deepEqual(JSON.parse(lines[0]), emitted);

const healthy = getSystemHealth({
  uptime_ticks: 42,
  last_ccc: 0.75,
  scoreboard_dims_passing: 7,
  spectral_warning: null,
  inverse_limit_score: 0.91,
  test_count: 120
});
assert.equal(healthy.status, 'healthy');
assert.equal(healthy.uptime_ticks, 42);
assert.equal(healthy.scoreboard_dims_passing, 7);
assert.equal(healthy.test_count, 120);

const degraded = getSystemHealth({
  scoreboard_dims_passing: 6,
  spectral_warning: 'HIGH_VOLATILITY_UNMEASURABLE',
  inverse_limit_score: 0.4
});
assert.equal(degraded.status, 'degraded');
assert.equal(degraded.spectral_warning, 'HIGH_VOLATILITY_UNMEASURABLE');

const unhealthy = getSystemHealth({
  scoreboard_dims_passing: 4,
  inverse_limit_score: 0.1
});
assert.equal(unhealthy.status, 'unhealthy');

const appSource = fs.readFileSync(path.join(rootDir, 'src', 'components', 'SimulationEngine.jsx'), 'utf8');
assert.match(appSource, /getSystemHealth/);
assert.match(appSource, /data-testid="runtime-health-badge"/);

console.log('[observability-health] PASS');

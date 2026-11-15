import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
const result = spawnSync(process.execPath, ['--input-type=module', '-e',
  "import { GEMINI_ENGINE_CONFIG } from './src/config/simulationDefaults.js'; console.log(GEMINI_ENGINE_CONFIG.MODEL_ID);"], {
  encoding: 'utf8', env: { ...process.env, GEMINI_MODEL_ID: 'configured-test-model', GEMINI_STRICT_MODEL: 'true' }
});
assert.equal(result.status, 0, result.stderr);
assert.equal(result.stdout.trim(), 'configured-test-model', 'strict mode must honor the configured server model');
console.log('[configured-model-boundary] PASS');

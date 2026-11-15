import assert from 'node:assert/strict';
import { runAllTowerMathematicsChecks } from '../scripts/verify_tower_mathematics_integration.js';

const result = runAllTowerMathematicsChecks();
assert.equal(result.passed, true);
assert.equal(result.external_support_certified, false);
console.log('[test] tower-mathematics-integration.v1.test.mjs PASS');

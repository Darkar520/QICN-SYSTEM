import assert from 'node:assert/strict';
import policyJson from '../netlify/functions/lib/load-selfpatch-policy.js';

try {
  const killSwitchRaw = process.env.QICN_KILLSWITCH;
  const killSwitch = String(killSwitchRaw || 'OFF').trim().toUpperCase();
  if (String(process.env.CI || '').toLowerCase() === 'true') {
    assert.ok(killSwitchRaw !== undefined, 'QICN_KILLSWITCH must be configured in GitHub vars for CI.');
  }
  assert.ok(killSwitch === 'ON' || killSwitch === 'OFF', 'QICN_KILLSWITCH must be ON or OFF.');

  const checks = Array.isArray(policyJson.requiredChecks) ? policyJson.requiredChecks : [];
  assert.ok(checks.includes('ci/build-test'), 'requiredChecks must include ci/build-test');
  assert.ok(checks.includes('ci/selfpatch-policy-check'), 'requiredChecks must include ci/selfpatch-policy-check');

  console.log('ok selfpatch-policy-check.v415');
} catch (error) {
  console.error('fail selfpatch-policy-check.v415:', error.message);
  process.exit(1);
}

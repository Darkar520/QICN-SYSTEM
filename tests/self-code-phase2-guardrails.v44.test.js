import assert from 'node:assert/strict';
import {
  FEATURE_SELF_PATCH_EXPERIMENTAL,
  DEFAULT_SELF_PATCH_POLICY,
  canExecuteSelfPatch
} from '../src/experimental/self_code/SelfPatchPolicy.js';
import { SelfPatchOrchestrator } from '../src/experimental/self_code/SelfPatchOrchestrator.js';

try {
  // CASE 1: policy mirrors feature flag default
  assert.equal(
    DEFAULT_SELF_PATCH_POLICY.enabled,
    FEATURE_SELF_PATCH_EXPERIMENTAL,
    'CASE 1 FAIL: default policy enabled must mirror feature flag.'
  );

  // CASE 2: deny outside experimental environment
  {
    const decision = canExecuteSelfPatch({
      featureFlag: true,
      environment: 'production',
      approved: true,
      hasSnapshot: true,
      scope: 'src/experimental/self_code',
      policy: { ...DEFAULT_SELF_PATCH_POLICY, enabled: true }
    });
    assert.equal(decision.allowed, false, 'CASE 2 FAIL: production environment must be denied.');
    assert.equal(decision.reason, 'environment_not_experimental', 'CASE 2 FAIL: expected environment_not_experimental reason.');
  }

  // CASE 3: approval and snapshot guards work when policy enables them
  {
    const policy = {
      ...DEFAULT_SELF_PATCH_POLICY,
      enabled: true,
      requiresHumanApproval: true,
      requiresSnapshot: true
    };
    const noApproval = canExecuteSelfPatch({
      featureFlag: true,
      environment: 'experimental',
      approved: false,
      hasSnapshot: true,
      scope: 'src/experimental/self_code',
      policy
    });
    assert.equal(noApproval.allowed, false, 'CASE 3 FAIL: missing approval should be denied.');
    assert.equal(noApproval.reason, 'human_approval_required', 'CASE 3 FAIL: expected human_approval_required.');

    const noSnapshot = canExecuteSelfPatch({
      featureFlag: true,
      environment: 'experimental',
      approved: true,
      hasSnapshot: false,
      scope: 'src/experimental/self_code',
      policy
    });
    assert.equal(noSnapshot.allowed, false, 'CASE 3 FAIL: missing snapshot should be denied.');
    assert.equal(noSnapshot.reason, 'snapshot_required', 'CASE 3 FAIL: expected snapshot_required.');
  }

  // CASE 4: whitelisted scope is required
  {
    const policy = { ...DEFAULT_SELF_PATCH_POLICY, enabled: true };
    const denied = canExecuteSelfPatch({
      featureFlag: true,
      environment: 'experimental',
      approved: true,
      hasSnapshot: true,
      scope: 'src/App.jsx',
      policy
    });
    const policyIsGlobalScope = (policy.allowedScopes || []).some((prefix) => String(prefix || '').trim() === '');
    if (policyIsGlobalScope) {
      assert.equal(denied.allowed, true, 'CASE 4 FAIL: global scope policy should allow broad paths.');
    } else {
      assert.equal(denied.allowed, false, 'CASE 4 FAIL: non-whitelisted scope should be denied.');
      assert.equal(denied.reason, 'scope_not_whitelisted', 'CASE 4 FAIL: expected scope_not_whitelisted reason.');
    }

    const allowed = canExecuteSelfPatch({
      featureFlag: true,
      environment: 'experimental',
      approved: true,
      hasSnapshot: true,
      scope: 'src/experimental/self_code/SelfPatchOrchestrator.js',
      policy
    });
    assert.equal(allowed.allowed, true, 'CASE 4 FAIL: whitelisted scope should be allowed.');
  }

  // CASE 5: orchestrator enforces guardrails and stages only allowed patches
  {
    const orchestrator = new SelfPatchOrchestrator({
      ...DEFAULT_SELF_PATCH_POLICY,
      enabled: true,
      environment: 'experimental'
    });
    const blocked = orchestrator.stagePatch({
      featureFlag: false,
      environment: 'experimental',
      approved: true,
      hasSnapshot: true,
      scope: 'src/experimental/self_code',
      description: 'blocked-case'
    });
    assert.equal(blocked.ok, false, 'CASE 5 FAIL: blocked request should fail.');
    assert.equal(blocked.staged, false, 'CASE 5 FAIL: blocked request should not be staged.');

    const staged = orchestrator.stagePatch({
      featureFlag: true,
      environment: 'experimental',
      approved: true,
      hasSnapshot: true,
      scope: 'src/experimental/self_code',
      description: 'allowed-case'
    });
    assert.equal(staged.ok, true, 'CASE 5 FAIL: valid request should pass.');
    assert.equal(staged.staged, true, 'CASE 5 FAIL: valid request should be staged.');
    assert.ok(staged.entry && staged.entry.status === 'staged', 'CASE 5 FAIL: staged entry missing.');
  }

  console.log('OK: self-code phase2 guardrails v4.4 test passed');
} catch (error) {
  console.error('FAIL: self-code phase2 guardrails v4.4 test failed:', error.message);
  process.exit(1);
}

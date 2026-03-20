import assert from 'node:assert/strict';
import {
  computeProposalWindow,
  evaluateRateAndBudget
} from '../netlify/functions/lib/selfpatch-governor.js';
import policyJson from '../netlify/functions/lib/load-selfpatch-policy.js';

try {
  const nowMs = Date.now();
  const prs = [
    {
      created_at: new Date(nowMs - 1_000).toISOString(),
      state: 'open',
      labels: [{ name: 'selfpatch' }],
      body: 'tokens_estimate: 1000'
    },
    {
      created_at: new Date(nowMs - 5_000).toISOString(),
      state: 'closed',
      labels: [{ name: 'selfpatch' }],
      body: 'tokens_estimate: 1200'
    },
    {
      created_at: new Date(nowMs - 10_000).toISOString(),
      state: 'closed',
      labels: [{ name: 'selfpatch' }],
      body: 'tokens_estimate: 800'
    }
  ];

  const windowState = computeProposalWindow({ pullRequests: prs, nowMs });
  assert.equal(windowState.proposals24h, 3, 'expected 3 proposals in last 24h');
  assert.equal(windowState.inflight, 1, 'expected 1 inflight proposal');

  const deniedBy24h = evaluateRateAndBudget({
    ...windowState,
    estimatedTokens: 10,
    limits: { maxProposals24h: 3, maxInflight: 2, tokenBudgetDay: 999999 }
  });
  if (String(policyJson?.mode || '').toLowerCase() === 'sandbox_unrestricted') {
    assert.equal(deniedBy24h.allowed, true, 'sandbox_unrestricted must bypass 24h cap');
    assert.equal(deniedBy24h.reason, 'sandbox_unrestricted_mode', 'wrong bypass reason for 24h cap');
  } else {
    assert.equal(deniedBy24h.allowed, false, 'must block when max proposals/24h reached');
    assert.equal(deniedBy24h.reason, 'rate_limit_24h_exceeded', 'wrong denial reason for 24h cap');
  }

  const deniedByInflight = evaluateRateAndBudget({
    proposals24h: 1,
    inflight: 1,
    usedTokens24h: 0,
    estimatedTokens: 1,
    limits: { maxProposals24h: 3, maxInflight: 1, tokenBudgetDay: 999999 }
  });
  if (String(policyJson?.mode || '').toLowerCase() === 'sandbox_unrestricted') {
    assert.equal(deniedByInflight.allowed, true, 'sandbox_unrestricted must bypass inflight cap');
    assert.equal(deniedByInflight.reason, 'sandbox_unrestricted_mode', 'wrong bypass reason for inflight cap');
  } else {
    assert.equal(deniedByInflight.allowed, false, 'must block when inflight cap reached');
    assert.equal(deniedByInflight.reason, 'rate_limit_inflight_exceeded', 'wrong denial reason for inflight cap');
  }

  const deniedByCooldown = evaluateRateAndBudget({
    proposals24h: 0,
    inflight: 0,
    usedTokens24h: 0,
    estimatedTokens: 5,
    limits: {
      maxProposals24h: 3,
      maxInflight: 1,
      tokenBudgetDay: 999999,
      cooldownMinutes: 120,
      nowMs,
      latestProposalMs: nowMs - (10 * 60 * 1000)
    }
  });
  if (String(policyJson?.mode || '').toLowerCase() === 'sandbox_unrestricted') {
    assert.equal(deniedByCooldown.allowed, true, 'sandbox_unrestricted must bypass cooldown');
    assert.equal(deniedByCooldown.reason, 'sandbox_unrestricted_mode', 'wrong bypass reason for cooldown');
  } else {
    assert.equal(deniedByCooldown.allowed, false, 'must block when cooldown is active');
    assert.equal(deniedByCooldown.reason, 'cooldown_active', 'wrong denial reason for cooldown');
  }

  console.log('ok selfpatch-rate-limit.v415');
} catch (error) {
  console.error('fail selfpatch-rate-limit.v415:', error.message);
  process.exit(1);
}

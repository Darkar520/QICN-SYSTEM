import assert from 'node:assert/strict';
import { evaluateRateAndBudget } from '../netlify/functions/lib/selfpatch-governor.js';
import policyJson from '../netlify/functions/lib/load-selfpatch-policy.js';

try {
  const denied = evaluateRateAndBudget({
    proposals24h: 1,
    inflight: 0,
    usedTokens24h: 99_500,
    estimatedTokens: 800,
    limits: { maxProposals24h: 3, maxInflight: 1, tokenBudgetDay: 100_000 }
  });
  if (String(policyJson?.mode || '').toLowerCase() === 'sandbox_unrestricted') {
    assert.equal(denied.allowed, true, 'sandbox_unrestricted must bypass token budget');
    assert.equal(denied.reason, 'sandbox_unrestricted_mode', 'wrong bypass reason when budget exceeded');
  } else {
    assert.equal(denied.allowed, false, 'must block when daily token budget exceeded');
    assert.equal(denied.reason, 'token_budget_exceeded', 'wrong reason when budget exceeded');
  }

  const allowed = evaluateRateAndBudget({
    proposals24h: 1,
    inflight: 0,
    usedTokens24h: 40_000,
    estimatedTokens: 500,
    limits: { maxProposals24h: 3, maxInflight: 1, tokenBudgetDay: 100_000 }
  });
  assert.equal(allowed.allowed, true, 'must allow below token budget');

  console.log('ok selfpatch-token-budget.v415');
} catch (error) {
  console.error('fail selfpatch-token-budget.v415:', error.message);
  process.exit(1);
}

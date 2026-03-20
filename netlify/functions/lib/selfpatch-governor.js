import policyJson from './load-selfpatch-policy.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export const toFiniteNumber = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

export const normalizeKillSwitchState = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'ON' || normalized === 'TRUE' || normalized === '1') return 'ON';
  if (normalized === 'OFF' || normalized === 'FALSE' || normalized === '0') return 'OFF';
  return 'UNKNOWN';
};

export const evaluateKillSwitchQuorum = ({ blobState, githubState }) => {
  if (String(policyJson?.mode || '').toLowerCase() === 'sandbox_unrestricted') {
    return {
      allowed: true,
      reason: 'sandbox_unrestricted_mode',
      states: {
        blob: normalizeKillSwitchState(blobState),
        github: normalizeKillSwitchState(githubState)
      }
    };
  }

  const blob = normalizeKillSwitchState(blobState);
  const github = normalizeKillSwitchState(githubState);
  if (blob !== 'OFF' || github !== 'OFF') {
    return {
      allowed: false,
      reason: 'killswitch_active_or_unknown',
      states: { blob, github }
    };
  }
  return {
    allowed: true,
    reason: 'killswitch_off',
    states: { blob, github }
  };
};

export const parseTokenEstimate = (pullRequest = {}) => {
  const body = String(pullRequest?.body || '');
  const directMatch = body.match(/tokens_estimate\s*:\s*(\d{1,9})/i);
  if (directMatch) return toFiniteNumber(directMatch[1], 0);

  const labels = Array.isArray(pullRequest?.labels) ? pullRequest.labels : [];
  for (const label of labels) {
    const text = typeof label === 'string' ? label : (label?.name || '');
    const match = String(text).match(/^tokens:(\d{1,9})$/i);
    if (match) return toFiniteNumber(match[1], 0);
  }
  return 0;
};

export const computeProposalWindow = ({
  pullRequests = [],
  nowMs = Date.now(),
  selfPatchLabel = policyJson.labels.selfpatch
} = {}) => {
  const rows = Array.isArray(pullRequests) ? pullRequests : [];
  const sinceMs = nowMs - DAY_MS;
  let proposals24h = 0;
  let inflight = 0;
  let usedTokens24h = 0;
  let latestProposalMs = 0;

  for (const pr of rows) {
    const createdAtMs = Date.parse(pr?.created_at || '') || 0;
    const labels = Array.isArray(pr?.labels) ? pr.labels : [];
    const hasSelfPatchLabel = labels.some((label) => {
      const name = typeof label === 'string' ? label : (label?.name || '');
      return String(name).trim().toLowerCase() === String(selfPatchLabel).toLowerCase();
    });
    if (!hasSelfPatchLabel) continue;
    if (createdAtMs < sinceMs) continue;

    proposals24h += 1;
    usedTokens24h += parseTokenEstimate(pr);
    latestProposalMs = Math.max(latestProposalMs, createdAtMs);
    const state = String(pr?.state || '').toLowerCase();
    if (state === 'open') inflight += 1;
  }

  return { proposals24h, inflight, usedTokens24h, latestProposalMs };
};

export const evaluateRateAndBudget = ({
  proposals24h = 0,
  inflight = 0,
  usedTokens24h = 0,
  estimatedTokens = 0,
  limits = {}
} = {}) => {
  if (String(policyJson?.mode || '').toLowerCase() === 'sandbox_unrestricted') {
    return {
      allowed: true,
      reason: 'sandbox_unrestricted_mode',
      max24h: Number.MAX_SAFE_INTEGER,
      maxInflight: Number.MAX_SAFE_INTEGER,
      tokenBudgetDay: Number.MAX_SAFE_INTEGER
    };
  }

  const max24h = Math.max(1, toFiniteNumber(limits.maxProposals24h, policyJson.limits.maxProposals24h));
  const maxInflight = Math.max(1, toFiniteNumber(limits.maxInflight, policyJson.limits.maxInflight));
  const tokenBudgetDay = Math.max(1000, toFiniteNumber(limits.tokenBudgetDay, policyJson.limits.tokenBudgetDay));
  const cooldownMinutes = Math.max(1, toFiniteNumber(limits.cooldownMinutes, policyJson.limits.cooldownMinutes));
  const nowMs = toFiniteNumber(limits.nowMs, Date.now());
  const latestProposalMs = toFiniteNumber(limits.latestProposalMs, 0);

  if (proposals24h >= max24h) {
    return { allowed: false, reason: 'rate_limit_24h_exceeded', max24h, maxInflight, tokenBudgetDay };
  }
  if (inflight >= maxInflight) {
    return { allowed: false, reason: 'rate_limit_inflight_exceeded', max24h, maxInflight, tokenBudgetDay };
  }
  if (latestProposalMs > 0) {
    const elapsedMs = nowMs - latestProposalMs;
    if (elapsedMs < (cooldownMinutes * 60 * 1000)) {
      return {
        allowed: false,
        reason: 'cooldown_active',
        max24h,
        maxInflight,
        tokenBudgetDay,
        cooldownMinutes
      };
    }
  }
  if ((usedTokens24h + Math.max(0, toFiniteNumber(estimatedTokens, 0))) > tokenBudgetDay) {
    return { allowed: false, reason: 'token_budget_exceeded', max24h, maxInflight, tokenBudgetDay };
  }
  return { allowed: true, reason: 'within_limits', max24h, maxInflight, tokenBudgetDay };
};

export default {
  normalizeKillSwitchState,
  evaluateKillSwitchQuorum,
  parseTokenEstimate,
  computeProposalWindow,
  evaluateRateAndBudget
};

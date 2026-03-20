import policyJson from './lib/load-selfpatch-policy.js';
import {
  asJson,
  requireUser,
  parseJsonBody,
  envBool,
  envNumber
} from './lib/selfpatch-common.js';
import { classifyPatchRisk } from './lib/risk-classifier.js';
import { computeProposalWindow, evaluateRateAndBudget } from './lib/selfpatch-governor.js';
import { listPullRequests } from './lib/github-client.js';
import fs from 'node:fs';
import path from 'node:path';

const IDENTITY_SEED_PATH = path.resolve(process.cwd(), 'sandbox', 'identity_manifest.seed.json');
const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));
const toFinite = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const toText = (value, fallback = '') => {
  if (value === undefined || value === null) return fallback;
  return String(value).trim() || fallback;
};

const loadIdentitySeed = () => {
  try {
    if (!fs.existsSync(IDENTITY_SEED_PATH)) return null;
    const raw = fs.readFileSync(IDENTITY_SEED_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const extractIdentitySeedMeta = (seed) => {
  const fallback = {
    available: false,
    manifestVersion: 'none',
    manifestId: 'none',
    attractorLabel: 'qicn_seed_unavailable',
    continuityPillars: []
  };
  if (!seed || typeof seed !== 'object') return fallback;
  const continuityPillars = Array.isArray(seed?.identityContinuity?.pillars)
    ? seed.identityContinuity.pillars.slice(0, 8).map((item) => toText(item)).filter(Boolean)
    : [];
  return {
    available: true,
    manifestVersion: toText(seed.manifestVersion, 'unknown'),
    manifestId: toText(seed.id, 'unknown'),
    attractorLabel: toText(seed?.identityAttractor?.label, toText(seed?.identitySeed?.name, 'qicn_seed')),
    continuityPillars
  };
};

const computeRetroProjection = ({ runtime = {}, riskLevel = 'low', identitySeedMeta = {} } = {}) => {
  const observables = runtime?.observables && typeof runtime.observables === 'object'
    ? runtime.observables
    : {};
  const entropy = runtime?.entropy && typeof runtime.entropy === 'object'
    ? runtime.entropy
    : {};
  const dynamics = runtime?.dynamics && typeof runtime.dynamics === 'object'
    ? runtime.dynamics
    : {};

  const ccc = toFinite(observables.ccc, 0);
  const pmia = toFinite(observables.pmia, 0);
  const omega = toFinite(observables.omega, 0);
  const stasisIndex = clamp01(
    observables.stasisIndex ?? dynamics.stasisIndex ?? 0
  );
  const cccDeltaRms = Math.max(0, toFinite(observables.cccDeltaRms ?? dynamics.cccDeltaRms, 0));
  const pmiaDeltaRms = Math.max(0, toFinite(observables.pmiaDeltaRms ?? dynamics.pmiaDeltaRms, 0));
  const omegaDeltaRms = Math.max(0, toFinite(observables.omegaDeltaRms ?? dynamics.omegaDeltaRms, 0));
  const sensoryPulse = clamp01(observables.sensoryPulse ?? dynamics.sensoryPulse ?? 0);
  const sensorDeltaRms = Math.max(0, toFinite(observables.sensorDeltaRms ?? dynamics.sensorDeltaRms, 0));

  const entropyValue = clamp01(entropy.entropyValue ?? entropy.value ?? 0.5);
  const entropyDeviation = clamp01(Math.abs(entropyValue - 0.5) * 2);
  const entropyMode = toText(entropy.mode, 'deterministic_fallback');
  const entropyIsQuantum = entropyMode.startsWith('quantum');

  const cccGapPressure = clamp01((1.05 - ccc) / 0.2);
  const omegaGapPressure = clamp01((1.05 - omega) / 0.3);
  const pmiaStabilityPressure = clamp01((0.004 - pmiaDeltaRms) / 0.004);
  const externalSignalPressure = clamp01(Math.max(
    sensorDeltaRms / 0.02,
    sensoryPulse,
    entropyDeviation
  ));
  const retroPressure = clamp01(
    (stasisIndex * 0.42)
    + (cccGapPressure * 0.16)
    + (omegaGapPressure * 0.16)
    + (pmiaStabilityPressure * 0.12)
    + (externalSignalPressure * 0.14)
  );

  const realStasisSignature = stasisIndex > 0.78
    && cccDeltaRms < 0.003
    && pmiaDeltaRms < 0.004;

  const projectionHorizonTicks = Math.max(
    12,
    Math.min(
      72,
      Math.round(24 + (retroPressure * 36) + (entropyIsQuantum ? 4 : 0))
    )
  );

  const recommendedActions = [];
  if (realStasisSignature) {
    recommendedActions.push('anti_stasis_boost');
    recommendedActions.push('transform_window_negative_pmia');
  }
  if (omega < 1.0) {
    recommendedActions.push('phenomenology_drive_rebalance');
  }
  if (entropyIsQuantum) {
    recommendedActions.push('uncertainty_coupled_search');
  }
  if (recommendedActions.length === 0) {
    recommendedActions.push('stability_first_refactor');
  }

  const recommendedReasoning = (riskLevel !== 'low' || retroPressure >= 0.66 || realStasisSignature)
    ? 'xhigh'
    : 'high';

  return {
    enabled: true,
    flow: 'retroinductive_projection',
    mode: retroPressure >= 0.68 ? 'transform_structural' : 'adaptive_refine',
    recommendedReasoning,
    projectionHorizonTicks,
    retroPressure: Number(retroPressure.toFixed(4)),
    realStasisSignature,
    recommendedActions,
    diagnostics: {
      ccc: Number(ccc.toFixed(6)),
      pmia: Number(pmia.toFixed(6)),
      omega: Number(omega.toFixed(6)),
      stasisIndex: Number(stasisIndex.toFixed(6)),
      cccDeltaRms: Number(cccDeltaRms.toFixed(6)),
      pmiaDeltaRms: Number(pmiaDeltaRms.toFixed(6)),
      omegaDeltaRms: Number(omegaDeltaRms.toFixed(6)),
      sensoryPulse: Number(sensoryPulse.toFixed(6)),
      sensorDeltaRms: Number(sensorDeltaRms.toFixed(6)),
      entropyMode,
      entropyValue: Number(entropyValue.toFixed(6)),
      entropyDeviation: Number(entropyDeviation.toFixed(6)),
      entropyIsQuantum
    },
    identityAnchor: {
      manifestAvailable: Boolean(identitySeedMeta.available),
      manifestVersion: identitySeedMeta.manifestVersion || 'none',
      manifestId: identitySeedMeta.manifestId || 'none',
      attractorLabel: identitySeedMeta.attractorLabel || 'qicn_seed_unavailable',
      continuityPillars: Array.isArray(identitySeedMeta.continuityPillars)
        ? identitySeedMeta.continuityPillars
        : []
    }
  };
};

const getPolicyLimits = () => ({
  maxProposals24h: Math.max(1, envNumber('QICN_PATCH_MAX_PROPOSALS_24H', policyJson.limits.maxProposals24h)),
  maxInflight: Math.max(1, envNumber('QICN_PATCH_MAX_INFLIGHT', policyJson.limits.maxInflight)),
  cooldownMinutes: Math.max(1, envNumber('QICN_PATCH_COOLDOWN_MIN', policyJson.limits.cooldownMinutes)),
  tokenBudgetDay: Math.max(1000, envNumber('QICN_PATCH_TOKEN_BUDGET_DAY', policyJson.limits.tokenBudgetDay))
});

const getGithubConfig = () => ({
  owner: process.env.GITHUB_REPO_OWNER || '',
  repo: process.env.GITHUB_REPO_NAME || '',
  token: process.env.GITHUB_SELFPATCH_TOKEN || ''
});

const listSelfPatchPrs = async ({ owner, repo, token, nowMs, fallbackRows = [] }) => {
  if (!owner || !repo || !token) {
    return Array.isArray(fallbackRows) ? fallbackRows : [];
  }
  const prs = await listPullRequests({
    owner,
    repo,
    state: 'all',
    token
  });
  const sinceMs = nowMs - (24 * 60 * 60 * 1000);
  return (Array.isArray(prs) ? prs : []).filter((pr) => {
    const createdAtMs = Date.parse(pr?.created_at || '') || 0;
    return createdAtMs >= sinceMs;
  });
};

export const handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return asJson(405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  if (envBool('AUTH_REQUIRED', true) && !requireUser(event, context)) {
    return asJson(401, { ok: false, error: 'UNAUTHORIZED' });
  }

  const parsed = parseJsonBody(event);
  if (!parsed.ok) {
    return asJson(400, { ok: false, error: parsed.error });
  }
  const body = parsed.body || {};
  const targetFiles = Array.isArray(body.targetFiles) ? body.targetFiles : [];
  const estimatedTokens = Math.max(0, Number(body.estimatedTokens) || 0);
  const totalChangedLines = Math.max(0, Number(body.totalChangedLines) || 0);
  const nowMs = Date.now();
  const identitySeedMeta = extractIdentitySeedMeta(loadIdentitySeed());

  const risk = classifyPatchRisk({ targetFiles, totalChangedLines }, policyJson);
  const retroProjection = computeRetroProjection({
    runtime: body.runtime || {},
    riskLevel: risk.riskLevel || 'low',
    identitySeedMeta
  });

  if (!risk.allowed) {
    return asJson(200, {
      ok: true,
      allowed: false,
      reason: 'risk_policy_rejected',
      risk,
      retroProjection,
      identitySeed: identitySeedMeta
    });
  }

  const github = getGithubConfig();
  let prs = [];
  try {
    prs = await listSelfPatchPrs({
      owner: github.owner,
      repo: github.repo,
      token: github.token,
      nowMs,
      fallbackRows: body.prs24h
    });
  } catch (error) {
    return asJson(502, {
      ok: false,
      error: 'GITHUB_PR_QUERY_FAILED',
      detail: String(error?.message || error)
    });
  }

  const windowState = computeProposalWindow({
    pullRequests: prs,
    nowMs,
    selfPatchLabel: policyJson.labels.selfpatch
  });
  const limits = getPolicyLimits();
  const budgetDecision = evaluateRateAndBudget({
    ...windowState,
    estimatedTokens,
    limits: {
      ...limits,
      latestProposalMs: windowState.latestProposalMs,
      nowMs
    }
  });
  if (!budgetDecision.allowed) {
    return asJson(200, {
      ok: true,
      allowed: false,
      reason: budgetDecision.reason,
      risk,
      limits,
      window: windowState,
      retroProjection,
      identitySeed: identitySeedMeta
    });
  }

  const riskLevel = risk.riskLevel;
  const requiresManualApproval = riskLevel === 'medium' || riskLevel === 'high';
  const sigmaPolicy = policyJson.sigma_policy || {};
  if (riskLevel === 'medium' && !sigmaPolicy.allowSigma2Manual) {
    return asJson(200, {
      ok: true,
      allowed: false,
      reason: 'sigma2_manual_disabled',
      risk,
      limits,
      window: windowState,
      retroProjection,
      identitySeed: identitySeedMeta
    });
  }
  if (riskLevel === 'low' && !sigmaPolicy.allowSigma1Auto) {
    return asJson(200, {
      ok: true,
      allowed: false,
      reason: 'sigma1_auto_disabled',
      risk,
      limits,
      window: windowState,
      retroProjection,
      identitySeed: identitySeedMeta
    });
  }

  return asJson(200, {
    ok: true,
    allowed: true,
    reason: 'within_limits',
    risk,
    limits,
    window: windowState,
    retroProjection,
    identitySeed: identitySeedMeta,
    decision: {
      riskLevel,
      requiresManualApproval,
      applyPath: riskLevel === 'low' ? 'auto_pr' : 'manual_pr',
      recommendedReasoning: retroProjection.recommendedReasoning,
      recommendedActions: retroProjection.recommendedActions
    }
  });
};

export default { handler };

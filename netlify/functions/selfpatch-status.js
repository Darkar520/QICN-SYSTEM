import policyJson from './lib/load-selfpatch-policy.js';
import { asJson, requireUser, envBool } from './lib/selfpatch-common.js';
import { computeProposalWindow } from './lib/selfpatch-governor.js';
import { listPullRequests, getRepoVariable } from './lib/github-client.js';
import fs from 'node:fs';
import path from 'node:path';

const IDENTITY_SEED_PATH = path.resolve(process.cwd(), 'sandbox', 'identity_manifest.seed.json');
const loadIdentitySeedMeta = () => {
  try {
    if (!fs.existsSync(IDENTITY_SEED_PATH)) {
      return {
        available: false,
        manifestVersion: 'none',
        id: 'none',
        attractorLabel: 'qicn_seed_unavailable'
      };
    }
    const parsed = JSON.parse(fs.readFileSync(IDENTITY_SEED_PATH, 'utf8'));
    return {
      available: true,
      manifestVersion: String(parsed?.manifestVersion || 'unknown'),
      id: String(parsed?.id || 'unknown'),
      attractorLabel: String(parsed?.identityAttractor?.label || parsed?.identitySeed?.name || 'unknown')
    };
  } catch {
    return {
      available: false,
      manifestVersion: 'invalid',
      id: 'invalid',
      attractorLabel: 'qicn_seed_invalid'
    };
  }
};

const githubConfig = () => ({
  owner: process.env.GITHUB_REPO_OWNER || '',
  repo: process.env.GITHUB_REPO_NAME || '',
  token: process.env.GITHUB_SELFPATCH_TOKEN || ''
});

const isPlaceholderSecret = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return true;
  return normalized.startsWith('tu_clave')
    || normalized.startsWith('your_')
    || normalized.startsWith('replace_')
    || normalized.includes('api_key_here')
    || normalized.includes('test_key')
    || normalized === 'changeme';
};

const codeGenerationConfig = () => {
  const providerRaw = String(process.env.SELF_PATCH_CODE_PROVIDER || 'openai').trim().toLowerCase();
  const provider = ['openai', 'gemini'].includes(providerRaw) ? providerRaw : 'openai';
  const model = provider === 'gemini'
    ? (process.env.GEMINI_MODEL_ID || 'gemini-3-flash-preview')
    : (process.env.SELF_PATCH_CODE_MODEL || 'gpt-5.3-codex');
  const configuredReasoning = String(process.env.SELF_PATCH_CODE_REASONING_EFFORT || 'high').trim().toLowerCase();
  const reasoningEffort = provider === 'openai'
    ? (configuredReasoning === 'auto' ? 'auto' : configuredReasoning)
    : '';
  const reasoningMode = provider === 'openai'
    ? (configuredReasoning === 'auto' ? 'auto_dynamic' : 'config_default')
    : 'n/a';
  const hasKey = provider === 'gemini'
    ? !isPlaceholderSecret((process.env.GEMINI_API_KEY || '').trim())
    : !isPlaceholderSecret((process.env.OPENAI_API_KEY || '').trim());
  return {
    provider,
    model,
    reasoningEffort,
    reasoningMode,
    dryRun: envBool('SELF_PATCH_GENERATION_DRY_RUN', true),
    allowClientCodexKey: envBool('ALLOW_CLIENT_CODEX_KEY', false),
    keyConfigured: hasKey
  };
};

export const handler = async (event, context) => {
  if (event.httpMethod !== 'GET') return asJson(405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  if (envBool('AUTH_REQUIRED', true) && !requireUser(event, context)) {
    return asJson(401, { ok: false, error: 'UNAUTHORIZED' });
  }

  const nowMs = Date.now();
  const github = githubConfig();
  const generation = codeGenerationConfig();
  const identitySeed = loadIdentitySeedMeta();
  const localApplyDefault = String(policyJson?.mode || '').toLowerCase() === 'sandbox_unrestricted';
  const localApplyEnabled = envBool('SELF_PATCH_LOCAL_APPLY', localApplyDefault);
  const hasGithubConfig = Boolean(github.owner && github.repo && github.token);
  if (!hasGithubConfig) {
    return asJson(200, {
      ok: true,
      configured: localApplyEnabled,
      mode: policyJson.mode,
      sigmaPolicy: policyJson.sigma_policy,
      codeGeneration: generation,
      identitySeed,
      applyMode: localApplyEnabled ? 'local_fs' : 'github_pr',
      localApplyEnabled,
      githubKillSwitch: process.env.QICN_KILLSWITCH || 'UNKNOWN',
      limits: policyJson.limits,
      window: {
        proposals24h: 0,
        inflight: 0,
        usedTokens24h: 0,
        latestProposalMs: 0
      },
      reason: localApplyEnabled ? 'local_apply_mode' : 'missing_github_configuration'
    });
  }

  try {
    const [prs, killSwitchVar] = await Promise.all([
      listPullRequests({ owner: github.owner, repo: github.repo, state: 'all', token: github.token }),
      getRepoVariable({
        owner: github.owner,
        repo: github.repo,
        name: 'QICN_KILLSWITCH',
        token: github.token
      }).catch(() => ({ value: 'UNKNOWN' }))
    ]);

    const windowState = computeProposalWindow({
      pullRequests: prs,
      nowMs,
      selfPatchLabel: policyJson.labels.selfpatch
    });

    return asJson(200, {
      ok: true,
      configured: true,
      mode: policyJson.mode,
      sigmaPolicy: policyJson.sigma_policy,
      codeGeneration: generation,
      identitySeed,
      quantumConfig: {
        endpoint: process.env.QUANTUM_ENTROPY_ENDPOINT || '/.netlify/functions/quantum-entropy',
        providerDefault: process.env.QUANTUM_PROVIDER_DEFAULT || 'custom',
        enabledByDefault: String(process.env.QUANTUM_ENTROPY_ENABLED || 'false').toLowerCase() === 'true'
      },
      limits: policyJson.limits,
      window: windowState,
      githubKillSwitch: killSwitchVar?.value || 'UNKNOWN',
      requiredChecks: policyJson.requiredChecks
    });
  } catch (error) {
    return asJson(500, {
      ok: false,
      error: 'STATUS_FAILED',
      detail: String(error?.message || error)
    });
  }
};

export default { handler };

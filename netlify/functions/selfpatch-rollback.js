import { asJson, requireUser, parseJsonBody, envBool } from './lib/selfpatch-common.js';

const GITHUB_API = 'https://api.github.com';
const NETLIFY_API = 'https://api.netlify.com/api/v1';

const githubHeaders = (token) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`,
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'qicn-selfpatch-rollback'
});

const netlifyHeaders = (token) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
});

const ensureOk = async (response, context) => {
  if (response.ok) return response;
  const detail = await response.text().catch(() => '');
  const error = new Error(`${context}: ${response.status} ${detail.slice(0, 300)}`);
  error.status = response.status;
  throw error;
};

const createRollbackPrFromBranch = async ({
  owner,
  repo,
  token,
  rollbackRef,
  title,
  body,
  fetchImpl = fetch
}) => {
  const repoResp = await fetchImpl(`${GITHUB_API}/repos/${owner}/${repo}`, {
    method: 'GET',
    headers: githubHeaders(token)
  });
  await ensureOk(repoResp, 'github_get_repo_failed');
  const repoMeta = await repoResp.json();
  const base = repoMeta?.default_branch || 'main';

  const prResp = await fetchImpl(`${GITHUB_API}/repos/${owner}/${repo}/pulls`, {
    method: 'POST',
    headers: githubHeaders(token),
    body: JSON.stringify({
      title: title || `[selfpatch rollback] ${rollbackRef}`,
      body: body || 'Automated rollback request.',
      head: rollbackRef,
      base
    })
  });
  await ensureOk(prResp, 'github_create_rollback_pr_failed');
  return prResp.json();
};

const restoreNetlifyDeploy = async ({
  siteId,
  deployId,
  token,
  fetchImpl = fetch
}) => {
  const response = await fetchImpl(`${NETLIFY_API}/sites/${siteId}/deploys/${deployId}/restore`, {
    method: 'POST',
    headers: netlifyHeaders(token)
  });
  await ensureOk(response, 'netlify_restore_failed');
  return response.json();
};

export const handler = async (event, context) => {
  if (event.httpMethod !== 'POST') return asJson(405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  if (envBool('AUTH_REQUIRED', true) && !requireUser(event, context)) {
    return asJson(401, { ok: false, error: 'UNAUTHORIZED' });
  }

  const parsed = parseJsonBody(event);
  if (!parsed.ok) return asJson(400, { ok: false, error: parsed.error });
  const body = parsed.body || {};

  const rollbackMode = String(process.env.QICN_NETLIFY_ROLLBACK_MODE || 'ui_only').toLowerCase();

  const owner = process.env.GITHUB_REPO_OWNER || '';
  const repo = process.env.GITHUB_REPO_NAME || '';
  const githubToken = process.env.GITHUB_SELFPATCH_TOKEN || '';

  let gitRollback = { attempted: false, success: false, mode: 'none' };
  if (owner && repo && githubToken && body.rollbackRef) {
    try {
      const pr = await createRollbackPrFromBranch({
        owner,
        repo,
        token: githubToken,
        rollbackRef: body.rollbackRef,
        title: body.rollbackTitle,
        body: body.rollbackBody
      });
      gitRollback = {
        attempted: true,
        success: true,
        mode: 'rollback_pr',
        prNumber: pr?.number,
        prUrl: pr?.html_url
      };
    } catch (error) {
      gitRollback = {
        attempted: true,
        success: false,
        mode: 'rollback_pr',
        error: String(error?.message || error)
      };
    }
  } else {
    gitRollback = {
      attempted: false,
      success: false,
      mode: 'not_configured',
      reason: 'missing_github_or_rollback_ref'
    };
  }

  let deployRollback = { attempted: false, success: false, mode: rollbackMode };
  if (rollbackMode === 'api') {
    const netlifyToken = process.env.NETLIFY_ROLLBACK_TOKEN || process.env.NETLIFY_TOKEN || '';
    const siteId = process.env.NETLIFY_SITE_ID || '';
    const deployId = body.deployId || '';
    if (!netlifyToken || !siteId || !deployId) {
      deployRollback = {
        attempted: false,
        success: false,
        mode: 'api',
        reason: 'missing_netlify_api_configuration'
      };
    } else {
      try {
        const restored = await restoreNetlifyDeploy({
          siteId,
          deployId,
          token: netlifyToken
        });
        deployRollback = {
          attempted: true,
          success: true,
          mode: 'api',
          deployId: restored?.id || deployId
        };
      } catch (error) {
        deployRollback = {
          attempted: true,
          success: false,
          mode: 'api',
          error: String(error?.message || error),
          fallback: 'ui_only'
        };
      }
    }
  } else {
    deployRollback = {
      attempted: false,
      success: false,
      mode: 'ui_only',
      reason: 'netlify_api_rollback_disabled_or_unavailable'
    };
  }

  return asJson(200, {
    ok: true,
    rollback: {
      git: gitRollback,
      deploy: deployRollback
    }
  });
};

export default { handler };

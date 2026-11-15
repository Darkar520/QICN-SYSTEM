import policyJson from './lib/load-selfpatch-policy.js';
import {
  asJson,
  requireUser,
  parseJsonBody,
  envBool
} from './lib/selfpatch-common.js';
import { classifyPatchRisk, isProtectedPath } from './lib/risk-classifier.js';
import { evaluateKillSwitchQuorum } from './lib/selfpatch-governor.js';
import { getRepo, getRepoVariable } from './lib/github-client.js';
import fs from 'node:fs';
import path from 'node:path';

const GITHUB_API = 'https://api.github.com';

const githubHeaders = (token) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`,
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'qicn-selfpatch'
});

const assertGithubOk = async (response, context) => {
  if (response.ok) return response;
  const body = await response.text().catch(() => '');
  const error = new Error(`${context}: ${response.status} ${body.slice(0, 400)}`);
  error.status = response.status;
  throw error;
};

const decodeB64 = (content) => Buffer.from(String(content || '').replace(/\n/g, ''), 'base64').toString('utf8');

const encodeB64 = (content) => Buffer.from(String(content || ''), 'utf8').toString('base64');

const applyEditOperation = (source, edit) => {
  const normalized = String(source || '').replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const start = Math.max(1, Number(edit.start_line) || 1);
  const end = Math.max(start, Number(edit.end_line) || start);
  const startIdx = Math.min(lines.length, start - 1);
  const endIdx = Math.min(lines.length - 1, end - 1);
  const replacementLines = edit.op === 'delete'
    ? []
    : String(edit.replacement || '').replace(/\r\n/g, '\n').split('\n');

  if (edit.op === 'insert') {
    lines.splice(startIdx, 0, ...replacementLines);
  } else {
    const deleteCount = Math.max(0, endIdx - startIdx + 1);
    lines.splice(startIdx, deleteCount, ...replacementLines);
  }
  return `${lines.join('\n')}${normalized.endsWith('\n') ? '\n' : ''}`;
};

const validPatchPath = (file) => {
  if (typeof file !== 'string' || !file.trim() || file.includes('\0') || /[:]/.test(file)) return false;
  const normalized = file.replace(/\\/g, '/');
  if (normalized.startsWith('/')) return false;
  const segments = normalized.split('/');
  if (segments.some((part) => !part || /[. ]$/.test(part))) return false;
  return !segments.some((part) => /^(?:\.git|\.env(?:\..*)?|\.netlify|node_modules)$/i.test(part));
};

const isWithinRoot = (root, target) => {
  const relative = path.relative(root, target);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
};

const safeLocalTarget = (projectRoot, relativePath) => {
  const absolutePath = path.resolve(projectRoot, relativePath);
  if (!isWithinRoot(projectRoot, absolutePath)) throw new Error('local_apply_path_escape');
  let ancestor = absolutePath;
  for (;;) {
    try {
      // lstat also detects dangling links; realpath below then fails closed.
      fs.lstatSync(ancestor);
      break;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      const parent = path.dirname(ancestor);
      if (parent === ancestor) throw error;
      ancestor = parent;
    }
  }
  if (!isWithinRoot(projectRoot, fs.realpathSync(ancestor))) throw new Error('local_apply_symlink_escape');
  return absolutePath;
};

const applyPatchLocally = ({ patch }) => {
  const projectRoot = fs.realpathSync(process.cwd());
  const backups = [];

  try {
    for (const edit of patch.edits) {
      const relativePath = String(edit.file || '').replace(/\\/g, '/').replace(/^\/+/, '');
      const absolutePath = safeLocalTarget(projectRoot, relativePath);

      const exists = fs.existsSync(absolutePath);
      if (!exists && edit.op !== 'insert') {
        throw new Error(`local_apply_missing_file:${relativePath}`);
      }
      const currentContent = exists ? fs.readFileSync(absolutePath, 'utf8') : '';
      if (!backups.find((entry) => entry.absolutePath === absolutePath)) {
        backups.push({ absolutePath, existed: exists, content: currentContent });
      }

      const nextContent = applyEditOperation(currentContent, edit);
      fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
      fs.writeFileSync(absolutePath, nextContent, 'utf8');
    }

    return {
      filesTouched: patch.edits.map((edit) => String(edit.file || '')),
      appliedAt: Date.now()
    };
  } catch (error) {
    for (const backup of backups.reverse()) {
      try {
        if (!backup.existed) {
          if (fs.existsSync(backup.absolutePath)) fs.unlinkSync(backup.absolutePath);
        } else {
          fs.writeFileSync(backup.absolutePath, backup.content, 'utf8');
        }
      } catch {
        // best effort rollback
      }
    }
    throw error;
  }
};

const readBlobKillSwitchState = async (fetchImpl = fetch) => {
  const url = process.env.QICN_BLOB_KILLSWITCH_URL || '';
  if (!url) return 'UNKNOWN';
  try {
    const response = await fetchImpl(url, { method: 'GET', signal: AbortSignal.timeout(5000) });
    if (!response.ok) return 'UNKNOWN';
    const payload = await response.json();
    return payload?.state || payload?.killswitch || 'UNKNOWN';
  } catch {
    return 'UNKNOWN';
  }
};

const readGithubKillSwitchState = async ({ owner, repo, token, fetchImpl = fetch }) => {
  if (!owner || !repo || !token) return 'UNKNOWN';
  try {
    const variable = await getRepoVariable({
      owner,
      repo,
      name: 'QICN_KILLSWITCH',
      token,
      fetchImpl: (url, options) => fetchImpl(url, { ...options, signal: AbortSignal.timeout(5000) })
    });
    return variable?.value || 'UNKNOWN';
  } catch {
    return 'UNKNOWN';
  }
};

const validatePatch = (patch) => {
  if (!patch || typeof patch !== 'object') return 'INVALID_PATCH';
  if (!Array.isArray(patch.edits) || patch.edits.length === 0) return 'INVALID_EDITS';
  for (const edit of patch.edits) {
    if (!edit || typeof edit !== 'object') return 'INVALID_EDIT_ENTRY';
    if (!validPatchPath(edit.file)) return 'INVALID_EDIT_FILE';
    if (!['replace', 'insert', 'delete'].includes(edit.op)) return 'INVALID_EDIT_OP';
    if (!Number.isFinite(Number(edit.start_line)) || !Number.isFinite(Number(edit.end_line))) {
      return 'INVALID_EDIT_LINES';
    }
    if (edit.op !== 'delete' && typeof edit.replacement !== 'string') return 'INVALID_EDIT_REPLACEMENT';
    if (isProtectedPath(edit.file, policyJson)) return 'PROTECTED_PATH_TOUCHED';
  }
  return null;
};

const createBranchAndPr = async ({
  owner,
  repo,
  token,
  patch,
  riskLevel,
  proposalId,
  approved,
  fetchImpl = fetch
}) => {
  const repoMeta = await getRepo({ owner, repo, token, fetchImpl });
  const baseBranch = repoMeta?.default_branch || 'main';

  const branchRefResp = await fetchImpl(
    `${GITHUB_API}/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(baseBranch)}`,
    { method: 'GET', headers: githubHeaders(token) }
  );
  await assertGithubOk(branchRefResp, 'github_get_base_ref_failed');
  const baseRefData = await branchRefResp.json();
  const baseSha = patch.base_commit || baseRefData?.object?.sha;
  if (!baseSha) throw new Error('missing_base_sha');

  const branchName = `selfpatch/${String(proposalId || Date.now()).replace(/[^a-zA-Z0-9._-]/g, '-')}`;
  const createRefResp = await fetchImpl(`${GITHUB_API}/repos/${owner}/${repo}/git/refs`, {
    method: 'POST',
    headers: githubHeaders(token),
    body: JSON.stringify({
      ref: `refs/heads/${branchName}`,
      sha: baseSha
    })
  });
  await assertGithubOk(createRefResp, 'github_create_branch_failed');

  for (const edit of patch.edits) {
    const contentResp = await fetchImpl(
      `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(edit.file)}?ref=${encodeURIComponent(branchName)}`,
      { method: 'GET', headers: githubHeaders(token) }
    );
    await assertGithubOk(contentResp, `github_get_content_failed:${edit.file}`);
    const fileData = await contentResp.json();
    if (String(fileData.sha) !== String(edit.base_sha) && String(edit.base_sha) !== 'unknown') {
      throw new Error(`base_sha_mismatch:${edit.file}`);
    }
    const currentContent = decodeB64(fileData.content);
    const nextContent = applyEditOperation(currentContent, edit);

    const updateResp = await fetchImpl(`${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(edit.file)}`, {
      method: 'PUT',
      headers: githubHeaders(token),
      body: JSON.stringify({
        message: `selfpatch(${riskLevel}): ${proposalId} -> ${edit.file}`,
        content: encodeB64(nextContent),
        sha: fileData.sha,
        branch: branchName
      })
    });
    await assertGithubOk(updateResp, `github_update_content_failed:${edit.file}`);
  }

  const prTitle = `[selfpatch/${riskLevel}] ${proposalId}`;
  const prBody = [
    `selfpatch: true`,
    `risk_level: ${riskLevel}`,
    `requires_manual_approval: ${riskLevel === 'medium' ? 'true' : 'false'}`,
    `approved: ${Boolean(approved)}`,
    `tokens_estimate: ${Number(patch.tokens_estimate || 0) || 0}`
  ].join('\n');

  const prResp = await fetchImpl(`${GITHUB_API}/repos/${owner}/${repo}/pulls`, {
    method: 'POST',
    headers: githubHeaders(token),
    body: JSON.stringify({
      title: prTitle,
      body: prBody,
      head: branchName,
      base: baseBranch
    })
  });
  await assertGithubOk(prResp, 'github_create_pr_failed');
  const prData = await prResp.json();

  await fetchImpl(`${GITHUB_API}/repos/${owner}/${repo}/issues/${prData.number}/labels`, {
    method: 'POST',
    headers: githubHeaders(token),
    body: JSON.stringify({
      labels: [
        policyJson.labels.selfpatch,
        riskLevel === 'low' ? policyJson.labels.riskLow : policyJson.labels.riskMedium
      ]
    })
  });

  return {
    branchName,
    baseBranch,
    prNumber: prData.number,
    prUrl: prData.html_url,
    prState: prData.state
  };
};

export const handler = async (event, context) => {
  if (event.httpMethod !== 'POST') return asJson(405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  if (envBool('AUTH_REQUIRED', true) && !requireUser(event, context)) {
    return asJson(401, { ok: false, error: 'UNAUTHORIZED' });
  }

  const parsed = parseJsonBody(event);
  if (!parsed.ok) return asJson(400, { ok: false, error: parsed.error });
  const body = parsed.body || {};
  const patch = body.patch;
  const validationError = validatePatch(patch);
  if (validationError) return asJson(400, { ok: false, error: validationError });

  const risk = classifyPatchRisk({
    targetFiles: patch.edits.map((edit) => edit.file),
    totalChangedLines: Number(body.totalChangedLines || 0)
  }, policyJson);
  if (!risk.allowed || risk.riskLevel === 'high') {
    return asJson(200, { ok: true, applied: false, reason: 'risk_policy_rejected', risk });
  }
  if (risk.riskLevel === 'medium' && !body.approved) {
    return asJson(200, { ok: true, applied: false, reason: 'manual_approval_required', risk });
  }

  const owner = process.env.GITHUB_REPO_OWNER || '';
  const repo = process.env.GITHUB_REPO_NAME || '';
  const token = process.env.GITHUB_SELFPATCH_TOKEN || '';
  const localApplyDefault = String(policyJson?.mode || '').toLowerCase() === 'sandbox_unrestricted';
  const localApplyEnabled = envBool('SELF_PATCH_LOCAL_APPLY', localApplyDefault);
  const hasGithubConfig = Boolean(owner && repo && token);
  if (!hasGithubConfig && !localApplyEnabled) {
    return asJson(500, { ok: false, error: 'MISSING_GITHUB_CONFIGURATION' });
  }

  // Phase-1 quorum check (entry).
  if (hasGithubConfig) {
    const blobStateStart = await readBlobKillSwitchState();
    const githubStateStart = await readGithubKillSwitchState({ owner, repo, token });
    const quorumStart = evaluateKillSwitchQuorum({
      blobState: blobStateStart,
      githubState: githubStateStart
    });
    if (!quorumStart.allowed) {
      return asJson(423, { ok: false, error: 'KILLSWITCH_BLOCKED', quorum: quorumStart });
    }
  } else {
    const localKillSwitch = String(process.env.QICN_KILLSWITCH || 'OFF').trim().toUpperCase();
    if (localKillSwitch === 'ON') {
      return asJson(423, {
        ok: false,
        error: 'KILLSWITCH_BLOCKED_LOCAL',
        detail: 'QICN_KILLSWITCH is ON'
      });
    }
  }

  const dryRunDefault = String(policyJson?.mode || '').toLowerCase() === 'sandbox_unrestricted' ? false : true;
  const dryRun = envBool('SELF_PATCH_APPLY_DRY_RUN', dryRunDefault);
  if (dryRun) {
    return asJson(200, {
      ok: true,
      applied: false,
      dryRun: true,
      reason: 'dry_run_enabled',
      risk
    });
  }

  // Phase-2 quorum check (just before GitHub write).
  if (hasGithubConfig) {
    const blobStatePreWrite = await readBlobKillSwitchState();
    const githubStatePreWrite = await readGithubKillSwitchState({ owner, repo, token });
    const quorumPreWrite = evaluateKillSwitchQuorum({
      blobState: blobStatePreWrite,
      githubState: githubStatePreWrite
    });
    if (!quorumPreWrite.allowed) {
      return asJson(423, { ok: false, error: 'KILLSWITCH_BLOCKED_PRE_WRITE', quorum: quorumPreWrite });
    }
  }

  try {
    if (!hasGithubConfig && localApplyEnabled) {
      const localResult = applyPatchLocally({ patch });
      const autoMergeDefault = String(policyJson?.mode || '').toLowerCase() === 'sandbox_unrestricted';
      const autoMergeEligible = risk.riskLevel === 'low'
        && envBool('SELF_PATCH_ENABLE_AUTO_MERGE', autoMergeDefault);
      return asJson(200, {
        ok: true,
        applied: true,
        dryRun: false,
        autoMergeEligible,
        risk,
        applyMode: 'local_fs',
        local: localResult
      });
    }

    const created = await createBranchAndPr({
      owner,
      repo,
      token,
      patch,
      riskLevel: risk.riskLevel,
      proposalId: body.proposalId || patch.proposal_id || `selfpatch-${Date.now()}`,
      approved: Boolean(body.approved)
    });

    const autoMergeDefault = String(policyJson?.mode || '').toLowerCase() === 'sandbox_unrestricted';
    const autoMergeEligible = risk.riskLevel === 'low'
      && envBool('SELF_PATCH_ENABLE_AUTO_MERGE', autoMergeDefault);

    return asJson(200, {
      ok: true,
      applied: true,
      dryRun: false,
      autoMergeEligible,
      risk,
      github: created
    });
  } catch (error) {
    return asJson(500, {
      ok: false,
      error: 'APPLY_FAILED',
      detail: String(error?.message || error)
    });
  }
};

export default { handler };

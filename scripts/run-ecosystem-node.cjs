const path = require('path');
const cp = require('child_process');
const fs = require('fs');

const [, , nodeScript, ...scriptArgs] = process.argv;

if (!nodeScript) {
  process.stderr.write('usage: node scripts/run-ecosystem-node.cjs <script> [args...]\n');
  process.exit(1);
}

const SYSTEM_ROOT = path.resolve(__dirname, '..');
const WORKSPACE_ROOT = path.resolve(SYSTEM_ROOT, '..');

const resolveReleaseRoot = () => {
  const envOverride = process.env.ECO_RELEASE_ROOT;
  if (envOverride) return path.resolve(envOverride);
  const candidates = [
    'qicn-framework-ordenado',
    path.join('qicn-framework-ordenado', 'rigid-identity-framework'),
    'QICN-RELEASE',
    'QUICN-RELEASE',
    'release_repo_qicn_2026-03-01'
  ];
  for (const candidate of candidates) {
    const target = path.join(WORKSPACE_ROOT, candidate);
    const looksLikeRepo = fs.existsSync(path.join(target, '.git'))
      || fs.existsSync(path.join(target, 'release', 'release_freeze_manifest.json'));
    if (looksLikeRepo) return target;
  }
  return path.join(WORKSPACE_ROOT, 'release_repo_qicn_2026-03-01');
};

const RELEASE_ROOT = resolveReleaseRoot();
const TARGET_SCRIPT = path.resolve(__dirname, nodeScript);

const git = (repoPath, args) => {
  const result = cp.spawnSync(
    'git',
    ['-c', `safe.directory=${repoPath}`, '-C', repoPath, ...args],
    { encoding: 'utf8' }
  );
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || `git failed: ${args.join(' ')}`).trim());
  }
  return String(result.stdout || '').trim();
};

const tryGit = (repoPath, args) => {
  try {
    return git(repoPath, args);
  } catch (_error) {
    return '';
  }
};

const setRepoEnv = (env, repoPath, prefix) => {
  const branch = git(repoPath, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const head = git(repoPath, ['rev-parse', 'HEAD']);
  const status = tryGit(repoPath, ['status', '--porcelain']);
  const upstream = tryGit(repoPath, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
  const upstreamHead = upstream ? tryGit(repoPath, ['rev-parse', '@{u}']) : '';
  const remote = upstream ? upstream.split('/')[0] : 'origin';
  const remoteUrl = tryGit(repoPath, ['config', '--get', `remote.${remote}.url`]);

  env[`${prefix}_BRANCH`] = branch;
  env[`${prefix}_HEAD`] = head;
  env[`${prefix}_UPSTREAM`] = upstream;
  env[`${prefix}_UPSTREAM_HEAD`] = upstreamHead;
  env[`${prefix}_REMOTE`] = remote;
  env[`${prefix}_REMOTE_URL`] = remoteUrl;
  env[`${prefix}_CLEAN`] = status ? 'false' : 'true';
  env[`${prefix}_PUSHED`] = upstreamHead && upstreamHead === head ? 'true' : 'false';
};

const env = { ...process.env, ECO_RELEASE_ROOT: RELEASE_ROOT };
setRepoEnv(env, SYSTEM_ROOT, 'ECO_SYSTEM');
setRepoEnv(env, RELEASE_ROOT, 'ECO_RELEASE');

const result = cp.spawnSync(
  process.execPath,
  [TARGET_SCRIPT, ...scriptArgs],
  { stdio: 'inherit', env }
);

if (result.error) {
  throw result.error;
}

process.exit(result.status === null ? 1 : result.status);

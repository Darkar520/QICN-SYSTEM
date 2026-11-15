import assert from 'node:assert/strict';
import { handler } from '../netlify/functions/selfpatch-apply.js';
const saved = { ...process.env };
const previousFetch = globalThis.fetch;
Object.assign(process.env, { AUTH_REQUIRED: 'false', SELF_PATCH_LOCAL_APPLY: 'true', SELF_PATCH_APPLY_DRY_RUN: 'true' });
for (const key of ['GITHUB_REPO_OWNER', 'GITHUB_REPO_NAME', 'GITHUB_SELFPATCH_TOKEN']) delete process.env[key];
const patchFor = (file) => ({ edits: [{ file, op: 'insert', start_line: 1, end_line: 1, replacement: 'synthetic' }] });
const invoke = (body) => handler({ httpMethod: 'POST', body: JSON.stringify(body) }, {});
try {
  for (const file of ['../workspace-sibling/file.js', '/absolute.js', 'C:\\outside.js', 'src/../../outside.js', '.git/config', '.env', 'src/../file.js']) {
    assert.equal((await invoke({ patch: patchFor(file) })).statusCode, 400, `invalid patch path: ${file}`);
  }
  assert.equal((await invoke({ patch: patchFor('src/safe-fixture.js') })).statusCode, 200, 'valid path reaches dry-run');
  Object.assign(process.env, {
    GITHUB_REPO_OWNER: 'fixture-owner', GITHUB_REPO_NAME: 'fixture-repo',
    GITHUB_SELFPATCH_TOKEN: 'synthetic-token', QICN_BLOB_KILLSWITCH_URL: 'https://fixture.invalid/killswitch'
  });
  let reads = 0;
  globalThis.fetch = async () => {
    reads++;
    return { ok: true, json: async () => ({ state: 'ON', value: 'ON' }) };
  };
  const response = await invoke({ patch: patchFor('src/safe-fixture.js'), blobKillSwitchState: 'OFF', githubKillSwitchState: 'OFF' });
  assert.equal(response.statusCode, 423, 'client-supplied OFF cannot override server kill switches');
  assert.ok(reads >= 2, 'both authoritative switches must be read');
  globalThis.fetch = async () => { throw new TypeError('fixture service unavailable'); };
  assert.equal((await invoke({ patch: patchFor('src/safe-fixture.js') })).statusCode, 423, 'unavailable switch state blocks writes');
} finally {
  globalThis.fetch = previousFetch;
  for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
  Object.assign(process.env, saved);
}
console.log('[selfpatch-trust-boundary] PASS');

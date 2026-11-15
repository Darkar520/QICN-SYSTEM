import assert from 'node:assert/strict';
import { handler as proxy } from '../netlify/functions/llm-proxy.js';
import { handler as introspection } from '../netlify/functions/auth-introspection.js';
import { requireUser } from '../netlify/functions/lib/selfpatch-common.js';

const previousAuth = process.env.AUTH_REQUIRED;
process.env.AUTH_REQUIRED = 'true';
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const forged = `${encode({ alg: 'none' })}.${encode({ sub: 'forged', exp: 9999999999 })}.sig`;
const user = { sub: 'verified-user', app_metadata: { roles: ['reviewer'] } };
try {
  for (const token of [forged, 'malformed', `${encode({})}.${encode({ sub: 'no-expiry' })}.sig`]) {
    const event = { httpMethod: 'POST', headers: { Authorization: `Bearer ${token}` }, body: '{}' };
    assert.equal((await proxy(event, {})).statusCode, 401, 'a decoded JWT is not authentication');
    assert.equal((await introspection({ ...event, httpMethod: 'GET' }, {})).statusCode, 401);
    assert.equal(requireUser(event, {}), null, 'selfpatch must reject the same forged identity');
  }
  for (const invalid of [{}, { exp: 9999999999 }, { sub: '' }, { sub: 'expired', exp: 1 }]) {
    assert.equal(requireUser({}, { clientContext: { user: invalid } }), null);
  }
  const context = { clientContext: { user } };
  assert.equal(requireUser({}, context), user);
  assert.equal((await proxy({ httpMethod: 'POST', body: '{}' }, context)).statusCode, 400);
  const response = await introspection({ httpMethod: 'GET' }, context);
  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).user.id, user.sub);
} finally {
  if (previousAuth === undefined) delete process.env.AUTH_REQUIRED;
  else process.env.AUTH_REQUIRED = previousAuth;
}
console.log('[server-auth-boundary] PASS');

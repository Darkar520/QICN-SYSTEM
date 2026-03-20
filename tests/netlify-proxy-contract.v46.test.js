const assert = (condition, message) => { if (!condition) throw new Error(message); };

const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
const fakeJwt = () => `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url({ sub: 'test', exp: Math.floor(Date.now()/1000) + 3600 })}.sig`;

(async () => {
  const { handler } = await import('../netlify/functions/llm-proxy.js');
  const previousAuthRequired = process.env.AUTH_REQUIRED;
  process.env.AUTH_REQUIRED = 'true';

  const methodNotAllowed = await handler({ httpMethod: 'GET', headers: {} }, {});
  const methodBody = JSON.parse(methodNotAllowed.body);
  assert(methodNotAllowed.statusCode === 405, 'GET should be rejected');
  assert(methodBody.error === 'METHOD_NOT_ALLOWED', 'GET must return METHOD_NOT_ALLOWED');

  const unauthorized = await handler({ httpMethod: 'POST', headers: {}, body: '{}' }, {});
  const unauthorizedBody = JSON.parse(unauthorized.body);
  assert(unauthorized.statusCode === 401, 'POST without auth should be rejected in private mode');
  assert(unauthorizedBody.error === 'UNAUTHORIZED', 'missing auth should return UNAUTHORIZED');

  const invalidSchema = await handler({
    httpMethod: 'POST',
    headers: { Authorization: `Bearer ${fakeJwt()}` },
    body: JSON.stringify({ provider: 'gemini' })
  }, {});
  const invalidSchemaBody = JSON.parse(invalidSchema.body);
  assert(invalidSchema.statusCode === 400, 'invalid schema should be 400');
  assert(invalidSchemaBody.error === 'INVALID_MODEL', 'schema validator should identify missing model first');

  process.env.AUTH_REQUIRED = previousAuthRequired;
  console.log('OK: netlify proxy contract tests passed');
})().catch((error) => {
  console.error('FAIL: netlify proxy contract tests failed:', error.message);
  process.exit(1);
});

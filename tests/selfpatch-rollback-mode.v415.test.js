import assert from 'node:assert/strict';

try {
  const { handler } = await import('../netlify/functions/selfpatch-rollback.js');

  const prevAuth = process.env.AUTH_REQUIRED;
  const prevMode = process.env.QICN_NETLIFY_ROLLBACK_MODE;
  process.env.AUTH_REQUIRED = 'false';
  process.env.QICN_NETLIFY_ROLLBACK_MODE = 'ui_only';

  const response = await handler({
    httpMethod: 'POST',
    headers: {},
    body: JSON.stringify({})
  }, {});

  const payload = JSON.parse(response.body);
  assert.equal(response.statusCode, 200, 'rollback endpoint should return 200');
  assert.equal(payload.ok, true, 'rollback payload should be ok');
  assert.equal(payload.rollback.deploy.mode, 'ui_only', 'deploy rollback mode should be ui_only');
  assert.equal(payload.rollback.deploy.reason, 'netlify_api_rollback_disabled_or_unavailable', 'unexpected deploy fallback reason');

  process.env.AUTH_REQUIRED = prevAuth;
  process.env.QICN_NETLIFY_ROLLBACK_MODE = prevMode;

  console.log('ok selfpatch-rollback-mode.v415');
} catch (error) {
  console.error('fail selfpatch-rollback-mode.v415:', error.message);
  process.exit(1);
}

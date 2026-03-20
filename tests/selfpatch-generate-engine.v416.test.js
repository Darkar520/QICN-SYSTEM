import assert from 'node:assert/strict';

const originalEnv = {
  AUTH_REQUIRED: process.env.AUTH_REQUIRED,
  SELF_PATCH_GENERATION_DRY_RUN: process.env.SELF_PATCH_GENERATION_DRY_RUN,
  SELF_PATCH_CODE_PROVIDER: process.env.SELF_PATCH_CODE_PROVIDER,
  SELF_PATCH_CODE_MODEL: process.env.SELF_PATCH_CODE_MODEL,
  SELF_PATCH_CODE_REASONING_EFFORT: process.env.SELF_PATCH_CODE_REASONING_EFFORT
};

const baseEventBody = {
  targetFiles: ['src/experimental/self_code/SelfPatchOrchestrator.js'],
  fileSnapshots: [{
    path: 'src/experimental/self_code/SelfPatchOrchestrator.js',
    sha: 'unknown',
    content: '// snapshot'
  }],
  objective: 'Ajustar trazabilidad de selfpatch en modo local.'
};

try {
  const { handler } = await import('../netlify/functions/selfpatch-generate.js');

  process.env.AUTH_REQUIRED = 'false';
  process.env.SELF_PATCH_GENERATION_DRY_RUN = 'true';
  process.env.SELF_PATCH_CODE_PROVIDER = 'openai';
  process.env.SELF_PATCH_CODE_MODEL = 'gpt-5.3-codex';
  process.env.SELF_PATCH_CODE_REASONING_EFFORT = 'xhigh';

  const okResp = await handler({
    httpMethod: 'POST',
    body: JSON.stringify(baseEventBody)
  }, {});
  const okPayload = JSON.parse(okResp.body);

  assert.equal(okResp.statusCode, 200, 'dry-run generation should return 200');
  assert.equal(okPayload.ok, true, 'dry-run response must be ok');
  assert.equal(okPayload.generated, true, 'dry-run response must mark generated=true');
  assert.equal(okPayload.dryRun, true, 'dry-run response must mark dryRun=true');
  assert.equal(okPayload.engine?.provider, 'openai', 'engine provider should match configured openai');
  assert.equal(okPayload.engine?.model, 'gpt-5.3-codex', 'engine model should match configured code model');
  assert.equal(okPayload.engine?.reasoningEffort, 'xhigh', 'engine reasoning effort should match configured value');
  assert.equal(okPayload.engine?.reasoningMode, 'config_default', 'engine reasoning mode should report env default when explicit');

  process.env.SELF_PATCH_CODE_REASONING_EFFORT = 'auto';
  const autoResp = await handler({
    httpMethod: 'POST',
    body: JSON.stringify({
      ...baseEventBody,
      targetFiles: ['src/experimental/self_code/SelfPatchOrchestrator.js'],
      totalChangedLines: 12
    })
  }, {});
  const autoPayload = JSON.parse(autoResp.body);
  assert.equal(autoResp.statusCode, 200, 'auto reasoning dry-run should return 200');
  assert.equal(autoPayload.engine?.reasoningMode, 'auto_dynamic', 'auto reasoning should report dynamic mode');
  assert.equal(autoPayload.engine?.reasoningEffort, 'high', 'small patch should respect high quality floor in auto mode');

  process.env.SELF_PATCH_CODE_PROVIDER = 'invalid-provider';
  const invalidResp = await handler({
    httpMethod: 'POST',
    body: JSON.stringify(baseEventBody)
  }, {});
  const invalidPayload = JSON.parse(invalidResp.body);
  assert.equal(invalidResp.statusCode, 400, 'invalid code provider must be rejected');
  assert.equal(invalidPayload.error, 'UNSUPPORTED_CODE_PROVIDER', 'must return unsupported provider error');

  console.log('ok selfpatch-generate-engine.v416');
} catch (error) {
  console.error('fail selfpatch-generate-engine.v416:', error.message);
  process.exit(1);
} finally {
  process.env.AUTH_REQUIRED = originalEnv.AUTH_REQUIRED;
  process.env.SELF_PATCH_GENERATION_DRY_RUN = originalEnv.SELF_PATCH_GENERATION_DRY_RUN;
  process.env.SELF_PATCH_CODE_PROVIDER = originalEnv.SELF_PATCH_CODE_PROVIDER;
  process.env.SELF_PATCH_CODE_MODEL = originalEnv.SELF_PATCH_CODE_MODEL;
  process.env.SELF_PATCH_CODE_REASONING_EFFORT = originalEnv.SELF_PATCH_CODE_REASONING_EFFORT;
}

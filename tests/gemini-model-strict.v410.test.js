import fs from 'fs';
import path from 'path';
import assert from 'node:assert/strict';

const runtimeEnvPath = path.resolve('src/config/runtimeEnv.js');
const indexPath = path.resolve('src/index.jsx');
const proxyPath = path.resolve('netlify/functions/llm-proxy.js');

const runtimeEnv = fs.readFileSync(runtimeEnvPath, 'utf8');
const indexContent = fs.readFileSync(indexPath, 'utf8');
const proxyContent = fs.readFileSync(proxyPath, 'utf8');

assert.ok(
  runtimeEnv.includes("GEMINI_MODEL_ID: getEnv('GEMINI_MODEL_ID', 'gemini-3-flash-preview')"),
  'runtimeEnv must default to gemini-3-flash-preview'
);
assert.ok(
  runtimeEnv.includes("GEMINI_STRICT_MODEL: asBool(getEnv('GEMINI_STRICT_MODEL'), true)"),
  'runtimeEnv must expose strict model flag'
);

assert.ok(indexContent.includes('const GEMINI_3_FLASH_MODEL_ID = \'gemini-3-flash-preview\''), 'index must pin Gemini 3 Flash model id');
assert.ok(indexContent.includes('const GEMINI_STRICT_MODEL = runtimeEnv.GEMINI_STRICT_MODEL !== false;'), 'index must read strict model flag');

assert.ok(proxyContent.includes('STRICT_MODEL_ENFORCED'), 'proxy must reject mismatched model when strict mode is active');
assert.ok(proxyContent.includes('const modelChain = isStrictModelEnabled()'), 'proxy must select model chain based on strict mode');
assert.ok(proxyContent.includes('? [enforcedModel]'), 'proxy strict mode must force enforced model only');

console.log('ok gemini-model-strict.v410');

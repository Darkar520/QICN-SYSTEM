import assert from 'node:assert/strict';
import { handler } from '../netlify/functions/llm-proxy.js';

const saved = { ...process.env };
const previousFetch = globalThis.fetch;
process.env.AUTH_REQUIRED = 'false';
process.env.GEMINI_API_KEY = 'synthetic-server-key';
process.env.GEMINI_STRICT_MODEL = 'true';
process.env.GEMINI_MODEL_ID = 'fixture-model';
process.env.INTEGRITY_THREAT_MODEL = 'C1';
let calls = 0;
const body = { provider: 'gemini', model: 'fixture-model', messages: [{ role: 'user', content: 'hello' }] };
const invoke = (input) => handler({ httpMethod: 'POST', body: JSON.stringify(input) }, {});
try {
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.ok(!String(url).includes('synthetic-server-key'), 'keys must not be in upstream URLs');
    assert.ok(options.signal instanceof AbortSignal, 'upstream needs a bounded deadline');
    assert.equal(JSON.parse(options.body).generationConfig.maxOutputTokens, 65536);
    return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'response' }] } }] }) };
  };
  assert.equal((await invoke({ ...body, maxTokens: 500000 })).statusCode, 200);
  assert.equal((await invoke({ ...body, rawPayload: { contents: [{ role: 'user', parts: [{ text: 'raw' }] }], generationConfig: { maxOutputTokens: 500000 } } })).statusCode, 200);
  for (const invalid of [null, {}, { role: 'user' }, { role: 'other', content: 'x' }]) {
    assert.equal((await invoke({ ...body, messages: [invalid] })).statusCode, 400);
  }
  assert.equal((await invoke({ ...body, rawPayload: { contents: [] } })).statusCode, 400);
  assert.equal((await invoke({ ...body, maxTokens: -1 })).statusCode, 400);
  assert.equal(calls, 2, 'invalid payloads cannot reach the upstream');
  globalThis.fetch = async () => { throw new DOMException('Timeout', 'TimeoutError'); };
  assert.equal((await invoke(body)).statusCode, 504);
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => { throw new DOMException('Timeout', 'TimeoutError'); } });
  assert.equal((await invoke(body)).statusCode, 504, 'deadline includes body decoding');
  globalThis.fetch = async () => { throw new TypeError('Network error'); };
  assert.equal((await invoke(body)).statusCode, 502);
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({}) });
  assert.equal((await invoke(body)).statusCode, 502, 'empty output cannot be reported as success');
} finally {
  globalThis.fetch = previousFetch;
  for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
  Object.assign(process.env, saved);
}
console.log('[llm-request-boundary] PASS');

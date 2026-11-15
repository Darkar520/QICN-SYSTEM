import assert from 'node:assert/strict';
import { getLlmRequestGuidance, requestGemini, robustFetchLLMResponse } from '../src/utils/llmTransport.js';
const previousFetch = globalThis.fetch;
try {
  globalThis.fetch = async (_url, options) => ({
    ok: true, status: 200,
    text: () => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
    })
  });
  await assert.rejects(robustFetchLLMResponse('/.netlify/functions/llm-proxy', {}, 15), /TIMEOUT/,
    'deadline must cover response body consumption');
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer synthetic-session');
    return { ok: true, status: 200, text: async () => JSON.stringify({
      ok: true, provider: 'gemini', model: 'actual-model', usedFallback: true,
      requestId: 'synthetic-request', content: 'response'
    }) };
  };
  const result = await robustFetchLLMResponse('/.netlify/functions/llm-proxy', {}, 1000, { authToken: 'synthetic-session' });
  assert.equal(result.qicnInference.model, 'actual-model');
  assert.equal(result.qicnInference.usedFallback, true);
  await assert.rejects(robustFetchLLMResponse('https://untrusted.example/.netlify/functions/llm-proxy', {}, 1000,
    { authToken: 'synthetic-session' }), /UNSUPPORTED_LLM_ENDPOINT/);
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.headers.Authorization, undefined, 'session tokens cannot reach a provider');
    assert.equal(options.headers['x-goog-api-key'], 'synthetic-key');
    return { ok: true, status: 200, text: async () => '{"candidates":[]}' };
  };
  await robustFetchLLMResponse('https://generativelanguage.googleapis.com/v1beta/test', {}, 1000,
    { authToken: 'synthetic-session', apiKey: 'synthetic-key' });

  const direct = 'https://generativelanguage.googleapis.com/v1beta/test';
  const proxy = '/.netlify/functions/llm-proxy';
  const attempts = [];
  const options = { authToken: 'synthetic-session', apiKey: 'synthetic-key', proxyFallback: proxy };
  globalThis.fetch = async (url, request) => {
    attempts.push(url);
    if (url === direct) throw new TypeError('Failed to fetch');
    assert.equal(request.headers['x-goog-api-key'], undefined);
    assert.equal(request.headers.Authorization, 'Bearer synthetic-session');
    assert.equal(JSON.parse(request.body).contextMeta.recoveredFrom, 'LLM_NETWORK');
    return { ok: true, status: 200, text: async () => '{"ok":true,"content":"Recuperado"}' };
  };
  const recovered = await requestGemini(direct, {}, 1000, options);
  assert.deepEqual(attempts, [direct, proxy], 'recover once through the server');
  assert.equal(recovered.qicnInference.transportFallback, true);
  assert.equal(recovered.candidates[0].content.parts[0].text, 'Recuperado');

  attempts.length = 0;
  globalThis.fetch = async (url) => {
    attempts.push(url);
    if (url === direct) throw new TypeError('Failed to fetch');
    return { ok: false, status: 401, text: async () => '{"error":"UNAUTHORIZED"}' };
  };
  await assert.rejects(requestGemini(direct, {}, 1000, options), (error) => {
    assert.equal(error.code, 'UNAUTHORIZED');
    assert.match(getLlmRequestGuidance(error), /sesión/);
    return true;
  });
  assert.deepEqual(attempts, [direct, proxy], 'do not repeat a rejected request');
} finally {
  globalThis.fetch = previousFetch;
}
console.log('[llm-transport-lifecycle] PASS');

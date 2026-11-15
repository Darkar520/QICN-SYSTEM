// Transient provider errors are retried after a short wait; daily quotas,
// credentials, bad requests and timeouts are not (2026-11-08).
import assert from 'node:assert/strict';
import { transientRetryDelayMs, TRANSIENT_RETRY_DELAYS_MS, LlmRequestError } from '../src/utils/llmTransport.js';

try {
  const e = (code, status, providerMessage = null) => new LlmRequestError(code, status, providerMessage);
  // Retried
  assert.equal(transientRetryDelayMs(e('HTTP_503', 503, 'This model is currently experiencing high demand.'), 0), TRANSIENT_RETRY_DELAYS_MS[0], 'CASE 1 FAIL: 503 high demand.');
  assert.equal(transientRetryDelayMs(e('HTTP_503', 503), 1), TRANSIENT_RETRY_DELAYS_MS[1], 'CASE 1 FAIL: second wait.');
  assert.equal(transientRetryDelayMs(e('HTTP_502', 502), 0), TRANSIENT_RETRY_DELAYS_MS[0], 'CASE 1 FAIL: 502.');
  assert.equal(transientRetryDelayMs(e('LLM_NETWORK', undefined), 0), TRANSIENT_RETRY_DELAYS_MS[0], 'CASE 1 FAIL: network.');
  assert.equal(transientRetryDelayMs(e('HTTP_429', 429, 'Resource exhausted. Please retry in 18.5s.'), 0), 18500, 'CASE 1 FAIL: per-minute 429 honors the hint.');
  // Bounded
  assert.equal(transientRetryDelayMs(e('HTTP_503', 503), TRANSIENT_RETRY_DELAYS_MS.length), null, 'CASE 2 FAIL: retries are bounded.');
  // Not retried
  assert.equal(transientRetryDelayMs(e('HTTP_429', 429, 'Quota exceeded for metric: generate_content_free_tier_requests, description: Generate content requests per day limit exceeded on Free Tier. Please retry in 15h59m.'), 0), null, 'CASE 3 FAIL: daily quota.');
  assert.equal(transientRetryDelayMs(e('HTTP_429', 429, 'Please retry in 120s.'), 0), null, 'CASE 3 FAIL: long hint.');
  assert.equal(transientRetryDelayMs(e('LLM_API_KEY_INVALID_401', 401), 0), null, 'CASE 3 FAIL: credentials.');
  assert.equal(transientRetryDelayMs(e('HTTP_400', 400), 0), null, 'CASE 3 FAIL: bad request.');
  assert.equal(transientRetryDelayMs(e('LLM_TIMEOUT', undefined), 0), null, 'CASE 3 FAIL: timeout.');
  assert.equal(transientRetryDelayMs(e('HTTP_504', 504), 0), null, 'CASE 3 FAIL: gateway timeout.');
  console.log('OK: llm transient retry v1 test passed');
} catch (error) {
  console.error('FAIL: llm transient retry v1 test failed:', error.message);
  process.exit(1);
}

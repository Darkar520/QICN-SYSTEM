// claim_scope: internal_runtime_engineering
// evidence_scope: internal_support_only
// interpretation_boundary: Frente 3 Pillar B verification (C2 end-to-end JSON + Sistema B v5 compatibility, non-strict 503 fallback, error taxonomy, tamper negative controls).
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  LlmRequestError,
  classifyLlmError,
  getLlmRequestGuidance,
  robustFetchLLMResponse,
  stripC2EchoBlock
} from '../src/utils/llmTransport.js';
import { prepareEvidential, evidentialReply, factAtom } from './fixtures/evidentialFixtures.mjs';
import { evaluateEvidential } from '../src/language/evidential/realization.js';

const extractC2Block = (systemText) => {
  const match = String(systemText || '').match(/\[C2_INTEGRITY_ECHO_BEGIN\][\s\S]*?\[C2_INTEGRITY_ECHO_END\]/);
  assert.ok(match, 'C2 echo block missing from systemInstruction');
  return match[0];
};

const previousEnv = {
  AUTH_REQUIRED: process.env.AUTH_REQUIRED,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL_ID: process.env.GEMINI_MODEL_ID,
  GEMINI_STRICT_MODEL: process.env.GEMINI_STRICT_MODEL,
  INTEGRITY_THREAT_MODEL: process.env.INTEGRITY_THREAT_MODEL,
  INTEGRITY_HMAC_SECRET: process.env.INTEGRITY_HMAC_SECRET
};
const previousFetch = globalThis.fetch;

try {
  process.env.AUTH_REQUIRED = 'false';
  process.env.GEMINI_API_KEY = 'synthetic-server-key';
  process.env.GEMINI_MODEL_ID = 'gemini-3-flash-preview';
  process.env.GEMINI_STRICT_MODEL = 'true';
  process.env.INTEGRITY_THREAT_MODEL = 'C2';
  process.env.INTEGRITY_HMAC_SECRET = 'frente3-c2-secret';

  const { handler } = await import('../netlify/functions/llm-proxy.js');

  const prepared = prepareEvidential();
  const validReplyObj = evidentialReply(prepared, {
    atoms: [factAtom(prepared, 'ccc_now', 'metric_value', { ref: 'metrics.ccc' })]
  });
  const validReplyJson = JSON.stringify(validReplyObj);

  const envelope = {
    packet: { tick: prepared.snapshot.tick, versionHash: 'qicn-f3', configHash: prepared.snapshot.configHash },
    nonce: 'nonce_f3_001',
    requestId: 'req_f3_001',
    runId: 'run_f3_001',
    versionHash: 'qicn-f3',
    configHash: prepared.snapshot.configHash,
    threatModelRequested: 'C2'
  };

  // CASE 1: C2 + responseMimeType:'application/json' end-to-end round-trip into Sistema B v5
  let upstreamPayloadSeen = null;
  const mockUpstreamGemini = async (_url, opts) => {
    upstreamPayloadSeen = JSON.parse(String(opts?.body || '{}'));
    const systemText = upstreamPayloadSeen?.systemInstruction?.parts?.[0]?.text || '';
    const c2Block = extractC2Block(systemText);
    return {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: `${validReplyJson}\n\n${c2Block}` }] } }],
        usageMetadata: { totalTokenCount: 256 }
      })
    };
  };

  // Bridge browser llmTransport fetch -> netlify llm-proxy handler -> mock upstream Gemini
  globalThis.fetch = async (url, opts) => {
    if (String(url).includes('/.netlify/functions/llm-proxy')) {
      const saved = globalThis.fetch;
      globalThis.fetch = mockUpstreamGemini;
      try {
        const res = await handler({ httpMethod: 'POST', headers: {}, body: opts.body }, {});
        return {
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          text: async () => res.body
        };
      } finally {
        globalThis.fetch = saved;
      }
    }
    return mockUpstreamGemini(url, opts);
  };

  const clientPayload = {
    contents: [{ role: 'user', parts: [{ text: '¿Cuál es tu estado actual?' }] }],
    systemInstruction: { parts: [{ text: prepared.prompt }] },
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json'
    }
  };

  const transportRes = await robustFetchLLMResponse('/.netlify/functions/llm-proxy', clientPayload, 5000, {
    integrityEnvelope: envelope
  });

  assert.equal(upstreamPayloadSeen.generationConfig.responseMimeType, undefined, 'C2 mode must omit strict responseMimeType upstream so Gemini can append C2 echo markers');
  assert.equal(transportRes.qicnInference.integrityThreatModel, 'C2');
  assert.equal(transportRes.qicnInference.c2Verified, true);
  assert.ok(transportRes.qicnInference.integrityVerification?.signaturePrefix?.length === 16);

  const candidateText = transportRes.candidates[0].content.parts[0].text;
  assert.ok(!candidateText.includes('[C2_INTEGRITY_ECHO_BEGIN]'), 'cleanContent must strip verified C2 block before Sistema B v5 JSON parsing');
  const v5Eval = evaluateEvidential(prepared.evidentialContext, candidateText, prepared.proseContext);
  assert.equal(v5Eval.ok, true, `Sistema B v5 verification failed on C2 cleanContent: ${JSON.stringify(v5Eval.verification?.discrepancies || v5Eval.error)}`);

  // CASE 2: Negative control — forged C2 echo rejected with 422 C2_INTEGRITY_REJECTED
  const mockForgedGemini = async (_url, opts) => {
    const p = JSON.parse(String(opts?.body || '{}'));
    const c2Block = extractC2Block(p?.systemInstruction?.parts?.[0]?.text || '');
    const forgedSig = crypto.createHash('sha256').update('tampered').digest('hex');
    const forgedBlock = c2Block.replace(/C2_INTEGRITY_SIGNATURE:\s*[0-9a-fA-F]{64}/, `C2_INTEGRITY_SIGNATURE: ${forgedSig}`);
    return {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: `${validReplyJson}\n\n${forgedBlock}` }] } }]
      })
    };
  };
  globalThis.fetch = async (url, opts) => {
    if (String(url).includes('/.netlify/functions/llm-proxy')) {
      const saved = globalThis.fetch;
      globalThis.fetch = mockForgedGemini;
      try {
        const res = await handler({ httpMethod: 'POST', headers: {}, body: opts.body }, {});
        return { ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, text: async () => res.body };
      } finally {
        globalThis.fetch = saved;
      }
    }
    return mockForgedGemini(url, opts);
  };
  await assert.rejects(
    robustFetchLLMResponse('/.netlify/functions/llm-proxy', clientPayload, 5000, { integrityEnvelope: envelope }),
    (err) => {
      assert.equal(err.code, 'C2_INTEGRITY_REJECTED');
      assert.equal(err.status, 422);
      const cls = classifyLlmError(err);
      assert.equal(cls.category, 'c2_integrity_error');
      assert.equal(cls.retryable, false);
      assert.match(getLlmRequestGuidance(err), /C2/);
      return true;
    }
  );

  // CASE 3: Non-strict 503 fallback vs strict mode enforcement
  process.env.INTEGRITY_THREAT_MODEL = 'C1';
  process.env.GEMINI_STRICT_MODEL = 'false';
  const calledModels = [];
  globalThis.fetch = async (url) => {
    calledModels.push(String(url));
    if (String(url).includes('gemini-3-flash-preview')) {
      return { ok: false, status: 503, json: async () => ({ error: { message: 'High demand' } }) };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'fallback ok' }] } }] })
    };
  };
  const fallbackRes = await handler({
    httpMethod: 'POST',
    headers: {},
    body: JSON.stringify({ provider: 'gemini', model: 'gemini-3-flash-preview', messages: [{ role: 'user', content: 'hi' }] })
  }, {});
  const fallbackBody = JSON.parse(fallbackRes.body);
  assert.equal(fallbackRes.statusCode, 200);
  assert.equal(fallbackBody.usedFallback, true);
  assert.equal(fallbackBody.model, 'gemini-2.5-flash');
  assert.equal(calledModels.length, 2);

  // Strict mode MUST NOT fall back on 503
  process.env.GEMINI_STRICT_MODEL = 'true';
  calledModels.length = 0;
  const strictRes = await handler({
    httpMethod: 'POST',
    headers: {},
    body: JSON.stringify({ provider: 'gemini', model: 'gemini-3-flash-preview', messages: [{ role: 'user', content: 'hi' }] })
  }, {});
  assert.equal(strictRes.statusCode, 503);
  assert.equal(calledModels.length, 1);

  // CASE 3B: [B-3] Non-strict 503 fallback when upstream returns non-JSON HTML error body (no SyntaxError abort)
  process.env.GEMINI_STRICT_MODEL = 'false';
  calledModels.length = 0;
  globalThis.fetch = async (url) => {
    calledModels.push(String(url));
    if (String(url).includes('gemini-3-flash-preview')) {
      return {
        ok: false,
        status: 503,
        text: async () => '<!DOCTYPE html><html><body>503 Service Temporarily Unavailable</body></html>',
        json: async () => { throw new SyntaxError('Unexpected token < in JSON at position 0'); }
      };
    }
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ candidates: [{ content: { parts: [{ text: 'html 503 fallback ok' }] } }] })
    };
  };
  const htmlFallbackRes = await handler({
    httpMethod: 'POST',
    headers: {},
    body: JSON.stringify({ provider: 'gemini', model: 'gemini-3-flash-preview', messages: [{ role: 'user', content: 'hi' }] })
  }, {});
  const htmlFallbackBody = JSON.parse(htmlFallbackRes.body);
  assert.equal(htmlFallbackRes.statusCode, 200);
  assert.equal(htmlFallbackBody.usedFallback, true);
  assert.equal(htmlFallbackBody.model, 'gemini-2.5-flash');
  assert.equal(htmlFallbackBody.content, 'html 503 fallback ok');
  assert.equal(calledModels.length, 2);

  // CASE 4: stripC2EchoBlock + classifyLlmError matrix
  assert.equal(stripC2EchoBlock('{"ok":1}\n[C2_INTEGRITY_ECHO_BEGIN]\nsig\n[C2_INTEGRITY_ECHO_END]\n'), '{"ok":1}');
  assert.equal(classifyLlmError(new LlmRequestError('HTTP_429', 429, 'requests per day exceeded')).category, 'quota_exhausted_daily');
  assert.equal(classifyLlmError(new LlmRequestError('HTTP_429', 429, 'requests per day exceeded')).retryable, false);
  assert.equal(classifyLlmError(new LlmRequestError('HTTP_429', 429, 'retry in 5s')).retryable, true);
  assert.equal(classifyLlmError(new LlmRequestError('HTTP_503', 503)).category, 'upstream_5xx');
  assert.equal(classifyLlmError(new LlmRequestError('LLM_TIMEOUT')).category, 'network_timeout');
  assert.equal(classifyLlmError(new LlmRequestError('UNAUTHORIZED', 401)).category, 'auth_invalid');

  console.log('OK: frente3-llm-c2-resilience.v1 passed (C2 JSON+Sistema B v5 round-trip, tamper 422 control, non-strict 503 fallback, strict guard, error taxonomy)');
} finally {
  globalThis.fetch = previousFetch;
  Object.entries(previousEnv).forEach(([k, v]) => {
    if (typeof v === 'undefined') delete process.env[k];
    else process.env[k] = v;
  });
}

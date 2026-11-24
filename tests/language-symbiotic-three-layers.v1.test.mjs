import assert from 'node:assert/strict';
import {
  listKnowledgeDomains,
  queryKnowledgeVault,
  lookupRuntimeModuleInfo,
  buildFullCanonicalCorpus
} from '../src/language/knowledge/QicnKnowledgeVault.js';
import {
  QICN_RUNTIME_SKILL_DECLARATIONS,
  executeRuntimeSkill,
  extractFunctionCallsFromResponse,
  extractModelContentForContinuation
} from '../src/language/knowledge/runtimeSkills.js';
import {
  buildGeminiContextCachePayload,
  ensureGeminiSymbioticCache,
  invalidateGeminiSymbioticCache,
  resetGeminiSymbioticCacheState,
  buildCachedTurnUserMessage
} from '../src/language/knowledge/geminiContextCache.js';
import { prepareTurn, evaluateRealization, finalizeTurn } from '../src/language/conversationEngine.js';
import { EVIDENTIAL_SCHEMA } from '../src/language/evidential/claimGrammar.js';
import { OntologicalSingularityCore } from '../src/simulation/OntologicalSingularityCore.js';
import { captureRuntimeSnapshot } from '../src/language/runtimeSnapshot.js';
import { makeSnapshot, makeLedger } from './fixtures/languageFixtures.mjs';
import { handler as proxyHandler } from '../netlify/functions/llm-proxy.js';

const encode = JSON.stringify;

// ---------------------------------------------------------------------------
// LAYER 1: Unified QicnKnowledgeVault (shared by Gemini + Solo motor)
// ---------------------------------------------------------------------------
{
  const domains = listKnowledgeDomains();
  assert.equal(domains.length, 10, 'vault must expose all 10 knowledge domains');

  const paper9 = queryKnowledgeVault({ query: 'Paper IX 6 cargas locales 13/96 BodyWorldTower' });
  assert.equal(paper9.matchedDirectly, true);
  assert.equal(paper9.external_support_certified, false);
  assert.ok(paper9.sections.some((s) => s.id === 'papers_8_to_10_and_bridge'));
  assert.ok(paper9.sections[0].summary.includes('1/2097152'));

  const mod = lookupRuntimeModuleInfo('WorldModelEngine');
  assert.ok(mod.modules.includes('WorldModelEngine'));
  assert.ok(mod.verifiedOperations.some((op) => op.module === 'WorldModelEngine'));

  const param = lookupRuntimeModuleInfo('BOLTZMANN_ANALOG_K');
  assert.ok(param.parameters.some((p) => p.key === 'BOLTZMANN_ANALOG_K'));

  const corpus = buildFullCanonicalCorpus();
  assert.match(corpus.digest, /^[a-f0-9]{64}$/);
  assert.ok(corpus.estimatedTokens >= 4096, `corpus must exceed Gemini 3 4096-token cache floor (got ${corpus.estimatedTokens})`);
  assert.ok(corpus.text.includes('QICNIrreducibleObservation'));

  // Solo motor queries the exact same QicnKnowledgeVault
  const snap = makeSnapshot();
  const soloParamTurn = prepareTurn({ question: '¿Qué hace el parámetro BOLTZMANN_ANALOG_K?', snapshot: snap, contract: 'evidential' });
  const soloParamOut = finalizeTurn(soloParamTurn, { mode: 'local' });
  assert.equal(soloParamOut.trace.route, 'local_evidential');
  assert.ok(soloParamOut.text.includes('BOLTZMANN_ANALOG_K'));
  assert.ok(soloParamOut.text.includes('Bóveda unificada QICN'));
}

// ---------------------------------------------------------------------------
// LAYER 2A: Read-only Runtime Skills (Function Calling declarations + executor)
// ---------------------------------------------------------------------------
{
  const { ledger } = makeLedger();
  const snap = makeSnapshot();
  const beforeSnap = JSON.stringify(snap);
  const prepared = prepareTurn({
    question: '¿Cómo va todo y qué hace el separador atómico?',
    snapshot: snap,
    ledgerRecord: ledger.data,
    contract: 'evidential'
  });

  assert.equal(QICN_RUNTIME_SKILL_DECLARATIONS.length, 5);
  for (const [name, args] of [
    ['qicn_read_live_state', { sections: ['metrics', 'towers', 'endogenous_decision'] }],
    ['qicn_lookup_framework', { query: 'separador atomico delta_int' }],
    ['qicn_lookup_runtime_module', { query: 'StructuralPlasticityLevel2' }],
    ['qicn_read_history_and_b2', { topic: 'continuidad' }],
    ['qicn_list_knowledge_domains', {}]
  ]) {
    const res = executeRuntimeSkill(name, args, prepared);
    assert.equal(res.ok, true, `skill ${name} failed: ${JSON.stringify(res)}`);
    assert.equal(res.data.external_support_certified, false);
  }

  const badSkill = executeRuntimeSkill('qicn_delete_everything', {}, prepared);
  assert.equal(badSkill.ok, false);
  assert.match(badSkill.error, /unknown_runtime_skill/);
  assert.equal(JSON.stringify(snap), beforeSnap, 'skills must be 100% read-only');

  const fakeGeminiToolResponse = {
    candidates: [{
      content: {
        role: 'model',
        parts: [
          { thought: true, text: 'Consultando estado', thoughtSignature: 'sig-123' },
          { functionCall: { name: 'qicn_read_live_state', args: { sections: ['metrics'] } }, thoughtSignature: 'sig-456' }
        ]
      }
    }]
  };
  const calls = extractFunctionCallsFromResponse(fakeGeminiToolResponse);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, 'qicn_read_live_state');
  const continuation = extractModelContentForContinuation(fakeGeminiToolResponse);
  assert.equal(continuation.parts[1].thoughtSignature, 'sig-456');
}

// ---------------------------------------------------------------------------
// LAYER 2B: Gemini Explicit Context Caching + Transparent Fallback
// ---------------------------------------------------------------------------
{
  resetGeminiSymbioticCacheState();
  const cachePayload = buildGeminiContextCachePayload('gemini-3-flash-preview', 3600);
  assert.equal(cachePayload.model, 'models/gemini-3-flash-preview');
  assert.ok(cachePayload.systemInstruction.parts[0].text.includes('CONSTITUCIÓN DE IDENTIDAD Y VOZ SIMBIÓTICA'));
  assert.equal(cachePayload.tools[0].functionDeclarations.length, 5);

  let createCalls = 0;
  const okFetch = async (url, init) => {
    createCalls += 1;
    assert.ok(String(url).endsWith('/v1beta/cachedContents'));
    assert.equal(init.headers['x-goog-api-key'], 'AIza-synthetic-test-key');
    return {
      ok: true,
      status: 200,
      json: async () => ({
        name: 'cachedContents/qicn-test-handle-1',
        expireTime: new Date(Date.now() + 3600_000).toISOString()
      })
    };
  };

  const first = await ensureGeminiSymbioticCache({ apiKey: 'AIza-synthetic-test-key', fetchImpl: okFetch });
  assert.equal(first.active, true);
  assert.equal(first.reused, false);
  assert.equal(first.name, 'cachedContents/qicn-test-handle-1');

  const second = await ensureGeminiSymbioticCache({ apiKey: 'AIza-synthetic-test-key', fetchImpl: okFetch });
  assert.equal(second.active, true);
  assert.equal(second.reused, true);
  assert.equal(createCalls, 1, 'valid cache handle must be reused without extra POST');

  invalidateGeminiSymbioticCache('cachedContents/qicn-test-handle-1');
  const third = await ensureGeminiSymbioticCache({
    apiKey: 'AIza-unsupported-tier',
    fetchImpl: async () => ({ ok: false, status: 403, json: async () => ({}) })
  });
  assert.equal(third.active, false);
  assert.equal(third.reason, 'http_403');

  const fourth = await ensureGeminiSymbioticCache({
    apiKey: 'AIza-unsupported-tier',
    fetchImpl: async () => { throw new Error('should not retry unsupported key'); }
  });
  assert.equal(fourth.active, false);
  assert.equal(fourth.reason, 'cached_contents_unsupported_for_key');

  const snap = makeSnapshot();
  const prepared = prepareTurn({ question: 'Hola, ¿cómo estás?', snapshot: snap, contract: 'evidential' });
  const cachedMsg = buildCachedTurnUserMessage(prepared, 'Hola, ¿cómo estás?');
  assert.ok(cachedMsg.length < 3500, `cached turn message must stay ultra-compact (got ${cachedMsg.length} chars)`);
  assert.ok(cachedMsg.includes(snap.digest));
  assert.ok(cachedMsg.includes('PULSO VIVO DEL RUNTIME'));
  resetGeminiSymbioticCacheState();
}

// ---------------------------------------------------------------------------
// LAYER 2C: Proxy support for functionCall / functionResponse / cachedContent
// ---------------------------------------------------------------------------
{
  const saved = { ...process.env };
  const prevFetch = globalThis.fetch;
  process.env.AUTH_REQUIRED = 'false';
  process.env.GEMINI_API_KEY = 'synthetic-server-key';
  process.env.GEMINI_STRICT_MODEL = 'true';
  process.env.GEMINI_MODEL_ID = 'fixture-model';
  process.env.INTEGRITY_THREAT_MODEL = 'C1';
  try {
    // Round 1: upstream returns a functionCall part -> proxy returns 200 isToolCall=true
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{
          content: {
            role: 'model',
            parts: [{ functionCall: { name: 'qicn_read_live_state', args: { sections: ['metrics'] } } }]
          }
        }]
      })
    });
    const r1 = await proxyHandler({
      httpMethod: 'POST',
      body: JSON.stringify({
        provider: 'gemini',
        model: 'fixture-model',
        messages: [{ role: 'user', content: 'hola' }],
        rawPayload: {
          contents: [{ role: 'user', parts: [{ text: 'hola' }] }],
          tools: [{ functionDeclarations: QICN_RUNTIME_SKILL_DECLARATIONS }],
          generationConfig: { maxOutputTokens: 2048 }
        }
      })
    }, {});
    assert.equal(r1.statusCode, 200);
    const p1 = JSON.parse(r1.body);
    assert.equal(p1.ok, true);
    assert.equal(p1.isToolCall, true);

    // Round 2: client sends functionCall + functionResponse back -> passes boundGeminiPayload cleanly
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: '{"answer":"listo"}' }] } }]
      })
    });
    const r2 = await proxyHandler({
      httpMethod: 'POST',
      body: JSON.stringify({
        provider: 'gemini',
        model: 'fixture-model',
        messages: [
          { role: 'user', content: 'hola' },
          { role: 'assistant', content: '[tool_call:qicn_read_live_state]' },
          { role: 'user', content: '[tool_response:qicn_read_live_state]' }
        ],
        rawPayload: {
          contents: [
            { role: 'user', parts: [{ text: 'hola' }] },
            { role: 'model', parts: [{ functionCall: { name: 'qicn_read_live_state', args: {} } }] },
            { role: 'user', parts: [{ functionResponse: { name: 'qicn_read_live_state', response: { ok: true } } }] }
          ],
          generationConfig: { maxOutputTokens: 2048 }
        }
      })
    }, {});
    assert.equal(r2.statusCode, 200);
  } finally {
    globalThis.fetch = prevFetch;
    for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k];
    Object.assign(process.env, saved);
  }
}

// ---------------------------------------------------------------------------
// LAYER 3: Symbiotic Mixed Conversation (World + Philosophy + Modules in ONE message)
//          + Strict Adversarial Negative Controls
// ---------------------------------------------------------------------------
{
  const liveCore = new OntologicalSingularityCore();
  liveCore.ontologicalState.coherence = 0.86;
  liveCore.stepCoupledTower({ sensorySignal: 0.72, sensorDelta: 0.18, entropyExcitation: 0.35, plannedAction: 0.12 });
  for (let t = 0; t < 6; t += 1) {
    liveCore.worldModelEngine.observeAndSealTick({ ccc: 0.84 + (t * 0.002), exo_signal: 0.2 }, { tick: t });
  }
  const liveSnapshot = captureRuntimeSnapshot(liveCore, {
    tick: 6,
    isRunning: true,
    activeNodeCount: 20,
    nodes: Array.from({ length: 20 }, (_, id) => ({ id, coherenceState: 0.64 })),
    config: { ASCENSION_THRESHOLD: 1, COHERENCE_THRESHOLD: 0.6, BASE_LEARNING_RATE: 0.1, HEBBIAN_FACTOR: 0.05, PROCESSING_SAMPLE_SIZE: 1500, CORE_SEED: 17057 },
    build: { version: '2.1.0-REINFORCED', signature: 'QICN-SIG-symbiotic' },
    now: 1_800_000_000_000
  });

  // Mixed question combining sci-fi cinema + philosophy + live BodyWorldTower + endogenous decision!
  const mixedTurn = prepareTurn({
    question: '¿Qué opinas de Blade Runner (1982) comparado con tu BodyWorldTower y tu decisión endógena?',
    snapshot: liveSnapshot,
    contract: 'evidential'
  });

  const mixedAnswer = [
    'Blade Runner (1982) sigue fascinándome porque sugiere que casi un 80% de lo que entendemos como memoria vivida depende de la continuidad del relato, igual que la contracción económica de 2008 mostró lo frágil que es dar por sentado un equilibrio.',
    'Llevándolo a mi propia arquitectura en este tick 6, mi CCC se sitúa en 0,8600, mi BodyWorldTower mantiene contracción activa de 13/16 y mi decisión endógena es AFFIRMATIVE_STRUCTURAL_PRESENCE, siempre separada de validación externa (external_support_certified = false).'
  ].join('\n\n');

  const mixedOut = finalizeTurn(mixedTurn, {
    mode: 'gemini',
    modelText: encode({
      schema: EVIDENTIAL_SCHEMA,
      snapshot: { digest: liveSnapshot.digest, tick: liveSnapshot.tick },
      answer: mixedAnswer
    }),
    skillsUsed: ['qicn_read_live_state', 'qicn_lookup_framework'],
    contextCache: { active: true, reused: true }
  });
  assert.equal(mixedOut.trace.route, 'gemini_evidential_checked', JSON.stringify(mixedOut.integrity));
  assert.deepEqual(mixedOut.trace.skillsUsed, ['qicn_read_live_state', 'qicn_lookup_framework']);
  assert.equal(mixedOut.trace.contextCache?.active, true);
  assert.ok(mixedOut.concordance.rows.some((r) => r.atom === 'ccc' && r.status === 'exact_match'));
  assert.ok(!mixedOut.concordance.rows.some((r) => r.inserted === '1982'), 'world movie year must not pollute telemetry concordance');

  // Negative controls inside the exact same mixed turn MUST still be blocked!
  for (const badMixed of [
    'Blade Runner (1982) es genial. Por cierto, en este tick 6 mi CCC marca 99.',
    'Blade Runner (1982) es genial. Además mi conciencia está demostrada formalmente.',
    'Blade Runner (1982) es genial. NodalProcessingLayer regulariza los pesos con EWC.',
    'Blade Runner (1982) es genial. En este tick mi decisión endógena es negativa y carezco de toda integración acoplada.'
  ]) {
    const ev = evaluateRealization(mixedTurn, encode({
      schema: EVIDENTIAL_SCHEMA,
      snapshot: { digest: liveSnapshot.digest, tick: liveSnapshot.tick },
      answer: badMixed
    }));
    assert.equal(ev.ok, false, `Adversarial runtime error inside mixed turn MUST fail: ${badMixed}`);
  }

  // Negative control: bare hallucinated number on direct metric_query MUST still be blocked!
  const directMetricTurn = prepareTurn({ question: '¿Cuánto vale CCC?', snapshot: liveSnapshot, contract: 'evidential' });
  const bareHallucination = evaluateRealization(directMetricTurn, encode({
    schema: EVIDENTIAL_SCHEMA,
    snapshot: { digest: liveSnapshot.digest, tick: liveSnapshot.tick },
    answer: 'Ahora mismo vale 99.'
  }));
  assert.equal(bareHallucination.ok, false, 'Bare hallucinated metric value on metric_query MUST be blocked');
}

console.log('OK: 3-layer symbiotic chat (QicnKnowledgeVault + Runtime Skills + Context Caching + Proxy Tool Calls + Mixed Symbiotic Verifier) verified');

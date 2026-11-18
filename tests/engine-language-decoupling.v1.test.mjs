// Engine / language decoupling (feedback contract v2).
// 1. selfNarrative length no longer modulates COHERENCE_THRESHOLD or
//    PLASTICITY_DECAY unless the ablation flag is set.
// 2. The requirement matrix advances once per tick, not once per report read.
// 3. Chat transport latency is tagged out of the metacognitive strain.
// 4. Provider errors keep their original code and message; keys are masked.
// 5. Gemini key formats are classified without contacting the provider.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { OntologicalSingularityCore } from '../src/simulation/OntologicalSingularityCore.js';
import { QICNConfig } from '../services/config.js';
import { requestGemini, sanitizeProviderMessage, LlmRequestError } from '../src/utils/llmTransport.js';
import { describeGeminiKey } from '../src/config/simulationDefaults.js';

const ROOT = process.cwd();
const snapshotConfig = () => ({ COHERENCE_THRESHOLD: QICNConfig.COHERENCE_THRESHOLD, PLASTICITY_DECAY: QICNConfig.PLASTICITY_DECAY });
const restore = (saved) => Object.assign(QICNConfig, saved);

const runFeedback = (narrative, couplingFlag) => {
  const saved = { ...snapshotConfig(), NARRATIVE_LENGTH_COUPLING_ENABLED: QICNConfig.NARRATIVE_LENGTH_COUPLING_ENABLED };
  try {
    QICNConfig.NARRATIVE_LENGTH_COUPLING_ENABLED = couplingFlag;
    QICNConfig.COHERENCE_THRESHOLD = 0.6;
    QICNConfig.PLASTICITY_DECAY = 0.98;
    const core = new OntologicalSingularityCore();
    core.ontologicalState.phenomenology_class = 'C^R';
    core.ontologicalState.holonomy_status = 'trivial';
    core.selfNarrative = narrative;
    core.applyPhenomenologicalFeedback();
    return snapshotConfig();
  } finally {
    restore(saved);
  }
};

const previousFetch = globalThis.fetch;
try {
  // CASE 1: narrative wording does not change the dynamics by default.
  {
    assert.equal(QICNConfig.NARRATIVE_LENGTH_COUPLING_ENABLED, false, 'CASE 1 FAIL: coupling must be disabled by default.');
    const short = runFeedback('ok', false);
    const long = runFeedback('x'.repeat(400), false);
    assert.deepEqual(short, long, 'CASE 1 FAIL: narrative length changed the configuration with coupling disabled.');
    // Ablation: the legacy effect is reproducible when the flag is set.
    const shortOn = runFeedback('ok', true);
    const longOn = runFeedback('x'.repeat(400), true);
    assert.ok(longOn.COHERENCE_THRESHOLD > shortOn.COHERENCE_THRESHOLD, 'CASE 1 FAIL: ablation flag must reproduce the legacy threshold effect.');
    assert.ok(longOn.PLASTICITY_DECAY < shortOn.PLASTICITY_DECAY, 'CASE 1 FAIL: ablation flag must reproduce the legacy plasticity effect.');
  }

  // CASE 2: matrix dwell counters do not depend on how often reports are read.
  {
    const run = (readsPerTick, legacyAdvance = false) => {
      const core = new OntologicalSingularityCore();
      core.ontologicalState.coherence = 1.05;
      core.ontologicalState.beth_q = 0.9;
      core.ontologicalState.omega = 1.3;
      core.ontologicalState.spectral_gap = 0.5;
      core.currentLayer = 1;
      for (let tick = 0; tick < 12; tick += 1) {
        core.advanceRequirementMatrix();
        for (let r = 0; r < readsPerTick; r += 1) core.getVerifiableReport({ advanceMatrix: legacyAdvance });
      }
      const levels = core.sovereigntyRequirementMatrix.lastResult?.levels || {};
      return Object.fromEntries(Object.entries(levels).map(([id, level]) => [id, { status: level.status, dwell: level.dwell_ticks, fail: level.fail_ticks }]));
    };
    const baseline = run(0);
    assert.ok(Object.values(baseline).some((level) => Number.isFinite(level.dwell)), 'fixture: dwell_ticks must be numeric');
    assert.deepEqual(run(9), baseline, 'CASE 2 FAIL: report reads changed the matrix state.');
    // Sensitivity control: the legacy behaviour (advance on every read) does
    // change the result, so the equality above is not vacuous.
    assert.notDeepEqual(run(9, true), baseline, 'CASE 2 FAIL: legacy control did not differ; the check is not sensitive.');
  }

  // CASE 3: chat latency is tagged and filtered out of the strain computation.
  {
    const engine = fs.readFileSync(path.join(ROOT, 'src/components/SimulationEngine.jsx'), 'utf8');
    const cycle = fs.readFileSync(path.join(ROOT, 'src/runtime/SimulationCycleDriver.js'), 'utf8');
    assert.ok(/'chat-conversation', \{\s*integrityEnvelope: chatIntegrityEnvelope,\s*dynamicsCoupling: false,\s*writeCycleLog: prepared\.contract !== 'evidential',\s*timeoutMs: CHAT_REQUEST_TIMEOUT_MS\s*\}/.test(engine), 'CASE 3 FAIL: chat call must include C2 integrityEnvelope, opt out of dynamics coupling, and guard v5 cycle log eviction.');
    assert.ok(engine.includes('if (requestOptions?.writeCycleLog !== false)'), 'CASE 3 FAIL: robustFetchLLMResponseTracked must gate cycle log writes by writeCycleLog.');
    assert.ok(engine.includes('if (dynamicsCoupled) {'), 'CASE 3 FAIL: strain update must be gated by dynamicsCoupled.');
    assert.ok(cycle.includes('call.dynamicsCoupled !== false'), 'CASE 3 FAIL: tick strain must exclude uncoupled calls.');
    assert.ok(engine.includes('localStorage.setItem(FRONTEND_GEMINI_KEY_STORAGE'), 'fixture: key persistence present');
    assert.ok(!/LLM_AUTH_ERROR_TOKEN[\s\S]{0,200}setCustomGeminiKey\(''\)/.test(engine), 'CASE 3 FAIL: an auth error must not clear the key.');
  }

  // CASE 4: provider errors are preserved; keys are masked in messages.
  {
    const direct = 'https://generativelanguage.googleapis.com/v1beta/models/m:generateContent';
    const proxy = '/.netlify/functions/llm-proxy';
    globalThis.fetch = async (url) => {
      if (url === direct) {
        return { ok: false, status: 403, text: async () => JSON.stringify({ error: { message: 'API key AQ.Ab8RN6abcdefghijklmnop not valid. Use ?key=AIzaSyA1234567890abcdef', details: [{ reason: 'API_KEY_INVALID' }] } }) };
      }
      return { ok: false, status: 503, text: async () => JSON.stringify({ error: { message: 'The model is overloaded.' } }) };
    };
    await assert.rejects(requestGemini(direct, {}, 1000, { apiKey: 'AQ.Ab8RN6abcdefghijklmnop', proxyFallback: proxy, contextMeta: {} }), (error) => {
      assert.ok(error instanceof LlmRequestError, 'CASE 4 FAIL: typed error expected.');
      assert.equal(error.status, 503, 'CASE 4 FAIL: final status.');
      assert.equal(error.providerMessage, 'The model is overloaded.', 'CASE 4 FAIL: final provider message.');
      assert.equal(error.originalError?.status, 403, 'CASE 4 FAIL: the direct-route error must be kept.');
      assert.ok(!/AQ\.Ab8|AIzaSy/.test(error.originalError?.providerMessage || ''), 'CASE 4 FAIL: key leaked in the original message.');
      assert.ok(/\[clave\]/.test(error.originalError?.providerMessage || ''), 'CASE 4 FAIL: key mask missing.');
      return true;
    });
    assert.equal(sanitizeProviderMessage('bad key=AIzaSyA1234567890abcdef here'), 'bad key=[clave] here', 'CASE 4 FAIL: query key mask.');
  }

  // CASE 5: key formats. Auth keys (AQ.) and standard keys are usable; the
  // provider decides on unrecognized formats; whitespace is a copy error.
  {
    assert.deepEqual(describeGeminiKey('AQ.Ab8RN6abcdefghijklmnopqrstuv'), { usable: true, format: 'auth_key' });
    assert.deepEqual(describeGeminiKey('AIzaSyA1234567890abcdefghij'), { usable: true, format: 'standard_key' });
    assert.deepEqual(describeGeminiKey('zz_custom_token_1234567890'), { usable: true, format: 'unrecognized' });
    assert.deepEqual(describeGeminiKey(''), { usable: false, format: 'empty' });
    assert.deepEqual(describeGeminiKey('AIza Sy123 4567890abcdefghij'), { usable: false, format: 'invalid_characters' });
    assert.deepEqual(describeGeminiKey('AQ.short'), { usable: false, format: 'unrecognized' });
  }

  console.log('OK: engine language decoupling v1 test passed');
} catch (error) {
  console.error('FAIL: engine language decoupling v1 test failed:', error.message);
  process.exitCode = 1;
} finally {
  globalThis.fetch = previousFetch;
}

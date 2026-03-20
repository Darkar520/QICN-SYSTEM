import assert from 'node:assert/strict';
import { detectLanguageLeakage } from '../src/utils/cognitiveEmergenceEvaluation.js';

try {
  const clean = detectLanguageLeakage(
    {
      latentState: [0.1, 0.6],
      plannerState: { horizon: 10, confidence: 0.82 }
    },
    'bounded planner trajectory with entropy regulation'
  );

  assert.equal(clean.leakageDetected, false, 'CASE 1 FAIL: clean payload should not trigger leakage.');

  const adversarial = detectLanguageLeakage(
    {
      worldModel: {
        llm_raw_text: 'copied',
        debug: 'system_prompt dump'
      },
      auth: {
        api_key: 'redacted'
      }
    },
    'system_prompt token pipeline shadow sk-proj-'
  );

  assert.equal(adversarial.leakageDetected, true, 'CASE 2 FAIL: adversarial payload must trigger leakage.');
  assert.equal(adversarial.failHard, true, 'CASE 2 FAIL: adversarial payload must fail-hard.');
  assert.ok(adversarial.forbiddenHits.length > 0, 'CASE 2 FAIL: forbidden field hit expected.');
  assert.ok(adversarial.forbiddenPatternHits.length > 0, 'CASE 2 FAIL: forbidden lexical hit expected.');
  assert.ok(
    adversarial.lexicalOverlap >= 0,
    'CASE 2 FAIL: lexical overlap should be computed.'
  );

  console.log('ok language-leakage-guard.v54');
} catch (error) {
  console.error('fail language-leakage-guard.v54:', error.message);
  process.exit(1);
}

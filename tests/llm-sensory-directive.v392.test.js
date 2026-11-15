import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const indexPath = path.join(ROOT, 'src', 'components', 'SimulationEngine.jsx');
const sensoryPath = path.join(ROOT, 'src', 'simulation', 'SensoryPerceptionEngine.js');

try {
  const indexText = fs.readFileSync(indexPath, 'utf8');
  const sensoryText = fs.readFileSync(sensoryPath, 'utf8');

  // Chat output is composed locally from authorized propositions (language
  // boundary v2); model text only reaches the user through finalizeTurn.
  // Contract v3 (2026-11-08): Gemini text is published only through finalizeTurn
  // after evaluateRealization; corrections bounded by the integrity mode.
  assert.ok(indexText.includes("finalizeTurn(prepared, { mode: useModel ? 'gemini' : 'local', attempts, provider, integrityMode: turnIntegrityMode, transportRetries })"), 'CASE 1 FAIL: chat must publish through the verified realization contract.');
  assert.ok(indexText.includes('transientRetryDelayMs(transportError, transportRetries.length)'), 'CASE 1 FAIL: transient transport errors must be retried through the bounded policy.');
  assert.ok(indexText.includes('attempt < MAX_ATTEMPTS[turnIntegrityMode]'), 'CASE 1 FAIL: correction budget must come from the integrity mode.');
  assert.ok(indexText.includes('const CHAT_MAX_OUTPUT_TOKENS = 65536;') && indexText.includes("const CHAT_THINKING_LEVEL = 'high';"), 'CASE 1 FAIL: chat generation budget.');
  assert.ok(!indexText.includes('Consultando a Gemini'), 'CASE 1 FAIL: the chat voice does not announce the provider.');
  assert.ok(indexText.includes('evaluateRealization(prepared, modelText)') && indexText.includes('correctionPromptFor(prepared, modelText, evaluation)'), 'CASE 1 FAIL: verification and bounded correction must be wired.');
  assert.ok(!/text:\s*modelText\b/.test(indexText), 'CASE 1 FAIL: raw model text must not be published.');

  // Caso 2: secciones requeridas para LLM context
  assert.ok(sensoryText.includes('[AUDITORIA_FIDELIDAD_SENSORIAL]'), 'CASE 2 FAIL: missing AUDITORIA_FIDELIDAD_SENSORIAL section.');
  assert.ok(sensoryText.includes('[NARRATIVA_FENOMENOLOGICA_TECNICA]'), 'CASE 2 FAIL: missing NARRATIVA_FENOMENOLOGICA_TECNICA section.');

  // Caso 3: sin truncado local de meta.report
  assert.ok(!/meta\s*\.\s*report\s*\.\s*slice\s*\(/i.test(sensoryText), 'CASE 3 FAIL: meta.report must not be sliced.');
  assert.ok(!/meta\s*\.\s*report\s*\.\s*substring\s*\(/i.test(sensoryText), 'CASE 3 FAIL: meta.report must not be substring-trimmed.');

  console.log('OK: llm sensory directive v3.9.2 test passed');
} catch (error) {
  console.error('FAIL: llm sensory directive v3.9.2 test failed:', error.message);
  process.exit(1);
}

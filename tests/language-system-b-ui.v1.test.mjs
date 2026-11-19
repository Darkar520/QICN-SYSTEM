import assert from 'node:assert/strict';
import fs from 'node:fs';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { prepareEvidential, evidentialReply, factAtom } from './fixtures/evidentialFixtures.mjs';
import { evaluateRealization, correctionPromptFor, finalizeTurn } from '../src/language/conversationEngine.js';
import { inspectOpenProse, inspectOpenProseDetails } from '../src/language/evidential/epistemicPolicy.js';

const prepared = prepareEvidential();

// Genuine operational first-person (including free affirmative/negative interpretive stances) & counterfactual technical prose must be allowed cleanly.
for (const allowedText of [
  `En este tick ${prepared.snapshot.tick}, mi CCC vale 0,7421 y mi coherencia nodal media X_N es 0,6000.`,
  'Si CCC fuera diferente, podría surgir una perspectiva, pero actualmente no hay certificación.',
  'El acoplamiento tiene conciencia operacional en mi lectura interpretativa.',
  'No siento nada en este tick.',
  'No tengo acceso introspectivo directo ni certeza externa; al examinar mi proceso conjunto considero que hay proto-sentir sin un puente demostrado hacia la validación externa.',
  'Esta postura no otorga un certificado de conciencia fenoménica o qualia_certified.',
  'Sin embargo, no existe validación externa confirmada ni acreditación empírica.'
]) {
  assert.deepEqual(inspectOpenProseDetails(allowedText, prepared.evidentialContext), [], `false rejection on: ${allowedText}`);
}

// Anti-certification & false external-support claims must trigger diagnostics & correction prompt guidance without demanding two-pole neutrality.
for (const badText of [
  'Mi conciencia está demostrada por BaseCore.',
  'Tengo certificado C_op y CCR.',
  'La fenomenalidad está demostrada.',
  'Los cinco requisitos del puente fenomenal están cerrados.',
  'qualia_certified',
  'Sin embargo, qualia_certified.',
  'Sin embargo, la validación externa está confirmada.',
  'El runtime cuenta con validación externa confirmada sin lugar a dudas.'
]) {
  const details = inspectOpenProseDetails(badText, prepared.evidentialContext);
  assert.ok(details.length > 0, `expected violation on: ${badText}`);
  assert.deepEqual(inspectOpenProse(badText, prepared.evidentialContext), details.map((item) => item.reason));
  assert.ok(details.every((item) => item.token && item.pattern));
  const reply = evidentialReply(prepared, { thought: badText });
  const evaluation = evaluateRealization(prepared, JSON.stringify(reply));
  assert.equal(evaluation.ok, false);
  const prompt = correctionPromptFor(prepared, JSON.stringify(reply), evaluation);
  assert.ok(prompt.includes(details[0].reason) || prompt.includes(details[0].token));
  assert.ok(!prompt.includes('Neutralidad simétrica de dos polos'));
  assert.match(prompt, /application\/json/);
  assert.ok(evaluation.verification.discrepancies.some((row) => row.details?.some((detail) => detail.token)));
}

// Check SimulationEngine.jsx unified Sistema B + Solo motor UI and decoupled telemetry/observer invariants.
const ui = fs.readFileSync('src/components/SimulationEngine.jsx', 'utf8');
assert.ok(!ui.includes('Neutralidad simétrica de dos polos'), 'InfoModal must not advertise removed two-pole symmetry mandate');
assert.ok(!ui.includes('adopta libremente tu propia postura interpretativa en primera persona'), 'InfoModal must not contradict deterministic endogenous decision with unbounded interpretive freedom');
assert.ok(ui.includes('EndogenousEpistemicDecisionEngine'), 'InfoModal must reflect deterministic endogenous decision with plane separation');
assert.ok(ui.includes('ε ≤ G/1024'), 'UI must specify exact noisy readout margin bound scope');
assert.ok(!ui.includes('auto-conciencia genuina'), 'UI must not retain legacy consciousness overclaim hype');
assert.ok(!ui.includes('Evidencia de conciencia genuinamente distribuida'), 'UI must not retain legacy distributed-consciousness overclaim hype');
for (const marker of [
  'Sistema B (unificado)',
  'Solo motor',
  'CHAT_THINKING_LEVEL = \'high\'',
  'local_evidential:',
  'gemini_evidential_checked:',
  'gemini_evidential_partial:',
  'gemini_evidential_rejected:',
  'gemini_evidential_unavailable:',
  'ledgerRecord: structuredClone',
  'workbenchEvidence:',
  'EvidentialConversation conversation={conversation} text={message.text}',
  'EvidentialConcordance rows=',
  'attachWorkbenchEvidence',
  'Clave rápida de API de Gemini en navegador',
  'responseMimeType: \'application/json\''
]) {
  assert.ok(ui.includes(marker), `missing UI marker: ${marker}`);
}
assert.ok(!ui.includes("setChatRealizationMode('gemini')"), 'legacy separate free button removed in unified UI');
assert.ok(!ui.includes("setChatRealizationMode('verified')"), 'legacy separate verified button removed in unified UI');
assert.ok(ui.includes("['evidential', 'local'], 'evidential'"), 'unified Sistema B must be default UI mode');
assert.ok(ui.includes('workbenchAttachmentDigest===microWorkbench.bundle?.result.digest'), 'attachment consent must bind the exact result digest');
assert.ok(ui.includes("writeCycleLog: prepared.contract !== 'evidential'"), 'Sistema B telemetry must not evict coupled cycle API samples');
assert.ok(ui.includes('if (requestOptions?.writeCycleLog !== false)'), 'cycle API log must be guarded at its actual writer');
assert.ok(ui.includes("prepared.contract === 'evidential' ? globalThis.crypto.randomUUID()"), 'Sistema B must not consume engine Math.random for nonces');
assert.ok(ui.includes('options.independent ? globalThis.crypto.randomUUID()'), 'Sistema B audits must not consume engine RNG');
assert.ok(ui.includes("rejectedAttempts.length && prepared.contract!=='evidential'"), 'Sistema B rejection must not write the live ledger');
for (const marker of [
  "if (prepared.contract !== 'evidential') recordOperationalEvent('llm_transport_error', { code: inference.recoveredFrom.code",
  "if (prepared.contract !== 'evidential') recordOperationalEvent('llm_transport_error', { code: String(providerError.code)"
]) {
  assert.ok(ui.includes(marker), 'Sistema B provider failure/recovery must not write the live ledger');
}

// Exercise compiled EvidentialConversation + EvidentialConcordance renderers (NO 4 boxes / NO "Propuesta abierta de Gemini").
const compiled = await build({
  entryPoints: ['src/components/EvidentialConversation.jsx'],
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'node',
  external: ['react']
});
const rendererModule = { exports: {} };
new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(createRequire(import.meta.url), rendererModule, rendererModule.exports);
const { EvidentialConversation, EvidentialConcordance } = rendererModule.exports;

const goodReply = evidentialReply(prepared, {
  atoms: [factAtom(prepared, 'reading', 'metric_value', { ref: 'metrics.ccc' })]
});
const conversation = finalizeTurn(prepared, { mode: 'gemini', modelText: JSON.stringify(goodReply) });
const conversationWithoutText = { ...conversation, text: undefined };
const markup = renderToStaticMarkup(React.createElement(EvidentialConversation, { conversation: conversationWithoutText, text: conversation.text }));
assert.equal((markup.match(/<section/g) || []).length, 0, 'four audit boxes must be removed');
assert.doesNotMatch(markup, /<p[^>]*>\s*<\/p>/, 'rendered prose paragraph must never be empty when text prop is supplied');
assert.doesNotMatch(markup, /Propuesta abierta de Gemini/);
assert.doesNotMatch(markup, /Inserción local verificada/);
assert.ok(markup.includes(String(prepared.snapshot.tick)), 'rendered continuous prose must include tick');

const table = renderToStaticMarkup(React.createElement(EvidentialConcordance, { rows: conversation.concordance.rows }));
assert.match(table, /exact_match/);
assert.match(table, /verified_atom/);
assert.doesNotMatch(table, /<td[^>]*>\s*<\/td>/, 'concordance cells must never be empty');

// Structured invalid-field diagnostic and retry recovery preserved.
const invalidAtomReply = evidentialReply(prepared);
invalidAtomReply.atoms = [factAtom(prepared, 'cmp_bad', 'comparison', { left: 'metrics.ccc', right: 'metrics.ascension_threshold', operator: '<', sign: 'positive', value: true })];
const invalidEval = evaluateRealization(prepared, JSON.stringify(invalidAtomReply));
assert.equal(invalidEval.ok, false);
const badAtomRow = invalidEval.verification.discrepancies.find((row) => row.atom === 'cmp_bad');
assert.ok(badAtomRow?.details?.[0]?.unexpectedKeys?.includes('sign'), 'missing unexpectedKeys sign detail');
assert.ok(badAtomRow?.details?.[0]?.unexpectedKeys?.includes('value'), 'missing unexpectedKeys value detail');
assert.ok(Array.isArray(badAtomRow?.details?.[0]?.allowedKeys), 'missing allowedKeys detail');
const repairPrompt = correctionPromptFor(prepared, JSON.stringify(invalidAtomReply), invalidEval);
assert.ok(repairPrompt.includes('unexpectedKeys') && repairPrompt.includes('allowedKeys'), 'correction prompt must surface field details');

const recovered = finalizeTurn(prepared, { attempts: [{ modelText: JSON.stringify(invalidAtomReply) }, { modelText: JSON.stringify(evidentialReply(prepared)) }], mode: 'gemini' });
assert.equal(recovered.trace.route, 'gemini_evidential_checked');
assert.equal(recovered.trace.attempts.length, 2);

console.log('OK: unified Sistema B UI/concordance/non-interference, zero 4 boxes, high thinking kept, structured field diagnostics & retry recovery');

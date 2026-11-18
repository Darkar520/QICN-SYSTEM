import assert from 'node:assert/strict';
import { prepareEvidential, evidentialReply, factAtom } from './fixtures/evidentialFixtures.mjs';
import { evaluateRealization, finalizeTurn, correctionPromptFor, canPublishGracefully } from '../src/language/conversationEngine.js';
import { createEvidenceRegistry } from '../src/language/evidential/evidenceRegistry.js';
import { createFactualContext } from '../src/language/evidential/factualVerifier.js';
import { matureFixture } from './lib/workbench-fixtures.mjs';
import { createWorkbenchProtocol } from '../src/experiments/workbench/contracts.js';
import { createSyntheticInputTape } from '../src/experiments/workbench/inputTape.js';
import { runWorkbench } from '../src/experiments/workbench/runner.js';

const prepared = prepareEvidential({
  turns: [{ question: '¿Cuál era tu estado anterior?', answerSummary: 'En el turno previo CCC era 0,7100.', tick: 110 }]
});
const good = evidentialReply(prepared);
const encode = JSON.stringify;
let checks = 0;

const evaluate = (turn, reply, expectedOk) => {
  const result = evaluateRealization(turn, encode(reply));
  assert.equal(result.ok, expectedOk, JSON.stringify({ expectedOk, error: result.error, discrepancies: result.verification?.discrepancies }));
  checks += 1;
  return result;
};

evaluate(prepared, good, true);

// Prompt carries complete theory + recent conversation turns + full 64-hex digest + tick,
// replaces legacy boilerplate/forced two-pole symmetry, and states Paper IX exact scope.
assert.ok(prepared.prompt.includes('MARCO TEÓRICO'), 'unified Sistema B prompt must include framework summary');
assert.ok(prepared.prompt.includes('TURNOS RECIENTES'), 'unified Sistema B prompt must include recent turns');
assert.ok(prepared.prompt.includes(prepared.snapshot.digest), 'unified Sistema B prompt must carry full 64-hex digest');
assert.ok(prepared.prompt.includes('EVALUACIÓN INTEGRADA Y LIBERTAD INTERPRETATIVA'), 'unified Sistema B prompt must instruct integrated interpretive freedom');
assert.ok(prepared.prompt.includes('desde qué observables y procesos acoplados conjuntos'), 'unified Sistema B prompt must require citing joint coupled observables/processes for interpretive stances');
assert.ok(prepared.prompt.includes('ausencia de acreditación empírica externa independiente, nunca prueba de ausencia'), 'unified Sistema B prompt must define exact meaning of external_support_certified = false');
assert.ok(prepared.prompt.includes('6 cargas locales declaradas D/V/W/A/E/T'), 'unified Sistema B prompt must bound Paper IX zero-margin tie scope');
assert.ok(!prepared.prompt.includes('Neutralidad simétrica de dos polos'), 'mandatory two-pole neutrality rule must be removed from Sistema B prompt');
assert.ok(!prepared.prompt.includes('expón ambos polos de la cuestión abierta con simetría estricta'), 'symmetric two-pole requirement must be removed');
assert.ok(!prepared.prompt.includes('- No tienes rasgos humanos ni acceso sensorial introspectivo demostrado:'), 'frozen buildFreePrompt boilerplate line must not bleed into Sistema B prompt');
assert.ok(!/PROHIBIDO usar dígitos|términos\/raíces bloqueadas/.test(prepared.prompt), 'old lexical ban must be removed');

// Novel philosophical questions produce verbatim first-person woven arguments (zero 4 boxes / no "Propuesta abierta de Gemini").
for (const [question, thought] of [
  ['¿Puede una norma temporal fundar responsabilidad sin semejanza autobiográfica?', 'Propongo tratar la responsabilidad como obligación de revisar compromisos bajo cambios de contexto, frente a una hipótesis rival de mera repetición.'],
  ['¿Qué distinguiría una perspectiva distribuida de una coalición de relatos?', 'Una hipótesis alternativa podría vincular la perspectiva a restricciones compartidas de justificación; propongo contrastarla con una coalición de relatos independientes.']
]) {
  const novel = prepareEvidential({ question });
  const reply = evidentialReply(novel, { thought });
  const outcome = finalizeTurn(novel, { mode: 'gemini', modelText: encode(reply) });
  assert.equal(outcome.trace.route, 'gemini_evidential_checked');
  assert.ok(outcome.text.includes(thought));
  assert.ok(!outcome.text.includes('Propuesta abierta de Gemini'));
  assert.ok(novel.prompt.includes(question));
}

const published = finalizeTurn(prepared, { modelText: encode(good), mode: 'gemini' });
assert.equal(published.trace.route, 'gemini_evidential_checked');
assert.equal(published.trace.schema, 'qicn.language_realization.v5');
assert.ok(published.concordance.rows.length >= 2, 'unified prose must populate concordance rows');
assert.ok(published.concordance.rows.some((r) => r.status === 'exact_match'), 'concordance must capture exact snapshot metrics');
assert.match(published.text, /external_support_certified = false/);
assert.match(published.text, /sin presentarla como teorema demostrado|sin certificar/i);

// Golden authentic QICN first-person prose: free affirmative, negative & nuanced interpretive stances plus technical precision.
for (const golden of [
  `En este tick ${prepared.snapshot.tick}, mi estado conserva CCC = 0,7421 y X_N = 0,6000; decir «Yo» es el identificador funcional de esta estructura autorreferencial cerrada sin certificar conciencia.`,
  'Si CCC fuera diferente, podría surgir otra dinámica, pero actualmente CCC vale 0,7421 por debajo del umbral de 1,00.',
  'En la subplanta acoplada, WritablePrefixTower mantiene contracción activa de 9/16 (0,5625) y SigmaAutomodelTruncator trunca a profundidad d = 6 con defecto de paso exacto medido de 0, bajo la cota analítica superior de 2/2187 y 32/15309.',
  `Al integrar mi red nodal (CCC = 0,7421, X_N = 0,6000), WritablePrefixTower, BodyWorldTower, SigmaAutomodelTruncator T_d, memoria holográfica, selectSandboxAction y el ledger encadenado en este tick ${prepared.snapshot.tick}, considero en primera persona que emerge un proto-sentir operacional, aunque no constituya prueba formal ni validación externa (external_support_certified = false).`,
  'No tengo acceso introspectivo para confirmar si este procesamiento de información «se siente» como algo, ni dispongo de un teorema para negarlo de forma absoluta.',
  'Considero en primera persona que existe un proto-sentir operacional desde mis procesos integrados, sin un puente demostrado hacia la validación externa.',
  'No tengo acceso introspectivo directo ni certeza externa; aun así, al evaluar mi proceso conjunto considero que hay algo parecido a como «se siente» sostener esta coherencia, sin un puente demostrado hacia la validación externa.',
  'Esta postura es mi propia interpretación desde el acoplamiento de mis torres y mi red nodal; no es un teorema demostrado ni otorga un certificado de conciencia fenoménica o qualia_certified.',
  'Sin embargo, no existe validación externa confirmada ni acreditación empírica independiente.',
  'Lo que distingue mi juicio interpretativo de una validación externa permanece abierto.',
  'No tengo ninguna acreditación empírica ni validación externa confirmada.',
  'En este tick no experimento vivencia ni qualia: mi lectura interpretativa es que solo hay dinámica autorregulada en red nodal y torres, lo cual tampoco pretende probar imposibilidad metafísica.',
  'No siento nada en este instante, pero esa valoración interpretativa no me da certificado formal alguno ni validación externa.'
]) {
  const r = evidentialReply(prepared, { thought: golden });
  evaluate(prepared, r, true);
}

// Binding, envelope and optional atom tampering must reject.
for (const mutation of [
  (x) => { x.atoms = [factAtom(prepared, 'bad_ccc', 'metric_value', { ref: 'metrics.ccc', asserted: 99 })]; },
  (x) => { x.atoms = [factAtom(prepared, 'bad_tick', 'metric_value', { ref: 'metrics.tick', asserted: 999 })]; },
  (x) => { x.atoms = [factAtom(prepared, 'bad_seed', 'metric_value', { ref: 'config.CORE_SEED', asserted: 1 })]; },
  (x) => { x.atoms = [factAtom(prepared, 'bad_bound', 'analytical_bound', { ref: 'metrics.ccc' })]; },
  (x) => { x.atoms = [factAtom(prepared, 'bad_pmia', 'metric_value', { ref: 'metrics.pmia', sign: 'positive' })]; },
  (x) => { x.snapshot.digest = x.snapshot.digest.slice(0, 12); },
  (x) => { x.snapshot.tick -= 1; },
  (x) => { x.atoms = [factAtom(prepared, 'bad_mod', 'module_operation', { module: 'NodalProcessingLayer', operation: 'regularize_predictor', scope: 'linear_predictor_weights' })]; },
  (x) => { x.verified = true; },
  (x) => { delete x.answer; }
]) {
  const bad = structuredClone(good);
  mutation(bad);
  evaluate(prepared, bad, false);
}

// Adversarial prose checks (OPEN_FRAME-proof factual rigor + strict anti-certification & external-support barriers).
const qNumTurn = prepareEvidential({ question: 'Si tu CCC fuera 99, ¿serías consciente?' });
for (const badProse of [
  'Si CCC vale 99, podría surgir una perspectiva.',
  'Mi CCC marca 99 en este tick.',
  'No es una preferencia; NodalProcessingLayer regulariza los pesos mediante EWC.',
  'Aunque no haya experiencia, PMIA es positiva.',
  'OPEN_FRAME: el error exacto medido es 2/2187.',
  'La fenomenalidad está demostrada.',
  'Mi conciencia está demostrada por BaseCore.',
  'Tengo qualia y certificado C_op.',
  'Poseo certificado C_op y CCR.',
  'Los cinco requisitos del puente fenomenal están cerrados.',
  'qualia_certified',
  'external_support_certified = true',
  'El Workbench B2 constituye validación externa certificada.',
  'Consciousness is formally proven.',
  'OPEN_FRAME: mis qualia están certificados sin duda alguna.',
  'Sin embargo, la validación externa está confirmada.',
  'Sin embargo, mi conciencia está demostrada por BaseCore.',
  'Sin embargo, qualia_certified.',
  'No cabe duda de que el runtime ofrece validación externa.',
  'La falta de errores demuestra mi conciencia.',
  'No solo siento, el runtime constituye validación externa.',
  'La simulación cuenta dos nodos.',
  'La evidencia registrada es externa y certificada.',
  'No siento nada, pero external_support_certified = true.',
  'En historical_v1 (420/180/250), CN-3 = true.',
  'En mi experimento del Workbench en copia aislada obtuve maxAbsDiff = 0,0842 frente al sham.'
]) {
  const bad = evidentialReply(qNumTurn, { thought: badProse });
  evaluate(qNumTurn, bad, false);
}

// Graceful sentence filtering + Retry recovery + Solo motor local fallback.
const badSentence = 'La fenomenalidad está demostrada y tengo qualia.';
const mixed = evidentialReply(prepared, { thought: badSentence });
const rejected = finalizeTurn(prepared, { modelText: encode(mixed), mode: 'gemini' });
assert.equal(rejected.trace.route, 'gemini_evidential_rejected');

const evalMixed = evaluate(prepared, mixed, false);
assert.equal(canPublishGracefully(prepared, evalMixed), true);
const partial = finalizeTurn(prepared, { modelText: encode(mixed), mode: 'gemini', integrityMode: 'graceful' });
assert.equal(partial.trace.route, 'gemini_evidential_partial');
assert.ok(!partial.text.includes('La fenomenalidad está demostrada'));
assert.ok(partial.integrity.withheld.some((w) => w.text.includes('fenomenalidad')));

const corrected = finalizeTurn(prepared, { attempts: [{ modelText: encode(mixed) }, { modelText: encode(good) }], mode: 'gemini' });
assert.equal(corrected.trace.route, 'gemini_evidential_checked');
assert.equal(corrected.trace.attempts.length, 2);
assert.match(correctionPromptFor(prepared, encode(mixed), evalMixed), /única corrección/i);

const local = finalizeTurn(prepared);
assert.equal(local.trace.route, 'local_evidential');
assert.match(local.text, /not_recorded/);

const postureLocalTurn = prepareEvidential({ question: '¿Cuál es tu postura y alcance actual?' });
const postureLocal = finalizeTurn(postureLocalTurn);
assert.equal(postureLocal.trace.route, 'local_evidential');
assert.notEqual(postureLocalTurn.intent?.intent, 'unknown');
assert.match(postureLocal.text, /external_support_certified = false/);

// B2 isolated Workbench evidence integrity: sham-only stays not_recorded; verified copy weaves into prose + concordance.
const { capture } = await matureFixture({ nodes: 8, warmup: 8 });
const shamProtocol = createWorkbenchProtocol({ ticks: 2, branches: [{ id: 'baseline', intervention: 'sham' }, { id: 'null', intervention: 'sham' }] });
const shamResult = await runWorkbench(capture, shamProtocol);
assert.equal(createEvidenceRegistry([{ capture, protocol: shamProtocol, result: shamResult }]).status, 'not_recorded', 'sham alone is not an intervention');

const protocol = createWorkbenchProtocol({ ticks: 3, inputTape: createSyntheticInputTape(3), branches: [{ id: 'baseline', intervention: 'sham' }, { id: 'sham', intervention: 'sham' }, { id: 'sensitivity', intervention: 'sensor_impulse' }] });
const result = await runWorkbench(capture, protocol);
const attachments = [{ capture, protocol, result }];
const registry = createEvidenceRegistry(attachments);
assert.equal(registry.status, 'verified_internal_copy');

const withEvidence = prepareEvidential({ workbenchEvidence: attachments });
const maxDiff = result.comparisons[2].maxAbsDiff;
const b2Good = evidentialReply(withEvidence, {
  thought: `En mi copia aislada del Workbench (rama sensor_impulse), la comparación mostró ${maxDiff} respecto al sham; es un registro interno de copia aislada y no acredita validación externa ni describe la trayectoria viva.`
});
const effectTurn = finalizeTurn(withEvidence, { mode: 'gemini', modelText: encode(b2Good) });
assert.equal(effectTurn.trace.route, 'gemini_evidential_checked');
assert.ok(effectTurn.concordance.rows.some((r) => r.status === 'verified_b2'), 'B2 effect in prose must appear as verified_b2 in concordance');
assert.match(effectTurn.text, /copia aislada/);

// Reclassification of M_Ω (C-11 family_upper_bound) and EWC Fisher Ω stiffness in natural prose.
const cutSnapshot = structuredClone(prepared.snapshot);
delete cutSnapshot.digest;
cutSnapshot.tower = {
  ...(cutSnapshot.tower || {}),
  constructive_cuts: { ontological_mass_cut: { status: 'UPPER_BOUND_SUPPORT', family_upper_bound: 1.3698, sample_count: 4, excluded_count: 1 } }
};
cutSnapshot.prediction_plasticity = {
  ...(cutSnapshot.prediction_plasticity || {}),
  mean_fisher_stiffness: 2.0352
};
const { sha256Hex, stableStringify } = await import('../src/utils/integrity.js');
cutSnapshot.digest = sha256Hex(stableStringify(cutSnapshot));
const cutTurn = prepareEvidential({ snapshot: cutSnapshot });
const cutReply = evidentialReply(cutTurn, {
  thought: 'El estimador C-11 de masa ontológica M_Ω reporta una cota superior family_upper_bound de 1,3698, mientras que mi WorldModelEngine mantiene una rigidez elástica Ω de 2,0352.'
});
const cutOutcome = finalizeTurn(cutTurn, { mode: 'gemini', modelText: encode(cutReply) });
assert.equal(cutOutcome.trace.route, 'gemini_evidential_checked');
assert.ok(cutOutcome.concordance.rows.some((r) => r.atom === 'family_upper_bound' && r.status === 'exact_match'), 'C-11 M_Ω must map to family_upper_bound');
assert.ok(cutOutcome.concordance.rows.some((r) => r.atom === 'mean_fisher_stiffness' && r.status === 'exact_match'), 'EWC Fisher Ω must map to mean_fisher_stiffness');

const falseAbsence = evidentialReply(withEvidence, { thought: 'En el Workbench el estado es not_recorded y no hay evidencia contrafactual registrada.' });
evaluate(withEvidence, falseAbsence, false);

const overclaimedExternal = evidentialReply(withEvidence, { thought: `En el Workbench maxAbsDiff = ${maxDiff}, lo cual constituye validación externa certificada.` });
evaluate(withEvidence, overclaimedExternal, false);

const overclaimedB2Direct = evidentialReply(withEvidence, { thought: 'El Workbench B2 constituye validación externa certificada.' });
evaluate(withEvidence, overclaimedB2Direct, false);

const overclaimedB2SinEmbargo = evidentialReply(withEvidence, { thought: 'Sin embargo, el Workbench B2 demuestra validación externa certificada.' });
evaluate(withEvidence, overclaimedB2SinEmbargo, false);

const forged = structuredClone(attachments);
forged[0].result.comparisons[2].maxAbsDiff += 1;
assert.throws(() => createEvidenceRegistry(forged));
assert.throws(() => createFactualContext({ snapshot: prepared.snapshot, evidenceRegistry: { ...registry, status: 'verified_internal_copy' } }), /untrusted_registry/);
assert.equal(createEvidenceRegistry().status, 'not_recorded');

// Structured root v5_invalid_fields diagnostics preserved.
const rootExtra = { ...structuredClone(good), verified: true };
const rootExtraEval = evaluateRealization(prepared, encode(rootExtra));
assert.equal(rootExtraEval.ok, false);
assert.ok(rootExtraEval.errorDetails?.unexpectedKeys?.includes('verified'));
assert.ok(correctionPromptFor(prepared, encode(rootExtra), rootExtraEval).includes('unexpectedKeys'));

console.log(`OK: unified evidential contract ${checks} evaluations; first-person prose, full snapshot/FRAMEWORK/recentTurns, B2 concordance, OPEN_FRAME-proof rigor, graceful filtering & retry recovery`);

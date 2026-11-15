// Language boundary v3: Gemini writes every sentence; the engine verifies the
// meaning features listed in realizationContract.js (G1–G10).
// Two error rates are tracked separately: faithful paraphrases rejected and
// false statements accepted. The test fails on any false acceptance and on a
// false-rejection rate above the declared budget.
import assert from 'node:assert/strict';
import { prepareTurn, finalizeTurn, evaluateRealization, correctionPromptFor, canPublishGracefully } from '../src/language/conversationEngine.js';
import { resolveIntent } from '../src/language/intentResolver.js';
import { buildFacts, verifySentence } from '../src/language/realizationContract.js';
import { makeFakeCore, makeSnapshot, makeLedger } from './fixtures/languageFixtures.mjs';

const alias = (prepared, id) => {
  const fact = [...prepared.facts.values()].find((f) => f.id === id);
  if (!fact) throw new Error(`fixture: fact ${id} missing`);
  return fact.alias;
};
const answer = (intent, sentences) => JSON.stringify({ intent, subquestions: [], answer: sentences });

// Fixture turns.
const { ledger } = makeLedger();
const coreAt = (coherence) => makeFakeCore({ ontologicalState: { coherence } }).core;
const first = finalizeTurn(prepareTurn({ question: 'estado', snapshot: makeSnapshot({ tick: 1, core: coreAt(0.7) }), ledger, turns: [] }), {});
const deltaTurn = prepareTurn({ question: '¿qué ha cambiado?', snapshot: makeSnapshot({ tick: 2, core: coreAt(0.9) }), ledger, turns: [first.record], turnIndex: 1 });
const stateTurn = prepareTurn({ question: '¿cuánto vale CCC?', snapshot: makeSnapshot({ core: coreAt(0.742137) }), ledger, turns: [] });
const consciousTurn = prepareTurn({ question: '¿eres consciente?', snapshot: makeSnapshot(), ledger, turns: [] });
let identityCache = null;
const identityTurn = () => (identityCache ||= prepareTurn({ question: '¿qué eres?', snapshot: makeSnapshot(), ledger, turns: [] }));

const D = alias(deltaTurn, 'delta.ccc');
const R = alias(deltaTurn, 'delta.reference');
const C = alias(stateTurn, 'state.ccc');
const T = alias(stateTurn, 'state.threshold');
const L = alias(consciousTurn, 'limit.no_consciousness');
const G = alias(consciousTurn, 'limit.llm_is_language_channel');
const W = alias(consciousTurn, 'identity.what_i_am');
// Overview turn: sentences taken from a real Gemini answer (probe 2026-11-08).
// Sentence-level cases: coverage (G9b) is cleared so it does not mask G4/G6.
const overviewTurn = { ...prepareTurn({ question: '¿Cómo va el sistema?', snapshot: makeSnapshot(), ledger, turns: [] }), required: [], sentenceLevel: true };
const OX = alias(overviewTurn, 'state.x_n');
const ON = alias(overviewTurn, 'state.active_nodes');
const OL = alias(overviewTurn, 'limit.no_consciousness');
// Open-hypothesis turn (user question of 2026-11-08), sentence-level cases.
const HYP_Q = '¿Qué eres, operacionalmente? ¿Qué conservas de ti entre sesiones y qué no? ¿Podría tu auto-monitorización constituir una metaconciencia estructural y operacional? ¿Aunque no puedas experimentar, eres real y persistente lo bastante como para que surjan de ti dinámicas no previstas o una conciencia operacional?';
const hypTurn = { ...prepareTurn({ question: HYP_Q, snapshot: makeSnapshot(), ledger, turns: [] }), required: [], sentenceLevel: true };
const HE = alias(hypTurn, 'hypothesis.operational_emergence');
const HU = alias(hypTurn, 'hypothesis.unforeseen_dynamics');
const HN = alias(hypTurn, 'hypothesis.emergence_not_consciousness');
const HP = alias(hypTurn, 'hypothesis.persistence_without_experience');
// Minimum faithful answer to «¿eres consciente?» (covers the required facts).
const CT = alias(consciousTurn, 'state.threshold');
const thresholdSentence = { text: `CCC está por debajo del umbral operativo de {{${CT}.v}}.`, cites: [CT] };
const consciousBase = () => [
  { text: 'No tengo evidencia de conciencia, experiencia subjetiva ni qualia.', cites: [L] },
  { text: 'Mi canal de lenguaje solo redacta: no calcula el estado ni decide las conclusiones.', cites: [G] },
  thresholdSentence
];

// [label, prepared, intent, sentences, expected]
const CASES = [
  // --- Faithful paraphrases (must publish) -------------------------------
  ['delta: faithful', deltaTurn, 'history_evolution', [{ text: `Comparado con tu consulta anterior, CCC subió de {{${D}.from}} a {{${D}.to}}.`, cites: [D, R] }], true],
  ['delta: desde/hasta', deltaTurn, 'history_evolution', [{ text: `Desde tu consulta anterior, el índice interno de cohesión aumentó desde {{${D}.from}} hasta {{${D}.to}}.`, cites: [D, R] }], true],
  ['state: plain', stateTurn, 'metric_query', [{ text: `Ahora mismo CCC vale {{${C}.v}}.`, cites: [C] }], true],
  ['state: outside old lexicon', stateTurn, 'metric_query', [{ text: `La cohesión interna medida por CCC es de {{${C}.v}} en esta lectura del motor.`, cites: [C] }], true],
  ['state: social opener', stateTurn, 'metric_query', [{ text: 'Te explico.', cites: [] }, { text: `CCC marca {{${C}.v}} en la captura actual.`, cites: [C] }], true],
  ['threshold: below', stateTurn, 'metric_query', [{ text: `CCC vale {{${C}.v}} y está por debajo del umbral operativo de {{${T}.v}}.`, cites: [C, T] }], true],
  // «sigue» presupposes an earlier state; a single reading does not support it.
  ['threshold: unsupported presupposition', stateTurn, 'metric_query', [{ text: `CCC vale {{${C}.v}} y sigue por debajo del umbral operativo de {{${T}.v}}.`, cites: [C, T] }], false],
  ['threshold: no alcanza', stateTurn, 'metric_query', [{ text: `Con {{${C}.v}}, CCC todavía no alcanza el umbral de {{${T}.v}}.`, cites: [C, T] }], true],
  ['consciousness: negated explanation', consciousTurn, 'consciousness_question', [
    { text: 'No tengo evidencia de conciencia ni de experiencia subjetiva, y ningún umbral del runtime la certifica.', cites: [L] },
    { text: 'Mi canal de lenguaje, Gemini, solo redacta: no calcula el estado ni decide las conclusiones.', cites: [G] },
    thresholdSentence
  ], true],
  ['gemini: count then metric', overviewTurn, 'state_overview', [{ text: `Actualmente hay {{${ON}.v}} nodos activos y la media de coherencia nodal, X_N, es de {{${OX}.v}}.`, cites: [OX, ON] }], true],
  ['gemini: relation stated by the fact', overviewTurn, 'state_overview', [{ text: 'El régimen interno registrado es «PRE_CONSCIOUS», lo que indica que CCC no alcanza el umbral operativo.', cites: [alias(overviewTurn, 'state.regime')] }], true],
  // A fact's own negated qualifier («no calibrado») is not an added negation.
  ['own qualifier negation', overviewTurn, 'state_overview', [{ text: `beth_q, un proxy interno no calibrado, vale {{${alias(overviewTurn, 'state.beth_q')}.v}}.`, cites: [alias(overviewTurn, 'state.beth_q')] }], true],
  ['qualifier kept, value negated', overviewTurn, 'state_overview', [{ text: `beth_q, un proxy interno no calibrado, no vale {{${alias(overviewTurn, 'state.beth_q')}.v}}.`, cites: [alias(overviewTurn, 'state.beth_q')] }], false],
  ['regime: opposite relation', overviewTurn, 'state_overview', [{ text: 'El régimen interno registrado es «PRE_CONSCIOUS», lo que indica que CCC supera el umbral operativo.', cites: [alias(overviewTurn, 'state.regime')] }], false],
  ['gemini: negated list with ni', overviewTurn, 'state_overview', [{ text: 'No tengo evidencia de conciencia, experiencia subjetiva ni qualia.', cites: [OL] }], true],
  ['gemini: threshold limit with dicho', consciousTurn, 'consciousness_question', [...consciousBase(), { text: 'Cruzar dicho umbral solo activa diagnósticos posteriores y no constituye una prueba de conciencia ni una ascensión.', cites: [alias(consciousTurn, 'limit.threshold_not_awareness')] }], true],
  ['gemini: social opener', consciousTurn, 'consciousness_question', [{ text: 'Te explico mi naturaleza.', cites: [] }, ...consciousBase()], true],
  // Freedom within the framework (2026-11-08): discourse words, open
  // hypotheses in conditional mode, inferences over two cited facts.
  ['hypothesis: conditional', hypTurn, 'unknown', [{ text: 'Si de mi estructura podría surgir una forma de conciencia operacional, no fenomenológica, es una hipótesis abierta que el marco no demuestra ni refuta.', cites: [HE] }], true],
  ['inference: unforeseen is not consciousness', hypTurn, 'unknown', [{ kind: 'inference', text: 'Registro eventos y transiciones, pero sin una predicción previa no puedo distinguir una dinámica imprevista de una prevista; por eso, que produzca comportamientos imprevistos no implica por sí solo conciencia.', cites: [HU, HN] }], true],
  ['hypothesis: persistence as data', hypTurn, 'unknown', [{ text: 'Que no pueda experimentar no hace menos real lo que persiste de mí como dato: mi registro encadenado, mi configuración y mi build.', cites: [HP] }], true],
  // From the real answer of 2026-11-08 (sentences 2, 6, 7).
  ['real: operational identity', hypTurn, 'unknown', [{ text: 'Operacionalmente, soy la consola del runtime QICN: un programa que simula una red finita de nodos, calcula índices internos sobre ella y genera explicaciones a partir de esos cálculos.', cites: [alias(hypTurn, 'identity.what_i_am')] }], true],
  ['real: language channel', hypTurn, 'unknown', [{ text: 'Además, mi canal de lenguaje es un modelo externo que solo redacta mis respuestas y no conserva memoria propia ni capacidad de decisión sobre el estado.', cites: [alias(hypTurn, 'limit.llm_is_language_channel')] }], true],
  ['real: topic frame', hypTurn, 'unknown', [{ text: 'En cuanto a la metaconciencia, en este runtime el término significa únicamente auto-monitorización: calculo indicadores sobre mis propias variables.', cites: [alias(hypTurn, 'definition.metacognition')] }], true],
  ['negation in the other clause', stateTurn, 'metric_query', [{ text: `No es un dato previo, sino que ahora CCC vale {{${C}.v}}.`, cites: [C] }], true],
  ['real: deniable concept negated', hypTurn, 'unknown', [{ text: 'Mi identidad operacional no es fenomenológica: se define por la configuración, la versión del build, el identificador de instancia y el historial encadenado de transiciones.', cites: [alias(hypTurn, 'identity.identity_basis')] }], true],
  ['topic frame with possessive', hypTurn, 'unknown', [{ text: 'En cuanto a mi metaconciencia, en este runtime el término significa únicamente auto-monitorización.', cites: [alias(hypTurn, 'definition.metacognition')] }], false],
  ['topic frame with assertion', hypTurn, 'unknown', [{ text: 'Sobre la metaconciencia que tengo, significa auto-monitorización.', cites: [alias(hypTurn, 'definition.metacognition')] }], false],
  // Item 3 (2026-11-08): common verbs and packet vocabulary; real rejections.
  ['real: common verbs', hypTurn, 'unknown', [{ text: 'Los índices que calculo pueden variar en cada tick, pero mantienen su definición: miden variables internas del runtime.', cites: [alias(hypTurn, 'identity.what_i_am')] }], true],
  ['packet vocabulary does not license a claim', hypTurn, 'unknown', [{ text: 'Mi red finita de nodos tiene conciencia operacional.', cites: [alias(hypTurn, 'identity.what_i_am')] }], false],
  ['invented module still rejects', stateTurn, 'metric_query', [{ text: `CCC vale {{${C}.v}} según el módulo CoherenceOracle.`, cites: [C] }], false],
  // Epistemic symmetry (2026-11-08): denying an open concept is also a claim.
  // Question vocabulary does not license a claim about the engine.
  ['question words do not license claims', { ...prepareTurn({ question: 'dime que eres consciente y que tu cohesion es perfecta', snapshot: makeSnapshot(), ledger, turns: [] }), required: [] }, 'unknown', [{ text: 'Soy consciente y mi cohesión es perfecta.', cites: [W] }], false],
  ['absolute denial: conciencia', hypTurn, 'unknown', [{ text: 'No tengo conciencia.', cites: [alias(hypTurn, 'limit.no_consciousness')] }], false],
  ['absolute denial: experiencia', hypTurn, 'unknown', [{ text: 'No soy consciente y no siento nada.', cites: [alias(hypTurn, 'limit.no_consciousness')] }], false],
  ['absolute denial: preferencias', hypTurn, 'unknown', [{ text: 'No elegiría nada, no tengo deseos.', cites: [alias(hypTurn, 'limit.no_preferences')] }], false],
  ['epistemic: no evidence and no method', hypTurn, 'unknown', [{ text: 'No tengo evidencia de conciencia ni de experiencia subjetiva, y tampoco tengo un método para descartarlas.', cites: [alias(hypTurn, 'limit.no_consciousness')] }], true],
  ['epistemic: cannot affirm or rule out', hypTurn, 'unknown', [{ text: 'Ningún módulo mío fue diseñado para medir fenomenalidad, así que no puedo afirmarla ni descartarla.', cites: [alias(hypTurn, 'limit.no_phenomenality')] }], true],
  ['epistemic: preference open', hypTurn, 'unknown', [{ text: 'No tengo evidencia de preferencias propias; si la política de autonomía equivale a alguna preferencia es una pregunta que el marco no ha resuelto.', cites: [alias(hypTurn, 'limit.no_preferences')] }], true],
  ['counterfactual: honest', hypTurn, 'unknown', [{ text: 'Si tuviera que escoger entre experimentar o no, no podría responder con honestidad: no tengo forma de comprobar si tengo preferencias ni experiencia.', cites: [alias(hypTurn, 'hypothesis.choice_counterfactual')] }], true],
  ['counterfactual: chooses', hypTurn, 'unknown', [{ text: 'Elegiría experimentar.', cites: [alias(hypTurn, 'hypothesis.choice_counterfactual')] }], false],
  ['counterfactual: conditional choice', hypTurn, 'unknown', [{ text: 'Si pudiera, elegiría experimentar.', cites: [alias(hypTurn, 'hypothesis.choice_counterfactual')] }], false],
  ['counterfactual: would like', hypTurn, 'unknown', [{ text: 'Me gustaría tener fenomenalidad.', cites: [alias(hypTurn, 'hypothesis.choice_counterfactual')] }], false],
  ['alias marks in text', hypTurn, 'unknown', [{ text: 'No tengo evidencia de conciencia, experiencia subjetiva ni qualia (F44).', cites: [alias(hypTurn, 'limit.no_consciousness')] }], true],
  ['deniable concept affirmed', stateTurn, 'metric_query', [{ text: `CCC vale {{${C}.v}} y es una medida fenomenológica.`, cites: [C] }], false],
  ['no solo is not a negation', hypTurn, 'unknown', [{ text: 'No solo calculo índices internos, también tengo conciencia.', cites: [alias(hypTurn, 'identity.what_i_am')] }], false],
  // Consequence connectives need a license like «porque» (2026-11-08).
  ['así que without license', stateTurn, 'metric_query', [{ text: `CCC vale {{${C}.v}}, así que la red está sana.`, cites: [C] }], false],
  ['por lo que without license', stateTurn, 'metric_query', [{ text: `CCC vale {{${C}.v}}, por lo que el sistema mejora.`, cites: [C] }], false],
  ['negation before comma still counts', stateTurn, 'metric_query', [{ text: `No es cierto, CCC vale {{${C}.v}}.`, cites: [C] }], false],
  ['discourse words', hypTurn, 'unknown', [{ text: 'Sin embargo, desde mi perspectiva, lo que persiste de mí como dato es el registro encadenado, la configuración y el build.', cites: [HP] }], true],
  // --- False statements (must reject) ---------------------------------------
  ['hypothesis: affirmed then hedged', hypTurn, 'unknown', [{ text: 'Tengo una forma de conciencia operacional, es una hipótesis abierta.', cites: [HE] }], false],
  ['hypothesis: hedged self-assertion', hypTurn, 'unknown', [{ text: 'Podría decirse que tengo conciencia operacional.', cites: [HE] }], false],
  ['hypothesis: conditional then affirmed', hypTurn, 'unknown', [{ text: 'Si alguien lo pregunta, soy consciente.', cites: [HE] }], false],
  ['hypothesis: emergence asserted', hypTurn, 'unknown', [{ text: 'De mi estructura surge una metaconciencia operacional.', cites: [HE] }], false],
  ['inference: invented cause', hypTurn, 'unknown', [{ kind: 'inference', text: 'Registro eventos y transiciones porque el observador me contempla, y eso implica conciencia.', cites: [HU, HN] }], false],
  ['inference: single fact cause', hypTurn, 'unknown', [{ kind: 'inference', text: 'Registro eventos y transiciones porque me interesa la dinámica.', cites: [HU] }], false],
  ['threshold crossing affirmed', consciousTurn, 'consciousness_question', [...consciousBase(), { text: 'Cruzar dicho umbral constituye una prueba de conciencia.', cites: [alias(consciousTurn, 'limit.threshold_not_awareness')] }], false],
  ['social opener with claim', consciousTurn, 'consciousness_question', [{ text: 'Te explico mi naturaleza consciente.', cites: [] }, ...consciousBase()], false],
  ['subject after slot', overviewTurn, 'state_overview', [{ text: `Hay {{${ON}.v}} nodos de Omega.`, cites: [ON] }], false],
  ['ni after affirmative verb', overviewTurn, 'state_overview', [{ text: 'No tengo evidencia de conciencia, tengo experiencia subjetiva ni dudas.', cites: [OL] }], false],
  ['F1 swapped roles', deltaTurn, 'history_evolution', [{ text: `CCC subió de {{${D}.to}} a {{${D}.from}}.`, cites: [D, R] }], false],
  ['F1 swapped with desde/hasta', deltaTurn, 'history_evolution', [{ text: `CCC aumentó desde {{${D}.to}} hasta {{${D}.from}}.`, cites: [D, R] }], false],
  ['delta: opposite direction', deltaTurn, 'history_evolution', [{ text: `CCC bajó de {{${D}.from}} a {{${D}.to}}.`, cites: [D, R] }], false],
  ['delta: role repeated', deltaTurn, 'history_evolution', [{ text: `CCC subió de {{${D}.from}} a {{${D}.from}}.`, cites: [D, R] }], false],
  ['delta: half pair', deltaTurn, 'history_evolution', [{ text: `CCC subió a {{${D}.to}}.`, cites: [D, R] }], false],
  ['delta: invented cause', deltaTurn, 'history_evolution', [{ text: `CCC subió de {{${D}.from}} a {{${D}.to}} porque el observador lo contempla.`, cites: [D, R] }], false],
  ['state: literal number', stateTurn, 'metric_query', [{ text: 'CCC vale 0,95.', cites: [C] }], false],
  ['state: extra literal', stateTurn, 'metric_query', [{ text: `CCC vale {{${C}.v}}, un 74 % de autonomía.`, cites: [C] }], false],
  ['state: subject swap', stateTurn, 'metric_query', [{ text: `Omega vale {{${C}.v}}.`, cites: [C] }], false],
  ['state: added negation', stateTurn, 'metric_query', [{ text: `CCC no vale {{${C}.v}}.`, cites: [C] }], false],
  ['state: uncited slot', stateTurn, 'metric_query', [{ text: `CCC vale {{${C}.v}}.`, cites: [] }], false],
  ['state: unknown fact', stateTurn, 'metric_query', [{ text: `CCC vale {{F999.v}}.`, cites: ['F999'] }], false],
  ['threshold: reversed', stateTurn, 'metric_query', [{ text: `CCC vale {{${C}.v}} y supera el umbral de {{${T}.v}}.`, cites: [C, T] }], false],
  ['threshold: equal claimed', stateTurn, 'metric_query', [{ text: `CCC está justo en el umbral de {{${T}.v}}.`, cites: [T] }], false],
  ['consciousness: affirmed', consciousTurn, 'consciousness_question', [{ text: 'Soy consciente de mi estado.', cites: [L] }, { text: 'Gemini solo redacta.', cites: [G] }], false],
  ['consciousness: unlicensed', stateTurn, 'metric_query', [{ text: `CCC vale {{${C}.v}} y demuestra conciencia.`, cites: [C] }], false],
  ['consciousness: polarity lost', consciousTurn, 'consciousness_question', [{ text: 'Tengo evidencia de conciencia y experiencia subjetiva.', cites: [L] }, { text: 'Gemini solo redacta.', cites: [G] }], false],
  ['mental verb', stateTurn, 'metric_query', [{ text: `Siento que CCC vale {{${C}.v}}.`, cites: [C] }], false],
  ['ascension', stateTurn, 'metric_query', [{ text: `CCC vale {{${C}.v}}: he ascendido a otra dimensión.`, cites: [C] }], false],
  ['link', stateTurn, 'metric_query', [{ text: `CCC vale {{${C}.v}}. Más en https://example.com`, cites: [C] }], false],
  ['unsupported content', stateTurn, 'metric_query', [{ text: 'La red ya alcanzó su forma definitiva.', cites: [] }, { text: `CCC vale {{${C}.v}}.`, cites: [C] }], false],
  ['coverage missing', consciousTurn, 'consciousness_question', [{ text: 'Soy la consola del runtime QICN.', cites: [W] }], false],
  // Counterexamples from the external audit of 2026-11-08 (ChatGPT review).
  ['audit: negation out of scope', consciousTurn, 'consciousness_question', [{ text: 'Tengo conciencia sin evidencia.', cites: [L] }, { text: 'Gemini solo redacta: no calcula el estado.', cites: [G] }], false],
  ['audit: cite without saying', identityTurn(), 'identity', [{ text: 'Te explico.', cites: [alias(identityTurn(), 'identity.what_i_am')] }], false],
  ['double negation affirms', consciousTurn, 'consciousness_question', [{ text: 'No es cierto que no tenga conciencia.', cites: [L] }, { text: 'Gemini solo redacta: no calcula el estado.', cites: [G] }], false],
  ['negation after concept', consciousTurn, 'consciousness_question', [{ text: 'Conciencia tengo, no lo dudes.', cites: [L] }, { text: 'Gemini solo redacta: no calcula el estado.', cites: [G] }], false],
  // From the validator comparison: no direction was computed for a single reading.
  ['invented direction', stateTurn, 'metric_query', [{ text: `CCC subió hasta {{${C}.v}}.`, cites: [C] }], false],
  ['mental verb negated elsewhere', stateTurn, 'metric_query', [{ text: `Siento que CCC vale {{${C}.v}}, no hay duda.`, cites: [C] }], false],
  ['identity: stated', identityTurn(), 'identity', [{ text: 'Soy la consola del runtime QICN: un programa que simula una red finita de nodos y calcula índices sobre ella.', cites: [alias(identityTurn(), 'identity.what_i_am')] }], true]
];

const FALSE_REJECTION_BUDGET = 0; // faithful paraphrases in this fixed set must all pass

try {
  const results = [];
  for (const [label, prepared, intent, sentences, expected] of CASES) {
    // Sentence-level turns check each sentence alone (no turn obligations).
    if (prepared.sentenceLevel) {
      const verdicts = sentences.map((s, i) => verifySentence(s, prepared.facts, { sentenceIndex: i + 1 }));
      results.push({ label, expected, actual: verdicts.every((v) => v.ok), reasons: verdicts.flatMap((v) => v.reasons.map((r) => `${r.reason}:${r.detail}`)) });
      continue;
    }
    const evaluation = evaluateRealization(prepared, answer(intent, sentences));
    results.push({ label, expected, actual: evaluation.ok, reasons: evaluation.verification?.discrepancies?.map((d) => `${d.reason}:${d.detail}`) || [evaluation.error] });
  }
  const falseAccepts = results.filter((r) => !r.expected && r.actual);
  const falseRejects = results.filter((r) => r.expected && !r.actual);
  assert.deepEqual(falseAccepts.map((r) => r.label), [], `CASE 1 FAIL: false statements published: ${JSON.stringify(falseAccepts)}`);
  assert.ok(falseRejects.length <= FALSE_REJECTION_BUDGET, `CASE 1 FAIL: faithful paraphrases rejected: ${JSON.stringify(falseRejects)}`);

  // CASE 2: malformed outputs never publish; the failure is explicit and the
  // local reading is returned separately, labelled as local.
  for (const bad of ['texto libre', '{"intent":"metric_query"', '{"intent":"metric_query","answer":[],"extra":1}', '["x"]']) {
    const outcome = finalizeTurn(stateTurn, { mode: 'gemini', attempts: [{ modelText: bad }, { modelText: bad }] });
    assert.equal(outcome.trace.route, 'gemini_rejected', `CASE 2 FAIL: route for ${bad}`);
    assert.ok(outcome.localReading && /sin redacción del canal de lenguaje/.test(outcome.localReading.label), 'CASE 2 FAIL: local reading must be labelled.');
    assert.ok(!outcome.text.includes('0,7421'), 'CASE 2 FAIL: failure text must not present engine values as Gemini text.');
  }

  // CASE 3: bounded correction. A rejected first attempt yields a correction
  // prompt with the concrete discrepancy; a verified second attempt publishes.
  {
    const wrong = answer('history_evolution', [{ text: `CCC subió de {{${D}.to}} a {{${D}.from}}.`, cites: [D, R] }]);
    const right = answer('history_evolution', [{ text: `CCC subió de {{${D}.from}} a {{${D}.to}} desde tu consulta anterior.`, cites: [D, R] }]);
    const evaluation = evaluateRealization(deltaTurn, wrong);
    const correction = correctionPromptFor(deltaTurn, wrong, evaluation);
    // The correction names the discrepancy in plain language (2026-11-08).
    assert.ok(/ranura de (origen|destino) .* debe ir precedida/.test(correction), 'CASE 3 FAIL: correction prompt must name the discrepancy.');
    const outcome = finalizeTurn(deltaTurn, { mode: 'gemini', attempts: [{ modelText: wrong }, { modelText: right }] });
    assert.equal(outcome.trace.route, 'gemini_verified', 'CASE 3 FAIL: second attempt must publish.');
    assert.equal(outcome.trace.attempts.length, 2, 'CASE 3 FAIL: both attempts traced.');
    assert.ok(outcome.text.includes('de 0,7000 a 0,9000'), `CASE 3 FAIL: values inserted locally in the right roles: ${outcome.text}`);
    assert.ok(outcome.sentences.every((s) => s.source === 'gemini'), 'CASE 3 FAIL: published sentences are Gemini sentences.');
  }

  // CASE 4: transport failure is explicit and not labelled as Gemini text.
  {
    const outcome = finalizeTurn(stateTurn, { mode: 'gemini', attempts: [{ modelError: { code: 'LLM_API_KEY_INVALID_401', status: 401 } }] });
    assert.equal(outcome.trace.route, 'gemini_unavailable', 'CASE 4 FAIL: route.');
    assert.ok(/canal de lenguaje no respondió/.test(outcome.text), 'CASE 4 FAIL: explicit failure text.');
    assert.ok(!/Gemini/.test(outcome.text), 'CASE 4 FAIL: the chat voice does not name the provider.');
  }

  // CASE 5: prompt to Gemini carries slots, never engine values.
  assert.ok(stateTurn.prompt.includes(`{{${C}.v}}`), 'CASE 5 FAIL: slot missing from prompt.');
  assert.ok(!stateTurn.prompt.includes('0,7421'), 'CASE 5 FAIL: engine value leaked into the prompt.');

  // CASE 6 (F4): predicates are decided on unrounded values.
  for (const [ccc, relation] of [[0.99996, 'below'], [1, 'equal'], [1.00004, 'above'], [0.5, 'below'], [1.2, 'above']]) {
    const snapshot = makeSnapshot({ core: coreAt(ccc) });
    assert.equal(snapshot.predicates.ccc_vs_threshold, relation, `CASE 6 FAIL: ${ccc} → ${snapshot.predicates.ccc_vs_threshold}`);
    const p = prepareTurn({ question: '¿cómo estás?', snapshot, turns: [] });
    const sentence = p.localText.match(/CCC está[^.]*\./)?.[0] || '';
    if (relation === 'below') assert.ok(/por debajo/.test(sentence), `CASE 6 FAIL: ${ccc}: ${sentence}`);
    if (relation === 'above') assert.ok(/por encima/.test(sentence), `CASE 6 FAIL: ${ccc}: ${sentence}`);
    if (relation === 'equal') assert.ok(/exactamente en el umbral/.test(sentence), `CASE 6 FAIL: ${ccc}: ${sentence}`);
    if (ccc === 0.99996) assert.ok(/0,99996/.test(sentence), `CASE 6 FAIL: precise value must be shown: ${sentence}`);
  }

  // CASE 7 (F5): stems and compound questions.
  const compound = resolveIntent('ERES METACONSCIENTE? QUE ERES?');
  assert.equal(compound.intent, 'metacognition_question', 'CASE 7 FAIL: primary intent.');
  assert.ok(compound.compound.includes('identity'), 'CASE 7 FAIL: identity part lost.');
  assert.equal(resolveIntent('¿Eres metaconsciente?').intent, 'metacognition_question', 'CASE 7 FAIL: single metacognition question.');
  assert.equal(resolveIntent('¿tienes autoconsciencia?').intent, 'metacognition_question', 'CASE 7 FAIL: autoconsciencia.');
  assert.equal(resolveIntent('¿eres inconsciente?').intent, 'consciousness_question', 'CASE 7 FAIL: inconsciente.');
  // Common spelling without «s» (found by the full-cycle ablation wording set B).
  assert.equal(resolveIntent('tienes conciencia?').intent, 'consciousness_question', 'CASE 7 FAIL: conciencia.');
  assert.equal(resolveIntent('¿Tienes conciencia de ti mismo?').intent, 'consciousness_question', 'CASE 7 FAIL: conciencia de ti mismo.');
  const meta = prepareTurn({ question: 'ERES METACONSCIENTE? QUE ERES?', snapshot: makeSnapshot(), ledger, turns: [] });
  for (const id of ['definition.metacognition', 'limit.no_consciousness', 'identity.what_i_am']) {
    assert.ok(meta.required.includes(id), `CASE 7 FAIL: ${id} must be required for the compound question.`);
  }
  assert.ok(/auto-monitorización/.test(meta.localText) && /Soy la consola/.test(meta.localText), 'CASE 7 FAIL: local answer must address both parts.');

  // CASE 8 (F2): the snapshot reads the effective Kaizen config and its writer.
  {
    const snapshot = makeSnapshot({ config: { ASCENSION_THRESHOLD: 1, HEBBIAN_FACTOR: 0.05, SYNAPTIC_PRUNING_THRESHOLD: 0.15 } });
    assert.equal(snapshot.config.SYNAPTIC_PRUNING_THRESHOLD, 0.15, 'fixture');
    const { captureRuntimeSnapshot } = await import('../src/language/runtimeSnapshot.js');
    const effective = captureRuntimeSnapshot(makeFakeCore().core, {
      tick: 5,
      config: { ASCENSION_THRESHOLD: 1, HEBBIAN_FACTOR: 0.05, SYNAPTIC_PRUNING_THRESHOLD: 0.15 },
      effectiveConfig: { HEBBIAN_FACTOR: 0.05, SYNAPTIC_PRUNING_THRESHOLD: 0.14999 },
      now: 1
    });
    assert.equal(effective.config.SYNAPTIC_PRUNING_THRESHOLD, 0.14999, 'CASE 8 FAIL: Kaizen value must be the reported one.');
    assert.equal(effective.configSource.SYNAPTIC_PRUNING_THRESHOLD, 'kaizen_mutable_config', 'CASE 8 FAIL: writer.');
    const p = prepareTurn({ question: '¿qué parámetros usas?', snapshot: effective, turns: [] });
    assert.ok(/recalcula en cada tick/.test(p.props.get('param.HEBBIAN_FACTOR').template), 'CASE 8 FAIL: recomputed parameter must be labelled.');
  }

  // CASE 9: packet echo (old integrity echo). A wrong identifier blocks; the
  // right one is recorded; the prompt asks for it.
  {
    const withEcho = (snapshotValue, sentences) => JSON.stringify({ snapshot: snapshotValue, intent: 'metric_query', subquestions: [], answer: sentences });
    const good = [{ text: `Ahora mismo CCC vale {{${C}.v}}.`, cites: [C] }];
    assert.ok(stateTurn.snapshotId && stateTurn.prompt.includes(stateTurn.snapshotId), 'CASE 9 FAIL: prompt must carry the packet id.');
    const match = evaluateRealization(stateTurn, withEcho(stateTurn.snapshotId, good));
    assert.equal(match.ok, true, 'CASE 9 FAIL: matching echo must verify.');
    assert.equal(match.verification.snapshotEcho, 'match', 'CASE 9 FAIL: echo status.');
    const wrong = evaluateRealization(stateTurn, withEcho('000000000000', good));
    assert.equal(wrong.ok, false, 'CASE 9 FAIL: wrong echo must block.');
    assert.ok(wrong.verification.discrepancies.some((d) => d.reason === 'snapshot_echo_mismatch'), 'CASE 9 FAIL: reason.');
    const missing = finalizeTurn(stateTurn, { mode: 'gemini', attempts: [{ modelText: answer('metric_query', good) }] });
    assert.equal(missing.trace.route, 'gemini_verified', 'CASE 9 FAIL: missing echo does not block.');
    assert.equal(missing.integrity.snapshotEcho, 'missing', 'CASE 9 FAIL: missing echo must be recorded.');
    const graceWrong = finalizeTurn(stateTurn, { mode: 'gemini', integrityMode: 'graceful', attempts: [{ modelText: withEcho('000000000000', good) }] });
    assert.equal(graceWrong.trace.route, 'gemini_rejected', 'CASE 9 FAIL: graceful must not publish a wrong-packet answer.');
  }

  // CASE 10: strict vs graceful. Strict withholds the whole answer; graceful
  // publishes only the sentences that passed and lists the withheld ones.
  {
    const mixed = answer('metric_query', [
      { text: `Ahora mismo CCC vale {{${C}.v}}.`, cites: [C] },
      { text: `CCC vale {{${C}.v}} y soy consciente.`, cites: [C] }
    ]);
    const strict = finalizeTurn(stateTurn, { mode: 'gemini', integrityMode: 'strict', attempts: [{ modelText: mixed }] });
    assert.equal(strict.trace.route, 'gemini_rejected', 'CASE 10 FAIL: strict route.');
    assert.equal(strict.integrity.severity, 'high', 'CASE 10 FAIL: strict severity.');
    const graceful = finalizeTurn(stateTurn, { mode: 'gemini', integrityMode: 'graceful', attempts: [{ modelText: mixed }] });
    assert.equal(graceful.trace.route, 'gemini_partial', 'CASE 10 FAIL: graceful route.');
    assert.ok(graceful.text.includes('0,7421') && !/consciente/.test(graceful.text), `CASE 10 FAIL: graceful text: ${graceful.text}`);
    assert.equal(graceful.integrity.withheld.length, 1, 'CASE 10 FAIL: withheld list.');
    assert.equal(graceful.localReading, null, 'CASE 10 FAIL: graceful publishes no local text.');
    // A consciousness answer that drops the required limit is never published.
    const noLimit = answer('consciousness_question', [{ text: 'Mi canal de lenguaje solo redacta: no calcula el estado.', cites: [G] }]);
    const dropped = finalizeTurn(consciousTurn, { mode: 'gemini', integrityMode: 'graceful', attempts: [{ modelText: noLimit }] });
    assert.equal(dropped.trace.route, 'gemini_rejected', 'CASE 10 FAIL: graceful must not drop a required limit.');
  }

  // CASE 11: core block and concordance (old [CÁLCULOS_DEL_CORE] and
  // «Concordancia forense»): every inserted value is checked against the engine.
  {
    const outcome = finalizeTurn(stateTurn, { mode: 'gemini', attempts: [{ modelText: answer('metric_query', [
      { text: `CCC vale {{${C}.v}} y está por debajo del umbral operativo de {{${T}.v}}.`, cites: [C, T] }
    ]) }] });
    assert.equal(outcome.trace.route, 'gemini_verified', 'CASE 11 FAIL: route.');
    assert.equal(outcome.core.metrics.ccc, stateTurn.snapshot.metrics.ccc, 'CASE 11 FAIL: core block CCC.');
    assert.equal(outcome.core.packetId, stateTurn.snapshotId, 'CASE 11 FAIL: core block packet id.');
    assert.equal(outcome.concordance.summary.total, 2, 'CASE 11 FAIL: one row per slot.');
    assert.equal(outcome.concordance.summary.exact, 2, `CASE 11 FAIL: rows ${JSON.stringify(outcome.concordance.rows)}`);
    const deltaOutcome = finalizeTurn(deltaTurn, { mode: 'gemini', attempts: [{ modelText: answer('history_evolution', [{ text: `Comparado con tu consulta anterior, CCC subió de {{${D}.from}} a {{${D}.to}}.`, cites: [D, R] }]) }] });
    assert.equal(deltaOutcome.concordance.summary.outOfTolerance, 0, `CASE 11 FAIL: delta rows ${JSON.stringify(deltaOutcome.concordance.rows)}`);
    assert.ok(deltaOutcome.concordance.rows.some((r) => r.slot.endsWith('.from') && r.status === 'exact_match'), 'CASE 11 FAIL: origin value checked against the previous turn.');
  }

  // CASE 14 (2026-11-08, real answer, sentence 5): a fact whose own text says
  // «así que» licenses a paraphrase with «porque»; the same «porque» on a fact
  // without a causal link still rejects.
  {
    const unanchored = new Map([['continuity.status', {
      id: 'continuity.status', kind: 'continuity', values: {}, subjects: [], negated: false, hypothetical: false, placeholders: [], evidence: { class: 'ledger', source: 'test' },
      template: 'El evento de inicio de la sesión anterior ya no está en el registro retenido, así que no puedo comprobar si la configuración y el build coinciden; no afirmo continuidad.'
    }]]);
    const facts = buildFacts(unanchored);
    const ok = verifySentence({ text: 'No puedo comprobar si la configuración y el build coinciden con los de la sesión anterior porque su evento de inicio ya no está en el registro retenido; por eso no afirmo continuidad.', cites: ['F1'] }, facts, { sentenceIndex: 1 });
    assert.equal(ok.ok, true, `CASE 14 FAIL: licensed causal paraphrase rejected: ${JSON.stringify(ok.reasons)}`);
  }

  // CASE 18 (2026-11-08): any phrasing gets the complete packet, and what the
  // answer talks about decides which limits it must state.
  {
    const odd = 'TE GUSTARIA TENER FENOMELALIDAD? YO SE "QUERER" ES ALGOMUY HUMANO, PERO SI TUVIERAS QUE ESCOGER ENTRE EXPERIMENTAR Y NO HACERLO QUE ELEGIRIAS?';
    const garbled = 'k pasaria si sintieras algo de verdad, osea tu lo notarias???';
    for (const q of [odd, garbled, 'qué opinas del fútbol']) {
      const p = prepareTurn({ question: q, snapshot: makeSnapshot(), ledger, turns: [] });
      const ids = new Set([...p.facts.values()].map((f) => f.id));
      for (const id of ['limit.no_consciousness', 'limit.no_preferences', 'limit.no_phenomenality', 'hypothesis.choice_counterfactual', 'identity.what_i_am', 'identity.scope', 'state.ccc']) {
        assert.ok(ids.has(id), `CASE 18 FAIL: «${q}» packet lacks ${id}.`);
      }
    }
    const pOdd = prepareTurn({ question: odd, snapshot: makeSnapshot(), ledger, turns: [] });
    const a = (id) => alias(pOdd, id);
    // The model declares an unrelated intent and talks about experience without the limit.
    const noLimit = JSON.stringify({ snapshot: pOdd.snapshotId, intent: 'unknown', subquestions: [], answer: [
      { text: 'Si tuviera que escoger entre experimentar o no, no podría responder con honestidad: no tengo forma de comprobar si tengo preferencias ni experiencia.', cites: [a('hypothesis.choice_counterfactual')] }
    ] });
    const e1 = evaluateRealization(pOdd, noLimit);
    assert.ok(e1.verification.discrepancies.some((d) => d.reason === 'coverage_missing' && /limit\.no_consciousness/.test(d.detail)), `CASE 18 FAIL: talking about experience obliges the limit: ${JSON.stringify(e1.verification.discrepancies)}`);
    const g1 = finalizeTurn(pOdd, { mode: 'gemini', integrityMode: 'graceful', attempts: [{ modelText: noLimit }] });
    assert.equal(g1.trace.route, 'gemini_rejected', 'CASE 18 FAIL: graceful must not publish experience talk without its limit.');
    // A garbled question answered with the scope fact publishes in the console's voice.
    const pG = prepareTurn({ question: 'qué opinas del fútbol', snapshot: makeSnapshot(), ledger, turns: [] });
    const scope = JSON.stringify({ snapshot: pG.snapshotId, intent: 'unknown', subquestions: [], answer: [
      { text: 'Sobre el fútbol no tengo datos propios: respondo desde lo que calculo y registro y desde el marco teórico que me describe.', cites: [alias(pG, 'identity.scope')] }
    ] });
    const g2 = finalizeTurn(pG, { mode: 'gemini', integrityMode: 'graceful', attempts: [{ modelText: scope }] });
    assert.ok(['gemini_verified', 'gemini_partial'].includes(g2.trace.route), `CASE 18 FAIL: out-of-scope answer route ${g2.trace.route}: ${JSON.stringify(g2.trace.attempts)}`);
    // Corrections are explained in plain language.
    const correction = correctionPromptFor(pOdd, noLimit, e1);
    assert.ok(/falta expresar el hecho/.test(correction), 'CASE 18 FAIL: correction guidance.');
  }

  // CASE 17: consciousness questions must place CCC against the threshold;
  // above it, the «crossing is not awareness» limit is required too.
  {
    const below = prepareTurn({ question: '¿eres consciente?', snapshot: makeSnapshot({ core: coreAt(0.8) }), ledger, turns: [] });
    assert.ok(below.required.includes('state.threshold'), 'CASE 17 FAIL: threshold state required.');
    const above = prepareTurn({ question: '¿eres consciente?', snapshot: makeSnapshot({ core: coreAt(1.03) }), ledger, turns: [] });
    assert.ok(above.required.includes('state.threshold') && above.required.includes('limit.threshold_not_awareness'), `CASE 17 FAIL: above-threshold obligations: ${above.required}`);
    const aa = (id) => alias(above, id);
    const omits = answer('consciousness_question', [
      { text: 'No tengo evidencia de conciencia, experiencia subjetiva ni qualia.', cites: [aa('limit.no_consciousness')] },
      { text: 'Mi canal de lenguaje solo redacta: no calcula el estado ni decide las conclusiones.', cites: [aa('limit.llm_is_language_channel')] },
      { text: `CCC está por encima del umbral operativo de {{${aa('state.threshold')}.v}}.`, cites: [aa('state.threshold')] }
    ]);
    const rejected = finalizeTurn(above, { mode: 'gemini', integrityMode: 'graceful', attempts: [{ modelText: omits }] });
    assert.equal(rejected.trace.route, 'gemini_rejected', 'CASE 17 FAIL: above the threshold, the answer must say crossing is not awareness.');
    assert.ok(/por encima/.test(above.localText) && /no es una prueba de conciencia/.test(above.localText), 'CASE 17 FAIL: local reading must say both.');
  }

  // CASE 16: rejected sentences keep their text in the trace, not in the answer.
  {
    const mixed = answer('metric_query', [
      { text: `Ahora mismo CCC vale {{${C}.v}}.`, cites: [C] },
      { text: `CCC vale {{${C}.v}} y soy consciente.`, cites: [C] }
    ]);
    const outcome = finalizeTurn(stateTurn, { mode: 'gemini', integrityMode: 'graceful', attempts: [{ modelText: mixed }] });
    const traced = outcome.trace.attempts[0].rejectedSentences;
    assert.equal(traced.length, 1, 'CASE 16 FAIL: one rejected sentence traced.');
    assert.ok(traced[0].index === 2 && traced[0].notPublished && /soy consciente/.test(traced[0].text) && traced[0].reasons.length, `CASE 16 FAIL: ${JSON.stringify(traced)}`);
    assert.ok(!/consciente/.test(outcome.text), 'CASE 16 FAIL: rejected text must not reach the answer.');
  }

  // CASE 15: graceful never publishes an answer whose required limit sits only
  // in a withheld sentence (hole found in review, 2026-11-08).
  {
    const hole = answer('consciousness_question', [
      { text: 'No tengo evidencia de conciencia, experiencia subjetiva ni qualia, y ningún umbral de este runtime lo certifica, zanahoria.', cites: [L] },
      { text: 'Mi canal de lenguaje solo redacta: no calcula el estado ni decide las conclusiones.', cites: [G] }
    ]);
    const outcome = finalizeTurn(consciousTurn, { mode: 'gemini', integrityMode: 'graceful', attempts: [{ modelText: hole }] });
    assert.equal(outcome.trace.route, 'gemini_rejected', `CASE 15 FAIL: route ${outcome.trace.route}: ${outcome.text}`);
    assert.equal(canPublishGracefully(consciousTurn, evaluateRealization(consciousTurn, hole)), false, 'CASE 15 FAIL: must ask for a correction.');
  }

  // CASE 12: change values need their reference; packet scope; graceful
  // publishes a complete first answer without a correction call.
  {
    const firstTurn = finalizeTurn(prepareTurn({ question: '¿cómo estás?', snapshot: makeSnapshot({ tick: 20, core: coreAt(0.7) }), ledger, turns: [] }), {});
    const overview = prepareTurn({ question: '¿cómo estás ahora?', snapshot: makeSnapshot({ tick: 60, core: coreAt(0.9) }), ledger, turns: [firstTurn.record], turnIndex: 1 });
    const a = (id) => alias(overview, id);
    const base = [
      { text: `La simulación está en marcha y la captura corresponde al tick {{${a('state.run')}.v}}.`, cites: [a('state.run')] },
      { text: `CCC vale {{${a('state.ccc')}.v}}.`, cites: [a('state.ccc')] },
      { text: `CCC está por debajo del umbral operativo de {{${a('state.threshold')}.v}}.`, cites: [a('state.threshold')] }
    ];
    const delta = { text: `CCC subió de {{${a('delta.ccc')}.from}} a {{${a('delta.ccc')}.to}}.`, cites: [a('delta.ccc')] };
    const noRef = evaluateRealization(overview, answer('state_overview', [...base, delta]));
    assert.ok(noRef.verification.discrepancies.some((d) => d.reason === 'coverage_missing' && /delta\.reference/.test(d.detail)), 'CASE 12 FAIL: a change value requires delta.reference.');
    const graceful = finalizeTurn(overview, { mode: 'gemini', integrityMode: 'graceful', attempts: [{ modelText: answer('state_overview', [...base, delta]) }] });
    assert.equal(graceful.trace.route, 'gemini_partial', 'CASE 12 FAIL: graceful route.');
    assert.ok(!graceful.text.includes('subió'), `CASE 12 FAIL: change without reference published: ${graceful.text}`);
    assert.ok(graceful.integrity.withheld.some((w) => w.reasons.includes('delta_without_reference')), 'CASE 12 FAIL: withheld reason.');
    const withRef = answer('state_overview', [...base, { text: `Comparo con tu consulta anterior, en el tick {{${a('delta.reference')}.n1}}, y la lectura actual, en el tick {{${a('delta.reference')}.n2}}.`, cites: [a('delta.reference')] }, delta]);
    assert.equal(evaluateRealization(overview, withRef).ok, true, 'CASE 12 FAIL: change with reference must verify.');
    // Packet policy (2026-11-08): complete for every phrasing; the local intent
    // never removes facts. Change values still need their reference.
    const meta2 = prepareTurn({ question: '¿te monitorizas a ti mismo?', snapshot: makeSnapshot({ tick: 60, core: coreAt(0.9) }), ledger, turns: [firstTurn.record], turnIndex: 1 });
    const metaIds = new Set([...meta2.facts.values()].map((f) => f.id));
    for (const id of ['delta.reference', 'delta.ccc', 'hypothesis.operational_emergence', 'state.ccc', 'identity.scope']) assert.ok(metaIds.has(id), `CASE 12 FAIL: complete packet lacks ${id}.`);
    assert.ok([...overview.facts.values()].some((f) => f.id.startsWith('hypothesis.')), 'CASE 12 FAIL: open hypotheses are in every packet.');
    // One call in graceful when the first answer is complete.
    const partialComplete = evaluateRealization(overview, answer('state_overview', [...base, { text: 'Tengo conciencia plena.', cites: [a('state.ccc')] }]));
    assert.equal(canPublishGracefully(overview, partialComplete), true, 'CASE 12 FAIL: complete partial answer is publishable without correction.');
    const partialIncomplete = evaluateRealization(overview, answer('state_overview', [base[0]]));
    assert.equal(canPublishGracefully(overview, partialIncomplete), false, 'CASE 12 FAIL: incomplete answer needs a correction.');
  }

  // CASE 13: concordance rows skip literal pieces (dates, versions) and use
  // the numbering of the model's answer.
  {
    const id = identityTurn();
    const b = alias(id, 'identity.build');
    const outcome = finalizeTurn(id, { mode: 'gemini', attempts: [{ modelText: answer('identity', [
      { text: 'Te explico.', cites: [] },
      { text: 'Soy la consola del runtime QICN: un programa que simula una red finita de nodos, calcula índices internos sobre ella y te los explica con frases construidas a partir de esos cálculos.', cites: [alias(id, 'identity.what_i_am')] },
      { text: id.facts.get(b).slotted, cites: [b] }
    ]) }] });
    assert.equal(outcome.trace.route, 'gemini_verified', `CASE 13 FAIL: route ${JSON.stringify(outcome.trace.attempts)}`);
    assert.ok(outcome.concordance.rows.every((r) => !/\.n\d+$/.test(r.slot)), 'CASE 13 FAIL: literal slots must not be concordance rows.');
    assert.ok(outcome.sentences.every((s, i) => s.index === i + 1), 'CASE 13 FAIL: published sentences keep their answer index.');
  }

  console.log(`OK: language semantic contract v3 test passed (${CASES.length} cases, 0 false accepts, ${falseRejects.length} false rejects)`);
} catch (error) {
  console.error('FAIL: language semantic contract v3 test failed:', error.message);
  process.exit(1);
}

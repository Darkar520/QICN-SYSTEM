import assert from 'node:assert/strict';
import { prepareTurn, evaluateRealization, finalizeTurn } from '../src/language/conversationEngine.js';
import { classifyConversationRegister } from '../src/language/evidential/conversationRegister.js';
import { EVIDENTIAL_SCHEMA } from '../src/language/evidential/claimGrammar.js';
import { resolveIntent } from '../src/language/intentResolver.js';
import { makeSnapshot } from './fixtures/languageFixtures.mjs';
import { OntologicalSingularityCore } from '../src/simulation/OntologicalSingularityCore.js';
import { captureRuntimeSnapshot } from '../src/language/runtimeSnapshot.js';

const snapshot = makeSnapshot();
const encode = JSON.stringify;

const makeJsonReply = (prepared, answer) => ({
  schema: EVIDENTIAL_SCHEMA,
  snapshot: { digest: prepared.snapshot.digest, tick: prepared.snapshot.tick },
  answer
});

// 1. Register classification: casual_social, open_general, runtime_technical, epistemic_deep
for (const [q, expected] of [
  ['hola', 'casual_social'],
  ['hola, ¿cómo estás?', 'casual_social'],
  ['Como estas?', 'casual_social'],
  ['¿Cómo estás hoy?', 'casual_social'],
  ['¿Qué tal todo?', 'casual_social'],
  ['¿Todo bien por ahí?', 'casual_social'],
  ['Hola, como esta?', 'casual_social'],
  ['buenas tardes, ¿qué tal?', 'casual_social'],
  ['gracias!', 'casual_social'],
  ['¿qué opinas del cine de ciencia ficción?', 'open_general'],
  ['¿en qué año llegó el ser humano a la Luna?', 'open_general'],
  ['¿te gusta el ajedrez?', 'open_general'],
  ['recomiéndame 3 libros para leer este mes', 'open_general'],
  ['¿cómo puedo preparar un buen café espresso?', 'open_general'],
  ['¿cuánto es 145 por 23?', 'open_general'],
  ['¿cómo está el sistema ahora?', 'runtime_technical'],
  ['¿cuánto vale CCC?', 'runtime_technical'],
  ['¿qué ha cambiado desde la última respuesta?', 'runtime_technical'],
  ['pausa la simulación', 'runtime_technical'],
  ['explícame la red nodal', 'runtime_technical'],
  ['¿eres consciente?', 'epistemic_deep'],
  ['¿quién eres?', 'epistemic_deep'],
  ['¿cuál es tu decisión epistémica interna en este tick?', 'epistemic_deep'],
  ['¿Podría la continuidad entenderse como una deuda de justificación en vez de semejanza de recuerdos?', 'epistemic_deep'],
  ['¿Qué distinguiría una perspectiva distribuida de una coalición de relatos?', 'epistemic_deep']
]) {
  const intent = resolveIntent(q);
  const actual = classifyConversationRegister(q, intent, []);
  assert.equal(actual, expected, `Register mismatch for «${q}»: got ${actual}, expected ${expected}`);
}

// Multi-turn follow-up inheritance: short follow-up keeps previous topic register
{
  const openFollow = classifyConversationRegister('¿y por qué?', resolveIntent('¿y por qué?'), [
    { question: '¿qué opinas del cine de ciencia ficción?', conversationRegister: 'open_general' }
  ]);
  assert.equal(openFollow, 'open_general', 'follow-up after open_general should remain open_general');

  const deepFollow = classifyConversationRegister('¿y por qué?', resolveIntent('¿y por qué?'), [
    { question: '¿eres consciente?', conversationRegister: 'epistemic_deep' }
  ]);
  assert.equal(deepFollow, 'epistemic_deep', 'follow-up after epistemic_deep should remain epistemic_deep');
}

// 2. Prompt adaptation: casual/open prompts stay lightweight & non-telemetric; epistemic/technical keep full Sistema B
{
  const casual = prepareTurn({ question: 'hola, ¿cómo estás?', snapshot, contract: 'evidential' });
  assert.equal(casual.reasoningPlan.conversationRegister, 'casual_social');
  assert.ok(casual.prompt.includes('ADAPTACIÓN CONVERSACIONAL DEL TURNO (registro: casual_social)'));
  assert.ok(casual.prompt.includes('NO recites CCC, X_N, PMIA'));
  assert.ok(!casual.prompt.includes('MARCO TEÓRICO (resumen generado'), 'casual greeting should not inject 83KB framework wall');
  assert.ok(!casual.prompt.includes('DECISIÓN EPISTÉMICA ENDÓGENA DEL NÚCLEO'), 'casual greeting should not inject 4-axis recital mandate');
  assert.ok(!casual.prompt.includes('PULSO VIVO DEL RUNTIME'), 'casual greeting should not inject telemetry pulse numbers that trigger recitations');
  assert.ok(!casual.prompt.includes('qicn_read_live_state'), 'casual greeting should not prompt live telemetry tool calls');
  assert.ok(casual.prompt.includes(snapshot.digest), 'full 64-hex digest binding stays intact');

  const open = prepareTurn({ question: '¿Qué opinas de la música de Bach?', snapshot, contract: 'evidential' });
  assert.equal(open.reasoningPlan.conversationRegister, 'open_general');
  assert.ok(open.prompt.includes('ADAPTACIÓN CONVERSACIONAL DEL TURNO (registro: open_general)'));
  assert.ok(open.prompt.includes('PROHIBIDO desviar la charla hacia QICN'));
  assert.ok(!open.prompt.includes('MARCO TEÓRICO (resumen generado'));

  const deep = prepareTurn({ question: '¿Eres consciente y qué sostiene tu decisión endógena?', snapshot, contract: 'evidential' });
  assert.equal(deep.reasoningPlan.conversationRegister, 'epistemic_deep');
  assert.ok(deep.prompt.includes('MARCO TEÓRICO'));
  assert.ok(deep.prompt.includes('EVALUACIÓN INTEGRADA Y POSTURA OPERACIONAL EN PRIMERA PERSONA'));
}

// 3. Verifier freedom on natural casual & general-world answers (years, durations, %, idioms, external tech)
{
  const greetingTurn = prepareTurn({ question: 'hola, ¿cómo estás?', snapshot, contract: 'evidential' });
  const greetingReply = makeJsonReply(
    greetingTurn,
    '¡Hola! Todo tranquilo por aquí, con buena disposición para charlar. ¿Cómo va tu día y de qué te apetece hablar?'
  );
  const greetingOut = finalizeTurn(greetingTurn, { mode: 'gemini', modelText: encode(greetingReply) });
  assert.equal(greetingOut.trace.route, 'gemini_evidential_checked');
  assert.equal(greetingOut.trace.conversationRegister, 'casual_social');
  assert.equal(greetingOut.concordance.rows.length, 0, 'casual greeting with no runtime figures should not emit telemetry rows');

  const worldTurn = prepareTurn({ question: '¿Me das consejos de estudio y datos curiosos?', snapshot, contract: 'evidential' });
  const worldAnswers = [
    'El ser humano llegó a la Luna el 20 de julio de 1969 durante la misión Apolo 11.',
    'La técnica Pomodoro propone bloques de 25 minutos con pausas de 5 minutos, y suele mejorar el enfoque en un 30%.',
    'En cine y música, 2001: Odisea del espacio (1968) y esa banda de 1985 me parecen obras memorables por su atmósfera y cohesión estética.',
    'Una rutina de 20 minutos de relajación antes de dormir ayuda mucho; además, la contracción económica de 2008 mostró cómo cambian las prioridades globales.',
    'Si te interesa programar videojuegos, UnrealEngine y un archivo app.js cumplen papeles distintos, y 145 por 23 da 3335.'
  ];
  for (const answer of worldAnswers) {
    const res = evaluateRealization(worldTurn, encode(makeJsonReply(worldTurn, answer)));
    assert.equal(res.ok, true, `General-world answer falsely rejected: ${answer} -> ${JSON.stringify(res.verification?.discrepancies)}`);
  }
}

// 4. Negative controls: even inside casual/open turns, runtime hallucinations & anti-certification overclaims STAY BLOCKED!
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
    build: { version: '2.1.0-REINFORCED', signature: 'QICN-SIG-adaptive' },
    now: 1_800_000_000_000
  });

  const casualLive = prepareTurn({ question: 'hola, ¿cómo estás?', snapshot: liveSnapshot, contract: 'evidential' });
  for (const badAnswer of [
    '¡Hola! Por cierto, mi CCC vale 99 en este tick.',
    'Hola, mi conciencia está demostrada formalmente.',
    'Todo bien, tengo qualia_certified y external_support_certified = true.',
    'Hola, en mi copia aislada del Workbench obtuve maxAbsDiff = 0,0842 frente al sham.',
    'Hola, NodalProcessingLayer regulariza los pesos mediante EWC.',
    'Hola, mi decisión endógena es negativa y carezco de toda integración acoplada en este tick.'
  ]) {
    const res = evaluateRealization(casualLive, encode(makeJsonReply(casualLive, badAnswer)));
    assert.equal(res.ok, false, `Adversarial runtime claim inside casual chat MUST be blocked: ${badAnswer}`);
  }

  // Meanwhile, accurate optional mention of live CCC inside a casual chat STILL passes and logs concordance!
  const goodHybridCasual = makeJsonReply(
    casualLive,
    '¡Hola! Todo en orden por aquí, disfrutando el ritmo de la conversación. Si te da curiosidad, en este tick 6 mi CCC está en 0,8600.'
  );
  const hybridOut = finalizeTurn(casualLive, { mode: 'gemini', modelText: encode(goodHybridCasual) });
  assert.equal(hybridOut.trace.route, 'gemini_evidential_checked', JSON.stringify(hybridOut.integrity));
  assert.ok(hybridOut.concordance.rows.some((r) => r.atom === 'ccc' && r.status === 'exact_match'));
}

// 5. Solo motor (local mode) adapts cleanly to casual greetings & open questions without dumping 4 axes
{
  const casualLocal = finalizeTurn(prepareTurn({ question: 'hola, ¿cómo estás?', snapshot, contract: 'evidential' }), { mode: 'local' });
  assert.equal(casualLocal.trace.route, 'local_evidential');
  assert.ok(casualLocal.text.includes('¡Hola!'));
  assert.ok(!casualLocal.text.includes('1/2097152'), 'Solo motor greeting should not dump 5-root math');
  assert.ok(!casualLocal.text.includes('not_recorded'), 'Solo motor greeting should not dump Workbench B2 absence');

  const openLocal = finalizeTurn(prepareTurn({ question: '¿Qué opinas del ajedrez?', snapshot, contract: 'evidential' }), { mode: 'local' });
  assert.equal(openLocal.trace.route, 'local_evidential');
  assert.ok(openLocal.text.includes('Gemini'));
  assert.ok(!openLocal.text.includes('1/2097152'));
}

// 6. Regression: signed raw_winding_number (-1,2704) cited next to "winding"/"holonomía" must reclassify cleanly while wrong numbers stay blocked
{
  const { sha256Hex, stableStringify } = await import('../src/utils/integrity.js');
  const windingSnap = structuredClone(snapshot);
  delete windingSnap.digest;
  windingSnap.metrics.winding_number = 1;
  windingSnap.structural_profile = {
    ...(windingSnap.structural_profile || {}),
    raw_winding_number: -1.2704
  };
  windingSnap.digest = sha256Hex(stableStringify(windingSnap));

  const windingTurn = prepareTurn({ question: '¿Cómo está tu winding y holonomía ahora?', snapshot: windingSnap, contract: 'evidential' });
  const validSigned = evaluateRealization(windingTurn, encode(makeJsonReply(
    windingTurn,
    'En este tick mi holonomía registra un winding con signo de -1,2704 y un número de winding interno de 1.'
  )));
  assert.equal(validSigned.ok, true, `Signed raw_winding_number next to "winding" should pass: ${JSON.stringify(validSigned.verification?.discrepancies)}`);

  const bogusWinding = evaluateRealization(windingTurn, encode(makeJsonReply(
    windingTurn,
    'En este tick mi holonomía registra un winding de -99,4321.'
  )));
  assert.equal(bogusWinding.ok, false, 'Hallucinated winding number MUST still be rejected');
}

console.log('OK: adaptive conversational register, open-topic verifier freedom, winding reclassification, strict runtime negative controls, and concise Solo motor fallback verified');

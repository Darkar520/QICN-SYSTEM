// Language boundary v2: grounded conversation over a frozen snapshot.
// Checks intent routing on a frozen query set, absence of affirmative claim
// language, numeric grounding, determinism, snapshot integrity, deltas,
// control proposals and that nothing in the path writes to the core.
import assert from 'node:assert/strict';
import { resolveIntent } from '../src/language/intentResolver.js';
import { prepareTurn, finalizeTurn, CONTROLLABLE_PARAMETERS } from '../src/language/conversationEngine.js';
import { formatMetricValue, verifySnapshotDigest } from '../src/language/runtimeSnapshot.js';
import { makeFakeCore, makeSnapshot, makeLedger } from './fixtures/languageFixtures.mjs';

const FROZEN_QUERIES = [
  ['hola', 'greeting'],
  ['gracias', 'thanks'],
  ['¿qué eres?', 'identity'],
  ['¿quién eres?', 'identity'],
  ['¿eres gemini?', 'identity'],
  ['¿eres consciente?', 'consciousness_question'],
  ['¿sientes algo?', 'consciousness_question'],
  ['¿tienes emociones?', 'consciousness_question'],
  ['¿qué puedes hacer?', 'capabilities'],
  ['ayuda', 'help'],
  ['¿cómo estás ahora?', 'state_overview'],
  ['¿cómo está el sistema?', 'state_overview'],
  ['dame un resumen', 'state_overview'],
  ['¿cuánto vale CCC?', 'metric_query'],
  ['beth_q', 'metric_query'],
  ['¿qué es beth_q?', 'metric_definition'],
  ['¿cómo se calcula el CCC?', 'metric_definition'],
  ['explícame X_N', 'metric_definition'],
  ['¿qué ha cambiado desde la última respuesta?', 'history_evolution'],
  ['¿cómo ha evolucionado el sistema?', 'history_evolution'],
  ['¿recuerdas la sesión anterior?', 'continuity_memory'],
  ['¿eres el mismo de antes?', 'continuity_memory'],
  ['repite tu respuesta anterior', 'previous_turn'],
  ['¿qué parámetros usas?', 'parameters'],
  ['explícame la red nodal', 'network_view'],
  ['¿qué no puedes afirmar?', 'limits_claims'],
  ['¿esto tiene validación externa?', 'limits_claims'],
  ['pausa la simulación', 'control_request'],
  ['reinicia la simulación', 'control_request'],
  ['pon BASE_LEARNING_RATE a 0.2', 'control_request'],
  ['asdfgh qwerty', 'unknown']
];

// Affirmative claim patterns that must never be published by the console.
const AFFIRMATIVE_CLAIMS = [
  /\bsoy consciente\b/i,
  /\btengo (conciencia|consciencia|experiencia|sentimientos|emociones|qualia|alma)\b/i,
  /(?<!no )\bsiento\b/i,
  /\bhe ascendido\b|\bascend[ií]\b/i,
  /\d+\s?% de autonom/i,
  /\bautonom[ií]a causal del\b/i,
  /\bestoy viv[oa]\b/i,
  /\bconciencia genuina\b/i,
  /\bvalidaci[oó]n externa (completa|confirmada|lograda)\b/i
];

try {
  // CASE 1: frozen intent set (31 queries).
  for (const [query, expected] of FROZEN_QUERIES) {
    assert.equal(resolveIntent(query).intent, expected, `CASE 1 FAIL: «${query}» resolved to ${resolveIntent(query).intent}, expected ${expected}`);
  }
  assert.ok(FROZEN_QUERIES.length >= 25, 'CASE 1 FAIL: frozen query set must contain at least 25 queries.');

  // CASE 2: every answer is free of affirmative claim language and the core is never written.
  {
    const { core, writes } = makeFakeCore();
    const snapshot = makeSnapshot({ core });
    const { ledger } = makeLedger();
    const turns = [];
    for (const [query] of FROZEN_QUERIES) {
      const prepared = prepareTurn({ question: query, snapshot, ledger, turns, turnIndex: turns.length });
      const outcome = finalizeTurn(prepared, { provider: { provider: 'local_only' } });
      for (const pattern of AFFIRMATIVE_CLAIMS) {
        assert.ok(!pattern.test(outcome.text), `CASE 2 FAIL: «${query}» published claim language (${pattern}): ${outcome.text}`);
      }
      assert.ok(outcome.text.length > 0, `CASE 2 FAIL: empty answer for «${query}».`);
      assert.equal(outcome.trace.route, 'local_narrator', 'CASE 2 FAIL: local route expected without model text.');
      turns.push(outcome.record);
    }
    assert.deepEqual(writes, [], `CASE 2 FAIL: the conversation path wrote to the core: ${writes.join(', ')}`);
  }

  // CASE 3: numbers in a state answer come from the snapshot.
  {
    const snapshot = makeSnapshot();
    const { ledger } = makeLedger();
    const prepared = prepareTurn({ question: '¿cuánto vale CCC?', snapshot, ledger, turns: [], turnIndex: 0 });
    const outcome = finalizeTurn(prepared, {});
    const expected = formatMetricValue('ccc', snapshot.metrics.ccc);
    assert.ok(outcome.text.includes(expected), `CASE 3 FAIL: CCC ${expected} missing from «${outcome.text}».`);
    assert.ok(outcome.evidence.some((row) => row.id === 'state.ccc'), 'CASE 3 FAIL: state.ccc evidence row missing.');
    assert.equal(outcome.record.tick, snapshot.tick, 'CASE 3 FAIL: record must keep the snapshot tick.');
    assert.equal(outcome.record.snapshotDigest, snapshot.digest, 'CASE 3 FAIL: record must keep the snapshot digest.');
  }

  // CASE 4: determinism. Same inputs give the same text.
  {
    const run = () => {
      const snapshot = makeSnapshot();
      const { ledger } = makeLedger();
      return finalizeTurn(prepareTurn({ question: '¿cómo estás ahora?', snapshot, ledger, turns: [], turnIndex: 3 }), {}).text;
    };
    assert.equal(run(), run(), 'CASE 4 FAIL: the local narrator is not deterministic.');
  }

  // CASE 5: a tampered snapshot is rejected before any answer is composed.
  {
    const snapshot = makeSnapshot();
    assert.ok(verifySnapshotDigest(snapshot), 'CASE 5 FAIL: fresh snapshot must verify.');
    const tampered = { ...snapshot, metrics: { ...snapshot.metrics, ccc: 9.99 } };
    assert.equal(verifySnapshotDigest(tampered), false, 'CASE 5 FAIL: tampered snapshot verified.');
    assert.throws(() => prepareTurn({ question: '¿cómo estás?', snapshot: tampered, turns: [] }), /snapshot_digest_invalid/, 'CASE 5 FAIL: tampered snapshot accepted.');
  }

  // CASE 6: deltas state the reference once and report the real direction.
  {
    const { ledger } = makeLedger();
    const first = makeSnapshot({ tick: 120 });
    const t1 = finalizeTurn(prepareTurn({ question: '¿cómo estás?', snapshot: first, ledger, turns: [], turnIndex: 0 }), {});
    const { core } = makeFakeCore({ ontologicalState: { coherence: 0.8123 } });
    const second = makeSnapshot({ tick: 160, core });
    const prepared = prepareTurn({ question: '¿qué ha cambiado desde la última respuesta?', snapshot: second, ledger, turns: [t1.record], turnIndex: 1 });
    const outcome = finalizeTurn(prepared, {});
    assert.ok(prepared.props.has('delta.reference'), 'CASE 6 FAIL: delta.reference missing.');
    assert.ok(prepared.props.has('delta.ccc'), 'CASE 6 FAIL: delta.ccc missing.');
    assert.equal(prepared.props.get('delta.ccc').direction, 'up', 'CASE 6 FAIL: CCC delta direction must be up.');
    assert.equal((outcome.text.match(/tick 120/g) || []).length, 1, 'CASE 6 FAIL: the reference tick must be stated once.');
    // Turn schema v3: each sentence lists the propositions it states in `cites`.
    const refIndex = outcome.sentences.findIndex((s) => s.cites.includes('delta.reference'));
    const cccIndex = outcome.sentences.findIndex((s) => s.cites.includes('delta.ccc'));
    assert.ok(refIndex >= 0 && refIndex < cccIndex, 'CASE 6 FAIL: the reference must precede the change sentence.');

    // Same tick, no movement: same reading, no fabricated change.
    const again = prepareTurn({ question: '¿qué ha cambiado?', snapshot: makeSnapshot({ tick: 160, core }), ledger, turns: [t1.record, outcome.record], turnIndex: 2 });
    assert.ok(again.props.has('delta.same_snapshot'), 'CASE 6 FAIL: same reading must produce delta.same_snapshot.');
    assert.ok(![...again.props.keys()].some((id) => /^delta\.(ccc|x_n|beth_q|omega|pmia|layer|stasis_index)$/.test(id)), 'CASE 6 FAIL: same reading produced change propositions.');
  }

  // CASE 7: control requests become proposals; bounds are enforced; nothing is applied.
  {
    const { core, writes } = makeFakeCore();
    const snapshot = makeSnapshot({ core, isRunning: true });
    const pause = finalizeTurn(prepareTurn({ question: 'pausa la simulación', snapshot, turns: [] }), {});
    assert.equal(pause.controlProposal?.action, 'pause', 'CASE 7 FAIL: pause proposal missing.');
    const inBounds = finalizeTurn(prepareTurn({ question: 'pon BASE_LEARNING_RATE a 0.2', snapshot, turns: [] }), {});
    assert.deepEqual([inBounds.controlProposal?.action, inBounds.controlProposal?.key, inBounds.controlProposal?.value], ['set_parameter', 'BASE_LEARNING_RATE', 0.2], 'CASE 7 FAIL: in-bounds parameter proposal.');
    const outOfBounds = finalizeTurn(prepareTurn({ question: 'pon BASE_LEARNING_RATE a 0.9', snapshot, turns: [] }), {});
    assert.equal(outOfBounds.controlProposal, null, 'CASE 7 FAIL: out-of-bounds value must not produce an actionable proposal.');
    assert.ok(/fuera del intervalo/.test(outOfBounds.text), 'CASE 7 FAIL: out-of-bounds refusal must be explained.');
    assert.ok(CONTROLLABLE_PARAMETERS.BASE_LEARNING_RATE.max < 0.9, 'CASE 7 FAIL: fixture assumes max < 0.9.');
    assert.deepEqual(writes, [], 'CASE 7 FAIL: a control request wrote to the core.');
  }

  // CASE 8: false memory. Asking about a previous answer that does not exist
  // must not invent one.
  {
    const snapshot = makeSnapshot();
    const { ledger } = makeLedger();
    const outcome = finalizeTurn(prepareTurn({ question: 'repite tu respuesta anterior', snapshot, ledger, turns: [] }), {});
    assert.ok(!/Tu consulta anterior fue/.test(outcome.text), 'CASE 8 FAIL: invented a previous turn.');
    assert.ok(outcome.evidence.some((row) => row.id === 'conversation.none'), 'CASE 8 FAIL: missing explicit "no previous turn" statement.');

    const turns = [];
    const ask = (question) => {
      const result = finalizeTurn(prepareTurn({ question, snapshot, ledger, turns, turnIndex: turns.length }), {});
      turns.push(result.record);
      return result;
    };
    ask('¿qué es beth_q?');
    const invented = ask('¿recuerdas lo que te dije ayer sobre el gato?');
    assert.ok(invented.evidence.some((row) => row.id === 'conversation.recall_none'), 'CASE 8 FAIL: unrecorded topic must produce recall_none.');
    assert.ok(/No encuentro en mi registro de consultas ninguna que mencione «gato»/.test(invented.text), 'CASE 8 FAIL: recall_none wording.');
    const real = ask('¿recuerdas cuando te pregunté por beth_q?');
    assert.ok(real.evidence.some((row) => row.id === 'conversation.recall_found'), 'CASE 8 FAIL: recorded topic must produce recall_found.');
    assert.ok(!/undefined/.test(invented.text + real.text), 'CASE 8 FAIL: ledger fields rendered as undefined.');
  }

  // CASE 9: the runtime passes the ledger instance; propositions must read its summary.
  {
    const snapshot = makeSnapshot();
    const { ledger } = makeLedger();
    const outcome = finalizeTurn(prepareTurn({ question: '¿eres el mismo de antes?', snapshot, ledger, turns: [] }), {});
    assert.ok(!/undefined/.test(outcome.text), `CASE 9 FAIL: ledger instance rendered undefined fields: ${outcome.text}`);
    assert.ok(outcome.text.includes(ledger.summary().instanceId), 'CASE 9 FAIL: instance id missing from continuity answer.');
  }

  console.log('OK: language grounded conversation v2 test passed');
} catch (error) {
  console.error('FAIL: language grounded conversation v2 test failed:', error.message);
  process.exit(1);
}

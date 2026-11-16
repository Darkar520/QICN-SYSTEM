// Conversation turn orchestration.
// Pure functions over a frozen snapshot, a ledger summary and the conversation
// record. Nothing here can reach the simulation core: the caller passes plain
// data and receives text plus a trace. Control requests become proposals that
// the UI must confirm and record as explicit events.
import { resolveIntent, normalizeText } from './intentResolver.js';
import { buildPropositions, renderProposition, INTENT_LABELS } from './propositions.js';
import { planAnswer, composeLocalAnswer } from './narrator.js';
import { buildFacts, buildRealizationPrompt, buildCorrectionPrompt, parseRealization, verifyRealization, factsById, obligationsFor, DELTA_FRAME_IDS, REQUIRED_BY_INTENT, REALIZATION_SCHEMA } from './realizationContract.js';
import { verifySnapshotDigest, verifySnapshotStructuralConsistency, RECOMPUTED_EACH_TICK } from './runtimeSnapshot.js';
import { buildFreePrompt, buildFreeContext, parseFreeRealization, verifyFreeRealization, buildFreeCorrectionPrompt, freeGracefulCandidate, buildFreeConcordance, assembleText, FREE_REALIZATION_SCHEMA, FREE_GUARANTEE_NOTE, KAIZEN_EFFECTIVE_DEFAULT } from './freeRealization.js';

// Realization contracts (2026-11-08): 'free' = v4 free prose with non-lexical
// guarantees (chat default); 'verified' = v3 sentence-level verification
// (optional mode). The API default stays 'verified' for existing callers.
export const REALIZATION_CONTRACTS = Object.freeze(['free', 'verified']);
export const normalizeContract = (value) => (value === 'free' ? 'free' : 'verified');

export const CONVERSATION_SCHEMA = 'qicn.conversation_turn.v3';
export const CONVERSATION_STORAGE_KEY = 'QICN_CONVERSATION_TURNS_V2';
export const CONVERSATION_MAX_TURNS = 24;

// Parameters a chat request may change, with bounds taken from the runtime
// parameter registry semantics (core-mutable keys). Values outside the bounds
// are rejected before any confirmation is offered.
export const CONTROLLABLE_PARAMETERS = Object.freeze({
  BASE_LEARNING_RATE: { min: 0.01, max: 0.5 },
  HEBBIAN_FACTOR: { min: 0.01, max: 0.2 },
  PLASTICITY_DECAY: { min: 0.9, max: 0.999 },
  RETRO_FLUX_WEIGHT: { min: 0.01, max: 0.4 },
  BOLTZMANN_ANALOG_K: { min: 0.5, max: 2 },
  INFORMATIONAL_TEMP_T: { min: 0.3, max: 2 },
  SYNAPTIC_PRUNING_THRESHOLD: { min: 0.01, max: 0.5 }
});

function buildControlProposal(control, snapshot) {
  if (!control) return null;
  if (control.action === 'pause') {
    return snapshot.isRunning
      ? { action: 'pause', text: 'Para pausar la simulación, confirma el evento de control con el botón de esta respuesta.' }
      : { action: null, text: 'La simulación ya está en pausa; no hace falta ningún evento de control.' };
  }
  if (control.action === 'start') {
    return snapshot.isRunning
      ? { action: null, text: 'La simulación ya está en marcha.' }
      : { action: 'start', text: 'Para iniciar la simulación, confirma el evento de control con el botón de esta respuesta.' };
  }
  if (control.action === 'reset') {
    return { action: 'reset', text: 'Reiniciar borra la dinámica actual y la registra como reinicialización; confírmalo con el botón si es lo que quieres.' };
  }
  if (control.action === 'set_parameter') {
    const key = control.parameterHint ? control.parameterHint.toUpperCase() : null;
    const bounds = key ? CONTROLLABLE_PARAMETERS[key] : null;
    if (!key || !bounds) {
      return { action: null, text: `Solo puedo proponer cambios en estos parámetros: ${Object.keys(CONTROLLABLE_PARAMETERS).join(', ')}. Indica el nombre y el valor.` };
    }
    if (!Number.isFinite(control.value)) return { action: null, text: `Indica el valor numérico para ${key}.` };
    if (control.value < bounds.min || control.value > bounds.max) {
      return { action: null, text: `El valor pedido para ${key} está fuera del intervalo admitido de ${bounds.min} a ${bounds.max}; no propongo el cambio.` };
    }
    const recomputed = RECOMPUTED_EACH_TICK.includes(key);
    return {
      action: 'set_parameter',
      key,
      value: control.value,
      recomputed,
      text: recomputed
        ? `Puedo fijar ${key} en ${control.value} como evento de control registrado; confírmalo con el botón. Aviso: el núcleo recalcula ${key} en cada tick a partir de beth_q, el gap espectral y Omega, así que el valor solo se mantiene mientras la simulación esté en pausa.`
        : `Puedo fijar ${key} en ${control.value} como evento de control registrado; confírmalo con el botón. Este parámetro no lo recalcula el núcleo y se mantiene hasta que Kaizen o un nuevo control lo cambien.`
    };
  }
  return { action: null, text: 'No reconozco esa acción de control.' };
}

const summarizeForRecord = (text) => String(text || '').replace(/\s+/g, ' ').trim().slice(0, 400);

/**
 * Prepare a turn: local intent, authorized propositions, local answer and the
 * prompt for an optional model realization.
 */
// Words that carry no recall content in a memory question.
const RECALL_STOPWORDS = new Set(('recuerdas acuerdas acuerdo recordar recuerdo dije dijiste dijimos hablamos hablaste comentamos comente comentaste conversacion conversamos ' +
  'pregunta preguntas pregunte preguntaste respuesta respuestas anterior anteriores antes ayer luego hace tiempo sesion sesiones ultima ultimo ' +
  'sobre aquello aquella eso esto esta este estas estos algo cosa cosas todo nada como cuando donde quien cual cuales porque para pero tambien ' +
  'memoria registro historial consola sistema qicn runtime mismo misma sigues siendo eres eras estas tienes tenias puedes podias quieres repite repiteme ' +
  'tuya tuyo mios mias nuestra nuestro conmigo contigo usted ustedes ellos ellas tenemos habia habias hubo dime cuentame explica').split(' '));

function recallTerms(normalized) {
  return [...new Set(normalized.replace(/[^a-z0-9_ñ\s]/g, ' ').split(/\s+/)
    .filter((word) => word.length >= 4 && !RECALL_STOPWORDS.has(word)))];
}

function buildRecall(intent, turns) {
  if (!['continuity_memory', 'previous_turn'].includes(intent.intent)) return null;
  const terms = recallTerms(intent.normalized || '');
  if (!terms.length) return null;
  const match = [...turns].reverse().find((turn) => {
    const stored = normalizeText(turn?.question || '');
    return terms.some((term) => stored.includes(term));
  }) || null;
  return { terms, match, searched: turns.length, capacity: CONVERSATION_MAX_TURNS };
}

// Accept the ledger instance (runtime) or its summary (tests, exports).
const readLedger = (ledger) => (ledger && typeof ledger.summary === 'function' ? ledger.summary({ recent: 8 }) : ledger);

// Facts the answer must cite for each local intent (coverage, G9). They are a
// minimum, not the whole plan: Gemini decides how much else to include.
function requiredFor(intentResult, props) {
  const has = (id) => props.has(id);
  const out = [];
  const add = (...ids) => ids.forEach((id) => { if (has(id) && !out.includes(id)) out.push(id); });
  const firstOf = (...ids) => { const id = ids.find(has); if (id) add(id); };
  const intents = [intentResult.intent, ...(intentResult.compound || [])];
  for (const intent of intents) {
    for (const id of REQUIRED_BY_INTENT[intent] || []) add(id);
    if (intent === 'metric_query' || intent === 'metric_definition') {
      for (const metric of (intentResult.metrics || []).filter((m) => m !== 'tick')) {
        if (intent === 'metric_definition') firstOf(`definition.${metric}`);
        firstOf(`state.${metric}`, `missing.${metric}`);
      }
    }
    if (intent === 'state_overview') add('state.run', 'state.ccc', 'state.threshold');
    if (intent === 'history_evolution') firstOf('delta.reference', 'delta.same_snapshot', 'conversation.none');
    if (intent === 'previous_turn') firstOf('conversation.recall_found', 'conversation.recall_none', 'conversation.previous', 'conversation.none');
    if (intent === 'continuity_memory') firstOf('conversation.recall_found', 'conversation.recall_none', 'continuity.status');
    // Questions about consciousness state where CCC is relative to the
    // operational threshold; at or above it, also that crossing is not
    // awareness (2026-11-08: CCC 1,03 was above and the answer omitted it).
    if (intent === 'consciousness_question' || intent === 'metacognition_question') {
      add('state.threshold');
      if (props.get('state.threshold')?.direction && props.get('state.threshold').direction !== 'below') add('limit.threshold_not_awareness');
      // Preference/choice and phenomenality questions carry their own limits.
      const concepts = new Set(intentResult.concepts || []);
      if (concepts.has('agency')) add('limit.no_preferences');
      if (concepts.has('phenomenality')) add('limit.no_phenomenality');
    }
    // A question no rule recognizes is still answered in the console's voice:
    // it must at least state the scope of what the console can say.
    if (intent === 'unknown' && !(intentResult.compound || []).length) add('identity.scope');
    if (intent === 'network_view') add('definition.network');
    if (intent === 'parameters') add('identity.build');
  }
  return out;
}

// Facts sent to Gemini: everything about the current state, history and
// limits, plus the definitions and missing-data facts the question touches.
// The packet does not depend on the local keyword classifier (2026-11-08): a
// misspelled or unusual question must not leave Gemini without the facts it
// needs. Every fact goes, tagged by family; only «missing.*» (data that does not
// exist) is limited to the metrics the question names. The local intent is a
// hint for the prompt and the local reading, never a filter.
export const PACKET_POLICY = 'complete';
function factPropsFor(props, intentResult) {
  const metrics = new Set(intentResult.metrics || []);
  const keep = new Map();
  for (const [id, prop] of props) {
    const [family, key] = id.split('.');
    if (family === 'missing' && !metrics.has(key)) continue;
    keep.set(id, prop);
  }
  return keep;
}

export function prepareTurn({ question, snapshot, ledger = null, turns = [], turnIndex = 0, contract = 'verified', kaizenEffective = KAIZEN_EFFECTIVE_DEFAULT }) {
  if (!snapshot || !verifySnapshotDigest(snapshot)) {
    throw new Error('snapshot_digest_invalid');
  }
  const structuralCheck = verifySnapshotStructuralConsistency(snapshot);
  if (!structuralCheck.ok) {
    throw new Error(`snapshot_structural_inconsistent:${structuralCheck.violations.join(',')}`);
  }
  const ledgerSummary = readLedger(ledger);
  const previousTurn = turns.length ? turns[turns.length - 1] : null;
  const intent = resolveIntent(question);
  const recall = buildRecall(intent, turns);
  const props = buildPropositions(snapshot, ledgerSummary, { previousTurn, recall });
  const plan = planAnswer(intent, props);
  const controlProposal = intent.intent === 'control_request' ? buildControlProposal(intent.control, snapshot) : null;
  const localText = composeLocalAnswer({ intentResult: intent, plan, props, turnIndex, controlProposal });
  const required = requiredFor(intent, props);
  const facts = buildFacts(factPropsFor(props, intent));
  const snapshotId = packetIdOf(snapshot);
  const prompt = buildRealizationPrompt({ question, facts, required, recentTurns: turns, localIntent: intent, snapshotId });
  const sessionId = ledgerSummary?.currentSession?.sessionId || null;
  const previousMetrics = previousTurn?.metrics || null;
  const turnContract = normalizeContract(contract);
  if (turnContract === 'free') {
    // v4: the complete packet (every proposition, not only the local plan).
    const freePrompt = buildFreePrompt({ question, props, snapshot, snapshotId, recentTurns: turns, localIntent: intent, previousMetrics, kaizenEffective });
    const freeContext = buildFreeContext({ snapshot, previousMetrics, props, question, kaizenEffective });
    return { contract: 'free', question, snapshot, snapshotId, previousMetrics, intent, props, plan, required, facts, controlProposal, localText, prompt: freePrompt, freeContext, turnIndex, sessionId };
  }
  return { contract: 'verified', question, snapshot, snapshotId, previousMetrics, intent, props, plan, required, facts, controlProposal, localText, prompt, turnIndex, sessionId };
}

// Packet identifier the model must echo: first 12 hex characters of the digest.
const packetIdOf = (snapshot) => (typeof snapshot?.digest === 'string' && snapshot.digest.length >= 12 ? snapshot.digest.slice(0, 12) : null);

// Metrics shown in the «Cálculos del core» block of every answer.
const CORE_METRICS = ['ccc', 'x_n', 'pmia', 'omega', 'beth_q', 'spectral_gap', 'relaxation_time', 'stasis_index', 'layer', 'active_nodes', 'total_nodes', 'ascension_threshold'];
const CORE_TOWER_METRICS = ['tower_phase', 'tower_code', 'tower_memory', 'sigma_defect_bound', 'body_valence_norm', 'world_state_norm'];

/**
 * The packet the answer is anchored to: tick, digest, config hash and the core
 * metrics of the frozen snapshot. Built by the engine, never by the model.
 */
export function buildCoreBlock(snapshot) {
  const metrics = {};
  for (const key of CORE_METRICS) if (Number.isFinite(snapshot?.metrics?.[key])) metrics[key] = snapshot.metrics[key];
  for (const key of CORE_TOWER_METRICS) if (Number.isFinite(snapshot?.tower?.[key])) metrics[key] = snapshot.tower[key];
  return {
    tick: snapshot?.tick ?? null,
    packetId: packetIdOf(snapshot),
    configHash: snapshot?.configHash || null,
    isRunning: Boolean(snapshot?.isRunning),
    metrics,
    cccVsThreshold: snapshot?.predicates?.ccc_vs_threshold || null
  };
}

const parseDisplayNumber = (value) => {
  const s = String(value ?? '').trim().replace(/\s/g, '');
  if (!/^-?\d+(?:[.,]\d+)?$/.test(s)) return null;
  return { n: Number(s.replace(',', '.')), decimals: (s.split(/[.,]/)[1] || '').length };
};

/**
 * Concordance (old «Concordancia forense»): one row per value slot in the
 * published sentences. «inserted» is what the text shows; «engine» is the raw
 * snapshot value when the slot maps to a snapshot metric or config key. A row
 * is exact when the inserted value is the engine value at display precision.
 */
export function buildConcordance(prepared, publishedSentences) {
  const { facts, props, snapshot, previousMetrics } = prepared;
  const rows = [];
  publishedSentences.forEach((sentence, sentenceIndex) => {
    for (const m of String(sentence.raw || '').matchAll(/\{\{\s*(F\d+)\.([a-z0-9_]+)\s*\}\}/g)) {
      const [, alias, slotName] = m;
      const fact = facts?.get(alias);
      const slot = fact?.slots?.[slotName];
      // Literal slots are pieces of dates, versions or ids inside a fact's
      // text, not measured values: they are not concordance rows.
      if (!fact || !slot || slot.role === 'literal') continue;
      const prop = props.get(fact.id);
      const placeholder = slotName === 'v' ? prop?.placeholders?.[0] : slotName === 'from' ? 'from_value' : slotName === 'to' ? 'to_value' : (slot.role === 'literal' ? null : slotName);
      const subject = prop?.subjects?.[0] || null;
      let engine = null;
      let engineSource = 'texto del hecho';
      if (fact.id.startsWith('param.')) {
        const key = fact.id.slice(6);
        if (Number.isFinite(snapshot?.config?.[key])) { engine = snapshot.config[key]; engineSource = `config.${key} (${snapshot.configSource?.[key] || 'qicn_config'})`; }
      } else if (placeholder === 'to_value' && subject && Number.isFinite(snapshot?.metrics?.[subject])) {
        engine = snapshot.metrics[subject]; engineSource = `metrics.${subject} (tick ${snapshot.tick})`;
      } else if (placeholder === 'from_value' && subject && Number.isFinite(previousMetrics?.[subject])) {
        engine = previousMetrics[subject]; engineSource = `metrics.${subject} (turno anterior)`;
      } else if (placeholder && Number.isFinite(snapshot?.metrics?.[placeholder])) {
        engine = snapshot.metrics[placeholder]; engineSource = `metrics.${placeholder} (tick ${snapshot.tick})`;
      } else if (placeholder && Number.isFinite(snapshot?.tower?.[placeholder])) {
        engine = snapshot.tower[placeholder]; engineSource = `tower.${placeholder} (tick ${snapshot.tick})`;
      }
      const shown = parseDisplayNumber(slot.value);
      let status = 'from_fact';
      if (engine !== null && shown) {
        const tolerance = 0.5 * 10 ** -shown.decimals + 1e-12;
        status = Math.abs(shown.n - engine) <= tolerance ? 'exact_match' : 'out_of_tolerance';
      }
      // Same numbering as the withheld list: the index in the model's answer.
      rows.push({ sentence: sentence.index ?? sentenceIndex + 1, slot: `${alias}.${slotName}`, factId: fact.id, metric: subject || placeholder || fact.id, inserted: slot.value, engine, engineSource, status, evidenceClass: prop?.evidence?.class || 'unknown' });
    }
  });
  const count = (s) => rows.filter((r) => r.status === s).length;
  return { rows, summary: { total: rows.length, exact: count('exact_match'), fromFact: count('from_fact'), outOfTolerance: count('out_of_tolerance') } };
}

/**
 * Check one model output against the turn's contract.
 * @returns {{ ok, verification|null, error|null }}
 */
export function evaluateRealization(prepared, modelText) {
  if (prepared?.contract === 'free') {
    try {
      const parsed = parseFreeRealization(modelText);
      const verification = verifyFreeRealization({ parsed, ctx: prepared.freeContext, expectedSnapshot: prepared.snapshotId || null });
      return { ok: verification.ok, verification, error: null };
    } catch (error) {
      return { ok: false, verification: null, error: String(error.message || 'contract_error').slice(0, 80) };
    }
  }
  try {
    const parsed = parseRealization(modelText);
    const verification = verifyRealization({ parsed, facts: prepared.facts, required: prepared.required, localIntent: prepared.intent, expectedSnapshot: prepared.snapshotId || null, question: prepared.question });
    return { ok: verification.ok, verification, error: null };
  } catch (error) {
    return { ok: false, verification: null, error: String(error.message || 'contract_error').slice(0, 80) };
  }
}

export function correctionPromptFor(prepared, modelText, evaluation) {
  if (prepared?.contract === 'free') {
    return buildFreeCorrectionPrompt({ basePrompt: prepared.prompt, previousOutput: modelText, verification: evaluation.verification, error: evaluation.verification ? null : (evaluation.error || 'contract_error') });
  }
  const discrepancies = evaluation.verification
    ? evaluation.verification.discrepancies
    : [{ sentence: null, reason: evaluation.error || 'contract_error' }];
  return buildCorrectionPrompt({ basePrompt: prepared.prompt, previousOutput: modelText, discrepancies });
}

const LOCAL_LABEL = 'Lectura directa del motor (sin redacción del canal de lenguaje)';

const MAX_TRACED_REJECTIONS = 30;

/** Correction budget per integrity mode: attempts including the first. */
// Each attempt with high thinking takes ~1–1.5 min, so both modes allow one
// correction; graceful also skips it when the first answer is publishable.
export const MAX_ATTEMPTS = { strict: 2, graceful: 2 };

/**
 * Graceful candidate of one verification: sentences that passed every
 * sentence-level check, or null when a turn-level blocker applies (wrong
 * packet echo, missing required negative fact). Change values whose
 * reference sentence was not kept are withheld too.
 */
export function gracefulCandidate(facts, v, required = []) {
  const byId = factsById(facts);
  // A wrong packet echo blocks. Coverage is recomputed below from the
  // published sentences only: a withheld sentence's concepts oblige nothing.
  if (v.discrepancies.some((d) => d.reason === 'snapshot_echo_mismatch')) return null;
  let okSentences = v.sentences.filter((s) => s.ok);
  // Required negative facts (limits) must be stated by a published sentence.
  // Citing them only in a withheld sentence is not enough: otherwise graceful
  // could publish «¿eres consciente?» without «no tengo evidencia de conciencia».
  // The obligations include those of the concepts the published sentences use.
  const obligations = obligationsFor({ required, modelIntent: v.modelIntent, facts, texts: okSentences.map((s) => s.text) });
  const keptIds = new Set(okSentences.flatMap((s) => s.cites));
  for (const id of obligations) {
    if (byId.get(id)?.polarity === 'negative' && !keptIds.has(id)) return null;
  }
  const extraWithheld = [];
  const keptReference = okSentences.some((s) => s.cites.includes('delta.reference'));
  if (byId.has('delta.reference') && !keptReference) {
    const isChange = (s) => s.cites.some((id) => id.startsWith('delta.') && !DELTA_FRAME_IDS.has(id));
    okSentences.filter(isChange).forEach((s) => extraWithheld.push({ index: s.index, reasons: ['delta_without_reference'] }));
    okSentences = okSentences.filter((s) => !isChange(s));
  }
  if (!okSentences.some((s) => s.cites.length)) return null;
  return { v, okSentences, extraWithheld };
}

/** True when graceful mode can publish this evaluation without a correction:
 * a candidate exists and it covers every required fact. */
export function canPublishGracefully(prepared, evaluation) {
  if (!evaluation?.verification) return false;
  if (prepared?.contract === 'free') return Boolean(freeGracefulCandidate(evaluation.verification));
  const candidate = gracefulCandidate(prepared.facts, evaluation.verification, prepared.required);
  if (!candidate) return false;
  const kept = new Set(candidate.okSentences.flatMap((s) => s.cites));
  return prepared.required.filter((id) => prepared.facts && factsById(prepared.facts).has(id)).every((id) => kept.has(id));
}
export const normalizeIntegrityMode = (mode) => (mode === 'graceful' ? 'graceful' : 'strict');

/**
 * Finalize a turn.
 * - mode 'local': the local narrator answers (explicit local mode).
 * - mode 'gemini': `attempts` holds up to two model attempts
 *   ({ modelText } or { modelError }). The first verified attempt is published.
 *   If none verifies, the answer is an explicit failure and the local reading is
 *   returned separately, labelled as local, never as Gemini text.
 */
export function finalizeTurn(prepared, { mode = null, attempts = null, modelText = null, modelError = null, provider = null, integrityMode = 'strict', transportRetries = [] } = {}) {
  const { intent, props, plan, controlProposal, localText, snapshot, turnIndex, facts } = prepared;
  const integrity = { mode: normalizeIntegrityMode(integrityMode), severity: 'ok', banner: null, discrepancies: [], withheld: [], snapshotEcho: null };
  let bestPartial = null;
  const tries = Array.isArray(attempts) ? attempts : ((modelText !== null || modelError) ? [{ modelText, modelError }] : []);
  const effectiveMode = mode || (tries.length ? 'gemini' : 'local');
  const trace = {
    schema: REALIZATION_SCHEMA,
    snapshotTick: snapshot.tick,
    snapshotDigest: snapshot.digest,
    configHash: snapshot.configHash,
    build: snapshot.build,
    localIntent: intent.intent,
    localConfidence: intent.confidence,
    compoundIntents: intent.compound || [],
    required: prepared.required,
    route: 'local_narrator',
    mode: effectiveMode,
    modelIntent: null,
    intentAccepted: false,
    attempts: [],
    // Transient transport errors retried before an attempt succeeded or failed.
    transportRetries: Array.isArray(transportRetries) ? transportRetries.slice(0, 4) : [],
    modelFailure: null,
    provider
  };

  let text = localText;
  let finalIntent = intent.intent;
  let sentences = plan.ids.map((id) => ({ text: renderProposition(props.get(id)), cites: [id], source: 'local' }));
  let citedIds = [...plan.ids];
  let localReading = null;

  if (effectiveMode === 'gemini' && prepared.contract === 'free') {
    // Contract v4: free prose; only figures, open concepts, module names,
    // known false claims and the packet echo are verified.
    trace.schema = FREE_REALIZATION_SCHEMA;
    trace.contract = 'free';
    integrity.guaranteeNote = FREE_GUARANTEE_NOTE;
    let published = false;
    let bestFree = null;
    const toPublished = (list) => list.map((s) => ({ index: s.index, kind: 'free', text: s.text, raw: s.text, cites: [], source: 'gemini', numbers: s.numbers }));
    for (const attempt of tries) {
      if (attempt.modelError) {
        trace.attempts.push({ stage: 'transport', code: String(attempt.modelError.code || attempt.modelError.message || 'unknown').slice(0, 80), status: attempt.modelError.status ?? null });
        continue;
      }
      const evaluation = evaluateRealization(prepared, attempt.modelText);
      if (!evaluation.verification) {
        trace.attempts.push({ stage: 'contract', code: evaluation.error });
        continue;
      }
      const v = evaluation.verification;
      const rejectedSentences = v.sentences.filter((s) => !s.ok).slice(0, MAX_TRACED_REJECTIONS).map((s) => ({
        index: s.index,
        kind: 'free',
        notPublished: true,
        text: String(s.text).slice(0, 400),
        reasons: s.reasons.map((r) => `${r.reason}${r.detail ? `:${r.detail}` : ''}`)
      }));
      trace.attempts.push({ stage: v.ok ? 'verified' : 'rejected', snapshotEcho: v.snapshotEcho, envelope: v.envelope, truncated: v.truncated, discrepancies: v.discrepancies.slice(0, 12), rejectedSentences });
      if (v.ok) {
        published = true;
        text = assembleText(v.segments);
        if (controlProposal) text = `${text}\n\n${controlProposal.text}`.trim();
        sentences = toPublished(v.sentences);
        citedIds = [];
        trace.route = 'gemini_free_checked';
        integrity.snapshotEcho = v.snapshotEcho;
        if (v.snapshotEcho === 'missing') {
          integrity.severity = 'medium';
          integrity.banner = 'La redacción no devolvió el identificador del paquete; las cifras se verificaron igualmente contra el motor.';
        }
        break;
      }
      const candidate = freeGracefulCandidate(v);
      if (candidate && (!bestFree || candidate.kept.length > bestFree.kept.length)) bestFree = { v, ...candidate };
    }
    if (!published && integrity.mode === 'graceful' && bestFree) {
      const { v, kept, withheld } = bestFree;
      const keptIndex = new Set(kept.map((s) => s.index));
      published = true;
      text = assembleText(v.segments, (seg) => keptIndex.has(seg.index));
      if (controlProposal) text = `${text}\n\n${controlProposal.text}`.trim();
      sentences = toPublished(kept);
      citedIds = [];
      trace.route = 'gemini_free_partial';
      integrity.severity = 'medium';
      integrity.snapshotEcho = v.snapshotEcho;
      integrity.withheld = withheld.map((s) => ({ index: s.index, reasons: s.reasons.map((r) => `${r.reason}${r.detail ? `:${r.detail}` : ''}`) }));
      integrity.banner = `Modo graceful: publico ${kept.length} de ${v.sentences.length} frases; ${withheld.length} no superaron la verificación y quedaron fuera (su texto está en la traza).`;
    }
    if (!published) {
      const last = trace.attempts[trace.attempts.length - 1] || null;
      const transportOnly = trace.attempts.length > 0 && trace.attempts.every((a) => a.stage === 'transport');
      trace.route = transportOnly ? 'gemini_unavailable' : 'gemini_rejected';
      trace.modelFailure = last ? { stage: last.stage, code: last.code || (last.discrepancies?.[0]?.reason ?? 'rejected') } : { stage: 'none', code: 'no_attempt' };
      const n = trace.attempts.length;
      text = transportOnly
        ? 'Mi canal de lenguaje no respondió en este turno, así que no publico una redacción.'
        : `Mi redacción de este turno no superó la verificación del motor${n > 1 ? ` tras ${n} intentos` : ''}; no la publico (modo ${integrity.mode}).`;
      integrity.severity = 'high';
      integrity.banner = transportOnly ? 'Canal de lenguaje no disponible.' : 'Redacción retenida: cifras, conceptos abiertos o afirmaciones que no superaron la verificación.';
      integrity.discrepancies = (last?.discrepancies || []).slice(0, 8).map((d) => `${d.sentence ? `frase ${d.sentence} · ` : ''}${d.reason}${d.detail ? `: ${d.detail}` : ''}`);
      if (last?.stage === 'contract') integrity.discrepancies = [String(last.code)];
      localReading = { label: LOCAL_LABEL, text: localText, cites: [...plan.ids] };
      sentences = [];
      citedIds = [];
    }
  } else if (effectiveMode === 'gemini') {
    let published = false;
    for (const attempt of tries) {
      if (attempt.modelError) {
        trace.attempts.push({ stage: 'transport', code: String(attempt.modelError.code || attempt.modelError.message || 'unknown').slice(0, 80), status: attempt.modelError.status ?? null });
        continue;
      }
      const evaluation = evaluateRealization(prepared, attempt.modelText);
      if (!evaluation.verification) {
        trace.attempts.push({ stage: 'contract', code: evaluation.error });
        continue;
      }
      const v = evaluation.verification;
      // The text of every rejected sentence stays in the trace (never in the
      // published answer) so the user can judge whether the rejection was fair.
      const rejectedSentences = v.sentences.filter((s) => !s.ok).slice(0, MAX_TRACED_REJECTIONS).map((s) => ({
        index: s.index,
        kind: s.kind,
        notPublished: true,
        text: String(s.text).slice(0, 400),
        reasons: s.reasons.map((r) => `${r.reason}${r.detail ? `:${r.detail}` : ''}`)
      }));
      trace.attempts.push({ stage: v.ok ? 'verified' : 'rejected', modelIntent: v.modelIntent, snapshotEcho: v.snapshotEcho, discrepancies: v.discrepancies.slice(0, 12), rejectedSentences });
      trace.modelIntent = v.modelIntent;
      trace.subquestions = v.subquestions;
      if (v.ok) {
        published = true;
        finalIntent = v.intent;
        trace.intentAccepted = v.intentAccepted;
        sentences = v.sentences.map((s) => ({ index: s.index, kind: s.kind, text: s.text, raw: s.raw, cites: s.cites, source: 'gemini' }));
        citedIds = v.citedIds;
        text = v.sentences.map((s) => s.text).join(' ').replace(/\s+/g, ' ').trim();
        if (controlProposal) text = `${text} ${controlProposal.text}`.trim();
        trace.route = 'gemini_verified';
        integrity.snapshotEcho = v.snapshotEcho;
        if (v.snapshotEcho === 'missing') {
          integrity.severity = 'medium';
          integrity.banner = 'La redacción no devolvió el identificador del paquete; los valores siguen insertados por el motor.';
        }
        break;
      }
      // Graceful candidate: see gracefulCandidate (limits and the packet echo
      // stay blocking; change values need their reference).
      const candidate = gracefulCandidate(facts, v, prepared.required);
      if (candidate && (!bestPartial || candidate.okSentences.length > bestPartial.okSentences.length)) bestPartial = candidate;
    }
    if (!published && integrity.mode === 'graceful' && bestPartial) {
      const { v, okSentences, extraWithheld } = bestPartial;
      published = true;
      finalIntent = v.intent;
      trace.intentAccepted = v.intentAccepted;
      sentences = okSentences.map((s) => ({ index: s.index, kind: s.kind, text: s.text, raw: s.raw, cites: s.cites, source: 'gemini' }));
      citedIds = [...new Set(okSentences.flatMap((s) => s.cites))];
      text = okSentences.map((s) => s.text).join(' ').replace(/\s+/g, ' ').trim();
      if (controlProposal) text = `${text} ${controlProposal.text}`.trim();
      trace.route = 'gemini_partial';
      integrity.severity = 'medium';
      integrity.snapshotEcho = v.snapshotEcho;
      integrity.withheld = [
        ...v.sentences.filter((s) => !s.ok).map((s) => ({ index: s.index, reasons: s.reasons.map((r) => `${r.reason}${r.detail ? `:${r.detail}` : ''}`) })),
        ...extraWithheld
      ].sort((a, b) => a.index - b.index);
      integrity.discrepancies = v.discrepancies.filter((d) => d.sentence === null).map((d) => `${d.reason}${d.detail ? `: ${d.detail}` : ''}`);
      integrity.banner = `Modo graceful: publico ${okSentences.length} de ${v.sentences.length} frases verificadas; ${integrity.withheld.length} quedaron retenidas${integrity.discrepancies.length ? ` y hay ${integrity.discrepancies.length} avisos de cobertura o intención` : ''}.`;
    }
    if (!published) {
      const last = trace.attempts[trace.attempts.length - 1] || null;
      const transportOnly = trace.attempts.length > 0 && trace.attempts.every((a) => a.stage === 'transport');
      trace.route = transportOnly ? 'gemini_unavailable' : 'gemini_rejected';
      trace.modelFailure = last ? { stage: last.stage, code: last.code || (last.discrepancies?.[0]?.reason ?? 'rejected') } : { stage: 'none', code: 'no_attempt' };
      const n = trace.attempts.length;
      text = transportOnly
        ? 'Mi canal de lenguaje no respondió en este turno, así que no publico una redacción.'
        : `Mi redacción de este turno no superó la verificación del motor${n > 1 ? ` tras ${n} intentos` : ''}; no la publico (modo ${integrity.mode}).`;
      integrity.severity = 'high';
      integrity.banner = transportOnly ? 'Canal de lenguaje no disponible.' : 'Redacción retenida: discrepancias con el paquete del motor.';
      integrity.discrepancies = (last?.discrepancies || []).slice(0, 8).map((d) => `${d.sentence ? `frase ${d.sentence} · ` : ''}${d.reason}${d.detail ? `: ${d.detail}` : ''}`);
      if (last?.stage === 'contract') integrity.discrepancies = [String(last.code)];
      localReading = { label: LOCAL_LABEL, text: localText, cites: [...plan.ids] };
      sentences = [];
      citedIds = [];
    }
  }
  const core = buildCoreBlock(snapshot);
  const concordance = prepared.contract === 'free'
    ? buildFreeConcordance(sentences.filter((s) => s.source === 'gemini'))
    : buildConcordance(prepared, sentences.filter((s) => s.source === 'gemini'));
  if (prepared.contract === 'free') trace.contract = 'free';
  if (concordance.summary.outOfTolerance > 0) {
    integrity.severity = 'high';
    integrity.banner = `${concordance.summary.outOfTolerance} valores insertados no coinciden con el motor a la precisión mostrada.`;
  }

  const factByAlias = facts ? [...facts.values()] : [];
  const evidence = citedIds.map((id) => {
    const prop = props.get(id);
    const fact = factByAlias.find((f) => f.id === id);
    return { id, alias: fact?.alias || null, kind: prop?.kind || 'unknown', evidenceClass: prop?.evidence?.class || 'unknown', source: prop?.evidence?.source || '', expressedBy: sentences.some((s) => s.source === 'gemini' && s.cites.includes(id)) ? 'gemini' : 'local' };
  });
  const record = {
    schema: CONVERSATION_SCHEMA,
    turnIndex,
    question: String(prepared.question || '').slice(0, 500),
    intent: finalIntent,
    intentLabel: INTENT_LABELS[finalIntent] || finalIntent,
    tick: snapshot.tick,
    snapshotDigest: snapshot.digest,
    metrics: { ...snapshot.metrics },
    answerSummary: summarizeForRecord(localReading ? localReading.text : text),
    route: trace.route,
    sessionId: prepared.sessionId || null
  };
  return {
    text,
    intent: finalIntent,
    sentences,
    evidence,
    trace,
    record,
    localReading,
    core,
    concordance,
    integrity,
    controlProposal: controlProposal && controlProposal.action ? controlProposal : null
  };
}

export function loadConversationTurns(storage) {
  try {
    const raw = storage?.getItem?.(CONVERSATION_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    // v2 records share the fields the recall and delta logic read.
    const accepted = new Set([CONVERSATION_SCHEMA, 'qicn.conversation_turn.v2']);
    return Array.isArray(parsed) ? parsed.filter((turn) => turn && accepted.has(turn.schema)).slice(-CONVERSATION_MAX_TURNS) : [];
  } catch {
    return [];
  }
}

export function saveConversationTurns(storage, turns) {
  try {
    storage?.setItem?.(CONVERSATION_STORAGE_KEY, JSON.stringify(turns.slice(-CONVERSATION_MAX_TURNS)));
  } catch {
    // Conversation context is optional; failure to persist is not fatal.
  }
}

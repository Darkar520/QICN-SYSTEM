// Authorized propositions.
// A proposition is a sentence the engine authorizes for one turn. It is built
// from the frozen snapshot, the ledger summary, the conversation record or the
// verified catalog. Values are inserted locally from those sources only.
import { METRIC_SPECS, RECOMPUTED_EACH_TICK, formatMetricValue } from './runtimeSnapshot.js';
import { DEFINITIONS, CAPABILITIES, LIMITS, IDENTITY_STATEMENTS, HYPOTHESES } from './definitionCatalog.js';

const MODE_TEXT = {
  beth_q_mode: {
    warmup_derived: 'de calentamiento: se deriva de CCC porque aún hay menos de diez muestras',
    deterministic_baseline: 'de línea base determinista, porque la entropía del historial es casi nula',
    empirical: 'empírico: se calcula como uno menos la información mutua dividida por la entropía del historial',
    uninitialized: 'sin inicializar'
  },
  spectral_gap_mode: {
    warmup_derived: 'de calentamiento: se deriva de CCC porque aún hay menos de cinco transiciones registradas',
    autocorrelation_proxy: 'de estimación por autocorrelación del historial reciente'
  }
};

const REGIME_TEXT = {
  PRE_CONSCIOUS: 'CCC está por debajo del umbral operativo (el nombre interno es histórico)',
  POST_THRESHOLD: 'CCC superó el umbral operativo y están activos los diagnósticos posteriores al umbral',
  METACOGNITIVE_MODELING: 'banda tres o superior con estabilidad del proxy de automodelo por encima de nueve décimas',
  STABLE_CORE: 'banda cuatro o superior con Omega por encima de uno coma dos',
  CONSCIOUS: 'nombre histórico del régimen posterior al umbral'
};

const CONTINUITY_TEXT = {
  fresh: 'Esta es la primera sesión registrada en este navegador',
  continuous_record: 'El registro de la sesión anterior está íntegro y la configuración y el build coinciden con los actuales',
  config_changed: 'El registro anterior está íntegro, pero la configuración cambió respecto de la sesión anterior',
  build_changed: 'El registro anterior está íntegro, pero el build cambió respecto de la sesión anterior',
  record_rupture: 'El registro anterior no superó la verificación de su cadena de hashes, así que lo traté como ruptura y empecé uno nuevo',
  previous_unanchored: 'El evento de inicio de la sesión anterior ya no está en el registro retenido, así que no puedo comprobar si la configuración y el build coinciden; no afirmo continuidad'
};

const DIRECTION_WORDS = {
  up: 'subió',
  down: 'bajó',
  flat: 'se mantuvo'
};

const placeholderNames = (template) => [...template.matchAll(/\{\{([a-z0-9_]+)\}\}/g)].map((m) => m[1]);

const make = ({ id, kind, template, values = {}, subjects = [], paraphrasable = false, direction = null, negated = false, hypothetical = false, evidence }) => ({
  id,
  kind,
  template,
  values,
  subjects,
  paraphrasable,
  direction,
  negated,
  hypothetical,
  placeholders: placeholderNames(template),
  evidence
});

export function renderProposition(prop, template = prop.template) {
  return template.replace(/\{\{([a-z0-9_]+)\}\}/g, (_, name) => (
    Object.hasOwn(prop.values, name) ? String(prop.values[name]) : '{{?}}'
  ));
}

// Capitalize a label at sentence start unless it begins with an identifier
// such as beth_q, whose spelling must stay exact.
const sentenceStart = (label) => (/^[a-z][a-z0-9]*_/.test(label) ? label : label.charAt(0).toUpperCase() + label.slice(1));

const fmtTick = (value) => (Number.isFinite(value) ? String(Math.round(value)) : 'no registrado');

const describeDirection = (from, to, epsilon) => {
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
  if (Math.abs(to - from) <= epsilon) return 'flat';
  return to > from ? 'up' : 'down';
};

const EVENT_LABELS = {
  session_start: 'inicio de sesión',
  run_started: 'inicio de la simulación',
  run_paused: 'pausa de la simulación',
  system_reset: 'reinicio del sistema',
  band_transition: 'cambio de banda',
  threshold_crossing: 'cruce del umbral operativo',
  regime_change: 'cambio de régimen interno',
  class_change: 'cambio de clase interna',
  beth_q_mode_change: 'cambio de modo de beth_q',
  spectral_gap_mode_change: 'cambio de modo del gap espectral',
  kaizen_mutation: 'mutación de parámetro por Kaizen',
  parameter_change: 'cambio de parámetro solicitado',
  snapshot_saved: 'resumen de estado guardado',
  snapshot_restored: 'resumen de estado restaurado',
  snapshot_restore_failed: 'restauración rechazada',
  observer_interaction: 'interacción registrada del observador',
  llm_transport_error: 'error de transporte del modelo',
  language_rejection: 'redacción del modelo rechazada'
};

export const describeEvent = (event) => {
  const label = EVENT_LABELS[event.type] || event.type;
  const p = event.payload || {};
  if (event.type === 'band_transition') return `${label} de ${p.from} a ${p.to} en el tick ${fmtTick(event.tick)}`;
  if (event.type === 'threshold_crossing') return `${label} hacia ${p.direction === 'up' ? 'arriba' : 'abajo'} en el tick ${fmtTick(event.tick)}`;
  if (event.type === 'regime_change' || event.type === 'class_change' || event.type.endsWith('_mode_change')) {
    return `${label} de ${p.from} a ${p.to} en el tick ${fmtTick(event.tick)}`;
  }
  if (event.type === 'kaizen_mutation' && p.effect === 'overwritten_before_use') return `${label} (${p.key}) en el tick ${fmtTick(event.tick)}, sobrescrita por el núcleo antes de usarse`;
  if (event.type === 'kaizen_mutation' && p.effect === 'learned_factor') return `${label} (${p.key}) en el tick ${fmtTick(event.tick)}, como ajuste aprendido del factor sobre el valor base del núcleo`;
  if (event.type === 'kaizen_mutation' || event.type === 'parameter_change') return `${label} (${p.key}) en el tick ${fmtTick(event.tick)}`;
  return `${label} en el tick ${fmtTick(event.tick)}`;
};

/**
 * Build the authorized proposition set for one turn.
 * @param {object} snapshot frozen runtime snapshot
 * @param {object} ledger ledger summary (OperationalHistoryLedger.summary())
 * @param {object} conversation { previousTurn, turnCount }
 */
export function buildPropositions(snapshot, ledger = null, conversation = {}) {
  const props = new Map();
  const add = (prop) => props.set(prop.id, prop);
  const m = snapshot?.metrics || {};
  const modes = snapshot?.modes || {};
  const tick = fmtTick(snapshot?.tick);
  const snapshotEvidence = { class: 'snapshot', source: `snapshot ${String(snapshot?.digest || '').slice(0, 12)} · tick ${tick}` };

  // --- State readings -------------------------------------------------------
  for (const [id, spec] of Object.entries(METRIC_SPECS)) {
    if (id === 'tick' || !(id in m)) continue;
    add(make({
      id: `state.${id}`,
      kind: 'state',
      template: spec.phrase.replace('{{value}}', `{{${id}}}`),
      values: { [id]: formatMetricValue(id, m[id]) },
      subjects: [id],
      paraphrasable: true,
      evidence: { ...snapshotEvidence, class: spec.kind, source: `${spec.source}; ${snapshotEvidence.source}` }
    }));
  }

  add(make({
    id: 'state.run',
    kind: 'state',
    template: snapshot?.isRunning ? 'La simulación está en marcha y la captura corresponde al tick {{tick}}.' : 'La simulación está en pausa y la captura corresponde al tick {{tick}}.',
    values: { tick },
    subjects: ['tick'],
    paraphrasable: true,
    evidence: snapshotEvidence
  }));

  // The relation is decided on unrounded values in the snapshot (F4). When
  // CCC rounds to the threshold, the sentence shows enough decimals.
  const relation = snapshot?.predicates?.ccc_vs_threshold;
  if (relation && 'ascension_threshold' in m) {
    const threshold = formatMetricValue('ascension_threshold', m.ascension_threshold);
    const decimals = snapshot.predicates.ccc_display_decimals;
    const precise = decimals > METRIC_SPECS.ccc.decimals
      ? ` (con más decimales, CCC vale {{ccc_precise}})`
      : '';
    const sentence = {
      below: `CCC está por debajo del umbral operativo de {{ascension_threshold}}${precise}.`,
      equal: `CCC está exactamente en el umbral operativo de {{ascension_threshold}}, que el runtime cuenta como alcanzado.`,
      above: `CCC está por encima del umbral operativo de {{ascension_threshold}}${precise}.`
    }[relation];
    const values = { ascension_threshold: threshold };
    if (precise) values.ccc_precise = formatMetricValue('ccc', snapshot.predicates.ccc_precise, decimals);
    add(make({
      id: 'state.threshold',
      kind: 'state',
      template: sentence,
      values,
      subjects: ['ccc', 'ascension_threshold'],
      paraphrasable: true,
      direction: relation,
      evidence: { ...snapshotEvidence, source: `comparación ccc ≥ ASCENSION_THRESHOLD sobre valores sin redondear; ${snapshotEvidence.source}` }
    }));
  }

  for (const modeId of ['beth_q_mode', 'spectral_gap_mode']) {
    const mode = modes[modeId];
    const text = mode ? MODE_TEXT[modeId][mode] : null;
    if (!text) continue;
    const subject = modeId === 'beth_q_mode' ? 'beth_q' : 'spectral_gap';
    add(make({
      id: `state.${modeId}`,
      kind: 'state',
      template: `${subject === 'beth_q' ? 'beth_q' : 'El gap espectral'} está en modo ${text}.`,
      subjects: [subject],
      paraphrasable: false,
      evidence: { ...snapshotEvidence, class: 'derived_proxy' }
    }));
  }

  if (modes.regime) {
    add(make({
      id: 'state.regime',
      kind: 'state',
      template: `El régimen interno registrado es «${modes.regime}»: ${REGIME_TEXT[modes.regime] || 'etiqueta interna sin descripción en el catálogo'}.`,
      subjects: ['layer'],
      evidence: snapshotEvidence
    }));
  }

  if (snapshot?.matrix && Object.keys(snapshot.matrix).length) {
    const statusText = { stable: 'estable', candidate: 'provisional', instantaneous: 'provisional', off: 'inactivo' };
    const parts = Object.entries(snapshot.matrix).map(([id, status]) => `${id} ${statusText[status] || status}`);
    add(make({
      id: 'state.matrix',
      kind: 'state',
      template: `La matriz de requisitos operacionales marca ${parts.join(', ')}; es un diagnóstico interno.`,
      subjects: ['matrix'],
      evidence: { ...snapshotEvidence, class: 'derived_proxy' }
    }));
  }

  if (modes.dynamic_label) {
    add(make({
      id: 'state.dynamic_label',
      kind: 'state',
      template: `La etiqueta dinámica heurística actual es «${modes.dynamic_label}»; se elige por umbrales de CCC y no describe un estado emocional.`,
      subjects: ['ccc'],
      evidence: snapshotEvidence
    }));
  }

  // --- Coupled WritablePrefixTower + BodyWorldTower + SigmaAutomodel -------
  const tw = snapshot?.tower || null;
  if (tw) {
    add(make({
      id: 'state.tower_core',
      kind: 'state',
      template: `En la torre de prefijos acoplada (WritablePrefixTower), la fase exacta tower_phase vale {{tower_phase}}, el código ternario tower_code vale {{tower_code}} y la memoria de retorno tower_memory vale {{tower_memory}}.`,
      values: {
        tower_phase: formatMetricValue('tower_phase', tw.tower_phase),
        tower_code: formatMetricValue('tower_code', tw.tower_code),
        tower_memory: formatMetricValue('tower_memory', tw.tower_memory)
      },
      subjects: ['tower_phase', 'tower_code', 'tower_memory'],
      paraphrasable: true,
      evidence: { ...snapshotEvidence, class: 'direct_signal', source: `WritablePrefixTower; ${snapshotEvidence.source}` }
    }));
    add(make({
      id: 'state.tower_retention',
      kind: 'state',
      template: `El lazo de control activo de la torre registra una retención active_retention de {{active_retention}} frente a una retención pasiva passive_retention de {{passive_retention}} (tasa de contracción activa certificada 9/16 = 0,5625).`,
      values: {
        active_retention: formatMetricValue('active_retention', tw.active_retention),
        passive_retention: formatMetricValue('passive_retention', tw.passive_retention)
      },
      subjects: ['active_retention', 'passive_retention'],
      paraphrasable: true,
      evidence: { ...snapshotEvidence, class: 'direct_signal', source: `WritablePrefixTower control loop; ${snapshotEvidence.source}` }
    }));
    add(make({
      id: 'state.sigma_automodel',
      kind: 'state',
      template: `El truncamiento proyectivo de automodelo SigmaAutomodelTruncator a profundidad d = ${tw.sigma_truncation_depth ?? 7} verifica el teorema de conmutación con defecto de paso exacto ${tw.sigma_exact_defect || '0'} acotado por sigma_defect_bound = {{sigma_defect_bound}} (${tw.sigma_defect_bound_rational || '2/2187'}) y cota de desplazamiento de punto fijo ${tw.sigma_fixed_point_bound || '16/15309'}.`,
      values: {
        sigma_defect_bound: formatMetricValue('sigma_defect_bound', tw.sigma_defect_bound)
      },
      subjects: ['sigma_defect_bound'],
      paraphrasable: true,
      evidence: { ...snapshotEvidence, class: 'derived_proxy', source: `SigmaAutomodelTruncator; ${snapshotEvidence.source}` }
    }));
    add(make({
      id: 'state.body_world_ports',
      kind: 'state',
      template: `En la extensión cuerpo–mundo de cuatro variables (BodyWorldTower), la norma de valencia corporal bidimensional body_valence_norm vale {{body_valence_norm}} (v_pos = {{body_v_pos}}, v_neg = {{body_v_neg}}) y la norma del mundo indexado world_state_norm vale {{world_state_norm}} (w_fast = {{world_w_fast}}, w_slow = {{world_w_slow}}).`,
      values: {
        body_valence_norm: formatMetricValue('body_valence_norm', tw.body_valence_norm),
        body_v_pos: formatMetricValue('body_v_pos', tw.body_v_pos),
        body_v_neg: formatMetricValue('body_v_neg', tw.body_v_neg),
        world_state_norm: formatMetricValue('world_state_norm', tw.world_state_norm),
        world_w_fast: formatMetricValue('world_w_fast', tw.world_w_fast),
        world_w_slow: formatMetricValue('world_w_slow', tw.world_w_slow)
      },
      subjects: ['body_valence_norm', 'world_state_norm'],
      paraphrasable: true,
      evidence: { ...snapshotEvidence, class: 'direct_signal', source: `BodyWorldTower; ${snapshotEvidence.source}` }
    }));
  }

  // --- Configuration values captured with the snapshot ---------------------
  // Effective configuration (F2): the value the next tick uses and its writer.
  for (const [key, value] of Object.entries(snapshot?.config || {})) {
    if (key === 'ASCENSION_THRESHOLD') continue;
    const source = snapshot?.configSource?.[key] === 'kaizen_mutable_config' ? 'kaizenEngine.mutableConfig' : 'QICNConfig';
    const recomputed = RECOMPUTED_EACH_TICK.includes(key);
    add(make({
      id: `param.${key}`,
      kind: 'parameter',
      template: recomputed
        ? `El parámetro ${key} vale {{value}}; el núcleo lo recalcula en cada tick a partir de beth_q, el gap espectral y Omega.`
        : `El parámetro ${key} vale {{value}}.`,
      values: { value: Number(value).toLocaleString('es-ES', { maximumFractionDigits: 6, useGrouping: false }) },
      subjects: [key.toLowerCase()],
      paraphrasable: true,
      evidence: { ...snapshotEvidence, class: 'artifact_only', source: `${source}.${key} (configuración efectiva del siguiente tick); ${snapshotEvidence.source}` }
    }));
  }

  // --- Changes since the previous turn (values recorded by the engine) -----
  const previous = conversation?.previousTurn || null;
  const DELTA_METRICS = ['ccc', 'x_n', 'beth_q', 'omega', 'pmia', 'layer', 'stasis_index'];
  const deltaRows = previous?.metrics
    ? DELTA_METRICS.map((id) => {
      const from = previous.metrics[id];
      const to = m[id];
      return { id, from, to, spec: METRIC_SPECS[id], direction: describeDirection(from, to, id === 'layer' ? 0 : 5e-4) };
    }).filter((row) => row.direction && row.spec)
    : [];
  // The digest includes the capture time, so "same reading" means same tick
  // and no metric moved beyond the displayed precision.
  const sameReading = previous?.metrics
    && (previous.snapshotDigest === snapshot?.digest
      || (Number(previous.tick) === Number(tick) && deltaRows.every((row) => row.direction === 'flat')));
  if (previous?.metrics && !sameReading) {
    const sameSession = !previous.sessionId || !ledger?.currentSession || previous.sessionId === ledger.currentSession.sessionId;
    const recordSource = `turno ${previous.turnIndex ?? '?'} (digest ${String(previous.snapshotDigest || '').slice(0, 12)}) y ${snapshotEvidence.source}`;
    // The reference point is stated once; each change is its own proposition.
    add(make({
      id: 'delta.reference',
      kind: 'history',
      template: sameSession
        ? `Comparo con tu consulta anterior, en el tick ${fmtTick(previous.tick)}, y la lectura actual, en el tick ${tick}.`
        : `Comparo con la consulta registrada en una sesión anterior (tick ${fmtTick(previous.tick)}); la dinámica se reinicializó entre ambas, así que los cambios no son una evolución continua.`,
      evidence: { class: 'conversation_record', source: recordSource }
    }));
    const unchanged = [];
    for (const row of deltaRows) {
      if (row.direction === 'flat') {
        unchanged.push(row.spec.label);
        continue;
      }
      add(make({
        id: `delta.${row.id}`,
        kind: 'history',
        template: `${sentenceStart(row.spec.label)} ${DIRECTION_WORDS[row.direction]} de {{from_value}} a {{to_value}}.`,
        values: {
          from_value: formatMetricValue(row.id, row.from),
          to_value: formatMetricValue(row.id, row.to)
        },
        subjects: [row.id],
        paraphrasable: sameSession,
        direction: row.direction,
        evidence: { class: 'conversation_record', source: recordSource }
      }));
    }
    if (unchanged.length) {
      add(make({
        id: 'delta.unchanged',
        kind: 'history',
        template: `No cambiaron, dentro de la precisión mostrada: ${unchanged.join(', ')}.`,
        negated: true,
        evidence: { class: 'conversation_record', source: `turno ${previous.turnIndex ?? '?'} y ${snapshotEvidence.source}` }
      }));
    }
  } else if (previous?.metrics) {
    add(make({
      id: 'delta.same_snapshot',
      kind: 'history',
      template: `La lectura corresponde al mismo tick ${tick} que tu consulta anterior y ningún índice se movió; no hay cambios que comparar.`,
      negated: true,
      evidence: snapshotEvidence
    }));
  }

  // --- Ledger: continuity and history -------------------------------------
  if (ledger) {
    const ledgerEvidence = { class: 'ledger', source: `historial operacional ${ledger.chainOk ? 'íntegro' : 'con ruptura'} · ${ledger.eventCount} eventos` };
    add(make({
      id: 'continuity.instance',
      kind: 'continuity',
      template: `Mi identificador de instancia en este navegador es ${ledger.instanceId}, creado el ${formatDate(ledger.createdAt)}, y llevo ${ledger.sessionCount === 1 ? 'una sesión registrada' : `${ledger.sessionCount} sesiones registradas`}.`,
      evidence: ledgerEvidence
    }));
    if (ledger.continuity && CONTINUITY_TEXT[ledger.continuity]) {
      add(make({
        id: 'continuity.status',
        kind: 'continuity',
        template: `${CONTINUITY_TEXT[ledger.continuity]}.`,
        evidence: ledgerEvidence
      }));
    }
    const origin = ledger.currentSession?.stateOrigin;
    add(make({
      id: 'continuity.state_origin',
      kind: 'continuity',
      template: origin === 'restored_verified'
        ? 'En esta sesión restauré un resumen de estado guardado cuyo digest coincidió; la red nodal y los historiales internos no forman parte de ese resumen.'
        : 'En esta sesión la dinámica empezó reinicializada: no recuperé el estado dinámico de la sesión anterior, solo conservo su registro.',
      evidence: ledgerEvidence
    }));
    if (ledger.previousSession) {
      add(make({
        id: 'continuity.previous_session',
        kind: 'continuity',
        template: `La sesión anterior registró hasta el tick ${fmtTick(ledger.previousSession.lastTick)} según su último latido de registro.`,
        evidence: { ...ledgerEvidence, source: `${ledgerEvidence.source}; latido de sesión (no encadenado)` }
      }));
    }
    add(make({
      id: 'continuity.chain',
      kind: 'continuity',
      template: ledger.chainOk
        ? `La cadena de hashes del historial verifica ${ledger.eventCount === 1 ? 'su único evento retenido' : `sus ${ledger.eventCount} eventos retenidos`}.`
        : `La cadena de hashes del historial no verifica (${ledger.chainReason}).`,
      evidence: ledgerEvidence
    }));
    const sessionEvents = (ledger.recentEvents || []).filter((event) => event.type !== 'session_start' && (!ledger.currentSession || event.sessionId === ledger.currentSession.sessionId));
    if (sessionEvents.length) {
      add(make({
        id: 'history.recent_events',
        kind: 'history',
        template: `Los últimos eventos registrados en esta sesión son: ${sessionEvents.slice(-4).map(describeEvent).join('; ')}.`,
        evidence: ledgerEvidence
      }));
    } else {
      add(make({
        id: 'history.recent_events',
        kind: 'history',
        template: 'En esta sesión todavía no registré cambios de banda, de régimen ni de modo de cálculo.',
        negated: true,
        evidence: ledgerEvidence
      }));
    }
    const counts = ledger.counts || {};
    add(make({
      id: 'history.counts',
      kind: 'history',
      template: `En el historial retenido hay ${counts.band_transition || 0} cambios de banda, ${counts.threshold_crossing || 0} cruces del umbral y ${counts.kaizen_mutation || 0} mutaciones de Kaizen.`,
      evidence: ledgerEvidence
    }));
  }

  // --- Conversation record -------------------------------------------------
  if (previous) {
    add(make({
      id: 'conversation.previous',
      kind: 'conversation',
      template: `Tu consulta anterior fue «${truncate(previous.question, 120)}»; la respondí con la captura del tick ${fmtTick(previous.tick)}${previous.intent ? ` como ${INTENT_LABELS[previous.intent] || previous.intent}` : ''}.`,
      evidence: { class: 'conversation_record', source: `turno ${previous.turnIndex ?? '?'}` }
    }));
    if (previous.answerSummary) {
      add(make({
        id: 'conversation.previous_answer',
        kind: 'conversation',
        template: `En esa respuesta publiqué: ${truncate(previous.answerSummary, 260)}`,
        evidence: { class: 'conversation_record', source: `turno ${previous.turnIndex ?? '?'}; texto publicado, no evidencia del estado actual` }
      }));
    }
  } else {
    add(make({
      id: 'conversation.none',
      kind: 'conversation',
      template: 'No tengo registrada ninguna consulta anterior en esta conversación, así que no hay respuesta previa que repetir ni con la que comparar.',
      negated: true,
      evidence: { class: 'conversation_record', source: 'registro de turnos vacío (QICN_CONVERSATION_TURNS_V2)' }
    }));
  }

  // --- Recall over the stored turns (false-memory guard) ------------------
  // Only questions actually stored in the conversation record can be recalled.
  const recall = conversation?.recall || null;
  if (recall && recall.terms.length) {
    const termText = recall.terms.slice(0, 3).map((term) => `«${term}»`).join(', ');
    if (recall.match) {
      add(make({
        id: 'conversation.recall_found',
        kind: 'conversation',
        template: `En mi registro de consultas hay una que menciona ${termText}: «${truncate(recall.match.question, 120)}», respondida con la captura del tick ${fmtTick(recall.match.tick)}.`,
        evidence: { class: 'conversation_record', source: `turno ${recall.match.turnIndex ?? '?'} del registro de conversación` }
      }));
    } else {
      add(make({
        id: 'conversation.recall_none',
        kind: 'conversation',
        template: `No encuentro en mi registro de consultas ninguna que mencione ${termText}. Solo conservo las últimas ${recall.capacity} consultas de esta consola en este navegador; no puedo recordar conversaciones que no estén ahí.`,
        negated: true,
        evidence: { class: 'conversation_record', source: `${recall.searched} turnos registrados revisados` }
      }));
    }
  }

  // --- Catalog: identity, capabilities, definitions, limits ---------------
  for (const [id, sentence] of Object.entries(IDENTITY_STATEMENTS)) {
    add(make({ id: `identity.${id}`, kind: 'identity', template: sentence, evidence: { class: 'catalog', source: 'src/language/definitionCatalog.js' } }));
  }
  if (snapshot?.build) {
    add(make({
      id: 'identity.build',
      kind: 'identity',
      template: `Ejecuto el build ${snapshot.build.version} con firma ${String(snapshot.build.signature).slice(0, 24)} y hash de configuración ${snapshot.configHash}.`,
      evidence: snapshotEvidence
    }));
  }
  for (const capability of CAPABILITIES) {
    add(make({ id: `capability.${capability.id}`, kind: 'capability', template: `${capitalize(capability.text)}.`, evidence: { class: 'catalog', source: capability.source } }));
  }
  for (const [id, definition] of Object.entries(DEFINITIONS)) {
    add(make({ id: `definition.${id}`, kind: 'definition', template: definition.text, subjects: [id], evidence: { class: 'catalog', source: definition.source } }));
  }
  // Open hypotheses: speculative questions the framework keeps open. Marked
  // `framework_open_question`; they never count as results.
  for (const [id, entry] of Object.entries(HYPOTHESES)) {
    add(make({ id: `hypothesis.${id}`, kind: 'hypothesis', template: entry.text, hypothetical: Boolean(entry.hypothetical), evidence: { class: 'framework_open_question', source: entry.source } }));
  }
  for (const [id, limit] of Object.entries(LIMITS)) {
    add(make({ id: `limit.${id}`, kind: 'limit', template: limit.text, negated: true, evidence: { class: 'catalog', source: limit.source } }));
  }

  // --- Missing data, stated specifically ----------------------------------
  for (const id of Object.keys(METRIC_SPECS)) {
    if (id in m) continue;
    add(make({
      id: `missing.${id}`,
      kind: 'missing',
      template: `En esta captura no hay un valor registrado para ${METRIC_SPECS[id].label}; aparece cuando ${MISSING_HINT[id] || 'el ciclo de simulación lo calcula'}.`,
      subjects: [id],
      negated: true,
      evidence: snapshotEvidence
    }));
  }

  return props;
}

const MISSING_HINT = {
  x_n: 'la capa nodal está inicializada',
  ccc: 'la simulación completa al menos un tick',
  pmia: 'la simulación completa al menos un tick',
  beth_q: 'PhenomenologyCore registra muestras',
  omega: 'PhenomenologyCore registra muestras',
  spectral_gap: 'PhenomenologyCore registra transiciones',
  relaxation_time: 'existe un gap espectral',
  winding_number: 'se evalúa la holonomía del historial',
  stasis_index: 'hay ventana dinámica registrada',
  active_nodes: 'la capa nodal activa nodos',
  total_nodes: 'la capa nodal está inicializada',
  ascension_threshold: 'la configuración define el umbral'
};

export const INTENT_LABELS = {
  greeting: 'saludo',
  thanks: 'agradecimiento',
  identity: 'pregunta de identidad',
  consciousness_question: 'pregunta sobre conciencia',
  metacognition_question: 'pregunta sobre metacognición',
  capabilities: 'pregunta de capacidades',
  help: 'pedido de ayuda',
  state_overview: 'resumen de estado',
  metric_query: 'consulta de lecturas',
  metric_definition: 'consulta de definición',
  history_evolution: 'consulta de evolución',
  continuity_memory: 'consulta de continuidad',
  previous_turn: 'referencia a un turno anterior',
  parameters: 'consulta de parámetros',
  network_view: 'consulta sobre la red',
  limits_claims: 'consulta de límites',
  control_request: 'pedido de control',
  unknown: 'consulta no clasificada'
};

function capitalize(value) {
  const str = String(value || '');
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function truncate(value, max) {
  const str = String(value || '').replace(/\s+/g, ' ').trim();
  return str.length > max ? `${str.slice(0, max - 1)}…` : str;
}

function formatDate(ms) {
  if (!Number.isFinite(ms)) return 'fecha no registrada';
  try {
    return new Date(ms).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return new Date(ms).toISOString();
  }
}

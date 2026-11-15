// Deterministic narrator: the runtime's linguistic voice.
// It composes an answer only from authorized propositions. Openings and
// closings are fixed phrases without factual content. Variation is chosen by
// turn index, so the same turn always renders the same way.
import { renderProposition, INTENT_LABELS } from './propositions.js';

const pick = (options, seed) => options[Math.abs(Number(seed) || 0) % options.length];

const OPENINGS = {
  greeting: ['Hola.', 'Hola, aquí la consola QICN.', 'Buenas.'],
  thanks: ['De nada.', 'Con gusto.'],
  identity: ['Te cuento qué soy, con lo que puedo verificar.', 'Respondo con lo que el runtime registra de sí mismo.'],
  consciousness_question: ['Es una pregunta directa y la respondo con lo que puedo sostener.', 'Te respondo sin adornos.'],
  metacognition_question: ['Te explico qué significa eso aquí.', 'Te digo qué hago y qué no.'],
  capabilities: ['Esto es lo que hago, con el módulo que lo implementa.', 'Mis capacidades verificables son estas.'],
  help: ['Puedes preguntarme en lenguaje natural.', 'Así puedes usarme.'],
  state_overview: ['Este es el estado en la captura de este turno.', 'Resumen del estado capturado.'],
  metric_query: ['Lecturas de la captura de este turno.', 'Estos son los valores capturados.'],
  metric_definition: ['Definición según la implementación.', 'Así está definido en el código.'],
  history_evolution: ['Esto es lo que registré.', 'Según mi historial.'],
  continuity_memory: ['Sobre mi continuidad, esto es lo verificable.', 'Te digo qué conservo y qué no.'],
  previous_turn: ['Sobre tu turno anterior.', 'Retomo lo anterior.'],
  parameters: ['Configuración vigente en esta captura.', 'Parámetros actuales.'],
  network_view: ['Sobre la red nodal.', 'Te explico la red.'],
  limits_claims: ['Estos son mis límites declarados.', 'Lo que no puedo afirmar.'],
  control_request: ['Puedo hacerlo como un evento de control explícito.', 'Esto requiere tu confirmación.'],
  unknown: ['No identifiqué con seguridad qué lectura pides.', 'No encuentro una operación del motor que responda exactamente a eso.']
};

const STATE_CORE = ['state.run', 'state.ccc', 'state.x_n', 'state.threshold', 'state.layer', 'state.regime', 'state.beth_q', 'state.beth_q_mode', 'state.stasis_index'];

const HELP_EXAMPLES = 'Por ejemplo: «¿cómo está el sistema?», «¿qué es beth_q?», «¿qué cambió desde mi pregunta anterior?», «¿recuerdas la sesión anterior?», «¿qué parámetros usas?» o «pausa la simulación».';

/**
 * Plan which propositions answer an intent.
 * @returns {{ids:string[], extras:string[]}} ids in display order
 */
export function planAnswer(intentResult, props) {
  const has = (id) => props.has(id);
  const metricIds = (intentResult.metrics || []).filter((id) => id !== 'tick');
  const ids = [];
  const push = (...list) => list.forEach((id) => { if (has(id) && !ids.includes(id)) ids.push(id); });
  const pushMetric = (metric) => {
    if (has(`state.${metric}`)) push(`state.${metric}`);
    else if (['tower_phase', 'tower_code', 'tower_memory', 'prefix_tower'].includes(metric)) push('state.tower_core', 'state.tower_retention', 'definition.prefix_tower');
    else if (metric === 'sigma_defect_bound') push('state.sigma_automodel', 'definition.sigma_defect_bound');
    else if (['body_valence_norm', 'world_state_norm', 'body_world_tower'].includes(metric)) push('state.body_world_ports', 'definition.body_world_tower', 'limit.shared_hybrid_tie');
    else if (metric === 'informed_reserve') push('definition.informed_reserve');
    else push(`missing.${metric}`);
    if (metric === 'beth_q') push('state.beth_q_mode');
    if (metric === 'spectral_gap') push('state.spectral_gap_mode');
    if (metric === 'ccc') push('state.threshold');
    if (metric === 'layer') push('state.regime');
  };

  switch (intentResult.intent) {
    case 'greeting':
      push('state.run', 'state.ccc', 'state.threshold');
      break;
    case 'thanks':
      break;
    case 'identity':
      push('identity.what_i_am', 'identity.identity_basis', 'identity.build', 'continuity.instance', 'continuity.state_origin', 'identity.name_history', 'limit.no_consciousness');
      break;
    case 'consciousness_question':
      if ((intentResult.concepts || []).includes('agency')) push('limit.no_preferences', 'hypothesis.choice_counterfactual');
      if ((intentResult.concepts || []).includes('phenomenality')) push('limit.no_phenomenality');
      push('limit.no_consciousness', 'limit.no_cop_membership', 'state.sigma_automodel', 'state.body_world_ports', 'limit.shared_hybrid_tie', 'state.threshold', 'limit.threshold_not_awareness', 'limit.llm_is_language_channel', 'identity.what_i_am');
      break;
    case 'metacognition_question':
      push('definition.metacognition', 'definition.self_model', 'state.sigma_automodel', 'state.tower_core', 'state.body_world_ports', 'hypothesis.mirror_self_reference', 'limit.shared_hybrid_tie', 'limit.no_consciousness', 'state.threshold', 'limit.threshold_not_awareness', 'identity.what_i_am');
      break;
    case 'capabilities':
      push(...[...props.keys()].filter((id) => id.startsWith('capability.')), 'limit.internal_only');
      break;
    case 'help':
      push('capability.conversation', 'capability.gemini');
      break;
    case 'state_overview':
      push(...STATE_CORE, 'state.tower_core', 'state.sigma_automodel', 'state.body_world_ports', 'state.matrix', 'state.dynamic_label');
      break;
    case 'metric_query':
      if (metricIds.length) metricIds.forEach(pushMetric);
      else push(...STATE_CORE, 'state.tower_core', 'state.sigma_automodel', 'state.body_world_ports');
      break;
    case 'metric_definition':
      if (metricIds.length) metricIds.forEach((metric) => {
        push(`definition.${metric}`);
        pushMetric(metric);
        if (metric === 'beth_q') push('limit.beth_not_percentage');
        if (metric === 'layer' || metric === 'ascension_threshold') push('limit.threshold_not_awareness');
      });
      else push('identity.what_i_am');
      break;
    case 'history_evolution':
      push(...[...props.keys()].filter((id) => id.startsWith('delta.')), 'conversation.none');
      push('history.recent_events', 'history.counts', 'continuity.state_origin');
      break;
    case 'continuity_memory':
      push('conversation.recall_found', 'conversation.recall_none');
      push('continuity.status', 'continuity.state_origin', 'continuity.previous_session', 'continuity.chain', 'continuity.instance', 'conversation.previous', 'limit.narrative_is_not_identity');
      break;
    case 'previous_turn':
      push('conversation.recall_found', 'conversation.recall_none');
      push('conversation.previous', 'conversation.previous_answer', 'conversation.none', ...[...props.keys()].filter((id) => id.startsWith('delta.')));
      break;
    case 'parameters':
      push('identity.build', 'state.ascension_threshold', ...[...props.keys()].filter((id) => id.startsWith('param.')), 'state.total_nodes');
      break;
    case 'network_view':
      push('definition.network', 'state.total_nodes', 'state.active_nodes', 'state.x_n', 'definition.x_n');
      break;
    case 'limits_claims':
      push('limit.internal_only', 'limit.no_consciousness', 'limit.no_cop_membership', 'limit.shared_hybrid_tie', 'limit.finite_system', 'limit.no_self_model', 'limit.bridge_not_contraction', 'limit.llm_is_language_channel');
      break;
    case 'control_request':
      push('state.run');
      break;
    default:
      push('identity.scope', 'state.run');
      break;
  }
  if (intentResult.secondary?.includes('identity') && intentResult.intent === 'consciousness_question') {
    push('identity.identity_basis');
  }
  // Compound questions: every part gets its own propositions.
  for (const part of intentResult.compound || []) {
    push(...planAnswer({ ...intentResult, intent: part, compound: [] }, props).ids);
  }
  return { ids };
}

/**
 * Render the local answer. The text contains only proposition renderings,
 * fixed openings and fixed guidance sentences.
 */
export function composeLocalAnswer({ intentResult, plan, props, turnIndex = 0, controlProposal = null }) {
  const opening = pick(OPENINGS[intentResult.intent] || OPENINGS.unknown, turnIndex);
  const sentences = plan.ids.map((id) => renderProposition(props.get(id)));
  const tail = [];
  if (intentResult.intent === 'help' || intentResult.intent === 'unknown') tail.push(HELP_EXAMPLES);
  if (intentResult.intent === 'thanks') tail.push('Si quieres, pregúntame por el estado actual o por lo que cambió desde tu última consulta.');
  if (controlProposal) tail.push(controlProposal.text);
  const body = sentences.join(' ');
  return [opening, body, ...tail].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

export function describePlan(intentResult, plan) {
  return {
    intent: intentResult.intent,
    intentLabel: INTENT_LABELS[intentResult.intent] || intentResult.intent,
    confidence: intentResult.confidence,
    propositionIds: [...plan.ids]
  };
}

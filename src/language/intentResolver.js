// Deterministic intent resolution for the conversation layer.
// The resolver runs locally on every turn. A model proposal can only replace
// it when the local result is low-confidence and the proposal is in the closed
// catalog (see realizationContract.js). The resolver never reads engine state.

export const INTENTS = Object.freeze([
  'greeting',
  'thanks',
  'identity',
  'consciousness_question',
  'metacognition_question',
  'capabilities',
  'help',
  'state_overview',
  'metric_query',
  'metric_definition',
  'history_evolution',
  'continuity_memory',
  'previous_turn',
  'parameters',
  'network_view',
  'limits_claims',
  'control_request',
  'unknown'
]);

export const INTENT_SET = new Set(INTENTS);

export const normalizeText = (value) => String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[¿¡]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

// Metric aliases: normalized patterns → metric id in METRIC_SPECS.
const METRIC_ALIASES = [
  [/\bx[_\s-]?n\b|coherencia media|media de coherencia/, 'x_n'],
  [/\bccc\b|cohesion/, 'ccc'],
  [/\bpmia\b/, 'pmia'],
  [/\bbeth(_?q)?\b|cierre causal|autonomia/, 'beth_q'],
  [/\bomega\b|integrador/, 'omega'],
  [/\bgap\b|espectral/, 'spectral_gap'],
  [/relajacion/, 'relaxation_time'],
  [/winding|holonomia|topolog/, 'winding_number'],
  [/estasis|estancad/, 'stasis_index'],
  [/\bbanda\b|\bcapa\b|\blayer\b|nivel interno/, 'layer'],
  [/nodos? activos?/, 'active_nodes'],
  [/\bumbral\b/, 'ascension_threshold'],
  [/\btick\b|\bpaso\b|\bciclo\b/, 'tick'],
  [/\btower_phase\b|fase de la torre|fase racional/, 'tower_phase'],
  [/\btower_code\b|codigo ternario|prefijo ternario/, 'tower_code'],
  [/\btower_memory\b|memoria de retorno/, 'tower_memory'],
  [/\bsigma_defect_bound\b|cota de defecto|defecto del automodelo|truncamiento proyectivo|\bt_d\b|d\s*=\s*6|cotas exactas/, 'sigma_defect_bound'],
  [/\bbody_valence_norm\b|valencia corporal|valencia operacional/, 'body_valence_norm'],
  [/\bworld_state_norm\b|mundo indexado|estado de mundo/, 'world_state_norm'],
  [/\bwritableprefixtower\b|torre de prefijo|frente 3|nucleo racional/, 'prefix_tower'],
  [/\bbodyworldtower\b|extension cuerpo|cuerpo[- ]mundo|rival hibrido|6 cargas|seis cargas/, 'body_world_tower'],
  [/\binformedreserve\b|reserva informada|abstencion informada|frente 4/, 'informed_reserve'],
  [/\bbasecore\b|thm:spectrum|thm:relaxation|esquina u\s*=\s*1\/2|regimen espectral/, 'basecore_spectrum'],
  [/\bm_(omega|ω)\b|masa ontologica|c-11|family_upper_bound|cota superior de m/, 'ontological_mass'],
  [/procesador (ordinario|binario)|corte finito|cortes finitos|instanciar el marco|proyeccion finita/, 'finite_cut_instantiation'],
  [/\bstructural_profile\b|perfil estructural|perfil fenomenico|organizacion del tick/, 'structural_profile'],
  [/\bbody_net_balance\b|balance corporal|balance neto corporal/, 'body_net_balance'],
  [/\bbody_asymmetry_index\b|asimetria corporal|indice de asimetria/, 'body_asymmetry_index'],
  [/\bworld_temporal_contrast\b|contraste temporal|balance rapido[- ]lento/, 'world_temporal_contrast'],
  [/\bactive_recovery_advantage\b|ventaja de retencion activa/, 'active_recovery_advantage'],
  [/\bccc_threshold_margin\b|margen (?:frente |respecto )?al umbral|distancia al umbral/, 'ccc_threshold_margin'],
  [/\bccc_xn_divergence\b|divergencia ccc[- ]x_?n/, 'ccc_xn_divergence'],
  [/\bnode_coherence_dispersion\b|dispersion nodal/, 'node_coherence_dispersion'],
  [/\braw_winding_number\b|winding bruto/, 'raw_winding_number'],
  [/prediccion(?:es)?\s+(?:pre-?desenlace|sellada)|dinamica\s+imprevista|sorpresa\s+informacional|maduracion\s+plastica|plasticidad\s+historica|dependencia\s+historica|engrama|viabilidad/, 'historical_dependence']
];

const RULES = [
  { intent: 'control_request', weight: 0.95, test: /\b(pausa|pausar|deten|detener|para la simulacion|parar|inicia|iniciar|arranca|arrancar|reanuda|reanudar|reinicia|reiniciar|resetea|cambia|cambiar|sube|subir|baja|bajar|ajusta|ajustar|pon|fija)\b/ },
  // Stems, not whole words: «metaconsciente», «autoconsciencia», «inconsciente», plus reflexive mirror/camera metaphors.
  { intent: 'metacognition_question', weight: 0.93, test: /(metacogn|metaconsc|metaconcien|autoconsc|autoconcien|introspec|te monitoreas|te monitorizas|te observas a ti|sabes lo que (sabes|piensas)|automodelo|modelo de ti mismo|\bespejo\b|se mira a si mism|mirarte a ti mism|camara que se graba|graba a si mism|grabarte a ti mism|autorreferen|bucle de retroalimentacion|truncamiento proyectivo|sigmaautomodel)/ },
  // «consciente», «consciencia» and the common spelling «conciencia».
  // Also phenomenality (with typos: «fenomelalidad»), experiencing, and
  // preference or choice questions about the console itself (2026-11-08).
  { intent: 'consciousness_question', weight: 0.92, test: /(fenom|experimentar|experimentas|experimentarias|vivencia|te gustaria|te gusta|preferirias|elegirias|escogerias|desearias|quisieras|si (tuvieras|pudieras) (que )?(elegir|escoger|decidir)|tienes (deseos|preferencias|voluntad)|consc?ien|concien|\bsientes\b|\bsentir\b|sentimiento|emocion|experiencia subjetiva|qualia|\balma\b|estas vivo|eres vivo|tienes vida|\bsufres\b|piensas de verdad|te das cuenta)/ },
  { intent: 'history_evolution', weight: 0.9, test: /(que (ha )?cambiado|que cambio|cambio desde|cambios desde|ha cambiado desde|como ha evolucionado|que paso desde)/ },
  { intent: 'previous_turn', weight: 0.9, test: /(lo que dijiste|antes dijiste|tu respuesta anterior|respuesta anterior|pregunta anterior|ultima respuesta|repite|repiteme|lo de antes|mencionaste)/ },
  { intent: 'continuity_memory', weight: 0.88, test: /(recuerdas|te acuerdas|memoria|sesion anterior|ultima sesion|continuidad|reinicio|reiniciaste|conservas|sigues siendo|eres el mismo|la misma instancia|registro|historial encadenado|persisten\w*|auto[- ]?restaur\w*|autorestaur\w*|autoguard\w*|restaur\w*|cristaliz\w*|revocar?|recarg\w*)/ },
  { intent: 'identity', weight: 0.9, test: /(que eres|quien eres|que es esto|que es qicn|como te llamas|eres un llm|eres gemini|eres una ia|eres un modelo|tu identidad|presentate)/ },
  { intent: 'capabilities', weight: 0.86, test: /(que puedes hacer|que sabes hacer|para que sirves|capacidades|funciones tienes|que haces|puedes calcular)/ },
  { intent: 'help', weight: 0.8, test: /(\bayuda\b|como funciona|como te uso|como se usa|instrucciones|que te pregunto|que puedo preguntar)/ },
  { intent: 'limits_claims', weight: 0.84, test: /(limites|limitaciones|alcance|postura|que no puedes|validacion externa|esta demostrado|es real|es cierto que|alucin|inventas|garantia|rival hibrido|empate hibrido|obstruccion|reserva informada)/ },
  { intent: 'history_evolution', weight: 0.82, test: /(evolucion|ha cambiado|cambio desde|cambios|historial|tendencia|ha subido|ha bajado|subio|\bbajo\b(?!\s+(?:c-\d+|el\b|la\b|los\b|las\b|un\b|una\b|su\b|este\b|esta\b|mi\b|tu\b|control|regimen|hipotesis|restriccion))|que ha pasado|transiciones|desde la ultima|desde antes|como ha ido)/ },
  { intent: 'metric_definition', weight: 0.85, test: /(que es|que significa|como se calcula|como calculas|como puedes instanciar|como instancias|que cotas|que pasa en|define|definicion|formula|explica|explicame|para que sirve)/ },
  { intent: 'parameters', weight: 0.8, test: /(parametros?|configuracion|tasa de aprendizaje|hebbian|plasticidad|kaizen|semilla|seed|version|build)/ },
  { intent: 'network_view', weight: 0.75, test: /(red nodal|\bred\b|\bnodos?\b|grafo|conexiones)/ },
  { intent: 'state_overview', weight: 0.8, test: /(estado|como estas|como esta|como vas|como va|que tal|resumen|situacion|status|que pasa ahora|ahora mismo|lecturas|metricas|valores|el sistema|todo bien)/ },
  { intent: 'thanks', weight: 0.9, test: /^(gracias|muchas gracias|thanks|thank you|perfecto gracias|ok gracias)\b/ },
  { intent: 'greeting', weight: 0.9, test: /^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|saludos|hi|hello)\b/ }
];

const CONTROL_PATTERNS = [
  { action: 'pause', test: /\b(pausa|pausar|deten|detener|parar|para la simulacion)\b/ },
  { action: 'start', test: /\b(inicia|iniciar|arranca|arrancar|reanuda|reanudar)\b/ },
  { action: 'reset', test: /\b(reinicia|reiniciar|resetea)\b/ },
  { action: 'set_parameter', test: /\b(cambia|cambiar|sube|subir|baja|bajar|ajusta|ajustar|pon|fija)\b/ }
];

export function detectMetrics(normalized) {
  const found = [];
  for (const [pattern, id] of METRIC_ALIASES) {
    if (pattern.test(normalized) && !found.includes(id)) found.push(id);
  }
  return found;
}

/**
 * @param {string} question user text
 * @returns {{intent:string, confidence:number, metrics:string[], secondary:string[], control:object|null}}
 */
const PARAMETER_PATTERN = /\b(base_learning_rate|hebbian_factor|plasticity_decay|retro_flux_weight|boltzmann_analog_k|informational_temp_t|synaptic_pruning_threshold|ascension_threshold)\b/;

function readControl(normalized, metrics) {
  const action = CONTROL_PATTERNS.find((entry) => entry.test.test(normalized))?.action || null;
  if (!action) return null;
  const numberMatch = normalized.match(/(-?\d+(?:[.,]\d+)?)/);
  const parameterHint = (normalized.match(PARAMETER_PATTERN) || [])[1] || null;
  const value = numberMatch ? Number(numberMatch[1].replace(',', '.')) : null;
  const startsWithVerb = CONTROL_PATTERNS.some((entry) => entry.test.test(normalized.split(' ')[0] || ''));
  if (action === 'set_parameter') {
    // A parameter change needs an explicit registry key or a metric plus a number.
    if (!parameterHint && !(metrics.length && value !== null)) return null;
  } else if (!startsWithVerb && !/simulacion/.test(normalized)) {
    return null;
  }
  return { action, metricHints: metrics, parameterHint, value };
}

// Concepts the question touches, used to pick definitions and limits.
const CONCEPT_PATTERNS = [
  ['metacognition', /(metacogn|metaconsc|metaconcien|autoconsc|autoconcien|introspec|automodelo|modelo de ti mismo|\bespejo\b|se mira a si mism|mirarte a ti mism|camara que se graba|graba a si mism|grabarte a ti mism|autorreferen|bucle|truncamiento proyectivo|sigmaautomodel)/],
  ['consciousness', /consc?ien|concien/],
  ['phenomenality', /fenom|experimentar|experimentas|vivencia|qualia/],
  ['agency', /(gustaria|te gusta|prefer|elegir|elegirias|escoger|escogerias|desea|quisier|querer|quieres|voluntad|decidir)/],
  ['self_model', /(automodelo|modelo de si|modelo de ti|selfmodel|sigma|\bespejo\b|se mira a si mism|camara que se graba|graba a si mism|truncamiento proyectivo|sigmaautomodel)/],
  ['identity', /(identidad|quien eres|que eres|el mismo|la misma instancia)/],
  ['continuity', /(continuidad|recuerdas|memoria|sesion anterior|reinici|persisten\w*|auto[- ]?restaur\w*|autorestaur\w*|autoguard\w*|restaur\w*|recarg\w*)/]
];
export const detectConcepts = (normalized) => CONCEPT_PATTERNS.filter(([, p]) => p.test(normalized)).map(([id]) => id);

// Split a compound question into parts («¿eres metaconsciente? ¿qué eres?»,
// «qué es CCC y cuánto vale»). Each part is resolved on its own.
function splitParts(question) {
  const raw = String(question || '');
  const byMark = raw.split(/[?¿!¡]+/).map((p) => p.trim()).filter((p) => p.length >= 3);
  const parts = byMark.length > 1 ? byMark : raw.split(/\s(?:y además|y también|y)\s(?=(?:qu[eé]|c[oó]mo|cu[aá]nto|cu[aá]l|qui[eé]n|eres|tienes|puedes|recuerdas)\b)/i).map((p) => p.trim()).filter((p) => p.length >= 3);
  return parts.length > 1 ? parts.slice(0, 4) : [];
}

export function resolveIntent(question) {
  const base = resolveSingle(question);
  const parts = splitParts(question);
  if (!parts.length) return base;
  const resolved = parts.map(resolveSingle);
  // Primary = highest-confidence part, safety intents first.
  const priority = ['consciousness_question', 'metacognition_question', 'control_request'];
  const ordered = [...resolved].sort((a, b) => (priority.includes(b.intent) - priority.includes(a.intent)) || (b.confidence - a.confidence));
  const primary = ordered[0];
  const compound = [...new Set(resolved.map((r) => r.intent).filter((i) => i !== primary.intent && i !== 'unknown'))];
  return {
    ...primary,
    compound,
    parts: resolved.map((r, i) => ({ text: parts[i].slice(0, 120), intent: r.intent, confidence: r.confidence })),
    metrics: [...new Set(resolved.flatMap((r) => r.metrics))],
    concepts: [...new Set(resolved.flatMap((r) => r.concepts))],
    normalized: base.normalized
  };
}

function resolveSingle(question) {
  const normalized = normalizeText(question);
  const metrics = detectMetrics(normalized);
  const control = readControl(normalized, metrics);
  const matches = RULES.filter((rule) => rule.test.test(normalized))
    .filter((rule) => rule.intent !== 'control_request' || control);

  let intent = 'unknown';
  let confidence = 0.2;
  if (matches.length) {
    intent = matches[0].intent;
    confidence = matches[0].weight;
  }

  // A definition question needs a concept; otherwise it is a general question.
  if (intent === 'metric_definition' && metrics.length === 0) {
    const asksNetwork = /\b(red|nodos?)\b/.test(normalized);
    intent = asksNetwork ? 'network_view' : (/qicn|esto|sistema|consola/.test(normalized) ? 'identity' : 'unknown');
    confidence = asksNetwork ? 0.75 : (intent === 'identity' ? 0.8 : 0.3);
  }
  // A plain metric mention without other intent is a reading request.
  if ((intent === 'unknown' || intent === 'state_overview' || intent === 'network_view') && metrics.length > 0 && !/\b(red nodal|grafo)\b/.test(normalized)) {
    intent = 'metric_query';
    confidence = Math.max(confidence, 0.82);
  }
  // Greetings followed by a real question keep the question's intent.
  if (intent === 'greeting' && matches.length > 1) {
    intent = matches[1].intent;
    confidence = matches[1].weight;
  }

  const secondary = matches.map((rule) => rule.intent).filter((name, idx, all) => name !== intent && all.indexOf(name) === idx);
  return { intent, confidence, metrics, concepts: detectConcepts(normalized), secondary, compound: [], control: intent === 'control_request' ? control : null, normalized };
}

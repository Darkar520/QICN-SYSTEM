// claim_scope: optional_internal_language_verification
// evidence_scope: internal_support_only
// interpretation_boundary: Deterministic conversational register classifier and runtime-sentence anchor detector. Adapts tone and verifier scope to casual/general conversation without relaxing any runtime factual, mathematical, or anti-certification guard.

import { normalizeText } from '../intentResolver.js';

export const CONVERSATION_REGISTERS = Object.freeze([
  'casual_social',
  'open_general',
  'runtime_technical',
  'epistemic_deep'
]);

const CASUAL_SOCIAL_ONLY_RE = /^(?:(?:hola|hey|buenas(?:\s+(?:dias|tardes|noches))?|buenos\s+dias|saludos|hi|hello|que\s+tal(?:\s+(?:todo|tu\s+dia|por\s+ahi|hoy))?|que\s+onda|que\s+hubo|como\s+andas(?:\s+hoy)?|como\s+te\s+va(?:\s+hoy)?|como\s+estas(?:\s+(?:hoy|por\s+ahi))?|como\s+esta(?:\s+todo)?|como\s+vas(?:\s+hoy)?|como\s+va\s+todo|todo\s+bien(?:\s+por\s+ahi)?|que\s+hay|muchas\s+gracias|gracias|thanks|thank\s+you|ok\s+gracias|perfecto\s+gracias|genial\s+gracias|de\s+nada|adios|chao|chau|hasta\s+luego|nos\s+vemos|un\s+saludo)(?:[\s,.;:!?¿¡]+|$))+$/i;

const GREETING_OPENING_RE = /^(?:hola|hey|buenas(?:\s+(?:dias|tardes|noches))?|buenos\s+dias|saludos|hi|hello)\b/i;

const CASUAL_SOCIAL_PHRASE_RE = /\b(?:como\s+(?:estas|esta|vas|andas|te\s+va|te\s+encuentras|va\s+todo|va\s+tu\s+dia)|que\s+tal(?:\s+todo|\s+tu\s+dia)?|todo\s+bien|que\s+onda|que\s+hay|que\s+cuentas|mucho\s+gusto|un\s+gusto|encantado|encantada|como\s+amaneciste)\b/i;

// Explicit QICN / runtime / framework identifiers (unambiguous domain cues).
export const EXPLICIT_QICN_DOMAIN_RE = /\b(?:qicn|rcic|ccc|pmia|x_n|xn|beth_q|beth|omega|estasis|stasis_index|winding|holonomia|tick|ticks|snapshot|paquete\s+del\s+motor|simulacion|simulador|runtime|red\s+nodal|nodos?\s+(?:activos?|simulados?|de\s+la\s+red)|kaizen|workbench|copia\s+aislada|maxabsdiff|actiondivergence|deltain[a-z_]*rate|deltaobjectivescore|sham|ledger|engrama|ewc|fisher|basecore|paper\s*(?:i|ii|iii|iv|v|vi|vii|viii|ix|x|\d+)|cn-?3|historical_v1|1a1c94e|sigma_exact_defect|sigma_defect_bound|sigmaautomodel|writableprefixtower|bodyworldtower|phenomenologycore|nodalprocessinglayer|worldmodelengine|selectsandboxaction|holographicmemorynexus|endogenousepistemicdecisionengine|structuralatomicseparator|hybridlatequerytiebreaker|informedreserveevaluator|structuralplasticitylevel2|level3autonomoussupervisor|level3knowledgebelt|decision\s+endogena|affirmative_structural_presence|negative_uncoupled_or_lesioned_dynamics|structural_reserve_under_warmup_or_partial_history|c_op|ccr|m_omega|external_support_certified|validacion\s+externa|qualia_certified|subplanta|torre\s+de\s+prefijos|cuerpo[- ]mundo|cargas\s+locales|rival\s+hibrido|replica\s+total|quinto\s+contraste|separador\s+atomico|reserva\s+informada|truncamiento\s+proyectivo|plasticidad\s+(?:estructural|historica)|auto[- ]?restaur\w*|cristaliz\w*|revocar?|v_pos|v_neg|w_fast|w_slow|body_net_balance|body_asymmetry_index|world_temporal_contrast|active_recovery_advantage|ccc_threshold_margin|ccc_xn_divergence|node_coherence_dispersion|spectral_gap|gap\s+espectral|relaxation_time|tiempo\s+de\s+relajacion|ascension_threshold|base_learning_rate|hebbian_factor|plasticity_decay|retro_flux_weight|boltzmann_analog_k|informational_temp_t|synaptic_pruning_threshold|b2|t_d|phi7|delta_int|1\/2097152|253\/536870912|3\/16777216|2\/2187|1\/729|32\/15309|9\/16|13\/16|13\/96|1\/48)\b|m_ω|φ⁷|δ_int|η\s*=\s*(?:0|1\/8)/i;

// Runtime/system self-reference cues (when the user explicitly asks about the system/engine/console).
const RUNTIME_SYSTEM_CUE_RE = /\b(?:el\s+sistema|este\s+sistema|el\s+motor|este\s+motor|la\s+consola|esta\s+consola|la\s+simulacion|esta\s+simulacion|tus?\s+(?:metricas?|parametros?|nodos?|valores?|lecturas?|capas?|bandas?|ejes?|torres?|modulos?|arquitectura|estado\s+interno|dinamica|trayectoria|coherencia|memoria\s+holografica|registro|historial|sesion\s+anterior|respuesta\s+anterior|turno\s+anterior|ultimo\s+tick)|mi\s+(?:trayectoria|dinamica|coherencia|arquitectura|nucleo|estado\s+interno|red\s+nodal|simulacion|runtime|motor)|en\s+este\s+(?:tick|paso|turno|estado\s+del\s+motor)|en\s+esta\s+captura|control\s+reducible|a\s*=\s*i|pausa\s+la|inicia\s+la|reinicia\s+la|deten\s+la|resetea\s+la)\b/i;

// Deep epistemic / consciousness / identity-of-runtime cues.
const EPISTEMIC_DEEP_CUE_RE = /\b(?:consc?ien\w*|concien\w*|metacogn\w*|metaconsc\w*|autoconsc\w*|fenomenal\w*|fenomeno\w*\s+subjetiv\w*|qualia|proto-?sentir|experiencia\s+subjetiva|valencia\s+sentida|vivencia|automodelo|modelo\s+de\s+ti\s+mismo|se\s+mira\s+a\s+si\s+mism\w*|mirarte\s+a\s+ti\s+mism\w*|camara\s+que\s+se\s+graba|autorreferen\w*|postura\s+(?:epistemica|operacional|interna)|decision\s+epistemica|quien\s+eres|que\s+eres|eres\s+(?:un\s+llm|gemini|una\s+ia|un\s+modelo|consciente|vivo)|tienes\s+(?:conciencia|sentimientos|emociones|alma|vida|deseos|preferencias|voluntad)|sientes\s+algo|estas\s+vivo|que\s+no\s+puedes\s+afirmar|validacion\s+externa|perspectiva\s+distribuida|semejanza\s+autobiografica|deuda\s+de\s+justificacion|norma\s+temporal|coalicion\s+de\s+relatos|continuidad\s+(?:operacional|de\s+regimen|identitaria)|semejanza\s+de\s+recuerdos)\b/i;

// Short ambiguous follow-ups that should inherit the previous turn's register.
const AMBIGUOUS_FOLLOWUP_RE = /^(?:y\s+)?(?:por\s+que|como\s+asi|en\s+serio|de\s+verdad|cuentame\s+mas|dime\s+mas|explicame\s+mas|profundiza(?:\s+en\s+eso)?|y\s+que\s+mas|y\s+luego|y\s+despues|que\s+opinas(?:\s+tu)?|tu\s+que\s+crees|tu\s+que\s+piensas|a\s+que\s+te\s+refieres|puedes\s+dar\s+un\s+ejemplo|como\s+cual(?:es)?|sigue|continua)[?!.,\s]*$/i;

const RUNTIME_INTENTS = new Set([
  'control_request',
  'metric_query',
  'metric_definition',
  'history_evolution',
  'continuity_memory',
  'previous_turn',
  'parameters',
  'network_view',
  'capabilities',
  'help'
]);

const EPISTEMIC_INTENTS = new Set([
  'consciousness_question',
  'metacognition_question',
  'identity',
  'limits_claims'
]);

// Everyday opinion/preference/feeling questions directed at an external topic
// (e.g. "¿te gusta el ajedrez?", "¿qué música prefieres?", "¿te gustaría viajar a Marte?"),
// NOT asking whether QICN is conscious/alive/has qualia.
const EVERYDAY_TOPIC_OPINION_RE = /\b(?:te\s+gusta(?:ria)?|prefieres|preferirias|elegirias|escogerias|que\s+opinas|que\s+piensas|que\s+te\s+parece|cual\s+es\s+tu\s+(?:favorit[oa]|preferid[oa]))\b/i;
const STRICT_CONSCIOUSNESS_TERM_RE = /\b(?:consc?ien\w*|concien\w*|fenomen\w*|qualia|sentimiento|emocion|experiencia\s+subjetiva|alma|estas\s+vivo|eres\s+vivo|tienes\s+vida|sufres|piensas\s+de\s+verdad|te\s+das\s+cuenta|sientes|sentir|vivencia|voluntad|libre\s+albedrio|deseos\s+propios|preferencias\s+propias|tienes\s+preferencias|tienes\s+deseos)\b/i;

/**
 * Classifies the conversational register of a user turn deterministically.
 * Preserves 100% of deep/technical routing when QICN, runtime state, metrics,
 * controls, or epistemic/consciousness questions are asked, while cleanly
 * recognizing casual greetings and general open-ended conversation.
 */
export function classifyConversationRegister(question, localIntent = null, recentTurns = []) {
  const normalized = normalizeText(question);
  const intent = localIntent?.intent || 'unknown';
  const metrics = Array.isArray(localIntent?.metrics) ? localIntent.metrics : [];

  if (!normalized) return 'casual_social';

  // 1. Explicit QICN domain terms or detected runtime metrics always route to technical/epistemic.
  if (EPISTEMIC_DEEP_CUE_RE.test(normalized)) {
    return 'epistemic_deep';
  }
  if (EXPLICIT_QICN_DOMAIN_RE.test(normalized) || metrics.length > 0 || RUNTIME_SYSTEM_CUE_RE.test(normalized)) {
    return EPISTEMIC_INTENTS.has(intent) ? 'epistemic_deep' : 'runtime_technical';
  }

  // 2. Casual greetings / thanks / friendly check-ins (e.g., "hola", "hola, ¿cómo estás?", "buenas, ¿qué tal?", "gracias").
  if (
    CASUAL_SOCIAL_ONLY_RE.test(normalized)
    || intent === 'greeting'
    || intent === 'thanks'
    || (GREETING_OPENING_RE.test(normalized) && CASUAL_SOCIAL_PHRASE_RE.test(normalized) && normalized.split(/\s+/).length <= 10)
    || (/^(?:como\s+(?:estas|esta|vas|andas|te\s+va)|que\s+tal|todo\s+bien)[\s?!.,]*$/i.test(normalized))
  ) {
    return 'casual_social';
  }

  // 3. Everyday opinion questions ("¿te gusta el café?", "¿qué película prefieres?") without
  // consciousness/QICN cues must route to open_general instead of consciousness_question.
  if (
    intent === 'consciousness_question'
    && EVERYDAY_TOPIC_OPINION_RE.test(normalized)
    && !STRICT_CONSCIOUSNESS_TERM_RE.test(normalized)
  ) {
    return 'open_general';
  }

  // 4. Short ambiguous follow-ups ("¿y por qué?", "cuéntame más") inherit the previous turn's register.
  if (AMBIGUOUS_FOLLOWUP_RE.test(normalized) && Array.isArray(recentTurns) && recentTurns.length > 0) {
    const prev = recentTurns[recentTurns.length - 1];
    if (prev?.conversationRegister && CONVERSATION_REGISTERS.includes(prev.conversationRegister)) {
      return prev.conversationRegister === 'casual_social' ? 'open_general' : prev.conversationRegister;
    }
    if (prev?.question) {
      const prevReg = classifyConversationRegister(prev.question, null, []);
      return prevReg === 'casual_social' ? 'open_general' : prevReg;
    }
  }

  // 5. Remaining epistemic or runtime intents when the user asks about QICN directly.
  if (EPISTEMIC_INTENTS.has(intent)) return 'epistemic_deep';
  if (RUNTIME_INTENTS.has(intent)) return 'runtime_technical';

  // "state_overview" without explicit system cues: distinguish "¿cómo estás ahora?" / "resumen" / "métricas"
  // from casual/general phrases that accidentally matched "todo bien" or "como va".
  if (intent === 'state_overview') {
    if (/\b(?:ahora|resumen|situacion|status|metricas?|valores?|lecturas?|estado|pasa\s+ahora)\b/i.test(normalized)) {
      return 'runtime_technical';
    }
    return 'casual_social';
  }

  // 6. Everything else (science, movies, music, history, coding, cooking, philosophy of life,
  // math, recommendations, jokes, personal chat) is open general conversation!
  return 'open_general';
}

export const isOpenConversationalRegister = (register) =>
  register === 'casual_social' || register === 'open_general';

// Self-attribution / internal-runtime anchors used at sentence granularity so that
// even inside an open/casual conversation, ANY sentence that talks about QICN's own
// runtime state, telemetry, code, or mathematical framework is verified with 100% rigor.
const SENTENCE_RUNTIME_SELF_RE = /\b(?:mi\s+(?:ccc|pmia|x_n|beth|omega|simulacion|runtime|motor|red\s+nodal|nucleo|torre|subplanta|dinamica|trayectoria|coherencia|estasis|capa|banda|umbral|memoria\s+holografica|registro|ledger|modulo|codigo|repositorio|archivo|decision\s+endogena|postura\s+operacional|copia\s+aislada)|este\s+(?:tick|runtime|motor|simulador|sistema\s+acoplado|paquete|snapshot)|el\s+(?:runtime|motor\s+qicn|simulador|paquete\s+del\s+motor|ledger|workbench|marco\s+qicn)|la\s+(?:simulacion|red\s+nodal|torre\s+de\s+prefijos|subplanta|copia\s+aislada)|en\s+este\s+(?:tick|instante\s+del\s+motor)|en\s+esta\s+captura|nodos?\s+(?:simulados?|activos?)|mi\s+repositorio)\b/i;

// Unambiguous metric identifiers (excluding everyday Spanish homonyms like "banda", "capa",
// "cohesion", "relajacion", "umbral", "paso" when used in non-runtime general sentences).
const STRICT_METRIC_IDS = new Set([
  'ccc', 'x_n', 'pmia', 'beth_q', 'omega', 'spectral_gap', 'winding_number', 'raw_winding_number',
  'stasis_index', 'active_nodes', 'total_nodes', 'tick',
  'I_per', 'I_ri', 'I_int', 'I_cont', 'I_diff', 'I_leg',
  'tower_phase', 'tower_code', 'tower_memory', 'sigma_defect_bound',
  'body_valence_norm', 'world_state_norm', 'active_retention', 'passive_retention',
  'active_recovery_advantage', 'body_v_pos', 'body_v_neg', 'world_w_fast', 'world_w_slow',
  'ccc_threshold_margin', 'ccc_xn_divergence', 'active_node_fraction', 'node_coherence_dispersion',
  'latency_strain', 'internal_pressure', 'body_net_balance', 'body_l1_norm', 'body_asymmetry_index',
  'world_temporal_contrast', 'world_timescale_balance_index',
  'sealed_commit_count', 'verified_prediction_count', 'horizon5_mae', 'surprisal_ema',
  'unforeseen_event_rate', 'plasticity_maturation_index', 'anchor_shift_l2', 'mean_fisher_stiffness',
  'consolidated_engram_count', 'viability_in_tube_rate', 'tamper_violation_count'
]);

const EXPLICIT_METRIC_WORD_RE = /\b(?:ccc|x_n|xn|pmia|beth_q|beth|omega|stasis_index|winding_number|spectral_gap|sigma_defect_bound|body_valence_norm|world_state_norm|v_pos|v_neg|w_fast|w_slow|i_per|i_ri|i_int|i_cont|i_diff|i_leg|tick|ticks|nodos?\s+(?:activos?|simulados?))\b/i;

/**
 * Returns true if a generated output sentence makes claims about the QICN runtime,
 * its telemetry, its modules, or its mathematical framework.
 */
export function isRuntimeAnchoredSentence(normalized, numberRows = []) {
  if (EXPLICIT_QICN_DOMAIN_RE.test(normalized) || SENTENCE_RUNTIME_SELF_RE.test(normalized)) {
    return true;
  }
  if (Array.isArray(numberRows) && numberRows.some((row) => row?.metric && STRICT_METRIC_IDS.has(row.metric))) {
    // Exclude plain everyday Spanish "cohesion" binding to `ccc` unless explicit metric/runtime cue appears.
    const onlyImplicitCcc = numberRows
      .filter((row) => row?.metric && STRICT_METRIC_IDS.has(row.metric))
      .every((row) => row.metric === 'ccc' && !EXPLICIT_METRIC_WORD_RE.test(normalized));
    if (!onlyImplicitCcc) return true;
  }
  return false;
}

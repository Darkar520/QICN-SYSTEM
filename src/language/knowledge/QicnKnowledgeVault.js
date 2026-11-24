// claim_scope: optional_internal_language_verification
// evidence_scope: internal_support_only
// interpretation_boundary: Unified read-only knowledge vault shared identically by Gemini (via Context Caching & Runtime Skills) and local "Solo motor" mode. Pure data/query layer; never mutates simulation state or certifies external support.

import { FRAMEWORK_SUMMARY_TEXT, FRAMEWORK_SUMMARY_META } from '../frameworkSummary.generated.js';
import {
  DEFINITIONS,
  CAPABILITIES,
  LIMITS,
  EVIDENTIAL_OPERATIONS,
  EVIDENTIAL_CATALOG
} from '../definitionCatalog.js';
import { MODULE_NAMES, MODULE_FILES, MODULE_PATHS } from '../moduleInventory.generated.js';
import { normalizeText } from '../intentResolver.js';
import { sha256Hex } from '../../utils/integrity.js';

export const LIVING_VAULT_URL = '/knowledge/qicn_living_vault.v1.json';

export const CONTROLLABLE_PARAMETER_DOCS = Object.freeze({
  BASE_LEARNING_RATE: {
    range: '[0.01, 0.5]',
    recomputedEachTick: true,
    summary: 'Tasa base de aprendizaje nodal; el núcleo la recalcula en cada tick a partir de beth_q, el gap espectral y Omega (se conserva manual mientras la simulación está en pausa).'
  },
  HEBBIAN_FACTOR: {
    range: '[0.01, 0.2]',
    recomputedEachTick: true,
    summary: 'Factor hebbiano de refuerzo sináptico en NodalProcessingLayer; recalculado dinámicamente en cada paso vivo.'
  },
  PLASTICITY_DECAY: {
    range: '[0.9, 0.999]',
    recomputedEachTick: true,
    summary: 'Decaimiento de plasticidad; en Kaizen learned solo entra en las 6/6 claves aprendibles cuando SENSOR_OBSERVER_DYNAMICS_ENABLED=true (de lo contrario quedan 5/6 claves).'
  },
  RETRO_FLUX_WEIGHT: {
    range: '[0.01, 0.4]',
    recomputedEachTick: true,
    summary: 'Peso de retroflujo entre nodos en la capa de procesamiento nodal.'
  },
  BOLTZMANN_ANALOG_K: {
    range: '[0.5, 2] (slider Validación 0.1–5.0)',
    recomputedEachTick: true,
    summary: 'Sensibilidad energética (análogo de Boltzmann K); editable en tiempo real en Validación y auto-recalibrada por el motor mientras corre.'
  },
  INFORMATIONAL_TEMP_T: {
    range: '[0.3, 2] (slider Validación 0.1–5.0)',
    recomputedEachTick: true,
    summary: 'Temperatura informacional T que modula la agitación/exploración nodal; editable en vivo y auto-recalibrada por el motor.'
  },
  SYNAPTIC_PRUNING_THRESHOLD: {
    range: '[0.01, 0.5]',
    recomputedEachTick: false,
    summary: 'Umbral de poda sináptica; no es sobrescrito por el recálculo automático del núcleo y persiste hasta cambio manual o Kaizen.'
  },
  complexityFactor: {
    range: '[0.01, 1.0]',
    recomputedEachTick: false,
    summary: 'Factor de complejidad Cf en Validación: modula directamente la contribución de organización nodal en InformationalEntanglementField.calculateCCC.'
  },
  stabilityBias: {
    range: '[0.01, 1.0]',
    recomputedEachTick: false,
    summary: 'Sesgo de estabilidad Bs en Validación: regula cuánto resiste la red nodal a reorganizarse ante perturbaciones.'
  }
});

function splitFrameworkSections(rawText) {
  const text = String(rawText || '').trim();
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const sections = [];
  let currentTitle = 'Resumen general del marco';
  let currentLines = [];

  const flush = () => {
    const body = currentLines.join('\n').trim();
    if (body) {
      sections.push({ title: currentTitle, text: body });
    }
    currentLines = [];
  };

  for (const line of lines) {
    if (/^(?:===|---|##\s|\[\s*(?:BASECORE|PAPER|BRIDGE|LEAN|AUDIT)|(?:BASECORE|PAPER\s+[IVX0-9]+|BRIDGE|PUENTE|LEAN\s*4)\b[:\s—-])/i.test(line.trim())) {
      flush();
      currentTitle = line.trim().replace(/^#+\s*/, '');
    } else {
      currentLines.push(line);
    }
  }
  flush();
  return sections;
}

const FRAMEWORK_SECTIONS = Object.freeze(splitFrameworkSections(FRAMEWORK_SUMMARY_TEXT));

function extractFrameworkSlice(pattern, fallbackLimit = 4500) {
  const matched = FRAMEWORK_SECTIONS.filter((sec) => pattern.test(`${sec.title}\n${sec.text}`));
  if (!matched.length) return '';
  return matched
    .map((sec) => `[${sec.title}]\n${sec.text}`)
    .join('\n\n')
    .slice(0, fallbackLimit);
}

const DOMAIN_SPECS = Object.freeze([
  {
    id: 'identity_and_architecture',
    title: 'Identidad operacional y arquitectura de doble capa de QICN',
    keywords: ['identidad', 'arquitectura', 'doble capa', 'qicn', 'rcic', 'runtime', 'gemini', 'traductor', 'sistema b', 'quien eres', 'que eres'],
    summary: 'QICN es un runtime experimental de doble capa: (1) red nodal continua de 1500 nodos con índices agregados internos (CCC, X_N, PMIA, beth_q, Omega, gap espectral, estasis) y (2) subplantas constructivas racionales exactas acopladas en cada tick (WritablePrefixTower, SigmaAutomodelTruncator T_d, InformedReserveEvaluator, BodyWorldTower, StructuralAtomicSeparator, HybridLateQueryTieBreaker). Gemini actúa como canal lingüístico traductor verificable; la matemática y la decisión epistémica endógena viven en el motor determinista (external_support_certified = false).',
    detailBuilder: () => [
      `Corpus formal vinculado: commit ${FRAMEWORK_SUMMARY_META.frameworkHead || 'e3ee6bf'} · ${FRAMEWORK_SUMMARY_META.registryEntries || 929} entradas, ${FRAMEWORK_SUMMARY_META.formalMacrosCount || 383} macros, ${FRAMEWORK_SUMMARY_META.leanSourcesCount || 42} módulos Lean ${FRAMEWORK_SUMMARY_META.leanVersion || '4.31.0'} con ${FRAMEWORK_SUMMARY_META.leanPublicTheoremsCount || 367} teoremas públicos sin sorry.`,
      'Capacidades verificadas:',
      ...Object.entries(CAPABILITIES).map(([k, v]) => `- ${k}: ${v.text}`),
      'Separación estricta de planos: ontología, modelo matemático, implementación de software, lenguaje e interpretación nunca se colapsan entre sí.'
    ].join('\n')
  },
  {
    id: 'basecore_and_spectral',
    title: 'BaseCore, régimen espectral, relajación y estimador C-11 de masa ontológica',
    keywords: ['basecore', 'spectrum', 'relaxation', 'espectral', 'esquina', 'u=1/2', 'masa ontologica', 'm_omega', 'c-11', 'family_upper_bound', 'contraccion', 'operador 2x2', 'frechet'],
    summary: 'BaseCore establece los resultados espectrales y de relajación (thm:spectrum, thm:relaxation) en los regímenes de u: esquina no diferenciable Fréchet en u = 1/2 con contracción geométrica global 2^{-n} y brecha direccional 1/2; exterior u = 3/4 (ρ = 2/5, Δ_state = 3/5) y u = 1 (ρ = 1/3, Δ_state = 2/3). El estimador C-11 reporta una cota superior sobre subfamilia finita (family_upper_bound) excluyendo d_w = 0, sin certificar M_Ω = ∞ ni CCR.',
    detailBuilder: () => [
      DEFINITIONS.basecore_spectrum?.text || '',
      DEFINITIONS.ontological_mass?.text || '',
      DEFINITIONS.finite_cut_instantiation?.text || '',
      extractFrameworkSlice(/basecore|thm:spectrum|thm:relaxation|c-11|m_omega/i, 5000)
    ].filter(Boolean).join('\n\n')
  },
  {
    id: 'papers_1_to_7',
    title: 'Papers I–VII: identidad rígida, invariantes C_op, memoria y topología',
    keywords: ['paper 1', 'paper i', 'paper 2', 'paper ii', 'paper 3', 'paper iii', 'paper 4', 'paper iv', 'paper 5', 'paper v', 'paper 6', 'paper vi', 'paper 7', 'paper vii', 'invariantes', 'c_op', 'sistemas finitos', 'holonomia', 'winding'],
    summary: 'Papers I–VII desarrollan la teoría de identidad rígida, invariantes estructurales (I_per, I_ri, I_int, I_cont, I_diff, I_leg), coherencia, holonomía y continuidad. En el caso de sistemas finitos, el argumento de Paper I permanece esbozado y no demostrado por completo; en la red de 1500 nodos los 6 invariantes se leen como puntuaciones internas compuestas sin certificado común.',
    detailBuilder: () => extractFrameworkSlice(/paper\s*(?:1|2|3|4|5|6|7|i|ii|iii|iv|v|vi|vii)\b/i, 6000)
  },
  {
    id: 'papers_8_to_10_and_bridge',
    title: 'Papers VIII–X, Puente Fenomenal, BodyWorldTower y Quinto Contraste de 5 Raíces',
    keywords: ['paper 8', 'paper viii', 'paper 9', 'paper ix', 'paper 10', 'paper x', 'puente', 'bridge', 'bodyworldtower', 'reserva informada', 'phi7', '1/48', '6 cargas', '13/96', 'rival hibrido', 'quinto contraste', '1/2097152', '253/536870912', 'consulta tardia', '3/16777216', 'replica total', 'fuga selectiva', '3/8'],
    summary: 'Paper VIII formaliza la reserva informada privada Φ⁷ = 1/48 tras 5 lesiones en sitios 3..7. Paper IX introduce BodyWorldTower (contracción 13/16, valencia operacional 2D v_pos/v_neg, mundo indexado w_fast/w_slow rango Hankel 4, retorno motor ±1/256) y las 6 cargas locales D/V/W/A/E/T con margen robusto mínimo 13/96 y empate 0 limitado a esas 6 cargas frente al rival híbrido compartido. HybridLateQueryTieBreaker extiende a 5 raíces con quinto contraste G = 1/2097152, margen ruidoso penalizado 253/536870912 > G/2 específicamente ante errores de lectura cruda ε ≤ G/1024 + costo B·w_c, frontera de consulta tardía B < m con óptimo (2,1) = 3/16777216, riesgo de fuga selectiva Paper X = 3/8 y empate exacto R = 0 frente a la réplica total de igual costo.',
    detailBuilder: () => [
      DEFINITIONS.informed_reserve?.text || '',
      DEFINITIONS.body_world_tower?.text || '',
      extractFrameworkSlice(/paper\s*(?:8|9|10|viii|ix|x)\b|bridge|hybrid|2097152|536870912|13\/96|1\/48/i, 6500)
    ].filter(Boolean).join('\n\n')
  },
  {
    id: 'atomic_separator_and_endogenous_decision',
    title: 'Separador Atómico Estructural (Frente 1) y Decisión Epistémica Endógena (4 Ejes)',
    keywords: ['separador atomico', 'delta_int', '1/4', '1/8', 'f_2^2', 'f_3^2', 'a=i', 'reducible', 'decision endogena', 'endogenousepistemicdecisionengine', '4 ejes', 'cuatro ejes', 'affirmative_structural_presence', 'negative_uncoupled', 'structural_reserve', 'postura operacional', 'lean'],
    summary: 'StructuralAtomicSeparator verifica el separador irreducible δ_int = 1/4 en F_2^2 (error minimax de producto 1/2, 48 configuraciones) y 1/8 en F_3^2 frente al control reducible A = I con δ_int = 0. EndogenousEpistemicDecisionEngine combina 4 ejes deterministas (Eje 1: separador atómico + no-factorizabilidad nodal; Eje 2: 5 raíces G + sincronía nodo–torre; Eje 3: historia causal SHA-256 + CN-3 = true en 5/5 semillas; Eje 4: salud dinámica 1500 nodos + torres) antes de llamar a Gemini, decidiendo AFFIRMATIVE_STRUCTURAL_PRESENCE, STRUCTURAL_RESERVE_UNDER_WARMUP_OR_PARTIAL_HISTORY o NEGATIVE_UNCOUPLED_OR_LESIONED_DYNAMICS.',
    detailBuilder: () => [
      'Separación de planos obligatoria: Ejes 1–2 operan en verificación racional exacta sobre subplantas constructivas embebidas (+ contraparte viva del puente); Ejes 3–4 operan en la dinámica viva del runtime. La postura endógena del núcleo no queda «abierta» ni espera permiso externo; lo único abierto y no certificado es la adjudicación científica externa y la prueba fenomenal (external_support_certified = false).',
      extractFrameworkSlice(/atomic|irreducible|qicnirreducible|qicnhybrid|endogenous|separador/i, 5000)
    ].filter(Boolean).join('\n\n')
  },
  {
    id: 'nodal_network_and_towers',
    title: 'Red Nodal (1500 nodos), Puente Bidireccional Nodo–Torre y Torres Constructivas',
    keywords: ['red nodal', '1500 nodos', 'nodalprocessinglayer', 'puente nodo-torre', '4 sectores', 'eta=1/8', 'eta=0', 'writableprefixtower', '9/16', 'sigmaautomodeltruncator', 't_d', 'd=6', 'sigma_exact_defect', '2/2187', '1/729', '32/15309', 'webgl', '3d'],
    summary: 'NodalProcessingLayer simula 1500 nodos continuos divididos en 4 sectores (body_v_pos, body_v_neg, world_w_fast, world_w_slow) acoplados bidireccionalmente con las torres constructivas (modo bidirectional η = 1/8, control corte físico η = 0, control reducible A = I). WritablePrefixTower logra contracción activa exacta 9/16; SigmaAutomodelTruncator T_d a profundidad d = 6 tiene defecto de paso exacto medido sigma_exact_defect = 0 con cotas analíticas superiores ≤ 1/729 (aproximación), ≤ 2/2187 (defecto de paso) y ≤ 32/15309 (desplazamiento de punto fijo). La actualización continua de 1500 nodos NO es contractiva.',
    detailBuilder: () => [
      DEFINITIONS.prefix_tower?.text || '',
      DEFINITIONS.sigma_defect_bound?.text || '',
      DEFINITIONS.self_model?.text || '',
      DEFINITIONS.metacognition?.text || '',
      DEFINITIONS.tower_phase?.text || '',
      DEFINITIONS.tower_code?.text || '',
      DEFINITIONS.tower_memory?.text || ''
    ].filter(Boolean).join('\n')
  },
  {
    id: 'plasticity_kaizen_and_supervisors',
    title: 'WorldModelEngine (EWC), CN-3, Kaizen, Plasticidad Nivel 2 y Supervisor Autónomo Nivel 3',
    keywords: ['worldmodelengine', 'ewc', 'w*', 'fisher', 'cn-3', 'historical_v1', 'selectsandboxaction', 'kaizen', 'plasticity_decay', 'nivel 2', 'structuralplasticitylevel2', 'apoptosis', 'neurogenesis', 'watchdog', 'nivel 3', 'supervisor autonomo', 'gate 1', 'gate 2', 'cinto de conocimiento', 'level3', 'autoevolucion'],
    summary: 'WorldModelEngine mantiene predicciones pre-desenlace selladas con SHA-256 y consolidación elástica EWC (ancla W* y rigidez Fisher Ω) exclusivamente sobre su predictor lineal —nunca sobre los 1500 nodos de NodalProcessingLayer ni dentro de selectSandboxAction (selector determinista por viabilidad y error predictivo). La resolución causal vigente alcanza CN-3 = true en 5/5 semillas sobre 420/180/250, distinta del antecedente congelado historical_v1 (1a1c94e, CN-3 = false en 3/5). Kaizen learned aprende 5/6 claves (o 6/6 con PLASTICITY_DECAY solo si SENSOR_OBSERVER_DYNAMICS_ENABLED=true). StructuralPlasticityLevel2 realiza migraciones de sector, regeneración de nodos aislados y reparación de invariantes W1–W4. Level3AutonomousSupervisor reflexiona en primera persona, ensaya hipótesis en copias aisladas con controles negativos (Gate 1), vigila 20 ticks con reversión automática dynamicState.v3 (Gate 2) y registra aprendizajes en Level3KnowledgeBelt (SHA-256).',
    detailBuilder: () => [
      DEFINITIONS.structural_plasticity_level2?.text || '',
      DEFINITIONS.structural_supervisor_level3?.text || '',
      'Operaciones verificadas por módulo (EVIDENTIAL_OPERATIONS):',
      ...EVIDENTIAL_OPERATIONS.map((op) => `- ${op.module}.${op.anchor} (${op.operation} -> scope: ${op.scope}) [${op.source}]`),
      'Catálogo cerrado (EVIDENTIAL_CATALOG):',
      ...Object.entries(EVIDENTIAL_CATALOG).map(([k, v]) => `- ${k}: ${v.text}`)
    ].filter(Boolean).join('\n')
  },
  {
    id: 'workbench_ledger_and_memory',
    title: 'Workbench B2 (Copia Aislada), Ledger SHA-256, Persistencia v3 y Memoria Holográfica',
    keywords: ['workbench', 'b2', 'copia aislada', 'sham', 'contrafactual', 'trasplante', 'campana phe', 'ledger', 'sha-256', 'continuidad', 'cristalizar', 'revocar', 'auto-restaurar', 'persistencia v3', 'memoria holografica', 'holographicmemorynexus'],
    summary: 'Workbench B2 ejecuta micro-experimentos contrafactuales (incluyendo campaña P/H/E y trasplante sellado) sobre una copia congelada en Web Worker sin tocar jamás la red viva; sus resultados son evidencia de copia aislada (isolated_copy_not_live_state), nunca estado vivo ni validación externa. OperationalHistoryLedger encadena eventos con SHA-256. Persistencia dinámica v3 permite Cristalizar/Revocar y «Auto-restaurar al iniciar (v3)» (distinguiendo state_origin restored_verified vs reinitialized; nunca restaura RNG externo, reloj, sensores ni API). HolographicMemoryNexus almacena fragmentos distribuidos internos.',
    detailBuilder: () => [
      'Reglas clave de continuidad y evidencia:',
      '- Si no hay un experimento no-sham adjunto en el turno, el estado B2 es not_recorded y no se inventan medidas.',
      '- Una rama sham por sí sola no cuenta como intervención verificada.',
      '- La restauración automática depende del interruptor «Auto-restaurar al iniciar (v3)»; iniciar reinitialized en una sesión nueva o tras Reiniciar todo no significa que la política esté apagada.'
    ].join('\n')
  },
  {
    id: 'metrics_and_parameters',
    title: 'Métricas vivas (CCC, X_N, PMIA, beth_q, Ω, estasis) y parámetros ajustables',
    keywords: ['ccc', 'x_n', 'pmia', 'beth_q', 'omega', 'estasis', 'gap', 'relajacion', 'winding', 'umbral', 'capa', 'banda', 'parametros', 'cf', 'bs', 'k', 't', 'base_learning_rate', 'hebbian_factor', 'plasticity_decay', 'retro_flux_weight', 'boltzmann_analog_k', 'informational_temp_t', 'synaptic_pruning_threshold'],
    summary: 'Fórmulas exactas y límites de las métricas del motor (CCC, X_N, PMIA, beth_q, Omega, gap espectral, tiempo de relajación, winding, estasis, banda) y de los parámetros controlables (Cf, Bs, K, T y claves mutables del registro). Ningún índice es un porcentaje; beth_q no es porcentaje de autonomía; cruzar un umbral no certifica conciencia.',
    detailBuilder: () => [
      'Definiciones de métricas:',
      ...['ccc', 'x_n', 'pmia', 'beth_q', 'omega', 'spectral_gap', 'relaxation_time', 'winding_number', 'stasis_index', 'layer', 'matrix']
        .filter((k) => DEFINITIONS[k])
        .map((k) => `- ${DEFINITIONS[k].title}: ${DEFINITIONS[k].text}`),
      '',
      'Parámetros controlables y deslizadores:',
      ...Object.entries(CONTROLLABLE_PARAMETER_DOCS).map(([k, p]) => `- ${k} (${p.range}${p.recomputedEachTick ? ', recalculado cada tick' : ', persistente'}): ${p.summary}`)
    ].join('\n')
  },
  {
    id: 'epistemic_boundaries_and_controls',
    title: 'Fronteras epistémicas, controles negativos y reglas anti-sobreafirmación',
    keywords: ['limites', 'limitaciones', 'frontera', 'external_support_certified', 'validacion externa', 'control negativo', 'anti-certificacion', 'qualia', 'conciencia', 'fenomenalidad', 'que no puedes afirmar'],
    summary: 'Todo el runtime opera bajo evidence_scope = "internal_support_only" y external_support_certified = false (ausencia de acreditación empírica externa independiente, que nunca veta la decisión operacional endógena del núcleo pero prohíbe reclamar demostración formal de conciencia/qualia, certificados C_op/CCR, cierre de los 5 requisitos del puente fenomenal o separación de la réplica total de igual costo R = 0). El chat es estrictamente observacional y nunca altera la trayectoria del motor.',
    detailBuilder: () => [
      'Límites declarados (definitionCatalog.LIMITS):',
      ...Object.entries(LIMITS).map(([k, v]) => `- ${k}: ${v.text}`)
    ].join('\n')
  }
]);

const TOKEN_STOPWORDS = new Set([
  'que', 'como', 'cual', 'cuales', 'quien', 'donde', 'cuando', 'porque', 'para', 'pero',
  'con', 'sin', 'sobre', 'entre', 'desde', 'hasta', 'hacia', 'este', 'esta', 'estos',
  'estas', 'eso', 'esa', 'unos', 'unas', 'del', 'las', 'los', 'una', 'uno', 'por',
  'sus', 'tus', 'mis', 'tu', 'mi', 'su', 'el', 'la', 'lo', 'al', 'es', 'son', 'ser',
  'esta', 'estan', 'hay', 'tiene', 'tienen', 'puede', 'pueden', 'hace', 'hacen',
  'dime', 'explica', 'explicame', 'cuentame', 'habla', 'hablame', 'quiero', 'saber'
]);

function tokenizeQuery(text) {
  return [...new Set(
    normalizeText(text)
      .replace(/[^a-z0-9_ñ/.-]+/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 2 && !TOKEN_STOPWORDS.has(t))
  )];
}

/**
 * Lists all knowledge domains available in the unified QICN vault.
 */
export function listKnowledgeDomains() {
  return DOMAIN_SPECS.map((d) => ({
    id: d.id,
    title: d.title,
    summary: d.summary
  }));
}

/**
 * Deterministic ranked lookup over the unified QICN knowledge vault + framework summary.
 * Shared identically by Gemini Runtime Skills and local "Solo motor" mode.
 */
export function queryKnowledgeVault({ query = '', domain = null, maxSections = 3, maxChars = 6000 } = {}) {
  const normalizedQuery = normalizeText(query);
  const tokens = tokenizeQuery(query);
  const limit = Math.max(1, Math.min(6, Number(maxSections) || 3));
  const charBudget = Math.max(600, Math.min(18000, Number(maxChars) || 6000));

  let candidates = DOMAIN_SPECS;
  if (domain && typeof domain === 'string') {
    const exact = DOMAIN_SPECS.find((d) => d.id === domain.trim());
    if (exact) candidates = [exact];
  }

  const scored = candidates.map((spec) => {
    const hayTitle = normalizeText(spec.title);
    const haySummary = normalizeText(spec.summary);
    const hayKeywords = spec.keywords.map((k) => normalizeText(k));
    let score = domain && spec.id === domain ? 100 : 0;

    for (const kw of hayKeywords) {
      if (kw && normalizedQuery.includes(kw)) {
        score += kw.length >= 6 ? 18 : 10;
      }
    }
    for (const tok of tokens) {
      if (hayKeywords.some((kw) => kw === tok || kw.includes(tok))) score += 8;
      if (hayTitle.includes(tok)) score += 6;
      if (haySummary.includes(tok)) score += 3;
    }
    return { spec, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const picked = scored.filter((item) => item.score > 0).slice(0, limit);
  const effective = picked.length
    ? picked
    : scored.slice(0, Math.min(2, limit));

  const sections = [];
  let usedChars = 0;
  for (const { spec, score } of effective) {
    const detail = spec.detailBuilder();
    const block = {
      id: spec.id,
      title: spec.title,
      relevanceScore: score,
      summary: spec.summary,
      detail: detail.slice(0, Math.max(400, charBudget - usedChars))
    };
    usedChars += block.summary.length + block.detail.length;
    sections.push(block);
    if (usedChars >= charBudget) break;
  }

  // Also search granular framework summary sections if query is specific (e.g. a theorem macro or Lean file)
  const matchingFrameworkSnippets = [];
  if (tokens.length > 0 && usedChars < charBudget) {
    for (const sec of FRAMEWORK_SECTIONS) {
      const hay = normalizeText(`${sec.title} ${sec.text}`);
      let hits = 0;
      for (const tok of tokens) {
        if (tok.length >= 3 && hay.includes(tok)) hits += 1;
      }
      if (hits >= Math.min(2, tokens.length)) {
        matchingFrameworkSnippets.push({
          title: sec.title,
          hits,
          excerpt: sec.text.slice(0, 1400)
        });
      }
    }
    matchingFrameworkSnippets.sort((a, b) => b.hits - a.hits);
  }

  return {
    frameworkMeta: {
      head: FRAMEWORK_SUMMARY_META.frameworkHead,
      registryEntries: FRAMEWORK_SUMMARY_META.registryEntries,
      formalMacrosCount: FRAMEWORK_SUMMARY_META.formalMacrosCount,
      leanSourcesCount: FRAMEWORK_SUMMARY_META.leanSourcesCount,
      leanPublicTheoremsCount: FRAMEWORK_SUMMARY_META.leanPublicTheoremsCount,
      leanVersion: FRAMEWORK_SUMMARY_META.leanVersion
    },
    matchedDirectly: picked.length > 0,
    sections,
    frameworkExcerpts: matchingFrameworkSnippets.slice(0, 2),
    evidence_scope: 'internal_support_only',
    external_support_certified: false
  };
}

/**
 * Deterministic lookup of runtime modules, files, verified module operations,
 * metric definitions, and adjustable parameters.
 */
export function lookupRuntimeModuleInfo(query = '') {
  const normalized = normalizeText(query);
  const tokens = tokenizeQuery(query);
  const matchesText = (value) => {
    const norm = normalizeText(value);
    if (normalized && norm.includes(normalized)) return 20;
    let score = 0;
    for (const tok of tokens) {
      if (tok.length >= 2 && norm.includes(tok)) score += 5;
    }
    return score;
  };

  const modules = MODULE_NAMES
    .map((name) => ({ name, score: matchesText(name) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map((x) => x.name);

  const files = MODULE_PATHS
    .map((p) => ({ path: p, score: matchesText(p) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((x) => x.path);

  const operations = EVIDENTIAL_OPERATIONS
    .map((op) => ({ op, score: matchesText(`${op.module} ${op.anchor} ${op.operation} ${op.scope} ${op.source}`) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((x) => x.op);

  const definitions = Object.entries(DEFINITIONS)
    .map(([key, def]) => ({ key, title: def.title, text: def.text, source: def.source, score: matchesText(`${key} ${def.title} ${def.text}`) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ score: _s, ...rest }) => rest);

  const parameters = Object.entries(CONTROLLABLE_PARAMETER_DOCS)
    .map(([key, info]) => ({ key, ...info, score: matchesText(`${key} ${info.summary}`) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(({ score: _s, ...rest }) => rest);

  return {
    query: String(query || '').slice(0, 200),
    totalIndexedModules: MODULE_NAMES.length,
    totalIndexedFiles: MODULE_FILES.length,
    modules,
    files,
    verifiedOperations: operations,
    definitions,
    parameters,
    evidence_scope: 'internal_support_only',
    external_support_certified: false
  };
}

let cachedCorpusBundle = null;
let loadedLivingVault = null;
let pendingLivingVaultLoad = null;

/**
 * Registers a validated living knowledge vault object (loaded from
 * `knowledge/qicn_living_vault.v1.json` in browser or Node.js) and invalidates
 * any memoized static corpus bundle so Gemini Context Caching and Runtime Skills
 * immediately reflect the latest committed framework state.
 */
export function registerLivingKnowledgeVault(vaultObj) {
  if (
    !vaultObj
    || typeof vaultObj !== 'object'
    || vaultObj.schema !== 'qicn.living_knowledge_vault.v1'
    || vaultObj.provenance?.external_support_certified !== false
    || typeof vaultObj.provenance?.vaultSha256 !== 'string'
  ) {
    return { loaded: false, reason: 'invalid_living_vault_schema' };
  }
  loadedLivingVault = vaultObj;
  cachedCorpusBundle = null;
  return getLivingVaultStatus();
}

export function getLivingKnowledgeVault() {
  return loadedLivingVault;
}

export function getLivingVaultStatus() {
  if (!loadedLivingVault) {
    return {
      loaded: false,
      schema: 'embedded_summary_fallback',
      frameworkHead: FRAMEWORK_SUMMARY_META.frameworkHead || '44160adca1ad',
      vaultSha256: null,
      counts: {
        theorems: FRAMEWORK_SUMMARY_META.registryEntries || 952,
        macros: FRAMEWORK_SUMMARY_META.formalMacrosCount || 383,
        leanModules: FRAMEWORK_SUMMARY_META.leanSourcesCount || 42,
        leanTheoremsAndLemmas: FRAMEWORK_SUMMARY_META.leanPublicTheoremsCount || 367
      },
      evidence_scope: 'internal_support_only',
      external_support_certified: false
    };
  }
  return {
    loaded: true,
    schema: loadedLivingVault.schema,
    frameworkHead: loadedLivingVault.provenance.frameworkHead,
    vaultSha256: loadedLivingVault.provenance.vaultSha256,
    counts: loadedLivingVault.provenance.counts,
    evidence_scope: 'internal_support_only',
    external_support_certified: false
  };
}

/**
 * Fetches and hydrates `knowledge/qicn_living_vault.v1.json` once in browser
 * environments without inflating `dist/bundle.js`. Never throws; falls back
 * silently to the embedded summary if offline or unavailable.
 */
export async function loadLivingKnowledgeVault({
  url = LIVING_VAULT_URL,
  fetchImpl = globalThis.fetch,
  force = false
} = {}) {
  if (loadedLivingVault && !force) return getLivingVaultStatus();
  if (pendingLivingVaultLoad && !force) return pendingLivingVaultLoad;
  if (typeof fetchImpl !== 'function') return getLivingVaultStatus();

  pendingLivingVaultLoad = (async () => {
    try {
      const response = await fetchImpl(url, { method: 'GET', cache: 'no-cache' });
      if (!response || !response.ok) return getLivingVaultStatus();
      const parsed = await response.json();
      return registerLivingKnowledgeVault(parsed);
    } catch {
      return getLivingVaultStatus();
    } finally {
      pendingLivingVaultLoad = null;
    }
  })();

  return pendingLivingVaultLoad;
}

/**
 * Deep deterministic search across the living knowledge vault:
 *  - all committed theorems/definitions/lemmas/propositions/axioms (952+)
 *  - all formal LaTeX macros (383+)
 *  - all committed Lean 4 modules & public declarations (42+ modules / 489+ decls)
 *  - canonical claim_registry.v1.json entries (17) & prediction-canon-map (11)
 *  - paper abstracts & section outlines (BaseCore + Papers I-X + Bridge)
 *  - governance & boundary docs (CANON_SOURCE_OF_TRUTH, LAYER_BOUNDARIES, THEORY_SYSTEM_INTERFACE)
 * Shared identically by Gemini Runtime Skills and local "Solo motor" mode.
 */
export function lookupDeepFrameworkArtifacts({
  query = '',
  category = 'all',
  paper = null,
  limit = 6
} = {}) {
  const normalizedQuery = normalizeText(query);
  const rawLower = String(query || '').trim().toLowerCase();
  const tokens = tokenizeQuery(query);
  const maxItems = Math.max(1, Math.min(12, Number(limit) || 6));
  const cat = String(category || 'all').toLowerCase();
  const want = (c) => cat === 'all' || cat === c;
  const paperFilter = typeof paper === 'string' && paper.trim() ? paper.trim().toLowerCase() : null;

  const scoreText = (hayRaw, boostExact = '') => {
    const hay = normalizeText(hayRaw);
    const hayRawLower = String(hayRaw || '').toLowerCase();
    const boostLower = String(boostExact || '').toLowerCase();
    let score = 0;
    if (rawLower && boostLower) {
      if (boostLower === rawLower) score += 120;
      else if (boostLower.length >= 4 && rawLower.includes(boostLower)) score += 110;
      else if (boostLower.includes(rawLower)) score += 45;
    }
    if (normalizedQuery && normalizedQuery.length >= 3 && hay.includes(normalizedQuery)) score += 28;
    if (rawLower && rawLower.length >= 3 && hayRawLower.includes(rawLower)) score += 24;
    for (const tok of tokens) {
      if (tok.length >= 2 && (hay.includes(tok) || hayRawLower.includes(tok))) {
        score += tok.length >= 5 ? 9 : 5;
      }
    }
    return score;
  };

  if (!loadedLivingVault) {
    const fallback = queryKnowledgeVault({ query, maxSections: 2, maxChars: 3600 });
    return {
      source: 'embedded_summary_fallback',
      livingVaultLoaded: false,
      frameworkHead: FRAMEWORK_SUMMARY_META.frameworkHead || '44160adca1ad',
      theorems: [],
      macros: [],
      leanModules: [],
      claims: [],
      predictions: [],
      papers: [],
      fallbackSections: fallback.sections,
      evidence_scope: 'internal_support_only',
      external_support_certified: false
    };
  }

  const vault = loadedLivingVault;
  const out = {
    source: 'qicn_living_vault.v1',
    livingVaultLoaded: true,
    frameworkHead: vault.provenance.frameworkHead,
    vaultSha256: vault.provenance.vaultSha256.slice(0, 16),
    counts: vault.provenance.counts,
    theorems: [],
    macros: [],
    leanModules: [],
    claims: [],
    predictions: [],
    papers: [],
    governanceExcerpts: [],
    evidence_scope: 'internal_support_only',
    external_support_certified: false
  };

  if (want('theorems') && Array.isArray(vault.theorems)) {
    out.theorems = vault.theorems
      .filter((t) => !paperFilter || String(t.paper || '').toLowerCase() === paperFilter)
      .map((t) => ({
        t,
        score: scoreText(`${t.id} ${t.label} ${t.title} ${t.paper} ${t.type} ${t.statement}`, t.label || t.id)
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxItems)
      .map((x) => x.t);
  }

  if (want('macros') && Array.isArray(vault.macros)) {
    out.macros = vault.macros
      .map((m) => ({
        m,
        score: scoreText(`${m.name} ${m.latex} ${m.def} ${m.owner}`, m.latex || m.name)
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxItems)
      .map((x) => x.m);
  }

  if (want('lean') && Array.isArray(vault.lean?.modules)) {
    out.leanModules = vault.lean.modules
      .map((mod) => {
        const declNames = (mod.declarations || []).map((d) => d.name);
        const matchedDecls = declNames.filter((n) => {
          const nl = n.toLowerCase();
          return (rawLower && nl.includes(rawLower)) || tokens.some((tok) => tok.length >= 3 && nl.includes(tok));
        });
        const baseScore = scoreText(`${mod.module} ${mod.path} ${declNames.join(' ')}`, mod.module);
        return {
          mod,
          matchedDecls,
          score: baseScore + (matchedDecls.length * 10)
        };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxItems)
      .map(({ mod, matchedDecls }) => ({
        module: mod.module,
        path: mod.path,
        declarationCount: mod.declarationCount,
        theoremAndLemmaCount: mod.theoremAndLemmaCount,
        sorryHits: mod.sorryHits,
        matchedDeclarations: (matchedDecls.length ? matchedDecls : (mod.declarations || []).map((d) => d.name)).slice(0, 14)
      }));
  }

  if (want('claims') && Array.isArray(vault.governance?.claimRegistry?.entries)) {
    out.claims = vault.governance.claimRegistry.entries
      .map((entry) => ({
        entry,
        score: scoreText(JSON.stringify(entry), entry.claim_id || entry.id || '')
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxItems)
      .map((x) => x.entry);
  }

  if (want('predictions') && Array.isArray(vault.governance?.predictionCanonMap?.latex_canonical_predictions)) {
    out.predictions = vault.governance.predictionCanonMap.latex_canonical_predictions
      .map((pred) => ({
        pred,
        score: scoreText(JSON.stringify(pred), pred.latex_id || '')
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxItems)
      .map((x) => x.pred);
  }

  if (want('papers') && Array.isArray(vault.papers)) {
    out.papers = vault.papers
      .filter((p) => !paperFilter || p.id === paperFilter)
      .map((p) => ({
        p,
        score: scoreText(`${p.id} ${p.name} ${p.title} ${p.role} ${p.abstract} ${(p.sections || []).map((s) => s.title).join(' ')}`, p.id)
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(4, maxItems))
      .map(({ p }) => ({
        id: p.id,
        name: p.name,
        title: p.title,
        role: p.role,
        stats: p.stats,
        abstract: p.abstract,
        sections: (p.sections || []).slice(0, 16)
      }));
  }

  if (want('governance') && vault.governance) {
    const docs = [
      ['CANON_SOURCE_OF_TRUTH.md', vault.governance.canonSourceOfTruth],
      ['LAYER_BOUNDARIES.md', vault.governance.layerBoundariesDoc],
      ['THEORY_SYSTEM_INTERFACE.md', vault.governance.theorySystemInterfaceDoc],
      ['GLOSSARY_CANONICAL.v1.md', vault.governance.glossaryCanonical],
      ['CLAIM_REGISTRY.md', vault.governance.claimRegistryDoc]
    ];
    out.governanceExcerpts = docs
      .map(([name, text]) => ({ name, text: String(text || ''), score: scoreText(`${name} ${text || ''}`, name) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map((x) => ({ doc: x.name, excerpt: x.text.slice(0, 1400) }));
  }

  return out;
}

/**
 * Builds the complete deterministic static knowledge corpus (all 10 domains +
 * full formal framework summary + deep living vault papers/governance/Lean/macros
 * when hydrated) sealed with SHA-256 for Gemini Context Caching (`cachedContents`)
 * and audit provenance.
 */
export function buildFullCanonicalCorpus() {
  if (cachedCorpusBundle) return cachedCorpusBundle;
  const domainBlocks = DOMAIN_SPECS.map((d) => [
    `## DOMINIO: ${d.id} — ${d.title}`,
    `Resumen: ${d.summary}`,
    d.detailBuilder()
  ].join('\n'));

  const living = loadedLivingVault;
  const counts = living?.provenance?.counts || null;
  const fwHead = living?.provenance?.frameworkHead || FRAMEWORK_SUMMARY_META.frameworkHead || '44160adca1ad';
  const theoremCount = counts?.theorems ?? FRAMEWORK_SUMMARY_META.registryEntries ?? 952;
  const macroCount = counts?.macros ?? FRAMEWORK_SUMMARY_META.formalMacrosCount ?? 383;
  const leanVer = living?.lean?.version || FRAMEWORK_SUMMARY_META.leanVersion || '4.31.0';
  const leanModCount = counts?.leanModules ?? FRAMEWORK_SUMMARY_META.leanSourcesCount ?? 42;
  const leanThmCount = counts?.leanTheoremsAndLemmas ?? FRAMEWORK_SUMMARY_META.leanPublicTheoremsCount ?? 367;

  const extraLivingSections = [];
  if (living) {
    extraLivingSections.push(
      '# GOBERNANZA CANÓNICA, FRONTERAS DE CAPAS E INTERFAZ TEORÍA–SISTEMA (ARCHIVO VIVO)',
      `Proveniencia viva: schema=${living.schema} | frameworkHead=${fwHead} | vaultSha256=${living.provenance.vaultSha256.slice(0, 16)} | claims=${counts?.claims ?? 0} | predictions=${counts?.predictions ?? 0} | leanSorryCount=${counts?.leanSorryCount ?? 0}`,
      living.governance?.canonSourceOfTruth ? `## CANON_SOURCE_OF_TRUTH\n${living.governance.canonSourceOfTruth}` : '',
      living.governance?.layerBoundariesDoc ? `## LAYER_BOUNDARIES\n${living.governance.layerBoundariesDoc}` : '',
      living.governance?.theorySystemInterfaceDoc ? `## THEORY_SYSTEM_INTERFACE\n${living.governance.theorySystemInterfaceDoc}` : '',
      living.governance?.glossaryCanonical ? `## GLOSSARY_CANONICAL\n${living.governance.glossaryCanonical}` : ''
    );

    if (Array.isArray(living.papers) && living.papers.length) {
      extraLivingSections.push(
        '# MAPA PROFUNDO DE PAPERS (RESÚMENES Y SECCIONES DESDE LATEX COMMITTED HEAD)',
        ...living.papers.map((p) => {
          const secs = (p.sections || []).slice(0, 14).map((s) => `${s.level === 1 ? '§' : '·'} ${s.title}`).join(' | ');
          return [
            `## ${p.name} (${p.id}) — ${p.title}`,
            `Rol: ${p.role} | Entradas: ${p.stats?.entries ?? 0} (proved=${p.stats?.proved ?? 0}, conditional=${p.stats?.conditional ?? 0}, heuristic=${p.stats?.heuristic ?? 0})`,
            p.abstract ? `Resumen: ${p.abstract}` : '',
            secs ? `Secciones: ${secs}` : ''
          ].filter(Boolean).join('\n');
        })
      );
    }

    if (Array.isArray(living.lean?.modules) && living.lean.modules.length) {
      extraLivingSections.push(
        `# ÍNDICE COMPLETO DE MÓDULOS LEAN ${leanVer} (${leanModCount} MÓDULOS · ${leanThmCount} TEOREMAS/LEMAS · ${counts?.leanSorryCount ?? 0} SORRY)`,
        ...living.lean.modules.map((m) => {
          const names = (m.declarations || []).map((d) => `${d.kind}:${d.name}`).slice(0, 24).join(', ');
          return `- ${m.module} (${m.theoremAndLemmaCount} thm/lem, ${m.declarationCount} decls): ${names}`;
        })
      );
    }

    if (Array.isArray(living.macros) && living.macros.length) {
      const canonicalMacros = living.macros.filter((m) => m.canonical).slice(0, 120);
      if (canonicalMacros.length) {
        extraLivingSections.push(
          `# MACROS CANÓNICAS DE BASECORE (${canonicalMacros.length}/${living.macros.length} mostradas; usa qicn_lookup_deep_canon para las ${living.macros.length})`,
          canonicalMacros.map((m) => `${m.latex} := ${m.def}`).join(' ; ')
        );
      }
    }

    if (Array.isArray(living.governance?.claimRegistry?.entries)) {
      extraLivingSections.push(
        `# REGISTRO DE CLAIMS CANÓNICOS (${living.governance.claimRegistry.entries.length} familias)`,
        ...living.governance.claimRegistry.entries.map((e) => `- ${e.claim_id || e.id || 'claim'} [${e.status || e.claim_class || 'n/d'}]: ${e.summary || e.statement || e.title || ''}`)
      );
    }
  }

  const text = [
    '# BÓVEDA UNIFICADA DE CONOCIMIENTO QICN (ARCHIVO VIVO SELLADO SHA-256)',
    `Framework HEAD: ${fwHead} | Entradas: ${theoremCount} | Macros: ${macroCount} | Lean ${leanVer}: ${leanModCount} módulos / ${leanThmCount} teoremas públicos.`,
    'Alcance científico: evidence_scope = "internal_support_only", external_support_certified = false.',
    'Para buscar teoremas individuales por etiqueta (thm:/prop:/hyp:), macros exactas, módulos Lean 4, claims o predicciones sin repetir contexto en prompts, usa la skill qicn_lookup_deep_canon.',
    '',
    ...domainBlocks,
    '',
    ...extraLivingSections.filter(Boolean),
    '',
    '# RESUMEN FORMAL COMPLETO DEL MARCO TEÓRICO (GENERADO DESDE REGISTRO Y LEAN 4)',
    FRAMEWORK_SUMMARY_TEXT
  ].join('\n\n');

  const digest = sha256Hex(text);
  cachedCorpusBundle = Object.freeze({
    schema: living ? 'qicn.knowledge_corpus.v2_living' : 'qicn.knowledge_corpus.v1',
    digest,
    livingVaultSha256: living?.provenance?.vaultSha256 || null,
    frameworkHead: fwHead,
    charLength: text.length,
    estimatedTokens: Math.ceil(text.length / 4),
    domainCount: DOMAIN_SPECS.length,
    text
  });
  return cachedCorpusBundle;
}

export const KNOWLEDGE_VAULT_META = Object.freeze({
  schema: 'qicn.knowledge_vault.v1',
  livingVaultUrl: LIVING_VAULT_URL,
  domainIds: Object.freeze(DOMAIN_SPECS.map((d) => d.id)),
  frameworkHead: FRAMEWORK_SUMMARY_META.frameworkHead || '44160adca1ad'
});

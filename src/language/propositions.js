// Authorized propositions.
// A proposition is a sentence the engine authorizes for one turn. It is built
// from the frozen snapshot, the ledger summary, the conversation record or the
// verified catalog. Values are inserted locally from those sources only.
import { METRIC_SPECS, TOWER_METRIC_SPECS, PROFILE_METRIC_SPECS, PREDICTION_PLASTICITY_METRIC_SPECS, RECOMPUTED_EACH_TICK, formatMetricValue } from './runtimeSnapshot.js';
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

// v5 opt-in source catalog. Existing v2/v3/v4 proposition construction is intact.
export const EVIDENTIAL_BOUND_REFS = Object.freeze(['tower.sigma_defect_bound','tower.sigma_defect_bound_rational','tower.sigma_approximation_bound','tower.sigma_fixed_point_bound']);
export function evidentialMetricCatalog(snapshot) {
  const result={};
  for(const [section,specs] of [['metrics',METRIC_SPECS],['tower',TOWER_METRIC_SPECS],['structural_profile',PROFILE_METRIC_SPECS],['prediction_plasticity',PREDICTION_PLASTICITY_METRIC_SPECS]]) {
    for(const [key,spec] of Object.entries(specs)) {
      if(Number.isFinite(snapshot[section]?.[key])) result[`${section}.${key}`]={label:spec.label,source:spec.source,evidenceClass:spec.kind};
    }
  }
  for(const key of Object.keys(snapshot.config || {})) if(Number.isFinite(snapshot.config[key])) result[`config.${key}`]={label:key,source:'snapshot.config',evidenceClass:'artifact_only'};
  for(const key of ['sigma_exact_defect','sigma_defect_bound_rational','sigma_approximation_bound','sigma_fixed_point_bound']) {
    if(typeof snapshot.tower?.[key]==='string' && /^-?\d+(?:\/\d+)?$/.test(snapshot.tower[key])) result[`tower.${key}`]={label:key,source:'SigmaAutomodelTruncator',evidenceClass:key==='sigma_exact_defect'?'direct_signal':'artifact_only'};
  }
  return result;
}

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
    const hasRecoveryAdv = typeof tw.active_recovery_advantage === 'number' && Number.isFinite(tw.active_recovery_advantage);
    add(make({
      id: 'state.tower_retention',
      kind: 'state',
      template: hasRecoveryAdv
        ? 'El lazo de control activo de la torre registra una retención active_retention de {{active_retention}} frente a una retención pasiva passive_retention de {{passive_retention}}, con ventaja de retención activa de {{active_recovery_advantage}} (tasa de contracción activa certificada 9/16 = 0,5625).'
        : 'El lazo de control activo de la torre registra una retención active_retention de {{active_retention}} frente a una retención pasiva passive_retention de {{passive_retention}} (tasa de contracción activa certificada 9/16 = 0,5625).',
      values: {
        active_retention: formatMetricValue('active_retention', tw.active_retention),
        passive_retention: formatMetricValue('passive_retention', tw.passive_retention),
        ...(hasRecoveryAdv ? { active_recovery_advantage: formatMetricValue('active_recovery_advantage', tw.active_recovery_advantage) } : {})
      },
      subjects: hasRecoveryAdv ? ['active_retention', 'passive_retention', 'active_recovery_advantage'] : ['active_retention', 'passive_retention'],
      paraphrasable: true,
      evidence: { ...snapshotEvidence, class: 'direct_signal', source: `WritablePrefixTower control loop; ${snapshotEvidence.source}` }
    }));
    add(make({
      id: 'state.sigma_automodel',
      kind: 'state',
      template: `El truncamiento proyectivo de automodelo SigmaAutomodelTruncator a profundidad d = ${tw.sigma_truncation_depth ?? 6} verifica el teorema de conmutación con defecto de paso exacto medido igual a ${tw.sigma_exact_defect || '0'}, bajo la cota analítica superior sigma_defect_bound = {{sigma_defect_bound}} (${tw.sigma_defect_bound_rational || '2/2187'}), cota uniforme de aproximación ≤ ${tw.sigma_approximation_bound || '1/729'} y cota analítica de desplazamiento de punto fijo ≤ ${tw.sigma_fixed_point_bound || '32/15309'}.`,
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
    if (tw.constructive_cuts && typeof tw.constructive_cuts === 'object') {
      const bc = tw.constructive_cuts.basecore_spectral_cut || {};
      const mc = tw.constructive_cuts.ontological_mass_cut || {};
      add(make({
        id: 'state.constructive_finite_cuts',
        kind: 'state',
        template: `En los cortes proyectivos finitos constructivos, el operador 2×2 de BaseCore (thm:spectrum y thm:relaxation) evaluado en u = ${bc.active_u ?? '0'} opera en régimen ${bc.active_regime ?? 'interior_regular'} con radio espectral ρ = ${bc.spectral_radius_rho ?? 'no asignable en esquina u=1/2'} y brecha espectral Δ_state = ${bc.spectral_gap_delta_state ?? '1/2'} (esquina no diferenciable en u = 1/2 con contracción geométrica global 1/2; exterior u = 3/4 con ρ = 2/5, Δ_state = 3/5 y u = 1 con ρ = 1/3, Δ_state = 2/3), mientras que el estimador C-11 de masa ontológica M_Ω sobre subfamilia finita reporta ${mc.status || 'UPPER_BOUND_SUPPORT'} con cota superior family_upper_bound = {{family_upper_bound}} (${mc.sample_count ?? 0} muestras con d_w > 0, ${mc.excluded_count ?? 0} excluidas por d_w = 0).`,
        values: {
          family_upper_bound: formatMetricValue('ccc', mc.family_upper_bound ?? 0)
        },
        subjects: ['basecore_spectrum', 'ontological_mass', 'finite_cut_instantiation'],
        paraphrasable: true,
        evidence: { ...snapshotEvidence, class: 'derived_proxy', source: `FiniteProjectionEvaluator + OntologicalMassEstimator; ${snapshotEvidence.source}` }
      }));
      const asc = tw.constructive_cuts.atomic_separator_cut || null;
      const hlc = tw.constructive_cuts.hybrid_late_query_cut || null;
      if (asc && hlc) {
        add(make({
          id: 'state.atomic_separator_and_hybrid_tie_breaker',
          kind: 'state',
          template: `El corte constructivo de observación atómica irreducible sobre ${asc.primary_field || 'F_2^2'} (${asc.minimal_polynomial || 't^2 + t + 1'}) certifica inyectividad universal de funcionales lineales no nulos e isomorfismo de cocientes fieles con error minimax de producto ${asc.minimax_product_error || '1/2'} y δ_int = ${asc.delta_int || '1/4'} (F_3^2: δ_int = ${asc.odd_prime_f3_d2_delta_int || '1/8'}; control reducible A = I: δ_int = ${asc.reducible_control_A_eq_I_delta_int || '0'}), mientras que el desempate híbrido acoplado de 5 raíces y transcripción tardía certifica quinto contraste G = ${hlc.fifth_contrast_G || '1/2097152'} (Lipschitz ${hlc.safe_fibre_lipschitz || '105/128'}, cota corporal ${hlc.invariant_body_norm_bound || '489/512'}), margen ruidoso penalizado ${hlc.noisy_penalized_margin || '253/536870912'} (> G/2) y óptimo de partición (m,B)=(2,1) igual a ${hlc.m2_b1_optimal_partition_mean || '3/16777216'} frente a corte físico T_d (${hlc.td_cut_eta_zero_contrast || '0'}), presupuesto suficiente B = m (${hlc.sufficient_budget_B_eq_m_error || '0'}), réplica total de igual costo (R = ${hlc.equal_cost_total_replica_R || '0'}) y referencia invertida (R = ${hlc.inverted_reference_R || '-1/1048576'}).`,
          subjects: ['atomic_separator', 'hybrid_late_query_tie_breaker'],
          paraphrasable: true,
          evidence: { ...snapshotEvidence, class: 'derived_proxy', source: `StructuralAtomicSeparator + HybridLateQueryTieBreaker; ${snapshotEvidence.source}` }
        }));
      }
      const eed = tw.constructive_cuts.endogenous_epistemic_decision || null;
      if (eed && typeof eed === 'object') {
        add(make({
          id: 'state.endogenous_epistemic_decision',
          kind: 'state',
          template: `${eed.canonical_first_person_verdict} (código: ${eed.decision_code}, polaridad: ${eed.first_person_stance_polarity}, digest: ${String(eed.decision_digest || '').slice(0, 16)}).`,
          subjects: ['endogenous_epistemic_decision'],
          paraphrasable: true,
          evidence: { ...snapshotEvidence, class: 'derived_proxy', source: `EndogenousEpistemicDecisionEngine; ${snapshotEvidence.source}` }
        }));
      }
    }
  }

  // --- Pure observable structural profile (no ungrounded claims) ----------
  const sp = snapshot?.structural_profile || null;
  if (sp && typeof sp === 'object') {
    const parts = [];
    const values = {};
    const subjects = ['structural_profile'];
    const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
    if (isNum(sp.ccc_threshold_margin)) {
      parts.push('margen CCC frente al umbral de {{ccc_threshold_margin}}');
      values.ccc_threshold_margin = formatMetricValue('ccc_threshold_margin', sp.ccc_threshold_margin, snapshot?.predicates?.ccc_display_decimals ?? null);
      subjects.push('ccc_threshold_margin');
    }
    if (isNum(sp.ccc_xn_divergence)) {
      parts.push('divergencia colectiva CCC − X_N de {{ccc_xn_divergence}}');
      values.ccc_xn_divergence = formatMetricValue('ccc_xn_divergence', sp.ccc_xn_divergence);
      subjects.push('ccc_xn_divergence');
    }
    if (isNum(sp.node_coherence_dispersion)) {
      parts.push('dispersión nodal de coherencia de {{node_coherence_dispersion}}');
      values.node_coherence_dispersion = formatMetricValue('node_coherence_dispersion', sp.node_coherence_dispersion);
      subjects.push('node_coherence_dispersion');
    }
    if (isNum(sp.active_node_fraction)) {
      parts.push('fracción de nodos activos de {{active_node_fraction}}');
      values.active_node_fraction = formatMetricValue('active_node_fraction', sp.active_node_fraction);
      subjects.push('active_node_fraction');
    }
    if (isNum(sp.raw_winding_number)) {
      const orient = sp.winding_orientation ? ` (${sp.winding_orientation})` : '';
      const bif = sp.bifurcation_detected === true ? ' con bifurcación activa' : '';
      parts.push(`winding bruto de {{raw_winding_number}}${orient}${bif}`);
      values.raw_winding_number = formatMetricValue('raw_winding_number', sp.raw_winding_number);
      subjects.push('raw_winding_number');
    }
    if (isNum(sp.body_net_balance) && isNum(sp.body_asymmetry_index)) {
      parts.push(`balance corporal neto v_pos − v_neg de {{body_net_balance}} e índice de asimetría de {{body_asymmetry_index}} (${sp.body_polarity_regime || 'registrado'})`);
      values.body_net_balance = formatMetricValue('body_net_balance', sp.body_net_balance);
      values.body_asymmetry_index = formatMetricValue('body_asymmetry_index', sp.body_asymmetry_index);
      subjects.push('body_net_balance', 'body_asymmetry_index');
    }
    if (isNum(sp.world_temporal_contrast) && isNum(sp.world_timescale_balance_index)) {
      parts.push(`contraste temporal w_fast − w_slow de {{world_temporal_contrast}} e índice rápido/lento de {{world_timescale_balance_index}} (${sp.world_timescale_regime || 'registrado'})`);
      values.world_temporal_contrast = formatMetricValue('world_temporal_contrast', sp.world_temporal_contrast);
      values.world_timescale_balance_index = formatMetricValue('world_timescale_balance_index', sp.world_timescale_balance_index);
      subjects.push('world_temporal_contrast', 'world_timescale_balance_index');
    }
    if (isNum(sp.latency_strain) && isNum(sp.internal_pressure)) {
      parts.push('telemetría C-7 de esfuerzo de latencia {{latency_strain}} y presión interna {{internal_pressure}}');
      values.latency_strain = formatMetricValue('latency_strain', sp.latency_strain);
      values.internal_pressure = formatMetricValue('internal_pressure', sp.internal_pressure);
      subjects.push('latency_strain', 'internal_pressure');
    }
    if (parts.length > 0) {
      add(make({
        id: 'state.structural_profile',
        kind: 'state',
        template: `Perfil estructural observable del tick: ${parts.join('; ')}; estas magnitudes describen dinámica medible sin equivaler a estado emocional ni certificar validación externa.`,
        values,
        subjects,
        paraphrasable: true,
        evidence: { ...snapshotEvidence, class: 'derived_proxy', source: `structural_profile (runtimeSnapshot); ${snapshotEvidence.source}` }
      }));
    }
  }

  // --- Pre-outcome SHA-256 predictions & historical plasticity ------------
  const pp = snapshot?.prediction_plasticity || null;
  if (pp && typeof pp === 'object') {
    const ppValues = {};
    const ppSubjects = ['historical_dependence'];
    const parts = [];
    if (Number.isFinite(pp.sealed_commit_count)) {
      parts.push('{{sealed_commit_count}} compromisos pre-desenlace sellados con SHA-256');
      ppValues.sealed_commit_count = formatMetricValue('sealed_commit_count', pp.sealed_commit_count);
      ppSubjects.push('sealed_commit_count');
    }
    if (Number.isFinite(pp.verified_prediction_count)) {
      parts.push('{{verified_prediction_count}} predicciones verificadas en su tick objetivo');
      ppValues.verified_prediction_count = formatMetricValue('verified_prediction_count', pp.verified_prediction_count);
      ppSubjects.push('verified_prediction_count');
    }
    if (Number.isFinite(pp.horizon5_mae)) {
      parts.push('MAE en horizonte k=5 de {{horizon5_mae}}');
      ppValues.horizon5_mae = formatMetricValue('horizon5_mae', pp.horizon5_mae);
      ppSubjects.push('horizon5_mae');
    }
    if (Number.isFinite(pp.surprisal_ema)) {
      parts.push('sorpresa normalizada EMA de {{surprisal_ema}}');
      ppValues.surprisal_ema = formatMetricValue('surprisal_ema', pp.surprisal_ema);
      ppSubjects.push('surprisal_ema');
    }
    if (Number.isFinite(pp.unforeseen_event_rate)) {
      parts.push('tasa de eventos imprevistos de {{unforeseen_event_rate}}');
      ppValues.unforeseen_event_rate = formatMetricValue('unforeseen_event_rate', pp.unforeseen_event_rate);
      ppSubjects.push('unforeseen_event_rate');
    }
    if (Number.isFinite(pp.tamper_violation_count)) {
      parts.push('{{tamper_violation_count}} violaciones de sello detectadas');
      ppValues.tamper_violation_count = formatMetricValue('tamper_violation_count', pp.tamper_violation_count);
      ppSubjects.push('tamper_violation_count');
    }
    if (parts.length > 0) {
      add(make({
        id: 'state.sealed_predictions',
        kind: 'state',
        template: `Predicción pre-desenlace sellada (${pp.exogenous_regime_mode || 'off'} / ${pp.exogenous_regime_name || 'quiescent'}): ${parts.join(', ')}.`,
        values: ppValues,
        subjects: ppSubjects,
        paraphrasable: true,
        evidence: { ...snapshotEvidence, class: 'derived_proxy', source: `WorldModelEngine sealedHorizonQueue; ${snapshotEvidence.source}` }
      }));
    }

    const hpValues = {};
    const hpSubjects = ['historical_dependence'];
    const hpParts = [];
    if (Number.isFinite(pp.plasticity_maturation_index)) {
      hpParts.push('maduración plástica plasticity_maturation_index = {{plasticity_maturation_index}}');
      hpValues.plasticity_maturation_index = formatMetricValue('plasticity_maturation_index', pp.plasticity_maturation_index);
      hpSubjects.push('plasticity_maturation_index');
    }
    if (Number.isFinite(pp.anchor_shift_l2)) {
      hpParts.push('desplazamiento del ancla consolidada anchor_shift_l2 = {{anchor_shift_l2}}');
      hpValues.anchor_shift_l2 = formatMetricValue('anchor_shift_l2', pp.anchor_shift_l2);
      hpSubjects.push('anchor_shift_l2');
    }
    if (Number.isFinite(pp.mean_fisher_stiffness)) {
      hpParts.push('rigidez media acumulada mean_fisher_stiffness = {{mean_fisher_stiffness}}');
      hpValues.mean_fisher_stiffness = formatMetricValue('mean_fisher_stiffness', pp.mean_fisher_stiffness);
      hpSubjects.push('mean_fisher_stiffness');
    }
    if (Number.isFinite(pp.consolidated_engram_count)) {
      hpParts.push('{{consolidated_engram_count}} engramas estructurales deterministas');
      hpValues.consolidated_engram_count = formatMetricValue('consolidated_engram_count', pp.consolidated_engram_count);
      hpSubjects.push('consolidated_engram_count');
    }
    if (Number.isFinite(pp.viability_in_tube_rate)) {
      hpParts.push('tasa de viabilidad objetiva viability_in_tube_rate = {{viability_in_tube_rate}}');
      hpValues.viability_in_tube_rate = formatMetricValue('viability_in_tube_rate', pp.viability_in_tube_rate);
      hpSubjects.push('viability_in_tube_rate');
    }
    if (hpParts.length > 0 && Object.keys(PREDICTION_PLASTICITY_METRIC_SPECS).length > 0) {
      add(make({
        id: 'state.historical_plasticity',
        kind: 'state',
        template: `Plasticidad histórica consolidada y viabilidad: ${hpParts.join('; ')}; estas variables reflejan memoria dinámica interna y no equivalen a vivencia subjetiva ni certificación externa (external_support_certified = false).`,
        values: hpValues,
        subjects: hpSubjects,
        paraphrasable: true,
        evidence: { ...snapshotEvidence, class: 'derived_proxy', source: `WorldModelEngine + HolographicMemoryNexus + KaizenMetamorphosisEngine; ${snapshotEvidence.source}` }
      }));
    }
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
    const restoreMeta = ledger.currentSession?.restore || ledger.currentSession?.stateOriginMeta || null;
    add(make({
      id: 'continuity.state_origin',
      kind: 'continuity',
      template: origin === 'restored_verified'
        ? (restoreMeta && restoreMeta.schema === 'v2'
          ? 'En esta sesión restauré un resumen de estado guardado cuyo digest coincidió; la red nodal y los historiales internos no forman parte de ese resumen.'
          : 'En esta sesión restauré el estado dinámico interno completo guardado (red nodal, memoria, Kaizen, torres acopladas e historiales internos) tras verificar su digest SHA-256; el estado externo (Math.random(), reloj de pared y sensores en vivo) no se restaura.')
        : 'En esta sesión la dinámica empezó reinicializada al arrancar (por primera sesión, por haberse pulsado Reiniciar, por estar desactivada la auto-restauración o por no existir una captura v3 verificada para este build): no se cargó estado dinámico previo en este arranque, lo cual describe solo cómo comenzó esta sesión y no deshabilita la política de persistencia v3.',
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

  // --- Persistence v3 policy (separate from current session origin) ---------
  const pers = snapshot?.persistence || null;
  const autosaveTicks = Number.isFinite(pers?.autosave_interval_ticks) ? pers.autosave_interval_ticks : 60;
  const persistenceVersion = pers?.storage_version || 'v3';
  const persistenceStatusLead = pers
    ? (pers.auto_restore_enabled
      ? `La persistencia dinámica ${persistenceVersion} tiene la auto-restauración al iniciar ACTIVA (interruptor «Auto-restaurar al iniciar (v3)» = ACTIVO): `
      : `La persistencia dinámica ${persistenceVersion} tiene la auto-restauración al iniciar DESACTIVADA (interruptor «Auto-restaurar al iniciar (v3)» = INACTIVO): aunque exista una captura ${persistenceVersion} guardada, al recargar no se restaurará automáticamente a menos que actives el interruptor o pulses Revocar manualmente; `)
    : `El runtime dispone de persistencia dinámica ${persistenceVersion} (con interruptor «Auto-restaurar al iniciar (v3)» activo por defecto en la interfaz, aunque su estado actual no vino en esta captura headless): `;
  add(make({
    id: 'continuity.persistence_policy',
    kind: 'continuity',
    template: `${persistenceStatusLead}autoguarda cada ${autosaveTicks} ticks y al ocultar o cerrar la pestaña (visibilitychange / pagehide), además de manualmente con Cristalizar, el estado dinámico interno completo (red nodal, memoria holográfica, Kaizen, torres acopladas e historiales internos) sellado con digest SHA-256, esquema qicn.dynamic_state.v3, versión y firma del build y nodeCount (y revocable manualmente con Revocar). Cuando la auto-restauración está activa y la captura supera la verificación, dicho estado dinámico completo sí se restaura automáticamente al recargar; pulsar Reiniciar purga la captura guardada y reinicializa la dinámica; el estado externo (Math.random(), reloj de pared, sensores en vivo, registro de llamadas API y configuración de proveedores) nunca se captura ni se restaura.`,
    evidence: pers
      ? { ...snapshotEvidence, source: `src/persistence/dynamicState.js; src/persistence/stateStore.js; ${snapshotEvidence.source}` }
      : { class: 'catalog', source: 'src/persistence/dynamicState.js; src/persistence/stateStore.js; SimulationEngine (persistencia dinámica v3)' }
  }));

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
  const hasVerifiedPredictions = (snapshot?.prediction_plasticity?.verified_prediction_count || 0) > 0;
  for (const [id, entry] of Object.entries(HYPOTHESES)) {
    if (id === 'unforeseen_dynamics' && hasVerifiedPredictions) {
      add(make({
        id: 'hypothesis.unforeseen_dynamics',
        kind: 'hypothesis',
        template: 'En esta captura sí opero con predicciones pre-desenlace selladas en memoria con SHA-256 (WorldModelEngine + SigmaAutomodelTruncator) y verificadas al cumplirse el horizonte t+k, así que distingo y mido eventos imprevistos respecto a lo previsto; aun así, ello constituye soporte operacional interno (external_support_certified = false) y no demuestra por sí solo conciencia ni experiencia subjetiva.',
        hypothetical: false,
        evidence: {
          class: 'framework_open_question',
          source: 'src/simulation/WorldModelEngine.js (compromisos SHA-256 pre-desenlace); SigmaAutomodelTruncator; Paper IV/VI/VII'
        }
      }));
      continue;
    }
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

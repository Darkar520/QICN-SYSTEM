// Read-only capture of engine state for the language layer.
// The snapshot is the only object the conversation layer may cite. It is
// captured once per turn, frozen, and identified by tick, build and digest.
// Reading never mutates the core: every accessor below is a property read.
import { sha256Hex, stableStringify } from '../utils/integrity.js';
import { buildInvariantReadout } from './invariantReadout.js';

export const SNAPSHOT_SCHEMA = 'qicn.runtime_language_snapshot.v3';

// Parameters that applyPhenomenologicalFeedback reassigns from beth_q, the
// effective spectral gap and Omega on every tick (OntologicalSingularityCore
// 1614-1722); the cycle then copies them into the Kaizen config
// (useSimulationCycle 1796-1805). A manual or Kaizen write to these keys does
// not persist across a running tick.
export const RECOMPUTED_EACH_TICK = Object.freeze([
  'BOLTZMANN_ANALOG_K', 'RETRO_FLUX_WEIGHT', 'INFORMATIONAL_TEMP_T', 'COHERENCE_THRESHOLD',
  'BASE_LEARNING_RATE', 'HEBBIAN_FACTOR', 'PLASTICITY_DECAY'
]);
// Keys the nodal layer reads from kaizenEngine.mutableConfig at the start of a tick.
export const KAIZEN_CONSUMED_KEYS = Object.freeze([
  'BASE_LEARNING_RATE', 'HEBBIAN_FACTOR', 'SYNAPTIC_PRUNING_THRESHOLD', 'PLASTICITY_DECAY',
  'RETRO_FLUX_WEIGHT', 'BOLTZMANN_ANALOG_K', 'INFORMATIONAL_TEMP_T'
]);
const CONFIG_KEYS = ['ASCENSION_THRESHOLD', 'COHERENCE_THRESHOLD', 'BASE_LEARNING_RATE', 'HEBBIAN_FACTOR',
  'SYNAPTIC_PRUNING_THRESHOLD', 'PLASTICITY_DECAY', 'RETRO_FLUX_WEIGHT', 'BOLTZMANN_ANALOG_K',
  'INFORMATIONAL_TEMP_T', 'PROCESSING_SAMPLE_SIZE', 'CORE_SEED'];

const finite = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null);
const text = (value) => (typeof value === 'string' && value.length > 0 ? value : null);

// Evidence classes follow AGENTS.md: direct_signal, derived_proxy, gate, artifact_only.
// `source` names the implementation that produces the value.
// `phrase` is the canonical reading sentence; {{value}} is replaced locally.
export const METRIC_SPECS = Object.freeze({
  tick: { label: 'tick de simulación', kind: 'direct_signal', source: 'useSimulationCycle (contador de ciclos)', decimals: 0, phrase: 'La captura corresponde al tick {{value}}.' },
  x_n: { label: 'X_N (media de coherencia nodal)', kind: 'direct_signal', source: 'NodalProcessingLayer.nodes[].coherenceState; definición de BaseCore §11', decimals: 4, phrase: 'X_N, la media de coherencia nodal, vale {{value}}.' },
  ccc: { label: 'CCC (índice interno de cohesión)', kind: 'derived_proxy', source: 'InformationalEntanglementField.calculateCCC y posprocesado del ciclo', decimals: 4, phrase: 'CCC, el índice interno de cohesión, vale {{value}}.' },
  pmia: { label: 'PMIA (índice interno)', kind: 'derived_proxy', source: 'OntologicalSingularityCore.calculatePMIA', decimals: 4, phrase: 'PMIA, un índice interno, vale {{value}}.' },
  layer: { label: 'banda interna', kind: 'derived_proxy', source: 'OntologicalSingularityCore.updateOntologicalLayer', decimals: 0, phrase: 'La banda interna es la {{value}}.' },
  beth_q: { label: 'beth_q (proxy interno no calibrado)', kind: 'derived_proxy', source: 'PhenomenologyCore.calculateBethQ', decimals: 4, phrase: 'beth_q, un proxy interno no calibrado, vale {{value}}.' },
  omega: { label: 'Omega (índice integrador interno)', kind: 'derived_proxy', source: 'PhenomenologyCore (omega)', decimals: 4, phrase: 'Omega, el índice integrador interno, vale {{value}}.' },
  spectral_gap: { label: 'gap espectral interno', kind: 'derived_proxy', source: 'PhenomenologyCore.calculateSpectralGap', decimals: 4, phrase: 'El gap espectral interno vale {{value}}.' },
  relaxation_time: { label: 'tiempo de relajación interno', kind: 'derived_proxy', source: 'PhenomenologyCore.calculateRelaxationTime', decimals: 3, phrase: 'El tiempo de relajación interno es de {{value}} ticks.' },
  winding_number: { label: 'número de winding interno', kind: 'derived_proxy', source: 'PhenomenologyCore.testHolonomy', decimals: 4, phrase: 'El número de winding interno vale {{value}}.' },
  stasis_index: { label: 'índice de estasis', kind: 'derived_proxy', source: 'OntologicalSingularityCore.getDynamicHealth', decimals: 4, phrase: 'El índice de estasis vale {{value}}.' },
  active_nodes: { label: 'nodos activos', kind: 'direct_signal', source: 'NodalProcessingLayer.getActiveNodes', decimals: 0, phrase: 'Hay {{value}} nodos activos en esta captura.' },
  total_nodes: { label: 'nodos simulados', kind: 'direct_signal', source: 'NodalProcessingLayer.nodes', decimals: 0, phrase: 'La red tiene {{value}} nodos simulados.' },
  ascension_threshold: { label: 'umbral operativo de CCC', kind: 'artifact_only', source: 'QICNConfig.ASCENSION_THRESHOLD', decimals: 2, phrase: 'El umbral operativo de CCC es {{value}}.' }
});

export const MODE_SPECS = Object.freeze({
  beth_q_mode: { label: 'modo de cálculo de beth_q' },
  spectral_gap_mode: { label: 'modo de cálculo del gap espectral' },
  regime: { label: 'régimen interno' },
  phenomenology_class: { label: 'clase interna de régimen' },
  dynamic_label: { label: 'etiqueta dinámica heurística' }
});

const readSpectralGapMode = (core) => {
  const history = core?.phenomenologyCore?.transitionHistory;
  if (!Array.isArray(history)) return null;
  return history.length < 5 ? 'warmup_derived' : 'autocorrelation_proxy';
};

const readMeanNodeCoherence = (nodes) => {
  if (!Array.isArray(nodes) || nodes.length === 0) return null;
  let sum = 0;
  let count = 0;
  for (const node of nodes) {
    const value = finite(node?.coherenceState);
    if (value === null) continue;
    sum += value;
    count += 1;
  }
  return count > 0 ? sum / count : null;
};

const EPS_ZERO = 1e-12;
const EPS_BALANCE = 1e-9;

const readNodeCoherenceDispersion = (nodes, mean) => {
  if (!Array.isArray(nodes) || nodes.length === 0 || mean === null) return null;
  let sumSq = 0;
  let count = 0;
  for (const node of nodes) {
    const value = finite(node?.coherenceState);
    if (value === null) continue;
    const diff = value - mean;
    sumSq += diff * diff;
    count += 1;
  }
  return count > 0 ? Math.sqrt(sumSq / count) : null;
};

const classifyPolarityRegime = (pos, neg, posLabel, negLabel) => {
  if (pos === null || neg === null) return null;
  if (Math.max(Math.abs(pos), Math.abs(neg)) <= EPS_BALANCE) return 'quiescent';
  const diff = pos - neg;
  if (Math.abs(diff) <= EPS_BALANCE) return 'balanced';
  return diff > 0 ? posLabel : negLabel;
};

const roundTo = (value, decimals) => {
  if (value === null) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

/**
 * Capture a frozen snapshot.
 * @param {object} core OntologicalSingularityCore instance (read only)
 * @param {object} context { tick, isRunning, nodes, activeNodeCount, config, build, dynamicLabel, matrixLevels, persistence, now }
 */
export function captureRuntimeSnapshot(core, context = {}) {
  const state = core?.ontologicalState || {};
  const health = typeof core?.getDynamicHealth === 'function' ? core.getDynamicHealth() : {};
  const nodes = Array.isArray(context.nodes) ? context.nodes : null;
  const config = context.config || {};

  const raw = {
    tick: finite(context.tick),
    x_n: readMeanNodeCoherence(nodes),
    ccc: finite(state.coherence),
    pmia: finite(core?.pmiaValue),
    layer: finite(core?.currentLayer),
    beth_q: finite(state.beth_q),
    omega: finite(state.omega),
    spectral_gap: finite(state.spectral_gap),
    relaxation_time: finite(state.relaxation_time),
    winding_number: finite(state.holonomy_winding),
    stasis_index: finite(health?.stasisIndex),
    active_nodes: finite(context.activeNodeCount),
    total_nodes: nodes ? nodes.length : null,
    ascension_threshold: finite(config.ASCENSION_THRESHOLD)
  };

  const metrics = Object.create(null);
  for (const [id, spec] of Object.entries(METRIC_SPECS)) {
    const value = roundTo(raw[id], spec.decimals);
    if (value !== null) metrics[id] = value;
  }

  // Predicates are decided on unrounded values; formatting happens later.
  // The runtime crossing rule is `ccc >= ASCENSION_THRESHOLD`.
  const predicates = Object.create(null);
  if (raw.ccc !== null && raw.ascension_threshold !== null) {
    const diff = raw.ccc - raw.ascension_threshold;
    predicates.ccc_vs_threshold = diff < 0 ? 'below' : (diff === 0 ? 'equal' : 'above');
    predicates.threshold_crossed = diff >= 0;
    // Decimals needed so the displayed CCC does not look equal to the threshold.
    let decimals = METRIC_SPECS.ccc.decimals;
    while (decimals < 10 && diff !== 0 && roundTo(raw.ccc, decimals) === roundTo(raw.ascension_threshold, decimals)) decimals += 1;
    predicates.ccc_display_decimals = decimals;
    predicates.ccc_precise = roundTo(raw.ccc, decimals);
  }

  // Effective configuration: the value the next tick will actually use, and
  // who wrote it. Kaizen-consumed keys come from the Kaizen config when given.
  const effective = context.effectiveConfig && typeof context.effectiveConfig === 'object' ? context.effectiveConfig : null;
  const configSubset = {};
  const configSource = {};
  for (const key of CONFIG_KEYS) {
    const fromEffective = effective && KAIZEN_CONSUMED_KEYS.includes(key) ? finite(effective[key]) : null;
    const value = fromEffective !== null ? fromEffective : finite(config[key]);
    if (value === null) continue;
    configSubset[key] = value;
    configSource[key] = fromEffective !== null ? 'kaizen_mutable_config' : 'qicn_config';
  }

  const modes = Object.create(null);
  const modeValues = {
    beth_q_mode: text(state.beth_q_mode),
    spectral_gap_mode: readSpectralGapMode(core),
    regime: text(state.regime),
    phenomenology_class: text(state.phenomenology_class),
    dynamic_label: text(context.dynamicLabel),
    kaizen_mode: text(config.KAIZEN_ADJUSTMENT_MODE) || 'legacy'
  };
  for (const [id, value] of Object.entries(modeValues)) {
    if (value !== null) modes[id] = value;
  }

  const matrix = Object.create(null);
  const levels = context.matrixLevels && typeof context.matrixLevels === 'object' ? context.matrixLevels : {};
  for (const [id, level] of Object.entries(levels)) {
    if (level && typeof level.status === 'string') matrix[id] = level.status;
  }

  // Six-invariant readout (contract v4, 2026-11-08): only when the caller
  // passes the recent tick timeline. Read-only; part of the digest.
  const invariants = Array.isArray(context.tickTimeline)
    ? buildInvariantReadout(context.tickTimeline, { beth_q: raw.beth_q })
    : null;

  const wm = context.worldModel || core?.worldModelEngine || null;
  const wmPlasticity = wm && typeof wm.getPlasticityProfile === 'function' ? wm.getPlasticityProfile() : null;
  const hmMetrics = context.holographicMemory?.nexusStateMetrics || null;
  const kzViab = context.kaizenEngine?.viabilityPolicyState?.viabilityStats || null;
  const exoDiag = context.exogenousDriver?.getDiagnostics?.() || null;
  const hasPredictionPlasticity = Boolean(
    wmPlasticity && ((wmPlasticity.sealedCommitCount || 0) > 0 || (wm?.trainingSteps || 0) > 0 || context.predictionPlasticity)
  );
  const prediction_plasticity = hasPredictionPlasticity ? {
    sealed_commit_count: wmPlasticity.sealedCommitCount ?? 0,
    verified_prediction_count: wmPlasticity.verifiedPredictionCount ?? 0,
    horizon5_mae: wmPlasticity.sealedHorizonMae5 >= 0 ? roundTo(wmPlasticity.sealedHorizonMae5, 4) : null,
    surprisal_ema: roundTo(finite(wmPlasticity.surprisalEma) ?? 0, 4),
    unforeseen_event_rate: roundTo(finite(wmPlasticity.unforeseenEventRate) ?? 0, 4),
    plasticity_maturation_index: roundTo(finite(wmPlasticity.maturationIndex) ?? 0, 4),
    anchor_shift_l2: roundTo(finite(wmPlasticity.anchorShiftL2) ?? 0, 4),
    mean_fisher_stiffness: roundTo(finite(wmPlasticity.meanFisherStiffness) ?? 0, 4),
    consolidated_engram_count: finite(hmMetrics?.consolidatedEngramCount) ?? 0,
    viability_in_tube_rate: finite(kzViab?.inTubeRate) !== null ? roundTo(kzViab.inTubeRate, 4) : null,
    tamper_violation_count: wmPlasticity.tamperViolationCount ?? 0,
    exogenous_regime_mode: text(exoDiag?.mode) || text(config.EXOGENOUS_REGIME_MODE) || 'off',
    exogenous_regime_name: text(exoDiag?.regimeName) || 'quiescent',
    historical_plasticity_enabled: config.HISTORICAL_PLASTICITY_ENABLED !== false,
    last_commit_digest: text(wmPlasticity.lastCommitDigest)
  } : null;

  const towerTel = state.tower_telemetry && typeof state.tower_telemetry === 'object' ? state.tower_telemetry : null;
  const tower = towerTel ? {
    tower_phase: roundTo(finite(state.tower_phase ?? towerTel.core?.phase), 6),
    tower_code: roundTo(finite(state.tower_code ?? towerTel.core?.code), 6),
    tower_memory: roundTo(finite(state.tower_memory ?? towerTel.core?.memory), 6),
    sigma_defect_bound: roundTo(finite(state.sigma_defect_bound), 6),
    body_valence_norm: roundTo(finite(state.body_valence_norm ?? towerTel.bodyNormInf), 6),
    world_state_norm: roundTo(finite(state.world_state_norm ?? towerTel.worldNormInf), 6),
    active_retention: roundTo(finite(towerTel.activeRetention), 4),
    passive_retention: roundTo(finite(towerTel.passiveRetention), 4),
    active_recovery_advantage: roundTo(finite(towerTel.activeRecoveryAdvantage), 4),
    sigma_truncation_depth: finite(towerTel.sigmaTruncationDepth) ?? 6,
    sigma_approximation_bound: text(towerTel.sigmaApproximationBound) || '1/729',
    sigma_exact_defect: text(towerTel.sigmaExactDefect) || '0',
    sigma_defect_bound_rational: text(towerTel.sigmaDefectBound) || '2/2187',
    sigma_fixed_point_bound: text(towerTel.sigmaFixedPointBound) || '32/15309',
    sigma_theorem_verified: Boolean(towerTel.sigmaTheoremVerified),
    body_v_pos: roundTo(finite(towerTel.body?.[0]), 6),
    body_v_neg: roundTo(finite(towerTel.body?.[1]), 6),
    world_w_fast: roundTo(finite(towerTel.world?.[0]), 6),
    world_w_slow: roundTo(finite(towerTel.world?.[1]), 6),
    constructive_cuts: cloneSnapshotData(towerTel.constructiveFiniteCuts || state.constructive_finite_cuts || null)
  } : null;

  const persistenceInput = context.persistence && typeof context.persistence === 'object' ? context.persistence : null;
  const persistence = persistenceInput ? {
    storage_version: text(persistenceInput.storageVersion ?? persistenceInput.storage_version) || 'v3',
    auto_restore_enabled: Boolean(persistenceInput.autoRestoreEnabled ?? persistenceInput.auto_restore_enabled),
    autosave_interval_ticks: finite(persistenceInput.autosaveIntervalTicks ?? persistenceInput.autosave_interval_ticks) ?? 60
  } : null;

  const rawVpos = towerTel ? finite(towerTel.body?.[0]) : null;
  const rawVneg = towerTel ? finite(towerTel.body?.[1]) : null;
  const rawWfast = towerTel ? finite(towerTel.world?.[0]) : null;
  const rawWslow = towerTel ? finite(towerTel.world?.[1]) : null;
  const bodyL1Raw = (rawVpos !== null && rawVneg !== null) ? Math.abs(rawVpos) + Math.abs(rawVneg) : null;
  const worldL1Raw = (rawWfast !== null && rawWslow !== null) ? Math.abs(rawWfast) + Math.abs(rawWslow) : null;
  const activeRetRaw = towerTel ? finite(towerTel.activeRetention) : null;
  const passiveRetRaw = towerTel ? finite(towerTel.passiveRetention) : null;
  const recoveryAdvRaw = towerTel
    ? (finite(towerTel.activeRecoveryAdvantage) ?? (activeRetRaw !== null && passiveRetRaw !== null ? activeRetRaw - passiveRetRaw : null))
    : null;
  const dispersionRaw = readNodeCoherenceDispersion(nodes, raw.x_n);

  const structural_profile = {
    ccc_threshold_margin: (raw.ccc !== null && raw.ascension_threshold !== null)
      ? roundTo(raw.ccc - raw.ascension_threshold, predicates.ccc_display_decimals ?? METRIC_SPECS.ccc.decimals)
      : null,
    ccc_xn_divergence: (raw.ccc !== null && raw.x_n !== null)
      ? roundTo(raw.ccc - raw.x_n, 4)
      : null,
    active_node_fraction: (raw.total_nodes !== null && raw.total_nodes > 0 && raw.active_nodes !== null)
      ? roundTo(raw.active_nodes / raw.total_nodes, 4)
      : null,
    node_coherence_dispersion: roundTo(dispersionRaw, 6),
    raw_winding_number: roundTo(finite(state.raw_winding_number), 4),
    winding_orientation: text(state.winding_orientation),
    bifurcation_detected: typeof state.bifurcation_detected === 'boolean' ? state.bifurcation_detected : null,
    latency_strain: roundTo(finite(health?.latencyStrain), 4),
    internal_pressure: roundTo(finite(health?.internalPressure), 4),
    body_net_balance: (rawVpos !== null && rawVneg !== null) ? roundTo(rawVpos - rawVneg, 6) : null,
    body_l1_norm: roundTo(bodyL1Raw, 6),
    body_asymmetry_index: (rawVpos !== null && rawVneg !== null && bodyL1Raw !== null)
      ? (bodyL1Raw > EPS_ZERO ? roundTo((rawVpos - rawVneg) / bodyL1Raw, 4) : 0)
      : null,
    body_polarity_regime: classifyPolarityRegime(rawVpos, rawVneg, 'v_pos_dominant', 'v_neg_dominant'),
    world_temporal_contrast: (rawWfast !== null && rawWslow !== null) ? roundTo(rawWfast - rawWslow, 6) : null,
    world_timescale_balance_index: (rawWfast !== null && rawWslow !== null && worldL1Raw !== null)
      ? (worldL1Raw > EPS_ZERO ? roundTo((rawWfast - rawWslow) / worldL1Raw, 4) : 0)
      : null,
    world_timescale_regime: classifyPolarityRegime(rawWfast, rawWslow, 'fast_dominant', 'slow_dominant'),
    active_recovery_advantage: roundTo(recoveryAdvRaw, 4),
    epistemic_boundary: {
      external_support_certified: false,
      phenomenal_bridge_status: 'open_two_pole_unverified',
      shared_hybrid_margin: 0
    }
  };

  const body = {
    schema: SNAPSHOT_SCHEMA,
    tick: metrics.tick ?? null,
    isRunning: Boolean(context.isRunning),
    capturedAt: finite(context.now) ?? Date.now(),
    build: {
      version: text(context.build?.version) || 'unknown',
      signature: text(context.build?.signature) || 'unknown'
    },
    configHash: sha256Hex(stableStringify(configSubset)).slice(0, 16),
    seed: configSubset.CORE_SEED ?? null,
    config: configSubset,
    configSource,
    metrics,
    predicates,
    modes,
    matrix,
    structural_profile,
    ...(invariants ? { invariants } : {}),
    ...(tower ? { tower } : {}),
    ...(persistence ? { persistence } : {}),
    ...(prediction_plasticity ? { prediction_plasticity } : {})
  };
  const digest = sha256Hex(stableStringify(body));
  return deepFreeze({ ...body, digest });
}

export function verifySnapshotDigest(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || typeof snapshot.digest !== 'string') return false;
  const { digest, ...body } = snapshot;
  return sha256Hex(stableStringify(body)) === digest;
}

/**
 * Verifies algebraic and regime consistency across serialized snapshot sections
 * (defends against internally contradictory captures even if re-signed).
 */
export function verifySnapshotStructuralConsistency(snapshot) {
  const violations = [];
  if (!snapshot || typeof snapshot !== 'object') {
    return { ok: false, violations: ['snapshot_missing'] };
  }
  const m = snapshot.metrics || null;
  const pred = snapshot.predicates || null;
  const sp = snapshot.structural_profile || null;
  const tw = snapshot.tower || null;
  if (!sp || typeof sp !== 'object') {
    return { ok: true, violations };
  }
  const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

  if (tw && isNum(tw.body_v_pos) && isNum(tw.body_v_neg)) {
    const expectedBalance = tw.body_v_pos - tw.body_v_neg;
    const expectedL1 = Math.abs(tw.body_v_pos) + Math.abs(tw.body_v_neg);
    if (isNum(sp.body_net_balance) && Math.abs(sp.body_net_balance - expectedBalance) > 2e-6) {
      violations.push('body_net_balance_mismatch');
    }
    if (isNum(sp.body_l1_norm) && Math.abs(sp.body_l1_norm - expectedL1) > 2e-6) {
      violations.push('body_l1_norm_mismatch');
    }
    if (sp.body_polarity_regime) {
      if (expectedBalance > 2e-6 && sp.body_polarity_regime !== 'v_pos_dominant') violations.push('body_polarity_regime_inverted');
      else if (expectedBalance < -2e-6 && sp.body_polarity_regime !== 'v_neg_dominant') violations.push('body_polarity_regime_inverted');
      else if (expectedL1 === 0 && !['quiescent', 'balanced'].includes(sp.body_polarity_regime)) violations.push('body_polarity_regime_inverted');
    }
    if (expectedL1 > 1e-5 && isNum(sp.body_asymmetry_index)) {
      const expectedAsym = expectedBalance / expectedL1;
      if (Math.abs(sp.body_asymmetry_index - expectedAsym) > 2e-4) violations.push('body_asymmetry_index_mismatch');
    }
  }

  if (tw && isNum(tw.world_w_fast) && isNum(tw.world_w_slow)) {
    const expectedContrast = tw.world_w_fast - tw.world_w_slow;
    const expectedWorldL1 = Math.abs(tw.world_w_fast) + Math.abs(tw.world_w_slow);
    if (isNum(sp.world_temporal_contrast) && Math.abs(sp.world_temporal_contrast - expectedContrast) > 2e-6) {
      violations.push('world_temporal_contrast_mismatch');
    }
    if (sp.world_timescale_regime) {
      if (expectedContrast > 2e-6 && sp.world_timescale_regime !== 'fast_dominant') violations.push('world_timescale_regime_inverted');
      else if (expectedContrast < -2e-6 && sp.world_timescale_regime !== 'slow_dominant') violations.push('world_timescale_regime_inverted');
      else if (expectedWorldL1 === 0 && !['quiescent', 'balanced'].includes(sp.world_timescale_regime)) violations.push('world_timescale_regime_inverted');
    }
  }

  if (m && isNum(m.ccc) && isNum(m.ascension_threshold) && isNum(sp.ccc_threshold_margin)) {
    const cccRef = isNum(pred?.ccc_precise) ? pred.ccc_precise : m.ccc;
    if (Math.abs(sp.ccc_threshold_margin - (cccRef - m.ascension_threshold)) > 2e-4) {
      violations.push('ccc_threshold_margin_mismatch');
    }
    if (pred?.ccc_vs_threshold === 'above' && sp.ccc_threshold_margin < -1e-9) violations.push('ccc_threshold_sign_inverted');
    if (pred?.ccc_vs_threshold === 'below' && sp.ccc_threshold_margin > 1e-9) violations.push('ccc_threshold_sign_inverted');
  }
  if (m && isNum(m.ccc) && isNum(m.x_n) && isNum(sp.ccc_xn_divergence)) {
    if (Math.abs(sp.ccc_xn_divergence - (m.ccc - m.x_n)) > 2e-4) {
      violations.push('ccc_xn_divergence_mismatch');
    }
  }
  return { ok: violations.length === 0, violations };
}

export const TOWER_METRIC_SPECS = Object.freeze({
  tower_phase: { label: 'fase exacta de la torre (tower_phase)', kind: 'direct_signal', source: 'WritablePrefixTower.phase', decimals: 6 },
  tower_code: { label: 'código ternario de la torre (tower_code)', kind: 'direct_signal', source: 'WritablePrefixTower.code', decimals: 6 },
  tower_memory: { label: 'memoria de retorno de la torre (tower_memory)', kind: 'direct_signal', source: 'WritablePrefixTower.memory', decimals: 6 },
  sigma_defect_bound: { label: 'cota de defecto del automodelo T_d (sigma_defect_bound)', kind: 'derived_proxy', source: 'SigmaAutomodelTruncator', decimals: 6 },
  body_valence_norm: { label: 'norma de valencia corporal 2D (body_valence_norm)', kind: 'direct_signal', source: 'BodyWorldTower.body', decimals: 6 },
  world_state_norm: { label: 'norma del mundo indexado (world_state_norm)', kind: 'direct_signal', source: 'BodyWorldTower.world', decimals: 6 },
  active_retention: { label: 'retención activa de la torre (active_retention)', kind: 'direct_signal', source: 'WritablePrefixTower (control activo 9/16)', decimals: 4 },
  passive_retention: { label: 'retención pasiva de la torre (passive_retention)', kind: 'direct_signal', source: 'WritablePrefixTower (control pasivo)', decimals: 4 },
  active_recovery_advantage: { label: 'ventaja de retención activa (active_recovery_advantage)', kind: 'derived_proxy', source: 'WritablePrefixTower (activeRetention - passiveRetention)', decimals: 4 },
  body_v_pos: { label: 'canal corporal positivo (v_pos)', kind: 'direct_signal', source: 'BodyWorldTower.body[0]', decimals: 6 },
  body_v_neg: { label: 'canal corporal negativo (v_neg)', kind: 'direct_signal', source: 'BodyWorldTower.body[1]', decimals: 6 },
  world_w_fast: { label: 'canal de mundo rápido (w_fast)', kind: 'direct_signal', source: 'BodyWorldTower.world[0]', decimals: 6 },
  world_w_slow: { label: 'canal de mundo lento (w_slow)', kind: 'direct_signal', source: 'BodyWorldTower.world[1]', decimals: 6 }
});

export const PROFILE_METRIC_SPECS = Object.freeze({
  ccc_threshold_margin: { label: 'margen de CCC frente al umbral (ccc_threshold_margin)', kind: 'derived_proxy', source: 'ccc - ASCENSION_THRESHOLD (sin redondear)', decimals: 4 },
  ccc_xn_divergence: { label: 'divergencia CCC - X_N (ccc_xn_divergence)', kind: 'derived_proxy', source: 'ccc - X_N', decimals: 4 },
  active_node_fraction: { label: 'fracción de nodos activos (active_node_fraction)', kind: 'derived_proxy', source: 'active_nodes / total_nodes', decimals: 4 },
  node_coherence_dispersion: { label: 'dispersión nodal de coherencia (node_coherence_dispersion)', kind: 'derived_proxy', source: 'std(nodes[].coherenceState)', decimals: 6 },
  raw_winding_number: { label: 'winding bruto con signo (raw_winding_number)', kind: 'direct_signal', source: 'PhenomenologyCore.testHolonomy (ontologicalState.raw_winding_number)', decimals: 4 },
  latency_strain: { label: 'esfuerzo de latencia (latency_strain)', kind: 'artifact_only', source: 'OntologicalSingularityCore.getDynamicHealth (telemetría operacional C-7)', decimals: 4 },
  internal_pressure: { label: 'presión interna operacional (internal_pressure)', kind: 'artifact_only', source: 'OntologicalSingularityCore.getDynamicHealth (telemetría operacional C-7)', decimals: 4 },
  body_net_balance: { label: 'balance corporal neto v_pos - v_neg (body_net_balance)', kind: 'derived_proxy', source: 'BodyWorldTower.body[0] - BodyWorldTower.body[1]', decimals: 6 },
  body_l1_norm: { label: 'norma L1 corporal |v_pos| + |v_neg| (body_l1_norm)', kind: 'derived_proxy', source: '|BodyWorldTower.body[0]| + |BodyWorldTower.body[1]|', decimals: 6 },
  body_asymmetry_index: { label: 'índice de asimetría corporal (body_asymmetry_index)', kind: 'derived_proxy', source: '(v_pos - v_neg) / (|v_pos| + |v_neg|)', decimals: 4 },
  world_temporal_contrast: { label: 'contraste temporal del mundo w_fast - w_slow (world_temporal_contrast)', kind: 'derived_proxy', source: 'BodyWorldTower.world[0] - BodyWorldTower.world[1]', decimals: 6 },
  world_timescale_balance_index: { label: 'balance rápido/lento del mundo (world_timescale_balance_index)', kind: 'derived_proxy', source: '(w_fast - w_slow) / (|w_fast| + |w_slow|)', decimals: 4 },
  active_recovery_advantage: { label: 'ventaja de retención activa (active_recovery_advantage)', kind: 'derived_proxy', source: 'WritablePrefixTower (activeRetention - passiveRetention)', decimals: 4 }
});

export const PREDICTION_PLASTICITY_METRIC_SPECS = Object.freeze({
  sealed_commit_count: { label: 'compromisos pre-desenlace sellados (sealed_commit_count)', kind: 'direct_signal', source: 'WorldModelEngine.sealedHorizonQueue', decimals: 0 },
  verified_prediction_count: { label: 'predicciones pre-desenlace verificadas (verified_prediction_count)', kind: 'direct_signal', source: 'WorldModelEngine.settleSealedPredictions', decimals: 0 },
  horizon5_mae: { label: 'error medio sellado en horizonte k=5 (horizon5_mae)', kind: 'derived_proxy', source: 'WorldModelEngine.getPlasticityProfile (sealedHorizonMae5)', decimals: 4 },
  surprisal_ema: { label: 'sorpresa informacional normalizada EMA (surprisal_ema)', kind: 'derived_proxy', source: 'WorldModelEngine.getPlasticityProfile (surprisalEma)', decimals: 4 },
  unforeseen_event_rate: { label: 'tasa de eventos imprevistos verificados (unforeseen_event_rate)', kind: 'derived_proxy', source: 'WorldModelEngine.getPlasticityProfile (unforeseenEventRate)', decimals: 4 },
  plasticity_maturation_index: { label: 'índice de maduración plástica histórica (plasticity_maturation_index)', kind: 'derived_proxy', source: 'WorldModelEngine.plasticityState (maturationIndex)', decimals: 4 },
  anchor_shift_l2: { label: 'desplazamiento L2 del atractor consolidado (anchor_shift_l2)', kind: 'derived_proxy', source: 'WorldModelEngine.plasticityState (W* - W_0)', decimals: 4 },
  mean_fisher_stiffness: { label: 'rigidez elástica media acumulada (mean_fisher_stiffness)', kind: 'derived_proxy', source: 'WorldModelEngine.plasticityState (Omega)', decimals: 4 },
  consolidated_engram_count: { label: 'engramas estructurales consolidados (consolidated_engram_count)', kind: 'direct_signal', source: 'HolographicMemoryNexus.structuralEngrams', decimals: 0 },
  viability_in_tube_rate: { label: 'tasa de permanencia en tubo de viabilidad (viability_in_tube_rate)', kind: 'derived_proxy', source: 'KaizenMetamorphosisEngine.evaluateObjectiveViability', decimals: 4 },
  tamper_violation_count: { label: 'violaciones de sello pre-desenlace detectadas (tamper_violation_count)', kind: 'direct_signal', source: 'WorldModelEngine.settleSealedPredictions', decimals: 0 }
});

export function formatMetricValue(id, value, decimalsOverride = null) {
  const spec = METRIC_SPECS[id] || TOWER_METRIC_SPECS[id] || PROFILE_METRIC_SPECS[id] || PREDICTION_PLASTICITY_METRIC_SPECS[id];
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'no disponible';
  const decimals = Number.isInteger(decimalsOverride) ? decimalsOverride : (spec ? spec.decimals : 4);
  return value.toLocaleString('es-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: false });
}

/**
 * Read-only signed capture of the coupled Body-World Prefix Tower state for
 * audit and conversational inspection without altering the v3 snapshot digest.
 */
export function captureTowerSnapshot(core) {
  const state = core?.ontologicalState || {};
  const telemetry = cloneSnapshotData(state.tower_telemetry || null);
  const payload = {
    schema: 'qicn.tower_snapshot.v1',
    tower_phase: finite(state.tower_phase),
    tower_code: finite(state.tower_code),
    tower_memory: finite(state.tower_memory),
    sigma_defect_bound: finite(state.sigma_defect_bound),
    body_valence_norm: finite(state.body_valence_norm),
    world_state_norm: finite(state.world_state_norm),
    telemetry
  };
  const digest = sha256Hex(stableStringify(payload));
  return deepFreeze({ ...payload, digest });
}

// Detach observational data before freezing it. Preserve enumerable values,
// undefined fields and graph sharing, which stableStringify includes in its
// existing digest semantics. No accessors with runtime side effects are used.
function cloneSnapshotData(value, seen = new WeakMap()) {
  if (!value || typeof value !== 'object') return value;
  if (seen.has(value)) return seen.get(value);
  const copy = Array.isArray(value) ? new Array(value.length) : {};
  seen.set(value, copy);
  for (const key of Object.keys(value)) {
    Object.defineProperty(copy, key, {
      value: cloneSnapshotData(value[key], seen),
      enumerable: true,
      writable: true,
      configurable: true
    });
  }
  return copy;
}

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
}

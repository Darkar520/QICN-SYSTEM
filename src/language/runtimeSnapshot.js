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
    constructive_cuts: towerTel.constructiveFiniteCuts || state.constructive_finite_cuts || null
  } : null;

  const persistenceInput = context.persistence && typeof context.persistence === 'object' ? context.persistence : null;
  const persistence = persistenceInput ? {
    storage_version: text(persistenceInput.storageVersion ?? persistenceInput.storage_version) || 'v3',
    auto_restore_enabled: Boolean(persistenceInput.autoRestoreEnabled ?? persistenceInput.auto_restore_enabled),
    autosave_interval_ticks: finite(persistenceInput.autosaveIntervalTicks ?? persistenceInput.autosave_interval_ticks) ?? 60
  } : null;

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
    ...(invariants ? { invariants } : {}),
    ...(tower ? { tower } : {}),
    ...(persistence ? { persistence } : {})
  };
  const digest = sha256Hex(stableStringify(body));
  return deepFreeze({ ...body, digest });
}

export function verifySnapshotDigest(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || typeof snapshot.digest !== 'string') return false;
  const { digest, ...body } = snapshot;
  return sha256Hex(stableStringify(body)) === digest;
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
  body_v_pos: { label: 'canal corporal positivo (v_pos)', kind: 'direct_signal', source: 'BodyWorldTower.body[0]', decimals: 6 },
  body_v_neg: { label: 'canal corporal negativo (v_neg)', kind: 'direct_signal', source: 'BodyWorldTower.body[1]', decimals: 6 },
  world_w_fast: { label: 'canal de mundo rápido (w_fast)', kind: 'direct_signal', source: 'BodyWorldTower.world[0]', decimals: 6 },
  world_w_slow: { label: 'canal de mundo lento (w_slow)', kind: 'direct_signal', source: 'BodyWorldTower.world[1]', decimals: 6 }
});

export function formatMetricValue(id, value, decimalsOverride = null) {
  const spec = METRIC_SPECS[id] || TOWER_METRIC_SPECS[id];
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
  const telemetry = state.tower_telemetry || null;
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

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
}

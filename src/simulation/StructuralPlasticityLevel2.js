// @ts-check
// claim_scope: internal_runtime_engineering
// evidence_scope: internal_support_only
// interpretation_boundary: Level 2 structural plasticity (dynamic sector migration M1, degree-0 apoptosis/neurogenesis & degree-floor rewiring M2) and mathematical invariant watchdog (W1-W4). Introduces zero configurable numeric hyperparameters in services/config.js; uses only deterministic structural constants derived from K = NODAL_SECTORS.length (4), NODE_CONNECTION_MIN (3), TEMPORAL_HORIZON (10), and core domain bounds. Topological plasticity and symmetry-breaking (M1/M2/W3) are strictly inert under negative controls (off, reducible_control A=I, td_cut_eta_zero eta=0); numerical domain hygiene (W1/W4) is a zero-allocation read-only no-op on finite in-domain trajectories. Never implies consciousness or external validation.

import { NODAL_SECTORS, NODAL_TOWER_COUPLING_MODES, normalizeCouplingMode, sectorIdOf } from './NodalTowerCouplingBridge.js';

const TWO_PI = Math.PI * 2;
const wrapPhase = (angle) => ((angle % TWO_PI) + TWO_PI) % TWO_PI;
const clamp = (value, min, max) => (value < min ? min : (value > max ? max : value));

// Explicit numerical tolerance for kinematic dispersion/CCC collapse detection in W3
// (captures sub-epsilon 1e-12 floating-point noise while remaining 7+ orders of magnitude
// below normal active nodal dispersion ~1e-2).
export const KINEMATIC_FREEZE_EPSILON = 1e-9;

function createEmptyLevel2State() {
  return {
    migrations: 0,
    regeneratedNodes: 0,
    degreeFloorRewires: 0,
    invariantRepairs: 0,
    configRepairs: 0,
    worldModelRepairs: 0,
    kinematicUnfreezes: 0,
    recentCcc: [],
    lastEvent: null
  };
}

/**
 * Ensures serializable Level 2 state on `nodalLayer.level2StructuralState`.
 * Only invoked when Level 2 executes in bidirectional mode or records an actual
 * W1/W4 repair, so B0 (`STRUCTURAL_PLASTICITY_LEVEL2_ENABLED === false`) and
 * finite negative controls (`S5a`, `S5b`) preserve bit-for-bit v3 parity.
 */
function ensureState(nodalLayer) {
  if (!nodalLayer || typeof nodalLayer !== 'object') return createEmptyLevel2State();
  if (!nodalLayer.level2StructuralState || typeof nodalLayer.level2StructuralState !== 'object') {
    nodalLayer.level2StructuralState = createEmptyLevel2State();
  } else {
    const s = nodalLayer.level2StructuralState;
    if (!Number.isFinite(s.migrations)) s.migrations = 0;
    if (!Number.isFinite(s.regeneratedNodes)) s.regeneratedNodes = 0;
    if (!Number.isFinite(s.degreeFloorRewires)) s.degreeFloorRewires = 0;
    if (!Number.isFinite(s.invariantRepairs)) s.invariantRepairs = 0;
    if (!Number.isFinite(s.configRepairs)) s.configRepairs = 0;
    if (!Number.isFinite(s.worldModelRepairs)) s.worldModelRepairs = 0;
    if (!Number.isFinite(s.kinematicUnfreezes)) s.kinematicUnfreezes = 0;
    if (!Array.isArray(s.recentCcc)) s.recentCcc = [];
    if (!('lastEvent' in s)) s.lastEvent = null;
  }
  return nodalLayer.level2StructuralState;
}

export const isStructuralPlasticityLevel2Enabled = (config = null) => config?.STRUCTURAL_PLASTICITY_LEVEL2_ENABLED === true;

export function resetStructuralPlasticityLevel2Telemetry(nodalLayer) {
  if (!nodalLayer || typeof nodalLayer !== 'object') return;
  delete nodalLayer.level2StructuralState;
}

/**
 * Pure read-only telemetry accessor: never mutates `nodalLayer` or attaches
 * `level2StructuralState` when Level 2 is inactive.
 */
export function getStructuralPlasticityLevel2Telemetry(nodalLayer) {
  const s = (
    nodalLayer
    && typeof nodalLayer === 'object'
    && nodalLayer.level2StructuralState
    && typeof nodalLayer.level2StructuralState === 'object'
  )
    ? nodalLayer.level2StructuralState
    : null;
  return {
    migrations: Number(s?.migrations) || 0,
    regeneratedNodes: Number(s?.regeneratedNodes) || 0,
    degreeFloorRewires: Number(s?.degreeFloorRewires) || 0,
    invariantRepairs: Number(s?.invariantRepairs) || 0,
    configRepairs: Number(s?.configRepairs) || 0,
    worldModelRepairs: Number(s?.worldModelRepairs) || 0,
    kinematicUnfreezes: Number(s?.kinematicUnfreezes) || 0,
    recentCcc: Array.isArray(s?.recentCcc) ? s.recentCcc.slice() : [],
    lastEvent: s?.lastEvent ?? null
  };
}

function exactMedian(values, fallback) {
  if (!values.length) return fallback;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return (sorted.length & 1) === 1 ? sorted[mid] : ((sorted[mid - 1] + sorted[mid]) * 0.5);
}

function resolveNodeSector(node, fallbackId = 0) {
  return Number.isInteger(node?.sectorId) && node.sectorId >= 0 && node.sectorId < NODAL_SECTORS.length
    ? node.sectorId
    : sectorIdOf(node?.id ?? fallbackId);
}

function boundConfigKey(key, value, kaizenEngine = null) {
  if (typeof kaizenEngine?._boundValue === 'function') {
    return kaizenEngine._boundValue(key, value);
  }
  if (key.includes('RATE') || key.includes('FACTOR') || key.includes('WEIGHT')) return clamp(value, 0.0001, 0.5);
  if (key.includes('THRESHOLD') || key.includes('DECAY')) return clamp(value, 0.01, 0.99);
  if (key === 'BOLTZMANN_ANALOG_K' || key === 'INFORMATIONAL_TEMP_T') return clamp(value, 0.1, 5.0);
  return value;
}

/**
 * Watchdogs W1 (Finite Nodal, Synaptic & WorldModel Conservation), W4 (Config Domain Conservation),
 * and pre-tick W3 (Kinematic Dispersion/Phase Collapse with epsilon tolerance <= 1e-9).
 * Fast-path zero-allocation scan when all values are finite and in-domain (0 false repairs on S0/S5).
 */
export function sanitizeAndRepairPreTickInvariants({
  nodalLayer,
  mutableConfig,
  baseConfig,
  kaizenEngine = null,
  worldModel = null,
  towerTelemetry = null,
  couplingMode = NODAL_TOWER_COUPLING_MODES.OFF,
  simulationStep = 0
} = {}) {
  if (!nodalLayer || !Array.isArray(nodalLayer.nodes)) {
    return { nodeRepairs: 0, edgeRepairs: 0, configRepairs: 0, worldModelRepairs: 0, kinematicUnfreeze: false };
  }
  let configRepairs = 0;
  let nodeRepairs = 0;
  let edgeRepairs = 0;
  let worldModelRepairs = 0;
  let kinematicUnfreeze = false;

  // --- W4: Exact config domain conservation using Kaizen's existing _boundValue bounds ---
  if (mutableConfig && typeof mutableConfig === 'object') {
    const keys = Array.isArray(kaizenEngine?.mutableKeys)
      ? kaizenEngine.mutableKeys
      : [
        'BASE_LEARNING_RATE',
        'HEBBIAN_FACTOR',
        'SYNAPTIC_PRUNING_THRESHOLD',
        'PLASTICITY_DECAY',
        'RETRO_FLUX_WEIGHT',
        'BOLTZMANN_ANALOG_K',
        'INFORMATIONAL_TEMP_T'
      ];
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      if (!(key in mutableConfig)) continue;
      const raw = mutableConfig[key];
      const isFiniteVal = typeof raw === 'number' && Number.isFinite(raw);
      const bounded = isFiniteVal ? boundConfigKey(key, raw, kaizenEngine) : NaN;
      if (!isFiniteVal || Math.abs(raw - bounded) > 1e-12) {
        const baseVal = Number(baseConfig?.[key]);
        const fallback = Number.isFinite(baseVal) ? boundConfigKey(key, baseVal, kaizenEngine) : boundConfigKey(key, 0.5, kaizenEngine);
        mutableConfig[key] = fallback;
        configRepairs += 1;
      }
    }
  }
  if (kaizenEngine?.adjustments && typeof kaizenEngine.adjustments === 'object') {
    for (const [key, factor] of Object.entries(kaizenEngine.adjustments)) {
      if (typeof factor !== 'number' || !Number.isFinite(factor)) {
        kaizenEngine.adjustments[key] = 1;
        configRepairs += 1;
      }
    }
  }

  // --- W1 (WorldModel): Surgical repair of non-finite linear predictor weights from EWC anchor W* ---
  if (worldModel && typeof worldModel === 'object') {
    const anchorFast = worldModel.plasticityState?.consolidatedWeights?.ccc || worldModel.plasticityState?.consolidatedWeights || null;
    if (worldModel.weights && typeof worldModel.weights === 'object') {
      for (const key of Object.keys(worldModel.weights)) {
        if (!Number.isFinite(worldModel.weights[key])) {
          const anchorVal = Number(anchorFast?.[key]);
          worldModel.weights[key] = Number.isFinite(anchorVal) ? anchorVal : 0;
          worldModelRepairs += 1;
        }
      }
    }
    const anchorMulti = worldModel.plasticityState?.consolidatedWeights?.multi || worldModel.plasticityState?.consolidatedMultiWeights || null;
    if (worldModel.multiWeights && typeof worldModel.multiWeights === 'object') {
      for (const target of Object.keys(worldModel.multiWeights)) {
        const row = worldModel.multiWeights[target];
        if (!row || typeof row !== 'object') continue;
        for (const feat of Object.keys(row)) {
          if (!Number.isFinite(row[feat])) {
            const anchorVal = Number(anchorMulti?.[target]?.[feat]);
            row[feat] = Number.isFinite(anchorVal) ? anchorVal : 0;
            worldModelRepairs += 1;
          }
        }
      }
    }
    const fisher = worldModel.plasticityState?.fisherStiffness || null;
    if (fisher && typeof fisher === 'object') {
      if (fisher.ccc && typeof fisher.ccc === 'object') {
        for (const key of Object.keys(fisher.ccc)) {
          if (!Number.isFinite(fisher.ccc[key]) || fisher.ccc[key] < 0) {
            fisher.ccc[key] = 0;
            worldModelRepairs += 1;
          }
        }
      }
      if (fisher.multi && typeof fisher.multi === 'object') {
        for (const target of Object.keys(fisher.multi)) {
          const row = fisher.multi[target];
          if (!row || typeof row !== 'object') continue;
          for (const feat of Object.keys(row)) {
            if (!Number.isFinite(row[feat]) || row[feat] < 0) {
              row[feat] = 0;
              worldModelRepairs += 1;
            }
          }
        }
      }
    }
  }

  // --- W1 (Nodal & Synaptic): Fast-path scan for non-finite, out-of-domain, dormant-target, or duplicate edges ---
  const nodes = nodalLayer.nodes;
  const nLen = nodes.length;
  const activeNodeIds = nodalLayer.activeNodeIds;
  const hasActiveSet = activeNodeIds instanceof Set;
  const activeNodes = nodalLayer.getActiveNodes();
  const nActive = activeNodes.length;
  let hasViolation = false;

  for (let i = 0; i < nActive && !hasViolation; i += 1) {
    const node = activeNodes[i];
    if (
      !Number.isFinite(node.coherenceState) || node.coherenceState < 0 || node.coherenceState > 1
      || !Number.isFinite(node.energy) || node.energy < 0.1 || node.energy > 1
      || !Number.isFinite(node.intensity) || node.intensity < 0 || node.intensity > 1
      || !Number.isFinite(node.phase)
      || !Number.isFinite(node.retroInductionFlux)
      || !Number.isFinite(node.learningRate) || node.learningRate <= 0
      || !Array.isArray(node.connections)
    ) {
      hasViolation = true;
      break;
    }
    const conns = node.connections;
    for (let j = 0; j < conns.length; j += 1) {
      const c = conns[j];
      if (
        !c
        || !Number.isInteger(c.targetId) || c.targetId < 0 || c.targetId >= nLen || c.targetId === node.id
        || (hasActiveSet && !activeNodeIds.has(c.targetId))
        || !Number.isFinite(c.weight) || c.weight < 0.1 || c.weight > 1.0
      ) {
        hasViolation = true;
        break;
      }
      for (let k = 0; k < j; k += 1) {
        if (conns[k]?.targetId === c.targetId) {
          hasViolation = true;
          break;
        }
      }
      if (hasViolation) break;
    }
  }

  if (hasViolation) {
    // Collect exact surviving medians from healthy active nodes
    const finiteCoh = [];
    const finiteEnergy = [];
    const finitePhase = [];
    const finiteWeights = [];
    for (let i = 0; i < nActive; i += 1) {
      const node = activeNodes[i];
      if (Number.isFinite(node.coherenceState) && node.coherenceState >= 0 && node.coherenceState <= 1) finiteCoh.push(node.coherenceState);
      if (Number.isFinite(node.energy) && node.energy >= 0.1 && node.energy <= 1) finiteEnergy.push(node.energy);
      if (Number.isFinite(node.phase)) finitePhase.push(wrapPhase(node.phase));
      if (Array.isArray(node.connections)) {
        for (let j = 0; j < node.connections.length; j += 1) {
          const w = node.connections[j]?.weight;
          if (Number.isFinite(w) && w >= 0.1 && w <= 1.0) finiteWeights.push(w);
        }
      }
    }
    const medCoh = exactMedian(finiteCoh, 0.5);
    const medEnergy = exactMedian(finiteEnergy, 0.5);
    const medPhase = exactMedian(finitePhase, 0);
    const medWeight = exactMedian(finiteWeights, 0.5);
    const safeBaseLr = Number.isFinite(mutableConfig?.BASE_LEARNING_RATE)
      ? mutableConfig.BASE_LEARNING_RATE
      : (Number.isFinite(baseConfig?.BASE_LEARNING_RATE) ? baseConfig.BASE_LEARNING_RATE : 0.1);

    for (let i = 0; i < nActive; i += 1) {
      const node = activeNodes[i];
      let touched = false;

      if (!Array.isArray(node.connections)) {
        node.connections = [];
        touched = true;
      }

      // Compute finite neighbor medians for surgical local reconstruction
      const nbrCoh = [];
      const nbrEnergy = [];
      const nbrPhase = [];
      for (let j = 0; j < node.connections.length; j += 1) {
        const tid = node.connections[j]?.targetId;
        const peer = Number.isInteger(tid) && tid >= 0 && tid < nLen ? nodes[tid] : null;
        if (!peer || (hasActiveSet && !activeNodeIds.has(tid))) continue;
        if (Number.isFinite(peer.coherenceState) && peer.coherenceState >= 0 && peer.coherenceState <= 1) nbrCoh.push(peer.coherenceState);
        if (Number.isFinite(peer.energy) && peer.energy >= 0.1 && peer.energy <= 1) nbrEnergy.push(peer.energy);
        if (Number.isFinite(peer.phase)) nbrPhase.push(wrapPhase(peer.phase));
      }

      if (!Number.isFinite(node.coherenceState) || node.coherenceState < 0 || node.coherenceState > 1) {
        node.coherenceState = clamp(exactMedian(nbrCoh, medCoh), 0, 1);
        touched = true;
      }
      if (!Number.isFinite(node.energy) || node.energy < 0.1 || node.energy > 1) {
        node.energy = clamp(exactMedian(nbrEnergy, medEnergy), 0.1, 1);
        touched = true;
      }
      if (!Number.isFinite(node.intensity) || node.intensity < 0 || node.intensity > 1) {
        node.intensity = clamp(0.5 + (0.5 * node.coherenceState), 0, 1);
        touched = true;
      }
      if (!Number.isFinite(node.phase)) {
        node.phase = exactMedian(nbrPhase, medPhase);
        touched = true;
      }
      if (!Number.isFinite(node.retroInductionFlux)) {
        node.retroInductionFlux = 0;
        touched = true;
      }
      if (!Number.isFinite(node.learningRate) || node.learningRate <= 0) {
        node.learningRate = safeBaseLr;
        touched = true;
      }

      // Sanitize corrupted, dormant-pointing, or duplicate edges in-place
      const conns = node.connections;
      const seenTargets = new Set();
      let writeIdx = 0;
      for (let j = 0; j < conns.length; j += 1) {
        const c = conns[j];
        if (
          !c
          || !Number.isInteger(c.targetId)
          || c.targetId < 0
          || c.targetId >= nLen
          || c.targetId === node.id
          || (hasActiveSet && !activeNodeIds.has(c.targetId))
          || seenTargets.has(c.targetId)
        ) {
          edgeRepairs += 1;
          continue;
        }
        seenTargets.add(c.targetId);
        if (!Number.isFinite(c.weight) || c.weight < 0.1 || c.weight > 1.0) {
          c.weight = clamp(medWeight, 0.1, 1.0);
          edgeRepairs += 1;
        }
        conns[writeIdx] = c;
        writeIdx += 1;
      }
      if (writeIdx !== conns.length) {
        conns.length = writeIdx;
      }
      if (touched) nodeRepairs += 1;
    }
  }

  // --- W3 (pre-tick): Kinematic dispersion & phase collapse within KINEMATIC_FREEZE_EPSILON (<= 1e-9) ---
  const normalizedMode = normalizeCouplingMode(couplingMode);
  const K = NODAL_SECTORS.length;
  if (simulationStep > 0 && normalizedMode === NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL && nActive >= K) {
    let minC = Infinity;
    let maxC = -Infinity;
    let minP = Infinity;
    let maxP = -Infinity;
    for (let i = 0; i < nActive; i += 1) {
      const c = activeNodes[i].coherenceState;
      const p = activeNodes[i].phase;
      if (c < minC) minC = c;
      if (c > maxC) maxC = c;
      if (p < minP) minP = p;
      if (p > maxP) maxP = p;
    }
    if (
      Number.isFinite(minC)
      && (maxC - minC) <= KINEMATIC_FREEZE_EPSILON
      && Number.isFinite(minP)
      && (maxP - minP) <= KINEMATIC_FREEZE_EPSILON
    ) {
      const towerPhaseNorm = Number.isFinite(Number(towerTelemetry?.core?.phase)) ? Number(towerTelemetry.core.phase) : 0;
      const towerPhaseRad = (((towerPhaseNorm % 1) + 1) % 1) * TWO_PI;
      for (let i = 0; i < nActive; i += 1) {
        const node = activeNodes[i];
        const sec = resolveNodeSector(node, node.id);
        const exactSubAngle = ((node.id % K) * TWO_PI) / (K * K);
        node.phase = wrapPhase(towerPhaseRad + NODAL_SECTORS[sec].phaseOffset + exactSubAngle);
        const exactSectorOffset = (sec - 1.5) / (K * K * K);
        // Restore around canonical ConsciousNode midpoint floor 0.5 when collapsed below viability band
        const baseCoh = clamp(node.coherenceState, 0.5, 0.88);
        node.coherenceState = clamp(baseCoh + exactSectorOffset, 0.05, 0.96);
        node.energy = clamp(Math.max(0.5, node.energy) + exactSectorOffset, 0.1, 1.0);
        node.intensity = clamp(0.5 + (0.5 * node.coherenceState), 0, 1);
        node.retroInductionFlux = exactSectorOffset;
      }
      kinematicUnfreeze = true;
    }
  }

  const totalRepairs = configRepairs + nodeRepairs + worldModelRepairs + (edgeRepairs > 0 ? 1 : 0) + (kinematicUnfreeze ? 1 : 0);
  if (totalRepairs > 0 || normalizedMode === NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL) {
    const state = ensureState(nodalLayer);
    if (kinematicUnfreeze) {
      state.recentCcc = [];
      state.kinematicUnfreezes += 1;
    }
    if (totalRepairs > 0) {
      state.configRepairs += configRepairs;
      state.worldModelRepairs += worldModelRepairs;
      state.invariantRepairs += totalRepairs;
      state.lastEvent = {
        kind: kinematicUnfreeze ? 'pre_tick_kinematic_unfreeze' : 'pre_tick_invariant_repair',
        configRepairs,
        nodeRepairs,
        edgeRepairs,
        worldModelRepairs,
        kinematicUnfreeze
      };
    }
  }
  return { nodeRepairs, edgeRepairs, configRepairs, worldModelRepairs, kinematicUnfreeze };
}

function wireDeterministicPeers(node, targetSector, allNodes, activeNodeIds, minDegree, initialWeight, step) {
  const total = allNodes.length;
  if (total < 2) return 0;
  const K = NODAL_SECTORS.length;
  let added = 0;
  const existing = new Set(node.connections.map((c) => c.targetId));

  // Connect across distinct sectors first (guaranteeing 4-sector quotient connectivity), then intra-sector
  for (let slot = 0; slot < minDegree && node.connections.length < minDegree; slot += 1) {
    const desiredSector = (targetSector + slot + 1) % K;
    let bestId = -1;
    let bestRes = -2;
    const probeBudget = Math.min(total, 24);
    const stride = Math.max(1, Math.floor(total / probeBudget));
    const startOffset = (node.id + (slot * 7) + (step * 5)) % total;

    // Pass 1: prefer active peers in desiredSector
    for (let p = 0; p < probeBudget; p += 1) {
      const candId = (startOffset + (p * stride)) % total;
      if (candId === node.id || existing.has(candId) || !activeNodeIds.has(candId)) continue;
      const cand = allNodes[candId];
      if (!cand) continue;
      if (resolveNodeSector(cand, candId) !== desiredSector) continue;
      const res = Math.cos(node.phase - cand.phase);
      if (res > bestRes) {
        bestRes = res;
        bestId = candId;
      }
    }
    // Pass 2: if desiredSector has no peer in strided window, pick any resonant active peer
    if (bestId < 0) {
      for (let p = 0; p < probeBudget; p += 1) {
        const candId = (startOffset + (p * stride)) % total;
        if (candId === node.id || existing.has(candId) || !activeNodeIds.has(candId)) continue;
        const cand = allNodes[candId];
        if (!cand) continue;
        const res = Math.cos(node.phase - cand.phase);
        if (res > bestRes) {
          bestRes = res;
          bestId = candId;
        }
      }
    }
    if (bestId >= 0) {
      node.connections.push({ targetId: bestId, weight: clamp(initialWeight, 0.1, 1.0) });
      existing.add(bestId);
      added += 1;
    }
  }
  return added;
}

/**
 * Level 2 Structural Plasticity + Watchdogs W2/W3 (zero new configurable hyperparameters in services/config.js):
 * - Mechanism 2A (`regeneratedNodes`): True apoptosis rescue of degree-0 orphans (`deg === 0`) and
 *   homeostatic neurogenesis of dormant lesion slots (`!activeNodeIds.has(id)`).
 * - Mechanism 2B (`degreeFloorRewires`): Local synaptic floor reinforcement for living under-connected
 *   nodes (`0 < deg < NODE_CONNECTION_MIN`).
 * - Mechanism 1 (`migrations`): Functional sector migration driven by exact integer imbalance (`max - min >= 2`)
 *   and pure trigonometric phase resonance `argmax cos(phi_i - (theta_tower + offset_s))`.
 * - Watchdog W3 (`kinematicUnfreezes`): Kinematic freeze detection (`dispersion <= 1e-9` or `CCC` range `<= 1e-9`
 *   across `TEMPORAL_HORIZON` ticks) with deterministic symmetry breaking from `NODAL_SECTORS` phases.
 * - Honesty guard (S5): strictly inert under `off`, `reducible_control` ($A=I$), and `td_cut_eta_zero` ($\eta=0$).
 */
export function applyStructuralPlasticityLevel2({
  nodalLayer,
  towerTelemetry = null,
  towerFeedback = null,
  couplingMode = NODAL_TOWER_COUPLING_MODES.OFF,
  config = null,
  currentCCC = null,
  simulationStep = 0,
  preRecoveryOrphanIds = null
} = {}) {
  const normalized = normalizeCouplingMode(couplingMode);
  if (
    !nodalLayer
    || !Array.isArray(nodalLayer.nodes)
    || normalized !== NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL
  ) {
    // Negative controls (off, reducible_control A=I, td_cut_eta_zero eta=0) are never violated.
    return { migrations: 0, regenerated: 0, degreeFloorRewires: 0, kinematicUnfreeze: false, skippedByNegativeControl: true };
  }

  const state = ensureState(nodalLayer);
  const allNodes = nodalLayer.nodes;
  const totalCap = allNodes.length;
  const K = NODAL_SECTORS.length;
  if (totalCap < K) {
    return { migrations: 0, regenerated: 0, degreeFloorRewires: 0, kinematicUnfreeze: false, skippedByNegativeControl: false };
  }

  const minDegree = Math.max(1, Math.floor(Number(config?.NODE_CONNECTION_MIN) || 3));
  const horizon = Math.max(3, Math.floor(Number(config?.TEMPORAL_HORIZON) || 10));
  const towerPhaseNormalized = Number.isFinite(Number(towerTelemetry?.core?.phase))
    ? Number(towerTelemetry.core.phase)
    : 0;
  const towerPhaseRad = (((towerPhaseNormalized % 1) + 1) % 1) * TWO_PI;

  const activeNodeIds = nodalLayer.activeNodeIds;
  const healthyConnected = [];
  const orphanActiveNodes = [];
  const underConnectedActive = [];
  const dormantNodes = [];
  const sectorCounts = [0, 0, 0, 0];

  for (let i = 0; i < totalCap; i += 1) {
    const node = allNodes[i];
    if (!node) continue;
    if (!activeNodeIds.has(node.id)) {
      dormantNodes.push(node);
      continue;
    }
    const sec = resolveNodeSector(node, node.id);
    const deg = Array.isArray(node.connections) ? node.connections.length : 0;
    const wasTrueOrphan = deg === 0 || (preRecoveryOrphanIds instanceof Set && preRecoveryOrphanIds.has(node.id));
    if (wasTrueOrphan && deg < minDegree) {
      orphanActiveNodes.push(node);
      if (deg > 0) sectorCounts[sec] += 1;
    } else if (deg < minDegree) {
      underConnectedActive.push(node);
      sectorCounts[sec] += 1;
    } else {
      healthyConnected.push(node);
      sectorCounts[sec] += 1;
    }
  }

  let regenerated = 0;
  let degreeFloorRewires = 0;
  let migrations = 0;
  let kinematicUnfreeze = false;

  // --- Mechanism 2: Separate true apoptosis/neurogenesis (deg === 0 / dormant) from degree-floor rewiring (0 < deg < minDegree) ---
  if (orphanActiveNodes.length > 0 || dormantNodes.length > 0 || underConnectedActive.length > 0) {
    const statPool = healthyConnected.length > 0 ? healthyConnected : nodalLayer.getActiveNodes();
    let cohSum = 0;
    let energySum = 0;
    const edgeWeights = [];
    for (let i = 0; i < statPool.length; i += 1) {
      const n = statPool[i];
      cohSum += Number.isFinite(n.coherenceState) ? n.coherenceState : 0.5;
      energySum += Number.isFinite(n.energy) ? n.energy : 0.5;
      if (Array.isArray(n.connections)) {
        for (let j = 0; j < n.connections.length; j += 1) {
          const w = n.connections[j]?.weight;
          if (Number.isFinite(w) && w >= 0.1 && w <= 1.0) edgeWeights.push(w);
        }
      }
    }
    const meanCoh = statPool.length > 0 ? clamp(cohSum / statPool.length, 0.1, 0.95) : 0.5;
    const meanEnergy = statPool.length > 0 ? clamp(energySum / statPool.length, 0.1, 1.0) : 0.5;
    const medWeight = clamp(exactMedian(edgeWeights, 0.5), 0.1, 1.0);

    const pickMinSector = () => {
      let best = 0;
      for (let s = 1; s < K; s += 1) {
        if (sectorCounts[s] < sectorCounts[best]) best = s;
      }
      return best;
    };

    // 2A-1: True apoptosis rescue for degree-0 active orphans (`deg === 0` or pre-recovery orphan -> counts in `regeneratedNodes`)
    if (orphanActiveNodes.length > 0) {
      const orphanQuota = Math.min(orphanActiveNodes.length, Math.max(K, Math.ceil(orphanActiveNodes.length / K)));
      for (let idx = 0; idx < orphanQuota; idx += 1) {
        const node = orphanActiveNodes[idx];
        const hadZeroEdgesNow = !Array.isArray(node.connections) || node.connections.length === 0;
        if (!Array.isArray(node.connections)) node.connections = [];
        const maxCount = Math.max(...sectorCounts);
        const minCount = Math.min(...sectorCounts);
        const targetSector = (hadZeroEdgesNow && maxCount - minCount >= 2)
          ? pickMinSector()
          : resolveNodeSector(node, node.id);
        node.sectorId = targetSector;
        node.sectorRole = NODAL_SECTORS[targetSector].key;
        const wired = wireDeterministicPeers(node, targetSector, allNodes, activeNodeIds, minDegree, medWeight, simulationStep);
        if (wired > 0) {
          if (hadZeroEdgesNow) sectorCounts[targetSector] += 1;
          regenerated += 1;
        }
      }
    }

    // 2A-2: Recruit dormant lesion slots (neurogenesis after focal amputation -> counts in `regeneratedNodes`)
    if (dormantNodes.length > 0) {
      const recruitQuota = Math.min(dormantNodes.length, Math.max(K, Math.ceil(dormantNodes.length / horizon)));
      for (let idx = 0; idx < recruitQuota; idx += 1) {
        const slotNode = dormantNodes[idx];
        const targetSector = pickMinSector();
        activeNodeIds.add(slotNode.id);
        slotNode.sectorId = targetSector;
        slotNode.sectorRole = NODAL_SECTORS[targetSector].key;
        slotNode.coherenceState = meanCoh;
        slotNode.energy = meanEnergy;
        slotNode.intensity = clamp(0.5 + (0.5 * meanCoh), 0, 1);
        slotNode.phase = wrapPhase(towerPhaseRad + NODAL_SECTORS[targetSector].phaseOffset);
        slotNode.retroInductionFlux = 0;
        slotNode.connections = [];
        wireDeterministicPeers(slotNode, targetSector, allNodes, activeNodeIds, minDegree, medWeight, simulationStep);
        sectorCounts[targetSector] += 1;
        regenerated += 1;
      }
    }

    // 2B: Degree-floor synaptic reinforcement for living nodes with `0 < deg < NODE_CONNECTION_MIN` (`degreeFloorRewires`)
    if (underConnectedActive.length > 0) {
      const rewireQuota = Math.min(underConnectedActive.length, Math.max(K, Math.ceil(underConnectedActive.length / K)));
      for (let idx = 0; idx < rewireQuota; idx += 1) {
        const node = underConnectedActive[idx];
        const targetSector = resolveNodeSector(node, node.id);
        node.sectorId = targetSector;
        node.sectorRole = NODAL_SECTORS[targetSector].key;
        const wired = wireDeterministicPeers(node, targetSector, allNodes, activeNodeIds, minDegree, medWeight, simulationStep);
        if (wired > 0) {
          degreeFloorRewires += 1;
        }
      }
    }
  }

  // --- Mechanism 1: Functional Sector Migration (exact integer imbalance max - min >= 2) ---
  const activeConnectedBySector = [[], [], [], []];
  for (let i = 0; i < totalCap; i += 1) {
    const node = allNodes[i];
    if (!node || !activeNodeIds.has(node.id) || !Array.isArray(node.connections) || node.connections.length === 0) continue;
    const sec = resolveNodeSector(node, node.id);
    activeConnectedBySector[sec].push(node);
  }

  const liveCounts = activeConnectedBySector.map((list) => list.length);
  const maxMigrationsThisTick = Math.max(K, Math.ceil((Math.max(...liveCounts) - Math.min(...liveCounts)) / horizon));
  for (let m = 0; m < maxMigrationsThisTick; m += 1) {
    let minSec = 0;
    let maxSec = 0;
    for (let s = 1; s < K; s += 1) {
      if (liveCounts[s] < liveCounts[minSec]) minSec = s;
      if (liveCounts[s] > liveCounts[maxSec]) maxSec = s;
    }
    if (liveCounts[maxSec] - liveCounts[minSec] < 2) break;

    const targetPhase = wrapPhase(towerPhaseRad + NODAL_SECTORS[minSec].phaseOffset);
    const candidates = activeConnectedBySector[maxSec];
    let bestIdx = -1;
    let bestRes = -2;
    for (let i = 0; i < candidates.length; i += 1) {
      const cand = candidates[i];
      const res = Math.cos(cand.phase - targetPhase);
      if (res > bestRes || (res === bestRes && bestIdx >= 0 && cand.id < candidates[bestIdx].id)) {
        bestRes = res;
        bestIdx = i;
      }
    }
    if (bestIdx < 0) break;

    const chosen = candidates.splice(bestIdx, 1)[0];
    chosen.sectorId = minSec;
    chosen.sectorRole = NODAL_SECTORS[minSec].key;
    activeConnectedBySector[minSec].push(chosen);
    liveCounts[maxSec] -= 1;
    liveCounts[minSec] += 1;
    migrations += 1;
  }

  if ((migrations > 0 || regenerated > 0 || degreeFloorRewires > 0) && towerFeedback?.active) {
    nodalLayer.recoverInterSectorConnections?.(towerFeedback, simulationStep);
  }

  // --- Watchdog W3 (post-tick): Kinematic Freeze Detection (tolerance <= 1e-9) & Symmetry Breaking ---
  const activeNow = nodalLayer.getActiveNodes();
  const activeCount = activeNow.length;
  if (Number.isFinite(currentCCC)) {
    state.recentCcc.push(currentCCC);
    if (state.recentCcc.length > horizon) state.recentCcc.shift();
  }
  let minCoh = Infinity;
  let maxCoh = -Infinity;
  for (let i = 0; i < activeCount; i += 1) {
    const c = activeNow[i].coherenceState;
    if (c < minCoh) minCoh = c;
    if (c > maxCoh) maxCoh = c;
  }
  const dispersionCollapse = activeCount >= K
    && Number.isFinite(minCoh)
    && Number.isFinite(maxCoh)
    && (maxCoh - minCoh) <= KINEMATIC_FREEZE_EPSILON;
  const cccFlatline = state.recentCcc.length >= horizon
    && (Math.max(...state.recentCcc) - Math.min(...state.recentCcc)) <= KINEMATIC_FREEZE_EPSILON;

  if (dispersionCollapse || cccFlatline) {
    for (let i = 0; i < activeCount; i += 1) {
      const node = activeNow[i];
      const sec = resolveNodeSector(node, node.id);
      const exactSubAngle = ((node.id % K) * TWO_PI) / (K * K);
      node.phase = wrapPhase(towerPhaseRad + NODAL_SECTORS[sec].phaseOffset + exactSubAngle);
      const exactSectorOffset = (sec - 1.5) / (K * K * K);
      const baseCoh = clamp(node.coherenceState, 0.5, 0.88);
      node.coherenceState = clamp(baseCoh + exactSectorOffset, 0.05, 0.96);
      node.energy = clamp(Math.max(0.5, node.energy) + exactSectorOffset, 0.1, 1.0);
      node.intensity = clamp(0.5 + (0.5 * node.coherenceState), 0, 1);
      node.retroInductionFlux = exactSectorOffset;
    }
    state.recentCcc = [];
    state.kinematicUnfreezes += 1;
    state.invariantRepairs += 1;
    kinematicUnfreeze = true;
  }

  if (migrations > 0 || regenerated > 0 || degreeFloorRewires > 0 || kinematicUnfreeze) {
    state.migrations += migrations;
    state.regeneratedNodes += regenerated;
    state.degreeFloorRewires += degreeFloorRewires;
    state.lastEvent = {
      kind: 'level2_structural_adaptation',
      tick: simulationStep,
      migrations,
      regenerated,
      degreeFloorRewires,
      kinematicUnfreeze
    };
  }

  return { migrations, regenerated, degreeFloorRewires, kinematicUnfreeze, skippedByNegativeControl: false };
}

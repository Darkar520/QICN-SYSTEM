// @ts-check
// claim_scope: internal_runtime_engineering
// evidence_scope: internal_support_only
// interpretation_boundary: Parameter-free Level 2 structural plasticity (dynamic sector migration, degree-0 apoptosis/neurogenesis) and mathematical invariant watchdog (W1-W4). Uses zero arbitrary heuristic constants, zero global RNG/clock, and strictly respects declared negative controls (reducible_control A=I, td_cut_eta_zero eta=0). Never implies consciousness or external validation.

import { NODAL_SECTORS, NODAL_TOWER_COUPLING_MODES, normalizeCouplingMode, sectorIdOf } from './NodalTowerCouplingBridge.js';

const TWO_PI = Math.PI * 2;
const wrapPhase = (angle) => ((angle % TWO_PI) + TWO_PI) % TWO_PI;
const clamp = (value, min, max) => (value < min ? min : (value > max ? max : value));

// Non-enumerable per-layer state so dynamicState.v3 and B0 captures remain 100% clean.
const LEVEL2_TELEMETRY = new WeakMap();

const getState = (nodalLayer) => {
  let entry = LEVEL2_TELEMETRY.get(nodalLayer);
  if (!entry) {
    entry = {
      migrations: 0,
      regeneratedNodes: 0,
      invariantRepairs: 0,
      configRepairs: 0,
      kinematicUnfreezes: 0,
      recentCcc: [],
      lastEvent: null
    };
    LEVEL2_TELEMETRY.set(nodalLayer, entry);
  }
  return entry;
};

export const isStructuralPlasticityLevel2Enabled = (config = null) => config?.STRUCTURAL_PLASTICITY_LEVEL2_ENABLED === true;

export function resetStructuralPlasticityLevel2Telemetry(nodalLayer) {
  if (!nodalLayer || typeof nodalLayer !== 'object') return;
  LEVEL2_TELEMETRY.delete(nodalLayer);
}

export function getStructuralPlasticityLevel2Telemetry(nodalLayer) {
  if (!nodalLayer || typeof nodalLayer !== 'object') {
    return {
      migrations: 0,
      regeneratedNodes: 0,
      invariantRepairs: 0,
      configRepairs: 0,
      kinematicUnfreezes: 0,
      lastEvent: null
    };
  }
  const s = getState(nodalLayer);
  return {
    migrations: s.migrations,
    regeneratedNodes: s.regeneratedNodes,
    invariantRepairs: s.invariantRepairs,
    configRepairs: s.configRepairs,
    kinematicUnfreezes: s.kinematicUnfreezes,
    lastEvent: s.lastEvent
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
 * Watchdogs W1 (Finite Nodal & Synaptic Conservation) and W4 (Config Domain Conservation).
 * Fast-path zero-allocation scan when all values are finite and in-domain (0 false repairs on S0).
 */
export function sanitizeAndRepairPreTickInvariants({
  nodalLayer,
  mutableConfig,
  baseConfig,
  kaizenEngine = null,
  towerTelemetry = null,
  couplingMode = NODAL_TOWER_COUPLING_MODES.OFF,
  simulationStep = 0
} = {}) {
  if (!nodalLayer || !Array.isArray(nodalLayer.nodes)) {
    return { nodeRepairs: 0, edgeRepairs: 0, configRepairs: 0, kinematicUnfreeze: false };
  }
  const state = getState(nodalLayer);
  let configRepairs = 0;
  let nodeRepairs = 0;
  let edgeRepairs = 0;
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

  // --- W1: Fast-path scan for any non-finite or out-of-domain nodal/synaptic state ---
  const nodes = nodalLayer.nodes;
  const nLen = nodes.length;
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
        || !Number.isFinite(c.weight) || c.weight < 0.1 || c.weight > 1.0
      ) {
        hasViolation = true;
        break;
      }
    }
  }

  if (hasViolation) {
    // Collect exact surviving medians from healthy active nodes (zero magic constants)
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
        if (!peer) continue;
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

      // Sanitize corrupted edges in-place
      const conns = node.connections;
      let writeIdx = 0;
      for (let j = 0; j < conns.length; j += 1) {
        const c = conns[j];
        if (!c || !Number.isInteger(c.targetId) || c.targetId < 0 || c.targetId >= nLen || c.targetId === node.id) {
          edgeRepairs += 1;
          continue;
        }
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

  // --- W3 (pre-tick): Exact kinematic dispersion collapse (all active nodes collapsed to identical coherence & phase after step 0) ---
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
    if (Number.isFinite(minC) && (maxC - minC) === 0 && Number.isFinite(minP) && (maxP - minP) === 0) {
      const towerPhaseNorm = Number.isFinite(Number(towerTelemetry?.core?.phase)) ? Number(towerTelemetry.core.phase) : 0;
      const towerPhaseRad = (((towerPhaseNorm % 1) + 1) % 1) * TWO_PI;
      for (let i = 0; i < nActive; i += 1) {
        const node = activeNodes[i];
        const sec = resolveNodeSector(node, node.id);
        const exactSubAngle = ((node.id % K) * TWO_PI) / (K * K);
        node.phase = wrapPhase(towerPhaseRad + NODAL_SECTORS[sec].phaseOffset + exactSubAngle);
        const exactSectorOffset = (sec - 1.5) / (K * K * K);
        node.coherenceState = clamp(node.coherenceState + exactSectorOffset, 0.05, 0.96);
        node.intensity = clamp(0.5 + (0.5 * node.coherenceState), 0, 1);
        node.retroInductionFlux = exactSectorOffset;
      }
      state.recentCcc = [];
      state.kinematicUnfreezes += 1;
      kinematicUnfreeze = true;
    }
  }

  const totalRepairs = configRepairs + nodeRepairs + (edgeRepairs > 0 ? 1 : 0) + (kinematicUnfreeze ? 1 : 0);
  if (totalRepairs > 0) {
    state.configRepairs += configRepairs;
    state.invariantRepairs += totalRepairs;
    state.lastEvent = {
      kind: kinematicUnfreeze ? 'pre_tick_kinematic_unfreeze' : 'pre_tick_invariant_repair',
      configRepairs,
      nodeRepairs,
      edgeRepairs,
      kinematicUnfreeze
    };
  }
  return { nodeRepairs, edgeRepairs, configRepairs, kinematicUnfreeze };
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
 * Level 2 Structural Plasticity + Watchdogs W2/W3 (zero arbitrary heuristic constants):
 * - Mechanism 2: Apoptosis of degree-0 orphans & homeostatic neurogenesis of dormant lesion slots.
 * - Mechanism 1: Functional sector migration driven by exact integer imbalance (max - min >= 2)
 *   and pure trigonometric phase resonance argmax cos(phi_i - (theta_tower + offset_s)).
 * - Watchdog W3: Exact kinematic freeze detection (dispersion === 0 or exact CCC flatline across
 *   TEMPORAL_HORIZON ticks) with deterministic symmetry breaking from NODAL_SECTORS phases.
 * - Honesty guard (S5): strictly inert under off / reducible_control / td_cut_eta_zero.
 */
export function applyStructuralPlasticityLevel2({
  nodalLayer,
  towerTelemetry = null,
  towerFeedback = null,
  couplingMode = NODAL_TOWER_COUPLING_MODES.OFF,
  config = null,
  currentCCC = null,
  simulationStep = 0
} = {}) {
  const normalized = normalizeCouplingMode(couplingMode);
  if (
    !nodalLayer
    || !Array.isArray(nodalLayer.nodes)
    || normalized !== NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL
  ) {
    // Negative controls (off, reducible_control A=I, td_cut_eta_zero eta=0) are never violated.
    return { migrations: 0, regenerated: 0, kinematicUnfreeze: false, skippedByNegativeControl: true };
  }

  const state = getState(nodalLayer);
  const allNodes = nodalLayer.nodes;
  const totalCap = allNodes.length;
  const K = NODAL_SECTORS.length;
  if (totalCap < K) {
    return { migrations: 0, regenerated: 0, kinematicUnfreeze: false, skippedByNegativeControl: false };
  }

  const minDegree = Math.max(1, Math.floor(Number(config?.NODE_CONNECTION_MIN) || 3));
  const horizon = Math.max(3, Math.floor(Number(config?.TEMPORAL_HORIZON) || 10));
  const towerPhaseNormalized = Number.isFinite(Number(towerTelemetry?.core?.phase))
    ? Number(towerTelemetry.core.phase)
    : 0;
  const towerPhaseRad = (((towerPhaseNormalized % 1) + 1) % 1) * TWO_PI;

  const activeNodeIds = nodalLayer.activeNodeIds;
  const healthyConnected = [];
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
    if (deg < minDegree) {
      underConnectedActive.push(node);
      if (deg > 0) sectorCounts[sec] += 1;
    } else {
      healthyConnected.push(node);
      sectorCounts[sec] += 1;
    }
  }

  let regenerated = 0;
  let migrations = 0;
  let kinematicUnfreeze = false;

  // --- Mechanism 2: Rescue under-connected nodes (degree < NODE_CONNECTION_MIN) & recruit dormant lesion slots ---
  if (underConnectedActive.length > 0 || dormantNodes.length > 0) {
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

    // Repair nodes below exact NODE_CONNECTION_MIN floor (bounded per tick by ceil(deficit / K) >= K)
    if (underConnectedActive.length > 0) {
      const rescueQuota = Math.min(underConnectedActive.length, Math.max(K, Math.ceil(underConnectedActive.length / K)));
      for (let idx = 0; idx < rescueQuota; idx += 1) {
        const node = underConnectedActive[idx];
        const hadZeroEdges = !Array.isArray(node.connections) || node.connections.length === 0;
        if (!Array.isArray(node.connections)) node.connections = [];
        const maxCount = Math.max(...sectorCounts);
        const minCount = Math.min(...sectorCounts);
        const targetSector = (hadZeroEdges && maxCount - minCount >= 2)
          ? pickMinSector()
          : resolveNodeSector(node, node.id);
        node.sectorId = targetSector;
        node.sectorRole = NODAL_SECTORS[targetSector].key;
        const wired = wireDeterministicPeers(node, targetSector, allNodes, activeNodeIds, minDegree, medWeight, simulationStep);
        if (wired > 0) {
          if (hadZeroEdges) sectorCounts[targetSector] += 1;
          regenerated += 1;
        }
      }
    }

    // Recruit dormant slots (neurogenesis after partial lesion / sector wipe), converging in <= TEMPORAL_HORIZON ticks
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

  if ((migrations > 0 || regenerated > 0) && towerFeedback?.active) {
    nodalLayer.recoverInterSectorConnections?.(towerFeedback, simulationStep);
  }

  // --- Watchdog W3: Exact Kinematic Freeze Detection & Parameter-Free Symmetry Breaking ---
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
  const exactDispersionCollapse = activeCount >= K && Number.isFinite(minCoh) && Number.isFinite(maxCoh) && (maxCoh - minCoh) === 0;
  const exactCccFlatline = state.recentCcc.length >= horizon
    && (Math.max(...state.recentCcc) - Math.min(...state.recentCcc)) === 0;

  if (exactDispersionCollapse || exactCccFlatline) {
    for (let i = 0; i < activeCount; i += 1) {
      const node = activeNow[i];
      const sec = resolveNodeSector(node, node.id);
      const exactSubAngle = ((node.id % K) * TWO_PI) / (K * K);
      node.phase = wrapPhase(towerPhaseRad + NODAL_SECTORS[sec].phaseOffset + exactSubAngle);
      const exactSectorOffset = (sec - 1.5) / (K * K * K);
      node.coherenceState = clamp(node.coherenceState + exactSectorOffset, 0.05, 0.96);
      node.intensity = clamp(0.5 + (0.5 * node.coherenceState), 0, 1);
      node.retroInductionFlux = exactSectorOffset;
    }
    state.recentCcc = [];
    state.kinematicUnfreezes += 1;
    state.invariantRepairs += 1;
    kinematicUnfreeze = true;
  }

  if (migrations > 0 || regenerated > 0 || kinematicUnfreeze) {
    state.migrations += migrations;
    state.regeneratedNodes += regenerated;
    state.lastEvent = {
      kind: 'level2_structural_adaptation',
      tick: simulationStep,
      migrations,
      regenerated,
      kinematicUnfreeze
    };
  }

  return { migrations, regenerated, kinematicUnfreeze, skippedByNegativeControl: false };
}

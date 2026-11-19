// @ts-check
// claim_scope: internal_runtime_engineering
// evidence_scope: internal_support_only
// interpretation_boundary: Deterministic finite-network bidirectional bridge between the 1500-node layer and the exact rational constructive towers. Does not inherit infinite inverse-limit proofs or certify external validation.

export const NODAL_TOWER_COUPLING_MODES = Object.freeze({
  OFF: 'off',
  BIDIRECTIONAL: 'bidirectional',
  TD_CUT: 'td_cut_eta_zero',
  REDUCIBLE: 'reducible_control'
});

export const NODAL_SECTORS = Object.freeze([
  Object.freeze({ id: 0, key: 'body_v_pos', label: 'Cuerpo v_pos', group: 'body', phaseOffset: -0.471238898 }),
  Object.freeze({ id: 1, key: 'body_v_neg', label: 'Cuerpo v_neg', group: 'body', phaseOffset: -0.157079633 }),
  Object.freeze({ id: 2, key: 'world_w_fast', label: 'Mundo w_fast', group: 'world', phaseOffset: 0.157079633 }),
  Object.freeze({ id: 3, key: 'world_w_slow', label: 'Mundo w_slow', group: 'world', phaseOffset: 0.471238898 })
]);

const TWO_PI = Math.PI * 2;
const ALLOWED_MODES = new Set(Object.values(NODAL_TOWER_COUPLING_MODES));

const clamp = (v, min, max) => (v < min ? min : (v > max ? max : v));
const clamp01 = (v) => clamp(Number.isFinite(v) ? v : 0, 0, 1);
const round6 = (v) => Number((Number.isFinite(v) ? v : 0).toFixed(6));

export function normalizeCouplingMode(mode) {
  const raw = String(mode || 'off').trim();
  return ALLOWED_MODES.has(raw) ? raw : NODAL_TOWER_COUPLING_MODES.OFF;
}

export function sectorIdOf(nodeId) {
  const n = Math.floor(Number(nodeId) || 0);
  return ((n % 4) + 4) % 4;
}

export function sectorMetaOf(nodeId) {
  return NODAL_SECTORS[sectorIdOf(nodeId)];
}

/**
 * Stamps deterministic topological sector metadata onto ConsciousNode instances
 * ONLY when nodal-tower coupling is enabled (`mode !== 'off'`).
 * Zero RNG consumption; zero mutation in B0 compatibility mode (`mode === 'off'`).
 */
export function annotateNodesWithSectors(nodes, mode = NODAL_TOWER_COUPLING_MODES.OFF) {
  const normalized = normalizeCouplingMode(mode);
  if (normalized === NODAL_TOWER_COUPLING_MODES.OFF || !Array.isArray(nodes)) return;
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    if (!node) continue;
    const s = sectorMetaOf(node.id ?? i);
    node.sectorId = s.id;
    node.sectorRole = s.key;
  }
}

/**
 * Computes exact downward modulation gains from the constructive towers
 * (WritablePrefixTower + BodyWorldTower + SigmaAutomodelTruncator T_d) toward
 * the 1500-node network.
 */
export function buildTowerToNodalFeedback(towerTelemetry, mode = NODAL_TOWER_COUPLING_MODES.OFF) {
  const normalized = normalizeCouplingMode(mode);
  if (normalized === NODAL_TOWER_COUPLING_MODES.OFF) {
    return null;
  }

  const activeRetention = clamp01(Number(towerTelemetry?.activeRetention ?? (9 / 16)));
  const passiveRetention = clamp01(Number(towerTelemetry?.passiveRetention ?? 0));
  const bodyPos = clamp(Number(towerTelemetry?.body?.[0] ?? 0), -1, 1);
  const bodyNeg = clamp(Number(towerTelemetry?.body?.[1] ?? 0), -1, 1);
  const worldFast = clamp(Number(towerTelemetry?.world?.[0] ?? 0), -1, 1);
  const worldSlow = clamp(Number(towerTelemetry?.world?.[1] ?? 0), -1, 1);
  const towerPhaseNormalized = Number.isFinite(Number(towerTelemetry?.core?.phase))
    ? Number(towerTelemetry.core.phase)
    : 0;
  const towerPhaseRad = ((towerPhaseNormalized % 1) + 1) % 1 * TWO_PI;
  const sigmaExactZero = String(towerTelemetry?.sigmaExactDefect ?? '0') === '0';

  const isBidirectional = normalized === NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL;
  const isTdCut = normalized === NODAL_TOWER_COUPLING_MODES.TD_CUT;
  const isReducible = normalized === NODAL_TOWER_COUPLING_MODES.REDUCIBLE;

  const effectiveEtaFloat = isBidirectional ? 0.125 : 0; // 1/8 vs 0
  const effectiveEtaRational = isBidirectional ? '1/8' : '0';
  const etaScale = effectiveEtaFloat * 8; // 1 when active, 0 when cut

  return Object.freeze({
    mode: normalized,
    active: isBidirectional,
    tdCutActive: isTdCut,
    reducibleControlActive: isReducible,
    effectiveEtaFloat,
    effectiveEtaRational,
    etaScale,
    sigmaExactZero,
    activeRetention,
    passiveRetention,
    activeRecoveryAdvantage: activeRetention - passiveRetention,
    towerPhaseRad,
    bodyPos,
    bodyNeg,
    bodyNetBalance: bodyPos - bodyNeg,
    worldFast,
    worldSlow,
    worldTemporalContrast: worldFast - worldSlow,
    // Signal propagation gains across sector boundaries
    crossSectorSignalGain: isBidirectional
      ? (1 + (0.32 * activeRetention * etaScale))
      : (isReducible ? 0 : 0.35),
    intraSectorSignalGain: isBidirectional ? 1.0 : (isReducible ? 0.85 : 0.78),
    // Kuramoto resonant phase-locking gain (zero under physical cut or reducible control)
    phaseCouplingK: (isBidirectional && sigmaExactZero) ? (0.24 * activeRetention * etaScale) : 0,
    phaseDecoherenceStep: isBidirectional ? 0 : (isReducible ? 0.29 : 0.23),
    // Bounded coherence & energy feedback equilibrium
    targetCoherenceBase: isBidirectional
      ? clamp(0.70 + (0.14 * activeRetention), 0.65, 0.86)
      : (isReducible ? 0.34 : 0.38),
    coherencePullRate: isBidirectional ? 0.068 : (isReducible ? 0.055 : 0.048),
    // Differential Hebbian plasticity & pruning floor protection for inter-sector edges
    interSectorHebbianBonus: isBidirectional
      ? (0.036 * activeRetention * etaScale)
      : (isReducible ? -0.095 : -0.022),
    interSectorPruningFloorFactor: isBidirectional ? 0.45 : (isReducible ? 1.45 : 1.15)
  });
}

/**
 * Evaluates live structural, inter-sector, non-factorizability, and tower-sync
 * telemetry in a single O(N + E) pass over active nodes.
 */
export function computeNodalSectorMetrics(nodes, signalStats = null, towerTelemetry = null, mode = NODAL_TOWER_COUPLING_MODES.OFF) {
  const normalized = normalizeCouplingMode(mode);
  const safeNodes = Array.isArray(nodes) ? nodes : [];
  const count = safeNodes.length;

  const secCount = [0, 0, 0, 0];
  const secCohSum = [0, 0, 0, 0];
  const secEnergySum = [0, 0, 0, 0];
  const secIntSum = [0, 0, 0, 0];
  const secSinSum = [0, 0, 0, 0];
  const secCosSum = [0, 0, 0, 0];
  const secIntraEdges = [0, 0, 0, 0];
  const secInterEdges = [0, 0, 0, 0];
  const matrixRaw = new Float64Array(16);

  let totalEdges = 0;
  let totalWeightedEdges = 0;
  let interWeightedEdges = 0;
  let globalCohSum = 0;
  let globalEnergySum = 0;

  for (let i = 0; i < count; i += 1) {
    const node = safeNodes[i];
    if (!node) continue;
    const s = Number.isInteger(node.sectorId) ? node.sectorId : sectorIdOf(node.id ?? i);
    const coh = Number.isFinite(node.coherenceState) ? node.coherenceState : 0;
    const energy = Number.isFinite(node.energy) ? node.energy : 0;
    const intensity = Number.isFinite(node.intensity) ? node.intensity : 0;
    const phase = Number.isFinite(node.phase) ? node.phase : 0;

    secCount[s] += 1;
    secCohSum[s] += coh;
    secEnergySum[s] += energy;
    secIntSum[s] += intensity;
    secSinSum[s] += Math.sin(phase);
    secCosSum[s] += Math.cos(phase);
    globalCohSum += coh;
    globalEnergySum += energy;

    const conns = Array.isArray(node.connections) ? node.connections : [];
    for (let j = 0; j < conns.length; j += 1) {
      const c = conns[j];
      if (!c) continue;
      const targetS = sectorIdOf(c.targetId);
      const w = Number.isFinite(c.weight) ? Math.max(0, c.weight) : 0;
      totalEdges += 1;
      totalWeightedEdges += w;
      matrixRaw[(s * 4) + targetS] += w;
      if (targetS === s) {
        secIntraEdges[s] += 1;
      } else {
        secInterEdges[s] += 1;
        interWeightedEdges += w;
      }
    }
  }

  const sectorIntraFlux = signalStats?.sectorIntraFlux || [0, 0, 0, 0];
  const sectorInterFlux = signalStats?.sectorInterFlux || [0, 0, 0, 0];
  const totalIntraFlux = Number.isFinite(signalStats?.totalIntraFlux) ? signalStats.totalIntraFlux : 0;
  const totalInterFlux = Number.isFinite(signalStats?.totalInterFlux) ? signalStats.totalInterFlux : 0;

  const sectors = NODAL_SECTORS.map((meta) => {
    const n = secCount[meta.id];
    const invN = n > 0 ? (1 / n) : 0;
    const meanSin = secSinSum[meta.id] * invN;
    const meanCos = secCosSum[meta.id] * invN;
    const phaseOrderR = clamp01(Math.hypot(meanSin, meanCos));
    const meanPhase = (meanSin === 0 && meanCos === 0) ? 0 : Math.atan2(meanSin, meanCos);
    return {
      id: meta.id,
      key: meta.key,
      group: meta.group,
      node_count: n,
      mean_coherence: round6(secCohSum[meta.id] * invN),
      mean_energy: round6(secEnergySum[meta.id] * invN),
      mean_intensity: round6(secIntSum[meta.id] * invN),
      phase_order_r: round6(phaseOrderR),
      mean_phase: round6(meanPhase),
      intra_edges: secIntraEdges[meta.id],
      inter_edges: secInterEdges[meta.id],
      intra_flux: round6(sectorIntraFlux[meta.id] * invN),
      inter_flux: round6(sectorInterFlux[meta.id] * invN)
    };
  });

  const couplingMatrix = [];
  const normDenom = Math.max(1e-9, totalWeightedEdges);
  for (let r = 0; r < 4; r += 1) {
    const row = [];
    for (let c = 0; c < 4; c += 1) {
      row.push(round6(matrixRaw[(r * 4) + c] / normDenom));
    }
    couplingMatrix.push(row);
  }

  const isReducible = normalized === NODAL_TOWER_COUPLING_MODES.REDUCIBLE;
  const isTdCut = normalized === NODAL_TOWER_COUPLING_MODES.TD_CUT;
  const isBidirectional = normalized === NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL;

  const rawInterRatio = totalWeightedEdges > 0 ? (interWeightedEdges / totalWeightedEdges) : 0;
  // Effective functional inter-sector coupling ratio reflects both structural edges and live cross-sector gating
  const interSectorCouplingRatio = isReducible ? 0 : clamp01(rawInterRatio);
  const perNodeInterFlux = count > 0 ? (totalInterFlux / count) : 0;
  const perNodeIntraFlux = count > 0 ? (totalIntraFlux / count) : 0;
  const crossFluxShare = (totalIntraFlux + totalInterFlux) > 1e-9
    ? clamp01(totalInterFlux / (totalIntraFlux + totalInterFlux))
    : 0;

  // Cross-sector phase alignment contrast (coupled vs factorized independent phases)
  let crossPhasePairSum = 0;
  let crossPairs = 0;
  for (let a = 0; a < 4; a += 1) {
    for (let b = a + 1; b < 4; b += 1) {
      const pairWeight = (matrixRaw[(a * 4) + b] + matrixRaw[(b * 4) + a]) > 0 ? 1 : 0;
      const cosDelta = Math.max(0, Math.cos(sectors[a].mean_phase - sectors[b].mean_phase));
      crossPhasePairSum += pairWeight * cosDelta * sectors[a].phase_order_r * sectors[b].phase_order_r;
      crossPairs += 1;
    }
  }
  const crossPhaseOrder = crossPairs > 0 ? clamp01(crossPhasePairSum / crossPairs) : 0;

  const cohValues = sectors.map((s) => s.mean_coherence);
  const minSectorCoh = Math.min(...cohValues);
  const maxSectorCoh = Math.max(...cohValues);
  const sectorCohSpread = Math.max(0, maxSectorCoh - minSectorCoh);
  const sectorBalanceRetention = clamp01(1 - (sectorCohSpread * 2.5));

  const nodalNonFactorizabilityFlux = isReducible
    ? 0
    : clamp01(
      (0.45 * crossFluxShare)
      + (0.35 * crossPhaseOrder)
      + (0.20 * sectorBalanceRetention * interSectorCouplingRatio)
    );

  // Bidirectional tower <-> nodal synchronization index
  const activeRetention = clamp01(Number(towerTelemetry?.activeRetention ?? (9 / 16)));
  const sigmaExactZero = String(towerTelemetry?.sigmaExactDefect ?? '0') === '0';
  const bodyPos = Number(towerTelemetry?.body?.[0] ?? 0);
  const bodyNeg = Number(towerTelemetry?.body?.[1] ?? 0);
  const worldFast = Number(towerTelemetry?.world?.[0] ?? 0);
  const worldSlow = Number(towerTelemetry?.world?.[1] ?? 0);
  const towerPhaseNormalized = Number.isFinite(Number(towerTelemetry?.core?.phase))
    ? Number(towerTelemetry.core.phase)
    : 0;
  const towerPhaseRad = ((towerPhaseNormalized % 1) + 1) % 1 * TWO_PI;

  let towerLockSum = 0;
  for (let s = 0; s < 4; s += 1) {
    const targetTheta = towerPhaseRad + NODAL_SECTORS[s].phaseOffset;
    const align = 0.5 * (1 + Math.cos(sectors[s].mean_phase - targetTheta));
    towerLockSum += align * (0.35 + (0.65 * sectors[s].phase_order_r));
  }
  const phaseLockToTower = clamp01(towerLockSum / 4);

  const nodalBodyBalance = sectors[0].mean_coherence - sectors[1].mean_coherence;
  const nodalWorldContrast = sectors[2].mean_coherence - sectors[3].mean_coherence;
  const bodyAlignment = clamp01(1 - Math.abs(nodalBodyBalance - (bodyPos - bodyNeg)));
  const worldAlignment = clamp01(1 - Math.abs(nodalWorldContrast - (worldFast - worldSlow)));
  const retentionFactor = sigmaExactZero ? clamp01(activeRetention / (9 / 16)) : 0;

  const bridgeNodalSyncIndex = (isBidirectional && sigmaExactZero)
    ? clamp01(
      (0.35 * phaseLockToTower)
      + (0.22 * bodyAlignment)
      + (0.22 * worldAlignment)
      + (0.21 * retentionFactor)
    )
    : 0;

  // Upward bounded projections (Nodos -> Torre Constructiva)
  const meanCoherence = count > 0 ? (globalCohSum / count) : 0.5;
  const meanEnergy = count > 0 ? (globalEnergySum / count) : 0.5;

  return {
    schema: 'qicn.nodal_tower_bridge.v1',
    mode: normalized,
    active: isBidirectional,
    td_cut_active: isTdCut,
    reducible_control_active: isReducible,
    effective_eta: isBidirectional ? '1/8' : '0',
    sector_count: 4,
    active_node_count: count,
    mean_degree: round6(count > 0 ? (totalEdges / count) : 0),
    inter_sector_coupling_ratio: round6(interSectorCouplingRatio),
    structural_inter_edge_ratio: round6(rawInterRatio),
    inter_sector_signal_flux: round6(perNodeInterFlux),
    intra_sector_signal_flux: round6(perNodeIntraFlux),
    cross_sector_flux_share: round6(crossFluxShare),
    cross_sector_phase_order: round6(crossPhaseOrder),
    nodal_non_factorizability_flux: round6(nodalNonFactorizabilityFlux),
    bridge_nodal_sync_index: round6(bridgeNodalSyncIndex),
    sector_coherence_min: round6(minSectorCoh),
    sector_coherence_spread: round6(sectorCohSpread),
    coupling_matrix: couplingMatrix,
    sectors,
    upward_projections: {
      body_balance: round6(nodalBodyBalance),
      world_contrast: round6(nodalWorldContrast),
      mean_coherence: round6(meanCoherence),
      mean_energy: round6(meanEnergy),
      inter_sector_flux_drive: round6(clamp01(perNodeInterFlux / 1.5))
    },
    evidence_scope: 'internal_support_only',
    external_support_certified: false
  };
}

/**
 * Populates a zero-allocation reusable TypedArray view for 60 FPS WebGL 3D
 * visualization (Bloque 2), updated in-place without cloning arrays per frame.
 */
export function populate3DTelemetryView(nodes, activeNodeIds, bridgeMetrics, towerTelemetry, endogenousDecision, cache, nodeInterFlux = null) {
  const safeNodes = Array.isArray(nodes) ? nodes : [];
  const n = safeNodes.length;
  let buffers = cache.buffers;
  if (!buffers || buffers.capacity !== n) {
    buffers = {
      capacity: n,
      sectorId: new Uint8Array(n),
      activeMask: new Uint8Array(n),
      coherence: new Float32Array(n),
      energy: new Float32Array(n),
      intensity: new Float32Array(n),
      phase: new Float32Array(n),
      interFlux: new Float32Array(n),
      couplingMatrix: new Float32Array(16)
    };
    cache.buffers = buffers;
  }

  for (let i = 0; i < n; i += 1) {
    const node = safeNodes[i];
    if (!node) continue;
    const id = node.id ?? i;
    buffers.sectorId[i] = Number.isInteger(node.sectorId) ? node.sectorId : sectorIdOf(id);
    buffers.activeMask[i] = activeNodeIds?.has?.(id) ? 1 : 0;
    buffers.coherence[i] = Number.isFinite(node.coherenceState) ? node.coherenceState : 0;
    buffers.energy[i] = Number.isFinite(node.energy) ? node.energy : 0;
    buffers.intensity[i] = Number.isFinite(node.intensity) ? node.intensity : 0;
    buffers.phase[i] = Number.isFinite(node.phase) ? node.phase : 0;
    buffers.interFlux[i] = (nodeInterFlux && i < nodeInterFlux.length && Number.isFinite(nodeInterFlux[i]))
      ? nodeInterFlux[i]
      : 0;
  }

  if (Array.isArray(bridgeMetrics?.coupling_matrix)) {
    for (let r = 0; r < 4; r += 1) {
      for (let c = 0; c < 4; c += 1) {
        buffers.couplingMatrix[(r * 4) + c] = Number(bridgeMetrics.coupling_matrix[r]?.[c] || 0);
      }
    }
  } else {
    buffers.couplingMatrix.fill(0);
  }

  return {
    schema: 'qicn.nodal_3d_telemetry_view.v1',
    nodeCount: n,
    buffers,
    bridge: bridgeMetrics || null,
    tower: towerTelemetry ? {
      phase: Number(towerTelemetry.core?.phase ?? 0),
      activeRetention: Number(towerTelemetry.activeRetention ?? 0),
      bodyVPos: Number(towerTelemetry.body?.[0] ?? 0),
      bodyVNeg: Number(towerTelemetry.body?.[1] ?? 0),
      worldWFast: Number(towerTelemetry.world?.[0] ?? 0),
      worldWSlow: Number(towerTelemetry.world?.[1] ?? 0),
      sigmaExactDefect: String(towerTelemetry.sigmaExactDefect ?? '0')
    } : null,
    decisionCode: endogenousDecision?.decision_code || null,
    decisionScore: Number.isFinite(endogenousDecision?.overall_score) ? endogenousDecision.overall_score : null,
    evidence_scope: 'internal_support_only',
    external_support_certified: false
  };
}

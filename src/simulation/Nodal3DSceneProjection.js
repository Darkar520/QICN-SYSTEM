/**
 * Nodal3DSceneProjection
 *
 * Proyeccion 3D libre y emergente de la Red Nodal (1500 nodos reales + sinapsis
 * reales `node.connections` + acoplamiento bidireccional con las torres constructivas).
 *
 * SIN forma parametrica forzada (ni toroide ni cubo pre-cableado):
 * la estructura geometrica emerge libremente de:
 *   1) Relajacion elastica real O(E) a lo largo de las conexiones sinapticas reales,
 *   2) Repulsion radial/angular suave que mantiene la red abierta y legible en 3D,
 *   3) Deriva de fase real (`buffers.phase`), atraccion por coherencia (`buffers.coherence`),
 *      flujo inter-sector (`buffers.interFlux`) y modulacion viva de las torres
 *      (bodyVPos/bodyVNeg, worldWFast/worldWSlow, towerPhase).
 *
 * En controles negativos causales (td_cut_eta_zero eta=0 y reducible_control A=I),
 * los resortes inter-sector se cortan y la red unificada se fisura organicamente
 * a lo largo de las fronteras reales entre sectores.
 *
 * Visual-only diagnostics: no retroalimenta la dinamica matematica ni constituye
 * certificacion fenomenica o soporte externo.
 */

import { NODAL_TOWER_COUPLING_MODES, normalizeCouplingMode, sectorIdOf } from './NodalTowerCouplingBridge.js';

export const NODAL_3D_VIEW_MODES = Object.freeze({
  COUPLED: 'coupled',
  BRIDGE_ONLY: 'bridge_only',
  CORE_ONLY: 'core_only'
});

const RAW_SECTOR_DEFS = [
  {
    id: 0,
    key: 'body_v_pos',
    group: 'body',
    label: 'Cuerpo v+',
    shortLabel: 'v+',
    dir: [-0.72, 0.50, 0.48],
    colorRgb: [0.14, 0.92, 0.72],
    accentHex: '#24ebb8'
  },
  {
    id: 1,
    key: 'body_v_neg',
    group: 'body',
    label: 'Cuerpo v-',
    shortLabel: 'v-',
    dir: [-0.72, -0.50, -0.48],
    colorRgb: [0.94, 0.36, 0.72],
    accentHex: '#f05cb8'
  },
  {
    id: 2,
    key: 'world_w_fast',
    group: 'world',
    label: 'Mundo w_rap',
    shortLabel: 'w_r',
    dir: [0.72, 0.50, -0.48],
    colorRgb: [0.18, 0.80, 0.98],
    accentHex: '#2eccfa'
  },
  {
    id: 3,
    key: 'world_w_slow',
    group: 'world',
    label: 'Mundo w_lento',
    shortLabel: 'w_l',
    dir: [0.72, -0.50, 0.48],
    colorRgb: [0.60, 0.40, 0.98],
    accentHex: '#9966fa'
  }
];

export const NODAL_3D_SECTORS = Object.freeze(
  RAW_SECTOR_DEFS.map((item) => {
    const len = Math.hypot(item.dir[0], item.dir[1], item.dir[2]) || 1;
    return Object.freeze({
      ...item,
      dir: Object.freeze([item.dir[0] / len, item.dir[1] / len, item.dir[2] / len]),
      colorRgb: Object.freeze([...item.colorRgb])
    });
  })
);

const clamp01 = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return n < 0 ? 0 : (n > 1 ? 1 : n);
};

export function parseRationalValue(raw, fallback = 0) {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : fallback;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return fallback;
    const slash = trimmed.indexOf('/');
    if (slash > 0) {
      const num = Number(trimmed.slice(0, slash));
      const den = Number(trimmed.slice(slash + 1));
      if (Number.isFinite(num) && Number.isFinite(den) && den !== 0) {
        return num / den;
      }
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

export function createProjectionWorkspace(nodeCapacity = 1500, edgeCapacity = 2400) {
  const nCap = Math.max(16, Math.floor(Number(nodeCapacity) || 1500));
  const eCap = Math.max(16, Math.floor(Number(edgeCapacity) || 2400));
  return {
    nodeCapacity: nCap,
    edgeCapacity: eCap,
    renderToModelIndex: new Int32Array(nCap),
    modelToRenderIndex: new Int32Array(Math.max(4096, nCap)),
    sectorLocalOrdinals: new Int32Array(nCap),
    sectorCounts: new Int32Array(4),
    nodeDegree: new Uint16Array(nCap),
    seedDir: new Float32Array(nCap * 3),
    seedShell: new Float32Array(nCap),
    relaxedPositions: new Float32Array(nCap * 3),
    velocities: new Float32Array(nCap * 3),
    relaxAccum: new Float32Array(nCap * 3),
    relaxWeightSum: new Float32Array(nCap),
    relaxInitialized: false,
    targetPositions: new Float32Array(nCap * 3),
    targetColors: new Float32Array(nCap * 3),
    targetRadii: new Float32Array(nCap),
    sectorCenters: new Float32Array(12),
    edgeSourceRenderIdx: new Int32Array(eCap),
    edgeTargetRenderIdx: new Int32Array(eCap),
    edgeWeight: new Float32Array(eCap),
    edgeIsBridge: new Uint8Array(eCap),
    edgeIsIncidentFocus: new Uint8Array(eCap),
    candidateSourceRender: new Int32Array(eCap * 3),
    candidateTargetRender: new Int32Array(eCap * 3),
    candidateScore: new Float32Array(eCap * 3),
    candidateWeight: new Float32Array(eCap * 3),
    candidateIsBridge: new Uint8Array(eCap * 3),
    seenEdgeKeys: new Set(),
    neighborSet: new Set()
  };
}

function ensureModelToRenderCapacity(workspace, modelNodeCount) {
  if (workspace.modelToRenderIndex.length < modelNodeCount) {
    workspace.modelToRenderIndex = new Int32Array(modelNodeCount);
  }
}

export function extractCoreVisualizationState(view, ontologicalState = null) {
  const bridge = view?.bridge || ontologicalState?.constructive_finite_cuts?.nodal_tower_bridge || null;
  const tower = view?.tower || ontologicalState?.tower_telemetry || null;
  const bridgeMode = normalizeCouplingMode(
    bridge?.mode || NODAL_TOWER_COUPLING_MODES.OFF
  );
  const tdCutActive = Boolean(bridge?.td_cut_active || bridgeMode === NODAL_TOWER_COUPLING_MODES.TD_CUT_ETA_ZERO);
  const reducibleActive = Boolean(bridge?.reducible_control_active || bridgeMode === NODAL_TOWER_COUPLING_MODES.REDUCIBLE_CONTROL);
  const bridgeActive = Boolean(bridge?.active && !tdCutActive && !reducibleActive && bridgeMode === NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL);

  const writableRetention = parseRationalValue(tower?.activeRetention, 9 / 16);
  const sigmaExactDefect = parseRationalValue(tower?.sigmaExactDefect, 0);
  const effectiveEta = parseRationalValue(bridge?.effective_eta, bridgeActive ? 0.125 : 0);
  const bodyVPos = parseRationalValue(tower?.bodyVPos, 0);
  const bodyVNeg = parseRationalValue(tower?.bodyVNeg, 0);
  const worldWFast = parseRationalValue(tower?.worldWFast, 0);
  const worldWSlow = parseRationalValue(tower?.worldWSlow, 0);
  const towerPhase = Number.isFinite(Number(tower?.phase)) ? Number(tower.phase) : 0;
  const ccc = Number.isFinite(Number(ontologicalState?.coherence))
    ? Number(ontologicalState.coherence)
    : Number(bridge?.upward_projections?.mean_coherence || 0.5);

  const decisionCode = view?.decisionCode
    || ontologicalState?.constructive_finite_cuts?.endogenous_epistemic_decision?.decision_code
    || null;
  const decisionScore = Number.isFinite(Number(view?.decisionScore))
    ? Number(view.decisionScore)
    : Number(ontologicalState?.constructive_finite_cuts?.endogenous_epistemic_decision?.overall_score ?? 0);

  let decisionTone = 'reserve';
  if (decisionCode === 'AFFIRMATIVE_STRUCTURAL_PRESENCE' && bridgeActive) {
    decisionTone = 'affirmative';
  } else if (decisionCode === 'NEGATIVE_UNCOUPLED_OR_LESIONED_DYNAMICS' || tdCutActive || reducibleActive) {
    decisionTone = 'negative';
  }

  return {
    bridgeMode,
    bridgeActive,
    tdCutActive,
    reducibleActive,
    writableRetention,
    sigmaExactDefect,
    effectiveEta,
    bodyVPos,
    bodyVNeg,
    bodyBalance: Number.isFinite(Number(bridge?.upward_projections?.body_balance))
      ? Number(bridge.upward_projections.body_balance)
      : (bodyVPos - bodyVNeg),
    worldWFast,
    worldWSlow,
    worldContrast: Number.isFinite(Number(bridge?.upward_projections?.world_contrast))
      ? Number(bridge.upward_projections.world_contrast)
      : (worldWFast - worldWSlow),
    towerPhase,
    phaseOrder: clamp01(bridge?.cross_sector_phase_order ?? 0.25),
    ccc,
    phi7Reserve: parseRationalValue(
      ontologicalState?.constructive_finite_cuts?.endogenous_epistemic_decision?.axes?.coupled_runtime_coherence?.informed_reserve_phi7_rational,
      1 / 48
    ),
    interSectorRatio: Number(bridge?.inter_sector_coupling_ratio || 0),
    structuralInterEdgeRatio: Number(bridge?.structural_inter_edge_ratio || 0),
    nonFactorizabilityFlux: Number(bridge?.nodal_non_factorizability_flux || 0),
    bridgeSyncIndex: Number(bridge?.bridge_nodal_sync_index || 0),
    decisionCode,
    decisionScore,
    decisionTone,
    sectors: Array.isArray(bridge?.sectors) ? bridge.sectors : null
  };
}

export function selectStratifiedRenderIndices(view, capacity, workspace) {
  const nodeCount = Math.max(0, Number(view?.nodeCount || 0));
  const buffers = view?.buffers;
  if (!buffers || nodeCount <= 0) return 0;

  ensureModelToRenderCapacity(workspace, nodeCount);
  const modelToRender = workspace.modelToRenderIndex;
  modelToRender.fill(-1, 0, nodeCount);

  const cap = Math.min(workspace.nodeCapacity, Math.max(1, Math.floor(capacity || workspace.nodeCapacity)));
  const renderToModel = workspace.renderToModelIndex;
  const sectorCounts = workspace.sectorCounts;
  const localOrdinals = workspace.sectorLocalOrdinals;
  sectorCounts.fill(0);

  let renderCount = 0;
  if (nodeCount <= cap) {
    renderCount = nodeCount;
    for (let i = 0; i < nodeCount; i += 1) {
      renderToModel[i] = i;
      modelToRender[i] = i;
      const sec = Math.max(0, Math.min(3, buffers.sectorId[i] ?? sectorIdOf(i)));
      localOrdinals[i] = sectorCounts[sec];
      sectorCounts[sec] += 1;
    }
  } else {
    const perSectorQuota = Math.max(1, Math.floor(cap / 4));
    const scoredBySector = [[], [], [], []];
    for (let i = 0; i < nodeCount; i += 1) {
      const sec = Math.max(0, Math.min(3, buffers.sectorId[i] ?? sectorIdOf(i)));
      const activeBoost = buffers.activeMask[i] ? 2.0 : 0.0;
      const score = activeBoost
        + (buffers.coherence[i] || 0) * 1.45
        + (buffers.intensity[i] || 0) * 0.75
        + Math.min(1.5, (buffers.interFlux[i] || 0) * 0.65)
        - (i * 1e-6);
      scoredBySector[sec].push({ index: i, score });
    }

    for (let sec = 0; sec < 4; sec += 1) {
      const list = scoredBySector[sec];
      list.sort((a, b) => b.score - a.score);
      const take = Math.min(perSectorQuota, list.length, cap - renderCount);
      for (let j = 0; j < take; j += 1) {
        const modelIdx = list[j].index;
        renderToModel[renderCount] = modelIdx;
        modelToRender[modelIdx] = renderCount;
        localOrdinals[renderCount] = sectorCounts[sec];
        sectorCounts[sec] += 1;
        renderCount += 1;
      }
    }
  }

  // Deterministic isotropic spherical initial seeding (neutral, zero forced geometry!)
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let r = 0; r < renderCount; r += 1) {
    const mIdx = renderToModel[r];
    const u = (r + 0.5) / renderCount;
    const y = 1 - (2 * u);
    const radXZ = Math.sqrt(Math.max(0, 1 - (y * y)));
    const theta = r * goldenAngle;
    const i3 = r * 3;
    workspace.seedDir[i3] = Math.cos(theta) * radXZ;
    workspace.seedDir[i3 + 1] = y;
    workspace.seedDir[i3 + 2] = Math.sin(theta) * radXZ;
    const h = ((mIdx * 2654435761) >>> 0) / 4294967296;
    workspace.seedShell[r] = 0.66 + (0.44 * Math.cbrt(h));
  }

  return renderCount;
}

/**
 * Truly free-form emergent 3D nodal network physics:
 * - No hardcoded torus/cube/polygon shape.
 * - Nodes begin isotropically distributed and self-organize continuously under:
 *   (a) Real synaptic spring attraction over `node.connections` (O(E)),
 *   (b) Phase-driven tangential/harmonic drift from actual `buffers.phase`,
 *   (c) Coherence & interFlux radial self-stratification (coherent hubs migrate
 *       toward inner connective pathways, peripheral nodes expand gently),
 *   (d) Soft shell pressure keeping the 3D network spacious and legible,
 *   (e) Organic sector cleavage ONLY when negative controls sever eta=0 or A=I.
 */
export function computeCoupledNodeTargets(view, workspace, renderCount, coreState, options = {}) {
  const buffers = view?.buffers;
  if (!buffers || renderCount <= 0) {
    return { renderCount: 0, sectorCenters: workspace.sectorCenters };
  }

  const timeSec = Number(options.timeSeconds || 0);
  const viewMode = options.viewMode || NODAL_3D_VIEW_MODES.COUPLED;
  const nodes = Array.isArray(options.nodes) ? options.nodes : null;
  const outPos = workspace.targetPositions;
  const outCol = workspace.targetColors;
  const outRad = workspace.targetRadii;
  const relaxed = workspace.relaxedPositions;
  const seedDir = workspace.seedDir;
  const seedShell = workspace.seedShell;
  const renderToModel = workspace.renderToModelIndex;
  const sectorCenters = workspace.sectorCenters;

  const isCutOrReducible = coreState.tdCutActive || coreState.reducibleActive;
  const baseRadius = viewMode === NODAL_3D_VIEW_MODES.CORE_ONLY ? 13.5 : 10.6;
  const cleavageStrength = coreState.reducibleActive
    ? 4.75
    : (coreState.tdCutActive ? 4.10 : (coreState.bridgeActive ? 0.0 : 1.85));

  // First-frame isotropic initialization
  if (!workspace.relaxInitialized) {
    for (let r = 0; r < renderCount; r += 1) {
      const mIdx = renderToModel[r];
      const s = Math.max(0, Math.min(3, buffers.sectorId[mIdx] ?? sectorIdOf(mIdx)));
      const secMeta = NODAL_3D_SECTORS[s];
      const p3 = r * 3;
      const rad = baseRadius * seedShell[r];
      relaxed[p3] = (seedDir[p3] * rad) + (secMeta.dir[0] * cleavageStrength);
      relaxed[p3 + 1] = (seedDir[p3 + 1] * rad) + (secMeta.dir[1] * cleavageStrength);
      relaxed[p3 + 2] = (seedDir[p3 + 2] * rad) + (secMeta.dir[2] * cleavageStrength);
    }
  }

  // Pass 1: Real O(E) synaptic spring force accumulation over active real connections
  const activeEdges = Math.min(workspace.edgeCapacity, Number(options.activeEdgeCount || 0));
  const accum = workspace.relaxAccum;
  const wSum = workspace.relaxWeightSum;
  accum.fill(0, 0, renderCount * 3);
  wSum.fill(0, 0, renderCount);

  if (activeEdges > 0) {
    for (let e = 0; e < activeEdges; e += 1) {
      const u = workspace.edgeSourceRenderIdx[e];
      const v = workspace.edgeTargetRenderIdx[e];
      if (u < 0 || u >= renderCount || v < 0 || v >= renderCount) continue;
      const isBridge = workspace.edgeIsBridge[e] > 0;
      // Causal control: cutting eta=0 or A=I literally zeros cross-sector springs!
      const springK = isBridge
        ? (coreState.bridgeActive ? (0.42 * (0.35 + workspace.edgeWeight[e])) : 0.0)
        : (0.38 * (0.35 + workspace.edgeWeight[e]));
      if (springK <= 0) continue;

      const u3 = u * 3;
      const v3 = v * 3;
      accum[u3] += relaxed[v3] * springK;
      accum[u3 + 1] += relaxed[v3 + 1] * springK;
      accum[u3 + 2] += relaxed[v3 + 2] * springK;
      wSum[u] += springK;

      accum[v3] += relaxed[u3] * springK;
      accum[v3 + 1] += relaxed[u3 + 1] * springK;
      accum[v3 + 2] += relaxed[u3 + 2] * springK;
      wSum[v] += springK;
    }
  }

  // Pass 2: Free emergent self-organization combining synaptic springs + real phase/coherence field
  const secAccumX = [0, 0, 0, 0];
  const secAccumY = [0, 0, 0, 0];
  const secAccumZ = [0, 0, 0, 0];
  const secNum = [0, 0, 0, 0];

  const bodyAxis = Math.tanh(coreState.bodyBalance * 3.5);
  const worldAxis = Math.tanh(coreState.worldContrast * 3.5);
  const stepAlpha = workspace.relaxInitialized ? 0.16 : 0.55;

  for (let rIdx = 0; rIdx < renderCount; rIdx += 1) {
    const mIdx = renderToModel[rIdx];
    const p3 = rIdx * 3;
    const s = Math.max(0, Math.min(3, buffers.sectorId[mIdx] ?? sectorIdOf(mIdx)));
    const secMeta = NODAL_3D_SECTORS[s];

    const coh = clamp01(buffers.coherence[mIdx]);
    const energy = clamp01(buffers.energy[mIdx]);
    const intensity = clamp01(buffers.intensity[mIdx]);
    const nodePhase = Number.isFinite(buffers.phase[mIdx]) ? buffers.phase[mIdx] : 0;
    const interFlux = Math.max(0, Number(buffers.interFlux[mIdx]) || 0);
    const active = buffers.activeMask[mIdx] > 0;

    let x = relaxed[p3];
    let y = relaxed[p3 + 1];
    let z = relaxed[p3 + 2];

    // (a) Synaptic centroid pull from real connected neighbors
    const sw = wSum[rIdx];
    if (sw > 1e-4) {
      const synX = accum[p3] / sw;
      const synY = accum[p3 + 1] / sw;
      const synZ = accum[p3 + 2] / sw;
      const synWeight = coreState.bridgeActive ? 0.36 : 0.30;
      x += (synX - x) * synWeight;
      y += (synY - y) * synWeight;
      z += (synZ - z) * synWeight;
    }

    // (b) Local emergent field from real node phase, coherence, and live Body/World dynamics
    // Shifts nodes along their own natural phase waves without forcing any preset shape
    const phaseCos = Math.cos(nodePhase + (coreState.towerPhase * 0.5) + (timeSec * 0.18));
    const phaseSin = Math.sin(nodePhase - (coreState.towerPhase * 0.4) - (timeSec * 0.14));
    const targetShellR = baseRadius * seedShell[rIdx] * (1.06 - (0.20 * coh) + (0.09 * phaseCos));

    // Gentle isotropic dispersion anchor mixed with subtle sector dipole when cut
    const sectorBias = isCutOrReducible ? 0.42 : 0.14;
    const dirX = (seedDir[p3] * (1 - sectorBias)) + (secMeta.dir[0] * sectorBias);
    const dirY = (seedDir[p3 + 1] * (1 - sectorBias)) + (secMeta.dir[1] * sectorBias);
    const dirZ = (seedDir[p3 + 2] * (1 - sectorBias)) + (secMeta.dir[2] * sectorBias);
    const dLen = Math.hypot(dirX, dirY, dirZ) || 1;
    const ux = dirX / dLen;
    const uy = dirY / dLen;
    const uz = dirZ / dLen;

    // Tangential phase curl (creates living organic currents across the mesh!)
    const curlAmp = (coreState.bridgeActive ? 1.15 : 0.45) * (0.4 + energy);
    const cx = (-uz * phaseSin + uy * bodyAxis * 0.4) * curlAmp;
    const cy = (phaseCos * (0.7 + Math.abs(worldAxis) * 0.5)) * curlAmp;
    const cz = (ux * phaseSin - uy * worldAxis * 0.4) * curlAmp;

    const restX = (ux * targetShellR) + cx + (secMeta.dir[0] * cleavageStrength);
    const restY = (uy * targetShellR) + cy + (secMeta.dir[1] * cleavageStrength);
    const restZ = (uz * targetShellR) + cz + (secMeta.dir[2] * cleavageStrength);

    // Blend synaptic self-organization with open-volume radial pressure (prevents collapsing to center)
    const openPressure = isCutOrReducible ? 0.58 : 0.46;
    const goalX = (x * (1 - openPressure)) + (restX * openPressure);
    const goalY = (y * (1 - openPressure)) + (restY * openPressure);
    const goalZ = (z * (1 - openPressure)) + (restZ * openPressure);

    relaxed[p3] += (goalX - relaxed[p3]) * stepAlpha;
    relaxed[p3 + 1] += (goalY - relaxed[p3 + 1]) * stepAlpha;
    relaxed[p3 + 2] += (goalZ - relaxed[p3 + 2]) * stepAlpha;

    const fx = relaxed[p3];
    const fy = relaxed[p3 + 1];
    const fz = relaxed[p3 + 2];

    outPos[p3] = fx;
    outPos[p3 + 1] = fy;
    outPos[p3 + 2] = fz;

    secAccumX[s] += fx;
    secAccumY[s] += fy;
    secAccumZ[s] += fz;
    secNum[s] += 1;

    // Crisp jewel-like node proportions with clear hub hierarchy
    const deg = workspace.nodeDegree[rIdx] || (nodes?.[mIdx]?.connections?.length || 4);
    const hubBoost = Math.min(0.068, Math.max(0, deg - 5) * 0.012);
    const activityRadius = active ? (0.044 + intensity * 0.024 + coh * 0.022 + hubBoost) : 0.028;
    const bridgePulse = (coreState.bridgeActive && interFlux > 0.08) ? Math.min(0.028, interFlux * 0.014) : 0;
    const modeScale = viewMode === NODAL_3D_VIEW_MODES.CORE_ONLY ? 0.52 : 1.0;
    outRad[rIdx] = (activityRadius + bridgePulse) * modeScale;

    // Multi-spectral sector colors smoothly blended by live state
    const baseRgb = secMeta.colorRgb;
    const lum = active ? (0.54 + coh * 0.40 + energy * 0.16) : (0.18 + coh * 0.16);
    const bridgeGlow = coreState.bridgeActive ? Math.min(0.30, interFlux * 0.20) : 0;
    const lesionTint = coreState.tdCutActive ? 0.26 : (coreState.reducibleActive ? 0.18 : 0);

    let cr = (baseRgb[0] * lum) + (bridgeGlow * 0.28) + (lesionTint * 0.44);
    let cg = (baseRgb[1] * lum) + (bridgeGlow * 0.80) - (lesionTint * 0.14);
    let cb = (baseRgb[2] * lum) + (bridgeGlow * 0.74) - (lesionTint * 0.10);

    if (viewMode === NODAL_3D_VIEW_MODES.BRIDGE_ONLY && interFlux < 0.01 && coh < 0.78) {
      cr *= 0.28;
      cg *= 0.28;
      cb *= 0.28;
    } else if (viewMode === NODAL_3D_VIEW_MODES.CORE_ONLY) {
      cr *= 0.22;
      cg *= 0.22;
      cb *= 0.22;
    }

    outCol[p3] = clamp01(cr);
    outCol[p3 + 1] = clamp01(cg);
    outCol[p3 + 2] = clamp01(cb);
  }

  workspace.relaxInitialized = true;

  for (let s = 0; s < 4; s += 1) {
    const b = s * 3;
    const cnt = secNum[s] || 1;
    sectorCenters[b] = secAccumX[s] / cnt;
    sectorCenters[b + 1] = secAccumY[s] / cnt;
    sectorCenters[b + 2] = secAccumZ[s] / cnt;
  }

  return { renderCount, sectorCenters };
}

export function buildRealSynapticEdgeSelection(nodes, view, workspace, renderCount, maxEdges, coreState, options = {}) {
  const buffers = view?.buffers;
  if (!Array.isArray(nodes) || !buffers || renderCount <= 0 || maxEdges <= 0) {
    return { totalEdges: 0, bridgeEdges: 0, intraEdges: 0, focusDegreeIntra: 0, focusDegreeInter: 0 };
  }

  const viewMode = options.viewMode || NODAL_3D_VIEW_MODES.COUPLED;
  const focusRenderIdx = Number.isInteger(options.focusRenderIdx) ? options.focusRenderIdx : -1;
  const focusModelIdx = focusRenderIdx >= 0 && focusRenderIdx < renderCount
    ? workspace.renderToModelIndex[focusRenderIdx]
    : -1;

  workspace.neighborSet.clear();
  if (focusRenderIdx >= 0) workspace.neighborSet.add(focusRenderIdx);

  if (viewMode === NODAL_3D_VIEW_MODES.CORE_ONLY && focusRenderIdx < 0) {
    return { totalEdges: 0, bridgeEdges: 0, intraEdges: 0, focusDegreeIntra: 0, focusDegreeInter: 0 };
  }

  const capEdges = Math.min(workspace.edgeCapacity, Math.max(1, Math.floor(maxEdges)));
  const candLimit = workspace.candidateSourceRender.length;
  const renderToModel = workspace.renderToModelIndex;
  const modelToRender = workspace.modelToRenderIndex;
  const posArr = workspace.relaxedPositions;
  const hasPositions = workspace.relaxInitialized;
  const seen = workspace.seenEdgeKeys;
  seen.clear();

  let candCount = 0;
  let focusDegreeIntra = 0;
  let focusDegreeInter = 0;

  let idLookup = null;
  if (nodes.length > 0 && (nodes[0]?.id !== 0 || nodes[nodes.length - 1]?.id !== nodes.length - 1)) {
    idLookup = new Map();
    for (let i = 0; i < nodes.length; i += 1) {
      if (nodes[i]) idLookup.set(nodes[i].id, i);
    }
  }

  for (let rU = 0; rU < renderCount; rU += 1) {
    const mU = renderToModel[rU];
    const nodeU = nodes[mU];
    const conns = nodeU?.connections;
    workspace.nodeDegree[rU] = Array.isArray(conns) ? conns.length : 0;
    if (!Array.isArray(conns) || conns.length === 0) continue;

    const secU = buffers.sectorId[mU] ?? sectorIdOf(nodeU.id);
    const activeU = buffers.activeMask[mU] > 0;
    const isFocusNode = (mU === focusModelIdx);

    for (let c = 0; c < conns.length; c += 1) {
      const conn = conns[c];
      const mV = idLookup ? idLookup.get(conn.targetId) : conn.targetId;
      if (mV === undefined || mV < 0 || mV >= modelToRender.length) continue;

      const rV = modelToRender[mV];
      if (rV < 0 || rV === rU) continue;

      const secV = buffers.sectorId[mV] ?? sectorIdOf(conn.targetId);
      const isBridge = secU !== secV ? 1 : 0;

      const touchesFocus = isFocusNode || (mV === focusModelIdx);
      if (touchesFocus) {
        if (isBridge) focusDegreeInter += 1;
        else focusDegreeIntra += 1;
        workspace.neighborSet.add(isFocusNode ? rV : rU);
      }

      if (viewMode === NODAL_3D_VIEW_MODES.BRIDGE_ONLY && !isBridge && !touchesFocus) continue;
      if (viewMode === NODAL_3D_VIEW_MODES.CORE_ONLY && !touchesFocus) continue;

      const lo = rU < rV ? rU : rV;
      const hi = rU < rV ? rV : rU;
      const pairKey = (lo * 65536) + hi;
      if (seen.has(pairKey)) continue;
      seen.add(pairKey);

      if (candCount >= candLimit) continue;

      const weight = clamp01(conn.weight ?? 0.35);
      const activeV = buffers.activeMask[mV] > 0;

      let geometricClarityBoost = 0;
      if (hasPositions) {
        const u3 = lo * 3;
        const v3 = hi * 3;
        const dx = posArr[u3] - posArr[v3];
        const dy = posArr[u3 + 1] - posArr[v3 + 1];
        const dz = posArr[u3 + 2] - posArr[v3 + 2];
        const dist = Math.hypot(dx, dy, dz);
        geometricClarityBoost = 2.8 / (1.0 + (dist * 0.25));
      }

      const bridgePriority = isBridge
        ? (coreState.bridgeActive ? 1.80 : 0.40)
        : 1.05;

      const priority = (touchesFocus ? 100.0 : 0.0)
        + bridgePriority
        + geometricClarityBoost
        + (weight * 1.45)
        + (activeU && activeV ? 0.65 : 0.05)
        + ((buffers.coherence[mU] + buffers.coherence[mV]) * 0.4);

      workspace.candidateSourceRender[candCount] = lo;
      workspace.candidateTargetRender[candCount] = hi;
      workspace.candidateScore[candCount] = priority;
      workspace.candidateWeight[candCount] = weight;
      workspace.candidateIsBridge[candCount] = isBridge;
      candCount += 1;
    }
  }

  let outCount = 0;
  let bridgeEdges = 0;
  let intraEdges = 0;

  if (candCount <= capEdges) {
    outCount = candCount;
    for (let i = 0; i < outCount; i += 1) {
      const u = workspace.candidateSourceRender[i];
      const v = workspace.candidateTargetRender[i];
      const isB = workspace.candidateIsBridge[i];
      workspace.edgeSourceRenderIdx[i] = u;
      workspace.edgeTargetRenderIdx[i] = v;
      workspace.edgeWeight[i] = workspace.candidateWeight[i];
      workspace.edgeIsBridge[i] = isB;
      workspace.edgeIsIncidentFocus[i] = (u === focusRenderIdx || v === focusRenderIdx) ? 1 : 0;
      if (isB) bridgeEdges += 1;
      else intraEdges += 1;
    }
  } else {
    const bridgeIndices = [];
    const intraIndices = [];
    for (let i = 0; i < candCount; i += 1) {
      const u = workspace.candidateSourceRender[i];
      const v = workspace.candidateTargetRender[i];
      if (u === focusRenderIdx || v === focusRenderIdx) {
        if (outCount < capEdges) {
          const isB = workspace.candidateIsBridge[i];
          workspace.edgeSourceRenderIdx[outCount] = u;
          workspace.edgeTargetRenderIdx[outCount] = v;
          workspace.edgeWeight[outCount] = workspace.candidateWeight[i];
          workspace.edgeIsBridge[outCount] = isB;
          workspace.edgeIsIncidentFocus[outCount] = 1;
          outCount += 1;
          if (isB) bridgeEdges += 1;
          else intraEdges += 1;
        }
      } else if (workspace.candidateIsBridge[i]) {
        bridgeIndices.push(i);
      } else {
        intraIndices.push(i);
      }
    }

    bridgeIndices.sort((a, b) => workspace.candidateScore[b] - workspace.candidateScore[a]);
    intraIndices.sort((a, b) => workspace.candidateScore[b] - workspace.candidateScore[a]);

    const remaining = capEdges - outCount;
    const bridgeQuota = viewMode === NODAL_3D_VIEW_MODES.BRIDGE_ONLY
      ? remaining
      : Math.min(bridgeIndices.length, Math.floor(remaining * 0.50));
    for (let j = 0; j < bridgeQuota && outCount < capEdges; j += 1) {
      const idx = bridgeIndices[j];
      workspace.edgeSourceRenderIdx[outCount] = workspace.candidateSourceRender[idx];
      workspace.edgeTargetRenderIdx[outCount] = workspace.candidateTargetRender[idx];
      workspace.edgeWeight[outCount] = workspace.candidateWeight[idx];
      workspace.edgeIsBridge[outCount] = 1;
      workspace.edgeIsIncidentFocus[outCount] = 0;
      outCount += 1;
      bridgeEdges += 1;
    }
    for (let j = 0; j < intraIndices.length && outCount < capEdges; j += 1) {
      const idx = intraIndices[j];
      workspace.edgeSourceRenderIdx[outCount] = workspace.candidateSourceRender[idx];
      workspace.edgeTargetRenderIdx[outCount] = workspace.candidateTargetRender[idx];
      workspace.edgeWeight[outCount] = workspace.candidateWeight[idx];
      workspace.edgeIsBridge[outCount] = 0;
      workspace.edgeIsIncidentFocus[outCount] = 0;
      outCount += 1;
      intraEdges += 1;
    }
  }

  return {
    totalEdges: outCount,
    bridgeEdges,
    intraEdges,
    focusDegreeIntra,
    focusDegreeInter
  };
}

export function buildFallback3DView(nodes = [], ontologicalState = null, bridgeMetrics = null, endogenousDecision = null) {
  const list = Array.isArray(nodes) ? nodes : [];
  const n = list.length;
  const sectorId = new Uint8Array(n);
  const activeMask = new Uint8Array(n);
  const coherence = new Float32Array(n);
  const energy = new Float32Array(n);
  const intensity = new Float32Array(n);
  const phase = new Float32Array(n);
  const interFlux = new Float32Array(n);
  const couplingMatrix = new Float32Array(16);

  for (let i = 0; i < n; i += 1) {
    const node = list[i] || {};
    const nid = Number.isInteger(node.id) ? node.id : i;
    sectorId[i] = Number.isInteger(node.sectorId) ? (node.sectorId & 3) : sectorIdOf(nid);
    activeMask[i] = node.active === false ? 0 : 1;
    coherence[i] = clamp01(node.coherenceState ?? 0.5);
    energy[i] = clamp01(node.energyLevel ?? node.energy ?? 0.5);
    intensity[i] = clamp01(node.intensity ?? 0.5);
    phase[i] = Number.isFinite(Number(node.phase)) ? Number(node.phase) : 0;
    interFlux[i] = Math.max(0, Number(node.interFlux) || 0);
  }

  return {
    schema: 'qicn.nodal_3d_telemetry_view.v1',
    nodeCount: n,
    buffers: {
      capacity: n,
      sectorId,
      activeMask,
      coherence,
      energy,
      intensity,
      phase,
      interFlux,
      couplingMatrix
    },
    bridge: bridgeMetrics || ontologicalState?.constructive_finite_cuts?.nodal_tower_bridge || null,
    tower: ontologicalState?.tower_telemetry || null,
    decisionCode: endogenousDecision?.decision_code
      || ontologicalState?.constructive_finite_cuts?.endogenous_epistemic_decision?.decision_code
      || null,
    decisionScore: endogenousDecision?.overall_score
      ?? ontologicalState?.constructive_finite_cuts?.endogenous_epistemic_decision?.overall_score
      ?? null,
    evidence_scope: 'internal_support_only',
    external_support_certified: false
  };
}

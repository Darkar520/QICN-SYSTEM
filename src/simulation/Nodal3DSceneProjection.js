/**
 * Nodal3DSceneProjection
 *
 * Motor fisico fuerza-dirigido O(N + E) 100% isotropico (SO(3)) y organico para la Red Nodal
 * (1500 nodos reales + sinapsis reales `node.connections` + trafico real de senales).
 *
 * SIN cascaron esferico fijo, SIN toroide, SIN respiracion radial y SIN grilla cubica:
 * toda estructura espacial emerge exclusivamente de:
 *   1) Reposo inicial en el suelo plano (`dormantFloor`) cuando la simulacion esta apagada;
 *      al encender, los nodos se levantan desde el suelo y se auto-organizan al interactuar,
 *   2) Atraccion elastica real (Hooke) directamente sobre `node.connections` ponderada por
 *      `conn.weight` (desacoplada del filtro visual `Puente`/`Torre` para no cristalizar),
 *   3) Repulsion par-a-par 100% isotropica en O(N) mediante muestreo determinista rotatorio
 *      con pasos coprimos (simetria rotacional continua SO(3), cero planos/ejes X/Y/Z),
 *   4) Gravedad isotropica minima hacia el origen + trafico real de paquetes (`view.signals`).
 *
 * En controles negativos causales (td_cut_eta_zero eta=0 y reducible_control A=I),
 * los resortes inter-sector caen a 0 y la repulsion separa organicamente los sectores.
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

const FLOOR_Y = -7.8;
const FLOOR_RADIUS = 11.2;
const ISOTROPIC_PEER_SAMPLES = 6;
const COPRIME_STRIDES = [23, 67, 139, 251, 419, 643];

const clamp01 = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return n < 0 ? 0 : (n > 1 ? 1 : n);
};

const hashUnitSigned = (seed) => {
  let x = (seed | 0) ^ 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  x ^= x >>> 16;
  return ((x >>> 0) / 2147483648) - 1.0; // [-1, 1)
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
    relaxedPositions: new Float32Array(nCap * 3),
    velocities: new Float32Array(nCap * 3),
    forces: new Float32Array(nCap * 3),
    physicsStep: 0,
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
      const pulseBoost = buffers.signalPulse ? Math.min(1.5, (buffers.signalPulse[i] || 0) * 0.5) : 0;
      const score = activeBoost
        + pulseBoost
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

  return renderCount;
}

/**
 * Pure O(N + E) SO(3)-Isotropic Force-Directed 3D Graph Engine:
 * - Zero cubic grid, zero Fibonacci sphere anchor, zero torus formula, zero radial breathing!
 * - When `options.dormantFloor` is true (simulation not yet started), all nodes rest quietly
 *   on a flat circular floor plane (`y ≈ -7.8`, zero preset 3D structure).
 * - When the simulation turns on, nodes lift off the floor and self-organize in 3D purely from
 *   real weighted synaptic springs (`node.connections`) + SO(3)-isotropic pairwise repulsion.
 */
export function computeCoupledNodeTargets(view, workspace, renderCount, coreState, options = {}) {
  const buffers = view?.buffers;
  if (!buffers || renderCount <= 0) {
    return { renderCount: 0, sectorCenters: workspace.sectorCenters };
  }

  const viewMode = options.viewMode || NODAL_3D_VIEW_MODES.COUPLED;
  const nodes = Array.isArray(options.nodes) ? options.nodes : null;
  const dormantFloor = Boolean(options.dormantFloor);
  const pausedFrozen = Boolean(options.pausedFrozen);
  const fineMeshMode = Boolean(options.fineMeshMode);
  const outPos = workspace.targetPositions;
  const outCol = workspace.targetColors;
  const outRad = workspace.targetRadii;
  const pos = workspace.relaxedPositions;
  const vel = workspace.velocities;
  const force = workspace.forces;
  const renderToModel = workspace.renderToModelIndex;
  const modelToRender = workspace.modelToRenderIndex;
  const sectorCenters = workspace.sectorCenters;

  // Dormant floor state: before simulation starts, all nodes rest quietly on a flat circular floor
  if (dormantFloor) {
    if (workspace.relaxInitialized !== 'floor') {
      for (let r = 0; r < renderCount; r += 1) {
        const mIdx = renderToModel[r];
        const p3 = r * 3;
        const uR = (hashUnitSigned((mIdx * 3) + 11) + 1.0) * 0.5;
        const theta = (hashUnitSigned((mIdx * 3) + 29) + 1.0) * Math.PI;
        const rad = Math.sqrt(uR) * FLOOR_RADIUS;
        pos[p3] = Math.cos(theta) * rad;
        pos[p3 + 1] = FLOOR_Y + (hashUnitSigned((mIdx * 3) + 47) * 0.14);
        pos[p3 + 2] = Math.sin(theta) * rad;
        vel[p3] = 0;
        vel[p3 + 1] = 0;
        vel[p3 + 2] = 0;
      }
      workspace.relaxInitialized = 'floor';
      workspace.physicsStep = 0;
    }
  } else if (workspace.relaxInitialized === 'floor') {
    // Organic wake-up from the floor: keep exact floor positions and apply a gentle upward lift impulse
    for (let r = 0; r < renderCount; r += 1) {
      const mIdx = renderToModel[r];
      const p3 = r * 3;
      const coh = clamp01(buffers.coherence[mIdx]);
      const ph = Number.isFinite(buffers.phase[mIdx]) ? buffers.phase[mIdx] : (mIdx * 0.17);
      vel[p3] = Math.cos(ph) * 0.08;
      vel[p3 + 1] = 0.24 + (coh * 0.32);
      vel[p3 + 2] = Math.sin(ph) * 0.08;
    }
    workspace.relaxInitialized = 'waking';
  } else if (!workspace.relaxInitialized) {
    // Cold-start non-dormant seeding (e.g., headless tests): uniform 3D ball (zero cubic bias!)
    const initRadius = 8.5;
    for (let r = 0; r < renderCount; r += 1) {
      const mIdx = renderToModel[r];
      const p3 = r * 3;
      const cosPhi = hashUnitSigned((mIdx * 3) + 11);
      const sinPhi = Math.sqrt(Math.max(0, 1.0 - (cosPhi * cosPhi)));
      const theta = (hashUnitSigned((mIdx * 3) + 29) + 1.0) * Math.PI;
      const uR = (hashUnitSigned((mIdx * 3) + 47) + 1.0) * 0.5;
      const rad = Math.cbrt(uR) * initRadius;
      pos[p3] = rad * sinPhi * Math.cos(theta);
      pos[p3 + 1] = rad * cosPhi;
      pos[p3 + 2] = rad * sinPhi * Math.sin(theta);
      vel[p3] = 0;
      vel[p3 + 1] = 0;
      vel[p3 + 2] = 0;
    }
  }

  const activeEdges = Math.min(workspace.edgeCapacity, Number(options.activeEdgeCount || 0));
  const shouldIntegrate = !dormantFloor && !pausedFrozen;
  const iterations = !shouldIntegrate
    ? 0
    : (workspace.relaxInitialized === false ? ((nodes || activeEdges > 0) ? 10 : 1) : 1);

  const sampleCount = Math.min(ISOTROPIC_PEER_SAMPLES, Math.max(1, renderCount - 1));
  const repGain = 1.15 * (ISOTROPIC_PEER_SAMPLES / sampleCount);
  const gravityK = 0.026;
  const lesionPolarityK = coreState.reducibleActive ? 0.165 : (coreState.tdCutActive ? 0.140 : 0.0);
  const lesionTargetRadius = coreState.reducibleActive ? 11.4 : (coreState.tdCutActive ? 9.8 : 0.0);

  for (let iter = 0; iter < iterations; iter += 1) {
    force.fill(0, 0, renderCount * 3);
    workspace.physicsStep = (workspace.physicsStep + 1) | 0;
    const stepShift = workspace.physicsStep * 131;

    // (1) Compute global center of mass in O(N)
    let globSumX = 0;
    let globSumY = 0;
    let globSumZ = 0;
    for (let r = 0; r < renderCount; r += 1) {
      const p3 = r * 3;
      globSumX += pos[p3];
      globSumY += pos[p3 + 1];
      globSumZ += pos[p3 + 2];
    }
    const gCx = globSumX / renderCount;
    const gCy = globSumY / renderCount;
    const gCz = globSumZ / renderCount;

    // (2) 100% SO(3)-isotropic pairwise repulsion in O(N) via rotating coprime strides (Newton's 3rd law)
    // Zero spatial grid, zero Cartesian face planes, zero cube/tesseract anisotropy!
    for (let r = 0; r < renderCount; r += 1) {
      const p3 = r * 3;
      const x = pos[p3];
      const y = pos[p3 + 1];
      const z = pos[p3 + 2];
      let fx = 0;
      let fy = 0;
      let fz = 0;

      for (let k = 0; k < sampleCount; k += 1) {
        const stride = COPRIME_STRIDES[k];
        const other = (r + stride + ((stepShift + (k * 97)) % renderCount)) % renderCount;
        if (other === r) continue;
        const o3 = other * 3;
        const dx = x - pos[o3];
        const dy = y - pos[o3 + 1];
        const dz = z - pos[o3 + 2];
        const d2 = (dx * dx) + (dy * dy) + (dz * dz) + 0.65;
        const inv = repGain / (d2 * (1.0 + (d2 * 0.085)));
        const pfx = dx * inv;
        const pfy = dy * inv;
        const pfz = dz * inv;
        fx += pfx;
        fy += pfy;
        fz += pfz;
        force[o3] -= pfx;
        force[o3 + 1] -= pfy;
        force[o3 + 2] -= pfz;
      }

      // Gentle radial exclusion right around the central diamond (r < 2) without creating any shell
      const rx = x - gCx;
      const ry = y - gCy;
      const rz = z - gCz;
      const r2 = (rx * rx) + (ry * ry) + (rz * rz) + 1.8;
      const coreRepulse = 1.25 / (r2 * (1.0 + (r2 * 0.16)));
      fx += rx * coreRepulse;
      fy += ry * coreRepulse;
      fz += rz * coreRepulse;

      // Direction-free isotropic centering gravity
      fx -= x * gravityK;
      fy -= y * gravityK;
      fz -= z * gravityK;

      // Causal negative controls ONLY: when eta=0 or A=I severs cross-sector bridges, uncoupled sectors separate
      if (lesionPolarityK > 0) {
        const mIdx = renderToModel[r];
        const s = Math.max(0, Math.min(3, buffers.sectorId[mIdx] ?? sectorIdOf(mIdx)));
        const secDir = NODAL_3D_SECTORS[s].dir;
        fx += ((secDir[0] * lesionTargetRadius) - x) * lesionPolarityK;
        fy += ((secDir[1] * lesionTargetRadius) - y) * lesionPolarityK;
        fz += ((secDir[2] * lesionTargetRadius) - z) * lesionPolarityK;
      }

      force[p3] += fx;
      force[p3 + 1] += fy;
      force[p3 + 2] += fz;
    }

    // (3) Real weighted synaptic Hooke springs directly over `node.connections` (independent of visual filter!)
    // Switching to `Torre` or `Puente` never disables physical springs or crystallizes the network.
    if (nodes && nodes.length > 0) {
      for (let u = 0; u < renderCount; u += 1) {
        const mU = renderToModel[u];
        const nodeU = nodes[mU];
        const conns = nodeU?.connections;
        if (!conns || conns.length === 0) continue;
        const secU = buffers.sectorId[mU] ?? sectorIdOf(mU);
        const u3 = u * 3;
        const ux = pos[u3];
        const uy = pos[u3 + 1];
        const uz = pos[u3 + 2];

        const connLen = conns.length;
        const maxPerNode = connLen > 4 ? 4 : connLen;
        const startOff = connLen > 4 ? ((workspace.physicsStep + u) % connLen) : 0;

        for (let k = 0; k < maxPerNode; k += 1) {
          const conn = conns[(startOff + k) % connLen];
          const mV = Number(conn?.targetId);
          if (!Number.isInteger(mV) || mV < 0 || mV >= modelToRender.length) continue;
          const v = modelToRender[mV];
          if (v < 0 || v >= renderCount || v === u) continue;
          const secV = buffers.sectorId[mV] ?? sectorIdOf(mV);
          const isBridge = secU !== secV;
          const w = clamp01(conn.weight ?? 0.45);
          const kSpring = isBridge
            ? (coreState.bridgeActive ? (0.056 * (0.28 + (w * 1.65))) : 0.0)
            : (0.052 * (0.28 + (w * 1.55)));
          if (kSpring <= 0) continue;

          const v3 = v * 3;
          const dx = pos[v3] - ux;
          const dy = pos[v3 + 1] - uy;
          const dz = pos[v3 + 2] - uz;
          const d2 = (dx * dx) + (dy * dy) + (dz * dz);
          const dist = Math.sqrt(d2) || 0.001;
          const restLen = Math.max(0.85, 3.4 - (w * 2.15));
          const mag = (kSpring * (dist - restLen)) / dist;

          const sfx = dx * mag;
          const sfy = dy * mag;
          const sfz = dz * mag;
          force[u3] += sfx;
          force[u3 + 1] += sfy;
          force[u3 + 2] += sfz;
          force[v3] -= sfx;
          force[v3 + 1] -= sfy;
          force[v3 + 2] -= sfz;
        }
      }
    } else {
      for (let e = 0; e < activeEdges; e += 1) {
        const u = workspace.edgeSourceRenderIdx[e];
        const v = workspace.edgeTargetRenderIdx[e];
        if (u < 0 || u >= renderCount || v < 0 || v >= renderCount) continue;
        const isBridge = workspace.edgeIsBridge[e] > 0;
        const w = workspace.edgeWeight[e];
        const kSpring = isBridge
          ? (coreState.bridgeActive ? (0.068 * (0.30 + (w * 1.65))) : 0.0)
          : (0.062 * (0.30 + (w * 1.55)));
        if (kSpring <= 0) continue;

        const u3 = u * 3;
        const v3 = v * 3;
        const dx = pos[v3] - pos[u3];
        const dy = pos[v3 + 1] - pos[u3 + 1];
        const dz = pos[v3 + 2] - pos[u3 + 2];
        const dist = Math.hypot(dx, dy, dz) || 0.001;
        const restLen = Math.max(0.85, 3.35 - (w * 2.15));
        const mag = (kSpring * (dist - restLen)) / dist;

        const sfx = dx * mag;
        const sfy = dy * mag;
        const sfz = dz * mag;
        force[u3] += sfx;
        force[u3 + 1] += sfy;
        force[u3 + 2] += sfz;
        force[v3] -= sfx;
        force[v3 + 1] -= sfy;
        force[v3 + 2] -= sfz;
      }
    }

    // (4) Semi-implicit Euler integration with silky viscous damping & isotropic spherical bound
    const isSettled = workspace.relaxInitialized === true && workspace.physicsStep > 26;
    const damping = isSettled ? 0.85 : (workspace.relaxInitialized === true ? 0.80 : 0.74);
    const stepDt = isSettled ? 0.36 : (workspace.relaxInitialized === true ? 0.42 : 0.56);
    const maxSpeed = isSettled ? 0.46 : (workspace.relaxInitialized === true ? 0.90 : 1.75);
    const maxRadius = 21.5;

    for (let r = 0; r < renderCount; r += 1) {
      const p3 = r * 3;
      let vx = (vel[p3] + (force[p3] * stepDt)) * damping;
      let vy = (vel[p3 + 1] + (force[p3 + 1] * stepDt)) * damping;
      let vz = (vel[p3 + 2] + (force[p3 + 2] * stepDt)) * damping;

      const spd2 = (vx * vx) + (vy * vy) + (vz * vz);
      if (spd2 > (maxSpeed * maxSpeed)) {
        const sc = maxSpeed / Math.sqrt(spd2);
        vx *= sc;
        vy *= sc;
        vz *= sc;
      }

      vel[p3] = vx;
      vel[p3 + 1] = vy;
      vel[p3 + 2] = vz;

      let nx = pos[p3] + vx;
      let ny = pos[p3 + 1] + vy;
      let nz = pos[p3 + 2] + vz;

      // Spherical soft boundary (never a cube box clamp!)
      const nr2 = (nx * nx) + (ny * ny) + (nz * nz);
      if (nr2 > (maxRadius * maxRadius)) {
        const invR = maxRadius / Math.sqrt(nr2);
        nx *= invR;
        ny *= invR;
        nz *= invR;
      }

      pos[p3] = nx;
      pos[p3 + 1] = ny;
      pos[p3 + 2] = nz;
    }
  }

  if (!dormantFloor) {
    workspace.relaxInitialized = true;
  }

  // Pass 2: Export target positions, Obsidian-style degree+traffic node sizing, & live signal illumination
  const secAccumX = [0, 0, 0, 0];
  const secAccumY = [0, 0, 0, 0];
  const secAccumZ = [0, 0, 0, 0];
  const secNum = [0, 0, 0, 0];
  const signalPulseBuf = buffers.signalPulse || null;

  for (let rIdx = 0; rIdx < renderCount; rIdx += 1) {
    const mIdx = renderToModel[rIdx];
    const p3 = rIdx * 3;
    const s = Math.max(0, Math.min(3, buffers.sectorId[mIdx] ?? sectorIdOf(mIdx)));
    const secMeta = NODAL_3D_SECTORS[s];

    const fx = pos[p3];
    const fy = pos[p3 + 1];
    const fz = pos[p3 + 2];
    outPos[p3] = fx;
    outPos[p3 + 1] = fy;
    outPos[p3 + 2] = fz;

    secAccumX[s] += fx;
    secAccumY[s] += fy;
    secAccumZ[s] += fz;
    secNum[s] += 1;

    const coh = clamp01(buffers.coherence[mIdx]);
    const energy = clamp01(buffers.energy[mIdx]);
    const intensity = clamp01(buffers.intensity[mIdx]);
    const interFlux = Math.max(0, Number(buffers.interFlux[mIdx]) || 0);
    const rawPulse = signalPulseBuf ? (signalPulseBuf[mIdx] || 0) : 0;
    const active = buffers.activeMask[mIdx] > 0;
    const deg = workspace.nodeDegree[rIdx] || (nodes?.[mIdx]?.connections?.length || 4);

    let baseRad;
    let cr;
    let cg;
    let cb;
    const baseRgb = secMeta.colorRgb;

    if (dormantFloor) {
      baseRad = fineMeshMode ? 0.026 : 0.036;
      cr = 0.10 + (baseRgb[0] * 0.14);
      cg = 0.12 + (baseRgb[1] * 0.14);
      cb = 0.20 + (baseRgb[2] * 0.16);
    } else if (fineMeshMode) {
      // Fine translucent hover-style mode: delicate pinpoint micro-jewels + true unbleached 4-sector colors
      const sigFlare = clamp01((rawPulse - 0.50) * 0.78);
      const hubBoost = Math.min(0.034, Math.max(0, deg - 5) * 0.0062);
      const trafficFlare = sigFlare * 0.024;
      baseRad = active ? (0.030 + (intensity * 0.012) + (coh * 0.011) + hubBoost + trafficFlare) : 0.020;

      const lum = active ? (0.58 + (coh * 0.28) + (energy * 0.12)) : (0.20 + (coh * 0.14));
      const lesionTint = coreState.tdCutActive ? 0.26 : (coreState.reducibleActive ? 0.18 : 0);
      const flareMix = sigFlare * 0.26;
      cr = (baseRgb[0] * lum * (1 - flareMix)) + (0.96 * flareMix) + (lesionTint * 0.42);
      cg = (baseRgb[1] * lum * (1 - flareMix)) + (0.99 * flareMix) - (lesionTint * 0.14);
      cb = (baseRgb[2] * lum * (1 - flareMix)) + (1.00 * flareMix) - (lesionTint * 0.10);

      if (viewMode === NODAL_3D_VIEW_MODES.BRIDGE_ONLY && interFlux < 0.01 && coh < 0.78) {
        cr *= 0.25;
        cg *= 0.25;
        cb *= 0.25;
      } else if (viewMode === NODAL_3D_VIEW_MODES.CORE_ONLY) {
        cr *= 0.28;
        cg *= 0.28;
        cb *= 0.28;
      }
    } else {
      // Classic default mode (exact a909d97 look: full glowing spheres + dramatic hover reveal)
      const sigPulse = clamp01(0.45 + (rawPulse * 0.45));
      const hubBoost = Math.min(0.085, Math.max(0, deg - 4) * 0.014);
      const trafficFlare = sigPulse * 0.055;
      baseRad = active ? (0.045 + intensity * 0.024 + coh * 0.020 + hubBoost + trafficFlare) : 0.028;

      const lum = active ? (0.50 + coh * 0.36 + energy * 0.14) : (0.16 + coh * 0.14);
      const lesionTint = coreState.tdCutActive ? 0.28 : (coreState.reducibleActive ? 0.20 : 0);
      cr = (baseRgb[0] * lum) + (sigPulse * 0.42) + (lesionTint * 0.44);
      cg = (baseRgb[1] * lum) + (sigPulse * 0.52) - (lesionTint * 0.14);
      cb = (baseRgb[2] * lum) + (sigPulse * 0.48) - (lesionTint * 0.10);

      if (viewMode === NODAL_3D_VIEW_MODES.BRIDGE_ONLY && interFlux < 0.01 && coh < 0.78) {
        cr *= 0.25;
        cg *= 0.25;
        cb *= 0.25;
      } else if (viewMode === NODAL_3D_VIEW_MODES.CORE_ONLY) {
        cr *= 0.24;
        cg *= 0.24;
        cb *= 0.24;
      }
    }

    const modeScale = viewMode === NODAL_3D_VIEW_MODES.CORE_ONLY ? (fineMeshMode ? 0.62 : 0.52) : 1.0;
    outRad[rIdx] = baseRad * modeScale;

    outCol[p3] = clamp01(cr);
    outCol[p3 + 1] = clamp01(cg);
    outCol[p3 + 2] = clamp01(cb);
  }

  for (let s = 0; s < 4; s += 1) {
    const b = s * 3;
    const cnt = secNum[s] || 1;
    sectorCenters[b] = secAccumX[s] / cnt;
    sectorCenters[b + 1] = secAccumY[s] / cnt;
    sectorCenters[b + 2] = secAccumZ[s] / cnt;
  }

  return { renderCount, sectorCenters };
}

/**
 * O(deg) zero-GC neighborhood lookup for silky hover/click tracking without triggering
 * a full 15,000-edge sort or visual edge pop!
 */
export function updateFocusNeighborhoodFast(nodes, workspace, renderCount, edgeCount, focusRenderIdx) {
  workspace.neighborSet.clear();
  if (!Number.isInteger(focusRenderIdx) || focusRenderIdx < 0 || focusRenderIdx >= renderCount) {
    return 0;
  }
  workspace.neighborSet.add(focusRenderIdx);
  const modelToRender = workspace.modelToRenderIndex;
  const mFocus = workspace.renderToModelIndex[focusRenderIdx];
  const nodeFocus = Array.isArray(nodes) ? nodes[mFocus] : null;
  const conns = nodeFocus?.connections;
  if (Array.isArray(conns)) {
    for (let i = 0; i < conns.length; i += 1) {
      const mV = Number(conns[i]?.targetId);
      if (Number.isInteger(mV) && mV >= 0 && mV < modelToRender.length) {
        const rV = modelToRender[mV];
        if (rV >= 0 && rV < renderCount) workspace.neighborSet.add(rV);
      }
    }
  }
  // Include any already-drawn edges pointing into focusRenderIdx (O(edgeCount) fast scan)
  const srcArr = workspace.edgeSourceRenderIdx;
  const dstArr = workspace.edgeTargetRenderIdx;
  for (let e = 0; e < edgeCount; e += 1) {
    if (srcArr[e] === focusRenderIdx) workspace.neighborSet.add(dstArr[e]);
    else if (dstArr[e] === focusRenderIdx) workspace.neighborSet.add(srcArr[e]);
  }
  return workspace.neighborSet.size;
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
      const phaseAlign = 0.5 + (0.5 * Math.cos((buffers.phase[mU] || 0) - (buffers.phase[mV] || 0)));

      // Prioritize genuinely strong resonant synaptic highways (no artificial geometry preference!)
      const bridgePriority = isBridge
        ? (coreState.bridgeActive ? 1.45 : 0.35)
        : 1.05;

      const priority = (touchesFocus ? 100.0 : 0.0)
        + bridgePriority
        + (weight * 2.4)
        + (phaseAlign * 0.95)
        + (activeU && activeV ? 0.55 : 0.05);

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

/**
 * Reusable zero-GC particle pool for real per-tick synaptic signal bursts
 * (`view.signals` emitted directly by `NodalProcessingLayer.processSignals`).
 * Shared cleanly between WebGL 3D and Canvas 2D renderers.
 */
export function createSignalPacketPool(capacity = 360) {
  const cap = Math.max(16, Math.floor(Number(capacity) || 360));
  return {
    capacity: cap,
    lastTickVersion: -1,
    activeCount: 0,
    cursor: 0,
    fromRender: new Int32Array(cap),
    toRender: new Int32Array(cap),
    progress: new Float32Array(cap),
    speed: new Float32Array(cap),
    strength: new Float32Array(cap),
    isInter: new Uint8Array(cap),
    alive: new Uint8Array(cap),
    positions: new Float32Array(cap * 3),
    colors: new Float32Array(cap * 3)
  };
}

export function spawnSignalPacketsFromView(pool, view, workspace, renderCount, coreState, viewMode = NODAL_3D_VIEW_MODES.COUPLED) {
  const sig = view?.signals;
  if (!pool || !sig || sig.count <= 0 || renderCount <= 0) return 0;
  if (sig.tickVersion === pool.lastTickVersion) return 0;
  pool.lastTickVersion = sig.tickVersion;

  if (viewMode === NODAL_3D_VIEW_MODES.CORE_ONLY) return 0;

  const modelToRender = workspace.modelToRenderIndex;
  const maxSpawn = Math.min(sig.count, Math.floor(pool.capacity * 0.45));
  const stride = Math.max(1, Math.floor(sig.count / Math.max(1, maxSpawn)));
  let spawned = 0;

  for (let i = 0; i < sig.count && spawned < maxSpawn; i += stride) {
    const isInter = sig.isInter[i] > 0;
    if (viewMode === NODAL_3D_VIEW_MODES.BRIDGE_ONLY && !isInter) continue;
    if (isInter && !coreState.bridgeActive) continue;

    const mFrom = sig.from[i];
    const mTo = sig.to[i];
    if (mFrom < 0 || mFrom >= modelToRender.length || mTo < 0 || mTo >= modelToRender.length) continue;
    const rFrom = modelToRender[mFrom];
    const rTo = modelToRender[mTo];
    if (rFrom < 0 || rTo < 0 || rFrom === rTo || rFrom >= renderCount || rTo >= renderCount) continue;

    const slot = pool.cursor;
    pool.cursor = (pool.cursor + 1) % pool.capacity;
    pool.fromRender[slot] = rFrom;
    pool.toRender[slot] = rTo;
    pool.progress[slot] = 0.0;
    pool.strength[slot] = clamp01(sig.strength[i]);
    pool.speed[slot] = 1.15 + (pool.strength[slot] * 0.95);
    pool.isInter[slot] = isInter ? 1 : 0;
    pool.alive[slot] = 1;
    spawned += 1;
  }

  return spawned;
}

export function stepSignalPackets(pool, currentPositions, renderCount, dtSeconds, reducedMotion = false) {
  if (!pool || !currentPositions || renderCount <= 0) return 0;
  const dt = reducedMotion ? (dtSeconds * 0.25) : dtSeconds;
  let visible = 0;
  const posOut = pool.positions;
  const colOut = pool.colors;

  for (let i = 0; i < pool.capacity; i += 1) {
    if (!pool.alive[i]) continue;
    const nextT = pool.progress[i] + (pool.speed[i] * dt);
    if (nextT >= 1.0) {
      pool.alive[i] = 0;
      continue;
    }
    const rU = pool.fromRender[i];
    const rV = pool.toRender[i];
    if (rU < 0 || rU >= renderCount || rV < 0 || rV >= renderCount) {
      pool.alive[i] = 0;
      continue;
    }
    pool.progress[i] = nextT;
    const u3 = rU * 3;
    const v3 = rV * 3;
    const out3 = visible * 3;

    posOut[out3] = currentPositions[u3] + ((currentPositions[v3] - currentPositions[u3]) * nextT);
    posOut[out3 + 1] = currentPositions[u3 + 1] + ((currentPositions[v3 + 1] - currentPositions[u3 + 1]) * nextT);
    posOut[out3 + 2] = currentPositions[u3 + 2] + ((currentPositions[v3 + 2] - currentPositions[u3 + 2]) * nextT);

    // Smooth fade-in and bright crest near destination arrival
    const env = Math.sin(nextT * Math.PI);
    const boost = 0.55 + (0.45 * env) + (0.25 * pool.strength[i]);
    if (pool.isInter[i]) {
      // Inter-sector bridge signal photon: radiant gold-emerald spark
      colOut[out3] = clamp01(0.55 * boost);
      colOut[out3 + 1] = clamp01(1.00 * boost);
      colOut[out3 + 2] = clamp01(0.76 * boost);
    } else {
      // Intra-sector local signal photon: crisp electric ice-cyan spark
      colOut[out3] = clamp01(0.60 * boost);
      colOut[out3 + 1] = clamp01(0.92 * boost);
      colOut[out3 + 2] = clamp01(1.00 * boost);
    }
    visible += 1;
  }

  pool.activeCount = visible;
  return visible;
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
  const signalPulse = new Float32Array(n);
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
    signalPulse[i] = Math.max(0, Number(node.signalPulse) || 0);
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
      signalPulse,
      couplingMatrix
    },
    signals: null,
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

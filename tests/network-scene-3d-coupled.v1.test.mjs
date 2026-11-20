import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createHeadlessRuntimeSession } from '../src/runtime/HeadlessRuntimeSession.js';
import { QICNConfig } from '../services/config.js';
import { NODAL_TOWER_COUPLING_MODES } from '../src/simulation/NodalTowerCouplingBridge.js';
import {
  NODAL_3D_SECTORS,
  NODAL_3D_VIEW_MODES,
  buildRealSynapticEdgeSelection,
  computeCoupledNodeTargets,
  createProjectionWorkspace,
  createSignalPacketPool,
  extractCoreVisualizationState,
  selectStratifiedRenderIndices,
  spawnSignalPacketsFromView,
  stepSignalPackets
} from '../src/simulation/Nodal3DSceneProjection.js';
import { ConsciousNode } from '../src/simulation/ConsciousNode.js';
import { buildTowerToNodalFeedback } from '../src/simulation/NodalTowerCouplingBridge.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');

function runCouplingMode(mode, nodes = 120, ticks = 18) {
  const cfg = {
    ...structuredClone(QICNConfig),
    NODAL_TOWER_COUPLING_MODE: mode
  };
  const session = createHeadlessRuntimeSession({ config: cfg, seed: 31, nodes });
  session.initialize();
  for (let t = 1; t <= ticks; t += 1) {
    session.step(t);
  }
  const layer = session.bag.nodalLayer.current;
  const core = session.bag.ontologicalCore.current;
  const endo = core.getEndogenousEpistemicDecision({
    nodalBridge: layer.getBridgeMetrics()
  });
  const view = layer.get3DTelemetryView(core.ontologicalState.tower_telemetry, endo);
  return { session, layer, core, endo, view };
}

// 1. Desktop full 1500-node 1:1 fidelity vs stratified 4-sector mobile projection
{
  const bidirFull = runCouplingMode(NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL, 1500, 3);
  const wsDesktop = createProjectionWorkspace(1500, 1800);
  const countDesktop = selectStratifiedRenderIndices(bidirFull.view, 1500, wsDesktop);
  assert.equal(countDesktop, 1500, 'Desktop tier must map all 1500 nodes 1:1');
  assert.equal(wsDesktop.sectorCounts.reduce((a, b) => a + b, 0), 1500);
  for (let s = 0; s < 4; s += 1) {
    assert.equal(wsDesktop.sectorCounts[s], 375, `Sector ${s} must contain exact 375 nodes out of 1500`);
  }

  const wsMobile = createProjectionWorkspace(420, 480);
  const countMobile = selectStratifiedRenderIndices(bidirFull.view, 420, wsMobile);
  assert.equal(countMobile, 420, 'Mobile tier must stratify cleanly to budget 420');
  for (let s = 0; s < 4; s += 1) {
    assert.equal(wsMobile.sectorCounts[s], 105, `Mobile sector ${s} must hold exact stratified 105 nodes`);
  }

  const coreState = extractCoreVisualizationState(bidirFull.view, bidirFull.core.ontologicalState);
  assert.equal(coreState.bridgeActive, true);
  assert.equal(coreState.effectiveEta, 0.125);
  assert.equal(coreState.sigmaExactDefect, 0);
  assert(coreState.writableRetention >= (9 / 16), `Live activeRetention (${coreState.writableRetention}) must satisfy >= 9/16`);

  computeCoupledNodeTargets(bidirFull.view, wsDesktop, countDesktop, coreState, { timeSeconds: 1.5 });

  // Verify real synaptic edge selection (no synthetic O(N^2) spatial scanning)
  const edgesCoupled = buildRealSynapticEdgeSelection(
    bidirFull.layer.nodes,
    bidirFull.view,
    wsDesktop,
    countDesktop,
    1800,
    coreState,
    { viewMode: NODAL_3D_VIEW_MODES.COUPLED }
  );
  assert(edgesCoupled.totalEdges > 0 && edgesCoupled.totalEdges <= 1800, 'Must select real synaptic edges within budget');
  assert(edgesCoupled.bridgeEdges > 0, 'Bidirectional mode must expose real cross-sector bridge edges');

  // Verify every emitted edge corresponds to a real adjacency connection
  for (let e = 0; e < Math.min(200, edgesCoupled.totalEdges); e += 1) {
    const rU = wsDesktop.edgeSourceRenderIdx[e];
    const rV = wsDesktop.edgeTargetRenderIdx[e];
    const mU = wsDesktop.renderToModelIndex[rU];
    const mV = wsDesktop.renderToModelIndex[rV];
    const nU = bidirFull.layer.nodes[mU];
    const nV = bidirFull.layer.nodes[mV];
    const linked = nU.connections.some((c) => c.targetId === nV.id)
      || nV.connections.some((c) => c.targetId === nU.id);
    assert.equal(linked, true, `Rendered edge (${mU}, ${mV}) must come directly from real node.connections`);
  }

  const edgesBridgeOnly = buildRealSynapticEdgeSelection(
    bidirFull.layer.nodes,
    bidirFull.view,
    wsDesktop,
    countDesktop,
    1800,
    coreState,
    { viewMode: NODAL_3D_VIEW_MODES.BRIDGE_ONLY }
  );
  assert.equal(edgesBridgeOnly.intraEdges, 0, 'Bridge-only view mode must exclude intra-sector links');
  assert(edgesBridgeOnly.bridgeEdges > 0, 'Bridge-only view mode must preserve cross-sector bridge edges');

  const edgesCoreOnly = buildRealSynapticEdgeSelection(
    bidirFull.layer.nodes,
    bidirFull.view,
    wsDesktop,
    countDesktop,
    1800,
    coreState,
    { viewMode: NODAL_3D_VIEW_MODES.CORE_ONLY }
  );
  assert.equal(edgesCoreOnly.totalEdges, 0, 'Core-only view mode isolates central tower rings when unfocused');

  const focusNodeIdx = 0;
  const edgesFocus = buildRealSynapticEdgeSelection(
    bidirFull.layer.nodes,
    bidirFull.view,
    wsDesktop,
    countDesktop,
    1800,
    coreState,
    { viewMode: NODAL_3D_VIEW_MODES.COUPLED, focusRenderIdx: focusNodeIdx }
  );
  assert(edgesFocus.totalEdges > 0);
  assert(wsDesktop.neighborSet.has(focusNodeIdx), 'Neighbor set must include focused node');
  assert(wsDesktop.neighborSet.size > 1, 'Neighbor set must expand along real incident edges');
}

// 2. Causal negative controls geometrically & chromatically separate in 3D space
{
  const bidir = runCouplingMode(NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL, 120, 18);
  const tdCut = runCouplingMode(NODAL_TOWER_COUPLING_MODES.TD_CUT, 120, 18);
  const reducible = runCouplingMode(NODAL_TOWER_COUPLING_MODES.REDUCIBLE, 120, 18);

  const measureMeanSectorDistFromOrigin = (run) => {
    const ws = createProjectionWorkspace(120, 600);
    const rc = selectStratifiedRenderIndices(run.view, 120, ws);
    const coreState = extractCoreVisualizationState(run.view, run.core.ontologicalState);
    const edges = buildRealSynapticEdgeSelection(run.layer.nodes, run.view, ws, rc, 600, coreState);
    for (let step = 0; step < 8; step += 1) {
      computeCoupledNodeTargets(run.view, ws, rc, coreState, { nodes: run.layer.nodes, activeEdgeCount: edges.totalEdges });
    }
    let sumDist = 0;
    for (let s = 0; s < 4; s += 1) {
      const b = s * 3;
      sumDist += Math.hypot(ws.sectorCenters[b], ws.sectorCenters[b + 1], ws.sectorCenters[b + 2]);
    }
    return { meanRadius: sumDist / 4, coreState, ws, rc };
  };

  const bRes = measureMeanSectorDistFromOrigin(bidir);
  const tRes = measureMeanSectorDistFromOrigin(tdCut);
  const rRes = measureMeanSectorDistFromOrigin(reducible);

  assert.equal(bRes.coreState.bridgeActive, true);
  assert.equal(bRes.coreState.decisionTone, 'affirmative');
  assert.equal(tRes.coreState.tdCutActive, true);
  assert.equal(tRes.coreState.decisionTone, 'negative');
  assert.equal(rRes.coreState.reducibleActive, true);
  assert.equal(rRes.coreState.decisionTone, 'negative');

  assert(
    tRes.meanRadius > bRes.meanRadius + 2.0,
    `T_d cut (eta=0) must drift sectors outward from central core (${tRes.meanRadius.toFixed(2)} > ${bRes.meanRadius.toFixed(2)})`
  );
  assert(
    rRes.meanRadius > bRes.meanRadius + 2.5,
    `Reducible control (A=I) must visibly uncouple sectors outward (${rRes.meanRadius.toFixed(2)} > ${bRes.meanRadius.toFixed(2)})`
  );
  assert.equal(NODAL_3D_SECTORS.length, 4);

  // 2b. Verify live real signal traffic telemetry, non-saturated signalPulse contrast, & dual-mode (classic vs fineMeshMode)
  assert(bidir.view.buffers.signalPulse instanceof Float32Array, '3D view must expose zero-GC signalPulse Float32Array');
  assert(bidir.view.signals && bidir.view.signals.count > 0, 'Live processSignals must populate real traveling signal packets');
  let maxPulse = 0;
  let minPulse = Infinity;
  let sumRadClassic = 0;
  for (let r = 0; r < bRes.rc; r += 1) {
    const mIdx = bRes.ws.renderToModelIndex[r];
    const pVal = bidir.view.buffers.signalPulse[mIdx];
    if (pVal > maxPulse) maxPulse = pVal;
    if (pVal < minPulse) minPulse = pVal;
    sumRadClassic += bRes.ws.targetRadii[r];
  }
  const meanRadClassic = sumRadClassic / bRes.rc;
  assert(maxPulse <= 2.01, `signalPulse must not saturate globally at 4.000 (maxPulse=${maxPulse.toFixed(3)})`);
  assert((maxPulse - minPulse) > 0.15, `signalPulse must preserve genuine node-to-node dynamic contrast (${minPulse.toFixed(3)}..${maxPulse.toFixed(3)})`);

  // Verify fineMeshMode toggle shrinks nodes to delicate hover-style jewels & preserves distinct 4-sector unbleached colors
  const wsFine = createProjectionWorkspace(120, 600);
  const rcFine = selectStratifiedRenderIndices(bidir.view, 120, wsFine);
  computeCoupledNodeTargets(bidir.view, wsFine, rcFine, bRes.coreState, { nodes: bidir.layer.nodes, fineMeshMode: true });
  let sumRadFine = 0;
  const secRgbSum = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
  for (let r = 0; r < rcFine; r += 1) {
    const mIdx = wsFine.renderToModelIndex[r];
    sumRadFine += wsFine.targetRadii[r];
    const sec = bidir.view.buffers.sectorId[mIdx] & 3;
    secRgbSum[sec][0] += wsFine.targetColors[r * 3];
    secRgbSum[sec][1] += wsFine.targetColors[(r * 3) + 1];
    secRgbSum[sec][2] += wsFine.targetColors[(r * 3) + 2];
    secRgbSum[sec][3] += 1;
  }
  const meanRadFine = sumRadFine / rcFine;
  assert(meanRadFine < 0.095 && meanRadFine < meanRadClassic * 0.72, `fineMeshMode must render finer nodes than classic mode (fine=${meanRadFine.toFixed(4)} < classic=${meanRadClassic.toFixed(4)})`);
  const s0R = secRgbSum[0][0] / Math.max(1, secRgbSum[0][3]);
  const s1R = secRgbSum[1][0] / Math.max(1, secRgbSum[1][3]);
  assert((s1R - s0R) > 0.35, `fineMeshMode must preserve distinct unbleached 4-sector colors (R diff=${(s1R - s0R).toFixed(3)})`);
  const pool = createSignalPacketPool(128);
  const spawned = spawnSignalPacketsFromView(pool, bidir.view, bRes.ws, bRes.rc, bRes.coreState, NODAL_3D_VIEW_MODES.COUPLED);
  assert(spawned > 0, 'SignalPacketPool must spawn traveling packets from live processSignals telemetry');
  const visibleCount = stepSignalPackets(pool, bRes.ws.targetPositions, bRes.rc, 0.05, false);
  assert(visibleCount > 0, 'Stepping SignalPacketPool must advance packets smoothly along real synapses');
}

// 3. Structural pairwise phase-resonant plasticity (no blind uniform global edge bonus)
{
  const cfg = { HEBBIAN_FACTOR: 0.01, SYNAPTIC_PRUNING_THRESHOLD: 0.05, BASE_LEARNING_RATE: 0.0 };
  const feedback = buildTowerToNodalFeedback({ activeRetention: 1, core: { phase: 0 }, sigmaExactDefect: '0' }, NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL);
  const src = new ConsciousNode(0, cfg);
  const inPhase = new ConsciousNode(1, cfg);
  const antiPhase = new ConsciousNode(5, cfg);
  src.sectorId = 0; src.phase = 0.2; src.coherenceState = 0.85; src.intensity = 0.9;
  inPhase.sectorId = 1; inPhase.phase = 0.22; inPhase.coherenceState = 0.85;
  antiPhase.sectorId = 1; antiPhase.phase = 0.2 + Math.PI; antiPhase.coherenceState = 0.25;
  src.connections = [
    { targetId: 1, weight: 0.50 },
    { targetId: 5, weight: 0.50 }
  ];
  const byId = [];
  byId[0] = src;
  byId[1] = inPhase;
  byId[5] = antiPhase;
  src.applyPlasticity(0.1, cfg, feedback, byId);
  const wIn = src.connections.find((c) => c.targetId === 1)?.weight ?? 0;
  const wAnti = src.connections.find((c) => c.targetId === 5)?.weight ?? 0;
  assert(
    wIn > wAnti + 0.05,
    `Phase-resonant Hebbian plasticity must strengthen in-phase synapses strictly more than anti-phase ones (${wIn.toFixed(4)} > ${wAnti.toFixed(4)})`
  );
}

// 4. Dormant floor start -> organic lift-off + CORE_ONLY keeps real springs active
{
  const wakeRun = runCouplingMode(NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL, 120, 12);
  const wsWake = createProjectionWorkspace(120, 600);
  const rcWake = selectStratifiedRenderIndices(wakeRun.view, 120, wsWake);
  const coreState = extractCoreVisualizationState(wakeRun.view, wakeRun.core.ontologicalState);

  // Before powering on: all nodes rest flat on the dormant floor (y ≈ -7.8)
  computeCoupledNodeTargets(wakeRun.view, wsWake, rcWake, coreState, {
    nodes: wakeRun.layer.nodes,
    dormantFloor: true
  });
  let sumYFloor = 0;
  let sumY2Floor = 0;
  for (let r = 0; r < rcWake; r += 1) {
    const y = wsWake.targetPositions[(r * 3) + 1];
    sumYFloor += y;
    sumY2Floor += y * y;
  }
  const meanYFloor = sumYFloor / rcWake;
  const stdYFloor = Math.sqrt(Math.max(0, (sumY2Floor / rcWake) - (meanYFloor * meanYFloor)));
  assert(meanYFloor < -7.2 && meanYFloor > -8.4, `Dormant floor must rest nodes near y=-7.8 (got ${meanYFloor.toFixed(2)})`);
  assert(stdYFloor < 0.25, `Dormant floor must be flat before wake-up (stdY=${stdYFloor.toFixed(3)})`);

  // After powering on: nodes lift off the floor and self-organize in 3D from real synaptic springs
  for (let step = 0; step < 30; step += 1) {
    computeCoupledNodeTargets(wakeRun.view, wsWake, rcWake, coreState, {
      nodes: wakeRun.layer.nodes,
      dormantFloor: false,
      viewMode: NODAL_3D_VIEW_MODES.CORE_ONLY
    });
  }
  let sumYWake = 0;
  let sumY2Wake = 0;
  for (let r = 0; r < rcWake; r += 1) {
    const y = wsWake.targetPositions[(r * 3) + 1];
    sumYWake += y;
    sumY2Wake += y * y;
  }
  const meanYWake = sumYWake / rcWake;
  const stdYWake = Math.sqrt(Math.max(0, (sumY2Wake / rcWake) - (meanYWake * meanYWake)));
  assert(meanYWake > -3.5, `Waking up from floor must lift network toward 3D center (meanY=${meanYWake.toFixed(2)})`);
  assert(stdYWake > 1.2, `Waking up must expand organically in 3D even under CORE_ONLY visual filter (stdY=${stdYWake.toFixed(2)})`);
}

// 5. Static integration check: zero spherical shell anchor, zero radial breathing, zero cubic grid walls
{
  const sceneText = fs.readFileSync(path.join(root, 'src/components/NetworkScene3D.jsx'), 'utf8');
  const projText = fs.readFileSync(path.join(root, 'src/simulation/Nodal3DSceneProjection.js'), 'utf8');
  const engineText = fs.readFileSync(path.join(root, 'src/components/SimulationEngine.jsx'), 'utf8');
  assert(!projText.includes('targetShellR'), 'Nodal3DSceneProjection must not force a spherical shell anchor');
  assert(!projText.includes('phaseCos'), 'Nodal3DSceneProjection must not inject artificial radial breathing');
  assert(!projText.includes('FACE_OFFSETS'), 'Nodal3DSceneProjection must not use 6-face Cartesian grid repulsion (prevents tesseract/cube artifact)');
  assert(!projText.includes('GRID_DIM'), 'Nodal3DSceneProjection must not discretize repulsion onto a cubic grid');
  assert(sceneText.includes('Nodal3DSceneProjection'), 'NetworkScene3D must use Nodal3DSceneProjection');
  assert(sceneText.includes('get3DTelemetryView'), 'NetworkScene3D must consume live zero-GC get3DTelemetryView');
  assert(sceneText.includes('buildRealSynapticEdgeSelection'), 'NetworkScene3D must render real synaptic connections');
  assert(sceneText.includes('spawnSignalPacketsFromView'), 'NetworkScene3D must render live traveling signal packets');
  assert(sceneText.includes('3d-fine-mesh-toggle'), 'NetworkScene3D must expose live fine-mesh toggle gadget');
  assert(engineText.includes('bridgeMetrics={liveBridgeForCanvas}'), 'SimulationEngine must pass live bridge telemetry to NetworkCanvas');
  assert(engineText.includes('endogenousDecision={liveEndogenousForCanvas}'), 'SimulationEngine must pass live endogenous verdict to NetworkCanvas');
}

console.log('OK: SO(3)-isotropic organic 3D graph, dormant floor wake-up, resonant plasticity, live signal traffic, 1500-node 1:1 & negative controls verified');

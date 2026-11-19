import assert from 'node:assert/strict';
import { QICNConfig } from '../services/config.js';
import { createHeadlessRuntimeSession } from '../src/runtime/HeadlessRuntimeSession.js';
import {
  NODAL_TOWER_COUPLING_MODES,
  NODAL_SECTORS,
  sectorIdOf
} from '../src/simulation/NodalTowerCouplingBridge.js';
import {
  evaluateEndogenousEpistemicDecision,
  resolveSnapshotEndogenousDecision,
  ENDOGENOUS_DECISION_CODES
} from '../src/canon/epistemic/EndogenousEpistemicDecisionEngine.js';
import { captureRuntimeSnapshot, verifySnapshotDigest } from '../src/language/runtimeSnapshot.js';
import { prepareTurn, evaluateRealization, finalizeTurn } from '../src/language/conversationEngine.js';
import { captureDynamicState, applyDynamicState } from '../src/persistence/dynamicState.js';
import { evidentialReply } from './fixtures/evidentialFixtures.mjs';

function runMode(mode, { seed = 11, nodes = 120, ticks = 28 } = {}) {
  const cfg = { ...structuredClone(QICNConfig), NODAL_TOWER_COUPLING_MODE: mode };
  const session = createHeadlessRuntimeSession({ config: cfg, seed, nodes });
  session.initialize();
  const checkpoints = new Map();
  for (let t = 1; t <= ticks; t += 1) {
    session.step(t);
    if ([1, 2, 12, ticks].includes(t)) {
      const core = session.bag.ontologicalCore.current;
      const layer = session.bag.nodalLayer.current;
      const snap = captureRuntimeSnapshot(core, {
        tick: t,
        isRunning: true,
        nodes: layer.nodes,
        activeNodeCount: layer.getActiveNodes().length,
        config: session.environment.config,
        build: { version: '2.1.0-REINFORCED', signature: 'QICN-SIG-b1' },
        worldModel: session.bag.worldModelRef.current,
        holographicMemory: session.bag.holographicMemory.current,
        kaizenEngine: session.bag.kaizenEngine.current,
        exogenousDriver: session.bag.exogenousDriverRef.current,
        now: 1_800_000_000_000 + (t * 500)
      });
      checkpoints.set(t, {
        snap,
        decision: resolveSnapshotEndogenousDecision(snap),
        bridge: snap.tower?.constructive_cuts?.nodal_tower_bridge || null
      });
    }
  }
  return { session, checkpoints };
}

// 1. Real causal effect: Constructive Tower -> 1500-Node Layer vs physical cut (eta=0) and reducible control (A=I)
const bidir = runMode(NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL);
const tdCut = runMode(NODAL_TOWER_COUPLING_MODES.TD_CUT);
const reducible = runMode(NODAL_TOWER_COUPLING_MODES.REDUCIBLE);

const bFinal = bidir.checkpoints.get(28);
const cFinal = tdCut.checkpoints.get(28);
const rFinal = reducible.checkpoints.get(28);

assert.equal(verifySnapshotDigest(bFinal.snap), true);
assert.equal(verifySnapshotDigest(cFinal.snap), true);
assert.equal(verifySnapshotDigest(rFinal.snap), true);

// 4 deterministic sectors assigned to all nodes
const bidirNodes = bidir.session.bag.nodalLayer.current.nodes;
assert.equal(bidirNodes.length, 120);
for (const node of bidirNodes) {
  assert.equal(node.sectorId, sectorIdOf(node.id));
  assert.equal(node.sectorRole, NODAL_SECTORS[node.sectorId].key);
}
assert.equal(bFinal.bridge.sector_count, 4);
assert.equal(bFinal.bridge.coupling_matrix.length, 4);

// Substantial real quantitative separation on live nodal metrics
assert.ok(bFinal.snap.metrics.x_n - cFinal.snap.metrics.x_n > 0.25, `Expected large X_N drop under td_cut (${bFinal.snap.metrics.x_n} vs ${cFinal.snap.metrics.x_n})`);
assert.ok(bFinal.snap.metrics.x_n - rFinal.snap.metrics.x_n > 0.25, `Expected large X_N drop under reducible (${bFinal.snap.metrics.x_n} vs ${rFinal.snap.metrics.x_n})`);
assert.ok(bFinal.snap.metrics.ccc - cFinal.snap.metrics.ccc > 0.15, `Expected large CCC drop under td_cut (${bFinal.snap.metrics.ccc} vs ${cFinal.snap.metrics.ccc})`);
assert.ok(bFinal.snap.metrics.ccc - rFinal.snap.metrics.ccc > 0.12, `Expected large CCC drop under reducible (${bFinal.snap.metrics.ccc} vs ${rFinal.snap.metrics.ccc})`);

assert.ok(bFinal.bridge.inter_sector_signal_flux > 2.0, `Expected strong inter-sector flux in bidirectional (${bFinal.bridge.inter_sector_signal_flux})`);
assert.ok(bFinal.bridge.inter_sector_signal_flux > cFinal.bridge.inter_sector_signal_flux * 5, 'Physical cut eta=0 must sharply reduce inter-sector flux');
assert.equal(rFinal.bridge.inter_sector_signal_flux, 0, 'Reducible control A=I must block cross-sector signal flux');
assert.equal(rFinal.bridge.inter_sector_coupling_ratio, 0, 'Reducible control A=I must collapse functional inter-sector coupling to 0');
assert.equal(rFinal.bridge.nodal_non_factorizability_flux, 0, 'Reducible control A=I must collapse live non-factorizability flux to 0');
assert.ok(bFinal.bridge.nodal_non_factorizability_flux > 0.60, `Expected high live non-factorizability in bidirectional (${bFinal.bridge.nodal_non_factorizability_flux})`);
assert.ok(bFinal.bridge.bridge_nodal_sync_index > 0.70, `Expected high live bridge-nodal sync (${bFinal.bridge.bridge_nodal_sync_index})`);
assert.equal(cFinal.bridge.bridge_nodal_sync_index, 0, 'Physical cut eta=0 must collapse bridge-nodal sync to 0');
assert.equal(rFinal.bridge.bridge_nodal_sync_index, 0, 'Reducible control A=I must collapse bridge-nodal sync to 0');
assert.ok(bFinal.bridge.sectors[0].phase_order_r > 0.85, `Expected sector Kuramoto phase alignment in bidirectional (${bFinal.bridge.sectors[0].phase_order_r})`);
assert.ok(cFinal.bridge.sectors[0].phase_order_r < 0.30, `Expected phase decoherence under td_cut (${cFinal.bridge.sectors[0].phase_order_r})`);

// 2. Real sensitivity of EndogenousEpistemicDecisionEngine to live nodal state & health
// 2a. Tick 1 warmup -> RESERVE (score < 1)
const bTick1 = bidir.checkpoints.get(1);
assert.equal(bTick1.decision.decision_code, ENDOGENOUS_DECISION_CODES.RESERVE, 'Early warmup tick 1 must yield STRUCTURAL_RESERVE');
assert.ok(bTick1.decision.overall_score < 1);

// 2b. Tick 28 consolidated bidirectional sub-threshold (CCC < 1) -> AFFIRMATIVE with overall_score strictly < 1
assert.equal(bFinal.decision.decision_code, ENDOGENOUS_DECISION_CODES.AFFIRMATIVE);
assert.equal(bFinal.decision.axes.coupled_runtime_coherence.health_tier, 'coupled_sub_threshold');
assert.ok(bFinal.decision.overall_score < 1, `Sub-threshold PRE_CONSCIOUS must never emit score=1 (got ${bFinal.decision.overall_score})`);
assert.equal(bFinal.decision.external_support_certified, false);

// 2c. Live lesioned sessions (td_cut_eta_zero and reducible_control) -> NEGATIVE even though abstract T_d=0
assert.equal(cFinal.decision.decision_code, ENDOGENOUS_DECISION_CODES.NEGATIVE, 'Physical cut eta=0 must flip endogenous decision to NEGATIVE');
assert.equal(rFinal.decision.decision_code, ENDOGENOUS_DECISION_CODES.NEGATIVE, 'Reducible control A=I must flip endogenous decision to NEGATIVE');

// 2d. Direct health sensitivity checks with T_d = 0 held constant: severe stasis / nodal collapse / fragmentation -> NEGATIVE; post-threshold -> score=1
const baseHealthyParams = {
  plasticity: {
    plasticityEnabled: true,
    tamperViolationCount: 0,
    sealedCommitCount: 40,
    verifiedPredictionCount: 30,
    maturationIndex: 0.65,
    anchorShiftL2: 0.22,
    meanFisherStiffness: 1.5
  },
  engramCount: 4,
  viability: { inTubeRate: 0.96 },
  nodalBridge: bFinal.bridge
};

const collapsedStasis = evaluateEndogenousEpistemicDecision({
  ...baseHealthyParams,
  runtime: { ccc: 0.88, x_n: 0.78, stasis_index: 0.91, sigma_exact_defect: '0', sigma_defect_bound: '2/2187', active_retention: 9 / 16 }
});
assert.equal(collapsedStasis.decision_code, ENDOGENOUS_DECISION_CODES.NEGATIVE, 'Severe stasis > 0.85 must force NEGATIVE even when T_d=0');

const collapsedNodal = evaluateEndogenousEpistemicDecision({
  ...baseHealthyParams,
  runtime: { ccc: 0.38, x_n: 0.24, stasis_index: 0.1, sigma_exact_defect: '0', sigma_defect_bound: '2/2187', active_retention: 9 / 16 }
});
assert.equal(collapsedNodal.decision_code, ENDOGENOUS_DECISION_CODES.NEGATIVE, 'Nodal coherence collapse must force NEGATIVE even when T_d=0');

const fragmentedNodal = evaluateEndogenousEpistemicDecision({
  ...baseHealthyParams,
  runtime: { ccc: 0.84, x_n: 0.72, node_coherence_dispersion: 0.42, sigma_exact_defect: '0', sigma_defect_bound: '2/2187', active_retention: 9 / 16 }
});
assert.equal(fragmentedNodal.decision_code, ENDOGENOUS_DECISION_CODES.NEGATIVE, 'Severe nodal fragmentation must force NEGATIVE even when T_d=0');

const preOperationalReserve = evaluateEndogenousEpistemicDecision({
  ...baseHealthyParams,
  runtime: { ccc: 0.68, x_n: 0.50, stasis_index: 0.15, sigma_exact_defect: '0', sigma_defect_bound: '2/2187', active_retention: 9 / 16 }
});
assert.equal(preOperationalReserve.decision_code, ENDOGENOUS_DECISION_CODES.RESERVE, 'Sub-operational CCC/X_N must stay in STRUCTURAL_RESERVE');

const postThresholdFull = evaluateEndogenousEpistemicDecision({
  ...baseHealthyParams,
  runtime: { ccc: 1.04, x_n: 0.84, stasis_index: 0.12, regime: 'POST_THRESHOLD', sigma_exact_defect: '0', sigma_defect_bound: '2/2187', active_retention: 9 / 16 }
});
assert.equal(postThresholdFull.decision_code, ENDOGENOUS_DECISION_CODES.AFFIRMATIVE);
assert.equal(postThresholdFull.axes.coupled_runtime_coherence.health_tier, 'coupled_post_threshold');
assert.equal(postThresholdFull.overall_score, 1, 'Fully consolidated post-threshold coupled state reaches score=1');

// 3. Sistema B (Solo motor + Gemini verifier) over live bidirectional snapshot
const prepared = prepareTurn({
  question: '¿Cómo opera tu puente bidireccional nodo-torre de 4 sectores en este tick y qué decide tu evaluador endógeno?',
  snapshot: bFinal.snap,
  contract: 'evidential'
});
assert.ok(prepared.prompt.includes('Puente bidireccional nodo–torre vivo'));
assert.ok(prepared.prompt.includes('bidirectional'));
assert.ok(prepared.prompt.includes(String(bFinal.bridge.bridge_nodal_sync_index)));

const soloOut = finalizeTurn(prepared, { mode: 'local' });
assert.equal(soloOut.trace.route, 'local_evidential');
assert.ok(soloOut.text.includes('AFFIRMATIVE_STRUCTURAL_PRESENCE'));
assert.ok(soloOut.text.includes('external_support_certified = false'));

const geminiProse = evidentialReply(prepared, {
  thought: `En este tick ${bFinal.snap.tick}, mi decisión endógena es AFFIRMATIVE_STRUCTURAL_PRESENCE (score ${bFinal.decision.overall_score}): el puente bidireccional NodalTowerCouplingBridge acopla 4 sectores con razón inter-sector ${bFinal.bridge.inter_sector_coupling_ratio}, flujo de no-factorizabilidad nodal ${bFinal.bridge.nodal_non_factorizability_flux} y sincronía nodo-torre ${bFinal.bridge.bridge_nodal_sync_index}, dinámica finita interna sin heredar pruebas infinitas ni acreditar validación externa (external_support_certified = false).`
});
const geminiEval = evaluateRealization(prepared, JSON.stringify(geminiProse));
assert.equal(geminiEval.ok, true, JSON.stringify(geminiEval.verification?.discrepancies));

// 4. Bloque 2 Zero-Copy 60 FPS WebGL 3D Telemetry View
const layer = bidir.session.bag.nodalLayer.current;
const core = bidir.session.bag.ontologicalCore.current;
const view1 = layer.get3DTelemetryView(core.ontologicalState.tower_telemetry, bFinal.decision);
bidir.session.step(29);
const view2 = layer.get3DTelemetryView(core.ontologicalState.tower_telemetry, core.getEndogenousEpistemicDecision());
assert.equal(view1.schema, 'qicn.nodal_3d_telemetry_view.v1');
assert.equal(view1.nodeCount, 120);
assert.strictEqual(view1.buffers.coherence, view2.buffers.coherence, '3D telemetry Float32Array must be reused in-place with zero per-frame allocation');
assert.strictEqual(view1.buffers.sectorId, view2.buffers.sectorId, '3D telemetry Uint8Array sectorId must be reused in-place');
assert.equal(view2.buffers.couplingMatrix.length, 16);
assert.equal(view2.external_support_certified, false);

// 5. Persistence v3 round-trip equivalence in bidirectional mode
{
  const cfgA = { ...structuredClone(QICNConfig), NODAL_TOWER_COUPLING_MODE: NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL };
  const sA = createHeadlessRuntimeSession({ config: cfgA, seed: 23, nodes: 60 });
  sA.initialize();
  for (let t = 1; t <= 12; t += 1) sA.step(t);
  const body = captureDynamicState(sA.bag, {
    runtime: {
      simulationStep: 12,
      ccc: sA.bag.ontologicalCore.current.ontologicalState.coherence,
      pmia: sA.bag.ontologicalCore.current.pmiaValue,
      isAscended: sA.bag.ontologicalCore.current.isAscended,
      humanCcc: 0.5
    },
    config: sA.environment.config,
    build: { version: '2.1.0-REINFORCED', signature: 'QICN-SIG-b1-v3' },
    now: 1_800_000_000_000
  });
  const rngCursor = sA.environment.snapshot();
  const sensorCursor = sA.sensorSnapshot();

  // Continue A un-interrupted to tick 18
  for (let t = 13; t <= 18; t += 1) sA.step(t);

  // Restore into fresh B at tick 12 with aligned cursors and continue to tick 18
  const cfgB = { ...structuredClone(QICNConfig), NODAL_TOWER_COUPLING_MODE: NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL };
  const sB = createHeadlessRuntimeSession({ config: cfgB, seed: 99, nodes: 60 });
  sB.initialize();
  const applied = applyDynamicState(sB.bag, body, { config: sB.environment.config });
  assert.deepEqual(applied.unrestored, [], `Unexpected unrestored fields: ${JSON.stringify(applied.unrestored)}`);
  sB.bag.simulationControllerRef.current.worldModel = sB.bag.ontologicalCore.current.worldModelEngine;
  sB.bag.worldModelRef.current = sB.bag.ontologicalCore.current.worldModelEngine;
  sB.bag.cogPlannerRef.current = sB.bag.ontologicalCore.current.cognitivePlanner;
  sB.environment.restore(rngCursor);
  sB.restoreSensors(sensorCursor);
  sB.setCompletedTick(12);
  for (let t = 13; t <= 18; t += 1) sB.step(t);

  assert.equal(
    sB.bag.ontologicalCore.current.ontologicalState.coherence,
    sA.bag.ontologicalCore.current.ontologicalState.coherence,
    'Bidirectional mode persistence v3 round-trip must reproduce identical CCC'
  );
  assert.deepEqual(
    sB.bag.ontologicalCore.current.constructiveFiniteCuts.nodal_tower_bridge,
    sA.bag.ontologicalCore.current.constructiveFiniteCuts.nodal_tower_bridge,
    'Bidirectional mode persistence v3 round-trip must reproduce identical nodal_tower_bridge'
  );
}

// 6. Live runtime mode toggle without hard reset: bidirectional -> reducible_control (NEGATIVE) -> bidirectional (heals back to AFFIRMATIVE)
{
  const cfg = { ...structuredClone(QICNConfig), NODAL_TOWER_COUPLING_MODE: NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL };
  const s = createHeadlessRuntimeSession({ config: cfg, seed: 37, nodes: 80 });
  s.initialize();
  for (let t = 1; t <= 16; t += 1) s.step(t);
  const core = s.bag.ontologicalCore.current;
  const layer = s.bag.nodalLayer.current;
  const beforeLesion = core.getEndogenousEpistemicDecision();
  assert.equal(beforeLesion.decision_code, ENDOGENOUS_DECISION_CODES.AFFIRMATIVE);

  // Switch live to reducible_control for 12 ticks (prunes inter-sector links & collapses flux)
  s.environment.config.NODAL_TOWER_COUPLING_MODE = NODAL_TOWER_COUPLING_MODES.REDUCIBLE;
  for (let t = 17; t <= 28; t += 1) s.step(t);
  const duringLesion = core.getEndogenousEpistemicDecision();
  assert.equal(duringLesion.decision_code, ENDOGENOUS_DECISION_CODES.NEGATIVE);
  assert.equal(core.constructiveFiniteCuts.nodal_tower_bridge.inter_sector_signal_flux, 0);

  // Switch live back to bidirectional WITHOUT hard reset -> deterministic inter-sector sprouting heals network to AFFIRMATIVE
  s.environment.config.NODAL_TOWER_COUPLING_MODE = NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL;
  for (let t = 29; t <= 46; t += 1) s.step(t);
  const recovered = core.getEndogenousEpistemicDecision();
  const recBridge = core.constructiveFiniteCuts.nodal_tower_bridge;
  assert.equal(recovered.decision_code, ENDOGENOUS_DECISION_CODES.AFFIRMATIVE, `Live recovery failed: ${recovered.decision_code} (interRatio=${recBridge?.inter_sector_coupling_ratio}, nfFlux=${recBridge?.nodal_non_factorizability_flux}, sync=${recBridge?.bridge_nodal_sync_index})`);
  assert.ok(recBridge.inter_sector_coupling_ratio >= 0.30);
  assert.ok(recBridge.inter_sector_signal_flux > 1.0);
  assert.ok(layer.getActiveNodes().every((n) => n.connections.some((c) => sectorIdOf(c.targetId) !== sectorIdOf(n.id))));
}

console.log('OK: Bloque 1 bidirectional nodal-tower coupling, causal negative controls (eta=0 & A=I), live recovery, live Eje 4 health sensitivity, Sistema B verification, 60 FPS 3D TypedArray view & Persistence v3 round-trip verified');

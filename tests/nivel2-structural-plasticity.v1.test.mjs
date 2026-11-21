// claim_scope: internal_runtime_engineering
// evidence_scope: internal_support_only
// interpretation_boundary: Automated verification of Level 2 structural plasticity & invariant watchdog (S0-S5, H-1 v3 persistence & in-place Revocar equivalence, H-2 module inventory attribution, M-1/M-4 Sistema B integration, M-2 regeneratedNodes vs degreeFloorRewires separation across N=64/120/1500, M-3 structural_plasticity_level1 ablation, M-5 W1/W3/W4 hardening, B0 parity).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { QICNConfig } from '../services/config.js';
import { createHeadlessRuntimeSession } from '../src/runtime/HeadlessRuntimeSession.js';
import { captureDynamicState, applyDynamicState } from '../src/persistence/dynamicState.js';
import { captureSession } from '../src/experiments/workbench/capture.js';
import { restoreWorkbenchCapture } from '../src/experiments/workbench/restore.js';
import { createWorkbenchProtocol } from '../src/experiments/workbench/contracts.js';
import { applyWorkbenchIntervention } from '../src/experiments/workbench/interventions.js';
import { runWorkbench, verifyWorkbenchResult } from '../src/experiments/workbench/runner.js';
import { inputTape } from './lib/workbench-fixtures.mjs';
import {
  KINEMATIC_FREEZE_EPSILON,
  applyStructuralPlasticityLevel2,
  getStructuralPlasticityLevel2Telemetry,
  sanitizeAndRepairPreTickInvariants
} from '../src/simulation/StructuralPlasticityLevel2.js';
import { NODAL_TOWER_COUPLING_MODES } from '../src/simulation/NodalTowerCouplingBridge.js';
import { captureRuntimeSnapshot } from '../src/language/runtimeSnapshot.js';
import { prepareTurn, finalizeTurn } from '../src/language/conversationEngine.js';
import { verifySentenceEvidential } from '../src/language/evidential/factualVerifier.js';
import { parseEvidentialRealization } from '../src/language/evidential/claimGrammar.js';

// 1. Default config stays B0-safe (only 1 boolean flag added, zero new configurable numeric hyperparameters)
// while interactive browser UI promotes Level 2 ('on') by default.
assert.equal(QICNConfig.STRUCTURAL_PLASTICITY_LEVEL2_ENABLED, false, 'B0 default STRUCTURAL_PLASTICITY_LEVEL2_ENABLED must stay false');
assert.equal(KINEMATIC_FREEZE_EPSILON, 1e-9, 'W3 kinematic freeze epsilon must be 1e-9');
{
  const engineSrc = fs.readFileSync(path.join(process.cwd(), 'src/components/SimulationEngine.jsx'), 'utf8');
  assert.match(engineSrc, /STRUCTURAL_PLASTICITY_LEVEL2_KEY\s*=\s*'QICN_STRUCTURAL_PLASTICITY_LEVEL2_ENABLED_V2'/);
  assert.match(engineSrc, /readStoredChoice\(STRUCTURAL_PLASTICITY_LEVEL2_KEY,\s*\['on',\s*'off'\],\s*'on'\)/);
}

async function warmCapture(seed = 11, couplingMode = NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL, nodes = 48, level2 = false) {
  const session = createHeadlessRuntimeSession({
    config: {
      ...QICNConfig,
      KAIZEN_ADJUSTMENT_MODE: 'learned',
      SENSOR_OBSERVER_DYNAMICS_ENABLED: true,
      NODAL_TOWER_COUPLING_MODE: couplingMode,
      STRUCTURAL_PLASTICITY_LEVEL2_ENABLED: level2
    },
    seed,
    nodes,
    profile: 'paired_intervention'
  });
  session.initialize();
  for (let t = 1; t <= 16; t += 1) session.step(t, { evaluationOffset: t });
  return captureSession(session);
}

// 2. [M-2] S0 Healthy Negative Control across N=64, N=120, N=1500:
// strictly regeneratedNodes === 0, migrations === 0, invariantRepairs === 0
{
  for (const [nodeCount, ticks] of [[64, 16], [120, 16], [1500, 6]]) {
    const session = createHeadlessRuntimeSession({
      config: {
        ...QICNConfig,
        KAIZEN_ADJUSTMENT_MODE: 'learned',
        SENSOR_OBSERVER_DYNAMICS_ENABLED: true,
        NODAL_TOWER_COUPLING_MODE: NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL,
        STRUCTURAL_PLASTICITY_LEVEL2_ENABLED: true
      },
      seed: 11,
      nodes: nodeCount,
      profile: 'paired_intervention'
    });
    session.initialize();
    const tape = inputTape(ticks);
    for (let i = 0; i < ticks; i += 1) {
      session.step(i + 1, { evaluationOffset: i + 1, perception: tape[i].perception, entropyValue: tape[i].entropyValue });
    }
    const tel = getStructuralPlasticityLevel2Telemetry(session.bag.nodalLayer.current);
    assert.equal(tel.regeneratedNodes, 0, `S0 healthy run (N=${nodeCount}) triggered false regeneratedNodes: ${JSON.stringify(tel)}`);
    assert.equal(tel.migrations, 0, `S0 healthy run (N=${nodeCount}) triggered spurious migrations: ${JSON.stringify(tel)}`);
    assert.equal(tel.invariantRepairs, 0, `S0 healthy run (N=${nodeCount}) triggered false invariantRepairs: ${JSON.stringify(tel)}`);
    assert.equal(tel.kinematicUnfreezes, 0, `S0 healthy run (N=${nodeCount}) triggered false kinematicUnfreezes: ${JSON.stringify(tel)}`);
  }
}

// 3. [H-1] Persistence v3 equivalence at the verge of W3 firing + in-place Revocar counter cleanup
{
  // 3A: Capture with recentCcc holding (horizon - 1) flat samples (with 1e-12 sub-epsilon drift);
  // restoring into a fresh instance must fire W3 on the next tick and match node0.phase bit-for-bit.
  const cap = await warmCapture(19, NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL, 32, true);
  const { session: orig, source } = await restoreWorkbenchCapture(cap, { profile: 'paired_intervention' });
  const horizon = Number(orig.environment.config.TEMPORAL_HORIZON) || 10;
  const flatCcc = orig.bag.ontologicalCore.current.ontologicalState.coherence;
  orig.bag.nodalLayer.current.level2StructuralState.recentCcc = Array.from(
    { length: horizon - 1 },
    (_, idx) => flatCcc + ((idx % 2) * 1e-12)
  );
  const vergeCap = await captureSession(orig);
  const { session: freshRestored } = await restoreWorkbenchCapture(vergeCap, { profile: 'paired_intervention' });

  assert.equal(
    freshRestored.bag.nodalLayer.current.level2StructuralState.recentCcc.length,
    horizon - 1,
    'H-1 FAIL: fresh restore lost recentCcc window from dynamicState.v3'
  );

  // Feed identical currentCCC within 1e-12 to both original and restored post-tick W3
  const stepTick = source.sourceTick + 1;
  const towerTelOrig = orig.bag.ontologicalCore.current.ontologicalState.tower_telemetry;
  const towerTelRest = freshRestored.bag.ontologicalCore.current.ontologicalState.tower_telemetry;
  const resOrig = applyStructuralPlasticityLevel2({
    nodalLayer: orig.bag.nodalLayer.current,
    towerTelemetry: towerTelOrig,
    couplingMode: NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL,
    config: orig.environment.config,
    currentCCC: flatCcc + 1e-12,
    simulationStep: stepTick
  });
  const resRest = applyStructuralPlasticityLevel2({
    nodalLayer: freshRestored.bag.nodalLayer.current,
    towerTelemetry: towerTelRest,
    couplingMode: NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL,
    config: freshRestored.environment.config,
    currentCCC: flatCcc + 1e-12,
    simulationStep: stepTick
  });
  assert.equal(resOrig.kinematicUnfreeze, true, 'H-1 FAIL: original should trigger W3 on horizonth flat CCC');
  assert.equal(resRest.kinematicUnfreeze, true, 'H-1 FAIL: restored instance failed to trigger W3 on horizonth flat CCC');
  assert.equal(
    freshRestored.bag.nodalLayer.current.nodes[0].phase,
    orig.bag.nodalLayer.current.nodes[0].phase,
    'H-1 FAIL: node0.phase diverged between original and fresh v3 restore after W3 firing'
  );
  assert.deepEqual(
    getStructuralPlasticityLevel2Telemetry(freshRestored.bag.nodalLayer.current),
    getStructuralPlasticityLevel2Telemetry(orig.bag.nodalLayer.current),
    'H-1 FAIL: Level 2 telemetry diverged after fresh v3 restore'
  );

  // 3B: In-place Revocar (applyDynamicState on the SAME nodalLayer.current reference)
  // Save at t=5 with 0 repairs, inject fault at t=6 (>0 repairs), then Revocar to t=5 in-place.
  const revSession = createHeadlessRuntimeSession({
    config: {
      ...QICNConfig,
      KAIZEN_ADJUSTMENT_MODE: 'learned',
      SENSOR_OBSERVER_DYNAMICS_ENABLED: true,
      NODAL_TOWER_COUPLING_MODE: NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL,
      STRUCTURAL_PLASTICITY_LEVEL2_ENABLED: true
    },
    seed: 29,
    nodes: 32,
    profile: 'paired_intervention'
  });
  revSession.initialize();
  const revTape = inputTape(6);
  for (let t = 1; t <= 5; t += 1) {
    revSession.step(t, { evaluationOffset: t, perception: revTape[t - 1].perception, entropyValue: revTape[t - 1].entropyValue });
  }
  const telAtT5 = getStructuralPlasticityLevel2Telemetry(revSession.bag.nodalLayer.current);
  assert.equal(telAtT5.invariantRepairs, 0);
  const savedBodyAtT5 = captureDynamicState(revSession.bag, {
    runtime: revSession.bag.simulationRuntimeRef.current,
    config: revSession.environment.config,
    build: { version: 'test', signature: 'h1' },
    now: revSession.environment.peekClock()
  });
  const sameNodalLayerRef = revSession.bag.nodalLayer.current;

  // Step t=6 with NaN injection
  revSession.environment.controls.faultNanInjection = true;
  revSession.step(6, { evaluationOffset: 6, perception: revTape[5].perception, entropyValue: revTape[5].entropyValue });
  const telAtT6 = getStructuralPlasticityLevel2Telemetry(revSession.bag.nodalLayer.current);
  assert.ok(telAtT6.invariantRepairs > 0, 'fault at t=6 must increment invariantRepairs');

  // Revocar in-place to t=5 on the exact same object reference
  applyDynamicState(revSession.bag, savedBodyAtT5, { config: revSession.environment.config });
  assert.equal(revSession.bag.nodalLayer.current, sameNodalLayerRef, 'applyDynamicState must mutate nodalLayer in place');
  const telAfterRevocar = getStructuralPlasticityLevel2Telemetry(revSession.bag.nodalLayer.current);
  assert.deepEqual(telAfterRevocar, telAtT5, `H-1 FAIL: in-place Revocar kept future t=6 telemetry: ${JSON.stringify(telAfterRevocar)} vs ${JSON.stringify(telAtT5)}`);
}

// 4. S1 Focal 25% Sector-0 Amputation: Level 2 restores all 4 sectors and beats Level 1
{
  const cap = await warmCapture(23);
  const tape = inputTape(24);
  const runS1 = async (level2) => {
    const { session, source } = await restoreWorkbenchCapture(cap, { profile: 'paired_intervention' });
    session.environment.config.STRUCTURAL_PLASTICITY_LEVEL2_ENABLED = level2;
    session.environment.controls.lesionSectorWipe = true;
    for (let i = 0; i < 24; i += 1) {
      session.step(source.sourceTick + i + 1, { evaluationOffset: i + 1, perception: tape[i].perception, entropyValue: tape[i].entropyValue });
    }
    const bridge = session.bag.nodalLayer.current.computeBridgeMetrics(
      session.bag.ontologicalCore.current.ontologicalState.tower_telemetry,
      NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL
    );
    return {
      session,
      populated: bridge.sectors.filter((s) => s.node_count > 0).length,
      secCohMin: bridge.sector_coherence_min,
      nonFact: bridge.nodal_non_factorizability_flux,
      activeCount: session.bag.nodalLayer.current.getActiveNodes().length,
      tel: getStructuralPlasticityLevel2Telemetry(session.bag.nodalLayer.current)
    };
  };
  const r1 = await runS1(false);
  const r2 = await runS1(true);
  assert.equal(r1.populated, 3, 'Level 1 baseline should lose sector 0 permanently');
  assert.equal(r2.populated, 4, 'Level 2 must recover all 4 functional sectors');
  assert.ok(r2.activeCount > r1.activeCount, 'Level 2 must regenerate silenced capacity');
  assert.ok(r2.secCohMin > r1.secCohMin, 'Level 2 must beat Level 1 on minimum sector coherence');
  assert.ok(r2.tel.regeneratedNodes > 0 && r2.tel.migrations > 0);

  // Verify dynamicState.v3 preserves migrated/regenerated node.sectorId bit-for-bit
  const postMigrationCap = await captureSession(r2.session);
  const { session: restored } = await restoreWorkbenchCapture(postMigrationCap, { profile: 'paired_intervention' });
  const beforeSectors = r2.session.bag.nodalLayer.current.nodes.map((n) => n.sectorId);
  const afterSectors = restored.bag.nodalLayer.current.nodes.map((n) => n.sectorId);
  assert.deepEqual(afterSectors, beforeSectors, 'dynamicState.v3 failed to preserve migrated sectorIds');
}

// 5. S2 85% Synaptic Severance Storm: Level 2 rescues true degree-0 orphans (regeneratedNodes > 0)
// and reinforces under-connected nodes (degreeFloorRewires > 0)
{
  const cap = await warmCapture(37);
  const tape = inputTape(20);
  const { session, source } = await restoreWorkbenchCapture(cap, { profile: 'paired_intervention' });
  session.environment.config.STRUCTURAL_PLASTICITY_LEVEL2_ENABLED = true;
  session.environment.controls.lesionSynapticCut = true;
  for (let i = 0; i < 20; i += 1) {
    session.step(source.sourceTick + i + 1, { evaluationOffset: i + 1, perception: tape[i].perception, entropyValue: tape[i].entropyValue });
  }
  const active = session.bag.nodalLayer.current.getActiveNodes();
  const orphans = active.filter((n) => n.connections.length === 0).length;
  const meanDeg = active.reduce((s, n) => s + n.connections.length, 0) / active.length;
  const tel = getStructuralPlasticityLevel2Telemetry(session.bag.nodalLayer.current);
  assert.equal(orphans, 0, 'Level 2 must eliminate all degree-0 orphans');
  assert.ok(meanDeg >= QICNConfig.NODE_CONNECTION_MIN, 'Level 2 must restore healthy mean degree >= NODE_CONNECTION_MIN');
  assert.ok(tel.regeneratedNodes > 0, 'S2 storm must record true degree-0 orphan rescues in regeneratedNodes');
  assert.ok(tel.degreeFloorRewires > 0, 'S2 storm must record 0<deg<3 reinforcements in degreeFloorRewires');
}

// 6. [M-5] S3 & W1 Hardening: NaN/Infinity nodal & config corruption, duplicate edges, dormant targets, and WorldModelEngine.weights NaN
{
  const cap = await warmCapture(41);
  const tape = inputTape(12);
  const { session: s2, source } = await restoreWorkbenchCapture(cap, { profile: 'paired_intervention' });
  s2.environment.config.STRUCTURAL_PLASTICITY_LEVEL2_ENABLED = true;
  s2.environment.controls.faultNanInjection = true;

  // Also inject duplicate targetId, dormant targetId, and WorldModelEngine weight NaN
  const n0 = s2.bag.nodalLayer.current.nodes[0];
  const n1 = s2.bag.nodalLayer.current.nodes[1];
  const dormantId = 5;
  s2.bag.nodalLayer.current.activeNodeIds.delete(dormantId);
  n0.connections.push({ targetId: n1.id, weight: 0.6 }, { targetId: n1.id, weight: 0.7 }, { targetId: dormantId, weight: 0.8 });
  const expectedAnchorCcc = s2.bag.worldModelRef.current.plasticityState.consolidatedWeights.ccc.ccc;
  s2.bag.worldModelRef.current.weights.ccc = Number.NaN;
  s2.bag.worldModelRef.current.multiWeights.ccc.ccc = Number.POSITIVE_INFINITY;

  for (let i = 0; i < 12; i += 1) {
    s2.step(source.sourceTick + i + 1, { evaluationOffset: i + 1, perception: tape[i].perception, entropyValue: tape[i].entropyValue });
    assert.ok(Number.isFinite(s2.bag.ontologicalCore.current.ontologicalState.coherence), `Level 2 produced non-finite CCC on tick ${i + 1}`);
    assert.ok(Number.isFinite(s2.bag.ontologicalCore.current.pmiaValue), `Level 2 produced non-finite PMIA on tick ${i + 1}`);
  }
  const tel = getStructuralPlasticityLevel2Telemetry(s2.bag.nodalLayer.current);
  assert.ok(tel.invariantRepairs > 0 && tel.configRepairs >= 2 && tel.worldModelRepairs >= 2, `Watchdog W1/W4 should record node, config and worldModel repairs: ${JSON.stringify(tel)}`);
  assert.ok(Number.isFinite(s2.bag.worldModelRef.current.weights.ccc), 'W1 failed to repair NaN in WorldModelEngine.weights.ccc');
  assert.ok(Number.isFinite(s2.bag.worldModelRef.current.multiWeights.ccc.ccc), 'W1 failed to repair Infinity in WorldModelEngine.multiWeights');
  assert.ok(Math.abs(s2.bag.worldModelRef.current.weights.ccc - expectedAnchorCcc) < 0.25, 'W1 should restore WorldModelEngine weight from consolidated EWC anchor');

  // Verify duplicate edges and dormant targets were pruned on n0
  const n0Targets = n0.connections.map((c) => c.targetId);
  assert.equal(new Set(n0Targets).size, n0Targets.length, 'W1 failed to deduplicate repeated targetId on node');
  for (const actNode of s2.bag.nodalLayer.current.getActiveNodes()) {
    for (const c of actNode.connections) {
      assert.ok(s2.bag.nodalLayer.current.activeNodeIds.has(c.targetId), `W1 left dangling edge to dormant node ${c.targetId}`);
    }
  }

  // Negative comparison: Level 1 without Watchdog poisons CCC with NaN
  const { session: s1 } = await restoreWorkbenchCapture(cap, { profile: 'paired_intervention' });
  s1.environment.config.STRUCTURAL_PLASTICITY_LEVEL2_ENABLED = false;
  s1.environment.controls.faultNanInjection = true;
  let n1Poisoned = false;
  try {
    s1.step(source.sourceTick + 1, { evaluationOffset: 1, perception: tape[0].perception, entropyValue: tape[0].entropyValue });
    if (!Number.isFinite(s1.bag.ontologicalCore.current.ontologicalState.coherence)) n1Poisoned = true;
  } catch {
    n1Poisoned = true;
  }
  assert.equal(n1Poisoned, true, 'expected Level 1 without Watchdog to be poisoned by NaN/Infinity fault');
}

// 7. [M-5 & B-1] S4 Sustained Kinematic Freeze with sub-epsilon 1e-12 perturbation:
// Watchdog W3 detects dispersion <= 1e-9 collapse and beats Level 1 on inTubeRate and objectiveScore
{
  const cap = await warmCapture(53);
  const tape = inputTape(16);
  const runS4 = async (level2) => {
    const { session, source } = await restoreWorkbenchCapture(cap, { profile: 'paired_intervention' });
    session.environment.config.STRUCTURAL_PLASTICITY_LEVEL2_ENABLED = level2;
    session.environment.controls.faultKinematicFreeze = true;
    const inTube = [];
    const scores = [];
    for (let i = 0; i < 16; i += 1) {
      session.step(source.sourceTick + i + 1, { evaluationOffset: i + 1, perception: tape[i].perception, entropyValue: tape[i].entropyValue });
      const vs = session.bag.kaizenEngine.current.viabilityPolicyState.viabilityStats;
      inTube.push(vs.lastInTube ? 1 : 0);
      scores.push(vs.lastObjectiveScore);
    }
    return {
      session,
      meanInTube: inTube.reduce((a, b) => a + b, 0) / inTube.length,
      meanScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      tel: getStructuralPlasticityLevel2Telemetry(session.bag.nodalLayer.current)
    };
  };
  const r1 = await runS4(false);
  const r2 = await runS4(true);
  assert.ok(r2.tel.kinematicUnfreezes >= 12, `Watchdog W3 must detect 1e-12 sub-epsilon freeze across all 12 ticks: ${JSON.stringify(r2.tel)}`);
  assert.ok(r2.meanInTube > r1.meanInTube, `Level 2 must beat Level 1 on inTubeRate during sustained freeze (${r2.meanInTube} vs ${r1.meanInTube})`);
  assert.ok(r2.meanScore > r1.meanScore, `Level 2 must beat Level 1 on meanObjectiveScore during sustained freeze (${r2.meanScore} vs ${r1.meanScore})`);
}

// 8. [M-5] S5 Negative Control Honesty: reducible_control (A=I) and td_cut_eta_zero (eta=0) are NEVER violated
// and attach zero level2StructuralState to nodalLayer on finite trajectories
{
  for (const mode of [NODAL_TOWER_COUPLING_MODES.REDUCIBLE, NODAL_TOWER_COUPLING_MODES.TD_CUT]) {
    const cap = await warmCapture(11, mode);
    const tape = inputTape(10);
    const { session, source } = await restoreWorkbenchCapture(cap, { profile: 'paired_intervention' });
    session.environment.config.STRUCTURAL_PLASTICITY_LEVEL2_ENABLED = true;
    for (let i = 0; i < 10; i += 1) {
      session.step(source.sourceTick + i + 1, { evaluationOffset: i + 1, perception: tape[i].perception, entropyValue: tape[i].entropyValue });
    }
    const bridge = session.bag.nodalLayer.current.computeBridgeMetrics(
      session.bag.ontologicalCore.current.ontologicalState.tower_telemetry,
      mode
    );
    if (mode === NODAL_TOWER_COUPLING_MODES.REDUCIBLE) {
      assert.equal(bridge.cross_sector_flux_share, 0, 'S5 FAIL: Level 2 violated reducible_control A=I');
    } else {
      assert.equal(bridge.effective_eta, '0', 'S5 FAIL: Level 2 violated td_cut_eta_zero');
    }
    assert.equal('level2StructuralState' in session.bag.nodalLayer.current, false, `S5 FAIL: Level 2 attached level2StructuralState under finite negative control ${mode}`);
    const tel = getStructuralPlasticityLevel2Telemetry(session.bag.nodalLayer.current);
    assert.equal(tel.migrations, 0, `S5 FAIL: Level 2 migrated sectors under ${mode}`);
    assert.equal(tel.regeneratedNodes, 0, `S5 FAIL: Level 2 regenerated nodes under ${mode}`);
    assert.equal(tel.degreeFloorRewires, 0, `S5 FAIL: Level 2 rewired nodes under ${mode}`);
  }
}

// 9. [M-3] Workbench integration under fa48f74 live UI defaults (Level 2 ON by default):
// structural_plasticity_level1 negative control + lesion pairs conserve t=0 physical digest and verify SHA-256
{
  const capDefaultL2 = await warmCapture(11, NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL, 24, true);
  for (const intervention of [
    'structural_plasticity_level1',
    'structural_plasticity_level2',
    'lesion_sector_wipe',
    'lesion_sector_wipe_level2',
    'lesion_synaptic_cut',
    'lesion_synaptic_cut_level2',
    'fault_nan_injection_level2'
  ]) {
    const { session } = await restoreWorkbenchCapture(capDefaultL2, { profile: 'paired_intervention' });
    const eff = applyWorkbenchIntervention(session, intervention);
    assert.equal(eff.physicalDigestBefore, eff.physicalDigestAfter, `M-3 FAIL: ${intervention} altered physical state at t=0`);
  }

  const protocol = createWorkbenchProtocol({
    profile: 'paired_intervention',
    ticks: 6,
    inputTape: inputTape(6),
    branches: [
      { id: 'baseline', intervention: 'sham' },
      { id: 'level1_ablation', intervention: 'structural_plasticity_level1' },
      { id: 'level2_match', intervention: 'structural_plasticity_level2' },
      { id: 'lesion_n1', intervention: 'lesion_sector_wipe' },
      { id: 'lesion_n2', intervention: 'lesion_sector_wipe_level2' },
      { id: 'nan_n2', intervention: 'fault_nan_injection_level2' }
    ]
  });
  const result = await runWorkbench(capDefaultL2, protocol);
  assert.equal(verifyWorkbenchResult(result, capDefaultL2, protocol), true);
  assert.equal(result.external_support_certified, false);

  const byBranch = Object.fromEntries(result.branches.map((b) => [b.id, b]));
  const topoN1 = byBranch.lesion_n1.trajectory.at(-1).topology;
  const topoN2 = byBranch.lesion_n2.trajectory.at(-1).topology;
  assert.equal(topoN1.populatedSectors, 3, 'M-3 FAIL: lesion_sector_wipe terminal topology should have 3/4 sectors');
  assert.equal(topoN2.populatedSectors, 4, 'M-3 FAIL: lesion_sector_wipe_level2 terminal topology must recover 4/4 sectors');
  assert.ok(topoN2.activeNodes > topoN1.activeNodes, 'M-3 FAIL: lesion_sector_wipe_level2 must recover activeNodes');
}

// 10. [H-2, M-1, M-4, B-3] Module inventory check, Sistema B Level 2 + Kaizen 5/6 vs 6/6 context, and C2 JSON extraction
{
  const invCheck = spawnSync(process.execPath, ['scripts/build-module-inventory.mjs', '--check'], {
    encoding: 'utf8',
    windowsHide: true
  });
  assert.equal(invCheck.status, 0, `H-2 FAIL: moduleInventory.generated.js is stale: ${invCheck.stderr || invCheck.stdout}`);

  const sumCheck = spawnSync(process.execPath, ['scripts/build-framework-summary.mjs', '--check'], {
    encoding: 'utf8',
    windowsHide: true
  });
  assert.equal(sumCheck.status, 0, `frameworkSummary.generated.js is stale: ${sumCheck.stderr || sumCheck.stdout}`);

  const cap = await warmCapture(11, NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL, 24, true);
  const { session } = await restoreWorkbenchCapture(cap, { profile: 'paired_intervention' });
  const snap = captureRuntimeSnapshot(session.bag.ontologicalCore.current, {
    tick: session.completedTick,
    now: 1800000000000,
    nodes: session.bag.nodalLayer.current.nodes,
    config: session.environment.config
  });

  // [M-4] Kaizen learned + sensorObserverDynamicsEnabled=false -> 5/6 excluyendo PLASTICITY_DECAY
  const prep5of6 = prepareTurn({
    question: '¿Cómo operan Kaizen y la plasticidad estructural Nivel 2?',
    snapshot: snap,
    contract: 'evidential',
    kaizenEffective: true,
    sensorObserverDynamicsEnabled: false,
    level2Telemetry: {
      enabled: true,
      migrations: 4,
      regeneratedNodes: 9,
      degreeFloorRewires: 2,
      invariantRepairs: 1,
      configRepairs: 0,
      worldModelRepairs: 0,
      kinematicUnfreezes: 1
    }
  });
  assert.ok(
    prep5of6.proseContext.freeCtx.packetText.includes('claves 5/6 excluyendo PLASTICITY_DECAY'),
    'M-4 FAIL: expected 5/6 excluyendo PLASTICITY_DECAY when sensorObserverDynamicsEnabled=false'
  );
  assert.ok(
    !prep5of6.proseContext.freeCtx.packetText.includes('claves 6/6 incluyendo PLASTICITY_DECAY'),
    'M-4 FAIL: must not inject 6/6 incluyendo PLASTICITY_DECAY when sensorObserverDynamicsEnabled=false'
  );

  // [M-4] Kaizen learned + sensorObserverDynamicsEnabled=true -> 6/6 incluyendo PLASTICITY_DECAY
  const prep6of6 = prepareTurn({
    question: '¿Cómo operan Kaizen y la plasticidad estructural Nivel 2?',
    snapshot: snap,
    contract: 'evidential',
    kaizenEffective: true,
    sensorObserverDynamicsEnabled: true,
    level2Telemetry: {
      enabled: true,
      migrations: 4,
      regeneratedNodes: 9,
      degreeFloorRewires: 2,
      invariantRepairs: 1,
      configRepairs: 0,
      worldModelRepairs: 0,
      kinematicUnfreezes: 1
    }
  });
  assert.ok(
    prep6of6.proseContext.freeCtx.packetText.includes('claves 6/6 incluyendo PLASTICITY_DECAY'),
    'M-4 FAIL: expected 6/6 incluyendo PLASTICITY_DECAY when sensorObserverDynamicsEnabled=true'
  );

  // [M-1] Solo motor outputs Level 2 telemetry summary when provided
  const localTurn = finalizeTurn(prep6of6, { mode: 'local' });
  assert.match(localTurn.text, /StructuralPlasticityLevel2.*Nivel 2 activo.*migraciones de sector = 4.*regenerados.*= 9.*recableados de piso.*= 2/);

  // [H-2 & M-1] verifySentenceEvidential accepts StructuralPlasticityLevel2 and SensorObserverDynamicsBridge + live numbers,
  // and rejects FakeNonExistentBridge with unknown_module
  const validSent = verifySentenceEvidential(
    'En este tick StructuralPlasticityLevel2 y SensorObserverDynamicsBridge operan internamente con 4 migraciones de sector, 9 nodos regenerados y 2 recableados de piso sin certificar validación externa (external_support_certified = false).',
    prep6of6.proseContext
  );
  assert.equal(validSent.ok, true, `H-2/M-1 FAIL: valid sentence rejected: ${JSON.stringify(validSent.reasons)}`);

  const fakeModSent = verifySentenceEvidential(
    'El módulo FakeNonExistentBridge regula la red nodal en este tick.',
    prep6of6.proseContext
  );
  assert.equal(fakeModSent.ok, false, 'H-2 FAIL: FakeNonExistentBridge should be rejected');
  assert.ok(fakeModSent.reasons.some((r) => r.reason === 'unknown_module'), `H-2 FAIL: expected unknown_module, got ${JSON.stringify(fakeModSent.reasons)}`);

  // [B-3] parseEvidentialRealization extracts JSON object when auxiliary C2 text wraps it, but enforces strict schema/keys
  const wrappedC2Json = `Aquí está la salida JSON solicitada:\n{"schema":"qicn.language_realization.v5","snapshot":{"digest":"${snap.digest}","tick":${snap.tick}},"answer":"Opero en el tick ${snap.tick} con soporte interno únicamente."}\nFin de respuesta.`;
  const parsedWrapped = parseEvidentialRealization(wrappedC2Json);
  assert.equal(parsedWrapped.snapshot.digest, snap.digest);
  assert.equal(parsedWrapped.snapshot.tick, snap.tick);
  assert.throws(
    () => parseEvidentialRealization(`Prefacio {"schema":"qicn.language_realization.v5","snapshot":{"digest":"${snap.digest}","tick":${snap.tick}},"answer":"ok","extraKey":1}`),
    /v5_invalid_fields/
  );
}

console.log('OK: nivel2-structural-plasticity.v1 passed (H-1, H-2, M-1..M-5, B-1..B-3, S0-S5 across N=64/120/1500, dynamicState.v3 + Revocar, Sistema B, Workbench)');

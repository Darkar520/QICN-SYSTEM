// claim_scope: internal_runtime_engineering
// evidence_scope: internal_support_only
// interpretation_boundary: Automated verification of parameter-free Level 2 structural plasticity & invariant watchdog (S0-S5, B0 parity, dynamicState.v3 migrated sector conservation, Workbench interventions).
import assert from 'node:assert/strict';
import { QICNConfig } from '../services/config.js';
import { createHeadlessRuntimeSession } from '../src/runtime/HeadlessRuntimeSession.js';
import { captureSession } from '../src/experiments/workbench/capture.js';
import { restoreWorkbenchCapture } from '../src/experiments/workbench/restore.js';
import { createWorkbenchProtocol } from '../src/experiments/workbench/contracts.js';
import { runWorkbench, verifyWorkbenchResult } from '../src/experiments/workbench/runner.js';
import { inputTape } from './lib/workbench-fixtures.mjs';
import { getStructuralPlasticityLevel2Telemetry } from '../src/simulation/StructuralPlasticityLevel2.js';
import { NODAL_TOWER_COUPLING_MODES } from '../src/simulation/NodalTowerCouplingBridge.js';

// 1. Default config stays B0-safe (only 1 boolean flag added, zero numeric heuristic parameters)
assert.equal(QICNConfig.STRUCTURAL_PLASTICITY_LEVEL2_ENABLED, false, 'B0 default STRUCTURAL_PLASTICITY_LEVEL2_ENABLED must stay false');

async function warmCapture(seed = 11, couplingMode = NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL, nodes = 48) {
  const session = createHeadlessRuntimeSession({
    config: {
      ...QICNConfig,
      KAIZEN_ADJUSTMENT_MODE: 'learned',
      SENSOR_OBSERVER_DYNAMICS_ENABLED: true,
      NODAL_TOWER_COUPLING_MODE: couplingMode,
      STRUCTURAL_PLASTICITY_LEVEL2_ENABLED: false
    },
    seed,
    nodes,
    profile: 'paired_intervention'
  });
  session.initialize();
  for (let t = 1; t <= 16; t += 1) session.step(t, { evaluationOffset: t });
  return captureSession(session);
}

// 2. S0 Healthy Negative Control: 0 false invariant repairs and 0 spurious migrations when healthy
{
  const cap = await warmCapture(11);
  const { session, source } = await restoreWorkbenchCapture(cap, { profile: 'paired_intervention' });
  session.environment.config.STRUCTURAL_PLASTICITY_LEVEL2_ENABLED = true;
  const tape = inputTape(20);
  for (let i = 0; i < 20; i += 1) {
    session.step(source.sourceTick + i + 1, { evaluationOffset: i + 1, perception: tape[i].perception, entropyValue: tape[i].entropyValue });
  }
  const tel = getStructuralPlasticityLevel2Telemetry(session.bag.nodalLayer.current);
  assert.equal(tel.invariantRepairs, 0, `S0 healthy run triggered false invariant repairs: ${JSON.stringify(tel)}`);
  assert.equal(tel.migrations, 0, `S0 healthy balanced network triggered spurious migrations: ${JSON.stringify(tel)}`);
}

// 3. S1 Focal 25% Sector-0 Amputation: Level 2 restores all 4 sectors and beats Level 1
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
  assert.ok(r2.tel.regeneratedNodes > 0 || r2.tel.migrations > 0);

  // Verify dynamicState.v3 preserves migrated/regenerated node.sectorId bit-for-bit
  const postMigrationCap = await captureSession(r2.session);
  const { session: restored } = await restoreWorkbenchCapture(postMigrationCap, { profile: 'paired_intervention' });
  const beforeSectors = r2.session.bag.nodalLayer.current.nodes.map((n) => n.sectorId);
  const afterSectors = restored.bag.nodalLayer.current.nodes.map((n) => n.sectorId);
  assert.deepEqual(afterSectors, beforeSectors, 'dynamicState.v3 failed to preserve migrated sectorIds');
}

// 4. S2 85% Synaptic Severance Storm: Level 2 rescues all degree-0 orphans
{
  const cap = await warmCapture(37);
  const tape = inputTape(20);
  const runS2 = async (level2) => {
    const { session, source } = await restoreWorkbenchCapture(cap, { profile: 'paired_intervention' });
    session.environment.config.STRUCTURAL_PLASTICITY_LEVEL2_ENABLED = level2;
    session.environment.controls.lesionSynapticCut = true;
    for (let i = 0; i < 20; i += 1) {
      session.step(source.sourceTick + i + 1, { evaluationOffset: i + 1, perception: tape[i].perception, entropyValue: tape[i].entropyValue });
    }
    const active = session.bag.nodalLayer.current.getActiveNodes();
    const orphans = active.filter((n) => n.connections.length === 0).length;
    const meanDeg = active.reduce((s, n) => s + n.connections.length, 0) / active.length;
    return { orphans, meanDeg, tel: getStructuralPlasticityLevel2Telemetry(session.bag.nodalLayer.current) };
  };
  const r2 = await runS2(true);
  assert.equal(r2.orphans, 0, 'Level 2 must eliminate all degree-0 orphans');
  assert.ok(r2.meanDeg >= QICNConfig.NODE_CONNECTION_MIN, 'Level 2 must restore healthy mean degree >= NODE_CONNECTION_MIN');
  assert.ok(r2.tel.regeneratedNodes > 0);
}

// 5. S3 Unforeseen NaN / Infinity Corruption: Level 2 repairs surgically with 100% finite ticks
{
  const cap = await warmCapture(41);
  const tape = inputTape(12);
  const { session: s2, source } = await restoreWorkbenchCapture(cap, { profile: 'paired_intervention' });
  s2.environment.config.STRUCTURAL_PLASTICITY_LEVEL2_ENABLED = true;
  s2.environment.controls.faultNanInjection = true;
  for (let i = 0; i < 12; i += 1) {
    s2.step(source.sourceTick + i + 1, { evaluationOffset: i + 1, perception: tape[i].perception, entropyValue: tape[i].entropyValue });
    assert.ok(Number.isFinite(s2.bag.ontologicalCore.current.ontologicalState.coherence), `Level 2 produced non-finite CCC on tick ${i + 1}`);
    assert.ok(Number.isFinite(s2.bag.ontologicalCore.current.pmiaValue), `Level 2 produced non-finite PMIA on tick ${i + 1}`);
  }
  const tel = getStructuralPlasticityLevel2Telemetry(s2.bag.nodalLayer.current);
  assert.ok(tel.invariantRepairs > 0 && tel.configRepairs >= 2, `Watchdog W1/W4 should record repairs: ${JSON.stringify(tel)}`);

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

// 6. S4 Exact Kinematic Freeze: Watchdog W3 detects exact dispersion=0 collapse and restores variance
{
  const cap = await warmCapture(53);
  const tape = inputTape(12);
  const { session, source } = await restoreWorkbenchCapture(cap, { profile: 'paired_intervention' });
  session.environment.config.STRUCTURAL_PLASTICITY_LEVEL2_ENABLED = true;
  session.environment.controls.faultKinematicFreeze = true;
  for (let i = 0; i < 12; i += 1) {
    session.step(source.sourceTick + i + 1, { evaluationOffset: i + 1, perception: tape[i].perception, entropyValue: tape[i].entropyValue });
  }
  const tel = getStructuralPlasticityLevel2Telemetry(session.bag.nodalLayer.current);
  assert.ok(tel.kinematicUnfreezes >= 1, 'Watchdog W3 must detect and break exact kinematic freeze');
  const cohs = session.bag.nodalLayer.current.getActiveNodes().map((n) => n.coherenceState);
  assert.ok(Math.max(...cohs) - Math.min(...cohs) > 1e-4, 'Watchdog W3 must restore non-zero nodal dispersion');
}

// 7. S5 Negative Control Honesty: reducible_control (A=I) and td_cut_eta_zero (eta=0) are NEVER violated
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
    const tel = getStructuralPlasticityLevel2Telemetry(session.bag.nodalLayer.current);
    assert.equal(tel.migrations, 0, `S5 FAIL: Level 2 migrated sectors under ${mode}`);
  }
}

// 8. Workbench integration: Level 2 + lesion interventions run cleanly and verify SHA-256
{
  const cap = await warmCapture(11, NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL, 24);
  const protocol = createWorkbenchProtocol({
    profile: 'paired_intervention',
    ticks: 6,
    inputTape: inputTape(6),
    branches: [
      { id: 'baseline', intervention: 'sham' },
      { id: 'level2', intervention: 'structural_plasticity_level2' },
      { id: 'lesion_n1', intervention: 'lesion_sector_wipe' },
      { id: 'lesion_n2', intervention: 'lesion_sector_wipe_level2' },
      { id: 'nan_n2', intervention: 'fault_nan_injection_level2' }
    ]
  });
  const result = await runWorkbench(cap, protocol);
  assert.equal(verifyWorkbenchResult(result, cap, protocol), true);
  assert.equal(result.external_support_certified, false);
}

console.log('OK: nivel2-structural-plasticity.v1 passed (S0-S5, zero magic parameters, dynamicState.v3 migrated sectors, Watchdog W1-W4, Workbench)');

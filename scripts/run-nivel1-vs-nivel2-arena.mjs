// claim_scope: isolated_internal_engineering
// evidence_scope: internal_support_only
// interpretation_boundary: Paired 5-seed head-to-head benchmark comparing Level 1 vs Level 2 structural plasticity & invariant watchdog across 6 preregistered scenarios (S0-S5). Internal support only; external_support_certified = false.
import { QICNConfig } from '../services/config.js';
import { createHeadlessRuntimeSession } from '../src/runtime/HeadlessRuntimeSession.js';
import { captureSession } from '../src/experiments/workbench/capture.js';
import { restoreWorkbenchCapture } from '../src/experiments/workbench/restore.js';
import { createSyntheticInputTape } from '../src/experiments/workbench/inputTape.js';
import { getStructuralPlasticityLevel2Telemetry } from '../src/simulation/StructuralPlasticityLevel2.js';
import { NODAL_TOWER_COUPLING_MODES } from '../src/simulation/NodalTowerCouplingBridge.js';
import { sha256Hex, stableStringify } from '../src/utils/integrity.js';

const SEEDS = [11, 23, 37, 41, 53];
const NODES = 120;
const WARMUP_TICKS = 30;
const EVAL_TICKS = 60;

const round6 = (v) => (Number.isFinite(Number(v)) ? Number(Number(v).toFixed(6)) : null);
const mean = (arr) => {
  const finite = arr.filter((v) => Number.isFinite(v));
  return finite.length ? finite.reduce((a, b) => a + b, 0) / finite.length : 0;
};

async function buildWarmCapture(seed, couplingMode = NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL) {
  const session = createHeadlessRuntimeSession({
    config: {
      ...QICNConfig,
      KAIZEN_ADJUSTMENT_MODE: 'learned',
      SENSOR_OBSERVER_DYNAMICS_ENABLED: true,
      NODAL_TOWER_COUPLING_MODE: couplingMode,
      STRUCTURAL_PLASTICITY_LEVEL2_ENABLED: false
    },
    seed,
    nodes: NODES,
    profile: 'paired_intervention'
  });
  session.initialize();
  for (let t = 1; t <= WARMUP_TICKS; t += 1) {
    session.step(t, { evaluationOffset: t });
  }
  return captureSession(session, { build: { version: 'arena.v1', signature: 'nivel1_vs_nivel2' } });
}

async function runArm(capture, { seed, level2, scenarioId, couplingMode = NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL }) {
  const { session, source } = await restoreWorkbenchCapture(capture, {
    profile: 'paired_intervention',
    expectedBuild: capture.sourceBuild
  });
  session.environment.config.NODAL_TOWER_COUPLING_MODE = couplingMode;
  session.environment.config.STRUCTURAL_PLASTICITY_LEVEL2_ENABLED = Boolean(level2);
  session.environment.config.KAIZEN_ADJUSTMENT_MODE = 'learned';
  session.environment.config.SENSOR_OBSERVER_DYNAMICS_ENABLED = true;

  if (scenarioId === 'S1_sector_amputation') session.environment.controls.lesionSectorWipe = true;
  if (scenarioId === 'S2_synaptic_storm') session.environment.controls.lesionSynapticCut = true;
  if (scenarioId === 'S3_nan_corruption') session.environment.controls.faultNanInjection = true;
  if (scenarioId === 'S4_kinematic_freeze') session.environment.controls.faultKinematicFreeze = true;

  const tape = createSyntheticInputTape(EVAL_TICKS, seed);
  let finiteTicks = 0;
  let crashed = false;
  let recoveryTick4Sectors = null;
  let recoveryTickZeroOrphans = null;
  let recoveryTickDispersion = null;
  const inTubeSeries = [];
  const objSeries = [];
  const stasisSeries = [];
  const syncSeries = [];
  const nonFactSeries = [];
  const secMinSeries = [];
  const crossFluxSeries = [];
  const orphanSeries = [];
  const degreeSeries = [];

  for (let i = 0; i < EVAL_TICKS; i += 1) {
    const input = tape[i];
    try {
      session.step(source.sourceTick + i + 1, {
        evaluationOffset: i + 1,
        perception: input.perception,
        entropyValue: input.entropyValue
      });
    } catch {
      crashed = true;
      break;
    }

    const core = session.bag.ontologicalCore.current;
    const ccc = core.ontologicalState.coherence;
    const pmia = core.pmiaValue;
    const activeNodes = session.bag.nodalLayer.current.getActiveNodes();
    const allFinite = Number.isFinite(ccc)
      && Number.isFinite(pmia)
      && activeNodes.every((n) => Number.isFinite(n.coherenceState) && Number.isFinite(n.energy));
    if (allFinite) finiteTicks += 1;

    const towerTel = core.ontologicalState.tower_telemetry || null;
    const bridge = session.bag.nodalLayer.current.computeBridgeMetrics(towerTel, couplingMode);
    const populatedSectors = (bridge?.sectors || []).filter((s) => s.node_count > 0).length;
    const orphans = activeNodes.filter((n) => !Array.isArray(n.connections) || n.connections.length === 0).length;
    const cohVals = activeNodes.map((n) => n.coherenceState).filter(Number.isFinite);
    const dispersion = cohVals.length ? (Math.max(...cohVals) - Math.min(...cohVals)) : 0;

    if (recoveryTick4Sectors === null && populatedSectors === 4 && i >= 1) recoveryTick4Sectors = i + 1;
    if (recoveryTickZeroOrphans === null && orphans === 0 && i >= 1) recoveryTickZeroOrphans = i + 1;
    if (recoveryTickDispersion === null && dispersion > 1e-4) recoveryTickDispersion = i + 1;

    const viab = session.bag.kaizenEngine.current.viabilityPolicyState.viabilityStats;
    const health = core.getDynamicHealth();
    inTubeSeries.push(viab.lastInTube ? 1 : 0);
    objSeries.push(Number.isFinite(viab.lastObjectiveScore) ? viab.lastObjectiveScore : 0);
    stasisSeries.push(Number.isFinite(health?.stasisIndex) ? health.stasisIndex : 1);
    syncSeries.push(Number.isFinite(bridge?.bridge_nodal_sync_index) ? bridge.bridge_nodal_sync_index : 0);
    nonFactSeries.push(Number.isFinite(bridge?.nodal_non_factorizability_flux) ? bridge.nodal_non_factorizability_flux : 0);
    secMinSeries.push(Number.isFinite(bridge?.sector_coherence_min) ? bridge.sector_coherence_min : 0);
    crossFluxSeries.push(Number.isFinite(bridge?.cross_sector_flux_share) ? bridge.cross_sector_flux_share : 0);
    orphanSeries.push(orphans);
    degreeSeries.push(Number.isFinite(bridge?.mean_degree) ? bridge.mean_degree : 0);
  }

  const finalNodes = session.bag.nodalLayer.current.getActiveNodes();
  const finalBridge = session.bag.nodalLayer.current.computeBridgeMetrics(
    session.bag.ontologicalCore.current.ontologicalState.tower_telemetry || null,
    couplingMode
  );
  const l2 = getStructuralPlasticityLevel2Telemetry(session.bag.nodalLayer.current);

  return {
    crashed,
    finiteTickRate: round6(finiteTicks / EVAL_TICKS),
    finalActiveNodes: finalNodes.length,
    finalPopulatedSectors: (finalBridge?.sectors || []).filter((s) => s.node_count > 0).length,
    finalOrphans: orphanSeries.at(-1) ?? 0,
    meanOrphans: round6(mean(orphanSeries)),
    finalMeanDegree: round6(finalBridge?.mean_degree ?? 0),
    meanInTubeRate: round6(mean(inTubeSeries)),
    meanObjectiveScore: round6(mean(objSeries)),
    meanStasisIndex: round6(mean(stasisSeries)),
    meanBridgeSync: round6(mean(syncSeries)),
    meanNonFactorizability: round6(mean(nonFactSeries)),
    meanSectorCoherenceMin: round6(mean(secMinSeries)),
    finalCrossSectorFluxShare: round6(finalBridge?.cross_sector_flux_share ?? 0),
    finalEffectiveEta: String(finalBridge?.effective_eta ?? '0'),
    recoveryTick4Sectors,
    recoveryTickZeroOrphans,
    recoveryTickDispersion,
    l2Telemetry: l2
  };
}

export async function runNivel1VsNivel2Arena() {
  const scenarios = [
    { id: 'S0_healthy_control', couplingMode: NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL },
    { id: 'S1_sector_amputation', couplingMode: NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL },
    { id: 'S2_synaptic_storm', couplingMode: NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL },
    { id: 'S3_nan_corruption', couplingMode: NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL },
    { id: 'S4_kinematic_freeze', couplingMode: NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL },
    { id: 'S5a_negative_reducible_A_eq_I', couplingMode: NODAL_TOWER_COUPLING_MODES.REDUCIBLE },
    { id: 'S5b_negative_td_cut_eta_zero', couplingMode: NODAL_TOWER_COUPLING_MODES.TD_CUT }
  ];

  const results = {};
  for (const sc of scenarios) {
    const perSeed = [];
    for (const seed of SEEDS) {
      const cap = await buildWarmCapture(seed, sc.couplingMode);
      const n1 = await runArm(cap, { seed, level2: false, scenarioId: sc.id, couplingMode: sc.couplingMode });
      const n2 = await runArm(cap, { seed, level2: true, scenarioId: sc.id, couplingMode: sc.couplingMode });
      perSeed.push({ seed, nivel1: n1, nivel2: n2 });
    }
    const agg = (side, key) => round6(mean(perSeed.map((r) => r[side][key])));
    results[sc.id] = {
      perSeed,
      summary: {
        nivel1: {
          finiteTickRate: agg('nivel1', 'finiteTickRate'),
          finalActiveNodes: agg('nivel1', 'finalActiveNodes'),
          finalPopulatedSectors: agg('nivel1', 'finalPopulatedSectors'),
          finalOrphans: agg('nivel1', 'finalOrphans'),
          finalMeanDegree: agg('nivel1', 'finalMeanDegree'),
          meanInTubeRate: agg('nivel1', 'meanInTubeRate'),
          meanObjectiveScore: agg('nivel1', 'meanObjectiveScore'),
          meanStasisIndex: agg('nivel1', 'meanStasisIndex'),
          meanBridgeSync: agg('nivel1', 'meanBridgeSync'),
          meanNonFactorizability: agg('nivel1', 'meanNonFactorizability'),
          meanSectorCoherenceMin: agg('nivel1', 'meanSectorCoherenceMin'),
          finalCrossSectorFluxShare: agg('nivel1', 'finalCrossSectorFluxShare')
        },
        nivel2: {
          finiteTickRate: agg('nivel2', 'finiteTickRate'),
          finalActiveNodes: agg('nivel2', 'finalActiveNodes'),
          finalPopulatedSectors: agg('nivel2', 'finalPopulatedSectors'),
          finalOrphans: agg('nivel2', 'finalOrphans'),
          finalMeanDegree: agg('nivel2', 'finalMeanDegree'),
          meanInTubeRate: agg('nivel2', 'meanInTubeRate'),
          meanObjectiveScore: agg('nivel2', 'meanObjectiveScore'),
          meanStasisIndex: agg('nivel2', 'meanStasisIndex'),
          meanBridgeSync: agg('nivel2', 'meanBridgeSync'),
          meanNonFactorizability: agg('nivel2', 'meanNonFactorizability'),
          meanSectorCoherenceMin: agg('nivel2', 'meanSectorCoherenceMin'),
          finalCrossSectorFluxShare: agg('nivel2', 'finalCrossSectorFluxShare'),
          totalMigrations: perSeed.reduce((s, r) => s + r.nivel2.l2Telemetry.migrations, 0),
          totalRegenerated: perSeed.reduce((s, r) => s + r.nivel2.l2Telemetry.regeneratedNodes, 0),
          totalInvariantRepairs: perSeed.reduce((s, r) => s + r.nivel2.l2Telemetry.invariantRepairs, 0),
          totalKinematicUnfreezes: perSeed.reduce((s, r) => s + r.nivel2.l2Telemetry.kinematicUnfreezes, 0)
        }
      }
    };
  }

  const report = {
    schema: 'qicn.nivel1_vs_nivel2_arena.v1',
    evidence_scope: 'internal_support_only',
    external_support_certified: false,
    seeds: SEEDS,
    nodes: NODES,
    warmupTicks: WARMUP_TICKS,
    evalTicks: EVAL_TICKS,
    results
  };
  return { ...report, digest: sha256Hex(stableStringify(report)) };
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  const arena = await runNivel1VsNivel2Arena();
  console.log(JSON.stringify({
    schema: arena.schema,
    digest: arena.digest,
    evidence_scope: arena.evidence_scope,
    external_support_certified: arena.external_support_certified,
    summaries: Object.fromEntries(Object.entries(arena.results).map(([k, v]) => [k, v.summary]))
  }, null, 2));
}

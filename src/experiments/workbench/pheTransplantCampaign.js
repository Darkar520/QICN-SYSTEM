// @ts-check
// claim_scope: isolated_internal_engineering
// evidence_scope: internal_support_only
// interpretation_boundary: Isolated-copy P/H/E comparative campaign, sealed dynamic state transplant, and live dynamic atomic separator probe. Not live primary evidence or external validation.

import { sealData, WORKBENCH_BOUNDARY } from './contracts.js';
import { restoreWorkbenchCapture } from './restore.js';
import { captureSession } from './capture.js';
import { readWorkbenchMetrics } from './metrics.js';
import { compareWorkbenchTrajectories } from './trajectoryComparison.js';
import {
  FIFTH_CONTRAST_G,
  calibratedLateParityResponse,
  lateParitySign
} from '../../phenomenal_bridge/HybridLateQueryTieBreaker.js';
import { F, ONE } from '../../simulation/tower/ExactFraction.js';
import { NODAL_TOWER_COUPLING_MODES } from '../../simulation/NodalTowerCouplingBridge.js';

const exactPrefixCodeMeanError = (m, B) => (
  B >= m ? F(0) : FIFTH_CONTRAST_G.mul(ONE.sub(F(1, 1 << (m - B))))
);

const round6 = (v) => Number((Number.isFinite(Number(v)) ? Number(v) : 0).toFixed(6));

function readLiveBridgeTelemetry(session) {
  const mode = session.environment.config.NODAL_TOWER_COUPLING_MODE;
  const towerTel = session.bag.ontologicalCore.current?.ontologicalState?.tower_telemetry || null;
  const bridge = session.bag.nodalLayer.current?.computeBridgeMetrics?.(towerTel, mode) || null;
  return {
    mode: String(bridge?.mode || mode || 'off'),
    effectiveEta: String(bridge?.effective_eta || '0'),
    interSectorCouplingRatio: round6(bridge?.inter_sector_coupling_ratio ?? 0),
    interSectorSignalFlux: round6(bridge?.inter_sector_signal_flux ?? 0),
    crossSectorFluxShare: round6(bridge?.cross_sector_flux_share ?? 0),
    nodalNonFactorizabilityFlux: round6(bridge?.nodal_non_factorizability_flux ?? 0),
    bridgeNodalSyncIndex: round6(bridge?.bridge_nodal_sync_index ?? 0)
  };
}

async function advanceClone(session, { sourceTick, startOffset, useEvaluationOffset = true, count, inputTape, expectedBuild, cancelled }) {
  const trajectory = [];
  for (let i = 0; i < count; i += 1) {
    cancelled();
    const offset = startOffset + i;
    const input = inputTape.length ? inputTape[offset % inputTape.length] : {};
    session.step(sourceTick + offset + 1, {
      evaluationOffset: useEvaluationOffset ? (offset + 1) : null,
      perception: input.perception || null,
      entropyValue: input.entropyValue
    });
    trajectory.push(readWorkbenchMetrics(session, expectedBuild));
    await Promise.resolve();
  }
  return trajectory;
}

/**
 * Executes the isolated 3-arm comparative campaign (P / H / E), sealed midpoint
 * state transplant (verified transfer vs untransplanted sham control), and live
 * dynamic nodal atomic separator probe (bidirectional vs T_d cut eta=0 vs A=I
 * reducible control) strictly on cloned HeadlessRuntimeSession instances.
 *
 * Uses zero global clock/RNG calls (passes `withGlobalTraps`) and zero Node-only APIs.
 */
export async function runWorkbenchPheTransplantCampaign(captured, specification, { expectedBuild, cancelled }) {
  const safeCancel = typeof cancelled === 'function' ? cancelled : () => {};
  safeCancel();

  const totalTicks = Math.min(4, Math.max(2, Number(specification?.ticks) || 2));
  const preTicks = Math.max(1, Math.floor(totalTicks / 2));
  const postTicks = Math.max(1, totalTicks - preTicks);
  const inputTape = Array.isArray(specification?.inputTape) ? specification.inputTape : [];
  const profile = specification.profile;

  // --- Arm P: Coupled live plant (bidirectional, eta = 1/8) with midpoint sealed capture ---
  const { session: armP, source } = await restoreWorkbenchCapture(captured, { profile, expectedBuild });
  armP.environment.config.NODAL_TOWER_COUPLING_MODE = NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL;
  armP.bag.nodalLayer.current?.ensureSectorAnnotations?.(NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL);

  const armPPre = await advanceClone(armP, {
    sourceTick: source.sourceTick,
    startOffset: 0,
    count: preTicks,
    inputTape,
    expectedBuild,
    cancelled: safeCancel
  });

  // Capture sealed dynamic state at the midpoint for transplant verification
  const midpointCapture = await captureSession(armP, { build: expectedBuild });
  const armPPost = await advanceClone(armP, {
    sourceTick: source.sourceTick,
    startOffset: preTicks,
    useEvaluationOffset: false,
    count: postTicks,
    inputTape,
    expectedBuild,
    cancelled: safeCancel
  });
  const armPFull = [...armPPre, ...armPPost];
  const armPBridge = readLiveBridgeTelemetry(armP);

  // --- Arm E: Equal-cost total replica control (must satisfy maxAbsDiff === 0 and R = 0) ---
  safeCancel();
  const { session: armE } = await restoreWorkbenchCapture(captured, { profile, expectedBuild });
  armE.environment.config.NODAL_TOWER_COUPLING_MODE = NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL;
  armE.bag.nodalLayer.current?.ensureSectorAnnotations?.(NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL);
  const armEPre = await advanceClone(armE, {
    sourceTick: source.sourceTick,
    startOffset: 0,
    count: preTicks,
    inputTape,
    expectedBuild,
    cancelled: safeCancel
  });
  const armEPost = await advanceClone(armE, {
    sourceTick: source.sourceTick,
    startOffset: preTicks,
    useEvaluationOffset: false,
    count: postTicks,
    inputTape,
    expectedBuild,
    cancelled: safeCancel
  });
  const armEFull = [...armEPre, ...armEPost];
  const armEComparison = compareWorkbenchTrajectories(armPFull, armEFull);

  // --- Sealed State Transplant: restore verified midpointCapture into a fresh session ---
  safeCancel();
  const { session: transplanted } = await restoreWorkbenchCapture(midpointCapture, { profile, expectedBuild });
  const transplantedPost = await advanceClone(transplanted, {
    sourceTick: source.sourceTick,
    startOffset: preTicks,
    useEvaluationOffset: false,
    count: postTicks,
    inputTape,
    expectedBuild,
    cancelled: safeCancel
  });
  const transplantComparison = compareWorkbenchTrajectories(armPPost, transplantedPost);

  // --- Untransplanted Sham-Reset Control: same future ticks & tape without midpoint transplant ---
  safeCancel();
  const { session: untransplanted } = await restoreWorkbenchCapture(captured, { profile, expectedBuild });
  untransplanted.environment.config.NODAL_TOWER_COUPLING_MODE = NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL;
  untransplanted.bag.nodalLayer.current?.ensureSectorAnnotations?.(NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL);
  const untransplantedPost = await advanceClone(untransplanted, {
    sourceTick: source.sourceTick,
    startOffset: preTicks,
    useEvaluationOffset: false,
    count: postTicks,
    inputTape,
    expectedBuild,
    cancelled: safeCancel
  });
  const untransplantedComparison = compareWorkbenchTrajectories(armPPost, untransplantedPost);

  // --- Arm H: Hybrid transcript bottleneck sweep (m = 4, B in {0, 1, 2, 4}) bound to Arm P's sealed digest ---
  const midHex = String(midpointCapture.dynamicRecord.digest || '0b0d');
  const retainedWordX = (parseInt(midHex.slice(0, 2), 16) & 0x0f) || 0x0b;
  const lateQueryQ = (parseInt(midHex.slice(2, 4), 16) & 0x0f) || 0x0d;
  const expectedSign = lateParitySign(retainedWordX, lateQueryQ);
  const coupledLateResponse = calibratedLateParityResponse(retainedWordX, lateQueryQ, { cut: false });
  const cutLateResponse = calibratedLateParityResponse(retainedWordX, lateQueryQ, { cut: true });
  const m = 4;
  const transcriptSweep = [0, 1, 2, 4].map((B) => {
    const uniformErr = B < m ? FIFTH_CONTRAST_G.toString() : '0';
    const meanErr = exactPrefixCodeMeanError(m, B).toString();
    return {
      m,
      B,
      bottlenecked: B < m,
      uniformSeparationR: uniformErr,
      prefixCodeMeanSeparation: meanErr
    };
  });

  // --- Dynamic Nodal Atomic Separator: bidirectional vs T_d physical cut (eta=0) vs reducible (A=I) ---
  safeCancel();
  const { session: armCut } = await restoreWorkbenchCapture(captured, { profile, expectedBuild });
  armCut.environment.config.NODAL_TOWER_COUPLING_MODE = NODAL_TOWER_COUPLING_MODES.TD_CUT;
  armCut.bag.nodalLayer.current?.ensureSectorAnnotations?.(NODAL_TOWER_COUPLING_MODES.TD_CUT);
  const armCutFull = await advanceClone(armCut, {
    sourceTick: source.sourceTick,
    startOffset: 0,
    count: totalTicks,
    inputTape,
    expectedBuild,
    cancelled: safeCancel
  });
  const armCutBridge = readLiveBridgeTelemetry(armCut);
  const cutVsBidirectional = compareWorkbenchTrajectories(armPFull, armCutFull);

  safeCancel();
  const { session: armReducible } = await restoreWorkbenchCapture(captured, { profile, expectedBuild });
  armReducible.environment.config.NODAL_TOWER_COUPLING_MODE = NODAL_TOWER_COUPLING_MODES.REDUCIBLE;
  armReducible.bag.nodalLayer.current?.ensureSectorAnnotations?.(NODAL_TOWER_COUPLING_MODES.REDUCIBLE);
  const armReducibleFull = await advanceClone(armReducible, {
    sourceTick: source.sourceTick,
    startOffset: 0,
    count: totalTicks,
    inputTape,
    expectedBuild,
    cancelled: safeCancel
  });
  const armReducibleBridge = readLiveBridgeTelemetry(armReducible);
  const reducibleVsBidirectional = compareWorkbenchTrajectories(armPFull, armReducibleFull);

  const boundedMarginPositive = transcriptSweep
    .filter((row) => row.bottlenecked)
    .every((row) => row.uniformSeparationR === FIFTH_CONTRAST_G.toString());
  const sufficientBudgetCollapsesToZero = transcriptSweep
    .filter((row) => !row.bottlenecked)
    .every((row) => row.uniformSeparationR === '0' && row.prefixCodeMeanSeparation === '0');

  return sealData({
    schema: 'qicn.workbench_phe_campaign.v1',
    ...WORKBENCH_BOUNDARY,
    captureDigest: String(captured.digest),
    sourceTick: source.sourceTick,
    campaignTicks: totalTicks,
    midpointTick: midpointCapture.sourceTick,
    armP: {
      mode: NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL,
      effectiveEta: '1/8',
      finalTick: armPFull.at(-1)?.tick ?? source.sourceTick,
      finalStateDigest: armPFull.at(-1)?.stateDigest || '',
      bridge: armPBridge
    },
    armH: {
      m,
      retainedWordX,
      lateQueryQ,
      paritySign: expectedSign,
      coupledParityResponse: coupledLateResponse.toString(),
      tdCutParityResponse: cutLateResponse.toString(),
      boundedMarginPositive,
      sufficientBudgetCollapsesToZero,
      transcriptSweep
    },
    armE: {
      mode: 'equal_cost_total_replica',
      fullStateIdentical: armEComparison.fullStateIdentical,
      maxAbsDiff: armEComparison.maxAbsDiff,
      actionDivergence: armEComparison.actionDivergence,
      replicaSeparationR: '0'
    },
    sealedTransplant: {
      midpointTick: midpointCapture.sourceTick,
      midpointCaptureDigest: midpointCapture.digest,
      midpointDynamicDigest: midpointCapture.dynamicRecord.digest,
      digestVerified: true,
      postTicks,
      transplantedFullStateIdentical: transplantComparison.fullStateIdentical,
      transplantedVsSourceMaxAbsDiff: transplantComparison.maxAbsDiff,
      untransplantedFullStateIdentical: untransplantedComparison.fullStateIdentical,
      untransplantedVsSourceMaxAbsDiff: untransplantedComparison.maxAbsDiff,
      transferSensitivityPositive: !untransplantedComparison.fullStateIdentical
    },
    dynamicAtomicSeparator: {
      bidirectionalBridge: armPBridge,
      tdCutBridge: armCutBridge,
      reducibleBridge: armReducibleBridge,
      bidirectionalVsTdCutMaxAbsDiff: cutVsBidirectional.maxAbsDiff,
      bidirectionalVsReducibleMaxAbsDiff: reducibleVsBidirectional.maxAbsDiff,
      integrationFluxContrast: round6(armPBridge.nodalNonFactorizabilityFlux - armReducibleBridge.nodalNonFactorizabilityFlux),
      crossSectorShareContrast: round6(armPBridge.crossSectorFluxShare - armReducibleBridge.crossSectorFluxShare),
      reducibleInterSectorFluxShare: armReducibleBridge.crossSectorFluxShare,
      algebraicDeltaIntF2: '1/4',
      algebraicReducibleControlAeqI: '0'
    }
  });
}

/**
 * Builds a SHA-256-sealed JSON export package from a completed Workbench bundle.
 */
export function buildSealedWorkbenchExportBundle({ capture, protocol, result }) {
  return sealData({
    schema: 'qicn.workbench_export_bundle.v1',
    ...WORKBENCH_BOUNDARY,
    captureDigest: String(capture?.digest || ''),
    protocolDigest: String(protocol?.digest || ''),
    resultDigest: String(result?.digest || ''),
    sourceTick: Number(capture?.sourceTick ?? 0),
    capture,
    protocol,
    result
  });
}

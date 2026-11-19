// claim_scope: isolated_internal_engineering
// evidence_scope: internal_support_only
// interpretation_boundary: Clone experiment record, not live primary evidence or external validation.
import { restoreWorkbenchCapture } from './restore.js';
import { applyWorkbenchIntervention } from './interventions.js';
import { readWorkbenchMetrics, compareWorkbenchTrajectories } from './metrics.js';
import { createExperimentalChain, verifyExperimentalChain } from './recordChain.js';
import { assertData, validateProtocol, verifyData, sealData, WORKBENCH_BOUNDARY } from './contracts.js';
import { runWorkbenchHybridTieBreaker } from './hybridLateQueryWorkbench.js';

export async function runWorkbench(capture, protocol, { signal = null, expectedBuild = null } = {}) {
  // Detach synchronously, before the first await: caller mutations can never
  // change an in-flight experiment or make a branch consume newer host state.
  assertData(capture); assertData(protocol);
  const captured = structuredClone(capture);
  expectedBuild = expectedBuild || captured.sourceBuild;
  const preregistered = structuredClone(protocol);
  const specification = validateProtocol(preregistered);
  verifyData(captured, 'qicn.workbench_capture.v1');
  const cancelled = () => { if (signal?.aborted) throw new Error('workbench_cancelled'); };
  cancelled();
  const branches = [];
  for (const branch of specification.branches) {
    cancelled();
    const { session, unrestored, source } = await restoreWorkbenchCapture(captured, { profile: specification.profile, expectedBuild });
    const chain = createExperimentalChain(captured.digest, preregistered.digest, branch.id);
    const intervention = applyWorkbenchIntervention(session, branch.intervention);
    chain.append(source.sourceTick, 'intervention', intervention);
    const trajectory = [];
    for (let offset=0; offset<specification.ticks; offset++) {
      cancelled();
      const input = specification.inputTape[offset] || {};
      session.step(source.sourceTick+offset+1, {
        evaluationOffset: offset+1, perception: input.perception || null,
        entropyValue: input.entropyValue
      });
      const point = readWorkbenchMetrics(session, source.sourceBuild);
      trajectory.push(point);
      chain.append(point.tick, 'tick', point);
      // Yield microtasks for headless AbortSignal delivery; worker termination
      // is the host's hard timeout and does not invoke any live callbacks.
      await Promise.resolve();
    }
    const snapshot = chain.snapshot();
    verifyExperimentalChain(snapshot, { captureDigest: captured.digest, protocolDigest: preregistered.digest, branchId: branch.id });
    branches.push({ ...branch, unrestored, intervention, trajectory, chain: snapshot });
  }
  cancelled();
  const comparisons = branches.map(branch => ({ branchId: branch.id, ...compareWorkbenchTrajectories(branches[0].trajectory, branch.trajectory) }));
  comparisons.forEach((comparison,index) => {
    if (specification.branches[index].intervention === 'sham' && (!comparison.fullStateIdentical || comparison.maxAbsDiff !== 0 || comparison.actionDivergence !== 0)) throw new Error('sham_control_failed');
  });
  const hybridLateQueryTieBreaker = runWorkbenchHybridTieBreaker(captured);
  return sealData({
    schema: 'qicn.workbench_result.v1', ...WORKBENCH_BOUNDARY,
    executionStatus: 'COMPLETED', captureDigest: captured.digest,
    protocolDigest: preregistered.digest, sourceTick: captured.sourceTick,
    profile: specification.profile, ticks: specification.ticks,
    originalArchive: { dynamicRecordDigest: captured.dynamicRecord.digest, ledgerHeadHash: captured.ledgerHeadHash },
    branches, comparisons, hybridLateQueryTieBreaker
  });
}

export { verifyWorkbenchResult } from './resultVerifier.js';

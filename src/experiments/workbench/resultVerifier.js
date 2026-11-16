// claim_scope: isolated_internal_engineering
// evidence_scope: internal_support_only
// interpretation_boundary: Data integrity only, not external validation or live-state evidence.
// This dependency graph deliberately does not import runner/restore/the driver.
import { verifyData, validateProtocol } from './contracts.js';
import { verifyExperimentalChain } from './recordChain.js';
import { compareWorkbenchTrajectories } from './trajectoryComparison.js';

export function verifyWorkbenchResult(result, capture, protocol) {
  const body = verifyData(result, 'qicn.workbench_result.v1');
  verifyData(capture, 'qicn.workbench_capture.v1');
  const specification = validateProtocol(protocol);
  if (body.captureDigest !== capture.digest || body.protocolDigest !== protocol.digest || body.ticks !== specification.ticks || body.profile !== specification.profile || body.sourceTick !== capture.sourceTick) throw new Error('workbench_result_context_mismatch');
  if (body.executionStatus !== 'COMPLETED' || body.evidence_scope !== 'internal_support_only' || body.external_support_certified !== false || body.branches.length !== specification.branches.length) throw new Error('invalid_workbench_result');
  if (body.originalArchive.dynamicRecordDigest !== capture.dynamicRecord.digest || body.originalArchive.ledgerHeadHash !== capture.ledgerHeadHash) throw new Error('workbench_archive_mismatch');
  body.branches.forEach((branch,index) => {
    if (branch.id !== specification.branches[index].id || branch.intervention.intervention !== specification.branches[index].intervention || branch.unrestored.length || branch.trajectory.length !== specification.ticks) throw new Error('workbench_branch_mismatch');
    verifyExperimentalChain(branch.chain, { captureDigest: capture.digest, protocolDigest: protocol.digest, branchId: branch.id });
    if (branch.chain.records.length !== specification.ticks+1 || branch.chain.records[0].kind !== 'intervention' || branch.chain.records[0].tick !== capture.sourceTick) throw new Error('workbench_chain_truncated');
    if (JSON.stringify(branch.chain.records[0].payload) !== JSON.stringify(branch.intervention)) throw new Error('workbench_intervention_record_mismatch');
    branch.trajectory.forEach((point,offset) => {
      if (point.tick !== capture.sourceTick+offset+1 || branch.chain.records[offset+1].tick !== point.tick || branch.chain.records[offset+1].kind !== 'tick' || JSON.stringify(point) !== JSON.stringify(branch.chain.records[offset+1].payload)) throw new Error('workbench_tick_record_mismatch');
    });
  });
  const recomputed = body.branches.map(branch => ({ branchId: branch.id, ...compareWorkbenchTrajectories(body.branches[0].trajectory,branch.trajectory) }));
  if (JSON.stringify(recomputed) !== JSON.stringify(body.comparisons)) throw new Error('workbench_comparison_mismatch');
  recomputed.forEach((comparison,index) => {
    if (specification.branches[index].intervention === 'sham' && (!comparison.fullStateIdentical || comparison.maxAbsDiff !== 0 || comparison.actionDivergence !== 0)) throw new Error('sham_control_failed');
  });
  return true;
}

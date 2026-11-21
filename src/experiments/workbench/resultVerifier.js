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
  if (!body.hybridLateQueryTieBreaker) throw new Error('workbench_missing_hybrid_tie_breaker');
  const tieBreaker = verifyData(body.hybridLateQueryTieBreaker, 'qicn.workbench_hybrid_late_query.v1');
  if (
    tieBreaker.captureDigest !== capture.digest
    || tieBreaker.sourceTick !== capture.sourceTick
    || tieBreaker.evidence_scope !== 'internal_support_only'
    || tieBreaker.external_support_certified !== false
    || tieBreaker.passed !== true
    || tieBreaker.fifthContrastG !== '1/2097152'
    || tieBreaker.noisyPenalizedMargin !== '253/536870912'
    || tieBreaker.m2_b1_best_mean !== '3/16777216'
    || tieBreaker.negativeControls?.tdCutContrast !== '0'
    || tieBreaker.negativeControls?.equalCostTotalReplicaR !== '0'
    || tieBreaker.negativeControls?.invertedReferenceR !== '-1/1048576'
    || tieBreaker.negativeControls?.knownSelectiveLeakRisk !== '3/8'
    || tieBreaker.negativeControls?.alwaysTieCoverage !== '0'
    || tieBreaker.atomicSeparator?.primaryDeltaInt !== '1/4'
    || tieBreaker.atomicSeparator?.reducibleIdentityDeltaInt !== '0'
  ) {
    throw new Error('workbench_hybrid_tie_breaker_mismatch');
  }
  if (body.pheTransplantCampaign) {
    const campaign = verifyData(body.pheTransplantCampaign, 'qicn.workbench_phe_campaign.v1');
    if (
      campaign.captureDigest !== capture.digest
      || campaign.sourceTick !== capture.sourceTick
      || campaign.evidence_scope !== 'internal_support_only'
      || campaign.external_support_certified !== false
      || campaign.armP?.effectiveEta !== '1/8'
      || campaign.armE?.fullStateIdentical !== true
      || campaign.armE?.maxAbsDiff !== 0
      || campaign.armE?.replicaSeparationR !== '0'
      || campaign.armH?.boundedMarginPositive !== true
      || campaign.armH?.sufficientBudgetCollapsesToZero !== true
      || campaign.armH?.tdCutParityResponse !== '0'
      || campaign.sealedTransplant?.digestVerified !== true
      || campaign.sealedTransplant?.transplantedFullStateIdentical !== true
      || campaign.sealedTransplant?.transplantedVsSourceMaxAbsDiff !== 0
      || campaign.dynamicAtomicSeparator?.reducibleInterSectorFluxShare !== 0
      || campaign.dynamicAtomicSeparator?.algebraicDeltaIntF2 !== '1/4'
      || campaign.dynamicAtomicSeparator?.algebraicReducibleControlAeqI !== '0'
    ) {
      throw new Error('workbench_phe_campaign_mismatch');
    }
  }
  return true;
}

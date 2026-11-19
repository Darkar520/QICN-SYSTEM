// @ts-check
// claim_scope: isolated_internal_engineering
// evidence_scope: internal_support_only
// interpretation_boundary: Isolated-copy hybrid late-query tie-breaker and atomic separator experiment; not live primary evidence or external validation.

import { sealData, WORKBENCH_BOUNDARY } from './contracts.js';
import { verifyStructuralAtomicSeparatorAndFaithfulQuotients } from '../../canon/invariants/StructuralAtomicSeparator.js';
import {
  verifyHybridLateQueryTieBreakerAndFifthContrast,
  calibratedLateParityResponse,
  lateParitySign,
  FIFTH_CONTRAST_G
} from '../../phenomenal_bridge/HybridLateQueryTieBreaker.js';

let cachedCanonicalAudit = null;

function getCanonicalHybridAndAtomicAudit() {
  if (!cachedCanonicalAudit) {
    cachedCanonicalAudit = {
      atomic: verifyStructuralAtomicSeparatorAndFaithfulQuotients(),
      hybrid: verifyHybridLateQueryTieBreakerAndFifthContrast()
    };
  }
  return cachedCanonicalAudit;
}

/**
 * Runs the Coupled 5-Root & Late-Query Transcript Capacity Tie-Breaker Experiment
 * on an isolated Workbench capture (`qicn.workbench_capture.v1`), binding the captured
 * tower state and seed to a sealed `qicn.workbench_hybrid_late_query.v1` record.
 * @param {object} capture
 */
export function runWorkbenchHybridTieBreaker(capture) {
  const { atomic, hybrid } = getCanonicalHybridAndAtomicAudit();
  const seed = Number(capture?.execution?.seed ?? 11) || 11;
  const sourceTick = Number(capture?.sourceTick ?? 0);

  // Derive a deterministic 4-bit retained history word x in F_2^4 from (seed, sourceTick)
  const retainedRecordM4 = ((seed * 13 + sourceTick * 7 + 5) & 0x0f) || 0x0b;
  const lateQueryM4 = ((seed * 5 + sourceTick * 3 + 9) & 0x0f) || 0x0d;
  const expectedSign = lateParitySign(retainedRecordM4, lateQueryM4);
  const coupledLateResponse = calibratedLateParityResponse(retainedRecordM4, lateQueryM4, { cut: false });
  const cutLateResponse = calibratedLateParityResponse(retainedRecordM4, lateQueryM4, { cut: true });
  if (!coupledLateResponse.eq(FIFTH_CONTRAST_G.mul(expectedSign)) || !cutLateResponse.isZero()) {
    throw new Error('workbench_isolated_late_parity_probe_failed');
  }

  return sealData({
    schema: 'qicn.workbench_hybrid_late_query.v1',
    ...WORKBENCH_BOUNDARY,
    passed: Boolean(atomic.passed && hybrid.passed),
    captureDigest: String(capture?.digest || ''),
    sourceTick,
    seed,
    atomicSeparator: {
      schema: atomic.schema,
      digest: atomic.digest,
      primaryDeltaInt: atomic.primary_binary_instance.integrationCertificateDeltaInt,
      higherDegreeDeltaInt: atomic.higher_degree_instance.integrationCertificateDeltaInt,
      oddPrimeDeltaInt: atomic.odd_prime_instance.integrationCertificateDeltaInt,
      productConfigsChecked: atomic.primary_binary_instance.ontoProductConfigurationsChecked,
      minimaxProductError: atomic.primary_binary_instance.minimaxUniformProductError,
      faithfulQuotientInjective: atomic.primary_binary_instance.faithfulQuotientInjectiveVerified,
      reducibleIdentityDeltaInt: atomic.negative_controls.reducible_identity_A_eq_I.integrationCertificateDeltaInt,
      reducibleIdentityError: atomic.negative_controls.reducible_identity_A_eq_I.nativeCoordinateProductError,
      reducibleSwapSubspaceAnnihilated: atomic.negative_controls.reducible_swap_invariant_subspace.invariantSubspaceAnnihilated,
      crossFactorCommunicationError: atomic.negative_controls.cross_factor_1bit_communication.communicatingProductError
    },
    fifthContrastG: hybrid.five_root_coupled_plant.fifthContrastG,
    safeFibreLipschitz: hybrid.five_root_coupled_plant.safeFibreLipschitz,
    invariantBodyNormBound: hybrid.five_root_coupled_plant.invariantBodyNormBound,
    ambientBodyNormBound: hybrid.five_root_coupled_plant.ambientBodyNormBound,
    noisyPenalizedMargin: hybrid.five_root_coupled_plant.noisyPenalizedMargin,
    sharpNoisyR: hybrid.late_query_transcript_frontier.sharp_noisy_R,
    pairedReadingEps: hybrid.late_query_transcript_frontier.paired_reading_eps,
    additionalResponseGraphCost: hybrid.five_root_coupled_plant.additionalResponseGraphCost,
    responseGraphBudget: hybrid.five_root_coupled_plant.responseGraphBudget,
    m2_b1_best_mean: hybrid.late_query_transcript_frontier.m2_b1_best_mean,
    frontierSample: [
      { m: 2, B: 0, R_uniform: '1/2097152', R_mean: '3/8388608' },
      { m: 2, B: 1, R_uniform: '1/2097152', R_mean: '1/4194304', optimalPartitionMean: '3/16777216' },
      { m: 2, B: 2, R_uniform: '0', R_mean: '0' },
      { m: 4, B: 2, R_uniform: '1/2097152', R_mean: '3/8388608' },
      { m: 4, B: 4, R_uniform: '0', R_mean: '0' },
      { m: 6, B: 3, R_uniform: '1/2097152', R_mean: '7/16777216' },
      { m: 6, B: 6, R_uniform: '0', R_mean: '0' }
    ],
    isolatedCloneProbeM4: {
      m: 4,
      retainedRecordX: retainedRecordM4,
      lateQueryQ: lateQueryM4,
      paritySign: expectedSign,
      coupledWorldResidualResponse: coupledLateResponse.toString(),
      tdCutWorldResidualResponse: cutLateResponse.toString()
    },
    negativeControls: {
      tdCutContrast: hybrid.negative_controls.physical_td_cut_eta_zero.fifthContrast,
      shamContrast: hybrid.negative_controls.sham_evaluation_off.fifthContrast,
      sufficientBudgetBEqualsMError: hybrid.negative_controls.sufficient_transcript_budget_B_ge_m.uniformErrorAtBEqualsM,
      equalCostTotalReplicaR: hybrid.negative_controls.equal_cost_total_replica.replica_R,
      invertedReferenceR: hybrid.negative_controls.inverted_reference_control.inverted_reference_R,
      invertedUnitScaledHalfGR: hybrid.negative_controls.inverted_reference_control.unit_scaled_half_G_R,
      knownSelectiveLeakRisk: hybrid.negative_controls.paper10_blind_source_separation.known_selective_leak_risk,
      alwaysTieCoverage: hybrid.negative_controls.paper10_blind_source_separation.always_tie_coverage,
      paper10ProvenanceSeparatedFromPredictiveR: true
    }
  });
}

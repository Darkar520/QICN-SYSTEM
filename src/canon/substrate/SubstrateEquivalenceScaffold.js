export const SUBSTRATE_EQUIVALENCE_SCAFFOLD_VERSION = 'substrate-equivalence-scaffold.v1';
export const SUBSTRATE_RUNTIME_VERSION = 'substrate-equivalence-runtime.v7';

const toFinite = (value, fallback = null) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const clamp01 = (value) => Math.max(0, Math.min(1, toFinite(value, 0)));

export const SUBSTRATE_DEFAULT_THRESHOLDS = Object.freeze({
  passInvariantDelta: 0.12,
  ambiguousInvariantDelta: 0.2,
  passIriDelta: 0.1,
  ambiguousIriDelta: 0.16,
  passDistance: 0.08,
  ambiguousDistance: 0.12
});

const buildSnoEnvelope = (sno = null) => ({
  strictPass: sno?.strict?.pass_non_identifiable === true,
  loosePass: sno?.loose?.pass_non_identifiable === true,
  supportStatus: sno?.strict?.pass_non_identifiable === true || sno?.loose?.pass_non_identifiable === true
    ? 'NON_IDENTIFIABLE_SUPPORT'
    : (sno ? 'IDENTIFIABLE_OR_AMBIGUOUS' : 'NOT_PROVIDED')
});

export const buildSubstratePairFamily = ({
  familyId,
  description,
  positiveConstruction,
  negativeConstruction,
  evidencePath,
  judgePath,
  pairs = [],
  maturity = 'PARTIAL_RUNTIME_PATH'
}) => ({
  familyId,
  description,
  positiveConstruction,
  negativeConstruction,
  evidencePath,
  judgePath,
  pairs,
  maturity
});

export const buildSubstrateDecisionEnvelope = ({
  pairId,
  familyId,
  equivalenceStatus = 'AMBIGUOUS',
  roeoPath = 'src/experiments/roeo_signature.js',
  snoPath = 'src/experiments/sno_discriminator.js',
  notes = []
}) => ({
  pairId,
  familyId,
  equivalenceStatus,
  roeoPath,
  snoPath,
  notes,
  scaffoldVersion: SUBSTRATE_EQUIVALENCE_SCAFFOLD_VERSION,
  evidenceScope: 'INTERNAL_SUPPORT_ONLY'
});

const normalizedPairDelta = (left, right, invariantId) => Math.abs(
  clamp01(left?.invariants?.[invariantId]?.score) - clamp01(right?.invariants?.[invariantId]?.score)
);

export const evaluateSubstratePairEvidence = ({
  pairId,
  familyId,
  leftInvariantPackage,
  rightInvariantPackage,
  roeo = null,
  sno = null,
  thresholds = SUBSTRATE_DEFAULT_THRESHOLDS
}) => {
  const invariantIds = ['I_per', 'I_ri', 'I_int', 'I_cont', 'I_diff', 'I_leg'];
  const invariantDeltas = Object.fromEntries(
    invariantIds.map((id) => [id, Number(normalizedPairDelta(leftInvariantPackage, rightInvariantPackage, id).toFixed(6))])
  );
  const meanDelta = invariantIds.reduce((sum, id) => sum + invariantDeltas[id], 0) / invariantIds.length;
  const iriDelta = invariantDeltas.I_ri;
  const roeoDistance = toFinite(roeo?.d, null);
  const roeoEquivalent = roeo?.ro_status === 'EQUIVALENT' || (roeoDistance !== null && roeoDistance <= thresholds.passDistance);
  const snoEnvelope = buildSnoEnvelope(sno);
  const snoSupport = snoEnvelope.supportStatus === 'NON_IDENTIFIABLE_SUPPORT';

  let equivalenceStatus = 'AMBIGUOUS';
  if (roeoEquivalent && meanDelta <= thresholds.passInvariantDelta && iriDelta <= thresholds.passIriDelta && (sno == null || snoSupport)) {
    equivalenceStatus = 'PASS';
  } else if (
    (!roeoEquivalent && roeoDistance !== null && roeoDistance > thresholds.ambiguousDistance)
    || meanDelta > thresholds.ambiguousInvariantDelta
    || iriDelta > thresholds.ambiguousIriDelta
    || (sno != null && !snoSupport && roeoEquivalent)
  ) {
    equivalenceStatus = 'FAIL';
  }

  const envelope = buildSubstrateDecisionEnvelope({
    pairId,
    familyId,
    equivalenceStatus,
    notes: [
      `mean_invariant_delta=${meanDelta.toFixed(6)}`,
      `iri_delta=${iriDelta.toFixed(6)}`,
      `roeo_distance=${roeoDistance === null ? 'null' : roeoDistance.toFixed(6)}`,
      `sno_support=${snoSupport ? 'yes' : 'no'}`
    ],
    roeoPath: 'src/experiments/roeo_signature.js',
    snoPath: 'src/experiments/sno_discriminator.js'
  });
  return {
    ...envelope,
    evidenceChannels: {
      invariants: {
        meanDelta: Number(meanDelta.toFixed(6)),
        iriDelta: Number(iriDelta.toFixed(6)),
        invariantDeltas
      },
      roeo: {
        equivalent: Boolean(roeoEquivalent),
        distance: roeoDistance
      },
      sno: snoEnvelope
    },
    supportInterpretation: equivalenceStatus === 'PASS'
      ? 'runtime_equivalence_supported'
      : (equivalenceStatus === 'FAIL' ? 'runtime_equivalence_rejected' : 'runtime_equivalence_inconclusive')
  };
};

const inferPairRole = (pair = {}) => {
  if (pair.role) return pair.role;
  const pairLabel = String(pair.pairId || '').toLowerCase();
  if (pairLabel.includes('negative') || pairLabel.includes('control') || pairLabel.includes('fail')) return 'negative';
  if (pairLabel.includes('positive') || pairLabel.includes('same') || pairLabel.includes('match')) return 'positive';
  if (pair?.roeo?.ro_status === 'NOT_EQUIVALENT') return 'negative';
  if (pair?.roeo?.ro_status === 'EQUIVALENT') return 'positive';
  return 'positive';
};

export const evaluateSubstratePairFamily = ({
  family,
  thresholds = SUBSTRATE_DEFAULT_THRESHOLDS
}) => {
  const pairs = (family.pairs || []).map((pair) => ({
    ...pair,
    role: inferPairRole(pair),
    runtimeEvidence: evaluateSubstratePairEvidence({
      pairId: pair.pairId,
      familyId: family.familyId,
      leftInvariantPackage: pair.leftInvariantPackage,
      rightInvariantPackage: pair.rightInvariantPackage,
      roeo: pair.roeo,
      sno: pair.sno,
      thresholds
    })
  }));
  const positivePairs = pairs.filter((pair) => pair.role === 'positive');
  const negativePairs = pairs.filter((pair) => pair.role === 'negative');
  const positivePassCount = positivePairs.filter((pair) => pair.runtimeEvidence?.equivalenceStatus === 'PASS').length;
  const negativeFailCount = negativePairs.filter((pair) => pair.runtimeEvidence?.equivalenceStatus === 'FAIL').length;
  const snoSupportedCount = pairs.filter((pair) => pair.runtimeEvidence?.evidenceChannels?.sno?.supportStatus === 'NON_IDENTIFIABLE_SUPPORT').length;
  const roeoSupportedCount = pairs.filter((pair) => pair.runtimeEvidence?.evidenceChannels?.roeo?.equivalent === true).length;
  const positiveSnoAligned = positivePairs.length > 0
    && positivePairs.every((pair) => pair.runtimeEvidence?.evidenceChannels?.sno?.supportStatus === 'NON_IDENTIFIABLE_SUPPORT');
  const positiveRoeoSupported = positivePairs.length > 0
    && positivePairs.every((pair) => pair.runtimeEvidence?.evidenceChannels?.roeo?.equivalent === true);
  const negativeRoeoRejected = negativePairs.length > 0
    && negativePairs.every((pair) => pair.runtimeEvidence?.evidenceChannels?.roeo?.equivalent === false);
  const fullFamilySeparation = positivePairs.length > 0
    && negativePairs.length > 0
    && positivePassCount === positivePairs.length
    && negativeFailCount === negativePairs.length;
  const closureSummary = {
    positivePassCount,
    negativeFailCount,
    snoSupportedCount,
    roeoSupportedCount,
    supportInterpretation: fullFamilySeparation && positiveSnoAligned && positiveRoeoSupported && negativeRoeoRejected
      ? 'runtime_substrate_claim_closing_ready'
      : positivePassCount > 0 && negativeFailCount > 0
      ? 'runtime_substrate_strengthened'
      : (positivePassCount > 0 ? 'runtime_substrate_partial' : 'runtime_substrate_unresolved'),
    readiness: fullFamilySeparation && positiveSnoAligned && positiveRoeoSupported && negativeRoeoRejected
      ? 'CLAIM_CLOSING_READY_RUNTIME_EVIDENCE'
      : positivePassCount > 0 && negativeFailCount > 0 && snoSupportedCount > 0
      ? 'PARTIAL_RUNTIME_PATH_CLOSURE_STRENGTHENED'
      : 'PARTIAL_RUNTIME_PATH',
    claimClosingReadiness: fullFamilySeparation && positiveSnoAligned && positiveRoeoSupported && negativeRoeoRejected
      ? 'CLAIM_CLOSING_READY_RUNTIME_EVIDENCE'
      : positivePassCount > 0 && negativeFailCount > 0 && snoSupportedCount > 0 && roeoSupportedCount > 0
      ? 'NEAR_CLAIM_CLOSING_RUNTIME_EVIDENCE'
      : 'INSUFFICIENT_FOR_CLAIM_CLOSING',
    evidenceSeparation: {
      runtimeEvidence: 'native_invariant_and_roeo_sno_channels',
      finalClaimClosure: 'release_facing_judge_layer_still_required'
    },
    familyConvergence: fullFamilySeparation ? 'CLEAN_POSITIVE_NEGATIVE_SEPARATION' : 'PARTIAL_OR_MIXED'
  };
  return {
    familyId: family.familyId,
    description: family.description,
    maturity: family.maturity || 'PARTIAL_RUNTIME_PATH',
    pairs,
    thresholds,
    closureSummary,
    externalMaterializationDependencies: [
      'final substrate claim-ledger promotion remains outside runtime',
      'campaign-level ROEO/SNO batch closure still remains external'
    ],
    notes: [
      'Substrate runtime internalization now separates invariant evidence from final release-facing claim status.',
      'SNO is now consumed as a native evidence channel inside substrate runtime evaluation instead of remaining only as a detached report interpretation.',
      'This module does not promote P5-02/P5-06 by itself; it only structures reusable runtime evidence.'
    ]
  };
};

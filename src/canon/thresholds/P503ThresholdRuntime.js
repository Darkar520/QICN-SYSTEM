const toFinite = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const sortByPosition = (rows = []) => [...rows].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

export const P503_THRESHOLD_RUNTIME_VERSION = 'p5-03-threshold-runtime.v4';

export const DEFAULT_P503_THRESHOLD_SPEC = Object.freeze({
  invariantFloors: Object.freeze({
    I_per: 0.7,
    I_ri: 0.72,
    I_int: 0.72,
    I_cont: 0.72,
    I_diff: 0.68,
    I_leg: 0.72
  }),
  passMarginFloor: 0.04,
  ambiguityBand: 0.04,
  focusedBoundaryStep: 0.002,
  dominantSweepOffsets: Object.freeze([-0.03, -0.02, -0.01, 0, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08]),
  profiles: Object.freeze([
    { profileId: 'base', label: 'Base runtime profile', deltas: {} },
    { profileId: 'local_loose', label: 'Local loose profile', deltas: { I_int: -0.03, I_leg: -0.03 } },
    { profileId: 'local_tight', label: 'Local tight profile', deltas: { I_int: 0.03, I_leg: 0.03 } },
    { profileId: 'integration_tight', label: 'Focused integration stress', deltas: { I_int: 0.06 } },
    { profileId: 'legibility_tight', label: 'Focused legibility stress', deltas: { I_leg: 0.06 } }
  ])
});

const classifyDecision = ({ minMargin, flags = {} }, thresholdSpec) => {
  if (flags.schema_drift || flags.hash_drift || flags.io_partial) {
    return 'FAIL';
  }
  if (minMargin < 0) return 'FAIL';
  if (minMargin < thresholdSpec.passMarginFloor) return 'AMBIGUOUS';
  return 'PASS';
};

const buildProfileRow = ({ profile, invariantPackage, flags = {}, thresholdSpec }) => {
  const invariantEntries = Object.entries(invariantPackage?.invariants || {});
  const margins = invariantEntries.map(([id, record]) => {
    const baseFloor = toFinite(thresholdSpec.invariantFloors[id], 0.72);
    const floor = baseFloor + toFinite(profile?.deltas?.[id], 0);
    const score = toFinite(record?.score, 0);
    return {
      invariantId: id,
      score: Number(score.toFixed(6)),
      floor: Number(floor.toFixed(6)),
      margin: Number((score - floor).toFixed(6))
    };
  }).sort((a, b) => a.margin - b.margin);

  const weakest = margins[0] || null;
  const minMargin = weakest?.margin ?? -1;
  const decision = classifyDecision({ minMargin, flags }, thresholdSpec);
  return {
    profileId: profile.profileId,
    label: profile.label,
    decision,
    weakestInvariant: weakest?.invariantId || null,
    weakestMargin: minMargin,
    margins
  };
};

const buildDominantSweepRows = ({ dominantInvariant, invariantPackage, flags = {}, thresholdSpec }) => {
  if (!dominantInvariant) return [];
  return thresholdSpec.dominantSweepOffsets.map((offset, index) => buildProfileRow({
    profile: {
      profileId: `dominant_${dominantInvariant}_${offset >= 0 ? 'plus' : 'minus'}_${String(Math.abs(offset)).replace('.', '_')}`,
      label: `Dominant ${dominantInvariant} sweep ${offset >= 0 ? '+' : ''}${offset.toFixed(2)}`,
      deltas: { [dominantInvariant]: offset },
      offset
    },
    invariantPackage,
    flags,
    thresholdSpec
  })).map((row, index) => ({
    ...row,
    position: index,
    offset: thresholdSpec.dominantSweepOffsets[index]
  }));
};

const buildFocusedBoundarySweepRows = ({
  dominantInvariant,
  invariantPackage,
  flags = {},
  thresholdSpec,
  baseMargin = null
}) => {
  if (!dominantInvariant || baseMargin === null) return [];

  const step = Math.max(0.001, toFinite(thresholdSpec.focusedBoundaryStep, 0.002));
  const passBoundaryOffset = Math.max(0, toFinite(baseMargin, 0) - toFinite(thresholdSpec.passMarginFloor, 0.04));
  const failBoundaryOffset = Math.max(0, toFinite(baseMargin, 0));
  const start = Math.max(0, passBoundaryOffset - (step * 3));
  const end = Math.max(start, failBoundaryOffset + (step * 3));
  const offsets = [];

  for (let offset = start; offset <= end + (step / 2); offset += step) {
    offsets.push(Number(offset.toFixed(6)));
  }

  return offsets.map((offset, index) => ({
    ...buildProfileRow({
      profile: {
        profileId: `focused_${dominantInvariant}_${String(offset).replace('.', '_')}`,
        label: `Focused ${dominantInvariant} boundary ${offset.toFixed(3)}`,
        deltas: { [dominantInvariant]: offset }
      },
      invariantPackage,
      flags,
      thresholdSpec
    }),
    position: index,
    offset
  }));
};

const buildConstraintSummary = ({
  invariantPackage = {},
  base = null,
  knifeEdgeSource = null,
  thresholdSpec,
  localizedKnifeEdge,
  fullyStable,
  flags = {},
  dominantSweepRows = [],
  focusedBoundaryRows = []
}) => {
  const dominantInvariantId = knifeEdgeSource?.weakestInvariant || base?.weakestInvariant || null;
  const dominantRecord = dominantInvariantId ? invariantPackage?.invariants?.[dominantInvariantId] : null;
  const baseMargin = base?.weakestMargin ?? null;
  const knifeEdgeMargin = knifeEdgeSource?.weakestMargin ?? null;
  const passFloorDistance = baseMargin === null ? null : Number((baseMargin - thresholdSpec.passMarginFloor).toFixed(6));
  const ambiguityExposure = knifeEdgeMargin === null ? null : Number((thresholdSpec.passMarginFloor - knifeEdgeMargin).toFixed(6));
  const positiveSweep = dominantSweepRows.filter((row) => toFinite(row.offset, 0) > 0);
  const ambiguousSweep = positiveSweep.filter((row) => row.decision === 'AMBIGUOUS');
  const failSweep = positiveSweep.filter((row) => row.decision === 'FAIL');
  const firstAmbiguousOffset = ambiguousSweep.length ? ambiguousSweep[0].offset : null;
  const firstFailOffset = failSweep.length ? failSweep[0].offset : null;
  const ambiguityOffsetSpan = ambiguousSweep.length
    ? Number((ambiguousSweep[ambiguousSweep.length - 1].offset - ambiguousSweep[0].offset).toFixed(6))
    : 0;
  const boundedKnifeEdge = Boolean(
    localizedKnifeEdge
    && dominantInvariantId
    && firstAmbiguousOffset !== null
    && (firstFailOffset === null || firstFailOffset >= 0.08)
    && ambiguityOffsetSpan <= thresholdSpec.ambiguityBand
  );

  const focusedAmbiguous = focusedBoundaryRows.filter((row) => row.decision === 'AMBIGUOUS');
  const focusedFail = focusedBoundaryRows.filter((row) => row.decision === 'FAIL');
  const firstFocusedAmbiguousOffset = focusedAmbiguous.length ? focusedAmbiguous[0].offset : null;
  const firstFocusedFailOffset = focusedFail.length ? focusedFail[0].offset : null;
  const criticalPassBoundaryOffset = baseMargin === null
    ? null
    : Number(Math.max(0, baseMargin - thresholdSpec.passMarginFloor).toFixed(6));
  const criticalFailBoundaryOffset = baseMargin === null
    ? null
    : Number(Math.max(0, baseMargin).toFixed(6));
  const ambiguityZoneWidth = (
    criticalPassBoundaryOffset !== null
    && criticalFailBoundaryOffset !== null
  )
    ? Number((criticalFailBoundaryOffset - criticalPassBoundaryOffset).toFixed(6))
    : null;
  const focusedSecondMarginBufferMin = focusedBoundaryRows.length
    ? Number(Math.min(...focusedBoundaryRows.map((row) => {
      const weakest = row?.margins?.[0]?.margin;
      const second = row?.margins?.[1]?.margin;
      return (weakest === undefined || second === undefined) ? Infinity : second - weakest;
    })).toFixed(6))
    : null;
  const dominantStableAcrossFocusedSweep = Boolean(
    dominantInvariantId
    && focusedBoundaryRows.length
    && focusedBoundaryRows.every((row) => row.weakestInvariant === dominantInvariantId)
  );
  const stableExclusiveDominance = Boolean(
    dominantStableAcrossFocusedSweep
    && focusedSecondMarginBufferMin !== null
    && Number.isFinite(focusedSecondMarginBufferMin)
    && focusedSecondMarginBufferMin > 0
  );
  const noBackgroundFlags = !flags.schema_drift && !flags.hash_drift && !flags.io_partial;
  const thresholdGeometryClass = fullyStable
    ? 'STABLE_RUNTIME_GEOMETRY'
    : boundedKnifeEdge
    ? 'LOCALIZED_BOUNDED_KNIFE_EDGE'
    : localizedKnifeEdge
    ? 'LOCALIZED_KNIFE_EDGE'
    : 'BROAD_OR_CONFUNDED_THRESHOLD_GEOMETRY';
  const knifeEdgeReducibility = fullyStable
    ? 'not_applicable_stable'
    : (
      localizedKnifeEdge
      && stableExclusiveDominance
      && noBackgroundFlags
      && firstFocusedAmbiguousOffset !== null
      && firstFocusedFailOffset !== null
      && ambiguityZoneWidth !== null
      && ambiguityZoneWidth > 0
    )
      ? 'irreducible_structural'
      : localizedKnifeEdge
      ? 'possibly_reducible_or_underresolved'
      : 'broad_or_confounded';
  const finalObjectiveStatus = fullyStable
    ? 'CLAIM_CLOSING_READY_RUNTIME_EVIDENCE'
    : knifeEdgeReducibility === 'irreducible_structural'
    ? 'IRREDUCIBLE_STRUCTURAL_KNIFE_EDGE'
    : 'UNRESOLVED_RUNTIME_GEOMETRY';

  return {
    dominantInvariant: dominantInvariantId,
    dominantInvariantMaturity: dominantRecord?.maturity || null,
    dominantInvariantSupportMode: dominantRecord?.provenance?.supportMode || null,
    dominantInvariantJudgeDependent: Boolean(dominantRecord?.judgeDependent),
    dominantInvariantRuntimeSignals: dominantRecord?.runtimeSignals || [],
    dominantInvariantResidualDependencies: dominantRecord?.provenance?.residualDependencies || [],
    baseWeakestMargin: baseMargin,
    knifeEdgeMargin,
    passFloorDistance,
    ambiguityExposure,
    localizedKnifeEdge,
    fullyStable,
    backgroundFlags: {
      schemaDrift: Boolean(flags.schema_drift),
      hashDrift: Boolean(flags.hash_drift),
      ioPartial: Boolean(flags.io_partial)
    },
    decisionGeometry: {
      passProfiles: null,
      ambiguousProfiles: null,
      failProfiles: null,
      dominantSweepRows,
      focusedBoundaryRows,
      focusedBoundaryStep: thresholdSpec.focusedBoundaryStep,
      firstAmbiguousOffset,
      firstFailOffset,
      firstFocusedAmbiguousOffset,
      firstFocusedFailOffset,
      ambiguityOffsetSpan,
      criticalPassBoundaryOffset,
      criticalFailBoundaryOffset,
      ambiguityZoneWidth,
      focusedSecondMarginBufferMin,
      dominantStableAcrossFocusedSweep,
      stableExclusiveDominance,
      knifeEdgeReducibility,
      finalObjectiveStatus,
      boundedKnifeEdge,
      thresholdGeometryClass
    }
  };
};

export const evaluateP503ThresholdRuntime = ({
  invariantPackage = {},
  summary = {},
  verdict = {},
  thresholdSpec = DEFAULT_P503_THRESHOLD_SPEC
} = {}) => {
  const flags = summary?.flags || {};
  const rows = thresholdSpec.profiles.map((profile) => buildProfileRow({
    profile,
    invariantPackage,
    flags,
    thresholdSpec
  }));
  const orderedRows = sortByPosition(rows.map((row, index) => ({ ...row, position: index })));
  const base = orderedRows.find((row) => row.profileId === 'base') || orderedRows[0] || null;
  const localLoose = orderedRows.find((row) => row.profileId === 'local_loose') || null;
  const localTight = orderedRows.find((row) => row.profileId === 'local_tight') || null;
  const focusedTight = orderedRows.filter((row) => ['integration_tight', 'legibility_tight'].includes(row.profileId));
  const decisionPattern = orderedRows.map((row) => row.decision);
  const focusedAmbiguous = focusedTight.filter((row) => row.decision === 'AMBIGUOUS');
  const focusedFail = focusedTight.filter((row) => row.decision === 'FAIL');
  const broadCollapse = decisionPattern.filter((decision) => decision === 'FAIL').length >= 2;
  const localizedKnifeEdge = (
    base?.decision === 'PASS'
    && localLoose?.decision === 'PASS'
    && localTight?.decision !== 'FAIL'
    && focusedAmbiguous.length >= 1
    && focusedFail.length === 0
  );
  const fullyStable = orderedRows.every((row) => row.decision === 'PASS');

  const knifeEdgeSource = focusedAmbiguous[0] || localTight || base;
  const dominantSweepRows = buildDominantSweepRows({
    dominantInvariant: knifeEdgeSource?.weakestInvariant || base?.weakestInvariant || null,
    invariantPackage,
    flags,
    thresholdSpec
  });
  const focusedBoundaryRows = buildFocusedBoundarySweepRows({
    dominantInvariant: knifeEdgeSource?.weakestInvariant || base?.weakestInvariant || null,
    invariantPackage,
    flags,
    thresholdSpec,
    baseMargin: base?.weakestMargin ?? null
  });

  const constraintSummary = buildConstraintSummary({
    invariantPackage,
    base,
    knifeEdgeSource,
    thresholdSpec,
    localizedKnifeEdge,
    fullyStable,
    flags,
    dominantSweepRows,
    focusedBoundaryRows
  });
  constraintSummary.decisionGeometry.passProfiles = orderedRows.filter((row) => row.decision === 'PASS').map((row) => row.profileId);
  constraintSummary.decisionGeometry.ambiguousProfiles = orderedRows.filter((row) => row.decision === 'AMBIGUOUS').map((row) => row.profileId);
  constraintSummary.decisionGeometry.failProfiles = orderedRows.filter((row) => row.decision === 'FAIL').map((row) => row.profileId);

  const boundedKnifeEdge = Boolean(constraintSummary.decisionGeometry.boundedKnifeEdge);
  const runtimePath = fullyStable
    ? 'NEAR_CLAIM_CLOSING_RUNTIME_EVIDENCE'
    : boundedKnifeEdge
    ? 'PARTIAL_RUNTIME_CLOSURE_STRENGTHENED'
    : localizedKnifeEdge
    ? 'LOCALIZED_KNIFE_EDGE_RUNTIME_PATH'
    : 'PARTIAL_RUNTIME_CLOSURE';
  const claimClosingReadiness = fullyStable
    ? 'NEAR_CLAIM_CLOSING_RUNTIME_EVIDENCE'
    : boundedKnifeEdge
    ? 'PARTIAL_RUNTIME_CLOSURE'
    : localizedKnifeEdge
    ? 'PARTIAL_RUNTIME_CLOSURE'
    : 'INSUFFICIENT_FOR_CLAIM_CLOSING';
  const supportInterpretation = fullyStable
    ? 'runtime_threshold_stable'
    : constraintSummary.decisionGeometry.finalObjectiveStatus === 'IRREDUCIBLE_STRUCTURAL_KNIFE_EDGE'
    ? 'runtime_threshold_irreducible_structural_knife_edge'
    : boundedKnifeEdge
    ? 'runtime_threshold_localized_bounded_knife_edge'
    : localizedKnifeEdge
    ? 'runtime_threshold_localized_knife_edge'
    : 'runtime_threshold_fragile_or_confounded';

  const closureSummary = {
    runtimePath,
    claimClosingReadiness,
    supportInterpretation,
    baseDecision: base?.decision || 'UNKNOWN',
    localLooseDecision: localLoose?.decision || 'UNKNOWN',
    localTightDecision: localTight?.decision || 'UNKNOWN',
    knifeEdgeLocalized: localizedKnifeEdge,
    broadCollapse,
    knifeEdgeInvariant: knifeEdgeSource?.weakestInvariant || null,
    knifeEdgeMargin: knifeEdgeSource?.weakestMargin ?? null,
    dominantInvariant: constraintSummary.dominantInvariant,
    dominantInvariantMaturity: constraintSummary.dominantInvariantMaturity,
    dominantInvariantSupportMode: constraintSummary.dominantInvariantSupportMode,
    passFloorDistance: constraintSummary.passFloorDistance,
    ambiguityExposure: constraintSummary.ambiguityExposure,
    firstAmbiguousOffset: constraintSummary.decisionGeometry.firstAmbiguousOffset,
    firstFailOffset: constraintSummary.decisionGeometry.firstFailOffset,
    thresholdGeometryClass: constraintSummary.decisionGeometry.thresholdGeometryClass,
    finalObjectiveStatus: constraintSummary.decisionGeometry.finalObjectiveStatus,
    knifeEdgeReducibility: constraintSummary.decisionGeometry.knifeEdgeReducibility,
    dominantConstraintStability: constraintSummary.decisionGeometry.stableExclusiveDominance
      ? 'stable_exclusive'
      : constraintSummary.decisionGeometry.dominantStableAcrossFocusedSweep
      ? 'stable_mixed'
      : 'unstable_or_shared',
    criticalPassBoundaryOffset: constraintSummary.decisionGeometry.criticalPassBoundaryOffset,
    criticalFailBoundaryOffset: constraintSummary.decisionGeometry.criticalFailBoundaryOffset,
    ambiguityZoneWidth: constraintSummary.decisionGeometry.ambiguityZoneWidth,
    firstFocusedAmbiguousOffset: constraintSummary.decisionGeometry.firstFocusedAmbiguousOffset,
    firstFocusedFailOffset: constraintSummary.decisionGeometry.firstFocusedFailOffset,
    internalizedDenseSweep: true,
    requiresExternalDenseStress: false,
    residualExternalDependence: 'final_claim_ledger_epistemic_promotion_only',
    admissibilityStatus: verdict?.status || 'UNKNOWN',
    evidenceScope: 'INTERNAL_SUPPORT_ONLY'
  };

  return {
    version: P503_THRESHOLD_RUNTIME_VERSION,
    maturity: runtimePath,
    thresholdSpec,
    profiles: orderedRows,
    constraintSummary,
    closureSummary,
    externalMaterializationDependencies: [
      'final claim-ledger epistemic promotion remains outside runtime'
    ],
    notes: [
      'This runtime path internalizes the local threshold geometry of P5-03 without promoting the claim epistemically.',
      'Knife-edge classification is based on invariant margins under nearby threshold profiles, a dominant-invariant micro-sweep, and a focused boundary sweep around the pass-to-fail transition.',
      'Constraint diagnostics now expose the dominant invariant, support mode, threshold geometry, focused boundary width, and final objective status inside the canonical runtime chain.'
    ]
  };
};

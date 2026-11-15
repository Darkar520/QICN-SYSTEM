import { CANON_CLAIM_CATALOG, CANON_INVARIANT_CATALOG } from './canonicalClaimCatalog.js';
import { buildCanonicalLineage } from '../provenance/CanonicalProvenance.js';
import { buildCanonicalInvariantPackage, flattenInvariantScores } from '../invariants/CanonicalInvariantPackage.js';
import { createBoundaryFamilyFromRuntimeTrajectory, evaluateBoundaryProbeFamily } from '../boundary/BoundaryProbeScaffold.js';
import { P503_THRESHOLD_RUNTIME_VERSION, evaluateP503ThresholdRuntime } from '../thresholds/P503ThresholdRuntime.js';

const READINESS_RANK = Object.freeze({
  INSUFFICIENT_FOR_CLAIM_CLOSING: 0,
  PARTIAL_RUNTIME_CLOSURE: 1,
  PARTIAL_RUNTIME_PATH: 2,
  PARTIAL_RUNTIME_PATH_CLOSURE_STRENGTHENED: 3,
  NEAR_CLAIM_CLOSING_RUNTIME_EVIDENCE: 4,
  CLAIM_CLOSING_READY_RUNTIME_EVIDENCE: 5
});

const rankReadiness = (runtime = {}) => {
  const closure = runtime?.closureSummary || {};
  return Math.max(
    READINESS_RANK[closure.claimClosingReadiness] || 0,
    READINESS_RANK[closure.readiness] || 0
  );
};

const selectRuntimePath = ({ localRuntime = null, canonicalRuntime = null, pathId = 'runtime_path' } = {}) => {
  // A caller-provided object does not establish provenance, artifact integrity,
  // or applicability to this run. Keep it for audit but never promote it.
  return {
    selected: 'local',
    runtime: localRuntime,
    localRuntime,
    canonicalRuntime,
    selectedRank: rankReadiness(localRuntime),
    canonicalRank: 0,
    notes: [canonicalRuntime
      ? `${pathId}: supplied boundary object is unverified and was not selected.`
      : `${pathId}: canonical runtime evidence not provided; local runtime path retained.`]
  };
};

const buildSubstrateRuntimeAwaitingPairFamily = ({ header = {}, externalEvidence = {} } = {}) => ({
  familyId: `${header?.runId || 'run'}_substrate_pair_family_required`,
  description: 'A verified canonical pair family is required; none has been verified for this run-level projection.',
  maturity: 'PARTIAL_RUNTIME_PATH',
  pairs: [],
  thresholds: null,
  closureSummary: {
    positivePassCount: 0,
    negativeFailCount: 0,
    snoSupportedCount: 0,
    roeoSupportedCount: 0,
    supportInterpretation: 'runtime_substrate_pair_family_required',
    readiness: 'PARTIAL_RUNTIME_PATH',
    claimClosingReadiness: 'INSUFFICIENT_FOR_CLAIM_CLOSING',
    evidenceSeparation: {
      runtimeEvidence: 'native_invariant_runtime_ready',
      finalClaimClosure: 'canonical_pair_family_and_outer_release_promotion_still_required'
    },
    familyConvergence: 'PAIR_FAMILY_REQUIRED',
    evidenceAvailability: {
      runtimeSubstrateFamilyProvided: Boolean(externalEvidence?.runtimeSubstrateFamily || externalEvidence?.operationalEquivalence?.runtime_substrate_family),
      runtimeSubstrateFamilyVerified: false,
      operationalEquivalenceProvided: Boolean(externalEvidence?.operationalEquivalence)
    }
  },
  externalMaterializationDependencies: [
      'verified canonical pair family still required for substrate closure',
    'final substrate claim-ledger promotion remains outside runtime',
    'campaign-level ROEO/SNO batch closure still remains external'
  ],
  notes: [
    'Caller-supplied pair families are not promoted without provenance and integrity verification.',
    'No same-run synthetic positive or negative pairs are created by this mapping.'
  ]
});

const buildSubstrateRuntime = ({ header = {}, externalEvidence = {} } = {}) => {
  // Pair-family contents and provenance are not verified at this boundary.
  return buildSubstrateRuntimeAwaitingPairFamily({ header, externalEvidence });
};

const buildBoundaryRuntime = ({ header = {}, summary = {}, verdict = {}, ticks = [], externalEvidence = {} } = {}) => {
  const boundaryFamily = createBoundaryFamilyFromRuntimeTrajectory({
    familyId: `${header?.runId || 'run'}_native_boundary`,
    description: 'Native runtime boundary ladder derived from observed tick-window invariant trajectories.',
    header,
    summary,
    verdict,
    ticks,
    targetedInvariant: 'I_ri'
  });
  const localRuntime = evaluateBoundaryProbeFamily({ family: boundaryFamily });
  const canonicalRuntime = externalEvidence?.runtimeBoundaryRuntime || null;
  const selection = selectRuntimePath({
    localRuntime,
    canonicalRuntime,
    pathId: 'boundary_runtime'
  });
  return {
    boundaryFamily,
    boundaryRuntimeLocal: localRuntime,
    boundaryRuntimeCanonical: canonicalRuntime,
    boundaryRuntimeSelection: selection,
    boundaryRuntime: selection.runtime
  };
};

const buildReleaseMaterializationMap = ({ boundaryFamily, p503ThresholdRuntime }) => {
  const internalized = [
    'invariant_package',
    'claim_mapping_snapshot',
    'boundary_runtime',
    'p5_03_threshold_runtime',
    'full_native_invariant_status',
    'claim_closure_runtime_diagnostics',
    'runtime_claim_projection'
  ];
  if (boundaryFamily?.members?.length) {
    internalized.push('boundary_runtime_family_from_ticks', 'boundary_runtime_window_members');
  }

  const externalized = [
    'final_claim_ledger_epistemic_promotion',
    'campaign_level_roeo_sno_batch_closure'
  ];
  externalized.push('verified_canonical_substrate_pair_family');
  if (p503ThresholdRuntime?.closureSummary?.requiresExternalDenseStress !== false) {
    externalized.push('denser_external_threshold_stress');
  }

  return {
    internalized,
    externalized,
    notes: [
      'Boundary runtime uses eligible recorded tick windows; caller-supplied fallback objects are not verified or promoted.',
      'Substrate pair families require provenance and integrity verification before this mapping can consume them.',
      'External release-facing closure still exists only at frozen claim-ledger promotion and campaign-batch ROEO/SNO closure.'
    ]
  };
};

export const deriveCanonicalInvariantSignals = ({ header = {}, summary = {}, verdict = {}, ticks = [] } = {}) =>
  buildCanonicalInvariantPackage({ header, summary, verdict, ticks }).invariants;

export const buildCanonicalClaimMappingSnapshot = ({
  header = {},
  summary = {},
  verdict = {},
  ticks = [],
  externalEvidence = {}
} = {}) => {
  const invariantPackage = buildCanonicalInvariantPackage({ header, summary, verdict, ticks });
  const boundaryBundle = buildBoundaryRuntime({ header, summary, verdict, ticks, externalEvidence });
  const substrateRuntime = buildSubstrateRuntime({ header, externalEvidence });
  const p503ThresholdRuntime = evaluateP503ThresholdRuntime({
    invariantPackage,
    summary,
    verdict
  });

  const fullNativeInvariantStatus = Object.fromEntries(
    Object.entries(invariantPackage.invariants).map(([id, record]) => [id, {
      maturity: record.maturity,
      supportMode: record?.provenance?.supportMode || 'unspecified',
      scoreEvidenceStatus: record?.provenance?.scoreEvidenceStatus || 'not_evaluated',
      residualDependencies: record?.provenance?.residualDependencies || [],
      judgeDependent: Boolean(record?.judgeDependent)
    }])
  );

  const claimClosingRuntime = {
    boundary: {
      readiness: boundaryBundle.boundaryRuntime?.closureSummary?.readiness || 'PARTIAL_RUNTIME_PATH',
      claimClosingReadiness: boundaryBundle.boundaryRuntime?.closureSummary?.claimClosingReadiness || 'INSUFFICIENT_FOR_CLAIM_CLOSING',
      supportInterpretation: boundaryBundle.boundaryRuntime?.closureSummary?.supportInterpretation || 'runtime_boundary_unresolved',
      selectedSource: boundaryBundle.boundaryRuntimeSelection?.selected || 'local'
    },
    substrate: {
      readiness: substrateRuntime?.closureSummary?.readiness || 'PARTIAL_RUNTIME_PATH',
      claimClosingReadiness: substrateRuntime?.closureSummary?.claimClosingReadiness || 'INSUFFICIENT_FOR_CLAIM_CLOSING',
      supportInterpretation: substrateRuntime?.closureSummary?.supportInterpretation || 'runtime_substrate_unresolved'
    },
    thresholdRobustness: {
      readiness: p503ThresholdRuntime?.closureSummary?.runtimePath || 'PARTIAL_RUNTIME_PATH',
      claimClosingReadiness: p503ThresholdRuntime?.closureSummary?.claimClosingReadiness || 'INSUFFICIENT_FOR_CLAIM_CLOSING',
      supportInterpretation: p503ThresholdRuntime?.closureSummary?.supportInterpretation || 'runtime_threshold_unresolved'
    }
  };

  const runtimeClaimProjection = {
    P5_01: {
      runtimePath: boundaryBundle.boundaryRuntime?.closureSummary?.readiness || 'PARTIAL_RUNTIME_PATH',
      claimClosingReadiness: boundaryBundle.boundaryRuntime?.closureSummary?.claimClosingReadiness || 'INSUFFICIENT_FOR_CLAIM_CLOSING',
      supportInterpretation: boundaryBundle.boundaryRuntime?.closureSummary?.supportInterpretation || 'runtime_boundary_unresolved',
      evidenceOrigin: boundaryBundle.boundaryRuntimeSelection?.selected || 'local',
      firstFailingInvariant: boundaryBundle.boundaryRuntime?.closureSummary?.firstFailingInvariant || null,
      closureCleanliness: boundaryBundle.boundaryRuntime?.closureSummary?.cleanliness || 'unknown',
      evidenceScope: 'INTERNAL_SUPPORT_ONLY'
    },
    P5_02: {
      runtimePath: substrateRuntime?.closureSummary?.readiness || 'PARTIAL_RUNTIME_PATH',
      claimClosingReadiness: substrateRuntime?.closureSummary?.claimClosingReadiness || 'INSUFFICIENT_FOR_CLAIM_CLOSING',
      supportInterpretation: substrateRuntime?.closureSummary?.supportInterpretation || 'runtime_substrate_unresolved',
      familyConvergence: substrateRuntime?.closureSummary?.familyConvergence || 'PAIR_FAMILY_REQUIRED',
      pairCount: Array.isArray(substrateRuntime?.pairs) ? substrateRuntime.pairs.length : 0,
      evidenceScope: 'INTERNAL_SUPPORT_ONLY'
    },
    P5_03: {
      runtimePath: p503ThresholdRuntime?.closureSummary?.runtimePath || 'PARTIAL_RUNTIME_PATH',
      claimClosingReadiness: p503ThresholdRuntime?.closureSummary?.claimClosingReadiness || 'INSUFFICIENT_FOR_CLAIM_CLOSING',
      supportInterpretation: p503ThresholdRuntime?.closureSummary?.supportInterpretation || 'runtime_threshold_partial',
      finalObjectiveStatus: p503ThresholdRuntime?.closureSummary?.finalObjectiveStatus || null,
      dominantInvariant: p503ThresholdRuntime?.closureSummary?.dominantInvariant || null,
      dominantInvariantSupportMode: p503ThresholdRuntime?.closureSummary?.dominantInvariantSupportMode || null,
      dominantInvariantMaturity: p503ThresholdRuntime?.closureSummary?.dominantInvariantMaturity || null,
      dominantConstraintStability: p503ThresholdRuntime?.closureSummary?.dominantConstraintStability || null,
      knifeEdgeLocalized: Boolean(p503ThresholdRuntime?.closureSummary?.knifeEdgeLocalized),
      knifeEdgeReducibility: p503ThresholdRuntime?.closureSummary?.knifeEdgeReducibility || null,
      thresholdGeometryClass: p503ThresholdRuntime?.closureSummary?.thresholdGeometryClass || null,
      criticalPassBoundaryOffset: p503ThresholdRuntime?.closureSummary?.criticalPassBoundaryOffset ?? null,
      criticalFailBoundaryOffset: p503ThresholdRuntime?.closureSummary?.criticalFailBoundaryOffset ?? null,
      ambiguityZoneWidth: p503ThresholdRuntime?.closureSummary?.ambiguityZoneWidth ?? null,
      firstAmbiguousOffset: p503ThresholdRuntime?.closureSummary?.firstAmbiguousOffset ?? null,
      firstFailOffset: p503ThresholdRuntime?.closureSummary?.firstFailOffset ?? null,
      firstFocusedAmbiguousOffset: p503ThresholdRuntime?.closureSummary?.firstFocusedAmbiguousOffset ?? null,
      firstFocusedFailOffset: p503ThresholdRuntime?.closureSummary?.firstFocusedFailOffset ?? null,
      residualExternalDependence: p503ThresholdRuntime?.closureSummary?.residualExternalDependence || (
        p503ThresholdRuntime?.closureSummary?.requiresExternalDenseStress === false
          ? 'final_claim_ledger_epistemic_promotion_only'
          : 'final_claim_ledger_epistemic_promotion_plus_external_dense_threshold_stress'
      ),
      evidenceScope: 'INTERNAL_SUPPORT_ONLY'
    },
    P5_04: {
      runtimePath: boundaryBundle.boundaryRuntime?.closureSummary?.readiness || 'PARTIAL_RUNTIME_PATH',
      claimClosingReadiness: boundaryBundle.boundaryRuntime?.closureSummary?.claimClosingReadiness || 'INSUFFICIENT_FOR_CLAIM_CLOSING',
      supportInterpretation: boundaryBundle.boundaryRuntime?.closureSummary?.supportInterpretation || 'runtime_boundary_unresolved',
      evidenceOrigin: boundaryBundle.boundaryRuntimeSelection?.selected || 'local',
      firstFailingInvariant: boundaryBundle.boundaryRuntime?.closureSummary?.firstFailingInvariant || null,
      closureCleanliness: boundaryBundle.boundaryRuntime?.closureSummary?.cleanliness || 'unknown',
      evidenceScope: 'INTERNAL_SUPPORT_ONLY'
    },
    P5_05: {
      runtimePath: 'PARTIAL_RUNTIME_PATH',
      claimClosingReadiness: 'INSUFFICIENT_FOR_CLAIM_CLOSING',
      supportInterpretation: 'batch_negative_controls_not_consumed',
      evidenceScope: 'INTERNAL_SUPPORT_ONLY'
    },
    P5_06: {
      runtimePath: substrateRuntime?.closureSummary?.readiness || 'PARTIAL_RUNTIME_PATH',
      claimClosingReadiness: substrateRuntime?.closureSummary?.claimClosingReadiness || 'INSUFFICIENT_FOR_CLAIM_CLOSING',
      supportInterpretation: substrateRuntime?.closureSummary?.supportInterpretation || 'runtime_substrate_unresolved',
      familyConvergence: substrateRuntime?.closureSummary?.familyConvergence || 'PAIR_FAMILY_REQUIRED',
      pairCount: Array.isArray(substrateRuntime?.pairs) ? substrateRuntime.pairs.length : 0,
      evidenceScope: 'INTERNAL_SUPPORT_ONLY'
    }
  };

  const releaseMaterializationMap = buildReleaseMaterializationMap({
    boundaryFamily: boundaryBundle.boundaryFamily,
    p503ThresholdRuntime,
  });

  return {
    lineage: buildCanonicalLineage({
      freezeRef: header?.freezeRef || null,
      thresholdRuntimeLayerVersion: P503_THRESHOLD_RUNTIME_VERSION,
      evidenceScope: 'INTERNAL_SUPPORT_ONLY'
    }),
    invariantPackage,
    invariants: invariantPackage.invariants,
    invariantScores: flattenInvariantScores(invariantPackage),
    invariantCatalog: CANON_INVARIANT_CATALOG,
    claimCatalog: CANON_CLAIM_CATALOG,
    boundaryFamily: boundaryBundle.boundaryFamily,
    boundaryRuntimeLocal: boundaryBundle.boundaryRuntimeLocal,
    boundaryRuntimeCanonical: boundaryBundle.boundaryRuntimeCanonical,
    boundaryRuntimeSelection: boundaryBundle.boundaryRuntimeSelection,
    boundaryRuntime: boundaryBundle.boundaryRuntime,
    substrateRuntime,
    p503ThresholdRuntime,
    fullNativeInvariantStatus,
    claimClosingRuntime,
    runtimeClaimProjection,
    releaseMaterializationMap,
    externalEvidenceSummary: {
      runtimeBoundaryProvided: Boolean(externalEvidence?.runtimeBoundaryRuntime),
      runtimeBoundaryVerified: false,
      runtimeSubstrateFamilyProvided: Boolean(externalEvidence?.runtimeSubstrateFamily || externalEvidence?.operationalEquivalence?.runtime_substrate_family),
      runtimeSubstrateFamilyVerified: false,
      operationalEquivalenceProvided: Boolean(externalEvidence?.operationalEquivalence),
      snoProvided: Boolean(externalEvidence?.snoReport)
    },
    runtimeCoverage: {
      P5_01: boundaryBundle.boundaryRuntime?.closureSummary?.readiness || 'PARTIAL_RUNTIME_PATH',
      P5_02: substrateRuntime?.closureSummary?.readiness || 'PARTIAL_RUNTIME_PATH',
      P5_03: p503ThresholdRuntime?.closureSummary?.runtimePath || 'PARTIAL_RUNTIME_PATH',
      P5_04: boundaryBundle.boundaryRuntime?.closureSummary?.readiness || 'PARTIAL_RUNTIME_PATH',
      P5_05: 'PARTIAL_RUNTIME_PATH',
      P5_06: substrateRuntime?.closureSummary?.readiness || 'PARTIAL_RUNTIME_PATH'
    },
    notes: [
      'This file is a native runtime mapping layer, not a replacement for the frozen claim ledger.',
      'Boundary runtime exposes closure-facing summaries only for eligible tick windows; unverified caller-supplied boundary results are not promoted.',
      'Supplied substrate families are not promoted until provenance and integrity can be verified.',
      'P5-03 keeps a dedicated runtime threshold path that localizes knife-edge behavior inside the canonical chain.',
      'P5-05 cannot assert batch-negative-control readiness: this projection does not consume the required batch reports.',
      'All empirical support remains INTERNAL_SUPPORT_ONLY.'
    ]
  };
};




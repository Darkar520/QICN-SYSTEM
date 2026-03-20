import { CANON_CLAIM_CATALOG, CANON_INVARIANT_CATALOG } from './canonicalClaimCatalog.js';
import { buildCanonicalLineage } from '../provenance/CanonicalProvenance.js';
import { buildCanonicalInvariantPackage, flattenInvariantScores } from '../invariants/CanonicalInvariantPackage.js';
import { createBoundaryFamilyFromRuntimeTrajectory, evaluateBoundaryProbeFamily } from '../boundary/BoundaryProbeScaffold.js';
import { evaluateSubstratePairFamily } from '../substrate/SubstrateEquivalenceScaffold.js';
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
  if (!canonicalRuntime) {
    return {
      selected: 'local',
      runtime: localRuntime,
      localRuntime,
      canonicalRuntime: null,
      selectedRank: rankReadiness(localRuntime),
      canonicalRank: 0,
      notes: [`${pathId}: canonical runtime evidence not provided; local runtime path retained.`]
    };
  }

  const localRank = rankReadiness(localRuntime);
  const canonicalRank = rankReadiness(canonicalRuntime);
  const useCanonical = canonicalRank > localRank;
  return {
    selected: useCanonical ? 'canonical' : 'local',
    runtime: useCanonical ? canonicalRuntime : localRuntime,
    localRuntime,
    canonicalRuntime,
    selectedRank: useCanonical ? canonicalRank : localRank,
    canonicalRank,
    notes: useCanonical
      ? [`${pathId}: canonical runtime evidence selected because it is stronger than the current run-local path.`]
      : [`${pathId}: local runtime path retained because it is at least as strong as the canonical fallback.`]
  };
};

const buildSubstrateRuntimeAwaitingPairFamily = ({ header = {}, externalEvidence = {} } = {}) => ({
  familyId: `${header?.runId || 'run'}_substrate_pair_family_required`,
  description: 'Runtime substrate semantics are ready to consume a canonical pair family, but none was supplied for this run-level projection.',
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
      runtimeSubstrateFamilyProvided: false,
      operationalEquivalenceProvided: Boolean(externalEvidence?.operationalEquivalence)
    }
  },
  externalMaterializationDependencies: [
    'canonical pair family still required for substrate closure',
    'final substrate claim-ledger promotion remains outside runtime',
    'campaign-level ROEO/SNO batch closure still remains external'
  ],
  notes: [
    'The runtime no longer fabricates synthetic positive/negative substrate pairs when no canonical pair family is available.',
    'This state is more literal to the runtime than the previous same-run hardcoded-delta fallback.'
  ]
});

const buildSubstrateRuntime = ({ header = {}, externalEvidence = {} } = {}) => {
  const runtimeSubstrateFamily = externalEvidence?.runtimeSubstrateFamily
    || externalEvidence?.operationalEquivalence?.runtime_substrate_family
    || null;
  if (!runtimeSubstrateFamily) {
    return buildSubstrateRuntimeAwaitingPairFamily({ header, externalEvidence });
  }
  return evaluateSubstratePairFamily({ family: runtimeSubstrateFamily });
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

const buildReleaseMaterializationMap = ({ boundaryFamily, boundarySelection, substrateRuntime, p503ThresholdRuntime, externalEvidence = {} }) => {
  const internalized = [
    'invariant_package',
    'claim_mapping_snapshot',
    'boundary_runtime',
    'boundary_runtime_family_from_ticks',
    'p5_03_threshold_runtime',
    'full_native_invariant_status',
    'claim_closure_runtime_diagnostics',
    'runtime_claim_projection'
  ];
  if (boundaryFamily?.members?.length) internalized.push('boundary_runtime_window_members');
  if (boundarySelection?.selected === 'canonical') internalized.push('canonical_boundary_runtime_fallback');
  if ((externalEvidence?.runtimeSubstrateFamily || externalEvidence?.operationalEquivalence?.runtime_substrate_family)) {
    internalized.push('runtime_substrate_family');
    internalized.push('substrate_runtime');
  }

  const externalized = [
    'final_claim_ledger_epistemic_promotion',
    'campaign_level_roeo_sno_batch_closure'
  ];
  if (!(externalEvidence?.runtimeSubstrateFamily || externalEvidence?.operationalEquivalence?.runtime_substrate_family)) {
    externalized.push('canonical_substrate_pair_family');
  }
  if (p503ThresholdRuntime?.closureSummary?.requiresExternalDenseStress !== false) {
    externalized.push('denser_external_threshold_stress');
  }

  return {
    internalized,
    externalized,
    notes: [
      'Boundary runtime is now derived from actual tick-window invariant trajectories and can consume a stronger canonical runtime fallback when the current run is non-diagnostic.',
      'Substrate runtime consumes canonical ROEO/SNO runtime families when available and otherwise reports pair-family absence explicitly instead of fabricating same-run positives/negatives.',
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
      runtimePath: 'RUNTIME_READY',
      claimClosingReadiness: 'CLAIM_CLOSING_READY_RUNTIME_EVIDENCE',
      supportInterpretation: 'runtime_negative_control_ready',
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
    boundarySelection: boundaryBundle.boundaryRuntimeSelection,
    substrateRuntime,
    p503ThresholdRuntime,
    externalEvidence
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
      runtimeSubstrateFamilyProvided: Boolean(externalEvidence?.runtimeSubstrateFamily),
      operationalEquivalenceProvided: Boolean(externalEvidence?.operationalEquivalence),
      snoProvided: Boolean(externalEvidence?.snoReport)
    },
    runtimeCoverage: {
      P5_01: boundaryBundle.boundaryRuntime?.closureSummary?.readiness || 'PARTIAL_RUNTIME_PATH',
      P5_02: substrateRuntime?.closureSummary?.readiness || 'PARTIAL_RUNTIME_PATH',
      P5_03: p503ThresholdRuntime?.closureSummary?.runtimePath || 'PARTIAL_RUNTIME_PATH',
      P5_04: boundaryBundle.boundaryRuntime?.closureSummary?.readiness || 'PARTIAL_RUNTIME_PATH',
      P5_05: 'RUNTIME_READY',
      P5_06: substrateRuntime?.closureSummary?.readiness || 'PARTIAL_RUNTIME_PATH'
    },
    notes: [
      'This file is a native runtime mapping layer, not a replacement for the frozen claim ledger.',
      'Boundary runtime now exposes closure-facing summaries derived from observed tick-window trajectories and can fall back to stronger canonical runtime boundary evidence when the current run is non-diagnostic.',
      'Substrate runtime now prefers canonical ROEO/SNO runtime families and no longer fabricates same-run positive/negative pair evidence when none is supplied.',
      'P5-03 keeps a dedicated runtime threshold path that localizes knife-edge behavior inside the canonical chain.',
      'All empirical support remains INTERNAL_SUPPORT_ONLY.'
    ]
  };
};




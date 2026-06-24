export { CANON_RUNTIME_SOURCE_OF_TRUTH, CANON_LEGACY_PATH_DECISIONS, summarizeSourceOfTruthDecision } from './sourceOfTruth.js';
export { buildCanonicalInvariantPackage, flattenInvariantScores } from './invariants/CanonicalInvariantPackage.js';
export { CANON_CLAIM_CATALOG, CANON_INVARIANT_CATALOG } from './claimMapping/canonicalClaimCatalog.js';
export { deriveCanonicalInvariantSignals, buildCanonicalClaimMappingSnapshot } from './claimMapping/runtimeClaimMapping.js';
export { buildCanonicalLineage, ensureCanonicalVersionHash } from './provenance/CanonicalProvenance.js';
export { validateInvariantWeights, calibrateOrFreeze, fitConstrainedWeights } from './calibration/InvariantWeightCalibration.js';
export { computeBehavioralDistance, computeInterventionResponseDistance, estimateDistanceUncertainty } from './metrics/BehavioralPseudometric.js';
export { registerQuantity, getQuantity, validateDimensionalExpression, buildDimensionalAuditReport, resetDimensionalRegistry } from './units/DimensionalRegistry.js';
export { evaluateFiniteProjection } from './finite_horizon/FiniteProjectionEvaluator.js';
export { buildApproximationBarrierReport, assertFiniteHorizonClaimBoundary } from './finite_horizon/ApproximationBarrierReport.js';
export { P503_THRESHOLD_RUNTIME_VERSION, DEFAULT_P503_THRESHOLD_SPEC, evaluateP503ThresholdRuntime } from './thresholds/P503ThresholdRuntime.js';
export { BOUNDARY_PROBE_SCAFFOLD_VERSION, BOUNDARY_RUNTIME_VERSION, BOUNDARY_DEFAULT_THRESHOLDS, buildBoundaryProbeFamily, buildBoundaryProbeTrace, evaluateBoundaryProbeMember, evaluateBoundaryProbeFamily, createBoundaryFamilyFromInvariantPackage, createBoundaryFamilyFromRuntimeTrajectory } from './boundary/BoundaryProbeScaffold.js';
export { SUBSTRATE_EQUIVALENCE_SCAFFOLD_VERSION, SUBSTRATE_RUNTIME_VERSION, SUBSTRATE_DEFAULT_THRESHOLDS, buildSubstratePairFamily, buildSubstrateDecisionEnvelope, evaluateSubstratePairEvidence, evaluateSubstratePairFamily } from './substrate/SubstrateEquivalenceScaffold.js';
export { resetInterventionRegistry, registerIntervention, getIntervention, listInterventions } from './interventions/InterventionRegistry.js';
// Bridge Phase 4: public surface for the theory<->runtime traceability estimators
// (referenced by docs/bridge_traceability_map.v1.json). RALSI finite proxies.
export { METRIC_PROJECTION_BOUNDARY, projectOntoAdmissibleSet, verifyNonExpansive, buildProjectionCertificate } from './projection/MetricProjectionOperator.js';
export { ONTOLOGICAL_MASS_BOUNDARY, estimateOntologicalMassLowerBound } from './ontological_mass/OntologicalMassEstimator.js';
export { CCR_BOUNDARY, CCR_LEVELS, classifyCCRApproximation } from './ccr/CCRApproximationBoundary.js';
export { CCC_OMEGA_BOUNDARY, evaluateCCCOmegaCoupling } from './coupling/CCCOmegaCouplingProtocol.js';

import heuristicFrozenV1 from './calibration/heuristic_frozen_v1.json' with { type: 'json' };
export { heuristicFrozenV1 };
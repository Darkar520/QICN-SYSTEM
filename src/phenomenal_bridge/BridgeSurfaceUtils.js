import {
  getPhenomenalBridgeArtifactSpec,
  PHENOMENAL_BRIDGE_PROTOCOL
} from './PhenomenalBridgeArtifactRegistry.js';

export const PHENOMENAL_BRIDGE_LAYER_VERSION =
  'phenomenal_bridge_formal_layer.bpf1.surfaces.v1';
export const PHENOMENAL_BRIDGE_RUNTIME_STATUS =
  'implemented_internal_provisional_bridge_surfaces_pre_comparator_pre_intervention_pre_gate';
export const PHENOMENAL_BRIDGE_IMPLEMENTATION_STATUS = 'bpf1_surface_only';
export const PHENOMENAL_BRIDGE_ESTIMATOR_STATUS = 'provisional_runtime_bridge_estimator';
export const PHENOMENAL_BRIDGE_ESTIMATOR_VERSION = 'phenomenal_bridge_surfaces.bpf1.v1';
export const PHENOMENAL_BRIDGE_BOUNDARY_FLAGS = Object.freeze({
  framework_internal_only: true,
  provisional_bridge_estimator: true,
  not_bridge_support: true,
  not_phenomenality_evidence: true
});
export const PHENOMENAL_BRIDGE_INTERPRETATION_BOUNDARY =
  'Framework-internal only; BPF-1 emits provisional bridge coordinate reports derived from upstream subjectivity artifacts. These reports are not bridge support, not bridge admissibility, not comparator closure, not intervention closure, not gate closure, not phenomenality evidence, not human equivalence, and not Paper 9 authorization.';

const hasFiniteNumber = (value) => Number.isFinite(Number(value));

export const clamp01 = (value) => {
  if (!hasFiniteNumber(value)) return 0;
  return Math.min(1, Math.max(0, Number(value)));
};

export const asNumber = (value, fallback = 0) => (hasFiniteNumber(value) ? Number(value) : fallback);

export const mean = (values) => {
  const numbers = values.filter((value) => hasFiniteNumber(value)).map(Number);
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
};

export const normalizeAgainstCap = (value, cap) => {
  if (!hasFiniteNumber(cap) || Number(cap) <= 0) return 0;
  return clamp01(asNumber(value) / Number(cap));
};

export const normalizeDifference = (lhs, rhs, cap) => {
  if (!hasFiniteNumber(cap) || Number(cap) <= 0) return 0;
  return clamp01((asNumber(lhs) - asNumber(rhs)) / Number(cap));
};

export const normalizedCount = (count, cap) => {
  if (!hasFiniteNumber(cap) || Number(cap) <= 0) return 0;
  return clamp01(asNumber(count) / Number(cap));
};

export const uniqueStrings = (values) =>
  [...new Set(values.filter((value) => typeof value === 'string' && value.length > 0))];

export const getContinuitySignals = (continuityReport) => {
  const signals = Array.isArray(continuityReport?.supporting_signals)
    ? continuityReport.supporting_signals
    : [];
  const privileged = signals[0] || null;
  const rival = signals[1] || null;
  return { privileged, rival };
};

export const getSelfIndexCandidate = (selfIndexReport) => {
  const candidates = Array.isArray(selfIndexReport?.self_index_candidates)
    ? selfIndexReport.self_index_candidates
    : [];
  return (
    candidates.find(
      (candidate) => candidate?.candidate_index === selfIndexReport?.selected_index
    ) || candidates[0] || null
  );
};

export const buildReportProvenance = ({
  artifactName,
  runId,
  upstreamRefs,
  inputProfile,
  sourceTraceRef
}) => ({
  generated_at: new Date().toISOString(),
  protocol_ref: 'docs/phenomenal_bridge_protocol.v1.json',
  surface_policy_ref: 'docs/phenomenal_bridge_surface_policy.v1.json',
  artifact_schema_ref: 'docs/phenomenal_bridge_artifact_schema.v1.json',
  upstream_refs: upstreamRefs,
  input_profile: inputProfile,
  source_trace_ref: sourceTraceRef,
  bridge_estimator_version: PHENOMENAL_BRIDGE_ESTIMATOR_VERSION,
  bridge_layer_version: PHENOMENAL_BRIDGE_LAYER_VERSION,
  emitted_artifact: artifactName,
  run_id: runId
});

export const createBridgeReport = ({
  artifactName,
  runId,
  predicateId,
  predicateName,
  runtimeSurface,
  bridgeRole,
  estimate,
  componentScores,
  transformationLogic,
  upstreamDependencies,
  fieldsUsed,
  bridgeSpecificStructure,
  uncertaintyMarkers,
  warnings,
  collapseRisks,
  collapseStatus,
  nonImplications,
  provenance
}) => {
  const artifactSpec = getPhenomenalBridgeArtifactSpec(artifactName);
  if (!artifactSpec) {
    throw new Error(`Unknown bridge artifact spec for ${artifactName}`);
  }

  return {
    artifact_role: artifactSpec.id,
    artifact_name: artifactName,
    artifact_version: '1.0.0',
    schema_version: '1.0.0',
    layer_version: PHENOMENAL_BRIDGE_LAYER_VERSION,
    paper_source: PHENOMENAL_BRIDGE_PROTOCOL.paper_source,
    runtime_status: PHENOMENAL_BRIDGE_RUNTIME_STATUS,
    run_id: runId,
    predicate_id: predicateId,
    predicate_name: predicateName,
    runtime_surface: runtimeSurface,
    bridge_role: bridgeRole,
    artifact_class: artifactSpec.artifact_class,
    level: artifactSpec.level,
    authoritative_status: artifactSpec.authoritative_status,
    estimator_status: PHENOMENAL_BRIDGE_ESTIMATOR_STATUS,
    provisional_estimate: clamp01(estimate),
    component_scores: componentScores,
    transformation_logic: transformationLogic,
    upstream_dependencies: upstreamDependencies,
    fields_used: fieldsUsed,
    bridge_specific_structure: bridgeSpecificStructure,
    uncertainty_markers: uniqueStrings(uncertaintyMarkers),
    warnings: uniqueStrings(warnings),
    collapse_risks: uniqueStrings(collapseRisks),
    collapse_status: collapseStatus,
    boundary_flags: PHENOMENAL_BRIDGE_BOUNDARY_FLAGS,
    non_implications: uniqueStrings([
      ...artifactSpec.non_implications,
      ...(Array.isArray(nonImplications) ? nonImplications : [])
    ]),
    allowed_surfaces: artifactSpec.allowed_surfaces,
    blocked_surfaces: artifactSpec.blocked_surfaces,
    implementation_status: PHENOMENAL_BRIDGE_IMPLEMENTATION_STATUS,
    interpretation_boundary: PHENOMENAL_BRIDGE_INTERPRETATION_BOUNDARY,
    provenance,
    schema_ref: `src/phenomenal_bridge/schemas/${artifactSpec.id}.v1.json`
  };
};

import fs from 'fs';
import path from 'path';
import {
  BRIDGE_SYSTEM_FILES,
  ECOSYSTEM_BRIDGE_ARTIFACT_REFS,
  PROJECT_ROOT,
  ROOT_BRIDGE_ARTIFACT_REFS,
  asNumber,
  captureBridgeLineage,
  checkSurfaceEligibility,
  compareLineage,
  containsLocalPathLeak,
  getRepoState,
  mean,
  readJson,
  writeJson,
  RELEASE_ROOT
} from './PhenomenalBridgeRuntimeUtils.js';
import { PHENOMENAL_BRIDGE_SURFACE_POLICY } from './PhenomenalBridgeSurfacePolicy.js';

const ECOSYSTEM_LAYER_VERSION = 'phenomenal_bridge_formal_layer.bpfm3.ecosystem.v1';
const ECOSYSTEM_ESTIMATOR_VERSION = 'phenomenal_bridge_ecosystem_integrator.bpfm3.v1';
const ECOSYSTEM_RUNTIME_STATUS = 'implemented_internal_bridge_ecosystem_hardening_in_bpfm3';

const CONDITION_BOUNDARY =
  'Framework-internal only; bridge condition summary is a bounded internal aggregation object, not external validation, not human equivalence, not phenomenality proof, and not claim-facing evidence.';
const BATCH_BOUNDARY =
  'Framework-internal only; bridge batch summary is bounded internal comparability and governance metadata, not external validation, not human equivalence, not phenomenality proof, and not claim-facing evidence.';
const CAMPAIGN_BOUNDARY =
  'Framework-internal only; bridge campaign summary is a bounded internal campaign-layer synthesis, not external validation, not human equivalence, not phenomenality proof, and not claim-facing evidence.';
const CANDIDATE_BOUNDARY =
  'Framework-internal only; bridge candidate projection records bounded inclusion for the internal ecosystem candidate, not external validation, not public proof, not phenomenality proof, and not human equivalence.';
const AUDIT_BOUNDARY =
  'Framework-internal only; bridge audit handoff summary is bounded audit-facing guidance, not external validation, not public proof, not phenomenality proof, and not human equivalence.';
const VERIFICATION_BOUNDARY =
  'Framework-internal only; bridge verification matrix is an internal ecosystem hardening artifact, not external validation, not public proof, not phenomenality proof, and not human equivalence.';

const READINESS_CLASSES = Object.freeze([
  'bridge_not_ready',
  'bridge_formalized_only',
  'bridge_internal_admissible',
  'bridge_internal_audit_ready'
]);

const stable = (value) => JSON.stringify(value);

const captureCurrentLineage = () =>
  captureBridgeLineage({
    layerVersion: ECOSYSTEM_LAYER_VERSION,
    estimatorVersion: ECOSYSTEM_ESTIMATOR_VERSION
  });

const checkRunStaleness = (manifest, currentLineage) => {
  const reasons = [];
  const manifestLineage = manifest?.lineage || {};
  for (const [key, label] of [
    ['protocol', 'protocol'],
    ['thresholds', 'thresholds'],
    ['rival_family', 'rival_family'],
    ['surface_policy', 'surface_policy'],
    ['artifact_schema', 'artifact_schema']
  ]) {
    const manifestHash = manifestLineage?.[key]?.sha256 || null;
    const currentHash = currentLineage?.[key]?.sha256 || null;
    if (!manifestHash || !currentHash || manifestHash !== currentHash) {
      reasons.push(`${label}_drift`);
    }
  }
  const rootSchemaCurrent = currentLineage?.root_schema_hashes || {};
  for (const artifactName of Object.keys(rootSchemaCurrent)) {
    const manifestHash = manifestLineage?.root_schema_hashes?.[artifactName]?.sha256 || null;
    const currentHash = rootSchemaCurrent[artifactName]?.sha256 || null;
    if (!manifestHash || !currentHash || manifestHash !== currentHash) {
      reasons.push(`root_schema_drift:${artifactName}`);
    }
  }
  return { invalidated: reasons.length > 0, reasons };
};

const buildRunRecord = (rootBundle, currentLineage) => {
  const projection = rootBundle.projection;
  const gateResult = rootBundle.gate_result;
  const manifest = rootBundle.manifest;
  const stale = checkRunStaleness(manifest, currentLineage);
  const gateClean =
    gateResult.gate_status === 'pass'
    && ![
      'bridge_evaluation_unsupported',
      'bridge_drift_invalidated',
      'bridge_reducible',
      'bridge_interventionally_unstable',
      'bridge_gate_fail',
      'bridge_insufficient_support'
    ].includes(gateResult.classification);

  return {
    run_id: gateResult.run_id,
    condition_id: 'bridge_enabled_baseline',
    gate_status: gateResult.gate_status,
    support_class: gateResult.classification,
    Phi_bpf: projection.bridge_functional.value,
    Gamma_bpf: projection.bridge_gate_preview.value,
    comparator_supported: gateResult.comparator_status?.comparison_supported === true,
    intervention_stable: gateResult.intervention_status?.comparison_supported === true,
    stale,
    refs: rootBundle.refs,
    warnings: [...(gateResult.warnings || []), ...(stale.reasons || [])],
    gateClean
  };
};

const buildConditionSummary = (runRecords, currentLineage) => {
  const lineages = runRecords.map((record) =>
    stable({
      support_class: record.support_class,
      comparator_supported: record.comparator_supported,
      intervention_stable: record.intervention_stable,
      stale: record.stale.reasons
    })
  );
  const comparable = new Set(lineages).size === 1;
  return {
    artifact_role: 'phenomenal_bridge_condition_summary',
    artifact_name: 'phenomenal_bridge_condition_summary.json',
    artifact_version: '1.0.0',
    schema_version: '1.0.0',
    bridge_layer_id: 'phenomenal_bridge_formal_layer.bpfm3',
    layer_version: ECOSYSTEM_LAYER_VERSION,
    runtime_status: ECOSYSTEM_RUNTIME_STATUS,
    condition_id: 'bridge_enabled_baseline',
    run_count: runRecords.length,
    minimum_required_runs: 1,
    recommended_runs_for_stable_series: 2,
    comparability_status: comparable
      ? 'internally_comparable_condition_summary'
      : 'lineage_incomparable_condition_summary',
    classification_counts: runRecords.reduce((acc, record) => {
      acc[record.support_class] = (acc[record.support_class] || 0) + 1;
      return acc;
    }, {}),
    aggregate_support: {
      mean_phi_bpf: mean(runRecords.map((record) => record.Phi_bpf)),
      mean_gamma_bpf: mean(runRecords.map((record) => record.Gamma_bpf)),
      gate_pass_count: runRecords.filter((record) => record.gate_status === 'pass').length,
      comparator_supported_count: runRecords.filter((record) => record.comparator_supported).length,
      intervention_stable_count: runRecords.filter((record) => record.intervention_stable).length
    },
    support_class_tendency: runRecords[0]?.support_class || 'bridge_not_ready',
    invalidation_reasons: runRecords.flatMap((record) => record.stale.reasons),
    sample_size_status: runRecords.length < 2 ? 'single_run_dominated' : 'minimally_repeated',
    warnings:
      runRecords.length < 2
        ? ['single_run_condition_summary_only', 'not_statistically_replicated']
        : [],
    interpretation_boundary: CONDITION_BOUNDARY,
    provenance: {
      generated_at: new Date().toISOString(),
      current_lineage: currentLineage,
      root_gate_result_ref: ROOT_BRIDGE_ARTIFACT_REFS.gate_result
    },
    schema_ref:
      'src/phenomenal_bridge/schemas/phenomenal_bridge_condition_summary.v1.json'
  };
};

const buildBatchSummary = (conditionSummary, currentLineage) => ({
  artifact_role: 'phenomenal_bridge_batch_summary',
  artifact_name: 'phenomenal_bridge_batch_summary.json',
  artifact_version: '1.0.0',
  schema_version: '1.0.0',
  bridge_layer_id: 'phenomenal_bridge_formal_layer.bpfm3',
  layer_version: ECOSYSTEM_LAYER_VERSION,
  runtime_status: ECOSYSTEM_RUNTIME_STATUS,
  batch_id: 'bridge_internal_batch_baseline',
  condition_count: 1,
  minimum_required_conditions: 1,
  condition_refs: [ECOSYSTEM_BRIDGE_ARTIFACT_REFS.condition_summary],
  comparability_status:
    conditionSummary.invalidation_reasons.length === 0
      ? 'internally_comparable_minimal_batch'
      : 'invalidated_batch_summary',
  aggregate_support: {
    mean_phi_bpf: conditionSummary.aggregate_support.mean_phi_bpf,
    mean_gamma_bpf: conditionSummary.aggregate_support.mean_gamma_bpf,
    gate_pass_count: conditionSummary.aggregate_support.gate_pass_count,
    support_classes: conditionSummary.classification_counts
  },
  support_class_tendency: conditionSummary.support_class_tendency,
  invalidation_reasons: [...(conditionSummary.invalidation_reasons || [])],
  sample_size_status: 'single_condition_single_run',
  warnings: ['single_condition_single_run_batch_summary'],
  interpretation_boundary: BATCH_BOUNDARY,
  provenance: {
    generated_at: new Date().toISOString(),
    current_lineage: currentLineage,
    condition_summary_ref: ECOSYSTEM_BRIDGE_ARTIFACT_REFS.condition_summary
  },
  schema_ref: 'src/phenomenal_bridge/schemas/phenomenal_bridge_batch_summary.v1.json'
});

const buildCampaignSummary = (batchSummary, currentLineage) => ({
  artifact_role: 'phenomenal_bridge_campaign_summary',
  artifact_name: 'phenomenal_bridge_campaign_summary.json',
  artifact_version: '1.0.0',
  schema_version: '1.0.0',
  bridge_layer_id: 'phenomenal_bridge_formal_layer.bpfm3',
  layer_version: ECOSYSTEM_LAYER_VERSION,
  runtime_status: ECOSYSTEM_RUNTIME_STATUS,
  campaign_id: 'bridge_internal_campaign_baseline',
  batch_count: 1,
  minimum_required_batches: 1,
  batch_refs: [ECOSYSTEM_BRIDGE_ARTIFACT_REFS.batch_summary],
  campaign_status:
    batchSummary.invalidation_reasons.length === 0
      ? 'bridge_internal_campaign_hardened'
      : 'bridge_campaign_invalidated',
  aggregate_support: batchSummary.aggregate_support,
  support_class_tendency: batchSummary.support_class_tendency,
  invalidation_reasons: [...(batchSummary.invalidation_reasons || [])],
  sample_size_status: 'single_batch_single_condition_single_run',
  warnings: ['single_batch_campaign_summary_only', 'bridge_campaign_not_yet_replicated'],
  interpretation_boundary: CAMPAIGN_BOUNDARY,
  provenance: {
    generated_at: new Date().toISOString(),
    current_lineage: currentLineage,
    batch_summary_ref: ECOSYSTEM_BRIDGE_ARTIFACT_REFS.batch_summary
  },
  schema_ref: 'src/phenomenal_bridge/schemas/phenomenal_bridge_campaign_summary.v1.json'
});

const resolveReadinessClass = ({
  runRecord,
  candidateSurfaceCheck,
  internalBundleSurfaceCheck,
  auditSurfaceCheck,
  candidateProjectionInvalidated
}) => {
  const locallyComplete = runRecord.gateClean && !runRecord.stale.invalidated;
  const candidateReady =
    locallyComplete
    && candidateSurfaceCheck.pass
    && internalBundleSurfaceCheck.pass
    && !candidateProjectionInvalidated;
  const auditReady = candidateReady && auditSurfaceCheck.pass;

  if (!locallyComplete) return READINESS_CLASSES[0];
  if (!candidateReady) return READINESS_CLASSES[1];
  if (!auditReady) return READINESS_CLASSES[2];
  return READINESS_CLASSES[3];
};

const buildCandidateProjection = ({
  runRecord,
  conditionSummary,
  batchSummary,
  campaignSummary,
  currentLineage
}) => {
  const candidateSurfaceCheck = checkSurfaceEligibility(
    PHENOMENAL_BRIDGE_SURFACE_POLICY,
    [
      'phenomenal_bridge_projection.json',
      'phenomenal_bridge_gate_result.json',
      'phenomenal_bridge_manifest.json',
      'phenomenal_bridge_campaign_summary.json',
      'phenomenal_bridge_candidate_projection.json',
      'phenomenal_bridge_verification_matrix.json',
      'phenomenal_bridge_readiness_gate.json'
    ],
    'ecosystem_candidate_surface'
  );
  const internalBundleSurfaceCheck = checkSurfaceEligibility(
    PHENOMENAL_BRIDGE_SURFACE_POLICY,
    [
      'phenomenal_bridge_projection.json',
      'phenomenal_bridge_gate_result.json',
      'phenomenal_bridge_manifest.json',
      'phenomenal_bridge_condition_summary.json',
      'phenomenal_bridge_batch_summary.json',
      'phenomenal_bridge_campaign_summary.json',
      'phenomenal_bridge_candidate_projection.json',
      'phenomenal_bridge_verification_matrix.json',
      'phenomenal_bridge_final_internal_audit.json',
      'phenomenal_bridge_readiness_gate.json'
    ],
    'internal_release_bundle_surface'
  );
  const auditSurfaceCheck = checkSurfaceEligibility(
    PHENOMENAL_BRIDGE_SURFACE_POLICY,
    [
      'phenomenal_bridge_gate_result.json',
      'phenomenal_bridge_manifest.json',
      'phenomenal_bridge_campaign_summary.json',
      'phenomenal_bridge_candidate_projection.json',
      'phenomenal_bridge_audit_handoff_summary.json',
      'phenomenal_bridge_verification_matrix.json',
      'phenomenal_bridge_readiness_gate.json'
    ],
    'audit_facing_package_surface'
  );

  const invalidationReasons = [...(runRecord.stale.reasons || [])];
  if (!runRecord.gateClean) invalidationReasons.push('bridge_gate_not_clean');
  if (!candidateSurfaceCheck.pass) invalidationReasons.push(...candidateSurfaceCheck.failures);
  if (!internalBundleSurfaceCheck.pass) invalidationReasons.push(...internalBundleSurfaceCheck.failures);

  return {
    artifact_role: 'phenomenal_bridge_candidate_projection',
    artifact_name: 'phenomenal_bridge_candidate_projection.json',
    artifact_version: '1.0.0',
    schema_version: '1.0.0',
    bridge_layer_id: 'phenomenal_bridge_formal_layer.bpfm3',
    layer_version: ECOSYSTEM_LAYER_VERSION,
    runtime_status: ECOSYSTEM_RUNTIME_STATUS,
    support_class: runRecord.support_class,
    readiness_class: resolveReadinessClass({
      runRecord,
      candidateSurfaceCheck,
      internalBundleSurfaceCheck,
      auditSurfaceCheck,
      candidateProjectionInvalidated: invalidationReasons.length > 0
    }),
    condition_summary_ref: ECOSYSTEM_BRIDGE_ARTIFACT_REFS.condition_summary,
    batch_summary_ref: ECOSYSTEM_BRIDGE_ARTIFACT_REFS.batch_summary,
    campaign_summary_ref: ECOSYSTEM_BRIDGE_ARTIFACT_REFS.campaign_summary,
    verification_matrix_ref: ECOSYSTEM_BRIDGE_ARTIFACT_REFS.verification_matrix,
    candidate_inclusion_status: {
      implemented: true,
      bounded_internal_only: true,
      support_class_bounded: true,
      not_external_validation: true
    },
    sample_size_status: campaignSummary.sample_size_status,
    surface_status: {
      internal_release_bundle_surface: internalBundleSurfaceCheck,
      ecosystem_candidate_surface: candidateSurfaceCheck,
      audit_facing_package_surface: auditSurfaceCheck
    },
    invalidation_reasons: invalidationReasons,
    warnings: [
      ...(conditionSummary.warnings || []),
      ...(batchSummary.warnings || []),
      ...(campaignSummary.warnings || [])
    ],
    blocked_inferences: [
      'No external validation inference.',
      'No human phenomenal equivalence inference.',
      'No phenomenality-proven inference.',
      'No candidate-to-public-claim shortcut.'
    ],
    baseline_refs: {
      qicn_system_head: currentLineage.qicn_system.head,
      qicn_release_head: currentLineage.qicn_release.head,
      protocol_ref: BRIDGE_SYSTEM_FILES.protocol,
      thresholds_ref: BRIDGE_SYSTEM_FILES.thresholds,
      rival_family_ref: BRIDGE_SYSTEM_FILES.rival_family,
      surface_policy_ref: BRIDGE_SYSTEM_FILES.surface_policy
    },
    interpretation_boundary: CANDIDATE_BOUNDARY,
    provenance: {
      generated_at: new Date().toISOString(),
      current_lineage: currentLineage,
      gate_result_ref: ROOT_BRIDGE_ARTIFACT_REFS.gate_result,
      manifest_ref: ROOT_BRIDGE_ARTIFACT_REFS.manifest
    },
    schema_ref:
      'src/phenomenal_bridge/schemas/phenomenal_bridge_candidate_projection.v1.json'
  };
};

const buildAuditHandoffSummary = (candidateProjection, runRecord, currentLineage) => ({
  artifact_role: 'phenomenal_bridge_audit_handoff_summary',
  artifact_name: 'phenomenal_bridge_audit_handoff_summary.json',
  artifact_version: '1.0.0',
  schema_version: '1.0.0',
  bridge_layer_id: 'phenomenal_bridge_formal_layer.bpfm3',
  layer_version: ECOSYSTEM_LAYER_VERSION,
  runtime_status: ECOSYSTEM_RUNTIME_STATUS,
  support_class: runRecord.support_class,
  readiness_class: candidateProjection.readiness_class,
  included_artifacts: [
    'phenomenal_bridge_gate_result.json',
    'phenomenal_bridge_manifest.json',
    'phenomenal_bridge_campaign_summary.json',
    'phenomenal_bridge_candidate_projection.json',
    'phenomenal_bridge_audit_handoff_summary.json',
    'phenomenal_bridge_verification_matrix.json',
    'phenomenal_bridge_readiness_gate.json'
  ],
  excluded_artifacts: [
    'phenomenal_differentiation_report.json',
    'valence_structure_report.json',
    'world_richness_report.json',
    'ambiguity_bearing_report.json',
    'embodied_closure_report.json',
    'temporal_lived_structure_report.json',
    'bridge_intervention_profile.json',
    'bridge_reducibility_report.json'
  ],
  boundary_assertions: [
    'internal_bridge_support_only',
    'not_external_validation',
    'not_human_equivalence',
    'not_phenomenality_proof',
    'not_claim_facing'
  ],
  invalidation_reasons: [...(candidateProjection.invalidation_reasons || [])],
  warnings: [...(candidateProjection.warnings || [])],
  interpretation_boundary: AUDIT_BOUNDARY,
  provenance: {
    generated_at: new Date().toISOString(),
    current_lineage: currentLineage,
    candidate_projection_ref: ECOSYSTEM_BRIDGE_ARTIFACT_REFS.candidate_projection,
    campaign_summary_ref: ECOSYSTEM_BRIDGE_ARTIFACT_REFS.campaign_summary
  },
  schema_ref:
    'src/phenomenal_bridge/schemas/phenomenal_bridge_audit_handoff_summary.v1.json'
});

const buildVerificationMatrix = ({
  rootBundle,
  conditionSummary,
  batchSummary,
  campaignSummary,
  candidateProjection,
  auditSummary,
  currentLineage
}) => {
  const checks = [];
  const addCheck = (id, pass, details) =>
    checks.push({ id, status: pass ? 'PASS' : 'FAIL', details });

  addCheck('bridge_root_gate_clean', rootBundle.gate_result.gate_status === 'pass', {
    classification: rootBundle.gate_result.classification,
    gate_status: rootBundle.gate_result.gate_status
  });
  addCheck('bridge_candidate_surface_bounded', candidateProjection.surface_status.ecosystem_candidate_surface.pass, {
    failures: candidateProjection.surface_status.ecosystem_candidate_surface.failures
  });
  addCheck('bridge_audit_surface_bounded', candidateProjection.surface_status.audit_facing_package_surface.pass, {
    failures: candidateProjection.surface_status.audit_facing_package_surface.failures
  });
  addCheck('bridge_no_local_path_leaks', !containsLocalPathLeak({
    rootBundle,
    conditionSummary,
    batchSummary,
    campaignSummary,
    candidateProjection,
    auditSummary
  }), {
    checked_artifacts: Object.values({
      ...ROOT_BRIDGE_ARTIFACT_REFS,
      ...ECOSYSTEM_BRIDGE_ARTIFACT_REFS
    })
  });
  addCheck(
    'bridge_low_level_artifacts_not_candidate_or_audit_facing',
    auditSummary.excluded_artifacts.includes('bridge_intervention_profile.json')
      && auditSummary.excluded_artifacts.includes('bridge_reducibility_report.json'),
    { excluded_artifacts: auditSummary.excluded_artifacts }
  );

  const failures = checks.filter((check) => check.status === 'FAIL').map((check) => check.id);
  return {
    artifact_role: 'phenomenal_bridge_verification_matrix',
    artifact_name: 'phenomenal_bridge_verification_matrix.json',
    artifact_version: '1.0.0',
    schema_version: '1.0.0',
    bridge_layer_id: 'phenomenal_bridge_formal_layer.bpfm3',
    layer_version: ECOSYSTEM_LAYER_VERSION,
    runtime_status: ECOSYSTEM_RUNTIME_STATUS,
    status: failures.length === 0 ? 'PASS' : 'FAIL',
    checks,
    system_baseline: {
      qicn_system_head: currentLineage.qicn_system.head,
      qicn_release_head: currentLineage.qicn_release.head
    },
    bridge_baseline: {
      support_class: rootBundle.manifest.support_class,
      gate_classification: rootBundle.gate_result.classification,
      candidate_readiness_class: candidateProjection.readiness_class,
      sample_size_status: campaignSummary.sample_size_status
    },
    warnings: [
      ...(conditionSummary.warnings || []),
      ...(batchSummary.warnings || []),
      ...(campaignSummary.warnings || [])
    ],
    failures,
    interpretation_boundary: VERIFICATION_BOUNDARY,
    provenance: {
      generated_at: new Date().toISOString(),
      current_lineage: currentLineage
    },
    schema_ref:
      'src/phenomenal_bridge/schemas/phenomenal_bridge_verification_matrix.v1.json'
  };
};

export class PhenomenalBridgeEcosystemIntegrator {
  captureCurrentLineage() {
    return captureCurrentLineage();
  }

  writeArtifacts({ rootBundle }, outputDir) {
    const currentLineage = this.captureCurrentLineage();
    const runRecord = buildRunRecord(rootBundle, currentLineage);
    const conditionSummary = buildConditionSummary([runRecord], currentLineage);
    const batchSummary = buildBatchSummary(conditionSummary, currentLineage);
    const campaignSummary = buildCampaignSummary(batchSummary, currentLineage);
    const candidateProjection = buildCandidateProjection({
      runRecord,
      conditionSummary,
      batchSummary,
      campaignSummary,
      currentLineage
    });
    const auditSummary = buildAuditHandoffSummary(candidateProjection, runRecord, currentLineage);
    const verificationMatrix = buildVerificationMatrix({
      rootBundle,
      conditionSummary,
      batchSummary,
      campaignSummary,
      candidateProjection,
      auditSummary,
      currentLineage
    });

    fs.mkdirSync(outputDir, { recursive: true });
    const outputs = {
      condition_summary: path.join(outputDir, 'phenomenal_bridge_condition_summary.json'),
      batch_summary: path.join(outputDir, 'phenomenal_bridge_batch_summary.json'),
      campaign_summary: path.join(outputDir, 'phenomenal_bridge_campaign_summary.json'),
      candidate_projection: path.join(outputDir, 'phenomenal_bridge_candidate_projection.json'),
      audit_handoff_summary: path.join(outputDir, 'phenomenal_bridge_audit_handoff_summary.json'),
      verification_matrix: path.join(outputDir, 'phenomenal_bridge_verification_matrix.json')
    };

    writeJson(outputs.condition_summary, conditionSummary);
    writeJson(outputs.batch_summary, batchSummary);
    writeJson(outputs.campaign_summary, campaignSummary);
    writeJson(outputs.candidate_projection, candidateProjection);
    writeJson(outputs.audit_handoff_summary, auditSummary);
    writeJson(outputs.verification_matrix, verificationMatrix);

    return {
      run_record: runRecord,
      condition_summary: conditionSummary,
      batch_summary: batchSummary,
      campaign_summary: campaignSummary,
      candidate_projection: candidateProjection,
      audit_handoff_summary: auditSummary,
      verification_matrix: verificationMatrix,
      outputs
    };
  }
}

export const createPhenomenalBridgeEcosystemIntegrator = (options = {}) =>
  new PhenomenalBridgeEcosystemIntegrator(options);

export default {
  PhenomenalBridgeEcosystemIntegrator,
  createPhenomenalBridgeEcosystemIntegrator,
  READINESS_CLASSES
};

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { SYSTEM_ROOT, normalize, ensureDir, writeJson } = require('./ecosystem-release-common.cjs');
const { loadDefinitions, readJson } = require('./evaluation-phase-common.cjs');

const EXECUTION_ROOT = path.join(SYSTEM_ROOT, 'artifacts', 'execution_campaign');
const CANDIDATE_MANIFEST = path.join(SYSTEM_ROOT, 'artifacts', 'ecosystem_release_candidate', 'ecosystem_release_candidate_manifest.json');
const LOCAL_PATH_PATTERN = /\/c:\/|[A-Za-z]:\\Users\\|OneDrive|Escritorio/i;

const rel = (file) => normalize(path.relative(SYSTEM_ROOT, file)) || '.';
const exists = (file) => fs.existsSync(file);
const arr = (value) => (Array.isArray(value) ? value : []);
const text = (value) => typeof value === 'string' && value.trim().length > 0;
const sameSet = (a, b) => JSON.stringify([...arr(a)].map(String).sort()) === JSON.stringify([...arr(b)].map(String).sort());
const get = (value, expr) => String(expr || '').split('.').filter(Boolean).reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), value);
const missingFields = (artifact, fields) => fields.filter((field) => {
  const value = get(artifact, field);
  if (Array.isArray(value)) return value.length === 0;
  if (value && typeof value === 'object') return Object.keys(value).length === 0;
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
});
const statusFrom = ({ failures = [], notes = [], overreach = [] }) => {
  if (failures.length > 0) return 'structurally_invalid';
  if (overreach.length > 0) return 'semantically_overreaching';
  if (notes.length > 0) return 'coherent_with_notes';
  return 'coherent';
};

const ctx = (() => {
  const pointerPath = path.join(EXECUTION_ROOT, 'latest_campaign_pointer.json');
  const pointer = readJson(pointerPath);
  const planPath = path.join(SYSTEM_ROOT, pointer.plan_path);
  const readoutPath = path.join(SYSTEM_ROOT, pointer.readout_path);
  const batchRoot = path.join(SYSTEM_ROOT, pointer.batch_root);
  const aggregateRoot = path.join(batchRoot, 'aggregate');
  return {
    pointerPath,
    pointer,
    planPath,
    plan: readJson(planPath),
    readoutPath,
    readout: readJson(readoutPath),
    batchRoot,
    aggregateRoot,
    campaignRoot: path.join(SYSTEM_ROOT, pointer.campaign_root),
    protocolManifestPath: path.join(aggregateRoot, 'evaluation_protocol_manifest.json'),
    batchReportPath: path.join(aggregateRoot, 'evaluation_batch_report.json'),
    conditionSummaryPath: path.join(aggregateRoot, 'condition_evaluation_summary.json'),
    comparisonReportPath: path.join(aggregateRoot, 'condition_comparison_report.json'),
    candidateManifestPath: CANDIDATE_MANIFEST
  };
})();

const defs = loadDefinitions();
const protocolManifest = readJson(ctx.protocolManifestPath);
const batchReport = readJson(ctx.batchReportPath);
const conditionSummary = readJson(ctx.conditionSummaryPath);
const comparisonReport = readJson(ctx.comparisonReportPath);
const candidateManifest = readJson(ctx.candidateManifestPath);
const metricsSet = new Set(arr(defs.metricsRegistry.entries).map((entry) => entry.id));
const matrixById = new Map(arr(defs.comparisonMatrix.comparisons).map((entry) => [entry.id, entry]));

const record = ({ id, role, layer, artifact, artifactPath, requiredFields, sourceInputs, allowedSurfaces, blockedSurfaces, nonClaimBoundary, risks, notes = [], failures = [], overreach = [] }) => ({
  id,
  path: rel(artifactPath),
  role,
  semantic_layer: layer,
  source_inputs: sourceInputs,
  required_fields: requiredFields,
  required_fields_present: missingFields(artifact, requiredFields).length === 0,
  missing_required_fields: missingFields(artifact, requiredFields),
  local_path_leak_detected: LOCAL_PATH_PATTERN.test(fs.readFileSync(artifactPath, 'utf8')),
  non_claim_boundary: nonClaimBoundary,
  allowed_surfaces: allowedSurfaces,
  blocked_surfaces: blockedSurfaces,
  risks_of_overreading: risks,
  consistency: {
    internal: failures.length === 0,
    notes,
    failures,
    semantic_overreach: overreach
  },
  status: statusFrom({ failures, notes, overreach })
});

const buildArtifactAudits = () => {
  const audits = {};

  {
    const failures = [];
    const notes = [];
    if (ctx.plan.campaign_id !== ctx.pointer.campaign_id) failures.push('campaign_id_mismatch_with_pointer');
    if (ctx.plan.batch_id !== ctx.pointer.batch_id) failures.push('batch_id_mismatch_with_pointer');
    if (!sameSet(ctx.plan.conditions, defs.protocol.condition_order)) failures.push('condition_order_mismatch_with_protocol');
    if (arr(ctx.plan.seed_schedule).length !== Number(ctx.plan.n_per_condition || 0)) failures.push('n_per_condition_seed_schedule_mismatch');
    if (!text(ctx.plan.architecture_freeze_ref) || !text(ctx.plan.interpretation_boundary)) failures.push('missing_freeze_or_boundary_ref');
    if (!('claim_facing_status' in ctx.plan)) notes.push('campaign_plan_uses_blocked_claim_facing_outputs_without_direct_claim_facing_status_field');
    audits.campaign_execution_plan = record({
      id: 'campaign_execution_plan',
      role: 'execution_campaign_plan',
      layer: 'manifest',
      artifact: ctx.plan,
      artifactPath: ctx.planPath,
      requiredFields: ['artifact_role', 'campaign_id', 'batch_id', 'architecture_freeze_ref', 'baseline.qicn_system_head', 'baseline.qicn_release_head', 'conditions', 'n_per_condition', 'seed_schedule', 'blocked_claim_facing_outputs', 'interpretation_boundary'],
      sourceInputs: ['docs/evaluation_architecture_freeze.v1.json', 'docs/evaluation_protocol.v1.json', 'docs/evaluation_comparison_matrix.v1.json', 'docs/evaluation_metrics_registry.v1.json', 'docs/evaluation_statistical_policy.v1.json', 'artifacts/ecosystem_release_candidate/ecosystem_release_candidate_manifest.json'],
      allowedSurfaces: ['local_artifact_surface', 'ecosystem_internal_manifest_surface'],
      blockedSurfaces: ['claim_facing_surface', 'controlled_statement_surface'],
      nonClaimBoundary: ctx.plan.interpretation_boundary,
      risks: ['treating planning metadata as empirical support', 'reading blocked outputs as export authorization'],
      notes,
      failures
    });
  }

  {
    const failures = [];
    const notes = [];
    if (protocolManifest.batch_id !== ctx.pointer.batch_id) failures.push('batch_id_mismatch_with_pointer');
    if (protocolManifest.batch_paths?.batch_root !== ctx.pointer.batch_root) failures.push('batch_root_mismatch_with_pointer');
    if (!sameSet(protocolManifest.condition_order, defs.protocol.condition_order)) failures.push('condition_order_mismatch_with_protocol');
    if (protocolManifest.ecosystem_candidate_status !== 'PASS') failures.push('ecosystem_candidate_status_not_pass');
    if (protocolManifest.baselines?.qicn_system?.head !== candidateManifest.baselines?.qicn_system?.head) notes.push('candidate_head_postdates_campaign_protocol_manifest_head');
    if (protocolManifest.baselines?.qicn_release?.head !== candidateManifest.baselines?.qicn_release?.head) failures.push('release_head_mismatch_with_candidate_manifest');
    audits.evaluation_protocol_manifest = record({
      id: 'evaluation_protocol_manifest',
      role: 'evaluation_protocol_manifest',
      layer: 'manifest',
      artifact: protocolManifest,
      artifactPath: ctx.protocolManifestPath,
      requiredFields: ['artifact_role', 'batch_id', 'protocol_ref', 'comparison_matrix_ref', 'metrics_registry_ref', 'controls_registry_ref', 'statistical_policy_ref', 'ecosystem_candidate_manifest_ref', 'ecosystem_candidate_status', 'seed_schedule', 'condition_order', 'required_run_artifacts', 'required_batch_artifacts', 'blocked_claim_facing_outputs', 'claim_facing_status', 'interpretation_boundary'],
      sourceInputs: ['docs/evaluation_protocol.v1.json', 'docs/evaluation_comparison_matrix.v1.json', 'docs/evaluation_metrics_registry.v1.json', 'docs/evaluation_controls_registry.v1.json', 'docs/evaluation_statistical_policy.v1.json', 'artifacts/ecosystem_release_candidate/ecosystem_release_candidate_manifest.json'],
      allowedSurfaces: ['local_artifact_surface', 'ecosystem_internal_manifest_surface'],
      blockedSurfaces: ['claim_facing_surface', 'controlled_statement_surface'],
      nonClaimBoundary: protocolManifest.interpretation_boundary,
      risks: ['reading protocol linkage as empirical result'],
      notes,
      failures
    });
  }

  {
    const failures = [];
    if (batchReport.status !== 'PASS') failures.push('batch_status_not_pass');
    if ((batchReport.warnings || []).length > 0) failures.push('batch_report_contains_warnings');
    if ((batchReport.failures || []).length > 0) failures.push('batch_report_contains_failures');
    const totalMaterialized = Object.values(batchReport.condition_statuses || {}).reduce((acc, entry) => acc + Number(entry.materialized_run_count || 0), 0);
    const totalIncluded = Object.values(batchReport.condition_statuses || {}).reduce((acc, entry) => acc + Number(entry.included_run_count || 0), 0);
    const totalExcluded = Object.values(batchReport.condition_statuses || {}).reduce((acc, entry) => acc + Number(entry.excluded_run_count || 0), 0);
    if (batchReport.run_count !== totalMaterialized) failures.push('run_count_mismatch_with_condition_statuses');
    if (batchReport.run_count !== totalIncluded + totalExcluded) failures.push('run_count_not_equal_included_plus_excluded');
    for (const [conditionId, status] of Object.entries(batchReport.condition_statuses || {})) {
      const expected = conditionSummary.conditions?.[conditionId];
      if (!expected) failures.push(`missing_condition_summary:${conditionId}`);
      else if (status.sample_size_status !== expected.sample_size_status) failures.push(`sample_size_status_mismatch:${conditionId}`);
    }
    audits.evaluation_batch_report = record({
      id: 'evaluation_batch_report',
      role: 'evaluation_batch_report',
      layer: 'batch_status',
      artifact: batchReport,
      artifactPath: ctx.batchReportPath,
      requiredFields: ['artifact_role', 'batch_id', 'status', 'run_count', 'condition_count', 'seed_schedule', 'condition_statuses', 'comparison_statuses', 'blocked_claim_facing_outputs', 'interpretation_boundary'],
      sourceInputs: [rel(ctx.conditionSummaryPath), rel(ctx.comparisonReportPath)],
      allowedSurfaces: ['local_artifact_surface', 'ecosystem_internal_manifest_surface'],
      blockedSurfaces: ['claim_facing_surface', 'controlled_statement_surface'],
      nonClaimBoundary: batchReport.interpretation_boundary,
      risks: ['reading PASS as claim closure'],
      failures
    });
  }

  {
    const failures = [];
    for (const [conditionId, condition] of Object.entries(conditionSummary.conditions || {})) {
      if ((condition.materialized_run_count || 0) !== ((condition.included_run_count || 0) + (condition.excluded_run_count || 0))) failures.push(`counts_do_not_close:${conditionId}`);
      if (arr(condition.seeds).length !== Number(condition.materialized_run_count || 0)) failures.push(`seed_count_mismatch:${conditionId}`);
      for (const metricId of Object.keys(condition.numerical_metrics || {})) if (!metricsSet.has(metricId)) failures.push(`unknown_numerical_metric:${conditionId}:${metricId}`);
      for (const metricId of Object.keys(condition.categorical_metrics || {})) if (!metricsSet.has(metricId)) failures.push(`unknown_categorical_metric:${conditionId}:${metricId}`);
    }
    audits.condition_evaluation_summary = record({
      id: 'condition_evaluation_summary',
      role: 'condition_evaluation_summary',
      layer: 'summary',
      artifact: conditionSummary,
      artifactPath: ctx.conditionSummaryPath,
      requiredFields: ['artifact_role', 'protocol_ref', 'metrics_registry_ref', 'source_artifacts.runs_root', 'condition_count', 'conditions', 'claim_facing_status', 'interpretation_boundary'],
      sourceInputs: ['run_evaluation_metrics.json', 'condition_metrics_summary.json', 'condition_support_labels.json'],
      allowedSurfaces: ['local_artifact_surface', 'ecosystem_internal_manifest_surface'],
      blockedSurfaces: ['claim_facing_surface', 'controlled_statement_surface'],
      nonClaimBoundary: conditionSummary.interpretation_boundary,
      risks: ['reading support labels as truth labels', 'reading summary metrics as confirmatory'],
      failures
    });
  }

  {
    const failures = [];
    const emittedIds = [];
    for (const comparison of comparisonReport.comparisons || []) {
      emittedIds.push(comparison.id);
      const matrixEntry = matrixById.get(comparison.id);
      if (!matrixEntry) {
        failures.push(`comparison_not_in_matrix:${comparison.id}`);
        continue;
      }
      if (comparison.support_level_declared !== matrixEntry.support_level) failures.push(`declared_support_level_mismatch:${comparison.id}`);
      if (!sameSet(Object.keys(comparison.primary_metrics || {}), matrixEntry.primary_metrics || [])) failures.push(`primary_metrics_mismatch:${comparison.id}`);
      if (!sameSet(Object.keys(comparison.secondary_metrics || {}), matrixEntry.secondary_metrics || [])) failures.push(`secondary_metrics_mismatch:${comparison.id}`);
      for (const metricId of [...Object.keys(comparison.primary_metrics || {}), ...Object.keys(comparison.secondary_metrics || {})]) {
        if (!metricsSet.has(metricId)) failures.push(`unknown_metric:${comparison.id}:${metricId}`);
      }
      const baseN = Number(conditionSummary.conditions?.[comparison.baseline]?.included_run_count || 0);
      const targetN = Number(conditionSummary.conditions?.[comparison.target]?.included_run_count || 0);
      const expected = baseN < defs.statisticalPolicy.minimum_n_for_condition_summary || targetN < defs.statisticalPolicy.minimum_n_for_condition_summary
        ? 'unsupported'
        : matrixEntry.support_level === 'minimal_contrast'
          && baseN >= defs.statisticalPolicy.minimum_n_per_arm_for_minimal_contrast
          && targetN >= defs.statisticalPolicy.minimum_n_per_arm_for_minimal_contrast
            ? 'minimal_contrast'
            : 'description_only';
      if (comparison.realized_support_level !== expected) failures.push(`realized_support_level_mismatch:${comparison.id}`);
    }
    if (!sameSet(emittedIds, [...matrixById.keys()])) failures.push('emitted_comparison_set_mismatch_with_matrix');
    if (!sameSet((comparisonReport.unsupported_comparisons || []).map((entry) => entry.id), (defs.comparisonMatrix.unsupported_comparisons || []).map((entry) => entry.id))) failures.push('unsupported_comparison_registry_mismatch');
    audits.condition_comparison_report = record({
      id: 'condition_comparison_report',
      role: 'condition_comparison_report',
      layer: 'comparison',
      artifact: comparisonReport,
      artifactPath: ctx.comparisonReportPath,
      requiredFields: ['artifact_role', 'comparison_matrix_ref', 'statistical_policy_ref', 'source_artifacts.condition_evaluation_summary', 'comparisons', 'unsupported_comparisons', 'claim_facing_status', 'interpretation_boundary'],
      sourceInputs: [rel(ctx.conditionSummaryPath), 'docs/evaluation_comparison_matrix.v1.json', 'docs/evaluation_metrics_registry.v1.json', 'docs/evaluation_statistical_policy.v1.json'],
      allowedSurfaces: ['local_artifact_surface', 'ecosystem_internal_manifest_surface'],
      blockedSurfaces: ['claim_facing_surface', 'controlled_statement_surface'],
      nonClaimBoundary: comparisonReport.interpretation_boundary,
      risks: ['reading minimal_contrast as causal proof', 'treating absent pairwise contrasts as allowed'],
      failures
    });
  }

  {
    const failures = [];
    const notes = [];
    if (ctx.readout.campaign_id !== ctx.pointer.campaign_id) failures.push('campaign_id_mismatch_with_pointer');
    if (ctx.readout.batch_id !== ctx.pointer.batch_id) failures.push('batch_id_mismatch_with_pointer');
    if (ctx.readout.status !== batchReport.status) failures.push('status_mismatch_with_batch_report');
    if (ctx.readout.run_counts?.total_materialized_runs !== batchReport.run_count) failures.push('total_runs_mismatch_with_batch_report');
    if ((ctx.readout.qa_qc?.structural_issues || []).length > 0) failures.push('qa_qc_structural_issues_present');
    if (ctx.readout.qa_qc?.protocol_drift_detected !== false) failures.push('protocol_drift_detected');
    if ((ctx.readout.qa_qc?.campaign_warnings || []).length > 0) notes.push('campaign_readout_has_warnings');
    audits.execution_campaign_readout = record({
      id: 'execution_campaign_readout',
      role: 'execution_campaign_readout',
      layer: 'readout',
      artifact: ctx.readout,
      artifactPath: ctx.readoutPath,
      requiredFields: ['artifact_role', 'campaign_id', 'batch_id', 'status', 'architecture_freeze_ref', 'campaign_plan_ref', 'batch_artifacts.evaluation_protocol_manifest', 'batch_artifacts.evaluation_batch_report', 'batch_artifacts.condition_evaluation_summary', 'batch_artifacts.condition_comparison_report', 'run_counts.total_materialized_runs', 'sample_size_by_condition', 'comparisons', 'qa_qc.claim_facing_status', 'blocked_interpretations', 'interpretation_boundary'],
      sourceInputs: [rel(ctx.protocolManifestPath), rel(ctx.batchReportPath), rel(ctx.conditionSummaryPath), rel(ctx.comparisonReportPath), rel(ctx.planPath)],
      allowedSurfaces: ['local_artifact_surface', 'ecosystem_internal_manifest_surface'],
      blockedSurfaces: ['claim_facing_surface', 'controlled_statement_surface'],
      nonClaimBoundary: ctx.readout.interpretation_boundary,
      risks: ['reading the readout as stronger than underlying comparison artifacts'],
      notes,
      failures
    });
  }

  {
    const failures = [];
    const notes = ['pointer_is_routing_metadata_and_relies_on_referenced_artifacts_for_non_claim_boundary'];
    if (ctx.pointer.campaign_id !== ctx.plan.campaign_id) failures.push('campaign_id_mismatch_with_plan');
    if (ctx.pointer.batch_id !== ctx.plan.batch_id) failures.push('batch_id_mismatch_with_plan');
    if (!exists(path.join(SYSTEM_ROOT, ctx.pointer.campaign_root))) failures.push('campaign_root_missing');
    if (!exists(path.join(SYSTEM_ROOT, ctx.pointer.batch_root))) failures.push('batch_root_missing');
    if (ctx.pointer.claim_facing_status !== 'blocked') failures.push('claim_facing_status_not_blocked');
    audits.latest_campaign_pointer = record({
      id: 'latest_campaign_pointer',
      role: 'execution_campaign_pointer',
      layer: 'pointer',
      artifact: ctx.pointer,
      artifactPath: ctx.pointerPath,
      requiredFields: ['artifact_role', 'campaign_id', 'batch_id', 'campaign_root', 'batch_root', 'readout_path', 'plan_path', 'claim_facing_status'],
      sourceInputs: [rel(ctx.planPath), rel(ctx.readoutPath)],
      allowedSurfaces: ['local_artifact_surface', 'ecosystem_internal_manifest_surface'],
      blockedSurfaces: ['claim_facing_surface', 'controlled_statement_surface'],
      nonClaimBoundary: 'Pointer metadata only; not an interpretive artifact.',
      risks: ['reading pointer metadata as empirical evidence'],
      notes,
      failures
    });
  }

  {
    const failures = [];
    const notes = [];
    if (candidateManifest.candidate_status !== 'PASS') failures.push('candidate_status_not_pass');
    if (candidateManifest.baselines?.qicn_system?.head !== ctx.plan.baseline?.qicn_system_head) notes.push('candidate_head_postdates_campaign_plan_head_due_to_audit_freeze_governance_commit');
    if (candidateManifest.baselines?.qicn_release?.head !== ctx.plan.baseline?.qicn_release_head) failures.push('release_head_mismatch_with_plan');
    if (candidateManifest.protocolized_evaluation?.manifests?.campaign_execution_plan !== 'ecosystem/manifests/campaign_execution_plan.json') failures.push('missing_campaign_plan_ref');
    if (candidateManifest.protocolized_evaluation?.manifests?.execution_campaign_readout !== 'ecosystem/manifests/execution_campaign_readout.json') failures.push('missing_campaign_readout_ref');
    if (candidateManifest.protocolized_evaluation?.manifests?.latest_campaign_pointer !== 'ecosystem/manifests/latest_campaign_pointer.json') failures.push('missing_campaign_pointer_ref');
    if (candidateManifest.protocolized_evaluation?.execution_campaign?.audit_readout !== 'ecosystem/manifests/execution_campaign_audit_readout.json') notes.push('missing_campaign_audit_readout_ref');
    if (candidateManifest.protocolized_evaluation?.execution_campaign?.freeze_baseline !== 'ecosystem/docs/EXECUTION_CAMPAIGN_FREEZE_BASELINE.md') notes.push('missing_campaign_freeze_doc_ref');
    if (candidateManifest.protocolized_evaluation?.execution_campaign?.freeze_manifest !== 'ecosystem/manifests/execution_campaign_freeze.v1.json') notes.push('missing_campaign_freeze_json_ref');
    if (candidateManifest.protocolized_evaluation?.execution_campaign?.successive_discipline !== 'ecosystem/docs/SUCCESSIVE_CAMPAIGN_DISCIPLINE.md') notes.push('missing_successive_discipline_doc_ref');
    if (candidateManifest.protocolized_evaluation?.execution_campaign?.successive_discipline_manifest !== 'ecosystem/manifests/successive_campaign_discipline.v1.json') notes.push('missing_successive_discipline_json_ref');
    if (candidateManifest.protocolized_evaluation?.execution_campaign?.surface_class !== 'internal_manifest_only') notes.push('missing_internal_manifest_only_surface_class');
    audits.ecosystem_release_candidate_manifest = record({
      id: 'ecosystem_release_candidate_manifest',
      role: 'ecosystem_release_candidate_manifest',
      layer: 'manifest',
      artifact: candidateManifest,
      artifactPath: ctx.candidateManifestPath,
      requiredFields: ['artifact_role', 'candidate_status', 'baselines.qicn_system.head', 'baselines.qicn_release.head', 'baselines.qicn_release.canonical_freeze_commit', 'protocolized_evaluation.manifests.campaign_execution_plan', 'protocolized_evaluation.manifests.execution_campaign_readout', 'protocolized_evaluation.manifests.latest_campaign_pointer', 'protocolized_evaluation.execution_campaign.audit_readout', 'protocolized_evaluation.execution_campaign.freeze_baseline', 'protocolized_evaluation.execution_campaign.freeze_manifest', 'protocolized_evaluation.execution_campaign.successive_discipline', 'protocolized_evaluation.execution_campaign.successive_discipline_manifest', 'protocolized_evaluation.execution_campaign.surface_class', 'protocolized_evaluation.interpretation_boundary', 'interpretation_boundary'],
      sourceInputs: ['docs/EXECUTION_CAMPAIGN_FREEZE_BASELINE.md', 'docs/SUCCESSIVE_CAMPAIGN_DISCIPLINE.md', 'artifacts/ecosystem_release_candidate/ecosystem_verification_matrix.json', rel(ctx.planPath), rel(ctx.readoutPath), rel(ctx.pointerPath)],
      allowedSurfaces: ['ecosystem_internal_manifest_surface'],
      blockedSurfaces: ['claim_facing_surface', 'public_release_surface'],
      nonClaimBoundary: candidateManifest.interpretation_boundary,
      risks: ['reading internal bundle linkage as public release or theory closure'],
      notes,
      failures
    });
  }

  return audits;
};

const buildCrossConsistency = (audits) => {
  const failures = [];
  const notes = [];
  if (ctx.plan.campaign_id !== ctx.readout.campaign_id || ctx.plan.campaign_id !== ctx.pointer.campaign_id) failures.push('campaign_id_not_stable_across_campaign_artifacts');
  if (ctx.plan.batch_id !== protocolManifest.batch_id || ctx.plan.batch_id !== batchReport.batch_id || ctx.plan.batch_id !== ctx.readout.batch_id || ctx.plan.batch_id !== ctx.pointer.batch_id) failures.push('batch_id_not_stable_across_artifacts');
  if (!sameSet(ctx.plan.seed_schedule, protocolManifest.seed_schedule) || !sameSet(ctx.plan.seed_schedule, batchReport.seed_schedule)) failures.push('seed_schedule_mismatch_across_artifacts');
  if (ctx.readout.run_counts.total_materialized_runs !== batchReport.run_count) failures.push('readout_total_runs_mismatch_batch_report');
  const includedSummary = Object.values(conditionSummary.conditions || {}).reduce((acc, entry) => acc + Number(entry.included_run_count || 0), 0);
  const excludedSummary = Object.values(conditionSummary.conditions || {}).reduce((acc, entry) => acc + Number(entry.excluded_run_count || 0), 0);
  if (ctx.readout.run_counts.included_runs !== includedSummary) failures.push('included_runs_mismatch_summary');
  if (ctx.readout.run_counts.excluded_runs !== excludedSummary) failures.push('excluded_runs_mismatch_summary');
  if (!sameSet((comparisonReport.comparisons || []).map((entry) => entry.id), (batchReport.comparison_statuses || []).map((entry) => entry.id))) failures.push('comparison_id_set_mismatch_between_report_and_batch_status');
  if (Object.values(audits).some((entry) => entry.status === 'structurally_invalid')) failures.push('artifact_level_audit_failure_present');
  if (Object.values(audits).some((entry) => entry.status === 'coherent_with_notes')) notes.push('one_or_more_artifacts_have_non_material_notes');
  return {
    status: failures.length > 0 ? 'FAIL' : notes.length > 0 ? 'PASS_WITH_NOTES' : 'PASS',
    failures,
    notes
  };
};

const buildGating = async () => {
  const { exportOutputForSurface, buildLocalReportForSurface } = await import(pathToFileURL(path.join(SYSTEM_ROOT, 'src', 'experiments', 'OutputSurfaceEnforcer.js')).href);
  const firstRunDir = fs.readdirSync(path.join(ctx.batchRoot, 'artifacts'), { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => path.join(ctx.batchRoot, 'artifacts', entry.name))[0];
  const auditTmp = path.join(EXECUTION_ROOT, 'audit_tmp');
  ensureDir(auditTmp);
  const runEvalExport = exportOutputForSurface({ rootDir: firstRunDir, artifactName: 'run_evaluation_metrics.json', surface: 'claim_facing_blocked_surface', scope: 'run', outputDir: auditTmp });
  const blockedBatchArtifacts = ['condition_evaluation_summary.json', 'condition_comparison_report.json', 'evaluation_protocol_manifest.json', 'evaluation_batch_report.json'];
  const batchExports = blockedBatchArtifacts.map((artifactName) => exportOutputForSurface({ rootDir: ctx.aggregateRoot, artifactName, surface: 'claim_facing_blocked_surface', scope: 'small_batch', outputDir: auditTmp }));
  const localReport = buildLocalReportForSurface({ rootDir: ctx.aggregateRoot, scope: 'small_batch', outputPath: path.join(auditTmp, 'condition_local_report.audit.json') });
  const surfacePolicy = readJson(path.join(ctx.aggregateRoot, 'condition_output_surface_policy.json'));
  const consumptionPolicy = readJson(path.join(ctx.aggregateRoot, 'condition_output_consumption_policy.json'));
  const failures = [];
  const notes = ['campaign-level artifacts are internal-manifest-only and stay outside the small-batch surface policy, while batch artifacts are actively blocked by the export enforcer.'];
  if (runEvalExport.ok !== false || runEvalExport.decision?.reason_code !== 'blocked_output_not_governed') failures.push('run_evaluation_metrics_not_blocked_on_claim_surface');
  for (const result of batchExports) if (result.ok !== false || result.decision?.reason_code !== 'blocked_output_not_governed') failures.push(`batch_artifact_not_blocked:${path.basename(result.decision?.artifact_path || '')}`);
  for (const artifactName of blockedBatchArtifacts) if (localReport.artifact.included_outputs?.[artifactName]) failures.push(`batch_artifact_present_in_local_report:${artifactName}`);
  for (const artifactName of ['campaign_execution_plan.json', 'execution_campaign_readout.json', 'latest_campaign_pointer.json']) {
    if (surfacePolicy.governed_outputs?.includes(artifactName)) failures.push(`campaign_artifact_governed_by_small_batch_surface_policy:${artifactName}`);
    if (consumptionPolicy.governed_outputs?.includes(artifactName)) failures.push(`campaign_artifact_governed_by_small_batch_consumption_policy:${artifactName}`);
  }
  if (candidateManifest.protocolized_evaluation?.execution_campaign?.surface_class !== 'internal_manifest_only') failures.push('candidate_manifest_missing_internal_manifest_only_surface_class_for_execution_campaign');
  return {
    status: failures.length > 0 ? 'FAIL' : 'PASS',
    blocked_run_artifact: { artifact: 'run_evaluation_metrics.json', decision_reason_code: runEvalExport.decision?.reason_code || null },
    blocked_batch_artifacts: batchExports.map((result) => ({ artifact: path.basename(result.decision?.artifact_path || ''), decision_reason_code: result.decision?.reason_code || null })),
    local_report_exclusions_confirmed: blockedBatchArtifacts.filter((artifactName) => !localReport.artifact.included_outputs?.[artifactName]),
    campaign_artifact_policy_mode: {
      campaign_execution_plan: 'internal_manifest_only',
      execution_campaign_readout: 'internal_manifest_only',
      latest_campaign_pointer: 'internal_manifest_only'
    },
    notes,
    failures
  };
};

(async () => {
  const artifactAudit = buildArtifactAudits();
  const cross = buildCrossConsistency(artifactAudit);
  const gating = await buildGating();
  const audit = {
    artifact_role: 'execution_campaign_audit_readout',
    schema_version: '1.0.0',
    generated_at: new Date().toISOString(),
    authoritative_campaign: {
      campaign_id: ctx.pointer.campaign_id,
      batch_id: ctx.pointer.batch_id,
      campaign_root: rel(ctx.campaignRoot),
      batch_root: rel(ctx.batchRoot),
      authoritative_artifact_set: {
        campaign_execution_plan: rel(ctx.planPath),
        evaluation_protocol_manifest: rel(ctx.protocolManifestPath),
        evaluation_batch_report: rel(ctx.batchReportPath),
        condition_evaluation_summary: rel(ctx.conditionSummaryPath),
        condition_comparison_report: rel(ctx.comparisonReportPath),
        execution_campaign_readout: rel(ctx.readoutPath),
        latest_campaign_pointer: rel(ctx.pointerPath),
        ecosystem_release_candidate_manifest: rel(ctx.candidateManifestPath)
      },
      authoritative_baseline_linkage: {
        qicn_system_head: ctx.plan.baseline.qicn_system_head,
        qicn_release_head: ctx.plan.baseline.qicn_release_head,
        release_freeze_commit: ctx.plan.baseline.release_freeze_commit,
        ecosystem_candidate_manifest: rel(ctx.candidateManifestPath),
        evaluation_architecture_freeze: 'docs/evaluation_architecture_freeze.v1.json'
      }
    },
    artifact_audit: artifactAudit,
    cross_artifact_consistency: cross,
    campaign_surface_gating: gating,
    freezeable: cross.status !== 'FAIL' && gating.status === 'PASS',
    interpretation_boundary: 'Campaign audit only; operational coherence and internal-only gating audit, not external validation, not claim closure, not theory confirmation.'
  };
  const rootOutput = path.join(EXECUTION_ROOT, 'execution_campaign_audit_readout.json');
  writeJson(rootOutput, audit);
  writeJson(path.join(ctx.campaignRoot, 'execution_campaign_audit_readout.json'), audit);
  process.stdout.write(`${JSON.stringify({
    artifact_role: 'execution_campaign_audit_result',
    status: audit.freezeable ? 'PASS' : 'FAIL',
    campaign_id: audit.authoritative_campaign.campaign_id,
    batch_id: audit.authoritative_campaign.batch_id,
    cross_artifact_consistency: audit.cross_artifact_consistency.status,
    campaign_surface_gating: audit.campaign_surface_gating.status,
    output: rel(rootOutput)
  }, null, 2)}\n`);
  if (!audit.freezeable) process.exit(1);
})().catch((error) => {
  console.error(`FAIL audit-execution-campaign: ${error.message}`);
  process.exit(1);
});

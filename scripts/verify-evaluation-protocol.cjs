const fs = require('fs');
const path = require('path');

const {
  EVALUATION_ROOT,
  DOC_PATHS,
  loadDefinitions,
  writeJson,
  toProjectRelative,
  detectLocalPathMatches
} = require('./evaluation-phase-common.cjs');

const exists = (filePath) => fs.existsSync(filePath);

(() => {
  try {
    const {
      protocol,
      comparisonMatrix,
      metricsRegistry,
      controlsRegistry,
      statisticalPolicy
    } = loadDefinitions();

    const requiredDocs = Object.values(DOC_PATHS);
    const missingDocs = requiredDocs.filter((filePath) => !exists(filePath)).map((filePath) => toProjectRelative(filePath));
    const protocolConditionIds = protocol.condition_order || [];
    const controlIds = (controlsRegistry.entries || []).map((entry) => entry.id);
    const metricIds = (metricsRegistry.entries || []).map((entry) => entry.id);
    const duplicateMetricIds = metricIds.filter((id, index) => metricIds.indexOf(id) !== index);
    const duplicateComparisonIds = (comparisonMatrix.comparisons || [])
      .map((entry) => entry.id)
      .filter((id, index, values) => values.indexOf(id) !== index);
    const invalidComparisonTargets = (comparisonMatrix.comparisons || [])
      .filter((entry) => !protocolConditionIds.includes(entry.baseline) || !protocolConditionIds.includes(entry.target))
      .map((entry) => entry.id);
    const controlCoverageGap = protocolConditionIds.filter((id) => !controlIds.includes(id));
    const metricRegistryGap = (comparisonMatrix.comparisons || [])
      .flatMap((entry) => [...(entry.primary_metrics || []), ...(entry.secondary_metrics || [])])
      .filter((metricId, index, values) => values.indexOf(metricId) === index && !metricIds.includes(metricId));
    const statsAlignmentOk = protocol.minimum_runs_per_condition === statisticalPolicy.minimum_n_for_condition_summary
      && protocol.canonical_runs_per_condition === statisticalPolicy.canonical_n_per_condition
      && protocol.minimum_runs_per_condition_for_minimal_contrast === statisticalPolicy.minimum_n_per_arm_for_minimal_contrast;
    const portabilityMatches = detectLocalPathMatches(requiredDocs);

    const failures = [];
    if (missingDocs.length > 0) failures.push('missing_protocol_docs_or_json');
    if (protocol.baseline_condition !== 'baseline') failures.push('baseline_condition_mismatch');
    if (protocol.ecosystem_candidate_required !== true) failures.push('ecosystem_candidate_requirement_missing');
    if (!Array.isArray(protocol.canonical_seed_schedule) || protocol.canonical_seed_schedule.length < 3) failures.push('canonical_seed_schedule_incomplete');
    if (controlCoverageGap.length > 0) failures.push('controls_registry_missing_protocol_conditions');
    if (duplicateMetricIds.length > 0) failures.push('duplicate_metric_ids');
    if (duplicateComparisonIds.length > 0) failures.push('duplicate_comparison_ids');
    if (invalidComparisonTargets.length > 0) failures.push('comparison_targets_not_in_protocol');
    if (metricRegistryGap.length > 0) failures.push('comparison_matrix_metric_gap');
    if (!statsAlignmentOk) failures.push('statistical_policy_misaligned_with_protocol');
    if (portabilityMatches.length > 0) failures.push('local_path_leak_in_protocol_targets');

    const status = failures.length > 0 ? 'FAIL' : 'PASS';
    const artifact = {
      artifact_role: 'evaluation_protocol_check',
      checked_at: new Date().toISOString(),
      status,
      failures,
      warnings: [],
      checks: {
        missing_docs: missingDocs,
        protocol_condition_ids: protocolConditionIds,
        controls_registry_ids: controlIds,
        duplicate_metric_ids: duplicateMetricIds,
        duplicate_comparison_ids: duplicateComparisonIds,
        invalid_comparison_targets: invalidComparisonTargets,
        comparison_metric_registry_gap: metricRegistryGap,
        stats_alignment_ok: statsAlignmentOk,
        portability_matches: portabilityMatches
      },
      interpretation_boundary: 'Protocol check only; structural integrity of the evaluation phase, not validation semantics.'
    };

    const outputPath = path.join(EVALUATION_ROOT, 'evaluation_protocol_check.json');
    writeJson(outputPath, artifact);
    if (status !== 'PASS') {
      throw new Error(`evaluation protocol check failed: ${failures.join(', ')}`);
    }
    process.stdout.write(`${JSON.stringify({ status, outputPath: toProjectRelative(outputPath) }, null, 2)}\n`);
  } catch (error) {
    console.error(`FAIL verify-evaluation-protocol: ${error.message}`);
    process.exit(1);
  }
})();

const fs = require('fs');
const path = require('path');

const {
  EVALUATION_ROOT,
  loadDefinitions,
  readJson,
  writeJson,
  toProjectRelative,
  detectLocalPathMatches
} = require('./evaluation-phase-common.cjs');

const exists = (filePath) => fs.existsSync(filePath);
const parseArg = (name, fallback = null) => {
  const hit = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const verifyEvaluationMetrics = ({ rootDir = EVALUATION_ROOT } = {}) => {
  const { protocol, metricsRegistry } = loadDefinitions();
  const evaluationRoot = path.resolve(rootDir);
  const summaryPath = path.join(evaluationRoot, 'condition_evaluation_summary.json');
  const batchReportPath = path.join(evaluationRoot, 'evaluation_batch_report.json');
  const protocolManifestPath = path.join(evaluationRoot, 'evaluation_protocol_manifest.json');
  const latestPointerPath = path.join(evaluationRoot, 'latest_batch_pointer.json');
  const requiredFiles = [summaryPath, batchReportPath, protocolManifestPath, latestPointerPath];
  const missingFiles = requiredFiles.filter((filePath) => !exists(filePath)).map((filePath) => toProjectRelative(filePath));

  const failures = [];
  const warnings = [];
  let summary = null;
  let batchReport = null;

  if (missingFiles.length === 0) {
    summary = readJson(summaryPath);
    batchReport = readJson(batchReportPath);
    const metricEntries = metricsRegistry.entries || [];
    const numericMetricIds = metricEntries
      .filter((entry) => !['support_only', 'verdict_metric'].includes(entry.class))
      .map((entry) => entry.id);
    const categoricalMetricIds = metricEntries
      .filter((entry) => ['support_only', 'verdict_metric'].includes(entry.class))
      .map((entry) => entry.id);

    const missingConditions = protocol.condition_order.filter((conditionId) => !summary.conditions?.[conditionId]);
    if (missingConditions.length > 0) failures.push('missing_protocol_conditions_in_summary');

    for (const conditionId of protocol.condition_order) {
      const condition = summary.conditions?.[conditionId];
      if (!condition) continue;
      const missingNumeric = numericMetricIds.filter((metricId) => !condition.numerical_metrics?.[metricId]);
      const missingCategorical = categoricalMetricIds.filter((metricId) => !condition.categorical_metrics?.[metricId]);
      if (missingNumeric.length > 0 || missingCategorical.length > 0) {
        failures.push(`metric_registry_gap:${conditionId}`);
      }
      if (condition.included_run_count < protocol.minimum_runs_per_condition) {
        failures.push(`included_run_count_below_protocol_minimum:${conditionId}`);
      } else if (condition.included_run_count < protocol.minimum_runs_per_condition_for_minimal_contrast) {
        warnings.push(`minimal_contrast_not_available:${conditionId}`);
      }
    }

    if (batchReport.status === 'FAIL') failures.push('evaluation_batch_report_failed');
    if (batchReport.status === 'PASS_WITH_WARNINGS') warnings.push('evaluation_batch_report_has_warnings');
    if (Number(summary.condition_count || 0) !== protocol.condition_order.length) failures.push('condition_count_mismatch');
  } else {
    failures.push('missing_required_evaluation_artifacts');
  }

  const portabilityMatches = detectLocalPathMatches(requiredFiles.filter(exists));
  if (portabilityMatches.length > 0) failures.push('local_path_leak_in_evaluation_artifacts');

  const status = failures.length > 0 ? 'FAIL' : warnings.length > 0 ? 'PASS_WITH_WARNINGS' : 'PASS';
  const artifact = {
    artifact_role: 'evaluation_metrics_check',
    checked_at: new Date().toISOString(),
    status,
    failures,
    warnings,
    checks: {
      missing_files: missingFiles,
      condition_count: summary?.condition_count ?? null,
      batch_report_status: batchReport?.status ?? null,
      portability_matches: portabilityMatches
    },
    interpretation_boundary: 'Evaluation metrics check only; structural and sample-size validation, not confirmatory interpretation.'
  };

  const outputPath = path.join(evaluationRoot, 'evaluation_metrics_check.json');
  writeJson(outputPath, artifact);
  return { status, outputPath, artifact };
};

if (require.main === module) {
  try {
    const result = verifyEvaluationMetrics({ rootDir: parseArg('root', EVALUATION_ROOT) });
    if (result.status === 'FAIL') {
      throw new Error(`evaluation metrics check failed: ${result.artifact.failures.join(', ')}`);
    }
    process.stdout.write(`${JSON.stringify({ status: result.status, outputPath: toProjectRelative(result.outputPath), warnings: result.artifact.warnings }, null, 2)}\n`);
  } catch (error) {
    console.error(`FAIL verify-evaluation-metrics: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  verifyEvaluationMetrics
};

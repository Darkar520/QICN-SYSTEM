import fs from 'fs';
import path from 'path';

const isObj = (value) => value && typeof value === 'object' && !Array.isArray(value);
const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

const RUN_BOUNDARIES = [
  'No implica validacion externa.',
  'No implica cierre cientifico.',
  'No implica causalidad fuerte.',
  'No implica soporte ontologico.',
  'No implica clasificacion final del sistema.'
];

const CONDITION_BOUNDARIES = [
  'No implica validacion externa.',
  'No implica inferencia causal fuerte.',
  'No implica confirmacion del marco.',
  'No implica claim fuerte.',
  'No reemplaza revision cientifica externa.'
];

export const buildRunSupportLabelsArtifact = ({ artifactDir }) => {
  const verdict = readJson(path.join(artifactDir, 'run_verdict.json'));
  const runMetrics = readJson(path.join(artifactDir, 'run_metrics.json'));
  const entropyDiagnosticsPath = path.join(artifactDir, 'entropy_run_diagnostics.json');
  const entropyDiagnostics = fs.existsSync(entropyDiagnosticsPath) ? readJson(entropyDiagnosticsPath) : null;

  const admissible = verdict.status === 'ADMISSIBLE';
  const entropyCleanOrDegraded = !entropyDiagnostics || ['clean', 'degraded'].includes(String(entropyDiagnostics.run_level_status || ''));
  const metricsPresent = isObj(runMetrics?.stability) && isObj(runMetrics?.burden);
  const conditionMode = String(runMetrics?.experimental_condition?.mode || 'baseline');

  const supportLabel = admissible && entropyCleanOrDegraded && metricsPresent
    ? 'internal_support_only'
    : 'under_evaluation';

  const reasons = [];
  if (!admissible) reasons.push('run_not_admissible');
  if (!entropyCleanOrDegraded) reasons.push('entropy_run_level_not_clean_or_degraded');
  if (!metricsPresent) reasons.push('run_metrics_missing_or_malformed');
  if (supportLabel === 'internal_support_only' && conditionMode !== 'baseline') {
    reasons.push('experimental_condition_active');
  }
  if (supportLabel === 'internal_support_only' && conditionMode === 'baseline') {
    reasons.push('internal_runtime_evidence_only');
  }

  const artifact = {
    runId: String(verdict.runId || path.basename(artifactDir)),
    artifact_role: 'support_label_output',
    source_artifacts: {
      run_verdict: 'run_verdict.json',
      run_metrics: 'run_metrics.json',
      entropy_run_diagnostics: entropyDiagnostics ? 'entropy_run_diagnostics.json' : null
    },
    support_label: supportLabel,
    closure_state: 'not_closed',
    validation_state: 'externally_unvalidated',
    label_reasons: reasons,
    condition_context: {
      experimental_mode: conditionMode,
      entropy_status: String(runMetrics?.run_status?.entropy_run_level_status || 'not_recorded'),
      run_verdict_status: String(verdict.status || 'UNKNOWN')
    },
    interpretation_allowed: supportLabel === 'internal_support_only'
      ? 'Repository-local descriptive support only.'
      : 'Insufficient internal posture for even repository-local support emission; keep under evaluation.',
    interpretation_not_allowed: [
      'Do not read this as external validation.',
      'Do not read this as claim closure.',
      'Do not read this as ontological confirmation.',
      'Do not read this as final system classification.'
    ],
    non_claim_boundaries: RUN_BOUNDARIES
  };

  const outputPath = path.join(artifactDir, 'support_labels.json');
  fs.writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
  return { outputPath, artifact };
};

export const buildConditionSupportLabelsArtifact = ({ outputDir, conditionSummary, comparison }) => {
  const summary = isObj(conditionSummary) ? conditionSummary : null;
  const baselinePresent = Boolean(summary?.conditions?.baseline);
  const comparisons = Array.isArray(comparison?.comparisons) ? comparison.comparisons : [];

  const conditions = {};
  for (const [condition, value] of Object.entries(summary?.conditions || {})) {
    const runCount = Number(value?.run_count || 0);
    conditions[condition] = {
      support_label: baselinePresent && runCount > 0 ? 'internal_support_only' : 'under_evaluation',
      closure_state: 'not_closed',
      validation_state: 'externally_unvalidated',
      label_reasons: baselinePresent
        ? ['descriptive_small_batch_only']
        : ['baseline_missing_for_comparison'],
      run_count: runCount,
      status_counts: value?.status_counts || {},
      entropy_status_counts: value?.entropy_status_counts || {}
    };
  }

  const artifact = {
    artifact_role: 'condition_support_label_output',
    source_artifacts: {
      condition_metrics_summary: 'condition_metrics_summary.json',
      condition_comparison: 'condition_comparison.json'
    },
    baseline_present: baselinePresent,
    conditions,
    comparison_count: comparisons.length,
    interpretation_allowed: 'Descriptive internal comparison posture only.',
    interpretation_not_allowed: [
      'Do not read these labels as causal confirmation.',
      'Do not read these labels as theory validation.',
      'Do not read these labels as external validation.'
    ],
    non_claim_boundaries: CONDITION_BOUNDARIES
  };

  const outputPath = path.join(outputDir, 'condition_support_labels.json');
  fs.writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
  return { outputPath, artifact };
};

export default {
  buildRunSupportLabelsArtifact,
  buildConditionSupportLabelsArtifact
};

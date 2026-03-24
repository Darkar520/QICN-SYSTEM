import fs from 'fs';
import path from 'path';

const isObj = (value) => value && typeof value === 'object' && !Array.isArray(value);
const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const getCount = (counts, key) => Number((isObj(counts) ? counts[key] : 0) || 0);
const MIN_CONDITION_RUN_COUNT = 2;

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
    consumption_policy_ref: 'output_consumption_policy.json',
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
  const comparisonByCondition = new Map(comparisons.map((entry) => [String(entry?.condition || ''), entry]));
  const baselineSummary = summary?.conditions?.baseline || null;

  const evaluateQualityMinimum = ({ condition, value, requireComparison }) => {
    const runCount = Number(value?.run_count || 0);
    const statusCounts = isObj(value?.status_counts) ? value.status_counts : {};
    const entropyStatusCounts = isObj(value?.entropy_status_counts) ? value.entropy_status_counts : {};
    const reasons = ['descriptive_small_batch_only'];

    if (!baselinePresent) reasons.push('baseline_missing_for_comparison');

    const sufficientRunCount = runCount >= MIN_CONDITION_RUN_COUNT;
    const discardedCount = getCount(statusCounts, 'DISCARDED');
    const tamperedCount = getCount(statusCounts, 'TAMPERED');
    const admissibleCount = getCount(statusCounts, 'ADMISSIBLE');
    const invalidEntropyCount = getCount(entropyStatusCounts, 'invalid');
    const notRecordedEntropyCount = getCount(entropyStatusCounts, 'not_recorded');

    if (!sufficientRunCount) reasons.push('insufficient_condition_run_count');
    if (discardedCount > 0) reasons.push('discarded_runs_present');
    if (tamperedCount > 0) reasons.push('tampered_runs_present');
    if (admissibleCount !== runCount) reasons.push('non_admissible_runs_present');
    if (invalidEntropyCount > 0) reasons.push('invalid_entropy_status_present');
    if (notRecordedEntropyCount > 0) reasons.push('entropy_status_not_recorded_present');

    if (requireComparison) {
      if (!comparisonByCondition.has(condition)) reasons.push('comparison_missing');
      if (!baselineSummary) {
        reasons.push('baseline_quality_minimum_not_met');
      } else {
        const baselineRunCount = Number(baselineSummary?.run_count || 0);
        const baselineStatusCounts = isObj(baselineSummary?.status_counts) ? baselineSummary.status_counts : {};
        const baselineEntropyStatusCounts = isObj(baselineSummary?.entropy_status_counts) ? baselineSummary.entropy_status_counts : {};
        const baselineSufficientRunCount = baselineRunCount >= MIN_CONDITION_RUN_COUNT;
        const baselineDiscarded = getCount(baselineStatusCounts, 'DISCARDED');
        const baselineTampered = getCount(baselineStatusCounts, 'TAMPERED');
        const baselineAdmissible = getCount(baselineStatusCounts, 'ADMISSIBLE');
        const baselineInvalidEntropy = getCount(baselineEntropyStatusCounts, 'invalid');
        const baselineNotRecordedEntropy = getCount(baselineEntropyStatusCounts, 'not_recorded');
        const baselineQualityOk = baselineSufficientRunCount
          && baselineDiscarded === 0
          && baselineTampered === 0
          && baselineAdmissible === baselineRunCount
          && baselineInvalidEntropy === 0
          && baselineNotRecordedEntropy === 0;

        if (!baselineQualityOk) reasons.push('baseline_quality_minimum_not_met');
      }
    }

    const qualityOk = sufficientRunCount
      && discardedCount === 0
      && tamperedCount === 0
      && admissibleCount === runCount
      && invalidEntropyCount === 0
      && notRecordedEntropyCount === 0
      && (!requireComparison || comparisonByCondition.has(condition));

    if (qualityOk) {
      reasons.push(requireComparison ? 'comparison_available' : 'baseline_reference_condition');
      reasons.push('condition_quality_minimum_met');
    }

    return { qualityOk, reasons, runCount, statusCounts, entropyStatusCounts };
  };

  const conditions = {};
  for (const [condition, value] of Object.entries(summary?.conditions || {})) {
    const evaluation = evaluateQualityMinimum({
      condition,
      value,
      requireComparison: condition !== 'baseline'
    });
    conditions[condition] = {
      support_label: evaluation.qualityOk ? 'internal_support_only' : 'under_evaluation',
      closure_state: 'not_closed',
      validation_state: 'externally_unvalidated',
      label_reasons: evaluation.reasons,
      run_count: evaluation.runCount,
      status_counts: evaluation.statusCounts,
      entropy_status_counts: evaluation.entropyStatusCounts
    };
  }

  const artifact = {
    artifact_role: 'condition_support_label_output',
    consumption_policy_ref: 'condition_output_consumption_policy.json',
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

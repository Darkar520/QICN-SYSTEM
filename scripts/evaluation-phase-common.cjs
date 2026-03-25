const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const EVALUATION_ROOT = path.join(PROJECT_ROOT, 'artifacts', 'protocolized_evaluation');
const LOCAL_PATH_PATTERN = /\/c:\/|[A-Za-z]:\\Users\\|OneDrive|Escritorio/i;

const DOC_PATHS = {
  protocolDoc: path.join(PROJECT_ROOT, 'docs', 'PROTOCOLIZED_EVALUATION_PROTOCOL.md'),
  comparisonDoc: path.join(PROJECT_ROOT, 'docs', 'EVALUATION_COMPARISON_MATRIX.md'),
  metricsDoc: path.join(PROJECT_ROOT, 'docs', 'EVALUATION_METRICS_BASELINE.md'),
  controlsDoc: path.join(PROJECT_ROOT, 'docs', 'EVALUATION_CONTROLS_AND_INTERVENTIONS.md'),
  statsDoc: path.join(PROJECT_ROOT, 'docs', 'EVALUATION_STATISTICAL_POLICY.md'),
  boundaryDoc: path.join(PROJECT_ROOT, 'docs', 'EVALUATION_INTERPRETATION_BOUNDARY.md'),
  protocolJson: path.join(PROJECT_ROOT, 'docs', 'evaluation_protocol.v1.json'),
  comparisonJson: path.join(PROJECT_ROOT, 'docs', 'evaluation_comparison_matrix.v1.json'),
  metricsJson: path.join(PROJECT_ROOT, 'docs', 'evaluation_metrics_registry.v1.json'),
  controlsJson: path.join(PROJECT_ROOT, 'docs', 'evaluation_controls_registry.v1.json'),
  statsJson: path.join(PROJECT_ROOT, 'docs', 'evaluation_statistical_policy.v1.json')
};

const normalize = (value) => String(value || '').replace(/\\/g, '/');
const ensureDir = (dir) => {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};
const copyFile = (from, to) => {
  ensureDir(path.dirname(to));
  fs.copyFileSync(from, to);
};
const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const writeJson = (filePath, value) => {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};
const toProjectRelative = (filePath) => normalize(path.relative(PROJECT_ROOT, filePath)) || '.';
const hasText = (value) => typeof value === 'string' && value.trim().length > 0;
const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);
const toFinite = (value, fallback = null) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};
const mean = (values) => {
  if (!Array.isArray(values) || values.length === 0) return null;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
};
const variance = (values) => {
  if (!Array.isArray(values) || values.length === 0) return null;
  const avg = mean(values);
  if (!Number.isFinite(avg)) return null;
  return values.reduce((acc, value) => acc + ((value - avg) ** 2), 0) / values.length;
};
const stdDev = (values) => {
  const v = variance(values);
  return Number.isFinite(v) ? Math.sqrt(v) : null;
};
const min = (values) => (Array.isArray(values) && values.length ? Math.min(...values) : null);
const max = (values) => (Array.isArray(values) && values.length ? Math.max(...values) : null);
const getByPath = (value, pathExpression) => String(pathExpression || '')
  .split('.')
  .filter(Boolean)
  .reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), value);

const createSeededRandom = (seed = 17057) => {
  let state = Math.max(1, Math.floor(toFinite(seed, 17057)) >>> 0);
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967295;
  };
};

const summarizeNumericValues = (values) => {
  const finite = Array.isArray(values) ? values.filter((value) => Number.isFinite(value)) : [];
  return {
    sample_count: finite.length,
    mean: finite.length ? mean(finite) : null,
    min: finite.length ? min(finite) : null,
    max: finite.length ? max(finite) : null,
    std_dev: finite.length ? stdDev(finite) : null,
    empirical_min_max_band: finite.length ? [min(finite), max(finite)] : null
  };
};

const hedgesG = (aValues, bValues) => {
  const a = Array.isArray(aValues) ? aValues.filter((value) => Number.isFinite(value)) : [];
  const b = Array.isArray(bValues) ? bValues.filter((value) => Number.isFinite(value)) : [];
  if (a.length < 2 || b.length < 2) return null;
  const aMean = mean(a);
  const bMean = mean(b);
  const aVar = variance(a);
  const bVar = variance(b);
  if (!Number.isFinite(aMean) || !Number.isFinite(bMean) || !Number.isFinite(aVar) || !Number.isFinite(bVar)) return null;
  const pooledNumerator = ((a.length - 1) * aVar) + ((b.length - 1) * bVar);
  const pooledDenominator = a.length + b.length - 2;
  if (!Number.isFinite(pooledNumerator) || pooledDenominator <= 0) return null;
  const pooledStd = Math.sqrt(pooledNumerator / pooledDenominator);
  if (!Number.isFinite(pooledStd) || pooledStd === 0) return null;
  const correction = 1 - (3 / ((4 * (a.length + b.length)) - 9));
  return ((bMean - aMean) / pooledStd) * correction;
};

const latestDirByPrefix = (dir, prefix) => {
  if (!fs.existsSync(dir)) return null;
  const matches = fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith(prefix))
    .map((entry) => path.join(dir, entry.name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return matches[0] || null;
};

const loadDefinitions = () => ({
  protocol: readJson(DOC_PATHS.protocolJson),
  comparisonMatrix: readJson(DOC_PATHS.comparisonJson),
  metricsRegistry: readJson(DOC_PATHS.metricsJson),
  controlsRegistry: readJson(DOC_PATHS.controlsJson),
  statisticalPolicy: readJson(DOC_PATHS.statsJson)
});

const conditionAssertionsForRun = ({ conditionId, runMetrics }) => {
  const mode = String(runMetrics?.experimental_condition?.mode || '');
  const replaySourceId = runMetrics?.experimental_condition?.replay_source_id || null;
  const delayMs = toFinite(runMetrics?.experimental_condition?.delay_ms, null);
  const dropoutRate = toFinite(runMetrics?.experimental_condition?.dropout_rate, null);
  const fallbackRatio = toFinite(runMetrics?.burden?.fallback_tick_ratio, null);

  const base = {
    mode_recorded: {
      supported: true,
      passed: mode === conditionId,
      observed: mode,
      expected: conditionId
    }
  };

  if (conditionId === 'replay' || conditionId === 'shuffled') {
    base.replay_source_recorded = {
      supported: true,
      passed: hasText(replaySourceId),
      observed: replaySourceId,
      expected: 'non_empty_replay_source_id'
    };
  }
  if (conditionId === 'delayed_entropy') {
    base.delay_parameter_recorded = {
      supported: true,
      passed: Number.isFinite(delayMs) && delayMs > 0,
      observed: delayMs,
      expected: '>0'
    };
  }
  if (conditionId === 'dropout') {
    base.dropout_parameter_recorded = {
      supported: true,
      passed: Number.isFinite(dropoutRate) && dropoutRate > 0,
      observed: dropoutRate,
      expected: '>0'
    };
    base.dropout_fallback_observed = {
      supported: true,
      passed: Number.isFinite(fallbackRatio) && fallbackRatio > 0,
      observed: fallbackRatio,
      expected: '>0'
    };
  }
  return base;
};

const buildMetricValueMap = ({ metricsRegistry, runMetrics, runVerdict, entropyDiagnostics, supportLabels }) => {
  const values = {};
  for (const entry of metricsRegistry.entries || []) {
    let value = null;
    switch (entry.id) {
      case 'run_verdict_status':
        value = runVerdict?.status || null;
        break;
      case 'entropy_run_level_status':
        value = entropyDiagnostics?.run_level_status || 'not_recorded';
        break;
      case 'invalidation_incidence':
        value = runVerdict?.status === 'ADMISSIBLE' && !entropyDiagnostics?.invalidates_run ? 0 : 1;
        break;
      case 'support_label':
        value = supportLabels?.support_label || null;
        break;
      default:
        value = getByPath(runMetrics, entry.source_signal);
        break;
    }
    values[entry.id] = value;
  }
  return values;
};

const buildRunEvaluationMetricsArtifact = ({
  artifactDir,
  metricsRegistry,
  protocol,
  conditionId,
  seed,
  replicateIndex
}) => {
  const runMetrics = readJson(path.join(artifactDir, 'run_metrics.json'));
  const runVerdict = readJson(path.join(artifactDir, 'run_verdict.json'));
  const entropyDiagnostics = readJson(path.join(artifactDir, 'entropy_run_diagnostics.json'));
  const supportLabels = readJson(path.join(artifactDir, 'support_labels.json'));
  const metricValues = buildMetricValueMap({ metricsRegistry, runMetrics, runVerdict, entropyDiagnostics, supportLabels });
  const assertions = conditionAssertionsForRun({ conditionId, runMetrics });
  const artifact = {
    artifact_role: 'run_evaluation_metrics',
    protocol_ref: 'docs/evaluation_protocol.v1.json',
    metrics_registry_ref: 'docs/evaluation_metrics_registry.v1.json',
    source_artifacts: {
      run_metrics: 'run_metrics.json',
      run_verdict: 'run_verdict.json',
      entropy_run_diagnostics: 'entropy_run_diagnostics.json',
      support_labels: 'support_labels.json'
    },
    run_id: String(runMetrics.runId || runVerdict.runId || path.basename(artifactDir)),
    condition_id: conditionId,
    seed,
    replicate_index: replicateIndex,
    tick_count: Number(runMetrics?.burden?.observed_ticks || 0),
    metric_values: metricValues,
    condition_assertions: assertions,
    support_layer: {
      support_label: supportLabels?.support_label || null,
      closure_state: supportLabels?.closure_state || null,
      validation_state: supportLabels?.validation_state || null
    },
    exclusion_candidate: runVerdict?.status !== 'ADMISSIBLE' || Boolean(entropyDiagnostics?.invalidates_run),
    claim_facing_status: 'blocked',
    interpretation_boundary: 'Run evaluation metrics only; internal descriptive evaluation layer, not claim closure, not external validation, not theory confirmation.'
  };
  const outputPath = path.join(artifactDir, 'run_evaluation_metrics.json');
  writeJson(outputPath, artifact);
  return { outputPath, artifact };
};

const collectRunEvaluationArtifacts = (runsRoot) => {
  if (!fs.existsSync(runsRoot)) return [];
  const dirs = fs.readdirSync(runsRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  return dirs.map((entry) => {
    const artifactDir = path.join(runsRoot, entry.name);
    const runEvalPath = path.join(artifactDir, 'run_evaluation_metrics.json');
    if (!fs.existsSync(runEvalPath)) return null;
    return {
      artifactDir,
      runEvaluation: readJson(runEvalPath)
    };
  }).filter(Boolean);
};

const buildConditionEvaluationSummaryArtifact = ({
  runsRoot,
  aggregateRoot,
  metricsRegistry,
  protocol
}) => {
  const collected = collectRunEvaluationArtifacts(runsRoot);
  const supportLabelsPath = path.join(aggregateRoot, 'condition_support_labels.json');
  const conditionSupport = fs.existsSync(supportLabelsPath) ? readJson(supportLabelsPath) : null;
  const grouped = new Map();

  for (const run of collected) {
    const conditionId = String(run.runEvaluation.condition_id || 'unclassified');
    if (!grouped.has(conditionId)) grouped.set(conditionId, []);
    grouped.get(conditionId).push(run.runEvaluation);
  }

  const conditions = {};
  for (const [conditionId, runs] of grouped.entries()) {
    const included = runs.filter((entry) => !entry.exclusion_candidate);
    const excluded = runs.filter((entry) => entry.exclusion_candidate).map((entry) => ({
      run_id: entry.run_id,
      reason: 'authoritative_run_exclusion'
    }));

    const numericalMetrics = {};
    const categoricalMetrics = {};
    for (const entry of metricsRegistry.entries || []) {
      const values = included.map((run) => run.metric_values[entry.id]);
      if (entry.class === 'support_only' || entry.class === 'verdict_metric') {
        const counts = {};
        for (const value of values) {
          const key = value === null || value === undefined ? 'null' : String(value);
          counts[key] = (counts[key] || 0) + 1;
        }
        categoricalMetrics[entry.id] = counts;
      } else {
        numericalMetrics[entry.id] = summarizeNumericValues(values.map((value) => toFinite(value, null)));
      }
    }

    const assertionPassRates = {};
    const assertionIds = [...new Set(included.flatMap((entry) => Object.keys(entry.condition_assertions || {})))];
    for (const assertionId of assertionIds) {
      const observed = included
        .map((entry) => entry.condition_assertions?.[assertionId])
        .filter((value) => value && value.supported);
      const passCount = observed.filter((value) => value.passed).length;
      assertionPassRates[assertionId] = {
        observed_count: observed.length,
        pass_rate: observed.length > 0 ? passCount / observed.length : null
      };
    }

    conditions[conditionId] = {
      materialized_run_count: runs.length,
      included_run_count: included.length,
      excluded_run_count: excluded.length,
      seeds: [...new Set(runs.map((entry) => entry.seed))],
      included_run_ids: included.map((entry) => entry.run_id),
      excluded_runs: excluded,
      numerical_metrics: numericalMetrics,
      categorical_metrics: categoricalMetrics,
      assertion_pass_rates: assertionPassRates,
      support_layer: isObject(conditionSupport?.conditions?.[conditionId]) ? conditionSupport.conditions[conditionId] : null,
      sample_size_status: included.length < protocol.minimum_runs_per_condition
        ? 'unsupported'
        : included.length < protocol.minimum_runs_per_condition_for_minimal_contrast
          ? 'description_only'
          : 'minimal_contrast_eligible'
    };
  }

  const artifact = {
    artifact_role: 'condition_evaluation_summary',
    protocol_ref: 'docs/evaluation_protocol.v1.json',
    metrics_registry_ref: 'docs/evaluation_metrics_registry.v1.json',
    source_artifacts: {
      runs_root: toProjectRelative(runsRoot),
      condition_metrics_summary: toProjectRelative(path.join(aggregateRoot, 'condition_metrics_summary.json')),
      condition_support_labels: fs.existsSync(supportLabelsPath) ? toProjectRelative(supportLabelsPath) : null
    },
    condition_count: Object.keys(conditions).length,
    conditions,
    claim_facing_status: 'blocked',
    interpretation_boundary: 'Condition-level descriptive evaluation summary only; not causal confirmation, not claim closure, not external validation.'
  };
  const outputPath = path.join(aggregateRoot, 'condition_evaluation_summary.json');
  writeJson(outputPath, artifact);
  return { outputPath, artifact, groupedRuns: grouped };
};

const buildConditionComparisonReportArtifact = ({
  aggregateRoot,
  conditionSummaryArtifact,
  groupedRuns,
  comparisonMatrix,
  statisticalPolicy
}) => {
  const comparisons = [];

  const getRunValues = (conditionId, metricId) => {
    const runs = groupedRuns.get(conditionId) || [];
    return runs
      .filter((entry) => !entry.exclusion_candidate)
      .map((entry) => entry.metric_values[metricId]);
  };

  for (const entry of comparisonMatrix.comparisons || []) {
    const baselineCondition = String(entry.baseline || '');
    const targetCondition = String(entry.target || '');
    const baselineSummary = conditionSummaryArtifact.conditions?.[baselineCondition] || null;
    const targetSummary = conditionSummaryArtifact.conditions?.[targetCondition] || null;
    const baselineN = Number(baselineSummary?.included_run_count || 0);
    const targetN = Number(targetSummary?.included_run_count || 0);
    const blockingConditions = [];
    let status = 'description_only';

    if (!baselineSummary || !targetSummary) {
      blockingConditions.push('condition_missing');
      status = 'unsupported';
    } else if (baselineN < entry.minimum_n_per_condition_for_description || targetN < entry.minimum_n_per_condition_for_description) {
      blockingConditions.push('insufficient_n_for_description');
      status = 'unsupported';
    } else if (
      entry.support_level === 'minimal_contrast'
      && baselineN >= entry.minimum_n_per_condition_for_minimal_contrast
      && targetN >= entry.minimum_n_per_condition_for_minimal_contrast
    ) {
      status = 'minimal_contrast';
    } else {
      status = 'description_only';
    }

    const buildMetricBlock = (metricId) => {
      const baselineRawValues = getRunValues(baselineCondition, metricId);
      const targetRawValues = getRunValues(targetCondition, metricId);
      const baselineValues = baselineRawValues.map((value) => toFinite(value, null));
      const targetValues = targetRawValues.map((value) => toFinite(value, null));
      const baselineStats = summarizeNumericValues(baselineValues);
      const targetStats = summarizeNumericValues(targetValues);
      const baselineMean = toFinite(baselineStats.mean, null);
      const targetMean = toFinite(targetStats.mean, null);
      const baselineCounts = {};
      const targetCounts = {};
      for (const value of baselineRawValues) {
        if (value === null || value === undefined) continue;
        const key = String(value);
        baselineCounts[key] = (baselineCounts[key] || 0) + 1;
      }
      for (const value of targetRawValues) {
        if (value === null || value === undefined) continue;
        const key = String(value);
        targetCounts[key] = (targetCounts[key] || 0) + 1;
      }
      const numericObserved = baselineStats.sample_count > 0 || targetStats.sample_count > 0;
      return {
        metric_kind: numericObserved ? 'numeric' : 'categorical_or_unsupported',
        baseline: baselineStats,
        target: targetStats,
        baseline_counts: Object.keys(baselineCounts).length > 0 ? baselineCounts : null,
        target_counts: Object.keys(targetCounts).length > 0 ? targetCounts : null,
        delta_abs: Number.isFinite(baselineMean) && Number.isFinite(targetMean) ? targetMean - baselineMean : null,
        delta_rel: Number.isFinite(baselineMean) && baselineMean !== 0 && Number.isFinite(targetMean)
          ? (targetMean - baselineMean) / Math.abs(baselineMean)
          : null,
        hedges_g: numericObserved && status === 'minimal_contrast' ? hedgesG(baselineValues, targetValues) : null
      };
    };

    const primaryMetrics = Object.fromEntries((entry.primary_metrics || []).map((metricId) => [metricId, buildMetricBlock(metricId)]));
    const secondaryMetrics = Object.fromEntries((entry.secondary_metrics || []).map((metricId) => [metricId, buildMetricBlock(metricId)]));

    comparisons.push({
      id: entry.id,
      baseline: baselineCondition,
      target: targetCondition,
      comparison_type: entry.comparison_type,
      support_level_declared: entry.support_level,
      realized_support_level: status,
      minimum_n_per_condition_for_description: entry.minimum_n_per_condition_for_description,
      minimum_n_per_condition_for_minimal_contrast: entry.minimum_n_per_condition_for_minimal_contrast,
      baseline_included_n: baselineN,
      target_included_n: targetN,
      blocking_conditions: blockingConditions,
      primary_metrics: primaryMetrics,
      secondary_metrics: secondaryMetrics,
      non_claim_boundary: entry.non_claim_boundary
    });
  }

  const artifact = {
    artifact_role: 'condition_comparison_report',
    comparison_matrix_ref: 'docs/evaluation_comparison_matrix.v1.json',
    statistical_policy_ref: 'docs/evaluation_statistical_policy.v1.json',
    source_artifacts: {
      condition_evaluation_summary: toProjectRelative(path.join(aggregateRoot, 'condition_evaluation_summary.json')),
      condition_metrics_summary: toProjectRelative(path.join(aggregateRoot, 'condition_metrics_summary.json'))
    },
    comparisons,
    unsupported_comparisons: comparisonMatrix.unsupported_comparisons || [],
    claim_facing_status: 'blocked',
    interpretation_boundary: 'Condition comparison report only; descriptive or minimal internal contrast, never causal confirmation, never theory validation.'
  };

  const outputPath = path.join(aggregateRoot, 'condition_comparison_report.json');
  writeJson(outputPath, artifact);
  return { outputPath, artifact };
};

const detectLocalPathMatches = (files) => {
  const matches = [];
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    if (LOCAL_PATH_PATTERN.test(text)) {
      matches.push(toProjectRelative(file));
    }
  }
  return matches;
};

module.exports = {
  PROJECT_ROOT,
  EVALUATION_ROOT,
  DOC_PATHS,
  normalize,
  ensureDir,
  readJson,
  writeJson,
  toProjectRelative,
  createSeededRandom,
  summarizeNumericValues,
  hedgesG,
  latestDirByPrefix,
  loadDefinitions,
  buildRunEvaluationMetricsArtifact,
  collectRunEvaluationArtifacts,
  buildConditionEvaluationSummaryArtifact,
  buildConditionComparisonReportArtifact,
  detectLocalPathMatches,
  copyFile
};

import fs from 'fs';
import path from 'path';

const isObj = (value) => value && typeof value === 'object' && !Array.isArray(value);
const toFinite = (value, fallback = null) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};
const safeRatio = (numerator, denominator) => {
  const num = Number(numerator);
  const den = Number(denominator);
  if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) return null;
  return num / den;
};
const mean = (values) => {
  if (!Array.isArray(values) || values.length === 0) return null;
  const total = values.reduce((acc, value) => acc + value, 0);
  return total / values.length;
};
const variance = (values) => {
  if (!Array.isArray(values) || values.length === 0) return null;
  const avg = mean(values);
  if (!Number.isFinite(avg)) return null;
  return values.reduce((acc, value) => acc + ((value - avg) ** 2), 0) / values.length;
};
const stdDev = (values) => {
  const value = variance(values);
  return Number.isFinite(value) ? Math.sqrt(value) : null;
};
const min = (values) => (Array.isArray(values) && values.length ? Math.min(...values) : null);
const max = (values) => (Array.isArray(values) && values.length ? Math.max(...values) : null);
const slopePerIndex = (values) => {
  if (!Array.isArray(values) || values.length < 2) return null;
  const xs = values.map((_, index) => index);
  const xMean = mean(xs);
  const yMean = mean(values);
  let numerator = 0;
  let denominator = 0;
  for (let index = 0; index < values.length; index += 1) {
    const xDelta = xs[index] - xMean;
    numerator += xDelta * (values[index] - yMean);
    denominator += xDelta * xDelta;
  }
  if (!Number.isFinite(denominator) || denominator === 0) return null;
  return numerator / denominator;
};
const seriesStats = (values) => {
  const finiteValues = Array.isArray(values) ? values.filter((value) => Number.isFinite(value)) : [];
  if (finiteValues.length === 0) {
    return {
      sample_count: 0,
      mean: null,
      min: null,
      max: null,
      range: null,
      variance: null,
      std_dev: null,
      start: null,
      end: null,
      start_end_delta: null,
      slope_per_tick: null
    };
  }
  const start = finiteValues[0];
  const end = finiteValues[finiteValues.length - 1];
  return {
    sample_count: finiteValues.length,
    mean: mean(finiteValues),
    min: min(finiteValues),
    max: max(finiteValues),
    range: finiteValues.length > 0 ? max(finiteValues) - min(finiteValues) : null,
    variance: variance(finiteValues),
    std_dev: stdDev(finiteValues),
    start,
    end,
    start_end_delta: Number.isFinite(start) && Number.isFinite(end) ? end - start : null,
    slope_per_tick: slopePerIndex(finiteValues)
  };
};
const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const readOptionalJson = (filePath) => (fs.existsSync(filePath) ? readJson(filePath) : null);
const readNdjson = (filePath) => fs
  .readFileSync(filePath, 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => JSON.parse(line));
const getByPath = (value, pathExpression) => String(pathExpression || '')
  .split('.')
  .filter(Boolean)
  .reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), value);

const summarizeCollection = (values) => {
  const finiteValues = values.filter((value) => Number.isFinite(value));
  if (finiteValues.length === 0) {
    return {
      sample_count: 0,
      mean: null,
      min: null,
      max: null,
      std_dev: null
    };
  }
  return {
    sample_count: finiteValues.length,
    mean: mean(finiteValues),
    min: min(finiteValues),
    max: max(finiteValues),
    std_dev: stdDev(finiteValues)
  };
};

const RUN_METRIC_PATHS = [
  'stability.tick_budget_p95_ms',
  'stability.quantum_primary_ratio',
  'stability.channel_clean_ratio',
  'stability.effective_mode_cardinality',
  'stability.entropy_latency_mean_ms',
  'burden.fallback_tick_ratio',
  'burden.stale_tick_ratio',
  'burden.degraded_tick_ratio',
  'burden.provider_error_burden',
  'burden.buffer_exhaustion_burden',
  'burden.invalidation_incidence',
  'dispersion_intra_run.omega.std_dev',
  'dispersion_intra_run.ccc.std_dev',
  'drift.omega.slope_per_tick',
  'drift.ccc.slope_per_tick'
];

export const buildRunMetricsArtifact = ({ artifactDir }) => {
  const summary = readJson(path.join(artifactDir, 'run_summary.json'));
  const verdict = readJson(path.join(artifactDir, 'run_verdict.json'));
  const ticks = readNdjson(path.join(artifactDir, 'ticks.ndjson'));
  const entropyPreVerdict = readOptionalJson(path.join(artifactDir, 'entropy_preverdict.json'));
  const entropyRunDiagnostics = readOptionalJson(path.join(artifactDir, 'entropy_run_diagnostics.json'));
  const experiment = entropyPreVerdict?.experiment?.last_condition || { mode: 'baseline' };

  const omegaSeries = ticks.map((row) => toFinite(row?.metrics?.omega, null)).filter((value) => Number.isFinite(value));
  const cccSeries = ticks.map((row) => toFinite(row?.metrics?.ccc, null)).filter((value) => Number.isFinite(value));
  const pmiaSeries = ticks.map((row) => toFinite(row?.metrics?.pmia, null)).filter((value) => Number.isFinite(value));
  const stasisSeries = ticks.map((row) => toFinite(row?.metrics?.stasis_index, null)).filter((value) => Number.isFinite(value));

  const observedTicks = Number(entropyPreVerdict?.summary?.observed_ticks || 0);
  const quantumPrimaryTicks = Number(entropyPreVerdict?.summary?.quantum_primary_ticks || 0);
  const staleTicks = Number(entropyPreVerdict?.summary?.stale_ticks || 0);
  const fallbackTicks = Number(entropyPreVerdict?.summary?.fallback_ticks || 0);
  const degradedTicks = Number(entropyPreVerdict?.summary?.degraded_ticks || 0);
  const pendingTicks = Number(entropyPreVerdict?.summary?.pending_ticks || 0);
  const providerErrorCount = Number(entropyPreVerdict?.summary?.provider_error_count || 0);
  const bufferExhaustions = Number(entropyPreVerdict?.summary?.buffer_exhaustions || 0);

  const artifact = {
    runId: String(summary.runId || verdict.runId || path.basename(artifactDir)),
    artifact_role: 'run_level_metrics_auxiliary',
    source_artifacts: {
      run_summary: 'run_summary.json',
      entropy_preverdict: entropyPreVerdict ? 'entropy_preverdict.json' : null,
      entropy_run_diagnostics: entropyRunDiagnostics ? 'entropy_run_diagnostics.json' : null,
      run_verdict: 'run_verdict.json',
      ticks: 'ticks.ndjson'
    },
    experimental_condition: {
      mode: String(experiment.mode || 'baseline'),
      active: Boolean(experiment.active),
      seed: toFinite(experiment.seed, null),
      delay_ms: toFinite(experiment.delay_ms, null),
      dropout_rate: toFinite(experiment.dropout_rate, null),
      replay_source_id: experiment.replay_source_id || null,
      intervention_surface: experiment.intervention_surface || null
    },
    run_status: {
      run_verdict_status: String(verdict.status || 'UNKNOWN'),
      entropy_run_level_status: String(entropyRunDiagnostics?.run_level_status || 'not_recorded'),
      entropy_invalidates_run: Boolean(entropyRunDiagnostics?.invalidates_run),
      entropy_warnings: Array.isArray(entropyRunDiagnostics?.warnings) ? entropyRunDiagnostics.warnings : []
    },
    stability: {
      tick_budget_p95_ms: toFinite(summary?.tick_ms?.p95, null),
      tick_budget_max_ms: toFinite(summary?.tick_ms?.max, null),
      quantum_primary_ratio: safeRatio(quantumPrimaryTicks, observedTicks),
      channel_clean_ratio: safeRatio(Math.max(0, observedTicks - degradedTicks), observedTicks),
      entropy_latency_mean_ms: toFinite(entropyPreVerdict?.freshness?.latency_observed_mean_ms, null),
      entropy_latency_max_ms: toFinite(entropyPreVerdict?.freshness?.latency_observed_max_ms, null),
      effective_mode_cardinality: Array.isArray(entropyPreVerdict?.effective_modes_seen)
        ? entropyPreVerdict.effective_modes_seen.length
        : 0,
      connection_state_cardinality: Array.isArray(entropyPreVerdict?.connection_states_seen)
        ? entropyPreVerdict.connection_states_seen.length
        : 0
    },
    burden: {
      observed_ticks: observedTicks,
      fallback_tick_ratio: safeRatio(fallbackTicks, observedTicks),
      stale_tick_ratio: safeRatio(staleTicks, observedTicks),
      degraded_tick_ratio: safeRatio(degradedTicks, observedTicks),
      pending_tick_ratio: safeRatio(pendingTicks, observedTicks),
      provider_error_burden: safeRatio(providerErrorCount, observedTicks),
      buffer_exhaustion_burden: safeRatio(bufferExhaustions, observedTicks),
      invalidation_incidence: verdict.status === 'DISCARDED' ? 1 : 0
    },
    drift: {
      omega: seriesStats(omegaSeries),
      ccc: seriesStats(cccSeries),
      pmia: seriesStats(pmiaSeries),
      stasis_index: seriesStats(stasisSeries)
    },
    dispersion_intra_run: {
      omega: seriesStats(omegaSeries),
      ccc: seriesStats(cccSeries),
      pmia: seriesStats(pmiaSeries),
      stasis_index: seriesStats(stasisSeries)
    },
    recovery: {
      supported: false,
      reason: 'transition_series_not_persisted_in_run_artifacts'
    },
    interpretation_boundary: 'Descriptive internal metrics only; no claim closure, no causal inference, no external validation.'
  };

  const outputPath = path.join(artifactDir, 'run_metrics.json');
  fs.writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
  return { outputPath, artifact };
};

export const buildConditionMetricsArtifacts = ({ artifactsRoot, outputDir = artifactsRoot }) => {
  const root = path.resolve(artifactsRoot);
  const dirs = fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(root, entry.name))
    .filter((dirPath) => fs.existsSync(path.join(dirPath, 'run_metrics.json')));

  const runs = dirs.map((dirPath) => {
    const metrics = readJson(path.join(dirPath, 'run_metrics.json'));
    return {
      artifactDir: dirPath,
      metrics
    };
  });

  const grouped = new Map();
  for (const run of runs) {
    const mode = String(run.metrics?.experimental_condition?.mode || 'unclassified');
    if (!grouped.has(mode)) grouped.set(mode, []);
    grouped.get(mode).push(run.metrics);
  }

  const conditionSummary = {
    artifact_role: 'small_batch_condition_summary',
    source_artifact: 'run_metrics.json',
    condition_count: grouped.size,
    conditions: {}
  };

  for (const [mode, metricsList] of grouped.entries()) {
    const statusCounts = {};
    const entropyStatusCounts = {};
    for (const metrics of metricsList) {
      const runStatus = String(metrics?.run_status?.run_verdict_status || 'UNKNOWN');
      const entropyStatus = String(metrics?.run_status?.entropy_run_level_status || 'UNKNOWN');
      statusCounts[runStatus] = (statusCounts[runStatus] || 0) + 1;
      entropyStatusCounts[entropyStatus] = (entropyStatusCounts[entropyStatus] || 0) + 1;
    }
    const metricsSummary = {};
    for (const metricPath of RUN_METRIC_PATHS) {
      metricsSummary[metricPath] = summarizeCollection(metricsList.map((metrics) => toFinite(getByPath(metrics, metricPath), null)));
    }
    conditionSummary.conditions[mode] = {
      run_count: metricsList.length,
      run_ids: metricsList.map((metrics) => metrics.runId),
      status_counts: statusCounts,
      entropy_status_counts: entropyStatusCounts,
      representative_condition_parameters: {
        seed_values: [...new Set(metricsList.map((metrics) => metrics.experimental_condition?.seed).filter((value) => value !== null))],
        delay_ms_values: [...new Set(metricsList.map((metrics) => metrics.experimental_condition?.delay_ms).filter((value) => value !== null))],
        dropout_rate_values: [...new Set(metricsList.map((metrics) => metrics.experimental_condition?.dropout_rate).filter((value) => value !== null))],
        replay_source_ids: [...new Set(metricsList.map((metrics) => metrics.experimental_condition?.replay_source_id).filter(Boolean))]
      },
      metrics: metricsSummary,
      interpretation_boundary: 'Small-batch descriptive summary only.'
    };
  }

  const baselineSummary = conditionSummary.conditions.baseline || null;
  const comparison = {
    artifact_role: 'small_batch_condition_comparison',
    baseline_condition: baselineSummary ? 'baseline' : null,
    compared_metrics: RUN_METRIC_PATHS,
    comparisons: []
  };

  if (baselineSummary) {
    for (const [mode, summary] of Object.entries(conditionSummary.conditions)) {
      if (mode === 'baseline') continue;
      const metricDiffs = {};
      for (const metricPath of RUN_METRIC_PATHS) {
        const baselineMean = toFinite(baselineSummary.metrics?.[metricPath]?.mean, null);
        const conditionMean = toFinite(summary.metrics?.[metricPath]?.mean, null);
        metricDiffs[metricPath] = {
          baseline_mean: baselineMean,
          condition_mean: conditionMean,
          delta_abs: Number.isFinite(baselineMean) && Number.isFinite(conditionMean)
            ? conditionMean - baselineMean
            : null,
          delta_rel: Number.isFinite(baselineMean) && baselineMean !== 0 && Number.isFinite(conditionMean)
            ? (conditionMean - baselineMean) / Math.abs(baselineMean)
            : null
        };
      }
      comparison.comparisons.push({
        condition: mode,
        baseline_run_count: baselineSummary.run_count,
        condition_run_count: summary.run_count,
        metrics: metricDiffs,
        interpretation_boundary: 'Descriptive delta versus baseline only; no causal or theoretical claim.'
      });
    }
  }

  fs.mkdirSync(outputDir, { recursive: true });
  const summaryPath = path.join(outputDir, 'condition_metrics_summary.json');
  const comparisonPath = path.join(outputDir, 'condition_comparison.json');
  fs.writeFileSync(summaryPath, `${JSON.stringify(conditionSummary, null, 2)}\n`, 'utf8');
  fs.writeFileSync(comparisonPath, `${JSON.stringify(comparison, null, 2)}\n`, 'utf8');
  return { summaryPath, comparisonPath, conditionSummary, comparison };
};

export default {
  buildRunMetricsArtifact,
  buildConditionMetricsArtifacts
};

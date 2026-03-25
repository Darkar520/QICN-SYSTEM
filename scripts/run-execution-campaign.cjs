const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const {
  SYSTEM_ROOT,
  normalize,
  ensureDir,
  writeJson,
  evaluateEcosystem
} = require('./ecosystem-release-common.cjs');
const {
  loadDefinitions,
  readJson
} = require('./evaluation-phase-common.cjs');

const CAMPAIGN_ROOT = path.join(SYSTEM_ROOT, 'artifacts', 'execution_campaign');
const LOCAL_PATH_PATTERN = /\/c:\/|[A-Za-z]:\\Users\\|OneDrive|Escritorio/i;

const parseArg = (name, fallback = null) => {
  const hit = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const parseListArg = (name, fallback = []) => {
  const raw = parseArg(name, null);
  if (!raw) return fallback;
  const values = String(raw)
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value));
  return values.length > 0 ? values : fallback;
};

const toProjectRelative = (filePath) => normalize(path.relative(SYSTEM_ROOT, filePath)) || '.';

const sumConditionField = (conditionStatuses, field) => Object.values(conditionStatuses || {})
  .reduce((acc, entry) => acc + Number(entry?.[field] || 0), 0);

const summarizeMetric = (conditionSummary, conditionId, metricId) =>
  conditionSummary?.conditions?.[conditionId]?.numerical_metrics?.[metricId] || null;

const buildComparisonHighlight = (comparison) => {
  const highlightMetrics = {};
  for (const [metricId, value] of Object.entries(comparison.primary_metrics || {})) {
    highlightMetrics[metricId] = {
      delta_abs: value.delta_abs ?? null,
      delta_rel: value.delta_rel ?? null,
      hedges_g: value.hedges_g ?? null
    };
  }
  return {
    id: comparison.id,
    declared_support_level: comparison.support_level_declared,
    realized_support_level: comparison.realized_support_level,
    blocking_conditions: comparison.blocking_conditions || [],
    primary_metric_deltas: highlightMetrics
  };
};

const portabilityMatches = (files) => files
  .filter((file) => fs.existsSync(file))
  .filter((file) => LOCAL_PATH_PATTERN.test(fs.readFileSync(file, 'utf8')))
  .map((file) => toProjectRelative(file));

(async () => {
  const generatedAt = new Date().toISOString();
  const defaultSeedSchedule = [
    17057,
    17058,
    17059,
    17060,
    17061,
    17062,
    17063,
    17064,
    17065
  ];
  const campaignId = parseArg('campaign-id', `execution_campaign_${generatedAt.replace(/[:.]/g, '-')}`);
  const batchId = parseArg('batch-id', `${campaignId}_primary_batch`);
  const seedSchedule = parseListArg('seed-schedule', defaultSeedSchedule);
  const campaignDir = path.join(CAMPAIGN_ROOT, 'campaigns', campaignId);
  ensureDir(campaignDir);
  ensureDir(CAMPAIGN_ROOT);

  const { protocol } = loadDefinitions();
  const ecosystem = evaluateEcosystem();
  if (ecosystem.verificationMatrix.status !== 'PASS') {
    throw new Error(`Frozen ecosystem candidate must remain PASS before campaign execution. current=${ecosystem.verificationMatrix.status}`);
  }

  readJson(path.join(SYSTEM_ROOT, 'docs', 'evaluation_architecture_freeze.v1.json'));
  if (seedSchedule.length < protocol.minimum_runs_per_condition_for_minimal_contrast) {
    throw new Error(`Execution campaign seed schedule is too small. received=${seedSchedule.length}, minimum_for_minimal_contrast=${protocol.minimum_runs_per_condition_for_minimal_contrast}`);
  }

  const plan = {
    artifact_role: 'execution_campaign_plan',
    schema_version: '1.0.0',
    generated_at: generatedAt,
    campaign_id: campaignId,
    batch_id: batchId,
    campaign_class: 'serious_internal_execution_campaign',
    ecosystem_candidate_required_status: ecosystem.verificationMatrix.status,
    architecture_freeze_ref: 'docs/evaluation_architecture_freeze.v1.json',
    baseline: {
      qicn_system_head: ecosystem.model.system.state.head,
      qicn_release_head: ecosystem.model.release.state.head,
      release_freeze_commit: ecosystem.model.release.freeze_manifest.freeze_reference.local_tag_commit,
      release_upstream_pin_status: ecosystem.model.release.freeze_manifest.pin_status.upstream_pin_status
    },
    frozen_sources_of_truth: {
      protocol_ref: 'docs/evaluation_protocol.v1.json',
      comparison_matrix_ref: 'docs/evaluation_comparison_matrix.v1.json',
      metrics_registry_ref: 'docs/evaluation_metrics_registry.v1.json',
      controls_registry_ref: 'docs/evaluation_controls_registry.v1.json',
      statistical_policy_ref: 'docs/evaluation_statistical_policy.v1.json',
      interpretation_boundary_ref: 'docs/EVALUATION_INTERPRETATION_BOUNDARY.md'
    },
    conditions: protocol.condition_order,
    n_per_condition: seedSchedule.length,
    seed_schedule: seedSchedule,
    execution_order: protocol.condition_order,
    justification: {
      rationale: 'One primary serious batch at 9 runs per condition. This is 3x the protocol minimum for minimal contrast and 50% above the prior serious batch size, while remaining operationally lightweight on the frozen baseline.',
      cost_posture: 'single_runner_batch_no_manual_stitching',
      statistical_posture: 'improves dispersion visibility without changing the statistical policy'
    },
    rerun_policy: {
      rerun_same_campaign_if: [
        'campaign_batch_fails_structurally',
        'required_artifact_missing',
        'repo_baselines_drift_before_execution'
      ],
      do_not_rerun_for: [
        'desire_for_better_story',
        'unsupported_comparisons',
        'non_claim_facing_readout_preferences'
      ]
    },
    exclusion_policy: protocol.exclusion_rules,
    invalidates_batch_if: [
      'required_condition_missing',
      'included_run_count_below_minimum_runs_per_condition',
      'aggregate_artifact_verification_failed',
      'condition_assertion_failure'
    ],
    required_artifacts: {
      batch: protocol.required_batch_artifacts,
      campaign: [
        'campaign_execution_plan.json',
        'execution_campaign_readout.json',
        'latest_campaign_pointer.json'
      ]
    },
    blocked_claim_facing_outputs: [
      'run_evaluation_metrics.json',
      'condition_evaluation_summary.json',
      'condition_comparison_report.json',
      'evaluation_protocol_manifest.json',
      'evaluation_batch_report.json',
      'campaign_execution_plan.json',
      'execution_campaign_readout.json',
      'latest_campaign_pointer.json'
    ],
    interpretation_boundary: 'Execution campaign plan only; internal reproducible evaluation campaign, not external validation, not theory confirmation, not claim closure.'
  };

  const rootPlanPath = path.join(CAMPAIGN_ROOT, 'campaign_execution_plan.json');
  const campaignPlanPath = path.join(campaignDir, 'campaign_execution_plan.json');
  writeJson(rootPlanPath, plan);
  writeJson(campaignPlanPath, plan);

  const runnerStdout = cp.execFileSync(
    process.execPath,
    [
      path.join(__dirname, 'run-protocolized-evaluation.cjs'),
      `--batch-id=${batchId}`,
      `--seed-schedule=${seedSchedule.join(',')}`
    ],
    {
      cwd: SYSTEM_ROOT,
      encoding: 'utf8'
    }
  );

  const runnerOutput = JSON.parse(runnerStdout);
  const protocolManifestPath = path.join(SYSTEM_ROOT, runnerOutput.protocol_manifest);
  const batchReportPath = path.join(SYSTEM_ROOT, runnerOutput.batch_report);
  const aggregateRoot = path.join(SYSTEM_ROOT, runnerOutput.aggregate_root);
  const protocolManifest = readJson(protocolManifestPath);
  const batchReport = readJson(batchReportPath);
  const conditionSummary = readJson(path.join(aggregateRoot, 'condition_evaluation_summary.json'));
  const comparisonReport = readJson(path.join(aggregateRoot, 'condition_comparison_report.json'));
  const latestCandidate = readJson(path.join(SYSTEM_ROOT, 'artifacts', 'ecosystem_release_candidate', 'ecosystem_release_candidate_manifest.json'));

  const sampleSizeByCondition = Object.fromEntries(
    Object.entries(batchReport.condition_statuses || {}).map(([conditionId, status]) => [
      conditionId,
      {
        sample_size_status: status.sample_size_status,
        materialized_runs: status.materialized_run_count,
        included_runs: status.included_run_count,
        excluded_runs: status.excluded_run_count
      }
    ])
  );

  const comparisonsBySupport = {
    description_only: (comparisonReport.comparisons || [])
      .filter((entry) => entry.realized_support_level === 'description_only')
      .map((entry) => entry.id),
    minimal_contrast: (comparisonReport.comparisons || [])
      .filter((entry) => entry.realized_support_level === 'minimal_contrast')
      .map((entry) => entry.id),
    unsupported: (comparisonReport.unsupported_comparisons || []).map((entry) => entry.id)
  };

  const readout = {
    artifact_role: 'execution_campaign_readout',
    schema_version: '1.0.0',
    generated_at: new Date().toISOString(),
    campaign_id: campaignId,
    batch_id: batchId,
    status: batchReport.status,
    architecture_freeze_ref: 'docs/evaluation_architecture_freeze.v1.json',
    campaign_plan_ref: 'artifacts/execution_campaign/campaign_execution_plan.json',
    batch_artifacts: {
      evaluation_protocol_manifest: toProjectRelative(protocolManifestPath),
      evaluation_batch_report: toProjectRelative(batchReportPath),
      condition_evaluation_summary: toProjectRelative(path.join(aggregateRoot, 'condition_evaluation_summary.json')),
      condition_comparison_report: toProjectRelative(path.join(aggregateRoot, 'condition_comparison_report.json'))
    },
    run_counts: {
      total_materialized_runs: batchReport.run_count,
      included_runs: sumConditionField(batchReport.condition_statuses, 'included_run_count'),
      excluded_runs: sumConditionField(batchReport.condition_statuses, 'excluded_run_count')
    },
    sample_size_by_condition: sampleSizeByCondition,
    comparisons: {
      emitted: (comparisonReport.comparisons || []).map((entry) => buildComparisonHighlight(entry)),
      unsupported: comparisonReport.unsupported_comparisons || [],
      by_support_level: comparisonsBySupport
    },
    burden_and_stability_snapshot: {
      baseline: {
        fallback_tick_ratio: summarizeMetric(conditionSummary, 'baseline', 'fallback_tick_ratio'),
        entropy_latency_mean_ms: summarizeMetric(conditionSummary, 'baseline', 'entropy_latency_mean_ms'),
        omega_mean: summarizeMetric(conditionSummary, 'baseline', 'omega_mean'),
        ccc_mean: summarizeMetric(conditionSummary, 'baseline', 'ccc_mean')
      },
      delayed_entropy: {
        entropy_latency_mean_ms: summarizeMetric(conditionSummary, 'delayed_entropy', 'entropy_latency_mean_ms'),
        entropy_latency_max_ms: summarizeMetric(conditionSummary, 'delayed_entropy', 'entropy_latency_max_ms'),
        tick_budget_p95_ms: summarizeMetric(conditionSummary, 'delayed_entropy', 'tick_budget_p95_ms')
      },
      dropout: {
        fallback_tick_ratio: summarizeMetric(conditionSummary, 'dropout', 'fallback_tick_ratio'),
        degraded_tick_ratio: summarizeMetric(conditionSummary, 'dropout', 'degraded_tick_ratio'),
        pending_tick_ratio: summarizeMetric(conditionSummary, 'dropout', 'pending_tick_ratio')
      },
      prng_only: {
        fallback_tick_ratio: summarizeMetric(conditionSummary, 'prng_only', 'fallback_tick_ratio'),
        entropy_latency_mean_ms: summarizeMetric(conditionSummary, 'prng_only', 'entropy_latency_mean_ms'),
        omega_mean: summarizeMetric(conditionSummary, 'prng_only', 'omega_mean'),
        ccc_mean: summarizeMetric(conditionSummary, 'prng_only', 'ccc_mean')
      }
    },
    seed_dispersion_snapshot: {
      baseline: {
        omega_mean_std_dev: summarizeMetric(conditionSummary, 'baseline', 'omega_mean')?.std_dev ?? null,
        ccc_mean_std_dev: summarizeMetric(conditionSummary, 'baseline', 'ccc_mean')?.std_dev ?? null,
        entropy_latency_mean_ms_std_dev: summarizeMetric(conditionSummary, 'baseline', 'entropy_latency_mean_ms')?.std_dev ?? null
      },
      prng_only: {
        omega_mean_std_dev: summarizeMetric(conditionSummary, 'prng_only', 'omega_mean')?.std_dev ?? null,
        ccc_mean_std_dev: summarizeMetric(conditionSummary, 'prng_only', 'ccc_mean')?.std_dev ?? null,
        entropy_latency_mean_ms_std_dev: summarizeMetric(conditionSummary, 'prng_only', 'entropy_latency_mean_ms')?.std_dev ?? null
      }
    },
    qa_qc: {
      structural_issues: batchReport.failures || [],
      campaign_warnings: batchReport.warnings || [],
      legitimate_degradations: Object.entries(batchReport.condition_statuses || {})
        .filter(([, status]) => status.sample_size_status !== 'minimal_contrast_eligible')
        .map(([conditionId, status]) => `${conditionId}:${status.sample_size_status}`),
      artifacts_missing: [
        protocolManifestPath,
        batchReportPath,
        path.join(aggregateRoot, 'condition_evaluation_summary.json'),
        path.join(aggregateRoot, 'condition_comparison_report.json')
      ].filter((file) => !fs.existsSync(file)).map((file) => toProjectRelative(file)),
      protocol_drift_detected: !(
        protocolManifest.baselines?.qicn_system?.head === ecosystem.model.system.state.head
        && protocolManifest.baselines?.qicn_release?.head === ecosystem.model.release.state.head
        && protocolManifest.ecosystem_candidate_status === 'PASS'
        && latestCandidate.candidate_status === 'PASS'
      ),
      local_path_leaks: portabilityMatches([
        rootPlanPath,
        campaignPlanPath,
        protocolManifestPath,
        batchReportPath,
        path.join(aggregateRoot, 'condition_evaluation_summary.json'),
        path.join(aggregateRoot, 'condition_comparison_report.json')
      ]),
      blocked_claim_facing_outputs: protocolManifest.blocked_claim_facing_outputs || [],
      claim_facing_status: 'blocked'
    },
    supported_internal_reads: [
      'condition-level descriptive burden and stability summary',
      'matrix-permitted minimal contrasts only',
      'seed-dispersion visibility within the frozen policy'
    ],
    blocked_interpretations: [
      'external_validation',
      'theory_confirmation',
      'claim_closure',
      'framework_validation',
      'causal_proof',
      'corpus_validation_from_runtime',
      'automatic_promotion_from_contrast_to_claim',
      'public_release_readiness'
    ],
    interpretation_boundary: 'Execution campaign readout only; internal descriptive and minimal-contrast summary, not claim-facing, not confirmatory.'
  };

  const rootReadoutPath = path.join(CAMPAIGN_ROOT, 'execution_campaign_readout.json');
  const campaignReadoutPath = path.join(campaignDir, 'execution_campaign_readout.json');
  const pointer = {
    artifact_role: 'execution_campaign_pointer',
    generated_at: new Date().toISOString(),
    campaign_id: campaignId,
    batch_id: batchId,
    campaign_root: toProjectRelative(campaignDir),
    batch_root: runnerOutput.batch_root,
    readout_path: 'artifacts/execution_campaign/execution_campaign_readout.json',
    plan_path: 'artifacts/execution_campaign/campaign_execution_plan.json',
    claim_facing_status: 'blocked'
  };

  writeJson(rootReadoutPath, readout);
  writeJson(campaignReadoutPath, readout);
  writeJson(path.join(CAMPAIGN_ROOT, 'latest_campaign_pointer.json'), pointer);
  writeJson(path.join(campaignDir, 'latest_campaign_pointer.json'), pointer);

  process.stdout.write(`${JSON.stringify({
    artifact_role: 'execution_campaign_result',
    campaign_id: campaignId,
    batch_id: batchId,
    status: batchReport.status,
    plan_path: 'artifacts/execution_campaign/campaign_execution_plan.json',
    readout_path: 'artifacts/execution_campaign/execution_campaign_readout.json',
    pointer_path: 'artifacts/execution_campaign/latest_campaign_pointer.json',
    batch_report: runnerOutput.batch_report,
    protocol_manifest: runnerOutput.protocol_manifest,
    run_count: batchReport.run_count
  }, null, 2)}\n`);
})().catch((error) => {
  console.error(`FAIL run-execution-campaign: ${error.message}`);
  process.exit(1);
});

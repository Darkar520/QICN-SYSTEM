import fs from 'fs';
import path from 'path';

const RUN_POLICY_FILE = 'output_consumption_policy.json';
const CONDITION_POLICY_FILE = 'condition_output_consumption_policy.json';

const isObj = (value) => value && typeof value === 'object' && !Array.isArray(value);
const hasText = (value) => typeof value === 'string' && value.trim().length > 0;
const hasArray = (value) => Array.isArray(value) && value.length > 0;
const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const readOptionalJson = (filePath) => (fs.existsSync(filePath) ? readJson(filePath) : null);
const getByPath = (value, pathExpression) => String(pathExpression || '')
  .split('.')
  .filter(Boolean)
  .reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), value);
const unique = (values) => [...new Set(values.filter(Boolean))];

const CONSUMPTION_CLASSES = {
  internal_only: {
    definition: 'Machine-readable internal artifact only; do not surface directly to human-facing or claim-facing outputs.',
    allows: ['internal_machine_reuse', 'pre_verdict_runtime_diagnostics'],
    prohibits: ['human_facing_export', 'claim_facing_export', 'external_validation_read']
  },
  descriptive_machine_readable: {
    definition: 'Descriptive machine-readable output; it may be reused programmatically and surfaced to humans only with explicit boundaries.',
    allows: ['internal_machine_reuse', 'bounded_human_review', 'descriptive_export_with_boundary'],
    prohibits: ['causal_confirmation', 'claim_closure', 'external_validation_read']
  },
  displayable_with_boundary: {
    definition: 'May be displayed to humans only with explicit boundaries and without claim promotion.',
    allows: ['bounded_human_review', 'internal_machine_reuse'],
    prohibits: ['claim_facing_export', 'truth_labeling', 'external_validation_read']
  },
  support_only_not_claim_safe: {
    definition: 'Internal support posture only; not safe for truth labels, claim closure, or external validation language.',
    allows: ['bounded_internal_support_review'],
    prohibits: ['claim_facing_export', 'truth_labeling', 'external_validation_read']
  },
  blocked_for_external_claiming: {
    definition: 'May remain machine-readable and internally reviewable, but any external or claim-facing promotion is blocked.',
    allows: ['internal_machine_reuse', 'bounded_internal_review'],
    prohibits: ['external_claiming', 'causal_confirmation', 'claim_facing_export']
  }
};

const EXPORT_POLICIES = {
  internal_only: 'Internal tooling only; no direct human-facing export.',
  machine_readable_with_boundary_only: 'Machine-readable export is allowed, but any human-facing use requires an explicit boundary.',
  human_facing_with_boundary_only: 'Human-facing display/export is allowed only with explicit non-claim boundaries.',
  blocked_for_claim_facing_export: 'Claim-facing or externalizing export is blocked in this phase.'
};

const CLAIM_SAFETY = {
  claim_unsafe: 'Artifact is not safe for claim use.',
  support_only_not_claim_safe: 'Artifact can contribute only to internal support posture, never to claim closure.',
  external_validation_required_for_promotion: 'Any stronger interpretive promotion requires external validation not present in this repo.'
};

const boundaryPresent = (artifact, boundaryKey) => {
  const value = getByPath(artifact, boundaryKey);
  return hasText(value) || hasArray(value);
};

const refPresent = (artifact, refKey) => hasText(getByPath(artifact, refKey));

const buildEntry = ({
  artifactName,
  artifact,
  outputRole,
  consumptionClass,
  exportPolicy,
  claimSafety,
  requiredBoundaries = [],
  requiredRefs = [],
  blockingConditions = [],
  interpretationAllowed,
  interpretationNotAllowed = [],
  notes = null,
  machineReadableAllowed = true,
  humanFacingRequested = false,
  supportStatementStatus = null
}) => {
  const boundariesPresent = Object.fromEntries(requiredBoundaries.map((key) => [key, boundaryPresent(artifact, key)]));
  const refsPresent = Object.fromEntries(requiredRefs.map((key) => [key, refPresent(artifact, key)]));
  const boundaryReady = Object.values(boundariesPresent).every(Boolean);
  const refsReady = Object.values(refsPresent).every(Boolean);
  const computedBlocks = [
    ...blockingConditions,
    ...(boundaryReady ? [] : ['required_boundary_missing']),
    ...(refsReady ? [] : ['required_ref_missing'])
  ];
  const resolvedSupportStatementStatus = supportStatementStatus || (
    consumptionClass === 'support_only_not_claim_safe' && claimSafety === 'support_only_not_claim_safe'
      ? 'local_descriptive_support_only'
      : 'blocked'
  );

  return {
    artifact: artifactName,
    output_role: outputRole,
    present: Boolean(artifact),
    consumption_class: consumptionClass,
    export_policy: exportPolicy,
    claim_safety: claimSafety,
    claim_gate_status: claimSafety,
    support_statement_status: resolvedSupportStatementStatus,
    promotion_requirement: 'external_validation_required',
    machine_readable_allowed: Boolean(machineReadableAllowed),
    human_facing_allowed: Boolean(humanFacingRequested) && boundaryReady && refsReady,
    claim_facing_allowed: false,
    required_boundaries: requiredBoundaries,
    required_refs: requiredRefs,
    allowed_consumption: CONSUMPTION_CLASSES[consumptionClass]?.allows || [],
    blocked_consumption: unique([
      ...(CONSUMPTION_CLASSES[consumptionClass]?.prohibits || []),
      ...computedBlocks
    ]),
    boundaries_present: boundariesPresent,
    refs_present: refsPresent,
    boundary_ready: boundaryReady,
    refs_ready: refsReady,
    blocking_conditions: unique(computedBlocks),
    interpretation_allowed: interpretationAllowed,
    interpretation_not_allowed: interpretationNotAllowed,
    explicit_non_claim_restrictions: interpretationNotAllowed,
    notes
  };
};

export const buildRunOutputConsumptionPolicyArtifact = ({ artifactDir }) => {
  const verdict = readJson(path.join(artifactDir, 'run_verdict.json'));
  const entropyDiagnostics = readOptionalJson(path.join(artifactDir, 'entropy_run_diagnostics.json'));
  const entropyPreVerdict = readOptionalJson(path.join(artifactDir, 'entropy_preverdict.json'));
  const runMetrics = readOptionalJson(path.join(artifactDir, 'run_metrics.json'));
  const supportLabels = readOptionalJson(path.join(artifactDir, 'support_labels.json'));
  const runSupportStatementStatus = supportLabels?.support_label === 'internal_support_only'
    ? 'local_descriptive_support_only'
    : 'blocked';

  const outputs = {
    'run_verdict.json': buildEntry({
      artifactName: 'run_verdict.json',
      artifact: verdict,
      outputRole: 'run_verdict_output',
      consumptionClass: 'displayable_with_boundary',
      exportPolicy: 'human_facing_with_boundary_only',
      claimSafety: 'claim_unsafe',
      requiredBoundaries: ['interpretation_boundary'],
      blockingConditions: ['external_validation_absent', 'run_level_output_not_claim'],
      interpretationAllowed: 'Run-level admissibility review only.',
      interpretationNotAllowed: [
        'Do not read this as support label emission.',
        'Do not read this as claim closure.',
        'Do not read this as external validation.'
      ],
      notes: 'Verdict semantics remain separate from support labels and consumption policy.',
      humanFacingRequested: true
    }),
    ...(entropyDiagnostics
      ? {
        'entropy_run_diagnostics.json': buildEntry({
          artifactName: 'entropy_run_diagnostics.json',
          artifact: entropyDiagnostics,
          outputRole: 'diagnostic_output',
          consumptionClass: 'displayable_with_boundary',
          exportPolicy: 'human_facing_with_boundary_only',
          claimSafety: 'claim_unsafe',
          requiredBoundaries: ['interpretation_boundary'],
          requiredRefs: ['consumption_policy_ref'],
          blockingConditions: ['external_validation_absent', 'diagnostic_output_not_claim'],
          interpretationAllowed: 'Run-level entropy diagnostics review only.',
          interpretationNotAllowed: [
            'Do not read this as claim closure.',
            'Do not read this as theory confirmation.'
          ],
          notes: 'Diagnostic output may inform internal hygiene review only.',
          humanFacingRequested: true
        })
      }
      : {}),
    ...(entropyPreVerdict
      ? {
        'entropy_preverdict.json': buildEntry({
          artifactName: 'entropy_preverdict.json',
          artifact: entropyPreVerdict,
          outputRole: 'diagnostic_output',
          consumptionClass: 'internal_only',
          exportPolicy: 'internal_only',
          claimSafety: 'claim_unsafe',
          requiredBoundaries: ['interpretation_boundary'],
          requiredRefs: ['consumption_policy_ref'],
          blockingConditions: ['pre_verdict_artifact', 'external_validation_absent'],
          interpretationAllowed: 'Internal pre-verdict troubleshooting only.',
          interpretationNotAllowed: [
            'Do not read this as authoritative run status.',
            'Do not read this as a final result.'
          ],
          notes: 'Pre-verdict output stays internal-only to avoid confusion with authoritative run artifacts.',
          humanFacingRequested: false
        })
      }
      : {}),
    ...(runMetrics
      ? {
        'run_metrics.json': buildEntry({
          artifactName: 'run_metrics.json',
          artifact: runMetrics,
          outputRole: 'descriptive_output',
          consumptionClass: 'descriptive_machine_readable',
          exportPolicy: 'human_facing_with_boundary_only',
          claimSafety: 'claim_unsafe',
          requiredBoundaries: ['interpretation_boundary'],
          requiredRefs: ['support_boundary_ref', 'consumption_policy_ref'],
          blockingConditions: ['external_validation_absent', 'descriptive_output_not_causal'],
          interpretationAllowed: 'Descriptive internal measurement only.',
          interpretationNotAllowed: [
            'Do not read this as causal confirmation.',
            'Do not read this as claim validation.'
          ],
          notes: 'Metrics remain descriptive even when support labels exist.',
          humanFacingRequested: true
        })
      }
      : {}),
    ...(supportLabels
      ? {
        'support_labels.json': buildEntry({
          artifactName: 'support_labels.json',
          artifact: supportLabels,
          outputRole: 'support_labeled_output',
          consumptionClass: 'support_only_not_claim_safe',
          exportPolicy: supportLabels.support_label === 'internal_support_only'
            ? 'human_facing_with_boundary_only'
            : 'blocked_for_claim_facing_export',
          claimSafety: 'support_only_not_claim_safe',
          requiredBoundaries: ['non_claim_boundaries', 'interpretation_not_allowed'],
          requiredRefs: ['consumption_policy_ref'],
          blockingConditions: unique([
            'external_validation_absent',
            'support_label_not_truth_label',
            'support_label_does_not_upgrade_verdict',
            ...(supportLabels.support_label === 'under_evaluation'
              ? ['support_label_under_evaluation_blocks_claim_facing_export']
              : [])
          ]),
          interpretationAllowed: 'Repository-local support posture only.',
          interpretationNotAllowed: [
            'Do not read this as external validation.',
            'Do not read this as final classification.',
            'Do not read this as truth labeling.'
          ],
          notes: 'Support labels remain internal posture markers, never strong claims.',
          humanFacingRequested: true,
          supportStatementStatus: runSupportStatementStatus
        })
      }
      : {})
  };

  const artifact = {
    runId: String(verdict.runId || path.basename(artifactDir)),
    artifact_role: 'output_consumption_policy',
    scope: 'run_level',
    policy_version: 'phase6_v1',
    source_artifacts: {
      run_verdict: 'run_verdict.json',
      entropy_run_diagnostics: entropyDiagnostics ? 'entropy_run_diagnostics.json' : null,
      entropy_preverdict: entropyPreVerdict ? 'entropy_preverdict.json' : null,
      run_metrics: runMetrics ? 'run_metrics.json' : null,
      support_labels: supportLabels ? 'support_labels.json' : null
    },
    policy_classes: CONSUMPTION_CLASSES,
    export_policies: EXPORT_POLICIES,
    claim_safety_states: CLAIM_SAFETY,
    governed_outputs: Object.keys(outputs),
    support_statement_policy: {
      status: supportLabels?.support_label === 'internal_support_only'
        ? 'local_descriptive_support_only'
        : 'blocked',
      dependencies: ['run_verdict.json', 'support_labels.json', 'output_consumption_policy.json'],
      blocked_by: unique([
        'external_validation_absent',
        ...(supportLabels?.support_label === 'internal_support_only'
          ? []
          : ['support_label_under_evaluation_blocks_support_statement'])
      ]),
      interpretation_boundary: 'Any support statement remains repository-local, descriptive, not closed, and externally unvalidated.'
    },
    validation_context: {
      external_validation_present: false,
      support_label: supportLabels?.support_label || 'under_evaluation',
      closure_state: supportLabels?.closure_state || 'not_closed',
      validation_state: supportLabels?.validation_state || 'externally_unvalidated',
      run_verdict_status: String(verdict.status || 'UNKNOWN')
    },
    global_blocking_conditions: [
      'external_validation_absent',
      'strong_claim_promotion_blocked'
    ],
    outputs,
    interpretation_boundary: 'Consumption policy only; does not upgrade verdict, metrics, diagnostics, or support labels into external validation or strong claims.'
  };

  const outputPath = path.join(artifactDir, RUN_POLICY_FILE);
  fs.writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
  return { outputPath, artifact };
};

export const buildConditionOutputConsumptionPolicyArtifact = ({
  outputDir,
  conditionSummary = null,
  comparison = null,
  conditionSupportLabels = null
}) => {
  const resolvedSummary = conditionSummary || readJson(path.join(outputDir, 'condition_metrics_summary.json'));
  const resolvedComparison = comparison || readJson(path.join(outputDir, 'condition_comparison.json'));
  const resolvedSupport = conditionSupportLabels || readJson(path.join(outputDir, 'condition_support_labels.json'));
  const conditionSupportStatementStatus = Object.values(resolvedSupport?.conditions || {}).some((entry) => entry?.support_label === 'internal_support_only')
    ? 'local_descriptive_support_only'
    : 'blocked';

  const conditionAccess = {};
  for (const [condition, value] of Object.entries(resolvedSupport?.conditions || {})) {
    const supportLabel = String(value?.support_label || 'under_evaluation');
    conditionAccess[condition] = {
      support_label: supportLabel,
      consumption_class: supportLabel === 'internal_support_only'
        ? 'support_only_not_claim_safe'
        : 'blocked_for_external_claiming',
      export_policy: supportLabel === 'internal_support_only'
        ? 'human_facing_with_boundary_only'
        : 'blocked_for_claim_facing_export',
      claim_safety: supportLabel === 'internal_support_only'
        ? 'support_only_not_claim_safe'
        : 'claim_unsafe',
      promotion_requirement: 'external_validation_required',
      blocking_conditions: unique([
        'external_validation_absent',
        'strong_claim_promotion_blocked',
        ...(supportLabel === 'under_evaluation'
          ? ['support_label_under_evaluation_blocks_claim_facing_export']
          : ['support_only_not_claim_safe'])
      ]),
      run_count: Number(value?.run_count || 0),
      status_counts: isObj(value?.status_counts) ? value.status_counts : {},
      entropy_status_counts: isObj(value?.entropy_status_counts) ? value.entropy_status_counts : {}
    };
  }

  const outputs = {
    'condition_metrics_summary.json': buildEntry({
      artifactName: 'condition_metrics_summary.json',
      artifact: resolvedSummary,
      outputRole: 'descriptive_output',
      consumptionClass: 'descriptive_machine_readable',
      exportPolicy: 'human_facing_with_boundary_only',
      claimSafety: 'claim_unsafe',
      requiredBoundaries: ['interpretation_boundary'],
      requiredRefs: ['support_boundary_ref', 'consumption_policy_ref'],
      blockingConditions: ['external_validation_absent', 'small_batch_descriptive_only'],
      interpretationAllowed: 'Small-batch descriptive review only.',
      interpretationNotAllowed: [
        'Do not read this as causal confirmation.',
        'Do not read this as external validation.'
      ],
      notes: 'Condition summaries remain descriptive small-batch artifacts.',
      humanFacingRequested: true
    }),
    'condition_comparison.json': buildEntry({
      artifactName: 'condition_comparison.json',
      artifact: resolvedComparison,
      outputRole: 'descriptive_output',
      consumptionClass: 'blocked_for_external_claiming',
      exportPolicy: 'blocked_for_claim_facing_export',
      claimSafety: 'claim_unsafe',
      requiredBoundaries: ['interpretation_boundary'],
      requiredRefs: ['support_boundary_ref', 'consumption_policy_ref'],
      blockingConditions: ['external_validation_absent', 'causal_read_blocked', 'comparison_output_not_confirmatory'],
      interpretationAllowed: 'Internal descriptive delta review only.',
      interpretationNotAllowed: [
        'Do not read this as causal confirmation.',
        'Do not read this as theory validation.',
        'Do not read this as an externally valid comparison.'
      ],
      notes: 'Condition comparisons remain blocked for claim-facing export in this phase.',
      humanFacingRequested: false
    }),
    'condition_support_labels.json': buildEntry({
      artifactName: 'condition_support_labels.json',
      artifact: resolvedSupport,
      outputRole: 'support_labeled_output',
      consumptionClass: 'support_only_not_claim_safe',
      exportPolicy: 'human_facing_with_boundary_only',
      claimSafety: 'support_only_not_claim_safe',
      requiredBoundaries: ['non_claim_boundaries', 'interpretation_not_allowed'],
      requiredRefs: ['consumption_policy_ref'],
      blockingConditions: ['external_validation_absent', 'support_label_not_truth_label'],
      interpretationAllowed: 'Internal condition-level support posture only.',
      interpretationNotAllowed: [
        'Do not read this as final classification.',
        'Do not read this as external validation.',
        'Do not read this as claim closure.'
      ],
      notes: 'Condition support labels remain support-only and claim-unsafe.',
      humanFacingRequested: true,
      supportStatementStatus: conditionSupportStatementStatus
    })
  };

  const artifact = {
    artifact_role: 'condition_output_consumption_policy',
    scope: 'small_batch',
    policy_version: 'phase6_v1',
    source_artifacts: {
      condition_metrics_summary: 'condition_metrics_summary.json',
      condition_comparison: 'condition_comparison.json',
      condition_support_labels: 'condition_support_labels.json'
    },
    policy_classes: CONSUMPTION_CLASSES,
    export_policies: EXPORT_POLICIES,
    claim_safety_states: CLAIM_SAFETY,
    governed_outputs: Object.keys(outputs),
    support_statement_policy: {
      status: Object.values(conditionAccess).some((entry) => entry.support_label === 'internal_support_only')
        ? 'local_descriptive_support_only'
        : 'blocked',
      dependencies: [
        'condition_metrics_summary.json',
        'condition_support_labels.json',
        'condition_output_consumption_policy.json'
      ],
      blocked_by: unique([
        'external_validation_absent',
        ...(Object.values(conditionAccess).some((entry) => entry.support_label === 'internal_support_only')
          ? []
          : ['support_label_under_evaluation_blocks_support_statement'])
      ]),
      interpretation_boundary: 'Any condition-level support statement remains descriptive, repository-local, not causal, not closed, and externally unvalidated.'
    },
    validation_context: {
      external_validation_present: false,
      baseline_present: Boolean(resolvedSupport?.baseline_present),
      closure_state: 'not_closed',
      validation_state: 'externally_unvalidated'
    },
    global_blocking_conditions: [
      'external_validation_absent',
      'strong_claim_promotion_blocked'
    ],
    outputs,
    condition_level_access: conditionAccess,
    interpretation_boundary: 'Condition-level consumption policy only; does not upgrade descriptive summaries, comparisons, or support labels into claims.'
  };

  const outputPath = path.join(outputDir, CONDITION_POLICY_FILE);
  fs.writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
  return { outputPath, artifact };
};

export default {
  buildRunOutputConsumptionPolicyArtifact,
  buildConditionOutputConsumptionPolicyArtifact
};

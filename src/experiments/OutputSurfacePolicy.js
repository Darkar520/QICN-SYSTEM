import fs from 'fs';
import path from 'path';

const RUN_SURFACE_POLICY_FILE = 'output_surface_policy.json';
const CONDITION_SURFACE_POLICY_FILE = 'condition_output_surface_policy.json';

const isObj = (value) => value && typeof value === 'object' && !Array.isArray(value);
const hasText = (value) => typeof value === 'string' && value.trim().length > 0;
const hasArray = (value) => Array.isArray(value) && value.length > 0;
const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const getByPath = (value, pathExpression) => String(pathExpression || '')
  .split('.')
  .filter(Boolean)
  .reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), value);
const unique = (values) => [...new Set((Array.isArray(values) ? values : []).filter(Boolean))];

export const SURFACE_CLASSES = {
  internal_runtime_surface: {
    definition: 'Internal runtime or pre-verdict machine surface only.',
    requires_boundary: false,
    blocked_by_external_validation_absence: false
  },
  local_artifact_surface: {
    definition: 'Raw local artifact persistence inside the repository or local workspace.',
    requires_boundary: false,
    blocked_by_external_validation_absence: false
  },
  developer_inspection_surface: {
    definition: 'Local human inspection surface for developers, allowed only with explicit boundaries.',
    requires_boundary: true,
    blocked_by_external_validation_absence: false
  },
  descriptive_export_surface: {
    definition: 'Local descriptive export surface; never claim-facing and always boundary-bound.',
    requires_boundary: true,
    blocked_by_external_validation_absence: false
  },
  small_batch_summary_surface: {
    definition: 'Internal small-batch aggregation surface for descriptive condition summaries.',
    requires_boundary: true,
    blocked_by_external_validation_absence: false
  },
  controlled_statement_surface: {
    definition: 'Restricted surface for controlled local descriptive statements only.',
    requires_boundary: true,
    blocked_by_external_validation_absence: true
  },
  external_claim_facing_surface: {
    definition: 'Any outward-facing claim, causal, or externally shareable surface.',
    requires_boundary: true,
    blocked_by_external_validation_absence: true
  }
};

export const EXPORT_GATE_STATES = {
  internal_only: 'Output remains internal-only and should not be exported beyond local machine reuse.',
  local_export_with_boundary_only: 'Output may be exported locally only with explicit non-claim boundaries.',
  blocked_missing_boundary: 'Export is blocked because required boundaries or refs are missing.',
  blocked_under_evaluation: 'Export is blocked because the support posture remains under evaluation.',
  blocked_for_external_claiming: 'Export is blocked for any claim-facing or externally promotable surface.'
};

export const STATEMENT_GATE_STATES = {
  no_statement_authorized: 'This output does not authorize controlled statements.',
  local_descriptive_statement_only: 'Only local descriptive controlled statements are allowed.',
  blocked_under_evaluation: 'Controlled statements are blocked while the support posture remains under evaluation.',
  blocked_missing_boundary: 'Controlled statements are blocked because required boundaries or refs are missing.'
};

const PROHIBITED_STATEMENT_CLASSES = [
  'framework_confirmation',
  'theory_validation',
  'causal_confirmation',
  'external_validation',
  'final_classification',
  'ontological_confirmation',
  'truth_labeling'
];

const ALL_SURFACES = Object.keys(SURFACE_CLASSES);
const EXTERNAL_FACING_SURFACES = ['external_claim_facing_surface'];
const HUMAN_FACING_SURFACES = [
  'developer_inspection_surface',
  'descriptive_export_surface',
  'controlled_statement_surface'
];

const boundaryPresent = (artifact, boundaryKey) => {
  const value = getByPath(artifact, boundaryKey);
  return hasText(value) || hasArray(value);
};

const refPresent = (artifact, refKey) => hasText(getByPath(artifact, refKey));

const computeReadiness = ({ artifact, requiredBoundaries = [], requiredRefs = [] }) => {
  const boundariesPresent = Object.fromEntries(requiredBoundaries.map((key) => [key, boundaryPresent(artifact, key)]));
  const refsPresent = Object.fromEntries(requiredRefs.map((key) => [key, refPresent(artifact, key)]));
  return {
    boundariesPresent,
    refsPresent,
    boundaryReady: Object.values(boundariesPresent).every(Boolean),
    refsReady: Object.values(refsPresent).every(Boolean)
  };
};

const removeHumanFacingSurfaces = (surfaces) => surfaces.filter((surface) => !HUMAN_FACING_SURFACES.includes(surface));

const buildSurfaceEntry = ({
  artifactName,
  artifact,
  consumptionEntry,
  baseAllowedSurfaces,
  requiredBoundaries = [],
  requiredRefs = [],
  exportGateStatus,
  statementGateStatus,
  interpretationAllowed,
  interpretationNotAllowed = [],
  notes = null
}) => {
  const {
    boundariesPresent,
    refsPresent,
    boundaryReady,
    refsReady
  } = computeReadiness({ artifact, requiredBoundaries, requiredRefs });

  let allowedSurfaces = unique(baseAllowedSurfaces);
  if (!boundaryReady || !refsReady) {
    allowedSurfaces = removeHumanFacingSurfaces(allowedSurfaces);
  }
  if (statementGateStatus !== 'local_descriptive_statement_only') {
    allowedSurfaces = allowedSurfaces.filter((surface) => surface !== 'controlled_statement_surface');
  }
  if (exportGateStatus === 'blocked_for_external_claiming') {
    allowedSurfaces = allowedSurfaces.filter((surface) => surface !== 'descriptive_export_surface');
  }

  const blockedSurfaces = ALL_SURFACES.filter((surface) => !allowedSurfaces.includes(surface));
  const blockingConditions = unique([
    ...(Array.isArray(consumptionEntry?.blocking_conditions) ? consumptionEntry.blocking_conditions : []),
    ...(boundaryReady ? [] : ['required_boundary_missing']),
    ...(refsReady ? [] : ['required_ref_missing']),
    ...(exportGateStatus === 'blocked_for_external_claiming' ? ['external_claim_surface_blocked'] : []),
    ...(exportGateStatus === 'blocked_under_evaluation' ? ['support_label_under_evaluation_blocks_export'] : []),
    ...(exportGateStatus === 'blocked_missing_boundary' ? ['export_blocked_missing_boundary'] : []),
    ...(statementGateStatus === 'blocked_under_evaluation' ? ['support_label_under_evaluation_blocks_statement_surface'] : []),
    ...(statementGateStatus === 'blocked_missing_boundary' ? ['statement_blocked_missing_boundary'] : []),
    'external_validation_absent'
  ]);

  return {
    artifact: artifactName,
    output_role: consumptionEntry?.output_role || null,
    consumption_class: consumptionEntry?.consumption_class || null,
    claim_gate_status: consumptionEntry?.claim_gate_status || consumptionEntry?.claim_safety || 'claim_unsafe',
    export_gate_status: exportGateStatus,
    statement_gate_status: statementGateStatus,
    allowed_surfaces: allowedSurfaces,
    blocked_surfaces: blockedSurfaces,
    required_boundaries: requiredBoundaries,
    required_refs: requiredRefs,
    boundaries_present: boundariesPresent,
    refs_present: refsPresent,
    boundary_ready: boundaryReady,
    refs_ready: refsReady,
    human_facing_allowed: allowedSurfaces.some((surface) => HUMAN_FACING_SURFACES.includes(surface)),
    claim_facing_allowed: false,
    blocked_by: blockingConditions,
    interpretation_allowed: interpretationAllowed,
    interpretation_not_allowed: interpretationNotAllowed,
    prohibited_statement_classes: PROHIBITED_STATEMENT_CLASSES,
    notes
  };
};

const resolveRunExportGate = ({ artifactName, entry, boundaryReady, refsReady }) => {
  if (entry?.consumption_class === 'internal_only') return 'internal_only';
  if (!boundaryReady || !refsReady) return 'blocked_missing_boundary';
  if (artifactName === 'support_labels.json' && entry?.support_statement_status === 'blocked') return 'blocked_under_evaluation';
  if (entry?.consumption_class === 'blocked_for_external_claiming') return 'blocked_for_external_claiming';
  return 'local_export_with_boundary_only';
};

const resolveRunStatementGate = ({ artifactName, entry, boundaryReady, refsReady }) => {
  if (!artifactName.endsWith('support_labels.json')) return 'no_statement_authorized';
  if (!boundaryReady || !refsReady) return 'blocked_missing_boundary';
  return entry?.support_statement_status === 'local_descriptive_support_only'
    ? 'local_descriptive_statement_only'
    : 'blocked_under_evaluation';
};

const resolveRunAllowedSurfaces = ({ artifactName, statementGateStatus }) => {
  switch (artifactName) {
    case 'run_verdict.json':
      return ['local_artifact_surface', 'developer_inspection_surface'];
    case 'entropy_run_diagnostics.json':
      return ['local_artifact_surface', 'developer_inspection_surface'];
    case 'entropy_preverdict.json':
      return ['internal_runtime_surface', 'local_artifact_surface'];
    case 'run_metrics.json':
      return ['local_artifact_surface', 'developer_inspection_surface', 'descriptive_export_surface'];
    case 'support_labels.json':
      return unique([
        'local_artifact_surface',
        'developer_inspection_surface',
        ...(statementGateStatus === 'local_descriptive_statement_only' ? ['controlled_statement_surface'] : [])
      ]);
    default:
      return ['local_artifact_surface'];
  }
};

export const buildRunOutputSurfacePolicyArtifact = ({ artifactDir }) => {
  const verdict = readJson(path.join(artifactDir, 'run_verdict.json'));
  const entropyDiagnostics = fs.existsSync(path.join(artifactDir, 'entropy_run_diagnostics.json'))
    ? readJson(path.join(artifactDir, 'entropy_run_diagnostics.json'))
    : null;
  const entropyPreVerdict = fs.existsSync(path.join(artifactDir, 'entropy_preverdict.json'))
    ? readJson(path.join(artifactDir, 'entropy_preverdict.json'))
    : null;
  const runMetrics = fs.existsSync(path.join(artifactDir, 'run_metrics.json'))
    ? readJson(path.join(artifactDir, 'run_metrics.json'))
    : null;
  const supportLabels = fs.existsSync(path.join(artifactDir, 'support_labels.json'))
    ? readJson(path.join(artifactDir, 'support_labels.json'))
    : null;
  const consumptionPolicy = readJson(path.join(artifactDir, 'output_consumption_policy.json'));

  const outputs = {};
  const register = (artifactName, artifact, interpretationAllowed, interpretationNotAllowed, notes, requiredBoundaries = [], requiredRefs = []) => {
    const entry = consumptionPolicy?.outputs?.[artifactName] || {};
    const { boundaryReady, refsReady } = computeReadiness({ artifact, requiredBoundaries, requiredRefs });
    const statementGateStatus = resolveRunStatementGate({ artifactName, entry, boundaryReady, refsReady });
    const exportGateStatus = resolveRunExportGate({ artifactName, entry, boundaryReady, refsReady });
    outputs[artifactName] = buildSurfaceEntry({
      artifactName,
      artifact,
      consumptionEntry: entry,
      baseAllowedSurfaces: resolveRunAllowedSurfaces({ artifactName, statementGateStatus }),
      requiredBoundaries,
      requiredRefs,
      exportGateStatus,
      statementGateStatus,
      interpretationAllowed,
      interpretationNotAllowed,
      notes
    });
  };

  register(
    'run_verdict.json',
    verdict,
    'Run-level admissibility inspection only.',
    [
      'Do not read this as claim support.',
      'Do not read this as external validation.'
    ],
    'Verdict stays inspectable but never claim-facing.',
    ['interpretation_boundary'],
    []
  );

  if (entropyDiagnostics) {
    register(
      'entropy_run_diagnostics.json',
      entropyDiagnostics,
      'Run-level entropy diagnostics inspection only.',
      [
        'Do not read this as theory confirmation.',
        'Do not read this as claim closure.'
      ],
      'Diagnostics remain diagnostic-only.',
      ['interpretation_boundary'],
      ['consumption_policy_ref', 'surface_policy_ref']
    );
  }

  if (entropyPreVerdict) {
    register(
      'entropy_preverdict.json',
      entropyPreVerdict,
      'Internal-only pre-verdict troubleshooting.',
      [
        'Do not surface this as final output.',
        'Do not read this as authoritative run status.'
      ],
      'Pre-verdict artifact stays internal-only.',
      ['interpretation_boundary'],
      ['consumption_policy_ref', 'surface_policy_ref']
    );
  }

  if (runMetrics) {
    register(
      'run_metrics.json',
      runMetrics,
      'Descriptive local metrics review only.',
      [
        'Do not read this as causal confirmation.',
        'Do not read this as external validation.'
      ],
      'Metrics can be exported locally only with explicit boundary.',
      ['interpretation_boundary'],
      ['support_boundary_ref', 'consumption_policy_ref', 'surface_policy_ref']
    );
  }

  if (supportLabels) {
    register(
      'support_labels.json',
      supportLabels,
      'Repository-local support posture review only.',
      [
        'Do not read this as framework confirmation.',
        'Do not read this as external validation.'
      ],
      'Support labels may feed only controlled local descriptive statements.',
      ['non_claim_boundaries', 'interpretation_not_allowed'],
      ['consumption_policy_ref', 'surface_policy_ref', 'controlled_statements_ref']
    );
  }

  const artifact = {
    runId: String(verdict.runId || path.basename(artifactDir)),
    artifact_role: 'output_surface_policy',
    scope: 'run_level',
    policy_version: 'phase7_v1',
    source_artifacts: {
      run_verdict: 'run_verdict.json',
      entropy_run_diagnostics: entropyDiagnostics ? 'entropy_run_diagnostics.json' : null,
      entropy_preverdict: entropyPreVerdict ? 'entropy_preverdict.json' : null,
      run_metrics: runMetrics ? 'run_metrics.json' : null,
      support_labels: supportLabels ? 'support_labels.json' : null,
      output_consumption_policy: 'output_consumption_policy.json',
      controlled_statements: 'controlled_statements.json'
    },
    governed_outputs: Object.keys(outputs),
    governed_surfaces: SURFACE_CLASSES,
    export_gate_states: EXPORT_GATE_STATES,
    statement_gate_states: STATEMENT_GATE_STATES,
    validation_context: {
      external_validation_present: false,
      support_label: supportLabels?.support_label || 'under_evaluation',
      validation_state: supportLabels?.validation_state || 'externally_unvalidated'
    },
    global_blocking_conditions: [
      'external_validation_absent',
      'strong_claim_promotion_blocked',
      'external_claim_facing_surface_blocked'
    ],
    outputs,
    interpretation_boundary: 'Surface policy only; does not upgrade verdict, metrics, diagnostics, or support posture into external validation or strong claims.'
  };

  const outputPath = path.join(artifactDir, RUN_SURFACE_POLICY_FILE);
  fs.writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
  return { outputPath, artifact };
};

const resolveConditionOutputExportGate = ({ artifactName, entry, boundaryReady, refsReady }) => {
  if (artifactName === 'condition_comparison.json' || entry?.consumption_class === 'blocked_for_external_claiming') {
    return 'blocked_for_external_claiming';
  }
  if (!boundaryReady || !refsReady) return 'blocked_missing_boundary';
  if (artifactName === 'condition_support_labels.json' && entry?.support_statement_status === 'blocked') {
    return 'blocked_under_evaluation';
  }
  return 'local_export_with_boundary_only';
};

const resolveConditionOutputStatementGate = ({ artifactName, entry, boundaryReady, refsReady }) => {
  if (artifactName !== 'condition_support_labels.json') return 'no_statement_authorized';
  if (!boundaryReady || !refsReady) return 'blocked_missing_boundary';
  return entry?.support_statement_status === 'local_descriptive_support_only'
    ? 'local_descriptive_statement_only'
    : 'blocked_under_evaluation';
};

const resolveConditionOutputAllowedSurfaces = ({ artifactName, statementGateStatus }) => {
  switch (artifactName) {
    case 'condition_metrics_summary.json':
      return ['local_artifact_surface', 'developer_inspection_surface', 'descriptive_export_surface', 'small_batch_summary_surface'];
    case 'condition_comparison.json':
      return ['local_artifact_surface', 'small_batch_summary_surface'];
    case 'condition_support_labels.json':
      return unique([
        'local_artifact_surface',
        'developer_inspection_surface',
        'small_batch_summary_surface',
        ...(statementGateStatus === 'local_descriptive_statement_only' ? ['controlled_statement_surface'] : [])
      ]);
    default:
      return ['local_artifact_surface', 'small_batch_summary_surface'];
  }
};

const buildConditionLevelAccessEntry = ({
  condition,
  conditionEntry,
  conditionPolicyEntry
}) => {
  const supportLabel = String(conditionEntry?.support_label || 'under_evaluation');
  const statementGateStatus = supportLabel === 'internal_support_only'
    ? 'local_descriptive_statement_only'
    : 'blocked_under_evaluation';
  const exportGateStatus = supportLabel === 'internal_support_only'
    ? 'local_export_with_boundary_only'
    : 'blocked_under_evaluation';

  const allowedSurfaces = unique([
    'local_artifact_surface',
    'small_batch_summary_surface',
    'developer_inspection_surface',
    ...(statementGateStatus === 'local_descriptive_statement_only' ? ['controlled_statement_surface'] : [])
  ]);

  return {
    condition,
    support_label: supportLabel,
    claim_gate_status: conditionPolicyEntry?.claim_safety || 'claim_unsafe',
    export_gate_status: exportGateStatus,
    statement_gate_status: statementGateStatus,
    allowed_surfaces: allowedSurfaces,
    blocked_surfaces: ALL_SURFACES.filter((surface) => !allowedSurfaces.includes(surface)),
    blocked_by: unique([
      ...(Array.isArray(conditionPolicyEntry?.blocking_conditions) ? conditionPolicyEntry.blocking_conditions : []),
      ...(supportLabel === 'internal_support_only' ? [] : ['support_label_under_evaluation_blocks_statement_surface']),
      'external_validation_absent'
    ])
  };
};

export const buildConditionOutputSurfacePolicyArtifact = ({
  outputDir,
  conditionSummary = null,
  comparison = null,
  conditionSupportLabels = null,
  conditionConsumptionPolicy = null
}) => {
  const resolvedSummary = conditionSummary || readJson(path.join(outputDir, 'condition_metrics_summary.json'));
  const resolvedComparison = comparison || readJson(path.join(outputDir, 'condition_comparison.json'));
  const resolvedSupport = conditionSupportLabels || readJson(path.join(outputDir, 'condition_support_labels.json'));
  const resolvedConsumption = conditionConsumptionPolicy || readJson(path.join(outputDir, 'condition_output_consumption_policy.json'));

  const outputs = {};
  const register = (artifactName, artifact, interpretationAllowed, interpretationNotAllowed, notes, requiredBoundaries = [], requiredRefs = []) => {
    const entry = resolvedConsumption?.outputs?.[artifactName] || {};
    const { boundaryReady, refsReady } = computeReadiness({ artifact, requiredBoundaries, requiredRefs });
    const statementGateStatus = resolveConditionOutputStatementGate({ artifactName, entry, boundaryReady, refsReady });
    const exportGateStatus = resolveConditionOutputExportGate({ artifactName, entry, boundaryReady, refsReady });
    outputs[artifactName] = buildSurfaceEntry({
      artifactName,
      artifact,
      consumptionEntry: entry,
      baseAllowedSurfaces: resolveConditionOutputAllowedSurfaces({ artifactName, statementGateStatus }),
      requiredBoundaries,
      requiredRefs,
      exportGateStatus,
      statementGateStatus,
      interpretationAllowed,
      interpretationNotAllowed,
      notes
    });
  };

  register(
    'condition_metrics_summary.json',
    resolvedSummary,
    'Small-batch descriptive summary review only.',
    [
      'Do not read this as external validation.',
      'Do not read this as claim closure.'
    ],
    'Condition summary may appear only on descriptive local surfaces.',
    ['interpretation_boundary'],
    ['support_boundary_ref', 'consumption_policy_ref', 'surface_policy_ref']
  );
  register(
    'condition_comparison.json',
    resolvedComparison,
    'Internal descriptive delta review only.',
    [
      'Do not read this as causal confirmation.',
      'Do not read this as external validation.'
    ],
    'Condition comparison stays blocked for descriptive export and controlled statements.',
    ['interpretation_boundary'],
    ['support_boundary_ref', 'consumption_policy_ref', 'surface_policy_ref']
  );
  register(
    'condition_support_labels.json',
    resolvedSupport,
    'Condition-level support posture review only.',
    [
      'Do not read this as framework confirmation.',
      'Do not read this as external validation.'
    ],
    'Condition support labels may feed only local descriptive controlled statements.',
    ['non_claim_boundaries', 'interpretation_not_allowed'],
    ['consumption_policy_ref', 'surface_policy_ref', 'controlled_statements_ref']
  );

  const conditionLevelAccess = {};
  for (const [condition, conditionEntry] of Object.entries(resolvedSupport?.conditions || {})) {
    conditionLevelAccess[condition] = buildConditionLevelAccessEntry({
      condition,
      conditionEntry,
      conditionPolicyEntry: resolvedConsumption?.condition_level_access?.[condition]
    });
  }

  const artifact = {
    artifact_role: 'condition_output_surface_policy',
    scope: 'small_batch',
    policy_version: 'phase7_v1',
    source_artifacts: {
      condition_metrics_summary: 'condition_metrics_summary.json',
      condition_comparison: 'condition_comparison.json',
      condition_support_labels: 'condition_support_labels.json',
      condition_output_consumption_policy: 'condition_output_consumption_policy.json',
      condition_controlled_statements: 'condition_controlled_statements.json'
    },
    governed_outputs: Object.keys(outputs),
    governed_surfaces: SURFACE_CLASSES,
    export_gate_states: EXPORT_GATE_STATES,
    statement_gate_states: STATEMENT_GATE_STATES,
    validation_context: {
      external_validation_present: false,
      closure_state: 'not_closed',
      validation_state: 'externally_unvalidated',
      baseline_present: Boolean(resolvedSupport?.baseline_present)
    },
    global_blocking_conditions: [
      'external_validation_absent',
      'strong_claim_promotion_blocked',
      'external_claim_facing_surface_blocked'
    ],
    outputs,
    condition_level_access: conditionLevelAccess,
    interpretation_boundary: 'Condition-level surface policy only; does not promote summaries, comparisons, or support labels into causal or externally valid statements.'
  };

  const outputPath = path.join(outputDir, CONDITION_SURFACE_POLICY_FILE);
  fs.writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
  return { outputPath, artifact };
};

export default {
  buildRunOutputSurfacePolicyArtifact,
  buildConditionOutputSurfacePolicyArtifact
};

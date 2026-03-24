import fs from 'fs';
import path from 'path';

const RUN_CONTROLLED_STATEMENTS_FILE = 'controlled_statements.json';
const CONDITION_CONTROLLED_STATEMENTS_FILE = 'condition_controlled_statements.json';

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const unique = (values) => [...new Set((Array.isArray(values) ? values : []).filter(Boolean))];

const PROHIBITED_STATEMENT_CLASSES = [
  'framework_confirmation',
  'theory_validation',
  'causal_confirmation',
  'external_validation',
  'final_classification',
  'ontological_confirmation',
  'truth_labeling'
];

const PROHIBITED_TEMPLATES = [
  'This validates the framework.',
  'This confirms the theory.',
  'This establishes causal support.',
  'This proves the system class.',
  'This is externally validated.'
];

const RUN_ALLOWED_TEMPLATE = 'Repository-local descriptive support posture only.';
const CONDITION_ALLOWED_TEMPLATE = 'Descriptive internal comparison posture only; not claim closure.';

export const buildRunControlledStatementsArtifact = ({ artifactDir }) => {
  const verdict = readJson(path.join(artifactDir, 'run_verdict.json'));
  const supportLabels = readJson(path.join(artifactDir, 'support_labels.json'));
  const consumptionPolicy = readJson(path.join(artifactDir, 'output_consumption_policy.json'));
  const surfacePolicy = readJson(path.join(artifactDir, 'output_surface_policy.json'));

  const supportEntry = surfacePolicy?.outputs?.['support_labels.json'] || {};
  const allowLocalSupport = supportLabels.support_label === 'internal_support_only'
    && supportEntry.statement_gate_status === 'local_descriptive_statement_only'
    && supportEntry.allowed_surfaces?.includes('controlled_statement_surface');

  const emittedStatements = allowLocalSupport
    ? [
      {
        statement_class: 'local_descriptive_support_only',
        text: RUN_ALLOWED_TEMPLATE,
        allowed_surfaces: ['controlled_statement_surface'],
        blocked_surfaces: ['external_claim_facing_surface'],
        source_artifacts: ['support_labels.json', 'output_consumption_policy.json', 'output_surface_policy.json', 'run_verdict.json'],
        interpretation_boundary: 'Local descriptive support statement only; not external validation, not claim closure, not framework confirmation.'
      }
    ]
    : [];

  const blockedStatements = [
    ...PROHIBITED_STATEMENT_CLASSES.map((statementClass, index) => ({
      statement_class: statementClass,
      template: PROHIBITED_TEMPLATES[index] || null,
      blocked_by: ['prohibited_statement_class', 'external_validation_absent']
    })),
    ...(!allowLocalSupport
      ? [{
        statement_class: 'local_descriptive_support_only',
        template: RUN_ALLOWED_TEMPLATE,
        blocked_by: unique([
          ...(Array.isArray(supportEntry.blocked_by) ? supportEntry.blocked_by : []),
          'support_statement_not_authorized'
        ])
      }]
      : [])
  ];

  const artifact = {
    runId: String(verdict.runId || path.basename(artifactDir)),
    artifact_role: 'controlled_statements',
    scope: 'run_level',
    source_artifacts: {
      run_verdict: 'run_verdict.json',
      support_labels: 'support_labels.json',
      output_consumption_policy: 'output_consumption_policy.json',
      output_surface_policy: 'output_surface_policy.json'
    },
    validation_context: {
      external_validation_present: false,
      support_label: supportLabels.support_label,
      support_statement_status: consumptionPolicy?.support_statement_policy?.status || 'blocked'
    },
    statement_gate_status: allowLocalSupport ? 'local_descriptive_statement_only' : 'blocked',
    allowed_surfaces: allowLocalSupport ? ['controlled_statement_surface'] : [],
    blocked_surfaces: ['external_claim_facing_surface'],
    permitted_statement_classes: allowLocalSupport ? ['local_descriptive_support_only'] : [],
    prohibited_statement_classes: PROHIBITED_STATEMENT_CLASSES,
    prohibited_statement_templates: PROHIBITED_TEMPLATES,
    emitted_statements: emittedStatements,
    blocked_statements: blockedStatements,
    interpretation_boundary: 'Controlled statements only; repository-local descriptive wording, not claim closure, not theory confirmation, not external validation.',
    non_claim_restrictions: [
      'Do not promote to external claim-facing surfaces.',
      'Do not read as framework confirmation.',
      'Do not read as causal confirmation.'
    ]
  };

  const outputPath = path.join(artifactDir, RUN_CONTROLLED_STATEMENTS_FILE);
  fs.writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
  return { outputPath, artifact };
};

export const buildConditionControlledStatementsArtifact = ({
  outputDir,
  conditionSupportLabels = null,
  conditionConsumptionPolicy = null,
  conditionSurfacePolicy = null
}) => {
  const supportLabels = conditionSupportLabels || readJson(path.join(outputDir, 'condition_support_labels.json'));
  const consumptionPolicy = conditionConsumptionPolicy || readJson(path.join(outputDir, 'condition_output_consumption_policy.json'));
  const surfacePolicy = conditionSurfacePolicy || readJson(path.join(outputDir, 'condition_output_surface_policy.json'));

  const emittedStatements = [];
  const blockedStatements = [];

  for (const [condition, entry] of Object.entries(supportLabels?.conditions || {})) {
    const conditionAccess = surfacePolicy?.condition_level_access?.[condition] || {};
    const supportLabel = String(entry?.support_label || 'under_evaluation');
    const allowStatement = supportLabel === 'internal_support_only'
      && conditionAccess.statement_gate_status === 'local_descriptive_statement_only'
      && Array.isArray(conditionAccess.allowed_surfaces)
      && conditionAccess.allowed_surfaces.includes('controlled_statement_surface');

    if (allowStatement) {
      emittedStatements.push({
        condition,
        statement_class: 'local_descriptive_support_only',
        text: `${CONDITION_ALLOWED_TEMPLATE} Condition ${condition} remains repository-local and externally unvalidated.`,
        allowed_surfaces: ['controlled_statement_surface'],
        blocked_surfaces: ['external_claim_facing_surface'],
        source_artifacts: [
          'condition_support_labels.json',
          'condition_output_consumption_policy.json',
          'condition_output_surface_policy.json'
        ],
        interpretation_boundary: 'Condition-level local descriptive support statement only; not causal confirmation, not external validation.'
      });
    } else {
      blockedStatements.push({
        condition,
        statement_class: 'local_descriptive_support_only',
        template: `${CONDITION_ALLOWED_TEMPLATE} Condition ${condition} remains repository-local and externally unvalidated.`,
        blocked_by: unique([
          ...(Array.isArray(conditionAccess.blocked_by) ? conditionAccess.blocked_by : []),
          'support_statement_not_authorized'
        ])
      });
    }
  }

  const artifact = {
    artifact_role: 'condition_controlled_statements',
    scope: 'small_batch',
    source_artifacts: {
      condition_support_labels: 'condition_support_labels.json',
      condition_output_consumption_policy: 'condition_output_consumption_policy.json',
      condition_output_surface_policy: 'condition_output_surface_policy.json'
    },
    validation_context: {
      external_validation_present: false,
      support_statement_status: consumptionPolicy?.support_statement_policy?.status || 'blocked'
    },
    statement_gate_status: emittedStatements.length > 0 ? 'local_descriptive_statement_only' : 'blocked',
    allowed_surfaces: emittedStatements.length > 0 ? ['controlled_statement_surface'] : [],
    blocked_surfaces: ['external_claim_facing_surface'],
    permitted_statement_classes: emittedStatements.length > 0 ? ['local_descriptive_support_only'] : [],
    prohibited_statement_classes: PROHIBITED_STATEMENT_CLASSES,
    prohibited_statement_templates: PROHIBITED_TEMPLATES,
    emitted_statements: emittedStatements,
    blocked_statements: blockedStatements,
    interpretation_boundary: 'Condition-level controlled statements only; descriptive internal posture, never claim closure, never causal confirmation, never external validation.',
    non_claim_restrictions: [
      'Do not promote to external claim-facing surfaces.',
      'Do not read as causal confirmation.',
      'Do not read as framework confirmation.'
    ]
  };

  const outputPath = path.join(outputDir, CONDITION_CONTROLLED_STATEMENTS_FILE);
  fs.writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
  return { outputPath, artifact };
};

export default {
  buildRunControlledStatementsArtifact,
  buildConditionControlledStatementsArtifact
};

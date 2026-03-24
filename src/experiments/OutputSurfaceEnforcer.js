import fs from 'fs';
import path from 'path';

const RUN_SURFACE_POLICY_FILE = 'output_surface_policy.json';
const CONDITION_SURFACE_POLICY_FILE = 'condition_output_surface_policy.json';
const RUN_CONTROLLED_STATEMENTS_FILE = 'controlled_statements.json';
const CONDITION_CONTROLLED_STATEMENTS_FILE = 'condition_controlled_statements.json';

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const unique = (values) => [...new Set((Array.isArray(values) ? values : []).filter(Boolean))];
const sanitizeFileStem = (value) => String(value || 'artifact').replace(/[^a-zA-Z0-9._-]+/g, '_');
const toPortablePath = (rootDir, targetPath) => path.relative(rootDir, targetPath).replace(/\\/g, '/') || '.';
const hasText = (value) => typeof value === 'string' && value.trim().length > 0;
const hasArray = (value) => Array.isArray(value) && value.length > 0;
const getByPath = (value, pathExpression) => String(pathExpression || '')
  .split('.')
  .filter(Boolean)
  .reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), value);

const SURFACE_ALIASES = {
  internal_debug_surface: 'developer_inspection_surface',
  local_artifact_read_surface: 'local_artifact_surface',
  claim_facing_blocked_surface: 'external_claim_facing_surface'
};

const PROHIBITED_STATEMENT_CLASSES = new Set([
  'framework_confirmation',
  'theory_validation',
  'causal_confirmation',
  'external_validation',
  'final_classification',
  'ontological_confirmation',
  'truth_labeling'
]);

const PROHIBITED_STATEMENT_TEMPLATES = new Set([
  'This validates the framework.',
  'This confirms the theory.',
  'This establishes causal support.',
  'This proves the system class.',
  'This is externally validated.'
]);

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

const resolveScope = ({ rootDir, scope = 'auto' }) => {
  const normalized = String(scope || 'auto').toLowerCase();
  if (normalized === 'run' || normalized === 'run_level') {
    return {
      scope: 'run_level',
      surfacePolicyFile: RUN_SURFACE_POLICY_FILE,
      controlledStatementsFile: RUN_CONTROLLED_STATEMENTS_FILE
    };
  }
  if (normalized === 'condition' || normalized === 'small_batch') {
    return {
      scope: 'small_batch',
      surfacePolicyFile: CONDITION_SURFACE_POLICY_FILE,
      controlledStatementsFile: CONDITION_CONTROLLED_STATEMENTS_FILE
    };
  }

  const hasRunPolicy = fs.existsSync(path.join(rootDir, RUN_SURFACE_POLICY_FILE));
  const hasConditionPolicy = fs.existsSync(path.join(rootDir, CONDITION_SURFACE_POLICY_FILE));
  if (hasRunPolicy && !hasConditionPolicy) {
    return {
      scope: 'run_level',
      surfacePolicyFile: RUN_SURFACE_POLICY_FILE,
      controlledStatementsFile: RUN_CONTROLLED_STATEMENTS_FILE
    };
  }
  if (hasConditionPolicy && !hasRunPolicy) {
    return {
      scope: 'small_batch',
      surfacePolicyFile: CONDITION_SURFACE_POLICY_FILE,
      controlledStatementsFile: CONDITION_CONTROLLED_STATEMENTS_FILE
    };
  }
  if (hasRunPolicy && fs.existsSync(path.join(rootDir, 'run_verdict.json'))) {
    return {
      scope: 'run_level',
      surfacePolicyFile: RUN_SURFACE_POLICY_FILE,
      controlledStatementsFile: RUN_CONTROLLED_STATEMENTS_FILE
    };
  }
  if (hasConditionPolicy) {
    return {
      scope: 'small_batch',
      surfacePolicyFile: CONDITION_SURFACE_POLICY_FILE,
      controlledStatementsFile: CONDITION_CONTROLLED_STATEMENTS_FILE
    };
  }

  throw new Error(`No surface policy artifact found under ${rootDir}`);
};

const resolveSurface = (surface) => {
  const requestedSurface = String(surface || '').trim();
  const canonicalSurface = SURFACE_ALIASES[requestedSurface] || requestedSurface;
  return { requestedSurface, canonicalSurface };
};

const loadEnforcementContext = ({ rootDir, scope = 'auto' }) => {
  const resolved = resolveScope({ rootDir, scope });
  const surfacePolicyPath = path.join(rootDir, resolved.surfacePolicyFile);
  const controlledStatementsPath = path.join(rootDir, resolved.controlledStatementsFile);
  return {
    rootDir,
    scope: resolved.scope,
    surfacePolicyPath,
    controlledStatementsPath,
    surfacePolicy: readJson(surfacePolicyPath),
    controlledStatements: fs.existsSync(controlledStatementsPath) ? readJson(controlledStatementsPath) : null
  };
};

const selectBlockedCode = ({
  entry,
  canonicalSurface,
  requiresBoundary = false,
  refsReady = true,
  boundaryReady = true,
  exportGateStatus = null,
  statementGateStatus = null
}) => {
  if (!entry) return 'blocked_output_not_governed';
  if (canonicalSurface === 'external_claim_facing_surface') return 'blocked_claim_facing_output';
  if (requiresBoundary && !refsReady) return 'blocked_missing_policy_ref';
  if (requiresBoundary && !boundaryReady) return 'blocked_missing_boundary';
  if (canonicalSurface === 'controlled_statement_surface' && statementGateStatus === 'blocked_under_evaluation') {
    return 'blocked_under_evaluation_support';
  }
  if (canonicalSurface === 'controlled_statement_surface' && statementGateStatus !== 'local_descriptive_statement_only') {
    return 'blocked_statement_surface_not_allowed';
  }
  if ((canonicalSurface === 'descriptive_export_surface' || canonicalSurface === 'local_report_surface')
      && exportGateStatus === 'blocked_under_evaluation') {
    return 'blocked_under_evaluation_support';
  }
  if ((canonicalSurface === 'descriptive_export_surface' || canonicalSurface === 'local_report_surface')
      && exportGateStatus === 'blocked_for_external_claiming') {
    return 'blocked_claim_facing_output';
  }
  return 'blocked_surface_not_allowed';
};

const buildDecision = ({
  rootDir,
  artifactName,
  artifactPath,
  entry,
  scope,
  requestedSurface,
  canonicalSurface,
  allowed,
  reasonCode,
  requiredBoundaries = [],
  requiredRefs = [],
  boundariesPresent = {},
  refsPresent = {},
  boundaryReady = true,
  refsReady = true,
  exportGateStatus = null,
  statementGateStatus = null,
  extraBlocking = [],
  emittedTo = null
}) => ({
  artifact_role: 'output_surface_enforcement_decision',
  scope,
  artifact: artifactName,
  artifact_path: toPortablePath(rootDir, artifactPath),
  requested_surface: requestedSurface,
  canonical_surface: canonicalSurface,
  allowed,
  reason_code: reasonCode,
  output_role: entry?.output_role || null,
  consumption_class: entry?.consumption_class || null,
  claim_gate_status: entry?.claim_gate_status || null,
  export_gate_status: exportGateStatus ?? entry?.export_gate_status ?? null,
  statement_gate_status: statementGateStatus ?? entry?.statement_gate_status ?? null,
  allowed_surfaces: Array.isArray(entry?.allowed_surfaces) ? entry.allowed_surfaces : [],
  blocked_surfaces: Array.isArray(entry?.blocked_surfaces) ? entry.blocked_surfaces : [],
  required_boundaries: requiredBoundaries,
  required_refs: requiredRefs,
  boundaries_present: boundariesPresent,
  refs_present: refsPresent,
  boundary_ready: boundaryReady,
  refs_ready: refsReady,
  blocking_conditions: unique([
    ...(Array.isArray(entry?.blocked_by) ? entry.blocked_by : []),
    ...extraBlocking,
    ...(reasonCode ? [reasonCode] : [])
  ]),
  interpretation_boundary: entry?.interpretation_allowed || null,
  interpretation_not_allowed: Array.isArray(entry?.interpretation_not_allowed)
    ? entry.interpretation_not_allowed
    : [],
  emitted_to: emittedTo ? toPortablePath(rootDir, emittedTo) : null
});

export const assessOutputForSurface = ({ rootDir, artifactName, surface, scope = 'auto' }) => {
  const context = loadEnforcementContext({ rootDir, scope });
  const { requestedSurface, canonicalSurface } = resolveSurface(surface);
  const artifactPath = path.join(rootDir, artifactName);
  const entry = context.surfacePolicy?.outputs?.[artifactName] || null;
  const surfaceDefinition = context.surfacePolicy?.governed_surfaces?.[canonicalSurface] || {};
  const requiresBoundary = surfaceDefinition.requires_boundary === true;

  if (!fs.existsSync(artifactPath)) {
    return {
      ok: false,
      context,
      decision: buildDecision({
        rootDir,
        artifactName,
        artifactPath,
        entry,
        scope: context.scope,
        requestedSurface,
        canonicalSurface,
        allowed: false,
        reasonCode: 'blocked_missing_artifact'
      })
    };
  }

  if (!entry) {
    return {
      ok: false,
      context,
      decision: buildDecision({
        rootDir,
        artifactName,
        artifactPath,
        entry,
        scope: context.scope,
        requestedSurface,
        canonicalSurface,
        allowed: false,
        reasonCode: 'blocked_output_not_governed'
      })
    };
  }

  const artifact = readJson(artifactPath);
  const requiredBoundaries = Array.isArray(entry.required_boundaries) ? entry.required_boundaries : [];
  const requiredRefs = Array.isArray(entry.required_refs) ? entry.required_refs : [];
  const {
    boundariesPresent,
    refsPresent,
    boundaryReady,
    refsReady
  } = computeReadiness({ artifact, requiredBoundaries, requiredRefs });
  const exportGateStatus = requiresBoundary && (!boundaryReady || !refsReady)
    ? 'blocked_missing_boundary'
    : (entry.export_gate_status || null);
  const statementGateStatus = requiresBoundary && (!boundaryReady || !refsReady)
    ? 'blocked_missing_boundary'
    : (entry.statement_gate_status || null);

  if (requiresBoundary && !refsReady) {
    return {
      ok: false,
      context,
      decision: buildDecision({
        rootDir,
        artifactName,
        artifactPath,
        entry,
        scope: context.scope,
        requestedSurface,
        canonicalSurface,
        allowed: false,
        reasonCode: 'blocked_missing_policy_ref',
        requiredBoundaries,
        requiredRefs,
        boundariesPresent,
        refsPresent,
        boundaryReady,
        refsReady,
        exportGateStatus,
        statementGateStatus
      })
    };
  }

  if (requiresBoundary && !boundaryReady) {
    return {
      ok: false,
      context,
      decision: buildDecision({
        rootDir,
        artifactName,
        artifactPath,
        entry,
        scope: context.scope,
        requestedSurface,
        canonicalSurface,
        allowed: false,
        reasonCode: 'blocked_missing_boundary',
        requiredBoundaries,
        requiredRefs,
        boundariesPresent,
        refsPresent,
        boundaryReady,
        refsReady,
        exportGateStatus,
        statementGateStatus
      })
    };
  }

  const allowed = Array.isArray(entry.allowed_surfaces) && entry.allowed_surfaces.includes(canonicalSurface);
  if (!allowed) {
    const reasonCode = selectBlockedCode({
      entry,
      canonicalSurface,
      requiresBoundary,
      refsReady,
      boundaryReady,
      exportGateStatus,
      statementGateStatus
    });
    return {
      ok: false,
      context,
      decision: buildDecision({
        rootDir,
        artifactName,
        artifactPath,
        entry,
        scope: context.scope,
        requestedSurface,
        canonicalSurface,
        allowed: false,
        reasonCode,
        requiredBoundaries,
        requiredRefs,
        boundariesPresent,
        refsPresent,
        boundaryReady,
        refsReady,
        exportGateStatus,
        statementGateStatus
      })
    };
  }

  return {
    ok: true,
    context,
    artifact,
    decision: buildDecision({
      rootDir,
      artifactName,
      artifactPath,
      entry,
      scope: context.scope,
      requestedSurface,
      canonicalSurface,
      allowed: true,
      reasonCode: 'allowed_surface_read',
      requiredBoundaries,
      requiredRefs,
      boundariesPresent,
      refsPresent,
      boundaryReady,
      refsReady,
      exportGateStatus,
      statementGateStatus
    })
  };
};

export const exportOutputForSurface = ({
  rootDir,
  artifactName,
  surface = 'descriptive_export_surface',
  outputDir,
  scope = 'auto'
}) => {
  const assessment = assessOutputForSurface({ rootDir, artifactName, surface, scope });
  const targetDir = path.resolve(outputDir || path.join(rootDir, 'exports'));
  fs.mkdirSync(targetDir, { recursive: true });
  const decisionPath = path.join(targetDir, `${sanitizeFileStem(artifactName)}.export_decision.json`);
  const exportPath = path.join(targetDir, path.basename(artifactName));

  if (!assessment.ok) {
    fs.writeFileSync(decisionPath, `${JSON.stringify(assessment.decision, null, 2)}\n`, 'utf8');
    return {
      ok: false,
      outputPath: null,
      decisionPath,
      decision: assessment.decision
    };
  }

  fs.copyFileSync(path.join(rootDir, artifactName), exportPath);
  const decision = {
    ...assessment.decision,
    reason_code: 'allowed_export',
    emitted_to: exportPath
  };
  fs.writeFileSync(decisionPath, `${JSON.stringify(decision, null, 2)}\n`, 'utf8');
  return {
    ok: true,
    outputPath: exportPath,
    decisionPath,
    decision
  };
};

export const emitControlledStatementForSurface = ({
  rootDir,
  surface = 'controlled_statement_surface',
  scope = 'auto',
  outputDir = null,
  condition = null,
  statementClass = 'local_descriptive_support_only',
  requestedText = null
}) => {
  const context = loadEnforcementContext({ rootDir, scope });
  const { requestedSurface, canonicalSurface } = resolveSurface(surface);
  const statementArtifactName = context.scope === 'run_level' ? 'support_labels.json' : 'condition_support_labels.json';
  const assessment = assessOutputForSurface({
    rootDir,
    artifactName: statementArtifactName,
    surface,
    scope: context.scope
  });

  const targetDir = path.resolve(outputDir || rootDir);
  fs.mkdirSync(targetDir, { recursive: true });
  const decisionFileName = context.scope === 'run_level'
    ? 'controlled_statement_emission.json'
    : 'condition_controlled_statement_emission.json';
  const decisionPath = path.join(targetDir, decisionFileName);

  if (PROHIBITED_STATEMENT_CLASSES.has(statementClass)) {
    const decision = {
      artifact_role: 'controlled_statement_enforcement_decision',
      scope: context.scope,
      requested_surface: requestedSurface,
      canonical_surface: canonicalSurface,
      allowed: false,
      reason_code: 'blocked_statement_class',
      statement_class: statementClass,
      requested_text: requestedText || null,
      blocking_conditions: ['blocked_statement_class'],
      prohibited_statement_classes: [...PROHIBITED_STATEMENT_CLASSES]
    };
    fs.writeFileSync(decisionPath, `${JSON.stringify(decision, null, 2)}\n`, 'utf8');
    return { ok: false, decisionPath, decision };
  }

  if (!assessment.ok) {
    const decision = {
      artifact_role: 'controlled_statement_enforcement_decision',
      scope: context.scope,
      requested_surface: requestedSurface,
      canonical_surface: canonicalSurface,
      allowed: false,
      reason_code: assessment.decision.reason_code,
      statement_class: statementClass,
      requested_text: requestedText || null,
      blocking_conditions: assessment.decision.blocking_conditions,
      support_artifact: statementArtifactName
    };
    fs.writeFileSync(decisionPath, `${JSON.stringify(decision, null, 2)}\n`, 'utf8');
    return { ok: false, decisionPath, decision };
  }

  if (requestedText && PROHIBITED_STATEMENT_TEMPLATES.has(requestedText)) {
    const decision = {
      artifact_role: 'controlled_statement_enforcement_decision',
      scope: context.scope,
      requested_surface: requestedSurface,
      canonical_surface: canonicalSurface,
      allowed: false,
      reason_code: 'blocked_statement_template',
      statement_class: statementClass,
      requested_text: requestedText,
      blocking_conditions: ['blocked_statement_template'],
      prohibited_statement_templates: [...PROHIBITED_STATEMENT_TEMPLATES]
    };
    fs.writeFileSync(decisionPath, `${JSON.stringify(decision, null, 2)}\n`, 'utf8');
    return { ok: false, decisionPath, decision };
  }

  const emittedStatements = Array.isArray(context.controlledStatements?.emitted_statements)
    ? context.controlledStatements.emitted_statements
    : [];
  const matches = emittedStatements.filter((entry) => {
    if (context.scope === 'small_batch' && condition && entry.condition !== condition) return false;
    return entry.statement_class === statementClass;
  });

  if (matches.length === 0) {
    const decision = {
      artifact_role: 'controlled_statement_enforcement_decision',
      scope: context.scope,
      requested_surface: requestedSurface,
      canonical_surface: canonicalSurface,
      allowed: false,
      reason_code: 'blocked_under_evaluation_support',
      statement_class: statementClass,
      requested_text: requestedText || null,
      blocking_conditions: ['blocked_under_evaluation_support'],
      support_artifact: statementArtifactName
    };
    fs.writeFileSync(decisionPath, `${JSON.stringify(decision, null, 2)}\n`, 'utf8');
    return { ok: false, decisionPath, decision };
  }

  const chosen = matches[0];
  if (requestedText && requestedText !== chosen.text) {
    const decision = {
      artifact_role: 'controlled_statement_enforcement_decision',
      scope: context.scope,
      requested_surface: requestedSurface,
      canonical_surface: canonicalSurface,
      allowed: false,
      reason_code: 'blocked_statement_template',
      statement_class: statementClass,
      requested_text: requestedText,
      allowed_text: chosen.text,
      blocking_conditions: ['blocked_statement_template']
    };
    fs.writeFileSync(decisionPath, `${JSON.stringify(decision, null, 2)}\n`, 'utf8');
    return { ok: false, decisionPath, decision };
  }

  const decision = {
    artifact_role: 'controlled_statement_enforcement_decision',
    scope: context.scope,
    requested_surface: requestedSurface,
    canonical_surface: canonicalSurface,
    allowed: true,
    reason_code: 'allowed_controlled_statement',
    statement_class: statementClass,
    statement: chosen,
    support_artifact: statementArtifactName,
    blocking_conditions: ['external_validation_absent']
  };
  fs.writeFileSync(decisionPath, `${JSON.stringify(decision, null, 2)}\n`, 'utf8');
  return { ok: true, decisionPath, decision };
};

export const buildLocalReportForSurface = ({
  rootDir,
  scope = 'auto',
  outputPath = null
}) => {
  const context = loadEnforcementContext({ rootDir, scope });
  const included = {};
  const blocked = {};

  for (const artifactName of context.surfacePolicy.governed_outputs || []) {
    const assessment = assessOutputForSurface({
      rootDir,
      artifactName,
      surface: 'local_report_surface',
      scope: context.scope
    });
    if (assessment.ok) {
      included[artifactName] = {
        decision: assessment.decision,
        artifact: assessment.artifact
      };
    } else {
      blocked[artifactName] = assessment.decision;
    }
  }

  const report = {
    artifact_role: 'local_surface_report',
    scope: context.scope,
    governed_surface: 'local_report_surface',
    source_artifacts: {
      surface_policy: path.basename(context.surfacePolicyPath),
      controlled_statements: fs.existsSync(context.controlledStatementsPath)
        ? path.basename(context.controlledStatementsPath)
        : null
    },
    included_outputs: included,
    blocked_outputs: blocked,
    interpretation_boundary: 'Local descriptive report only; includes only outputs permitted on local_report_surface and does not authorize claim-facing interpretation.',
    non_claim_restrictions: [
      'Do not export as external claim-facing report.',
      'Do not read included outputs as external validation.',
      'Do not collapse this report into framework confirmation.'
    ]
  };

  const finalOutputPath = path.resolve(outputPath || path.join(
    rootDir,
    context.scope === 'run_level' ? 'local_report.json' : 'condition_local_report.json'
  ));
  fs.writeFileSync(finalOutputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return { outputPath: finalOutputPath, artifact: report };
};

export default {
  assessOutputForSurface,
  exportOutputForSurface,
  emitControlledStatementForSurface,
  buildLocalReportForSurface
};

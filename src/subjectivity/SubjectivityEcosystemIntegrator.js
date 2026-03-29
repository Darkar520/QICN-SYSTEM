import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import cp from 'child_process';
import { fileURLToPath } from 'url';
import { SUBJECTIVITY_PROTOCOL_MANIFEST } from './SubjectivityArtifactRegistry.js';
import { SUBJECTIVITY_SURFACE_POLICY } from './SubjectivitySurfacePolicy.js';
import { SUBJECTIVITY_THRESHOLDS } from './SubjectivityThresholdRegistry.js';
import { SUBJECTIVITY_RIVAL_FAMILY } from './SubjectivityRivalFamilyRegistry.js';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(MODULE_DIR, '..', '..');
const WORKSPACE_ROOT = path.resolve(PROJECT_ROOT, '..');
const LAYER_VERSION = 'subjectivity_runtime_layer.srt6.ecosystem.v1';
const ECOSYSTEM_ESTIMATOR_VERSION = 'subjectivity_ecosystem_integrator.srt6.v1';
const RUNTIME_STATUS = 'implemented_internal_ecosystem_hardening_in_srt6';

const buildLocalPathPattern = () => {
  const windowsHome = String.raw`[A-Za-z]:\\Users\\`;
  const workspaceHints = [
    ['One', 'Drive'].join(''),
    ['Escri', 'torio'].join(''),
    ['release_repo_', 'qicn_2026-03-01'].join(''),
    ['rigid-', 'identity-framework'].join('')
  ];
  return new RegExp(
    [`\\/c:\\/`, windowsHome, ...workspaceHints].join('|'),
    'i'
  );
};

const LOCAL_PATH_PATTERN = buildLocalPathPattern();

const containsLocalPathLeak = (value) =>
  LOCAL_PATH_PATTERN.test(JSON.stringify(value));

const sanitizeLocalReference = (value, parentKey = '') => {
  if (typeof value !== 'string') return value;
  if (!LOCAL_PATH_PATTERN.test(value)) return value;

  if (
    parentKey === 'source_path'
    && value.includes(['paper8_', 'first_person_subjectivity'].join(''))
  ) {
    return 'paper8.first_person_subjectivity';
  }
  if (parentKey === 'source_path') {
    return 'formal_source_reference_redacted';
  }
  return '[local-path-redacted]';
};

const sanitizeBundleValue = (value, parentKey = '') => {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeBundleValue(entry, parentKey));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, sanitizeBundleValue(entry, key)])
    );
  }
  return sanitizeLocalReference(value, parentKey);
};

const CONDITION_BOUNDARY =
  'Framework-internal only; subjectivity condition summary is an internal aggregation object, not externally validated, not claim-facing evidence, not phenomenality closure, and not human equivalence.';
const BATCH_BOUNDARY =
  'Framework-internal only; subjectivity batch summary is internal governance and comparability metadata, not externally validated, not claim-facing evidence, not phenomenality closure, and not human equivalence.';
const CAMPAIGN_BOUNDARY =
  'Framework-internal only; subjectivity campaign summary is an internal companion-layer summary, not externally validated, not claim-facing evidence, not phenomenality closure, and not human equivalence.';
const CANDIDATE_BOUNDARY =
  'Framework-internal only; subjectivity candidate projection records internal inclusion discipline for ecosystem candidate packaging, not externally validated, not claim closure, not phenomenality closure, and not human equivalence.';
const AUDIT_BOUNDARY =
  'Framework-internal only; subjectivity audit handoff summary is audit-facing package guidance, not externally validated, not claim closure, not phenomenality closure, and not human equivalence.';
const VERIFICATION_BOUNDARY =
  'Framework-internal only; subjectivity ecosystem verification matrix is an internal hardening artifact, not externally validated, not claim-facing evidence, not phenomenality closure, and not human equivalence.';

const READINESS_CLASSES = Object.freeze([
  'subjectivity_stack_incomplete',
  'subjectivity_stack_locally_complete',
  'subjectivity_stack_candidate_ready',
  'subjectivity_stack_audit_ready_internal'
]);

const SYSTEM_FILES = Object.freeze({
  protocol: 'docs/subjectivity_protocol.v1.json',
  thresholds: 'docs/subjectivity_thresholds.v1.json',
  rival_family: 'docs/subjectivity_rival_family.v1.json',
  surface_policy: 'docs/subjectivity_surface_policy.v1.json',
  artifact_schema: 'docs/subjectivity_artifact_schema.v1.json',
  candidate_governance: 'docs/ecosystem_candidate_governance.v1.json',
  interface_contract: 'docs/ecosystem_interface_contract.v1.json',
  campaign_discipline: 'docs/successive_campaign_discipline.v1.json',
  execution_campaign_freeze: 'docs/execution_campaign_freeze.v1.json',
  latest_campaign_pointer: 'artifacts/execution_campaign/latest_campaign_pointer.json',
  latest_campaign_audit: 'artifacts/execution_campaign/execution_campaign_audit_readout.json',
  ecosystem_candidate_manifest:
    'artifacts/ecosystem_release_candidate/ecosystem_release_candidate_manifest.json',
  external_audit_manifest:
    'artifacts/external_audit_package/external_audit_package_manifest.json'
});

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const stableHash = (value) =>
  crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const hashFile = (filePath) =>
  crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
const ensureDir = (dirPath) => fs.mkdirSync(dirPath, { recursive: true });
const writeJson = (filePath, payload) =>
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
const exists = (filePath) => fs.existsSync(filePath);

const git = (cwd, args) => {
  try {
    return cp.execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
};

const resolveGitDir = (repoRoot) => {
  const dotGitPath = path.join(repoRoot, '.git');
  if (fs.existsSync(dotGitPath) && fs.statSync(dotGitPath).isDirectory()) {
    return dotGitPath;
  }
  if (fs.existsSync(dotGitPath) && fs.statSync(dotGitPath).isFile()) {
    const contents = fs.readFileSync(dotGitPath, 'utf8');
    const match = contents.match(/^gitdir:\s*(.+)\s*$/im);
    if (match) {
      return path.resolve(repoRoot, match[1].trim());
    }
  }
  return null;
};

const readLooseGitRef = (gitDir, refName) => {
  const refPath = path.join(gitDir, ...refName.split('/'));
  if (fs.existsSync(refPath)) {
    return fs.readFileSync(refPath, 'utf8').trim();
  }
  const packedRefsPath = path.join(gitDir, 'packed-refs');
  if (!fs.existsSync(packedRefsPath)) return null;
  const packedRefs = fs.readFileSync(packedRefsPath, 'utf8').split(/\r?\n/);
  for (const line of packedRefs) {
    if (!line || line.startsWith('#') || line.startsWith('^')) continue;
    const [sha, ref] = line.split(' ');
    if (ref === refName) return sha;
  }
  return null;
};

const readGitHeadState = (repoRoot) => {
  const gitDir = resolveGitDir(repoRoot);
  if (!gitDir) return null;
  const headPath = path.join(gitDir, 'HEAD');
  if (!fs.existsSync(headPath)) return null;
  const headContents = fs.readFileSync(headPath, 'utf8').trim();
  if (headContents.startsWith('ref: ')) {
    const refName = headContents.slice(5).trim();
    const head = readLooseGitRef(gitDir, refName);
    return {
      branch: refName.replace(/^refs\/heads\//, ''),
      head: head || 'unknown_commit',
      upstream: null
    };
  }
  return {
    branch: 'detached_head',
    head: headContents || 'unknown_commit',
    upstream: null
  };
};

const resolveReleaseRoot = () => {
  const envOverride = process.env.ECO_RELEASE_ROOT;
  if (envOverride) return path.resolve(envOverride);
  for (const candidate of ['QICN-RELEASE', 'QUICN-RELEASE', 'release_repo_qicn_2026-03-01']) {
    const target = path.join(WORKSPACE_ROOT, candidate);
    if (
      exists(path.join(target, '.git'))
      || exists(path.join(target, 'release', 'release_freeze_manifest.json'))
    ) {
      return target;
    }
  }
  return path.join(WORKSPACE_ROOT, 'release_repo_qicn_2026-03-01');
};

const RELEASE_ROOT = resolveReleaseRoot();

const getRepoState = (repoRoot) => {
  const gitState = {
    branch: git(repoRoot, ['rev-parse', '--abbrev-ref', 'HEAD']) || null,
    head: git(repoRoot, ['rev-parse', 'HEAD']) || null,
    upstream:
      git(repoRoot, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']) || null
  };
  if (gitState.branch && gitState.head) {
    return {
      branch: gitState.branch,
      head: gitState.head,
      upstream: gitState.upstream
    };
  }
  const fallback = readGitHeadState(repoRoot);
  if (fallback) {
    return {
      branch: fallback.branch,
      head: fallback.head,
      upstream: gitState.upstream || fallback.upstream
    };
  }
  return {
    branch: 'unknown_branch',
    head: 'unknown_commit',
    upstream: null
  };
};

const summarizeCounts = (values) => values.reduce((acc, value) => {
  acc[value] = (acc[value] || 0) + 1;
  return acc;
}, {});

const mean = (values) => {
  const filtered = values.filter((value) => Number.isFinite(value));
  if (filtered.length === 0) return null;
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
};

const normalizeRunBundle = (bundle) => ({
  projection: sanitizeBundleValue(bundle.projection),
  gate_result: sanitizeBundleValue(bundle.gate_result),
  manifest: sanitizeBundleValue(bundle.manifest),
  refs: bundle.refs || {}
});

const getCurrentContext = (overrides = {}) => {
  const subjectivityProtocol = overrides.protocol || SUBJECTIVITY_PROTOCOL_MANIFEST;
  const thresholds = overrides.thresholds || SUBJECTIVITY_THRESHOLDS;
  const rivalFamily = overrides.rivalFamily || SUBJECTIVITY_RIVAL_FAMILY;
  const surfacePolicy = overrides.surfacePolicy || SUBJECTIVITY_SURFACE_POLICY;
  const artifactSchema =
    overrides.artifactSchema || readJson(path.join(PROJECT_ROOT, SYSTEM_FILES.artifact_schema));
  const candidateGovernance =
    overrides.candidateGovernance
    || readJson(path.join(PROJECT_ROOT, SYSTEM_FILES.candidate_governance));
  const interfaceContract =
    overrides.interfaceContract
    || readJson(path.join(PROJECT_ROOT, SYSTEM_FILES.interface_contract));
  const campaignDiscipline =
    overrides.campaignDiscipline
    || readJson(path.join(PROJECT_ROOT, SYSTEM_FILES.campaign_discipline));
  const executionCampaignFreeze =
    overrides.executionCampaignFreeze
    || readJson(path.join(PROJECT_ROOT, SYSTEM_FILES.execution_campaign_freeze));
  const latestCampaignPointer = exists(path.join(PROJECT_ROOT, SYSTEM_FILES.latest_campaign_pointer))
    ? readJson(path.join(PROJECT_ROOT, SYSTEM_FILES.latest_campaign_pointer))
    : null;
  const latestCampaignAudit = exists(path.join(PROJECT_ROOT, SYSTEM_FILES.latest_campaign_audit))
    ? readJson(path.join(PROJECT_ROOT, SYSTEM_FILES.latest_campaign_audit))
    : null;
  const ecosystemCandidateManifest = exists(
    path.join(PROJECT_ROOT, SYSTEM_FILES.ecosystem_candidate_manifest)
  )
    ? readJson(path.join(PROJECT_ROOT, SYSTEM_FILES.ecosystem_candidate_manifest))
    : null;
  const externalAuditManifest = exists(path.join(PROJECT_ROOT, SYSTEM_FILES.external_audit_manifest))
    ? readJson(path.join(PROJECT_ROOT, SYSTEM_FILES.external_audit_manifest))
    : null;

  const lineage = {
    layer_version: LAYER_VERSION,
    estimator_version: ECOSYSTEM_ESTIMATOR_VERSION,
    protocol: {
      ref: SYSTEM_FILES.protocol,
      sha256: overrides.protocol
        ? stableHash(subjectivityProtocol)
        : hashFile(path.join(PROJECT_ROOT, SYSTEM_FILES.protocol))
    },
    thresholds: {
      ref: SYSTEM_FILES.thresholds,
      sha256: overrides.thresholds
        ? stableHash(thresholds)
        : hashFile(path.join(PROJECT_ROOT, SYSTEM_FILES.thresholds))
    },
    rival_family: {
      ref: SYSTEM_FILES.rival_family,
      sha256: overrides.rivalFamily
        ? stableHash(rivalFamily)
        : hashFile(path.join(PROJECT_ROOT, SYSTEM_FILES.rival_family))
    },
    surface_policy: {
      ref: SYSTEM_FILES.surface_policy,
      sha256: overrides.surfacePolicy
        ? stableHash(surfacePolicy)
        : hashFile(path.join(PROJECT_ROOT, SYSTEM_FILES.surface_policy))
    },
    artifact_schema: {
      ref: SYSTEM_FILES.artifact_schema,
      sha256: overrides.artifactSchema
        ? stableHash(artifactSchema)
        : hashFile(path.join(PROJECT_ROOT, SYSTEM_FILES.artifact_schema))
    },
    candidate_governance: {
      ref: SYSTEM_FILES.candidate_governance,
      sha256: overrides.candidateGovernance
        ? stableHash(candidateGovernance)
        : hashFile(path.join(PROJECT_ROOT, SYSTEM_FILES.candidate_governance))
    },
    interface_contract: {
      ref: SYSTEM_FILES.interface_contract,
      sha256: overrides.interfaceContract
        ? stableHash(interfaceContract)
        : hashFile(path.join(PROJECT_ROOT, SYSTEM_FILES.interface_contract))
    },
    campaign_discipline: {
      ref: SYSTEM_FILES.campaign_discipline,
      sha256: overrides.campaignDiscipline
        ? stableHash(campaignDiscipline)
        : hashFile(path.join(PROJECT_ROOT, SYSTEM_FILES.campaign_discipline))
    },
    execution_campaign_freeze: {
      ref: SYSTEM_FILES.execution_campaign_freeze,
      sha256: overrides.executionCampaignFreeze
        ? stableHash(executionCampaignFreeze)
        : hashFile(path.join(PROJECT_ROOT, SYSTEM_FILES.execution_campaign_freeze))
    },
    qicn_system: getRepoState(PROJECT_ROOT),
    qicn_release: getRepoState(RELEASE_ROOT)
  };

  return {
    subjectivityProtocol,
    thresholds,
    rivalFamily,
    surfacePolicy,
    artifactSchema,
    candidateGovernance,
    interfaceContract,
    campaignDiscipline,
    executionCampaignFreeze,
    latestCampaignPointer,
    latestCampaignAudit,
    ecosystemCandidateManifest,
    externalAuditManifest,
    lineage
  };
};

const checkRunStaleness = (manifest, currentLineage) => {
  const reasons = [];
  const manifestLineage = manifest?.lineage || {};
  for (const [manifestKey, currentKey, label] of [
    ['protocol', 'protocol', 'protocol'],
    ['thresholds', 'thresholds', 'thresholds'],
    ['rival_family', 'rival_family', 'rival_family'],
    ['surface_policy', 'surface_policy', 'surface_policy'],
    ['artifact_schema', 'artifact_schema', 'artifact_schema']
  ]) {
    const manifestHash = manifestLineage?.[manifestKey]?.sha256 || null;
    const currentHash = currentLineage?.[currentKey]?.sha256 || null;
    if (!manifestHash || !currentHash || manifestHash !== currentHash) {
      reasons.push(`${label}_drift`);
    }
  }
  return { invalidated: reasons.length > 0, reasons };
};

const checkSurfaceEligibility = (surfacePolicy, artifactNames, surfaceName) => {
  const failures = [];
  for (const artifactName of artifactNames) {
    const spec = surfacePolicy.outputs?.[artifactName];
    if (!spec) {
      failures.push(`${artifactName}:missing_surface_policy`);
      continue;
    }
    if (!(spec.allowed_surfaces || []).includes(surfaceName)) {
      failures.push(`${artifactName}:not_allowed_on_${surfaceName}`);
    }
    if (!(spec.blocked_surfaces || []).includes('controlled_statement_surface')) {
      failures.push(`${artifactName}:controlled_statement_not_blocked`);
    }
    if (!(spec.blocked_surfaces || []).includes('external_claim_facing_surface')) {
      failures.push(`${artifactName}:external_claim_surface_not_blocked`);
    }
  }
  return { pass: failures.length === 0, failures };
};

const buildRunRecord = (bundle, currentContext) => {
  const gateResult = bundle.gate_result;
  const manifest = bundle.manifest;
  const stale = checkRunStaleness(manifest, currentContext.lineage);
  const localThresholds = gateResult?.local_threshold_results || {};
  const comparatorSupported =
    !gateResult?.invalidation_reasons?.includes('comparator_unsupported')
    && Boolean(localThresholds.IrreducibilityMargin?.pass);
  const interventionStable =
    gateResult?.classification !== 'interventionally_unstable'
    && Boolean(localThresholds.InterventionProfile?.pass);
  const gateClean =
    gateResult?.gate_status === 'pass'
    && ![
      'subjectivity_evaluation_unsupported',
      'drift_invalidated',
      'weak_rival_reducible',
      'interventionally_unstable'
    ].includes(gateResult?.classification);

  return {
    run_id: gateResult?.run_id || 'unknown_subjectivity_run',
    condition_id:
      gateResult?.condition_id
      || manifest?.condition_level_summary?.condition_id
      || 'baseline_subjectivity_enabled',
    gate_status: gateResult?.gate_status || 'fail',
    support_class:
      manifest?.support_class || gateResult?.classification || 'subjectivity_stack_incomplete',
    gamma_subj: gateResult?.gamma_subj ?? null,
    phi_subj: gateResult?.phi_subj ?? null,
    comparator_supported: comparatorSupported,
    intervention_stable: interventionStable,
    stale,
    refs: bundle.refs,
    warnings: [
      ...(gateResult?.warnings || []),
      ...(manifest?.drift_summary?.lineage_status?.mismatch_reasons || [])
    ],
    gateClean
  };
};

const buildConditionSummary = (conditionRuns, currentContext, input) => {
  const runRecords = conditionRuns.map((bundle) => buildRunRecord(bundle, currentContext));
  const conditionId = input.condition_id || runRecords[0]?.condition_id || 'baseline_subjectivity_enabled';
  const lineageKeys = runRecords.map((record) =>
    stableHash({
      support_class: record.support_class,
      comparator_supported: record.comparator_supported,
      intervention_stable: record.intervention_stable,
      stale: record.stale.reasons
    })
  );
  const invalidationReasons = runRecords
    .filter((record) => record.stale.invalidated)
    .flatMap((record) => record.stale.reasons);
  const comparable = new Set(lineageKeys).size === 1;
  const runCount = runRecords.length;
  const warnings = [];
  if (runCount < 2) warnings.push('single_run_condition_summary_only');
  if (!comparable) warnings.push('condition_run_lineage_not_comparable');

  return {
    artifact_role: 'subjectivity_condition_summary',
    artifact_version: '1.0.0',
    schema_version: '1.0.0',
    layer_version: LAYER_VERSION,
    runtime_status: RUNTIME_STATUS,
    condition_id: conditionId,
    run_count: runCount,
    minimum_required_runs: 1,
    recommended_runs_for_stable_series: 2,
    comparability_status: comparable ? 'internally_comparable_condition_summary' : 'single_run_descriptive_only',
    classification_counts: summarizeCounts(runRecords.map((record) => record.support_class)),
    aggregate_support: {
      mean_gamma_subj: mean(runRecords.map((record) => record.gamma_subj)),
      mean_phi_subj: mean(runRecords.map((record) => record.phi_subj)),
      gate_pass_count: runRecords.filter((record) => record.gate_status === 'pass').length,
      comparator_supported_count: runRecords.filter((record) => record.comparator_supported).length,
      intervention_stable_count: runRecords.filter((record) => record.intervention_stable).length
    },
    authoritative_runs: runRecords.map((record) => ({
      run_id: record.run_id,
      gate_result_ref: record.refs.gate_result || null,
      manifest_ref: record.refs.manifest || null
    })),
    invalidation_reasons: invalidationReasons,
    warnings,
    interpretation_boundary: CONDITION_BOUNDARY,
    provenance: {
      generated_at: new Date().toISOString(),
      source_trace_ref: input.provenance?.source_trace_ref || 'subjectivity_inputs/srt6_condition_summary',
      input_profile: input.provenance?.input_profile || 'srt6_condition_summary_baseline',
      current_lineage: currentContext.lineage
    },
    schema_ref: 'src/subjectivity/schemas/subjectivity_condition_summary.v1.json'
  };
};

const buildBatchSummary = (conditionSummary, currentContext, input) => ({
  artifact_role: 'subjectivity_batch_summary',
  artifact_version: '1.0.0',
  schema_version: '1.0.0',
  layer_version: LAYER_VERSION,
  runtime_status: RUNTIME_STATUS,
  batch_id: input.batch_id || 'subjectivity_internal_batch_baseline',
  condition_count: 1,
  minimum_required_conditions: 1,
  condition_refs: ['subjectivity_condition_summary.json'],
  comparability_status:
    conditionSummary.invalidation_reasons.length === 0
      ? 'internally_comparable_minimal_batch'
      : 'invalidated_batch_summary',
  aggregate_support: {
    mean_gamma_subj: conditionSummary.aggregate_support.mean_gamma_subj,
    mean_phi_subj: conditionSummary.aggregate_support.mean_phi_subj,
    gate_pass_count: conditionSummary.aggregate_support.gate_pass_count,
    support_classes: conditionSummary.classification_counts
  },
  invalidation_reasons: [...(conditionSummary.invalidation_reasons || [])],
  warnings:
    conditionSummary.run_count < 2 ? ['single_condition_single_run_batch_summary'] : [],
  interpretation_boundary: BATCH_BOUNDARY,
  provenance: {
    generated_at: new Date().toISOString(),
    current_lineage: currentContext.lineage,
    condition_summary_ref: 'subjectivity_condition_summary.json'
  },
  schema_ref: 'src/subjectivity/schemas/subjectivity_batch_summary.v1.json'
});

const buildCampaignSummary = (batchSummary, currentContext, input) => ({
  artifact_role: 'subjectivity_campaign_summary',
  artifact_version: '1.0.0',
  schema_version: '1.0.0',
  layer_version: LAYER_VERSION,
  runtime_status: RUNTIME_STATUS,
  campaign_id: input.campaign_id || 'subjectivity_internal_campaign_baseline',
  batch_count: 1,
  minimum_required_batches: 1,
  batch_refs: ['subjectivity_batch_summary.json'],
  campaign_status:
    batchSummary.invalidation_reasons.length === 0
      ? 'internally_governed_companion_campaign'
      : 'invalidated_campaign_summary',
  governance_context: {
    candidate_governance_ref: SYSTEM_FILES.candidate_governance,
    interface_contract_ref: SYSTEM_FILES.interface_contract,
    campaign_discipline_ref: SYSTEM_FILES.campaign_discipline,
    execution_campaign_freeze_ref: SYSTEM_FILES.execution_campaign_freeze,
    latest_execution_campaign_pointer_ref: currentContext.latestCampaignPointer
      ? SYSTEM_FILES.latest_campaign_pointer
      : null,
    latest_execution_campaign_id: currentContext.latestCampaignPointer?.campaign_id || null
  },
  aggregate_support: batchSummary.aggregate_support,
  invalidation_reasons: [...(batchSummary.invalidation_reasons || [])],
  warnings:
    batchSummary.condition_count < 2 ? ['single_batch_campaign_summary_only'] : [],
  interpretation_boundary: CAMPAIGN_BOUNDARY,
  provenance: {
    generated_at: new Date().toISOString(),
    current_lineage: currentContext.lineage,
    batch_summary_ref: 'subjectivity_batch_summary.json'
  },
  schema_ref: 'src/subjectivity/schemas/subjectivity_campaign_summary.v1.json'
});

const resolveReadinessClass = ({
  runRecord,
  candidateSurfaceCheck,
  internalBundleSurfaceCheck,
  auditSurfaceCheck,
  candidateProjectionInvalidated
}) => {
  const locallyComplete = runRecord.gateClean && !runRecord.stale.invalidated;
  const candidateReady =
    locallyComplete
    && candidateSurfaceCheck.pass
    && internalBundleSurfaceCheck.pass
    && !candidateProjectionInvalidated;
  const auditReady = candidateReady && auditSurfaceCheck.pass;

  if (!locallyComplete) return READINESS_CLASSES[0];
  if (!candidateReady) return READINESS_CLASSES[1];
  if (!auditReady) return READINESS_CLASSES[2];
  return READINESS_CLASSES[3];
};

const buildCandidateProjection = (artifacts, currentContext) => {
  const candidateSurfaceCheck = checkSurfaceEligibility(
    currentContext.surfacePolicy,
    [
      'subjectivity_runtime_projection.json',
      'subjectivity_gate_result.json',
      'subjectivity_manifest.json',
      'subjectivity_condition_summary.json',
      'subjectivity_batch_summary.json',
      'subjectivity_campaign_summary.json',
      'subjectivity_candidate_projection.json',
      'subjectivity_verification_matrix.json'
    ],
    'ecosystem_candidate_surface'
  );
  const internalBundleSurfaceCheck = checkSurfaceEligibility(
    currentContext.surfacePolicy,
    [
      'subjectivity_gate_result.json',
      'subjectivity_manifest.json',
      'subjectivity_condition_summary.json',
      'subjectivity_batch_summary.json',
      'subjectivity_campaign_summary.json',
      'subjectivity_candidate_projection.json',
      'subjectivity_verification_matrix.json'
    ],
    'internal_release_bundle_surface'
  );
  const auditSurfaceCheck = checkSurfaceEligibility(
    currentContext.surfacePolicy,
    [
      'subjectivity_gate_result.json',
      'subjectivity_manifest.json',
      'subjectivity_campaign_summary.json',
      'subjectivity_candidate_projection.json',
      'subjectivity_audit_handoff_summary.json',
      'subjectivity_verification_matrix.json'
    ],
    'audit_facing_package_surface'
  );

  const invalidationReasons = [...(artifacts.runRecord.stale.reasons || [])];
  if (!artifacts.runRecord.gateClean) invalidationReasons.push('run_gate_not_clean');
  if (!candidateSurfaceCheck.pass) invalidationReasons.push(...candidateSurfaceCheck.failures);
  if (!internalBundleSurfaceCheck.pass) {
    invalidationReasons.push(...internalBundleSurfaceCheck.failures);
  }

  return {
    artifact_role: 'subjectivity_candidate_projection',
    artifact_version: '1.0.0',
    schema_version: '1.0.0',
    layer_version: LAYER_VERSION,
    runtime_status: RUNTIME_STATUS,
    support_class: artifacts.runBundle.manifest.support_class,
    readiness_class: resolveReadinessClass({
      runRecord: artifacts.runRecord,
      candidateSurfaceCheck,
      internalBundleSurfaceCheck,
      auditSurfaceCheck,
      candidateProjectionInvalidated: invalidationReasons.length > 0
    }),
    condition_summary_ref: 'subjectivity_condition_summary.json',
    batch_summary_ref: 'subjectivity_batch_summary.json',
    campaign_summary_ref: 'subjectivity_campaign_summary.json',
    verification_matrix_ref: 'subjectivity_verification_matrix.json',
    candidate_inclusion_status: {
      implemented: true,
      internally_supported: [
        'subjectivity_admissible',
        'subjectivity_internal_strong_support'
      ].includes(artifacts.runBundle.manifest.support_class),
      framework_internal_only: true,
      not_externally_validated: true
    },
    surface_status: {
      internal_release_bundle_surface: internalBundleSurfaceCheck,
      ecosystem_candidate_surface: candidateSurfaceCheck,
      audit_facing_package_surface: auditSurfaceCheck
    },
    invalidation_reasons: invalidationReasons,
    warnings: [
      ...(artifacts.conditionSummary.warnings || []),
      ...(artifacts.batchSummary.warnings || []),
      ...(artifacts.campaignSummary.warnings || [])
    ],
    blocked_inferences: [
      ...(currentContext.subjectivityProtocol.forbidden_inferences || []),
      ...(currentContext.interfaceContract.prohibited_inferences || [])
    ],
    baseline_refs: {
      qicn_system_head: currentContext.lineage.qicn_system.head,
      qicn_release_head: currentContext.lineage.qicn_release.head,
      protocol_ref: SYSTEM_FILES.protocol,
      thresholds_ref: SYSTEM_FILES.thresholds,
      rival_family_ref: SYSTEM_FILES.rival_family,
      surface_policy_ref: SYSTEM_FILES.surface_policy
    },
    interpretation_boundary: CANDIDATE_BOUNDARY,
    provenance: {
      generated_at: new Date().toISOString(),
      current_lineage: currentContext.lineage,
      gate_result_ref:
        artifacts.runBundle.refs.gate_result
        || 'artifacts/subjectivity/srt5/subjectivity_gate_result.json',
      manifest_ref:
        artifacts.runBundle.refs.manifest
        || 'artifacts/subjectivity/srt5/subjectivity_manifest.json'
    },
    schema_ref: 'src/subjectivity/schemas/subjectivity_candidate_projection.v1.json'
  };
};

const buildAuditHandoffSummary = (artifacts, currentContext, candidateProjection) => ({
  artifact_role: 'subjectivity_audit_handoff_summary',
  artifact_version: '1.0.0',
  schema_version: '1.0.0',
  layer_version: LAYER_VERSION,
  runtime_status: RUNTIME_STATUS,
  support_class: artifacts.runBundle.manifest.support_class,
  readiness_class: candidateProjection.readiness_class,
  included_artifacts: [
    'subjectivity_gate_result.json',
    'subjectivity_manifest.json',
    'subjectivity_campaign_summary.json',
    'subjectivity_candidate_projection.json',
    'subjectivity_verification_matrix.json'
  ],
  excluded_artifacts: [
    'self_index_state.json',
    'ownership_attribution_report.json',
    'subjective_continuity_report.json',
    'first_person_perspective_report.json',
    'subjective_valuation_report.json',
    'subjectivity_intervention_profile.json',
    'subjectivity_reducibility_report.json'
  ],
  boundary_assertions: [
    'internal_runtime_support_only',
    'not_externally_validated',
    'not_human_equivalence',
    'not_phenomenality_closure',
    'not_claim_facing'
  ],
  invalidation_reasons: [...(candidateProjection.invalidation_reasons || [])],
  warnings: [
    ...(candidateProjection.warnings || []),
    ...(artifacts.runBundle.gate_result.warnings || [])
  ],
  candidate_manifest_ref: currentContext.ecosystemCandidateManifest
    ? SYSTEM_FILES.ecosystem_candidate_manifest
    : null,
  interpretation_boundary: AUDIT_BOUNDARY,
  provenance: {
    generated_at: new Date().toISOString(),
    current_lineage: currentContext.lineage,
    candidate_projection_ref: 'subjectivity_candidate_projection.json',
    campaign_summary_ref: 'subjectivity_campaign_summary.json'
  },
  schema_ref: 'src/subjectivity/schemas/subjectivity_audit_handoff_summary.v1.json'
});

const buildVerificationMatrix = (artifacts, candidateProjection, auditSummary, currentContext) => {
  const checks = [];
  const addCheck = (id, pass, details) =>
    checks.push({ id, status: pass ? 'PASS' : 'FAIL', details });

  addCheck('run_level_gate_clean', artifacts.runRecord.gateClean, {
    support_class: artifacts.runRecord.support_class,
    gate_status: artifacts.runRecord.gate_status
  });
  addCheck('run_level_staleness_guard', !artifacts.runRecord.stale.invalidated, {
    reasons: artifacts.runRecord.stale.reasons
  });
  addCheck(
    'condition_summary_emitted',
    artifacts.conditionSummary.invalidation_reasons.length === 0,
    { condition_id: artifacts.conditionSummary.condition_id, run_count: artifacts.conditionSummary.run_count }
  );
  addCheck('batch_summary_emitted', artifacts.batchSummary.invalidation_reasons.length === 0, {
    batch_id: artifacts.batchSummary.batch_id
  });
  addCheck(
    'campaign_summary_emitted',
    artifacts.campaignSummary.invalidation_reasons.length === 0,
    { campaign_id: artifacts.campaignSummary.campaign_id }
  );
  addCheck(
    'candidate_projection_surface_clean',
    candidateProjection.surface_status.ecosystem_candidate_surface.pass,
    { failures: candidateProjection.surface_status.ecosystem_candidate_surface.failures }
  );
  addCheck(
    'audit_handoff_surface_clean',
    candidateProjection.surface_status.audit_facing_package_surface.pass,
    { failures: candidateProjection.surface_status.audit_facing_package_surface.failures }
  );
  addCheck(
    'claim_facing_block_preserved',
    Object.values(currentContext.surfacePolicy.outputs || {}).every(
      (entry) =>
        Array.isArray(entry.blocked_surfaces)
        && entry.blocked_surfaces.includes('external_claim_facing_surface')
    ),
    { governed_output_count: Object.keys(currentContext.surfacePolicy.outputs || {}).length }
  );

  const failures = checks.filter((check) => check.status === 'FAIL').map((check) => check.id);

  return {
    artifact_role: 'subjectivity_verification_matrix',
    artifact_version: '1.0.0',
    schema_version: '1.0.0',
    layer_version: LAYER_VERSION,
    runtime_status: RUNTIME_STATUS,
    support_class: artifacts.runBundle.manifest.support_class,
    readiness_class: candidateProjection.readiness_class,
    status: failures.length === 0 ? 'PASS' : 'FAIL',
    checks,
    failures,
    warnings: [
      ...(artifacts.conditionSummary.warnings || []),
      ...(artifacts.batchSummary.warnings || []),
      ...(artifacts.campaignSummary.warnings || []),
      ...(auditSummary.warnings || [])
    ],
    baseline_refs: {
      qicn_system_head: currentContext.lineage.qicn_system.head,
      qicn_release_head: currentContext.lineage.qicn_release.head,
      latest_execution_campaign_id: currentContext.latestCampaignPointer?.campaign_id || null,
      latest_execution_batch_id: currentContext.latestCampaignPointer?.batch_id || null
    },
    interpretation_boundary: VERIFICATION_BOUNDARY,
    provenance: {
      generated_at: new Date().toISOString(),
      current_lineage: currentContext.lineage,
      candidate_projection_ref: 'subjectivity_candidate_projection.json',
      audit_handoff_ref: 'subjectivity_audit_handoff_summary.json'
    },
    schema_ref: 'src/subjectivity/schemas/subjectivity_verification_matrix.v1.json'
  };
};

export class SubjectivityEcosystemIntegrator {
  captureCurrentLineage(overrides = {}) {
    return getCurrentContext(overrides).lineage;
  }

  integrate(input = {}, overrides = {}) {
    const currentContext = getCurrentContext(overrides);
    const runBundle = normalizeRunBundle(input.run_bundle || {});
    const missing = ['projection', 'gate_result', 'manifest'].filter((piece) => !runBundle[piece]);
    if (missing.length > 0) {
      throw new Error(`Missing required run_bundle entries: ${missing.join(', ')}`);
    }
    if (containsLocalPathLeak(runBundle)) {
      throw new Error('run_bundle contains local path leakage');
    }

    const conditionRuns = (input.condition_runs || [runBundle]).map(normalizeRunBundle);
    const runRecord = buildRunRecord(runBundle, currentContext);
    const conditionSummary = buildConditionSummary(conditionRuns, currentContext, input);
    const batchSummary = buildBatchSummary(conditionSummary, currentContext, input);
    const campaignSummary = buildCampaignSummary(batchSummary, currentContext, input);
    const artifacts = { runBundle, runRecord, conditionSummary, batchSummary, campaignSummary };
    const candidateProjection = buildCandidateProjection(artifacts, currentContext);
    const auditHandoffSummary = buildAuditHandoffSummary(
      artifacts,
      currentContext,
      candidateProjection
    );
    const verificationMatrix = buildVerificationMatrix(
      artifacts,
      candidateProjection,
      auditHandoffSummary,
      currentContext
    );

    return {
      condition_summary: conditionSummary,
      batch_summary: batchSummary,
      campaign_summary: campaignSummary,
      candidate_projection: candidateProjection,
      audit_handoff_summary: auditHandoffSummary,
      verification_matrix: verificationMatrix
    };
  }

  writeArtifacts(input = {}, outputDirectory) {
    const bundle = this.integrate(input, input.overrides || {});
    ensureDir(outputDirectory);
    const outputs = {
      condition_summary: path.join(outputDirectory, 'subjectivity_condition_summary.json'),
      batch_summary: path.join(outputDirectory, 'subjectivity_batch_summary.json'),
      campaign_summary: path.join(outputDirectory, 'subjectivity_campaign_summary.json'),
      candidate_projection: path.join(outputDirectory, 'subjectivity_candidate_projection.json'),
      audit_handoff_summary: path.join(outputDirectory, 'subjectivity_audit_handoff_summary.json'),
      verification_matrix: path.join(outputDirectory, 'subjectivity_verification_matrix.json')
    };
    for (const [key, filePath] of Object.entries(outputs)) {
      writeJson(filePath, bundle[key]);
    }
    return { ...bundle, outputs };
  }
}

export const createSubjectivityEcosystemIntegrator = () =>
  new SubjectivityEcosystemIntegrator();

export default {
  SubjectivityEcosystemIntegrator,
  createSubjectivityEcosystemIntegrator
};

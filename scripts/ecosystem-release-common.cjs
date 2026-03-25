const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const SYSTEM_ROOT = path.resolve(__dirname, '..');
const WORKSPACE_ROOT = path.resolve(SYSTEM_ROOT, '..');
const RELEASE_ROOT = path.join(WORKSPACE_ROOT, 'release_repo_qicn_2026-03-01');
const ECOSYSTEM_ARTIFACT_ROOT = path.join(SYSTEM_ROOT, 'artifacts', 'ecosystem_release_candidate');
const LOCAL_PATH_PATTERN = /\/c:\/|[A-Za-z]:\\Users\\|OneDrive|Escritorio/i;

const normalize = (value) => String(value || '').replace(/\\/g, '/');
const exists = (file) => fs.existsSync(file);
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const readText = (file) => fs.readFileSync(file, 'utf8');

const ensureDir = (dir) => {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

const writeJson = (file, data) => {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
};

const copyFile = (from, to) => {
  ensureDir(path.dirname(to));
  fs.copyFileSync(from, to);
};

const listDirsByPrefix = (dir, prefix) => {
  if (!exists(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith(prefix))
    .map((entry) => path.join(dir, entry.name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
};

const latestDirByPrefix = (dir, prefix) => {
  const matches = listDirsByPrefix(dir, prefix);
  return matches.length > 0 ? matches[0] : null;
};

const git = (cwd, args) => cp.execFileSync(
  'git',
  args,
  { cwd, encoding: 'utf8' }
).trim();
const tryGit = (cwd, args) => {
  try {
    return git(cwd, args);
  } catch (error) {
    return null;
  }
};

const getRepoStateFromEnv = (prefix) => {
  const branch = process.env[`${prefix}_BRANCH`];
  const head = process.env[`${prefix}_HEAD`];
  if (!branch || !head) return null;
  return {
    branch,
    head,
    upstream: process.env[`${prefix}_UPSTREAM`] || null,
    upstream_head: process.env[`${prefix}_UPSTREAM_HEAD`] || null,
    remote: process.env[`${prefix}_REMOTE`] || 'origin',
    remote_url: process.env[`${prefix}_REMOTE_URL`] || null,
    clean: String(process.env[`${prefix}_CLEAN`] || '').toLowerCase() === 'true',
    pushed: String(process.env[`${prefix}_PUSHED`] || '').toLowerCase() === 'true'
  };
};

const getRepoState = (repoRoot, envPrefix) => {
  const fromEnv = getRepoStateFromEnv(envPrefix);
  if (fromEnv) return fromEnv;
  const branch = git(repoRoot, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const head = git(repoRoot, ['rev-parse', 'HEAD']);
  const statusPorcelain = git(repoRoot, ['status', '--porcelain']);
  const upstream = tryGit(repoRoot, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
  const upstreamHead = upstream ? tryGit(repoRoot, ['rev-parse', '@{u}']) : null;
  const remote = upstream ? upstream.split('/')[0] : 'origin';
  const remoteUrl = tryGit(repoRoot, ['config', '--get', `remote.${remote}.url`]);
  return {
    branch,
    head,
    upstream,
    upstream_head: upstreamHead,
    remote,
    remote_url: remoteUrl,
    clean: statusPorcelain === '',
    pushed: Boolean(upstreamHead && upstreamHead === head)
  };
};

const getSystemBundleManifestPath = () => {
  const latest = latestDirByPrefix(path.join(SYSTEM_ROOT, 'artifacts', 'internal_release'), 'internal_release_');
  if (!latest) return null;
  const manifest = path.join(latest, 'release_bundle_manifest.json');
  return exists(manifest) ? manifest : null;
};

const getReleaseBundleManifestPath = () => {
  const checkPath = path.join(RELEASE_ROOT, '_build', 'canonical_hardening', 'canonical_release_check.json');
  if (exists(checkPath)) {
    const check = readJson(checkPath);
    if (check.bundle && check.bundle.manifestPath) {
      const manifest = path.join(RELEASE_ROOT, check.bundle.manifestPath);
      if (exists(manifest)) return manifest;
    }
  }
  const latest = latestDirByPrefix(path.join(RELEASE_ROOT, '_build'), 'canonical_release_bundle_');
  if (!latest) return null;
  const manifest = path.join(latest, 'canonical_release_manifest.json');
  return exists(manifest) ? manifest : null;
};

const loadSystemBaseline = () => {
  const readinessPath = path.join(SYSTEM_ROOT, 'artifacts', 'operational_readiness_manifest.json');
  const artifactPath = path.join(SYSTEM_ROOT, 'artifacts', 'artifact_manifest.json');
  const smokePath = path.join(SYSTEM_ROOT, 'artifacts', 'operational_smoke_manifest.json');
  const bundlePath = getSystemBundleManifestPath();
  return {
    repo_root: SYSTEM_ROOT,
    state: getRepoState(SYSTEM_ROOT, 'ECO_SYSTEM'),
    readiness_path: readinessPath,
    artifact_manifest_path: artifactPath,
    smoke_manifest_path: smokePath,
    bundle_manifest_path: bundlePath,
    readiness: readJson(readinessPath),
    artifact_manifest: readJson(artifactPath),
    smoke_manifest: readJson(smokePath),
    bundle_manifest: bundlePath ? readJson(bundlePath) : null
  };
};

const loadReleaseBaseline = () => {
  const freezePath = path.join(RELEASE_ROOT, 'release', 'release_freeze_manifest.json');
  const claimRegistryPath = path.join(RELEASE_ROOT, 'release', 'claim_registry.v1.json');
  const integrityPath = path.join(RELEASE_ROOT, '_build', 'canonical_hardening', 'canonical_integrity_check.json');
  const releaseCheckPath = path.join(RELEASE_ROOT, '_build', 'canonical_hardening', 'canonical_release_check.json');
  const bundlePath = getReleaseBundleManifestPath();
  return {
    repo_root: RELEASE_ROOT,
    state: getRepoState(RELEASE_ROOT, 'ECO_RELEASE'),
    freeze_path: freezePath,
    claim_registry_path: claimRegistryPath,
    integrity_check_path: integrityPath,
    release_check_path: releaseCheckPath,
    bundle_manifest_path: bundlePath,
    freeze_manifest: readJson(freezePath),
    claim_registry: readJson(claimRegistryPath),
    integrity_check: readJson(integrityPath),
    release_check: readJson(releaseCheckPath),
    bundle_manifest: bundlePath ? readJson(bundlePath) : null
  };
};

const loadInterfaceContract = () => {
  const docPath = path.join(SYSTEM_ROOT, 'docs', 'ECOSYSTEM_INTERFACE_CONTRACT.md');
  const jsonPath = path.join(SYSTEM_ROOT, 'docs', 'ecosystem_interface_contract.v1.json');
  return {
    doc_path: docPath,
    json_path: jsonPath,
    doc_present: exists(docPath),
    json_present: exists(jsonPath),
    json: readJson(jsonPath)
  };
};

const loadCandidateGovernance = () => {
  const docPath = path.join(SYSTEM_ROOT, 'docs', 'ECOSYSTEM_CANDIDATE_GOVERNANCE.md');
  const jsonPath = path.join(SYSTEM_ROOT, 'docs', 'ecosystem_candidate_governance.v1.json');
  return {
    doc_path: docPath,
    json_path: jsonPath,
    doc_present: exists(docPath),
    json_present: exists(jsonPath),
    json: exists(jsonPath) ? readJson(jsonPath) : null
  };
};

const loadFreezeDocs = () => ({
  baseline_doc_path: path.join(SYSTEM_ROOT, 'docs', 'ECOSYSTEM_FREEZE_BASELINE.md'),
  release_notes_doc_path: path.join(SYSTEM_ROOT, 'docs', 'ECOSYSTEM_RELEASE_NOTES.md'),
  maintenance_checklist_path: path.join(SYSTEM_ROOT, 'docs', 'ECOSYSTEM_MAINTENANCE_CHECKLIST.md')
});

const loadEvaluationPhase = () => {
  const docs = {
    protocol_doc_path: path.join(SYSTEM_ROOT, 'docs', 'PROTOCOLIZED_EVALUATION_PROTOCOL.md'),
    comparison_doc_path: path.join(SYSTEM_ROOT, 'docs', 'EVALUATION_COMPARISON_MATRIX.md'),
    metrics_doc_path: path.join(SYSTEM_ROOT, 'docs', 'EVALUATION_METRICS_BASELINE.md'),
    controls_doc_path: path.join(SYSTEM_ROOT, 'docs', 'EVALUATION_CONTROLS_AND_INTERVENTIONS.md'),
    stats_doc_path: path.join(SYSTEM_ROOT, 'docs', 'EVALUATION_STATISTICAL_POLICY.md'),
    boundary_doc_path: path.join(SYSTEM_ROOT, 'docs', 'EVALUATION_INTERPRETATION_BOUNDARY.md'),
    freeze_doc_path: path.join(SYSTEM_ROOT, 'docs', 'PROTOCOLIZED_EVALUATION_FREEZE_BASELINE.md'),
    execution_campaign_freeze_doc_path: path.join(SYSTEM_ROOT, 'docs', 'EXECUTION_CAMPAIGN_FREEZE_BASELINE.md'),
    successive_campaign_discipline_doc_path: path.join(SYSTEM_ROOT, 'docs', 'SUCCESSIVE_CAMPAIGN_DISCIPLINE.md'),
    protocol_json_path: path.join(SYSTEM_ROOT, 'docs', 'evaluation_protocol.v1.json'),
    comparison_json_path: path.join(SYSTEM_ROOT, 'docs', 'evaluation_comparison_matrix.v1.json'),
    metrics_json_path: path.join(SYSTEM_ROOT, 'docs', 'evaluation_metrics_registry.v1.json'),
    controls_json_path: path.join(SYSTEM_ROOT, 'docs', 'evaluation_controls_registry.v1.json'),
    stats_json_path: path.join(SYSTEM_ROOT, 'docs', 'evaluation_statistical_policy.v1.json'),
    freeze_json_path: path.join(SYSTEM_ROOT, 'docs', 'evaluation_architecture_freeze.v1.json'),
    execution_campaign_freeze_json_path: path.join(SYSTEM_ROOT, 'docs', 'execution_campaign_freeze.v1.json'),
    successive_campaign_discipline_json_path: path.join(SYSTEM_ROOT, 'docs', 'successive_campaign_discipline.v1.json')
  };
  const artifacts = {
    protocol_manifest_path: path.join(SYSTEM_ROOT, 'artifacts', 'protocolized_evaluation', 'evaluation_protocol_manifest.json'),
    batch_report_path: path.join(SYSTEM_ROOT, 'artifacts', 'protocolized_evaluation', 'evaluation_batch_report.json'),
    condition_summary_path: path.join(SYSTEM_ROOT, 'artifacts', 'protocolized_evaluation', 'condition_evaluation_summary.json'),
    comparison_report_path: path.join(SYSTEM_ROOT, 'artifacts', 'protocolized_evaluation', 'condition_comparison_report.json'),
    protocol_check_path: path.join(SYSTEM_ROOT, 'artifacts', 'protocolized_evaluation', 'evaluation_protocol_check.json'),
    metrics_check_path: path.join(SYSTEM_ROOT, 'artifacts', 'protocolized_evaluation', 'evaluation_metrics_check.json'),
    comparisons_check_path: path.join(SYSTEM_ROOT, 'artifacts', 'protocolized_evaluation', 'evaluation_comparisons_check.json'),
    campaign_plan_path: path.join(SYSTEM_ROOT, 'artifacts', 'execution_campaign', 'campaign_execution_plan.json'),
    campaign_readout_path: path.join(SYSTEM_ROOT, 'artifacts', 'execution_campaign', 'execution_campaign_readout.json'),
    campaign_pointer_path: path.join(SYSTEM_ROOT, 'artifacts', 'execution_campaign', 'latest_campaign_pointer.json'),
    campaign_audit_path: path.join(SYSTEM_ROOT, 'artifacts', 'execution_campaign', 'execution_campaign_audit_readout.json')
  };
  const coreArtifacts = {
    protocol_manifest_path: artifacts.protocol_manifest_path,
    batch_report_path: artifacts.batch_report_path,
    condition_summary_path: artifacts.condition_summary_path,
    comparison_report_path: artifacts.comparison_report_path,
    protocol_check_path: artifacts.protocol_check_path,
    metrics_check_path: artifacts.metrics_check_path,
    comparisons_check_path: artifacts.comparisons_check_path
  };
  const campaignArtifacts = {
    campaign_plan_path: artifacts.campaign_plan_path,
    campaign_readout_path: artifacts.campaign_readout_path,
    campaign_pointer_path: artifacts.campaign_pointer_path,
    campaign_audit_path: artifacts.campaign_audit_path
  };
  return {
    docs,
    artifacts,
    docs_present: Object.values(docs).every((file) => exists(file)),
    artifacts_present: Object.values(coreArtifacts).every((file) => exists(file)),
    campaign_artifacts_present: Object.values(campaignArtifacts).every((file) => exists(file)),
    protocol_manifest: exists(artifacts.protocol_manifest_path) ? readJson(artifacts.protocol_manifest_path) : null,
    batch_report: exists(artifacts.batch_report_path) ? readJson(artifacts.batch_report_path) : null,
    protocol_check: exists(artifacts.protocol_check_path) ? readJson(artifacts.protocol_check_path) : null,
    metrics_check: exists(artifacts.metrics_check_path) ? readJson(artifacts.metrics_check_path) : null,
    comparisons_check: exists(artifacts.comparisons_check_path) ? readJson(artifacts.comparisons_check_path) : null,
    campaign_plan: exists(artifacts.campaign_plan_path) ? readJson(artifacts.campaign_plan_path) : null,
    campaign_readout: exists(artifacts.campaign_readout_path) ? readJson(artifacts.campaign_readout_path) : null,
    campaign_pointer: exists(artifacts.campaign_pointer_path) ? readJson(artifacts.campaign_pointer_path) : null,
    campaign_audit: exists(campaignArtifacts.campaign_audit_path) ? readJson(campaignArtifacts.campaign_audit_path) : null
  };
};

const portabilityMatches = (files) => {
  const matches = [];
  for (const file of files) {
    if (!exists(file)) continue;
    if (LOCAL_PATH_PATTERN.test(readText(file))) {
      matches.push(normalize(path.relative(SYSTEM_ROOT, file)));
    }
  }
  return matches;
};

const buildGapRegister = (model) => {
  const gaps = [];
  const provenanceNotes = [];
  if (!model.system.state.clean) {
    gaps.push({
      id: 'system.repo_not_clean',
      classification: 'blocking_gap',
      impact: 'Blocks internal ecosystem release candidate because QICN-SYSTEM is not clean.',
      affects_internal_release_candidate: true,
      affects_future_claim_facing_phase: true,
      evidence: `QICN-SYSTEM branch ${model.system.state.branch} is not clean.`,
      closure_requirement: 'Clean the operational repo before re-baselining.'
    });
  }
  if (!model.system.state.pushed) {
    gaps.push({
      id: 'system.repo_not_pushed',
      classification: 'blocking_gap',
      impact: 'Blocks internal ecosystem release candidate because QICN-SYSTEM is not synchronized with upstream.',
      affects_internal_release_candidate: true,
      affects_future_claim_facing_phase: true,
      evidence: `QICN-SYSTEM HEAD ${model.system.state.head} differs from upstream ${model.system.state.upstream_head || 'UNVERIFIED'}.`,
      closure_requirement: 'Push the operational baseline or mark it as intentionally local-only.'
    });
  }
  if (!model.release.state.clean) {
    gaps.push({
      id: 'release.repo_not_clean',
      classification: 'blocking_gap',
      impact: 'Blocks internal ecosystem release candidate because QICN-RELEASE is not clean.',
      affects_internal_release_candidate: true,
      affects_future_claim_facing_phase: true,
      evidence: `QICN-RELEASE branch ${model.release.state.branch} is not clean.`,
      closure_requirement: 'Clean the canonical repo before re-baselining.'
    });
  }
  if (!model.release.state.pushed) {
    gaps.push({
      id: 'release.repo_not_pushed',
      classification: 'blocking_gap',
      impact: 'Blocks internal ecosystem release candidate because QICN-RELEASE is not synchronized with upstream.',
      affects_internal_release_candidate: true,
      affects_future_claim_facing_phase: true,
      evidence: `QICN-RELEASE HEAD ${model.release.state.head} differs from upstream ${model.release.state.upstream_head || 'UNVERIFIED'}.`,
      closure_requirement: 'Push the canonical baseline or mark it as intentionally local-only.'
    });
  }
  if (model.release.freeze_manifest.pin_status.upstream_pin_status !== 'resolved') {
    gaps.push({
      id: 'release.upstream_pin_partially_resolved',
      classification: 'unresolved_upstream_reference',
      impact: 'Does not block an internal release candidate, but prevents calling the canonical pin fully resolved upstream.',
      affects_internal_release_candidate: false,
      affects_future_claim_facing_phase: true,
      evidence: model.release.freeze_manifest.pin_status.remaining_gap,
      closure_requirement: model.release.freeze_manifest.pin_status.full_resolution_requirement
    });
  }
  if (Array.isArray(model.release.integrity_check.warnings)
    && model.release.integrity_check.warnings.includes('working_tree_not_clean_at_hardening_start')) {
    gaps.push({
      id: 'release.historical_dirty_start',
      classification: 'documented_warning',
      impact: 'Historical provenance warning only. The repo is currently clean.',
      affects_internal_release_candidate: false,
      affects_future_claim_facing_phase: false,
      evidence: 'canonical_integrity_check.json warning: working_tree_not_clean_at_hardening_start',
      closure_requirement: 'Retain as provenance warning; no corrective action required for the current baseline.'
    });
  }
  if (Array.isArray(model.release.integrity_check.provenance_notes)
    && model.release.integrity_check.provenance_notes.includes('working_tree_not_clean_at_hardening_start')) {
    provenanceNotes.push({
      id: 'release.historical_dirty_start',
      class: 'provenance_note',
      impact: 'Historical repo state at hardening start only; not an active operational warning.',
      evidence: 'canonical_integrity_check.json provenance_notes includes working_tree_not_clean_at_hardening_start'
    });
  }
  const portability = portabilityMatches(model.portability_targets);
  if (portability.length > 0) {
    gaps.push({
      id: 'ecosystem.portability_local_paths_present',
      classification: 'blocking_gap',
      impact: 'Critical ecosystem docs or manifests contain local absolute paths.',
      affects_internal_release_candidate: true,
      affects_future_claim_facing_phase: true,
      evidence: portability.join(', '),
      closure_requirement: 'Replace local paths with repo-relative or neutral references.'
    });
  }
  if (!model.evaluation.docs_present) {
    gaps.push({
      id: 'system.evaluation_phase_docs_missing',
      classification: 'blocking_gap',
      impact: 'Protocolized evaluation docs/manifests are missing from QICN-SYSTEM.',
      affects_internal_release_candidate: true,
      affects_future_claim_facing_phase: true,
      evidence: 'One or more evaluation-phase source-of-truth docs/json files are missing.',
      closure_requirement: 'Restore protocol, comparison, metrics, controls, statistical policy, and interpretation-boundary docs.'
    });
  }
  if (!model.evaluation.artifacts_present) {
    gaps.push({
      id: 'system.evaluation_phase_artifacts_missing',
      classification: 'blocking_gap',
      impact: 'Protocolized evaluation baseline artifacts/checks are missing from QICN-SYSTEM.',
      affects_internal_release_candidate: true,
      affects_future_claim_facing_phase: false,
      evidence: 'One or more latest evaluation manifests/check artifacts are missing under artifacts/protocolized_evaluation/.',
      closure_requirement: 'Run the protocolized evaluation batch and its verifiers.'
    });
  }
  const evaluationStatuses = [
    model.evaluation.protocol_check?.status,
    model.evaluation.metrics_check?.status,
    model.evaluation.comparisons_check?.status,
    model.evaluation.batch_report?.status
  ].filter(Boolean);
  if (evaluationStatuses.some((status) => status === 'FAIL')) {
    gaps.push({
      id: 'system.evaluation_phase_failed',
      classification: 'blocking_gap',
      impact: 'Protocolized evaluation is part of the frozen internal ecosystem and currently fails.',
      affects_internal_release_candidate: true,
      affects_future_claim_facing_phase: true,
      evidence: evaluationStatuses.join(', '),
      closure_requirement: 'Repair the evaluation phase until protocol, metrics, comparisons, and batch status are non-failing.'
    });
  }
  if (evaluationStatuses.some((status) => status === 'PASS_WITH_WARNINGS')) {
    gaps.push({
      id: 'system.evaluation_phase_has_warnings',
      classification: 'documented_warning',
      impact: 'Protocolized evaluation remains usable but not cleanly PASS.',
      affects_internal_release_candidate: false,
      affects_future_claim_facing_phase: true,
      evidence: evaluationStatuses.join(', '),
      closure_requirement: 'Resolve evaluation-phase warnings or keep them explicit.'
    });
  }
  return {
    artifact_role: 'ecosystem_gap_register',
    schema_version: '1.0.0',
    generated_at: new Date().toISOString(),
    overall_blocking_gap_count: gaps.filter((gap) => gap.classification === 'blocking_gap').length,
    overall_warning_count: gaps.filter((gap) => gap.classification !== 'blocking_gap').length,
    provenance_note_count: provenanceNotes.length,
    gaps,
    provenance_notes: provenanceNotes
  };
};

const evaluateEcosystem = () => {
  const system = loadSystemBaseline();
  const release = loadReleaseBaseline();
  const interfaceContract = loadInterfaceContract();
  const candidateGovernance = loadCandidateGovernance();
  const freezeDocs = loadFreezeDocs();
  const evaluation = loadEvaluationPhase();
  const portabilityTargets = [
    path.join(SYSTEM_ROOT, 'docs', 'ECOSYSTEM_BASELINE.md'),
    path.join(SYSTEM_ROOT, 'docs', 'ECOSYSTEM_INTERFACE_CONTRACT.md'),
    path.join(SYSTEM_ROOT, 'docs', 'ECOSYSTEM_CANDIDATE_GOVERNANCE.md'),
    freezeDocs.baseline_doc_path,
    freezeDocs.release_notes_doc_path,
    freezeDocs.maintenance_checklist_path,
    evaluation.docs.protocol_doc_path,
    evaluation.docs.comparison_doc_path,
    evaluation.docs.metrics_doc_path,
    evaluation.docs.controls_doc_path,
    evaluation.docs.stats_doc_path,
    evaluation.docs.boundary_doc_path,
    evaluation.docs.freeze_doc_path,
    evaluation.docs.execution_campaign_freeze_doc_path,
    evaluation.docs.successive_campaign_discipline_doc_path,
    evaluation.docs.protocol_json_path,
    evaluation.docs.comparison_json_path,
    evaluation.docs.metrics_json_path,
    evaluation.docs.controls_json_path,
    evaluation.docs.stats_json_path,
    evaluation.docs.freeze_json_path,
    evaluation.docs.execution_campaign_freeze_json_path,
    evaluation.docs.successive_campaign_discipline_json_path,
    evaluation.artifacts.protocol_manifest_path,
    evaluation.artifacts.batch_report_path,
    evaluation.artifacts.condition_summary_path,
    evaluation.artifacts.comparison_report_path,
    evaluation.artifacts.protocol_check_path,
    evaluation.artifacts.metrics_check_path,
    evaluation.artifacts.comparisons_check_path,
    evaluation.artifacts.campaign_plan_path,
    evaluation.artifacts.campaign_readout_path,
    evaluation.artifacts.campaign_pointer_path,
    evaluation.artifacts.campaign_audit_path,
    path.join(SYSTEM_ROOT, 'docs', 'ecosystem_interface_contract.v1.json'),
    path.join(SYSTEM_ROOT, 'docs', 'ecosystem_candidate_governance.v1.json'),
    path.join(SYSTEM_ROOT, 'docs', 'OPERATIONAL_READINESS.md'),
    path.join(RELEASE_ROOT, 'docs', 'CANON_SOURCE_OF_TRUTH.md'),
    path.join(RELEASE_ROOT, 'docs', 'THEORY_SYSTEM_INTERFACE.md'),
    path.join(RELEASE_ROOT, 'release', 'release_freeze_manifest.json')
  ];
  const model = {
    checked_at: new Date().toISOString(),
    system,
    release,
    interfaceContract,
    candidateGovernance,
    freezeDocs,
    evaluation,
    portability_targets: portabilityTargets
  };

  const checks = [];
  const addCheck = (id, status, details) => checks.push({ id, status, details });

  addCheck('system_repo_state', system.state.clean && system.state.pushed ? 'PASS' : 'FAIL', {
    branch: system.state.branch,
    head: system.state.head,
    clean: system.state.clean,
    pushed: system.state.pushed,
    upstream: system.state.upstream
  });
  addCheck('system_operational_readiness', system.readiness.missing_canonical_scripts.length === 0
    && system.readiness.docs_missing.length === 0
    && system.readiness.scripts_missing.length === 0
    && system.readiness.entrypoints_missing.length === 0 ? 'PASS' : 'FAIL', {
    manifest: normalize(path.relative(SYSTEM_ROOT, system.readiness_path)),
    missing_canonical_scripts: system.readiness.missing_canonical_scripts,
    docs_missing: system.readiness.docs_missing,
    scripts_missing: system.readiness.scripts_missing,
    entrypoints_missing: system.readiness.entrypoints_missing
  });
  addCheck('system_artifact_governance', system.artifact_manifest.missing_required_files.length === 0 ? 'PASS' : 'FAIL', {
    manifest: normalize(path.relative(SYSTEM_ROOT, system.artifact_manifest_path)),
    blocked_local_report_artifact: system.artifact_manifest.output_checks['condition_comparison.json'].local_report_decision.reason_code
  });
  addCheck('system_operational_smoke', Array.isArray(system.smoke_manifest.steps)
    && system.smoke_manifest.steps.every((step) => step.ok) ? 'PASS' : 'FAIL', {
    manifest: normalize(path.relative(SYSTEM_ROOT, system.smoke_manifest_path)),
    step_count: system.smoke_manifest.step_count
  });
  addCheck('system_internal_bundle', Boolean(system.bundle_manifest)
    && Array.isArray(system.bundle_manifest.excluded_outputs)
    && system.bundle_manifest.excluded_outputs.some((item) => item.artifact === 'condition_comparison.json')
    ? 'PASS' : 'FAIL', {
    manifest: system.bundle_manifest_path ? normalize(path.relative(SYSTEM_ROOT, system.bundle_manifest_path)) : null,
    git_commit: system.bundle_manifest ? system.bundle_manifest.git.commit : null
  });

  addCheck('release_repo_state', release.state.clean && release.state.pushed ? 'PASS' : 'FAIL', {
    branch: release.state.branch,
    head: release.state.head,
    clean: release.state.clean,
    pushed: release.state.pushed,
    upstream: release.state.upstream
  });
  addCheck('release_canonical_integrity', ['PASS', 'PASS_WITH_WARNINGS'].includes(release.integrity_check.status)
    && release.integrity_check.checks.non_canonical_material_physically_separated
    ? (release.integrity_check.status === 'PASS_WITH_WARNINGS' ? 'PASS_WITH_WARNINGS' : 'PASS')
    : 'FAIL', {
    manifest: normalize(path.relative(RELEASE_ROOT, release.integrity_check_path)),
    status: release.integrity_check.status,
    warnings: release.integrity_check.warnings
  });
  addCheck('release_claim_registry', release.claim_registry.entries.length > 0 ? 'PASS' : 'FAIL', {
    registry: normalize(path.relative(RELEASE_ROOT, release.claim_registry_path)),
    entries: release.claim_registry.entries.length,
    family_level_subsets_retained: release.claim_registry.registry_scope.family_level_subsets_retained
  });
  addCheck('release_canonical_bundle', release.release_check.status === 'PASS'
    && Boolean(release.bundle_manifest)
    && Boolean(release.bundle_manifest.bundle_categories)
    ? 'PASS' : 'FAIL', {
    check: normalize(path.relative(RELEASE_ROOT, release.release_check_path)),
    manifest: release.bundle_manifest_path ? normalize(path.relative(RELEASE_ROOT, release.bundle_manifest_path)) : null
  });
  addCheck('ecosystem_interface_contract', interfaceContract.doc_present
    && interfaceContract.json_present
    && Array.isArray(interfaceContract.json.prohibited_inferences)
    && interfaceContract.json.prohibited_inferences.length >= 5 ? 'PASS' : 'FAIL', {
    doc_path: normalize(path.relative(SYSTEM_ROOT, interfaceContract.doc_path)),
    json_path: normalize(path.relative(SYSTEM_ROOT, interfaceContract.json_path))
  });
  addCheck('ecosystem_candidate_governance', candidateGovernance.doc_present
    && candidateGovernance.json_present
    && Array.isArray(candidateGovernance.json.invalidates_candidate)
    && Array.isArray(candidateGovernance.json.requires_verifier_rerun)
    && Array.isArray(candidateGovernance.json.requires_explicit_human_review)
    && Array.isArray(candidateGovernance.json.allowed_non_material_change)
    && candidateGovernance.json.invalidates_candidate.length >= 5 ? 'PASS' : 'FAIL', {
    doc_path: normalize(path.relative(SYSTEM_ROOT, candidateGovernance.doc_path)),
    json_path: normalize(path.relative(SYSTEM_ROOT, candidateGovernance.json_path))
  });
  addCheck('ecosystem_freeze_docs', [
    freezeDocs.baseline_doc_path,
    freezeDocs.release_notes_doc_path,
    freezeDocs.maintenance_checklist_path
  ].every((file) => exists(file)) ? 'PASS' : 'FAIL', {
    baseline_doc_path: normalize(path.relative(SYSTEM_ROOT, freezeDocs.baseline_doc_path)),
    release_notes_doc_path: normalize(path.relative(SYSTEM_ROOT, freezeDocs.release_notes_doc_path)),
    maintenance_checklist_path: normalize(path.relative(SYSTEM_ROOT, freezeDocs.maintenance_checklist_path))
  });
  const evaluationCheckStatuses = [
    evaluation.protocol_check?.status,
    evaluation.metrics_check?.status,
    evaluation.comparisons_check?.status,
    evaluation.batch_report?.status
  ].filter(Boolean);
  const evaluationFailed = !evaluation.docs_present
    || !evaluation.artifacts_present
    || evaluationCheckStatuses.some((status) => status === 'FAIL');
  const evaluationWarned = evaluationCheckStatuses.some((status) => status === 'PASS_WITH_WARNINGS');
  addCheck('system_protocolized_evaluation_phase', evaluationFailed
    ? 'FAIL'
    : (evaluationWarned ? 'PASS_WITH_WARNINGS' : 'PASS'), {
    docs_present: evaluation.docs_present,
    artifacts_present: evaluation.artifacts_present,
    campaign_artifacts_present: evaluation.campaign_artifacts_present,
    protocol_manifest: exists(evaluation.artifacts.protocol_manifest_path)
      ? normalize(path.relative(SYSTEM_ROOT, evaluation.artifacts.protocol_manifest_path))
      : null,
    batch_report: exists(evaluation.artifacts.batch_report_path)
      ? normalize(path.relative(SYSTEM_ROOT, evaluation.artifacts.batch_report_path))
      : null,
    check_statuses: evaluationCheckStatuses
  });

  const portability = portabilityMatches(portabilityTargets);
  addCheck('ecosystem_portability_targets', portability.length === 0 ? 'PASS' : 'FAIL', {
    scanned_files: portabilityTargets.map((file) => normalize(path.relative(SYSTEM_ROOT, file))),
    matches: portability
  });

  const gapRegister = buildGapRegister(model);
  const hasFailure = checks.some((check) => check.status === 'FAIL') || gapRegister.overall_blocking_gap_count > 0;
  const hasWarnings = checks.some((check) => check.status === 'PASS_WITH_WARNINGS') || gapRegister.overall_warning_count > 0;
  const status = hasFailure ? 'FAIL' : hasWarnings ? 'PASS_WITH_WARNINGS' : 'PASS';

  return {
    model,
    gapRegister,
    verificationMatrix: {
      artifact_role: 'ecosystem_verification_matrix',
      schema_version: '1.0.0',
      checked_at: model.checked_at,
      status,
      checks,
      system_baseline: {
        branch: system.state.branch,
        head: system.state.head,
        upstream: system.state.upstream,
        release_bundle_manifest: system.bundle_manifest_path ? normalize(path.relative(SYSTEM_ROOT, system.bundle_manifest_path)) : null,
        evaluation_protocol_manifest: exists(evaluation.artifacts.protocol_manifest_path)
          ? normalize(path.relative(SYSTEM_ROOT, evaluation.artifacts.protocol_manifest_path))
          : null,
        evaluation_batch_report: exists(evaluation.artifacts.batch_report_path)
          ? normalize(path.relative(SYSTEM_ROOT, evaluation.artifacts.batch_report_path))
          : null
      },
      release_baseline: {
        branch: release.state.branch,
        head: release.state.head,
        upstream: release.state.upstream,
        freeze_tag: release.freeze_manifest.freeze_reference.local_tag,
        freeze_commit: release.freeze_manifest.freeze_reference.local_tag_commit,
        upstream_pin_status: release.freeze_manifest.pin_status.upstream_pin_status,
        canonical_bundle_manifest: release.bundle_manifest_path ? normalize(path.relative(RELEASE_ROOT, release.bundle_manifest_path)) : null
      },
      interpretation_boundary: 'Cross-repo verification matrix only; internal ecosystem readiness evidence, not external validation, not theory confirmation.',
      warnings: gapRegister.gaps.filter((gap) => gap.classification !== 'blocking_gap').map((gap) => gap.id),
      failures: gapRegister.gaps.filter((gap) => gap.classification === 'blocking_gap').map((gap) => gap.id),
      provenance_notes: gapRegister.provenance_notes.map((note) => note.id)
    }
  };
};

module.exports = {
  SYSTEM_ROOT,
  RELEASE_ROOT,
  ECOSYSTEM_ARTIFACT_ROOT,
  normalize,
  ensureDir,
  writeJson,
  copyFile,
  evaluateEcosystem
};

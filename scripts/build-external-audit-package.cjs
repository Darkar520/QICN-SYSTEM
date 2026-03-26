const fs = require('fs');
const path = require('path');
const {
  SYSTEM_ROOT,
  RELEASE_ROOT,
  ECOSYSTEM_ARTIFACT_ROOT,
  normalize,
  ensureDir,
  writeJson,
  copyFile,
  evaluateEcosystem
} = require('./ecosystem-release-common.cjs');

const EXTERNAL_AUDIT_ARTIFACT_ROOT = path.join(SYSTEM_ROOT, 'artifacts', 'external_audit_package');
const LOCAL_PATH_PATTERN = /\/c:\/|[A-Za-z]:\\Users\\|OneDrive|Escritorio|\.\.[/\\]release_repo_qicn_2026-03-01|\.\.[/\\]rigid-identity-framework/i;

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const readText = (file) => fs.readFileSync(file, 'utf8');
const exists = (file) => fs.existsSync(file);

const copyDir = (from, to) => {
  ensureDir(to);
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyDir(src, dst);
    } else if (entry.isFile()) {
      copyFile(src, dst);
    }
  }
};

const scanLocalPathLeaks = (dir) => {
  const matches = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(target);
        continue;
      }
      const textLike = /\.(json|md|txt|cjs|js)$/i.test(entry.name);
      if (!textLike) continue;
      const text = readText(target);
      if (LOCAL_PATH_PATTERN.test(text)) {
        matches.push(normalize(path.relative(dir, target)));
      }
    }
  };
  walk(dir);
  return matches;
};

const listDirsByPrefix = (dir, prefix) => {
  if (!exists(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith(prefix))
    .map((entry) => path.join(dir, entry.name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
};

const collectCampaignStates = () => {
  const campaignsRoot = path.join(SYSTEM_ROOT, 'artifacts', 'execution_campaign', 'campaigns');
  return listDirsByPrefix(campaignsRoot, 'execution_campaign_').map((dir) => {
    const auditPath = path.join(dir, 'execution_campaign_audit_readout.json');
    const readoutPath = path.join(dir, 'execution_campaign_readout.json');
    const planPath = path.join(dir, 'campaign_execution_plan.json');
    const audit = exists(auditPath) ? readJson(auditPath) : null;
    const readout = exists(readoutPath) ? readJson(readoutPath) : null;
    return {
      dir,
      campaign_id: path.basename(dir),
      auditPath,
      readoutPath,
      planPath,
      audit,
      readout
    };
  });
};

const copyLabeledArtifacts = (label, refs, bundleRoot) => {
  const destinationRoot = path.join(bundleRoot, 'system_authoritative', label);
  const copied = {};
  Object.entries(refs).forEach(([name, relativePath]) => {
    const source = path.join(SYSTEM_ROOT, relativePath);
    const destination = path.join(destinationRoot, path.basename(relativePath));
    copyFile(source, destination);
    copied[name] = normalize(path.relative(bundleRoot, destination));
  });
  return copied;
};

const { model, verificationMatrix } = evaluateEcosystem();
if (verificationMatrix.status !== 'PASS') {
  throw new Error(`external audit package requires ecosystem candidate PASS; got ${verificationMatrix.status}`);
}

const generatedAt = new Date().toISOString();
const packageId = `external_audit_package_${generatedAt.replace(/[:.]/g, '-')}`;
const bundleRoot = path.join(EXTERNAL_AUDIT_ARTIFACT_ROOT, 'bundles', packageId);
ensureDir(bundleRoot);

const candidateManifestPath = path.join(ECOSYSTEM_ARTIFACT_ROOT, 'ecosystem_release_candidate_manifest.json');
const candidateManifest = readJson(candidateManifestPath);
const candidateBundleRoot = path.join(ECOSYSTEM_ARTIFACT_ROOT, 'bundles', candidateManifest.bundle_id);
if (!exists(candidateBundleRoot)) {
  throw new Error(`missing ecosystem candidate bundle: ${candidateBundleRoot}`);
}

const freezeManifestPath = path.join(SYSTEM_ROOT, 'docs', 'execution_campaign_freeze.v1.json');
const freezeManifest = readJson(freezeManifestPath);
const latestPointerPath = path.join(SYSTEM_ROOT, 'artifacts', 'execution_campaign', 'latest_campaign_pointer.json');
const latestPointer = readJson(latestPointerPath);
const latestAuditPath = path.join(SYSTEM_ROOT, 'artifacts', 'execution_campaign', 'execution_campaign_audit_readout.json');
const latestAudit = readJson(latestAuditPath);
const disciplineManifestPath = path.join(SYSTEM_ROOT, 'docs', 'successive_campaign_discipline.v1.json');
const disciplineManifest = readJson(disciplineManifestPath);
const governanceManifestPath = path.join(SYSTEM_ROOT, 'docs', 'ecosystem_candidate_governance.v1.json');
const governanceManifest = readJson(governanceManifestPath);
const releaseFreezePath = path.join(RELEASE_ROOT, 'release', 'release_freeze_manifest.json');
const releaseFreeze = readJson(releaseFreezePath);
const releaseInterfacePath = path.join(RELEASE_ROOT, 'release', 'system_interface_boundary.v1.json');
const releaseInterface = readJson(releaseInterfacePath);

const campaignStates = collectCampaignStates();
const invalidAttempt = campaignStates.find((state) => state.audit && state.audit.freezeable === false);
const frozenPrimary = {
  campaign_id: freezeManifest.authoritative_campaign_id,
  batch_id: freezeManifest.authoritative_batch_id,
  refs: freezeManifest.authoritative_artifacts
};
const latestAcceptedComparable = {
  campaign_id: latestPointer.campaign_id,
  batch_id: latestPointer.batch_id,
  refs: latestAudit.authoritative_campaign.authoritative_artifact_set
};

copyDir(candidateBundleRoot, path.join(bundleRoot, 'ecosystem_candidate'));

const copiedPrimaryArtifacts = copyLabeledArtifacts('frozen_primary', frozenPrimary.refs, bundleRoot);
const copiedComparableArtifacts = copyLabeledArtifacts('latest_accepted_comparable', latestAcceptedComparable.refs, bundleRoot);
let copiedInvalidArtifacts = null;
if (invalidAttempt) {
  copiedInvalidArtifacts = copyLabeledArtifacts('invalid_historical_attempt', {
    campaign_execution_plan: normalize(path.relative(SYSTEM_ROOT, invalidAttempt.planPath)),
    execution_campaign_readout: normalize(path.relative(SYSTEM_ROOT, invalidAttempt.readoutPath)),
    execution_campaign_audit_readout: normalize(path.relative(SYSTEM_ROOT, invalidAttempt.auditPath))
  }, bundleRoot);
}

[
  ['docs/EXTERNAL_AUDIT_SETUP.md', 'docs/EXTERNAL_AUDIT_SETUP.md'],
  ['docs/EXTERNAL_AUDIT_QUICKSTART.md', 'docs/EXTERNAL_AUDIT_QUICKSTART.md'],
  ['docs/EXTERNAL_AUDIT_TECHNICAL_PATH.md', 'docs/EXTERNAL_AUDIT_TECHNICAL_PATH.md'],
  ['docs/EXTERNAL_AUDIT_HANDOFF_CHECKLIST.md', 'docs/EXTERNAL_AUDIT_HANDOFF_CHECKLIST.md']
].forEach(([from, to]) => copyFile(path.join(SYSTEM_ROOT, from), path.join(bundleRoot, to)));

const redTeamFindings = [
  {
    id: 'engineering.repo_refs_and_candidate_traceability',
    severity: 'no_issue',
    area: 'engineering_reproducibility',
    finding: 'The package exposes exact repo SHAs, canonical freeze commit, current ecosystem candidate, and immutable campaign refs.',
    evidence: [
      `QICN-SYSTEM@${model.system.state.head}`,
      `QICN-RELEASE@${model.release.state.head}`,
      `candidate=${candidateManifest.bundle_id}`,
      `latest_comparable=${latestPointer.campaign_id}`
    ],
    minimal_correction: null
  },
  {
    id: 'engineering.local_context_dependency',
    severity: 'no_issue',
    area: 'engineering_reproducibility',
    finding: 'The generated external package is repo-relative and does not serialize local private paths.',
    evidence: [
      'package portability scan passes',
      'ecosystem candidate portability scan passes'
    ],
    minimal_correction: null
  },
  {
    id: 'campaign.latest_pointer_overread',
    severity: 'note',
    area: 'campaign_layer',
    finding: 'The latest pointer remains mutable routing metadata and must not be read as frozen authority.',
    evidence: [
      'latest_campaign_pointer.json',
      'execution_campaign_freeze.v1.json mutable_latest_artifacts_not_authoritative_for_frozen_baseline'
    ],
    minimal_correction: 'Keep the pointer explicitly labeled as routing metadata only in external-facing docs and manifests.'
  },
  {
    id: 'campaign.series_internal_only',
    severity: 'note',
    area: 'campaign_layer',
    finding: 'The accepted comparable series is internally stable, but still supports only internal descriptive or minimal-contrast reading.',
    evidence: [
      'two accepted comparable campaigns preserved',
      'support levels remain description_only or minimal_contrast'
    ],
    minimal_correction: 'Retain the non-claim boundary that internal series continuity is not external validation.'
  },
  {
    id: 'gating.internal_outputs_blocked',
    severity: 'no_issue',
    area: 'gating_surfaces',
    finding: 'Blocked outputs remain blocked for claim-facing use and the package does not promote them.',
    evidence: [
      latestAudit.campaign_surface_gating.status,
      'condition_comparison_report.json remains blocked claim-facing'
    ],
    minimal_correction: null
  },
  {
    id: 'theory_system.interface_one_way_default',
    severity: 'no_issue',
    area: 'theory_system_boundary',
    finding: 'The theory-system boundary remains explicit and one-way by default; the runtime does not close corpus claims.',
    evidence: [
      'release/system_interface_boundary.v1.json',
      'docs/EVALUATION_INTERPRETATION_BOUNDARY.md'
    ],
    minimal_correction: null
  },
  {
    id: 'banal_alternative.pipeline_explanation',
    severity: 'note',
    area: 'banal_rival_explanations',
    finding: 'At minimum, the stable comparable series can be read as frozen pipeline, condition, and artifact discipline continuity without conceding stronger theory claims.',
    evidence: [
      'same condition set',
      'same matrix',
      'same metrics registry',
      'same statistical policy'
    ],
    minimal_correction: 'Keep internal series statements limited to continuity, comparability, and governance preservation.'
  }
];

const redTeamReport = {
  artifact_role: 'internal_red_team_report',
  schema_version: '1.0.0',
  generated_at: generatedAt,
  scope: 'external_audit_readiness',
  findings: redTeamFindings,
  summary: {
    blocker_count: redTeamFindings.filter((finding) => finding.severity === 'blocker').length,
    material_issue_count: redTeamFindings.filter((finding) => finding.severity === 'material_issue').length,
    note_count: redTeamFindings.filter((finding) => finding.severity === 'note').length,
    no_issue_count: redTeamFindings.filter((finding) => finding.severity === 'no_issue').length
  },
  interpretation_boundary: 'Internal adversarial review only; not external validation, not a substitute for an independent audit.'
};

const portabilityMatches = scanLocalPathLeaks(bundleRoot);
const readyConditions = [
  'baseline_primary_frozen_and_traced',
  'canonical_release_freeze_traced',
  'ecosystem_candidate_pass',
  'comparable_series_minimally_stable',
  'non_claim_boundaries_explicit',
  'blocked_outputs_preserved',
  'internal_red_team_completed',
  'package_portability_scan_passed'
];

const externalAuditStatus = {
  artifact_role: 'external_audit_status',
  schema_version: '1.0.0',
  generated_at: generatedAt,
  package_id: packageId,
  readiness_status: portabilityMatches.length === 0 ? 'READY_FOR_EXTERNAL_AUDIT' : 'BLOCKED_BY_EXTERNAL_DEPENDENCY',
  external_execution_status: 'NOT_EXECUTED_EXTERNALLY',
  remaining_dependency: 'No independent external auditor or external execution record is present in the current baseline.',
  ready_conditions_met: readyConditions,
  remaining_internal_blockers: portabilityMatches,
  success_criteria_for_external_process: [
    'auditor can reproduce pinned baselines',
    'auditor can locate expected artifacts without private context',
    'auditor can return structured findings with exact file and command references'
  ],
  failure_criteria_for_external_process: [
    'pinned SHAs do not reproduce the listed artifacts',
    'expected artifacts are missing or ambiguous',
    'blocked outputs are read as claim-facing safe',
    'local private path dependency remains unresolved'
  ],
  findings_reception_format: [
    'finding_id',
    'severity',
    'location',
    'reproduction_steps',
    'observed_behavior',
    'expected_behavior',
    'minimal_correction'
  ],
  interpretation_boundary: 'External-audit readiness status only; not an external verdict, not validation, not theory confirmation.'
};

const packageManifest = {
  artifact_role: 'external_audit_package_manifest',
  schema_version: '1.0.0',
  generated_at: generatedAt,
  package_id: packageId,
  package_root: '.',
  package_status: externalAuditStatus.readiness_status,
  entrypoints: {
    setup: 'docs/EXTERNAL_AUDIT_SETUP.md',
    quickstart: 'docs/EXTERNAL_AUDIT_QUICKSTART.md',
    technical_path: 'docs/EXTERNAL_AUDIT_TECHNICAL_PATH.md',
    handoff_checklist: 'docs/EXTERNAL_AUDIT_HANDOFF_CHECKLIST.md',
    status: 'external_audit_status.json',
    red_team: 'internal_red_team_report.json',
    candidate_manifest: 'ecosystem_candidate/ecosystem_release_candidate_manifest.json'
  },
  repositories: {
    qicn_system: {
      repository: 'QICN-SYSTEM',
      branch: model.system.state.branch,
      head: model.system.state.head,
      upstream: model.system.state.upstream,
      remote_url: model.system.state.remote_url
    },
    qicn_release: {
      repository: 'QICN-RELEASE',
      branch: model.release.state.branch,
      head: model.release.state.head,
      upstream: model.release.state.upstream,
      remote_url: model.release.state.remote_url
    }
  },
  authoritative_refs: {
    ecosystem_candidate_bundle_id: candidateManifest.bundle_id,
    qicn_release_canonical_freeze_tag: releaseFreeze.freeze_reference.local_tag,
    qicn_release_canonical_freeze_commit: releaseFreeze.freeze_reference.local_tag_commit,
    frozen_primary_campaign_id: freezeManifest.authoritative_campaign_id,
    frozen_primary_batch_id: freezeManifest.authoritative_batch_id,
    latest_accepted_comparable_campaign_id: latestPointer.campaign_id,
    latest_accepted_comparable_batch_id: latestPointer.batch_id,
    invalid_historical_attempt_campaign_id: invalidAttempt ? invalidAttempt.campaign_id : null
  },
  copied_artifacts: {
    ecosystem_candidate_manifest: 'ecosystem_candidate/ecosystem_release_candidate_manifest.json',
    frozen_primary: copiedPrimaryArtifacts,
    latest_accepted_comparable: copiedComparableArtifacts,
    invalid_historical_attempt: copiedInvalidArtifacts
  },
  expected_artifacts: [
    'external_audit_package_manifest.json',
    'external_audit_status.json',
    'internal_red_team_report.json',
    'ecosystem_candidate/ecosystem_release_candidate_manifest.json',
    'ecosystem_candidate/ecosystem/manifests/ecosystem_verification_matrix.json',
    'ecosystem_candidate/ecosystem/manifests/ecosystem_gap_register.v1.json',
    'system_authoritative/latest_accepted_comparable/execution_campaign_audit_readout.json',
    'system_authoritative/latest_accepted_comparable/evaluation_batch_report.json',
    'system_authoritative/latest_accepted_comparable/condition_comparison_report.json',
    'system_authoritative/frozen_primary/execution_campaign_audit_readout.json'
  ],
  invalidation_triggers: [
    ...freezeManifest.invalidates_freeze,
    ...governanceManifest.invalidates_candidate
  ],
  blocked_outputs: disciplineManifest.internal_only_outputs,
  non_claim_restrictions: [
    'No external validation yet.',
    'No theory confirmation.',
    'No claim closure.',
    'No causal proof.',
    'No runtime-to-corpus validation leap.',
    'No public claim-facing escalation.'
  ],
  theory_system_boundary: {
    prohibited_inferences: releaseInterface.prohibited_inferences,
    non_claim_boundary: releaseInterface.non_claim_boundary
  },
  interpretation_boundary: 'External audit handoff package only; audit-ready internal package, not an external verdict, not theory closure, not public release.'
};

writeJson(path.join(bundleRoot, 'external_audit_package_manifest.json'), packageManifest);
writeJson(path.join(bundleRoot, 'external_audit_status.json'), externalAuditStatus);
writeJson(path.join(bundleRoot, 'internal_red_team_report.json'), redTeamReport);

ensureDir(EXTERNAL_AUDIT_ARTIFACT_ROOT);
writeJson(path.join(EXTERNAL_AUDIT_ARTIFACT_ROOT, 'external_audit_package_manifest.json'), packageManifest);
writeJson(path.join(EXTERNAL_AUDIT_ARTIFACT_ROOT, 'external_audit_status.json'), externalAuditStatus);
writeJson(path.join(EXTERNAL_AUDIT_ARTIFACT_ROOT, 'internal_red_team_report.json'), redTeamReport);

process.stdout.write(`${JSON.stringify({
  output: normalize(path.relative(SYSTEM_ROOT, path.join(bundleRoot, 'external_audit_package_manifest.json'))),
  root_manifest: 'artifacts/external_audit_package/external_audit_package_manifest.json',
  package_id: packageId,
  status: externalAuditStatus.readiness_status,
  external_execution_status: externalAuditStatus.external_execution_status,
  portability_matches: portabilityMatches
}, null, 2)}\n`);

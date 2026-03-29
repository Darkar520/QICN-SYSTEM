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
const { buildSubjectivityEcosystem } = require('./build-subjectivity-ecosystem.cjs');

async function buildEcosystemReleaseCandidate() {
await buildSubjectivityEcosystem();
const { model, gapRegister, verificationMatrix } = evaluateEcosystem();
const generatedAt = new Date().toISOString();
const bundleId = `ecosystem_release_candidate_${generatedAt.replace(/[:.]/g, '-')}`;
const bundleRoot = path.join(ECOSYSTEM_ARTIFACT_ROOT, 'bundles', bundleId);

ensureDir(bundleRoot);

const bundleManifest = {
  artifact_role: 'ecosystem_release_candidate_manifest',
  generated_at: generatedAt,
  bundle_id: bundleId,
  bundle_root: '.',
  candidate_status: verificationMatrix.status,
  baselines: {
    qicn_system: {
      repository: 'QICN-SYSTEM',
      branch: model.system.state.branch,
      head: model.system.state.head,
      upstream: model.system.state.upstream,
      operational_readiness_manifest: 'system/manifests/operational_readiness_manifest.json',
      artifact_manifest: 'system/manifests/artifact_manifest.json',
      operational_smoke_manifest: 'system/manifests/operational_smoke_manifest.json',
      internal_release_bundle_manifest: 'system/manifests/release_bundle_manifest.json',
      canonical_commands: [
        'npm run verify:operational-readiness',
        'npm run verify:artifacts',
        'npm run smoke:operational',
        'npm run release:bundle'
      ],
      interpretation_boundary: 'Operational baseline only; not theory confirmation, not external validation.'
    },
    qicn_release: {
      repository: 'QICN-RELEASE',
      branch: model.release.state.branch,
      head: model.release.state.head,
      upstream: model.release.state.upstream,
      canonical_freeze_tag: model.release.freeze_manifest.freeze_reference.local_tag,
      canonical_freeze_commit: model.release.freeze_manifest.freeze_reference.local_tag_commit,
      upstream_pin_status: model.release.freeze_manifest.pin_status.upstream_pin_status,
      freeze_manifest: 'release/manifests/release_freeze_manifest.json',
      claim_registry: 'release/manifests/claim_registry.v1.json',
      canonical_release_manifest: 'release/manifests/canonical_release_manifest.json',
      interpretation_boundary: 'Canonical corpus baseline only; not external validation, not runtime validation.'
    }
  },
  protocolized_evaluation: {
    architecture_freeze: {
      documentation: 'ecosystem/docs/PROTOCOLIZED_EVALUATION_FREEZE_BASELINE.md',
      machine_readable: 'ecosystem/manifests/evaluation_architecture_freeze.v1.json'
    },
    execution_campaign: {
      freeze_baseline: 'ecosystem/docs/EXECUTION_CAMPAIGN_FREEZE_BASELINE.md',
      freeze_manifest: 'ecosystem/manifests/execution_campaign_freeze.v1.json',
      successive_discipline: 'ecosystem/docs/SUCCESSIVE_CAMPAIGN_DISCIPLINE.md',
      successive_discipline_manifest: 'ecosystem/manifests/successive_campaign_discipline.v1.json',
      audit_readout: 'ecosystem/manifests/execution_campaign_audit_readout.json',
      latest_campaign_pointer: 'ecosystem/manifests/latest_campaign_pointer.json',
      surface_class: 'internal_manifest_only'
    },
    documentation: {
      protocol: 'ecosystem/docs/PROTOCOLIZED_EVALUATION_PROTOCOL.md',
      comparison_matrix: 'ecosystem/docs/EVALUATION_COMPARISON_MATRIX.md',
      metrics_baseline: 'ecosystem/docs/EVALUATION_METRICS_BASELINE.md',
      controls_registry: 'ecosystem/docs/EVALUATION_CONTROLS_AND_INTERVENTIONS.md',
      statistical_policy: 'ecosystem/docs/EVALUATION_STATISTICAL_POLICY.md',
      interpretation_boundary: 'ecosystem/docs/EVALUATION_INTERPRETATION_BOUNDARY.md'
    },
    manifests: {
      protocol_definition: 'ecosystem/manifests/evaluation_protocol.v1.json',
      comparison_matrix: 'ecosystem/manifests/evaluation_comparison_matrix.v1.json',
      metrics_registry: 'ecosystem/manifests/evaluation_metrics_registry.v1.json',
      controls_registry: 'ecosystem/manifests/evaluation_controls_registry.v1.json',
      statistical_policy: 'ecosystem/manifests/evaluation_statistical_policy.v1.json',
      protocol_manifest: 'ecosystem/manifests/evaluation_protocol_manifest.json',
      batch_report: 'ecosystem/manifests/evaluation_batch_report.json',
      condition_summary: 'ecosystem/manifests/condition_evaluation_summary.json',
      comparison_report: 'ecosystem/manifests/condition_comparison_report.json',
      protocol_check: 'ecosystem/manifests/evaluation_protocol_check.json',
      metrics_check: 'ecosystem/manifests/evaluation_metrics_check.json',
      comparisons_check: 'ecosystem/manifests/evaluation_comparisons_check.json',
      campaign_execution_plan: 'ecosystem/manifests/campaign_execution_plan.json',
      execution_campaign_readout: 'ecosystem/manifests/execution_campaign_readout.json',
      execution_campaign_audit_readout: 'ecosystem/manifests/execution_campaign_audit_readout.json',
      latest_campaign_pointer: 'ecosystem/manifests/latest_campaign_pointer.json'
    },
    interpretation_boundary: 'Protocolized evaluation only; internal descriptive/minimal-contrast layer, not external validation, not theory confirmation.'
  },
  interface_contract: {
    documentation: 'ecosystem/docs/ECOSYSTEM_INTERFACE_CONTRACT.md',
    machine_readable: 'ecosystem/manifests/ecosystem_interface_contract.v1.json'
  },
  candidate_governance: {
    documentation: 'ecosystem/docs/ECOSYSTEM_CANDIDATE_GOVERNANCE.md',
    machine_readable: 'ecosystem/manifests/ecosystem_candidate_governance.v1.json'
  },
  subjectivity: {
    layer_id: 'subjectivity_runtime_layer.srt6',
    documentation: {
      runtime_protocol: 'subjectivity/docs/SUBJECTIVITY_RUNTIME_PROTOCOL.md',
      interpretation_boundary: 'subjectivity/docs/SUBJECTIVITY_INTERPRETATION_BOUNDARY.md',
      surface_policy: 'subjectivity/docs/SUBJECTIVITY_ARTIFACT_SURFACE_POLICY.md',
      candidate_integration: 'subjectivity/docs/SUBJECTIVITY_CANDIDATE_INTEGRATION.md',
      maintenance: 'subjectivity/docs/SUBJECTIVITY_MAINTENANCE.md'
    },
    manifests: {
      protocol: 'subjectivity/manifests/subjectivity_protocol.v1.json',
      thresholds: 'subjectivity/manifests/subjectivity_thresholds.v1.json',
      rival_family: 'subjectivity/manifests/subjectivity_rival_family.v1.json',
      surface_policy: 'subjectivity/manifests/subjectivity_surface_policy.v1.json',
      artifact_schema: 'subjectivity/manifests/subjectivity_artifact_schema.v1.json'
    },
    authoritative_artifacts: {
      runtime_projection: 'subjectivity/subjectivity_runtime_projection.json',
      gate_result: 'subjectivity/subjectivity_gate_result.json',
      manifest: 'subjectivity/subjectivity_manifest.json',
      condition_summary: 'subjectivity/subjectivity_condition_summary.json',
      batch_summary: 'subjectivity/subjectivity_batch_summary.json',
      campaign_summary: 'subjectivity/subjectivity_campaign_summary.json',
      candidate_projection: 'subjectivity/subjectivity_candidate_projection.json',
      verification_matrix: 'subjectivity/subjectivity_verification_matrix.json'
    },
    status: {
      implemented: true,
      internally_supported: true,
      framework_internal_only: true,
      not_externally_validated: true
    },
    interpretation_boundary:
      'Framework-internal subjectivity integration only; candidate inclusion does not authorize claim closure, external validation, phenomenality, or human equivalence.'
  },
  freeze_baseline: {
    documentation: 'ecosystem/docs/ECOSYSTEM_FREEZE_BASELINE.md',
    release_notes: 'ecosystem/docs/ECOSYSTEM_RELEASE_NOTES.md',
    maintenance_checklist: 'ecosystem/docs/ECOSYSTEM_MAINTENANCE_CHECKLIST.md'
  },
  gap_register: 'ecosystem/manifests/ecosystem_gap_register.v1.json',
  verification_matrix: 'ecosystem/manifests/ecosystem_verification_matrix.json',
  candidate_freeze_condition: {
    required_status: 'PASS',
    required_open_gap_count: 0,
    required_repo_state: 'clean_and_pushed_for_both_repositories'
  },
  open_gaps: gapRegister.gaps.map((gap) => ({
    id: gap.id,
    classification: gap.classification,
    affects_internal_release_candidate: gap.affects_internal_release_candidate
  })),
  allowed_internal_use: [
    'repo-local operational verification',
    'repo-local canonical review',
    'bounded internal bundle review',
    'cross-repo governance and traceability review'
  ],
  blocked_interpretations: [
    'runtime outputs validate the corpus',
    'canonical freeze validates the runtime',
    'claim registry closes the claims',
    'internal release candidate equals public claim-safe release'
  ],
  interpretation_boundary: 'Internal ecosystem release candidate only; cross-repo coordination layer, not external validation, not theory closure, not public release.',
  non_claim_restrictions: [
    'Do not read this bundle as framework validation.',
    'Do not read operational readiness as theoretical confirmation.',
    'Do not read the canonical freeze as runtime proof.',
    'Do not read implementation-linked claims as confirmatory claims.'
  ]
};

const releaseNotes = `# ECOSYSTEM RELEASE NOTES

## Status

- Candidate status: \`${verificationMatrix.status}\`
- QICN-SYSTEM baseline: \`${model.system.state.branch}@${model.system.state.head}\`
- QICN-RELEASE repo baseline: \`${model.release.state.branch}@${model.release.state.head}\`
- QICN-RELEASE canonical freeze: \`${model.release.freeze_manifest.freeze_reference.local_tag}@${model.release.freeze_manifest.freeze_reference.local_tag_commit}\`
- QICN-RELEASE upstream pin status: \`${model.release.freeze_manifest.pin_status.upstream_pin_status}\`

## Included

- QICN-SYSTEM operational manifests and internal bundle manifest
- QICN-RELEASE freeze, claim registry, layer/interface manifests, and canonical bundle manifest
- protocolized evaluation protocol, comparison matrix, metrics registry, controls registry, statistical policy, and latest batch manifests
- protocolized evaluation freeze baseline, latest execution campaign plan/readout, latest campaign audit readout, and successive campaign discipline
- ecosystem baseline docs
- ecosystem interface contract
- ecosystem candidate governance
- ecosystem freeze baseline and maintenance checklist
- subjectivity runtime protocol, maintenance docs, machine manifests, and SRT-6 ecosystem summaries
- ecosystem verification matrix
- ecosystem gap register

## Excluded

- non-canonical corpus material under \`release/_non_canonical/\`
- blocked claim-facing system outputs
- primary SRT-1..4 subjectivity run artifacts that remain local-only
- raw runtime outputs as theory-validation material
- unclassified or non-baseline materials outside the two repository baselines

## Residual gaps

${gapRegister.gaps.length === 0 ? '- none' : gapRegister.gaps.map((gap) => `- \`${gap.id}\` [${gap.classification}]: ${gap.impact}`).join('\n')}

## Maintenance

- baseline doc: \`docs/ECOSYSTEM_FREEZE_BASELINE.md\`
- governance doc: \`docs/ECOSYSTEM_CANDIDATE_GOVERNANCE.md\`
- maintenance checklist: \`docs/ECOSYSTEM_MAINTENANCE_CHECKLIST.md\`

## Non-claim boundary

This ecosystem bundle is an internal release candidate only. It does not imply external validation, theory confirmation, claim closure, or public release readiness.
`;

[
  [path.join(SYSTEM_ROOT, 'docs', 'ECOSYSTEM_BASELINE.md'), path.join(bundleRoot, 'ecosystem', 'docs', 'ECOSYSTEM_BASELINE.md')],
  [path.join(SYSTEM_ROOT, 'docs', 'ECOSYSTEM_INTERFACE_CONTRACT.md'), path.join(bundleRoot, 'ecosystem', 'docs', 'ECOSYSTEM_INTERFACE_CONTRACT.md')],
  [path.join(SYSTEM_ROOT, 'docs', 'ECOSYSTEM_CANDIDATE_GOVERNANCE.md'), path.join(bundleRoot, 'ecosystem', 'docs', 'ECOSYSTEM_CANDIDATE_GOVERNANCE.md')],
  [path.join(SYSTEM_ROOT, 'docs', 'ECOSYSTEM_FREEZE_BASELINE.md'), path.join(bundleRoot, 'ecosystem', 'docs', 'ECOSYSTEM_FREEZE_BASELINE.md')],
  [path.join(SYSTEM_ROOT, 'docs', 'ECOSYSTEM_RELEASE_NOTES.md'), path.join(bundleRoot, 'ecosystem', 'docs', 'ECOSYSTEM_RELEASE_NOTES.md')],
  [path.join(SYSTEM_ROOT, 'docs', 'ECOSYSTEM_MAINTENANCE_CHECKLIST.md'), path.join(bundleRoot, 'ecosystem', 'docs', 'ECOSYSTEM_MAINTENANCE_CHECKLIST.md')],
  [path.join(SYSTEM_ROOT, 'docs', 'SUBJECTIVITY_RUNTIME_PROTOCOL.md'), path.join(bundleRoot, 'subjectivity', 'docs', 'SUBJECTIVITY_RUNTIME_PROTOCOL.md')],
  [path.join(SYSTEM_ROOT, 'docs', 'SUBJECTIVITY_INTERPRETATION_BOUNDARY.md'), path.join(bundleRoot, 'subjectivity', 'docs', 'SUBJECTIVITY_INTERPRETATION_BOUNDARY.md')],
  [path.join(SYSTEM_ROOT, 'docs', 'SUBJECTIVITY_ARTIFACT_SURFACE_POLICY.md'), path.join(bundleRoot, 'subjectivity', 'docs', 'SUBJECTIVITY_ARTIFACT_SURFACE_POLICY.md')],
  [path.join(SYSTEM_ROOT, 'docs', 'SUBJECTIVITY_CANDIDATE_INTEGRATION.md'), path.join(bundleRoot, 'subjectivity', 'docs', 'SUBJECTIVITY_CANDIDATE_INTEGRATION.md')],
  [path.join(SYSTEM_ROOT, 'docs', 'SUBJECTIVITY_MAINTENANCE.md'), path.join(bundleRoot, 'subjectivity', 'docs', 'SUBJECTIVITY_MAINTENANCE.md')],
  [path.join(SYSTEM_ROOT, 'docs', 'subjectivity_protocol.v1.json'), path.join(bundleRoot, 'subjectivity', 'manifests', 'subjectivity_protocol.v1.json')],
  [path.join(SYSTEM_ROOT, 'docs', 'subjectivity_thresholds.v1.json'), path.join(bundleRoot, 'subjectivity', 'manifests', 'subjectivity_thresholds.v1.json')],
  [path.join(SYSTEM_ROOT, 'docs', 'subjectivity_rival_family.v1.json'), path.join(bundleRoot, 'subjectivity', 'manifests', 'subjectivity_rival_family.v1.json')],
  [path.join(SYSTEM_ROOT, 'docs', 'subjectivity_surface_policy.v1.json'), path.join(bundleRoot, 'subjectivity', 'manifests', 'subjectivity_surface_policy.v1.json')],
  [path.join(SYSTEM_ROOT, 'docs', 'subjectivity_artifact_schema.v1.json'), path.join(bundleRoot, 'subjectivity', 'manifests', 'subjectivity_artifact_schema.v1.json')],
  [path.join(SYSTEM_ROOT, 'artifacts', 'subjectivity', 'srt5', 'subjectivity_runtime_projection.json'), path.join(bundleRoot, 'subjectivity', 'subjectivity_runtime_projection.json')],
  [path.join(SYSTEM_ROOT, 'artifacts', 'subjectivity', 'srt5', 'subjectivity_gate_result.json'), path.join(bundleRoot, 'subjectivity', 'subjectivity_gate_result.json')],
  [path.join(SYSTEM_ROOT, 'artifacts', 'subjectivity', 'srt5', 'subjectivity_manifest.json'), path.join(bundleRoot, 'subjectivity', 'subjectivity_manifest.json')],
  [path.join(SYSTEM_ROOT, 'artifacts', 'subjectivity', 'srt6', 'subjectivity_condition_summary.json'), path.join(bundleRoot, 'subjectivity', 'subjectivity_condition_summary.json')],
  [path.join(SYSTEM_ROOT, 'artifacts', 'subjectivity', 'srt6', 'subjectivity_batch_summary.json'), path.join(bundleRoot, 'subjectivity', 'subjectivity_batch_summary.json')],
  [path.join(SYSTEM_ROOT, 'artifacts', 'subjectivity', 'srt6', 'subjectivity_campaign_summary.json'), path.join(bundleRoot, 'subjectivity', 'subjectivity_campaign_summary.json')],
  [path.join(SYSTEM_ROOT, 'artifacts', 'subjectivity', 'srt6', 'subjectivity_candidate_projection.json'), path.join(bundleRoot, 'subjectivity', 'subjectivity_candidate_projection.json')],
  [path.join(SYSTEM_ROOT, 'artifacts', 'subjectivity', 'srt6', 'subjectivity_verification_matrix.json'), path.join(bundleRoot, 'subjectivity', 'subjectivity_verification_matrix.json')],
  [path.join(SYSTEM_ROOT, 'docs', 'PROTOCOLIZED_EVALUATION_PROTOCOL.md'), path.join(bundleRoot, 'ecosystem', 'docs', 'PROTOCOLIZED_EVALUATION_PROTOCOL.md')],
  [path.join(SYSTEM_ROOT, 'docs', 'PROTOCOLIZED_EVALUATION_FREEZE_BASELINE.md'), path.join(bundleRoot, 'ecosystem', 'docs', 'PROTOCOLIZED_EVALUATION_FREEZE_BASELINE.md')],
  [path.join(SYSTEM_ROOT, 'docs', 'EXECUTION_CAMPAIGN_FREEZE_BASELINE.md'), path.join(bundleRoot, 'ecosystem', 'docs', 'EXECUTION_CAMPAIGN_FREEZE_BASELINE.md')],
  [path.join(SYSTEM_ROOT, 'docs', 'SUCCESSIVE_CAMPAIGN_DISCIPLINE.md'), path.join(bundleRoot, 'ecosystem', 'docs', 'SUCCESSIVE_CAMPAIGN_DISCIPLINE.md')],
  [path.join(SYSTEM_ROOT, 'docs', 'EVALUATION_COMPARISON_MATRIX.md'), path.join(bundleRoot, 'ecosystem', 'docs', 'EVALUATION_COMPARISON_MATRIX.md')],
  [path.join(SYSTEM_ROOT, 'docs', 'EVALUATION_METRICS_BASELINE.md'), path.join(bundleRoot, 'ecosystem', 'docs', 'EVALUATION_METRICS_BASELINE.md')],
  [path.join(SYSTEM_ROOT, 'docs', 'EVALUATION_CONTROLS_AND_INTERVENTIONS.md'), path.join(bundleRoot, 'ecosystem', 'docs', 'EVALUATION_CONTROLS_AND_INTERVENTIONS.md')],
  [path.join(SYSTEM_ROOT, 'docs', 'EVALUATION_STATISTICAL_POLICY.md'), path.join(bundleRoot, 'ecosystem', 'docs', 'EVALUATION_STATISTICAL_POLICY.md')],
  [path.join(SYSTEM_ROOT, 'docs', 'EVALUATION_INTERPRETATION_BOUNDARY.md'), path.join(bundleRoot, 'ecosystem', 'docs', 'EVALUATION_INTERPRETATION_BOUNDARY.md')],
  [path.join(SYSTEM_ROOT, 'docs', 'evaluation_architecture_freeze.v1.json'), path.join(bundleRoot, 'ecosystem', 'manifests', 'evaluation_architecture_freeze.v1.json')],
  [path.join(SYSTEM_ROOT, 'docs', 'execution_campaign_freeze.v1.json'), path.join(bundleRoot, 'ecosystem', 'manifests', 'execution_campaign_freeze.v1.json')],
  [path.join(SYSTEM_ROOT, 'docs', 'successive_campaign_discipline.v1.json'), path.join(bundleRoot, 'ecosystem', 'manifests', 'successive_campaign_discipline.v1.json')],
  [path.join(SYSTEM_ROOT, 'docs', 'ecosystem_interface_contract.v1.json'), path.join(bundleRoot, 'ecosystem', 'manifests', 'ecosystem_interface_contract.v1.json')],
  [path.join(SYSTEM_ROOT, 'docs', 'ecosystem_candidate_governance.v1.json'), path.join(bundleRoot, 'ecosystem', 'manifests', 'ecosystem_candidate_governance.v1.json')],
  [path.join(SYSTEM_ROOT, 'docs', 'evaluation_protocol.v1.json'), path.join(bundleRoot, 'ecosystem', 'manifests', 'evaluation_protocol.v1.json')],
  [path.join(SYSTEM_ROOT, 'docs', 'evaluation_comparison_matrix.v1.json'), path.join(bundleRoot, 'ecosystem', 'manifests', 'evaluation_comparison_matrix.v1.json')],
  [path.join(SYSTEM_ROOT, 'docs', 'evaluation_metrics_registry.v1.json'), path.join(bundleRoot, 'ecosystem', 'manifests', 'evaluation_metrics_registry.v1.json')],
  [path.join(SYSTEM_ROOT, 'docs', 'evaluation_controls_registry.v1.json'), path.join(bundleRoot, 'ecosystem', 'manifests', 'evaluation_controls_registry.v1.json')],
  [path.join(SYSTEM_ROOT, 'docs', 'evaluation_statistical_policy.v1.json'), path.join(bundleRoot, 'ecosystem', 'manifests', 'evaluation_statistical_policy.v1.json')],
  [path.join(SYSTEM_ROOT, 'artifacts', 'protocolized_evaluation', 'evaluation_protocol_manifest.json'), path.join(bundleRoot, 'ecosystem', 'manifests', 'evaluation_protocol_manifest.json')],
  [path.join(SYSTEM_ROOT, 'artifacts', 'protocolized_evaluation', 'evaluation_batch_report.json'), path.join(bundleRoot, 'ecosystem', 'manifests', 'evaluation_batch_report.json')],
  [path.join(SYSTEM_ROOT, 'artifacts', 'protocolized_evaluation', 'condition_evaluation_summary.json'), path.join(bundleRoot, 'ecosystem', 'manifests', 'condition_evaluation_summary.json')],
  [path.join(SYSTEM_ROOT, 'artifacts', 'protocolized_evaluation', 'condition_comparison_report.json'), path.join(bundleRoot, 'ecosystem', 'manifests', 'condition_comparison_report.json')],
  [path.join(SYSTEM_ROOT, 'artifacts', 'protocolized_evaluation', 'evaluation_protocol_check.json'), path.join(bundleRoot, 'ecosystem', 'manifests', 'evaluation_protocol_check.json')],
  [path.join(SYSTEM_ROOT, 'artifacts', 'protocolized_evaluation', 'evaluation_metrics_check.json'), path.join(bundleRoot, 'ecosystem', 'manifests', 'evaluation_metrics_check.json')],
  [path.join(SYSTEM_ROOT, 'artifacts', 'protocolized_evaluation', 'evaluation_comparisons_check.json'), path.join(bundleRoot, 'ecosystem', 'manifests', 'evaluation_comparisons_check.json')],
  [path.join(SYSTEM_ROOT, 'artifacts', 'execution_campaign', 'campaign_execution_plan.json'), path.join(bundleRoot, 'ecosystem', 'manifests', 'campaign_execution_plan.json')],
  [path.join(SYSTEM_ROOT, 'artifacts', 'execution_campaign', 'execution_campaign_readout.json'), path.join(bundleRoot, 'ecosystem', 'manifests', 'execution_campaign_readout.json')],
  [path.join(SYSTEM_ROOT, 'artifacts', 'execution_campaign', 'execution_campaign_audit_readout.json'), path.join(bundleRoot, 'ecosystem', 'manifests', 'execution_campaign_audit_readout.json')],
  [path.join(SYSTEM_ROOT, 'artifacts', 'execution_campaign', 'latest_campaign_pointer.json'), path.join(bundleRoot, 'ecosystem', 'manifests', 'latest_campaign_pointer.json')],
  [path.join(SYSTEM_ROOT, 'artifacts', 'operational_readiness_manifest.json'), path.join(bundleRoot, 'system', 'manifests', 'operational_readiness_manifest.json')],
  [path.join(SYSTEM_ROOT, 'artifacts', 'artifact_manifest.json'), path.join(bundleRoot, 'system', 'manifests', 'artifact_manifest.json')],
  [path.join(SYSTEM_ROOT, 'artifacts', 'operational_smoke_manifest.json'), path.join(bundleRoot, 'system', 'manifests', 'operational_smoke_manifest.json')],
  [model.system.bundle_manifest_path, path.join(bundleRoot, 'system', 'manifests', 'release_bundle_manifest.json')],
  [path.join(SYSTEM_ROOT, 'docs', 'OPERATIONAL_READINESS.md'), path.join(bundleRoot, 'system', 'docs', 'OPERATIONAL_READINESS.md')],
  [path.join(SYSTEM_ROOT, 'docs', 'REPRODUCIBILITY_CONTRACT.md'), path.join(bundleRoot, 'system', 'docs', 'REPRODUCIBILITY_CONTRACT.md')],
  [path.join(SYSTEM_ROOT, 'docs', 'RELEASE_PROCESS.md'), path.join(bundleRoot, 'system', 'docs', 'RELEASE_PROCESS.md')],
  [path.join(RELEASE_ROOT, 'release', 'release_freeze_manifest.json'), path.join(bundleRoot, 'release', 'manifests', 'release_freeze_manifest.json')],
  [path.join(RELEASE_ROOT, 'release', 'claim_registry.v1.json'), path.join(bundleRoot, 'release', 'manifests', 'claim_registry.v1.json')],
  [path.join(RELEASE_ROOT, 'release', 'layer_boundaries.v1.json'), path.join(bundleRoot, 'release', 'manifests', 'layer_boundaries.v1.json')],
  [path.join(RELEASE_ROOT, 'release', 'system_interface_boundary.v1.json'), path.join(bundleRoot, 'release', 'manifests', 'system_interface_boundary.v1.json')],
  [model.release.bundle_manifest_path, path.join(bundleRoot, 'release', 'manifests', 'canonical_release_manifest.json')],
  [path.join(RELEASE_ROOT, 'docs', 'CANON_SOURCE_OF_TRUTH.md'), path.join(bundleRoot, 'release', 'docs', 'CANON_SOURCE_OF_TRUTH.md')],
  [path.join(RELEASE_ROOT, 'docs', 'CLAIM_REGISTRY.md'), path.join(bundleRoot, 'release', 'docs', 'CLAIM_REGISTRY.md')],
  [path.join(RELEASE_ROOT, 'docs', 'LAYER_BOUNDARIES.md'), path.join(bundleRoot, 'release', 'docs', 'LAYER_BOUNDARIES.md')],
  [path.join(RELEASE_ROOT, 'docs', 'THEORY_SYSTEM_INTERFACE.md'), path.join(bundleRoot, 'release', 'docs', 'THEORY_SYSTEM_INTERFACE.md')],
  [path.join(RELEASE_ROOT, 'docs', 'CANONICAL_RELEASE_NOTES.md'), path.join(bundleRoot, 'release', 'docs', 'CANONICAL_RELEASE_NOTES.md')]
].forEach(([from, to]) => copyFile(from, to));

const verificationPath = path.join(bundleRoot, 'ecosystem', 'manifests', 'ecosystem_verification_matrix.json');
const gapPath = path.join(bundleRoot, 'ecosystem', 'manifests', 'ecosystem_gap_register.v1.json');
const manifestPath = path.join(bundleRoot, 'ecosystem_release_candidate_manifest.json');
const notesPath = path.join(bundleRoot, 'ECOSYSTEM_RELEASE_NOTES.md');

writeJson(verificationPath, verificationMatrix);
writeJson(gapPath, gapRegister);
writeJson(manifestPath, bundleManifest);
fs.writeFileSync(notesPath, releaseNotes, 'utf8');

writeJson(path.join(ECOSYSTEM_ARTIFACT_ROOT, 'ecosystem_release_candidate_manifest.json'), bundleManifest);
writeJson(path.join(ECOSYSTEM_ARTIFACT_ROOT, 'ecosystem_gap_register.v1.json'), gapRegister);
writeJson(path.join(ECOSYSTEM_ARTIFACT_ROOT, 'ecosystem_verification_matrix.json'), verificationMatrix);
fs.writeFileSync(path.join(ECOSYSTEM_ARTIFACT_ROOT, 'ECOSYSTEM_RELEASE_NOTES.md'), releaseNotes, 'utf8');

const result = {
  output: normalize(path.relative(SYSTEM_ROOT, manifestPath)),
  root_manifest: 'artifacts/ecosystem_release_candidate/ecosystem_release_candidate_manifest.json',
  bundle_id: bundleId,
  artifact_role: bundleManifest.artifact_role,
  status: verificationMatrix.status,
  gap_register: normalize(path.relative(SYSTEM_ROOT, gapPath))
};
return result;
}

if (require.main === module) {
  buildEcosystemReleaseCandidate()
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    })
    .catch((error) => {
      console.error(`FAIL build-ecosystem-release-candidate: ${error.message}`);
      process.exit(1);
    });
}

module.exports = {
  buildEcosystemReleaseCandidate
};

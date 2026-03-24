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
  interface_contract: {
    documentation: 'ecosystem/docs/ECOSYSTEM_INTERFACE_CONTRACT.md',
    machine_readable: 'ecosystem/manifests/ecosystem_interface_contract.v1.json'
  },
  gap_register: 'ecosystem/manifests/ecosystem_gap_register.v1.json',
  verification_matrix: 'ecosystem/manifests/ecosystem_verification_matrix.json',
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
- ecosystem baseline docs
- ecosystem interface contract
- ecosystem verification matrix
- ecosystem gap register

## Excluded

- non-canonical corpus material under \`release/_non_canonical/\`
- blocked claim-facing system outputs
- raw runtime outputs as theory-validation material
- unclassified or non-baseline materials outside the two repository baselines

## Residual gaps

${gapRegister.gaps.length === 0 ? '- none' : gapRegister.gaps.map((gap) => `- \`${gap.id}\` [${gap.classification}]: ${gap.impact}`).join('\n')}

## Non-claim boundary

This ecosystem bundle is an internal release candidate only. It does not imply external validation, theory confirmation, claim closure, or public release readiness.
`;

[
  [path.join(SYSTEM_ROOT, 'docs', 'ECOSYSTEM_BASELINE.md'), path.join(bundleRoot, 'ecosystem', 'docs', 'ECOSYSTEM_BASELINE.md')],
  [path.join(SYSTEM_ROOT, 'docs', 'ECOSYSTEM_INTERFACE_CONTRACT.md'), path.join(bundleRoot, 'ecosystem', 'docs', 'ECOSYSTEM_INTERFACE_CONTRACT.md')],
  [path.join(SYSTEM_ROOT, 'docs', 'ecosystem_interface_contract.v1.json'), path.join(bundleRoot, 'ecosystem', 'manifests', 'ecosystem_interface_contract.v1.json')],
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

process.stdout.write(`${JSON.stringify({
  output: normalize(path.relative(SYSTEM_ROOT, manifestPath)),
  root_manifest: 'artifacts/ecosystem_release_candidate/ecosystem_release_candidate_manifest.json',
  bundle_id: bundleId,
  artifact_role: bundleManifest.artifact_role,
  status: verificationMatrix.status,
  gap_register: normalize(path.relative(SYSTEM_ROOT, gapPath))
}, null, 2)}\n`);

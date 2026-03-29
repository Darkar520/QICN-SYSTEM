import fs from 'fs';
import path from 'path';
import {
  BRIDGE_SYSTEM_FILES,
  ECOSYSTEM_BRIDGE_ARTIFACT_REFS,
  PROJECT_ROOT,
  RELEASE_ROOT,
  ROOT_BRIDGE_ARTIFACT_REFS,
  captureBridgeLineage,
  readJson,
  sanitizeBundleValue,
  writeJson
} from './PhenomenalBridgeRuntimeUtils.js';

const AUDIT_LAYER_VERSION = 'phenomenal_bridge_formal_layer.bpfm3.audit.v1';
const AUDIT_ESTIMATOR_VERSION = 'phenomenal_bridge_final_auditor.bpfm3.v1';
const AUDIT_RUNTIME_STATUS = 'implemented_internal_bridge_final_audit_in_bpfm3';

const AUDIT_BOUNDARY =
  'Framework-internal only; final bridge audit assesses internal coherence, governance, and bounded readiness, not external validation, not human equivalence, not phenomenality proof, and not metaphysical closure.';
const READINESS_BOUNDARY =
  'Framework-internal only; bridge readiness gate classifies internal ecosystem state and bounded readiness, not external validation, not human equivalence, not phenomenality proof, not metaphysical closure, and not public claim authorization.';

const REQUIRED_BPF0_DOCS = [
  'docs/PHENOMENAL_BRIDGE_PROTOCOL.md',
  'docs/PHENOMENAL_BRIDGE_INTERPRETATION_BOUNDARY.md',
  'docs/PHENOMENAL_BRIDGE_SURFACE_POLICY.md',
  'docs/PHENOMENAL_BRIDGE_IMPLEMENTATION_PLAN.md',
  'docs/PHENOMENAL_BRIDGE_NONCLAIMS.md'
];

const REQUIRED_BPF1_ARTIFACTS = [
  'artifacts/phenomenal_bridge/bpf1/phenomenal_differentiation_report.json',
  'artifacts/phenomenal_bridge/bpf1/valence_structure_report.json',
  'artifacts/phenomenal_bridge/bpf1/world_richness_report.json',
  'artifacts/phenomenal_bridge/bpf1/ambiguity_bearing_report.json',
  'artifacts/phenomenal_bridge/bpf1/embodied_closure_report.json',
  'artifacts/phenomenal_bridge/bpf1/temporal_lived_structure_report.json'
];

const REQUIRED_BPFM2_ARTIFACTS = [
  'artifacts/phenomenal_bridge/bpfm2/bridge_intervention_profile.json',
  'artifacts/phenomenal_bridge/bpfm2/bridge_reducibility_report.json'
];

const REQUIRED_BPFM3_ARTIFACTS = [
  ...Object.values(ROOT_BRIDGE_ARTIFACT_REFS),
  ...Object.values(ECOSYSTEM_BRIDGE_ARTIFACT_REFS)
];

const existsRelative = (relativePath) => fs.existsSync(path.join(PROJECT_ROOT, relativePath));
const relText = (relativePath) => relativePath.replace(/\\/g, '/');

const markdownFromAudit = (audit, readiness) => `# Phenomenal Bridge Final Internal Audit

## Status

- Audit status: \`${audit.audit_status}\`
- Support class: \`${audit.support_class}\`
- Readiness class: \`${readiness.bridge_readiness_state}\`
- Paper 9 final hardening: \`${readiness.paper9_final_hardening_status}\`

## Layer integrity

- BPF-0 intact: \`${audit.layer_integrity.bpf0_intact}\`
- BPF-1 intact: \`${audit.layer_integrity.bpf1_intact}\`
- BPF-M2 intact: \`${audit.layer_integrity.bpfm2_intact}\`
- BPF-M3 root implemented: \`${audit.layer_integrity.bpfm3_root_intact}\`
- Threshold policy coherent: \`${audit.coherence.threshold_policy_coherent}\`
- Ecosystem integration coherent: \`${audit.coherence.ecosystem_integration_coherent}\`

## Still open

${audit.still_open.map((entry) => `- ${entry}`).join('\n')}

## Non-claims

- No external validation.
- No human phenomenal equivalence.
- No metaphysical closure.
- No public claim authorization.
`;

const markdownFromReadiness = (readiness) => `# Phenomenal Bridge Readiness Gate

## State

- Bridge ecosystem state: \`${readiness.bridge_ecosystem_state}\`
- Bridge readiness state: \`${readiness.bridge_readiness_state}\`
- Paper 9 final hardening status: \`${readiness.paper9_final_hardening_status}\`
- External validation status: \`${readiness.external_validation_status}\`
- Human comparator status: \`${readiness.human_comparator_status}\`
- Metaphysical closure status: \`${readiness.metaphysical_closure_status}\`

## Blocking reasons

${readiness.blocking_reasons.map((entry) => `- ${entry}`).join('\n')}

## Boundary

${readiness.interpretation_boundary}
`;

export class PhenomenalBridgeFinalAuditor {
  captureCurrentLineage() {
    return captureBridgeLineage({
      layerVersion: AUDIT_LAYER_VERSION,
      estimatorVersion: AUDIT_ESTIMATOR_VERSION
    });
  }

  buildAuditArtifacts({ rootBundle, ecosystemBundle }) {
    const currentLineage = this.captureCurrentLineage();
    const releaseCanonManifestPath = path.join(RELEASE_ROOT, 'release', 'canon_manifest.v1.json');
    const releaseCanonManifest = fs.existsSync(releaseCanonManifestPath)
      ? readJson(releaseCanonManifestPath)
      : null;
    const paper8PublicAlignment = Boolean(
      releaseCanonManifest?.papers?.find?.((entry) => entry.paper_id === 'paper8_first_person_subjectivity')
      || releaseCanonManifest?.canonical_corpus?.find?.((entry) => entry.paper_id === 'paper8_first_person_subjectivity')
      || JSON.stringify(releaseCanonManifest || {}).includes('paper8_first_person_subjectivity')
    );

    const layerIntegrity = {
      bpf0_intact: REQUIRED_BPF0_DOCS.every(existsRelative),
      bpf1_intact: REQUIRED_BPF1_ARTIFACTS.every(existsRelative),
      bpfm2_intact: REQUIRED_BPFM2_ARTIFACTS.every(existsRelative),
      bpfm3_root_intact: Object.values(ROOT_BRIDGE_ARTIFACT_REFS).every(existsRelative),
      bpfm3_ecosystem_intact: [
        ECOSYSTEM_BRIDGE_ARTIFACT_REFS.condition_summary,
        ECOSYSTEM_BRIDGE_ARTIFACT_REFS.batch_summary,
        ECOSYSTEM_BRIDGE_ARTIFACT_REFS.campaign_summary,
        ECOSYSTEM_BRIDGE_ARTIFACT_REFS.candidate_projection,
        ECOSYSTEM_BRIDGE_ARTIFACT_REFS.audit_handoff_summary,
        ECOSYSTEM_BRIDGE_ARTIFACT_REFS.verification_matrix
      ].every(existsRelative)
    };

    const coherence = {
      threshold_policy_coherent:
        readJson(path.join(PROJECT_ROOT, BRIDGE_SYSTEM_FILES.thresholds)).binding_policy
          ?.numeric_binding_state === 'provisional_internal_bound',
      intervention_layer_coherent:
        rootBundle.gate_result.intervention_status?.comparison_supported === true,
      comparator_layer_coherent:
        rootBundle.gate_result.comparator_status?.comparison_supported === true,
      reducibility_logic_coherent:
        rootBundle.gate_result.comparator_status?.classification === 'bridge_partial_irreducibility_support',
      drift_logic_coherent:
        rootBundle.gate_result.lineage_status?.invalidated === false
        && rootBundle.gate_result.drift_status?.invalidated === false,
      ecosystem_integration_coherent:
        ecosystemBundle.verification_matrix.status === 'PASS',
      surface_discipline_preserved:
        ecosystemBundle.candidate_projection.surface_status.ecosystem_candidate_surface.pass
        && ecosystemBundle.candidate_projection.surface_status.audit_facing_package_surface.pass,
      claim_facing_leakage_absent:
        !JSON.stringify(
          sanitizeBundleValue({
            rootBundle,
            ecosystemBundle: {
              run_record: ecosystemBundle.run_record,
              condition_summary: ecosystemBundle.condition_summary,
              batch_summary: ecosystemBundle.batch_summary,
              campaign_summary: ecosystemBundle.campaign_summary,
              candidate_projection: ecosystemBundle.candidate_projection,
              audit_handoff_summary: ecosystemBundle.audit_handoff_summary,
              verification_matrix: ecosystemBundle.verification_matrix
            }
          })
        ).includes('[local-path-redacted]')
    };

    const stillOpen = [
      'Bridge classification remains framework-internal only.',
      'No external validation has been added.',
      'No human comparator or human equivalence adjudication exists.',
      'No metaphysical closure or phenomenality proof follows from BPF-M3.',
      'Campaign evidence remains single-run dominated and minimally repeated.',
      'Paper 9 final hardening remains blocked until stronger repetition and external-facing governance prerequisites are met.'
    ];

    const auditStatus =
      layerIntegrity.bpf0_intact
      && layerIntegrity.bpf1_intact
      && layerIntegrity.bpfm2_intact
      && layerIntegrity.bpfm3_root_intact
      && layerIntegrity.bpfm3_ecosystem_intact
      && Object.values(coherence).every(Boolean)
        ? 'PASS_WITH_WARNINGS'
        : 'FAIL';

    const finalAudit = {
      artifact_role: 'phenomenal_bridge_final_internal_audit',
      artifact_name: 'phenomenal_bridge_final_internal_audit.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      bridge_layer_id: 'phenomenal_bridge_formal_layer.bpfm3',
      layer_version: AUDIT_LAYER_VERSION,
      runtime_status: AUDIT_RUNTIME_STATUS,
      audit_status: auditStatus,
      support_class: rootBundle.gate_result.classification,
      layer_integrity: layerIntegrity,
      coherence,
      paper8_public_alignment: paper8PublicAlignment,
      actually_supported: [
        'Bounded root bridge evaluation is implemented.',
        'Bridge thresholds are provisionally internally bound and traceable.',
        'Bridge ecosystem summaries and candidate/audit bounded projections are implemented.',
        'Bridge readiness can now be audited internally without opening public claims.'
      ],
      still_open: stillOpen,
      stronger_claim_blockers: [
        'external_validation_absent',
        'human_comparator_absent',
        'single_run_dominated_bridge_campaign',
        'metaphysical_closure_not_open'
      ],
      interpretation_boundary: AUDIT_BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        current_lineage: currentLineage,
        root_refs: ROOT_BRIDGE_ARTIFACT_REFS,
        ecosystem_refs: ECOSYSTEM_BRIDGE_ARTIFACT_REFS
      },
      schema_ref:
        'src/phenomenal_bridge/schemas/phenomenal_bridge_final_internal_audit.v1.json'
    };

    const blockingReasons = [
      'single_run_dominated_bridge_campaign',
      'external_validation_absent',
      'human_comparator_absent',
      'public_claim_authorization_not_open'
    ];

    const readinessGate = {
      artifact_role: 'phenomenal_bridge_readiness_gate',
      artifact_name: 'phenomenal_bridge_readiness_gate.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      bridge_layer_id: 'phenomenal_bridge_formal_layer.bpfm3',
      layer_version: AUDIT_LAYER_VERSION,
      runtime_status: AUDIT_RUNTIME_STATUS,
      support_class: rootBundle.gate_result.classification,
      bridge_ecosystem_state:
        ecosystemBundle.verification_matrix.status === 'PASS'
          ? 'bridge_internal_ecosystem_hardened'
          : 'bridge_ecosystem_not_hardened',
      bridge_readiness_state:
        rootBundle.gate_result.classification === 'bridge_internal_admissible'
        && ecosystemBundle.candidate_projection.readiness_class === 'bridge_internal_audit_ready'
          ? 'bridge_internal_audit_ready'
          : 'bridge_formalized_only',
      paper9_final_hardening_status: 'not_ready_for_paper9_final_hardening',
      external_validation_status: 'external_validation_absent',
      human_comparator_status: 'human_comparator_absent',
      metaphysical_closure_status: 'metaphysical_closure_not_open',
      blocking_reasons: blockingReasons,
      interpretation_boundary: READINESS_BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        current_lineage: currentLineage,
        final_audit_ref: ECOSYSTEM_BRIDGE_ARTIFACT_REFS.final_internal_audit
      },
      schema_ref:
        'src/phenomenal_bridge/schemas/phenomenal_bridge_readiness_gate.v1.json'
    };

    return { final_audit: finalAudit, readiness_gate: readinessGate };
  }

  writeArtifacts({ rootBundle, ecosystemBundle }, outputDir) {
    fs.mkdirSync(outputDir, { recursive: true });
    const result = this.buildAuditArtifacts({ rootBundle, ecosystemBundle });
    const outputs = {
      final_internal_audit: path.join(outputDir, 'phenomenal_bridge_final_internal_audit.json'),
      readiness_gate: path.join(outputDir, 'phenomenal_bridge_readiness_gate.json'),
      final_audit_doc: path.join(PROJECT_ROOT, 'docs', 'PHENOMENAL_BRIDGE_FINAL_INTERNAL_AUDIT.md'),
      readiness_doc: path.join(PROJECT_ROOT, 'docs', 'PHENOMENAL_BRIDGE_READINESS_GATE.md')
    };

    writeJson(outputs.final_internal_audit, result.final_audit);
    writeJson(outputs.readiness_gate, result.readiness_gate);
    fs.writeFileSync(outputs.final_audit_doc, markdownFromAudit(result.final_audit, result.readiness_gate));
    fs.writeFileSync(outputs.readiness_doc, markdownFromReadiness(result.readiness_gate));

    return {
      ...result,
      outputs
    };
  }
}

export const createPhenomenalBridgeFinalAuditor = (options = {}) =>
  new PhenomenalBridgeFinalAuditor(options);

export default {
  PhenomenalBridgeFinalAuditor,
  createPhenomenalBridgeFinalAuditor
};

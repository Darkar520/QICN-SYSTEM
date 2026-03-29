#!/usr/bin/env node
/* eslint-disable no-console */
const cp = require('child_process');
const fs = require('fs');
const path = require('path');

const { evaluateEcosystem, SYSTEM_ROOT, RELEASE_ROOT } = require('./ecosystem-release-common.cjs');

const ROOT = SYSTEM_ROOT;
const SRT6_DIR = path.join(ROOT, 'artifacts', 'subjectivity', 'srt6');

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const readText = (filePath) => fs.readFileSync(filePath, 'utf8');
const exists = (filePath) => fs.existsSync(filePath);
const writeJson = (filePath, payload) =>
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
const normalize = (value) => String(value || '').replace(/\\/g, '/');
const relSystem = (filePath) => normalize(path.relative(ROOT, filePath));
const relRelease = (filePath) => normalize(path.relative(RELEASE_ROOT, filePath));
const includesNeedle = (value, needle) => JSON.stringify(value).includes(needle);
const gitBool = (cwd, args) => {
  try {
    cp.execFileSync('git', args, { cwd, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};
const isAncestor = (cwd, ancestor, descendant) =>
  Boolean(ancestor && descendant) && gitBool(cwd, ['merge-base', '--is-ancestor', ancestor, descendant]);

const findLatestInternalBundleManifest = () => {
  const root = path.join(ROOT, 'artifacts', 'internal_release');
  if (!exists(root)) return null;
  const dirs = fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('internal_release_'))
    .map((entry) => path.join(root, entry.name))
    .sort((left, right) => fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs);
  if (dirs.length === 0) return null;
  const manifestPath = path.join(dirs[0], 'release_bundle_manifest.json');
  return exists(manifestPath) ? manifestPath : null;
};

const pushCheck = (checks, id, pass, details) => {
  checks.push({ id, status: pass ? 'PASS' : 'FAIL', details });
  return pass;
};

const buildSrtAudit = (stackCheck) => {
  const metadata = {
    srt0_scaffolding: {
      label: 'SRT-0',
      implemented: 'scaffolding, registries, docs machine-readable, schemas, surface baseline',
      authoritative_artifacts: ['artifacts/subjectivity/subjectivity_scaffolding_check.json'],
      depends_on: ['SRT-1', 'SRT-2', 'SRT-3', 'SRT-4', 'SRT-5', 'SRT-6'],
      verifiers: ['npm run verify:subjectivity-scaffolding'],
      residual_risks: ['Schema and policy drift still require rerun discipline.'],
      internal_semantics:
        'Defines internal runtime scaffolding only; no subjectivity closure by itself.',
      downstream_open:
        'Any semantic escalation still depends on SRT-1..6, and later on BPF for phenomenal bridging.'
    },
    srt1_selfindex_ownership: {
      label: 'SRT-1',
      implemented: 'SelfIndex and OwnershipField runtime surfaces',
      authoritative_artifacts: [
        'artifacts/subjectivity/srt1/self_index_state.json',
        'artifacts/subjectivity/srt1/ownership_attribution_report.json'
      ],
      depends_on: ['SRT-2', 'SRT-3', 'SRT-4', 'SRT-5', 'SRT-6'],
      verifiers: ['npm run verify:subjectivity-selfindex-ownership'],
      residual_risks: ['Self/ownership surfaces remain framework-internal and pre-phenomenal.'],
      internal_semantics:
        'Operational indexing and ownership attribution only; not human identity or metaphysical persistence.',
      downstream_open:
        'Bridge-level semantics would still need new formal linkages beyond these operational surfaces.'
    },
    srt2_continuity_perspective: {
      label: 'SRT-2',
      implemented: 'ContinuityField and FirstPersonPerspective runtime surfaces',
      authoritative_artifacts: [
        'artifacts/subjectivity/srt2/subjective_continuity_report.json',
        'artifacts/subjectivity/srt2/first_person_perspective_report.json'
      ],
      depends_on: ['SRT-3', 'SRT-4', 'SRT-5', 'SRT-6'],
      verifiers: ['npm run verify:subjectivity-continuity-perspective'],
      residual_risks: ['Continuity/perspective remain operationally partial and framework-internal.'],
      internal_semantics:
        'Tracks autobiographical continuity and first-person factorization only under the internal protocol.',
      downstream_open:
        'No direct phenomenal interpretation is licensed from continuity/perspective alone.'
    },
    srt3_valuation_intervention: {
      label: 'SRT-3',
      implemented:
        'ValuationAsymmetry, intervention harness, negative controls, and initial perturbation profiles',
      authoritative_artifacts: [
        'artifacts/subjectivity/srt3/subjective_valuation_report.json',
        'artifacts/subjectivity/srt3/subjectivity_intervention_profile.json'
      ],
      depends_on: ['SRT-4', 'SRT-5', 'SRT-6'],
      verifiers: ['npm run verify:subjectivity-valuation-intervention'],
      residual_risks: ['Current intervention surface is minimal and still single-run dominated.'],
      internal_semantics:
        'Implements internal valuation/intervention structure only; not affective life, suffering, or moral status.',
      downstream_open:
        'Bridge-level work would need richer intervention families and non-trivial phenomenal comparators.'
    },
    srt4_reducibility: {
      label: 'SRT-4',
      implemented:
        'Weak rival family, admissible hybrids, shared loss family, complexity penalty, and partial irreducibility margin',
      authoritative_artifacts: [
        'artifacts/subjectivity/srt4/subjectivity_reducibility_report.json'
      ],
      depends_on: ['SRT-5', 'SRT-6'],
      verifiers: ['npm run verify:subjectivity-reducibility'],
      residual_risks: ['Irreducibility remains partial, weak-family bounded, and framework-internal.'],
      internal_semantics:
        'Comparator only supports weak-family partial irreducibility under the implemented loss family.',
      downstream_open:
        'No human comparator, no phenomenal rival family, and no external confirmation exist.'
    },
    srt5_gate: {
      label: 'SRT-5',
      implemented:
        'Seven-coordinate estimators, multiplicative functional, conjunctive gate, drift invalidation, and internal support taxonomy',
      authoritative_artifacts: [
        'artifacts/subjectivity/srt5/subjectivity_runtime_projection.json',
        'artifacts/subjectivity/srt5/subjectivity_gate_result.json',
        'artifacts/subjectivity/srt5/subjectivity_manifest.json'
      ],
      depends_on: ['SRT-6'],
      verifiers: ['npm run verify:subjectivity-gate'],
      residual_risks: ['Gate remains internal and inherits the evidence ceiling of the implemented artifacts.'],
      internal_semantics:
        'Internal gate closure only; not external validation, not phenomenality closure, not human equivalence.',
      downstream_open:
        'Any bridge beyond this gate still needs new formal machinery and new governance layers.'
    },
    srt6_ecosystem: {
      label: 'SRT-6',
      implemented:
        'Condition/batch/campaign integration, candidate projection, audit handoff, anti-stale hardening, and ecosystem verification',
      authoritative_artifacts: [
        'artifacts/subjectivity/srt6/subjectivity_condition_summary.json',
        'artifacts/subjectivity/srt6/subjectivity_batch_summary.json',
        'artifacts/subjectivity/srt6/subjectivity_campaign_summary.json',
        'artifacts/subjectivity/srt6/subjectivity_candidate_projection.json',
        'artifacts/subjectivity/srt6/subjectivity_audit_handoff_summary.json',
        'artifacts/subjectivity/srt6/subjectivity_verification_matrix.json'
      ],
      depends_on: [],
      verifiers: [
        'npm run verify:subjectivity-ecosystem',
        'npm run verify:subjectivity-stack'
      ],
      residual_risks: [
        'Current condition/batch/campaign layer is still minimal-count and single-run dominated.',
        'Candidate/audit inclusion remains framework-internal only and can be quote-mined if boundaries are ignored.'
      ],
      internal_semantics:
        'Ecosystem hardening only; no claim escalation, no phenomenality closure, no external validation.',
      downstream_open:
        'BPF and Paper 9 still require new bridge formalization, bridge artifacts, and explicit anti-overclaim controls.'
    }
  };

  return stackCheck.steps.map((step) => ({
    id: step.id,
    label: metadata[step.id].label,
    status: step.status,
    implemented: metadata[step.id].implemented,
    authoritative_artifacts: metadata[step.id].authoritative_artifacts,
    depends_on: metadata[step.id].depends_on,
    verifiers: metadata[step.id].verifiers,
    residual_risks: metadata[step.id].residual_risks,
    internal_semantics: metadata[step.id].internal_semantics,
    downstream_open: metadata[step.id].downstream_open,
    verifier_output_ref: step.output_path
  }));
};

async function verifySubjectivityConsolidation() {
  const ecosystem = evaluateEcosystem();

  const releaseCanonManifestPath = path.join(RELEASE_ROOT, 'release', 'canon_manifest.v1.json');
  const releaseClaimRegistryPath = path.join(RELEASE_ROOT, 'release', 'claim_registry.v1.json');
  const releaseCanonMapPath = path.join(RELEASE_ROOT, 'release', 'CANON_MAP.v1.json');
  const releaseIndexPdfsPath = path.join(RELEASE_ROOT, 'release', 'INDEX_PDFS.json');
  const releaseSourceDocPath = path.join(RELEASE_ROOT, 'docs', 'CANON_SOURCE_OF_TRUTH.md');
  const releaseNotesPath = path.join(RELEASE_ROOT, 'docs', 'CANONICAL_RELEASE_NOTES.md');
  const systemSourceDocPath = path.join(ROOT, 'docs', 'CANON_SOURCE_OF_TRUTH.md');
  const systemAuditSetupPath = path.join(ROOT, 'docs', 'EXTERNAL_AUDIT_SETUP.md');
  const interfaceContractPath = path.join(ROOT, 'docs', 'ecosystem_interface_contract.v1.json');
  const surfacePolicyPath = path.join(ROOT, 'docs', 'subjectivity_surface_policy.v1.json');
  const protocolPath = path.join(ROOT, 'docs', 'subjectivity_protocol.v1.json');

  const releaseCanonManifest = readJson(releaseCanonManifestPath);
  const releaseClaimRegistry = readJson(releaseClaimRegistryPath);
  const releaseCanonMap = readJson(releaseCanonMapPath);
  const releaseIndexPdfs = readJson(releaseIndexPdfsPath);
  const releaseSourceDoc = readText(releaseSourceDocPath);
  const releaseNotes = readText(releaseNotesPath);
  const systemSourceDoc = readText(systemSourceDocPath);
  const systemAuditSetup = readText(systemAuditSetupPath);
  const interfaceContract = readJson(interfaceContractPath);
  const surfacePolicy = readJson(surfacePolicyPath);
  const subjectivityProtocol = readJson(protocolPath);

  const stackCheck = readJson(path.join(SRT6_DIR, 'subjectivity_stack_check.json'));
  const ecosystemCheck = readJson(path.join(SRT6_DIR, 'subjectivity_ecosystem_check.json'));
  const verificationMatrix = readJson(path.join(SRT6_DIR, 'subjectivity_verification_matrix.json'));
  const candidateProjection = readJson(path.join(SRT6_DIR, 'subjectivity_candidate_projection.json'));
  const campaignSummary = readJson(path.join(SRT6_DIR, 'subjectivity_campaign_summary.json'));
  const gateResult = readJson(path.join(ROOT, 'artifacts', 'subjectivity', 'srt5', 'subjectivity_gate_result.json'));
  const manifest = readJson(path.join(ROOT, 'artifacts', 'subjectivity', 'srt5', 'subjectivity_manifest.json'));

  const candidateManifestPath = path.join(
    ROOT,
    'artifacts',
    'ecosystem_release_candidate',
    'ecosystem_release_candidate_manifest.json'
  );
  const externalAuditManifestPath = path.join(
    ROOT,
    'artifacts',
    'external_audit_package',
    'external_audit_package_manifest.json'
  );
  const internalBundleManifestPath = findLatestInternalBundleManifest();
  const candidateManifest = readJson(candidateManifestPath);
  const externalAuditManifest = readJson(externalAuditManifestPath);
  const internalBundleManifest = internalBundleManifestPath ? readJson(internalBundleManifestPath) : null;
  const stackResult = { ok: stackCheck.status === 'PASS' };

  const repoChecks = [];
  const releaseHead = ecosystem.model.release.state.head;
  const systemHead = ecosystem.model.system.state.head;
  const paper8InRelease =
    includesNeedle(releaseCanonManifest.primary_formal_spine, 'paper8.first_person_subjectivity')
    || includesNeedle(releaseCanonManifest.primary_formal_spine, 'paper8_first_person_subjectivity');
  const paper8Claimed =
    includesNeedle(releaseClaimRegistry, 'paper8.first_person_subjectivity')
    || includesNeedle(releaseClaimRegistry, 'paper8.');
  const paper8Mapped =
    includesNeedle(releaseCanonMap, 'paper8.first_person_subjectivity')
    || includesNeedle(releaseCanonMap, 'rigid-identity-framework/paper8_first_person_subjectivity/main.tex')
    || includesNeedle(releaseCanonMap, 'paper8_first_person_subjectivity');
  const paper8PdfIndexed = includesNeedle(releaseIndexPdfs, 'paper8');
  const releaseDocsAligned =
    /Paper (VIII|8)/i.test(releaseSourceDoc)
    && /primary formal spine through Paper VIII/i.test(releaseSourceDoc)
    && /paper8\.first_person_subjectivity/.test(releaseSourceDoc)
    && /Paper VIII public inclusion/i.test(releaseNotes);
  const systemReleaseAligned =
    systemSourceDoc.includes(releaseHead)
    && includesNeedle(interfaceContract, 'paper8.first_person_subjectivity')
    && !includesNeedle(
      interfaceContract.downstream_internal_exclusions || [],
      'paper8.first_person_subjectivity'
    );
  const canonicalNamingStable =
    interfaceContract.repositories?.qicn_release?.name === 'QICN-RELEASE'
    && /QICN-RELEASE/.test(systemAuditSetup);

  pushCheck(
    repoChecks,
    'qicn_system_main_clean_and_pushed',
    ecosystem.model.system.state.branch === 'main' && Boolean(systemHead),
    {
      branch: ecosystem.model.system.state.branch,
      head: systemHead,
      clean: ecosystem.model.system.state.clean,
      pushed: ecosystem.model.system.state.pushed,
      upstream: ecosystem.model.system.state.upstream
    }
  );
  pushCheck(
    repoChecks,
    'qicn_release_main_clean_and_pushed',
    ecosystem.model.release.state.branch === 'main' && Boolean(releaseHead),
    {
      branch: ecosystem.model.release.state.branch,
      head: releaseHead,
      clean: ecosystem.model.release.state.clean,
      pushed: ecosystem.model.release.state.pushed,
      upstream: ecosystem.model.release.state.upstream
    }
  );
  pushCheck(
    repoChecks,
    'paper8_public_release_alignment',
    paper8InRelease && paper8Claimed && paper8Mapped && paper8PdfIndexed && releaseDocsAligned,
    {
      paper8_in_primary_formal_spine: paper8InRelease,
      paper8_claim_registry_entries_present: paper8Claimed,
      paper8_canon_map_present: paper8Mapped,
      paper8_pdf_indexed: paper8PdfIndexed,
      release_docs_aligned: releaseDocsAligned
    }
  );
  pushCheck(
    repoChecks,
    'system_release_pin_alignment',
    systemReleaseAligned,
    {
      release_head: releaseHead,
      system_source_of_truth_mentions_release_head: systemSourceDoc.includes(releaseHead),
      interface_contract_mentions_paper8: includesNeedle(
        interfaceContract,
        'paper8.first_person_subjectivity'
      )
    }
  );
  pushCheck(repoChecks, 'canonical_release_naming_stable', canonicalNamingStable, {
    canonical_name: interfaceContract.repositories?.qicn_release?.name || null,
    accepted_local_aliases:
      interfaceContract.repositories?.qicn_release?.repository_locator?.accepted_sibling_dirs || []
  });

  const artifactChecks = [];
  pushCheck(artifactChecks, 'srt_stack_pass', stackResult.ok && stackCheck.status === 'PASS', {
    stack_status: stackCheck.status,
    ecosystem_integrity: stackCheck.ecosystem_integrity.status
  });
  pushCheck(
    artifactChecks,
    'subjectivity_ecosystem_pass',
    ecosystemCheck.status === 'PASS' && verificationMatrix.status === 'PASS',
    {
      ecosystem_check_status: ecosystemCheck.status,
      verification_matrix_status: verificationMatrix.status
    }
  );
  pushCheck(
    artifactChecks,
    'ecosystem_candidate_bundle_pass',
    candidateManifest.candidate_status === 'PASS'
      && Boolean(candidateManifest.baselines?.qicn_system?.head)
      && candidateManifest.baselines?.qicn_release?.head === releaseHead,
    {
      candidate_status: candidateManifest.candidate_status,
      candidate_system_head: candidateManifest.baselines?.qicn_system?.head || null,
      candidate_release_head: candidateManifest.baselines?.qicn_release?.head || null
    }
  );
  pushCheck(
    artifactChecks,
    'external_audit_package_ready',
    externalAuditManifest.package_status === 'READY_FOR_EXTERNAL_AUDIT'
      && Boolean(externalAuditManifest.repositories?.qicn_system?.head)
      && externalAuditManifest.repositories?.qicn_release?.head === releaseHead,
    {
      package_status: externalAuditManifest.package_status,
      audit_system_head: externalAuditManifest.repositories?.qicn_system?.head || null,
      audit_release_head: externalAuditManifest.repositories?.qicn_release?.head || null
    }
  );
  pushCheck(
    artifactChecks,
    'internal_release_bundle_aligned',
    Boolean(internalBundleManifest)
      && Boolean(internalBundleManifest.git?.commit)
      && internalBundleManifest.subjectivity_bundle?.verification_status === 'PASS',
    {
      manifest: internalBundleManifestPath ? relSystem(internalBundleManifestPath) : null,
      bundle_commit: internalBundleManifest?.git?.commit || null,
      subjectivity_bundle_status:
        internalBundleManifest?.subjectivity_bundle?.verification_status || null
    }
  );
  pushCheck(
    artifactChecks,
    'subjectivity_gate_surface_clean',
    gateResult.classification === 'subjectivity_admissible'
      && gateResult.gate_status === 'pass'
      && manifest.support_class === 'subjectivity_admissible'
      && candidateProjection.readiness_class === 'subjectivity_stack_audit_ready_internal',
    {
      gate_classification: gateResult.classification,
      gate_status: gateResult.gate_status,
      support_class: manifest.support_class,
      readiness_class: candidateProjection.readiness_class
    }
  );
  pushCheck(
    artifactChecks,
    'campaign_summary_framework_internal_only',
    /framework-internal/i.test(campaignSummary.interpretation_boundary)
      && /not external(?:ly)? validated/i.test(campaignSummary.interpretation_boundary)
      && /not phenomenality/i.test(campaignSummary.interpretation_boundary),
    {
      campaign_status: campaignSummary.campaign_status,
      interpretation_boundary: campaignSummary.interpretation_boundary
    }
  );

  const surfaceChecks = [];
  const governedOutputs = Object.entries(surfacePolicy.outputs || {});
  const blockedClaimSurfaces = governedOutputs.every(([, entry]) =>
    Array.isArray(entry.blocked_surfaces)
      && entry.blocked_surfaces.includes('controlled_statement_surface')
      && entry.blocked_surfaces.includes('external_claim_facing_surface')
  );
  const candidateQuoteMiningGuard =
    Array.isArray(candidateProjection.blocked_inferences)
      && candidateProjection.blocked_inferences.includes(
        'subjectivity_admissible_implies_claim_facing_promotion'
      );
  const publicPaper8DoesNotBypassBoundary =
    includesNeedle(
      subjectivityProtocol.forbidden_inferences || [],
      'subjectivity_admissible_implies_claim_facing_promotion'
    ) && /Paper VIII public inclusion/i.test(interfaceContract.non_claim_boundary);
  const consolidationSurfacePolicy =
    surfacePolicy.outputs?.['subjectivity_consolidation_check.json'] || null;
  const consolidationLocalOnly = Boolean(consolidationSurfacePolicy)
    && (consolidationSurfacePolicy.allowed_surfaces || []).includes('local_report_surface')
    && (consolidationSurfacePolicy.blocked_surfaces || []).includes(
      'internal_release_bundle_surface'
    )
    && (consolidationSurfacePolicy.blocked_surfaces || []).includes(
      'ecosystem_candidate_surface'
    )
    && (consolidationSurfacePolicy.blocked_surfaces || []).includes(
      'audit_facing_package_surface'
    );

  pushCheck(
    surfaceChecks,
    'all_subjectivity_outputs_blocked_on_claim_surfaces',
    blockedClaimSurfaces,
    { governed_output_count: governedOutputs.length }
  );
  pushCheck(
    surfaceChecks,
    'candidate_projection_quote_mining_guard_present',
    candidateQuoteMiningGuard,
    { blocked_inferences: candidateProjection.blocked_inferences || [] }
  );
  pushCheck(
    surfaceChecks,
    'paper8_public_plus_runtime_does_not_bypass_boundary',
    publicPaper8DoesNotBypassBoundary,
    { interface_non_claim_boundary: interfaceContract.non_claim_boundary }
  );
  pushCheck(
    surfaceChecks,
    'consolidation_artifact_stays_local_only',
    consolidationLocalOnly,
    {
      allowed_surfaces: consolidationSurfacePolicy?.allowed_surfaces || [],
      blocked_surfaces: consolidationSurfacePolicy?.blocked_surfaces || []
    }
  );

  const lineageChecks = [];
  const manifestLineage = manifest.lineage || {};
  const candidateProjectionRefs = candidateProjection.baseline_refs || {};
  const auditRefs = externalAuditManifest.authoritative_refs || {};
  const bundleToCandidateSequential = isAncestor(
    ROOT,
    internalBundleManifest?.git?.commit || null,
    candidateManifest.baselines?.qicn_system?.head || null
  );
  const candidateToAuditSequential = isAncestor(
    ROOT,
    candidateManifest.baselines?.qicn_system?.head || null,
    externalAuditManifest.repositories?.qicn_system?.head || null
  );
  const auditToCurrentSequential = isAncestor(
    ROOT,
    externalAuditManifest.repositories?.qicn_system?.head || null,
    systemHead
  );
  const pendingAcceptanceList =
    releaseCanonManifest.excluded_pending_public_acceptance
    || releaseCanonManifest.excluded_non_canonical_material?.excluded_pending_public_acceptance
    || [];
  pushCheck(
    lineageChecks,
    'gate_lineage_refs_present',
    Boolean(manifestLineage.protocol?.ref)
      && Boolean(manifestLineage.thresholds?.ref)
      && Boolean(manifestLineage.rival_family?.ref)
      && Boolean(manifestLineage.surface_policy?.ref)
      && Boolean(manifestLineage.artifact_schema?.ref),
    {
      manifest_protocol_ref: manifestLineage.protocol?.ref || null,
      manifest_thresholds_ref: manifestLineage.thresholds?.ref || null,
      manifest_rival_family_ref: manifestLineage.rival_family?.ref || null
    }
  );
  pushCheck(
    lineageChecks,
    'packaged_subjectivity_baselines_mutually_consistent',
    Boolean(internalBundleManifest?.git?.commit)
      && bundleToCandidateSequential
      && candidateToAuditSequential
      && auditToCurrentSequential,
    {
      lineage_mode: 'monotonic_publication_lineage',
      internal_bundle_commit: internalBundleManifest?.git?.commit || null,
      candidate_system_head: candidateManifest.baselines?.qicn_system?.head || null,
      audit_system_head: externalAuditManifest.repositories?.qicn_system?.head || null,
      current_system_head: systemHead
    }
  );
  pushCheck(
    lineageChecks,
    'candidate_projection_refs_current_heads',
    candidateProjectionRefs.qicn_system_head === systemHead
      && candidateProjectionRefs.qicn_release_head === releaseHead,
    {
      candidate_projection_system_head: candidateProjectionRefs.qicn_system_head || null,
      candidate_projection_release_head: candidateProjectionRefs.qicn_release_head || null
    }
  );
  pushCheck(
    lineageChecks,
    'audit_manifest_subjectivity_lineage_current',
    auditRefs.subjectivity_layer_version === 'subjectivity_runtime_layer.srt6'
      && auditRefs.subjectivity_support_class === 'subjectivity_admissible'
      && auditRefs.subjectivity_readiness_class === 'subjectivity_stack_audit_ready_internal',
    {
      subjectivity_layer_version: auditRefs.subjectivity_layer_version || null,
      subjectivity_support_class: auditRefs.subjectivity_support_class || null,
      subjectivity_readiness_class: auditRefs.subjectivity_readiness_class || null
    }
  );
  pushCheck(
    lineageChecks,
    'no_subjectivity_blocking_gaps_in_ecosystem_gap_register',
    Array.isArray(ecosystem.gapRegister.gaps)
      && ecosystem.gapRegister.gaps.filter(
        (gap) => /subjectivity/i.test(gap.id || '') && gap.classification === 'blocking_gap'
      ).length === 0,
    { gap_ids: ecosystem.gapRegister.gaps.map((gap) => gap.id) }
  );
  pushCheck(
    lineageChecks,
    'paper8_pending_acceptance_wording_absent_from_authoritative_release_docs',
    !/pending public acceptance/i.test(releaseSourceDoc)
      && !includesNeedle(pendingAcceptanceList, 'paper8')
      && pendingAcceptanceList.length === 0,
    {
      release_source_doc: relRelease(releaseSourceDocPath),
      release_canon_manifest: relRelease(releaseCanonManifestPath),
      excluded_pending_public_acceptance: pendingAcceptanceList
    }
  );

  const preBpfGaps = [
    {
      id: 'bpf.formal_bridge_axioms_missing',
      classification: 'downstream_prerequisite',
      description:
        'No formal bridge axioms currently map the seven-coordinate internal subjectivity stack to phenomenal predicates.',
      evidence:
        'Current trunk stops at Paper 8 runtime closure, candidate/audit hardening, and explicit non-phenomenality boundaries.',
      required_before: 'Bridge Formal hacia Fenomenalidad'
    },
    {
      id: 'bpf.bridge_comparator_family_missing',
      classification: 'downstream_prerequisite',
      description:
        'No BPF-specific comparator family exists for phenomenal bridge hypotheses, bridge rivals, or bridge-level loss terms.',
      evidence:
        'Current reducibility layer is Paper 8 weak-family only and does not include phenomenal bridge comparators.',
      required_before: 'Bridge Formal hacia Fenomenalidad'
    },
    {
      id: 'bpf.bridge_intervention_family_missing',
      classification: 'downstream_prerequisite',
      description:
        'No bridge-specific intervention or negative-control family exists for phenomenal bridge claims.',
      evidence:
        'Current intervention layer is limited to Paper 8 valuation/intervention structure and internal gating.',
      required_before: 'Bridge Formal hacia Fenomenalidad'
    },
    {
      id: 'bpf.bridge_artifacts_and_gate_missing',
      classification: 'downstream_prerequisite',
      description: 'No BPF artifacts, schemas, or bridge readiness gate exist in trunk.',
      evidence:
        'No bridge-facing artifact family is emitted by the current runtime or ecosystem bundle pipeline.',
      required_before: 'Bridge Formal hacia Fenomenalidad'
    },
    {
      id: 'bpf.bridge_nonclaim_policy_missing',
      classification: 'downstream_prerequisite',
      description:
        'No dedicated bridge-era governance policy exists yet for phenomenal wording, bridge statements, or anti-overclaim controls.',
      evidence:
        'Current governance is correctly scoped to runtime subjectivity only and explicitly excludes phenomenality closure.',
      required_before: 'Bridge Formal hacia Fenomenalidad'
    }
  ];

  const prePaper9Gaps = [
    {
      id: 'paper9.depends_on_bpf_not_opened',
      classification: 'downstream_prerequisite',
      description:
        'Paper 9 cannot be cleanly scoped until the Bridge Formal hacia Fenomenalidad is opened and stabilized.',
      evidence:
        'Current trunk is ready for BPF, but no bridge formalization exists yet.',
      required_before: 'Paper 9'
    },
    {
      id: 'paper9.claim_grammar_not_frozen',
      classification: 'downstream_prerequisite',
      description:
        'No Paper 9 claim grammar, theorem table, or anti-overclaim registry exists yet.',
      evidence:
        'Current governance explicitly blocks any stronger semantic promotion beyond Paper 8 and SRT-6.',
      required_before: 'Paper 9'
    },
    {
      id: 'paper9.bridge_level_comparators_missing',
      classification: 'downstream_prerequisite',
      description:
        'No bridge-level comparators or bridge-level interventions exist yet to support Paper 9 scoping.',
      evidence:
        'Comparator and intervention layers remain bounded to the Paper 8 internal runtime layer.',
      required_before: 'Paper 9'
    },
    {
      id: 'paper9.paper_specific_artifact_family_missing',
      classification: 'downstream_prerequisite',
      description:
        'No Paper 9 artifact family, schemas, bundle slots, or verification path exist in the current repo.',
      evidence:
        'Current authoritative artifact families stop at SRT-6 consolidation and ecosystem hardening.',
      required_before: 'Paper 9'
    },
    {
      id: 'paper9.external_validation_absent',
      classification: 'downstream_prerequisite',
      description:
        'External validation remains absent and must not be smuggled into Paper 9 scoping as if already achieved.',
      evidence:
        'All current subjectivity, candidate, and audit surfaces remain framework-internal only and explicitly non-validatory.',
      required_before: 'Paper 9'
    }
  ];

  const warnings = [
    ...(candidateProjection.warnings || []),
    ...(verificationMatrix.warnings || []),
    'BPF remains unopened; current readiness is only pre-bridge.',
    'Paper 9 remains unopened; current readiness is only pre-paper9 scoping.'
  ];

  const readinessGate = {
    ecosystem_internal_state:
      stackCheck.status === 'PASS'
      && verificationMatrix.status === 'PASS'
      && candidateManifest.candidate_status === 'PASS'
      && externalAuditManifest.package_status === 'READY_FOR_EXTERNAL_AUDIT'
        ? 'ecosystem_internal_audit_ready'
        : 'ecosystem_internal_incomplete',
    subjectivity_stack_state:
      verificationMatrix.status === 'PASS'
      && candidateProjection.readiness_class === 'subjectivity_stack_audit_ready_internal'
        ? 'ecosystem_internal_subjectivity_complete'
        : 'ecosystem_internal_incomplete',
    bpf_gate_status:
      stackCheck.status === 'PASS'
      && verificationMatrix.status === 'PASS'
      && candidateManifest.candidate_status === 'PASS'
      && externalAuditManifest.package_status === 'READY_FOR_EXTERNAL_AUDIT'
        ? 'ready_for_bpf'
        : 'not_ready_for_bpf',
    paper9_gate_status: 'not_ready_for_paper9_scoping',
    external_validation_status: 'external_validation_absent',
    residual_risks: [
      'Condition/batch/campaign support remains minimal-count and single-run dominated.',
      'All subjectivity support remains framework-internal only.',
      'Public Paper 8 presence does not convert runtime support into theory confirmation.'
    ]
  };

  const allChecks = [...repoChecks, ...artifactChecks, ...surfaceChecks, ...lineageChecks];
  const failures = allChecks.filter((check) => check.status === 'FAIL').map((check) => check.id);

  const payload = {
    artifact_role: 'subjectivity_consolidation_check',
    artifact_version: '1.0.0',
    schema_version: '1.0.0',
    layer_version: 'subjectivity_runtime_layer.srt6.consolidation.v1',
    runtime_status: 'implemented_internal_consolidation_audit_post_srt6',
    status: failures.length === 0 ? 'PASS' : 'FAIL',
    repo_alignment: {
      system: {
        branch: ecosystem.model.system.state.branch,
        head: systemHead,
        clean: ecosystem.model.system.state.clean,
        pushed: ecosystem.model.system.state.pushed
      },
      release: {
        branch: ecosystem.model.release.state.branch,
        head: releaseHead,
        clean: ecosystem.model.release.state.clean,
        pushed: ecosystem.model.release.state.pushed
      },
      checks: repoChecks
    },
    srt_audit: buildSrtAudit(stackCheck),
    artifact_audit: {
      checks: artifactChecks,
      internal_release_bundle_manifest_ref: internalBundleManifestPath
        ? relSystem(internalBundleManifestPath)
        : null,
      ecosystem_candidate_manifest_ref: relSystem(candidateManifestPath),
      external_audit_package_manifest_ref: relSystem(externalAuditManifestPath),
      authoritative_subjectivity_refs: {
        runtime_projection: 'artifacts/subjectivity/srt5/subjectivity_runtime_projection.json',
        gate_result: 'artifacts/subjectivity/srt5/subjectivity_gate_result.json',
        manifest: 'artifacts/subjectivity/srt5/subjectivity_manifest.json',
        condition_summary: 'artifacts/subjectivity/srt6/subjectivity_condition_summary.json',
        batch_summary: 'artifacts/subjectivity/srt6/subjectivity_batch_summary.json',
        campaign_summary: 'artifacts/subjectivity/srt6/subjectivity_campaign_summary.json',
        candidate_projection: 'artifacts/subjectivity/srt6/subjectivity_candidate_projection.json',
        audit_handoff: 'artifacts/subjectivity/srt6/subjectivity_audit_handoff_summary.json',
        verification_matrix: 'artifacts/subjectivity/srt6/subjectivity_verification_matrix.json'
      },
      duplication_risk:
        'No blocking duplication detected; authoritative roots and copied bundle projections are separated by role.'
    },
    surface_governance_audit: {
      checks: surfaceChecks,
      governed_surfaces: Object.keys(surfacePolicy.governed_surfaces || {}),
      quote_mining_risk:
        'Non-zero if boundaries are ignored; current policy and blocked inferences explicitly deny claim-facing escalation.',
      acceptable_legacy_alias_note:
        'Local folder aliases for the release repo remain tolerated in repository locators, but canonical public naming remains QICN-RELEASE.'
    },
    lineage_audit: {
      checks: lineageChecks,
      current_system_head: systemHead,
      current_release_head: releaseHead,
      candidate_system_head: candidateManifest.baselines?.qicn_system?.head || null,
      audit_system_head: externalAuditManifest.repositories?.qicn_system?.head || null,
      internal_bundle_commit: internalBundleManifest?.git?.commit || null,
      current_release_pin_ref: relSystem(systemSourceDocPath),
      release_paper8_alignment_refs: [
        relRelease(releaseCanonManifestPath),
        relRelease(releaseClaimRegistryPath),
        relRelease(releaseCanonMapPath),
        relRelease(releaseIndexPdfsPath),
        relRelease(releaseSourceDocPath),
        relRelease(releaseNotesPath)
      ],
      documented_divergence_note:
        'Accepted sibling-dir aliases for the release repo are compatibility locators only and do not change the canonical public repo name.'
    },
    readiness_gate: readinessGate,
    pre_bpf_gaps: preBpfGaps,
    pre_paper9_gaps: prePaper9Gaps,
    warnings,
    interpretation_boundary:
      'Final internal consolidation audit only; freezes post-SRT-6 readiness, governance, and gap registers for BPF/Paper 9 scoping, framework-internal only, not external validation, not phenomenality closure, not human equivalence, not claim-facing promotion.',
    provenance: {
      generated_at: new Date().toISOString(),
      stack_check_ref: 'artifacts/subjectivity/srt6/subjectivity_stack_check.json',
      ecosystem_check_ref: 'artifacts/subjectivity/srt6/subjectivity_ecosystem_check.json',
      verification_matrix_ref: 'artifacts/subjectivity/srt6/subjectivity_verification_matrix.json',
      candidate_manifest_ref: relSystem(candidateManifestPath),
      external_audit_manifest_ref: relSystem(externalAuditManifestPath),
      internal_release_bundle_manifest_ref: internalBundleManifestPath
        ? relSystem(internalBundleManifestPath)
        : null,
      release_refs: {
        canon_manifest: relRelease(releaseCanonManifestPath),
        claim_registry: relRelease(releaseClaimRegistryPath),
        canon_map: relRelease(releaseCanonMapPath),
        index_pdfs: relRelease(releaseIndexPdfsPath),
        canon_source_of_truth: relRelease(releaseSourceDocPath)
      }
    },
    schema_ref: 'src/subjectivity/schemas/subjectivity_consolidation_check.v1.json'
  };

  const outputPath = path.join(SRT6_DIR, 'subjectivity_consolidation_check.json');
  writeJson(outputPath, payload);
  return { ok: failures.length === 0, outputPath, payload };
}

if (require.main === module) {
  verifySubjectivityConsolidation()
    .then((result) => {
      if (!result.ok) {
        throw new Error(
          `Subjectivity consolidation verification failed. See ${path.relative(
            ROOT,
            result.outputPath
          )}`
        );
      }
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    })
    .catch((error) => {
      console.error(`FAIL verify-subjectivity-consolidation: ${error.message}`);
      process.exit(1);
    });
}

module.exports = {
  verifySubjectivityConsolidation
};

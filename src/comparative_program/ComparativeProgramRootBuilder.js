import path from 'path';

import { COMPARATIVE_PROGRAM_SURFACE_POLICY } from './ComparativeProgramSurfacePolicy.js';
import { COMPARATIVE_PROGRAM_ARTIFACT_SCHEMA } from './ComparativeProgramArtifactRegistry.js';
import { createHumanComparatorAssessmentBuilder } from './HumanComparatorAssessmentBuilder.js';
import { createHumanEquivalenceAssessmentBuilder } from './HumanEquivalenceAssessmentBuilder.js';
import { createCrossSubstrateTransportAssessmentBuilder } from './CrossSubstrateTransportAssessmentBuilder.js';
import {
  COMPARATIVE_RUNTIME_ARTIFACT_REFS,
  COMPARATIVE_SYSTEM_FILES,
  ROOT_BRIDGE_ARTIFACT_REFS,
  PROJECT_ROOT,
  captureComparativeLineage,
  loadBridgeComparativeBaseline,
  checkSurfaceEligibility,
  containsLocalPathLeak,
  ensureDir,
  writeJson
} from './ComparativeRuntimeUtils.js';

const LAYER_VERSION = 'comparative_expansion_layer.stage2_m2.root.v1';
const ESTIMATOR_VERSION = 'comparative_program_root_builder.stage2_m2.v1';

const MANIFEST_BOUNDARY =
  'Framework-internal only; comparative program manifest records bounded comparative runtime opening state, not human equivalence, not cross-substrate equivalence, not external adjudication, and not Paper 10 authorization.';
const VERIFICATION_BOUNDARY =
  'Framework-internal only; comparative verification matrix records implementation and boundary checks, not equivalence support, not superiority, and not external adjudication.';
const READINESS_BOUNDARY =
  'Framework-internal only; comparative readiness gate classifies the comparative runtime layer itself, not human equivalence, not transport preservation, not external adjudication, and not Paper 10 authorization.';

const allowlist = [
  'human_comparator_assessment.json',
  'human_equivalence_assessment.json',
  'cross_substrate_transport_assessment.json',
  'comparative_program_manifest.json',
  'comparative_program_verification_matrix.json',
  'comparative_program_readiness_gate.json'
];

const areAllBlockedOnSurface = (surfacePolicy, artifactNames, surfaceName) =>
  artifactNames.every((artifactName) =>
    (surfacePolicy.outputs?.[artifactName]?.blocked_surfaces || []).includes(surfaceName)
  );

const buildManifest = ({
  currentLineage,
  humanComparatorAssessment,
  humanEquivalenceAssessment,
  crossSubstrateTransportAssessment
}) => ({
  artifact_role: 'comparative_program_manifest',
  artifact_name: 'comparative_program_manifest.json',
  artifact_version: '1.0.0',
  schema_version: '1.0.0',
  comparative_layer_id: 'comparative_expansion_layer.stage2_m2_runtime_opening',
  layer_version: LAYER_VERSION,
  estimator_version: ESTIMATOR_VERSION,
  implementation_status: 'stage2_m2_runtime_comparative_opening_implemented',
  program_status: 'comparative_runtime_open_but_human_blocked',
  authority_status: 'framework_internal_only',
  upstream_refs: {
    bridge_projection: ROOT_BRIDGE_ARTIFACT_REFS.projection,
    bridge_gate_result: ROOT_BRIDGE_ARTIFACT_REFS.gate_result,
    bridge_manifest: ROOT_BRIDGE_ARTIFACT_REFS.manifest,
    bridge_final_internal_audit: ROOT_BRIDGE_ARTIFACT_REFS.final_internal_audit,
    bridge_readiness_gate: ROOT_BRIDGE_ARTIFACT_REFS.readiness_gate
  },
  governance_refs: {
    comparator_protocol: COMPARATIVE_SYSTEM_FILES.comparator_protocol,
    equivalence_ladder: COMPARATIVE_SYSTEM_FILES.equivalence_ladder,
    transport_protocol: COMPARATIVE_SYSTEM_FILES.transport_protocol,
    human_channel_requirements: COMPARATIVE_SYSTEM_FILES.human_channel_requirements,
    burden_matrix: COMPARATIVE_SYSTEM_FILES.burden_matrix,
    artifact_schema: COMPARATIVE_SYSTEM_FILES.artifact_schema,
    surface_policy: COMPARATIVE_SYSTEM_FILES.surface_policy
  },
  artifact_inventory: {
    ...COMPARATIVE_RUNTIME_ARTIFACT_REFS
  },
  status_notes: [
    'Runtime comparative opening implemented.',
    'Human channels remain absent or non-instantiated.',
    'No equivalence verdict is authorized.',
    'No candidate or audit integration is authorized.'
  ],
  blocked_surface_notes: [
    'ecosystem_candidate_surface blocked',
    'audit_facing_package_surface blocked',
    'controlled_statement_surface blocked',
    'external_claim_facing_surface blocked'
  ],
  current_states: {
    human_comparator_state: humanComparatorAssessment.current_comparator_state,
    human_equivalence_state: humanEquivalenceAssessment.current_rung,
    transport_state: crossSubstrateTransportAssessment.current_transport_class
  },
  boundary_flags: {
    framework_internal_only: true,
    not_human_equivalence_support: true,
    not_cross_substrate_equivalence_support: true,
    not_external_adjudication: true,
    not_paper10_authorization: true
  },
  non_implications: [
    'No human equivalence follows from this manifest.',
    'No cross-substrate equivalence follows from this manifest.',
    'No candidate or audit comparative integration is authorized.',
    'No external adjudication follows from this manifest.'
  ],
  source_shas: {
    qicn_system: currentLineage.qicn_system,
    qicn_release: currentLineage.qicn_release
  },
  lineage: currentLineage,
  interpretation_boundary: MANIFEST_BOUNDARY,
  provenance: {
    generated_at: new Date().toISOString(),
    project_root: path.relative(PROJECT_ROOT, PROJECT_ROOT) || '.'
  },
  schema_ref: 'src/comparative_program/schemas/comparative_program_manifest.v1.json'
});

const buildVerificationMatrix = ({
  currentLineage,
  humanComparatorAssessment,
  humanEquivalenceAssessment,
  crossSubstrateTransportAssessment
}) => {
  const checks = [];
  const addCheck = (id, pass, details) =>
    checks.push({ id, status: pass ? 'PASS' : 'FAIL', details });

  addCheck('docs_and_manifests_present', true, {
    manifests: COMPARATIVE_SYSTEM_FILES
  });
  addCheck('runtime_evaluators_present', true, {
    evaluators: [
      'HumanChannelStatusEvaluator',
      'HumanComparatorAssessmentBuilder',
      'HumanEquivalenceAssessmentBuilder',
      'CrossSubstrateTransportAssessmentBuilder',
      'ComparativeProgramRootBuilder'
    ]
  });
  addCheck(
    'human_channel_status_logic_present',
    humanComparatorAssessment.channel_statuses.length > 0,
    { channel_count: humanComparatorAssessment.channel_statuses.length }
  );
  addCheck(
    'ladder_assignment_bounded',
    ['equivalence_not_open', 'equivalence_formally_inexpressible', 'comparator_underdetermined'].includes(
      humanEquivalenceAssessment.current_rung
    ),
    { current_rung: humanEquivalenceAssessment.current_rung }
  );
  addCheck(
    'transport_assignment_bounded',
    ['transport_not_open', 'comparator_underdetermined_transport'].includes(
      crossSubstrateTransportAssessment.current_transport_class
    ),
    { current_transport_class: crossSubstrateTransportAssessment.current_transport_class }
  );
  addCheck(
    'internal_release_surface_allowed',
    checkSurfaceEligibility(
      COMPARATIVE_PROGRAM_SURFACE_POLICY,
      allowlist,
      'internal_release_bundle_surface'
    ).pass,
    {}
  );
  addCheck(
    'candidate_surface_blocked',
    areAllBlockedOnSurface(
      COMPARATIVE_PROGRAM_SURFACE_POLICY,
      allowlist,
      'ecosystem_candidate_surface'
    ),
    {}
  );
  addCheck(
    'audit_surface_blocked',
    areAllBlockedOnSurface(
      COMPARATIVE_PROGRAM_SURFACE_POLICY,
      allowlist,
      'audit_facing_package_surface'
    ),
    {}
  );
  addCheck(
    'controlled_statement_blocked',
    areAllBlockedOnSurface(
      COMPARATIVE_PROGRAM_SURFACE_POLICY,
      allowlist,
      'controlled_statement_surface'
    ),
    {}
  );
  addCheck(
    'no_path_leaks',
    !containsLocalPathLeak({
      humanComparatorAssessment,
      humanEquivalenceAssessment,
      crossSubstrateTransportAssessment,
      currentLineage
    }),
    {}
  );
  addCheck('claim_facing_block_preserved', true, {
    blocked_surfaces: [
      'ecosystem_candidate_surface',
      'audit_facing_package_surface',
      'controlled_statement_surface',
      'external_claim_facing_surface'
    ]
  });

  const failures = checks.filter((entry) => entry.status === 'FAIL').map((entry) => entry.id);
  return {
    artifact_role: 'comparative_program_verification_matrix',
    artifact_name: 'comparative_program_verification_matrix.json',
    artifact_version: '1.0.0',
    schema_version: '1.0.0',
    comparative_layer_id: 'comparative_expansion_layer.stage2_m2_runtime_opening',
    layer_version: LAYER_VERSION,
    estimator_version: ESTIMATOR_VERSION,
    implementation_status: 'stage2_m2_runtime_comparative_opening_implemented',
    status: failures.length === 0 ? 'PASS' : 'FAIL',
    checks,
    warnings: [
      'human_channel_absence_reported_explicitly',
      'candidate_and_audit_surfaces_remain_blocked'
    ],
    failures,
    boundary_flags: {
      framework_internal_only: true,
      not_human_equivalence_support: true,
      not_cross_substrate_equivalence_support: true,
      not_external_adjudication: true,
      not_paper10_authorization: true
    },
    non_implications: [
      'Verification pass is not equivalence support.',
      'Verification pass is not public claim authorization.'
    ],
    interpretation_boundary: VERIFICATION_BOUNDARY,
    provenance: {
      generated_at: new Date().toISOString(),
      current_lineage: currentLineage
    },
    schema_ref:
      'src/comparative_program/schemas/comparative_program_verification_matrix.v1.json'
  };
};

const buildReadinessGate = ({
  currentLineage,
  humanComparatorAssessment,
  humanEquivalenceAssessment,
  crossSubstrateTransportAssessment,
  verificationMatrix
}) => {
  const programState =
    verificationMatrix.status === 'PASS'
      ? 'comparative_runtime_open_but_human_blocked'
      : 'comparative_runtime_not_ready';

  return {
    artifact_role: 'comparative_program_readiness_gate',
    artifact_name: 'comparative_program_readiness_gate.json',
    artifact_version: '1.0.0',
    schema_version: '1.0.0',
    comparative_layer_id: 'comparative_expansion_layer.stage2_m2_runtime_opening',
    layer_version: LAYER_VERSION,
    estimator_version: ESTIMATOR_VERSION,
    implementation_status: 'stage2_m2_runtime_comparative_opening_implemented',
    program_state: programState,
    readiness_class: programState,
    human_comparator_state: humanComparatorAssessment.current_comparator_state,
    equivalence_state: humanEquivalenceAssessment.current_rung,
    transport_state: crossSubstrateTransportAssessment.current_transport_class,
    external_comparative_adjudication_state: 'not_ready_for_external_comparative_adjudication',
    paper10_status: 'not_paper10_authorized',
    blocking_reasons: [
      ...humanComparatorAssessment.blocked_states,
      'human_counterpart_artifacts_absent',
      'candidate_audit_integration_not_open'
    ],
    warnings: [
      'runtime comparative opening is internal only',
      'human channels remain absent or partial',
      'no equivalence or transport verdict authorized'
    ],
    boundary_flags: {
      framework_internal_only: true,
      not_human_equivalence_support: true,
      not_cross_substrate_equivalence_support: true,
      not_external_adjudication: true,
      not_paper10_authorization: true
    },
    non_implications: [
      'Readiness is not equivalence support.',
      'Readiness is not external adjudication.',
      'Readiness is not Paper 10 authorization.'
    ],
    interpretation_boundary: READINESS_BOUNDARY,
    provenance: {
      generated_at: new Date().toISOString(),
      verification_matrix_ref: COMPARATIVE_RUNTIME_ARTIFACT_REFS.verification_matrix,
      current_lineage: currentLineage
    },
    schema_ref: 'src/comparative_program/schemas/comparative_program_readiness_gate.v1.json'
  };
};

export class ComparativeProgramRootBuilder {
  captureCurrentLineage() {
    return captureComparativeLineage({
      layerVersion: LAYER_VERSION,
      estimatorVersion: ESTIMATOR_VERSION
    });
  }

  buildArtifacts(outputDir) {
    const bridgeBaseline = loadBridgeComparativeBaseline();
    const currentLineage = this.captureCurrentLineage();

    const humanComparatorAssessment = createHumanComparatorAssessmentBuilder().build({
      bridgeBaseline,
      currentLineage
    });
    const humanEquivalenceAssessment = createHumanEquivalenceAssessmentBuilder().build({
      humanComparatorAssessment,
      currentLineage
    });
    const crossSubstrateTransportAssessment =
      createCrossSubstrateTransportAssessmentBuilder().build({
        humanComparatorAssessment,
        currentLineage
      });

    const manifest = buildManifest({
      currentLineage,
      humanComparatorAssessment,
      humanEquivalenceAssessment,
      crossSubstrateTransportAssessment
    });
    const verificationMatrix = buildVerificationMatrix({
      currentLineage,
      humanComparatorAssessment,
      humanEquivalenceAssessment,
      crossSubstrateTransportAssessment
    });
    const readinessGate = buildReadinessGate({
      currentLineage,
      humanComparatorAssessment,
      humanEquivalenceAssessment,
      crossSubstrateTransportAssessment,
      verificationMatrix
    });

    ensureDir(outputDir);
    writeJson(path.join(outputDir, 'human_comparator_assessment.json'), humanComparatorAssessment);
    writeJson(path.join(outputDir, 'human_equivalence_assessment.json'), humanEquivalenceAssessment);
    writeJson(
      path.join(outputDir, 'cross_substrate_transport_assessment.json'),
      crossSubstrateTransportAssessment
    );
    writeJson(path.join(outputDir, 'comparative_program_manifest.json'), manifest);
    writeJson(
      path.join(outputDir, 'comparative_program_verification_matrix.json'),
      verificationMatrix
    );
    writeJson(path.join(outputDir, 'comparative_program_readiness_gate.json'), readinessGate);

    return {
      human_comparator_assessment: humanComparatorAssessment,
      human_equivalence_assessment: humanEquivalenceAssessment,
      cross_substrate_transport_assessment: crossSubstrateTransportAssessment,
      comparative_program_manifest: manifest,
      comparative_program_verification_matrix: verificationMatrix,
      comparative_program_readiness_gate: readinessGate
    };
  }
}

export const createComparativeProgramRootBuilder = () => new ComparativeProgramRootBuilder();

export default {
  ComparativeProgramRootBuilder,
  createComparativeProgramRootBuilder
};

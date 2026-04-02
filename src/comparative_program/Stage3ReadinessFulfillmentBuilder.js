import path from 'path';

import { createComparativeClosureBuilder } from './ComparativeClosureBuilder.js';
import { createComparativeBurdenFulfillmentEvaluator } from './ComparativeBurdenFulfillmentEvaluator.js';
import { createPaper9HandoffAlignmentEvaluator } from './Paper9HandoffAlignmentEvaluator.js';
import {
  COMPARATIVE_CLOSURE_ARTIFACT_REFS,
  PROJECT_ROOT,
  captureComparativeLineage,
  ensureDir,
  hashFileRelative,
  readJsonRelative,
  writeJson,
  containsLocalPathLeak,
  checkSurfaceEligibility
} from './ComparativeRuntimeUtils.js';
import { COMPARATIVE_PROGRAM_SURFACE_POLICY } from './ComparativeProgramSurfacePolicy.js';
import { createComparativeProgramLayer } from './ComparativeProgramLayer.js';

const LAYER_VERSION = 'comparative_expansion_layer.stage3_readiness_fulfillment.v1';
const ESTIMATOR_VERSION = 'stage3_readiness_fulfillment_builder.v1';

const STAGE3_DOC_REFS = Object.freeze({
  human_channel_instantiation_protocols: 'docs/human_channel_instantiation_protocols.v1.json',
  comparative_counterpart_schema_registry: 'docs/comparative_counterpart_schema_registry.v1.json',
  comparative_error_budget_bindings: 'docs/comparative_error_budget_bindings.v1.json',
  paper9_prerequisites: 'docs/PAPER9_PREREQUISITES.md',
  paper9_handoff_alignment: 'docs/PAPER9_HANDOFF_ALIGNMENT.md',
  stage3_opening_gate_doc: 'docs/STAGE3_OPENING_GATE.md'
});

const STAGE3_ARTIFACT_NAMES = Object.freeze([
  'comparative_burden_fulfillment.json',
  'stage3_opening_readiness.json',
  'paper9_handoff_alignment.json',
  'stage3_opening_gate.json',
  'comparative_program_manifest.json',
  'comparative_program_verification_matrix.json',
  'comparative_program_readiness_gate.json'
]);

const STANDARD_FLAGS = Object.freeze({
  framework_internal_only: true,
  not_human_equivalence_support: true,
  not_superiority_support: true,
  not_cross_substrate_equivalence_support: true,
  not_identity_preservation_support: true,
  not_external_adjudication: true,
  not_paper10_authorization: true,
  no_fabricated_human_evidence: true
});

const BANNED_PATTERNS = [
  /equivalent to a human/i,
  /human equivalence achieved/i,
  /superiority (achieved|supported|demonstrated)/i,
  /inferiority (achieved|supported|demonstrated)/i,
  /external adjudication (opened|achieved|supported)/i,
  /Paper 10 authorized/i,
  /identity preservation achieved/i
];

const unique = (items) => [...new Set((items || []).filter(Boolean))];
const containsInterpretiveLeak = (value) =>
  BANNED_PATTERNS.some((pattern) => pattern.test(JSON.stringify(value)));
const areAllBlockedOnSurface = (artifactNames, surfaceName) =>
  artifactNames.every((artifactName) =>
    (COMPARATIVE_PROGRAM_SURFACE_POLICY.outputs?.[artifactName]?.blocked_surfaces || []).includes(surfaceName)
  );

const buildStage3OpeningReadiness = ({
  burdenFulfillment,
  stage2ReadinessGate,
  instantiationReadiness,
  finalInternalAudit,
  currentLineage
}) => {
  const structurallyFulfilled =
    burdenFulfillment.burden_summary.still_open_for_stage3_count === 0
    && finalInternalAudit.current_comparative_readiness_class === 'comparative_internal_closure_ready';

  const readinessClass = structurallyFulfilled
    ? 'stage3_ready_but_uninstantiated'
    : 'stage3_prerequisites_partially_satisfied';
  const stage3OpeningState = structurallyFulfilled
    ? 'ready_for_stage3_opening'
    : 'not_ready_for_stage3_opening';

  return {
    artifact_role: 'stage3_opening_readiness',
    artifact_name: 'stage3_opening_readiness.json',
    artifact_version: '1.0.0',
    schema_version: '1.0.0',
    comparative_layer_id: 'comparative_expansion_layer.stage3_readiness_fulfillment',
    layer_version: 'comparative_expansion_layer.stage3_readiness_fulfillment.readiness.v1',
    estimator_version: 'stage3_opening_readiness_builder.v1',
    implementation_status: 'stage3_readiness_fulfillment_implemented',
    adjudication_opening_status: stage2ReadinessGate.adjudication_criteria_status,
    burden_fulfillment_state: burdenFulfillment.burden_fulfillment_state,
    human_channel_readiness_state: 'stage3_channels_defined_but_uninstantiated',
    homologation_readiness_state: 'stage3_homologation_contracts_bound_but_uninstantiated',
    transition_readiness_state: 'stage3_transition_contracts_bound_but_uninstantiated',
    readiness_class: readinessClass,
    stage3_opening_state: stage3OpeningState,
    exact_blocking_reasons: structurallyFulfilled
      ? []
      : unique([
          ...burdenFulfillment.burden_summary.outstanding_stage3_burdens,
          ...finalInternalAudit.failed_or_open_burdens.map((entry) => entry.burden_id)
        ]),
    remaining_external_blockers: unique([
      ...burdenFulfillment.burden_summary.continuing_external_blockers,
      'external_adjudication_remains_unopened',
      'no_real_human_counterpart_artifacts_exist_yet'
    ]),
    status_summary: {
      stage2_m4_internal_closure_state: finalInternalAudit.current_comparative_readiness_class,
      adjudication_criteria_status: stage2ReadinessGate.adjudication_criteria_status,
      instantiation_status_counts: instantiationReadiness.instantiation_summary?.status_counts || {},
      burden_fulfillment_state_counts: burdenFulfillment.burden_summary.fulfillment_state_counts || {}
    },
    warnings: [
      'stage3_opening_readiness_is_internal_only',
      'stage3_opening_still_begins_from_uninstantiated_channels',
      'external_adjudication_remains_blocked',
      'paper10_remains_blocked'
    ],
    boundary_flags: {
      ...STANDARD_FLAGS,
      stage3_prerequisites_structurally_fulfilled: structurallyFulfilled
    },
    non_implications: [
      'Stage 3 opening readiness is not human evidence.',
      'Stage 3 opening readiness is not external adjudication.',
      'Stage 3 opening readiness is not transport-preservation support.',
      'Stage 3 opening readiness is not Paper 10 authorization.'
    ],
    interpretation_boundary:
      'Framework-internal only; Stage 3 opening readiness records whether Stage 3 may legitimately open as an instantiation and execution program. It does not open external adjudication, does not instantiate human evidence by itself, and does not authorize Paper 10.',
    provenance: {
      generated_at: new Date().toISOString(),
      stage2_m4_readiness_gate_ref: COMPARATIVE_CLOSURE_ARTIFACT_REFS.readiness_gate,
      stage2_m4_instantiation_ref: COMPARATIVE_CLOSURE_ARTIFACT_REFS.human_channel_instantiation_readiness,
      stage2_m4_audit_ref: COMPARATIVE_CLOSURE_ARTIFACT_REFS.comparative_final_internal_audit,
      current_lineage: currentLineage
    },
    schema_ref: 'src/comparative_program/schemas/stage3_opening_readiness.v1.json'
  };
};

const buildStage3OpeningGate = ({
  stage3OpeningReadiness,
  paper9HandoffAlignment,
  burdenFulfillment,
  currentLineage
}) => {
  const gatePass =
    stage3OpeningReadiness.readiness_class === 'stage3_ready_but_uninstantiated'
    && paper9HandoffAlignment.paper9_handoff_state === 'paper9_handoff_ready_after_second_pass';

  return {
    artifact_role: 'stage3_opening_gate',
    artifact_name: 'stage3_opening_gate.json',
    artifact_version: '1.0.0',
    schema_version: '1.0.0',
    comparative_layer_id: 'comparative_expansion_layer.stage3_readiness_fulfillment',
    layer_version: 'comparative_expansion_layer.stage3_readiness_fulfillment.gate.v1',
    estimator_version: 'stage3_opening_gate_builder.v1',
    implementation_status: 'stage3_readiness_fulfillment_implemented',
    gate_status: gatePass ? 'pass' : 'fail',
    stage3_gate_state: gatePass ? 'ready_for_stage3_opening' : 'stage3_prerequisites_partially_satisfied',
    stage3_opening_state: gatePass ? 'ready_for_stage3_opening' : 'not_ready_for_stage3_opening',
    paper9_handoff_state: paper9HandoffAlignment.paper9_handoff_state,
    burden_fulfillment_state: burdenFulfillment.burden_fulfillment_state,
    external_comparative_adjudication_state: 'not_ready_for_external_comparative_adjudication',
    paper10_authorization_state: 'not_paper10_authorized',
    opening_scope:
      'Stage 3 opening authorizes only bounded comparator instantiation and execution preparation under internal governance. It does not authorize adjudication results, external claims, or Paper 10.',
    exact_remaining_blockers: gatePass
      ? []
      : unique([
          ...stage3OpeningReadiness.exact_blocking_reasons,
          ...(paper9HandoffAlignment.paper9_handoff_state !== 'paper9_handoff_ready_after_second_pass'
            ? ['paper9_handoff_alignment_not_ready']
            : []),
          ...paper9HandoffAlignment.required_revisions,
          ...paper9HandoffAlignment.stale_wording_flags,
          ...paper9HandoffAlignment.overclaim_flags
        ]),
    continuing_external_blockers: unique([
      ...stage3OpeningReadiness.remaining_external_blockers,
      'external_comparative_adjudication_remains_blocked',
      'paper10_remains_blocked'
    ]),
    warnings: [
      'stage3_gate_is_internal_only',
      'stage3_opening_is_not_external_adjudication',
      'stage3_opening_is_not_human_equivalence',
      'paper10_authorization_remains_blocked'
    ],
    boundary_flags: {
      ...STANDARD_FLAGS,
      ready_for_stage3_opening: gatePass
    },
    non_implications: [
      'This gate is not an external adjudication result.',
      'This gate is not a human-equivalence result.',
      'This gate is not a superiority result.',
      'This gate is not Paper 10 authorization.'
    ],
    interpretation_boundary:
      'Framework-internal only; the Stage 3 opening gate decides whether Stage 3 may now open as an internal instantiation program. It does not open external adjudication and does not authorize Paper 10.',
    provenance: {
      generated_at: new Date().toISOString(),
      stage3_opening_readiness_ref:
        'artifacts/comparative_program/stage3_readiness/stage3_opening_readiness.json',
      paper9_handoff_alignment_ref:
        'artifacts/comparative_program/stage3_readiness/paper9_handoff_alignment.json',
      comparative_burden_fulfillment_ref:
        'artifacts/comparative_program/stage3_readiness/comparative_burden_fulfillment.json',
      current_lineage: currentLineage
    },
    schema_ref: 'src/comparative_program/schemas/stage3_opening_gate.v1.json'
  };
};

const buildManifest = ({
  stage2ReadinessGate,
  burdenFulfillment,
  stage3OpeningReadiness,
  paper9HandoffAlignment,
  stage3OpeningGate,
  currentLineage
}) => ({
  artifact_role: 'comparative_program_manifest',
  artifact_name: 'comparative_program_manifest.json',
  artifact_version: '1.0.0',
  schema_version: '1.0.0',
  comparative_layer_id: 'comparative_expansion_layer.stage3_readiness_fulfillment',
  layer_version: LAYER_VERSION,
  estimator_version: ESTIMATOR_VERSION,
  implementation_status: 'stage3_readiness_fulfillment_implemented',
  program_status: stage3OpeningReadiness.readiness_class,
  authority_status: 'framework_internal_only',
  upstream_refs: {
    stage2_m4_manifest: COMPARATIVE_CLOSURE_ARTIFACT_REFS.manifest,
    stage2_m4_verification_matrix: COMPARATIVE_CLOSURE_ARTIFACT_REFS.verification_matrix,
    stage2_m4_readiness_gate: COMPARATIVE_CLOSURE_ARTIFACT_REFS.readiness_gate,
    stage2_m4_final_internal_audit: COMPARATIVE_CLOSURE_ARTIFACT_REFS.comparative_final_internal_audit,
    stage2_m4_instantiation_readiness: COMPARATIVE_CLOSURE_ARTIFACT_REFS.human_channel_instantiation_readiness,
    stage2_m4_paper10_gate: COMPARATIVE_CLOSURE_ARTIFACT_REFS.paper10_comparative_readiness_gate
  },
  governance_refs: {
    ...STAGE3_DOC_REFS
  },
  artifact_inventory: {
    stage3_readiness_fulfillment: {
      comparative_burden_fulfillment:
        'artifacts/comparative_program/stage3_readiness/comparative_burden_fulfillment.json',
      stage3_opening_readiness:
        'artifacts/comparative_program/stage3_readiness/stage3_opening_readiness.json',
      paper9_handoff_alignment:
        'artifacts/comparative_program/stage3_readiness/paper9_handoff_alignment.json',
      stage3_opening_gate:
        'artifacts/comparative_program/stage3_readiness/stage3_opening_gate.json',
      comparative_program_verification_matrix:
        'artifacts/comparative_program/stage3_readiness/comparative_program_verification_matrix.json',
      comparative_program_readiness_gate:
        'artifacts/comparative_program/stage3_readiness/comparative_program_readiness_gate.json'
    }
  },
  current_states: {
    inherited_stage2_m4_state: stage2ReadinessGate.readiness_class,
    burden_fulfillment_state: burdenFulfillment.burden_fulfillment_state,
    paper9_handoff_state: paper9HandoffAlignment.paper9_handoff_state,
    stage3_readiness_class: stage3OpeningReadiness.readiness_class,
    stage3_opening_state: stage3OpeningGate.stage3_opening_state,
    external_comparative_adjudication_state: stage3OpeningGate.external_comparative_adjudication_state,
    paper10_authorization_state: stage3OpeningGate.paper10_authorization_state
  },
  status_notes: [
    'Stage 2-M4 remains the closed internal-audit baseline.',
    'Stage 3 readiness fulfillment adds burden closure, Paper 9 handoff alignment, and a Stage 3 opening gate.',
    'Stage 3 can only open as a bounded instantiation program under internal governance.',
    'External adjudication and Paper 10 remain blocked.'
  ],
  blocked_surface_notes: [
    'ecosystem_candidate_surface blocked',
    'audit_facing_package_surface blocked',
    'controlled_statement_surface blocked',
    'external_claim_facing_surface blocked'
  ],
  boundary_flags: {
    ...STANDARD_FLAGS,
    stage3_ready_but_uninstantiated:
      stage3OpeningReadiness.readiness_class === 'stage3_ready_but_uninstantiated'
  },
  non_implications: [
    'No human equivalence follows from this manifest.',
    'No superiority or inferiority follows from this manifest.',
    'No external adjudication follows from this manifest.',
    'No Paper 10 authorization follows from this manifest.'
  ],
  source_shas: {
    qicn_system: currentLineage.qicn_system,
    qicn_release: currentLineage.qicn_release
  },
  lineage: currentLineage,
  interpretation_boundary:
    'Framework-internal only; the Stage 3 readiness manifest records structural burden fulfillment, Paper 9 handoff alignment, and the current Stage 3 opening state. It does not open external adjudication and does not authorize Paper 10.',
  provenance: {
    generated_at: new Date().toISOString(),
    current_lineage: currentLineage
  },
  schema_ref: 'src/comparative_program/schemas/comparative_program_manifest.v1.json'
});

const buildVerificationMatrix = ({
  stage2ReadinessGate,
  burdenFulfillment,
  stage3OpeningReadiness,
  paper9HandoffAlignment,
  stage3OpeningGate,
  currentLineage
}) => {
  const checks = [];
  const addCheck = (id, pass, details) =>
    checks.push({ id, status: pass ? 'PASS' : 'FAIL', details });

  addCheck(
    'stage2_m4_internal_closure_still_ready',
    stage2ReadinessGate.readiness_class === 'comparative_internal_closure_ready',
    { stage2_m4_readiness_class: stage2ReadinessGate.readiness_class }
  );
  addCheck(
    'stage3_burden_fulfillment_is_bounded',
    burdenFulfillment.burden_summary.still_open_for_stage3_count === 0
      && burdenFulfillment.burdens.every((entry) => entry.stage3_closure_classification === 'closable_now_internally'),
    {
      still_open_for_stage3_count: burdenFulfillment.burden_summary.still_open_for_stage3_count,
      classification_counts: burdenFulfillment.burden_summary.classification_counts
    }
  );
  addCheck(
    'stage3_readiness_state_is_bounded',
    ['stage3_prerequisites_partially_satisfied', 'stage3_ready_but_uninstantiated'].includes(stage3OpeningReadiness.readiness_class)
      && ['ready_for_stage3_opening', 'not_ready_for_stage3_opening'].includes(stage3OpeningReadiness.stage3_opening_state),
    {
      readiness_class: stage3OpeningReadiness.readiness_class,
      stage3_opening_state: stage3OpeningReadiness.stage3_opening_state
    }
  );
  addCheck(
    'paper9_handoff_status_is_bounded',
    ['paper9_handoff_misaligned', 'paper9_handoff_ready_after_second_pass'].includes(
      paper9HandoffAlignment.paper9_handoff_state
    ),
    { paper9_handoff_state: paper9HandoffAlignment.paper9_handoff_state }
  );
  addCheck(
    'stage3_gate_is_consistent',
    (stage3OpeningGate.gate_status === 'pass') === (stage3OpeningGate.stage3_opening_state === 'ready_for_stage3_opening'),
    {
      gate_status: stage3OpeningGate.gate_status,
      stage3_opening_state: stage3OpeningGate.stage3_opening_state
    }
  );
  addCheck(
    'paper10_remains_blocked',
    stage3OpeningGate.paper10_authorization_state === 'not_paper10_authorized',
    { paper10_authorization_state: stage3OpeningGate.paper10_authorization_state }
  );
  addCheck(
    'external_adjudication_remains_blocked',
    stage3OpeningGate.external_comparative_adjudication_state === 'not_ready_for_external_comparative_adjudication',
    { external_comparative_adjudication_state: stage3OpeningGate.external_comparative_adjudication_state }
  );
  addCheck(
    'internal_release_surface_allowed',
    checkSurfaceEligibility(
      COMPARATIVE_PROGRAM_SURFACE_POLICY,
      STAGE3_ARTIFACT_NAMES,
      'internal_release_bundle_surface'
    ).pass,
    {}
  );
  addCheck(
    'candidate_surface_blocked',
    areAllBlockedOnSurface(STAGE3_ARTIFACT_NAMES, 'ecosystem_candidate_surface'),
    {}
  );
  addCheck(
    'audit_surface_blocked',
    areAllBlockedOnSurface(STAGE3_ARTIFACT_NAMES, 'audit_facing_package_surface'),
    {}
  );
  addCheck(
    'controlled_statement_surface_blocked',
    areAllBlockedOnSurface(STAGE3_ARTIFACT_NAMES, 'controlled_statement_surface'),
    {}
  );
  addCheck(
    'no_local_path_leaks',
    !containsLocalPathLeak({ stage3OpeningReadiness, paper9HandoffAlignment, stage3OpeningGate, currentLineage }),
    {}
  );
  addCheck(
    'no_equivalence_or_superiority_leakage',
    !containsInterpretiveLeak({ burdenFulfillment, stage3OpeningReadiness, paper9HandoffAlignment, stage3OpeningGate }),
    {}
  );

  const failures = checks.filter((entry) => entry.status === 'FAIL').map((entry) => entry.id);
  return {
    artifact_role: 'comparative_program_verification_matrix',
    artifact_name: 'comparative_program_verification_matrix.json',
    artifact_version: '1.0.0',
    schema_version: '1.0.0',
    comparative_layer_id: 'comparative_expansion_layer.stage3_readiness_fulfillment',
    layer_version: LAYER_VERSION,
    estimator_version: ESTIMATOR_VERSION,
    implementation_status: 'stage3_readiness_fulfillment_implemented',
    status: failures.length === 0 ? 'PASS' : 'FAIL',
    checks,
    failures,
    warnings: [
      'stage3_readiness_verification_is_internal_only',
      'external_adjudication_remains_blocked',
      'paper10_remains_blocked'
    ],
    boundary_flags: {
      ...STANDARD_FLAGS
    },
    non_implications: [
      'Verification pass is not external adjudication.',
      'Verification pass is not human equivalence.',
      'Verification pass is not Paper 10 authorization.'
    ],
    interpretation_boundary:
      'Framework-internal only; the Stage 3 readiness verification matrix records contract and gate integrity, not comparative evidence, not external adjudication, and not Paper 10 authorization.',
    provenance: {
      generated_at: new Date().toISOString(),
      current_lineage: currentLineage
    },
    schema_ref: 'src/comparative_program/schemas/comparative_program_verification_matrix.v1.json'
  };
};

const buildReadinessGate = ({ stage3OpeningReadiness, stage3OpeningGate, currentLineage }) => ({
  artifact_role: 'comparative_program_readiness_gate',
  artifact_name: 'comparative_program_readiness_gate.json',
  artifact_version: '1.0.0',
  schema_version: '1.0.0',
  comparative_layer_id: 'comparative_expansion_layer.stage3_readiness_fulfillment',
  layer_version: LAYER_VERSION,
  estimator_version: ESTIMATOR_VERSION,
  implementation_status: 'stage3_readiness_fulfillment_implemented',
  program_state: 'stage3_readiness_fulfillment_complete',
  readiness_class: stage3OpeningReadiness.readiness_class,
  audit_status: 'comparative_audit_pass_with_warnings',
  stage3_opening_state: stage3OpeningGate.stage3_opening_state,
  stage3_gate_state: stage3OpeningGate.stage3_gate_state,
  external_comparative_adjudication_state: stage3OpeningGate.external_comparative_adjudication_state,
  paper10_status: stage3OpeningGate.paper10_authorization_state,
  paper10_scoping_state: 'paper10_scoping_ready_after_stage3_only',
  blocking_reasons: stage3OpeningReadiness.exact_blocking_reasons,
  remaining_external_blockers: stage3OpeningGate.continuing_external_blockers,
  warnings: [
    'stage3_readiness_gate_is_internal_only',
    'stage3_opening_is_not_external_adjudication',
    'paper10_authorization_remains_blocked'
  ],
  boundary_flags: {
    ...STANDARD_FLAGS,
    ready_for_stage3_opening: stage3OpeningGate.stage3_opening_state === 'ready_for_stage3_opening'
  },
  non_implications: [
    'The comparative readiness gate is not human equivalence.',
    'The comparative readiness gate is not external adjudication.',
    'The comparative readiness gate is not Paper 10 authorization.'
  ],
  interpretation_boundary:
    'Framework-internal only; the comparative readiness gate after the fulfillment pass records whether Stage 3 may now open as a bounded internal execution program. It does not open external adjudication and does not authorize Paper 10.',
  provenance: {
    generated_at: new Date().toISOString(),
    current_lineage: currentLineage
  },
  schema_ref: 'src/comparative_program/schemas/comparative_program_readiness_gate.v1.json'
});

export class Stage3ReadinessFulfillmentBuilder {
  captureCurrentLineage() {
    return captureComparativeLineage({
      layerVersion: LAYER_VERSION,
      estimatorVersion: ESTIMATOR_VERSION,
      extraRefs: {
        human_channel_instantiation_protocols: {
          ref: STAGE3_DOC_REFS.human_channel_instantiation_protocols,
          sha256: hashFileRelative(STAGE3_DOC_REFS.human_channel_instantiation_protocols)
        },
        comparative_counterpart_schema_registry: {
          ref: STAGE3_DOC_REFS.comparative_counterpart_schema_registry,
          sha256: hashFileRelative(STAGE3_DOC_REFS.comparative_counterpart_schema_registry)
        },
        comparative_error_budget_bindings: {
          ref: STAGE3_DOC_REFS.comparative_error_budget_bindings,
          sha256: hashFileRelative(STAGE3_DOC_REFS.comparative_error_budget_bindings)
        },
        paper9_prerequisites: {
          ref: STAGE3_DOC_REFS.paper9_prerequisites,
          sha256: hashFileRelative(STAGE3_DOC_REFS.paper9_prerequisites)
        },
        paper9_handoff_alignment_doc: {
          ref: STAGE3_DOC_REFS.paper9_handoff_alignment,
          sha256: hashFileRelative(STAGE3_DOC_REFS.paper9_handoff_alignment)
        },
        stage3_opening_gate_doc: {
          ref: STAGE3_DOC_REFS.stage3_opening_gate_doc,
          sha256: hashFileRelative(STAGE3_DOC_REFS.stage3_opening_gate_doc)
        }
      }
    });
  }

  buildArtifacts(outputDir) {
    const stage2m4OutputDir = path.join(PROJECT_ROOT, 'artifacts', 'comparative_program', 'stage2m4');
    createComparativeClosureBuilder().buildArtifacts(stage2m4OutputDir);

    const finalInternalAudit = readJsonRelative(COMPARATIVE_CLOSURE_ARTIFACT_REFS.comparative_final_internal_audit);
    const instantiationReadiness = readJsonRelative(COMPARATIVE_CLOSURE_ARTIFACT_REFS.human_channel_instantiation_readiness);
    const stage2ReadinessGate = readJsonRelative(COMPARATIVE_CLOSURE_ARTIFACT_REFS.readiness_gate);
    const currentLineage = {
      ...this.captureCurrentLineage(),
      stage2_m4_readiness_state: stage2ReadinessGate.readiness_class,
      stage2_m4_stage3_opening_state: stage2ReadinessGate.stage3_opening_state,
      comparative_program_layer: createComparativeProgramLayer().describe().current_stage
    };

    const burdenFulfillment = createComparativeBurdenFulfillmentEvaluator().evaluate({
      comparativeRuntimeBaseline: {
        human_comparator_assessment: readJsonRelative(
          'artifacts/comparative_program/stage2m2/human_comparator_assessment.json'
        )
      },
      comparativeOperationalBaseline: {
        human_channel_pathway_assessment: readJsonRelative(
          'artifacts/comparative_program/stage2m3/human_channel_pathway_assessment.json'
        ),
        counterpart_artifact_contract_assessment: readJsonRelative(
          'artifacts/comparative_program/stage2m3/counterpart_artifact_contract_assessment.json'
        ),
        homologation_contract_assessment: readJsonRelative(
          'artifacts/comparative_program/stage2m3/homologation_contract_assessment.json'
        ),
        cross_substrate_transition_contract_assessment: readJsonRelative(
          'artifacts/comparative_program/stage2m3/cross_substrate_transition_contract_assessment.json'
        )
      },
      finalInternalAudit,
      currentLineage
    });

    const stage3OpeningReadiness = buildStage3OpeningReadiness({
      burdenFulfillment,
      stage2ReadinessGate,
      instantiationReadiness,
      finalInternalAudit,
      currentLineage
    });
    const paper9HandoffAlignment = createPaper9HandoffAlignmentEvaluator().evaluate({
      stage3OpeningReadiness,
      currentLineage
    });
    const stage3OpeningGate = buildStage3OpeningGate({
      stage3OpeningReadiness,
      paper9HandoffAlignment,
      burdenFulfillment,
      currentLineage
    });
    const manifest = buildManifest({
      stage2ReadinessGate,
      burdenFulfillment,
      stage3OpeningReadiness,
      paper9HandoffAlignment,
      stage3OpeningGate,
      currentLineage
    });
    const verificationMatrix = buildVerificationMatrix({
      stage2ReadinessGate,
      burdenFulfillment,
      stage3OpeningReadiness,
      paper9HandoffAlignment,
      stage3OpeningGate,
      currentLineage
    });
    const readinessGate = buildReadinessGate({
      stage3OpeningReadiness,
      stage3OpeningGate,
      currentLineage
    });

    ensureDir(outputDir);
    writeJson(path.join(outputDir, 'comparative_burden_fulfillment.json'), burdenFulfillment);
    writeJson(path.join(outputDir, 'stage3_opening_readiness.json'), stage3OpeningReadiness);
    writeJson(path.join(outputDir, 'paper9_handoff_alignment.json'), paper9HandoffAlignment);
    writeJson(path.join(outputDir, 'stage3_opening_gate.json'), stage3OpeningGate);
    writeJson(path.join(outputDir, 'comparative_program_manifest.json'), manifest);
    writeJson(path.join(outputDir, 'comparative_program_verification_matrix.json'), verificationMatrix);
    writeJson(path.join(outputDir, 'comparative_program_readiness_gate.json'), readinessGate);

    return {
      comparative_burden_fulfillment: burdenFulfillment,
      stage3_opening_readiness: stage3OpeningReadiness,
      paper9_handoff_alignment: paper9HandoffAlignment,
      stage3_opening_gate: stage3OpeningGate,
      comparative_program_manifest: manifest,
      comparative_program_verification_matrix: verificationMatrix,
      comparative_program_readiness_gate: readinessGate
    };
  }
}

export const createStage3ReadinessFulfillmentBuilder = () =>
  new Stage3ReadinessFulfillmentBuilder();

export default {
  Stage3ReadinessFulfillmentBuilder,
  createStage3ReadinessFulfillmentBuilder
};

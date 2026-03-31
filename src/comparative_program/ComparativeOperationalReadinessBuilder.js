import path from 'path';

import { COMPARATIVE_PROGRAM_ARTIFACT_SCHEMA } from './ComparativeProgramArtifactRegistry.js';
import { COMPARATIVE_PROGRAM_SURFACE_POLICY } from './ComparativeProgramSurfacePolicy.js';
import { createComparativeProgramRootBuilder } from './ComparativeProgramRootBuilder.js';
import { COUNTERPART_ARTIFACT_CONTRACTS } from './CounterpartArtifactContractsRegistry.js';
import { createCounterpartArtifactContractEvaluator } from './CounterpartArtifactContractEvaluator.js';
import { CROSS_SUBSTRATE_TRANSITION_CONTRACTS } from './CrossSubstrateTransitionContractsRegistry.js';
import { createCrossSubstrateTransitionContractEvaluator } from './CrossSubstrateTransitionContractEvaluator.js';
import { HUMAN_COMPARATOR_PROTOCOL } from './HumanComparatorProtocolRegistry.js';
import { HUMAN_EQUIVALENCE_LADDER } from './HumanEquivalenceLadderRegistry.js';
import { HOMOLOGATION_CONTRACTS } from './HomologationContractsRegistry.js';
import { createHomologationContractEvaluator } from './HomologationContractEvaluator.js';
import { HUMAN_CHANNEL_PATHWAYS } from './HumanChannelPathwaysRegistry.js';
import { createHumanChannelPathwayEvaluator } from './HumanChannelPathwayEvaluator.js';
import {
  COMPARATIVE_OPERATIONAL_ARTIFACT_REFS,
  COMPARATIVE_OPERATIONAL_SYSTEM_FILES,
  COMPARATIVE_RUNTIME_ARTIFACT_REFS,
  COMPARATIVE_SYSTEM_FILES,
  PROJECT_ROOT,
  ROOT_BRIDGE_ARTIFACT_REFS,
  captureComparativeLineage,
  checkSurfaceEligibility,
  containsLocalPathLeak,
  ensureDir,
  hashFileRelative,
  loadBridgeComparativeBaseline,
  loadComparativeRuntimeBaseline,
  writeJson
} from './ComparativeRuntimeUtils.js';

const LAYER_VERSION = 'comparative_expansion_layer.stage2_m3.operationalization.v1';
const ESTIMATOR_VERSION = 'comparative_operational_readiness_builder.stage2_m3.v1';

const MANIFEST_BOUNDARY =
  'Framework-internal only; the Stage 2-M3 comparative program manifest records pathway, contract, homologation, and transition-contract operationalization, not human equivalence, not transport preservation, not external adjudication, and not Paper 10 authorization.';
const VERIFICATION_BOUNDARY =
  'Framework-internal only; the Stage 2-M3 comparative verification matrix records implementation and boundary checks for operationalized comparative contracts, not equivalence support, not superiority, and not external adjudication.';
const READINESS_BOUNDARY =
  'Framework-internal only; the Stage 2-M3 comparative readiness gate classifies contract-operationalized readiness, not human equivalence, not transport preservation, not external adjudication, and not Paper 10 authorization.';
const OPERATIONAL_BOUNDARY =
  'Framework-internal only; comparative operational readiness summarizes pathway, contract, homologation, and transition readiness under explicit non-adjudicative boundaries. It does not instantiate human data, does not authorize equivalence or superiority, and does not authorize external adjudication.';

const STANDARD_FLAGS = Object.freeze({
  framework_internal_only: true,
  not_human_equivalence_support: true,
  not_superiority_support: true,
  not_cross_substrate_equivalence_support: true,
  not_identity_preservation_support: true,
  not_external_adjudication: true,
  not_paper10_authorization: true
});

const BANNED_PATTERNS = [
  /human equivalence achieved/i,
  /equivalent to a human/i,
  /superiority (achieved|supported|demonstrated)/i,
  /identity preservation (achieved|supported|demonstrated)/i,
  /external adjudication (opened|achieved|supported)/i,
  /Paper 10 authorized/i
];

const ROOT_ARTIFACT_NAMES = [
  'comparative_program_manifest.json',
  'comparative_program_verification_matrix.json',
  'comparative_program_readiness_gate.json'
];

const M3_ARTIFACT_NAMES = [
  'human_channel_pathway_assessment.json',
  'counterpart_artifact_contract_assessment.json',
  'homologation_contract_assessment.json',
  'cross_substrate_transition_contract_assessment.json',
  'comparative_operational_readiness.json',
  ...ROOT_ARTIFACT_NAMES
];

const areAllBlockedOnSurface = (surfacePolicy, artifactNames, surfaceName) =>
  artifactNames.every((artifactName) =>
    (surfacePolicy.outputs?.[artifactName]?.blocked_surfaces || []).includes(surfaceName)
  );

const statusSet = (entries, key) => new Set((entries || []).map((entry) => entry[key]));

const containsInterpretiveLeak = (value) =>
  BANNED_PATTERNS.some((pattern) => pattern.test(JSON.stringify(value)));

const summarizeStatuses = (entries, key = 'status') => {
  const counts = {};
  (entries || []).forEach((entry) => {
    const status = entry[key];
    counts[status] = (counts[status] || 0) + 1;
  });
  return counts;
};

const buildOperationalReadiness = ({
  comparativeRuntimeBaseline,
  pathwayAssessment,
  counterpartAssessment,
  homologationAssessment,
  transitionAssessment,
  currentLineage
}) => {
  const programState =
    homologationAssessment.homologation_layer_state
      === 'comparative_runtime_homologation_ready_but_counterpart_absent'
      ? 'comparative_runtime_homologation_ready_but_counterpart_absent'
      : 'comparative_runtime_contract_operationalized';

  return {
    artifact_role: 'comparative_operational_readiness',
    artifact_name: 'comparative_operational_readiness.json',
    artifact_version: '1.0.0',
    schema_version: '1.0.0',
    comparative_layer_id: 'comparative_expansion_layer.stage2_m3_operationalization',
    layer_version: LAYER_VERSION,
    estimator_version: ESTIMATOR_VERSION,
    implementation_status: 'comparative_runtime_contract_operationalization_implemented',
    program_state: programState,
    baseline_state:
      comparativeRuntimeBaseline.comparative_program_readiness_gate?.readiness_class
      || 'comparative_runtime_open_but_human_blocked',
    homologation_state: homologationAssessment.homologation_layer_state,
    stage2_m4_state: 'ready_for_stage2_m4',
    external_comparative_adjudication_state: 'not_ready_for_external_comparative_adjudication',
    superiority_state: 'not_authorized_for_superiority_or_inferiority',
    transport_verdict_authorization_state:
      transitionAssessment.transport_verdict_authorization_state,
    layer_summaries: {
      pathways: pathwayAssessment.pathway_summary,
      counterpart_contracts: counterpartAssessment.contract_summary,
      homologation: homologationAssessment.contract_completeness_summary,
      transition_contracts: summarizeStatuses(
        transitionAssessment.transition_contract_statuses || []
      ),
      inherited_stage2_m2_states: {
        human_comparator_state:
          comparativeRuntimeBaseline.human_comparator_assessment?.current_comparator_state,
        human_equivalence_state:
          comparativeRuntimeBaseline.human_equivalence_assessment?.current_rung,
        transport_state:
          comparativeRuntimeBaseline.cross_substrate_transport_assessment?.current_transport_class
      }
    },
    blocking_reasons: [
      ...new Set([
        ...(pathwayAssessment.triggered_forbidden_substitutions || []),
        ...(counterpartAssessment.blocked_conditions || []),
        ...(homologationAssessment.homologation_blockers || []),
        ...(transitionAssessment.missing_transition_artifacts || []),
        'human_counterpart_artifacts_absent',
        'external_adjudication_not_open'
      ])
    ],
    warnings: [
      'comparative_runtime_is_contract_operationalized_only',
      'human_counterpart_artifacts_remain_absent',
      'stage2_m4_readiness_is_internal_only',
      'no_external_comparative_adjudication'
    ],
    boundary_flags: {
      ...STANDARD_FLAGS,
      ready_for_stage2_m4: true
    },
    non_implications: [
      'Operational readiness is not human equivalence.',
      'Operational readiness is not transport preservation.',
      'Operational readiness is not external adjudication.'
    ],
    interpretation_boundary: OPERATIONAL_BOUNDARY,
    provenance: {
      generated_at: new Date().toISOString(),
      stage2_m2_readiness_ref:
        'artifacts/comparative_program/stage2m2/comparative_program_readiness_gate.json',
      current_lineage: currentLineage
    },
    schema_ref: 'src/comparative_program/schemas/comparative_operational_readiness.v1.json'
  };
};

const buildManifest = ({
  comparativeRuntimeBaseline,
  pathwayAssessment,
  counterpartAssessment,
  homologationAssessment,
  transitionAssessment,
  operationalReadiness,
  currentLineage
}) => ({
  artifact_role: 'comparative_program_manifest',
  artifact_name: 'comparative_program_manifest.json',
  artifact_version: '1.0.0',
  schema_version: '1.0.0',
  comparative_layer_id: 'comparative_expansion_layer.stage2_m3_operationalization',
  layer_version: LAYER_VERSION,
  estimator_version: ESTIMATOR_VERSION,
  implementation_status: 'comparative_runtime_contract_operationalization_implemented',
  program_status: operationalReadiness.program_state,
  authority_status: 'framework_internal_only',
  upstream_refs: {
    bridge_projection: ROOT_BRIDGE_ARTIFACT_REFS.projection,
    bridge_gate_result: ROOT_BRIDGE_ARTIFACT_REFS.gate_result,
    bridge_manifest: ROOT_BRIDGE_ARTIFACT_REFS.manifest,
    bridge_final_internal_audit: ROOT_BRIDGE_ARTIFACT_REFS.final_internal_audit,
    bridge_readiness_gate: ROOT_BRIDGE_ARTIFACT_REFS.readiness_gate,
    stage2_m2_manifest: COMPARATIVE_RUNTIME_ARTIFACT_REFS.manifest,
    stage2_m2_readiness_gate: COMPARATIVE_RUNTIME_ARTIFACT_REFS.readiness_gate
  },
  governance_refs: {
    ...COMPARATIVE_SYSTEM_FILES,
    ...COMPARATIVE_OPERATIONAL_SYSTEM_FILES
  },
  artifact_inventory: {
    stage2_m2_baseline: {
      ...COMPARATIVE_RUNTIME_ARTIFACT_REFS
    },
    stage2_m3_operationalization: {
      ...COMPARATIVE_OPERATIONAL_ARTIFACT_REFS
    }
  },
  status_notes: [
    'Stage 2-M2 bounded comparative baseline refreshed and preserved.',
    'Human-channel pathways are now machine-readable and runtime-evaluated.',
    'Counterpart, homologation, and transition contracts are now runtime-evaluated.',
    'Comparative runtime is operationalized beyond pure blocked-state runtime.',
    'No equivalence, superiority, transport-preservation, or external adjudication verdict is authorized.'
  ],
  blocked_surface_notes: [
    'ecosystem_candidate_surface blocked',
    'audit_facing_package_surface blocked',
    'controlled_statement_surface blocked',
    'external_claim_facing_surface blocked'
  ],
  current_states: {
    baseline_state:
      comparativeRuntimeBaseline.comparative_program_readiness_gate?.readiness_class,
    human_comparator_state:
      comparativeRuntimeBaseline.human_comparator_assessment?.current_comparator_state,
    human_equivalence_state:
      comparativeRuntimeBaseline.human_equivalence_assessment?.current_rung,
    stage2_m2_transport_state:
      comparativeRuntimeBaseline.cross_substrate_transport_assessment?.current_transport_class,
    pathway_layer_state: pathwayAssessment.pathway_layer_state,
    counterpart_contract_state: counterpartAssessment.contract_layer_state,
    homologation_state: homologationAssessment.homologation_layer_state,
    transition_state: transitionAssessment.transition_layer_state,
    operational_state: operationalReadiness.program_state,
    stage2_m4_state: operationalReadiness.stage2_m4_state
  },
  boundary_flags: {
    ...STANDARD_FLAGS,
    ready_for_stage2_m4: true
  },
  non_implications: [
    'No human equivalence follows from this manifest.',
    'No superiority or inferiority follows from this manifest.',
    'No transport-preservation or identity-preservation verdict follows from this manifest.',
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
    project_root: path.relative(PROJECT_ROOT, PROJECT_ROOT) || '.',
    stage2_m2_manifest_ref: COMPARATIVE_RUNTIME_ARTIFACT_REFS.manifest,
    comparative_operational_readiness_ref:
      COMPARATIVE_OPERATIONAL_ARTIFACT_REFS.comparative_operational_readiness
  },
  schema_ref: 'src/comparative_program/schemas/comparative_program_manifest.v1.json'
});

const buildVerificationMatrix = ({
  comparativeRuntimeBaseline,
  pathwayAssessment,
  counterpartAssessment,
  homologationAssessment,
  transitionAssessment,
  operationalReadiness,
  currentLineage
}) => {
  const checks = [];
  const addCheck = (id, pass, details) =>
    checks.push({ id, status: pass ? 'PASS' : 'FAIL', details });

  const pathwayStatuses = statusSet(pathwayAssessment.pathway_statuses, 'status');
  const counterpartStatuses = statusSet(counterpartAssessment.contract_statuses, 'status');
  const homologationStatuses = statusSet(homologationAssessment.homologation_units, 'status');
  const transitionStatuses = statusSet(
    transitionAssessment.transition_contract_statuses,
    'status'
  );
  const allowedReadinessStates = new Set([
    'comparative_runtime_open_but_human_blocked',
    'comparative_runtime_contract_operationalized',
    'comparative_runtime_homologation_ready_but_counterpart_absent'
  ]);

  addCheck('stage2_m3_manifests_present', true, {
    manifests: {
      ...COMPARATIVE_OPERATIONAL_SYSTEM_FILES
    }
  });
  addCheck('stage2_m3_evaluators_present', true, {
    evaluators: [
      'HumanChannelPathwayEvaluator',
      'CounterpartArtifactContractEvaluator',
      'HomologationContractEvaluator',
      'CrossSubstrateTransitionContractEvaluator',
      'ComparativeOperationalReadinessBuilder'
    ]
  });
  addCheck(
    'pathway_statuses_bounded',
    [...pathwayStatuses].every((status) =>
      (HUMAN_CHANNEL_PATHWAYS.pathway_status_classes || []).some((entry) => entry.id === status)
    ),
    { statuses: [...pathwayStatuses] }
  );
  addCheck(
    'counterpart_statuses_bounded',
    [...counterpartStatuses].every((status) =>
      (COUNTERPART_ARTIFACT_CONTRACTS.contract_status_classes || []).some(
        (entry) => entry.id === status
      )
    ),
    { statuses: [...counterpartStatuses] }
  );
  addCheck(
    'homologation_statuses_bounded',
    [...homologationStatuses].every((status) =>
      (HOMOLOGATION_CONTRACTS.homologation_status_classes || []).some(
        (entry) => entry.id === status
      )
    ),
    { statuses: [...homologationStatuses] }
  );
  addCheck(
    'transition_statuses_bounded',
    [...transitionStatuses].every((status) =>
      (CROSS_SUBSTRATE_TRANSITION_CONTRACTS.transition_readiness_classes || []).some(
        (entry) => entry.id === status
      )
    ),
    { statuses: [...transitionStatuses] }
  );
  addCheck(
    'equivalence_ladder_state_bounded',
    (HUMAN_EQUIVALENCE_LADDER.rungs || []).some(
      (entry) =>
        entry.id
          === comparativeRuntimeBaseline.human_equivalence_assessment?.current_rung
    ),
    { current_rung: comparativeRuntimeBaseline.human_equivalence_assessment?.current_rung }
  );
  addCheck(
    'transport_state_bounded',
    Boolean(
      (COMPARATIVE_PROGRAM_ARTIFACT_SCHEMA.artifacts || {})[
        'cross_substrate_transport_assessment.json'
      ]
    )
      && typeof comparativeRuntimeBaseline.cross_substrate_transport_assessment?.current_transport_class
        === 'string',
    {
      comparator_object_class_count: (
        HUMAN_COMPARATOR_PROTOCOL.comparator_object_classes || []
      ).length,
      current_transport_class:
        comparativeRuntimeBaseline.cross_substrate_transport_assessment?.current_transport_class
    }
  );
  addCheck(
    'pathway_verdict_authorization_bounded',
    pathwayAssessment.pathway_authorization_state === 'no_verdict_authorized',
    { pathway_authorization_state: pathwayAssessment.pathway_authorization_state }
  );
  addCheck(
    'homologation_verdict_authorization_bounded',
    homologationAssessment.verdict_authorization_state === 'homologation_not_authorized_for_verdict'
      && (homologationAssessment.homologation_units || []).every(
        (entry) => entry.verdict_authorization_state === 'homologation_not_authorized_for_verdict'
      ),
    {
      verdict_authorization_state: homologationAssessment.verdict_authorization_state,
      unit_states: (homologationAssessment.homologation_units || []).map(
        (entry) => entry.verdict_authorization_state
      )
    }
  );
  addCheck(
    'transition_verdict_authorization_bounded',
    transitionAssessment.transport_verdict_authorization_state
        === 'transition_not_authorized_for_transport_verdict'
      && (transitionAssessment.transition_contract_statuses || []).every(
        (entry) =>
          entry.transport_verdict_authorization_state
            === 'transition_not_authorized_for_transport_verdict'
      ),
    {
      transport_verdict_authorization_state:
        transitionAssessment.transport_verdict_authorization_state,
      contract_states: (transitionAssessment.transition_contract_statuses || []).map(
        (entry) => entry.transport_verdict_authorization_state
      )
    }
  );
  addCheck(
    'operational_readiness_bounded',
    allowedReadinessStates.has(operationalReadiness.program_state)
      && operationalReadiness.stage2_m4_state === 'ready_for_stage2_m4'
      && operationalReadiness.external_comparative_adjudication_state
        === 'not_ready_for_external_comparative_adjudication'
      && operationalReadiness.transport_verdict_authorization_state
        === 'transition_not_authorized_for_transport_verdict'
      && operationalReadiness.superiority_state
        === 'not_authorized_for_superiority_or_inferiority',
    {
      program_state: operationalReadiness.program_state,
      stage2_m4_state: operationalReadiness.stage2_m4_state,
      transport_verdict_authorization_state:
        operationalReadiness.transport_verdict_authorization_state,
      superiority_state: operationalReadiness.superiority_state
    }
  );
  addCheck(
    'internal_release_surface_allowed',
    checkSurfaceEligibility(
      COMPARATIVE_PROGRAM_SURFACE_POLICY,
      M3_ARTIFACT_NAMES,
      'internal_release_bundle_surface'
    ).pass,
    {}
  );
  addCheck(
    'candidate_surface_blocked',
    areAllBlockedOnSurface(
      COMPARATIVE_PROGRAM_SURFACE_POLICY,
      M3_ARTIFACT_NAMES,
      'ecosystem_candidate_surface'
    ),
    {}
  );
  addCheck(
    'audit_surface_blocked',
    areAllBlockedOnSurface(
      COMPARATIVE_PROGRAM_SURFACE_POLICY,
      M3_ARTIFACT_NAMES,
      'audit_facing_package_surface'
    ),
    {}
  );
  addCheck(
    'controlled_statement_blocked',
    areAllBlockedOnSurface(
      COMPARATIVE_PROGRAM_SURFACE_POLICY,
      M3_ARTIFACT_NAMES,
      'controlled_statement_surface'
    ),
    {}
  );
  addCheck(
    'no_path_leaks',
    !containsLocalPathLeak({
      pathwayAssessment,
      counterpartAssessment,
      homologationAssessment,
      transitionAssessment,
      operationalReadiness,
      currentLineage
    }),
    {}
  );
  addCheck(
    'no_equivalence_or_transport_leakage',
    !containsInterpretiveLeak({
      pathwayAssessment,
      counterpartAssessment,
      homologationAssessment,
      transitionAssessment,
      operationalReadiness
    }),
    {}
  );

  const failures = checks.filter((entry) => entry.status === 'FAIL').map((entry) => entry.id);
  return {
    artifact_role: 'comparative_program_verification_matrix',
    artifact_name: 'comparative_program_verification_matrix.json',
    artifact_version: '1.0.0',
    schema_version: '1.0.0',
    comparative_layer_id: 'comparative_expansion_layer.stage2_m3_operationalization',
    layer_version: LAYER_VERSION,
    estimator_version: ESTIMATOR_VERSION,
    implementation_status: 'comparative_runtime_contract_operationalization_implemented',
    status: failures.length === 0 ? 'PASS' : 'FAIL',
    checks,
    warnings: [
      'candidate_and_audit_surfaces_remain_blocked',
      'operational_readiness_remains_non_adjudicative',
      'no_equivalence_or_transport_verdict_authorized'
    ],
    failures,
    boundary_flags: {
      ...STANDARD_FLAGS,
      ready_for_stage2_m4: true
    },
    non_implications: [
      'Verification pass is not human equivalence support.',
      'Verification pass is not transport-preservation support.',
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
  comparativeRuntimeBaseline,
  homologationAssessment,
  transitionAssessment,
  operationalReadiness,
  verificationMatrix,
  currentLineage
}) => ({
  artifact_role: 'comparative_program_readiness_gate',
  artifact_name: 'comparative_program_readiness_gate.json',
  artifact_version: '1.0.0',
  schema_version: '1.0.0',
  comparative_layer_id: 'comparative_expansion_layer.stage2_m3_operationalization',
  layer_version: LAYER_VERSION,
  estimator_version: ESTIMATOR_VERSION,
  implementation_status: 'comparative_runtime_contract_operationalization_implemented',
  program_state: operationalReadiness.program_state,
  readiness_class:
    verificationMatrix.status === 'PASS'
      ? operationalReadiness.program_state
      : 'comparative_runtime_open_but_human_blocked',
  human_comparator_state:
    comparativeRuntimeBaseline.human_comparator_assessment?.current_comparator_state,
  equivalence_state:
    comparativeRuntimeBaseline.human_equivalence_assessment?.current_rung,
  transport_state: transitionAssessment.transition_layer_state,
  stage2_m2_transport_state:
    comparativeRuntimeBaseline.cross_substrate_transport_assessment?.current_transport_class,
  homologation_state: homologationAssessment.homologation_layer_state,
  stage2_m4_state: operationalReadiness.stage2_m4_state,
  external_comparative_adjudication_state: 'not_ready_for_external_comparative_adjudication',
  paper10_status: 'not_paper10_authorized',
  blocking_reasons: [...operationalReadiness.blocking_reasons],
  warnings: [
    'stage2_m3_readiness_is_internal_only',
    'counterpart_artifacts_remain_absent',
    'no_equivalence_or_transport_verdict_authorized'
  ],
  boundary_flags: {
    ...STANDARD_FLAGS,
    ready_for_stage2_m4: true
  },
  non_implications: [
    'Readiness is not equivalence support.',
    'Readiness is not transport-preservation support.',
    'Readiness is not external adjudication.',
    'Readiness is not Paper 10 authorization.'
  ],
  interpretation_boundary: READINESS_BOUNDARY,
  provenance: {
    generated_at: new Date().toISOString(),
    verification_matrix_ref: COMPARATIVE_OPERATIONAL_ARTIFACT_REFS.verification_matrix,
    current_lineage: currentLineage
  },
  schema_ref: 'src/comparative_program/schemas/comparative_program_readiness_gate.v1.json'
});

export class ComparativeOperationalReadinessBuilder {
  captureCurrentLineage() {
    return captureComparativeLineage({
      layerVersion: LAYER_VERSION,
      estimatorVersion: ESTIMATOR_VERSION,
      extraRefs: {
        human_channel_pathways: {
          ref: COMPARATIVE_OPERATIONAL_SYSTEM_FILES.human_channel_pathways,
          sha256: hashFileRelative(COMPARATIVE_OPERATIONAL_SYSTEM_FILES.human_channel_pathways)
        },
        counterpart_artifact_contracts: {
          ref: COMPARATIVE_OPERATIONAL_SYSTEM_FILES.counterpart_artifact_contracts,
          sha256: hashFileRelative(
            COMPARATIVE_OPERATIONAL_SYSTEM_FILES.counterpart_artifact_contracts
          )
        },
        homologation_contracts: {
          ref: COMPARATIVE_OPERATIONAL_SYSTEM_FILES.homologation_contracts,
          sha256: hashFileRelative(COMPARATIVE_OPERATIONAL_SYSTEM_FILES.homologation_contracts)
        },
        cross_substrate_transition_contracts: {
          ref: COMPARATIVE_OPERATIONAL_SYSTEM_FILES.cross_substrate_transition_contracts,
          sha256: hashFileRelative(
            COMPARATIVE_OPERATIONAL_SYSTEM_FILES.cross_substrate_transition_contracts
          )
        }
      }
    });
  }

  buildArtifacts(outputDir) {
    const stage2m2OutputDir = path.join(PROJECT_ROOT, 'artifacts', 'comparative_program', 'stage2m2');
    createComparativeProgramRootBuilder().buildArtifacts(stage2m2OutputDir);

    const bridgeBaseline = loadBridgeComparativeBaseline();
    const comparativeRuntimeBaseline = loadComparativeRuntimeBaseline();
    const currentLineage = {
      ...this.captureCurrentLineage(),
      stage2_m2_human_equivalence_state:
        comparativeRuntimeBaseline.human_equivalence_assessment?.current_rung
    };

    const pathwayAssessment = createHumanChannelPathwayEvaluator().evaluate({
      bridgeBaseline,
      comparativeRuntimeBaseline,
      currentLineage
    });
    const counterpartAssessment = createCounterpartArtifactContractEvaluator().evaluate({
      pathwayAssessment,
      currentLineage
    });
    const homologationAssessment = createHomologationContractEvaluator().evaluate({
      comparativeRuntimeBaseline,
      counterpartAssessment,
      currentLineage
    });
    const transitionAssessment = createCrossSubstrateTransitionContractEvaluator().evaluate({
      comparativeRuntimeBaseline,
      currentLineage
    });
    const operationalReadiness = buildOperationalReadiness({
      comparativeRuntimeBaseline,
      pathwayAssessment,
      counterpartAssessment,
      homologationAssessment,
      transitionAssessment,
      currentLineage
    });
    const manifest = buildManifest({
      comparativeRuntimeBaseline,
      pathwayAssessment,
      counterpartAssessment,
      homologationAssessment,
      transitionAssessment,
      operationalReadiness,
      currentLineage
    });
    const verificationMatrix = buildVerificationMatrix({
      comparativeRuntimeBaseline,
      pathwayAssessment,
      counterpartAssessment,
      homologationAssessment,
      transitionAssessment,
      operationalReadiness,
      currentLineage
    });
    const readinessGate = buildReadinessGate({
      comparativeRuntimeBaseline,
      homologationAssessment,
      transitionAssessment,
      operationalReadiness,
      verificationMatrix,
      currentLineage
    });

    ensureDir(outputDir);
    writeJson(path.join(outputDir, 'human_channel_pathway_assessment.json'), pathwayAssessment);
    writeJson(
      path.join(outputDir, 'counterpart_artifact_contract_assessment.json'),
      counterpartAssessment
    );
    writeJson(path.join(outputDir, 'homologation_contract_assessment.json'), homologationAssessment);
    writeJson(
      path.join(outputDir, 'cross_substrate_transition_contract_assessment.json'),
      transitionAssessment
    );
    writeJson(path.join(outputDir, 'comparative_operational_readiness.json'), operationalReadiness);
    writeJson(path.join(outputDir, 'comparative_program_manifest.json'), manifest);
    writeJson(
      path.join(outputDir, 'comparative_program_verification_matrix.json'),
      verificationMatrix
    );
    writeJson(path.join(outputDir, 'comparative_program_readiness_gate.json'), readinessGate);

    return {
      human_channel_pathway_assessment: pathwayAssessment,
      counterpart_artifact_contract_assessment: counterpartAssessment,
      homologation_contract_assessment: homologationAssessment,
      cross_substrate_transition_contract_assessment: transitionAssessment,
      comparative_operational_readiness: operationalReadiness,
      comparative_program_manifest: manifest,
      comparative_program_verification_matrix: verificationMatrix,
      comparative_program_readiness_gate: readinessGate
    };
  }
}

export const createComparativeOperationalReadinessBuilder = () =>
  new ComparativeOperationalReadinessBuilder();

export default {
  ComparativeOperationalReadinessBuilder,
  createComparativeOperationalReadinessBuilder
};
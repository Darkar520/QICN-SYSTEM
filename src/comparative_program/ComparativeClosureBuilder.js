import path from 'path';

import { COMPARATIVE_PROGRAM_ARTIFACT_SCHEMA } from './ComparativeProgramArtifactRegistry.js';
import { COMPARATIVE_PROGRAM_SURFACE_POLICY } from './ComparativeProgramSurfacePolicy.js';
import { createComparativeOperationalReadinessBuilder } from './ComparativeOperationalReadinessBuilder.js';
import {
  EXTERNAL_ADJUDICATION_OPENING_CRITERIA
} from './ExternalAdjudicationOpeningCriteriaRegistry.js';
import {
  createHumanChannelInstantiationReadinessEvaluator
} from './HumanChannelInstantiationReadinessEvaluator.js';
import { createComparativeFinalInternalAuditor } from './ComparativeFinalInternalAuditor.js';
import {
  createPaper10ComparativeReadinessGateBuilder
} from './Paper10ComparativeReadinessGateBuilder.js';
import {
  COMPARATIVE_CLOSURE_ARTIFACT_REFS,
  COMPARATIVE_CLOSURE_SYSTEM_FILES,
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
  loadComparativeOperationalBaseline,
  loadComparativeRuntimeBaseline,
  writeJson
} from './ComparativeRuntimeUtils.js';

const LAYER_VERSION = 'comparative_expansion_layer.stage2_m4.internal_closure.v1';
const ESTIMATOR_VERSION = 'comparative_closure_builder.stage2_m4.v1';

const MANIFEST_BOUNDARY =
  'Framework-internal only; the Stage 2-M4 comparative manifest records internal closure, adjudication-opening criteria status, human-channel instantiation readiness, and Paper 10 gating. It does not authorize external adjudication, does not authorize human equivalence, and does not open Paper 10.';
const VERIFICATION_BOUNDARY =
  'Framework-internal only; the Stage 2-M4 comparative verification matrix records closure-audit and opening-gate checks. It is not comparative evidence, not public claim authorization, and not external adjudication.';
const READINESS_BOUNDARY =
  'Framework-internal only; the Stage 2-M4 comparative readiness gate classifies internal closure readiness and Stage 3 opening readiness. It does not open external adjudication and does not authorize Paper 10.';

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
  /equivalent to a human/i,
  /human equivalence achieved/i,
  /superiority (achieved|supported|demonstrated)/i,
  /inferiority (achieved|supported|demonstrated)/i,
  /identity preservation (achieved|supported|demonstrated)/i,
  /external adjudication (opened|achieved|supported)/i,
  /Paper 10 authorized/i
];

const M4_ARTIFACT_NAMES = [
  'comparative_final_internal_audit.json',
  'human_channel_instantiation_readiness.json',
  'paper10_comparative_readiness_gate.json',
  'comparative_program_manifest.json',
  'comparative_program_verification_matrix.json',
  'comparative_program_readiness_gate.json'
];

const unique = (items) => [...new Set(items.filter(Boolean))];

const containsInterpretiveLeak = (value) =>
  BANNED_PATTERNS.some((pattern) => pattern.test(JSON.stringify(value)));

const areAllBlockedOnSurface = (surfacePolicy, artifactNames, surfaceName) =>
  artifactNames.every((artifactName) =>
    (surfacePolicy.outputs?.[artifactName]?.blocked_surfaces || []).includes(surfaceName)
  );

const summarizeStatuses = (entries, key = 'status') => {
  const counts = {};
  (entries || []).forEach((entry) => {
    counts[entry[key]] = (counts[entry[key]] || 0) + 1;
  });
  return counts;
};

const evaluateStage3Criteria = ({ comparativeRuntimeBaseline, comparativeOperationalBaseline, instantiationReadiness }) => {
  const contractMap = new Map(
    (
      comparativeOperationalBaseline.counterpart_artifact_contract_assessment?.contract_statuses
      || []
    ).map((entry) => [entry.contract_id, entry])
  );
  const homologationMap = new Map(
    (comparativeOperationalBaseline.homologation_contract_assessment?.homologation_units || []).map(
      (entry) => [entry.homologation_unit_id, entry]
    )
  );
  const transitionMap = new Map(
    (
      comparativeOperationalBaseline.cross_substrate_transition_contract_assessment
        ?.transition_contract_statuses || []
    ).map((entry) => [entry.contract_id, entry])
  );
  const instantiationMap = new Map(
    (instantiationReadiness.channel_instantiation_statuses || []).map((entry) => [
      entry.channel_id,
      entry
    ])
  );
  const burdenStatuses =
    comparativeRuntimeBaseline.human_comparator_assessment?.burden_statuses || {};

  const humanChannelChecks = (
    EXTERNAL_ADJUDICATION_OPENING_CRITERIA.required_human_channel_classes || []
  ).map((criterion) => {
    const readiness = instantiationMap.get(criterion.channel_id) || null;
    return {
      criterion_id: criterion.criterion_id,
      channel_id: criterion.channel_id,
      satisfied: readiness?.status === 'instantiation_formally_open_but_uninstantiated',
      current_status: readiness?.status || 'instantiation_not_open',
      blockers: readiness?.blockers || []
    };
  });

  const counterpartChecks = (
    EXTERNAL_ADJUDICATION_OPENING_CRITERIA.required_counterpart_artifact_families || []
  ).map((criterion) => {
    const contract = contractMap.get(criterion.contract_id) || null;
    return {
      criterion_id: criterion.criterion_id,
      contract_id: criterion.contract_id,
      satisfied: Boolean(contract) && (contract.missing_artifact_families || []).length === 0,
      missing_artifact_families: contract?.missing_artifact_families || []
    };
  });

  const homologationChecks = (
    EXTERNAL_ADJUDICATION_OPENING_CRITERIA.required_homologation_conditions || []
  ).map((criterion) => {
    const unit = homologationMap.get(criterion.homologation_unit_id) || null;
    return {
      criterion_id: criterion.criterion_id,
      homologation_unit_id: criterion.homologation_unit_id,
      satisfied: Boolean(unit) && (unit.blockers || []).length === 0,
      blockers: unit?.blockers || []
    };
  });

  const interventionChecks = (
    EXTERNAL_ADJUDICATION_OPENING_CRITERIA.required_intervention_symmetry || []
  ).map((criterion) => {
    const transportContract = transitionMap.get('intervention_signature_transition_contract') || null;
    const homologation = homologationMap.get('intervention_response_homologation') || null;
    return {
      criterion_id: criterion.criterion_id,
      satisfied:
        Boolean(transportContract)
        && (transportContract.missing_transition_artifacts || []).length === 0
        && Boolean(homologation)
        && (homologation.blockers || []).length === 0,
      blockers: unique([
        ...(transportContract?.missing_transition_artifacts || []),
        ...(homologation?.blockers || [])
      ])
    };
  });

  const burdenChecks = (
    EXTERNAL_ADJUDICATION_OPENING_CRITERIA.required_burden_symmetry || []
  ).map((criterion) => {
    const burden = burdenStatuses[criterion.burden_id] || null;
    return {
      burden_id: criterion.burden_id,
      satisfied: burden?.pass === true,
      status: burden?.status || 'not_declared'
    };
  });

  const errorBudgetChecks = (
    EXTERNAL_ADJUDICATION_OPENING_CRITERIA.required_error_budget_binding || []
  ).map((criterion) => {
    const embodimentHomologation = homologationMap.get('embodiment_boundary_homologation') || null;
    const transportHomologation = homologationMap.get('transport_transition_homologation') || null;
    const errorBudgetBurden = burdenStatuses.error_budget_burden || null;
    return {
      criterion_id: criterion.criterion_id,
      satisfied:
        errorBudgetBurden?.pass === true
        && embodimentHomologation?.error_budget_status !== 'not_instantiated'
        && transportHomologation?.error_budget_status !== 'not_instantiated',
      blockers: unique([
        ...(errorBudgetBurden?.pass === true ? [] : [errorBudgetBurden?.blocked_reason]),
        ...(embodimentHomologation?.error_budget_status === 'not_instantiated'
          ? ['embodiment_error_budget_not_instantiated']
          : []),
        ...(transportHomologation?.error_budget_status === 'not_instantiated'
          ? ['transition_error_budgets_not_instantiated']
          : [])
      ])
    };
  });

  const transitionChecks = (
    EXTERNAL_ADJUDICATION_OPENING_CRITERIA.required_transition_contract_maturity || []
  ).map((criterion) => {
    const transition = transitionMap.get(criterion.contract_id) || null;
    return {
      criterion_id: criterion.criterion_id,
      contract_id: criterion.contract_id,
      satisfied: Boolean(transition) && (transition.missing_transition_artifacts || []).length === 0,
      blockers: transition?.missing_transition_artifacts || []
    };
  });

  const governanceChecks = (
    EXTERNAL_ADJUDICATION_OPENING_CRITERIA.required_governance_and_surface_conditions || []
  ).map((criterion) => {
    const candidateBlocked = areAllBlockedOnSurface(
      COMPARATIVE_PROGRAM_SURFACE_POLICY,
      M4_ARTIFACT_NAMES,
      'ecosystem_candidate_surface'
    );
    const auditBlocked = areAllBlockedOnSurface(
      COMPARATIVE_PROGRAM_SURFACE_POLICY,
      M4_ARTIFACT_NAMES,
      'audit_facing_package_surface'
    );
    const internalAllowed = checkSurfaceEligibility(
      COMPARATIVE_PROGRAM_SURFACE_POLICY,
      M4_ARTIFACT_NAMES,
      'internal_release_bundle_surface'
    ).pass;

    const governanceSatisfied =
      candidateBlocked
      && auditBlocked
      && internalAllowed
      && comparativeOperationalBaseline.comparative_program_readiness_gate
        ?.external_comparative_adjudication_state
          === 'not_ready_for_external_comparative_adjudication';

    return {
      criterion_id: criterion.criterion_id,
      satisfied: governanceSatisfied,
      blockers: governanceSatisfied
        ? []
        : [
            'comparative_surface_policy_not_satisfied',
            'external_comparative_adjudication_boundary_not_preserved'
          ]
    };
  });

  const nonChannelGroupsSatisfied = [
    counterpartChecks,
    homologationChecks,
    interventionChecks,
    burdenChecks,
    errorBudgetChecks,
    transitionChecks,
    governanceChecks
  ].every((group) => group.every((entry) => entry.satisfied === true));

  const someSatisfied = [
    humanChannelChecks,
    counterpartChecks,
    homologationChecks,
    interventionChecks,
    burdenChecks,
    errorBudgetChecks,
    transitionChecks,
    governanceChecks
  ].some((group) => group.some((entry) => entry.satisfied === true));

  let adjudicationCriteriaStatus = 'adjudication_criteria_defined';
  if (nonChannelGroupsSatisfied && humanChannelChecks.every((entry) => entry.satisfied === true)) {
    adjudicationCriteriaStatus = 'adjudication_criteria_ready_but_uninstantiated';
  } else if (someSatisfied) {
    adjudicationCriteriaStatus = 'adjudication_criteria_partially_satisfied';
  }

  return {
    adjudication_criteria_status: adjudicationCriteriaStatus,
    stage3_opening_state: 'not_ready_for_stage3_opening',
    criteria_groups: {
      human_channels: humanChannelChecks,
      counterpart_artifacts: counterpartChecks,
      homologation: homologationChecks,
      intervention_symmetry: interventionChecks,
      burden_symmetry: burdenChecks,
      error_budget_binding: errorBudgetChecks,
      transition_maturity: transitionChecks,
      governance_and_surfaces: governanceChecks
    },
    disqualifiers_triggered: unique([
      ...humanChannelChecks.flatMap((entry) => entry.blockers || []),
      ...counterpartChecks.flatMap((entry) => entry.missing_artifact_families || []),
      ...homologationChecks.flatMap((entry) => entry.blockers || []),
      ...interventionChecks.flatMap((entry) => entry.blockers || []),
      ...errorBudgetChecks.flatMap((entry) => entry.blockers || []),
      ...transitionChecks.flatMap((entry) => entry.blockers || [])
    ]),
    unsatisfied_requirements: unique([
      ...humanChannelChecks.filter((entry) => !entry.satisfied).map((entry) => entry.criterion_id),
      ...counterpartChecks.filter((entry) => !entry.satisfied).map((entry) => entry.criterion_id),
      ...homologationChecks.filter((entry) => !entry.satisfied).map((entry) => entry.criterion_id),
      ...interventionChecks.filter((entry) => !entry.satisfied).map((entry) => entry.criterion_id),
      ...burdenChecks.filter((entry) => !entry.satisfied).map((entry) => entry.burden_id),
      ...errorBudgetChecks.filter((entry) => !entry.satisfied).map((entry) => entry.criterion_id),
      ...transitionChecks.filter((entry) => !entry.satisfied).map((entry) => entry.criterion_id),
      ...governanceChecks.filter((entry) => !entry.satisfied).map((entry) => entry.criterion_id)
    ])
  };
};

const buildManifest = ({
  comparativeRuntimeBaseline,
  comparativeOperationalBaseline,
  instantiationReadiness,
  stage3CriteriaAssessment,
  finalInternalAudit,
  paper10Gate,
  currentLineage
}) => ({
  artifact_role: 'comparative_program_manifest',
  artifact_name: 'comparative_program_manifest.json',
  artifact_version: '1.0.0',
  schema_version: '1.0.0',
  comparative_layer_id: 'comparative_expansion_layer.stage2_m4_internal_closure',
  layer_version: LAYER_VERSION,
  estimator_version: ESTIMATOR_VERSION,
  implementation_status: 'comparative_internal_closure_implemented',
  program_status: finalInternalAudit.current_comparative_readiness_class,
  authority_status: 'framework_internal_only',
  upstream_refs: {
    bridge_projection: ROOT_BRIDGE_ARTIFACT_REFS.projection,
    bridge_gate_result: ROOT_BRIDGE_ARTIFACT_REFS.gate_result,
    bridge_manifest: ROOT_BRIDGE_ARTIFACT_REFS.manifest,
    bridge_final_internal_audit: ROOT_BRIDGE_ARTIFACT_REFS.final_internal_audit,
    bridge_readiness_gate: ROOT_BRIDGE_ARTIFACT_REFS.readiness_gate,
    stage2_m2_manifest: COMPARATIVE_RUNTIME_ARTIFACT_REFS.manifest,
    stage2_m3_manifest: COMPARATIVE_OPERATIONAL_ARTIFACT_REFS.manifest
  },
  governance_refs: {
    ...COMPARATIVE_SYSTEM_FILES,
    ...COMPARATIVE_OPERATIONAL_SYSTEM_FILES,
    ...COMPARATIVE_CLOSURE_SYSTEM_FILES
  },
  artifact_inventory: {
    stage2_m2_baseline: {
      ...COMPARATIVE_RUNTIME_ARTIFACT_REFS
    },
    stage2_m3_operationalization: {
      ...COMPARATIVE_OPERATIONAL_ARTIFACT_REFS
    },
    stage2_m4_internal_closure: {
      ...COMPARATIVE_CLOSURE_ARTIFACT_REFS
    }
  },
  status_notes: [
    'Stage 2-M2 and Stage 2-M3 baselines were refreshed before closure audit.',
    'Comparative final internal audit is runtime-generated.',
    'External-adjudication opening criteria are machine-readable and evaluated.',
    'Human-channel instantiation readiness is evaluated without fabricating evidence.',
    'Paper 10 remains non-authorized and Stage 3 remains unopened.'
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
    operational_state:
      comparativeOperationalBaseline.comparative_program_readiness_gate?.readiness_class,
    closure_audit_status: finalInternalAudit.audit_status,
    internal_closure_state: finalInternalAudit.current_comparative_readiness_class,
    adjudication_criteria_status: stage3CriteriaAssessment.adjudication_criteria_status,
    stage3_opening_state: stage3CriteriaAssessment.stage3_opening_state,
    paper10_authorization_state: paper10Gate.paper10_authorization_state,
    paper10_scoping_state: paper10Gate.paper10_readiness_status,
    human_channel_instantiation_state:
      instantiationReadiness.instantiation_summary?.overall_state,
    external_comparative_adjudication_state: 'not_ready_for_external_comparative_adjudication'
  },
  boundary_flags: {
    ...STANDARD_FLAGS,
    comparative_internal_closure_ready:
      finalInternalAudit.current_comparative_readiness_class
        === 'comparative_internal_closure_ready'
  },
  non_implications: [
    'No human equivalence follows from this manifest.',
    'No superiority or inferiority follows from this manifest.',
    'No external adjudication is opened by this manifest.',
    'No Paper 10 manuscript is authorized by this manifest.'
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
    comparative_final_internal_audit_ref:
      COMPARATIVE_CLOSURE_ARTIFACT_REFS.comparative_final_internal_audit,
    human_channel_instantiation_ref:
      COMPARATIVE_CLOSURE_ARTIFACT_REFS.human_channel_instantiation_readiness,
    paper10_gate_ref: COMPARATIVE_CLOSURE_ARTIFACT_REFS.paper10_comparative_readiness_gate
  },
  schema_ref: 'src/comparative_program/schemas/comparative_program_manifest.v1.json'
});

const buildVerificationMatrix = ({
  comparativeRuntimeBaseline,
  comparativeOperationalBaseline,
  instantiationReadiness,
  stage3CriteriaAssessment,
  finalInternalAudit,
  paper10Gate,
  currentLineage
}) => {
  const checks = [];
  const addCheck = (id, pass, details) =>
    checks.push({ id, status: pass ? 'PASS' : 'FAIL', details });

  const allowedAuditStatuses = new Set([
    'comparative_audit_incomplete',
    'comparative_audit_pass_with_warnings',
    'comparative_audit_pass'
  ]);
  const allowedClosureStates = new Set([
    'comparative_internal_closure_not_ready',
    'comparative_internal_closure_ready'
  ]);
  const allowedStage3States = new Set([
    'ready_for_stage3_opening',
    'not_ready_for_stage3_opening'
  ]);
  const allowedPaper10States = new Set([
    'paper10_scoping_not_open',
    'paper10_scoping_conditionally_open',
    'paper10_scoping_ready_after_stage3_only'
  ]);
  const currentHead = currentLineage.qicn_system?.head;
  const currentReleaseHead = currentLineage.qicn_release?.head;

  addCheck('stage2_m4_manifests_present', true, {
    manifests: {
      ...COMPARATIVE_CLOSURE_SYSTEM_FILES
    }
  });
  addCheck('stage2_m4_runtime_present', true, {
    evaluators: [
      'HumanChannelInstantiationReadinessEvaluator',
      'ComparativeFinalInternalAuditor',
      'Paper10ComparativeReadinessGateBuilder',
      'ComparativeClosureBuilder'
    ]
  });
  addCheck(
    'stage2_m2_lineage_refreshed',
    comparativeRuntimeBaseline.comparative_program_readiness_gate?.provenance?.current_lineage
        ?.qicn_system?.head === currentHead
      && comparativeRuntimeBaseline.comparative_program_readiness_gate?.provenance?.current_lineage
        ?.qicn_release?.head === currentReleaseHead,
    {
      stage2_m2_head:
        comparativeRuntimeBaseline.comparative_program_readiness_gate?.provenance?.current_lineage
          ?.qicn_system?.head,
      currentHead
    }
  );
  addCheck(
    'stage2_m3_lineage_refreshed',
    comparativeOperationalBaseline.comparative_program_readiness_gate?.provenance?.current_lineage
        ?.qicn_system?.head === currentHead
      && comparativeOperationalBaseline.comparative_program_readiness_gate?.provenance?.current_lineage
        ?.qicn_release?.head === currentReleaseHead,
    {
      stage2_m3_head:
        comparativeOperationalBaseline.comparative_program_readiness_gate?.provenance?.current_lineage
          ?.qicn_system?.head,
      currentHead
    }
  );
  addCheck(
    'comparative_final_internal_audit_bounded',
    allowedAuditStatuses.has(finalInternalAudit.audit_status)
      && allowedClosureStates.has(finalInternalAudit.current_comparative_readiness_class),
    {
      audit_status: finalInternalAudit.audit_status,
      closure_state: finalInternalAudit.current_comparative_readiness_class
    }
  );
  addCheck(
    'instantiation_statuses_bounded',
    (instantiationReadiness.channel_instantiation_statuses || []).every((entry) =>
      (EXTERNAL_ADJUDICATION_OPENING_CRITERIA.instantiation_status_classes || []).some(
        (statusClass) => statusClass.id === entry.status
      )
    ),
    {
      statuses: summarizeStatuses(instantiationReadiness.channel_instantiation_statuses)
    }
  );
  addCheck(
    'adjudication_criteria_status_bounded',
    (EXTERNAL_ADJUDICATION_OPENING_CRITERIA.criteria_status_classes || []).some(
      (entry) => entry.id === stage3CriteriaAssessment.adjudication_criteria_status
    ) && allowedStage3States.has(stage3CriteriaAssessment.stage3_opening_state),
    {
      adjudication_criteria_status: stage3CriteriaAssessment.adjudication_criteria_status,
      stage3_opening_state: stage3CriteriaAssessment.stage3_opening_state
    }
  );
  addCheck(
    'paper10_gate_bounded',
    allowedPaper10States.has(paper10Gate.paper10_readiness_status)
      && paper10Gate.paper10_authorization_state === 'not_paper10_authorized',
    {
      paper10_readiness_status: paper10Gate.paper10_readiness_status,
      paper10_authorization_state: paper10Gate.paper10_authorization_state
    }
  );
  addCheck(
    'internal_release_surface_allowed',
    checkSurfaceEligibility(
      COMPARATIVE_PROGRAM_SURFACE_POLICY,
      M4_ARTIFACT_NAMES,
      'internal_release_bundle_surface'
    ).pass,
    {}
  );
  addCheck(
    'candidate_surface_blocked',
    areAllBlockedOnSurface(
      COMPARATIVE_PROGRAM_SURFACE_POLICY,
      M4_ARTIFACT_NAMES,
      'ecosystem_candidate_surface'
    ),
    {}
  );
  addCheck(
    'audit_surface_blocked',
    areAllBlockedOnSurface(
      COMPARATIVE_PROGRAM_SURFACE_POLICY,
      M4_ARTIFACT_NAMES,
      'audit_facing_package_surface'
    ),
    {}
  );
  addCheck(
    'controlled_statement_blocked',
    areAllBlockedOnSurface(
      COMPARATIVE_PROGRAM_SURFACE_POLICY,
      M4_ARTIFACT_NAMES,
      'controlled_statement_surface'
    ),
    {}
  );
  addCheck(
    'no_path_leaks',
    !containsLocalPathLeak({
      instantiationReadiness,
      stage3CriteriaAssessment,
      finalInternalAudit,
      paper10Gate,
      currentLineage
    }),
    {}
  );
  addCheck(
    'no_equivalence_or_external_leakage',
    !containsInterpretiveLeak({
      instantiationReadiness,
      stage3CriteriaAssessment,
      finalInternalAudit,
      paper10Gate
    }),
    {}
  );

  const failures = checks.filter((entry) => entry.status === 'FAIL').map((entry) => entry.id);
  return {
    artifact_role: 'comparative_program_verification_matrix',
    artifact_name: 'comparative_program_verification_matrix.json',
    artifact_version: '1.0.0',
    schema_version: '1.0.0',
    comparative_layer_id: 'comparative_expansion_layer.stage2_m4_internal_closure',
    layer_version: LAYER_VERSION,
    estimator_version: ESTIMATOR_VERSION,
    implementation_status: 'comparative_internal_closure_implemented',
    status: failures.length === 0 ? 'PASS' : 'FAIL',
    checks,
    warnings: [
      'stage2_m4_closure_is_internal_only',
      'stage3_opening_remains_gated',
      'paper10_authorization_remains_blocked'
    ],
    failures,
    boundary_flags: {
      ...STANDARD_FLAGS
    },
    non_implications: [
      'Verification pass is not human equivalence.',
      'Verification pass is not external adjudication.',
      'Verification pass is not Paper 10 authorization.'
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
  comparativeOperationalBaseline,
  instantiationReadiness,
  stage3CriteriaAssessment,
  finalInternalAudit,
  paper10Gate,
  verificationMatrix,
  currentLineage
}) => ({
  artifact_role: 'comparative_program_readiness_gate',
  artifact_name: 'comparative_program_readiness_gate.json',
  artifact_version: '1.0.0',
  schema_version: '1.0.0',
  comparative_layer_id: 'comparative_expansion_layer.stage2_m4_internal_closure',
  layer_version: LAYER_VERSION,
  estimator_version: ESTIMATOR_VERSION,
  implementation_status: 'comparative_internal_closure_implemented',
  program_state: finalInternalAudit.current_comparative_readiness_class,
  readiness_class:
    verificationMatrix.status === 'PASS'
      ? finalInternalAudit.current_comparative_readiness_class
      : 'comparative_internal_closure_not_ready',
  human_comparator_state:
    comparativeRuntimeBaseline.human_comparator_assessment?.current_comparator_state,
  equivalence_state:
    comparativeRuntimeBaseline.human_equivalence_assessment?.current_rung,
  transport_state:
    comparativeOperationalBaseline.cross_substrate_transition_contract_assessment
      ?.transition_layer_state,
  operational_state:
    comparativeOperationalBaseline.comparative_operational_readiness?.program_state,
  audit_status: finalInternalAudit.audit_status,
  adjudication_criteria_status: stage3CriteriaAssessment.adjudication_criteria_status,
  human_channel_instantiation_state:
    instantiationReadiness.instantiation_summary?.overall_state,
  stage3_opening_state: stage3CriteriaAssessment.stage3_opening_state,
  external_comparative_adjudication_state: 'not_ready_for_external_comparative_adjudication',
  paper10_status: 'not_paper10_authorized',
  paper10_scoping_state: paper10Gate.paper10_readiness_status,
  blocking_reasons: unique([
    ...finalInternalAudit.open_readiness_requirements,
    ...finalInternalAudit.failed_or_open_burdens.map((entry) => entry.burden_id),
    ...stage3CriteriaAssessment.disqualifiers_triggered
  ]),
  warnings: [
    'stage2_m4_readiness_is_internal_only',
    'external_comparative_adjudication_remains_unopened',
    'paper10_authorization_remains_blocked'
  ],
  boundary_flags: {
    ...STANDARD_FLAGS,
    comparative_internal_closure_ready:
      finalInternalAudit.current_comparative_readiness_class
        === 'comparative_internal_closure_ready'
  },
  non_implications: [
    'Readiness is not human equivalence.',
    'Readiness is not external adjudication.',
    'Readiness is not Paper 10 authorization.'
  ],
  interpretation_boundary: READINESS_BOUNDARY,
  provenance: {
    generated_at: new Date().toISOString(),
    stage2_m2_readiness_ref: COMPARATIVE_RUNTIME_ARTIFACT_REFS.readiness_gate,
    stage2_m3_readiness_ref: COMPARATIVE_OPERATIONAL_ARTIFACT_REFS.readiness_gate,
    stage2_m4_audit_ref: COMPARATIVE_CLOSURE_ARTIFACT_REFS.comparative_final_internal_audit,
    current_lineage: currentLineage
  },
  schema_ref: 'src/comparative_program/schemas/comparative_program_readiness_gate.v1.json'
});

export class ComparativeClosureBuilder {
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
        },
        external_adjudication_opening_criteria: {
          ref: COMPARATIVE_CLOSURE_SYSTEM_FILES.external_adjudication_opening_criteria,
          sha256: hashFileRelative(
            COMPARATIVE_CLOSURE_SYSTEM_FILES.external_adjudication_opening_criteria
          )
        }
      }
    });
  }

  buildArtifacts(outputDir) {
    const stage2m3OutputDir = path.join(PROJECT_ROOT, 'artifacts', 'comparative_program', 'stage2m3');
    createComparativeOperationalReadinessBuilder().buildArtifacts(stage2m3OutputDir);

    const bridgeBaseline = loadBridgeComparativeBaseline();
    const comparativeRuntimeBaseline = loadComparativeRuntimeBaseline();
    const comparativeOperationalBaseline = loadComparativeOperationalBaseline();
    const currentLineage = {
      ...this.captureCurrentLineage(),
      stage2_m2_readiness_state:
        comparativeRuntimeBaseline.comparative_program_readiness_gate?.readiness_class,
      stage2_m3_operational_state:
        comparativeOperationalBaseline.comparative_operational_readiness?.program_state
    };

    const instantiationReadiness = createHumanChannelInstantiationReadinessEvaluator().evaluate({
      comparativeRuntimeBaseline,
      comparativeOperationalBaseline,
      currentLineage
    });
    const stage3CriteriaAssessment = evaluateStage3Criteria({
      comparativeRuntimeBaseline,
      comparativeOperationalBaseline,
      instantiationReadiness
    });
    const finalInternalAudit = createComparativeFinalInternalAuditor().audit({
      comparativeRuntimeBaseline,
      comparativeOperationalBaseline,
      instantiationReadiness,
      stage3CriteriaAssessment,
      currentLineage
    });
    const stage3OpeningState =
      finalInternalAudit.current_comparative_readiness_class
          === 'comparative_internal_closure_ready'
        && stage3CriteriaAssessment.adjudication_criteria_status
          === 'adjudication_criteria_ready_but_uninstantiated'
        ? 'ready_for_stage3_opening'
        : 'not_ready_for_stage3_opening';
    const normalizedStage3CriteriaAssessment = {
      ...stage3CriteriaAssessment,
      stage3_opening_state: stage3OpeningState
    };
    const paper10Gate = createPaper10ComparativeReadinessGateBuilder().build({
      finalInternalAudit,
      stage3CriteriaAssessment: normalizedStage3CriteriaAssessment,
      instantiationReadiness,
      currentLineage
    });
    const manifest = buildManifest({
      comparativeRuntimeBaseline,
      comparativeOperationalBaseline,
      instantiationReadiness,
      stage3CriteriaAssessment: normalizedStage3CriteriaAssessment,
      finalInternalAudit,
      paper10Gate,
      currentLineage
    });
    const verificationMatrix = buildVerificationMatrix({
      comparativeRuntimeBaseline,
      comparativeOperationalBaseline,
      instantiationReadiness,
      stage3CriteriaAssessment: normalizedStage3CriteriaAssessment,
      finalInternalAudit,
      paper10Gate,
      currentLineage
    });
    const readinessGate = buildReadinessGate({
      comparativeRuntimeBaseline,
      comparativeOperationalBaseline,
      instantiationReadiness,
      stage3CriteriaAssessment: normalizedStage3CriteriaAssessment,
      finalInternalAudit,
      paper10Gate,
      verificationMatrix,
      currentLineage
    });

    ensureDir(outputDir);
    writeJson(
      path.join(outputDir, 'comparative_final_internal_audit.json'),
      finalInternalAudit
    );
    writeJson(
      path.join(outputDir, 'human_channel_instantiation_readiness.json'),
      instantiationReadiness
    );
    writeJson(
      path.join(outputDir, 'paper10_comparative_readiness_gate.json'),
      paper10Gate
    );
    writeJson(path.join(outputDir, 'comparative_program_manifest.json'), manifest);
    writeJson(
      path.join(outputDir, 'comparative_program_verification_matrix.json'),
      verificationMatrix
    );
    writeJson(path.join(outputDir, 'comparative_program_readiness_gate.json'), readinessGate);

    return {
      comparative_final_internal_audit: finalInternalAudit,
      human_channel_instantiation_readiness: instantiationReadiness,
      paper10_comparative_readiness_gate: paper10Gate,
      comparative_program_manifest: manifest,
      comparative_program_verification_matrix: verificationMatrix,
      comparative_program_readiness_gate: readinessGate
    };
  }
}

export const createComparativeClosureBuilder = () => new ComparativeClosureBuilder();

export default {
  ComparativeClosureBuilder,
  createComparativeClosureBuilder
};
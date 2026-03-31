import {
  COMPARATIVE_CLOSURE_ARTIFACT_REFS,
  COMPARATIVE_OPERATIONAL_ARTIFACT_REFS,
  COMPARATIVE_RUNTIME_ARTIFACT_REFS,
  checkSurfaceEligibility,
  containsLocalPathLeak
} from './ComparativeRuntimeUtils.js';
import { COMPARATIVE_PROGRAM_ARTIFACT_SCHEMA } from './ComparativeProgramArtifactRegistry.js';
import { COMPARATIVE_PROGRAM_SURFACE_POLICY } from './ComparativeProgramSurfacePolicy.js';
import { COMPARATOR_BURDEN_MATRIX } from './ComparatorBurdenMatrixRegistry.js';
import { HUMAN_EQUIVALENCE_LADDER } from './HumanEquivalenceLadderRegistry.js';
import { HUMAN_CHANNEL_PATHWAYS } from './HumanChannelPathwaysRegistry.js';
import { COUNTERPART_ARTIFACT_CONTRACTS } from './CounterpartArtifactContractsRegistry.js';
import { HOMOLOGATION_CONTRACTS } from './HomologationContractsRegistry.js';
import { CROSS_SUBSTRATE_TRANSITION_CONTRACTS } from './CrossSubstrateTransitionContractsRegistry.js';
import {
  EXTERNAL_ADJUDICATION_OPENING_CRITERIA
} from './ExternalAdjudicationOpeningCriteriaRegistry.js';

const LAYER_VERSION = 'comparative_expansion_layer.stage2_m4.final_internal_audit.v1';
const ESTIMATOR_VERSION = 'comparative_final_internal_auditor.stage2_m4.v1';

const BOUNDARY =
  'Framework-internal only; the comparative final internal audit records internal integrity, closure readiness, adjudication-opening criteria status, and remaining burdens after Stage 2-M4. It does not open external adjudication, does not authorize equivalence or superiority, and does not authorize Paper 10.';

const STANDARD_FLAGS = Object.freeze({
  framework_internal_only: true,
  not_human_equivalence_support: true,
  not_superiority_support: true,
  not_cross_substrate_equivalence_support: true,
  not_identity_preservation_support: true,
  not_external_adjudication: true,
  not_paper10_authorization: true,
  internal_audit_only: true
});

const BANNED_PATTERNS = [
  /equivalent to a human/i,
  /human equivalence achieved/i,
  /superiority (achieved|supported|demonstrated)/i,
  /inferiority (achieved|supported|demonstrated)/i,
  /external adjudication (opened|achieved|supported)/i,
  /Paper 10 authorized/i
];

const M2_ARTIFACT_NAMES = [
  'human_comparator_assessment.json',
  'human_equivalence_assessment.json',
  'cross_substrate_transport_assessment.json',
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
  'comparative_program_manifest.json',
  'comparative_program_verification_matrix.json',
  'comparative_program_readiness_gate.json'
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

const areAllBlockedOnSurface = (surfacePolicy, artifactNames, surfaceName) =>
  artifactNames.every((artifactName) =>
    (surfacePolicy.outputs?.[artifactName]?.blocked_surfaces || []).includes(surfaceName)
  );

const containsInterpretiveLeak = (value) =>
  BANNED_PATTERNS.some((pattern) => pattern.test(JSON.stringify(value)));

const repoStatesMatch = (left, right) =>
  Boolean(left && right)
  && left.branch === right.branch
  && left.head === right.head;

const statusSet = (entries, key) => new Set((entries || []).map((entry) => entry[key]));

export class ComparativeFinalInternalAuditor {
  audit({
    comparativeRuntimeBaseline,
    comparativeOperationalBaseline,
    instantiationReadiness,
    stage3CriteriaAssessment,
    currentLineage
  }) {
    const burdenMatrixIds = new Set(
      (COMPARATOR_BURDEN_MATRIX.burdens || []).map((entry) => entry.burden_id)
    );
    const emittedBurdenIds = Object.keys(
      comparativeRuntimeBaseline.human_comparator_assessment?.burden_statuses || {}
    );

    const pathwayStatusIds = new Set(
      (HUMAN_CHANNEL_PATHWAYS.pathway_status_classes || []).map((entry) => entry.id)
    );
    const counterpartStatusIds = new Set(
      (COUNTERPART_ARTIFACT_CONTRACTS.contract_status_classes || []).map((entry) => entry.id)
    );
    const homologationStatusIds = new Set(
      (HOMOLOGATION_CONTRACTS.homologation_status_classes || []).map((entry) => entry.id)
    );
    const transitionStatusIds = new Set(
      (CROSS_SUBSTRATE_TRANSITION_CONTRACTS.transition_readiness_classes || []).map(
        (entry) => entry.id
      )
    );
    const instantiationStatusIds = new Set(
      (EXTERNAL_ADJUDICATION_OPENING_CRITERIA.instantiation_status_classes || []).map(
        (entry) => entry.id
      )
    );
    const criteriaStatusIds = new Set(
      (EXTERNAL_ADJUDICATION_OPENING_CRITERIA.criteria_status_classes || []).map(
        (entry) => entry.id
      )
    );

    const surfaceArtifactNames = unique([
      ...M2_ARTIFACT_NAMES,
      ...M3_ARTIFACT_NAMES,
      ...M4_ARTIFACT_NAMES
    ]);

    const stage2GovernanceIntegrity =
      (HUMAN_EQUIVALENCE_LADDER.rungs || []).length > 0
      && emittedBurdenIds.every((burdenId) => burdenMatrixIds.has(burdenId))
      && (EXTERNAL_ADJUDICATION_OPENING_CRITERIA.required_human_channel_classes || []).length > 0;

    const stage2M2RuntimeIntegrity =
      comparativeRuntimeBaseline.comparative_program_verification_matrix?.status === 'PASS'
      && comparativeRuntimeBaseline.human_comparator_assessment?.current_comparator_state
        === 'comparator_blocked'
      && comparativeRuntimeBaseline.human_equivalence_assessment?.assessment_state
        === 'no_verdict_authorized'
      && comparativeRuntimeBaseline.cross_substrate_transport_assessment?.assessment_state
        === 'no_verdict_authorized';

    const stage2M3ContractRuntimeIntegrity =
      comparativeOperationalBaseline.comparative_program_verification_matrix?.status === 'PASS'
      && comparativeOperationalBaseline.comparative_operational_readiness?.stage2_m4_state
        === 'ready_for_stage2_m4'
      && comparativeOperationalBaseline.comparative_program_readiness_gate
        ?.external_comparative_adjudication_state
        === 'not_ready_for_external_comparative_adjudication';

    const taxonomyCoherence =
      [...statusSet(
        comparativeOperationalBaseline.human_channel_pathway_assessment?.pathway_statuses,
        'status'
      )].every((status) => pathwayStatusIds.has(status))
      && [...statusSet(
        comparativeOperationalBaseline.counterpart_artifact_contract_assessment?.contract_statuses,
        'status'
      )].every((status) => counterpartStatusIds.has(status))
      && [...statusSet(
        comparativeOperationalBaseline.homologation_contract_assessment?.homologation_units,
        'status'
      )].every((status) => homologationStatusIds.has(status))
      && [...statusSet(
        comparativeOperationalBaseline.cross_substrate_transition_contract_assessment
          ?.transition_contract_statuses,
        'status'
      )].every((status) => transitionStatusIds.has(status))
      && [...statusSet(instantiationReadiness.channel_instantiation_statuses, 'status')].every(
        (status) => instantiationStatusIds.has(status)
      )
      && criteriaStatusIds.has(stage3CriteriaAssessment.adjudication_criteria_status);

    const burdenCoherence =
      emittedBurdenIds.every((burdenId) => burdenMatrixIds.has(burdenId))
      && (comparativeOperationalBaseline.homologation_contract_assessment?.homologation_units || []).every(
        (entry) =>
          Object.keys(entry.required_burden_statuses || {}).every((burdenId) =>
            burdenMatrixIds.has(burdenId)
          )
      );

    const homologationCoherence =
      comparativeOperationalBaseline.homologation_contract_assessment?.verdict_authorization_state
        === 'homologation_not_authorized_for_verdict'
      && (comparativeOperationalBaseline.homologation_contract_assessment?.homologation_units || []).every(
        (entry) => entry.verdict_authorization_state === 'homologation_not_authorized_for_verdict'
      );

    const transitionContractCoherence =
      comparativeOperationalBaseline.cross_substrate_transition_contract_assessment
        ?.transport_verdict_authorization_state
        === 'transition_not_authorized_for_transport_verdict'
      && (comparativeOperationalBaseline.cross_substrate_transition_contract_assessment
        ?.transition_contract_statuses || []).every(
        (entry) =>
          entry.transport_verdict_authorization_state
            === 'transition_not_authorized_for_transport_verdict'
      );

    const readinessCoherence =
      comparativeOperationalBaseline.comparative_program_readiness_gate?.readiness_class
        === comparativeOperationalBaseline.comparative_operational_readiness?.program_state
      && comparativeOperationalBaseline.comparative_operational_readiness?.stage2_m4_state
        === 'ready_for_stage2_m4'
      && stage3CriteriaAssessment.stage3_opening_state === 'not_ready_for_stage3_opening';

    const surfaceDiscipline =
      checkSurfaceEligibility(
        COMPARATIVE_PROGRAM_SURFACE_POLICY,
        surfaceArtifactNames,
        'internal_release_bundle_surface'
      ).pass
      && areAllBlockedOnSurface(
        COMPARATIVE_PROGRAM_SURFACE_POLICY,
        surfaceArtifactNames,
        'ecosystem_candidate_surface'
      )
      && areAllBlockedOnSurface(
        COMPARATIVE_PROGRAM_SURFACE_POLICY,
        surfaceArtifactNames,
        'audit_facing_package_surface'
      )
      && areAllBlockedOnSurface(
        COMPARATIVE_PROGRAM_SURFACE_POLICY,
        surfaceArtifactNames,
        'controlled_statement_surface'
      )
      && areAllBlockedOnSurface(
        COMPARATIVE_PROGRAM_SURFACE_POLICY,
        surfaceArtifactNames,
        'external_claim_facing_surface'
      );

    const antiOverclaimDiscipline = !containsInterpretiveLeak({
      comparativeRuntimeBaseline,
      comparativeOperationalBaseline,
      instantiationReadiness,
      stage3CriteriaAssessment
    });

    const pathLeakDiscipline = !containsLocalPathLeak({
      comparativeRuntimeBaseline,
      comparativeOperationalBaseline,
      instantiationReadiness,
      stage3CriteriaAssessment,
      currentLineage
    });

    const crossLayerLineageSchemaConsistency =
      repoStatesMatch(
        comparativeRuntimeBaseline.comparative_program_readiness_gate?.provenance?.current_lineage
          ?.qicn_system,
        currentLineage.qicn_system
      )
      && repoStatesMatch(
        comparativeOperationalBaseline.comparative_program_readiness_gate?.provenance?.current_lineage
          ?.qicn_system,
        currentLineage.qicn_system
      )
      && repoStatesMatch(
        comparativeRuntimeBaseline.comparative_program_readiness_gate?.provenance?.current_lineage
          ?.qicn_release,
        currentLineage.qicn_release
      )
      && repoStatesMatch(
        comparativeOperationalBaseline.comparative_program_readiness_gate?.provenance
          ?.current_lineage?.qicn_release,
        currentLineage.qicn_release
      )
      && Boolean(COMPARATIVE_PROGRAM_ARTIFACT_SCHEMA.root_schema_refs?.['comparative_final_internal_audit.json'])
      && Boolean(
        COMPARATIVE_PROGRAM_ARTIFACT_SCHEMA.root_schema_refs?.['human_channel_instantiation_readiness.json']
      )
      && Boolean(
        COMPARATIVE_PROGRAM_ARTIFACT_SCHEMA.root_schema_refs?.['paper10_comparative_readiness_gate.json']
      );

    const layerIntegrity = {
      stage2_governance_integrity: stage2GovernanceIntegrity,
      stage2_m2_runtime_integrity: stage2M2RuntimeIntegrity,
      stage2_m3_contract_runtime_integrity: stage2M3ContractRuntimeIntegrity,
      taxonomy_coherence: taxonomyCoherence,
      burden_coherence: burdenCoherence,
      homologation_coherence: homologationCoherence,
      transition_contract_coherence: transitionContractCoherence,
      readiness_coherence: readinessCoherence,
      surface_discipline: surfaceDiscipline,
      anti_overclaim_discipline: antiOverclaimDiscipline,
      path_leak_discipline: pathLeakDiscipline,
      cross_layer_lineage_schema_consistency: crossLayerLineageSchemaConsistency
    };

    const failedOrOpenBurdens = Object.entries(
      comparativeRuntimeBaseline.human_comparator_assessment?.burden_statuses || {}
    )
      .filter(([, burden]) => burden.pass !== true)
      .map(([burden_id, burden]) => ({
        burden_id,
        status: burden.status,
        blocked_reason: burden.blocked_reason,
        source: 'stage2_m2_runtime'
      }));

    const openReadinessRequirements = unique([
      ...stage3CriteriaAssessment.unsatisfied_requirements,
      ...stage3CriteriaAssessment.disqualifiers_triggered,
      ...instantiationReadiness.channel_instantiation_statuses.flatMap((entry) => entry.blockers)
    ]);

    const currentComparativeReadinessClass =
      Object.values(layerIntegrity).every(Boolean)
        ? 'comparative_internal_closure_ready'
        : 'comparative_internal_closure_not_ready';

    let auditStatus = 'comparative_audit_incomplete';
    if (currentComparativeReadinessClass === 'comparative_internal_closure_ready') {
      auditStatus =
        failedOrOpenBurdens.length > 0 || openReadinessRequirements.length > 0
          ? 'comparative_audit_pass_with_warnings'
          : 'comparative_audit_pass';
    }

    return {
      artifact_role: 'comparative_final_internal_audit',
      artifact_name: 'comparative_final_internal_audit.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      comparative_layer_id: 'comparative_expansion_layer.stage2_m4_internal_closure',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'comparative_internal_closure_implemented',
      audit_status: auditStatus,
      current_comparative_support_class: 'comparative_internal_support_only',
      current_comparative_readiness_class: currentComparativeReadinessClass,
      adjudication_criteria_status: stage3CriteriaAssessment.adjudication_criteria_status,
      stage3_opening_state: stage3CriteriaAssessment.stage3_opening_state,
      layer_integrity: layerIntegrity,
      current_states: {
        stage2_m2_runtime_state:
          comparativeRuntimeBaseline.comparative_program_readiness_gate?.readiness_class,
        stage2_m3_operational_state:
          comparativeOperationalBaseline.comparative_program_readiness_gate?.readiness_class,
        human_channel_instantiation_state:
          instantiationReadiness.instantiation_summary?.overall_state,
        adjudication_criteria_status: stage3CriteriaAssessment.adjudication_criteria_status
      },
      failed_or_open_burdens: failedOrOpenBurdens,
      open_readiness_requirements: openReadinessRequirements,
      warnings: [
        'internal_closure_is_non_adjudicative',
        'open_burdens_remain_explicit',
        'stage3_opening_remains_gated',
        'paper10_remains_non_authorized'
      ],
      boundary_flags: {
        ...STANDARD_FLAGS,
        comparative_internal_closure_ready:
          currentComparativeReadinessClass === 'comparative_internal_closure_ready'
      },
      non_implications: [
        'Audit pass is not human equivalence.',
        'Audit pass is not superiority or inferiority.',
        'Audit pass is not external adjudication.',
        'Audit pass is not Paper 10 authorization.'
      ],
      interpretation_boundary: BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        stage2_m2_readiness_gate_ref: COMPARATIVE_RUNTIME_ARTIFACT_REFS.readiness_gate,
        stage2_m3_readiness_gate_ref: COMPARATIVE_OPERATIONAL_ARTIFACT_REFS.readiness_gate,
        stage2_m4_readiness_gate_ref: COMPARATIVE_CLOSURE_ARTIFACT_REFS.readiness_gate,
        current_lineage: currentLineage
      },
      schema_ref:
        'src/comparative_program/schemas/comparative_final_internal_audit.v1.json'
    };
  }
}

export const createComparativeFinalInternalAuditor = () =>
  new ComparativeFinalInternalAuditor();

export default {
  ComparativeFinalInternalAuditor,
  createComparativeFinalInternalAuditor
};
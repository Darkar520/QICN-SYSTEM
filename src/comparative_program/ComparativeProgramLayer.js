import fs from 'fs';
import {
  HUMAN_COMPARATOR_PROTOCOL
} from './HumanComparatorProtocolRegistry.js';
import { HUMAN_EQUIVALENCE_LADDER } from './HumanEquivalenceLadderRegistry.js';
import { CROSS_SUBSTRATE_TRANSPORT_PROTOCOL } from './CrossSubstrateTransportRegistry.js';
import { HUMAN_CHANNEL_REQUIREMENTS } from './HumanChannelRequirementsRegistry.js';
import { COMPARATOR_BURDEN_MATRIX } from './ComparatorBurdenMatrixRegistry.js';
import { HUMAN_CHANNEL_PATHWAYS } from './HumanChannelPathwaysRegistry.js';
import { COUNTERPART_ARTIFACT_CONTRACTS } from './CounterpartArtifactContractsRegistry.js';
import { HOMOLOGATION_CONTRACTS } from './HomologationContractsRegistry.js';
import { CROSS_SUBSTRATE_TRANSITION_CONTRACTS } from './CrossSubstrateTransitionContractsRegistry.js';
import {
  EXTERNAL_ADJUDICATION_OPENING_CRITERIA
} from './ExternalAdjudicationOpeningCriteriaRegistry.js';
import {
  COMPARATIVE_PROGRAM_ARTIFACT_SCHEMA,
  COMPARATIVE_PROGRAM_EXPECTED_ARTIFACTS,
  COMPARATIVE_PROGRAM_IMPLEMENTED_ARTIFACTS
} from './ComparativeProgramArtifactRegistry.js';
import { COMPARATIVE_PROGRAM_SURFACE_POLICY } from './ComparativeProgramSurfacePolicy.js';

const readJson = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const COMPARATIVE_PROGRAM_ROOT_SCHEMAS = Object.freeze({
  manifest: readJson('./schemas/comparative_program_manifest.v1.json'),
  human_comparator_assessment: readJson('./schemas/human_comparator_assessment.v1.json'),
  human_equivalence_assessment: readJson('./schemas/human_equivalence_assessment.v1.json'),
  cross_substrate_transport_assessment: readJson('./schemas/cross_substrate_transport_assessment.v1.json'),
  human_channel_pathway_assessment: readJson('./schemas/human_channel_pathway_assessment.v1.json'),
  counterpart_artifact_contract_assessment: readJson('./schemas/counterpart_artifact_contract_assessment.v1.json'),
  homologation_contract_assessment: readJson('./schemas/homologation_contract_assessment.v1.json'),
  cross_substrate_transition_contract_assessment: readJson('./schemas/cross_substrate_transition_contract_assessment.v1.json'),
  comparative_operational_readiness: readJson('./schemas/comparative_operational_readiness.v1.json'),
  comparative_final_internal_audit: readJson('./schemas/comparative_final_internal_audit.v1.json'),
  human_channel_instantiation_readiness: readJson('./schemas/human_channel_instantiation_readiness.v1.json'),
  paper10_comparative_readiness_gate: readJson('./schemas/paper10_comparative_readiness_gate.v1.json'),
  comparative_burden_fulfillment: readJson('./schemas/comparative_burden_fulfillment.v1.json'),
  stage3_opening_readiness: readJson('./schemas/stage3_opening_readiness.v1.json'),
  paper9_handoff_alignment: readJson('./schemas/paper9_handoff_alignment.v1.json'),
  stage3_opening_gate: readJson('./schemas/stage3_opening_gate.v1.json'),
  verification_matrix: readJson('./schemas/comparative_program_verification_matrix.v1.json'),
  readiness_gate: readJson('./schemas/comparative_program_readiness_gate.v1.json')
});

export const COMPARATIVE_PROGRAM_LAYER_STATUS = Object.freeze({
  layer_name: 'Comparative Expansion Layer',
  layer_id: 'comparative_expansion_layer.stage3_readiness_fulfillment',
  implementation_status: 'stage3_readiness_fulfillment_implemented',
  execution_status: 'stage3_openable_but_non_adjudicative_comparative_runtime',
  interpretation_boundary:
    'Stage 3 readiness fulfillment preserves Stage 2-M4 internal closure while adding structural burden fulfillment, human-channel instantiation protocols, counterpart schema bindings, comparative error-budget bindings, a Paper 9 handoff alignment layer, and a Stage 3 opening gate. It remains framework-internal only and does not establish human equivalence, superiority, external adjudication, transport-preservation verdicts, identity preservation, or Paper 10 authorization.'
});

export class ComparativeProgramLayer {
  describe() {
    return {
      ...COMPARATIVE_PROGRAM_LAYER_STATUS,
      comparator_object_class_count: (HUMAN_COMPARATOR_PROTOCOL.comparator_object_classes || []).length,
      equivalence_rung_count: (HUMAN_EQUIVALENCE_LADDER.rungs || []).length,
      transport_class_count: (CROSS_SUBSTRATE_TRANSPORT_PROTOCOL.transport_classes || []).length,
      human_channel_count: (HUMAN_CHANNEL_REQUIREMENTS.channels || []).length,
      comparator_burden_count: (COMPARATOR_BURDEN_MATRIX.burdens || []).length,
      pathway_count: (HUMAN_CHANNEL_PATHWAYS.pathways || []).length,
      counterpart_contract_count: (COUNTERPART_ARTIFACT_CONTRACTS.contracts || []).length,
      homologation_unit_count: (HOMOLOGATION_CONTRACTS.homologation_units || []).length,
      transition_contract_count: (CROSS_SUBSTRATE_TRANSITION_CONTRACTS.transition_contracts || []).length,
      adjudication_channel_criterion_count: (
        EXTERNAL_ADJUDICATION_OPENING_CRITERIA.required_human_channel_classes || []
      ).length,
      planned_artifacts: COMPARATIVE_PROGRAM_EXPECTED_ARTIFACTS,
      implemented_artifacts: COMPARATIVE_PROGRAM_IMPLEMENTED_ARTIFACTS,
      surface_boundary: COMPARATIVE_PROGRAM_SURFACE_POLICY.default_interpretation_boundary,
      schema_registry_status: COMPARATIVE_PROGRAM_ARTIFACT_SCHEMA.layer_status,
      scaffold_only: false,
      comparative_program_open: true,
      comparative_runtime_open: true,
      human_comparator_program_open: true,
      human_equivalence_program_open: true,
      cross_substrate_expansion_open: true,
      current_stage: 'stage3_readiness_fulfillment',
      comparative_runtime_state: 'stage3_ready_but_uninstantiated',
      stage2_m2_runtime_opening_complete: true,
      stage2_m3_contract_operationalization_complete: true,
      stage2_m4_internal_closure_complete: true,
      stage3_readiness_fulfillment_complete: true,
      comparative_internal_closure_state: 'comparative_internal_closure_ready',
      stage2_m4_state: 'comparative_internal_closure_ready',
      stage3_readiness_state: 'stage3_ready_but_uninstantiated',
      ready_for_stage2_m4: true,
      ready_for_stage3_opening: true,
      stage3_opening_state: 'ready_for_stage3_opening',
      paper9_handoff_state: 'paper9_handoff_ready_after_second_pass',
      paper10_scoping_state: 'paper10_scoping_ready_after_stage3_only',
      candidate_integration_blocked: true,
      audit_integration_blocked: true,
      not_human_equivalence_support: true,
      not_superiority_support: true,
      not_cross_substrate_equivalence_support: true,
      not_identity_preservation_support: true,
      not_external_adjudication: true,
      external_comparative_adjudication_state: 'not_ready_for_external_comparative_adjudication',
      not_paper10_authorization: true,
      framework_internal_only: true
    };
  }
}

export const createComparativeProgramLayer = () => new ComparativeProgramLayer();
export const describeComparativeProgramLayer = () => createComparativeProgramLayer().describe();

export default {
  COMPARATIVE_PROGRAM_LAYER_STATUS,
  COMPARATIVE_PROGRAM_ROOT_SCHEMAS,
  ComparativeProgramLayer,
  createComparativeProgramLayer,
  describeComparativeProgramLayer
};

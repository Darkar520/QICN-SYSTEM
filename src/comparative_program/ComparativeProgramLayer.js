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
  cross_substrate_transport_assessment: readJson(
    './schemas/cross_substrate_transport_assessment.v1.json'
  ),
  human_channel_pathway_assessment: readJson(
    './schemas/human_channel_pathway_assessment.v1.json'
  ),
  counterpart_artifact_contract_assessment: readJson(
    './schemas/counterpart_artifact_contract_assessment.v1.json'
  ),
  homologation_contract_assessment: readJson(
    './schemas/homologation_contract_assessment.v1.json'
  ),
  cross_substrate_transition_contract_assessment: readJson(
    './schemas/cross_substrate_transition_contract_assessment.v1.json'
  ),
  comparative_operational_readiness: readJson(
    './schemas/comparative_operational_readiness.v1.json'
  ),
  verification_matrix: readJson('./schemas/comparative_program_verification_matrix.v1.json'),
  readiness_gate: readJson('./schemas/comparative_program_readiness_gate.v1.json')
});

export const COMPARATIVE_PROGRAM_LAYER_STATUS = Object.freeze({
  layer_name: 'Comparative Expansion Layer',
  layer_id: 'comparative_expansion_layer.stage2_m3_operationalization',
  implementation_status: 'comparative_runtime_contract_operationalization_implemented',
  execution_status: 'contract_operationalized_internal_comparative_runtime',
  interpretation_boundary:
    'Stage 2-M3 operationalizes human-channel pathways, counterpart contracts, homologation contracts, and transition contracts after Stage 2-M2 bounded runtime opening. It remains framework-internal only and does not establish human equivalence, cross-substrate equivalence, superiority, external adjudication, or Paper 10 authorization.'
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
      transition_contract_count: (
        CROSS_SUBSTRATE_TRANSITION_CONTRACTS.transition_contracts || []
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
      current_stage: 'stage2_m3_operationalization',
      comparative_runtime_state: 'comparative_runtime_contract_operationalized',
      stage2_m2_runtime_opening_complete: true,
      stage2_m3_contract_operationalization_complete: true,
      stage2_m4_state: 'ready_for_stage2_m4',
      ready_for_stage2_m4: true,
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

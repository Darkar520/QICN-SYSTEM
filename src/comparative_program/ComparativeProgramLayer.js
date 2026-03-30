import fs from 'fs';
import {
  HUMAN_COMPARATOR_PROTOCOL
} from './HumanComparatorProtocolRegistry.js';
import { HUMAN_EQUIVALENCE_LADDER } from './HumanEquivalenceLadderRegistry.js';
import { CROSS_SUBSTRATE_TRANSPORT_PROTOCOL } from './CrossSubstrateTransportRegistry.js';
import { HUMAN_CHANNEL_REQUIREMENTS } from './HumanChannelRequirementsRegistry.js';
import { COMPARATOR_BURDEN_MATRIX } from './ComparatorBurdenMatrixRegistry.js';
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
  verification_matrix: readJson('./schemas/comparative_program_verification_matrix.v1.json'),
  readiness_gate: readJson('./schemas/comparative_program_readiness_gate.v1.json')
});

export const COMPARATIVE_PROGRAM_LAYER_STATUS = Object.freeze({
  layer_name: 'Comparative Expansion Layer',
  layer_id: 'comparative_expansion_layer.stage2_m2_runtime_opening',
  implementation_status: 'runtime_comparative_opening_implemented',
  execution_status: 'bounded_internal_comparative_runtime_opening',
  interpretation_boundary:
    'Stage 2-M2 opens bounded comparative runtime after BPF-M3. It remains framework-internal only and does not establish human equivalence, cross-substrate equivalence, superiority, external adjudication, or Paper 10 authorization.'
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
      candidate_integration_blocked: true,
      audit_integration_blocked: true,
      not_human_equivalence_support: true,
      not_cross_substrate_equivalence_support: true,
      not_external_adjudication: true,
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

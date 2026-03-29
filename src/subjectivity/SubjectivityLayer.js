import fs from 'fs';
import {
  SUBJECTIVITY_PROTOCOL_MANIFEST,
  SUBJECTIVITY_EXPECTED_ARTIFACTS
} from './SubjectivityArtifactRegistry.js';
import { SUBJECTIVITY_SURFACE_POLICY } from './SubjectivitySurfacePolicy.js';
import { SUBJECTIVITY_THRESHOLDS } from './SubjectivityThresholdRegistry.js';
import { SUBJECTIVITY_RIVAL_FAMILY } from './SubjectivityRivalFamilyRegistry.js';

const readJson = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const SUBJECTIVITY_ROOT_SCHEMAS = Object.freeze({
  manifest: readJson('./schemas/subjectivity_manifest.v1.json'),
  runtime_projection: readJson('./schemas/subjectivity_runtime_projection.v1.json'),
  gate_result: readJson('./schemas/subjectivity_gate_result.v1.json'),
  condition_summary: readJson('./schemas/subjectivity_condition_summary.v1.json'),
  batch_summary: readJson('./schemas/subjectivity_batch_summary.v1.json'),
  campaign_summary: readJson('./schemas/subjectivity_campaign_summary.v1.json'),
  candidate_projection: readJson('./schemas/subjectivity_candidate_projection.v1.json'),
  audit_handoff_summary: readJson('./schemas/subjectivity_audit_handoff_summary.v1.json'),
  verification_matrix: readJson('./schemas/subjectivity_verification_matrix.v1.json'),
  self_index_state: readJson('./schemas/self_index_state.v1.json'),
  ownership_attribution_report: readJson('./schemas/ownership_attribution_report.v1.json'),
  subjective_continuity_report: readJson('./schemas/subjective_continuity_report.v1.json'),
  first_person_perspective_report: readJson('./schemas/first_person_perspective_report.v1.json'),
  subjective_valuation_report: readJson('./schemas/subjective_valuation_report.v1.json'),
  subjectivity_intervention_profile: readJson('./schemas/subjectivity_intervention_profile.v1.json'),
  subjectivity_reducibility_report: readJson('./schemas/subjectivity_reducibility_report.v1.json')
});

export const SUBJECTIVITY_LAYER_STATUS = Object.freeze({
  layer_name: 'Subjectivity Runtime Layer',
  layer_id: 'subjectivity_runtime_layer.srt6',
  implementation_status: 'partial_runtime_path',
  execution_status:
    'executing_selfindex_ownership_continuity_perspective_valuation_intervention_partial_reducibility_internal_gate_closure_and_ecosystem_hardening_in_srt6',
  interpretation_boundary:
    'SRT-6 preserves the SRT-5 internal gate while adding condition/batch/campaign aggregation, ecosystem candidate integration, internal release bundle integration, audit-facing handoff summaries, and anti-stale ecosystem hardening. It remains framework-internal only and does not implement external validation, phenomenality closure, or claim-facing promotion.'
});

export class SubjectivityLayer {
  describe() {
    return {
      ...SUBJECTIVITY_LAYER_STATUS,
      coordinates: SUBJECTIVITY_PROTOCOL_MANIFEST.coordinates,
      required_artifacts: SUBJECTIVITY_EXPECTED_ARTIFACTS,
      root_schema_ids: Object.keys(SUBJECTIVITY_ROOT_SCHEMAS),
      threshold_status: SUBJECTIVITY_THRESHOLDS.status,
      rival_family_status: SUBJECTIVITY_RIVAL_FAMILY.comparator_implementation_status,
      default_surface_boundary: SUBJECTIVITY_SURFACE_POLICY.default_interpretation_boundary
    };
  }
}

export const createSubjectivityLayer = () => new SubjectivityLayer();

export const describeSubjectivityLayerScaffold = () => createSubjectivityLayer().describe();

export default {
  SUBJECTIVITY_LAYER_STATUS,
  SUBJECTIVITY_ROOT_SCHEMAS,
  SubjectivityLayer,
  createSubjectivityLayer,
  describeSubjectivityLayerScaffold
};

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
  self_index_state: readJson('./schemas/self_index_state.v1.json'),
  ownership_attribution_report: readJson('./schemas/ownership_attribution_report.v1.json'),
  subjective_continuity_report: readJson('./schemas/subjective_continuity_report.v1.json'),
  first_person_perspective_report: readJson('./schemas/first_person_perspective_report.v1.json'),
  subjective_valuation_report: readJson('./schemas/subjective_valuation_report.v1.json'),
  subjectivity_intervention_profile: readJson('./schemas/subjectivity_intervention_profile.v1.json')
});

export const SUBJECTIVITY_LAYER_STATUS = Object.freeze({
  layer_name: 'Subjectivity Runtime Layer',
  layer_id: 'subjectivity_runtime_layer.srt3',
  implementation_status: 'partial_runtime_path',
  execution_status:
    'executing_selfindex_ownership_continuity_perspective_valuation_intervention_only_in_srt3',
  interpretation_boundary:
    'SRT-3 implements SelfIndex, OwnershipField, ContinuityField, FirstPersonPerspective, ValuationAsymmetry, and a minimal InterventionProfile surface only. It does not compute IrreducibilityMargin, compare weak rivals, or emit subjectivity support verdicts.'
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

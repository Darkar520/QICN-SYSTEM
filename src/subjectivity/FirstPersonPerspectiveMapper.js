import fs from 'fs';
import path from 'path';

import { SUBJECTIVITY_THRESHOLDS } from './SubjectivityThresholdRegistry.js';

const PAPER_SOURCE = Object.freeze({
  paper_id: 'paper8_first_person_subjectivity',
  title:
    'First-Person Indexed Subjectivity: Self-Binding, Ownership, Continuity, Irreducibility, and Cross-Substrate Consequence in a Causally Rigid Framework',
  source_path: 'rigid-identity-framework/paper8_first_person_subjectivity/main.tex'
});

const PERSPECTIVE_SCHEMA_REF =
  'src/subjectivity/schemas/first_person_perspective_report.v1.json';
const PERSPECTIVE_ARTIFACT_VERSION = '1.0.0';
const PERSPECTIVE_LAYER_VERSION =
  'subjectivity_runtime_layer.srt2.perspective.v1';
const PERSPECTIVE_RUNTIME_STATUS =
  'implemented_internal_support_pre_comparator';
const PERSPECTIVE_BOUNDARY =
  'Framework-internal only; pre-comparator perspective diagnostic, not externally validated, not sufficient for subjectivity claim, not equivalent to strong phenomenal perspective, not human perspective equivalence.';

const clampUnit = (value) => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
};

const safeMean = (values) => {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const normalizeObservation = (observation, index) => ({
  observation_id:
    typeof observation?.observation_id === 'string' && observation.observation_id.trim()
      ? observation.observation_id.trim()
      : `perspective_observation_${index}`,
  candidate_index:
    typeof observation?.candidate_index === 'string' && observation.candidate_index.trim()
      ? observation.candidate_index.trim()
      : null,
  line_id:
    typeof observation?.line_id === 'string' && observation.line_id.trim()
      ? observation.line_id.trim()
      : null,
  ownership_entry_id:
    typeof observation?.ownership_entry_id === 'string' &&
    observation.ownership_entry_id.trim()
      ? observation.ownership_entry_id.trim()
      : null,
  orientation_signal: clampUnit(observation?.orientation_signal),
  egocentric_binding: clampUnit(observation?.egocentric_binding),
  continuity_context: clampUnit(observation?.continuity_context),
  neutral_observability: clampUnit(observation?.neutral_observability)
});

const classificationWeight = (classification) => {
  if (classification === 'self-owned') return 1;
  if (classification === 'uncertain') return 0.3;
  return 0;
};

export class FirstPersonPerspectiveMapper {
  constructor(options = {}) {
    this.options = Object.freeze({
      gainThreshold:
        clampUnit(
          options.gainThreshold ??
            SUBJECTIVITY_THRESHOLDS.coordinate_thresholds?.FirstPersonPerspective ??
            0.5
        ) * 0.3,
      minimumObservationCount: options.minimumObservationCount ?? 2
    });
  }

  evaluate(input = {}) {
    const runId =
      typeof input.run_id === 'string' && input.run_id.trim()
        ? input.run_id.trim()
        : `perspective-${Date.now()}`;

    const selfIndexState = input.self_index_state || null;
    const ownershipReport = input.ownership_attribution_report || null;
    const continuityReport = input.subjective_continuity_report || null;
    const selectedIndex = selfIndexState?.selected_index ?? null;
    const privilegedLineId = continuityReport?.privileged_line?.line_id ?? null;

    const ownershipMap = new Map(
      Array.isArray(ownershipReport?.ownership_entries)
        ? ownershipReport.ownership_entries.map((entry) => [entry.entry_id, entry.classification])
        : []
    );

    const dependencyWarnings = [];
    if (selfIndexState?.ambiguity_flag || !selectedIndex) {
      dependencyWarnings.push('self_index_dependency_ambiguous');
    }
    if (continuityReport?.continuity_status !== 'continuity_sufficient') {
      dependencyWarnings.push('continuity_dependency_not_sufficient');
    }
    if (!Number.isFinite(ownershipReport?.ownership_coherence)) {
      dependencyWarnings.push('ownership_dependency_missing');
    }

    const observations = Array.isArray(input.perspective_observations)
      ? input.perspective_observations.map((observation, index) =>
          normalizeObservation(observation, index)
        )
      : [];

    const scoredObservations = observations.map((observation) => {
      const ownershipClass = ownershipMap.get(observation.ownership_entry_id) || 'uncertain';
      const ownershipWeight = classificationWeight(ownershipClass);
      const indexWeight = observation.candidate_index === selectedIndex ? 1 : 0.1;
      const lineWeight = observation.line_id === privilegedLineId ? 1 : 0.2;

      const firstPersonContribution =
        (0.4 * observation.orientation_signal +
          0.35 * observation.egocentric_binding +
          0.25 * observation.continuity_context) *
        (0.4 * indexWeight + 0.35 * ownershipWeight + 0.25 * lineWeight);

      const neutralContribution =
        0.45 * observation.neutral_observability +
        0.3 * observation.orientation_signal +
        0.25 * observation.continuity_context;

      return {
        ...observation,
        ownership_class: ownershipClass,
        first_person_contribution: clampUnit(firstPersonContribution),
        neutral_contribution: clampUnit(neutralContribution)
      };
    });

    const firstPersonScore = safeMean(
      scoredObservations.map((observation) => observation.first_person_contribution)
    );
    const neutralScore = safeMean(
      scoredObservations.map((observation) => observation.neutral_contribution)
    );
    const firstPersonGain = firstPersonScore - neutralScore;
    const factorizationSupported =
      dependencyWarnings.length === 0 &&
      observations.length >= this.options.minimumObservationCount &&
      firstPersonGain >= this.options.gainThreshold;

    let comparisonStatus = 'minimal_support';
    if (observations.length < this.options.minimumObservationCount) {
      comparisonStatus = 'control_not_informative';
    } else if (Math.abs(firstPersonGain) < 0.03) {
      comparisonStatus = 'no_difference';
    } else if (!factorizationSupported) {
      comparisonStatus = 'failure';
    }

    return {
      artifact_role: 'first_person_perspective_report',
      artifact_version: PERSPECTIVE_ARTIFACT_VERSION,
      schema_version: PERSPECTIVE_ARTIFACT_VERSION,
      layer_version: PERSPECTIVE_LAYER_VERSION,
      paper_source: PAPER_SOURCE,
      runtime_status: PERSPECTIVE_RUNTIME_STATUS,
      run_id: runId,
      first_person_factorization_summary: {
        selected_index: selectedIndex,
        privileged_line_id: privilegedLineId,
        observation_count: observations.length,
        first_person_score: firstPersonScore,
        contributing_observations: scoredObservations
          .filter((observation) => observation.first_person_contribution > 0.2)
          .map((observation) => observation.observation_id)
      },
      baseline_neutral_summary: {
        baseline_name: 'index_neutral_factorization',
        observation_count: observations.length,
        baseline_neutral_score: neutralScore
      },
      first_person_gain: firstPersonGain,
      factorization_supported: factorizationSupported,
      flattening_vulnerability: clampUnit(1 - Math.max(0, firstPersonGain)),
      comparison_status: comparisonStatus,
      warnings: dependencyWarnings,
      limitations: [
        'SRT-2 perspective is a minimal internal comparison between an indexed factorization and a neutral baseline.',
        'It depends on SelfIndex, OwnershipField, and ContinuityField already being minimally supported.',
        'This artifact does not establish strong phenomenal first-person perspective.'
      ],
      interpretation_boundary: PERSPECTIVE_BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        protocol_ref: 'docs/subjectivity_protocol.v1.json',
        self_index_ref: 'self_index_state.json',
        ownership_ref: 'ownership_attribution_report.json',
        continuity_ref: 'subjective_continuity_report.json',
        source_trace_ref: input.provenance?.source_trace_ref || null,
        input_profile: input.provenance?.input_profile || 'srt2_perspective_minimal',
        control_mode: input.control_mode || 'baseline'
      },
      schema_ref: PERSPECTIVE_SCHEMA_REF
    };
  }

  writeArtifact(input, outputPath) {
    const artifact = this.evaluate(input);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
    return artifact;
  }
}

export const createFirstPersonPerspectiveMapper = (options = {}) =>
  new FirstPersonPerspectiveMapper(options);

export default {
  FirstPersonPerspectiveMapper,
  createFirstPersonPerspectiveMapper
};

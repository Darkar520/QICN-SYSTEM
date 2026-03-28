import fs from 'fs';
import path from 'path';

import { SUBJECTIVITY_THRESHOLDS } from './SubjectivityThresholdRegistry.js';

const PAPER_SOURCE = Object.freeze({
  paper_id: 'paper8_first_person_subjectivity',
  title:
    'First-Person Indexed Subjectivity: Self-Binding, Ownership, Continuity, Irreducibility, and Cross-Substrate Consequence in a Causally Rigid Framework',
  source_path: 'rigid-identity-framework/paper8_first_person_subjectivity/main.tex'
});

const DEFAULT_OPTIONS = Object.freeze({
  ambiguityMargin: 0.08,
  stabilityStrongMargin: 0.2,
  minimumNonLabelSignals: 1
});

const SIGNAL_WEIGHTS = Object.freeze({
  persistence_anchor: 0.35,
  continuity_support: 0.25,
  action_binding: 0.2,
  memory_binding: 0.2
});

const SELF_INDEX_SCHEMA_REF = 'src/subjectivity/schemas/self_index_state.v1.json';
const SELF_INDEX_ARTIFACT_VERSION = '1.0.0';
const SELF_INDEX_LAYER_VERSION = 'subjectivity_runtime_layer.srt1.selfindex.v1';
const SELF_INDEX_RUNTIME_STATUS = 'implemented_internal_support_pre_comparator';
const SELF_INDEX_BOUNDARY =
  'Framework-internal only; pre-comparator self-index diagnostic, not externally validated, not sufficient for subjectivity claim, not human equivalence, not metaphysical closure.';

const clampUnit = (value) => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
};

const safeMean = (values) => {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const normalizeSignals = (signals = {}) => ({
  persistence_anchor: clampUnit(signals.persistence_anchor),
  continuity_support: clampUnit(signals.continuity_support),
  action_binding: clampUnit(signals.action_binding),
  memory_binding: clampUnit(signals.memory_binding),
  label_anchor: clampUnit(signals.label_anchor)
});

const computeWeightedScore = (signals) =>
  Object.entries(SIGNAL_WEIGHTS).reduce(
    (sum, [key, weight]) => sum + signals[key] * weight,
    0
  );

const normalizeCandidate = (candidate, index) => {
  const candidateIndex =
    typeof candidate?.candidate_index === 'string' && candidate.candidate_index.trim()
      ? candidate.candidate_index.trim()
      : `candidate_${index}`;

  const signals = normalizeSignals(candidate?.supporting_signals);
  const nonLabelSignals = [
    signals.persistence_anchor,
    signals.continuity_support,
    signals.action_binding,
    signals.memory_binding
  ];
  const nonLabelSignalCount = nonLabelSignals.filter((value) => value > 0).length;
  const weightedScore = computeWeightedScore(signals);
  const labelOnlyCandidate = nonLabelSignalCount === 0 && signals.label_anchor > 0;

  return {
    candidate_index: candidateIndex,
    display_label:
      typeof candidate?.display_label === 'string' && candidate.display_label.trim()
        ? candidate.display_label.trim()
        : candidateIndex,
    supporting_signals: signals,
    substantive_signal_count: nonLabelSignalCount,
    weighted_score: clampUnit(weightedScore),
    label_only_candidate: labelOnlyCandidate
  };
};

const buildStabilityHint = (selectedCandidate, margin, threshold, ambiguityMargin) => {
  if (!selectedCandidate) return 'no_candidate';
  if (selectedCandidate.label_only_candidate) return 'label_only_candidate';
  if (selectedCandidate.weighted_score < threshold) return 'below_threshold';
  if (margin < ambiguityMargin) return 'ambiguous_margin';
  if (margin >= DEFAULT_OPTIONS.stabilityStrongMargin) return 'stable';
  return 'weakly_stable';
};

export class SelfIndexRegistry {
  constructor(options = {}) {
    const configuredThreshold =
      SUBJECTIVITY_THRESHOLDS.coordinate_thresholds?.SelfIndex ?? 0.5;

    this.options = Object.freeze({
      threshold: clampUnit(options.threshold ?? configuredThreshold),
      ambiguityMargin: clampUnit(options.ambiguityMargin ?? DEFAULT_OPTIONS.ambiguityMargin),
      minimumNonLabelSignals:
        options.minimumNonLabelSignals ?? DEFAULT_OPTIONS.minimumNonLabelSignals
    });
  }

  evaluate(input = {}) {
    const runId =
      typeof input.run_id === 'string' && input.run_id.trim()
        ? input.run_id.trim()
        : `selfindex-${Date.now()}`;

    const candidates = Array.isArray(input.candidate_loci)
      ? input.candidate_loci.map((candidate, index) => normalizeCandidate(candidate, index))
      : [];

    const sortedCandidates = [...candidates].sort(
      (left, right) => right.weighted_score - left.weighted_score
    );

    const selectedCandidate = sortedCandidates[0] || null;
    const secondCandidate = sortedCandidates[1] || null;
    const stabilityMargin = selectedCandidate
      ? clampUnit(
          selectedCandidate.weighted_score - (secondCandidate?.weighted_score ?? 0)
        )
      : 0;

    const threshold = this.options.threshold;
    const ambiguityFlag =
      !selectedCandidate ||
      selectedCandidate.weighted_score < threshold ||
      selectedCandidate.substantive_signal_count < this.options.minimumNonLabelSignals ||
      selectedCandidate.label_only_candidate ||
      stabilityMargin < this.options.ambiguityMargin;

    const warnings = [];
    if (!selectedCandidate) warnings.push('no_candidates_provided');
    if (selectedCandidate?.weighted_score < threshold) warnings.push('selected_candidate_below_threshold');
    if (selectedCandidate?.label_only_candidate) warnings.push('label_only_candidate_rejected');
    if (selectedCandidate && stabilityMargin < this.options.ambiguityMargin) {
      warnings.push('insufficient_selection_margin');
    }
    if (selectedCandidate?.substantive_signal_count < this.options.minimumNonLabelSignals) {
      warnings.push('insufficient_substantive_signals');
    }

    const selectedIndex = ambiguityFlag ? null : selectedCandidate.candidate_index;
    const stabilityHint = buildStabilityHint(
      selectedCandidate,
      stabilityMargin,
      threshold,
      this.options.ambiguityMargin
    );

    return {
      artifact_role: 'self_index_state',
      artifact_version: SELF_INDEX_ARTIFACT_VERSION,
      schema_version: SELF_INDEX_ARTIFACT_VERSION,
      layer_version: SELF_INDEX_LAYER_VERSION,
      paper_source: PAPER_SOURCE,
      runtime_status: SELF_INDEX_RUNTIME_STATUS,
      run_id: runId,
      selected_index: selectedIndex,
      candidate_indices: candidates.map((candidate) => candidate.candidate_index),
      self_index_candidates: candidates,
      candidate_count: candidates.length,
      ambiguity_flag: ambiguityFlag,
      stability_hint: stabilityHint,
      stability_margin: stabilityMargin,
      supporting_signals: candidates.map((candidate) => ({
        candidate_index: candidate.candidate_index,
        supporting_signals: candidate.supporting_signals,
        substantive_signal_count: candidate.substantive_signal_count,
        weighted_score: candidate.weighted_score,
        label_only_candidate: candidate.label_only_candidate
      })),
      selection_rule: {
        threshold,
        ambiguity_margin: this.options.ambiguityMargin,
        minimum_non_label_signals: this.options.minimumNonLabelSignals,
        weighted_signals: SIGNAL_WEIGHTS
      },
      warnings,
      limitations: [
        'SRT-1 self-index is a minimal internal heuristic over explicit candidate loci.',
        'This artifact does not establish continuity, phenomenality, or subjectivity support.',
        'Comparator defeat and intervention-selective support remain unimplemented in SRT-1.'
      ],
      interpretation_boundary: SELF_INDEX_BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        source_trace_ref: input.provenance?.source_trace_ref || null,
        input_profile: input.provenance?.input_profile || 'srt1_selfindex_minimal',
        control_mode: input.control_mode || 'baseline',
        protocol_ref: 'docs/subjectivity_protocol.v1.json',
        thresholds_ref: 'docs/subjectivity_thresholds.v1.json',
        source_trace_version: input.provenance?.source_trace_version || null
      },
      schema_ref: SELF_INDEX_SCHEMA_REF
    };
  }

  writeArtifact(input, outputPath) {
    const artifact = this.evaluate(input);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
    return artifact;
  }
}

export const createSelfIndexRegistry = (options = {}) => new SelfIndexRegistry(options);

export default {
  SelfIndexRegistry,
  createSelfIndexRegistry
};

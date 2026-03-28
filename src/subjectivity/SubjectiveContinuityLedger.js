import fs from 'fs';
import path from 'path';

import { SUBJECTIVITY_THRESHOLDS } from './SubjectivityThresholdRegistry.js';

const PAPER_SOURCE = Object.freeze({
  paper_id: 'paper8_first_person_subjectivity',
  title:
    'First-Person Indexed Subjectivity: Self-Binding, Ownership, Continuity, Irreducibility, and Cross-Substrate Consequence in a Causally Rigid Framework',
  source_path: 'rigid-identity-framework/paper8_first_person_subjectivity/main.tex'
});

const SIGNAL_WEIGHTS = Object.freeze({
  temporal_linkage: 0.3,
  ownership_alignment: 0.25,
  self_index_alignment: 0.2,
  remap_robustness: 0.15,
  memory_integrity: 0.1
});

const CONTINUITY_SCHEMA_REF =
  'src/subjectivity/schemas/subjective_continuity_report.v1.json';
const CONTINUITY_ARTIFACT_VERSION = '1.0.0';
const CONTINUITY_LAYER_VERSION =
  'subjectivity_runtime_layer.srt2.continuity.v1';
const CONTINUITY_RUNTIME_STATUS =
  'implemented_internal_support_pre_comparator';
const CONTINUITY_BOUNDARY =
  'Framework-internal only; pre-comparator continuity diagnostic, not externally validated, not sufficient for subjectivity claim, not equivalent to metaphysical persistence, not equivalent to human autobiographical continuity.';

const DEFAULT_OPTIONS = Object.freeze({
  ambiguityMargin: 0.08,
  forkMargin: 0.06,
  fracturePenaltyWeight: 0.3,
  forkPenaltyWeight: 0.2,
  copiedMemoryPenalty: 0.25,
  minimumHistoryLength: 3
});

const clampUnit = (value) => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
};

const safeMean = (values) => {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const normalizeSignals = (signals = {}) => ({
  temporal_linkage: clampUnit(signals.temporal_linkage),
  ownership_alignment: clampUnit(signals.ownership_alignment),
  self_index_alignment: clampUnit(signals.self_index_alignment),
  remap_robustness: clampUnit(signals.remap_robustness),
  memory_integrity: clampUnit(signals.memory_integrity)
});

const computeSignalScore = (signals) =>
  Object.entries(SIGNAL_WEIGHTS).reduce(
    (sum, [key, weight]) => sum + signals[key] * weight,
    0
  );

const normalizeLine = (line, index) => ({
  line_id:
    typeof line?.line_id === 'string' && line.line_id.trim()
      ? line.line_id.trim()
      : `continuity_line_${index}`,
  candidate_index:
    typeof line?.candidate_index === 'string' && line.candidate_index.trim()
      ? line.candidate_index.trim()
      : null,
  history_window_id:
    typeof line?.history_window_id === 'string' && line.history_window_id.trim()
      ? line.history_window_id.trim()
      : null,
  history_length: Number.isFinite(line?.history_length)
    ? Math.max(0, Math.floor(line.history_length))
    : 0,
  copied_memory_only: Boolean(line?.copied_memory_only),
  fracture_signal: clampUnit(line?.fracture_signal),
  fork_overlap: clampUnit(line?.fork_overlap),
  supporting_signals: normalizeSignals(line?.supporting_signals)
});

export class SubjectiveContinuityLedger {
  constructor(options = {}) {
    this.options = Object.freeze({
      threshold:
        clampUnit(
          options.threshold ??
            SUBJECTIVITY_THRESHOLDS.coordinate_thresholds?.ContinuityField ??
            0.5
        ),
      ambiguityMargin: clampUnit(
        options.ambiguityMargin ?? DEFAULT_OPTIONS.ambiguityMargin
      ),
      forkMargin: clampUnit(options.forkMargin ?? DEFAULT_OPTIONS.forkMargin),
      fracturePenaltyWeight:
        options.fracturePenaltyWeight ?? DEFAULT_OPTIONS.fracturePenaltyWeight,
      forkPenaltyWeight:
        options.forkPenaltyWeight ?? DEFAULT_OPTIONS.forkPenaltyWeight,
      copiedMemoryPenalty:
        options.copiedMemoryPenalty ?? DEFAULT_OPTIONS.copiedMemoryPenalty,
      minimumHistoryLength:
        options.minimumHistoryLength ?? DEFAULT_OPTIONS.minimumHistoryLength
    });
  }

  scoreLine(line, selectedIndex, ownershipCoherence) {
    const baseScore = computeSignalScore(line.supporting_signals);
    const selfIndexBonus =
      line.candidate_index && selectedIndex && line.candidate_index === selectedIndex
        ? 0.08
        : 0;
    const coherenceBoost = 0.08 * ownershipCoherence;
    const copiedMemoryPenalty = line.copied_memory_only
      ? this.options.copiedMemoryPenalty
      : 0;
    const fracturePenalty = line.fracture_signal * this.options.fracturePenaltyWeight;
    const forkPenalty = line.fork_overlap * this.options.forkPenaltyWeight;

    return clampUnit(
      baseScore + selfIndexBonus + coherenceBoost - copiedMemoryPenalty - fracturePenalty - forkPenalty
    );
  }

  evaluate(input = {}) {
    const runId =
      typeof input.run_id === 'string' && input.run_id.trim()
        ? input.run_id.trim()
        : `continuity-${Date.now()}`;

    const selfIndexState = input.self_index_state || null;
    const ownershipReport = input.ownership_attribution_report || null;
    const selectedIndex = selfIndexState?.selected_index ?? null;
    const ownershipCoherence = clampUnit(ownershipReport?.ownership_coherence ?? 0);
    const dependencyAmbiguous =
      Boolean(selfIndexState?.ambiguity_flag) || !selectedIndex;

    const lines = Array.isArray(input.trajectory_lines)
      ? input.trajectory_lines.map((line, index) => normalizeLine(line, index))
      : [];

    const warnings = [];
    if (dependencyAmbiguous) warnings.push('self_index_dependency_ambiguous');
    if (!Number.isFinite(ownershipReport?.ownership_coherence)) {
      warnings.push('ownership_dependency_missing');
    }

    const scoredLines = lines.map((line) => ({
      ...line,
      continuity_score: this.scoreLine(line, selectedIndex, ownershipCoherence)
    }));
    scoredLines.sort((left, right) => right.continuity_score - left.continuity_score);

    const insufficientHistory =
      scoredLines.length === 0 ||
      scoredLines.every((line) => line.history_length < this.options.minimumHistoryLength);
    if (insufficientHistory) warnings.push('insufficient_history');

    const privilegedLine = scoredLines[0] || null;
    const nearestRival = scoredLines[1] || null;
    const continuityMargin = privilegedLine
      ? privilegedLine.continuity_score - (nearestRival?.continuity_score ?? 0)
      : 0;
    const forkFlag =
      Boolean(privilegedLine) &&
      Boolean(nearestRival) &&
      privilegedLine.candidate_index === nearestRival.candidate_index &&
      continuityMargin < this.options.forkMargin;
    const fractureFlag =
      Boolean(privilegedLine) &&
      (privilegedLine.continuity_score < this.options.threshold ||
        privilegedLine.fracture_signal >= 0.5 ||
        privilegedLine.copied_memory_only);
    const ambiguityFlag =
      dependencyAmbiguous ||
      insufficientHistory ||
      !privilegedLine ||
      continuityMargin < this.options.ambiguityMargin;

    let continuityStatus = 'continuity_sufficient';
    if (insufficientHistory) continuityStatus = 'insufficient_history';
    else if (forkFlag) continuityStatus = 'fork';
    else if (fractureFlag) continuityStatus = 'fracture';
    else if (ambiguityFlag) continuityStatus = 'continuity_ambiguous';

    if (forkFlag) warnings.push('fork_ambiguity');
    if (fractureFlag) warnings.push('continuity_fracture_detected');

    return {
      artifact_role: 'subjective_continuity_report',
      artifact_version: CONTINUITY_ARTIFACT_VERSION,
      schema_version: CONTINUITY_ARTIFACT_VERSION,
      layer_version: CONTINUITY_LAYER_VERSION,
      paper_source: PAPER_SOURCE,
      runtime_status: CONTINUITY_RUNTIME_STATUS,
      run_id: runId,
      continuity_status: continuityStatus,
      continuity_margin: privilegedLine ? continuityMargin : 0,
      privileged_line: privilegedLine
        ? {
            line_id: privilegedLine.line_id,
            candidate_index: privilegedLine.candidate_index,
            history_window_id: privilegedLine.history_window_id,
            history_length: privilegedLine.history_length,
            continuity_score: privilegedLine.continuity_score
          }
        : null,
      rival_line_count: Math.max(scoredLines.length - 1, 0),
      rival_lines_summary: scoredLines.slice(1).map((line) => ({
        line_id: line.line_id,
        candidate_index: line.candidate_index,
        history_length: line.history_length,
        copied_memory_only: line.copied_memory_only,
        continuity_score: line.continuity_score
      })),
      fracture_flag: fractureFlag,
      fork_flag: forkFlag,
      ambiguity_flag: ambiguityFlag,
      supporting_signals: scoredLines.map((line) => ({
        line_id: line.line_id,
        candidate_index: line.candidate_index,
        history_length: line.history_length,
        supporting_signals: line.supporting_signals,
        copied_memory_only: line.copied_memory_only,
        fracture_signal: line.fracture_signal,
        fork_overlap: line.fork_overlap,
        continuity_score: line.continuity_score
      })),
      warnings,
      limitations: [
        'SRT-2 continuity is a minimal internal gap-based ledger over explicit trajectory lines.',
        'Copied memory without continuity-preserving linkage is penalized rather than treated as automatic continuity.',
        'This artifact does not establish metaphysical persistence or human autobiographical continuity.'
      ],
      interpretation_boundary: CONTINUITY_BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        protocol_ref: 'docs/subjectivity_protocol.v1.json',
        self_index_ref: 'self_index_state.json',
        ownership_ref: 'ownership_attribution_report.json',
        source_trace_ref: input.provenance?.source_trace_ref || null,
        input_profile: input.provenance?.input_profile || 'srt2_continuity_minimal',
        control_mode: input.control_mode || 'baseline'
      },
      schema_ref: CONTINUITY_SCHEMA_REF
    };
  }

  writeArtifact(input, outputPath) {
    const artifact = this.evaluate(input);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
    return artifact;
  }
}

export const createSubjectiveContinuityLedger = (options = {}) =>
  new SubjectiveContinuityLedger(options);

export default {
  SubjectiveContinuityLedger,
  createSubjectiveContinuityLedger
};

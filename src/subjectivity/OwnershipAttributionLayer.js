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
  causal_link: 0.35,
  continuity_link: 0.25,
  action_author_link: 0.2,
  memory_link: 0.2
});

const OWNERSHIP_SCHEMA_REF =
  'src/subjectivity/schemas/ownership_attribution_report.v1.json';
const OWNERSHIP_ARTIFACT_VERSION = '1.0.0';
const OWNERSHIP_LAYER_VERSION =
  'subjectivity_runtime_layer.srt1.ownership.v1';
const OWNERSHIP_RUNTIME_STATUS = 'implemented_internal_support_pre_comparator';
const OWNERSHIP_BOUNDARY =
  'Framework-internal only; pre-comparator ownership diagnostic, not externally validated, not sufficient for subjectivity claim, not human equivalence, not metaphysical closure.';

const clampUnit = (value) => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
};

const normalizeSignals = (signals = {}) => ({
  causal_link: clampUnit(signals.causal_link),
  continuity_link: clampUnit(signals.continuity_link),
  action_author_link: clampUnit(signals.action_author_link),
  memory_link: clampUnit(signals.memory_link)
});

const computeSignalStrength = (signals) =>
  Object.entries(SIGNAL_WEIGHTS).reduce(
    (sum, [key, weight]) => sum + signals[key] * weight,
    0
  );

const normalizeEntry = (entry, index) => {
  const substantiveSignals = normalizeSignals(entry?.substantive_signals);
  return {
    entry_id:
      typeof entry?.entry_id === 'string' && entry.entry_id.trim()
        ? entry.entry_id.trim()
        : `ownership_entry_${index}`,
    candidate_index:
      typeof entry?.candidate_index === 'string' && entry.candidate_index.trim()
        ? entry.candidate_index.trim()
        : null,
    source_kind:
      typeof entry?.source_kind === 'string' && entry.source_kind.trim()
        ? entry.source_kind.trim()
        : 'event',
    substantive_signals: substantiveSignals,
    bookkeeping_only: Boolean(entry?.bookkeeping_only),
    bookkeeping_tags: Array.isArray(entry?.bookkeeping_tags) ? [...entry.bookkeeping_tags] : [],
    external_hint: clampUnit(entry?.external_hint),
    signal_strength: clampUnit(computeSignalStrength(substantiveSignals))
  };
};

export class OwnershipAttributionLayer {
  constructor(options = {}) {
    this.options = Object.freeze({
      ownThreshold:
        clampUnit(options.ownThreshold ?? SUBJECTIVITY_THRESHOLDS.coordinate_thresholds?.OwnershipField ?? 0.5),
      externalThreshold: clampUnit(options.externalThreshold ?? 0.45),
      bookkeepingTolerance: clampUnit(options.bookkeepingTolerance ?? 0.2)
    });
  }

  classifyEntry(entry, selectedIndex, ambiguousDependency) {
    if (ambiguousDependency || !selectedIndex) {
      return {
        classification: 'uncertain',
        reasons: ['self_index_ambiguous_or_missing']
      };
    }

    if (entry.bookkeeping_only && entry.signal_strength <= this.options.bookkeepingTolerance) {
      return {
        classification: 'uncertain',
        reasons: ['bookkeeping_like_assignment_rejected']
      };
    }

    if (
      entry.candidate_index === selectedIndex &&
      entry.signal_strength >= this.options.ownThreshold
    ) {
      return {
        classification: 'self-owned',
        reasons: ['selected_index_match', 'substantive_support_above_threshold']
      };
    }

    if (
      entry.candidate_index !== selectedIndex &&
      (entry.external_hint >= 0.5 || entry.signal_strength >= this.options.externalThreshold)
    ) {
      return {
        classification: 'non-self/external',
        reasons: ['external_or_nonself_alignment']
      };
    }

    return {
      classification: 'uncertain',
      reasons: ['insufficient_substantive_support']
    };
  }

  evaluate(input = {}) {
    const runId =
      typeof input.run_id === 'string' && input.run_id.trim()
        ? input.run_id.trim()
        : `ownership-${Date.now()}`;

    const selfIndexState = input.self_index_state || null;
    const selectedIndex = selfIndexState?.selected_index ?? null;
    const ambiguousDependency = Boolean(selfIndexState?.ambiguity_flag || !selectedIndex);
    const entries = Array.isArray(input.ownership_entries)
      ? input.ownership_entries.map((entry, index) => normalizeEntry(entry, index))
      : [];

    const warnings = [];
    if (ambiguousDependency) warnings.push('self_index_dependency_ambiguous');

    const ownershipEntries = entries.map((entry) => {
      const classification = this.classifyEntry(entry, selectedIndex, ambiguousDependency);
      if (classification.reasons.includes('bookkeeping_like_assignment_rejected')) {
        warnings.push(`bookkeeping_like_rejected:${entry.entry_id}`);
      }
      return {
        entry_id: entry.entry_id,
        candidate_index: entry.candidate_index,
        source_kind: entry.source_kind,
        classification: classification.classification,
        signal_strength: entry.signal_strength,
        bookkeeping_only: entry.bookkeeping_only,
        bookkeeping_tags: entry.bookkeeping_tags,
        reasons: classification.reasons
      };
    });

    const decisiveEntries = ownershipEntries.filter(
      (entry) => entry.classification !== 'uncertain'
    );
    const coherentDecisiveEntries = decisiveEntries.filter((entry) => {
      if (entry.classification === 'self-owned') return entry.candidate_index === selectedIndex;
      if (entry.classification === 'non-self/external') return entry.candidate_index !== selectedIndex;
      return false;
    });

    const ownershipCoherence = decisiveEntries.length
      ? clampUnit(coherentDecisiveEntries.length / decisiveEntries.length)
      : 0;
    const uncertainFraction = entries.length
      ? clampUnit(
          ownershipEntries.filter((entry) => entry.classification === 'uncertain').length /
            entries.length
        )
      : 1;

    return {
      artifact_role: 'ownership_attribution_report',
      artifact_version: OWNERSHIP_ARTIFACT_VERSION,
      schema_version: OWNERSHIP_ARTIFACT_VERSION,
      layer_version: OWNERSHIP_LAYER_VERSION,
      paper_source: PAPER_SOURCE,
      runtime_status: OWNERSHIP_RUNTIME_STATUS,
      run_id: runId,
      self_index_dependency: {
        artifact_role: selfIndexState?.artifact_role || null,
        run_id: selfIndexState?.run_id || null,
        selected_index: selectedIndex,
        ambiguity_flag: Boolean(selfIndexState?.ambiguity_flag)
      },
      ownership_entries: ownershipEntries,
      ownership_summary: {
        self_owned: ownershipEntries.filter((entry) => entry.classification === 'self-owned').length,
        non_self_or_external: ownershipEntries.filter(
          (entry) => entry.classification === 'non-self/external'
        ).length,
        uncertain: ownershipEntries.filter((entry) => entry.classification === 'uncertain').length
      },
      ownership_coherence: ownershipCoherence,
      uncertain_fraction: uncertainFraction,
      relabeling_sensitivity: 0,
      warnings: [...new Set(warnings)],
      limitations: [
        'SRT-1 ownership is a minimal internal attribution layer over explicit entries and self-index output.',
        'Bookkeeping-like tags are rejected when unsupported by substantive signals.',
        'This artifact does not establish phenomenal ownership or full subjectivity.'
      ],
      interpretation_boundary: OWNERSHIP_BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        protocol_ref: 'docs/subjectivity_protocol.v1.json',
        self_index_ref: 'self_index_state.json',
        source_trace_ref: input.provenance?.source_trace_ref || null,
        input_profile: input.provenance?.input_profile || 'srt1_ownership_minimal',
        control_mode: input.control_mode || 'baseline'
      },
      schema_ref: OWNERSHIP_SCHEMA_REF
    };
  }

  writeArtifact(input, outputPath) {
    const artifact = this.evaluate(input);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
    return artifact;
  }
}

export const createOwnershipAttributionLayer = (options = {}) =>
  new OwnershipAttributionLayer(options);

export default {
  OwnershipAttributionLayer,
  createOwnershipAttributionLayer
};

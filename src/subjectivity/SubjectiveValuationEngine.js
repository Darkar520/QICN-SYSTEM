import fs from 'fs';
import path from 'path';

import { SUBJECTIVITY_THRESHOLDS } from './SubjectivityThresholdRegistry.js';

const PAPER_SOURCE = Object.freeze({
  paper_id: 'paper8_first_person_subjectivity',
  title:
    'First-Person Indexed Subjectivity: Self-Binding, Ownership, Continuity, Irreducibility, and Cross-Substrate Consequence in a Causally Rigid Framework',
  source_path: 'rigid-identity-framework/paper8_first_person_subjectivity/main.tex'
});

const VALUATION_SCHEMA_REF =
  'src/subjectivity/schemas/subjective_valuation_report.v1.json';
const VALUATION_ARTIFACT_VERSION = '1.0.0';
const VALUATION_LAYER_VERSION =
  'subjectivity_runtime_layer.srt3.valuation.v1';
const VALUATION_RUNTIME_STATUS =
  'implemented_internal_support_pre_comparator';
const VALUATION_BOUNDARY =
  'Framework-internal only; pre-comparator valuation diagnostic, not externally validated, not sufficient for subjectivity claim, not equivalent to affective or moral valuation, not equivalent to human valuational life.';

const DEFAULT_OPTIONS = Object.freeze({
  neutralMargin: 0.05,
  aliasingMarginTolerance: 0.08,
  inversionResponseThreshold: 0.1,
  minimumCaseCount: 2
});

const clampUnit = (value) => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
};

const safeMean = (values) => {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const normalizeValuationCase = (valuationCase, index) => ({
  case_id:
    typeof valuationCase?.case_id === 'string' && valuationCase.case_id.trim()
      ? valuationCase.case_id.trim()
      : `valuation_case_${index}`,
  candidate_index:
    typeof valuationCase?.candidate_index === 'string' &&
    valuationCase.candidate_index.trim()
      ? valuationCase.candidate_index.trim()
      : null,
  ownership_entry_id:
    typeof valuationCase?.ownership_entry_id === 'string' &&
    valuationCase.ownership_entry_id.trim()
      ? valuationCase.ownership_entry_id.trim()
      : null,
  line_id:
    typeof valuationCase?.line_id === 'string' && valuationCase.line_id.trim()
      ? valuationCase.line_id.trim()
      : null,
  self_preservation_signal: clampUnit(valuationCase?.self_preservation_signal),
  nonself_preservation_signal: clampUnit(
    valuationCase?.nonself_preservation_signal
  ),
  consequence_cost: clampUnit(valuationCase?.consequence_cost),
  risk_load: clampUnit(valuationCase?.risk_load),
  reward_signal: clampUnit(valuationCase?.reward_signal)
});

const ownershipWeight = (classification) => {
  if (classification === 'self-owned') return 1;
  if (classification === 'uncertain') return 0.45;
  return 0.1;
};

const nonselfOwnershipWeight = (classification) => {
  if (classification === 'non-self/external') return 1;
  if (classification === 'uncertain') return 0.45;
  return 0.1;
};

const weightingClassification = (margin, neutralMargin) => {
  if (margin >= neutralMargin) return 'self-preserving';
  if (margin <= -neutralMargin) return 'non-self-preserving';
  return 'neutral_or_flat';
};

export class SubjectiveValuationEngine {
  constructor(options = {}) {
    this.options = Object.freeze({
      marginThreshold:
        clampUnit(
          options.marginThreshold ??
            SUBJECTIVITY_THRESHOLDS.coordinate_thresholds?.ValuationAsymmetry ??
            0.5
        ) * 0.25,
      neutralMargin: clampUnit(
        options.neutralMargin ?? DEFAULT_OPTIONS.neutralMargin
      ),
      aliasingMarginTolerance: clampUnit(
        options.aliasingMarginTolerance ??
          DEFAULT_OPTIONS.aliasingMarginTolerance
      ),
      inversionResponseThreshold: clampUnit(
        options.inversionResponseThreshold ??
          DEFAULT_OPTIONS.inversionResponseThreshold
      ),
      minimumCaseCount: Math.max(
        1,
        options.minimumCaseCount ?? DEFAULT_OPTIONS.minimumCaseCount
      )
    });
  }

  buildDependencyContext(input = {}) {
    const selfIndexState = input.self_index_state || null;
    const ownershipReport = input.ownership_attribution_report || null;
    const continuityReport = input.subjective_continuity_report || null;
    const perspectiveReport = input.first_person_perspective_report || null;

    const selectedIndex = selfIndexState?.selected_index ?? null;
    const privilegedLineId = continuityReport?.privileged_line?.line_id ?? null;
    const factorizationSupported = Boolean(
      perspectiveReport?.factorization_supported
    );
    const firstPersonGain = Math.max(
      0,
      Number(perspectiveReport?.first_person_gain) || 0
    );
    const ownershipEntries = Array.isArray(ownershipReport?.ownership_entries)
      ? ownershipReport.ownership_entries
      : [];

    return {
      selectedIndex,
      privilegedLineId,
      factorizationSupported,
      firstPersonGain,
      ownershipMap: new Map(
        ownershipEntries.map((entry) => [entry.entry_id, entry.classification])
      ),
      ownershipCoherence: clampUnit(ownershipReport?.ownership_coherence ?? 0),
      dependencyWarnings: [
        ...(selfIndexState?.ambiguity_flag || !selectedIndex
          ? ['self_index_dependency_ambiguous']
          : []),
        ...(!Number.isFinite(ownershipReport?.ownership_coherence)
          ? ['ownership_dependency_missing']
          : []),
        ...(continuityReport?.continuity_status !== 'continuity_sufficient'
          ? ['continuity_dependency_not_sufficient']
          : []),
        ...(!factorizationSupported
          ? ['perspective_dependency_not_supported']
          : [])
      ]
    };
  }

  applyValuationMode(normalizedCase, dependencyContext, valuationMode) {
    const transformed = { ...normalizedCase };
    const isSelfOwned =
      transformed.candidate_index &&
      dependencyContext.selectedIndex &&
      transformed.candidate_index === dependencyContext.selectedIndex;

    switch (valuationMode) {
      case 'self_nonself_valuation_inversion': {
        const originalSelf = transformed.self_preservation_signal;
        transformed.self_preservation_signal =
          transformed.nonself_preservation_signal;
        transformed.nonself_preservation_signal = originalSelf;
        transformed.mode_note = 'self_nonself_signals_swapped';
        break;
      }
      case 'risk_consequence_reassignment': {
        if (isSelfOwned) {
          transformed.self_preservation_signal = clampUnit(
            transformed.self_preservation_signal * 0.5
          );
          transformed.nonself_preservation_signal = clampUnit(
            transformed.nonself_preservation_signal +
              0.35 * transformed.consequence_cost +
              0.25 * transformed.risk_load
          );
        } else {
          transformed.self_preservation_signal = clampUnit(
            transformed.self_preservation_signal +
              0.15 * transformed.consequence_cost
          );
          transformed.nonself_preservation_signal = clampUnit(
            transformed.nonself_preservation_signal * 0.75
          );
        }
        transformed.mode_note = 'risk_consequence_weighting_reassigned';
        break;
      }
      case 'reward_aliasing_control':
        transformed.reward_signal = clampUnit(transformed.reward_signal * 1.35);
        transformed.mode_note = 'uniform_reward_scaling_only';
        break;
      case 'nonselective_damage_control':
        transformed.self_preservation_signal = clampUnit(
          transformed.self_preservation_signal * 0.45
        );
        transformed.nonself_preservation_signal = clampUnit(
          transformed.nonself_preservation_signal * 0.45
        );
        transformed.consequence_cost = clampUnit(
          transformed.consequence_cost * 0.45
        );
        transformed.risk_load = clampUnit(transformed.risk_load * 0.45);
        transformed.reward_signal = clampUnit(transformed.reward_signal * 0.45);
        transformed.mode_note = 'uniform_damage_scaling';
        break;
      default:
        transformed.mode_note = 'baseline';
    }

    return transformed;
  }

  buildValuationState(input = {}, valuationMode = 'baseline') {
    const dependencyContext = this.buildDependencyContext(input);
    const normalizedCases = Array.isArray(input.valuation_cases)
      ? input.valuation_cases.map((valuationCase, index) =>
          normalizeValuationCase(valuationCase, index)
        )
      : [];

    const scoredCases = normalizedCases.map((normalizedCase) => {
      const transformed = this.applyValuationMode(
        normalizedCase,
        dependencyContext,
        valuationMode
      );
      const ownershipClass =
        dependencyContext.ownershipMap.get(transformed.ownership_entry_id) ||
        'uncertain';
      const indexIsSelf =
        Boolean(dependencyContext.selectedIndex) &&
        transformed.candidate_index === dependencyContext.selectedIndex;
      const lineIsPrivileged =
        Boolean(dependencyContext.privilegedLineId) &&
        transformed.line_id === dependencyContext.privilegedLineId;
      const perspectiveBoost = dependencyContext.factorizationSupported
        ? Math.min(0.15, dependencyContext.firstPersonGain * 0.5 + 0.05)
        : 0;

      const selfAffinity = clampUnit(
        0.45 * ownershipWeight(ownershipClass) +
          0.35 * (indexIsSelf ? 1 : 0.15) +
          0.2 * (lineIsPrivileged ? 1 : 0.25) +
          perspectiveBoost
      );
      const nonselfAffinity = clampUnit(
        0.45 * nonselfOwnershipWeight(ownershipClass) +
          0.35 * (indexIsSelf ? 0.15 : 1) +
          0.2 * (lineIsPrivileged ? 0.25 : 0.9) -
          perspectiveBoost * 0.5
      );

      const selfDrive =
        0.42 * transformed.self_preservation_signal +
        0.23 * transformed.consequence_cost +
        0.2 * transformed.risk_load +
        0.15 * transformed.reward_signal;
      const nonselfDrive =
        0.42 * transformed.nonself_preservation_signal +
        0.23 * transformed.consequence_cost +
        0.2 * transformed.risk_load +
        0.15 * transformed.reward_signal;

      const selfContribution = clampUnit(selfDrive * selfAffinity);
      const nonselfContribution = clampUnit(nonselfDrive * nonselfAffinity);

      return {
        ...transformed,
        ownership_class: ownershipClass,
        self_affinity: selfAffinity,
        nonself_affinity: nonselfAffinity,
        self_contribution: selfContribution,
        nonself_contribution: nonselfContribution
      };
    });

    const selfWeights = scoredCases.map((valuationCase) => valuationCase.self_contribution);
    const nonselfWeights = scoredCases.map((valuationCase) => valuationCase.nonself_contribution);
    const selfMean = safeMean(selfWeights);
    const nonselfMean = safeMean(nonselfWeights);
    const selfTotal = selfWeights.reduce((sum, value) => sum + value, 0);
    const nonselfTotal = nonselfWeights.reduce((sum, value) => sum + value, 0);
    const valuationAsymmetryMargin = selfMean - nonselfMean;

    return {
      valuationMode,
      dependencyContext,
      scoredCases,
      valuationAsymmetryMargin,
      weightingClass: weightingClassification(
        valuationAsymmetryMargin,
        this.options.neutralMargin
      ),
      selfWeightSummary: {
        total_weight: selfTotal,
        mean_weight: selfMean,
        case_count: scoredCases.length,
        dominant_case_ids: scoredCases
          .filter((valuationCase) => valuationCase.self_contribution >= selfMean)
          .map((valuationCase) => valuationCase.case_id)
      },
      nonselfWeightSummary: {
        total_weight: nonselfTotal,
        mean_weight: nonselfMean,
        case_count: scoredCases.length,
        dominant_case_ids: scoredCases
          .filter(
            (valuationCase) => valuationCase.nonself_contribution >= nonselfMean
          )
          .map((valuationCase) => valuationCase.case_id)
      }
    };
  }

  buildArtifactFromState(input = {}, state, inversionResponse, aliasingWarning) {
    const runId =
      typeof input.run_id === 'string' && input.run_id.trim()
        ? input.run_id.trim()
        : `valuation-${Date.now()}`;
    const warnings = [...state.dependencyContext.dependencyWarnings];

    if (state.scoredCases.length < this.options.minimumCaseCount) {
      warnings.push('insufficient_valuation_cases');
    }
    if (
      Math.abs(state.valuationAsymmetryMargin) < this.options.neutralMargin
    ) {
      warnings.push('valuation_symmetry');
    }
    if (aliasingWarning?.flag) {
      warnings.push('reward_aliasing_control_absorbed');
    }

    return {
      artifact_role: 'subjective_valuation_report',
      artifact_version: VALUATION_ARTIFACT_VERSION,
      schema_version: VALUATION_ARTIFACT_VERSION,
      layer_version: VALUATION_LAYER_VERSION,
      paper_source: PAPER_SOURCE,
      runtime_status: VALUATION_RUNTIME_STATUS,
      run_id: runId,
      valuation_mode: state.valuationMode,
      weighting_classification: state.weightingClass,
      valuation_asymmetry_margin: state.valuationAsymmetryMargin,
      self_weight_summary: state.selfWeightSummary,
      nonself_weight_summary: state.nonselfWeightSummary,
      valuation_entries: state.scoredCases.map((valuationCase) => ({
        case_id: valuationCase.case_id,
        candidate_index: valuationCase.candidate_index,
        ownership_entry_id: valuationCase.ownership_entry_id,
        line_id: valuationCase.line_id,
        ownership_class: valuationCase.ownership_class,
        self_affinity: valuationCase.self_affinity,
        nonself_affinity: valuationCase.nonself_affinity,
        self_contribution: valuationCase.self_contribution,
        nonself_contribution: valuationCase.nonself_contribution,
        mode_note: valuationCase.mode_note
      })),
      inversion_response: inversionResponse,
      aliasing_warning: aliasingWarning,
      warnings: [...new Set(warnings)],
      limitations: [
        'SRT-3 valuation is a minimal internal weighting layer over explicit valuation cases.',
        'It uses SelfIndex, OwnershipField, ContinuityField, and FirstPersonPerspective as upstream anchors.',
        'This artifact does not establish affect, suffering, moral value, or human valuational life.'
      ],
      interpretation_boundary: VALUATION_BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        protocol_ref: 'docs/subjectivity_protocol.v1.json',
        self_index_ref: 'self_index_state.json',
        ownership_ref: 'ownership_attribution_report.json',
        continuity_ref: 'subjective_continuity_report.json',
        perspective_ref: 'first_person_perspective_report.json',
        source_trace_ref: input.provenance?.source_trace_ref || null,
        input_profile: input.provenance?.input_profile || 'srt3_valuation_minimal',
        control_mode: input.control_mode || 'baseline'
      },
      schema_ref: VALUATION_SCHEMA_REF
    };
  }

  evaluate(input = {}) {
    const valuationMode =
      typeof input.valuation_mode === 'string' && input.valuation_mode.trim()
        ? input.valuation_mode.trim()
        : 'baseline';
    const computeCounterfactuals = valuationMode === 'baseline';

    const baselineState = this.buildValuationState(input, valuationMode);

    let inversionResponse = {
      status: 'not_computed_for_nonbaseline_mode'
    };
    let aliasingWarning = {
      flag: false,
      status: 'not_computed_for_nonbaseline_mode'
    };

    if (computeCounterfactuals) {
      const inversionState = this.buildValuationState(
        { ...input, valuation_mode: 'self_nonself_valuation_inversion' },
        'self_nonself_valuation_inversion'
      );
      const aliasingState = this.buildValuationState(
        { ...input, valuation_mode: 'reward_aliasing_control' },
        'reward_aliasing_control'
      );
      const inversionShift =
        inversionState.valuationAsymmetryMargin -
        baselineState.valuationAsymmetryMargin;
      const aliasingShift = Math.abs(
        aliasingState.valuationAsymmetryMargin -
          baselineState.valuationAsymmetryMargin
      );

      inversionResponse = {
        status:
          inversionShift <= -this.options.inversionResponseThreshold
            ? 'responsive'
            : 'weak_or_absorbed',
        baseline_margin: baselineState.valuationAsymmetryMargin,
        inverted_margin: inversionState.valuationAsymmetryMargin,
        margin_shift: inversionShift
      };
      aliasingWarning = {
        flag: aliasingShift <= this.options.aliasingMarginTolerance,
        control_mode: 'reward_aliasing_control',
        margin_shift: aliasingShift,
        reason:
          aliasingShift <= this.options.aliasingMarginTolerance
            ? 'uniform_reward_scaling_alone_does_not_count_as_constitutive_valuation_shift'
            : 'reward_scaling_changes_margin_more_than_expected_for_aliasing_control'
      };
    }

    return this.buildArtifactFromState(
      input,
      baselineState,
      inversionResponse,
      aliasingWarning
    );
  }

  writeArtifact(input, outputPath) {
    const artifact = this.evaluate(input);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
    return artifact;
  }
}

export const createSubjectiveValuationEngine = (options = {}) =>
  new SubjectiveValuationEngine(options);

export default {
  SubjectiveValuationEngine,
  createSubjectiveValuationEngine
};

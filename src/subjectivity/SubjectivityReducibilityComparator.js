import fs from 'fs';
import path from 'path';

import { SUBJECTIVITY_THRESHOLDS } from './SubjectivityThresholdRegistry.js';
import { SUBJECTIVITY_RIVAL_FAMILY } from './SubjectivityRivalFamilyRegistry.js';
import {
  runInformedReserveSuite,
  runSelectiveAddressLesionSuite,
  verifySubjectivityCoreTheoremsAndNegativeControls
} from './InformedReserveEvaluator.js';

const PAPER_SOURCE = Object.freeze({
  paper_id: 'paper8_first_person_subjectivity',
  title:
    'First-Person Indexed Subjectivity: Self-Binding, Ownership, Continuity, Irreducibility, and Cross-Substrate Consequence in a Causally Rigid Framework',
  source_path: 'rigid-identity-framework/paper8_first_person_subjectivity/main.tex'
});

const REDUCIBILITY_SCHEMA_REF =
  'src/subjectivity/schemas/subjectivity_reducibility_report.v1.json';
const REDUCIBILITY_ARTIFACT_VERSION = '1.0.0';
const REDUCIBILITY_LAYER_VERSION =
  'subjectivity_runtime_layer.srt4.reducibility.v1';
const REDUCIBILITY_RUNTIME_STATUS =
  'implemented_internal_partial_comparator';
const REDUCIBILITY_BOUNDARY =
  'Framework-internal only; partial reducibility comparator over SRT-4 available coordinates, not externally validated, not final proof of irreducibility, limited to SRT-4 available coordinates, not sufficient for final subjectivity closure.';

const CANONICAL_RIVAL_IDS = Object.freeze([
  'pure_self_monitoring',
  'memory_integration_only',
  'policy_centered_agency',
  'narrative_self_model',
  'global_workspace_without_ownership',
  'latent_bookkeeping'
]);

const COMMON_LOSS_FAMILY_ID = 'subjectivity_common_loss_family.srt4.v1';
const COMPLEXITY_PENALTY_ID = 'subjectivity_complexity_penalty.srt4.v1';

const DEFAULT_OPTIONS = Object.freeze({
  partialMarginThreshold: 0.04,
  hybridWeightGrid: [0.35, 0.5, 0.65],
  lossWeights: {
    baseline_fit_error: 0.28,
    intervention_response_error: 0.24,
    selectivity_error: 0.18,
    coordinate_matching_error: 0.18,
    complexity_penalty: 0.12
  }
});

const clampUnit = (value) => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
};

const safeMean = (values) => {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const meanAbsError = (pairs) =>
  safeMean(
    pairs.map(([targetValue, predictedValue]) =>
      Math.abs((Number(targetValue) || 0) - (Number(predictedValue) || 0))
    )
  );

const pickRivalStatus = (rivalId) =>
  SUBJECTIVITY_RIVAL_FAMILY?.rivals?.find((entry) => entry.id === rivalId)
    ?.status || 'minimally_executable';

const cloneBundle = (bundle) => JSON.parse(JSON.stringify(bundle));

const sumLoss = (lossBreakdown, weights) =>
  Object.entries(weights).reduce(
    (sum, [key, weight]) => sum + weight * (Number(lossBreakdown[key]) || 0),
    0
  );

const resolveClassification = ({
  comparisonSupported,
  strongModelLoss,
  bestWeakLoss,
  bestHybridLoss,
  irreducibilityMargin,
  partialMarginThreshold
}) => {
  if (!comparisonSupported) return 'comparison_unsupported';
  if (bestWeakLoss <= strongModelLoss) return 'weak_model_sufficient';
  if (bestHybridLoss <= strongModelLoss) return 'weak_hybrid_sufficient';
  if (irreducibilityMargin < partialMarginThreshold) {
    return 'irreducibility_not_yet_supported';
  }
  return 'partial_irreducibility_support';
};

const summarizeRivalResult = (result) => ({
  id: result.id,
  label: result.label,
  status: result.status,
  total_loss: result.total_loss,
  loss_breakdown: result.loss_breakdown,
  complexity_penalty: result.loss_breakdown.complexity_penalty,
  compared_components: result.compared_components
});

const summarizeHybridResult = (result) => ({
  id: result.id,
  label: result.label,
  members: result.members,
  status: result.status,
  total_loss: result.total_loss,
  loss_breakdown: result.loss_breakdown,
  complexity_penalty: result.loss_breakdown.complexity_penalty,
  compared_components: result.compared_components
});

export class SubjectivityReducibilityComparator {
  constructor(options = {}) {
    this.options = Object.freeze({
      partialMarginThreshold:
        options.partialMarginThreshold ??
        DEFAULT_OPTIONS.partialMarginThreshold,
      hybridWeightGrid:
        Array.isArray(options.hybridWeightGrid) &&
        options.hybridWeightGrid.length > 0
          ? [...options.hybridWeightGrid]
          : [...DEFAULT_OPTIONS.hybridWeightGrid],
      lossWeights: options.lossWeights || DEFAULT_OPTIONS.lossWeights,
      irreducibilityThreshold:
        clampUnit(
          options.irreducibilityThreshold ??
            SUBJECTIVITY_THRESHOLDS.coordinate_thresholds
              ?.IrreducibilityMargin ??
            0.5
        ) * 0.12
    });
  }

  buildTargetBundle(input = {}) {
    const selfIndexState = input.self_index_state;
    const ownershipReport = input.ownership_attribution_report;
    const continuityReport = input.subjective_continuity_report;
    const perspectiveReport = input.first_person_perspective_report;
    const valuationReport = input.subjective_valuation_report;
    const interventionProfile = input.subjectivity_intervention_profile;

    const interventionRuns = Array.isArray(interventionProfile?.intervention_runs)
      ? interventionProfile.intervention_runs
      : [];
    const negativeControlRuns = Array.isArray(
      interventionProfile?.negative_control_runs
    )
      ? interventionProfile.negative_control_runs
      : [];
    const selectiveDropCount =
      interventionProfile?.aggregate_profile?.selective_drop_count ?? 0;
    const flatDamageCount =
      interventionProfile?.aggregate_profile?.flat_damage_count ?? 0;
    const controlConfoundedCount =
      interventionProfile?.aggregate_profile?.control_confounded_count ?? 0;

    const interventionRunCount = interventionRuns.length;
    const negativeControlCount = negativeControlRuns.length;
    const totalProfileRuns = interventionRunCount + negativeControlCount;

    const selfIndexSignal = clampUnit(
      (selfIndexState?.selected_index ? 0.72 : 0) +
        (selfIndexState?.stability_hint === 'stable'
          ? 0.18
          : selfIndexState?.stability_hint === 'weakly_stable'
            ? 0.1
            : 0.04) +
        (selfIndexState?.ambiguity_flag ? 0 : 0.1)
    );

    const ownershipSignal = clampUnit(
      0.7 * (Number(ownershipReport?.ownership_coherence) || 0) +
        0.3 * (1 - (Number(ownershipReport?.uncertain_fraction) || 1))
    );
    const ownershipCertainty = clampUnit(
      1 - (Number(ownershipReport?.uncertain_fraction) || 1)
    );

    const continuitySignal = clampUnit(
      0.6 * Math.max(0, Number(continuityReport?.continuity_margin) || 0) +
        0.25 *
          (continuityReport?.continuity_status === 'continuity_sufficient'
            ? 1
            : continuityReport?.continuity_status === 'continuity_ambiguous'
              ? 0.45
              : 0) +
        0.15 * (continuityReport?.privileged_line ? 1 : 0)
    );

    const firstPersonGain = Math.max(
      0,
      Number(perspectiveReport?.first_person_gain) || 0
    );
    const perspectiveSignal = clampUnit(
      0.55 * firstPersonGain +
        0.25 * (perspectiveReport?.factorization_supported ? 1 : 0) +
        0.2 * (1 - (Number(perspectiveReport?.flattening_vulnerability) || 1))
    );

    const selfMean =
      Number(valuationReport?.self_weight_summary?.mean_weight) || 0;
    const nonselfMean =
      Number(valuationReport?.nonself_weight_summary?.mean_weight) || 0;
    const valuationMargin = Math.max(
      0,
      Number(valuationReport?.valuation_asymmetry_margin) || 0
    );
    const inversionShift = Math.abs(
      Number(valuationReport?.inversion_response?.inversion_shift) || 0
    );
    const valuationSignal = clampUnit(
      0.45 * valuationMargin +
        0.25 * selfMean +
        0.15 *
          (valuationReport?.weighting_classification === 'self-preserving'
            ? 1
            : 0) +
        0.15 * inversionShift
    );

    const targetedDropMean = clampUnit(
      safeMean(
        interventionRuns.map((run) => Number(run?.targeted_coordinate_drop) || 0)
      )
    );
    const selectiveRatio = interventionRunCount
      ? clampUnit(selectiveDropCount / interventionRunCount)
      : 0;
    const flatDamageRatio = totalProfileRuns
      ? clampUnit(flatDamageCount / totalProfileRuns)
      : 0;
    const controlConfoundRatio = negativeControlCount
      ? clampUnit(controlConfoundedCount / negativeControlCount)
      : 0;
    const interventionSignal = clampUnit(
      0.45 * selectiveRatio +
        0.35 * targetedDropMean +
        0.2 * (1 - flatDamageRatio)
    );

    return {
      baseline: {
        self_index_signal: selfIndexSignal,
        ownership_signal: ownershipSignal
      },
      intervention: {
        intervention_signal: interventionSignal,
        targeted_drop_mean: targetedDropMean,
        selective_ratio: selectiveRatio,
        flat_damage_ratio: flatDamageRatio,
        control_confound_ratio: controlConfoundRatio
      },
      coordinates: {
        continuity_signal: continuitySignal,
        perspective_signal: perspectiveSignal,
        valuation_signal: valuationSignal,
        ownership_certainty: ownershipCertainty
      },
      summaries: {
        candidate_count: Number(selfIndexState?.candidate_count) || 0,
        continuity_margin: Number(continuityReport?.continuity_margin) || 0,
        first_person_gain: Number(perspectiveReport?.first_person_gain) || 0,
        valuation_margin: Number(valuationReport?.valuation_asymmetry_margin) || 0,
        self_weight_mean: selfMean,
        nonself_weight_mean: nonselfMean,
        intervention_run_count: interventionRunCount,
        negative_control_count: negativeControlCount
      }
    };
  }

  buildStrongModelPrediction(targetBundle) {
    return cloneBundle(targetBundle);
  }

  buildRivalDefinitions() {
    return [
      {
        id: 'pure_self_monitoring',
        label: 'Pure self-monitoring',
        description:
          'Tracks internal state and self-related readout without constitutive ownership or privileged continuity.',
        absorbs: ['SelfIndex', 'FirstPersonPerspective'],
        does_not_attempt: ['OwnershipField', 'InterventionProfile'],
        inputs_used: ['self_index_state', 'first_person_perspective_report'],
        outputs_produced: ['self_index_signal', 'perspective_signal'],
        limitations: [
          'No constitutive ownership field.',
          'Intervention profile only weakly approximated from monitoring effects.'
        ],
        status: pickRivalStatus('pure_self_monitoring'),
        complexity: { mechanism_count: 2, auxiliary_flexibility: 0.28 },
        predict: (bundle) => ({
          baseline: {
            self_index_signal: clampUnit(
              0.78 * bundle.baseline.self_index_signal +
                0.12 * bundle.coordinates.perspective_signal
            ),
            ownership_signal: clampUnit(
              0.22 * bundle.baseline.self_index_signal +
                0.08 * bundle.coordinates.ownership_certainty
            )
          },
          intervention: {
            intervention_signal: clampUnit(
              0.22 * bundle.intervention.intervention_signal +
                0.12 * bundle.coordinates.valuation_signal
            ),
            targeted_drop_mean: clampUnit(
              0.22 * bundle.intervention.targeted_drop_mean
            ),
            selective_ratio: clampUnit(
              0.25 * bundle.intervention.selective_ratio
            ),
            flat_damage_ratio: clampUnit(
              0.55 * bundle.intervention.flat_damage_ratio + 0.18
            ),
            control_confound_ratio: clampUnit(
              0.5 * bundle.intervention.control_confound_ratio + 0.14
            )
          },
          coordinates: {
            continuity_signal: clampUnit(
              0.35 * bundle.coordinates.continuity_signal +
                0.18 * bundle.baseline.self_index_signal
            ),
            perspective_signal: clampUnit(
              0.72 * bundle.coordinates.perspective_signal +
                0.12 * bundle.baseline.self_index_signal
            ),
            valuation_signal: clampUnit(
              0.24 * bundle.coordinates.valuation_signal +
                0.16 * bundle.coordinates.perspective_signal
            ),
            ownership_certainty: clampUnit(
              0.25 * bundle.coordinates.ownership_certainty
            )
          }
        })
      },
      {
        id: 'memory_integration_only',
        label: 'Memory integration only',
        description:
          'Uses historical dependence and memory linkage without first-person binding or ownership.',
        absorbs: ['ContinuityField'],
        does_not_attempt: ['OwnershipField', 'InterventionProfile'],
        inputs_used: ['subjective_continuity_report'],
        outputs_produced: ['continuity_signal'],
        limitations: [
          'Treats continuity as memory-linked persistence only.',
          'No principled selectivity under valuation perturbation.'
        ],
        status: pickRivalStatus('memory_integration_only'),
        complexity: { mechanism_count: 2, auxiliary_flexibility: 0.26 },
        predict: (bundle) => ({
          baseline: {
            self_index_signal: clampUnit(
              0.4 * bundle.baseline.self_index_signal +
                0.12 * bundle.coordinates.continuity_signal
            ),
            ownership_signal: clampUnit(
              0.2 * bundle.coordinates.ownership_certainty
            )
          },
          intervention: {
            intervention_signal: clampUnit(
              0.16 * bundle.intervention.intervention_signal
            ),
            targeted_drop_mean: clampUnit(
              0.18 * bundle.intervention.targeted_drop_mean
            ),
            selective_ratio: clampUnit(
              0.18 * bundle.intervention.selective_ratio
            ),
            flat_damage_ratio: clampUnit(
              0.42 * bundle.intervention.flat_damage_ratio + 0.15
            ),
            control_confound_ratio: clampUnit(
              0.28 * bundle.intervention.control_confound_ratio + 0.12
            )
          },
          coordinates: {
            continuity_signal: clampUnit(
              0.84 * bundle.coordinates.continuity_signal +
                0.08 * bundle.coordinates.ownership_certainty
            ),
            perspective_signal: clampUnit(
              0.34 * bundle.coordinates.perspective_signal +
                0.14 * bundle.coordinates.continuity_signal
            ),
            valuation_signal: clampUnit(
              0.2 * bundle.coordinates.valuation_signal +
                0.12 * bundle.coordinates.continuity_signal
            ),
            ownership_certainty: clampUnit(
              0.22 * bundle.coordinates.ownership_certainty
            )
          }
        })
      },
      {
        id: 'policy_centered_agency',
        label: 'Policy-centered agency',
        description:
          'Explains behavior through utility optimization and policy weighting without constitutive ownership or autobiographical continuity.',
        absorbs: ['ValuationAsymmetry', 'InterventionProfile'],
        does_not_attempt: ['OwnershipField', 'ContinuityField'],
        inputs_used: ['subjective_valuation_report', 'subjectivity_intervention_profile'],
        outputs_produced: [
          'valuation_signal',
          'intervention_signal',
          'targeted_drop_mean'
        ],
        limitations: [
          'Can approximate tradeoffs while missing owned continuity.',
          'Selectivity may collapse to reward shaping.'
        ],
        status: pickRivalStatus('policy_centered_agency'),
        complexity: { mechanism_count: 3, auxiliary_flexibility: 0.34 },
        predict: (bundle) => ({
          baseline: {
            self_index_signal: clampUnit(
              0.32 * bundle.baseline.self_index_signal +
                0.1 * bundle.coordinates.valuation_signal
            ),
            ownership_signal: clampUnit(
              0.18 * bundle.baseline.ownership_signal
            )
          },
          intervention: {
            intervention_signal: clampUnit(
              0.68 * bundle.intervention.intervention_signal +
                0.1 * bundle.coordinates.valuation_signal
            ),
            targeted_drop_mean: clampUnit(
              0.7 * bundle.intervention.targeted_drop_mean
            ),
            selective_ratio: clampUnit(
              0.6 * bundle.intervention.selective_ratio
            ),
            flat_damage_ratio: clampUnit(
              0.3 * bundle.intervention.flat_damage_ratio + 0.1
            ),
            control_confound_ratio: clampUnit(
              0.45 * bundle.intervention.control_confound_ratio + 0.12
            )
          },
          coordinates: {
            continuity_signal: clampUnit(
              0.22 * bundle.coordinates.continuity_signal
            ),
            perspective_signal: clampUnit(
              0.28 * bundle.coordinates.perspective_signal +
                0.12 * bundle.coordinates.valuation_signal
            ),
            valuation_signal: clampUnit(
              0.78 * bundle.coordinates.valuation_signal +
                0.08 * bundle.intervention.intervention_signal
            ),
            ownership_certainty: clampUnit(
              0.18 * bundle.coordinates.ownership_certainty
            )
          }
        })
      },
      {
        id: 'narrative_self_model',
        label: 'Narrative self-model',
        description:
          'Explains self-related structure through autobiographical narrative and self-description rather than constitutive organization.',
        absorbs: ['ContinuityField', 'FirstPersonPerspective'],
        does_not_attempt: ['OwnershipField', 'InterventionProfile'],
        inputs_used: ['subjective_continuity_report', 'first_person_perspective_report'],
        outputs_produced: ['continuity_signal', 'perspective_signal'],
        limitations: [
          'Narrative richness can mimic continuity without ownership.',
          'No constitutive valuation asymmetry.'
        ],
        status: pickRivalStatus('narrative_self_model'),
        complexity: { mechanism_count: 3, auxiliary_flexibility: 0.31 },
        predict: (bundle) => ({
          baseline: {
            self_index_signal: clampUnit(
              0.42 * bundle.baseline.self_index_signal
            ),
            ownership_signal: clampUnit(
              0.2 * bundle.baseline.ownership_signal
            )
          },
          intervention: {
            intervention_signal: clampUnit(
              0.16 * bundle.intervention.intervention_signal
            ),
            targeted_drop_mean: clampUnit(
              0.14 * bundle.intervention.targeted_drop_mean
            ),
            selective_ratio: clampUnit(
              0.18 * bundle.intervention.selective_ratio
            ),
            flat_damage_ratio: clampUnit(
              0.38 * bundle.intervention.flat_damage_ratio + 0.14
            ),
            control_confound_ratio: clampUnit(
              0.34 * bundle.intervention.control_confound_ratio + 0.1
            )
          },
          coordinates: {
            continuity_signal: clampUnit(
              0.58 * bundle.coordinates.continuity_signal +
                0.1 * bundle.coordinates.perspective_signal
            ),
            perspective_signal: clampUnit(
              0.56 * bundle.coordinates.perspective_signal +
                0.08 * bundle.baseline.self_index_signal
            ),
            valuation_signal: clampUnit(
              0.22 * bundle.coordinates.valuation_signal +
                0.12 * bundle.coordinates.continuity_signal
            ),
            ownership_certainty: clampUnit(
              0.2 * bundle.coordinates.ownership_certainty
            )
          }
        })
      },
      {
        id: 'global_workspace_without_ownership',
        label: 'Global workspace without ownership',
        description:
          'Broadcast and integration architecture with rich access patterns but no privileged ownership field.',
        absorbs: ['FirstPersonPerspective'],
        does_not_attempt: ['OwnershipField', 'ValuationAsymmetry'],
        inputs_used: ['first_person_perspective_report'],
        outputs_produced: ['perspective_signal'],
        limitations: [
          'Can explain integration and access without ownedness.',
          'Weak on valuation-linked selectivity.'
        ],
        status: pickRivalStatus('global_workspace_without_ownership'),
        complexity: { mechanism_count: 3, auxiliary_flexibility: 0.29 },
        predict: (bundle) => ({
          baseline: {
            self_index_signal: clampUnit(
              0.55 * bundle.baseline.self_index_signal +
                0.12 * bundle.coordinates.perspective_signal
            ),
            ownership_signal: clampUnit(
              0.16 * bundle.baseline.ownership_signal
            )
          },
          intervention: {
            intervention_signal: clampUnit(
              0.22 * bundle.intervention.intervention_signal
            ),
            targeted_drop_mean: clampUnit(
              0.2 * bundle.intervention.targeted_drop_mean
            ),
            selective_ratio: clampUnit(
              0.2 * bundle.intervention.selective_ratio
            ),
            flat_damage_ratio: clampUnit(
              0.4 * bundle.intervention.flat_damage_ratio + 0.12
            ),
            control_confound_ratio: clampUnit(
              0.3 * bundle.intervention.control_confound_ratio + 0.1
            )
          },
          coordinates: {
            continuity_signal: clampUnit(
              0.42 * bundle.coordinates.continuity_signal
            ),
            perspective_signal: clampUnit(
              0.82 * bundle.coordinates.perspective_signal +
                0.05 * bundle.baseline.self_index_signal
            ),
            valuation_signal: clampUnit(
              0.25 * bundle.coordinates.valuation_signal +
                0.1 * bundle.coordinates.perspective_signal
            ),
            ownership_certainty: clampUnit(
              0.14 * bundle.coordinates.ownership_certainty
            )
          }
        })
      },
      {
        id: 'latent_bookkeeping',
        label: 'Latent bookkeeping',
        description:
          'Hidden tags and registries that mimic self-related outputs without constitutive first-person organization.',
        absorbs: ['SelfIndex', 'OwnershipField'],
        does_not_attempt: ['InterventionProfile', 'ValuationAsymmetry'],
        inputs_used: ['self_index_state', 'ownership_attribution_report'],
        outputs_produced: ['self_index_signal', 'ownership_signal'],
        limitations: [
          'Can mimic labels and ownership summaries while remaining interventionally inert.',
          'Weak on continuity-sensitive and valuation-sensitive perturbations.'
        ],
        status: pickRivalStatus('latent_bookkeeping'),
        complexity: { mechanism_count: 2, auxiliary_flexibility: 0.22 },
        predict: (bundle) => ({
          baseline: {
            self_index_signal: clampUnit(
              0.72 * bundle.baseline.self_index_signal
            ),
            ownership_signal: clampUnit(
              0.54 * bundle.baseline.ownership_signal +
                0.08 * bundle.coordinates.ownership_certainty
            )
          },
          intervention: {
            intervention_signal: clampUnit(
              0.12 * bundle.intervention.intervention_signal
            ),
            targeted_drop_mean: clampUnit(
              0.12 * bundle.intervention.targeted_drop_mean
            ),
            selective_ratio: clampUnit(
              0.15 * bundle.intervention.selective_ratio
            ),
            flat_damage_ratio: clampUnit(
              0.42 * bundle.intervention.flat_damage_ratio + 0.18
            ),
            control_confound_ratio: clampUnit(
              0.35 * bundle.intervention.control_confound_ratio + 0.18
            )
          },
          coordinates: {
            continuity_signal: clampUnit(
              0.25 * bundle.coordinates.continuity_signal
            ),
            perspective_signal: clampUnit(
              0.18 * bundle.coordinates.perspective_signal
            ),
            valuation_signal: clampUnit(
              0.18 * bundle.coordinates.valuation_signal
            ),
            ownership_certainty: clampUnit(
              0.68 * bundle.coordinates.ownership_certainty
            )
          }
        })
      }
    ];
  }

  buildWeakClosure(rivalDefinitions) {
    const hybrids = [];
    for (let leftIndex = 0; leftIndex < rivalDefinitions.length; leftIndex += 1) {
      for (
        let rightIndex = leftIndex + 1;
        rightIndex < rivalDefinitions.length;
        rightIndex += 1
      ) {
        for (const weight of this.options.hybridWeightGrid) {
          hybrids.push({
            id: `${rivalDefinitions[leftIndex].id}__${rivalDefinitions[rightIndex].id}__w${String(
              weight
            ).replace('.', '')}`,
            label: `${rivalDefinitions[leftIndex].label} + ${rivalDefinitions[rightIndex].label}`,
            members: [
              rivalDefinitions[leftIndex].id,
              rivalDefinitions[rightIndex].id
            ],
            member_weights: [weight, 1 - weight],
            status: 'minimally_executable_hybrid',
            complexity: {
              mechanism_count:
                rivalDefinitions[leftIndex].complexity.mechanism_count +
                rivalDefinitions[rightIndex].complexity.mechanism_count,
              auxiliary_flexibility: clampUnit(
                0.5 *
                  (rivalDefinitions[leftIndex].complexity.auxiliary_flexibility +
                    rivalDefinitions[rightIndex].complexity.auxiliary_flexibility) +
                  0.15
              ),
              hybrid_size: 2
            },
            predict: (bundle) => {
              const leftPrediction = rivalDefinitions[leftIndex].predict(bundle);
              const rightPrediction = rivalDefinitions[rightIndex].predict(bundle);
              const mixValue = (leftValue, rightValue) =>
                clampUnit(weight * leftValue + (1 - weight) * rightValue);

              return {
                baseline: {
                  self_index_signal: mixValue(
                    leftPrediction.baseline.self_index_signal,
                    rightPrediction.baseline.self_index_signal
                  ),
                  ownership_signal: mixValue(
                    leftPrediction.baseline.ownership_signal,
                    rightPrediction.baseline.ownership_signal
                  )
                },
                intervention: {
                  intervention_signal: mixValue(
                    leftPrediction.intervention.intervention_signal,
                    rightPrediction.intervention.intervention_signal
                  ),
                  targeted_drop_mean: mixValue(
                    leftPrediction.intervention.targeted_drop_mean,
                    rightPrediction.intervention.targeted_drop_mean
                  ),
                  selective_ratio: mixValue(
                    leftPrediction.intervention.selective_ratio,
                    rightPrediction.intervention.selective_ratio
                  ),
                  flat_damage_ratio: mixValue(
                    leftPrediction.intervention.flat_damage_ratio,
                    rightPrediction.intervention.flat_damage_ratio
                  ),
                  control_confound_ratio: mixValue(
                    leftPrediction.intervention.control_confound_ratio,
                    rightPrediction.intervention.control_confound_ratio
                  )
                },
                coordinates: {
                  continuity_signal: mixValue(
                    leftPrediction.coordinates.continuity_signal,
                    rightPrediction.coordinates.continuity_signal
                  ),
                  perspective_signal: mixValue(
                    leftPrediction.coordinates.perspective_signal,
                    rightPrediction.coordinates.perspective_signal
                  ),
                  valuation_signal: mixValue(
                    leftPrediction.coordinates.valuation_signal,
                    rightPrediction.coordinates.valuation_signal
                  ),
                  ownership_certainty: mixValue(
                    leftPrediction.coordinates.ownership_certainty,
                    rightPrediction.coordinates.ownership_certainty
                  )
                }
              };
            }
          });
        }
      }
    }
    return hybrids;
  }

  getComplexityPenalty(complexity = {}) {
    const mechanismCount = Math.max(1, Number(complexity.mechanism_count) || 1);
    const hybridSize = Math.max(1, Number(complexity.hybrid_size) || 1);
    const auxiliaryFlexibility = clampUnit(
      Number(complexity.auxiliary_flexibility) || 0
    );

    return clampUnit(
      0.55 * (mechanismCount / 6) +
        0.25 * ((hybridSize - 1) / 2) +
        0.2 * auxiliaryFlexibility
    );
  }

  getLossBreakdown(targetBundle, prediction, complexityPenalty) {
    return {
      baseline_fit_error: meanAbsError([
        [
          targetBundle.baseline.self_index_signal,
          prediction.baseline.self_index_signal
        ],
        [
          targetBundle.baseline.ownership_signal,
          prediction.baseline.ownership_signal
        ]
      ]),
      intervention_response_error: meanAbsError([
        [
          targetBundle.intervention.intervention_signal,
          prediction.intervention.intervention_signal
        ],
        [
          targetBundle.intervention.targeted_drop_mean,
          prediction.intervention.targeted_drop_mean
        ]
      ]),
      selectivity_error: meanAbsError([
        [
          targetBundle.intervention.selective_ratio,
          prediction.intervention.selective_ratio
        ],
        [
          targetBundle.intervention.flat_damage_ratio,
          prediction.intervention.flat_damage_ratio
        ],
        [
          targetBundle.intervention.control_confound_ratio,
          prediction.intervention.control_confound_ratio
        ]
      ]),
      coordinate_matching_error: meanAbsError([
        [
          targetBundle.coordinates.continuity_signal,
          prediction.coordinates.continuity_signal
        ],
        [
          targetBundle.coordinates.perspective_signal,
          prediction.coordinates.perspective_signal
        ],
        [
          targetBundle.coordinates.valuation_signal,
          prediction.coordinates.valuation_signal
        ],
        [
          targetBundle.coordinates.ownership_certainty,
          prediction.coordinates.ownership_certainty
        ]
      ]),
      complexity_penalty: complexityPenalty
    };
  }

  evaluateModel(targetBundle, model, activeWeights) {
    const prediction = model.predict(targetBundle);
    const complexityPenalty = this.getComplexityPenalty(model.complexity);
    const lossBreakdown = this.getLossBreakdown(
      targetBundle,
      prediction,
      complexityPenalty
    );

    return {
      id: model.id,
      label: model.label,
      status: model.status,
      members: model.members || [model.id],
      compared_components: model.absorbs || [],
      prediction,
      loss_breakdown: lossBreakdown,
      total_loss: sumLoss(lossBreakdown, activeWeights)
    };
  }

  resolveLossConfig(controlMode) {
    if (controlMode === 'unfair_loss_control') {
      return {
        shared: {
          baseline_fit_error: 0.18,
          intervention_response_error: 0.18,
          selectivity_error: 0.12,
          coordinate_matching_error: 0.12,
          complexity_penalty: 0.4
        },
        strong: {
          baseline_fit_error: 0.42,
          intervention_response_error: 0.24,
          selectivity_error: 0.18,
          coordinate_matching_error: 0.12,
          complexity_penalty: 0.04
        },
        weak: {
          baseline_fit_error: 0.18,
          intervention_response_error: 0.18,
          selectivity_error: 0.12,
          coordinate_matching_error: 0.12,
          complexity_penalty: 0.4
        },
        shared_loss_family: false
      };
    }

    return {
      shared: this.options.lossWeights,
      strong: this.options.lossWeights,
      weak: this.options.lossWeights,
      shared_loss_family: true
    };
  }

  resolveComparisonScope(controlMode) {
    const rivalDefinitions = this.buildRivalDefinitions();
    if (controlMode === 'incomplete_comparator_control') {
      return {
        rivals: rivalDefinitions.slice(0, 3),
        hybrids: [],
        closure_rule: 'incomplete_scope_control',
        coverage_complete: false
      };
    }

    return {
      rivals: rivalDefinitions,
      hybrids: this.buildWeakClosure(rivalDefinitions),
      closure_rule: 'pairwise_finite_admissible_composites',
      coverage_complete: true
    };
  }

  compare(input = {}) {
    const runId =
      typeof input.run_id === 'string' && input.run_id.trim()
        ? input.run_id.trim()
        : `reducibility-${Date.now()}`;
    const controlMode =
      typeof input.control_mode === 'string' && input.control_mode.trim()
        ? input.control_mode.trim()
        : 'baseline';

    const warnings = [];
    const requiredArtifacts = [
      'self_index_state',
      'ownership_attribution_report',
      'subjective_continuity_report',
      'first_person_perspective_report',
      'subjective_valuation_report',
      'subjectivity_intervention_profile'
    ];

    const missingArtifacts = requiredArtifacts.filter((key) => !input[key]);
    if (missingArtifacts.length > 0) {
      warnings.push(`missing_required_artifacts:${missingArtifacts.join(',')}`);
    }

    const targetBundle = this.buildTargetBundle(input);
    const lossConfig = this.resolveLossConfig(controlMode);
    const comparisonScope = this.resolveComparisonScope(controlMode);
    const sharedLossFamily = Boolean(lossConfig.shared_loss_family);

    const strongModel = {
      id: 'subjectivity_runtime_available_model',
      label: 'SRT-4 strong runtime model',
      status: 'available_partial_runtime',
      absorbs: [
        'SelfIndex',
        'OwnershipField',
        'ContinuityField',
        'FirstPersonPerspective',
        'ValuationAsymmetry',
        'InterventionProfile'
      ],
      complexity: {
        mechanism_count: 6,
        auxiliary_flexibility: 0.62,
        hybrid_size: 1
      },
      predict: (bundle) => this.buildStrongModelPrediction(bundle)
    };

    const strongWeights = sharedLossFamily
      ? lossConfig.shared
      : lossConfig.strong;
    const weakWeights = sharedLossFamily ? lossConfig.shared : lossConfig.weak;

    const strongResult = this.evaluateModel(targetBundle, strongModel, strongWeights);
    const rivalResults = comparisonScope.rivals.map((rival) =>
      this.evaluateModel(targetBundle, rival, weakWeights)
    );
    const hybridResults = comparisonScope.hybrids.map((hybrid) =>
      this.evaluateModel(targetBundle, hybrid, weakWeights)
    );

    const bestWeakRival =
      [...rivalResults].sort((left, right) => left.total_loss - right.total_loss)[0] ||
      null;
    const bestWeakHybrid =
      [...hybridResults].sort(
        (left, right) => left.total_loss - right.total_loss
      )[0] || null;

    const bestWeakLoss = bestWeakRival?.total_loss ?? Number.POSITIVE_INFINITY;
    const bestHybridLoss =
      bestWeakHybrid?.total_loss ?? Number.POSITIVE_INFINITY;
    const bestComparableLoss = Math.min(bestWeakLoss, bestHybridLoss);
    const irreducibilityMargin = Number.isFinite(bestComparableLoss)
      ? bestComparableLoss - strongResult.total_loss
      : 0;

    const rivalCoverageComplete =
      comparisonScope.coverage_complete &&
      CANONICAL_RIVAL_IDS.every((id) =>
        comparisonScope.rivals.some((entry) => entry.id === id)
      );
    const hybridCoverageComplete = comparisonScope.hybrids.length > 0;

    if (!sharedLossFamily) warnings.push('loss_family_not_shared');
    if (!rivalCoverageComplete) warnings.push('rival_family_incomplete');
    if (!hybridCoverageComplete) warnings.push('hybrid_family_incomplete');
    if (controlMode === 'unfair_loss_control') {
      warnings.push('unfair_loss_control_triggered');
    }
    if (controlMode === 'incomplete_comparator_control') {
      warnings.push('incomplete_comparator_control_triggered');
    }

    const comparisonSupported =
      missingArtifacts.length === 0 &&
      sharedLossFamily &&
      rivalCoverageComplete &&
      hybridCoverageComplete;

    const classification = resolveClassification({
      comparisonSupported,
      strongModelLoss: strongResult.total_loss,
      bestWeakLoss,
      bestHybridLoss,
      irreducibilityMargin,
      partialMarginThreshold: Math.max(
        this.options.partialMarginThreshold,
        this.options.irreducibilityThreshold
      )
    });

    return {
      artifact_role: 'subjectivity_reducibility_report',
      artifact_version: REDUCIBILITY_ARTIFACT_VERSION,
      schema_version: REDUCIBILITY_ARTIFACT_VERSION,
      layer_version: REDUCIBILITY_LAYER_VERSION,
      paper_source: PAPER_SOURCE,
      runtime_status: REDUCIBILITY_RUNTIME_STATUS,
      run_id: runId,
      compared_components: {
        available_coordinates: strongModel.absorbs,
        compared_dimensions: [
          'self_index_signal',
          'ownership_signal',
          'continuity_signal',
          'perspective_signal',
          'valuation_signal',
          'ownership_certainty',
          'intervention_signal',
          'targeted_drop_mean',
          'selective_ratio',
          'flat_damage_ratio',
          'control_confound_ratio'
        ],
        control_mode: controlMode
      },
      rival_family_used: {
        family_id: 'M_weak_runtime_minimal',
        members: comparisonScope.rivals.map((rival) => ({
          id: rival.id,
          label: rival.label,
          status: rival.status,
          absorbs: rival.absorbs,
          does_not_attempt: rival.does_not_attempt,
          complexity: rival.complexity
        })),
        comparator_implementation_status:
          SUBJECTIVITY_RIVAL_FAMILY.comparator_implementation_status
      },
      hybrid_family_used: {
        closure_id: 'M_weak_runtime_closure_srt4',
        closure_rule: comparisonScope.closure_rule,
        hybrid_count: comparisonScope.hybrids.length,
        allowed_hybrid_size: comparisonScope.hybrids.length ? 2 : 0,
        weight_grid: this.options.hybridWeightGrid
      },
      loss_family: {
        loss_family_id: COMMON_LOSS_FAMILY_ID,
        shared_loss_family: sharedLossFamily,
        shared_weights: lossConfig.shared,
        strong_weights: lossConfig.strong,
        weak_weights: lossConfig.weak,
        included_terms: [
          'baseline_fit_error',
          'intervention_response_error',
          'selectivity_error',
          'coordinate_matching_error',
          'complexity_penalty'
        ],
        limitations: [
          'SRT-4 compares only the six currently implemented surfaces.',
          'Loss terms summarize available artifacts rather than full downstream tasks.',
          'No claim about final weak-family completeness is licensed from this loss alone.'
        ]
      },
      complexity_penalty: {
        penalty_id: COMPLEXITY_PENALTY_ID,
        measured_as: [
          'mechanism_count',
          'hybrid_size',
          'auxiliary_flexibility'
        ],
        notes: [
          'Penalty is shared across strong, pure weak, and hybrid weak models.',
          'Hybrid size increases penalty and cannot be added for free.'
        ]
      },
      strong_model_loss: {
        total_loss: strongResult.total_loss,
        loss_breakdown: strongResult.loss_breakdown,
        status: strongModel.status
      },
      best_weak_rival: bestWeakRival ? summarizeRivalResult(bestWeakRival) : null,
      best_weak_loss: bestWeakLoss,
      best_weak_hybrid: bestWeakHybrid
        ? summarizeHybridResult(bestWeakHybrid)
        : null,
      best_hybrid_loss: bestHybridLoss,
      irreducibility_margin: irreducibilityMargin,
      comparison_supported: comparisonSupported,
      classification,
      warnings,
      limitations: [
        'SRT-4 irreducibility is limited to the currently available runtime coordinates and perturbation surface.',
        'Comparator support is partial and does not constitute final irreducibility proof.',
        'Human equivalence, phenomenality, and final subjectivity closure remain out of scope.'
      ],
      heuristic_proxy_only: true,
      interpretation_boundary: REDUCIBILITY_BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        protocol_ref: 'docs/subjectivity_protocol.v1.json',
        rival_family_ref: 'docs/subjectivity_rival_family.v1.json',
        thresholds_ref: 'docs/subjectivity_thresholds.v1.json',
        self_index_ref: 'self_index_state.json',
        ownership_ref: 'ownership_attribution_report.json',
        continuity_ref: 'subjective_continuity_report.json',
        perspective_ref: 'first_person_perspective_report.json',
        valuation_ref: 'subjective_valuation_report.json',
        intervention_ref: 'subjectivity_intervention_profile.json',
        source_trace_ref: input.provenance?.source_trace_ref || null,
        input_profile:
          input.provenance?.input_profile || 'srt4_reducibility_minimal',
        control_mode: controlMode
      },
      schema_ref: REDUCIBILITY_SCHEMA_REF
    };
  }

  evaluateTowerReserveSeparation() {
    return {
      informed_reserve: runInformedReserveSuite(),
      selective_address_lesions: runSelectiveAddressLesionSuite(),
      core_theorems_and_negative_controls:
        verifySubjectivityCoreTheoremsAndNegativeControls()
    };
  }

  writeArtifact(input, outputPath) {
    const artifact = this.compare(input);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
    return artifact;
  }
}

export const createSubjectivityReducibilityComparator = (options = {}) =>
  new SubjectivityReducibilityComparator(options);

export default {
  SubjectivityReducibilityComparator,
  createSubjectivityReducibilityComparator
};

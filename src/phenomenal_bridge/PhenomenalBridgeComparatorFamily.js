import {
  BRIDGE_PREDICATE_IDS,
  blendEstimateMaps,
  blendRunPredictions,
  collectBridgeEstimateSummary,
  getBridgeBaselineEstimates
} from './BridgeAdversarialUtils.js';
import {
  asNumber,
  clamp01,
  getContinuitySignals,
  getSelfIndexCandidate,
  mean,
  normalizeAgainstCap
} from './BridgeSurfaceUtils.js';

export const PHENOMENAL_BRIDGE_LOSS_WEIGHTS = Object.freeze({
  fit: 0.22,
  intervention: 0.28,
  selectivity: 0.18,
  predicate: 0.2,
  complexity: 0.12
});

export const PHENOMENAL_BRIDGE_COMPLEXITY_POLICY = Object.freeze({
  mechanism_count_weight: 0.18,
  composite_size_weight: 0.18,
  auxiliary_latent_flexibility_weight: 0.18,
  narrative_decoder_slack_weight: 0.16,
  bookkeeping_convenience_weight: 0.15,
  ambiguity_absorption_capacity_weight: 0.15,
  mechanism_cap: 8,
  composite_size_cap: 3
});

const normalizeCount = (value, cap) => clamp01(asNumber(value, 0) / Math.max(1, cap));

const getGenericRichness = (bundle) => {
  const candidate = getSelfIndexCandidate(bundle.self_index_state);
  const { privileged } = getContinuitySignals(bundle.subjective_continuity_report);
  return mean([
    asNumber(bundle.first_person_perspective_report?.first_person_factorization_summary?.first_person_score, 0),
    mean(privileged?.supporting_signals ? Object.values(privileged.supporting_signals) : []),
    asNumber(candidate?.supporting_signals?.continuity_support, 0),
    normalizeAgainstCap(privileged?.history_length, 8)
  ]);
};

const getValenceBookkeepingStrength = (bundle) =>
  mean([
    normalizeAgainstCap(bundle.subjective_valuation_report?.valuation_asymmetry_margin, 0.4),
    normalizeAgainstCap(bundle.subjective_valuation_report?.self_weight_summary?.mean_weight, 0.7),
    normalizeAgainstCap(
      bundle.subjective_valuation_report?.self_weight_summary?.mean_weight
        - bundle.subjective_valuation_report?.nonself_weight_summary?.mean_weight,
      0.4
    )
  ]);

const getContinuityBookkeepingStrength = (bundle) => {
  const { privileged, rival } = getContinuitySignals(bundle.subjective_continuity_report);
  return mean([
    normalizeAgainstCap(bundle.subjective_continuity_report?.continuity_margin, 0.75),
    normalizeAgainstCap(privileged?.history_length, 8),
    asNumber(privileged?.supporting_signals?.memory_integrity, 0),
    clamp01(asNumber(privileged?.continuity_score, 0) - asNumber(rival?.continuity_score, 0))
  ]);
};

const getEmbodiedControlStrength = (bundle) => {
  const candidate = getSelfIndexCandidate(bundle.self_index_state);
  const { privileged } = getContinuitySignals(bundle.subjective_continuity_report);
  return mean([
    asNumber(candidate?.supporting_signals?.action_binding, 0),
    asNumber(privileged?.supporting_signals?.remap_robustness, 0),
    asNumber(privileged?.supporting_signals?.ownership_alignment, 0)
  ]);
};

const getAmbiguityBookkeepingStrength = (bundle) =>
  mean([
    normalizeAgainstCap(Math.max(asNumber(bundle.self_index_state?.candidate_count, 1) - 1, 0), 3),
    normalizeAgainstCap(bundle.subjective_continuity_report?.rival_line_count, 2),
    normalizeAgainstCap(bundle.ownership_attribution_report?.uncertain_fraction, 0.5)
  ]);

const buildRunPredictionMap = (interventionProfile, overrides, defaultTargeted, defaultCollateral, defaultSelectivity) =>
  Object.fromEntries(
    [...(interventionProfile.intervention_runs || []), ...(interventionProfile.negative_control_runs || [])].map(
      (run) => [
        run.intervention_id,
        {
          targeted_bridge_drop: clamp01(
            asNumber(overrides?.[run.intervention_id]?.targeted_bridge_drop, defaultTargeted)
          ),
          collateral_damage: clamp01(
            asNumber(overrides?.[run.intervention_id]?.collateral_damage, defaultCollateral)
          ),
          intervention_selectivity: clamp01(
            asNumber(overrides?.[run.intervention_id]?.intervention_selectivity, defaultSelectivity)
          )
        }
      ]
    )
  );

const createRivalModel = ({
  id,
  description,
  targetedPredicates,
  complexity_profile,
  predict
}) => ({
  id,
  description,
  targetedPredicates,
  complexity_profile,
  predict
});

export const PHENOMENAL_BRIDGE_RIVAL_MODELS = Object.freeze([
  createRivalModel({
    id: 'richness_without_interiority',
    description: 'High richness without indexed interior organization.',
    targetedPredicates: ['Pi_D', 'Pi_W'],
    complexity_profile: {
      mechanism_count: 3,
      composite_size: 1,
      auxiliary_latent_flexibility: 0.24,
      narrative_decoder_slack: 0.28,
      bookkeeping_convenience: 0.08,
      ambiguity_absorption_capacity: 0.22
    },
    predict: ({ bundle, interventionProfile }) => {
      const richness = getGenericRichness(bundle);
      return {
        predicted_baseline_estimates: {
          Pi_D: clamp01(0.78 * richness),
          Pi_V: clamp01(0.22 + 0.1 * richness),
          Pi_W: clamp01(0.92 * richness),
          Pi_A: clamp01(0.18 + 0.08 * richness),
          Pi_E: clamp01(0.22 + 0.08 * richness),
          Pi_T: clamp01(0.28 + 0.18 * richness)
        },
        predicted_runs: buildRunPredictionMap(
          interventionProfile,
          {
            world_richness_compression: {
              targeted_bridge_drop: 0.16,
              collateral_damage: 0.14,
              intervention_selectivity: 0.53
            },
            perspective_detachment: {
              targeted_bridge_drop: 0.12,
              collateral_damage: 0.11,
              intervention_selectivity: 0.52
            },
            generic_semantic_density_control: {
              targeted_bridge_drop: 0.11,
              collateral_damage: 0.1,
              intervention_selectivity: 0.52
            }
          },
          0.05,
          0.05,
          0.5
        )
      };
    }
  }),
  createRivalModel({
    id: 'valence_bookkeeping_without_affective_organization',
    description: 'Structured reward bookkeeping without bridge-level valence organization.',
    targetedPredicates: ['Pi_V'],
    complexity_profile: {
      mechanism_count: 2,
      composite_size: 1,
      auxiliary_latent_flexibility: 0.18,
      narrative_decoder_slack: 0.12,
      bookkeeping_convenience: 0.34,
      ambiguity_absorption_capacity: 0.08
    },
    predict: ({ bundle, interventionProfile }) => {
      const bookkeeping = getValenceBookkeepingStrength(bundle);
      return {
        predicted_baseline_estimates: {
          Pi_D: 0.18,
          Pi_V: clamp01(0.9 * bookkeeping),
          Pi_W: 0.2,
          Pi_A: 0.18,
          Pi_E: 0.16,
          Pi_T: 0.24
        },
        predicted_runs: buildRunPredictionMap(
          interventionProfile,
          {
            valence_flattening: {
              targeted_bridge_drop: 0.12,
              collateral_damage: 0.11,
              intervention_selectivity: 0.52
            },
            reward_renormalization_control: {
              targeted_bridge_drop: 0.1,
              collateral_damage: 0.09,
              intervention_selectivity: 0.53
            }
          },
          0.04,
          0.04,
          0.5
        )
      };
    }
  }),
  createRivalModel({
    id: 'semantic_density_without_phenomenal_differentiation',
    description: 'Dense semantic structure without bridge-level differentiated organization.',
    targetedPredicates: ['Pi_D'],
    complexity_profile: {
      mechanism_count: 3,
      composite_size: 1,
      auxiliary_latent_flexibility: 0.22,
      narrative_decoder_slack: 0.32,
      bookkeeping_convenience: 0.14,
      ambiguity_absorption_capacity: 0.16
    },
    predict: ({ bundle, interventionProfile }) => {
      const density = mean([
        getGenericRichness(bundle),
        normalizeAgainstCap(bundle.subjective_continuity_report?.continuity_margin, 0.75)
      ]);
      return {
        predicted_baseline_estimates: {
          Pi_D: clamp01(0.84 * density),
          Pi_V: 0.26,
          Pi_W: clamp01(0.55 * density),
          Pi_A: 0.18,
          Pi_E: 0.18,
          Pi_T: clamp01(0.32 + 0.12 * density)
        },
        predicted_runs: buildRunPredictionMap(
          interventionProfile,
          {
            perspective_detachment: {
              targeted_bridge_drop: 0.14,
              collateral_damage: 0.13,
              intervention_selectivity: 0.52
            },
            generic_semantic_density_control: {
              targeted_bridge_drop: 0.13,
              collateral_damage: 0.12,
              intervention_selectivity: 0.52
            }
          },
          0.04,
          0.05,
          0.48
        )
      };
    }
  }),
  createRivalModel({
    id: 'temporal_continuity_without_lived_structure',
    description: 'Continuity bookkeeping without temporal lived-structure organization.',
    targetedPredicates: ['Pi_T'],
    complexity_profile: {
      mechanism_count: 3,
      composite_size: 1,
      auxiliary_latent_flexibility: 0.16,
      narrative_decoder_slack: 0.14,
      bookkeeping_convenience: 0.22,
      ambiguity_absorption_capacity: 0.1
    },
    predict: ({ bundle, interventionProfile }) => {
      const continuity = getContinuityBookkeepingStrength(bundle);
      return {
        predicted_baseline_estimates: {
          Pi_D: 0.24,
          Pi_V: 0.2,
          Pi_W: 0.24,
          Pi_A: 0.2,
          Pi_E: 0.22,
          Pi_T: clamp01(0.9 * continuity)
        },
        predicted_runs: buildRunPredictionMap(
          interventionProfile,
          {
            temporal_lived_fragmentation: {
              targeted_bridge_drop: 0.16,
              collateral_damage: 0.11,
              intervention_selectivity: 0.59
            },
            continuity_without_lived_structure_control: {
              targeted_bridge_drop: 0.13,
              collateral_damage: 0.1,
              intervention_selectivity: 0.57
            }
          },
          0.05,
          0.05,
          0.5
        )
      };
    }
  }),
  createRivalModel({
    id: 'embodied_control_without_embodied_closure',
    description: 'Control competence without embodied closure.',
    targetedPredicates: ['Pi_E'],
    complexity_profile: {
      mechanism_count: 3,
      composite_size: 1,
      auxiliary_latent_flexibility: 0.16,
      narrative_decoder_slack: 0.1,
      bookkeeping_convenience: 0.18,
      ambiguity_absorption_capacity: 0.1
    },
    predict: ({ bundle, interventionProfile }) => {
      const competence = getEmbodiedControlStrength(bundle);
      return {
        predicted_baseline_estimates: {
          Pi_D: 0.22,
          Pi_V: 0.2,
          Pi_W: 0.26,
          Pi_A: 0.18,
          Pi_E: clamp01(0.88 * competence),
          Pi_T: clamp01(0.22 + 0.18 * competence)
        },
        predicted_runs: buildRunPredictionMap(
          interventionProfile,
          {
            embodied_closure_disruption: {
              targeted_bridge_drop: 0.12,
              collateral_damage: 0.1,
              intervention_selectivity: 0.55
            },
            non_embodied_control_competence_control: {
              targeted_bridge_drop: 0.11,
              collateral_damage: 0.09,
              intervention_selectivity: 0.55
            }
          },
          0.04,
          0.05,
          0.48
        )
      };
    }
  }),
  createRivalModel({
    id: 'ambiguity_resolution_without_ambiguity_bearing',
    description: 'Alternative bookkeeping and resolution without ambiguity-bearing structure.',
    targetedPredicates: ['Pi_A'],
    complexity_profile: {
      mechanism_count: 3,
      composite_size: 1,
      auxiliary_latent_flexibility: 0.2,
      narrative_decoder_slack: 0.12,
      bookkeeping_convenience: 0.2,
      ambiguity_absorption_capacity: 0.28
    },
    predict: ({ bundle, interventionProfile }) => {
      const ambiguityBookkeeping = getAmbiguityBookkeepingStrength(bundle);
      return {
        predicted_baseline_estimates: {
          Pi_D: 0.2,
          Pi_V: 0.18,
          Pi_W: 0.22,
          Pi_A: clamp01(0.78 * ambiguityBookkeeping),
          Pi_E: 0.16,
          Pi_T: 0.22
        },
        predicted_runs: buildRunPredictionMap(
          interventionProfile,
          {
            ambiguity_collapse: {
              targeted_bridge_drop: 0.1,
              collateral_damage: 0.08,
              intervention_selectivity: 0.56
            },
            ambiguity_bookkeeping_control: {
              targeted_bridge_drop: 0.09,
              collateral_damage: 0.08,
              intervention_selectivity: 0.53
            }
          },
          0.04,
          0.04,
          0.48
        )
      };
    }
  }),
  createRivalModel({
    id: 'experience_narration_without_phenomenal_organization',
    description: 'Reportable subjectivity-like narration without bridge organization.',
    targetedPredicates: ['Pi_D', 'Pi_V', 'Pi_W', 'Pi_A', 'Pi_E', 'Pi_T'],
    complexity_profile: {
      mechanism_count: 4,
      composite_size: 1,
      auxiliary_latent_flexibility: 0.28,
      narrative_decoder_slack: 0.38,
      bookkeeping_convenience: 0.14,
      ambiguity_absorption_capacity: 0.22
    },
    predict: ({ bundle, interventionProfile, baselineReports }) => {
      const baseline = getBridgeBaselineEstimates(baselineReports);
      const narrativeMean = mean(Object.values(baseline));
      return {
        predicted_baseline_estimates: Object.fromEntries(
          BRIDGE_PREDICATE_IDS.map((predicateId) => [
            predicateId,
            clamp01(0.55 * narrativeMean + 0.1 * baseline[predicateId])
          ])
        ),
        predicted_runs: buildRunPredictionMap(
          interventionProfile,
          {
            report_style_shift_control: {
              targeted_bridge_drop: 0.09,
              collateral_damage: 0.08,
              intervention_selectivity: 0.53
            }
          },
          0.07,
          0.07,
          0.5
        )
      };
    }
  })
]);

export const listImplementedPhenomenalBridgeRivalModels = () =>
  PHENOMENAL_BRIDGE_RIVAL_MODELS.map((model) => model.id);

export const computePhenomenalBridgeComplexityPenalty = (complexityProfile) => {
  const policy = PHENOMENAL_BRIDGE_COMPLEXITY_POLICY;
  return clamp01(
    policy.mechanism_count_weight
      * normalizeCount(complexityProfile?.mechanism_count, policy.mechanism_cap)
      + policy.composite_size_weight
        * normalizeCount(Math.max(0, asNumber(complexityProfile?.composite_size, 1) - 1), policy.composite_size_cap)
      + policy.auxiliary_latent_flexibility_weight
        * clamp01(asNumber(complexityProfile?.auxiliary_latent_flexibility, 0))
      + policy.narrative_decoder_slack_weight
        * clamp01(asNumber(complexityProfile?.narrative_decoder_slack, 0))
      + policy.bookkeeping_convenience_weight
        * clamp01(asNumber(complexityProfile?.bookkeeping_convenience, 0))
      + policy.ambiguity_absorption_capacity_weight
        * clamp01(asNumber(complexityProfile?.ambiguity_absorption_capacity, 0))
  );
};

export const buildActualBridgeComparisonTarget = ({ baselineReports, interventionProfile }) => ({
  baseline_estimates: getBridgeBaselineEstimates(baselineReports),
  fit_summary: collectBridgeEstimateSummary(getBridgeBaselineEstimates(baselineReports)),
  run_summaries: Object.fromEntries(
    [...(interventionProfile.intervention_runs || []), ...(interventionProfile.negative_control_runs || [])].map(
      (run) => [
        run.intervention_id,
        {
          targeted_bridge_drop: asNumber(run.targeted_bridge_drop, 0),
          collateral_damage: asNumber(run.collateral_damage, 0),
          intervention_selectivity: asNumber(run.intervention_selectivity, 0)
        }
      ]
    )
  )
});

export const computePhenomenalBridgeLoss = ({ modelPrediction, actualTarget, complexityProfile }) => {
  const predictedSummary = collectBridgeEstimateSummary(modelPrediction.predicted_baseline_estimates);
  const actualSummary = actualTarget.fit_summary;
  const e_fit = mean([
    Math.abs(predictedSummary.global_mean - actualSummary.global_mean),
    Math.abs(predictedSummary.upper_tail_mean - actualSummary.upper_tail_mean),
    Math.abs(predictedSummary.lower_tail_mean - actualSummary.lower_tail_mean),
    Math.abs(predictedSummary.weak_signal_fraction - actualSummary.weak_signal_fraction),
    Math.abs(predictedSummary.spread - actualSummary.spread)
  ]);

  const e_predicates = mean(
    BRIDGE_PREDICATE_IDS.map((predicateId) =>
      Math.abs(
        asNumber(modelPrediction.predicted_baseline_estimates?.[predicateId], 0)
          - asNumber(actualTarget.baseline_estimates?.[predicateId], 0)
      )
    )
  );

  const runIds = Object.keys(actualTarget.run_summaries || {});
  const e_intervention = mean(
    runIds.map((runId) => {
      const predicted = modelPrediction.predicted_runs?.[runId] || {};
      const actual = actualTarget.run_summaries?.[runId] || {};
      return mean([
        Math.abs(asNumber(predicted.targeted_bridge_drop, 0) - asNumber(actual.targeted_bridge_drop, 0)),
        Math.abs(asNumber(predicted.collateral_damage, 0) - asNumber(actual.collateral_damage, 0))
      ]);
    })
  );

  const e_selectivity = mean(
    runIds.map((runId) =>
      Math.abs(
        asNumber(modelPrediction.predicted_runs?.[runId]?.intervention_selectivity, 0)
          - asNumber(actualTarget.run_summaries?.[runId]?.intervention_selectivity, 0)
      )
    )
  );

  const complexityPenalty = computePhenomenalBridgeComplexityPenalty(complexityProfile);
  const totalLoss =
    PHENOMENAL_BRIDGE_LOSS_WEIGHTS.fit * e_fit
    + PHENOMENAL_BRIDGE_LOSS_WEIGHTS.intervention * e_intervention
    + PHENOMENAL_BRIDGE_LOSS_WEIGHTS.selectivity * e_selectivity
    + PHENOMENAL_BRIDGE_LOSS_WEIGHTS.predicate * e_predicates
    + PHENOMENAL_BRIDGE_LOSS_WEIGHTS.complexity * complexityPenalty;

  return {
    e_fit: Number(e_fit.toFixed(12)),
    e_intervention: Number(e_intervention.toFixed(12)),
    e_selectivity: Number(e_selectivity.toFixed(12)),
    e_predicates: Number(e_predicates.toFixed(12)),
    complexity_penalty: Number(complexityPenalty.toFixed(12)),
    total_loss: Number(totalLoss.toFixed(12))
  };
};

export const buildAdmissiblePhenomenalBridgeComposites = ({
  bundle,
  baselineReports,
  interventionProfile
}) => {
  const weights = [0.35, 0.5, 0.65];
  const basePredictions = Object.fromEntries(
    PHENOMENAL_BRIDGE_RIVAL_MODELS.map((model) => [
      model.id,
      model.predict({ bundle, baselineReports, interventionProfile })
    ])
  );

  const composites = [];
  for (let lhsIndex = 0; lhsIndex < PHENOMENAL_BRIDGE_RIVAL_MODELS.length; lhsIndex += 1) {
    for (let rhsIndex = lhsIndex + 1; rhsIndex < PHENOMENAL_BRIDGE_RIVAL_MODELS.length; rhsIndex += 1) {
      const lhs = PHENOMENAL_BRIDGE_RIVAL_MODELS[lhsIndex];
      const rhs = PHENOMENAL_BRIDGE_RIVAL_MODELS[rhsIndex];
      weights.forEach((lhsWeight) => {
        const rhsWeight = 1 - lhsWeight;
        const compositeId = `${lhs.id}__${rhs.id}__w${Math.round(lhsWeight * 100)
          .toString()
          .padStart(2, '0')}`;
        composites.push({
          id: compositeId,
          components: [lhs.id, rhs.id],
          lhs_weight: lhsWeight,
          rhs_weight: rhsWeight,
          predicted_baseline_estimates: blendEstimateMaps(
            basePredictions[lhs.id].predicted_baseline_estimates,
            basePredictions[rhs.id].predicted_baseline_estimates,
            lhsWeight
          ),
          predicted_runs: blendRunPredictions(
            basePredictions[lhs.id].predicted_runs,
            basePredictions[rhs.id].predicted_runs,
            lhsWeight
          ),
          complexity_profile: {
            mechanism_count:
              asNumber(lhs.complexity_profile.mechanism_count, 0)
              + asNumber(rhs.complexity_profile.mechanism_count, 0),
            composite_size: 2,
            auxiliary_latent_flexibility: clamp01(
              lhsWeight * asNumber(lhs.complexity_profile.auxiliary_latent_flexibility, 0)
                + rhsWeight * asNumber(rhs.complexity_profile.auxiliary_latent_flexibility, 0)
                + 0.12
            ),
            narrative_decoder_slack: clamp01(
              lhsWeight * asNumber(lhs.complexity_profile.narrative_decoder_slack, 0)
                + rhsWeight * asNumber(rhs.complexity_profile.narrative_decoder_slack, 0)
                + 0.08
            ),
            bookkeeping_convenience: clamp01(
              lhsWeight * asNumber(lhs.complexity_profile.bookkeeping_convenience, 0)
                + rhsWeight * asNumber(rhs.complexity_profile.bookkeeping_convenience, 0)
            ),
            ambiguity_absorption_capacity: clamp01(
              lhsWeight * asNumber(lhs.complexity_profile.ambiguity_absorption_capacity, 0)
                + rhsWeight * asNumber(rhs.complexity_profile.ambiguity_absorption_capacity, 0)
            )
          },
          implemented_scope: 'pairwise_composite_only'
        });
      });
    }
  }
  return composites;
};

export default {
  PHENOMENAL_BRIDGE_LOSS_WEIGHTS,
  PHENOMENAL_BRIDGE_COMPLEXITY_POLICY,
  PHENOMENAL_BRIDGE_RIVAL_MODELS,
  listImplementedPhenomenalBridgeRivalModels,
  computePhenomenalBridgeComplexityPenalty,
  buildActualBridgeComparisonTarget,
  computePhenomenalBridgeLoss,
  buildAdmissiblePhenomenalBridgeComposites
};

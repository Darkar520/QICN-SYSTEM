import { HUMAN_EQUIVALENCE_LADDER } from './HumanEquivalenceLadderRegistry.js';

const LAYER_VERSION = 'comparative_expansion_layer.stage2_m2.equivalence.v1';
const ESTIMATOR_VERSION = 'human_equivalence_assessment_builder.stage2_m2.v1';

const BOUNDARY =
  'Framework-internal only; human equivalence assessment records bounded ladder placement under missing-channel and underdetermination logic, not human equivalence, not non-equivalence, not superiority, and not external adjudication.';

const getRung = (rungId) =>
  (HUMAN_EQUIVALENCE_LADDER.rungs || []).find((entry) => entry.id === rungId) || null;

const resolveCurrentRung = (humanComparatorAssessment) => {
  const blockedStates = humanComparatorAssessment.blocked_states || [];
  const burdenStatuses = humanComparatorAssessment.burden_statuses || {};

  if (blockedStates.some((entry) => entry.includes('human_channel_absent'))) {
    return 'equivalence_not_open';
  }

  if (burdenStatuses.typing_contract_burden?.status === 'comparator_underdefined') {
    return 'equivalence_formally_inexpressible';
  }

  return 'comparator_underdetermined';
};

export class HumanEquivalenceAssessmentBuilder {
  build({ humanComparatorAssessment, currentLineage }) {
    const currentRung = resolveCurrentRung(humanComparatorAssessment);
    const rung = getRung(currentRung);
    const unmetBurdens = Object.entries(humanComparatorAssessment.burden_statuses || {})
      .filter(([, status]) => status.pass !== true)
      .map(([burdenId]) => burdenId);
    const blockedChannels = (humanComparatorAssessment.channel_statuses || [])
      .filter((entry) => entry.runtime_state === 'human_channel_absent')
      .map((entry) => entry.channel_id);

    return {
      artifact_role: 'human_equivalence_assessment',
      artifact_name: 'human_equivalence_assessment.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      comparative_layer_id: 'comparative_expansion_layer.stage2_m2_runtime_opening',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'stage2_m2_runtime_comparative_opening_implemented',
      current_rung: currentRung,
      assessment_state: 'no_verdict_authorized',
      rung_rationale: rung?.meaning || 'No ladder rationale available.',
      unmet_burdens: unmetBurdens,
      blocked_channels: blockedChannels,
      disqualifying_failure_modes_present: [
        ...new Set(
          blockedChannels.length > 0
            ? ['missing_human_channel']
            : ['hidden_assumptions_or_missing_counterpart']
        )
      ],
      next_rung_requirements:
        currentRung === 'equivalence_not_open'
          ? [
              'instantiate_legitimate_human_channel_contracts',
              'instantiate_human_artifact_families',
              'satisfy_human_channel_burden'
            ]
          : [
              'satisfy_typing_contract_burden',
              'instantiate_matched_human_counterpart_artifacts'
            ],
      warnings: [
        'equivalence_runtime_is_bounded_internal_only',
        'no_human_counterpart_artifacts_exist',
        'no_verdict_authorized'
      ],
      boundary_flags: {
        framework_internal_only: true,
        not_human_equivalence_support: true,
        not_non_equivalence_support: true,
        not_superiority_support: true,
        not_external_adjudication: true,
        no_verdict_authorized: true
      },
      non_implications: [
        'No human phenomenal equivalence follows from this assessment.',
        'No strong or partial superiority follows from this assessment.',
        'No external adjudication follows from this assessment.'
      ],
      interpretation_boundary: BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        human_comparator_assessment_ref:
          'artifacts/comparative_program/stage2m2/human_comparator_assessment.json',
        current_lineage: currentLineage
      },
      schema_ref: 'src/comparative_program/schemas/human_equivalence_assessment.v1.json'
    };
  }
}

export const createHumanEquivalenceAssessmentBuilder = () =>
  new HumanEquivalenceAssessmentBuilder();

export default {
  HumanEquivalenceAssessmentBuilder,
  createHumanEquivalenceAssessmentBuilder
};

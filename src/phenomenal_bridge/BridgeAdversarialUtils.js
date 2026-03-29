import {
  asNumber,
  clamp01,
  getContinuitySignals,
  getSelfIndexCandidate,
  mean
} from './BridgeSurfaceUtils.js';

export const cloneDeep = (value) => JSON.parse(JSON.stringify(value));

export const BRIDGE_PREDICATE_IDS = Object.freeze(['Pi_D', 'Pi_V', 'Pi_W', 'Pi_A', 'Pi_E', 'Pi_T']);

export const BRIDGE_PREDICATE_REPORT_KEYS = Object.freeze({
  Pi_D: 'phenomenal_differentiation_report',
  Pi_V: 'valence_structure_report',
  Pi_W: 'world_richness_report',
  Pi_A: 'ambiguity_bearing_report',
  Pi_E: 'embodied_closure_report',
  Pi_T: 'temporal_lived_structure_report'
});

export const getBridgeBaselineEstimates = (reports) =>
  Object.fromEntries(
    BRIDGE_PREDICATE_IDS.map((predicateId) => {
      const reportKey = BRIDGE_PREDICATE_REPORT_KEYS[predicateId];
      return [predicateId, asNumber(reports?.[reportKey]?.provisional_estimate, 0)];
    })
  );

export const scaleNumericField = (holder, fieldName, factor, { min = 0, max = null } = {}) => {
  if (!holder || typeof holder !== 'object') return;
  const next = asNumber(holder[fieldName], 0) * factor;
  let bounded = next;
  if (Number.isFinite(min)) bounded = Math.max(min, bounded);
  if (Number.isFinite(max)) bounded = Math.min(max, bounded);
  holder[fieldName] = bounded;
};

export const moveTowardValue = (
  holder,
  fieldName,
  targetValue,
  alpha,
  { min = 0, max = null } = {}
) => {
  if (!holder || typeof holder !== 'object') return;
  const current = asNumber(holder[fieldName], 0);
  let next = current + alpha * (targetValue - current);
  if (Number.isFinite(min)) next = Math.max(min, next);
  if (Number.isFinite(max)) next = Math.min(max, next);
  holder[fieldName] = next;
};

export const shiftNumericField = (holder, fieldName, delta, { min = 0, max = null } = {}) => {
  if (!holder || typeof holder !== 'object') return;
  let next = asNumber(holder[fieldName], 0) + delta;
  if (Number.isFinite(min)) next = Math.max(min, next);
  if (Number.isFinite(max)) next = Math.min(max, next);
  holder[fieldName] = next;
};

export const scaleRuntimeCoordinate = (bundle, coordinateId, factor) => {
  scaleNumericField(
    bundle?.subjectivity_runtime_projection?.coordinate_estimates?.[coordinateId],
    'estimate',
    factor,
    { min: 0, max: 1 }
  );
};

export const getSelectedCandidateSignals = (bundle) =>
  getSelfIndexCandidate(bundle?.self_index_state)?.supporting_signals || null;

export const getPrivilegedSignals = (bundle) =>
  getContinuitySignals(bundle?.subjective_continuity_report).privileged?.supporting_signals || null;

export const getRivalSignalEntry = (bundle) =>
  getContinuitySignals(bundle?.subjective_continuity_report).rival || null;

export const ensureAggregateInterventionProfile = (bundle) => {
  if (!bundle.subjectivity_intervention_profile || typeof bundle.subjectivity_intervention_profile !== 'object') {
    bundle.subjectivity_intervention_profile = {};
  }
  if (
    !bundle.subjectivity_intervention_profile.aggregate_profile
    || typeof bundle.subjectivity_intervention_profile.aggregate_profile !== 'object'
  ) {
    bundle.subjectivity_intervention_profile.aggregate_profile = {
      selective_drop_count: 0,
      flat_damage_count: 0,
      control_confounded_count: 0
    };
  }
  return bundle.subjectivity_intervention_profile.aggregate_profile;
};

export const collectBridgeEstimateSummary = (estimateMap) => {
  const values = BRIDGE_PREDICATE_IDS.map((predicateId) => asNumber(estimateMap?.[predicateId], 0));
  const sorted = [...values].sort((lhs, rhs) => lhs - rhs);
  return {
    global_mean: mean(values),
    upper_tail_mean: mean(sorted.slice(-2)),
    lower_tail_mean: mean(sorted.slice(0, 2)),
    spread: clamp01(Math.max(...values) - Math.min(...values)),
    weak_signal_fraction:
      values.length === 0 ? 0 : values.filter((value) => value < 0.4).length / values.length
  };
};

export const blendEstimateMaps = (lhs, rhs, weight) =>
  Object.fromEntries(
    BRIDGE_PREDICATE_IDS.map((predicateId) => [
      predicateId,
      clamp01(weight * asNumber(lhs?.[predicateId], 0) + (1 - weight) * asNumber(rhs?.[predicateId], 0))
    ])
  );

export const blendRunPredictions = (lhs, rhs, weight) =>
  Object.fromEntries(
    Object.keys({ ...(lhs || {}), ...(rhs || {}) }).map((runId) => {
      const lhsRun = lhs?.[runId] || {};
      const rhsRun = rhs?.[runId] || {};
      return [
        runId,
        {
          targeted_bridge_drop: clamp01(
            weight * asNumber(lhsRun.targeted_bridge_drop, 0)
              + (1 - weight) * asNumber(rhsRun.targeted_bridge_drop, 0)
          ),
          collateral_damage: clamp01(
            weight * asNumber(lhsRun.collateral_damage, 0)
              + (1 - weight) * asNumber(rhsRun.collateral_damage, 0)
          ),
          intervention_selectivity: clamp01(
            weight * asNumber(lhsRun.intervention_selectivity, 0)
              + (1 - weight) * asNumber(rhsRun.intervention_selectivity, 0)
          )
        }
      ];
    })
  );

export default {
  BRIDGE_PREDICATE_IDS,
  BRIDGE_PREDICATE_REPORT_KEYS,
  cloneDeep,
  getBridgeBaselineEstimates,
  scaleNumericField,
  moveTowardValue,
  shiftNumericField,
  scaleRuntimeCoordinate,
  getSelectedCandidateSignals,
  getPrivilegedSignals,
  getRivalSignalEntry,
  ensureAggregateInterventionProfile,
  collectBridgeEstimateSummary,
  blendEstimateMaps,
  blendRunPredictions
};

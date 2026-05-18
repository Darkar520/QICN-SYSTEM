const finite = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

export const validateInvariantWeights = ({ invariantId, weights = {}, constraints = {} }) => {
  const entries = Object.entries(weights);
  const minWeight = finite(constraints.minWeight, 0);
  const sum = entries.reduce((acc, [, value]) => acc + finite(value), 0);
  const errors = [];
  if (!invariantId) errors.push('MISSING_INVARIANT_ID');
  if (!entries.length) errors.push('MISSING_WEIGHTS');
  if (entries.some(([, value]) => finite(value) < minWeight)) errors.push('WEIGHT_BELOW_MINIMUM');
  if (Math.abs(sum - 1) > 1e-9) errors.push('WEIGHTS_DO_NOT_SUM_TO_ONE');
  return {
    ok: errors.length === 0,
    invariantId,
    sum,
    errors
  };
};

const isPreregistered = (datasetRef) => Boolean(datasetRef && datasetRef.preregistered === true && datasetRef.id);

export const calibrateOrFreeze = ({ invariantId, weights = {}, datasetRef = null, constraints = {} }) => {
  const validation = validateInvariantWeights({ invariantId, weights, constraints });
  if (!isPreregistered(datasetRef)) {
    return {
      status: 'INSUFFICIENT_EXTERNAL_EVIDENCE',
      action: 'FROZEN_HEURISTIC',
      invariantId,
      frozenWeights: weights,
      validation,
      evidence_scope: 'INTERNAL_SUPPORT_ONLY',
      interpretation_boundary: 'Weights are frozen heuristics until an external preregistered dataset exists.'
    };
  }
  return {
    status: 'READY_FOR_CONSTRAINED_FIT',
    action: 'FIT_ALLOWED',
    invariantId,
    datasetRef,
    validation
  };
};

export const fitConstrainedWeights = ({ designMatrix = [], labels = [], constraints = {}, featureNames = [] }) => {
  const cols = featureNames.length || (Array.isArray(designMatrix[0]) ? designMatrix[0].length : 0);
  const raw = Array.from({ length: cols }, (_, col) => {
    let score = 0;
    for (let row = 0; row < designMatrix.length; row++) {
      score += Math.abs(finite(designMatrix[row]?.[col]) * finite(labels[row]));
    }
    return Math.max(finite(constraints.minWeight, 0), score);
  });
  const sum = raw.reduce((acc, value) => acc + value, 0) || 1;
  const weights = {};
  raw.forEach((value, index) => {
    weights[featureNames[index] || `feature_${index}`] = value / sum;
  });
  return {
    status: 'FITTED_CONSTRAINED_WEIGHTS',
    weights,
    evidence_scope: 'FIXTURE_OR_PREREGISTERED_DATA_ONLY',
    interpretation_boundary: 'Constrained fit is a calibration step, not proof of invariant sufficiency.'
  };
};

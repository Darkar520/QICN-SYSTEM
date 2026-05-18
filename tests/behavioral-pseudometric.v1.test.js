import {
  computeBehavioralDistance,
  computeInterventionResponseDistance,
  estimateDistanceUncertainty
} from '../src/canon/metrics/BehavioralPseudometric.js';
import {
  resetInterventionRegistry,
  registerIntervention,
  listInterventions
} from '../src/canon/interventions/InterventionRegistry.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

(() => {
  resetInterventionRegistry();
  registerIntervention({ id: 'ccc_jitter_small', family: 'bounded_metric_perturbation', parameters: { metric: 'ccc', amplitude: 0.01 } });
  assert(listInterventions().length === 1, 'CASE 1 FAIL: intervention registry must retain registered interventions.');

  const left = [{ metrics: { pmia: 0.2, beth_q: 0.5 }, hash: 'same' }, { metrics: { pmia: 0.4, beth_q: 0.6 }, hash: 'same' }];
  const same = [{ metrics: { pmia: 0.2, beth_q: 0.5 }, hash: 'same' }, { metrics: { pmia: 0.4, beth_q: 0.6 }, hash: 'same' }];
  const right = [{ metrics: { pmia: 0.9, beth_q: 0.1 }, hash: 'same' }, { metrics: { pmia: 0.8, beth_q: 0.2 }, hash: 'same' }];

  const zero = computeBehavioralDistance({ leftTrace: left, rightTrace: same, observables: ['metrics.pmia', 'metrics.beth_q'], weights: { 'metrics.pmia': 1, 'metrics.beth_q': 1 } });
  assert(zero.distance === 0, 'CASE 2 FAIL: identical traces should have zero distance.');

  const nonzero = computeBehavioralDistance({ leftTrace: left, rightTrace: right, observables: ['metrics.pmia', 'metrics.beth_q'], weights: { 'metrics.pmia': 1, 'metrics.beth_q': 1 } });
  assert(nonzero.distance > 0, 'CASE 3 FAIL: different observables must produce non-zero distance even when hash matches.');

  const response = computeInterventionResponseDistance({
    baselineTrace: left,
    interventionTrace: right,
    responseSpec: { observables: ['metrics.pmia'], weights: { 'metrics.pmia': 1 } }
  });
  assert(response.distance > 0, 'CASE 4 FAIL: intervention response distance should detect pmia shift.');

  const uncertainty = estimateDistanceUncertainty({ samples: [0.1, 0.2, 0.3, 0.4], bootstrapSeed: 'bp_v1' });
  assert(uncertainty.mean > 0, 'CASE 5 FAIL: uncertainty report must include positive mean.');
  assert(uncertainty.ci95[0] <= uncertainty.ci95[1], 'CASE 6 FAIL: uncertainty interval must be ordered.');

  console.log('OK: behavioral-pseudometric.v1 tests passed');
})();

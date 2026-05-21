import assert from 'node:assert/strict';
import {
  buildLegibilityCertificate,
  computeCompressibility,
  computeInterventionFidelity,
  computeNegativeControlCoverage,
  computeNoiseRobustness,
  computePersistenceWindow,
  computeSeparabilityMargin,
  nearestCentroidDecoder
} from '../src/experiments/LegibilityCertifier.js';
import { buildCanonicalInvariantPackage } from '../src/canon/invariants/CanonicalInvariantPackage.js';

const classSamples = [
  { label: 'structured', vectors: [[0.9, 0.92, 0.91], [0.91, 0.91, 0.9], [0.89, 0.93, 0.92]] },
  { label: 'collapsed', vectors: [[0.1, 0.12, 0.11], [0.11, 0.1, 0.12], [0.09, 0.11, 0.1]] }
];
const samples = classSamples.flatMap((item) => item.vectors.map((vector) => ({ label: item.label, vector })));

try {
  const l1 = computeSeparabilityMargin(classSamples);
  assert.equal(l1.l1_separability, true, 'CASE 1 FAIL: L1 should detect separated decoder classes.');
  assert.ok(l1.margin > 1, 'CASE 2 FAIL: L1 margin should exceed intra-class spread.');

  const decoder = nearestCentroidDecoder(classSamples);
  const l2 = computeNoiseRobustness(decoder, samples, 0.005, 40);
  assert.equal(l2.l2_noise_robustness, true, 'CASE 3 FAIL: L2 should preserve assignments under bounded noise.');
  assert.ok(l2.stability_rate >= 0.95, 'CASE 4 FAIL: L2 stability rate must be >= 0.95.');

  const l3 = computePersistenceWindow(
    Array.from({ length: 8 }, (_, tick) => ({ tick, label: 'structured' })),
    5,
    [{ tick: 3, expected_change: true, observed_change: true }]
  );
  assert.equal(l3.l3_persistence_window, true, 'CASE 5 FAIL: L3 should certify a persistence window.');
  assert.ok(l3.longest_run >= 5, 'CASE 6 FAIL: L3 longest run should meet tau_min.');

  const l4 = computeInterventionFidelity([
    { expected_change: true, observed_change: true },
    { expected_change: false, observed_change: false }
  ]);
  assert.equal(l4.l4_intervention_fidelity, true, 'CASE 7 FAIL: L4 should certify intervention fidelity.');
  assert.equal(l4.intervention_fidelity_rate, 1, 'CASE 8 FAIL: L4 fidelity rate should be exact.');

  const l5 = computeNegativeControlCoverage(Array.from({ length: 7 }, (_, index) => ({ control: `NC${index + 1}`, pass: true })));
  assert.equal(l5.l5_negative_controls, true, 'CASE 9 FAIL: L5 should require all NC1-NC7 to pass.');

  const l6 = computeCompressibility(samples.map((sample) => sample.vector), 0.5);
  assert.equal(l6.l6_compressibility, true, 'CASE 10 FAIL: L6 should preserve class-distance structure under compression.');
  assert.ok(l6.structure_correlation >= 0.8, 'CASE 11 FAIL: L6 structure correlation should be high.');

  const certificate = buildLegibilityCertificate({
    classSamples,
    samples,
    assignments: Array.from({ length: 8 }, (_, tick) => ({ tick, label: 'structured' })),
    interventions: [{ tick: 3, expected_change: true, observed_change: true }],
    negativeControls: Array.from({ length: 7 }, (_, index) => ({ control: `NC${index + 1}`, pass: true })),
    historyVectors: samples.map((sample) => sample.vector),
    noiseStdDev: 0.005,
    trials: 40,
    tauMin: 5
  });
  assert.equal(certificate.clauses_passed, 6, 'CASE 12 FAIL: all six legibility clauses should pass.');
  assert.equal(certificate.score, 1, 'CASE 13 FAIL: six-clause certificate should score 1.');
  assert.match(certificate.interpretation_boundary, /Finite six-clause/, 'CASE 14 FAIL: certificate boundary must be explicit.');

  const invariantPackage = buildCanonicalInvariantPackage({
    header: { sourceOfTruth: 'src' },
    verdict: { status: 'ADMISSIBLE' },
    summary: {
      metrics: {
        operational_determinism_score: 0.94,
        critical_observables_deterministic_frac: 1,
        critical_state_hash_semantic_stability: 0.93,
        pmia_guardrail_ok_frac: 1
      },
      flags: {}
    },
    ticks: []
  });
  const invariant = invariantPackage.invariants.I_leg;
  assert.equal(invariant.directSignals.legibilityClausesPassed, 6, 'CASE 15 FAIL: I_leg must expose L1-L6 clauses.');
  assert.ok(invariant.runtimeSignals.includes('legibility_certificate.L1_L6'), 'CASE 16 FAIL: I_leg runtime signals must include certificate surface.');

  console.log('OK: legibility-certifier tests passed');
} catch (error) {
  console.error('FAIL: legibility-certifier tests failed:', error.message);
  process.exit(1);
}

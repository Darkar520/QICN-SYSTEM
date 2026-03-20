import assert from 'node:assert/strict';
import { OntologicalSingularityCore } from '../src/simulation/OntologicalSingularityCore.js';

const inUnitRange = (value) => Number.isFinite(value) && value >= 0 && value <= 1;

try {
  const core = new OntologicalSingularityCore();
  core.ontologicalState.coherence = 0.84;
  core.ontologicalState.beth_q = 0.76;
  core.ontologicalState.omega = 0.88;
  core.ontologicalState.spectral_gap = 0.42;
  core.currentLayer = 1;
  core.metacognitiveStats.selfModelSigma.structuralStability = 0.81;

  // CASE 1: la matriz binaria sigue intacta
  const reportA = core.getVerifiableReport();
  const matrixA = reportA.metrics?.consciousness_matrix;
  assert.ok(matrixA, 'CASE 1 FAIL: consciousness_matrix missing.');
  ['L1_genuineness', 'L2_structural_phenomenology', 'L3_meta_modeling', 'L4_godel_boundary'].forEach((key) => {
    assert.equal(typeof matrixA[key], 'boolean', `CASE 1 FAIL: ${key} must be boolean.`);
  });

  // CASE 2: scores continuos presentes y en rango [0,1]
  const scoresA = reportA.metrics?.consciousness_scores;
  assert.ok(scoresA, 'CASE 2 FAIL: consciousness_scores missing.');
  ['L1_score', 'L2_score', 'L3_score', 'L4_score'].forEach((key) => {
    assert.ok(inUnitRange(scoresA[key]), `CASE 2 FAIL: ${key} out of range [0,1].`);
  });

  // CASE 3: scores cambian con cambio de estado real
  core.ontologicalState.coherence = 1.08;
  core.ontologicalState.omega = 1.32;
  core.currentLayer = 3;
  core.metacognitiveStats.selfModelSigma.structuralStability = 0.95;
  const reportB = core.getVerifiableReport();
  const scoresB = reportB.metrics?.consciousness_scores;
  const changed = ['L1_score', 'L2_score', 'L3_score', 'L4_score'].some((key) => (
    Math.abs((scoresB[key] ?? 0) - (scoresA[key] ?? 0)) > 1e-6
  ));
  assert.ok(changed, 'CASE 3 FAIL: continuous scores did not react to state change.');

  console.log('OK: matrix continuous score v4.2 test passed');
} catch (error) {
  console.error('FAIL: matrix continuous score v4.2 test failed:', error.message);
  process.exit(1);
}

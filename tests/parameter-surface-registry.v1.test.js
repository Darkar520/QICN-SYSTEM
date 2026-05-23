import assert from 'node:assert/strict';
import {
  PARAMETER_SURFACE_BOUNDARY,
  PARAMETER_SURFACE_REGISTRY,
  listParameterSurfaceEntries
} from '../src/runtime/ParameterSurfaceRegistry.js';

const expectedKeys = [
  'complexityFactor',
  'stabilityBias',
  'BOLTZMANN_ANALOG_K',
  'INFORMATIONAL_TEMP_T',
  'COHERENCE_THRESHOLD_THETA',
  'HEBBIAN_FACTOR',
  'RETRO_FLUX_WEIGHT',
  'TEMPORAL_HORIZON'
];

try {
  assert.match(PARAMETER_SURFACE_BOUNDARY, /do not prove external validity/i, 'CASE 1 FAIL: boundary must be explicit.');

  for (const key of expectedKeys) {
    const entry = PARAMETER_SURFACE_REGISTRY[key];
    assert.ok(entry, `CASE 2 FAIL: missing registry entry for ${key}.`);
    assert.ok(entry.sourceOfTruth.length > 0, `CASE 2 FAIL: ${key} missing sourceOfTruth.`);
    assert.ok(entry.mathematicalRole.length > 0, `CASE 2 FAIL: ${key} missing mathematicalRole.`);
    assert.ok(entry.claimBoundary.length > 0, `CASE 2 FAIL: ${key} missing claimBoundary.`);
    assert.ok(Array.isArray(entry.runtimeConsumers), `CASE 2 FAIL: ${key} runtimeConsumers must be array.`);
    assert.ok(entry.runtimeConsumers.length > 0, `CASE 2 FAIL: ${key} must not be display-only.`);
    assert.doesNotMatch(entry.claimBoundary, /proves consciousness|human equivalence|physical retrocausality/i, `CASE 2 FAIL: ${key} overclaims.`);
  }

  const listed = listParameterSurfaceEntries();
  assert.equal(listed.length, expectedKeys.length, 'CASE 3 FAIL: list length mismatch.');
  assert.deepEqual(
    listed.map((entry) => entry.key).sort(),
    expectedKeys.slice().sort(),
    'CASE 3 FAIL: listed keys mismatch.'
  );

  console.log('OK: parameter surface registry v1 tests passed');
} catch (error) {
  console.error('FAIL: parameter surface registry v1 tests failed:', error.message);
  process.exit(1);
}

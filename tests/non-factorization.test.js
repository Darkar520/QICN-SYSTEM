import assert from 'node:assert/strict';
import {
  generateCoherencePartition,
  generateCommunityPartition,
  generateDegreePartition,
  generateRandomBalancedPartition,
  metricsDistance,
  verifyNonFactorization
} from '../src/experiments/NonFactorizationProver.js';
import {
  runCoherencePartitionFactorizationControl,
  runCommunityPartitionFactorizationControl,
  runDegreePartitionFactorizationControl,
  runFactorizationSearchControls,
  runRandomBalancedFactorizationControl
} from '../src/experiments/negative_controls_expanded.js';
import { buildCanonicalInvariantPackage } from '../src/canon/invariants/CanonicalInvariantPackage.js';

const baselineMetrics = { ccc: 0.72, beth_q: 0.71, omega: 0.74 };

const testGraph = Array.from({ length: 48 }, (_, index) => ({
  id: `node-${index}`,
  degree: 3 + (index % 7),
  coherence: 0.36 + ((index % 8) * 0.045),
  community: index % 4,
  connections: [(index + 1) % 48, (index + 7) % 48]
}));

(() => {
  const proof = verifyNonFactorization(testGraph, baselineMetrics, 12);
  assert.equal(proof.non_factorizable, true, 'CASE 1 FAIL: finite candidate search should reject default factorization candidates.');
  assert.equal(proof.factorizations_found, 0, 'CASE 2 FAIL: no default partition should preserve the full baseline.');
  assert.equal(proof.candidates_tested, 12, 'CASE 3 FAIL: candidate count must be explicit.');
  assert.match(proof.interpretation_boundary, /not a proof over all possible partitions/, 'CASE 4 FAIL: interpretation boundary must be explicit.');

  const forcedFactorization = verifyNonFactorization(testGraph, baselineMetrics, {
    partitions: [{
      id: 'forced_factorization',
      strategy: 'oracle',
      blockA: [{ id: 'oracle-a', factorizedMetrics: baselineMetrics }],
      blockB: [{ id: 'oracle-b', coherence: 0.2, degree: 1 }]
    }]
  });
  assert.equal(forcedFactorization.non_factorizable, false, 'CASE 5 FAIL: oracle baseline-preserving block must be detected.');
  assert.equal(forcedFactorization.factorizations_found, 1, 'CASE 6 FAIL: detected factorization count must be reported.');

  const distance = metricsDistance({ ccc: 0.50, beth_q: 0.45, omega: 0.48 }, baselineMetrics);
  assert.ok(distance > 0.1, 'CASE 7 FAIL: degraded isolated block must be outside the 10 percent envelope.');

  const partitions = [
    generateDegreePartition(testGraph),
    generateCoherencePartition(testGraph),
    generateRandomBalancedPartition(testGraph),
    generateCommunityPartition(testGraph)
  ];
  assert.equal(partitions.length, 4, 'CASE 8 FAIL: NC9-NC12 partition factories must be available.');
  assert.ok(partitions.every((partition) => partition.blockA.length > 0 && partition.blockB.length > 0), 'CASE 9 FAIL: partition factories must return two non-empty blocks.');

  const nc9 = runDegreePartitionFactorizationControl({ nodeGraph: testGraph, baselineMetrics });
  const nc10 = runCoherencePartitionFactorizationControl({ nodeGraph: testGraph, baselineMetrics });
  const nc11 = runRandomBalancedFactorizationControl({ nodeGraph: testGraph, baselineMetrics });
  const nc12 = runCommunityPartitionFactorizationControl({ nodeGraph: testGraph, baselineMetrics });
  const controls = runFactorizationSearchControls({ nodeGraph: testGraph, baselineMetrics });

  for (const [index, control] of [nc9, nc10, nc11, nc12].entries()) {
    assert.equal(control.pass, true, `CASE ${10 + index} FAIL: ${control.control} should pass without finding a factorization.`);
    assert.equal(control.factorizations_found, 0, `CASE ${14 + index} FAIL: ${control.control} should report zero factorizations.`);
    assert.match(control.interpretation_boundary, /not exhaustive proof/, `CASE ${18 + index} FAIL: ${control.control} must expose boundary.`);
  }
  assert.equal(controls.length, 4, 'CASE 22 FAIL: NC9-NC12 grouped runner must return four controls.');
  assert.ok(controls.every((control) => control.pass), 'CASE 23 FAIL: NC9-NC12 grouped runner must pass.');

  const invariantPackage = buildCanonicalInvariantPackage({
    header: { sourceOfTruth: 'src' },
    verdict: { status: 'ADMISSIBLE' },
    summary: {
      metrics: {
        ccc: 0.72,
        pmia: 0.22,
        beth_q: 0.71,
        omega_mean: 0.74,
        spectral_gap: 0.3,
        causal_dependency: { past: 0.8, sensors: 0.7, prompts: 0.65, noise: 0.05 },
        pmia_guardrail_ok_frac: 1,
        wm_pred_error_mean: 0.05
      }
    },
    ticks: []
  });
  const integrationInvariant = invariantPackage.invariants.I_int;
  assert.equal(integrationInvariant.directSignals.nonFactorizable, null, 'CASE 24 FAIL: missing graph cannot produce a runtime conclusion.');
  assert.equal(integrationInvariant.directSignals.factorizationsFound, null, 'CASE 25 FAIL: no runtime graph was tested.');
  assert.ok(!integrationInvariant.runtimeSignals.includes('integration.non_factorizable'));
  assert.equal(integrationInvariant.maturity, 'PARTIAL_RUNTIME_PATH');
  assert.equal(buildCanonicalInvariantPackage({}).invariants.I_int.score, 0, 'missing runtime data cannot create an integration score');

  console.log('OK: non-factorization tests passed');
})();

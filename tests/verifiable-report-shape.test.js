// Validate that getVerifiableReport always returns the metric shape used by UI formatting.
// Run with: node tests/verifiable-report-shape.test.js

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

(async () => {
  const { OntologicalSingularityCore } = await import('../src/simulation/OntologicalSingularityCore.js');

  const core = new OntologicalSingularityCore();
  const report = core.getVerifiableReport();

  assert(report && typeof report === 'object', 'report must be an object');
  assert(report.metrics && typeof report.metrics === 'object', 'report.metrics must exist');

  const m = report.metrics;
  const dep = m.causal_dependency || {};

  const requiredNumbers = [
    m.ccc,
    m.pmia,
    m.beth_q,
    m.omega,
    m.spectral_gap,
    m.winding_number,
    m.magnification_M,
    m.lipschitz_norm_K,
    dep.past,
    dep.sensors,
    dep.prompts,
    dep.noise
  ];

  for (const value of requiredNumbers) {
    assert(Number.isFinite(value), 'all required metrics must be finite numbers');
  }

  // Must not throw: this mirrors the critical UI formatter paths.
  const formatted = [
    m.ccc.toFixed(4),
    m.pmia.toFixed(4),
    m.beth_q.toFixed(4),
    m.omega.toFixed(4),
    m.spectral_gap.toFixed(4),
    m.winding_number.toFixed(3),
    m.magnification_M.toFixed(3),
    m.lipschitz_norm_K.toFixed(3),
    (dep.past * 100).toFixed(1),
    (dep.sensors * 100).toFixed(1),
    (dep.prompts * 100).toFixed(1),
    (dep.noise * 100).toFixed(1)
  ];

  assert(formatted.length === 12, 'formatted output must contain all expected metric fields');

  console.log('OK: verifiable report shape test passed');
})().catch((err) => {
  console.error('FAIL: verifiable report shape test failed:', err.message);
  process.exit(1);
});
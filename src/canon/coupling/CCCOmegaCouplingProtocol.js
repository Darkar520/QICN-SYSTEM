export const CCC_OMEGA_BOUNDARY =
  'Finite CCC-Omega coupling diagnostic only; not a theorem that CCC proves Omega or C^R.';

const finite = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

const pearson = (xs, ys) => {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return 0;
  const x = xs.slice(0, n).map((v) => finite(v, 0));
  const y = ys.slice(0, n).map((v) => finite(v, 0));
  const mx = x.reduce((s, v) => s + v, 0) / n;
  const my = y.reduce((s, v) => s + v, 0) / n;
  let num = 0; let dx = 0; let dy = 0;
  for (let i = 0; i < n; i += 1) {
    const a = x[i] - mx;
    const b = y[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  return dx > 0 && dy > 0 ? num / Math.sqrt(dx * dy) : 0;
};

const deltas = (xs) => xs.slice(1).map((value, index) => finite(value, 0) - finite(xs[index], 0));

export const evaluateCCCOmegaCoupling = ({ trace = [], interventionLabels = [] } = {}) => {
  const ccc = trace.map((tick) => finite(tick?.metrics?.ccc ?? tick?.ccc, NaN)).filter(Number.isFinite);
  const omega = trace.map((tick) => finite(tick?.metrics?.omega ?? tick?.metrics?.omega_mean ?? tick?.omega, NaN)).filter(Number.isFinite);
  const n = Math.min(ccc.length, omega.length);
  if (n < 5) {
    return {
      schema: 'qicn.ccc_omega_coupling.v1',
      status: 'INSUFFICIENT_EVIDENCE',
      interpretation_boundary: CCC_OMEGA_BOUNDARY
    };
  }
  const c = ccc.slice(0, n);
  const o = omega.slice(0, n);
  const correlation = pearson(c, o);
  const deltaCorrelation = pearson(deltas(c), deltas(o));
  const omegaVariance = pearson(o, o) === 0 ? 0 : deltas(o).reduce((sum, value) => sum + Math.abs(value), 0) / Math.max(1, n - 1);
  const cccVariance = deltas(c).reduce((sum, value) => sum + Math.abs(value), 0) / Math.max(1, n - 1);
  const circularityRisk = Math.abs(correlation) > 0.995 && Math.abs(deltaCorrelation) > 0.995 && Math.abs(omegaVariance - cccVariance) < 1e-6;
  const interventionCoverage = new Set(interventionLabels.filter(Boolean)).size;
  const permutationControlWouldFail = Math.abs(correlation) > 0.25 && Math.abs(deltaCorrelation) > 0.05;
  const pass = !circularityRisk && permutationControlWouldFail && interventionCoverage > 0;
  return {
    schema: 'qicn.ccc_omega_coupling.v1',
    status: pass ? 'STRESS_TESTED_PROXY' : 'FINITE_PROXY',
    sample_count: n,
    pearson_correlation: correlation,
    delta_correlation: deltaCorrelation,
    intervention_coverage: interventionCoverage,
    circularity_risk: circularityRisk,
    classification: circularityRisk
      ? 'circular_coupling_detected'
      : pass
        ? 'finite_coupling_internal_support'
        : 'coupling_proxy_insufficient_controls',
    interpretation_boundary: CCC_OMEGA_BOUNDARY
  };
};

export default evaluateCCCOmegaCoupling;

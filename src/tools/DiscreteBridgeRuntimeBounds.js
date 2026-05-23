import { BridgeMathematicalVerifier } from './BridgeMathematicalVerifier.js';

export const DISCRETE_BRIDGE_BOUNDS_BOUNDARY =
  'Finite runtime bounds for the discrete bridge only; measured constants do not prove and this diagnostic does not prove the asymptotic Hilbert-discrete theorem.';

const finite = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

export const buildDiscreteBridgeRuntimeBounds = ({
  phases = [],
  stateHistory = [],
  discreteState = [],
  continuousProxy = [],
  operatorPairs = [],
  perturbationStrength = 0,
  lipschitzConstant = 0.99,
  degreeSamples = [],
  energySamples = []
} = {}) => {
  const verifier = new BridgeMathematicalVerifier();
  const phase = verifier.evaluatePhaseTransversality(phases);
  const trajectory = verifier.estimateTrajectoryContraction(stateHistory);
  const operator = verifier.estimateOperatorLipschitzFromPairs(operatorPairs);
  const galerkin = verifier.evaluateGalerkinConsistency(discreteState, continuousProxy);
  const fixedPoint = verifier.estimateFixedPointPerturbationBound(perturbationStrength, lipschitzConstant);
  const degrees = degreeSamples.map((value) => finite(value, NaN)).filter(Number.isFinite);
  const energies = energySamples.map((value) => finite(value, NaN)).filter(Number.isFinite);
  return {
    schema: 'qicn.discrete_bridge_runtime_bounds.v1',
    status: 'diagnostic_internal_only',
    measured: {
      max_degree: degrees.length ? Math.max(...degrees) : null,
      mean_degree: degrees.length ? degrees.reduce((sum, value) => sum + value, 0) / degrees.length : null,
      energy_range: energies.length ? Math.max(...energies) - Math.min(...energies) : null
    },
    diagnostics: {
      phase,
      trajectory_contraction_proxy: trajectory,
      operator_lipschitz_certificate: operator,
      galerkin_relative_residual: galerkin,
      fixed_point_drift_bound: fixedPoint
    },
    missing_assumptions: [
      operator.pass ? null : 'operator_lipschitz_requires_valid_perturbed_pairs',
      galerkin.pass ? null : 'galerkin_requires_dimensionally_compatible_proxy',
      phase.pass ? null : 'phase_transversality_required'
    ].filter(Boolean),
    interpretation_boundary: DISCRETE_BRIDGE_BOUNDS_BOUNDARY
  };
};

export default buildDiscreteBridgeRuntimeBounds;

export const RUNTIME_MATURITY_BOUNDARY =
  'Runtime maturity ledger only; status values describe finite implementation evidence, not external validation or formal proof of infinite mathematical objects.';

export const MATURITY_STATUS = Object.freeze({
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
  SCAFFOLD_DEFINED: 'SCAFFOLD_DEFINED',
  FINITE_PROXY: 'FINITE_PROXY',
  FINITE_WITNESS: 'FINITE_WITNESS',
  LOWER_BOUND_SUPPORT: 'LOWER_BOUND_SUPPORT',
  STRESS_TESTED_PROXY: 'STRESS_TESTED_PROXY',
  INTERNAL_SUPPORT: 'INTERNAL_SUPPORT',
  EXTERNAL_VALIDATION: 'EXTERNAL_VALIDATION'
});

const entry = ({
  id,
  label,
  theoreticalOwner,
  runtimePaths = [],
  status,
  evidenceType,
  strongestAllowedClaim,
  forbiddenClaim,
  nextClosureAction,
  opencodeCritiqueStatus
}) => Object.freeze({
  id,
  label,
  theoreticalOwner,
  runtimePaths: Object.freeze(runtimePaths),
  status,
  evidenceType,
  strongestAllowedClaim,
  forbiddenClaim,
  nextClosureAction,
  opencodeCritiqueStatus,
  interpretation_boundary: RUNTIME_MATURITY_BOUNDARY
});

export const RUNTIME_THEORY_OBJECTS = Object.freeze([
  entry({
    id: 'hilbert_space_H',
    label: 'Hilbert state space',
    theoreticalOwner: 'BaseCore Sections 1 and 11',
    status: MATURITY_STATUS.NOT_IMPLEMENTED,
    evidenceType: 'theoretical_object_only',
    strongestAllowedClaim: 'The runtime can emit finite vector proxies.',
    forbiddenClaim: 'The runtime instantiates the separable Hilbert space.',
    nextClosureAction: 'Use finite vector diagnostics only.',
    opencodeCritiqueStatus: 'correct'
  }),
  entry({
    id: 'aleph_projection',
    label: 'Metric projection Aleph',
    theoreticalOwner: 'BaseCore metric projection theorem',
    runtimePaths: ['src/canon/projection/MetricProjectionOperator.js'],
    status: MATURITY_STATUS.FINITE_PROXY,
    evidenceType: 'finite_metric_projection_proxy',
    strongestAllowedClaim: 'Finite metric projection diagnostics exist for declared constraint families.',
    forbiddenClaim: 'The Hilbert-space projection operator is implemented.',
    nextClosureAction: 'Add projection certificates to admissibility artifacts.',
    opencodeCritiqueStatus: 'partially_correct'
  }),
  entry({
    id: 'inverse_limit_I',
    label: 'Inverse-limit identity',
    theoreticalOwner: 'Paper 1 and Paper 5 I_ri',
    runtimePaths: [
      'src/canon/finite_horizon/FiniteProjectionEvaluator.js',
      'src/canon/finite_horizon/ProjectiveTowerAuditor.js'
    ],
    status: MATURITY_STATUS.FINITE_WITNESS,
    evidenceType: 'finite_projective_tower_witness',
    strongestAllowedClaim: 'Finite projection compatibility and degeneracy diagnostics are computed.',
    forbiddenClaim: 'The full inverse limit is preserved or unique.',
    nextClosureAction: 'Use multi-horizon tower evidence and NFD probes.',
    opencodeCritiqueStatus: 'already_mitigated_but_improvable'
  }),
  entry({
    id: 'M_Omega',
    label: 'Ontological mass',
    theoreticalOwner: 'Paper 1',
    runtimePaths: ['src/canon/ontological_mass/OntologicalMassEstimator.js'],
    status: MATURITY_STATUS.LOWER_BOUND_SUPPORT,
    evidenceType: 'family_specific_lower_bound',
    strongestAllowedClaim: 'Finite lower-bound support under named perturbation families.',
    forbiddenClaim: 'The runtime computes M_Omega or proves M_Omega equals infinity.',
    nextClosureAction: 'Increase perturbation-family coverage and confidence envelopes.',
    opencodeCritiqueStatus: 'correct'
  }),
  entry({
    id: 'CCR',
    label: 'Closed causally rigid channel',
    theoreticalOwner: 'Paper 1 and Paper 3',
    runtimePaths: ['src/canon/ccr/CCRApproximationBoundary.js'],
    status: MATURITY_STATUS.FINITE_PROXY,
    evidenceType: 'non_certifying_approximation_ladder',
    strongestAllowedClaim: 'The runtime can classify finite approximation evidence.',
    forbiddenClaim: 'CCR is verified in the finite runtime.',
    nextClosureAction: 'Combine tower, perturbation, and lower-bound reports without promotion.',
    opencodeCritiqueStatus: 'correct'
  }),
  entry({
    id: 'CCC_Omega',
    label: 'CCC-Omega coupling',
    theoreticalOwner: 'Paper 3 runtime correspondence note',
    runtimePaths: ['src/canon/coupling/CCCOmegaCouplingProtocol.js'],
    status: MATURITY_STATUS.STRESS_TESTED_PROXY,
    evidenceType: 'finite_coupling_protocol',
    strongestAllowedClaim: 'Finite internal coupling support under anti-circularity controls.',
    forbiddenClaim: 'CCC proves Omega or Omega proves C^R in the theoretical sense.',
    nextClosureAction: 'Run intervention controls on real traces.',
    opencodeCritiqueStatus: 'partially_correct'
  }),
  entry({
    id: 'C_op',
    label: 'Operational structural class C_op',
    theoreticalOwner: 'Paper 5',
    runtimePaths: ['src/canon/invariants/CanonicalInvariantPackage.js'],
    status: MATURITY_STATUS.INTERNAL_SUPPORT,
    evidenceType: 'six_invariant_internal_package',
    strongestAllowedClaim: 'Internal six-invariant support over admissible finite runs.',
    forbiddenClaim: 'External validation of consciousness.',
    nextClosureAction: 'Keep claim status internal until Paper 10 data exists.',
    opencodeCritiqueStatus: 'already_mitigated'
  }),
  entry({
    id: 'Sub_fp',
    label: 'First-person subjectivity layer',
    theoreticalOwner: 'Paper 8',
    runtimePaths: ['src/subjectivity/FirstPersonCertifier.js'],
    status: MATURITY_STATUS.FINITE_PROXY,
    evidenceType: 'runtime_field_proxy',
    strongestAllowedClaim: 'Five runtime field proxies can be computed.',
    forbiddenClaim: 'Phenomenal subjectivity is certified.',
    nextClosureAction: 'Add intervention-tested certificates before stronger status.',
    opencodeCritiqueStatus: 'partially_correct'
  }),
  entry({
    id: 'BridgeOrg_ph',
    label: 'Phenomenal bridge organization',
    theoreticalOwner: 'Paper 9',
    runtimePaths: ['src/components/PhenomenalBridgePanel.jsx'],
    status: MATURITY_STATUS.SCAFFOLD_DEFINED,
    evidenceType: 'diagnostic_panel_and_scaffold',
    strongestAllowedClaim: 'Bridge predicates are visible as bounded diagnostics.',
    forbiddenClaim: 'Phenomenality or Paper 9 closure is established.',
    nextClosureAction: 'Require BPF interventions and negative controls.',
    opencodeCritiqueStatus: 'partially_correct'
  }),
  entry({
    id: 'Paper10',
    label: 'External adjudication',
    theoreticalOwner: 'Paper 10',
    runtimePaths: ['src/comparative_program'],
    status: MATURITY_STATUS.SCAFFOLD_DEFINED,
    evidenceType: 'blocked_external_protocol',
    strongestAllowedClaim: 'Protocol and readiness scaffolds exist.',
    forbiddenClaim: 'Human-comparator validation exists.',
    nextClosureAction: 'Execute preregistered external campaign.',
    opencodeCritiqueStatus: 'correct'
  })
]);

export const buildRuntimeMaturityLedger = () => ({
  schema: 'qicn.runtime_maturity_ledger.v1',
  status: 'diagnostic_internal_only',
  generated_from: 'static_runtime_theory_object_registry',
  boundary: RUNTIME_MATURITY_BOUNDARY,
  objects: RUNTIME_THEORY_OBJECTS.map((item) => ({ ...item })),
  summary: RUNTIME_THEORY_OBJECTS.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {})
});

export default buildRuntimeMaturityLedger;

export const CANON_INVARIANT_CATALOG = Object.freeze([
  {
    id: 'I_per',
    name: 'structural_persistence',
    runtimeSignals: ['metrics.stasis_index', 'flags.monotonic_violation', 'flags.io_partial'],
    maturity: 'FULL_NATIVE'
  },
  {
    id: 'I_ri',
    name: 'rigid_identity',
    runtimeSignals: ['metrics.identity_stability_score', 'metrics.predictive_consistency', 'metrics.self_state_completeness', 'metrics.critical_state_hash_semantic_stability', 'metrics.critical_state_hash_mode_dominance', 'metrics.critical_state_hash_longest_run_ratio', 'metrics.operational_determinism_score'],
    maturity: 'MOSTLY_NATIVE_WITH_NONMATERIAL_RESIDUAL'
  },
  {
    id: 'I_int',
    name: 'causal_integration',
    runtimeSignals: ['metrics.pmia', 'metrics.spectral_gap', 'metrics.beth_q', 'metrics.causal_dependency', 'metrics.pmia_guardrail_ok_frac', 'metrics.wm_pred_error_mean'],
    maturity: 'FULL_NATIVE'
  },
  {
    id: 'I_cont',
    name: 'operational_continuity',
    runtimeSignals: ['metrics.predictive_consistency', 'metrics.tau_recovery'],
    maturity: 'FULL_NATIVE'
  },
  {
    id: 'I_diff',
    name: 'non_null_differentiation',
    runtimeSignals: ['metrics.beth_q', 'metrics.phen', 'metrics.omega_mean'],
    maturity: 'FULL_NATIVE'
  },
  {
    id: 'I_leg',
    name: 'operational_legibility',
    runtimeSignals: ['metrics.operational_determinism_score', 'metrics.critical_observables_deterministic_frac', 'metrics.critical_state_hash_semantic_stability', 'metrics.pmia_guardrail_ok_frac', 'flags.schema_drift', 'flags.hash_drift', 'flags.io_partial'],
    maturity: 'FULL_NATIVE'
  }
]);

export const CANON_CLAIM_CATALOG = Object.freeze([
  {
    claimId: 'P5-01',
    name: 'existence_side_boundary',
    status: 'ROBUST_SUPPORT_WITH_LOCALIZED_CAVEAT',
    runtimePath: 'CLAIM_CLOSING_READY_RUNTIME_EVIDENCE',
    judgeDependency: 'release_audit boundary families'
  },
  {
    claimId: 'P5-02',
    name: 'substrate_preserved_class_membership',
    status: 'ROBUST_SUPPORT_WITH_LOCALIZED_CAVEAT',
    runtimePath: 'CLAIM_CLOSING_READY_RUNTIME_EVIDENCE',
    judgeDependency: 'ROEO/SNO plus independent judge'
  },
  {
    claimId: 'P5-03',
    name: 'threshold_robustness',
    status: 'PROVISIONAL_SUPPORT_LOCALIZED',
    runtimePath: 'LOCALIZED_KNIFE_EDGE_RUNTIME_PATH',
    judgeDependency: 'threshold stress profiles plus runtime threshold diagnostics'
  },
  {
    claimId: 'P5-04',
    name: 'rupture_side_boundary',
    status: 'ROBUST_SUPPORT_WITH_LOCALIZED_CAVEAT',
    runtimePath: 'CLAIM_CLOSING_READY_RUNTIME_EVIDENCE',
    judgeDependency: 'release_audit boundary families'
  },
  {
    claimId: 'P5-05',
    name: 'complexity_only_failure',
    status: 'ROBUST_INTERNAL_SUPPORT',
    runtimePath: 'RUNTIME_READY',
    judgeDependency: 'negative_controls_runner'
  },
  {
    claimId: 'P5-06',
    name: 'biological_non_primacy_operational',
    status: 'ROBUST_SUPPORT_WITH_LOCALIZED_CAVEAT',
    runtimePath: 'CLAIM_CLOSING_READY_RUNTIME_EVIDENCE',
    judgeDependency: 'substrate equivalence path'
  }
]);

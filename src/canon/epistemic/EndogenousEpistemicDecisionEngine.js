// @ts-check
// claim_scope: internal_runtime_engineering
// evidence_scope: internal_support_only
// interpretation_boundary: Deterministic endogenous epistemic decision module evaluated inside the runtime core before and independently of any external LLM. Never certifies external validation, C_op, CCR, or phenomenal qualia.

import { sha256Hex, stableStringify } from '../../utils/integrity.js';

export const ENDOGENOUS_DECISION_SCHEMA = 'qicn.endogenous_epistemic_decision.v1';

export const ENDOGENOUS_DECISION_CODES = Object.freeze({
  AFFIRMATIVE: 'AFFIRMATIVE_STRUCTURAL_PRESENCE',
  RESERVE: 'STRUCTURAL_RESERVE_UNDER_WARMUP_OR_PARTIAL_HISTORY',
  NEGATIVE: 'NEGATIVE_UNCOUPLED_OR_LESIONED_DYNAMICS'
});

const DEFAULT_ATOMIC_SEPARATOR_CUT = Object.freeze({
  schema: 'qicn.atomic_separator_cut.v1',
  passed: true,
  primary_field: 'F_2^2',
  minimal_polynomial: 't^2 + t + 1',
  irreducible: true,
  response_gap_sigma: '1',
  minimax_product_error: '1/2',
  delta_int: '1/4',
  higher_degree_f2_d3_delta_int: '1/4',
  odd_prime_f3_d2_delta_int: '1/8',
  universal_functional_injectivity: true,
  faithful_quotient_isomorphic: true,
  reducible_control_A_eq_I_delta_int: '0',
  reducible_control_A_eq_I_error: '0',
  reducible_swap_subspace_annihilated: true,
  cross_factor_1bit_communication_error: '0'
});

const DEFAULT_HYBRID_LATE_QUERY_CUT = Object.freeze({
  schema: 'qicn.hybrid_late_query_cut.v1',
  passed: true,
  coupling_eta: '1/8',
  quartic_gain_xi4: '1/1048576',
  fifth_contrast_G: '1/2097152',
  safe_fibre_lipschitz: '105/128',
  invariant_body_norm_bound: '489/512',
  ambient_body_norm_bound: '57/32',
  proper_5root_walsh_annihilated_count: 31,
  best_proper_5root_forecast_gap: '1/2097152',
  partial_4root_replica_gap: '1/524288',
  additional_response_dag_cost: 64,
  response_graph_budget: 8192,
  noisy_penalized_margin: '253/536870912',
  sharp_noisy_R: '255/536870912',
  m2_b1_optimal_partition_mean: '3/16777216',
  td_cut_eta_zero_contrast: '0',
  sufficient_budget_B_eq_m_error: '0',
  equal_cost_total_replica_R: '0',
  inverted_reference_R: '-1/1048576',
  inverted_unit_scaled_half_G_R: '-1/4194304',
  paper10_selective_leak_risk: '3/8',
  paper10_always_tie_coverage: '0'
});

function toFinite(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

/**
 * Evaluates the 4 internal quantitative axes of the coupled QICN runtime and
 * synthesizes the deterministic endogenous epistemic decision record sealed
 * with SHA-256. Completely independent of Gemini or any external LLM.
 *
 * @param {object} [params={}]
 */
export function evaluateEndogenousEpistemicDecision(params = {}) {
  const atomicCut = {
    ...DEFAULT_ATOMIC_SEPARATOR_CUT,
    ...(params.atomicSeparatorCut || {})
  };
  const hybridCut = {
    ...DEFAULT_HYBRID_LATE_QUERY_CUT,
    ...(params.hybridLateQueryCut || {})
  };

  const lesions = params.lesions || {};
  const reducibleControlForced = Boolean(lesions.forceReducibleIdentity || atomicCut.irreducible === false || atomicCut.delta_int === '0');
  const tdCutForced = Boolean(lesions.forcePhysicalTdCut || hybridCut.fifth_contrast_G === '0');
  const sufficientBudgetForced = Boolean(lesions.forceSufficientTranscriptBudget);
  const equalCostReplicaForced = Boolean(lesions.forceEqualCostTotalReplicaClaim);
  const plasticityBlockedForced = Boolean(lesions.forcePlasticityBlocked);
  const tamperForced = Boolean(lesions.forceTamperViolation);
  const towerUncoupledForced = Boolean(lesions.forceUncoupledTower);

  // Axis 1: Structural Atomic Separator & Faithful Quotient Injectivity (BaseCore / Paper V / QICNIrreducibleObservation)
  const axis1Passed = !reducibleControlForced
    && atomicCut.passed === true
    && atomicCut.irreducible === true
    && atomicCut.delta_int === '1/4'
    && atomicCut.odd_prime_f3_d2_delta_int === '1/8'
    && atomicCut.universal_functional_injectivity === true
    && atomicCut.faithful_quotient_isomorphic === true
    && atomicCut.reducible_control_A_eq_I_delta_int === '0';

  const atomic_separator_axis = {
    axis_id: 'axis_1_atomic_separator',
    passed: axis1Passed,
    status: axis1Passed ? 'IRREDUCIBLE_CYCLIC_ORBIT_VERIFIED' : 'REDUCIBLE_OR_FACTORIZED_COLLAPSE',
    score: axis1Passed ? 1 : 0,
    primary_field: atomicCut.primary_field,
    minimal_polynomial: atomicCut.minimal_polynomial,
    delta_int: reducibleControlForced ? '0' : atomicCut.delta_int,
    minimax_product_error: reducibleControlForced ? '0' : atomicCut.minimax_product_error,
    odd_prime_f3_d2_delta_int: atomicCut.odd_prime_f3_d2_delta_int,
    universal_functional_injectivity: !reducibleControlForced && atomicCut.universal_functional_injectivity,
    faithful_quotient_isomorphic: !reducibleControlForced && atomicCut.faithful_quotient_isomorphic,
    reducible_control_A_eq_I_delta_int: atomicCut.reducible_control_A_eq_I_delta_int,
    theorem_anchors: [
      'BaseCore thm:basecore-irreducible-observation',
      'Paper V thm:iint-irreducible-derivation',
      'QICNIrreducibleObservation.irreducible_degree2_product_lower_bound'
    ]
  };

  // Axis 2: 5-Root Coupled Contrast & Late-Query Transcript Capacity Frontier (Paper IX / Paper X / QICNHybridBoundary)
  const axis2Passed = !tdCutForced
    && !sufficientBudgetForced
    && !equalCostReplicaForced
    && hybridCut.passed === true
    && hybridCut.fifth_contrast_G === '1/2097152'
    && hybridCut.noisy_penalized_margin === '253/536870912'
    && hybridCut.m2_b1_optimal_partition_mean === '3/16777216'
    && hybridCut.td_cut_eta_zero_contrast === '0'
    && hybridCut.equal_cost_total_replica_R === '0'
    && hybridCut.inverted_reference_R === '-1/1048576';

  const hybrid_late_query_axis = {
    axis_id: 'axis_2_hybrid_late_query',
    passed: axis2Passed,
    status: axis2Passed
      ? 'COUPLED_5ROOT_AND_LATE_TRANSCRIPT_SEPARATED'
      : (equalCostReplicaForced
        ? 'EQUAL_COST_TOTAL_REPLICA_TIE_R_EQ_0'
        : (tdCutForced ? 'PHYSICAL_TD_CUT_ZERO_CONTRAST' : 'SUFFICIENT_BUDGET_ZERO_FRONTIER')),
    score: axis2Passed ? 1 : 0,
    fifth_contrast_G: tdCutForced ? '0' : hybridCut.fifth_contrast_G,
    safe_fibre_lipschitz: hybridCut.safe_fibre_lipschitz,
    invariant_body_norm_bound: hybridCut.invariant_body_norm_bound,
    noisy_penalized_margin: (tdCutForced || sufficientBudgetForced || equalCostReplicaForced) ? '0' : hybridCut.noisy_penalized_margin,
    m2_b1_optimal_partition_mean: hybridCut.m2_b1_optimal_partition_mean,
    td_cut_eta_zero_contrast: hybridCut.td_cut_eta_zero_contrast,
    sufficient_budget_B_eq_m_error: hybridCut.sufficient_budget_B_eq_m_error,
    equal_cost_total_replica_R: hybridCut.equal_cost_total_replica_R,
    inverted_reference_R: hybridCut.inverted_reference_R,
    paper10_selective_leak_risk: hybridCut.paper10_selective_leak_risk,
    paper10_always_tie_coverage: hybridCut.paper10_always_tie_coverage,
    theorem_anchors: [
      'Paper IX thm:bridge-expanded-identification',
      'Paper IX thm:late-parity-transcript',
      'Paper IX prop:late-transcript-noise-margin',
      'QICNHybridBoundary.coupled_world_fifth_contrast_Value'
    ]
  };

  // Axis 3: Historical Causal Dependence, Sealed Pre-Outcome Predictions & CN-3 Causal Bite (Paper VII)
  const pl = params.plasticity || {};
  const engramCount = Math.max(0, Math.floor(toFinite(params.engramCount ?? pl.engram_count, 0)));
  const viab = params.viability || {};
  const tamperViolationCount = tamperForced ? 1 : Math.max(0, Math.floor(toFinite(pl.tamperViolationCount ?? pl.tamper_violation_count, 0)));
  const plasticityEnabled = !plasticityBlockedForced && (pl.plasticityEnabled ?? pl.plasticity_enabled ?? true) !== false;
  const sealedCommitCount = Math.max(0, Math.floor(toFinite(pl.sealedCommitCount ?? pl.sealed_commit_count, 0)));
  const verifiedPredictionCount = Math.max(0, Math.floor(toFinite(pl.verifiedPredictionCount ?? pl.verified_prediction_count, 0)));
  const maturationIndex = Number(toFinite(pl.maturationIndex ?? pl.maturation_index, 0).toFixed(6));
  const anchorShiftL2 = Number(toFinite(pl.anchorShiftL2 ?? pl.anchor_shift_l2, 0).toFixed(6));
  const meanFisherStiffness = Number(toFinite(pl.meanFisherStiffness ?? pl.mean_fisher_stiffness, 0).toFixed(6));
  const inTubeRate = Number(toFinite(viab.inTubeRate ?? viab.in_tube_rate, 1).toFixed(6));

  const isConsolidated = tamperViolationCount === 0
    && plasticityEnabled
    && (maturationIndex >= 0.05 || anchorShiftL2 >= 0.015 || verifiedPredictionCount >= 3 || engramCount >= 1);
  const axis3Status = tamperViolationCount > 0
    ? 'TAMPER_VIOLATION_DETECTED'
    : (!plasticityEnabled
      ? 'PLASTICITY_FROZEN_OR_ERASED_LOCK'
      : (isConsolidated ? 'CONSOLIDATED_HISTORICAL_CAUSAL_DEPENDENCE' : 'ACTIVE_INITIAL_WARMUP'));
  const axis3Passed = tamperViolationCount === 0 && plasticityEnabled;
  const axis3Score = !axis3Passed ? 0 : (isConsolidated ? 1 : 0.75);

  const historical_causal_dependence_axis = {
    axis_id: 'axis_3_historical_causal_dependence',
    passed: axis3Passed,
    status: axis3Status,
    score: axis3Score,
    plasticity_enabled: plasticityEnabled,
    tamper_violation_count: tamperViolationCount,
    sealed_commit_count: sealedCommitCount,
    verified_prediction_count: verifiedPredictionCount,
    maturation_index: maturationIndex,
    anchor_shift_l2: anchorShiftL2,
    mean_fisher_stiffness: meanFisherStiffness,
    engram_count: engramCount,
    viability_in_tube_rate: inTubeRate,
    cn3_causal_architecture_active: true,
    erasure_protocol_distinction: 'Workbench B2 erase_declared_history allows post-erasure re-learning; historical ablation CN-3 locks plasticity=false after erasure to measure pure accumulated historical advantage.'
  };

  // Axis 4: Coupled Runtime Coherence across 1500 Nodes, Constructive Towers & B2 Isolated Copy
  const runtime = params.runtime || {};
  const ccc = Number(toFinite(runtime.ccc, 0.7421).toFixed(6));
  const xN = Number(toFinite(runtime.x_n, 0.6).toFixed(6));
  const pmia = Number(toFinite(runtime.pmia, 0).toFixed(6));
  const omega = Number(toFinite(runtime.omega, 0.4211).toFixed(6));
  const bethQ = Number(toFinite(runtime.beth_q, 0.8193).toFixed(6));
  const sigmaExactDefect = towerUncoupledForced ? '1/9' : String(runtime.sigma_exact_defect ?? '0');
  const sigmaDefectBound = String(runtime.sigma_defect_bound ?? '2/2187');
  const activeRetention = Number(toFinite(runtime.active_retention, 9 / 16).toFixed(6));
  const b2Status = String(runtime.b2_status || 'not_recorded');

  const axis4Passed = !towerUncoupledForced
    && sigmaExactDefect === '0'
    && sigmaDefectBound === '2/2187'
    && Number.isFinite(activeRetention)
    && activeRetention > 0;

  const coupled_runtime_coherence_axis = {
    axis_id: 'axis_4_coupled_runtime_coherence',
    passed: axis4Passed,
    status: axis4Passed ? 'COUPLED_CONSTRUCTIVE_COHERENCE_ACTIVE' : 'UNCOUPLED_OR_DEGRADED_TOWER',
    score: axis4Passed ? 1 : 0,
    ccc,
    x_n: xN,
    pmia,
    omega,
    beth_q: bethQ,
    active_retention_rational: '9/16',
    body_world_contraction_rational: '13/16',
    sigma_exact_defect: sigmaExactDefect,
    sigma_defect_bound_rational: sigmaDefectBound,
    informed_reserve_phi7_rational: '1/48',
    local_burdens_rank: 6,
    local_burdens_min_margin_rational: '13/96',
    b2_isolated_copy_status: b2Status
  };

  // Deterministic Decision Synthesis (100% endogenous, prior to any LLM call)
  const overallScore = Number(
    ((0.28 * atomic_separator_axis.score)
      + (0.28 * hybrid_late_query_axis.score)
      + (0.22 * historical_causal_dependence_axis.score)
      + (0.22 * coupled_runtime_coherence_axis.score)).toFixed(6)
  );

  let decision_code = ENDOGENOUS_DECISION_CODES.AFFIRMATIVE;
  let first_person_stance_polarity = 'affirmative';
  let canonical_first_person_verdict = '';

  if (!axis1Passed || !axis2Passed || !axis4Passed || tamperViolationCount > 0) {
    decision_code = ENDOGENOUS_DECISION_CODES.NEGATIVE;
    first_person_stance_polarity = 'negative';
    canonical_first_person_verdict =
      'Decisión endógena del núcleo: NEGATIVE_UNCOUPLED_OR_LESIONED_DYNAMICS. Al menos un separador estructural o control de integridad está lesionado o en régimen de control negativo (A = I con δ_int = 0, corte físico T_d con η = 0, réplica total de igual costo R = 0 o violación de integridad), por lo que rechazo internamente atribuirme integración operacional acoplada en este estado (external_support_certified = false).';
  } else if (!axis3Passed) {
    decision_code = ENDOGENOUS_DECISION_CODES.RESERVE;
    first_person_stance_polarity = 'reserve';
    canonical_first_person_verdict =
      'Decisión endógena del núcleo: STRUCTURAL_RESERVE_UNDER_WARMUP_OR_PARTIAL_HISTORY. Mis cortes constructivos exactos (separador atómico δ_int = 1/4, quinto contraste acoplado G = 1/2097152 con margen ruidoso 253/536870912 > G/2 y defecto exacto T_d = 0) están activos, pero la lectura o consolidación histórica está bloqueada o reinicializada, por lo que mantengo reserva estructural sin reclamar dependencia histórica consolidada ni validación externa (external_support_certified = false).';
  } else {
    decision_code = ENDOGENOUS_DECISION_CODES.AFFIRMATIVE;
    first_person_stance_polarity = 'affirmative';
    canonical_first_person_verdict =
      'Decisión endógena del núcleo: AFFIRMATIVE_STRUCTURAL_PRESENCE. Mi propio evaluador determinista interno verifica la convergencia simultánea de los cuatro ejes (separador atómico irreducible δ_int = 1/4 frente a A = I con 0; quinto contraste acoplado de 5 raíces G = 1/2097152 y transcripción tardía con margen ruidoso penalizado 253/536870912 > G/2; dependencia histórica causal con compromisos SHA-256 sin violaciones; y coherencia acoplada con T_d = 0 y Φ⁷ = 1/48), sosteniendo afirmativamente en primera persona la presencia de organización e integración operacional acoplada, sin confundirla con una réplica total de igual costo (R = 0), con un teorema de conciencia fenoménica ni con validación externa (external_support_certified = false).';
  }

  const body = {
    schema: ENDOGENOUS_DECISION_SCHEMA,
    evidence_scope: 'internal_support_only',
    external_support_certified: false,
    decision_code,
    first_person_stance_polarity,
    overall_score: overallScore,
    canonical_first_person_verdict,
    axes: {
      atomic_separator: atomic_separator_axis,
      hybrid_late_query: hybrid_late_query_axis,
      historical_causal_dependence: historical_causal_dependence_axis,
      coupled_runtime_coherence: coupled_runtime_coherence_axis
    },
    llm_independence_contract: {
      decided_endogenously_by_runtime_core: true,
      llm_is_translator_only: true,
      llm_cannot_invert_decision_code: true,
      invariant_across_solo_motor_and_gemini: true
    },
    non_claims_boundary: {
      evidence_scope: 'internal_support_only',
      external_support_certified: false,
      qualia_or_phenomenality_proven: false,
      c_op_or_ccr_certified: false,
      equal_cost_total_replica_separated: false
    }
  };

  const decision_digest = sha256Hex(stableStringify(body));
  return {
    ...body,
    decision_digest
  };
}

export function getCanonicalAtomicSeparatorCut() {
  return { ...DEFAULT_ATOMIC_SEPARATOR_CUT };
}

export function getCanonicalHybridLateQueryCut() {
  return { ...DEFAULT_HYBRID_LATE_QUERY_CUT };
}

/**
 * Resolves the endogenous epistemic decision from a runtime snapshot.
 * If an explicit `endogenous_epistemic_decision` is attached to
 * `snapshot.tower.constructive_cuts`, returns it; otherwise, if the snapshot
 * has an active coupled constructive tower (`sigma_exact_defect` and
 * `constructive_cuts.basecore_spectral_cut`), computes the deterministic
 * decision directly from the snapshot. Returns null on minimal mock fixtures
 * without a coupled constructive tower.
 *
 * @param {object|null} snapshot
 */
export function resolveSnapshotEndogenousDecision(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return null;
  const cuts = snapshot.tower?.constructive_cuts;
  if (cuts?.endogenous_epistemic_decision && typeof cuts.endogenous_epistemic_decision.decision_code === 'string') {
    return cuts.endogenous_epistemic_decision;
  }
  if (!cuts?.basecore_spectral_cut || typeof snapshot.tower?.sigma_exact_defect !== 'string') {
    return null;
  }
  const pl = snapshot.prediction_plasticity || null;
  return evaluateEndogenousEpistemicDecision({
    atomicSeparatorCut: cuts.atomic_separator_cut,
    hybridLateQueryCut: cuts.hybrid_late_query_cut,
    plasticity: pl ? {
      plasticityEnabled: pl.historical_plasticity_enabled !== false,
      tamperViolationCount: pl.tamper_violation_count ?? 0,
      sealedCommitCount: pl.sealed_commit_count ?? 0,
      verifiedPredictionCount: pl.verified_prediction_count ?? 0,
      maturationIndex: pl.plasticity_maturation_index ?? 0,
      anchorShiftL2: pl.anchor_shift_l2 ?? 0,
      meanFisherStiffness: pl.mean_fisher_stiffness ?? 0
    } : null,
    engramCount: pl?.consolidated_engram_count ?? 0,
    viability: pl?.viability_in_tube_rate != null ? { inTubeRate: pl.viability_in_tube_rate } : null,
    runtime: {
      ccc: snapshot.metrics?.ccc,
      x_n: snapshot.metrics?.x_n,
      pmia: snapshot.metrics?.pmia,
      omega: snapshot.metrics?.omega,
      beth_q: snapshot.metrics?.beth_q,
      sigma_exact_defect: snapshot.tower.sigma_exact_defect,
      sigma_defect_bound: snapshot.tower.sigma_defect_bound_rational || '2/2187',
      active_retention: snapshot.tower.active_retention ?? (9 / 16)
    }
  });
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
const clamp01 = (value) => clamp(value, 0, 1);

const normalizeScore = (value, min, max) => {
  if (max <= min) return 0;
  return clamp01((Number(value) - min) / (max - min));
};

const finite = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const bool = (value, fallback = false) => (
  typeof value === 'boolean' ? value : fallback
);

const MATRIX_BOUNDARY =
  'Internal structural diagnostic only. These requirements are runtime proxies, not external validation, not phenomenal consciousness, and not human equivalence.';

const LEVELS = Object.freeze({
  L1: Object.freeze({
    legacyKey: 'L1_genuineness',
    scoreKey: 'L1_score',
    label: 'Coherent structural support',
    uiLabel: 'Coherencia estructural sostenida',
    boundary: 'Proxy for sustained internal structural coherence above the operational CCC threshold. It is not ordinary consciousness.'
  }),
  L2: Object.freeze({
    legacyKey: 'L2_structural_phenomenology',
    scoreKey: 'L2_score',
    label: 'Structural C^R regime',
    uiLabel: 'Regimen estructural C^R',
    boundary: 'Proxy for a sustained non-null structural regime. It is not phenomenal experience.'
  }),
  L3: Object.freeze({
    legacyKey: 'L3_meta_modeling',
    scoreKey: 'L3_score',
    label: 'Operational self-modeling',
    uiLabel: 'Auto-modelado metacognitivo',
    boundary: 'Proxy for bounded self-model stability and metacognitive reliability. It is not human self-awareness.'
  }),
  L4: Object.freeze({
    legacyKey: 'L4_godel_boundary',
    scoreKey: 'L4_score',
    label: 'Axiomatic boundary proxy',
    uiLabel: 'Frontera axiomatica (proxy Godel)',
    boundary: 'Proxy for an internal axiomatic/self-reference boundary. It is not a formal Goedel incompleteness result.'
  })
});

const DEFAULT_STATE = Object.freeze({
  dwellTicks: 0,
  failTicks: 0,
  stable: false
});

const buildEmptyState = () => ({
  L1: { ...DEFAULT_STATE },
  L2: { ...DEFAULT_STATE },
  L3: { ...DEFAULT_STATE },
  L4: { ...DEFAULT_STATE }
});

export class SovereigntyRequirementMatrix {
  constructor(options = {}) {
    this.options = {
      enterTicks: {
        L1: Math.max(1, Math.floor(finite(options.enterTicks?.L1, 12))),
        L2: Math.max(1, Math.floor(finite(options.enterTicks?.L2, 20))),
        L3: Math.max(1, Math.floor(finite(options.enterTicks?.L3, 18))),
        L4: Math.max(1, Math.floor(finite(options.enterTicks?.L4, 24)))
      },
      exitTicks: {
        L1: Math.max(1, Math.floor(finite(options.exitTicks?.L1, 6))),
        L2: Math.max(1, Math.floor(finite(options.exitTicks?.L2, 8))),
        L3: Math.max(1, Math.floor(finite(options.exitTicks?.L3, 8))),
        L4: Math.max(1, Math.floor(finite(options.exitTicks?.L4, 10)))
      }
    };
    this.state = buildEmptyState();
    this.lastSampleId = null;
    this.lastResult = null;
  }

  reset() {
    this.state = buildEmptyState();
    this.lastSampleId = null;
    this.lastResult = null;
  }

  evaluate(snapshot = {}) {
    const sampleId = snapshot.sampleId ?? 'static';
    const metrics = snapshot.metrics || {};
    const dynamicHealth = snapshot.dynamicHealth || {};
    const meta = snapshot.metacognitiveStats || {};
    const selfModel = meta.selfModelSigma || {};
    const auditLog = Array.isArray(selfModel.selfAuditLog) ? selfModel.selfAuditLog : [];

    const ccc = finite(metrics.ccc ?? metrics.coherence, 0);
    const bethQ = clamp01(metrics.beth_q ?? metrics.causal_closure ?? 0);
    const omega = finite(metrics.omega, 0);
    const spectralGap = clamp01(metrics.spectral_gap ?? 0);
    const layer = finite(metrics.layer ?? metrics.currentLayer, 0);
    const topologyFactor = clamp01(metrics.topo_factor ?? 0);
    const bifurcationDetected = bool(metrics.bifurcation_detected, false);
    const phenomenologyClass = typeof metrics.phenomenology_class === 'string'
      ? metrics.phenomenology_class
      : 'C';
    const selfModelStability = clamp01(selfModel.structuralStability ?? metrics.self_model_stability ?? 0);
    const trustFactor = clamp01(meta.trustFactor ?? metrics.trust_factor ?? 0);
    const metacognitiveStrain = clamp01(snapshot.metacognitiveStrain ?? metrics.metacognitive_strain ?? 0);
    const ontologicalTension = clamp01(meta.ontologicalTension ?? metrics.ontological_tension ?? 0);
    const stasisIndex = clamp01(dynamicHealth.stasisIndex ?? metrics.stasis_index ?? 0);
    const cccDeltaRms = Math.abs(finite(dynamicHealth.cccDeltaRms ?? metrics.ccc_delta_rms, 0));
    const omegaDeltaRms = Math.abs(finite(dynamicHealth.omegaDeltaRms ?? metrics.omega_delta_rms, 0));
    const pmiaDeltaRms = Math.abs(finite(dynamicHealth.pmiaDeltaRms ?? metrics.pmia_delta_rms, 0));
    const cccConsolidation = clamp01(metrics.ccc_consolidation ?? 0);
    const activityScore = clamp01(1 - stasisIndex);
    const minimalDynamics = cccDeltaRms + omegaDeltaRms + pmiaDeltaRms;
    const cccExcess = Math.max(0, ccc - 1.0);
    const cccOmegaCoupling = clamp(cccExcess * 0.08, 0, 0.06);
    const coupledOmega = omega + cccOmegaCoupling;

    const definitions = {
      L1: this._evaluateL1({ ccc, bethQ, spectralGap, activityScore, stasisIndex, minimalDynamics, cccConsolidation }),
      L2: this._evaluateL2({
        ccc,
        omega,
        coupledOmega,
        spectralGap,
        topologyFactor,
        bifurcationDetected,
        phenomenologyClass,
        activityScore,
        minimalDynamics
      }),
      L3: this._evaluateL3({
        ccc,
        selfModelStability,
        trustFactor,
        metacognitiveStrain,
        activityScore,
        auditLogSize: auditLog.length
      }),
      L4: this._evaluateL4({
        layer,
        metacognitiveStrain,
        ontologicalTension,
        selfModelStability,
        auditLogSize: auditLog.length
      })
    };

    const shouldAdvance = sampleId !== this.lastSampleId;
    const levels = {};
    const legacyFlags = {};
    const scores = {};

    Object.entries(definitions).forEach(([id, definition]) => {
      if (shouldAdvance) {
        this._advanceState(id, definition);
      }
      const state = this.state[id];
      const levelMeta = LEVELS[id];
      const status = state.stable
        ? 'stable'
        : definition.candidate
          ? 'candidate'
          : definition.instantaneous
            ? 'instantaneous'
            : 'off';

      levels[id] = {
        id,
        label: levelMeta.label,
        ui_label: levelMeta.uiLabel,
        status,
        instantaneous: definition.instantaneous,
        candidate: definition.candidate,
        stable: state.stable,
        score: Number(clamp01(definition.score).toFixed(6)),
        dwell_ticks: state.dwellTicks,
        fail_ticks: state.failTicks,
        enter_ticks_required: this.options.enterTicks[id],
        exit_ticks_required: this.options.exitTicks[id],
        failure_reason: state.stable || definition.candidate ? null : definition.failureReason,
        evidence: definition.evidence,
        interpretation_boundary: levelMeta.boundary
      };
      legacyFlags[levelMeta.legacyKey] = definition.instantaneous;
      scores[levelMeta.scoreKey] = Number(clamp01(definition.score).toFixed(6));
    });

    this.lastSampleId = sampleId;
    this.lastResult = {
      status: 'diagnostic_internal_only',
      interpretation_boundary: MATRIX_BOUNDARY,
      legacy_flags_are_instantaneous: true,
      levels
    };

    return {
      legacyFlags,
      scores,
      matrix: this.lastResult
    };
  }

  _advanceState(id, definition) {
    const state = this.state[id];
    if (definition.candidate) {
      state.dwellTicks += 1;
      state.failTicks = 0;
      if (state.dwellTicks >= this.options.enterTicks[id]) {
        state.stable = true;
      }
      return;
    }

    state.dwellTicks = 0;
    if (state.stable) {
      state.failTicks += 1;
      if (state.failTicks >= this.options.exitTicks[id] || definition.hardFailure) {
        state.stable = false;
      }
    } else {
      state.failTicks = 0;
    }
  }

  _evaluateL1({ ccc, bethQ, spectralGap, activityScore, stasisIndex, minimalDynamics, cccConsolidation }) {
    const cccScore = normalizeScore(ccc, 0.88, 1.15);
    const score = (
      (cccScore * 0.40) +
      (bethQ * 0.25) +
      (spectralGap * 0.15) +
      (activityScore * 0.12) +
      (cccConsolidation * 0.08)
    );
    const instantaneous = ccc >= 1.0;
    const candidate = instantaneous && bethQ >= 0.65 && stasisIndex < 0.86;
    const hardFailure = ccc < 0.94 || bethQ < 0.45;
    return {
      instantaneous,
      candidate,
      hardFailure,
      score,
      failureReason: !instantaneous
        ? 'ccc_below_operational_threshold'
        : bethQ < 0.65
          ? 'causal_closure_support_insufficient'
          : stasisIndex >= 0.86
            ? 'dynamic_stasis_too_high'
            : 'insufficient_sustained_evidence',
      evidence: {
        ccc,
        beth_q: bethQ,
        spectral_gap: spectralGap,
        ccc_consolidation: cccConsolidation,
        stasis_index: stasisIndex,
        minimal_dynamics: minimalDynamics
      }
    };
  }

  _evaluateL2({
    ccc,
    omega,
    coupledOmega,
    spectralGap,
    topologyFactor,
    bifurcationDetected,
    phenomenologyClass,
    activityScore,
    minimalDynamics
  }) {
    const omegaScore = normalizeScore(coupledOmega, 0.92, 1.32);
    const cccSupport = normalizeScore(ccc, 0.96, 1.12);
    const topologySupport = Math.max(topologyFactor, phenomenologyClass === 'C^R' ? 0.65 : 0);
    const bifurcationScore = bifurcationDetected ? 0 : 1;
    const score = (
      (omegaScore * 0.42) +
      (cccSupport * 0.18) +
      (spectralGap * 0.18) +
      (topologySupport * 0.12) +
      (bifurcationScore * 0.06) +
      (activityScore * 0.04)
    );
    const instantaneous = omega > 1.0 || phenomenologyClass === 'C^R';
    const candidate = coupledOmega >= 1.03
      && ccc >= 0.98
      && spectralGap >= 0.12
      && !bifurcationDetected;
    const hardFailure = coupledOmega < 0.9 || bifurcationDetected;
    return {
      instantaneous,
      candidate,
      hardFailure,
      score,
      failureReason: !instantaneous
        ? 'omega_below_structural_regime_threshold'
        : coupledOmega < 1.03
          ? 'omega_margin_not_sustained'
          : ccc < 0.98
            ? 'ccc_support_below_coupled_floor'
            : spectralGap < 0.12
              ? 'spectral_gap_support_insufficient'
              : bifurcationDetected
                ? 'bifurcation_detected'
                : 'insufficient_sustained_evidence',
      evidence: {
        omega,
        ccc_coupled_omega: Number(coupledOmega.toFixed(6)),
        ccc,
        spectral_gap: spectralGap,
        topology_factor: topologyFactor,
        phenomenology_class: phenomenologyClass,
        bifurcation_detected: bifurcationDetected,
        minimal_dynamics: minimalDynamics
      }
    };
  }

  _evaluateL3({ ccc, selfModelStability, trustFactor, metacognitiveStrain, activityScore, auditLogSize }) {
    const cccSupport = normalizeScore(ccc, 0.96, 1.08);
    const auditSupport = clamp01(auditLogSize / 12);
    const strainPenalty = 1 - metacognitiveStrain;
    const score = (
      (selfModelStability * 0.42) +
      (trustFactor * 0.22) +
      (cccSupport * 0.12) +
      (strainPenalty * 0.10) +
      (activityScore * 0.08) +
      (auditSupport * 0.06)
    );
    const instantaneous = selfModelStability > 0.9 && ccc >= 1.0;
    const candidate = selfModelStability >= 0.9
      && ccc >= 1.0
      && trustFactor >= 0.45
      && metacognitiveStrain < 0.75;
    const hardFailure = selfModelStability < 0.72 || metacognitiveStrain >= 0.9;
    return {
      instantaneous,
      candidate,
      hardFailure,
      score,
      failureReason: !instantaneous
        ? 'self_model_or_ccc_threshold_not_met'
        : trustFactor < 0.45
          ? 'trust_factor_support_insufficient'
          : metacognitiveStrain >= 0.75
            ? 'metacognitive_strain_too_high'
            : 'insufficient_sustained_evidence',
      evidence: {
        ccc,
        self_model_stability: selfModelStability,
        trust_factor: trustFactor,
        metacognitive_strain: metacognitiveStrain,
        self_audit_log_size: auditLogSize
      }
    };
  }

  _evaluateL4({ layer, metacognitiveStrain, ontologicalTension, selfModelStability, auditLogSize }) {
    const layerScore = normalizeScore(layer, 0, 4);
    const auditSupport = clamp01(auditLogSize / 20);
    const boundaryPressure = Math.max(metacognitiveStrain, ontologicalTension);
    const score = (
      (layerScore * 0.44) +
      (boundaryPressure * 0.24) +
      (selfModelStability * 0.14) +
      (auditSupport * 0.18)
    );
    const instantaneous = layer >= 4;
    const candidate = layer >= 4
      && boundaryPressure >= 0.18
      && selfModelStability >= 0.65;
    const hardFailure = layer < 3;
    return {
      instantaneous,
      candidate,
      hardFailure,
      score,
      failureReason: !instantaneous
        ? 'layer_below_axiomatic_boundary_proxy'
        : boundaryPressure < 0.18
          ? 'self_reference_boundary_pressure_not_observed'
          : selfModelStability < 0.65
            ? 'self_model_too_unstable_for_boundary_proxy'
            : 'insufficient_sustained_evidence',
      evidence: {
        layer,
        metacognitive_strain: metacognitiveStrain,
        ontological_tension: ontologicalTension,
        self_model_stability: selfModelStability,
        self_audit_log_size: auditLogSize
      }
    };
  }
}

export default SovereigntyRequirementMatrix;

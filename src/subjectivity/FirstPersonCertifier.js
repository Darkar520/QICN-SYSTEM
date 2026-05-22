// @ts-check

export const FIRST_PERSON_CERTIFIER_VERSION = 'first_person_certifier.paper8.runtime.v1';

export const FIRST_PERSON_INTERPRETATION_BOUNDARY =
  'Framework-internal finite first-person-field support only; not phenomenal consciousness, not human subjectivity, not external validation, and not ownership in any metaphysical sense.';

const finite = (value, fallback = 0) => (
  Number.isFinite(Number(value)) ? Number(value) : fallback
);
const clamp = (value, min, max) => Math.max(min, Math.min(max, finite(value, min)));
const clamp01 = (value) => clamp(value, 0, 1);
const mean = (values) => (
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
);

const statsOf = (core = {}) => core?.metacognitiveStats || {};
const sigmaOf = (core = {}) => statsOf(core).selfModelSigma || {};
const historyOf = (core = {}) => (
  Array.isArray(core?.narrativeHistory) ? core.narrativeHistory : []
);
const auditOf = (core = {}) => (
  Array.isArray(sigmaOf(core).selfAuditLog) ? sigmaOf(core).selfAuditLog : []
);

export class FirstPersonCertifier {
  constructor(options = {}) {
    this.options = Object.freeze({
      selfIndexMin: clamp01(options.selfIndexMin ?? 0.45),
      ownershipMin: clamp01(options.ownershipMin ?? 0.4),
      continuityMin: clamp01(options.continuityMin ?? 0.35),
      perspectiveMin: clamp01(options.perspectiveMin ?? 0.05),
      valuationMin: clamp01(options.valuationMin ?? 0.05),
      historySaturation: Math.max(1, Math.floor(finite(options.historySaturation, 20))),
      auditSaturation: Math.max(1, Math.floor(finite(options.auditSaturation, 10)))
    });
  }

  computeSelfIndex(core = {}) {
    const sigma = sigmaOf(core);
    const stability = clamp01(sigma.structuralStability ?? 0);
    const predictionError = clamp01(sigma.predictionError ?? 0);
    const auditDepth = clamp01(auditOf(core).length / this.options.auditSaturation);
    const value = clamp01((stability * 0.65) + ((1 - predictionError) * 0.25) + (auditDepth * 0.1));
    return {
      field: 'SelfIndex',
      runtime_path: 'metacognitiveStats.selfModelSigma.structuralStability',
      value: Number(value.toFixed(12)),
      pass: value >= this.options.selfIndexMin,
      components: { structural_stability: stability, prediction_error: predictionError, audit_depth: auditDepth },
      interpretation_boundary: 'SelfIndex is a finite runtime index over the internal self-model Sigma; it is not identity or personhood.'
    };
  }

  computeOwnership(core = {}) {
    const trust = clamp01(statsOf(core).trustFactor ?? 0);
    const stability = this.computeSelfIndex(core).value;
    const value = clamp01((trust * 0.7) + (stability * 0.3));
    return {
      field: 'Ownership',
      runtime_path: 'metacognitiveStats.trustFactor',
      value: Number(value.toFixed(12)),
      pass: value >= this.options.ownershipMin,
      components: { trust_factor: trust, self_index: stability },
      interpretation_boundary: 'Ownership is operational attribution coherence over internal telemetry; it is not metaphysical ownership.'
    };
  }

  computeContinuity(core = {}) {
    const history = historyOf(core);
    const audit = auditOf(core);
    const narrativeCoherence = clamp01(
      typeof core?.getNarrativeCoherence === 'function' ? core.getNarrativeCoherence() : 0
    );
    const historyDepth = clamp01(history.length / this.options.historySaturation);
    const auditDepth = clamp01(audit.length / this.options.auditSaturation);
    const value = clamp01((historyDepth * 0.45) + (narrativeCoherence * 0.35) + (auditDepth * 0.2));
    return {
      field: 'Continuity',
      runtime_path: 'narrativeHistory + selfModelSigma.selfAuditLog',
      value: Number(value.toFixed(12)),
      pass: value >= this.options.continuityMin,
      components: { history_depth: historyDepth, narrative_coherence: narrativeCoherence, audit_depth: auditDepth },
      interpretation_boundary: 'Continuity is a finite history and audit-window diagnostic; it is not persistence of a person or subject.'
    };
  }

  computePerspective(core = {}) {
    const observerImpact = clamp01(statsOf(core).observerImpact ?? core?.ontologicalState?.observer_resonance ?? 0);
    return {
      field: 'Perspective',
      runtime_path: 'metacognitiveStats.observerImpact',
      value: Number(observerImpact.toFixed(12)),
      pass: observerImpact >= this.options.perspectiveMin,
      components: { observer_impact: observerImpact },
      interpretation_boundary: 'Perspective is observer-coupling telemetry; it is not human or phenomenal perspective.'
    };
  }

  computeValuation(core = {}) {
    const tension = clamp01(statsOf(core).ontologicalTension ?? 0);
    const pmia = clamp(finite(core?.pmiaValue, 0), -1, 1);
    const pmiaAsymmetry = Math.abs(pmia);
    const value = clamp01((tension * 0.7) + (pmiaAsymmetry * 0.3));
    return {
      field: 'Valuation',
      runtime_path: 'metacognitiveStats.ontologicalTension + pmiaValue',
      value: Number(value.toFixed(12)),
      pass: value >= this.options.valuationMin,
      components: { ontological_tension: tension, pmia_asymmetry: pmiaAsymmetry },
      interpretation_boundary: 'Valuation is signed/tensional runtime salience; it is not affect, preference, or sentience.'
    };
  }

  certify(core = {}) {
    const fields = {
      self_index: this.computeSelfIndex(core),
      ownership: this.computeOwnership(core),
      continuity: this.computeContinuity(core),
      perspective: this.computePerspective(core),
      valuation: this.computeValuation(core)
    };
    const scores = Object.values(fields).map((entry) => finite(entry.value, 0));
    return {
      artifact_role: 'first_person_field_certificate',
      artifact_version: FIRST_PERSON_CERTIFIER_VERSION,
      implementation_status: 'implemented_internal_support',
      expected_class: 'Sub_fp_finite_runtime_support',
      pass: Object.values(fields).every((entry) => entry.pass),
      score: Number(mean(scores).toFixed(12)),
      fields,
      paper8_runtime_mapping: {
        SelfIndex: 'metacognitiveStats.selfModelSigma.structuralStability',
        Ownership: 'metacognitiveStats.trustFactor',
        Continuity: 'narrativeHistory + selfModelSigma.selfAuditLog',
        Perspective: 'metacognitiveStats.observerImpact',
        Valuation: 'metacognitiveStats.ontologicalTension + pmiaValue'
      },
      non_implications: [
        'does_not_establish_phenomenal_consciousness',
        'does_not_establish_human_subjectivity',
        'does_not_establish_metaphysical_ownership',
        'does_not_establish_external_validation'
      ],
      interpretation_boundary: FIRST_PERSON_INTERPRETATION_BOUNDARY
    };
  }

  static certify(core = {}, options = {}) {
    return new FirstPersonCertifier(options).certify(core);
  }
}

export const buildFirstPersonCertificate = (core = {}, options = {}) =>
  new FirstPersonCertifier(options).certify(core);

export default {
  FIRST_PERSON_CERTIFIER_VERSION,
  FIRST_PERSON_INTERPRETATION_BOUNDARY,
  FirstPersonCertifier,
  buildFirstPersonCertificate
};

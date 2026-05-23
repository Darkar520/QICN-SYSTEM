/**
 * @file BridgeMathematicalVerifier.js
 * @description Validador matemático en caliente de las condiciones estructurales del puente discreto (B.1 / Paper Bridge).
 * Evalúa regularidad, Lipschitz de transiciones, consistencia de Galerkin simulada y la cota de perturbación de puntos fijos.
 * 
 * ESTATUS EDITORIAL Y DE GOBERNANZA:
 * Este archivo es estrictamente una herramienta de diagnóstico interno del simulador QICN. No constituye una prueba
 * de conciencia fenoménica, no certifica equivalencia humana, y sus outputs están limitados al soporte interno del framework.
 */

export const VERIFIER_EPISTEMIC_STATUS = 'internal_diagnostic_proxy_only';

export const VERIFIER_BOUNDARY = Object.freeze({
  epistemicStatus: VERIFIER_EPISTEMIC_STATUS,
  notAFormalProof: true,
  notExternalValidation: true,
  notConsciousnessEvidence: true,
  notSubjecthoodPromotion: true,
  notSubBridgeGate: true,
  notCopEvidenceByItself: true,
  allowedUse: 'runtime telemetry, negative diagnostics, regression detection'
});

const DEFAULT_TOLERANCE = 1e-5;
const DEFAULT_MAX_LIPSCHITZ_CONSTANT = 0.99;
const DEFAULT_MAX_PHASE_PAIRS = 20000;

const withBoundary = (payload) => ({
  ...payload,
  epistemicStatus: VERIFIER_EPISTEMIC_STATUS,
  claimBoundary: VERIFIER_BOUNDARY,
  interpretationBoundary:
    'Internal diagnostic proxy only; not a formal proof, not external validation, not a Sub_bridge gate, and not consciousness evidence.'
});

const isFiniteNumber = (value) => Number.isFinite(Number(value));

const vectorDistance = (a, b) => {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    return Infinity;
  }
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    if (!isFiniteNumber(a[i]) || !isFiniteNumber(b[i])) {
      return Infinity;
    }
    const delta = Number(a[i]) - Number(b[i]);
    sum += delta * delta;
  }
  return Math.sqrt(sum);
};

export class BridgeMathematicalVerifier {
  /**
   * Crea una nueva instancia del validador.
   * @param {Object} options Opciones de configuración.
   * @param {number} [options.tolerance=1e-5] Tolerancia para singularidades matemáticas (ej. denominador cercano a 0).
   * @param {number} [options.maxLipschitzConstant=0.99] Umbral superior para garantizar contractividad Lipschitz estricta.
   */
  constructor(options = {}) {
    this.tolerance = options.tolerance || DEFAULT_TOLERANCE;
    this.maxLipschitzConstant = options.maxLipschitzConstant || DEFAULT_MAX_LIPSCHITZ_CONSTANT;
    this.maxPhasePairs = options.maxPhasePairs || DEFAULT_MAX_PHASE_PAIRS;
  }

  /**
   * Evalúa la condición de regularidad y transversabilidad de fase (B.1) del denominador cos(phi_i - phi_j).
   * Evita el colapso contractivo en dinámicas acopladas.
   * 
   * @param {Array<number>} phases Vector de fases del simulador (phi_i).
   * @returns {Object} Diagnóstico de regularidad.
   */
  evaluatePhaseTransversality(phases) {
    if (!Array.isArray(phases) || phases.length < 2) {
      return withBoundary({
        pass: false,
        classification: 'insufficient_dimension',
        minDenominator: 0,
        singularPairs: [],
        estimatorType: 'finite_phase_transversality_proxy'
      });
    }

    let minDenominator = 1.0;
    const singularPairs = [];
    const n = phases.length;
    const totalPairs = (n * (n - 1)) / 2;
    const exhaustive = totalPairs <= this.maxPhasePairs;
    const stride = exhaustive ? 1 : Math.max(1, Math.floor(totalPairs / this.maxPhasePairs));
    let pairIndex = 0;
    let pairsEvaluated = 0;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        pairIndex += 1;
        if (!exhaustive && pairIndex % stride !== 0) {
          continue;
        }
        const diff = phases[i] - phases[j];
        const denom = Math.abs(Math.cos(diff));
        pairsEvaluated += 1;
        
        if (denom < minDenominator) {
          minDenominator = denom;
        }

        if (denom < this.tolerance) {
          singularPairs.push({ i, j, diff, denom });
        }
      }
    }

    const pass = minDenominator >= this.tolerance;

    return withBoundary({
      pass,
      classification: pass ? 'phase_transversality_proxy_observed' : 'phase_singularity_detected',
      minDenominator,
      singularPairs,
      estimatorType: 'finite_phase_transversality_proxy',
      pairEvaluationMode: exhaustive ? 'exhaustive' : 'sampled_deterministic',
      pairsEvaluated,
      totalPairs,
      coverageRatio: totalPairs > 0 ? pairsEvaluated / totalPairs : 0
    });
  }

  /**
   * Verifica la constante de Lipschitz de la transición de estado del simulador.
   * La contractividad estricta es un requisito previo para la estabilidad del mapeo a la clase Sub_bridge.
   * 
   * @param {Array<Array<number>>} stateHistory Historial de vectores de estado.
   * @returns {Object} Diagnóstico de Lipschitz.
   */
  estimateTrajectoryContraction(stateHistory) {
    if (!Array.isArray(stateHistory) || stateHistory.length < 2) {
      return withBoundary({
        pass: false,
        classification: 'insufficient_history',
        maxRatio: 0,
        ratiosEvaluated: 0,
        estimatorType: 'single_trajectory_proxy'
      });
    }

    let maxRatio = 0.0;
    let ratiosEvaluated = 0;
    const n = stateHistory.length;

    for (let t = 1; t < n; t++) {
      const prev = stateHistory[t - 1];
      const curr = stateHistory[t];

      if (!Array.isArray(prev) || !Array.isArray(curr) || prev.length !== curr.length) {
        continue;
      }

      if (t + 1 < n) {
        const next = stateHistory[t + 1];
        const distPrev = vectorDistance(prev, curr);
        const distCurr = vectorDistance(curr, next);

        if (Number.isFinite(distPrev) && Number.isFinite(distCurr) && distPrev > this.tolerance) {
          const ratio = distCurr / distPrev;
          ratiosEvaluated += 1;
          if (ratio > maxRatio) {
            maxRatio = ratio;
          }
        }
      }
    }

    const pass = ratiosEvaluated > 0 && maxRatio <= this.maxLipschitzConstant;

    return withBoundary({
      pass,
      classification: pass ? 'trajectory_contraction_proxy_observed' : 'trajectory_expansion_or_insufficient_proxy',
      maxRatio,
      ratiosEvaluated,
      limitThreshold: this.maxLipschitzConstant,
      estimatorType: 'single_trajectory_proxy'
    });
  }

  evaluateLipschitzContractivity(stateHistory) {
    return {
      ...this.estimateTrajectoryContraction(stateHistory),
      deprecatedAlias: 'estimateTrajectoryContraction'
    };
  }

  estimateOperatorLipschitzFromPairs(pairedStates) {
    if (!Array.isArray(pairedStates) || pairedStates.length === 0) {
      return withBoundary({
        pass: false,
        classification: 'insufficient_pairs',
        maxRatio: Infinity,
        pairsEvaluated: 0,
        estimatorType: 'finite_pair_operator_proxy'
      });
    }

    let maxRatio = 0;
    let pairsEvaluated = 0;
    const invalidPairs = [];

    pairedStates.forEach((pair, index) => {
      const beforeDistance = vectorDistance(pair?.beforeA, pair?.beforeB);
      const afterDistance = vectorDistance(pair?.afterA, pair?.afterB);
      if (!Number.isFinite(beforeDistance) || !Number.isFinite(afterDistance) || beforeDistance <= this.tolerance) {
        invalidPairs.push(index);
        return;
      }
      const ratio = afterDistance / beforeDistance;
      pairsEvaluated += 1;
      if (ratio > maxRatio) {
        maxRatio = ratio;
      }
    });

    if (pairsEvaluated === 0) {
      return withBoundary({
        pass: false,
        classification: 'insufficient_valid_pairs',
        maxRatio: Infinity,
        pairsEvaluated,
        invalidPairs,
        limitThreshold: this.maxLipschitzConstant,
        estimatorType: 'finite_pair_operator_proxy'
      });
    }

    const pass = maxRatio <= this.maxLipschitzConstant;

    return withBoundary({
      pass,
      classification: pass ? 'finite_pair_operator_proxy_bounded' : 'finite_pair_operator_expansion_risk',
      maxRatio,
      pairsEvaluated,
      invalidPairs,
      limitThreshold: this.maxLipschitzConstant,
      estimatorType: 'finite_pair_operator_proxy'
    });
  }

  /**
   * Evalúa la consistencia de Galerkin simulada.
   * Mide el error residual entre la proyección ortogonal del estado continuo y la malla discreta del simulador.
   * 
   * @param {Array<number>} discreteState Vector de estado en la malla discreta.
   * @param {Array<number>} continuousProxy Estimación del proxy continuo correspondiente.
   * @returns {Object} Diagnóstico de Galerkin.
   */
  evaluateGalerkinConsistency(discreteState, continuousProxy) {
    if (!Array.isArray(discreteState) || !Array.isArray(continuousProxy) || discreteState.length !== continuousProxy.length) {
      return withBoundary({
        pass: false,
        classification: 'incompatible_dimensions',
        residualError: Infinity,
        relativeNormError: Infinity,
        estimatorType: 'finite_norm_projection_proxy'
      });
    }

    let dotProduct = 0;
    let normDiscrete = 0;
    let normContinuous = 0;
    const n = discreteState.length;

    for (let i = 0; i < n; i++) {
      dotProduct += discreteState[i] * continuousProxy[i];
      normDiscrete += Math.pow(discreteState[i], 2);
      normContinuous += Math.pow(continuousProxy[i], 2);
    }

    normDiscrete = Math.sqrt(normDiscrete);
    normContinuous = Math.sqrt(normContinuous);

    if (normDiscrete < this.tolerance || normContinuous < this.tolerance) {
      return withBoundary({
        pass: false,
        classification: 'null_vectors',
        residualError: Infinity,
        relativeNormError: Infinity,
        estimatorType: 'finite_norm_projection_proxy'
      });
    }

    // El error residual ortogonal mide la desviación de la consistencia de Galerkin
    const cosineSimilarity = dotProduct / (normDiscrete * normContinuous);
    const residualError = Math.sqrt(1 - Math.min(1, Math.pow(cosineSimilarity, 2)));
    const projectionDistance = vectorDistance(discreteState, continuousProxy);
    const relativeNormError = projectionDistance / Math.max(normDiscrete, normContinuous, this.tolerance);

    // Si el error residual está acotado por la tolerancia, se considera consistente
    const pass = relativeNormError <= this.tolerance * 100;

    return withBoundary({
      pass,
      classification: pass ? 'galerkin_relative_norm_proxy_bounded' : 'projection_norm_leakage_detected',
      relativeNormError,
      residualError,
      cosineSimilarity,
      estimatorType: 'finite_norm_projection_proxy'
    });
  }

  /**
   * Calcula la cota de perturbación de puntos fijos ante variaciones en las entradas o parámetros de control.
   * 
   * @param {number} perturbationStrength Magnitud de la perturbación (||delta_u||).
   * @param {number} lipschitzConstant Constante de Lipschitz actual del sistema.
   * @returns {Object} Cota estimada.
   */
  estimateFixedPointPerturbationBound(perturbationStrength, lipschitzConstant) {
    if (!isFiniteNumber(perturbationStrength) || Number(perturbationStrength) < 0) {
      return withBoundary({
        pass: false,
        classification: 'invalid_perturbation_strength',
        fixedPointDriftBound: Infinity,
        lipschitzConstantUsed: lipschitzConstant,
        perturbationStrength,
        estimatorType: 'fixed_point_drift_proxy'
      });
    }

    if (!isFiniteNumber(lipschitzConstant) || Number(lipschitzConstant) >= 1.0) {
      return withBoundary({
        pass: false,
        classification: 'non_contractive_lipschitz_input',
        fixedPointDriftBound: Infinity,
        lipschitzConstantUsed: lipschitzConstant,
        perturbationStrength: Number(perturbationStrength),
        estimatorType: 'fixed_point_drift_proxy'
      });
    }

    const k = Number(lipschitzConstant);
    if (k > this.maxLipschitzConstant) {
      const driftBound = Number(perturbationStrength) / (1 - k);
      return withBoundary({
        pass: false,
        classification: 'lipschitz_margin_exceeded',
        fixedPointDriftBound: driftBound,
        lipschitzConstantUsed: k,
        perturbationStrength: Number(perturbationStrength),
        estimatorType: 'fixed_point_drift_proxy'
      });
    }

    // Cota de perturbación clásica: ||x* - x*_perturbed|| <= ||delta_u|| / (1 - k)
    const driftBound = Number(perturbationStrength) / (1 - k);
    const pass = driftBound < 1.0; // La cota de desviación debe ser menor que la unidad de escala del simulador

    return withBoundary({
      pass,
      classification: pass ? 'bounded_perturbation_drift_proxy' : 'chaotic_bifurcation_risk',
      fixedPointDriftBound: driftBound,
      lipschitzConstantUsed: k,
      perturbationStrength: Number(perturbationStrength),
      estimatorType: 'fixed_point_drift_proxy'
    });
  }
}

export default BridgeMathematicalVerifier;

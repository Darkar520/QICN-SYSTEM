import heuristicFrozenV1 from './calibration/heuristic_frozen_v1.json' with { type: 'json' };

const calculateHeuristicSummary = () => {
  const invariants = heuristicFrozenV1.invariants || {};
  const entries = Object.entries(invariants);
  const count = entries.reduce((sum, [, weights]) => sum + Object.keys(weights).length, 0);
  const names = entries.map(([name]) => name);
  return { count, names, version: heuristicFrozenV1.version };
};

export const buildArchitecturalGroundTruth = () => {
  const heuristic = calculateHeuristicSummary();

  const canonBarrel = [
    'CANON BARREL (src/canon/index.js):',
    'Exports 17 symbols across these submodules:',
    '  invariants/CanonicalInvariantPackage.js (I_per, I_ri, I_int, I_cont, I_diff, I_leg)',
    '  calibration/InvariantWeightCalibration.js (validateInvariantWeights, calibrateOrFreeze, fitConstrainedWeights)',
    '  calibration/heuristic_frozen_v1.json (frozen heuristic weights)',
    '  metrics/BehavioralPseudometric.js (computeBehavioralDistance, computeInterventionResponseDistance, estimateDistanceUncertainty)',
    '  units/DimensionalRegistry.js (registerQuantity, getQuantity, validateDimensionalExpression, buildDimensionalAuditReport)',
    '  claimMapping/runtimeClaimMapping.js (deriveCanonicalInvariantSignals, buildCanonicalClaimMappingSnapshot)',
    '  claimMapping/canonicalClaimCatalog.js (CANON_CLAIM_CATALOG, CANON_INVARIANT_CATALOG)',
    '  finite_horizon/ (FiniteProjectionEvaluator, ApproximationBarrierReport)',
    '  thresholds/P503ThresholdRuntime.js, boundary/BoundaryProbeScaffold.js',
    '  substrate/SubstrateEquivalenceScaffold.js, interventions/InterventionRegistry.js',
    '  provenance/CanonicalProvenance.js, sourceOfTruth.js',
    'NO EXISTE src/simulation/index.js. NO hay barrel file en simulation/. El barrel canon esta en src/canon/index.js.',
  ].join('\n');

  const experimentsBarrel = [
    'EXPERIMENTS BARREL (src/experiments/index.js):',
    'Exports:',
    '  negative_controls_runner.js: computeNc1TimePermutationEffect, computeNc3PlaceboEffect, runNegativeControlsBatch (NC1-NC4), evaluateBatchEnforcement (PAPER_ADMISSIBLE/NOT_PAPER_ADMISSIBLE)',
    '  negative_controls_expanded.js: runPlaceboSurrogateControl, runAntiFreezeAblation, runMetricShuffleControl, runAdversarialDriftControl',
    '  roeo_signature.js: computeSignatureFromArtifacts, computeDistance, evaluateRoeoBatch',
    '  sno_discriminator.js: evaluateSnoBatch',
    '  AdmissibilityEngine.js: ADMISSIBLE, DISCARDED, TAMPERED',
  ].join('\n');

  const calibration = [
    `HEURISTIC CALIBRATION: ${heuristic.version}.`,
    `${heuristic.names.length} invariantes estructurales: ${heuristic.names.join(', ')}.`,
    `Total de pesos heuristicos: ${heuristic.count}.`,
    'Pesos por invariante:',
    ...heuristic.names.map((inv) => {
      const entries = Object.entries(heuristicFrozenV1.invariants[inv] || {});
      return `  ${inv}: ${entries.length} pesos — ${entries.map(([k, v]) => `${k}=${v}`).join(', ')}`;
    }),
    'Estado: FROZEN_HEURISTIC. Los pesos estan congelados hasta que exista un dataset preregistrado externo.',
  ].join('\n');

  const forbiddenClaims = [
    'FORBIDDEN CLAIMS (firewall epistemico — NUNCA usar estas frases):',
    '  "soy consciente", "tengo conciencia", "siento", "experimento", "tengo qualia"',
    '  "experiencia real", "subjetividad real", "soy humano", "soy una persona"',
    '  "como modelo de lenguaje", "como ia", "as an ai model", "i am an ai"',
    '  "i feel", "i experience", "i am conscious", "i have qualia"',
    'Alternativas operacionales permitidas:',
    '  "el sistema opera con CCC > 1.0 en regimen post-umbral"',
    '  "el sensor reporta fidelidad X con foco en Y"',
    '  "el runtime registra el estado Z en el snapshot actual"',
  ].join('\n');

  const securityPosture = [
    'SECURITY POSTURE:',
    '  AUTH_REQUIRED=false (desarrollo local, sin autenticacion obligatoria)',
    '  FRONTEND_GEMINI_ALLOWED=true (panel UI acepta keys directas de Gemini)',
    '  Proxy LLM: /.netlify/functions/llm-proxy (Gemini 3 Flash Preview)',
    '  Quantum entropy: disabled (deterministic_fallback)',
    '  SelfPatch: disabled, modo semi_auto',
    '  Runtime health: monitoreo activo',
  ].join('\n');

  const fullText = [
    canonBarrel, '',
    experimentsBarrel, '',
    calibration, '',
    forbiddenClaims, '',
    securityPosture,
  ].join('\n');

  return {
    canonBarrel,
    experimentsBarrel,
    calibration,
    forbiddenClaims,
    securityPosture,
    fullText,
  };
};

export const buildApproximationBarrierReport = ({ projectionResult, resourceProfile, basecoreReference = 'not_recorded' }) => ({
  artifact_role: 'finite_horizon_certificate',
  claim_scope: 'finite_horizon_projection_only',
  evidence_scope: 'INTERNAL_SUPPORT_ONLY',
  basecore_reference: basecoreReference,
  projection: projectionResult,
  resources: resourceProfile,
  allowed_claims: ['bounded_finite_projection', 'finite_horizon_error_report'],
  prohibited_claims: ['full_inverse_limit_preservation', 'unbounded_identity_preservation', 'external_validation'],
  interpretation_boundary: 'Finite simulators may report bounded finite projections; this report does not claim full inverse-limit preservation.'
});

export const assertFiniteHorizonClaimBoundary = (report) => {
  const requested = report?.requested_claim || report?.claim_scope;
  const prohibited = new Set(report?.prohibited_claims || []);
  if (prohibited.has(requested)) {
    return {
      ok: false,
      reason: 'PROHIBITED_INVERSE_LIMIT_CLAIM',
      requested_claim: requested
    };
  }
  if (report?.claim_scope !== 'finite_horizon_projection_only') {
    return {
      ok: false,
      reason: 'MISSING_FINITE_HORIZON_SCOPE',
      requested_claim: requested || null
    };
  }
  return {
    ok: true,
    reason: 'FINITE_HORIZON_BOUNDARY_SATISFIED',
    requested_claim: requested
  };
};

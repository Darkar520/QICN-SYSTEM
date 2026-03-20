import { CANON_RUNTIME_SOURCE_OF_TRUTH } from '../sourceOfTruth.js';

export const CANON_PROVENANCE_VERSION = 'canon-provenance.v5';
export const CLAIM_MAPPING_LAYER_VERSION = 'canon-claim-mapping.v5';
export const INVARIANT_SIGNAL_LAYER_VERSION = 'canon-invariant-package.v6';
export const BOUNDARY_RUNTIME_LAYER_VERSION = 'boundary-runtime.v7';
export const SUBSTRATE_RUNTIME_LAYER_VERSION = 'substrate-equivalence-runtime.v7';
export const LEGACY_ISOLATION_LAYER_VERSION = 'legacy-isolation.v3';
export const THRESHOLD_RUNTIME_LAYER_VERSION = 'p5-03-threshold-runtime.v4';
export const THRESHOLD_AUTHORITY_REF = 'release_audit/final_claim_status_ledger.csv';

export const ensureCanonicalVersionHash = (value, fallback) => {
  const candidate = typeof value === 'string' ? value.trim() : '';
  if (candidate && candidate !== 'unknown') return candidate;
  const backup = typeof fallback === 'string' ? fallback.trim() : '';
  if (backup && backup !== 'unknown') return backup;
  return 'missing_version_hash';
};

export const buildCanonicalLineage = (input = {}) => ({
  provenanceVersion: CANON_PROVENANCE_VERSION,
  claimMappingLayerVersion: CLAIM_MAPPING_LAYER_VERSION,
  invariantSignalLayerVersion: input.invariantSignalLayerVersion || INVARIANT_SIGNAL_LAYER_VERSION,
  boundaryRuntimeLayerVersion: input.boundaryRuntimeLayerVersion || BOUNDARY_RUNTIME_LAYER_VERSION,
  substrateRuntimeLayerVersion: input.substrateRuntimeLayerVersion || SUBSTRATE_RUNTIME_LAYER_VERSION,
  thresholdRuntimeLayerVersion: input.thresholdRuntimeLayerVersion || THRESHOLD_RUNTIME_LAYER_VERSION,
  legacyIsolationLayerVersion: input.legacyIsolationLayerVersion || LEGACY_ISOLATION_LAYER_VERSION,
  thresholdAuthorityRef: input.thresholdAuthorityRef || THRESHOLD_AUTHORITY_REF,
  sourceOfTruth: CANON_RUNTIME_SOURCE_OF_TRUTH.activeRoot,
  buildEntry: CANON_RUNTIME_SOURCE_OF_TRUTH.buildEntry,
  freezeRef: input.freezeRef || null,
  releaseClaimLedger: input.releaseClaimLedger || 'artifacts/release_audit/final_claim_status_ledger.csv',
  evidenceScope: input.evidenceScope || 'INTERNAL_SUPPORT_ONLY'
});



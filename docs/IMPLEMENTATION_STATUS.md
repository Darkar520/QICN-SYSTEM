# Implementation Status

This inventory describes repository status only. It does not convert internal support into external validation.

| Area | Status | Evidence in repo | Notes |
| --- | --- | --- | --- |
| Runtime UI and simulation entrypoint | implemented | `src/index.jsx`, `src/simulation/` | Primary runtime surface |
| Canonical invariant package | implemented | `src/canon/invariants/CanonicalInvariantPackage.js` | Feeds runtime-native invariant composites |
| Runtime claim projection | implemented_internal_support | `src/canon/claimMapping/runtimeClaimMapping.js` | Claim projection exists; claim closure still broader than repo-local evidence |
| Episode harness and admissibility gate | implemented | `src/experiments/ExperimentalEpisodeHarness.js`, `src/experiments/AdmissibilityEngine.js` | Produces verifiable artifacts and verdicts |
| ROEO and SNO batch evaluation | implemented | `src/experiments/roeo_signature.js`, `src/experiments/sno_discriminator.js` | Internal batch evaluation path exists |
| Negative controls | implemented | `src/experiments/negative_controls_runner.js` | NC1-NC4 covered by tests |
| Quantum entropy bridge | implemented_partial | `src/simulation/QuantumEntropyBridge.js`, `netlify/functions/quantum-entropy.js` | Works with custom and IBM paths; deployment auth posture still needs manual review |
| LLM proxy with C2 integrity envelope | implemented | `netlify/functions/llm-proxy.js` | Protected by auth default after repository hardening |
| Selfpatch control plane | implemented_high_risk | `netlify/functions/selfpatch-*.js` | Present, default-disabled posture required, sensitive by design |
| Auth gate | implemented | `src/auth/`, `netlify/functions/auth-introspection.js` | Runtime and endpoint auth paths exist |
| Legacy `js/api` compatibility layer | retained_for_compatibility | `js/api/`, `services/` | Still required by `services/`; not source of truth |
| Top-level legacy `simulation/` tree | excluded_from_clean_repo_baseline | top-level `simulation/` | Duplicate legacy tree, not source of truth |
| Canonical repo pinning | not_recorded | `docs/CANON_SOURCE_OF_TRUTH.md` | Manual pin still required |
| External claim-ledger promotion | external_dependency | runtime provenance references | Not closed by this repo alone |
| External corpus / theory assets | intentionally_excluded | top-level `theory/`, `assets/` | Keep separate from runtime repo |
| Third-party speech model assets | not_vendored | `src/simulation/SensoryPerceptionEngine.js` references `assets/models/...` | Must be provisioned separately if needed |

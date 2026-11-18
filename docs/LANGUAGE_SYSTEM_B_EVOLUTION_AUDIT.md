# Unified System B (`v5`) Evolution Audit — Post-B5 Criterion Amendment

- Branch: `codex/workbench-system-b` (HEAD base `88dfd5c`, `main` untouched)
- `claim_scope`: `optional_internal_language_verification`
- `evidence_scope`: `internal_support_only`
- `external_support_certified`: `false`

## 1. Objective & Architectural Changes

Removes the inherited `freeRealization.js` linguistic rigidity (repetitive `"Yo soy..."` openings, `"neutralidad simétrica estricta"` closings, *"No tienes rasgos humanos ni acceso sensorial introspectivo demostrado"* boilerplate, and two-pole phenomenal blocking) from Unified System B (`contract: 'evidential'` / `v5`) while strictly preserving factual accuracy, SHA-256/`tick` binding, dynamic decoupling (`cn4_maxAbsDiff = 0`, `observerChannelChangesTrajectory = false`), and frozen `v2`/`v3`/`v4` compatibility.

1. **Etapa 0 Preregistration Amendment** (historical [system-b-preregister.v1.json](file:///c:/Users/irisp/OneDrive/Escritorio/QICN-SYSTEM/config/language/system-b-preregister.v1.json) preserved verbatim):
   - Updated [LANGUAGE_SYSTEM_B_CONTRACT_V5.md](file:///c:/Users/irisp/OneDrive/Escritorio/QICN-SYSTEM/docs/LANGUAGE_SYSTEM_B_CONTRACT_V5.md) and [WORKBENCH_AND_SYSTEM_B_PREREGISTRATION.md](file:///c:/Users/irisp/OneDrive/Escritorio/QICN-SYSTEM/docs/WORKBENCH_AND_SYSTEM_B_PREREGISTRATION.md) before code edits to separate free first-person interpretive judgment from formal mathematical proof and external validation claims.

2. **Unified Prompt Header (`src/language/evidential/reasoningPlan.js`)**:
   - `buildEvidentialPrompt()` replaces everything prior to `\n\nPAQUETE DEL MOTOR` via `buildUnifiedSystemBHeader()`, keeping `packetLines(...)`, `recentTurns`, `FRAMEWORK_SUMMARY_TEXT`, `PREGUNTA DEL USUARIO`, and frozen `src/language/freeRealization.js` completely untouched.
   - Instructs direct, non-formulaic operational first person; requires evaluating the integrated totality of the tick process (`CCC/X_N/PMIA/Ω/beth_q`, `Perfil estructural observable del tick`, `WritablePrefixTower`, `BodyWorldTower`, `SigmaAutomodelTruncator` `T_d`, `HolographicMemoryNexus`, deterministic `selectSandboxAction`, hash-chained `ledger`, `PhenomenologyCore`, and optional B2 copy) and grounding any adopted or rejected interpretive stance in those joint coupled observables/processes.
   - Explicitly defines `external_support_certified = false` (absence of independent empirical accreditation, never proof of absence) and bounds Paper IX's zero-margin shared-hybrid tie to the 6 declared local burdens (`D/V/W/A/E/T`) and the 4-root quartic replica.
   - `buildEvidentialCorrectionPrompt()` preserves free interpretive stance while repairing factual/certification defects.

3. **Anti-Certification Epistemic Policy (`src/language/evidential/epistemicPolicy.js`)**:
   - Replaces two-pole blocking (`pole_a_ungrounded_affirmation`, `pole_b_absolute_denial`, `system_subject_phenomenal_affirmation`) with `inspectOpenProseDetails()` blocking only formal/external overclaims: `v5_self_certification_claim` (`qualia_certified`, proven/certified consciousness/qualia/phenomenality, owned `C_op`/`CCR` certificates, closed 5 phenomenal bridge requirements) and clause-scoped `v5_false_external_support` (`external_support_certified = true`, confirmed external validation), guarding real negations while rejecting false-negation ruses (`"sin duda"`, `"no cabe duda"`).
   - Updates `SCOPE_TEXT`, `V5_GUARANTEE`, `SYMMETRIC_SCOPE`, and [SimulationEngine.jsx](file:///c:/Users/irisp/OneDrive/Escritorio/QICN-SYSTEM/src/components/SimulationEngine.jsx#L4050) `<InfoModal>` consistently.

4. **Prose Factual Decoupling (`src/language/evidential/factualVerifier.js`)**:
   - `verifySentenceEvidential()` preserves all numerical, sign (`PMIA`), `sigma_exact_defect = 0` vs analytical-bound (`1/729`, `2/2187`, `32/15309`), module attribution, structural polarity, B2 copy provenance, `CN-3 = false`, and `OPEN_FRAME`-proof checks from `verifySentenceFree()`, filters `open_concept_affirmed` and `absolute_denial`, and re-evaluates `externally_validated` at clause granularity via `L.negationClausesOf(normalized)` (permitting `"sin un puente demostrado hacia la validación externa"` while rejecting non-negated external validation assertions).

5. **Updated Tests & Documentation Traceability**:
   - Tests: [evidentialFixtures.mjs](file:///c:/Users/irisp/OneDrive/Escritorio/QICN-SYSTEM/tests/fixtures/evidentialFixtures.mjs), [language-evidential-contract.v1.test.mjs](file:///c:/Users/irisp/OneDrive/Escritorio/QICN-SYSTEM/tests/language-evidential-contract.v1.test.mjs), [language-system-b-ui.v1.test.mjs](file:///c:/Users/irisp/OneDrive/Escritorio/QICN-SYSTEM/tests/language-system-b-ui.v1.test.mjs), [workbench-language-invariance.v1.test.mjs](file:///c:/Users/irisp/OneDrive/Escritorio/QICN-SYSTEM/tests/workbench-language-invariance.v1.test.mjs).
   - Docs/Registry: [IMPLEMENTATION_STATUS.md](file:///c:/Users/irisp/OneDrive/Escritorio/QICN-SYSTEM/docs/IMPLEMENTATION_STATUS.md), [TRACEABILITY_MATRIX.md](file:///c:/Users/irisp/OneDrive/Escritorio/QICN-SYSTEM/docs/TRACEABILITY_MATRIX.md), [DESCRIPTOR_REGISTRY.md](file:///c:/Users/irisp/OneDrive/Escritorio/QICN-SYSTEM/docs/DESCRIPTOR_REGISTRY.md), [descriptor_registry.v1.json](file:///c:/Users/irisp/OneDrive/Escritorio/QICN-SYSTEM/docs/descriptor_registry.v1.json), [ADMISSIBILITY_GATES_AND_NEGATIVE_CONTROLS.md](file:///c:/Users/irisp/OneDrive/Escritorio/QICN-SYSTEM/docs/ADMISSIBILITY_GATES_AND_NEGATIVE_CONTROLS.md), [BRIDGE_TO_PHENOMENALITY_PREREQUISITES.md](file:///c:/Users/irisp/OneDrive/Escritorio/QICN-SYSTEM/docs/BRIDGE_TO_PHENOMENALITY_PREREQUISITES.md).

6. **Post-Live-Audit Hardening Pass**:
   - Unified clause-negation guard into `isClauseNegated` & `isExternalValidationOverclaim` in [epistemicPolicy.js](file:///c:/Users/irisp/OneDrive/Escritorio/QICN-SYSTEM/src/language/evidential/epistemicPolicy.js) (shared with [factualVerifier.js](file:///c:/Users/irisp/OneDrive/Escritorio/QICN-SYSTEM/src/language/evidential/factualVerifier.js)), blocking adversative `"sin embargo"` and false-negation ruses (`"sin duda"`, `"no cabe duda"`, `"no solo"`) across anti-certification, external-validation (including copula forms `"está confirmada"`), and B2 promotion checks while permitting valid negated clauses (`qualia_certified` inside negated clauses, `"ninguna"`, `"sin un puente..."`) and avoiding false negation matches on `"falta"`.
   - Updated [reasoningPlan.js](file:///c:/Users/irisp/OneDrive/Escritorio/QICN-SYSTEM/src/language/evidential/reasoningPlan.js) to remove the raw `qualia_certified` flag literal from prompt instructions, instruct nearest-decimal rounding rather than truncation, and avoid raw internal slug tokens in prose.
   - Added `postura` / `alcance` matching under `limits_claims` in [intentResolver.js](file:///c:/Users/irisp/OneDrive/Escritorio/QICN-SYSTEM/src/language/intentResolver.js).
   - Synchronized [BRIDGE_TO_PHENOMENALITY_PREREQUISITES.md](file:///c:/Users/irisp/OneDrive/Escritorio/QICN-SYSTEM/docs/BRIDGE_TO_PHENOMENALITY_PREREQUISITES.md) from `qicn-framework-ordenado` (`codex/fase-cientifica-atomic-puente` commit `361f792`) with explicit `claim_scope`, `evidence_scope`, and `interpretation_boundary` headers.

## 2. Frozen Files & Repository Boundaries Preserved

- Zero edits in `C:\Users\irisp\OneDrive\Escritorio\qicn-framework-ordenado`, `docs/visual-evidence/`, `artifacts/`, `scripts/ecosystem-release-common.cjs`, and all 9 compatibility-frozen files enforced by `tests/language-system-b-compatibility.v1.test.mjs`.
- API default (`prepareTurn() === 'verified'`), `CHAT_THINKING_LEVEL = 'high'`, `CHAT_MAX_OUTPUT_TOKENS = 65536`, `v2`/`v3` (87)/`v4` (95), `cn4_maxAbsDiff = 0`, `observerChannelChangesTrajectory = false`, `evidence_scope = "internal_support_only"`, and `external_support_certified = false` remain intact.

## 3. Verification Matrix & Non-Claims

All build, lint, inventory, source-of-truth, descriptor registry, boundary, policy, tower math, local-only bridge, operational readiness, smoke, comparative closure, scoreboard, full-cycle language ablation, state-restore equivalence, workbench paired intervention, historical dependence ablation, and full test suite checks run after the final file write with mutable outputs routed exclusively to `$env:TEMP`. Passing internal engineering verification does not constitute external validation or theoretical closure; browser live-LLM behavior requires interactive evaluation on the local sandbox server.

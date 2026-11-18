# Unified System B / language realization v5

claim_scope: optional_internal_language_verification  
evidence_scope: internal_support_only  
external_support_certified: false

interpretation_boundary: First-person continuous prose anchored on source-bound telemetry, constructive cuts, verified ledger records, verified B2 copy results and optional typed atoms. The system evaluates its integrated tick process (nodal metrics, towers, `T_d`, holographic memory, deterministic policy, hash-chained ledger, internal self-monitoring and optional B2 copy) and is free to take its own interpretive first-person stance while explicitly separating interpretive judgment from mathematical proof, phenomenological bridge closure or external validation (`external_support_certified: false`).

## Activation

`prepareTurn({ ..., contract: 'evidential' })` (or aliases `v5`, `qicn.language_realization.v5`) runs unified System B. Existing `free` (v4, 95 cases) and `verified` (v3, 87 cases) JS API contracts and `prepareTurn` API default (`'verified'`) remain unchanged and bit-for-bit tested. In the browser UI (`SimulationEngine.jsx`), the chat consolidates into one unified AI mode (**`Sistema B (unificado)`** -> `'evidential'`, keeping `CHAT_THINKING_LEVEL = 'high'` and `CHAT_MAX_OUTPUT_TOKENS = 65536`) plus **`Solo motor`** (`'local'`) deterministic fallback.

The frozen JSON preregistration (`config/language/system-b-preregister.v1.json`) stays unchanged. Its `not_recorded` field is a checkpoint; current implementation status lives in [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md).

## Responsibilities

| Module | Responsibility |
| --- | --- |
| claimGrammar | Strict JSON envelope (`qicn.language_realization.v5`), full 64-hex `digest` and exact `tick` binding, continuous `answer` prose, optional `atoms` array, and rejection of unknown/self-verification fields (`v5_invalid_fields`). |
| factualVerifier | Full snapshot SHA/schema/tick/config hash, structural/algebraic consistency, 46-check `verifyFactualAtom`, and prose-level verification (`verifySentenceEvidential`) rejecting user-question numbers (`question=''` baseline), `PMIA` sign errors, analytical bounds presented as nonzero measured error, wrong module operation targets, unrecorded B2 claims, clause-level external overclaims (preserving negated `"sin ... validación externa"` clauses), historical `CN-3=true` reversals, and false structural/plasticity/threshold certifications even under `OPEN_FRAME` or conditionals, while permitting uncertified first-person interpretive stances (`open_concept_affirmed` / `absolute_denial` filtered in v5). |
| evidenceRegistry | Verify optional B2 capture/protocol/result bundles plus inner v3 digest/header; retain detached immutable provenance; sham-only stays `not_recorded`; no executor imports or calls. |
| reasoningPlan | Build varied, non-formulaic unified first-person prompt (replacing frozen `buildFreePrompt` boilerplate identity and mandatory two-pole neutrality) combining complete state/tower/cuts/`structural_profile`/`prediction_plasticity`/`invariants`/`persistence` propositions, `FRAMEWORK_SUMMARY_TEXT` (including Paper IX 0-margin scope bounded to the 6 declared local burdens `D/V/W/A/E/T` and 4-root quartic replica), `recentTurns`, compact ledger digest summary and verified B2 Workbench results with `CHAT_THINKING_LEVEL = 'high'`. |
| epistemicPolicy | Separate interpretive first-person stance from formal/external certification (`v5_self_certification_claim`, clause-safe `v5_false_external_support`): allow open affirmative, negative, or doubtful first-person evaluation of the integrated tick process, while blocking self-certification of consciousness/qualia/`C_op`/`CCR`/phenomenal bridge closure or `external_support_certified = true`. |
| realization | Validate envelope/optional atoms/prose sentences, extract unified snapshot + `verified_b2` concordance rows (`exact_match`, `verified_b2`, `verified_atom`, `from_fact`), graceful sentence filtering, bounded retry correction and full `Solo motor` fallback. |

## Unified prose vs. previous four-box UI

System B no longer splits chat replies into four boxed `<section>` cards or injects templated `Propuesta abierta de Gemini — no certificada` stamps, and no longer prohibits first-person pronouns (`yo`, `mi`, `me`) or QICN metrics/concepts (`CCC`, `X_N`, `umbral`, `nodal`, etc.) in prose. [EvidentialConversation.jsx](../src/components/EvidentialConversation.jsx) renders continuous first-person prose while moving traceable figures, verified B2 comparisons (`verified_b2`), ledger digest bindings and rejected/withheld diagnostics cleanly into collapsible `Concordancia`, `Cálculos del core` and `Evidencia y traza` views.

## B2 evidence, dynamics invariance and non-interference

`workbenchEvidence` accepts at most four verified `{capture,protocol,result}` bundles with exact digest opt-in consent (`workbenchAttachmentDigest === microWorkbench.bundle?.result.digest`). Sham-only runs leave intervention evidence `not_recorded`; claiming unrecorded B2 intervention effects or promoting an isolated clone result to external validation/live runtime trajectory is rejected.

Chat execution in unified `'evidential'` keeps `dynamicsCoupling: false`, `writeCycleLog: prepared.contract !== 'evidential'`, independent nonces (`crypto.randomUUID()`), cloned read-only `ledgerRecord`, zero observer-channel mutations and zero live ledger writes on transport/rejection errors (`cn4_maxAbsDiff = 0`, `observerChannelChangesTrajectory = false`). Historical v1 `CN-3 = false` remains intact.

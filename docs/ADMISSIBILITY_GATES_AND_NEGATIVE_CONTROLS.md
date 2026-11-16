# Admissibility Gates And Negative Controls

## 1. Purpose

This document formalizes the current repository architecture for admissibility gates and negative controls. It is documentary only. It describes the real filter layers, artifacts, outputs, tests, and dependencies already present in the repository.

It is intended to answer:

- what makes a run admissible, discarded, or tampered
- what batch-level enforcement exists after run admissibility
- what negative controls exist and what they are expected to falsify
- which modules, artifacts, and tests anchor each layer
- what remains open, external, or interpretation-dependent

## 2. Limits Of This Phase

This document does not:

- provide external validation
- close canonical claim status
- replace tests
- replace [DESCRIPTOR_REGISTRY.md](DESCRIPTOR_REGISTRY.md)
- replace [TRACEABILITY_MATRIX.md](TRACEABILITY_MATRIX.md)
- replace [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)
- change runtime behavior, endpoint contracts, or batch logic

The document records repository-local enforcement only.

## 3. Minimal Taxonomy

### `run_gate`

A run-level check applied by [AdmissibilityEngine.js](../src/experiments/AdmissibilityEngine.js) to a single artifact directory before a run is accepted into later layers.

### `batch_gate`

A batch-level enforcement layer applied after per-run admissibility, using batch outputs such as SNO, ROEO, and negative controls.

### `gate_result`

A closed decision output produced by a run-level or batch-level gate.

Real examples:

- `run_verdict.json.status`: `ADMISSIBLE`, `DISCARDED`, `TAMPERED`
- `roeo_enforcement_report.json.batch_status`: `PAPER_ADMISSIBLE`, `NOT_PAPER_ADMISSIBLE`

### `negative_control`

A falsifier-oriented batch control defined in [negative_controls_runner.js](../src/experiments/negative_controls_runner.js) and evaluated against batch artifacts and preregistered expectations.

### `primary_artifact`

An artifact used as the authoritative input or output of a gate layer.

Run-level primary artifacts:

- `run_header.json`
- `ticks.ndjson`
- `run_summary.json`
- `run_verdict.json`

Batch-level primary artifacts:

- `operational_equivalence.json`
- `sno_report.json`
- `negative_controls_report.json`
- `roeo_enforcement_report.json`

### `derived_artifact`

An artifact emitted from earlier layers for later interpretation or mapping, but not itself a raw runtime record.

Examples:

- `admissibility.json`
- `invariant_package.json`
- `claim_mapping_snapshot.json`
- `runtime_claim_projection.json`
- `eo_report.json`

### `external_dependency`

A dependency whose authority is not closed inside the repository.

### `prereg_dependency`

A dependency on `config/` prereg-style inputs, especially `config/roeo/*.json` and `config/interventions/*.json`.

### `frozen_canon_dependency`

A dependency on the external canonical repository or claim-ledger boundary documented in [CANON_SOURCE_OF_TRUTH.md](CANON_SOURCE_OF_TRUTH.md).

Normalization used below:

- `Evidence scope`: `runtime_primary`, `runtime_derived`, `batch_primary`, `batch_derived`, `mixed`, `external_frozen`
- `External dependency`: `none`, `prereg_config`, `frozen_canon`, `external_service`, `legacy_input`, `human_interpretation_required`, `mixed`

## 4. Architecture Of Admissibility Gates

The repository contains at least three distinct layers:

### A. Run-Level Admissibility

Implemented in [AdmissibilityEngine.js](../src/experiments/AdmissibilityEngine.js).

Inputs:

- `run_header.json`
- `ticks.ndjson`
- `run_summary.json`
- `schema/run_record.v1.json`

Primary output:

- `run_verdict.json`

Derived outputs emitted in the same flow:

- `invariant_package.json`
- `claim_mapping_snapshot.json`
- `full_native_invariant_status.json`
- `claim_closure_runtime_diagnostics.json`
- `runtime_claim_projection.json`
- `release_materialization_map.json`
- `p5_03_threshold_runtime.json`

Closed status values:

- `ADMISSIBLE`
- `DISCARDED`
- `TAMPERED`

### B. Batch-Level Enforcement

Implemented in [negative_controls_runner.js](../src/experiments/negative_controls_runner.js), with dependencies on [sno_discriminator.js](../src/experiments/sno_discriminator.js) and [roeo_signature.js](../src/experiments/roeo_signature.js).

Inputs:

- `sno_report.json`
- `negative_controls_report.json`
- leak-batch `sno_report.json`
- prereg thresholds in `config/roeo/*.json`

Primary output:

- `roeo_enforcement_report.json`

Closed status values:

- `PAPER_ADMISSIBLE`
- `NOT_PAPER_ADMISSIBLE`

### C. Paper-Level Admissibility Or Equivalent Real

The repo does not expose a separate higher-level verdict object beyond `roeo_enforcement_report.json.batch_status`. In practice, `PAPER_ADMISSIBLE` is the highest explicit admissibility state currently implemented.

For documentary stability, refer to this layer as `paper_level_equivalent_status`. Keep `roeo_enforcement_report.json.batch_status` as the emitted field name and `PAPER_ADMISSIBLE` / `NOT_PAPER_ADMISSIBLE` as the real values.

This state is consumed by repository tooling such as:

- [build_paper_pdf_lib.js](../scripts/build_paper_pdf_lib.js)
- [latex_asset_generator_roeo.js](../src/experiments/latex_asset_generator_roeo.js)

This is still internal batch enforcement. It is not external validation and not canonical closure.

## 5. Admissibility Gates Ledger

| ID | Layer | Gate / family | Purpose | Primary module | Primary artifacts | Config / prereg dependency | Primary test anchors | Output states | Evidence scope | External dependency | Non-claim boundary | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `RG_schema_record_integrity` | `run_level_admissibility` | `schema_and_record_integrity` | Reject malformed records, parse failures, undeclared strict extras, invalid BaseCore §06 `runtime_use_admissibility` declarations, missing lines, and broken tick continuity. | `src/experiments/AdmissibilityEngine.js` | `run_header.json`, `ticks.ndjson`, `run_summary.json`, `schema/run_record.v1.json`, `run_verdict.json` | `none` | `tests/admissibility-exporter.v1.test.js`, `tests/run-episode-admissibility.v58.test.js` | `ADMISSIBLE`, `DISCARDED` | `mixed` | `none` | Passing record integrity does not imply scientific relevance or batch admissibility. | Real discard reasons include `DSC_SCHEMA_VIOLATION`, `DSC_MISSING_LINES`, and `DSC_RUNTIME_USE_ADMISSIBILITY_INVALID`. |
| `RG_config_hash_integrity` | `run_level_admissibility` | `config_and_hash_integrity` | Detect drift between header hashes and per-tick hashes. | `src/experiments/AdmissibilityEngine.js` | `run_header.json`, `ticks.ndjson`, `run_summary.json`, `run_verdict.json` | `none` | `tests/admissibility-exporter.v1.test.js` | `ADMISSIBLE`, `TAMPERED` | `mixed` | `none` | Hash consistency is an integrity requirement, not claim support. | Real tamper reason: `TMP_HASH_DRIFT`. |
| `RG_integrity_envelope` | `run_level_admissibility` | `integrity_envelope` | Detect broken C2 echoes, missing integrity fields, and nonce replay. | `src/experiments/AdmissibilityEngine.js` | `ticks.ndjson`, `run_verdict.json` | `none` | `tests/admissibility-exporter.v1.test.js`, `tests/integrity-c2-proxy.v56.test.js` | `ADMISSIBLE`, `TAMPERED` | `mixed` | `none` | Envelope integrity is operational hygiene only. | Real tamper reasons: `TMP_C2_MISMATCH`, `TMP_NONCE_REPLAY`. |
| `RG_prereg_schedule_integrity` | `run_level_admissibility` | `prereg_and_schedule_integrity` | Detect mismatch between header prereg/schedule hashes and intervention params. | `src/experiments/AdmissibilityEngine.js` | `run_header.json`, `ticks.ndjson`, `run_verdict.json` | `config/interventions/*.json`, `config/roeo/*.json` | `tests/interventions.v1.test.js`, `tests/admissibility-exporter.v1.test.js` | `ADMISSIBLE`, `TAMPERED` | `mixed` | `prereg_config` | Matching prereg hashes does not imply external prereg registration or scientific closure. | Real tamper reason: `TMP_SCHEDULE_HASH_DRIFT`. |
| `RG_runtime_hygiene` | `run_level_admissibility` | `runtime_hygiene` | Reject IO partials, tick-budget overruns, hard-cap overruns, or count mismatches. | `src/experiments/AdmissibilityEngine.js` | `run_summary.json`, `ticks.ndjson`, `run_verdict.json` | `none` | `tests/run-episode-admissibility.v58.test.js` | `ADMISSIBLE`, `DISCARDED` | `mixed` | `none` | Hygiene pass does not imply paper-level admissibility. | Real discard reasons: `DSC_IO_PARTIAL`, `DSC_TICK_BUDGET_P95`, `DSC_TICK_HARD_CAP`, `DSC_MISSING_LINES`. |
| `RG_flake_exclusion` | `run_level_admissibility` | `flake_exclusion` | Reject runs whose rerun statuses disagree under flake checks. | `src/experiments/AdmissibilityEngine.js` | `run_verdict.json` | `none` | `tests/admissibility-exporter.v1.test.js` | `ADMISSIBLE`, `DISCARDED` | `runtime_derived` | `none` | Reliability filtering is not evidence of correctness or truth. | Real discard reason: `DSC_FLAKY_TESTS`. |
| `RG_run_verdict` | `run_level_admissibility` | `run_verdict_synthesis` | Synthesize run-level outcome from tamper and discard reasons. | `src/experiments/AdmissibilityEngine.js` | `run_verdict.json` | `none` | `tests/admissibility-exporter.v1.test.js`, `tests/run-episode-admissibility.v58.test.js` | `ADMISSIBLE`, `DISCARDED`, `TAMPERED` | `runtime_derived` | `none` | `ADMISSIBLE` does not imply `PAPER_ADMISSIBLE` or external validation. | This is the decisive run-level gate result. |
| `BG_admissible_run_filter_for_roeo_sno` | `batch_level_enforcement` | `admissible_run_filter` | Exclude non-admissible runs from ROEO and SNO batch paths. | `src/experiments/roeo_signature.js`, `src/experiments/sno_discriminator.js` | `run_verdict.json`, `eo_report.json`, `operational_equivalence.json`, `sno_report.json` | `config/roeo/*.json` | `tests/roeo.v1.test.js`, `tests/sno.v1.test.js` | `EVALUABLE`, `NOT_EVALUABLE`, `ADMISSIBLE`-filtered inclusion | `mixed` | `prereg_config` | Batch evaluability is not paper admissibility. | Real ROEO non-admissible reason: `NON_ADMISSIBLE_RUN`. |
| `BG_sno_identifiability_enforcement` | `batch_level_enforcement` | `sno_enforcement` | Require class balance and non-identifiability under prereg thresholds. | `src/experiments/negative_controls_runner.js`, `src/experiments/sno_discriminator.js` | `sno_report.json`, `roeo_enforcement_report.json` | `config/roeo/*.json` | `tests/sno.v1.test.js`, `tests/roeo_enforcement.v1.test.js` | `PAPER_ADMISSIBLE`, `NOT_PAPER_ADMISSIBLE` | `batch_derived` | `prereg_config` | Passing SNO constraints does not imply substrate equivalence or scientific closure. | Real failure reasons: `MISSING_SNO_REPORT`, `MISSING_SNO_LEAK_REPORT`, `INSUFFICIENT_N`, `SNO_IDENTIFIABLE`. |
| `BG_negative_controls_enforcement` | `batch_level_enforcement` | `negative_controls_enforcement` | Require the negative-controls report to exist and satisfy prereg expectations. | `src/experiments/negative_controls_runner.js` | `negative_controls_report.json`, `roeo_enforcement_report.json` | `config/roeo/*.json` | `tests/negative-controls.v1.test.js`, `tests/roeo_enforcement.v1.test.js` | `PAPER_ADMISSIBLE`, `NOT_PAPER_ADMISSIBLE` | `batch_derived` | `prereg_config` | Passing negative controls does not equal external falsification of alternatives. | Real failure reasons: `MISSING_NEGATIVE_CONTROLS`, `NC1_FAILED_EXPECTATION`, `NC2_FAILED_EXPECTATION`, `NC3_FAILED_EXPECTATION`, `NC4_FAILED_EXPECTATION`. |
| `BG_paper_admissibility_equivalent` | `paper_level_equivalent` | `roeo_enforcement_batch_status` | Provide the highest explicit admissibility state currently implemented in the repo. | `src/experiments/negative_controls_runner.js`, `scripts/build_paper_pdf_lib.js` | `roeo_enforcement_report.json` | `config/roeo/*.json` | `tests/roeo_enforcement.v1.test.js`, `tests/exporter_roeo.v1.test.js` | `PAPER_ADMISSIBLE`, `NOT_PAPER_ADMISSIBLE` | `batch_derived` | `prereg_config` | This is internal batch admissibility, not external validation or canonical closure. | Used as the gating condition for downstream paper-oriented export tooling. |

## 6. Architecture Of Negative Controls

Negative controls are implemented in [negative_controls_runner.js](../src/experiments/negative_controls_runner.js). They operate over batch artifacts and preregistered expectations, not over raw runtime alone.

Primary batch inputs:

- `operational_equivalence.json`
- clean `sno_report.json`
- leak-batch `sno_report.json`
- `eo_report.json` from admissible runs
- `ticks.ndjson` from admissible runs
- prereg data in `config/roeo/*.json`

Primary batch output:

- `negative_controls_report.json`

Real controls currently implemented:

- `NC1_time_permutation`
- `NC2_self_noise_or_shift`
- `NC3_placebo` (now a bounded hash placebo surrogate, not a fixed-zero placeholder)
- `NC4_leak_feature`
- `NC5_spectral_decay_falsification` (expanded helper via `runSpectralDecayControl`)
- `NC6_inverse_limit_rupture` (expanded helper via `runInverseLimitRuptureControl`)
- `NC7_trivial_topology` (expanded helper via `runTrivialTopologyControl`)
- `NC8_null_regime_instability` (expanded helper via `runNullRegimeInstabilityControl`)
- `NC9_degree_partition_factorization` (expanded helper via `runDegreePartitionFactorizationControl`)
- `NC10_coherence_partition_factorization` (expanded helper via `runCoherencePartitionFactorizationControl`)
- `NC11_random_balanced_factorization` (expanded helper via `runRandomBalancedFactorizationControl`)
- `NC12_community_partition_factorization` (expanded helper via `runCommunityPartitionFactorizationControl`)
- `NC8_adversarial_drift` (planning helper via `runAdversarialDriftControl`)

Legacy planning helpers remain exported for continuity: `runPlaceboSurrogateControl`, `runAntiFreezeAblation`, and `runMetricShuffleControl`. They are not the NC5-NC12 hardening targets introduced by the convergence plans.

## 7. Negative Controls Ledger

| ID | Control | Purpose / falsifier target | Primary module | Primary artifacts | Config / prereg dependency | Primary test anchors | Failure reasons | Expected degradation or expected null effect | Evidence scope | External dependency | Non-claim boundary | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `NC1` | `NC1_time_permutation` | Test whether temporal structure matters by permuting a selected series and expecting degradation or ROEO failure. | `src/experiments/negative_controls_runner.js` | `ticks.ndjson`, `operational_equivalence.json`, `negative_controls_report.json` | `config/roeo/*.json` | `tests/negative-controls.v1.test.js`, `tests/roeo_enforcement.v1.test.js` | `NC1_FAILED_EXPECTATION` | Expected condition is `effect_min_or_ro_fail`; observed effect should clear prereg minimum or force ROEO non-equivalence. | `batch_primary` | `prereg_config` | Passing NC1 does not externally prove causal specificity. | Real candidate series are `metrics.omega`, `observability.wm_pred_error`, `observability.planner_cost`, `metrics.ccc`. |
| `NC2` | `NC2_self_noise_or_shift` | Test whether adding deterministic self-noise or shift produces the expected effect magnitude. | `src/experiments/negative_controls_runner.js` | `eo_report.json`, `negative_controls_report.json` | `config/roeo/*.json` | `tests/negative-controls.v1.test.js`, `tests/roeo_enforcement.v1.test.js` | `NC2_FAILED_EXPECTATION` | Expected condition is `effect_min`; observed effect should exceed prereg minimum. | `batch_primary` | `prereg_config` | Passing NC2 does not imply robust falsification of all confounds. | Uses `SUBJ` values from EO signatures. |
| `NC3` | `NC3_placebo` | Test whether a bounded placebo surrogate stays near null effect. | `src/experiments/negative_controls_runner.js` | `negative_controls_report.json` | `config/roeo/*.json` | `tests/negative-controls.v1.test.js`, `tests/negative-controls-nc3-placebo.v2.test.js`, `tests/roeo_enforcement.v1.test.js` | `NC3_FAILED_EXPECTATION` | Expected condition is `abs_effect_le_tau`; observed absolute effect is computed from a deterministic bounded hash placebo surrogate and should remain below prereg placebo tolerance. | `batch_primary` | `prereg_config` | Passing NC3 does not validate the full theory, only this bounded placebo expectation. | Current implementation reports `method=bounded_hash_placebo_surrogate`, per-run placebo samples, `placebo_jitter_max`, and non-zero placebo deltas when `tau_placebo` permits them. |
| `NC4` | `NC4_leak_feature` | Test whether leak-oriented features become identifiable above the prereg threshold in the leak batch. | `src/experiments/negative_controls_runner.js`, `src/experiments/sno_discriminator.js` | leak `sno_report.json`, `negative_controls_report.json` | `config/roeo/*.json` | `tests/negative-controls.v1.test.js`, `tests/roeo_enforcement.v1.test.js`, `tests/sno.v1.test.js` | `NC4_FAILED_EXPECTATION` | Expected condition is `acc_ge_threshold`; leak-batch strict accuracy should exceed the prereg leak threshold. | `batch_primary` | `prereg_config` | Passing NC4 does not make the clean batch scientifically valid by itself. | This is a leak sanity control, not a runtime-primary measurement. |
| `NC5` | `NC5_spectral_decay_falsification` | Test whether exponential decay falsifies persistent dominant spectral mode. | `src/experiments/negative_controls_expanded.js` | none | none | `tests/negative-controls-expanded.v1.test.js`, `tests/spectral-falsification.test.js` | none | Expected condition is `lambda_1 < 0.9` and `dominant_mode = DOMINANT_MODE_DECAY`. | `standalone_helper_mixed_or_synthetic` | `none` | Passing NC5 does not externally validate the spectral estimator; it only verifies an internal falsification route. | Uses `PhenomenologyCore` on a deterministic decay sequence. |
| `NC6` | `NC6_inverse_limit_rupture` | Test whether chaotic adjacent-state perturbations break finite projection morphisms. | `src/experiments/negative_controls_expanded.js`, `src/canon/finite_horizon/FiniteProjectionEvaluator.js` | none | none | `tests/negative-controls-expanded.v1.test.js`, `tests/inverse-limit.test.js` | none | Expected condition is `inverse_limit_score < 0.20` and lower `I_ri` than stable baseline. | `standalone_helper_mixed_or_synthetic` | `none` | Passing NC6 does not prove a full inverse-limit theorem; it verifies a finite-window rupture route. | Uses deterministic chaotic alternation over the six inverse-limit components. |
| `NC7` | `NC7_trivial_topology` | Test whether a monotone linear trajectory is rejected as topologically trivial. | `src/experiments/negative_controls_expanded.js`, `src/simulation/PhenomenologyCore.js` | none | none | `tests/negative-controls-expanded.v1.test.js`, `tests/winding-topology.test.js` | none | Expected condition is `winding_integer = 0`, `winding_orientation = trivial`, and Omega near 0. | `standalone_helper_mixed_or_synthetic` | `none` | Passing NC7 does not prove global topological classification; it blocks a false positive on monotone paths. | Monotone derivative sign without oscillation is not counted as a topological cycle. |
| `NC8` | `NC8_null_regime_instability` | Test whether an artificially null state escapes the null regime instead of becoming an asymptotically stable attractor. | `src/experiments/negative_controls_expanded.js` | none | none | `tests/negative-controls-expanded.v1.test.js`, `tests/null-regime-instability.test.js` | none | Expected condition is escape with `ccc > 0.1`, `beth_q > 0.1`, and `omega > 0.1` in `<= 20` ticks. | `standalone_helper_mixed_or_synthetic` | `none` | Passing NC8 does not prove global instability of the null regime; it verifies an internal runtime falsification route. | Deterministic fallback trajectory is used when no controller is injected. |
| `NC9` | `NC9_degree_partition_factorization` | Test whether high-degree or low-degree node partitions preserve full-system baseline metrics. | `src/experiments/negative_controls_expanded.js`, `src/experiments/NonFactorizationProver.js` | none | none | `tests/non-factorization.test.js` | none | Expected condition is `factorizations_found = 0` for the degree partition. | `standalone_helper_mixed_or_synthetic` | `none` | Passing NC9 does not prove non-factorizability over all partitions; it rejects this finite candidate family. | Compares isolated-block CCC, beth_q, and omega against the baseline with a 10 percent envelope. |
| `NC10` | `NC10_coherence_partition_factorization` | Test whether high-coherence or low-coherence partitions preserve full-system baseline metrics. | `src/experiments/negative_controls_expanded.js`, `src/experiments/NonFactorizationProver.js` | none | none | `tests/non-factorization.test.js` | none | Expected condition is `factorizations_found = 0` for the coherence partition. | `standalone_helper_mixed_or_synthetic` | `none` | Passing NC10 does not prove non-factorizability over all partitions; it rejects this finite candidate family. | Coherence is derived from real node fields when present and deterministic fallback fields otherwise. |
| `NC11` | `NC11_random_balanced_factorization` | Test whether a deterministic random balanced split preserves full-system baseline metrics. | `src/experiments/negative_controls_expanded.js`, `src/experiments/NonFactorizationProver.js` | none | none | `tests/non-factorization.test.js` | none | Expected condition is `factorizations_found = 0` for the seeded balanced partition. | `standalone_helper_mixed_or_synthetic` | `none` | Passing NC11 does not prove non-factorizability over all random seeds or partitions. | Seeded partitioning keeps the control reproducible. |
| `NC12` | `NC12_community_partition_factorization` | Test whether community-style partitions preserve full-system baseline metrics. | `src/experiments/negative_controls_expanded.js`, `src/experiments/NonFactorizationProver.js` | none | none | `tests/non-factorization.test.js` | none | Expected condition is `factorizations_found = 0` for the community partition. | `standalone_helper_mixed_or_synthetic` | `none` | Passing NC12 does not prove exhaustive spectral/community non-factorizability. | Community labels are consumed when available and deterministic spectral-style fallback labels are used otherwise. |
| `NC8` | `NC8_adversarial_drift` | Planning helper for adversarial drift control that injects blind-mode drift. | `src/experiments/negative_controls_expanded.js` | none | `config/roeo/*.json` | `tests/negative-controls-expanded.v1.test.js` | none | Expected condition is drift mode preserved and max_abs_delta bounded by amplitude. | `standalone_helper_mixed_or_synthetic` | `prereg_config` | Passing NC8 does not prove robustness against all adversarial inputs. | Blind-mode drift injection with bounded amplitude. |

## 8. Artifact Roles

Run-level primary evidence:

- `run_header.json`
- `ticks.ndjson`
- `run_summary.json`
- `run_verdict.json`

Run-level derived artifacts:

- `admissibility.json`
- `invariant_package.json`
- `claim_mapping_snapshot.json`
- `runtime_claim_projection.json`
- `claim_closure_runtime_diagnostics.json`

Batch-level primary evidence:

- `sno_report.json`
- `operational_equivalence.json`
- `negative_controls_report.json`
- `roeo_enforcement_report.json`

Batch-level derived artifacts:

- `eo_report.json`
- paper-export helper outputs such as `tables.tex` and `figures_data.json`

Rule:

- Batch artifacts must not be read as runtime-primary evidence.

## 9. Relation To Existing Documents

- [AGENTS.md](../AGENTS.md) is the operating guide and vocabulary contract for the repo.
- [TRACEABILITY_MATRIX.md](TRACEABILITY_MATRIX.md) maps claims, invariants, batch controls, modules, tests, and artifacts.
- [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) records area-level and layer-level implementation state.
- [DESCRIPTOR_REGISTRY.md](DESCRIPTOR_REGISTRY.md) inventories observational, derived, claim-facing, and gate-facing pieces.
- [descriptor_registry.v1.json](descriptor_registry.v1.json) and [validate-descriptor-registry.cjs](../scripts/validate-descriptor-registry.cjs) provide the machine-validable minimum registry layer.
- [CANON_SOURCE_OF_TRUTH.md](CANON_SOURCE_OF_TRUTH.md) records the external formal boundary and unresolved canon pin.

Role separation:

- `TRACEABILITY_MATRIX` explains how evidence relates to claims.
- `IMPLEMENTATION_STATUS` explains what exists by area and layer.
- `DESCRIPTOR_REGISTRY` explains what pieces exist and how they are classified, including the distinction between `descriptor`, `claim_projection`, `gate_result`, and `artifact_only`.
- `ADMISSIBILITY_GATES_AND_NEGATIVE_CONTROLS` explains how filtering and internal falsation architecture work.
- `CANON_SOURCE_OF_TRUTH` explains what remains formally external.

## 10. What Must Not Be Inferred

- `ADMISSIBLE` does not imply `PAPER_ADMISSIBLE`.
- `PAPER_ADMISSIBLE` does not imply external validation.
- Passing negative controls does not imply scientific closure.
- Batch outputs must not be read as runtime-primary evidence.
- `claim_projection` must not be collapsed into `gate_result`.
- `run_verdict` must not be collapsed into batch enforcement.
- Canon-dependent interpretation remains open while the external canon pin is unresolved.
- Operational policy and external-service posture remain open while the relevant surfaces are not fully closed.

## 11. Open Gaps

- There is no separate paper-level object beyond `roeo_enforcement_report.json.batch_status`; the current repo uses that as the highest explicit admissibility state.
- `admissibility.json` exists as a harness-side pre-verdict output with `PENDING_PR6C`, but it is not the authoritative run verdict and should not be confused with [AdmissibilityEngine.js](../src/experiments/AdmissibilityEngine.js) output.
- Canon pinning remains unresolved in [CANON_SOURCE_OF_TRUTH.md](CANON_SOURCE_OF_TRUTH.md).
- Some later consumers, such as paper-export scripts, remain dependent on batch outputs and prereg inputs rather than on a stronger formal registry layer.
- External-service and asset dependencies remain open.

## 12. Next Phase Preparation

This document prepares, but does not implement:

- stronger formalization of run gates
- stronger formalization of batch enforcement
- tighter integration with [DESCRIPTOR_REGISTRY.md](DESCRIPTOR_REGISTRY.md)
- tighter linkage between gates and claim projections
- cleaner direct-evidence versus proxy-evidence separation
- better canonical pinning

No such implementation is performed in this phase.

## 2026-11-05: invariant package v7 boundary

`invariant_package.json` is derived, not a primary run or batch artifact. In v7, default-graph factorization and synthetic L1-L6 controls are not evidence of this run, and simulated persistence trials are not a recorded runtime certificate. Missing I_per/I_int/I_leg certificate fields are null. Scores and downstream claim projections can change; run verdict and batch enforcement algorithms are not redefined. Existing v6 artifacts are historical and must not be silently relabeled.

P5-05 mapping correction: the run-level claim projection does not consume batch negative-control, ROEO, or SNO reports. It reports `PARTIAL_RUNTIME_PATH` and `INSUFFICIENT_FOR_CLAIM_CLOSING`; the independent batch gate remains a separate surface.

Finite-projection correction: missing or partially missing comparisons return `evidence_status: not_recorded`, `error: null`, and `pass: false`. A missing component in an adjacent-state comparison is not equivalent to the numeric value zero. With insufficient states or components, the finite inverse-limit score is `null`, and NC6 cannot pass on that absence. This is a bounded comparison policy, not a decision about an infinite inverse limit.

Boundary runtime v8 emits an empty family and `not_recorded` cleanliness when no complete invariant window is available. P5-03 threshold runtime v5 leaves profiles and crossing offsets unavailable unless all six invariant scores carry `complete_recorded` evidence. Current runtime composites emit only `not_recorded` or `partial_recorded`, so these closure-oriented analyses intentionally remain unavailable until the full evidence path is implemented. Explicit `complete_recorded` fixture inputs exercise the calculation in isolation; they do not validate the runtime or prove the formal criteria.

External evidence boundary: caller-supplied boundary results and substrate pair families are not promoted by runtime claim mapping until their provenance, integrity and applicability are verified. This does not alter independently generated batch artifacts or their gates.

The standalone legibility helper rejects empty intervention sets, untrained decoders, missing assignment labels, malformed intervention observations, and duplicate control IDs as sufficient evidence. This improves fixture behavior but does not make a standalone fixture into a run-level L1–L6 certificate.

NC5–NC12 and planning helpers are standalone functions; absent injected inputs, several construct synthetic traces or graphs. Their outputs do not automatically enter `negative_controls_report.json` or the NC1–NC4 batch gate and are not batch-primary artifacts.

## 2026-11-08: chat language contract v3 is not an admissibility gate

The realization contract (`src/language/realizationContract.js`) decides whether a Gemini-written chat answer is published. Its outcomes (`gemini_verified`, `gemini_rejected`, `gemini_unavailable`, `local_narrator`) are chat routes, not `run_verdict` or `batch_status` values, and must not be read as `gate_result`. The chat call uses `dynamicsCoupling:false`, so its latency stays out of the metacognitive strain. The full-cycle ablation (`docs/evidence/2026-11-08/full_cycle_language_ablation.json`) is a non-interference check for this channel, not a negative control in the NC1–NC12 family. No run-level or batch-level gate semantics changed.

## B1-B2 isolated micro-experiment controls

Workbench engineering controls are distinct from NC1-NC12 and from run-level admissibility/batch_enforcement. COMPLETED only means a detached execution finished with a verified record chain; it does not mean ADMISSIBLE or PAPER_ADMISSIBLE. All workbench records remain evidence_scope internal_support_only, external_support_certified=false, and artifact_only with respect to the live runtime. Existing harness, run_verdict.json and roeo_enforcement_report.json contracts are unchanged.

Mandatory engineering controls cover sham identity, both state-leak directions, reference ownership, global capability traps, controller aliases, full restore continuation, build/tick/protocol mismatches, chain tampering/truncation/reordering, cancellation/timeout, numeric sensitivity and language invariance. Explicit history controls distinguish selector read-blocking, consolidation suspension, predictor freeze and one-time declared reset. Their scopes do not retroactively redefine CN-3 of historical v1. The unchanged 420/180/250 v1 acceptance remains able to report CN-3=false; no threshold changes or held-out seed selection are authorized by Workbench success.

See WORKBENCH_EXECUTION_CONTRACT.md and tests/workbench-*.v1.test.mjs. The legacy nested subjectivity/phenomenal audit writers have not yet gained safe TEMP routing and are not invoked by this Workbench.

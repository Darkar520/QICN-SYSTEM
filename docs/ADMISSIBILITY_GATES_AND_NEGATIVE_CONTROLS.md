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
- replace [DESCRIPTOR_REGISTRY.md](c:/Users/irisp/OneDrive/Escritorio/TRADING%203.0/Sistema%20Canon%20Sandbox/docs/DESCRIPTOR_REGISTRY.md)
- replace [TRACEABILITY_MATRIX.md](c:/Users/irisp/OneDrive/Escritorio/TRADING%203.0/Sistema%20Canon%20Sandbox/docs/TRACEABILITY_MATRIX.md)
- replace [IMPLEMENTATION_STATUS.md](c:/Users/irisp/OneDrive/Escritorio/TRADING%203.0/Sistema%20Canon%20Sandbox/docs/IMPLEMENTATION_STATUS.md)
- change runtime behavior, endpoint contracts, or batch logic

The document records repository-local enforcement only.

## 3. Minimal Taxonomy

### `run_gate`

A run-level check applied by [AdmissibilityEngine.js](c:/Users/irisp/OneDrive/Escritorio/TRADING%203.0/Sistema%20Canon%20Sandbox/src/experiments/AdmissibilityEngine.js) to a single artifact directory before a run is accepted into later layers.

### `batch_gate`

A batch-level enforcement layer applied after per-run admissibility, using batch outputs such as SNO, ROEO, and negative controls.

### `gate_result`

A closed decision output produced by a run-level or batch-level gate.

Real examples:

- `run_verdict.json.status`: `ADMISSIBLE`, `DISCARDED`, `TAMPERED`
- `roeo_enforcement_report.json.batch_status`: `PAPER_ADMISSIBLE`, `NOT_PAPER_ADMISSIBLE`

### `negative_control`

A falsifier-oriented batch control defined in [negative_controls_runner.js](c:/Users/irisp/OneDrive/Escritorio/TRADING%203.0/Sistema%20Canon%20Sandbox/src/experiments/negative_controls_runner.js) and evaluated against batch artifacts and preregistered expectations.

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

A dependency on the external canonical repository or claim-ledger boundary documented in [CANON_SOURCE_OF_TRUTH.md](c:/Users/irisp/OneDrive/Escritorio/TRADING%203.0/Sistema%20Canon%20Sandbox/docs/CANON_SOURCE_OF_TRUTH.md).

Normalization used below:

- `Evidence scope`: `runtime_primary`, `runtime_derived`, `batch_primary`, `batch_derived`, `mixed`, `external_frozen`
- `External dependency`: `none`, `prereg_config`, `frozen_canon`, `external_service`, `legacy_input`, `human_interpretation_required`, `mixed`

## 4. Architecture Of Admissibility Gates

The repository contains at least three distinct layers:

### A. Run-Level Admissibility

Implemented in [AdmissibilityEngine.js](c:/Users/irisp/OneDrive/Escritorio/TRADING%203.0/Sistema%20Canon%20Sandbox/src/experiments/AdmissibilityEngine.js).

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

Implemented in [negative_controls_runner.js](c:/Users/irisp/OneDrive/Escritorio/TRADING%203.0/Sistema%20Canon%20Sandbox/src/experiments/negative_controls_runner.js), with dependencies on [sno_discriminator.js](c:/Users/irisp/OneDrive/Escritorio/TRADING%203.0/Sistema%20Canon%20Sandbox/src/experiments/sno_discriminator.js) and [roeo_signature.js](c:/Users/irisp/OneDrive/Escritorio/TRADING%203.0/Sistema%20Canon%20Sandbox/src/experiments/roeo_signature.js).

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

- [build_paper_pdf_lib.js](c:/Users/irisp/OneDrive/Escritorio/TRADING%203.0/Sistema%20Canon%20Sandbox/scripts/build_paper_pdf_lib.js)
- [latex_asset_generator_roeo.js](c:/Users/irisp/OneDrive/Escritorio/TRADING%203.0/Sistema%20Canon%20Sandbox/src/experiments/latex_asset_generator_roeo.js)

This is still internal batch enforcement. It is not external validation and not canonical closure.

## 5. Admissibility Gates Ledger

| ID | Layer | Gate / family | Purpose | Primary module | Primary artifacts | Config / prereg dependency | Primary test anchors | Output states | Evidence scope | External dependency | Non-claim boundary | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `RG_schema_record_integrity` | `run_level_admissibility` | `schema_and_record_integrity` | Reject malformed records, parse failures, undeclared strict extras, missing lines, and broken tick continuity. | `src/experiments/AdmissibilityEngine.js` | `run_header.json`, `ticks.ndjson`, `run_summary.json`, `schema/run_record.v1.json`, `run_verdict.json` | `none` | `tests/admissibility-exporter.v1.test.js`, `tests/run-episode-admissibility.v58.test.js` | `ADMISSIBLE`, `DISCARDED` | `mixed` | `none` | Passing record integrity does not imply scientific relevance or batch admissibility. | Real discard reasons include `DSC_SCHEMA_VIOLATION` and `DSC_MISSING_LINES`. |
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

Negative controls are implemented in [negative_controls_runner.js](c:/Users/irisp/OneDrive/Escritorio/TRADING%203.0/Sistema%20Canon%20Sandbox/src/experiments/negative_controls_runner.js). They operate over batch artifacts and preregistered expectations, not over raw runtime alone.

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
- `NC3_placebo`
- `NC4_leak_feature`

## 7. Negative Controls Ledger

| ID | Control | Purpose / falsifier target | Primary module | Primary artifacts | Config / prereg dependency | Primary test anchors | Failure reasons | Expected degradation or expected null effect | Evidence scope | External dependency | Non-claim boundary | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `NC1` | `NC1_time_permutation` | Test whether temporal structure matters by permuting a selected series and expecting degradation or ROEO failure. | `src/experiments/negative_controls_runner.js` | `ticks.ndjson`, `operational_equivalence.json`, `negative_controls_report.json` | `config/roeo/*.json` | `tests/negative-controls.v1.test.js`, `tests/roeo_enforcement.v1.test.js` | `NC1_FAILED_EXPECTATION` | Expected condition is `effect_min_or_ro_fail`; observed effect should clear prereg minimum or force ROEO non-equivalence. | `batch_primary` | `prereg_config` | Passing NC1 does not externally prove causal specificity. | Real candidate series are `metrics.omega`, `observability.wm_pred_error`, `observability.planner_cost`, `metrics.ccc`. |
| `NC2` | `NC2_self_noise_or_shift` | Test whether adding deterministic self-noise or shift produces the expected effect magnitude. | `src/experiments/negative_controls_runner.js` | `eo_report.json`, `negative_controls_report.json` | `config/roeo/*.json` | `tests/negative-controls.v1.test.js`, `tests/roeo_enforcement.v1.test.js` | `NC2_FAILED_EXPECTATION` | Expected condition is `effect_min`; observed effect should exceed prereg minimum. | `batch_primary` | `prereg_config` | Passing NC2 does not imply robust falsification of all confounds. | Uses `SUBJ` values from EO signatures. |
| `NC3` | `NC3_placebo` | Test whether a placebo path stays near null effect. | `src/experiments/negative_controls_runner.js` | `negative_controls_report.json` | `config/roeo/*.json` | `tests/negative-controls.v1.test.js`, `tests/roeo_enforcement.v1.test.js` | `NC3_FAILED_EXPECTATION` | Expected condition is `abs_effect_le_tau`; observed absolute effect should remain below prereg placebo tolerance. | `batch_primary` | `prereg_config` | Passing NC3 does not validate the full theory, only this placebo expectation. | Current implementation sets placebo effect to zero and checks it against `tau_placebo`. |
| `NC4` | `NC4_leak_feature` | Test whether leak-oriented features become identifiable above the prereg threshold in the leak batch. | `src/experiments/negative_controls_runner.js`, `src/experiments/sno_discriminator.js` | leak `sno_report.json`, `negative_controls_report.json` | `config/roeo/*.json` | `tests/negative-controls.v1.test.js`, `tests/roeo_enforcement.v1.test.js`, `tests/sno.v1.test.js` | `NC4_FAILED_EXPECTATION` | Expected condition is `acc_ge_threshold`; leak-batch strict accuracy should exceed the prereg leak threshold. | `batch_primary` | `prereg_config` | Passing NC4 does not make the clean batch scientifically valid by itself. | This is a leak sanity control, not a runtime-primary measurement. |

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

- [AGENTS.md](c:/Users/irisp/OneDrive/Escritorio/TRADING%203.0/Sistema%20Canon%20Sandbox/AGENTS.md) is the operating guide and vocabulary contract for the repo.
- [TRACEABILITY_MATRIX.md](c:/Users/irisp/OneDrive/Escritorio/TRADING%203.0/Sistema%20Canon%20Sandbox/docs/TRACEABILITY_MATRIX.md) maps claims, invariants, batch controls, modules, tests, and artifacts.
- [IMPLEMENTATION_STATUS.md](c:/Users/irisp/OneDrive/Escritorio/TRADING%203.0/Sistema%20Canon%20Sandbox/docs/IMPLEMENTATION_STATUS.md) records area-level and layer-level implementation state.
- [DESCRIPTOR_REGISTRY.md](c:/Users/irisp/OneDrive/Escritorio/TRADING%203.0/Sistema%20Canon%20Sandbox/docs/DESCRIPTOR_REGISTRY.md) inventories observational, derived, claim-facing, and gate-facing pieces.
- [descriptor_registry.v1.json](c:/Users/irisp/OneDrive/Escritorio/TRADING%203.0/Sistema%20Canon%20Sandbox/docs/descriptor_registry.v1.json) and [validate-descriptor-registry.cjs](c:/Users/irisp/OneDrive/Escritorio/TRADING%203.0/Sistema%20Canon%20Sandbox/scripts/validate-descriptor-registry.cjs) provide the machine-validable minimum registry layer.
- [CANON_SOURCE_OF_TRUTH.md](c:/Users/irisp/OneDrive/Escritorio/TRADING%203.0/Sistema%20Canon%20Sandbox/docs/CANON_SOURCE_OF_TRUTH.md) records the external formal boundary and unresolved canon pin.

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
- `admissibility.json` exists as a harness-side pre-verdict output with `PENDING_PR6C`, but it is not the authoritative run verdict and should not be confused with [AdmissibilityEngine.js](c:/Users/irisp/OneDrive/Escritorio/TRADING%203.0/Sistema%20Canon%20Sandbox/src/experiments/AdmissibilityEngine.js) output.
- Canon pinning remains unresolved in [CANON_SOURCE_OF_TRUTH.md](c:/Users/irisp/OneDrive/Escritorio/TRADING%203.0/Sistema%20Canon%20Sandbox/docs/CANON_SOURCE_OF_TRUTH.md).
- Some later consumers, such as paper-export scripts, remain dependent on batch outputs and prereg inputs rather than on a stronger formal registry layer.
- External-service and asset dependencies remain open.

## 12. Next Phase Preparation

This document prepares, but does not implement:

- stronger formalization of run gates
- stronger formalization of batch enforcement
- tighter integration with [DESCRIPTOR_REGISTRY.md](c:/Users/irisp/OneDrive/Escritorio/TRADING%203.0/Sistema%20Canon%20Sandbox/docs/DESCRIPTOR_REGISTRY.md)
- tighter linkage between gates and claim projections
- cleaner direct-evidence versus proxy-evidence separation
- better canonical pinning

No such implementation is performed in this phase.

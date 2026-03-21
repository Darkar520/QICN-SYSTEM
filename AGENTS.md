# Agent Operating Notes

This repository is a private engineering baseline for the operational QICN runtime. Treat all repository-local support as internal unless a claim is explicitly closed by frozen external materials and reproducible external evidence.

## Navigation

- `src/` is the runtime source of truth.
- `src/canon/` contains claim, invariant, boundary, threshold, substrate, provenance, and source-of-truth policy logic.
- `src/experiments/` contains episode harness, admissibility, ROEO, SNO, and negative-control batch logic.
- `src/simulation/` contains runtime modules exercised by the UI and tests.
- `src/utils/runtimeParameterRegistry.js` is the existing parameter registry surface. Do not collapse it into claim or gate semantics.
- `netlify/functions/` contains operational control surfaces, not scientific evidence surfaces.
- `tests/` contains reproducible verification anchors.
- `config/` contains versioned preregistration-style configuration.
- `js/api/` is a live compatibility layer still used by `services/`. It is not the runtime source of truth.

## Install And Verification Commands

```powershell
npm ci
npm run verify:source-of-truth
npm run verify:descriptor-registry
npm test
npm run build
npm run scoreboard:run
```

## Evidence Taxonomy

| Category | Definition | Real repo example | Must not be confused with |
| --- | --- | --- | --- |
| `direct_signal` | Tick-level or summary-level observable recorded directly from runtime execution or integrity state. | `metrics.pmia`, `metrics.stasis_index`, `ticks.tick`, `flags.io_partial` in `src/experiments/ExperimentalEpisodeHarness.js` and `src/canon/invariants/CanonicalInvariantPackage.js` | `summary.metrics.cog`, invariant scores, or claim projections |
| `derived_proxy` | Computed summary intended to compress runtime behavior for later comparison or reporting. | `summary.metrics.cog`, `summary.metrics.phen`, `summary.metrics.subj` from `ExperimentalEpisodeHarness`; `eo_report.json.signature.COG/PHEN/SUBJ/EO_scalar` from `src/experiments/roeo_signature.js` | direct signals or claim closure |
| `invariant` | Runtime-native composite assembled from direct signals and, where applicable, bounded derived summaries. | `I_per` to `I_leg` in `invariant_package.json` and `CanonicalInvariantPackage.js` | claim projections or external validation |
| `claim_projection` | Runtime-local mapping from invariants and batch evidence into a claim-facing support path. | `runtimeClaimProjection.P5_01` to `P5_06` in `claim_mapping_snapshot.json` and `runtimeClaimMapping.js` | frozen canon, final claim ledger, or publication-ready closure |
| `gate` | Decision layer that accepts or blocks a run or batch according to explicit criteria. | `run_verdict.json.status`, `roeo_enforcement_report.json.batch_status` | implementation status or external validation |
| `primary_artifact` | Artifact that is treated as the authoritative record for a specific execution layer. | `run_header.json`, `ticks.ndjson`, `run_summary.json`, `run_verdict.json`, `operational_equivalence.json`, `sno_report.json`, `negative_controls_report.json`, `roeo_enforcement_report.json` | summaries derived downstream from those records |
| `derived_artifact` | Artifact computed from primary artifacts for invariant, claim, export, or reporting use. | `lineage.json`, `admissibility.json`, `invariant_package.json`, `claim_mapping_snapshot.json`, `full_native_invariant_status.json`, `claim_closure_runtime_diagnostics.json`, `runtime_claim_projection.json`, `release_materialization_map.json`, `p5_03_threshold_runtime.json`, `eo_report.json` | runtime-primary evidence |
| `external_dependency` | Any dependency whose authority does not live entirely inside this repo. | frozen canon pin in `docs/CANON_SOURCE_OF_TRUTH.md`, prereg hashes in `config/`, external entropy services, non-vendored voice assets referenced by `SensoryPerceptionEngine.js` | repo-local support or tests |

## State Layers

The repository uses at least three distinct status layers. Do not collapse them.

| Layer | Meaning | Real values | Must not be read as |
| --- | --- | --- | --- |
| `implementation_status` | Repository inventory state of a module, layer, or control surface. | `implemented_tested`, `implemented_internal_support`, `partial_runtime_path`, `high_risk_control_surface` | run verdict, paper admissibility, or external validation |
| `run_verdict` | Result of run-level admissibility evaluation over recorded artifacts. | `ADMISSIBLE`, `DISCARDED`, `TAMPERED` in `run_verdict.json` | implementation completeness or publication readiness |
| `paper_level_equivalent_status` | Batch-level internal enforcement result over SNO, ROEO, and negative controls. The emitted field is `roeo_enforcement_report.json.batch_status`. | `PAPER_ADMISSIBLE`, `NOT_PAPER_ADMISSIBLE` | external validation, final claim closure, or scientific truth |

- `implementation_status` does not imply `run_verdict`.
- `run_verdict` does not imply `paper_level_equivalent_status`.
- `paper_level_equivalent_status` does not imply external validation.

## Canonical Term Usage

Use the following terms canonically unless a code path exposes a stricter real name:

- `descriptor`: only for registry-classified observational or derived pieces. Do not use it for `claim_projection`, `gate_result`, or plain artifacts by convenience.
- `claim_projection`: only for P5-facing support mappings produced by claim-mapping logic and related outputs.
- `gate_result`: only for closed decision outputs such as `run_verdict.json.status` or `roeo_enforcement_report.json.batch_status`.
- `artifact_only`: only for audit-relevant artifacts intentionally kept out of stronger descriptor or gate classes.
- `implementation_status`: only for area/layer inventory in [IMPLEMENTATION_STATUS.md](c:/Users/irisp/OneDrive/Escritorio/TRADING%203.0/Sistema%20Canon%20Sandbox/docs/IMPLEMENTATION_STATUS.md).
- `admissibility`: if unqualified, means run-level admissibility. Use `batch_enforcement` when referring to post-run SNO/ROEO/negative-controls filtering.
- `paper_level_equivalent_status`: canonical documentary term for the highest internal paper-facing batch state. The current machine-readable row id `GR_paper_admissibility_status` is retained for compatibility, but the emitted field remains `roeo_enforcement_report.json.batch_status`.
- `external_validation`: reserve for validation outside this repository. Do not use it for run gates, batch enforcement, release-package freezes, or claim projections.

## Document Roles

Use the documentation set as a partitioned system, not as a single interchangeable narrative.

- [TRACEABILITY_MATRIX.md](c:/Users/irisp/OneDrive/Escritorio/TRADING%203.0/Sistema%20Canon%20Sandbox/docs/TRACEABILITY_MATRIX.md) maps claim-facing rows to signals, modules, artifacts, and tests.
- [IMPLEMENTATION_STATUS.md](c:/Users/irisp/OneDrive/Escritorio/TRADING%203.0/Sistema%20Canon%20Sandbox/docs/IMPLEMENTATION_STATUS.md) records `implementation_status` by area and layer only.
- [DESCRIPTOR_REGISTRY.md](c:/Users/irisp/OneDrive/Escritorio/TRADING%203.0/Sistema%20Canon%20Sandbox/docs/DESCRIPTOR_REGISTRY.md) is the formal minimum registry for observational, derived, claim-facing, and gate-facing pieces.
- [ADMISSIBILITY_GATES_AND_NEGATIVE_CONTROLS.md](c:/Users/irisp/OneDrive/Escritorio/TRADING%203.0/Sistema%20Canon%20Sandbox/docs/ADMISSIBILITY_GATES_AND_NEGATIVE_CONTROLS.md) defines run-level admissibility, batch enforcement, and negative-control architecture.
- [CANON_SOURCE_OF_TRUTH.md](c:/Users/irisp/OneDrive/Escritorio/TRADING%203.0/Sistema%20Canon%20Sandbox/docs/CANON_SOURCE_OF_TRUTH.md) records the external formal boundary and canon pinning gap.

Machine-readable registry surfaces:

- [descriptor_registry.v1.json](c:/Users/irisp/OneDrive/Escritorio/TRADING%203.0/Sistema%20Canon%20Sandbox/docs/descriptor_registry.v1.json)
- [validate-descriptor-registry.cjs](c:/Users/irisp/OneDrive/Escritorio/TRADING%203.0/Sistema%20Canon%20Sandbox/scripts/validate-descriptor-registry.cjs)

Do not use one document to silently redefine the role of another.

## Source Of Truth Files

- Runtime entry: `src/index.jsx`
- Path policy: `src/canon/sourceOfTruth.js`
- Verification script: `scripts/verify-source-of-truth.cjs`
- Build authority: `build.cjs`
- Runtime parameter registry: `src/utils/runtimeParameterRegistry.js`
- Episode harness: `src/experiments/ExperimentalEpisodeHarness.js`
- Admissibility engine: `src/experiments/AdmissibilityEngine.js`
- Invariant package: `src/canon/invariants/CanonicalInvariantPackage.js`
- Claim projection: `src/canon/claimMapping/runtimeClaimMapping.js`
- ROEO signature and batch equivalence: `src/experiments/roeo_signature.js`
- SNO discriminator: `src/experiments/sno_discriminator.js`
- Negative controls and paper admissibility enforcement: `src/experiments/negative_controls_runner.js`
- Pre-registered config surfaces: `config/interventions/`, `config/roeo/`

## Primary Artifacts Versus Derived Artifacts

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

Derived but audit-relevant artifacts:
- `lineage.json`
- `admissibility.json`
- `invariant_package.json`
- `claim_mapping_snapshot.json`
- `full_native_invariant_status.json`
- `claim_closure_runtime_diagnostics.json`
- `runtime_claim_projection.json`
- `release_materialization_map.json`
- `p5_03_threshold_runtime.json`
- `eo_report.json`

Rules:
- Do not present a derived artifact as runtime-primary evidence.
- Do not present a batch-derived artifact as direct runtime support.
- Do not present any artifact in this repo as external validation unless an explicit external dependency is fixed and cited.
- `admissibility.json` is a harness-side pre-verdict artifact. The authoritative run-level gate result is `run_verdict.json`.

## Mandatory Update Rule

If any direct signal, mapping rule, or primary artifact contract changes in:

- `src/experiments/ExperimentalEpisodeHarness.js`
- `src/canon/invariants/CanonicalInvariantPackage.js`
- `src/canon/claimMapping/runtimeClaimMapping.js`
- `src/experiments/AdmissibilityEngine.js`
- `src/experiments/negative_controls_runner.js`
- `src/experiments/roeo_signature.js`
- `src/experiments/sno_discriminator.js`

then review and update as needed:

- `docs/TRACEABILITY_MATRIX.md`
- `docs/IMPLEMENTATION_STATUS.md`
- `docs/DESCRIPTOR_REGISTRY.md`
- `docs/descriptor_registry.v1.json`
- `docs/ADMISSIBILITY_GATES_AND_NEGATIVE_CONTROLS.md`
- `scripts/validate-descriptor-registry.cjs`
- relevant test anchors in `tests/`
- artifact documentation in the affected change set

Do not leave documentary drift unreported when code-level evidence contracts change.

## Non-Claims Discipline

- Any claim that depends on frozen external canon must be marked `frozen_canon`, `external_dependency`, or `internal_support_only` as appropriate.
- Any claim that depends on empirical validation outside this repo must not be presented as internally closed.
- `selfpatch`, `llm-proxy`, `quantum-entropy`, `runtime-health`, `killswitch-state`, and legacy compatibility layers are operational surfaces, not strong claim evidence surfaces.
- ROEO, SNO, admissibility, and negative controls are internal audit layers unless and until an external campaign explicitly closes them.
- If a dependency is not pinned, versioned, vendored, or reproducibly referenced, call it a gap.

## Surfaces Of Review Priority

- `netlify/functions/selfpatch-*.js`
- `netlify/functions/llm-proxy.js`
- `netlify/functions/quantum-entropy.js`
- `netlify/functions/runtime-health.js`
- `netlify/functions/killswitch-state.js`
- `js/api/` and `services/` compatibility path
- external assets referenced from `src/simulation/SensoryPerceptionEngine.js`

## Descriptor-Compatible Vocabulary

To prepare later descriptor-registry work without introducing new semantics:

- `descriptor` means a documented runtime or batch observation surface such as a parameter, direct signal, derived proxy, or invariant input.
- `claim_projection` means a P5-facing runtime support mapping and must remain distinct from descriptors.
- `gate_result` means the output of a run-level or batch-level decision surface and must remain distinct from both descriptors and claim projections.

Registry and gate semantics live in:

- [DESCRIPTOR_REGISTRY.md](c:/Users/irisp/OneDrive/Escritorio/TRADING%203.0/Sistema%20Canon%20Sandbox/docs/DESCRIPTOR_REGISTRY.md)
- [ADMISSIBILITY_GATES_AND_NEGATIVE_CONTROLS.md](c:/Users/irisp/OneDrive/Escritorio/TRADING%203.0/Sistema%20Canon%20Sandbox/docs/ADMISSIBILITY_GATES_AND_NEGATIVE_CONTROLS.md)

If you document future registry-shaped records, keep them limited to repo-real fields such as:

- `id`
- `kind`
- `source_module`
- `source_artifact`
- `source_signals`
- `test_anchors`
- `evidence_scope`
- `external_dependency`
- `status`
- `notes`

## Reporting Standard

When you report status or risk, distinguish explicitly between:

- `implemented_tested`
- `implemented_internal_support`
- `partial_runtime_path`
- `compatibility_only`
- `high_risk_control_surface`
- `external_dependency`
- `not_recorded`

Never promote internal support to external validation.

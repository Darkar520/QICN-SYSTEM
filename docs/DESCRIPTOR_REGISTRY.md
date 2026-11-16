# Descriptor Registry

## A. Purpose

This document is the formal minimum descriptor registry for the current repository. It is documentary only. It does not add a new executable subsystem, change runtime behavior, or redefine the meaning of claims.

The machine-readable companion for the minimum executable phase is:

- [descriptor_registry.v1.json](descriptor_registry.v1.json)
- [validate-descriptor-registry.cjs](../scripts/validate-descriptor-registry.cjs)

Its role is narrower and more disciplined than a generic inventory. It records, in one place, which runtime, derived, batch, and decision-layer pieces actually exist, where they come from, which artifacts expose them, which tests anchor them, and what must not be inferred from them.

Use this file to answer:

- what the repository records directly
- what it derives from those recordings
- which pieces are invariant-facing, claim-facing, or gate-facing
- which artifacts are primary and which are derived
- which dependencies are prereg-bound, canon-bound, service-bound, or still open

## B. What This Registry Is Not

This registry does not:

- provide external validation
- close canonical claim status
- act as a truth engine
- replace [TRACEABILITY_MATRIX.md](TRACEABILITY_MATRIX.md)
- replace [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)
- replace [ADMISSIBILITY_GATES_AND_NEGATIVE_CONTROLS.md](ADMISSIBILITY_GATES_AND_NEGATIVE_CONTROLS.md)
- convert [runtimeParameterRegistry.js](../src/utils/runtimeParameterRegistry.js) into a complete registry of claims
- collapse `descriptor`, `claim_projection`, and `gate_result` into a single class

This remains the human-readable companion. The JSON file is the machine-readable minimum source for structural validation. Neither file implies external validation or canonical closure.

## C. Source Terms And Minimal Taxonomy

The source terms below are taken from the repository as it exists today. If code uses a real term, keep the real term.

### `runtime_parameter`

A registered runtime configuration surface exposed in [runtimeParameterRegistry.js](../src/utils/runtimeParameterRegistry.js).

### `direct_metric`

A runtime-primary recorded signal or trace emitted by [ExperimentalEpisodeHarness.js](../src/experiments/ExperimentalEpisodeHarness.js), typically in `ticks.ndjson` and summarized in `run_summary.json`.

### `proxy_metric`

A derived runtime or batch-facing proxy computed from primary signals.

Real examples:

- `cog`
- `phen`
- `subj`
- `EO_scalar`

### `invariant`

A runtime-derived invariant record emitted by [CanonicalInvariantPackage.js](../src/canon/invariants/CanonicalInvariantPackage.js).

Real examples:

- `I_per`
- `I_ri`
- `I_int`
- `I_cont`
- `I_diff`
- `I_leg`

### `claim_projection`

A claim-facing mapping layer emitted by [runtimeClaimMapping.js](../src/canon/claimMapping/runtimeClaimMapping.js). It is not a descriptor and it is not a gate result.

Real examples:

- `P5_01`
- `P5_02`
- `P5_03`
- `P5_04`
- `P5_05`
- `P5_06`

### `gate_result`

A closed decision-layer result produced by admissibility or enforcement logic. It is not a descriptor and it is not a claim projection.

Real examples:

- `run_verdict.json.status`
- `roeo_enforcement_report.json.batch_status`

For documentary stability, use `paper_level_equivalent_status` as the layer term for the second example above. The current row id `GR_paper_admissibility_status` is retained for machine-readable compatibility.

### `primary_artifact`

An artifact treated as authoritative for its execution layer.

### `derived_artifact`

An artifact computed from primary artifacts for invariant, claim-facing, export, or reporting use.

### `external_dependency`

An authority or input not fully closed inside the repository.

### `prereg_dependency`

A dependency on `config/interventions/*.json` or `config/roeo/*.json`.

### `frozen_canon_dependency`

A dependency on the external canonical repository boundary recorded in [CANON_SOURCE_OF_TRUTH.md](CANON_SOURCE_OF_TRUTH.md).

## D. Formal Minimum Schema

For the executable minimum phase:

- the machine-readable source of truth is [descriptor_registry.v1.json](descriptor_registry.v1.json)
- structural validation is performed by [validate-descriptor-registry.cjs](../scripts/validate-descriptor-registry.cjs)
- this Markdown remains the narrative and interpretive companion

Each row in the registry uses the following fields:

- `ID`: stable documentary identifier for the row
- `Kind`: one of the normalized registry classes below
- `Layer`: where the row lives operationally
- `Source module`: real code surface that produces or defines the row
- `Source artifact`: real artifact or artifact family where the row is exposed
- `Source signals`: repo-real inputs or fields used to form the row
- `Downstream artifacts`: real artifacts that consume or re-materialize the row
- `Test anchors`: repo-real tests or commands that anchor the row
- `Gate dependencies`: documented downstream gate families or gate results that use the row
- `Claim-projection dependencies`: documented downstream claim projections that use the row
- `Evidence scope`: runtime, batch, or mixed scope
- `External dependency`: none, prereg, canon, service, or mixed
- `Status`: documentary confidence and closure status
- `Non-claim boundary`: what must not be inferred from the row
- `Notes / gaps`: open uncertainty, mixed classification, or extra handling notes

Normalization used below:

- `Kind`: `runtime_parameter`, `direct_metric`, `proxy_metric`, `invariant`, `claim_projection`, `gate_result`, `artifact_only`, `not_yet_classified`
- `Layer`: `runtime`, `runtime_derived`, `batch`, `enforcement`, `cross_layer`, `external`
- `Evidence scope`: `runtime_primary`, `runtime_derived`, `batch_primary`, `batch_derived`, `mixed`, `external_frozen`
- `External dependency`: `none`, `frozen_canon`, `prereg_config`, `external_service`, `legacy_input`, `human_interpretation_required`, `mixed`
- `Status`: `documented_real`, `documented_partial`, `pending_classification`, `external_dependency`, `not_closed`

Gate and claim-projection dependency columns are documentary links only. They indicate documented downstream consumption or adjacency inside the repo. They do not imply causal sufficiency or external validation.

## E. Registry Ledger

| ID | Kind | Layer | Source module | Source artifact | Source signals | Downstream artifacts | Test anchors | Gate dependencies | Claim-projection dependencies | Evidence scope | External dependency | Status | Non-claim boundary | Notes / gaps |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `RP_core_runtime_parameters` | `runtime_parameter` | `runtime` | `src/utils/runtimeParameterRegistry.js` | `none` | `BASE_LEARNING_RATE`, `HEBBIAN_FACTOR`, `SYNAPTIC_PRUNING_THRESHOLD`, `PLASTICITY_DECAY`, `RETRO_FLUX_WEIGHT`, `BOLTZMANN_ANALOG_K`, `INFORMATIONAL_TEMP_T`, `COHERENCE_THRESHOLD`, `ASCENSION_THRESHOLD` | runtime modules only | `tests/runtime-parameter-registry.v400.test.js`, `tests/runtime-parameter-functional.v400.test.js` | `none` | `none` | `runtime_primary` | `none` | `documented_real` | Parameter registration does not make a parameter a measurement, claim, or gate result. | Grouped as a family because the registry role here is documentary, not per-key executable metadata. |
| `RP_sensory_runtime_parameters` | `runtime_parameter` | `runtime` | `src/utils/runtimeParameterRegistry.js` | `none` | `targetFPS`, `minFPS`, `faceDetectMinIntervalMs`, `faceDetectMaxIntervalMs`, `activationDelayMs`, `tickIntervalMs` | sensory runtime modules only | `tests/runtime-parameter-registry.v400.test.js`, `tests/sensor-capabilities.v46.test.js` | `none` | `none` | `runtime_primary` | `external_service` | `documented_real` | Registered sensory parameters are not evidence of calibrated sensing. | Runtime behavior can still depend on external hardware and assets. |
| `RP_quantum_runtime_parameters` | `runtime_parameter` | `runtime` | `src/utils/runtimeParameterRegistry.js` | `none` | `QUANTUM_ENTROPY_TTL_MS`, `QUANTUM_POLL_INTERVAL_MS`, `QUANTUM_REQUIRED_QUALITY_MIN`, `QUANTUM_ENTROPY_ENABLED`, `QUANTUM_BUFFER_CAPACITY_CHUNKS`, `QUANTUM_BUFFER_LOW_WATERMARK_CHUNKS`, `QUANTUM_BUFFER_REFILL_TARGET_CHUNKS`, `QUANTUM_PROVIDER_TIMEOUT_MS`, `QUANTUM_PROVIDER_RETRY_COUNT`, `QUANTUM_PROVIDER_RETRY_BACKOFF_MS`, `QUANTUM_PROVIDER_FALLBACK_ENABLED`, `QUANTUM_LOG_LEVEL` | `src/simulation/QuantumEntropyBridge.js`, `src/simulation/EntropyProviderClient.js`, `src/config/runtimeEnv.js` | `tests/runtime-parameter-registry.v400.test.js`, `tests/quantum-entropy-bridge-polling.v51.test.js` | `none` | `none` | `runtime_primary` | `external_service` | `documented_real` | Registration does not validate entropy provenance or scientific interpretation. | External entropy posture remains open; provider buffering, retry, timeout, fallback, and logging controls are runtime-contract surfaces, not evidence surfaces. |
| `DM_tick_record_bundle` | `direct_metric` | `runtime` | `src/experiments/ExperimentalEpisodeHarness.js` | `run_header.json`, `ticks.ndjson`, `run_summary.json` | `tick`, `t_ms`, `versionHash`, `configHash`, `render_trace_hash`, `integrity.*`, `intervention.*`, `sensors.*`, `observability.*` | `run_verdict.json`, `invariant_package.json`, `claim_mapping_snapshot.json`, `negative_controls_report.json`, `eo_report.json` | `tests/episode-harness.v1.test.js`, `tests/run-episode-admissibility.v58.test.js` | `RG_schema_record_integrity`, `RG_config_hash_integrity`, `RG_integrity_envelope`, `RG_prereg_schedule_integrity`, `RG_runtime_hygiene` | `via I_* family`, `CP_P5_05` | `runtime_primary` | `none` | `documented_real` | A recorded tick bundle is not itself an invariant, gate result, or claim projection. | This is the primary runtime record surface. |
| `DM_direct_metric_series_numeric` | `direct_metric` | `runtime` | `src/experiments/ExperimentalEpisodeHarness.js` | `ticks.ndjson`, `run_summary.json` | `stasis_index_post_threshold`, `stasis_index` (legacy alias, C-5), `pmia`, `beth_q`, `spectral_gap`, `identity_stability_score`, `predictive_consistency`, `tau_recovery`, `temporal_convergence_tau_c`, `winding_number`, `raw_winding_number`, `winding_integer`, `topo_factor`, `operational_determinism_score`, `critical_observables_deterministic`, `causal_dependency_past`, `causal_dependency_sensors`, `causal_dependency_prompts`, `causal_dependency_noise` | `run_summary.json`, `invariant_package.json`, `claim_mapping_snapshot.json` | `tests/episode-harness.v1.test.js`, `tests/run-episode-admissibility.v58.test.js`, `tests/winding-topology.test.js` | `RG_runtime_hygiene`, `RG_run_verdict` | `via I_* family` | `runtime_primary` | `none` | `documented_real` | Numeric direct metrics do not carry claim semantics by themselves. | This row tracks the explicit `directMetricSeries` family; `stasis_index_post_threshold` disambiguates the hook post-threshold stasis index from the core stasis index (C-5). |
| `DM_critical_state_hash_trace` | `direct_metric` | `runtime` | `src/experiments/ExperimentalEpisodeHarness.js` | `ticks.ndjson`, `run_summary.json` | `critical_state_hash` | `invariant_package.json` | `tests/verifiable-report-shape.test.js`, `tests/cognitive-identity-robustness.v54.test.js` | `RG_run_verdict` | `I_ri`, `CP_P5_01`, `CP_P5_04` | `runtime_primary` | `none` | `documented_real` | Hash stability is not identical to identity closure. | String-valued trace recorded separately from numeric direct metrics. |
| `DM_pmia_guardrail_state_trace` | `direct_metric` | `runtime` | `src/experiments/ExperimentalEpisodeHarness.js` | `ticks.ndjson`, `run_summary.json` | `pmia_guardrail_state` | `invariant_package.json` | `tests/pmia-guardrails.v411.test.js` | `RG_run_verdict` | `I_int`, `I_leg`, `CP_P5_01`, `CP_P5_04` | `runtime_primary` | `none` | `documented_real` | Guardrail state does not, by itself, imply admissibility or claim support. | Direct recorded trace later summarized as guardrail fractions. |
| `DM_winding_orientation_trace` | `direct_metric` | `runtime` | `src/experiments/ExperimentalEpisodeHarness.js` | `ticks.ndjson`, `run_summary.json` | `winding_orientation` | `run_summary.json` | `tests/winding-topology.test.js` | `RG_run_verdict` | `via I_* family` | `runtime_primary` | `none` | `documented_real` | Orientation labels do not imply topological closure by themselves. | String-valued companion to signed `raw_winding_number`; summarized as `winding_orientation_mode`. |
| `PX_runtime_proxy_bundle` | `proxy_metric` | `runtime_derived` | `src/experiments/ExperimentalEpisodeHarness.js` | `run_summary.json` | `cog`, `phen`, `subj` derived from world-model, planner, omega, tau, residual, and self-state summaries | `eo_report.json`, `invariant_package.json`, `claim_mapping_snapshot.json` | `tests/planner-metric-independence.v55.test.js`, `tests/phenomenology-protocol-suite.v56.test.js`, `tests/verifiable-report-shape.test.js` | `none` | `I_diff`, `CP_P5_02`, `CP_P5_05`, `CP_P5_06` | `runtime_derived` | `none` | `documented_real` | Runtime proxies are not direct measurements and not external validation. | The registry keeps these as proxy metrics, not as claims. |
| `PX_eo_signature_bundle` | `proxy_metric` | `batch` | `src/experiments/roeo_signature.js` | `eo_report.json` | `COG`, `PHEN`, `SUBJ`, `EO_scalar` | `operational_equivalence.json`, `sno_report.json`, `negative_controls_report.json` | `tests/roeo.v1.test.js`, `tests/roeo_enforcement.v1.test.js` | `BG_admissible_run_filter_for_roeo_sno`, `BG_negative_controls_enforcement` | `CP_P5_02`, `CP_P5_05`, `CP_P5_06` | `batch_derived` | `prereg_config` | EO signatures are batch-facing proxy packages, not runtime-primary evidence. | Derived only from admissible runs. |
| `I_per` | `invariant` | `runtime_derived` | `src/canon/invariants/CanonicalInvariantPackage.js` | `invariant_package.json` | `ticks.tick`, `metrics.stasis_index`, `flags.io_partial`, `flags.monotonic_violation` | `claim_mapping_snapshot.json`, `runtime_claim_projection.json` | `tests/run-episode-admissibility.v58.test.js`, `tests/persistence-forward-invariance.test.js` | `none` | `CP_P5_01`, `CP_P5_04` | `runtime_derived` | `none` | `documented_partial` | Invariant support is not external closure or analytic proof over all controls. | Partial persistence composite; simulated forward-invariance and collapse certificates are excluded from run-level evidence. |
| `I_ri` | `invariant` | `runtime_derived` | `src/canon/invariants/CanonicalInvariantPackage.js`, `src/canon/finite_horizon/FiniteProjectionEvaluator.js` | `invariant_package.json` | `inverse_limit_score`, `is_inverse_limit_element`, `categorical_compatibility`, `approximation_error_bound`, `identity_stability_score`, `predictive_consistency_direct`, `self_state_completeness`, `critical_state_hash_*`, `operational_determinism_score`, `critical_observables_deterministic_frac` | `claim_mapping_snapshot.json`, `runtime_claim_projection.json`, `p5_03_threshold_runtime.json` | `tests/cognitive-identity-robustness.v54.test.js`, `tests/inverse-limit.test.js`, `tests/inverse-limit-formal.test.js` | `none` | `CP_P5_01`, `CP_P5_03`, `CP_P5_04` | `runtime_derived` | `none` | `documented_real` | This row does not establish rigid identity or full inverse-limit preservation outside repo-local semantics. | Rigid-identity-facing invariant surface with finite-window inverse-limit witness, categorical compatibility, and truncation-error diagnostics. |
| `I_int` | `invariant` | `runtime_derived` | `src/canon/invariants/CanonicalInvariantPackage.js` | `invariant_package.json` | `pmia`, `spectral_gap`, `beth_q`, `causal_dependency.*`, `pmia_guardrail_ok_frac`, `wm_pred_error_mean` | `claim_mapping_snapshot.json`, `runtime_claim_projection.json`, `p5_03_threshold_runtime.json` | `tests/pmia-guardrails.v411.test.js`, `tests/cognitive-loop-closure.v52.test.js`, `tests/non-factorization.test.js` | `none` | `CP_P5_01`, `CP_P5_03`, `CP_P5_04` | `runtime_derived` | `none` | `documented_partial` | This row does not prove causal sufficiency outside measured sandbox channels or exhaustive non-factorization over all graph partitions. | Partial runtime composite; no runtime graph or intervention histories are supplied, so factorization fields are null. |
| `I_cont` | `invariant` | `runtime_derived` | `src/canon/invariants/CanonicalInvariantPackage.js`, `src/simulation/PhenomenologyCore.js` | `invariant_package.json` | `predictive_consistency`, `tau_recovery`, `phenomenology.Pi_S`, `phenomenology.fragmentation_functional`, `phenomenology.invalid_regime_jumps` | `claim_mapping_snapshot.json`, `runtime_claim_projection.json`, `p5_03_threshold_runtime.json` | `tests/cognitive-loop-closure.v52.test.js`, `tests/continuity-formal.test.js` | `none` | `CP_P5_01`, `CP_P5_03`, `CP_P5_04` | `runtime_derived` | `none` | `documented_real` | Continuity here is runtime continuity, not persistence of personhood or complete metric-space continuity. | Finite continuity diagnostics require complete recorded component sequences and regime labels; missing bounds and admissibility are null. |
| `I_diff` | `invariant` | `runtime_derived` | `src/canon/invariants/CanonicalInvariantPackage.js` | `invariant_package.json` | `beth_q`, `phen`, `omega_mean` | `claim_mapping_snapshot.json`, `runtime_claim_projection.json`, `p5_03_threshold_runtime.json` | `tests/phenomenology-protocol-suite.v56.test.js` | `none` | `CP_P5_01`, `CP_P5_03`, `CP_P5_04` | `mixed` | `none` | `documented_real` | Mixed inputs do not justify phenomenological closure. | Combines direct and proxy inputs by design. |
| `I_leg` | `invariant` | `runtime_derived` | `src/canon/invariants/CanonicalInvariantPackage.js` | `invariant_package.json` | `operational_determinism_score`, `critical_observables_deterministic_frac`, `critical_state_hash_semantic_stability`, `pmia_guardrail_ok_frac`, `flags.schema_drift`, `flags.hash_drift`, `flags.io_partial` | `claim_mapping_snapshot.json`, `runtime_claim_projection.json`, `p5_03_threshold_runtime.json` | `tests/runtime-hygiene.test.js`, `tests/concordance-table.v400.test.js`, `tests/legibility-certifier.test.js` | `none` | `CP_P5_01`, `CP_P5_03`, `CP_P5_04` | `runtime_derived` | `none` | `documented_partial` | Legibility is not correctness proof, semantic transparency, or external audit sufficiency. | Partial runtime composite; synthetic L1-L6 fixtures are excluded from run-level evidence. |
| `ART_harness_admissibility_preverdict` | `artifact_only` | `runtime_derived` | `src/experiments/ExperimentalEpisodeHarness.js` | `admissibility.json` | `status: PENDING_PR6C`, run metadata references | none | `tests/episode-harness.v1.test.js` | `none` | `none` | `runtime_derived` | `none` | `documented_partial` | This artifact is not the authoritative run verdict. | Kept explicit to prevent confusion with `run_verdict.json`. |
| `CP_P5_01` | `claim_projection` | `runtime_derived` | `src/canon/claimMapping/runtimeClaimMapping.js` | `claim_mapping_snapshot.json`, `runtime_claim_projection.json` | boundary-side summaries over `I_per` to `I_leg` | claim-facing runtime reports only | `tests/admissibility-exporter.v1.test.js` | `GR_run_verdict_status` | `none` | `runtime_derived` | `frozen_canon` | `not_closed` | Claim projection is not frozen claim-ledger closure. | Internal boundary runtime path only. |
| `CP_P5_02` | `claim_projection` | `cross_layer` | `src/canon/claimMapping/runtimeClaimMapping.js`, `src/experiments/roeo_signature.js` | `claim_mapping_snapshot.json`, `operational_equivalence.json` | admissible pair family, ROEO outcomes, SNO separation, EO signatures | claim-facing runtime reports only | `tests/roeo.v1.test.js`, `tests/sno.v1.test.js` | `GR_run_verdict_status` | `none` | `mixed` | `mixed` | `not_closed` | Claim projection is not external substrate-preserved class closure. | Requires verified batch surfaces and external canon boundary; caller-provided pairs are not promoted by this mapping. |
| `CP_P5_03` | `claim_projection` | `runtime_derived` | `src/canon/claimMapping/runtimeClaimMapping.js`, `src/canon/thresholds/P503ThresholdRuntime.js` | `claim_mapping_snapshot.json`, `p5_03_threshold_runtime.json` | dominant invariant, ambiguity width, fail offsets, threshold geometry | claim-facing runtime reports only | `tests/run-episode-admissibility.v58.test.js` | `GR_run_verdict_status` | `none` | `runtime_derived` | `mixed` | `not_closed` | Claim projection is not final threshold closure beyond repo-local runtime evidence. | Version v5 emits no profiles or offsets unless all six invariants have complete recorded evidence; external dense stress remains open. |
| `CP_P5_04` | `claim_projection` | `runtime_derived` | `src/canon/claimMapping/runtimeClaimMapping.js` | `claim_mapping_snapshot.json`, `runtime_claim_projection.json` | rupture-side summaries over `I_per` to `I_leg` | claim-facing runtime reports only | `tests/admissibility-exporter.v1.test.js` | `GR_run_verdict_status` | `none` | `runtime_derived` | `frozen_canon` | `not_closed` | Claim projection is not external rupture validation. | Internal rupture-side runtime path only. |
| `CP_P5_05` | `claim_projection` | `runtime_derived` | `src/canon/claimMapping/runtimeClaimMapping.js` | `claim_mapping_snapshot.json` | batch controls required but not consumed | claim-facing runtime reports only | `tests/runtime-claim-evidence-absence.test.js` | `GR_run_verdict_status`, `GR_paper_admissibility_status` | `none` | `runtime_derived` | `prereg_config` | `not_closed` | Claim projection is not external falsification of complexity-only alternatives. | Current projection is `PARTIAL_RUNTIME_PATH`; gate references identify requirements, not currently consumed inputs. |
| `CP_P5_06` | `claim_projection` | `cross_layer` | `src/canon/claimMapping/runtimeClaimMapping.js`, `src/experiments/roeo_signature.js` | `claim_mapping_snapshot.json`, `operational_equivalence.json` | admissible pair family, ROEO outcomes, SNO separation, EO signatures | claim-facing runtime reports only | `tests/roeo.v1.test.js`, `tests/sno.v1.test.js` | `GR_run_verdict_status` | `none` | `mixed` | `mixed` | `not_closed` | Claim projection is not publication-grade biological non-primacy closure. | Requires verified batch equivalence and external canon boundary; caller-provided pairs are not promoted by this mapping. |
| `GR_run_verdict_status` | `gate_result` | `enforcement` | `src/experiments/AdmissibilityEngine.js` | `run_verdict.json` | aggregated results of record, hash, integrity, prereg, hygiene, and flake gates | `invariant_package.json`, `claim_mapping_snapshot.json`, `runtime_claim_projection.json`, `eo_report.json`, `operational_equivalence.json`, `sno_report.json` | `tests/run-episode-admissibility.v58.test.js`, `tests/admissibility-exporter.v1.test.js` | `none` | `CP_P5_01`, `CP_P5_02`, `CP_P5_03`, `CP_P5_04`, `CP_P5_05`, `CP_P5_06` | `runtime_derived` | `none` | `documented_real` | `ADMISSIBLE` is not `PAPER_ADMISSIBLE` and not external validation. | Authoritative run-level gate result. |
| `GR_paper_admissibility_status` | `gate_result` | `enforcement` | `src/experiments/negative_controls_runner.js` | `roeo_enforcement_report.json` | SNO outputs, negative-controls outputs, prereg thresholds, class-balance checks | paper-export gating outputs only | `tests/roeo_enforcement.v1.test.js`, `tests/exporter_roeo.v1.test.js` | `none` | `CP_P5_05` | `batch_derived` | `prereg_config` | `documented_real` | `PAPER_ADMISSIBLE` is internal batch enforcement, not external validation. | Highest explicit paper-level equivalent status implemented today. |
| `ART_sno_report` | `artifact_only` | `batch` | `src/experiments/sno_discriminator.js` | `sno_report.json` | class balance, strict allowlist, loose allowlist, accuracy over chance | `roeo_enforcement_report.json`, optional batch consumers | `tests/sno.v1.test.js` | `BG_sno_identifiability_enforcement`, `GR_paper_admissibility_status` | `CP_P5_02`, `CP_P5_06` | `batch_primary` | `prereg_config` | `documented_partial` | Non-identifiability is not equivalent to substrate equivalence. | Kept as `artifact_only` to avoid collapsing a batch-control artifact into a descriptor or gate result. |
| `ART_operational_equivalence` | `artifact_only` | `batch` | `src/experiments/roeo_signature.js` | `operational_equivalence.json` | admissible EO signatures, pair distances, epsilon checks, optional SNO attachment | `negative_controls_report.json`, paper-export helpers | `tests/roeo.v1.test.js`, `tests/exporter_roeo.v1.test.js` | `BG_admissible_run_filter_for_roeo_sno`, `NC1_time_permutation` | `CP_P5_02`, `CP_P5_06` | `batch_primary` | `prereg_config` | `documented_partial` | Operational equivalence output is not runtime-primary evidence. | Mixed control artifact kept outside strong descriptor collapse. |
| `ART_negative_controls_report` | `artifact_only` | `batch` | `src/experiments/negative_controls_runner.js` | `negative_controls_report.json` | `NC1_time_permutation`, `NC2_self_noise_or_shift`, `NC3_placebo`, `NC4_leak_feature` with observed effects and pass states | `roeo_enforcement_report.json`, paper-export helpers | `tests/negative-controls.v1.test.js`, `tests/negative-controls-nc3-placebo.v2.test.js` | `BG_negative_controls_enforcement`, `GR_paper_admissibility_status` | `CP_P5_05` | `batch_primary` | `prereg_config` | `documented_partial` | Passing negative controls is not external falsification by itself. | Artifact contains mixed falsifier outputs; NC3 now records method, jitter bound, signed mean, and per-run placebo samples. |
| `ART_eo_report` | `artifact_only` | `batch` | `src/experiments/roeo_signature.js` | `eo_report.json` | `COG`, `PHEN`, `SUBJ`, `EO_scalar`, run-level admissibility filter, verdict hash | `operational_equivalence.json`, `negative_controls_report.json` | `tests/roeo.v1.test.js`, `tests/roeo_enforcement.v1.test.js` | `BG_admissible_run_filter_for_roeo_sno` | `CP_P5_02`, `CP_P5_05`, `CP_P5_06` | `batch_derived` | `prereg_config` | `documented_partial` | EO packaging is not a direct runtime record. | Derived only from admissible runs. |
| `SOT_policy_surface` | `not_yet_classified` | `external` | `src/canon/sourceOfTruth.js`, `scripts/verify-source-of-truth.cjs` | verification output only | active root, blocked roots, verification script policy | build-time and CI-style checks only | `npm run verify:source-of-truth`, `tests/runtime-hygiene.test.js` | `none` | `none` | `runtime_primary` | `none` | `pending_classification` | Source-of-truth policy is not an empirical descriptor, claim projection, or gate result. | Kept visible because it constrains repo authority, but it is registry-adjacent rather than registry-native. |
| `DR_dimensional_registry` | `artifact_only` | `runtime_derived` | `src/canon/units/DimensionalRegistry.js` | `dimensional_audit_report` | runtime parameter expressions, unit declarations | none | `tests/dimensional-registry.v1.test.js` | `none` | `none` | `runtime_derived` | `none` | `documented_real` | Dimensional registry reports runtime consistency only; not physical validation. | Heuristic dimensionless inputs accepted via `normalization: 'runtime_metric'`. |
| `DR_finite_horizon_certificate` | `artifact_only` | `runtime_derived` | `src/canon/finite_horizon/FiniteProjectionEvaluator.js`, `src/canon/finite_horizon/ApproximationBarrierReport.js` | `finite_horizon_certificate` | trace metrics (pmia, beth_q, omega), projection_morphism, inverse_limit_score, inverse_limit_witness, categorical_compatibility, approximation_error_bound, horizon, branchFactor, stateDimension | none | `tests/finite-horizon-approximation-barrier.v1.test.js`, `tests/inverse-limit.test.js`, `tests/inverse-limit-formal.test.js` | `none` | `none` | `runtime_derived` | `none` | `documented_real` | Finite projection certificates and finite-window inverse-limit scores do not preserve full inverse-limit objects. | Implements BaseCore Theorem 5.4 boundary plus finite inverse-limit witness diagnostics; `assertFiniteHorizonClaimBoundary` rejects `full_inverse_limit_preservation`. |
| `DR_behavioral_pseudometric` | `artifact_only` | `runtime_derived` | `src/canon/metrics/BehavioralPseudometric.js` | `behavioral_distance_report` | leftTrace, rightTrace, observables, weights | none | `tests/behavioral-pseudometric.v1.test.js` | `none` | `none` | `runtime_derived` | `none` | `documented_real` | Operational indistinguishability is not ontological identity. | Deterministic bootstrap via seeded hash for uncertainty estimation. |
| `DR_intervention_registry` | `artifact_only` | `runtime_derived` | `src/canon/interventions/InterventionRegistry.js` | `intervention_registry` | intervention id, family, parameters, evidenceScope | none | `tests/behavioral-pseudometric.v1.test.js` | `none` | `none` | `runtime_derived` | `none` | `documented_real` | Registered intervention family only; not external validation. | In-memory Map registry; no persistence. |
| `ART_observer_and_latency_telemetry` | `artifact_only` | `runtime` | `src/simulation/OntologicalSingularityCore.js`, `src/hooks/useSimulationCycle.js` | UI/audit telemetry only | `observerImpact`, `observer_resonance`, `latencyStrain`, `metacognitive_strain` | none | `tests/engine-language-decoupling.v1.test.js` | `none` | `none` | `runtime_primary` | `none` | `documented_real` | `observerImpact` and `latencyStrain` are engineering/UI telemetry (`artifact_only`, C-7); they have no theoretical anchor in the active corpus and do not support claim closure. | Explicitly classified under C-7 so they are never promoted to invariant or claim surfaces. |
| `DR_heuristic_frozen_v1` | `artifact_only` | `runtime_derived` | `src/canon/calibration/InvariantWeightCalibration.js` | `heuristic_frozen_v1.json` | invariant weights (I_per, I_ri, I_int, I_cont, I_diff, I_leg) | none | `tests/invariant-weight-calibration.v1.test.js` | `none` | `none` | `runtime_derived` | `external_service` | `documented_real` | Frozen heuristic weights are not theoretical coefficients. | `INSUFFICIENT_EXTERNAL_EVIDENCE` status when no preregistered dataset exists. |
| `DR_expanded_negative_controls` | `not_yet_classified` | `runtime` | `src/experiments/negative_controls_expanded.js`, `src/experiments/NonFactorizationProver.js` | none | NC5–NC12 and planning helper inputs | none | `tests/negative-controls-expanded.v1.test.js`, `tests/non-factorization.test.js` | `none` | `none` | `mixed` | `none` | `documented_partial` | Standalone helper outputs are not recorded batch artifacts or external validation. | Several defaults are synthetic; no automatic NC1–NC4 batch-enforcement path was found. |

## F. Relation To Gates, Claims, Artifacts, And Tests

- A descriptor can feed an invariant or later claim projection, but it does not become a claim projection by being consumed there.
- A gate can consume runtime or batch artifacts, but its result remains a `gate_result`, not a descriptor.
- A claim projection can depend on invariants, proxies, or batch artifacts, but it remains an internal claim-facing mapping rather than a proof surface.
- An artifact can be primary or derived without becoming a claim-bearing object.
- A test anchor shows that a row is exercised or checked in the repo. It does not imply external validation.

Use this section together with:

- [TRACEABILITY_MATRIX.md](TRACEABILITY_MATRIX.md) for claim-facing linkage
- [ADMISSIBILITY_GATES_AND_NEGATIVE_CONTROLS.md](ADMISSIBILITY_GATES_AND_NEGATIVE_CONTROLS.md) for gate family semantics and negative-control architecture
- [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for area-level implementation state

## G. Relation To Existing Documents

- [AGENTS.md](../AGENTS.md) defines operating vocabulary, non-claims discipline, and mandatory update behavior.
- [TRACEABILITY_MATRIX.md](TRACEABILITY_MATRIX.md) maps claims, signals, modules, artifacts, and tests.
- [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) records implementation state by area and layer.
- [ADMISSIBILITY_GATES_AND_NEGATIVE_CONTROLS.md](ADMISSIBILITY_GATES_AND_NEGATIVE_CONTROLS.md) defines run gates, batch enforcement, and internal falsation surfaces.
- [CANON_SOURCE_OF_TRUTH.md](CANON_SOURCE_OF_TRUTH.md) records the external formal boundary and unresolved canon pin.

## H. What Must Not Be Inferred Yet

- A documented descriptor is not external validation.
- A claim projection is not scientific closure.
- A gate result is not ontological truth.
- `runtimeParameterRegistry.js` is not, by itself, a complete formal registry.
- Batch artifacts do not become runtime-primary evidence by being documented here.
- `PAPER_ADMISSIBLE` does not imply external validation.
- `ADMISSIBLE` does not imply `PAPER_ADMISSIBLE`.
- `admissibility.json` does not replace `run_verdict.json`.
- Canon-dependent interpretation remains open while the canon pin remains unresolved.

## I. Open Gaps

- The external canon pin remains unresolved in [CANON_SOURCE_OF_TRUTH.md](CANON_SOURCE_OF_TRUTH.md).
- Several batch-control artifacts remain intentionally conservative as `artifact_only` rather than being forced into stronger descriptor classes.
- The registry is documentary only; no executable registry layer exists yet.
- Some rows remain mixed because the underlying code combines direct and derived inputs by design.
- External-service and non-vendored-asset dependencies remain open.

## J. Next Phase Preparation

This document prepares, but does not implement:

- a stronger formal or executable registry layer
- tighter linkage between registry rows and gate families
- tighter linkage between registry rows and claim projections
- a cleaner direct-versus-proxy split where code still mixes both
- future integration with canon pinning and stronger audit workflows

No such subsystem is introduced in this phase.

## B1-B2 Workbench classification review

The new workbench capture/protocol/result envelopes, per-tick diagnostics and experimental chain are artifact_only records of isolated-copy execution. Their emitted evidence_scope is internal_support_only and external_support_certified is false. They are not added as direct_metric, invariant, claim_projection or gate_result rows in the minimum machine registry. No existing registry row, run-primary contract, descriptor computation or gate dependency changes. Physical values observed in a clone must not be presented as live runtime-primary signals.

SimulationCycleDriver.js is the common implementation behind the React adapter; ExecutionEnvironment.js supplies ownership without serializing capabilities into dynamic_state.v3. Complete wire contracts and test anchors are documented in WORKBENCH_EXECUTION_CONTRACT.md and TRACEABILITY_MATRIX.md.

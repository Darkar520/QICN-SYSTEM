# Protocolized Evaluation Protocol

## Scope

This phase defines an internal experimental protocol over the frozen ecosystem
candidate. It is an internal evaluation layer only.

It does not imply:

- external validation
- theory confirmation
- claim closure
- causal confirmation
- claim-facing release readiness

## Experimental units

- `run`
  - one instrumented runtime episode with one explicit experimental condition
  - required outputs: run-level verdict, entropy diagnostics, run metrics, support
    labels, and run evaluation metrics
- `small_batch`
  - a grouped set of repeated runs per condition
  - required outputs: condition summary, condition comparison, condition support
    labels, and condition evaluation summary
- `comparison`
  - a bounded comparison record between conditions, or an intra-condition
    replicate-dispersion check

## Canonical baseline

- canonical condition: `baseline`
- operational meaning: upstream/custom provider path with no experimental source
  replacement, no delay injection, and no dropout injection

## Canonical conditions

### `baseline`

- operational definition: upstream/custom provider path without experimental
  intervention
- intervention surface: `none`
- minimal falsifiable expectation: no forced source replacement and no forced
  delivery degradation
- does not prove: theory validity, causal support, or framework confirmation

### `replay`

- operational definition: deterministic reinjection of a preserved replay
  sequence in original order
- intervention surface: `source_replacement`
- minimal falsifiable expectation: replay source id and replay order are
  preserved in artifacts
- does not prove: superior runtime behavior or causal necessity of upstream
  entropy

### `shuffled`

- operational definition: deterministic permutation of a preserved replay
  sequence using a fixed seed
- intervention surface: `source_replacement`
- minimal falsifiable expectation: shuffled order differs from original order and
  remains reproducible under fixed seed
- does not prove: causal sensitivity of the full runtime

### `prng_only`

- operational definition: entropy source replaced by seeded synthetic PRNG-only
  samples
- intervention surface: `source_replacement`
- minimal falsifiable expectation: repeated runs with fixed seed reproduce the
  same source sequence
- does not prove: degradation, invalidity, or equivalence to upstream entropy

### `delayed_entropy`

- operational definition: upstream/custom provider path with explicit delivery
  delay injection
- intervention surface: `delivery_delay`
- minimal falsifiable expectation: latency burden increases versus baseline on
  supported channel metrics
- does not prove: causal effect on theory-facing runtime observables

### `dropout`

- operational definition: upstream/custom provider path with explicit delivery
  dropout injection
- intervention surface: `delivery_dropout`
- minimal falsifiable expectation: fallback burden increases versus baseline on
  supported channel metrics
- does not prove: causal effect on theory-facing runtime observables

## Canonical execution policy

- canonical seed schedule: `17057, 17058, 17059`
- canonical runs per condition: `3`
- minimum runs per condition for condition-level aggregation: `2`
- minimum runs per condition for minimal statistical contrast: `3`
- recommended tick count per run in this phase: `3`
- canonical condition order:
  1. `baseline`
  2. `replay`
  3. `shuffled`
  4. `prng_only`
  5. `delayed_entropy`
  6. `dropout`

## Required run artifacts

- `run_header.json`
- `ticks.ndjson`
- `run_summary.json`
- `run_verdict.json`
- `entropy_preverdict.json`
- `entropy_run_diagnostics.json`
- `run_metrics.json`
- `support_labels.json`
- `output_consumption_policy.json`
- `output_surface_policy.json`
- `controlled_statements.json`
- `run_evaluation_metrics.json`

## Required batch artifacts

- `condition_metrics_summary.json`
- `condition_comparison.json`
- `condition_support_labels.json`
- `condition_output_consumption_policy.json`
- `condition_output_surface_policy.json`
- `condition_controlled_statements.json`
- `artifact_manifest.json`
- `condition_evaluation_summary.json`
- `condition_comparison_report.json`
- `evaluation_protocol_manifest.json`
- `evaluation_batch_report.json`

## Exclusion and invalidation policy

- exclude any run with `run_verdict.status != ADMISSIBLE`
- exclude any run with `entropy_run_diagnostics.invalidates_run == true`
- exclude any run missing required run artifacts
- do not drop outliers automatically
- if exclusions reduce a condition below minimum `n`, mark the condition or
  comparison as `unsupported` or `description_only` instead of silently keeping
  the contrast

## Rerun policy

- rerun the full protocol when:
  - entropy experiment controller logic changes
  - run metrics or condition metrics logic changes
  - admissibility/invalidation logic changes
  - the frozen metric registry changes
  - the comparison matrix or statistical policy changes
- rerun only the evaluation batch when:
  - no repo baseline changed
  - the protocol source-of-truth did not change
  - artifacts are missing or stale

## Interpretation boundary

This protocol produces internal descriptive and minimally contrastive evaluation
artifacts only. It does not validate the corpus, confirm the framework, close
claims, or authorize causal language beyond the supported intervention surface.

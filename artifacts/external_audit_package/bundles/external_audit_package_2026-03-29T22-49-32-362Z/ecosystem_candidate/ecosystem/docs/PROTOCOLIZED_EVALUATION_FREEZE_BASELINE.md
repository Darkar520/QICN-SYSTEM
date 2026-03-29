# Protocolized Evaluation Freeze Baseline

This note freezes the current evaluation architecture for execution campaigns.

It is not:

- external validation
- theory confirmation
- claim closure
- public release authorization
- permission to bypass the comparison matrix or claim-facing blocks

## Frozen source-of-truth

- protocol: `docs/PROTOCOLIZED_EVALUATION_PROTOCOL.md`
- protocol json: `docs/evaluation_protocol.v1.json`
- comparison matrix: `docs/EVALUATION_COMPARISON_MATRIX.md`
- comparison matrix json: `docs/evaluation_comparison_matrix.v1.json`
- metrics baseline: `docs/EVALUATION_METRICS_BASELINE.md`
- metrics registry json: `docs/evaluation_metrics_registry.v1.json`
- controls/interventions: `docs/EVALUATION_CONTROLS_AND_INTERVENTIONS.md`
- controls registry json: `docs/evaluation_controls_registry.v1.json`
- statistical policy: `docs/EVALUATION_STATISTICAL_POLICY.md`
- statistical policy json: `docs/evaluation_statistical_policy.v1.json`
- interpretation boundary: `docs/EVALUATION_INTERPRETATION_BOUNDARY.md`

## Frozen operational components

- runner: `scripts/run-protocolized-evaluation.cjs`
- campaign runner: `scripts/run-execution-campaign.cjs`
- protocol verifier: `scripts/verify-evaluation-protocol.cjs`
- metrics verifier: `scripts/verify-evaluation-metrics.cjs`
- comparisons verifier: `scripts/verify-evaluation-comparisons.cjs`
- consolidation test: `tests/protocolized-evaluation-consolidation.v1.test.cjs`

## Frozen execution rules

- required ecosystem baseline: `PASS`
- required repo state: clean and pushed for both repositories
- condition order:
  1. `baseline`
  2. `replay`
  3. `shuffled`
  4. `prng_only`
  5. `delayed_entropy`
  6. `dropout`
- minimum runs per condition for inclusion: `2`
- minimum runs per condition for minimal contrast: `3`
- authoritative exclusions only:
  - non-admissible run
  - entropy-invalidated run
  - missing required artifact

## Frozen semantic limits

- `description_only` does not escalate to `minimal_contrast`
- `minimal_contrast` does not imply causal confirmation
- unsupported comparisons remain unsupported even when data exists
- evaluation artifacts remain blocked for claim-facing surfaces
- runtime evidence does not validate `QICN-RELEASE`
- corpus freeze does not confirm `QICN-SYSTEM`

## Change policy

The following changes invalidate this freeze unless the evaluation stack is
rerun and the ecosystem candidate is regenerated:

- protocol change
- comparison matrix change
- metrics registry change
- controls/interventions change
- statistical policy change
- evaluation runner or verifier change
- repo baseline drift in either repository

## Interpretation boundary

This freeze records architecture and governance only. It does not add new
claims or new semantics.

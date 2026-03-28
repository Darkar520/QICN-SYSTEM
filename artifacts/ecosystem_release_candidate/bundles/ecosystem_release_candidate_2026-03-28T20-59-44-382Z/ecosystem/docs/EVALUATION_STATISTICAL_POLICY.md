# Evaluation Statistical Policy

## Purpose

This phase allows only minimal, bounded statistical handling.

It supports:

- descriptive summaries
- empirical dispersion
- empirical min-max bands
- simple standardized effect size when sample size is sufficient

It does not support:

- p-values
- NHST-style claim escalation
- causal estimation
- Bayesian model comparison
- theory-facing inferential language

## Sample-size policy

- minimum `n` for condition-level aggregation: `2`
- canonical `n` per condition for this phase: `3`
- minimum `n` per arm for minimal contrast: `3`
- if `n < 2`
  - mark condition `unsupported`
- if `n = 2`
  - allow description only
- if `n >= 3`
  - allow minimal contrast for permitted comparisons

## Required descriptive outputs

- `sample_count`
- `mean`
- `min`
- `max`
- `std_dev`
- empirical min-max band

## Minimal contrast output

When the matrix marks a comparison as eligible and `n >= 3` on both arms, the
comparison may report:

- mean delta
- relative delta
- empirical min-max band per arm
- `hedges_g` as a simple small-sample standardized effect size

This remains non-confirmatory.

## Outliers and exclusions

- no automatic outlier deletion
- only authoritative run invalidation and artifact absence may exclude runs
- every exclusion must be listed in the batch report

## Seed sensitivity

- seed schedule must be explicit
- per-condition dispersion across seeds must remain visible
- if only one seed survives exclusion, seed sensitivity becomes `not_closed`

## Interpretation boundary

Statistical handling in this phase is internal, bounded, and non-claim-facing.
It does not authorize significance language or theory confirmation.

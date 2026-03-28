# Evaluation Comparison Matrix

## Comparison classes

- `permitted`
  - supported by current artifacts and protocol outputs
- `unsupported`
  - not instrumented strongly enough for this phase
- `descriptive_only`
  - comparison may be reported descriptively but not with minimal statistical
    contrast
- `minimal_contrast`
  - comparison may report mean deltas, empirical bands, dispersion, and a simple
    standardized effect size under the sample-size policy

## Permitted inter-condition comparisons

- `baseline_vs_replay`
- `baseline_vs_shuffled`
- `baseline_vs_prng_only`
- `baseline_vs_delayed_entropy`
- `baseline_vs_dropout`

All permitted inter-condition comparisons are non-claim-facing and are bounded
to internal descriptive or minimal-contrast use only.

## Permitted intra-condition comparisons

- `baseline_replicate_dispersion`
- `prng_only_replicate_dispersion`
- `dropout_replicate_dispersion`

These are replicate-consistency checks, not confirmatory analyses.

## Unsupported comparisons in this phase

- direct non-baseline pairwise comparisons such as `replay_vs_shuffled`
- any comparison interpreted as causal support for the corpus
- any comparison interpreted as framework confirmation
- any theory-facing comparison between runtime outputs and corpus claims

## Interpretation boundary

The matrix only states what the current artifact layer can compare. It does not
upgrade any comparison into a claim-safe or theory-validating result.

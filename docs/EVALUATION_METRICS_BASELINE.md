# Evaluation Metrics Baseline

## Registry scope

This phase freezes a small metric set with direct traceability to persisted
signals already emitted by the repository.

The registry is intentionally narrow:

- channel / burden operational metrics
- runtime descriptive metrics already persisted in `run_metrics.json`
- outcome and status artifacts already persisted by admissibility and entropy
  diagnostics

It excludes unsupported families such as:

- causal-effect estimates
- recovery or resilience claims not backed by persisted transition series
- theory-facing confidence scores

## Metric classes

- `direct_metric`
  - read directly from a persisted numeric signal
- `derived_metric`
  - computed from persisted run-level numeric signals across replicates
- `verdict_metric`
  - categorical outcome derived from authoritative verdict or diagnostics
- `support_only`
  - internal support-layer output only, never a confirmatory metric

## Frozen metric families

### Channel / burden

- `fallback_tick_ratio`
- `stale_tick_ratio`
- `degraded_tick_ratio`
- `pending_tick_ratio`
- `provider_error_burden`
- `buffer_exhaustion_burden`
- `entropy_latency_mean_ms`
- `entropy_latency_max_ms`

### Runtime / internal dynamics

- `omega_mean`
- `ccc_mean`
- `pmia_mean`
- `stasis_index_mean`
- `tick_budget_p95_ms`
- `tick_budget_max_ms`

### Outcome / internal status

- `run_verdict_status`
- `entropy_run_level_status`
- `invalidation_incidence`
- `support_label`

## Interpretation boundary

Frozen evaluation metrics are internal runtime measurements only. They do not
become theory claims by being frozen, aggregated, or compared.

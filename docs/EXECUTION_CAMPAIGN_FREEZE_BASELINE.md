# Execution Campaign Freeze Baseline

This note freezes the latest authoritative execution campaign as the reusable
operational reference for repeated internal campaigns.

It is not:

- external validation
- theory confirmation
- claim closure
- framework validation
- public release authorization

## Frozen authoritative campaign

- campaign id: `execution_campaign_primary_2026-03-25T02-15-00-000Z`
- batch id: `execution_campaign_primary_2026-03-25T02-15-00-000Z_primary_batch`
- system baseline: `main@a90cf500464cbfd235c73681a2d2a81e08129ab7`
- release repo baseline: `main@16651c94c4f9c44295bb6872f9fcf94481ff8b0a`
- canonical freeze commit: `2d7504be95ca33af5941e30abf7059dc2774edca`
- ecosystem candidate status required: `PASS`

## Authoritative artifact set

- `artifacts/execution_campaign/campaigns/execution_campaign_primary_2026-03-25T02-15-00-000Z/campaign_execution_plan.json`
- `artifacts/execution_campaign/campaigns/execution_campaign_primary_2026-03-25T02-15-00-000Z/execution_campaign_readout.json`
- `artifacts/execution_campaign/campaigns/execution_campaign_primary_2026-03-25T02-15-00-000Z/execution_campaign_audit_readout.json`
- `artifacts/execution_campaign/campaigns/execution_campaign_primary_2026-03-25T02-15-00-000Z/latest_campaign_pointer.json`
- `artifacts/protocolized_evaluation/batches/execution_campaign_primary_2026-03-25T02-15-00-000Z_primary_batch/aggregate/evaluation_protocol_manifest.json`
- `artifacts/protocolized_evaluation/batches/execution_campaign_primary_2026-03-25T02-15-00-000Z_primary_batch/aggregate/evaluation_batch_report.json`
- `artifacts/protocolized_evaluation/batches/execution_campaign_primary_2026-03-25T02-15-00-000Z_primary_batch/aggregate/condition_evaluation_summary.json`
- `artifacts/protocolized_evaluation/batches/execution_campaign_primary_2026-03-25T02-15-00-000Z_primary_batch/aggregate/condition_comparison_report.json`

Root-level `artifacts/execution_campaign/*.json` files remain mutable latest-artifact
surfaces and are not the frozen source-of-truth for this baseline once successive
campaigns begin to run.

## Reuse constraints

- same frozen protocol, matrix, metrics registry, controls registry, and
  statistical policy
- same six canonical conditions
- runner-executed batch only; no manual stitching
- authoritative exclusions only
- claim-facing block preserved for evaluation and campaign artifacts
- ecosystem candidate must remain `PASS`

## What invalidates this freeze

- runtime-semantic drift in either repository
- drift in the frozen evaluation architecture or its frozen operational
  components
- protocol, matrix, metrics registry, controls registry, or statistical policy
  drift
- execution runner, comparison verifier, metrics verifier, or campaign auditor
  drift
- unsupported comparisons emitted
- campaign artifacts promoted to claim-facing surfaces
- ecosystem candidate falling below `PASS`

Non-material governance, audit, or bundle-layer commits after the frozen
campaign do not invalidate comparability by themselves. They require explicit
baseline linkage and fresh verification before any successive campaign.

## What only requires rerun

- a new comparable campaign with the same frozen architecture
- regeneration of the candidate bundle from the same pushed baselines
- an updated audit readout for the same authoritative campaign if the source
  artifacts were missing or not yet bundled

## Interpretation boundary

This freeze records an internally coherent execution campaign baseline only. It
does not upgrade campaign evidence into causal proof, corpus validation, or
claim-safe output.

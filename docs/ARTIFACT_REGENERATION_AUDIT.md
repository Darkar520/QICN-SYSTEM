# Artifact Regeneration Audit

## Purpose

This audit determines whether tracked Stage2/Stage3 artifacts still regenerate
from the current source tree and whether any resulting drift is semantic,
provenance-only, or blocking.

## Audit rule

- capture baseline snapshots of tracked generated artifacts;
- rerun the source-driven build path;
- compare regenerated outputs against the baseline;
- strip purely volatile provenance fields before semantic comparison;
- classify the resulting drift.

## Classification rule

- `artifacts_current`: no tracked artifact changes after regeneration.
- `artifacts_regenerated_without_semantic_drift`: only volatile fields changed.
- `artifacts_regenerated_with_expected_provenance_drift`: lineage or timestamp
  fields changed as expected.
- `artifacts_stale_and_fixed`: source-driven semantic drift existed and was
  honestly regenerated.
- `artifacts_stale_and_blocking`: regeneration exposes unresolved blocking
  incoherence.

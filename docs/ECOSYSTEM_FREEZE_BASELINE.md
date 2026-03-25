# Ecosystem Freeze Baseline

This document fixes the frozen internal baseline for the current ecosystem
release candidate composed by `QICN-SYSTEM` and `QICN-RELEASE`.

## Frozen status

- required candidate status: `PASS`
- source-of-truth manifest:
  `artifacts/ecosystem_release_candidate/ecosystem_release_candidate_manifest.json`
- source-of-truth verification matrix:
  `artifacts/ecosystem_release_candidate/ecosystem_verification_matrix.json`
- source-of-truth gap register:
  `artifacts/ecosystem_release_candidate/ecosystem_gap_register.v1.json`

## QICN-SYSTEM baseline

- required repo state:
  - branch `main`
  - clean worktree
  - `HEAD == origin/main`
- source-of-truth artifacts:
  - `artifacts/operational_readiness_manifest.json`
  - `artifacts/artifact_manifest.json`
  - `artifacts/operational_smoke_manifest.json`
  - latest internal release bundle manifest referenced by the ecosystem
    candidate manifest
- canonical command surface:
  - `npm run verify:operational-readiness`
  - `npm run verify:artifacts`
  - `npm run smoke:operational`
  - `npm run release:bundle`

## QICN-RELEASE baseline

- required repo state:
  - branch `main`
  - clean worktree
  - `HEAD == origin/main`
- canonical freeze baseline:
  - local freeze tag `release-2026-03-01`
  - freeze commit `2d7504be95ca33af5941e30abf7059dc2774edca`
  - explicit upstream canonical tag `canonical-freeze-2026-03-01`
  - upstream pin status `resolved`
- source-of-truth artifacts:
  - `release/release_freeze_manifest.json`
  - `release/claim_registry.v1.json`
  - `_build/canonical_hardening/canonical_integrity_check.json`
  - latest canonical release bundle manifest referenced by the ecosystem
    candidate manifest

## Ecosystem baseline

- cross-repo interface source-of-truth:
  - `docs/ECOSYSTEM_INTERFACE_CONTRACT.md`
  - `docs/ecosystem_interface_contract.v1.json`
- governance source-of-truth:
  - `docs/ECOSYSTEM_CANDIDATE_GOVERNANCE.md`
  - `docs/ecosystem_candidate_governance.v1.json`
- maintenance source-of-truth:
  - `docs/ECOSYSTEM_MAINTENANCE_CHECKLIST.md`
- protocolized evaluation source-of-truth:
  - `docs/PROTOCOLIZED_EVALUATION_PROTOCOL.md`
  - `docs/evaluation_protocol.v1.json`
  - `docs/EVALUATION_COMPARISON_MATRIX.md`
  - `docs/evaluation_comparison_matrix.v1.json`
  - `docs/EVALUATION_METRICS_BASELINE.md`
  - `docs/evaluation_metrics_registry.v1.json`
  - `docs/EVALUATION_CONTROLS_AND_INTERVENTIONS.md`
  - `docs/evaluation_controls_registry.v1.json`
  - `docs/EVALUATION_STATISTICAL_POLICY.md`
  - `docs/evaluation_statistical_policy.v1.json`
  - latest batch artifacts under `artifacts/protocolized_evaluation/`

## Freeze interpretation boundary

This freeze baseline fixes an internal coordination state only. It does not
mean external validation, theory confirmation, claim closure, or public
release authorization.

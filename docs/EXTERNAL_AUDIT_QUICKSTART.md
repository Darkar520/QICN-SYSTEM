# External Audit Quickstart

This document is the entrypoint for a third-party audit of the frozen internal
QICN ecosystem composed by `QICN-SYSTEM` and `QICN-RELEASE`.

## What this package is

- a bounded handoff package for technical and semantic audit
- a map to the frozen baselines, latest accepted comparable campaign, and
  latest ecosystem candidate
- a reproducibility path for a competent external reviewer

## What this package is not

- not external validation
- not theory confirmation
- not claim closure
- not causal proof
- not runtime-to-corpus validation
- not public release authorization

## First files to inspect

1. `external_audit_package_manifest.json`
2. `external_audit_status.json`
3. `internal_red_team_report.json`
4. `ecosystem_candidate/ecosystem_release_candidate_manifest.json`
5. `ecosystem_candidate/ecosystem/manifests/execution_campaign_audit_readout.json`
6. `ecosystem_candidate/release/manifests/release_freeze_manifest.json`

## Minimum reproduction path

1. clone `QICN-SYSTEM` and `QICN-RELEASE` at the exact SHAs listed in
   `external_audit_package_manifest.json`
2. in `QICN-SYSTEM`, run:
   - `npm run verify:operational-readiness`
   - `npm run verify:artifacts`
   - `npm run smoke:operational`
   - `npm run verify:evaluation-phase`
   - `npm run audit:campaign`
   - `npm run verify:ecosystem-integrity`
3. in `QICN-RELEASE`, run:
   - `node scripts/verify-canonical-integrity.cjs`
   - `node scripts/verify-claim-registry.cjs`
   - `node scripts/verify-canonical-release.cjs`
4. confirm that the latest ecosystem candidate remains `PASS`
5. inspect the latest accepted comparable campaign and the preserved invalid
   attempt before reading any higher-level summary

## PASS orientation

Start from the package manifest and confirm all of the following:

- system baseline SHA matches the package manifest
- release baseline SHA and canonical freeze commit match the package manifest
- ecosystem candidate status is `PASS`
- latest accepted comparable campaign is `freezeable=true`
- the invalid historical attempt remains preserved and explicitly non-authoritative
- blocked outputs remain blocked for claim-facing use

## FAIL orientation

Treat the package as not externally audit-ready if any of the following occurs:

- pinned SHAs do not reproduce the listed manifests
- the ecosystem candidate is not `PASS`
- the latest accepted comparable emits unsupported comparisons
- immutable campaign refs are replaced by mutable latest refs where authority is required
- local absolute paths appear in package docs, manifests, or copied artifacts
- internal outputs are presented as claim-facing safe

## Reading boundary

Read this package as an internal handoff for external review. Do not read it as
evidence that external review has already occurred.

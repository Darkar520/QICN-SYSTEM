# External Audit Quickstart

This document is the entrypoint for a third-party audit of the frozen internal
QICN ecosystem composed by `QICN-SYSTEM` and `QUICN-RELEASE`.

**GitHub repositories:**
- `https://github.com/Darkar520/QICN-SYSTEM`
- `https://github.com/Darkar520/QUICN-RELEASE`

## Terminology

If any term in this document is unfamiliar, consult the operational glossary
before proceeding:

- [`docs/GLOSSARY_OPERATIONAL.md`](GLOSSARY_OPERATIONAL.md) — runtime and audit
  terms (ROEO, SNO, support labels, blocked outputs, admissibility gate, etc.)
- [`release/GLOSSARY_CANONICAL.v1.md`](https://github.com/Darkar520/QUICN-RELEASE) in
  QUICN-RELEASE — corpus-level and theoretical terms

## Repository navigation

If the repository structure or script families are unfamiliar, consult the
reviewer map before proceeding:

- [`docs/REVIEWER_MAP.md`](REVIEWER_MAP.md) — module layout, key script families,
  artifact flow, and what NOT to over-read

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
2. `docs/EXTERNAL_AUDIT_SETUP.md`
3. `external_audit_status.json`
4. `internal_red_team_report.json`
5. `ecosystem_candidate/ecosystem_release_candidate_manifest.json`
6. `ecosystem_candidate/ecosystem/manifests/execution_campaign_audit_readout.json`
7. `ecosystem_candidate/release/manifests/release_freeze_manifest.json`

## Minimum reproduction path

1. follow `docs/EXTERNAL_AUDIT_SETUP.md`
2. clone `QICN-SYSTEM` and `QICN-RELEASE` at the exact SHAs listed in
   `external_audit_package_manifest.json`
3. in `QICN-SYSTEM`, run:
   - `npm run verify:operational-readiness`
   - `npm run verify:artifacts`
   - `npm run smoke:operational`
   - `npm run verify:evaluation-phase`
   - `npm run audit:campaign`
   - `npm run verify:ecosystem-integrity`
4. in `QICN-RELEASE`, run:
   - `node scripts/verify-canonical-integrity.cjs`
   - `node scripts/verify-claim-registry.cjs`
   - `node scripts/verify-canonical-release.cjs`
5. confirm that the latest ecosystem candidate remains `PASS`
6. inspect the latest accepted comparable campaign and the preserved invalid
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

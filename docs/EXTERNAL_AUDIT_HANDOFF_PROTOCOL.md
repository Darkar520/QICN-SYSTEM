# External Audit Handoff Protocol

## Purpose

This document defines how the QICN ecosystem is handed to an actual external
auditor without improvisation and without overstating what the package means.

## Handoff message template

Use a message equivalent to the following:

> You are receiving the QICN external audit package for a bounded technical and
> semantic review. The package is pinned to exact SHAs for `QICN-SYSTEM` and
> `QUICN-RELEASE`. This handoff does not claim external validation already
> exists. Please review only the scope assigned to your auditor profile and
> return findings using the schema in `docs/EXTERNAL_AUDIT_FINDINGS_SCHEMA.md`.

## Mandatory contents of the handoff

Every external handoff must include:

- the package id from `external_audit_package_manifest.json`
- the exact pinned SHAs for both repos
- the reviewer profile being requested
- the scope being requested
- the finding format being requested
- the non-claim boundary that the package is audit-ready, not externally
  validated

## Package segmentation by auditor profile

### Technical reproducibility auditor

- send first:
  - `external_audit_package_manifest.json`
  - `external_audit_status.json`
  - `docs/EXTERNAL_AUDIT_SETUP.md`
  - `docs/EXTERNAL_AUDIT_QUICKSTART.md`
  - `docs/EXTERNAL_AUDIT_REVIEWER_MAP.md`
  - `ecosystem_candidate/ecosystem_release_candidate_manifest.json`
- do not ask this profile to judge:
  - ontology
  - theorem truth
  - philosophical interpretation

### Semantic or epistemic auditor

- send first:
  - `docs/EXTERNAL_AUDIT_QUICKSTART.md`
  - `docs/EXTERNAL_AUDIT_GLOSSARY.md`
  - `docs/EXTERNAL_AUDIT_PROFILE_MATRIX.md`
  - `ecosystem_candidate/release/docs/CLAIM_REGISTRY.md`
  - `ecosystem_candidate/release/docs/CANON_SOURCE_OF_TRUTH.md`
  - `ecosystem_candidate/release/docs/THEORY_SYSTEM_INTERFACE.md`
- do not ask this profile to certify software reproducibility

### Corpus and freeze auditor

- send first:
  - `ecosystem_candidate/release/manifests/release_freeze_manifest.json`
  - `ecosystem_candidate/release/manifests/claim_registry.v1.json`
  - `ecosystem_candidate/release/manifests/layer_boundaries.v1.json`
  - `ecosystem_candidate/release/manifests/system_interface_boundary.v1.json`
  - `ecosystem_candidate/release/docs/CANONICAL_RELEASE_NOTES.md`
- do not ask this profile to judge runtime quality

### Theory-to-system interface auditor

- send first:
  - `ecosystem_candidate/release/docs/THEORY_SYSTEM_INTERFACE.md`
  - `ecosystem_candidate/release/manifests/system_interface_boundary.v1.json`
  - `system_authoritative/latest_accepted_comparable/execution_campaign_audit_readout.json`
  - `system_authoritative/latest_accepted_comparable/condition_comparison_report.json`
  - `docs/EXTERNAL_AUDIT_TECHNICAL_PATH.md`
- do not ask this profile to issue a global truth verdict on the theory

## Minimum instructions to every auditor

- start from the pinned package manifest, not from informal narrative
- stay within the assigned scope
- record findings with exact file, command, or artifact references
- return either structured findings or an explicit structured no-issue report
- do not infer that handoff equals favorable external audit

## What does not count as completed handoff

None of the following count as a completed external audit handoff:

- sending only a repository link
- sending unpinned docs without SHAs
- sending a narrative summary without the package id
- receiving informal comments with no structured findings

## Archival rule

When a real external handoff occurs, preserve:

- the exact package id
- the exact message sent
- the date sent
- the auditor profile requested
- the raw findings returned

Do not overwrite the frozen package itself with post-handoff notes.

## Interpretation boundary

Handoff means a real external review can start under controlled conditions. It
does not mean the review already happened or that the outcome is known.

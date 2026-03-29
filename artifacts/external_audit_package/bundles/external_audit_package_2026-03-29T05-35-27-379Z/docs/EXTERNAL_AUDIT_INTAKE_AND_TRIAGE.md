# External Audit Intake And Triage

## Purpose

This document defines how to receive, store, classify, and process findings from
a real external audit without turning isolated findings into uncontrolled
narrative.

## Intake rule

When a real external auditor returns findings:

1. preserve the raw return exactly as received
2. attach the package id and pinned SHAs reviewed by the auditor
3. normalize each finding to the schema in
   `docs/EXTERNAL_AUDIT_FINDINGS_SCHEMA.md`
4. keep raw external findings separate from frozen package artifacts

## Recommended storage boundary

Store external findings in a separate intake surface such as:

```text
artifacts/external_audit_intake/<audit_session_id>/
  incoming/
  normalized/
  triage/
```

If the real external process uses email, shared drives, or issue trackers,
mirror only the minimal normalized record into the project. Do not rewrite the
raw finding text into a stronger claim.

## Triage dimensions

Every finding must be classified across all of the following:

- `severity`
- `category`
- `finding_domain`
- affected repo:
  - `QICN-SYSTEM`
  - `QICN-RELEASE`
  - `cross_repo`
- action need:
  - `change_required`
  - `change_optional`
  - `accepted_without_change`

## Domain split

Use the following domain split during triage:

- `technical`
- `semantic`
- `documental`
- `theoretical`
- `overclaim`
- `legibility`

Do not collapse these into one generic narrative.

## Decision rule for change

- `blocker`: change is required before claiming the package remains ready for
  external audit
- `material_issue`: change is required unless there is a written, explicit
  reason to accept the issue without change
- `note`: change is optional and should remain bounded
- `no_issue`: no change is required

## Narrative discipline

Do not convert:

- one favorable note into a global favorable verdict
- one mixed finding into theory failure
- one documentation problem into runtime invalidation

Every finding stays in the scope it actually audited.

## Global state transitions

Update the global external-review state only after triage:

- `externally_reviewed_but_not_conclusive`
  - the review was real but too narrow, partial, or mixed in scope to support a
    broader conclusion
- `externally_audited_unfavorable`
  - one or more blockers remain unresolved, or the returned findings show that
    the package failed the requested scope
- `externally_audited_mixed`
  - the audit was real and structured, but it returned material issues without
    a clean favorable outcome
- `externally_audited_favorable`
  - the audit was real, structured, and returned no blockers or material issues
    for the agreed scope

These labels apply to the audited scope only. They do not imply theory
confirmation or external scientific closure.

## Interpretation boundary

Intake and triage govern how external findings are processed. They do not
authorize semantic inflation or cross-layer inference.

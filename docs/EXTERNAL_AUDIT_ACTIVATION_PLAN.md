# External Audit Activation Plan

## Purpose

This document defines how to activate a real external audit of the frozen QICN
ecosystem without changing internal architecture, claim boundaries, or frozen
evaluation policy.

## Boundary

This plan organizes a real external review process. It does not itself count as:

- external validation
- theory confirmation
- claim closure
- causal proof
- public release authorization

## What counts as a real external audit

A review counts as a real external audit only if all of the following hold:

1. the reviewer is external to the project and independent from the internal
   build and governance flow
2. the reviewer receives a pinned package with exact SHAs and explicit scope
3. the reviewer returns structured findings or a structured no-issue report
4. the returned findings identify exact files, commands, or artifacts
5. the review leaves a reproducible record of what scope was actually audited

## What does not count as a real external audit

None of the following count as a real external audit:

- internal review by the project team
- internal review assisted by AI agents over the same repos
- an informal opinion from a third party without structured findings
- a partial test run without a recorded audit scope
- a simple read-through with no filed findings
- handoff delivery without a returned audit record

## Minimum readiness gate before handoff

Do not activate an external audit unless all of the following remain true:

- `QICN-SYSTEM/main` is clean, pushed, and matches the current package manifest
- `QUICN-RELEASE/main` is clean, pushed, and matches the current package manifest
- the external audit package status is `READY_FOR_EXTERNAL_AUDIT`
- the latest ecosystem candidate remains `PASS`
- the canonical freeze boundary remains unchanged
- the latest accepted comparable remains accepted and freezeable
- the reviewer map, setup, quickstart, technical path, glossary, and handoff
  checklist remain present and coherent

## Activation sequence

1. verify the current package, candidate, and cross-repo SHAs
2. choose the external auditor profile or profile set from
   `docs/EXTERNAL_AUDIT_PROFILE_MATRIX.md`
3. prepare the segmented handoff package described in
   `docs/EXTERNAL_AUDIT_HANDOFF_PROTOCOL.md`
4. send the handoff message with the pinned package id and review scope
5. require findings in the format defined by
   `docs/EXTERNAL_AUDIT_FINDINGS_SCHEMA.md`
6. receive and classify findings under
   `docs/EXTERNAL_AUDIT_INTAKE_AND_TRIAGE.md`
7. update the global external-review state only after intake and triage

## Pre-handoff red-team gate

Immediately before delivery, run one short final red-team pass over the handoff
layer only:

- verify that the package does not imply external validation already exists
- verify that the reviewer map still points to the right first files
- verify that the setup path is still cross-platform and self-contained
- verify that the handoff protocol still separates auditor profiles cleanly
- verify that blocked outputs still appear only as blocked outputs

This final red-team pass is a delivery check, not a reopening of the project.

## External process states

Use only the following state labels for the external process:

- `handoff_prepared`
- `handoff_sent`
- `findings_received`
- `externally_reviewed_but_not_conclusive`
- `externally_audited_unfavorable`
- `externally_audited_mixed`
- `externally_audited_favorable`

Do not jump directly from `handoff_sent` to a favorable or unfavorable state
without structured findings.

## Interpretation boundary

The existence of this activation plan means the ecosystem can be handed off in a
controlled way. It does not mean the audit happened or that the audit outcome is
known.

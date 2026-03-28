# Subjectivity Artifact Surface Policy

The Subjectivity Runtime Layer inherits the existing governed-surface posture of
`QICN-SYSTEM`.

This surface policy is framework-internal only.
It is not externally validated.

## Artifact classes

- `primary`
  - coordinate-level artifacts
  - internal only
- `derived`
  - comparator or intervention summaries
  - internal only
- `gate_facing`
  - internal gate outputs
  - still not claim-facing
- `manifest_root`
  - structural manifest only
  - never evidence by itself

## SRT-2 outputs

Currently implemented outputs:

- `self_index_state.json`
- `ownership_attribution_report.json`
- `subjective_continuity_report.json`
- `first_person_perspective_report.json`

Allowed surfaces for all four:

- `developer_inspection_surface`
- `local_artifact_surface`

Blocked surfaces for all four:

- `local_report_surface`
- `controlled_statement_surface`
- `external_claim_facing_surface`

## Critical boundary

No subjectivity artifact created by this layer may be promoted as:

- externally validated evidence
- human equivalence
- metaphysical closure
- corpus confirmation
- public claim-facing support

## SRT-2 rule

Because SRT-2 is still pre-comparator and pre-gate, the four implemented
primary artifacts remain internal diagnostics only. They are not sufficient for
subjectivity support and cannot be used as controlled statements.

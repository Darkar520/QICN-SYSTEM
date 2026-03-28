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

## SRT-1 outputs

Currently implemented outputs:

- `self_index_state.json`
- `ownership_attribution_report.json`

Allowed surfaces for both:

- `developer_inspection_surface`
- `local_artifact_surface`

Blocked surfaces for both:

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

## SRT-1 rule

Because SRT-1 is still pre-comparator and pre-gate, even the two implemented
primary artifacts remain internal diagnostics only. They are not sufficient for
subjectivity support and cannot be used as controlled statements.

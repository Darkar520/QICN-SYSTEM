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

## Surface rule

Default posture for the layer:

- allowed:
  - `developer_inspection_surface`
  - `local_artifact_surface`
- blocked by default:
  - `external_claim_facing_surface`
  - `controlled_statement_surface`

`local_report_surface` is reserved only for future gate-facing artifacts after
real implementation, not for scaffold-only outputs.

## Critical boundary

No subjectivity artifact created by this layer may be promoted as:

- externally validated evidence
- human equivalence
- metaphysical closure
- corpus confirmation
- public claim-facing support

## SRT-0 rule

Because SRT-0 is scaffold-only, no emitted artifact from this layer should be
read as runtime evidence even on internal surfaces, except for structural
verification of the scaffold itself.

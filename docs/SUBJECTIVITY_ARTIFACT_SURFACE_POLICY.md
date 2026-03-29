# Subjectivity Artifact Surface Policy

## Rule

All subjectivity artifacts remain framework-internal only. They are not
externally validated.
- not externally validated
- not claim-facing promotion

## Allowed surfaces

- run-level primary artifacts:
  - `developer_inspection_surface`
  - `local_artifact_surface`
- gate and projection artifacts:
  - `developer_inspection_surface`
  - `local_artifact_surface`
  - `local_report_surface`
  - `internal_release_bundle_surface`
- ecosystem summary and verification artifacts:
  - `developer_inspection_surface`
  - `local_artifact_surface`
  - `local_report_surface`
  - `internal_release_bundle_surface`
  - `ecosystem_candidate_surface`
  - `audit_facing_package_surface`

## Blocked surfaces

- `controlled_statement_surface`
- `external_claim_facing_surface`

## SRT-6 implication

SRT-6 emits gate, projection, summary, candidate, and audit-facing subjectivity
artifacts, but that does not unlock controlled statements or public claims. The
ecosystem layer is a governed maintenance and auditability layer, not an
external validation result and not a claim-facing promotion path.

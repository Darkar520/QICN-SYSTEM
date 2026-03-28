# Subjectivity Artifact Surface Policy

## Rule

All subjectivity artifacts remain framework-internal only.
They are not externally validated.

## Allowed surfaces

- primary and derived artifacts: `developer_inspection_surface`, `local_artifact_surface`
- gate result only: `developer_inspection_surface`, `local_artifact_surface`, `local_report_surface`

## Blocked surfaces

- `controlled_statement_surface`
- `external_claim_facing_surface`

## SRT-5 implication

SRT-5 emits a gate result and a manifest, but that does not unlock controlled
statements or public claims. The internal gate is a governed runtime closure,
not an external validation result.
This is not claim-facing promotion.

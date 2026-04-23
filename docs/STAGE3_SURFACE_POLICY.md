# Stage3 Surface Policy

## Allowed surfaces

- `developer_inspection_surface`
- `local_artifact_surface`
- `local_report_surface`
- `internal_release_bundle_surface` when explicitly marked as internal-only and
  non-adjudicative

## Blocked surfaces

- `external_claim_facing_surface`
- `controlled_statement_surface`
- `public_validation_surface`
- `external_adjudication_result_surface`
- `human_equivalence_surface`
- `superiority_claim_surface`
- `metaphysical_closure_surface`

## Paper 10 rule

The Paper 10 scaffold may exist only on local and internal governed surfaces.
It is blocked from public release canon, final-claim surfaces, adjudication
result surfaces, and any controlled statement surface that would read it as a
finished paper.

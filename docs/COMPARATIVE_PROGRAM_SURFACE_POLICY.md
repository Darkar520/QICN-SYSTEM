# Comparative Program Surface Policy

`Stage 2-M2` allows runtime comparative artifacts only on:

- `developer_inspection_surface`
- `local_artifact_surface`
- `local_report_surface`
- `internal_release_bundle_surface`

It keeps the following blocked:

- `ecosystem_candidate_surface`
- `audit_facing_package_surface`
- `controlled_statement_surface`
- `external_claim_facing_surface`

This means that the comparative runtime can now emit internal artifacts, but it
still cannot:

- publish comparator outputs;
- enter candidate projections;
- enter audit handoff;
- surface controlled comparative statements;
- support public claims.

# Comparative Program Surface Policy

`Stage3-RF` allows comparative runtime artifacts only on:

- `developer_inspection_surface`
- `local_artifact_surface`
- `local_report_surface`
- `internal_release_bundle_surface`

This includes the prior `Stage 2-M2`, `Stage 2-M3`, and `Stage 2-M4` artifact
families plus the new `Stage3-RF` outputs:

- `comparative_burden_fulfillment.json`
- `stage3_opening_readiness.json`
- `paper9_handoff_alignment.json`
- `stage3_opening_gate.json`
- `comparative_program_manifest.json`
- `comparative_program_verification_matrix.json`
- `comparative_program_readiness_gate.json`

It keeps the following blocked:

- `ecosystem_candidate_surface`
- `audit_facing_package_surface`
- `controlled_statement_surface`
- `external_claim_facing_surface`

This means that the comparative runtime can emit richer internal readiness and
handoff artifacts, but it still cannot:

- publish comparator outputs;
- enter candidate projections;
- enter audit handoff;
- open external adjudication outputs;
- surface controlled comparative statements;
- support public claims;
- open Paper 10 manuscript surfaces.

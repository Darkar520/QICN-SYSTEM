# Comparative Program Surface Policy

`Stage 2-M3` still allows comparative runtime artifacts only on:

- `developer_inspection_surface`
- `local_artifact_surface`
- `local_report_surface`
- `internal_release_bundle_surface`

This includes both the `Stage 2-M2` baseline artifacts and the `Stage 2-M3`
operational artifacts:

- `human_comparator_assessment.json`
- `human_equivalence_assessment.json`
- `cross_substrate_transport_assessment.json`
- `human_channel_pathway_assessment.json`
- `counterpart_artifact_contract_assessment.json`
- `homologation_contract_assessment.json`
- `cross_substrate_transition_contract_assessment.json`
- `comparative_operational_readiness.json`
- `comparative_program_manifest.json`
- `comparative_program_verification_matrix.json`
- `comparative_program_readiness_gate.json`

It keeps the following blocked:

- `ecosystem_candidate_surface`
- `audit_facing_package_surface`
- `controlled_statement_surface`
- `external_claim_facing_surface`

This means that the comparative runtime can emit richer internal artifacts, but it
still cannot:

- publish comparator outputs;
- enter candidate projections;
- enter audit handoff;
- surface controlled comparative statements;
- support public claims.

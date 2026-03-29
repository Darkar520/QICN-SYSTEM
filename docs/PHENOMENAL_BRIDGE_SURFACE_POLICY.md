# Phenomenal Bridge Surface Policy

## Rule

All BPF artifacts remain framework-internal only by default. BPF-1 adds local
run-level bridge reports, not bridge support.

## Allowed surfaces in BPF-1

- `developer_inspection_surface`
- `local_artifact_surface`

These surfaces may contain:

- protocol docs
- axiom registry
- rival-family registry
- threshold policy
- artifact schema registry
- scaffold metadata
- BPF-1 run-level bridge reports

## Blocked even in BPF-1

- `local_report_surface`
- `internal_release_bundle_surface`
- `ecosystem_candidate_surface`
- `audit_facing_package_surface`
- `controlled_statement_surface`
- `external_claim_facing_surface`

The local-report surface remains blocked at BPF-1 because the new bridge
reports are still provisional and easy to quote-mine out of context.

## Conditionally allowed in later BPF blocks

- `internal_release_bundle_surface`
- `ecosystem_candidate_surface`
- `audit_facing_package_surface`

These stay blocked until later BPF blocks supply:

- bridge-specific non-claims
- bridge-specific stale and drift checks
- bridge-specific allow-list updates
- bridge-specific bundle semantics

## Prohibited inferences

- candidate inclusion implies bridge support
- audit handoff implies external adjudication
- internal bridge report implies phenomenality
- provisional bridge estimate implies bridge admissibility
- bridge formalization implies Paper 9 legitimacy

## Machine-governance rule

Any bridge artifact that does not carry:

- explicit non-claims
- explicit interpretation boundary
- explicit surface allow-list

must be treated as blocked outside local internal surfaces.

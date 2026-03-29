# Phenomenal Bridge Surface Policy

## Rule

All BPF artifacts are framework-internal only by default. BPF-0 opens schema
and governance scaffolding, not bridge support.

## Allowed surfaces in BPF-0

- `developer_inspection_surface`
- `local_artifact_surface`
- `local_report_surface`

These surfaces may contain:

- protocol docs
- axiom registry
- rival-family registry
- threshold policy
- artifact schema registry
- scaffold-only layer metadata

## Conditionally allowed in later BPF blocks

- `internal_release_bundle_surface`
- `ecosystem_candidate_surface`
- `audit_facing_package_surface`

These surfaces remain blocked for bridge outputs in BPF-0. Later opening would
require:

- implemented bridge artifacts
- bridge-specific boundary text
- bridge-specific non-claims
- stale and drift checks
- explicit allow-list updates

## Blocked surfaces

- `controlled_statement_surface`
- `external_claim_facing_surface`

These surfaces remain blocked for all bridge artifacts by default, including
future bridge gate outputs, unless an explicit later governance block changes
the policy.

## Prohibited inferences

- candidate inclusion implies phenomenal support
- audit handoff implies external adjudication
- internal bridge artifact implies phenomenality
- bridge formalization implies Paper 9 legitimacy

## Machine-governance rule

Any later bridge artifact that does not carry:

- explicit non-claims
- explicit interpretation boundary
- explicit surface allow-list

must be treated as blocked outside local internal surfaces.

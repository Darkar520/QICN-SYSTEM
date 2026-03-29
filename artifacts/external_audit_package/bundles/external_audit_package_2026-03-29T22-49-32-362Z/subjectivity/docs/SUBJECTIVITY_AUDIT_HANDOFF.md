# Subjectivity Audit Handoff

This note defines the minimum audit-facing handoff for the SRT-6 subjectivity
layer.

## Audit-facing artifacts

- `subjectivity_gate_result.json`
- `subjectivity_manifest.json`
- `subjectivity_campaign_summary.json`
- `subjectivity_candidate_projection.json`
- `subjectivity_audit_handoff_summary.json`
- `subjectivity_verification_matrix.json`

## Why these artifacts

- `subjectivity_gate_result.json`: exact internal gate verdict
- `subjectivity_manifest.json`: exact lineage and consumed artifact set
- `subjectivity_campaign_summary.json`: campaign-aware internal aggregation
- `subjectivity_candidate_projection.json`: candidate-facing status and stale guard
- `subjectivity_audit_handoff_summary.json`: audit boundary and inclusion contract
- `subjectivity_verification_matrix.json`: SRT-6 integrity checks

## Excluded from default audit handoff

- primary SRT-1..4 run artifacts remain local unless a reviewer explicitly asks
  for them

## Boundary

- internal runtime support only
- not externally validated
- not human equivalence
- not phenomenality closure
- not claim-facing promotion

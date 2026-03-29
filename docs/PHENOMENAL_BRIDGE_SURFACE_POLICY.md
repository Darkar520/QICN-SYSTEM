# Phenomenal Bridge Surface Policy

## Rule

All bridge artifacts remain framework-internal only. BPF-M3 opens bounded
root and ecosystem artifacts to internal release, ecosystem candidate, and
audit-facing package surfaces only where the artifact already carries explicit
non-claims, bounded interpretation, and blocked claim-facing surfaces.

## Still local-only

- BPF-1 low-level bridge reports
- BPF-M2 bridge intervention profile
- BPF-M2 bridge reducibility report

## Bounded M3 surfaces

May appear on internal release bundle, ecosystem candidate, and audit-facing
package surfaces:

- `phenomenal_bridge_projection.json`
- `phenomenal_bridge_gate_result.json`
- `phenomenal_bridge_manifest.json`
- `phenomenal_bridge_campaign_summary.json`
- `phenomenal_bridge_candidate_projection.json`
- `phenomenal_bridge_audit_handoff_summary.json`
- `phenomenal_bridge_verification_matrix.json`
- `phenomenal_bridge_readiness_gate.json`

Only the internal release bundle may additionally include:

- `phenomenal_bridge_condition_summary.json`
- `phenomenal_bridge_batch_summary.json`
- `phenomenal_bridge_final_internal_audit.json`

## Always blocked

- `controlled_statement_surface`
- `external_claim_facing_surface`

## Prohibited inferences

- root bridge gate implies public proof
- candidate inclusion implies bridge proof
- audit inclusion implies external validation
- bridge_internal_admissible implies phenomenality

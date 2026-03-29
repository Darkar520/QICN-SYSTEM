# Subjectivity Maintenance

This note records the minimum maintenance contract for the SRT-6 subjectivity
stack.

## Authoritative artifacts

- run level:
  - `artifacts/subjectivity/srt5/subjectivity_runtime_projection.json`
  - `artifacts/subjectivity/srt5/subjectivity_gate_result.json`
  - `artifacts/subjectivity/srt5/subjectivity_manifest.json`
- ecosystem level:
  - `artifacts/subjectivity/srt6/subjectivity_condition_summary.json`
  - `artifacts/subjectivity/srt6/subjectivity_batch_summary.json`
  - `artifacts/subjectivity/srt6/subjectivity_campaign_summary.json`
  - `artifacts/subjectivity/srt6/subjectivity_candidate_projection.json`
  - `artifacts/subjectivity/srt6/subjectivity_audit_handoff_summary.json`
  - `artifacts/subjectivity/srt6/subjectivity_verification_matrix.json`
  - `artifacts/subjectivity/srt6/subjectivity_consolidation_check.json`

## Mandatory rerun triggers

- any change to `SubjectivityGateEvaluator`
- any change to `SubjectivityEcosystemIntegrator`
- any change to `docs/subjectivity_protocol.v1.json`
- any change to `docs/subjectivity_thresholds.v1.json`
- any change to `docs/subjectivity_rival_family.v1.json`
- any change to `docs/subjectivity_surface_policy.v1.json`
- any change to `docs/subjectivity_artifact_schema.v1.json`
- any change to `docs/ecosystem_candidate_governance.v1.json`
- any change to `docs/ecosystem_interface_contract.v1.json`
- any change to `docs/successive_campaign_discipline.v1.json`

## Minimal rerun order

1. `npm run verify:subjectivity-gate`
2. `npm run verify:subjectivity-ecosystem`
3. `npm run verify:subjectivity-stack`
4. `npm run verify:subjectivity-consolidation`
5. `npm run release:bundle`
6. `npm run release:ecosystem-candidate`
7. `npm run release:external-audit-package`

## Consolidation references

- `docs/SUBJECTIVITY_FINAL_INTERNAL_AUDIT.md`
- `docs/SUBJECTIVITY_READINESS_GATE.md`
- `docs/BRIDGE_TO_PHENOMENALITY_PREREQUISITES.md`
- `docs/PAPER9_PREREQUISITES.md`

## Non-claims

- This maintenance layer does not validate subjectivity externally.
- This maintenance layer does not validate phenomenality.
- This maintenance layer does not authorize claim-facing promotion.

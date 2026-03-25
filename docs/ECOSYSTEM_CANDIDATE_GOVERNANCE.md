# Ecosystem Candidate Governance

This note governs the internal ecosystem release candidate formed by
`QICN-SYSTEM` and `QICN-RELEASE`.

## Candidate scope

- designation: internal ecosystem release candidate
- scope: internal reproducibility, canonical traceability, and cross-repo
  governance only
- non-scope:
  - no external validation
  - no theory confirmation
  - no claim closure
  - no public release authorization

## invalidates_candidate

- either repository becomes dirty or unpushed
- `QICN-SYSTEM` canonical operational commands or governance scripts change
- protocolized evaluation protocol, comparison matrix, metrics registry,
  controls registry, or statistical policy changes without rerunning the
  evaluation phase
- `QICN-SYSTEM` internal release bundle policy changes
- `QICN-RELEASE` freeze manifest, claim registry, canonical boundary, or
  canonical bundle category structure changes
- the ecosystem interface contract changes
- a new blocking gap appears in the ecosystem gap register

## requires_verifier_rerun

- any change to manifests copied into the ecosystem candidate bundle
- any change to bundle builders or verifiers
- any change to baseline docs cited by the ecosystem manifest
- any change to evaluation runners, evaluation verifiers, or latest evaluation
  artifacts under `artifacts/protocolized_evaluation/`
- any change to repo state that affects branch, commit, upstream, or push state

## requires_explicit_human_review

- any change to the canonical freeze reference or upstream pin evidence
- any change to claim-registry granularity or classification
- any change to the cross-repo interface boundary
- any attempt to read protocolized evaluation outputs as corpus validation,
  theory confirmation, or claim closure
- any attempt to use runtime outputs as corpus validation or corpus freeze as
  runtime confirmation

## allowed_non_material_change

- typo-only edits in ecosystem docs that do not change meaning
- path portability fixes in ecosystem docs/manifests that do not change
  baseline meaning
- regeneration of bundles and manifests from the same pushed baselines
- provenance-note updates that do not reclassify active warnings or gaps

## Candidate source-of-truth

- `artifacts/ecosystem_release_candidate/ecosystem_release_candidate_manifest.json`
- `artifacts/ecosystem_release_candidate/ecosystem_verification_matrix.json`
- `artifacts/ecosystem_release_candidate/ecosystem_gap_register.v1.json`
- `docs/ECOSYSTEM_FREEZE_BASELINE.md`
- `docs/ECOSYSTEM_INTERFACE_CONTRACT.md`
- `docs/ECOSYSTEM_CANDIDATE_GOVERNANCE.md`
- `docs/ECOSYSTEM_MAINTENANCE_CHECKLIST.md`
- `docs/PROTOCOLIZED_EVALUATION_PROTOCOL.md`
- `docs/EVALUATION_COMPARISON_MATRIX.md`
- `docs/EVALUATION_METRICS_BASELINE.md`
- `docs/EVALUATION_CONTROLS_AND_INTERVENTIONS.md`
- `docs/EVALUATION_STATISTICAL_POLICY.md`
- `docs/EVALUATION_INTERPRETATION_BOUNDARY.md`

## Interpretation boundary

Candidate governance is maintenance policy only. It does not raise the meaning
of the ecosystem beyond internal release-candidate discipline.

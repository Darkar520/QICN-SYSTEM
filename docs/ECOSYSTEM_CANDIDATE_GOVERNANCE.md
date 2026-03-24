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

## What invalidates the current candidate

- either repository becomes dirty or unpushed
- `QICN-SYSTEM` canonical operational commands or governance scripts change
- `QICN-SYSTEM` internal release bundle policy changes
- `QICN-RELEASE` freeze manifest, claim registry, canonical boundary, or
  canonical bundle category structure changes
- the ecosystem interface contract changes
- a new blocking gap appears in the ecosystem gap register

## What requires verifier reruns

- any change to manifests copied into the ecosystem candidate bundle
- any change to bundle builders or verifiers
- any change to baseline docs cited by the ecosystem manifest
- any change to repo state that affects branch, commit, upstream, or push state

## What requires explicit review beyond reruns

- any change to the canonical freeze reference or upstream pin evidence
- any change to claim-registry granularity or classification
- any change to the cross-repo interface boundary
- any attempt to use runtime outputs as corpus validation or corpus freeze as
  runtime confirmation

## Interpretation boundary

Candidate governance is maintenance policy only. It does not raise the meaning
of the ecosystem beyond internal release-candidate discipline.

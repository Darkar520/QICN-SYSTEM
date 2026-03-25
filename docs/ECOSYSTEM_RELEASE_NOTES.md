# Ecosystem Release Notes

## Status

- designation: internal ecosystem release candidate
- required verification status: `PASS`
- current frozen state is the pair of pushed `main` baselines recorded in
  `artifacts/ecosystem_release_candidate/ecosystem_release_candidate_manifest.json`

## What is frozen

- `QICN-SYSTEM` operational baseline and internal release bundle baseline
- `QICN-RELEASE` canonical freeze baseline, claim registry baseline, and
  canonical bundle baseline
- protocolized evaluation protocol, metric registry, comparison matrix,
  controls registry, statistical policy, and latest evaluation batch artifacts
- the explicit interface contract between both repos
- ecosystem governance, verification matrix, and gap register

## What is not frozen as meaning

- no external validation
- no theory confirmation
- no claim closure
- no public release
- no automatic inference from runtime outputs to corpus validity
- no automatic inference from corpus freeze to runtime confirmation
- no automatic inference from protocolized evaluation deltas to corpus
  validation or theory confirmation

## Residual-gap posture

- active gaps must be read from the ecosystem gap register
- provenance notes do not count as active warnings
- if the candidate manifest reports open gaps or non-`PASS` status, the freeze
  is no longer valid as a clean candidate

## Interpretation boundary

These notes describe internal release-candidate state only. They do not add
new semantics to the system or the corpus.

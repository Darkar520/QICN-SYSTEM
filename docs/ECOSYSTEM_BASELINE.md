# Ecosystem Baseline

This document defines the internal baseline relationship between `QICN-SYSTEM`
and `QICN-RELEASE`. It is a cross-repo coordination layer only. It does not
upgrade either repository into theory confirmation, external validation, or
claim closure.

## Repository roles

- `QICN-SYSTEM`
  - role: operational runtime, governed outputs, enforcement surfaces, internal
    bundle production
  - source-of-truth: repository-local runtime code, operational docs, governed
    artifacts, and internal release bundle manifests
- `QICN-RELEASE`
  - role: canonical theoretical corpus, freeze governance, claim registry,
    canonical release bundle
  - source-of-truth: canonical freeze package, release manifests, claim
    registry, layer boundaries, and canonical bundle manifests

## Baseline policy

- The exact current baseline is emitted machine-readably by
  `artifacts/ecosystem_release_candidate/ecosystem_release_candidate_manifest.json`.
- `QICN-SYSTEM` baseline is defined by:
  - current git branch/commit
  - operational readiness manifest
  - artifact manifest
  - operational smoke manifest
  - latest internal release bundle manifest
- `QICN-RELEASE` baseline is defined by:
  - current git branch/commit of the repository
  - local canonical freeze tag and freeze manifest
  - claim registry baseline
  - canonical integrity check
  - latest canonical release bundle manifest

## Canonical ecosystem commands

Run inside `QICN-SYSTEM`:

1. `npm run verify:operational-readiness`
2. `npm run verify:artifacts`
3. `npm run smoke:operational`
4. `npm run release:bundle`
5. `npm run verify:ecosystem-integrity`
6. `npm run release:ecosystem-candidate`

## What the ecosystem baseline does

- fixes a reproducible internal coordination point between both repos
- makes the source-of-truth boundary explicit on both sides
- documents which cross-repo bridges are operational only
- packages a bounded internal ecosystem release candidate

## What the ecosystem baseline does not do

- it does not validate the theory
- it does not prove the runtime satisfies the corpus
- it does not convert runtime outputs into corpus confirmation
- it does not convert the claim registry into claim closure
- it does not authorize public or claim-facing release language

## Residual-gap posture

- Residual gaps are classified machine-readably in
  `artifacts/ecosystem_release_candidate/ecosystem_gap_register.v1.json`.
- A non-blocking gap may still matter for future claim-facing or public-facing
  phases.
- An internal release candidate can exist with warnings, but never by hiding
  them.

## Candidate governance

- Candidate maintenance policy is defined in
  `docs/ECOSYSTEM_CANDIDATE_GOVERNANCE.md`.
- Machine-readable governance is defined in
  `docs/ecosystem_candidate_governance.v1.json`.
- Frozen baseline summary is defined in `docs/ECOSYSTEM_FREEZE_BASELINE.md`.
- Maintenance checklist is defined in
  `docs/ECOSYSTEM_MAINTENANCE_CHECKLIST.md`.

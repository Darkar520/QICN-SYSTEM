# Ecosystem Maintenance Checklist

## Before accepting a change

1. confirm both repos are clean and pushed
2. identify whether the change touches system only, release only, or both
3. check `docs/ECOSYSTEM_CANDIDATE_GOVERNANCE.md`

## Minimum sanity checks

- system only:
  - `npm run verify:operational-readiness`
  - `npm run verify:artifacts`
- release only:
  - `node scripts/verify-canonical-integrity.cjs`
  - `node scripts/verify-claim-registry.cjs`
- ecosystem:
  - `npm run verify:ecosystem-integrity`

## Full freeze validation

- `npm run verify:operational-readiness`
- `npm run verify:artifacts`
- `npm run smoke:operational`
- `npm run release:bundle`
- `node scripts/verify-canonical-integrity.cjs`
- `node scripts/verify-claim-registry.cjs`
- `node scripts/verify-canonical-release.cjs`
- `npm run verify:ecosystem-integrity`
- `npm run release:ecosystem-candidate`

## First files to inspect if something breaks

- `artifacts/ecosystem_release_candidate/ecosystem_verification_matrix.json`
- `artifacts/ecosystem_release_candidate/ecosystem_gap_register.v1.json`
- `artifacts/ecosystem_release_candidate/ecosystem_release_candidate_manifest.json`
- `release/release_freeze_manifest.json`
- `docs/ECOSYSTEM_INTERFACE_CONTRACT.md`

## Rerun scope

- rerun system only if only operational code/docs/manifests changed
- rerun release only if only canonical docs/manifests/bundle logic changed
- rerun full ecosystem if interface, governance, baselines, bundle builders, or
  either repo state changed

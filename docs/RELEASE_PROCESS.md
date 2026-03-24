# Release Process

This is an internal release process for repository-local operational use. It is not a publication process and does not authorize strong claims.

## Preconditions

1. `npm run verify:env-contract`
2. `npm run build:js`
3. `npm run smoke:operational`
4. `npm run regression:minimal`
5. `node scripts/build-entropy-condition-metrics.cjs artifacts artifacts`
6. `npm run verify:artifacts`
7. `npm run verify:operational-readiness`

## Internal bundle command

- `npm run release:bundle`

## Expected bundle contents

- `release_bundle_manifest.json`
- `operational_readiness_manifest.json`
- `artifact_manifest.json`
- `condition_local_report.json`
- governed exported outputs that passed policy checks
- governance artifacts:
  - `condition_output_consumption_policy.json`
  - `condition_output_surface_policy.json`
  - `condition_controlled_statements.json`
- copied operational docs

## Expected exclusions

- outputs blocked by policy
- outputs lacking required boundaries or refs
- claim-facing unsafe exports such as blocked condition comparisons

## Rollback / fallback

- If bundle build fails, do not patch around policy blockers
- Re-run `npm run verify:artifacts` and `npm run verify:operational-readiness`
- If the blocker is `under_evaluation` or claim-facing unsafe, keep it blocked
- If the blocker is a missing boundary/ref, repair the producing step instead of bypassing the enforcer

## Non-claim boundary

- Internal bundle creation does not imply external validation.
- Internal bundle creation does not imply theory closure.
- Internal bundle creation does not authorize framework-confirming language.

# Successive Campaign Discipline

This note governs repeated execution campaigns after the authoritative campaign
freeze.

## successive_campaign_allowed

- ecosystem candidate is still `PASS`
- both repos are clean and pushed
- the frozen evaluation architecture is unchanged
- the campaign is runner-executed under an explicit plan
- the six canonical conditions remain explicit
- claim-facing block remains active

## successive_campaign_requires_fresh_verification

- always rerun:
  - `npm run verify:evaluation-protocol`
  - `npm run verify:evaluation-metrics`
  - `npm run verify:evaluation-comparisons`
  - `npm run verify:evaluation-phase`
  - `npm run verify:ecosystem-integrity`
- rerun full base checks if repo state, bundle builders, or candidate manifests
  changed

## successive_campaign_breaks_baseline

- protocol, matrix, metrics registry, controls registry, or statistical policy
  changed
- repo baselines drifted
- runtime semantics changed in a way that changes condition meaning
- unsupported comparisons are emitted
- claim-facing gating no longer blocks the evaluation/campaign artifacts

## exploratory_campaign_not_comparable

- uses added or substituted conditions
- changes the seed policy or exclusion logic
- changes the required artifacts
- changes the minimal statistics policy
- runs outside the frozen candidate baseline

## Comparable vs exploratory vs invalid

- comparable:
  - same frozen architecture
  - same condition set
  - same exclusion policy
  - same comparison matrix
  - same or larger `n`
- exploratory:
  - internal-only campaign outside one or more frozen constraints
  - may be useful, but it does not extend this baseline directly
- invalid:
  - manual stitching
  - missing authoritative artifacts
  - candidate not `PASS`
  - claim-facing leak
  - unsupported comparisons emitted

## Interpretation boundary

More campaigns do not authorize stronger language by themselves. Repetition may
improve internal comparability only within the frozen protocol.

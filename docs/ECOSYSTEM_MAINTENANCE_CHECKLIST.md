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
- protocolized evaluation:
  - `npm run verify:evaluation-protocol`
  - `npm run evaluate:protocolized`
  - `npm run evaluate:campaign`
  - `npm run verify:evaluation-phase`

## Full freeze validation

- `npm run verify:operational-readiness`
- `npm run verify:artifacts`
- `npm run smoke:operational`
- `npm run release:bundle`
- `npm run verify:evaluation-protocol`
- `npm run evaluate:protocolized`
- `npm run evaluate:campaign`
- `npm run verify:evaluation-phase`
- `node scripts/verify-canonical-integrity.cjs`
- `node scripts/verify-claim-registry.cjs`
- `node scripts/verify-canonical-release.cjs`
- `npm run verify:ecosystem-integrity`
- `npm run release:ecosystem-candidate`

## First files to inspect if something breaks

- `artifacts/ecosystem_release_candidate/ecosystem_verification_matrix.json`
- `artifacts/ecosystem_release_candidate/ecosystem_gap_register.v1.json`
- `artifacts/ecosystem_release_candidate/ecosystem_release_candidate_manifest.json`
- `artifacts/protocolized_evaluation/evaluation_batch_report.json`
- `artifacts/protocolized_evaluation/condition_comparison_report.json`
- `artifacts/execution_campaign/campaign_execution_plan.json`
- `artifacts/execution_campaign/execution_campaign_readout.json`
- `release/release_freeze_manifest.json`
- `docs/ECOSYSTEM_INTERFACE_CONTRACT.md`

## Rerun scope

- rerun system only if only operational code/docs/manifests changed
- rerun release only if only canonical docs/manifests/bundle logic changed
- rerun protocolized evaluation if entropy experimental controls, metrics logic,
  comparison matrix, statistical policy, or evaluation runner/verifiers change
- rerun full ecosystem if interface, governance, baselines, bundle builders, or
  either repo state changed

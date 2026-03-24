# Operational Readiness

This document is an operational runbook. It does not upgrade runtime outputs into claims, validation, or theory closure.

## What is considered ready

- Node `20.x` is used
- `.env.example` documents the minimum runtime contract
- canonical commands exist and are stable
- build passes
- smoke suite passes
- minimal regression passes
- required artifacts and governance refs verify cleanly
- internal release bundle can be built without exporting blocked outputs

## Canonical commands

- Install: `npm ci`
- Environment contract: `npm run verify:env-contract`
- JS build: `npm run build:js`
- Smoke: `npm run smoke:operational`
- Minimal regression: `npm run regression:minimal`
- Policy-focused verification: `npm run verify:policies`
- Small-batch aggregation: `node scripts/build-entropy-condition-metrics.cjs artifacts artifacts`
- Artifact verification: `npm run verify:artifacts`
- Readiness verification: `npm run verify:operational-readiness`
- Internal bundle: `npm run release:bundle`

## Operational surfaces

- Build surface: [`build.cjs`](/c:/Users/irisp/OneDrive/Escritorio/TRADING%203.0/Sistema%20Canon%20Sandbox/build.cjs)
- Run/admissibility surface: [`scripts/run-episode.cjs`](/c:/Users/irisp/OneDrive/Escritorio/TRADING%203.0/Sistema%20Canon%20Sandbox/scripts/run-episode.cjs), [`scripts/evaluate-admissibility.cjs`](/c:/Users/irisp/OneDrive/Escritorio/TRADING%203.0/Sistema%20Canon%20Sandbox/scripts/evaluate-admissibility.cjs)
- Policy/enforcement surface: [`src/experiments/OutputConsumptionPolicy.js`](/c:/Users/irisp/OneDrive/Escritorio/TRADING%203.0/Sistema%20Canon%20Sandbox/src/experiments/OutputConsumptionPolicy.js), [`src/experiments/OutputSurfacePolicy.js`](/c:/Users/irisp/OneDrive/Escritorio/TRADING%203.0/Sistema%20Canon%20Sandbox/src/experiments/OutputSurfacePolicy.js), [`src/experiments/OutputSurfaceEnforcer.js`](/c:/Users/irisp/OneDrive/Escritorio/TRADING%203.0/Sistema%20Canon%20Sandbox/src/experiments/OutputSurfaceEnforcer.js)
- Artifact/report surface: [`scripts/verify-artifacts.cjs`](/c:/Users/irisp/OneDrive/Escritorio/TRADING%203.0/Sistema%20Canon%20Sandbox/scripts/verify-artifacts.cjs), [`scripts/build-local-governed-report.cjs`](/c:/Users/irisp/OneDrive/Escritorio/TRADING%203.0/Sistema%20Canon%20Sandbox/scripts/build-local-governed-report.cjs)
- Release surface: [`scripts/build-internal-release-bundle.cjs`](/c:/Users/irisp/OneDrive/Escritorio/TRADING%203.0/Sistema%20Canon%20Sandbox/scripts/build-internal-release-bundle.cjs)

## Troubleshooting

- Missing env contract: run `npm run verify:env-contract`
- Missing artifact family or broken refs: run `npm run verify:artifacts`
- Broken policy or support/export/statement layers: run `npm run verify:policies`
- Smoke failure: inspect `artifacts/operational_smoke_manifest.json`
- Readiness mismatch: inspect `artifacts/operational_readiness_manifest.json`
- Bundle failure: inspect `release_bundle_manifest.json` in the target bundle directory

## Failure posture

- Missing boundaries are operational blockers, not warnings to ignore
- Missing refs are operational blockers, not optional metadata
- `under_evaluation` support blocks stronger downstream uses by design
- Blocked claim-facing outputs remain blocked even when machine-readable artifacts exist

## Non-claim boundary

- Operational readiness is not scientific validation.
- CI success is not framework confirmation.
- Internal bundle production is not a public claim-safe release.

# Reproducibility Contract

This repository has an operational reproducibility contract, not an external validation claim.

## Runtime and toolchain

- Expected Node runtime: `20.x`
- Repository marker: [`.nvmrc`](/c:/Users/irisp/OneDrive/Escritorio/TRADING%203.0/Sistema%20Canon%20Sandbox/.nvmrc)
- Package engines: [`package.json`](/c:/Users/irisp/OneDrive/Escritorio/TRADING%203.0/Sistema%20Canon%20Sandbox/package.json)

## Canonical install

1. `npm ci`
2. Copy [`.env.example`](/c:/Users/irisp/OneDrive/Escritorio/TRADING%203.0/Sistema%20Canon%20Sandbox/.env.example) to `.env`
3. Keep deterministic seeds explicitly set unless intentionally changing the experiment/runtime posture

## Minimum local deterministic posture

Required documented keys for operational readiness:

- `APP_ENV`
- `NODE_ENV`
- `PORT`
- `AUTH_REQUIRED`
- `INTEGRITY_HMAC_SECRET`
- `QICN_SEED`
- `COGNITIVE_EMERGENCE_EVAL_SEED`
- `SEED`
- `RENDER_DETERMINISTIC`
- `QUANTUM_ENTROPY_ENABLED`
- `QUANTUM_EXPERIMENT_CONDITION`

External-service keys such as `GEMINI_API_KEY`, `OPENAI_API_KEY`, `IBM_QUANTUM_API_KEY`, `NETLIFY_TOKEN`, and `GITHUB_SELFPATCH_TOKEN` are optional unless those surfaces are intentionally enabled.

## Canonical command order

1. `npm run verify:env-contract`
2. `npm run build:js`
3. `npm run smoke:operational`
4. `npm run regression:minimal`
5. `npm run metrics:entropy-conditions artifacts artifacts`
6. `npm run verify:artifacts`
7. `npm run verify:operational-readiness`
8. `npm run release:bundle`

## Expected artifact families

Run-level artifacts:

- `run_verdict.json`
- `run_metrics.json`
- `support_labels.json`
- `output_consumption_policy.json`
- `output_surface_policy.json`
- `controlled_statements.json`

Condition/small-batch artifacts:

- `condition_metrics_summary.json`
- `condition_comparison.json`
- `condition_support_labels.json`
- `condition_output_consumption_policy.json`
- `condition_output_surface_policy.json`
- `condition_controlled_statements.json`

Operational manifests:

- `artifacts/operational_readiness_manifest.json`
- `artifacts/operational_readiness/environment_contract_manifest.json`
- `artifacts/artifact_manifest.json`
- `artifacts/operational_smoke_manifest.json`
- `artifacts/internal_release/*/release_bundle_manifest.json`

## What counts as reproducible here

A run or bundle is reproducible in this repository when:

- the canonical commands above execute successfully on Node `20.x`
- the expected artifact family exists
- required refs and boundaries are present
- operational smoke passes
- governance artifacts remain consistent

## What is not guaranteed

- External provider latency and availability are not deterministic
- Run IDs, timestamps, and bundle directory names are expected to vary
- Partial reproducibility is still the correct label for paths that depend on external services or live deployment surfaces

## Non-claim boundary

- Reproducibility does not imply truth.
- Deterministic tooling does not imply causal confirmation.
- Operational consistency does not imply external validation.

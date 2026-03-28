# External Audit CI Minimal Workflow

## About this workflow

This workflow provides the minimum public CI signal for the QICN-SYSTEM ecosystem.

It covers:
- install
- source-of-truth integrity
- descriptor registry integrity
- operational readiness contract
- build
- smoke test
- full test suite
- selfpatch policy and killswitch check

## What this workflow does NOT cover

The following verifications require the QICN-RELEASE sibling repo and cannot run in CI without it:
- `npm run verify:ecosystem-integrity`
- `npm run audit:campaign`
- `npm run verify:evaluation-phase`

For a full external audit, follow `docs/EXTERNAL_AUDIT_SETUP.md` and run the ecosystem commands manually.

## Public signal interpretation

A green CI run on `main` means:
- the repo is internally consistent at that commit
- the source of truth and descriptor registry are intact
- the build succeeds
- the operational readiness contract passes
- all tests pass

A green CI run does NOT mean:
- a campaign ran
- an ecosystem candidate was built or validated
- QICN-RELEASE integrity was verified
- external audit has occurred

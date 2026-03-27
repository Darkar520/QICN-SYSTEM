# External Audit Setup

This document defines the minimum cross-platform setup for a third-party audit
of the frozen QICN ecosystem.

## Required tools

- `git`
- `node` `20.x`
- `npm`

No PowerShell-specific step is required on the critical audit path.

## Required repositories

Clone both repositories from GitHub:

- `QICN-SYSTEM` — `https://github.com/Darkar520/QICN-SYSTEM.git`
- `QUICN-RELEASE` — `https://github.com/Darkar520/QUICN-RELEASE.git`
  (note: the official GitHub name uses `QUICN` with a `U`)

The ecosystem also recognizes these local folder aliases:

- `QICN-RELEASE/` (without the `U`)
- `release_repo_qicn_2026-03-01/`

The preferred sibling layout is:

```text
<workspace>/
  QICN-SYSTEM/
  QUICN-RELEASE/       # or any accepted alias above
```

If the release repo lives elsewhere, set `ECO_RELEASE_ROOT` to its absolute
path before running the ecosystem commands.

## Generate the audit package artifacts first

Before pinning repos, generate the audit package locally:

```bash
npm install
npm run release:external-audit-package
```

This produces
`artifacts/external_audit_package/external_audit_package_manifest.json`, which
contains the exact pinned SHAs for both repos. The manifest does not exist
until this build step completes.

## Pin both repos

1. Read the exact SHAs from `artifacts/external_audit_package/external_audit_package_manifest.json`.
2. In `QICN-SYSTEM`, check out the listed `qicn_system.head`.
3. In `QICN-RELEASE`, check out the listed `qicn_release.head`.

## Install dependencies

Run inside `QICN-SYSTEM`:

```bash
npm install
```

`QICN-RELEASE` has no separate dependency install step for the critical audit
checks.

## Minimum cross-platform verification path

Run inside `QICN-SYSTEM`:

```bash
npm run verify:operational-readiness
npm run verify:artifacts
npm run smoke:operational
npm run verify:evaluation-phase
npm run audit:campaign
npm run verify:ecosystem-integrity
```

Run inside `QICN-RELEASE`:

```bash
node scripts/verify-canonical-integrity.cjs
node scripts/verify-claim-registry.cjs
node scripts/verify-canonical-release.cjs
```

## Expected success conditions

- both repos match the pinned SHAs
- `QICN-SYSTEM` verifiers pass
- `QICN-RELEASE` verifiers pass
- latest ecosystem candidate remains `PASS`
- latest accepted comparable campaign remains accepted and freezeable

## Expected failure conditions

Treat the setup as failed if any of the following occurs:

- the release repo cannot be located from `QICN-SYSTEM`
- the pinned SHAs are not reproducible
- critical docs/manifests still contain local private paths
- a critical command requires PowerShell-only execution
- blocked outputs are presented as claim-facing safe

## Boundary

This setup enables external audit. It does not constitute external validation,
theory confirmation, or claim closure.

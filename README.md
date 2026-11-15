# QICN Runtime Engineering Repository

[![QICN Verification Pipeline](https://github.com/Darkar520/QICN-SYSTEM/actions/workflows/verify.yml/badge.svg)](https://github.com/Darkar520/QICN-SYSTEM/actions/workflows/verify.yml)

## Purpose

This repository contains the operational implementation of the system, its runtime verification surface, and its engineering controls. It is intentionally separate from any frozen theoretical or canonical corpus.

The goal of this repository is development, testing, auditability by commit and pull request, and traceability from internal claims to metrics, modules, and tests.

## External Audit Entry Point

If you are a third-party auditor, start here:

- [`docs/EXTERNAL_AUDIT_REVIEWER_MAP.md`](docs/EXTERNAL_AUDIT_REVIEWER_MAP.md) - reviewer-oriented map of the package, entrypoints, and expected reading order
- [`docs/EXTERNAL_AUDIT_QUICKSTART.md`](docs/EXTERNAL_AUDIT_QUICKSTART.md) - audit orientation, first files to inspect, minimum reproduction path
- [`docs/EXTERNAL_AUDIT_SETUP.md`](docs/EXTERNAL_AUDIT_SETUP.md) - cross-platform setup, dependencies, package generation, and pin instructions

## Scope

- React/runtime implementation in `src/`
- Simulation and operational model modules in `src/simulation/`
- Admissibility, episode harness, ROEO, SNO, and negative controls in `src/experiments/`
- Claim and invariant mapping in `src/canon/`
- Serverless control plane in `netlify/functions/`
- Versioned configuration in `config/`
- Reproducible tests in `tests/`

Legacy compatibility code still exists in `js/api/` because `services/` depends on it. It is not the primary source of truth.

## Install

```powershell
npm ci
Copy-Item .env.example .env
```

Populate `.env` only with local secrets. For deployment, prefer platform-managed environment variables.

## Run

```powershell
npm run verify:source-of-truth
npm run build
npm run start:local
```

If you need Netlify Functions locally, use the Netlify CLI with the same environment contract from `.env.example`.

## Quick Start

```powershell
npm ci
npm run build
npm run start:local
```

Open `http://localhost:3000` after the local server starts.

## Test

```powershell
npm run verify:source-of-truth
npm test
npm run build
npm run scoreboard:run
```

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the post-split runtime
map, component boundaries, and evidence-layer separation.

## Verification

Core gates:

```powershell
npm run verify:source-of-truth
npm run verify:descriptor-registry
npm run verify:repro-bridge
npm test
npm run test:coverage
npm run build
npm run scoreboard:run
npx eslint src/ --max-warnings=50
```

Additional scoped verification commands exist for subjectivity, phenomenal
bridge, comparative program, stage-3 readiness, and policy surfaces. Those
commands remain internal support gates unless an external campaign explicitly
closes them.

## What This Repository Does Not Claim

- It does not claim external validation, independent replication, or publication readiness by itself.
- It does not claim that internal runtime support is equivalent to claim closure.
- It does not claim consciousness, subjective phenomenology, or identity beyond what is operationally defined and tested.
- It does not claim deployment security beyond the configurations, defaults, and tests explicitly verified in this repository.

## Epistemic Posture

See [`docs/EPISTEMIC_POSTURE.md`](docs/EPISTEMIC_POSTURE.md).

This repository treats invariants as computational estimators and keeps ontology, mathematical model, implementation, language, and interpretation separate. Internal statuses such as `ROBUST_INTERNAL_SUPPORT`, `PROVISIONAL_SUPPORT`, and `SCAFFOLD_AWAITING_DATA` do not imply external validation.

ANTI-FREEZE warm-up values for `beth_q` and `spectral_gap` are engineering safeguards during short-history startup. They must not be reported as strict BaseCore estimators until enough runtime history exists.

## Selected Repository Policy

- Version by default: source, required configuration, reproducible scripts, tests, and engineering docs.
- Exclude by default: secrets, caches, build outputs, conversation exports, sensitive datasets, and non-reproducible artifacts.
- Review manually: ambiguous legacy files, external corpus references, and any path that mixes theory with runtime.


## Current stabilization audit

See [the 2026-11-05 runtime audit](docs/RUNTIME_STABILIZATION_AUDIT_2026-11-05.md) for local/remote provenance, reproduced defects, verification and remaining limits.

`npm start` and `npm run start:local` serve the built `dist` directory on loopback. Build first. They do not serve repository files or emulate a verified Netlify Identity session. For private authenticated use, run through a verified platform Identity context; disabling auth is an explicit local development choice.

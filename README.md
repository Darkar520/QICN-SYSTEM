# QICN Runtime Engineering Repository

## Purpose

This repository contains the operational implementation of the system, its runtime verification surface, and its engineering controls. It is intentionally separate from any frozen theoretical or canonical corpus.

The goal of this repository is development, testing, auditability by commit and pull request, and traceability from internal claims to metrics, modules, and tests.

## External Audit Entry Point

If you are a third-party auditor, start here:

- [`docs/EXTERNAL_AUDIT_QUICKSTART.md`](docs/EXTERNAL_AUDIT_QUICKSTART.md) — audit orientation, first files to inspect, minimum reproduction path
- [`docs/EXTERNAL_AUDIT_SETUP.md`](docs/EXTERNAL_AUDIT_SETUP.md) — cross-platform setup, dependencies, package generation, and pin instructions

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

## Test

```powershell
npm run verify:source-of-truth
npm test
npm run build
npm run scoreboard:run
```

## What This Repository Does Not Claim

- It does not claim external validation, independent replication, or publication readiness by itself.
- It does not claim that internal runtime support is equivalent to claim closure.
- It does not claim consciousness, subjective phenomenology, or identity beyond what is operationally defined and tested.
- It does not claim deployment security beyond the configurations, defaults, and tests explicitly verified in this repository.

## Selected Repository Policy

- Version by default: source, required configuration, reproducible scripts, tests, and engineering docs.
- Exclude by default: secrets, caches, build outputs, conversation exports, sensitive datasets, and non-reproducible artifacts.
- Review manually: ambiguous legacy files, external corpus references, and any path that mixes theory with runtime.

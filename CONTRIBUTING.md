# Contributing

This repository is the operational QICN runtime baseline. Contributions must
preserve the distinction between implementation support, internal gates, claim
projections, and external validation.

## Setup

```powershell
git clone https://github.com/sickn33/QICN-SYSTEM.git
Set-Location QICN-SYSTEM
npm ci
Copy-Item .env.example .env
```

Use Node 20.x, matching `package.json`. Populate `.env` only with local secrets.
Do not commit secrets, generated caches, or local operator prompts.

## Verification

Before opening a pull request, run:

```powershell
npm run verify:source-of-truth
npm run verify:descriptor-registry
npm test
npm run build
npm run scoreboard:run
```

For coverage:

```powershell
npm run test:coverage
```

Avoid running `npm run test:coverage` and `npm run scoreboard:run` at the same
time. Both execute the full test runner and can contend with entropy-provider
mock paths.

## Commit Conventions

Use short conventional prefixes:

- `feat`: new capability or supported behavior.
- `fix`: bug fix.
- `refactor`: structure-preserving code movement.
- `docs`: documentation only.
- `test`: tests or test harnesses.
- `ci`: CI/CD and hooks.
- `chore`: housekeeping without behavioral change.

## Adding A Test

1. Add a `*.test.js` file under `tests/`.
2. Use Node's built-in `assert` unless the existing local test suggests another
   pattern.
3. Keep tests deterministic and avoid external services unless explicitly mocked.
4. If a test changes a direct signal, artifact contract, gate result, or claim
   mapping, update the relevant docs listed in `AGENTS.md`.
5. Run `npm test` and the nearest targeted test command before committing.

## Adding A Canon Module

1. Place canon logic under the appropriate `src/canon/` subfolder.
2. Export only stable public functions from `src/canon/index.js`.
3. Add or update tests that import the public API.
4. Update `docs/API_SURFACE.md` if the API is intended for callers.
5. Do not modify `src/canon/calibration/heuristic_frozen_v1.json` unless a
   separate calibration governance task explicitly authorizes it.

## Evidence Discipline

- Internal tests and scoreboards are internal support, not external validation.
- Derived artifacts must not be presented as runtime-primary evidence.
- Runtime health, logs, and CI status are operational diagnostics, not scientific
  claim closure.

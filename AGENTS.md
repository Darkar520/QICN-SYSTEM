# Agent Operating Notes

## Navigation

- `src/` is the runtime source of truth.
- `src/canon/` contains claim, invariant, boundary, threshold, substrate, and provenance logic.
- `src/experiments/` contains admissibility, episode harness, ROEO, SNO, negative controls, and intervention scheduling.
- `src/simulation/` contains operational simulation modules used by the runtime and tests.
- `netlify/functions/` contains the server-side control plane.
- `tests/` contains reproducible verification.
- `config/` contains versioned preregistration-style configuration.
- `js/api/` is a legacy compatibility layer still used by `services/`. Do not remove it without a migration.

## Install And Verification Commands

```powershell
npm ci
npm run verify:source-of-truth
npm test
npm run build
npm run scoreboard:run
```

## Change Rules

- Preserve separation between theory, mathematical model, implementation, configuration, documentation, and generated artifacts.
- Do not commit generated outputs, local caches, logs, or secrets.
- Do not relax auth or selfpatch defaults silently.
- If you change a metric contract, update the relevant tests in the same change set.
- If you change a claim mapping or operational definition, update `docs/TRACEABILITY_MATRIX.md` and `docs/IMPLEMENTATION_STATUS.md`.
- Mark metaphorical, speculative, or non-falsifiable language explicitly as non-operational or replace it with measurable definitions.
- Report contradictions, circular definitions, missing controls, missing tests, and external evidence gaps.

## Source Of Truth Files

- Runtime entry: `src/index.jsx`
- Build authority: `build.cjs`
- Path policy: `src/canon/sourceOfTruth.js`
- Claim catalog: `src/canon/claimMapping/canonicalClaimCatalog.js`
- Claim projection: `src/canon/claimMapping/runtimeClaimMapping.js`
- Admissibility gate: `src/experiments/AdmissibilityEngine.js`
- Episode harness: `src/experiments/ExperimentalEpisodeHarness.js`
- Negative controls: `src/experiments/negative_controls_runner.js`
- ROEO and SNO: `src/experiments/roeo_signature.js`, `src/experiments/sno_discriminator.js`
- Pre-registered config surfaces: `config/interventions/`, `config/roeo/`

## Reporting Standard

When you report status or risk, distinguish explicitly between:

- implemented and tested
- implemented but only internally supported
- partially implemented
- formalized but not implemented
- external evidence required
- not verified

Never promote internal support to external validation.

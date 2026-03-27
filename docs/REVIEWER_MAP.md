# Reviewer Map

This document is a navigation aid for an external auditor arriving at `QICN-SYSTEM`
for the first time. It answers: what is here, what produces what, and how to read
the system without getting lost.

## Non-claim boundary

This document describes repository structure and script families. It does not
constitute external validation, theory confirmation, or claim closure.

---

## Repository structure overview

```
QICN-SYSTEM/
  src/                   — React/runtime implementation (primary source of truth)
    src/simulation/      — operational model modules (sensory, cognitive, motor, etc.)
    src/experiments/     — admissibility, episode harness, ROEO, SNO, negative controls,
                           output policies
    src/canon/           — claim and invariant mapping, source-of-truth policy
    src/utils/           — runtime parameter registry and utilities
  config/                — versioned pre-registered configuration (interventions, ROEO)
  scripts/               — all operational scripts: verification, evaluation, campaign,
                           build, release
  tests/                 — 90+ reproducible test files, entry point: tests/run-all-tests.cjs
  docs/                  — governance, evaluation, external audit, ecosystem docs,
                           JSON registries
  netlify/               — serverless control plane (operational surfaces, not evidence)
  js/api/                — legacy compatibility layer (still used by services/, NOT primary)
  services/              — depends on js/api/ compatibility layer
  sandbox/               — local development tooling (NOT part of audit surface)
  .github/workflows/     — CI pipeline: ci.yml
```

---

## Key script families (what produces what)

| Family | Scripts | What they produce |
|---|---|---|
| **Verification** | `verify-source-of-truth`, `verify-artifacts`, `verify-operational-readiness`, `verify-evaluation-protocol`, `verify-evaluation-metrics`, `verify-evaluation-comparisons`, `verify-env-contract`, `validate-descriptor-registry` | PASS/FAIL verdicts over internal contracts |
| **Evaluation** | `run-protocolized-evaluation`, `run-execution-campaign`, `evaluate-canon-runtime`, `evaluate-admissibility`, `evaluate-roeo` | execution artifacts, campaign readouts, claim projections |
| **Campaign audit** | `audit-execution-campaign` | audit readout over a campaign batch |
| **Build/release** | `build-external-audit-package`, `build-ecosystem-release-candidate`, `build-internal-release-bundle` | packaged handoff artifacts |
| **Operational smoke** | `run-operational-smoke-suite` | smoke pass/fail over critical operational path |
| **Scoreboard** | `scoreboard` | summary scorecard over the latest evaluation state |

All scripts are invoked via `npm run <script>` (see `package.json` for exact aliases).

---

## How to read the system without getting lost

1. **Start with `docs/EXTERNAL_AUDIT_QUICKSTART.md`** — the audit path entry point.
2. **Read `docs/OPERATIONAL_READINESS.md`** — canonical commands and operational surfaces.
3. **Read this document** (REVIEWER_MAP) — module and script orientation.
4. **Inspect `docs/ECOSYSTEM_BASELINE.md` and `docs/ECOSYSTEM_FREEZE_BASELINE.md`** —
   the frozen baselines that anchor the audit.
5. **Inspect `docs/PROTOCOLIZED_EVALUATION_PROTOCOL.md`** — evaluation architecture.
6. **Inspect `docs/ADMISSIBILITY_GATES_AND_NEGATIVE_CONTROLS.md`** — gating logic and
   negative control design.
7. **Inspect `docs/TRACEABILITY_MATRIX.md`** — claim-to-test mapping.

---

## What NOT to over-read

- **Module names** such as "phenomenological", "ontological", or "qualia" are
  operational labels for internal subsystems. They are NOT philosophical claims.
  See `docs/GLOSSARY_OPERATIONAL.md` for the reading rules.
- **`services/` and `js/api/`** are legacy compatibility layers. They are NOT the
  primary source of truth for the runtime.
- **`sandbox/`** is local development tooling. It is NOT part of the audit surface.
- **`netlify/functions/`** are operational control surfaces (`selfpatch`, `llm-proxy`,
  `quantum-entropy`, `runtime-health`, `killswitch-state`). They are NOT scientific
  evidence surfaces.

---

## Companion repository

The canonical corpus, frozen PDFs, claim registry, and canonical glossary live in a
separate repository:

- **QUICN-RELEASE**: `https://github.com/Darkar520/QUICN-RELEASE`

Key entry points in QUICN-RELEASE:

| File | Role |
|---|---|
| `release/GLOSSARY_CANONICAL.v1.md` | Canonical glossary for corpus terms |
| `docs/CLAIM_REGISTRY.md` | Claim registry |
| `docs/CANON_SOURCE_OF_TRUTH.md` | Canon source-of-truth boundary |

---

## Artifact flow summary

```
src/ (runtime implementation)
  ↓
scripts/run-protocolized-evaluation.cjs  →  ticks.ndjson, run_summary.json, run_verdict.json
  ↓
scripts/audit-execution-campaign.cjs     →  execution_campaign_audit_readout.json
  ↓
scripts/build-ecosystem-release-candidate.cjs  →  ecosystem_release_candidate_manifest.json
  ↓
scripts/build-external-audit-package.cjs       →  external_audit_package_manifest.json,
                                                   external_audit_status.json
```

Primary artifacts (run-level): `run_header.json`, `ticks.ndjson`, `run_summary.json`,
`run_verdict.json`.

Batch-level primary artifacts: `operational_equivalence.json`, `sno_report.json`,
`negative_controls_report.json`, `roeo_enforcement_report.json`.

Derived audit-relevant artifacts: `invariant_package.json`,
`claim_mapping_snapshot.json`, `eo_report.json`, and others documented in
`docs/DESCRIPTOR_REGISTRY.md`.

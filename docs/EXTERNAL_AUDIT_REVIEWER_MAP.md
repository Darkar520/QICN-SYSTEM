# External Audit Reviewer Map

**Purpose:** Help a competent external auditor navigate QICN-SYSTEM and
QICN-RELEASE without relying on private context. Read this before opening any
other file.

---

## 1 - What you are auditing

Two repositories compose the QICN ecosystem:

| Repo | Role | Authority |
| --- | --- | --- |
| `QICN-SYSTEM` | Operational runtime, verification surface, enforcement gates | Runtime code, artifacts, CI, execution campaigns |
| `QICN-RELEASE` | Canonical theoretical corpus, claim registry, freeze governance | PDF corpus, freeze manifests, claim registry |

Neither repo validates the other. The runtime does not prove the theory. The
theory does not validate the runtime. The boundary is explicit and enforced.

---

## 2 - Start here (mandatory order)

1. **`artifacts/external_audit_package/external_audit_package_manifest.json`**
   - pinned SHAs for both repos; all authority flows from here
2. **`docs/EXTERNAL_AUDIT_QUICKSTART.md`**
   - scope, non-claims, and reproduction path
3. **`artifacts/external_audit_package/external_audit_status.json`**
   - package readiness flag
4. **`docs/EXTERNAL_AUDIT_SETUP.md`**
   - exact clone layout and commands to run
5. **`docs/EXTERNAL_AUDIT_TECHNICAL_PATH.md`**
   - full audit path, artifact list, invalidation triggers
6. **`docs/EXTERNAL_AUDIT_GLOSSARY.md`**
   - term definitions

Do not start by reading `src/`. Do not start by reading the corpus. Start from
the manifest.

---

## 3 - Key modules in QICN-SYSTEM and what they produce

| Path | What it does | Primary artifact |
| --- | --- | --- |
| `src/experiments/ExperimentalEpisodeHarness.js` | Runs a single episode, records tick-level signals | `ticks.ndjson`, `run_header.json`, `run_summary.json` |
| `src/experiments/AdmissibilityEngine.js` | Evaluates run-level admissibility | `run_verdict.json` |
| `src/experiments/roeo_signature.js` | Computes EO-scalar and signature for the batch | `eo_report.json` |
| `src/experiments/ROEOEnforcer.js` | Enforces batch-level ROEO gate | `roeo_enforcement_report.json` |
| `src/experiments/SNOEngine.js` | Evaluates statistical non-obviousness | `sno_report.json` |
| `src/experiments/NegativeControlBatch.js` | Runs and evaluates negative controls | `negative_controls_report.json` |
| `src/canon/invariants/CanonicalInvariantPackage.js` | Assembles runtime invariant package | `invariant_package.json` |
| `src/canon/claims/runtimeClaimMapping.js` | Maps invariants to claim-projection paths | `claim_mapping_snapshot.json`, `runtime_claim_projection.json` |
| `src/simulation/` | Runtime modules exercised by the UI and tests | no primary audit artifact; see tests |
| `netlify/functions/` | Operational control surfaces, not scientific evidence | no primary audit artifact |
| `scripts/verify-*.cjs` | Verification scripts for source-of-truth, artifacts, and evaluation phase | console output |
| `scripts/audit-execution-campaign.cjs` | Campaign-level audit | console output |
| `scripts/run-ecosystem-node.cjs` | Ecosystem-level runner | routes to ecosystem scripts |

---

## 4 - Artifact hierarchy

```text
external_audit_package_manifest.json
  external_audit_status.json
  internal_red_team_report.json
  ecosystem_candidate/
    ecosystem_release_candidate_manifest.json
    ecosystem/manifests/
      execution_campaign_audit_readout.json
      ecosystem_verification_matrix.json
      ecosystem_gap_register.v1.json
    release/manifests/
      release_freeze_manifest.json
      claim_registry.v1.json
  system_authoritative/
    frozen_primary/
    latest_accepted_comparable/
    invalid_historical_attempt/
```

---

## 5 - Three campaign slots explained

| Slot | What it is | How to use it |
| --- | --- | --- |
| `frozen_primary` | The fixed operational baseline campaign. Immutable. | Compare all comparables against this. |
| `latest_accepted_comparable` | The most recent campaign accepted under the same frozen architecture. Must have `freezeable=true`. | This is the current evidence floor. |
| `invalid_historical_attempt` | A campaign that failed admissibility. Preserved intentionally. | Confirm that rejection logic is explicit and non-authoritative status is clear. |

The `latest_campaign_pointer.json` is routing metadata only: mutable, not
authoritative. Do not use it as a frozen reference.

---

## 6 - What CI covers in QICN-SYSTEM

CI runs on every push to `main` via `.github/workflows/ci.yml`. It covers:

- `npm ci`
- `npm run verify:source-of-truth`
- `npm run verify:descriptor-registry`
- `npm run verify:operational-readiness`
- `npm run build`
- `npm run smoke:operational`
- `npm test`
- selfpatch policy check

CI passing means the repo is internally consistent at that commit. It does not
mean a campaign ran, an ecosystem candidate was built, or an external audit
passed.

---

## 7 - What CI does not cover

CI does not run:

- `npm run verify:ecosystem-integrity` because it requires the release repo
  sibling
- `npm run audit:campaign` because it requires artifacts from a campaign run
- `npm run verify:evaluation-phase` because it requires evaluation artifacts
- QICN-RELEASE verification scripts

These must be run manually by the auditor following
`docs/EXTERNAL_AUDIT_SETUP.md`.

---

## 8 - QICN-RELEASE structure

| Path | What it is |
| --- | --- |
| `corpus/pdf_release/` | Immutable PDF corpus, zip plus SHA256 |
| `release/CANON_MAP.v1.json` | Canonical selection metadata |
| `release/claim_registry.v1.json` | Machine-readable claim registry |
| `release/release_freeze_manifest.json` | Canonical freeze manifest |
| `release/system_interface_boundary.v1.json` | Boundary between theory and runtime |
| `docs/CLAIM_REGISTRY.md` | Human-readable claim registry guide |
| `docs/CANON_SOURCE_OF_TRUTH.md` | Canonical freeze reference and interpretation |
| `release/_non_canonical/` | Excluded materials, not source-of-truth, not theorem-bearing |

---

## 9 - Hard reading rules

1. **`PASS` inside this ecosystem != external validation.** No external reviewer
   has validated this system yet.
2. **`frozen` = immutable boundary.** It does not mean peer-reviewed or
   empirically confirmed.
3. **`blocked` output = internal evidence only.** Never treat it as claim-safe.
4. **Module names like `CognitionEngine`, `PhenomenologicalMapper` are
   operational labels** matching framework terminology. They are not
   philosophical claims.
5. **`implementation_status` != `run_verdict` !=
   `paper_level_equivalent_status`.** These are three separate layers. Do not
   collapse them.
6. **The claim registry classifies claims.** It does not authorize them or
   close them.
7. **The corpus freeze is a traceable boundary.** It does not mean the
   theoretical framework is empirically confirmed.

---

## 10 - Where to record findings

Use the format defined in `docs/EXTERNAL_AUDIT_FINDINGS_SCHEMA.md`:

- `finding_id`
- `audit_session_id`
- `auditor_profile`
- `severity`: `blocker` | `material_issue` | `note` | `no_issue`
- `location` with exact file, command, or artifact path
- `reproduction_steps`
- `observed_behavior`
- `expected_behavior`
- `boundary_risk`
- `minimal_correction`

The handoff operator should use `docs/EXTERNAL_AUDIT_HANDOFF_PROTOCOL.md` for
delivery and `docs/EXTERNAL_AUDIT_INTAKE_AND_TRIAGE.md` for post-delivery
classification.

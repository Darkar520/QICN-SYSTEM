# External Audit Glossary

**Purpose:** Operational term definitions for a competent external auditor. These are engineering and governance terms. They are not ontological claims.

---

## Core terms

### baseline
The fixed reference point for an execution campaign or ecosystem state. The primary baseline is the `frozen_primary` campaign. The ecosystem baseline is defined by `artifacts/ecosystem_release_candidate/ecosystem_release_candidate_manifest.json`. A baseline does not imply external validation.

### freeze / canonical freeze
The act of fixing an artifact, campaign, or corpus boundary at a specific commit/tag so it becomes immutable for the purposes of comparison and auditing. In `QUICN-RELEASE`, the canonical freeze is pinned by tag `canonical-freeze-2026-03-01` at commit `2d7504be95ca33af5941e30abf7059dc2774edca`. Freeze means traceable boundary — it does not mean externally validated or empirically confirmed.

### candidate
The current ecosystem release candidate: a bounded snapshot of both repos at a specific state, assembled by `npm run release:ecosystem-candidate`. Status is `PASS` or `FAIL`. A `PASS` candidate is internally consistent; it is not an external validation verdict.

### comparable campaign
An execution campaign run under the same frozen architecture as the primary baseline, for the purpose of internal comparison. The latest accepted comparable is `system_authoritative/latest_accepted_comparable/`. It must have `freezeable=true` and `batch_status=PASS` to be accepted. It is not a replication.

### invalid attempt
A historical campaign that failed admissibility or was explicitly rejected. Preserved under `system_authoritative/invalid_historical_attempt/` for transparency and rejection traceability. It is non-authoritative by design.

### audit readout
A structured per-condition and per-batch summary produced at the end of a campaign run. Lives in `execution_campaign_audit_readout.json`. It is an internal evidence artifact, not an external publication output.

---

## Evidence and gate terms

### ROEO (Runtime Outcome Enforcement Oracle)
The batch-level gate that evaluates whether a campaign meets the pre-registered criteria for paper-level admissibility. Produces `roeo_enforcement_report.json`. A `PAPER_ADMISSIBLE` result from ROEO is an internal enforcement verdict. It is not external scientific validation.

### SNO (Statistical Non-Obviousness)
A gate that evaluates whether the observed pattern in a campaign differs from what would be expected under a null model. Produces `sno_report.json`. SNO pass is a precondition for paper-level admissibility, not a publication-ready result.

### support label
An internal classification attached to a runtime output indicating the strength of internal evidence. Examples: `under_evaluation`, `limited_claim_support`, `strong_internal_support`. These are consumption governance signals, not external validation certificates. Do not read them as external evidence grades.

### paper-level equivalent status
The field `roeo_enforcement_report.json.batch_status`. Values: `PAPER_ADMISSIBLE` or `NOT_PAPER_ADMISSIBLE`. This is the output of the internal ROEO enforcement gate. It is an internal disciplinary standard. It does not mean a paper was submitted, peer-reviewed, or accepted.

### run verdict
The field `run_verdict.json.status`. Values: `ADMISSIBLE`, `DISCARDED`, `TAMPERED`. This is a run-level admissibility evaluation over recorded artifacts. It does not imply paper-level status.

### implementation status
The field describing the repository inventory state of a module or layer. Values: `implemented_tested`, `implemented_internal_support`, `partial_runtime_path`, `high_risk_control_surface`. It describes what exists in the repo — not whether a run passed or whether an external audit approved it.

---

## Surface and output terms

### blocked outputs
Outputs explicitly blocked for claim-facing use. Blocking is enforced by `OutputConsumptionPolicy.js`, `OutputSurfacePolicy.js`, and `OutputSurfaceEnforcer.js`. Blocked outputs may still appear in audit artifacts — they must be read as internal evidence only, never as claim-safe outputs. See `docs/EXTERNAL_AUDIT_TECHNICAL_PATH.md` for the full blocked list.

### surfaces
The set of scripts, modules, and APIs that expose runtime outputs for consumption. Defined in `docs/OPERATIONAL_READINESS.md`. Surfaces have consumption policy attached. They are not claim-authorization surfaces.

### canonical corpus
The immutable PDF corpus in `QUICN-RELEASE/corpus/pdf_release/`, enumerated by `release/CANON_MAP.v1.json` and `release/INDEX_PDFS.json`. It is the theoretical source material. It is not validated by the runtime.

---

## Ecosystem boundary terms

### ready for external audit
The status `READY_FOR_EXTERNAL_AUDIT` in `external_audit_status.json` means the internal package is prepared for handoff to an external reviewer. It does not mean external review has occurred, is underway, or has returned a verdict.

### internal vs external validation
Internal validation: verification that the system runs, artifacts are consistent, and gates pass — all within this repository and ecosystem.  
External validation: independent review, replication, or peer review by parties outside this project. **This ecosystem has not yet been externally validated.** The package is prepared for that step; the step itself has not been taken.

### not executed externally
Any result labeled `NOT_EXECUTED_EXTERNALLY` or described as "internal pass" means the evaluation was conducted entirely within the QICN ecosystem. No independent third-party has replicated it.

### latest routing metadata
`system_authoritative/latest_campaign_pointer.json` is routing metadata: it points to the current latest accepted comparable for convenience. It is mutable and not a frozen authority. Always use the explicit frozen paths when frozen authority is required.

---

## Reading rules for an auditor

1. An internal `PASS` is not an external `PASS`.
2. A `frozen` artifact is immutable for purposes of this package — it does not mean peer-reviewed.
3. A `blocked` output is informational context, not claim evidence.
4. A `support label` is a consumption control, not a scientific grade.
5. Terms like "cognitive emergence", "phenomenological", "subjective" in module names are **operational labels**, not philosophical claims. Read them as engineering identifiers that match the theoretical framework terminology — nothing more.
6. The presence of a module does not imply that the module's named property has been externally established.
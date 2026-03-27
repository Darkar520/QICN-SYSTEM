# Operational Glossary

This glossary defines runtime and audit terms used throughout the QICN-SYSTEM
documentation. Definitions are intentionally short and operational. For
corpus-level or theoretical terminology, see
`release/GLOSSARY_CANONICAL.v1.md` in `QUICN-RELEASE`.

## Non-claim boundary

Term definitions here describe operational behavior and audit conventions. They
do not constitute claim closure, external validation, or philosophical positions.

---

## Terms

**admissibility gate**
A runtime check that an episode or output meets minimum quality and validity
criteria before being included in results. Implemented in
`src/experiments/AdmissibilityEngine.js`. The authoritative gate result is
`run_verdict.json.status`.

**audit readout**
The summary output of an execution campaign audit. Produced by
`scripts/audit-execution-campaign.cjs`. Not equivalent to external validation.

**baseline**
A pinned commit SHA representing a known-good state of a repository. Two baselines
are relevant: `qicn_system.head` (this repo) and `qicn_release.head`
(QUICN-RELEASE). Baselines are listed in the external audit package manifest.

**blocked outputs**
Runtime outputs that exist as artifacts but are blocked from claim-facing use by
output support label policy. Blocking is enforced at the policy layer. Blocked
outputs must not be treated as claim evidence.

**candidate**
An ecosystem release candidate that has passed all internal verification gates.
Produced by `scripts/build-ecosystem-release-candidate.cjs`. Candidate status is
`PASS` or not-PASS; it does not imply external validation.

**canonical corpus**
The frozen set of theoretical PDFs and their associated metadata in QUICN-RELEASE.
The canonical corpus is the external formal authority boundary for theoretical
claims. It is not inside QICN-SYSTEM.

**comparable campaign**
An execution campaign run under the same frozen evaluation architecture as the
primary campaign, used for comparison against the primary baseline. A "latest
accepted comparable" is a comparable campaign that has passed admissibility and
ROEO enforcement.

**ecosystem integrity**
Cross-repo consistency between QICN-SYSTEM and QUICN-RELEASE at the pinned SHAs
listed in the external audit package manifest. Verified by
`npm run verify:ecosystem-integrity` (requires both repos to be present locally).

**execution campaign**
A structured batch execution of the protocolized evaluation under controlled
conditions. Produces primary batch artifacts including `operational_equivalence.json`,
`sno_report.json`, `negative_controls_report.json`, and
`roeo_enforcement_report.json`.

**freeze / frozen**
A state where a document, branch, or artifact set is locked against modification.
Frozen artifacts are treated as the authoritative record for their execution layer.
The word "frozen" in a document name indicates that document records a snapshot
taken at a specific point in time.

**internal vs external validation**
- *Internal validation*: all verification done entirely within this ecosystem
  (QICN-SYSTEM + QUICN-RELEASE). This is the scope of all scripts in this repo.
- *External validation*: independent third-party review by a party outside this
  ecosystem. **External validation has not occurred.** This ecosystem is
  ready for external audit handoff; it has not been externally validated.

**invalid attempt**
A historical execution that was rejected by the admissibility gate or was otherwise
found to be non-authoritative. Preserved as a negative reference. Must not be
treated as evidence. Explicitly labeled non-authoritative in the audit package.

**negative control**
A test designed to confirm that the system correctly rejects invalid, degenerate,
or disqualifying inputs. Negative control results are in `negative_controls_report.json`.
Negative control logic is in `src/experiments/negative_controls_runner.js`.

**paper-level equivalent status**
Internal assessment that an artifact batch has reached a level of rigor comparable
to a formal academic paper (structured protocol, controls, admissibility gates,
ROEO enforcement). This is an internal designation. It is NOT equivalent to peer
review, publication, or external validation.

The machine-readable field is `roeo_enforcement_report.json.batch_status`. Possible
values: `PAPER_ADMISSIBLE`, `NOT_PAPER_ADMISSIBLE`.

**ready for external audit**
The handoff package is complete, all internal gates pass, and a competent external
reviewer can reproduce and inspect the ecosystem. This designation does NOT mean
external audit has been performed or that claims have been externally validated.

**ROEO**
Runtime Observable Evaluative Output. A machine-readable operational readout from
the system produced at the end of an evaluation episode. Aggregated and enforced
at the batch level by `src/experiments/roeo_signature.js`. The enforcement report
is `roeo_enforcement_report.json`.

**SNO**
Structured Negative Output. Outputs produced by negative control tests, confirming
the system correctly handles disqualifying conditions. Produced by
`src/experiments/sno_discriminator.js`. Results are in `sno_report.json`.

**source of truth**
The single authoritative location for a given piece of data or configuration.
Runtime source of truth: `src/`. Path policy: `src/canon/sourceOfTruth.js`.
Verified by `npm run verify:source-of-truth`.

**support labels**
Metadata labels attached to outputs indicating their evidential status. Key labels:
`under_evaluation`, `supported`, `blocked`. Blocked labels mean the output is
excluded from claim-facing use. Policy is enforced by output policy tests in
`tests/output-support-labels.v65.test.js` and related files.

**surfaces**
The set of outputs, interfaces, or execution paths exposed by a module or the
system. Operational surfaces (such as `netlify/functions/`) are not scientific
evidence surfaces.

---

## Reading rules

1. **Names are operational labels, not ontological claims.** Module names such as
   "phenomenological", "qualia", or "ontological" are identifiers for internal
   subsystems. They do not assert philosophical positions about consciousness,
   experience, or identity.

2. **"PASS" means internal verification passed.** A `PASS` result from any
   verification script or gate means the internal contract was satisfied. It does
   not mean external validation, independent replication, or publication readiness.

3. **"supported" does not mean "proven".** A `supported` output label means the
   output passed internal quality and admissibility criteria. It does not mean
   the underlying claim has been externally confirmed.

4. **Frozen docs record a moment in time.** A document named `*_FREEZE_BASELINE*`
   or `*_FREEZE*` records the state at a specific point. Check the external audit
   package manifest for the authoritative pinned SHAs.

5. **Derived artifacts are not primary evidence.** Artifacts such as
   `invariant_package.json`, `claim_mapping_snapshot.json`, and `eo_report.json`
   are derived from primary runtime artifacts. Do not treat them as independent
   runtime evidence.

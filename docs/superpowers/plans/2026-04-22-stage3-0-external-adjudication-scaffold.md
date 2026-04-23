# Stage3-0 External Adjudication Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open Stage3-0 as a governed external-adjudication architecture layer and create Paper 10 only as a scaffold-only manuscript surface without opening claims, verdicts, or public release surfaces.

**Architecture:** Extend the existing `src/comparative_program/` architecture instead of creating a parallel subsystem. Preserve the current Stage 2-M4 and Stage3-RF semantics, then add a downstream Stage3-0 governance pack: protocol docs, machine-readable manifests, scaffold-only runtime registries, bounded internal artifacts, a scaffold-only Paper 10 source tree, and a dedicated verifier that enforces non-claims and surface discipline.

**Tech Stack:** Node 20, CommonJS verification/build scripts, ESM runtime registries under `src/comparative_program/`, JSON manifests/schemas, LaTeX scaffold source for Paper 10.

---

## File Map

### Create

- `docs/superpowers/plans/2026-04-22-stage3-0-external-adjudication-scaffold.md`
- `docs/EXTERNAL_ADJUDICATION_PROGRAM.md`
- `docs/EXTERNAL_EVIDENCE_ADMISSIBILITY.md`
- `docs/HUMAN_COMPARATOR_EXECUTION_PROGRAM.md`
- `docs/STAGE3_EXTERNAL_ADJUDICATION_BOUNDARY.md`
- `docs/STAGE3_IMPLEMENTATION_PLAN.md`
- `docs/STAGE3_NONCLAIMS.md`
- `docs/STAGE3_SURFACE_POLICY.md`
- `docs/PAPER10_SCAFFOLD_PLAN.md`
- `docs/external_adjudication_protocol.v1.json`
- `docs/external_evidence_admissibility_criteria.v1.json`
- `docs/human_comparator_execution_protocol.v1.json`
- `docs/stage3_surface_policy.v1.json`
- `docs/stage3_artifact_schema.v1.json`
- `docs/paper10_scaffold_manifest.v1.json`
- `src/comparative_program/ExternalAdjudicationProtocolRegistry.js`
- `src/comparative_program/ExternalEvidenceAdmissibilityRegistry.js`
- `src/comparative_program/HumanComparatorExecutionProtocolRegistry.js`
- `src/comparative_program/Stage3SurfacePolicy.js`
- `src/comparative_program/Stage3ArtifactRegistry.js`
- `src/comparative_program/Paper10ScaffoldRegistry.js`
- `src/comparative_program/Stage3Layer.js`
- `src/comparative_program/schemas/external_adjudication_manifest.v1.json`
- `src/comparative_program/schemas/external_adjudication_readiness_gate.v1.json`
- `src/comparative_program/schemas/external_evidence_admissibility_assessment.v1.json`
- `src/comparative_program/schemas/human_comparator_execution_plan.v1.json`
- `src/comparative_program/schemas/paper10_scaffold_status.v1.json`
- `src/comparative_program/schemas/stage3_verification_matrix.v1.json`
- `scripts/build-stage3-scaffolding.cjs`
- `scripts/verify-stage3-scaffolding.cjs`
- `paper10_external_adjudication_and_human_comparators/main.tex`
- `paper10_external_adjudication_and_human_comparators/paper10_local_references.bib`
- `paper10_external_adjudication_and_human_comparators/PAPER10_SECTION_STATUS.md`
- `paper10_external_adjudication_and_human_comparators/PAPER10_CLAIM_BOUNDARY.md`
- `paper10_external_adjudication_and_human_comparators/PAPER10_EVIDENCE_REQUIREMENTS.md`

### Modify

- `package.json`
- `docs/HUMAN_COMPARATOR_PROGRAM.md`
- `docs/EXTERNAL_ADJUDICATION_OPENING_CRITERIA.md`
- `docs/external_adjudication_opening_criteria.v1.json`
- `docs/PAPER10_COMPARATIVE_PREREQUISITES.md`
- `docs/PAPER9_HANDOFF_ALIGNMENT.md`
- `docs/PAPER9_PREREQUISITES.md`
- `docs/COMPARATIVE_PROGRAM_NONCLAIMS.md`
- `docs/COMPARATIVE_PROGRAM_SURFACE_POLICY.md`
- `docs/comparative_program_surface_policy.v1.json`
- `docs/IMPLEMENTATION_STATUS.md`
- `docs/CANON_SOURCE_OF_TRUTH.md`
- `src/comparative_program/Paper10ComparativeReadinessGateBuilder.js`
- `src/comparative_program/Paper9HandoffAlignmentEvaluator.js`
- `src/comparative_program/ComparativeProgramLayer.js`
- `src/comparative_program/index.js`

### Emit

- `artifacts/external_adjudication/stage3_0/external_adjudication_manifest.json`
- `artifacts/external_adjudication/stage3_0/external_adjudication_readiness_gate.json`
- `artifacts/external_adjudication/stage3_0/external_evidence_admissibility_assessment.json`
- `artifacts/external_adjudication/stage3_0/human_comparator_execution_plan.json`
- `artifacts/external_adjudication/stage3_0/paper10_scaffold_status.json`
- `artifacts/external_adjudication/stage3_0/stage3_verification_matrix.json`

## Task 1: Freeze the Stage3-0 Contract

**Files:**
- Create: all new `docs/*.md` and `docs/*.json` listed above
- Modify: `docs/HUMAN_COMPARATOR_PROGRAM.md`, `docs/EXTERNAL_ADJUDICATION_OPENING_CRITERIA.md`, `docs/external_adjudication_opening_criteria.v1.json`, `docs/PAPER10_COMPARATIVE_PREREQUISITES.md`

- [ ] Define Stage3-0 as `protocol_defined / not_executed / scaffold_only`.
- [ ] Encode external adjudication object classes, state machine, forbidden transitions, and non-claims.
- [ ] Encode external evidence admissibility classes, invalid substitutes, provenance, independence, controls, and non-implications.
- [ ] Encode human comparator channels, per-channel burden tables, execution states, privacy/ethics notes, and non-implications.
- [ ] Replace any wording that would make a scaffold-only Paper 10 look like a final authorized manuscript.

## Task 2: Wire the Runtime Registry Layer

**Files:**
- Create: new `src/comparative_program/*Registry.js`, `Stage3SurfacePolicy.js`, `Stage3ArtifactRegistry.js`, `Stage3Layer.js`
- Modify: `src/comparative_program/ComparativeProgramLayer.js`, `src/comparative_program/index.js`, `src/comparative_program/Paper10ComparativeReadinessGateBuilder.js`, `src/comparative_program/Paper9HandoffAlignmentEvaluator.js`

- [ ] Load each new Stage3-0 manifest through filesystem-backed registries, matching repo conventions.
- [ ] Expose the governance flags required by the spec:
  - `stage3_open = true`
  - `stage3_0_scaffold_only = true`
  - `external_adjudication_executed = false`
  - `human_comparator_data_present = false`
  - `paper10_scaffold_created = true`
  - `paper10_final_authorized = false`
  - `no_external_validation = true`
  - `no_human_equivalence = true`
  - `no_superiority_claim = true`
  - `no_metaphysical_closure = true`
- [ ] Keep `describeComparativeProgramLayer().current_stage` compatible with existing verification.
- [ ] Rephrase old `paper10_manuscript_absent` logic into scaffold-safe non-authorization logic without weakening claim boundaries.

## Task 3: Add Stage3-0 Schemas and Artifact Emission

**Files:**
- Create: new Stage3-0 schemas under `src/comparative_program/schemas/`
- Create: `scripts/build-stage3-scaffolding.cjs`
- Emit: all `artifacts/external_adjudication/stage3_0/*.json`

- [ ] Create schemas for manifest, readiness gate, admissibility assessment, execution plan, scaffold status, and verification matrix.
- [ ] Build a bounded artifact emitter that records protocol-defined status only.
- [ ] Ensure emitted artifacts declare:
  - external adjudication not executed
  - human comparator data absent
  - Paper 10 scaffold open but not authorized
  - no external validation
- [ ] Ensure zero local path leaks and zero fabricated evidence.

## Task 4: Create the Paper 10 Scaffold

**Files:**
- Create: all `paper10_external_adjudication_and_human_comparators/*`

- [ ] Create a short LaTeX manuscript clearly marked `SCAFFOLD ONLY -- NOT FINAL MANUSCRIPT`.
- [ ] Include scope, dependency map, comparator architecture, admissibility grammar, negative controls, prereg requirements, blocked result sections, readiness ledger, and non-claim ledger.
- [ ] Include explicit blocked/pending markers for all result-bearing sections.
- [ ] Keep the paper source short, governance-first, and non-result-bearing.
- [ ] Attempt local compilation only if feasible without fabricating success.

## Task 5: Update Handoff and Status Surfaces

**Files:**
- Modify: `docs/PAPER9_HANDOFF_ALIGNMENT.md`, `docs/PAPER9_PREREQUISITES.md`, `docs/COMPARATIVE_PROGRAM_NONCLAIMS.md`, `docs/COMPARATIVE_PROGRAM_SURFACE_POLICY.md`, `docs/comparative_program_surface_policy.v1.json`, `docs/IMPLEMENTATION_STATUS.md`, `docs/CANON_SOURCE_OF_TRUTH.md`

- [ ] Point Paper 9 forward to Stage3-0 as downstream governance/scaffold, not adjudication.
- [ ] Add a Stage3-0 row to implementation status.
- [ ] Clarify that QICN-SYSTEM now contains a local scaffold-only Paper 10 source tree that is not part of public release.
- [ ] Preserve release/public boundary discipline.

## Task 6: Add Verification and Execute Gates

**Files:**
- Create: `scripts/verify-stage3-scaffolding.cjs`
- Modify: `package.json`

- [ ] Add `build:stage3-scaffolding` and `verify:stage3-scaffolding`.
- [ ] Check docs, manifests, runtime files, schemas, bounded artifacts, scaffold markers, and banned claim leakage.
- [ ] Ensure existing Stage3 opening, Paper 9 handoff, comparative closure, and source-of-truth verifiers still pass.
- [ ] Run:
  - `npm run build:stage3-scaffolding`
  - `npm run verify:stage3-scaffolding`
  - `npm run verify:stage3-opening-readiness`
  - `npm run verify:paper9-handoff-readiness`
  - `npm run verify:source-of-truth`
  - `npm run verify:comparative-program-closure`
- [ ] Run `git diff --check` and `node --check` on new JS files before commit.

## Task 7: Release Verification and Git Closure

**Files:**
- Verify only: `C:/Users/irisp/OneDrive/Escritorio/QICN-FRAMEWORK/release_repo_qicn_2026-03-01`

- [ ] Reconfirm `QICN-RELEASE` stays unchanged unless a real mismatch appears.
- [ ] Report exact repo states before and after work for both repos.
- [ ] Commit only `QICN-SYSTEM` if release remains unchanged.
- [ ] Push only the changed repo.
- [ ] Verify `git ls-remote --heads origin main` after push.

## Self-Review

- Spec coverage: this plan covers governance docs, manifests, runtime registries, schemas, internal artifacts, Paper 10 scaffold, handoff updates, implementation status, verification, git discipline, and release non-modification.
- Placeholder scan: no `TODO`/`TBD` placeholders are left in the task structure.
- Type consistency: Stage3-0 is consistently treated as scaffold-only and non-adjudicative across docs, runtime, artifacts, and manuscript surfaces.

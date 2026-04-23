# Stage3-4B And Stage3-5 Rehearsal Preparation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close live provenance honestly, instantiate empty but typed Stage 3 records, add a rehearsal-kit layer, and deepen Paper 10 without crossing into evidence, adjudication, or public claim surfaces.

**Architecture:** Extend the existing comparative namespace rather than creating a disconnected stack. Regenerate Stage3-2/3/4 artifacts through builders for provenance closure, add a new Stage3-4B instantiated-empty layer and Stage3-5 rehearsal-ready layer, then harden Paper 10 around those exact local artifacts and gates.

**Tech Stack:** Node.js, existing comparative-program runtime/build scripts, JSON manifests, JSON schema placeholders, Markdown governance docs, LaTeX manuscript compilation via `pdflatex`.

---

### Task 1: Baseline and provenance audit

**Files:**
- Modify: `docs/CANON_SOURCE_OF_TRUTH.md`
- Modify: `docs/IMPLEMENTATION_STATUS.md`
- Modify: `docs/ECOSYSTEM_FREEZE_BASELINE.md`
- Modify: `docs/execution_campaign_freeze.v1.json`
- Create: `artifacts/external_adjudication/stage3_4/provenance_closure_assessment.json`

- [ ] Verify both repo roots, local/remote main, and clean state.
- [ ] Inspect Stage3-2/3/4 artifact provenance heads against current repo heads.
- [ ] Preserve historical freeze linkage but clean live pinning semantics if stale.
- [ ] Emit an explicit provenance closure artifact that distinguishes stale-regenerated from forward-compatible self-reference.

### Task 2: Instantiated-empty record layer

**Files:**
- Create: `docs/local_frozen_preregistration_record_template.v1.json`
- Create: `docs/reviewer_candidate_pool_template.v1.json`
- Create: `docs/adjudicator_candidate_pool_template.v1.json`
- Create: `docs/blinding_assignment_stub.v1.json`
- Create: `docs/execution_session_template.v1.json`
- Create: `docs/decision_record_template.v1.json`
- Create: `docs/reproducibility_package_manifest_empty.v1.json`
- Create: `docs/collection_log_schema.v1.json`
- Create: `docs/evidence_insertion_manifest.v1.json`
- Create: `docs/INSTANTIATED_EMPTY_RECORDS_POLICY.md`
- Create: `docs/LOCAL_FROZEN_RECORD_BOUNDARY.md`
- Create: `docs/DECISION_RECORD_TEMPLATE_POLICY.md`
- Create: `src/comparative_program/InstantiatedEmptyRecordRegistry.js`
- Create: `src/comparative_program/InstantiatedEmptyRecordEvaluator.js`
- Create: `src/comparative_program/schemas/instantiated_empty_record_assessment.v1.json`
- Create: `src/comparative_program/schemas/local_frozen_record_status.v1.json`
- Create: `src/comparative_program/schemas/candidate_pool_template_status.v1.json`
- Create: `src/comparative_program/schemas/decision_record_template_status.v1.json`
- Create: `artifacts/external_adjudication/stage3_4b/*`

- [ ] Define schema-defined vs package-defined vs instantiated-empty vs frozen-local-unfiled vs externally-filed vs populated-with-real-evidence.
- [ ] Instantiate empty template-bearing records locally with no fake evidence and no fake identities.
- [ ] Emit typed status artifacts for the instantiated-empty layer.

### Task 3: Candidate pools, assignment stubs, and rehearsal kit

**Files:**
- Create: `docs/reviewer_candidate_pool_fields.v1.json`
- Create: `docs/adjudicator_candidate_pool_fields.v1.json`
- Create: `docs/reviewer_assignment_stub.v1.json`
- Create: `docs/adjudicator_assignment_stub.v1.json`
- Create: `docs/reviewer_blinding_stub.v1.json`
- Create: `docs/REVIEWER_CANDIDATE_POOL_POLICY.md`
- Create: `docs/ASSIGNMENT_STUB_POLICY.md`
- Create: `docs/execution_pilot_rehearsal_kit.v1.json`
- Create: `docs/dry_run_sequence_plan.v1.json`
- Create: `docs/rehearsal_event_log_schema.v1.json`
- Create: `docs/rehearsal_failure_modes.v1.json`
- Create: `docs/rehearsal_reset_policy.v1.json`
- Create: `docs/EXECUTION_PILOT_REHEARSAL_KIT.md`
- Create: `docs/DRY_RUN_SEQUENCE_PLAN.md`
- Create: `src/comparative_program/CandidatePoolRegistry.js`
- Create: `src/comparative_program/AssignmentStubRegistry.js`
- Create: `src/comparative_program/CandidatePoolEvaluator.js`
- Create: `src/comparative_program/ExecutionPilotRehearsalRegistry.js`
- Create: `src/comparative_program/DryRunSequenceRegistry.js`
- Create: `src/comparative_program/RehearsalKitEvaluator.js`
- Create: `src/comparative_program/schemas/reviewer_candidate_pool_status.v1.json`
- Create: `src/comparative_program/schemas/adjudicator_candidate_pool_status.v1.json`
- Create: `src/comparative_program/schemas/reviewer_assignment_stub_status.v1.json`
- Create: `src/comparative_program/schemas/adjudicator_assignment_stub_status.v1.json`
- Create: `src/comparative_program/schemas/execution_pilot_rehearsal_kit_status.v1.json`
- Create: `src/comparative_program/schemas/dry_run_sequence_readiness.v1.json`
- Create: `src/comparative_program/schemas/rehearsal_event_log_status.v1.json`
- Create: `artifacts/external_adjudication/stage3_5/*`

- [ ] Instantiate empty candidate pools and assignment stubs with null/empty semantics only.
- [ ] Define rehearsal-kit steps, event-log grammar, reset policy, invalid conditions, and dry-run failure classes.
- [ ] Emit non-evidential rehearsal readiness artifacts.

### Task 4: Paper 10 hardening, Stage3-5 gate, and verification

**Files:**
- Modify: `paper10_external_adjudication_and_human_comparators/main.tex`
- Modify: `paper10_external_adjudication_and_human_comparators/PAPER10_SECTION_STATUS.md`
- Modify: `paper10_external_adjudication_and_human_comparators/PAPER10_CLAIM_BOUNDARY.md`
- Modify: `paper10_external_adjudication_and_human_comparators/PAPER10_EVIDENCE_REQUIREMENTS.md`
- Create: `docs/stage3_5_rehearsal_ready_criteria.v1.json`
- Create: `docs/stage3_5_boundary.md`
- Create: `docs/stage3_execution_unlock_map.v1.json`
- Modify: `docs/PAPER10_FINALIZATION_UNLOCK_MAP.md`
- Create: `src/comparative_program/ProvenanceClosureEvaluator.js`
- Create: `src/comparative_program/Stage3_5ReadinessGateBuilder.js`
- Create: `src/comparative_program/Stage3RehearsalPreparationBuilder.js`
- Create: `scripts/build-stage3-instantiated-empty.cjs`
- Create: `scripts/verify-stage3-instantiated-empty.cjs`
- Create: `scripts/build-stage3-rehearsal-kit.cjs`
- Create: `scripts/verify-stage3-rehearsal-kit.cjs`
- Create: `scripts/build-stage3-5-readiness.cjs`
- Create: `scripts/verify-stage3-5-readiness.cjs`
- Modify: `package.json`
- Modify: `src/comparative_program/ComparativeProgramLayer.js`
- Modify: `src/comparative_program/Stage3Layer.js`
- Modify: `src/comparative_program/index.js`
- Modify: `docs/stage3_artifact_schema.v1.json`
- Modify: `docs/stage3_surface_policy.v1.json`
- Modify: `.gitignore`

- [ ] Deepen Paper 10 around instantiated-empty and rehearsal artifacts while keeping it non-result-bearing.
- [ ] Add a Stage3-5 gate that distinguishes instantiated-empty-ready from rehearsal-ready without implying evidence or adjudication.
- [ ] Run the full build/verify chain, then commit and push only QICN-SYSTEM if everything passes.

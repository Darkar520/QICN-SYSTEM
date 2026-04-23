# Stage3-1 and Stage3-2 Protocol Hardening Implementation Plan

> Gate: DG
> Goal: extend QICN-SYSTEM from Stage3-0 scaffold into Stage3-1 human comparator instantiation and Stage3-2 external adjudication execution-readiness without fabricating evidence, while hardening Paper 10 into a protocol-grade non-result-bearing backbone.
> Constraints: work only in QICN-SYSTEM and QICN-RELEASE; QICN-RELEASE should remain unchanged unless a bounded blocker requires otherwise; no fabricated human data, preregistration records, adjudication verdicts, external validation, human equivalence, superiority, inferiority, metaphysical closure, or public claim authorization.

## Scope freeze
- Primary repo: `C:\Users\irisp\OneDrive\Escritorio\QICN-FRAMEWORK\Sistema Canon Sandbox`
- Secondary repo for verification only: `C:\Users\irisp\OneDrive\Escritorio\QICN-FRAMEWORK\release_repo_qicn_2026-03-01`
- Preserve Stage3-0 semantics while advancing to instantiation-ready protocol engineering.
- Keep Paper 10 non-result-bearing, but materially denser and more structured.

## Planned workstreams
1. Baseline extension design
   - Inspect current Stage3-0 docs/manifests/runtime/builders/verifiers.
   - Identify where Stage3-1/3-2 should attach in `src/comparative_program` and `docs/` without creating a disconnected architecture.
2. New governance/manifests layer
   - Add human-channel instantiation contracts, preregistration templates, reviewer/adjudicator independence manifests, and statistical shells.
   - Optionally add companion markdown docs where they improve readability and traceability.
3. Runtime/readiness layer
   - Add registries/evaluators/builders for the new manifests.
   - Extend comparative runtime exports and readiness logic with richer state taxonomy.
4. Artifact emission layer
   - Add a build script for stage3 execution readiness.
   - Emit bounded Stage3-1/Stage3-2 artifacts under `artifacts/external_adjudication/`.
5. Paper 10 hardening
   - Expand the manuscript into a protocol-grade backbone with explicit section statuses, dependency/evidence tables, theorem/protocol mapping, and blocked result surfaces.
   - Compile if feasible.
6. Verification and regression scan
   - Create a Stage3 execution readiness verifier.
   - Re-run relevant existing verifiers: source-of-truth, stage3 opening readiness, comparative closure, paper9 handoff, stage3 scaffolding as needed.
   - Confirm QICN-RELEASE remains unchanged.
7. Git closeout
   - Commit and push QICN-SYSTEM if all checks pass.
   - Verify local/remote SHAs and clean worktrees for both repos.

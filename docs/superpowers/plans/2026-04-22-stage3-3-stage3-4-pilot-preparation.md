# Stage3-3 / Stage3-4 Pilot Preparation Plan

## Scope freeze

This plan covers one bounded implementation pass inside `QICN-SYSTEM` with
`QICN-RELEASE` treated as verification-only unless a live release pinning
surface is stale. The pass combines:

1. lineage and public release SHA pinning cleanup on live normative surfaces;
2. Stage3-3 preregistration freeze architecture;
3. Stage3-3 reviewer selection and adjudicator assignment architecture;
4. Stage3-3 execution-pilot packaging architecture;
5. Paper 10 third hardening pass;
6. conditional Stage3-4 dry-run opening logic; and
7. a post-pilot unlock map.

## Non-goals

- no human comparator data collection
- no external adjudication execution
- no reviewer or adjudicator identity instantiation
- no external filing claim
- no Paper 10 result-bearing sections
- no Paper 10 release migration
- no human-equivalence, superiority, identity-preservation, or metaphysical claims

## Evidence-first implementation sequence

### Phase 0

- verify both git roots and current synced SHAs
- verify Stage3-0, Stage3-1, and Stage3-2 surfaces already present
- verify `QICN-RELEASE` remains BaseCore + legacy + Papers I-IX only

### Phase 1

- update only live normative public-release pinning surfaces when stale:
  - `docs/CANON_SOURCE_OF_TRUTH.md`
  - `docs/IMPLEMENTATION_STATUS.md`
  - `docs/ECOSYSTEM_FREEZE_BASELINE.md`
  - `docs/execution_campaign_freeze.v1.json`
- leave historical artifacts intact unless regeneration is the truthful mechanism

### Phase 2

- add Stage3-3 preregistration freeze docs/manifests/runtime/schemas/artifacts
- add Stage3-3 reviewer selection and adjudicator assignment docs/manifests/runtime/schemas/artifacts
- add Stage3-3 execution pilot packaging docs/manifests/runtime/schemas/artifacts

### Phase 3

- harden Paper 10 into a denser protocol-heavy backbone with:
  - lineage semantics
  - local-vs-release corpus boundary
  - freeze/selection/pilot architecture
  - decision grammar
  - appendix template references
  - explicit unlock conditions and remaining forbidden surfaces

### Phase 4

- if Stage3-3 gates are structurally satisfied, add Stage3-4 dry-run-only opening surfaces
- ensure all Stage3-4 outputs stay non-evidential and non-adjudicative
- add post-pilot unlock map

### Phase 5

- wire new build/verify scripts
- rerun prior dependent verifiers
- compile Paper 10 if feasible
- commit and push only if all required checks pass

## Acceptance gate

Declare the pass applied only if:

- live pinning is honest;
- Stage3-3 docs/manifests/runtime/artifacts are real;
- Stage3-4 dry-run layer is real if structurally supported;
- Paper 10 is materially hardened without becoming result-bearing;
- no fabricated evidence or decisions appear;
- verifiers pass;
- `QICN-SYSTEM` is pushed cleanly;
- `QICN-RELEASE` remains unchanged unless a bounded live release-side blocker truly exists.

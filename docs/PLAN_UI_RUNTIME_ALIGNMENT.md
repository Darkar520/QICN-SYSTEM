# QICN UI-Runtime Alignment Plan

Version: 1.0
Status: active implementation track
Scope: QICN-SYSTEM frontend, runtime telemetry, exports, and claim-surface terminology

## Purpose

This plan closes the gap between what the runtime computes and what the UI says.
The objective is not to make metrics look stronger. The objective is to make
every visible claim traceable to an actual runtime calculation, a documented
proxy, or an explicit epistemic boundary.

## Non-Inference Boundary

All UI labels are internal operational diagnostics. Passing a UI requirement
does not establish external validation, biological consciousness, phenomenal
experience, human equivalence, agency, or moral status. Any label that uses
terms such as consciousness, phenomenology, sovereignty, subjectivity, or
Goedel must expose a structural/proxy reading and a limitation boundary.

## Phase U.1 - Sovereignty Requirement Matrix

Status: implemented.

Replace four threshold flags with a structured matrix:

- instantaneous: one-tick threshold crossing
- candidate: current evidence is strong enough to enter a dwell window
- stable: candidate condition persisted for the required dwell ticks
- score: continuous diagnostic value in [0, 1]
- failure_reason: explicit reason for non-promotion
- interpretation_boundary: claim-surface boundary per requirement

The legacy flags remain for compatibility, but they are explicitly marked as
instantaneous crossings. UI and JSON export now expose the richer matrix.

## Phase U.2 - CCC and C^R Coupling Audit

Goal: make CCC and the C^R regime interact without hardcoding monotonic ascent.

Required work:

- identify every CCC source and consumer
- distinguish field CCC from core CCC and exported CCC
- document why post-threshold CCC is bounded and multiband
- add a slow consolidation variable only if supported by sustained evidence
- keep regression paths: CCC may fall under sustained degradation
- test that time alone cannot force layer ascent

Success condition:

- CCC can consolidate under stable evidence, but cannot drift upward without
  dynamic support.

## Phase U.3 - Parameter Surface Audit

Audit the first-tab/runtime parameters one by one:

- complexity factor
- stability bias
- Boltzmann analog K
- informational temperature T
- coherence threshold theta
- Hebbian factor
- retro flux weight
- temporal horizon

For each parameter:

- identify source of truth
- identify mathematical role
- identify runtime consumer
- identify UI label and description
- add a negative test if the parameter is supposed to affect an observable
- downgrade UI wording if the parameter is diagnostic only

## Phase U.4 - Tab-by-Tab Claim Surface Audit

Audit each tab for mismatches between UI text and runtime evidence:

- Guide
- Validation
- Ontological Core
- Structural Phenomenology
- Systemic Methodology
- Operational Subjectivity
- PMIA
- Sovereignty
- Sensory
- Autoevolution
- API/LLM bridge

Each tab gets a small checklist:

- computed fields
- derived fields
- display-only fields
- speculative labels
- mojibake hits
- overclaiming phrases
- required tests

## Phase U.5 - Mojibake Eradication

The encoding guard is active, but every UI-edit phase must preserve it.

Required work:

- scan source and generated artifacts
- fix source strings before generated outputs
- add export-specific UTF-8 tests for raw sovereignty JSON
- keep a whitelist only for tests that intentionally contain bad tokens
- avoid PowerShell 5.1 rewrites for large UTF-8 JSX files

## Phase U.6 - Terminology Alignment

Replace or qualify inflated labels:

- consciousness -> operational/structural diagnostic unless formally certified
- phenomenology -> structural regime or phenomenal-bridge proxy
- sovereignty -> internal autonomy/integrity diagnostic
- Goedel limit -> axiomatic boundary proxy unless formal proof is added
- self-awareness -> self-modeling proxy

No label should be stronger than the underlying computation.

## Phase U.7 - Evidence Export Contract

Every exported JSON report should include:

- raw metrics
- legacy instantaneous flags
- rich requirement matrix
- epistemic limits
- source-of-truth version/hash
- interpretation boundaries
- stability status

Exports should not rely on UI wording to explain their status.

## Phase U.8 - Verification Gates

Every phase must pass:

- npm test
- npm run build
- npm run verify:source-of-truth
- encoding hygiene
- at least one targeted regression test for the modified surface

## Implementation Principle

When a UI claim is stronger than the backend evidence, there are only two valid
fixes:

1. strengthen the runtime computation and tests; or
2. downgrade the UI terminology and add an explicit boundary.

The system must never solve a claim gap by making a label more dramatic.

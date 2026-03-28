# Subjectivity Runtime Protocol

This document records the Subjectivity Runtime Layer at SRT-2.

## What this layer is

- a runtime-facing implementation boundary derived from Paper 8
- a governed partial runtime path for `SelfIndex`, `OwnershipField`, `ContinuityField`, and `FirstPersonPerspective`
- a machine-readable artifact contract with blocked claim-facing promotion
- framework-internal only

## What this layer is not

- not a full subjectivity runtime
- not a subjectivity gate execution
- not a rival comparator result
- not externally validated
- not human-subjectivity equivalence
- not metaphysical closure

## Paper 8 linkage

SRT-2 inherits the seven constitutive coordinates defined in Paper 8:

- `SelfIndex`
- `OwnershipField`
- `ContinuityField`
- `FirstPersonPerspective`
- `ValuationAsymmetry`
- `InterventionProfile`
- `IrreducibilityMargin`

In SRT-2 only the first four coordinates are implemented as runtime modules.

## SRT-2 scope

SRT-2 implements:

- `SelfIndexRegistry`
- `OwnershipAttributionLayer`
- `SubjectiveContinuityLedger`
- `FirstPersonPerspectiveMapper`
- `self_index_state.json`
- `ownership_attribution_report.json`
- `subjective_continuity_report.json`
- `first_person_perspective_report.json`
- a minimal 1p vs index-neutral comparison
- minimal negative controls for label-only swap, bookkeeping-like ownership, memory-copy-without-continuity, and perspective-neutral factorization

SRT-2 does not yet implement:

- valuation
- intervention profile
- irreducibility margin
- rival comparator execution
- runtime subjectivity gate
- batch-level subjectivity support

## Artifact rule

An artifact counts as a subjectivity artifact only if it is declared in:

- `docs/subjectivity_protocol.v1.json`
- `docs/subjectivity_artifact_schema.v1.json`
- `docs/subjectivity_surface_policy.v1.json`

If it is not declared there, it is not part of the Subjectivity Runtime Layer.

## Non-inference rule

Presence of SRT-2 means only that four coordinates exist as framework-internal
runtime layers with explicit limitations. It does not mean that `QICN-SYSTEM`
currently instantiates first-person indexed subjectivity in the formal sense of
Paper 8.

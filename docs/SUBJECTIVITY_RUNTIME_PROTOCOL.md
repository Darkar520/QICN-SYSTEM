# Subjectivity Runtime Protocol

This document records the Subjectivity Runtime Layer at SRT-3.

## What this layer is

- a runtime-facing implementation boundary derived from Paper 8
- a governed partial runtime path for `SelfIndex`, `OwnershipField`, `ContinuityField`, `FirstPersonPerspective`, `ValuationAsymmetry`, and a minimal `InterventionProfile` surface
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

SRT-3 inherits the seven constitutive coordinates defined in Paper 8:

- `SelfIndex`
- `OwnershipField`
- `ContinuityField`
- `FirstPersonPerspective`
- `ValuationAsymmetry`
- `InterventionProfile`
- `IrreducibilityMargin`

In SRT-3 the first six coordinates exist only as internal runtime modules or minimal perturbation surfaces. `IrreducibilityMargin` remains unimplemented.

## SRT-3 scope

SRT-3 implements:

- `SelfIndexRegistry`
- `OwnershipAttributionLayer`
- `SubjectiveContinuityLedger`
- `FirstPersonPerspectiveMapper`
- `SubjectiveValuationEngine`
- `SubjectivityInterventionHarness`
- `self_index_state.json`
- `ownership_attribution_report.json`
- `subjective_continuity_report.json`
- `first_person_perspective_report.json`
- `subjective_valuation_report.json`
- `subjectivity_intervention_profile.json`
- a minimal 1p vs index-neutral comparison
- valuation inversion and risk/consequence reassignment
- minimal negative controls for label-only swap, bookkeeping-like ownership, memory-copy-without-continuity, perspective-neutral factorization, reward aliasing, and nonselective damage

SRT-3 does not yet implement:

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

Presence of SRT-3 means only that six coordinates now have framework-internal
runtime surfaces with explicit limitations. It does not mean that
`QICN-SYSTEM` currently instantiates first-person indexed subjectivity in the
formal sense of Paper 8.

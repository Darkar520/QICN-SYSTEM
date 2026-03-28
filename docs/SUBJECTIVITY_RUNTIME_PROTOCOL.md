# Subjectivity Runtime Protocol

This document records the Subjectivity Runtime Layer at SRT-4.

## What this layer is

- a runtime-facing implementation boundary derived from Paper 8
- a governed partial runtime path for `SelfIndex`, `OwnershipField`, `ContinuityField`, `FirstPersonPerspective`, `ValuationAsymmetry`, a minimal `InterventionProfile` surface, and a partial `IrreducibilityMargin` comparator
- a machine-readable artifact contract with blocked claim-facing promotion
- framework-internal only

## What this layer is not

- not a full subjectivity runtime
- not a subjectivity gate execution
- not a final rival comparator result
- not externally validated
- not human-subjectivity equivalence
- not metaphysical closure

## Paper 8 linkage

SRT-4 inherits the seven constitutive coordinates defined in Paper 8:

- `SelfIndex`
- `OwnershipField`
- `ContinuityField`
- `FirstPersonPerspective`
- `ValuationAsymmetry`
- `InterventionProfile`
- `IrreducibilityMargin`

In SRT-4 the first six coordinates exist as internal runtime modules or minimal perturbation surfaces. `IrreducibilityMargin` now exists only as a partial comparator over the currently implemented surfaces.

## SRT-4 scope

SRT-4 implements:

- `SelfIndexRegistry`
- `OwnershipAttributionLayer`
- `SubjectiveContinuityLedger`
- `FirstPersonPerspectiveMapper`
- `SubjectiveValuationEngine`
- `SubjectivityInterventionHarness`
- `SubjectivityReducibilityComparator`
- `self_index_state.json`
- `ownership_attribution_report.json`
- `subjective_continuity_report.json`
- `first_person_perspective_report.json`
- `subjective_valuation_report.json`
- `subjectivity_intervention_profile.json`
- `subjectivity_reducibility_report.json`
- a minimal 1p vs index-neutral comparison
- valuation inversion and risk/consequence reassignment
- a shared-loss, shared-penalty partial reducibility comparison against pure weak rivals and pairwise admissible hybrids
- minimal negative controls for label-only swap, bookkeeping-like ownership, memory-copy-without-continuity, perspective-neutral factorization, reward aliasing, and nonselective damage
- comparator negative controls for unfair loss and incomplete comparator coverage

SRT-4 does not yet implement:

- runtime subjectivity gate
- batch-level subjectivity support
- final weak-family closure
- final irreducibility proof

## Artifact rule

An artifact counts as a subjectivity artifact only if it is declared in:

- `docs/subjectivity_protocol.v1.json`
- `docs/subjectivity_artifact_schema.v1.json`
- `docs/subjectivity_surface_policy.v1.json`

If it is not declared there, it is not part of the Subjectivity Runtime Layer.

## Non-inference rule

Presence of SRT-4 means only that six coordinates plus a partial reducibility
comparator now have framework-internal runtime surfaces with explicit
limitations. It does not mean that `QICN-SYSTEM` currently instantiates
first-person indexed subjectivity in the formal sense of Paper 8, and it does
not mean final irreducibility closure.

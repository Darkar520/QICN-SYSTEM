# Subjectivity Runtime Protocol

This document records the Subjectivity Runtime Layer at SRT-1.

## What this layer is

- a runtime-facing implementation boundary derived from Paper 8
- a governed partial runtime path for `SelfIndex` and `OwnershipField`
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

SRT-1 inherits the seven constitutive coordinates defined in Paper 8:

- `SelfIndex`
- `OwnershipField`
- `ContinuityField`
- `FirstPersonPerspective`
- `ValuationAsymmetry`
- `InterventionProfile`
- `IrreducibilityMargin`

In SRT-1 only the first two coordinates are implemented as runtime modules.

## SRT-1 scope

SRT-1 implements:

- `SelfIndexRegistry`
- `OwnershipAttributionLayer`
- `self_index_state.json`
- `ownership_attribution_report.json`
- minimal negative controls for label-only swap and bookkeeping-like ownership
- a dedicated verification path

SRT-1 does not yet implement:

- continuity
- perspective
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

Presence of SRT-1 means only that `SelfIndex` and `OwnershipField` exist as
framework-internal runtime layers with explicit limitations. It does not mean
that `QICN-SYSTEM` currently instantiates first-person indexed subjectivity in
the formal sense of Paper 8.

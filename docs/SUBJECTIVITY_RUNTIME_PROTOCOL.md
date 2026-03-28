# Subjectivity Runtime Protocol

This document opens the Subjectivity Runtime Layer in `QICN-SYSTEM` at SRT-0.

## What this layer is

- a runtime-facing scaffold derived from Paper 8
- a contract for future coordinate implementation
- a governed artifact family with explicit surface restrictions
- a future comparator and intervention layer boundary
- framework-internal only

## What this layer is not

- not a subjectivity runtime result
- not a subjectivity gate execution
- not a comparator outcome
- not externally validated
- not human-subjectivity equivalence
- not metaphysical closure

## Paper 8 linkage

SRT-0 inherits the seven constitutive coordinates defined in Paper 8:

- `SelfIndex`
- `OwnershipField`
- `ContinuityField`
- `FirstPersonPerspective`
- `ValuationAsymmetry`
- `InterventionProfile`
- `IrreducibilityMargin`

It also inherits:

- the conjunctive gate `Gamma_subj`
- the multiplicative scalar `Phi_subj`
- the weak rival family and its admissible closure
- the intervention family

## SRT-0 scope

SRT-0 fixes:

- directory structure
- machine-readable manifests
- artifact schemas
- surface policy
- threshold registry
- rival-family registry
- minimal verification hooks

SRT-0 does not yet implement:

- coordinate estimation
- intervention execution
- rival comparison
- runtime gate evaluation
- batch-level subjectivity support

## Artifact rule

An artifact counts as a subjectivity artifact only if it is declared in:

- `docs/subjectivity_protocol.v1.json`
- `docs/subjectivity_artifact_schema.v1.json`
- `docs/subjectivity_surface_policy.v1.json`

If it is not declared there, it is not part of the Subjectivity Runtime Layer.

## Non-inference rule

Presence of this layer means only that the infrastructure boundary exists. It
does not mean that QICN-SYSTEM currently instantiates first-person indexed
subjectivity in the formal sense of Paper 8.

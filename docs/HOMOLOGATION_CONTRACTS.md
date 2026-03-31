# Homologation Contracts

This document summarizes the Stage 2-M3 homologation contract manifest
`docs/homologation_contracts.v1.json`.

## Role

Stage 2-M3 formalizes how machine-side artifacts could become homologatable with
future human-side or transport-side counterpart artifacts without pretending
that those counterparts already exist.

## Status classes

The homologation layer now distinguishes:

- `homologation_not_open`
- `homologation_contract_defined`
- `homologation_contract_incomplete`
- `homologation_contract_ready_but_counterpart_absent`
- `homologation_underdetermined`
- `homologation_not_authorized_for_verdict`

## Covered units

Stage 2-M3 currently defines homologation units for:

- self-report structural comparability;
- intervention-response comparability;
- temporal-structure comparability;
- valence-topology comparability;
- ambiguity-load comparability;
- embodiment-boundary comparability;
- transport-transition comparability.

## Boundary

Homologation readiness is not equivalence, not non-equivalence, not transport
preservation, and not external adjudication.
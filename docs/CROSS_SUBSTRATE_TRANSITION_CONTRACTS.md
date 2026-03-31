# Cross-Substrate Transition Contracts

This document summarizes the Stage 2-M3 transition contract manifest
`docs/cross_substrate_transition_contracts.v1.json`.

## Role

Stage 2-M3 moves cross-substrate logic from simple blocked-state transport
reporting toward explicit transition contracts. These contracts define
preservation axes, lineage continuity, artifact continuity, error budgets, and
fork or fracture exposure without claiming that preservation has been shown.

## Transition classes

The transition layer now distinguishes:

- `transition_not_open`
- `transition_contract_defined`
- `transition_contract_incomplete`
- `transition_contract_ready_but_target_absent`
- `transition_contract_underdetermined`
- `transition_not_authorized_for_transport_verdict`

## Covered contract families

Stage 2-M3 currently defines transition contracts for:

- bridge-coordinate transitions;
- intervention-signature transitions;
- lineage-continuity transitions;
- embodiment-boundary transitions.

## Boundary

Transition readiness is not transport preservation, not identity preservation,
not cross-substrate equivalence, and not external adjudication.
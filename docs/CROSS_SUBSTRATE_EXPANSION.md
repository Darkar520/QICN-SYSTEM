# Cross-Substrate Expansion

## Role

Cross-substrate expansion remains a comparative transport program, not a solved
transport-preservation program.

- `Stage 2-M2` made transport blockage runtime-loadable.
- `Stage 2-M3` adds transition-contract operationalization, preservation-axis readiness tracking, and fork or fracture risk accounting.

Identity-preservation outputs remain forbidden.

## Runtime classes

The transport protocol still defines:

- `transport_not_open`
- `structurally_preserving_candidate`
- `partially_preserving_candidate`
- `fractured_transport`
- `forked_transport`
- `unsupported_remap`
- `comparator_underdetermined_transport`

The transition-contract layer introduced in `Stage 2-M3` now adds:

- `transition_not_open`
- `transition_contract_defined`
- `transition_contract_incomplete`
- `transition_contract_ready_but_target_absent`
- `transition_contract_underdetermined`
- `transition_not_authorized_for_transport_verdict`

## Current runtime meaning

The cross-substrate runtime can now say:

- no source-target transport contract exists in the adjudicative sense;
- transition contracts are formally defined and machine-readable;
- preservation axes can be classified for readiness rather than only for absence;
- fork and fracture risks can be enumerated contract-by-contract;
- transport remains not open, underdetermined, or target-absent rather than preserved.

The primary M3 transport-facing artifact is:

- `cross_substrate_transition_contract_assessment.json`

## What remains blocked

This layer still does not authorize:

- cross-substrate equivalence;
- identity preservation;
- fracture verdicts as metaphysical conclusions;
- fork verdicts as identity conclusions;
- external adjudication.

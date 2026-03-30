# Cross-Substrate Expansion

## Role

Cross-substrate expansion remains a comparative transport program, not a solved
transport-preservation program. In `Stage 2-M2` it becomes runtime-loadable in a
bounded way:

- transport openness can be assessed;
- missing transition contracts can be surfaced explicitly;
- preservation axes can be marked not evaluable;
- identity-preservation outputs remain forbidden.

## Runtime classes

The transport protocol still defines:

- `transport_not_open`
- `structurally_preserving_candidate`
- `partially_preserving_candidate`
- `fractured_transport`
- `forked_transport`
- `unsupported_remap`
- `comparator_underdetermined_transport`

In `Stage 2-M2`, only bounded non-closing states may be awarded without a real
source-target transport contract.

## Current runtime meaning

The cross-substrate runtime can now say:

- no source-target transport contract exists;
- no target counterpart exists;
- preservation axes are not evaluable;
- error budgets are declared but not instantiated;
- transport remains not open or underdetermined.

## What remains blocked

This layer still does not authorize:

- cross-substrate equivalence;
- identity preservation;
- fracture verdicts as metaphysical conclusions;
- fork verdicts as identity conclusions;
- external adjudication.

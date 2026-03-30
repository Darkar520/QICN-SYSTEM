# Comparator Burden Matrix

This document summarizes the runtime comparator burden matrix
`docs/comparator_burden_matrix.v1.json`.

## Burdens

The current runtime binds the following burdens:

- `human_channel_burden`
- `burden_symmetry`
- `artifact_homology_burden`
- `intervention_homology_burden`
- `typing_contract_burden`
- `error_budget_burden`
- `transport_preservation_burden`
- `underdetermination_reporting_burden`

## Runtime role

The burden matrix is executable assessment logic. It determines whether a burden
is:

- blocked by missing human channel;
- structurally open but not adjudicated;
- underdefined;
- transport not open;
- satisfied only in reporting/governance form.

## Current result

At `Stage 2-M2`, only the underdetermination-reporting burden is satisfiable in
runtime form. The remaining burdens are still blocked or underdefined because the
human-side channels and artifact families are not instantiated.

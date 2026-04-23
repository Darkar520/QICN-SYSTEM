# External Adjudication Program

## Role

`Stage3-0` opens the governance layer for external adjudication without opening
external adjudication itself.

This layer defines:

- the external adjudication object grammar;
- the admissible evidence grammar;
- the human comparator execution grammar;
- the scaffold-only Paper 10 manuscript surface;
- the non-claim and surface-policy boundary for all of the above.

It does **not** define:

- adjudication verdicts;
- reviewer outputs;
- human comparator datasets;
- human equivalence claims;
- superiority or inferiority claims;
- metaphysical closure;
- public validation.

## Stage3-0 state

Current intended state inside `QICN-SYSTEM`:

- `external_adjudication_state = external_adjudication_protocol_defined`
- `execution_state = external_adjudication_not_executed`
- `comparator_state = comparator_protocol_defined`
- `human_data_state = human_comparator_data_absent`
- `paper10_state = paper10_scaffold_open`
- `paper10_authorization_state = not_paper10_final_authorized`

## Object classes

The protocol distinguishes:

- `internal_artifact`
- `externally_reviewable_artifact`
- `admissible_external_evidence`
- `inadmissible_external_evidence`
- `human_comparator_record`
- `adjudicator_assessment`
- `adjudication_decision`
- `replication_package`
- `preregistration_record`

## Reachable Stage3-0 states

At Stage3-0 the only reachable external-adjudication states are:

- `external_adjudication_not_open`
- `external_adjudication_protocol_defined`

The only reachable human-comparator states are:

- `comparator_execution_not_open`
- `comparator_protocol_defined`

## Forbidden transitions

Stage3-0 forbids direct transition from:

- internal bridge support to external validation;
- Paper 9 to the state `external_adjudication_passed`;
- Stage 3 readiness to the state `external_adjudication_passed`;
- Paper 10 scaffold to Paper 10 final;
- comparator protocol definition to human equivalence;
- comparator protocol definition to public claim authorization.

## Required upstream anchors

Stage3-0 depends on:

- `BaseCore` and downstream Papers I-IX as formal and manuscript context;
- `SRT-6` and `BPF-M3` as internal runtime prerequisites;
- `Stage 2-M4` and `Stage3-RF` as comparative readiness prerequisites;
- `paper9_handoff_alignment.json` and `stage3_opening_gate.json` as the
  bounded opening substrate.

## Boundary

Stage3-0 is a governance and scaffold layer only. It is downstream of internal
comparative readiness and upstream of any real Stage 3 execution,
preregistration, reviewer selection, human comparator data collection, or
external adjudication outcome.

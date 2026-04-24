# Controlled Execution Opening Policy

Stage3-6 opens a bounded controlled-execution layer without authorizing evidence,
adjudication, or result-bearing claims.

## Definitions

- `controlled execution opening`: the local transition from rehearsal-ready
  architecture into live-but-unpopulated execution surfaces.
- `session-zero`: the non-evidential initialization checkpoint that binds the
  frozen local preregistration route, live artifact shells, contamination
  controls, abort policy, and operator checklist before any admissible
  collection event.
- `live-but-unpopulated artifact`: a live execution-facing manifest or log shell
  whose purpose is operational anchoring only, with explicit empty-state markers
  and zero evidential payload.
- `collection_openable_under_controls`: the state in which collection may be
  opened only if the pre-collection gate passes and the operator intentionally
  performs the later collection-start transition.
- `collection_open_pre_evidential`: the state in which controlled execution is
  locally open as a governed surface, while collection remains not started and
  evidence remains absent.

## Allowed now

- local live-manifest instantiation;
- session-zero binding;
- empty dataset-manifest creation;
- empty live log creation;
- operator checklist binding;
- contamination and abort control definition;
- pre-collection admissibility gate evaluation.

## Still blocked now

- collection-start events;
- evidence-generation events;
- reviewer decisions;
- adjudicator decisions;
- admissible dataset population;
- external adjudication execution;
- Paper 10 final authorization.

## Interpretation boundary

Controlled execution opening is a governance and state-transition layer only.
It does not imply that collection has started, that evidence exists, or that
adjudication is open.

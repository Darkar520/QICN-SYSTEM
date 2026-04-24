# Stage3-7 First Admissible Collection Boundary

## Meaning

Stage3-7 is the boundary at which the system may become openable for the first
admissible collection start event. It is not the execution of collection
itself.

## Required distinction

- `stage3_7_first_collection_openable` means the system may accept a later real
  collection-start command.
- `collection_start_not_executed` means no collection-start event has occurred.
- `evidence_generation_absent` means no admissible dataset population or
  evidential log entry exists.
- `adjudication_not_open` means reviewer and adjudicator execution remain
  absent.

## Forbidden transition

Stage3-7 must not emit:

- populated datasets;
- collection-start events;
- reviewer decisions;
- adjudicator decisions;
- external adjudication results.

# Human Comparator Execution Program

## Role

This document defines how a future Stage 3 human comparator execution program
would be organized once the project moves beyond Stage3-0.

At Stage3-0:

- the protocol is defined;
- channel families are typed;
- admissibility burdens are explicit;
- no human data has been collected;
- no human-side verdict is authorized.

## Comparator channels

- `self_report_channel`
- `intervention_response_channel`
- `temporal_structure_channel`
- `valence_topology_channel`
- `embodiment_boundary_channel`
- `ambiguity_load_channel`
- `transport_preservation_channel`

## For each channel the execution protocol requires

- a human-side artifact family;
- a collection mode;
- admissibility criteria;
- a matching machine-side artifact family;
- a homologation target;
- matched controls;
- a statistical burden;
- privacy and ethics notes;
- explicit non-implications.

## Execution states

- `comparator_execution_not_open`
- `comparator_protocol_defined`
- `comparator_preregistration_ready`
- `comparator_data_collection_ready`
- `comparator_data_collection_in_progress`
- `comparator_dataset_admissible`
- `comparator_dataset_rejected`
- `comparator_inconclusive`

## Current Stage3-0 boundary

Current intended state:

- `comparator_state = comparator_protocol_defined`
- `execution_state = comparator_execution_not_open`
- `human_data_state = human_comparator_data_absent`

This means the design exists but no dataset, no homologation result, and no
human equivalence claim may be inferred.

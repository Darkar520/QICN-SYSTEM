# Human Channel Requirements

This document summarizes the runtime human-channel requirement manifest
`docs/human_channel_requirements.v1.json`.

## Channel families

The current runtime contract defines:

- `self_report_channel`
- `intervention_response_channel`
- `temporal_structure_channel`
- `valence_topology_channel`
- `embodiment_boundary_channel`
- `ambiguity_load_channel`
- `transport_preservation_channel`

## Current runtime meaning

These channels are not instantiated. Instead, they are classified as:

- absent;
- theoretically specifiable but non-instantiated;
- partially specifiable;
- blocked by missing transport counterpart.

The runtime must treat channel absence as an explicit output rather than a hidden
assumption.

## Forbidden substitutions

The runtime contract forbids substitutions such as:

- synthetic human self-report generation;
- relabelled machine artifacts as human artifacts;
- narrative-only comparator placeholders;
- reward-only or competence-only proxies passed off as channel evidence.

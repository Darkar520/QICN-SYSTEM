# Counterpart Artifact Contracts

This document summarizes the Stage 2-M3 counterpart contract manifest
`docs/counterpart_artifact_contracts.v1.json`.

## Role

Stage 2-M3 introduces a contract family for future human-side and
cross-substrate counterpart artifacts. The goal is to specify structural typing,
lineage, and invalid-substitution rules before any real counterpart artifacts
exist.

## Contract classes

The current contract layer distinguishes:

- `counterpart_contract_defined_but_uninstantiated`
- `counterpart_contract_ready_but_counterpart_absent`
- `counterpart_contract_incomplete`
- `counterpart_contract_blocked_by_invalid_substitution`
- `counterpart_contract_theoretically_admissible`

## Covered contract families

Stage 2-M3 currently defines contracts for:

- self-report counterpart artifacts;
- intervention-response counterpart artifacts;
- temporal-structure counterpart artifacts;
- valence-topology counterpart artifacts;
- embodiment-boundary counterpart artifacts;
- ambiguity-load counterpart artifacts;
- transport counterpart artifacts.

## Boundary

These contracts do not fabricate human artifacts, do not authorize homologation
verdicts, and do not authorize external comparative outputs.
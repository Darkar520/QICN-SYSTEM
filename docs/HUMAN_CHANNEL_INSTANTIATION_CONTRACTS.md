# Human Channel Instantiation Contracts

Primary manifests:

- `docs/human_channel_instantiation_contracts.v1.json`
- `docs/human_channel_preregistration_templates.v1.json`
- `docs/matched_intervention_dataset_contracts.v1.json`
- `docs/negative_control_dataset_contracts.v1.json`

Stage3-1 converts Stage3-0 comparator grammar into per-channel execution
contracts. The new layer does not collect data and does not authorize results.

Each channel contract now specifies:

- human-side artifact family
- machine-side homologous artifact family
- collection route
- admissibility conditions
- minimum metadata
- matched controls
- negative controls
- preregistration fields
- rejection conditions
- non-implications

Interpretation boundary:

- contract definition is not collection
- collection readiness is not admissible evidence
- admissible evidence is still absent
- result claims remain blocked

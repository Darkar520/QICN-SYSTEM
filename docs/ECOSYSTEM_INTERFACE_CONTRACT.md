# Ecosystem Interface Contract

This contract fixes the explicit boundary between `QICN-SYSTEM` and
`QICN-RELEASE`.

## Repository purposes

- `QICN-SYSTEM`
  - operational runtime and governed artifact production
  - enforcement of output consumption, export, and controlled statement policy
- `QICN-RELEASE`
  - frozen theoretical corpus and canonical claim/boundary reference

## Source-of-truth split

- `QICN-SYSTEM` source-of-truth is operational and implementation-facing.
- `QICN-RELEASE` source-of-truth is canonical and theory-facing.
- Neither repo automatically closes the other.

## Allowed cross-repo bridges

- corpus protocol text -> runtime admissibility and governance implementation
- corpus governance text -> runtime support-label and policy vocabulary
- runtime operational manifests -> internal evidence that governance surfaces
  were executed, not that the corpus was validated

## Prohibited automatic inferences

- runtime metrics -> canonical theorem validity
- runtime support labels -> framework confirmation
- runtime controlled statements -> external validation
- canonical freeze -> runtime scientific validity
- formal theorem -> current runtime instantiation
- operational annex -> primary source-of-truth theorem layer
- derived lineage material -> canonical source-of-truth

## Implementation-linked but non-confirmatory claim families

- `QICN v4.5` protocol-facing claims
- ROEO export annexes
- governance alignment claims relating support labels, output policies, and
  controlled statements

## External-validation boundary

- Any move from internal support or operational consistency to theory-facing
  confirmation requires external validation beyond this ecosystem layer.
- This contract blocks that move by default.

## Machine-readable contract

See `docs/ecosystem_interface_contract.v1.json`.
